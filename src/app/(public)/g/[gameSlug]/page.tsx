import type { Metadata } from 'next'

import config from '@payload-config'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { RenderGameBlocks } from '@/blocks/game/RenderGameBlocks'
import { Media } from '@/components/Media'
import { GameButtons } from '@/components/game/GameButtons'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { getServerSideURL } from '@/utilities/getURL'

// ISR safety net — on-demand revalidation from the GamePages and
// GameProjects hooks is the primary invalidation path.
export const revalidate = 3600

const getPublishedLandingPage = async (projectID: number | string) => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'game-pages',
    depth: 1,
    draft: false,
    limit: 1,
    pagination: false,
    where: {
      and: [
        { gameProject: { equals: projectID } },
        { kind: { equals: 'landing' } },
        { _status: { equals: 'published' } },
      ],
    },
  })
  return result.docs[0] ?? null
}

/**
 * Rendered when the studio has not published a landing page yet: a
 * clean default built from the project's own data, so the portal is
 * presentable the moment the project exists.
 */
const DefaultLanding: React.FC<{ project: GameProject }> = ({ project }) => (
  <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden text-center">
    {project.banner && typeof project.banner === 'object' && (
      <>
        <Media fill imgClassName="object-cover" priority resource={project.banner} />
        <div className="absolute inset-0 bg-black/50" />
      </>
    )}
    <div className="relative z-10 mx-auto max-w-3xl px-6 py-20">
      {project.logo && typeof project.logo === 'object' && (
        <Media imgClassName="mx-auto mb-6 max-h-32 w-auto" priority resource={project.logo} />
      )}
      <h1
        className={`text-4xl font-bold tracking-tight sm:text-6xl ${project.banner ? 'text-white' : ''}`}
      >
        {project.name}
      </h1>
      {project.description && (
        <p className={`mt-4 text-lg sm:text-xl ${project.banner ? 'text-white/85' : 'opacity-80'}`}>
          {project.description}
        </p>
      )}
      {project.links?.steam && (
        <div className="mt-8 flex justify-center">
          <GameButtons buttons={[{ label: 'View on Steam', url: project.links.steam }]} />
        </div>
      )}
    </div>
  </section>
)

export default async function GameLandingPage({
  params,
}: {
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const page = await getPublishedLandingPage(project.id)

  if (!page?.content?.length) {
    return <DefaultLanding project={project} />
  }

  return <RenderGameBlocks blocks={page.content} project={project} />
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
