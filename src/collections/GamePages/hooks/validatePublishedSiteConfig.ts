import type { CollectionBeforeChangeHook } from 'payload'

import { ValidationError } from 'payload'

import type { GamePage } from '../../../payload-types'

import deepMerge from '../../../utilities/deepMerge'
import { normalizeSiteInput } from '../../../site-templates/flagship-game-v1/normalize'
import { siteConfigV1Schema } from '../../../site-templates/flagship-game-v1/schema/config'

/**
 * Publishing a flagship page runs the full canonical Zod validation
 * (variants, limits, action refs, plain-text policy, WCAG contrast).
 * Drafts may be incomplete by design — they are never rendered
 * publicly — so only the publish path is gated.
 */
export const validatePublishedSiteConfig: CollectionBeforeChangeHook<GamePage> = ({
  data,
  originalDoc,
}) => {
  const status = data?._status ?? originalDoc?._status
  const template = data && 'template' in data ? data.template : originalDoc?.template
  if (status !== 'published' || template !== 'flagship-game-v1') return data

  // Local API updates may be partial; merge over the stored document
  // so validation always sees the full configuration.
  const site = deepMerge<unknown, unknown>(originalDoc?.site ?? {}, data?.site ?? {})
  const schemaVersion =
    data && 'schemaVersion' in data ? data.schemaVersion : originalDoc?.schemaVersion
  const { input } = normalizeSiteInput({ schemaVersion, site, template })
  const result = siteConfigV1Schema.safeParse(input)

  if (!result.success) {
    throw new ValidationError({
      collection: 'game-pages',
      errors: result.error.issues.slice(0, 10).map((issue) => ({
        message: issue.message,
        path: ['site', ...issue.path.map(String)].join('.'),
      })),
    })
  }

  return data
}
