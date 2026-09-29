import React from 'react'

import { resolveSiteAction } from '../../actions'
import type { FinalCTASlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SiteActionLink, SiteArtBand } from '../ui'

/** The closing call: the art as a band, the text below it on the page. */
export const FinalCTASection: React.FC<{ ctx: SiteRenderContext; value: FinalCTASlot }> = ({
  ctx,
  value,
}) => {
  if (!value.enabled) return null
  const primary = resolveSiteAction(value.primaryAction, ctx.project)
  const secondary = resolveSiteAction(value.secondaryAction, ctx.project)
  if (!primary && !secondary) return null

  return (
    <section aria-labelledby="fs-final-cta-heading" className="fs-section">
      <div className="fs-shell">
        <SiteArtBand ctx={ctx} id={value.background} />
        <div className="fs-band-text">
          <h2 className="fs-h2" id="fs-final-cta-heading">
            {value.heading ?? `Play ${ctx.project.name}`}
          </h2>
          {value.subheading ? (
            <p className="fs-lead mt-4 text-[var(--fs-muted-fg)]">{value.subheading}</p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-3">
            <SiteActionLink action={primary} variant="primary" />
            <SiteActionLink action={secondary} variant="secondary" />
          </div>
        </div>
      </div>
    </section>
  )
}
