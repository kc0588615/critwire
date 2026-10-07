'use client'

import {
  Button,
  DefaultListView,
  Gutter,
} from '@payloadcms/ui'
import type { ListViewClientProps } from 'payload'
import type { ComponentProps } from 'react'
import React, { useState } from 'react'

import { cn } from '@/utilities/ui'

import { IssuesKanban } from './kanban'

const switchOption = (pressed: boolean): string =>
  cn('issues-list__switch-option', pressed && 'issues-list__switch-option--pressed')

type Props = ListViewClientProps &
  ComponentProps<typeof IssuesKanban> & {
    labels: { plural: string; singular: string }
  }

export default function IssuesListViewClient({
  initialColumns,
  labels,
  tenantFilter,
  ...props
}: Props) {
  const [mode, setMode] = useState<'kanban' | 'table'>('kanban')

  return (
    <div className="issues-list">
      <div className="issues-list__switch">
        <Button
          buttonStyle="tab"
          className={switchOption(mode === 'kanban')}
          onClick={() => setMode('kanban')}
          size="small"
        >
          Kanban
        </Button>
        <Button
          buttonStyle="tab"
          className={switchOption(mode === 'table')}
          onClick={() => setMode('table')}
          size="small"
        >
          Table
        </Button>
      </div>

      {mode === 'kanban' ? (
        <Gutter className="issues-list__body">
          <header className="list-header issues-list__header">
            <div className="list-header__content">
              <div className="list-header__title-and-actions">
                <h1 className="list-header__title">{labels.plural}</h1>
                <div className="list-header__title-actions">
                  {props.hasCreatePermission ? (
                    <Button
                      aria-label={`Create new ${labels.singular}`}
                      buttonStyle="pill"
                      el="link"
                      size="small"
                      to={props.newDocumentURL}
                    >
                      Create New
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </header>
          {props.BeforeListTable}
          {/* The tenant selector re-renders this view with a new filter; the
              key remounts the board, whose columns are seeded state. */}
          <IssuesKanban
            initialColumns={initialColumns}
            key={JSON.stringify(tenantFilter)}
            tenantFilter={tenantFilter}
          />
        </Gutter>
      ) : (
        <DefaultListView {...props} />
      )}
    </div>
  )
}
