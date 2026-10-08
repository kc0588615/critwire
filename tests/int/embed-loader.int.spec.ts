// @vitest-environment node
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { gzipSync } from 'node:zlib'

import { describe, expect, it } from 'vitest'

// The loader (`public/embed/v1.js`) is pasted into studios' sites and long
// cached, so it's a contract: under 5 KB gzipped, and it never sets
// cookies, uses storage, makes requests of its own or reads the host page.
// `prebuild` runs this file (and `theme-tokens`), so `pnpm build` stops on a
// loader that breaks it. The check reads the source as text and never
// parses it: a tripwire against accidents, strict on comments and strings
// too. E2E checks what the loader actually does. One test per failure mode
// L1–L7 in the embed mission plan, plus the committed file.

/** The gzipped size, at zlib's default level (what nginx and Next send), must stay under this. */
const BUDGET = 5120

/** Names the loader's source must never contain, and why. */
const FORBIDDEN: Record<string, string> = {
  'document.cookie': 'the loader sets and reads no cookies',
  localStorage: 'the loader touches no storage',
  sessionStorage: 'the loader touches no storage',
  indexedDB: 'the loader touches no storage',
  'fetch(': 'the loader makes no requests of its own',
  XMLHttpRequest: 'the loader makes no requests of its own',
  sendBeacon: 'the loader makes no requests of its own',
  'document.title': 'the loader reads nothing from the host page',
  '.innerHTML': 'the loader builds elements, and never reads or writes markup',
}

/** Every way `source` breaks the loader's contract; empty when it's fine. */
const loaderProblems = (source: string): string[] => {
  if (source.trim() === '') return ['The loader is empty']
  const problems: string[] = []
  const size = gzipSync(source).length
  if (size >= BUDGET) problems.push(`Over budget: ${size} bytes gzipped; it must stay under ${BUDGET}`)
  for (const [name, why] of Object.entries(FORBIDDEN)) {
    if (source.includes(name)) problems.push(`Forbidden: ${name} (${why})`)
  }
  return problems
}

const loaderFileProblems = (file: string): string[] => {
  let source: string
  try {
    source = readFileSync(file, 'utf8')
  } catch {
    return [`${file} not found`]
  }
  return loaderProblems(source)
}

/** A loader-shaped source around `body`. */
const loader = (body: string) => `(function () {
  var script = document.currentScript
  ${body}
})()
`

/** One realistic use of each forbidden name. */
const USES: Record<string, string> = {
  'document.cookie': "document.cookie = 'seen=1'",
  localStorage: "localStorage.setItem('seen', '1')",
  sessionStorage: "sessionStorage.getItem('seen')",
  indexedDB: "indexedDB.open('critwire')",
  'fetch(': "fetch('/track')",
  XMLHttpRequest: 'var request = new XMLHttpRequest()',
  sendBeacon: "navigator.sendBeacon('/track')",
  'document.title': 'var page = document.title',
  '.innerHTML': "script.parentNode.innerHTML += '<iframe></iframe>'",
}

/** Incompressible: base64 of random bytes gzips to at least 6 bits a character. */
const overBudget = () => `var padding = '${randomBytes(6000).toString('base64')}'`

const overBudgetProblem = expect.stringMatching(new RegExp(`^Over budget: \\d+ bytes gzipped; it must stay under ${BUDGET}$`))

describe('embed-loader', () => {
  it('passes a small loader that uses none of the forbidden names', () => {
    expect(loaderProblems(loader("script.after(document.createElement('iframe'))"))).toEqual([])
  })

  it('L1. fails on a missing file, and names its path', () => {
    const file = path.join(process.cwd(), 'public/embed/no-such-loader.js')
    expect(loaderFileProblems(file)).toEqual([`${file} not found`])
  })

  it('L2. fails on an empty or whitespace-only source, never passing vacuously', () => {
    for (const empty of ['', '   \n\n\t']) {
      expect(loaderProblems(empty), JSON.stringify(empty)).toEqual(['The loader is empty'])
    }
  })

  it('L3. fails at 5,120 bytes gzipped or more, and names the size and the budget', () => {
    const source = loader(overBudget())
    expect(gzipSync(source).length).toBeGreaterThanOrEqual(BUDGET)
    expect(loaderProblems(source)).toEqual([overBudgetProblem])
  })

  it('L4. applies the budget to the gzipped size, not the raw size', () => {
    const source = loader(`var padding = '${'critwire '.repeat(2400)}'`)
    expect(source.length).toBeGreaterThan(20 * 1024)
    expect(loaderProblems(source)).toEqual([])
  })

  it('L5. fails on each forbidden name, and names it', () => {
    expect(Object.keys(USES).sort()).toEqual(Object.keys(FORBIDDEN).sort())
    for (const [name, use] of Object.entries(USES)) {
      expect(loaderProblems(loader(use)), name).toEqual([`Forbidden: ${name} (${FORBIDDEN[name]})`])
    }
  })

  it('L6. fails on a forbidden name in a comment or a string too', () => {
    for (const body of ['// never touches localStorage', "/* or document.title */ var ok = 1", "var api = 'sendBeacon'"]) {
      expect(loaderProblems(loader(body)), body).toEqual([expect.stringMatching(/^Forbidden: /)])
    }
  })

  it('L7. reports every problem at once', () => {
    const source = loader(`${overBudget()}\n  fetch('/track')\n  localStorage.clear()`)
    expect(loaderProblems(source)).toEqual([
      overBudgetProblem,
      `Forbidden: localStorage (${FORBIDDEN.localStorage})`,
      `Forbidden: fetch( (${FORBIDDEN['fetch(']})`,
    ])
  })

  it('the committed public/embed/v1.js passes', () => {
    expect(loaderFileProblems(path.join(process.cwd(), 'public/embed/v1.js'))).toEqual([])
  })
})
