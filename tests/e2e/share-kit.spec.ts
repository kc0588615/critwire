import sharp from 'sharp'

import { expect, newRequestContext, test } from './support/fixtures'
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
