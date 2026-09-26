import type { CollectionBeforeChangeHook } from 'payload'

/**
 * Stamps `publishedAt` when a document is first published. A partial
 * update keeps the stored date, and a draft stays undated until it's
 * published, so edits never re-date or reorder published content.
 */
export const populatePublishedAt: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  // Absent means "keep what's stored"; an explicit null clears it.
  const publishedAt = data.publishedAt === undefined ? originalDoc?.publishedAt : data.publishedAt
  const status = data._status ?? originalDoc?._status
  if (publishedAt || status !== 'published') return data

  return { ...data, publishedAt: new Date().toISOString() }
}
