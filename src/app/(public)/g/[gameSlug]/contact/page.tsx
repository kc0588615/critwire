import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { FormField } from '@/components/game/FormField'
import { FormNotice } from '@/components/game/FormNotice'
import { PageHead } from '@/components/game/PageHead'
import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { TurnstileField } from '@/components/game/TurnstileField'
import { LEGAL_NOTICE_ID, LegalNotice } from '@/components/legal/LegalNotice'
import { SENSITIVE_INFO_WARNING_ID, SensitiveInfoWarning } from '@/components/legal/SensitiveInfoWarning'
import { getContactRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject, requirePortalProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

export default async function ContactPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted } = await searchParams
  const project = await requirePortalProject(gameSlug)

  const route = (await getContactRoute(gameSlug)) ?? { kind: 'none' }
  const paths = portalPaths(gameSlug)

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column">
        <PageHead
          purpose={
            <>
              Questions or press requests go straight to the {project.name} team. For bugs and
              ideas, use the{' '}
              <Link className="fs-link" href={paths.newFeedback()}>
                feedback form
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
              <FormNotice className="mb-xl" tone="success">
                Message sent. If you left an email address, the {project.name} team can reply to it.
              </FormNotice>
            ) : null}
            {error === '1' ? (
              <FormNotice className="mb-xl" tone="error">
                Your message wasn’t sent, so nothing reached the studio. Check the fields, complete
                the verification and send it again.
              </FormNotice>
            ) : null}

            <form action={paths.contactSubmit} className="fs-form" method="post">
              <SensitiveInfoWarning />

              <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="name" label="Name (optional)">
                {(control) => (
                  <input {...control} className="fs-input" maxLength={120} name="name" type="text" />
                )}
              </FormField>

              <FormField
                hint="Sent to the team with your message; critwire doesn’t keep it once it’s delivered."
                id="email"
                label={`Email (optional, 13 or older), so the ${project.name} team can reply`}
              >
                {(control) => <input {...control} className="fs-input" name="email" type="email" />}
              </FormField>

              <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="subject" label="Subject (optional)">
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

              <FormField describedBy={SENSITIVE_INFO_WARNING_ID} id="message" label="Message">
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
                <LegalNotice />
                <TurnstileField />
                <button aria-describedby={LEGAL_NOTICE_ID} className="fs-btn fs-btn-primary" type="submit">
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
