import React from 'react'

/**
 * The shell every account page shares (signup, verification, onboarding,
 * abuse reports): one narrow column on the canvas with a heading, a lede,
 * the page's notices, then its form. The portal's form components
 * (`FormField`, `FormNotice`, `TurnstileField`) read cw's roles, which
 * `.cw-root` maps onto their `--fs-*` variables (marketing.css).
 */
export const AccountPage: React.FC<{
  children?: React.ReactNode
  lede?: React.ReactNode
  notices?: React.ReactNode
  title: string
}> = ({ children, lede, notices, title }) => (
  <div className="cw-shell cw-account">
    <div className="cw-account-column">
      <h1 className="cw-account-title">{title}</h1>
      {lede ? <p className="cw-account-lede">{lede}</p> : null}
      {notices}
      {children}
    </div>
  </div>
)
