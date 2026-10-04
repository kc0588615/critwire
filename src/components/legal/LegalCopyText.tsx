import React from 'react'

import type { LegalCopyPart } from '@/lib/legal/copy'
import { LEGAL_LINKS } from '@/lib/legal/paths'

/**
 * A legal sentence from `@/lib/legal/copy`, with each document it names
 * linked by its title. The links open in a new tab, so a half-filled form
 * stays as it is.
 */
export const LegalCopyText: React.FC<{ parts: readonly LegalCopyPart[] }> = ({ parts }) =>
  parts.map((part, index) =>
    typeof part === 'string' ? (
      <React.Fragment key={index}>{part}</React.Fragment>
    ) : (
      <a className="fs-link" href={LEGAL_LINKS[part.document].href} key={index} rel="noopener" target="_blank">
        {LEGAL_LINKS[part.document].title}
      </a>
    ),
  )
