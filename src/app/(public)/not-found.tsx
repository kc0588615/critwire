import Link from 'next/link'
import React from 'react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="opacity-70">This page could not be found.</p>
      <Link className="underline" href="/">
        Go home
      </Link>
    </div>
  )
}
