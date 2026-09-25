import { z } from 'zod'

import type { SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'
import { siteSlotIdSchema, type SiteSlotId } from '@/site-templates/flagship-game-v1/schema/refs'

export const generationScopeSchema = z.enum(['full', 'theme', 'slot'])
export type GenerationScope = z.infer<typeof generationScopeSchema>

export const generateSiteRequestSchema = z
  .strictObject({
    gamePageId: z.number().int().positive(),
    prompt: z
      .string()
      .trim()
      .min(3, 'Describe the change you want.')
      .max(2000, 'Prompt must be 2,000 characters or fewer.')
      .refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
        message: 'Prompt contains unsupported control characters.',
      }),
    scope: generationScopeSchema,
    slot: siteSlotIdSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (value.scope === 'slot' && !value.slot) {
      ctx.addIssue({ code: 'custom', message: 'Choose a slot for slot-scoped generation.', path: ['slot'] })
    }
    if (value.scope !== 'slot' && value.slot) {
      ctx.addIssue({ code: 'custom', message: 'Slot is only valid for slot-scoped generation.', path: ['slot'] })
    }
  })

export type GenerateSiteRequest = z.infer<typeof generateSiteRequestSchema>

export type SiteGenerationContext = {
  allowedActionRefs: string[]
  currentConfig: SiteConfigV1
  media: Array<{
    alt: null | string
    filename: null | string
    height: null | number
    id: number
    selected: boolean
    width: null | number
  }>
  project: {
    accentColor: null | string
    availability: {
      currentVersion: null | string
      releaseDate: null | string
      releaseState: null | string
      platforms: Array<{
        hasStoreUrl: boolean
        label: null | string
        platform: string
      }>
    }
    description: null | string
    linksAvailable: string[]
    meta: {
      developer: null | string
      engine: null | string
      publisher: null | string
      rating: null | string
    }
    name: string
    slug: string
  }
  publicOperations: {
    issues: {
      active: number
      pinned: number
      total: number
    }
    latestPatchNote: null | {
      publishedAt: null | string
      summary: null | string
      title: string
      versionLabel: null | string
    }
  }
  slots: Array<{
    description: string
    id: SiteSlotId
    version: number
  }>
}

export type GenerateSiteInput = GenerateSiteRequest & {
  context: SiteGenerationContext
}

export type GenerateSiteResult = {
  changeSummary: string[]
  config: SiteConfigV1
  model: string
}

export interface SiteGenerator {
  generate(input: GenerateSiteInput): Promise<GenerateSiteResult>
}
