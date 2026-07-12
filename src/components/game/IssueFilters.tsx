'use client'

import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs'
import React from 'react'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'

/**
 * URL-state filter bar (nuqs). shallow:false so changes re-run the
 * Server Component query.
 */
export const IssueFilters: React.FC = () => {
  const [params, setParams] = useQueryStates(
    {
      category: parseAsString.withDefault(''),
      page: parseAsInteger.withDefault(1),
      q: parseAsString.withDefault(''),
      sort: parseAsString.withDefault('top'),
      view: parseAsString.withDefault('list'),
    },
    { shallow: false },
  )

  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        const q = (new FormData(e.currentTarget).get('q') as string) ?? ''
        void setParams({ page: 1, q: q || null })
      }}
    >
      <input
        className="cc-input w-48 px-3 py-2 text-sm"
        defaultValue={params.q}
        key={params.q}
        name="q"
        placeholder="Search issues…"
        type="search"
      />
      <select
        className="cc-input w-auto px-2 py-2 text-sm"
        onChange={(e) => void setParams({ category: e.target.value || null, page: 1 })}
        value={params.category}
      >
        <option value="">All categories</option>
        {ISSUE_CATEGORY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className="cc-input w-auto px-2 py-2 text-sm"
        onChange={(e) =>
          void setParams({ page: 1, sort: e.target.value === 'top' ? null : e.target.value })
        }
        value={params.sort}
      >
        <option value="top">Most upvoted</option>
        <option value="latest">Latest</option>
      </select>
      <button
        className="cc-button-secondary min-h-0 px-3 py-2 text-sm"
        onClick={() => void setParams({ view: params.view === 'board' ? null : 'board' })}
        type="button"
      >
        {params.view === 'board' ? 'List view' : 'Board view'}
      </button>
    </form>
  )
}
