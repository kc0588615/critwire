import path from 'node:path'

import type { EmbedHostQuery } from '../e2e/support/embedHost'
import { gameShareHref } from '../../src/lib/admin/paths'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { BUTTON_SCHEMES, buttonPath, SHARE_BUTTONS } from '../../src/lib/share/buttons'

/**
 * What the screenshot harness captures, in index order. Shared by the
 * shots spec and the index writer, so both list the same pages. Keep it
 * free of test-runner imports: the global teardown loads it.
 */

/** What `setup.shots.ts` created, read by every capture. */
export interface ShotsWorld {
  superToken: string
  cc: {
    slug: string
    projectID: number
    /** `.fs-root` style of the hub right after the seed, before any theme switch. */
    baselineStyle: string
    /** The seed's launch update, whose page shows "From your feedback". */
    launchUpdate: string
  }
  signup: {
    /** A pending signup's verification token; opening its page doesn't use it. */
    verifyToken: string
    /** The game a studio onboarded through signup, for the hub's welcome panel. */
    welcomeSlug: string
  }
  reach: {
    /** Lantern Keep's ID: the studio user's game, with a few referrals counted. */
    welcomeID: number
    /** A Riso-themed game in the demo studio, for its badge. */
    risoSlug: string
  }
}

export const WORLD_PATH = path.join(process.cwd(), 'test-results', 'shots', 'world.json')

/** The session of a verified user with no studio yet, for shots with `session: 'onboarding'`. */
export const ONBOARDING_STATE_PATH = path.join(process.cwd(), 'test-results', 'shots', 'onboarding-user.json')

/** The session of Lantern Keep's studio user, for shots with `session: 'studio'`. */
export const STUDIO_STATE_PATH = path.join(process.cwd(), 'test-results', 'shots', 'studio-user.json')

export const SESSION_STATE_PATHS = { onboarding: ONBOARDING_STATE_PATH, studio: STUDIO_STATE_PATH } as const
export type Session = keyof typeof SESSION_STATE_PATHS

export const GROUPS = ['critter-connect', 'riso', 'marketing', 'signup', 'reach', 'embed'] as const
export type Group = (typeof GROUPS)[number]

/** The groups that shoot the demo's portal pages under a theme. */
const PORTAL_GROUPS = ['critter-connect', 'riso'] as const
export type PortalGroup = (typeof PORTAL_GROUPS)[number]

export const GROUP_LABELS: Record<Group, string> = {
  'critter-connect': 'Portal, Critter Connect theme',
  riso: 'Portal, Riso lime (light test theme)',
  marketing: 'Critwire home page',
  signup: 'Sign up and onboarding',
  reach: 'Share kit, badges and buttons',
  embed: "Embeds on a studio's page",
}

interface ShotBase {
  id: string
  label: string
  /** Shot as this user (`SESSION_STATE_PATHS`) instead of anonymously. */
  session?: Session
  /** The admin's colour scheme, set with Payload's `payload-theme` cookie. */
  adminTheme?: 'dark' | 'light'
  /** A selector the page must show before the capture, for content that renders after hydration. */
  ready?: string
  /**
   * Where the tap-target probe looks, when only part of the page is ours:
   * on admin pages, Payload's own chrome is below 44 px and not ours to resize.
   */
  tapScope?: string
  /** The accessible name of a button to click before the capture, such as the floating "Feedback". */
  click?: string
}

/**
 * A page the app serves, a page built with `page.setContent` whose URLs
 * are relative to `origin`, or a studio's page on the embed host
 * (`startEmbedHost`, cross-site from the app) carrying an embed snippet.
 */
export type Shot = ShotBase &
  (
    | { path: (world: ShotsWorld) => string; html?: never; host?: never }
    | { html: (world: ShotsWorld, origin: string) => string; path?: never; host?: never }
    | { host: (world: ShotsWorld) => EmbedHostQuery; path?: never; html?: never }
  )

