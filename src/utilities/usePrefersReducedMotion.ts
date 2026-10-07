import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

const subscribe = (onChange: () => void) => {
  const media = matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/**
 * Whether the visitor asks for reduced motion, for animations CSS can't
 * reach (the Web Animations API). False while rendering on the server.
 */
export const usePrefersReducedMotion = (): boolean =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  )
