import { portalPaths } from '@/lib/game-portal/paths'
import { absoluteURL } from '@/utilities/getURL'
import { escapeXml } from '@/utilities/escapeXml'

export type EmbedWidget = 'board' | 'button' | 'updates'
export type EmbedTheme = 'auto' | 'dark' | 'light'

/** The loader's script path; a contract (see `docs/embed.md`). */
export const LOADER_PATH = '/embed/v1.js'

/** A bare iframe can't resize, so it gets a fixed height. */
const IFRAME_HEIGHT = 600

const TITLE: Record<'board' | 'updates', string> = { board: 'Feedback', updates: 'Updates' }

export type EmbedSnippets = {
  /** The one-paste snippet: the loader's `<script>` tag. */
  script: string
  /** A plain iframe, for builders that take no scripts (Wix); `null` for the floating button. */
  iframe: null | string
  /** The page the widget frames, as the loader builds it (the board, for the button). */
  url: string
}

/**
 * What a studio pastes to embed one widget. Pure, so the Embed tab builds
 * it in the browser; the docs and the E2E host page use it too. `stage`
 * and `type` set the board's first filter and pass through unchecked, as
 * the loader passes them; the embed ignores values it doesn't know.
 */
export const embedSnippets = ({
  siteURL,
  slug,
  stage,
  theme,
  type,
  widget,
}: {
  siteURL: string
  slug: string
  stage?: string
  theme: EmbedTheme
  type?: string
  widget: EmbedWidget
}): EmbedSnippets => {
  const framed = widget === 'updates' ? 'updates' : 'board'
  // The loader's own order: theme, then stage and type when set.
  const query = new URLSearchParams({ theme })
  if (stage) query.set('stage', stage)
  if (type) query.set('type', type)
  const url = `${absoluteURL(portalPaths(encodeURIComponent(slug)).embed(framed), siteURL)}?${query}`

  const attributes = Object.entries({ game: slug, widget, theme, stage, type })
    .filter((entry): entry is [string, string] => Boolean(entry[1]))
    .map(([name, value]) => ` data-${name}="${escapeXml(value)}"`)
    .join('')

  return {
    script: `<script src="${escapeXml(absoluteURL(LOADER_PATH, siteURL))}"${attributes} async></script>`,
    iframe:
      widget === 'button'
        ? null
        : `<iframe src="${escapeXml(url)}" title="${TITLE[framed]}" loading="lazy" style="width:100%;height:${IFRAME_HEIGHT}px;border:0"></iframe>`,
    url,
  }
}
