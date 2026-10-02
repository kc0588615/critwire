import type { PaginatedDocs } from 'payload'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { PatchNote } from '@/payload-types'

export const PATCH_NOTES_PER_PAGE = 10

/** How many updates the hub and the updates embed show. */
export const LATEST_UPDATES_LIMIT = 3

/** How many updates the feeds list (RSS and JSON Feed). */
export const FEED_UPDATES_LIMIT = 20

/** An update's title in a feed (RSS and JSON Feed): "<version> — <title>", or the title alone. */
export const updateFeedTitle = (note: Pick<PatchNote, 'title' | 'versionLabel'>): string =>
  note.versionLabel ? `${note.versionLabel} — ${note.title}` : note.title

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

const VERSION_LABEL_MAX = 24

/**
 * The version of the newest published update that has one, trimmed and
 * cut to 24 characters, or `null`. Read through access, so drafts and
 * held updates are skipped. Payload compiles `not_equals: ''` to
 * `IS NULL OR <> ''`, so `exists` is needed too: without it, a newer
 * update with no version would hide an older one's.
 */
export const getLatestVersionLabel = async (projectID: number | string): Promise<null | string> => {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'patch-notes',
    depth: 0,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    select: { versionLabel: true },
    sort: '-publishedAt',
    where: {
      and: [
        { gameProject: { equals: projectID } },
        { _status: { equals: 'published' } },
        { versionLabel: { exists: true } },
        { versionLabel: { not_equals: '' } },
      ],
    },
  })
  const label = result.docs[0]?.versionLabel?.trim()
  if (!label) return null
  return Array.from(label).slice(0, VERSION_LABEL_MAX).join('').trimEnd()
}
