---
mission: critwire-learn-spatial-design
project: critwire
branch: agent/critwire-learn-spatial-design
status: active
started: 2026-10-22 15:55 UTC
---

# Mission: critwire learn, growing the data and the spatial track (mission A2)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-22-critwire-learn-spatial-design.md
     Start: started automatically by the queue after mission A1 (critwire-learn-design) has merged and released;
     base: main, which then contains A1's plans/002-learn.md.
     Owner's choices (control room, 2026-10-22):
     - research in two missions; this is the second
     - the database will grow, so research what to add
     - an ERD of the grown schema
     - advanced lessons in spatial SQL with PostGIS, using the owner's worldwide habitat raster (COG)
     - the owner asked whether critwire could host IUCN range files for education; critwire's no-IUCN rule stays, and this
       mission says what IUCN's terms allow
     Split out of A1 on the Fable reviewer's advice (2026-10-22); its must-fix items for this part are folded in. -->

### Goal

Extend the critwire Learn design with **what data to add next** and **an advanced spatial track**. Write it in `plans/003-learn-data-spatial.md`, built on A1's `plans/002-learn.md` (engine, learners' schema, ERD, core lessons). This mission **researches and designs; it builds nothing public**. It ends with ready-to-start briefs for the build missions, so the owner can run them next.

