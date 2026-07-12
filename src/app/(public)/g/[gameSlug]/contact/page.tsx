import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { TallyFormPanel } from '@/components/game/TallyEmbed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { parseTallyForm } from '@/lib/tally/parseTallyForm'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
}

const getContactProject = async (slug: string): Promise<GameProject | null> => {
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

const ContactNotConfigured = ({ projectName }: { projectName: string }) => (
  <div className="cc-panel rounded-lg p-6">
    <h2 className="text-lg font-bold">Contact route is not configured</h2>
    <p className="mt-2 text-slate-400">
      {projectName} has not connected a public contact destination yet. Check back later or use one
      of the studio links in the navigation.
    </p>
  </div>
)

export default async function ContactPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { error, submitted } = await searchParams
  const publicProject = await getGameProject(gameSlug)
  if (!publicProject) notFound()

  const project = await getContactProject(gameSlug)
  const contact = project?.contact
  const tally =
    contact?.target === 'TALLY' && contact.tallyUrl ? parseTallyForm(contact.tallyUrl) : null
  const canUseForm =
    (contact?.target === 'EMAIL' && Boolean(contact.email)) ||
    (contact?.target === 'DISCORD_WEBHOOK' && Boolean(contact.discordWebhookUrl))
  const externalUrl = contact?.target === 'EXTERNAL_URL' ? contact.externalUrl : null

  return (
    <div className="cc-shell py-12">
      <div className="mb-8">
        <p className="cc-kicker">Studio Route</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Contact {publicProject.name}</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Send a message to the studio through their chosen route.
        </p>
      </div>

      {tally ? (
        <TallyFormPanel
          buttonLabel="Open contact form"
          description={`${publicProject.name} collects messages through Tally.`}
          display={contact?.tallyDisplay === 'button' ? 'button' : 'embed'}
          formUrl={contact!.tallyUrl!}
          title="Contact the studio"
        />
      ) : externalUrl ? (
        <div className="cc-panel max-w-3xl rounded-lg p-6">
          <h2 className="text-lg font-bold">Contact the studio</h2>
          <p className="mt-2 text-slate-400">
            {publicProject.name} handles contact through an external support page.
          </p>
          <a
            className="cc-button-primary mt-4"
            href={externalUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Open contact page
          </a>
        </div>
      ) : canUseForm ? (
        <>
          {submitted === '1' && (
            <div className="mb-6 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-4 text-sm text-emerald-100">
              Message sent. The team has the signal.
            </div>
          )}
          {error === '1' && (
            <div className="mb-6 rounded-md border border-rose-300/30 bg-rose-300/10 p-4 text-sm text-rose-100">
              The message could not be submitted. Check the fields and try again.
            </div>
          )}

          <form
            action={`/g/${gameSlug}/contact/submit`}
            className="cc-panel max-w-3xl space-y-5 rounded-lg p-6 sm:p-8"
            method="post"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium" htmlFor="name">
                  Name (optional)
                </label>
                <input
                  className="cc-input mt-1 px-3 py-2"
                  id="name"
                  maxLength={120}
                  name="name"
                  type="text"
                />
              </div>
              <div>
                <label className="block text-sm font-medium" htmlFor="email">
                  Email (optional)
                </label>
                <input className="cc-input mt-1 px-3 py-2" id="email" name="email" type="email" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="subject">
                Subject (optional)
              </label>
              <input
                className="cc-input mt-1 px-3 py-2"
                id="subject"
                maxLength={160}
                name="subject"
                type="text"
              />
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="message">
                Message
              </label>
              <textarea
                className="cc-input mt-1 min-h-40 px-3 py-2"
                id="message"
                maxLength={5000}
                minLength={10}
                name="message"
                required
              />
            </div>

            <TurnstileField />

            <button className="cc-button-primary" type="submit">
              Send message
            </button>
          </form>
        </>
      ) : (
        <ContactNotConfigured projectName={publicProject.name} />
      )}
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    description: `Contact the ${project.name} team.`,
    title: `Contact — ${project.name}`,
  }
}
