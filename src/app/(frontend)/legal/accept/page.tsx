import type { Metadata } from 'next'

import config from '@payload-config'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { getPayload } from 'payload'
import React from 'react'

import { AccountPage } from '@/components/accounts/AccountPage'
import { FormNotice } from '@/components/game/FormNotice'
import { LegalConsentFields } from '@/components/legal/LegalConsentFields'
import { needsLegalAcceptance } from '@/lib/legal/acceptance'
import { LEGAL_CONTACT_EMAIL } from '@/lib/legal/copy'
import { getLegalDocument } from '@/lib/legal/documents'
import { legalVersionLine } from '@/lib/legal/format'
import { LEGAL_ACCEPT_LOGIN, LEGAL_LINKS, safeNext } from '@/lib/legal/paths'

type Args = {
  searchParams: Promise<{ error?: string; next?: string | string[] }>
}

/**
 * Where a signed-in account that hasn't accepted the current Terms of
 * Service and Privacy Policy goes before the admin or onboarding (Goal 2).
 * Ticking both boxes posts to `/legal/accept/submit`, the only place an
 * acceptance is recorded, which then sends them on to `next`. Super
 * admins, and accounts with nothing to accept, go straight there.
 * Rendered per request: it reads the session.
 */
export default async function LegalAcceptPage({ searchParams }: Args) {
  await connection()

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) redirect(LEGAL_ACCEPT_LOGIN)

  const { error, next: requestedNext } = await searchParams
  const next = safeNext(requestedNext)
  if (!(await needsLegalAcceptance({ payload, user }))) redirect(next)

  const documents = [getLegalDocument('terms'), getLegalDocument('privacy')]

  return (
    <AccountPage
      lede="Before you go on, read and agree to the current Terms of Service and Privacy Policy. Accounts are for people aged 18 or older."
      title="Agree to the Terms to continue"
    >
      <ul className="cw-legal-accept-documents">
        {documents.map((legalDocument) => (
          <li key={legalDocument.slug}>
            <a className="cw-link" href={LEGAL_LINKS[legalDocument.slug].href} rel="noopener" target="_blank">
              {legalDocument.title}
            </a>
            <span className="cw-account-lede"> · {legalVersionLine(legalDocument)}</span>
          </li>
        ))}
      </ul>

      {error === '1' ? (
        <FormNotice tone="error">
          Tick both boxes to continue. If a document changed while this page was open, the versions above are the
          new ones.
        </FormNotice>
      ) : null}

      <form action={`/legal/accept/submit?next=${encodeURIComponent(next)}`} className="fs-form" method="post">
        <LegalConsentFields />
        <button className="cw-btn" type="submit">
          Agree and continue
        </button>
      </form>

      <p className="cw-account-lede">
        If you don’t agree, email{' '}
        <a className="cw-link" href={`mailto:${LEGAL_CONTACT_EMAIL}`}>
          {LEGAL_CONTACT_EMAIL}
        </a>{' '}
        to close your account.
      </p>
      <p>
        {/* Never prefetched: rendering the logout view signs you out. */}
        <Link className="cw-link" href="/admin/logout" prefetch={false}>
          Log out
        </Link>
      </p>
    </AccountPage>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Agree to the Terms',
}
