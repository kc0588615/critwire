import type { ApiResult } from './support/api'
import {
  PNG_8PX,
  createIssue,
  createPatchNote,
  createProject,
  expect,
  lexical,
  test,
} from './support/fixtures'

/**
 * A super admin can suspend a studio. Its members can't publish or save
 * anything while it's suspended, and can again once it's lifted.
 */

const SUSPENDED = 'This studio is suspended, so changes can’t be saved.'

function expectSuspended(result: ApiResult<unknown>): void {
  expect(result.status, JSON.stringify(result.body)).toBe(403)
  expect(result.body.errors?.map((error) => error.message)).toEqual([SUSPENDED])
}

test('S10.1 a suspended studio can’t publish', async ({ api, seedStudio }) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s101')
  const client = owner.client

  const project = await createProject(client, tenant.id, `${tenant.slug}-game`)
  const published = await createPatchNote(client, project, 'published')
  const draft = await createPatchNote(client, project, 'draft', { _status: 'draft' })
  const issue = await createIssue(client, project, 'item')

  const suspend = async (suspended: boolean) => {
    const { status, body } = await superAdmin.update('tenants', tenant.id, { suspended })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body.doc.suspended).toBe(suspended)
  }
  await suspend(true)

  await test.step('every create is refused', async () => {
    expectSuspended(await client.create('game-projects', { name: 'New game', slug: `${tenant.slug}-new`, tenant: tenant.id }))
    const note = { gameProject: project.id, tenant: tenant.id, title: 'New update', content: lexical('New.') }
    expectSuspended(await client.create('patch-notes', { ...note, slug: 'new-published', _status: 'published' }))
    expectSuspended(await client.create('patch-notes', { ...note, slug: 'new-draft', _status: 'draft' }, { draft: true }))
    expectSuspended(
      await client.create('issues', {
        gameProject: project.id,
        tenant: tenant.id,
        title: 'New item',
        slug: 'new-item',
        category: 'OTHER',
      }),
    )
    expectSuspended(
      await client.upload('media', { name: 's101.png', mimeType: 'image/png', buffer: PNG_8PX }, { alt: 'Key art', tenant: tenant.id }),
    )
  })

  await test.step('every update is refused', async () => {
    expectSuspended(await client.update('game-projects', project.id, { description: 'Edited while suspended' }))
    expectSuspended(await client.update('patch-notes', draft.id, { _status: 'published' }))
    expectSuspended(await client.update('patch-notes', draft.id, { title: 'Draft edit' }, { draft: true }))
    expectSuspended(await client.update('patch-notes', published.id, { title: 'Published edit' }))
  })

  await test.step('nothing changed', async () => {
    const game = await superAdmin.findByID('game-projects', project.id, { depth: 0 })
    expect(game.body.description ?? null).toBeNull()
    const note = await superAdmin.findByID('patch-notes', draft.id, { draft: true, depth: 0 })
    expect(note.body._status).toBe('draft')
    expect(note.body.title).toBe(draft.title)
  })

  await test.step('deleting an item still works', async () => {
    const { status, body } = await client.remove('issues', issue.id)
    expect(status, JSON.stringify(body)).toBe(200)
  })

  await test.step('after the suspension is lifted, a create works again', async () => {
    await suspend(false)
    await createIssue(client, project, 'after-lift')
  })
})
