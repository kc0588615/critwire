import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { expect, test as setup } from '@playwright/test'

import type { GameProject } from '../../src/payload-types'
import { RestClient } from '../e2e/support/api'
import { PASSWORD } from '../e2e/support/env'
import {
  castVote,
  contentLayout,
  createIssue,
  createPatchNote,
  createProject,
  lexical,
  lexicalHeading,
  newRequestContext,
  seed,
} from '../e2e/support/fixtures'
import { type ShotsWorld, WORLD_PATH } from './catalog'
import { rootStyle, SHOTS_CRON_SECRET } from './support'

/**
 * Seeds the freshly migrated database with the Critter Connect demo plus
 * the fixtures every capture shares, over HTTP only, so any build (before
 * or after the design pass) gets identical data.
 */
setup('seed the Critter Connect demo and the screenshot fixtures', async ({ page, playwright }) => {
  setup.setTimeout(180_000)
  await mkdir(path.dirname(WORLD_PATH), { recursive: true })
  const anonymous = await newRequestContext(playwright)

  const superToken = await setup.step('register the first user and create one studio', async () => {
    const response = await anonymous.post('/api/users/first-register', {
      data: { email: 'shots@shots.test', name: 'Screenshot Admin', password: PASSWORD, roles: ['admin'] },
    })
    expect(response.status(), 'screenshot database is not fresh: first-register refused').toBe(200)
    const { token } = (await response.json()) as { token: string }
    await seed(new RestClient(anonymous, token), 'tenants', { name: 'Critwire Demo Studio', slug: 'demo-studio' })
    return token
  })
  const admin = new RestClient(anonymous, superToken)

  const cc = await setup.step('run the Critter Connect seed', async () => {
    const response = await anonymous.post('/api/seed/critter-connect', {
      headers: { Authorization: `Bearer ${SHOTS_CRON_SECRET}` },
    })
    expect(response.status(), await response.text()).toBe(200)
    const { status, body } = await admin.find('game-projects', { where: { slug: { equals: 'critter-connect' } }, depth: 0 })
    expect(status).toBe(200)
    expect(body.docs).toHaveLength(1)
    return body.docs[0] as GameProject
  })

  const baselineStyle = await setup.step('record the theme the seed gives the hub', async () => {
    await page.goto(`/g/${cc.slug}`)
    const style = await rootStyle(page)
    expect(style, 'the seeded hub has no .fs-root').toBeTruthy()
    return style as string
  })

  const { calloutIssue } = await setup.step('add a patch note, four issues and their votes', async () => {
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
    return { calloutIssue: needsInfo.slug }
  })

  const tenant = (await admin.find('tenants', { where: { slug: { equals: 'demo-studio' } } })).body.docs[0].id

  const bare = await setup.step('create a bare project: no page, no art', () =>
    createProject(admin, tenant, 'lantern-keeper', {
      name: 'Lantern Keeper',
      description: 'Keep the harbour light burning through a winter of storms, one night at a time.',
    }),
  )

  const marketingSlug = await setup.step('publish a marketing page', async () => {
    const slug = 'about-critwire'
    await seed(admin, 'pages', {
      title: 'About Critwire',
      slug,
      // Authored the way an editor would: the hero carries the page's h1,
      // and a call to action exercises the CMS link buttons.
      hero: { type: 'lowImpact', richText: lexicalHeading('About Critwire') },
      layout: [
        ...contentLayout(
          'Critwire gives an indie studio one hosted site for its game: patch notes, a public list of known issues players can vote on, a bug report form and a contact form.',
        ),
        {
          blockType: 'cta',
          richText: lexical('See it working on a real game before you set up your own.'),
          links: [
            { link: { type: 'custom', url: '/g/critter-connect', label: 'See a live portal', appearance: 'default' } },
            { link: { type: 'custom', url: '/admin', label: 'Sign in', appearance: 'outline' } },
          ],
        },
      ],
      _status: 'published',
    })
    return slug
  })

  const world: ShotsWorld = {
    superToken,
    cc: {
      slug: cc.slug,
      projectID: cc.id,
      baselineStyle,
      patchNote: 'v0-1-0-launch',
      calloutIssue,
      plainIssue: 'card-flicker-on-open',
    },
    bare: { slug: bare.slug },
    marketingSlug,
  }
  await writeFile(WORLD_PATH, JSON.stringify(world, null, 2))
  await anonymous.dispose()
})
