import React from 'react'

import { resolveSiteActions } from '../../actions'
import type { CommunitySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteActionRow, SiteMedia } from '../ui'

export const CommunitySection: React.FC<{ ctx: SiteRenderContext; value: CommunitySlot }> = ({
  ctx,
  value,
}) => {
  if (!value.enabled) return null
  const actions = resolveSiteActions(value.actions, ctx.project)
  const body = value.body
  if (!body && actions.length === 0) return null
  const heading = value.heading ?? 'Join the Community'

  if (value.variant === 'artworkBanner') {
    return (
      <section aria-labelledby="fs-community-heading" className="fs-section">
        <div className="fs-shell">
          <div className="fs-panel relative isolate overflow-hidden px-6 py-16 text-center sm:px-12 sm:py-20">
            {typeof value.background === 'number' ? (
              <>
                <div className="absolute inset-0 -z-10">
                  <SiteMedia ctx={ctx} fill id={value.background} imgClassName="object-cover" size="100vw" />
                </div>
                <div aria-hidden="true" className="fs-hero-scrim absolute inset-0 -z-10" />
              </>
            ) : null}
            <h2 className="fs-h2" id="fs-community-heading">
              {heading}
            </h2>
            {body ? (
              <p className="mx-auto mt-4 max-w-xl text-lg leading-8 text-[var(--fs-muted-fg)]">
                {body}
              </p>
            ) : null}
            <div className="mt-8 flex justify-center">
              <SiteActionRow actions={actions} />
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="fs-community-heading" className="fs-section">
      <div className="fs-shell grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <SectionHeader eyebrow="Community" heading={heading} id="fs-community-heading" />
          {body ? (
            <p className="-mt-4 max-w-xl text-lg leading-8 text-[var(--fs-muted-fg)]">{body}</p>
          ) : null}
        </div>
        <div className="fs-panel p-7">
          <SiteActionRow actions={actions} />
        </div>
      </div>
    </section>
  )
}
