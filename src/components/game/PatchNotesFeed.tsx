import type { PaginatedDocs } from 'payload'

import Link from 'next/link'
import React from 'react'

import type { PatchNote } from '@/payload-types'

export const formatPatchDate = (timestamp: null | string | undefined): null | string => {
  if (!timestamp) return null
  return new Date(timestamp).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export const PatchNotesFeed: React.FC<{
  gameSlug: string
  notes: PaginatedDocs<PatchNote>
}> = ({ gameSlug, notes }) => {
  const base = `/g/${gameSlug}/patch-notes`

  return (
    <div className="cc-shell py-12">
      <div className="mb-10 flex items-center justify-between">
        <div>
          <p className="cc-kicker">Update Log</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Field Notes</h1>
        </div>
        <a className="text-sm text-slate-400 hover:text-cyan-200" href={`${base}/feed.xml`}>
          RSS
        </a>
      </div>

      {notes.docs.length === 0 ? (
        <div className="cc-panel rounded-lg p-6 text-slate-300">
          No field notes published yet. Check back after the next expedition.
        </div>
      ) : (
        <ul className="grid gap-4">
          {notes.docs.map((note) => (
            <li className="cc-panel rounded-lg p-6" key={note.id}>
              <article>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400">
                  {note.versionLabel && (
                    <span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-0.5 font-mono text-xs text-cyan-100">
                      {note.versionLabel}
                    </span>
                  )}
                  {note.publishedAt && (
                    <time dateTime={note.publishedAt}>{formatPatchDate(note.publishedAt)}</time>
                  )}
                </div>
                <h2 className="mt-3 text-xl font-bold">
                  <Link className="hover:text-cyan-200" href={`${base}/${note.slug}`}>
                    {note.title}
                  </Link>
                </h2>
                {note.summary && <p className="mt-2 leading-7 text-slate-400">{note.summary}</p>}
              </article>
            </li>
          ))}
        </ul>
      )}

      {notes.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-between text-sm">
          {notes.hasPrevPage ? (
            <Link
              className="text-cyan-200 underline"
              href={notes.page === 2 ? base : `${base}/page/${(notes.page ?? 2) - 1}`}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="text-slate-400">
            Page {notes.page} of {notes.totalPages}
          </span>
          {notes.hasNextPage ? (
            <Link
              className="text-cyan-200 underline"
              href={`${base}/page/${(notes.page ?? 1) + 1}`}
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}
