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
- [x] Steps: `planner` writes Steps and Verification

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

Planner, 2026-10-23. T14's 27 units → 30 steps; all ten modules stay in full. Conventions:
- `W=/srv/critter-ai/worktrees/critwire-learn-curriculum`, `M=/srv/critter-ai/agent-state/missions/critwire-learn-curriculum`, `SP=$M/spike`, `A2=/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike` (read only), `P=plans/004-learn-curriculum.md`, `RQ="node $SP/run-queries.ts $W/$P"`, `ERDS="--erd $W/plans/004-learn-erd.mmd --lab-erd $W/plans/004-lab-erd.mmd --star-erd $W/plans/004-star-erd.mmd"` (from S12). Spike only in `$SP`, never committed. Every command, in order, goes in `$SP/README.md`; copied files in `$SP/provenance.tsv` (A2 path, copy path, both sha256).
- One step per session: commit the plan and changed `plans/` files with the check-off and one Log line; push. Deviations: on the step's line and under Decisions.
- **Guard** (end of every step):
  - `git diff --name-only origin/main...HEAD | grep -v '^plans/'` empty. `git diff --numstat origin/main...HEAD` shows 0 deletions for 002, 003 and `plans/briefs/critwire-learn-{b1,b2,c,d}.md`, and nothing for `plans/00{2,3}-learn-erd.mmd`.
  - `pnpm typecheck && pnpm test` (66 pass; no lint script, so typecheck is the static check).
  - `rm -rf dist && pnpm -s build && (cd dist && find . -type f | sort | xargs sha256sum) | diff - $SP/baseline/dist.sha256` empty.
  - `psql -X -At -d critwire_dev -f $SP/scripts/canary.sql | diff - $SP/baseline/learn_spatial.canary` empty. Leak query empty: `SELECT rolname FROM pg_roles WHERE rolname LIKE 'learn\_%' UNION ALL SELECT nspname FROM pg_namespace WHERE nspname LIKE 'learn\_%' AND nspname NOT IN ('learn_spatial', 'learn_curriculum')`.
  - `du -sb $SP` < 3,000,000,000 (logged); ports 3100–3102 free; `pgrep -af "$SP/Caddyfile"` empty.
  - No credential in the spike: a quiet `grep -rqF` of `GBIF_PASSWORD`'s value (read with `node -e 'process.loadEnvFile(…)'`) over `$SP` (excluding `node_modules`, `.venv`, `.uv-cache`, `.uv-python`) and `$M/queries.log` exits 1. Never echo the value.
