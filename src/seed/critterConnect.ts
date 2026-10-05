import config from '@payload-config'
import fs from 'fs/promises'
import path from 'path'
import { getPayload, type RequiredDataFromCollectionSlug } from 'payload'
import { extractID } from 'payload/shared'

import type { GameProject, Media } from '../payload-types'

import { DEMO_GAME_SLUG } from '../components/marketing/links'
import { mergeTheme, type SiteThemeV1 } from '../lib/game-portal/theme'

/**
 * Content seed for the Critter Connect demo project.
 *   pnpm seed:critter-connect
 *
 * The script entrypoint POSTs to /api/seed/critter-connect so collection
 * hooks that call revalidatePath() run inside a real Next.js request.
 * seedCritterConnect() itself uses Payload's privileged, hook-driven
 * Local API and is intended to run from that route.
 */

const GAME_SLUG = DEMO_GAME_SLUG
const DEMO_TENANT = { name: 'Critwire Demo', slug: 'critwire-demo' } as const
const LAUNCH_PATCH_NOTE_SLUG = 'v0-1-0-launch'
const SAMPLE_ISSUE_SLUG = 'card-flicker-on-open'
const SAMPLE_REPORT_TITLE = 'Clue trail disappears after fast travel'

const CRITTER_CONNECT_THEME: SiteThemeV1 = {
  colors: {
    background: '#0f1f26',
    foreground: '#e6f1f0',
    mutedForeground: '#9ab5b8',
    surface: '#172b33',
    accent: '#f3b340',
    accentForeground: '#10191c',
    border: '#28444e',
    success: '#5bd49c',
    warning: '#ef8a50',
    error: '#ff6f7d',
  },
  typography: 'technical',
  shape: 'balanced',
  density: 'cinematic',
  motion: 'subtle',
}

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

export async function seedCritterConnect() {
  const payload = await getPayload({ config })

  // The demo lives in its own studio, never in whichever studio is newest.
  const tenants = await payload.find({
    collection: 'tenants',
    where: { slug: { equals: DEMO_TENANT.slug } },
    limit: 1,
  })
  const existingProject = await payload.find({
    collection: 'game-projects',
    where: { slug: { equals: GAME_SLUG } },
    depth: 0,
    limit: 1,
  })
  let project = existingProject.docs[0] as GameProject | undefined
  const projectTenantID = project?.tenant ? extractID(project.tenant) : null
  // Checked before any write, so a refused run changes nothing.
  if (project && projectTenantID !== tenants.docs[0]?.id) {
    throw new Error(
      `The game "${GAME_SLUG}" belongs to another studio (tenant id: ${projectTenantID}); ` +
        `move or rename it before seeding the demo into "${DEMO_TENANT.slug}".`,
    )
  }

  const tenant = tenants.docs[0] ?? (await payload.create({ collection: 'tenants', data: DEMO_TENANT }))
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
    theme: CRITTER_CONNECT_THEME,
    links: {
      steam: 'https://store.steampowered.com/',
    },
    availability: {
      releaseState: 'earlyAccess' as const,
      currentVersion: 'v0.1.0',
      platforms: [
        {
          platform: 'windows' as const,
          storeUrl: 'https://store.steampowered.com/',
          label: 'Early access',
        },
        {
          platform: 'steamDeck' as const,
          label: 'Playable',
        },
      ],
    },
    contact: {
      target: 'EMAIL' as const,
      email: 'hello@critterconnect.example',
    },
  }

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
      !project.banner ||
      extractID(project.banner) !== banner.id ||
      !project.logo ||
      extractID(project.logo) !== logo.id ||
      JSON.stringify(mergeTheme(project.theme)) !== JSON.stringify(mergeTheme(CRITTER_CONNECT_THEME)) ||
      project.links?.steam !== projectSeed.links.steam ||
      project.availability?.releaseState !== projectSeed.availability.releaseState ||
      project.availability?.currentVersion !== projectSeed.availability.currentVersion ||
      JSON.stringify(
        (project.availability?.platforms ?? []).map(({ label, platform, storeUrl }) => ({
          label: label ?? undefined,
          platform,
          storeUrl: storeUrl ?? undefined,
        })),
      ) !== JSON.stringify(projectSeed.availability.platforms) ||
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
    title: 'Field binder launch',
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

  /** Creates the public item with this slug, or refreshes its seeded fields. */
  const upsertIssue = async (
    seed: Omit<RequiredDataFromCollectionSlug<'issues'>, 'gameProject' | 'tenant'> & {
      slug: string
    },
  ) => {
    const data = { ...seed, tenant: tenant.id, gameProject: project.id, isPublic: true }
    const existing = await payload.find({
      collection: 'issues',
      where: {
        and: [{ gameProject: { equals: project.id } }, { slug: { equals: seed.slug } }],
      },
      limit: 1,
    })

    if (existing.docs.length === 0) {
      const issue = await payload.create({ collection: 'issues', data })
      payload.logger.info(`Created public issue "${issue.title}" (id: ${issue.id})`)
    } else {
      await payload.update({ collection: 'issues', id: existing.docs[0].id, data })
      payload.logger.info(`Public issue "${seed.title}" already exists; refreshed seeded fields.`)
    }
  }

  // One item per public stage, so the demo board and the launch update's
  // "From your feedback" have something to show.
  await upsertIssue({
    title: 'Discovery card flickers when opened quickly',
    slug: SAMPLE_ISSUE_SLUG,
    summary: 'Rapidly opening a new discovery card can show a one-frame flicker on some GPUs.',
    details: lexicalFromText(
      'Reported on a handful of Windows/Nvidia setups. Investigating whether this is a shader warm-up issue on first open per session.',
    ),
    type: 'BUG',
    category: 'VISUAL',
    status: 'REPORTED',
  })
  await upsertIssue({
    title: 'Sort the field binder by habitat',
    slug: 'sort-binder-by-habitat',
    summary: 'Let players group discovery cards by marsh, forest, ridge and coast.',
    type: 'IDEA',
    category: 'USER_INTERFACE',
    status: 'PLANNED',
  })
  await upsertIssue({
    title: 'Clue trail markers drift on the minimap',
    slug: 'clue-markers-drift',
    summary: 'Markers slide a few metres off their spot while the minimap rotates.',
    type: 'BUG',
    category: 'USER_INTERFACE',
    status: 'IN_PROGRESS',
  })
  await upsertIssue({
    title: 'Saving during a clue trail loses progress',
    slug: 'save-loses-clue-progress',
    summary: 'Quitting mid-trail reset the trail to its first clue.',
    type: 'BUG',
    category: 'GAMEPLAY',
    status: 'FIXED',
    fixedInPatchNote: launchNote.id,
  })

  const reportSeed = {
    tenant: tenant.id,
    gameProject: project.id,
    title: SAMPLE_REPORT_TITLE,
    description:
      'Fast-traveled from the marsh camp to the ridge outpost and the active clue trail marker was gone from the map. Had to reopen the discovery card to get it back.',
    type: 'BUG',
    category: 'GAMEPLAY',
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
