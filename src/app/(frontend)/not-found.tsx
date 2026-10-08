import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div className="cw-shell cw-not-found">
      <h1 className="cw-not-found-title">404</h1>
      <p className="cw-not-found-text">There’s no page at this address.</p>
      <Link className="fs-btn fs-btn-primary" href="/">
        Go to the home page
      </Link>
    </div>
  )
}

export const metadata: Metadata = {
  title: 'Page not found',
}
