import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

import type { Media } from '../../src/payload-types'
import { storageStatePath } from './support/env'
import { createProject, expect, pngOfWidth, test, uploadImage } from './support/fixtures'

/**
 * Media holds raster images only, stored outside `public/`, and
 * `/api/media/file/` is the only way to a file: it checks access on every
 * request, and its responses can't be cached anywhere shared. So a
 * suspension or a hold takes a studio's images down with its pages.
 */

const MEDIA_DIR = path.join(process.cwd(), 'media')
const PUBLIC_MEDIA_DIR = path.join(process.cwd(), 'public', 'media')

const SCRIPTED_SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"><script>alert(document.cookie)</script></svg>',
)
/** The smallest well-formed PDF: one empty page. */
const PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 8 8]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
)
/** An empty ZIP archive (just the end-of-central-directory record). */
const ZIP = Buffer.from([0x50, 0x4b, 0x05, 0x06, ...new Array<number>(18).fill(0)])

const sizeURL = (media: Media, name: string): string | null | undefined =>
  (media.sizes as Record<string, { url?: string | null } | undefined> | undefined)?.[name]?.url

test('S11.1 only raster images can be uploaded', async ({ api, world }) => {
  const aOwner = api('aOwner')
  const superAdmin = api('superAdmin')
  const files = [
    { name: `s111-${randomUUID()}.svg`, mimeType: 'image/svg+xml', buffer: SCRIPTED_SVG },
    { name: `s111-${randomUUID()}.pdf`, mimeType: 'application/pdf', buffer: PDF },
    { name: `s111-${randomUUID()}.zip`, mimeType: 'application/zip', buffer: ZIP },
  ]

  for (const file of files) {
    await test.step(file.mimeType, async () => {
      const { status, body } = await aOwner.upload('media', file, { alt: file.name, tenant: world.tenants.A.id })
      expect(status, JSON.stringify(body)).toBe(400)

      const stored = await superAdmin.find('media', { where: { filename: { equals: file.name } }, depth: 0 })
      expect(stored.body.totalDocs).toBe(0)
      expect(existsSync(path.join(MEDIA_DIR, file.name)), 'not on disk in media/').toBe(false)
      expect(existsSync(path.join(PUBLIC_MEDIA_DIR, file.name)), 'not on disk in public/media/').toBe(false)
    })
  }
})

test('S11.2 files are stored outside public/ and never go through the image optimizer', async ({
  api,
  world,
}) => {
  const media = await uploadImage(api('aOwner'), world.tenants.A.id, `s112-${randomUUID()}.png`)
  const filename = media.filename as string

  await test.step('/_next/image answers 404', async () => {
    const url = `/_next/image?url=${encodeURIComponent(`/api/media/file/${filename}`)}&w=640&q=100`
    expect((await api('anonymous').raw('GET', url)).status).toBe(404)
  })

  await test.step('the upload lands in media/, not public/media/', () => {
    expect(existsSync(path.join(MEDIA_DIR, filename))).toBe(true)
    expect(existsSync(path.join(PUBLIC_MEDIA_DIR, filename))).toBe(false)
  })

  await test.step('/media/<filename> is not a path', async () => {
    expect((await api('anonymous').raw('GET', `/media/${filename}`)).status).toBe(404)
  })
})

test('S11.3 file responses can’t be kept in a shared cache', async ({ api, world }) => {
  const media = await uploadImage(api('aOwner'), world.tenants.A.id, `s113-${randomUUID()}.png`, 'Art', await pngOfWidth(400))
  const size = sizeURL(media, 'thumbnail')
  expect(size, 'the upload is wide enough for the thumbnail size').toBeTruthy()

  for (const url of [media.url as string, size as string]) {
    const response = await api('anonymous').raw('GET', url)
    expect(response.status, url).toBe(200)
    expect(response.headers['cache-control'], url).toBe('private, max-age=300')
  }
})

test('S11.4 the hub’s key art is served from /api/media/file/, with WebP sizes', async ({
  api,
  page,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const noise = await sharp({
    create: { width: 1600, height: 900, channels: 3, background: '#000000', noise: { type: 'gaussian', mean: 128, sigma: 40 } },
  })
    .png()
    .toBuffer()
  const banner = await uploadImage(aOwner, world.tenants.A.id, `s114-${randomUUID()}.png`, 'Key art', noise)
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('media-art'), { banner: banner.id })

  await page.goto(`/g/${project.slug}`)
  const source = page.locator('.fs-hero-art picture source')
  const image = page.locator('.fs-hero-art picture img')

  await test.step('the <source> lists the width-only sizes the upload is wide enough for', async () => {
    const srcSet = (await source.getAttribute('srcset')) ?? ''
    const urls = srcSet.split(',').map((candidate) => candidate.trim().split(/\s+/)[0])
    const expected = ['thumbnail', 'small', 'medium', 'large'].map((name) => sizeURL(banner, name))
    expect(urls.map((url) => url.split('?')[0])).toEqual(expected)
    expect(sizeURL(banner, 'xlarge'), 'xlarge is wider than the upload').toBeFalsy()
    expect(srcSet).not.toContain(sizeURL(banner, 'square') as string)
    expect(srcSet).not.toContain(sizeURL(banner, 'og') as string)

    for (const url of urls) {
      expect(url.startsWith('/api/media/file/'), url).toBe(true)
      const response = await api('anonymous').raw('GET', url)
      expect(response.status, url).toBe(200)
      expect(response.headers['content-type'], url).toBe('image/webp')
    }
  })

  await test.step('the <img> loads from /api/media/file/', async () => {
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    const current = new URL(await image.evaluate((img: HTMLImageElement) => img.currentSrc))
    expect(current.pathname.startsWith('/api/media/file/'), current.href).toBe(true)
  })
})

test('S11.5 a visitor signed in to another studio sees a portal’s logo', async ({
  api,
  browser,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const logo = await uploadImage(aOwner, world.tenants.A.id, `s115-${randomUUID()}.png`, 'Logo', await pngOfWidth(400))
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('media-logo'), { logo: logo.id })

  const context = await browser.newContext({ storageState: storageStatePath('bOwner') })
  try {
    const page = await context.newPage()
    await page.goto(`/g/${project.slug}`)
    const image = page.locator(`a[href="/g/${project.slug}"] img`)
    await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
    const current = new URL(await image.evaluate((img: HTMLImageElement) => img.currentSrc))
    expect(current.pathname.startsWith('/api/media/file/'), current.href).toBe(true)
  } finally {
    await context.close()
  }
})
