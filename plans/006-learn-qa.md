---
title: Learn QA, one pass over all 33 modules
---

# Learn QA

For the owner: what a learner's walk through `/learn/` found. Plan and design: `plans/2026-11-01-critwire-learn-qa.md`.

Commit walked: `20e20bb` (U1a; the final Verification refreshes Pages from `e2e-final/results.json`).

Reproduce:
```sh
pnpm install --frozen-lockfile && pnpm build
E2E_ARTIFACTS=<dir> pnpm exec playwright test e2e/learn-walk   # 49 walks, the keyboard test
E2E_ARTIFACTS=<dir> pnpm e2e                                   # everything
pnpm learn:check                                               # every .sql and .py download on a fresh load
```

## Pages

47 pages at 1280 and 375 px, light and dark, every block run, every exercise filled and checked, every `<details>` open. Axe and overflow columns count violations and views that scroll sideways. Read unit: §4 of the plan.

| Page | URL | Views | Axe | Overflow | Blocks | `incomplete` | Read | Issues |
|---|---|---|---|---|---|---|---|---|
| map | `/learn/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| playground | `/learn/playground/` | 4 | 0 | 0 | 0 | 278 | R1 |  |
| data | `/learn/data/` | 4 | 0 | 0 | 0 | 3248 | R1 |  |
| setup | `/learn/setup/` | 4 | 0 | 0 | 1 | 22 | R1 |  |
| schema | `/learn/schema/` | 4 | 0 | 0 | 0 | 114 | R1 |  |
| schema-lab | `/learn/schema/lab/` | 4 | 0 | 0 | 0 | 98 | R1 |  |
| schema-star | `/learn/schema/star/` | 4 | 0 | 0 | 0 | 36 | R1 |  |
| track foundations | `/learn/foundations/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track database-architecture | `/learn/database-architecture/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track gis-in-sql | `/learn/gis-in-sql/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track spatial-statistics | `/learn/spatial-statistics/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track etl | `/learn/etl/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track power-bi | `/learn/power-bi/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track capstone | `/learn/capstone/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| f1 | `/learn/foundations/select/` | 4 | 0 | 0 | 8 | 66 | R1 |  |
| f2 | `/learn/foundations/aggregate/` | 4 | 0 | 0 | 9 | 96 | R1 |  |
| f3 | `/learn/foundations/join/` | 4 | 0 | 0 | 14 | 70 | R1 |  |
| f4 | `/learn/foundations/window/` | 4 | 0 | 0 | 7 | 1018 | R1 |  |
| d1 | `/learn/database-architecture/keys/` | 4 | 0 | 0 | 13 | 26 | R2 | Q1 |
| d2 | `/learn/database-architecture/normalize/` | 4 | 0 | 0 | 14 | 114 | R2 |  |
| d3 | `/learn/database-architecture/indexes/` | 4 | 0 | 0 | 0 | 0 | R2 |  |
| d4 | `/learn/database-architecture/transactions/` | 4 | 0 | 0 | 0 | 2 | R2 |  |
| d5 | `/learn/database-architecture/roles/` | 4 | 0 | 0 | 0 | 0 | R2 |  |
| d6 | `/learn/database-architecture/star/` | 4 | 0 | 0 | 2 | 2 | R2 |  |
| g1 | `/learn/gis-in-sql/crs/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g2 | `/learn/gis-in-sql/load-validate/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g3 | `/learn/gis-in-sql/spatial-join/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g4 | `/learn/gis-in-sql/measure-overlay/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g5 | `/learn/gis-in-sql/spatial-index/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g6 | `/learn/gis-in-sql/grids/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g7 | `/learn/gis-in-sql/raster/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| s1 | `/learn/spatial-statistics/bias/` | 4 | 0 | 0 | 3 | 394 | R4 |  |
| s2 | `/learn/spatial-statistics/point-patterns/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s3 | `/learn/spatial-statistics/weights/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s4 | `/learn/spatial-statistics/moran/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s5 | `/learn/spatial-statistics/local/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s6 | `/learn/spatial-statistics/zonal/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| e1 | `/learn/etl/extract/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| e2 | `/learn/etl/transform-load/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| e3 | `/learn/etl/idempotent/` | 4 | 0 | 0 | 1 | 2 | R5 |  |
| e4 | `/learn/etl/quality-provenance/` | 4 | 0 | 0 | 0 | 0 | R5 |  |
| e5 | `/learn/etl/schedule/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| p1 | `/learn/power-bi/power-query/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p2 | `/learn/power-bi/model/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p3 | `/learn/power-bi/dax/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p4 | `/learn/power-bi/maps-report/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| c1 | `/learn/capstone/game-feed/` | 4 | 0 | 0 | 0 | 0 | R6 |  |

Dialogs, open over their page:

| Dialog | Views | Axe | Overflow | `incomplete` |
|---|---|---|---|---|
| Schema dialog on f1 | 4 | 0 | 0 | 2 |
| Lab schema dialog on d3 | 4 | 0 | 0 | 4 |

Totals: 196 views, 72 blocks, 0 violations, 0 overflow, nothing off-origin, no page error.

Keyboard (`learn-walk.spec.ts`, d1, 375 px, dark): Tab reaches a code block and a result table, the ring shows, ArrowRight scrolls. Chromium focuses a scroller by itself, so the test also asserts the `tabindex` other browsers need; it failed on that before Q2.

## Links

Filled by U1b (crawl, cross-page fragments, prerequisite hrefs) and U2 (external).

## Axe

axe-core 4.14.0, default rules, `axe.run()` on each view after the page's blocks ran.

| Rule | Before | After |
|---|---|---|
| `scrollable-region-focusable` (serious, WCAG 2.1.1) | 1,248 nodes, 188 views, 38 pages (architecture probe): `pre.code` 666, `pre.recorded` 438, `.table-wrap` 118, `figure.diagram` 24, bare `pre` 2 | 0 |
| every other rule | 0 | 0 |

`incomplete` (axe can't decide, recorded, not asserted): 5,598 nodes over the 196 views. Sample read on map, setup, d1 and data at 1280 light and 375 dark: all `color-contrast`, with "background color could not be determined because it's partially obscured" or "content is too short". They're cells and lines clipped by a scrolling region, so axe can't see their background. `/learn/data/` is most of it (3,248 nodes: its 400-row dataset table). The same colours pass where axe can decide: 0 contrast violations in either theme.

## Labs

Filled by U2.

## Setup vs downloads

Filled by U2.

## Astra leftovers

Filled by U3.

## Issues

`Q<n>`: fix commits start with it; SHAs are filled by U12. Tier: the plan's §7.

| Q | Page | Kind | Tier | What | State | Caught by |
|---|---|---|---|---|---|---|
| Q1 | d1 | layout | T0 | After Run, `d1-ex-same-url`'s error (an unbroken URL) made the page 734 px wide at 375 | fixed | `learn-walk.spec.ts` scrollWidth |
| Q2 | 38 pages | axe | T0 | Code, recorded results, result tables and diagrams that scroll sideways weren't in the tab order | fixed | `learn-walk.spec.ts` axe and keyboard `tabindex` |

## Ledger

Filled by U4–U9: terms (term, defined at, used undefined at) and claims (sample cap, versions, licences, what a table holds, rules).

## Method

Filled by U2 and U4: the throwaway scripts' text.
