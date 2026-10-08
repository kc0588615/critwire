import { randomUUID } from 'node:crypto'

import type { Page } from '@playwright/test'
import { extractID } from 'payload/shared'

import type { GameProject, PayloadJob } from '../../src/payload-types'
import { fieldErrors, type RestClient } from './support/api'
import { ageJob, countInDatabase } from './support/db'
import { storageStatePath, TURNSTILE_DUMMY_TOKEN } from './support/env'
import { createIssue, createProject, createReport, expect, submitWithTurnstile, test } from './support/fixtures'
import { runDueJobs } from './support/jobs'
import { expectPlayerFormNotices, SENSITIVE_INFO_WARNING } from './support/legal'

/**
 * Player reports and the contact form: the public forms behind Turnstile,
 * report promotion into a public issue, and contact delivery to Discord
 * (a local sink) or email.
 */

const reportPath = (slug: string) => `/g/${slug}/feedback/new`
const issuePath = (game: string, slug: string) => `/g/${game}/feedback/${slug}`
const contactPath = (slug: string) => `/g/${slug}/contact`

/** The email field the feedback form used to have, which a cached page or a script may still send. */
const STALE_EMAIL_FIELD = 'submitterEmail'

/** Loads `path` and fails unless the server answers 200. */
async function open(page: Page, path: string): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(200)
}

/** Answers the form's "Bug or idea?" and waits for that form. */
async function chooseType(page: Page, name: 'Bug' | 'Idea'): Promise<void> {
  const option = page.getByRole('group', { name: 'Bug or idea?' }).getByRole('link', { name: new RegExp(`^${name}`) })
  await option.click()
  await expect(page).toHaveURL(new RegExp(`[?&]type=${name.toLowerCase()}`))
  await expect(option).toHaveAttribute('aria-current', 'true')
}

