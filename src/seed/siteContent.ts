import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

import { type PostgresAdapter, sql } from '@payloadcms/db-postgres'
import { getPayload, type Payload, type PayloadRequest, type Where } from 'payload'
import { loadEnv } from 'payload/node'

import type { GameProject, Issue, PatchNote, Tenant } from '../payload-types'

import { withTransaction } from '../lib/payload/withTransaction'
import {
  CRITTER_CONNECT_GAME,
  CRITTER_CONNECT_LOGO,
  FIRST_UPDATE,
  type GameChange,
  gameChanges,
  gameFacts,
  gameUpdate,
  SAMPLE_CONTENT,
  SAMPLE_DEFAULTS,
  SITE_STUDIO,
} from './critterConnectData'
import { ensureMedia } from './media'

/**
 * The one-off content command: turns critwire.com's demo data into
 * Critter Connect's real site. The studio becomes Haunted Pavement, the
 * game takes its real facts, the seed's six samples go, and a draft
 * first update is left for the studio to edit and publish.
 *
 *   pnpm content:critter-connect                  # dry run: prints the plan and its ID
 *   pnpm content:critter-connect --apply <plan>   # makes exactly that plan's changes
 *
 * It refuses, writing nothing, on anything it can't prove: a sample that
 * differs from what the seed wrote, something else pointing at a sample,
 * or a game or studio it doesn't expect. It reads `.env` from the working
 * directory, so on the live server it works on critwire_live; its first
 * line names the database. Run the app's restart afterwards: revalidation
 * is skipped, as it only works inside a Next request.
 */

const STUDIO_SLUGS: readonly string[] = ['critwire-demo', SITE_STUDIO.slug]

/** Every write: no revalidation outside Next, and refuse a document someone has open in the admin. */
const WRITE = { context: { disableRevalidate: true }, overrideLock: false } as const

/**
 * Fields that change without anyone editing a sample, so they aren't
 * compared. Everything else must equal what the seed wrote.
 */
const VOLATILE = new Set([
  'id', // the database's
  'createdAt', // the seed's clock
  'updatedAt', // the seed's clock, and a seed rerun's; it goes into the plan ID instead
  'publishedAt', // the seed's clock
  '_order', // the kanban position, which moves when cards are dragged
  'generateSlug', // Payload's slug bookkeeping
  'upvoteCount', // the votes, counted from issue-votes instead
])

export interface SiteContentPlan {
  /** The changes, one line each, as the dry run prints them. */
  lines: string[]
  /** Why nothing may be written, one line each. */
  refusals: string[]
  /** Binds the lines to the rows they were read from; null when there's nothing to apply. */
  id: null | string
  studio: null | { id: number; data: Partial<Pick<Tenant, 'name' | 'slug'>> }
  game: null | { id: number; changes: GameChange[] }
  /** In the order they're deleted: the report, the items (which point at the update), the update. */
  deletes: { reportIDs: number[]; itemIDs: number[]; updateIDs: number[] }
  createFirstUpdate: boolean
}

/** A required relation's ID, populated or not. */
const idOf = (value: null | number | { id: number } | undefined): number => {
  if (value == null) throw new Error('A required relation is empty.')
  return typeof value === 'number' ? value : value.id
}

const quote = (value: unknown): string => JSON.stringify(value) ?? 'null'
const votes = (count: number): string => `${count} ${count === 1 ? 'vote' : 'votes'}`

/** The keys whose values differ, a key on only one side included. */
const differences = (actual: object, expected: object): string[] => {
  const a = actual as Record<string, unknown>
  const e = expected as Record<string, unknown>
  return [...new Set([...Object.keys(a), ...Object.keys(e)])]
    .filter((key) => !VOLATILE.has(key))
    .filter((key) => !(key in a && key in e && isDeepStrictEqual(a[key], e[key])))
    .sort()
}

/**
 * What the dry run prints and `--apply` makes true. Reads only. A refusal
 * lists every problem found, not just the first.
 */
