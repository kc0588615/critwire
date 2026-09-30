import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import React from 'react'

import { AccountPage } from '@/components/accounts/AccountPage'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { TurnstileField } from '@/components/game/TurnstileField'
import { isOpenSignup } from '@/lib/hosting'

type Args = {
  searchParams: Promise<{ error?: string; submitted?: string }>
}

/**
 * Signup's first step (§5): an email address. The link it sends lets the
 * inbox owner choose a password (`/verify/<token>`). Rendered per request:
 * it reads the signup flag.
 */
export default async function SignupPage({ searchParams }: Args) {
  await connection()
  if (!isOpenSignup()) notFound()

  const { error, submitted } = await searchParams

  if (submitted === '1') {
    return (
      <AccountPage
        lede="If that address can sign up, a link to choose your password is on its way. It can take a minute; check your spam folder too."
        title="Check your inbox"
      >
        <p className="cw-account-lede">
          Already have an account? <Link className="cw-link" href="/admin/login">Sign in</Link>, or{' '}
          <Link className="cw-link" href="/admin/forgot">reset your password</Link>.
        </p>
      </AccountPage>
    )
  }

  return (
    <AccountPage
      lede="A feedback board and updates for your game, on a page that links back to your site. Free during early access."
      notices={
        error === '1' ? (
          <FormNotice tone="error">That didn’t go through. Check your email address and try again.</FormNotice>
        ) : null
      }
      title="Create your portal"
    >
      <form action="/signup/submit" className="fs-form" method="post">
        <FormField hint="We’ll email you a link to choose your password." id="email" label="Email">
          {(control) => (
            <input
              {...control}
              autoComplete="email"
              className="fs-input"
              maxLength={254}
              name="email"
              required
              type="email"
            />
          )}
        </FormField>

        <TurnstileField />

        <button className="cw-btn" type="submit">
          Send my link
        </button>
      </form>
      <p className="cw-account-lede">
        Already have an account? <Link className="cw-link" href="/admin/login">Sign in</Link>
      </p>
    </AccountPage>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Create your portal',
}
