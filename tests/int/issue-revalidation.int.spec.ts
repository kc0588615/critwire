import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GameProject, Issue } from '@/payload-types'

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }))

vi.mock('next/cache', () => ({ revalidatePath }))

import { revalidateIssueLanding } from '@/collections/Issues/hooks/revalidateIssueLanding'

const project = (id: number, slug: string): GameProject =>
  ({ id, name: slug, slug }) as GameProject

const payload = {
  logger: { info: vi.fn() },
}

// E2E can't see a revalidation that didn't happen, so this one case lives here.
describe('issue hub revalidation', () => {
  beforeEach(() => {
    revalidatePath.mockClear()
    payload.logger.info.mockClear()
  })

  it('skips issue writes that only change kanban order', async () => {
    const gameProject = project(1, 'ordered-game')
    const previousDoc = {
      _order: 'a0',
      gameProject,
      id: 10,
      isPublic: true,
      title: 'Public issue',
    } as Issue
    const doc = { ...previousDoc, _order: 'a1' } as Issue

    await revalidateIssueLanding({
      doc,
      previousDoc,
      req: { context: {}, payload },
    } as never)

    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
