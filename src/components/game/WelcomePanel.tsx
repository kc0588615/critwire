'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import { SharePanel } from '@/components/share/SharePanel'
import { nextSteps } from '@/lib/onboarding/nextSteps'

/**
 * The next steps for a studio that just onboarded, on its hub with
 * `?welcome=1` (§6). A client component, so the hub stays ISR-cached:
 * search params aren't in its cache key, and only the browser shows this.
 * It holds nothing private, so anyone adding `?welcome=1` sees no more
 * than the studio's own public links. `siteURL` is the configured site
 * URL, never the host the hub was opened on. With `discordOn`, the kit's
 * Discord tab offers the install, but can't know the link: that's in the
 * admin's Share tab.
 */
export const WelcomePanel: React.FC<{
  discordOn: boolean
  project: { id: number; slug: string }
  siteURL: string
}> = ({ discordOn, project, siteURL }) => {
  const searchParams = useSearchParams()
  if (searchParams.get('welcome') !== '1') return null

  return (
    <section aria-labelledby="fs-welcome-title" className="fs-shell fs-welcome">
      <div className="fs-note">
        <h2 className="fs-note-head" id="fs-welcome-title">
          Your portal is live
        </h2>
        <ol className="fs-welcome-steps">
          {nextSteps(project).map((step) => (
            <li key={step.key}>
              {step.key === 'share' ? (
                // The kit itself, under its own heading: the step's link would only open it in the admin.
                <SharePanel
                  discord={discordOn ? { gameID: project.id, link: 'unknown' } : undefined}
                  headingLevel={3}
                  siteURL={siteURL}
                  slug={project.slug}
                />
              ) : (
                <>
                  {/* The admin is another app: a full page load, not a client navigation. */}
                  <a className="fs-link fs-welcome-label" href={step.href}>
                    {step.label}
                  </a>
                  <p className="fs-meta">{step.description}</p>
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
