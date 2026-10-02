import sharp from 'sharp'

import type { GameProject } from '../../src/payload-types'
import { gameEditHref, gameShareHref } from '../../src/lib/admin/paths'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { BASE_URL, storageStatePath } from './support/env'
import { createProject, expect, newRequestContext, test } from './support/fixtures'
import { svgHeight, svgTitle } from './support/svg'

/**
 * The "Put critwire on your site" kit: the hosted button images studios
 * link from Steam, itch.io, Carrd, Linktree and READMEs.
 */

const BUTTONS = [
  { id: 'give-feedback', label: 'Give feedback' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'whats-new', label: "What's new" },
] as const

const ONE_DAY = 'public, max-age=86400, s-maxage=86400'

test.describe('S20.1 the hosted button images', () => {
  test('every button answers in both schemes and formats, and nothing else does', async ({ playwright }) => {
    const player = await newRequestContext(playwright)

    for (const { id, label } of BUTTONS) {
      for (const scheme of ['light', 'dark']) {
        await test.step(`${id}-${scheme}`, async () => {
          const svgFile = `/buttons/${id}-${scheme}.svg`
          const svgResponse = await player.get(svgFile)
          expect(svgResponse.status(), svgFile).toBe(200)
          expect(svgResponse.headers()['content-type'], svgFile).toMatch(/^image\/svg\+xml\b/)
          expect(svgResponse.headers()['cache-control'], svgFile).toBe(ONE_DAY)
          const svg = await svgResponse.text()
          // Text drawn as glyph paths, never `<text>`: the production
          // runner has no fonts, so `<text>` would render blank.
          expect(svgTitle(svg), svgFile).toBe(label)
          expect(svg, svgFile).toContain('<path')
          expect(svg, svgFile).not.toContain('<text')
          expect(svg, svgFile).not.toMatch(/<script|href=/i)

          const pngFile = `/buttons/${id}-${scheme}.png`
          const pngResponse = await player.get(pngFile)
          expect(pngResponse.status(), pngFile).toBe(200)
          expect(pngResponse.headers()['content-type'], pngFile).toBe('image/png')
          expect(pngResponse.headers()['cache-control'], pngFile).toBe(ONE_DAY)
          const png = await sharp(await pngResponse.body()).metadata()
          expect(png.format, pngFile).toBe('png')
          expect(png.height, `${pngFile} is 2×`).toBe(svgHeight(svg) * 2)
        })
      }
    }

    await test.step('unknown buttons, schemes and formats answer 404', async () => {
      for (const file of ['nope-light.svg', 'give-feedback-blue.svg', 'give-feedback-light.gif']) {
        const response = await player.get(`/buttons/${file}`)
        expect(response.status(), file).toBe(404)
      }
    })

    await player.dispose()
  })
})

test.describe('the admin Share tab', () => {
  let project: GameProject

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('share-game'))
  })

  test('S20.2 a studio copies its links, buttons and badge for the place it puts them', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath('aOwner') })
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    const page = await context.newPage()
    const paths = portalPaths(project.slug)
    const url = (path: string) => `${BASE_URL}${path}`

    const panel = page.getByRole('region', { name: 'Put critwire on your site' })
    const copied = async (name: string) => {
      await panel.getByRole('button', { name, exact: true }).click()
      return page.evaluate(() => navigator.clipboard.readText())
    }

    try {
      await test.step('the game’s Share tab opens the panel', async () => {
        await page.goto(gameEditHref(project.id))
        await page.getByRole('link', { name: 'Share', exact: true }).click()
        await expect(page).toHaveURL(gameShareHref(project.id))
        await expect(panel).toBeVisible()
      })

      await test.step('Steam is the default, with its guidance', async () => {
        await expect(panel.getByRole('radio', { name: 'Steam', exact: true })).toBeChecked()
        await expect(panel.getByText(/Website field/)).toBeVisible()
      })

      await test.step('the links carry ?ref=steam, except RSS', async () => {
        expect(await copied('Copy Hub URL')).toBe(`${url(paths.hub)}?ref=steam`)
        expect(await copied('Copy Feedback URL')).toBe(`${url(paths.feedback)}?ref=steam`)
        expect(await copied('Copy Roadmap URL')).toBe(`${url(paths.roadmap)}?ref=steam`)
        expect(await copied('Copy Updates URL')).toBe(`${url(paths.updates)}?ref=steam`)
        expect(await copied('Copy RSS feed URL')).toBe(url(paths.rss))
        await expect(panel.getByText('Copied').first()).toBeVisible()
      })

      await test.step('Steam takes BBCode links, nothing else', async () => {
        expect(await copied('Copy Steam BBCode for Give feedback')).toBe(
          `[url=${url(paths.feedback)}?ref=steam]Give feedback[/url]`,
        )
        await expect(panel.getByRole('button', { name: /^Copy (HTML|Markdown) for / })).toHaveCount(0)
      })

      await test.step('a README in dark gets Markdown with the dark buttons', async () => {
        await panel.getByRole('radio', { name: 'README', exact: true }).check()
        await panel.getByRole('radio', { name: 'Dark', exact: true }).check()
        expect(await copied('Copy Markdown for Give feedback')).toBe(
          `[![Give feedback](${url('/buttons/give-feedback-dark.svg')})](${url(paths.feedback)}?ref=readme)`,
        )
        expect(await copied('Copy Markdown for Live badge')).toBe(
          `[![Feedback and roadmap](${url(paths.badge('svg'))})](${url(paths.roadmap)}?ref=readme)`,
        )
        expect(await copied('Copy Hub URL')).toBe(`${url(paths.hub)}?ref=readme`)
        expect(await copied('Copy RSS feed URL')).toBe(url(paths.rss))
      })

      await test.step('the image URLs are listed, and every preview loads', async () => {
        await expect(panel.getByText(url('/buttons/give-feedback-dark.png'), { exact: true })).toBeVisible()
        expect(await copied('Copy Give feedback PNG URL')).toBe(url('/buttons/give-feedback-dark.png'))
        expect(await copied('Copy Live badge PNG URL')).toBe(url(paths.badge('png')))
        const previews = panel.getByRole('img')
        await expect(previews).toHaveCount(4)
        for (const preview of await previews.all()) {
          await expect
            .poll(() => preview.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
            .toBe(true)
        }
        // Its own context, so Playwright's automatic screenshot doesn't cover it.
        await test.info().attach('share-tab-readme-dark', {
          body: await page.screenshot({ fullPage: true }),
          contentType: 'image/png',
        })
      })

      await test.step('Linktree takes links only', async () => {
        await panel.getByRole('radio', { name: 'Linktree', exact: true }).check()
        await expect(panel.getByRole('button', { name: / for / })).toHaveCount(0)
        expect(await copied('Copy Roadmap URL')).toBe(`${url(paths.roadmap)}?ref=linktree`)
        expect(await copied('Copy Roadmap PNG URL')).toBe(url('/buttons/roadmap-dark.png'))
      })
    } finally {
      await context.close()
    }
  })

  test('S20.3 another studio’s owner can’t open the Share tab', async ({ browser }) => {
    const context = await browser.newContext({ storageState: storageStatePath('bOwner') })
    try {
      const page = await context.newPage()
      await page.goto(gameShareHref(project.id))
      await expect(page).toHaveURL(/\/admin\/collections\/game-projects\?notFound=/)
      await expect(page.getByRole('region', { name: 'Put critwire on your site' })).toHaveCount(0)
      await expect(page.getByText(project.name)).toHaveCount(0)
    } finally {
      await context.close()
    }
  })
})
