import { Anybody } from 'next/font/google'

/** Critwire's own display face (marketing only); defines `--font-critwire`. */
export const critwireFont = Anybody({
  axes: ['wdth'],
  display: 'swap',
  subsets: ['latin', 'latin-ext'],
  variable: '--font-critwire',
})
