import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { Media } from '@/components/Media'
import { getGameProject } from '@/lib/game-portal/getGameProject'

const EXTERNAL_LINK_LABELS: Record<string, string> = {
  discord: 'Discord',
  docs: 'Docs',
  epic: 'Epic',
  itch: 'itch.io',
  merch: 'Merch',
  steam: 'Steam',
  support: 'Support',
  website: 'Website',
}

export default async function GamePortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const externalLinks = Object.entries(EXTERNAL_LINK_LABELS).flatMap(([key, label]) => {
    const url = project.links?.[key as keyof typeof project.links]
    return url ? [{ key, label, url }] : []
  })

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        project.accentColor
          ? ({ '--game-accent': project.accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link className="flex items-center gap-3" href={`/g/${project.slug}`}>
            {project.logo && typeof project.logo === 'object' && (
              <Media imgClassName="h-8 w-8 rounded object-cover" resource={project.logo} />
            )}
            <span className="text-lg font-semibold">{project.name}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <Link
              className="opacity-75 transition-opacity hover:opacity-100"
              href={`/g/${project.slug}/patch-notes`}
            >
              Patch Notes
            </Link>
            <Link
              className="opacity-75 transition-opacity hover:opacity-100"
              href={`/g/${project.slug}/issues`}
            >
              Issues
            </Link>
            <Link
              className="opacity-75 transition-opacity hover:opacity-100"
              href={`/g/${project.slug}/report`}
            >
              Report a Bug
            </Link>
            <Link
              className="opacity-75 transition-opacity hover:opacity-100"
              href={`/g/${project.slug}/contact`}
            >
              Contact
            </Link>
            {externalLinks.map((link) => (
              <a
                className="opacity-75 transition-opacity hover:opacity-100"
                href={link.url}
                key={link.key}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-sm opacity-70">
          <span>© {new Date().getFullYear()} {project.name}</span>
          <span>
            Powered by{' '}
            <Link className="underline" href="/">
              Critwire
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
