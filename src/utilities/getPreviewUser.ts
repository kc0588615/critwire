import config from '@payload-config'
import { draftMode, headers } from 'next/headers'
import { getPayload } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin } from '@/access/isSuperAdmin'

/**
 * The signed-in user behind a Draft Mode request. Draft Mode is one
 * site-wide cookie, so every draft read re-authorizes against this user
 * rather than trusting the cookie.
 */
export const getPreviewUser = async (): Promise<null | User> => {
  const payload = await getPayload({ config })
  try {
    const result = await payload.auth({ headers: await headers() })
    return result.user
  } catch {
    return null
  }
}

/**
 * Find options for platform marketing pages. Studio users get Draft
 * Mode legitimately for their own game pages, so only a super admin in
 * Draft Mode reads drafts; access decides everything else.
 * Everyone else queries the published document: with `draft: true` a
 * published-only filter would miss it whenever a newer draft exists.
 */
export const getMarketingReadOptions = async (): Promise<{
  draft: boolean
  overrideAccess: false
  user: null | User
}> => {
  const { isEnabled } = await draftMode()
  const user = isEnabled ? await getPreviewUser() : null
  return { draft: isSuperAdmin(user), overrideAccess: false, user }
}
