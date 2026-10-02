/**
 * Where a studio can put an embed, and how: the Embed tab's instructions
 * and `docs/embed.md`'s "what works where" table. Pure, so client
 * components can import it.
 */

/** What a place accepts: the loader's script, a plain iframe, or neither. */
export type EmbedSupport = 'iframe' | 'links' | 'script'

/** In the order the Embed tab lists them. */
export const EMBED_SUPPORT_GROUPS: readonly EmbedSupport[] = ['script', 'iframe', 'links']

export const EMBED_SUPPORT: Record<EmbedSupport, string> = {
  script: 'Paste the script',
  iframe: 'Paste the iframe or its URL',
  links: 'Use Links and buttons instead',
}

export type EmbedPlatform = {
  name: string
  support: EmbedSupport
  /** One or two sentences: where the snippet goes there. */
  how: string
}

export const EMBED_PLATFORMS: readonly EmbedPlatform[] = [
  {
    name: 'Your own site',
    support: 'script',
    how: 'Paste the script where the widget goes. The floating button can go anywhere in the page.',
  },
  {
    name: 'Carrd (Pro Standard and up)',
    support: 'script',
    how: 'Add an Embed element, set its type to Code, and paste the script.',
  },
  {
    name: 'Ghost',
    support: 'script',
    how: 'In the editor, add an HTML card and paste the script.',
  },
  {
    name: 'WordPress (self-hosted)',
    support: 'script',
    how: 'Add a Custom HTML block and paste the script.',
  },
  {
    name: 'WordPress.com (paid plans)',
    support: 'script',
    how: 'Add a Custom HTML block and paste the script.',
  },
  { name: 'Framer', support: 'script', how: 'Add an Embed, choose HTML, and paste the script.' },
  {
    name: 'Webflow (paid plans)',
    support: 'script',
    how: 'Add a Code Embed element and paste the script.',
  },
  {
    name: 'Squarespace (Core and up)',
    support: 'script',
    how: 'Add a Code block and paste the script.',
  },
  {
    name: 'Wix',
    support: 'iframe',
    how: 'Add Embed Code, then Embed a site, and paste the URL. Give it a height: it can’t resize itself, and the floating button isn’t available.',
  },
  {
    name: 'itch.io',
    support: 'links',
    how: 'Game pages take no scripts or iframes from other sites.',
  },
  { name: 'Steam', support: 'links', how: 'Store and community pages take no scripts or iframes.' },
  { name: 'Linktree', support: 'links', how: 'Linktree takes links only.' },
  {
    name: 'Carrd (free and Pro Lite)',
    support: 'links',
    how: 'These plans have no Embed element.',
  },
]
