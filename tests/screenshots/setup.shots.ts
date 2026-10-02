import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type APIRequestContext, expect, test as setup } from '@playwright/test'
import { extractID } from 'payload/shared'

import type { GameProject } from '../../src/payload-types'
import { RestClient } from '../e2e/support/api'
import { verificationToken } from '../e2e/support/email'
import { PASSWORD } from '../e2e/support/env'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  lexical,
  newRequestContext,
  onboard,
  startSignup,
  verifyAccount,
} from '../e2e/support/fixtures'
import { ONBOARDING_STATE_PATH, type ShotsWorld, STUDIO_STATE_PATH, WORLD_PATH } from './catalog'
import { rootStyle, SHOTS_CRON_SECRET } from './support'
import { RISO_THEME } from './themes'

/** Visits from tagged kit links, counted for Lantern Keep's Share tab. */
const REFERRALS = { steam: 6, itch: 3, readme: 2, carrd: 1 } as const

/**
 * Seeds the freshly migrated database with the Critter Connect demo plus
 * the fixtures every capture shares, over HTTP only, so any build (before
 * or after the design pass) gets identical data. The signup shots get a
 * pending signup, a signed-in user with no studio, and a signed-up studio.
 * The reach shots get that studio's session and referral counts, and a
 * Riso-themed game in the demo studio for its badge.
 */
