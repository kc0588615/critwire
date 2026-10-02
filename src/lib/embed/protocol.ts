/**
 * Protocol v1 between an embed and the loader (`public/embed/v1.js`;
 * documented in `docs/embed.md`). It may only gain message types and
 * optional fields; anything incompatible is a new loader URL.
 */
export const EMBED_PROTOCOL = 1

/** The embed's content height changed. */
export type EmbedResizeMessage = { critwire: typeof EMBED_PROTOCOL; type: 'resize'; height: number }

/** The player pressed Escape inside the embed: the floating button's dialog closes. */
export type EmbedCloseMessage = { critwire: typeof EMBED_PROTOCOL; type: 'close' }

export type EmbedHostMessage = EmbedCloseMessage | EmbedResizeMessage

/**
 * Posts to the page that frames the embed. The target is `'*'`: the host
 * is any site, and the messages carry only a height or a close request.
 */
export const postToHost = (message: EmbedHostMessage): void => {
  if (window.parent !== window) window.parent.postMessage(message, '*')
}

/**
 * The item page, opened by the embed's vote link, tells the embed the new
 * count. `issueId` is the feed's string id.
 */
export type EmbedVoteMessage = {
  critwire: typeof EMBED_PROTOCOL
  type: 'vote'
  issueId: string
  votes: number
  voted: boolean
}

/**
 * After a vote or a withdrawal, tells the page that opened this one. The
 * target is this page's own origin, so only an embed receives it: a host
 * page that opened the item page itself never learns how the player voted.
 */
export const notifyOpener = (vote: Pick<EmbedVoteMessage, 'issueId' | 'votes' | 'voted'>): void => {
  const message: EmbedVoteMessage = { critwire: EMBED_PROTOCOL, type: 'vote', ...vote }
  window.opener?.postMessage(message, window.location.origin)
}

/** Whether `data` is a well-formed vote message. Its sender is the caller's to check. */
export const isVoteMessage = (data: unknown): data is EmbedVoteMessage => {
  const message = data as Partial<EmbedVoteMessage> | null
  return (
    typeof message === 'object' &&
    message !== null &&
    message.critwire === EMBED_PROTOCOL &&
    message.type === 'vote' &&
    typeof message.issueId === 'string' &&
    Number.isInteger(message.votes) &&
    typeof message.voted === 'boolean'
  )
}
