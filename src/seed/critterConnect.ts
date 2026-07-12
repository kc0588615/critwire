import config from '@payload-config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload } from 'payload'

import type { GameProject, Media } from '../payload-types'

/**
 * Content seed for the Critter Connect demo project.
 *   pnpm seed:critter-connect
 *
 * The script entrypoint POSTs to /api/seed/critter-connect so collection
 * hooks that call revalidatePath() run inside a real Next.js request.
 * seedCritterConnect() itself uses Payload's privileged, hook-driven
 * Local API and is intended to run from that route.
 */

const GAME_SLUG = 'critter-connect'
const LAUNCH_PATCH_NOTE_SLUG = 'v0-1-0-launch'
const SAMPLE_ISSUE_SLUG = 'card-flicker-on-open'
const SAMPLE_REPORT_TITLE = 'Clue trail disappears after fast travel'

const lexicalFromText = (text: string) => ({
  root: {
    type: 'root',
    children: [
      {
        type: 'paragraph',
        children: [{ type: 'text', text, version: 1 }],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        version: 1,
      },
    ],
    direction: 'ltr' as const,
    format: '' as const,
    indent: 0,
    version: 1,
  },
})

const idOf = (value: number | { id: number } | null | undefined) =>
  typeof value === 'object' && value !== null ? value.id : value

