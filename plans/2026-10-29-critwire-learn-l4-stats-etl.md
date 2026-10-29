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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

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

Architect, 2026-10-29, on `d69b024`. "(checked)" marks facts verified on this VPS today. `SP` = the design spike, `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike` (not in git: `git log --all -- scripts/py-engine.ts` is empty). Its Python evidence: `SP/scripts/py-engine.ts`, `SP/test/python-engine.test.ts` + `SP/test/fixtures/python/` (PY1–PY10), `SP/moran/compare.py` + `SP/tests_py/test_moran.py` (MC1–MC7), `SP/etl/*.py`.

### Findings (ranked by impact)

1. **No Python engine exists in the repository; every block path is SQL-only.**
   - `parseBlock` refuses any file but `.sql`, `.m` and `.dax` (`scripts/learn/blocks.ts:108`), and `Engine` has no `python` (:24).
   - `learn:port` skips Python fences (`port.ts:99–103`). Its setup sections omit §3.3 and §3.4 (:13), where `gpkg-export` and `arcpy-moran` live.
   - `runBlock` throws on anything but PostGIS (`runner.ts:258`).
   - `isLab` and `recordedResults` count ran PostGIS blocks only (`freshness.ts:68`, `course.ts:257–263`).
   - `assembleDownloads` writes `.sql` only, one name per page (`assemble.ts:93`, `:145–168`). `writeLearn` writes no `.py`, `.ipynb` or `requirements.txt` (`scripts/build/learn/site.ts:67–71`).
   - A page has one `download` (`module-html.ts:33`, `pages.ts:132`). A Python block would fall into the Power BI branch (`module-html.ts:193–195`).
   - **Reusable as is:**
     - `childEnv(target, parent, pgOptions)` (`pg.ts:144`): an explicit environment that already takes PGOPTIONS and never copies GBIF_* or DATABASE_URL;
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

6. **Nothing stops a Python block's database sessions on an error or an interrupt (SC7).** `stopSessions` ends only the pids the runner recorded, with `application_name = critwire-learn-check` (`cleanup.ts:86–101`). A Python block's connections are opened by libpq inside a child process, so their pids are unknown. The spike killed the process group (PY8) but never checked the server's sessions. Fix: §4.4 and §4.6.

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
     - To measure: `s5-lisa` (999 permutations, no numba) and `s4-permutations` against the 60 s default (add `# timeout:` in 004 and the file if needed), and matplotlib's font cache under an empty HOME per block.
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
   - **Existing `dist/` files.** The SQL assembly must stay byte-identical for `d1.sql`…`g7.sql` and `pg-checks.sql`, and `site/learn/src` must not change, so `learn/assets/` stays too (DoD sha256 list).

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
- **`scripts/venv.ts` (new):** `VENV_PYTHON` (`.venv-learn/bin/python`). `scripts/ingest/python.ts:7` uses it, so the path lives in one place.
- **`ipykernel` stays unpinned.** The setup page says: VS Code or Jupyter offers to install it, and `uv pip sync` removes it again.
- **Platform check (Verification):** the labs file with `--no-build`:
  - Windows x86-64, Linux x86-64, Linux aarch64, and macOS 14 arm64 (`MACOSX_DEPLOYMENT_TARGET=14.0`) pass;
  - Intel macOS fails, as 004 says.

#### 2. Python blocks: files, parsing, linting, porting
- **Files.** Each block is `site/learn/sql/<id>.py`: 004's fence body, byte for byte.
  - `parseBlock` reads `.py` as `engine: "python"`.
  - Headers are the leading lines matching `^# [a-z]+:`: `q` and `status` are required, `after` and `timeout` optional (whole seconds above 0, default 60).
  - An unknown header, a missing one, a bad timeout or no code is an error naming the file and line (PY1).
  - `code` (what the page shows) is the text after the headers; `text` is what runs and downloads.
