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
    landingID: number
    /** `.fs-root` style of the landing right after the seed, before any theme switch. */
    baselineStyle: string
    patchNote: string
    calloutIssue: string
    plainIssue: string
  }
  bare: { slug: string }
  legacy: { slug: string }
  marketingSlug: string
}

export const WORLD_PATH = path.join(process.cwd(), 'test-results', 'shots', 'world.json')

export const GROUPS = ['default', 'riso', 'critter-connect', 'marketing'] as const
export type Group = (typeof GROUPS)[number]

export const THEME_GROUPS = ['default', 'riso', 'critter-connect'] as const satisfies readonly Group[]
export type ThemeGroup = (typeof THEME_GROUPS)[number]

export const GROUP_LABELS: Record<Group, string> = {
  default: 'Portal, default theme',
  riso: 'Portal, Riso lime (light test theme)',
  'critter-connect': 'Portal, Critter Connect theme',
  marketing: 'Critwire marketing site',
}

export interface Shot {
  id: string
  label: string
  path: (world: ShotsWorld) => string
  /** Whether the page wears Critter Connect's theme, so the capture waits for it. */
  themed: boolean
  /** Keyboard focus to show before the capture. */
  focus?: 'report-title' | 'hero-cta'
}

const cc = (world: ShotsWorld, rest = ''): string => `/g/${world.cc.slug}${rest}`

/** Shot under every theme group. */
export const THEMED_SHOTS: Shot[] = [
  { id: 'landing', label: 'Landing', path: (w) => cc(w), themed: true },
  { id: 'patch-notes', label: 'Patch notes', path: (w) => cc(w, '/updates'), themed: true },
  { id: 'patch-note', label: 'Patch note detail', path: (w) => cc(w, `/updates/${w.cc.patchNote}`), themed: true },
  { id: 'issues', label: 'Known issues', path: (w) => cc(w, '/feedback'), themed: true },
  { id: 'issues-no-match', label: 'Known issues, no match', path: (w) => cc(w, '/feedback?q=zzzz'), themed: true },
  { id: 'board', label: 'Issue board', path: (w) => cc(w, '/feedback?view=board'), themed: true },
  { id: 'issue-callout', label: 'Issue detail with a callout', path: (w) => cc(w, `/feedback/${w.cc.calloutIssue}`), themed: true },
  { id: 'issue-plain', label: 'Issue detail, plain', path: (w) => cc(w, `/feedback/${w.cc.plainIssue}`), themed: true },
  { id: 'report', label: 'Report a bug', path: (w) => cc(w, '/feedback/new'), themed: true },
  { id: 'report-error', label: 'Report a bug, error', path: (w) => cc(w, '/feedback/new?error=1'), themed: true },
  { id: 'contact', label: 'Contact', path: (w) => cc(w, '/contact'), themed: true },
  { id: 'contact-sent', label: 'Contact, sent', path: (w) => cc(w, '/contact?submitted=1'), themed: true },
  { id: 'focus-report', label: 'Focus: report title field', path: (w) => cc(w, '/feedback/new'), themed: true, focus: 'report-title' },
  { id: 'focus-hero', label: 'Focus: landing CTA by keyboard', path: (w) => cc(w), themed: true, focus: 'hero-cta' },
]

/** Shot once per width, in the group named. */
export const ONCE_SHOTS: Record<Group, Shot[]> = {
  default: [
    { id: 'portal-404', label: 'Portal 404', path: () => '/g/no-such-game', themed: false },
    { id: 'bare-landing', label: 'First run: landing (no page, no art)', path: (w) => `/g/${w.bare.slug}`, themed: false },
    { id: 'bare-patch-notes', label: 'First run: no patch notes', path: (w) => `/g/${w.bare.slug}/updates`, themed: false },
    { id: 'bare-issues', label: 'First run: no issues', path: (w) => `/g/${w.bare.slug}/feedback`, themed: false },
    { id: 'bare-contact', label: 'First run: contact not set up', path: (w) => `/g/${w.bare.slug}/contact`, themed: false },
    { id: 'legacy-landing', label: 'Legacy block landing', path: (w) => `/g/${w.legacy.slug}`, themed: false },
  ],
  riso: [],
  'critter-connect': [],
  marketing: [
    { id: 'home', label: 'Home', path: () => '/', themed: false },
    { id: 'cms-page', label: 'CMS page', path: (w) => `/${w.marketingSlug}`, themed: false },
    { id: 'marketing-404', label: 'Marketing 404', path: () => '/no-such-page', themed: false },
  ],
}

export const shotsFor = (group: Group): Shot[] =>
  (THEME_GROUPS as readonly Group[]).includes(group) ? [...THEMED_SHOTS, ...ONCE_SHOTS[group]] : ONCE_SHOTS[group]

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
