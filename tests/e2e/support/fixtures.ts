import { readFile } from 'node:fs/promises'

import { test as base, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test'
import type { CollectionSlug } from 'payload'
import { extractID } from 'payload/shared'

import type { Config, GameProject, Issue, IssueReport, PatchNote } from '../../../src/payload-types'
import { type Query, RestClient } from './api'
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
  /**
   * Suffixes `base` with the worker index. Playwright restarts the worker,
   * and so re-runs `beforeAll`, after an unexpected failure; unique slugs
   * keep that re-seed from colliding with the first one.
   */
  uniqueSlug: (base: string) => string
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
  uniqueSlug: [
    async ({}, use, workerInfo) => {
      await use((base) => `${base}-w${workerInfo.workerIndex}`)
    },
    { scope: 'worker' },
  ],
})

export { expect }

type Doc<C extends CollectionSlug> = Config['collections'][C]

/** Creates a document and fails the calling test unless the server answers 201. */
export async function seed<C extends CollectionSlug>(
  client: RestClient,
  collection: C,
  data: Partial<Doc<C>>,
  query?: Query,
): Promise<Doc<C>> {
  const { status, body } = await client.create(collection, data, query)
  expect(status, `create ${collection}: ${JSON.stringify(body)}`).toBe(201)
  return body.doc
}

/** Minimal Lexical rich-text value holding one paragraph. */
export const lexical = (text: string): PatchNote['content'] => ({
  root: {
    type: 'root',
    children: [{ type: 'paragraph', version: 1, children: [{ type: 'text', text, version: 1 }] }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

const tenantOf = (project: GameProject): number => {
  const tenant = project.tenant == null ? null : extractID(project.tenant)
  if (tenant == null) throw new Error(`game project ${project.id} has no tenant`)
  return tenant
}

/** Game project in `tenant`; `slug` must be unique to the calling spec. */
export const createProject = (
  client: RestClient,
  tenant: number,
  slug: string,
  data: Partial<GameProject> = {},
): Promise<GameProject> => seed(client, 'game-projects', { name: `Game ${slug}`, slug, tenant, ...data })

export const createIssue = (
  client: RestClient,
  project: GameProject,
  slug: string,
  data: Partial<Issue> = {},
): Promise<Issue> =>
  seed(client, 'issues', {
    gameProject: project.id,
    tenant: tenantOf(project),
    title: `Issue ${slug}`,
    slug,
    category: 'OTHER',
    ...data,
  })

/** Published unless `data._status` says otherwise; drafts are saved as drafts. */
export const createPatchNote = (
  client: RestClient,
  project: GameProject,
  slug: string,
  data: Partial<PatchNote> = {},
): Promise<PatchNote> => {
  const status = data._status ?? 'published'
  return seed(
    client,
    'patch-notes',
    {
      gameProject: project.id,
      tenant: tenantOf(project),
      title: `Patch ${slug}`,
      slug,
      content: lexical(`Notes for ${slug}`),
      ...data,
      _status: status,
    },
    status === 'draft' ? { draft: true } : undefined,
  )
}

export const createReport = (
  client: RestClient,
  project: GameProject,
  data: Partial<IssueReport> = {},
): Promise<IssueReport> =>
  seed(client, 'issue-reports', {
    gameProject: project.id,
    tenant: tenantOf(project),
    title: 'Game freezes on the title screen',
    description: 'After the intro the title screen stops responding.',
    ...data,
  })

/**
 * Casts one player vote through the public endpoint. Each call uses a
 * fresh cookie jar, so each call is a different player.
 */
export async function castVote(
  playwright: PlaywrightWorkerArgs['playwright'],
  issueID: number,
): Promise<{ upvoteCount: number; voted: boolean }> {
  const player = await playwright.request.newContext({ baseURL: BASE_URL })
  try {
    const response = await player.post('/api/vote', { data: { issueId: issueID } })
    expect(response.status(), `vote on issue ${issueID}`).toBe(200)
    return (await response.json()) as { upvoteCount: number; voted: boolean }
  } finally {
    await player.dispose()
  }
}
