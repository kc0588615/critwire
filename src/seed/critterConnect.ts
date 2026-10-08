import config from '@payload-config'
import { getPayload } from 'payload'
import { extractID } from 'payload/shared'

import type { GameProject } from '../payload-types'

import {
  CRITTER_CONNECT_GAME,
  CRITTER_CONNECT_LOGO,
  gameChanges,
  gameFacts,
  gameUpdate,
  SAMPLE_CONTENT,
  SITE_STUDIO,
} from './critterConnectData'
import { ensureMedia } from './media'

/**
 * Content seed for Critter Connect: the site's studio and game, as on
 * critwire.com, plus sample feedback and a sample update for the demo
 * and the screenshots.
 *   pnpm seed:critter-connect
 *
 * Never run it against critwire.com once the content command has run:
 * it would put the samples back.
 *
 * The script entrypoint POSTs to /api/seed/critter-connect so collection
 * hooks that call revalidatePath() run inside a real Next.js request.
 * seedCritterConnect() itself uses Payload's privileged, hook-driven
 * Local API and is intended to run from that route.
 */

export async function seedCritterConnect() {
  const payload = await getPayload({ config })

  // The game lives in the site's own studio, never in whichever studio is newest.
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: SITE_STUDIO.slug } },
    limit: 1,
  })
  const existingProject = await payload.find({
    collection: 'game-projects',
    where: { slug: { equals: CRITTER_CONNECT_GAME.slug } },
    depth: 1,
    limit: 1,
  })
  let project = existingProject.docs[0] as GameProject | undefined
  const projectTenantID = project?.tenant ? extractID(project.tenant) : null
  // Checked before any write, so a refused run changes nothing.
  if (project && projectTenantID !== tenants.docs[0]?.id) {
    throw new Error(
      `The game "${CRITTER_CONNECT_GAME.slug}" belongs to another studio (tenant id: ${projectTenantID}); ` +
        `move or rename it before seeding it into "${SITE_STUDIO.slug}".`,
    )
  }

  const tenant = tenants.docs[0] ?? (await payload.create({ collection: 'tenants', data: SITE_STUDIO }))
  payload.logger.info(`Using tenant "${tenant.name}" (id: ${tenant.id})`)

  const logo = await ensureMedia(payload, {
    tenant: tenant.id,
    file: `public/brand/${CRITTER_CONNECT_LOGO.filename}`,
    alt: CRITTER_CONNECT_LOGO.alt,
  })
  const mediaID = (filename: string): number => {
    if (filename !== logo.filename) throw new Error(`The seed has no media named "${filename}".`)
    return logo.id
  }

  if (!project) {
    // Created bare, then given its facts by the same update a rerun makes.
    const created = await payload.create({
      collection: 'game-projects',
      data: { name: CRITTER_CONNECT_GAME.name, slug: CRITTER_CONNECT_GAME.slug, tenant: tenant.id },
    })
    payload.logger.info(`Created game project "${created.name}" (id: ${created.id})`)
    project = await payload.findByID({ collection: 'game-projects', id: created.id, depth: 1 })
  }

  const changes = gameChanges(gameFacts(project), CRITTER_CONNECT_GAME)
  if (changes.length > 0) {
    project = await payload.update({
      collection: 'game-projects',
      id: project.id,
      data: gameUpdate(changes, mediaID),
    })
    payload.logger.info(
      `Updated game project "${project.name}" (id: ${project.id}): ${changes.map((change) => change.path).join(', ')}`,
    )
  } else {
    payload.logger.info(`Game project "${project.name}" is up to date (id: ${project.id})`)
  }

  const patchNoteSeed = {
    ...SAMPLE_CONTENT.update,
    tenant: tenant.id,
    gameProject: project.id,
    publishedAt: new Date().toISOString(),
  }

  const existingPatchNote = await payload.find({
    collection: 'patch-notes',
    where: {
      and: [{ gameProject: { equals: project.id } }, { slug: { equals: SAMPLE_CONTENT.update.slug } }],
    },
    limit: 1,
  })

  let launchNote = existingPatchNote.docs[0]
  if (!launchNote) {
    launchNote = await payload.create({
      collection: 'patch-notes',
      data: patchNoteSeed,
      draft: false,
    })
    payload.logger.info(`Created patch note "${launchNote.title}" (id: ${launchNote.id})`)
  } else {
    launchNote = await payload.update({
      collection: 'patch-notes',
      id: launchNote.id,
      data: {
        ...patchNoteSeed,
        // Keep the original publish date stable once the launch note exists.
        publishedAt: launchNote.publishedAt ?? patchNoteSeed.publishedAt,
      },
      draft: false,
    })
    payload.logger.info('Launch patch note already exists; refreshed seeded fields.')
  }

  for (const item of SAMPLE_CONTENT.items) {
    const data = {
      ...item,
      tenant: tenant.id,
      gameProject: project.id,
      ...(item.slug === SAMPLE_CONTENT.fixedItemSlug ? { fixedInPatchNote: launchNote.id } : {}),
    }
    const existing = await payload.find({
      collection: 'issues',
      where: {
        and: [{ gameProject: { equals: project.id } }, { slug: { equals: item.slug } }],
      },
      limit: 1,
    })

    if (existing.docs.length === 0) {
      const issue = await payload.create({ collection: 'issues', data })
      payload.logger.info(`Created public issue "${issue.title}" (id: ${issue.id})`)
    } else {
      await payload.update({ collection: 'issues', id: existing.docs[0].id, data })
      payload.logger.info(`Public issue "${item.title}" already exists; refreshed seeded fields.`)
    }
  }

  const reportSeed = { ...SAMPLE_CONTENT.report, tenant: tenant.id, gameProject: project.id }

  const existingReport = await payload.find({
    collection: 'issue-reports',
    where: {
      and: [{ gameProject: { equals: project.id } }, { title: { equals: SAMPLE_CONTENT.report.title } }],
    },
    limit: 1,
  })

  if (existingReport.docs.length === 0) {
    const report = await payload.create({ collection: 'issue-reports', data: reportSeed })
    payload.logger.info(
      `Created player report "${report.title}" (id: ${report.id}) - awaiting triage`,
    )
  } else {
    const report = existingReport.docs[0]
    if (report.status === 'NEW' && !report.issue) {
      await payload.update({ collection: 'issue-reports', id: report.id, data: reportSeed })
      payload.logger.info('Sample player report already exists; refreshed seeded fields.')
    } else {
      payload.logger.info(
        'Sample player report already exists and has been triaged; leaving it as-is.',
      )
    }
  }

  payload.logger.info('Seed complete.')
  return { projectId: project.id }
}

async function runSeedRoute() {
  const { config: loadEnv } = await import('dotenv')
  loadEnv()

  const secret = process.env.CRON_SECRET
  if (!secret) {
    throw new Error('CRON_SECRET is required to call the Critter Connect seed route.')
  }

  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'
  const response = await fetch(new URL('/api/seed/critter-connect', baseURL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
    },
  })

  const body = await response.text()
  if (!response.ok) {
    throw new Error(`Seed route failed with ${response.status}: ${body}`)
  }

  console.log(body)
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSeedRoute()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
