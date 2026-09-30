import type { CollectionBeforeChangeHook, Field } from 'payload'

import { ValidationError } from 'payload'

import {
  DEFAULT_THEME,
  mergeTheme,
  siteDensitySchema,
  siteMotionSchema,
  siteShapeSchema,
  siteThemeSchema,
  siteTypographySchema,
} from '@/lib/game-portal/theme'
import type { GameProject } from '@/payload-types'

/*
 * The field tree is built from the Zod theme schema (colour keys from
 * the default palette, options from the enums, defaults from the
 * schema), so the two can't drift. Values are checked by
 * `validateProjectTheme`, against the schema, on every save.
 */

const selectField = (name: 'density' | 'motion' | 'shape' | 'typography', values: readonly string[]): Field => ({
  name,
  type: 'select',
  defaultValue: DEFAULT_THEME[name],
  options: values.map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value })),
})

export const themeField: Field = {
  name: 'theme',
  type: 'group',
  admin: {
    description:
      'Match your portal to your own site. Colours are checked for readable (WCAG) contrast when you save.',
  },
  fields: [
    {
      name: 'colors',
      type: 'group',
      admin: {
        description: '6-digit hex colours, like #22d3ee.',
      },
      fields: Object.entries(DEFAULT_THEME.colors).map(([name, defaultValue]) => ({
        name,
        type: 'text',
        defaultValue,
      })),
    },
    selectField('typography', siteTypographySchema.options),
    selectField('shape', siteShapeSchema.options),
    selectField('density', siteDensitySchema.options),
    selectField('motion', siteMotionSchema.options),
  ],
}

/**
 * Validates the theme the save will leave behind: the default theme,
 * then the stored theme, then the submitted one (`mergeTheme`), so a
 * partial PATCH is checked whole. Throws on an invalid theme; changes
 * nothing.
 */
export const validateProjectTheme: CollectionBeforeChangeHook<GameProject> = ({
  data,
  originalDoc,
}) => {
  const result = siteThemeSchema.safeParse(mergeTheme(originalDoc?.theme, data?.theme))
  if (!result.success) {
    throw new ValidationError({
      collection: 'game-projects',
      errors: result.error.issues.map((issue) => ({
        message: issue.message,
        path: ['theme', ...issue.path.map(String)].join('.'),
      })),
    })
  }
  return data
}
