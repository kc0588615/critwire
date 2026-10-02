import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'

import {
  test as base,
  type APIRequestContext,
  type Browser,
  expect,
  type Page as BrowserPage,
  type PlaywrightWorkerArgs,
} from '@playwright/test'
import type { CollectionSlug } from 'payload'
import { extractID } from 'payload/shared'
import sharp from 'sharp'

import type { Config, GameProject, Issue, IssueReport, Media, Page, PatchNote } from '../../../src/payload-types'
import { screenText } from '../../../src/lib/moderation/screenText'
import { type Query, RestClient } from './api'
import { type EmbedHost, startEmbedHost } from './embedHost'
import { verificationToken } from './email'
import {
  BASE_URL,
  PASSWORD,
  type Role,
  ROLES,
  SECOND_BASE_URL,
  TURNSTILE_DUMMY_TOKEN,
  WEBHOOK_SINK_ORIGIN,
  WEBHOOK_SINK_PORT,
  WORLD_PATH,
} from './env'

/**
 * A request context with no cookies. Playwright applies the calling test's
 * `use` options to `playwright.request.newContext`, `storageState`
 * included, so a context first made under `test.use({ storageState })`
 * would otherwise be signed in, even a worker-scoped one.
 */
export const newRequestContext = (
  playwright: PlaywrightWorkerArgs['playwright'],
  baseURL: string = BASE_URL,
): Promise<APIRequestContext> =>
  playwright.request.newContext({ baseURL, storageState: { cookies: [], origins: [] } })

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
 * unless a path is set to redirect or to answer with another status.
 */
export interface WebhookSink {
  url: (path: string) => string
  /** Requests received on `path`, oldest first. */
  received: (path: string) => SinkRequest[]
  /** Answers requests on `from` with a 307 to `to` on the sink. */
  redirect: (from: string, to: string) => void
  /** Answers requests on `path` with `status`, as Discord answers 404 for a deleted webhook. */
  respond: (path: string, status: number) => void
}

/** A signed-in account a test created for itself. */
export interface Account {
  id: number
  email: string
  password: string
  token: string
  /** REST client acting as this account. */
  client: RestClient
}

/** A studio a test created for itself, with its owner signed in. */
export interface Studio {
  tenant: { id: number; slug: string }
  owner: Account
}

/** A studio that came through signup and onboarding, with its first game. */
export interface SignedUpStudio extends Studio {
  project: GameProject
}