const cc = (world: ShotsWorld, rest = ''): string => `/g/${world.cc.slug}${rest}`

/** The portal pages, shot under each theme group; they wait for the group's theme. */
const PORTAL_SHOTS: Shot[] = [
  { id: 'hub', label: 'Hub', path: (w) => cc(w) },
  { id: 'feedback', label: 'Feedback list', path: (w) => cc(w, '/feedback') },
  { id: 'board', label: 'Feedback board', path: (w) => cc(w, '/feedback?view=board') },
  { id: 'submit-bug', label: 'Submit form: a bug', path: (w) => cc(w, '/feedback/new?type=bug') },
  { id: 'submit-idea', label: 'Submit form: an idea', path: (w) => cc(w, '/feedback/new?type=idea') },
  { id: 'update', label: 'Launch update', path: (w) => cc(w, `/updates/${w.cc.launchUpdate}`) },
]

const MARKETING_SHOTS: Shot[] = [{ id: 'home', label: 'Home', path: () => '/' }]

const SIGNUP_SHOTS: Shot[] = [
  { id: 'signup', label: 'Sign up', path: () => '/signup' },
  { id: 'signup-submitted', label: 'Sign up: check your inbox', path: () => '/signup?submitted=1' },
  { id: 'verify', label: 'Verify: choose a password', path: (w) => `/verify/${encodeURIComponent(w.signup.verifyToken)}` },
  { id: 'onboarding', label: 'Onboarding: your first game', path: () => '/onboarding', session: 'onboarding' },
  {
    id: 'welcome',
    label: 'New portal with its next steps',
    path: (w) => `/g/${w.signup.welcomeSlug}?welcome=1`,
    ready: '.fs-welcome',
  },
]

const HOST_PAGES = {
  white: { background: '#ffffff', foreground: '#1b1b1f' },
  'near-black': { background: '#111114', foreground: '#ececf1' },
} as const

/**
 * A studio's own page as a host for the kit's images: the three buttons in
 * both schemes, then the Critter Connect and Riso badges in both formats.
 */
const hostPage = (backdrop: keyof typeof HOST_PAGES) => (world: ShotsWorld, origin: string): string => {
  const { background, foreground } = HOST_PAGES[backdrop]
  const url = (path: string) => `${origin}${path}`
  const buttons = BUTTON_SCHEMES.map(
    (scheme) =>
      `<h2>${scheme === 'light' ? 'Light' : 'Dark'} buttons</h2><p class="row">${SHARE_BUTTONS.map(
        (button) => `<img src="${url(buttonPath(button.id, scheme, 'svg'))}" alt="${button.label}">`,
      ).join('')}</p>`,
  ).join('')
  const badges = [world.cc.slug, world.reach.risoSlug]
    .map((slug) => {
      const paths = portalPaths(slug)
      return `<p class="row"><img src="${url(paths.badge('svg'))}" alt="${slug} badge, SVG"><img src="${url(paths.badge('png'))}" alt="${slug} badge, PNG"></p>`
    })
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>A studio page on ${backdrop}</title>
<style>
  body { margin: 0; padding: 2rem 1.25rem; font: 16px/1.5 system-ui, sans-serif; background: ${background}; color: ${foreground}; }
  h1 { margin: 0 0 1rem; font-size: 1.5rem; }
  h2 { margin: 1.5rem 0 0.5rem; font-size: 1rem; }
  .row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; margin: 0; }
  img { max-width: 100%; }
