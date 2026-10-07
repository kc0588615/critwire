import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { type APIRequestContext, expect, test as setup } from '@playwright/test'
import { extractID } from 'payload/shared'

import type { GameProject, Issue } from '../../src/payload-types'
import { RestClient } from '../e2e/support/api'
import { linkDiscord } from '../e2e/support/discord'
import { acceptLegal } from '../e2e/support/legal'
import { linkTo, readEmail, tokenOf, verificationToken } from '../e2e/support/email'
import { PASSWORD } from '../e2e/support/env'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  lexical,
  newRequestContext,
  onboard,
  seed,
  startSignup,
  tenantOf,
  verifyAccount,
} from '../e2e/support/fixtures'
import {
  ACCEPT_STATE_PATH,
  KANBAN_READY_TITLE,
  ONBOARDING_STATE_PATH,
  type ShotsWorld,
  STUDIO_STATE_PATH,
  WORLD_PATH,
} from './catalog'
import { rootStyle, SHOTS_CRON_SECRET } from './support'
import { RISO_THEME } from './themes'

/** Where the linked game posts: fixed IDs, so the "Open the posts channel" link is the same every run. */
const DISCORD_TARGET = { guild: '120000000000000001', channel: '120000000000000002' } as const

/** Lantern Keep's issues for the kanban, one per column it fills. */
const KANBAN_ISSUES: [string, Partial<Issue>][] = [
  ['lantern-dark-on-load', { title: KANBAN_READY_TITLE, status: 'REPORTED', category: 'GAMEPLAY' }],
  ['tide-timer-144hz', { title: 'Tide timer runs fast at 144 Hz', status: 'INVESTIGATING', category: 'PERFORMANCE' }],
  [
    'rumble-after-cutscene',
    {
      title: 'Controller rumble stays on after a cutscene',
      status: 'NEEDS_MORE_INFO',
      category: 'GAMEPLAY',
      needsMoreInfoText: 'Which controller were you using, and which cutscene was it?',
    },
  ],
  ['rebind-lantern-key', { title: 'Let players rebind the lantern key', status: 'PLANNED', category: 'USER_INTERFACE' }],
  ['journal-text-4k', { title: 'Keeper’s journal text is tiny at 4K', status: 'IN_PROGRESS', category: 'VISUAL' }],
  ['fog-through-stairs', { title: 'Fog clips through the lighthouse stairs', status: 'FIXED', category: 'VISUAL' }],
]

/** Visits from tagged kit links, counted for Lantern Keep's Share tab. */
const REFERRALS = { steam: 6, itch: 3, readme: 2, carrd: 1 } as const

/**
 * Seeds the freshly migrated database with the Critter Connect demo plus
 * the fixtures every capture shares, over HTTP only, so any build (before
 * or after the design pass) gets identical data. The signup shots get a
 * pending signup, a signed-in user with no studio, and a signed-up studio.
 * The reach shots get that studio's session and referral counts, and a
 * Riso-themed game in the demo studio for its badge. The discord shots
 * get a second Lantern Keep game, linked to a server through the real
 * install and callback with the Discord stand-in's code. The legal shots
 * get a signed-in account a super admin made, which hasn't accepted.
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
    const verifyEmail = await readEmail('pending@shots.test')
    const verifyToken = tokenOf(linkTo(verifyEmail, '/verify/'))

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
    return { verifyToken, verifyEmailHtml: verifyEmail.html, welcomeSlug: welcomeSlug as string, studioToken: token }
  })

  const reach = await setup.step('add a Riso game for its badge, and count Lantern Keep’s referrals', async () => {
    const riso = await createProject(admin, cc.demoTenant, 'riso-rally', { name: 'Riso Rally', theme: RISO_THEME })
    const statuses = ['REPORTED', 'INVESTIGATING', 'PLANNED', 'PLANNED', 'IN_PROGRESS', 'FIXED'] as const
    for (const [i, status] of statuses.entries()) {
      await createIssue(admin, riso, `riso-item-${i + 1}`, { status })
    }
    // Armenian and Georgian have glyphs only in the badge's DejaVu fallback (D36).
    await createPatchNote(admin, riso, 'v2-3', {
      versionLabel: 'v2.3 · Երկու · ორი',
      publishedAt: new Date().toISOString(),
    })

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

  const discord = await setup.step('add Lantern Keep’s issues, and a second game linked to Discord', async () => {
    const lantern = await admin.findByID('game-projects', reach.welcomeID, { depth: 0 })
    expect(lantern.status).toBe(200)
    for (const [slug, data] of KANBAN_ISSUES) await createIssue(admin, lantern.body, slug, data)
    const second = await createProject(admin, tenantOf(lantern.body), 'lantern-keep-tides', {
      name: 'Lantern Keep: Tides',
    })
    const callback = await linkDiscord(anonymous, signup.studioToken, second.id, DISCORD_TARGET)
    expect(callback.status(), await callback.text()).toBe(303)
    expect(callback.headers().location, 'the callback reports the link').toContain('discord=linked')
    return { unlinkedID: reach.welcomeID, linkedID: second.id }
  })

  await setup.step('make an account as the super admin, sign it in, and leave the documents unaccepted', async () => {
    await seed(admin, 'users', { email: 'accept@shots.test', password: PASSWORD, roles: ['user'] })
    const user = await newRequestContext(playwright)
    const login = await user.post('/api/users/login', { data: { email: 'accept@shots.test', password: PASSWORD } })
    expect(login.status(), 'sign in as accept@shots.test').toBe(200)
    const accept = await user.get('/legal/accept', { maxRedirects: 0 })
    expect(accept.status(), 'a signed-in account that hasn’t accepted sees /legal/accept').toBe(200)
    await user.storageState({ path: ACCEPT_STATE_PATH })
    await user.dispose()
  })

  const world: ShotsWorld = {
    superToken,
    cc: {
      slug: cc.slug,
      projectID: cc.id,
      baselineStyle,
      launchUpdate: 'v0-1-0-launch',
    },
    signup: { verifyToken: signup.verifyToken, verifyEmailHtml: signup.verifyEmailHtml, welcomeSlug: signup.welcomeSlug },
    reach,
    discord,
  }
  await writeFile(WORLD_PATH, JSON.stringify(world, null, 2))
  await anonymous.dispose()
})

/**
 * Signs `email` up through the emailed link with the shared password,
 * accepts the legal documents as that account, and returns the session
 * token `request` now holds.
 */
async function signUpAndVerify(request: APIRequestContext, email: string): Promise<string> {
  await startSignup(request, email)
  expect(await verifyAccount(request, await verificationToken(email), PASSWORD)).toBe('/onboarding')
  const { cookies } = await request.storageState()
  const token = cookies.find((cookie) => cookie.name === 'payload-token')?.value
  expect(token, `${email} is signed in after verifying`).toBeTruthy()
  expect(await acceptLegal(request, token as string, { next: '/onboarding' })).toBe('/onboarding')
  return token as string
}
