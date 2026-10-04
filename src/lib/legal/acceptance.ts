import type { Payload, PayloadRequest } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import type { User } from '@/payload-types'

import { currentLegalVersions, getLegalDocument } from './documents'

/**
 * Whether an account has accepted the current Terms of Service and Privacy
 * Policy. Only `/legal/accept/submit` records an acceptance, for the
 * signed-in, verified account holder; the admin guard, onboarding and the
 * write hooks ask `needsLegalAcceptance` before letting them in.
 */

const MEMO_KEY = 'needsLegalAcceptance'

type Memo = Map<number, boolean>

// One answer per user per request: the admin guard, its views, server
// functions and write hooks share `req`. A request never outlives a
// version bump, so the memo can't hide one.
const memoOf = (req: PayloadRequest): Memo => {
  const memo = req.context[MEMO_KEY]
  if (memo instanceof Map) return memo as Memo
  const fresh: Memo = new Map()
  req.context[MEMO_KEY] = fresh
  return fresh
}

/**
 * True when `user` must accept before going on: anyone but a super admin
 * (who acts for the operator) without an acceptance of both current
 * versions. Only current versions are ever recorded, so this is "the
 * latest acceptance matches".
 */
export async function needsLegalAcceptance({
  payload,
  req,
  user,
}: {
  payload: Payload
  req?: PayloadRequest
  user: Pick<User, 'id' | 'roles'>
}): Promise<boolean> {
  if (isSuperAdmin(user)) return false

  const memo = req ? memoOf(req) : undefined
  const known = memo?.get(user.id)
  if (known !== undefined) return known

  const { privacy, terms } = currentLegalVersions()
  const { totalDocs } = await payload.count({
    collection: 'legal-acceptances',
    overrideAccess: true,
    req,
    where: {
      and: [
        { user: { equals: user.id } },
        { termsVersion: { equals: terms } },
        { privacyVersion: { equals: privacy } },
      ],
    },
  })
  const needed = totalDocs === 0
  memo?.set(user.id, needed)
  return needed
}

/**
 * Records that `userID` accepted the versions their page showed, with both
 * documents' digests. Throws unless those are the current versions, so the
 * binding holds for any caller, not only the consent schema's.
 */
export async function recordLegalAcceptance({
  accepted,
  payload,
  req,
  userID,
}: {
  accepted: { privacyVersion: string; termsVersion: string }
  payload: Payload
  req?: PayloadRequest
  userID: number
}): Promise<void> {
  const terms = getLegalDocument('terms')
  const privacy = getLegalDocument('privacy')
  if (accepted.termsVersion !== terms.version || accepted.privacyVersion !== privacy.version) {
    throw new Error(
      `Legal acceptance for user ${userID}: versions ${accepted.termsVersion}/${accepted.privacyVersion} aren't the current ${terms.version}/${privacy.version}.`,
    )
  }

  await payload.create({
    collection: 'legal-acceptances',
    data: {
      privacyDigest: privacy.digest,
      privacyVersion: privacy.version,
      termsDigest: terms.digest,
      termsVersion: terms.version,
      user: userID,
    },
    overrideAccess: true,
    req,
  })
  if (req) memoOf(req).delete(userID)
}
