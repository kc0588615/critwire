/**
 * critwire.com's three legal documents: their slugs, links and titles, and
 * where `/legal/accept` may send someone afterwards. No fs, so client
 * components and any server module can import it; the documents
 * themselves are read by `./documents`.
 */

export const LEGAL_SLUGS = ['terms', 'privacy', 'copyright'] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export const LEGAL_LINKS: Record<LegalSlug, { href: string; label: string; title: string }> = {
  terms: { href: '/legal/terms', label: 'Terms', title: 'Terms of Service' },
  privacy: { href: '/legal/privacy', label: 'Privacy', title: 'Privacy Policy' },
  copyright: { href: '/legal/copyright', label: 'Copyright', title: 'Copyright Policy' },
}

export function isLegalSlug(value: string): value is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(value)
}

const NEXT_FALLBACK = '/admin'
const NEXT_BASE = 'https://critwire.invalid'

// A backslash (browsers read it as `/`), and control characters, raw or
// percent-encoded.
const UNSAFE_NEXT = /[\\\u0000-\u001f\u007f]|%5c|%[01][0-9a-f]|%7f/i

/**
 * Where to go after accepting: `next` as its parsed path and query when it
 * is a same-origin path to onboarding or the admin, and `/admin` for
 * anything else (another origin, `//host`, a loop back to `/legal/accept`,
 * an array from a repeated parameter).
 */
export function safeNext(next: unknown): string {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return NEXT_FALLBACK
  if (UNSAFE_NEXT.test(next)) return NEXT_FALLBACK

  let url: URL
  try {
    url = new URL(next, NEXT_BASE)
  } catch {
    return NEXT_FALLBACK
  }

  const { origin, pathname, search } = url
  const allowed = pathname === '/onboarding' || pathname === '/admin' || pathname.startsWith('/admin/')
  return origin === NEXT_BASE && allowed ? pathname + search : NEXT_FALLBACK
}

export function acceptHref(next: unknown): string {
  return `/legal/accept?next=${encodeURIComponent(safeNext(next))}`
}

/** Where `/legal/accept` sends someone with no session: sign in, then come back. */
export const LEGAL_ACCEPT_LOGIN = `/admin/login?redirect=${encodeURIComponent('/legal/accept')}`
