import { describe, expect, it } from 'vitest'

import { normalizeSiteInput } from '@/site-templates/flagship-game-v1/normalize'
import { siteConfigV1Schema } from '@/site-templates/flagship-game-v1/schema/config'
import { contrastRatio } from '@/site-templates/flagship-game-v1/schema/contrast'
import { DEFAULT_THEME_COLORS } from '@/site-templates/flagship-game-v1/schema/theme'

const validColors = { ...DEFAULT_THEME_COLORS }

describe('siteConfigV1Schema', () => {
  it('parses an empty input into a complete valid default configuration', () => {
    const parsed = siteConfigV1Schema.parse({})
    expect(parsed.template).toBe('flagship-game-v1')
    expect(parsed.schemaVersion).toBe(1)
    expect(parsed.hero.variant).toBe('leftEditorial')
    expect(parsed.hero.heading).toBeNull()
    expect(parsed.theme.colors).toEqual(DEFAULT_THEME_COLORS)
    expect(parsed.nav.links.map((link) => link.ref)).toEqual(['updates', 'issues', 'contact'])
    expect(parsed.features.items).toEqual([])
    expect(parsed.knownIssues.variant).toBe('compact')
  })

  it('rejects unknown keys at the root and inside slots', () => {
    expect(siteConfigV1Schema.safeParse({ sneaky: true }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ hero: { junk: 1 } }).success).toBe(false)
    expect(
      siteConfigV1Schema.safeParse({ theme: { colors: { ...validColors, extra: '#000000' } } })
        .success,
    ).toBe(false)
  })

  it('rejects unsupported or null stored schema versions', () => {
    expect(siteConfigV1Schema.safeParse({ schemaVersion: 2 }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ schemaVersion: null }).success).toBe(false)

    const { input } = normalizeSiteInput({
      schemaVersion: 2,
      site: {},
      template: 'flagship-game-v1',
    })
    expect(siteConfigV1Schema.safeParse(input).success).toBe(false)
  })

  it('rejects section reordering — there is no order key to write', () => {
    expect(siteConfigV1Schema.safeParse({ order: ['finalCta', 'hero'] }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ sections: [] }).success).toBe(false)
  })

  it('accepts only approved variants', () => {
    expect(siteConfigV1Schema.safeParse({ hero: { variant: 'split' } }).success).toBe(true)
    expect(siteConfigV1Schema.safeParse({ hero: { variant: 'parallax' } }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ gallery: { variant: 'masonry' } }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ adaptive: { kind: 'lore' } }).success).toBe(false)
  })

  it('enforces length limits and item caps', () => {
    expect(siteConfigV1Schema.safeParse({ hero: { heading: 'x'.repeat(91) } }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ hero: { heading: 'x'.repeat(90) } }).success).toBe(true)
    const item = { body: 'Fight through storms.', media: null, title: 'Storms' }
    expect(
      siteConfigV1Schema.safeParse({ features: { items: Array(7).fill(item) } }).success,
    ).toBe(false)
    expect(
      siteConfigV1Schema.safeParse({ features: { items: Array(6).fill(item) } }).success,
    ).toBe(true)
  })

  it('accepts only registered action refs and never raw URLs', () => {
    expect(
      siteConfigV1Schema.safeParse({ hero: { primaryAction: { label: null, ref: 'steam' } } })
        .success,
    ).toBe(true)
    expect(
      siteConfigV1Schema.safeParse({
        hero: { primaryAction: { label: null, ref: 'https://evil.example' } },
      }).success,
    ).toBe(false)
    expect(
      siteConfigV1Schema.safeParse({
        hero: { primaryAction: { href: 'https://evil.example', label: null, ref: 'steam' } },
      }).success,
    ).toBe(false)
  })

  it('validates media references as positive integer ids', () => {
    expect(siteConfigV1Schema.safeParse({ trailer: { poster: 12 } }).success).toBe(true)
    expect(siteConfigV1Schema.safeParse({ trailer: { poster: null } }).success).toBe(true)
    expect(siteConfigV1Schema.safeParse({ trailer: { poster: -2 } }).success).toBe(false)
    expect(siteConfigV1Schema.safeParse({ trailer: { poster: 1.5 } }).success).toBe(false)
    expect(
      siteConfigV1Schema.safeParse({ trailer: { poster: 'https://cdn.example/x.png' } }).success,
    ).toBe(false)
  })

  it('rejects HTML, CSS blocks, and class attributes in text', () => {
    for (const evil of [
      '<script>alert(1)</script>',
      'Nice game <img src=x>',
      'body { color: red }',
      'class="p-4 text-red-500"',
      'style=color:red',
      'javascript:alert(1)',
    ]) {
      expect(siteConfigV1Schema.safeParse({ hero: { tagline: evil } }).success).toBe(false)
    }
    expect(
      siteConfigV1Schema.safeParse({ hero: { tagline: 'A cozy roguelike about weather.' } })
        .success,
    ).toBe(true)
  })

  it('normalizes empty/missing optional text to null and trims', () => {
    const parsed = siteConfigV1Schema.parse({
      hero: { eyebrow: '', heading: '  Stormbound  ' },
    })
    expect(parsed.hero.eyebrow).toBeNull()
    expect(parsed.hero.tagline).toBeNull()
    expect(parsed.hero.heading).toBe('Stormbound')
  })

  it('requires 6-digit hex colors', () => {
    expect(
      siteConfigV1Schema.safeParse({ theme: { colors: { ...validColors, accent: '#fff' } } })
        .success,
    ).toBe(false)
    expect(
      siteConfigV1Schema.safeParse({ theme: { colors: { ...validColors, accent: 'red' } } })
        .success,
    ).toBe(false)
  })

  it('enforces WCAG contrast on theme color pairs', () => {
    expect(siteConfigV1Schema.safeParse({ theme: { colors: validColors } }).success).toBe(true)
    const lowContrast = { ...validColors, foreground: '#2a2f3d' }
    expect(contrastRatio(lowContrast.foreground, lowContrast.background)).toBeLessThan(4.5)
    expect(siteConfigV1Schema.safeParse({ theme: { colors: lowContrast } }).success).toBe(false)
    const badAccentFg = { ...validColors, accentForeground: '#67e8f9' }
    expect(siteConfigV1Schema.safeParse({ theme: { colors: badAccentFg } }).success).toBe(false)
  })
})

