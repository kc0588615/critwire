import type { Metadata } from 'next'

import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import React from 'react'

import { AccountPage } from '@/components/accounts/AccountPage'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { KNOWN_STORE_NAMES } from '@/lib/game-portal/links'
import { isOpenSignup } from '@/lib/hosting'

const STORES = new Intl.ListFormat('en', { type: 'disjunction' }).format(KNOWN_STORE_NAMES)

type Args = {
  searchParams: Promise<{ error?: string; held?: string }>
}

/**
 * A verified user's first stop (§6): the game's name, their website and a
 * store link make their studio and portal (`POST /onboarding/submit`).
 * Rendered per request: it reads the session and the signup flag.
 */
export default async function OnboardingPage({ searchParams }: Args) {
  await connection()
  if (!isOpenSignup()) notFound()

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(`/admin/login?redirect=${encodeURIComponent('/onboarding')}`)
  // Payload never authenticates an unverified user; fail loud if that breaks.
  if (user._verified !== true) throw new Error(`Onboarding: user ${user.id} is signed in but not verified.`)

  const { error, held } = await searchParams

  // The submit route lands here when screening held the new game, so this
  // state is for a user who now has a studio.
  if (held === '1') {
    return (
      <AccountPage
        lede="It isn’t public yet: something in its name needs a quick look from the Critwire team. Once it’s approved, your portal goes live on its own."
        title="Your portal is set up and waiting for a quick review"
      >
        <div>
          <Link className="cw-btn" href="/admin">
            Go to your admin
          </Link>
        </div>
      </AccountPage>
    )
  }

  if (user.tenants?.length) redirect('/admin')

  return (
    <AccountPage
      lede="Three things and your portal is live. You can change all of them later in the admin."
      notices={
        error === 'store' ? (
          <FormNotice tone="error">
            That store link isn’t one we know. Use a link to {STORES}, or leave it empty and add
            other stores in the admin later.
          </FormNotice>
        ) : error === '1' ? (
          <FormNotice tone="error">
            Your portal wasn’t created. Check the fields and try again.
          </FormNotice>
        ) : null
      }
      title="Set up your game’s portal"
    >
      <form action="/onboarding/submit" className="fs-form" method="post">
        <FormField id="name" label="Game name">
          {(control) => (
            <input {...control} className="fs-input" maxLength={80} name="name" required type="text" />
          )}
        </FormField>

        <FormField
          hint="Your studio’s or your game’s own site. Your portal links back to it."
          id="website"
          label="Your website"
        >
          {(control) => (
            <input
              {...control}
              className="fs-input"
              name="website"
              placeholder="https://"
              required
              type="url"
            />
          )}
        </FormField>

        <FormField
          hint={`A link to ${STORES}. It becomes your portal’s “Get the game” button.`}
          id="store"
          label="Store link (optional)"
        >
          {(control) => (
            <input {...control} className="fs-input" name="store" placeholder="https://" type="url" />
          )}
        </FormField>

        <button className="cw-btn" type="submit">
          Create my portal
        </button>
      </form>
    </AccountPage>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Set up your portal',
}
