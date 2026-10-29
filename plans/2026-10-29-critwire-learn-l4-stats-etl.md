---
mission: critwire-learn-l4-stats-etl
project: critwire
branch: agent/critwire-learn-l4-stats-etl
status: active
started: 2026-10-29 13:38 UTC
---

# Mission: critwire Learn L4, spatial statistics and ETL: Python labs, s1–s6 and e1–e5 (mission L4)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l4-stats-etl.md, then run:
     mission start critwire <that file>        (base: main after mission L3 is merged and live)
     Start only after L3 (critwire-learn-l3-gis) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§3.3, §5.4, §5.5, §7, §9, §A.1, §A.2).
     Chain: L1 → L2 → L3 → L4 (this) → L5 critwire-learn-l5-powerbi-capstone.
     Estimate: about 30–36 sessions (6 pipeline stages, about 22 steps, code review, verification, release). -->

### Goal

critwire Learn's spatial statistics and ETL tracks go live, with Python labs tested like the SQL ones:
- **The Python environment** (004 §3.3): `requirements.txt` with 004's pins (CPython 3.12, GeoPandas, PySAL's `libpysal`/`esda`/`pointpats`, psycopg, …), `uv` with `--no-build`, the venv `.venv-learn` (ignored by git); `/learn/labs/requirements.txt`; the Python part of `/learn/setup/` (Windows and Linux) and the arcpy notes (§3.4). If L1 already brought the environment in, reuse it.
- **`learn:check`'s Python stage** (004 §0, §7.6): every `# q:` block runs isolated (`python -I`, empty working folder, `PGOPTIONS=-c search_path=pg_catalog` unless it uses the connect helper), its stdout's sha256 recorded and compared; its freshness key in `checked.json` covers what it executes (`py-connect`, its `# after:` chain transitively, the `-- boot` blocks, `requirements.txt`), and each `.py` download's assembled sha256 too (004 §7.5).
- **Downloads** (004 §7.3): `/learn/labs/<module>.py` and `<module>.ipynb` (one cell per block, Markdown headings; the notebook's cells equal the `.py`'s blocks), plus `setup.py`/`setup.ipynb` for §3.3's blocks. Every `.sql` and `.py` reading `s4_cells` or `s4_neighbours` (s2, s3, s4, s5, setup; c1's `.sql` in L5) carries `s4-cells` as its boot setup, after `pg-session` or `py-connect`. `untested` blocks (`e1-submit`) are commented out under their reason in the `.py` and a Markdown cell in the notebook, never run from a download.
- **`learn:check` runs the Python downloads as assembled** (004 §7.6): each `.py` on a freshly loaded database, in `.venv-learn` from an empty folder, no `GBIF_*` in its environment, exit 0; the s-modules' `.sql` likewise, as L2's stage does.
- **s1–s6 and e1–e5 written in full** (004 §5.4–5.5 outlines → full modules): concept, worked example, lab, result, exercise with its answer, check, dialects (and, for Python, the arcpy or ArcGIS Pro equivalent where one exists). Every outline block keeps its id and its result. `s6-habitat` moves from `untested: L3 builds occurrence_habitats` to `ran`, on L3's data. `e1-submit` stays `untested` (it submits a real GBIF download); the rest of e1 runs.
- **Gi\* and LISA tested against esda**, and global Moran's I in SQL equal to PySAL to 6 decimals (I, E[I], the normality z-score), as the design's spike proved (§A.2).
- **Pages**: the eleven module pages, the map marks them built; E2E `learn-labs` covers the Python blocks and the notebooks.
- It's live: the mission merges and deploys at its end.

### Why

Spatial statistics and ETL are the two areas the owner's job needs most and his existing guides cover least (004 §8). They're the course's honesty test: occurrence records are biased samples of recording effort, and the modules must teach that, with results a reader can reproduce in SQL and in Python.

### Scope

In:
- `requirements.txt` (and `requirements.in`), `.gitignore`, the `learn:check` Python stage and its tests, `scripts/build/` (Python downloads, `.ipynb` writer, freshness keys), `site/learn/` (s and e modules, blocks, curriculum state, setup page), `e2e/`, `AGENTS.md` (the Python setup and commands), `plans/004-learn-curriculum.md` (the s and e modules in full; fixes where code proves it wrong).
- Reading, never editing, the design spike's `scripts/py-engine.ts`, `tests_py/`, `moran/`, `etl/` and their failure cases.
- `uv` installed in `~/.local/bin` if missing (standalone installer, sha256 checked); no apt.

Out:
- p1–p4 and c1 (L5); the habitat fact in the star (L5).
- Any GBIF download or registration: e1's submit stays an untested block; the lab data is L1's.
- Changes to `/v1` or to L1–L3's data files; `numba` or any package without an aarch64 cp312 wheel (004 §3.3).
- The `critwire` database except through `deploy critwire`; schema `learn_spatial`; IUCN data; Wikipedia prose.

### Definition of done

