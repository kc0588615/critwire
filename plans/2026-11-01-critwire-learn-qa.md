---
mission: critwire-learn-qa
project: critwire
branch: agent/critwire-learn-qa
status: active
started: 2026-11-01 11:16 UTC
---

# Mission: critwire Learn, a fresh-eyes QA pass over all 33 modules

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-learn-qa.md
     Start: started by the chain after critwire-review-presort is released (base: main).
     Owner, 2026-11-01: "do everything" from the list of next work; second of three chained critwire missions. -->

### Goal

critwire Learn (https://critwire.com/learn/; 33 modules, built by missions L1–L5) gets one pass as a **learner** would take it, from the map to the capstone. Fix what's small, and list what isn't.

Do this:
1. **Walk every page** in headless Chromium at 1280 px and at 375 px, light and dark.
   - Every link resolves.
   - Every prerequisite link points to the right module.
   - Every browser block runs and shows the result the page states.
   - Every exercise accepts its answer and rejects a wrong one.
   - The text agrees with the results shown: numbers in prose match the blocks.
   - Every diagram has alt text and a `<title>`.
   - No horizontal scroll.
   - The axe accessibility checks pass.
2. **Download every lab file** (`.sql`, `.py`, `.ipynb`) and run it as a learner would, using `learn:check`'s assembled-download stage. Confirm `/learn/setup/` still matches what the downloads need.
3. **Read for the owner's level:** a GIS specialist and game developer, new to the topic, reading fast. Flag jargon left undefined, steps that skip a needed action, and contradictions between modules.
4. **Astra's two leftover suggestions** from `critwire-release`:
   - a fixture test for GBIF dataset-facet paging past 300 datasets (`scripts/ingest/gbif.ts`)
   - safe slug filenames

   Check whether L1's record validator already covers slugs (`scripts/build/inputs.ts`, the validator). If it does, record that; if not, add the test.

**Fix** anything small: typos, a broken link, a wrong number in prose, a missing alt text, an exercise check bug. Write every fix with a test or an E2E assertion that would have caught it.

**List** anything bigger in `plans/006-learn-qa.md` with a recommendation, for the owner. That covers a module that teaches something wrong, a missing step, or a redesign. Don't do those.

### Why

L1–L5 were built and tested piece by piece. One end-to-end read by a fresh pair of eyes catches what per-module tests can't: cross-module contradictions, unclear steps and drift between the setup page and the labs. The owner is about to study from it.

### Scope

In: `site/learn/`, `scripts/build/` and the `learn:check` fixes the bugs need, `e2e/`, `plans/006-learn-qa.md`, the two Astra tests, and `plans/004-learn-curriculum.md` where code proves it wrong.

Out:
- new modules, new datasets, design changes, `/v1` changes
- the Caddy configuration
- IUCN data

### Definition of done

- `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- `pnpm e2e` passes in full.
- `learn:check` passes twice.
- `plans/006-learn-qa.md` lists every page walked, every issue found (fixed, with its commit, or listed, with a recommendation), and the axe and link results.
- The live smoke after `deploy`: every `/learn/` page returns 200, and the fixed pages show the fix.

### Decision rules

- **Fix small, list big.** If a fix needs more than about one step or changes what a module teaches, list it instead.
- Keep the 48-session limit and the E2E-artifact disk rule (session rules, step 3).
- Keep it simple; at most 25 steps.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-01 on `eca544f` (= `origin/main` `ca66440` + mission start), db `critwire_dev` (`.env`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-qa/baseline-*.log`.
- `pnpm install --frozen-lockfile`: up to date. `pnpm learn:venv`: ok. No migrations (build rebuilds `db/schema.sql` tables each run). No lint script; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 748/748 pass (2.9 min).
- `pnpm test:db`: 140/140 pass (24 min).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,477 B, committed lab data 18,822,906 B (cap 120,000,000 each).
- `pnpm learn:check`: ok (9.4 min), `checked.json` unchanged, working tree clean after.
- `pnpm e2e`: 98/98 pass (7.2 min); artifacts `/srv/critter-ai/agent-state/missions/critwire-learn-qa/e2e-baseline/` (808 MB).
- `dist/` hashes: 311 files, list `/srv/critter-ai/agent-state/missions/critwire-learn-qa/dist-baseline.sha256` (list's sha256 `e9b15e9942e8cceb…`). Live `/srv/apps/critwire/.live` identical (diff empty).

## Architecture

Basis: code read at `def8b4c`, plus throwaway measurements on its `dist/` (scripts in `/tmp`, repo untouched; axe-core 4.14.0, Chromium headless, labs-only venv). Numbers below are measured unless marked. The mission re-records them through the design below; nothing here is QA evidence yet.

### Coverage today (Q1)

| Brief item | Proven by | Real gap |
|---|---|---|
| Internal links | `e2e/learn-map.spec.ts:118-149` crawl, every `a[href]` 200, same-page fragments `:137`; `learn-labs.spec.ts:110` downloads | Cross-page fragments: `:137` runs only when `pathname === path` (22 such links; static read: 0 broken) |
| External links | nothing: skipped `learn-map.spec.ts:136` | All: 13 hand-written + 402 dataset DOIs on `/learn/data/` |
| Prerequisite links | text only: `learn-map.spec.ts:35` (map, track) | `href` never asserted, module pages never checked (static read: 0 wrong; one renderer, `module-html.ts:234`) |
| Browser block = result | `learn-browser.spec.ts:273-301` every `block` slot vs snapshot; snapshots = 004 via `learn:port --check`; lab results `learn-labs.spec.ts:85-108` | None |
| Exercises accept/reject | `learn-browser.spec.ts:418-459`, `:506-527`; `:438` throws on a missing wrong answer. All 12 browser checks (8 exercises, 4 skips) | None. The other 28 (19 PostGIS, 5 Python, 4 Power BI) have no checker, only Show answer (`module-html.ts:219`): nothing to accept or reject |
| Prose numbers | nothing, bar c1's feed summary `learn-labs.spec.ts:237` | All (below) |
| Diagram alt + `<title>` | `learn-map.spec.ts:129-132` every crawled page; `diagrams.ts:43-46` light and dark at build; `schema.spec.ts:160-172` alt = title, dark swap | None. Alt quality is a read item |
| No scroll, 2 widths, 2 themes | `learn-screens.spec.ts:33-55` 12 of 47 pages; `learn-data.spec.ts:260` 2 widths, no scheme | 34 pages; result regions empty but f3's one block (finding 1) |
| axe | nothing; not a dependency | All |

### Findings (ranked)

1. **Bug: d1 overflows at 375 px.** `site/learn/src/learn.css:22`: `.result-error` has no `overflow-wrap`; `d1-ex-same-url`'s error holds an unbroken URL, so after Run `scrollWidth` is 734 in both themes. Breaks the brief's "no horizontal scroll". Fix: `overflow-wrap: anywhere`. Proven by applying it in the page.
2. **Bug: axe's one failing rule.** `scrollable-region-focusable` (serious, WCAG 2.1.1): 1,248 nodes over 188 views, 38 pages, keyboard users can't scroll them. Shapes: `pre.code` 666, `pre.recorded` 438, `.table-wrap` 118, `figure.diagram` 24, bare `pre` 2. Emitters: `module-html.ts:117,124,140`, `diagrams.ts:77`, `schema-html.ts:36`, `results.ts:46` (runtime), `site/learn/data/index.html:54`, 14 hand-written in pages (setup 6, e5 3, d1 2, e3, p1, p2). Fix under Target §2. No other rule fails: 0 contrast violations in either theme. `incomplete` (axe can't decide: contrast, 2,430 nodes at 375 and 225 at 1280, per theme) isn't a failure; record the count and read a sample.
3. **Gap (fail fast): layout proof is a sample in an idle state.** `learn-screens.spec.ts:14-31`, why 1 shipped. Fix: Target §1.
4. **Gap: `.ipynb` never run.** `scripts/learn/check.ts:229`, `freshness.ts:108`. E2E proves its code cells equal the `.py`'s (`learn-labs.spec.ts:131`), not that a kernel runs them. The brief says run every lab file, so it's in scope. Fix: one-off (Target §3).
5. **Gap: `.venv-learn` is a superset of what a learner installs.** It also holds the ingest pins (`package.json` `learn:venv`), so learn:check can't see a lab needing `rasterio`. No live defect: `.py` imports are stdlib + numpy, scikit-learn, geopandas, sqlalchemy, pyogrio, shapely, libpysal, scipy, esda, psycopg, all pinned. Same one-off closes it.
6. **Gap: cross-page fragments and prerequisite `href`s** (Q1 table). No live defect. Fix: Target §1.
7. **Gap: GBIF paging untested.** `scripts/ingest/gbif.ts:107` `fetchDatasets` isn't exported or tested; `gbif.test.ts` covers one page (`toDatasetPage`). No bug by reading. Fix: Target §6.
8. **Real step gap (seed for R1).** `site/learn/pages/setup.html:89` says run cells "in VS Code or Jupyter", but no step installs Jupyter and `requirements.txt` has none; `assemble.ts:190` repeats it. Small prose fix.

Fine, no work: browser blocks, exercises, diagrams; `.sql`/`.py` chain (served = assembled `learn-labs.spec.ts:49-53`; 25 + 11 run on fresh loads `check.ts:438`, baseline log; `checked.json` binds them `freshness.ts:108`); setup's extensions (`postgis`, `postgis_raster`, `setup.html:28,38`; no other `CREATE EXTENSION` in blocks), role (`setup.ts:2-3` = page's Privileges, `check.ts:263` refuses more); slugs (§6); copy rule (no mission names in pages, grep).

### Target design

**§1 Walk (Q2): extend, no harness.**
- `e2e/learn-walk.spec.ts` (≈ 60 lines): one `test()` per page (47), plus Schema dialog on f1 and Lab schema dialog on d3. Reuses `learnContext`, `waitReady`, `runBlock`. `helpers.ts` gains `learnPageUrls(c)` (moved from `learn-map.spec.ts:147`) and `WIDTHS`/`SCHEMES` (moved from `learn-screens.spec.ts:9-10`).
- Each test: load; `waitReady` if the page has a textarea; run every `.block.editor`; fill each `.block.exercise` from its own `details code` and Check; on the playground one fixed wide query; open every `<details>`. Then for each width × scheme: `expect.soft` `scrollWidth ≤ width` and `expect.soft` axe violations `[]`. Also `offOrigin` empty, no `pageerror`. Results aren't re-asserted (proven at `learn-browser.spec.ts:273`).
- Axe: `axe-core` exact pin, e2e only, like `ajv`; no build scripts. `page.evaluate(axe.source)`, then `axe.run()`, default rules. Add to AGENTS.md's Stack line.
- `test.use({ trace: "off", screenshot: "only-on-failure" })`: `playwright.config.ts:26`'s `trace: "on"` is the 808 MB. No full-page screenshots (`learn-screens` keeps its 12).
- Output: each test pushes `{page, views, blocks, incomplete}` to `info.annotations`; `results.json` carries it and survives worker restarts. 006's tables come from there.
- Runtime: 134–140 s bare (47 pages, 72 blocks, 196 axe runs: load 44 s, blocks 11 s, axe 65 s). Estimate ≈ 3 min under Playwright, `pnpm e2e` ≈ 10 min. Target state probed with fixes 1 and 2 applied: 196 views, 0 violations, 0 overflow.
- Deterministic: DOM after blocks with snapshot-fixed results, pinned axe, fixed viewport, photos routed. `incomplete` and external links aren't asserted.
- `learn-map.spec.ts`: `:137` collects cross-page fragments, then visits each target (including `/#files`) and asserts the id; `:35` asserts the `href`; `:89` also asserts each module page's `.prereqs a` hrefs equal `m.prereqs.map(moduleUrl)` in order.
- `e2e/qa-fixes.ts`: `QA_FIXES: { q, url, has, not?, from?: { file, values[] } }[]`, one row per prose fix: page has `has`, lacks `not`, and the recorded result `file` holds each of `values`. Run by the walk spec on dist and by `release/live.spec.ts` live.

**§2 Fix 2, one place.** `focusableScrollers(main)` in `renderPage` (`pages.ts:73`) adds `tabindex="0"` to `<pre`, `class="table-wrap"`, `class="diagram"` in the page's `main`; block code is escaped, so `<pre` can't come from a block. Plus `results.ts:46` and `site/learn/data/index.html:54` by hand (neither goes through `renderPage`). Not in learn:check's closure: no lab key moves. `schema.spec.ts:113`'s keyboard test uses `.focus()`, unaffected.

**§3 Labs (Q3): one-off, recorded in 006, no gate.** In an empty folder under the mission's state, the setup page's Linux commands verbatim bar `uv python install` (`UV_PYTHON_DOWNLOADS=never`, system 3.12): `uv venv`, `uv pip sync --no-build requirements.txt`, the import check; then `uv pip install --constraint requirements.txt ipykernel nbclient`. For each `dist/learn/labs/*.ipynb`: fresh loader as `critwire_lab`, copy into an empty folder, `jupyter-execute --timeout=600`, leak query. Commands as a fence in 006. Probed: 11/11 exit 0, 1–6 s each, nothing left, `rasterio` absent. Delete the venv after. The `.sql`/`.py` result comes from the final learn:check log. 006's setup table: claim | evidence, covering packages, the "44 pins" (`setup.html:87`), uv 0.13.5, pyproj 3.8.0 Intel note, extensions, privileges, ipykernel. Hand-only by nature: Docker, EDB, Windows (the page already says so). External links, same session: `curl` ≤ 2 req/s, 13 + 402 DOIs ≈ 3.5 min; a dead link is a fix or listed issue, never a gate.

**§4 Reading (Q4): one reader, fresh sessions, a ledger.** In curriculum order (every prereq precedes its module). No fan-out. Sizes include blocks and results:

| Unit | Pages | KB |
|---|---|---|
| R1 | map, setup, track pages, playground, schemas, data, f1–f4 | 90 |
| R2 | d1–d6 | 167 |
| R3 | g1–g7 | 130 |
| R4 | s1–s6 | 115 |
| R5 | e1–e5 | 132 |
| R6 | p1–p4, c1 | 74 |
| R7 | cross-module pass | ledger |

Each of R1–R6: read as a GIS specialist and game developer new to the topic; run `qa-read` (below) per page; add page rows, issues and ledger rows to 006; apply T0 fixes; commit. The ledger is what makes it one reader: **terms** (term, defined at, used undefined at) and **claims** (sample cap, versions, licences, what a table holds, rules). R1–R6 read the ledger first. R7 reads only the ledger plus sources it points to, and these 18 prose links to earlier modules outside the prereq closure (missing prereq, or a harmless aside?): g2→d3, g3→d3, g4→d3, g5→g4, g6→g5, g7→g5, s1→f4, s2→g5, s3→g5, e4→s1, e4→s2, e4→s5, p1→d5, p3→s6, p4→e4, p4→s1, c1→d5, c1→e5. Forward links (28) are fine unless the text needs them.

**Prose numbers (Q2).** `qa-read <page>` (throwaway ≈ 40 lines, fence in 006): prints the page with each slot expanded to code + `checked/<id>.txt` or `e2e/__snapshots__/<id>.txt`, then every number token (comma, decimal or ≥ 3 digits, outside `code`/`pre`/`var`) absent from that page's results, with where else in the course it appears. Measured: 1,115 tokens, 734 present, 381 absent (versions, licences, outside facts, derived rates, other pages' results). Mechanical = triage; a human gives every verdict: the 381, small integers ("the three without a GBIF id"), rates, and whether a present number is the right one. Not a gate.

**§5 006's format.** Header: commit walked, reproduce commands. Sections: **Pages** (47: page, URL, views, axe, overflow, blocks, read unit, issues); **Links**; **Axe** (rules, before/after, `incomplete`); **Labs** (47 files: kind, how run, result); **Setup vs downloads**; **Astra leftovers**; **Issues** (`Q<n>`, page, kind, tier, what, state: `fixed <sha>` + catching assertion, or `queued`, or `listed` + recommendation); **Ledger**; **Method** (fences). Fix commits start `Q<n>:`; the last step fills SHAs from `git log --grep`, again if a rebase moves them.

**§6 Goal 4 (Q5).**
- Slugs: covered; record it, no test. `SLUG` + not-all-digits `scripts/species.ts:132`, via `deriveCore` `derive/pipeline.ts:115`, reached by `readBuildInputs` `inputs.ts:63` before any write (`inputs.ts` itself only calls it), and `load.ts:13`. Tests: V2 `species.test.ts:75-80` (`../x`, `a/b`, empty, `123`). Second guard: `childFile` `build/paths.ts:8` at `build.ts:54-55`, tested `paths.test.ts:11`.
- GBIF: the test is needed. Export `fetchDatasets`; extend `scripts/ingest/gbif.test.ts`, failure modes listed in its header before the code (owner's brief asks a test on existing code; AGENTS.md's isolated-test rule applies; E2E can't reach GBIF). `mock.method(globalThis, "fetch", …)` by `facetOffset`. Modes: (a) a page of 300 taken as the end, datasets lost: 305 datasets asks offsets 0, 300, 600, keeps 305, stores offset 0's URL; (b) exactly 300 stops after the empty page at 300; (c) a short page ending paging early; (d) overlapping pages: "repeated across pages"; (e) total moves on page 2: "index moved"; (f) facet counts short of `count`: "sum to". Pacing 500 ms (`http.ts:10`), ≤ 1.5 s a case.

**§7 What binds a fix (Q6).**

| Tier | Touches | Loop | Treatment |
|---|---|---|---|
| T0 | `modules/`, `pages/`, `curriculum.json`, `learn.css`, `site/learn/src/`, `scripts/build/learn/` bar `sql.ts`, `e2e/` | `pnpm build` (7 s) + named spec | Fix in the session that finds it |
| T1 | browser block text, result unchanged | 004 fence + file in one commit; `learn:port --check <page>`; build; `learn-browser` (≈ 3.5 min) | Fix in the session |
| T2 | PostGIS/Python block text, result unchanged; `scripts/learn-check.ts`'s closure (27 files, `freshness.ts`); `requirements.txt`, `canary.sql` | 004 + file; `pnpm build --draft && pnpm learn:check && pnpm build` (≈ 10 min) | Queue in 006; one step applies all |
| List | any result change, a boot block, `pg-session`, `py-connect`, star blocks' output, data, loader, `/v1`, what a module teaches | none | 006 + recommendation |

- Keys cover block texts, lab data and the checker (`freshness.ts:1-14`), not page HTML, so T0 leaves plain `pnpm build` valid.
- `--update` isn't used: under "fix small" a result can't change, and plain whole `learn:check` both refuses a changed result and rewrites `checked.json`. Result sha is over output (`result.ts:28,41`), so a comment edit keeps results. `--update` only with a Decision saying why; then its cascade (004, `checked/`, snapshots, prose) in one commit.
- `learn:port --check all` sees blocks and results only. 004 also holds module prose (`plans/004-learn-curriculum.md:7042,7195`): a prose fix greps 004 and changes the same sentence in the same commit. A prereq fix also edits 004's `**Prereqs:**`.
- Every fix's assertion: prose → `QA_FIXES` row; link → crawl; alt → `learn-map.spec.ts:129`; layout, axe → walk; exercise → `WRONG` row `learn-browser.spec.ts:320`; code → test named there.
- `checked/` comes from whole runs only; `--module` to iterate.

**§8 Release (Q7).** `e2e/release/live.spec.ts:36-47` already proves every dist file, so every `/learn/` page, is 200 with dist's bytes, including CSS and app. Missing only: one test running `QA_FIXES` (`has`/`not`) against the origin, for "fixed pages show the fix". No walk or axe live: same bytes, same result. Release artifact folder replaces the intermediate one.

**§9 Units and heavy-run budget.** For the planner; 12 of 25 steps, spare room for review fixes or splitting a read.

| Unit | Work | Heavy runs |
|---|---|---|
| U1 | Walk, axe dep, `learn-map` tightening, `qa-fixes.ts`, live test, fixes 1 and 2, 006 skeleton (one unit: the walk can't pass without the fixes) | build; `learn-walk learn-map learn-labs schema` |
| U2 | §3 one-offs; 006 tables | none |
| U3 | §6; 006 | one test file |
| U4–U9 | R1–R6 with T0/T1 fixes | named specs |
| U10 | R7 | named specs |
| U11 | Lab batch, if queued; else check off | one learn:check, full e2e |
| U12 | SHAs, 006 complete, drop leftovers | none |

Full `pnpm e2e`: at most U11 + final, plus release's re-verify. Whole `learn:check`: U11 + 2 final + release's. `test:db`: not in the DoD; only if the branch touches a `*.dbtest.ts`-covered file (none expected). Scoped runs use `E2E_ARTIFACTS=/tmp/critwire-qa-e2e`, removed at session end; `e2e-baseline/` goes when the first folder after it is written.

### Rejected alternatives

- Prose-number gate: 381 false positives need an allowlist, and a hit doesn't prove the context.
- Permanent notebook gate: a third pin set (about 32 more packages) for cells E2E already proves equal to the `.py`'s.
- Labs-only `.venv-learn`: it serves `test:db` and the ingests; the throwaway venv proves the same.
- External links in E2E: not deterministic, and 402 DOIs at ≤ 2 req/s.
- `@axe-core/playwright`: a package for three lines.
- Screenshots of all 188 views: hundreds of MB, and an image proves nothing a `scrollWidth` doesn't.
- Per-emitter `tabindex`: about 20 sites, and the next hand-written `pre` forgets. Client-side script: fails without JS, and the data page differs.
- Walk or axe against live: bytes already equal dist's.
- Parallel readers: no shared view, which is what contradictions need.
- 188 per-view tests: same checks, more overhead; `expect.soft` already reports every view.

## Architecture review (Fable)

Checked at `3afbfa3` by reading the cited files and computing the checker's import closure (`importClosure(CHECKER_ENTRY)` via tsx, no heavy jobs). Findings 1 and 2 are probe measurements I didn't re-run; both are consistent with the code (`learn.css:22` has `white-space: pre-wrap` and no `overflow-wrap`, so an unbroken URL overflows; no `tabindex` anywhere in the emitters).

Verified true:
- Coverage table: every "Proven by" line exists and asserts what the row says (`learn-map.spec.ts:118-149` crawl, `:137` same-page fragments only, `:136` skips off-origin; `:35` text-only prereqs; `learn-browser.spec.ts:273-301`, `:418-459`, `:438` throws on a missing `WRONG`; `learn-screens.spec.ts` 12 pages, `WIDTHS`/`SCHEMES` at `:9-10`; `learn-data.spec.ts:260` no scheme; `schema.spec.ts:160-172`; `diagrams.ts:43-46`; `learn-labs.spec.ts:237` feed summary). 47 `index.html` under `dist/learn/`.
- §2: `renderPage` (`pages.ts:65`, not `:73`; pure, used only by `writePages`, no test imports it) is outside the closure. Closure = 27 files; from `scripts/build/learn/` only `sql.ts`. The data page is built by `scripts/build/learn/page.ts` (`fillSlots`), not `renderPage`, so its hand edit is right. `schema.spec.ts:113` uses button clicks and `.focus()`, unaffected by `tabindex` on `pre`.
- §7: `freshness.ts:1-14,100-113` keys block texts (+`after` chain, boots, pg-session/py-connect), lab data shas, the closure, `canary.sql`, `requirements.txt`, and each `.sql`/`.py` download's sha (`:108`, `:133` "download … is stale"). Page HTML, `learn.css`, `curriculum.json`, `e2e/` enter nowhere: T0 leaves plain `pnpm build` valid. T1/T2/List as described.
- §6 slugs: `species.ts:132` (`SLUG` + not-all-digits) via `deriveCore`, reached by `readBuildInputs` (`inputs.ts:63`); tests `species.test.ts:75-80` include `../x`, `a/b`, `""`, `123`; `childFile` (`paths.ts:8`, `paths.test.ts:11`) guards `scripts/build.ts:54-55`. Recording it without a new test is correct. GBIF: `fetchDatasets` (`gbif.ts:107`) unexported, untested; modes (a)–(f) match its loop (`offset += FACET_LIMIT`, break on empty page, sum check); pacing `MIN_GAP_MS = 500` (`scripts/http.ts:10`).
- §8: `release/live.spec.ts:36-47` compares every dist file's bytes live; only the `QA_FIXES` live test is missing for "fixed pages show the fix".
- Budget: 12 units ≤ 25 steps; full `pnpm e2e` ≤ 3 runs, whole `learn:check` ≤ 4; walk has `trace: "off"`, scoped runs in `/tmp/*-e2e`: within the disk rule.

VERDICT: APPROVE
MUST-FIX: none
MISSED:
1. Finding 8's second site, `scripts/learn/assemble.ts:190`, is in the closure *and* changes every `.py`/`.ipynb` download's text, so its sha in `checked.json` moves: by §7 it is T2 (queue to U11), not the "small prose fix" the finding implies. Only the `setup.html:89` half is T0. Say so, or a session fixes it in place and plain `pnpm build` refuses until a whole `learn:check`.
SHOULD-CONSIDER:
1. Three citations name the wrong folder: `assemble.ts` is `scripts/learn/assemble.ts`, `build.ts:54-55` is `scripts/build.ts`, `http.ts:10` is `scripts/http.ts`; `renderPage` is `pages.ts:65`. Fix in the revision so the planner's steps point at real files.
2. `focusableScrollers`: match `<pre(?=[\s>])` and skip an element that already carries `tabindex`, so a future hand-written `<pre tabindex=…>` isn't doubled. Keep `renderPage` pure (it's documented so).
3. Walk spec: set `test.setTimeout` per page (the s/g pages boot the engine and run several blocks before 4 axe passes); `learn-browser` budgets 15 s a page.
4. U1 is the largest unit (spec, dep, `learn-map` tightening, `qa-fixes.ts`, live test, two fixes, 006 skeleton). If a session runs long, the live test and `qa-fixes.ts` can move to U2 without breaking "the walk can't pass without the fixes".
5. The data page also emits `<pre class="wrap">` (`page.ts:65`); the probe didn't flag it (it wraps), but the walk's axe pass on `/learn/data/` is what proves that, so keep that page in the walk.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-01 12:00 UTC: Baseline. typecheck pass, test 748/748, test:db 140/140, build pass, learn:check ok, e2e 98/98; dist = live. Next: Architecture.
- 2026-11-01 12:22 UTC: Architecture written by `architect`: d1 overflow at 375 px + axe `scrollable-region-focusable` found (probe, not yet fixed); walk spec, axe-core, one-off .ipynb run, reading units R1–R7. No checks run (plan only). Next: Fable review.
- 2026-11-01 12:32 UTC: Fable review by `architecture-reviewer`: APPROVE, 0 MUST-FIX, 1 MISSED (`assemble.ts:190` is T2, not T0), 5 SHOULD-CONSIDER. Plan only, no checks run. Next: Astra review.

## Summary
