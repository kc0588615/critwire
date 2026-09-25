import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { parseTallyForm } from '@/lib/tally/parseTallyForm'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

const getReportProject = async (slug: string): Promise<GameProject | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'game-projects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    where: { slug: { equals: slug } },
  })
  return result.docs[0] ?? null
}

const TurnstileField = () => {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return <input name="turnstileToken" type="hidden" value="" />

  return (
    <>
      <script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  )
}

export default async function ReportIssuePage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted } = await searchParams
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  // Sensitive routing fields need a privileged read; public project helper
  // only returns world-readable fields after access control.
  const reportProject = await getReportProject(gameSlug)
  const reportForm = reportProject?.reportForm
  const provider = reportForm?.provider ?? 'native'
  const tally =
    provider === 'tally' && reportForm?.tallyUrl ? parseTallyForm(reportForm.tallyUrl) : null
  const externalUrl = provider === 'external' ? reportForm?.externalUrl : null

  return (
    <div className="cc-shell py-12">
      <div className="mb-8">
        <p className="cc-kicker">Player Signal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Send Field Report</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Send the {project.name} team a clear trail note for review. Published reports may appear
          on the public field board.
        </p>
      </div>

      {tally && reportForm?.tallyUrl ? (
        <TallyFormPanel
          buttonLabel="Open report form"
          description="Your report is collected in Tally. The studio reviews submissions there."
          display={reportForm.tallyDisplay === 'button' ? 'button' : 'embed'}
          formUrl={reportForm.tallyUrl}
          title="Send a field report"
        />
      ) : externalUrl ? (
        <div className="cc-panel max-w-3xl rounded-lg p-6 sm:p-8">
          <h2 className="text-lg font-bold">Send a field report</h2>
          <p className="mt-2 text-slate-400">
            {project.name} collects reports through an external form or tracker.
          </p>
          <a
            className="cc-button-primary mt-4"
            href={externalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open report form
          </a>
        </div>
      ) : (
        <>
          {submitted === '1' && (
            <div className="mb-6 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              Field report received. The team will review the trail.
            </div>
          )}
          {error === '1' && (
            <div className="mb-6 rounded-md border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">
              The field report could not be sent. Check the notes and try again.
            </div>
          )}

          <form
            action={`/g/${gameSlug}/report/submit`}
            className="cc-panel max-w-3xl space-y-5 rounded-lg p-6 sm:p-8"
            method="post"
          >
            <div>
              <label className="block text-sm font-medium" htmlFor="title">
                Title
              </label>
              <input
                className="cc-input mt-1 px-3 py-2"
                id="title"
                maxLength={160}
                minLength={3}
                name="title"
                required
                type="text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="description">
                Field notes
              </label>
              <textarea
                className="cc-input mt-1 min-h-36 px-3 py-2"
                id="description"
                maxLength={5000}
                minLength={10}
                name="description"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="category">
                Track type
              </label>
              <select
                className="cc-input mt-1 px-3 py-2"
                defaultValue="OTHER"
                id="category"
                name="category"
                required
              >
                {ISSUE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium" htmlFor="submitterEmail">
                  Email (optional)
                </label>
                <input
                  className="cc-input mt-1 px-3 py-2"
                  id="submitterEmail"
                  name="submitterEmail"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="platform">
                  Platform (optional)
                </label>
                <input
                  className="cc-input mt-1 px-3 py-2"
                  id="platform"
                  maxLength={120}
                  name="platform"
                  placeholder="Windows, Steam Deck, PS5"
                  type="text"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="gameVersion">
                Game version (optional)
              </label>
              <input
                className="cc-input mt-1 px-3 py-2"
                id="gameVersion"
                maxLength={120}
                name="gameVersion"
                type="text"
              />
            </div>

            <TurnstileField />

            <button className="cc-button-primary" type="submit">
              Send report
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    description: `Send a field report to the ${project.name} team.`,
    title: `Send Field Report — ${project.name}`,
  }
}
