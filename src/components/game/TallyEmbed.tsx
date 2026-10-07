'use client'

import React, { useEffect } from 'react'

import { parseTallyForm } from '@/lib/tally/parseTallyForm'

declare global {
  interface Window {
    Tally?: {
      loadEmbeds: () => void
    }
  }
}

const EMBED_SCRIPT = 'https://tally.so/widgets/embed.js'

function loadTallyScript(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`script[src="${EMBED_SCRIPT}"]`)) {
    window.Tally?.loadEmbeds()
    return
  }
  const script = document.createElement('script')
  script.src = EMBED_SCRIPT
  script.async = true
  script.onload = () => window.Tally?.loadEmbeds()
  document.body.appendChild(script)
}

/** Shown instead of a form whose saved Tally URL doesn't parse. */
const UNAVAILABLE = 'This form isn’t available right now.'

const HostedBy = () => <p className="fs-meta">This form is hosted by Tally.</p>

export type TallyEmbedProps = {
  /** Tally share URL, embed URL, or raw form ID */
  formUrl: string
  /** iframe title for a11y */
  title?: string
  className?: string
}

/**
 * Standard Tally embed. Submissions are handled entirely by Tally;
 * the portal only hosts the iframe. See https://tally.so/help/embed-your-form
 */
export const TallyEmbed: React.FC<TallyEmbedProps> = ({
  className,
  formUrl,
  title = 'Form',
}) => {
  const parsed = parseTallyForm(formUrl)

  useEffect(() => {
    if (!parsed) return
    loadTallyScript()
    // Re-run when form changes so SPA navigations re-bind embeds.
    const id = window.setTimeout(() => window.Tally?.loadEmbeds(), 50)
    return () => window.clearTimeout(id)
  }, [parsed])

  if (!parsed) return <p className={className}>{UNAVAILABLE}</p>

  return (
    <div className={className ? `fs-tally-form ${className}` : 'fs-tally-form'}>
      <iframe
        className="fs-tally-frame"
        data-tally-src={parsed.embedUrl}
        frameBorder="0"
        height="200"
        loading="lazy"
        marginHeight={0}
        marginWidth={0}
        title={title}
        width="100%"
      />
      <HostedBy />
    </div>
  )
}

export type TallyFormPanelProps = {
  formUrl: string
  /** embed shows iframe; button opens the share URL */
  display: 'button' | 'embed'
  buttonLabel: string
  /** The iframe's accessible name; the page's h1 already names the form. */
  title?: string
  description?: string
}

export const TallyFormPanel: React.FC<TallyFormPanelProps> = ({
  buttonLabel,
  description,
  display,
  formUrl,
  title,
}) => {
  const parsed = parseTallyForm(formUrl)
  if (!parsed) {
    return (
      <div className="fs-form">
        <p>{UNAVAILABLE}</p>
      </div>
    )
  }

  return (
    <div className="fs-form">
      {description ? <p>{description}</p> : null}
      {display === 'button' ? (
        <div className="fs-tally-form">
          <div>
            <a
              className="fs-btn fs-btn-primary"
              href={parsed.shareUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              {buttonLabel}
            </a>
          </div>
          <HostedBy />
        </div>
      ) : (
        <TallyEmbed formUrl={formUrl} title={title ?? buttonLabel} />
      )}
    </div>
  )
}
