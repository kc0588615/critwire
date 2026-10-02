'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

import { isRefSource } from '@/lib/share/platforms'

/**
 * Counts an arrival from a kit link tagged `?ref=` ("Where players come
 * from"). Cached pages ignore query strings on the server, so the browser
 * reports it. Runs on every navigation, since the portal's layout stays
 * mounted across client-side navigation within a game.
 *
 * The URL is the token: `ref` is removed before the ping is sent, so a
 * reload, back or forward, a copied address, or the effect re-running
 * after the strip finds nothing to count. A new arrival at a tagged URL
 * counts again. Unknown values are left alone and never sent.
 */
export const ReferralPing: React.FC<{ gameID: number }> = ({ gameID }) => {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // After this commit's effects: on the first render, the app router
    // patches `history.replaceState` in an ancestor's effect, which runs
    // after this one. Through the patch, the router keeps its history
    // state and `useSearchParams` sees the stripped URL, with no request.
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href)
      const ref = url.searchParams.get('ref')
      if (!isRefSource(ref)) return

      url.searchParams.delete('ref')
      window.history.replaceState(null, '', url)
      // A beacon never affects the page; the server records any failure.
      fetch('/api/referrals', {
        body: JSON.stringify({ game: gameID, ref }),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        method: 'POST',
      }).catch(() => undefined)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [gameID, pathname, searchParams])

  return null
}
