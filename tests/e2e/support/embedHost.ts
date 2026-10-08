import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { Page } from '@playwright/test'

import { type EmbedTheme, type EmbedWidget, embedSnippets } from '../../../src/lib/embed/snippets'

/** What the host page embeds, and how. */
export interface EmbedHostQuery {
  game: string
  widget?: EmbedWidget
  theme?: EmbedTheme
  stage?: string
  type?: string
  /**
   * The loader's `<script>` (the default), the bare iframe, the script
   * without `data-game`, as a broken paste would be, or the script added
   * after the page has loaded, as `next/script` with `afterInteractive` adds it.
   */
  kind?: 'iframe' | 'injected' | 'no-game' | 'script'
  /** The host page's own colours. */
  bg?: 'dark' | 'light'
}

/** A studio's page on another site, carrying an embed snippet. */
export interface EmbedHost {
  origin: string
  url: (query: EmbedHostQuery) => string
  close: () => Promise<void>
}

const BACKGROUND = { dark: ['#16171d', '#ececf1'], light: ['#ffffff', '#16171d'] } as const

/**
 * The snippet held inert in a `<template>`, then copied attribute by
 * attribute onto a created `<script>` once the page has loaded, as
 * `next/script` does: the loader then runs with no parser-inserted tag.
 */
const injected = (script: string) => `<template id="snippet">${script}</template>
<script>
addEventListener('load', () => {
  const pasted = document.getElementById('snippet').content.querySelector('script')
  const script = document.createElement('script')
  for (const { name, value } of pasted.attributes) script.setAttribute(name, value)
  document.body.appendChild(script)
})
</script>`

/**
 * A loopback server on 127.0.0.1 with a random port, so it's cross-site
 * from `localhost`: the `SameSite=Lax` vote cookie never reaches an embed
 * it frames, as on a real studio's site. It must be a real server:
 * Chromium blocks a page it takes for public (one `page.route` fulfils)
 * from framing localhost. The page is set in Georgia, and its snippet
 * comes from `embedSnippets()`, the builder the Embed tab uses.
 */
export async function startEmbedHost(siteURL: string): Promise<EmbedHost> {
  const server = createServer((req, res) => {
    const params = new URL(req.url ?? '/', 'http://host').searchParams
    const game = params.get('game')
    if (!game) {
      res.writeHead(400, { 'content-type': 'text/plain' })
      res.end('game is required')
      return
    }
    const widget = (params.get('widget') ?? 'board') as EmbedWidget
    const snippets = embedSnippets({
      siteURL,
      slug: game,
      widget,
      theme: (params.get('theme') ?? 'auto') as EmbedTheme,
      stage: params.get('stage') ?? undefined,
      type: params.get('type') ?? undefined,
    })
    const kind = params.get('kind')
    const snippet =
      kind === 'iframe'
        ? snippets.iframe
        : kind === 'no-game'
          ? snippets.script.replace(/ data-game="[^"]*"/, '')
          : kind === 'injected'
            ? injected(snippets.script)
            : snippets.script
    const [background, foreground] = BACKGROUND[params.get('bg') === 'dark' ? 'dark' : 'light']
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    res.end(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Studio site</title></head>
<body style="margin:0;padding:24px;font-family:Georgia, serif;background:${background};color:${foreground}">
<h1>Studio site</h1>
<main style="max-width:720px">${snippet ?? ''}</main>
</body>
</html>`)
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  return {
    origin,
    url: (query) => {
      const search = new URLSearchParams(
        Object.entries(query).filter((entry): entry is [string, string] => entry[1] != null),
      )
      return `${origin}/?${search}`
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  }
}

/** The frame's height on the host page, and the height of the content inside it. */
export const frameHeights = async (page: Page) => ({
  frame: await page.locator('iframe').evaluate((element) => element.getBoundingClientRect().height),
  content: await page
    .frameLocator('iframe')
    .locator('.cw-embed-frame')
    .evaluate((element) => element.getBoundingClientRect().height),
})
