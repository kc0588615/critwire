import type { PayloadRequest, TaskConfig } from 'payload'

import * as Sentry from '@sentry/nextjs'

import type { GameProject } from '@/payload-types'

import { renderContactFormEmail } from '@/lib/email/renderContactFormEmail'
import { getLogger } from '@/lib/logger'
import { isAllowedDiscordWebhookUrl } from '@/lib/validation/discordWebhook'

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

const DELIVERY_TIMEOUT_MS = 10_000

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

      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        throw new Error('Contact job: RESEND_API_KEY is not set, so the email cannot be sent.')
      }

      const subject = input.subject?.trim()
        ? `[${project.name}] ${input.subject.trim()}`
        : `[${project.name}] Contact form submission`
      const portalUrl = `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/g/${input.gameSlug}`
      const { html, text } = await renderContactFormEmail({
        email: input.email || undefined,
        gameName: project.name,
        message: input.message,
        name: input.name || undefined,
        portalUrl,
        subject: input.subject || undefined,
      })

      const response = await fetch('https://api.resend.com/emails', {
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL ?? 'Critwire <notifications@critwire.local>',
          html,
          reply_to: input.email || undefined,
          subject,
          text,
          to,
        }),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`Resend contact email failed with ${response.status}: ${await response.text()}`)
      }

      log.info({ msg: 'Contact email sent.', projectID: project.id, to })
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
      // Checked again here: values saved before the allowlist existed skipped it.
      if (!isAllowedDiscordWebhookUrl(webhookUrl)) {
        throw new Error(`Contact job: project ${project.id} has a webhook URL that is not Discord's.`)
      }

      const response = await fetch(webhookUrl, {
        body: JSON.stringify({
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
              url: `${process.env.NEXT_PUBLIC_SERVER_URL ?? ''}/g/${input.gameSlug}/contact`,
            },
          ],
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`Discord webhook failed with ${response.status}: ${await response.text()}`)
      }

      log.info({ msg: 'Discord contact webhook sent.', projectID: project.id })
      return { output: { sent: true } }
    } catch (err) {
      Sentry.captureException(err)
      throw err
    }
  },
}
