import { readFile } from 'node:fs/promises'

import { test as base, type APIRequestContext } from '@playwright/test'

import { RestClient } from './api'
import { BASE_URL, type Role, ROLES, WORLD_PATH } from './env'

/** What `auth.setup.ts` created on the fresh database. */
export interface World {
  tenants: Record<'A' | 'B', { id: number; slug: string }>
  users: Record<Role, { id: number; email: string; token: string }>
}

interface WorkerFixtures {
  world: World
  /** REST client acting as `role`, or anonymously. Worker-scoped so `beforeAll` can use it. */
  api: (role: Role | 'anonymous') => RestClient
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const test = base.extend<{}, WorkerFixtures>({
  world: [
    // Playwright requires a destructuring pattern for the fixtures argument.
    async ({}, use) => {
      await use(JSON.parse(await readFile(WORLD_PATH, 'utf8')) as World)
    },
    { scope: 'worker' },
  ],
  api: [
    async ({ playwright, world }, use) => {
      const contexts: APIRequestContext[] = []
      const clients = {} as Record<Role | 'anonymous', RestClient>
      for (const role of [...ROLES, 'anonymous'] as const) {
        const context = await playwright.request.newContext({ baseURL: BASE_URL })
        contexts.push(context)
        clients[role] = new RestClient(context, role === 'anonymous' ? undefined : world.users[role].token)
      }
      await use((role) => clients[role])
      await Promise.all(contexts.map((context) => context.dispose()))
    },
    { scope: 'worker' },
  ],
})

export { expect } from '@playwright/test'
