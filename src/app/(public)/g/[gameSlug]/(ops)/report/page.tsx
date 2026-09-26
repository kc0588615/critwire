import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { TurnstileField } from '@/components/game/TurnstileField'
import { getReportRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

export default async function ReportIssuePage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted } = await searchParams
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const route = getReportRoute(project.reportForm)

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

      {route.kind === 'tally' ? (
        <TallyFormPanel
          buttonLabel="Open report form"
          description="Your report is collected in Tally. The studio reviews submissions there."
          display={route.display}
          formUrl={route.url}
          title="Send a field report"
        />
      ) : route.kind === 'external' ? (
        <div className="cc-panel max-w-3xl rounded-lg p-6 sm:p-8">
          <h2 className="text-lg font-bold">Send a field report</h2>
          <p className="mt-2 text-slate-400">
            {project.name} collects reports through an external form or tracker.
          </p>
          <a
            className="cc-button-primary mt-4"
            href={route.url}
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
