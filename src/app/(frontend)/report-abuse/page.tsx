import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import React from 'react'

import { AccountPage } from '@/components/accounts/AccountPage'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { TurnstileField } from '@/components/game/TurnstileField'
import { LEGAL_NOTICE_ID, LegalNotice } from '@/components/legal/LegalNotice'
import { SENSITIVE_INFO_WARNING_ID, SensitiveInfoWarning } from '@/components/legal/SensitiveInfoWarning'
import { ABUSE_REPORT_REASON_OPTIONS } from '@/collections/options'
import { parsePortalPath } from '@/lib/game-portal/paths'
import { isOpenSignup } from '@/lib/hosting'

type Args = {
  searchParams: Promise<{ error?: string; page?: string; submitted?: string }>
}

/**
 * "Report this page" (§12): tells the Critwire team about a portal. Shows
 * the reported path, never the game's name, so it reveals nothing about a
 * held or suspended portal (P6). Rendered per request: it reads the signup
 * flag, and only the hosted instance (open signup) takes reports.
 */
export default async function ReportAbusePage({ searchParams }: Args) {
  await connection()
  if (!isOpenSignup()) notFound()

  const { error, page, submitted } = await searchParams

  if (submitted === '1') {
    return (
      <AccountPage
        lede="Thanks. The Critwire team reviews every report and acts on the ones that break the rules."
        title="Report sent"
      >
        <div>
          <Link className="fs-btn fs-btn-primary" href={page && parsePortalPath(page) ? page : '/'}>
            Back to the page
          </Link>
        </div>
      </AccountPage>
    )
  }

  if (!page || !parsePortalPath(page)) notFound()

  return (
    <AccountPage
      lede={
        <>
          Tell the team that runs Critwire what’s wrong with{' '}
          <code className="cw-account-path">{page}</code>. The studio doesn’t see your report.
        </>
      }
      notices={
        error === '1' ? (
          <FormNotice tone="error">
            Your report wasn’t sent. Choose a reason, complete the verification and try again.
          </FormNotice>
        ) : null
      }
      title="Report this page"
    >
      <form action="/report-abuse/submit" className="fs-form" method="post">
        <input name="page" type="hidden" value={page} />
        <SensitiveInfoWarning />

        <FormField id="reason" label="Reason">
          {(control) => (
            <select
              {...control}
              className="fs-input fs-select"
              defaultValue=""
              name="reason"
              required
            >
              <option disabled value="">
                Choose a reason
              </option>
              {ABUSE_REPORT_REASON_OPTIONS.map(({ label, value }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          )}
        </FormField>

        <FormField
          describedBy={SENSITIVE_INFO_WARNING_ID}
          hint="What you saw, and where on the page."
          id="details"
          label="Details (optional)"
        >
          {(control) => (
            <textarea
              {...control}
              className="fs-input fs-textarea"
              maxLength={2000}
              name="details"
            />
          )}
        </FormField>

        <FormField
          hint="Only if you’d like us to be able to reply."
          id="email"
          label="Your email (optional, 13 or older)"
        >
          {(control) => (
            <input
              {...control}
              autoComplete="email"
              className="fs-input"
              maxLength={254}
              name="email"
              type="email"
            />
          )}
        </FormField>

        <LegalNotice />

        <TurnstileField />

        <button aria-describedby={LEGAL_NOTICE_ID} className="fs-btn fs-btn-primary" type="submit">
          Send report
        </button>
      </form>
    </AccountPage>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Report this page',
}
