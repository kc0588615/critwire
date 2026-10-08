import { readFileSync } from 'fs'
// Pinned at exactly 1.3.4: 1.3.5 (2026-04-29) is not a small patch but a
// rebuild from the 2.0 line (new entry points, dependencies inlined), and
// 2.0.0 (2026-05-06) is too new to trust here. Don't bump it casually; the
// share-kit and badge E2E specs, and the standalone check, must pass after.
import { parse, type Font } from 'opentype.js'
import path from 'path'
import sharp from 'sharp'

import { STROKE, TOKENS } from '@/lib/theme/tokens'
import { escapeXml } from '@/utilities/escapeXml'

import { SHARE_BUTTONS, type ButtonFile, type ButtonScheme, type ImageFormat, type ShareButtonID } from './buttons'

/**
 * Server-side rendering of the share images: the hosted buttons and the
 * live badge. Text is drawn as glyph paths, never `<text>`, so an image
 * looks the same in every viewer and in sharp, whether or not the server
 * has fonts (the production runner has none).
 */

const fonts = new Map<string, Font>()

/**
 * The font at `file`, read once per process. Callers spell out the full
 * path of each file: the build traces a path into the route that reads
 * it, and a path naming only the fonts directory would carry every font
 * in it, `Nunito-ExtraBold.ttf` included. A route that draws with a
 * font also has it traced in `next.config.ts`, so the standalone output
 * has the file.
 */
export const readFont = (file: string): Font => {
  let font = fonts.get(file)
  if (!font) {
    const bytes = readFileSync(file)
    font = parse(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength))
    fonts.set(file, font)
  }
  return font
}

/**
 * The share images' face, Nunito Bold (cc's ui font at its medium
 * weight), and DejaVu Sans for the characters Nunito has no glyph for
 * (Armenian and Georgian, in a version label), so those draw as letters,
 * not boxes.
 */
const shareFonts = (): { face: Font; fallback: Font } => ({
  face: readFont(path.join(process.cwd(), 'src/lib/share/fonts/Nunito-Bold.ttf')),
  fallback: readFont(path.join(process.cwd(), 'src/lib/share/fonts/DejaVuSans.ttf')),
})

/** `text` split into runs that one font draws: Nunito where it has the glyph, else DejaVu. */
const fontRuns = (text: string): { font: Font; text: string }[] => {
  const { face, fallback } = shareFonts()
  const runs: { font: Font; text: string }[] = []
  for (const char of text) {
    const font = face.charToGlyph(char).index === 0 ? fallback : face
    const last = runs.at(-1)
    if (last?.font === font) last.text += char
    else runs.push({ font, text: char })
  }
  return runs
}

export type TextStep = keyof typeof TOKENS.text

/**
 * The step's size and its tracking, which opentype.js adds after every
 * glyph, as CSS `letter-spacing` does, so a label draws as wide as cc's
 * text of that step.
 */
const textStyle = (step: TextStep): { size: number; options: { letterSpacing: number } } => ({
  size: TOKENS.text[step].size,
  options: { letterSpacing: TOKENS.text[step].letterSpacing },
})

/** How wide `text` draws at `step`. */
const textWidth = (text: string, step: TextStep): number => {
  const { size, options } = textStyle(step)
  return fontRuns(text).reduce((width, run) => width + run.font.getAdvanceWidth(run.text, size, options), 0)
}

/** `text` as one SVG path at `step`, with its baseline at `y`, and how wide it is. */
export const glyphPath = (text: string, x: number, y: number, step: TextStep): { d: string; width: number } => {
  const { size, options } = textStyle(step)
  let d = ''
  let advance = 0
  for (const run of fontRuns(text)) {
    d += run.font.getPath(run.text, x + advance, y, size, options).toPathData(2)
    advance += run.font.getAdvanceWidth(run.text, size, options)
  }
  return { d, width: advance }
}

