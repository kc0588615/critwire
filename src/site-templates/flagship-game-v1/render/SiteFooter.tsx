import Link from 'next/link'
import React from 'react'

import type { FooterConfig } from '../schema/slots'
import type { SiteRenderContext } from './context'

const LEGAL_LINKS = [
  { key: 'pressKit', label: 'Press Kit' },
  { key: 'privacy', label: 'Privacy Policy' },
  { key: 'terms', label: 'Terms' },
] as const

export const SiteFooter: React.FC<{ ctx: SiteRenderContext; value: FooterConfig }> = ({
  ctx,
  value,
}) => {
  const { project } = ctx
  const base = `/g/${project.slug}`
  const legal = value.showLegalLinks
    ? LEGAL_LINKS.flatMap(({ key, label }) => {
        const url = project.links?.[key]
        return typeof url === 'string' && url ? [{ key, label, url }] : []
      })
    : []

  return (
    <footer className="border-t border-[var(--fs-border)]">
      <div className="fs-shell py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <p className="font-[family-name:var(--fs-font-heading)] text-lg font-bold">
              {project.name}
            </p>
            {value.tagline ? (
              <p className="mt-2 text-sm leading-6 text-[var(--fs-muted-fg)]">{value.tagline}</p>
            ) : null}
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link className="fs-nav-link" href={`${base}/patch-notes`}>
              Patch Notes
            </Link>
            <Link className="fs-nav-link" href={`${base}/issues`}>
              Known Issues
            </Link>
            <Link className="fs-nav-link" href={`${base}/report`}>
              Report a Bug
            </Link>
            <Link className="fs-nav-link" href={`${base}/contact`}>
              Contact
            </Link>
            {legal.map((link) => (
              <a
                className="fs-nav-link"
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
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-6 text-sm text-[var(--fs-muted-fg)]">
          <span>
            © {new Date().getFullYear()} {project.name}
          </span>
          <span>
            Powered by{' '}
            <Link className="fs-link underline" href="/">
              Critwire
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
