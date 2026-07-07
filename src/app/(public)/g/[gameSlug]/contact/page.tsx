import type { Metadata } from 'next'

import config from '@payload-config'
import { getPayload } from 'payload'
import { notFound } from 'next/navigation'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { getGameProject } from '@/lib/game-portal/getGameProject'

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
  <div className="rounded-md border p-6">
    <h2 className="text-lg font-semibold">Contact is not configured</h2>
    <p className="mt-2 opacity-75">
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
  const canUseForm =
    (contact?.target === 'EMAIL' && Boolean(contact.email)) ||
    (contact?.target === 'DISCORD_WEBHOOK' && Boolean(contact.discordWebhookUrl))
  const externalUrl = contact?.target === 'EXTERNAL_URL' ? contact.externalUrl : null

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Contact {publicProject.name}</h1>
        <p className="mt-2 opacity-75">Send a message to the studio through their chosen channel.</p>
      </div>

      {externalUrl ? (
        <div className="rounded-md border p-6">
          <h2 className="text-lg font-semibold">Contact the studio</h2>
          <p className="mt-2 opacity-75">
            {publicProject.name} handles contact through an external support page.
          </p>
          <a
            className="mt-4 inline-flex rounded-md bg-[var(--game-accent,#111827)] px-4 py-2 text-sm font-semibold text-white"
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
            <div className="mb-6 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200">
              Thanks. Your message was sent to the studio.
            </div>
          )}
          {error === '1' && (
            <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200">
              The message could not be submitted. Check the fields and try again.
            </div>
          )}

          <form action={`/g/${gameSlug}/contact/submit`} className="space-y-5" method="post">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium" htmlFor="name">
                  Name (optional)
                </label>
                <input
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
                <input
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2"
                  id="email"
                  name="email"
                  type="email"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium" htmlFor="subject">
                Subject (optional)
              </label>
              <input
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
                className="mt-1 min-h-40 w-full rounded-md border bg-background px-3 py-2"
                id="message"
                maxLength={5000}
                minLength={10}
                name="message"
                required
              />
            </div>

            <TurnstileField />

            <button
              className="rounded-md bg-[var(--game-accent,#111827)] px-4 py-2 text-sm font-semibold text-white"
              type="submit"
            >
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
