/**
 * The only place that builds a portal URL. Paths are root-relative;
 * callers that need an absolute URL prefix `getServerSideURL()`.
 */
export const portalPaths = (gameSlug: string) => {
  const hub = `/g/${gameSlug}`
  const feedback = `${hub}/feedback`
  const newFeedback = `${feedback}/new`
  const updates = `${hub}/updates`
  const contact = `${hub}/contact`

  return {
    contact,
    contactSubmit: `${contact}/submit`,
    feedback,
    feedbackItem: (slug: string) => `${feedback}/${slug}`,
    feedbackSubmit: `${newFeedback}/submit`,
    hub,
    /** The form, preset to a type when one is given. URLs carry the type in lower case. */
    newFeedback: (type?: 'bug' | 'idea') => (type ? `${newFeedback}?type=${type}` : newFeedback),
    rss: `${updates}/feed.xml`,
    update: (slug: string) => `${updates}/${slug}`,
    /**
     * An RSS item's `<guid isPermaLink="true">`. Frozen at the pre-rename
     * patch-notes path: a changed guid makes feed readers deliver every
     * item again. The old path redirects, so it stays a valid permalink.
     */
    updateGuid: (slug: string) => `${hub}/patch-notes/${slug}`,
    updates,
    /** Page 1 is the feed itself. */
    updatesPage: (page: number) => (page <= 1 ? updates : `${updates}/page/${page}`),
  }
}

export type PortalPaths = ReturnType<typeof portalPaths>

const PORTAL_PATH = /^\/g\/([^/?#\s]+)(?:\/[^?#\s]*)?$/

/**
 * The game a root-relative path belongs to: `/g/<slug>` or any path
 * under it. `null` for anything else, a query or fragment included.
 */
export const parsePortalPath = (path: string): { gameSlug: string } | null => {
  const encoded = PORTAL_PATH.exec(path)?.[1]
  if (!encoded) return null
  try {
    return { gameSlug: decodeURIComponent(encoded) }
  } catch {
    // A malformed escape is not a portal path.
    return null
  }
}

/** The portal's fixed navigation: the same three pages in the nav and the footer of every game. */
export const PORTAL_NAV = [
  { key: 'updates', label: 'Updates' },
  { key: 'feedback', label: 'Feedback' },
  { key: 'contact', label: 'Contact' },
] as const satisfies readonly { key: keyof PortalPaths; label: string }[]

export type PortalNavLink = { href: string; label: string }

/** `PORTAL_NAV` resolved to one game's URLs. */
export const portalNavLinks = (gameSlug: string): PortalNavLink[] => {
  const paths = portalPaths(gameSlug)
  return PORTAL_NAV.map(({ key, label }) => ({ href: paths[key], label }))
}

/**
 * Feedback item slugs that would collide with a static route beside
 * `feedback/[slug]`: `feedback/new` is the submit form, and Next serves
 * the static route first, so an item slugged `new` would be unreachable.
 */
export const RESERVED_FEEDBACK_SLUGS: readonly string[] = ['new']

export const isReservedFeedbackSlug = (slug: string): boolean => RESERVED_FEEDBACK_SLUGS.includes(slug)

/**
 * Portal route patterns for `revalidatePath(pattern, 'layout')`.
 *
 * Next tags a cached page with its exact URL and with its route's
 * pattern, route groups included (`/(public)/g/[gameSlug]/…/layout`),
 * never with a concrete path's layout. So `revalidatePath('/g/<slug>/
 * updates', 'layout')` matches nothing: a subtree is revalidated by
 * pattern, for every game at once. The updates E2E scenarios fail if a
 * route move leaves these stale.
 */
export const PORTAL_ROUTE = '/(public)/g/[gameSlug]'
export const UPDATES_ROUTE = `${PORTAL_ROUTE}/updates`
