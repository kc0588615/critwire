import { readdirSync } from 'node:fs'
import path from 'node:path'

/**
 * Where local-disk uploads live: outside `public/`, so Next never serves
 * them itself and `/api/media/file/` (which checks access on every
 * request) is the only way to a file. Loaded at boot by
 * `instrumentation-node.ts`, so keep it free of Payload and React imports.
 * `turbopackIgnore` keeps the build from tracing uploads into its output.
 */
export const MEDIA_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'media')

const LEGACY_PUBLIC_MEDIA_DIR = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'public', 'media')

/**
 * Throws while `public/media` still holds files. Next serves everything
 * in `public/` without asking Payload, so a suspended or held studio's
 * files would stay public there.
 */
export function assertNoLegacyPublicMedia(): void {
  let files: string[]
  try {
    files = readdirSync(LEGACY_PUBLIC_MEDIA_DIR)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return
    throw error
  }
  if (files.length === 0) return
  throw new Error(
    `${LEGACY_PUBLIC_MEDIA_DIR} holds ${files.length} file(s). Uploads now live in ${MEDIA_DIR}, and anything ` +
      'left in public/media is served to everyone without access checks. Move them, then start again: ' +
      'mkdir -p media && mv public/media/* media/ && rmdir public/media',
  )
}
