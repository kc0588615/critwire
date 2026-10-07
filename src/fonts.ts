import { Anybody, Atkinson_Hyperlegible_Next, Geist_Mono, Inter } from 'next/font/google'

/**
 * cw's face for its ui, brand and editorial roles (`--font-ui` and the
 * others in `src/styles/cw.css`): Inter in place of the licensed GT
 * Standard M (GUI.md, Local decisions). Variable, with the optical-size
 * axis, so headings get Inter's display cut. Self-hosted by next/font at
 * build time; defines `--font-cw-sans`. A licensed GT Standard replaces it
 * here, with `next/font/local`.
 */
export const cwSans = Inter({
  axes: ['opsz'],
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-cw-sans',
})

/** cw's data role (`--font-data`): Geist Mono; defines `--font-cw-mono`. */
export const cwMono = Geist_Mono({
  display: 'swap',
  preload: false,
  subsets: ['latin', 'latin-ext'],
  variable: '--font-cw-mono',
})

/** Both cw faces' variables, for the class of `<html>` in each root layout. */
export const cwFontVariables = `${cwSans.variable} ${cwMono.variable}`

/**
 * Body and UI face for every surface (marketing and portal), and every
 * numeral. Self-hosted by next/font at build time; the class goes on
 * `<html>` in both root layouts and defines `--font-body`.
 */
export const bodyFont = Atkinson_Hyperlegible_Next({
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-body',
})

/**
 * Critwire's own display face (its site and the admin's wordmark, never a
 * studio's portal); defines `--font-critwire`.
 */
export const critwireFont = Anybody({
  axes: ['wdth'],
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-critwire',
})