interface WorkerFixtures {
  world: World
  /** REST client acting as `role`, or anonymously. Worker-scoped so `beforeAll` can use it. */
  api: (role: Role | 'anonymous') => RestClient
  /**
   * REST client on the second server (hosted limits on, signup off), as
   * `role`, as an account a test created, or anonymously. Both servers
   * share the database, so seed through `api` and the account fixtures.
   */
  secondApi: (as: Role | 'anonymous' | Pick<Account, 'token'>) => RestClient
  /**
   * Suffixes `base` with the worker index. Playwright restarts the worker,
   * and so re-runs `beforeAll`, after an unexpected failure; unique slugs
   * keep that re-seed from colliding with the first one.
   */
  uniqueSlug: (base: string) => string
  webhookSink: WebhookSink
  /** A studio's page on another site (127.0.0.1), carrying an embed snippet for the 3100 server. */
  embedHost: EmbedHost
  /** Signs in over REST and returns a client for that account. */
  signIn: (email: string, password: string) => Promise<Account>
  /**
   * A user the super admin creates with no studio, signed in. For specs
   * that change an account's state, so they never touch `world`'s users.
   */
  seedUser: (label: string) => Promise<Account>
  /**
   * A studio the super admin creates with a fresh owner, signed in. For
   * specs that change a studio's state, so they never touch `world`'s studios.
   */
  seedStudio: (label: string) => Promise<Studio>
  /**
   * A studio made the way a stranger makes one (§14): signup, the emailed
   * link, a password, then onboarding a game called `name` over HTTP.
   */
  signUpStudio: (name: string) => Promise<SignedUpStudio>
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
        const context = await newRequestContext(playwright)
        contexts.push(context)
        clients[role] = new RestClient(context, role === 'anonymous' ? undefined : world.users[role].token)
      }
      await use((role) => clients[role])
      await Promise.all(contexts.map((context) => context.dispose()))
    },
    { scope: 'worker' },
  ],
  secondApi: [
    async ({ playwright, world }, use) => {
      const context = await newRequestContext(playwright, SECOND_BASE_URL)
      await use((as) => {
        if (as === 'anonymous') return new RestClient(context)
        return new RestClient(context, typeof as === 'string' ? world.users[as].token : as.token)
      })
      await context.dispose()
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
      const statuses = new Map<string, number>()
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
          else res.writeHead(statuses.get(path) ?? 204)
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
        respond: (path, status) => {
          statuses.set(path, status)
        },
      })
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
    { scope: 'worker' },
  ],
  embedHost: [
    async ({}, use) => {
      const host = await startEmbedHost(BASE_URL)
      await use(host)
      await host.close()
    },
    { scope: 'worker' },
  ],
  signIn: [
    async ({ playwright }, use) => {
      // Clients authenticate by header. This context never signs in, so
      // it holds no session cookie that could override another account's.
      const clients = await newRequestContext(playwright)
      await use(async (email, password) => {
        const login = await newRequestContext(playwright)
        try {
          const response = await login.post('/api/users/login', { data: { email, password } })
          expect(response.status(), `sign in as ${email}`).toBe(200)
          const { token, user } = (await response.json()) as { token: string; user: { id: number } }
          return { id: user.id, email, password, token, client: new RestClient(clients, token) }
        } finally {
          await login.dispose()
        }
      })
      await clients.dispose()
    },
    { scope: 'worker' },
  ],
  seedUser: [
    async ({ api, signIn }, use) => {
      await use(async (label) => {
        const email = randomEmail(label)
        await seed(api('superAdmin'), 'users', { email, password: PASSWORD, roles: ['user'] })
        return signIn(email, PASSWORD)
      })
    },
    { scope: 'worker' },
  ],
  seedStudio: [
    async ({ api, signIn }, use) => {
      await use(async (label) => {
        const superAdmin = api('superAdmin')
        const slug = await cleanSlug(label)
        const tenant = await seed(superAdmin, 'tenants', { name: `Studio ${slug}`, slug })
        const email = randomEmail(label)
        await seed(superAdmin, 'users', {
          email,
          password: PASSWORD,
          roles: ['user'],
          tenants: [{ tenant: tenant.id, roles: ['owner'] }],
        })
        return { tenant: { id: tenant.id, slug }, owner: await signIn(email, PASSWORD) }
      })
    },
    { scope: 'worker' },
  ],
  signUpStudio: [
    async ({ api, playwright, signIn }, use) => {
      await use(async (name) => {
        const email = randomEmail('signup')
        const request = await newRequestContext(playwright)
        try {
          await startSignup(request, email)
          expect(await verifyAccount(request, await verificationToken(email), PASSWORD)).toBe(
            '/onboarding',
          )
          const owner = await signIn(email, PASSWORD)
          const location = await onboard(request, owner.token, {
            name,
            website: 'https://studio.example.com',
          })
          const slug = /^\/g\/([^/?]+)\?welcome=1$/.exec(location)?.[1]
          expect(slug, `${name} onboarded to ${location}`).toBeDefined()

          const { body: projects } = await owner.client.find('game-projects', {
            where: { slug: { equals: slug } },
            depth: 0,
          })
          expect(projects.docs, `the owner reads ${slug}`).toHaveLength(1)
          const project = projects.docs[0]
          const tenant = await api('superAdmin').findByID('tenants', tenantOf(project), {
            depth: 0,
          })
          expect(tenant.status).toBe(200)
          return { tenant: { id: tenant.body.id, slug: tenant.body.slug }, owner, project }
        } finally {
          await request.dispose()
        }
      })
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

/**
 * Runs `run` on an admin page signed in as `account`, a `seedStudio` owner,
 * then closes the browser context. It opens `/admin` first and waits for the
 * studio cookie: the multi-tenant plugin selects a one-studio user's studio
 * in the browser, so a create form opened before that saves with none.
 */
export async function asStudioAdmin(
  browser: Browser,
  { owner, tenant }: Studio,
  run: (page: BrowserPage) => Promise<void>,
  baseURL: string = BASE_URL,
): Promise<void> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
  try {
    await context.addCookies([{ name: 'payload-token', value: owner.token, url: baseURL }])
    const page = await context.newPage()
    await page.goto('/admin')
    await expect
      .poll(async () => (await context.cookies()).find((c) => c.name === 'payload-tenant')?.value)
      .toBe(String(tenant.id))
    await run(page)
  } finally {
    await context.close()
  }
}

/** The onboarding form's fields; `store` is optional. */
export interface OnboardingInput {
  name: string
  website: string
  store?: string
}

/**
 * Posts the onboarding form as the account holding `token` (anonymously
 * without one), fails the calling test unless the server answers 303, and
 * returns where it redirects: a path with its query.
 */
export async function onboard(
  request: APIRequestContext,
  token: string | undefined,
  input: OnboardingInput,
): Promise<string> {
  const response = await request.post('/onboarding/submit', {
    form: { store: '', ...input },
    headers: token ? { Authorization: `JWT ${token}` } : {},
    maxRedirects: 0,
  })
  expect(response.status(), `onboard ${input.name}`).toBe(303)
  return locationOf(response)
}

/** Waits for the real Turnstile widget to issue its token, then submits. */
export async function submitWithTurnstile(page: BrowserPage, button: string): Promise<void> {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 })
  await page.getByRole('button', { name: button }).click()
}

/** Where a form post redirected: the path with its query. */
const locationOf = (response: Awaited<ReturnType<APIRequestContext['post']>>): string => {
  const location = new URL(response.headers().location ?? '', BASE_URL)
  return `${location.pathname}${location.search}`
}

