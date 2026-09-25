import React from 'react'

import { resolveSiteAction } from '../../actions'
import type { FinalCTASlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SiteActionLink, SiteMedia } from '../ui'

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
        <div className="fs-panel relative isolate overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-24">
          {typeof value.background === 'number' ? (
            <>
              <div className="absolute inset-0 -z-10">
                <SiteMedia ctx={ctx} fill id={value.background} imgClassName="object-cover" size="100vw" />
              </div>
              <div aria-hidden="true" className="fs-hero-scrim absolute inset-0 -z-10" />
            </>
          ) : null}
          <h2 className="fs-h2 text-4xl sm:text-5xl" id="fs-final-cta-heading">
            {value.heading ?? `Play ${ctx.project.name}`}
          </h2>
          {value.subheading ? (
            <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-[var(--fs-muted-fg)]">
              {value.subheading}
            </p>
          ) : null}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <SiteActionLink action={primary} variant="primary" />
            <SiteActionLink action={secondary} variant="secondary" />
          </div>
        </div>
      </div>
    </section>
  )
}
