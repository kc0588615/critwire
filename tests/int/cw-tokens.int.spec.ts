// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { CW, NEUTRAL_STEPS } from '@/lib/theme/cw'
import { cwTokensCSS } from '@/lib/theme/tokensCss'

// cw's values live once, in `src/lib/theme/cw.ts`. `src/styles/cw-tokens.css`
// is generated from it and committed, the roles in `src/styles/cw.css` build
// on it, and both style entry points load the two. E2E can't see the source
// drifting from the snapshot (`gui/themes/cw.md`) or from the generated
// file, so this test does. `prebuild` runs it beside `embed-loader`. One test
// per failure mode T1–T7 in the cw-theme mission plan.

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

const SNAPSHOT = read('gui/themes/cw.md')

/** The snapshot's text between two headings. */
const section = (from: string, to: string) => {
  const start = SNAPSHOT.indexOf(from)
  const end = SNAPSHOT.indexOf(to, start)
  if (start < 0 || end < 0) throw new Error(`Snapshot section "${from}" not found`)
  return SNAPSHOT.slice(start, end)
}

/** The Foundations JSON block. */
const foundations = JSON.parse(
  section('## Foundations', '## light CSS variables').replace(/^[\s\S]*?```json\n|```[\s\S]*$/g, ''),
)

/** One mode's `| \`--name\` | value |` table. */
const variables = (mode: 'light' | 'dark') => {
  const table =
    mode === 'light'
      ? section('## light CSS variables', '## dark CSS variables')
      : section('## dark CSS variables', '## Authored component assignments')
  return new Map([...table.matchAll(/^\| `(--[\w-]+)` \| (.+) \|$/gm)].map(([, name, value]) => [name, value]))
}

const LIGHT = variables('light')
const DARK = variables('dark')

/** Every `--name: value;` the generator writes. */
const generated = new Map([...cwTokensCSS().matchAll(/^\s*(--[\w-]+): (.+);$/gm)].map(([, name, value]) => [name, value]))

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The statements of a stylesheet that load another, in order. */
const loads = (css: string) => [...withoutComments(css).matchAll(/^@(?:import|use)\s+[^;]+;/gm)].map(([statement]) => statement)

