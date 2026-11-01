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
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

Basis: code read at `def8b4c`, plus throwaway measurements on its `dist/` (scripts in `/tmp`, repo untouched; axe-core 4.14.0, Chromium headless, labs-only venv). Numbers below are measured unless marked. The mission re-records them through the design below; nothing here is QA evidence yet. Revised at `b3928b7`: §3's script and the keyboard test were probed the same way (under the lab lock on `critwire_dev`, `tabindex` injected in the page).

Paths: a bare `module-html.ts`, `pages.ts`, `page.ts`, `diagrams.ts`, `schema-html.ts` is under `scripts/build/learn/`; a bare `check.ts`, `cleanup.ts`, `python.ts`, `pg.ts`, `leaks.ts`, `freshness.ts`, `result.ts`, `setup.ts` under `scripts/learn/`; `results.ts`, `editor.ts`, `learn.css` under `site/learn/src/`.

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
8. **Real step gap (seed for R1).** `site/learn/pages/setup.html:89` says run cells "in VS Code or Jupyter" and covers VS Code (the editor offers `ipykernel`), but no step installs Jupyter and `requirements.txt` has none. Two sites, two tiers (§7):
   - `site/learn/pages/setup.html:89` is **T0**: R1 adds the install line.
   - `scripts/learn/assemble.ts:190` (the `.ipynb` "about" cell: "Open it in Jupyter or VS Code") is **T2**, queued for U11: `assemble.ts` is in the checker's closure (`learn-check.ts` → `check.ts:39`), so any edit moves every block key. No download sha moves (`freshness.ts:108` drops `.ipynb`), but all 11 notebook hashes do (§3). With the install line on the page the sentence reads true, so U11 edits it only if it's still wrong after R1; otherwise U11 records "no change" for it.

Fine, no work: browser blocks, exercises, diagrams; `.sql`/`.py` chain (served = assembled `learn-labs.spec.ts:49-53`; 25 + 11 run on fresh loads `check.ts:438`, baseline log; `checked.json` binds them `freshness.ts:108`); setup's extensions (`postgis`, `postgis_raster`, `setup.html:28,38`; no other `CREATE EXTENSION` in blocks), role (`setup.ts:2-3` = page's Privileges, `check.ts:263` refuses more); slugs (§6); copy rule (no mission names in pages, grep).

### Target design

