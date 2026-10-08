import fs from 'fs/promises'
import path from 'path'
import type { Payload, PayloadRequest } from 'payload'

import type { Media } from '../payload-types'

/**
 * The studio's media with this PNG's name, uploaded from `file` unless
 * the studio already has it. Matched by filename and tenant, so a rerun
 * reuses the earlier upload instead of storing a suffixed copy. Shared by
 * the Critter Connect seed and the content command.
 */
export async function ensureMedia(
  payload: Payload,
  { tenant, file, alt }: { tenant: number; file: string; alt: string },
  req?: Partial<PayloadRequest>,
): Promise<Media> {
  const filename = path.basename(file)
  const existing = await payload.find({
    collection: 'media',
    where: { and: [{ filename: { equals: filename } }, { tenant: { equals: tenant } }] },
    depth: 0,
    limit: 1,
    req,
  })
  if (existing.docs[0]) return existing.docs[0]

  const buffer = await fs.readFile(path.resolve(file))
  return payload.create({
    collection: 'media',
    data: { alt, tenant },
    file: { data: buffer, mimetype: 'image/png', name: filename, size: buffer.length },
    req,
  })
}