describe('cw-tokens', () => {
  it('T1. the committed src/styles/cw-tokens.css is what cw.ts generates', () => {
    expect(read('src/styles/cw-tokens.css')).toBe(cwTokensCSS())
  })

  it('T2. cw.ts matches the snapshot’s foundations', () => {
    for (const [step, text] of Object.entries(CW.text)) expect(text, `text ${step}`).toEqual(foundations.text[step])
    expect(CW.space).toEqual(foundations.spacing)
    expect(CW.radius).toEqual(foundations.radius)
    expect(CW.border).toEqual(foundations.border)

    for (const [role, font] of Object.entries(CW.fonts)) {
      const { family, weights } = foundations.fonts[role]
      // The snapshot's first family is the licensed face critwire substitutes (GUI.md, Local decisions).
      expect(font.fallback.join(', '), `${role} fallback`).toBe(family.split(', ').slice(1).join(', '))
      expect(font.weights, `${role} weights`).toEqual(weights)
    }

    for (const [size, shadow] of Object.entries(CW.shadow)) {
      const { color, ...geometry } = foundations.shadows[size]
      expect({ ...shadow, color: undefined }, `shadow ${size}`).toEqual({ ...geometry, color: undefined })
      expect(shadow.color, `shadow ${size} colour`).toEqual({
        light: Number(color.light.replace('neutral-', '')),
        dark: Number(color.dark.replace('neutral-', '')),
      })
    }

    const { animation } = foundations
    expect(CW.motion).toEqual({
      small: { duration: animation.duration, easing: animation.easing },
      large: animation.large,
      pressDistance: animation.pressDistance,
      popupScale: animation.popupScale,
    })
  })

  it('T2. cw.ts matches the snapshot’s colours, in both modes', () => {
    for (const [mode, table] of [['light', LIGHT], ['dark', DARK]] as const) {
      const theme = CW[mode]
      for (const step of NEUTRAL_STEPS) expect(theme.neutral[step], `${mode} neutral-${step}`).toBe(table.get(`--neutral-${step}`))
      for (const [n, hex] of Object.entries(CW.color)) expect(hex, `${mode} color-${n}`).toBe(table.get(`--color-${n}`))
      for (const [name, hex] of Object.entries(CW.status)) expect(hex, `${mode} ${name}`).toBe(table.get(`--${name}`))
      expect(theme.accentText, `${mode} accent text`).toBe(table.get('--cte-accent-text'))
      expect(`${CW.focus.width}px solid color-mix(in srgb, ${theme.neutral[10]} ${CW.focus.mix}%, transparent)`).toBe(
        table.get('--focus-ring-outline'),
      )
      expect(String(CW.iconStrokeWidth)).toBe(table.get('--icon-stroke-width'))
    }
  })

  it('T3. every generated variable the snapshot also names is written per mode, light first', () => {
    const shared = [...generated.keys()].filter((name) => LIGHT.has(name))
    for (const name of shared) {
      const light = LIGHT.get(name)
      const dark = DARK.get(name)
      expect(generated.get(name), name).toBe(light === dark ? light : `light-dark(${light}, ${dark})`)
    }
    expect(generated.get('--neutral-3')).toBe('light-dark(#eef0f3, #2a2b2d)')
    // The snapshot's resolved edge and focus colours are departures written as roles in cw.css.
    expect(shared.length).toBeGreaterThanOrEqual(80)
  })

  it('T4. the parsers read the whole snapshot and the generator writes every step', () => {
    expect(Object.keys(foundations.text)).toHaveLength(7)
    expect(Object.keys(foundations.spacing)).toHaveLength(8)
    expect(Object.keys(foundations.radius)).toHaveLength(7)
    expect(Object.keys(foundations.border)).toHaveLength(4)
    expect(Object.keys(foundations.fonts)).toHaveLength(4)
    for (const table of [LIGHT, DARK]) {
      expect([...table.keys()].filter((name) => /^--neutral-\d+$/.test(name))).toHaveLength(10)
      expect([...table.keys()].filter((name) => /^--color-\d$/.test(name))).toHaveLength(4)
    }

    const count = (pattern: RegExp) => [...generated.keys()].filter((name) => pattern.test(name)).length
    expect(count(/^--size-/)).toBe(7)
    expect(count(/^--line-/)).toBe(7)
    expect(count(/^--letter-spacing-/)).toBe(7)
    expect(count(/^--space-/)).toBe(8)
    expect(count(/^--radius-/)).toBe(7)
    expect(count(/^--border-/)).toBe(4)
    expect(count(/^--color-\d$/)).toBe(4)
    expect(count(/^--(success|warning|error)$/)).toBe(3)
    expect(count(/^--neutral-\d+$/)).toBe(10)
    expect([...generated.entries()].filter(([name, value]) => /^--neutral-/.test(name) && value.startsWith('light-dark('))).toHaveLength(10)
  })

  it('T5. each entry point loads the tokens, then the roles, directly', () => {
    expect(loads(read('src/app/(frontend)/globals.css')).slice(0, 4)).toEqual([
      "@import 'tailwindcss';",
      "@import '../../styles/cw-tokens.css';",
      "@import '../../styles/cw.css';",
      "@import './marketing.css' layer(components);",
    ])
    expect(loads(read('src/app/(payload)/custom.scss')).slice(0, 2)).toEqual([
      "@use '../../styles/cw-tokens';",
      "@use '../../styles/cw';",
    ])
    expect(withoutComments(read('src/app/(payload)/custom.scss')).trimStart()).toMatch(/^@use '..\/..\/styles\/cw-tokens';/)
    expect(loads(read('src/styles/cw.css'))).toEqual([])
  })

  it('T6. neither token file sets color-scheme, which belongs to each surface', () => {
    for (const file of ['src/styles/cw.css', 'src/styles/cw-tokens.css']) {
      expect(withoutComments(read(file)), file).not.toMatch(/color-scheme/)
    }
  })

  it('T7. the embed loader paints its button and dialog in cw neutral-1 on neutral-10, per mode', () => {
    // v1.js has no build step, so it can't import cw.ts; it carries the two pairs as literals.
    const match = read('public/embed/v1.js').match(/var COLOURS = (\{[^}]+\})/)
    if (!match) throw new Error('public/embed/v1.js no longer declares COLOURS')
    expect(JSON.parse(match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'))).toEqual({
      light: [CW.light.neutral[1], CW.light.neutral[10]],
      dark: [CW.dark.neutral[1], CW.dark.neutral[10]],
    })
  })
})