/**
 * Posts the signup form for `email` and fails the calling test unless it
 * answers "Check your inbox". The server has sent any email by then.
 */
export async function startSignup(request: APIRequestContext, email: string): Promise<void> {
  const response = await request.post('/signup/submit', {
    form: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    maxRedirects: 0,
  })
  expect(response.status(), `sign up ${email}`).toBe(303)
  expect(locationOf(response)).toBe('/signup?submitted=1')
}

/**
 * Posts the verify page's form: `password` for the account `token`
 * verifies. Returns where it redirects: `/onboarding` once verified (the
 * context then holds the session cookie), or back to `/verify/<token>`
 * when the link was used.
 */
export async function verifyAccount(request: APIRequestContext, token: string, password: string): Promise<string> {
  const response = await request.post('/verify/submit', {
    form: { password, token, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    maxRedirects: 0,
  })
  expect(response.status(), 'verify').toBe(303)
  return locationOf(response)
}

/**
 * `label` plus a random suffix the content filter passes. Raw hex can read as
 * leetspeak ("455" is flagged), and a flagged name holds the studio's games,
 * which then 404 for players.
 */
const cleanSlug = async (label: string): Promise<string> => {
  for (;;) {
    const slug = `${label}-${randomUUID().slice(0, 8)}`
    if (!(await screenText(slug)).flagged) return slug
  }
}

/** A fresh address for every account a test creates, so reruns and emails never collide. */
export const randomEmail = (label: string): string => `${label}-${randomUUID()}@e2e.test`

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

/**
 * A solid PNG `width` px wide (3:2). Payload only generates the image
 * sizes narrower than the upload, so tests of `sizes` need one wider than 300.
 */
export const pngOfWidth = (width: number): Promise<Buffer> =>
  sharp({ create: { width, height: Math.round((width * 2) / 3), channels: 3, background: '#00ccff' } })
    .png()
    .toBuffer()

/** Uploads a PNG (8×8 by default) to `tenant`'s media library and fails the calling test unless it's stored. */
export async function uploadImage(
  client: RestClient,
  tenant: number,
  name: string,
  alt = name,
  buffer: Buffer = PNG_8PX,
): Promise<Media> {
  const { status, body } = await client.upload('media', { name, mimeType: 'image/png', buffer }, { alt, tenant })
  expect(status, `upload ${name}: ${JSON.stringify(body)}`).toBe(201)
  return body.doc
}

/** Minimal Lexical rich-text value holding one paragraph. */
const lexicalRoot = (block: { type: string; [k: string]: unknown }): PatchNote['content'] => ({
  root: {
    type: 'root',
    children: [{ ...block, version: 1 }],
    direction: null,
    format: '',
    indent: 0,
    version: 1,
  },
})

const textNode = (text: string) => ({ type: 'text', text, version: 1 })

export const lexical = (text: string): PatchNote['content'] =>
  lexicalRoot({ type: 'paragraph', children: [textNode(text)] })

/** One h1, as an editor writes a marketing page's hero. */
export const lexicalHeading = (text: string): PatchNote['content'] =>
  lexicalRoot({ type: 'heading', tag: 'h1', children: [textNode(text)] })

/** A marketing page layout of one full-width Content block. */
export const contentLayout = (text: string): Page['layout'] => [
  { blockType: 'content', columns: [{ size: 'full', richText: lexical(text) }] },
]

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
 * Holds a game or an update as the content filter would, or releases it
 * (`held: false`), as the super admin does. Held content leaves the public site.
 */
export async function hold(
  superAdmin: RestClient,
  collection: 'game-projects' | 'patch-notes',
  id: number,
  held = true,
): Promise<void> {
  const data = held ? { flagged: true, flagReasons: 'Held by an E2E test.' } : { flagged: false }
  const { status, body } = await superAdmin.update(collection, id, data)
  expect(status, JSON.stringify(body)).toBe(200)
}

/**
 * Casts one player vote through the public endpoint. Each call uses a
 * fresh cookie jar, so each call is a different player.
 */
export async function castVote(
  playwright: PlaywrightWorkerArgs['playwright'],
  issueID: number,
): Promise<{ upvoteCount: number; voted: boolean }> {
  const player = await newRequestContext(playwright)
  try {
    const response = await player.post('/api/vote', { data: { issueId: issueID } })
    expect(response.status(), `vote on issue ${issueID}`).toBe(200)
    return (await response.json()) as { upvoteCount: number; voted: boolean }
  } finally {
    await player.dispose()
  }
}

/** The issue's stored counter and its vote rows, both read as super admin. */
export async function tally(superAdmin: RestClient, issueID: number) {
  const issue = await superAdmin.findByID('issues', issueID, { depth: 0 })
  const votes = await superAdmin.find('issue-votes', { where: { issue: { equals: issueID } }, limit: 1 })
  expect(issue.status).toBe(200)
  expect(votes.status).toBe(200)
  return { upvoteCount: issue.body.upvoteCount, rows: votes.body.totalDocs, updatedAt: issue.body.updatedAt }
}
