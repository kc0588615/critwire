import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { type APIRequestContext, expect } from '@playwright/test'

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

export interface AcceptLegalOptions {
  /** `next` as sent in the form's action; omitted when undefined. */
  next?: string
  /** A box left unticked. */
  omit?: 'acceptTerms' | 'confirmAge'
  /** The versions the form says it showed; the files' own by default. */
  versions?: { privacy?: string; terms?: string }
}

/**
 * Posts `/legal/accept`'s form as the account `token` signs in, the way the
 * page does: both boxes ticked and the documents' versions, unless the
 * options change them. Fails unless it answers 303, and returns where it
 * redirects (path and query).
 */
export async function acceptLegal(
  request: APIRequestContext,
  token: string,
  { next, omit, versions = {} }: AcceptLegalOptions = {},
): Promise<string> {
  const form: Record<string, string> = {
    acceptTerms: 'on',
    confirmAge: 'on',
    privacyVersion: versions.privacy ?? legalFrontMatter('privacy').version,
    termsVersion: versions.terms ?? legalFrontMatter('terms').version,
  }
  if (omit) delete form[omit]

  const query = next === undefined ? '' : `?next=${encodeURIComponent(next)}`
  const response = await request.post(`/legal/accept/submit${query}`, {
    form,
    headers: { Authorization: `JWT ${token}` },
    maxRedirects: 0,
  })
  expect(response.status(), 'accept the legal documents').toBe(303)
  const location = new URL(response.headers().location ?? '', BASE_URL)
  return `${location.pathname}${location.search}`
}
