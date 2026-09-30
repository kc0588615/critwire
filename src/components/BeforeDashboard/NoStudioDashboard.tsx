import Link from 'next/link'
import React from 'react'

import { isOpenSignup } from '@/lib/hosting'

import { baseClass } from './baseClass'

/** A signed-in user who belongs to no studio yet. */
export function NoStudioDashboard() {
  return (
    <div className={baseClass}>
      {isOpenSignup() ? (
        <>
          <h2 className={`${baseClass}__title`}>Welcome to Critwire</h2>
          <p>Name your game and link your website, and your portal is live.</p>
          <Link className={`${baseClass}__action`} href="/onboarding">
            Set up your portal
          </Link>
        </>
      ) : (
        <>
          <h2 className={`${baseClass}__title`}>You’re not in a studio yet</h2>
          <p>Ask the person who runs this site to add you to your studio.</p>
        </>
      )}
    </div>
  )
}