export async function seedCritterConnect() {
  const payload = await getPayload({ config })

  const tenants = await payload.find({ collection: 'tenants', limit: 1 })
  const tenant = tenants.docs[0]
  if (!tenant) {
    throw new Error('No tenant found - create one in the admin UI first.')
  }
  payload.logger.info(`Using tenant "${tenant.name}" (id: ${tenant.id})`)

  const ensureMedia = async (filename: string, alt: string): Promise<Media> => {
    const existing = await payload.find({
      collection: 'media',
      where: {
        and: [{ filename: { equals: filename } }, { tenant: { equals: tenant.id } }],
      },
      limit: 1,
    })

    if (existing.docs[0]) {
      const media = existing.docs[0]
      if (media.alt !== alt) {
        return payload.update({
          collection: 'media',
          id: media.id,
          data: { alt },
        })
      }
      return media
    }

    const filePath = path.resolve('public/critter-connect', filename)
    const buffer = await fs.readFile(filePath)
    return payload.create({
      collection: 'media',
      data: { alt, tenant: tenant.id },
      file: {
        data: buffer,
        mimetype: 'image/png',
        name: filename,
        size: buffer.length,
      },
    })
  }

  const [banner, logo] = await Promise.all([
    ensureMedia('field-binder-hero.png', 'Critter Connect field binder hero art'),
    ensureMedia(
      'discovery-card.png',
      'A glowing Critter Connect discovery card with clue slots and a species portrait',
    ),
  ])

  const projectSeed = {
    tenant: tenant.id,
    name: 'Critter Connect',
    slug: GAME_SLUG,
    description:
      'Build a field binder of hard-won discoveries. Follow real places, unlock clue trails, and turn player reports into better expeditions.',
    banner: banner.id,
    logo: logo.id,
    accentColor: '#22d3ee',
    links: {
      steam: 'https://store.steampowered.com/',
    },
    contact: {
      target: 'EMAIL',
      email: 'hello@critterconnect.example',
    },
  } as const

  const existingProject = await payload.find({
    collection: 'game-projects',
    where: { slug: { equals: GAME_SLUG } },
    limit: 1,
  })

  let project = existingProject.docs[0] as GameProject | undefined
  if (!project) {
    project = await payload.create({
      collection: 'game-projects',
      data: projectSeed,
    })
    payload.logger.info(`Created game project "${project.name}" (id: ${project.id})`)
  } else {
    const needsUpdate =
      project.name !== projectSeed.name ||
      project.description !== projectSeed.description ||
      idOf(project.banner) !== banner.id ||
      idOf(project.logo) !== logo.id ||
      project.accentColor !== projectSeed.accentColor ||
      project.links?.steam !== projectSeed.links.steam ||
      project.contact?.target !== projectSeed.contact.target ||
      project.contact?.email !== projectSeed.contact.email

    if (needsUpdate) {
      project = await payload.update({
        collection: 'game-projects',
        id: project.id,
        data: projectSeed,
      })
      payload.logger.info(`Updated game project "${project.name}" (id: ${project.id})`)
    } else {
      payload.logger.info(`Game project "${project.name}" already exists (id: ${project.id})`)
    }
  }

  const patchNoteSeed = {
    tenant: tenant.id,
    gameProject: project.id,
    title: 'v0.1.0 - Field Binder Launch',
    slug: LAUNCH_PATCH_NOTE_SLUG,
    versionLabel: 'v0.1.0',
    summary: 'The field binder ships with discovery cards, clue trails, and the report tool.',
    content: lexicalFromText(
      'Critter Connect is live. Every discovery now earns a card in your field binder - classification, habitat, geography, and conservation notes all fill in as you play. Send field reports straight from the game or this site.',
    ),
    publishedAt: new Date().toISOString(),
    _status: 'published',
  } as const

  const existingPatchNote = await payload.find({
    collection: 'patch-notes',
    where: {
      and: [{ gameProject: { equals: project.id } }, { slug: { equals: LAUNCH_PATCH_NOTE_SLUG } }],
    },
    limit: 1,
  })

  if (existingPatchNote.docs.length === 0) {
    const note = await payload.create({
      collection: 'patch-notes',
      data: patchNoteSeed,
      draft: false,
    })
    payload.logger.info(`Created patch note "${note.title}" (id: ${note.id})`)
  } else {
    const note = existingPatchNote.docs[0]
    await payload.update({
      collection: 'patch-notes',
      id: note.id,
      data: {
        ...patchNoteSeed,
        // Keep the original publish date stable once the launch note exists.
        publishedAt: note.publishedAt ?? patchNoteSeed.publishedAt,
      },
      draft: false,
    })
    payload.logger.info('Launch patch note already exists; refreshed seeded fields.')
  }

  const issueSeed = {
    tenant: tenant.id,
    gameProject: project.id,
    title: 'Discovery card flickers when opened quickly',
    slug: SAMPLE_ISSUE_SLUG,
    summary: 'Rapidly opening a new discovery card can show a one-frame flicker on some GPUs.',
    details: lexicalFromText(
      'Reported on a handful of Windows/Nvidia setups. Investigating whether this is a shader warm-up issue on first open per session.',
    ),
    category: 'VISUAL',
    status: 'REPORTED',
    isPublic: true,
  } as const

  const existingIssue = await payload.find({
    collection: 'issues',
    where: {
      and: [{ gameProject: { equals: project.id } }, { slug: { equals: SAMPLE_ISSUE_SLUG } }],
    },
    limit: 1,
  })

  if (existingIssue.docs.length === 0) {
    const issue = await payload.create({
      collection: 'issues',
      data: issueSeed,
    })
    payload.logger.info(`Created public issue "${issue.title}" (id: ${issue.id})`)
  } else {
    await payload.update({
      collection: 'issues',
      id: existingIssue.docs[0].id,
      data: issueSeed,
    })
    payload.logger.info('Sample public issue already exists; refreshed seeded fields.')
  }

  const reportSeed = {
    tenant: tenant.id,
    gameProject: project.id,
    title: SAMPLE_REPORT_TITLE,
    description:
      'Fast-traveled from the marsh camp to the ridge outpost and the active clue trail marker was gone from the map. Had to reopen the discovery card to get it back.',
    category: 'GAMEPLAY',
    submitterEmail: 'player@example.com',
    platform: 'Steam Deck',
    gameVersion: 'v0.1.0',
  } as const

  const existingReport = await payload.find({
    collection: 'issue-reports',
    where: {
      and: [{ gameProject: { equals: project.id } }, { title: { equals: SAMPLE_REPORT_TITLE } }],
    },
    limit: 1,
  })

  if (existingReport.docs.length === 0) {
    const report = await payload.create({
      collection: 'issue-reports',
      data: {
        ...reportSeed,
        status: 'NEW',
      },
    })
    payload.logger.info(
      `Created player report "${report.title}" (id: ${report.id}) - awaiting triage`,
    )
  } else {
    const report = existingReport.docs[0]
    if (report.status === 'NEW' && !report.issue) {
      await payload.update({
        collection: 'issue-reports',
        id: report.id,
        data: {
          ...reportSeed,
          status: 'NEW',
        },
      })
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