- **Linting.** Course-wide Python helpers are `{py-connect}` (`PY_CONNECT_ID`). `lintPage(blocks, bootIds, helpers)` checks each Python `# after:` id (PY5): it must be an earlier Python block of the page or a helper, ran, not itself.
  - The SQL rules are unchanged.
  - `privilege.ts` skips Python blocks as it skips Power BI (:314), but still refuses the name `learn_spatial` anywhere in their text.
- **Recorded results.** `recordedResults` and freshness's `isLab` count ran PostGIS **and** Python blocks. Results live in `site/learn/labs/checked/<id>.txt`.
- **`learn:port`.** It turns `python` fences into `.py` files and their results into `CHECKED_DIR`, and adds the setup sections `### 3.3 ` and `### 3.4 `. The skip goes.
- **Rendering.** `renderPython(id, stdout)` lives in `result.ts` beside `renderResult`: `-- result: <id> · python · sha256 <12 hex of stdout>`, then stdout without one final `\n` (PY10).

#### 3. The Python engine (`scripts/learn/python.ts`, new)
- **`pythonEnv(target, {home, learnBase})`:** `childEnv(target, process.env, "-c search_path=pg_catalog")`, with:
  - HOME = the run's own empty folder;
  - PATH = the venv's bin, then `/usr/bin:/bin`;
  - `PGAPPNAME=critwire-learn-check-py`;
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
- **`venvState()`:** one `python -I -c` probe through `importlib.metadata`: the Python version and the installed distributions. learn:check refuses, before connecting, an installed set that isn't the union of the two requirements files' pins ("…: run pnpm learn:venv"). No uv is needed at check time.

