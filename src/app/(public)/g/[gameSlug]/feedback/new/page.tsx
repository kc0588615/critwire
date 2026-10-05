import type { Metadata } from 'next'

import Link from 'next/link'
import { createLoader, parseAsStringLiteral } from 'nuqs/server'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { FeedbackTypeChoice } from '@/components/game/FeedbackTypeChoice'
import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { PageHead } from '@/components/game/PageHead'
import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { TurnstileField } from '@/components/game/TurnstileField'
import { LEGAL_NOTICE_ID, LegalNotice } from '@/components/legal/LegalNotice'
import { SENSITIVE_INFO_WARNING_ID, SensitiveInfoWarning } from '@/components/legal/SensitiveInfoWarning'
import {
  type FeedbackTypeParam,
  feedbackSearchParams,
  feedbackTypeOf,
} from '@/lib/game-portal/feedbackSearchParams'
import { acceptsIdeas, getReportRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject, requirePortalProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const loadSearchParams = createLoader({
  error: parseAsStringLiteral(['1'] as const),
  /** Set by the submit route: `published` when the item went straight onto the board. */
  submitted: parseAsStringLiteral(['1', 'published'] as const),
  type: feedbackSearchParams.type,
})

/** The copy that follows the chosen type; `null` is the page before a choice. */
const COPY = {
  bug: {
    describe: 'What happened?',
    hint: 'What you were doing, what you expected, and what happened instead.',
    purpose: 'what went wrong',
    sent: 'Report sent.',
    submit: 'Send report',
    title: 'Report a bug',
  },
  idea: {
    describe: 'What’s your idea?',
    hint: 'What you would like to see, and what it would change for you.',
    purpose: 'what you would like to see',
    sent: 'Idea sent.',
    submit: 'Send idea',
    title: 'Suggest an idea',
  },
} as const satisfies Record<FeedbackTypeParam, Record<string, string>>

/** The chosen type; a studio that takes no ideas only takes bugs. */
const chosenType = (
  project: Pick<GameProject, 'reportForm'>,
  type: FeedbackTypeParam | null,
): FeedbackTypeParam | null => (acceptsIdeas(project) ? type : 'bug')

export default async function NewFeedbackPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted, type: typeParam } = await loadSearchParams(searchParams)
  const project = await requirePortalProject(gameSlug)

  const route = getReportRoute(project.reportForm)
  const paths = portalPaths(gameSlug)
  const takesIdeas = acceptsIdeas(project)
  const type = chosenType(project, typeParam)
  const copy = type ? COPY[type] : null

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column">
        <PageHead
          purpose={
            <>
              Tell the {project.name} team{' '}
              {copy ? copy.purpose : 'what went wrong or what you would like to see'}. Check the{' '}
              <Link className="fs-link" href={paths.feedback}>
                feedback
              </Link>{' '}
              first: if it’s already there, vote on it.
            </>
          }
          title={copy ? copy.title : 'Send feedback'}
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
            {copy && submitted ? (
              <FormNotice className="mb-6" tone="success">
                {copy.sent}{' '}
                {submitted === 'published'
                  ? 'It’s on the board now.'
                  : 'The team reviews submissions before they’re public.'}
              </FormNotice>
            ) : null}
            {error ? (
              <FormNotice className="mb-6" tone="error">
                Your feedback wasn’t sent, so nothing reached the studio. Check the fields,
                complete the verification and send it again.
              </FormNotice>
            ) : null}

            {type && copy ? (
              <form action={paths.feedbackSubmit} className="fs-form" method="post">
                {takesIdeas ? <FeedbackTypeChoice chosen={type} paths={paths} /> : null}
                <input name="type" type="hidden" value={feedbackTypeOf(type)} />
                <SensitiveInfoWarning />

                <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="title" label="Title">
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

                <FormField describedBy={SENSITIVE_INFO_WARNING_ID} hint={copy.hint} id="description" label={copy.describe}>
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

                {type === 'bug' ? (
                  <div className="fs-field-pair">
                    <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="platform" label="Platform (optional)">
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
                    <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="gameVersion" label="Game version (optional)">
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
                  </div>
                ) : null}

                <div className="fs-form-submit">
                  <LegalNotice />
                  <TurnstileField />
                  <button aria-describedby={LEGAL_NOTICE_ID} className="fs-btn fs-btn-primary" type="submit">
                    {copy.submit}
                  </button>
                </div>
              </form>
            ) : (
              <div className="fs-form">
                <FeedbackTypeChoice chosen={null} paths={paths} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export async function generateMetadata({ params, searchParams }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const { type: typeParam } = await loadSearchParams(searchParams)
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  const type = chosenType(project, typeParam)
  return {
    description: `Tell the ${project.name} team ${
      type ? COPY[type].purpose : 'what went wrong or what you would like to see'
    }.`,
    title: type ? `${COPY[type].title} — ${project.name}` : `Send feedback — ${project.name}`,
  }
}
