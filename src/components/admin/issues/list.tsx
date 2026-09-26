import type { PaginatedDocs } from 'payload'
import type { ListViewServerProps } from 'payload'

import type { Issue } from '@/payload-types'

import IssuesListViewClient from './list.client'
import { ISSUE_KANBAN_PAGE_SIZE, ISSUE_KANBAN_STATUSES, type IssueStatus } from './constants'

const emptyPage = (): PaginatedDocs<Issue> => ({
  docs: [],
  hasNextPage: false,
  hasPrevPage: false,
  limit: ISSUE_KANBAN_PAGE_SIZE,
  nextPage: null,
  page: 1,
  pagingCounter: 1,
  prevPage: null,
  totalDocs: 0,
  totalPages: 1,
})

export default async function IssuesListView(props: ListViewServerProps) {
  // Payload hands a server list view its server-only props too (config
  // with access functions, the Payload instance, ...). Only the client
  // props may cross into the client component.
  const {
    collectionConfig: _collectionConfig,
    data: _data,
    i18n: _i18n,
    limit: _limit,
    listSearchableFields: _listSearchableFields,
    locale: _locale,
    params: _params,
    payload,
    permissions: _permissions,
    searchParams: _searchParams,
    user,
    ...clientProps
  } = props

  const results = await Promise.all(
    ISSUE_KANBAN_STATUSES.map(async (status) => {
      try {
        const result = await payload.find({
          collection: 'issues',
          depth: 1,
          limit: ISSUE_KANBAN_PAGE_SIZE,
          overrideAccess: false,
          page: 1,
          sort: '_order',
          user: user ?? undefined,
          where: { status: { equals: status } },
        })
        return { result: result as PaginatedDocs<Issue>, status }
      } catch {
        return { result: emptyPage(), status }
      }
    }),
  )

  const initialColumns = Object.fromEntries(
    results.map(({ result, status }) => [status, result]),
  ) as Record<IssueStatus, PaginatedDocs<Issue>>

  return <IssuesListViewClient {...clientProps} initialColumns={initialColumns} />
}
