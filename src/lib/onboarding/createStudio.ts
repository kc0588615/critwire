import type { Payload, PayloadRequest } from 'payload'

import { isReservedGameSlug } from '@/collections/GameProjects/reservedSlug'
import type { StoreLinkKey } from '@/lib/game-portal/links'
import { getLogger } from '@/lib/logger'
import { uniqueViolationPath } from '@/lib/payload/uniqueViolationPath'
import { withTransaction } from '@/lib/payload/withTransaction'
import type { User } from '@/payload-types'
import { uniqueSlug } from '@/utilities/uniqueSlug'

export interface StudioInput {
  /** The game's name, which also names the studio. */
  name: string
  website: string
  store?: { key: StoreLinkKey; url: string }
}

/** The user already created a studio: a double submit, caught by the unique `createdBy`. */
export class StudioExistsError extends Error {
  constructor() {
    super('This user has already created a studio.')
    this.name = 'StudioExistsError'
  }
}

const log = getLogger('onboarding')

const MAX_ATTEMPTS = 3

const isSlugTaken =
  (req: PayloadRequest, collection: 'game-projects' | 'tenants') =>
  async (slug: string): Promise<boolean> => {
    const { totalDocs } = await req.payload.count({
      collection,
      overrideAccess: true,
      req,
      where: { slug: { equals: slug } },
    })
    return totalDocs > 0
  }

async function createInTransaction(payload: Payload, user: User, input: StudioInput): Promise<void> {
  await withTransaction(payload, async (req) => {
    // 1. The studio, as the system: studios are super-admin-only over REST.
    const tenant = await payload.create({
      collection: 'tenants',
      data: {
        createdBy: user.id,
        name: input.name,
        slug: await uniqueSlug({ base: input.name, fallback: 'studio', isTaken: isSlugTaken(req, 'tenants') }),
      },
      overrideAccess: true,
      req,
    })

    // 2. Its owner: memberships are super-admin-only over REST.
    const owner = await payload.update({
      collection: 'users',
      id: user.id,
      data: { tenants: [{ roles: ['owner'], tenant: tenant.id }] },
      depth: 0,
      overrideAccess: true,
      req,
    })

    // 3. The game, as the new owner, so every studio rule applies as in the
    // admin: tenant access, the tenant-write hook, limits and screening. The
    // plugin's tenant default comes from the admin's cookie, so it's set here.
    req.user = { ...owner, collection: 'users' }
    const isGameSlugTaken = isSlugTaken(req, 'game-projects')
    await payload.create({
      collection: 'game-projects',
      data: {
        links: { website: input.website, ...(input.store && { [input.store.key]: input.store.url }) },
        name: input.name,
        reportForm: { acceptIdeas: false },
        slug: await uniqueSlug({
          base: input.name,
          fallback: 'game',
          isTaken: async (slug) => isReservedGameSlug(slug) || isGameSlugTaken(slug),
        }),
        tenant: tenant.id,
      },
      overrideAccess: false,
      req,
    })
  })
}

/**
 * Onboarding's one command: a studio `user` owns, and its first game, in
 * one transaction. Another signup taking a slug between the check and the
 * insert reruns it, up to 3 attempts in all; a second studio for the same
 * user throws `StudioExistsError`.
 */
export async function createStudio({
  input,
  payload,
  user,
}: {
  input: StudioInput
  payload: Payload
  user: User
}): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await createInTransaction(payload, user, input)
      return
    } catch (error) {
      if (uniqueViolationPath(error, 'tenants') === 'createdBy') throw new StudioExistsError()
      const slugTaken =
        uniqueViolationPath(error, 'tenants') === 'slug' || uniqueViolationPath(error, 'game-projects') === 'slug'
      if (!slugTaken || attempt >= MAX_ATTEMPTS) throw error
      log.warn({ attempt, msg: 'Onboarding: a slug was taken meanwhile; retrying.', userID: user.id })
    }
  }
}
