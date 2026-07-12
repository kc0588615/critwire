'use client'

/**
 * Admin Issues kanban — adapted from
 * https://gist.github.com/Dan6erbond/e0dd89744c21aaa8c25925717d589eeb
 *
 * DnD-Kit + Payload orderable fractional indexing (`_order`).
 * Cards and columns are Issues-specific; drag/order logic is generic.
 */

import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import type { PaginatedDocs } from 'payload'
import { generateKeyBetween } from 'payload/shared'
import React, { useCallback, useRef, useState } from 'react'

import type { Issue } from '@/payload-types'

import { ISSUE_STATUS_OPTIONS } from '@/collections/options'
import { cn } from '@/utilities/ui'

export type IssueStatus = (typeof ISSUE_STATUS_OPTIONS)[number]['value']

type ColumnDef = {
  id: IssueStatus
  label: string
  pillBg: string
  pillText: string
}

type ColumnState = PaginatedDocs<Issue>

const PILL_STYLES: Record<IssueStatus, Pick<ColumnDef, 'pillBg' | 'pillText'>> = {
  REPORTED: { pillBg: 'bg-blue-500/10', pillText: 'text-blue-400' },
  INVESTIGATING: { pillBg: 'bg-violet-500/10', pillText: 'text-violet-400' },
  NEEDS_MORE_INFO: { pillBg: 'bg-amber-500/10', pillText: 'text-amber-400' },
  WORKAROUND_AVAILABLE: { pillBg: 'bg-cyan-500/10', pillText: 'text-cyan-400' },
  PLANNED: { pillBg: 'bg-indigo-500/10', pillText: 'text-indigo-400' },
  FIXED: { pillBg: 'bg-emerald-500/10', pillText: 'text-emerald-400' },
  CLOSED: { pillBg: 'bg-zinc-500/10', pillText: 'text-zinc-400' },
}

const COLUMNS: ColumnDef[] = ISSUE_STATUS_OPTIONS.map((status) => ({
  id: status.value,
  label: status.label,
  ...PILL_STYLES[status.value],
}))

const COLUMN_LIMIT = 20

async function updateIssue(
  issueId: number | string,
  data: { _order?: string; status?: IssueStatus },
): Promise<void> {
  const res = await fetch(`/api/issues/${issueId}`, {
    body: JSON.stringify(data),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    method: 'PATCH',
  })
  if (!res.ok) {
    throw new Error(`Failed to update issue ${issueId}: ${res.status}`)
  }
}

async function fetchMoreIssues(status: IssueStatus, page: number): Promise<ColumnState> {
  const params = new URLSearchParams({
    depth: '0',
    limit: String(COLUMN_LIMIT),
    page: String(page),
    sort: '_order',
    'where[status][equals]': status,
  })
  const res = await fetch(`/api/issues?${params}`, { credentials: 'include' })
  if (!res.ok) throw new Error(`Failed to load issues: ${res.status}`)
  return res.json() as Promise<ColumnState>
}

function orderKeyForIndex(docs: Issue[], index: number): string {
  const prev = (docs[index - 1]?._order ?? null) as null | string
  const next = (docs[index + 1]?._order ?? null) as null | string
  return generateKeyBetween(prev, next)
}

function isColumnId(id: number | string): id is IssueStatus {
  return typeof id === 'string' && COLUMNS.some((c) => c.id === id)
}

function resolveColumn(
  overId: number | string,
  columns: Record<IssueStatus, ColumnState>,
): IssueStatus | null {
  if (isColumnId(overId)) return overId
  for (const col of COLUMNS) {
    if (columns[col.id].docs.some((issue) => issue.id === overId)) return col.id
  }
  return null
}

function projectLabel(issue: Issue): null | string {
  const project = issue.gameProject
  if (project && typeof project === 'object' && 'name' in project) {
    return project.name
  }
  return null
}