export async function planSiteContent(
  payload: Payload,
  req?: PayloadRequest,
): Promise<SiteContentPlan> {
  const plan: SiteContentPlan = {
    lines: [],
    refusals: [],
    id: null,
    studio: null,
    game: null,
    deletes: { reportIDs: [], itemIDs: [], updateIDs: [] },
    createFirstUpdate: false,
  }
  const read = { req, depth: 0, pagination: false, overrideAccess: true } as const

  // The studio and the game.
  const games = await payload.find({
    ...read,
    collection: 'game-projects',
    depth: 1,
    where: { slug: { equals: CRITTER_CONNECT_GAME.slug } },
  })
  const game = games.docs[0] as GameProject | undefined
  if (!game) {
    plan.refusals.push(`Refused: no game has the slug ${CRITTER_CONNECT_GAME.slug}.`)
    return plan
  }
  const studio = await payload.findByID({ ...read, collection: 'tenants', id: idOf(game.tenant) })
  if (!STUDIO_SLUGS.includes(studio.slug)) {
    plan.refusals.push(
      `Refused: game ${game.id} ${game.slug} belongs to studio ${studio.id} ${studio.slug}, not ${STUDIO_SLUGS.join(' or ')}.`,
    )
  }
  const clashes = await payload.find({
    ...read,
    collection: 'tenants',
    where: { and: [{ slug: { equals: SITE_STUDIO.slug } }, { id: { not_equals: studio.id } }] },
  })
  for (const other of clashes.docs) {
    plan.refusals.push(
      `Refused: studio ${other.id} "${other.name}" already has the slug ${SITE_STUDIO.slug}.`,
    )
  }

  const studioData: Partial<Pick<Tenant, 'name' | 'slug'>> = {}
  for (const key of ['name', 'slug'] as const) {
    if (studio[key] !== SITE_STUDIO[key]) {
      studioData[key] = SITE_STUDIO[key]
      plan.lines.push(
        `Studio ${studio.id}: ${key} ${quote(studio[key])} → ${quote(SITE_STUDIO[key])}`,
      )
    }
  }
  if (Object.keys(studioData).length > 0) plan.studio = { id: studio.id, data: studioData }

  const changes = gameChanges(gameFacts(game), CRITTER_CONNECT_GAME)
  for (const { path, before, after } of changes) {
    plan.lines.push(`Game ${game.id} ${game.slug}: ${path} ${quote(before)} → ${quote(after)}`)
  }
  if (changes.length > 0) plan.game = { id: game.id, changes }

  // The samples: each one's single candidate in the game, by its key.
  const inGame: Where[] = [{ tenant: { equals: studio.id } }, { gameProject: { equals: game.id } }]
  const single = <T extends { id: number }>(docs: T[], what: string): T | undefined => {
    if (docs.length > 1) {
      plan.refusals.push(
        `Refused: ${docs.length} ${what}, so none is provably the seed's sample: ${docs
          .map((doc) => doc.id)
          .sort((a, b) => a - b)
          .join(', ')}.`,
      )
      return undefined
    }
    return docs[0]
  }

  const updates = await payload.find({
    ...read,
    collection: 'patch-notes',
    where: { and: [...inGame, { slug: { equals: SAMPLE_CONTENT.update.slug } }] },
  })
  const update = single(
    updates.docs,
    `updates have the sample's slug ${SAMPLE_CONTENT.update.slug}`,
  )
  // Present only while it exists, so the fixed item's link is expected only then.
  const updateID = update?.id ?? null

  const items: { doc: Issue; votes: number }[] = []
  for (const sample of SAMPLE_CONTENT.items) {
    const found = await payload.find({
      ...read,
      collection: 'issues',
      where: { and: [...inGame, { slug: { equals: sample.slug } }] },
    })
    const doc = single(found.docs, `feedback items have the sample's slug ${sample.slug}`)
    if (!doc) continue
    const expected = {
      ...SAMPLE_DEFAULTS.items,
      ...sample,
      tenant: studio.id,
      gameProject: game.id,
      fixedInPatchNote: sample.slug === SAMPLE_CONTENT.fixedItemSlug ? updateID : null,
    }
    const differ = differences(doc, expected)
    if (differ.length > 0) {
      plan.refusals.push(
        `Refused: feedback item ${doc.id} ${doc.slug} differs from the seed's sample in: ${differ.join(', ')}`,
      )
      continue
    }
    const count = await payload.count({
      req,
      collection: 'issue-votes',
      where: { issue: { equals: doc.id } },
    })
    items.push({ doc, votes: count.totalDocs })
  }

  const reports = await payload.find({
    ...read,
    collection: 'issue-reports',
    where: { and: [...inGame, { title: { equals: SAMPLE_CONTENT.report.title } }] },
  })
  let report = single(
    reports.docs,
    `feedback reports have the sample's title "${SAMPLE_CONTENT.report.title}"`,
  )
  if (report) {
    const expected = {
      ...SAMPLE_DEFAULTS.report,
      ...SAMPLE_CONTENT.report,
      tenant: studio.id,
      gameProject: game.id,
    }
    const differ = differences(report, expected)
    if (differ.length > 0) {
      plan.refusals.push(
        `Refused: feedback report ${report.id} "${report.title}" differs from the seed's sample in: ${differ.join(', ')}`,
      )
      report = undefined
    }
  }

  let sampleUpdate: PatchNote | undefined
  if (update) {
    const expected = {
      ...SAMPLE_DEFAULTS.update,
      ...SAMPLE_CONTENT.update,
      tenant: studio.id,
      gameProject: game.id,
    }
    // Its latest version too, so an edit saved but not yet published counts.
    const latest = await payload.findByID({
      ...read,
      collection: 'patch-notes',
      id: update.id,
      draft: true,
    })
    const differ = [
      ...differences(update, expected),
      ...differences(latest, expected).map((key) => `${key} (latest version)`),
    ]
    if (differ.length > 0) {
      plan.refusals.push(
        `Refused: update ${update.id} ${update.slug} differs from the seed's sample in: ${differ.join(', ')}`,
      )
    } else {
      sampleUpdate = update
    }
  }

  // What may point at a sample: its votes (deleted with it) and the fixed
  // item's link to the update. Anything else is someone's work.
  const itemIDs = items.map(({ doc }) => doc.id)
  const slugOf = new Map(items.map(({ doc }) => [doc.id, doc.slug]))
  if (itemIDs.length > 0) {
    const linked = await payload.find({
      ...read,
      collection: 'issue-reports',
      where: { issue: { in: itemIDs } },
    })
    for (const other of linked.docs) {
      plan.refusals.push(
        `Refused: feedback report ${other.id} "${other.title}" is linked to the sample item ${slugOf.get(idOf(other.issue!))}.`,
      )
    }
  }
  if (sampleUpdate) {
    const shipped = await payload.find({
      ...read,
      collection: 'issues',
      where: {
        and: [
          { fixedInPatchNote: { equals: sampleUpdate.id } },
          ...(itemIDs.length > 0 ? [{ id: { not_in: itemIDs } }] : []),
        ],
      },
    })
    for (const other of shipped.docs) {
      plan.refusals.push(
        `Refused: feedback item ${other.id} ${other.slug} is shipped in the sample update ${sampleUpdate.slug}.`,
      )
    }
  }
  if (itemIDs.length > 0 || sampleUpdate) {
    const posts = await payload.find({
      ...read,
      collection: 'discord-posts',
      where: {
        or: [
          { issue: { in: itemIDs } },
          ...(sampleUpdate ? [{ patchNote: { equals: sampleUpdate.id } }] : []),
        ],
      },
    })
    for (const post of posts.docs) {
      const target =
        post.issue != null
          ? `the sample item ${slugOf.get(idOf(post.issue))}`
          : `the sample update ${sampleUpdate?.slug}`
      plan.refusals.push(`Refused: Discord post ${post.id} points at ${target}.`)
    }
  }

  if (report) {
    plan.deletes.reportIDs.push(report.id)
    plan.lines.push(
      `Delete feedback report ${report.id} "${report.title}" (the seed's sample exactly)`,
    )
  }
  for (const { doc, votes: count } of items) {
    plan.deletes.itemIDs.push(doc.id)
    plan.lines.push(
      `Delete feedback item ${doc.id} ${doc.slug} "${doc.title}" (the seed's sample exactly; ${votes(count)})`,
    )
  }
  if (sampleUpdate) {
    plan.deletes.updateIDs.push(sampleUpdate.id)
    plan.lines.push(
      `Delete update ${sampleUpdate.id} ${sampleUpdate.slug} "${sampleUpdate.title}" (the seed's sample exactly)`,
    )
  }

  const first = await payload.count({
    req,
    collection: 'patch-notes',
    where: { and: [...inGame, { slug: { equals: FIRST_UPDATE.slug } }] },
  })
  if (first.totalDocs === 0) {
    plan.createFirstUpdate = true
    plan.lines.push(`Create draft update ${FIRST_UPDATE.slug} "${FIRST_UPDATE.title}"`)
  }

  if (plan.refusals.length === 0 && plan.lines.length > 0) {
    const stamps = [studio, game, report, ...items.map(({ doc }) => doc), sampleUpdate]
      .filter((doc) => doc !== undefined)
      .map((doc) => doc.updatedAt)
    plan.id = createHash('sha256')
      .update([...plan.lines, ...stamps].join('\n'))
      .digest('hex')
      .slice(0, 12)
  }
  return plan
}