describe('normalizeSiteInput', () => {
  it('converts populated upload relations to ids and collects the media map', () => {
    const media = { alt: 'Key art', id: 42, url: '/media/key-art.png' }
    const { input, media: map } = normalizeSiteInput({
      site: { hero: { backgroundMedia: media } },
      template: 'flagship-game-v1',
    })
    const parsed = siteConfigV1Schema.parse(input)
    expect(parsed.hero.backgroundMedia).toBe(42)
    expect(map.get(42)).toMatchObject({ id: 42 })
  })

  it('strips Payload array row ids and empty action groups', () => {
    const { input } = normalizeSiteInput({
      site: {
        community: { actions: [{ id: 'row-1', label: null, ref: 'discord' }] },
        hero: { primaryAction: { label: null, ref: null } },
        nav: { links: [{ id: 'row-2', label: 'News', ref: 'updates' }] },
      },
      template: 'flagship-game-v1',
    })
    const parsed = siteConfigV1Schema.parse(input)
    expect(parsed.nav.links).toEqual([{ label: 'News', ref: 'updates' }])
    expect(parsed.community.actions).toEqual([{ label: null, ref: 'discord' }])
    expect(parsed.hero.primaryAction).toBeNull()
  })

  it('treats a partially-filled color group as unset', () => {
    const { input } = normalizeSiteInput({
      site: { theme: { colors: { accent: '#22d3ee' } } },
      template: 'flagship-game-v1',
    })
    const parsed = siteConfigV1Schema.parse(input)
    expect(parsed.theme.colors).toEqual(DEFAULT_THEME_COLORS)
  })
})
