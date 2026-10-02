import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'

import { FAKE_UPSTASH_PORT, FAKE_UPSTASH_TOKEN } from './env'

/**
 * A stand-in for Upstash's REST API, so E2E runs the app's real
 * `@upstash/redis` and `@upstash/ratelimit` code paths. Started by the
 * Playwright configs as a `webServer` (`pnpm exec tsx` this file).
 *
 * It answers only the commands the app sends, and `{ error }` to anything
 * else, so an unplanned Upstash call fails loudly instead of passing:
 * - `HINCRBY`, `HGETALL` and `EXPIRE` on hashes (the referral counter);
 * - `EVALSHA` in exactly the shape of `@upstash/ratelimit` 2.0.8's
 *   sliding-window `limit` call (`dist/index.js:1595-1600`): three keys,
 *   then `tokens, now, window, increment`. For keys under
 *   `ratelimit:discord-` it runs that script's logic (`dist/index.js:229-272`),
 *   so the Discord limits can be hit: they're keyed per Discord user and
 *   game, which each spec makes fresh. Every other key is answered
 *   `[tokens - 1, tokens]`, which the library reads as allowed
 *   (`remaining >= 0`): the web forms share one client IP across specs.
 *   If an upgrade changes that call, those routes answer 500 in E2E.
 *
 * Routes: `POST /` (one command), `POST /pipeline` and `POST /multi-exec`
 * (arrays of commands, answered per command), `GET /` (health) and
 * `GET /debug/ttl?key=` (seconds left, -1 without expiry, -2 if missing).
 */

type Entry = { hash: Map<string, string>; expiresAt: null | number }
type Reply = { error: string } | { result: unknown }

const store = new Map<string, Entry>()

/** The sliding window's per-bucket request counts, which expire like the script's PEXPIRE. */
const counters = new Map<string, { count: number; expiresAt: number }>()

const counter = (key: string): number => {
  const entry = counters.get(key)
  if (entry && entry.expiresAt <= Date.now()) counters.delete(key)
  return counters.get(key)?.count ?? 0
}

/** Only the Discord limits are enforced; see the header. */
const ENFORCED_PREFIX = 'ratelimit:discord-'

/** `@upstash/ratelimit` 2.0.8's sliding-window `limit` script, without dynamic limits. */
const slidingWindow = (
  [currentKey, previousKey]: string[],
  tokens: number,
  now: number,
  window: number,
  incrementBy: number,
): [number, number] => {
  const percentageInCurrent = (now % window) / window
  const previous = Math.floor((1 - percentageInCurrent) * counter(previousKey))
  const current = counter(currentKey)
  if (incrementBy > 0 && previous + current >= tokens) return [-1, tokens]
  const next = current + incrementBy
  const expiresAt = counters.get(currentKey)?.expiresAt ?? Date.now() + window * 2 + 1000
  counters.set(currentKey, { count: next, expiresAt })
  return [tokens - (next + previous), tokens]
}

