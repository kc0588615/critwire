import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { getGameProject } from '@/lib/game-portal/getGameProject'

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<{ error?: string; submitted?: string }>
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

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Report a Bug</h1>
        <p className="mt-2 opacity-75">
          Send the {project.name} team a player report for review. Published reports may appear on
          the public issue tracker.
        </p>
      </div>

      {submitted === '1' && (
        <div className="mb-6 rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200">
          Thanks. Your report was sent to the studio.
        </div>
      )}
      {error === '1' && (
        <div className="mb-6 rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900 dark:border-red-700 dark:bg-red-950/40 dark:text-red-200">
          The report could not be submitted. Check the fields and try again.
        </div>
      )}

      <form action={`/g/${gameSlug}/report/submit`} className="space-y-5" method="post">
        <div>
          <label className="block text-sm font-medium" htmlFor="title">
            Title
          </label>
          <input
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
            Description
          </label>
          <textarea
            className="mt-1 min-h-36 w-full rounded-md border bg-background px-3 py-2"
            id="description"
            maxLength={5000}
            minLength={10}
            name="description"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium" htmlFor="category">
            Category
          </label>
          <select
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
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
            className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            id="gameVersion"
            maxLength={120}
            name="gameVersion"
            type="text"
          />
        </div>

        <TurnstileField />

        <button
          className="rounded-md bg-[var(--game-accent,#111827)] px-4 py-2 text-sm font-semibold text-white"
          type="submit"
        >
          Submit report
        </button>
      </form>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    description: `Report a bug to the ${project.name} team.`,
    title: `Report a Bug — ${project.name}`,
  }
}
