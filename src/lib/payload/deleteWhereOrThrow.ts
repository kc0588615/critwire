import type { CollectionSlug, PayloadRequest, Where } from 'payload'

/**
 * Deletes every `collection` document matching `where`, with `req` (so in
 * its transaction) and its hooks, overriding access. Payload's bulk delete
 * only reports the documents it failed to delete; this throws one error
 * naming each of them, so a partial delete never passes as done.
 */
export async function deleteWhereOrThrow({
  collection,
  req,
  where,
}: {
  collection: CollectionSlug
  req: PayloadRequest
  where: Where
}): Promise<void> {
  const { errors } = await req.payload.delete({ collection, depth: 0, overrideAccess: true, req, where })
  if (errors.length) {
    const failed = errors.map(({ id, message }) => `${id} (${message})`).join(', ')
    throw new Error(`Deleting from ${collection} failed for: ${failed}`)
  }
}
