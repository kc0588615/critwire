/**
 * Utility functions for UI components automatically added by ShadCN and used in a few of our frontend components and blocks.
 *
 * Other functions may be exported from here in the future or by installing other shadcn components.
 */

import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

import { RADIUS_STEPS, SHADOW_STEPS, SPACE_STEPS, TEXT_STEPS, WEIGHTS } from '@/lib/theme/tokens'

// tailwind-merge knows only Tailwind's default scales, so it would keep
// `mx-auto` beside `mx-zero` and read `text-m` as a colour. It learns the
// theme's step names (globals.css maps them to utilities) from tokens.ts.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      'font-weight': [...WEIGHTS],
      radius: [...RADIUS_STEPS],
      shadow: [...SHADOW_STEPS],
      spacing: [...SPACE_STEPS],
      text: [...TEXT_STEPS],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
