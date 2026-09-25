import { z } from 'zod'

import { optionalText } from './text'

export const siteTemplateIdSchema = z.literal('flagship-game-v1')
export type SiteTemplateId = z.infer<typeof siteTemplateIdSchema>

export const SITE_SCHEMA_VERSION = 1
export const siteSchemaVersionSchema = z.literal(SITE_SCHEMA_VERSION)
export type SiteSchemaVersion = z.infer<typeof siteSchemaVersionSchema>

/**
 * The only link targets configuration (and therefore AI output) may
 * reference. Internal refs resolve to /g/[gameSlug]/… routes; external
 * refs resolve to approved GameProject fact URLs. Raw URLs never appear
 * in site configuration — see actions.ts for resolution.
 */
export const siteActionRefSchema = z.enum([
  'primary-store',
  'demo',
  'steam',
  'epic',
  'itch',
  'discord',
  'updates',
  'issues',
  'report',
  'contact',
])
export type SiteActionRef = z.infer<typeof siteActionRefSchema>
export const SITE_ACTION_REFS = siteActionRefSchema.options

/**
 * Slot ids in canonical render order. The enum order IS the template
 * order — configuration cannot reorder sections. Navigation and footer
 * are part of the fixed frame, not slots.
 */
export const siteSlotIdSchema = z.enum([
  'hero',
  'availability',
  'features',
  'trailer',
  'gallery',
  'adaptive',
  'latestUpdate',
  'knownIssues',
  'community',
  'finalCta',
])
export type SiteSlotId = z.infer<typeof siteSlotIdSchema>
export const SLOT_ORDER: readonly SiteSlotId[] = siteSlotIdSchema.options

/** Media references are Payload media document ids selected from the tenant's library. */
export const mediaRefSchema = z.number().int().positive()

export const nullableMediaRef = mediaRefSchema
  .nullable()
  .optional()
  .transform((value) => value ?? null)

/** A link/button: an approved ref plus an optional label override. */
export const siteActionSchema = z.strictObject({
  ref: siteActionRefSchema,
  label: optionalText(40),
})
export type SiteAction = z.infer<typeof siteActionSchema>

export const nullableSiteAction = siteActionSchema
  .nullable()
  .optional()
  .transform((value) => value ?? null)
