import type { PaginatedDocs } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { PatchNote } from '@/payload-types'

export const PATCH_NOTES_PER_PAGE = 10

export const queryPublishedPatchNotes = cache(
  async ({
    limit = PATCH_NOTES_PER_PAGE,
    page,
    projectID,
  }: {
    limit?: number
    page: number
    projectID: number | string
  }): Promise<PaginatedDocs<PatchNote>> => {
    const payload = await getPayload({ config })

    return payload.find({
      collection: 'patch-notes',
      depth: 0,
      limit,
      overrideAccess: false,
      page,
      sort: '-publishedAt',
      where: {
        and: [{ gameProject: { equals: projectID } }, { _status: { equals: 'published' } }],
      },
    })
  },
)

/** Newest published patch note — the flagship landing page's live "latest update" binding. */
export const getLatestPublishedPatchNote = cache(
  async (projectID: number | string): Promise<null | PatchNote> => {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'patch-notes',
      depth: 0,
      limit: 1,
      overrideAccess: false,
      pagination: false,
      sort: '-publishedAt',
      where: {
        and: [{ gameProject: { equals: projectID } }, { _status: { equals: 'published' } }],
      },
    })
    return result.docs[0] ?? null
  },
)

export const getPublishedPatchNote = cache(
  async ({
    projectID,
    slug,
  }: {
    projectID: number | string
    slug: string
  }): Promise<null | PatchNote> => {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'patch-notes',
      depth: 1,
      limit: 1,
      overrideAccess: false,
      pagination: false,
      where: {
        and: [
          { gameProject: { equals: projectID } },
          { slug: { equals: slug } },
          { _status: { equals: 'published' } },
        ],
      },
    })
    return result.docs[0] ?? null
  },
)
