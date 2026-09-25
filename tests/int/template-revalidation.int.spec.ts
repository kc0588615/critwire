import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { GameProject, Issue, PatchNote } from '@/payload-types'

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }))

vi.mock('next/cache', () => ({ revalidatePath }))

import { revalidateIssueLanding } from '@/collections/Issues/hooks/revalidateIssueLanding'
import { revalidatePatchNotes } from '@/collections/PatchNotes/hooks/revalidatePatchNotes'

const project = (id: number, slug: string): GameProject =>
  ({ id, name: slug, slug }) as GameProject

const payload = {
  logger: { info: vi.fn() },
}

describe('flagship dynamic-slot revalidation', () => {
  beforeEach(() => {
    revalidatePath.mockClear()
    payload.logger.info.mockClear()
  })

  it('revalidates both landing pages when a public issue moves projects', async () => {
    const oldProject = project(1, 'old-game')
    const newProject = project(2, 'new-game')
    const previousDoc = {
      gameProject: oldProject,
      id: 10,
      isPublic: true,
      title: 'Public issue',
    } as Issue
    const doc = { ...previousDoc, gameProject: newProject } as Issue

    await revalidateIssueLanding({
      doc,
      previousDoc,
      req: { context: {}, payload },
    } as never)

    expect(revalidatePath).toHaveBeenCalledWith('/g/old-game')
    expect(revalidatePath).toHaveBeenCalledWith('/g/new-game')
  })

  it('still skips issue writes that only change kanban order', async () => {
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

  it('revalidates both patch-note trees when a published note moves projects', async () => {
    const oldProject = project(1, 'old-game')
    const newProject = project(2, 'new-game')
    const previousDoc = {
      _status: 'published',
      gameProject: oldProject,
      id: 20,
      title: 'Update',
    } as PatchNote
    const doc = { ...previousDoc, gameProject: newProject } as PatchNote

    await revalidatePatchNotes({
      doc,
      previousDoc,
      req: { context: {}, payload },
    } as never)

    expect(revalidatePath).toHaveBeenCalledWith('/g/old-game/patch-notes', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/g/old-game')
    expect(revalidatePath).toHaveBeenCalledWith('/g/new-game/patch-notes', 'layout')
    expect(revalidatePath).toHaveBeenCalledWith('/g/new-game')
  })
})
