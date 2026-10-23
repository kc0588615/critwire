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

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

## Summary
