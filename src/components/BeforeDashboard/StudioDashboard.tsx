import { Banner } from '@payloadcms/ui/elements/Banner'
import { Pill, type PillStyle } from '@payloadcms/ui/elements/Pill'
import Link from 'next/link'
import type { Payload } from 'payload'
import React from 'react'

import { findStudioOverviews, type PortalStatus, type StudioGame } from '@/lib/admin/dashboard'
import { gameEditHref, gameShareHref } from '@/lib/admin/paths'
import { portalPaths } from '@/lib/game-portal/paths'
import { describeLimits } from '@/lib/limits'
import { nextSteps } from '@/lib/onboarding/nextSteps'
import type { User } from '@/payload-types'
import { absoluteURL } from '@/utilities/getURL'

import { baseClass } from './baseClass'

const STATUS: Record<PortalStatus, { label: string; pillStyle: PillStyle }> = {
  held: { label: 'Held for review', pillStyle: 'warning' },
  live: { label: 'Live', pillStyle: 'success' },
  suspended: { label: 'Unavailable: suspended', pillStyle: 'error' },
}

const portalURL = (game: Pick<StudioGame, 'slug'>): string => absoluteURL(portalPaths(game.slug).hub)

/** A studio member's portals, what to do next, and the hosted plan's limits. */
export async function StudioDashboard({ payload, user }: { payload: Payload; user: User }) {
  const studios = await findStudioOverviews(payload, user)
  const firstGame = studios.flatMap((studio) => studio.games)[0]
  const limits = describeLimits()

  return (
    <div className={baseClass}>
      <h2 className={`${baseClass}__title`}>Your portals</h2>
      {studios.map((studio) => (
        <section aria-label={studio.name} className={`${baseClass}__studio`} key={studio.id}>
          <h3>{studio.name}</h3>
          {studio.suspended ? (
            <Banner type="error">
              This studio is suspended: its portals are unavailable and changes can’t be saved. Contact the person
              who runs this site.
            </Banner>
          ) : null}
          {studio.games.length > 0 ? (
            <ul className={`${baseClass}__games`}>
              {studio.games.map((game) => (
                <li key={game.id}>
                  <Link href={gameEditHref(game.id)}>{game.name}</Link>
                  <Pill pillStyle={STATUS[game.status].pillStyle} size="small">
                    {STATUS[game.status].label}
                  </Pill>
                  <a className={`${baseClass}__url`} href={portalURL(game)}>
                    {portalURL(game)}
                  </a>
                  <Link aria-label={`Share ${game.name}`} href={gameShareHref(game.id)}>
                    Share
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>
              No games yet. <Link href="/admin/collections/game-projects/create">Add your game</Link>
            </p>
          )}
        </section>
      ))}
      {firstGame ? (
        <section className={`${baseClass}__panel`}>
          <h3>Next steps</h3>
          <ol>
            {nextSteps(firstGame).map((step) => (
              <li key={step.key}>
                <Link href={step.href}>
                  <strong>{step.label}</strong>
                </Link>
                <p>{step.description}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
      {limits.length > 0 ? (
        <section className={`${baseClass}__panel`}>
          <h3>Hosted plan limits</h3>
          <ul>
            {limits.map((limit) => (
              <li key={limit}>{limit}</li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
