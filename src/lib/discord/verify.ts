import { createPublicKey, verify, type KeyObject } from 'node:crypto'

/** Discord's requests must be signed within this many seconds of now, either way. */
const MAX_CLOCK_SKEW_SECONDS = 300

/** The DER header of an Ed25519 SubjectPublicKeyInfo; the 32 key bytes follow it. */
const ED25519_SPKI_PREFIX = '302a300506032b6570032100'

let cachedKey: { hex: string; key: KeyObject } | undefined

const publicKeyFor = (hex: string): KeyObject => {
  if (cachedKey?.hex !== hex) {
    const key = createPublicKey({
      format: 'der',
      key: Buffer.from(ED25519_SPKI_PREFIX + hex, 'hex'),
      type: 'spki',
    })
    cachedKey = { hex, key }
  }
  return cachedKey.key
}

/**
 * Whether an interaction request really comes from Discord: its
 * `X-Signature-Timestamp` is within ±300 s of `nowSeconds`, and its
 * `X-Signature-Ed25519` is the application's signature of timestamp‖body.
 * `body` is the raw request body, never re-serialized.
 */
export function isValidInteractionRequest({
  body,
  nowSeconds,
  publicKey,
  signature,
  timestamp,
}: {
  body: Buffer
  nowSeconds: number
  publicKey: string
  signature: null | string
  timestamp: null | string
}): boolean {
  if (!signature || !timestamp) return false
  if (
    !/^\d{1,12}$/.test(timestamp) ||
    Math.abs(nowSeconds - Number(timestamp)) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return false
  }
  if (!/^[0-9a-f]{128}$/i.test(signature)) return false
  return verify(
    null,
    Buffer.concat([Buffer.from(timestamp, 'utf8'), body]),
    publicKeyFor(publicKey),
    Buffer.from(signature, 'hex'),
  )
}
