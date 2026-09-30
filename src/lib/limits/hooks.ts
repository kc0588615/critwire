import type { CollectionBeforeChangeHook, PayloadRequest } from 'payload'

import { extractID } from 'payload/shared'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { getTenantIDsByRole } from '@/access/tenantRoles'
import { assertGameRoom, assertMediaRoom, assertPublicFeedbackRoom } from '@/lib/limits'
import type { GameProject, Issue, Media, Tenant } from '@/payload-types'

type TenantValue = null | number | string | Tenant | undefined
type ID = number | string

/**
 * The studio a studio user is writing into, when the write is theirs to
 * limit. Super admins and system writes (seeds, a player's submission
 * that auto-publishes) aren't limited. A write into a studio the user
 * doesn't belong to is left to `enforceTenantWrite`, which refuses it, so
 * a limit message never reveals another studio's counts.
 */
const limitedTenant = (req: PayloadRequest, tenant: TenantValue): ID | null => {
  const user = req.user
  if (tenant == null || !user || isSuperAdmin(user)) return null
  const tenantID = extractID(tenant)
  return getTenantIDsByRole(user).some((id) => String(id) === String(tenantID)) ? tenantID : null
}

const sameID = (a: unknown, b: unknown): boolean =>
  a != null && b != null && String(extractID(a as ID)) === String(extractID(b as ID))

/** GameProjects: on create, or when a game moves to another studio. */
export const checkGamesLimit: CollectionBeforeChangeHook<GameProject> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const tenant = data.tenant ?? originalDoc?.tenant
  if (operation === 'update' && sameID(tenant, originalDoc?.tenant)) return data
  const tenantID = limitedTenant(req, tenant)
  if (tenantID != null) await assertGameRoom(req, tenantID)
  return data
}

/** Media: whenever a file is written. A replaced file's size no longer counts. */
export const checkMediaLimit: CollectionBeforeChangeHook<Media> = async ({ data, originalDoc, req }) => {
  if (!req.file) return data
  const tenantID = limitedTenant(req, data.tenant ?? originalDoc?.tenant)
  if (tenantID != null) {
    await assertMediaRoom(req, tenantID, data.filesize ?? req.file.size, originalDoc?.id)
  }
  return data
}

/** Issues: when an item becomes public, by creation, a change to public, or a move to another game. */
export const checkPublicFeedbackLimit: CollectionBeforeChangeHook<Issue> = async ({
  data,
  operation,
  originalDoc,
  req,
}) => {
  const item = { ...originalDoc, ...data }
  if (!item.isPublic || !item.gameProject) return data
  const becomesPublic =
    operation === 'create' || !originalDoc?.isPublic || !sameID(item.gameProject, originalDoc.gameProject)
  if (!becomesPublic || limitedTenant(req, item.tenant) == null) return data
  await assertPublicFeedbackRoom(req, extractID(item.gameProject))
  return data
}
