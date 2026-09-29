import { Atkinson_Hyperlegible_Next } from 'next/font/google'

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
