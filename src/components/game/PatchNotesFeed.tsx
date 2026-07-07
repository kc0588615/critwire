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
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-10 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Patch Notes</h1>
        <a className="text-sm opacity-70 hover:opacity-100" href={`${base}/feed.xml`}>
          RSS
        </a>
      </div>

      {notes.docs.length === 0 ? (
        <p className="opacity-70">No patch notes published yet. Check back soon!</p>
      ) : (
        <ul className="space-y-10">
          {notes.docs.map((note) => (
            <li key={note.id}>
              <article>
                <div className="flex flex-wrap items-center gap-3 text-sm opacity-70">
                  {note.versionLabel && (
                    <span className="rounded-full border px-2.5 py-0.5 font-mono text-xs">
                      {note.versionLabel}
                    </span>
                  )}
                  {note.publishedAt && (
                    <time dateTime={note.publishedAt}>{formatPatchDate(note.publishedAt)}</time>
                  )}
                </div>
                <h2 className="mt-2 text-xl font-semibold">
                  <Link className="hover:underline" href={`${base}/${note.slug}`}>
                    {note.title}
                  </Link>
                </h2>
                {note.summary && <p className="mt-2 opacity-80">{note.summary}</p>}
              </article>
            </li>
          ))}
        </ul>
      )}

      {notes.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-12 flex items-center justify-between text-sm">
          {notes.hasPrevPage ? (
            <Link
              className="underline"
              href={notes.page === 2 ? base : `${base}/page/${(notes.page ?? 2) - 1}`}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span className="opacity-70">
            Page {notes.page} of {notes.totalPages}
          </span>
          {notes.hasNextPage ? (
            <Link className="underline" href={`${base}/page/${(notes.page ?? 1) + 1}`}>
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
