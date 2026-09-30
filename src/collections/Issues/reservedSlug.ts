import type { CollectionBeforeValidateHook } from 'payload'
import type { Slugify } from 'payload/shared'

import { ValidationError } from 'payload'
import { slugify } from 'payload/shared'

import { isReservedFeedbackSlug } from '@/lib/game-portal/paths'

const reservedSlugError = (slug: string) =>
  new ValidationError({
    collection: 'issues',
    errors: [{ message: `\`${slug}\` is reserved; choose another slug`, path: 'slug' }],
  })

/**
 * The slug field's `slugify`. Payload generates a slug in a field
 * `beforeChange` hook, after every collection hook, so this is the only
 * point that sees a slug generated from a title like "New". Synchronous,
 * because the create path assigns its result without awaiting it.
 */
export const issueSlugify: Slugify = ({ valueToSlugify }) => {
  const slug = slugify(valueToSlugify)
  if (slug && isReservedFeedbackSlug(slug)) throw reservedSlugError(slug)
  return slug
}

/**
 * Rejects a reserved slug typed by hand: with the generate box unchecked,
 * Payload stores `data.slug` as given, without calling `issueSlugify`.
 */
export const rejectReservedSlug: CollectionBeforeValidateHook = ({ data }) => {
  if (typeof data?.slug === 'string' && isReservedFeedbackSlug(data.slug)) throw reservedSlugError(data.slug)
  return data
}
