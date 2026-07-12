import type { Metadata } from 'next'

import config from '@payload-config'
import Image from 'next/image'
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
  <>
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 -z-10">
        {project.banner && typeof project.banner === 'object' ? (
          <Media fill imgClassName="object-cover" priority resource={project.banner} />
        ) : (
          <Image
            alt=""
            className="object-cover"
            fill
            priority
            sizes="100vw"
            src="/critter-connect/field-binder-hero.png"
          />
        )}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0e1a_0%,rgba(10,14,26,0.92)_30%,rgba(10,14,26,0.45)_65%,rgba(10,14,26,0.8)_100%)]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0a0e1a] to-transparent" />
      </div>

      <div className="cc-shell flex min-h-[calc(100vh-73px)] items-center py-20">
        <div className="max-w-2xl">
          {project.logo && typeof project.logo === 'object' && (
            <Media imgClassName="mb-7 max-h-20 w-auto" priority resource={project.logo} />
          )}
          <h1 className="text-5xl font-black leading-[0.95] tracking-tight text-slate-100 sm:text-7xl">
            {project.name}
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300 sm:text-xl">
            {project.description ||
              'Build a field binder of hard-won discoveries. Follow real places, unlock clue trails, and turn player reports into better expeditions.'}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            {project.links?.steam ? (
              <GameButtons buttons={[{ label: 'Begin Expedition', url: project.links.steam }]} />
            ) : null}
            <a className="cc-button-primary" href={`/g/${project.slug}/report`}>
              Send Field Report
            </a>
            <a className="cc-button-secondary" href={`/g/${project.slug}/issues`}>
              Check Field Board
            </a>
          </div>
        </div>
      </div>
    </section>

    <section className="cc-section">
      <div className="cc-shell grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="cc-panel-elevated rounded-lg p-6 sm:p-8">
          <p className="cc-kicker">Discovery Loop</p>
          <h2 className="mt-4 max-w-2xl text-3xl font-black tracking-tight sm:text-5xl">
            Every clue earns its place in the binder.
          </h2>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            Classification, habitat, geography, morphology, behavior, life cycle, key facts, and
            conservation all stay visible as evidence trails. The site gives players the same
            field-device feel outside the game.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {[
              ['Classification', 'var(--ds-gem-observe)'],
              ['Habitat', 'var(--ds-gem-camouflage)'],
              ['Geographic', 'var(--ds-gem-scan)'],
              ['Conservation', 'var(--ds-gem-burst)'],
            ].map(([label, color]) => (
              <div className="glass-strip rounded-lg p-4" key={label}>
                <span className="mb-3 block h-2 w-12 rounded-full" style={{ background: color }} />
                <span className="font-mono text-sm text-slate-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cc-panel rounded-lg p-3">
          <Image
            alt="A glowing Critter Connect discovery card with clue slots and a species portrait"
            className="h-full min-h-80 w-full rounded-md object-cover"
            height={1086}
            sizes="(min-width: 1024px) 40vw, 100vw"
            src="/critter-connect/discovery-card.png"
            width={1448}
          />
        </div>
      </div>
    </section>

    <section className="pb-24">
      <div className="cc-shell grid gap-4 md:grid-cols-3">
        {[
          {
            href: `/g/${project.slug}/patch-notes`,
            title: 'Field Notes',
            text: 'Publish updates in the same voice players see in the HUD.',
          },
          {
            href: `/g/${project.slug}/issues`,
            title: 'Field Board',
            text: 'Show known tracks, priorities, status, and player votes in one place.',
          },
          {
            href: `/g/${project.slug}/contact`,
            title: 'Contact Route',
            text: 'Route player messages through email, Discord, or an external trailhead.',
          },
        ].map((item) => (
          <a
            className="cc-panel group rounded-lg p-6 transition-transform hover:-translate-y-1 hover:border-cyan-300/40"
            href={item.href}
            key={item.href}
          >
            <h3 className="text-xl font-bold text-slate-100">{item.title}</h3>
            <p className="mt-3 leading-7 text-slate-400">{item.text}</p>
            <span className="mt-6 inline-flex font-mono text-sm text-cyan-200">
              Open route
              <span className="ml-2 transition-transform group-hover:translate-x-1">→</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  </>
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
