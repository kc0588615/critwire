import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div className="cw-shell cw-not-found">
      <h1 className="cw-not-found-code">404</h1>
      <p className="cw-not-found-text">There’s no page at this address.</p>
      <Link className="cw-btn" href="/">
        Go to the home page
      </Link>
    </div>
  )
}
