import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { type APIRequestContext, expect, type Locator } from '@playwright/test'

import { BASE_URL } from './env'

/**
 * The specs' own reading of `legal/*.md`, independent of the app's loader
 * (`src/lib/legal/documents.ts`), so a wrong constant there fails a test.
 */

export const LEGAL_SLUGS = ['terms', 'privacy', 'copyright'] as const

export type LegalSlug = (typeof LEGAL_SLUGS)[number]

export interface LegalFrontMatter {
  version: string
  effective: string
  status: string
}

const legalBytes = (slug: LegalSlug): Buffer => readFileSync(path.join(process.cwd(), 'legal', `${slug}.md`))

/** The front matter's three keys, and the body after it. */
export function legalFrontMatter(slug: LegalSlug): LegalFrontMatter & { body: string } {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(legalBytes(slug).toString('utf8'))
  if (!match) throw new Error(`legal/${slug}.md has no front matter`)
  const fields = Object.fromEntries(match[1].split('\n').map((line) => line.split(/: (.*)/s).slice(0, 2)))
  const { version, effective, status } = fields
  if (!version || !effective || !status) throw new Error(`legal/${slug}.md is missing a front matter key`)
  return { version, effective, status, body: match[2] }
}

/** The SHA-256 (hex) of the file's bytes, as `sha256sum` prints it. */
export const legalDigest = (slug: LegalSlug): string => createHash('sha256').update(legalBytes(slug)).digest('hex')

export interface LegalConsentOptions {
  /** A box left unticked. */
  omit?: 'acceptTerms' | 'confirmAge'
  /** The versions the form says it showed; the files' own by default. */
  versions?: { privacy?: string; terms?: string }
}

/**
 * The consent boxes' fields as the signup and `/legal/accept` forms post
 * them: both boxes ticked and the documents' versions, unless the options
 * change them.
 */
export function legalConsentForm({ omit, versions = {} }: LegalConsentOptions = {}): Record<string, string> {
  const form: Record<string, string> = {
    acceptTerms: 'on',
    confirmAge: 'on',
    privacyVersion: versions.privacy ?? legalFrontMatter('privacy').version,
    termsVersion: versions.terms ?? legalFrontMatter('terms').version,
  }
  if (omit) delete form[omit]
  return form
}

export interface AcceptLegalOptions extends LegalConsentOptions {
  /** `next` as sent in the form's action; omitted when undefined. */
  next?: string
}

/**
 * Posts `/legal/accept`'s form as the account `token` signs in, the way the
 * page does (`legalConsentForm`). Fails unless it answers 303, and returns
 * where it redirects (path and query).
 */
export async function acceptLegal(
  request: APIRequestContext,
  token: string,
  { next, ...consent }: AcceptLegalOptions = {},
): Promise<string> {
  const query = next === undefined ? '' : `?next=${encodeURIComponent(next)}`
  const response = await request.post(`/legal/accept/submit${query}`, {
    form: legalConsentForm(consent),
    headers: { Authorization: `JWT ${token}` },
    maxRedirects: 0,
  })
  expect(response.status(), 'accept the legal documents').toBe(303)
  const location = new URL(response.headers().location ?? '', BASE_URL)
  return `${location.pathname}${location.search}`
}

/** The Brief's warning, beside every free-text field a player fills in (Goal 3). */
export const SENSITIVE_INFO_WARNING =
  'Don’t include passwords, API keys, access tokens, private keys, payment details, health information or anything else confidential or sensitive.'

/** The Brief's notice, beside every submit button a player presses (Goal 3). */
export const SUBMIT_NOTICE = 'By sending this, you agree to the Terms of Service and acknowledge the Privacy Policy.'

/** The three documents as the footers link them: name, then path. */
export const LEGAL_FOOTER_LINKS = [
  ['Terms', '/legal/terms'],
  ['Privacy', '/legal/privacy'],
  ['Copyright', '/legal/copyright'],
] as const

/** `scope`'s navigation `label` links the three documents, in order. */
export async function expectLegalLinks(scope: Locator, label: string): Promise<void> {
  const nav = scope.getByRole('navigation', { name: label, exact: true })
  await expect(nav, label).toBeVisible()
  await expect(nav.getByRole('link')).toHaveText(LEGAL_FOOTER_LINKS.map(([name]) => name))
  for (const [name, href] of LEGAL_FOOTER_LINKS) {
    await expect(nav.getByRole('link', { name, exact: true })).toHaveAttribute('href', href)
  }
}

const DESCRIBED_BY_WARNING = /(^|\s)sensitive-info-warning(\s|$)/

/**
 * A player form's warning and notice (plan S10): the warning once, linked
 * from each of `textFields` (by label) and from every text input or
 * textarea in the form, so none is missed; the notice beside the `submit`
 * button, describing it and linking the Terms and the Privacy Policy.
 */
export async function expectPlayerFormNotices(
  form: Locator,
  { submit, textFields }: { submit: string; textFields: readonly string[] },
): Promise<void> {
  const warning = form.getByText(SENSITIVE_INFO_WARNING, { exact: true })
  await expect(warning).toHaveCount(1)
  await expect(warning).toHaveAttribute('id', 'sensitive-info-warning')

  const controls = form.locator('textarea, input[type="text"]')
  await expect(controls).toHaveCount(textFields.length)
  for (const label of textFields) {
    await expect(form.getByLabel(label, { exact: true }), label).toHaveAttribute('aria-describedby', DESCRIBED_BY_WARNING)
  }
  for (const control of await controls.all()) {
    await expect(control).toHaveAttribute('aria-describedby', DESCRIBED_BY_WARNING)
  }

  const notice = form.getByText(SUBMIT_NOTICE, { exact: true })
  await expect(notice).toHaveCount(1)
  await expect(notice.getByRole('link', { name: 'Terms of Service', exact: true })).toHaveAttribute('href', '/legal/terms')
  await expect(notice.getByRole('link', { name: 'Privacy Policy', exact: true })).toHaveAttribute('href', '/legal/privacy')

  const button = form.getByRole('button', { name: submit, exact: true })
  await expect(button).toHaveAccessibleDescription(SUBMIT_NOTICE)
  // Beside it: the notice ends at most 150 px above the button, with the
  // verification widget at most between them.
  const [noticeBox, buttonBox] = [await notice.boundingBox(), await button.boundingBox()]
  expect(noticeBox && buttonBox, 'both are laid out').toBeTruthy()
  const gap = buttonBox!.y - (noticeBox!.y + noticeBox!.height)
  expect(gap, 'the notice sits just above the submit button').toBeGreaterThanOrEqual(0)
  expect(gap, 'the notice sits just above the submit button').toBeLessThanOrEqual(150)
}
