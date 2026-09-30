'use client'

import { useQueryStates } from 'nuqs'
import React from 'react'

import { FEEDBACK_TYPE_OPTIONS, ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { feedbackSearchParams } from '@/lib/game-portal/feedbackSearchParams'
import { PUBLIC_STAGES } from '@/lib/game-portal/stages'

/** A select whose empty option means "all"; picking one returns to page 1. */
const FilterSelect: React.FC<{
  all?: string
  label: string
  onChange: (value: null | string) => void
  options: readonly { label: string; value: string }[]
  value: null | string
}> = ({ all, label, onChange, options, value }) => (
  <label>
    <span className="sr-only">{label}</span>
    <select
      className="fs-input fs-select"
      onChange={(e) => onChange(e.target.value || null)}
      value={value ?? ''}
    >
      {all ? <option value="">{all}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </label>
)

const TYPE_OPTIONS = FEEDBACK_TYPE_OPTIONS.map(({ label, value }) => ({ label, value: value.toLowerCase() }))
const STAGE_OPTIONS = PUBLIC_STAGES.map(({ id, label }) => ({ label, value: id }))
const SORT_OPTIONS = [
  { label: 'Most upvoted', value: 'top' },
  { label: 'Latest', value: 'latest' },
]

/**
 * URL-state filter bar (nuqs). shallow:false so changes re-run the
 * Server Component query. The board has its own columns per stage, so
 * it only filters by type.
 */
export const FeedbackFilters: React.FC = () => {
  const [params, setParams] = useQueryStates(feedbackSearchParams, { shallow: false })
  const board = params.view === 'board'

  const typeFilter = (
    <FilterSelect
      all="All types"
      label="Type"
      onChange={(value) => void setParams({ page: null, type: value as typeof params.type })}
      options={TYPE_OPTIONS}
      value={params.type}
    />
  )

  return (
    <form
      className="fs-filters"
      onSubmit={(e) => {
        e.preventDefault()
        const q = (new FormData(e.currentTarget).get('q') as string) ?? ''
        void setParams({ page: null, q: q || null })
      }}
    >
      {board ? (
        typeFilter
      ) : (
        <>
          <label className="fs-filters-search">
            <span className="sr-only">Search feedback</span>
            <input
              className="fs-input"
              defaultValue={params.q}
              key={params.q}
              name="q"
              placeholder="Search feedback…"
              type="search"
            />
          </label>
          {typeFilter}
          <FilterSelect
            all="All stages"
            label="Stage"
            onChange={(value) => void setParams({ page: null, stage: value as typeof params.stage })}
            options={STAGE_OPTIONS}
            value={params.stage}
          />
          <FilterSelect
            all="All categories"
            label="Category"
            onChange={(value) => void setParams({ category: value as typeof params.category, page: null })}
            options={ISSUE_CATEGORY_OPTIONS}
            value={params.category}
          />
          <FilterSelect
            label="Sort by"
            onChange={(value) => void setParams({ page: null, sort: value as typeof params.sort })}
            options={SORT_OPTIONS}
            value={params.sort}
          />
        </>
      )}
      <button
        className="fs-btn fs-btn-secondary fs-filters-view"
        onClick={() => void setParams({ view: board ? null : 'board' })}
        type="button"
      >
        {board ? 'List view' : 'Board view'}
      </button>
    </form>
  )
}
