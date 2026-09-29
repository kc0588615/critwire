import React from 'react'

import { resolveSiteActions } from '../../actions'
import type { CommunitySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteActionRow, SiteArtBand } from '../ui'

export const CommunitySection: React.FC<{ ctx: SiteRenderContext; value: CommunitySlot }> = ({
  ctx,
  value,
}) => {
  if (!value.enabled) return null
  const actions = resolveSiteActions(value.actions, ctx.project)
  const body = value.body
  if (!body && actions.length === 0) return null
  const heading = value.heading ?? 'Join the community'

  // The banner: the art as a band, the text centred below it, never over it.
  if (value.variant === 'artworkBanner') {
    return (
      <section aria-labelledby="fs-community-heading" className="fs-section">
        <div className="fs-shell">
          <SiteArtBand ctx={ctx} id={value.background} />
          <div className="fs-band-text fs-band-text-center">
            <h2 className="fs-h2" id="fs-community-heading">
              {heading}
            </h2>
            {body ? <p className="fs-lead mt-4 text-[var(--fs-muted-fg)]">{body}</p> : null}
            <div className="mt-8">
              <SiteActionRow actions={actions} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="fs-community-heading" className="fs-section">
      <div className="fs-shell fs-community-split">
        <SectionHeader heading={heading} id="fs-community-heading" intro={body} />
        <SiteActionRow actions={actions} />
      </div>
    </section>
  )
}
