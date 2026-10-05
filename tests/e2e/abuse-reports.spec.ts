import type { AbuseReport } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { SECOND_BASE_URL, TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  createProject,
  expect,
  newRequestContext,
  submitWithTurnstile,
  test,
} from './support/fixtures'
import { expectPlayerFormNotices } from './support/legal'

/**
 * On the hosted instance (open signup), every portal's footer has "Report
 * this page". Reports go to a queue only super admins can read, and still
 * name the game when its portal is held or suspended. A self-hosted
 * instance offers neither the link nor the form.
 */

const reportsFor = async (superAdmin: RestClient, pageUrl: string): Promise<AbuseReport[]> => {
  const { status, body } = await superAdmin.find('abuse-reports', {
    where: { pageUrl: { equals: pageUrl } },
    depth: 0,
  })
  expect(status).toBe(200)
  return body.docs
}

const reportForm = (page: string, data: Record<string, string> = {}) => ({
  page,
  reason: 'spam',
  details: 'Links to a phishing site.',
  turnstileToken: TURNSTILE_DUMMY_TOKEN,
  ...data,
})

test('S17.1 a player reports a portal and a super admin reads it', async ({
  api,
  page,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s171')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const hub = `/g/${project.slug}`

  await page.goto(`${hub}/updates`)
  await page.getByRole('contentinfo').getByRole('link', { name: 'Report this page' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Report this page' })).toBeVisible()
  const url = new URL(page.url())
  expect(url.pathname).toBe('/report-abuse')
  expect(url.searchParams.get('page')).toBe(hub)
  // The path, never the game's name (P6).
  await expect(page.getByRole('main')).toContainText(hub)
  await expect(page.getByRole('main')).not.toContainText(project.name)

  await page.getByLabel('Reason').selectOption({ label: 'Scam or phishing' })
  await page.getByLabel('Details (optional)').fill('Asks players for their Steam password.')
  await page.getByLabel('Your email (optional, 13 or older)', { exact: true }).fill('player@e2e.test')
  await submitWithTurnstile(page, 'Send report')

  await expect(page.getByRole('heading', { level: 1, name: 'Report sent' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Back to the page' })).toHaveAttribute('href', hub)

  const [report, ...others] = await reportsFor(superAdmin, hub)
  expect(others).toHaveLength(0)
  expect(report).toMatchObject({
    details: 'Asks players for their Steam password.',
    gameProject: project.id,
    pageUrl: hub,
    reason: 'scam',
    reporterEmail: 'player@e2e.test',
    status: 'open',
  })

  // Only super admins read the queue.
  expect((await owner.client.find('abuse-reports')).status).toBe(403)
  expect((await api('anonymous').find('abuse-reports')).status).toBe(403)

  // A suspended studio's portal is unavailable, and a report about it still names its game.
  const suspend = await superAdmin.update('tenants', tenant.id, { suspended: true })
  expect(suspend.status, JSON.stringify(suspend.body)).toBe(200)
  const feedback = `${hub}/feedback`
  const response = await api('anonymous').raw('POST', '/report-abuse/submit', {
    data: reportForm(feedback),
  })
  expect(response.status, JSON.stringify(response.body)).toBe(200)
  const [suspendedReport] = await reportsFor(superAdmin, feedback)
  expect(suspendedReport).toMatchObject({
    gameProject: project.id,
    pageUrl: feedback,
    reason: 'spam',
  })
})

test('S17.2 the report form needs Turnstile and a portal page', async ({
  api,
  page,
  playwright,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const anonymous = api('anonymous')
  const { tenant, owner } = await seedStudio('s172')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const hub = `/g/${project.slug}`

  const refused = [
    reportForm(hub, { turnstileToken: '' }),
    reportForm('/admin'),
    reportForm('/'),
    reportForm(`https://evil.example${hub}`),
    reportForm(`${hub}?next=/admin`),
    reportForm(hub, { reason: 'boring' }),
    reportForm(hub, { details: 'x'.repeat(2001) }),
    reportForm('/g/no-such-game-s172'),
  ]
  for (const data of refused) {
    const response = await anonymous.raw('POST', '/report-abuse/submit', { data })
    expect(response.status, JSON.stringify(data).slice(0, 120)).toBe(400)
  }
  expect(await reportsFor(superAdmin, hub)).toHaveLength(0)

  // A browser's post without a token goes back to its form, which says so.
  const browser = await newRequestContext(playwright)
  try {
    const response = await browser.post('/report-abuse/submit', {
      form: reportForm(hub, { turnstileToken: '' }),
      maxRedirects: 0,
    })
    expect(response.status()).toBe(303)
    const location = response.headers().location ?? ''
    expect(new URL(location, 'http://x').search).toBe(`?page=${encodeURIComponent(hub)}&error=1`)
    await page.goto(location)
    await expect(page.getByRole('main').getByRole('alert')).toContainText(
      'Your report wasn’t sent.',
    )
    await expect(page.getByLabel('Reason')).toBeVisible()
  } finally {
    await browser.dispose()
  }

  // A form link that names no portal page is a 404.
  for (const path of ['/report-abuse', '/report-abuse?page=/admin']) {
    expect((await anonymous.raw('GET', path)).status, path).toBe(404)
  }
})

test('S17.3 a self-hosted instance takes no abuse reports', async ({
  api,
  playwright,
  seedStudio,
}) => {
  const { tenant, owner } = await seedStudio('s173')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const hub = `/g/${project.slug}`

  // The first server links it; the second (signup off) doesn't.
  const first = await api('anonymous').raw<string>('GET', hub)
  expect(first.status).toBe(200)
  expect(first.body).toContain('Report this page')

  const second = await newRequestContext(playwright, SECOND_BASE_URL)
  try {
    const portal = await second.get(hub)
    expect(portal.status()).toBe(200)
    const html = await portal.text()
    expect(html).toContain(project.name)
    expect(html).not.toContain('Report this page')
    expect(html).not.toContain('/report-abuse')

    expect((await second.get(`/report-abuse?page=${encodeURIComponent(hub)}`)).status()).toBe(404)
    const submit = await second.post('/report-abuse/submit', {
      form: reportForm(hub),
      maxRedirects: 0,
    })
    expect(submit.status()).toBe(404)
  } finally {
    await second.dispose()
  }
})

test('S17.4 the report form warns against sensitive details and shows the Terms notice', async ({
  api,
  page,
  uniqueSlug,
  world,
}) => {
  const hub = `/g/${(await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('s174'))).slug}`
  await page.goto(`/report-abuse?page=${encodeURIComponent(hub)}`)
  const form = page.locator('form[action="/report-abuse/submit"]')
  await expectPlayerFormNotices(form, { submit: 'Send report', textFields: ['Details (optional)'] })
  const email = form.getByLabel('Your email (optional, 13 or older)', { exact: true })
  await expect(email).toHaveAttribute('type', 'email')
  await expect(email).toHaveAccessibleDescription('Only if you’d like us to be able to reply.')
  await test.info().attach('s174-report-form', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
})
