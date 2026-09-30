import { ValidationError } from 'payload'

/**
 * The field a unique-index violation names, when `error` is one on
 * `collection` (`@payloadcms/drizzle`'s `handleUpsertError` turns them into
 * a `ValidationError`); otherwise `undefined`.
 */
export const uniqueViolationPath = (error: unknown, collection: string): string | undefined =>
  error instanceof ValidationError && error.data.collection === collection
    ? error.data.errors[0]?.path
    : undefined
