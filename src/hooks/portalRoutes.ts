/**
 * Portal route patterns for `revalidatePath(pattern, 'layout')`.
 *
 * Next tags a cached page with its exact URL and with its route's
 * pattern, route groups included (`/(public)/g/[gameSlug]/…/layout`),
 * never with a concrete path's layout. So `revalidatePath('/g/<slug>/
 * patch-notes', 'layout')` matches nothing: a subtree is revalidated by
 * pattern, for every game at once. The patch-notes E2E scenarios fail
 * if a route move leaves these stale.
 */
export const PORTAL_ROUTE = '/(public)/g/[gameSlug]'
export const PATCH_NOTES_ROUTE = `${PORTAL_ROUTE}/(ops)/patch-notes`
