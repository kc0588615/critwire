import type { CollectionBeforeValidateHook, CollectionSlug } from 'payload'

import { ValidationError } from 'payload'
import { extractID } from 'payload/shared'

/**
 * Enforces slug uniqueness per game project with a friendly validation
 * error. The compound unique DB index on [gameProject, slug] remains the
 * hard guarantee against races.
 */
export const validateUniqueSlugPerProject =
  (collection: Extract<CollectionSlug, 'issues' | 'patch-notes'>): CollectionBeforeValidateHook =>
  async ({ data, originalDoc, req }) => {
    const slug = data?.slug ?? originalDoc?.slug
    const project = data?.gameProject ?? originalDoc?.gameProject
    if (!slug || !project) return data

    const existing = await req.payload.find({
      collection,
      depth: 0,
      limit: 1,
      overrideAccess: true,
      where: {
        and: [
          { slug: { equals: slug } },
          { gameProject: { equals: extractID(project) } },
          ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
        ],
      },
    })

    if (existing.totalDocs > 0) {
      throw new ValidationError({
        collection,
        errors: [
          {
            message: `The slug "${slug}" is already used by another document in this game project.`,
            path: 'slug',
          },
        ],
      })
    }

    return data
  }
