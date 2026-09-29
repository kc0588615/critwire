import type { Metadata } from 'next'

import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React from 'react'

import { RenderGameBlocks } from '@/blocks/game/RenderGameBlocks'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PortalChrome } from '@/components/game/PortalChrome'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import {
  getLandingPage,
  resolveFlagshipConfig,
  seedProjectMedia,
} from '@/lib/game-portal/landingPage'
import { FlagshipSite } from '@/site-templates/flagship-game-v1/FlagshipSite'
import { deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { getServerSideURL } from '@/utilities/getURL'
import { getPreviewUser } from '@/utilities/getPreviewUser'

// ISR safety net — on-demand revalidation from the GamePages,
// GameProjects, PatchNotes, and Issues hooks is the primary
// invalidation path.
export const revalidate = 3600

/**
 * Landing page decision tree:
 * 1. Page published with the flagship template → flagship renderer.
 * 2. Page published with legacy blocks (no template) → legacy renderer
 *    inside the portal frame, themed with the derived default.
 * 3. No usable page → flagship default derived from project facts.
 */
export default async function GameLandingPage({
  params,
}: {
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const { isEnabled: draftModeEnabled } = await draftMode()
  const previewUser = draftModeEnabled ? await getPreviewUser() : null
  // Draft Mode is a site-wide cookie. Every draft read must therefore
  // re-authorize the current user against the requested project's page;
  // otherwise a preview opened for one tenant could expose another
  // tenant's unpublished page by navigating to its public slug.
  const draftPage = previewUser ? await getLandingPage(project.id, true, previewUser) : null
  const draft = draftPage !== null
  const page = draftPage ?? (await getLandingPage(project.id, false))
  const listener = draft ? <LivePreviewListener /> : null

  if (page?.template === 'flagship-game-v1') {
    const { config: siteConfig, media } = resolveFlagshipConfig(page, project, { draft })
    return (
      <>
        {listener}
        <FlagshipSite config={siteConfig} mediaSeed={media} project={project} />
      </>
    )
  }

  if (page?.content?.length) {
    return (
      <PortalChrome project={project}>
        {listener}
        <RenderGameBlocks blocks={page.content} project={project} />
      </PortalChrome>
    )
  }

  return (
    <>
      {listener}
      <FlagshipSite
        config={deriveFlagshipDefault(project)}
        mediaSeed={seedProjectMedia(project)}
        project={project}
      />
    </>
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameSlug: string }>
}): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  const banner =
    project.banner && typeof project.banner === 'object' && project.banner.url
      ? [{ url: `${getServerSideURL()}${project.banner.url}` }]
      : undefined

  return {
    description: project.description ?? undefined,
    openGraph: {
      description: project.description ?? undefined,
      images: banner,
      siteName: 'Critwire',
      title: project.name,
    },
    twitter: {
      card: 'summary_large_image',
      images: banner?.map((image) => image.url),
      title: project.name,
    },
    title: project.name,
  }
}
