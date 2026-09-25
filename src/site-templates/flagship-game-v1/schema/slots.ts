import { z } from 'zod'

import { nullableMediaRef, nullableSiteAction, mediaRefSchema, siteActionSchema } from './refs'
import { optionalText, safeText } from './text'

/**
 * One Zod schema per slot. These are canonical: Payload publish
 * validation, AI structured output, and the renderer prop types all
 * derive from them. Every object is strict — unknown keys are rejected.
 */

export const heroVariantSchema = z.enum([
  'centeredCinematic',
  'leftEditorial',
  'split',
  'trailerBackground',
])

export const heroSlotSchema = z.strictObject({
  variant: heroVariantSchema.default('leftEditorial'),
  eyebrow: optionalText(60),
  /** Falls back to the project name when null. */
  heading: optionalText(90),
  /** Falls back to the project description when null. */
  tagline: optionalText(240),
  showLogo: z.boolean().default(true),
  backgroundMedia: nullableMediaRef,
  primaryAction: nullableSiteAction,
  secondaryAction: nullableSiteAction,
})
export type HeroSlot = z.infer<typeof heroSlotSchema>

/**
 * Platform/store facts render from GameProject availability data — the
 * slot config only controls presentation, never the URLs.
 */
export const availabilitySlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  heading: optionalText(80),
  note: optionalText(200),
})
export type AvailabilitySlot = z.infer<typeof availabilitySlotSchema>

export const featuresVariantSchema = z.enum([
  'editorialThree',
  'cardGrid',
  'alternating',
  'featurePlusTwo',
])

export const featuresSlotSchema = z.strictObject({
  variant: featuresVariantSchema.default('cardGrid'),
  heading: optionalText(80),
  intro: optionalText(280),
  items: z
    .array(
      z.strictObject({
        title: safeText(60),
        body: safeText(280),
        media: nullableMediaRef,
      }),
    )
    .max(6)
    .default([]),
})
export type FeaturesSlot = z.infer<typeof featuresSlotSchema>

/** The trailer URL itself is a GameProject fact (links.trailer). */
export const trailerSlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  heading: optionalText(80),
  poster: nullableMediaRef,
})
export type TrailerSlot = z.infer<typeof trailerSlotSchema>

export const galleryVariantSchema = z.enum([
  'editorialMosaic',
  'horizontalStrip',
  'carousel',
  'twoColumn',
])

export const gallerySlotSchema = z.strictObject({
  variant: galleryVariantSchema.default('editorialMosaic'),
  heading: optionalText(80),
  items: z
    .array(
      z.strictObject({
        media: mediaRefSchema,
        alt: safeText(160),
        caption: optionalText(140),
      }),
    )
    .max(12)
    .default([]),
})
export type GallerySlot = z.infer<typeof gallerySlotSchema>

export const adaptiveKindSchema = z.enum([
  'story',
  'world',
  'characters',
  'modes',
  'roadmap',
  'systems',
  'philosophy',
])

/** Editorial section whose kind adapts to the game (story, roadmap, …). */
export const adaptiveSlotSchema = z.strictObject({
  kind: adaptiveKindSchema.default('story'),
  heading: optionalText(90),
  body: optionalText(1400),
  media: nullableMediaRef,
  items: z
    .array(
      z.strictObject({
        title: safeText(60),
        body: safeText(240),
      }),
    )
    .max(6)
    .default([]),
})
export type AdaptiveSlot = z.infer<typeof adaptiveSlotSchema>

/** Renders the latest published patch note via live query — content is never copied in. */
export const latestUpdateSlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  heading: optionalText(80),
})
export type LatestUpdateSlot = z.infer<typeof latestUpdateSlotSchema>

export const knownIssuesVariantSchema = z.enum(['compact', 'pinned', 'recentlyFixed'])

/**
 * Renders current public issues via live query with explicit sorts.
 * Must never depend on the admin kanban `_order` field.
 */
export const knownIssuesSlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  variant: knownIssuesVariantSchema.default('compact'),
  heading: optionalText(80),
})
export type KnownIssuesSlot = z.infer<typeof knownIssuesSlotSchema>

export const communityVariantSchema = z.enum(['artworkBanner', 'split'])

export const communitySlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  variant: communityVariantSchema.default('split'),
  heading: optionalText(90),
  body: optionalText(400),
  background: nullableMediaRef,
  actions: z.array(siteActionSchema).max(3).default([]),
})
export type CommunitySlot = z.infer<typeof communitySlotSchema>

export const finalCTASlotSchema = z.strictObject({
  enabled: z.boolean().default(true),
  heading: optionalText(90),
  subheading: optionalText(200),
  background: nullableMediaRef,
  primaryAction: nullableSiteAction,
  secondaryAction: nullableSiteAction,
})
export type FinalCTASlot = z.infer<typeof finalCTASlotSchema>

export const navConfigSchema = z.strictObject({
  links: z.array(siteActionSchema).max(5).default([
    { ref: 'updates', label: null },
    { ref: 'issues', label: null },
    { ref: 'contact', label: null },
  ]),
  cta: nullableSiteAction,
})
export type NavConfig = z.infer<typeof navConfigSchema>

export const footerConfigSchema = z.strictObject({
  tagline: optionalText(140),
  showLegalLinks: z.boolean().default(true),
})
export type FooterConfig = z.infer<typeof footerConfigSchema>
