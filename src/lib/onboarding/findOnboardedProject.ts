import type { Payload } from 'payload'

export interface OnboardedProject {
  id: number
  slug: string
  /** The studio the user created, which holds the game. */
  tenant: number
  /** Screening held the game for review. */
  flagged: boolean
}

/** The first game in the studio `userID` created at onboarding, or `null` before onboarding. */
export async function findOnboardedProject(payload: Payload, userID: number): Promise<null | OnboardedProject> {
  const {
    docs: [tenant],
  } = await payload.find({
    collection: 'tenants',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: {},
    where: { createdBy: { equals: userID } },
  })
  if (!tenant) return null

  const {
    docs: [project],
  } = await payload.find({
    collection: 'game-projects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: { flagged: true, slug: true },
    sort: 'createdAt',
    where: { tenant: { equals: tenant.id } },
  })
  if (!project?.slug) return null

  return { flagged: Boolean(project.flagged), id: project.id, slug: project.slug, tenant: tenant.id }
}