/**
 * Takes row locks, until the transaction ends, on the game, its studio
 * and every row a plan may touch, in a fixed order. Edits, deletes, and
 * inserts that reference them (votes, linked reports, versions) wait.
 */
export async function lockSiteContent(payload: Payload, req: PayloadRequest): Promise<void> {
  const db = (payload.db as unknown as PostgresAdapter).sessions[await req.transactionID!]?.db
  if (!db) throw new Error('lockSiteContent needs a req inside a transaction (withTransaction).')

  const games = await db.execute<{ id: number; tenant_id: number }>(
    sql`select id, tenant_id from game_projects where slug = ${CRITTER_CONNECT_GAME.slug} for update`,
  )
  for (const { id: gameID, tenant_id: tenantID } of games.rows) {
    const inGame = sql`tenant_id = ${tenantID} and game_project_id = ${gameID}`
    const list = (values: string[]) =>
      sql.join(
        values.map((value) => sql`${value}`),
        sql`, `,
      )
    await db.execute(sql`select id from tenants where id = ${tenantID} for update`)
    await db.execute(
      sql`select id from issues where ${inGame} and slug in (${list(SAMPLE_CONTENT.items.map((item) => item.slug))}) order by id for update`,
    )
    await db.execute(
      sql`select id from patch_notes where ${inGame} and slug in (${list([SAMPLE_CONTENT.update.slug, FIRST_UPDATE.slug])}) order by id for update`,
    )
    await db.execute(
      sql`select id from issue_reports where ${inGame} and title = ${SAMPLE_CONTENT.report.title} order by id for update`,
    )
  }
}

