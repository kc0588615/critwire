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
const MOTION_PAGES = new Set(['hub', 'home-light', 'home-dark'])
/** Critwire's pages whose focus ring is checked, after the capture. */
export const FOCUS_PAGES = new Set(['home-light', 'home-dark'])
/** WCAG AA: text, large text (24 px, or 18.66 px at weight 700), and a field's edge (1.4.11). */
const CONTRAST_FLOOR = { text: 4.5, large: 3, edge: 3, largePx: 24, largeBoldPx: 18.66, bold: 700 } as const
/** How many failures a contrast result names. */
const CONTRAST_LISTED = 20
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

/**
 * 1. At 390 px the page (or an embed's frame, `where`) never scrolls
 * sideways. A page is measured against the viewport, not `innerWidth`:
 * under `isMobile`, Chromium widens the layout viewport to fit content
 * that's too wide, so `innerWidth` grows with it.
 */
async function noSideScroll(page: Frame | Page, where = ''): Promise<ProbeResult> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))
  const width = 'viewportSize' in page ? (page.viewportSize()?.width ?? innerWidth) : innerWidth
  return result('no-side-scroll', scrollWidth <= width, `scrollWidth ${scrollWidth}, width ${width}${where}`)
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

interface ContrastFailure {
  what: string
  ratio: number
  floor: number
  color: string
  background: string
}

interface ContrastReport {
  texts: number
  fields: number
  skipped: Record<string, number>
  failures: ContrastFailure[]
}

/**
 * 8. Visible text reaches WCAG AA against the background composited from
 * its ancestors' background colours over the canvas, and text fields'
 * edges reach 3:1 against what's behind them. Colours go through a 1×1
 * canvas, so every computed form parses (`color(srgb …)`, and what
 * `color-mix()` and `light-dark()` compute to). Text the probe can't judge
 * (over an image or a background image) is skipped and counted, like
 * hidden text. With no text to check it fails, so it's never vacuous.
 */
