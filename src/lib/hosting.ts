/**
 * Whether this instance offers open signup: `/signup`, verification,
 * onboarding, the home page's call to action and the portals' "Report
 * this page" link. Only the hosted instance turns it on; unset or empty
 * is the self-hosted default. Checked at boot by `instrumentation-node.ts`.
 */
export function isOpenSignup(): boolean {
  const raw = process.env.CRITWIRE_OPEN_SIGNUP?.trim()
  if (!raw) return false
  if (raw === '1') return true
  throw new Error(`CRITWIRE_OPEN_SIGNUP must be 1, or empty to turn signup off (got "${raw}").`)
}

/**
 * Whether portals and embeds show "Powered by Critwire". A self-hosted
 * instance may hide it with `CRITWIRE_HIDE_POWERED_BY=1`; the hosted one,
 * with open signup, always shows it. Any other value, or hiding it with
 * open signup on, throws. Checked at boot by `instrumentation-node.ts`.
 */
export function isPoweredByShown(): boolean {
  const raw = process.env.CRITWIRE_HIDE_POWERED_BY?.trim()
  if (!raw) return true
  if (raw !== '1') {
    throw new Error(
      `CRITWIRE_HIDE_POWERED_BY must be 1, or empty to show "Powered by Critwire" (got "${raw}").`,
    )
  }
  if (isOpenSignup()) {
    throw new Error(
      'CRITWIRE_HIDE_POWERED_BY=1 is for self-hosted instances; the hosted one (CRITWIRE_OPEN_SIGNUP=1) always shows "Powered by Critwire".',
    )
  }
  return false
}

/** Where "Create your portal" leads. */
export const SIGNUP_PATH = '/signup'

/** The "Report this page" form for a portal path (`parsePortalPath` checks it on submit). */
export const reportAbuseHref = (pagePath: string): string =>
  `/report-abuse?${new URLSearchParams({ page: pagePath })}`
