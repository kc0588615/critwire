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