/** Makes `plan` true. Its logo must already be in the studio's media (`ensureMedia`). */
export async function applySiteContent(
  payload: Payload,
  plan: SiteContentPlan,
  req: PayloadRequest,
): Promise<void> {
  if (plan.studio) {
    await payload.update({
      ...WRITE,
      req,
      collection: 'tenants',
      id: plan.studio.id,
      data: plan.studio.data,
    })
  }
  if (plan.game) {
    const game = plan.game
    const studioID = idOf(
      (await payload.findByID({ req, collection: 'game-projects', id: game.id, depth: 0 })).tenant,
    )
    const media = await payload.find({
      req,
      collection: 'media',
      depth: 0,
      pagination: false,
      where: { tenant: { equals: studioID } },
    })
    const mediaID = (filename: string): number => {
      const found = media.docs.find((doc) => doc.filename === filename)
      if (!found) throw new Error(`The studio has no media named "${filename}"; upload it first.`)
      return found.id
    }
    await payload.update({
      ...WRITE,
      req,
      collection: 'game-projects',
      id: game.id,
      data: gameUpdate(game.changes, mediaID),
    })
  }
  for (const id of plan.deletes.reportIDs)
    await payload.delete({ ...WRITE, req, collection: 'issue-reports', id })
  // Each item's votes go with it, through Issues' `deleteIssueVotes` hook on this req.
  for (const id of plan.deletes.itemIDs)
    await payload.delete({ ...WRITE, req, collection: 'issues', id })
  for (const id of plan.deletes.updateIDs)
    await payload.delete({ ...WRITE, req, collection: 'patch-notes', id })
  if (plan.createFirstUpdate) {
    const game = await payload.find({
      req,
      collection: 'game-projects',
      depth: 0,
      limit: 1,
      where: { slug: { equals: CRITTER_CONNECT_GAME.slug } },
    })
    const { id, tenant } = game.docs[0]
    await payload.create({
      req,
      context: WRITE.context,
      collection: 'patch-notes',
      draft: true,
      data: { ...FIRST_UPDATE, tenant: idOf(tenant), gameProject: id },
    })
  }
}

type Mode = { apply: false } | { apply: true; planID: string }

