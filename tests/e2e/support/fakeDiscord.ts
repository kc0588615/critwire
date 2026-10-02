import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import {
  BASE_URL,
  DISCORD_TEST_APPLICATION_ID,
  DISCORD_TEST_CLIENT_SECRET,
  FAKE_DISCORD_PORT,
  WEBHOOK_SINK_ORIGIN,
} from './env'

/**
 * A stand-in for Discord's HTTP API, the first server's
 * `DISCORD_API_BASE_URL`. Started by the Playwright configs as a
 * `webServer` (`pnpm exec tsx` this file).
 *
 * It answers only the calls the app is known to make, and a 404 with a
 * logged error to anything else, so an unplanned call fails loudly:
 * - `POST /oauth2/token`, under the test app's Basic auth: the
 *   `client_credentials` grant with scope `applications.commands.update`,
 *   and the `authorization_code` grant for a code `guild-<g>-channel-<c>`,
 *   which answers with a new webhook in that channel whose URL is on the
 *   webhook sink (an unknown code gets a 400);
 * - `PUT /applications/:id/commands`, under the token the first grant issued;
 * - `DELETE /webhooks/:id/:token`, for a webhook it created and hasn't deleted.
 *
 * `GET /debug/requests` lists every call it received (the debug routes
 * aside), oldest first, for the specs to assert on. `GET /` is the health check.
 */

export interface RecordedRequest {
  method: string
  path: string
  authorization: null | string
  /** Parsed JSON, the form fields of a form body, or `null` without a body. */
  body: unknown
}

const ACCESS_TOKEN = 'e2e-discord-access-token'
const BASIC_AUTH = `Basic ${Buffer.from(`${DISCORD_TEST_APPLICATION_ID}:${DISCORD_TEST_CLIENT_SECRET}`).toString('base64')}`

const CALLBACK_URL = `${BASE_URL}/api/discord/callback`

const received: RecordedRequest[] = []
/** Live webhooks it created: ID → token. */
const webhooks = new Map<string, string>()
let nextWebhookID = 300000000000000000n

const send = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readBody = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return null
  if (req.headers['content-type']?.startsWith('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text))
  }
  return JSON.parse(text) as unknown
}

const token = (res: ServerResponse, request: RecordedRequest): void => {
  if (request.authorization !== BASIC_AUTH) return send(res, 401, { error: 'invalid_client' })
  const fields = (request.body ?? {}) as Record<string, string>
  if (
    fields.grant_type === 'client_credentials' &&
    fields.scope === 'applications.commands.update'
  ) {
    return send(res, 200, {
      access_token: ACCESS_TOKEN,
      expires_in: 604800,
      scope: fields.scope,
      token_type: 'Bearer',
    })
  }
  if (fields.grant_type === 'authorization_code') return codeGrant(res, fields)
  return send(res, 400, { error: 'unsupported_grant_type' })
}

const codeGrant = (res: ServerResponse, fields: Record<string, string>): void => {
  const code = /^guild-(\d{17,20})-channel-(\d{17,20})$/.exec(fields.code ?? '')
  if (!code || fields.redirect_uri !== CALLBACK_URL) return send(res, 400, { error: 'invalid_grant' })

  const [, guildID, channelID] = code
  const id = String(nextWebhookID++)
  const token = randomBytes(24).toString('base64url')
  webhooks.set(id, token)
  return send(res, 200, {
    access_token: 'e2e-discord-user-access-token',
    expires_in: 604800,
    refresh_token: 'e2e-discord-user-refresh-token',
    scope: 'applications.commands webhook.incoming',
    token_type: 'Bearer',
    webhook: {
      application_id: DISCORD_TEST_APPLICATION_ID,
      avatar: null,
      channel_id: channelID,
      guild_id: guildID,
      id,
      name: 'critwire',
      token,
      type: 1,
      url: `${WEBHOOK_SINK_ORIGIN}/api/webhooks/${id}/${token}`,
    },
  })
}

const deleteWebhook = (res: ServerResponse, id: string, token: string): void => {
  if (webhooks.get(id) !== token) return send(res, 404, { code: 10015, message: 'Unknown Webhook' })
  webhooks.delete(id)
  res.writeHead(204)
  res.end()
}

const putCommands = (
  res: ServerResponse,
  request: RecordedRequest,
  applicationId: string,
): void => {
  if (request.authorization !== `Bearer ${ACCESS_TOKEN}`)
    return send(res, 401, { message: '401: Unauthorized' })
  if (applicationId !== DISCORD_TEST_APPLICATION_ID)
    return send(res, 403, { message: 'Missing Access' })
  if (!Array.isArray(request.body)) return send(res, 400, { message: 'Invalid Form Body' })
  return send(
    res,
    200,
    request.body.map((command: object, i: number) => ({
      ...command,
      application_id: applicationId,
      id: String(200000000000000000n + BigInt(i)),
    })),
  )
}

const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${FAKE_DISCORD_PORT}`)

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, { ok: true })
  if (req.method === 'GET' && url.pathname === '/debug/requests') return send(res, 200, received)

  const request: RecordedRequest = {
    authorization: req.headers.authorization ?? null,
    body: await readBody(req),
    method: req.method ?? '',
    path: url.pathname,
  }
  received.push(request)

  if (req.method === 'POST' && url.pathname === '/oauth2/token') return token(res, request)
  const commands = /^\/applications\/(\d+)\/commands$/.exec(url.pathname)
  if (req.method === 'PUT' && commands) return putCommands(res, request, commands[1])
  const webhook = /^\/webhooks\/(\d+)\/([^/]+)$/.exec(url.pathname)
  if (req.method === 'DELETE' && webhook) return deleteWebhook(res, webhook[1], webhook[2])

  console.error(`fake Discord: unplanned call ${req.method} ${url.pathname}`)
  return send(res, 404, { message: '404: Not Found' })
}

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => send(res, 500, { message: String(error) }))
}).listen(FAKE_DISCORD_PORT, '127.0.0.1', () => {
  console.log(`fake Discord listening on http://127.0.0.1:${FAKE_DISCORD_PORT}`)
})
