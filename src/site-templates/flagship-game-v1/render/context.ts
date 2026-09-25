import type { GameProject, Issue, Media, PatchNote } from '@/payload-types'

import type { SiteConfigV1 } from '../schema/config'

/**
 * Everything a slot renderer may read besides its own validated slot
 * value. Dynamic data (patch note, issues) is queried live by
 * FlagshipSite — slot configuration never carries copies of it.
 */
export type SiteRenderContext = {
  config: SiteConfigV1
  knownIssues: Issue[]
  latestPatchNote: null | PatchNote
  media: Map<number, Media>
  project: GameProject
}
