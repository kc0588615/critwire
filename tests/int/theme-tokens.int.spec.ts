// @vitest-environment node
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { NEUTRAL_STEPS, SNAPSHOT_DARK_NEUTRALS, TOKENS } from '@/lib/theme/tokens'
import { tokensCSS } from '@/lib/theme/tokensCss'

// The theme's values live once, in `src/lib/theme/tokens.ts`.
// `src/styles/tokens.css` is generated from it and committed, the roles in
// `src/styles/roles.css` build on it, and both style entry points load the
// tokens, the faces in `fonts.css`, then the roles. E2E can't see the
// source drifting from the snapshot (`gui/themes/cc.md`) or from the
// generated file, nor a colour without its fallback for browsers that lack
// light-dark(), so this test does. `prebuild` runs it beside
// `embed-loader`. One test per failure mode T1–T9 in the cc-site plan.

const read = (file: string) => readFileSync(path.join(process.cwd(), file), 'utf8')

const SNAPSHOT = read('gui/themes/cc.md')

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

const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

/** The statements of a stylesheet that load another, in order. */
const loads = (css: string) => [...withoutComments(css).matchAll(/^@(?:import|use)\s+[^;]+;/gm)].map(([statement]) => statement)

const SUPPORTS = '@supports (color: light-dark(white, black))'

/** A stylesheet split into what every browser reads and what only a light-dark() browser reads. */
const byBrowser = (css: string) => {
  const text = withoutComments(css)
  const start = text.indexOf(SUPPORTS)
  if (start < 0) return { everyBrowser: text, lightDark: '' }
  const open = text.indexOf('{', start + SUPPORTS.length)
  let depth = 0
  let end = open
  for (; end < text.length; end++) {
    if (text[end] === '{') depth++
    if (text[end] === '}' && --depth === 0) break
  }
  if (text.indexOf(SUPPORTS, end) >= 0) throw new Error('More than one light-dark() block')
  return { everyBrowser: text.slice(0, start) + text.slice(end + 1), lightDark: text.slice(open + 1, end) }
}

const declarations = (css: string) => new Map([...css.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]))

/** `light-dark(a, b)` as `[a, b]`, splitting on the top-level comma. */
const pair = (value: string): [string, string] => {
  const inner = value.match(/^light-dark\(([\s\S]*)\)$/)?.[1]
  if (!inner) throw new Error(`Not a light-dark() pair: ${value}`)
  let depth = 0
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '(') depth++
    if (inner[i] === ')') depth--
    if (inner[i] === ',' && depth === 0) return [inner.slice(0, i).trim(), inner.slice(i + 1).trim()]
  }
  throw new Error(`light-dark() without two values: ${value}`)
}

const GENERATED = byBrowser(tokensCSS())
const GENERATED_BASE = declarations(GENERATED.everyBrowser)
const GENERATED_PAIRS = declarations(GENERATED.lightDark)

/** Each generated variable's value in one mode. */
const generatedIn = (mode: 'light' | 'dark') =>
  new Map(
    [...GENERATED_BASE].map(([name, value]) => {
      const both = GENERATED_PAIRS.get(name)
      return [name, both ? pair(both)[mode === 'light' ? 0 : 1] : value]
    }),
  )