- `pnpm typecheck`, `pnpm test` (the Python engine's failure cases ported first: PY1–PY10 in the spike) and plain `pnpm build` pass on the final commit; `uv pip sync --no-build requirements.txt` and `uv pip check` are clean.
- **`pnpm e2e` passes in full**, nothing skipped; every `.ipynb` cell equals its `.py` block.
- **Results:** every s and e block 004 recorded as `ran` keeps its sha256, SQL and Python alike; `s6-habitat` and the new exercise blocks `ran`; two `learn:check` runs give the same hashes (seeds fixed, explicit formatting). Leak query empty; `learn_spatial` canary unchanged.
- **Moran**: SQL and PySAL agree on I, E[I] and z to 6 decimals on the 5 km grid, the neighbour pairs equal (the spike's `moran/compare.py` gates, ported into a block or a test).
- **Existing files unchanged** except pages and `manifest.json` (if a file is added): compared with the Baseline `sha256sum` list.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl/e2e/`: Playwright report, traces, `results.json`, screenshots of s4, s5 and e2 at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every s and e page returns 200; `/learn/labs/requirements.txt` equals the repo's; `/learn/labs/s4.py`, downloaded, runs in `.venv-learn` against `critwire_dev` after the live loader and prints s4's recorded result.
- The plan's Summary gives: what shipped, the pins, the Python timings, every deviation from 004, the release record, and what L5 needs to know.

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Honest data:** records are recording effort, never where an animal lives; every map, hot spot and ratio is labelled that way.
- **Fix the SQL, never the threshold**: a disagreement between SQL and PySAL beyond 5e-7 is diffed (neighbours, k, S0/S1/S2, the mean) and fixed.
- **Simplest approach that works**: Python runs on the learner's machine and in `learn:check`, never in `pnpm build` or `deploy`.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

### Notes

- **Needs from L3:** `occurrence_habitats`, `country_habitats` for every country, the clips; g6's hexagon grids (s2–s5 read the boot block `s4-cells`). Read L3's Summary first.
- **Facts the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S2, S3, S10, S25, S26):
  - `uv` 0.13.5, 44 pins, every one a wheel on aarch64 cp312; Windows x86-64, Linux and macOS 14 arm64 resolve with `--no-build`; Intel macOS has no pyproj 3.8.0 wheel. `ipykernel` isn't pinned; decide whether the notebooks need it.
  - `SHOW search_path` after the connect helper prints `learn_curriculum,public` (no space).
  - Coincident points are `ST_DWithin` neighbours but not `DistanceBand` ones; 28 of 2,000 devil records lie in no 5 km cell.
  - k-nearest ties: SQL ranks by distance rounded to 0.01 m, then id; PySAL's KDTree breaks the same 1,025 ties its own way; teach it, don't hide it.
  - Gi\* SQL equals esda `G_Local(star=True, transform="B")` to 6 decimals (99 hot, 39 after FDR, no cold spot); p-values via PostgreSQL 16's `erfc`. Permutation blocks are seeded (`seed=2026`; global `Moran` needs `np.random.seed(2026)`).
  - e2's text-format `COPY` trap (three made-up records, all silently changed) and the four backbone synonyms; e4's flags (1,109 shared coordinates; devil records dated 1599).
- **Pointers into 004:** Python setup §3.3, arcpy §3.4, statistics §5.4, ETL §5.5, site §7, chain §9, the ETL spike §A.1, Moran §A.2.

### Addendum (control room, 2026-10-28): the owner's answers and the database review

This addendum is part of the brief. Where it differs from the text above, it wins.

**The owner's answers to 004 §10:**
- **Every item takes 004's recommendation except item 4's Caddy headers, which are a NO.** No precompression, no `immutable` or `no-cache` change, and no Caddy or `e2e/Caddyfile` change. Learn ships without them.
- **Item 7: all five missions are queued** and run back to back, L1 → L5. Each starts only after the previous one is merged and live.
- **Item 8:** the Windows checks stay handoff items that block nothing.

**The Codex database and backend review** (GPT-6-Astra high, 2026-10-28; verdict SOUND_WITH_CHANGES) is at `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md`. Read it at Baseline.
- The items assigned to this mission (below) are in scope and part of the Definition of done, even where the Scope section above excludes the file they touch.
- The architect folds them into the plan. Record each under Decisions as **done** (with the commit) or **rejected** (with evidence-backed reasons). Don't drop one silently.
- The review's line references are to `main` at `5ac58df`.

**Database roles:**
- The live-build database `critwire` will belong to role `critwire_live` (the control room is setting it up), used only by `/srv/apps/critwire/.env` through `deploy`.
- The dev role `critwire` (the repo `.env`) can't connect to `critwire` and has no CREATEDB.
- Never put `critwire_live` credentials in a worktree or a test.
- Both `.env` files carry `CRITWIRE_DB_TARGET` (L1's item 1).
- If this paragraph isn't true when the mission starts (`psql -d postgres -Atc "select rolname from pg_roles where rolname='critwire_live'"` is empty), carry on: the code guard in review MUST-FIX 1 is still required.

**Diagrams.** The `diagram-design` Claude Code plugin (2.6.136) is installed for every session here.
- **ERDs:** the Mermaid sources stay the source of truth, rendered by the build (`pnpm erd`) and drift-checked against the loaded database. Don't replace that pipeline.
- **Every other teaching diagram** is drawn with diagram-design and committed as an SVG under `site/learn/`: pipelines, ETL flows, how a spatial join or zonal statistic works, grains and conformed dimensions, critwire's own architecture. Use system fonts (no Google Fonts; the build is offline), give light and dark variants, and add alt text that states the diagram's point.
- Draw one where a diagram teaches better than prose, not on every page.
- **The plugin's first-run gate asks the user a question, and nobody is there.** Answer it yourself: keep the default tokens, set `Font source: system`, save profile `critwire` (home library), and commit `.diagram-design` with `profile: critwire`. The first mission to draw a diagram does this; later ones reuse it.
- Export with the plugin's `scripts/export_svg.py --system-fonts` (python3, no dependencies) and check with `self_check.py --offline`. **SVG only**: PNG export needs Python Playwright, which isn't installed.
- "Alt text" means the page's `<img alt>` plus the SVG's `<title>`. The E2E checks that each referenced SVG returns 200 and has both.

**Order and budget:**
- The Goal's deliverables are never deferred. This mission's review items are built with the code they touch.
- Count sessions with `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/<slug>.log`.
- Past 48 sessions, add no more review steps: finish verification and the release, and hand each unfinished assigned item to the next mission as a handoff item.

#### Review items assigned to L4

The review's numbering: MF = MUST-FIX, SC = SHOULD-CHANGE.

1. **MF5:**
   - `e2-geopandas` passes `schema="learn_curriculum"` and qualifies its verification query.
   - It runs, and every Python lab runs, as `critwire_lab` (L1's role, no CREATE on `public`), not the superuser.
   - A test checks the table's namespace while the transaction is open.
2. **SC8: a restartable refresh.**
   - **e3:** distinguish deterministic output, idempotent batch application, and "the target currently holds snapshot X". Loading A, then B, then A again must leave A. Include the transform, config and schema version in the job identity. Teach that `md5(id)` gives a repeatable capped sample, not stable membership under refresh.
   - **e5:** keep today's TEMP-table job, labelled as a simulation, then teach and test the real pattern:
     - a persistent target and state table
     - an atomic replace-and-update of the state
     - a lock covering the comparison and the replacement
   - **Verify:** two separate processes, changed input, a failed load, and overlapping refreshes.
   - The cron example's output claim matches its redirect. The log-only notification doesn't claim to alert a person.
3. **Teaching corrections** (the review's table):
   - **e1:** persist the request identity and reconcile before resubmitting. Retry the whole file (resetting `.part`), not just opening the response. Handle `Retry-After` and set a polling deadline.
   - **e2:** loading through text staging can still fail. Cast errors report the source row and key. The made-up licence mapping isn't the effective-licence pipeline.
   - **e4:** the capped sample isn't abundance or unbiased effort. Rejecting zero coordinates is a rule for this dataset, not a GIS truth. Detect negative or non-finite uncertainty. The quarantine report keeps the key and the reason.
   - **e5:** check the scheduler's PostgreSQL settings and credentials without logging them.
   - Fix each in 004 and on the page in the same commit.
4. **SC7 (L4 part):** cleanup is checked on error and interrupted paths for the Python stage too.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

On `358abb9` (= `origin/main` `7508fc7` + mission start), 2026-10-29, db `critwire_dev` (`CRITWIRE_DB_TARGET=critwire_dev`, `LEARN_PG_URL` as `critwire_lab`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl/baseline-*.log`.
- `pnpm install --frozen-lockfile`: ok. No migrations (build rebuilds tables). No lint script; typecheck is the static check.
- `pnpm learn:venv`: ok (uv 0.13.5 already at `/usr/local/bin/uv`; CPython 3.12.3; 48 packages). `uv pip check`: clean. L1 brought the environment in (`site/learn/labs/requirements.{in,txt}`): reuse it.
- `pnpm typecheck`: ok (2 s). `pnpm test`: 601/601 (2 min 5 s).
- `pnpm build` (plain): ok, 6.7 s; `dist/learn/data/` 95,936,992 B, committed lab data 18,822,906 B (cap 120,000,000 each); `dist/` 246 files.
- `pnpm test:db`: 121/121 (11 min 8 s), after the build.
- `pnpm learn:check`: ok (3 min 56 s); canary `learn_spatial` unchanged, leak check empty, `checked.json` unchanged.
- `pnpm e2e`: 87/87 passed (5.9 min); artifacts `.../critwire-learn-l4-stats-etl/baseline-e2e/`.
- sha256 lists for Definition of done: `.../critwire-learn-l4-stats-etl/baseline-sha256-repo.txt` (728 tracked files) and `baseline-sha256-dist.txt` (246 `dist/` files).
- Roles: `critwire_live` and `critwire_lab` exist. Handoff: no `done` items; H3 (GBIF retention) waits on the owner, blocks nothing.
- For the architect: L3's Summary notes (Python blocks `py-connect`, `py-smoke` skipped by `learn:port` until L4; species change also needs `ingest habitat`); Codex db/backend review at `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md` (L4 items: MF5, SC8, teaching corrections, SC7 Python part).

## Architecture

Architect, 2026-10-29, on `d69b024`; revised on `0d9c7a9` after both reviews (see Revision notes). "(checked)" marks facts verified on this VPS today. `SP` = the design spike, `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike` (not in git: `git log --all -- scripts/py-engine.ts` is empty). Its Python evidence: `SP/scripts/py-engine.ts`, `SP/test/python-engine.test.ts` + `SP/test/fixtures/python/` (PY1–PY10), `SP/moran/compare.py` + `SP/tests_py/test_moran.py` (MC1–MC7), `SP/etl/*.py`.

### Findings (ranked by impact)

1. **No Python engine exists in the repository; every block path is SQL-only.**
   - `parseBlock` refuses any file but `.sql`, `.m` and `.dax` (`scripts/learn/blocks.ts:108`), and `Engine` has no `python` (:24).
   - `learn:port` skips Python fences (`port.ts:99–103`). Its setup sections omit §3.3 and §3.4 (:13), where `gpkg-export` and `arcpy-moran` live.
   - `runBlock` throws on anything but PostGIS (`runner.ts:258`).
   - `isLab` and `recordedResults` count ran PostGIS blocks only (`freshness.ts:68`, `course.ts:257–263`).
   - `assembleDownloads` writes `.sql` only, one name per page (`assemble.ts:93`, `:145–168`). `writeLearn` writes no `.py`, `.ipynb` or `requirements.txt` (`scripts/build/learn/site.ts:67–71`).
   - A page has one `download` (`module-html.ts:33`, `pages.ts:34`). `site.ts:85` maps page → name, so a second download on a page would silently replace the first. A Python block would fall into the Power BI branch (`module-html.ts:193–195`).
   - **Reusable as is:**
     - `childEnv(target, parent, pgOptions)` (`pg.ts:89`): an explicit environment that already takes PGOPTIONS and never copies GBIF_* or DATABASE_URL;
     - `committedLeaks`, `readTables`/`tablesDiff` and `Watch` (`runner.ts`);
     - `CHECKER_FILES`, which already lists `requirements.txt` (`freshness.ts:27`);
     - the generic Copy and dialog wiring (`site/learn/src/pages/module.ts:38,78–79`), so the browser bundle needs no change.

2. **The published pins would break 004's macOS promise (checked).**
   - L3 added `rasterio` to the labs' `requirements.in:19`, so `requirements.txt` has 48 pins, not 004 §3.3's 44 (+ `affine`, `attrs`, `click`, `rasterio`).
   - `uv pip compile --no-build --python-version 3.12 --python-platform …` (uv 0.13.5) on today's file resolves on Windows x86-64, Linux x86-64 and aarch64, and macOS 15 arm64. It **fails on macOS 14 arm64**: rasterio 1.5.2 has no wheel for it.
   - 004 §3.3's 44-pin text resolves on macOS 14 arm64. Learners never import rasterio: only `ingest habitat` and `ingest shapes`' venv need it.
   - Fix: §1, split the files.

3. **`learn:check --module s2|s3|s5|setup` would run without the `s4-cells` boot.** `staticStage` returns only that page's blocks (`check.ts:182,193`), and `runBlocks` runs the boot blocks among them (`runner.ts:608`). But `s4-cells` sits on s4's page. A whole run hides this, because boot blocks run first. Fix: every run starts with the course's ran boot blocks (004 §0: "runs once when the runner connects, before every other block").

4. **`e1-checksum`'s 004 result can't hold.** It prints `occurrences.parquet: 622971 bytes, sha256 53086c9a1fb8` (004:7705). The build publishes 454,202 B, sha256 `35ca89f9bee3` (manifest, checked): that is L1's zstd writer, and 004 §4.1:804 already says so. The result changes, with this reason. It is the first exception to the DoD's "keeps its sha256".

5. **The review items, confirmed in 004's text:**
   - **MF5:**
     - `e2-geopandas` (004:7885–7914) builds its own engine and calls `to_postgis` without `schema` (:7902), which GeoPandas turns into `public`.
     - `critwire_lab` has no CREATE on `public` and owns `learn_curriculum` (checked). So as the lab role the block fails with permission denied; as the spike's superuser it wrote into `public`.
   - **SC8, e3:** `e3-rerun` keeps every input hash it has seen, so loading A, B, then A leaves B.
   - **SC8, e5:**
     - `e5-job` keeps its data and state in TEMP tables and loops twice in one process (004:8205–8266).
     - `main()`'s docstring (:8250) and Expected (:8335) say cron mails the output, but the crontab line redirects it to a file (:8281).
   - **e1:**
     - `get()` retries opening the response, not the transfer;
     - there is no `Retry-After` handling;
     - `e1-submit`'s poll has no deadline;
     - an answer lost after the POST isn't reconciled (004:7582–7651).
   - **e3's case study** says `derive` "refuses raw snapshots older than the data they describe" (004:8043). Since L1 it replays the request builders: stale means the request changed, not the date.
   - **e2, e4, e5:** as the review's table says.

6. **Nothing stops a Python block's database sessions on an error or an interrupt (SC7).** `stopSessions` ends only the pids the runner recorded, with `application_name = critwire-learn-check` (`cleanup.ts:86–101`). A Python block's connections are opened by libpq inside a child process, so their pids are unknown. The spike killed the process group (PY8) but never checked the server's sessions.
   - Ending them by role and a fixed name would be wrong: `pg_stat_activity` spans the cluster, `critwire_lab` is a cluster role, and the lab lock is an advisory lock, so it is per database (checked: `pg_locks.database` is the current database's oid). Two runs on two databases (a mission's and the owner's) hold their own locks and would end each other's sessions.
   - Fix: §4.4 and §4.6. Each run carries its own id in `PGAPPNAME`, and cleanup matches the database, the role and that name.

7. **The lab role check doesn't enforce what MF5 needs.** `assertLabRole` (`check.ts:210–221`) checks CREATEROLE and `createrole_self_grant`, but not "no superuser, no CREATE on public". So a superuser `LEARN_PG_URL` passes and hides MF5-type bugs. Fix: §4.1.

8. **004 points the code makes simpler, or that need a decision** (each under Decisions):
   - **Python block files.** 004 §7.5:8809 says `site/learn/labs/<q-id>.py`. Every block reader (`course-files.ts` `BLOCK_DIR`) and `learn:port` use `site/learn/sql/`, and `.m`/`.dax` already live there.
   - **`# after: py-connect` crosses pages:** the helper is on the setup page, the blocks on s2…e5. `lintPage` refuses an `after` id that isn't on the page (`blocks.ts:289`).
   - **`arcpy-moran`:** 004 §7.3:8792 says it is "in no download". The existing untested rule (commented out under its reason) covers it with no special case.
   - **e1 and e5 read the lab files from `LEARN_BASE`,** which defaults to https://critwire.com: the live site, not the build under test, and over the network.
   - **`ipykernel`:** it isn't pinned, and the brief asks for a decision.

9. **Risks:**
   - **Timings.** A warm import of geopandas, esda, libpysal, sklearn, psycopg and sqlalchemy takes 2.8 s (checked; 10.7 s cold).
     - About 35 Python blocks come to about 2 min per pass, twice that with `--update`. The downloads stage adds about 20 fresh loads at about 4 s each.
     - Expect `learn:check` at about 10–15 min (3 min 56 s today).
     - To measure: `s5-lisa` (999 permutations, no numba) and `s4-permutations` against the 60 s default (add `# timeout:` in 004 and the file if needed).
     - matplotlib builds its font cache under `MPLCONFIGDIR`, else under HOME. With a fresh HOME per block it would rebuild every time, so the run shares one folder (§3).
   - **Determinism.**
     - The seeds are 004's (`np.random.seed(2026)`, `seed=2026`); KDTree ties are stable for one build; PY9 runs every block twice.
     - `py-smoke` prints Python's patch version (3.12.3 today), so an apt upgrade changes that result: explain it, then re-record.
   - **`s6-habitat` runs on L3's data** (checked, read-only, on `critwire_dev`):
     - one row per habitat class, ordered by `est_area_km2`;
     - Arable Land 16,108.04 km² with 236 records (ratio 1.21); Marine Neritic 59 records (ratio 9.50);
     - its text must say 1 km cells, estimated areas, and that coastal records land in marine classes.
   - **The lab ERD after `s4-cells` commits:**
     - `s4_cells` is already `%% lab-made` (`lab.mmd:4`);
     - the view `s4_neighbours` isn't drawn, and `erdDrift` flags only drawn views (`erd-model.ts:229–231`);
     - so `lab.mmd` and `lab.svg` stay unchanged (checked in code).
   - **Freshness.** Every PostGIS key includes every boot block (`freshness.ts:86`), and the checker's sources change. So all of `checked.json` goes stale once, and one whole run re-stamps it.
   - **Existing `dist/` files.** The SQL assembly must stay byte-identical for `d1.sql`…`g7.sql` and `pg-checks.sql`. `learn/assets/` stays only if every input of the browser bundle stays (DoD sha256 list).
     - Those inputs are `site/learn/src/`, plus four files outside it: `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts` and `scripts/build/licenses.ts` (imported by `src/{check,cards,isolation,engine,csv,results,format,hook}.ts`; also in `site/learn/tsconfig.json:14`), and `site/learn/sql/setup.sql` (`engine.ts:14`).
     - esbuild hashes their content into `app-<hash>.js`, so editing any of them changes `learn/assets/` (§12).

10. **Fine as is:**
    - the loader stage, the PostGIS runner, `-- needs: raster`, the cleanup order and the lab lock;
    - the ERD pipeline;
    - `.diagram-design` exists (`profile: critwire`), so there is no first-run gate;
    - uv 0.13.5 is at `/usr/local/bin/uv`, so nothing to install;
    - `.venv-learn/` is in `.gitignore`.

### Target design

#### 1. The Python environment
- **The labs' file.** `site/learn/labs/requirements.in` lists what the labs import, rasterio removed. `requirements.txt` is recompiled (`uv pip compile --universal --python-version 3.12`, keeping the pins).
  - It must equal 004 §3.3's text byte for byte: 44 pins (the diff above is exactly the four).
  - The build publishes it unchanged as `/learn/labs/requirements.txt`.
- **The ingest file.** `scripts/ingest/requirements.in` is `-c ../../site/learn/labs/requirements.txt` plus `rasterio`; `scripts/ingest/requirements.txt` is compiled the same way.
  - The constraint keeps every shared pin identical.
  - It is never published.
- **One venv.** `pnpm learn:venv` runs `uv pip sync --no-build --python .venv-learn site/learn/labs/requirements.txt scripts/ingest/requirements.txt`.
- **`scripts/venv.ts` (new): one place for the venv, one check, two callers.**
  - `VENV_PYTHON` (`.venv-learn/bin/python`), `LABS_REQUIREMENTS`, `INGEST_REQUIREMENTS`. `scripts/ingest/python.ts:7` uses `VENV_PYTHON`.
  - `venvState(file)` is a query: one `python -I -c` probe in the venv, which returns facts only. It reads `file`'s `name==version[ ; marker]` lines and skips a pin whose marker is false for that interpreter (`packaging.requirements`). It returns `{python, pins: [{name, pin, installed | null}]}`, with each installed version from `importlib.metadata`. Packages the file doesn't list never appear (rasterio, ipykernel). The probe was prototyped on `.venv-learn` (checked: `psycopg-binary`'s `implementation_name != 'pypy'` marker evaluates, and every pin matches).
  - `venvProblems(state)` is pure TS and holds the rules: a pin that is missing, a pin at another version, and a Python other than 3.12.
  - `packaging` is a labs pin (26.3). Without it the probe fails, and that is reported as "the venv check couldn't run: run pnpm learn:venv".
  - `assertVenv(file, who)` throws `<who>: .venv-learn: <problems>: run pnpm learn:venv`.
  - learn:check checks `LABS_REQUIREMENTS` only (§4.2). `ingest shapes` and `ingest habitat` call `assertVenv(INGEST_REQUIREMENTS)` first, before any download or spawn, so a venv missing rasterio fails in seconds, not after a 12-minute download. No uv is needed at check time.
- **`ipykernel` stays unpinned.** The setup page says: VS Code or Jupyter offers to install it, and `uv pip sync` removes it again. The check ignores it (above), so learn:check runs after a notebook session.
- **Checks (Verification):**
  - The platform check: the labs file with `--no-build`. Windows x86-64, Linux x86-64, Linux aarch64 and macOS 14 arm64 (`MACOSX_DEPLOYMENT_TARGET=14.0`) pass; Intel macOS fails, as 004 says.
  - The DoD's sync/check line covers both files: `pnpm learn:venv`, then `uv pip check --python .venv-learn`, clean.
  - The learner's environment: the labs file alone, synced into a fresh scratch venv (`--no-build`), gives a clean `uv pip check`, and `venvProblems` on that venv's state is empty.

#### 2. Python blocks: files, parsing, linting, porting
- **Files.** Each block is `site/learn/sql/<id>.py`: 004's fence body, byte for byte.
  - `parseBlock` reads `.py` as `engine: "python"`.
  - Headers are the leading lines matching `^# [a-z]+:`: `q` and `status` are required, `after` and `timeout` optional (whole seconds above 0, default 60).
  - An unknown header, a missing one, a bad timeout or no code is an error naming the file and line (PY1).
  - `code` (what the page shows) is the text after the headers; `text` is what runs and downloads.
- **Linting.** Course-wide Python helpers are `{py-connect}` (`PY_CONNECT_ID`). `lintPage(blocks, bootIds, helpers)` checks each Python `# after:` id (PY5): it must be an earlier Python block of the page or a helper, ran, not itself.
  - The SQL rules are unchanged.
  - `privilege.ts` skips Python blocks as it skips Power BI (:314), but still refuses the name `learn_spatial` anywhere in their text. It also refuses `application_name` in a ran Python block's text, written files included (e5's `refresh.py`). Every lab session then keeps the run's `PGAPPNAME`, which is what §4.4(b) and §4.6 rely on.
- **Recorded results.** `recordedResults` and freshness's `isLab` count ran PostGIS **and** Python blocks. Results live in `site/learn/labs/checked/<id>.txt`.
- **`learn:port`.** It turns `python` fences into `.py` files and their results into `CHECKED_DIR`, and adds the setup sections `### 3.3 ` and `### 3.4 `. The skip goes.
- **Rendering.** `renderPython(id, stdout)` lives in `result.ts` beside `renderResult`: `-- result: <id> · python · sha256 <12 hex of stdout>`, then stdout without one final `\n` (PY10).

#### 3. The Python engine (`scripts/learn/python.ts`, new)
- **`pythonEnv(target, {home, learnBase, app, mplConfig})`:** `childEnv(target, process.env, "-c search_path=pg_catalog")`, with:
  - HOME = the block's own empty folder;
  - PATH = the venv's bin, then `/usr/bin:/bin`;
  - `PGAPPNAME` = `app`, the run's name: `critwire-learn-check-py-<run id>`, where the run id is 12 hex from `randomBytes(6)`, made once per learn:check run in `check.ts` (36 characters, under the 63-byte limit). libpq reads it, so every connection from the block, and from any process the block starts, carries it, unless the code sets `application_name`, which §2 refuses;
  - `MPLCONFIGDIR` = `mplConfig`: one folder per run, `<run tmp>/mpl/`, outside every block's cwd and HOME and removed with the run's temp folder. matplotlib's font cache is built once per run, not once per block;
  - `LEARN_BASE`.
  - Nothing else reaches the block (PY3).
- **`blockCode(b, course)`:** the texts of its `# after:` blocks in course page order (so py-connect first), then its own, separated by blank lines (004 §0). This isn't transitive at run time (as with SQL); freshness is.
- **`runPython(code, {python, env, timeoutMs, signal})`:**
  - makes a `critwire-learn-py-*` temp folder holding `code/block.py`, an empty `cwd/` and an empty `home/`;
  - spawns `python -I code/block.py` in `cwd/`, `detached`, so the block leads its own process group;
  - on a timeout or an abort, SIGKILLs the group; on close, SIGKILLs it again (stragglers);
  - removes the temp folder in `finally`, on every path;
  - returns `{stdout, stderr, exit, timedOut}`. An abort rejects with its reason, after the cleanup.
- **`pythonFailure(r, timeoutS)`:** a timeout, or a non-zero exit quoting stderr's last 5 lines (PY7, PY8).
- The venv check is `scripts/venv.ts`'s (§1), not the engine's. `scripts/ingest/python.ts`'s `runPython` (stderr inherited, no process group, no timeout) is left as it is: the ingests stream their progress, and the lab engine isolates.

#### 4. `pnpm learn:check`
1. **Connect.** `assertLabRole` also refuses a superuser and a role with CREATE on `public`: "the labs run with a learner's privileges: run pnpm learn:check --setup" (MF5's guard).
2. **Static.** `staticStage(module)` puts the course's ran boot blocks first, then the run's blocks (finding 3). A `--module` run prints the boot blocks' results as it prints its own, so a run on s2 shows `s4-cells` once. When the run has a Python block or a `.py` download, `assertVenv(LABS_REQUIREMENTS, "learn:check")` (§1) runs before connecting, and its `python` goes into the stamp.
3. **Blocks stage, in order:**
   - PostGIS boot blocks (committed), then the lab ERD check, then the other PostGIS blocks (`runner.ts`, unchanged);
   - the Python blocks, in page order (`scripts/learn/py-runner.ts`, new);
   - the agreement gates (§6);
   - with `--update`, the results written once every block of both engines passed.
   - **One result path for both engines.** The compare, update and write logic moves out of `runBlocks` (`runner.ts:577–617`) into `scripts/learn/record.ts` (new). Each engine returns `Outcome`s (the first run, plus the second with `--update`). `settleResults` compares them with `checked/<id>.txt` (a diff on difference, PY6), requires the two runs to agree (PY9), and returns failures and writes.
4. **Each Python block (`runPythonBlock`).** `LEARN_BASE` is `file://<abs dist>`, the build under test, read through the same urllib code. After the run, each of these checks fails the block:
   - (a) exit 0, in time;
   - (b) no session left after 10 s with `datname = current_database()`, `usename = current_user` and `application_name` = the run's name (§3). A leftover is ended with `pg_terminate_backend` and named. Sessions of other databases or other runs are never matched;
   - (c) `committedLeaks`: drops the lab role's `learn_` objects and names any other;
   - (d) `learn_curriculum` equal to the reading taken when the Python stage started (`readTables`/`tablesDiff`); a change stops the run there. The canary stays endStage's check: `critwire_lab` can't write it.
5. **Downloads stage, per download in page order:**
   - `.sql` as today;
   - `.py` on a fresh load: the loader, then `python -I <file>` through `runPython` from an empty folder, with the same environment and a limit of its blocks' timeouts plus 60 s per boot block. It must exit 0. The leak check runs after each file.
   - `.ipynb` isn't run: E2E proves its cells equal the `.py`.
6. **Cleanup (SC7).** `takeLabLock(lab, db, {app})` keeps the run's name.
   - In step 1, `release()` ends the recorded pids as today, and also every session matching (b): this database, the lab role, this run's name. The same query serves (b) and cleanup (one helper in `cleanup.ts`).
   - Ownership comes from the run id, not from the lock: the lock is per database and serializes runs only there, and the database filter keeps another database's run (the same role, the same prefix) out of reach (finding 6).
   - **An earlier run's straggler** (its parent was SIGKILLed, and the detached group lived on) has another run id, so it is never ended. At connect, after the lock, a lab-role session in this database whose name has the `critwire-learn-check-py-` prefix is named, with its pid and the command to end it, and the run refuses before any block. That is cleanup's rule for objects it can't prove are its own: name them, never drop them (`cleanup.ts:58`).
   - An abort kills the Python process group and removes the temp folders (`runPython`); then cleanup's order runs as today.
7. **Stamp:**
   - `Versions` gains `python` and `requirements` (the labs file's sha256, 12 hex): recorded, never compared.
   - A Python block's key covers:
     - the ids: its own, its `# after:` chain transitively (on the page, then the helpers), every boot block, `pg-session` (the boot tables a Python block reads are made in pg-session's session, so it shapes them) and `py-connect`;
     - the existing file entries: the manifest, the checker's import closure (the new modules included), `canary.sql`, `requirements.txt`.
   - The result sha256 as today.
   - `downloads` gains each `.py` (004 §7.5); `.ipynb` isn't stamped.

#### 5. Downloads (`assemble.ts`, plus `scripts/learn/notebook.ts`, new)
- **`Download` gains `kind: "sql" | "py" | "ipynb"` and `timeoutMs`** (for `py`). `assembleDownloads(pages)` stays the one function the build, learn:check and E2E share. Its SQL output stays byte-identical.
- **Every consumer splits by `kind`; none guesses from the name** (Astra SC2):
  - the build writes all kinds;
  - learn:check runs `sql` with psql and `py` with `runPython`, and runs no `ipynb`;
  - freshness stamps `sql` and `py`;
  - E2E checks each kind its own way (§10).
- **`pageDownloads(downloads)`** (in `assemble.ts`, pure) gives each page's `{sql?, py?, ipynb?}` names. `site.ts:85` passes it to `learnPages` in place of today's page → name map, which would keep only one name per page (finding 1).
- **The boot rule is one helper with a per-engine word test:** `bootsNeeded(boots, codes, names)`.
  - SQL: a whole word outside SQL comments and strings: today's rule, through `codeOnly` (`scripts/build/learn/sql.ts`, unchanged).
  - Python: a whole word in the text minus lines starting `#`, because the SQL lives in Python strings. That test lives in `assemble.ts`.
  - **The bundle's shared inputs are untouched:** nothing new goes into `sql.ts` or `cell.ts`, and `licenses.ts` and `setup.sql` don't change. Python parsing is `blocks.ts`'s, Python rendering `result.ts`'s, Python assembly `assemble.ts`'s and `notebook.ts`'s (finding 9; §12 audits `learn/assets/`). `learn:port setup` adds only `.py` files: port refuses to rewrite a file that differs, so `setup.sql` can't change by accident.
- **Which pages:** a page with any Python block other than py-connect gets `<page>.py` and `<page>.ipynb`; the setup page gets `setup.py` and `setup.ipynb`.
- **One cell list, two writers.** `pythonCells(page, course)` gives, in order:
  1. `py-connect`, as code;
  2. each needed boot block, as `with connect() as conn:\n    conn.execute("""<its SQL>""")`. SQL holding `"""` or `\` is refused.
  3. each Python block of the page in page order (py-connect excepted): a Markdown heading `## <id>`, then its text as code. An untested block is:
     - in the notebook, one Markdown cell: the `not run from this file: <reason>. Run it by hand, as its page says.` line, then the code as a fenced block;
     - in the `.py`, that line behind `# `, its headers, then every code line behind `# `.
- **The `.py`:** a head comment (how to run it, the PG* settings, `LEARN_BASE`), then each cell after a `# %% <id>` line (`# %% boot: <id>` for a boot block).
- **The `.ipynb`:**
  - nbformat 4.5, kernelspec `python3`;
  - cell ids `<id>` and `<id>-md`;
  - `source` as a list of lines; `outputs: []`, `execution_count: null`;
  - JSON with sorted keys, 1-space indent and a final newline, so the same input always gives the same bytes.
- **`writeLearn`** writes every download and copies `site/learn/labs/requirements.txt`.

#### 6. Agreement gates (`scripts/learn/agree.ts`, new, pure)
Over the run's rendered results. A pair is checked when both of its blocks ran in the run. A failure names the pair and the value ("fix the SQL, never the threshold").
- **Moran (MC5, MC6).** `s4-agree` is a new Python block.
  - **The pairs, in the block itself** (MC5): per grid, it reads `s4_neighbours` and builds `DistanceBand(threshold=2·edge, binary=True)` from the same cells, and asserts the two pair sets are equal. On a difference it exits 1, naming the grid and its first 5 differing pairs. A learner sees the same check by running the block.
  - **Its result:** per grid, `edge_m | n | pairs | I | E[I] | Var_norm | z_norm`, the statistics from esda, printed with `repr(float)`.
  - **The TS gate** (MC6) checks these against `s4-moran-sql`'s rows: a row for each grid, n equal, and each statistic within 5e-7 and the same as a 6-decimal string. The DoD's 5 km grid is the 5000 m row; the 10 km row is checked too.
- **Gi\*.** `s5-gistar`'s row equals `s5-gistar-pysal`'s data line.
- **LISA.** `s5-lisa-sql` (a new PostGIS block) counts cells per quadrant from z and the row-standardized lag. The counts equal `s5-lisa`'s `cells` column (185, 230, 557, 122).
- **Zonal.** `s6-zones`' shown rows against `s6-geopandas`' `eco_id | km2 | records` lines: the same records, km² within 1.

#### 7. Pages
- **A `python` branch in `module-html.ts`:**
  - the code, read-only, with Copy and Lab schema;
  - the recorded result, or the untested reason;
  - "In `<page>.py` and `<page>.ipynb`, with the blocks it runs after."
  - `PageContext.download` becomes `downloads: {sql?, py?, ipynb?}`, from `pageDownloads` (§5) through `learnPages`. A PostGIS block links `sql`; a Python block links `py` and `ipynb`. A missing kind throws, naming the block, as `module-html.ts:137` does today.
  - A Python exercise shows its answer as a PostGIS one does: Show answer around the code and the result.
- **The versions line** (once per page, before its first lab block): today's text, plus `; Python <v> with requirements.txt sha256 <12>` on pages with Python blocks.
- **`setup.html`:**
  - the Python section: 004 §3.3's uv commands for Windows and Linux/macOS, the environment, the ipykernel note, links to `requirements.txt`, `setup.py` and `setup.ipynb`;
  - the blocks `py-connect`, `py-smoke` and `gpkg-export`;
  - the arcpy notes (§3.4) with `arcpy-moran` (untested);
  - the tools table's Python row.
- **`curriculum.json`:** each of s1–s6 and e1–e5 is set `built` in the commit that adds its page.

#### 8. Modules and the review items
Each module has:
- **concept**, **worked example**, **lab**, **result**;
- an **exercise** with its answer: `<id>-ex`, ran;
- a **check**;
- **dialects**: the ArcGIS Pro tool and its parameters in prose, plus an untested arcpy block only where it shows something prose can't.

Every 004 block keeps its id and its result, except where this table says otherwise. Every map, hot spot and ratio is worded as records.

| Module | New or changed blocks | Review item |
|---|---|---|
| s1 | as 004 | — |
| s2, s3 | as 004 | — |
| s4 | + `s4-agree` (§6). `gpkg-export` lands on the setup page in this step, since it reads `s4_cells`. | Moran gate |
| s5 | + `s5-lisa-sql` (§6) | Gi\* and LISA gates |
| s6 | `s6-habitat`: untested → ran, a new result | — |
| e1 | **`e1-fetch`** (new, prints nothing): a whole-file retry.<br>- a fresh `.part` on each attempt;<br>- retries 429, 5xx and dropped connections, waiting 1, 2, 4, 8 s;<br>- `Retry-After` honoured, up to a cap.<br>**`e1-checksum`**: runs after `e1-fetch`; its result changes (finding 4).<br>**`e1-retry`** (new): a local `http.server` thread fails on a script: a cut body, then a 429 with `Retry-After: 1`, then the file. It prints each attempt, never a port.<br>**`e1-decide`** (new): the reconcile rule, in the repo's `decideDownload` shape.<br>- no intent → POST;<br>- a known key → resume;<br>- no key → list, then adopt the one matching download created since the intent;<br>- none or several → refuse.<br>It prints four canned cases.<br>**`e1-submit`** (stays untested), rewritten: an intent file, `e1-decide`, `Retry-After`, a polling deadline, and `e1-fetch` for the zip. | e1 |
| e2 | **`e2-geopandas`**:<br>- `# after: py-connect`, with `create_engine(…, creator=connect)`;<br>- `to_postgis(schema="learn_curriculum")`;<br>- the check reads `learn_curriculum.devil_buffers`, and the table's namespace from `pg_class` before the rollback; it prints and asserts it;<br>- the result changes.<br>**`e2-copy-fails`** (new): an extra field, a NUL byte and bad UTF-8; each COPY fails, printing its SQLSTATE and COPY's line number.<br>**`e2-casts`** (new): `pg_input_is_valid` checks before `INSERT_TYPED`, reporting the gbifID, column and value.<br>**`e2-typed`**: a comment and the prose say the license mapping is illustrative, not §4.2's effective-license pipeline. | MF5; e2 |
| e3 | **`e3-pick`, `e3-pick-pg`**: order by md5, then id; results unchanged.<br>**`e3-rerun`** kept, result unchanged. It is taught as a batch ledger: right for immutable batches, wrong for snapshots.<br>**`e3-snapshot`** (new, `# after: py-connect`, a TEMP target and a TEMP state table):<br>- **the job key** is one sha256 over four parts, as canonical JSON (sorted keys, no spaces): the input's sha256, `TRANSFORM_VERSION`, the config (what shapes the rows: the cap and the license filter, never a connection setting) and `SCHEMA_VERSION`. The state row keeps the key and its parts;<br>- **each load is one transaction:** it replaces the target's rows and upserts the state row together, so the key never describes other rows;<br>- it prints one line per run (the input, which part of the key changed, loaded or skipped): A loads; A skips; B loads; A loads, so the target holds A, while the ledger rule beside it (e3-rerun's) leaves B; A with a changed config loads; A with `TRANSFORM_VERSION` bumped loads; A with `SCHEMA_VERSION` bumped loads; A again skips (RF1–RF3).<br>**The prose** separates SC8's three ideas: deterministic output (`e3-pick`), idempotent batch application (`e3-rerun`), and "the target holds snapshot X" (`e3-snapshot`).<br>**`e3-membership`** (new, PostGIS):<br>- the md5 cap is repeatable on the same input;<br>- a newly eligible low-hash id displaces a capped species' highest-hash record.<br>**The case-study text:** stale means the request changed. | SC8 e3 |
| e4 | **`e4-quarantine`** (new, PostGIS, on made-up rows):<br>- uncertainty that is negative, NaN or Infinity;<br>- 0, 0 coordinates, rejected as this dataset's rule;<br>- a year after the download.<br>The report keeps the key, the check and the value.<br>**Prose:** the capped sample is neither abundance nor unbiased effort.<br>**`e4-checks`** unchanged. | e4 |
| e5 | **`e5-job`** kept and labelled a simulation, in comments and prose only, so its result stays. Its docstring and Expected are fixed to match the redirect.<br>**`e5-refresh`** (new, prints nothing) writes `refresh.py`, the real job, from one string:<br>- it checks the PG* settings by name only, never logging a value. It never sets `application_name`, so its sessions keep the inherited `PGAPPNAME` (§2, §4.6);<br>- it reads `LEARN_BASE`, `REFRESH_SCHEMA` (default `etl`) and `REFRESH_LICENSES` (the licenses it keeps; default `CC0 1.0,CC BY 4.0`), and qualifies every name with the schema;<br>- **the job key** has e3's four parts: the manifest's sha256 for `datasets.csv`, `TRANSFORM_VERSION`, the config (`{file, licenses}`, the licenses sorted; never a connection setting) and `SCHEMA_VERSION`;<br>- in one transaction:<br>&nbsp;&nbsp;- `pg_try_advisory_xact_lock(hashtext('refresh:' \|\| schema))`; busy: log it, exit 0;<br>&nbsp;&nbsp;- the state row's key compared under the lock; equal: log "unchanged", exit 0;<br>&nbsp;&nbsp;- the file fetched and its sha256 verified;<br>&nbsp;&nbsp;- `COPY` into a TEMP staging table, its row count checked against the manifest;<br>&nbsp;&nbsp;- `TRUNCATE` the target and insert the rows the config keeps;<br>&nbsp;&nbsp;- upsert the state row (the key and its parts);<br>&nbsp;&nbsp;- COMMIT. The replacement and the key commit together or not at all;<br>- on any error: rollback, the reason on stdout, the traceback on stderr, exit 1.<br>**`e5-runs`** (new, after `py-connect` and `e5-refresh`) creates `learn_e5` with the target and state tables. It then runs `python -I refresh.py` as separate processes, in the block's environment (so `PGAPPNAME` is inherited; case 8 drops only `PGDATABASE`):<br>1. A loads: 400 rows;<br>2. A again: skipped (the state persisted);<br>3. A with `REFRESH_LICENSES=CC0 1.0`: the input is unchanged and the config changed, so it loads 124 rows;<br>4. B, a local `file://` snapshot with one title changed: loads;<br>5. C, a new file with one row added whose manifest still gives B's row count: exit 1, and the target and state are still B, read on the block's own connection;<br>6. with the lock held by the block: the run skips, exit 0;<br>7. A, two invocations started together (`Popen` twice): both exit 0, and exactly one loads. They print as the sorted pair `loaded`, `not loaded`, because which one wins, and whether the other met the lock or the new state, varies. The target and state are A after, so A, B, A leaves A;<br>8. without `PGDATABASE`: exit 1, naming the variable.<br>It prints one line per run (the exit code and the job's log line), never a path, port, pid or time. It drops `learn_e5` in `finally` (RF1, RF2, RF4–RF7).<br>**Prose:** bump `TRANSFORM_VERSION` when the code's output changes and `SCHEMA_VERSION` when the target's DDL does. With the redirect, cron mails nothing. `refresh-failed.service` only writes to the journal and alerts nobody until its `ExecStart` sends mail or a push. | SC8 e5; e5 |

The e-blocks write only TEMP tables, roll back, or use a `learn_` schema they drop (004 §5.5's intro says so). learn:check runs every lab as `critwire_lab`: the role guard (§4.1) and MF5.

#### 9. Diagrams
`.diagram-design` exists with `profile: critwire`, so it is reused and there is no first-run gate. Three diagrams, each light and dark, in system fonts, with the `<title>` as the alt text:
- `s4-band` (s4): a hexagon's ring distances √3·e and 3·e, and the 2·e band between them;
- `e2-load` (e2): file → text staging → typed → checks → one COMMIT or ROLLBACK;
- `e5-refresh` (e5): lock → compare the key (input, transform, config, schema) → fetch → verify → stage and count → replace + state → COMMIT; an unchanged key or a held lock skips; a failure rolls back.

Each is exported with `export_svg.py --system-fonts` and checked with `self_check.py --offline`. The build's diagram checks apply as for L2's and L3's.

#### 10. E2E
**`learn-labs`.** The existing tests are reshaped first. Today the first test (`learn-labs.spec.ts:28–57`) loops over every download and checks every PostGIS block of its page against it, so it would fail once s4 also has `s4.py` and `s4.ipynb` (Fable MF3).
- **By `Download.kind`:**
  - `sql`: the PostGIS blocks against the page's `.sql`, their `.download a` href equal to it (today's checks, unchanged);
  - `py`: the Python blocks against the page's `.py`, their links to its `.py` and `.ipynb`;
  - `ipynb`: its cells against the `.py` (below).
  - Every download is still fetched and equal to `d.text`.
- **The versions-line test** (`:59–81`) covers pages with any lab block, and expects `; Python <v> with requirements.txt sha256 <12>` where the page has a Python block.
- **New checks:**
  - each Python block's page code equals its segment of the served `.py`;
  - an untested block is commented out under its reason in the `.py`, and is a Markdown cell (never a code cell) in the `.ipynb`;
  - every `.ipynb` code cell equals its `.py` segment, in order, and cell ids are unique;
  - each download that names `s4_cells` or `s4_neighbours` has `s4-cells` right after `pg-session` or `py-connect`;
  - a Python block's shown result equals `checked/<id>.txt`;
  - `/learn/labs/requirements.txt` equals the repo's labs file;
  - every download link on a page returns 200.

**`learn-screens`:** s4, s5 and e2 at 1280 and 375 px.

E2E runs no Python (learn:check does). The browser blocks `s1-basis`, `s1-dominance` and `e3-pick` run in `learn-browser` as today.

#### 11. 004 and AGENTS.md
- **004**, each change landing with its code:
  - §0: Python `# after:` and the py-connect helper;
  - §3.3: two requirements files, each checked by the command that needs it, the macOS 14 check, `ipykernel`;
  - §5.4 and §5.5 in full;
  - §7.3: `.py` and `.ipynb`; `arcpy-moran` commented out in `setup.py`;
  - §7.5: `site/learn/sql/<id>.py`, versions, freshness;
  - §7.6: `LEARN_BASE=file://`, the Python stage, the role guard, Python cleanup (the run id, this database only);
  - §7.7: learn-labs;
  - §9's L4 row.
- **AGENTS.md:**
  - Stack: the venv is used by the labs and learn:check too; the split requirements files; each command checks its own file's pins (§1);
  - Learn files: `sql/<id>.py`;
  - Commands: learn:check's Python stage and its venv and role checks. `pnpm test` reads "offline, no database; the Python engine's process tests need `/usr/bin/python3.12`", in place of "pure, offline";
  - State: s1–s6 and e1–e5 built.

#### 12. DoD audit (Verification input)
The audit runs on the final commit, after `pnpm build`.
- **dist,** against `baseline-sha256-dist.txt`:
  - byte-identical: `v1/**`, `index.html`, `learn/data/**` (no data file is added, so `manifest.json` stays), **`learn/assets/**`** (the bundle, finding 9), every baseline `learn/labs/*.sql`, every baseline `learn/diagrams/*`;
  - changed: Learn's HTML pages only;
  - new: the s and e module pages, `learn/labs/<page>.{sql,py,ipynb}`, `setup.{py,ipynb}`, `requirements.txt`, and the three diagrams.
  - Anything else fails the audit, unless a Decision gives its reason.
- **Repository,** against `baseline-sha256-repo.txt`:
  - byte-identical: `data/**`, `contracts/**`, `db/**`, `site/learn/erd/**`, `site/learn/duckdb-ext/**`, every baseline `site/learn/sql/*`, `site/learn/modules/*.html` and `site/learn/labs/checked/*.txt`, and the bundle's inputs (`site/learn/src/**`, `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts`, `scripts/build/licenses.ts`);
  - changed on purpose: `site/learn/labs/requirements.{in,txt}`, `checked/checked.json`, `site/learn/curriculum.json`, `site/learn/pages/setup.html`, `package.json` (`learn:venv`), the scripts and tests the units touch, `e2e/learn-labs.spec.ts`, `e2e/learn-screens.spec.ts`, `AGENTS.md`, 004 and this plan;
  - new: `scripts/ingest/requirements.{in,txt}`, the new block files, results, modules, diagrams and scripts.
  - The audit lists every changed baseline file outside "changed on purpose", and each needs a reason under Decisions.
- **The venv:** §1's checks, including the labs file alone in a fresh venv.

### Failure cases, written as tests before the code
**Engine** (`scripts/learn/python.test.ts`: offline and with no database. Its process tests use `/usr/bin/python3.12`, so no venv is needed. PY4, the round trip and V1's probe half and V4 are in `python.dbtest.ts`, since test:db already needs the venv):
- **PY0** Without `/usr/bin/python3.12`, `python.test.ts` gives one failing test, "/usr/bin/python3.12 is missing: the engine's process tests need it (so does pnpm learn:venv)", and its process tests don't run. There is no spawn ENOENT per test.
- **PY1** A `.py` block with no `# q:` or `# status:`, an unknown header, a bad `# timeout:`, no code, or an unknown status fails, naming the file and line.
- **PY2** The block runs `-I` from an empty cwd. Its code file is outside the cwd, HOME is its own empty folder, and a planted `json.py` (in the cwd or beside the code) isn't imported.
- **PY3** Its environment is exactly PATH, HOME, the lab target's PGHOST, PGPORT, PGUSER, PGDATABASE (and PGPASSWORD when the URL has one), `PGOPTIONS=-c search_path=pg_catalog`, PGAPPNAME (the run's `critwire-learn-check-py-<12 hex>`), MPLCONFIGDIR (outside the block's cwd and HOME) and LEARN_BASE. GBIF_*, DATABASE_URL and LEARN_PG_URL never reach it. A child process the block starts sees the same PGAPPNAME.
- **PY4** (db) A connection without the helper fails with `relation "species" does not exist`; through the helper, `SHOW search_path` is `learn_curriculum,public`.
- **PY5** `# after:` takes an earlier Python block of the page or py-connect. An unknown, later, self, other-engine or untested id is refused. The code runs in page order, py-connect first.
- **PY6** Stdout that differs from the recorded result fails with a line diff; a missing result says "run --update".
- **PY7** A non-zero exit fails, quoting stderr's last 5 lines, and the run goes on.
- **PY8** A block over its timeout fails; its process group is killed, with no child left (pgrep); the run goes on.
- **PY9** `--update` runs each block twice. Different stdout fails, and nothing is written.
- **PY10** The rendering is `-- result: <id> · python · sha256 <12 of stdout>` plus stdout less one final newline; `"a"` and `"a\n"` differ.
- **PY11** A ran Python block whose text sets `application_name` is refused, naming the file and line.

**SC7, cleanup** (`py-runner.dbtest.ts`, under the lab lock):
- **PYC1** A block that commits a `learn_t_` schema and exits 0 fails ("committed …; the runner dropped it"), and nothing is left.
- **PYC2** The same, then a raise: the same, plus the exit failure.
- **PYC3** A block that commits a table into `learn_curriculum` fails, naming it, and the run stops there.
- **PYC4** A block that starts a background process holding an open transaction, then sleeps past `# timeout: 1`: no process left, no session with the run's name, no temp folder, and the next block runs.
- **PYC5** An abort during a Python block rejects with its reason. The process group and temp folders are gone, cleanup ends the sessions and sweeps the lab role's `learn_` objects, and the lock is free.
- **PYC6** A `.py` download that exits non-zero midway is named with stderr's tail; the leak check still runs and `checked.json` isn't written.
- **PYC7** Ownership. Three idle lab-role sessions are open while a run's cleanup and check (b) run:
  - one with this run's name in another database (`withScratchDatabase`);
  - one with another run id in this database;
  - one with this run's name in this database.
  - The first two survive. The third is ended and named.
- **PYC8** A lab-role session in this database named `critwire-learn-check-py-<another id>` when a run connects: the run refuses before any block, naming its pid and the command to end it, and the lock is free afterwards.

**Assembly** (`assemble.test.ts`, `notebook.test.ts`):
- **AS1** Every existing page's `.sql` is unchanged, compared byte for byte with the build; also a Verification sha256 check.
- **AS2** In the `.py`:
  - py-connect comes first;
  - a boot block follows it when a block names `s4_cells` in a string, and not when only a comment does;
  - an untested block is commented out, brings no `after` blocks and doesn't count towards the boot.
- **AS3** The notebook's code cells equal the `.py` segments; untested is Markdown, never code; ids are unique; the same input gives the same bytes.
- **AS4** Boot SQL holding `"""` or `\` is refused.
- **AS5** A page whose only Python block is py-connect gets no `.py`.
- **AS6** The names: setup gives `pg-checks.sql`, `setup.py` and `setup.ipynb`.
- **AS7** `pageDownloads` gives s4 `{sql: s4.sql, py: s4.py, ipynb: s4.ipynb}`; no kind replaces another, and each download has exactly one kind.

**Gates** (`agree.test.ts`; the neighbour-pair equality is `s4-agree`'s own assert, which runs in learn:check, §6):
- **AG1** A grid row is missing on either side: it fails, naming the grid.
- **AG2** A statistic differs by more than 5e-7: it fails.
- **AG3** The 6-decimal strings differ although the difference is within 5e-7: it fails.
- **AG4** n differs: it fails.
- **AG5** Gi\*'s line differs: it fails.
- **AG6** A LISA quadrant count differs: it fails.
- **AG7** Zonal records differ, or km² differ by more than 1: it fails.
- **AG8** Only one block of a pair is in the run: the gate is skipped.

**Environment and role:**
- **V1** The venv check.
  - Pure (`scripts/venv.test.ts`, `venvProblems`): a missing pin and a wrong-version pin are each refused, naming the package, its pin, what's installed and `pnpm learn:venv`; Python 3.11 or 3.13 is refused; a state with every pin matching passes.
  - Probe (`python.dbtest.ts`, on `.venv-learn`, with fixture requirements files): a pin whose marker is false here doesn't appear; a missing and a wrong-version pin appear with `installed` null and the real version; an installed package the file doesn't list (rasterio, ipykernel) doesn't appear.
- **V2** A superuser lab role is refused.
- **V3** A lab role with CREATE on `public` is refused.
- **V4** `assertVenv(INGEST_REQUIREMENTS)` refuses a fixture ingest file whose rasterio pin isn't installed, and passes on the synced venv. `ingest shapes` and `ingest habitat` call it before their first fetch (one line each, reviewed in the code review).

**Refresh** (004's e3/e5 results, written into 004 before the code; learn:check proves them):
- **RF1** A, B, A leaves the target holding A and the state holding A's key; the ledger rule leaves B (e3-snapshot, e5-runs).
- **RF2** An unchanged input with a changed config reloads; with everything unchanged, the run skips (e3-snapshot, e5-runs 2–3).
- **RF3** An unchanged input with `TRANSFORM_VERSION` or `SCHEMA_VERSION` bumped reloads (e3-snapshot).
- **RF4** A failed load (row count off) exits 1, and the target and state are as before: the replacement and the state commit together (e5-runs 5).
- **RF5** With the lock held elsewhere, the run logs busy and exits 0, changing nothing (e5-runs 6).
- **RF6** Two invocations at once on a changed input: both exit 0, exactly one loads, and the target and state end consistent (e5-runs 7).
- **RF7** A missing PG setting exits 1, naming the variable, never a value (e5-runs 8).

### Review items: where each is done
| Item | Where | How it's verified |
|---|---|---|
| MF5 | §8 e2-geopandas; §4.1 guard | learn:check runs it as `critwire_lab` and prints and asserts the namespace inside the open transaction; V2, V3 |
| SC8 e3 | §8 e3-snapshot (four-part key, one transaction per load), e3-membership, e3-pick | their recorded results: RF1–RF3, displacement |
| SC8 e5 | §8 e5-refresh (four-part key, persisted in the replacing transaction), e5-runs | separate processes, changed input, changed config, failed load, a held lock, two concurrent invocations: RF1, RF2, RF4–RF7 in e5-runs' recorded result |
| e1, e2, e4, e5 corrections | §8; 004 and the page in the same commit | results of e1-retry, e1-decide, e2-copy-fails, e2-casts, e4-quarantine; `learn:port --check all` |
| SC7, Python part | §3, §4.4, §4.6 (run id, this database, stragglers named) | PYC1–PYC8, PY11 |

### Rejected alternatives
- **Publishing the 48-pin file and moving 004 to macOS 15:** it drops macOS 14 learners for a package they never import.
- **A local HTTP server for `LEARN_BASE`:** `file://<dist>` runs the same urllib code with no new module. HTTP's failure paths are tested by `e1-retry`'s own server.
- **Interleaving Python and PostGIS blocks in page order:** no block reads another engine's transient state, so two stages are simpler.
- **`site/learn/labs/<id>.py` (004 §7.5):** a second block folder for every reader and for port; `.m` and `.dax` already share `sql/`.
- **Executing notebooks (nbclient, ipykernel) in learn:check:** more pins. Cells equal the `.py` by construction, and E2E proves it.
- **Porting the spike's Python unittest gates (`tests_py`):** `pnpm test` would then need the venv. TS gates over recorded results are pure.
- **Fixing e3-rerun, e5-job and e4-checks in place:** their hashes are in the DoD. New blocks teach the fix beside the labelled original.
- **Running the e5 job in-process on two connections:** that doesn't show what a scheduler does, which is separate invocations.
- **Comparing each `.py` download's stdout with its blocks' results:** an exercise's `# after:` re-prints its lesson's output, so the concatenation isn't the recorded results. 004's rule (exit 0) and the release smoke on `s4.py` suffice.
- **A new Windows handoff item for Python:** each platform's resolution is checked with `--no-build`, and 004 §10 item 8's two checks stand.
- **Requiring the exact union of both files' pins (the first draft of §3):** it refuses the learner's documented labs-only venv and an editor-installed `ipykernel`.
- **A PEP 508 marker evaluator in TS, so V1 is pure:** it reimplements `packaging`, which the venv already pins.
- **Ending Python sessions by role and a fixed `application_name`:** `pg_stat_activity` spans databases and the lab lock doesn't, so one run could end another's (Astra MF2).
- **Pair equality in the TS gate:** `s4-agree` would have to print every pair. The block asserts them itself, where a learner sees it too.
- **`s4-agree` re-running the Moran SQL in Python, comparing everything itself (Fable SC1 in full):** it copies `s4-moran-sql`'s 30-line query into a string. The TS gate reads both recorded results instead.
- **A test hook in `refresh.py` to force the overlap order:** the teaching job would carry test code. RF6 prints the order-free outcome, and RF5 forces contention without one.

### Work units and budget
**Order constraint:** `s4-cells` (the boot block) is on s4's page, and s2, s3, s5 and `gpkg-export` read its tables. So **s4 is built before s2, s3 and s5**.

Rough units (the planner writes the Steps):
1. The venv split and `scripts/venv.ts`, with the ingest commands' call (§1; finding 2; V1, V4 first).
2. The block model and port (§2; PY1, PY5, PY10, PY11 first). The setup page's `py-connect` and `py-smoke` port in this step.
3. The engine (§3; PY0, PY2, PY3, PY7, PY8 first).
4. learn:check's Python stage (§4.1–4.4, 4.6, 4.7; PY4, PY6, PY9, PYC1–PYC5, PYC7, PYC8, V2, V3 first; finding 3).
5. Assembly and downloads, the build's files, Python on pages and the versions line, and `learn-labs`' reshaping by kind (§5, §4.5, §7, §10's first two items; AS1–AS7, PYC6 first).
6. The gates (§6; AG1–AG8 first).
7. s1.
8. s4, with `s4-agree` and `gpkg-export`.
9. s2.
10. s3.
11. s5.
12. s6.
13. e1.
14. e2.
15. e3 (RF1–RF3 in 004 first).
16. e4.
17. e5 (RF1, RF2, RF4–RF7 in 004 first).
18. The diagrams: one unit, or each with its module.
19. E2E completion and screenshots.
20. AGENTS.md, the 004 pass, and the DoD audit (§12).

That is about 20–23 units, since 4 and 5 may split.

**Budget:**
- 5 sessions are used (log, at Revision), and 1 stage is left (Steps). The revision adds tests and block lines but no unit.
- About 22 step units.
- The code review plus up to 2 fix steps, Verification, Summary and Release: about 6.
- **Total: about 34 of the 48-session cap.**
- If the count passes 40 before the code review: one diagram (`e5-refresh`) and no zonal gate. No Goal deliverable is cut.

### Decisions (to copy under Decisions)
- **D1 Two requirements files** (labs = 004's 44 pins, published; ingest = rasterio, constrained by the labs file), one venv synced from both. Reason: rasterio breaks macOS 14 arm64 with `--no-build` (checked), and learners don't import it. The DoD's `uv pip sync --no-build requirements.txt` / `uv pip check` line is read as both files, plus the labs file alone in a fresh venv (§1).
- **D2 `ipykernel` isn't pinned.** Reason: notebooks aren't run by learn:check, and the editors install it on demand.
- **D3 Python blocks live in `site/learn/sql/<id>.py`,** not `labs/`. Reason: one block folder for every reader and for port.
- **D4 `py-connect` is a course-wide helper for `# after:`.** Reason: 004's blocks name it from every page.
- **D5 `arcpy-moran` is commented out in `setup.py`/`.ipynb`,** like every untested block. Reason: one rule, no special case.
- **D6 learn:check sets `LEARN_BASE=file://<dist>`.** Reason: it tests the build being checked, offline, with no server.
- **D7 learn:check refuses a superuser lab role, or one with CREATE on `public`.** Reason: MF5 must be enforced, not incidental. The owner's WSL needs `--setup` once.
- **D8 `e1-checksum`'s result changes.** Reason: L1's zstd `occurrences.parquet` (454,202 B).
- **D9 `e2-geopandas`' result changes.** Reason: MF5, the assigned review item, wins over "keeps its sha256".
- **D10 `e3-rerun`, `e5-job` and `e4-checks` keep their results;** new blocks carry the SC8 and teaching fixes. Reason: DoD hashes.
- **D11 The e5 job is written to `refresh.py` from one string and run as separate processes.** Reason: the only honest way to test what a scheduler runs.
- **D12 The agreement gates are TS over the run's results,** with the new `s4-agree` (esda at full precision; it asserts the neighbour pairs itself) and `s5-lisa-sql`. Reason: MC5, MC6 and "Gi\* and LISA tested against esda" become recurring and pure, with no SQL copied into Python.
- **D13 The Python stage runs after the PostGIS one,** and results are written once both pass. Reason: one result path, no cross-engine state.
- **D14 A `.py` download's check is exit 0,** plus the release smoke on `s4.py`. Reason: 004 §7.6, and `# after:` re-prints.
- **D15 Three diagrams** (`s4-band`, `e2-load`, `e5-refresh`). Reason: geometry and flows teach better drawn than in prose.
- **D16 No new Windows handoff item.** Reason: per-platform resolution is checked, and 004 §10 item 8 stands.
- **D17 Python sessions carry `PGAPPNAME=critwire-learn-check-py-<run id>`** (12 hex, one per learn:check run, inherited by every process a block starts). Check (b) and cleanup end only sessions of this database, the lab role and this name. An earlier run's session in this database is named at connect and the run refuses. A ran Python block may not set `application_name`. Reason: SC7, since their pids are unknown. The lab lock is per database and `pg_stat_activity` spans the cluster, so only the run id and the database filter prove that a session is this run's (Astra MF2).
- **D18 Each command checks its own requirements file's pins:** learn:check the labs file, `ingest shapes`/`habitat` the ingest file. Each pin present at its version, markers evaluated, extras ignored. Reason: a labs-only venv (004 §3.3, the setup page, the owner's WSL) and an editor-installed `ipykernel` are valid lab environments (Fable MF2, Astra MF1).
- **D19 A refresh's identity is one key over input, transform version, config and schema version,** committed in the transaction that replaces the target (e3-snapshot, e5's `refresh.py`). Reason: SC8 names all four, and without config a config-only change would skip (Astra MF3).
- **D20 The browser bundle's inputs stay byte-identical:** `site/learn/src/`, `site/learn/sql/setup.sql`, `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts`, `scripts/build/licenses.ts`. The DoD audit compares `dist/learn/assets/` with the Baseline list. Reason: esbuild hashes them into `app-<hash>.js` (Fable MF1).

## Architecture review (Fable)

Verdict: APPROVE WITH CHANGES

Fable 5.1, 2026-10-29, on `32095ff`. Findings 1–10 checked against the code: every cited line holds (`blocks.ts:108`, `port.ts:99–103`, `runner.ts:258,577–617`, `freshness.ts:27,68,86`, `course.ts:257–263`, `assemble.ts`, `site.ts:67–71`, `module-html.ts:33,193–195`, `pg.ts:89–97` childEnv, `cleanup.ts:86–101`, `check.ts:182–221`, `erd-model.ts:229–231`, `lab.mmd:4`). Also checked today: `critwire_lab` is `rolsuper = f`, `has_schema_privilege(…,'public','CREATE') = f` (V2/V3 pass as is; `setup.ts:90` already refuses CREATE on public, so D7's "run --setup" message leads somewhere); the manifest's `occurrences.parquet` is 454,202 B / `35ca89f9bee3` (finding 4, D8 right); `s4-moran-sql`'s result (004:7177–7178) prints full-precision floats, so the TS Moran gate over rendered results is at the spike's precision; `readTables` on `learn_curriculum` costs 1.6 s (§4.4d's per-block reading adds about a minute, fine); `uv pip sync` takes several `<SRC_FILE>`; `/usr/bin/python3.12` exists. Finding 2's per-platform resolutions weren't re-run here (network); accepted as "checked". The review items (MF5, SC8 e3/e5, the e1/e2/e4/e5 corrections, SC7) each have a block or test that proves them; nothing is dropped. The design meets the brief's Scope and DoD, with the three deviations D8, D9 and D3 recorded.

### MUST-FIX

1. **The browser bundle's inputs outside `site/learn/src` must stay byte-identical, or `learn/assets/` changes and the DoD's dist sha256 audit fails.** Evidence: `site/learn/tsconfig.json:14` includes `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts` and `scripts/build/licenses.ts`; `site/learn/src/{check,cards,isolation,engine,csv,results}.ts` import them, so esbuild hashes them into `learn/assets/<hash>.js`. Finding 9 ("`site/learn/src` must not change") misses them, and §5's per-engine word test and §2's parsing sit next to `codeOnly` in `sql.ts`. Required: state in §5 and §9 that those three files are untouched (the Python word test lives in `assemble.ts`; nothing new goes into `sql.ts` or `cell.ts`), and add to the DoD audit a sha256 check of `dist/learn/assets/` against the Baseline list (same as AS1 for the `.sql` files).
2. **`venvState()` (§3) is stricter than the environment the design itself prescribes.** It refuses any installed set that isn't the union of both requirements files, but: 004 §3.3 and the setup page tell a learner (and the owner on WSL, 004 §7.6) to `uv pip sync` the labs file only, so rasterio is absent; and §1/§7 say editors add `ipykernel` on demand. Both leave `learn:check` refusing a working venv until `pnpm learn:venv` is re-run after every notebook session. Required: the check proves the labs file's pins (each present, exact version; a missing or wrong one is refused, naming it and `pnpm learn:venv`) and ignores packages outside it. V1 changes to "missing or wrong-version is refused; an extra isn't". Keep the message when rasterio is missing for `ingest habitat` where that command runs, not here.
3. **`e2e/learn-labs.spec.ts`'s first test breaks as written once a page has more than one download.** Evidence: `learn-labs.spec.ts:36–53` loops over `assembleDownloads(pages)` and, for each download, asserts every PostGIS block's `.download a` href equals `/learn/labs/<that download>` and that its code is in that file; with `s4.py` and `s4.ipynb` in the list, the PostGIS blocks of s4 fail against the `.py`. §10 lists the new checks but not this reshaping. Required: §10 says the existing test iterates by `Download.kind` (SQL blocks against the page's `.sql`, Python blocks against its `.py`/`.ipynb`), and that `pages.ts`'s `downloads` map carries all kinds.

### MISSED

- **matplotlib's font cache is rebuilt per block** under §3's fresh empty HOME (several seconds for each block that imports it); finding 9 says "to measure". Give the run one `MPLCONFIGDIR` folder, outside every block's cwd, still inside the run's temp folder, and keep PY3's environment list exact (add it there).
- **`pnpm test` is documented "pure, offline" (AGENTS.md)** and PY2/PY3/PY7/PY8 spawn `/usr/bin/python3.12`. Offline holds; "pure" doesn't. A machine without `python3.12` must fail those tests with one clear message naming it, not a spawn ENOENT per test; update AGENTS.md's wording in §11.
- **`refresh.py` (e5) must not set `application_name`**, so its sessions keep the inherited `PGAPPNAME` and §4.6's cleanup catches them; say so in §8's e5 row.
- **The DoD audit** should list the repository files that change on purpose (`site/learn/labs/requirements.{in,txt}`, `scripts/ingest/requirements.*`, `checked/*.txt`, `checked.json`, `e2e/learn-labs.spec.ts`, AGENTS.md, 004) against `baseline-sha256-repo.txt`, and the dist list "unchanged except pages, plus the new `learn/labs/*.py|ipynb|requirements.txt`"; and the DoD's `uv pip sync --no-build requirements.txt` / `uv pip check` line now names both files.

### SHOULD-CONSIDER

1. **Simpler Moran gate:** let `s4-agree` read `s4_neighbours` and `s4-moran-sql`'s statistics from the database itself, compare in Python and exit non-zero on a mismatch, printing both sides. That ports `compare.py` as "a block" (DoD allows it), runs on a learner's machine too, and removes `agree.ts`'s result parsing for that pair. AG1–AG4 become the block's own failure cases. The Gi\*, LISA and zonal gates over rendered results are fine either way.
2. §4.7 puts `pg-session` into every Python block's key; Python never runs it. Harmless, but drop it so an edit to `pg-session` doesn't re-stale every Python result.
3. §4.4(d) reads `learn_curriculum` after every Python block (1.6 s each, about a minute for 35). Fine as designed; if the budget tightens, read once per page instead.
4. D5 (`arcpy-moran` commented out in `setup.py`) deviates from 004 §7.3's "in no download" for simplicity, not because code proved 004 wrong; the brief's decision rule allows it only with 004 updated in the same commit (§11 lists it): keep that.
5. Finding 3's fix runs every boot block in `--module` mode and compares their results; say in §4.2 that a `--module` run also prints them, so an owner iterating on s2 sees `s4-cells` go by once.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Environment contract conflicts (§3).** Requiring the exact union of lab and ingest packages rejects the documented learner environment and editor-installed `ipykernel`. Validate required lab pins independently; enforce ingest dependencies only for ingestion.
2. **Cleanup can terminate another database’s run (§4.6).** Advisory locks are database-local; `pg_stat_activity` spans databases. A shared role/application name does not establish session ownership. Scope termination to the target database and a unique run identifier, inherited by subprocesses.
3. **Refresh identity omits configuration (§8, e3/e5).** The assigned SC8 requirement includes input, transform, configuration and schema version. Define one identity covering all four and persist it atomically with the target replacement. Otherwise configuration-only changes can incorrectly skip refresh. Verify unchanged input with changed configuration reloads.

SHOULD-CONSIDER:

1. Test two actual concurrent refresh invocations; holding the lock externally tests contention but not their complete interaction.
2. Keep SQL, Python and notebook download validation explicitly separated by artifact kind.
3. Preserve the browser bundle’s shared imports as well as `site/learn/src`; verify asset hashes against baseline.

## Revision notes

Architect, 2026-10-29, on `0d9c7a9`. Every MUST-FIX is resolved by a design change; none is disputed.

**MUST-FIX**
- **Fable MF1 / Astra SC3 (the bundle's inputs):** done in finding 9, §5, §12 and D20. Verifying it found a fourth input: `site/learn/sql/setup.sql` (`engine.ts:14`), so it is listed too. Nothing new goes into `sql.ts` or `cell.ts`, and the Python word test is in `assemble.ts`. §12 compares `dist/learn/assets/**` with the Baseline list.
- **Fable MF2 / Astra MF1 (the venv check):** done in §1 (`scripts/venv.ts`: the `venvState(file)` probe evaluates markers through `packaging` and reports the listed pins only; the pure `venvProblems` holds the rules), §3, §4.2, V1, V4, D18, and a new rejected alternative. learn:check checks the labs file only. `ingest shapes`/`habitat` check the ingest file before their first fetch. The probe was prototyped on `.venv-learn` (clean).
- **Fable MF3 / Astra SC2 (downloads by kind):** done in §5 (each consumer splits by `kind`; the new `pageDownloads`), §7, §10 (the first `learn-labs` test is reshaped by kind; the versions-line test expects the Python suffix), AS7 and unit 5. It also fixes finding 1's reference (`site.ts:85`, not `pages.ts:132`): today's page → name map would drop all but one download per page.
- **Astra MF2 (cleanup ownership):** done in finding 6, §3 (the run id in `PGAPPNAME`, inherited by subprocesses), §2 and PY11 (no block sets `application_name`), §4.4(b), §4.6 (database + role + run name; one shared query; an earlier run's straggler is named at connect and the run refuses, never killed), PYC7 (another database, another run), PYC8 and D17. Verified: the lab lock is per database (`pg_locks.database`); `cleanup.ts:88` matches the pid and a fixed name today.
- **Astra MF3 (the refresh identity):** done in §8. e3-snapshot and e5's `refresh.py` use one key over input, transform version, config and schema version, committed in the transaction that replaces the target. e5's config is `REFRESH_LICENSES` (CC0 only gives 124 of 400 rows, checked in `datasets.csv`). Also RF1–RF7 (RF2: unchanged input with a changed config reloads), §9, the review-items table and D19. Case C now changes the file, since a manifest-only change with the same sha256 would skip.

**SHOULD-CONSIDER (Astra)**
- **SC1, two concurrent invocations:** taken. e5-runs case 7 and RF6 check the outcome without depending on order. A test hook that forces the order is rejected (rejected alternatives).

**MISSED (Fable)**
- **MPLCONFIGDIR:** done in §3, PY3 and finding 9 (one folder per run, outside every cwd and HOME).
- **`pnpm test` purity:** PY0 gives one clear failure when `/usr/bin/python3.12` is missing. §11 rewords AGENTS.md ("offline, no database; …need `/usr/bin/python3.12`"). The engine's test heading is changed to match.
- **`refresh.py` and `application_name`:** done in the e5 row, and enforced by §2 / PY11.
- **The DoD audit lists and both requirements files:** done in §12 (dist and repo: unchanged, changed on purpose, new) and §1's checks. D1 reads the DoD's sync/check line as both files, plus the labs file alone in a fresh venv.

**SHOULD-CONSIDER (Fable)**
- **SC1, Moran in the block:** partly taken. `s4-agree` asserts the neighbour pairs itself (exit 1 on a difference) and prints esda at full precision. The statistics stay a TS gate against `s4-moran-sql`'s result, because re-running that 30-line query from Python would copy it. Updated: §6, AG1, D12, rejected alternatives.
- **SC2, dropping `pg-session` from Python keys:** declined. The boot tables Python reads are made in pg-session's session (`runner.ts:162`), so it shapes them (§4.7 says why).
- **SC3, reading `learn_curriculum` once per page:** declined. It costs about 1 min per run, within budget, and a per-block read names the block that wrote.
- **SC4, D5 with 004 updated in the same commit:** kept, as §11 already says.
- **SC5, `--module` prints the boot results:** taken (§4.2).

**Also corrected:** finding 1's `pg.ts:144` → `:89`; the budget line (5 sessions used).

## Steps

Every step:
- `M` = `/srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl`. `B0` = `358abb9` (the Baseline commit). "§n" = this plan's Target design; "D<n>" its Decisions.
- **First** = failure cases written and run red before the code (Log: `red n → green n`). No test after its code. E2E cases for a feature land in the step that builds it, before its code.
  - Test ids: where the architecture's id is already taken in the file, it is renumbered: in `assemble.test.ts` (AS1–AS10 exist) the architecture's AS1–AS7 are **AS11–AS17**, in order. The planner's added cases are **BF1** (`check.test.ts`), **FR10–FR12** (`freshness.test.ts`), **MH10–MH14** (`module-html.test.ts`), **PT10–PT13** (`port.test.ts`), defined in their steps.
- **Checks**, one heavy job at a time (never two of build, test:db, learn:check, e2e at once: test:db and learn:check share the lab lock). No lint script; `pnpm typecheck` is the static check.
  - `T` = `pnpm typecheck && pnpm test`.
  - `B` = plain `pnpm build`.
  - `D` = `B`, then `pnpm test:db` (≈ 11 min; needs `.venv-learn` from S1). While iterating: `pnpm exec tsx --test --test-concurrency=1 <file>.dbtest.ts`.
  - `L` = `pnpm build --draft && pnpm learn:check && pnpm build`: a whole run re-stamps `checked.json`; `git status --porcelain site/learn/labs/checked` shows `checked.json` only. Any step touching learn:check's import closure, `requirements.txt` or a block needs it (every lab's key moves).
  - `LU` = `pnpm build --draft && pnpm learn:check --update && pnpm build` (each block runs twice, PY9), then `P`: the only differences are the step's new blocks. Copy each new `checked/<id>.txt` into its 004 result fence; `P` again = 0. `git status --porcelain site/learn/labs/checked e2e/__snapshots__` lists only the step's new results and `checked.json`.
  - `E` = `B`, then `pnpm e2e`; `jq .stats e2e-artifacts/results.json`: 0 unexpected, 0 skipped, 0 flaky.
  - `P` = `pnpm learn:port --check all`: 0 differences.
  - `H` = `(cd dist && sha256sum -c $M/baseline-sha256-dist.txt 2>/dev/null | grep -v ': OK$' | grep -vE '^\./learn/((.+/)?index\.html|labs/g1\.sql): FAILED$')` prints nothing: every Baseline `dist/` file except Learn's HTML pages and `learn/labs/g1.sql` (S13's g1-columns filter) is byte-identical (`/v1`, `index.html`, `learn/data/**` with `manifest.json`, `learn/assets/**`, every baseline `learn/labs/*.sql` and `learn/diagrams/*`).
  - `HN` = `comm -13 <(awk '{print $2}' $M/baseline-sha256-dist.txt | sort) <(cd dist && find . -type f | sort) | grep -vE '^\./learn/((spatial-statistics|etl)/[a-z-]+/index\.html|labs/((s[1-6]|e[1-5])\.(sql|py|ipynb)|setup\.(py|ipynb)|requirements\.txt)|diagrams/(s4-band|e2-load|e5-refresh)(-dark)?\.svg)$'` prints nothing: no new `dist/` file outside §12's list.
  - `HR` (repo root) = `sha256sum -c $M/baseline-sha256-repo.txt 2>/dev/null | grep -v ': OK$' | grep -vE '^(AGENTS\.md|package\.json|docs/recovery\.md|plans/(004-learn-curriculum|2026-10-29-critwire-learn-l4-stats-etl)\.md|site/learn/(curriculum\.json|pages/setup\.html|modules/(d4|f4|g1|g7)\.html|sql/g1-columns\.sql|labs/(requirements\.(in|txt)|checked/checked\.json))|e2e/(release/)?[a-z-]+(\.spec)?\.ts|scripts/.+\.ts|scripts/fixtures/learn-port-004\.md): FAILED$'` prints nothing, and `git diff --quiet $B0 -- data contracts db site/learn/erd site/learn/duckdb-ext` exits 0.
  - `A` = `git diff --quiet $B0 -- site/learn/src site/learn/sql/setup.sql scripts/build/learn/sql.ts scripts/learn/cell.ts scripts/build/licenses.ts` exits 0 (D20: the bundle's inputs; `H` then proves `learn/assets/**`). Python code goes in `blocks.ts`, `result.ts`, `assemble.ts`, `notebook.ts`, `python.ts`; Python blocks reuse the existing HTML classes (the CSS is `site/learn/src/learn.css`, a bundle input).
- **Content:**
  - 004 and the site change together: a block or result edit lands in 004 and its file in one commit (`P`). 004's prose sections (§0, §3.3, §7.3, §7.5, §7.6, §7.7) change with the code that makes them true (§11).
  - A ported 004 block keeps its result: a difference is a bug (Failure modes). Designed changes only: `e1-checksum` (D8), `e2-geopandas` (D9); `s6-habitat` and the new blocks are new results.
  - New block: its fence in 004 (`status: ran`) with a provisional result fence (`-- result: <id> · python · sha256 000000000000`; SQL: `-- result: <id> · 0 rows · sha256 000000000000`) so `learn:port` accepts it; `pnpm learn:port <page>`; iterate with `pnpm learn:check --module <page>` (writes nothing); then `LU` records it and its result goes into 004. A new DuckDB block's result comes from `learn-browser`'s run; 004 and `e2e/__snapshots__/<id>.txt` get it together.
  - Copy per AGENTS.md: records, never range (every map, hot spot and ratio is recording effort); plain English for adults new to the topic, each term defined once; no Wikipedia prose; no mission names on public pages; link only built pages.
- **Module step** (S12, S13, S15–S23): 004 §5.4/§5.5's outline becomes the full module in 004 (Concept, Worked example, Lab, Result, Exercise `<id>-ex` with its answer, Check, Dialects: for SQL PostgreSQL/DuckDB/SQL Server as in g1–g7; for Python the ArcGIS Pro tool and its parameters in prose, plus an untested arcpy block only where prose can't show it). Then `pnpm learn:port <id>`, `site/learn/modules/<id>.html` from it, and `curriculum.json` `<id>` `built`, in one commit. A page that says the module is "in preparation" links it (f4 → s1, g7 → s6, d4 → e2). Log each Python block's wall time (S6 prints it); a block over 40 s gets `# timeout:` in 004 and its file together. Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- **AGENTS.md:** a step that changes a command, the venv or a file rule updates that line in the same commit (each session is fresh and reads it). S27 is the final pass.
- **Commit** `S<n>: …` (code + plan), push. A step that finishes a review item adds `<item>: done (S<n>)` under Decisions; S27 adds the shas.
- **Deviations from "Work units and budget"** (S1 records them under Decisions):
  1. Unit 2's port (and with it `py-connect`, `py-smoke`) moves to S10. A ported `.py` file needs a page slot (`readCourse` refuses an unused block file), a recorded run (plain build refuses a stale lab), a download and a page renderer; and once port knows Python, `P` reports setup's Python files missing. S10 is the first step where all of these exist.
  2. Units 4 and 5 are split into S4–S10 (result path and role guard; run id and cleanup; the Python stage; assembly; `.py` downloads in learn:check; pages; setup's Python).
  3. Port's `### 3.3 `/`### 3.4 ` setup sections, `gpkg-export` and `arcpy-moran` land in S14, after s4: `gpkg-export` reads `s4_cells`.
  4. Diagrams after e5: `e5-refresh` first (S24), then `s4-band` and `e2-load` (S25), so the budget rule's cut ("one diagram, `e5-refresh`") drops a whole unit.
  5. The release smoke's `s4.py` run is a test in `e2e/release/live.spec.ts` (S26), reusing `python.ts`, `pg.ts` and the lab lock, so it leaves a Playwright report and traces like the rest of the smoke.
  6. `f4.html`, `g7.html` and `d4.html` (baseline pages) link s1, s6 and e2 once built: AGENTS.md's copy rule, and the brief's DoD allows pages. `HR` lists them as changed on purpose.
  7. `venvState(file, python = VENV_PYTHON)` takes the interpreter, so Verification can probe a fresh labs-only venv.
  8. Each step runs learn:check once (`L` or `LU`); the second whole run is Verification's.
- **Estimate:** 27 steps. With 6 sessions through Steps, the code review, ≈ 2 fix steps, Verification and Release: ≈ 38 of the 48-session cap. Count at each session start: `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl.log`. Past 40 before the code review: drop S25 (Decision). Past 48: the brief's rule (no more review steps; finish Verification and Release; unfinished assigned items become handoff items for L5).

- [x] S1 · The venv split and `scripts/venv.ts` (§1; finding 2; D1, D2, D18)
  - First [T] `scripts/venv.test.ts` (V1, pure `venvProblems`): a missing pin and a wrong-version pin each refused, naming the package, its pin, what's installed and `pnpm learn:venv`; Python 3.11 and 3.13 refused; every pin matching passes.
  - First [D] `scripts/learn/python.dbtest.ts` (new; V1 probe, V4), on `.venv-learn` with fixture requirements files: a pin whose marker is false here doesn't appear; a missing and a wrong-version pin appear with `installed` null and the real version; rasterio and ipykernel (unlisted) don't appear; `assertVenv(<fixture ingest file pinning rasterio at another version>)` throws, and `assertVenv(INGEST_REQUIREMENTS)` passes.
  - Files:
    - `site/learn/labs/requirements.in` without rasterio; in `site/learn/labs/`: `uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in`. `git diff` removes exactly `rasterio`, `affine`, `attrs`, `click` (and their `# via` lines); the file equals 004 §3.3's text fence byte for byte: `diff <(awk '/^### 3\.3 /{s=1} s&&/^```text$/{f=1;next} f&&/^```$/{exit} f' plans/004-learn-curriculum.md) site/learn/labs/requirements.txt` is empty. Any other change: revert and find why.
    - `scripts/ingest/requirements.in` = `-c ../../site/learn/labs/requirements.txt` + `rasterio`; `requirements.txt` compiled the same way in `scripts/ingest/`. The union of both files' pin lines equals `git show $B0:site/learn/labs/requirements.txt`'s 48.
    - `package.json` `learn:venv`: `… uv pip sync --no-build --python .venv-learn site/learn/labs/requirements.txt scripts/ingest/requirements.txt`.
    - `scripts/venv.ts`: `VENV_PYTHON`, `LABS_REQUIREMENTS`, `INGEST_REQUIREMENTS`, `venvState(file, python = VENV_PYTHON)` (one `python -I -c` probe through `packaging` and `importlib.metadata`), `venvProblems`, `assertVenv(file, who)`. `scripts/ingest/python.ts:7` uses `VENV_PYTHON`. `ingest shapes` and `ingest habitat` call `assertVenv(INGEST_REQUIREMENTS, "ingest <s>")` where the command starts, before any fetch or spawn (so the build functions' fake-Python tests are untouched).
    - 004 §3.3: two files (the labs file published, the ingest file never), each checked by the command that needs it, the macOS 14 check, the `ipykernel` note (D2). AGENTS.md Stack/Commands: the split files, `learn:venv` syncs both, `test:db` needs `.venv-learn`.
  - Proof: `pnpm learn:venv`; `uv pip check --python .venv-learn` clean; `.venv-learn/bin/python -I -c 'import rasterio, geopandas, esda; print(rasterio.__version__)'` prints `1.5.2`. Platform check (PyPI): `uv pip compile --no-build --python-version 3.12 --python-platform <p> site/learn/labs/requirements.txt -o /dev/null` exits 0 for `x86_64-pc-windows-msvc`, `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`, and `aarch64-apple-darwin` with `MACOSX_DEPLOYMENT_TARGET=14.0`; `x86_64-apple-darwin` fails on pyproj. Log each.
  - Decisions: the deviations above; D1, D2, D18 in effect.
  - Check: `T`, `pnpm exec tsx --test --test-concurrency=1 scripts/learn/python.dbtest.ts`, `L` (`requirements.txt` is a checker file: every lab re-proved, `checked/*.txt` unchanged), `P`, `H`, `HR`, `A`.
- [x] S2 · The Python block model (§2 without port; PY1, PY5, PY10, PY11 first)
  - First [T]: `scripts/learn/blocks.test.ts` PY1 (no `# q:`/`# status:`, an unknown header, a bad `# timeout:`, no code, an unknown status: each names file and line) and PY5 (`# after:` takes an earlier ran Python block of the page or `py-connect`; unknown, later, self, other-engine and untested ids refused); `scripts/learn/privilege.test.ts` PY11 (a ran Python block setting `application_name`, written files included, is refused naming file and line; `learn_spatial` anywhere in a Python block is refused); `scripts/learn/result.test.ts` PY10 (`renderPython`: `-- result: <id> · python · sha256 <12>`, stdout less one final `\n`; `"a"` ≠ `"a\n"`).
  - Code: `blocks.ts` (`.py` → `engine: "python"`, headers `q|status|after|timeout`, `timeoutS` default 60, `code` vs `text`, `PY_CONNECT_ID`, `lintPage(blocks, bootIds, helpers)`); `privilege.ts` (skips Python like Power BI, but refuses `learn_spatial` and `application_name`); `result.ts` `renderPython`; `course.ts` (`recordedResults` counts ran Python; `assembleCourse` passes the course's helpers; the "no block file" message names `.py`).
  - No `.py` block file is committed yet (deviation 1).
  - Check: `T`, `L` (checker closure changed), `P`, `H`, `A`.
- [x] S3 · The Python engine `scripts/learn/python.ts` (§3; PY0, PY2, PY3, PY7, PY8 first)
  - First [T] `scripts/learn/python.test.ts` (offline, no database, `/usr/bin/python3.12`):
    - PY0: the file checks `/usr/bin/python3.12` once; missing, it registers one failing test "/usr/bin/python3.12 is missing: the engine's process tests need it (so does pnpm learn:venv)" and no process test. Proof: a scratch edit of the path gives exactly that one failure; revert.
    - PY2 (`-I`, empty cwd, code file outside it, own empty HOME, a planted `json.py` in cwd or beside the code not imported); PY3 (the exact environment, `PGAPPNAME` matching `^critwire-learn-check-py-[0-9a-f]{12}$` and seen by a child process, `MPLCONFIGDIR` outside cwd and HOME, no `GBIF_*`/`DATABASE_URL`/`LEARN_PG_URL`); PY7 (`pythonFailure`: non-zero exit quotes stderr's last 5 lines); PY8 (over `timeoutMs`: the group is SIGKILLed, `pgrep` finds no child, the temp folder is gone); the `blockCode` order (its `# after:` blocks in course page order, `py-connect` first, then its own).
  - Code: `pythonEnv`, `blockCode`, `runPython` (`critwire-learn-py-*` temp with `code/`, `cwd/`, `home/`; `detached`; SIGKILL group on timeout, abort and close; `finally` removes it), `pythonFailure`. Not imported by learn:check yet.
  - AGENTS.md: `pnpm test` = "offline, no database; the Python engine's process tests need `/usr/bin/python3.12`".
  - Check: `T`, `H`.
- [x] S4 · One result path, boot blocks first, the lab-role guard (§4.1, §4.2, §4.3's `record.ts`; finding 3; PY6, PY9, BF1, V2, V3 first)
  - First [T] `scripts/learn/record.test.ts` (temp `checkedDir`): PY6 (stdout ≠ recorded fails with a line diff; no recorded file says "run --update"), PY9 (with `update`, two runs that differ fail and nothing is written; agreeing runs write once every outcome passed). `scripts/learn/check.test.ts` BF1: a `--module <page>` run's blocks start with the course's ran boot blocks (page order) not on that page, then the page's; a boot block on the page isn't listed twice; a whole run's list is unchanged.
  - First [D] `scripts/learn-check.dbtest.ts` V2 (a superuser lab connection is refused: "the labs run with a learner's privileges: run pnpm learn:check --setup"), V3 (a scratch `learn_t_` role with CREATE on `public`, the same).
  - Code: `scripts/learn/record.ts` `settleResults` (compare, require agreement, write), moved from `runner.ts:577–617`; `runBlocks` uses it, PostGIS behaviour unchanged. `check.ts`: `staticStage` boot-first (BF1), a `--module` run prints the boot results; `assertLabRole` refuses superuser and CREATE on `public` (D7). 004 §7.6: the role guard.
  - Check: `T`, `D` (runner and learn-check db tests unchanged otherwise), `L`, `P`, `H`, `A`.
- [x] S5 · The run id and Python session ownership (§3's `PGAPPNAME`, §4.4(b)'s query, §4.6; D17; PYC7, PYC8 first)
  - First [D] `scripts/learn/py-runner.dbtest.ts` (new, under the lab lock), sessions opened with postgres.js `connection.application_name`:
    - PYC7: idle lab-role sessions named this run's app in another database (`withScratchDatabase`), another run id in this database, and this run's app in this database: cleanup and the (b) query end and name only the third.
    - PYC8: a lab-role session in this database named `critwire-learn-check-py-<other id>` when a run connects: the run refuses before any block, naming its pid and `select pg_terminate_backend(<pid>)`, and the lock is free afterwards.
  - Code: `check.ts` makes the run id once (`randomBytes(6)`, app `critwire-learn-check-py-<hex>`); `takeLabLock(lab, db, {app})`; `cleanup.ts`: one helper matching `datname = current_database()`, `usename = current_user`, `application_name = <app>`, used by `release()` (after the recorded pids) and later by check (b); the straggler refusal at connect, after the lock. 004 §7.6: Python cleanup (the run id, this database only).
  - Check: `T`, `D`, `L`, `H`, `A`.
- [x] S6 · The Python blocks stage (§4.2 venv check, §4.3, §4.4, §4.7; PY4, PYC1–PYC5, FR10–FR12 first)
  - First [D]: `python.dbtest.ts` PY4 (no helper: `relation "species" does not exist`; through `py-connect`: `SHOW search_path` = `learn_curriculum,public`). `py-runner.dbtest.ts` PYC1–PYC5, plus PY7/PY8's "the run goes on" (a failing or timed-out fixture block, then a passing one: both reported, the second ran).
  - First [T] `freshness.test.ts`: FR10 a ran Python block is stamped, and a missing stamp is stale ("lab <id> is stale"); FR11 its key moves with its own text, a transitive `# after:` block, `py-connect`, any boot block, `pg-session` and `requirements.txt`; FR12 it doesn't move for another page's non-boot block.
  - Code: `scripts/learn/py-runner.ts` `runPythonBlock` with checks (a)–(d), the Python blocks after the PostGIS ones, outcomes through `settleResults` (D13); `LEARN_BASE=file://<abs dist>` (D6); one `MPLCONFIGDIR` per run; `staticStage` calls `assertVenv(LABS_REQUIREMENTS, "learn:check")` before connecting when the run has a Python block or `.py` download; `Versions` gains `python` and `requirements` (12 hex; recorded, never compared); freshness `isLab` and the §4.7 key. learn:check prints each Python block's id and wall time. 004 §7.6: the Python stage, `LEARN_BASE`. AGENTS.md: learn:check's Python stage, its venv and role checks.
  - The course has no Python block yet: `L` runs an empty stage and stamps the new `versions`.
  - Check: `T`, `D`, `L`, `H`, `A`.
- [x] S7 · Assembly: `.py`, `.ipynb`, `requirements.txt` (§5; AS11–AS17 first)
  - First [T] `assemble.test.ts` AS11, AS12, AS14–AS17 and `notebook.test.ts` AS13 (= architecture AS1–AS7): AS11 adding Python blocks to a fixture page leaves its `.sql` byte-identical; AS12 the `.py` order, boot by a string naming `s4_cells` and not by a comment, untested commented out without its `after` blocks or boot; AS13 notebook code cells = `.py` segments, untested as Markdown, unique ids, same bytes twice; AS14 boot SQL with `"""` or `\` refused; AS15 only `py-connect` gives no `.py`; AS16 setup's names `pg-checks.sql`, `setup.py`, `setup.ipynb`; AS17 `pageDownloads` gives s4 `{sql, py, ipynb}`, one kind each.
  - First [E] `e2e/learn-labs.spec.ts`: `/learn/labs/requirements.txt` returns 200 and equals `site/learn/labs/requirements.txt` (red: 404).
  - Code: `assemble.ts` (`Download.kind`, `timeoutMs`, `pageDownloads`, `bootsNeeded` with the Python word test here and SQL's through `codeOnly` unchanged, `pythonCells`, the `.py` writer); `scripts/learn/notebook.ts` (nbformat 4.5, kernelspec `python3`, ids `<id>`/`<id>-md`, `source` as lines, `outputs: []`, `execution_count: null`, sorted keys, 1-space indent, final newline). `site.ts` `writeLearn` writes every kind and copies the labs `requirements.txt`; `learnPages` still gets the `sql` names until S9. Freshness stamps `sql` and `py` downloads; learn:check's downloads stage runs `sql` only until S8.
  - Check: `T`, `L`, `E`, `H`, `HN` (`requirements.txt` new), `A`.
- [x] S8 · learn:check runs the `.py` downloads (§4.5; D14; PYC6 first)
  - First [D] `py-runner.dbtest.ts` PYC6: a fixture `.py` download exiting non-zero midway is named with stderr's tail; the leak check still runs; `checked.json` isn't written.
  - Code: `check.ts` downloads stage by `kind`: `py` on a fresh load (the loader, then `runPython` on the file from an empty folder, the block environment, limit = its blocks' timeouts + 60 s per boot block, exit 0), the leak check after each file; `ipynb` not run. 004 §7.6 (exit 0, as assembled). AGENTS.md learn:check line.
  - Check: `T`, `D`, `L`, `H`, `A`.
- [x] S9 · Python on pages; `learn-labs` by kind (§7 without setup.html; §10's first two items; MH10–MH14 first)
  - First [T] `scripts/build/learn/module-html.test.ts`: MH10 a Python block on a page without a `py` download throws naming the block; MH11 a Python block shows its code read-only with Copy and Lab schema, its recorded result, and links `<page>.py` and `<page>.ipynb`, while a PostGIS block on the same page links `<page>.sql`; MH12 the versions line appears once, before the page's first lab block of either engine, with `; Python <v> with requirements.txt sha256 <12>` only on pages with a Python block; MH13 a Python exercise slot renders Show answer around code and result; MH14 an untested Python block shows `Not run here: <reason>.`
  - First [E] `e2e/learn-labs.spec.ts` reshaped by `Download.kind`: `sql` as today; `py`: each Python block's page code is its segment of the page's `.py`, its links point at that `.py` and `.ipynb`; `ipynb`: fetched and equal to `d.text`. The versions-line test covers pages with any lab block and expects the Python suffix where a page has one. Every download link on a page returns 200. With no Python block yet these branches iterate over nothing; S10 makes them real.
  - Code: `module-html.ts` (`PageContext.downloads: {sql?, py?, ipynb?}`, the `python` branch, the versions line), `pages.ts` and `site.ts` pass `pageDownloads` (the page → name map goes). No edit under `site/learn/src/` (`A`).
  - Check: `T`, `E`, `H`, `A`.
- [x] S10 · The setup page's Python: port, `py-connect`, `py-smoke` (§2's port; §7 setup.html; §10's new checks; PT10–PT12 first)
  - First [T] `port.test.ts`: PT10 a `python` fence becomes `site/learn/sql/<id>.py` byte for byte and its result `site/learn/labs/checked/<id>.txt` without its final newline; PT11 a ran Python fence with no result after it is an error, an untested one needs none; PT12 a Python fence failing `parseBlock` (PY1) is an error naming 004's line.
  - First [E] `learn-labs.spec.ts` (§10's new checks): an untested Python block is commented out under its reason in the `.py` and a Markdown cell, never code, in the `.ipynb`; every `.ipynb` code cell equals its `.py` segment, in order, with unique ids; each download naming `s4_cells` or `s4_neighbours` has `s4-cells` right after `pg-session` or `py-connect`; a Python block's shown result equals `checked/<id>.txt`; the setup test expects `#q-py-connect`, `#q-py-smoke` and links to `requirements.txt`, `setup.py`, `setup.ipynb`. Red until the code.
  - Code: `port.ts` turns `python` fences into files and results (the skip goes; the setup sections stay §0, §3.1, §3.2, §3.5 until S14). `pnpm learn:port setup` writes `py-connect.py`, `py-smoke.py` and their results. `site/learn/pages/setup.html`: the Python section replaces the "in preparation" paragraph: 004 §3.3's uv commands (Windows, Linux and macOS), the environment, the ipykernel note, links to `/learn/labs/requirements.txt`, `setup.py`, `setup.ipynb`; `{{block:py-connect}}`, `{{block:py-smoke}}`; the tools table's Python row. 004 §0 (Python `# after:`, the course-wide helper, D4) and §7.5 (`site/learn/sql/<id>.py`, D3). AGENTS.md Learn files: `sql/<id>.py`; learn:port reads Python.
  - Both results come from 004: `L` (not `--update`) must pass with them as recorded. Log the Python stage's time.
  - Check: `T`, `P`, `L`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S11 · The agreement gates (§6; D12; AG1–AG8 first)
  - First [T] `scripts/learn/agree.test.ts` AG1–AG8, on result texts in §6's formats (`s4-agree`: `edge_m | n | pairs | I | E[I] | Var_norm | z_norm`; `s4-moran-sql` as 004 prints it; `s5-gistar`/`s5-gistar-pysal`; `s5-lisa-sql`/`s5-lisa` `cells`; `s6-zones`/`s6-geopandas` `eco_id | km2 | records`).
  - Code: `scripts/learn/agree.ts` (pure); `check.ts` runs it over the run's rendered results after the Python stage and before `--update` writes; a failure names the pair and the value and fails the run ("fix the SQL, never the threshold"). The blocks S13, S17 and S18 add print in exactly these formats.
  - No pair exists yet: every gate is skipped (AG8).
  - Check: `T`, `L`, `H`, `A`.
- [x] S12 · s1 · bias
  - Module step: `s1-basis`, `s1-dominance` (DuckDB, run by `learn-browser`), `s1-jaguar`, `s1-devil` (PostGIS), `s1-ex`. No Python. `f4.html`'s "s1, in preparation" links it.
- [x] S13 · s4 · moran, with `s4-agree` (§6, §8; the Moran gate)
  - Module step: `s4-cells` (`-- boot`), `s4-geometry`, `s4-moran-sql`, `s4-moran-pysal`, `s4-permutations` (results as 004); new `s4-agree` (asserts the `DistanceBand(threshold=2·edge)` pairs equal `s4_neighbours` per grid, exit 1 naming the grid and 5 differing pairs; prints §6's row per grid with `repr(float)`); `s4-ex`.
  - Concept: the band 2·e between the ring distances √3·e and 3·e; coincident points (`ST_DWithin` neighbours, not `DistanceBand` ones); 28 of 2,000 devil records in no 5 km cell; Pro's z is `z_rand`, not `z_norm`. Dialects: Pro's Spatial Autocorrelation tool and its parameters; the arcpy block is the setup page's (S14).
  - Gate: the Moran gate passes on the 5000 and 10000 rows; log I, E[I], Var_norm, z per grid (Summary). The lab ERD stays unchanged: `pnpm erd` writes nothing, learn:check's ERD check passes after the first boot block.
  - `s4-cells` enters every PostGIS key: the whole `LU` re-proves all labs (existing `checked/*.txt` unchanged). Measure `s4-permutations`.
  - Downloads: `s4.sql` and `s4.py` carry `s4-cells` after `pg-session`/`py-connect` (E2E's boot check now real).
- [x] S14 · Setup: GeoPackage export and the arcpy notes (§7 setup.html; D5; PT13 first)
  - First [T] `port.test.ts` PT13: setup's sections include `### 3.3 ` and `### 3.4 `: `gpkg-export` and `arcpy-moran` are setup files; §3.3's `text` fence (the requirements file) is neither a block nor an orphan result.
  - Code: `port.ts` `SETUP_SECTIONS` + §3.3, §3.4; `pnpm learn:port setup` writes `gpkg-export.py`, `arcpy-moran.py`, `checked/gpkg-export.txt`. `setup.html`: the GeoPackage paragraph with `{{block:gpkg-export}}`, the arcpy notes as an `<h3>` under Python (the `<h2>` list E2E expects stays) with `{{block:arcpy-moran}}`. `setup.py` now carries `s4-cells` after `py-connect`; `arcpy-moran` is commented out under its reason in `setup.py` and a Markdown cell in `setup.ipynb`. 004 §7.3: `arcpy-moran` commented out in `setup.py`, not "in no download" (D5, same commit).
  - `gpkg-export`'s result as 004 (`rows: 1094 records: 1972`).
  - Check: `T`, `P`, `L`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S15 · s2 · point-patterns
  - Module step: `s2-quadrats`, `s2-nni`, `s2-dbscan`, `s2-kde` (Python), `s2-ex`.
  - Finding 3's proof: `pnpm learn:check --module s2` passes and prints `s4-cells`' result once (Log).
- [ ] S16 · s3 · weights
  - Module step: `s3-contiguity`, `s3-knn`, `s3-countries`, `s3-islands`, `s3-pysal`, `s3-ex`. Teach the k-nearest ties as found: SQL ranks by distance rounded to 0.01 m, then id; PySAL's KDTree breaks the same 1,025 ties its own way. Islands and row standardization.
- [ ] S17 · s5 · local, with `s5-lisa-sql` (§6, §8; the Gi\* and LISA gates)
  - Module step: `s5-gistar`, `s5-gistar-pysal`, `s5-lisa` (results as 004); new `s5-lisa-sql` (PostGIS: cells per quadrant from z and the row-standardized lag: 185, 230, 557, 122); `s5-ex`.
  - Concept: 99 hot spots, 39 after the false discovery rate, no cold spot; hot spots of recording effort, not of devils. Dialects: Pro's Hot Spot Analysis (Getis-Ord Gi\*) and Cluster and Outlier Analysis (Anselin Local Moran's I).
  - Gates: Gi\* and LISA pass. Measure `s5-lisa` (999 permutations, `seed=2026`).
- [ ] S18 · s6 · zonal (`s6-habitat` ran; the zonal gate)
  - Module step: `s6-zones`, `s6-geopandas` (results as 004); `s6-habitat` from `untested: L3 builds occurrence_habitats` to `ran`, a new result (one row per class by `est_area_km2`; finding 9 expects Arable Land 16,108.04 km² with 236 records, ratio 1.21, and Marine Neritic 59 records, ratio 9.50: a different number is investigated before it's recorded); `s6-ex`.
  - Text: 1 km cells, estimated areas (Jung v004), coastal records landing in marine classes, ratios as recording effort. `g7.html`'s "s6, in preparation" links it.
  - Gate: zonal passes (records equal, km² within 1).
- [ ] S19 · e1 · extract (review item 3, e1; D8)
  - Module step, per §8's e1 row: `e1-request`; new `e1-fetch` (whole-file retry, fresh `.part` per attempt, 429/5xx/dropped connection with 1, 2, 4, 8 s waits, `Retry-After` up to a cap; prints nothing); `e1-checksum` after `e1-fetch` (result changes: 454,202 B, sha256 `35ca89f9bee3`, D8); new `e1-retry` (a local `http.server` thread: a cut body, a 429 with `Retry-After: 1`, then the file; prints attempts, never a port); new `e1-decide` (four canned cases in `decideDownload`'s shape); `e1-submit` stays `untested`, rewritten (intent file, `e1-decide`, `Retry-After`, a polling deadline, `e1-fetch`); `e1-ex`.
  - The page and 004 say the same: persist the request identity and reconcile before resubmitting; retry the whole file; `Retry-After`; a polling deadline. `e1.py` comments `e1-submit` out; `e1.ipynb` makes it Markdown.
  - Decisions: e1 correction done.
- [ ] S20 · e2 · transform-load (review items 1 MF5 and 3, e2; D9)
  - Module step, per §8's e2 row: `e2-file`, `e2-copy`; `e2-typed` with the comment and prose that its licence mapping is illustrative, not §4.2's effective-licence pipeline (result unchanged); `e2-geopandas` rewritten (`# after: py-connect`, `create_engine(…, creator=connect)`, `to_postgis(schema="learn_curriculum")`, reads `learn_curriculum.devil_buffers` and prints and asserts its `pg_class` namespace before the rollback; new result, D9); new `e2-copy-fails` (an extra field, a NUL byte, bad UTF-8: each COPY fails with its SQLSTATE and line number); new `e2-casts` (`pg_input_is_valid` before the typed insert, reporting gbifID, column and value); `e2-ex`.
  - It runs as `critwire_lab` (S4's guard); the namespace check inside the open transaction is MF5's test. `d4.html`'s "The ETL track (in preparation)" links e2.
  - Decisions: MF5 done; e2 correction done.
- [ ] S21 · e3 · idempotent (review item 2, SC8 e3; D19)
  - First: RF1–RF3 as `e3-snapshot`'s expected lines in 004, before the code (A loads; A skips; B loads; A loads, target A while the ledger rule leaves B; changed config loads; `TRANSFORM_VERSION` bumped loads; `SCHEMA_VERSION` bumped loads; A again skips), with a provisional hash.
  - Module step, per §8's e3 row: `e3-pick` (DuckDB) and `e3-pick-pg` ordered by md5, then id (results unchanged); `e3-rerun` kept as the batch ledger (result unchanged); new `e3-snapshot` (four-part key as canonical JSON, one transaction per load, TEMP target and state); new `e3-membership` (PostGIS: the md5 cap repeats on the same input; a newly eligible low-hash id displaces a capped species' highest-hash record); `e3-ex`.
  - Prose: deterministic output, idempotent batch application and "the target holds snapshot X" as three ideas; the case study's "stale means the request changed".
  - Decisions: SC8 e3 done.
- [ ] S22 · e4 · quality-provenance (review item 3, e4)
  - Module step: `e4-checks` (unchanged), `e4-credits`, `e4-derived`; new `e4-quarantine` (PostGIS, made-up rows: negative, NaN and Infinity uncertainty; 0, 0 rejected as this dataset's rule; a year after the download; the report keeps key, check and value); `e4-ex`.
  - Prose: the capped sample is neither abundance nor unbiased effort; 1,109 shared coordinates; devil records dated 1599.
  - Decisions: e4 correction done.
- [ ] S23 · e5 · schedule (review items 2, SC8 e5, and 3, e5; D11, D19)
  - First: RF1, RF2, RF4–RF7 as `e5-runs`' expected lines in 004 (§8's eight cases, exit code and log line each), with a provisional hash.
  - Module step, per §8's e5 row: `e5-job` kept, labelled a simulation in comments and prose, its docstring and Expected matching the redirect (result unchanged); new `e5-refresh` (writes `refresh.py`; PG\* settings checked by name, never logged; no `application_name`; `REFRESH_SCHEMA`, `REFRESH_LICENSES`; the four-part key; lock, compare, fetch, verify, stage and count, replace and upsert state, COMMIT; rollback and exit 1 on any error); new `e5-runs` (`learn_e5`, eight separate `python -I refresh.py` runs incl. two `Popen` at once, dropped in `finally`); `e5-ex`.
  - Prose: bump `TRANSFORM_VERSION`/`SCHEMA_VERSION` when output/DDL change; with the redirect cron mails nothing; `refresh-failed.service` only writes the journal until its `ExecStart` sends mail or a push; cron, systemd timers and Windows Task Scheduler.
  - Too big for one session: split as S23a (page built with `e5-job`, `e5-refresh`, `e5-runs`) and S23b (`e5-ex`, dialects), each leaving the page built.
  - Decisions: SC8 e5 done; e5 correction done.
- [ ] S24 · Diagram `e5-refresh` (§9; D15)
  - First [E] `e2e/schema.spec.ts` `DIAGRAMS` + `e5-refresh` (red: no SVG).
  - `site/learn/diagrams/e5-refresh{,-dark}.{html,svg}` (diagram-design, profile `critwire`, system fonts): lock → compare the key (input, transform, config, schema) → fetch → verify → stage and count → replace + state → COMMIT; an unchanged key or a held lock skips; a failure rolls back. Export with the plugin's `export_svg.py --system-fonts`, pass `self_check.py --offline`; `<title>` and `alt` state its point; `{{diagram:e5-refresh}}` in `e5.html`; 004 e5 names it.
  - Check: `T`, `E`, `H`, `HN`, `A`.
- [ ] S25 · Diagrams `s4-band` and `e2-load` (§9; dropped past 40 sessions, deviation 4)
  - First [E] `schema.spec.ts` `DIAGRAMS` + both.
  - As S24: `s4-band` (a hexagon's ring distances √3·e and 3·e, the 2·e band between them) in `s4.html`; `e2-load` (file → text staging → typed → checks → one COMMIT or ROLLBACK) in `e2.html`; 004 s4 and e2 name them.
  - Check: `T`, `E`, `H`, `HN`, `A`.
- [ ] S26 · E2E completion, screenshots and the release smoke test (§10)
  - `e2e/learn-screens.spec.ts` `PAGES` + s4, s5, e2: `{s4,s5,e2}-{1280,375}-{light,dark}.png`.
  - `e2e/learn-map.spec.ts`: Spatial statistics s1–s6 and ETL e1–e5 built, each linked from the map and its track page, returning 200.
  - `learn-labs`: each §10 check runs on real blocks (s4 and setup with `s4-cells`; `e1-submit` and `arcpy-moran` untested in `.py` and `.ipynb`).
  - `e2e/release/live.spec.ts` new test: under the lab lock (`takeLabLock`), the origin's loader into `LEARN_PG_URL`'s database (`critwire_dev`, as `critwire_lab`), then the origin's `/learn/labs/s4.py` through `runPython` in `.venv-learn` with `pythonEnv`: exit 0, and stdout holds, in page order, each s4 lesson block's recorded output (a ran Python block whose `# after:` is only `py-connect`: `checked/<id>.txt` after its `-- result:` line); the leak query is empty after. Dry run against a local Caddy on `e2e/Caddyfile` (`RELEASE_ORIGIN=http://127.0.0.1:3100`, as L3 S19 did).
  - Audit: each DoD E2E item → its test name, listed in the Log; a gap gets its test here.
  - Check: `T`; `E2E_ARTIFACTS=$M/e2e-s26 pnpm e2e` in full, nothing skipped; the release dry run passes; `H`, `HN`, `A`.
- [ ] S27 · AGENTS.md, 004 final pass, DoD audit (§11, §12)
  - AGENTS.md final pass (§11): Stack (the venv for labs, learn:check and the ingests; two requirements files; each command checks its own file's pins), Learn files (`sql/<id>.py`), Commands (learn:check's Python stage, venv and role checks; `pnpm test` wording), State (s1–s6, e1–e5 built; p, c planned, L5).
  - 004: §0, §3.3, §5.4, §5.5, §7.3, §7.5, §7.6, §7.7 and §9's L4 row agree with the code.
  - `docs/recovery.md`: L4 adds no state outside Git unless a step did (the run id and `MPLCONFIGDIR` are per-run temp; `.venv-learn` is rebuilt by `pnpm learn:venv`); document anything that was added.
  - Audit:
    - review items MF5, SC8 e3, SC8 e5, the e1/e2/e4/e5 corrections, SC7 (Python part) each `done (S<n>, <sha>)` or `rejected` with evidence under Decisions;
    - every deviation from 004 under Decisions (D1, D3, D5, D6, D8, D9, D14, plus any a module step made);
    - §12 by `H`, `HN`, `HR`, `A`; §1's venv checks (Verification 1, run here once);
    - a gap becomes a new step before Verification.
  - Check: `T`, `P`, `L`, `E`, `H`, `HN`, `HR`, `A`.

## Verification

Run once, on the final commit (after any code-review fixes), on a clean tree, in this order. `M`, `B0`, `P`, `H`, `HN`, `HR` and `A` are as in Steps. Log each result; the numbers go to the Summary.

Leak query, which must be empty: `psql -d critwire_dev -XAtc "select rolname from pg_roles where rolname like 'learn\_%' union all select nspname from pg_namespace where nspname like 'learn\_%' and nspname not in ('learn_spatial','learn_curriculum')"`.

1. **Install and venv** (DoD's sync/check line, D1):
   - `pnpm install --frozen-lockfile` is up to date; `uv --version` is 0.13.5.
   - `pnpm learn:venv`, then `uv pip check --python .venv-learn`: clean.
   - The labs file alone: `V=$(mktemp -d) && UV_PYTHON_DOWNLOADS=never uv venv --python /usr/bin/python3.12 $V/venv && uv pip sync --no-build --python $V/venv site/learn/labs/requirements.txt && uv pip check --python $V/venv` is clean, and `PY=$V/venv/bin/python pnpm exec tsx -e 'const v = await import("./scripts/venv.ts"); const p = v.venvProblems(await v.venvState(v.LABS_REQUIREMENTS, process.env.PY)); console.log(JSON.stringify(p)); if (p.length) process.exit(1)'` prints `[]`. Then `rm -rf $V`.
   - Platforms (PyPI): S1's `uv pip compile --no-build` loop: Windows x86-64, Linux x86-64 and aarch64, macOS 14 arm64 exit 0; Intel macOS fails on pyproj.
   - 004 §3.3's text fence equals `site/learn/labs/requirements.txt` (S1's `diff`, empty).
2. **Build and cap:** plain `pnpm build` passes (fresh labs, DOIs current, habitat fresh, `/v1` contract, no stale SVG). `find dist/learn/data -type f -printf '%s\n' | awk '{s+=$1} END{print s}'` = 95,936,992, and the same sum over `data/raw/gbif-sample data/learn data/gbif-learn-sample` = 18,822,906 (Baseline; no data file added); each ≤ 120,000,000.
3. **E2E (primary):** `rm -rf $M/e2e && pnpm build && E2E_ARTIFACTS=$M/e2e pnpm e2e`.
   - Specs: `attribution`, `countries`, `docs`, `duckdb`, `files`, `learn-data`, `serving`, `learn-map`, `learn-browser`, `learn-labs`, `learn-screens`, `learn-timing`, `schema`.
   - `jq .stats $M/e2e/results.json`: unexpected 0, skipped 0, flaky 0. `learn-labs` includes "every `.ipynb` code cell equals its `.py` segment".
   - Artifact `$M/e2e/`: `playwright-report/index.html`; one `trace.zip` per test (`find $M/e2e/test-results -name trace.zip | wc -l` = `.stats.expected`); `results.json`, `setup-timing.json`, `caddy-access.log`; `{s4,s5,e2}-{1280,375}-{light,dark}.png` plus L1–L3's screenshots.
   - Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
4. **Static and isolated tests:** `pnpm typecheck` (both tsconfigs); `pnpm test` (PY0–PY3, PY5, PY7, PY8, PY10, PY11, PY6/PY9, BF1, FR10–FR12, AS11–AS17, MH10–MH14, PT10–PT13, AG1–AG8, V1; each step's Log shows `red n → green n`); `pnpm test:db` (V1 probe, V2–V4, PY4, PYC1–PYC8). Then the leak query is empty.
5. **learn:check:**
   - `psql -d critwire_dev -XAtf db/learn/canary.sql > $M/canary-before.txt`.
   - `pnpm learn:check` twice, each exit 0, as `critwire_lab`, each time:
     - the loader stage;
     - every ran PostGIS and Python block of every built page (setup, d1–d6, g1–g7, s1–s6, e1–e5) in check mode, `s6-habitat` included; `e2-geopandas` prints `learn_curriculum` as its table's namespace;
     - the gates: Moran on the 5000 and 10000 rows (I, E[I], z to 6 decimals and within 5e-7; `s4-agree`'s neighbour-pair assert exit 0), Gi\*, LISA, zonal;
     - every download: each `.sql` with exactly its announced `ERROR:` lines, each `.py` exit 0 on a fresh load with no `GBIF_*` in its environment.
   - After both: `git status --porcelain` is empty (`checked.json` byte-identical: the same hashes twice), `diff $M/canary-before.txt <(psql -d critwire_dev -XAtf db/learn/canary.sql)` is empty, the leak query is empty. The printed versions (Python 3.12.3, the requirements sha256) equal `checked.json`'s.
   - `pnpm learn:check --module s2` passes and prints `s4-cells`' result once (finding 3).
   - Log both runs' wall times, the Python stage's, and the five slowest Python blocks (Summary: "the Python timings").
6. **Results vs 004:**
   - `P` reports 0 differences.
   - `git diff $B0 -- plans/004-learn-curriculum.md | grep -E '^-.*-- result: '` lists only `e1-checksum` (D8) and `e2-geopandas` (D9), plus any change a Decision proves. Every other Baseline s, e and setup Python result keeps its sha256.
   - `s6-habitat` is `ran`; `e1-submit` and `arcpy-moran` are `untested`; each of s1–s6 and e1–e5 has a ran `<id>-ex`.
7. **ERDs:** `pnpm erd` writes nothing (`git status --porcelain site/learn/erd` is empty).
8. **Existing files unchanged (§12):** `H`, `HN` and `HR` print nothing; `A` exits 0 (so `learn/assets/**` is the Baseline's, D20). `HR`'s allowed files are exactly §12's "changed on purpose" plus deviation 6's pages; any other needs a Decision.
9. **Determinism:** `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > $M/dist-1.sha256`; plain `pnpm build`; the same into `$M/dist-2.sha256`; `diff` is empty.

**Definition of done → proof:**

| DoD item | Proved by |
|---|---|
| typecheck, test (engine failure cases first), plain build | 2, 4; S2–S11's Log `red n → green n` |
| `uv pip sync --no-build` + `uv pip check` clean (both files; the labs file alone, D1) | 1 |
| `pnpm e2e` in full, nothing skipped; every `.ipynb` cell equals its `.py` block | 3 |
| Results: ran s/e blocks keep their sha256 (D8, D9 excepted); `s6-habitat` and the exercises `ran`; two runs, same hashes; leak query; canary | 5, 6 |
| Moran: SQL = PySAL on I, E[I], z to 6 decimals on the 5 km grid; neighbour pairs equal | 5 (gate, `s4-agree`); S13's Log values |
| Gi\* and LISA tested against esda | 5 (gates); S17 |
| Existing files unchanged (pages excepted; `manifest.json` unchanged, no file added) | 8 |
| Review items MF5, SC8 e3/e5, e1/e2/e4/e5 corrections, SC7 Python | 4 (PYC1–PYC8, PY11, V2, V3), 5 (`e2-geopandas`, `e3-snapshot`, `e5-runs`); Decisions with shas (S27) |
| Artifacts and reproduction | 3 |
| Release smoke | below |
| Summary: shipped, pins, Python timings, deviations from 004, release record, notes for L5 | written after 1–9 |

**Release smoke** (the Release unit, after `gh pr merge` and `deploy critwire`; `O=https://critwire.com`; `dist/` built from the merge commit):
- `RELEASE_ORIGIN=$O E2E_ARTIFACTS=$M/release-smoke pnpm exec playwright test -c playwright.release.config.ts`, every test passing:
  - every `dist/` file is served with dist's bytes, so every s and e page returns 200 at `/learn/spatial-statistics/<slug>/` and `/learn/etl/<slug>/`, and every `/learn/labs/*.{sql,py,ipynb}`;
  - the `.wasm` types and f3's block;
  - S26's test: `$O/learn/labs/s4.py`, after `$O`'s loader in `critwire_dev` as `critwire_lab`, runs in `.venv-learn`, exits 0 and prints s4's recorded lesson outputs; the leak query is empty after.
- `curl -fsS $O/learn/labs/requirements.txt | cmp - site/learn/labs/requirements.txt` is silent.
- `## Release` records the merge commit, `deploy`'s last line, these results and `$M/release-smoke/`.

## Failure modes

The isolated tests are the architecture's "Failure cases, written as tests before the code" (PY0–PY11, PYC1–PYC8, AS1–AS7 as AS11–AS17, AG1–AG8, V1–V4, RF1–RF7) plus the planner's BF1, FR10–FR12, MH10–MH14 and PT10–PT13, each in its step's **First** list. What a session does when the plan meets reality:
- **A recorded result differs from 004** (`P` after `LU`, or a check run): outside D8, D9 and the new blocks it is a bug: the port, the `# after:` chain, the environment (`PGOPTIONS`, `LEARN_BASE`, HOME), a seed or a format. Never re-record to match. Only a proven change updates 004 and the file together, under Decisions. `py-smoke` moves only if the system Python's patch version moved (`checked.json`'s `python`): record it with the proof.
- **SQL and PySAL disagree beyond 5e-7, or the neighbour pairs differ** (S13, S17): diff the neighbours, k, S0/S1/S2 and the mean; fix the SQL, never the threshold.
- **A Python block nears or passes its timeout** (`s4-permutations`, `s5-lisa`): measure; `# timeout:` in 004 and the file together. Never fewer permutations, another seed, or numba.
- **A pin has no wheel** (`--no-build` refuses), **or PyPI is unreachable** for the platform check: no source build, no system GDAL. Do the rest; re-run the check later in the session or in Verification. Still failing: a handoff item (`Blocks: Release`).
- **learn:check refuses the venv** (`assertVenv`): `pnpm learn:venv`. A labs-only venv is valid (D18).
- **learn:check refuses at connect, naming an earlier run's session** (PYC8): `pgrep -af learn-check`; if no learn:check runs, end it with the printed command; if one runs, wait for it.
- **The lab role is refused** (superuser or CREATE on `public`, D7) **or `LEARN_PG_URL` is broken:** `pnpm learn:check --setup` as superuser, per AGENTS.md. Never `--reset-password` without `--env` for each checkout.
- **Leak query not empty:** drop only this mission's lab-role objects, as cleanup names them. Anything else: a handoff item.
- **`H`, `HN`, `HR` or `A` prints something:** find what changed it. A bundle input edit (`A`) is reverted: Python code lives outside the bundle. A needed change gets a Decision with its reason.
- **A block would reach the network** (anything but `file://` under `dist/` and `127.0.0.1`): a bug. e-blocks read `LEARN_BASE` only; `e1-submit` stays `untested`; no GBIF download or registration.
- **test:db or learn:check slows past a limit:** a test that fails only on time gets its measured time and its own limit raised, with a Decision. Never skip it.
- **Session budget:** as in Steps' Estimate.

## Code review (Astra)

## Release

## Decisions

- Architecture D1–D20 (end of `## Architecture`) final after Revision, 2026-10-29.
- S1 (2026-10-29): Steps' deviations 1–8 from "Work units and budget" (top of `## Steps`) are in effect: port + py-connect/py-smoke at S10; units 4–5 split into S4–S10; setup §3.3/§3.4 port with gpkg-export/arcpy-moran at S14; diagrams e5-refresh (S24) before s4-band/e2-load (S25); release smoke's s4.py run as a Playwright test (S26); f4/g7/d4 link s1/s6/e2 once built; `venvState(file, python)` takes the interpreter; one learn:check run per step.
- S1: D1 (two pin files, one venv), D2 (`ipykernel` unpinned, noted in 004 §3.3) and D18 (each command checks its own file) in effect. The labs file is 004 §3.3's text byte for byte (44 pins); the ingests' file adds `affine`, `attrs`, `click`, `rasterio`; the union equals B0's 48. Platform check (`uv pip compile --no-build --python-version 3.12 --python-platform <p> site/learn/labs/requirements.txt`): Windows x86-64, Linux x86-64, Linux aarch64, macOS arm64 with `MACOSX_DEPLOYMENT_TARGET=14.0` pass; `x86_64-apple-darwin` fails on pyproj 3.8.0 (as 004 says); the ingests' file fails on macOS 14 arm64 (rasterio), as finding 2 says. 004 §3.3's platform command now names `uv pip compile` (the check actually run), not `uv pip install --dry-run`.
- S1: the venv probe treats a line `packaging` can't parse, or one that isn't exactly `==`, as "not a pin" and refuses the file (fail loud), so a hand-edited range never passes the check.
- S2: Python `# after:` lint messages say `` `# after` `` (SQL keeps `` `-- after` ``); a missing `# q:` is reported at line 1, a missing `# status:` or no code at the first line after the headers. PY11 refuses `PGAPPNAME` as well as `application_name` (either renames the session and hides it from §4.6's ownership check; no 004 block names either). `renderPython` hashes stdout with its final newline: checked against 004's s2-kde, s3-pysal and gpkg-export fences (their hashes match stdout = body + one `\n`). Helpers: `assembleCourse` passes py-connect (if a block file has it) to every page's lint; a helper not on the page is course-wide, so no order check.
- S3: `pythonEnv(target, {learnBase, app, mplConfig})` returns everything but HOME; `runPython` sets HOME to each process's own `home/` (one temp folder per process, so §3's HOME and the env can't be built before it). The run name lives in `python.ts`: `PY_APP_PREFIX` + `pythonApp()` (12 hex, `randomBytes(6)`); S5's `check.ts` calls it once per run. `runPython` SIGKILLs the group on the child's `exit`, not only on `close`: a background straggler holding the pipes would otherwise hold `close` until the timeout. `blockCode` throws on an `# after:` id not in the course (lint already refuses it; fail loud). An abort test (rejects with its reason, group and temp folder gone) added to S3's set.
- S4: `record.ts` exports `Outcome` (moved from `runner.ts`), `BlockRuns` (`block: {id, boot, plan}`, `first`, `second?`; `Ran` was taken in `runner.ts`) and `settleResults`, a command: throws naming every failure, else writes. With `update`, a non-boot block handed over with one run is refused ("--update needs two runs") so an engine can't skip PY9. Its "ok" lines now print at settle time, after the run, not per block. `blocksToRun(pages, module?)` (pure, BF1) in `check.ts`. Role guard order: superuser, CREATE on `public`, then CREATEROLE and `createrole_self_grant`; V2/V3's roles get `createrole_self_grant` set so only the new checks can refuse them. `--setup` refuses CREATE on public (setup.dbtest LS1) rather than revoking it; the message still names `--setup`, which then names the grant. AGENTS.md learn:check line: the role guard, `--module` runs the boot blocks first.
- S5: `takeLabLock(lab, db, {app})` refuses stragglers itself (after the lock; its catch ends the connection, so the lock is free): `pg_stat_activity` in this database, as this role, `starts_with(application_name, 'critwire-learn-check-py-')`, one line each naming pid, name and `psql -d <db> -c 'select pg_terminate_backend(<pid>)'`. `endRunSessions(sql, app)` (exported; S6's check (b)) returns `{ended, problems}`; `release()` calls it after the recorded pids and logs `cleanup: ended the run's Python session(s): <pids>`. `check.ts` makes the name with S3's `pythonApp()`; S6 threads it into `Run`. FR7's checker closure gains `python.ts` and `venv.ts` (every lab re-proved by `L`). The red run was the import failure (`endRunSessions` not exported yet).
- S6: `runner.ts` `blockRuns` returns the PostGIS runs (`runBlocks` = `blockRuns` + `settleResults`, its tests unchanged); `check.ts` settles both engines' runs in one `settleResults` call (D13). `py-runner.ts` `runPythonBlocks(blocks, course, options)`: (b) polls `cleanup.ts`'s new `runSessions` query (the one `endRunSessions` ends) every 50 ms for 10 s, then ends and names; (c) reuses `runner.ts` `committedLeaks`, now `(sql, database, q, known)` and exported; (d) `readTables(admin, learn_curriculum)` before the stage and after each run (≈ 1.5 s per Python run), a change throws naming the diff. One `known` set for both engines, so a foreign leak is named once. The venv check: whole runs always (checked.json records `python` and `requirements`; `Versions` = `ServerVersions` + those two), `--module` runs only with a ran Python block; `checkLab` refuses a `stamp` without venv versions and a Python block without `course` (fail loud). `venv.ts` `readVenv` returns the checked state (`assertVenv` wraps it). Freshness: `isLab` takes ran Python; a Python key adds `py-connect` (when the course has it) to the boot blocks and pg-session; staleness's orphan message says "no ran lab block". PY4 passed on its first run (S3's engine already gives it); it reads 004's `py-connect` fence until S10 ports the file. Added PYC9 (check (b) on a `setsid` child keeping a session) and a PY7/PY8 "run goes on" case. Known limit: `runPython` resolves on `close`, so an escaped child that inherited the block's stdout/stderr holds the run until it exits (the timer is cleared on exit); PYC9's child sends stderr to DEVNULL. No 004 block starts a detached process; left for the code review.
- S7: the part list is `pythonParts` (the plan's `pythonCells`; its notebook `Cell`s are `notebook.ts`'s type). `Download` = `{page, name, kind, text, announced ([] unless sql), timeoutMs? (py)}`; `downloadName(page, kind = "sql")`. `.py` cells: `# %% py-connect`, `# %% boot: <id>` (`with connect() as conn:` / `conn.execute("""` newline, the boot block's text, newline `""")`), `# %% <id>` per block. A block line starting `# %%` is refused (it would split a cell). The notebook gets a first Markdown cell `about` (the `.py`'s head, with "open it in Jupyter or VS Code" as its run line); an untested block keeps its `<id>-md` heading, and its `<id>` cell is Markdown (not-run line, then its text, headers included, fenced). Python boot rule: on-page boot blocks don't count (SQL's do); only a ran block's whole-word name outside `#` lines. `py` timeout = ran blocks' (py-connect included) + 60 s per boot. `scripts/json.ts` exports `sortKeys` (reused by `notebook.ts`). SQL's untested form moved into `commentedOut(b, reason, mark)`, shared with `.py`; `.sql` output byte-identical (AS11, H). A fixture notebook passed `nbformat.validate` (nbformat 5.10.4 via a throwaway `uvx`, not pinned).
- S8: `check.ts` downloads stage by `kind`: `.py` through `runPython` (`assertPyDownloadRun`; `pythonEnv`, `VENV_PYTHON`, limit = `Download.timeoutMs`, refused if missing); the leak check runs after a failed file too and its find is appended to the file's failure (PYC6's message), an abort skips it. One `PythonEnvOptions` (`learnBase`, `app`, `mplConfig`) made in `checkLab` serves the Python blocks and the `.py` downloads (`blocksStage` takes it instead of `dist`/`tmp`). `staticStage` keeps `sql` + `py` downloads; the venv check also runs for a `--module` run with a `.py` download. No `.py` download exists yet (S10 ports py-connect; S13 the first page), so `L` ran `.sql` only. 004 §7.6 and AGENTS.md learn:check line.
- S9: `module-html.ts` renders PostGIS and Python through one `labHtml(b, engine)` (`LAB_ENGINES`: name + download kinds; PostGIS links `.sql`, Python `.py` and `.ipynb`; a missing kind throws `q <id>: the page has no .<kind> download`, MH6's message now names `.sql`). "A page with a Python block" = any Python block among the page's blocks (readCourse refuses an unslotted block file), so the versions suffix also shows before a PostGIS block that comes first. `PageContext.downloads` from `pageDownloads` via `learnPages` (no page → name map left). E2E: S10's untested-`.py` comment check and the Python shown-result check are already in the by-kind tests (they iterate over nothing until S10); the 200-links test can't name `requirements.txt` until S10 links it from setup. The E2E cases were written after the module-html code in this session: with no Python block they couldn't go red (the 200-links test passed first run).
- S10: `portPage` reads `python` fences like the others (`.py`, result in `checked/`); the `skipped` list and the CLI's "skipped" lines are gone. Every parse error now starts with its fence's 004 line (`004:<n>: <id>.<ext>: …`), SQL too (PT5's message gained the prefix; PT12 asks it for Python); a fence with no `q:` parses as `block.<ext>`. A module page's lint gets py-connect (parsed from the setup page's port) as its helper (D4), so `# after: py-connect` ports on any page; the fixture's `f1-py` names it and gains a result (its `#### f9` line moved below the headers, still inside the fence). `HR` allows `scripts/fixtures/learn-port-004.md` (port's fixture, changed with port). CF2 (the real setup page's block list) gains py-connect and py-smoke. The s4-cells adjacency E2E passes vacuously until S13 (no download names `s4_cells` yet). setup.html's Python section says py-smoke's `python:` line may differ in its last number (uv installs the newest 3.12).
- S11: `agree.ts` `agreement(results)` returns one `{gate, skipped, failures}` per gate; `check.ts` logs each and passes the failures to `settleResults` (`gateFailures`), so a gate failure fails the run like a block's and `--update` writes nothing. Formats the blocks must print (agree.test.ts): `s4-agree` a table `edge_m | n | pairs | I | E[I] | Var_norm | z_norm` (lines before it allowed); `s5-lisa-sql` (§6 left it open) `quadrant | cells`, one row per quadrant named as `s5-lisa`'s (high-high, low-high, low-low, high-low). Var_norm is gated too (§6 "each statistic"). A pair whose table can't be found, or a non-number, fails rather than skips.
- S12: `s1-ex` is a browser (DuckDB) exercise, the busiest year per species with ≥ 100 records (the curriculum's "which … years dominate"), so learners self-check; its fixed wrong answer in `learn-browser.spec.ts` drops `WHERE year IS NOT NULL` (11 species' undated records outrank every year). Its result came from `learn-browser`'s run (`dfa578491a18`) and equals the same query in PostgreSQL. s1 has no Python; `s1-jaguar`/`s1-devil` were ported with 004's results, so `L` (not `LU`) proved them. 004's track table keeps s1 "outline" like L3's g rows (S27's final pass). Public page names s2–s5 as "the next four modules" and s6/e4 "in preparation" (link only built pages).
- S13: s4 written in full in 004 (Concept, worked example `s4-cells`/`s4-geometry`, lab `s4-moran-sql`, `s4-moran-pysal`, new `s4-agree`, `s4-permutations`, Result, exercise, Check, Dialects PostgreSQL/DuckDB/SQL Server/PySAL/ArcGIS Pro). Ported results unchanged. `s4-agree` = §6's format; ordered pairs (rows of `s4_neighbours`): 6,246 at 5 km, 1,620 at 10 km; exits 1 naming the grid and first 5 differing pairs with their side. `s4-ex` (PostGIS) = Moran's I on presence (`n > 0`): 5 km I 0.208633 z 11.60 (307 cells with a record), 10 km I 0.229060 z 6.55 (178): teaches that the value chosen changes I like the cell size. The arcpy line is prose (`arcpy.stats.SpatialAutocorrelation` + parameters), no setup link until S14 adds the arcpy notes. **Deviation (004 fixed, same commit):** `s4-cells` is the course's first `-- boot` block, so in learn:check's whole run (boot before every block, 004 §0) `s4_cells` sat in `learn_curriculum` when g1 ran, and `g1-columns` (every geometry column of `current_schema()`) gained a 5th row `s4_cells | geom | GEOMETRY | 0`. A learner's g1 result must not depend on whether s4 ran, so `g1-columns` now filters `f_table_name <> 's4_cells'` (result and sha `92869bd94553` unchanged) and g1's prose says why (g1.html links s4). `H` (`learn/labs/g1.sql`) and `HR` (`g1.html`, `g1-columns.sql`) allow them from S13. The E2E boot-adjacency test matched `s4_cells` anywhere in a `.sql`, so the string literal flagged g1.sql: it now matches `.sql` code through `codeOnly` (004 §7.3: a block *names a table*), `.py` text as before.
- S14: setup = 004 §0 and §3.1–3.5 (`SETUP_SECTIONS`); §3.3's requirements `text` fence is skipped as before (not a result). setup.html: `<h3>` "Moving data to another GIS" (`gpkg-export`) and `<h3 id="arcpy">` arcpy notes (§3.4's bullets + `arcpy-moran`) under Python; the py-smoke paragraph now says "these blocks and the next two" are `setup.py`. `setup.py` gets `s4-cells` after `py-connect` by the existing boot rule (no code change); `arcpy-moran` commented out / Markdown cell by S7's untested form. D5 in 004 §7.3 (same commit). s4.html's ArcGIS Pro dialect and 004's s4 Dialects link the arcpy notes (S13 deferred it). CF2 (real setup block list) gains gpkg-export, arcpy-moran. The port fixture's §3.3 now holds a text fence, `gpkg-export` and a §3.4 `arcpy-moran`; its old exclusion case (`py-only`) is now `not-setup` under a `### 3.6`.
- S15: s2 written in full in 004 (Concept, worked example `s2-quadrats`, lab `s2-nni`/`s2-dbscan`/`s2-kde`, Result, exercise, Check, Dialects PostgreSQL/DuckDB/SQL Server/scikit-learn/ArcGIS Pro). Ported results unchanged. `s2-ex` (PostGIS) = the nearest-neighbour index of the 913 distinct locations against four areas (main island, `ST_Envelope`, `ST_OrientedEnvelope`, `ST_ConvexHull`): R 0.548 → 0.437 as the area grows from 64,246 to 100,881 km² (teaches 004's "both depend on the area chosen"; Pro's default is a rectangle). The scikit-learn dialect's claim (same 10 clusters, 871 clustered, 913 noise as `ST_ClusterDBSCAN`) was checked once with `.venv-learn` on the same points, not a block. The page tells learners running blocks one by one to run s4's `s4-cells` first (downloads already boot it); s4.html now links s2.

## Log

- 2026-10-29 14:02 UTC: Baseline: install, venv, typecheck, test 601/601, build, test:db 121/121, learn:check, e2e 87/87 all pass; sha256 lists saved.
- 2026-10-29 14:27 UTC: Architecture: architect wrote findings, target design (Python engine, learn:check Python stage, .py/.ipynb downloads, agree gates, MF5/SC8/SC7 realisation), PY/PYC/AS/AG failure lists, D1–D17. Doc-only; no checks needed.
- 2026-10-29 14:37 UTC: Fable review: APPROVE WITH CHANGES, 3 MUST-FIX (bundle inputs untouched + assets sha audit; venvState checks labs pins only; learn-labs.spec iterates by Download.kind), 4 missed, 5 should-consider. Doc-only; no checks needed.
- 2026-10-29 14:38 UTC: Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (venv pins checked per purpose; cleanup scoped to target db + unique run id; refresh identity incl. config), 3 should-consider. Doc-only; no checks needed.
- 2026-10-29 14:52 UTC: Revision: architect resolved all 6 MUST-FIX (bundle inputs + assets audit, D20; per-file venv pins, D18; downloads by kind; cleanup by db + run-id PGAPPNAME, D17; refresh key incl. config, D19), 4 MISSED, SC per Revision notes. Doc-only; no checks needed.
- 2026-10-29 15:12 UTC: Steps: planner wrote S1–S27 (tests-first ids per step, checks per step), Verification (E2E artifacts in mission state dir, DoD map, release smoke), Failure modes. Doc-only; no checks needed.
- 2026-10-29 15:47 UTC: S1: labs requirements = 004 §3.3's 44 pins (rasterio removed), new `scripts/ingest/requirements.{in,txt}` (`-c` labs + rasterio; union = B0's 48), `learn:venv` syncs both, `scripts/venv.ts` (probe + `venvProblems` + `assertVenv`; ingest shapes/habitat check first), 004 §3.3 + AGENTS.md. red 10 → green 10 (venv.test 6, python.dbtest 4). T 607/607 (2 min); python.dbtest 4/4; L ok (4 min 10 s; only `checked.json`); P 0 diffs; H, HN, HR, A clean; `uv pip check` clean, rasterio 1.5.2; platforms: Win/Linux x86-64/aarch64/macOS 14 arm64 ok, Intel mac fails (pyproj). Log `M/s1-L.log`.
- 2026-10-29 15:32 UTC: S2: Python block model: `.py` → engine python (`# q|status|after|timeout`, timeoutS default 60), `PY_CONNECT_ID`, `lintPage(blocks, bootIds, helpers)`, privilege skips Python but refuses learn_spatial + application_name/PGAPPNAME (file + line), `renderPython`, `recordedResults` counts ran Python, no-file message names `.py`; AGENTS.md block-file line. red 9 → green 9 (blocks PY0/PY1/PY5/BL1, result PY10, privilege PY11, course SL3/SL6/PY5). T 613/613; L ok (250 s; only `checked.json`); P 0 diffs; H, HN, HR, A clean. Logs `M/s2-{T,L}.log`.
- 2026-10-29 15:37 UTC: S3: `scripts/learn/python.ts` (`pythonApp`, `pythonEnv`, `blockCode`, `runPython` detached group + SIGKILL on timeout/abort/exit, temp removed in finally, `pythonFailure`); not imported by learn:check yet. AGENTS.md `pnpm test` line. red 10 → green 10 (python.test: PY0 proof by scratch path edit = 1 failure, PY2, PY3 ×2, PY7 ×2, PY8 ×3 incl. straggler + abort, blockCode, pythonApp). T 623/623 (2 min); B ok; H, HN, HR, A clean. Logs `M/s3-{T,B}.log`.
- 2026-10-29 16:40 UTC: S4: `scripts/learn/record.ts` `settleResults` (compare, two runs agree, write once all pass) from `runBlocks`; `check.ts` `blocksToRun` (boot blocks first on `--module`), `assertLabRole` refuses superuser + CREATE on public (D7); 004 §7.6 + AGENTS.md. red 13 → green 13 (record PY6 ×4, PY9 ×4; check BF1 ×3; learn-check V2, V3). T 634/634 (FR7's closure gains record.ts); L ok (251 s; only `checked.json`); D: build ok, test:db 127/127 (676 s); P 0 diffs; H, HN, HR, A clean. Logs `M/s4-{T,B,L,D}.log`.
- 2026-10-29 17:20 UTC: S5: run name `critwire-learn-check-py-<12 hex>` made once in `checkLab`; `takeLabLock(lab, db, {app})` refuses an earlier run's Python session in this db (named, pid + terminate command, never ended; lock freed); `cleanup.ts` `endRunSessions` (this db, this role, this name) used by `release()` after the recorded pids; 004 §7.6 cleanup + AGENTS.md learn:check line. red 2 → green 2 (py-runner.dbtest PYC7, PYC8). T 634/634 (FR7 closure + python.ts, venv.ts); L ok (only `checked.json`); D: test:db 129/129 (677 s); H, HN, HR, A clean. Logs `M/s5-{T,L,D}.log`.
- 2026-10-29 16:52 UTC: S6: Python blocks stage: `scripts/learn/py-runner.ts` (checks (a)–(d), wall time printed, `LEARN_BASE=file://<abs dist>`, one MPLCONFIGDIR per run), both engines settled together, venv check in `staticStage` (python + requirements sha in `checked.json`), freshness keys Python blocks (py-connect, boot, pg-session); 004 §7.6 + AGENTS.md. red 11 → green 11 (freshness FR4 msg, FR10–FR12; py-runner.dbtest PYC1–PYC5, PYC9, PY7/PY8); PY4 green first run. T 637/637; L ok (4 min 10 s; only `checked.json`; 121 PostGIS, 0 Python); D: test:db 137/137 (13 min 9 s); H, HN, HR, A clean. Logs `M/s6-{T,L,D}.log`.
- 2026-10-29 17:11 UTC: S7: `assemble.ts` `Download.kind`/`timeoutMs`, `pageDownloads`, `bootsNeeded` (SQL + Python word tests), `.py` + `.ipynb` from one part list; `scripts/learn/notebook.ts` (nbformat 4.5); build writes every kind + labs `requirements.txt`; freshness stamps sql + py; learn:check runs sql only (S8); pages get sql names (S9). AGENTS.md build line. red 9 → green 9 (assemble AS11, AS12, AS14–AS17; notebook AS13 ×2; e2e requirements.txt 404). T 645/645 (FR7 closure + notebook.ts); L ok (only `checked.json`); E 88/88, 0 skipped/flaky; H, HN, HR, A clean. Logs `M/s7-{T,L,E}.log`, artifacts `M/s7-e2e/`.
- 2026-10-29 18:07 UTC: S8: learn:check downloads stage runs `.py` (runPython, exit 0 in its blocks' time, blocks' env), leak check after a failed file too; 004 §7.6 + AGENTS.md. Resumed the interrupted session's uncommitted PYC6. red 1 → green 1 (py-runner.dbtest PYC6). T 645/645; L ok (251 s; only `checked.json`; first plain build refused stale labs as expected, closure moved); D: build ok, test:db 138/138 (809 s); P 0 diffs; H, A clean. Logs `M/s8-{T,L,D}.log`.
- 2026-10-29 18:19 UTC: S9: Python blocks on pages (`labHtml` by engine: code + Copy + Lab schema, result, `.py` + `.ipynb` links; exercise in Show answer; versions line + `; Python <v> with requirements.txt sha256 <12>` on pages with Python), `pageDownloads` through `learnPages`; `learn-labs.spec.ts` by `Download.kind`, versions line for any lab page, every `/learn/labs/` link on a page returns 200. red 9 → green 9 (module-html MH3, MH5, MH5b, MH6, MH10–MH14). T 650/650; B ok; E 89/89, 0 skipped/flaky; H (Learn HTML byte-identical too), A clean. Logs `M/s9-{T,B,E}.log`, artifacts `M/s9-e2e/`.
- 2026-10-29 18:40 UTC: S10: learn:port ports `python` fences (`.py` + `checked/<id>.txt`; parse errors at their 004 line; py-connect a course-wide helper), `pnpm learn:port setup` wrote py-connect, py-smoke + results; setup.html Python section (uv commands Win + Linux/macOS, environment, scripts/notebooks + ipykernel, PG* + lab role, py-connect, py-smoke, links requirements.txt/setup.py/setup.ipynb; tools row); 004 §0 (`# after:` + py-connect) and §7.5 (`site/learn/sql/<id>.py`); AGENTS.md learn:port line. red 9 → green 9 (port PT1, PT2, PT7, PT10–PT12; e2e ipynb cells = .py cells, 200 links incl. requirements.txt/setup.py/setup.ipynb, setup page; s4-cells adjacency vacuous until S13). T 653/653; P 0 diffs (18 pages, 385 files); L ok (py-connect, py-smoke equal 004 as recorded, 0.2 s each; setup.py exit 0 in 0.2 s; only `checked.json` + the 2 ported results); E 91/91, 0 skipped/flaky; H, HN, A clean; HR clean but port's fixture (allowed, Decisions). Logs `M/s10-{T,L,E}.log`, artifacts `M/s10-e2e/`.
- 2026-10-29 19:02 UTC: S11: `scripts/learn/agree.ts` (pure; gates moran, gistar, lisa, zonal over rendered results, skipped unless both blocks rendered; a missing table fails); `check.ts` runs it after the Python stage, `settleResults` `gateFailures` fail the run before any write; `s5-lisa-sql`'s format fixed as `quadrant | cells` (S17 prints it); 004 §7.6 + AGENTS.md learn:check line. red 10 → green 10 (agree AG1–AG8, record AG, FR7 closure). T 662/662; L ok (260 s; 4 gates skipped; only `checked.json`); P 0 diffs; H, HN, A clean. Logs `M/s11-{T,L}.log`.
- 2026-10-29 19:09 UTC: S12: s1 · bias written in full in 004 (Concept, worked example `s1-basis`, lab `s1-dominance`/`s1-jaguar`/`s1-devil`, Result, new browser exercise `s1-ex`, Check, Dialects); `learn:port s1`, `modules/s1.html`, curriculum s1 built, f4 links s1; `learn-browser.spec.ts` gains `s1-ex`'s wrong answer + s1 ids. red 1 → green 1 (s1-ex snapshot placeholder vs `dfa578491a18`). T 662/662; P 0 diffs (19 pages, 395 files); L ok (s1-jaguar, s1-devil equal 004; s1.sql 0 ERROR lines; only `checked.json` + 2 ported results); E 91/91, 0 skipped/flaky; H, HN, HR, A clean. Logs `M/s12-{T,L,E}.log`, artifacts `M/s12-e2e/`.
- 2026-10-29 19:47 UTC: S13: s4 · moran in full (004 + page), new `s4-agree` (pairs = `s4_neighbours`; esda at full precision) and exercise `s4-ex` (presence Moran); curriculum s4 built; g1-columns filters `s4_cells` (boot table leaked into g1's listing; result unchanged); E2E boot check reads `.sql` code only. Moran gate ok: 5 km n 1094 I 0.2732961251160256 E[I] -0.0009149130832570906 Var_norm 0.00032639905787023167 z 15.177857980448268 (SQL 15.177857980449323); 10 km n 296 I 0.2035877773186628 E[I] -0.003389830508474576 Var_norm 0.0012597916525627275 z 5.831415676740648. Python: s4-moran-pysal 2.4 s, s4-agree 3.2 s, s4-permutations 2.4 s; s4.py download 4.6 s. red 1 → green 1 (e2e boot adjacency, real now: g1.sql false positive, fixed). T 662/662; P 0 diffs (20 pages, 409 files); LU ok (7 min; new s4 results only, g1-columns diff traced and fixed), L ok (4 min 56 s; only `checked.json` + s4 results); E 91/91, 0 skipped/flaky; erd up to date; H, HR: only the g1 deviation; HN, A clean. Logs `M/s13-{LU,L,T,E}.log`, artifacts `M/s13-e2e/`.
- 2026-10-29 20:05 UTC: S14: learn:port setup = 004 §0 + §3.1–3.5 (gpkg-export, arcpy-moran ported, gpkg-export result as 004); setup.html GeoPackage + arcpy notes `<h3>`s under Python; setup.py boots s4-cells after py-connect, arcpy-moran commented out (Markdown cell in .ipynb); 004 §7.3 D5 + s4 Dialects link the arcpy notes (s4.html too). red 2 → green 2 (port PT1, PT13). T 663/663 (CF2's setup list updated); P 0 diffs (20 pages, 412 files); L ok (gpkg-export 1.5 s = 004; setup.py exit 0 in 2.6 s; only `checked.json` + ported gpkg-export.txt); E 91/91, 0 skipped/flaky; H, HN, HR, A clean. Logs `M/s14-{T,L,E}.log`, artifacts `M/s14-e2e/`.
- 2026-10-29 20:28 UTC: S15: s2 · point-patterns in full (004 + page), new exercise `s2-ex` (NNI vs study area); curriculum s2 built; s4 links s2. `pnpm learn:check --module s2` ran `s4-cells` once (finding 3's proof), then the page. Python: s2-kde 1.8 s; s2.py download 3.3 s; s2.sql 0 ERROR lines. T 663/663; P 0 diffs (21 pages, 422 files); LU ok (472 s; only `checked.json` + the 5 s2 results; ported 4 equal 004); E 91/91, 0 skipped/flaky; H, HN, HR, A clean. Logs `M/s15-{module,LU,T,E}.log`, artifacts `M/s15-e2e/`.

## Summary