**First, read `plans/002-learn.md`.** Its engine choice, schema names and ERD are fixed inputs here. If that file is missing from `main`, A1 hasn't merged: add a handoff item and finish with `MISSION_BLOCKED: A1's plans/002-learn.md missing`.

#### What goes in `plans/003-learn-data-spatial.md`

1. **Growing the data.** A ranked list of datasets critwire could add. For each give:
   - what it adds
   - which lessons or games it enables
   - its **license, checked at the source and quoted, with the URL**
   - its size
   - how it joins to the learners' schema (keys)
   - the work to ingest it

   Cover at least:
   - Natural Earth (countries are in A1's design; what else is useful: admin-1 regions, physical features)
   - RESOLVE Ecoregions 2017
   - the global habitat map (Jung et al. 2020, below)
   - trait datasets, each licence unknown until checked. Known so far:
     - AnAge: CC BY 3.0
     - AmphiBIO: CC BY 4.0
     - EltonTraits and PanTHERIA: no licence shown on esapubs.org
     - COMBINE: not yet found

     Find a reptile trait source too (11 of the animals are reptiles).
   - Wikidata (common names in other languages, and more)
   - Open Tree of Life (phylogeny)
   - GBIF occurrence points for the 76 species (CC0/CC BY only)
   - climate (WorldClim or CHELSA)
   - protected areas (WDPA)

   Flag every license that blocks hosting or serving. Recommend what to add first, and why.
2. **The grown schema and its ERD (required).**
   - The tables the recommended datasets add, joined to A1's first schema without renaming it. Give columns, keys and cardinality.
   - The ERD source goes in the repo, in the same text format and rendering approach A1 chose.
3. **Lessons for the grown data.** About 4–8 more lessons the new tables enable, in the same format as A1's lessons. For example:
   - a traits table and its units
   - comparing classes
   - a self-join on the phylogeny
   - many-to-many with habitats or ecoregions

   Mark which run on today's data (none, unless a spike table stands in) and which wait for the data.
4. **The advanced spatial track.** About 6–10 lessons on spatial SQL. The topics:
   - points, polygons and coordinate systems
   - `ST_Contains` and `ST_Intersects`
   - area and distance
   - spatial joins
   - **raster basics:** reading a value at a point, and zonal statistics (summarizing the raster cells inside a polygon), using the habitat raster
   - **why projection matters:** the owner's COG is in Web Mercator, which distorts area

   For each lesson, say **where it runs**, backed by the spike:
   - in the browser, with the engine A1 chose (for DuckDB, the self-hosted `spatial` extension) or a GeoTIFF reader for COGs over HTTP range requests
   - or in the learner's own PostGIS, with critwire supplying the data and setup steps

   Write the SQL in PostGIS-style `ST_` functions, and note where DuckDB `spatial` differs.
5. **The habitat raster.** Cover:
   - which Jung version and level the owner's COG is (from the class codes in the band), and the credit it needs
   - whether lessons read the COG directly, a smaller clip or overview, or per-species and per-country summaries computed at build time
   - what each option costs in disk, bandwidth and work
   - what runs well on a Chromebook
   - **browser access, as the owner's choice** (section 8). Today the bucket sends no CORS headers, so browsers can't read it. The options:
     - (a) the owner adds a CORS rule to the bucket (a few lines in S3; egress is billed to the owner's AWS)
     - (b) critwire hosts a copy or a clip (the VPS has about 24 GB free)
     - (c) precomputed summaries only
     - (d) the owner's TiTiler deployment, if it sends CORS
6. **IUCN.** The owner has downloaded IUCN's spatial files (range polygons) and asked whether critwire could host some for education. critwire's rule (`AGENTS.md`, `plans/001-mvp.md`) is: never store, cache, proxy or serve IUCN data. That rule stays. This section must:
   - Quote the current IUCN Red List terms of use and the spatial-data terms.
     - iucnredlist.org returns 403 (Cloudflare) to the VPS. Quote from `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/iucn-terms-of-use-*.html` or `.pdf` if the owner saved a copy there.
     - Otherwise, try the live page and the Wayback snapshot `20261015190206`.
     - If none can be read, mark the quotes **unverified**, add a handoff item asking the owner for a saved copy (`Blocks: nothing`), and carry on.

     Say exactly what the terms allow for these four cases:
     - hosting the files
     - serving products derived from them
     - classroom or educational use
     - a learner downloading the files with their own free IUCN account and using them locally
   - Design the lessons that could use IUCN ranges **only in the learner's own PostGIS, with the learner's own download**. critwire supplies the lesson and scripts, never the data.
   - Draft a short permission request to IUCN for an educational exception, for the owner to send if they choose.
   - Keep the habitat map separate. Jung et al. 2020 maps IUCN's habitat *classes* but isn't Red List data, and it's CC BY 4.0.
7. **The build missions.** Ready-to-start briefs in `plans/`, in the ops brief format (Goal, Why, Scope, Definition of done, Decision rules, Notes), each sized to finish well within 60 sessions:
   - **mission C:** ingest the top datasets from section 1, with the new `/v1` files, attribution, and the grown-data lessons
   - **mission D:** the spatial track

   Each starts from `main` after mission B has merged. Say what each assumes B delivered.
8. **For the owner.** Choices only the owner can make, each with a recommendation and its cost, including:
   - which datasets to add first
   - how browsers reach the raster (section 5)
   - whether to send the IUCN request

#### The spatial spike, recorded

Show:
- **Point-in-polygon in the browser:** one point-in-polygon query in A1's engine, self-hosted, for example a GBIF point inside a Natural Earth country.
- **A server-side raster read:** the habitat value at a point, read on the VPS from the owner's COG by PostGIS out-of-db. Set it up like this:
  - `CREATE EXTENSION postgis_raster` in `critwire_dev` (it's available but not installed)
  - each session: `SET postgis.enable_outdb_rasters = on; SET postgis.gdal_enabled_drivers = 'GTiff COG';`
  - an out-db band on `/vsicurl/https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif`
- **Zonal statistics:** habitat cell counts inside one small polygon, read the same way. Compare the area in Web Mercator with the area after reprojecting.
- **A browser raster read:** a small COG clip of one region. Cut it with `ST_AsGDALRaster(ST_Clip(...), 'COG')`, not geotiff.js's writer (beta and uncompressed). Serve it from the spike's Caddy and read it with geotiff.js (`fromUrl`, `getImage(i)`, `readRasters({window})`).

The VPS has no GDAL command-line tools and no rasterio, only the GDAL library PostGIS uses. **No apt installs**; if a package is unavoidable, add a handoff item. Record what worked, the bytes read and the time. Never download the whole file.

How the spike runs:
- **Folder:** `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/`. Keep it under 2 GB, with clips and extracts only, never in the repo.
- **Packages:** any npm or pip package goes in the spike folder's own `package.json` or venv, never the repo's.
- **Server:** serve files from a copy of `e2e/Caddyfile` in the spike folder on `127.0.0.1:3102`. Never run it while `pnpm e2e` runs.

### Why

The owner wants critwire Learn to grow with the data, from the first SQL lessons to real spatial analysis with a worldwide habitat map, and to show students how real biodiversity data is licensed and combined. Licenses decide what critwire can publish, so every dataset's terms must be checked at the source.

### Scope

In:
- `plans/003-learn-data-spatial.md`, the grown-schema ERD source under `plans/`, the briefs for missions C and D under `plans/`, and the plan file.
- The spike, clips and measurements in the spike folder.
- Reading the web; downloading pinned packages and small open-data extracts for the spike.
- `CREATE EXTENSION postgis_raster` and scratch tables in `critwire_dev`.

Out:
- **Nothing public changes.** No new or changed files under `scripts/`, `site/`, `e2e/`, `data/` or `db/`, and no `package.json` or lockfile changes. `plans/002-learn.md` stays as A1 left it; record disagreements in `plans/003-learn-data-spatial.md`. `pnpm build` must produce the same `dist/` as `main`. The release at the end merges the plan files only.
- `/srv/apps/critwire`, `/etc/caddy`, `/srv/critter-ai/ops`, and apt packages. Never connect to the `critwire` database, except through `deploy critwire` at the release.
- **No IUCN data** of any kind: not in the repo, the spike or the database. That covers range polygons, categories and assessments. No Wikipedia prose.
- The owner's S3 bucket: read it only. Never change it, and never ask for AWS keys.

### Definition of done

- `pnpm typecheck` and `pnpm test` pass.
- **`dist/` is unchanged:**
  - At Baseline, save to the spike folder the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`, and of the live `/v1` files.
  - The final Verification compares the branch's build against that list.
  - The release smoke compares the live files after `deploy` against it. Any difference fails.
