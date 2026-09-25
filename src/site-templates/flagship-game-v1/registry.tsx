import type React from 'react'
import type { z } from 'zod'

import { slotSchemas } from './schema/config'
import { SLOT_ORDER, type SiteSlotId } from './schema/refs'
import type { SiteRenderContext } from './render/context'
import { AdaptiveSection } from './render/slots/Adaptive'
import { AvailabilitySection } from './render/slots/Availability'
import { CommunitySection } from './render/slots/Community'
import { FeaturesSection } from './render/slots/Features'
import { FinalCTASection } from './render/slots/FinalCTA'
import { GallerySection } from './render/slots/Gallery'
import { HeroSection } from './render/slots/Hero'
import { KnownIssuesSection } from './render/slots/KnownIssues'
import { LatestUpdateSection } from './render/slots/LatestUpdate'
import { TrailerSection } from './render/slots/Trailer'

/**
 * Canonical slot registry: one entry per slot, each pairing the Zod
 * schema (validation + AI structured output) with the renderer that
 * owns its markup, accessibility, and responsive behavior. Registry
 * ids and prop shapes are stable so a future visual editor (Puck) can
 * adapt to them — Critwire's schema stays the source of truth.
 */
export type SlotDefinition<K extends SiteSlotId> = {
  aiDescription: string
  id: K
  render: React.ComponentType<{
    ctx: SiteRenderContext
    value: z.output<(typeof slotSchemas)[K]>
  }>
  schema: (typeof slotSchemas)[K]
  version: number
}

export const flagshipSlots: { [K in SiteSlotId]: SlotDefinition<K> } = {
  hero: {
    aiDescription:
      'Above-the-fold introduction: headline, tagline, optional background image, and up to two action refs. Falls back to the project name/description when heading/tagline are null.',
    id: 'hero',
    render: HeroSection,
    schema: slotSchemas.hero,
    version: 1,
  },
  availability: {
    aiDescription:
      'Platform and release facts pulled live from the game project (release state, date, version, platform store links). Config controls heading and an optional note only.',
    id: 'availability',
    render: AvailabilitySection,
    schema: slotSchemas.availability,
    version: 1,
  },
  features: {
    aiDescription:
      'Three to six selling-point items with optional images, in one of four approved layouts.',
    id: 'features',
    render: FeaturesSection,
    schema: slotSchemas.features,
    version: 1,
  },
  trailer: {
    aiDescription:
      'Click-to-load video facade for the project trailer URL fact. Config controls heading and poster image; the video URL itself is not configurable here.',
    id: 'trailer',
    render: TrailerSection,
    schema: slotSchemas.trailer,
    version: 1,
  },
  gallery: {
    aiDescription:
      'Two to twelve screenshots with alt text and optional captions, in one of four approved layouts.',
    id: 'gallery',
    render: GallerySection,
    schema: slotSchemas.gallery,
    version: 1,
  },
  adaptive: {
    aiDescription:
      'Editorial deep-dive whose kind adapts to the game: story, world, characters, modes, roadmap, systems, or philosophy. Plain-text body plus optional media and sub-items.',
    id: 'adaptive',
    render: AdaptiveSection,
    schema: slotSchemas.adaptive,
    version: 1,
  },
  latestUpdate: {
    aiDescription:
      'Live binding to the newest published patch note. Config controls visibility and heading only.',
    id: 'latestUpdate',
    render: LatestUpdateSection,
    schema: slotSchemas.latestUpdate,
    version: 1,
  },
  knownIssues: {
    aiDescription:
      'Live summary of the public issue board (compact, pinned, or recently-fixed view). Config controls visibility, variant, and heading only.',
    id: 'knownIssues',
    render: KnownIssuesSection,
    schema: slotSchemas.knownIssues,
    version: 1,
  },
  community: {
    aiDescription:
      'Community/support call-to-action with up to three action refs, as an artwork banner or split layout.',
    id: 'community',
    render: CommunitySection,
    schema: slotSchemas.community,
    version: 1,
  },
  finalCta: {
    aiDescription:
      'Closing conversion moment: heading, subheading, optional background, and up to two action refs.',
    id: 'finalCta',
    render: FinalCTASection,
    schema: slotSchemas.finalCta,
    version: 1,
  },
}

export { SLOT_ORDER }
