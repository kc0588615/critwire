import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'

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
