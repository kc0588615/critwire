import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test as setup } from '@playwright/test'

import { RestClient } from './support/api'
import { BASE_URL, CREDENTIALS, PASSWORD, ROLES, storageStatePath, WORLD_PATH } from './support/env'
import type { World } from './support/fixtures'

/**
 * Seeds the freshly migrated E2E database: one super admin, two studios
 * (tenants A and B) and their users, then signs every role in and saves
 * its session for the specs.
 */
setup('seed a fresh database and sign in every role', async ({ playwright }) => {
  await mkdir(path.dirname(WORLD_PATH), { recursive: true })
  const anonymous = await playwright.request.newContext({ baseURL: BASE_URL })

  const superToken = await setup.step('register the first user as super admin', async () => {
    const response = await anonymous.post('/api/users/first-register', {
      data: { ...CREDENTIALS.superAdmin, password: PASSWORD, roles: ['admin'] },
    })
    expect(response.status(), 'E2E database is not fresh: first-register refused').toBe(200)
    return ((await response.json()) as { token: string }).token
  })
  const asSuperAdmin = new RestClient(anonymous, superToken)

  const tenants = await setup.step('create studios A and B', async () => {
    const created = {} as World['tenants']
    for (const key of ['A', 'B'] as const) {
      const slug = `e2e-studio-${key.toLowerCase()}`
      const { status, body } = await asSuperAdmin.create('tenants', { name: `E2E Studio ${key}`, slug })
      expect(status, JSON.stringify(body)).toBe(201)
      created[key] = { id: body.doc.id, slug }
    }
    return created
  })

  await setup.step('create the studio users', async () => {
    const studioUsers = [
      { role: 'aOwner', tenant: tenants.A.id, tenantRole: 'owner' },
      { role: 'aMember', tenant: tenants.A.id, tenantRole: 'member' },
      { role: 'bOwner', tenant: tenants.B.id, tenantRole: 'owner' },
    ] as const
    for (const { role, tenant, tenantRole } of studioUsers) {
      const { status, body } = await asSuperAdmin.create('users', {
        ...CREDENTIALS[role],
        password: PASSWORD,
        roles: ['user'],
        tenants: [{ tenant, roles: [tenantRole] }],
      })
      expect(status, JSON.stringify(body)).toBe(201)
    }
  })

  const users = await setup.step('sign in every role', async () => {
    const signedIn = {} as World['users']
    for (const role of ROLES) {
      const context = await playwright.request.newContext({ baseURL: BASE_URL })
      const response = await context.post('/api/users/login', {
        data: { email: CREDENTIALS[role].email, password: PASSWORD },
      })
      expect(response.status(), `${role} login`).toBe(200)
      const { token, user } = (await response.json()) as { token: string; user: { id: number } }
      signedIn[role] = { id: user.id, email: CREDENTIALS[role].email, token }
      await context.storageState({ path: storageStatePath(role) })
      await context.dispose()
    }
    return signedIn
  })

  const world: World = { tenants, users }
  await writeFile(WORLD_PATH, JSON.stringify(world, null, 2))
  await anonymous.dispose()
})
