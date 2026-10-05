import { verificationToken } from './support/email'
import { BASE_URL, SECOND_BASE_URL } from './support/env'
import { createProject, expect, newRequestContext, randomEmail, startSignup, test } from './support/fixtures'
import { expectLegalLinks, LEGAL_SLUGS, legalFrontMatter } from './support/legal'

/**
 * critwire.com's three legal documents (plan S2, Goal 1), rendered from
 * `legal/<slug>.md`. Each page shows its title, the version and date from
 * its front matter (read here, not through the app's loader), and, while
 * it's a draft, a banner and a noindex. Anything else under /legal is a 404.
 * Every footer links all three (plan S10).
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

test('LP3 the site, portal and sign-in footers link the three documents', async ({
  api,
  page,
  playwright,
  seedUser,
  uniqueSlug,
  world,
}) => {
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('lp3-hub'))
  const hub = `/g/${project.slug}`
  const footer = page.getByRole('contentinfo')

  await test.step('the home page', async () => {
    await page.goto('/')
    await expectLegalLinks(footer, 'Legal')
  })

  await test.step('a portal hub, with "Powered by" (3100)', async () => {
    await page.goto(hub)
    await expect(footer).toContainText('Powered by Critwire')
    await expectLegalLinks(footer, 'Critwire legal')
  })

  await test.step('a portal hub, with "Powered by" hidden (3102)', async () => {
    await page.goto(`${SECOND_BASE_URL}${hub}`)
    await expect(page.getByRole('heading', { level: 1, name: project.name })).toBeVisible()
    await expect(footer).not.toContainText('Powered by')
    await expectLegalLinks(footer, 'Critwire legal')
  })

  await test.step('signup', async () => {
    await page.goto('/signup')
    await expectLegalLinks(footer, 'Legal')
  })

  await test.step('the verify page, from a pending signup', async () => {
    const email = randomEmail('lp3')
    const request = await newRequestContext(playwright)
    try {
      await startSignup(request, email)
    } finally {
      await request.dispose()
    }
    await page.goto(`/verify/${await verificationToken(email)}`)
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible()
    await expectLegalLinks(footer, 'Legal')
  })

  await test.step('the admin sign-in', async () => {
    await page.goto('/admin/login')
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible()
    await expectLegalLinks(page.locator('body'), 'Legal')
    await test.info().attach('lp3-admin-login', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })

  await test.step('onboarding, for an account that accepted', async () => {
    const user = await seedUser('lp3')
    await page.context().addCookies([{ name: 'payload-token', value: user.token, url: BASE_URL }])
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/onboarding$/)
    await expectLegalLinks(footer, 'Legal')
  })
})
