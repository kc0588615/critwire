import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { GameProject } from '@/payload-types'

import { resolveSiteAction } from '@/site-templates/flagship-game-v1/actions'
import { deriveAccentColors, deriveFlagshipDefault } from '@/site-templates/flagship-game-v1/defaults'
import { TrailerLite } from '@/site-templates/flagship-game-v1/render/TrailerLite'
import { flagshipSlots, SLOT_ORDER } from '@/site-templates/flagship-game-v1/registry'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'
import { contrastRatio } from '@/site-templates/flagship-game-v1/schema/contrast'
import { DEFAULT_THEME_COLORS } from '@/site-templates/flagship-game-v1/schema/theme'

const project = (overrides: Partial<GameProject> = {}): GameProject =>
  ({
    id: 1,
    name: 'Stormbound Tactics',
    slug: 'stormbound',
    ...overrides,
  }) as GameProject

describe('template order invariant', () => {
  it('renders the fixed section order — configuration cannot reorder it', () => {
    expect([...SLOT_ORDER]).toEqual([
      'hero',
      'availability',
      'features',
      'trailer',
      'gallery',
      'adaptive',
      'latestUpdate',
      'knownIssues',
      'community',
      'finalCta',
    ])
  })

  it('the registry covers every slot with matching ids and versioned schemas', () => {
    expect(Object.keys(flagshipSlots).sort()).toEqual([...SLOT_ORDER].sort())
    for (const slotId of SLOT_ORDER) {
      const slot = flagshipSlots[slotId]
      expect(slot.id).toBe(slotId)
      expect(slot.version).toBeGreaterThanOrEqual(1)
      expect(slot.aiDescription.length).toBeGreaterThan(20)
      expect(typeof slot.render).toBe('function')
      expect(slot.schema.safeParse({}).success).toBe(true)
    }
  })
})

describe('deriveFlagshipDefault', () => {
  it('produces a valid configuration from a minimal project', () => {
    const config = deriveFlagshipDefault(project())
    expect(() => siteConfigV1Schema.parse(config)).not.toThrow()
    expect(config.hero.variant).toBe('centeredCinematic')
    expect(config.hero.primaryAction).toBeNull()
    expect(config.hero.secondaryAction).toEqual({ label: null, ref: 'issues' })
    expect(config.nav.links.map((link) => link.ref)).toEqual([
      'updates',
      'issues',
      'report',
      'contact',
    ])
    expect(config.trailer.enabled).toBe(false)
  })

  it('uses project facts: banner, accent, steam link, discord, trailer', () => {
    const config = deriveFlagshipDefault(
      project({
        accentColor: '#f59e0b',
        banner: { id: 7, url: '/media/banner.png' } as GameProject['banner'],
        links: {
          discord: 'https://discord.gg/storm',
          steam: 'https://store.steampowered.com/app/1',
          trailer: 'https://youtu.be/abc123',
        },
      }),
    )
    expect(() => siteConfigV1Schema.parse(config)).not.toThrow()
    expect(config.hero.variant).toBe('leftEditorial')
    expect(config.hero.backgroundMedia).toBe(7)
    expect(config.hero.primaryAction).toEqual({ label: null, ref: 'primary-store' })
    expect(config.theme.colors.accent).toBe('#f59e0b')
    expect(config.trailer.enabled).toBe(true)
    expect(config.community.actions[0]).toEqual({ label: null, ref: 'discord' })
  })

  it('never throws on hostile project text', () => {
    const config = deriveFlagshipDefault(
      project({ description: '<script>x</script> {evil}', name: '<Evil> {Game}' }),
    )
    expect(() => siteConfigV1Schema.parse(config)).not.toThrow()
  })

  it('guarantees accessible accent colors for any input accent', () => {
    for (const accent of ['#f59e0b', '#ffffff', '#777777', '#123456', '#abc', 'nonsense', null]) {
      const { accent: resolved, accentForeground } = deriveAccentColors(accent)
      expect(contrastRatio(resolved, DEFAULT_THEME_COLORS.background)).toBeGreaterThanOrEqual(3)
      expect(contrastRatio(accentForeground, resolved)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe('action registry cross-plan contract', () => {
  it('contact/report/issues/updates always resolve to internal routes regardless of provider config', () => {
    const withProviders = project({
      contact: { externalUrl: 'https://example.com/contact', target: 'EXTERNAL_URL' },
      reportForm: { provider: 'external', externalUrl: 'https://example.com/bugs' },
    } as Partial<GameProject>)
    for (const [ref, path] of [
      ['contact', '/g/stormbound/contact'],
      ['report', '/g/stormbound/report'],
      ['issues', '/g/stormbound/issues'],
      ['updates', '/g/stormbound/patch-notes'],
    ] as const) {
      const resolved = resolveSiteAction({ label: null, ref }, withProviders)
      expect(resolved).toMatchObject({ external: false, href: path })
    }
  })

  it('external refs resolve only from approved project fact URLs', () => {
    const bare = project()
    expect(resolveSiteAction({ label: null, ref: 'steam' }, bare)).toBeNull()
    expect(resolveSiteAction({ label: null, ref: 'demo' }, bare)).toBeNull()
    const rich = project({
      availability: {
        platforms: [
          { platform: 'switch', storeUrl: 'https://nintendo.example/storm' },
          { platform: 'windows', storeUrl: 'https://store.steampowered.com/app/1' },
        ],
      } as GameProject['availability'],
    })
    expect(resolveSiteAction({ label: null, ref: 'primary-store' }, rich)?.href).toBe(
      'https://nintendo.example/storm',
    )
  })
})

describe('trailer facade', () => {
  it('renders no third-party iframe before interaction', () => {
    const html = renderToStaticMarkup(
      React.createElement(TrailerLite, {
        embedUrl: 'https://www.youtube-nocookie.com/embed/abc123',
        title: 'Stormbound trailer',
      }),
    )
    expect(html).not.toContain('<iframe')
    expect(html).not.toContain('youtube')
    expect(html).toContain('<button')
    expect(html).toContain('Play video: Stormbound trailer')
  })
})
