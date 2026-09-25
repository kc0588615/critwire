import { z } from 'zod'

import { siteSchemaVersionSchema, siteTemplateIdSchema, SITE_SCHEMA_VERSION } from './refs'
import {
  adaptiveSlotSchema,
  availabilitySlotSchema,
  communitySlotSchema,
  featuresSlotSchema,
  finalCTASlotSchema,
  footerConfigSchema,
  gallerySlotSchema,
  heroSlotSchema,
  knownIssuesSlotSchema,
  latestUpdateSlotSchema,
  navConfigSchema,
  trailerSlotSchema,
} from './slots'
import { siteThemeSchema } from './theme'

/**
 * The complete flagship-game-v1 site configuration. `prefault({})`
 * parses an empty input through each slot's defaults, so
 * `siteConfigV1Schema.parse({})` yields a fully-populated, valid
 * baseline configuration.
 */
export const siteConfigV1Schema = z.strictObject({
  template: siteTemplateIdSchema.default('flagship-game-v1'),
  schemaVersion: siteSchemaVersionSchema.default(SITE_SCHEMA_VERSION),
  nav: navConfigSchema.prefault({}),
  theme: siteThemeSchema.prefault({}),
  hero: heroSlotSchema.prefault({}),
  availability: availabilitySlotSchema.prefault({}),
  features: featuresSlotSchema.prefault({}),
  trailer: trailerSlotSchema.prefault({}),
  gallery: gallerySlotSchema.prefault({}),
  adaptive: adaptiveSlotSchema.prefault({}),
  latestUpdate: latestUpdateSlotSchema.prefault({}),
  knownIssues: knownIssuesSlotSchema.prefault({}),
  community: communitySlotSchema.prefault({}),
  finalCta: finalCTASlotSchema.prefault({}),
  footer: footerConfigSchema.prefault({}),
})
export type SiteConfigV1 = z.infer<typeof siteConfigV1Schema>

/** Slot-id-keyed view of the slot schemas (nav/theme/footer are frame, not slots). */
export const slotSchemas = {
  hero: heroSlotSchema,
  availability: availabilitySlotSchema,
  features: featuresSlotSchema,
  trailer: trailerSlotSchema,
  gallery: gallerySlotSchema,
  adaptive: adaptiveSlotSchema,
  latestUpdate: latestUpdateSlotSchema,
  knownIssues: knownIssuesSlotSchema,
  community: communitySlotSchema,
  finalCta: finalCTASlotSchema,
} as const
