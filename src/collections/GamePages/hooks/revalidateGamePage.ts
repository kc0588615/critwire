import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { GamePage } from '../../../payload-types'

import { revalidateGamePortal } from '../../../hooks/revalidateGamePortal'

// The landing's site config also frames the ops pages (theme, nav,
// footer), so a landing change revalidates every portal page.

export const revalidateGamePage: CollectionAfterChangeHook<GamePage> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      revalidateGamePortal(`game page ${doc.id}`, payload)
    }
  }
  return doc
}

export const revalidateGamePageDelete: CollectionAfterDeleteHook<GamePage> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    revalidateGamePortal(`game page ${doc.id}`, payload)
  }
  return doc
}