function IssueCard({
  attributes,
  isDragging = false,
  issue,
  listeners,
  setNodeRef,
  style,
}: {
  issue: Issue
  isDragging?: boolean
  listeners?: ReturnType<typeof useSortable>['listeners']
  attributes?: ReturnType<typeof useSortable>['attributes']
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
}) {
  const game = projectLabel(issue)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'card flex-col gap-2',
        'cursor-grab active:cursor-grabbing select-none',
        'transition-opacity duration-150',
        isDragging ? 'opacity-30' : 'opacity-100',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={cn('text-sm font-semibold leading-snug', 'text-(--theme-elevation-1000)')}>
          {issue.isPinned ? '📌 ' : ''}
          {issue.title}
        </p>
        <span
          className={cn(
            'shrink-0 rounded px-1.5 py-0.5 font-mono text-xs',
            'bg-(--theme-elevation-100) text-(--theme-elevation-800)',
          )}
        >
          ▲ {issue.upvoteCount ?? 0}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs text-(--theme-elevation-400)">
        {game ? <span>{game}</span> : null}
        {issue.category ? <span>· {issue.category.replaceAll('_', ' ')}</span> : null}
        {issue.isPublic === false ? <span>· private</span> : null}
      </div>

      {issue.summary ? (
        <p className="line-clamp-2 text-xs text-(--theme-elevation-400)">{issue.summary}</p>
      ) : null}

      <Link
        className="text-xs inline-block"
        href={`/admin/collections/issues/${issue.id}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        Open →
      </Link>
    </div>
  )
}

function SortableIssueCard({ issue }: { issue: Issue }) {
  const { attributes, isDragging, listeners, setNodeRef, transform, transition } = useSortable({
    data: { issue, type: 'issue' },
    id: issue.id,
  })

  return (
    <IssueCard
      attributes={attributes}
      isDragging={isDragging}
      issue={issue}
      listeners={listeners}
      setNodeRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
    />
  )
}

function KanbanColumn({
  column,
  isOver,
  onLoadMore,
  state,
}: {
  column: ColumnDef
  state: ColumnState
  isOver: boolean
  onLoadMore: () => void
}) {
  const ids = state.docs.map((issue) => issue.id)
  const { setNodeRef } = useDroppable({ id: column.id })

  return (
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className={cn('text-sm font-semibold', 'text-(--theme-elevation-800)')}>
          {column.label}
        </span>
        <span
          className={cn('rounded px-2 py-0.5 font-mono text-xs', column.pillBg, column.pillText)}
        >
          {state.totalDocs}
        </span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className={cn(
            'flex min-h-20 flex-1 flex-col gap-2 rounded border p-2 transition-colors duration-150',
            'border-(--theme-border-color) bg-(--theme-elevation-50)',
            isOver && 'border-(--theme-success-200) bg-(--theme-success-50)',
          )}
        >
          {ids.length === 0 ? (
            <div
              className={cn(
                'flex h-15 items-center justify-center text-xs italic',
                'text-(--theme-elevation-400)',
                isOver && 'text-(--theme-success-500)',
              )}
            >
              {isOver ? 'Drop here' : 'No issues'}
            </div>
          ) : (
            state.docs.map((issue) => <SortableIssueCard key={issue.id} issue={issue} />)
          )}
        </div>
      </SortableContext>

      {state.hasNextPage ? (
        <button
          className={cn(
            'mt-2 w-full rounded border py-1.5 text-xs transition-colors duration-150',
            'border-(--theme-border-color) text-(--theme-elevation-500)',
            'hover:bg-(--theme-elevation-100) hover:text-(--theme-elevation-800)',
          )}
          onClick={onLoadMore}
          type="button"
        >
          Load more ({state.docs.length} / {state.totalDocs})
        </button>
      ) : null}
    </div>
  )
}

export type IssuesKanbanProps = {
  initialColumns: Record<IssueStatus, PaginatedDocs<Issue>>
  className?: string
}

export function IssuesKanban({ className, initialColumns }: IssuesKanbanProps) {
  const [columns, setColumns] = useState<Record<IssueStatus, ColumnState>>(() => ({
    ...initialColumns,
  }))
  const [activeIssue, setActiveIssue] = useState<Issue | null>(null)

  const overColumnRef = useRef<IssueStatus | null>(null)
  const [overColumn, setOverColumnState] = useState<IssueStatus | null>(null)
  const setOverColumn = useCallback((col: IssueStatus | null) => {
    overColumnRef.current = col
    setOverColumnState(col)
  }, [])

  const isDragging = useRef(false)
  const sourceCol = useRef<IssueStatus | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))

  const handleLoadMore = useCallback(
    async (status: IssueStatus) => {
      const nextPage = (columns[status].page ?? 1) + 1
      const result = await fetchMoreIssues(status, nextPage)
      setColumns((prev) => ({
        ...prev,
        [status]: {
          ...result,
          docs: [...prev[status].docs, ...result.docs],
        },
      }))
    },
    [columns],
  )

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    isDragging.current = true
    setColumns((prev) => {
      for (const col of COLUMNS) {
        const issue = prev[col.id].docs.find((doc) => doc.id === active.id)
        if (issue) {
          sourceCol.current = col.id
          setActiveIssue(issue)
          break
        }
      }
      return prev
    })
  }, [])

  const handleDragOver = useCallback(
    ({ over }: DragOverEvent) => {
      if (!isDragging.current) return
      if (!over) {
        setOverColumn(null)
        return
      }
      setColumns((prev) => {
        const col = resolveColumn(over.id as number | string, prev)
        setOverColumn(col !== sourceCol.current ? col : null)
        return prev
      })
    },
    [setOverColumn],
  )

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      isDragging.current = false
      setActiveIssue(null)
      setOverColumn(null)

      const draggedId = active.id as number
      const from = sourceCol.current
      sourceCol.current = null

      if (!over || !from) return

      const overId = over.id as number | string

      setColumns((prev) => {
        const to = resolveColumn(overId, prev)
        if (!to) return prev

        if (from === to) {
          if (isColumnId(overId)) return prev
          const docs = prev[from].docs
          const oldIdx = docs.findIndex((doc) => doc.id === draggedId)
          const newIdx = docs.findIndex((doc) => doc.id === overId)
          if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return prev

          const reordered = arrayMove(docs, oldIdx, newIdx)
          const newOrder = orderKeyForIndex(reordered, newIdx)
          const withOrder = reordered.map((doc, i) =>
            i === newIdx ? { ...doc, _order: newOrder } : doc,
          )

          updateIssue(draggedId, { _order: newOrder }).catch(console.error)

          return { ...prev, [from]: { ...prev[from], docs: withOrder } }
        }

        const issue = prev[from].docs.find((doc) => doc.id === draggedId)
        if (!issue) return prev

        const newFromDocs = prev[from].docs.filter((doc) => doc.id !== draggedId)
        const toDocs = [...prev[to].docs]
        const overIdx = isColumnId(overId)
          ? toDocs.length
          : toDocs.findIndex((doc) => doc.id === overId)
        const insertIdx = overIdx >= 0 ? overIdx : toDocs.length
        toDocs.splice(insertIdx, 0, { ...issue, status: to })
        const newOrder = orderKeyForIndex(toDocs, insertIdx)
        toDocs[insertIdx] = { ...toDocs[insertIdx], _order: newOrder }

        updateIssue(draggedId, { _order: newOrder, status: to }).catch((err) => {
          console.error('Failed to update issue:', err)
        })

        return {
          ...prev,
          [from]: {
            ...prev[from],
            docs: newFromDocs,
            totalDocs: prev[from].totalDocs - 1,
          },
          [to]: {
            ...prev[to],
            docs: toDocs,
            totalDocs: prev[to].totalDocs + 1,
          },
        }
      })
    },
    [setOverColumn],
  )

  return (
    <div className={cn('flex w-full items-stretch overflow-x-auto', className)}>
      <DndContext
        collisionDetection={(args) => {
          const pointerHits = pointerWithin(args)
          return pointerHits.length > 0 ? pointerHits : closestCorners(args)
        }}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragStart={handleDragStart}
        sensors={sensors}
      >
        <div className="flex min-w-max items-stretch gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              column={col}
              isOver={activeIssue !== null && overColumn === col.id}
              key={col.id}
              onLoadMore={() => {
                void handleLoadMore(col.id)
              }}
              state={columns[col.id]}
            />
          ))}
        </div>
        <DragOverlay dropAnimation={{ duration: 120, easing: 'ease' }}>
          {activeIssue ? (
            <div className="rotate-1 shadow-xl">
              <IssueCard issue={activeIssue} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export const ISSUE_KANBAN_STATUSES = ISSUE_STATUS_OPTIONS.map((s) => s.value)
export const ISSUE_KANBAN_PAGE_SIZE = COLUMN_LIMIT
