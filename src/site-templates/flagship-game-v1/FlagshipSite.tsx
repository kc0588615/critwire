import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { GameProject, Media } from '@/payload-types'

import { PortalFrame } from '@/components/game/PortalFrame'
import { queryTopFeedback } from '@/lib/game-portal/issues'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

import type { SiteConfigV1 } from './schema/config'
import { collectSiteMediaRefs } from './media'
import { flagshipSlots, SLOT_ORDER } from './registry'
import type { SiteRenderContext } from './render/context'

/**
 * The fixed flagship-game-v1 renderer. Section order is code-owned
 * (SLOT_ORDER) — configuration decides content and variants, never
 * arrangement. Dynamic slots query live published data here; nothing
 * is copied into configuration.
 */
export const FlagshipSite: React.FC<{
  config: SiteConfigV1
  /** Media documents already resolved by the caller (e.g. from a depth-1 page fetch). */
  mediaSeed?: Map<number, Media>
  project: GameProject
}> = async ({ config: siteConfig, mediaSeed, project }) => {
  const payload = await getPayload({ config })

  const media = new Map<number, Media>(mediaSeed)
  const missingIds = collectSiteMediaRefs(siteConfig).filter((id) => !media.has(id))

  const [latestPatchNote, knownIssues, mediaResult] = await Promise.all([
    siteConfig.latestUpdate.enabled
      ? queryPublishedPatchNotes({ limit: 1, page: 1, projectID: project.id }).then(
          (notes) => notes.docs[0] ?? null,
        )
      : null,
    siteConfig.knownIssues.enabled ? queryTopFeedback(project.id) : [],
    missingIds.length > 0
      ? payload.find({
          collection: 'media',
          depth: 0,
          limit: missingIds.length,
          pagination: false,
          where: { id: { in: missingIds } },
        })
      : null,
  ])

  for (const doc of mediaResult?.docs ?? []) media.set(doc.id, doc)

  const ctx: SiteRenderContext = {
    config: siteConfig,
    knownIssues,
    latestPatchNote,
    media,
    project,
  }

  return (
    <PortalFrame project={project}>
      {SLOT_ORDER.map((slotId) => {
        const slot = flagshipSlots[slotId]
        const Section = slot.render as React.ComponentType<{
          ctx: SiteRenderContext
          value: SiteConfigV1[typeof slotId]
        }>
        return <Section ctx={ctx} key={slotId} value={siteConfig[slotId]} />
      })}
    </PortalFrame>
  )
}
