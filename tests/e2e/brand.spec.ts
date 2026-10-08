import type { APIRequestContext, Page } from '@playwright/test'
import sharp from 'sharp'

import { expect, newRequestContext, test } from './support/fixtures'

/**
 * Critwire's brand files: the default share image (`/og.png`), which every
 * page without its own image falls back to, and the favicons, drawn from
 * cw by `pnpm generate:brand`.
 */

let visitor: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  visitor = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await visitor.dispose()
})

const metaContent = (page: Page, property: string) =>
  page.locator(`head meta[property="${property}"]`).first().getAttribute('content')

test('B1 pages without their own image share /og.png, a 1200×630 PNG', async ({ page }) => {
  for (const path of ['/legal/privacy', '/legal/terms']) {
    await page.goto(path)
    expect(await metaContent(page, 'og:image'), path).toMatch(/\/og\.png$/)
    expect(await metaContent(page, 'og:image:width'), path).toBe('1200')
    expect(await metaContent(page, 'og:image:height'), path).toBe('630')
  }

  const response = await visitor.get('/og.png')
  expect(response.status()).toBe(200)
  expect(response.headers()['content-type']).toBe('image/png')
  const { format, height, width } = await sharp(await response.body()).metadata()
  expect({ format, height, width }).toEqual({ format: 'png', height: 630, width: 1200 })
})

test('B2 the favicons are a glyph-path SVG and a 16/32/48 px ICO', async () => {
  const svg = await visitor.get('/favicon.svg')
  expect(svg.status()).toBe(200)
  expect(svg.headers()['content-type']).toMatch(/^image\/svg\+xml/)
  expect(await svg.text()).not.toContain('<text')

  const ico = await visitor.get('/favicon.ico')
  expect(ico.status()).toBe(200)
  const bytes = await ico.body()
  expect([...bytes.subarray(0, 4)]).toEqual([0, 0, 1, 0])
  const count = bytes.readUInt16LE(4)
  // Each 16-byte directory entry starts with the width and height (0 means 256).
  const sizes = Array.from({ length: count }, (_, index) => {
    const entry = 6 + index * 16
    return [bytes[entry], bytes[entry + 1]]
  })
  expect(sizes).toEqual([
    [16, 16],
    [32, 32],
    [48, 48],
  ])
})
