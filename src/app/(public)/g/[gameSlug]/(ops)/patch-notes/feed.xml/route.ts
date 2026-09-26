import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'
import { getServerSideURL } from '@/utilities/getURL'

export const revalidate = 3600

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
  const feedUrl = `${base}/g/${gameSlug}/patch-notes`

  const items = notes.docs
    .map((note) => {
      const link = `${feedUrl}/${note.slug}`
      const title = note.versionLabel ? `${note.versionLabel} — ${note.title}` : note.title
      return [
        '    <item>',
        `      <title>${escapeXml(title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
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
    <title>${escapeXml(`${project.name} — Patch Notes`)}</title>
    <link>${escapeXml(feedUrl)}</link>
    <atom:link href="${escapeXml(`${feedUrl}/feed.xml`)}" rel="self" type="application/rss+xml" />
    <description>${escapeXml(`Latest updates and patch notes for ${project.name}.`)}</description>
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
