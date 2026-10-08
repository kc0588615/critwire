import { isDeepStrictEqual } from 'node:util'

import type { GameProject, Issue, IssueReport, Media, PatchNote } from '../payload-types'

import { DEFAULT_THEME, mergeTheme, type MergedTheme } from '../lib/game-portal/theme'
import { SITE } from '../lib/site'

/**
 * What critwire.com holds for Critter Connect, shared by the seed
 * (`critterConnect.ts`, which the demo and the screenshots use) and the
 * one-off content command that turns the live data into the real site.
 * Pure data and pure functions: no Payload runtime import.
 */

/** The studio that runs the site. Live's demo studio (`critwire-demo`) becomes it. */
export const SITE_STUDIO = { name: 'Haunted Pavement', slug: 'haunted-pavement' } as const

type Links = NonNullable<GameProject['links']>
type Availability = NonNullable<GameProject['availability']>
type Platform = NonNullable<Availability['platforms']>[number]

/**
 * The fields of a game the seed and the content command own, in a form
 * that compares: unset links left out, unset values `null`, the theme
 * merged over the default, and media named by filename (never by ID, so
 * an upload doesn't change what a plan says).
 */
export interface GameFacts {
  name: string
  description: null | string
  links: Partial<Record<keyof Links, string>>
  availability: {
    releaseState: Availability['releaseState']
    releaseDate: null | string
    currentVersion: null | string
    platforms: { platform: Platform['platform']; storeUrl: null | string; label: null | string }[]
  }
  contact: { target: NonNullable<GameProject['contact']>['target']; email: null | string }
  theme: MergedTheme
  logo: null | string
  banner: null | string
}

/** The logo the game gets: the game's own app icon, from `public/brand/`. */
export const CRITTER_CONNECT_LOGO = { filename: 'app-icon-512.png', alt: `${SITE.name} app icon` } as const

/**
 * Critter Connect's facts, as its own sites state them (rendered
 * 2026-10-08). Nothing else is claimed: neither site states a release
 * state, release date, version or any other link (H23).
 */
export const CRITTER_CONNECT_GAME: GameFacts & { slug: string } = {
  // The title of https://www.critterconnect.org and https://play.critterconnect.org.
  name: 'Critter Connect',
  slug: SITE.gameSlug,
  // The meta description of https://www.critterconnect.org.
  description: 'Explore biodiversity through map-based expeditions.',
  // https://critterconnect.org redirects here.
  links: { website: 'https://www.critterconnect.org' },
  availability: {
    // The release field defaults to "Coming Soon"; null keeps it unset.
    releaseState: null,
    releaseDate: null,
    currentVersion: null,
    // The game runs in the browser at https://play.critterconnect.org.
    platforms: [{ platform: 'web', storeUrl: 'https://play.critterconnect.org', label: null }],
  },
  // The site's contact address, chosen by its operator.
  contact: { target: 'EMAIL', email: 'admin@critwire.com' },
  theme: mergeTheme(DEFAULT_THEME),
  logo: CRITTER_CONNECT_LOGO.filename,
  // No key art: the demo's art isn't the game's (H23).
  banner: null,
}

const filenameOf = (media: GameProject['logo']): null | string => {
  if (media == null) return null
  if (typeof media === 'number') {
    throw new Error(`Read the game with depth 1 or more: media ${media} isn't populated, so its filename is unknown.`)
  }
  return (media as Media).filename ?? null
}

/** A stored game's facts. Its logo and banner must be populated (`depth: 1` or more). */
export const gameFacts = (project: GameProject): GameFacts => ({
  name: project.name,
  description: project.description ?? null,
  links: Object.fromEntries(
    Object.entries(project.links ?? {}).filter(([, url]) => typeof url === 'string' && url !== ''),
  ),
  availability: {
    releaseState: project.availability?.releaseState ?? null,
    releaseDate: project.availability?.releaseDate ?? null,
    currentVersion: project.availability?.currentVersion ?? null,
    platforms: (project.availability?.platforms ?? []).map(({ platform, storeUrl, label }) => ({
      platform,
      storeUrl: storeUrl ?? null,
      label: label ?? null,
    })),
  },
  contact: { target: project.contact?.target ?? null, email: project.contact?.email ?? null },
  theme: mergeTheme(project.theme),
  logo: filenameOf(project.logo),
  banner: filenameOf(project.banner),
})

/** One field that differs: `path` is dotted (`links.steam`); an unset value is `null`. */
export interface GameChange {
  path: string
  before: unknown
  after: unknown
}

/** Every field of `desired` that `current` doesn't match, in a fixed order. */
export const gameChanges = (current: GameFacts, desired: GameFacts): GameChange[] => {
  const linkKeys = [...new Set([...Object.keys(current.links), ...Object.keys(desired.links)])].sort() as (keyof Links)[]
  const pairs: [string, unknown, unknown][] = [
    ['name', current.name, desired.name],
    ['description', current.description, desired.description],
    ...linkKeys.map((key): [string, unknown, unknown] => [
      `links.${key}`,
      current.links[key] ?? null,
      desired.links[key] ?? null,
    ]),
    ...(['releaseState', 'releaseDate', 'currentVersion', 'platforms'] as const).map(
      (key): [string, unknown, unknown] => [
        `availability.${key}`,
        current.availability[key],
        desired.availability[key],
      ],
    ),
    ['contact.target', current.contact.target, desired.contact.target],
    ['contact.email', current.contact.email, desired.contact.email],
    ['theme', current.theme, desired.theme],
    ['logo', current.logo, desired.logo],
    ['banner', current.banner, desired.banner],
  ]
  return pairs
    .filter(([, before, after]) => !isDeepStrictEqual(before, after))
    .map(([path, before, after]) => ({ path, before, after }))
}

