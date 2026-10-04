import { z } from 'zod'

import { currentLegalVersions, legalVersionSchema } from '@/lib/legal/documents'

// A ticked checkbox: `on` from a form, `true` from JSON.
const ticked = z.union([z.literal('on'), z.literal(true)])

/**
 * The two consent boxes, and the versions the page showed them for (from
 * LegalConsentFields' hidden inputs). Those must be the current versions
 * when the body is parsed (the refinement reads the documents then, never
 * at import), so a stale page fails exactly like a missing box.
 * `/legal/accept/submit` parses it alone; signup intersects it with its
 * email (`.and()`).
 */
export const legalConsentSchema = z
  .object({
    acceptTerms: ticked,
    confirmAge: ticked,
    privacyVersion: legalVersionSchema,
    termsVersion: legalVersionSchema,
  })
  .refine(
    ({ privacyVersion, termsVersion }) => {
      const current = currentLegalVersions()
      return termsVersion === current.terms && privacyVersion === current.privacy
    },
    { message: 'The Terms of Service or Privacy Policy changed. Review them and tick both boxes again.' },
  )
