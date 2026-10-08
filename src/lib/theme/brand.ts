// `pnpm generate:brand`: draws critwire's brand files from tokens.ts into public/:
// the favicons and the default share image. Rerun only when tokens.ts's brand
// colours or the wordmark change, and commit the result.
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

import { HOME_TITLE } from '@/components/marketing/copy'
import { readFont, svgDocument } from '@/lib/share/images'
import { DEFAULT_OG_IMAGE } from '@/utilities/mergeOpenGraph'

import { TOKENS } from './tokens'

const PUBLIC_DIR = path.join(import.meta.dirname, '../../../public')
const WORDMARK = 'critwire'

// The brand role at its heavy weight: Inter's display cut, as `next/font`
// sets it at these sizes (D1). Drawn as glyph paths, so no file needs a font.
// Only this script reads it, so no route traces it.
const face = readFont(path.join(import.meta.dirname, '../share/fonts/InterDisplay-Bold.ttf'))

/** The favicon's own size: the mark's corner is the theme's m radius at this size. */
const FAVICON_SIZE = 32
/** How much of the mark's height the "c" fills. */
const GLYPH_SHARE = 0.6
const ICO_SIZES = [16, 32, 48] as const

/** `text` as one path whose ink box's top left corner is at `x`, `y`, `height` px tall. */
const inkPath = (text: string, x: number, y: number, height: number): string => {
  const unit = face.getPath(text, 0, 0, 1).getBoundingBox()
  const size = height / (unit.y2 - unit.y1)
  return face.getPath(text, x - unit.x1 * size, y - unit.y1 * size, size).toPathData(2)
}

/** The mark: a lowercase "c" on a color-1 square, centred; `size` px square at `x`, `y`. */
const mark = (x: number, y: number, size: number): string => {
  const glyphHeight = size * GLYPH_SHARE
  const unit = face.getPath('c', 0, 0, 1).getBoundingBox()
  const glyphWidth = glyphHeight * ((unit.x2 - unit.x1) / (unit.y2 - unit.y1))
  const radius = (TOKENS.radius.m * size) / FAVICON_SIZE
  return (
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="${radius}" fill="${TOKENS.color[1]}"/>` +
    `<path fill="${TOKENS.light.accentText}" d="${inkPath('c', x + (size - glyphWidth) / 2, y + (size - glyphHeight) / 2, glyphHeight)}"/>`
  )
}

const faviconSVG = svgDocument({
  body: mark(0, 0, FAVICON_SIZE),
  height: FAVICON_SIZE,
  label: WORDMARK,
  width: FAVICON_SIZE,
})

/** A PNG of `svg` (drawn `from` px square) at `size` px square. */
const squarePNG = async (svg: string, from: number, size: number): Promise<Buffer> => {
  const png = await sharp(Buffer.from(svg), { density: (72 * size) / from })
    .png({ compressionLevel: 9 })
    .toBuffer()
  const { height, width } = await sharp(png).metadata()
  if (width !== size || height !== size) throw new Error(`Expected a ${size} px PNG, got ${width}×${height}`)
  return png
}

/** An ICO file holding `pngs`, each `size` px square: the 6-byte header, a 16-byte entry each, then the images. */
const icoFile = (pngs: { png: Buffer; size: number }[]): Buffer => {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2) // type: icon
  header.writeUInt16LE(pngs.length, 4)
  let offset = header.length + 16 * pngs.length
  const entries = pngs.map(({ png, size }) => {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size, 0)
    entry.writeUInt8(size, 1)
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })
  return Buffer.concat([header, ...entries, ...pngs.map(({ png }) => png)])
}

// The share image's layout, in px of the 1200×630 canvas.
const OG = { pad: 80, mark: 120, gap: 40, wordmark: 136, title: 60, titleLeading: 68, maxTitleLines: 3 } as const

/** `text` broken into lines no wider than `width` at `size` px. */
const wrap = (text: string, size: number, width: number): string[] =>
  text.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.at(-1)
    if (last !== undefined && face.getAdvanceWidth(`${last} ${word}`, size) <= width) {
      lines[lines.length - 1] = `${last} ${word}`
    } else {
      lines.push(word)
    }
    return lines
  }, [])

/** The dark mode: the mark and the wordmark at the top, the home page's headline at the bottom. */
const ogSVG = (): string => {
  const { height, width } = DEFAULT_OG_IMAGE
  const { neutral } = TOKENS.dark
  const lines = wrap(HOME_TITLE, OG.title, width - OG.pad * 2)
  if (lines.length > OG.maxTitleLines) throw new Error(`The share image's title needs ${lines.length} lines`)
  const firstBaseline = height - OG.pad - OG.titleLeading * (lines.length - 1)
  const title = lines
    .map((line, index) => face.getPath(line, OG.pad, firstBaseline + OG.titleLeading * index, OG.title).toPathData(2))
    .join('')
  const wordmark = face.getPath(WORDMARK, OG.pad + OG.mark + OG.gap, OG.pad + OG.mark, OG.wordmark).toPathData(2)

  return svgDocument({
    body:
      `<rect width="${width}" height="${height}" fill="${neutral[1]}"/>` +
      mark(OG.pad, OG.pad, OG.mark) +
      `<path fill="${neutral[10]}" d="${wordmark}"/>` +
      `<path fill="${neutral[7]}" d="${title}"/>`,
    height,
    label: DEFAULT_OG_IMAGE.alt,
    width,
  })
}

const write = (file: string, data: Buffer | string) => writeFileSync(path.join(PUBLIC_DIR, file), data)

write('favicon.svg', `${faviconSVG}\n`)
write(
  'favicon.ico',
  icoFile(
    await Promise.all(ICO_SIZES.map(async (size) => ({ png: await squarePNG(faviconSVG, FAVICON_SIZE, size), size }))),
  ),
)
write('og.png', await sharp(Buffer.from(ogSVG())).png({ compressionLevel: 9 }).toBuffer())
