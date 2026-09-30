import React from 'react'

import type { GameProject } from '@/payload-types'

import { PLATFORM_OPTIONS, RELEASE_STATE_OPTIONS } from '@/collections/options'
import { Media } from '@/components/Media'
import { type HubLink, resolveHubLinks } from '@/lib/game-portal/links'

import { formatDate } from './format'

const optionLabel = (
  options: readonly { label: string; value: string }[],
  value: null | string | undefined,
): null | string => options.find((option) => option.value === value)?.label ?? value ?? null

/**
 * The game's live build facts, in reading order: release state, release
 * date, version, platforms.
 */
export const availabilityFacts = (project: GameProject): string[] => {
  const availability = project.availability
  const version = availability?.currentVersion?.trim()
  const platforms = (availability?.platforms ?? [])
    .map((platform) => optionLabel(PLATFORM_OPTIONS, platform.platform))
    .filter((name): name is string => Boolean(name))

  return [
    optionLabel(RELEASE_STATE_OPTIONS, availability?.releaseState),
    formatDate(availability?.releaseDate),
    // "v0.1.0" and "0.1.0" both read as "Version 0.1.0".
    version ? `Version ${version.replace(/^v(?=\d)/i, '')}` : null,
    platforms.length > 0 ? [...new Set(platforms)].join(', ') : null,
  ].filter((fact): fact is string => Boolean(fact))
}

const OutboundButton: React.FC<{ link: HubLink; variant: 'primary' | 'secondary' }> = ({
  link,
  variant,
}) => (
  <a
    className={`fs-btn fs-btn-${variant}`}
    href={link.url}
    rel="noopener noreferrer"
    target="_blank"
  >
    {link.label}
  </a>
)

/**
 * The hub's identity: the name, the pitch, the build line and the
 * studio's outbound links. The key art runs untouched (no scrim, never
 * under text); the title sits on a plate of page colour cut into it.
 * Without art there is no plate: the title runs at full scale on the page.
 *
 * It owns the page's only h1 and the only `priority` (LCP) image, and
 * carries no `aria-labelledby`: it isn't one of the hub's sections.
 */
export const HubHeader: React.FC<{ project: GameProject }> = ({ project }) => {
  const art = typeof project.banner === 'object' && project.banner ? project.banner : null
  const { primary, secondary } = resolveHubLinks(project)
  const facts = availabilityFacts(project)

  const title = (
    <>
      <h1 className="fs-h1">{project.name}</h1>
      {project.description ? (
        <p className="fs-lead fs-hero-tagline">{project.description}</p>
      ) : null}
      {primary || secondary.length > 0 ? (
        <div className="fs-hero-actions">
          {primary ? <OutboundButton link={primary} variant="primary" /> : null}
          {secondary.map((link) => (
            <OutboundButton key={link.url} link={link} variant="secondary" />
          ))}
        </div>
      ) : null}
    </>
  )

  const buildLine =
    facts.length > 0 ? (
      <ul className="fs-build-line">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    ) : null

  if (!art) {
    return (
      <section className="fs-hub-header fs-hero fs-hero-bare">
        <div className="fs-shell fs-hero-settle">
          {title}
          {buildLine}
        </div>
      </section>
    )
  }

  return (
    <section className="fs-hub-header fs-hero fs-hero-plated" data-align="start">
      <div className="fs-hero-stage">
        <div className="fs-hero-art">
          <Media fill imgClassName="object-cover" priority resource={art} size="100vw" />
        </div>
        <div className="fs-hero-plate fs-hero-settle">{title}</div>
      </div>
      {buildLine ? <div className="fs-shell">{buildLine}</div> : null}
    </section>
  )
}
