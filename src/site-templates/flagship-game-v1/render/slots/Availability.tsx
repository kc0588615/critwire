import React from 'react'

import { PLATFORM_OPTIONS, RELEASE_STATE_OPTIONS } from '@/collections/options'

import type { AvailabilitySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { formatSiteDate, SectionHeader } from '../ui'

const optionLabel = (
  options: readonly { label: string; value: string }[],
  value: null | string | undefined,
): null | string => options.find((option) => option.value === value)?.label ?? value ?? null

/**
 * Renders platform/store facts straight from the GameProject — the slot
 * config controls presentation only; URLs are never AI-writable.
 */
export const AvailabilitySection: React.FC<{
  ctx: SiteRenderContext
  value: AvailabilitySlot
}> = ({ ctx, value }) => {
  if (!value.enabled) return null
  const availability = ctx.project.availability
  const platforms = availability?.platforms ?? []
  const releaseDate = formatSiteDate(availability?.releaseDate)
  const facts = [
    availability?.releaseState
      ? optionLabel(RELEASE_STATE_OPTIONS, availability.releaseState)
      : null,
    releaseDate,
    availability?.currentVersion ? `Current version ${availability.currentVersion}` : null,
  ].filter((fact): fact is string => Boolean(fact))

  if (platforms.length === 0 && facts.length === 0) return null

  return (
    <section aria-labelledby="fs-availability-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader
          eyebrow={facts.join(' · ') || null}
          heading={value.heading ?? 'Where to play'}
          id="fs-availability-heading"
        />
        {platforms.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {platforms.map((platform, index) => {
              const name = optionLabel(PLATFORM_OPTIONS, platform.platform) ?? 'Platform'
              const inner = (
                <>
                  <span className="font-semibold">{name}</span>
                  {platform.label ? (
                    <span className="text-sm text-[var(--fs-muted-fg)]">{platform.label}</span>
                  ) : null}
                </>
              )
              return (
                <li key={platform.id ?? `${platform.platform}-${index}`}>
                  {platform.storeUrl ? (
                    <a
                      className="fs-panel fs-panel-link flex items-center justify-between gap-3 px-5 py-4"
                      href={platform.storeUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {inner}
                      <span aria-hidden="true" className="text-[var(--fs-accent)]">
                        →
                      </span>
                    </a>
                  ) : (
                    <div className="fs-panel flex items-center justify-between gap-3 px-5 py-4">
                      {inner}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        ) : null}
        {value.note ? (
          <p className="mt-6 max-w-2xl text-sm leading-6 text-[var(--fs-muted-fg)]">{value.note}</p>
        ) : null}
      </div>
    </section>
  )
}