/** Posts a public form as JSON, the way a script or the API would. */
const submitForm = (client: RestClient, path: string, data: Record<string, unknown>) =>
  client.raw<{ error?: string; id?: number; ok?: boolean; published?: boolean }>('POST', `${path}/submit`, { data })

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

    await test.step('the player picks "Bug" first', async () => {
      await chooseType(page, 'Bug')
    })

    await test.step('the Turnstile widget issues a token and the submit lands', async () => {
      await page.getByLabel('Title').fill(title)
      await page.getByLabel('What happened').fill('Paddling into the pier clips the raft straight through it.')
      await page.getByLabel('Category').selectOption('GAMEPLAY')
      await page.getByLabel('Platform (optional)').fill('Steam Deck')
      await page.getByLabel('Game version (optional)').fill('1.4.2')
      await submitWithTurnstile(page, 'Send report')
      await expect(page).toHaveURL(/[?&]submitted=1/)
      await expect(page.getByText('Report sent.')).toBeVisible()
    })

    await test.step("the studio owner sees it as NEW with the player's details", async () => {
      const { body } = await api('aOwner').find('issue-reports', { where: { title: { equals: title } } })
      expect(body.docs).toHaveLength(1)
      expect(body.docs[0]).toMatchObject({
        status: 'NEW',
        category: 'GAMEPLAY',
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
      await expect(page.locator('form[action$="/feedback/new/submit"]')).toHaveCount(0)
    })

    await test.step('external: the page links out and has no form', async () => {
      const externalUrl = 'https://github.com/e2e-studio/game/issues/new'
      const externalProject = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-report-external'), {
        reportForm: { provider: 'external', externalUrl },
      })
      await open(page, reportPath(externalProject.slug))
      await expect(page.getByRole('link', { name: 'Open report form' })).toHaveAttribute('href', externalUrl)
      await expect(page.locator('form[action$="/feedback/new/submit"]')).toHaveCount(0)
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

  test('S5.12 the feedback form asks for no email, and the route stores none sent anyway', async ({ api, page }) => {
    for (const name of ['Bug', 'Idea'] as const) {
      await test.step(`the ${name.toLowerCase()} form has no email field`, async () => {
        await open(page, reportPath(project.slug))
        await chooseType(page, name)
        const form = page.locator('form[action$="/feedback/new/submit"]')
        await expect(form.getByLabel('Title')).toBeVisible()
        await expect(form.locator('input[type="email"]')).toHaveCount(0)
        await expect(form.getByLabel(/email/i)).toHaveCount(0)
        // The only words about email are the warning not to write one.
        await expect(form.getByText(/email/i)).toHaveText([SENSITIVE_INFO_WARNING])
      })
    }

    const id = randomUUID()
    const address = `player-${id}@e2e.test`
    const title = `Report with a stale email ${id.slice(0, 8)}`

    await test.step('a post that still sends the old email field files the report', async () => {
      const { status, body } = await submitForm(api('anonymous'), reportPath(project.slug), {
        title,
        description: 'Sent from a page cached before the email field went away.',
        category: 'OTHER',
        [STALE_EMAIL_FIELD]: address,
        turnstileToken: TURNSTILE_DUMMY_TOKEN,
      })
      expect(status, JSON.stringify(body)).toBe(200)
      const { body: found } = await api('aOwner').find('issue-reports', { where: { title: { equals: title } } })
      expect(found.docs).toHaveLength(1)
      expect(found.docs[0]).not.toHaveProperty(STALE_EMAIL_FIELD)
    })

    await test.step('the address is nowhere in the database', async () => {
      expect(await countInDatabase(address)).toBe(0)
    })
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
      await open(page, `/g/${project.slug}/feedback?view=board`)
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

    await test.step('the webhook got exactly one embed with the subject, message and game, and no mentions', async () => {
      const received = webhookSink.received(hookPath)
      expect(received).toHaveLength(1)
      const { allowed_mentions, embeds } = received[0].body as {
        allowed_mentions: { parse: string[] }
        embeds: { title: string; description: string; fields: { name: string; value: string }[] }[]
      }
      expect(allowed_mentions, 'player text must never ping anyone').toEqual({ parse: [] })
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
      await expect(page.getByText('set up a contact form yet')).toBeVisible()
      const { status } = await submitForm(api('anonymous'), contactPath(project.slug), {
        message: message('unconfigured'),
        turnstileToken: TURNSTILE_DUMMY_TOKEN,
      })
      expect(status).toBe(400)
    })
  })

  test('S5.5 contact settings and submissions are validated', async ({ api, page, uniqueSlug, webhookSink, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-contact-validate'), {
      contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(`/api/webhooks/${uniqueSlug('s55')}/t`) },
    })

    await test.step('a non-Tally URL is rejected for TALLY', async () => {
      const { status } = await setContact(aOwner, project, { target: 'TALLY', tallyUrl: 'https://evil-tally.so/r/x' })
      expect(status).toBe(400)
    })

    await test.step('Tally embed URLs, www links and bare form ids embed the form', async () => {
      for (const [tallyUrl, formID] of [
        ['https://tally.so/embed/abc123?alignLeft=1&transparentBackground=1', 'abc123'],
        ['https://www.tally.so/r/wMzXab', 'wMzXab'],
        ['kLm9Qz', 'kLm9Qz'],
      ]) {
        const { status, body } = await setContact(aOwner, project, { target: 'TALLY', tallyUrl })
        expect(status, JSON.stringify(body)).toBe(200)
        await open(page, contactPath(project.slug))
        await expect(page.locator(`iframe[data-tally-src^="https://tally.so/embed/${formID}?"]`)).toHaveCount(1)
      }
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

test('S5.15 the feedback and contact forms warn against sensitive details and show the Terms notice', async ({
  api,
  page,
  uniqueSlug,
  webhookSink,
  world,
}) => {
  const name = 'Lantern Keepers'
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-notices'), {
    name,
    contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(`/api/webhooks/${uniqueSlug('s515')}/token`) },
  })
  const feedbackForm = page.locator('form[action$="/feedback/new/submit"]')

  await test.step('the bug form', async () => {
    await open(page, reportPath(project.slug))
    await chooseType(page, 'Bug')
    await expectPlayerFormNotices(feedbackForm, {
      submit: 'Send report',
      textFields: ['Title', 'What happened?', 'Platform (optional)', 'Game version (optional)'],
    })
    await test.info().attach('s515-bug-form', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })

  await test.step('the idea form', async () => {
    await chooseType(page, 'Idea')
    await expectPlayerFormNotices(feedbackForm, { submit: 'Send idea', textFields: ['Title', 'What’s your idea?'] })
  })

  await test.step('the contact form, and its email label and hint', async () => {
    await open(page, contactPath(project.slug))
    const form = page.locator('form[action$="/contact/submit"]')
    await expectPlayerFormNotices(form, {
      submit: 'Send message',
      textFields: ['Nickname (optional)', 'Subject (optional)', 'Message'],
    })
    const email = form.getByLabel(`Email (optional, 13 or older), so the ${name} team can reply`, { exact: true })
    await expect(email).toHaveAttribute('type', 'email')
    await expect(email).toHaveAccessibleDescription('Sent to the team with your message; this site doesn’t keep it once it’s delivered.')
    await test.info().attach('s515-contact-form', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })
  })
})

test.describe('S5.13–S5.14 contact messages aren’t kept', () => {
  // The sweep also runs on the servers' own autorun, at any moment, so these
  // tests hold whether it ran before `runDueJobs` or only then.

  test('S5.13 a delivered contact message leaves nothing in the database', async ({
    api,
    uniqueSlug,
    webhookSink,
    world,
  }) => {
    const id = randomUUID()
    const email = `player-${id}@e2e.test`
    const hookPath = `/api/webhooks/${uniqueSlug('s513')}/${id}`
    const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-contact-kept'), {
      contact: { target: 'DISCORD_WEBHOOK', discordWebhookUrl: webhookSink.url(hookPath) },
    })

    const { status } = await submitForm(api('anonymous'), contactPath(project.slug), {
      email,
      message: `A message that mustn’t outlive its delivery, ${id}.`,
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    })
    expect(status).toBe(200)
    expect(webhookSink.received(hookPath), 'the message was delivered').toHaveLength(1)
    expect(JSON.stringify(webhookSink.received(hookPath)[0].body)).toContain(email)

    await expect
      .poll(() => contactJobs(api('superAdmin'), 'discord-webhook', `A message that mustn’t outlive its delivery, ${id}.`))
      .toHaveLength(0)
    expect(await countInDatabase(email), 'the address is nowhere in the database').toBe(0)
  })

  test('S5.14 the sweep deletes delivered and month-old contact jobs, and nothing else', async ({ api }) => {
    const superAdmin = api('superAdmin')
    const id = randomUUID()
    const marker = (label: string) => `s514-${label}-${id}`
    const input = (label: string) => ({
      email: `${marker(label)}@e2e.test`,
      gameSlug: 'gone',
      message: marker(label),
      projectID: '0',
    })
    const failed = { error: { message: 'E2E: delivery failed' }, hasError: true, totalTried: 3 }
    const create = async (data: Partial<PayloadJob>): Promise<PayloadJob> => {
      const { status, body } = await superAdmin.create('payload-jobs', data)
      expect(status, JSON.stringify(body)).toBe(201)
      return body.doc
    }

    const now = new Date().toISOString()
    // A: delivered, but Payload's own delete failed, so the job and its log keep the input.
    const delivered = await create({
      completedAt: now,
      input: input('a'),
      log: [
        {
          completedAt: now,
          executedAt: now,
          input: input('a'),
          output: { sent: true },
          state: 'succeeded',
          taskID: '1',
          taskSlug: 'discord-webhook',
        },
      ],
      taskSlug: 'discord-webhook',
    })
    // B: undelivered and recent, still kept for a retry.
    const recent = await create({ ...failed, input: input('b'), taskSlug: 'email-contact-form' })
    // C: undelivered for 31 days.
    const stale = await create({ ...failed, input: input('c'), taskSlug: 'discord-webhook' })
    await ageJob(stale.id, 31)
    // D: a control, not a contact job, as old as C.
    const otherTask = await create({
      ...failed,
      input: { marker: marker('d'), patchNoteID: 0 },
      queue: 'discord',
      taskSlug: 'discord-update-post',
    })
    await ageJob(otherTask.id, 31)
    expect(delivered.log, 'A’s log row holds its input too').toHaveLength(1)

    await runDueJobs(superAdmin, { queue: 'default', where: { taskSlug: { equals: 'purge-contact-jobs' } } })

    for (const [label, job] of [
      ['a', delivered],
      ['c', stale],
    ] as const) {
      expect(await countInDatabase(marker(label)), `${label} is gone, its log included`).toBe(0)
      expect((await superAdmin.findByID('payload-jobs', job.id)).status).toBe(404)
    }
    for (const [label, job] of [
      ['b', recent],
      ['d', otherTask],
    ] as const) {
      expect(await countInDatabase(marker(label)), `${label} stays`).toBe(1)
      expect((await superAdmin.findByID('payload-jobs', job.id)).status).toBe(200)
    }
  })
})

