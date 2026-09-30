import Link from 'next/link'
import React from 'react'

/**
 * One feedback item in a divided list (`fs-rows`): the whole row is the
 * link, and its text starts with the title; `children` is the meta line
 * (type, votes, stage), in the fixed columns `portal.css` lays out.
 */
export const FeedbackRow: React.FC<{ children: React.ReactNode; href: string; title: string }> = ({
  children,
  href,
  title,
}) => (
  <li>
    {/* A stage marker in the meta is an empty CSS shape, so it adds no text. */}
    <Link className="fs-issue-row" href={href}>
      <span className="fs-issue-row-title">{title}</span>
      <span className="fs-issue-row-meta">{children}</span>
    </Link>
  </li>
)
