import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { PageHead } from '@/components/game/PageHead'
import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { TurnstileField } from '@/components/game/TurnstileField'
import { getContactRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

export default async function ContactPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted } = await searchParams
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const route = (await getContactRoute(gameSlug)) ?? { kind: 'none' }

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column">
        <PageHead
          purpose={
            <>
              Questions, feedback or press requests go straight to the {project.name} team. For
              bugs, use the{' '}
              <Link className="fs-link" href={`/g/${gameSlug}/report`}>
                report form
              </Link>
              .
            </>
          }
          title="Contact"
        />

        {route.kind === 'tally' ? (
          <TallyFormPanel
            buttonLabel="Open contact form"
            description={`The ${project.name} team takes messages through its own form.`}
            display={route.display}
            formUrl={route.url}
            title="Contact form"
          />
        ) : route.kind === 'external' ? (
          <div className="fs-form">
            <p>
              The {project.name} team takes messages on its own support page. It opens in a new tab.
            </p>
            <div>
              <a
                className="fs-btn fs-btn-primary"
                href={route.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                Open contact page
              </a>
            </div>
          </div>
        ) : route.kind === 'form' ? (
          <>
            {submitted === '1' ? (
              <FormNotice className="mb-6" tone="success">
                Message sent. If you left an email address, the {project.name} team can reply to it.
              </FormNotice>
            ) : null}
            {error === '1' ? (
              <FormNotice className="mb-6" tone="error">
                Your message wasn’t sent, so nothing reached the studio. Check the fields, complete
                the verification and send it again.
              </FormNotice>
            ) : null}

            <form action={`/g/${gameSlug}/contact/submit`} className="fs-form" method="post">
              <div className="fs-field-pair">
                <FormField id="name" label="Name (optional)">
                  {(control) => (
                    <input
                      {...control}
                      className="fs-input"
                      maxLength={120}
                      name="name"
                      type="text"
                    />
                  )}
                </FormField>
                <FormField id="email" label="Email (optional)">
                  {(control) => (
                    <input {...control} className="fs-input" name="email" type="email" />
                  )}
                </FormField>
              </div>

              <FormField id="subject" label="Subject (optional)">
                {(control) => (
                  <input
                    {...control}
                    className="fs-input"
                    maxLength={160}
                    name="subject"
                    type="text"
                  />
                )}
              </FormField>

              <FormField id="message" label="Message">
                {(control) => (
                  <textarea
                    {...control}
                    className="fs-input fs-textarea"
                    maxLength={5000}
                    minLength={10}
                    name="message"
                    required
                  />
                )}
              </FormField>

              <div className="fs-form-submit">
                <TurnstileField />
                <button className="fs-btn fs-btn-primary" type="submit">
                  Send message
                </button>
              </div>
            </form>
          </>
        ) : (
          <p className="fs-empty">
            {project.name} hasn’t set up a contact form yet. Reach the team through the links in
            the footer.
          </p>
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
    description: `Questions, feedback or press requests for the ${project.name} team.`,
    title: `Contact the ${project.name} team`,
  }
}
