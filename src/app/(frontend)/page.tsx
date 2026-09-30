import type { Metadata } from 'next'

import { connection } from 'next/server'
import React from 'react'

import { MarketingHome } from '@/components/marketing/MarketingHome'
import { getContactHref } from '@/components/marketing/links'
import { isOpenSignup, SIGNUP_PATH } from '@/lib/hosting'

/**
 * Rendered per request: the Contact and signup links read the runtime
 * environment, and a prerender would bake in the build's (empty, in Docker).
 */
export default async function HomePage() {
  await connection()
  return (
    <MarketingHome
      contactHref={getContactHref()}
      signupHref={isOpenSignup() ? SIGNUP_PATH : null}
    />
  )
}

export const metadata: Metadata = {
  description:
    'Critwire adds a player feedback board and updates with RSS to the website your indie game already has. Free to self-host (MIT), with free hosted early access.',
  title: { absolute: 'Critwire: player feedback and updates for indie games' },
}
