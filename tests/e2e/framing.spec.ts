import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { ConsoleMessage } from '@playwright/test'

import type { GameProject, PatchNote } from '../../src/payload-types'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { BASE_URL, storageStatePath } from './support/env'
import { createPatchNote, createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * The app owns its framing policy (F1): every response says
 * `frame-ancestors 'self'`, with no nginx in front, as in E2E. A page on
 * another origin can't frame the portal; the app's own pages can.
 */

const POLICY = "frame-ancestors 'self'"

let project: GameProject
let note: PatchNote

test.beforeAll(async ({ api, uniqueSlug, world }) => {
  const aOwner = api('aOwner')
  project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('frame-game'))
  note = await createPatchNote(aOwner, project, uniqueSlug('frame-update'))
})

test('S19.1 portal and admin pages send frame-ancestors self', async ({ browser, playwright }) => {
  const paths = portalPaths(project.slug)
  const player = await newRequestContext(playwright)
  try {
    for (const path of [paths.hub, paths.board, paths.update(note.slug), '/admin/login']) {
      const response = await player.get(path, { maxRedirects: 0 })
      expect(response.status(), path).toBe(200)
      expect(response.headers()['content-security-policy'], path).toBe(POLICY)
    }
  } finally {
    await player.dispose()
  }

  const context = await browser.newContext({ storageState: storageStatePath('aOwner') })
  try {
    const page = await context.newPage()
    const response = await page.goto('/admin')
    expect(new URL(page.url()).pathname).toBe('/admin')
    expect(response?.headers()['content-security-policy']).toBe(POLICY)
  } finally {
    await context.close()
  }
})

test('S19.2 a page on another origin can’t frame the portal', async ({ page }) => {
  const hub = `${BASE_URL}${portalPaths(project.slug).hub}`
  // Another site, on 127.0.0.1 rather than `localhost`, so a different
  // origin. It must be a real loopback server: Chromium blocks a page it
  // takes for public (one `page.route` fulfils) from framing localhost
  // before the app's policy is ever checked.
  const host = createServer((_, res) => {
    res.writeHead(200, { 'content-type': 'text/html' })
    res.end(`<!doctype html><title>Host</title><h1>Host page</h1><iframe src="${hub}" width="800" height="600"></iframe>`)
  })
  await new Promise<void>((resolve) => host.listen(0, '127.0.0.1', resolve))
  try {
    const violations: string[] = []
    page.on('console', (message: ConsoleMessage) => {
      if (message.text().includes('frame-ancestors')) violations.push(message.text())
    })
    const hubLoaded = page.waitForResponse((response) => response.url() === hub)

    await page.goto(`http://127.0.0.1:${(host.address() as AddressInfo).port}/`)
    await expect(page.getByRole('heading', { name: 'Host page' })).toBeVisible()
    // The app answered; Chromium refused to show it.
    expect((await hubLoaded).headers()['content-security-policy']).toBe(POLICY)
    await expect.poll(() => violations).toContainEqual(expect.stringContaining(POLICY))
    await expect(page.frameLocator('iframe').getByRole('heading', { name: project.name })).toHaveCount(0)
  } finally {
    await new Promise((resolve) => host.close(resolve))
  }
})

test('S19.3 the app’s own pages can frame the portal', async ({ page }) => {
  const paths = portalPaths(project.slug)
  await page.goto(paths.updates)
  await page.evaluate((src) => {
    const frame = document.createElement('iframe')
    frame.src = src
    frame.width = '800'
    frame.height = '600'
    document.body.append(frame)
  }, paths.hub)

  await expect(page.frameLocator('iframe').getByRole('heading', { level: 1 })).toHaveText(project.name)
})
