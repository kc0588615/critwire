/**
 * Cache headers for the embed surface. Constants only, so `next.config.ts`
 * can import them.
 */

/**
 * The widgets and the JSON feeds. They keep no server cache and render
 * every request that reaches the origin; a shared cache (Cloudflare) keeps
 * a copy at most 240 s, then a browser at most 60 s more. With no
 * `stale-while-revalidate`, every viewer sees a version at most 5 minutes
 * old: edits, votes, holds and suspensions alike (see `docs/embed.md`).
 */
export const EMBED_CACHE_CONTROL = 'public, max-age=60, s-maxage=240'

/** The loader, `/embed/v1.js`: a versioned contract, cached a day at the edge and in browsers. */
export const LOADER_CACHE_CONTROL = 'public, max-age=86400, s-maxage=86400'
