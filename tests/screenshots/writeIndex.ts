import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { GROUP_LABELS, GROUPS, SETS, shotFile, shotsFor, shotsTarget, WIDTHS } from './catalog'
import type { ProbeResult } from './probes'
import type { RunMeta } from './recordRun'

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const runsOf = async (dir: string, set: string): Promise<RunMeta[]> =>
  readFile(path.join(dir, set, 'meta.json'), 'utf8')
    .then((text) => (JSON.parse(text) as { runs: RunMeta[] }).runs)
    .catch(() => [])

type Checks = Record<string, ProbeResult[]>

const checksOf = async (dir: string): Promise<Checks> =>
  readFile(path.join(dir, 'after', 'checks.json'), 'utf8')
    .then((text) => JSON.parse(text) as Checks)
    .catch(() => ({}))

/** One line under an after image: its probes, with any failure spelled out. */
const probeLine = (results: ProbeResult[] | undefined): string => {
  if (!results) return ''
  const failed = results.filter((result) => !result.pass)
  if (!failed.length) return `<p class="probes">Probes pass: ${results.map((result) => result.probe).join(', ')}</p>`
  return `<p class="probes failed">${failed.map((result) => `${escape(result.probe)}: ${escape(result.detail)}`).join('<br>')}</p>`
}

const figure = (dir: string, set: string, file: string, checks: Checks): string => {
  const src = `${set}/${file}`
  const body = existsSync(path.join(dir, src))
    ? `<a href="${escape(src)}"><img src="${escape(src)}" alt="${escape(`${set}: ${file}`)}" loading="lazy"></a>`
    : '<p class="missing">not captured</p>'
  return `<figure><figcaption>${set}</figcaption>${body}${set === 'after' ? probeLine(checks[file]) : ''}</figure>`
}

/**
 * Writes `<dir>/index.html`: every catalog page at each width, in each
 * set that has been captured (has a `meta.json`), side by side.
 */
export async function writeIndex(dir: string): Promise<void> {
  const checks = await checksOf(dir)
  const sets = SETS.filter((set) => existsSync(path.join(dir, set, 'meta.json')))
  const meta = await Promise.all(
    sets.map(async (set) => {
      const items = (await runsOf(dir, set))
        .map(
          (run) =>
            `<li><code>${escape(run.commit)}</code>${run.dirty ? ' (uncommitted changes)' : ''}, ${escape(run.startedAt)}: <code>${escape(run.command)}</code></li>`,
        )
        .join('')
      return `<h2>${set}</h2><ul>${items}</ul>`
    }),
  )
  const groups = GROUPS.map((group) => {
    const rows = shotsFor(group)
      .map((shot) => {
        const widths = WIDTHS.map((width) => {
          const file = shotFile(group, shot.id, width)
          return `<div class="pair"><h4>${width} px</h4>${sets.map((set) => figure(dir, set, file, checks)).join('')}</div>`
        }).join('')
        return `<section><h3>${escape(shot.label)}</h3><div class="widths">${widths}</div></section>`
      })
      .join('')
    return `<h2 id="${group}">${escape(GROUP_LABELS[group])}</h2>${rows}`
  }).join('')
  const nav = GROUPS.map((group) => `<a href="#${group}">${escape(GROUP_LABELS[group])}</a>`).join(' | ')

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Critwire: screenshots</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; color: #1b1b1f; background: #f4f4f6; }
  h1 { margin-top: 0; }
  section { margin: 1.5rem 0 2.5rem; }
  .widths { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start; }
  .pair { display: grid; grid-template-columns: repeat(${Math.max(sets.length, 1)}, 1fr); gap: 0.75rem; }
  .pair h4 { grid-column: 1 / -1; margin: 0; }
  figure { margin: 0; }
  figcaption { font-weight: 600; }
  img { display: block; width: 100%; max-height: 70rem; object-fit: cover; object-position: top; border: 1px solid #c9c9d1; background: #fff; }
  .missing { padding: 2rem 1rem; border: 1px dashed #9a9aa6; color: #55556a; text-align: center; }
  code { font-size: 0.85em; }
  .probes { margin: 0.25rem 0 0; font-size: 0.8rem; color: #2d6a3e; }
  .probes.failed { color: #a1261f; font-weight: 600; }
</style>
</head>
<body>
<h1>Critwire: screenshots</h1>
<p>Full-page captures at 1440 and 390 px. Select an image to open it at full size. Under each after image are the quality probes run on that capture (<code>after/checks.json</code>).</p>
${meta.join('\n')}
<p>${nav}</p>
${groups}
</body>
</html>
`
  await writeFile(path.join(dir, 'index.html'), html)
}

/** Global teardown: rewrites the index after every run, including failed ones. */
export default async function writeIndexAfterRun(): Promise<void> {
  await writeIndex(shotsTarget().dir)
}
