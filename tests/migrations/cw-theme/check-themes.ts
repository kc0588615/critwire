/**
 * Migration-check for cw-theme (plan S17, Failure modes MB2 and MB11):
 * resolves each fixture game's stored theme as the portal does
 * (`siteThemeSchema.safeParse(mergeTheme(row))`, under this tree's
 * defaults) and checks which ones fail.
 *
 *   DATABASE_URL=<…_migcheck> pnpm exec tsx tests/migrations/cw-theme/check-themes.ts before|after
 *
 * `before` (unmigrated fixtures): exactly P1 and P2 fail, each only on
 * `mutedForeground on surface has contrast 4.10:1`, so the fixtures
 * reproduce the bug. `after` (migrated): all five pass. Exits non-zero
 * otherwise, or on any database whose name doesn't end in `_migcheck`.
 */
import pg from 'pg'

import { DEFAULT_THEME_COLORS, mergeTheme, siteThemeSchema, type ThemeLayer } from '../../../src/lib/game-portal/theme'

const EXPECTED_FAILURE = 'mutedForeground on surface has contrast 4.10:1'
const FIXTURES = ['migcheck-p1', 'migcheck-p2', 'migcheck-p3', 'migcheck-p4', 'migcheck-p5']
const EXPECT_FAILING = { before: ['migcheck-p1', 'migcheck-p2'], after: [] as string[] }

const mode = process.argv[2]
if (mode !== 'before' && mode !== 'after') throw new Error('usage: check-themes.ts before|after')

const url = process.env.DATABASE_URL ?? ''
if (!new URL(url).pathname.endsWith('_migcheck')) {
  throw new Error(`check-themes.ts runs only on a database ending in _migcheck, not ${new URL(url).pathname}`)
}

const snake = (key: string): string => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)

const toLayer = (row: Record<string, unknown>): ThemeLayer => ({
  colors: Object.fromEntries(
    Object.keys(DEFAULT_THEME_COLORS).map((key) => [key, row[`theme_colors_${snake(key)}`]]),
  ),
  typography: row.theme_typography,
  shape: row.theme_shape,
  density: row.theme_density,
  motion: row.theme_motion,
})

const client = new pg.Client({ connectionString: url })
await client.connect()
const { rows } = await client
  .query<Record<string, unknown>>('select * from game_projects where slug = any($1) order by slug', [FIXTURES])
  .finally(() => client.end())

if (rows.length !== FIXTURES.length) throw new Error(`expected ${FIXTURES.length} fixtures, found ${rows.length}`)

const problems: string[] = []
for (const row of rows) {
  const slug = String(row.slug)
  const result = siteThemeSchema.safeParse(mergeTheme(toLayer(row)))
  const issues = result.success ? [] : result.error.issues.map((issue) => issue.message)
  console.log(`${slug} (id ${row.id}): ${issues.length ? `fails: ${issues.join(' | ')}` : 'passes'}`)

  const shouldFail = EXPECT_FAILING[mode].includes(slug)
  if (shouldFail && !(issues.length === 1 && issues[0].startsWith(EXPECTED_FAILURE))) {
    problems.push(`${slug} should fail only on "${EXPECTED_FAILURE}"`)
  }
  if (!shouldFail && issues.length) problems.push(`${slug} should pass`)
}

if (problems.length) {
  console.error(`check-themes ${mode}: FAILED\n${problems.join('\n')}`)
  process.exit(1)
}
console.log(`check-themes ${mode}: ok (failing: ${EXPECT_FAILING[mode].join(', ') || 'none'})`)
