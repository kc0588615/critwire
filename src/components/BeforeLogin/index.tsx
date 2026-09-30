import Link from 'next/link'
import React from 'react'

import { isOpenSignup, SIGNUP_PATH } from '@/lib/hosting'

/** Above the sign-in form. The login view reads the session, so this renders per request (P3). */
const BeforeLogin: React.FC = () => {
  return (
    <div className="before-login">
      <p>
        <b>Welcome to Critwire.</b>
        {' Sign in to manage your games’ updates, player feedback and contact routing.'}
      </p>
      {isOpenSignup() ? (
        <p>
          {'New to Critwire? '}
          <Link href={SIGNUP_PATH}>Create your portal</Link>
        </p>
      ) : null}
    </div>
  )
}

export default BeforeLogin
