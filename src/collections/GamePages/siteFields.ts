import type { Field } from 'payload'

import { HEX_COLOR_RE } from '../../site-templates/flagship-game-v1/schema/contrast'
import { siteActionRefSchema } from '../../site-templates/flagship-game-v1/schema/refs'
import {
  adaptiveKindSchema,
  communityVariantSchema,
  featuresVariantSchema,
  galleryVariantSchema,
  heroVariantSchema,
  knownIssuesVariantSchema,
} from '../../site-templates/flagship-game-v1/schema/slots'
import {
  DEFAULT_THEME_COLORS,
  siteDensitySchema,
  siteMotionSchema,
  siteShapeSchema,
  siteTypographySchema,
} from '../../site-templates/flagship-game-v1/schema/theme'

/**
 * Payload authoring fields for the flagship-game-v1 site configuration.
 * The Zod schemas in src/site-templates/flagship-game-v1/schema are
 * canonical — select options here are DERIVED from the Zod enums, and a
 * parity test asserts the field tree matches the schema keys, so the
 * two can never silently diverge. Nothing in this group is required:
 * drafts may be incomplete; publishing runs the full Zod validation
 * (see validatePublishedSiteConfig).
 */

const labelize = (value: string): string =>
  value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const enumOptions = (values: readonly string[]): { label: string; value: string }[] =>
  values.map((value) => ({ label: labelize(value), value }))

const selectField = (
  name: string,
  values: readonly string[],
  defaultValue?: string,
): Field => ({
  name,
  type: 'select',
  defaultValue,
  options: enumOptions(values),
})

const textField = (name: string, maxLength: number, description?: string): Field => ({
  name,
  type: 'text',
  admin: description ? { description } : undefined,
  maxLength,
})

const textareaField = (name: string, maxLength: number, description?: string): Field => ({
  name,
  type: 'textarea',
  admin: description ? { description } : undefined,
  maxLength,
})

const checkboxField = (name: string, defaultValue: boolean): Field => ({
  name,
  type: 'checkbox',
  defaultValue,
})

const mediaField = (name: string): Field => ({
  name,
  type: 'upload',
  relationTo: 'media',
})

/** An approved action ref plus optional label — never a raw URL. */
const actionFields = (): Field[] => [
  selectField('ref', siteActionRefSchema.options),
  textField('label', 40, 'Optional label override.'),
]

const actionGroup = (name: string): Field => ({
  name,
  type: 'group',
  fields: actionFields(),
})

const actionArray = (name: string, maxRows: number): Field => ({
  name,
  type: 'array',
  fields: actionFields(),
  maxRows,
})

const hexColorField = (name: string, defaultValue: string): Field => ({
  name,
  type: 'text',
  defaultValue,
  validate: (value: null | string | string[] | undefined) => {
    if (value == null || value === '') return true
    if (typeof value !== 'string' || !HEX_COLOR_RE.test(value)) {
      return 'Must be a 6-digit hex color like #22d3ee.'
    }
    return true
  },
})

export const templateField: Field = {
  // No value = legacy block rendering. New pages default to the
  // flagship template; existing pages keep rendering their blocks
  // until this is set and the page is published.
  name: 'template',
  type: 'select',
  admin: {
    description: 'Which renderer this page uses. Empty = legacy blocks.',
    position: 'sidebar',
  },
  defaultValue: 'flagship-game-v1',
  options: [{ label: 'Flagship Game v1', value: 'flagship-game-v1' }],
}

export const schemaVersionField: Field = {
  name: 'schemaVersion',
  type: 'number',
  admin: {
    position: 'sidebar',
    readOnly: true,
  },
  defaultValue: 1,
}

export const generationField: Field = {
  // Written by the AI generation endpoint (rollout step 3); read-only
  // provenance in the admin UI.
  name: 'generation',
  type: 'group',
  admin: {
    description: 'AI generation provenance — set by the site generator.',
  },
  fields: [
    { name: 'model', type: 'text', admin: { readOnly: true } },
    { name: 'prompt', type: 'textarea', admin: { readOnly: true } },
    { name: 'generatedAt', type: 'date', admin: { readOnly: true } },
    {
      name: 'changeSummary',
      type: 'array',
      admin: { readOnly: true },
      fields: [{ name: 'item', type: 'text' }],
    },
  ],
}

