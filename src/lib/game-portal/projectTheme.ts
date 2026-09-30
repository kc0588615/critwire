import type { GameProject } from '@/payload-types'

import * as Sentry from '@sentry/nextjs'

import { DEFAULT_THEME, mergeTheme, siteThemeSchema, type SiteThemeV1 } from './theme'

/**
 * The theme a project's portal renders with: its stored theme over the
 * default (`mergeTheme`, as `validateProjectTheme` checks it on save).
 * Saves are validated, so a failure here means drift (e.g. a schema
 * change without a migration): it's reported, and the portal falls back
 * to the default theme rather than erroring. Kept apart from `theme.ts`
 * so specs and the Payload config can import the schema without Sentry.
 */
export const resolveProjectTheme = (project: Pick<GameProject, 'id' | 'theme'>): SiteThemeV1 => {
  const parsed = siteThemeSchema.safeParse(mergeTheme(project.theme))
  if (parsed.success) return parsed.data

  Sentry.captureException(new Error(`Stored theme for game-project ${project.id} failed validation`), {
    extra: { issues: parsed.error.issues.slice(0, 10) },
  })
  return DEFAULT_THEME
}
