/**
 * Reading the share images' SVG in specs. They draw text as paths, so the
 * `<title>` is the only place a spec can read what an image says.
 */

const ENTITIES: Record<string, string> = { amp: '&', apos: "'", gt: '>', lt: '<', quot: '"' }

const decode = (text: string): string =>
  text.replace(/&(amp|apos|gt|lt|quot|#(\d+)|#x([0-9a-f]+));/gi, (_match, name: string, dec?: string, hex?: string) =>
    dec ? String.fromCodePoint(Number(dec)) : hex ? String.fromCodePoint(parseInt(hex, 16)) : ENTITIES[name],
  )

/** The image's `<title>`, decoded. Fails loudly when there's none. */
export const svgTitle = (svg: string): string => {
  const match = /<title>([^<]*)<\/title>/.exec(svg)
  if (!match) throw new Error(`No <title> in SVG: ${svg.slice(0, 200)}`)
  return decode(match[1])
}

const rootSize = (svg: string, attribute: 'height' | 'width'): number => {
  const match = new RegExp(`<svg\\b[^>]*\\s${attribute}="([\\d.]+)"`).exec(svg)
  if (!match) throw new Error(`No ${attribute} on the root <svg>: ${svg.slice(0, 200)}`)
  return Number(match[1])
}

/** The root element's `height` attribute, in px. */
export const svgHeight = (svg: string): number => rootSize(svg, 'height')

/** The root element's `width` attribute, in px. */
export const svgWidth = (svg: string): number => rootSize(svg, 'width')
