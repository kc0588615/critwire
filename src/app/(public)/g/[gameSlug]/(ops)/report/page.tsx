import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { PageHead } from '@/components/game/PageHead'
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
    <div className="fs-shell fs-ops">
      <div className="fs-column">
        <PageHead
          purpose={
            <>
              Tell the {project.name} team what went wrong. Check the{' '}
              <Link className="fs-link" href={`/g/${gameSlug}/issues`}>
                known issues
              </Link>{' '}
              first: if your bug is there, vote on it.
            </>
          }
          title="Report a bug"
        />

        {route.kind === 'tally' ? (
          <TallyFormPanel
            buttonLabel="Open report form"
            description={`The ${project.name} team takes bug reports through its own form.`}
            display={route.display}
            formUrl={route.url}
            title="Bug report form"
          />
        ) : route.kind === 'external' ? (
          <div className="fs-form">
            <p>
              The {project.name} team collects bug reports in its own tracker. The form opens in a
              new tab.
            </p>
            <div>
              <a
                className="fs-btn fs-btn-primary"
                href={route.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open report form
              </a>
            </div>
          </div>
        ) : (
          <>
            {submitted === '1' ? (
              <FormNotice className="mb-6" tone="success">
                Report sent. The {project.name} team can see it now.
              </FormNotice>
            ) : null}
            {error === '1' ? (
              <FormNotice className="mb-6" tone="error">
                Your report wasn’t sent, so nothing reached the studio. Check the fields, complete
                the verification and send it again.
              </FormNotice>
            ) : null}

            <form action={`/g/${gameSlug}/report/submit`} className="fs-form" method="post">
              <FormField id="title" label="Title">
                {(control) => (
                  <input
                    {...control}
                    className="fs-input"
                    maxLength={160}
                    minLength={3}
                    name="title"
                    required
                    type="text"
                  />
                )}
              </FormField>

              <FormField
                hint="What you were doing, what you expected, and what happened instead."
                id="description"
                label="What happened?"
              >
                {(control) => (
                  <textarea
                    {...control}
                    className="fs-input fs-textarea"
                    maxLength={5000}
                    minLength={10}
                    name="description"
                    required
                  />
                )}
              </FormField>

              <FormField id="category" label="Category">
                {(control) => (
                  <select
                    {...control}
                    className="fs-input"
                    defaultValue="OTHER"
                    name="category"
                    required
                  >
                    {ISSUE_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>

              <div className="fs-field-pair">
                <FormField id="submitterEmail" label="Email (optional)">
                  {(control) => (
                    <input {...control} className="fs-input" name="submitterEmail" type="email" />
                  )}
                </FormField>
                <FormField id="platform" label="Platform (optional)">
                  {(control) => (
                    <input
                      {...control}
                      className="fs-input"
                      maxLength={120}
                      name="platform"
                      placeholder="Windows, Steam Deck, PS5"
                      type="text"
                    />
                  )}
                </FormField>
              </div>

              <FormField id="gameVersion" label="Game version (optional)">
                {(control) => (
                  <input
                    {...control}
                    className="fs-input"
                    maxLength={120}
                    name="gameVersion"
                    type="text"
                  />
                )}
              </FormField>

              <div className="fs-form-submit">
                <TurnstileField />
                <button className="fs-btn fs-btn-primary" type="submit">
                  Send report
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    description: `Tell the ${project.name} team what went wrong.`,
    title: `Report a bug in ${project.name}`,
  }
}