test.describe('S5.7 reserved feedback slugs', () => {
  let project: GameProject

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('rc-reserved'))
  })

  const reservedSlugError = expect.objectContaining({
    message: '`new` is reserved; choose another slug',
    path: 'slug',
  })

  test('S5.7 a submission titled "New" never takes the form\'s URL [F3]', async ({ api, page }) => {
    const aOwner = api('aOwner')

    await test.step('a published report titled "New" gets the slug new-2', async () => {
      const report = await createReport(aOwner, project, { title: 'New' })
      const { status, body } = await aOwner.update('issue-reports', report.id, { status: 'PUBLISHED' }, { depth: 1 })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(body.doc.issue).toMatchObject({ slug: 'new-2', title: 'New' })
    })

    await test.step('its public page answers 200 with its title', async () => {
      const response = await page.goto(issuePath(project.slug, 'new-2'))
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('New')
    })

    await test.step('a studio issue titled "New" with no slug is refused on its slug', async () => {
      const { status, body } = await aOwner.create('issues', {
        category: 'OTHER',
        gameProject: project.id,
        tenant: extractID(project.tenant!),
        title: 'New',
      })
      expect(status, JSON.stringify(body)).toBe(400)
      expect(fieldErrors(body.errors)).toContainEqual(reservedSlugError)
    })

    await test.step('changing an existing slug to "new" is refused the same way', async () => {
      const issue = await createIssue(aOwner, project, 'lamp-flickers')
      const { status, body } = await aOwner.update('issues', issue.id, { slug: 'new' })
      expect(status, JSON.stringify(body)).toBe(400)
      expect(fieldErrors(body.errors)).toContainEqual(reservedSlugError)
    })
  })
})