- **Every SQL statement in `plans/003-learn-data-spatial.md` is accounted for.**
  - Every ```` ```sql ```` block starts with `-- q: <id>` and `-- status: ran | spike-table | untested: <reason>`.
  - `spike/run-queries.ts` (reuse A1's if it fits) runs the `ran` and `spike-table` blocks and writes `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/queries.log`.
  - Each recorded result matches the log, and Verification re-runs the script.
- The grown-schema ERD exists as a text source in the repo and renders to SVG; put the SVG in the spike folder.
- Every dataset in section 1 has its license quoted from the source, with the URL.
- The spike's evidence goes in the spike folder: what worked, bytes, times, screenshots, and the commands to reproduce them.
- The plan's Summary gives:
  - the top three datasets to add, with licenses
  - where each spatial lesson runs
  - the raster recommendation
  - what IUCN's terms allow, and whether the quotes are verified
  - the paths of the mission C and D briefs
  - the owner's choices from section 8

### Decision rules

- **Simplest approach that works** (`AGENTS.md`), with no server process: critwire stays static files.
- **Licenses decide what critwire can host.** If a source's terms are unclear, treat it as not hostable and say so.
- **Self-host everything** the browser lessons need, as A1 decided.
- **Write for people aged 16 and up.** Spatial lessons can assume the core path is done. Be honest about the data: countries and occurrence points are records, not native range.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public belongs to the owner: put it in section 8 with a recommendation. Add a handoff item only if the mission can't finish without an answer.

### Notes

- **Data today:** see A1's Notes in its brief (`briefs/2026-10-22-critwire-learn-design.md`) and `plans/002-learn.md`. In short: 76 species (50 mammals, 15 amphibians, 11 reptiles), 107 country codes, no traits; `ids.gbif`, `ids.col`, `ids.wikidata`, `ids.inaturalist` and `ids.ncbi` give the join keys to outside data.
- **On the VPS:** Postgres 16 with PostGIS 3.4.2. `postgis_raster` is available but not installed in `critwire_dev`. PostGIS 3.5-only functions aren't available. Playwright 1.58.2 Chromium runs headless (ARM64). Disk: about 24 GB free.
- **Browser engines' spatial support** (Fable review, 2026-10-22; confirm in the spike):
  - **DuckDB-WASM extensions** self-host as a mirror (`<repo>/duckdb-wasm/$duckdb_version_hash/$duckdb_platform/<name>.duckdb_extension.wasm`, served with CORS; https://duckdb.org/docs/2.0/clients/wasm/extensions.html).
  - **PGlite 0.4** ships PostGIS as `@electric-sql/pglite-postgis`. It's 18.8 MB and experimental: no C++ exceptions (`ST_IsValid` on an open polygon returns nothing), no `ST_AsMVT`, and no raster. See https://pglite.dev/extensions/ and https://github.com/electric-sql/pglite/issues/916.
- **The habitat map:** Jung, M. et al. (2020), "A global map of terrestrial habitat types", *Scientific Data* 7:256. Zenodo record 4058819, version 004, CC BY 4.0. Cite the paper and state the version. The download is 7.0 GB of zips:
  - composites at about 100 m: level 1 is 1.8 GB, level 2 is 2.5 GB
  - fractional layers at 1 km: level 1 is 488 MB, level 2 is 696 MB
- **The owner's COG:** `https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif`.
  - 3.64 GB, one `uint16` band, **EPSG:3857 (Web Mercator)**, worldwide, 388,996 × 388,996 pixels, overviews from 2 to 1024.
  - Made for Critter Connect's globe and unused there now.
  - **Checked 2026-10-22:** `Range` works (206), but S3 sends **no CORS headers** (a preflight from `https://critwire.com` gets 403).
  - Critter Connect has a TiTiler deployment for it (`NEXT_PUBLIC_TITILER_BASE_URL` in phaser-june's env; `plans/040-more-animals-per-place.md`), with `/cog/info` working. Check its CORS before relying on it.
- **IUCN:** critwire stores only `ids.iucn` (the SIS taxon id). IUCN's species range data is free for non-commercial use (ScienceBase mirror). The Red List of Ecosystems terms (https://iucnrle.org/terms-of-use, section 4) prohibit "All forms of reposting ... or other forms of redistribution". Confirm the species Red List's own terms; don't assume them.
- **Licences checked by the review:**
  - Natural Earth: "All versions of Natural Earth raster + vector map data found on this website are in the public domain."
  - RESOLVE Ecoregions 2017: "Licensed under CC-BY 4.0" (https://ecoregions.appspot.com/).
- **Release:** critwire missions merge and deploy themselves at the end (`MISSION_RELEASE=deploy`). Here the merge carries only plan files, so the deploy republishes the same `dist/`.

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
