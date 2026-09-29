import { Archivo, Science_Gothic, Young_Serif } from 'next/font/google'

/*
 * The portal's three display voices, one per `typography` token (see
 * DISPLAY in render/themeStyle.ts). Not preloaded: the voice depends on
 * the studio's theme, so the browser downloads only the face that
 * `--fs-font-display` references.
 */

const archivo = Archivo({
  axes: ['wdth'],
  display: 'swap',
  preload: false,
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
})

const youngSerif = Young_Serif({
  display: 'swap',
  preload: false,
  subsets: ['latin', 'latin-ext'],
  variable: '--font-young-serif',
  weight: '400',
})

const scienceGothic = Science_Gothic({
  axes: ['wdth'],
  display: 'swap',
  preload: false,
  subsets: ['latin', 'latin-ext'],
  variable: '--font-science-gothic',
})

/** Classes that define the three display-face variables; `SiteRoot` applies them. */
export const displayFontVariables = [archivo.variable, youngSerif.variable, scienceGothic.variable].join(' ')
