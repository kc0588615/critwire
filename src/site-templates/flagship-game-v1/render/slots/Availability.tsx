import React from 'react'

import { PLATFORM_OPTIONS } from '@/collections/options'

import type { AvailabilitySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader } from '../ui'

const optionLabel = (
  options: readonly { label: string; value: string }[],
  value: null | string | undefined,
): null | string => options.find((option) => option.value === value)?.label ?? value ?? null

/**
 * Where to play: one row per platform, the name linked to its store.
 * URLs come straight from the GameProject; the slot config controls
 * presentation only, so they are never AI-writable.
 */
export const AvailabilitySection: React.FC<{
  ctx: SiteRenderContext
  value: AvailabilitySlot
}> = ({ ctx, value }) => {
  if (!value.enabled) return null
  const platforms = ctx.project.availability?.platforms ?? []
  if (platforms.length === 0 && !value.note) return null

  return (
    <section aria-labelledby="fs-availability-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader heading={value.heading ?? 'Where to play'} id="fs-availability-heading" />
        {platforms.length > 0 ? (
          <ul className="fs-rows fs-column-wide">
            {platforms.map((platform, index) => {
              const name = optionLabel(PLATFORM_OPTIONS, platform.platform) ?? 'Platform'
              return (
                <li className="fs-platform-row" key={platform.id ?? `${platform.platform}-${index}`}>
                  {platform.storeUrl ? (
                    <a
                      className="fs-link fs-platform-name"
                      href={platform.storeUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      {name}
                    </a>
                  ) : (
                    <span className="fs-platform-name">{name}</span>
                  )}
                  {platform.label ? <span className="fs-meta">{platform.label}</span> : null}
                </li>
              )
            })}
          </ul>
        ) : null}
        {value.note ? (
          <p className="fs-body mt-6 text-[var(--fs-muted-fg)]">{value.note}</p>
        ) : null}
      </div>
    </section>
  )
}
