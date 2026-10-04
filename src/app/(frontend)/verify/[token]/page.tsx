import type { Metadata } from 'next'

import config from '@payload-config'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import React from 'react'

import { AccountPage } from '@/components/accounts/AccountPage'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { TurnstileField } from '@/components/game/TurnstileField'
import { findPendingUserByToken } from '@/lib/accounts/pendingUser'
import { isOpenSignup } from '@/lib/hosting'

type Args = {
  params: Promise<{ token: string }>
  searchParams: Promise<{ error?: string }>
}

/**
 * Where the verification email lands (§4). Opening it changes nothing, so a
 * mail scanner can't verify an account: the password form posts to
 * `POST /verify/submit`, which verifies and signs in. Rendered per request.
 */
export default async function VerifyPage({ params, searchParams }: Args) {
  await connection()
  if (!isOpenSignup()) notFound()

  const { token } = await params
  const pending = await findPendingUserByToken(await getPayload({ config }), token)

  if (!pending) {
    return (
      <AccountPage
        lede={
          <>
            This link has been used or is invalid. If you’ve already set your password,{' '}
            <Link className="cw-link" href="/admin/login">
              sign in
            </Link>
            .
          </>
        }
        title="This link doesn’t work"
      />
    )
  }

  const { error } = await searchParams

  return (
    <AccountPage
      lede="Your email is confirmed once you set it. Then you’ll confirm the Terms and set up your portal."
      notices={
        error === '1' ? (
          <FormNotice tone="error">
            Your password wasn’t set. Use 8 to 128 characters and try again.
          </FormNotice>
        ) : null
      }
      title="Choose a password"
    >
      <form action="/verify/submit" className="fs-form" method="post">
        <input name="token" type="hidden" value={token} />
        <FormField id="email" label="Email">
          {(control) => (
            <input {...control} autoComplete="username" className="fs-input" readOnly type="email" value={pending.email} />
          )}
        </FormField>
        <FormField hint="At least 8 characters." id="password" label="Password">
          {(control) => (
            <input
              {...control}
              autoComplete="new-password"
              className="fs-input"
              maxLength={128}
              minLength={8}
              name="password"
              required
              type="password"
            />
          )}
        </FormField>

        <TurnstileField />

        <button className="cw-btn" type="submit">
          Set password and continue
        </button>
      </form>
    </AccountPage>
  )
}

export const metadata: Metadata = {
  referrer: 'no-referrer',
  robots: { index: false },
  title: 'Choose a password',
}
