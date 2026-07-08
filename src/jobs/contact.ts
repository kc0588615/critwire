import type { PayloadRequest, TaskConfig } from 'payload'

import * as Sentry from '@sentry/nextjs'

import type { GameProject } from '@/payload-types'

import { renderContactFormEmail } from '@/lib/email/renderContactFormEmail'
import { getLogger } from '@/lib/logger'

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

const getProject = async ({
  input,
  req,
}: {
  input: ContactTaskInput
  req: PayloadRequest
}): Promise<GameProject | null> => {
  const project = await req.payload
    .findByID({
      collection: 'game-projects',
      depth: 0,
      id: input.projectID,
      overrideAccess: true,
    })
    .catch(() => null)

  return project
}

export const emailContactFormTask: TaskConfig<'email-contact-form'> = {
  slug: 'email-contact-form',
  inputSchema: [
    textField('projectID'),
    textField('gameSlug'),
    textField('name', false),
    textField('email', false),
    textField('subject', false),
    multilineField('message'),
  ],
  outputSchema: [{ name: 'sent', type: 'checkbox', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    try {
      const project = await getProject({ input: input as ContactTaskInput, req })
      const to = project?.contact?.target === 'EMAIL' ? project.contact.email : null
      if (!project || !to) {
        req.payload.logger.warn({
          msg: 'Skipping contact email job because email routing is not configured.',
          projectID: input.projectID,
        })
        return { output: { sent: false } }
      }

      const apiKey = process.env.RESEND_API_KEY
      if (!apiKey) {
        log.info({
          msg: 'RESEND_API_KEY unset; contact email job succeeded without sending.',
          projectID: project.id,
          to,
        })
        return { output: { sent: true } }
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
  inputSchema: [
    textField('projectID'),
    textField('gameSlug'),
    textField('name', false),
    textField('email', false),
    textField('subject', false),
    multilineField('message'),
  ],
  outputSchema: [{ name: 'sent', type: 'checkbox', required: true }],
  retries: 2,
  handler: async ({ input, req }) => {
    try {
      const project = await getProject({ input: input as ContactTaskInput, req })
      const webhookUrl =
        project?.contact?.target === 'DISCORD_WEBHOOK' ? project.contact.discordWebhookUrl : null
      if (!project || !webhookUrl) {
        req.payload.logger.warn({
          msg: 'Skipping Discord contact job because webhook routing is not configured.',
          projectID: input.projectID,
        })
        return { output: { sent: false } }
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
