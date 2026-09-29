import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { shotsTarget } from './catalog'

export interface RunMeta {
  commit: string
  /** Uncommitted changes in the tree the build came from. */
  dirty: boolean
  startedAt: string
  command: string
}

const git = (...args: string[]): string => execFileSync('git', args, { encoding: 'utf8' }).trim()

/** The command that reproduces this run, rebuilt from the env vars and CLI arguments. */
const reproduceCommand = (): string => {
  const env = ['SHOTS_SET', 'SHOTS_DIR', 'SHOTS_THEMES', 'SHOTS_SKIP_BUILD']
    .filter((name) => process.env[name])
    .map((name) => `${name}=${process.env[name]}`)
  const cli = process.argv.slice(2)
  const configAt = cli.indexOf('--config')
  const extra = cli.filter((arg, i) => arg !== 'test' && i !== configAt && i !== configAt + 1)
  return [...env, 'pnpm screenshots', ...extra].join(' ')
}

/** Global setup: appends this run to `<SHOTS_DIR>/<SHOTS_SET>/meta.json`. */
export default async function recordRun(): Promise<void> {
  const { set, dir } = shotsTarget()
  const setDir = path.join(dir, set)
  await mkdir(setDir, { recursive: true })
  const metaPath = path.join(setDir, 'meta.json')
  const runs = await readFile(metaPath, 'utf8')
    .then((text) => (JSON.parse(text) as { runs: RunMeta[] }).runs)
    .catch(() => [] as RunMeta[])
  runs.push({
    commit: git('rev-parse', '--short', 'HEAD'),
    dirty: git('status', '--porcelain').length > 0,
    startedAt: new Date().toISOString(),
    command: reproduceCommand(),
  })
  await writeFile(metaPath, JSON.stringify({ runs }, null, 2))
}
