import type { PatchNote } from '@/payload-types'

/**
 * An update's title in a feed (RSS and JSON Feed) and a Discord post:
 * "<version> — <title>", or the title alone. Apart from `patchNotes.ts`,
 * which reads the database, so the config's hooks and jobs can use it.
 */
export const updateFeedTitle = (note: Pick<PatchNote, 'title' | 'versionLabel'>): string =>
  note.versionLabel ? `${note.versionLabel} — ${note.title}` : note.title
