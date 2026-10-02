import { badgeResponse } from '@/lib/share/badge'

// Rendered per request; the 5-minute HTTP cache keeps Cloudflare in front.
export const dynamic = 'force-dynamic'

export async function GET(req: Request, { params }: { params: Promise<{ gameSlug: string }> }): Promise<Response> {
  return badgeResponse(req, (await params).gameSlug, 'svg')
}
