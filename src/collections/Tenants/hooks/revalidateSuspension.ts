import type { CollectionAfterChangeHook } from 'payload'

import type { Tenant } from '../../../payload-types'

import { revalidateGamePortal } from '../../../hooks/revalidateGamePortal'

/**
 * Suspending or reinstating a studio shows or hides every one of its
 * portals. One portal revalidation covers all of its games.
 */
export const revalidateSuspension: CollectionAfterChangeHook<Tenant> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  // On create, previousDoc is an empty object.
  if (!context.disableRevalidate && Boolean(doc.suspended) !== Boolean(previousDoc?.suspended)) {
    revalidateGamePortal('tenant suspension', payload)
  }
  return doc
}
