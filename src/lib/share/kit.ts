import { portalPaths, type PortalPaths } from '@/lib/game-portal/paths'
import { absoluteURL } from '@/utilities/getURL'
import { escapeXml } from '@/utilities/escapeXml'

import { buttonPath, SHARE_BUTTONS, type ButtonScheme } from './buttons'
import type { SharePlatform, SnippetFormat } from './platforms'

/**
 * The "Links and buttons" kit for one game and one place: what the
 * studio copies. Pure, so the panel builds it in the browser. Every value
 * is our own URL or a fixed label, never studio text, and each snippet is
 * still escaped for its format.
 */

/** The public pages the kit links, in the order it lists them. */
const SHARE_LINKS = [
  { key: 'hub', label: 'Hub' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'roadmap', label: 'Roadmap' },
  { key: 'updates', label: 'Updates' },
  // Feed readers subscribe to it, so a tag would only count the subscription.
  { key: 'rss', label: 'RSS feed', untagged: true },
] as const satisfies readonly { key: keyof PortalPaths; label: string; untagged?: true }[]

export type ShareLink = { key: string; label: string; url: string }
export type Snippet = { format: SnippetFormat; code: string }
export type ShareItem = {
  id: string
  /** What the kit calls it. */
  label: string
  /** The image's alternative text, and a BBCode link's text. */
  alt: string
  href: string
  svg: string
  png: string
  snippets: Snippet[]
}
export type ShareKit = { links: ShareLink[]; buttons: ShareItem[]; badge: ShareItem }

/** `URL.searchParams` keeps a query the path already has (the board's `view`). */
export const withRef = (url: string, ref: string): string => {
  const tagged = new URL(url)
  tagged.searchParams.set('ref', ref)
  return tagged.toString()
}

// Markdown: brackets end the alt text, parentheses and spaces end the URL.
const markdownText = (value: string) => value.replace(/[\\[\]]/g, '\\$&')
const markdownURL = (value: string) =>
  value.replaceAll('(', '%28').replaceAll(')', '%29').replaceAll(' ', '%20')
// BBCode has no escapes: `]` would end a tag, so it's encoded in URLs and dropped from text.
const bbcodeURL = (value: string) => value.replaceAll('[', '%5B').replaceAll(']', '%5D')
const bbcodeText = (value: string) => value.replace(/[[\]]/g, '')

const SNIPPET: Record<SnippetFormat, (item: Omit<ShareItem, 'snippets'>) => string> = {
  // SVG in snippets: crisp at its natural size. The PNG is listed for uploads.
  html: ({ alt, href, svg }) => `<a href="${escapeXml(href)}"><img src="${escapeXml(svg)}" alt="${escapeXml(alt)}"></a>`,
  markdown: ({ alt, href, svg }) => `[![${markdownText(alt)}](${markdownURL(svg)})](${markdownURL(href)})`,
  // Steam announcements: a text link.
  bbcode: ({ alt, href }) => `[url=${bbcodeURL(href)}]${bbcodeText(alt)}[/url]`,
}

export const shareKit = ({
  platform,
  scheme,
  siteURL,
  slug,
}: {
  platform: SharePlatform
  scheme: ButtonScheme
  siteURL: string
  slug: string
}): ShareKit => {
  const paths = portalPaths(slug)
  const url = (path: string) => absoluteURL(path, siteURL)
  const tagged = (path: string) => withRef(url(path), platform.id)

  const links = SHARE_LINKS.map((link) => ({
    key: link.key,
    label: link.label,
    url: 'untagged' in link ? url(paths[link.key]) : tagged(paths[link.key]),
  }))

  const item = (image: Omit<ShareItem, 'snippets'>): ShareItem => ({
    ...image,
    snippets: platform.formats.map((format) => ({ format, code: SNIPPET[format](image) })),
  })

  return {
    links,
    buttons: SHARE_BUTTONS.map((button) =>
      item({
        id: button.id,
        label: button.label,
        alt: button.label,
        href: tagged(paths[button.link]),
        svg: url(buttonPath(button.id, scheme, 'svg')),
        png: url(buttonPath(button.id, scheme, 'png')),
      }),
    ),
    // Themed by the game, so it has no scheme.
    badge: item({
      id: 'badge',
      label: 'Live badge',
      alt: 'Feedback and roadmap',
      href: tagged(paths.roadmap),
      svg: url(paths.badge('svg')),
      png: url(paths.badge('png')),
    }),
  }
}
