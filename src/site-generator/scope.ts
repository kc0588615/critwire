import { siteConfigV1Schema, type SiteConfigV1 } from '@/site-templates/flagship-game-v1/schema/config'
import type { SiteSlotId } from '@/site-templates/flagship-game-v1/schema/refs'

import type { GenerationScope } from './types'

export const applyGenerationScope = ({
  candidate,
  current,
  scope,
  slot,
}: {
  candidate: SiteConfigV1
  current: SiteConfigV1
  scope: GenerationScope
  slot?: SiteSlotId
}): SiteConfigV1 => {
  if (scope === 'full') return siteConfigV1Schema.parse(candidate)
  if (scope === 'theme') {
    return siteConfigV1Schema.parse({ ...current, theme: candidate.theme })
  }
  if (!slot) throw new Error('Slot-scoped generation requires a slot.')
  return siteConfigV1Schema.parse({ ...current, [slot]: candidate[slot] })
}
