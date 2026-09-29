import type { Metadata } from 'next'

import configPromise from '@payload-config'
import { getPayload } from 'payload'
import { draftMode } from 'next/headers'
import { notFound } from 'next/navigation'
import React, { cache } from 'react'

import { RenderBlocks } from '@/blocks/RenderBlocks'
import { RenderHero } from '@/heros/RenderHero'
import { generateMeta } from '@/utilities/generateMeta'
import { getMarketingReadOptions } from '@/utilities/getPreviewUser'
import { LivePreviewListener } from '@/components/LivePreviewListener'
import {
  deferStaticGenerationIfRequested,
  shouldSkipBuildStaticGeneration,
} from '@/utilities/staticGeneration'

export async function generateStaticParams() {
  if (shouldSkipBuildStaticGeneration) return []

  const payload = await getPayload({ config: configPromise })
  const pages = await payload.find({
    collection: 'pages',
    draft: false,
    limit: 1000,
    overrideAccess: false,
    pagination: false,
    select: {
      slug: true,
    },
  })

  return pages.docs.map(({ slug }) => ({ slug }))
}

type Args = {
  params: Promise<{
    slug: string
  }>
}

export default async function Page({ params: paramsPromise }: Args) {
  await deferStaticGenerationIfRequested()

  const { isEnabled: draft } = await draftMode()
  const { slug } = await paramsPromise
  // Decode to support slugs with special characters
  const page = await queryPageBySlug({
    slug: decodeURIComponent(slug),
  })

  if (!page) {
    notFound()
  }

  const { hero, layout } = page

  return (
    <article className="cw-page">
      {draft && <LivePreviewListener />}

      <RenderHero {...hero} />
      <RenderBlocks blocks={layout} />
    </article>
  )
}

export async function generateMetadata({ params: paramsPromise }: Args): Promise<Metadata> {
  if (shouldSkipBuildStaticGeneration) return generateMeta({ doc: null })

  await deferStaticGenerationIfRequested()

  const { slug } = await paramsPromise
  // Decode to support slugs with special characters
  const decodedSlug = decodeURIComponent(slug)
  const page = await queryPageBySlug({
    slug: decodedSlug,
  })

  return generateMeta({ doc: page })
}

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
  const payload = await getPayload({ config: configPromise })

  const result = await payload.find({
    collection: 'pages',
    ...(await getMarketingReadOptions()),
    limit: 1,
    pagination: false,
    where: {
      slug: {
        equals: slug,
      },
    },
  })

  return result.docs?.[0] || null
})
