import fs from 'fs/promises'
import path from 'path'
import type { Payload, PayloadRequest } from 'payload'
import { extractID } from 'payload/shared'

import type { Media } from '../payload-types'

/**
 * The studio's media with this PNG's name, uploaded from `file` unless
 * the studio already has it. Matched by filename and tenant, so a rerun
 * reuses the earlier upload instead of storing a suffixed copy. Shared by
 * the Critter Connect seed and the content command, which both name the
 * upload by its filename.
 */
export async function ensureMedia(
  payload: Payload,
  { tenant, file, alt }: { tenant: number; file: string; alt: string },
  req?: Partial<PayloadRequest>,
): Promise<Media> {
  const filename = path.basename(file)
  // Filenames are unique across studios, so look in all of them.
  const existing = await payload.find({
    collection: 'media',
    where: { filename: { equals: filename } },
    depth: 0,
    limit: 1,
    req,
  })
  const owner = existing.docs[0]
  if (owner) {
    const ownerTenant = owner.tenant ? extractID(owner.tenant) : null
    if (ownerTenant === tenant) return owner
    throw new Error(
      `The media "${filename}" belongs to another studio (tenant id: ${ownerTenant}); rename or delete it, then rerun.`,
    )
  }

  // No document has this name, so a file of that name in storage is left
  // from a deleted document or a dropped database. Replace it: Payload
  // would otherwise store a renamed copy (`app-icon-513.png`) that
  // neither a rerun nor the caller's lookup by name could find.
  const buffer = await fs.readFile(path.resolve(file))
  return payload.create({
    collection: 'media',
    data: { alt, tenant },
    file: { data: buffer, mimetype: 'image/png', name: filename, size: buffer.length },
    overwriteExistingFiles: true,
    req,
  })
}
