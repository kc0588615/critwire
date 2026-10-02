import React from 'react'

/**
 * Every link in an embed: a plain anchor that opens the portal in a new
 * tab. Never `next/link`, which would prefetch on every host page view
 * and navigate inside the frame.
 */
export const EmbedLink: React.FC<{ children: React.ReactNode; className?: string; href: string }> = ({
  children,
  className,
  href,
}) => (
  <a className={className} href={href} rel="noopener" target="_blank">
    {children}
  </a>
)
