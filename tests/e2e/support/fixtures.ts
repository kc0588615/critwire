import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import { test as base, expect, type APIRequestContext, type PlaywrightWorkerArgs } from '@playwright/test'
import type { CollectionSlug } from 'payload'
import { extractID } from 'payload/shared'

import type { Config, GameProject, Issue, IssueReport, Media, PatchNote } from '../../../src/payload-types'
import { type Query, RestClient } from './api'
import { BASE_URL, type Role, ROLES, WEBHOOK_SINK_ORIGIN, WEBHOOK_SINK_PORT, WORLD_PATH } from './env'

/** What `auth.setup.ts` created on the fresh database. */
export interface World {
  tenants: Record<'A' | 'B', { id: number; slug: string }>
  users: Record<Role, { id: number; email: string; token: string }>
}

/** One request the webhook sink received. */
export interface SinkRequest {
  method: string
  /** Parsed JSON body, or the raw text when it isn't JSON. */
  body: unknown
}

/**
 * Local stand-in for a Discord webhook, on the only non-Discord origin the
 * server accepts (`DISCORD_WEBHOOK_TEST_ORIGIN`). Answers 204 like Discord,
 * unless a path is set to redirect.
 */
export interface WebhookSink {
  url: (path: string) => string
  /** Requests received on `path`, oldest first. */
  received: (path: string) => SinkRequest[]
  /** Answers requests on `from` with a 307 to `to` on the sink. */
  redirect: (from: string, to: string) => void
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
  webhookSink: WebhookSink
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
  webhookSink: [
    async ({}, use) => {
      const requests = new Map<string, SinkRequest[]>()
      const redirects = new Map<string, string>()
      const server = createServer((req, res) => {
        const path = new URL(req.url ?? '/', WEBHOOK_SINK_ORIGIN).pathname
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          let body: unknown = text
          try {
            body = JSON.parse(text)
          } catch {
            // Keep the raw text.
          }
          requests.set(path, [...(requests.get(path) ?? []), { method: req.method ?? '', body }])
          const target = redirects.get(path)
          if (target) res.writeHead(307, { Location: `${WEBHOOK_SINK_ORIGIN}${target}` })
          else res.writeHead(204)
          res.end()
        })
      })
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(WEBHOOK_SINK_PORT, '127.0.0.1', resolve)
      })
      await use({
        url: (path) => `${WEBHOOK_SINK_ORIGIN}${path}`,
        received: (path) => requests.get(path) ?? [],
        redirect: (from, to) => {
          redirects.set(from, to)
        },
      })
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
    { scope: 'worker' },
  ],
})

export { expect }

/**
 * Retries `check` for up to 5 s after a write. Passing within 5 s proves
 * on-demand revalidation (timed ISR is an hour) and tolerates one
 * stale-while-revalidate response.
 */
export const eventually = (check: () => Promise<void>): Promise<void> =>
  expect(check).toPass({ timeout: 5_000 })

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

/** 8×8 opaque cyan PNG. */
export const PNG_8PX = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR42mNQuvwOK2IYWhIA+3p4wcm7EQIAAAAASUVORK5CYII=',
  'base64',
)

/** Uploads an 8×8 PNG to `tenant`'s media library and fails the calling test unless it's stored. */
export async function uploadImage(client: RestClient, tenant: number, name: string, alt = name): Promise<Media> {
  const { status, body } = await client.upload('media', { name, mimeType: 'image/png', buffer: PNG_8PX }, { alt, tenant })
  expect(status, `upload ${name}: ${JSON.stringify(body)}`).toBe(201)
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
