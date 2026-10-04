import type { Metadata } from 'next'

import { marked } from 'marked'
import { notFound } from 'next/navigation'
import React from 'react'

import { getLegalDocument, type LegalDocument } from '@/lib/legal/documents'
import { isLegalSlug, LEGAL_SLUGS } from '@/lib/legal/paths'

type Args = {
  params: Promise<{ document: string }>
}

// The three documents, built static: the files change only with a deploy.
// Any other path is a 404 through `notFound()` below, not `dynamicParams =
// false`, which makes Next log an internal error on every such request.
export function generateStaticParams() {
  return LEGAL_SLUGS.map((document) => ({ document }))
}

async function loadDocument(params: Args['params']): Promise<LegalDocument> {
  const { document } = await params
  if (!isLegalSlug(document)) notFound()
  return getLegalDocument(document)
}

// "4 October 2026", from the front matter's YYYY-MM-DD.
const dateLabel = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' })

/**
 * critwire.com's Terms, Privacy Policy and Copyright Policy, rendered from
 * `legal/<slug>.md`. The markdown is a trusted repo file, so its HTML is
 * rendered as is. A draft says so, and isn't indexed.
 */
export default async function LegalDocumentPage({ params }: Args) {
  const { body, effective, status, title, version } = await loadDocument(params)
  const isDraft = status === 'draft'
  const date = dateLabel.format(new Date(`${effective}T00:00:00Z`))

  return (
    <article className="cw-page">
      <div className="cw-shell">
        <div className="cw-page-column cw-legal">
          <header className="cw-legal-header">
            <h1 className="cw-legal-title">{title}</h1>
            <p className="cw-legal-version">
              Version {version} · {isDraft ? `Draft of ${date}` : `Effective ${date}`}
            </p>
            {isDraft ? (
              <p className="cw-legal-draft" role="note">
                This is a draft under legal review. It isn’t final.
              </p>
            ) : null}
          </header>
          <div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(body, { async: false }) }} />
        </div>
      </div>
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { status, title } = await loadDocument(params)
  return {
    robots: status === 'draft' ? { index: false } : undefined,
    title,
  }
}
