import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { expect } from '@playwright/test'

import { BASE_URL, OUTBOX_DIR } from './env'

/** One message the server's outbox adapter wrote (`src/lib/email/adapter.ts`). */
interface OutboxFile {
  to: string[]
  subject: string
  html: string
  sentAt: string
}

export interface CapturedEmail {
  subject: string
  html: string
  /** Every `href` in the HTML, entity-decoded. */
  links: string[]
}

const hrefs = (html: string): string[] =>
  [...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href.replaceAll('&amp;', '&'))

async function newestTo(to: string): Promise<OutboxFile | undefined> {
  const files = await readdir(OUTBOX_DIR).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return []
    throw error
  })
  const messages = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => JSON.parse(await readFile(path.join(OUTBOX_DIR, file), 'utf8')) as OutboxFile),
  )
  return messages
    .filter((message) => message.to.includes(to))
    .sort((a, b) => a.sentAt.localeCompare(b.sentAt))
    .at(-1)
}

/** Waits up to 10 s for an email to `to` and returns the newest one; fails the test if none arrives. */
export async function readEmail(to: string): Promise<CapturedEmail> {
  let message: OutboxFile | undefined
  await expect(async () => {
    message = await newestTo(to)
    expect(message, `an email to ${to} in ${OUTBOX_DIR}`).toBeDefined()
  }).toPass({ timeout: 10_000 })
  const { subject, html } = message as OutboxFile
  return { subject, html, links: hrefs(html) }
}

/** The one link in `email` that starts with `${BASE_URL}${pathPrefix}`; fails the test otherwise. */
export function linkTo(email: CapturedEmail, pathPrefix: string): string {
  const matches = [...new Set(email.links.filter((link) => link.startsWith(`${BASE_URL}${pathPrefix}`)))]
  expect(matches, `one ${pathPrefix} link in "${email.subject}"`).toHaveLength(1)
  return matches[0]
}
