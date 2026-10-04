import type { LegalSlug } from './paths'

/**
 * Legal copy shared by the web and Discord, so each sentence is written
 * once. A sentence that names documents is stored in parts: plain text,
 * and the documents to link, which each surface renders its own way.
 */

export type LegalCopyPart = string | { document: LegalSlug }

/** The first consent box, at signup and on `/legal/accept`. */
export const AGREE_TO_TERMS: readonly LegalCopyPart[] = [
  'I agree to the ',
  { document: 'terms' },
  ' and acknowledge the ',
  { document: 'privacy' },
]

/** The second consent box. Accounts are for people aged 18 or older. */
export const CONFIRM_AGE = 'I confirm I’m at least 18 years old.'

/** Where legal requests go: account closure, privacy and copyright. */
export const LEGAL_CONTACT_EMAIL = 'admin@critwire.com'
