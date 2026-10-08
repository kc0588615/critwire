import type { EmailAdapter, SendEmailOptions } from 'payload'

import { resendAdapter } from '@payloadcms/email-resend'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { getLogger } from '@/lib/logger'
import { SITE } from '@/lib/site'

const log = getLogger('email')

const DEFAULT_SENDER = `${SITE.name} <notifications@critwire.local>`

type Sender = { address: string; name: string }

/** Parses `RESEND_FROM_EMAIL` (`Name <address>`, or a bare address). A malformed value stops boot. */
const parseSender = (value: string): Sender => {
  const named = /^\s*(.+?)\s*<([^<>\s]+@[^<>\s]+)>\s*$/.exec(value)
  if (named) return { address: named[2], name: named[1] }
  if (/^[^<>\s]+@[^<>\s]+$/.test(value.trim())) return { address: value.trim(), name: SITE.name }
  throw new Error(`RESEND_FROM_EMAIL must look like "Name <address>"; got "${value}".`)
}

type Address = NonNullable<SendEmailOptions['to']>

const addresses = (value: Address | undefined): string[] => {
  if (!value) return []
  const list = Array.isArray(value) ? value : [value]
  return list.map((entry) => (typeof entry === 'string' ? entry : entry.address))
}

const body = (value: SendEmailOptions['html']): string | undefined => {
  if (typeof value === 'string') return value
  if (Buffer.isBuffer(value)) return value.toString('utf8')
  return undefined
}

const outboxDir = (): string | undefined => process.env.EMAIL_OUTBOX_DIR || undefined

/**
 * Used when Resend isn't configured: never sends and never refuses, so a
 * super admin can still create users. Tokens reach the log only outside
 * production. With `EMAIL_OUTBOX_DIR`, each message is also written there
 * as JSON for the E2E suite to read; a failed write throws.
 */
const outboxAdapter =
  ({ address, name }: Sender): EmailAdapter =>
  () => ({
    name: 'critwire-outbox',
    defaultFromAddress: address,
    defaultFromName: name,
    sendEmail: async (message) => {
      const from =
        typeof message.from === 'string'
          ? message.from
          : message.from
            ? `${message.from.name} <${message.from.address}>`
            : `${name} <${address}>`
      const email = {
        from,
        html: body(message.html),
        sentAt: new Date().toISOString(),
        subject: message.subject ?? '',
        text: body(message.text),
        to: addresses(message.to),
      }

      log.info({ msg: 'Email not sent: RESEND_API_KEY is unset.', subject: email.subject, to: email.to })
      if (process.env.NODE_ENV !== 'production') log.info({ html: email.html, msg: 'Email body.' })

      const dir = outboxDir()
      if (dir) {
        await mkdir(dir, { recursive: true })
        const file = `${email.sentAt.replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}.json`
        await writeFile(path.join(dir, file), JSON.stringify(email, null, 2))
      }
    },
  })

/** Payload's email transport: Resend when `RESEND_API_KEY` is set, the outbox otherwise. */
export const emailAdapter = (): EmailAdapter => {
  const sender = parseSender(process.env.RESEND_FROM_EMAIL || DEFAULT_SENDER)
  const apiKey = process.env.RESEND_API_KEY

  return apiKey
    ? resendAdapter({ apiKey, defaultFromAddress: sender.address, defaultFromName: sender.name })
    : outboxAdapter(sender)
}

/**
 * Whether an email sent now reaches someone who can act on it: Resend is
 * configured, or this isn't production (the log holds it), or an outbox
 * directory is. Signup and password recovery refuse when it's false.
 */
export const isEmailDeliverable = (): boolean =>
  Boolean(process.env.RESEND_API_KEY) ||
  process.env.NODE_ENV !== 'production' ||
  Boolean(outboxDir())
