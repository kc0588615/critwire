import { readFileSync } from 'fs'
// Pinned at exactly 1.3.4: 1.3.5 (2026-04-29) is not a small patch but a
// rebuild from the 2.0 line (new entry points, dependencies inlined), and
// 2.0.0 (2026-05-06) is too new to trust here. Don't bump it casually; the
// share-kit and badge E2E specs, and the standalone check, must pass after.
import { parse, type Font } from 'opentype.js'
import path from 'path'
import sharp from 'sharp'

import { escapeXml } from '@/utilities/escapeXml'

import { SHARE_BUTTONS, type ButtonFile, type ButtonScheme, type ImageFormat, type ShareButtonID } from './buttons'

/**
 * Server-side rendering of the share images: the hosted buttons and the
 * live badge. Text is drawn as glyph paths, never `<text>`, so an image
 * looks the same in every viewer and in sharp, whether or not the server
 * has fonts (the production runner has none).
 */

const FONT_FILE = path.join(process.cwd(), 'src/lib/share/fonts/DejaVuSans.ttf')

let font: Font | undefined

/** DejaVu Sans, read once per process. `next.config.ts` traces the file into the standalone output. */
const shareFont = (): Font => {
  if (!font) {
    const file = readFileSync(FONT_FILE)
    font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
  }
  return font
}

/** `text` as one SVG path at `size` px, with its baseline at `y`, and how wide it is. */
export const glyphPath = (text: string, x: number, y: number, size: number): { d: string; width: number } => {
  const face = shareFont()
  return { d: face.getPath(text, x, y, size).toPathData(2), width: face.getAdvanceWidth(text, size) }
}

/** The baseline that centres capital letters of `size` px in a box `height` px tall. */
export const centredBaseline = (height: number, size: number): number => {
  const face = shareFont()
  // Measured from "H": DejaVu's OS/2 table predates `sCapHeight`.
  const capHeight = (face.charToGlyph('H').getBoundingBox().y2 / face.unitsPerEm) * size
  if (!Number.isFinite(capHeight) || capHeight <= 0) throw new Error(`Bad cap height from the share font: ${capHeight}`)
  return (height + capHeight) / 2
}

/** A complete SVG image whose accessible name, and `<title>`, is `label`. */
export const svgDocument = ({
  body,
  height,
  label,
  width,
}: {
  body: string
  height: number
  label: string
  width: number
}): string => {
  const name = escapeXml(label)
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" ` +
    `viewBox="0 0 ${width} ${height}" role="img" aria-label="${name}"><title>${name}</title>${body}</svg>`
  )
}

const BUTTON = { height: 36, fontSize: 15, padding: 16, dot: 4, gap: 8, radius: 8 } as const

// Critwire's brand (`src/components/marketing/brand.css`): the buttons are
// generic, not themed per game.
const BUTTON_PALETTES: Record<ButtonScheme, { background: string; border: string; text: string; dot: string }> = {
  light: { background: '#ffffff', border: '#1d1f55', text: '#1d1f55', dot: '#f6d33c' },
  dark: { background: '#1d1f55', border: '#4a4d6e', text: '#ffffff', dot: '#f6d33c' },
}

/** One hosted button: a yellow dot and its label on a rounded rectangle. */
export const buttonSVG = (id: ShareButtonID, scheme: ButtonScheme): string => {
  const button = SHARE_BUTTONS.find((candidate) => candidate.id === id)
  if (!button) throw new Error(`Unknown share button: ${id}`)
  const palette = BUTTON_PALETTES[scheme]
  const { height, fontSize, padding, dot, gap, radius } = BUTTON

  const textX = padding + dot * 2 + gap
  const label = glyphPath(button.label, textX, centredBaseline(height, fontSize), fontSize)
  const width = Math.ceil(textX + label.width + padding)

  return svgDocument({
    width,
    height,
    label: button.label,
    body:
      `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="${radius}" ` +
      `fill="${palette.background}" stroke="${palette.border}"/>` +
      `<circle cx="${padding + dot}" cy="${height / 2}" r="${dot}" fill="${palette.dot}"/>` +
      `<path fill="${palette.text}" d="${label.d}"/>`,
  })
}

const BADGE = { height: 24, fontSize: 12, padding: 8 } as const

/** What a badge says and how it looks: a label segment, then a value segment. */
export type BadgeModel = {
  label: string
  value: string
  colors: { label: string; labelText: string; value: string; valueText: string; border: string }
  radius: number
}

/** A two-segment badge, like `feedback | 3 planned · v1.4`, outlined. */
export const badgeSVG = ({ label, value, colors, radius }: BadgeModel): string => {
  const { height, fontSize, padding } = BADGE
  const baseline = centredBaseline(height, fontSize)
  const labelText = glyphPath(label, padding, baseline, fontSize)
  const split = Math.ceil(padding + labelText.width + padding)
  const valueText = glyphPath(value, split + padding, baseline, fontSize)
  const width = Math.ceil(split + padding + valueText.width + padding)
  const corner = radius > 0 ? ` rx="${radius}"` : ''

  return svgDocument({
    width,
    height,
    label: `${label}: ${value}`,
    body:
      `<rect width="${width}" height="${height}"${corner} fill="${colors.value}"/>` +
      `<rect width="${split}" height="${height}"${corner} fill="${colors.label}"/>` +
      // Squares off the label segment's right-hand corners.
      (radius > 0 ? `<rect x="${split - radius}" width="${radius}" height="${height}" fill="${colors.label}"/>` : '') +
      `<path fill="${colors.labelText}" d="${labelText.d}"/>` +
      `<path fill="${colors.valueText}" d="${valueText.d}"/>` +
      `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}"${corner} fill="none" stroke="${colors.border}"/>`,
  })
}

export type ImageBody = string | Uint8Array

/** A PNG of `svg` at twice its size, for the builders that only take uploads. */
export const toPNG = async (svg: string): Promise<Uint8Array> =>
  new Uint8Array(await sharp(Buffer.from(svg), { density: 144 }).png().toBuffer())

/** `svg` in `format`. */
export const encodeImage = (svg: string, format: ImageFormat): Promise<ImageBody> =>
  format === 'svg' ? Promise.resolve(svg) : toPNG(svg)

const constantImages = new Map<string, Promise<ImageBody>>()

/**
 * Memoizes an image that depends only on constants (the buttons, the
 * neutral badge): it is rendered once per process. A failed render is
 * forgotten, so the next request tries again.
 */
export const constantImage = (key: string, render: () => Promise<ImageBody>): Promise<ImageBody> => {
  const cached = constantImages.get(key)
  if (cached) return cached
  const image = render()
  constantImages.set(key, image)
  image.catch(() => constantImages.delete(key))
  return image
}

/** A hosted button image. */
export const buttonImage = ({ id, scheme, format }: ButtonFile): Promise<ImageBody> =>
  constantImage(`button:${id}-${scheme}.${format}`, () => encodeImage(buttonSVG(id, scheme), format))

const CONTENT_TYPES: Record<ImageFormat, string> = {
  svg: 'image/svg+xml; charset=utf-8',
  png: 'image/png',
}

/**
 * An image response, cached for exactly `maxAgeSeconds` by browsers and
 * by Cloudflare. No `stale-while-revalidate`, so the bound is exact.
 */
export const imageResponse = (body: ImageBody, format: ImageFormat, maxAgeSeconds: number): Response =>
  new Response(body as BodyInit, {
    headers: {
      'Cache-Control': `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`,
      'Content-Type': CONTENT_TYPES[format],
    },
  })
