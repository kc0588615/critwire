import type { AdminViewServerProps } from 'payload'

import { Banner, Button, Link } from '@payloadcms/ui'
import React from 'react'

import { TurnstileField } from '@/components/game/TurnstileField'
import { isEmailDeliverable } from '@/lib/email/adapter'

const LOGIN = '/admin/login'

/** Payload's form header markup, so the admin's own styles apply. */
const Header: React.FC<{ description: React.ReactNode; heading: string }> = ({ description, heading }) => (
  <div className="form-header">
    <h1>{heading}</h1>
    <p>{description}</p>
  </div>
)

const BackToLogin: React.FC = () => (
  <Link href={LOGIN} prefetch={false}>
    Back to login
  </Link>
)

/**
 * Replaces Payload's `/admin/forgot` (§4a): a plain form behind Turnstile
 * that posts to `POST /forgot-password/submit`, the only way to send a
 * reset email. Without deliverable email it sends users to the site's
 * operator instead.
 */
export default function ForgotPasswordView({ initPageResult, searchParams }: AdminViewServerProps) {
  if (initPageResult.req.user) {
    return (
      <>
        <Header
          description={
            <>
              Change your password from <Link href="/admin/account">your account</Link>.
            </>
          }
          heading="You’re signed in"
        />
        <Button buttonStyle="secondary" el="link" size="large" to="/admin">
          Back to the dashboard
        </Button>
      </>
    )
  }

  if (!isEmailDeliverable()) {
    return (
      <>
        <Header
          description="This site can’t send email, so ask the person who runs it to reset your password."
          heading="Reset your password"
        />
        <BackToLogin />
      </>
    )
  }

  if (searchParams?.submitted === '1') {
    return (
      <>
        <Header
          description="If that address has an account, a link to choose a new password is on its way. It can take a minute; check your spam folder too."
          heading="Check your inbox"
        />
        <BackToLogin />
      </>
    )
  }

  return (
    <>
      <Header
        description="Enter your account’s email address and we’ll send you a link to choose a new password."
        heading="Reset your password"
      />
      {searchParams?.error === '1' ? (
        <Banner type="error">That didn’t go through. Check your email address and try again.</Banner>
      ) : null}
      <form action="/forgot-password/submit" method="post">
        <div className="field-type email">
          <label className="field-label" htmlFor="field-email">
            Email
          </label>
          <div className="field-type__wrap">
            <input autoComplete="email" id="field-email" maxLength={254} name="email" required type="email" />
          </div>
        </div>
        <TurnstileField />
        <Button buttonStyle="primary" size="large" type="submit">
          Send reset link
        </Button>
      </form>
      <BackToLogin />
    </>
  )
}
