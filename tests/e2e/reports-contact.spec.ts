import type { Page } from '@playwright/test'
import { extractID } from 'payload/shared'

import type { GameProject, PayloadJob } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { TURNSTILE_DUMMY_TOKEN } from './support/env'
import { createProject, createReport, expect, test } from './support/fixtures'

/**
 * Player reports and the contact form: the public forms behind Turnstile,
 * report promotion into a public issue, and contact delivery to Discord
 * (a local sink) or email. Replaces tests/manual/verify-phase6.mjs, the
 * Turnstile check in verify-phase7.mjs and tally-parse.int.
 */

const reportPath = (slug: string) => `/g/${slug}/report`
const contactPath = (slug: string) => `/g/${slug}/contact`

/** Loads `path` and fails unless the server answers 200. */
async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
}

/** Waits for the real Turnstile widget to issue its token, then submits. */
async function submitWithTurnstile(page: Page, button: string): Promise<void> {
  await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 })
  await page.getByRole('button', { name: button }).click()
}

/** Posts a public form as JSON, the way a script or the API would. */
const submitForm = (client: RestClient, path: string, data: Record<string, unknown>) =>
  client.raw<{ error?: string; id?: number; ok?: boolean }>('POST', `${path}/submit`, { data })

const setContact = (client: RestClient, project: GameProject, contact: GameProject['contact']) =>
  client.update('game-projects', project.id, { contact })

/** Contact jobs of `task` whose input carries `message`, as a super admin sees them. */
async function contactJobs(
  superAdmin: RestClient,
  task: 'discord-webhook' | 'email-contact-form',
  message: string,
): Promise<PayloadJob[]> {
  const { status, body } = await superAdmin.find('payload-jobs', {
    where: { taskSlug: { equals: task } },
    limit: 100,
    sort: '-createdAt',
  })
  expect(status, JSON.stringify(body)).toBe(200)
  return body.docs.filter((job) => (job.input as { message?: string } | null)?.message === message)
}

