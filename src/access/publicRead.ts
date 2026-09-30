import type { MultiTenantPluginConfig } from '@payloadcms/plugin-multi-tenant/types'
import type { Access, Where } from 'payload'

import { isSuperAdmin } from './isSuperAdmin'

/** The plugin doesn't export this type. */
type AccessResultOverride = NonNullable<
  NonNullable<MultiTenantPluginConfig['collections']['media']>['accessResultOverride']
>

/**
 * What an anonymous visitor may read. Held content (`flagged`) and
 * suspended studios leave the public site. Relationship paths are read at
 * query time, so there are no copied flags to keep in step, and Payload's
 * `not_equals` also matches `NULL`, so a missing flag counts as not held.
 */
const studioNotSuspended: Where = { 'tenant.suspended': { not_equals: true } }
const gameNotFlagged: Where = { 'gameProject.flagged': { not_equals: true } }
const notFlagged: Where = { flagged: { not_equals: true } }

const PUBLIC: Record<'gameProjects' | 'issues' | 'media' | 'patchNotes', Where> = {
  gameProjects: { and: [notFlagged, studioNotSuspended] },
  issues: { and: [{ isPublic: { equals: true } }, studioNotSuspended, gameNotFlagged] },
  media: studioNotSuspended,
  patchNotes: { and: [{ _status: { equals: 'published' } }, notFlagged, studioNotSuspended, gameNotFlagged] },
}

/**
 * Signed-in users read everything, which the multi-tenant plugin narrows
 * to their own studios (super admins: all). Anyone else gets the public rule.
 */
const publicRead =
  (where: Where): Access =>
  ({ req }) =>
    req.user ? true : where

export const gameProjectsRead = publicRead(PUBLIC.gameProjects)
export const issuesRead = publicRead(PUBLIC.issues)
export const mediaRead = publicRead(PUBLIC.media)
export const patchNotesRead = publicRead(PUBLIC.patchNotes)

/**
 * The plugin's media override. Browsers fetch `/api/media/file/…` with the
 * visitor's session cookie, and the plugin limits a signed-in studio user
 * to their own studios' files (and a user with no studio to none), so a
 * signed-in visitor would get 403s for every image on another portal.
 * File reads by signed-in non-super-admins also get what an anonymous
 * visitor may fetch. Lists, documents and the admin keep the tenant limit.
 */
export const mediaFileReadOverride: AccessResultOverride = ({
  accessKey,
  accessResult,
  isReadingStaticFile,
  req,
}) => {
  if (accessKey !== 'read' || !isReadingStaticFile || !req.user || isSuperAdmin(req.user)) {
    return accessResult
  }
  if (accessResult === true) return true
  return accessResult ? { or: [accessResult, PUBLIC.media] } : PUBLIC.media
}