export async function contrast(page: Frame | Page, where = ''): Promise<ProbeResult> {
  const report: ContrastReport = await page.evaluate((floor) => {
    type RGBA = [number, number, number, number]
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('contrast: no 2D canvas to read colours with')
    const SENTINEL = '#010203'
    const parsed = new Map<string, RGBA>()
    /** A computed colour as 0–255 channels and a 0–1 alpha. */
    const read = (css: string): RGBA => {
      const known = parsed.get(css)
      if (known) return known
      context.fillStyle = SENTINEL
      context.fillStyle = css
      if (context.fillStyle === SENTINEL && css !== SENTINEL) throw new Error(`contrast: the canvas can't parse ${css}`)
      context.clearRect(0, 0, 1, 1)
      context.fillRect(0, 0, 1, 1)
      const [r, g, b, a] = context.getImageData(0, 0, 1, 1).data
      // The canvas rounds alpha to 1/255, so `/ 0.5` would paint as 0.502; the computed value states it exactly.
      const stated = /^rgba\(.*,\s*([\d.]+)\)$/.exec(css) ?? /\/\s*([\d.]+)\)$/.exec(css)
      const rgba: RGBA = [r, g, b, stated ? Number(stated[1]) : a / 255]
      parsed.set(css, rgba)
      return rgba
    }
    /** `top` painted over an opaque `base`, rounded to whole channels as the painted pixel is. */
    const over = (top: RGBA, base: RGBA): RGBA => [
      Math.round(top[0] * top[3] + base[0] * (1 - top[3])),
      Math.round(top[1] * top[3] + base[1] * (1 - top[3])),
      Math.round(top[2] * top[3] + base[2] * (1 - top[3])),
      1,
    ]
    const linear = (channel: number): number => {
      const c = channel / 255
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
    }
    const luminance = ([r, g, b]: RGBA): number => 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
    const ratioOf = (a: RGBA, b: RGBA): number => {
      const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x)
      return (light + 0.05) / (dark + 0.05)
    }
    const hex = ([r, g, b]: RGBA): string =>
      `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`

    // The canvas colour under the root's `color-scheme`, as a system colour resolves there.
    const swatch = document.createElement('span')
    swatch.style.color = 'Canvas'
    document.documentElement.append(swatch)
    const canvasColor = read(getComputedStyle(swatch).color)
    swatch.remove()

    /** The opaque colour behind `el`'s content, or `image` when a background image shows through. */
    const backgroundOf = (el: Element): 'image' | RGBA => {
      const layers: RGBA[] = []
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        if (style.backgroundImage !== 'none') return 'image'
        const color = read(style.backgroundColor)
        if (color[3] === 0) continue
        if (color[3] === 1) return layers.reduceRight<RGBA>((base, layer) => over(layer, base), color)
        layers.push(color)
      }
      return layers.reduceRight<RGBA>((base, layer) => over(layer, base), canvasColor)
    }

    /** Hidden from sight but not from the layout: sr-only boxes, `clip` and off-screen text. */
    const clipped = (el: Element): boolean => {
      for (let node: Element | null = el; node; node = node.parentElement) {
        const style = getComputedStyle(node)
        const box = node.getBoundingClientRect()
        const overflows = style.overflowX !== 'visible' || style.overflowY !== 'visible'
        if (overflows && (box.width <= 1 || box.height <= 1)) return true
        if (style.clip.startsWith('rect(0px') || style.clipPath.includes('inset(50%)')) return true
        if (box.right + window.scrollX <= 0 || box.bottom + window.scrollY <= 0) return true
      }
      return false
    }

    const skipped: Record<string, number> = {}
    const skip = (reason: string): void => {
      skipped[reason] = (skipped[reason] ?? 0) + 1
    }
    const failures: ContrastFailure[] = []
    const media = [...document.querySelectorAll('img, picture, video')]
      .map((el) => el.getBoundingClientRect())
      .filter((box) => box.width > 0 && box.height > 0)
    const overlaps = (a: DOMRect, b: DOMRect): boolean =>
      a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom

    // Every element that owns a non-blank text node.
    const owners = new Set<Element>()
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement
      if (node.textContent?.trim() && parent && !parent.closest('script, style, noscript, template, title')) {
        owners.add(parent)
      }
    }

    let texts = 0
    for (const el of owners) {
      // Not rendered at all (`display: none` on it or an ancestor): nothing to see.
      if (!el.checkVisibility()) continue
      const rects = [...el.childNodes]
        .filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        .flatMap((node) => {
          const range = document.createRange()
          range.selectNodeContents(node)
          return [...range.getClientRects()]
        })
        .filter((box) => box.width > 0 && box.height > 0)
      if (!rects.length) continue
      if (el.closest('svg')) skip('svg')
      else if (el.closest('[aria-hidden="true"]')) skip('aria-hidden')
      else if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) skip('hidden')
      else if (clipped(el)) skip('clipped')
      else if (el.closest(':disabled')) skip('disabled')
      else if (rects.some((box) => media.some((image) => overlaps(box, image)))) skip('over an image')
      else {
        const background = backgroundOf(el)
        if (background === 'image') {
          skip('background image')
          continue
        }
        const style = getComputedStyle(el)
        const color = over(read(style.color), background)
        const size = parseFloat(style.fontSize)
        const large = size >= floor.largePx || (size >= floor.largeBoldPx && Number(style.fontWeight) >= floor.bold)
        const need = large ? floor.large : floor.text
        const ratio = ratioOf(color, background)
        texts++
        if (ratio < need) {
          const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ')
          failures.push({
            what: `${el.tagName.toLowerCase()} "${text.slice(0, 30)}"${large ? ' (large)' : ''}`,
            ratio,
            floor: need,
            color: hex(color),
            background: hex(background),
          })
        }
      }
    }

    // Field edges: the border when it's drawn, else the first inset shadow (a ring drawn inside).
    const NOT_FIELDS = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])
    const insetShadow = (shadow: string): null | string => {
      const inset = shadow === 'none' ? undefined : shadow.split(/,(?![^(]*\))/).find((part) => /\binset\b/.test(part))
      return inset?.trim().match(/^(?:[a-z-]+\([^)]*\)|#[0-9a-f]+|[a-z]+)/i)?.[0] ?? null
    }
    let fields = 0
    for (const el of document.querySelectorAll<HTMLElement>('input, select, textarea')) {
      if (el instanceof HTMLInputElement && NOT_FIELDS.has(el.type)) continue
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
      if (el.matches(':disabled') || el.closest('[aria-hidden="true"]') || clipped(el)) continue
      const behind = el.parentElement ? backgroundOf(el.parentElement) : canvasColor
      if (behind === 'image') {
        skip('background image')
        continue
      }
      const style = getComputedStyle(el)
      const side = (['Top', 'Right', 'Bottom', 'Left'] as const).find(
        (s) => parseFloat(style[`border${s}Width`]) > 0 && read(style[`border${s}Color`])[3] > 0,
      )
      const edge = side ? style[`border${side}Color`] : insetShadow(style.boxShadow)
      const what = `${el.tagName.toLowerCase()}${el.getAttribute('name') ? `[name=${el.getAttribute('name')}]` : ''} edge`
      fields++
      if (!edge) {
        failures.push({ what: `${what}: none drawn`, ratio: 1, floor: floor.edge, color: 'none', background: hex(behind) })
        continue
      }
      const color = over(read(edge), behind)
      const ratio = ratioOf(color, behind)
      if (ratio < floor.edge) failures.push({ what, ratio, floor: floor.edge, color: hex(color), background: hex(behind) })
    }
    return { texts, fields, skipped, failures }
  }, CONTRAST_FLOOR)

  const { texts, fields, skipped, failures } = report
  const skips = Object.entries(skipped).map(([reason, count]) => `${count} ${reason}`)
  const summary = `${texts} texts and ${fields} field edges checked${skips.length ? `, skipped ${skips.join(', ')}` : ''}${where}`
  if (!texts) return result('contrast', false, `no checkable text: ${summary}`)
  const listed = failures
    .slice(0, CONTRAST_LISTED)
    .map((f) => `${f.what} ${f.ratio.toFixed(2)}:1 < ${f.floor} (${f.color} on ${f.background})`)
  const more = failures.length > CONTRAST_LISTED ? `; and ${failures.length - CONTRAST_LISTED} more` : ''
  return result('contrast', failures.length === 0, failures.length ? `${failures.length} below the floor: ${listed.join('; ')}${more}. ${summary}` : summary)
}

