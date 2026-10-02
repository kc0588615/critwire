import type { FieldAccess } from 'payload'

import { isSuperAdmin } from './isSuperAdmin'

/**
 * Writes to `GameProject.discord`: a super admin, or server code that
 * passes `context: { discordLink: true }` (the OAuth callback, Disconnect
 * and `stopPosting` in `lib/discord/link.ts`). REST and GraphQL clients
 * can't set `req.context`, so a studio can't forge a server link.
 */
export const discordLinkFieldAccess: FieldAccess = ({ req }) =>
  isSuperAdmin(req.user) || req.context?.discordLink === true
