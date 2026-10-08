import { getDiscordConfig } from '@/lib/discord/config'
import { isOpenSignup, isPoweredByShown } from '@/lib/hosting'
import { assertLegalDocuments } from '@/lib/legal/documents'
import { getLimits } from '@/lib/limits'
import { assertNoLegacyPublicMedia } from '@/lib/media/storage'

/**
 * Checks the environment once at boot, in the Node.js runtime only.
 * Next logs an error thrown from `register()` but keeps the server up,
 * answering 500 on every route, so a bad value exits the process instead.
 */
export function checkEnvironment(): void {
  try {
    isOpenSignup()
    isPoweredByShown()
    assertNoLegacyPublicMedia()
    getLimits()
    getDiscordConfig()
    assertLegalDocuments()
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}