- **Spike green:** `pnpm -C $SP typecheck && pnpm -C $SP test`. From S9 on, also `$SP/.venv/bin/python -I -m unittest discover -s $SP/tests_py`. Isolation tests (Failure modes) are written first and seen red; the red count goes in the Log.
- **004 blocks:** `node $SP/scripts/build-site.ts && $RQ --update`, read the diff (results change only where the step meant them to), then `$RQ --check [$ERDS]` exits 0 and rewrites `$M/queries.log`. Result blocks are written only by `--update`. Statuses are `ran | untested: <reason>` only. Never relabel a failing block `untested` to pass: fix it, or record why it can't run here.
- **PostGIS:** only `SPIKE_PG_URL=postgresql:///critwire_dev` (critter-ai, socket) through `scripts/pg.ts` (or the loader's `psql` command). Only schema `learn_curriculum`, plus `learn_t_*` test fixtures that their tests drop. `learn_spatial` is read only by the canary. Never `DATABASE_URL`, the `critwire` db, `ALTER SYSTEM|DATABASE`, `GRANT SET ON PARAMETER`.
- **Network:** GBIF ≤ 2 req/s, retries with backoff. Each download in a new `$SP/downloads/<name>/`, listed in `downloads/SOURCES.md` (URL, UTC, sha256). Extracted members are deleted once hashed; the GBIF zip is kept (verify reloads from it). Python only as `$SP/.venv/bin/python -I` (system `python3 -I` before S2), scripts outside download dirs. No apt. `uv`'s cache and Pythons stay in `$SP` (`UV_CACHE_DIR=$SP/.uv-cache`, `UV_PYTHON_INSTALL_DIR=$SP/.uv-python`).
- **Data rules:** no IUCN data; no Wikipedia prose; records, never range. Vault: titles only (S29), nothing copied.
- **004 conventions** (Verification greps them):
  - Headings: `## 0. Conventions` … `## 10. For the owner: choices`, `## A. The three spikes`, `## B. Disagreements with 002 and 003` (T1). `## 5. Modules` has `### 5.1 Foundations`, `### 5.2 Database architecture`, `### 5.3 GIS in SQL`, `### 5.4 Spatial statistics`, `### 5.5 ETL`, `### 5.6 Power BI`, `### 5.7 Capstone`.
  - Each module: `#### <id> · <slug>`, then `**Tool:** … · **Time:** <h> h · **Prereqs:** …`.
  - Full (f1–f4, d1–d6): `**Concept:**`, `**Worked example:**`, `**Lab:**`, `**Result:**`, `**Exercise:**`, `**Answer:**`, `**Check:**`, `**Dialects:**` (PostgreSQL, DuckDB, SQL Server: one line each). Each has a `<id>-ex` block. Foundations also have `**Already know this?**` with a `<id>-skip` block.
  - Outline (the other 23): `**Goal:**`, `**Data:**`, `**Key code:**`, `**Expected:**`.
  - Block ids are `<module>-<word>`. Engine blocks live in §0 (`setup`, `setup-counts`, `pg-session`, `py-connect`, the smoke blocks). A Python result block is ```` ```text ```` starting `-- result: <id> · python · sha256 <12>`, then stdout.
  - Copy is for adults new to the topic, in our own words; open references are linked, not rewritten; SQL Server appears only in dialect notes and §8.
- **[sample]** marks steps that need the GBIF download. If one comes up and `etl/gbif_download.py status` isn't SUCCEEDED, do the first unchecked step not so marked and note the reorder in the Log (R1).
- **`$SP/verify.sh`** (T6) is created in S1. Each step that adds a re-runnable piece appends it; S30 runs the whole script.
- **Deviations from T14:**
  - u2 → S2 (venv and submit) + S3 (Python engine).
  - u3 → S4 (shapes) + S5 (loader) + S6 (PostGIS session, canary, boot) + S7 (privileges, cleanup lint, leak check). `--lab-erd` moves to S12, because it needs the loaded occurrences.
  - u4 → S8 (fetch, load, datasets) + S9 (sample, verify, schema v2).
  - u23 is split: §6 joins the ERDs (S12), §7 joins outline C (S27).
  - u24 (§8) joins u26 (S29).
  - SQL a module teaches that a spike also runs (s4's Moran, d6's `star.sql`) is written once into 004 at its module. The spike scripts extract it by id (`scripts/block.ts`), so 004 is the one source (DRY).
  - The ERD marker `%% planned:` is added for L3's tables (S12).

- [x] S1. Spike scaffold; copy proof (T6, T14 u1; F4).
  - Copy from `$A2` with `cp`, per T6's list: `run-queries.ts`; `scripts/{browser,build-site,env,erd,erd-model,paths,pg,pg-engine,plan-queries,registry,runner-client,serve}.ts`; `src/{engine,sql,format,cards,assets,runner-page,runner-api}.ts`, `runner.html`, `*.d.ts`, `setup.sql`; both tsconfigs; the tests and fixtures of those files; `Caddyfile`; `data/v1/countries.{parquet,json}` (A1's draft); `downloads/duckdb-ext-v1.5.6/` `parquet` wasm_eh only (sha256 checked against A2's `SOURCES.md`).
  - Edit the copies:
    - paths → `$SP`;
    - boot `LOAD parquet` only: no `spatial` mirror, no `setup-grown`;
    - statuses `ran | untested` only: the `spike-table` label and the registry's use go; `registry.ts` is deleted unless the runner still imports a helper from it;
    - `pg-setup` and `runPgSetup` deleted; `-- engine: postgis` refused ("PostGIS engine not ready") until S6.
  - Dropped test ids (registry, `spike-table`, `pg-setup`, `spatial`, `setup-grown`) are listed in README with the reason.
  - `package.json`: A2's exact pins minus `geotiff` (g7 is PostGIS, T6), scripts `typecheck` and `test`. A2's `pnpm-workspace.yaml`. Then `pnpm install`.
  - `test/pg.test.ts` waits for S6, because its live tests connect through A2's unchanged `pg.ts`.
  - `scripts/canary.sql`: per `learn_spatial` table, name, `count(*)` and `md5(string_agg(t::text, '' ORDER BY t::text))`, plus its `pg_class` table list. Its output → `$SP/baseline/learn_spatial.canary`.
  - Recovery copy for R17: `pg_dump -Fc -n learn_spatial -d critwire_dev -f $SP/baseline/learn_spatial.dump` (read only).
  - `verify.sh` v1: refuse busy ports, build-site, `$RQ --check`.
  - `$W/$P` skeleton: title, a purpose paragraph, every T1 heading; §0 holds 002's `setup` block byte for byte and `setup-counts` with its result block.
  - Check:
    - Guard; spike green (copied suites pass with path edits only).
    - Copy proof exits 0: `sed 's/^-- status: draft-table$/-- status: ran/' $W/plans/002-learn.md > $SP/scratch/002.md && node $SP/run-queries.ts $SP/scratch/002.md --check --erd $W/plans/002-learn-erd.mmd --log $SP/out/a1-recheck/queries.log --out $SP/out/a1-recheck`.
    - `$RQ --check` exits 0.
    - Under `serve.ts`, `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm` answers 200 `application/wasm`; no `spatial` file under `$SP/site`.

- [x] S2. Python environment (`uv`) and the GBIF download request (T4, T7a step 1, T14 u2; F3, F9).
  - `uv`: the pinned aarch64 release tarball, sha256 checked against its `.sha256` → `$SP/bin/uv` (`downloads/uv-<ver>/`, SOURCES.md).
  - Environment:
    - `$SP/requirements.in` (T4's list and lower bounds);
    - `uv pip compile --universal --python-version 3.12 -o $SP/requirements.txt`;
    - `uv venv $SP/.venv --python 3.12`;
    - `uv pip sync --no-build $SP/requirements.txt`.
    - → `out/python-env/summary.md` (uv, Python, every pin). No wheel: R9.
  - `$SP/etl/gbif_download.py request|status`, stdlib `urllib`. Credentials come from `$W/.env` and are never printed or written.
    - The T5 predicate over the 73 `ids.gbif` from `$W/data/species.json`; `checklistKey` = the legacy backbone at the top level and on `TAXON_KEY`; `SIMPLE_CSV` → `downloads/gbif-request/request.json`.
    - POST it. The key, the submit UTC and the `occurrence/search` count for the same filters → `downloads/gbif-request/submitted.json`.
    - A 4xx on the explicit key: R2.
  - Check:
    - Guard;
    - `uv pip sync --no-build` exits 0 and `uv pip check` is clean;
    - `.venv/bin/python -I -c 'import geopandas, libpysal, esda, pointpats, psycopg, pyogrio, sqlalchemy, geoalchemy2'` exits 0;
    - `gbif_download.py status` prints the key and PREPARING, RUNNING or SUCCEEDED.

- [x] S3. Python engine in the runner (T6 "Python", T14 u2).
  - Tests first, red: PY1–PY10.
  - `plan-queries.ts` and `run-queries.ts`:
    - ```` ```python ```` blocks with `# q:`, `# status:`, `# after:` and `# timeout:`;
    - run as T6 says, `PGOPTIONS='-c search_path=pg_catalog'` included;
    - stdout is compared with the result block (format above);
    - `--update` runs each block twice;
    - log header: `python: <version> · uv <ver> · requirements sha256 <12>`.
  - 004 §0: `py-connect` (T4's helper) and `py-smoke` (`SHOW search_path` through the helper; package versions), both `ran`.
  - Check: Guard; spike green; `$RQ --update`, then `--check` exits 0; `$M/queries.log` has `-- result: py-smoke · python · `.

- [x] S4. Lab stand-in shapes; RESOLVE size probe (T5, T14 u3; F6).
  - `$SP/etl/shapes.py` (venv) → `$SP/data/learn/`:
    - `country_shapes.parquet`: A2's `data/v1/country_shapes_50m.parquet`, copied, sha256 recorded.
    - `admin1_shapes.parquet` (`adm1_code`, `country_code`, `name`, WKB `geom`): from Natural Earth `ne_50m_admin_1_states_provinces.geojson` at A2's pinned commit `f1890d9f…`.
    - `ecoregions.parquet` (`eco_id`, `biome_id`, `name`, `realm`, WKB) and `biomes.csv`: from the RESOLVE 2017 zip (URL in 003 D9, ≈ 149 MB), simplified with `shapely` `simplify(preserve_topology=True)`. Log each tolerance tried. Keep it ≤ 8 MB, or cut to the lab regions (R14); over one session: R15.
    - A2's habitat stand-ins `habitat_classes.parquet` and `country_habitats.parquet`, copied, sha256 recorded (for the star, g7 and s6).
  - → `out/lab-data/summary.md`: per file rows, bytes, sha256; invalid geometries (kept: g2 teaches them); codes with no `countries` row; which countries 1:50m admin-1 covers.
  - Check: Guard; admin-1 holds Tasmania (AU) as one row, which S10 needs (else R24); ecoregions ≤ 8 MB or R14's cut recorded; no extracted `.shp`/`.dbf` left under `downloads/`; `du -cb $SP/data/learn` logged.

- [x] S5. The loader (T5 "The loader"; F5, F10; Astra MF3). Deviation: keys/geometry in `scripts/lab-keys.sql` beside `lab-ddl.sql` (Decisions).
  - Tests first, red: LD1–LD11. Live tests use a `learn_t_loader` schema that they drop.
  - `$SP/scripts/lab-ddl.sql`: T8's lab tables in PostgreSQL types: 002's six and the view, `country_shapes`, `admin1_shapes`, `biomes`, `ecoregions`, `habitat_classes`, `country_habitats`. `datasets` and `occurrences` come in S9.
  - `$SP/scripts/loader.ts`, called by `build-site.ts`:
    - Node DuckDB runs `src/setup.sql`, with `/v1/` and `/learn/data/` mapped to `$SP/site/` by one function (reused in S11).
    - Output: `$SP/site/learn/data/postgis/learn_curriculum.sql`, exactly T5's order: `\set ON_ERROR_STOP on`, `BEGIN`; drop and create the schema; `SET LOCAL search_path`; the DDL; `COPY … FROM stdin (FORMAT csv)` per table; `ST_GeomFromWKB(…, 4326)`; keys, GiST, `ANALYZE`; a raising `DO` validation; `COMMIT`.
  - Run it twice, as a learner would: `psql -X -v ON_ERROR_STOP=1 -d critwire_dev -f $SP/site/learn/data/postgis/learn_curriculum.sql`. → `out/loader/summary.md` (bytes, seconds, rows per table).
  - Check: Guard; spike green; both runs exit 0 with equal row counts; `pg_depend` shows no `learn_curriculum` object depending on a `public` relation.

- [x] S6. PostGIS engine, part 1: session, canary, loader at connect, boot blocks (T6 "pg.ts", "PostGIS connect", `-- boot`; F4; Fable MF2, Astra MF1).
  - Tests first, red: PC1–PC8 and CN1–CN5. A2's PG1–PG9 are adapted where T6 changes them.
  - `pg.ts`:
    - `SCHEMA`, `SEARCH_PATH` and `PG_SESSION` as T6 says; connect creates no schema;
    - `capabilityCheck` only with `-- needs: raster`; the CREATEROLE pre-check;
    - `scripts/canary.ts` runs `canary.sql`;
    - connect in T6's order 1–4; `-- boot`; `-- engine: postgis` enabled;
    - log header `postgis: <postgis_full_version()>`, plus `data: <file> sha256 <12>` for each lab file and the loader.
  - 004 §0: `pg-session` (`ran`, ends with `SHOW search_path`) and `pg-smoke` (rows per `learn_curriculum` table).
  - Check: Guard; spike green; `$RQ --update`, then `--check` exits 0; the log shows the canary equal before and after.

- [x] S7. PostGIS engine, part 2: privileges, cleanup lint, leak check, `-- tx: own` (T6 "Allowed", "Standalone cleanup"; F13; Astra MF5).
  - Tests first, red: PV1–PV8, CL1–CL8, LK1–LK5, TX1–TX3.
  - `scripts/privilege.ts`: the one rule module; PG9 skips only this file.
  - In `plan-queries.ts` and `run-queries.ts`: the allowances, the pairing lint, the in-transaction leak check after every block (and after a `-- tx: own` block's own `COMMIT`), and `-- tx: own` execution.
  - 004 §0, both `ran`:
    - `pg-role-smoke`: create `learn_smoke`, grant usage and select on `learn_curriculum`, `SET ROLE`, one `SELECT`, `RESET ROLE`, `DROP OWNED BY`, `DROP ROLE`;
    - `pg-tx-smoke`: `-- tx: own`, `BEGIN … ROLLBACK`.
  - Check: Guard (leak query empty); spike green; `$RQ --update`, then `--check` exits 0.

- [x] S8. **[sample]** ETL spike, part 1: fetch, load, checks, dataset metadata (T7a steps 2–5; F3, F10, F11, F12). Deviation: species by speciesKey, else taxonKey (4 synonyms); effective license for S9 (Decisions).
  - `gbif_download.py wait|fetch|load|datasets`:
    - `fetch`: the zip → `downloads/gbif-<key>/`, with sha256 and bytes. `download.json` gets the key, DOI, `totalRecords`, request, zip sha256 and per-dataset counts. `GET /v1/occurrence/download/<key>` must echo both `checklistKey`s, else R2.
    - `load`: one transaction. Staging by F10's `COPY` form (psycopg `cursor.copy`, streamed from the zip), then the typed `learn_curriculum.occurrences_all`. Runs T7a's checks and records the raw country values with row counts (an unknown code: R3).
    - `datasets`: T5's metadata reads at ≤ 2 req/s → `downloads/gbif-<key>/datasets.json`. Every dataset has a title and a publisher. Whether each dataset has one license decides where `license` lives (T8): record it under Decisions.
  - → `out/etl-postgis/summary.md`: latency, size, load seconds, rows per stage, rejects by reason, the raw country values.
  - Check: Guard; `occurrences_all` rows = `totalRecords`; every check passes, or its R-response is recorded; the zip's sha256 = `download.json`'s.

- [x] S9. **[sample]** ETL spike, part 2: the sample, verify, schema v2 (T7a steps 6–7, T5, T6 "DuckDB boot"; F2, F11). Deviation: species rule moved into `sample_rules.species_for`, used by `load` (Decisions).
  - Tests first, red: CK1–CK5 and SC1–SC5 (`$SP/tests_py/test_sample_rules.py`; the rules live in `$SP/etl/sample_rules.py`).
  - `sample` (runs `load` first if `occurrences_all` is gone, since every loader run drops lab-made tables):
    - only records whose effective license (S8 Decisions: the more restrictive of record and dataset, from `datasets.json`) is CC0 1.0 or CC BY 4.0; `license` = that effective license;
    - → `$SP/data/learn/{occurrences.parquet,occurrences.csv,datasets.csv}` with T5's columns;
    - → `sample-contributions.json` (never posted);
    - records the projected full-download Parquet size.
  - `verify`: `load` twice gives the same counts and the same `md5(string_agg(… ORDER BY id))`; the outputs' sha256 match the summary. `$SP/etl/run.sh verify` runs offline from the zip; append it to verify.sh.
  - Schema v2:
    - the loader gains `datasets` and `occurrences` (generated `geom`, GiST);
    - 004 §0's `setup` = 002's plus `datasets` and `occurrences`, and equals `src/setup.sql`;
    - build-site serves both files;
    - boot time is measured against A1's (R16).
  - 004 §A.1: the ETL spike's inputs, commands and results.
  - Check:
    - Guard; spike green; `etl/run.sh verify` exits 0;
    - `$RQ --update` changes only the `setup*` and `pg-smoke` results; `--check` exits 0;
    - `du -sb $SP/site/learn/data` and `du -sb $SP/data/learn` each < 50,000,000 (logged).

- [x] S10. **[sample]** Moran spike (T7b; F8; Fable SC5). Deviation: one `s4_cells` table holds both grids (5 km compared, 10 km MAUP) plus view `s4_neighbours`; gates in `compare.py` (Decisions).
  - Tests first, red: MC1–MC6 (`$SP/tests_py/test_moran.py`). MC7's 3-point case is run and recorded.
  - 004 §5.4, `#### s4 · moran`, key code only, all `ran`: `s4-cells` (`-- boot`), `s4-geometry` (distance classes, duplicates, islands, the threshold gap), `s4-moran-sql`, `s4-moran-pysal` (`# after: py-connect`).
  - `$SP/scripts/block.ts <plan> <id>` prints one block's code, through plan-queries.
  - `$SP/moran/run.sh` extracts the s4 blocks and runs them; `compare.py` → `out/moran/summary.md` and `compare.json` (`neighbours_equal`, `equal_6dp`, `max_abs_delta`, full precision; plus the 10 km MAUP run and `z_rand`). Append it to verify.sh.
  - 004 §A.2.
  - Check: Guard; spike green; `moran/run.sh` exits 0: neighbour sets equal; I, E[I], Var_norm and z equal to 6 decimals; |Δ| ≤ 5e-7. `$RQ --check` exits 0.

- [x] S11. **[sample]** Star-export spike and the Power BI input check (T7c, T6 "Power BI", T5 "Credit"; F12). Deviation: ids `d6-star-<table with - for _>`; the star stays in `out/star-export/` (Decisions).
  - Tests first, red: PB1–PB7 and ST1–ST5.
  - 004 §5.2, `#### d6 · star`, key code only: `star.sql` as blocks `d6-star-<table>` (standard SQL, no schema names), `ran` in PostGIS.
  - `$SP/scripts/credits.ts` (`credits(file)`, T5) → `$SP/site/learn/data/manifest.json`, and the star manifest.
  - `$SP/star-export/run.sh`:
    - extracts `d6-star-*` with `block.ts`;
    - Node DuckDB over the site's inputs (S5's path map, plus the habitat stand-ins) → `out/star-export/*.csv` (canonical) and `manifest.json`;
    - PostGIS cross-check: the same SQL, `\copy … ORDER BY <pk>`, compared semantically;
    - T7c's checks → `out/star-export/summary.md`;
    - when a manifest exists, the fresh export must hash the same.
    - Append it to verify.sh.
  - Runner: ```` ```m ```` and ```` ```dax ```` blocks, inputs checked against `out/star-export/manifest.json` (T6), logged as `-- input: …`.
  - 004 §5.6, `#### p1 · power-query`, key code only: `p1-load` (```` ```m ````, `// input:` every star file).
  - 004 §A.3.
  - Check: Guard; spike green; `star-export/run.sh` exits 0; `$RQ --check` exits 0, with one `-- input:` line per input of `p1-load`.

- [x] S12. ERDs, their checks and renders; 004 §6 (T8, T6 "ERDs"). Deviation: plan fences found by first line; messages `ERD <file>: …`; §6 dictionaries checked against the .mmd (Decisions).
  - Tests first, red: EG1–EG5.
  - The three sources:
    - `plans/004-learn-erd.mmd`: v2, 002's six tables unchanged plus `datasets` and `occurrences`;
    - `plans/004-lab-erd.mmd`: the lab. Lab-made tables go beside the diagram as `%% lab-made:`; L3's `occurrence_habitats` and `habitat_clips` as `%% planned:`;
    - `plans/004-star-erd.mmd`: T7c's star, unknown members included.
  - run-queries: `--erd` (A2's drift check plus EG1), `--lab-erd`, `--star-erd`.
  - Renders: `node $SP/scripts/erd.ts $W/plans/004-<learn|lab|star>-erd.mmd --name <schema|lab|star>` → `$SP/erd/`. Append them to verify.sh.
  - 004 §6: each ERD as a ```` ```mermaid ```` fence equal to its file, plus the data dictionaries (column, type, key, meaning, source).
  - Check: Guard; spike green; `$RQ --check $ERDS` exits 0 (every later `--check` takes `$ERDS`); three SVGs and three PNGs; each SVG carries its `.mmd`'s sha256; no `<foreignObject>`.

- [x] S13. 004 §0 (final), §1 and §B; "Superseded" notes on 002 and 003 (T1, T2; brief item 1). Deviation: §1 marks 003 §8 item 5 dropped and item 1 changed, not T2's "items 2–5 kept" (Decisions).
  - §0 covers:
    - block headers, engines and statuses;
    - `-- needs:`, `-- boot`, `-- tx: own`;
    - the `learn_` and cleanup rules;
    - the uncounted `sh` and `powershell` fences;
    - how to re-run (`$RQ --check $ERDS`, `verify.sh`) and where results live.
  - §1: T2 expanded by section of 002 and 003 (kept, changed, dropped), each with its section reference. D3's change to the download API is recorded.
  - §B: every disagreement with 002 and 003, one paragraph each: F1, F3, F5, F6, D3, the dropped `spatial` and `setup-grown`, T11 item 3.
  - At the top of `plans/002-learn.md` and `plans/003-learn-data-spatial.md`, one note: `> **Superseded 2026-10-23** by plans/004-learn-curriculum.md (practitioner curriculum). Kept as a record; 004 §1 lists what is reused.` Nothing else changes.
  - Check: Guard (002 and 003 gain only the note's lines); every numbered `## ` section of 002 and 003 is referenced in §1 as `002 §<n>` or `003 §<n>` (grep loop).

- [x] S14. 004 §2 (the curriculum map) and §3 (lab environments) (T3, T4). Deviation: loader gains `SET client_encoding = 'UTF8'` (LD12); §3 adds a ran `gpkg-export` block; Docker tag `16-3.4` kept though frozen since 2024-10 (Decisions).
  - §2: T3's table with the questions in full; module id in the first column; hours per track and in total; prerequisite order; full vs outline.
  - §3:
    - Browser: 002 §1, light spatial in plain SQL.
    - PostGIS on Windows: Docker Desktop and EDB as `powershell` fences (Windows-only, untested); privileges; the `pg-session` and loader commands.
    - Python: `uv` steps for Windows and Linux; `requirements.txt` verbatim in one ```` ```text ```` fence; the connect helper (`py-connect`).
    - arcpy notes: blocks `untested: ArcGIS Pro (Windows, licensed)`.
    - Power BI: `Web.Contents`, `Csv.Document` and the explicit culture, as an ```` ```m ```` block with `// input:`; what's tested and what isn't.
  - Check:
    - Guard; `$RQ --check $ERDS` exits 0;
    - §2's per-track and total hours equal their stated sums (awk over the table);
    - every prerequisite id exists and comes earlier;
    - §3's requirements fence = `$SP/requirements.txt` (`diff`).

- [x] S15. 004 §4 (lab data) (T5; F2, F6, F7, F11, F12). Deviation: loader geometry base64, not T5's `\x` hex in bytea (budget); `lab-sizes` runs in the browser (`pg-smoke` already counts PostGIS) (Decisions).
  - Per dataset: license (with its 003 quote reference), measured size (S4, S9), files and home, modules, the mission that builds it, and the ingest and build steps.
  - The GBIF sample:
    - download API vs 003 D3; the predicate;
    - the documented `checklistKey` default, and why the pipeline pins it;
    - the cap, the columns, the country-key contract, the dataset metadata;
    - registration (`--target learn-sample`, `gbif-learn-*` tags); what's committed.
  - Then the loader, the cap with measured numbers, credits, CORS (F7).
  - Blocks, both `ran`: `lab-sizes` (rows per lab table) and `lab-credits` (datasets lacking a title or publisher: 0 rows).
  - Check: Guard; `$RQ --update`, then `--check $ERDS` exits 0; every number in §4 equals the one in its `out/{lab-data,etl-postgis,loader}/summary.md`.

- [x] S16. f1 select and f2 aggregate, in full (T1, T3).
  - Browser blocks; f2 runs on `occurrences` (records per year and basis of record).
  - Check: Guard; `$RQ --update`, then `--check $ERDS` exits 0; both modules have every full-module label, `<id>-skip` and `<id>-ex`.

- [x] S17. f3 join and f4 window, in full. 002's l07 → d1, l09 and l11 → f3, l14 and l15 → d2 (Decisions).
  - f3: light spatial in plain SQL (bounding box, 10° bins); the anti join "species with no records".
  - 002's l07, l09, l11, l14 and l15 are re-run inside d1, f3 and d2 (T2): decide which goes where by topic and record the mapping under Decisions.
  - Check: as S16.

- [x] S18. d1 keys, in full (B + PG): PK, FK, UNIQUE, CHECK, generated columns; what an FK doesn't check (`-- expect: error` blocks). Check: as S16, and its PostGIS blocks `ran`. Deviation: `field_notes` (d1's identity lab) added to the lab ERD's `%% lab-made:`; exercise checked by result + three refusal blocks (Decisions).

- [x] S19. d2 normalize, in full (B): nested JSON → 3NF; functional dependencies; the license-placement finding from S8. Check: as S16. Deviation: the license finding taught on the full download + the sample's one museum mismatch, since the sample's effective-license rule hides iNaturalist's two licenses (Decisions).

- [x] S20. d3 indexes, in full (PG): B-tree, GiST, BRIN, statistics; `EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)`, recording plan shape only (R12). Check: as S16; two consecutive `--check` runs agree. Deviation: runner accepts an `EXPLAIN`'s rows without `ORDER BY` (RP12 fixture first); every d3 block runs after `d3-analyze` (full-sample `ANALYZE`); `occurrences_by_year` lab-made (Decisions).

- [x] S21. d4 transactions, in full (PG): `-- tx: own` blocks; savepoints; `ON CONFLICT`; re-running a failed load (the loader's atomicity); MVCC through `xmin`. A demo that needs two sessions is a block `untested: needs two sessions`, with the commands shown. Check: as S16. Deviation: runner gains `-- fails: <text>` in `-- tx: own` blocks and shows the last row-returning statement (TX4–TX6 first); two-session demos run by hand (Decisions).

- [x] S22. d5 roles, in full (PG): a read-only reporting role, schemas, default privileges, a taste of RLS. Every role is `learn_…` and dropped in its own block (`DROP OWNED BY` + `DROP ROLE`). The page states the CREATEROLE need. Check: as S16; Guard's leak query empty. Deviation: every d5 block `-- tx: own` (BEGIN … drops … ROLLBACK); cleanup lint skips `-- fails:` statements (CL9 first); PG 16+ also needs `createrole_self_grant` (§3.2, §0 fixed; d1 creates no roles) (Decisions).

- [x] S23. d6 star, in full (PG + DuckDB): the module is written around S11's `d6-star-*` blocks; grain, conformed dimensions, unknown members, SCD 1 and 2, star vs snowflake, export. Check: as S16; `star-export/run.sh` still exits 0. Deviation: exercise (aggregate fact `fact_species_decade`) and export run in the browser (DuckDB), the rest in PostGIS; SCD 2 on the pangolins' *Manis* → *Smutsia* move; `dim_species_history` lab-made (Decisions).

- [x] S24. Outlines for G, g1–g7 (T3; 003's PostGIS lessons 5–7, E1's code finding, the IUCN appendix as optional and untested). Deviation: 18 of 22 blocks `ran` (all of g1–g6); g7 needs no raster settings (clips in-db), so no `pg-once` block, §1 and §3.2 fixed; IUCN appendix reads the learner's own schema `my_iucn` (Decisions).
  - g3 (GBIF codes vs the outlines) and g6 (hexagons, MAUP) are `ran`.
  - The others are `ran` where the lab data allows, else `untested: <reason>`. g7's blocks are `-- needs: raster` and `untested: L3 builds the clips`.
  - Check: Guard; `--check $ERDS` exits 0; seven outlines with all four labels.

- [x] S25. Outlines for S, s1–s6. Deviation: 23 of 24 blocks `ran` (all of s1–s5; s6 all but `s6-habitat`, `untested: L3 builds occurrence_habitats`); Gi\*, LISA and FDR ran here, not left to L4 (T7b); s4 gains `s4-permutations`, its spike blocks unchanged (Decisions).
  - s1's bias queries are `ran` (datasets, basis of record, the telemetry share of the jaguar).
  - s4 is completed around S10's blocks.
  - s2, s3, s5 and s6: key code `ran` where cheap, else `untested: <reason>`.
  - Honest-data framing throughout.
  - Check: as S24 (six outlines).

- [x] S26. Outlines for E (e1–e5, from T7a) and P (p1–p4, from T7c). Deviation: the COPY lives in `etl/gbif_load.py` (split from `gbif_download.py` in S8), so e2's grep is against it; each DAX block is a DAX-query-view query with a `ran` PostGIS twin (`p2/p3/p4-check`) giving the table Power BI should show; ETL labs write TEMP tables or roll back (Decisions).
  - e2's key block equals the F10 `COPY` in `gbif_download.py` (`grep -F`). e1 states the documented `checklistKey` default correctly.
  - P: ```` ```m ```` and ```` ```dax ```` blocks, `untested`, with their inputs checked. p1 is completed around `p1-load`.
  - Check: as S24 (nine outlines); one `-- input:` log line per P input.

- [ ] S27. Outline C (c1) and 004 §7 (the site) (T3, T9).
  - c1: pipeline → Gi* on hexagons → report → the game feed and its JSON schema, labelled as records, never range. `c1-feed` (per-hexagon weights from `s4-cells`) is `ran`.
  - §7: T9's URLs, pages, downloads, progress, build refusals, `checked.json`, `learn:check` and the E2E specs.
  - Check: Guard; `--check $ERDS` exits 0.

- [ ] S28. 004 §9 and build briefs L1–L5; superseded notes on the old briefs (T10; brief item 9).
  - `plans/briefs/critwire-learn-l1-data.md`, `-l2-site.md`, `-l3-gis.md`, `-l4-stats-etl.md` and `-l5-powerbi-capstone.md`, in the ops format (`/srv/critter-ai/ops/templates/mission-brief.md`):
    - a start comment: how to start it, base, place in the chain, session estimate;
    - Goal, Why, Scope (In and Out), Definition of done, Decision rules, Notes;
    - what it needs from the previous mission;
    - that 004 is its design ("where code proves 004 wrong, fix it and update 004 in the same commit");
    - L1 also applies T11 item 6's `AGENTS.md` line.
  - `critwire-learn-{b1,b2,c,d}.md`: a dated "Superseded by …" line at the top, nothing else.
  - §9: the chain table, the session estimates and how they're queued.
  - Check: Guard (old briefs: additions only); every new brief has the six `## ` headings; §9 names the five files in order; the estimates sum to §10's chain total.

- [ ] S29. 004 §8 (vault overlap), §10 (the owner's choices), completeness pass (T11, T12).
  - §8: T12's table, every title confirmed read-only (`git -C /srv/critter-ai/vault ls-tree -r --name-only main -- research/sql-server-spatial wiki`; `git -C /srv/critter-ai/vault ls-tree -r --name-only agent/pro-python-arcpy -- research/arcgis-pro-study-guide`). Names only; marked for the owner.
  - §10: T11's nine items, each with its recommendation and cost, numbers updated from the spikes.
  - Completeness pass: every block header, every module's labels, every `untested` reason; §A holds the three spikes; §B is complete; no "(S)" left unresolved.
  - Check: Guard; `--check $ERDS` exits 0; Verification V4's header checks and V7–V8 pass.

- [ ] S30. Full verification and the Summary draft.
  - Run `## Verification` as written; fix every failure (a fix that changes 004 re-runs it whole).
  - Draft the Summary under the `###` headings V10 names: the curriculum map, lab datasets, reused and dropped, vault overlap, the briefs with session estimates, the owner's choices, plus verification results and artifact paths.
  - Check: every V section passes; transcript in `$M/verify/verify-<UTC>.log`.

## Verification

Run from the worktree as one bash session; it writes its own transcript. No lint script exists (Baseline), so `pnpm typecheck` is the static check.
- E2E evidence comes in two parts:
  - the repo's Playwright suite proves nothing public regressed;
  - the spike runner executes every browser block in headless Chromium (DuckDB-WASM), plus every PostGIS block in `critwire_dev` and every Python block in the pinned venv. That run is this mission's E2E.

```bash
set -euo pipefail
W=/srv/critter-ai/worktrees/critwire-learn-curriculum; cd "$W"
M=/srv/critter-ai/agent-state/missions/critwire-learn-curriculum; SP=$M/spike; V=$M/verify; E=$M/e2e
P=plans/004-learn-curriculum.md; PLAN=plans/2026-10-23-critwire-learn-curriculum.md
FULL="f1 f2 f3 f4 d1 d2 d3 d4 d5 d6"    # minus any module demoted under Decisions (R25)
export SPIKE_PG_URL=postgresql:///critwire_dev   # critter-ai over the socket
mkdir -p "$V"; exec > >(tee "$V/verify-$(date -u +%Y%m%dT%H%MZ).log") 2>&1
fail() { echo "FAIL: $*"; exit 1; }
hashes() { (cd "$1" && find . -type f | sort | xargs sha256sum); }
ports_free() { ! ss -ltn | grep -qE '127\.0\.0\.1:310[012] '; }
q() { psql -X -d critwire_dev -v ON_ERROR_STOP=1 -Atc "$1"; }

# V0 preflight: clean and pushed; scratch db; PostGIS 3.4.2; ports free
test -z "$(git status --porcelain)" || fail "dirty tree"
git fetch -q origin; test "$(git rev-parse HEAD)" = "$(git rev-parse origin/agent/critwire-learn-curriculum)" || fail "not pushed"
node -e 'process.loadEnvFile(); process.exit(new URL(process.env.DATABASE_URL).pathname === "/critwire_dev" ? 0 : 1)' || fail "DATABASE_URL is not critwire_dev"
test "$(q "SELECT extversion FROM pg_extension WHERE extname = 'postgis'")" = 3.4.2 || fail postgis
ports_free || fail "port 3100-3102 busy"

# V1 scope: only plans/; 002, 003 and the old briefs gain lines only; their ERDs untouched
git diff --name-only origin/main...HEAD | grep -v '^plans/' && fail "files outside plans/"
git diff --numstat origin/main...HEAD -- plans/002-learn.md plans/003-learn-data-spatial.md plans/briefs/critwire-learn-{b1,b2,c,d}.md \
  | awk '$2 != 0 {print; b = 1} END {exit b}' || fail "lines removed from a superseded file"
git diff --quiet origin/main...HEAD -- plans/002-learn-erd.mmd plans/003-learn-erd.mmd || fail "002/003 ERD changed"

# V2 repo: typecheck, unit tests, dist = Baseline (157 files), E2E 20/20
pnpm install --frozen-lockfile; pnpm typecheck; pnpm test
rm -rf dist; pnpm -s build > "$V/build.txt"
hashes dist | diff - "$SP/baseline/dist.sha256" || fail "dist differs from Baseline"
rm -rf "$E"; E2E_ARTIFACTS="$E" pnpm e2e
jq -e '.stats.expected == 20 and .stats.unexpected == 0 and .stats.flaky == 0 and .stats.skipped == 0' "$E/results.json" > /dev/null || fail e2e
test -s "$E/playwright-report/index.html"; ports_free || fail "port left busy after E2E"

# V3 spike: frozen install, typecheck, isolation tests (TS and Python); venv = pins; < 3 GB
pnpm -C "$SP" install --frozen-lockfile; pnpm -C "$SP" typecheck; pnpm -C "$SP" test
export UV_CACHE_DIR=$SP/.uv-cache UV_PYTHON_INSTALL_DIR=$SP/.uv-python
"$SP/bin/uv" pip sync --python "$SP/.venv/bin/python" --no-build "$SP/requirements.txt"
"$SP/bin/uv" pip check --python "$SP/.venv/bin/python"
"$SP/.venv/bin/python" -I -m unittest discover -s "$SP/tests_py"
test "$(du -sb "$SP" | cut -f1)" -lt 3000000000 || fail "spike over 3 GB"

# V4 every block has its headers; then the whole spike re-runs (T6 verify.sh: ports, build-site, run-queries --check with
#    the three ERD checks, etl verify from the saved zip, Moran, star export, ERD renders, canary and leak check)
awk '/^```sql$/ {getline a; getline b; if (a !~ /^-- q: [a-z0-9-]+$/ || b !~ /^-- status: (ran|untested: .+)$/) {print NR ": " a " / " b; x++}} END {exit x > 0}' "$P" || fail "sql headers"
awk '/^```python$/ {getline a; getline b; if (a !~ /^# q: [a-z0-9-]+$/ || b !~ /^# status: (ran|untested: .+)$/) {print NR ": " a " / " b; x++}} END {exit x > 0}' "$P" || fail "python headers"
awk '/^```(m|dax)$/ {getline a; getline b; getline c; if (a !~ /^\/\/ q: [a-z0-9-]+$/ || b != "// status: untested: Power BI is Windows-only" || c !~ /^\/\/ input: star\/[a-z_]+\.csv/) {print NR ": " a; x++}} END {exit x > 0}' "$P" || fail "power bi headers"
"$SP/verify.sh"
grep -qE '^engine: .*DuckDB v1\.5\.6' "$M/queries.log" || fail "log: engine"
grep -qE '^postgis: .*3\.4\.2' "$M/queries.log" || fail "log: postgis"
grep -qE '^python: 3\.12\.' "$M/queries.log" || fail "log: python"
grep -qE '^data: .*learn_curriculum\.sql sha256 [0-9a-f]{12}' "$M/queries.log" || fail "log: data hashes"
diff <(grep '^-- result: ' "$P" | sort) <(grep '^-- result: ' "$M/queries.log" | sort) || fail "recorded results differ from queries.log"
for id in $(awk '/^```(m|dax)$/ {getline a; sub(/^\/\/ q: /, "", a); print a}' "$P"); do grep -q "^-- input: $id · .* keys=ok$" "$M/queries.log" || fail "inputs of $id unchecked"; done
grep -nE '^(-- |# )status: untested: ' "$P" || true     # listed for the Summary

# V5 spike evidence
for r in python-env lab-data loader etl-postgis moran star-export; do test -s "$SP/out/$r/summary.md" || fail "no $r summary"; done
jq -e '(.doi | test("^10\\.15468/dl\\.")) and .totalRecords > 0' "$SP"/downloads/gbif-[0-9]*/download.json > /dev/null || fail "download DOI"
jq -e '.neighbours_equal and .equal_6dp and .max_abs_delta <= 5e-7' "$SP/out/moran/compare.json" > /dev/null || fail "Moran"
test -s "$SP/out/star-export/manifest.json"; test -s "$SP/site/learn/data/manifest.json"; test -s "$SP/README.md"; test -s "$SP/provenance.tsv"
for d in "$SP/data/learn" "$SP/site/learn/data"; do test "$(du -sb "$d" | cut -f1)" -lt 50000000 || fail "$d over 50 MB"; done

# V6 the three ERDs render offline from their committed sources
for n in schema:learn lab:lab star:star; do b=${n%%:*}; m=plans/004-${n#*:}-erd.mmd
  test -s "$SP/erd/$b.svg" && test -s "$SP/erd/$b.png" || fail "no $b render"
  grep -qF "data-source-sha256=\"$(sha256sum "$m" | cut -d' ' -f1)\"" "$SP/erd/$b.svg" || fail "$b.svg not from $m"
  grep -q '<foreignObject' "$SP/erd/$b.svg" && fail "foreignObject in $b.svg"; done

# V7 004 complete
for n in 0 1 2 3 4 5 6 7 8 9 10 A B; do grep -qE "^## $n\. " "$P" || fail "004 §$n missing"; done
test "$(grep -cE '^#### [fdgsepc][0-9] · ' "$P")" = 33 || fail "not 33 modules"
test "$(awk '/^## 2\. /{s=1; next} /^## 3\. /{s=0} s && /^\| [fdgsepc][0-9] \|/' "$P" | wc -l)" = 33 || fail "map rows"
awk -v full="$FULL" '
  function fin() { if (id == "") return
    n = split(id in F ? "Concept|Worked example|Lab|Result|Exercise|Answer|Check|Dialects" : "Goal|Data|Key code|Expected", L, "|")
    for (i = 1; i <= n; i++) if (!(L[i] in seen)) { print id ": no **" L[i] ":**"; bad++ }
    if (id ~ /^f/ && !("Already know this?" in seen)) { print id ": no skip check"; bad++ }
    delete seen; id = "" }
  BEGIN { split(full, a, " "); for (i in a) F[a[i]] = 1 }
  /^#### [fdgsepc][0-9] · / { fin(); id = $2; next }
  /^#{1,4} / { fin(); next }
  id != "" && match($0, /^\*\*[^*]+\*\*/) { k = substr($0, 3, RLENGTH - 4); sub(/:$/, "", k); seen[k] = 1 }
  END { fin(); exit bad > 0 }' "$P" || fail "module parts"
for m in $FULL; do grep -qx -- "-- q: $m-ex" "$P" || fail "$m: no exercise block"; done
for m in f1 f2 f3 f4; do grep -qx -- "-- q: $m-skip" "$P" || fail "$m: no skip block"; done
awk '/^```text$/ {getline l; if (l ~ /^# This file was autogenerated by uv/) {f = 1; print l; next}} f && /^```$/ {exit} f' "$P" | diff - "$SP/requirements.txt" || fail "§3 requirements differ"
for f in plans/briefs/critwire-learn-l{1-data,2-site,3-gis,4-stats-etl,5-powerbi-capstone}.md; do
  test -s "$f" || fail "no $f"; grep -qF "$f" "$P" || fail "§9 lacks $f"
  for h in Goal Why Scope 'Definition of done' 'Decision rules' Notes; do grep -qx "## $h" "$f" || fail "$f: no $h"; done; done
for f in plans/briefs/critwire-learn-{b1,b2,c,d}.md plans/002-learn.md plans/003-learn-data-spatial.md; do head -8 "$f" | grep -q 'Superseded' || fail "$f not marked superseded"; done

# V8 data rules: no Red List categories in code, results or ERDs; no IUCN download; no credential; no vault text
{ awk '/^```/ {f = !f; next} f' "$P"; cat plans/004-*-erd.mmd; } | grep -nE 'Critically Endangered|Endangered|Vulnerable|Near Threatened|Least Concern|Data Deficient|Extinct in the Wild' && fail "Red List category"
grep -iE '://([a-z0-9.-]+\.)?(iucnredlist|iucn)\.org' "$SP/downloads/SOURCES.md" && fail "IUCN download"
pw=$(node -e 'process.loadEnvFile(); process.stdout.write(process.env.GBIF_PASSWORD ?? "")'); test -n "$pw" || fail "no GBIF_PASSWORD to scan for"
grep -rqF --exclude-dir=node_modules --exclude-dir=.venv --exclude-dir=.uv-cache --exclude-dir=.uv-python -- "$pw" "$SP" "$M/queries.log" plans && fail "credential in spike, log or plans"; unset pw
awk '/^```/ {f = !f; next} !f && length >= 80' "$P" | sort -u > "$V/prose.txt"
git -C /srv/critter-ai/vault grep -lF -f "$V/prose.txt" main agent/pro-python-arcpy && fail "vault text copied into 004"

# V9 critwire_dev left clean: learn_spatial = Baseline; no learn_ leak; no parameter grants or postgis role/db settings
psql -X -At -d critwire_dev -f "$SP/scripts/canary.sql" | diff - "$SP/baseline/learn_spatial.canary" || fail "learn_spatial changed"
test -z "$(q "SELECT rolname FROM pg_roles WHERE rolname LIKE 'learn\_%' UNION ALL SELECT nspname FROM pg_namespace WHERE nspname LIKE 'learn\_%' AND nspname NOT IN ('learn_spatial', 'learn_curriculum')")" || fail "learn_ leak"
test "$(q "SELECT count(*) FROM pg_parameter_acl")" = 0 || fail "GRANT SET ON PARAMETER left"
test "$(q "SELECT count(*) FROM pg_db_role_setting WHERE array_to_string(setconfig, ',') ~ 'postgis\.'")" = 0 || fail "postgis setting left"

# V10 Summary has what the Definition of done asks
S=$(awk '/^## Summary$/ {s = 1; next} /^## / {s = 0} s' "$PLAN")
for h in 'Curriculum map' 'Lab datasets' 'Reused and dropped' 'Vault overlap' 'Build briefs' "Owner's choices" 'Verification'; do grep -qx "### $h" <<< "$S" || fail "Summary: no $h"; done

# V11 delivery
test -z "$(git status --porcelain)"; ports_free || fail "server left running"
echo VERIFY_OK
```

**What must hold:** every command exits 0 and the transcript ends `VERIFY_OK`. In detail:
- V2: the dist diff is empty (157 files, the hashes in `$SP/baseline/dist.sha256`, = `live.sha256`), and E2E is 20/20.
- V4: `--check` finds no result difference and no ERD drift. The plan's result lines equal the log's, and every Power BI input is `keys=ok`.
- V5: all six summaries are present; the download has its DOI; Moran agrees.
- V6: each SVG carries its source's sha256.

**Artifacts:**
- `$M/e2e/playwright-report/` (`pnpm exec playwright show-report $M/e2e/playwright-report`), plus `test-results/` traces, `results.json`, `docs-375.png` and `caddy-access.log`.
- `$M/queries.log`: every 004 block's result, from DuckDB-WASM (headless Chromium), PostGIS and Python, with engine versions and data hashes. Also `$SP/out/run-queries/` (the runner's browser output).
- `$SP/out/{python-env,lab-data,loader,etl-postgis,moran,star-export}/`, `$SP/erd/{schema,lab,star}.{svg,png}`, and `$SP/README.md` (every command, in order).
- `$M/verify/verify-<UTC>.log`: this run's transcript.

**Reproduce:**
- This script.
- Pieces alone: `node $SP/scripts/build-site.ts && node $SP/run-queries.ts $W/plans/004-learn-curriculum.md --check $ERDS`; `$SP/etl/run.sh verify`; `$SP/moran/run.sh`; `$SP/star-export/run.sh`; `rm -rf dist && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

**Release smoke** (the Release unit, not a step). After `deploy critwire`, the live site must be byte-identical to Baseline. Pass = `LIVE_UNCHANGED` and no other output.

```bash
M=/srv/critter-ai/agent-state/missions/critwire-learn-curriculum; SP=$M/spike; L=$SP/baseline/live.sha256; R=$M/release/live-after
rm -rf "$R"; mkdir -p "$R"
awk '{print $2}' "$L" | while read -r f; do mkdir -p "$R/$(dirname "$f")"; curl -sfL -o "$R/$f" "https://critwire.com/${f#./}" || echo "FETCH FAILED $f"; done
(cd "$R" && awk '{print $2}' "$L" | xargs sha256sum) | diff - "$L" && echo LIVE_UNCHANGED
for u in / /v1/species.json /v1/species.parquet /v1/species.csv /v1/attribution.json /v1/species/48.json /v1/species/tasmanian-devil.json; do
  c=$(curl -s -o /dev/null -w '%{http_code}' "https://critwire.com$u"); test "$c" = 200 || echo "HTTP $c $u"; done
c=$(curl -s -o /dev/null -w '%{http_code}' https://critwire.com/learn/); test "$c" = 404 || echo "/learn/ answers $c: something new is live"
curl -sI https://critwire.com/v1/species.json | tr -d '\r' | grep -qix 'access-control-allow-origin: \*' || echo "CORS missing on /v1"
```

## Failure modes

Only the spike harness is tested in isolation, because every "ran" claim rests on it. Each mode below is a test, written and seen failing before its code (step in brackets). "Fails" means a non-zero exit or a thrown error whose message names the cause.
- TS tests live in `$SP/test/` (`pnpm -C $SP test`); Python tests in `$SP/tests_py/` (`unittest`).
- Live tests touch only `learn_t_*` fixture schemas, which they drop.
- A2's suites for the copied files must pass with path edits only [S1]: SQ, CR, DC, RQ, RQE, ER, RE. A2's PG1–PG9 come in S6, adapted where T6 changes `pg.ts`. Dropped (registry, `spike-table`, `pg-setup`, `spatial`, `setup-grown`) and listed in README: RS, PS, and the RQ/RP fixtures for those features.

**PY · Python engine (`run-queries.ts`, `plan-queries.ts`), `test/python-engine.test.ts` [S3]**
- PY1 A ```` ```python ```` block with no `# q:` or `# status:`, or an unknown header, fails the plan, naming the line.
- PY2 A block runs as `.venv/bin/python -I <tmp>/block.py` from an empty temp dir; a `json.py` planted next to the plan or in the cwd isn't imported.
- PY3 Its environment is exactly PATH, HOME, `PGHOST`, `PGDATABASE`, `LEARN_BASE`, `PGOPTIONS`; no `.env` value (`GBIF_*`, `DATABASE_URL`) reaches it.
- PY4 A connection made without the helper fails on its first table name (`search_path=pg_catalog`); through the helper, `SHOW search_path` = `learn_curriculum, public`.
- PY5 `# after:` prepends the named earlier blocks, in plan order, in one process; an unknown, later or self id fails.
- PY6 Stdout ≠ the result block's body fails with a diff; a missing result block fails.
- PY7 A non-zero exit fails, quoting stderr's last lines.
- PY8 `# timeout:` (default 60 s) kills the process group and fails.
- PY9 `--update` runs each block twice; different stdout fails ("not deterministic").
- PY10 The log line is `-- result: <id> · python · sha256 <12>` of stdout; the plan's line must equal it.

**LD · Loader generator (`scripts/loader.ts`), `test/loader.test.ts` [S5]**
- LD1 Every `COPY` is `FORMAT csv`; asking for text format throws.
- LD2 WKB hex `\x0101000000…` loads as `POINT(1 2)`, SRID 4326 (F10's garbage-bytes case).
- LD3 Text with `\`, `"`, `,`, tab, newline, `\N` and non-ASCII round-trips byte for byte; `''` and NULL stay distinct.
- LD4 The first line is `\set ON_ERROR_STOP on`, then `BEGIN;`; the last is `COMMIT;`; there's no other transaction control.
- LD5 A wrong expected row count raises in the `DO` block, and the previous schema stays intact (its rows and md5 unchanged).
- LD6 LD5 with the `\set` line removed (a learner's own `psql`): still atomic.
- LD7 An FK violation (an unknown `species_id`) fails, naming the constraint; the previous schema stays intact.
- LD8 A geometry with SRID ≠ 4326 fails validation.
- LD9 The loader references no `public` table (text scan, and `pg_depend` after the load).
- LD10 The same inputs give byte-identical output (rows ordered by key, fixed number formatting).
- LD11 A missing input file or an unexpected column fails, naming it.

**PC · PostGIS session (`scripts/pg.ts`), `test/pg.test.ts` [S6]**
- PC1 `SEARCH_PATH` = `learn_curriculum, public`, set at connect. If the `pg-session` block's text differs from `PG_SESSION`, the plan fails.
- PC2 Connect issues no `CREATE`/`DROP SCHEMA` and no statement naming `learn_spatial` (checked on a recorded statement log).
- PC3 `capabilityCheck` runs if and only if the run holds a `-- needs: raster` block. A raster function in a block without it fails.
- PC4 A run holding `CREATE ROLE` checks `rolcreaterole OR rolsuper` before any block. Without it, the run fails naming CREATEROLE (pure function on role attributes, plus a live pass as critter-ai).
- PC5 `parseSpikeUrl` refuses database `critwire`, a host or a password (A2's PG1–PG2).
- PC6 The loader runs through `psql -X -v ON_ERROR_STOP=1 -d critwire_dev -f …`; a non-zero exit fails the run, with psql's stderr.
- PC7 `-- boot` blocks run once at connect, in plan order, and are committed. A failing boot block fails the run.
- PC8 PG9 scans the runner's code for privilege-changing text, skipping only `scripts/privilege.ts`; a `GRANT` string in any other file fails.

**CN · Canary (`scripts/canary.sql`, `canary.ts`), `test/canary.test.ts` [S6]** (fixture schema `learn_t_canary`)
- CN1 An unchanged schema compares equal.
- CN2 Same row count, one value updated: differs (md5), naming the table.
- CN3 A table added or dropped: differs, naming it.
- CN4 A run whose after-canary differs from its before-canary fails, even if every block passed.
- CN5 The live `learn_spatial` canary equals `$SP/baseline/learn_spatial.canary` (read only).

**PV · Privilege rules (`scripts/privilege.ts`, pure), `test/privilege.test.ts` [S7]**
- PV1 Role and schema statements (`CREATE`/`ALTER`/`DROP ROLE`, `GRANT`/`REVOKE`, `ALTER DEFAULT PRIVILEGES`, `DROP OWNED BY`, `SET ROLE`, `CREATE`/`DROP SCHEMA`) pass only in PostGIS blocks, and only when every name starts with `learn_`. Unquoted names fold to lower case; quoted names are compared as written.
- PV2 Any other name (`reporter`, `"Learn_x"`, schema `public`) is refused, naming it. `PUBLIC` is allowed only as a grantee on `learn_` objects.
- PV3 `ALTER SYSTEM`, `ALTER DATABASE` and `GRANT SET ON PARAMETER` are refused in every block.
- PV4 Any mention of `learn_spatial`, in any engine, case or position (strings and comments included), is refused.
- PV5 `SET` and `SET LOCAL` pass in PostGIS blocks and are refused in DuckDB blocks.
- PV6 `random()` is refused unless `setseed()` comes before it, in the block or its `-- after:` chain.
- PV7 `BEGIN`, `COMMIT` and `ROLLBACK` are refused unless `-- tx: own`. `SAVEPOINT`, `RELEASE` and `ROLLBACK TO` pass inside wrapped blocks.
- PV8 Role keywords inside comments or string literals don't trigger PV1–PV2 (`withoutComments`).

**CL · Cleanup pairing lint (`plan-queries.ts`), `test/cleanup-lint.test.ts` [S7]**
- CL1 `CREATE ROLE learn_a` with no later `DROP ROLE learn_a` in the same block fails, naming it.
- CL2 `CREATE SCHEMA learn_x` with no later `DROP SCHEMA learn_x` fails.
- CL3 A role that was granted anything, or owns anything, needs `DROP OWNED BY` before its `DROP ROLE`; otherwise the block fails.
- CL4 A `SET ROLE` with no later `RESET ROLE` fails.
- CL5 A `DROP` that comes before its `CREATE` doesn't count.
- CL6 `-- tx: own` blocks are linted the same way.
- CL7 A drop in an `-- after:` block doesn't count: each block cleans up after itself.
- CL8 A correct block passes.

**LK · In-transaction leak check (live), `test/leak.test.ts` [S7]** (leaks made by dynamic SQL in a `DO` block, which the lint can't see)
- LK1 A block that leaves role `learn_a` fails before the runner's `ROLLBACK`, naming it, even though the rollback would have removed it.
- LK2 The same for schema `learn_b`.
- LK3 A `DROP ROLE` while privileges remain errors in PostgreSQL, and the block fails.
- LK4 A `-- tx: own` block that commits a leak fails, naming the leak and the cleanup to run as critter-ai.
- LK5 `learn_spatial` and `learn_curriculum` are never reported.

**TX · `-- tx: own` (`run-queries.ts`), `test/tx-own.test.ts` [S7]**
- TX1 The runner doesn't wrap the block. A block that leaves a transaction open fails, and the runner rolls it back.
- TX2 `-- tx: own` on a DuckDB or Python block fails the plan.
- TX3 The leak check and the canary run after the block's own `COMMIT`.

**CK · Country-key contract (`etl/sample_rules.py`), `tests_py/test_sample_rules.py` [S9]**
- CK1 A code that has a `countries` row: `country_code_gbif` = `country_code` = the code.
- CK2 `ZZ` or `XZ`: the raw code is kept and `country_code` is NULL.
- CK3 An empty code: both NULL.
- CK4 Any other code with no `countries` row (`QQ`, lower-case `zz`) fails, naming the code and its row count.
- CK5 The non-country constant is exactly {`ZZ`, `XZ`}, each with GBIF's meaning.

**SC · Sample cap (`etl/sample_rules.py`), `tests_py/test_sample_rules.py` [S9]**
- SC1 At most 2,000 rows per species; a species with fewer keeps all of its rows.
- SC2 The order key is md5 of the decimal `gbifID` text, ascending; a duplicate `gbifID` fails.
- SC3 Python's choice equals DuckDB's `md5(CAST(id AS VARCHAR))` choice on the same input.
- SC4 Output is sorted by `id`; the same input gives the same bytes.
- SC5 A row whose `speciesKey`, else `taxonKey`, is no critwire `ids.gbif`, or whose two keys name two species, fails (S8 Decisions: synonyms).

**MC · Moran (`moran/compare.py`, the `s4-*` blocks), `tests_py/test_moran.py` [S10]**
- MC1 The two smallest centroid distance classes must be 8,660.25 and 15,000.00 m (± 0.01 m); anything else fails.
- MC2 Duplicate centroids fail.
- MC3 A cell with no neighbour fails, in SQL and in PySAL (`w.islands`).
- MC4 A pair within 1 m of the threshold fails.
- MC5 Different neighbour sets in the two engines fail before any statistic, naming the first differing pair.
- MC6 I, E[I], Var_norm or z: a difference > 5e-7, or a different 6-decimal string, fails. `compare.json` keeps full precision.
- MC7 (F8, recorded, not a gate): two points at the same coordinates are neighbours for `ST_DWithin` and not for `DistanceBand`.

**PB · Power BI input check (`run-queries.ts`), `test/powerbi-input.test.ts` [S11]**
- PB1 A ```` ```m ```` or ```` ```dax ```` block missing `// q:`, `// status: untested: Power BI is Windows-only` or `// input:` fails the plan.
- PB2 An input file that's missing, or absent from the manifest, fails.
- PB3 A header that differs from the manifest's columns (order included) fails.
- PB4 A duplicate or NULL primary key fails.
- PB5 A foreign-key value missing from its dimension fails, naming the file, column and value.
- PB6 Rows or sha256 different from the manifest fail.
- PB7 Each input is logged as `-- input: <id> · <file> rows=<n> sha256=<12> keys=ok`.

**ST · Star export (`star-export/`, `scripts/credits.ts`), `test/star-export.test.ts` [S11]**
- ST1 DuckDB's bytes are the manifest's. The PostGIS cross-check compares meaning: keys equal, text equal, numbers within 1e-9 relative. Byte-only differences are recorded; a semantic difference fails, naming the file, row and column.
- ST2 `NA` (Namibia) stays text under DuckDB `read_csv(all_varchar)` and Python `csv`.
- ST3 No fact foreign key is NULL: NULL countries map to `ZZ` and unknown years to `-1`, and both dimensions have those rows.
- ST4 `credits()` throws for a file with no `sources`, a license missing from `LICENSE_URLS`, a CC BY source with no citation, or a dataset with no title or publisher.
- ST5 A schema-qualified name in `star.sql` (`learn_curriculum.`, `public.`, `main.`) fails.

**EG · ERD checks (`run-queries.ts`), `test/erd-checks.test.ts` [S12]**
- EG1 A change to any of 002's six entities or their lines in `004-learn-erd.mmd` fails.
- EG2 `--lab-erd`: an entity, column, PK or FK in the `.mmd` that isn't in `learn_curriculum`'s catalog fails, and the reverse too (`%% lab-made:` and `%% planned:` entities excepted).
- EG3 `--star-erd`: an entity, key or relationship that differs from `manifest.json` fails, either way.
- EG4 A `%% planned:` entity that exists in the catalog fails (stale marker).
- EG5 Renders: the SVG carries the `.mmd`'s sha256 and has no `<foreignObject>` (A2's ER tests).

**Runtime risks** (T13, plus R22–R28), each with how it shows and what to do:

| # | Risk | Detection | Response |
|---|---|---|---|
| R1 | GBIF download slow, queued, FAILED or KILLED | `gbif_download.py status` at each [sample] step | Resubmit once on FAILED or KILLED. Do steps without [sample] meanwhile. After 24 h from submit, the spike uses `occurrence/search` pages capped at 2,000 per species, labelled "spike fallback, no DOI" (Decisions); L1 must still use the download |
| R2 | Explicit legacy `checklistKey` refused, not echoed, or count off by > 0.1 % | HTTP 4xx at S2; echo check in `fetch`; `totalRecords` vs the submit-time count | Record it. Retry with the COL XR keys (`ids.col`) and COL's checklist, set explicitly. Never the default; never weaker license or coordinate filters |
| R3 | Raw country code outside `countries` ∪ {`ZZ`, `XZ`} | `load` or `sample` fails, naming it (CK4) | A GBIF-documented non-country value joins the constant with its meaning (Decisions). A real code is a countries-file gap (002 §6's narrowest rule), recorded for L1 |
| R4 | Dataset metadata read fails, or no title or publisher | `datasets` exits non-zero | Re-run (all or nothing). A deleted dataset keeps its title and `deleted` date. Never publish a CC BY record without its dataset's credit |
| R5 | Loader fails part way | psql exit; LD5–LD7 | The previous `learn_curriculum` stays intact; the error names the table; fix the generator |
| R6 | A `learn_` role or schema leaks | Lint (plan), leak check (block), Guard's leak query (step) | Fix the block. Drop the leak as critter-ai (`DROP OWNED BY …; DROP ROLE …` / `DROP SCHEMA … CASCADE`), logged |
| R7 | A Python block bypasses the connect helper | It fails on its first table name (PY4) | Use `py-connect` |
| R8 | The two star exports differ in bytes | ST1 | Expected (`1.0` vs `1`), DuckDB is canonical. A semantic difference means fixing `star.sql` |
| R9 | No aarch64 cp312 wheel | `uv pip sync --no-build` fails | Pin the newest version that has one (Decisions). Fallback: venv plus get-pip. A handoff item only if both fail |
| R10 | `uv` can't be fetched, or its sha256 differs | S2's download check | `python3 -m venv --without-pip` plus get-pip.py (sha256 recorded) |
| R11 | Moran's I disagrees by > 5e-7 | MC5, MC6 | Diff the neighbour pairs, then k, S0/S1/S2 and the mean. Fix the SQL, never the threshold |
| R12 | `EXPLAIN` plans flip between runs (d3, g5) | Two `--check` runs differ | `COSTS OFF`, `TIMING OFF`, `SUMMARY OFF`, `ANALYZE` the table first, very selective predicates, plan shape only |
| R13 | Python output varies | PY9 | Explicit formatting, seeds, no DataFrame repr. Still varies: `untested` with the reason |
| R14 | Lab data over 50 MB | `du` in S9, S15, V5 | T5's priority order; RESOLVE cut to the lab regions |
| R15 | RESOLVE costs more than one session | S4 overruns | Record A2's size; g4's and s6's RESOLVE blocks become `untested: L1 publishes it` |
| R16 | Browser setup with `occurrences` takes > 1.5× A1's boot | Boot time measured in S9 | Load `occurrences` only on the modules that use it (setup split, Decisions) |
| R17 | `learn_spatial` changed | Canary (run, Guard, V9) | Stop and find the cause. Restore from S1's copy (`pg_restore --clean --if-exists -n learn_spatial -d critwire_dev $SP/baseline/learn_spatial.dump`); the canary must then equal Baseline; record it |
| R18 | Connecting to the `critwire` database | `parseSpikeUrl`; V0 | Never; a refusal is the expected behaviour |
| R19 | `dist/` changes | Guard; V2 | Revert the cause: only `plans/` may change |
| R20 | Spike over 3 GB | `du` in Guard | Delete extracted members and `uv cache prune`; keep the GBIF zip |
| R21 | Ports 3100–3102 busy, or E2E running | `serve.ts` refuses; Guard | Wait for the other run; never kill another mission's server |
| R22 | GBIF credential lands in a spike file, a log or a plan | Guard's quiet grep; V8 | Delete the file or line without printing the value; add a handoff item for the owner to rotate the GBIF password |
| R23 | GBIF zip lost or corrupt before Verification | `etl/run.sh verify` checks the sha256 | Re-fetch the same download key (GBIF archives it); never a new request |
| R24 | 1:50m admin-1 lacks Tasmania, or splits it oddly | S4's check | 1:10m admin-1 cut to AU for the spike (size recorded); 004 §4 says so |
| R25 | A step outgrows its session | The session can't finish it | Split it (mission rules). If splits take the list past 30 steps, demote d6, then d5, then d4 to outlines until it's back to 30 (brief item 5; T3). Their spike blocks stay as key code. Update `FULL` in Verification |
| R26 | Vault text copied into 004 | V8's verbatim check | Rewrite as module names only |
| R27 | SQL results change between `--update` and `--check` | `--check` diff | `ORDER BY` with a unique tie-break; never relabel `untested` |
| R28 | GBIF 429 or 5xx during the metadata reads | Retries exhausted | Back off; re-run the whole `datasets` step (all or nothing) |

## Code review (Astra)

## Release

## Decisions

- S1: A2's `pg.ts` out-db window and socket-byte helpers removed (with `cog.ts`, not copied): no live COG reads in this design. Its `SCHEMA`/session stay A2's until S6; `-- engine: postgis` is refused meanwhile, so nothing reaches `learn_spatial`.
- S1: runner's `?defer`/`bootRunner` path removed: it only carried `LOAD spatial` and setup-grown. Fixture `rq27-enum` lost its two `ST_GeometryType` cases (needed `spatial`); its ENUM checks stay. erd-grown's "setup-grown ERD must name a base" test dropped; `--erd` checks the base whenever `%% extends:` is present. All listed in `$SP/README.md`.
- S2: `uv` 0.13.5 (released 2026-10-22, newest) pinned; venv on system CPython 3.12.3 (no managed Python). 44 pins, all wheels (R9, R10 not hit).
- S2: GBIF accepted the explicit legacy `checklistKey` (top level + `TAXON_KEY`) and echoes both: R2 not hit, `ids.gbif` stay the filter. Submit-time search count 394,532 (architect's 396,629 was an earlier read); S8's 0.1 % check uses 394,532. `request.json` omits `creator` (account name); credentials stay in memory.
- S3: a startup `-c search_path=learn_curriculum,public` (T4's helper) is shown as given: `SHOW search_path` = `learn_curriculum,public`, not PY4's `learn_curriculum, public` (that spelling is `SET`'s). Kept T4's helper; PY4 asserts the real value. `py-connect` defines the helper and prints nothing (empty-stdout result), so `# after: py-connect` adds no output to later blocks.
- S3: PY tests split by cost: PY1/PY5/PY6/PY7-8/PY9 as fixture plans (`test/fixtures/python/`), PY2/PY3/PY4/PY7/PY8 on `runPython` directly, one update-then-check round trip. The fixture loop moved from `run-queries.test.ts` to `test/harness.ts` (shared, DRY). Block HOME = its own empty temp dir; stderr quote = last 5 lines.
- S4: RESOLVE kept whole-world at tolerance 0.05° (≈ 5 km, about the detail of the 1:50m shapes beside it): 6,686,262 B ≤ 8 MB. 0–0.02° were all over (0.02° = 9.9 MB; `preserve_topology` keeps every small island ring). Not R14's cut to "lab regions": the sample is global (73 species), and a cut would leave most records with no ecoregion. 004 §4 (S15) states the tolerance and the gaps/overlaps that per-feature simplification leaves.
- S4: RESOLVE `ECO_ID` 0 "Rock and Ice" has biome and realm `N/A` (its `BIOME_NUM` 11 is Tundra's id): `biome_id` and `realm` NULL (nullable FK, like `occurrences.country_code`); any other `N/A` row fails. `biomes.csv` has 14 rows (1–14).
- S4: lab files in GeoParquet 1.0.0 like A2's (WKB `geom`, bbox, CRS84), zstd, sorted by key; a re-run is byte-identical. RESOLVE read in place via `/vsizip/`, so nothing is extracted. Admin-1 drops `iso_3166_2` (Jervis Bay's `AU-X02~` isn't a real code); `adm1_code` is the key.
- S5: lab DDL split in two: `scripts/lab-ddl.sql` (tables: columns, NOT NULL, CHECK; shapes as `bytea`) and `scripts/lab-keys.sql` (after the rows: WKB → `geometry(MultiPolygon, 4326)` by `ST_Multi(ST_GeomFromWKB(…))`, PK/UNIQUE/FK, GiST), per T5's load-then-keys order. One type per shape column (NE and RESOLVE mix Polygon and MultiPolygon). The generator reads column lists from `lab-ddl.sql` (strict layout, else it throws), so DDL ↔ input mismatches fail at build (LD11), not at load.
- S5: Node DuckDB 1.5 reads GeoParquet `geom` as its core `GEOMETRY` type (no cast to BLOB): `openSiteDuckDb` sets `enable_geoparquet_conversion = false`, so the loader writes the file's own WKB bytes. The browser schema reads no shapes, so it's unaffected.
- S6: `pg-session` ends with `SHOW search_path` (as the step says), so its lint takes a last SELECT or SHOW. `pg-smoke` lists the 12 tables by name (`UNION ALL`, readable for learners); S9 adds `datasets` and `occurrences` lines.
- S6: `-- boot` is PostGIS only, takes no value, no `-- after`, no `-- expect`; nothing may name a boot block in `-- after`. Boot results are rendered and compared like any block. `-- needs:` takes only `raster`; the raster lint is a list of raster-only names (type `raster`, `ST_Clip`/`Value`/`SummaryStats`/`Width`/…, the out-db settings), not geometry overloads.
- S6: the canary runs through psql (needs `\gexec`), so connect's recorded statements never name `learn_spatial` (PC2). `canary.sql` takes `-v schema=` (default `learn_spatial`; Guard's output unchanged); `SPIKE_CANARY_SCHEMA` (`learn_t_*` only) points it at CN4's fixture. psql gets PATH, HOME, `PGHOST`=socket only. `LOADER_PATH` moved to `pg.ts` (`loader.ts` re-exports). `verify.sh` exports `SPIKE_PG_URL`; step 6 = canary `--check`.
- S7: untested blocks get only PV4 (no `learn_spatial`): they never run, so a learner's setup or d4's two-session demo may show BEGIN, SET or a non-`learn_` role (RP14's rule widened from privileges to every run rule). PV3 ("every block") = every engine.
- S7: beyond T6's list, `privilege.ts` also names roles in `OWNER TO`, `CREATE/ALTER POLICY … TO`, `GRANTED BY`, `REASSIGN OWNED`; refuses GRANT ON DATABASE/TABLESPACE/LANGUAGE/FOREIGN/LARGE OBJECT, two-phase commit, `SET SESSION AUTHORIZATION`, and `ALTER DEFAULT PRIVILEGES` without `FOR ROLE learn_…` (else it changes critter-ai's defaults). PUBLIC passes only when every object is in a named `learn_` schema (unqualified tables refused). CL3 counts any mention of the role between its CREATE and DROP (grant, owner, SET ROLE, policy) as needing `DROP OWNED BY`.
- S7: leak check = learn_ names not present at connect (so `learn_t_*` fixtures of a concurrent test don't count; Guard still sees everything); committed leaks reported once. A wrapped block expecting an error gets `SAVEPOINT runner_expect` before its last statement, so its leak check runs. `-- tx: own` end-clean: BEGIN probe; session (search_path, timeout, role) restored if changed; plain SET/RESET/set_config refused there (would outlive COMMIT), SET LOCAL allowed; `learn_curriculum` canary too (TX3 names only the canary; a committed lab change would leak into later blocks). `src/sql.ts` gained dollar quoting (SQ8) for DO blocks.
- S8: T5's "records map to species by `speciesKey`" (S) is refuted: 4 `ids.gbif` are legacy-backbone synonyms (Emydoidea blandingii 2442885, Tapirus bairdii 2440897, Smutsia temminckii 5786560, Smutsia gigantea 5786559); GBIF puts our key in `taxonKey` and the accepted species in `speciesKey` (2,385 rows). Rule: the species whose `ids.gbif` = `speciesKey`, else `taxonKey`; none or two fails. SC5 reworded; L1's ingest and 004 §4/e2 use this rule (and e2 teaches synonyms with it).
- S8: one license per dataset? No: iNaturalist (`50c9509d…`) has CC BY and CC0 records, so `license` stays on `occurrences` (T8); `datasets.license` is the dataset's declared license. 14 datasets' record licenses differ from their dataset's; 11 declare CC BY-NC 4.0 while GBIF marks their 13,467 records CC0/CC BY (12,733 iNaturalist). "If unclear, don't publish": a record's **effective license** = the more restrictive of its record and dataset licenses (CC0 < CC BY < CC BY-NC); S9's sample keeps only effective CC0/CC BY and publishes that in `license` (so Jaguar's CC0 records go out as CC BY, credited). An owner's choice in 004 §10 (S29): keep this, or trust record licenses (+13,467 records, mostly iNaturalist). The countries pipeline (aggregates, record licenses) is unchanged.
- S8: every load check is a gate: violations are counted into `load.json`, then any non-zero count rolls the transaction back ("rejects by reason" = these counts; 0 in the committed load). Per-taxon search counts are read before the transaction (no open tx during HTTP). No `ZZ`/`XZ`/empty country code in the download (R3 not hit); the contract stays for L1's refreshes.
- S8: `gbif_load.py` is imported by `gbif_download.py` through an explicit `sys.path` insert of `etl/` (`-I` drops the script folder; `downloads/` is never on the path). `datasets` reads records' licenses from `load.json` (no DB). GBIF erases the download after 2027-04-23 unless cited; L1 makes its own download and registers it.
- S9: the species rule lives once, `etl/sample_rules.species_for` (SC5), and `load` applies it per distinct (speciesKey, taxonKey) pair through a temp table (DRY; the SQL coalesce and its "two species" check went). Re-load md5 `f88acde248d5` = S8's.
- S9: sample = **40,395** records (T5 est. 46,366): effective license drops 13,467 (all effective CC BY-NC), then the cap. 71 species: 47 Ili pika has no open record; 18 Yangtze giant softshell's only record is iNaturalist (dataset CC BY-NC). 13 species at the cap, 33 under 100. No ZZ/XZ/empty code, `country_code` never NULL here; the contract stays (CK tests).
- S9: types: lab `datasets.dataset_key`/`occurrences.dataset_key` are `uuid` (d1 can teach it), the browser's `VARCHAR` like the rest of 002's schema. `occurrences.geom` is a stored generated column added after the load (lab-keys.sql).
- S9: `verify` is offline: `load(d, None)` skips the per-taxon `occurrence/search` check (recorded "skipped (offline)") and writes `out/etl-postgis/verify-load-{1,2}.json`, never `load.json`. `sample-contributions.json` lives in `out/etl-postgis/` (spike evidence; L1 commits its own under `data/raw/gbif-sample/`).
- S9: R16 not hit: boot 3.22 s (median, 5 desktop first visits) vs A1's 2.9 s first result, limit 4.35 s; the v2 tables cost ≈ 0.33 s, so setup stays one block. Measured by `scripts/boot-time.ts` (A1's `measure.ts` wasn't copied; this times the same marks).
- S9: S1's copy proof (002 against `src/setup.sql`) can't run as is now: 002's `setup` block is v1, and the runner requires `setup` = `src/setup.sql`. v1 is an unchanged prefix of v2, so 002's queries still hold; not re-run after S9.
- S9: sizes: `site/learn/data/` 43.65 MB (loader 29.6 MB, of which the sample ≈ 4.7 MB), `data/learn/` 14.06 MB; both under 50 MB, 6.3 MB headroom for L3's habitat files: S15 settles the budget.
- S10: `s4-cells` builds both grids into one `s4_cells` (`edge_m` 5000, 10000; threshold 2 × edge, in the √3·e … 3·e gap for any edge) and defines the neighbour rule once, as view `s4_neighbours`: `s4-geometry`, `s4-moran-sql` and run.sh's SQL pair list all read it (DRY), and s4 teaches MAUP from its own result. MC1 is checked as √3·e and 3·e to 0.01 m (= 8,660.25 / 15,000.00 at 5 km). The gates (MC1–MC4) live in `moran/compare.py` on `s4-geometry`'s row, run before the Moran blocks; the lesson block reports the facts (its recorded result is what `--check` holds) rather than raising. PySAL's full precision and neighbour lists come from `moran/dump_pysal.py`, appended to the extracted block by run.sh, so the 004 block prints only a readable table.
- S10: MC7 confirmed (F8): coincident points are `ST_DWithin` neighbours, not `DistanceBand` ones. SQL = PySAL on the 5 km grid: 6,246 ordered pairs equal, max |Δ| 1.06e-12. 28 of 2,000 devil records lie in no 5 km cell (12 Maria Island, 10 coast/sea, 4 mainland, 2 Albuquerque).
- S11: block ids are `d6-star-dim-species` … (ids are `[a-z0-9-]`, V4's header rule); the table is the id's tail with `_` (`export.ts` checks each block's first statement is `CREATE TABLE <that>`). `dim_year` = years present + `-1`, not a calendar; `dim_habitat_class` makes a level-1 class its own parent; `fact_records` keeps `basis_of_record`, `license` (degenerate dimensions), lon/lat (map visuals) and `coordinate_uncertainty_m`.
- S11: the star stays in `$SP/out/star-export/` (T6's manifest path), not copied into `site/learn/data/star/`: L2's `writeStar` publishes it; `/learn/data/` stays 43.67 MB (+ manifest). `site/learn/data/manifest.json` (build-site → `credits.ts writeLabManifest`) lists the 10 files there; CSV column types are DuckDB's sniffed ones. `LAB_FILES` already names the 8 `star/` files, so L2's publish needs no new credit.
- S11: `credits.ts` takes license URLs from the repo's `scripts/build/sources.ts` `licenseUrl()` by a run-time import (read only; one registry, not a copy). The sample's source = GBIF's own download citation ("GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w") + `datasets: "datasets.csv"`; its derived-dataset DOI is L1's (no registration in the spike). RESOLVE's citation = Dinerstein et al. 2017, BioScience 67(6), doi 10.1093/biosci/bix014 (003 quotes only the license); Jung's = 003 §5's.
- S11: a NULL fact foreign key fails the input check (ST3 folded into PB5's check: the star maps unknowns to members). Power BI blocks are `ParsedPlan.pbi`, not `Block`s (they never run; KISS), ids shared; their log entry is `-- skipped: <id> · Power BI is Windows-only` (as SQL's untested) then the `-- input:` lines. Cross-check: 7 of 8 files byte-identical; `fact_records` differs only in whole doubles (`805.0` DuckDB vs `805` PostgreSQL, 15,421 cells, equal in value).
- S12: three ERDs in one plan: `embedDrift` finds each file's fence by its first line (each `.mmd` opens with its own `%% critwire Learn: …` line), and a fence that is none of the given ERDs fails; A2's "exactly one mermaid block" rule (RQE5, RE5) is that rule with one file. Drift lines are `ERD <file>: …` (the ERDs share table names); A2's wiring tests' regexes updated.
- S12: EG1 adds one rule to A2's base check: no new line between two of 002's entities (v2 grows by lines to new entities only). The lab catalog is read after the boot blocks (`current_schema()` = learn_curriculum), so a boot table (`s4_cells`) must be listed `%% lab-made:`; lab-made also names the tables lessons create in rolled-back blocks (d6's star, `tx_smoke`) and the ETL staging tables. Star keys count as NOT NULL (the manifest has no nullability; PB5/ST3 fail a NULL key).
- S12: 004 §6's dictionaries (column, type, key, meaning, source) come from the .mmd (`scripts/erd-dictionary.ts`, sources per table), and a test holds §6's fences and rows to the files (types compared case-blind: parseErd upper-cases). The lab lists only tables v2 lacks or draws with other columns (`occurrences` for `geom`); the other seven point at §6.1.
- S13: T2 says 003 §8 "items 2–5 and 7–9" carry over, but item 5 (commit `spatial`) contradicts T11 item 3 and item 1 recommends AnAge (deferred): §1 lists 2–4, 7–9 kept, 1 and 6 changed, 5 dropped. 002 §10 item 11 is likewise answered "none". §B has 10 paragraphs: T2/T11's list (learner, F1, D3, F3, F5, F6, F7, no `spatial`/`setup-grown`) plus S8's synonym and effective-license rules and F11, which also differ from 003 D3/§2. §0 documents `-- params`, `-- expect` and `-- show: cards` too (the runner's full header set).
- S14: loader now sets `client_encoding` UTF8 after `BEGIN`: psql on Windows (EDB native) talks in the console code page, and LD12 (load under `PGCLIENTENCODING=WIN1252`, red first) showed non-ASCII silently garbled. Loader 29,598,105 B (+145); §A.1 and `out/etl-postgis/summary.md` updated; results unchanged. L1's loader carries the line.
- S14: Docker `postgis/postgis:16-3.4` kept as the recommended image (the tested pair), though Docker Hub shows it last rebuilt 2024-10-14 (old PG 16 minor, amd64 only): §3 binds it to `127.0.0.1` and says 16-3.5/3.6 run the labs with possibly different last digits. Pins resolve `--no-build` for Windows x86-64, Linux x86-64/aarch64, macOS 14+ arm64; Intel macOS has no pyproj 3.8.0 wheel (stated, not worked around).
- S14: §3's Power BI block is a standalone first-contact query (`pbi-smoke`, `dim_country`, 251 rows) rather than p1's function: the setup page must work before p1. §3 adds `gpkg-export` (ran: s4's 5 km cells → GeoPackage → read back, 1,094 rows), the exchange path T4 names for arcpy; `arcpy-moran` reads that file. `ipykernel` isn't pinned (the tests run scripts); §3 says VS Code/Jupyter add it. L4 decides whether to pin it.
- S15: the loader writes shapes as base64 text (`to_base64`; `lab-ddl.sql` shape columns `text`; `ST_GeomFromWKB(decode(geom, 'base64'), 4326)` in `lab-keys.sql`), not T5's `\x` hex into `bytea`: 29,598,105 → 21,330,577 B, geometries identical (EWKB md5 per table). Projection with hex: 43.67 MB now + L2's star 4.59 MB + L3 ≈ 4–10 MB ≈ 52–58 MB, over the 50 MB cap; with base64 ≈ 44–48 MB. Chosen over S5's options (coarser RESOLVE in the loader only, or ecoregions cut to the sample's countries): both make the browser and PostGIS disagree or lose data; base64 costs nothing. If L3 is still over, 004 §4.4's cut order: RESOLVE coarser (file and loader alike), then `occurrences.csv`, then the Tasmania clip out of the loader. L1's loader carries base64.
- S15: `lab-sizes` runs in the browser (8 tables), since §0's `pg-smoke` already counts the 14 PostGIS tables (DRY); together they show both engines hold the same rows. `lab-credits` is a browser query over `occurrences ⋈ datasets` (blank title/publisher via `coalesce(trim(…), '')`; NOT NULL alone can't catch ''): 0 rows. §4 number check: 102 numbers outside code fences, all in `out/{lab-data,etl-postgis,loader,star-export}/summary.md` except DOIs, a year, § refs and 003 D3's page size 300 (not spike measurements); the star's numbers come from `out/star-export/` (S11).
- S17: 002's lessons re-run by topic: l07 (keys, refused INSERTs) → d1; l09 (many-to-many through `species_countries`) and l11 (anti join on it) → f3, as `f3-brazil-list` and `f3-no-countries`, whose hashes equal 002's (`6eaf98efd284`, `f5fd7b6feb3f`); l14 (nested file → 1NF–3NF) and l15 (sources, licenses: provenance beside S8's license placement) → d2. f3 sets the published list against the sample (Brazil: 12 vs 14; the 2 extra are single stray records critwire's country rule drops) and the sample's anti join (5: the 4 of l11 plus Yangtze softshell, whose only open record is in a CC BY-NC dataset). f4's exercise checks `result, in order` (order is the answer); f3's `any row order`.
- S18: d1 = 20 blocks, all `ran` (13 browser, 7 PostGIS); l07's query, refused INSERT and exercise re-run as `d1-constraints` (hash `e6eae9d8d6bb` = 002's), `d1-same-id`, `d1-fk-genus`. PostGIS part: FK refuses a parent delete, FK accepts `AU` at Brasília (generated `geom` + `ST_Covers` shows BR), no index on `occurrences`' 3 FKs, generated column read + write refused, identity surrogate + natural `UNIQUE`. `d1-identity` creates `field_notes` (rolled back): added to `%% lab-made:` in `004-lab-erd.mmd` and §6.2 like d6's star. Exercise `species_photos` (browser) checked by `result` (74 photos, 74 species, 10 licenses) plus `d1-ex-same-url`/`-no-species`/`-license` (`-- after: d1-ex`, expect error) so any constraint names pass. DuckDB words a duplicate from `INSERT … SELECT` as `PRIMARY KEY or UNIQUE constraint violation` (not `violates unique constraint` as from `VALUES`); that block expects the former. §5.2 got its track intro.
- S19: d2 = 14 blocks, all `ran` (browser). 002's l14 and l15 re-run as `d2-list`, `d2-unnest`, `d2-repeat`, `d2-provenance` (hashes = 002's `2aac6d391e87`, `b463f81200a2`, `edbe3098db04`, `bc64a29cc0b4`). S8's finding (one dataset, two record licenses) doesn't show in the sample: iNaturalist declares CC BY-NC, so the effective-license rule (S8/S9) drops all its records; `d2-fd-license` returns 0 rows and the page states the full download's counts (CC BY 9,581 + CC0 3,152, `out/etl-postgis/summary.md`); the sample's own evidence is `d2-license-differs` (Natuurmuseum Brabant: dataset CC0, 4 records CC BY). Exercise checked by result + one refusal block (`d2-ex-two-titles`), as d1. An interrupted session drafted d2 and ran `--update`; this session re-ran `--check` and the Guard before committing.
- S20: d3 = 24 blocks, all `ran` (PostGIS). Runner: an `EXPLAIN`'s rows are the plan's own order, so `rowsOrdered()` (plan-queries.ts) = `ORDER BY` or a last statement starting `EXPLAIN` (comments and strings ignored); RP12 fixture `rp12-explain` written red first. R12 handled by: `d3-analyze` (`SET LOCAL default_statistics_target = 1000; ANALYZE occurrences`: 300,000-row sample > 40,395 rows, so statistics are exact and identical each run; the loader's own `ANALYZE` samples 30,000 at random), every other d3 block `-- after: d3-analyze` (or its own full `ANALYZE`); no page counts printed (d1's rolled-back insert can add a heap page); queries select a column outside the index, so no Index Only Scan (depends on when autovacuum set the visibility map: `relallvisible` was 790/832); every chosen plan beats the next one by ≥ 7 % (checked with `enable_*` off) except the planner's 1 % fuzz case, which was dropped (`year = 1855` on `(species_id, year)`: Index 479.27 vs Bitmap 478.98) for `year BETWEEN 1850 AND 1899` (Bitmap 875 vs Index 981). BRIN at the default 128 pages per range (16 gave 3 ranges for one decade, unexplained, not used). `d3-brin-sorted` creates `occurrences_by_year` (rolled back): added to `%% lab-made:` and §6.2, lab ERD re-rendered. Exercise (game query, no sort, 20 rows) is a PG self-check: plan shape + `d3-ex-rows`.
- S21: d4 = 16 blocks: 14 `ran` (PostGIS, exercise included) + 2 `untested: needs two sessions`. A failed load and savepoint recovery need statements that fail mid-block, which `-- tx: own` refused (any error ended it) and `-- expect: error` allows only last. Runner: a `-- fails: <text>` comment before a statement of a `-- tx: own` block means it must fail with that text and the block goes on (psql without ON_ERROR_STOP); refused in wrapped blocks; a `-- tx: own` block's result is its last row-returning statement (so `d4-savepoint` shows its state, then rolls back). TX4–TX6 red (2 of 3 tests) then green; spike 204/204; §0 documents both. Blocks that commit (`d4-autocommit`, `d4-replace`) drop `sightings` themselves, so TX3's learn_curriculum reading is unchanged; `sightings`, `sightings_runs` added to `%% lab-made:` (lab ERD re-rendered). `d4-wait`/`d4-isolation` were run once by hand with two connections (`$SP/scratch/d4-two-sessions.ts` → `out/d4/two-sessions.txt`): reader not blocked, second writer waits until A's ROLLBACK, RR `40001 could not serialize access due to concurrent update`, RC sees B's commit; their comments state those results. Upsert's inserted/updated from `RETURNING xmax = 0` (named a PostgreSQL detail; PG 18's `RETURNING old/new` in Dialects).
- S22: d5 = 7 blocks: 6 `ran` (PostGIS, `-- tx: own`: BEGIN, role work, drops, ROLLBACK) + `d5-database` `untested` (REVOKE CONNECT ON DATABASE: the lint refuses database grants, rightly). `-- tx: own` because a wrapped block's result is its last statement, which after the drops can't show a role's view; tx-own shows the last row-returning statement (S21), and `-- fails:` + savepoints show real `permission denied` errors. RLS lab compares four readers through a granted TEMP table `seen` (owner 40,395 · BR 5,033 · AU 4,636 · no policy 0); no lab-made table in `learn_curriculum`, so the lab ERD is unchanged. Lint: `d5-drop-role` shows `DROP ROLE` failing before `DROP OWNED BY`, which CL3 read as the block's drop; plan-queries now passes cleanupErrors only statements without `-- fails:` (they don't happen); CL9 red then green. PG 16 finding (tested by hand as a LOGIN CREATEROLE non-superuser over TCP): the creator gets ADMIN only, so `SET ROLE`, `ALTER DEFAULT PRIVILEGES FOR ROLE` and `DROP OWNED BY` are refused until `ALTER ROLE <you> SET createrole_self_grant = 'set, inherit'`; added to §3.2's privileges and d5's intro (§0 points to §3.2). §0 and §3.2 said d1 creates roles; it doesn't: now d5 only. `ALTER ROLE … SET default_transaction_read_only` goes on the login (role settings aren't inherited).
- S23: d6 = 17 blocks, all `ran`: the 8 `d6-star-*` unchanged (star-export hashes = manifest) + `d6-report`, `-snowflake`, `-drill-across`, `-at-sea`, `-unknown`, `-scd1`, `-scd2` (PostGIS) and `d6-export`, `d6-ex` (browser DuckDB; COPY TO + read_csv works in DuckDB-WASM, 250 rows). Sample has no country-less record, so `d6-at-sea` inserts a made-up `XZ` record (Bass Strait, no year), said so in the text; `d6-unknown` (`-- after: d6-at-sea` + star blocks; `after` isn't transitive, so each block lists every dim) shows it kept as `ZZ`. SCD 2 on a real naming history: MSW3 (2005) put all pangolins in *Manis*, *Smutsia* in general use since Gaubert et al. 2018; the 2018 cut by year is the lab's choice, stated; unknown year → current version; 13 of 19 pangolin records "as it was" *Manis*. `dim_species_history` (rolled back) added to `%% lab-made:` (.mmd, §6.2 fence and prose), lab ERD re-rendered. Exercise = aggregate fact (species × decade, unknown member, reconciles to 40,395) in DuckDB, so the module is PG + DuckDB without copying `star.sql` into browser blocks (DRY).
- S5: the loader is 24.9 MB (T5 estimated ≈ 18 MB; hex WKB doubles the shapes): `/learn/data/` is 33.7 MB before the sample, ≈ 45 MB after. Left to S15 (§4) to settle within the 50 MB cap; options in `out/loader/summary.md`.
- S24: g1–g6 all `ran` (18 blocks): the lab data allowed every one, so no `untested` outside g7 and the IUCN appendix. g5's EXPLAIN blocks `-- after: d3-analyze`, as d3's (R12); `g5-geography-index` creates an expression index inside the rolled-back block (an index, so nothing for `%% lab-made:`). No block creates a table.
- S24: g7 needs neither raster setting: checked in `critwire_dev` (rolled back, defaults `postgis.gdal_enabled_drivers = DISABLE_ALL`, `enable_outdb_rasters = off`), an in-db raster cast back from its hex text runs `ST_Clip`, `ST_ValueCount`, `ST_PixelAsCentroids` and `ST_Value`. L3's clips are in-db (`habitat_clips.rast`), so 003's `pg-once` grants are dropped: §1's 003 §4 row moves it to Dropped, §3.2's privileges line says none needed. `-- needs: raster` stays (raster library check).
- S24: g3's joins start from `country_shapes` (prepared outline, GiST on points): the same test from `occurrences LEFT JOIN` ran 6.9 s vs 0.27 s (25×), stated in g3 as a measured fact, not a result block. Found: Natural Earth's FR outline includes GF/RE/MQ, which have their own outlines, so 933 records sit in two (g3 teaches "outlines must be a partition").
- S24: IUCN appendix (003 §6 → g3, optional): one `untested` block reading `my_iucn.ranges`, a schema the learner makes (not `learn_…`: the loader's `DROP SCHEMA learn_curriculum` would wipe it, and lab rules are for schemas a lab creates; privilege lint checks only role/schema statements). Import named, not given as a fence (QGIS, `ogr2ogr` or `shp2pgsql`), since 003's fences stay in 003.
- S25: §5.4 = track intro + s1–s6, 24 blocks, 23 `ran`, no table created (no `%% lab-made:` or ERD change). s1: 2 browser (basis, one-dataset dominance) + 2 PostGIS (jaguar GPS vs rest; devil by dataset); GPS identified as `MACHINE_OBSERVATION` + title `ILIKE '%GPS%'` (one dataset). s2–s5 read the boot `s4_cells`/`s4_neighbours`; s2's NNI and DBSCAN use records inside the main island (1,784), KDE all 2,000 devil records. Found and taught: 1,109 of 1,784 devil records share coordinates (NNI 0 m); Gi\* gives no cold spot (787 of 1,094 cells empty, min z −1.29); the atlas's earliest devil record is dated 1599 (e4/L4 should flag impossible dates).
- S25: Gi\* SQL = esda `G_Local(star=True, transform="B")` to 6 decimals (99 hot, 39 after BH FDR, max z 10.632449); p-values via PG16's `erfc`. LISA/permutation blocks seeded (`seed=2026`; global `Moran` has no seed, so `np.random.seed(2026)`); two `--update` runs gave the same hashes. No numba: 999 permutations on 1,094 cells < 1 s.
- S25: k-nearest ties taught, not hidden: SQL ranks by distance rounded to 0.01 m, then id; PySAL's KDTree breaks the same 1,025 ties its own way, so one-way links differ (1,968 vs 600 at k = 4) while links and tied cells agree. Country contiguity: 76 islands by `ST_Intersects`, 84 by `ST_Touches` (12 simplified outlines overlap a neighbour).
- S25: s6 counts records GBIF codes `CR` that lie inside the outline in both engines (591; 2 other-coded records inside the outline would make SQL 593 vs GeoPandas 591). GeoPandas areas in EPSG:6933 agree with geography to 1 km². Effort normalization = species' share in zone ÷ its share overall (target group); the jaguar's 7.29 in the dry forests is s1's GPS collars.
- S26: §5.5 + §5.6 = track intros + e1–e5, p1–p4 outlines; 21 new blocks: 16 `ran` (e: 13 of 14; p: the 3 PostGIS checks) + `e1-submit` (`untested`: a real GBIF download per run, spike ran it) + 4 Power BI (`p1-fact-records` m, `p2/p3/p4` dax, inputs checked: 12 `-- input:` lines). e1's request from lab `species.gbif_id` = the spike's stored GBIF request as JSON (less creator/sendNotification); `e1-checksum` streams lab files from LEARN_BASE and checks manifest size + sha256. e2 uses 3 made-up SIMPLE_CSV records (real species keys incl. 2 synonyms) so the F10 trap is visible: text format silently changes all 3 (backslash lost, `\n` → line break, '' vs NULL swapped), csv form keeps them; typed TEMP table can't FK a lasting table (PG), so the species rule's NOT NULL stands in, said in 004. GeoPandas `to_postgis` via SQLAlchemy inside a rolled-back transaction (learn_curriculum unchanged, checked). e3-pick: one SQL text in DuckDB and PostgreSQL, identical result hash (4,766 records, md5 6e68cc75…). e4 flags found: 24,002 no uncertainty, 15,643 repeats, 297 > 100 km, 10 devil records dated 1599; devil + jaguar: 33 datasets, 29 CC BY. DAX written for DAX query view (`DEFINE MEASURE` + `EVALUATE`) so the owner's Windows check (§10) compares one table per module with its PostGIS twin; p3 on A2's 2-country habitat stand-ins (TT 0.698 records / 1,000 km² forest), said so.

## Log

- 2026-10-23 04:36 UTC: Baseline. typecheck pass, test 66/66, build 157 files (hashes = A2 baseline = live), e2e 20/20; learn_spatial readable only as critter-ai; no ensurepip/uv.
- 2026-10-23 05:20 UTC: Architecture. architect wrote F1–F9 + T1–T13: 33 modules (~68 h; f1–f4, d1–d6 in full), lab data at `/learn/data/` (GBIF download sample ≤ 2,000/species ≈ 46k rows, own DOI; NE 1:50m; simplified RESOLVE), psql-only loader, uv venv, Moran on 5 km hexes (Tasmanian devil), chain L1–L5 (~144–174 sessions). Read-only GBIF probes only; no code/data changed.
- 2026-10-23 05:05 UTC: Fable review. APPROVE_WITH_CHANGES; 3 MUST-FIX (T7a COPY csv/tab/QUOTE, T6 pg.ts changes, F3 GBIF default checklist wording), 3 missed, 5 should-consider. Plan only; no code.
- 2026-10-23 05:06 UTC: Astra review. APPROVE_WITH_CHANGES; 5 MUST-FIX (learn_curriculum search_path, country-key normalization, atomic reload, dataset citation propagation, standalone lab cleanup), 3 should-consider. Plan only.
- 2026-10-23 05:45 UTC: Revision. architect resolved all 8 MUST-FIX + 3 missed (F10–F13 new; F3 reworded; T5 atomic csv-format loader, country-key contract, dataset credits; T6 pg.ts learn_curriculum, cleanup lint, in-tx leak check); all SHOULD-CONSIDER adopted. Plan only; scratch TEMP tables rolled back.
- 2026-10-23 05:35 UTC: Steps. planner wrote S1–S30 (T14 u1–u27; big units split, §6/§7/§8 merged in), Verification V0–V11 + release smoke, Failure modes (test list + R1–R28). Plan only; verify scripts `bash -n` clean.
- 2026-10-23 05:58 UTC: S1. Spike scaffold from A2 (70 files, provenance.tsv; 21 edited, registry.ts deleted); spike typecheck + 97/97 tests; 004 skeleton, setup-counts sha256 a46604343811 (= 002); verify.sh ok; copy proof 002: 77 blocks, 0 failures, ERD match; parquet wasm 200 application/wasm, no spatial; canary + learn_spatial dump saved. Guard clean (66 tests, dist = baseline, canary same, no leaks, 585 MB).
- 2026-10-23 06:06 UTC: S2. uv 0.13.5 (sha256 ok) → venv CPython 3.12.3, 44 pins, `sync --no-build` + `pip check` clean, imports ok (`out/python-env/summary.md`); GBIF download 0041824-260928105237408 submitted with pinned legacy checklistKey (echoed), PREPARING, search count 394,532. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.41 GB); spike 97/97.
- 2026-10-23 06:20 UTC: S3. Python engine: `scripts/py-engine.ts` (isolated `-I`, empty cwd, 6-var env, process-group kill), python blocks in plan-queries/run-queries (`# after:` plan order, `--update` twice, log `python: 3.12.3 · uv 0.13.5 · requirements sha256 d5bbe28024cc`); PY1–PY10 13 tests red 13/13 then green; spike 110/110; 004 §0 `py-connect` + `py-smoke` ran (`--update` then `--check` ok, log has `-- result: py-smoke · python · sha256 f75ba856b9f7`). Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.41 GB).
- 2026-10-23 06:58 UTC: S4. `etl/shapes.py` → `data/learn/` (8.77 MB, 6 files; `out/lab-data/summary.md`): A2's country_shapes 50m + 2 habitat stand-ins copied (sha256 equal); NE admin-1 1:50m 294 rows, 9 countries, Tasmania one row (R24 not hit); RESOLVE 847 rows at 0.05° = 6.69 MB (0–0.02° over 8 MB; no R14 cut), Rock and Ice → NULL biome/realm; invalid kept (admin-1 1, eco 10); no code without a `countries` row; re-run byte-identical; nothing extracted; verify.sh step 4. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.57 GB); spike 110/110.
- 2026-10-23 07:21 UTC: S5. Loader `scripts/loader.ts` (+ `duckdb-node.ts`, `lab-ddl.sql`, `lab-keys.sql`; build-site publishes `data/learn/` + loader): 12 tables + view, one tx, csv COPY, WKB → MultiPolygon 4326, keys/GiST, raising DO; LD1–LD11 red 11/11 then green; spike 121/121; loader 24.9 MB, run twice as learner exit 0 (1.0 s each), equal rows, no outside pg_depend (`out/loader/summary.md`); verify.sh step 5; 004 `--check` ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.61 GB).
- 2026-10-23 07:51 UTC: S6. pg.ts → learn_curriculum (PG_SESSION = search_path, no schema created, raster check only for `-- needs: raster`, CREATEROLE check, statement log, runLoader via psql), canary.ts (+ `-v schema`), plan-queries `-- boot`/`-- needs`/raster lint/runNeeds, run-queries canary → loader → session → boot (committed) → canary after; PC/CN 12/12 red then green, fixtures 15/17 red then 17/17 (A2 RP back, adapted); spike 150/150; 004 §0 `pg-session` 791623fd72db + `pg-smoke` 7d3c1fc95318 (= S5 rows), `--update` then `--check` ok, log `canary: learn_spatial before = after`. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.61 GB).
- 2026-10-23 08:21 UTC: S7. `scripts/privilege.ts` (PV1–PV8, CL1–CL8, LEAK_SQL; PG9 skips it), `-- tx: own` (plan + runner: BEGIN probe, session restore, committed-leak cleanup message, canary + learn_curriculum readings), leak check before every PostGIS ROLLBACK/COMMIT (+ expect-error savepoint), dollar quotes in sql.ts; red 20/27 then 27/27; rp05 fixture rewritten to S7 rules; spike 170/170; copy proof 002 ok; 004 §0 `pg-role-smoke` fcfe7fd06dfa + `pg-tx-smoke` a90c4cf411fd, `--update` then `--check` ok (canary before = after). Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.61 GB).
- 2026-10-23 08:45 UTC: S8. Download 0041824-260928105237408 (DOI 10.15468/dl.fbpk9w; 16 min 41 s) fetched: 34.7 MB zip, sha256 = download.json, totalRecords 394,532 = search count, both checklistKeys echoed; `load` one tx (F10 COPY, 15 s) → occurrences_all 394,532, all 11 checks 0 (1st run failed on 4 synonym ids.gbif → speciesKey-else-taxonKey rule), md5 f88acde248d5 twice; 112 country codes, no ZZ/XZ/empty; `datasets` 454 + 233 publishers, all titled; 1 dataset two licenses, 11 CC BY-NC datasets → effective-license rule for S9; F10 measured (text COPY: 9 rows silently altered). `out/etl-postgis/summary.md`. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.64 GB); spike 170/170.
- 2026-10-23 09:28 UTC: S9. CK/SC tests red 18/18 then green (`tests_py/`); load refactor (species_for per key pair) md5 f88acde248d5 = S8; `sample` → 40,395 records (381,065 effective-open of 394,532; cap 2,000; 400 datasets, 71 species), parquet 0.62 MB, csv 4.59 MB, datasets.csv 400 rows; `etl/run.sh verify` offline ok (load ×2 + sha256), verify.sh step 7; schema v2 in setup.sql/engine/loader (generated geom + GiST), loader 29.6 MB run twice ok (14 tables); `--update` changed only setup-counts e3323c4c9cd8 + pg-smoke 444c9131da27, `--check` ok; boot 3.22 s, R16 not hit; 004 §A.1. site/learn/data 43.65 MB, data/learn 14.06 MB. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 170/170 + py 18/18.
- 2026-10-23 09:51 UTC: S10. MC1–MC6 red 15/15 then green (`tests_py/test_moran.py`; py 33/33); `scripts/block.ts`; 004 §5.4 `s4 · moran` (`s4-cells` boot 5 + 10 km hexes over Tasmania + `s4_neighbours`, `s4-geometry`, `s4-moran-sql`, `s4-moran-pysal`), `--update` added only the 4 s4 results, `--check` ok (10 blocks); `moran/run.sh` ok: gates pass, 6,246 pairs equal, I 0.273296 / E[I] / Var_norm / z 15.177858 equal to 6 dp, max |Δ| 1.06e-12; 10 km I 0.203588; z_rand 15.246590; MC7 recorded (`out/moran/`); verify.sh step 8; 004 §A.2. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 170/170 + py 33/33.
- 2026-10-23 10:25 UTC: S11. PB1–PB7 + ST1–ST5 red 13/13 (stubs) then green; spike 183/183 + py 33/33; `scripts/star.ts`, `scripts/credits.ts` (lab manifest via build-site, 10 files), m/dax in plan-queries/run-queries; 004 §5.2 `d6 · star` (8 `d6-star-*` blocks, ran in PostGIS) + §5.6 `p1-load` (m, 8 inputs) + §A.3; `star-export/run.sh` ok: 8 CSVs 4,576,053 B, PostGIS = DuckDB by value (7/8 byte-identical), keys/FK/unknown members/NA ok, 2nd run hashes the same; verify.sh step 9; `--update` added only the 8 d6 results, `--check` ok (18 blocks, 8 `-- input: p1-load … keys=ok`). Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.67 GB).
- 2026-10-23 10:58 UTC: S12. `plans/004-{learn,lab,star}-erd.mmd`; erd-model (`embedDrift` multi-ERD, EG1 base rule, `PG_META_SQL`, `markers`, `labDrift`, `starMeta`), run-queries `--lab-erd`/`--star-erd`; EG red 10/17 (stubs) then 18/18 with §6 test; spike 201/201 + py 33/33; 004 §6 (3 fences + dictionaries); `--check $ERDS` ok (18 blocks; v2 8 tables/9 lines, lab 15 tables (1 lab-made)/2 planned/17 lines, star 8/8); renders `erd/{schema,lab,star}.{svg,png}`, sha256 ok, no foreignObject; verify.sh step 3 takes ERDs, step 10 renders. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.67 GB).
- 2026-10-23 10:39 UTC: S13. 004 §0 (blocks/engines/statuses, every header, `learn_` rules, uncounted fences, re-run commands, results/log), §1 (002 §1–§10, 003 §1–§8 by kept/changed/dropped + D3 change), §B (10 disagreements); Superseded note atop 002 and 003 (+2 lines each, 0 deleted). Section-reference grep: all 18 found. `--check $ERDS` ok (18 blocks, 0 differences). Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.67 GB).
- 2026-10-23 11:01 UTC: S14. 004 §2 (33 modules, 7 tracks, 68 h; questions in full; awk: track/total hours = stated, every prereq earlier) + §3 (browser; PostGIS Docker/EDB powershell, PG* env, privileges; uv Windows/Linux, requirements.txt verbatim = spike file; arcpy notes; Power BI). Loader `client_encoding` UTF8 (LD12 red then green; spike 202/202 + py 33/33). `--update` added only `gpkg-export`; `--check $ERDS` ok (19 blocks; `pbi-smoke` input rows=251 keys=ok); loader ×2 ok. Pins resolve no-build for Win/Linux/macOS 14 arm64. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.67 GB).
- 2026-10-23 11:24 UTC: S15. 004 §4 (4.1 datasets table + shape notes + build steps; 4.2 GBIF sample: download API vs 003 D3, predicate, pinned checklistKey, 394,532 → 381,065 → 40,395, species/effective-license/cap, columns, country-key contract, dataset metadata, registration, committed files; 4.3 loader; 4.4 cap/budget; 4.5 credits; 4.6 CORS). Loader geometry hex → base64: 29,598,105 → 21,330,577 B, geometries identical, loads ×2 ok; LD2 red 7/12 then 12/12; budget ≈ 44–48 MB after L3 (hex ≈ 52–58). `--update` added only `lab-sizes` 792e5293a528 + `lab-credits` (0 rows); `--check $ERDS` ok (21 blocks); §4 numbers = summaries (102 checked). Spike 202/202 + py 33/33. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB).
- 2026-10-23 11:45 UTC: S16. 004 §5.1 intro + f1 select (skip: NOT LIKE drops NULL licenses, 10 rows; no-photo, `= NULL` 0, unknown logic, taxonomy, mammals via IN-subquery 50, page OFFSET; ex: missing outside ids 6) + f2 aggregate (skip >25 datasets 16; count/min/max 1599–2026, years, basis, CASE periods cross-tab, HAVING >500 22 (13 at the 2,000 cap), WHERE+HAVING 17, COUNT DISTINCT 400/2/106; ex: basis ≥1,000 5); all labels + dialects. `--update` added only the 18 f1/f2 results; `--check $ERDS` ok (38 blocks); module-part awk, headers, Red List grep ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 202/202 + py 33/33.
- 2026-10-23 12:10 UTC: S17. 004 f3 join (skip: South America species/records with zeros 14; Brazil list 12 = 002 l09 hash vs sample 14, EXCEPT 2 strays; anti joins 5 vs l11's 4 (hash = l11); ON vs WHERE 14 → 9; fan-out 40,000 rows; bbox (Albuquerque zoo outliers), Tasmania box 1,993, 10° bins; ex: Africa no records 11 via NOT EXISTS; NOT IN null) + f4 window (skip: best year share 16; top dataset per species 71 (Jaguar 97.4 % GPS collars); above-average subquery 21; row_number/rank/dense_rank 13 tied at the cap; years rank + share; Devil lag + running total; ex: top 3 per class 9); all labels + dialects; l07/l09/l11/l14/l15 mapping under Decisions. `--update` added only the 21 f3/f4 results; `--check $ERDS` ok (59 blocks); module-part awk, headers, Red List grep, results = log ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 202/202 + py ok.
- 2026-10-23 12:22 UTC: S18. 004 §5.2 intro + d1 keys (concept: entities, candidate/natural/surrogate keys, UNIQUE NULLs, FK checks and limits, CHECK passes unknown, generated columns; worked: l07 re-run hash = 002, same id/same gbif_id refused, missing outside ids 3/7/0/2/1, 4 synonyms; lab: CHECK month 13 refused, NULL month+country accepted, taxa CHECK, FK genus; PG: FK delete refused, AU at Brasília accepted (point in BR), FK index false ×3, generated read/write refused, identity + UNIQUE twice refused; ex: species_photos 74/74/10 + 3 refusals); `field_notes` lab-made. `--update` added only the 20 d1 results; `--check $ERDS` ok (79 blocks); module-part awk, headers, Red List grep, results = log ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 202/202 + py ok.
- 2026-10-24 17:06 UTC: S19. 004 §5.2 d2 normalize (concept: FDs (stated, refuted never proven), update/delete/insert anomalies, 1NF/2NF/3NF + BCNF note, lossless split, nested vs tables, denormalizing; worked: l14 list/unnest/repeat + l15 provenance re-run, hashes = 002; `sources` PK holds source → license (5 sources, 69–76 copies in file); lab: dataset → license 0 violations in sample (full download: iNaturalist), museum CC0 vs 4 CC BY records, `records_flat` 40,395/400/398/217, 2 shared titles, update anomaly 3+1, delete anomaly 316 of 400; ex: 3NF split 71/400/40,395, lost 0 added 0 + second title refused); all labels + dialects. `--check $ERDS` ok (93 blocks, 0 differences); headers, module parts, results = log, Red List grep ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 202/202.
- 2026-10-24 17:47 UTC: S20. 004 §5.2 d3 indexes (concept: pages, seq scan, planner + statistics, B-tree and column order, Index/Bitmap/Index Only scans, pg_stats + ANALYZE sample + independence, GiST box filter, BRIN ranges + correlation, EXPLAIN options, index costs; worked: pangolin 9 rows Seq Scan (40,386 removed) → B-tree 6 heap pages; lab: year ≥ 2000 72 % Seq Scan vs ≥ 2026 Index Scan 74, `year / 10` Seq vs BETWEEN Index, slug join Hash Join → Nested Loop, (species_id, year) both 182 rows / year alone 107 rows whole-index bitmap, pg_stats, MCV estimate = actual, independence 230 vs 1,998 → extended stats 1,998, GiST Nepal 206 box → 184, DWithin 186 via box vs ST_Distance full scan, BRIN 512 lossy pages vs 128 on sorted copy, 6656/304/24 kB; ex: (species_id, year, id) Limit + Index Scan Backward 20 rows); all labels + dialects. Runner: EXPLAIN rows need no ORDER BY (rp12-explain red then green; spike 203/203). `--update` added only the 24 d3 results; `--check $ERDS` twice ok (117 blocks, result lines equal); headers, module parts, results = log, Red List grep ok; lab ERD re-rendered. Guard clean (66 tests, dist = baseline, canary same, no leaks, 1.66 GB).
- 2026-10-24 18:10 UTC: S21. 004 §5.2 d4 transactions (concept: ACID, autocommit vs statement atomicity, aborted tx, savepoints + ON_ERROR_ROLLBACK, MVCC xmin/xmax + VACUUM, isolation levels + 40001 retry, lock modes + deadlock + lock_timeout, 3 re-runnable load patterns incl. the loader; worked: autocommit load leaves 1,858 + re-run duplicate, one tx aborted (SELECT refused) → nothing left, replace-in-one-tx run twice 1,959 rows / 1 xmin; lab: savepoint 1,858 + 101, whole lab 1 xmin over 43,844 versions, UPDATE new version = this tx, RowExclusive vs AccessExclusive, two-session wait + RR/RC (untested, run by hand), feed 1,816, plain re-run refused, DO NOTHING +42, DO UPDATE 42/1,320 (496 untouched), no arbiter + twice-in-batch errors; ex: devil + jaguar upsert logged twice 2,137/1,320 then 0/0, 3,953 rows); all labels + dialects. Runner `-- fails:` + last-rows result (TX4–TX6 red then green; spike 204/204 + py ok). `--update` added only the 14 d4 results; `--check $ERDS` ok (131 blocks); labels, Red List grep ok; lab ERD re-rendered. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB).
- 2026-10-24 18:29 UTC: S22. 004 §5.2 d5 roles (concept: roles/LOGIN/server-wide, membership + INHERIT/SET ROLE, owners, privilege levels + column grants, PUBLIC defaults, schemas + search_path shadowing, default privileges per creator, least privilege, DROP OWNED/REASSIGN OWNED, RLS USING/WITH CHECK/default deny/owner bypass/FORCE; PG16 createrole_self_grant; worked: learn_reporting group + learn_powerbi login reads 40,395/71, UPDATE + CREATE refused; lab: privileges 13 rows (PUBLIC gives CONNECT/TEMP/public/functions), untested REVOKE CONNECT, defaults 1 true/2 false/3 true, DROP ROLE refused then DROP OWNED, RLS owner 40,395/BR 5,033/AU 4,636/none 0; ex: devil dashboard 2,000/1/76 + datasets and UPDATE refused); all labels + dialects; §0/§3.2 CREATEROLE fixed. CL9 red then green (spike 205/205). `--update` added only the 6 d5 results; `--check $ERDS` ok (137 blocks); results = log, headers, d5 module parts, Red List grep ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB).
- 2026-10-24 18:50 UTC: S23. 004 §5.2 d6 star (concept: facts/dims, grain first, additive/semi/non-additive, flat dims, star vs snowflake, surrogate keys, unknown members, degenerate dims + factless facts, conformed dims + drill across, SCD 0/1/2/3, export; worked: grain = one sample record, the 8 `d6-star-*` blocks unchanged + report class × continent since 2000 18 rows; lab: star = snowflake by class 4,776/31,905/3,714, drill across TT 2 records vs 44 fan-out (AX lost), made-up XZ record kept as ZZ (40,396 vs 40,395 joined), SCD1 9 records under new name, SCD2 13/19 pangolin records as *Manis*, DuckDB COPY TO + read back 250; ex: browser aggregate fact 645 rows reconciles 40,395, 2,289 unknown decade); all labels + dialects. `--update` added only the 9 new d6 results; `--check $ERDS` ok (146 blocks); `star-export/run.sh` ok (hashes = manifest); lab ERD re-rendered; module parts, headers, Red List grep ok. Guard clean (66 tests, dist = baseline, canary same, no leaks/cred, 1.66 GB); spike 205/205 + py ok.
- 2026-10-24 19:25 UTC: S24. 004 §5.3 GIS in SQL: track intro + g1–g7 outlines (Goal, Data, Key code, Expected), 22 blocks: g1 area 3 ways for 9 AU states (Mercator 1.13–1.81 = 1/cos², Tas 67,697 km²) + Hobart–Launceston 160.72 km; g2 WKB/EWKT, bow-tie area 0 → 2, 11 invalid shapes (1 admin-1, 10 ecoregions), MakeValid ≤ 0.4 km²; g3 Contains/Covers/Intersects, 39,190 agree / 206 disagree / 999 no outline, US→MX 78 top pair, 933 in FR + overseas outline, IUCN appendix untested; g4 7 ecoregions in CR, pieces 49,908 of 51,303 km², 2,070 in none; borders NI 267/PA 250 km; g5 KNN plan, geography cast seq scan (40,340 removed) → expression index, 999 by distance to nearest outline; g6 MAUP 5/10/10-shifted km (top cell 256/475/310); g7 3 blocks `untested: L3 builds the clips`, no raster settings needed (§1, §3.2 fixed). `--update` then `--check $ERDS`: 164 blocks, 0 failures. Guard: scope plans/ only, typecheck + 66 tests, dist = baseline, canary same, no leak, spike 1.66 GB, ports free, no credential. Spike green: typecheck, 205/205, py 33 OK.
- 2026-10-24 19:47 UTC: S25. 004 §5.4 Spatial statistics: track intro + s1–s6 outlines (Goal, Data, Key code, Expected), 19 new blocks (+ s4's 4): s1 basis (human obs 43.5 %), dominance (17 of 38 species > half from one dataset), jaguar 1,948/2,000 GPS collars (97.4 %), devil 70.7 % atlas + 27.9 % museum material samples; s2 VMR 64.2/139.0, NNI R 0.329 (1,109 zero distances) / 0.548 distinct, DBSCAN 10 clusters, KDE peak 2.12/km²; s3 band = queen (6,246 links), KNN ties 1,025, one-way SQL 1,968 vs PySAL 600, 76 island countries; s4 + permutations p 0.001, z_sim 15.07; s5 Gi* SQL = PySAL 99 hot → 39 FDR, 0 cold; LISA HH 68 → 16; s6 CR ecoregion zones PostGIS = GeoPandas (504 in zones), χ² 77.4 p 1.2e-14, jaguar 7.29× in dry forest; s6-habitat untested (L3). `--update` changed only new s* results; `--check $ERDS` 183 blocks, 0 failures; moran/run.sh ok. Guard: scope plans/ only, typecheck + 66 tests, dist = baseline, canary same, no leak, spike 1.66 GB, ports free, no credential. Spike green: typecheck, 205/205, py 33 OK.
- 2026-10-24 20:16 UTC: S26. 004 §5.5 ETL (intro + e1 extract: search vs download API, pacing/retries/no POST retry, pinned checklistKey (GBIF's documented default quoted), request = spike's, submit/wait/fetch untested, checksum fetch vs manifest; e2: staging/COPY/typed/one tx, F10 text vs csv on 3 made-up records (text changes all 3), synonyms 1 of 3 by speciesKey, GeoPandas 2,000 points → 3577 buffers rolled back; e3: md5 pick same hash in DuckDB + PG, append 4,000 vs idempotent 2,000 + skip + corrected run, critwire case study; e4: 10 SQL checks (rejects 0; flags 24,002/15,643/297/10), credits 33 datasets (29 CC BY), derived-dataset body; e5: refresh job (400 rows then skip), cron/systemd/Task Scheduler) + §5.6 Power BI (intro + p1 around p1-load + fact_records query; p2 relationships + measures, continents 7 rows; p3 forest ratio TT 0.698; p4 Azure Maps, honest title, 7 of 9 devil datasets to credit). `--update` added only the 16 new results; `--check $ERDS` 199 blocks, 0 failures; 12 new `-- input:` lines keys=ok; COPY_STAGING lines grep -F found; 9 outlines × 4 labels; Red List + vault greps ok. Guard: scope plans/ only, typecheck + 66 tests, dist = baseline, canary same, no leak, spike 1.66 GB, ports free, no credential. Spike green: typecheck, 205/205, py OK.

## Summary