test.describe('S5.1–S5.3 player reports', () => {
  let project: GameProject

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-report'))
  })

  test('S5.1 a player files a report in the browser and only the studio sees it', async ({ api, page, world }) => {
    const title = 'Raft drifts through the pier'
    await open(page, reportPath(project.slug))

    await test.step('the Turnstile widget issues a token and the submit lands', async () => {
      await page.getByLabel('Title').fill(title)
      await page.getByLabel('Field notes').fill('Paddling into the pier clips the raft straight through it.')
      await page.getByLabel('Track type').selectOption('GAMEPLAY')
      await page.getByLabel('Email (optional)').fill('player@e2e.test')
      await page.getByLabel('Platform (optional)').fill('Steam Deck')
      await page.getByLabel('Game version (optional)').fill('1.4.2')
      await submitWithTurnstile(page, 'Send report')
      await expect(page).toHaveURL(/[?&]submitted=1/)
      await expect(page.getByText('Field report received.')).toBeVisible()
    })

    await test.step("the studio owner sees it as NEW with the player's details", async () => {
      const { body } = await api('aOwner').find('issue-reports', { where: { title: { equals: title } } })
      expect(body.docs).toHaveLength(1)
      expect(body.docs[0]).toMatchObject({
        status: 'NEW',
        category: 'GAMEPLAY',
        submitterEmail: 'player@e2e.test',
        platform: 'Steam Deck',
        gameVersion: '1.4.2',
        gameProject: { id: project.id },
        tenant: { id: world.tenants.A.id },
      })
    })

    await test.step('another studio does not', async () => {
      const { body } = await api('bOwner').find('issue-reports', { where: { title: { equals: title } } })
      expect(body.docs).toHaveLength(0)
    })
  })

  test('S5.2 the report endpoint validates its input and the game', async ({ api, uniqueSlug }) => {
    const anonymous = api('anonymous')
    const valid = {
      title: 'Map fails to open',
      description: 'Pressing M does nothing after loading a save.',
      category: 'USER_INTERFACE',
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    }
    expect((await submitForm(anonymous, reportPath(project.slug), { ...valid, description: 'short' })).status).toBe(400)
    expect((await submitForm(anonymous, reportPath(project.slug), { ...valid, turnstileToken: '' })).status).toBe(400)
    expect((await submitForm(anonymous, reportPath(uniqueSlug('rc-no-such-game')), valid)).status).toBe(404)
  })

  test('S5.2 a Tally or external report provider replaces the native form', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')

    await test.step('Tally: the page embeds the Tally form', async () => {
      const tallyProject = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-report-tally'), {
        reportForm: { provider: 'tally', tallyUrl: 'https://tally.so/r/wMzXab' },
      })
      await open(page, reportPath(tallyProject.slug))
      await expect(page.locator('iframe[data-tally-src^="https://tally.so/embed/wMzXab"]')).toHaveCount(1)
      await expect(page.locator('form[action$="/report/submit"]')).toHaveCount(0)
    })

    await test.step('external: the page links out and has no form', async () => {
      const externalUrl = 'https://github.com/e2e-studio/game/issues/new'
      const externalProject = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-report-external'), {
        reportForm: { provider: 'external', externalUrl },
      })
      await open(page, reportPath(externalProject.slug))
      await expect(page.getByRole('link', { name: 'Open report form' })).toHaveAttribute('href', externalUrl)
      await expect(page.locator('form[action$="/report/submit"]')).toHaveCount(0)
    })
  })

  test('S5.2 a studio on Tally gets no native reports [F12]', async ({ api, uniqueSlug, world }) => {
    const tallyProject = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-report-tally-submit'), {
      reportForm: { provider: 'tally', tallyUrl: 'https://tally.so/r/wMzXab' },
    })
    const { status } = await submitForm(api('anonymous'), reportPath(tallyProject.slug), {
      title: 'Native report sent anyway',
      description: 'This studio collects reports in Tally.',
      category: 'OTHER',
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    })
    expect(status).toBe(400)
  })

  test('S5.3 publishing a report links its new issue in the same write [F5]', async ({ api }) => {
    const aOwner = api('aOwner')
    const report = await createReport(aOwner, project, { title: 'Torch goes out underwater' })

    const published = await test.step('the PATCH response carries the issue', async () => {
      const { status, body } = await aOwner.update('issue-reports', report.id, { status: 'PUBLISHED' })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(body.doc.issue).toBeTruthy()
      return body.doc
    })

    await test.step('an immediate read carries it too', async () => {
      const { body } = await aOwner.findByID('issue-reports', report.id)
      expect(body.issue).toBeTruthy()
    })

    await test.step('nothing writes the report again afterwards', async () => {
      await new Promise((resolve) => setTimeout(resolve, 1_000))
      const { body } = await aOwner.findByID('issue-reports', report.id)
      expect(body.updatedAt).toBe(published.updatedAt)
    })
  })

  test('S5.3 a published report becomes one public issue on the board', async ({ api, page }) => {
    const aOwner = api('aOwner')
    const report = await createReport(aOwner, project, {
      title: 'Compass points south',
      description: 'The compass needle always points south, even at the north shore.',
      category: 'AUDIO',
    })

    const issueID = await test.step('publishing creates the issue', async () => {
      const { status, body } = await aOwner.update('issue-reports', report.id, { status: 'PUBLISHED' })
      expect(status, JSON.stringify(body)).toBe(200)
      return extractID(body.doc.issue!)
    })

    await test.step('the issue is public, REPORTED, and keeps the category and summary', async () => {
      const { body } = await aOwner.findByID('issues', issueID)
      expect(body).toMatchObject({
        title: report.title,
        isPublic: true,
        status: 'REPORTED',
        category: 'AUDIO',
        summary: report.description,
      })
    })

    await test.step('the public board lists it', async () => {
      await open(page, `/g/${project.slug}/issues?view=board`)
      await expect(page.getByRole('link', { name: report.title })).toBeVisible()
    })

    await test.step('a later edit of the report creates no second issue', async () => {
      const { status } = await aOwner.update('issue-reports', report.id, { platform: 'Windows' })
      expect(status).toBe(200)
      const { body } = await aOwner.find('issues', {
        where: { gameProject: { equals: project.id }, title: { equals: report.title } },
      })
      expect(body.docs.map((issue) => issue.id)).toEqual([issueID])
    })

    await test.step('LINKED without an issue is rejected', async () => {
      const unlinked = await createReport(aOwner, project, { title: 'Birds freeze mid-air' })
      const { status } = await aOwner.update('issue-reports', unlinked.id, { status: 'LINKED' })
      expect(status).toBe(400)
    })
  })
})

