import type OpenAI from 'openai'
import { describe, expect, it, vi } from 'vitest'

import type { GamePage, GameProject, User } from '@/payload-types'
import type { Payload } from 'payload'

import { deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'
import { SiteGeneratorError } from '@/site-generator/errors'
import { OpenAISiteGenerator } from '@/site-generator/openai'
import { applyGenerationScope } from '@/site-generator/scope'
import {
  generateAndSaveSiteDraft,
  SiteGenerationServiceError,
} from '@/site-generator/service'
import type { SiteGenerationContext, SiteGenerator } from '@/site-generator/types'
import { generateSiteRequestSchema } from '@/site-generator/types'

const project = (overrides: Partial<GameProject> = {}): GameProject =>
  ({
    createdAt: '2026-07-12T00:00:00.000Z',
    id: 2,
    name: 'Stormbound',
    slug: 'stormbound',
    tenant: 1,
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...overrides,
  }) as GameProject

const current = siteConfigV1Schema.parse({})

const context = (overrides: Partial<SiteGenerationContext> = {}): SiteGenerationContext => ({
  allowedActionRefs: ['updates', 'issues', 'report', 'contact'],
  currentConfig: current,
  media: [],
  project: {
    accentColor: null,
    availability: {
      currentVersion: null,
      platforms: [],
      releaseDate: null,
      releaseState: null,
    },
    description: 'A stormy tactics game.',
    linksAvailable: [],
    meta: { developer: null, engine: null, publisher: null, rating: null },
    name: 'Stormbound',
    slug: 'stormbound',
  },
  publicOperations: {
    issues: { active: 0, pinned: 0, total: 0 },
    latestPatchNote: null,
  },
  slots: [],
  ...overrides,
})

describe('site generation request and scope policy', () => {
  it('requires a slot only for slot-scoped generation', () => {
    expect(
      generateSiteRequestSchema.safeParse({ gamePageId: 1, prompt: 'Restyle it', scope: 'slot' })
        .success,
    ).toBe(false)
    expect(
      generateSiteRequestSchema.safeParse({
        gamePageId: 1,
        prompt: 'Restyle it',
        scope: 'slot',
        slot: 'hero',
      }).success,
    ).toBe(true)
  })

  it('enforces theme-only and slot-only changes after model output', () => {
    const candidate = siteConfigV1Schema.parse({
      hero: { heading: 'Changed by model' },
      theme: { typography: 'technical' },
    })
    const themeOnly = applyGenerationScope({ candidate, current, scope: 'theme' })
    expect(themeOnly.theme.typography).toBe('technical')
    expect(themeOnly.hero).toEqual(current.hero)

    const heroOnly = applyGenerationScope({ candidate, current, scope: 'slot', slot: 'hero' })
    expect(heroOnly.hero.heading).toBe('Changed by model')
    expect(heroOnly.theme).toEqual(current.theme)
  })
})

describe('OpenAISiteGenerator', () => {
  it('uses structured Responses output without storage and derives its summary', async () => {
    const candidate = siteConfigV1Schema.parse({ hero: { heading: 'Face the storm' } })
    const parse = vi.fn().mockResolvedValue({ output: [], output_parsed: candidate })
    const generator = new OpenAISiteGenerator({
      client: { responses: { parse } } as unknown as OpenAI,
      model: 'test-model',
    })

    const result = await generator.generate({
      context: context(),
      gamePageId: 1,
      prompt: 'Make the hero more direct',
      scope: 'full',
    })

    expect(parse).toHaveBeenCalledWith(expect.objectContaining({ model: 'test-model', store: false }))
    expect(result.config.hero.heading).toBe('Face the storm')
    expect(result.changeSummary).toContain('Updated hero.')
  })

  it('turns refusals and unknown media ids into explicit non-success results', async () => {
    const refusalGenerator = new OpenAISiteGenerator({
      client: {
        responses: {
          parse: vi.fn().mockResolvedValue({
            output: [{ content: [{ refusal: 'Cannot comply.', type: 'refusal' }], type: 'message' }],
            output_parsed: null,
          }),
        },
      } as unknown as OpenAI,
      model: 'test-model',
    })
    await expect(
      refusalGenerator.generate({
        context: context(),
        gamePageId: 1,
        prompt: 'Do something',
        scope: 'full',
      }),
    ).rejects.toMatchObject({ code: 'refusal' } satisfies Partial<SiteGeneratorError>)

    const badMedia = siteConfigV1Schema.parse({
      gallery: { items: [{ alt: 'Unknown', media: 999 }] },
    })
    const mediaGenerator = new OpenAISiteGenerator({
      client: {
        responses: { parse: vi.fn().mockResolvedValue({ output: [], output_parsed: badMedia }) },
      } as unknown as OpenAI,
      model: 'test-model',
    })
    await expect(
      mediaGenerator.generate({
        context: context(),
        gamePageId: 1,
        prompt: 'Add images',
        scope: 'full',
      }),
    ).rejects.toMatchObject({ code: 'media-reference' } satisfies Partial<SiteGeneratorError>)
  })
})

const page = (): GamePage =>
  ({
    _status: 'published',
    createdAt: '2026-07-12T00:00:00.000Z',
    gameProject: 2,
    id: 1,
    kind: 'landing',
    tenant: 1,
    title: 'Landing',
    updatedAt: '2026-07-12T00:00:00.000Z',
  }) as GamePage

const user = { id: 7, tenants: [{ roles: ['member'], tenant: 1 }] } as User

const payloadMock = () => {
  const sourcePage = page()
  const sourceProject = project({
    contact: { discordWebhookUrl: 'https://secret.invalid', email: 'private@example.com' },
    reportForm: { tallyUrl: 'https://tally.so/r/secret' },
  })
  const update = vi.fn().mockImplementation(async ({ data }) => ({ ...sourcePage, ...data }))
  const payload = {
    count: vi.fn().mockResolvedValue({ totalDocs: 0 }),
    find: vi.fn().mockImplementation(async ({ collection }) => ({
      docs:
        collection === 'media' || collection === 'patch-notes'
          ? []
          : [],
    })),
    findByID: vi.fn().mockImplementation(async ({ collection }) =>
      collection === 'game-pages' ? sourcePage : sourceProject,
    ),
    update,
  } as unknown as Payload
  return { payload, update }
}

describe('generateAndSaveSiteDraft', () => {
  it('sends a redacted context and performs exactly one draft-only mutation after success', async () => {
    const { payload, update } = payloadMock()
    let sentContext: SiteGenerationContext | undefined
    const generated = deriveFlagshipDefault(project())
    const generator: SiteGenerator = {
      generate: vi.fn().mockImplementation(async (input) => {
        sentContext = input.context
        return { changeSummary: ['Updated hero.'], config: generated, model: 'mock-model' }
      }),
    }

    await generateAndSaveSiteDraft({
      generator,
      payload,
      rateLimit: async () => ({ success: true }),
      request: { gamePageId: 1, prompt: 'Make it cinematic', scope: 'full' },
      user,
    })

    const serialized = JSON.stringify(sentContext)
    expect(serialized).not.toContain('private@example.com')
    expect(serialized).not.toContain('secret.invalid')
    expect(serialized).not.toContain('tally.so')
    expect(update).toHaveBeenCalledTimes(1)
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        draft: true,
        overrideAccess: false,
        user,
        data: expect.objectContaining({ _status: 'draft', template: 'flagship-game-v1' }),
      }),
    )
  })

  it('does not write when generation fails or the tenant is rate-limited', async () => {
    const failed = payloadMock()
    const failingGenerator: SiteGenerator = {
      generate: vi.fn().mockRejectedValue(new SiteGeneratorError('No output', 'invalid-output')),
    }
    await expect(
      generateAndSaveSiteDraft({
        generator: failingGenerator,
        payload: failed.payload,
        rateLimit: async () => ({ success: true }),
        request: { gamePageId: 1, prompt: 'Make it cinematic', scope: 'full' },
        user,
      }),
    ).rejects.toBeInstanceOf(SiteGeneratorError)
    expect(failed.update).not.toHaveBeenCalled()

    const limited = payloadMock()
    const untouchedGenerator: SiteGenerator = { generate: vi.fn() }
    await expect(
      generateAndSaveSiteDraft({
        generator: untouchedGenerator,
        payload: limited.payload,
        rateLimit: async () => ({ success: false }),
        request: { gamePageId: 1, prompt: 'Make it cinematic', scope: 'full' },
        user,
      }),
    ).rejects.toMatchObject({ code: 'rate-limited' } satisfies Partial<SiteGenerationServiceError>)
    expect(untouchedGenerator.generate).not.toHaveBeenCalled()
    expect(limited.update).not.toHaveBeenCalled()
  })
})
