/**
 * Admin URLs other code links to. The admin lives at Payload's default
 * `/admin` route. Pure, so client components can import it.
 */

/** The game's Share tab, a custom document view (`GameProjects`' `admin.components.views.edit.share`). */
export const GAME_SHARE_VIEW_PATH = '/share'

export const gameEditHref = (id: number): string => `/admin/collections/game-projects/${id}`

export const gameShareHref = (id: number): string => `${gameEditHref(id)}${GAME_SHARE_VIEW_PATH}`
