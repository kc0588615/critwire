import { getTranslation } from '@payloadcms/translations'
import { headers } from 'next/headers'
import type { ListViewServerProps, PaginatedDocs } from 'payload'
import { createLocalReq } from 'payload'
import { combineWhereConstraints } from 'payload/shared'

import type { Issue } from '@/payload-types'

import IssuesListViewClient from './list.client'
import { ISSUE_KANBAN_PAGE_SIZE, ISSUE_KANBAN_STATUSES, type IssueStatus } from './constants'

export default async function IssuesListView(props: ListViewServerProps) {
  // Payload hands a server list view its server-only props too (config
  // with access functions, the Payload instance, ...). Only the client
  // props may cross into the client component.
  const {
    collectionConfig,
    data: _data,
    i18n,
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

  // The multi-tenant plugin scopes list views through `admin.baseFilter`
  // (the tenant selector's cookie, else the user's studios). Only Payload's
  // default list view applies it, so this custom view calls it the same
  // way; Local API and REST queries never do.
  const req = await createLocalReq(
    { req: { headers: await headers() }, user: user ?? undefined },
    payload,
  )
  const tenantFilter =
    (await collectionConfig.admin.baseFilter?.({
      limit: ISSUE_KANBAN_PAGE_SIZE,
      page: 1,
      req,
      sort: '_order',
    })) ?? null

  const results = await Promise.all(
    ISSUE_KANBAN_STATUSES.map(async (status) => {
      const result = await payload.find({
        collection: 'issues',
        depth: 1,
        limit: ISSUE_KANBAN_PAGE_SIZE,
        overrideAccess: false,
        page: 1,
        sort: '_order',
        user: user ?? undefined,
        where: combineWhereConstraints([{ status: { equals: status } }, tenantFilter ?? undefined]),
      })
      return { result: result as PaginatedDocs<Issue>, status }
    }),
  )

  const initialColumns = Object.fromEntries(
    results.map(({ result, status }) => [status, result]),
  ) as Record<IssueStatus, PaginatedDocs<Issue>>

  return (
    <IssuesListViewClient
      {...clientProps}
      initialColumns={initialColumns}
      labels={{
        plural: getTranslation(collectionConfig.labels.plural, i18n),
        singular: getTranslation(collectionConfig.labels.singular, i18n),
      }}
      tenantFilter={tenantFilter}
    />
  )
}
