import type { NextConfig } from 'next'

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

  return [internetExplorerRedirect, ...portalRenames]
}
