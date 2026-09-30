import type { CollectionBeforeValidateHook, PayloadRequest } from 'payload'
import type { Slugify } from 'payload/shared'

import { slugify } from 'payload/shared'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import { DEMO_GAME_SLUG } from '../../components/marketing/links'
import { reservedSlugError } from '../Issues/reservedSlug'

/** Slugs no studio may take: the home page links to the demo as a live portal. */
export const isReservedGameSlug = (slug: string): boolean => slug === DEMO_GAME_SLUG

// Seeds write with no user; super admins may place the demo by hand.
const mayUseReservedSlug = (req: PayloadRequest): boolean => !req.user || isSuperAdmin(req.user)

const assertSlugAllowed = (slug: string, req: PayloadRequest) => {
  if (isReservedGameSlug(slug) && !mayUseReservedSlug(req)) throw reservedSlugError('game-projects', slug)
}

/**
 * The slug field's `slugify`, which also sees a slug generated from a
 * name like "Critter Connect". Synchronous, like `issueSlugify`.
 */
export const gameSlugify: Slugify = ({ req, valueToSlugify }) => {
  const slug = slugify(valueToSlugify)
  if (slug) assertSlugAllowed(slug, req)
  return slug
}

/** Rejects a reserved slug typed by hand, which Payload stores without calling `gameSlugify`. */
export const rejectReservedGameSlug: CollectionBeforeValidateHook = ({ data, req }) => {
  if (typeof data?.slug === 'string') assertSlugAllowed(data.slug, req)
  return data
}