describe('theme-tokens', () => {
  it('T1. the committed src/styles/tokens.css is what tokens.ts generates', () => {
    expect(read('src/styles/tokens.css')).toBe(tokensCSS())
  })

  it('T2. tokens.ts matches the snapshot’s foundations', () => {
    for (const [step, text] of Object.entries(TOKENS.text)) expect(text, `text ${step}`).toEqual(foundations.text[step])
    expect(TOKENS.space).toEqual(foundations.spacing)
    expect(TOKENS.radius).toEqual(foundations.radius)
    expect(TOKENS.border).toEqual(foundations.border)
    expect(Object.values(TOKENS.border).every((width) => width === 0), 'cc draws no borders (D7)').toBe(true)

    for (const [role, font] of Object.entries(TOKENS.fonts)) {
      const { family, weights } = foundations.fonts[role]
      // The snapshot's first family is the face critwire substitutes (GUI.md, Local decisions).
      expect(font.fallback.join(', '), `${role} fallback`).toBe(family.split(', ').slice(1).join(', '))
      expect(font.weights, `${role} weights`).toEqual(weights)
    }

    // The resolved strings: cc's m is two layers, which the JSON's one opacity can't describe.
    for (const [step, shadow] of Object.entries(TOKENS.shadow)) {
      expect(shadow, `light shadow ${step}`).toBe(LIGHT.get(`--shadow-${step}`))
      expect(shadow, `dark shadow ${step}`).toBe(DARK.get(`--shadow-${step}`))
    }

    const { animation } = foundations
    expect(TOKENS.motion).toEqual({
      small: { duration: animation.duration, easing: animation.easing },
      large: { duration: animation.large.duration, easing: animation.large.easing },
      pressDistance: animation.pressDistance,
      popupScale: animation.popupScale,
    })
    expect(String(TOKENS.iconStrokeWidth)).toBe(LIGHT.get('--icon-stroke-width'))
  })

  it('T2. tokens.ts matches the snapshot’s colours; the dark neutrals it departs from are recorded exactly', () => {
    for (const step of NEUTRAL_STEPS) {
      expect(TOKENS.light.neutral[step], `light neutral-${step}`).toBe(LIGHT.get(`--neutral-${step}`))
      expect(SNAPSHOT_DARK_NEUTRALS[step], `snapshot dark neutral-${step}`).toBe(DARK.get(`--neutral-${step}`))
    }
    for (const table of [LIGHT, DARK]) {
      for (const [n, hex] of Object.entries(TOKENS.color)) expect(hex, `color-${n}`).toBe(table.get(`--color-${n}`))
      for (const [name, hex] of Object.entries(TOKENS.status)) expect(hex, name).toBe(table.get(`--${name}`))
    }
  })

  it('T3. every generated variable the snapshot also names has the snapshot’s value in both modes, the dark neutrals excepted', () => {
    const generated = { light: generatedIn('light'), dark: generatedIn('dark') }
    const shared = [...generated.light.keys()].filter((name) => LIGHT.has(name))
    for (const name of shared) {
      expect(generated.light.get(name), `light ${name}`).toBe(LIGHT.get(name))
      const darkNeutral = name.match(/^--neutral-(\d+)$/)?.[1]
      // A12: the dark neutrals are the game's (D2); T2 pins the snapshot's beside them.
      const expected = darkNeutral ? TOKENS.dark.neutral[Number(darkNeutral) as keyof typeof TOKENS.dark.neutral] : DARK.get(name)
      expect(generated.dark.get(name), `dark ${name}`).toBe(expected)
    }
    expect(generated.dark.get('--neutral-1')).toBe('#051411')
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
      expect([...table.keys()].filter((name) => /^--(success|warning|error)$/.test(name))).toHaveLength(3)
    }

    const count = (pattern: RegExp) => [...GENERATED_BASE.keys()].filter((name) => pattern.test(name)).length
    expect(count(/^--size-/)).toBe(7)
    expect(count(/^--line-/)).toBe(7)
    expect(count(/^--letter-spacing-/)).toBe(7)
    expect(count(/^--space-/)).toBe(8)
    expect(count(/^--radius-/)).toBe(7)
    expect(count(/^--border-/)).toBe(4)
    expect(count(/^--color-\d$/)).toBe(4)
    expect(count(/^--(success|warning|error)$/)).toBe(3)
    expect(count(/^--neutral-\d+$/)).toBe(10)
    expect(count(/^--shadow-/)).toBe(4)
    expect([...GENERATED_PAIRS.keys()].filter((name) => /^--neutral-\d+$/.test(name))).toHaveLength(10)
    expect(GENERATED_PAIRS.has('--accent-text')).toBe(true)
  })

  it('T5. each entry point loads the tokens, then the faces, then the roles, directly', () => {
    expect(loads(read('src/app/(frontend)/globals.css')).slice(0, 5)).toEqual([
      "@import 'tailwindcss';",
      "@import '../../styles/tokens.css';",
      "@import '../../styles/fonts.css';",
      "@import '../../styles/roles.css';",
      "@import './site.css' layer(components);",
    ])
    expect(loads(read('src/app/(payload)/custom.scss')).slice(0, 3)).toEqual([
      "@use '../../styles/tokens';",
      "@use '../../styles/fonts';",
      "@use '../../styles/roles';",
    ])
    expect(withoutComments(read('src/app/(payload)/custom.scss')).trimStart()).toMatch(/^@use '..\/..\/styles\/tokens';/)
    for (const file of ['src/styles/fonts.css', 'src/styles/roles.css']) expect(loads(read(file)), file).toEqual([])
  })

  it('T6. no token file sets color-scheme, which belongs to each surface', () => {
    for (const file of ['src/styles/tokens.css', 'src/styles/fonts.css', 'src/styles/roles.css']) {
      expect(withoutComments(read(file)), file).not.toMatch(/color-scheme/)
    }
  })

  it('T7. the embed loader paints its button and dialog in neutral-1 on neutral-10, per mode', () => {
    // v1.js has no build step, so it can't import tokens.ts; it carries the two pairs as literals.
    const match = read('public/embed/v1.js').match(/var COLOURS = (\{[^}]+\})/)
    if (!match) throw new Error('public/embed/v1.js no longer declares COLOURS')
    expect(JSON.parse(match[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'))).toEqual({
      light: [TOKENS.light.neutral[1], TOKENS.light.neutral[10]],
      dark: [TOKENS.dark.neutral[1], TOKENS.dark.neutral[10]],
    })
  })

  it('T8. every mode-dependent variable has its light value for every browser and its light-dark() pair only where supported', () => {
    // Without light-dark() (Chrome < 123, Safari < 17.5) a pair is invalid and the colour is lost (D3).
    for (const file of ['src/styles/tokens.css', 'src/styles/roles.css']) {
      const { everyBrowser, lightDark } = byBrowser(read(file))
      expect(everyBrowser, `${file}: light-dark() outside ${SUPPORTS}`).not.toMatch(/light-dark\(/)
      const base = declarations(everyBrowser)
      const pairs = declarations(lightDark)
      for (const [name, value] of pairs) {
        expect(base.get(name), `${file}: ${name} has no light value outside ${SUPPORTS}`).toBe(pair(value)[0])
      }
    }
    const pairs = declarations(byBrowser(read('src/styles/tokens.css')).lightDark)
    for (const name of [...NEUTRAL_STEPS.map((step) => `--neutral-${step}`), '--accent-text']) {
      expect(pairs.has(name), `tokens.css pairs ${name}`).toBe(true)
    }
  })

  it('T9. every face in fonts.css is a file under public/, and every font folder carries its licence', () => {
    // A missing face falls back silently, and E2E can't tell Nunito from its fallback.
    const urls = [...withoutComments(read('src/styles/fonts.css')).matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(([, url]) => url)
    expect(urls.length, 'fonts.css names no face').toBeGreaterThan(0)
    for (const url of urls) {
      expect(url, `${url} is served from public/`).toMatch(/^\/fonts\//)
      expect(existsSync(path.join(process.cwd(), 'public', url)), `public${url}`).toBe(true)
    }
    const folders = readdirSync(path.join(process.cwd(), 'public/fonts'), { withFileTypes: true }).filter((entry) => entry.isDirectory())
    expect(folders.length).toBeGreaterThan(0)
    for (const folder of folders) {
      expect(existsSync(path.join(process.cwd(), 'public/fonts', folder.name, 'OFL.txt')), `public/fonts/${folder.name}/OFL.txt`).toBe(true)
    }
  })
})
