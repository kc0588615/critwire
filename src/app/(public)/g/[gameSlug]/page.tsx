import type { Metadata } from 'next'

import React, { Suspense } from 'react'

import { HubHeader } from '@/components/game/HubHeader'
import { LatestUpdates } from '@/components/game/LatestUpdates'
import { TopFeedback } from '@/components/game/TopFeedback'
import { WelcomePanel } from '@/components/game/WelcomePanel'
import { getGameProject, requirePortalProject } from '@/lib/game-portal/getGameProject'
import { getServerSideURL } from '@/utilities/getURL'

// ISR safety net: the GameProjects, PatchNotes, Issues and vote hooks
// revalidate the hub on every change it shows.
export const revalidate = 3600

// No paths at build time: each hub renders on its first visit, then is
// served from the ISR cache until a hook revalidates it.
export async function generateStaticParams() {
  return []
}

/**
 * A game's hub: who the game is, its latest updates and its top feedback,
 * under the next steps for a studio that just onboarded.
 */
export default async function GameHubPage({ params }: { params: Promise<{ gameSlug: string }> }) {
  const { gameSlug } = await params
  const project = await requirePortalProject(gameSlug)

  return (
    <>
      {/* Reads `?welcome=1` in the browser, so the cached hub never varies by it. */}
      <Suspense fallback={null}>
        <WelcomePanel project={{ id: project.id, slug: project.slug }} />
      </Suspense>
      <HubHeader project={project} />
      <LatestUpdates project={project} />
      <TopFeedback project={project} />
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
