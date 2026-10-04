import type { PayloadRequest, TaskConfig, Where } from 'payload'

import * as Sentry from '@sentry/nextjs'

import type { GameProject } from '@/payload-types'

import { executeDiscordWebhook } from '@/lib/discord/webhook'
import { renderContactFormEmail } from '@/lib/email/renderContactFormEmail'
import { portalPaths } from '@/lib/game-portal/paths'
import { getLogger } from '@/lib/logger'
import { deleteWhereOrThrow } from '@/lib/payload/deleteWhereOrThrow'
import { getServerSideURL } from '@/utilities/getURL'

const log = getLogger('jobs.contact')

type ContactTaskInput = {
  email?: string
  gameSlug: string
  message: string
  name?: string
  projectID: string
  subject?: string
}

const textField = (name: keyof ContactTaskInput, required = true) => ({
  name,
  type: 'text' as const,
  required,
})

const multilineField = (name: keyof ContactTaskInput) => ({
  name,
  type: 'textarea' as const,
  required: true,
})

const contactInputSchema = [
  textField('projectID'),
  textField('gameSlug'),
  textField('name', false),
  textField('email', false),
  textField('subject', false),
  multilineField('message'),
]

/**
 * Loads the project a contact job delivers for. A deleted project throws,
 * and so do database errors, so the job fails, is retried, and is kept with
 * its input instead of being deleted as a success.
 */
const getProject = async ({
  input,
  req,
}: {
  input: ContactTaskInput
  req: PayloadRequest
}): Promise<GameProject> => {
  const project = await req.payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: input.projectID,
    overrideAccess: true,
    req,
  })
  if (!project) throw new Error(`Contact job: game project ${input.projectID} no longer exists.`)
  return project
}

export const emailContactFormTask: TaskConfig<'email-contact-form'> = {
  slug: 'email-contact-form',
  inputSchema: contactInputSchema,
  outputSchema: [{ name: 'sent', type: 'checkbox', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    try {
      const project = await getProject({ input: input as ContactTaskInput, req })
      const to = project.contact?.target === 'EMAIL' ? project.contact.email : null
      if (!to) {
        throw new Error(
          `Contact job: project ${project.id} no longer routes contact to an email address.`,
        )
      }

      // Without Resend the transport is the outbox, which would count an
      // undelivered message as sent; fail so a super admin can retry it.
      if (!process.env.RESEND_API_KEY) {
        throw new Error('Contact job: RESEND_API_KEY is not set, so the email cannot be sent.')
      }

      const subject = input.subject?.trim()
        ? `[${project.name}] ${input.subject.trim()}`
        : `[${project.name}] Contact form submission`
      const portalUrl = `${getServerSideURL()}${portalPaths(input.gameSlug).hub}`
      const { html, text } = await renderContactFormEmail({
        email: input.email || undefined,
        gameName: project.name,
        message: input.message,
        name: input.name || undefined,
        portalUrl,
        subject: input.subject || undefined,
      })

      // Resend's adapter throws on a refused send, so the job fails and is retried.
      await req.payload.sendEmail({ html, replyTo: input.email || undefined, subject, text, to })

      log.info({ msg: 'Contact email sent.', projectID: project.id })
      return { output: { sent: true } }
    } catch (err) {
      Sentry.captureException(err)
      throw err
    }
  },
}

export const discordWebhookContactTask: TaskConfig<'discord-webhook'> = {
  slug: 'discord-webhook',
  inputSchema: contactInputSchema,
  outputSchema: [{ name: 'sent', type: 'checkbox', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    try {
      const project = await getProject({ input: input as ContactTaskInput, req })
      const webhookUrl =
        project.contact?.target === 'DISCORD_WEBHOOK' ? project.contact.discordWebhookUrl : null
      if (!webhookUrl) {
        throw new Error(
          `Contact job: project ${project.id} no longer routes contact to a Discord webhook.`,
        )
      }
      // A deleted webhook throws DiscordWebhookGoneError: the job fails and is
      // retried like any other failure, and the studio's URL is left as is.
      await executeDiscordWebhook(webhookUrl, {
        embeds: [
          {
            color: 0x5865f2,
            description: input.message,
            fields: [
              { inline: true, name: 'Name', value: input.name || 'Anonymous player' },
              { inline: true, name: 'Email', value: input.email || 'Not provided' },
              { inline: true, name: 'Game', value: project.name },
            ],
            title: input.subject?.trim() || 'Contact form submission',
            url: `${getServerSideURL()}${portalPaths(input.gameSlug).contact}`,
          },
        ],
      })

      log.info({ msg: 'Discord contact webhook sent.', projectID: project.id })
      return { output: { sent: true } }
    } catch (err) {
      Sentry.captureException(err)
      throw err
    }
  },
}

/** The tasks whose input holds a player's contact message. */
export const CONTACT_TASKS = [emailContactFormTask.slug, discordWebhookContactTask.slug]

/** Deletes the contact jobs matching `where`, in any state, with `req`; throws unless all of them go. */
export const deleteContactJobs = ({ req, where }: { req: PayloadRequest; where: Where }): Promise<void> =>
  deleteWhereOrThrow({
    collection: 'payload-jobs',
    req,
    where: { and: [{ taskSlug: { in: CONTACT_TASKS } }, where] },
  })

const UNDELIVERED_DAYS = 30

/**
 * The Privacy Policy's promise about contact messages: a delivered one is
 * gone at once, and an undelivered one after 30 days. Payload deletes a
 * completed job itself (`deleteJobOnComplete`), but only logs a failure to,
 * so this sweep deletes any completed contact job it left, and every one
 * older than 30 days, whatever its state. Their log rows cascade. It runs
 * every 10 minutes on the `default` queue's autorun; a failed run is
 * reported and the next one tries again, so it isn't retried.
 */
export const purgeContactJobsTask: TaskConfig<'purge-contact-jobs'> = {
  slug: 'purge-contact-jobs',
  retries: 0,
  schedule: [{ cron: '*/10 * * * *', queue: 'default' }],
  handler: async ({ req }) => {
    try {
      const cutoff = new Date(Date.now() - UNDELIVERED_DAYS * 24 * 60 * 60 * 1000).toISOString()
      await deleteContactJobs({
        req,
        where: { or: [{ completedAt: { exists: true } }, { createdAt: { less_than: cutoff } }] },
      })
      return { output: {} }
    } catch (err) {
      Sentry.captureException(err)
      throw err
    }
  },
}