#### 4. `pnpm learn:check`
1. **Connect.** `assertLabRole` also refuses a superuser and a role with CREATE on `public`: "the labs run with a learner's privileges: run pnpm learn:check --setup" (MF5's guard).
2. **Static.** `staticStage(module)` puts the course's ran boot blocks first, then the run's blocks (finding 3). It runs the venv check when the run has a Python block.
3. **Blocks stage, in order:**
   - PostGIS boot blocks (committed), then the lab ERD check, then the other PostGIS blocks (`runner.ts`, unchanged);
   - the Python blocks, in page order (`scripts/learn/py-runner.ts`, new);
   - the agreement gates (§6);
   - with `--update`, the results written once every block of both engines passed.
   - **One result path for both engines.** The compare, update and write logic moves out of `runBlocks` (`runner.ts:577–617`) into `scripts/learn/record.ts` (new). Each engine returns `Outcome`s (the first run, plus the second with `--update`). `settleResults` compares them with `checked/<id>.txt` (a diff on difference, PY6), requires the two runs to agree (PY9), and returns failures and writes.
4. **Each Python block (`runPythonBlock`).** `LEARN_BASE` is `file://<abs dist>`, the build under test, read through the same urllib code. After the run, each of these checks fails the block:
   - (a) exit 0, in time;
   - (b) no `critwire-learn-check-py` session left after 10 s; a leftover is ended with `pg_terminate_backend` and named;
   - (c) `committedLeaks`: drops the lab role's `learn_` objects and names any other;
   - (d) `learn_curriculum` equal to the reading taken when the Python stage started (`readTables`/`tablesDiff`); a change stops the run there. The canary stays endStage's check: `critwire_lab` can't write it.
5. **Downloads stage, per download in page order:**
   - `.sql` as today;
   - `.py` on a fresh load: the loader, then `python -I <file>` through `runPython` from an empty folder, with the same environment and a limit of its blocks' timeouts plus 60 s per boot block. It must exit 0. The leak check runs after each file.
   - `.ipynb` isn't run: E2E proves its cells equal the `.py`.
6. **Cleanup (SC7).** The lock's `release()` also ends, in its step 1, every session with `application_name = critwire-learn-check-py` held by the lab role; the lock serializes runs, so these are this run's. An abort kills the Python process group and removes the temp folders (`runPython`); then cleanup's order runs as today.
7. **Stamp:**
   - `Versions` gains `python` and `requirements` (the labs file's sha256, 12 hex): recorded, never compared.
   - A Python block's key covers:
     - the ids: its own, its `# after:` chain transitively (on the page, then the helpers), every boot block, `pg-session` and `py-connect`;
     - the existing file entries: the manifest, the checker's import closure (the new modules included), `canary.sql`, `requirements.txt`.
   - The result sha256 as today.
   - `downloads` gains each `.py` (004 §7.5); `.ipynb` isn't stamped.

#### 5. Downloads (`assemble.ts`, plus `scripts/learn/notebook.ts`, new)
- **`Download` gains `kind: "sql" | "py" | "ipynb"` and `timeoutMs`** (for `py`). `assembleDownloads(pages)` stays the one function the build, learn:check and E2E share. Its SQL output stays byte-identical.
- **The boot rule is one helper with a per-engine word test:** `bootsNeeded(boots, codes, names)`.
  - SQL: a whole word outside SQL comments and strings (today's rule).
  - Python: a whole word in the text minus lines starting `#`, because the SQL lives in Python strings.
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
- **Moran (MC5, MC6).** `s4-agree` (a new Python block) prints:
  - per grid, the neighbour pairs in SQL (`s4_neighbours`) and in `DistanceBand`;
  - esda's I, E[I], Var_norm and z_norm, as `repr(float)`.
  - Against `s4-moran-sql`'s 5000 m row: the pairs are equal, and each statistic agrees within 5e-7 and as the same 6-decimal string.
- **Gi\*.** `s5-gistar`'s row equals `s5-gistar-pysal`'s data line.
- **LISA.** `s5-lisa-sql` (a new PostGIS block) counts cells per quadrant from z and the row-standardized lag. The counts equal `s5-lisa`'s `cells` column (185, 230, 557, 122).
- **Zonal.** `s6-zones`' shown rows against `s6-geopandas`' `eco_id | km2 | records` lines: the same records, km² within 1.

#### 7. Pages
- **A `python` branch in `module-html.ts`:**
  - the code, read-only, with Copy and Lab schema;
  - the recorded result, or the untested reason;
  - "In `<page>.py` and `<page>.ipynb`, with the blocks it runs after."
  - `PageContext.download` becomes `downloads: {sql?, py?, ipynb?}`, from `pages.ts`.
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
| e3 | **`e3-pick`, `e3-pick-pg`**: order by md5, then id; results unchanged.<br>**`e3-rerun`** kept, result unchanged. It is taught as a batch ledger: right for immutable batches, wrong for snapshots.<br>**`e3-snapshot`** (new):<br>- the ledger against "the target holds snapshot X" on A, B, A: the ledger leaves B, the snapshot state leaves A;<br>- the job id is the sha256 of the input, the transform version and the schema version, so a transform change reloads unchanged input.<br>**`e3-membership`** (new, PostGIS):<br>- the md5 cap is repeatable on the same input;<br>- a newly eligible low-hash id displaces a capped species' highest-hash record.<br>**The case-study text:** stale means the request changed. | SC8 e3 |
| e4 | **`e4-quarantine`** (new, PostGIS, on made-up rows):<br>- uncertainty that is negative, NaN or Infinity;<br>- 0, 0 coordinates, rejected as this dataset's rule;<br>- a year after the download.<br>The report keeps the key, the check and the value.<br>**Prose:** the capped sample is neither abundance nor unbiased effort.<br>**`e4-checks`** unchanged. | e4 |
| e5 | **`e5-job`** kept and labelled a simulation, in comments and prose only, so its result stays. Its docstring and Expected are fixed to match the redirect.<br>**`e5-refresh`** (new, prints nothing) writes `refresh.py`, the real job, from one string:<br>- it checks the PG* settings by name only, never logging a value;<br>- it reads `LEARN_BASE` and `REFRESH_SCHEMA` (default `etl`);<br>- in one transaction: `pg_try_advisory_xact_lock` (busy: log it, exit 0); the state row (file, sha256, job version) compared under the lock; the file fetched and verified; `TRUNCATE` + `COPY`, the row-count check and the state upsert; COMMIT;<br>- on any error: rollback, the reason on stdout, the traceback on stderr, exit 1.<br>**`e5-runs`** (new, after `py-connect` and `e5-refresh`) creates `learn_e5` with the target and state tables, then runs `python -I refresh.py` as separate processes:<br>1. A loads;<br>2. A again: skipped (the state persisted);<br>3. B, a local `file://` snapshot with one title changed: loads;<br>4. C, a manifest whose row count is off by one: exit 1, and the target and state are still B, read on the block's own connection;<br>5. with the lock held by the block: the run skips;<br>6. A again: loads;<br>7. without `PGDATABASE`: exit 1, naming the variable.<br>It prints one line per run (the exit code and the job's log line), never a path, port, pid or time. It drops `learn_e5` in `finally`.<br>**Prose:** with the redirect, cron mails nothing. `refresh-failed.service` only writes to the journal and alerts nobody until its `ExecStart` sends mail or a push. | SC8 e5; e5 |

The e-blocks write only TEMP tables, roll back, or use a `learn_` schema they drop (004 §5.5's intro says so). learn:check runs every lab as `critwire_lab`: the role guard (§4.1) and MF5.

#### 9. Diagrams
`.diagram-design` exists with `profile: critwire`, so it is reused and there is no first-run gate. Three diagrams, each light and dark, in system fonts, with the `<title>` as the alt text:
- `s4-band` (s4): a hexagon's ring distances √3·e and 3·e, and the 2·e band between them;
- `e2-load` (e2): file → text staging → typed → checks → one COMMIT or ROLLBACK;
- `e5-refresh` (e5): lock → state → fetch → verify → replace + state → COMMIT; a second run skips; a failure rolls back.

Each is exported with `export_svg.py --system-fonts` and checked with `self_check.py --offline`. The build's diagram checks apply as for L2's and L3's.

#### 10. E2E
**`learn-labs`:**
- each Python block's page code equals its segment of the served `.py`;
- an untested block is commented out under its reason in the `.py`, and is a Markdown cell (never a code cell) in the `.ipynb`;
- every `.ipynb` code cell equals its `.py` segment, in order, and cell ids are unique;
- each download that names `s4_cells` or `s4_neighbours` has `s4-cells` right after `pg-session` or `py-connect`;
- the result shown equals `checked/<id>.txt`, and the versions line has Python and the requirements hash;
- `/learn/labs/requirements.txt` equals the repo's labs file;
- every download link on a page returns 200.

**`learn-screens`:** s4, s5 and e2 at 1280 and 375 px.

E2E runs no Python (learn:check does). The browser blocks `s1-basis`, `s1-dominance` and `e3-pick` run in `learn-browser` as today.

#### 11. 004 and AGENTS.md
- **004**, each change landing with its code:
  - §0: Python `# after:` and the py-connect helper;
  - §3.3: two requirements files, the macOS 14 check, `ipykernel`;
  - §5.4 and §5.5 in full;
  - §7.3: `.py` and `.ipynb`; `arcpy-moran` commented out in `setup.py`;
  - §7.5: `site/learn/sql/<id>.py`, versions, freshness;
  - §7.6: `LEARN_BASE=file://`, the Python stage, the role guard, Python cleanup;
  - §7.7: learn-labs;
  - §9's L4 row.
- **AGENTS.md:**
  - Stack: the venv is used by the labs and learn:check too; the split requirements files;
  - Learn files: `sql/<id>.py`;
  - Commands: learn:check's Python stage and its venv and role checks;
  - State: s1–s6 and e1–e5 built.

### Failure cases, written as tests before the code
**Engine** (`scripts/learn/python.test.ts`, pure; process tests use `/usr/bin/python3.12`, so no venv is needed; PY4 and the round trip in `python.dbtest.ts`):
- **PY1** A `.py` block with no `# q:` or `# status:`, an unknown header, a bad `# timeout:`, no code, or an unknown status fails, naming the file and line.
- **PY2** The block runs `-I` from an empty cwd. Its code file is outside the cwd, HOME is its own empty folder, and a planted `json.py` (in the cwd or beside the code) isn't imported.
- **PY3** Its environment is exactly PATH, HOME, the lab target's PGHOST, PGPORT, PGUSER, PGDATABASE (and PGPASSWORD when the URL has one), `PGOPTIONS=-c search_path=pg_catalog`, PGAPPNAME and LEARN_BASE. GBIF_*, DATABASE_URL and LEARN_PG_URL never reach it.
- **PY4** (db) A connection without the helper fails with `relation "species" does not exist`; through the helper, `SHOW search_path` is `learn_curriculum,public`.
- **PY5** `# after:` takes an earlier Python block of the page or py-connect. An unknown, later, self, other-engine or untested id is refused. The code runs in page order, py-connect first.
- **PY6** Stdout that differs from the recorded result fails with a line diff; a missing result says "run --update".
- **PY7** A non-zero exit fails, quoting stderr's last 5 lines, and the run goes on.
- **PY8** A block over its timeout fails; its process group is killed, with no child left (pgrep); the run goes on.
- **PY9** `--update` runs each block twice. Different stdout fails, and nothing is written.
- **PY10** The rendering is `-- result: <id> · python · sha256 <12 of stdout>` plus stdout less one final newline; `"a"` and `"a\n"` differ.

**SC7, cleanup** (`py-runner.dbtest.ts`, under the lab lock):
- **PYC1** A block that commits a `learn_t_` schema and exits 0 fails ("committed …; the runner dropped it"), and nothing is left.
- **PYC2** The same, then a raise: the same, plus the exit failure.
- **PYC3** A block that commits a table into `learn_curriculum` fails, naming it, and the run stops there.
- **PYC4** A block that starts a background process holding an open transaction, then sleeps past `# timeout: 1`: no process left, no `critwire-learn-check-py` session, no temp folder, and the next block runs.
- **PYC5** An abort during a Python block rejects with its reason. The process group and temp folders are gone, cleanup ends the sessions and sweeps the lab role's `learn_` objects, and the lock is free.
- **PYC6** A `.py` download that exits non-zero midway is named with stderr's tail; the leak check still runs and `checked.json` isn't written.

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

**Gates** (`agree.test.ts`):
- **AG1** The neighbour pairs differ: it fails, naming the grid.
- **AG2** A statistic differs by more than 5e-7: it fails.
- **AG3** The 6-decimal strings differ although the difference is within 5e-7: it fails.
- **AG4** n differs: it fails.
- **AG5** Gi\*'s line differs: it fails.
- **AG6** A LISA quadrant count differs: it fails.
- **AG7** Zonal records differ, or km² differ by more than 1: it fails.
- **AG8** Only one block of a pair is in the run: the gate is skipped.

**Environment and role:**
- **V1** A venv with a missing, extra or wrong-version package is refused, naming it.
- **V2** A superuser lab role is refused.
- **V3** A lab role with CREATE on `public` is refused.

### Review items: where each is done
| Item | Where | How it's verified |
|---|---|---|
| MF5 | §8 e2-geopandas; §4.1 guard | learn:check runs it as `critwire_lab` and prints and asserts the namespace inside the open transaction; V2, V3 |
| SC8 e3 | §8 e3-snapshot, e3-membership, e3-pick | their recorded results (A, B, A → A; displacement) |
| SC8 e5 | §8 e5-refresh, e5-runs | separate processes, changed input, failed load, overlap, all in e5-runs' recorded result |
| e1, e2, e4, e5 corrections | §8; 004 and the page in the same commit | results of e1-retry, e1-decide, e2-copy-fails, e2-casts, e4-quarantine; `learn:port --check all` |
| SC7, Python part | §3, §4.4, §4.6 | PYC1–PYC6 |

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

### Work units and budget
**Order constraint:** `s4-cells` (the boot block) is on s4's page, and s2, s3, s5 and `gpkg-export` read its tables. So **s4 is built before s2, s3 and s5**.

Rough units (the planner writes the Steps):
1. The venv split (§1; finding 2).
2. The block model and port (§2; PY1, PY5, PY10 first). The setup page's `py-connect` and `py-smoke` port in this step.
3. The engine (§3; PY2, PY3, PY7, PY8, V1 first).
4. learn:check's Python stage (§4.1–4.4, 4.6, 4.7; PY4, PY6, PY9, PYC1–PYC5, V2, V3 first; finding 3).
5. Assembly and downloads, the build's files, Python on pages and the versions line (§5, §4.5, §7; AS1–AS6, PYC6 first).
6. The gates (§6; AG1–AG8 first).
7. s1.
8. s4, with `s4-agree` and `gpkg-export`.
9. s2.
10. s3.
11. s5.
12. s6.
13. e1.
14. e2.
15. e3.
16. e4.
17. e5.
18. The diagrams: one unit, or each with its module.
19. E2E completion and screenshots.
20. AGENTS.md, the 004 pass, and the DoD audit (dist sha256 against the Baseline list).

That is about 20–23 units, since 4 and 5 may split.

**Budget:**
- 2 sessions are used (log), and 4 stages are left (Fable, Astra, Revision, Steps).
- About 22 step units.
- The code review plus up to 2 fix steps, Verification, Summary and Release: about 6.
- **Total: about 34 of the 48-session cap.**
- If the count passes 40 before the code review: one diagram (`e5-refresh`) and no zonal gate. No Goal deliverable is cut.

### Decisions (to copy under Decisions)
- **D1 Two requirements files** (labs = 004's 44 pins, published; ingest = rasterio, constrained by the labs file), one venv. Reason: rasterio breaks macOS 14 arm64 with `--no-build` (checked), and learners don't import it.
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
- **D12 The agreement gates are TS over the run's results,** with the new `s4-agree` (full precision, pairs) and `s5-lisa-sql`. Reason: MC5, MC6 and "Gi\* and LISA tested against esda" become recurring and pure.
- **D13 The Python stage runs after the PostGIS one,** and results are written once both pass. Reason: one result path, no cross-engine state.
- **D14 A `.py` download's check is exit 0,** plus the release smoke on `s4.py`. Reason: 004 §7.6, and `# after:` re-prints.
- **D15 Three diagrams** (`s4-band`, `e2-load`, `e5-refresh`). Reason: geometry and flows teach better drawn than in prose.
- **D16 No new Windows handoff item.** Reason: per-platform resolution is checked, and 004 §10 item 8 stands.
- **D17 Python sessions carry `PGAPPNAME=critwire-learn-check-py`,** and cleanup ends them. Reason: SC7, since their pids are unknown.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- Architecture D1–D17 (end of `## Architecture`) proposed 2026-10-29; final after Revision.

## Log

- 2026-10-29 14:02 UTC: Baseline: install, venv, typecheck, test 601/601, build, test:db 121/121, learn:check, e2e 87/87 all pass; sha256 lists saved.
- 2026-10-29 14:27 UTC: Architecture: architect wrote findings, target design (Python engine, learn:check Python stage, .py/.ipynb downloads, agree gates, MF5/SC8/SC7 realisation), PY/PYC/AS/AG failure lists, D1–D17. Doc-only; no checks needed.

## Summary