/** The baseline that centres capital letters at `step` in a box `height` px tall. */
export const centredBaseline = (height: number, step: TextStep): number => {
  const { face } = shareFonts()
  const { size } = textStyle(step)
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

const BUTTON = {
  height: 36,
  // The label's text step, and the smaller one it drops to should a label
  // ever leave less than the minimum side padding (D21).
  textSteps: ['s', 'xs'],
  minPadding: TOKENS.space.m,
  mark: TOKENS.space.s,
  gap: TOKENS.space.xs,
  edge: STROKE.s,
} as const

/** cc's outline Button in the scheme's mode, with a color-1 mark. Generic, not themed per game. */
const buttonPalette = (scheme: ButtonScheme): { background: string; border: string; text: string; mark: string } => {
  const { neutral } = TOKENS[scheme]
  return { background: neutral[1], border: neutral[4], text: neutral[10], mark: TOKENS.color[1] }
}

/**
 * One hosted button: a pill with a color-1 circle and its label, centred
 * in the button's published width. Throws when no text step leaves the
 * minimum side padding, since the width can't change.
 */
export const buttonSVG = (id: ShareButtonID, scheme: ButtonScheme): string => {
  const button = SHARE_BUTTONS.find((candidate) => candidate.id === id)
  if (!button) throw new Error(`Unknown share button: ${id}`)
  const palette = buttonPalette(scheme)
  const { height, textSteps, minPadding, mark, gap, edge } = BUTTON
  const { width } = button

  const contentWidth = (step: TextStep): number => mark + gap + textWidth(button.label, step)
  const step = textSteps.find((candidate) => (width - contentWidth(candidate)) / 2 >= minPadding)
  if (step === undefined) {
    throw new Error(`The "${button.label}" button leaves under ${minPadding} px of side padding in ${width} px`)
  }
  const markX = (width - contentWidth(step)) / 2
  const label = glyphPath(button.label, markX + mark + gap, centredBaseline(height, step), step)
  const inset = edge / 2
  // cc's full radius as SVG draws it: past half the height, `rx` would
  // stretch to half the width and the ends would turn elliptical.
  const radius = (height - edge) / 2

  return svgDocument({
    width,
    height,
    label: button.label,
    body:
      `<rect x="${inset}" y="${inset}" width="${width - edge}" height="${height - edge}" rx="${radius}" ` +
      `fill="${palette.background}" stroke="${palette.border}" stroke-width="${edge}"/>` +
      `<circle cx="${(markX + mark / 2).toFixed(2)}" cy="${height / 2}" r="${mark / 2}" fill="${palette.mark}"/>` +
      `<path fill="${palette.text}" d="${label.d}"/>`,
  })
}

const BADGE = { height: 24, text: 's', padding: TOKENS.space.s } as const

/** What a badge says and how it looks: a label segment, then a value segment. */
export type BadgeModel = {
  label: string
  value: string
  colors: { label: string; labelText: string; value: string; valueText: string; border: string }
  /** The shape's control radius; drawn at most half the height, past which the corners would turn elliptical. */
  radius: number
}

/** A two-segment badge, like `feedback | 3 planned · v1.4`, outlined. */
export const badgeSVG = ({ label, value, colors, radius: controlRadius }: BadgeModel): string => {
  const { height, text, padding } = BADGE
  const radius = Math.min(controlRadius, height / 2)
  const baseline = centredBaseline(height, text)
  const labelText = glyphPath(label, padding, baseline, text)
  const split = Math.ceil(padding + labelText.width + padding)
  const valueText = glyphPath(value, split + padding, baseline, text)
  const width = Math.ceil(split + padding + valueText.width + padding)
  const corner = radius > 0 ? ` rx="${radius}"` : ''
  // The outline is inset half its width, so its corner is too, to stay concentric.
  const edgeCorner = radius > 0 ? ` rx="${radius - 0.5}"` : ''

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
      `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}"${edgeCorner} fill="none" stroke="${colors.border}"/>`,
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