**§1 Walk (Q2): extend, no harness.**
- `e2e/learn-walk.spec.ts` (≈ 60 lines): one `test()` per page (47), plus Schema dialog on f1 and Lab schema dialog on d3. Reuses `learnContext`, `waitReady`, `runBlock`. `helpers.ts` gains `learnPageUrls(c)` (moved from `learn-map.spec.ts:147`) and `WIDTHS`/`SCHEMES` (moved from `learn-screens.spec.ts:9-10`).
- `test.setTimeout(60_000)` per page: measured mean is 3 s, but a page can boot the engine, run several blocks and make 4 axe passes on a busy 2-CPU server (`learn-browser.spec.ts:271` budgets 15 s for blocks alone). The 47 include `/learn/data/` (`learn-map.spec.ts:147`'s list), so axe covers its `<pre class="wrap">` (`page.ts:65`) with no special case.
- Each test: load; `waitReady` if the page has a textarea; run every `.block.editor`; fill each `.block.exercise` from its own `details code` and Check; on the playground one fixed wide query; open every `<details>`. Then for each width × scheme: `expect.soft` `scrollWidth ≤ width` and `expect.soft` axe violations `[]`. Also `offOrigin` empty, no `pageerror`. Results aren't re-asserted (proven at `learn-browser.spec.ts:273`).
- Keyboard test (axe says a region can take focus, not that the keys work), one `test()`, ≈ 15 lines: d1 at 375 px, dark, its blocks run. For the first `pre.code:visible` and the first `.result .table-wrap` with `scrollWidth > clientWidth`: press Tab until it's focused (cap 200), assert `:focus-visible` and computed `outlineStyle` not `none`, press ArrowRight, assert `scrollLeft > 0`. Probed with `tabindex` injected: Tab reaches both, ring `auto` 1 px, scroll 40 px and 21 px; g3's diagram the same. `:visible` matters: f3's first overflowing `pre` is in a closed `<details>`, not focusable. Nothing traps Tab (`editor.ts:74` takes only Ctrl/Cmd+Enter) or removes the ring (`learn.css:87` is `h1[tabindex="-1"]` only).
- Axe: `axe-core` exact pin, e2e only, like `ajv`; no build scripts. `page.evaluate(axe.source)`, then `axe.run()`, default rules. Add to AGENTS.md's Stack line.
- `test.use({ trace: "off", screenshot: "only-on-failure" })`: `playwright.config.ts:26`'s `trace: "on"` is the 808 MB. No full-page screenshots (`learn-screens` keeps its 12).
- Output: each test pushes `{page, views, blocks, incomplete}` to `info.annotations`; `results.json` carries it and survives worker restarts. 006's tables come from there.
- Runtime: 134–140 s bare (47 pages, 72 blocks, 196 axe runs: load 44 s, blocks 11 s, axe 65 s). Estimate ≈ 3 min under Playwright, `pnpm e2e` ≈ 10 min. Target state probed with fixes 1 and 2 applied: 196 views, 0 violations, 0 overflow.
- Deterministic: DOM after blocks with snapshot-fixed results, pinned axe, fixed viewport, photos routed. `incomplete` and external links aren't asserted.
- `learn-map.spec.ts`: `:137` collects cross-page fragments, then visits each target (including `/#files`) and asserts the id; `:35` asserts the `href`; `:89` also asserts each module page's `.prereqs a` hrefs equal `m.prereqs.map(moduleUrl)` in order.
- `e2e/qa-fixes.ts`: `QA_FIXES: { q, url, has, not?, from?: { file, values[] } }[]`, one row per prose fix: page has `has`, lacks `not`, and the recorded result `file` holds each of `values`. Run by the walk spec on dist and by `release/live.spec.ts` live.

**§2 Fix 2, one place.** `focusableScrollers(main)`, pure like its caller `renderPage` (`pages.ts:66`), adds `tabindex="0"` to `<pre(?=[\s>])`, `class="table-wrap"`, `class="diagram"` in the page's `main`, skipping an element that already has a `tabindex`; block code is escaped, so `<pre` can't come from a block. Plus `results.ts:46` and `site/learn/data/index.html:54` by hand (neither goes through `renderPage`). Not in learn:check's closure: no lab key moves. `schema.spec.ts:113`'s keyboard test uses `.focus()`, unaffected.

**§3 Labs (Q3): one-off under the lab protocol, recorded in 006, no gate.**

*Venv.* In a `mktemp -d`, the setup page's Linux commands bar two: `requirements.txt` copied from `dist/learn/labs/` instead of `curl`, and no `uv python install` (`UV_PYTHON_DOWNLOADS=never`, system 3.12). Then `uv pip install --constraint requirements.txt ipykernel nbclient`. Deleted after.

*Runner: a throwaway script, not a `learn:check` option.* `qa-notebooks.mts` below, in `/tmp`, its text copied into 006's Method. It changes no repo file, so it's below T0: no block key or download sha moves (`importClosure`, `freshness.ts:152`, follows `learn-check.ts`'s imports only), and it adds no state, so `docs/recovery.md` stands. U2 runs it. It imports the checker's exported functions and copies the lifecycle of `e2e/release/live.spec.ts:102-140`, the same one-file-on-a-fresh-load run, and of `check.ts:516-541`:

| Step | Reuses | Why it matters here |
|---|---|---|
| Target | `loadEnv` `scripts/env.ts:8`, `labTarget` `pg.ts:78` → `assertNotLive` `pg.ts:35` | `LEARN_PG_URL`, never `DATABASE_URL`; refuses `critwire` by name before connecting |
| What it reached | `assertConnectedNotLive` `check.ts:85`, `LAB_ROLE` `pg.ts:10`, one query | Refuses `critwire` by `current_database()`, another role, a superuser, all before the lock and the loader's DDL (order of `check.ts:516-519`). `assertLabRole` `check.ts:263` is private, and exporting it would be T2 |
| Lock | `takeLabLock` `cleanup.ts:39`, which runs `assertNoStragglers` `:99` | `critwire_dev` is shared across checkouts and the loader drops `learn_curriculum`: refused while a `learn:check` or `test:db` holds it, or an earlier run's Python session lives |
| Session names | `pythonApp` `python.ts:24`, `pythonEnv` `python.ts:36` (`PGAPPNAME`) | The kernel inherits the run's name, so cleanup can end its sessions and a later run's `assertNoStragglers` can name them. A name of our own would hide them from both |
| Process | `runPython` `python.ts:68` with `python` = the throwaway venv, `pythonFailure` `python.ts:132` | Group kill, wall-clock timeout, empty cwd and HOME. Its driver is 2 lines of `nbclient`, not `jupyter-execute` through a spawn of our own |
| Fresh load | `psqlArgs` `pg.ts:100`, `childEnv` `pg.ts:89`, `LOADER` `freshness.ts:31` | As `live.spec.ts:121`, plus the abort signal, `SIGINT` as `check.ts:121` |
| Leak check | `learnObjects` `leaks.ts:10` minus `lock.known` | As `check.ts:484-487` |
| Signals | `AbortController` as `learn-check.ts:37-38`, passed to `runPython` and `execFile` | `runPython`'s child is `detached` (`python.ts:78`): without the handler a SIGTERM kills node and leaves the notebook running |
| Any exit | `lock.release()` `cleanup.ts:55` in `finally` | Ends the run's sessions, sweeps what the lab role made, frees the lock |

The one override is `PATH`: `pythonEnv` puts `.venv-learn` first (`python.ts:38`), which would bring back finding 5's superset. Stops at the first failure, as `downloadsStage` `check.ts:438` does. The kernel leaves `runPython`'s group (`jupyter_client/launcher.py:151`, `start_new_session`), so the group kill misses it. It exits by itself when its parent dies (`ipykernel/parentpoller.py:58-61`), and `release()` ends any session it still holds.

Probed as written, with a cell holding a read lock on `learn_curriculum.occurrences` where it applies:

| Case | Result |
|---|---|
| 11 notebooks | all exit 0, 1–6 s each plus a 4 s load, 87 s in all; nothing left |
| Kernel | runs the throwaway venv's Python, `rasterio` absent, `python` on `PATH` is that venv's |
| Cell raises | exit 1 with the traceback's tail; 0 sessions, 0 kernels |
| Timeout (8 s) | fails naming it; 0 sessions, 0 kernels; the next run passes |
| SIGTERM during a cell, during the load | exit 1; 0 sessions, 0 kernels |
| Another run holds the lock | refused: "the lab lock (critwire.learn) is held by another learn:check or pnpm test:db" |
| `LEARN_PG_URL` → `critwire` | refused by name, before connecting |

*Evidence is bound to hashes.* The script prints each file's sha256; 006's Labs rows hold them, with `requirements.txt`'s. U11 and the final Verification compare those with the final `dist/learn/labs/`. If any differs, rerun the whole fence (≈ 1.5 min) and update the rows.

```sh
# From the repo root, after pnpm build; the script saved as /tmp/critwire-qa/qa-notebooks.mts
V=$(mktemp -d); cp dist/learn/labs/requirements.txt "$V"
(cd "$V" && export UV_PYTHON_DOWNLOADS=never && uv venv --python 3.12 && uv pip sync --no-build requirements.txt \
  && .venv/bin/python -c "import geopandas, esda; print(geopandas.__version__, esda.__version__)" \
  && uv pip install --constraint requirements.txt ipykernel nbclient)
pnpm exec tsx /tmp/critwire-qa/qa-notebooks.mts "$V/.venv"; rm -rf "$V"
```

```ts
// Runs every dist/learn/labs/*.ipynb in a learner's venv under learn:check's protocol. From the repo root:
//   pnpm exec tsx <this file> <venv>
// .mts: outside the package, top-level await needs ESM. Imports at run time, so it reads the repo as it stands.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const from = (p: string) => import(pathToFileURL(resolve(p)).href);
const { loadEnv } = await from("scripts/env.ts");
const { childEnv, labTarget, LAB_ROLE, pgConnect, psqlArgs } = await from("scripts/learn/pg.ts");
const { assertConnectedNotLive } = await from("scripts/learn/check.ts");
const { takeLabLock } = await from("scripts/learn/cleanup.ts");
const { LOADER } = await from("scripts/learn/freshness.ts");
const { learnObjects } = await from("scripts/learn/leaks.ts");
const { pythonApp, pythonEnv, pythonFailure, runPython } = await from("scripts/learn/python.ts");

const venv = resolve(process.argv[2]!);
const TIMEOUT_S = 600;
const stop = new AbortController();
for (const s of ["SIGINT", "SIGTERM"] as const) process.once(s, () => stop.abort(new Error(`interrupted by ${s}`)));
loadEnv();
const lab = labTarget(process.env);
const sql = pgConnect(lab);
const [who] = await sql`select current_database() as db, current_user as "user", rolsuper as superuser from pg_roles where rolname = current_user`;
assertConnectedNotLive(who.db);
if (who.user !== LAB_ROLE || who.superuser) throw new Error(`${who.user}: run as ${LAB_ROLE}, no superuser`);
const app = pythonApp();
const lock = await takeLabLock(lab, who.db, { app });
const tmp = await mkdtemp(join(tmpdir(), "critwire-qa-nb-"));
try {
  const mplConfig = join(tmp, "mpl");
  await mkdir(mplConfig);
  const env = { ...pythonEnv(lab, { learnBase: pathToFileURL(resolve("dist")).href, app, mplConfig }), PATH: `${venv}/bin:/usr/bin:/bin` };
  const labs = resolve("dist/learn/labs");
  for (const name of (await readdir(labs)).filter((f) => f.endsWith(".ipynb")).sort()) {
    const file = join(labs, name);
    await promisify(execFile)("psql", ["-q", ...psqlArgs(resolve("dist/learn/data", LOADER))], { env: childEnv(lab), maxBuffer: 64 << 20, signal: stop.signal, killSignal: "SIGINT" });
    const driver = `import nbclient, nbformat\nnbclient.NotebookClient(nbformat.read(${JSON.stringify(file)}, as_version=4), kernel_name="python3").execute()\n`;
    const started = Date.now();
    const r = await runPython(driver, { python: `${venv}/bin/python`, env, timeoutMs: TIMEOUT_S * 1000, signal: stop.signal });
    const failed = pythonFailure(r, TIMEOUT_S);
    if (failed) throw new Error(`${name}: ${failed}`);
    const left = (await learnObjects(sql)).filter((o: string) => !lock.known.has(o));
    if (left.length) throw new Error(`${name} left behind: ${left.join(", ")}`);
    console.log(`${name} ${createHash("sha256").update(await readFile(file)).digest("hex")} exit 0, ${((Date.now() - started) / 1000).toFixed(1)} s, nothing left`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
  await sql.end();
  await lock.release();
}
```

*The rest of §3.* The `.sql`/`.py` result comes from the final learn:check log. 006's setup table: claim | evidence, covering packages, the "44 pins" (`setup.html:87`), uv 0.13.5, pyproj 3.8.0 Intel note, extensions, privileges, ipykernel. Hand-only by nature: Docker, EDB, Windows (the page already says so). External links, same session: `curl` ≤ 2 req/s, 13 + 402 DOIs ≈ 3.5 min; a dead link is a fix or listed issue, never a gate.

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
- Slugs: covered; record it, no test. `SLUG` + not-all-digits `scripts/species.ts:132`, via `deriveCore` `scripts/derive/pipeline.ts:115`, reached by `readBuildInputs` `scripts/build/inputs.ts:63` before any write (`inputs.ts` itself only calls it), and `scripts/load.ts:13`. Tests: V2 `scripts/species.test.ts:75-80` (`../x`, `a/b`, empty, `123`). Second guard: `childFile` `scripts/build/paths.ts:8` at `scripts/build.ts:54-55`, tested `scripts/build/paths.test.ts:11`.
- GBIF: the test is needed. Export `fetchDatasets`; extend `scripts/ingest/gbif.test.ts`, failure modes listed in its header before the code (owner's brief asks a test on existing code; AGENTS.md's isolated-test rule applies; E2E can't reach GBIF). `mock.method(globalThis, "fetch", …)` by `facetOffset`. Modes: (a) a page of 300 taken as the end, datasets lost: 305 datasets asks offsets 0, 300, 600, keeps 305, stores offset 0's URL; (b) exactly 300 stops after the empty page at 300; (c) a short page ending paging early; (d) overlapping pages: "repeated across pages"; (e) total moves on page 2: "index moved"; (f) facet counts short of `count`: "sum to". Pacing 500 ms (`scripts/http.ts:10`), ≤ 1.5 s a case.

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
- Throwaway scripts (`qa-notebooks.mts`, `qa-read`) sit below T0: their text lives in 006, which enters no key. A T2 change can move `.ipynb` hashes; then §3's evidence rule applies.

**§8 Release (Q7).** `e2e/release/live.spec.ts:36-47` already proves every dist file, so every `/learn/` page, is 200 with dist's bytes, including CSS and app. Missing only: one test running `QA_FIXES` (`has`/`not`) against the origin, for "fixed pages show the fix". No walk or axe live: same bytes, same result.

Evidence: the release smoke doesn't replace the walk's coverage, so the final Verification's folder (`e2e-final/` in the mission's state) stays with the release. It already holds the walk's HTML report and `results.json`, and `learn-screens`' 12 pages at 2 widths and 2 themes, so no new code. 006 names the path. Disk rule (two folders): release's re-verify overwrites `e2e-final/` rather than adding a third, and the release smoke's folder takes the intermediate slot.

**§9 Units and heavy-run budget.** For the planner; 13 of 25 steps, spare room for review fixes or splitting a read.

| Unit | Work | Heavy runs |
|---|---|---|
| U1a | Walk with keyboard test, axe dep, fixes 1 and 2, 006 skeleton (one unit: the walk can't pass without the fixes) | build; `learn-walk learn-labs schema` |
| U1b | `learn-map` tightening, `qa-fixes.ts`, live test | build; `learn-walk learn-map` |
| U2 | §3 one-offs: notebooks under the lab lock, link `curl`; 006 tables | notebook script (≈ 1.5 min) |
| U3 | §6; 006 | one test file |
| U4–U9 | R1–R6 with T0/T1 fixes | named specs |
| U10 | R7 | named specs |
| U11 | Lab batch, if queued (`scripts/learn/assemble.ts:190` only if R1 left it wrong); then §3's hash check; else check off | one learn:check, full e2e; notebook script if a hash moved |
| U12 | SHAs, 006 complete, drop leftovers | none |

Full `pnpm e2e`: at most U11 + final, plus release's re-verify. Whole `learn:check`: U11 + 2 final + release's. Notebook script: U2, plus a rerun only if §3's hash check fails. `test:db`: not in the DoD; only if the branch touches a `*.dbtest.ts`-covered file (none expected). Scoped runs use `E2E_ARTIFACTS=/tmp/critwire-qa-e2e`, removed at session end; `e2e-baseline/` goes when the first folder after it is written.

### Rejected alternatives

- Prose-number gate: 381 false positives need an allowlist, and a hit doesn't prove the context.
- Permanent notebook gate: a third pin set (about 32 more packages) for cells E2E already proves equal to the `.py`'s.
- `learn:check --notebooks`: edits `check.ts`, so T2, moving every key for a one-off, and it still needs that pin set.
- Committed runner outside the closure: a third permanent copy of the protocol, after `check.ts` and `live.spec.ts`, run once or twice.
- Shared `withLabRun()` for `check.ts` and `live.spec.ts`: T2 churn on two working callers, out of a QA mission's scope.
- `jupyter-execute` through a spawn of our own: loses `runPython`'s group kill, timeout, empty HOME.
- Running on after a failed notebook, or rerunning only changed ones: more branches to save seconds; `downloadsStage` stops too and the whole run is 1.5 min.
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

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. §3’s notebook runner must use the existing lab lock, guarded database targeting, and cleanup on failure/timeout. The loader drops and recreates `learn_curriculum`; running outside the shared protocol can disrupt another checkout’s lab run or leave sessions blocking later checks. Reuse the lifecycle established in `scripts/learn/cleanup.ts` and the release smoke.

SHOULD-CONSIDER:

1. Preserve the final walk’s HTML/JSON reports and selected screenshots alongside release evidence; release smoke cannot replace coverage evidence for all pages.
2. Bind notebook evidence to final artifact hashes. U2 precedes possible U11 lab changes; rerun affected notebooks when those hashes change.
3. Verify keyboard scrolling and visible focus directly on representative static and runtime regions; passing axe alone does not prove usability.

## Revision notes

- Astra MUST-FIX 1 (notebook runner outside the protocol): fixed. §3 is now a throwaway script using `labTarget`, `assertConnectedNotLive`, `takeLabLock`, `pythonApp`, `pythonEnv`, `runPython`, `pythonFailure`, `learnObjects` and `lock.release()`, no repo file changed, below T0, in U2. Probed on success, cell failure, timeout, SIGTERM, held lock and `critwire`.
- Fable MISSED 1, with the Decisions correction: fixed. Finding 8 says `setup.html:89` is T0, `scripts/learn/assemble.ts:190` is T2, queued for U11; U11 edits it only if R1's install line leaves the sentence wrong.
- Fable SC1 (citations): accepted, verified, fixed. `scripts/learn/assemble.ts:190`, `scripts/build.ts:54-55`, `scripts/http.ts:10` are right. `renderPage` is `pages.ts:66`; Fable's `:65` is its doc comment. Added a paths key and full paths in §6.
- Fable SC2 (`<pre(?=[\s>])`, skip existing `tabindex`, stay pure): accepted, §2.
- Fable SC3 (per-page timeout): accepted, §1, 60 s.
- Fable SC4 (U1 too big): accepted, split into U1a and U1b. U2–U12 keep their numbers, since Decisions and finding 8 cite U11.
- Fable SC5 (data page's `<pre class="wrap">`): accepted, no work; the page is one of the 47, noted in §1.
- Astra SC1 (keep the walk's reports and screenshots): accepted, no new code. The final Verification's folder already holds them; §8 says how it stays within the two-folder disk rule.
- Astra SC2 (bind notebook evidence to hashes): accepted, §3. Rerun the whole fence on any difference; selecting notebooks saves seconds.
- Astra SC3 (keyboard and visible focus): accepted, one test in the walk spec, §1, probed on d1. The existing keyboard test (`schema.spec.ts:113`) covers dialogs, not scrolling.

## Steps

Rules for every step. A session reads these, its item, the Architecture sections the item names, and `plans/006-learn-qa.md` once it exists.

- **Where:** everything runs from `/srv/critter-ai/worktrees/critwire-learn-qa`. `S=/srv/critter-ai/agent-state/missions/critwire-learn-qa`. Heavy jobs one at a time.
- **Scoped E2E:** `pnpm build && E2E_ARTIFACTS=/tmp/critwire-qa-e2e pnpm exec playwright test <files>`, with `<files>` as the item lists them. `rm -rf /tmp/critwire-qa-e2e` before the session ends. No intermediate folder under `$S`: `e2e-baseline/` stays until the final Verification writes `e2e-final/`.
- **Minimum check:** `pnpm typecheck` in every session. There's no lint script.
- **Tiers (§7, binding):** fix T0 and T1 in the session that finds them. Write T2 in 006 as `queued`, for U11. Write as `listed`, with a recommendation: a result change, a boot block, `pg-session`, `py-connect`, star output, data, the loader, `/v1`, or what a module teaches. `pnpm learn:check --update` doesn't run without a Decision saying why.
- **Each fix:** its own commit, subject starting `Q<n>:` (next free number in 006's Issues), holding the fix, its 006 row and the assertion §7 names:
  - prose, or an external URL: a `QA_FIXES` row in `e2e/qa-fixes.ts`
  - internal link: the crawl in `e2e/learn-map.spec.ts`
  - alt text: `e2e/learn-map.spec.ts:129`
  - layout, axe: `e2e/learn-walk.spec.ts`
  - exercise: a `WRONG` row, `e2e/learn-browser.spec.ts:320`
  - code: the test named in the row

  See the assertion fail on the unfixed build first. A prose fix also changes the same sentence in `plans/004-learn-curriculum.md` (`grep` it), same commit. A prereq fix also edits 004's `**Prereqs:**`. A T1 fix changes 004's fence and the block file in one commit, then `pnpm learn:port --check <page>`. SHA cells wait for U12.
- **Copy:** AGENTS.md's Data rules and Learn rules (own words, records never range, no mission names on public pages, planned modules unlinked).
- **Too big:** a fix beyond about one step gets listed. A reading unit that won't fit one session is split per the session rules, 25 steps at most.

**Reading protocol (U4–U9, §4).**
1. Recreate `/tmp/critwire-qa/qa-read.mts` from 006's Method fence (U4 writes it first). Read 006's ledger.
2. For each page, in curriculum order: run `pnpm exec tsx /tmp/critwire-qa/qa-read.mts <page>` and read its output as a GIS specialist and game developer new to the topic, reading fast. Flag undefined jargon, steps that skip a needed action, and contradictions with the ledger. Give a verdict on every number it flags, on small integers and rates, and on whether a number it found is the right one. It's triage, not a gate.
3. Add to 006: the page row's read unit and issues, Issues rows, and ledger rows (**terms**: term, defined at, used undefined at; **claims**: sample cap, versions, licences, what a table holds, rules).
4. Apply T0 and T1 fixes; queue or list the rest.
5. Checks: `pnpm typecheck`. With any fix, scoped `e2e/learn-walk e2e/learn-map`, plus `e2e/learn-browser` for a T1 fix or a `WRONG` row. A session with no fix needs only typecheck.

- [x] U1a. **Walk spec, axe, fixes 1 and 2, 006 skeleton** (§1, §2, §5; findings 1, 2). T0; no lab loop.
  - Files: `package.json`, `pnpm-lock.yaml`, `AGENTS.md` (Stack line), `e2e/helpers.ts`, `e2e/learn-map.spec.ts`, `e2e/learn-screens.spec.ts`, new `e2e/learn-walk.spec.ts`, `site/learn/src/learn.css`, `site/learn/src/results.ts`, `scripts/build/learn/pages.ts`, `site/learn/data/index.html`, new `plans/006-learn-qa.md`.
  - Do:
    1. `pnpm add -D -E axe-core@4.14.0` (no build script, so no `allowBuilds` entry).
    2. Move `learnPageUrls(c)` (from `learn-map.spec.ts:147`) and `WIDTHS`/`SCHEMES` (from `learn-screens.spec.ts:9-10`) into `e2e/helpers.ts`.
    3. Write `e2e/learn-walk.spec.ts` as §1: titles `walk <url>`, 47 pages, Schema dialog on f1, Lab schema dialog on d3, and the keyboard test. One `test()` per page needs the list at collection, so read `site/learn/curriculum.json` synchronously.
    4. See it fail: `pnpm build && E2E_ARTIFACTS=/tmp/critwire-qa-e2e pnpm exec playwright test e2e/learn-walk -g /learn/database-architecture/keys/`. It must show d1's overflow at 375 px and `scrollable-region-focusable`.
    5. Commit `Q1:` `overflow-wrap: anywhere` on `.result-error` (`learn.css:22`).
    6. Commit `Q2:` `focusableScrollers(main)` in `pages.ts`, called from `renderPage`, plus `tabindex="0"` by hand at `results.ts:46` and `site/learn/data/index.html:54`.
    7. Commit the spec and the dependency.
    8. Create 006 with §5's sections: commit walked, reproduce commands, Q1 and Q2 rows. Fill Pages and Axe from `results.json`'s annotations. Axe before: 1,248 nodes, 188 views, 38 pages (finding 2). Read a sample of `incomplete` and record it.
  - Checks: `pnpm typecheck`; `pnpm test`; scoped `e2e/learn-walk e2e/learn-labs e2e/schema e2e/learn-map e2e/learn-screens`. Must show 196 views, 0 axe violations, 0 overflow, the keyboard test passing on both regions, `offOrigin` empty, no `pageerror`.

- [x] U1b. **`learn-map` tightening, `QA_FIXES`, live test** (§1's last two bullets, §7, §8). T0; no lab loop.
  - Files: `e2e/learn-map.spec.ts`, new `e2e/qa-fixes.ts`, `e2e/learn-walk.spec.ts`, `e2e/release/live.spec.ts`, 006.
  - Do:
    1. `learn-map.spec.ts:137`: collect cross-page fragments, visit each target (including `/#files`), assert the id, and assert the set isn't empty (22 measured).
    2. `:35`: assert each prereq's `href`.
    3. `:89`: each module page's `.prereqs a` hrefs equal `m.prereqs.map(moduleUrl)`, in order.
    4. `e2e/qa-fixes.ts`: `QA_FIXES: { q, url, has, not?, from?: { file, values[] } }[]`, empty for now.
    5. Add test `QA_FIXES on dist` to the walk spec (`has`, `not`, `from`) and test `QA_FIXES on the origin` to `live.spec.ts` (`has`, `not`). Update the header comments of both.
    6. Prove they bite: a temporary row with text the page lacks must fail both tests. Remove it before committing.
    7. 006's Links section: the crawl's result, cross-page fragment count, prereq hrefs.
  - Checks: `pnpm typecheck`; scoped `e2e/learn-walk e2e/learn-map`; then the live test's dry run against a local Caddy:
    ```sh
    mkdir -p /tmp/critwire-qa-e2e
    CRITWIRE_DIST=$PWD/dist CRITWIRE_FIXTURES=$PWD/e2e/fixtures E2E_ARTIFACTS=/tmp/critwire-qa-e2e caddy run --config e2e/Caddyfile --adapter caddyfile >/dev/null 2>&1 & C=$!
    timeout 20 sh -c 'until curl -sf -o /dev/null http://127.0.0.1:3101/; do :; done'
    RELEASE_ORIGIN=http://127.0.0.1:3100 E2E_ARTIFACTS=/tmp/critwire-qa-e2e pnpm exec playwright test -c playwright.release.config.ts -g QA_FIXES
    kill $C
    ```

- [x] U2. **Labs and external links, one-off** (§3; findings 4, 5). Below T0: changes no repo file but 006, unless a dead link needs a fix.
  - Do:
    1. `pnpm build`. Save the runner: `mkdir -p /tmp/critwire-qa && sed -n '/^```ts$/,/^```$/p' plans/2026-11-01-critwire-learn-qa.md | sed '1d;$d' > /tmp/critwire-qa/qa-notebooks.mts`.
    2. Run §3's `sh` fence (≈ 1.5 min). Must print 11 lines `<name>.ipynb <sha256> exit 0, … nothing left`.
    3. 006's Labs, 47 rows. `.ipynb` (11): how run, result, sha256. Add `requirements.txt`'s sha256 (`sha256sum dist/learn/labs/requirements.txt`). `.sql` (25) and `.py` (11): "`learn:check` downloads stage", result from `$S/baseline-learncheck.log` for now; the final Verification replaces it.
    4. 006's Method: both §3 fences, verbatim.
    5. 006's Setup vs downloads: claim | evidence, for packages, the "44 pins" (`site/learn/pages/setup.html:87`), uv 0.13.5, the pyproj 3.8.0 Intel note, extensions, privileges, ipykernel. Mark Docker, EDB and Windows hand-only.
    6. External links (≈ 3.5 min; Bash timeout 600000 ms):
       ```sh
       grep -rhoE 'href="https?://[^"]+"' dist/learn --include=index.html | sed -E 's/^href="|"$//g; s/&amp;/\&/g' | sort -u > /tmp/critwire-qa/links.txt
       sed 's/.*/url = "&"\noutput = "\/dev\/null"/' /tmp/critwire-qa/links.txt > /tmp/critwire-qa/links.curl
       curl --rate 2/s -sSL --max-time 30 -A 'critwire-qa (+https://critwire.com)' -w '%{http_code} %{url}\n' -K /tmp/critwire-qa/links.curl > /tmp/critwire-qa/links.out 2>&1
       ```
       `links.txt` holds 415 URLs today. Anything but 200: open it by hand once, and tell a bot block from a dead link. A dead hand-written link is a T0 fix or listed; a dead dataset DOI is listed. Never a gate. Record totals and non-200s in 006's Links.
    7. A failing notebook (probed 11/11, so not expected) gets an Issues row, `queued` for U11 or `listed`.
  - Checks: `pnpm typecheck`; `git status` shows only 006, plus any `Q<n>` fix, which gets the scoped run the fix rules name. The venv is gone (the fence deletes it). `rm -rf /tmp/critwire-qa`.

- [x] U3. **Astra's two leftovers** (§6; finding 7). T0: `scripts/ingest/gbif.ts` isn't in the checker's closure, so no key moves.
  - Files: `scripts/ingest/gbif.ts`, `scripts/ingest/gbif.test.ts`, 006.
  - Do:
    1. Slugs: re-check §6's citations and record "covered, no test" in 006's Astra leftovers.
    2. GBIF: first add failure modes (a)–(f) to the header of `gbif.test.ts`. Then `export` `fetchDatasets` (`gbif.ts:107`) and add one test per mode with `mock.method(globalThis, "fetch", …)`, answering by `facetOffset`.
    3. A mode that exposes a real bug in `fetchDatasets` gets a `Q<n>` fix, with that mode as its test.
  - Checks: `pnpm typecheck`; `pnpm exec tsx --test scripts/ingest/gbif.test.ts` (≤ 1.5 s a case); `pnpm exec tsx --test scripts/ingest/habitat.dbtest.ts` (the one dbtest whose closure reaches `gbif.ts`; `critwire_dev` only); `pnpm build` (plain, still fresh).

- [x] U4. **R1: map, setup, 7 track pages, playground, 3 schemas, data, f1–f4** (18 pages, 90 KB; §4, finding 8). Reading protocol; T0/T1 fixes.
  - First write `/tmp/critwire-qa/qa-read.mts` as §4's Prose numbers says (≈ 40 lines; `readCourse` is `scripts/learn/course-files.ts`). Its whole-course totals should be near 1,115 tokens, 734 present, 381 absent. Put its text in 006's Method.
  - Finding 8, as one `Q<n>` fix:
    - Add the Jupyter install line to `site/learn/pages/setup.html:89`, and change the matching sentence at `plans/004-learn-curriculum.md:554`.
    - Run the line as written in a throwaway `mktemp -d` venv built like §3's fence, confirm `jupyter --version`, delete the venv.
    - Add a `QA_FIXES` row for `/learn/setup/`.
  - Don't edit `scripts/learn/assemble.ts` here (T2). Record in 006 whether its line 190 still reads wrong: `queued` for U11, or "no change".
  - Then the protocol over the 18 pages; start the ledger.

- [x] U5. **R2: d1–d6** (167 KB, the largest; §4). Reading protocol; T0/T1 fixes.

- [x] U6. **R3: g1–g7** (130 KB; §4). Reading protocol; T0/T1 fixes.

- [x] U7. **R4: s1–s6** (115 KB; §4). Reading protocol; T0/T1 fixes.

- [x] U8. **R5: e1–e5** (132 KB; §4). Reading protocol; T0/T1 fixes.

- [x] U9. **R6: p1–p4, c1** (74 KB; §4). Reading protocol; T0/T1 fixes.

- [x] U10. **R7: cross-module pass** (§4). T0/T1 fixes; no page rereads beyond what the ledger points to.
  - Read only 006's ledger, the sources it points to, and §4's 18 prose links outside the prereq closure. Give each link a verdict in 006: missing prereq or harmless aside. Forward links (28) are fine unless the text needs them.
  - A missing prereq is a T0 fix in `site/learn/curriculum.json` plus 004's `**Prereqs:**`, caught by `learn-map.spec.ts:89`. Contradictions go through the tiers.
  - Checks: `pnpm typecheck`; `pnpm learn:port --check all`; with any fix, scoped `e2e/learn-walk e2e/learn-map`, plus `e2e/learn-browser` for T1.

- [ ] U11. **Lab batch** (§7, §3, finding 8). **The only lab-tier step.** Its loop is `pnpm build --draft && pnpm learn:check && pnpm build`, plain: §7 rules `--update` out, because a whole plain run refuses a changed result and still rewrites `checked.json`.
  - Read 006's `queued` rows, including `scripts/learn/assemble.ts:190` if R1 left it wrong.
  - **Nothing queued:** write "lab batch empty" in 006 and do only the hash check below.
  - **Otherwise:**
    1. One `Q<n>:` commit per item: 004 and the file together.
    2. `pnpm learn:port --check all`.
    3. Run the loop once. A changed result means that item isn't T2: revert it and write it as `listed`.
    4. Commit `site/learn/labs/checked/checked.json` from that whole run.
    5. `pnpm typecheck`; `pnpm test`; `pnpm test:db` (≈ 24 min: dbtests read the course's blocks and import `assemble.ts`); `E2E_ARTIFACTS=/tmp/critwire-qa-e2e pnpm e2e` in full.
  - **Hash check, always** (after a plain `pnpm build`). It must print nothing:
    ```sh
    for f in dist/learn/labs/*.ipynb dist/learn/labs/requirements.txt; do grep -q "$(sha256sum "$f" | cut -d' ' -f1)" plans/006-learn-qa.md || echo "STALE $f"; done
    ```
    If it prints anything, rerun §3's whole fence (U2's items 1–2) and update every Labs row.

- [ ] U12. **006 complete** (§5). No code; no heavy run.
  - Every issue has a state and no row is `queued`.
  - Fill `fixed` SHAs from `git log --format='%h %s' --grep='^Q[0-9]*:' origin/main..HEAD`.
  - Check all of it: header with commit walked and reproduce commands; 47 Pages rows, each with a read unit; 47 Labs rows; Links; Axe; Setup vs downloads; Astra leftovers; Ledger; Method fences (`qa-notebooks.mts`, `qa-read`, the link check).
  - Name `$S/e2e-final/` as the evidence path. Drop leftovers: `rm -rf /tmp/critwire-qa /tmp/critwire-qa-e2e`.
  - Checks: `pnpm typecheck`; `pnpm learn:port --check all`.

## Verification

Run by the session of rule 7, on the final tree, after the Astra code review and any fix steps it adds. Rule 8 reruns all of it after its rebase. One command per Bash call, one at a time (timeout 1500000 ms), with `set -o pipefail` before each `tee`. A failure becomes a new fix step, then the run starts again from the top. Never edit an assertion or a recorded result to pass. There's no lint script; `pnpm typecheck` is the static check.

`S=/srv/critter-ai/agent-state/missions/critwire-learn-qa`

**1. Build and E2E.**

| Command | Must show |
|---|---|
| `pnpm install --frozen-lockfile` | Lockfile unchanged. |
| `pnpm build 2>&1 \| tee $S/final-build.log` | Plain, never `--draft`. Exit 0. Refusals for stale labs or DOIs would stop it. |
| `rm -rf $S/e2e-final && E2E_ARTIFACTS=$S/e2e-final pnpm e2e 2>&1 \| tee $S/final-e2e.log` | Exit 0, ≈ 10 min. |
| `node -e "console.log(require('$S/e2e-final/results.json').stats)"` | `unexpected: 0`, `flaky: 0`, `skipped: 0`, `expected` ≥ 149 (98 at baseline + 47 pages + 2 dialogs + keyboard + `QA_FIXES on dist`). |

E2E scenarios that must pass:
- `e2e/learn-walk.spec.ts`:
  - 47 pages and 2 dialogs, each at 1280 and 375 px, light and dark (196 views).
  - Every block run, every exercise filled and checked, every `<details>` open.
  - `scrollWidth` ≤ width and 0 axe violations in every view; nothing off-origin; no `pageerror`.
  - Keyboard: Tab reaches a code block and a result table on d1, the ring shows, ArrowRight scrolls.
  - `QA_FIXES on dist`: each fixed page has its fix, and the recorded result holds its values.
- `e2e/learn-map.spec.ts`: crawl of every `/learn/` page: 200, one `<h1>`, internal links, same-page and cross-page fragments, alt + `<title>`, prereq hrefs on map, tracks and module pages.
- `e2e/learn-browser.spec.ts`: every browser block equals its snapshot; every exercise and skip check rejects its `WRONG` answer and accepts its own.
- `e2e/learn-labs.spec.ts`: downloads are served as assembled; recorded results; `.ipynb` cells equal the `.py`'s.
- `e2e/learn-screens.spec.ts`: 12 pages, 2 widths, 2 themes, 48 screenshots.
- `e2e/schema.spec.ts`, `learn-data`, `learn-timing` and the `/v1` specs (`attribution`, `countries`, `docs`, `duckdb`, `files`, `serving`): unchanged and passing.

**Artifact:** `$S/e2e-final/` (`playwright-report/index.html`, `results.json` with the walk's `{page, views, blocks, incomplete}` annotations, the 48 PNGs, `caddy-access.log`).
- Reproduce: `pnpm install --frozen-lockfile && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- View: `pnpm exec playwright show-report $S/e2e-final/playwright-report`.
- Disk (§8): once it's written, `rm -rf $S/e2e-baseline /tmp/critwire-qa /tmp/critwire-qa-e2e`. Rule 8's re-verify overwrites `e2e-final/`, and `release-smoke/` takes the intermediate slot, so there are never more than two.

**2. Labs.**

| Command | Must show |
|---|---|
| `pnpm learn:check 2>&1 \| tee $S/final-learncheck-1.log` | Last line `learn:check: ok`; `unchanged: site/learn/labs/checked/checked.json`; 25 `.sql` and 11 `.py` download lines. |
| `pnpm learn:check 2>&1 \| tee $S/final-learncheck-2.log` | The same. |
| `git status --porcelain -- . ':!plans/'` | Empty, so the build E2E tested is still the proven one. |
| The hash check fence in U11 | Prints nothing. If not, rerun §3's whole fence (U2's items 1–2), update 006's Labs rows, rerun the check. |

**3. Static and unit.**

| Command | Must show |
|---|---|
| `pnpm typecheck` | Exit 0. |
| `pnpm test` | All pass (748 at baseline, plus U3's six modes). |
| `pnpm learn:port --check all` | Exit 0: 004 equals the site's blocks and results. |
| `pnpm test:db` | Only if a commit after U11 touched `scripts/learn/`, `scripts/learn-check.ts`, `site/learn/sql/` or `site/learn/labs/requirements.txt`. Not in the DoD. All pass. |

**4. `plans/006-learn-qa.md` complete.**
- 47 Pages rows, refreshed from `$S/e2e-final/results.json`, each with axe 0 and overflow 0.
- Links: crawl and external totals. Axe: rules, before and after, `incomplete`.
- Labs: 47 rows, with `.sql` and `.py` results citing `final-learncheck-1.log` and `final-learncheck-2.log`, and `.ipynb` rows whose sha256s match the hash check.
- Setup vs downloads, Astra leftovers, Ledger, Method fences.
- Issues: no `queued`. Each `fixed` row's SHA resolves and its subject starts `Q<n>:` (`git log --format='%h %s' --grep='^Q[0-9]*:' origin/main..HEAD`), with its catching assertion named. Each `listed` row has a recommendation. Refill SHAs after a rebase (§5).

**5. Release smoke** (rule 8, after `deploy critwire`; `dist/` is the re-verify's build, same tree as the merge):

`RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=$S/release-smoke pnpm exec playwright test -c playwright.release.config.ts 2>&1 | tee $S/release-smoke.log`

All pass, including:
- `every dist/ file is served with dist's bytes`: every `/learn/` page returns 200 (47 of them), with CSS and app.
- `QA_FIXES on the origin`: each fixed page shows its fix and lacks the old text.
- The existing wasm, f3 block, star, feed and `s4.py` checks.

Live walk or axe isn't needed: same bytes (§8). Record the result and the log's path under `## Release`.

**Risks.**
- The walk's 60 s per page or its ≈ 3 min total could prove tight on this 2-CPU server. A timeout is a failure to investigate, not to raise blindly.
- R2 (167 KB) may not fit one session; split it (slack: 12 steps).
- `axe` `incomplete` and external links are recorded, never asserted, so a later change there goes unnoticed. Accepted (§1, Rejected alternatives).

## Code review (Astra)

## Release

## Decisions

- U1a: the keyboard test passed before Q2, because Chromium's keyboard-focusable scrollers focus an overflowing region with no `tabindex`. Added one assertion to §1's test, `tabindex="0"` on each region, so it bites and covers browsers without that default. The architect's probe injected `tabindex`, so it couldn't see this.
- Correction to Fable's MISSED 1 (and to commit `3abf588`'s subject): `assemble.ts:190` is the `.ipynb` "about" cell only, and `freshness.ts:108` drops `.ipynb` from the download shas, so no download sha moves. It's still T2: `assemble.ts` is in the checker's closure (`learn-check.ts` → `check.ts:39`), so any edit moves every block key. Conclusion unchanged, queue it for the lab batch (U11); `setup.html:89` stays T0.
- U1b: `goto` returns null when only the fragment changes, so the crawl's cross-page loop asserts the id only; `checked` already proved each path 200. `QA_FIXES` matches the served HTML as written, not rendered text, so one row type covers a sentence and an external URL. Crawl and "all 33" tests get 180 s (default 30 s; they took 18 s and 6 s here).
- U4: `$env:Path` on Windows comes from `install.ps1`'s own message and default folder, not a run: no Windows here. Q7's Docker and EDB commands are also unrun here (no Docker, per `~/AGENTS.md`), built from the page's own lines; the page already marks those routes untested. No 004 sentence for Q7, Q9, Q11, Q13, Q14: their text is only on the page. Q10's 004 sentence was already right.
- U2: this server's IP gets a Cloudflare 403 from `www.gbif.org`, in Chromium too, so "open it by hand" can't tell a dead GBIF page. Used the DOI handle record and `api.gbif.org` instead (304 lookups, ≤ 2 req/s); 7 other publishers' pages stay unconfirmed, recorded as such. Also tested setup's platform and `ipykernel` claims with `uv`, which the step named but gave no command for; commands in 006's Method.
- U10: Q76 moves where the tracks branch, from f3 to f4, and changes 004 §2's sentence with it. A prereq fix is T0 by U10's own rule, and no module teaches anything new: f4 keeps its skip check, so a reader who writes CTEs spends minutes. Kept as a fix, not listed, because the alternative leaves g1 onward running blocks whose syntax no prereq covers. `course.test.ts`'s two assertions on the real curriculum (`afterScope` p3, c1's prereqs) state those prereqs, so they change with them; the Verification's "never edit an assertion" is about passing a failure, not this. Q76's and Q77's new `QA_FIXES` rows are what bites: `learn-map.spec.ts:89` reads `curriculum.json`, so it can't catch a prereq missing from it.

## Log

- 2026-11-01 12:00 UTC: Baseline. typecheck pass, test 748/748, test:db 140/140, build pass, learn:check ok, e2e 98/98; dist = live. Next: Architecture.
- 2026-11-01 12:22 UTC: Architecture written by `architect`: d1 overflow at 375 px + axe `scrollable-region-focusable` found (probe, not yet fixed); walk spec, axe-core, one-off .ipynb run, reading units R1–R7. No checks run (plan only). Next: Fable review.
- 2026-11-01 12:32 UTC: Fable review by `architecture-reviewer`: APPROVE, 0 MUST-FIX, 1 MISSED (`assemble.ts:190` is T2, not T0), 5 SHOULD-CONSIDER. Plan only, no checks run. Next: Astra review.
- 2026-11-01 12:36 UTC: Corrected Fable's reason for `assemble.ts:190` being T2 (closure key, not download sha; see Decisions). Read code only, no checks run. Next: Astra review.
- 2026-11-01 12:28 UTC: Astra review: APPROVE_WITH_CHANGES, 1 MUST-FIX (notebook runner must use lab lock, guarded db target, cleanup), 3 SHOULD-CONSIDER. Plan only, no checks run. Next: Revision.
- 2026-11-01 12:44 UTC: Revision by `architect`: Astra MUST-FIX resolved (notebook run = throwaway script under lab lock, target guards, cleanup), finding 8 tiers fixed, all 8 SHOULD-CONSIDER accepted, U1 split (13 of 25 steps). Script probed: 11/11 notebooks, cell failure, timeout, SIGTERM, held lock, `critwire` refused. No suite run (plan only). Next: Steps.
- 2026-11-01 12:54 UTC: Steps by `planner`: 13 steps (U1a, U1b, U2–U12), Verification written; U11 sole lab step, plain loop per §7. Plan only, no suite run. Next: U1a.
- 2026-11-01 13:11 UTC: U1a: walk spec (49 walks + keyboard), axe-core pin, Q1 (d1 overflow), Q2 (tabindex on scrollers), 006 skeleton. Saw both fail first. typecheck pass, test 748/748, scoped e2e 82/82 (196 views, 0 axe, 0 overflow). Next: U1b.
- 2026-11-01 13:30 UTC: U1b: prereq `href`s (map, tracks, modules), cross-page fragments (22 links, 11 targets, 0 broken), `QA_FIXES` + dist and origin tests. Each seen to fail on a bad row or broken `dist/`. typecheck pass, scoped e2e 57/57 (196 views), live dry run pass. Next: U2.
- 2026-11-01 13:40 UTC: U2: 11/11 notebooks exit 0 in a learner's venv (nothing left); 47 Labs rows; setup claims checked, 4 platforms resolve, Intel Mac refused as stated. 415 external links: 111 200, 295 GBIF Cloudflare blocks confirmed via API, 7 other blocks unconfirmed, 2 dead at publishers (Q3, Q4, listed). typecheck pass. Next: U3.
- 2026-11-01 13:43 UTC: U3: slugs already covered, recorded. `fetchDatasets` exported, 6 paging tests PG(a)–(f) with failure modes first; no bug; 7 mutations each caught. typecheck pass, gbif.test 10/10, habitat.dbtest pass, plain build pass. Next: U4.
- 2026-11-01 14:35 UTC: U4: R1 read (18 pages), qa-read written (1,133 tokens, 739 present, 394 absent), ledger started. 11 T0 fixes, Q5–Q15, each row seen to fail first; finding 8 done, `assemble.ts:190` no change, nothing queued. typecheck pass, `learn:port --check all` pass, build pass, scoped e2e 57/57, build unit tests and `learn-data` pass. Next: U5.
- 2026-11-01 14:17 UTC: U5: R2 read (d1–d6), every prose number judged, claims checked in the lab db, ledger extended. 10 T0 fixes, Q16–Q25, each assertion seen to fail first; Q16 gives lab blocks the browser's Runs after line. Nothing queued or listed. typecheck pass, `learn:port --check all` pass, module-html tests 18/18, plain build pass, scoped e2e 67/67 (walk, map, labs). Next: U6.
- 2026-11-01 14:33 UTC: U6: R3 read (g1–g7), every prose number judged, claims and full results checked in the lab db (read only), ledger extended. 12 T0 fixes, Q26–Q37, every row seen to fail first on the unfixed build. Nothing queued or listed. typecheck pass, `learn:port --check all` pass, plain build pass, scoped e2e 57/57 (walk, map). Next: U7.
- 2026-11-01 14:47 UTC: U7: R4 read (s1–s6), every prose number judged, claims checked in the lab db, esda, libpysal and DuckDB claims run or read in source, ledger extended, R1–R3's open items answered. 17 T0 fixes, Q38–Q54, each assertion seen to fail on the unfixed build; Q39 and Q40 also touch f4, p4, c1, Q54 d1, as the same facts. Q55 queued for U11 (`assemble.ts` header, T2). Nothing listed. typecheck pass, `learn:port --check all` pass, plain build pass, scoped e2e 57/57 (walk, map). Next: U8.
- 2026-11-01 14:58 UTC: U8: R5 read (e1–e5), every prose number judged, claims checked in the lab db, data files and GBIF's docs, DuckDB dialects run, systemd units verified, ledger extended. 6 T0 fixes, Q56–Q61, each assertion seen to fail on the unfixed build. Q62 queued for U11 (`e4-derived` comment, T2). Nothing listed. typecheck pass, `learn:port --check all` pass, plain build pass, scoped e2e 57/57 (walk, map). Next: U9.
- 2026-11-01 15:19 UTC: U9: R6 read (p1–p4, c1), every prose number judged, against the star files, the feed and its schema, DuckDB and pandas lines run, two Microsoft claims read at the source, ledger extended. 13 T0 fixes, Q63–Q75, each assertion seen to fail on the unfixed build. Power BI itself not run (H6 stays the owner's); H6's step 5 corrected. Nothing queued or listed. typecheck pass, `learn:port --check all` pass, plain build pass, scoped e2e 57/57 (walk, map). Next: U10.
- 2026-11-01 15:33 UTC: U10: R7 read: ledger, sources, all 18 prose links with a verdict in 006, plus one scan of terms outside their home's closure. Two missing prereqs fixed (Q76 d1, g1 need f4; Q77 c1 needs e5), Q78, Q79, Q80 prose, each seen to fail on the unfixed build. Q81 queued for U11. Nothing listed. typecheck pass, `learn:port --check all` pass, `pnpm test` pass, plain build pass, scoped e2e 57/57 (walk, map). Next: U11.

## Summary
