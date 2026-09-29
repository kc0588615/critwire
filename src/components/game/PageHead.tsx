import React from 'react'

/**
 * The head of every portal ops page: the page's h1, one line saying
 * what the page is for, and an optional action beside it.
 */
export const PageHead: React.FC<{
  action?: React.ReactNode
  purpose: React.ReactNode
  title: string
}> = ({ action, purpose, title }) => (
  <div className="fs-page-head">
    <div>
      <h1 className="fs-page-title">{title}</h1>
      <p className="fs-lead mt-3 text-[var(--fs-muted-fg)]">{purpose}</p>
    </div>
    {action ? <div className="fs-page-head-action">{action}</div> : null}
  </div>
)
