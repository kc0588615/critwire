import React from 'react'

/**
 * The outcome of a form or action. Success is a polite status, an error
 * an alert. The text is in fg beside a status shape (a success dot, an
 * error square), so colour never carries the message alone.
 */
export const FormNotice: React.FC<{
  children: React.ReactNode
  className?: string
  tone: 'error' | 'success'
}> = ({ children, className, tone }) => (
  <div
    className={className ? `fs-notice ${className}` : 'fs-notice'}
    data-tone={tone}
    role={tone === 'error' ? 'alert' : 'status'}
  >
    {children}
  </div>
)
