import type { GamePage, GameProject, Media, User } from '@/payload-types'
import type { Payload } from 'payload'
import { extractID } from 'payload/shared'

import { resolveSiteAction } from '@/site-templates/flagship-game-v1/actions'
import { flagshipSlots, SLOT_ORDER } from '@/site-templates/flagship-game-v1/registry'
import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'
import { SITE_ACTION_REFS } from '@/site-templates/flagship-game-v1/schema/refs'

import { collectSiteMediaRefs } from './media'
import type { SiteGenerationContext } from './types'

const LINK_KEYS = [
  'website',
  'steam',
  'epic',
  'itch',
  'discord',
  'support',
  'docs',
  'merch',
  'playstation',
  'xbox',
  'nintendo',
  'gog',
  'youtube',
  'pressKit',
  'privacy',
  'terms',
  'trailer',
] as const

const mediaContext = (media: Media, selected: ReadonlySet<number>) => ({
  alt: media.alt ?? null,
  filename: media.filename ?? null,
  height: media.height ?? null,
  id: media.id,
  selected: selected.has(media.id),
  width: media.width ?? null,
})

/**
 * Builds the only object that may leave Critwire for site generation.
 * It is deliberately constructed field-by-field: contact.*, reportForm.*, tenant
 * membership, player reports, webhooks, and unpublished operations cannot enter it.
 */
export const buildSiteGenerationContext = async ({
  currentConfig,
  page,
  payload,
  project,
  user,
}: {
  currentConfig: SiteConfigV1
  page: GamePage
  payload: Payload
  project: GameProject
  user: User
}): Promise<SiteGenerationContext> => {
  const tenant = page.tenant ?? project.tenant
  if (tenant == null) throw new Error('Game page has no tenant.')
  const tenantID = extractID(tenant)

  const selectedMedia = new Set(collectSiteMediaRefs(currentConfig))

  const [mediaResult, latestPatchResult, totalIssues, activeIssues, pinnedIssues] =
    await Promise.all([
      payload.find({
        collection: 'media',
        depth: 0,
        limit: 200,
        overrideAccess: false,
        pagination: false,
        sort: '-createdAt',
        user,
        where: { tenant: { equals: tenantID } },
      }),
      payload.find({
        collection: 'patch-notes',
        depth: 0,
        limit: 1,
        overrideAccess: false,
        pagination: false,
        sort: '-publishedAt',
        user,
        where: {
          and: [{ gameProject: { equals: project.id } }, { _status: { equals: 'published' } }],
        },
      }),
      payload.count({
        collection: 'issues',
        overrideAccess: false,
        user,
        where: { and: [{ gameProject: { equals: project.id } }, { isPublic: { equals: true } }] },
      }),
      payload.count({
        collection: 'issues',
        overrideAccess: false,
        user,
        where: {
          and: [
            { gameProject: { equals: project.id } },
            { isPublic: { equals: true } },
            { status: { not_in: ['FIXED', 'CLOSED'] } },
          ],
        },
      }),
      payload.count({
        collection: 'issues',
        overrideAccess: false,
        user,
        where: {
          and: [
            { gameProject: { equals: project.id } },
            { isPublic: { equals: true } },
            { isPinned: { equals: true } },
          ],
        },
      }),
    ])

  // Always include already-selected assets even when the tenant has more
  // than the recent-media cap, otherwise a theme-only edit could reject a
  // valid unchanged media reference.
  const selectedMediaResult =
    selectedMedia.size > 0
      ? await payload.find({
          collection: 'media',
          depth: 0,
          limit: selectedMedia.size,
          overrideAccess: false,
          pagination: false,
          user,
          where: {
            and: [{ tenant: { equals: tenantID } }, { id: { in: [...selectedMedia] } }],
          },
        })
      : null

  const availableMedia = new Map<number, Media>()
  for (const media of [...mediaResult.docs, ...(selectedMediaResult?.docs ?? [])]) {
    availableMedia.set(media.id, media)
  }

  const latest = latestPatchResult.docs[0]
  const linksAvailable = LINK_KEYS.filter((key) => Boolean(project.links?.[key]))

  return {
    allowedActionRefs: SITE_ACTION_REFS.filter((ref) =>
      Boolean(resolveSiteAction({ label: null, ref }, project)),
    ),
    currentConfig,
    media: [...availableMedia.values()].map((media) => mediaContext(media, selectedMedia)),
    project: {
      accentColor: project.accentColor ?? null,
      availability: {
        currentVersion: project.availability?.currentVersion ?? null,
        releaseDate: project.availability?.releaseDate ?? null,
        releaseState: project.availability?.releaseState ?? null,
        platforms: (project.availability?.platforms ?? []).map((platform) => ({
          hasStoreUrl: Boolean(platform.storeUrl),
          label: platform.label ?? null,
          platform: platform.platform,
        })),
      },
      description: project.description ?? null,
      linksAvailable,
      meta: {
        developer: project.meta?.developer ?? null,
        engine: project.meta?.engine ?? null,
        publisher: project.meta?.publisher ?? null,
        rating: project.meta?.rating ?? null,
      },
      name: project.name,
      slug: project.slug,
    },
    publicOperations: {
      issues: {
        active: activeIssues.totalDocs,
        pinned: pinnedIssues.totalDocs,
        total: totalIssues.totalDocs,
      },
      latestPatchNote: latest
        ? {
            publishedAt: latest.publishedAt ?? null,
            summary: latest.summary ?? null,
            title: latest.title,
            versionLabel: latest.versionLabel ?? null,
          }
        : null,
    },
    slots: SLOT_ORDER.map((id) => ({
      description: flagshipSlots[id].aiDescription,
      id,
      version: flagshipSlots[id].version,
    })),
  }
}
