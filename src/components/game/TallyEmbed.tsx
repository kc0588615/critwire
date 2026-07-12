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

export type TallyEmbedProps = {
  /** Tally share URL, embed URL, or raw form ID */
  formUrl: string
  /** iframe title for a11y */
  title?: string
  className?: string
}

/**
 * Standard Tally embed. Submissions are handled entirely by Tally —
 * Critwire only hosts the iframe. See https://tally.so/help/embed-your-form
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

  if (!parsed) {
    return (
      <p className="text-sm text-rose-300">
        This Tally form URL is invalid. Update it in the game project settings.
      </p>
    )
  }

  return (
    <div className={className}>
      <iframe
        data-tally-src={parsed.embedUrl}
        frameBorder="0"
        height="200"
        loading="lazy"
        marginHeight={0}
        marginWidth={0}
        title={title}
        width="100%"
      />
      <p className="mt-3 text-xs text-slate-500">
        Form submissions are managed in{' '}
        <a
          className="text-cyan-200 underline"
          href="https://tally.so"
          rel="noopener noreferrer"
          target="_blank"
        >
          Tally
        </a>
        , not Critwire.
      </p>
    </div>
  )
}

export type TallyFormPanelProps = {
  formUrl: string
  /** embed shows iframe; button opens the share URL */
  display: 'button' | 'embed'
  buttonLabel: string
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
      <div className="cc-panel rounded-lg p-6">
        <p className="text-sm text-rose-300">Invalid Tally form URL configured for this project.</p>
      </div>
    )
  }

  if (display === 'button') {
    return (
      <div className="cc-panel max-w-3xl rounded-lg p-6 sm:p-8">
        {title ? <h2 className="text-lg font-bold">{title}</h2> : null}
        {description ? <p className="mt-2 text-slate-400">{description}</p> : null}
        <a
          className="cc-button-primary mt-4"
          href={parsed.shareUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          {buttonLabel}
        </a>
        <p className="mt-4 text-xs text-slate-500">
          Opens a Tally form. Submissions are managed in Tally, not Critwire.
        </p>
      </div>
    )
  }

  return (
    <div className="cc-panel max-w-3xl rounded-lg p-6 sm:p-8">
      {title ? <h2 className="mb-4 text-lg font-bold">{title}</h2> : null}
      {description ? <p className="mb-4 text-slate-400">{description}</p> : null}
      <TallyEmbed formUrl={formUrl} title={title ?? buttonLabel} />
    </div>
  )
}
