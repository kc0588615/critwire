import { getContactHref } from '@/components/marketing/links'
import { isOpenSignup, isPoweredByShown } from '@/lib/hosting'
import { getLimits } from '@/lib/limits'
import { assertNoLegacyPublicMedia } from '@/lib/media/storage'

/**
 * Checks the environment once at boot, in the Node.js runtime only.
 * Next logs an error thrown from `register()` but keeps the server up,
 * answering 500 on every route, so a bad value exits the process instead.
 */
export function checkEnvironment(): void {
  try {
    getContactHref()
    isOpenSignup()
    isPoweredByShown()
    assertNoLegacyPublicMedia()
    getLimits()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
