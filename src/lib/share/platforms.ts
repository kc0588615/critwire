/**
 * The places a studio puts the kit. Each one is also the kit's `ref`
 * tag, so "Where players come from" can tell them apart. Pure, so client
 * components can import it.
 */

/**
 * The `ref` values the referral counter accepts: the kit's platforms, then
 * `embed`, which tags every link out of an embed. Later missions append
 * theirs (`discord`).
 */
export const REF_SOURCES = ['steam', 'itch', 'carrd', 'linktree', 'website', 'readme', 'embed'] as const
export type RefSource = (typeof REF_SOURCES)[number]

export const isRefSource = (value: unknown): value is RefSource =>
  typeof value === 'string' && (REF_SOURCES as readonly string[]).includes(value)

/** The snippet formats, labelled as the kit's copy buttons name them. */
export const SNIPPET_FORMATS = {
  bbcode: 'Steam BBCode',
  html: 'HTML',
  markdown: 'Markdown',
} as const
export type SnippetFormat = keyof typeof SNIPPET_FORMATS

export type SharePlatform = {
  id: Exclude<RefSource, 'embed'>
  label: string
  /** The snippets this place accepts; none means links and image uploads only. */
  formats: readonly SnippetFormat[]
  guidance?: string
}

/** In the order the kit offers them; the first is the default. */
export const SHARE_PLATFORMS: readonly SharePlatform[] = [
  {
    id: 'steam',
    label: 'Steam',
    formats: ['bbcode'],
    guidance:
      'Put the hub link in your store page’s Website field, and links in your announcements. Steam doesn’t allow outside links in the store description.',
  },
  { id: 'itch', label: 'itch.io', formats: ['html', 'markdown'] },
  {
    id: 'carrd',
    label: 'Carrd',
    formats: ['html'],
    guidance:
      'On the free plan, add a Button element with a link, or an Image element with a PNG uploaded and a link. On Pro, paste the HTML into an Embed element.',
  },
  {
    id: 'linktree',
    label: 'Linktree',
    formats: [],
    guidance: 'Add each link you want. A button’s PNG can be its thumbnail.',
  },
  { id: 'website', label: 'Your website', formats: ['html'] },
  { id: 'readme', label: 'README', formats: ['markdown'] },
]

/** A source's name in "Where players come from": its platform's label, or "Embed". */
export function refSourceLabel(source: RefSource): string {
  if (source === 'embed') return 'Embed'
  const platform = SHARE_PLATFORMS.find((candidate) => candidate.id === source)
  if (!platform) throw new Error(`No share platform for ref "${source}".`)
  return platform.label
}