/** Probes that read the page as captured: run after focus is shown and before the screenshot. */
export async function probePage(page: Page, { group, shot, width, requests }: ProbeTarget): Promise<ProbeResult[]> {
  const portal = isPortalGroup(group)
  const results: ProbeResult[] = []
  // An embed's own controls and text live in its frame, on the app's origin.
  const widget = shot.host ? page.frames().find((frame) => frame !== page.mainFrame()) : undefined
  const inWidget = " in the widget's frame"
  if (width === MOBILE_WIDTH) {
    results.push(await noSideScroll(page), await tapTargets(page, shot.tapScope))
    if (widget) results.push(await noSideScroll(widget, inWidget), await tapTargets(widget, ':root', inWidget))
  }
  results.push(await contrast(page))
  if (widget) results.push(await contrast(widget, inWidget))
  if (MOTION_PAGES.has(shot.id)) results.push(await motionSettled(page))
  if (portal && PROSE_PAGES.has(shot.id)) results.push(await proseColor(page))
  results.push(noFontHosts(requests))
  if (portal) results.push(await oneRoot(page))
  return results
}

/**
 * No capture shows focus: after the home capture, Tab to the first link
 * and check its ring is cw's, `--focus-ring-color` (D28). Runs after the
 * screenshot so the ring never shows in it.
 */
export async function probeMarketingFocus(page: Page): Promise<ProbeResult> {
  await page.keyboard.press('Tab')
  return focusRing(page, '.cw-root', 'var(--focus-ring-color)')
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
