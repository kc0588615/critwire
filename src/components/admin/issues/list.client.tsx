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

type Props = ListViewClientProps & ComponentProps<typeof IssuesKanban>

export default function IssuesListViewClient({
  initialColumns,
  ...props
}: Props) {
  const [mode, setMode] = useState<'kanban' | 'table'>('kanban')

  return (
    <div className="flex min-h-screen flex-col overflow-y-auto">
      <div className="mt-4 mr-8 flex self-end gap-1">
        <Button
          buttonStyle="tab"
          className={cn('my-0', mode === 'kanban' && 'bg-zinc-200 dark:bg-zinc-800')}
          onClick={() => setMode('kanban')}
          size="small"
        >
          Kanban
        </Button>
        <Button
          buttonStyle="tab"
          className={cn('my-0', mode === 'table' && 'bg-zinc-200 dark:bg-zinc-800')}
          onClick={() => setMode('table')}
          size="small"
        >
          Table
        </Button>
      </div>

      {mode === 'kanban' ? (
        <Gutter className="flex flex-1 flex-col">
          <header className="list-header mb-4">
            <div className="list-header__content">
              <div className="list-header__title-and-actions">
                <h1 className="list-header__title">Issues</h1>
                <div className="list-header__title-actions">
                  {props.hasCreatePermission ? (
                    <Button
                      aria-label="Create new Issue"
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
          <IssuesKanban className="min-h-0 flex-1" initialColumns={initialColumns} />
        </Gutter>
      ) : (
        <DefaultListView {...props} />
      )}
    </div>
  )
}