export const siteField: Field = {
  name: 'site',
  type: 'group',
  admin: {
    description:
      'Flagship template configuration. Section order is fixed by the template; these fields control content, variants, and theme.',
  },
  fields: [
    {
      name: 'nav',
      type: 'group',
      fields: [actionArray('links', 5), actionGroup('cta')],
    },
    {
      name: 'theme',
      type: 'group',
      fields: [
        {
          name: 'colors',
          type: 'group',
          admin: {
            description: 'Semantic tokens. WCAG contrast is enforced on publish.',
          },
          fields: [
            hexColorField('background', DEFAULT_THEME_COLORS.background),
            hexColorField('foreground', DEFAULT_THEME_COLORS.foreground),
            hexColorField('mutedForeground', DEFAULT_THEME_COLORS.mutedForeground),
            hexColorField('surface', DEFAULT_THEME_COLORS.surface),
            hexColorField('accent', DEFAULT_THEME_COLORS.accent),
            hexColorField('accentForeground', DEFAULT_THEME_COLORS.accentForeground),
            hexColorField('border', DEFAULT_THEME_COLORS.border),
            hexColorField('success', DEFAULT_THEME_COLORS.success),
            hexColorField('warning', DEFAULT_THEME_COLORS.warning),
            hexColorField('error', DEFAULT_THEME_COLORS.error),
          ],
        },
        selectField('typography', siteTypographySchema.options, 'modern'),
        selectField('shape', siteShapeSchema.options, 'balanced'),
        selectField('density', siteDensitySchema.options, 'cinematic'),
        selectField('motion', siteMotionSchema.options, 'subtle'),
      ],
    },
    {
      name: 'hero',
      type: 'group',
      fields: [
        selectField('variant', heroVariantSchema.options, 'leftEditorial'),
        textField('eyebrow', 60),
        textField('heading', 90, 'Falls back to the project name.'),
        textareaField('tagline', 240, 'Falls back to the project description.'),
        checkboxField('showLogo', true),
        mediaField('backgroundMedia'),
        actionGroup('primaryAction'),
        actionGroup('secondaryAction'),
      ],
    },
    {
      name: 'availability',
      type: 'group',
      admin: {
        description: 'Platform facts come from the game project — this controls presentation.',
      },
      fields: [checkboxField('enabled', true), textField('heading', 80), textField('note', 200)],
    },
    {
      name: 'features',
      type: 'group',
      fields: [
        selectField('variant', featuresVariantSchema.options, 'cardGrid'),
        textField('heading', 80),
        textareaField('intro', 280),
        {
          name: 'items',
          type: 'array',
          fields: [textField('title', 60), textareaField('body', 280), mediaField('media')],
          maxRows: 6,
        },
      ],
    },
    {
      name: 'trailer',
      type: 'group',
      admin: {
        description: 'The video URL is the project links.trailer fact.',
      },
      fields: [checkboxField('enabled', true), textField('heading', 80), mediaField('poster')],
    },
    {
      name: 'gallery',
      type: 'group',
      fields: [
        selectField('variant', galleryVariantSchema.options, 'editorialMosaic'),
        textField('heading', 80),
        {
          name: 'items',
          type: 'array',
          fields: [mediaField('media'), textField('alt', 160), textField('caption', 140)],
          maxRows: 12,
        },
      ],
    },
    {
      name: 'adaptive',
      type: 'group',
      fields: [
        selectField('kind', adaptiveKindSchema.options, 'story'),
        textField('heading', 90),
        textareaField('body', 1400),
        mediaField('media'),
        {
          name: 'items',
          type: 'array',
          fields: [textField('title', 60), textareaField('body', 240)],
          maxRows: 6,
        },
      ],
    },
    {
      name: 'latestUpdate',
      type: 'group',
      fields: [checkboxField('enabled', true), textField('heading', 80)],
    },
    {
      name: 'knownIssues',
      type: 'group',
      fields: [
        checkboxField('enabled', true),
        selectField('variant', knownIssuesVariantSchema.options, 'compact'),
        textField('heading', 80),
      ],
    },
    {
      name: 'community',
      type: 'group',
      fields: [
        checkboxField('enabled', true),
        selectField('variant', communityVariantSchema.options, 'split'),
        textField('heading', 90),
        textareaField('body', 400),
        mediaField('background'),
        actionArray('actions', 3),
      ],
    },
    {
      name: 'finalCta',
      type: 'group',
      fields: [
        checkboxField('enabled', true),
        textField('heading', 90),
        textareaField('subheading', 200),
        mediaField('background'),
        actionGroup('primaryAction'),
        actionGroup('secondaryAction'),
      ],
    },
    {
      name: 'footer',
      type: 'group',
      fields: [textField('tagline', 140), checkboxField('showLegalLinks', true)],
    },
  ],
}