/** The command's arguments: none for a dry run, or `--apply <plan-id>`. Anything else throws. */
export const parseArgs = (args: string[]): Mode => {
  if (args.length === 0) return { apply: false }
  if (args.length === 2 && args[0] === '--apply' && /^[0-9a-f]{12}$/.test(args[1])) {
    return { apply: true, planID: args[1] }
  }
  throw new Error(
    `Usage: pnpm content:critter-connect [--apply <plan-id>], where the plan ID is the dry run's 12 hex digits. Got: ${args.join(' ')}`,
  )
}

/** The database's name and host, never its credentials. */
const databaseName = (url: string | undefined): string => {
  if (!url) throw new Error('DATABASE_URL is not set.')
  const { hostname, port, pathname } = new URL(url)
  return `${decodeURIComponent(pathname.slice(1))} on ${hostname}:${port || 5432}`
}

/** An error's message and its causes' (a database error is the cause of Drizzle's "Failed query"). */
const describe = (error: unknown): string =>
  error instanceof Error
    ? [error.message.replace(/\s+/g, ' '), ...(error.cause ? [describe(error.cause)] : [])].join(
        ': ',
      )
    : String(error)

const print = (lines: string[]) => lines.forEach((line) => console.log(line))

/** Prints the plan, and applies it when asked; resolves to the exit code. */
async function run(payload: Payload, mode: Mode): Promise<number> {
  const plan = await planSiteContent(payload)
  if (plan.refusals.length > 0) {
    print([...plan.refusals, 'Nothing written.'])
    return 1
  }
  print(plan.lines)
  if (plan.id === null) {
    console.log('Nothing to change.')
    return 0
  }
  if (!mode.apply) {
    print([
      `Plan ${plan.id}. Dry run: nothing written.`,
      `Run with --apply ${plan.id} to make exactly these changes.`,
    ])
    return 0
  }
  if (plan.id !== mode.planID) {
    print([
      `Refused: the plan is now ${plan.id}, not ${mode.planID}: the data changed since that dry run. Read the plan above, then apply it by its ID.`,
      'Nothing written.',
    ])
    return 1
  }

  // Before the transaction: a rollback can't remove a written file. A
  // failed apply leaves it unused, and a retry reuses it.
  if (plan.game?.changes.some((change) => change.after === CRITTER_CONNECT_LOGO.filename)) {
    const studio = (
      await payload.findByID({ collection: 'game-projects', id: plan.game.id, depth: 0 })
    ).tenant
    await ensureMedia(payload, {
      tenant: idOf(studio),
      file: `public/brand/${CRITTER_CONNECT_LOGO.filename}`,
      alt: CRITTER_CONNECT_LOGO.alt,
    })
  }

  try {
    await withTransaction(payload, async (req) => {
      await lockSiteContent(payload, req)
      const locked = await planSiteContent(payload, req)
      if (locked.id !== mode.planID) {
        throw new Error(
          `The data changed before the locks were taken: the plan is now ${locked.id ?? 'none'}.`,
        )
      }
      await applySiteContent(payload, locked, req)
    })
  } catch (error) {
    print([
      `Failed: ${describe(error)}`,
      `Rolled back: the studio, the game, the feedback and the updates are unchanged. ${CRITTER_CONNECT_LOGO.filename} may stay in the studio's media, unused.`,
      "Run the dry run again, then --apply its plan ID (the upload is reused), or delete that image in the admin's Media to abandon the change.",
    ])
    return 1
  }
  console.log(`Applied plan ${plan.id}. Restart the app so its pages show the change.`)
  return 0
}

async function main(mode: Mode): Promise<number> {
  // Content only, never the schema: in production Payload applies pending
  // migrations on boot, and outside it pushes the dev schema unless it's
  // migrating (Payload's own `migrate` sets the flag this sets).
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Run without NODE_ENV=production: Payload would apply pending migrations on boot.',
    )
  }
  loadEnv()
  process.env.PAYLOAD_MIGRATING = 'true'
  process.env.DISABLE_PAYLOAD_HMR = 'true'
  console.log(`Database: ${databaseName(process.env.DATABASE_URL)}`)

  const { default: config } = await import('@payload-config')
  const payload = await getPayload({ config })
  try {
    return await run(payload, mode)
  } finally {
    await payload.destroy()
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  let mode: Mode
  try {
    mode = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(describe(error))
    process.exit(1)
  }
  main(mode)
    .then((code) => process.exit(code))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
