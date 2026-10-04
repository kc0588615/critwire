import { expect, test } from './support/fixtures'
import { LEGAL_SLUGS, legalFrontMatter } from './support/legal'

/**
 * critwire.com's three legal documents (plan S2, Goal 1), rendered from
 * `legal/<slug>.md`. Each page shows its title, the version and date from
 * its front matter (read here, not through the app's loader), and, while
 * it's a draft, a banner and a noindex. Anything else under /legal is a 404.
 */

const TITLES = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  copyright: 'Copyright Policy',
} as const

const DRAFT_BANNER = 'This is a draft under legal review. It isn’t final.'

// "2026-10-04" → "4 October 2026".
const longDate = (isoDate: string): string =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${isoDate}T00:00:00Z`))

for (const slug of LEGAL_SLUGS) {
  test(`LP1 /legal/${slug} shows its title, version, date and draft note`, async ({ page }) => {
    const { body, effective, status, version } = legalFrontMatter(slug)
    expect(status).toBe('draft')

    const response = await page.goto(`/legal/${slug}`)
    expect(response?.status()).toBe(200)

    await expect(page).toHaveTitle(`${TITLES[slug]} | Critwire`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITLES[slug])
    await expect(page.getByText(`Version ${version} · Draft of ${longDate(effective)}`, { exact: true })).toBeVisible()
    await expect(page.getByRole('note')).toHaveText(DRAFT_BANNER)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    // The body is rendered: its first `##` heading is an h2.
    const firstHeading = /^## (.+)$/m.exec(body)?.[1]
    expect(firstHeading).toBeTruthy()
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(firstHeading!)

    await test.info().attach(`legal-${slug}`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })
}

test('LP2 unknown legal documents are 404s', async ({ request }) => {
  for (const path of ['/legal/unknown', '/legal/terms.md']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(404)
  }
})
