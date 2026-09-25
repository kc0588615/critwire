import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { GameProject, Media } from '@/payload-types'

import { queryLandingIssues } from '@/lib/game-portal/issues'
import { getLatestPublishedPatchNote } from '@/lib/game-portal/patchNotes'
import { collectSiteMediaRefs } from '@/site-generator/media'

import type { SiteConfigV1 } from './schema/config'
import { flagshipSlots, SLOT_ORDER } from './registry'
import type { SiteRenderContext } from './render/context'
import { SiteFooter } from './render/SiteFooter'
import { SiteNav } from './render/SiteNav'
import { themeStyle } from './render/themeStyle'

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
    siteConfig.latestUpdate.enabled ? getLatestPublishedPatchNote(project.id) : null,
    siteConfig.knownIssues.enabled
      ? queryLandingIssues({ projectID: project.id, variant: siteConfig.knownIssues.variant })
      : [],
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
    <div
      className="fs-root flex min-h-screen flex-col"
      data-fs-motion={siteConfig.theme.motion}
      style={themeStyle(siteConfig.theme)}
    >
      <a className="fs-skip" href="#fs-main">
        Skip to content
      </a>
      <SiteNav ctx={ctx} value={siteConfig.nav} />
      <main className="flex-1" id="fs-main">
        {SLOT_ORDER.map((slotId) => {
          const slot = flagshipSlots[slotId]
          const Section = slot.render as React.ComponentType<{
            ctx: SiteRenderContext
            value: SiteConfigV1[typeof slotId]
          }>
          return <Section ctx={ctx} key={slotId} value={siteConfig[slotId]} />
        })}
      </main>
      <SiteFooter ctx={ctx} value={siteConfig.footer} />
    </div>
  )
}
