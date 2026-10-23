---
mission: critwire-learn-curriculum
project: critwire
branch: agent/critwire-learn-curriculum
status: active
started: 2026-10-23 04:35 UTC
---

# Mission: critwire Learn, redesigned as a practitioner curriculum

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-23-critwire-learn-curriculum.md
     Start: mission start critwire <this file>   (base: main at c305f87 or later)
     Owner's decisions (control room, 2026-10-23):
     - Learn is first for the owner: a game developer and GIS specialist who needs to get better at GIS, spatial
       statistics, ETL, Power BI and database architecture for his job. It stays public on critwire.com, general enough that
       anyone can use it with critwire's data. critwire itself (open species data) is unchanged.
     - Level: from the ground up, but fast.
     - Lab tools: PostGIS (Postgres), Python (GeoPandas, PySAL; arcpy optional on the owner's PC with ArcGIS Pro Basic), and
       Power BI Desktop. Plus the browser (DuckDB-WASM) where it fits. SQL Server and ArcGIS Pro aren't lab tools.
     - critwire is the hub. The owner's private vault study guides stay private; the plan maps topics to them for the owner only.
     - Shape: this design mission, then the owner reviews it, then the build missions run chained.
     This replaces the course designed by A1/A2 (plans/002-learn.md, 003-learn-data-spatial.md: ages 16+, beginner game).
     Their engine, schema, data, licensing, raster and IUCN findings are reused, not redone.
     Brief reviewed by Fable 2026-10-23: APPROVE_WITH_CHANGES; its 7 must-fix items are folded in. -->

### Goal

A tested design for **critwire Learn as a practitioner curriculum**, in `plans/004-learn-curriculum.md`. It takes someone who knows a little SQL and everyday GIS, **starting with the owner**, to working skill in five areas, using critwire's open species data and other open data:

1. **Database architecture:**
   - relational design, keys and constraints, normalization
   - indexes and query plans, transactions
   - schemas and roles
   - dimensional modelling (star schemas)
2. **GIS in SQL:**
   - coordinate systems and projections
   - geometry and geography, validity
   - spatial relationships and joins, measurement and overlay
   - spatial indexes
   - raster, using the habitat map
3. **Spatial statistics:**
   - point patterns and density
   - spatial weights and autocorrelation (Moran's I, LISA)
   - hot spots (Getis-Ord Gi*)
   - zonal statistics
   - an honest look at sampling bias in occurrence data
4. **ETL:**
   - extract from APIs and files, transform, load
   - idempotent, repeatable pipelines; data quality checks; provenance and licenses; scheduling

   critwire's own pipeline (ingest → derive → build) is a real case study.
5. **Power BI:**
   - modelling a star schema from critwire's data
   - Power Query as ETL, DAX measures, maps
   - refreshing from critwire's published files

It covers foundations first, fast, then goes deep. The public pages stay general: anyone (GIS people, game developers, students) can follow them with critwire's data. **Design only:** nothing public changes in this mission. It ends with build briefs that run chained after the owner reviews the design.

#### What goes in `plans/004-learn-curriculum.md`

1. **What carries over.** List what this design reuses from `plans/002-learn.md` and `plans/003-learn-data-spatial.md`, by section, and what's dropped. Reuse:
   - the engine choice and measurements (DuckDB-WASM eh, self-hosting, the 10 000-row cap)
   - the learners' schema and ERD
   - `/v1/countries`
   - the dataset research and licenses
   - the raster recommendation
   - the IUCN conclusions

   Drop the ages-16 beginner path and the "Name that animal" game unless something fits the new curriculum. Add a dated "Superseded" note at the top of 002 and 003 pointing here; change nothing else in them.
2. **The curriculum map.** Tracks and modules in order:
   - foundations (fast)
   - then the five areas above
   - a capstone that ties them together for a game developer: for example, an ETL pipeline from critwire into PostGIS, spatial statistics on the result, a Power BI report, and a small data feed a game could read

   For each module give:
   - the skill
   - the questions it answers with the data
   - the tool (browser, PostGIS, Python, Power BI)
   - the time it takes
   - prerequisites
3. **Where each lab runs, and the setup.**
   - **Browser (DuckDB-WASM):** foundations and light spatial work.
   - **PostGIS:** the learner's own install. Give setup steps for Windows (Docker or native) that the owner can follow at home. Labs must also run unchanged in `critwire_dev` on the VPS, where they're tested.
     - Labs that create roles or schemas run in `critwire_dev` as `critter-ai` over the socket (the `.env` role `critwire` can't create roles).
     - Their names start with `learn_`, and each lab drops what it creates in the same block.
     - The published page says the learner needs CREATEROLE on their own install.
     - Scratch tables go in schema `learn_curriculum`; never drop A2's `learn_spatial`.
   - **Python:** a pinned environment (`requirements.txt` or `environment.yml`) with GeoPandas and PySAL, and arcpy notes for anyone with ArcGIS Pro.
   - **Power BI Desktop:** Windows only, so state what's tested (the data it reads) and what can't be tested here (the report itself). The refresh path is `Web.Contents` on named critwire CSV files, so "input verified" refers to concrete files.
4. **Lab data.** The 76 species are too few for spatial statistics, and the design must face that. Say which datasets each module uses and how critwire publishes them. Options include:
   - the GBIF open-records sample A2 recommended, sized for statistics
   - Natural Earth countries and admin-1
   - RESOLVE ecoregions
   - habitat summaries and clips (Jung v004)
   - other open data A2 found

   Check each license (reuse A2's quotes) and size. Decide where it's published:
   - `/v1` (critwire's data contract)
   - or a separate `/learn/data/` (lab datasets, which may change)

   Give the build and ingest steps.

   **The GBIF sample:**
   - Draw it with the **occurrence download API**, using the credentials from H1 in `.env`. Predicate: the taxonKeys, license `CC0_1_0`/`CC_BY_4_0`, hasCoordinate, and no geospatial issue. That gives it its own DOI and no paging cap. This is a change from 003 D3; record it.
   - If the published file is a reduced subset, the build mission registers a derived dataset for it (the `gbif:register` pattern). That registration is separate from `10.15468/dd.ky9cyt`, which stays untouched.
   - Cap committed lab data at 50 MB total: `dist/` is copied on every deploy and lives in git history.

   **CORS:** Caddy sends CORS on `/v1` only. Same-origin DuckDB-WASM, PostGIS `/vsicurl/`, Python and Power BI need none. Third-party browser readers would, which is a control-room change. Choose `/v1/learn/` if cross-origin use matters.
5. **Modules in full, for the first two tracks.** Write foundations and database architecture in full: concept, worked example, lab steps, the real result, an exercise with its answer, and how it's checked. **Outline** the remaining tracks: each module's goal, the data, the key queries or code, and the expected result. That keeps this mission within budget, and the build missions write the rest. **At most 10 modules in full** (foundations ≤ 4, database architecture ≤ 6). If the Steps stage yields more than 30 steps, the planner demotes the last database-architecture modules to outlines rather than adding steps.
6. **ERDs.** Update the first-schema ERD (from 002) and draw:
   - the lab database's ERD, including the occurrence and region tables
   - the star schema used in the Power BI track (facts and dimensions)

   Keep the sources as Mermaid in the repo, as before.
7. **The site.** How the course appears on critwire.com:
   - its URLs
   - module pages, lab pages, and downloadable lab files: SQL scripts, Python notebooks or scripts, Power BI data files
   - progress without accounts (local storage at most)
   - how the build and E2E test it

   Reuse 002's page design (cards, editor, schema button) wherever it fits.
8. **For the owner only.** A short map of which modules overlap his private vault study guides, read-only:
   - `research/sql-server-spatial/` on vault `main` (modules 00–19)
   - the `arcgis-pro-home` material, now `wiki/` pages on `main`
   - `pro-python-arcpy`, only on branch `agent/pro-python-arcpy`; read with `git show agent/pro-python-arcpy:research/arcgis-pro-study-guide/...` For each, say whether the vault guide covers it already, so he can skip it, or whether critwire's module adds the PostGIS or open-data version. **Name modules only; never copy vault content into the repo** (the vault is private).
9. **Build missions.** Ready-to-start briefs in `plans/briefs/`, in the ops brief format, each sized to finish well within 60 sessions, in the order they run. They'll be chained, so each must state what it needs from the one before. Mark the old `critwire-learn-b1/b2/c/d` briefs superseded.
10. **For the owner.** Choices only he can make, each with a recommendation and its cost. Include the replacement for `AGENTS.md`'s "write copy fresh for grades 6–12" line, which the first build brief applies.

#### Tested, not just written

- **SQL:** every SQL block carries `-- q: <id>` and `-- status: ran | untested: <reason>`.
  - Run them in DuckDB (browser-engine statements) or PostGIS in `critwire_dev` (PostGIS labs).
  - Record the results in `queries.log`; Verification re-runs them.
  - Copy A2's `run-queries.ts`, which already runs `-- engine: postgis` blocks (`spike/scripts/pg-engine.ts`).
- **Python:** every Python block carries `# q: <id>` and `# status: …`.
  - The spike's runner extracts blocks by id, runs them in a venv in the spike folder on the pinned packages the design names, and records each block's stdout sha256 in `queries.log`, as for SQL.
  - No apt installs.
- **Power BI:** Power Query M and DAX can't run here. Mark them `untested: Power BI is Windows-only`. Instead, verify the data they read: file shape, keys and row counts.
- **One spike per tool:** a working example of each of these, with commands and results recorded:
  - an ETL run that loads a GBIF open-records sample into PostGIS
  - global Moran's I computed in PostGIS as plain SQL and in PySAL, with matching results. PostGIS ships no autocorrelation, Gi* or density function, so build the weights from `ST_DWithin` or k-nearest via `<->`. In PySAL use `esda.Moran` on a `libpysal.weights.DistanceBand` with the same binary weights and transformation. I, E[I] and the normality z-score must agree to 6 decimals; permutation p-values aren't compared.
  - a star-schema export Power BI would read

  Outputs go in `spike/out/etl-postgis/`, `spike/out/moran/` and `spike/out/star-export/`, each with a `summary.md`.

### Why

The owner is a GIS specialist and game developer whose job needs stronger GIS, spatial statistics, ETL, Power BI and database architecture. A course he builds for himself on real, open data is one he'll actually use. Publishing it on critwire.com keeps critwire's purpose (open data people can learn from and build on) and lets others follow the same path. Every example must be tested, because a course with broken labs wastes the learner's time.

### Scope

In:
- `plans/004-learn-curriculum.md` and Mermaid ERD sources under `plans/`.
- A "Superseded" note at the top of `plans/002-learn.md` and `plans/003-learn-data-spatial.md`.
- New briefs in `plans/briefs/`, plus a superseded note on the old ones.
- The plan file.
- Spikes in `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/` (under 3 GB): their own `package.json` or venv, data extracts.
- Scratch tables in `critwire_dev`.

Out:
- **Nothing public changes.** No changes under `scripts/`, `site/`, `e2e/`, `data/` or `db/`, and none to `package.json` or the lockfile. `pnpm build` gives the same `dist/` as `main`.
- `/srv/apps/critwire`, `/etc/caddy`, `/srv/critter-ai/ops`, apt packages. Never connect to the `critwire` database except through `deploy critwire` at the release.
- The vault: read only, and only the module titles and topics for section 8.
- **No IUCN data**, and no Wikipedia prose. WorldClim and WDPA are never hosted (A2).
- The owner's S3 bucket: never changed.

### Definition of done

- `pnpm typecheck` and `pnpm test` pass.
- `dist/` is unchanged:
  - Save the `sha256sum` of a fresh `origin/main` build and of the live files at Baseline.
  - Compare at Verification and in the release smoke.
- Every SQL and Python block in `plans/004-learn-curriculum.md` is either `ran` with a recorded result that Verification reproduces, or `untested` with a reason. Power BI blocks are `untested`, with their input data verified.
- The three tool spikes ran, and their evidence and commands are in the spike folder.
- The ERDs exist as Mermaid sources and render to SVG/PNG in the spike folder.
- The plan's Summary gives:
  - the curriculum map (tracks and modules, with tool and hours)
  - the lab datasets, with licenses and where they're published
  - what was reused and what was dropped
  - the vault overlap in brief
  - the build briefs in order, with session estimates
  - the owner's choices

### Decision rules

- **Simplest approach that works** (`AGENTS.md`), and critwire stays static files: labs run in the browser or on the learner's own tools, never on a critwire server.
- **The owner's job first.** When choosing depth, order or examples, pick what a working GIS specialist needs. Use transferable tools and standard SQL; flag anything engine-specific.
- **Foundations fast:** short and practical. Link out to good open references instead of rewriting textbooks.
- **Honest data:** occurrence records are biased samples, not where an animal lives. Spatial statistics modules must teach that, not hide it.
- **Licenses decide what critwire publishes.** If unclear, don't publish.
- Decide freely within this brief and record the calls under Decisions. Anything about cost, licensing or what goes public goes to section 10. Add a handoff item only if the mission can't finish without an answer.

### Notes

- **Inputs on `main` (`c305f87`):**
  - `plans/002-learn.md` (A1: engine and measurements, schema, ERD, the old lessons, cookbook, countries file, site design)
  - `plans/003-learn-data-spatial.md` (A2: datasets and licenses, the grown ERD, the spatial track, the raster, IUCN)
  - `plans/002-learn-erd.mmd` and `plans/003-learn-erd.mmd`
  - the old build briefs in `plans/briefs/`
  - A1/A2's evidence and scripts in `/srv/critter-ai/agent-state/missions/critwire-learn-design/` and `.../critwire-learn-spatial-design/` (`run-queries.ts`, spikes, `queries.log`)
- **On the VPS:**
  - Postgres 16 with PostGIS 3.4.2; `postgis_raster` is installed in `critwire_dev` by A2. No PostGIS 3.5-only functions.
  - No GDAL command-line tools.
  - **Python:** Python 3.12.3 is present, but `python3-venv` and pip are not (`ensurepip` is missing), so `python3 -m venv .venv` fails. Two ways around it without apt:
    - `python3 -m venv --without-pip .venv && curl -sSLo get-pip.py https://bootstrap.pypa.io/get-pip.py && .venv/bin/python get-pip.py`
    - or install `uv` into `~/.local/bin` with its standalone installer and use `uv venv` and `uv pip`

    Pin versions in `requirements.txt`. Every package in the stack has an aarch64 cp312 or pure-Python wheel: numpy, scipy, pandas, shapely, pyproj, pyogrio, rasterio, pyarrow, geopandas, libpysal, esda, pointpats and psycopg. Only if both paths fail, add a handoff item asking for `apt install python3.12-venv`.
  - **PostGIS functions:** 3.4.2 has `ST_ClusterDBSCAN`/`KMeans`, `ST_HexagonGrid`, `ST_VoronoiPolygons`, and the raster functions `ST_Clip`, `ST_SummaryStats(Agg)` and `ST_ValueCount`. Schema `learn_spatial` (A2) holds 528 occurrences, one habitat clip and the country shapes.
  - Playwright Chromium headless (ARM64). About 24 GB free disk.
- **The owner's context:**
  - He works in ArcGIS Pro and SQL Server enterprise geodatabases. At home he has ArcGIS Pro **Basic** and a Wisconsin practice dataset (`wiwater`, in the vault).
  - He develops Critter Connect (a Phaser game with Postgres/PostGIS on Hetzner), so a game-developer capstone fits.
  - Power BI Desktop runs on his Windows PC.
- **Data facts:** 76 species (50 mammals, 15 amphibians, 11 reptiles), 107 country codes, no traits. GBIF derived dataset DOI `10.15468/dd.ky9cyt`; a new published GBIF sample may need its own DOI (A2 §8 item 6).
- **Release:** critwire missions merge and deploy themselves at the end. Here only plan files merge, so the deploy changes nothing live; the smoke checks that.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-23, worktree HEAD `a2f5dc7` (= `origin/main` `c305f87` + this plan; `git diff --stat origin/main HEAD` touches only this plan, so its build is `main`'s build). `<m>` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/`, `<spike>` = `<m>/spike/`.
- `pnpm install --frozen-lockfile`: up to date. No lint script and no migrations: `pnpm build` rebuilds the schema in `critwire_dev` each run.
- `pnpm typecheck`: pass. `pnpm test`: 66/66 pass.
- `pnpm build` (after `rm -rf dist`): pass, 157 files in `dist/`.
- `E2E_ARTIFACTS=<m>/baseline-e2e pnpm e2e`: 20/20 pass (report `<m>/baseline-e2e/playwright-report/`); ports 3100–3102 free afterwards.
- **dist hashes** (Definition of done): `<spike>/baseline/dist.sha256` (157 files, `sha256sum` from inside `dist/`), identical to A2's baseline list. Live files fetched from https://critwire.com into `<spike>/baseline/live/`, hashed in `<spike>/baseline/live.sha256`: identical to `dist.sha256`.
- Reproduce: `rm -rf dist && pnpm build && (cd dist && find . -type f | sort | xargs sha256sum) | diff - <spike>/baseline/dist.sha256`.
- `critwire_dev`: `postgis` and `postgis_raster` 3.4.2 installed. Schema `learn_spatial` (A2) owned by `critter-ai`: 528 `occurrences`, 1 `habitat_clips` row, plus `country_shapes`, `example_ranges`, `habitat_classes`, `species`, `species_countries`. The `.env` role `critwire` gets `permission denied` on it (no CREATEROLE, not superuser); `critter-ai` over the socket (`psql -d critwire_dev`) is superuser. Labs touching `learn_spatial`/roles run as `critter-ai`.
- Python 3.12.3, no `ensurepip`, no `uv`: venv needs `--without-pip` + get-pip.py, or a standalone `uv` (brief Notes).
- Disk: 24 GB free.

## Architecture

Architect, 2026-10-23, 04:40–05:15 UTC. Nothing public changes; the "code in scope" is 002/003 and their ERDs, A1's and A2's spikes (read only; `<a1>` = `…/missions/critwire-learn-design/spike/`, `<a2>` = `…/missions/critwire-learn-spatial-design/spike/`), the repo's build (`scripts/`, `site/`, `e2e/`, `db/`), `critwire_dev`, GBIF and the vault's titles. Scratch went to `/tmp/a3arch/` only; no GBIF download was submitted. `<spike>` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/`, `<m>` = its parent. **(S)** marks a fact the spike must confirm. **Revised** 2026-10-23 05:10–05:40 UTC for both reviews (Revision notes); F10–F13 are new, the rest edited in place.

### Findings (ranked by impact)

**F1. Nothing of Learn exists yet, so the old briefs' premise is wrong** (bug in the chain's assumptions).
- `site/` holds only `index.html`; `dist/` has 157 files, none under `/learn/`; `/v1/countries.*` doesn't exist (Baseline). B1, B2, C and D never ran, yet 003 §7 assumes "B delivered" them.
- So 002's engine and app core (§1, §8), its countries file (§6) and its ERD pipeline (§3) are unbuilt work. They carry over as design, not as done.
- **Fix:** the new chain builds them first (T10, L1–L2); the old briefs are marked superseded.

**F2. 76 species, or A2's 528 points, can't carry spatial statistics, and the full open set mostly measures two monitoring programmes** (honest data).
- Probe, 2026-10-23 (`occurrence/search`, `limit=0`, the countries filters from `scripts/ingest/gbif.ts:26-29`, the 73 taxonKeys, legacy `checklistKey`): **396,629** records. `contributions.json` (2026-10-21) says 396,627, from 454 datasets.
- The largest datasets: `06e98c3e…` *Jaguar Movement Database* (GPS telemetry), 134,690, which is 97 % of the jaguar's 138,459; `0645ccdb…` NSW BioNet Atlas, 120,851; SA Fauna, 27,008; Tasmanian Natural Values Atlas, 24,824. By basis of record: human observation 193,986, machine observation 147,611.
- Per species: at most 153,922 (bilby); 21 species have ≥ 1,000; 37 have < 100. A per-species cap of 2,000 gives 46,366 rows.
- Raw point counts therefore measure recording effort (collars, state atlases, roads), not where animals live.
- **Fix:** a deterministic capped sample (T5), areal units for statistics (T7b), and the bias module (s1) before any statistic (T3).

**F3. The download's taxonomy rests on a default GBIF calls obsolete** (latent bug: the filter and output taxonomy could switch silently; and a wording trap for the course).
- `ids.gbif` are keys of the legacy backbone (`d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, `scripts/ingest/gbif.ts:14`).
- GBIF's download docs (techdocs `…/data-use/api-downloads`, re-read 2026-10-23): "If no `checklistKey` is supplied the obsolete GBIF Backbone Taxonomy will be used", and it "should be specified for the whole request (for the taxonomy used for output) as well as in taxonomic filters". So today an omitted key *does* match `ids.gbif`.
- The risk is the default moving: `occurrence/search`'s already did (COL XR since 2026-06, `AGENTS.md`), and the docs call the backbone obsolete. A moved default would re-read our 73 keys against another taxonomy and change `speciesKey` in the output, with no error.
- **Fix:** set `checklistKey` to the legacy key at the top level and on `TAXON_KEY` (T7a), and check GBIF's stored request echoes both. (S) whether GBIF accepts the legacy key explicitly; if not, the `ids.col` keys with COL's checklist (T13). 004 §4 and e1 state the documented default correctly and teach pinning it rather than trusting it.

**F4. A2's query runner, copied as it is, would rebuild `learn_spatial` and refuse the database-architecture labs** (bug, and a breach of the brief).
- `<a2>/scripts/pg-engine.ts` `openPgEngine` runs `runPgSetup` on every connect, and that is 003's `pg-setup`: `DROP TABLE IF EXISTS learn_spatial.*`, then a rebuild.
- `<a2>/scripts/plan-queries.ts:102-145` refuses transaction control, `GRANT`/`REVOKE`/`ALTER ROLE`, every `SET`, and `random(`. d4 (transactions) and d5 (roles) need exactly these.
- Its DuckDB boot `LOAD`s `spatial` and runs `setup-grown` (`<a2>/src/engine.ts:73-75, 196-219`); neither is part of this design.
- `<a2>/scripts/pg.ts:14-18, 102-110` (Fable, verified): `SCHEMA = "learn_spatial"`, `search_path = learn_spatial, public` and `CREATE SCHEMA IF NOT EXISTS learn_spatial` on every connect, after the raster `capabilityCheck`; its PG9 (`scanForPrivilegeChanges`, `:258-274`) fails the run on any `GRANT`/`REVOKE`/`ALTER ROLE` text in the spike's code. As copied, every unqualified lab statement would hit `learn_spatial`.
- **Fix:** T6 lists the changes: `pg.ts` re-pointed to `learn_curriculum`, its own loader, a content canary on `learn_spatial`, narrow allowances, and Python and Power BI engines.

**F5. Loading a learner's own PostGIS was never tested, and can't be as 003 wrote it** (breaks "every lab tested").
- 003 §4 and §6 give learners `sh` fences (`shp2pgsql`, `ogr2ogr`), which A2 left uncounted (A2 plan, T3 "Not run here"). The VPS has no GDAL command-line tools, and the `postgis/postgis` Docker image doesn't ship them either (S).
- The brief says labs "run unchanged in critwire_dev".
- **Fix:** one loader that needs only `psql` (`COPY … FROM stdin (FORMAT csv)`, geometry as WKB hex: F10). The runner executes it with the exact command a learner types (T5, T6).

**F6. The 50 MB cap rules out A2's file sizes as they are.**
- Sizes A2 measured: admin-0 1:10m GeoParquet 7.35 MB (1:50m: 1.21 MB); admin-1 1:10m GeoJSON 40.7 MB (1:50m: 2.3 MB); RESOLVE zip 149 MB; DuckDB's `spatial` extension 23.6 MB per DuckDB version; Costa Rica clip 1.42 MB; Jung composite 2.45 GB.
- Every open record as Parquet would be about 10 MB, and as a psql loader about 45 MB (S).
- **Fix:** 1:50m layers; RESOLVE simplified (≤ 8 MB, or cut to the lab regions); the sample capped at 2,000 per species; no `spatial` extension in the browser. The build enforces the cap (T5).

**F7. Only `/v1` sends CORS, and no lab reader needs it.**
- `e2e/Caddyfile`, the copy of the live block, sends `Access-Control-Allow-Origin *` on `/v1/*` only.
- DuckDB-WASM on critwire's own pages is same-origin; PostGIS `/vsicurl/` reads server-side; Python and Power BI aren't browsers. Only someone else's web page would need CORS.
- **Consequence:** lab data goes under `/learn/data/` (T5); CORS there is an owner's choice (T11).

**F8. Two traps in matching PostGIS to PySAL** (would make the Moran spike disagree; S: the spike confirms each with a 3-point case).
- libpysal `DistanceBand(binary=True)` sets distances > 0 to 1 and drops zeros, so two distinct points at the same coordinates aren't neighbours. `ST_DWithin(a, b, d) AND a.id <> b.id` makes them neighbours. Occurrence points have many duplicates (telemetry fixes, roadkill sites).
- **KNN ties:** libpysal breaks ties by tree order, PostGIS `<->` by index order, and a regular grid is all ties.
- **Fix:** Moran's I on areal units with distinct centroids, a distance band whose threshold sits in a gap between distance classes, and KNN taught on irregular centroids only (T7b).

**F9. The VPS Python has no `ensurepip` and no `uv`** (Baseline). **Fix:** a pinned, spike-local `uv` (T4).

F10–F13 come from the reviews, each verified; by impact they sit after F5.

**F10. `COPY`'s default text format silently alters backslashes** (bug: wrong data, no error; Fable MF1).
- GBIF's `SIMPLE_CSV` is tab-separated with no quoting. Read as `FORMAT text`, `\N` becomes NULL and `\t`, `\n`, `\x..` in free text (`locality`, `recordedBy`) shift or change values.
- The same trap hits the loader (T5): in text format `\x0101…` is a byte escape. Checked in `critwire_dev` (TEMP table, rolled back): a 21-byte point's `\x` hex WKB loaded as 41 bytes of garbage with no error; `FORMAT csv` gave `POINT(1 2)`.
- Checked too: `COPY … (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '', HEADER true)` keeps `C:\new "quoted" \N place` byte for byte and reads an empty field as NULL.
- **Fix:** that form for the GBIF file (T7a, e2's key query); `FORMAT csv` for every loader table (T5). One rule, taught once in e2: never text-format `COPY` on data you didn't write.

**F11. GBIF's country codes don't all have a row in `countries`** (bug: the FK rejects rows at load; Fable missed 1, Astra MF2).
- `occurrences.country_code FK → countries` (T8). 002 §6's file has GBIF's 250 enumerated codes (`XK` included); `data/raw/gbif/snapshot.json` has no `ZZ` (unknown) or `XZ` (international waters), yet records carry `ZZ` (derive drops it: `scripts/derive/countries.ts:27`), may carry `XZ` (S: T7a lists the raw values), or have no code at all.
- **Fix:** the country-key contract (T5): raw code kept, a normalized nullable FK beside it, one unknown member in the star.

**F12. Lab files have no credit path** (breaks "every third-party field records its source"; Fable missed 3, Astra MF4).
- `buildAttribution` (`scripts/build/attribution.ts:24-60`) builds `/v1/attribution.json` from species records' `sources[]` only; T5's "the existing build checks enforce" was wrong for lab files.
- `datasets.csv` held `dataset_key, license` only: CC BY 4.0 records need their dataset credited, and e4 asks "which datasets must I credit?".
- **Fix:** committed dataset metadata (title, publisher, DOI) fetched at ingest, carried into `datasets`, `dim_dataset` and both manifests; lab credits live in `/learn/data/manifest.json`, not `/v1` (T5).

**F13. The runner's rollback hides a lab that doesn't clean up** (breaks the brief's "each lab drops what it creates in the same block"; Fable missed 2, Astra MF5).
- Every block runs inside `BEGIN … ROLLBACK` (`<a2>/run-queries.ts:10, 204`), so a d5 block that forgets `DROP ROLE` passes here and leaks on the learner's install; the leak check after the rollback sees nothing.
- **Fix:** a pairing lint and a leak check inside the block's transaction (T6).

**Already fine (checked today):**
- `critwire_dev` has `postgis` and `postgis_raster` 3.4.2, `ST_HexagonGrid`, `ST_SquareGrid`, `ST_ClusterDBSCAN`, `ST_ClusterKMeans`, `ST_ClusterWithinWin` and `ST_VoronoiPolygons`, and the SRIDs 3577, 6933, 8857, 3857 and 4326.
- `pnpm build` drops only `public.species` (A2 F11), so a `learn_curriculum` schema that refers to nothing in `public` is safe.
- A2's offline Mermaid render works (`<a2>/scripts/erd.ts`: mermaid 12.2.0 in Playwright's Chromium, `--name`).
- The GBIF credentials are `GBIF_USERNAME` and `GBIF_PASSWORD` in `.env` (`scripts/gbif-register.ts:31`).
- The vault's guides exist (T12).

### Target design

#### T1. `plans/004-learn-curriculum.md`, section by section (brief items 1–10)

| § | Content | Evidence |
|---|---|---|
| 0 | Conventions: block headers, engines, statuses, how to re-run (T6) | `<m>/queries.log` |
| 1 | What carries over, and what's dropped (T2) | |
| 2 | The curriculum map (T3) | |
| 3 | Lab environments and setup (T4) | spike venv, loader run |
| 4 | Lab data: datasets, licenses, sizes, homes, ingest (T5) | `out/lab-data/`, `out/etl-postgis/` |
| 5 | Modules: 5.1 Foundations f1–f4 in full; 5.2 Database architecture d1–d6 in full; 5.3–5.7 outlines of G, S, E, P and C | `queries.log`, `out/moran/`, `out/star-export/` |
| 6 | ERDs (T8) | `erd/*.svg`, `*.png` |
| 7 | The site (T9) | |
| 8 | For the owner only: the vault overlap (T12) | |
| 9 | Build missions (T10) | `plans/briefs/critwire-learn-l*.md` |
| 10 | For the owner: choices (T11) | |
| A | The three spikes: inputs, commands, results (T7) | `out/*/summary.md` |
| B | Disagreements with 002 and 003 | |

- **A module written in full has:** the concept; a worked example; lab steps; the real result; an exercise and its answer; how the exercise is checked; and dialect notes, one line each for PostgreSQL, DuckDB and SQL Server.
- **An outline has:** the goal; the data; the key queries or code, as blocks; the expected result.
- Foundations modules open with an "Already know this?" exercise: solving it marks the module done.

#### T2. What carries over (004 §1)

| From | Kept | Dropped or changed |
|---|---|---|
| 002 §1 engine | Whole: DuckDB-WASM 1.33.1-dev65.0, `eh` only, in a worker, self-hosted; the `parquet` extension mirror; the 10 000-row stream cap; Reset and Stop by restart; one engine start per visit; the measurements | — |
| 002 §2 schema v1 | Its 6 tables and the view, byte for byte | Grows by two tables, `datasets` and `occurrences` (T8), added only |
| 002 §3 ERD | Mermaid, `pnpm erd`, the stale check, the drift check, the Schema dialog, the data dictionary | Three diagrams instead of one |
| 002 §4 lessons 1–16 | The SQL of l07, l09, l11, l14 and l15 is re-run inside d1, f3 and d2 | The ages-16 path |
| 002 §5 cookbook, §7 game | — | Dropped, with `/play/` and Name that animal. c12 ("could they meet?") is an idea for the capstone's feed |
| 002 §6 countries file | Whole (L1) | — |
| 002 §8 site | Page design, editor, cards (`-- show: cards`), accessibility, the E2E rules, the playground | New URLs (T9); no cookbook or `/play/` |
| 002 §10 choices | Items 1–4 and 6–9 | 5 is moot; 10 shrinks (desktop practitioners); 11 is replaced by T11 item 3 |
| 003 §1 datasets | Every license quote and size | D3 changes to the download API (T5). D1, D5–D8 and D11–D14 (traits, names, tree) are deferred. D15 comes later. D16 and D17 are never hosted |
| 003 §2 grown schema | `occurrences`, `country_shapes`, `habitat_classes` and `country_habitats` in the lab database | `traits`, `species_names`, `tree_nodes` and `setup-grown` |
| 003 §3–§4 lessons | The PostGIS lessons 5–7, `pg-once` and `pg-session` go into g1 and g7; E1's country-code finding goes into g3 | Lessons 17–23, and the browser spatial lessons (no `spatial` extension) |
| 003 §5 raster | The whole recommendation: v004 summaries plus two clips, and the provenance gate | Clips for Costa Rica and Tasmania |
| 003 §6 IUCN | Every conclusion; the "your own download" lessons become an optional, untested appendix to g3 | — |
| 003 §7–§8 | Items 2–5 and 7–9 | Item 6 is replaced by the download-API sample (T5) |

#### T3. The curriculum map (004 §2)

Tools: **B** browser (DuckDB-WASM), **PG** PostGIS, **Py** Python, **PBI** Power BI Desktop. Module ids are what blocks are named after (`d3-…`). Questions are abridged here; 004 states them in full.

| id | slug | Skill | Question it answers | Tool | h | Prereqs | Depth |
|---|---|---|---|---|---|---|---|
| f1 | select | SELECT, WHERE, ORDER BY, NULL | Which animals have no photo? | B | 1.0 | — | full |
| f2 | aggregate | GROUP BY, HAVING, CASE, COUNT DISTINCT | Records per year and basis of record? | B | 1.5 | f1 | full |
| f3 | join | Inner, left and anti joins; many-to-many; reading an ERD; light spatial in plain SQL (bounding box, 10° bins) | Which animals were recorded in Brazil? Which have no records? | B | 2.0 | f2 | full |
| f4 | window | CTEs, subqueries, window functions | Each species' top dataset and its share | B | 1.5 | f3 | full |
| d1 | keys | Entities; natural and surrogate keys; PK, FK, UNIQUE, CHECK; generated columns | What does a foreign key check, and what doesn't it? | B (+ PG) | 2.0 | f3 | full |
| d2 | normalize | 1NF–3NF from nested JSON; functional dependencies; denormalizing | Is a license a fact about a record or a dataset? | B | 2.0 | d1 | full |
| d3 | indexes | B-tree, GiST and BRIN; `EXPLAIN (ANALYZE, BUFFERS)`; statistics | Why is this a sequential scan? | PG | 2.0 | d1 | full |
| d4 | transactions | ACID, MVCC, isolation, locks, savepoints, `ON CONFLICT` | How do I re-run a failed load safely? | PG | 2.0 | d3 | full |
| d5 | roles | Schemas, roles, GRANT and REVOKE, default privileges, least privilege, a taste of RLS | A read-only reporting role | PG | 1.5 | d4 | full |
| d6 | star | Grain, facts, dimensions, conformed dimensions, unknown members, SCD 1/2; star schema vs snowflake; export | What's a record fact's grain? | PG (+ DuckDB) | 2.5 | d2, d4 | full |
| g1 | crs | SRIDs, `ST_Transform`, geometry vs geography, Mercator's area error | How big is Tasmania in 3857, 3577 and geography? | PG | 1.5 | f3 | outline |
| g2 | load-validate | The loader, WKT/WKB, `ST_IsValid`, `ST_MakeValid` | Which shapes are invalid, and why? | PG | 1.5 | g1 | outline |
| g3 | spatial-join | Contains, Covers, Intersects; point in polygon; boundaries | Do GBIF's country codes agree with the outlines? | PG | 2.0 | g2 | outline |
| g4 | measure-overlay | Geography distances, `ST_DWithin`, buffers, `ST_Intersection` | Ecoregion area per country | PG | 2.0 | g3 | outline |
| g5 | spatial-index | GiST, `&&`, KNN `<->`, plans | The nearest record, fast | PG | 1.5 | g3, d3 | outline |
| g6 | grids | `ST_HexagonGrid` in an equal-area SRID; MAUP | Devil records per 5 km vs 10 km hexagon | PG | 1.5 | g4 | outline |
| g7 | raster | Value at a point; `ST_Clip`, `ST_ValueCount`; estimated areas | Which habitat classes hold Costa Rica's records? | PG | 2.5 | g6 | outline |
| s1 | bias | Datasets, basis, telemetry, effort; honest framing | How much of the jaguar sample is GPS collars? | PG + B | 1.5 | g3 | outline |
| s2 | point-patterns | Quadrats, nearest-neighbour index, kernel density, DBSCAN | Are devil records more clustered than chance? | PG + Py | 2.5 | s1, g6 | outline |
| s3 | weights | Distance band, KNN, contiguity; row standardization; islands; ties | Who are a cell's neighbours? | PG + Py | 2.0 | s2 | outline |
| s4 | moran | Global Moran's I, E[I], Var, z in SQL = PySAL; permutations | Does record density cluster? | PG + Py | 2.0 | s3 | outline |
| s5 | local | LISA and Getis-Ord Gi*; FDR | Where are the hot spots of effort? | PG + Py | 2.5 | s4 | outline |
| s6 | zonal | Zonal statistics on polygons and rasters; ratios normalized for effort | Do records over-represent some habitats? | PG + Py | 2.0 | s5, g7 | outline |
| e1 | extract | Search vs download API (asynchronous, DOI); paging, rate limits, retries; files with checksums | Every open devil record, with a DOI | Py | 2.0 | f2 | outline |
| e2 | transform-load | Staging, types, `COPY`, upsert, geometry; GeoPandas to and from PostGIS | Load the download in one transaction | Py + PG | 2.5 | e1, d4 | outline |
| e3 | idempotent | Run ids, deterministic outputs, checksums; critwire's ingest → derive → build as the case study | Can I re-run it without doubling rows? | Py + PG | 2.0 | e2 | outline |
| e4 | quality-provenance | Checks written as SQL, license filters, provenance tables, citations, derived datasets | Which datasets must I credit? | Py + PG | 2.0 | e3 | outline |
| e5 | schedule | cron, systemd timers, Windows Task Scheduler; logs, alerts, incremental loads | Refresh weekly and know when it broke | Py | 1.5 | e4 | outline |
| p1 | power-query | `Web.Contents` on critwire's CSVs; types with an explicit culture; refresh | Load the star from critwire.com | PBI | 1.5 | d6 | outline |
| p2 | model | Relationships, cardinality, filter direction, conformed dimensions, factless facts | Filter records and habitat areas by country | PBI | 2.0 | p1 | outline |
| p3 | dax | Measures: COUNTROWS, DISTINCTCOUNT, CALCULATE, ratios | Records per 1,000 km² of forest | PBI | 2.0 | p2 | outline |
| p4 | maps-report | Map visuals, honest labels, publishing and refresh | A report that never calls records a range | PBI | 1.5 | p3 | outline |
| c1 | game-feed | ETL into PostGIS → Gi* on hexagons → a Power BI report → static JSON a game reads (per-hexagon encounter weights, labelled as records) | What could a player meet here, honestly? | all | 8.0 | s5, e4, p4 | outline |

- **Hours per track:** Foundations 6, Database architecture 12, GIS in SQL 12.5, Spatial statistics 12.5, ETL 10, Power BI 7, Capstone 8: **68 h** across 33 modules.
- **In full:** f1–f4 and d1–d6, ten modules. If the Steps exceed 30, the planner demotes d6, then d5, then d4 to outlines; the spikes stay.

#### T4. Lab environments (004 §3)

**Browser.** 002 §1 unchanged. The setup reads `/v1/species.parquet`, `/v1/countries.parquet`, `/learn/data/datasets.csv` and `/learn/data/occurrences.parquet`. "Light spatial" is plain SQL (bounding boxes, `floor(lon / 10)` bins, a haversine formula); there is no `spatial` extension (T11 item 3).

**PostGIS, the learner's own install (Windows).**
- **Recommended: Docker Desktop (WSL 2).** `docker run -d --name learn-pg -e POSTGRES_PASSWORD=… -p 5432:5432 -v learn-pg:/var/lib/postgresql/data postgis/postgis:16-3.4`: PostgreSQL 16 and PostGIS 3.4, the versions the labs are tested on.
  - Then `CREATE DATABASE learn`, `CREATE EXTENSION postgis`, and `postgis_raster` for g7.
  - Load with `docker cp learn_curriculum.sql learn-pg:/tmp/` and `docker exec learn-pg psql -U postgres -d learn -v ON_ERROR_STOP=1 -f /tmp/learn_curriculum.sql`. PowerShell has no `<` redirection.
- **Native:** the EDB PostgreSQL 16 installer plus Stack Builder's PostGIS bundle (3.4 or 3.5; the labs avoid 3.5-only functions). Use port 5433 if 5432 is taken.
- **Privileges:** the `postgres` user is a superuser, so it has CREATEROLE. d5's page says a non-superuser needs CREATEROLE and ownership of `learn_curriculum`. g7's raster settings need a superuser session or 003's `GRANT SET ON PARAMETER` (`pg-once`).
- **Tested here:** the loader and every PostGIS block, in `critwire_dev` as `critter-ai` over the socket, in schema `learn_curriculum`. Never `learn_spatial`, never `public`.
- **Not tested:** the Docker and EDB commands (`powershell` fences, marked Windows-only).
- **Conventions:** labs name only `learn_curriculum` (no database name), and read connections from libpq's `PG*` environment variables, so the same files run in both places.
  - Every PostGIS download starts with 004's `pg-session` block (003's pattern): `SET search_path = learn_curriculum, public;`, plus 003's raster `SET`s on g7 and s6. The runner runs the same text (one constant, T6), so a download never depends on a setting only the runner made.
  - Python labs connect through one helper in their first cell: `psycopg.connect(options="-c search_path=learn_curriculum,public")`.

**Python: `uv`, not venv plus get-pip.**
- One tool with the same commands on Windows and the VPS: `uv python install 3.12`, `uv venv`, `uv pip sync`. It resolves fast, its cross-platform lock is exact, and `--no-build` fails loudly instead of compiling a missing wheel. get-pip is a workaround for this VPS only.
- **On the VPS:** the `uv` release tarball for aarch64, sha256-checked against its release `.sha256`, unpacked into `<spike>/bin/`. Not `~/.local/bin`, which ops owns.
- **`requirements.in`:** `numpy pandas pyarrow scipy shapely pyproj pyogrio geopandas libpysal esda pointpats mapclassify matplotlib psycopg[binary] SQLAlchemy GeoAlchemy2 requests`, with lower bounds geopandas ≥ 1.0, shapely ≥ 2.0, libpysal ≥ 4.10, esda ≥ 2.6.
- **`requirements.txt`:** compiled by `uv pip compile --universal --python-version 3.12`, exact pins, recorded in 004 §3; installed with `uv pip sync --no-build`.
- **Lab scripts:** `.py` with `# %%` cells, the tested source. The build writes a matching `.ipynb` (for VS Code, Jupyter and Pro Notebooks); E2E checks that its cells equal the `.py`.

**arcpy notes** (004 §3; every block `untested: ArcGIS Pro (Windows, licensed)`).
- arcpy stays in Pro's own `arcgispro-py3` environment: never pip-install into it; clone it if a package is needed.
- Exchange data with the `uv` environment through GeoPackage.
- Pro Basic's Spatial Statistics toolbox maps to s4 and s5 (`SpatialAutocorrelation`, `HotSpots`). Its Moran z-score uses the variance under randomization, so compare it with esda's `z_rand`, not `z_norm`.

**Power BI Desktop.**
- `Web.Contents("https://critwire.com", [RelativePath = "learn/data/star/<file>.csv"])`: a static base URL, so it refreshes in the Power BI Service too, with anonymous auth.
- `Csv.Document(…, [Delimiter = ",", Encoding = 65001, QuoteStyle = QuoteStyle.Csv])`, then `Table.PromoteHeaders`, then `Table.TransformColumnTypes(…, "en-US")`. The culture is explicit so comma-decimal locales don't misread `12.5`.
- **Tested here:** the input files, checked against the star manifest (shape, keys, row counts; T6).
- **Not tested:** M evaluation, DAX results, visuals, refresh. T11 item 8 asks the owner for one check.

#### T5. Lab data (004 §4)

**Home: `/learn/data/`, not `/v1`.** Lab files are re-drawn and resized as the course changes, and `/v1` promises "only additions". Every lab reader is same-origin or not a browser (F7). The one `/v1` addition is 002's `countries`.

| Dataset | License (quote reused from) | Files under `/learn/data/` | Size (S) | Modules | Built by |
|---|---|---|---|---|---|
| GBIF open-records sample | per record CC0 1.0 or CC BY 4.0 (003 D3); its own derived-dataset DOI; each dataset credited in `datasets.csv` | `occurrences.{parquet,csv}`, `datasets.csv` | ≈ 1.5 + 5 MB, + ≈ 80 KB | f2–f4, d2–d6, g3–g6, s*, e*, p*, c1 | L1 |
| Natural Earth admin-0, 1:50m, v5.1.2 | public domain (002 §6) | `country_shapes.parquet` (GeoParquet, WKB) | 1.21 MB | g*, s1, s6 | L1 |
| Natural Earth admin-1, 1:50m | public domain (003 D10) | `admin1_shapes.parquet` | ≈ 1.5 MB | g4, g6, s2–s5 | L1 |
| RESOLVE Ecoregions 2017, simplified | CC BY 4.0 (003 D9) | `ecoregions.parquet`, `biomes.csv` | ≤ 8 MB, else lab regions only | g4, s6 | L1 |
| Countries (Natural Earth attributes) | public domain | `/v1/countries.*` (002 §6) | KB | all | L1 |
| Jung v004 classes, country summaries, class at each sample point | CC BY 4.0 (003 D4, §5) | `habitat_classes.csv`, `country_habitats.{parquet,csv}`, `occurrence_habitats.parquet` | ≤ 200 KB | g7, s6, p2–p3 | L3 |
| Jung v004 clips, Costa Rica and Tasmania | CC BY 4.0 | `clips/{cr,tas}.tif` (COG) | ≈ 3 MB | g7, s6 | L3 |
| PostGIS loader | inherits the above | `postgis/learn_curriculum.sql` | ≈ 18 MB | every PG module | build (L1, grown in L3) |
| Star export | inherits; credits in `manifest.json` | `star/*.csv`, `star/manifest.json` | ≈ 5 MB | d6, p1–p4 | build (L2: one fact; L5: habitat fact) |

**The GBIF sample (a change from 003 D3, recorded in 004 §4 and §B).**
- 003 drew a capped sample inside `ingest gbif` through `occurrence/search`: pages of 300, no DOI of its own, a subset of what `10.15468/dd.ky9cyt` counts.
- Now it comes from **the occurrence download API**: an asynchronous job with its own download DOI and no paging cap, archived by GBIF, and refreshed apart from the countries pipeline. `ingest gbif`, `contributions.json` and `10.15468/dd.ky9cyt` stay untouched.
- **The predicate** is the countries rule, so the honest-data story stays consistent: `TAXON_KEY in` the 73 keys, `LICENSE in [CC0_1_0, CC_BY_4_0]`, `HAS_COORDINATE`, `HAS_GEOSPATIAL_ISSUE = false`, `OCCURRENCE_STATUS = PRESENT`, and `BASIS_OF_RECORD in` the 7 allowed values. Format `SIMPLE_CSV`.
  - `checklistKey` = the legacy backbone, top level and on `TAXON_KEY` (F3). 004 §4 and e1 say why: GBIF's documented download default *is* that backbone, but it calls it obsolete and search's default already moved, so a pipeline pins its taxonomy rather than trusting a default.
- **Published subset:** at most 2,000 records per species, chosen by ascending `md5(gbifID)` (engine-neutral, deterministic): about 46k rows.
  - Columns: `id` (gbifID), `species_id`, `dataset_key`, `license`, `basis_of_record`, `longitude`, `latitude`, `coordinate_uncertainty_m`, `country_code_gbif`, `country_code`, `year`, `month`.
  - Records map to species by `speciesKey` (S).
- **Country-key contract** (F11), one rule applied once, where the published files are written (spike: T7a `sample`; L1: `writeLearn`); no engine re-derives it:
  - `country_code_gbif`: GBIF's `countryCode` as delivered, NULL when empty. Kept for g3 (GBIF's code vs the outlines).
  - `country_code`: `country_code_gbif` when it is a `countries.code`, else NULL. Nullable FK → `countries`, the same in the browser schema and the PostGIS lab.
  - Known non-country values: `ZZ` (unknown) and `XZ` (international waters), a named constant with GBIF's meaning. Any other code with no `countries` row fails the run and names the code (fail fast; a real code is a countries-file gap, fixed by 002 §6's narrowest-rule clause).
  - The star maps NULL to its one unknown member, `dim_country` `ZZ` "Unknown or outside any country", in `star.sql` only (T7c), so its FK is never NULL. d6 teaches the step from nullable FK to unknown member.
- **Dataset metadata** (F12): for each dataset in the sample, `GET /v1/dataset/<key>` (`title`, `doi`, `license`, `publishingOrganizationKey`) and, once per publisher, `GET /v1/organization/<key>` (`title`). About 450 + 150 reads, ≈ 5 min at ≤ 2 req/s. L1 uses `scripts/http.ts` `getJson` (paced, retried; a 404 fails the ingest); the spike's Python mirrors its pacing and retries. A deleted dataset keeps its title and records GBIF's `deleted` date. (Checked: `GET /v1/dataset/0645ccdb…` returns `title` "NSW BioNet Atlas", `doi` `10.15468/14jd9g`, `license` as a legalcode URL, `publishingOrganizationKey`.)
  - License URLs map to short names through `scripts/derive/gbif.ts`'s `LICENSES` (gains CC0 1.0's URL); records' enum values go through `raw.ts`'s `OPEN_GBIF_LICENSES`. An unknown value fails.
  - `datasets` (browser, lab) and `datasets.csv`: `dataset_key` PK, `title`, `publisher`, `doi` (nullable), `license`. Record counts stay a query (d2's point).
- **Registration:** a reduced subset, so L1 registers it as its own GBIF derived dataset. The body is its per-dataset counts, with `originalDownloadDOI` set to the download's DOI (S: field name), and the deposit tag is `gbif-learn-<hex12>`.
  - `pnpm gbif:register` gains a target (`--target learn-sample`); the countries target and its `gbif-dd-*` tags are unchanged.
  - A plain build refuses a missing or stale sample DOI, as it does for the countries DOI.
- **What's committed** (both reviews' SHOULD-CONSIDER, adopted): `data/raw/gbif-sample/` with `download.json` (key, DOI, request, `totalRecords`, zip sha256, every dataset's count in the full download), `datasets.json` (the metadata above, keys sorted, one `retrieved`) and `sample.csv` (the capped rows, sorted by `id`, ≈ 5 MB). The cap is applied by the ingest, so `data/` is the snapshot and derive needs no zip. The full projection and the ~30 MB zip are never committed; GBIF archives the download under its DOI, which is the reproducibility path. T7a still measures the projection's size, for 004 §4 only.

**The loader** (written by the build; nothing new in git). **One transaction** (Astra MF3), so a failed load leaves the previous lab schema as it was:
- `\set ON_ERROR_STOP on`, then `BEGIN;`. Without `ON_ERROR_STOP` (a learner's own command) PostgreSQL still turns the final `COMMIT` of a failed transaction into a rollback, so the reload stays atomic either way.
- `DROP SCHEMA IF EXISTS learn_curriculum CASCADE; CREATE SCHEMA learn_curriculum; SET LOCAL search_path = learn_curriculum, public;`.
- Then the DDL (the T8 lab ERD), and each table's `COPY … FROM stdin (FORMAT csv)` (F10). Geometry arrives as `\x`-hex WKB in a `bytea` column, which DuckDB writes without `spatial`; the post-load step runs `ST_GeomFromWKB(…, 4326)`.
- Then keys, GiST indexes and `ANALYZE` (allowed in a transaction block).
- Then validation, a `DO` block that raises on failure: each table's row count equals the build's (written into the loader), every geometry's SRID is 4326, and the foreign keys hold (they're constraints). Shapes may be invalid on purpose (g2), so validity isn't checked.
- `COMMIT;`. It references no table in `public` (only PostGIS's functions). Re-running it resets the lab schema, and the page warns about that.

**Cap.**
- The build refuses when committed lab data (`data/raw/gbif-sample/` plus the other lab snapshots) or `dist/learn/data/` exceeds 50 MB. If it's tight, the priority order is: loader, Parquet, CSV, then the GeoParquet shapes.
- Engine assets (`parquet`: 3.22 MB) are counted separately: 002 §10 item 3.

**Credit** (F12; Astra MF4). `/v1/attribution.json` stays species-only, plus 002 §6's Natural Earth entry. Lab credits are `writeLearn`'s:
- `/learn/data/manifest.json`, per file: columns, rows, bytes, sha256 and `sources[]` (`name`, `license`, `licenseUrl` from `scripts/build/sources.ts` `licenseUrl()`, `citation`, `doi?`, `url`). The sample's sources are GBIF's download citation (its DOI) and its derived-dataset DOI, plus `"datasets": "datasets.csv"` for the per-dataset credits.
- One `credits(file)` function feeds this manifest and `star/manifest.json` (T7c); `dim_dataset` carries `datasets`' columns.
- The build refuses: a lab file with no `sources`; a license missing from `LICENSE_URLS`; a CC BY source with no citation; a sample dataset with no title or publisher.
- The `/learn/data/` index page renders the files, their sources and the dataset table (title, publisher, DOI link, license, records in the sample). Each row keeps its `license` and `dataset_key`.

#### T6. Testing harness (004 §0)

**Copy, don't import, A2's spike** (with a sha256 provenance list): `run-queries.ts`, `scripts/{browser,build-site,env,erd,erd-model,paths,pg,pg-engine,plan-queries,registry,runner-client,serve}.ts` and `src/{engine,sql,format,cards,assets,runner-page}.ts` with `runner.html`. Its pins stay (duckdb-wasm 1.33.1-dev65.0, node-api 1.5.6-r.2, playwright 1.58.2, esbuild 0.28.2, mermaid 12.2.0, postgres 3.4.9); `geotiff` only if g7's browser read stays. Changes:
- **DuckDB boot:** `LOAD parquet` only. Then `src/setup.sql`, which must equal 004's `setup` block, which must start with 002's `setup` byte for byte and add `datasets` and `occurrences`. The registered files gain `/learn/data/datasets.csv` and `/learn/data/occurrences.parquet`.
- **`pg.ts`, changed in the copy** (Fable MF2, Astra MF1; each change gets its PG test):
  - `SCHEMA = "learn_curriculum"`; `SEARCH_PATH = "learn_curriculum, public"`, set at connect from the same constant as the `pg-session` block's text (T4), and asserted by PG7. `star.sql` and every unqualified lab statement rely on it.
  - `connect()` creates no schema: no `CREATE SCHEMA learn_spatial`; the loader creates `learn_curriculum` in its transaction.
  - `capabilityCheck` (superuser, raster library, the two `SET`s, read-back) runs only when the run holds a `-- needs: raster` block. A run holding a `CREATE ROLE` block checks `rolcreaterole OR rolsuper` first and names the missing privilege.
  - PG9 narrowed: the refusal patterns live in one module, `scripts/privilege.ts`, which both PG9 and `plan-queries` use and which PG9 skips. Any other code line that alters a role, the database or the system, or grants or revokes, still fails: the runner itself never changes privileges; lab SQL lives in 004 and is checked by the allowance below.
  - `parseSpikeUrl` unchanged (`critwire_dev` over the socket; refuses `critwire`).
- **PostGIS connect:**
  1. `SPIKE_PG_URL=postgresql:///critwire_dev`.
  2. Canary, before and after the run: per table of `learn_spatial`, `count(*)` and `md5(string_agg(t::text, '' ORDER BY t::text))`, plus its table list from `pg_class`. Any difference fails the run (a row count alone misses updates).
  3. `psql -X -v ON_ERROR_STOP=1 -d critwire_dev -f <spike>/site/learn/data/postgis/learn_curriculum.sql`.
  4. The `-- boot` blocks, in order.
  - A2's `pg-setup` and `runPgSetup` are deleted.
- **Block headers (SQL):**
  - `-- q:` and `-- status: ran | untested: <reason>`, plus `-- engine: duckdb | postgis` and `-- after:`.
  - New: `-- boot` (run once at connect, results kept for the run: fixtures such as `s4-cells`) and `-- tx: own` (PostGIS only: the runner doesn't wrap the block, which must end clean; d4).
- **Allowed in PostGIS blocks only:**
  - `CREATE`/`ALTER`/`DROP ROLE`, `GRANT`/`REVOKE`, `ALTER DEFAULT PRIVILEGES`, `DROP OWNED BY`, `SET ROLE` and `CREATE`/`DROP SCHEMA`, when every role and schema they name starts with `learn_` (`PUBLIC` allowed as grantee on `learn_` objects).
  - `SET` and `SET LOCAL`, which PostgreSQL rolls back.
  - `random()` after `setseed()`.
  - Still refused: `ALTER SYSTEM`, `ALTER DATABASE`, any role or schema not named `learn_…`, `GRANT SET ON PARAMETER`, and any mention of `learn_spatial` (all engines).
- **Standalone cleanup** (F13; Fable missed 2, Astra MF5), so each block cleans up as a learner runs it, not because the runner rolls back:
  - **Pairing lint:** every `CREATE ROLE learn_x` or `CREATE SCHEMA learn_x` in a block has a later `DROP ROLE learn_x` or `DROP SCHEMA learn_x` in the same block (`-- tx: own` blocks included); a role that was granted anything also needs `DROP OWNED BY learn_x` before its drop; a `SET ROLE` needs a later `RESET ROLE`.
  - **In-transaction leak check:** after a block's last statement and before the runner's `ROLLBACK`, `pg_roles` and `pg_namespace` hold no `learn_%` name except `learn_spatial` and `learn_curriculum`. The same query runs after every block (and after a `-- tx: own` block's own `COMMIT`). PostgreSQL refuses `DROP ROLE` while privileges remain, so a missing `DROP OWNED` fails the block.
- **Python:** ```` ```python ```` blocks with `# q:`, `# status:`, `# after:` (earlier blocks' code prepended in the same process) and `# timeout:` (default 60 s).
  - Each runs as `<spike>/.venv/bin/python -I <tmp>/block.py` from an empty temporary directory, with `PGHOST=/var/run/postgresql`, `PGDATABASE=critwire_dev` and `LEARN_BASE=http://127.0.0.1:3102`.
  - And `PGOPTIONS='-c search_path=pg_catalog'`: the lab's connect helper (T4) overrides it, so a block that bypasses the helper fails on its first table name instead of reading `public` (checked with `psql`: the conninfo `options` wins over `PGOPTIONS`; without it, `species` is not found).
  - Its stdout is compared with the ```` ```text ```` block after it and logged as `-- result: <id> · python · sha256 <12>`.
  - Output must be deterministic: explicit formatting and no DataFrame repr, seeds for anything random, no clock.
- **Power BI:** ```` ```m ```` and ```` ```dax ```` blocks with `// q:`, `// status: untested: Power BI is Windows-only` and `// input: star/<file>.csv, …`.
  - The runner checks each input against `out/star-export/manifest.json`: the file exists; its header equals the manifest's columns; primary keys are unique and non-null; every foreign key is found in its dimension; the row count and sha256 match.
  - It logs `-- input: <id> · <file> rows=<n> sha256=<12> keys=ok`.
- **Not counted:** `sh` and `powershell` fences (listed in 004 §0).
- **The log header** records the engine versions and the sha256 of every lab data file, so "ran" says exactly which data it ran on. A2's `spike-table` label and its registry are dropped (KISS: the brief has `ran | untested` only).
- **ERDs:** `--erd plans/004-learn-erd.mmd` uses A2's drift check against the DuckDB catalog, plus the rule that 002's entities and lines are unchanged. `--lab-erd` uses the same `DbMeta` read from `information_schema` and `pg_constraint` on `learn_curriculum`. `--star-erd` checks against `manifest.json`.
- **Verification re-runs everything** with `<spike>/verify.sh`:
  1. Refuse if ports 3100–3102 are in use.
  2. `build-site`.
  3. `run-queries --check` with the three ERD flags.
  4. `etl/run.sh verify` (reloads from the saved zip, with no network).
  5. `moran/run.sh`, then `star-export/run.sh`.
  6. Render the three ERDs.
  7. The canary and the leak check.
  - Then, in the worktree: `pnpm typecheck`, `pnpm test`, and the `dist` hash comparison.

#### T7. The three spikes (004 §A; each writes `out/<name>/summary.md` with its commands)

**a. ETL into PostGIS (`out/etl-postgis/`).** `<spike>/etl/gbif_download.py`, run in the spike venv: stdlib `urllib` and `psycopg`. Credentials are read from the worktree's `.env` and never printed.
1. **`request`:** writes `request.json` with the predicate from T5 and `checklistKey` set at the top level and on `TAXON_KEY`, then `POST /v1/occurrence/download/request`. It saves the key and the `occurrence/search` count at submit time (396,629 today).
2. **`wait`:** checks the status at most once a minute and can be resumed across sessions. `KILLED` or `FAILED` → resubmit once.
3. **`fetch`:** the zip goes to `downloads/gbif-<key>/`, with its sha256 and size; the DOI and `totalRecords` go in `download.json`. `GET /v1/occurrence/download/<key>` must echo both `checklistKey`s (F3).
4. **`load`, in one transaction:**
   - `COPY learn_curriculum.gbif_staging FROM STDIN (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '', HEADER true)` (F10), streamed from the zip with psycopg's `cursor.copy`, every column `text`. e2's key query is this statement.
   - insert the typed rows into `occurrences_all`;
   - checks: rows = `totalRecords` (a stray newline in a field fails here, loudly); licenses ⊆ the two allowed; every `speciesKey` maps to one critwire species; coordinates in range; basis ∈ the 7 values; `PRESENT`; counts per taxon close to the search counts; one license per dataset (this decides whether `license` lives in `datasets`);
   - and every non-null `countryCode` ∈ `countries.code` ∪ {`ZZ`, `XZ`} (F11), with the rows per non-country value recorded.
5. **`datasets`:** the metadata reads from T5 for every dataset in the sample → `datasets.json`; every dataset has a title and a publisher, and its license agrees with its records'.
6. **`sample`:** the cap from T5 and the country-key contract → `<spike>/data/learn/{occurrences.parquet, occurrences.csv, datasets.csv}`, plus `sample-contributions.json` (the registration body, never posted).
7. **`verify`:** `load` run twice gives the same row counts and the same `md5(string_agg(… ORDER BY id))`; the outputs' sha256 match `summary.md`.
- **Records:** download latency, size, load times, rows at each stage with rejects by reason, the raw country values, and the projected full-download Parquet size (for 004 §4; never committed, T5).

**b. Global Moran's I, SQL = PySAL (`out/moran/`).**
- **Units:** equal-area hexagons over Tasmania's main island, for the Tasmanian devil (id 48), from the published sample.
  - Why: it's one compact island, so the cells are contiguous with no islands, and EPSG:3577 is a real equal-area projection. The data are atlas and roadkill heavy, which is the honest lesson that clustering here measures effort.
  - Points can't be the units: they have no meaningful attribute and have duplicate coordinates (F8).
- **`s4-cells` (a boot block):**
  - The largest part of `ST_Dump(ST_Transform(admin1 'Tasmania', 3577))`.
  - `ST_HexagonGrid(5000, …)` cells that `ST_Intersects` it.
  - `n` = sample records of species 48 within the cell (`ST_Contains`; points left in no cell are reported).
  - `y = ln(1 + n)`; `id`; `cx`, `cy` = the centroid as `float8`.
- **Weights:** binary distance band, threshold 10,000 m, with `a.id <> b.id` and `ST_DWithin(ST_Point(a.cx, a.cy, 3577), ST_Point(b.cx, b.cy, 3577), 10000)`.
  - Neighbouring centroids are √3 · 5 km ≈ 8,660 m apart and the next class 15,000 m, so the threshold sits in a 1,340 m gap. (Checked in `critwire_dev`: a 100 km `ST_HexagonGrid(5000)` patch in 3577 gives the classes 8,660.25, 15,000.00 and 17,320.51 m.)
  - Asserted, before any weight is built: the two smallest centroid distance classes are 8,660.25 and 15,000.00 m (to 0.01 m: Fable SC5, adopted); no duplicate centroids; every cell has ≥ 1 neighbour; no pair within 1 m of the threshold.
- **SQL, plain** (`s4-moran-sql`), row-standardized `w_ij = 1/k_i`, `z_i = y_i − ȳ`:
  - `I = (n / S0) · Σ w_ij z_i z_j / Σ z_i²`; `E[I] = −1/(n−1)`;
  - `S0 = Σ w_ij`; `S1 = ½ Σ (w_ij + w_ji)²`; `S2 = Σ_i (Σ_j w_ij + Σ_j w_ji)²`;
  - `Var_norm = (n² S1 − n S2 + 3 S0²) / ((n−1)(n+1) S0²) − E[I]²`; `z = (I − E[I]) / √Var_norm`.
  - These are esda's `__moments` exactly.
- **PySAL** (`s4-moran-pysal`):
  - read `id, y, cx, cy` with psycopg, ordered by `id`;
  - `DistanceBand(np.column_stack([cx, cy]), threshold=10000, binary=True, ids=id)`; assert `w.islands == []`;
  - `esda.Moran(y, w, transformation="r", permutations=0)`; print `n`, `I`, `EI`, `VI_norm`, `z_norm`.
- **Compare** (`compare.py`): `|Δ| ≤ 5e-7` and identical 6-decimal strings for `I`, `E[I]`, `Var_norm` and `z`. Both engines' neighbour sets are compared pair by pair first, so a mismatch names its cause. Full precision is kept in `compare.json`.
- **Also recorded, not compared:** the 10 km edge (MAUP), and esda's `z_rand` (for the arcpy note).
- Gi* and LISA are L4's, unless the session has room.

**c. A star export Power BI reads (`out/star-export/`).**
- **`star.sql`:** standard SQL, no schema names (it relies on `search_path`), so the same file runs in PostGIS (d6's lab) and in DuckDB (L2's `writeStar`).
  - `dim_species`: the taxonomy flattened (a star, not a snowflake).
  - `dim_country`: every `countries` row plus the unknown member `ZZ` "Unknown or outside any country"; `fact_*.country_code = coalesce(o.country_code, 'ZZ')`, the one place NULL becomes the unknown member (T5's contract).
  - `dim_dataset` (`dataset_key`, `title`, `publisher`, `doi`, `license`): the credits travel with the star.
  - `dim_year`: plus `-1` for unknown.
  - `fact_records`: grain = one sample record.
  - `fact_species_country`: factless; critwire's countries rule.
  - With A2's habitat stand-ins loaded: `dim_habitat_class` and `fact_country_habitat` (grain = country × class, `est_area_km2`).
- **Export, one canonical** (both reviews' SHOULD-CONSIDER, adopted): DuckDB's `COPY … (HEADER)` over the Parquet inputs is the published star (it is what `writeStar` writes); its bytes are what the manifest hashes and Power BI reads.
  - PostGIS (d6's lab) runs the same `star.sql` and `\copy (SELECT … ORDER BY <pk>) TO … CSV HEADER`. It is a semantic cross-check: rows parsed, keys equal, text equal, numbers equal within 1e-9 relative. Byte differences (`1.0` vs `1`) are recorded, not failures.
- **`manifest.json`:** per file: columns and types, primary key, foreign keys, rows, bytes, sha256, and `sources[]` from the shared `credits(file)` (T5).
- **Checks:** keys unique; foreign keys covered (unknown members included); UTF-8; `NA` (Namibia) stays text when read by DuckDB `read_csv(all_varchar)` and by Python's `csv`.

#### T8. ERDs (004 §6; Mermaid under `plans/`, rendered by the copied `erd.ts --name` to `<spike>/erd/{schema,lab,star}.{svg,png}`)

- **`plans/004-learn-erd.mmd`, the first schema v2 (browser):**
  - `%% extends: 002-learn-erd.mmd`; 002's six tables unchanged.
  - New: `datasets (dataset_key PK, title, publisher, doi nullable, license)`.
  - New: `occurrences (id BIGINT PK, species_id FK, dataset_key FK, country_code_gbif nullable, country_code FK nullable, longitude, latitude, coordinate_uncertainty_m, year, month, basis_of_record CHECK)`: T5's country-key contract.
  - If T7a finds a dataset with two licenses, `license` stays on `occurrences` and d2 teaches why.
- **`plans/004-lab-erd.mmd`, the lab database (PostGIS `learn_curriculum`):**
  - The same keyed tables as v2, in PostgreSQL types; `occurrences.geom geometry(Point, 4326)` is a generated column (`ST_SetSRID(ST_MakePoint(…))`) and is GiST-indexed.
  - `country_shapes (country_code PK/FK, geom MultiPolygon)`.
  - `admin1_shapes (adm1_code PK, country_code FK, name, geom)`.
  - `biomes (biome_id PK, name)` → `ecoregions (eco_id PK, biome_id FK, name, realm, geom)`.
  - `habitat_classes` (self-FK) → `country_habitats`, `occurrence_habitats`, `habitat_clips (raster)` (L3).
  - Lab-made tables (`devil_hex`, the ETL staging tables) are listed beside the diagram, not in it.
- **`plans/004-star-erd.mmd`, the Power BI star:** T7c's facts and dimensions.
  - Lines run from dimensions to facts: `||--o{` with unknown members (`dim_country` `ZZ`, `dim_year` `-1`), so every foreign key is non-null.
  - The factless fact and the second fact share `dim_country` (conformed).

#### T9. The site (004 §7; reuses 002 §8)

| URL | Page |
|---|---|
| `/learn/` | The curriculum map: tracks, modules, tool badges, hours, prerequisites, done ticks; unbuilt modules listed but unlinked ("in preparation") |
| `/learn/<track>/` | Track index (`foundations`, `database-architecture`, `gis-in-sql`, `spatial-statistics`, `etl`, `power-bi`, `capstone`) |
| `/learn/<track>/<module>/` | Module page. **B:** 002's editors, Run, cards, Check and Schema dialog. **PG/Py/PBI:** code, the recorded result, a download link, a lab-schema button |
| `/learn/setup/` | T4, every environment |
| `/learn/schema/`, `/learn/schema/lab/`, `/learn/schema/star/` | ERDs and data dictionaries (002 §3) |
| `/learn/playground/` | 002's playground |
| `/learn/labs/<id>.{sql,py,ipynb}`, `/learn/labs/requirements.txt` | Downloadable lab files |
| `/learn/data/` | Index (licenses, credits, DOIs), the files, `manifest.json`, `postgis/`, `star/` |
| `/learn/assets/` | Engine, extension mirror, hashed app (002) |

- **Progress:** `localStorage["critwire.learn.done.v1"]` = `{ "<module id>": "<YYYY-MM-DD>" }`, set by a "Mark done" button or by passing an "Already know this?" check. The map shows ticks, and "Clear progress" is on `/learn/`. Nothing else is stored, so editor text isn't kept (002).
- **Build (`writeLearn`, 002 §8, generalized):**
  - Sources: `site/learn/curriculum.json` (tracks; modules with `id`, `slug`, `title`, `tool`, `hours`, `prereqs`, `state: built | planned`), module fragments, and `site/learn/labs/` (sources, recorded outputs, `checked.json`).
  - It refuses: unknown or cyclic prerequisites; a stale ERD SVG; a lab whose freshness key differs from `checked.json` ("run pnpm learn:check"); a cap breach; a lab file with no credits (T5); any missing file.
  - **`checked.json` freshness** (Astra SC1, adopted): per lab, the sha256 of its source, the data manifest, the loader, the checker's own source files and `requirements.txt`, all computable offline, so the build compares them. PostgreSQL, PostGIS, Python and package versions are recorded beside them and shown on the lab page, not compared (the build may run on a machine with other versions; `deploy` must not depend on the checker's).
- **`pnpm learn:check` (dev only, never in `build` or `deploy`; a repo port of T6's PostGIS and Python engines):**
  - It runs the loader and every lab block, plus the Python labs in `.venv-learn`, on the connection libpq's `PG*` variables (or `LEARN_PG_URL`) name, never `DATABASE_URL` (its role `critwire` can't create roles). On the VPS that is `critwire_dev` as `critter-ai` over the socket; on the owner's WSL, his own PostGIS (Fable SC3, adopted: `AGENTS.md`'s two machines).
  - It refuses database `critwire` twice: by name before connecting, and by `current_database()` after (a service file or `PGDATABASE` can't slip past). It needs CREATEROLE and says so. The `learn_spatial` canary runs only where that schema exists.
  - It writes the outputs and `checked.json`.
  - L1 creates it with the loader stage; L2 adds the blocks; L4 adds Python. It is a port of T6's runner, not a second harness: once L2 lands, the spike is frozen as this mission's evidence and never extended (Fable SC4, adopted).
- **E2E (Playwright, the rules from 002 §8):**
  - `learn-map`: order, hours, prerequisites; a tick survives a reload.
  - `learn-browser`: every B block runs in its page; every exercise accepts its answer and rejects a wrong one; Reset and Stop; one engine start per visit.
  - `learn-labs`: each page's code equals its download; the shown result equals the recorded output; `.ipynb` cells equal the `.py`.
  - `learn-data`: files and manifest sha256, row counts, CSV headers, the star's key coverage, the 50 MB cap, every file's `sources`, and the `/learn/data/` index listing every dataset of the sample with title, publisher and license.
  - `schema`: ERD drift.
  - `serving`: `.wasm` types and fixed mtimes.

#### T10. Build missions (004 §9; briefs `plans/briefs/critwire-learn-l<n>-<slug>.md`, ops format, chained like `queue-learn.sh`: each starts after the previous is merged and released)

| # | Mission | Scope | Needs from the previous | Sessions |
|---|---|---|---|---|
| L1 | `critwire-learn-data` | `/v1/countries.*` (002 §6). `/learn/data/`: the GBIF sample (`ingest gbif-sample` request/wait/fetch/cap plus dataset metadata, `gbif:register --target learn-sample`), the country-key contract, the Natural Earth 1:50m shapes, RESOLVE simplified, the atomic loader, the manifest and its credits, the `/learn/data/` index, the cap. `pnpm learn:check` (loader stage; `PG*`/`LEARN_PG_URL`). The `AGENTS.md` line (T11 item 6). E2E `learn-data` | `main` | 32–38 |
| L2 | `critwire-learn-site` | Engine and app core (002 §1, §8); `pnpm erd` and three ERD pages; the map, track and module templates; progress; downloads; `/learn/setup/`; the playground; f1–f4 and d1–d6 from 004; `star.sql`, `writeStar` (one fact, DuckDB canonical); `learn:check` blocks (the cleanup lint and in-transaction leak check); the spike frozen; E2E | L1's data, loader and `learn:check` | 34–40 |
| L3 | `critwire-learn-gis` | `ingest habitat` (003 §5, v004): summaries, `occurrence_habitats`, the CR and TAS clips; the loader grows; g1–g7 written in full; the IUCN appendix | L2's pages and `learn:check` | 28–34 |
| L4 | `critwire-learn-stats-etl` | `requirements.txt` and `uv`; the Python stage of `learn:check`, `.ipynb` output; s1–s6 and e1–e5 in full, including Gi* and LISA tested against esda | L3's habitat data, the g6 grids | 30–36 |
| L5 | `critwire-learn-powerbi-capstone` | `fact_country_habitat` in `writeStar`; p1–p4; c1 with its JSON feed and schema; a curriculum pass; a handoff item for the owner's Power BI check | L4's s5 and e4 | 22–28 |

Each brief opens with how to start it, and with "superseded by" notes on `critwire-learn-b1/b2/c/d.md`. Each takes 004 as its design: "where code proves 004 wrong, fix it and update 004 in the same commit". Each releases itself (`deploy critwire`).

#### T11. For the owner (004 §10; each item has a recommendation and its cost)

1. **Lab data at `/learn/data/`, without CORS.** Cost: other people's web pages can't read the lab files. Alternatives: `/v1/learn/` (CORS, but bound by "only additions"), or a Caddy CORS rule on `/learn/data/` (a control-room change).
2. **The GBIF sample: download API, at most 2,000 per species, its own derived-dataset DOI; only the capped sample and its provenance in git.** Cost: one more registration and its refresh (the same steps as `AGENTS.md`'s DOI refresh, separate tags); about 7 MB public, ≈ 5 MB in git per refresh; a different cap needs a re-fetch of the archived download (no new request).
3. **No `spatial` extension in the browser:** light spatial in plain SQL; GIS in PostGIS. It saves 23.6 MB per DuckDB version. Cost: no `ST_` functions in the browser.
4. **002's open items carried over:** commit the `parquet` extension (3.22 MB); the Caddy headers (002 §10 item 7); photos linked from Wikimedia.
5. **The habitat raster, as 003 §8 items 2–4:** v004 summaries plus the CR and TAS clips. The COG's provenance is still unanswered. Cost: ingest time (about 37 min, 695 MB from Zenodo), plus a one-off 2.45 GB download for the clips.
6. **`AGENTS.md`'s copy line, applied by L1.** Replace "No Wikipedia prose (share-alike); write copy fresh for grades 6–12." with: "No Wikipedia prose (share-alike). Write all copy fresh, in our own words, for adults new to the topic: plain, precise English a working professional reads fast; define each term once; link to open references instead of rewriting them." Cost: none.
7. **The chain: five missions, about 146–176 sessions.** Cost: five reviews and releases. Alternative: stop after L2 (foundations and database architecture live), then decide.
8. **A 30-minute Windows check after L2 (Docker PostGIS plus the loader) and after L5 (Power BI against the star).** Cost: your time; it is the only test of the parts this VPS can't run.
9. **Traits datasets (003's mission C):** deferred; no module needs them. Cost: none now.

#### T12. For the owner only: the vault overlap (004 §8; titles only, no content)

| critwire | Vault guide (`main` unless noted) | Verdict |
|---|---|---|
| f1–f4 | sql-server-spatial module 04 | covered: take the skip checks |
| d1 | modules 01, 02, 05; wiki relational-model-and-keys, database-constraints, database-views | covered |
| d2 | module 03; wiki normalization | mostly covered; nested JSON → 3NF is new |
| d3 | module 07; wiki indexes-and-execution-plans | concepts covered; PostgreSQL's plans and GiST/BRIN are new |
| d4 | module 06; wiki transactions-and-acid | covered; MVCC and `ON CONFLICT` are new |
| d5 | modules 16, 17; wiki logins-users-and-roles, database-schemas-and-ownership | SQL Server's model covered; PostgreSQL's roles are new |
| d6, g6, g7, s1–s6, p1–p4, c1 | none | new: the core gap |
| g1 | module 08; wiki spatial-reference-identifiers, sql-server-geometry-vs-geography | covered; skim the PostGIS spellings |
| g2 | modules 09, 10; wiki well-known-text-and-binary, ogc-simple-features | covered |
| g3, g4 | modules 11, 12 | covered; skim |
| g5 | module 13; wiki sql-server-spatial-indexes | grid indexes vs GiST/KNN: take it |
| e1–e5 | pro-python-arcpy branch: Part 1 Python basics, Projects 1–2 | Python covered; APIs, PostGIS loads and DOIs are new |
| arcpy notes | pro-python-arcpy branch: Parts 2, 3 and 3 continued | covered |
| vault only | modules 00, 14, 15, 18, 19; wiki backup, enterprise-geodatabase, query-layers, arcgis-database-connections, arcgis-pro-license-levels | critwire doesn't teach these |

#### T13. Risks and failure modes (for the Steps' Failure modes)

| Risk | Handling |
|---|---|
| GBIF download slow, queued or failed | Submit in the first data step; `wait` resumes across sessions while other steps proceed; resubmit once on FAILED or KILLED. After 24 h, the spike uses `occurrence/search` pages capped at 2,000 per species, labelled "spike fallback, no DOI"; L1 must still use the download |
| The legacy `checklistKey` refused when given explicitly, GBIF's stored request doesn't echo it, or the count is off by > 0.1 % | Record it; try the COL XR keys (`ids.col`) with COL's checklist, set explicitly; never rely on the default and never weaken the license or coordinate filters |
| A raw country code outside `countries` ∪ {`ZZ`, `XZ`} | The load fails and names it. A GBIF-documented non-country value joins the constant with its meaning; a real code is a countries-file gap (002 §6's narrowest rule) |
| Dataset metadata read fails (404, or no title or publisher) | The ingest fails (all or nothing); a deleted dataset keeps its title and `deleted` date. Never publish a CC BY record without its dataset's credit |
| The loader fails part way (learner or runner) | One transaction: the previous `learn_curriculum` stays intact; the error names the table |
| A lab creates a `learn_` role or schema and doesn't drop it | The pairing lint fails the plan; the in-transaction leak check fails the block |
| A Python block bypasses the connect helper | `PGOPTIONS=-c search_path=pg_catalog` makes it fail on its first table name |
| The two star exports differ in bytes | Expected (`1.0` vs `1`): DuckDB's is canonical; a semantic difference (keys, text, numbers beyond 1e-9) fails |
| No aarch64 cp312 wheel (`uv --no-build` fails) | Pin the newest version that has one and record it; fallback: venv plus get-pip (brief); handoff only if both fail |
| `uv` can't be fetched | venv `--without-pip` plus get-pip.py |
| Moran's I disagrees by > 5e-7 | Diff the neighbour pairs, then k, S0/S1/S2 and the mean; fix the SQL, never the threshold |
| `EXPLAIN` plans flip between runs (d3, g5) | `COSTS OFF` and `ANALYZE` first; very selective predicates; record only the plan's shape |
| Python output varies | Explicit formatting, seeds, no DataFrame repr; a block that still varies is `untested` with the reason |
| Cap exceeded | The priority order in T5; RESOLVE cut to the lab regions |
| RESOLVE costs > 1 session | Record the size from A2; g4 and s6's RESOLVE blocks become `untested: L1 publishes it` |
| The browser setup with `occurrences` takes > 1.5× A1's time | Load `occurrences` only on the modules that use it (S: measured by the runner's boot) |
| `learn_spatial` touched, or a `learn_%` role or schema leaks | It's off the `search_path` and the lint refuses its name; the content canary (row counts and md5 per table) and the leak check fail the run; drop a leak by hand, as `critter-ai` |
| The `critwire` database | A2's URL guard; `learn:check` refuses it by name and by `current_database()` |
| `dist/` changes | Only `plans/` changes; the Verification hash comparison |
| Spike over 3 GB | Delete extracted zips once their sha256 is recorded; `du` after each step |
| Ports 3100–3102 busy, or E2E running | `serve.ts` refuses (A1) |

#### T14. Work units, in order (the planner turns these into ≤ 30 Steps)

1. Scaffold the spike (copies, provenance, pins, install, Caddy); a skeleton 004 whose `setup` block and one 002 block reproduce 002's results.
2. **GBIF:** submit (T7a 1, both `checklistKey`s); `uv` and the venv, the Python engine (with `PGOPTIONS`), a smoke block.
3. **Lab stand-ins:** draft countries (A2), 1:50m admin-0 and admin-1, the RESOLVE size probe; the loader generator (one transaction, `FORMAT csv`, validation); the PostGIS engine changes (T6: `pg.ts` re-pointed, `privilege.ts`, content canary, allowance, cleanup lint, in-transaction leak check); `--lab-erd`.
4. **ETL spike**, steps 2–7 (once the download is ready): dataset metadata and the country-key contract included.
5. Moran spike (the hexagon-geometry assertion first). 6. Star-export spike (DuckDB canonical, PostGIS cross-check, credits) and the Power BI input check.
7. Three ERDs and their renders. 8. 004 §0–§1, plus the "Superseded" notes in 002 and 003.
9. 004 §2–§3. 10. 004 §4.
11–12. f1–f4. 13–18. d1–d6.
19. Outlines G (g3 and g6 run). 20. Outlines S (s4 = the spike). 21. Outlines E and P (E from T7a, P from T7c). 22. Outline C.
23. 004 §6–§7. 24. §8. 25. Briefs L1–L5 and the superseded notes. 26. §10 and a completeness pass.
27. Verification (`verify.sh`, dist hashes, Summary).

### Rejected alternatives

- **Lab data under `/v1/`:** it binds lab samples to "only additions" for ever; no lab reader needs CORS (F7).
- **Publishing every open record (396k):** ~10 MB in the browser and a ~45 MB loader, and three datasets dominate it; the capped sample keeps the per-dataset bias visible at a fraction of the size.
- **Drawing the sample through `occurrence/search` (003 D3):** no DOI of its own, a paging cap, and it ties the sample to the countries DOI's refresh cycle (brief).
- **The DuckDB `spatial` extension for browser GIS:** 23.6 MB per version; practitioners' GIS is PostGIS; light spatial needs only plain SQL.
- **`ogr2ogr`/`shp2pgsql` loading, or a Python-only loader:** untestable here, or it couples the PostGIS track to the Python one (F5).
- **TWKB or EWKB hand-built in the build:** needs PostGIS, or byte-patching (a clever hack); WKB hex plus `ST_GeomFromWKB` is plain.
- **Moran's I on raw points:** no attribute, duplicate coordinates, a 0-distance mismatch (F8).
- **KNN weights for the spike:** ties on a grid break differently in each engine (F8).
- **venv plus get-pip on the VPS:** works here only; learners on Windows get one tool, `uv`.
- **Installing `uv` into `~/.local/bin`:** ops owns that folder; spike-local is enough.
- **`.ipynb` as the source:** JSON diffs and a second format to test; `.py` with `# %%` is the source, `.ipynb` is generated.
- **One star implementation per engine:** violates DRY; one standard-SQL `star.sql` runs in both.
- **A `.pbit` template:** can't be generated or tested on Linux.
- **Keeping A2's `spike-table` label and registry:** the brief has `ran | untested`; the log header records which data was used.
- **Building the traits datasets (003 mission C):** no module in the five areas needs them.
- **One build mission, or two:** about 150 sessions doesn't fit in 60; fewer than five would put a mission near the limit (002 §9's reasoning).
- **A server for labs (PGlite, a hosted PostGIS):** critwire stays static (decision rules).
- **The raw GBIF code as the FK, or `ZZ` rows in `countries`:** rejects rows at load, or puts a non-country in critwire's country contract (F11).
- **Lab credits in `/v1/attribution.json`:** it's the `/v1` contract, built from species records; lab files change and have their own manifest (F12).
- **Credits from the download's dataset listing alone:** it has titles and DOIs but no publisher; the dataset and organization reads give all three.
- **Committing the full projected download (≤ 15 MB):** ~15–30 MB of git history per refresh that no module reads; GBIF archives it under its DOI.
- **PostGIS's `\copy` as the canonical star:** `writeStar` is DuckDB; two canonicals would make the manifest's sha256 ambiguous.
- **The runner's rollback as the only cleanup:** it hides labs that leak on a learner's install (F13).
- **Text-format `COPY` (GBIF's TSV or the loader):** silently alters backslashes and `\x` hex (F10).

## Architecture review (Fable)

Fable, 2026-10-23. Checked against the code: `scripts/ingest/gbif.ts` (legacy `BACKBONE_KEY`, 7 `BASIS_OF_RECORD` values, filters), `scripts/gbif-register.ts:31`, `e2e/Caddyfile` (CORS on `/v1/*` only), `site/` (`index.html` only), `plans/002-learn-erd.mmd` (6 tables), `003 §7:3162` ("what both assume B delivered"), A2's `scripts/pg-engine.ts` (`runPgSetup` on every connect), `scripts/pg.ts`, `scripts/plan-queries.ts:102-145`, `src/engine.ts` (`load`, `setupGrown`), `critwire_dev` (528 rows; `critwire` role has no CREATEROLE), and GBIF's download docs (techdocs, fetched today). F1, F2, F4–F9 are real and correctly read. F3's premise is wrong (below). The design fits the brief: nothing public changes, labs run unchanged in `critwire_dev`, roles/schemas prefixed `learn_`, `learn_spatial` untouched, ≤ 10 modules in full, three spikes, Power BI untested with inputs verified. Moran formulas match esda's `__moments` (row-standardized S0/S1/S2, `VI_norm`, `z_norm`); the 5 km hex / 10 km band gap (8 660 m vs 15 000 m) is right.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **T7a `load`: `COPY` format for the GBIF TSV.** "tab, no quoting" implies `FORMAT text`, where `\` is an escape: `\N` becomes NULL, `\t`/`\n`/`\x..` in `locality`/`recordedBy` shift or alter columns, so the load fails or silently changes values. Specify `COPY … FROM STDIN (FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '')` (the standard GBIF-download trick) in T7a and in e2's key query. Why: the ETL spike is the model for e2; a wrong load pattern is taught to learners.
2. **T6 omits the `pg.ts` changes the copy needs.** A2's `connect()` hard-codes `SCHEMA = "learn_spatial"`, `search_path = learn_spatial, public`, runs `CREATE SCHEMA IF NOT EXISTS learn_spatial` and the raster `capabilityCheck` on every connect, and PG9's `scanForPrivilegeChanges` fails the spike on any `GRANT`/`REVOKE`/`ALTER ROLE` text in its code. T6 lists `pg.ts` among the copies and only says "pg-setup is deleted". Add: search_path `learn_curriculum` (T7c's `star.sql` relies on it), no `CREATE SCHEMA learn_spatial`, capability check gated on `-- needs: raster`, PG9 narrowed to the `learn_` allowance. Why: as copied, unqualified lab SQL runs against `learn_spatial` (breach of the brief) and the runner refuses d5's blocks.
3. **F3 misreads the docs.** techdocs `api-downloads` says: "If no `checklistKey` is supplied the obsolete GBIF Backbone Taxonomy will be used." So an omitted key would not misread `ids.gbif`; the risk is the opposite (the default changing later, and the output taxonomy). Keep the fix (set `checklistKey` at top level and on `TAXON_KEY`; S whether the legacy key is accepted), but reword F3, 004 §4 and the e1 outline so the course doesn't state a false default. Why: it becomes public course copy.

MISSED:
1. **`occurrences.country_code FK → countries` (T8, both ERDs).** GBIF codes include `ZZ` and codes absent from a 250-row ISO file (e.g. `XK`); the FK rejects rows at load. Decide (ZZ → NULL, or unknown members as in the star) and add "every `country_code` ∈ countries ∪ {ZZ}" to T7a's checks.
2. **Brief: "each lab drops what it creates in the same block."** T6 relies on the runner's `BEGIN … ROLLBACK` plus the leak check, so a d5 block that forgets its `DROP ROLE` passes here and leaks on a learner's install. Add a lint: every `CREATE ROLE|SCHEMA learn_…` in a block has a matching `DROP` in the same block (`-- tx: own` included).
3. **Dataset credits.** `datasets.csv` holds `dataset_key, license` only. CC BY 4.0 records need attribution, and e4 ("Which datasets must I credit?") and the `/learn/data/` index need titles and publishers. Fetch `GET /v1/dataset/<key>` (title, publishingOrganization) at ingest with the existing `getJson` rate-limited pattern; the loader and star `dim_dataset` carry them.

SHOULD-CONSIDER:
1. Commit only the capped sample plus download metadata (key, DOI, request, totals, per-dataset counts), not the ≤ 15 MB full projection: ~30 MB per refresh in git history for no module need (KISS; the sample is the snapshot, the rule is recorded).
2. Make the DuckDB export the canonical star (it is what `writeStar` publishes); the PostGIS `\copy` is the cross-check. Say so, or float formatting differences (`1.0` vs `1`) make the Power BI input manifest ambiguous.
3. `pnpm learn:check` should read its connection from `PG*`/`LEARN_PG_URL` (refusing database `critwire`), not hard-code the `critter-ai` socket, so the owner can run it in WSL (AGENTS.md: two machines).
4. L1/L2 briefs: move the spike runner into the repo as `learn:check`, don't keep two harnesses alive (DRY).
5. T7b: assert `ST_HexagonGrid(5000)` cell geometry once (`ST_Distance` of adjacent centroids = 8 660.25 m) before trusting the threshold gap; one query, saves a mystery if `size` semantics differ.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Lab isolation (T6):** explicitly replace the copied harness’s `learn_spatial` connection/search-path behavior with `learn_curriculum`. Otherwise unqualified lab SQL targets the protected schema; a row-count canary cannot detect all damage.
2. **Country-key contract (T5/T8):** define normalization for unknown/unmatched GBIF country codes before enforcing foreign keys. Preserve raw codes separately; use nullable references or explicit unknown members consistently across browser, PostGIS and star exports.
3. **Atomic reload (T5):** require schema replacement, loading and validation in one transaction. The specified destructive loader otherwise leaves existing lab data deleted or partially rebuilt after failure.
4. **Attribution ownership (T5/T7c):** define committed dataset citation metadata and its propagation into lab/star manifests. Dataset keys and licenses alone do not fulfill the promised attribution; existing attribution generation covers species sources, not arbitrary lab files.
5. **Standalone cleanup (T6):** require downloadable role/schema labs to clean up within their own blocks. Runner rollback alone can conceal artifacts that persist when learners execute the downloads.

SHOULD-CONSIDER:

1. Include loader, checker and environment versions in `checked.json` freshness checks.
2. Choose one canonical star export; use the other engine for semantic comparison.
3. Commit only the capped sample plus provenance unless full projected records serve a concrete reproducibility need.

## Revision notes

Architect, 2026-10-23 05:10–05:40 UTC. Every MUST-FIX and MISSED item resolved by changing the design; every SHOULD-CONSIDER adopted; none rejected. Checked read-only: A2's `pg.ts`/`pg-engine.ts`/`run-queries.ts`, `scripts/http.ts`, `scripts/build/{attribution,sources}.ts`, `scripts/derive/gbif.ts:19`, the GBIF snapshot's 250 codes (no `ZZ`/`XZ`), techdocs `api-downloads`, one `GET /v1/dataset/<key>`; scratch in `critwire_dev` was TEMP tables in rolled-back transactions only.

**Fable MUST-FIX**
1. COPY format → F10 (new); T7a step 4 uses `FORMAT csv, DELIMITER E'\t', QUOTE E'\b', NULL '', HEADER true`, the same as e2's key query; tested on a `C:\new "quoted" \N` field. The same trap was in the loader: text-format `COPY` turned `\x` hex WKB into 41 garbage bytes with no error, so T5's loader is `FORMAT csv` too.
2. `pg.ts` changes → F4, T6's new `pg.ts` list: `learn_curriculum` search_path from the `pg-session` constant (PG7); no `CREATE SCHEMA learn_spatial`; raster `capabilityCheck` only with `-- needs: raster`; PG9 narrowed through a shared `privilege.ts`. T4: every download starts with `pg-session`.
3. F3 wording → F3 rewritten: an omitted `checklistKey` means the obsolete Backbone (techdocs quoted); the risk is the default moving. Fix kept (both keys explicit, plus an echo check in T7a `fetch`); T5 says what 004 §4 and e1 must state; T13 row reworded.

**Fable MISSED**
1. Country FK → F11; T5's country-key contract (`country_code_gbif` raw, `country_code` nullable FK, `ZZ`/`XZ` as named non-country values, anything else fails); T7a check "every non-null code ∈ countries ∪ {ZZ, XZ}"; T7c and T8: `ZZ` is the star's one unknown member, set only in `star.sql`.
2. Standalone cleanup → F13; T6: a CREATE/DROP pairing lint (`-- tx: own` included, `DROP OWNED BY` for granted roles) and a leak check *inside* the block's transaction.
3. Dataset credits → F12; T5: dataset and organization reads through `getJson`, `datasets.json` committed; `datasets` and `dim_dataset` get title, publisher and DOI; `/learn/data/manifest.json` and `star/manifest.json` share `credits(file)`; build refusals; the index page; E2E `learn-data`.

**Fable SHOULD-CONSIDER** (all adopted)
1. Commit only the capped sample plus provenance → T5 "What's committed" (cap applied at ingest), T11 item 2, Rejected alternatives.
2. DuckDB star canonical → T7c Export; PostGIS is a semantic cross-check; T13 row.
3. `learn:check` on `PG*`/`LEARN_PG_URL` → T9; refuses `critwire` by name and by `current_database()`; never `DATABASE_URL`.
4. One harness → T9 and T10 L2: `learn:check` is the port; the spike is frozen after L2.
5. Hexagon geometry assertion → T7b; the distance classes were measured (8,660.25 / 15,000.00 / 17,320.51 m).

**Astra MUST-FIX**
1. Lab isolation → as Fable MF2, plus a content canary (row count and md5 per `learn_spatial` table), a lint refusing the name `learn_spatial`, and `PGOPTIONS=-c search_path=pg_catalog` for Python blocks (checked: the helper's `options` wins).
2. Country-key contract → as Fable missed 1 (T5, T7a, T7c, T8).
3. Atomic reload → T5 loader: `\set ON_ERROR_STOP on`, `BEGIN` … `COMMIT` around the drop, DDL, `COPY`, indexes, `ANALYZE` and a raising `DO` validation; atomic even without `ON_ERROR_STOP`. T13 row.
4. Attribution ownership → as Fable missed 3; `/v1/attribution.json` stays species-only (Rejected alternatives).
5. Standalone cleanup → as Fable missed 2 (T6).

**Astra SHOULD-CONSIDER** (all adopted)
1. Versions in `checked.json` → T9: the sha256 of loader, checker and `requirements.txt` are compared; server and package versions are recorded and shown.
2. One canonical star → as Fable SC2.
3. Capped sample plus provenance → as Fable SC1.

**Knock-on:** T10 L1 32–38 sessions (was 30–36), so the chain is 146–176 (T11 item 7). T13 has 7 new rows. T14 units 2–6 name the new work and still number 27. Seven Rejected alternatives added.

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-23 04:36 UTC: Baseline. typecheck pass, test 66/66, build 157 files (hashes = A2 baseline = live), e2e 20/20; learn_spatial readable only as critter-ai; no ensurepip/uv.
- 2026-10-23 05:20 UTC: Architecture. architect wrote F1–F9 + T1–T13: 33 modules (~68 h; f1–f4, d1–d6 in full), lab data at `/learn/data/` (GBIF download sample ≤ 2,000/species ≈ 46k rows, own DOI; NE 1:50m; simplified RESOLVE), psql-only loader, uv venv, Moran on 5 km hexes (Tasmanian devil), chain L1–L5 (~144–174 sessions). Read-only GBIF probes only; no code/data changed.
- 2026-10-23 05:05 UTC: Fable review. APPROVE_WITH_CHANGES; 3 MUST-FIX (T7a COPY csv/tab/QUOTE, T6 pg.ts changes, F3 GBIF default checklist wording), 3 missed, 5 should-consider. Plan only; no code.
- 2026-10-23 05:06 UTC: Astra review. APPROVE_WITH_CHANGES; 5 MUST-FIX (learn_curriculum search_path, country-key normalization, atomic reload, dataset citation propagation, standalone lab cleanup), 3 should-consider. Plan only.
- 2026-10-23 05:45 UTC: Revision. architect resolved all 8 MUST-FIX + 3 missed (F10–F13 new; F3 reworded; T5 atomic csv-format loader, country-key contract, dataset credits; T6 pg.ts learn_curriculum, cleanup lint, in-tx leak check); all SHOULD-CONSIDER adopted. Plan only; scratch TEMP tables rolled back.

## Summary
