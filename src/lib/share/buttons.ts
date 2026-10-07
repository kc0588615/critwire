import type { PortalPaths } from '@/lib/game-portal/paths'

/**
 * The hosted button images: the kit links them from studios' pages, and
 * `/buttons/[file]` serves them. Pure, so client components can import it.
 */

/**
 * `width` is each image's published width in px (36 px tall; the PNG is
 * twice both). It's a contract: studios' pages lay out around it and
 * cache the images for long, so a restyle never changes it.
 */
export const SHARE_BUTTONS = [
  { id: 'give-feedback', label: 'Give feedback', link: 'feedback', width: 156 },
  { id: 'roadmap', label: 'Roadmap', link: 'roadmap', width: 120 },
  { id: 'whats-new', label: "What's new", link: 'updates', width: 136 },
] as const satisfies readonly { id: string; label: string; link: keyof PortalPaths; width: number }[]

export type ShareButton = (typeof SHARE_BUTTONS)[number]
export type ShareButtonID = ShareButton['id']

/** Light buttons suit light pages, dark buttons dark ones. */
export const BUTTON_SCHEMES = ['light', 'dark'] as const
export type ButtonScheme = (typeof BUTTON_SCHEMES)[number]

/** SVG is crisp at any size; PNG is for builders that only take uploads. */
export const IMAGE_FORMATS = ['svg', 'png'] as const
export type ImageFormat = (typeof IMAGE_FORMATS)[number]

export type ButtonFile = { id: ShareButtonID; scheme: ButtonScheme; format: ImageFormat }

export const buttonPath = (id: ShareButtonID, scheme: ButtonScheme, format: ImageFormat): string =>
  `/buttons/${id}-${scheme}.${format}`

const BUTTON_FILE = new RegExp(
  `^(${SHARE_BUTTONS.map((button) => button.id).join('|')})-(${BUTTON_SCHEMES.join('|')})\\.(${IMAGE_FORMATS.join('|')})$`,
)

/** The button a `/buttons/<file>` name asks for, or `null` when there's no such file. */
export const parseButtonFile = (file: string): ButtonFile | null => {
  const match = BUTTON_FILE.exec(file)
  if (!match) return null
  return {
    id: match[1] as ShareButtonID,
    scheme: match[2] as ButtonScheme,
    format: match[3] as ImageFormat,
  }
}
