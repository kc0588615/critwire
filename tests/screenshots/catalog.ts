import path from 'node:path'

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
}

export const WORLD_PATH = path.join(process.cwd(), 'test-results', 'shots', 'world.json')

/** The session of a verified user with no studio yet, for shots with `signedIn`. */
export const ONBOARDING_STATE_PATH = path.join(process.cwd(), 'test-results', 'shots', 'onboarding-user.json')

export const GROUPS = ['critter-connect', 'riso', 'marketing', 'signup'] as const
export type Group = (typeof GROUPS)[number]

/** The groups that shoot the demo's portal pages under a theme. */
const PORTAL_GROUPS = ['critter-connect', 'riso'] as const
export type PortalGroup = (typeof PORTAL_GROUPS)[number]

export const GROUP_LABELS: Record<Group, string> = {
  'critter-connect': 'Portal, Critter Connect theme',
  riso: 'Portal, Riso lime (light test theme)',
  marketing: 'Critwire home page',
  signup: 'Sign up and onboarding',
}

export interface Shot {
  id: string
  label: string
  path: (world: ShotsWorld) => string
  /** Shot as the verified user with no studio (`ONBOARDING_STATE_PATH`) instead of anonymously. */
  signedIn?: true
  /** A selector the page must show before the capture, for content that renders after hydration. */
  ready?: string
}

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
  { id: 'onboarding', label: 'Onboarding: your first game', path: () => '/onboarding', signedIn: true },
  {
    id: 'welcome',
    label: 'New portal with its next steps',
    path: (w) => `/g/${w.signup.welcomeSlug}?welcome=1`,
    ready: '.fs-welcome',
  },
]

export const isPortalGroup = (group: Group): group is PortalGroup =>
  (PORTAL_GROUPS as readonly string[]).includes(group)

const OTHER_SHOTS: Record<Exclude<Group, PortalGroup>, Shot[]> = {
  marketing: MARKETING_SHOTS,
  signup: SIGNUP_SHOTS,
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
