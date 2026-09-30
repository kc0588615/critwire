import { getGameProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'
import { getServerSideURL } from '@/utilities/getURL'

export const revalidate = 3600

// No paths at build time: each one renders on its first visit, then is
// served from the ISR cache until a hook revalidates it.
export async function generateStaticParams() {
  return []
}

const escapeXml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) {
    return new Response('Not found', { status: 404 })
  }

  const notes = await queryPublishedPatchNotes({ limit: 20, page: 1, projectID: project.id })

  const base = getServerSideURL()
  const paths = portalPaths(gameSlug)
  const feedUrl = `${base}${paths.updates}`

  const items = notes.docs
    .map((note) => {
      const link = `${base}${paths.update(note.slug)}`
      const guid = `${base}${paths.updateGuid(note.slug)}`
      const title = note.versionLabel ? `${note.versionLabel} — ${note.title}` : note.title
      return [
        '    <item>',
        `      <title>${escapeXml(title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(guid)}</guid>`,
        note.publishedAt
          ? `      <pubDate>${new Date(note.publishedAt).toUTCString()}</pubDate>`
          : null,
        note.summary ? `      <description>${escapeXml(note.summary)}</description>` : null,
        '    </item>',
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(`${project.name} — Updates`)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <atom:link href="${escapeXml(`${base}${paths.rss}`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(`The latest updates for ${project.name}.`)}</description>
    <language>en</language>
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  })
}
