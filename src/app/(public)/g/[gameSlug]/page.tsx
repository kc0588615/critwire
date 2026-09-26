import type { Metadata } from 'next'

import * as Sentry from '@sentry/nextjs'
import config from '@payload-config'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import type { GamePage, GameProject, Media, User } from '@/payload-types'

import { RenderGameBlocks } from '@/blocks/game/RenderGameBlocks'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import { PortalChrome } from '@/components/game/PortalChrome'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { FlagshipSite } from '@/site-templates/flagship-game-v1/FlagshipSite'
import { deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { normalizeSiteInput } from '@/site-templates/flagship-game-v1/normalize'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'
import { getServerSideURL } from '@/utilities/getURL'
import { getPreviewUser } from '@/utilities/getPreviewUser'

// ISR safety net — on-demand revalidation from the GamePages,
// GameProjects, PatchNotes, and Issues hooks is the primary
// invalidation path.
export const revalidate = 3600

const getLandingPage = async (
  projectID: number | string,
  draft: boolean,
  user?: User | null,
): Promise<GamePage | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'game-pages',
    depth: 1,
    draft,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    user,
    where: {
      and: [
        { gameProject: { equals: projectID } },
        { kind: { equals: 'landing' } },
        // Draft Mode (authorized via the signed /next/site-preview
        // route) may read the latest draft version; the public path
        // only ever sees published documents.
        ...(draft ? [] : [{ _status: { equals: 'published' as const } }]),
      ],
    },
  })
  return result.docs[0] ?? null
}

/** Media the project itself carries — saves a lookup for banner/logo refs. */
const seedProjectMedia = (project: GameProject): Map<number, Media> => {
  const map = new Map<number, Media>()
  for (const value of [project.banner, project.logo]) {
    if (value && typeof value === 'object') map.set(value.id, value)
  }
  return map
}

/**
 * Landing page decision tree:
 * 1. Page published with the flagship template → flagship renderer.
 * 2. Page published with legacy blocks (no template) → legacy renderer
 *    inside the classic portal chrome, exactly as before.
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
    const { input, media } = normalizeSiteInput({
      schemaVersion: page.schemaVersion,
      site: page.site,
      template: page.template,
    })
    const parsed = siteConfigV1Schema.safeParse(input)
    let siteConfig = parsed.success ? parsed.data : null

    if (!siteConfig) {
      // Published configs are Zod-validated on save, so this indicates
      // drift (e.g. a schema change without migration) — or an
      // intentionally incomplete draft in preview. Fall back to the
      // derived default rather than erroring the public page.
      if (!draft) {
        Sentry.captureException(
          new Error(`Stored flagship config for game-page ${page.id} failed validation`),
          { extra: { issues: parsed.success ? [] : parsed.error.issues.slice(0, 10) } },
        )
      }
      siteConfig = deriveFlagshipDefault(project)
    }

    const mediaSeed = seedProjectMedia(project)
    for (const [id, doc] of media) mediaSeed.set(id, doc)

    return (
      <>
        {listener}
        <FlagshipSite config={siteConfig} mediaSeed={mediaSeed} project={project} />
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
