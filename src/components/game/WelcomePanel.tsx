'use client'

import { useSearchParams } from 'next/navigation'
import React from 'react'

import { CopyButton } from '@/components/share/CopyButton'
import { nextSteps } from '@/lib/onboarding/nextSteps'
import { getClientSideURL } from '@/utilities/getURL'

/** The hub's absolute address, with a button that copies it. */
const ShareLink: React.FC<{ path: string }> = ({ path }) => {
  const url = `${getClientSideURL()}${path}`

  return (
    <div className="fs-welcome-share">
      <code className="fs-welcome-url">{url}</code>
      <CopyButton className="fs-btn fs-btn-secondary" label="Copy the link" text={url} />
    </div>
  )
}

/**
 * The next steps for a studio that just onboarded, on its hub with
 * `?welcome=1` (§6). A client component, so the hub stays ISR-cached:
 * search params aren't in its cache key, and only the browser shows this.
 * It holds nothing private, so anyone adding `?welcome=1` sees no more
 * than the studio's own public links.
 */
export const WelcomePanel: React.FC<{ project: { id: number; slug: string } }> = ({ project }) => {
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
                <>
                  <p className="fs-welcome-label">{step.label}</p>
                  <p className="fs-meta">{step.description}</p>
                  <ShareLink path={step.href} />
                </>
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
