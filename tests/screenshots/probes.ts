import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import type { Frame, Page } from '@playwright/test'

import { type Group, isPortalGroup, type Shot } from './catalog'

/**
 * The quality floor's probes (plan S22), run on every "after" capture.
 * Each returns a result instead of asserting, so the spec can
 * `expect.soft` them and `checks.json` records passes as well as failures.
 */

export interface ProbeResult {
  probe: string
  pass: boolean
  detail: string
}

export interface ProbeTarget {
  group: Group
  shot: Shot
  width: number
  /** Every URL the page requested since the test started. */
  requests: string[]
}

const MOBILE_WIDTH = 390
const MIN_TARGET_PX = 44
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'raw.githubusercontent.com']
/** Pages whose motion moment must be settled once loaded under reduced motion. */
const MOTION_PAGES = new Set(['hub', 'home'])
/** Pages with studio-written rich text. */
const PROSE_PAGES = new Set(['update'])

const result = (probe: string, pass: boolean, detail: string): ProbeResult => ({ probe, pass, detail })

/**
 * Resolves a CSS colour expression (such as `var(--fs-fg)`) to its computed
 * `rgb()` inside the first element matching `scope`.
 */
const resolveColor = (page: Page, scope: string, expression: string): Promise<string> =>
  page.evaluate(
    ([scopeSelector, value]) => {
      const host = document.querySelector(scopeSelector)
      if (!host) throw new Error(`no ${scopeSelector} to resolve ${value} in`)
      const probe = document.createElement('span')
      probe.style.color = value
      host.append(probe)
      const color = getComputedStyle(probe).color
      probe.remove()
      return color
    },
    [scope, expression] as const,
  )

/** 1. At 390 px the page (or an embed's frame, `where`) never scrolls sideways. */
async function noSideScroll(page: Frame | Page, where = ''): Promise<ProbeResult> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  return result('no-side-scroll', scrollWidth <= innerWidth, `scrollWidth ${scrollWidth}, innerWidth ${innerWidth}${where}`)
}

/**
 * 2. At 390 px, visible buttons, form controls and header links inside
 * `scope` are at least 44 px tall. A scope the page lacks fails, so the
 * probe never passes vacuously.
 */
async function tapTargets(page: Frame | Page, scope = ':root', where?: string): Promise<ProbeResult> {
  const short = await page.evaluate(([min, scopeSelector]) => {
    const host = document.querySelector(scopeSelector)
    if (!host) return [`no ${scopeSelector} on the page`]
    const selector = 'button, [role="button"], input:not([type="hidden"]), select, textarea, header a'
    return [...host.querySelectorAll<HTMLElement>(selector)]
      .filter((el) => {
        const rect = el.getBoundingClientRect()
        // Visually hidden (sr-only) and off-screen elements aren't targets.
        return rect.width > 1 && rect.height > 1 && rect.bottom > 0 && getComputedStyle(el).visibility !== 'hidden'
      })
      .map((el) => ({ el, height: el.getBoundingClientRect().height }))
      .filter(({ height }) => height < min)
      .map(({ el, height }) => `${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('name') || '').trim().slice(0, 30)}" ${height.toFixed(1)}px`)
  }, [MIN_TARGET_PX, scope] as const)
  const at = where ?? (scope === ':root' ? '' : ` in ${scope}`)
  return result('tap-targets', short.length === 0, short.length ? short.join('; ') : `all ≥ ${MIN_TARGET_PX}px${at}`)
}

/** 3. The focused element wears the 2px solid ring in the surface's foreground colour. */
async function focusRing(page: Page, scope: string, expression: string): Promise<ProbeResult> {
  const expected = await resolveColor(page, scope, expression)
  const ring = await page.evaluate(() => {
    const el = document.activeElement
    if (!el || el === document.body) return null
    const style = getComputedStyle(el)
    return {
      element: `${el.tagName.toLowerCase()}${el.className ? `.${String(el.className).split(' ').join('.')}` : ''}`,
      style: style.outlineStyle,
      width: style.outlineWidth,
      color: style.outlineColor,
    }
  })
  if (!ring) return result('focus-ring', false, 'nothing has focus')
  const pass = ring.style === 'solid' && ring.width === '2px' && ring.color === expected
  return result('focus-ring', pass, `${ring.element}: ${ring.width} ${ring.style} ${ring.color}, expected 2px solid ${expected}`)
}

