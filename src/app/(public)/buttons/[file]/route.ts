import { parseButtonFile } from '@/lib/share/buttons'
import { buttonImage, imageResponse } from '@/lib/share/images'

// Rendered on request and memoized per process, so no image files are
// committed; the long HTTP cache keeps Cloudflare in front of it.
export const dynamic = 'force-dynamic'

const ONE_DAY_SECONDS = 86_400

export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }): Promise<Response> {
  const button = parseButtonFile((await params).file)
  if (!button) {
    return new Response('Not found', { status: 404 })
  }
  return imageResponse(await buttonImage(button), button.format, ONE_DAY_SECONDS)
}
