import type { CollectionBeforeChangeHook, TypeWithID } from 'payload'

import { screenText } from '@/lib/moderation/screenText'

type Screened = TypeWithID & { flagged?: boolean | null; flagReasons?: string | null }

/**
 * The content filter on a collection's public text, on every write path (the
 * admin, REST, the Local API and the public forms), so nothing can skip it.
 * `textOf` builds the screened text from a document.
 *
 * It screens on create, and on an update whose merged document's text differs
 * from the stored one's. Unchanged text isn't screened again, so a super
 * admin's approval (unticking `flagged`) sticks. There's no super-admin bypass,
 * and no catch: a screening failure fails the write.
 */
export const screenTextHook =
  <T extends Screened>(textOf: (doc: Partial<T>) => string): CollectionBeforeChangeHook<T> =>
  async ({ data, operation, originalDoc }) => {
    const text = textOf({ ...originalDoc, ...data })
    if (operation === 'update' && originalDoc && text === textOf(originalDoc)) return data

    const { flagged, reasons } = await screenText(text)
    return { ...data, flagged, flagReasons: flagged ? reasons.join('\n') : null }
  }
