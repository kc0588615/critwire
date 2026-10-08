// `pnpm generate:brand`: writes the site's brand files into public/ from the
// game's own files in public/brand/ (`SITE` in src/lib/site.ts): the favicons,
// the apple-touch icon and the default share image. Rerun only when those
// files change, and commit the result.
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

import { readFont, svgDocument } from '@/lib/share/images'
import { SITE } from '@/lib/site'
import { DEFAULT_OG_IMAGE } from '@/utilities/mergeOpenGraph'

import { TOKENS } from './tokens'

const PUBLIC_DIR = path.join(import.meta.dirname, '../../../public')
const FAVICON_SVG = '/brand/favicon.svg'
const ICO_SIZES = [16, 32, 48] as const
const APPLE_TOUCH_SIZE = 512
/** The share image's line: what the site is, no game fact. */
const OG_LINE = 'Feedback and updates'

// The brand role at its heavy weight, as the hub's title sets it. Drawn as
// glyph paths, so the image needs no font. Only this script reads it, so no
// route traces it.
const face = readFont(path.join(import.meta.dirname, '../share/fonts/Nunito-ExtraBold.ttf'))

/** The file at `publicPath` (a URL path under public/). */
const read = (publicPath: string): Buffer => readFileSync(path.join(PUBLIC_DIR, publicPath))

const write = (file: string, data: Buffer | string) => writeFileSync(path.join(PUBLIC_DIR, file), data)

/** The PNG at `publicPath`, which must be `size` px square. */
const squarePNG = async (publicPath: string, size: number): Promise<Buffer> => {
  const png = read(publicPath)
  const { format, height, width } = await sharp(png).metadata()
  if (format !== 'png' || width !== size || height !== size) {
    throw new Error(`Expected ${publicPath} to be a ${size} px PNG, got ${format} ${width}×${height}`)
  }
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

/**
 * The lockup at `publicPath` as a nested `<svg>`, `height` px tall with its
 * top left corner at `x`, `y`. Its viewBox is the drawing's tight box.
 */
const lockup = (publicPath: string, x: number, y: number, height: number): { svg: string; width: number } => {
  const source = read(publicPath).toString('utf8')
  const match = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(source)
  const viewBox = match?.[1]?.match(/\bviewBox="([^"]+)"/)?.[1]
  const [, , boxWidth, boxHeight] = viewBox?.split(' ').map(Number) ?? []
  if (!match || !viewBox || !boxWidth || !boxHeight) {
    throw new Error(`Expected ${publicPath} to be one <svg> with a viewBox`)
  }
  const width = (height * boxWidth) / boxHeight
  return {
    svg: `<svg x="${x}" y="${y}" width="${width.toFixed(2)}" height="${height}" viewBox="${viewBox}">${match[2]}</svg>`,
    width,
  }
}

// The share image's layout, in px of the 1200×630 canvas.
const OG = { pad: 80, lockup: 112, line: 72 } as const

/** The dark mode: the dark lockup at the top, `OG_LINE` at the bottom. */
const ogSVG = (): string => {
  const { height, width } = DEFAULT_OG_IMAGE
  const { neutral } = TOKENS.dark
  const logo = lockup(SITE.logo.dark, OG.pad, OG.pad, OG.lockup)
  if (logo.width > width - OG.pad * 2) throw new Error(`The share image's lockup is ${logo.width} px wide`)
  if (face.getAdvanceWidth(OG_LINE, OG.line) > width - OG.pad * 2) throw new Error("The share image's line is too wide")
  const line = face.getPath(OG_LINE, OG.pad, height - OG.pad, OG.line).toPathData(2)

  return svgDocument({
    body: `<rect width="${width}" height="${height}" fill="${neutral[1]}"/>` + logo.svg + `<path fill="${neutral[7]}" d="${line}"/>`,
    height,
    label: DEFAULT_OG_IMAGE.alt,
    width,
  })
}

write('favicon.svg', read(FAVICON_SVG))
write(
  'favicon.ico',
  icoFile(
    await Promise.all(ICO_SIZES.map(async (size) => ({ png: await squarePNG(`/brand/favicon-${size}.png`, size), size }))),
  ),
)
write('apple-touch-icon.png', await squarePNG(SITE.appIcon, APPLE_TOUCH_SIZE))
write('og.png', await sharp(Buffer.from(ogSVG())).png({ compressionLevel: 9 }).toBuffer())
