import { LEGAL_LINKS, type LegalSlug } from './paths'

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

/** Beside every button that sends a player's submission. */
export const SUBMIT_NOTICE: readonly LegalCopyPart[] = [
  'By sending this, you agree to the ',
  { document: 'terms' },
  ' and acknowledge the ',
  { document: 'privacy' },
  '.',
]

/** Beside every free-text field a player fills in. */
export const SENSITIVE_INFO_WARNING =
  'Don’t include passwords, API keys, access tokens, private keys, payment details, health information or anything else confidential or sensitive.'

/**
 * Discord's shorter warning: a form field's description holds at most 100
 * characters, too few for `SENSITIVE_INFO_WARNING`.
 */
export const SENSITIVE_INFO_WARNING_SHORT =
  'Don’t include passwords, keys, tokens, payment or health details, or anything sensitive.'

/** `/feedback`'s description in Discord, at most 100 characters. */
export const DISCORD_FEEDBACK_DESCRIPTION =
  'Send a bug or idea to the game’s team. Sending it accepts critwire’s Terms and Privacy Policy.'

/**
 * `SUBMIT_NOTICE` as Discord markdown: each document a masked link to
 * `href(document)`, in `<>` so Discord adds no preview.
 */
export const noticeMarkdown = (href: (document: LegalSlug) => string): string =>
  SUBMIT_NOTICE.map((part) =>
    typeof part === 'string' ? part : `[${LEGAL_LINKS[part.document].title}](<${href(part.document)}>)`,
  ).join('')
