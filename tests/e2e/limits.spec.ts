import { randomUUID } from 'node:crypto'

import sharp from 'sharp'

import type { GameProject } from '../../src/payload-types'
import type { ApiResult, RestClient } from './support/api'
import { SECOND_BASE_URL, SECOND_LIMITS, TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  asStudioAdmin,
  createIssue,
  createProject,
  expect,
  type Studio,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * The hosted plan's limits. The second server runs with the low limits in
 * `SECOND_LIMITS`; the first has none, as a self-hosted instance. Both
 * serve the same build and database, so the limits are read at runtime.
 */

const MEBIBYTE = 1024 * 1024

const MESSAGES = {
  games: `Your studio has reached its limit of ${SECOND_LIMITS.games} games on the hosted plan.`,
  media: `This upload would take your studio past its ${SECOND_LIMITS.mediaMB} MB of media.`,
  publicFeedback:
    `This game has reached ${SECOND_LIMITS.publicFeedback} public feedback items. ` +
    'Make older items private or delete them to add more.',
}

/** Noise doesn't compress, so this PNG is about 1.4 MiB: past the second server's 1 MB. */
async function largePNG(): Promise<Buffer> {
  const buffer = await sharp({
    create: { width: 900, height: 600, channels: 3, background: '#000000', noise: { type: 'gaussian', mean: 128, sigma: 40 } },
  })
    .png()
    .toBuffer()
  expect(buffer.length).toBeGreaterThan(SECOND_LIMITS.mediaMB * MEBIBYTE)
  return buffer
}

const expectLimit = ({ status, body }: ApiResult<unknown>, message: string): void => {
  expect(status, JSON.stringify(body)).toBe(403)
  expect(body.errors?.[0]?.message).toBe(message)
}

/** `count` games in the studio; the first has review off, so clean submissions publish at once. */
async function addGames(client: RestClient, studio: Studio, count: number): Promise<GameProject[]> {
  const games: GameProject[] = []
  for (let i = 1; i <= count; i++) {
    games.push(
      await createProject(client, studio.tenant.id, `${studio.tenant.slug}-game-${i}`, {
        reportForm: { provider: 'native', reviewSubmissions: false },
      }),
    )
  }
  return games
}

const addPublicItems = async (client: RestClient, game: GameProject, count: number): Promise<void> => {
  for (let i = 1; i <= count; i++) await createIssue(client, game, `item-${i}`)
}

const uploadLarge = async (client: RestClient, studio: Studio) =>
  client.upload(
    'media',
    { name: `limits-${randomUUID()}.png`, mimeType: 'image/png', buffer: await largePNG() },
    { alt: 'Key art', tenant: studio.tenant.id },
  )

/** A player's clean idea, posted to the game's public form. */
const submitIdea = (client: RestClient, game: GameProject) =>
  client.raw<{ id: number; ok: boolean; published: boolean }>('POST', `/g/${game.slug}/feedback/new/submit`, {
    data: {
      type: 'IDEA',
      category: 'GAMEPLAY',
      title: 'Let the raft carry two players',
      description: 'Two players could cross the lake together on the raft.',
      turnstileToken: TURNSTILE_DUMMY_TOKEN,
    },
  })

test('S12.1 with limits on, each blocks a studio user with its message', async ({
  api,
  browser,
  secondApi,
  seedStudio,
}) => {
  const studio = await seedStudio('s121')
  const owner = secondApi(studio.owner)
  const superAdmin = api('superAdmin')
  let games: GameProject[] = []

  await test.step(`games: ${SECOND_LIMITS.games} fit, the next gets the message`, async () => {
    games = await addGames(owner, studio, SECOND_LIMITS.games)
    expectLimit(
      await owner.create('game-projects', { name: 'One too many', slug: `${studio.tenant.slug}-extra`, tenant: studio.tenant.id }),
      MESSAGES.games,
    )
  })

  await test.step('saving one more game in the admin shows the message as a toast', async () => {
    await asStudioAdmin(
      browser,
      studio,
      async (page) => {
        await page.goto('/admin/collections/game-projects/create')
        await page.locator('#field-name').fill('One too many')
        await page.getByRole('button', { name: 'Save', exact: true }).click()
        await expect(page.locator('[data-sonner-toast][data-type="error"]')).toContainText(MESSAGES.games)
      },
      SECOND_BASE_URL,
    )
    const { body } = await superAdmin.find('game-projects', { where: { tenant: { equals: studio.tenant.id } } })
    expect(body.totalDocs).toBe(SECOND_LIMITS.games)
  })

  await test.step(`media: a small image fits, an upload past ${SECOND_LIMITS.mediaMB} MB gets the message`, async () => {
    await uploadImage(owner, studio.tenant.id, `s121-${randomUUID()}.png`)
    expectLimit(await uploadLarge(owner, studio), MESSAGES.media)
    const { body } = await superAdmin.find('media', { where: { tenant: { equals: studio.tenant.id } } })
    expect(body.totalDocs, 'only the small image is stored').toBe(1)
  })

  await test.step(`public feedback: ${SECOND_LIMITS.publicFeedback} items fit, the next gets the message`, async () => {
    await addPublicItems(owner, games[0], SECOND_LIMITS.publicFeedback)
    expectLimit(
      await owner.create('issues', {
        gameProject: games[0].id,
        tenant: studio.tenant.id,
        title: 'One too many',
        slug: 'one-too-many',
        category: 'OTHER',
      }),
      MESSAGES.publicFeedback,
    )
  })

  await test.step('making a private item public gets the message', async () => {
    const hidden = await createIssue(owner, games[0], 'hidden', { isPublic: false })
    expectLimit(await owner.update('issues', hidden.id, { isPublic: true }), MESSAGES.publicFeedback)
    const { body } = await superAdmin.findByID('issues', hidden.id)
    expect(body.isPublic).toBe(false)
  })

  await test.step("a player's submission at the limit is confirmed and waits for review", async () => {
    const { status, body } = await submitIdea(secondApi('anonymous'), games[0])
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body).toMatchObject({ ok: true, published: false })
    const report = await superAdmin.findByID('issue-reports', body.id)
    expect(report.body.status).toBe('NEW')
  })

  await test.step('a super admin can still add a game past the limit', async () => {
    await createProject(secondApi('superAdmin'), studio.tenant.id, `${studio.tenant.slug}-by-admin`)
  })
})

test('S12.2 with limits unset, the same actions all succeed', async ({ api, seedStudio }) => {
  const studio = await seedStudio('s122')
  const owner = studio.owner.client
  let games: GameProject[] = []

  await test.step(`${SECOND_LIMITS.games + 1} games`, async () => {
    games = await addGames(owner, studio, SECOND_LIMITS.games + 1)
  })

  await test.step(`an upload past ${SECOND_LIMITS.mediaMB} MB`, async () => {
    const result = await uploadLarge(owner, studio)
    expect(result.status, JSON.stringify(result.body)).toBe(201)
  })

  await test.step(`${SECOND_LIMITS.publicFeedback + 1} public items, and a private one made public`, async () => {
    await addPublicItems(owner, games[0], SECOND_LIMITS.publicFeedback + 1)
    const hidden = await createIssue(owner, games[0], 'hidden', { isPublic: false })
    const result = await owner.update('issues', hidden.id, { isPublic: true })
    expect(result.status, JSON.stringify(result.body)).toBe(200)
  })

  await test.step("a player's clean submission publishes at once", async () => {
    const { status, body } = await submitIdea(api('anonymous'), games[0])
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body).toMatchObject({ ok: true, published: true })
  })
})
