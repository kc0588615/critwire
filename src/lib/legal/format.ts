import type { LegalDocument } from './documents'

// "4 October 2026", from the front matter's YYYY-MM-DD.
const dateLabel = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' })

/** "Version 0.1 · Draft of 4 October 2026", or "Version 1.0 · Effective <date>" once final. */
export function legalVersionLine({ effective, status, version }: Pick<LegalDocument, 'effective' | 'status' | 'version'>): string {
  const date = dateLabel.format(new Date(`${effective}T00:00:00Z`))
  return `Version ${version} · ${status === 'draft' ? `Draft of ${date}` : `Effective ${date}`}`
}