test.describe('S5.8 bugs and ideas', () => {
  test('S5.8 a bug and an idea from the browser reach the board and the list with their types', async ({
    api,
    page,
    uniqueSlug,
    world,
  }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-bug-idea'))
    const bug = 'Anchor chain clips through the dock'
    const idea = 'Let the lighthouse keeper name the boat'

    await test.step('before a choice the page asks "Bug or idea?" and shows no form', async () => {
      await open(page, reportPath(project.slug))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Send feedback')
      await expect(page.locator('form[action$="/feedback/new/submit"]')).toHaveCount(0)
    })

    await test.step('a bug with its platform and version', async () => {
      await chooseType(page, 'Bug')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Report a bug')
      await page.getByLabel('Title').fill(bug)
      await page.getByLabel('What happened').fill('Dropping anchor at the dock pulls the chain through the planks.')
      await page.getByLabel('Platform (optional)').fill('Windows')
      await page.getByLabel('Game version (optional)').fill('1.5.0')
      await submitWithTurnstile(page, 'Send report')
      await expect(page).toHaveURL(/[?&]submitted=1/)
      await expect(page.getByText('Report sent. The team reviews submissions before they’re public.')).toBeVisible()
    })

    await test.step('an idea, whose form has no platform or version', async () => {
      await chooseType(page, 'Idea')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Suggest an idea')
      await expect(page.getByLabel('Platform (optional)')).toHaveCount(0)
      await expect(page.getByLabel('Game version (optional)')).toHaveCount(0)
      await page.getByLabel('Title').fill(idea)
      await page.getByLabel('What’s your idea?').fill('A name plate on the boat, set by the keeper once per save.')
      await submitWithTurnstile(page, 'Send idea')
      await expect(page).toHaveURL(/[?&]submitted=1/)
      await expect(page.getByText('Idea sent.')).toBeVisible()
    })

    await test.step('the studio sees each with its type and publishes both', async () => {
      for (const [title, expected] of [
        [bug, { type: 'BUG', platform: 'Windows', gameVersion: '1.5.0' }],
        [idea, { type: 'IDEA', platform: null, gameVersion: null }],
      ] as const) {
        const { body } = await aOwner.find('issue-reports', { where: { title: { equals: title } } })
        expect(body.docs).toHaveLength(1)
        expect(body.docs[0]).toMatchObject({ status: 'NEW', ...expected })
        const { status } = await aOwner.update('issue-reports', body.docs[0].id, { status: 'PUBLISHED' })
        expect(status).toBe(200)
      }
    })

    for (const [view, item] of [
      ['board', '.fs-board-card'],
      ['list', '.fs-issue-item'],
    ] as const) {
      await test.step(`the ${view} lists both, tagged Bug and Idea`, async () => {
        await open(page, `/g/${project.slug}/feedback${view === 'board' ? '?view=board' : ''}`)
        for (const [title, tag] of [
          [bug, 'Bug'],
          [idea, 'Idea'],
        ] as const) {
          await expect(page.locator(item).filter({ hasText: title }).locator('.fs-tag').first()).toHaveText(tag)
        }
      })
    }
  })
})

