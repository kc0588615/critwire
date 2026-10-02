import Link from 'next/link'
import React from 'react'

import { IssueLoop } from './IssueLoop'
import { DEMO_PORTAL, GITHUB_REPO_URL } from './links'

/** What a studio's portal gives players; every entry opens that page of the demo. */
const PORTAL_PAGES = [
  {
    description:
      'Every update, newest first, with an RSS feed players can follow. Each one lists the feedback it shipped.',
    href: DEMO_PORTAL.updates,
    link: 'Critter Connect’s updates',
    term: 'Updates',
  },
  {
    description:
      'Bugs and ideas in four stages: Under review, Planned, In progress and Shipped. Players find theirs, vote on it and skip the duplicate.',
    href: DEMO_PORTAL.board,
    link: 'Critter Connect’s feedback board',
    term: 'Feedback board',
  },
  {
    description:
      'A form that asks “Bug or idea?” first. A bug asks for what you need to reproduce it: what happened, the platform and the game version.',
    href: DEMO_PORTAL.newFeedback(),
    link: 'Critter Connect’s feedback form',
    term: 'Bug reports and ideas',
  },
  {
    description:
      'Your key art, pitch and links back to your own site, stores and Discord, above the latest updates and top feedback, in your colours and type.',
    href: DEMO_PORTAL.hub,
    link: 'Critter Connect’s hub',
    term: 'A hub for each game',
  },
] as const

/**
 * Critwire's home page. The Contact link shows only when `contactHref` is
 * set, and "Create your portal" only when `signupHref` is (open signup).
 */
export function MarketingHome({
  contactHref,
  signupHref,
}: {
  contactHref: null | string
  signupHref: null | string
}) {
  return (
    <>
      <section aria-labelledby="cw-home-title" className="cw-slip">
        <div className="cw-shell cw-slip-grid">
          <h1 className="cw-hero-title" id="cw-home-title">
            Player feedback and updates for the game site you already have.
          </h1>
          <div className="cw-slip-copy">
            <p className="cw-lede">
              Keep your Carrd, itch.io or Steam page. Critwire adds a small hub beside it where
              players read your updates, report bugs, suggest ideas and vote, and see each one
              move from Under review to the update that ships it.
            </p>
            <div className="cw-actions">
              <Link className="cw-btn" href={DEMO_PORTAL.hub}>
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

      <section aria-labelledby="cw-review-title" className="cw-section">
        <div className="cw-shell cw-split">
          <h2 className="cw-split-title" id="cw-review-title">
            Nothing is public until you say so
          </h2>
          <div className="cw-stack">
            <p className="cw-lede">
              Every bug report and idea waits for your review, unless you turn review off for a
              game. Then clean submissions go straight onto the board.
            </p>
            <p className="cw-note">
              A built-in filter screens every submission for profanity, slurs, sexual content and
              spam links, on your own server with no outside service. Whatever it flags still
              waits for you, with the reason in your admin. You can also turn ideas off and take
              bug reports only.
            </p>
          </div>
        </div>
      </section>

      <section aria-labelledby="cw-free-title" className="cw-section">
        <div className="cw-shell">
          <div className="cw-cta cw-stack">
            <h2 className="cw-cta-title" id="cw-free-title">
              Free to self-host (MIT). Free hosted early access.
            </h2>
            <p className="cw-note">
              Critwire is open source. Run it on your own server with only Postgres, or use the
              hosted instance, free while it’s in early access.
            </p>
            <div className="cw-actions">
              {signupHref ? (
                <Link className="cw-btn" href={signupHref}>
                  Create your portal
                </Link>
              ) : null}
              <a className="cw-btn" href={GITHUB_REPO_URL}>
                Critwire on GitHub
              </a>
              {contactHref ? (
                <a className="cw-tap cw-link" href={contactHref}>
                  Contact
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
