import Link from 'next/link'
import React from 'react'

import { IssueLoop } from './IssueLoop'
import { DEMO_PORTAL_HREF } from './links'

/** What a studio's portal gives players; every entry opens that page of the demo. */
const PORTAL_PAGES = [
  {
    description: 'Every update, newest first, with an RSS feed players can follow.',
    href: `${DEMO_PORTAL_HREF}/patch-notes`,
    link: 'Critter Connect’s patch notes',
    term: 'Patch notes',
  },
  {
    description:
      'The bugs you’ve confirmed, each with its status. Players find theirs, vote on it and skip the duplicate report.',
    href: `${DEMO_PORTAL_HREF}/issues`,
    link: 'Critter Connect’s known issues',
    term: 'Known issues',
  },
  {
    description:
      'A form that asks for what you need to reproduce a bug: what happened, the platform and the game version. Reports arrive in your admin, ready to triage.',
    href: `${DEMO_PORTAL_HREF}/report`,
    link: 'Critter Connect’s report form',
    term: 'Bug reports',
  },
  {
    description:
      'A landing page in your colours and type, with your art, trailer, platforms and store links, and a contact form that reaches your team.',
    href: DEMO_PORTAL_HREF,
    link: 'Critter Connect’s site',
    term: 'Your game’s site',
  },
] as const

export function MarketingHome() {
  return (
    <>
      <section aria-labelledby="cw-home-title" className="cw-slip">
        <div className="cw-shell cw-slip-grid">
          <h1 className="cw-hero-title" id="cw-home-title">
            A public home for your game’s patch notes, known issues and bug reports.
          </h1>
          <div className="cw-slip-copy">
            <p className="cw-lede">
              Critwire gives your studio one hosted site where players see what changed, check
              whether their bug is already known, vote on it or report a new one. You run it all
              from one admin.
            </p>
            <div className="cw-actions">
              <Link className="cw-btn" href={DEMO_PORTAL_HREF}>
                See a live portal
              </Link>
            </div>
          </div>
          <IssueLoop />
        </div>
      </section>

      <section aria-labelledby="cw-portal-title" className="cw-section">
        <div className="cw-shell cw-split">
          <h2 className="cw-split-title" id="cw-portal-title">
            What players get on your portal
          </h2>
          <dl className="cw-terms">
            {PORTAL_PAGES.map(({ description, href, link, term }) => (
              <div className="cw-term" key={term}>
                <dt>{term}</dt>
                <dd>
                  <p>{description}</p>
                  <Link className="cw-tap cw-link" href={href}>
                    {link}
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  )
}
