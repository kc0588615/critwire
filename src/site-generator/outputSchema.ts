import { z } from 'zod'

import { isSafeText } from '@/site-templates/flagship-game-v1/schema/text'
import {
  siteDensitySchema,
  siteMotionSchema,
  siteShapeSchema,
  siteThemeColorsSchema,
  siteTypographySchema,
} from '@/site-templates/flagship-game-v1/schema/theme'
import {
  adaptiveKindSchema,
  communityVariantSchema,
  featuresVariantSchema,
  galleryVariantSchema,
  heroVariantSchema,
  knownIssuesVariantSchema,
} from '@/site-templates/flagship-game-v1/schema/slots'
import {
  siteActionRefSchema,
  siteSchemaVersionSchema,
  siteTemplateIdSchema,
} from '@/site-templates/flagship-game-v1/schema/refs'

/**
 * Structured Outputs cannot represent preprocess/transform/default nodes.
 * This wire schema is therefore fully required and transform-free. Its values
 * are parsed again by the canonical SiteConfigV1 schema before use or storage.
 */
const text = (max: number, min = 1) =>
  z.string().min(min).max(max).refine(isSafeText, 'Plain text only.')
const optionalText = (max: number) => text(max).nullable()
const media = z.number().int().positive().nullable()
const action = z.strictObject({ label: text(40).nullable(), ref: siteActionRefSchema })
const optionalAction = action.nullable()

export const siteConfigV1OutputSchema = z.strictObject({
  template: siteTemplateIdSchema,
  schemaVersion: siteSchemaVersionSchema,
  nav: z.strictObject({
    links: z.array(action).max(5),
    cta: optionalAction,
  }),
  theme: z.strictObject({
    colors: siteThemeColorsSchema,
    typography: siteTypographySchema,
    shape: siteShapeSchema,
    density: siteDensitySchema,
    motion: siteMotionSchema,
  }),
  hero: z.strictObject({
    variant: heroVariantSchema,
    eyebrow: optionalText(60),
    heading: optionalText(90),
    tagline: optionalText(240),
    showLogo: z.boolean(),
    backgroundMedia: media,
    primaryAction: optionalAction,
    secondaryAction: optionalAction,
  }),
  availability: z.strictObject({
    enabled: z.boolean(),
    heading: optionalText(80),
    note: optionalText(200),
  }),
  features: z.strictObject({
    variant: featuresVariantSchema,
    heading: optionalText(80),
    intro: optionalText(280),
    items: z.array(
      z.strictObject({ title: text(60), body: text(280), media }),
    ).max(6),
  }),
  trailer: z.strictObject({
    enabled: z.boolean(),
    heading: optionalText(80),
    poster: media,
  }),
  gallery: z.strictObject({
    variant: galleryVariantSchema,
    heading: optionalText(80),
    items: z.array(
      z.strictObject({ media: z.number().int().positive(), alt: text(160), caption: optionalText(140) }),
    ).max(12),
  }),
  adaptive: z.strictObject({
    kind: adaptiveKindSchema,
    heading: optionalText(90),
    body: optionalText(1400),
    media,
    items: z.array(z.strictObject({ title: text(60), body: text(240) })).max(6),
  }),
  latestUpdate: z.strictObject({
    enabled: z.boolean(),
    heading: optionalText(80),
  }),
  knownIssues: z.strictObject({
    enabled: z.boolean(),
    variant: knownIssuesVariantSchema,
    heading: optionalText(80),
  }),
  community: z.strictObject({
    enabled: z.boolean(),
    variant: communityVariantSchema,
    heading: optionalText(90),
    body: optionalText(400),
    background: media,
    actions: z.array(action).max(3),
  }),
  finalCta: z.strictObject({
    enabled: z.boolean(),
    heading: optionalText(90),
    subheading: optionalText(200),
    background: media,
    primaryAction: optionalAction,
    secondaryAction: optionalAction,
  }),
  footer: z.strictObject({
    tagline: optionalText(140),
    showLegalLinks: z.boolean(),
  }),
})
