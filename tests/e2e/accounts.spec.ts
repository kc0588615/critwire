import type { AbuseReport } from '../../src/payload-types'
import { linkTo, readEmail } from './support/email'
import { PASSWORD } from './support/env'
import { createPatchNote, createProject, expect, randomEmail, seed, test } from './support/fixtures'

/**
 * Accounts and platform fields: users a super admin creates start
 * verified, nobody verifies or re-addresses themselves, studios can't
 * write the platform's fields, and abuse reports belong to super admins.
 */

test('S9.1 a user a super admin creates is verified, signs in and gets no verification link', async ({
  api,
  signIn,
}) => {
  const email = randomEmail('s91')
  const user = await seed(api('superAdmin'), 'users', { email, password: PASSWORD, roles: ['user'] })
  expect(user._verified).toBe(true)

  await signIn(email, PASSWORD)

  const message = await readEmail(email)
  expect(message.subject).toBe('An account was created for you')
  linkTo(message, '/admin/login')
  expect(message.links.filter((link) => link.includes('/verify/'))).toEqual([])
})

test("S9.2 a user can't change their own email or verification; a super admin can change the email", async ({
  api,
  seedUser,
}) => {
  const superAdmin = api('superAdmin')
  const user = await seedUser('s92')

  const own = await user.client.update('users', user.id, { email: randomEmail('s92-swap'), _verified: false })
  expect(own.status, JSON.stringify(own.body)).toBe(200)
  const afterOwn = await superAdmin.findByID('users', user.id)
  expect(afterOwn.status).toBe(200)
  expect(afterOwn.body.email).toBe(user.email)
  expect(afterOwn.body._verified).toBe(true)

  const newEmail = randomEmail('s92-new')
  const bySuperAdmin = await superAdmin.update('users', user.id, { email: newEmail })
  expect(bySuperAdmin.status, JSON.stringify(bySuperAdmin.body)).toBe(200)
  const afterSuperAdmin = await superAdmin.findByID('users', user.id)
  expect(afterSuperAdmin.body.email).toBe(newEmail)
  expect(afterSuperAdmin.body._verified).toBe(true)
})

test.describe("S9.3 studio users can't write platform fields", () => {
  test("an owner can't suspend their studio or claim it", async ({ api, seedStudio }) => {
    const { tenant, owner } = await seedStudio('s93-tenant')

    const patch = await owner.client.update('tenants', tenant.id, { suspended: true, createdBy: owner.id })
    expect(patch.status, JSON.stringify(patch.body)).toBe(200)

    const { status, body } = await api('superAdmin').findByID('tenants', tenant.id, { depth: 0 })
    expect(status).toBe(200)
    expect(body.suspended).toBe(false)
    expect(body.createdBy ?? null).toBeNull()
  })

  test("an owner's flag values are ignored on create", async ({ seedStudio }) => {
    const { tenant, owner } = await seedStudio('s93-create')

    const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
      flagged: true,
      flagReasons: 'set by the owner',
    })
    expect(project.flagged).toBe(false)
    expect(project.flagReasons ?? null).toBeNull()

    const note = await createPatchNote(owner.client, project, 'flagged-by-owner', {
      flagged: true,
      flagReasons: 'set by the owner',
    })
    expect(note.flagged).toBe(false)
    expect(note.flagReasons ?? null).toBeNull()
  })

  test("an owner can't clear a flag a super admin set", async ({ api, seedStudio }) => {
    const superAdmin = api('superAdmin')
    const { tenant, owner } = await seedStudio('s93-clear')
    const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

    const flag = await superAdmin.update('game-projects', project.id, { flagged: true, flagReasons: 'Held by E2E' })
    expect(flag.status, JSON.stringify(flag.body)).toBe(200)

    const clear = await owner.client.update('game-projects', project.id, { flagged: false })
    expect(clear.status, JSON.stringify(clear.body)).toBe(200)

    const { body } = await superAdmin.findByID('game-projects', project.id, { depth: 0 })
    expect(body.flagged).toBe(true)
    expect(body.flagReasons).toBe('Held by E2E')
  })
})

test('S9.4 abuse reports belong to super admins', async ({ api }) => {
  const report: Partial<AbuseReport> = { pageUrl: '/g/s94-reported', reason: 'spam' }

  for (const role of ['aOwner', 'anonymous'] as const) {
    const list = await api(role).find('abuse-reports')
    expect(list.status, `${role} lists abuse reports`).toBe(403)
    const create = await api(role).create('abuse-reports', report)
    expect(create.status, `${role} creates an abuse report`).toBe(403)
  }

  const created = await seed(api('superAdmin'), 'abuse-reports', report)
  expect(created.status).toBe('open')
  const { status, body } = await api('superAdmin').find('abuse-reports', { where: { id: { equals: created.id } } })
  expect(status).toBe(200)
  expect(body.docs.map((doc) => doc.id)).toEqual([created.id])
})
