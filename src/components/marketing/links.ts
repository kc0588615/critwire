/** Critwire's own destinations, shared by the header, footer and home page. */
export const DEMO_PORTAL_HREF = '/g/critter-connect'
export const SIGN_IN_HREF = '/admin'

/** The site's two links; the header drops `wideOnly` ones at phone width. */
export const MARKETING_NAV = [
  { href: DEMO_PORTAL_HREF, label: 'Demo portal', wideOnly: true },
  { href: SIGN_IN_HREF, label: 'Sign in', wideOnly: false },
] as const