test.describe('S5.4–S5.6 contact form', () => {
  const message = (label: string) => `Hello studio, this is the ${label} contact test message.`

  test('S5.4 a contact message reaches the Discord webhook, which stays private', async ({
    api,
    page,
    uniqueSlug,
    webhookSink,
    world,
  }) => {
    const hookPath = `/api/webhooks/${uniqueSlug('s54')}/token`
    const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-contact-discord'), {
      name: 'Harbor Lights',
      contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(hookPath) },
    })

    await test.step('a browser submit shows "Message sent"', async () => {
      await open(page, contactPath(project.slug))
      await page.getByLabel('Subject (optional)').fill('Loved the harbor level')
      await page.getByLabel('Message').fill(message('Discord'))
      await submitWithTurnstile(page, 'Send message')
      await expect(page).toHaveURL(/[?&]submitted=1/)
      await expect(page.getByText('Message sent.')).toBeVisible()
    })

    await test.step('the webhook got exactly one embed with the subject, message and game', async () => {
      const received = webhookSink.received(hookPath)
      expect(received).toHaveLength(1)
      const { embeds } = received[0].body as {
        embeds: { title: string; description: string; fields: { name: string; value: string }[] }[]
      }
      expect(embeds).toHaveLength(1)
      expect(embeds[0]).toMatchObject({ title: 'Loved the harbor level', description: message('Discord') })
      expect(embeds[0].fields).toContainEqual(expect.objectContaining({ name: 'Game', value: 'Harbor Lights' }))
    })

    await test.step('the webhook URL is in no public page or anonymous API response', async () => {
      const anonymous = api('anonymous')
      for (const path of [contactPath(project.slug), `/g/${project.slug}`]) {
        const { status, body } = await anonymous.raw<string>('GET', path)
        expect(status, path).toBe(200)
        expect(body, path).not.toContain(hookPath)
      }
      const byID = await anonymous.findByID('game-projects', project.id)
      const bySlug = await anonymous.find('game-projects', { where: { slug: { equals: project.slug } } })
      expect(byID.status).toBe(200)
      expect(bySlug.body.docs).toHaveLength(1)
      expect(JSON.stringify(byID.body)).not.toContain(hookPath)
      expect(JSON.stringify(bySlug.body)).not.toContain(hookPath)
    })
  })

  test('S5.4 contact delivery does not follow redirects and keeps the job [F21]', async ({
    api,
    uniqueSlug,
    webhookSink,
    world,
  }) => {
    const hook = uniqueSlug('s54-redirect')
    const from = `/api/webhooks/${hook}/from`
    const to = `/api/webhooks/${hook}/to`
    webhookSink.redirect(from, to)
    const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-contact-redirect'), {
      contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(from) },
    })

    const { status } = await submitForm(api('anonymous'), contactPath(project.slug), {
      message: message('redirect'),
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    })
    expect(status).toBe(200)
    expect(webhookSink.received(from)).toHaveLength(1)
    expect(webhookSink.received(to), 'the redirect target must receive nothing').toHaveLength(0)
    const jobs = await contactJobs(api('superAdmin'), 'discord-webhook', message('redirect'))
    expect(jobs).toHaveLength(1)
    expect(jobs[0].completedAt ?? null).toBeNull()
  })

  test('S5.5 the contact page follows the routing target', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')

    await test.step('EXTERNAL_URL: a link and no form', async () => {
      const externalUrl = 'https://support.e2e.test/contact'
      const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-external'), {
        contact: { target: 'EXTERNAL_URL', externalUrl },
      })
      await open(page, contactPath(project.slug))
      await expect(page.getByRole('link', { name: 'Open contact page' })).toHaveAttribute('href', externalUrl)
      await expect(page.locator('form[action$="/contact/submit"]')).toHaveCount(0)
    })

    await test.step('TALLY: the Tally embed', async () => {
      const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-tally'), {
        contact: { target: 'TALLY', tallyUrl: 'https://tally.so/r/nPq4Lk' },
      })
      await open(page, contactPath(project.slug))
      await expect(page.locator('iframe[data-tally-src^="https://tally.so/embed/nPq4Lk"]')).toHaveCount(1)
      await expect(page.locator('form[action$="/contact/submit"]')).toHaveCount(0)
    })

    await test.step('EMAIL without an address: "not configured", and a submit is rejected', async () => {
      const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-unset'), {
        contact: { target: 'EMAIL' },
      })
      await open(page, contactPath(project.slug))
      await expect(page.getByText('Contact route is not configured')).toBeVisible()
      const { status } = await submitForm(api('anonymous'), contactPath(project.slug), {
        message: message('unconfigured'),
        turnstileToken: TURNSTILE_DUMMY_TOKEN,
      })
      expect(status).toBe(400)
    })
  })

  test('S5.5 contact settings and submissions are validated', async ({ api, uniqueSlug, webhookSink, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-validate'), {
      contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(`/api/webhooks/${uniqueSlug('s55')}/t`) },
    })

    await test.step('a non-Tally URL is rejected for TALLY', async () => {
      const { status } = await setContact(aOwner, project, { target: 'TALLY', tallyUrl: 'https://evil-tally.so/r/x' })
      expect(status).toBe(400)
    })

    await test.step('a stale hidden webhook value does not block routing to EMAIL', async () => {
      const { status, body } = await setContact(aOwner, project, {
        target: 'EMAIL',
        email: 'studio@e2e.test',
        discordWebhookUrl: 'https://example.com/not-a-discord-hook',
      })
      expect(status, JSON.stringify(body)).toBe(200)
    })

    await test.step('a short message or a missing token is rejected', async () => {
      const anonymous = api('anonymous')
      const path = contactPath(project.slug)
      expect((await submitForm(anonymous, path, { message: 'hi', turnstileToken: TURNSTILE_DUMMY_TOKEN })).status).toBe(400)
      expect((await submitForm(anonymous, path, { message: message('no token') })).status).toBe(400)
    })
  })

  test('S5.5 only Discord webhook URLs are accepted [F21]', async ({ api, uniqueSlug, webhookSink, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-allowlist'))
    const sinkPort = Number(new URL(webhookSink.url('/')).port)
    const saveWebhook = (discordWebhookUrl: string) =>
      setContact(aOwner, project, { target: 'DISCORD_WEBHOOK', discordWebhookUrl })

    await test.step('Discord webhooks and the test sink save', async () => {
      for (const url of [
        'https://discord.com/api/webhooks/1/abc',
        'https://discordapp.com/api/webhooks/1/abc',
        'https://ptb.discord.com/api/webhooks/1/abc',
        'https://canary.discord.com/api/webhooks/1/abc',
        webhookSink.url('/api/webhooks/1/abc'),
      ]) {
        const { status, body } = await saveWebhook(url)
        expect(status, `${url}: ${JSON.stringify(body)}`).toBe(200)
      }
    })

    await test.step('anything else is rejected', async () => {
      for (const url of [
        'http://discord.com/api/webhooks/1/abc',
        'https://discord.com:8443/api/webhooks/1/abc',
        'https://u:p@discord.com/api/webhooks/1/abc',
        'https://discord.com/api/v10/users/@me',
        'https://discord.com.evil.test/api/webhooks/1/x',
        'https://evil.test/discord.com/api/webhooks/1/x',
        'http://169.254.169.254/latest/meta-data/',
        `http://127.0.0.1:${sinkPort + 1}/api/webhooks/1/x`,
      ]) {
        expect.soft((await saveWebhook(url)).status, url).toBe(400)
      }
    })
  })

  test('S5.6 an email contact that cannot be sent stays in Jobs [F13]', async ({ api, uniqueSlug, world }) => {
    const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-contact-email'), {
      contact: { target: 'EMAIL', email: 'studio@e2e.test' },
    })

    const { status } = await submitForm(api('anonymous'), contactPath(project.slug), {
      message: message('email'),
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    })
    expect(status).toBe(200)

    // The E2E server has no RESEND_API_KEY, so the job can't deliver.
    const jobs = await contactJobs(api('superAdmin'), 'email-contact-form', message('email'))
    expect(jobs, 'the undelivered job is kept').toHaveLength(1)
    expect(jobs[0].completedAt ?? null).toBeNull()
    expect(jobs[0].log ?? []).toContainEqual(expect.objectContaining({ state: 'failed' }))
  })
})
