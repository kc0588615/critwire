import type { Issue } from '@/payload-types'

type IssueStatus = Issue['status']

/**
 * What players see of an item's status: four public stages. The admin
 * keeps the internal statuses; every public surface maps them here.
 */
export const PUBLIC_STAGES = [
  { id: 'under-review', label: 'Under review', shape: 'ring' },
  { id: 'planned', label: 'Planned', shape: 'diamond' },
  { id: 'in-progress', label: 'In progress', shape: 'half' },
  { id: 'shipped', label: 'Shipped', shape: 'dot' },
] as const

export type PublicStage = (typeof PUBLIC_STAGES)[number]
export type PublicStageId = PublicStage['id']

/** A `Record`, so a new status doesn't compile until it's mapped. `null` is archived. */
const STAGE_OF: Record<IssueStatus, null | PublicStageId> = {
  CLOSED: null,
  FIXED: 'shipped',
  IN_PROGRESS: 'in-progress',
  INVESTIGATING: 'under-review',
  NEEDS_MORE_INFO: 'under-review',
  PLANNED: 'planned',
  REPORTED: 'under-review',
  WORKAROUND_AVAILABLE: 'under-review',
}

const STATUSES = Object.keys(STAGE_OF) as IssueStatus[]

/** The stage players see, or `null` for an archived item. */
export const publicStage = (status: IssueStatus): null | PublicStage =>
  PUBLIC_STAGES.find((stage) => stage.id === STAGE_OF[status]) ?? null

/** The internal statuses shown as `stage`. */
export const statusesFor = (stage: PublicStageId): IssueStatus[] =>
  STATUSES.filter((status) => STAGE_OF[status] === stage)

/** Off the board, the list and the hub, but still reachable by link. */
export const ARCHIVED_STATUSES: IssueStatus[] = STATUSES.filter(
  (status) => STAGE_OF[status] === null,
)
