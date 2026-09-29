import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { GROUP_LABELS, GROUPS, SETS, shotFile, shotsFor, shotsTarget, WIDTHS } from './catalog'
import type { RunMeta } from './recordRun'

const escape = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const runsOf = async (dir: string, set: string): Promise<RunMeta[]> =>
  readFile(path.join(dir, set, 'meta.json'), 'utf8')
    .then((text) => (JSON.parse(text) as { runs: RunMeta[] }).runs)
    .catch(() => [])

const figure = (dir: string, set: string, file: string): string => {
  const src = `${set}/${file}`
  const body = existsSync(path.join(dir, src))
    ? `<a href="${escape(src)}"><img src="${escape(src)}" alt="${escape(`${set}: ${file}`)}" loading="lazy"></a>`
    : '<p class="missing">not captured</p>'
  return `<figure><figcaption>${set}</figcaption>${body}</figure>`
}

/** Writes `<dir>/index.html`: every catalog page, before and after side by side, at each width. */
export async function writeIndex(dir: string): Promise<void> {
  const meta = await Promise.all(
    SETS.map(async (set) => {
      const runs = await runsOf(dir, set)
      const items = runs.length
        ? runs
            .map(
              (run) =>
                `<li><code>${escape(run.commit)}</code>${run.dirty ? ' (uncommitted changes)' : ''}, ${escape(run.startedAt)}: <code>${escape(run.command)}</code></li>`,
            )
            .join('')
        : '<li>not captured yet</li>'
      return `<h2>${set}</h2><ul>${items}</ul>`
    }),
  )
  const groups = GROUPS.map((group) => {
    const rows = shotsFor(group)
      .map((shot) => {
        const widths = WIDTHS.map((width) => {
          const file = shotFile(group, shot.id, width)
          return `<div class="pair"><h4>${width} px</h4>${SETS.map((set) => figure(dir, set, file)).join('')}</div>`
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
<title>Critwire design pass: before and after</title>
<style>
  body { font: 15px/1.5 system-ui, sans-serif; margin: 2rem; color: #1b1b1f; background: #f4f4f6; }
  h1 { margin-top: 0; }
  section { margin: 1.5rem 0 2.5rem; }
  .widths { display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
  .pair h4 { grid-column: 1 / -1; margin: 0; }
  figure { margin: 0; }
  figcaption { font-weight: 600; }
  img { display: block; width: 100%; max-height: 70rem; object-fit: cover; object-position: top; border: 1px solid #c9c9d1; background: #fff; }
  .missing { padding: 2rem 1rem; border: 1px dashed #9a9aa6; color: #55556a; text-align: center; }
  code { font-size: 0.85em; }
</style>
</head>
<body>
<h1>Critwire design pass: before and after</h1>
<p>Full-page captures at 1440 and 390 px. Select an image to open it at full size.</p>
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