/**
 * The game update that makes `changes` true, field by field, so fields
 * nobody changed keep their stored values. Media go in by ID, through
 * `mediaID`, which gets each new filename.
 */
export const gameUpdate = (
  changes: GameChange[],
  mediaID: (filename: string) => number,
): Partial<GameProject> => {
  const data: Record<string, unknown> = {}
  for (const { path, after } of changes) {
    const value = (path === 'logo' || path === 'banner') && typeof after === 'string' ? mediaID(after) : after
    const [group, field] = path.split('.')
    if (field === undefined) data[group] = value
    else data[group] = { ...(data[group] as object | undefined), [field]: value }
  }
  return data as Partial<GameProject>
}

/** Rich text of plain paragraphs, as the Lexical editor stores it. */
const lexicalFromText = (...paragraphs: string[]) => ({
  root: {
    type: 'root',
    children: paragraphs.map((text) => ({
      type: 'paragraph',
      children: [{ type: 'text', text, version: 1 }],
      direction: 'ltr' as const,
      format: '' as const,
      indent: 0,
      version: 1,
    })),
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

type SampleItem = Pick<Issue, 'category' | 'slug' | 'status' | 'summary' | 'title' | 'type'> &
  Partial<Pick<Issue, 'details'>> & { isPublic: true }

/**
 * The demo's samples: every field the seed writes on them, as the seed
 * at `3054287` (the only build live has run) wrote them. **Frozen:**
 * these values are how the content command proves a record on the live
 * site is one of the seed's samples before deleting it. Change one and
 * the command refuses the live samples.
 */
export const SAMPLE_CONTENT = {
  update: {
    title: 'Field binder launch',
    slug: 'v0-1-0-launch',
    versionLabel: 'v0.1.0',
    summary: 'The field binder ships with discovery cards, clue trails, and the report tool.',
    content: lexicalFromText(
      'Critter Connect is live. Every discovery now earns a card in your field binder - classification, habitat, geography, and conservation notes all fill in as you play. Send field reports straight from the game or this site.',
    ),
    _status: 'published',
  },
  // One item per public stage, so the demo board and the launch update's
  // "From your feedback" have something to show.
  items: [
    {
      title: 'Discovery card flickers when opened quickly',
      slug: 'card-flicker-on-open',
      summary: 'Rapidly opening a new discovery card can show a one-frame flicker on some GPUs.',
      details: lexicalFromText(
        'Reported on a handful of Windows/Nvidia setups. Investigating whether this is a shader warm-up issue on first open per session.',
      ),
      type: 'BUG',
      category: 'VISUAL',
      status: 'REPORTED',
      isPublic: true,
    },
    {
      title: 'Sort the field binder by habitat',
      slug: 'sort-binder-by-habitat',
      summary: 'Let players group discovery cards by marsh, forest, ridge and coast.',
      type: 'IDEA',
      category: 'USER_INTERFACE',
      status: 'PLANNED',
      isPublic: true,
    },
    {
      title: 'Clue trail markers drift on the minimap',
      slug: 'clue-markers-drift',
      summary: 'Markers slide a few metres off their spot while the minimap rotates.',
      type: 'BUG',
      category: 'USER_INTERFACE',
      status: 'IN_PROGRESS',
      isPublic: true,
    },
    {
      title: 'Saving during a clue trail loses progress',
      slug: 'save-loses-clue-progress',
      summary: 'Quitting mid-trail reset the trail to its first clue.',
      type: 'BUG',
      category: 'GAMEPLAY',
      status: 'FIXED',
      isPublic: true,
    },
  ] satisfies SampleItem[],
  /** The item the launch update fixed: its `fixedInPatchNote` is the sample update. */
  fixedItemSlug: 'save-loses-clue-progress',
  report: {
    title: 'Clue trail disappears after fast travel',
    description:
      'Fast-traveled from the marsh camp to the ridge outpost and the active clue trail marker was gone from the map. Had to reopen the discovery card to get it back.',
    type: 'BUG',
    category: 'GAMEPLAY',
    platform: 'Steam Deck',
    gameVersion: 'v0.1.0',
    status: 'NEW',
  },
} as const satisfies {
  update: Pick<PatchNote, '_status' | 'content' | 'slug' | 'summary' | 'title' | 'versionLabel'>
  items: SampleItem[]
  fixedItemSlug: string
  report: Pick<IssueReport, 'category' | 'description' | 'gameVersion' | 'platform' | 'status' | 'title' | 'type'>
}

/**
 * Per collection, the values of the fields the seed doesn't write, as a
 * sample keeps them until someone edits it. With `SAMPLE_CONTENT` they
 * make up a whole unedited sample.
 */
export const SAMPLE_DEFAULTS = {
  items: { isPinned: false, needsMoreInfoText: null, workaroundText: null },
  report: { issue: null, flagged: false, flagReasons: null, discord: {} },
  update: { flagged: false, flagReasons: null },
} as const

/** The first real update, left as a draft for the studio to edit and publish. */
export const FIRST_UPDATE = {
  title: 'The feedback board is open',
  slug: 'feedback-board-open',
  summary: 'Tell us about bugs and share your ideas for Critter Connect.',
  content: lexicalFromText(
    'This is the new home for Critter Connect’s feedback and updates. If something in the game doesn’t work, or you have an idea to make it better, tell us here.',
    'Other players can vote for the ideas they like most. We read everything, and we’ll post here when we fix a bug or add something new.',
  ),
  _status: 'draft',
} as const satisfies Pick<PatchNote, '_status' | 'content' | 'slug' | 'summary' | 'title'>
