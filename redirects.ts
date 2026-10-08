import type { NextConfig } from 'next'

import { portalPaths } from './src/lib/game-portal/paths'
import { SITE } from './src/lib/site'

export const redirects: NextConfig['redirects'] = async () => {
  const internetExplorerRedirect = {
    destination: '/ie-incompatible.html',
    has: [
      {
        type: 'header' as const,
        key: 'user-agent',
        value: '(.*Trident.*)', // all ie browsers
      },
    ],
    permanent: false,
    source: '/:path((?!ie-incompatible.html$).*)', // all pages except the incompatibility page
  }

  // The feedback pivot's renames. 301 for GETs, so feed readers update
  // their subscriptions; 308 for the old form's POST, so it stays a POST.
  // Query strings pass through (`/issues?view=board` keeps its view).
  const portalRenames = [
    {
      destination: '/g/:game/feedback/new/submit',
      permanent: true,
      source: '/g/:game/report/submit',
    },
    { destination: '/g/:game/feedback/new', source: '/g/:game/report', statusCode: 301 as const },
    { destination: '/g/:game/feedback/:rest*', source: '/g/:game/issues/:rest*', statusCode: 301 as const },
    {
      destination: '/g/:game/updates/:rest*',
      source: '/g/:game/patch-notes/:rest*',
      statusCode: 301 as const,
    },
  ]

  // The board's friendly alias, the URL studios paste. 307, not 301:
  // browsers cache a 301 for good, and the alias may become a page of its
  // own. Next merges the request's query, so `?ref=` reaches the board.
  const roadmapAlias = {
    destination: '/g/:game/feedback?view=board',
    permanent: false,
    source: '/g/:game/roadmap',
  }

  // critwire.com is the game's site: `/` opens its hub (D24). 307 for the
  // same reason as the alias; the query passes through (`/?ref=x`).
  const siteHome = { destination: portalPaths(SITE.gameSlug).hub, permanent: false, source: '/' }

  return [internetExplorerRedirect, ...portalRenames, roadmapAlias, siteHome]
}
