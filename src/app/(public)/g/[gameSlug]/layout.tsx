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
      className="cc-portal flex min-h-screen flex-col"
      style={
        project.accentColor
          ? ({ '--game-accent': project.accentColor } as React.CSSProperties)
          : undefined
      }
    >
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="cc-shell flex items-center justify-between gap-4 py-4">
          <Link className="flex items-center gap-3" href={`/g/${project.slug}`}>
            <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-300/30 bg-cyan-300/10 font-mono text-sm font-black text-cyan-200 glow-cyan">
              {project.logo && typeof project.logo === 'object' ? (
                <Media imgClassName="h-8 w-8 rounded object-cover" resource={project.logo} />
              ) : (
                project.name.slice(0, 2).toUpperCase()
              )}
            </span>
            <span className="text-base font-semibold tracking-tight">{project.name}</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-300">
            <Link
              className="transition-colors hover:text-cyan-200"
              href={`/g/${project.slug}/patch-notes`}
            >
              Field Notes
            </Link>
            <Link
              className="transition-colors hover:text-cyan-200"
              href={`/g/${project.slug}/issues`}
            >
              Field Board
            </Link>
            <Link
              className="transition-colors hover:text-cyan-200"
              href={`/g/${project.slug}/report`}
            >
              Send Report
            </Link>
            <Link
              className="transition-colors hover:text-cyan-200"
              href={`/g/${project.slug}/contact`}
            >
              Contact
            </Link>
            {externalLinks.map((link) => (
              <a
                className="transition-colors hover:text-cyan-200"
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
      <footer className="border-t border-white/10">
        <div className="cc-shell flex items-center justify-between py-6 text-sm text-slate-400">
          <span>
            © {new Date().getFullYear()} {project.name}
          </span>
          <span>
            Powered by{' '}
            <Link className="text-cyan-200 underline" href="/">
              Critwire
            </Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
