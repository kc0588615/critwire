import { randomBytes } from 'node:crypto'

import type { Payload } from 'payload'

import { verificationEmail } from '@/lib/email/authEmails'
import { uniqueViolationPath } from '@/lib/payload/uniqueViolationPath'
import type { User } from '@/payload-types'

const findUserByEmail = async (payload: Payload, email: string): Promise<null | User> => {
  const { docs } = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: { email: { equals: email } },
  })
  return docs[0] ?? null
}

/**
 * A new address becomes a pending account; its password is random and
 * never leaves this function, so nobody can sign in until the inbox owner
 * chooses one on the verify page. It gets no studio and no platform role. Payload sends the verification email
 * inside the create, so a failed send leaves no account.
 * Returns `null` when the address already had an account.
 */
async function createPendingUser(payload: Payload, email: string): Promise<null | User> {
  try {
    return await payload.create({
      collection: 'users',
      data: { email, password: randomBytes(32).toString('base64url'), roles: ['user'] },
      overrideAccess: true,
    })
  } catch (error) {
    // A concurrent signup for the same address took it first.
    if (uniqueViolationPath(error, 'users') === 'email') return null
    throw error
  }
}

/**
 * Signup's one command (§5), for an address that passed the form's guards:
 * - a new address gets a pending account and its verification email;
 * - a pending account gets its stored link again, and nothing is written,
 *   so a retry can neither take the account over nor void the owner's link;
 * - a verified account gets nothing.
 * The caller answers every case the same way.
 */
export async function requestSignup(payload: Payload, email: string): Promise<void> {
  const existing = await findUserByEmail(payload, email)
  if (!existing && (await createPendingUser(payload, email))) return

  const user = existing ?? (await findUserByEmail(payload, email))
  if (!user) throw new Error('Signup: the address was taken, but no user has it.')
  if (user._verified) return
  if (!user._verificationToken) throw new Error(`Signup: pending user ${user.id} has no verification token.`)

  const { html, subject } = await verificationEmail(user._verificationToken)
  await payload.sendEmail({ html, subject, to: user.email })
}
