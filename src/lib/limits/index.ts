import { APIError, type PayloadRequest } from 'payload'

/**
 * The hosted plan's limits: the only place that knows them. Each is off
 * unless its variable holds a positive whole number, so a self-hosted
 * instance is unlimited. Checked at boot by `instrumentation-node.ts`.
 */
export interface Limits {
  gamesPerStudio: null | number
  mediaMBPerStudio: null | number
  publicFeedbackPerGame: null | number
}

type ID = number | string

const MEBIBYTE = 1024 * 1024

const parseLimit = (name: string): null | number => {
  const raw = process.env[name]?.trim()
  if (!raw) return null
  if (!/^[1-9]\d*$/.test(raw)) {
    throw new Error(`${name} must be a positive whole number, or empty to turn the limit off (got "${raw}").`)
  }
  return Number(raw)
}

let limits: Limits | undefined

export function getLimits(): Limits {
  limits ??= {
    gamesPerStudio: parseLimit('CRITWIRE_LIMIT_GAMES_PER_STUDIO'),
    mediaMBPerStudio: parseLimit('CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO'),
    publicFeedbackPerGame: parseLimit('CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME'),
  }
  return limits
}

/** A 403 whose message the admin shows as its error toast, word for word. */
export class LimitReachedError extends APIError {
  constructor(message: string) {
    super(message, 403, undefined, true)
  }
}

// Counts run as the system, in the write's own transaction (`req`).

export const countStudioGames = async (req: PayloadRequest, tenantID: ID): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: 'game-projects',
    overrideAccess: true,
    req,
    where: { tenant: { equals: tenantID } },
  })
  return totalDocs
}

/** Original uploads only; generated sizes don't count. */
export const sumStudioMediaBytes = async (
  req: PayloadRequest,
  tenantID: ID,
  excludeID?: ID,
): Promise<number> => {
  const { docs } = await req.payload.find({
    collection: 'media',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    select: { filesize: true },
    where: {
      and: [{ tenant: { equals: tenantID } }, ...(excludeID == null ? [] : [{ id: { not_equals: excludeID } }])],
    },
  })
  return docs.reduce((total, doc) => total + (doc.filesize ?? 0), 0)
}

/** Archived items count too: they're still on the public board. */
export const countPublicFeedback = async (req: PayloadRequest, gameProjectID: ID): Promise<number> => {
  const { totalDocs } = await req.payload.count({
    collection: 'issues',
    overrideAccess: true,
    req,
    where: { and: [{ gameProject: { equals: gameProjectID } }, { isPublic: { equals: true } }] },
  })
  return totalDocs
}

export async function assertGameRoom(req: PayloadRequest, tenantID: ID): Promise<void> {
  const limit = getLimits().gamesPerStudio
  if (limit == null) return
  if ((await countStudioGames(req, tenantID)) >= limit) {
    throw new LimitReachedError(`Your studio has reached its limit of ${limit} games on the hosted plan.`)
  }
}

/** `replacingID` is the document whose file this upload replaces, if any. */
export async function assertMediaRoom(
  req: PayloadRequest,
  tenantID: ID,
  bytes: number,
  replacingID?: ID,
): Promise<void> {
  const limit = getLimits().mediaMBPerStudio
  if (limit == null) return
  if ((await sumStudioMediaBytes(req, tenantID, replacingID)) + bytes > limit * MEBIBYTE) {
    throw new LimitReachedError(`This upload would take your studio past its ${limit} MB of media.`)
  }
}

/** Whether one more item can go public on the game's board. Auto-publish asks this. */
export async function hasPublicFeedbackRoom(req: PayloadRequest, gameProjectID: ID): Promise<boolean> {
  const limit = getLimits().publicFeedbackPerGame
  if (limit == null) return true
  return (await countPublicFeedback(req, gameProjectID)) < limit
}

export async function assertPublicFeedbackRoom(req: PayloadRequest, gameProjectID: ID): Promise<void> {
  if (await hasPublicFeedbackRoom(req, gameProjectID)) return
  const limit = getLimits().publicFeedbackPerGame
  throw new LimitReachedError(
    `This game has reached ${limit} public feedback items. Make older items private or delete them to add more.`,
  )
}