</style></head>
<body><h1>A studio page on ${backdrop}</h1>${buttons}<h2>Live badges: Critter Connect, then Riso</h2>${badges}</body></html>`
}

const REACH_SHOTS: Shot[] = [
  {
    id: 'welcome-kit',
    label: 'New portal: the kit in the welcome panel',
    path: (w) => `/g/${w.signup.welcomeSlug}?welcome=1`,
    ready: '.share-kit',
  },
  ...(['light', 'dark'] as const).map(
    (adminTheme): Shot => ({
      id: `dashboard-${adminTheme}`,
      label: `Admin dashboard, ${adminTheme}`,
      path: () => '/admin',
      session: 'studio',
      adminTheme,
      ready: '.before-dashboard',
      tapScope: '.before-dashboard',
    }),
  ),
  ...(['light', 'dark'] as const).map(
    (adminTheme): Shot => ({
      id: `share-${adminTheme}`,
      label: `Share tab with referral counts, ${adminTheme}`,
      path: (w) => gameShareHref(w.reach.welcomeID),
      session: 'studio',
      adminTheme,
      ready: '.referral-counts-table',
      tapScope: '.share-view',
    }),
  ),
  { id: 'host-white', label: 'Buttons and badges on a white page', html: hostPage('white') },
  { id: 'host-near-black', label: 'Buttons and badges on a near-black page', html: hostPage('near-black') },
]

/**
 * Each widget in its own mode on a host page of the same colours. The
 * closed button shows the widget itself; the open one, the board it opens.
 */
const EMBED_SHOTS: Shot[] = (['light', 'dark'] as const).flatMap((mode): Shot[] => {
  const on = (widget: EmbedHostQuery['widget']) => (world: ShotsWorld): EmbedHostQuery => ({
    game: world.cc.slug,
    widget,
    theme: mode,
    bg: mode,
  })
  return [
    { id: `board-${mode}`, label: `Board, ${mode}`, host: on('board') },
    { id: `updates-${mode}`, label: `Updates, ${mode}`, host: on('updates') },
    { id: `button-${mode}`, label: `Floating button, ${mode}`, host: on('button'), ready: 'main > button' },
    { id: `dialog-${mode}`, label: `Floating button's dialog open, ${mode}`, host: on('button'), click: 'Feedback' },
  ]
})

export const isPortalGroup = (group: Group): group is PortalGroup =>
  (PORTAL_GROUPS as readonly string[]).includes(group)

const OTHER_SHOTS: Record<Exclude<Group, PortalGroup>, Shot[]> = {
  marketing: MARKETING_SHOTS,
  signup: SIGNUP_SHOTS,
  reach: REACH_SHOTS,
  embed: EMBED_SHOTS,
}

export const shotsFor = (group: Group): Shot[] => (isPortalGroup(group) ? PORTAL_SHOTS : OTHER_SHOTS[group])

export const WIDTHS = [1440, 390] as const

export const shotFile = (group: Group, id: string, width: number): string => `${group}--${id}--${width}.png`

/** Groups picked by `SHOTS_THEMES` (comma-separated), all of them by default. */
export const selectedGroups = (): Group[] => {
  const raw = process.env.SHOTS_THEMES?.trim()
  if (!raw) return [...GROUPS]
  const picked = raw.split(',').map((group) => group.trim())
  const unknown = picked.filter((group) => !(GROUPS as readonly string[]).includes(group))
  if (unknown.length) throw new Error(`SHOTS_THEMES: unknown group(s) ${unknown.join(', ')}; use ${GROUPS.join(', ')}.`)
  return GROUPS.filter((group) => picked.includes(group))
}

export const SETS = ['before', 'after'] as const
export type ShotSet = (typeof SETS)[number]

/** `SHOTS_SET` and `SHOTS_DIR`, or an error naming what's wrong. */
export const shotsTarget = (): { set: ShotSet; dir: string } => {
  const set = process.env.SHOTS_SET
  const dir = process.env.SHOTS_DIR
  if (!set || !(SETS as readonly string[]).includes(set)) {
    throw new Error(`SHOTS_SET must be ${SETS.join(' or ')} (got "${set ?? ''}").`)
  }
  if (!dir || !path.isAbsolute(dir)) {
    throw new Error(`SHOTS_DIR must be an absolute path (got "${dir ?? ''}").`)
  }
  return { set: set as ShotSet, dir }
}