/** 4. Under reduced motion nothing is still animating once the page has loaded. */
async function motionSettled(page: Page): Promise<ProbeResult> {
  const running = await page.evaluate(() =>
    document.getAnimations().map((animation) => {
      const target = (animation.effect as KeyframeEffect | null)?.target
      const name = 'animationName' in animation ? String(animation.animationName) : animation.constructor.name
      return `${name} on ${target ? target.tagName.toLowerCase() + (target.className ? `.${String(target.className).split(' ')[0]}` : '') : '?'} (${animation.playState})`
    }),
  )
  return result('motion-settled', running.length === 0, running.length ? running.join('; ') : 'no animations')
}

/** 5. Studio prose (rich text and status notes) renders in the theme's foreground colour, never an inherited default (F5). */
async function proseColor(page: Page): Promise<ProbeResult> {
  const expected = await resolveColor(page, '.fs-root', 'var(--fs-fg)')
  const colors = await page.evaluate(() =>
    [...document.querySelectorAll('article :is(.payload-richtext :is(p, li), aside.fs-note p)')].map((el) => getComputedStyle(el).color),
  )
  if (!colors.length) return result('prose-color', false, 'no prose paragraphs found')
  const off = colors.filter((color) => color !== expected)
  return result('prose-color', off.length === 0, `${colors.length} blocks, ${off.length} not ${expected}${off.length ? `: ${[...new Set(off)].join(', ')}` : ''}`)
}

/** 6. No request goes to a third-party font or template-asset host. */
function noFontHosts(requests: string[]): ProbeResult {
  const hits = requests.filter((url) => FONT_HOSTS.includes(new URL(url).hostname))
  return result('no-font-hosts', hits.length === 0, hits.length ? hits.join(', ') : `${requests.length} requests, none to font hosts`)
}

/** 7. A portal page has exactly one theme root. */
async function oneRoot(page: Page): Promise<ProbeResult> {
  const count = await page.locator('.fs-root').count()
  return result('one-fs-root', count === 1, `${count} .fs-root`)
}

/** Probes that read the page as captured: run after focus is shown and before the screenshot. */
export async function probePage(page: Page, { group, shot, width, requests }: ProbeTarget): Promise<ProbeResult[]> {
  const portal = isPortalGroup(group)
  const results: ProbeResult[] = []
  if (width === MOBILE_WIDTH) {
    results.push(await noSideScroll(page), await tapTargets(page, shot.tapScope))
    // An embed's own controls live in its frame, on the app's origin.
    const widget = shot.host ? page.frames().find((frame) => frame !== page.mainFrame()) : undefined
    if (widget) {
      const where = " in the widget's frame"
      results.push(await noSideScroll(widget, where), await tapTargets(widget, ':root', where))
    }
  }
  if (MOTION_PAGES.has(shot.id)) results.push(await motionSettled(page))
  if (portal && PROSE_PAGES.has(shot.id)) results.push(await proseColor(page))
  results.push(noFontHosts(requests))
  if (portal) results.push(await oneRoot(page))
  return results
}

/**
 * No capture shows focus: after the home capture, Tab to the first link
 * and check its ring is Ink. Runs after the screenshot so the ring
 * never shows in it.
 */
export async function probeMarketingFocus(page: Page): Promise<ProbeResult> {
  await page.keyboard.press('Tab')
  return focusRing(page, '.cw-root', 'var(--cw-ink)')
}

/**
 * Merges one capture's results into `<dir>/after/checks.json`, keyed by
 * its PNG name so a re-shot page replaces its old entry. Safe because
 * the harness runs one worker.
 */
export async function recordChecks(dir: string, key: string, results: ProbeResult[]): Promise<void> {
  const file = path.join(dir, 'after', 'checks.json')
  await mkdir(path.dirname(file), { recursive: true })
  const checks = await readFile(file, 'utf8')
    .then((text) => JSON.parse(text) as Record<string, ProbeResult[]>)
    .catch((error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return {} as Record<string, ProbeResult[]>
      throw error
    })
  checks[key] = results
  const sorted = Object.fromEntries(Object.entries(checks).sort(([a], [b]) => a.localeCompare(b)))
  await writeFile(file, JSON.stringify(sorted, null, 2))
}
