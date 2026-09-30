import { portalPaths } from '@/lib/game-portal/paths'

/**
 * Critwire's own destinations, shared by the header, footer and home page.
 * No React imports: `instrumentation-node.ts` loads this file at boot.
 */
export const DEMO_PORTAL = portalPaths('critter-connect')
export const DEMO_PORTAL_HREF = DEMO_PORTAL.hub
export const SIGN_IN_HREF = '/admin'
export const GITHUB_REPO_URL = 'https://github.com/kc0588615/critwire'

/** The site's links; the header drops `wideOnly` ones at phone width. */
export const MARKETING_NAV = [
  { href: DEMO_PORTAL_HREF, label: 'Demo portal', wideOnly: true },
  { href: GITHUB_REPO_URL, label: 'GitHub', wideOnly: false },
  { href: SIGN_IN_HREF, label: 'Sign in', wideOnly: false },
] as const

const CONTACT_PROTOCOLS = new Set(['https:', 'mailto:'])

/**
 * The home page's Contact link: `CRITWIRE_CONTACT_URL`, or null when it's
 * unset or empty, which hides the link (self-hosted instances don't show
 * critwire's contact). Any other value than a `mailto:` or `https:` URL
 * throws; `register()` calls this at boot, so a bad value stops the server.
 */
export function getContactHref(): null | string {
  const value = process.env.CRITWIRE_CONTACT_URL?.trim()
  if (!value) return null
  const invalid = `CRITWIRE_CONTACT_URL must be a mailto: or https: URL (got "${value}").`
  if (!URL.canParse(value)) throw new Error(invalid)
  if (!CONTACT_PROTOCOLS.has(new URL(value).protocol)) throw new Error(invalid)
  return value
}
