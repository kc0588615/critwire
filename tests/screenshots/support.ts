import { readFile } from 'node:fs/promises'

import { expect, type Page } from '@playwright/test'

import { type ShotsWorld, WORLD_PATH } from './catalog'

/** Bearer for `/api/seed/critter-connect`, baked only into the harness's own server. */
export const SHOTS_CRON_SECRET = 'screenshots-cron-secret'

export const readWorld = async (): Promise<ShotsWorld> => JSON.parse(await readFile(WORLD_PATH, 'utf8')) as ShotsWorld

/** The theme's inline custom properties on the page's `.fs-root`, or null when the page has none. */
export const rootStyle = async (page: Page): Promise<null | string> => {
  const root = page.locator('.fs-root').first()
  return (await root.count()) ? root.getAttribute('style') : null
}

export const rootToken = (page: Page, token: string): Promise<string> =>
  page.locator('.fs-root').first().evaluate((el, name) => getComputedStyle(el).getPropertyValue(name).trim(), token)

/**
 * Reloads `path` every second, for up to 60 s, until `read` returns
 * `expected`. Portal pages are ISR-cached and revalidated on write, so
 * the first request after a theme change may still be stale.
 */
export async function reloadUntil<T>(
  page: Page,
  path: string,
  read: (page: Page) => Promise<T>,
  expected: T,
  message: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        await page.goto(path)
        return read(page)
      },
      { message, timeout: 60_000, intervals: [1_000] },
    )
    .toBe(expected)
}
