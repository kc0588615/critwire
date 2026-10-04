import { createHash } from 'crypto'
import { readFileSync } from 'fs'
import path from 'path'
import { z } from 'zod'

import { isLegalSlug, LEGAL_LINKS, LEGAL_SLUGS, type LegalSlug } from './paths'

export type { LegalSlug }

/**
 * critwire.com's legal documents, read from `legal/<slug>.md` at runtime
 * (server only: it reads the disk). The front matter is the one source
 * of their versions: the pages, the acceptance records and the check at
 * login all read it here.
 *
 * A version names one text: any change to a document's text bumps its
 * `version` (docs/patterns.md). Each acceptance also stores the file's
 * digest, so the exact text someone accepted can be found in git.
 *
 * Files are read lazily, never at import, so the Payload CLI and config
 * imports touch no files; `assertLegalDocuments()` at boot fails fast
 * instead. next.config.ts traces `legal/*.md` into the standalone output.
 */

export type LegalDocument = {
  body: string
  digest: string
  effective: string
  slug: LegalSlug
  status: 'draft' | 'final'
  title: string
  version: string
}

const frontMatterSchema = z.strictObject({
  version: z.string().regex(/^[0-9A-Za-z][0-9A-Za-z.-]{0,31}$/, 'must be 1–32 letters, digits, dots or dashes'),
  effective: z.iso.date(),
  status: z.enum(['draft', 'final']),
})

const FRONT_MATTER_KEYS = Object.keys(frontMatterSchema.shape)
const FENCE = '---'

const cache = new Map<LegalSlug, LegalDocument>()

function parseLegalDocument(slug: LegalSlug, raw: Buffer): LegalDocument {
  const file = `legal/${slug}.md`
  const lines = raw.toString('utf8').split('\n')

  if (lines[0] !== FENCE) throw new Error(`${file}: must start with a "${FENCE}" line`)
  const end = lines.indexOf(FENCE, 1)
  if (end === -1) throw new Error(`${file}: the front matter never closes with a "${FENCE}" line`)

  // Bare `key: value` lines only: three scalars don't need a YAML parser,
  // and anything else (quotes included) fails loudly in Zod below.
  const fields: Record<string, string> = {}
  for (const line of lines.slice(1, end)) {
    const match = /^([a-z]+): ?(.*)$/.exec(line)
    if (!match) throw new Error(`${file}: front matter line "${line}" isn't "key: value"`)
    const [, key, value] = match
    if (!FRONT_MATTER_KEYS.includes(key)) throw new Error(`${file}: unknown front matter key "${key}"`)
    if (key in fields) throw new Error(`${file}: duplicate front matter key "${key}"`)
    fields[key] = value
  }

  const result = frontMatterSchema.safeParse(fields)
  if (!result.success) throw new Error(`${file}: invalid front matter\n${z.prettifyError(result.error)}`)

  return {
    ...result.data,
    body: lines.slice(end + 1).join('\n'),
    digest: createHash('sha256').update(raw).digest('hex'),
    slug,
    title: LEGAL_LINKS[slug].title,
  }
}

function readLegalFile(slug: LegalSlug): Buffer {
  try {
    return readFileSync(path.join(process.cwd(), 'legal', `${slug}.md`))
  } catch (error) {
    throw new Error(`legal/${slug}.md: can't be read`, { cause: error })
  }
}

export function getLegalDocument(slug: LegalSlug): LegalDocument {
  if (!isLegalSlug(slug)) throw new Error(`Unknown legal document "${String(slug)}"`)

  const cached = cache.get(slug)
  if (cached) return cached

  const document = parseLegalDocument(slug, readLegalFile(slug))
  // Memoized in production only, so edits show up in `pnpm dev`.
  if (process.env.NODE_ENV === 'production') cache.set(slug, document)
  return document
}

/** The versions an account accepts: the Terms and the Privacy Policy. */
export function currentLegalVersions(): { privacy: string; terms: string } {
  return { privacy: getLegalDocument('privacy').version, terms: getLegalDocument('terms').version }
}

/** Throws unless every document reads and parses (run at boot). */
export function assertLegalDocuments(): void {
  for (const slug of LEGAL_SLUGS) getLegalDocument(slug)
}
