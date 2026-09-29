import type { GamePage, GameProject, Media, User } from '@/payload-types'
import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'

import * as Sentry from '@sentry/nextjs'
import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { normalizeSiteInput } from '@/site-templates/flagship-game-v1/normalize'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'

/**
 * Fetches a project's landing page. Wrapped in React cache() so every
 * render of one request shares the query.
 */
export const getLandingPage = cache(
  async (
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
  },
)

/** Media the project itself carries — saves a lookup for banner/logo refs. */
export const seedProjectMedia = (project: GameProject): Map<number, Media> => {
  const map = new Map<number, Media>()
  for (const value of [project.banner, project.logo]) {
    if (value && typeof value === 'object') map.set(value.id, value)
  }
  return map
}

/**
 * Parses a flagship landing's stored site into its config, plus every
 * media document already populated on the page or the project.
 */
export const resolveFlagshipConfig = (
  page: GamePage,
  project: GameProject,
  { draft }: { draft: boolean },
): { config: SiteConfigV1; media: Map<number, Media> } => {
  const { input, media: pageMedia } = normalizeSiteInput({
    schemaVersion: page.schemaVersion,
    site: page.site,
    template: page.template,
  })
  const parsed = siteConfigV1Schema.safeParse(input)

  if (!parsed.success && !draft) {
    // Published configs are Zod-validated on save, so this indicates
    // drift (e.g. a schema change without migration). An incomplete
    // draft in preview is expected and not reported. Either way the
    // derived default replaces it rather than erroring the public page.
    Sentry.captureException(
      new Error(`Stored flagship config for game-page ${page.id} failed validation`),
      { extra: { issues: parsed.error.issues.slice(0, 10) } },
    )
  }

  const media = seedProjectMedia(project)
  for (const [id, doc] of pageMedia) media.set(id, doc)

  return {
    config: parsed.success ? parsed.data : deriveFlagshipDefault(project),
    media,
  }
}