setup('seed the Critter Connect demo and the screenshot fixtures', async ({ page, playwright }) => {
  setup.setTimeout(180_000)
  await mkdir(path.dirname(WORLD_PATH), { recursive: true })
  const anonymous = await newRequestContext(playwright)

  // The seed creates the demo's own studio.
  const superToken = await setup.step('register the first user', async () => {
    const response = await anonymous.post('/api/users/first-register', {
      data: { email: 'shots@shots.test', name: 'Screenshot Admin', password: PASSWORD, roles: ['admin'] },
    })
    expect(response.status(), 'screenshot database is not fresh: first-register refused').toBe(200)
    const { token } = (await response.json()) as { token: string }
    return token
  })
  const admin = new RestClient(anonymous, superToken)

  const cc = await setup.step('run the Critter Connect seed and add the official site', async () => {
    const response = await anonymous.post('/api/seed/critter-connect', {
      headers: { Authorization: `Bearer ${SHOTS_CRON_SECRET}` },
    })
    expect(response.status(), await response.text()).toBe(200)
    const { status, body } = await admin.find('game-projects', { where: { slug: { equals: 'critter-connect' } }, depth: 0 })
    expect(status).toBe(200)
    expect(body.docs).toHaveLength(1)
    const project = body.docs[0] as GameProject
    const demo = await admin.find('tenants', { where: { slug: { equals: 'critwire-demo' } }, depth: 0 })
    expect(demo.body.docs, 'the seed made the critwire-demo studio').toHaveLength(1)
    const demoTenant = demo.body.docs[0].id as number
    expect(project.tenant && extractID(project.tenant), 'the seed put critter-connect in critwire-demo').toBe(demoTenant)
    // The seed has no website, so without this the Official site link never shows.
    const updated = await admin.update('game-projects', project.id, {
      links: { ...project.links, website: 'https://critterconnect.example' },
    })
    expect(updated.status, JSON.stringify(updated.body)).toBe(200)
    return { ...project, demoTenant }
  })

  const baselineStyle = await setup.step('record the theme the seed gives the hub', async () => {
    await page.goto(`/g/${cc.slug}`)
    const style = await rootStyle(page)
    expect(style, 'the seeded hub has no .fs-root').toBeTruthy()
    return style as string
  })

  await setup.step('add a patch note, four issues and their votes', async () => {
    const note = await createPatchNote(admin, cc, 'v0-1-1', {
      title: 'Clue trail and Steam Deck fixes',
      versionLabel: 'v0.1.1',
      summary: 'Clue trails survive fast travel again, and the Steam Deck map is sharper.',
      content: lexical(
        'Fast travel no longer clears the active clue trail. The marsh camp fast travel point is back on the map. Discovery cards load their portraits sooner on Steam Deck.',
      ),
      publishedAt: new Date().toISOString(),
    })
    const pinned = await createIssue(admin, cc, 'clue-trail-fast-travel', {
      title: 'Clue trail disappears after fast travel',
      summary: 'Fast-traveling between camps can clear the active clue trail from the map.',
      details: lexical('Reopening the discovery card brings the trail back. We are tracing where fast travel resets it.'),
      category: 'GAMEPLAY',
      status: 'INVESTIGATING',
      isPinned: true,
    })
    const needsInfo = await createIssue(admin, cc, 'binder-sync-steam-deck', {
      title: 'Field binder doesn’t sync between Steam Deck and desktop',
      summary: 'Some discoveries made on Steam Deck are missing from the binder on desktop.',
      category: 'INFORMATION',
      status: 'NEEDS_MORE_INFO',
      needsMoreInfoText:
        'Which save slot were you on, and did the Deck show a cloud sync warning before you closed the game?',
    })
    const workaround = await createIssue(admin, cc, 'blank-species-portrait', {
      title: 'Species portrait stays blank after a long session',
      summary: 'After a few hours of play, new discovery cards can open without their portrait.',
      category: 'VISUAL',
      status: 'WORKAROUND_AVAILABLE',
      workaroundText: 'Close and reopen the field binder to reload the portraits.',
    })
    const fixed = await createIssue(admin, cc, 'marsh-camp-fast-travel', {
      title: 'Marsh camp fast travel point missing from the map',
      summary: 'The marsh camp didn’t appear as a fast travel destination after unlocking it.',
      category: 'QUESTS',
      status: 'FIXED',
      fixedInPatchNote: note.id,
    })
    const votes: [number, number][] = [
      [pinned.id, 7],
      [needsInfo.id, 4],
      [workaround.id, 2],
      [fixed.id, 1],
    ]
    for (const [issueID, count] of votes) {
      for (let i = 0; i < count; i++) await castVote(playwright, issueID)
    }
  })

  const signup = await setup.step('sign up a pending user, a user with no studio, and a studio', async () => {
    await startSignup(anonymous, 'pending@shots.test')
    const verifyToken = await verificationToken('pending@shots.test')

    const onboardingUser = await newRequestContext(playwright)
    await signUpAndVerify(onboardingUser, 'onboarding@shots.test')
    await onboardingUser.storageState({ path: ONBOARDING_STATE_PATH })
    await onboardingUser.dispose()

    const studio = await newRequestContext(playwright)
    const token = await signUpAndVerify(studio, 'studio@shots.test')
    const location = await onboard(studio, token, { name: 'Lantern Keep', website: 'https://lanternkeep.example' })
    await studio.storageState({ path: STUDIO_STATE_PATH })
    await studio.dispose()
    const welcomeSlug = /^\/g\/([^/?]+)\?welcome=1$/.exec(location)?.[1]
    expect(welcomeSlug, `Lantern Keep onboarded to ${location}`).toBeDefined()
    return { verifyToken, welcomeSlug: welcomeSlug as string }
  })

  const reach = await setup.step('add a Riso game for its badge, and count Lantern Keep’s referrals', async () => {
    const riso = await createProject(admin, cc.demoTenant, 'riso-rally', { name: 'Riso Rally', theme: RISO_THEME })
    const statuses = ['REPORTED', 'INVESTIGATING', 'PLANNED', 'PLANNED', 'IN_PROGRESS', 'FIXED'] as const
    for (const [i, status] of statuses.entries()) {
      await createIssue(admin, riso, `riso-item-${i + 1}`, { status })
    }
    await createPatchNote(admin, riso, 'v2-3', { versionLabel: 'v2.3', publishedAt: new Date().toISOString() })

    const welcome = await admin.find('game-projects', { where: { slug: { equals: signup.welcomeSlug } }, depth: 0 })
    expect(welcome.body.docs, 'Lantern Keep exists').toHaveLength(1)
    const welcomeID = (welcome.body.docs[0] as GameProject).id
    for (const [ref, count] of Object.entries(REFERRALS)) {
      for (let i = 0; i < count; i++) {
        const response = await anonymous.post('/api/referrals', { data: { game: welcomeID, ref } })
        expect(response.status(), `referral ${ref}: ${await response.text()}`).toBe(204)
      }
    }
    return { welcomeID, risoSlug: riso.slug }
  })

  const world: ShotsWorld = {
    superToken,
    cc: {
      slug: cc.slug,
      projectID: cc.id,
      baselineStyle,
      launchUpdate: 'v0-1-0-launch',
    },
    signup,
    reach,
  }
  await writeFile(WORLD_PATH, JSON.stringify(world, null, 2))
  await anonymous.dispose()
})

/**
 * Signs `email` up through the emailed link with the shared password and
 * returns the session token `request` now holds.
 */
async function signUpAndVerify(request: APIRequestContext, email: string): Promise<string> {
  await startSignup(request, email)
  expect(await verifyAccount(request, await verificationToken(email), PASSWORD)).toBe('/onboarding')
  const { cookies } = await request.storageState()
  const token = cookies.find((cookie) => cookie.name === 'payload-token')?.value
  expect(token, `${email} is signed in after verifying`).toBeTruthy()
  return token as string
}
