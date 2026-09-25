import type { GamePage, GameProject, User } from '@/payload-types'
import type { Payload } from 'payload'

import { checkRateLimit } from '@/lib/upstash/rate-limit'
import { deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { normalizeSiteInput } from '@/site-templates/flagship-game-v1/normalize'
import { siteConfigV1Schema, type SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'

import { buildSiteGenerationContext } from './context'
import { createSiteGenerator } from './openai'
import { siteConfigToPayloadSite } from './storage'
import type { GenerateSiteRequest, GenerateSiteResult, SiteGenerator } from './types'

export class SiteGenerationServiceError extends Error {
  constructor(
    message: string,
    readonly code: 'current-draft-invalid' | 'forbidden' | 'not-found' | 'rate-limited',
    readonly status: number,
  ) {
    super(message)
    this.name = 'SiteGenerationServiceError'
  }
}

type RateLimitCheck = (args: {
  identifier: string
  key: string
  limit: number
  windowSeconds: number
}) => Promise<{ success: boolean }>

const idOf = (value: GamePage['gameProject'] | GamePage['tenant']): null | number | string => {
  if (value == null) return null
  return typeof value === 'object' ? value.id : value
}

const currentConfigFor = ({
  page,
  project,
  scope,
}: {
  page: GamePage
  project: GameProject
  scope: GenerateSiteRequest['scope']
}): SiteConfigV1 => {
  if (page.template !== 'flagship-game-v1') return deriveFlagshipDefault(project)

  const { input } = normalizeSiteInput({
    schemaVersion: page.schemaVersion,
    site: page.site,
    template: page.template,
  })
  const parsed = siteConfigV1Schema.safeParse(input)
  if (parsed.success) return parsed.data
  if (scope === 'full') return deriveFlagshipDefault(project)

  throw new SiteGenerationServiceError(
    'The saved draft is not valid enough for a scoped edit. Fix it manually or generate the full site.',
    'current-draft-invalid',
    422,
  )
}

export type SavedSiteGeneration = GenerateSiteResult & {
  doc: GamePage
}

/**
 * Authenticated orchestration boundary. All reads and the final draft write
 * enforce Payload access controls for the supplied user. The model runs and
 * its output is fully validated before the only mutation in this function.
 */
export const generateAndSaveSiteDraft = async ({
  generator,
  payload,
  rateLimit = checkRateLimit,
  request,
  user,
}: {
  generator?: SiteGenerator
  payload: Payload
  rateLimit?: RateLimitCheck
  request: GenerateSiteRequest
  user: User
}): Promise<SavedSiteGeneration> => {
  let page: GamePage
  try {
    page = await payload.findByID({
      collection: 'game-pages',
      depth: 0,
      draft: true,
      id: request.gamePageId,
      overrideAccess: false,
      user,
    })
  } catch {
    throw new SiteGenerationServiceError('Game page not found.', 'not-found', 404)
  }

  const tenantID = idOf(page.tenant)
  if (tenantID == null) {
    throw new SiteGenerationServiceError('Game page has no tenant.', 'forbidden', 403)
  }

  const limit = await rateLimit({
    identifier: String(tenantID),
    key: 'site-generation',
    limit: 10,
    windowSeconds: 3600,
  })
  if (!limit.success) {
    throw new SiteGenerationServiceError(
      'This tenant has reached its site-generation limit. Try again later.',
      'rate-limited',
      429,
    )
  }

  const projectID = idOf(page.gameProject)
  if (projectID == null) {
    throw new SiteGenerationServiceError('Game project not found.', 'not-found', 404)
  }

  let project: GameProject
  try {
    project = await payload.findByID({
      collection: 'game-projects',
      depth: 0,
      id: projectID,
      overrideAccess: false,
      user,
    })
  } catch {
    throw new SiteGenerationServiceError('Game project not found.', 'not-found', 404)
  }

  const currentConfig = currentConfigFor({ page, project, scope: request.scope })
  const generationContext = await buildSiteGenerationContext({
    currentConfig,
    page,
    payload,
    project,
    user,
  })
  const result = await (generator ?? createSiteGenerator()).generate({
    ...request,
    context: generationContext,
  })

  // Defense in depth: adapters must return canonical data, but the storage
  // boundary validates it independently before creating a Payload version.
  const validated = siteConfigV1Schema.parse(result.config)
  const doc = await payload.update({
    collection: 'game-pages',
    context: { disableRevalidate: true },
    data: {
      _status: 'draft',
      generation: {
        changeSummary: result.changeSummary.map((item) => ({ item })),
        generatedAt: new Date().toISOString(),
        model: result.model,
        prompt: request.prompt,
      },
      schemaVersion: validated.schemaVersion,
      site: siteConfigToPayloadSite(validated),
      template: validated.template,
    },
    depth: 1,
    draft: true,
    id: page.id,
    overrideAccess: false,
    user,
  })

  return { ...result, config: validated, doc }
}
