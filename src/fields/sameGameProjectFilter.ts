import type { FilterOptionsProps, Where } from 'payload'
import { extractID } from 'payload/shared'

/**
 * Relationship `filterOptions` limiting choices to documents in the same
 * game project as the document being edited; nothing until one is set.
 */
export const sameGameProjectFilter = ({ data }: FilterOptionsProps): false | Where => {
  const project = (data as { gameProject?: null | number | { id: number } } | undefined)
    ?.gameProject
  return project ? { gameProject: { equals: extractID(project) } } : false
}
