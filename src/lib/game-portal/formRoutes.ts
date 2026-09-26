import type { GameProject } from '@/payload-types'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

import { parseTallyForm } from '@/lib/tally/parseTallyForm'

type TallyDisplay = 'button' | 'embed'

/**
 * Where a game's public contact goes. Carries no secrets: the email
 * address and Discord webhook URL stay on the server.
 */
export type ContactRoute =
  | { display: TallyDisplay; kind: 'tally'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'form'; target: 'DISCORD_WEBHOOK' | 'EMAIL' }
  | { kind: 'none' }

/** Where a game's player reports go. Anything but a usable Tally or external link is native. */
export type ReportRoute =
  | { display: TallyDisplay; kind: 'tally'; url: string }
  | { kind: 'external'; url: string }
  | { kind: 'native' }

const tallyDisplay = (value: null | string | undefined): TallyDisplay =>
  value === 'button' ? 'button' : 'embed'

const resolveContactRoute = (contact: GameProject['contact']): ContactRoute => {
  switch (contact?.target) {
    case 'DISCORD_WEBHOOK':
    case 'EMAIL': {
      const destination = contact.target === 'EMAIL' ? contact.email : contact.discordWebhookUrl
      return destination ? { kind: 'form', target: contact.target } : { kind: 'none' }
    }
    case 'EXTERNAL_URL':
      return contact.externalUrl ? { kind: 'external', url: contact.externalUrl } : { kind: 'none' }
    case 'TALLY':
      return contact.tallyUrl && parseTallyForm(contact.tallyUrl)
        ? { display: tallyDisplay(contact.tallyDisplay), kind: 'tally', url: contact.tallyUrl }
        : { kind: 'none' }
    default:
      return { kind: 'none' }
  }
}

/**
 * The only privileged portal read: whether the contact destination is
 * set needs the tenant-only `email` and `discordWebhookUrl` fields.
 * Returns null for an unknown slug.
 */
export const getContactRoute = cache(async (slug: string): Promise<ContactRoute | null> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'game-projects',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: { contact: true },
    where: { slug: { equals: slug } },
  })
  const project = result.docs[0]

  return project ? resolveContactRoute(project.contact) : null
})

/** `reportForm` is publicly readable, so this works on the visitor's view of the project. */
export const getReportRoute = (reportForm: GameProject['reportForm']): ReportRoute => {
  if (reportForm?.provider === 'tally' && reportForm.tallyUrl && parseTallyForm(reportForm.tallyUrl)) {
    return { display: tallyDisplay(reportForm.tallyDisplay), kind: 'tally', url: reportForm.tallyUrl }
  }
  if (reportForm?.provider === 'external' && reportForm.externalUrl) {
    return { kind: 'external', url: reportForm.externalUrl }
  }
  return { kind: 'native' }
}