const live = (key: string): Entry | undefined => {
  const entry = store.get(key)
  if (entry?.expiresAt != null && entry.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  return entry
}

const integer = (value: unknown): null | number => {
  const n = Number(value)
  return Number.isSafeInteger(n) && String(value).trim() !== '' ? n : null
}

const run = (command: unknown): Reply => {
  if (!Array.isArray(command) || command.length === 0) return { error: 'ERR command must be a non-empty array' }
  const [name, ...args] = command.map(String)
  switch (name.toLowerCase()) {
    case 'hincrby': {
      const by = integer(args[2])
      if (args.length !== 3 || by === null) return { error: `ERR unsupported HINCRBY ${JSON.stringify(args)}` }
      const entry = live(args[0]) ?? { hash: new Map(), expiresAt: null }
      const next = (integer(entry.hash.get(args[1]) ?? '0') ?? 0) + by
      entry.hash.set(args[1], String(next))
      store.set(args[0], entry)
      return { result: next }
    }
    case 'hgetall': {
      if (args.length !== 1) return { error: `ERR unsupported HGETALL ${JSON.stringify(args)}` }
      return { result: [...(live(args[0])?.hash ?? [])].flat() }
    }
    case 'expire': {
      const seconds = integer(args[1])
      if (args.length !== 2 || seconds === null) return { error: `ERR unsupported EXPIRE ${JSON.stringify(args)}` }
      const entry = live(args[0])
      if (!entry) return { result: 0 }
      entry.expiresAt = Date.now() + seconds * 1000
      return { result: 1 }
    }
    case 'evalsha': {
      // [sha, numkeys, k1, k2, k3, tokens, now, window, increment]
      const [tokens, now, window, increment] = args.slice(5).map(integer)
      if (args.length !== 9 || args[1] !== '3' || tokens === null || now === null || !window || increment === null) {
        return { error: `ERR unsupported EVALSHA ${JSON.stringify(args)}` }
      }
      if (args[2].startsWith(ENFORCED_PREFIX)) {
        // Dynamic limits (k3) are off in the app: the key must be empty.
        if (args[4] !== '') return { error: `ERR unsupported dynamic limit ${JSON.stringify(args)}` }
        return { result: slidingWindow(args.slice(2, 4), tokens, now, window, increment) }
      }
      return { result: [tokens - 1, tokens] }
    }
    default:
      return { error: `ERR unsupported command ${JSON.stringify(name)}` }
  }
}

/** Upstash's `Upstash-Encoding: base64`: every string except "OK" is base64, numbers stay raw. */
const encode = (value: unknown): unknown => {
  if (typeof value === 'string') return value === 'OK' ? value : Buffer.from(value, 'utf8').toString('base64')
  if (Array.isArray(value)) return value.map(encode)
  return value
}

const send = (res: ServerResponse, status: number, body: unknown): void => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(body))
}

const readJSON = async (req: IncomingMessage): Promise<unknown> => {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk as Buffer)
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

const handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${FAKE_UPSTASH_PORT}`)

  if (req.method === 'GET' && url.pathname === '/') return send(res, 200, { ok: true })
  if (req.method === 'GET' && url.pathname === '/debug/ttl') {
    const entry = live(url.searchParams.get('key') ?? '')
    const ttl = !entry ? -2 : entry.expiresAt === null ? -1 : Math.ceil((entry.expiresAt - Date.now()) / 1000)
    return send(res, 200, { ttl })
  }

  if (req.method !== 'POST') return send(res, 405, { error: `ERR unsupported ${req.method} ${url.pathname}` })
  if (req.headers.authorization !== `Bearer ${FAKE_UPSTASH_TOKEN}`) return send(res, 401, { error: 'Unauthorized' })

  const base64 = req.headers['upstash-encoding'] === 'base64'
  const reply = (r: Reply): Reply => ('result' in r && base64 ? { result: encode(r.result) } : r)

  let body: unknown
  try {
    body = await readJSON(req)
  } catch {
    return send(res, 400, { error: 'ERR body is not JSON' })
  }

  if (url.pathname === '/') {
    const result = reply(run(body))
    return send(res, 'error' in result ? 400 : 200, result)
  }
  if (url.pathname === '/pipeline' || url.pathname === '/multi-exec') {
    if (!Array.isArray(body)) return send(res, 400, { error: 'ERR body must be an array of commands' })
    return send(res, 200, body.map((command) => reply(run(command))))
  }
  return send(res, 404, { error: `ERR unknown path ${url.pathname}` })
}

createServer((req, res) => {
  handle(req, res).catch((error: unknown) => send(res, 500, { error: String(error) }))
}).listen(FAKE_UPSTASH_PORT, '127.0.0.1', () => {
  console.log(`fake Upstash listening on http://127.0.0.1:${FAKE_UPSTASH_PORT}`)
})