test.describe('S5.9–S5.11 moderation and feedback settings', () => {
  const clean = {
    category: 'GAMEPLAY',
    description: 'Let players pin a quest so its marker stays on the compass.',
    turnstileToken: TURNSTILE_DUMMY_TOKEN,
  }

  /** The studio's view of the one report titled `title`. */
  async function reportTitled(client: RestClient, title: string) {
    const { body } = await client.find('issue-reports', { where: { title: { equals: title } } })
    expect(body.docs).toHaveLength(1)
    return body.docs[0]
  }

  /** The titles on the game's public board. */
  async function boardTitles(page: Page, slug: string): Promise<string[]> {
    await open(page, `/g/${slug}/feedback?view=board`)
    return page.locator('.fs-board-card').getByRole('link').allTextContents()
  }

  test('S5.9 with review on, a clean submission waits for the studio', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-review-on'))
    const title = 'Pin a quest to the compass'

    await test.step('the endpoint answers published: false', async () => {
      const { status, body } = await submitForm(api('anonymous'), reportPath(project.slug), {
        ...clean,
        title,
        type: 'IDEA',
        platform: 'Windows',
        gameVersion: '1.0.0',
      })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(body).toMatchObject({ ok: true, published: false })
    })

    await test.step('the idea is NEW, not flagged, and has no platform or version', async () => {
      expect(await reportTitled(aOwner, title)).toMatchObject({
        type: 'IDEA',
        status: 'NEW',
        flagged: false,
        issue: null,
        platform: null,
        gameVersion: null,
      })
    })

    await test.step('the board does not list it', async () => {
      expect(await boardTitles(page, project.slug)).not.toContain(title)
    })
  })

  test('S5.10 turning ideas off refuses ideas', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-no-ideas'), {
      reportForm: { provider: 'native', acceptIdeas: false },
    })
    const suggestIdea = () => page.getByRole('link', { name: 'Suggest an idea' })

    await test.step('the feedback page offers no "Suggest an idea"', async () => {
      await open(page, `/g/${project.slug}/feedback`)
      await expect(page.getByRole('link', { name: 'Report a bug' })).toBeVisible()
      await expect(suggestIdea()).toHaveCount(0)
    })

    await test.step('neither does the hub', async () => {
      await expect(async () => {
        await open(page, `/g/${project.slug}`)
        await expect(page.getByRole('link', { name: 'Report a bug' })).toBeVisible({ timeout: 1_000 })
        await expect(suggestIdea()).toHaveCount(0, { timeout: 1_000 })
      }).toPass({ timeout: 20_000 })
    })

    await test.step('the form offers no type choice and shows the bug form, even when asked for an idea', async () => {
      for (const path of [reportPath(project.slug), `${reportPath(project.slug)}?type=idea`]) {
        await open(page, path)
        await expect(page.getByRole('group', { name: 'Bug or idea?' })).toHaveCount(0)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Report a bug')
        await expect(page.getByLabel('What happened')).toBeVisible()
        await expect(page.getByLabel('Platform (optional)')).toBeVisible()
        await expect(page.locator('input[name="type"]')).toHaveValue('BUG')
      }
    })

    await test.step('an idea answers 400 and stores nothing', async () => {
      const title = 'Add a photo mode'
      const { status } = await submitForm(api('anonymous'), reportPath(project.slug), { ...clean, title, type: 'IDEA' })
      expect(status).toBe(400)
      const { body } = await aOwner.find('issue-reports', { where: { title: { equals: title } } })
      expect(body.docs).toHaveLength(0)
    })

    await test.step('a bug still answers 200', async () => {
      const { status, body } = await submitForm(api('anonymous'), reportPath(project.slug), {
        ...clean,
        title: 'Photo button does nothing',
        description: 'Pressing P in the harbor does nothing at all.',
        type: 'BUG',
      })
      expect(status, JSON.stringify(body)).toBe(200)
    })
  })

  test('S5.11 with review off, clean text publishes at once and flagged text waits', async ({
    api,
    browser,
    page,
    uniqueSlug,
    world,
  }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rc-review-off'), {
      reportForm: { provider: 'native', reviewSubmissions: false },
    })
    const cleanTitle = 'Let the raft carry two players'
    const flagged = [
      {
        title: 'This fucking door will not open',
        description: 'The cellar door in the harbor never opens, whatever I press.',
        reason: /^Offensive word: ".+"$/,
      },
      {
        title: 'Clips of the lighthouse glitch',
        description: 'See https://youtu.be/a and https://youtu.be/b and https://youtu.be/c for the glitch.',
        reason: /^3 links$/,
      },
    ]

    await test.step('a clean idea answers published: true', async () => {
      const { status, body } = await submitForm(api('anonymous'), reportPath(project.slug), {
        ...clean,
        title: cleanTitle,
        type: 'IDEA',
      })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(body).toMatchObject({ ok: true, published: true })
      expect(await reportTitled(aOwner, cleanTitle)).toMatchObject({ status: 'PUBLISHED', flagged: false })
    })

    await test.step('each flagged submission answers published: false and stays NEW', async () => {
      for (const { description, title } of flagged) {
        const { status, body } = await submitForm(api('anonymous'), reportPath(project.slug), {
          ...clean,
          title,
          description,
        })
        expect(status, JSON.stringify(body)).toBe(200)
        expect(body).toMatchObject({ ok: true, published: false })
        expect(await reportTitled(aOwner, title)).toMatchObject({ status: 'NEW', flagged: true, issue: null })
      }
    })

    await test.step('the board lists the clean idea, tagged Idea, and neither flagged one', async () => {
      expect(await boardTitles(page, project.slug)).toEqual([cleanTitle])
      await expect(page.locator('.fs-board-card')).toContainText('Idea')
    })

    await test.step("the studio owner's admin shows each flag and its reason", async () => {
      const context = await browser.newContext({ storageState: storageStatePath('aOwner') })
      const adminPage = await context.newPage()
      for (const { reason, title } of flagged) {
        const report = await reportTitled(aOwner, title)
        await adminPage.goto(`/admin/collections/issue-reports/${report.id}`)
        await expect(adminPage.locator('#field-title')).toHaveValue(title)
        await expect(adminPage.locator('#field-flagged')).toBeChecked()
        await expect(adminPage.locator('#field-flagReasons')).toHaveValue(reason)
      }
      await context.close()
    })
  })
})
