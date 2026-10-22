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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-22, worktree HEAD `222d265` (= `origin/main` `d6eeffb` + this plan; `git diff --stat origin/main HEAD` touches only this plan, so its build is `main`'s build). Spike folder `<spike>` = `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/`.
- A1's `plans/002-learn.md` present on `main` (and `plans/002-learn-erd.mmd`): mission not blocked.
- `pnpm install --frozen-lockfile`: up to date. No lint script and no migrations: `pnpm build` rebuilds the schema in `critwire_dev` each run.
- `pnpm typecheck`: pass. `pnpm test`: 66/66 pass.
- `pnpm build` (after `rm -rf dist`): pass, 157 files in `dist/`.
- `E2E_ARTIFACTS=/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/baseline-e2e pnpm e2e`: 20/20 pass (report `baseline-e2e/playwright-report/`); no test Caddy left running.
- **dist hashes** (Definition of done): `<spike>/baseline/dist.sha256` (157 files, `sha256sum` from inside `dist/`). Live files fetched from https://critwire.com into `<spike>/baseline/live/`, hashed in `<spike>/baseline/live.sha256`: identical to `dist.sha256`, and identical to A1's baseline list.
- Reproduce: `rm -rf dist && pnpm build && (cd dist && find . -type f | sort | xargs sha256sum) | diff - <spike>/baseline/dist.sha256`.
- Data facts confirmed from `data/species.json`: 76 species (Mammalia 50, Amphibia 15, Reptilia 11), 107 distinct country codes.
- `critwire_dev`: `postgis` 3.4.2 installed; `postgis_raster` 3.4.2 available, not installed. Disk: 24 GB free.
- No saved IUCN terms copy (`iucn-terms-of-use-*`) in the mission state folder yet; section 6 tries the live page and Wayback.

## Architecture

Architect, 2026-10-22. A2 builds nothing public; the "code in scope" is A1's design (`plans/002-learn.md`, `plans/002-learn-erd.mmd`), A1's spike (`<a1>` = `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`, read only), the repo's build and `critwire_dev`, and the outside sources. Each finding was checked today (2026-10-22, 16:00–16:20 UTC) with the command or URL given; scratch output went to `/tmp/a2arch/` only. **(S)** marks a fact the spike must still confirm. `<spike>` = `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/`.

**One database change made here:** `CREATE EXTENSION postgis_raster` in `critwire_dev`, as `critter-ai` (superuser), about 16:02 UTC. It stays installed (the spike needs it; Baseline's "not installed" is now stale). `pnpm build` only drops `public.species` (F11), so the build is unaffected; Step 1's guard re-proves it.

**Revised 2026-10-22 ~16:45 UTC** (the one revision round; see Revision notes). New live checks: GUC behaviour and `GRANT SET ON PARAMETER` (F1, the grant only inside a rolled-back transaction with a throwaway role: `pg_roles` and `pg_parameter_acl` show nothing left), COG overview byte totals (F2), Zenodo v004 files and zip layouts (F3), postgres file access (F12). Scratch output in `/tmp/a2arch/` only.

### Findings (ranked by impact)

**F1. PostGIS reads the owner's COG out-db over `/vsicurl` today, but only in a superuser session.**
- `postgis_full_version()`: PostGIS 3.4.2, GDAL 3.8.4 (2024-02-08), PROJ 9.4.0; `libgdal.so.34` links libcurl, libdeflate, libzstd, libLerc (`ldd /lib/aarch64-linux-gnu/libgdal.so.34`).
- `pg_settings`: `postgis.enable_outdb_rasters` and `postgis.gdal_enabled_drivers` have context **`superuser`** (default `off` / `DISABLE_ALL`); `postgis.gdal_vsi_options` is `user`. The `.env` role `critwire` has `rolsuper = f`, so the brief's per-session `SET`s fail for it. `psql -d critwire_dev` as `critter-ai` is a superuser (peer auth).
- `'GTiff COG'` alone is enough: `ST_GDALDrivers()` then lists only COG and GTiff (read/write), and the out-db read below (1405, 621 ms), `ST_Transform(rast, 6933, 'NearestNeighbor')`, `ST_AsGDALRaster(…, 'COG', …)` and `ST_FromGDALRaster(bytea)` all work (rechecked in the revision). VRT and MEM aren't enabled anywhere.
- **The `SET`s can fail silently** (fail-fast gap):
  - As a non-superuser, a `SET` before `rtpostgis` loads succeeds as a placeholder and is dropped when it loads (`SHOW` → `off`); after it loads, `SET` gives "permission denied" (Fable, as role `critwire`).
  - As superuser, a misspelt `SET postgis.enable_outdb_raster = on` succeeds silently even after the library loaded (checked): PostGIS doesn't reserve its GUC prefix.
  - So `SHOW` is the only proof. Every PostGIS session (spike, ingest, learner) runs the **capability check**: `SELECT postgis_raster_lib_version()` first (loads the library), then the two `SET`s, then assert `SHOW postgis.enable_outdb_rasters` = `on` and `SHOW postgis.gdal_enabled_drivers` contains the word `COG`. Anything else stops the run before any query.
- **`GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers TO <role>`** (PG 15+) works on this PG 16: an ordinary role is refused without it and can `SET` both with it (checked in a rolled-back transaction). It's narrower than superuser or `ALTER DATABASE … SET`.
- Proof: a 1×1 `ST_MakeEmptyRaster` aligned to the COG grid at (−60, −3) (col 129665, row 197741), plus `ST_AddBand(rast, '/vsicurl/https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif', ARRAY[1], 1, 0)`, gives `ST_Value` = **1405** (both by cell and by point), `16BUI`, `isoutdb = t`, in 497 ms. TiTiler's `/cog/point/-60.0,-3.0` returns `[1405.0]` too (F7).
- There is no `raster2pgsql` (`/usr/lib/postgresql/16/bin` has none) and no `gdalinfo`, so out-db windows are built in SQL: an empty raster aligned to the grid, then the out-db band. PostGIS then reads only that window (S: confirm by bytes for larger windows).
- **Fix:** the spike's PostGIS connection is `critter-ai` over the Unix socket (`SPIKE_PG_URL=postgresql:///critwire_dev`, set in the spike README; never `.env`'s `DATABASE_URL`), and it works in its own schema (F11). It runs the capability check on connect. It never runs `ALTER ROLE`, `ALTER DATABASE` or `GRANT`. Lessons that run in a learner's own PostGIS give, in this order: a one-time `GRANT SET ON PARAMETER … TO <their role>` run by their server's superuser (recommended); otherwise a superuser session or `ALTER DATABASE … SET`. They say why the settings are guarded (they let GDAL read server files and the network) and why the setup block checks `SHOW` (a mistyped or refused setting otherwise fails silently).

**F2. The owner's COG, from its header** (bytes 0–262143, 206 in 0.26 s, parsed with a stdlib TIFF reader):
- BigTIFF written by GDAL's COG driver: the ghost area says `LAYOUT=IFDS_BEFORE_DATA`, `BLOCK_ORDER=ROW_MAJOR`, `BLOCK_LEADER=SIZE_AS_UINT4`.
- 388,996 × 388,996 px, one band, uint16, nodata `0`, 512 × 512 tiles, DEFLATE (Compression 8), no predictor.
- EPSG:3857 (GeoKey ProjectedCSType 3857, PixelIsArea). Pixel 103.02166779498629 m; origin (−20037508.342789244, 20037508.342789248).
- 10 overviews (÷2 … ÷1024). The smallest (380 × 380) is one 33,783-byte tile at offset 9,246,388. GDAL metadata: `OVR_RESAMPLING_ALG=NEAREST`, so overview pixels are real class codes, not averages.
- The file is 3,640,482,547 bytes, Last-Modified 2025-11-26, ETag `"975827817c839f73a5ee49d2791393a4-212"`.
- **The tile index is big:** IFD 0's TileOffsets (577,600 × 8 B = 4.62 MB at offset 4,008) and TileByteCounts (577,600 × 4 B = 2.31 MB at 4,624,808) sit in the first 9.25 MB. A reader that loads IFD 0's index whole pays about 6.9 MB before its first full-resolution pixel. GDAL reads it lazily; geotiff.js (S). This decides what option (a) costs per learner (§5).
- One cold one-pixel read through PostGIS took 91,196 bytes over TLS (F6), of which the pixel's tile (index 293,613) is 43,789 bytes.
- **Bytes per level** (revision: Range reads of IFD 1–9's TileByteCounts, 867,180 B; ETag unchanged). Pixel = ground size at the equator; at latitude φ it's × cos φ.

  | level | px per side | pixel | cells | tile bytes |
  |---|---|---|---|---|
  | full | 388,996 | 103 m | 151.3 G | ≈ 2,248,510,943 (file − overviews − 9,246,388 header) |
  | ÷4 | 97,249 | 412 m | 9.46 G | 312,223,541 |
  | ÷8 | 48,625 | 824 m | 2.36 G | 97,241,594 |
  | ÷16 | 24,313 | 1.65 km | 591 M | 30,062,515 |
  | ÷32 | 12,157 | 3.30 km | 148 M | 9,399,182 |
  | ÷1024 | 380 | 105 km | 144 k | 33,783 |

  The ÷2 level is 929,337,498 B; ÷64 to ÷512 together are 4,427,103 B.

**F3. The COG is Jung's level 2, with marine classes. Its version is still open, and the version decides the license.**
- The ÷1024 overview (one tile) has 56 distinct values: nodata 0 (67 px); level-2 codes 101, 104–109, 201–202, 301–308, 401–407, 501–503, 505, 507, 510, 511, 513, 515, 801–803, 908–909, 1101–1105 and 1401–1405; plus 100, 300, 400, 500, 600, 900 and 1200.
- Most common: 1102 (51,850 px), 803 (32,470: cold desert, which is mostly Antarctica, blown up by Mercator; a ready-made projection lesson) and 900 (19,989).
- Zenodo concept 3666245, from `https://zenodo.org/api/records/4058819/versions`:

  | version | date | license | lvl2 composite zip | code zip |
  |---|---|---|---|---|
  | 001, 001_full | 2020-02-13 | **CC BY-NC 4.0** | — | — |
  | 002 | 2020-05-08 | **CC BY-NC 4.0** | 2,320,726,532 B | 339,590 B |
  | 002_v2 | 2020-05-14 | CC BY 4.0 | 2,321,684,148 B | 339,590 B |
  | 003 | 2020-07-01 | CC BY 4.0 | 2,297,827,002 B | 350,397 B |
  | 004 (4058819, duplicate 4058356) | 2020-09-29 | CC BY 4.0 | 2,454,999,319 B | 2,149,859 B |

- Zenodo's own instruction: "Please cite the published paper and state the used version of the habitat map."
- The COG's metadata names no version. Critter Connect's repo has no provenance either: grepping it for `habitat_cog|jung|4058819|lvl2|titiler` finds only the env examples and `plans/040-more-animals-per-place.md` (its `habitat_colormap` labels).
- **Class codes can only exclude a version, never confirm one** (Astra 4): a match says nothing between versions that share those codes, and the COG's processing (reprojection to 3857, resampling) is unrecorded. Only the owner can state which file it was made from and how. Until then the COG's provenance is **unconfirmed**.
- **v004 is an explicitly identified, licensed alternative** (revision, `/api/records/4058819`; Zenodo answers `Range` with 206):
  - `lvl2_frac_1km_ver004.zip`: 695,484,415 B, `md5:bd8508db8118f14d8da7bfa7950523d4`. Its central directory (one 64 KB Range read) lists 79 class files, one per level-1 or level-2 code (`…fraction_lvl2__<code>_<name>__ver004.tif`), each DEFLATE in the zip (49 KB to 60.2 MB). One inflated header (code 100): 36,308 × 18,154 px, **EPSG:4326**, pixel 0.0099157° (about 1.1 km at the equator), uint16, nodata 0, one row per strip, DEFLATE with predictor 2. The scale of the fraction values is (S): read it from v004's code zip or the paper.
  - `iucn_habitatclassification_composite_lvl2_ver004.zip`: 2,454,999,319 B, `md5:d9bad21c2c9e80814f59a6e57d934fa9`. **One** 2,593,230,119-byte tif, DEFLATE in the zip, so no random access by Range (`/vsizip/` would inflate from the start).

**F4. A1's names collide: lesson 16 creates `traits` and `species_traits`, and 002 §2 "Room to grow" gives critwire's real trait tables the same names.**
- `plans/002-learn.md:1629` (`l16`, `CREATE TABLE traits`) and `:1665` (`l16-ex`, `CREATE TABLE species_traits`) run on the setup database.
- `:372` proposes `traits (name, unit, description)` and `species_traits (species_id, trait_name, value, source_name)` for real data.
- If mission C adds them to `setup.sql` (one setup for every page, 002 §2), lesson 16 fails with "already exists", and so does B1's `learn.spec.ts` exercise test.
- **Fix** (003 records it as a disagreement with 002; mission C carries it out): the real tables keep 002's names and shapes, since the brief forbids renames. Lesson 16's exercise moves to `my_traits` and `my_species_traits`, with its `l16-check` rows updated. A grown-data lesson then compares the learner's design with critwire's real tables.

**F5. DuckDB `spatial` v1.5.6 differs from PostGIS where the lessons need it.** Source: `https://duckdb.org/docs/1.5/core_extensions/spatial/functions.html`, fetched 2026-10-22; `stable` now redirects to 2.0 docs, so cite 1.5.
- No raster type or functions, and no `GEOGRAPHY` type. Raster lessons can't run in the browser engine.
- `ST_Area` is planar, in the geometry's units. `ST_Area_Spheroid`, `ST_Distance_Spheroid` and `ST_DWithin_Spheroid` expect EPSG:4326 in **[latitude, longitude]** order, so lon/lat data needs `ST_FlipCoordinates` first. PostGIS `geography` takes lon/lat.
- `ST_Transform(geom, source_crs, target_crs[, always_xy])` takes CRS strings, and EPSG:4326 is lat/lon unless `always_xy := true`. PostGIS: `ST_Transform(geom, srid)`, with the SRID stored on the geometry and x always east.
- The `ST_Contains` doc says it "will also return true if geom2 is contained strictly on the boundary of geom1". PostGIS's `ST_Contains` is false for a point on the boundary (`ST_Covers` is true) (S: one boundary point in both engines).
- **Published:** `extensions.duckdb.org/v1.5.6/{wasm_eh,wasm_mvp,wasm_threads}/spatial.duckdb_extension.wasm` all answer 200 (Last-Modified 2026-09-27); `linux_arm64/spatial.duckdb_extension.gz` answers 200 (26,987,546 B).
- A1 mirrored the wasm_eh file (`<a1>/downloads/duckdb-ext-v1.5.6/wasm_eh/spatial.duckdb_extension.wasm`, 23,626,951 B, sha256 `1d76741f…ec234a`) and loaded it with signature checks on (002 §1 Q3: 6.33 MB on the wire live, 1.5 s on desktop). Memory and time with real polygons at 4× CPU: (S).

**F6. GDAL can't be made to report its network bytes. The kernel's socket counters can.**
- `SET postgis.gdal_vsi_options = 'CPL_CURL_VERBOSE=YES …'` gives "'cpl_curl_verbose' is not a legal VSI network file option". `GDAL_HTTP_PROXY=127.0.0.1:1` is refused the same way, and the read then ran without any proxy. The server log is root-only, and setting env vars in Postgres's environment needs a restart (out of scope).
- **What works:** `sudo ss -tinpH state established '( dport = :443 )'`, filtered by `pid=<pg_backend_pid()>`, showed `bytes_received:91196 bytes_sent:2056` after a cold one-pixel read, with the connection still open (GDAL keeps its curl handle).
- **Design:**
  - **Cold:** one fresh backend per measured query (GDAL's cache is per process).
  - **Warm:** a repeat in the same backend.
  - **Counters:** the socket counters, plus `/proc/<pid>/io` `rchar` (via sudo) as an upper bound that also covers closed sockets.
  - **Lower bound:** the exact sum of the tiles touched, from the COG's TileByteCounts (§T4).
- For geotiff.js in Node, bytes come from a counting `fetch` wrapper. For the browser, from Caddy's access log (A1's method).

**F7. TiTiler (option d) sends CORS; S3 still doesn't.**
- The URL is from phaser-june's committed `.env.example:11`: `https://j8dwwxhoad.execute-api.us-east-2.amazonaws.com`. No secret file was read.
- `GET /cog/info?url=<COG>` with `Origin: https://critwire.com` returns 200 with `access-control-allow-origin: *` and `access-control-allow-credentials: true`, in 4.08 s. The `OPTIONS` preflight returns 200 with `access-control-allow-origin: https://critwire.com` and GET/POST allowed. `/cog/info` agrees with F2 (bounds, dtype, nodata, overviews `[2…1024]`).
- Its routes (`plans/040` line 85): `/cog/*` (including `point` and `statistics?categorical=true`), `/api/habitat-analysis`, `/api/simple-species`, `/health`.
- S3, rechecked: the preflight gets 403, and `GET` with `Origin` and `Range` gets 206 with no `access-control-*` header.
- TiTiler is a server process outside critwire, billed to the owner's AWS. So it's an owner's choice (§8), never a default, and a third reader to cross-check values with.

**F8. License pages: reachability and early flags** (UA = desktop Chrome; full quotes are Steps' work).
- **IUCN:**
  - **Live site:** `www.iucnredlist.org/terms/terms-of-use`, `/resources/spatial-data-download` and `/terms/disclaimer` all answer 403.
  - **Wayback `20261015190206` of the terms answers 200 (50,481 B) and is readable:** "The IUCN Red List Terms and Conditions of Use (version 3.1, June 2024)".
    - §1: Red List Data "comprise all tabular, and all spatial and associated attribute data".
    - §1: the license is "personal to you or to members of your household and are not transferable".
    - §4: "All forms of reposting, and any sub-licensing, reselling, or other forms of redistribution of IUCN Red List Data … including within Derivative Works, are strictly prohibited without the prior written permission of IUCN", and redistribution is allowed only "through a formal Waiver".
    - §5: "a non-transferable license to use, download and print … solely for conservation or education purposes, scientific analyses, and research".
  - **Spatial page:** the closest snapshot, `20260516165500`, says "freely available for non-commercial use".
  - **Verdict:** quotes are verifiable from the archive, so no handoff item is needed. The owner hasn't saved a copy (`iucn-terms-of-use-*` is absent).
- Natural Earth: public domain (A1 saved `<a1>/downloads/naturalearth-terms/terms-of-use.html` and `LICENSE.md`).
- Jung v004: Zenodo API `license.id = cc-by-4.0` (F3).
- AnAge (`genomics.senescence.info/legal.html`, 200): "This work is licensed under a Creative Commons Attribution 3.0 Unported License. In brief, HAGR is free for all purposes, including commercial, educational, and research purposes…".
- AmphiBIO (`api.figshare.com/v2/articles/4644424`): `CC BY 4.0`, `AmphiBIO_v1.zip` 1,437,220 B.
- EltonTraits (`esapubs.org/archive/ecol/E095/178/`) and PanTHERIA (`…/E090/184/`) show only "Copyright Authors". That's not hostable unless a licensed copy is found.
- **WDPA** (`protectedplanet.net/en/legal`, 200): "No Sub-licensing or Redistribution … You may not redistribute the WDPCA and GD-PAME Data … by any means including … web downloads, through web service…", plus "No Commercial Use". **Blocks hosting**: learners would use their own download only, as with IUCN.
- GBIF `/terms` and `/terms/data-user` answer 403, so they need Wayback. Record licenses are already limited to CC0 / CC BY by critwire's ingest.
- WorldClim, CHELSA, RESOLVE and Open Tree pages load (200), but the static HTML has no license words (JS-rendered). The license statement must come from the download's own README or metadata, or the DOI landing page.
- COMBINE and a reptile source: not searched yet. **All 11 reptiles are turtles and tortoises** (Testudines, F9), so lizard and snake trait sets don't cover them; the reptile source must include Testudines.
- Sizes (HEAD): RESOLVE `Ecoregions2017.zip` 149,248,653 B. Natural Earth admin-1 at the pinned commit: 10m GeoJSON 40,726,851 B, 50m 2,325,694 B.

**F9. Data facts for joins** (`data/species.json`, `data/raw/gbif/snapshot.json`):
- 76 species: Mammalia 50, Amphibia 15, Reptilia 11 (all Testudines: Emydoidea blandingii … Chelonoidis abingdonii).
- Non-null ids: iucn 76, wikidata 76, ncbi 75, inaturalist 74, gbif 73, col 69. `range.status`: ok 72, identity-unsettled 3, no-open-records 1.
- Sources cited today: Catalogue of Life, GBIF Backbone Taxonomy, GBIF.org occurrence search, Wikidata, critwire base.
- **Open GBIF records after critwire's filters** (the sum of each species' dataset counts): 397,183 in total; median 132 per species; max 153,922 (*Macrotis lagotis*); 3 species have over 10,000 and 21 over 1,000. A full points table is too big for a browser lesson, so it needs a capped sample or a grid summary.
- Publishing points needs no new DOI mechanism. `contributions.json` already counts, per dataset, every record the countries query matches (`scripts/derive/contributions.ts:1-2`, from the datasetKey facet of the same `OCCURRENCE_FILTERS`, `scripts/ingest/gbif.ts:25-35`). A sample drawn **in the same `ingest gbif` run with the same filters** is a subset of those records, so the counts don't change and nothing is counted twice. Derive asserts it: every sampled record's `datasetKey` is in its taxon's counts, with no more sampled records than counted. The DOI refresh in `AGENTS.md` is then needed only when `ingest gbif` changes the counts, as today.
- The species' `ids.iucn` is the SIS taxon id, so a learner's own IUCN download joins to `species.iucn_id` with no IUCN data on critwire's side.

**F10. A1's query runner fits, with three changes.**
- `<a1>/scripts/plan-queries.ts:14` fixes `Status = "ran" | "draft-table" | "untested"`. The label check is `countries`-specific: `mentionsCountries` at `plan-queries.ts:218`, used at `run-queries.ts:100,135`.
- It runs DuckDB-WASM only, and the engine `LOAD`s only `parquet` (`src/engine.ts:29`, `src/assets.ts:44`; `spatial` is only in the mirror test list, `assets.ts:55`).
- A2 needs `spike-table` driven by a registry, a PostGIS engine, and `LOAD spatial` plus a second setup file.
- Everything else reuses as is: statement splitting (`src/sql.ts`), every block in `BEGIN … ROLLBACK`, `-- after:`, the result rendering and hash, `--check`/`--update`, the `--erd` drift check (`erd-model.ts`), the port guard (`serve.ts`) and the Mermaid render (`erd.ts`).

**F11. Spike tables in `critwire_dev` must never depend on `public.species`.** `pnpm build`/`db:load` runs `db/schema.sql` (`drop table if exists species`, line 2) inside one transaction (`scripts/db.ts:41-46`). Tables in another schema survive it, but a foreign key or view on `public.species` would make every build fail ("other objects depend on it"). **Fix:** schema `learn_spatial` only, referencing nothing in `public` but PostGIS's types and functions.

**F12. The Postgres server can't open files under `/srv/critter-ai`** (revision, `namei -m`): `/srv/critter-ai` is `drwxr-x--- critter-ai` and the server runs as `postgres`. So neither the spike folder nor a repo checkout is readable by PostGIS out-db. **Fix:** PostGIS reads rasters only over `/vsicurl/`; a local raster goes in as bytes, either `ST_FromGDALRaster(bytea)` for a clip file or `ST_SetValues(…, double precision[][])` for a window read in Node by geotiff.js (both checked). Never `chmod` the home tree.

**Already fine:**
- Range on S3 (206).
- The spatial extension is published for the pinned DuckDB.
- Disk: 24 GB free; A1's whole spike is 961 MB, 539 MB of it `node_modules`.
- `spatial_ref_sys` has the equal-area SRIDs the projection lessons need: 6933 (EASE-Grid 2.0 Global), ESRI 54009 (Mollweide), ESRI 54034, plus 3857 and 4326.
- geotiff.js: npm `latest` is **3.0.5** (2026-03-11, 225 days old, past any release-age gate), MIT. Its dependencies are lerc, pako, zstddec, quick-lru, xml-utils, web-worker, parse-headers and @petamoriken/float16 (DEFLATE via pako). `3.1.0-beta.0` isn't used.

### Target design

#### T1. `plans/003-learn-data-spatial.md`: outline and evidence

Same conventions as 002: every ```` ```sql ```` block has `-- q:` and `-- status:`, and is followed by its ```` ```text ```` result block. Lessons use 002 §4's format. The text gives no counts that the data could change.

| § | Content | Evidence (paths under `<spike>`) |
|---|---|---|
| 1 Growing the data | ranked table, then one entry per dataset: what it adds; lessons/games; license **quoted** with URL and retrieval date (UTC); hostable yes/no/blocked; size; join keys; ingest work. Covers every dataset the brief lists, plus the reptile (Testudines) source and COMBINE; the top three and why | `evidence/licenses/<dataset>/` (saved page `.html` or `.pdf`, `quote.md` with the verbatim text and where it sits on the page), `evidence/licenses/SOURCES.md` (URL, UTC time, sha256, HTTP status); sizes from Content-Length or the Zenodo/figshare API |
| 2 Grown schema and ERD | tables, columns, keys, cardinality (T5); `setup-grown` block; `plans/003-learn-erd.mmd` | `src/setup-grown.sql` (byte-checked against the block), `run-queries --erd`, `erd/grown.svg` and `.png` |
| 3 Lessons for grown data | 4–8 lessons, each marked "runs today" (only if a spike table stands in) or "waits for mission C" | `queries.log` |
| 4 Spatial track | 6–10 lessons; per lesson "runs in: browser (DuckDB spatial) / browser (geotiff.js) / your own PostGIS", backed by an experiment; PostGIS-style SQL, with paired DuckDB blocks where spellings differ (F5) | `queries.log`, `out/e1-pip/`, `out/e2-point/`, `out/e3-zonal/`, `out/e4-clip/` |
| 5 Habitat raster | version and level, and the provenance gate (T7); credit; options (a)–(d) with disk, bandwidth, work, Chromebook fit, from measured bytes and times; the summary methods with resolution, rule and measured error (E3c); the habitat ingest (T5) | `out/cog/`, `out/jung/`, `out/e*/`, `out/tile-bytes/` |
| 6 IUCN | quotes, the four cases, learner-own lessons, permission draft (T8) | `evidence/licenses/iucn/` |
| 7 Build missions | brief paths, what each assumes from B (T9) | `plans/briefs/critwire-learn-c.md`, `…-d.md` |
| 8 For the owner | choices with recommendation and cost (T10) | |
| Disagreements with 002 | F4 (lesson 16 names); anything else the spike finds | |

#### T2. The spike (`<spike>`, under 2 GB, never in the repo)

```
README.md            every command in order; provenance of every copied A1 file (A1 path + sha256)
package.json         exact pins: @duckdb/duckdb-wasm 1.33.1-dev65.0, @duckdb/node-api 1.5.6-r.2, playwright 1.58.2,
                     esbuild 0.28.2, mermaid 12.2.0, typescript (A1's), geotiff 3.0.5, postgres (the repo's resolved 3.4.x)
pnpm-workspace.yaml  allowBuilds: esbuild only (record if geotiff or its deps want a build script: S)
Caddyfile            A1's (e2e globals + the live block on http://127.0.0.1:3102), log {$SPIKE_OUT}/caddy-access.log
run-queries.ts       the CLI the Definition of done names (A1's scripts/run-queries.ts moved up one level, imports adjusted)
scripts/             copied from A1: paths.ts (repointed to this mission), serve.ts, browser.ts, env.ts, build-site.ts,
                     plan-queries.ts, runner-client.ts, erd.ts, erd-model.ts; the CPU-quota launcher and VmHWM probe
                     cut out of A1's measure.ts (not the whole harness)
                     new: cog.ts (TIFF/IFD reader + tile maths), tile-bytes.ts, pg.ts (SPIKE_PG_URL, capability check,
                     session settings, bytes), jung.ts, e1-pip.ts, e2-point.ts, e3-zonal.ts (E3, E3b), e3c-methods.ts,
                     e4-clip.ts, grown-data.ts, licenses.ts (fetch + save + hash)
src/                 copied: engine.ts, sql.ts, format.ts, cards.ts, assets.ts, runner-page.ts, runner.html,
                     setup.sql (byte-identical to 002's `setup` block)
                     new: setup-grown.sql, pg-setup.sql, pip-page.ts + pip.html, raster-page.ts + raster.html
downloads/<name>/    each download in its own new directory; downloads/SOURCES.md (URL, UTC, sha256)
data/                spike-built stand-ins: v1/*.parquet (served as /v1/…), spike-tables.json (the registry, T3)
clips/               COG clips cut by PostGIS (a few MB)
evidence/licenses/   T1
erd/                 grown.svg, grown.png
out/<run>/           results.json, summary.md, screenshots, caddy-access.log, bytes.json, env.txt
baseline/            exists
```

- **Reuse, don't edit A1:** files are copied (`cp`, sha256 recorded), never imported from `<a1>`, so A1's evidence stays as B reads it. A1's Natural Earth GeoJSON is copied into `downloads/naturalearth-v5.1.2/` after its sha256 is checked against `<a1>/downloads/SOURCES.md`.
- **Node DuckDB's spatial extension** (data prep only) installs into `<spike>/duckdb-ext-node/` (`SET extension_directory`), never `~/.duckdb`.
- **Serving:** `serve.ts` unchanged (refuses while 3100/3101/3102 are busy). `build-site.ts` adds `spatial` to the wasm_eh mirror (A1's download, sha256-checked), `data/v1/*` into `site/v1/`, and `clips/*` into `site/learn/spike-data/`.
- **Budget:** `du -sh <spike>` is logged at the end of every step; zips are deleted after extraction once their sha256 is recorded.

#### T3. Query accounting (`<spike>/run-queries.ts`)

`node <spike>/run-queries.ts plans/003-learn-data-spatial.md [--check|--update] [--erd plans/003-learn-erd.mmd]` writes `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/queries.log`. Everything in A1's contract (002 §1, A1 plan "run-queries contract") holds, except the following.

- **Status:** `ran | spike-table | untested: <reason>`.
  - `ran`: reads only today's public data: the A1 setup tables built from `/v1/species.parquet`, or the owner's COG read live.
  - `spike-table`: reads at least one table listed in `<spike>/data/spike-tables.json` (name → engine, file, source URL, license, built by). The registry lists `countries` (still A1's draft until B1 publishes it), every grown table, and every `learn_spatial` table, including the synthetic IUCN stand-in (T8) and the in-db habitat clips (below).
  - **Few live COG reads:** each raster lesson has exactly one `ran` block that reads the COG out-db over `/vsicurl` (the lesson's point: "this reads a 3.64 GB file by ranges"). Its other blocks read in-db clips that `pg-setup` loads from `<spike>/clips/*.cog.tif` with `ST_FromGDALRaster` (F12), so they're `spike-table` and don't touch S3. Verification names S3 as a dependency of those few `ran` blocks; the ETag check below makes a changed file fail loudly.
- **Engine:** a new optional header, `-- engine: duckdb | postgis` (default `duckdb`). One engine per block; where spellings differ, the lesson shows a PostGIS block and a DuckDB block side by side.
  - **duckdb** (headless Chromium, A1's engine):
    - Boot runs `LOAD spatial` from the spike mirror (autoinstall/autoload off, signatures on), then `setup.sql` (must equal 002's `setup` block, checked as in A1), then `setup-grown.sql` (must equal 003's `setup-grown` block).
  - **postgis** (postgres.js on `SPIKE_PG_URL`):
    - One connection per run. On connect, `pg.ts` runs F1's **capability check** (`SELECT postgis_raster_lib_version()`, then `SET postgis.enable_outdb_rasters = on` and `SET postgis.gdal_enabled_drivers = 'GTiff COG'`, then assert both with `SHOW`) and refuses the run with the `SHOW` values if it fails. Then `SET search_path = learn_spatial, public` and `statement_timeout = '60s'` (A1's block timeout).
    - 003's PostGIS setup block (`-- q: pg-session`, `-- status: ran`) shows the same lines, ending in a `SELECT` that returns both `SHOW` values, so a learner sees "on" and "GTiff COG" or knows the lesson won't work; the text says why (F1).
    - `pg-setup.sql` (= 003's `pg-setup` block) builds `learn_spatial` from the same `data/` files the browser reads, so both engines see the same rows. Node passes file bytes as parameters (F12).
    - Each block runs inside `BEGIN … ROLLBACK`, statement by statement with A1's splitter.
    - Values map to A1's `Result`: int8 to bigint, numeric to text, float8 to number. A `geometry`, `raster` or `bytea` column fails the run; the SQL must render it (`ST_AsText`, `round`).
  - **Labels (both engines):** the whole-word test over the registry's names (A1's `mentionsCountries`, generalised), plus DuckDB's `getTableNames` where A1 already uses it. No `EXPLAIN` scan (KISS).
- **ERD:** `--erd plans/003-learn-erd.mmd` runs A1's drift check against the DuckDB catalog after both setups. One rule is added: every entity and every line of `plans/002-learn-erd.mmd` appears in 003's ERD unchanged (no renames, no changed columns).
  - A1's parser accepts only its subset. Extend it only where the grown schema needs it: a `||--o|` line where the child's foreign key is also its primary key or unique, as in `country_shapes` (S).
- **Determinism:** A1's rules (no `random`/`now`/`current_date`; `ORDER BY` a unique key or one row). Recorded floats are rounded in SQL. PostGIS blocks that read the COG are deterministic as long as the file's ETag stays `"975827817c839f73a5ee49d2791393a4-212"`. The runner records the ETag in the log header and fails if it changed.
- **Not run here:** the learner-side import commands (`shp2pgsql`, `ogr2ogr`, `docker`) are ```` ```sh ```` fences, not SQL, so they aren't counted. Their effect is stood in for by spike tables.

#### T4. The four experiments (what each records; every run → `out/<run>/summary.md` + `results.json`)

Common to all:
- **Bytes and time:** F6's method for S3/PostGIS, Caddy's access log for the browser, a counting `fetch` for Node. Each figure is shown against the **tile lower bound** from `tile-bytes.ts`, which downloads the TileByteCounts arrays of all 11 IFDs once (about 3.1 MB, Range reads only) to `downloads/cog-index/` and sums the tiles a window touches at a given level.
- **Browser runs:** Playwright's Chromium (`channel: "chromium"`), A1's route guard (only 127.0.0.1:3102). Desktop, and 4× CPU via A1's `systemd-run --user --scope -p CPUQuota=25%`. 3 runs each; median and max.
- **Network time:** computed from bytes at A1's school Wi-Fi and slow 4G throughputs (A1 measured Chromium's emulation at ratio 1.00), not re-run.
- **Memory:** peak renderer RSS (`VmHWM`) by A1's probe.

**E1. Point-in-polygon in the browser** (`pip.html`, `e1-pip.ts`):
- **Shapes:** `data/v1/country_shapes.parquet` (`country_code`, WKB geometry) from Natural Earth 10m admin-0, chosen per code by A1's matching rule (002 §6). A 50m version too, to compare size and memory.
- **Points:** `data/v1/occurrences.parquet`, a small open sample: GBIF `occurrence/search` for 3 species fixed by `species.id` (chosen at the step, recorded in the README with their `ids.gbif`), at most 300 records each, with the repo's `OCCURRENCE_FILTERS` (`scripts/ingest/gbif.ts:26-29`, copied, not imported) plus `checklistKey` and `taxonKey` as in `occurrenceSearchUrl`, at most 2 requests a second. Every request URL and response goes in `downloads/gbif-sample/` and `downloads/SOURCES.md`, so the sample is reproducible and mission D's ingest uses the same query (F9). Each row keeps `gbifID`, `datasetKey`, `license`, lon/lat and GBIF's own `countryCode`. It stays in the spike (not published).
- **Query:** `ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))`, counts per country, set against GBIF's `countryCode` (agree, disagree, no polygon: the coastline-precision lesson). The same SQL runs in PostGIS on `learn_spatial` and must give the same counts.
- **Records:** extension bytes and `LOAD` time; file bytes; query time; peak memory; screenshot.
- **Fallbacks:** WKB in Parquet won't load as geometry → GeoJSON text plus `ST_GeomFromGeoJSON`, then WKT. Memory with 10m shapes over A1's 700 MB budget → 50m shapes (the code gaps A1 listed: GI, BV, UM) or shapes simplified at prep time.

**E2. Habitat value at a point, PostGIS out-db** (`e2-point.ts`):
- **Points:** 10 points (Manaus plus the E1 sample's first points per species).
- **Three readers:**
  - PostGIS: a 1×1 grid-aligned window plus an out-db band on `/vsicurl/…` (F1);
  - geotiff.js 3.0.5 in Node against S3 (`fromUrl`, `getImage(0)`, `readRasters({ window })`), with no CORS in Node;
  - TiTiler `/cog/point`.

  All three must agree on every point.
- **Records:** bytes and time per read, cold (fresh backend or process) and warm; 5 runs.

**E3. Zonal statistics in a small polygon** (`e3-zonal.ts`):
- **Polygons:** two small Natural Earth polygons, one tropical (Trinidad and Tobago, `TT`, a species code today) and one at high latitude (S: pick one near 60° N, under about 5 M cells).
- **Steps:**
  1. Build the out-db window over the polygon's bbox, aligned to the grid.
  2. `ST_ValueCount(ST_Clip(rast, ST_Transform(geom, 3857)))`.
  3. Compute the area four ways:
     1. cells × 103.02² m² (nominal Web Mercator);
     2. cells × (103.02 · cos φ_row)², each row at its own latitude;
     3. `ST_Area(geom::geography)` and `ST_Area(ST_Transform(geom, 6933))` for the polygon itself;
     4. after `ST_Transform(rast, 6933, 'NearestNeighbor')`, cells × the new pixel area.
- **Records:** the Mercator overstatement (sec²φ: about 1.035 at 10.5° N, about 4 at 60°) for the "why projection matters" lesson; bytes; time; a check against TiTiler `/cog/statistics?categorical=true` for the same polygon.
- **E3b (S): can PostGIS read an overview out-db? Judged by values, never by bytes alone.** PostGIS's out-db loader may read `width × height` full-resolution pixels from an offset computed at the raster's own scale, so a coarse window can silently return the wrong block with small bytes (Fable). Attempts, each at ÷8 and ÷1024:
  1. an empty raster at k × 103.02 m pixels over the polygon's bbox, out-db band on `/vsicurl/…`;
  2. the overview opened as its own dataset, `GTIFF_DIR:<n>:/vsicurl/…` (S: GDAL gives an overview IFD no georeferencing, so the window is built in pixel coordinates).
  - **Reference:** geotiff.js in Node reads the same ÷k window (`getImage(n)`, `readRasters({ window })`), an independent reader. At ÷1024 both must also equal F3's histogram of the single tile (the whole level).
  - **Pass** only if the full class histograms are equal and 100 grid-sampled cells are equal. Any difference, an error or a refusal means **"PostGIS can't read overviews"**: overview reads then go through geotiff.js only (in Node; in PostGIS as `ST_SetValues` windows, F12). Bytes and time are recorded either way.
- **E3c: what each summary method gets wrong** (Astra 3). For E3's two polygons, area per class three ways, each with its resolution and rule written next to it:
  1. full-resolution COG count × (103.02 · cos φ_row)² (the E3 reference; it inherits the COG's unrecorded reprojection);
  2. ÷8 and ÷16 overview counts × k² × (103.02 · cos φ_row)², read by E3b's validated path. A nearest-neighbour overview keeps one pixel per k × k block, so this is a 1-in-k² sample: it can miss or inflate small, thin or patchy classes (rivers, urban, mangroves);
  3. Jung v004 `lvl2_frac_1km_ver004` (F3): Σ (fraction × geodesic cell area) per class, cells assigned by centre point in the polygon. This keeps the 100 m map's proportions inside each 1 km cell; its error sits in the border cells, reported as their share of the total.
  - **Access:** Range-fetch only the zip members whose class occurs in method 1's histogram, each member whole (offsets from F3's central directory, at most 60.2 MB each), inflate with Python's `zlib` (`-I`), read windows with geotiff.js, and clip in PostGIS via `ST_SetValues` (F12). Self-check: per land cell, the fetched classes' fractions must sum to the full scale (S: the scale, F3). A shortfall names the missing classes. Each member's CRC-32 must equal the central directory's; members are deleted after the run, their sha256 recorded.
  - **Records:** per class, the absolute and relative difference of methods 2 and 3 from method 1; classes under 1% of the polygon flagged; bytes and time. 003 §5 states each method's resolution, rule and measured error. Published numbers are labelled **estimated**, never "true area".

**E4. Browser raster read of a PostGIS-cut COG clip** (`e4-clip.ts`, `raster.html`):
- **Cut:** one region (Costa Rica, `CR`, a species code today) with `ST_AsGDALRaster(ST_Clip(rast, geom), 'COG', ARRAY['COMPRESS=DEFLATE', 'BLOCKSIZE=256', 'RESAMPLING=NEAREST'])`. Set nearest-neighbour explicitly, since the COG driver's default overview resampling isn't nearest for unpaletted data (S). The `bytea` is written to `clips/cr.cog.tif`.
- **Validate** with `cog.ts`: ghost area `LAYOUT=IFDS_BEFORE_DATA`, tiles, overviews, EPSG:3857, nodata 0, and `OVR_RESAMPLING_ALG=NEAREST`. Its codes must be a subset of the full-file histogram. 100 grid-sampled cells must equal PostGIS `ST_Value`.
- **Serve and read:** `site/learn/spike-data/cr.cog.tif`, same-origin on Caddy :3102. The page bundles geotiff.js with esbuild and runs `fromUrl`, `getImageCount`, `getImage(i)` (full resolution and one overview), then `readRasters({ window })` for a 256 × 256 window. It draws a class histogram table and a canvas preview. Screenshots at 1280 and 375 px.
- **Records:** per-request bytes and Range from Caddy's log; the clip's file size; time; memory. The clip is research evidence and stays in `<spike>` (T7's gate decides what D may publish).
- **Check:** a Range request gets 206 with `Content-Range` and no `Content-Encoding` under the live block's `encode zstd gzip` (S). If Caddy mishandles it, record it as a control-room item, not a spike workaround.
- **Option (a) price:** the same reads with geotiff.js in Node against S3 (counting `fetch`) show what a browser would pay if the bucket sent CORS, including whether geotiff.js loads F2's 6.9 MB tile index whole.

#### T5. The grown schema (built in the spike, drawn in the ERD)

- **Rules:**
  - A1's six tables and the view are unchanged.
  - New tables go in `setup-grown.sql`, each created after the tables it points at; no `DROP`; foreign keys only in `CREATE TABLE` (002 §2). Mission C merges it into `setup.sql`.
  - New `sources` rows come from each new file's own source block, inserted before the tables that cite them, the way A1's countries attribution entry works (002 §6 "Credit"). Species files are never edited.
  - **Every new table and derived field names its credit**: an entry in `scripts/build/sources.ts` (`SOURCES`, verbatim citation, `LICENSE_URLS`) and the `fields` it covers in `dist/v1/attribution.json`, so the build's existing checks (unknown source fails; registered but uncited fails, `scripts/build/attribution.ts:52-58`) cover the new files too. Mission C/D add the entries.
- **Raster-derived data is ingest output, never build work** (`AGENTS.md`: the build is offline and loads only `data/`). The brief's "summaries computed at build time" option becomes "computed at ingest, committed"; 003 §5 says why. Mission D adds `pnpm ingest habitat`:
  - **Input:** Jung v004 `lvl2_frac_1km_ver004.zip` by its Zenodo URL, downloaded whole into a temp dir outside the repo, md5 checked against the record (F3), deleted after. Not the owner's COG, whose provenance is unconfirmed (T7). Shapes: the committed Natural Earth file, by sha256.
  - **Output, committed:** `data/raw/habitat/snapshot.json`, keys sorted, one UTC `retrieved`, with `source` (Zenodo record 4058819, version `004`, file name, md5, license `CC BY 4.0`; or, when the input is the COG, its URL, ETag and confirmed version), `method` (resolution 0.0099157°, EPSG:4326, Σ fraction × geodesic cell area, centre-in-polygon assignment, rounding, the shapes' sha256, the gbif snapshot's `retrieved`) and the values. Clips (option b), if chosen, go in `data/raw/habitat/clips/<cc>.cog.tif` with their sha256 in the snapshot and the same provenance.
  - **Derive** validates it and refuses it as stale (`run pnpm ingest habitat`) when the shapes' sha256 or the gbif `retrieved` differ, or a code isn't in `habitat_classes`. **Build** only loads the derived file and copies clips.
  - **Cost, one-off per refresh:** 695 MB at most from Zenodo (no owner egress), about 79 layers of 659 M cells, most of them nodata; time from E3c, scaled. Full resolution from the COG is out (2.25 GB of the owner's egress, 151 G cells on 2 CPUs; F2). The COG's ÷8 level (97 MB, 824 m, a 1-in-64 sample) is the documented fallback only if v004 can't be read, labelled as such.
  - **Tool** (PostGIS via `ST_SetValues` windows, F12, or Node alone): mission D's architecture picks it from E3c's timings. An ingest that uses PostGIS runs F1's capability check, and needs a superuser session or `GRANT SET ON PARAMETER` for its role (a control-room change).
- **Candidates** (section 1's ranking picks the final set; names follow 002 §2's conventions):

  | Table | Keys | Fed by | Credit (`SOURCES` entry → fields) |
  |---|---|---|---|
  | `traits`, `species_traits` | exactly 002's shapes (F4); one source per trait | AnAge, AmphiBIO, a Testudines source (license permitting) | per trait: its dataset → `species_traits.value` |
  | `habitat_classes` | `code` PK, `level1_code` FK → itself (NULL for level 1), `name` | v004's legend (code zip; never iucnredlist.org) | Jung et al. 2020 v004 → `name` |
  | `country_habitats` | (`country_code`, `habitat_code`) PK, both FK; `est_area_km2` (estimated; the method lives in the source entry, never "true area") | `ingest habitat` (above) | Jung v004 + Natural Earth → `est_area_km2`, with critwire's method note |
  | `country_shapes` | `country_code` PK/FK → `countries`; `geom` | Natural Earth (public domain) | Natural Earth, version pinned → `geom` |
  | `occurrences` | `id` (gbifID) PK; `species_id` FK; `country_code` FK, nullable; lon/lat; `year`; `license`; `dataset_key`; `habitat_code` FK, nullable | GBIF CC0/CC BY, capped per species, sampled in `ingest gbif` with the countries filters (F9); `habitat_code` from `ingest habitat` | GBIF.org + the derived-dataset DOI → the row (`license`, `dataset_key` per row); Jung v004 → `habitat_code` |
  | `ecoregions`, `biomes` | `ecoregions.biome_id` FK (3NF: RESOLVE repeats the biome name per row) | RESOLVE 2017 | RESOLVE (CC BY 4.0) → names, `geom` |
  | `tree_nodes` | `id` PK, `parent_id` FK → itself, `species_id` UNIQUE FK, nullable | Open Tree (license permitting) | Open Tree synthesis version → the tree |
  | `species_names` | (`species_id`, `language`) PK | Wikidata (CC0) | Wikidata → `name` |

- **`occurrences.habitat_code`** is "the most common level-2 class in the record's 1 km cell (Jung v004 fractional layers)". It claims no 100 m precision for a point record, and it comes from the identified release. Docs and lessons name it that way. A country's share of a class is computed in SQL from `est_area_km2` (a window-function lesson), never stored.

- **No species–habitat "preference" table:** which habitats a species uses comes from IUCN assessments, which is Red List data and never allowed. critwire's honest version is "habitat class at open-record points" (`occurrences.habitat_code`), named as such.
- PostGIS-only learner-side objects (raster windows, `my_ranges`) aren't critwire's schema. §4 lists them in text, outside the ERD.
- **ERD:** `plans/003-learn-erd.mmd`, Mermaid `erDiagram` in A1's subset. 003 §2 embeds the same text (checked as in A1). It renders with A1's `erd.ts` to `<spike>/erd/grown.svg` and `.png`. The drift check is T3.

#### T6. Where lessons run (the hypothesis the experiments test)

| Topic | Runs in | Why |
|---|---|---|
| points, polygons, CRS; `ST_Contains`/`ST_Intersects`; spatial joins | browser, DuckDB `spatial` (E1), with PostGIS spellings beside it | self-hosted, no server; F5 differences called out |
| distance and area | browser, with the spheroid functions' lat/lon order (F5) | |
| why projection matters | browser (vector areas in 3857 vs 6933 vs spheroid) + PostGIS raster cell areas (E3) | the Antarctica overcount in F3 is the hook |
| raster value at a point; zonal statistics | learner's own PostGIS (E2, E3) after the `pg-session` capability check (T3), reading over `/vsicurl/` a critwire-hosted clip, the learner's own v004 download from Zenodo (CC BY 4.0), or the owner's COG (only once its provenance is confirmed, T7, and the owner allows the egress, §8); a browser companion reads the clip with geotiff.js (E4); browser SQL runs on the committed `country_habitats` (T5, ingest output) | no raster in DuckDB (F5) |
| IUCN ranges vs records | learner's own PostGIS with their own download (T8) | IUCN terms |

Zonal statistics lessons say what resolution they read and that a coarse overview is a sample (E3c); the area numbers they show are labelled estimated.

#### T7. Identifying Jung's version and level (`jung.ts` → `out/jung/`)

1. **Level:** 2 (F3), confirmed on the ÷256 overview (9 tiles) as well as the ÷1024 one.
2. **Per-version code lists:** download the code zips (v002/v002_v2 339,590 B; v003 350,397 B; v004 2,149,859 B) and extract any legend or class table, plus the fraction-value scale (F3, S). Read each lvl2 composite zip's central directory with one Range request on its last 64 KB, and inflate the first 64 KB of its single tif (one more Range request) for the header: size, pixel, CRS, nodata, GDAL metadata. Never the 2.3–2.5 GB body.
3. **Exclude:** a version whose code list lacks a code in the COG (÷256 overview plus the E2/E3 windows), or whose header contradicts the COG (e.g. a different nodata or data type), is excluded. A match only fails to exclude (F3).
4. **The provenance gate (decides what may be published):**
   - **Confirmed** = the owner states which Zenodo version and file the COG was made from, and how it was reprojected and resampled, **and** step 3 doesn't exclude that version. Only then may mission D publish anything cut or computed from the COG (clips, summaries, lessons that send learners to the bucket), credited "Jung et al. 2020, version 00X, reprojected to EPSG:3857 by <who>".
   - **Otherwise** critwire publishes raster-derived data only from **v004 by URL** (Zenodo 4058819, CC BY 4.0, md5 checked, F3): summaries and point classes from the 1 km fractional layers (T5); clips, if chosen, cut from the v004 composite (a one-off 2.45 GB download in mission D, outside the repo, md5 checked; it can't be read by Range). This is D's default, so the owner's answer is a §8 item, not a handoff item (the brief: a handoff item only when the mission can't finish).
   - If step 3 can't exclude the CC BY-NC versions (001, 002), §5 also says the COG itself counts as not hostable (decision rule).
   - The spike may read the COG for research (E2–E4); its clips stay in `<spike>`.
- Class labels come from v004's legend (CC BY), cited to Jung, never from iucnredlist.org.

#### T8. IUCN (no IUCN data anywhere)

- **Quotes, in this order:**
  1. the owner's saved copy (`/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/iucn-terms-of-use-*`; re-check at the step);
  2. the live page (403 today);
  3. Wayback `20261015190206` (readable today).

  The archived HTML and its text are saved to `<spike>/evidence/licenses/iucn/` with sha256 and the UTC retrieval time, along with the spatial page's snapshot (the newest available; `20260516165500` today).
- **Clauses to quote:** §1, §4, §5, §15 (definitions: Derivative Works, Commercial Use) and §16 (contact). The quotes are labelled "verified against the Internet Archive copy of 2026-10-15; the live page refuses this server". Only if no copy can be read: mark them unverified and add the handoff item.
- **The four cases**, answered from those clauses:
  - Hosting: §4.
  - Derived products: §4, "including within Derivative Works".
  - Classroom use: §5 education, but the license is personal and not transferable (§1), so each learner downloads their own.
  - A learner's own account, used locally: §5, non-commercial, no redistribution of results.
- **Lessons:** in the learner's own PostGIS, with the learner's own download. critwire supplies the text, the SQL, the import commands (`sh` fences) and the critwire tables (`species`, `species_countries`, `country_shapes`). Examples:
  - join the learner's ranges to `species.iucn_id`;
  - records vs range: which open-record countries lie outside the expert range;
  - habitat composition inside a range, from the Jung raster.

  Results stay on the learner's machine (§4).
- **Their SQL runs** against `learn_spatial.example_ranges`, two hand-drawn rectangles labelled **synthetic** (`spike-table`), with lesson-defined column names. Any IUCN column name in the text comes only from IUCN's public documentation, quoted with its URL. **Draft request:** a short letter to the §16 contact asking for the §4 "formal Waiver", for simplified ranges of critwire's 76 species used only inside Learn for non-commercial teaching. Sending it is the owner's call.

#### T9. Missions C and D

- **Briefs:** `plans/briefs/critwire-learn-c.md` and `plans/briefs/critwire-learn-d.md` (A1's `plans/briefs/` convention), in the ops brief format. Each is sized at 30–40 sessions and fixed by the Steps.
- **Both start from `main` after B2 has merged and gone live.** Each states what B delivered: `/v1/countries.*` (250 rows); the self-hosted engine and the `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/` mirror; `setup.sql` (6 tables + view); `site/learn/schema.mmd` with `pnpm erd` and the build's stale check; 16 lessons (`lessons.json`, `site/learn/sql/`); the E2E harness; B2's cookbook, playground and game, and the Caddy headers if they were approved. "Where B's plans record deviations from 002, B's code wins."
- **C** builds the non-geometry datasets section 1 ranks top: ingest → snapshot → derive → `/v1` files, with attribution entries, the grown tables, the ERD update, the grown-data lessons, F4's lesson 16 change, and E2E.
- **D** builds the spatial track:
  - vendoring `spatial` (owner's choice §8: commit about 23.6 MB per DuckDB version, or a pinned, sha256-checked fetch);
  - the geometry files; the occurrence sample, drawn in `ingest gbif` with the countries filters so `contributions.json` and the DOI don't change because of it (F9);
  - `pnpm ingest habitat` (T5): summaries and point classes from Jung v004's 1 km fractional layers, committed under `data/raw/habitat/` with version, file, md5, method and estimated-area labels; the build stays offline and only loads them. Clips per the owner's raster choice, committed the same way;
  - the provenance gate (T7): nothing cut or computed from the owner's COG is published unless its provenance is confirmed; the default is v004 by URL;
  - attribution entries for every new table and derived field (T5);
  - browser spatial lessons with E2E;
  - PostGIS lessons as "run it in your own PostGIS" pages, kept working by a script that runs their SQL against `critwire_dev` (D's architecture designs it). It starts with F1's capability check and refuses to run if it fails; the raster parts need a superuser session or `GRANT SET ON PARAMETER` (F1). Postgres can't read the checkout (F12).
- **Order:** C before D. D uses C's tables only where §7 says so.

#### T10. Section 8 items the design already raises (each with a recommendation and its cost)

- **Datasets to add first:** section 1's top three.
- **Browser access to the raster:**
  - **Expected recommendation:** (c) precomputed summaries, plus (b) small regional clips hosted on critwire, with credit. No server, a few MB, nothing billed to the owner.
    - (c) is computed once by `pnpm ingest habitat` and committed under `data/` (T5), never by the build. Its price: up to 695 MB from Zenodo per refresh, the time E3c measures, and the error E3c measures, stated beside the numbers.
    - (b)'s clips are ingest output too, cut from the COG only if its provenance is confirmed (T7), else from the v004 composite (a one-off 2.45 GB download).
  - (a) bucket CORS: an S3 CORS rule (`AllowedOrigins https://critwire.com`, `AllowedMethods GET HEAD`, `AllowedHeaders Range`, `ExposeHeaders Content-Range Content-Length ETag Accept-Ranges`), with egress on the owner's AWS at E4's measured per-learner bytes.
  - (d) TiTiler: CORS works (F7), but it's a server outside critwire, with cold starts of about 4 s and the owner's Lambda costs.
  - The spike's numbers decide.
- **Learner-side PostGIS raster lessons:** whether they may read the owner's bucket (egress per learner at E2/E3 bytes; only after provenance is confirmed) or only critwire's clip and their own v004 download.
- **Committing the `spatial` extension:** about 23.6 MB per DuckDB upgrade (A1 §10 item 11).
- **The COG's provenance** (T7): which Zenodo version and file `habitat_cog.tif` was made from, and how it was reprojected. Recommendation: answer it if known, since it lets D cut clips from the COG; otherwise D uses v004 by URL and loses nothing but the 2.45 GB download for clips.
- **Publishing occurrence points:** a new public file. It changes no DOI counts by itself when sampled as F9 says; the usual refresh applies when `ingest gbif` changes the counts.
- **Whether to send the IUCN request.**
- **WDPA and IUCN stay learner-download only.** WorldClim and CHELSA depending on their quoted terms.

#### T11. Failure modes and fallbacks (for the Steps' Failure modes)

| Risk | Fallback |
|---|---|
| `LOAD spatial` or WKB geometry fails in WASM v1.5.6 | GeoJSON text plus `ST_GeomFromGeoJSON` (json extension, 0.8 MB); if spatial itself fails, those lessons move to the learner's PostGIS and §4 says so |
| 10m shapes exceed the 700 MB memory budget at 4× | 50m or prep-time simplified shapes; record the size and memory of each |
| A raster `SET` is refused or ineffective (F1) | `pg.ts` refuses the run with the `SHOW` values; nothing runs with outdb off. Fix the connection (superuser socket), never `ALTER` |
| PostGIS can't read overviews: any value or histogram mismatch in E3b, an error or a refusal | overview reads go through geotiff.js (Node, or `ST_SetValues` windows in PostGIS); §4's PostGIS lessons read full resolution on small polygons only |
| E3c's fetched classes don't sum to the full fraction scale | fetch the missing members it names; if the scale can't be read (F3, S), record it and give E3c only relative differences |
| Zenodo refuses `Range`, or a member's CRC-32 doesn't match | record it; E3c downloads the whole zip once into `downloads/` (695 MB, md5 checked, deleted after; within the 2 GB budget) |
| The COG's provenance stays unconfirmed (T7) | the default: v004 by URL for everything published; §8 records the question |
| PostGIS can't open a local file (F12) | pass bytes (`ST_FromGDALRaster`, `ST_SetValues`); never `chmod` |
| `ST_AsGDALRaster(…, 'COG')` fails or isn't a valid COG | `'GTiff'` with `TILED=YES`, `COMPRESS=DEFLATE`; geotiff.js reads tiled GeoTIFF too; record |
| Clip overviews come out non-nearest | `RESAMPLING=NEAREST`; the codes-subset check catches it |
| geotiff.js loads the whole 6.9 MB tile index from S3 | price it into option (a); critwire-hosted clips don't have the problem |
| S3 unreachable, or the COG's ETag changed | experiments fail loudly; record it; the runner refuses a changed ETag (T3) |
| IUCN archive unreadable | mark quotes unverified; handoff item (`Blocks: nothing`) |
| Jung version not determinable | §8 item (no handoff: D defaults to v004); the COG's hostability by the decision rule |
| A license is unclear | not hostable, said so in §1 |
| Spike over 2 GB | delete extracted zips; clips only |
| `pnpm build` changes, or `critwire_dev` is broken by spike objects | guard each step: `dist/` hash list compare (Baseline) and schema isolation (F11) |
| Caddy on 3102 while `pnpm e2e` runs | `serve.ts` refuses (A1) |

#### T12. Work units, in order (each sized for one session; the planner turns them into Steps)

1. **Scaffold:** copy A1's pieces with provenance, pins, install (record build scripts), `build-site` with the spatial mirror, `serve`. Then `run-queries` on a skeleton 003 holding the `setup` block and one A1 lesson block, whose result must equal 002's (proves the copy).
2. **COG and Jung:** `cog.ts`, `tile-bytes.ts` (index download), T7 (code lists, composite headers, the exclusion test, the gate's inputs for §5/§8).
3. **PostGIS:** `learn_spatial`, `pg.ts` (capability check first, then session settings and byte counters), E2 and E3.
4. **Overviews and methods:** E3b (value-checked against geotiff.js) and E3c (the three area methods, v004 members by Range).
5. **E4:** the clip cut and validation, the browser read, the S3 price via geotiff.js in Node.
6. **E1:** shapes and the GBIF sample to Parquet, the browser point-in-polygon, the PostGIS cross-check.
7. **Licenses I:** Natural Earth (admin-1, physical), RESOLVE, Jung, AnAge, AmphiBIO, EltonTraits, PanTHERIA, COMBINE, the Testudines source.
8. **Licenses II:** Wikidata, Open Tree, GBIF (via Wayback), WorldClim, CHELSA, WDPA. Sizes, join keys, the ranking.
9. **IUCN:** T8 evidence, the four cases, the draft request (003 §6).
10. **Grown schema:** `setup-grown.sql` and stand-in data, `plans/003-learn-erd.mmd`, render, `--erd` (003 §2).
11. 003 §1 write-up and §3 grown-data lessons.
12. 003 §4 spatial lessons, first half.
13. 003 §4 spatial lessons, second half, plus the IUCN lessons (on the synthetic stand-in).
14. 003 §5: the raster options with measured costs, each summary method's resolution, rule and measured error, the ingest design (T5) and the provenance gate (T7).
15. The C and D briefs, and 003 §7.
16. 003 §8, a completeness pass (every block run, every dataset quoted), and the Summary inputs.

### Rejected alternatives

- PGlite with `pglite-postgis` for PostGIS-exact browser lessons: 18.8 MB, experimental, no raster; A1 already rejected PGlite on memory.
- `ALTER ROLE critwire` / `ALTER DATABASE critwire_dev SET postgis.*` / `GRANT SET ON PARAMETER` in `critwire_dev`: persistent config for a spike; a superuser session is contained (F1). The grant is what learners are offered (their own server).
- Computing habitat summaries or clips in `pnpm build`: the build is offline and loads only `data/` (`AGENTS.md`); they're ingest output (T5).
- Worldwide summaries from the COG at full resolution: 2.25 GB of the owner's egress and 151 G cells on 2 CPUs per refresh (F2).
- Publishing nearest-overview counts as area: an overview keeps 1 pixel in k², so small and patchy classes are off (E3c); the 1 km fractional layers keep proportions per cell.
- Calling the COG's version settled from class codes: codes only exclude (F3); the gate needs the owner's statement, else v004 by URL (T7).
- v004's 100 m composite for the summaries: one 2.59 GB DEFLATE member, no Range access; the fractional layers are 695 MB, per class, and already aggregated.
- Making the spike or checkout readable by `postgres` (`chmod` on `/srv/critter-ai`): widens a private home; bytes go in by parameter instead (F12).
- `EXPLAIN (FORMAT JSON)` relation scans for labels: the registry word test suffices for a research doc (KISS, T3).
- Enabling `VRT` and `MEM` drivers: not needed for any read, transform or COG write here (F1).
- `raster2pgsql -R` tiling: the binary isn't installed and apt is out of scope; SQL windows do the job.
- GDAL tracing (`CPL_CURL_VERBOSE`, `GDAL_HTTP_PROXY`, the server log or env): refused by PostGIS or needs a restart (F6).
- A CORS proxy on the VPS so the spike browser can read S3: a server process that would misstate option (a); Node's geotiff.js measures it directly.
- Downloading Jung's 2.3–2.5 GB zips to find the version: code zips, zip directories and histograms suffice (T7).
- geotiff.js's writer for the clip: the brief forbids it (beta, uncompressed).
- A species–habitat preference table: it would come from IUCN assessments, which is Red List data (T5).
- Renaming the real trait tables to dodge lesson 16: breaks the names 002 §2 promised; moving the exercise to `my_*` is smaller (F4).
- Spike tables in `public`, or with foreign keys to `public.species`: they break `pnpm build` (F11).
- One block run in both engines: types and formatting differ; paired blocks are clearer (T3).
- Hosting the full 3.64 GB COG in `dist/`: copied on every build; a route outside `dist/` is a control-room change (priced in §5 as option b).
- Importing A1's spike modules in place: ties A2's runs to files B missions treat as read-only evidence; copies with recorded hashes don't.

## Architecture review (Fable)

Fable, 2026-10-22. Checked against the brief, `AGENTS.md`, `plans/002-learn.md` (§2 "Room to grow" :369–378, l16/l16-ex :1629–1680, ERD), `plans/002-learn-erd.mmd`, A1's spike (`scripts/plan-queries.ts:14,218`, `run-queries.ts:21,100`, `src/engine.ts:29`, `src/assets.ts:55`, `package.json`), `db/schema.sql:2`, `scripts/db.ts:38-46`, and live: `pg_available_extensions` (postgis_raster 3.4.2 installed in `critwire_dev`), `pg_settings` (postgis.enable_outdb_rasters / gdal_enabled_drivers context `superuser`, `gdal_vsi_options` `user`), `df -h` (24 GB free), `nproc` 2, COG `HEAD` (3,640,482,547 B, ETag `975827817c839f73a5ee49d2791393a4-212`), `ST_AsGDALRaster(…, 'COG')` with only `'GTiff COG'` enabled (works, 1260 B). F1–F11 hold; F4 and F11 are real and correctly fixed. No IUCN data enters the repo, spike or db; Natural Earth / Jung / AnAge / AmphiBIO / WDPA / IUCN flags match the sources cited.

Verdict: APPROVE WITH CHANGES

### MUST-FIX

1. **"Build-time summary from the COG" breaks the offline build rule.** T5 (`country_habitats`), T6 and T10 (option c) say the per-country habitat summaries are computed at build time. `AGENTS.md`: `pnpm build` is offline and only loads committed snapshots; ingest scripts fetch and commit. Fix: make the summaries an ingest step (`pnpm ingest habitat`-style) whose output is committed under `data/` with the Jung version, COG ETag and method recorded; the build loads it. Say so in T5, T10 and mission D's brief, and price the one-off ingest honestly: full resolution worldwide is 388,996² cells (151 G), so it runs on an overview level or Jung's 1 km fractional layers, which E3b decides.
2. **E3b can pass on wrong data.** A PostGIS out-db band reads `width × height` file pixels from the computed offset at the file's own resolution; it doesn't resample. An empty raster with k × 103.02 m pixels may silently return the top-left full-resolution block, not the ÷k overview, with no error and with "small" bytes. Fix: E3b must compare values (the window's class histogram against a geotiff.js read of the same overview window, and the ÷1024 histogram from F3), not bytes alone; any mismatch means "PostGIS can't read overviews" and the fallback applies.
3. **The per-session `SET` fails silently in a fresh session.** Verified as role `critwire`: `SET postgis.enable_outdb_rasters = on` before any raster function succeeds as a placeholder, then is dropped once `rtpostgis` loads (`SHOW` → `off`); `SET` after a raster call gives `permission denied`. As superuser the placeholder path also hides typos. Fix (fail fast): `pg.ts` and every lesson/PostGIS setup block call a raster function first (e.g. `SELECT postgis_raster_lib_version()`), then `SET`, then assert `SHOW postgis.enable_outdb_rasters = 'on'` and `gdal_enabled_drivers` contains `COG`; the runner refuses the run otherwise, and the learner-side text explains it.

### MISSED

Covered by MUST-FIX 1 and 3; nothing else important.

### SHOULD-CONSIDER

- Learner-side PostGIS: PG 15+ has `GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers TO <role>`; offer it beside "superuser or `ALTER DATABASE … SET`" so learners don't run lessons as superuser.
- T3's `EXPLAIN (FORMAT JSON)` relation scan for labels is more than a research doc needs; the whole-word test over the registry names (A1's method, generalised) suffices (KISS).
- `ST_AsGDALRaster(…, 'COG')` works with `'GTiff COG'` alone (checked); drop VRT/MEM and that (S).
- `ran` blocks that read the COG make Verification depend on S3; keep them few (one per raster lesson) and name that dependency in Verification, with the ETag check as designed.
- E1's GBIF sample: pick the 3 species by fixed `species.id`, save request URLs in `downloads/SOURCES.md`, so the sample is reproducible and mission D can regenerate it.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Offline build violation (T5/T10).** Remote COG summaries must be produced during ingest and committed under `data/`, with provenance. Builds must consume those snapshots without network access.
2. **Insufficient raster correctness gate (E3b).** Bytes transferred cannot establish that an overview was read correctly. Require pixel/window agreement with an independent reader before using that path for published summaries.
3. **Misleading habitat areas (T5/E3b).** Nearest-neighbour overview counts do not preserve full-resolution habitat proportions. Define resolution, aggregation method and approximation explicitly; do not publish these as unqualified “true area.”
4. **Unresolved raster provenance (T7).** Excluding candidate versions by class codes does not establish the source version or complete attribution. Gate publication of clips and summaries on confirmed provenance; otherwise use an explicitly identified, licensed upstream release.

SHOULD-CONSIDER:

- Make raster capability checks a prerequisite for both the spike and learner setup; fail before queries if required settings are ineffective.
- Define how occurrence samples contribute to the existing GBIF DOI accounting without replacing country-derived counts or double-counting records.
- Specify attribution links for every new table and derived field, especially sampled habitat codes.

## Revision notes

Architect, 2026-10-22, one round. All MUST-FIX resolved by design changes; none disputed.

MUST-FIX:
- **Fable 1 / Astra 1 (offline build):** T5's new block "Raster-derived data is ingest output": `pnpm ingest habitat` (mission D) commits `data/raw/habitat/snapshot.json` (+ clips) with version, file, md5, method, shapes sha256 and gbif `retrieved`. Derive refuses it as stale; the build only loads it. Mirrored in T6, T9 (D), T10 (b)/(c). Priced: F2's new bytes-per-level table; full resolution rejected (2.25 GB egress, 151 G cells); default input is v004's 1 km fractional zip (695 MB from Zenodo, no owner egress); the COG ÷8 (97 MB) is a labelled fallback only. E3c decides the method; E3b only decides which reader handles overviews.
- **Fable 2 / Astra 2 (E3b by values):** E3b rewritten. It passes only if the class histograms and 100 sampled cells equal geotiff.js's read of the same ÷k window, and ÷1024 equals F3's histogram. Any mismatch, error or refusal means "PostGIS can't read overviews", and geotiff.js takes over. A second attempt via `GTIFF_DIR:` is added (S). T11 row.
- **Fable 3 (silent `SET`):** F1 now records the facts. Fable's non-superuser drop; a superuser typo accepted silently (checked). F1 also defines the capability check: raster function first, then `SET`, then assert `SHOW` `on` and `COG`. It applies in `pg.ts` (refuses the run, T3), in 003's `pg-session` block with the learner text, in D's lesson script (T9) and in an ingest that uses PostGIS (T5). T11 row.
- **Astra 3 (overview counts aren't area):** E3c compares, per class, full resolution, ÷8/÷16 (named as a 1-in-k² sample) and v004 1 km fractional (Σ fraction × geodesic cell area; error in border cells). Each method's resolution, rule and measured error goes in 003 §5. `country_habitats.area_km2 (true area)` becomes `est_area_km2` (labelled estimated; method in the source entry). `occurrences.habitat_code` is defined as the most common class in the 1 km cell. T5, T6, T12 unit 14.
- **Astra 4 (provenance):** F3: codes exclude, never confirm. T7 step 4 is a gate. COG-derived publications need the owner's statement of version, file and processing, plus no exclusion; otherwise everything published comes from v004 by URL (Zenodo 4058819, CC BY 4.0, md5). That's D's default, so it's a §8 item, not a handoff. T9, T10, T11.

New in the revision: **F12** (Postgres can't read `/srv/critter-ai`, so local rasters go in as bytes: `ST_FromGDALRaster` / `ST_SetValues`, both checked).

SHOULD-CONSIDER adopted (all cheap):
- `GRANT SET ON PARAMETER` offered first to learners. Verified on PG 16 in a rolled-back transaction (F1, T9).
- VRT/MEM dropped. `'GTiff COG'` covers the out-db read, `ST_Transform`, the COG write and `ST_FromGDALRaster` (F1).
- E1's sample: species fixed by `species.id`, the repo's `OCCURRENCE_FILTERS`, every URL saved (T4).
- One live COG `ran` block per raster lesson; the rest read in-db clips (`spike-table`). S3 is named as a Verification dependency (T3).
- GBIF DOI: the sample is drawn in the same `ingest gbif` run with the countries filters, so it's a subset of `contributions.json`; derive asserts it, and no extra refresh is needed (F9, T5, T9, T10).
- Credits: a Credit column per new table and derived field, checked by the build's existing source checks (T5).
- Labels by the registry word test only; no `EXPLAIN` (T3).
- Astra's "capability checks as a prerequisite": the same as Fable 3.

Declined: none.

## Steps

Planner, 2026-10-22. T12's 16 units in order, split where one session can't hold them, plus the run-queries extension (T3, S12–S13), placed after E1 because `pg-setup` loads E1's Parquet and E4's clip. Conventions:
- `W=/srv/critter-ai/worktrees/critwire-learn-spatial-design`, `M=/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design`, `SP=$M/spike`, `A1=/srv/critter-ai/agent-state/missions/critwire-learn-design/spike` (read only), `P=plans/003-learn-data-spatial.md`, `ERD=plans/003-learn-erd.mmd`, `COG=https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif`, `ETAG='"975827817c839f73a5ee49d2791393a4-212"'`. The spike lives only in `$SP`, never committed; every command a step runs goes, in order, into `$SP/README.md`.
- One step per session: commit the plan and any `plans/` file with the check-off and one Log line, then push. Deviations go on the step's line ("Deviations (Decisions, Sn): …") and under Decisions.
- **Guard** (end of every step):
  - `git -C $W diff --name-only origin/main...HEAD | grep -v '^plans/'` prints nothing; `git -C $W diff --quiet origin/main...HEAD -- plans/002-learn.md plans/002-learn-erd.mmd` (002 untouched);
  - `pnpm typecheck && pnpm test` (66 pass; no lint script, so typecheck is the static check);
  - build guard: `rm -rf dist && pnpm -s build && (cd dist && find . -type f | sort | xargs sha256sum) | diff - $SP/baseline/dist.sha256` prints nothing (also catches a `learn_spatial` object that breaks the build, F11);
  - `du -sb $SP` under 2,000,000,000, logged; `pgrep -af "$SP/Caddyfile"` empty; ports 3100–3102 free.
- **Spike green:** `pnpm -C $SP typecheck && pnpm -C $SP test`. New tests (Failure modes) are written first and seen red; the red count goes in the Log.
- **003 SQL changes:** `node $SP/scripts/build-site.ts`; `node $SP/run-queries.ts $W/$P --update`; read the diff (results change only where the step meant them to); then `node $SP/run-queries.ts $W/$P --check` exits 0 (with `--erd $W/$ERD` from S18 on). Result blocks are written only by `--update`.
- **PostGIS:** only `SPIKE_PG_URL=postgresql:///critwire_dev` (critter-ai over the socket, F1), only through `scripts/pg.ts` and its capability check, only schema `learn_spatial` (F11). Never `.env`'s `DATABASE_URL` for the spike, never the `critwire` db, never `ALTER ROLE|DATABASE|SYSTEM`, `GRANT` or `chmod` (F12).
- **S3, read only:** every COG read is a Range GET with `If-Match: $ETAG` through `cog.ts`'s one fetch function (it counts bytes); a `200` or `412` aborts. Never the whole file. Each run's bytes go in its `bytes.json`.
- **Network:** Zenodo, GBIF and TiTiler at ≤ 2 req/s. Each download in its own new `$SP/downloads/<name>/`, recorded in `downloads/SOURCES.md` (URL, UTC, sha256); zips and extracted members deleted once their sha256 is recorded. Python only as `python3 -I`, scripts outside download dirs. No apt: an unavoidable package is a handoff item.
- **No IUCN data:** no IUCN download, API call or file anywhere. Only the terms and spatial-data pages (T8), saved under `evidence/licenses/iucn/`. Wikidata is queried for named properties only, never whole entities: its P141 ("IUCN conservation status") is a Red List category.
- **Browser runs:** the spike's playwright 1.58.2 (`channel: "chromium"`, headless) through `scripts/browser.ts` (route guard: only `127.0.0.1:3102`); desktop and 4× CPU (`CPUQuota=25%`), 3 runs each, median and max; never while `pnpm e2e` runs; heavy runs one at a time.
- **Run output:** `$SP/out/<run>/summary.md`, `env.txt`, `bytes.json`; browser runs add `<profile>/results.json` (`blocked`: array, `failures`: number), screenshots and `caddy-access.log`.
- **003 conventions** (Verification greps them):
  - title, then `## 1. Growing the data` … `## 8. For the owner` as T1, then `## Disagreements with 002`;
  - §1 entries `### D<n> · <dataset>` in rank order, each with `**Enables:**`, `**License:** <name> · <URL> · retrieved <UTC> · evidence/licenses/<dir>/`, the verbatim quote as `> ` lines, `**Hostable:** yes | no | learner download only`, `**Size:**`, `**Joins on:**`, `**Ingest work:**`; the reptile source's heading ends `(Testudines)`;
  - grown-data lessons continue 002's path from 17: `### Lesson <n> · <slug>`, ids `l<nn>`, `l<nn>-<word>`, `l<nn>-ex`, `l<nn>-check`, each with `**Data:** runs today` or `**Data:** spike stand-in; waits for mission C` (or D);
  - spatial lessons `### Spatial lesson <n> · <slug>` (ids `s<nn>…`), IUCN lessons in §6 `### IUCN lesson <n> · <slug>` (ids `i<nn>…`), each with `**Runs in:** browser (DuckDB spatial) | browser (geotiff.js) | your own PostGIS` and `**Evidence:**` naming its `out/<run>/`;
  - every lesson has `**Shown as:**`, `**Check:**` and one `<stem>-ex` block; a PostGIS twin of a DuckDB block takes the same id plus `-pg`;
  - other ids: `setup` and `setup-counts` (002's), `setup-grown`, `setup-grown-counts`, `pg-session`, `pg-setup`, `pg-setup-counts`, `d<nn>` (§1 join checks), `r<nn>` (§5);
  - ages 16+; no counts in prose; no Wikipedia prose; records, not native range; raster areas labelled **estimated**; at most one live COG read per `###` section (T3, enforced by RP13).
- **Decisions:** every pin, every species, point and polygon pick, every fallback taken (T11), E3b's verdict and the ranking, each with its reason.
- **Contingencies:** Failure modes say what each experiment does when it fails: record it and carry on. A step that outgrows its session is split per the mission rules.

- [x] S1 · Spike scaffold, and proof the copy reproduces A1 (T2, T12 u1; F10). Deviations (Decisions, S1): `spatial` mirrored for wasm_mvp too; no wasm_threads; `setup-counts` keeps `draft-table` until S12.
  - Copy from `$A1` with `cp`; each file's A1 path and sha256 (source and copy) go in README's provenance table:
    - `scripts/`: paths.ts (`BASELINE_V1` → `$SP/baseline/live/v1`, `DRAFT_V1` → `$SP/data/v1`), serve.ts, browser.ts (keeps the CPUQuota launcher), env.ts, build-site.ts, plan-queries.ts, runner-client.ts, erd.ts, erd-model.ts; the VmHWM probe cut from measure.ts into `scripts/vmhwm.ts`;
    - `scripts/run-queries.ts` → `$SP/run-queries.ts` (imports `./scripts/…`, `./src/…`);
    - `src/`: engine.ts, sql.ts, format.ts, cards.ts (its `sources.ts` import repointed to `$W/scripts/build/sources.ts`), assets.ts (trimmed to DuckDB: no PGlite, sql.js or shell; build-site.ts likewise), runner-page.ts, runner-api.ts, runner.html, setup.sql, the `*.d.ts` files, both tsconfig.json;
    - `test/`: sql, cards, run-queries (script path updated), erd and erd-drift tests with `test/fixtures/{run-queries,erd}/`;
    - `Caddyfile` (only root, log and port differ from `$W/e2e/Caddyfile`'s live block: diff them);
    - `$A1/draft/v1/countries.{parquet,json}` → `data/v1/`; `$A1/downloads/duckdb-ext-v1.5.6/` (parquet and spatial, wasm_eh and wasm_mvp) and `naturalearth-v5.1.2/` → `downloads/`, each sha256 checked against `$A1/downloads/SOURCES.md`.
  - `package.json` with T2's exact pins (`postgres` 3.4.9, the repo's lock) and scripts `typecheck`, `test`; `pnpm-workspace.yaml` (`allowBuilds: esbuild` only; A1's release-age excludes); `pnpm install`. Any "ignored builds" line (geotiff's deps) → Decisions.
  - `build-site.ts`: `spatial` (wasm_eh) joins the extension mirror; `data/v1/*` → `site/v1/`; `clips/*` → `site/learn/spike-data/`.
  - `data/spike-tables.json` (T3 registry) with its first entry, `countries` (A1's draft).
  - Create `$P`: title; one paragraph (built on 002; designs, builds nothing public); the eight section headings and `## Disagreements with 002`; in §2, 002's `setup` and `setup-counts` blocks with `setup-counts`' result block, byte for byte.
  - Checks:
    - Guard; spike green (SQ, CR, RQ, RQE, ER pass with no edits beyond paths);
    - copy proof: `node $SP/run-queries.ts $W/plans/002-learn.md --check --erd $W/plans/002-learn-erd.mmd --log $SP/out/a1-recheck/queries.log --out $SP/out/a1-recheck` exits 0;
    - `node $SP/run-queries.ts $W/$P --check` exits 0 without `--update` (002's recorded result) and writes `$M/queries.log`;
    - under `serve.ts`, `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/spatial.duckdb_extension.wasm` answers 200, `application/wasm`, 23,626,951 bytes.

- [x] S2 · COG header reader and tile index (F2; T4 "common"). Deviations (Decisions, S2): `cog.ts` is a library; `tile-bytes.ts` is the one CLI and writes both summaries.
  - Tests first, red: CG1–CG10 in `test/cog.test.ts`. Fixtures: the COG's first 262,144 bytes (`test/fixtures/cog/head.bin`, one Range read) and truncated or altered copies of it.
  - `scripts/cog.ts`: the one S3 fetch (Range + `If-Match`, counting; `200`/`412` abort); TIFF/BigTIFF IFDs, GeoKeys, GDAL metadata, ghost area; pixel ↔ EPSG:3857 ↔ lon/lat; tiles a window touches at a level.
  - `scripts/tile-bytes.ts`: the TileByteCounts of all 11 IFDs by Range (≈ 3.1 MB) into `downloads/cog-index/`; `lowerBound(window, level)`.
  - → `out/cog/summary.md` (F2 re-derived), `out/tile-bytes/summary.md` (bytes per level).
  - Checks: Guard; spike green; the script asserts every F2 number (size, tiling, DEFLATE, EPSG:3857, origin, pixel, 10 overviews, ghost area, `OVR_RESAMPLING_ALG=NEAREST`, the bytes-per-level table) and exits 0; (−60, −3) → col 129665, row 197741, tile 293,613 of 43,789 B; S3 bytes for the step < 15 MB.

- [x] S3 · Jung's version and level; zip members by Range (T7, F3). Deviations (Decisions, S3): composite headers inflated from ≈ 1.05 MB of compressed bytes, not 64 KB; code zips held in memory, never written; v001's code lists from `styles/level2.clr` inside its composite zips.
  - Tests first, red: ZP1–ZP6 (`test/zip-range.test.ts`, fixture zips made with `python3 -I` `zipfile`: stored, deflated, ZIP64 forced) and JG1–JG5 (`test/jung.test.ts`).
  - `scripts/zip-range.ts`: end-of-directory and ZIP64 from the last 64 KB; local header check; member by Range; inflate; CRC-32 and size checks.
  - `scripts/jung.ts` → `out/jung/`:
    - level: class histograms of the ÷256 (9 tiles) and ÷1024 levels, read with geotiff.js 3.0.5 in Node (counting `fetch`, `If-Match`);
    - every version's record (001, 001_full, 002, 002_v2, 003, 004) via the Zenodo API; code zips (`downloads/jung-code-<ver>/`, md5 against the API): code lists, v004's legend → `out/jung/legend-v004.csv`, the fraction-value scale (or "not found", FS3);
    - each composite zip: its directory (last 64 KB) and its tif's first 64 KB inflated → size, pixel, CRS, nodata, data type, metadata;
    - v004 `lvl2_frac_1km_ver004.zip`'s directory → `out/jung/frac-members.json` (name, code, offsets, sizes, CRC; S7 reads it);
    - `out/jung/exclusion.md` (per version: excluded and why, or "not excluded") and `out/jung/gate.md` (T7 step 4: provenance unconfirmed; whether 001 and 002, CC BY-NC, are excluded; §5 and §8 inputs).
  - Checks: Guard; spike green; the ÷1024 histogram equals F3's (56 values; 1102: 51,850, 803: 32,470, 900: 19,989); no response body larger than its Range; Zenodo plus S3 bytes < 25 MB; no `.zip` left under `downloads/`.

- [x] S4 · PostGIS session, `learn_spatial`, E2 (F1, F6; T4 E2). Deviations (Decisions, S4): `outdbWindow` is `windowForBox`/`windowForPoint` + `outdbRaster(grid, window)`; rchar is no network bound (relabelled file reads); settings read with `current_setting()`, timeout via `pg_settings` ms.
  - Tests first, red: PG1–PG9 (`test/pg.test.ts`, live on `critwire_dev` via `SPIKE_PG_URL`) and VC1–VC6 (`test/compare.test.ts`).
  - `scripts/pg.ts`: connect (PG1, PG2); F1's capability check (`postgis_raster_lib_version()`, the two `SET`s, both `SHOW`s asserted); `search_path = learn_spatial, public`, `statement_timeout = '60s'`; `outdbWindow(bbox, level)` (grid-aligned empty raster + `ST_AddBand` on `/vsicurl/$COG`); byte counters (`sudo ss -tinpH` by `pg_backend_pid()`, `/proc/<pid>/io` `rchar`).
  - `scripts/compare.ts`: point, histogram and grid-cell comparison (VC).
  - `CREATE SCHEMA learn_spatial` through pg.ts; nothing in it refers to `public` objects.
  - `scripts/e2-point.ts` → `out/e2-point/`: 10 points: (−60, −3) near Manaus, plus 9 picked to cover ≥ 5 level-1 classes, one at ≥ 60° N, one marine (9xx) and one nodata cell (coordinates in README and Decisions; E1's sample doesn't exist yet, S11 adds its points). Three readers: PostGIS out-db 1×1, geotiff.js in Node over S3, TiTiler `/cog/point`. Cold (fresh backend or process) and warm, 5 runs; bytes against the tile lower bound; time.
  - Checks: Guard; spike green; the three readers agree on all 10 points (nodata as nodata, VC4); (−60, −3) = 1405; every cold PostGIS read's bytes ≥ its lower bound.

- [x] S5 · E3: zonal statistics and Mercator area (T4 E3). Deviations (Decisions, S5): TiTiler at `max_size=1024` (full resolution 500s on its Lambda); ellipsoid per-row column added; method 4 warps the window, then clips in 6933.
  - `scripts/e3-zonal.ts` → `out/e3-zonal/`: Trinidad and Tobago (`TT`) and one Natural Earth 10m polygon near 60° N under about 5 M full-resolution cells (pick in Decisions). Out-db window over the bbox; `ST_ValueCount(ST_Clip(rast, ST_Transform(geom, 3857)))`; area four ways (T4 E3, 3.1–3.4); bytes and time; TiTiler `/cog/statistics?categorical=true` for the same polygon, with the resolution TiTiler read.
  - Checks: Guard; spike green; the summary states each polygon's nominal-Mercator ÷ geodesic ratio against sec² φ at its centroid; a gap over 2 % between per-row-cos φ cell area and `ST_Area(geom::geography)` is explained before checking off; TiTiler's differences explained.

- [x] S6 · E3b: overview reads in PostGIS, judged by values (T4 E3b). Deviations (Decisions, S6): attempt 2 run two ways (2p pixel coordinates, 2g level grid); whole ÷1024 level added as a fifth window; a PostGIS WARNING fails a window; E3b code in `e3b-overviews.ts`, polygons in `polygons.ts`.
  - `e3-zonal.ts --overviews` → `out/e3b-overviews/`: attempt 1 (empty raster at k × 103.02 m + out-db band) and attempt 2 (`GTIFF_DIR:<n>:/vsicurl/…`, pixel coordinates), each at ÷8 and ÷1024 over S5's bboxes. Reference: geotiff.js `getImage(n)` + `readRasters({ window })` of the same window; ÷1024 also against F3's histogram. `compare.ts`: histograms and 100 grid cells.
  - The verdict, `PostGIS reads overviews: yes (attempt <n>) | no`, in the summary and under Decisions; bytes and time either way.
  - Checks: Guard; spike green; the verdict follows VC6 (any mismatch, error or refusal = no); geotiff.js at ÷1024 = F3.

- [x] S7 · E3c: three area methods per class (T4 E3c). Deviations (Decisions, S7): members held in memory, never written (Node zlib, as S3); centre mask clipped once per polygon, `ST_SetValues` route cross-checked on the largest class; 1e column, 3 compared with 1e; T11 stage 2 fetched all 79 members; overlay classes 901, 1000–1004 out of the self-check and totals; windows cached + `--offline`.
  - Tests first, red: FS1–FS5 in `test/e3c.test.ts`.
  - `scripts/e3c-methods.ts` → `out/e3c-methods/`, for S5's two polygons:
    - method 1: full resolution × (103.02 · cos φ_row)² (S5's counts);
    - method 2: ÷8 and ÷16 counts × k² × (103.02 · cos φ_row)², read by S6's verdict (PostGIS if yes, else geotiff.js windows loaded with `ST_SetValues`);
    - method 3: v004 1 km fractions. Only the members whose class is in method 1's histogram, one at a time, by `zip-range.ts` from `out/jung/frac-members.json`; inflate; CRC; geotiff.js windows; `ST_SetValues` into a temp raster; Σ fraction × geodesic cell area, centre-in-polygon; each member deleted after use, sha256 recorded.
  - Per class: absolute and relative difference of methods 2 and 3 from 1; classes under 1 % flagged; border-cell share; bytes; time per member and per cell (D's ingest estimate).
  - Checks: Guard; spike green; the fraction self-check passes on every land cell (else T11's path, recorded); `results.json` holds 3 methods × 2 polygons; `find $SP/downloads -name '*frac*'` lists only the directory record.

- [x] S8 · E4, part 1: the clip cut by PostGIS and validated; option (a)'s price (T4 E4). Deviations (Decisions, S8): CV4 judges nearest by value, level by level (the COG driver records no `OVR_RESAMPLING_ALG`); "full-file codes" = Jung v004's legend; `assertPyramid` also takes the COG driver's ⌊previous / 2⌋; CV5 adds the full histogram and a centre-rule content check; COG fallback not needed.
  - Tests first, red: CV1–CV6 in `test/clip.test.ts`.
  - `scripts/e4-clip.ts` (cut) → `clips/cr.cog.tif`, `out/e4-clip/`: Costa Rica (`CR`) out-db window; `ST_AsGDALRaster(ST_Clip(rast, geom), 'COG', ARRAY['COMPRESS=DEFLATE', 'BLOCKSIZE=256', 'RESAMPLING=NEAREST'])`; validated by `cog.ts` (ghost area, tiles, overviews, EPSG:3857, nodata 0, `OVR_RESAMPLING_ALG=NEAREST`, codes ⊂ the full-file histogram) and 100 grid cells against PostGIS `ST_Value`; cut time, S3 bytes, clip size. Fallback `'GTiff'` with `TILED=YES`, `COMPRESS=DEFLATE` (T11), recorded.
  - `e4-clip.ts --s3-price` → `out/e4-s3/`: geotiff.js in Node against S3 (counting `fetch`), the same 256 × 256 window at full resolution and one overview, cold; whether it loads IFD 0's 6.9 MB tile index whole; per-learner bytes for option (a).
  - Checks: Guard; spike green; validation passes.

- [ ] S9 · E4, part 2: the browser reads the clip (T4 E4).
  - `src/raster-page.ts` + `raster.html` (geotiff.js bundled by build-site's esbuild): `fromUrl('/learn/spike-data/cr.cog.tif')`, `getImageCount`, `getImage(0)` and one overview, `readRasters({ window })` for 256 × 256; a class histogram table and a canvas preview.
  - `e4-clip.ts --browser [--smoke]` → `out/e4-browser/`: desktop and 4×, 3 runs each; per-request bytes and `Range` from Caddy's log; time; VmHWM; screenshots at 1280 and 375 px. `--smoke`: desktop, one run → `out/smoke/e4-browser/`.
  - Checks: Guard; spike green; Range requests get 206 with `Content-Range` and no `Content-Encoding` (otherwise a control-room item, T4); the browser's histogram = Node geotiff.js's for the same window (`compare.ts`); `blocked` empty, `failures` 0.

- [ ] S10 · E1, part 1: country shapes and the GBIF sample as Parquet (T4 E1; F9).
  - Tests first, red: GB1–GB5 in `test/gbif-sample.test.ts`. Copy A1's `scripts/countries-draft.ts` (the matching rule, 002 §6) with its CD tests and fixtures, sha256 in README.
  - Node DuckDB `spatial` (`linux_arm64`, v1.5.6, F5) into `$SP/duckdb-ext-node/` via `SET extension_directory`; the file in `downloads/duckdb-ext-node/` with its sha256.
  - `scripts/e1-data.ts` → `data/v1/country_shapes.parquet` (10m) and `country_shapes_50m.parquet` (`country_code`, WKB `geom`), one shape per code by A1's rule.
  - `scripts/gbif-sample.ts` → `data/v1/occurrences.parquet`: 3 species fixed by `species.id` (one per class, `range.status` ok; ids and `ids.gbif` in README and Decisions), ≤ 300 records each, the repo's `OCCURRENCE_FILTERS` copied (GB1) plus `checklistKey` and `taxonKey`, ≤ 2 req/s. Every URL and response in `downloads/gbif-sample/` and SOURCES.md. Rows keep `gbifID`, `datasetKey`, `license`, lon/lat, `countryCode`, `year`. Research only: never published.
  - Registry entries: `country_shapes`, `occurrences`.
  - → `out/e1-data/summary.md`: sizes, row counts, codes without a shape at each scale, GB4's report against `contributions.json`.
  - Checks: Guard; spike green; every species code has a 10m shape (50m gaps listed); every sampled license is CC0 1.0 or CC BY 4.0.

- [ ] S11 · E1, part 2: point-in-polygon in the browser, cross-checked in PostGIS (T4 E1; F5).
  - `src/pip-page.ts` + `pip.html`: `LOAD spatial` from the mirror (autoinstall and autoload off, signatures on); both Parquet files; `ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))` counts per country against GBIF's `countryCode` (agree, disagree, no polygon).
  - `scripts/e1-pip.ts [--smoke]` → `out/e1-pip/`: 10m and 50m × desktop and 4×, 3 runs each; extension bytes and `LOAD` time, file bytes, query time, VmHWM against A1's 700 MB budget; screenshots. `--smoke`: 10m, desktop, one run → `out/smoke/e1-pip/`. Fallbacks per T11 (GeoJSON text; 50m or simplified), recorded.
  - `src/pg-setup.sql`, first version: `learn_spatial.country_shapes` and `.occurrences` from the same Parquet bytes (F12). The same query in PostGIS gives the same counts.
  - F5 checks: one point exactly on a polygon boundary through `ST_Contains` in both engines, and `ST_Covers` in PostGIS; the habitat value at each sampled species' first point, PostGIS out-db = geotiff.js.
  - Checks: Guard; spike green; counts equal across engines; `blocked` empty, `failures` 0.

- [ ] S12 · run-queries, part 1: statuses, registry, `LOAD spatial`, `setup-grown` (T3).
  - Tests first, red: RS1–RS9; A1's `draft-table` fixtures (RQ6–RQ9) are removed as RS2–RS5 replace them.
  - `plan-queries.ts` and `run-queries.ts`: `Status = "ran" | "spike-table" | "untested"`; labels by the registry's whole-word test plus `getTableNames`; `-- engine:` parsed (postgis blocks refused "engine not available" until S13); boot: `LOAD spatial` from the mirror, `setup.sql`, then `setup-grown.sql` when the plan has a `setup-grown` block (byte-equal).
  - 003: `setup-counts` relabelled `spike-table` (it reads `countries`).
  - Checks: Guard; spike green; 003 `--check` exits 0; regression: `sed 's/^-- status: draft-table$/-- status: spike-table/' $W/plans/002-learn.md > $SP/scratch/002.md`, then `node $SP/run-queries.ts $SP/scratch/002.md --check --erd $W/plans/002-learn-erd.mmd --log $SP/out/a1-recheck-s12/queries.log --out $SP/out/a1-recheck-s12` exits 0.

- [ ] S13 · run-queries, part 2: the PostGIS engine (T3; F1, F12).
  - Tests first, red: RP1–RP13 (fixture plans with `-- engine: postgis` blocks).
  - One pg.ts connection per run (capability check, search_path, timeout). `src/pg-setup.sql` (= the `pg-setup` block) on connect: rebuilds only `learn_spatial`, idempotent; Parquet and `clips/*.cog.tif` bytes passed as parameters (`ST_FromGDALRaster` into `learn_spatial.habitat_clips`, F12). Every block in `BEGIN … ROLLBACK`, statement by statement; A1's `Result` mapping; `geometry`, `raster` or `bytea` columns fail. The COG's ETag by `HEAD` before any block that reads `/vsicurl/`.
  - Log header, after A1's `engine:` line: `postgis: <postgis_full_version()>` and `cog: <url> · etag "<etag>"`.
  - Registry: every `learn_spatial` table.
  - 003 §4: the `pg-session` block (`ran`; ends with a `SELECT` of both `SHOW` values), `pg-setup` and `pg-setup-counts`.
  - Checks: Guard; spike green; `--update` diff read, `--check` exits 0; `grep -E '^(engine|postgis|cog): ' $M/queries.log` shows the three lines; a second run gives the same `pg-setup-counts`.

- [ ] S14 · Licenses, part 1 (T1 §1; F8).
  - Tests first, red: LS1–LS6 in `test/licenses.test.ts`.
  - `scripts/licenses.ts`: fetch (desktop UA) → `evidence/licenses/<dir>/<UTC>-<name>.{html,pdf,txt}`; `evidence/licenses/SOURCES.md` (URL, UTC, status, sha256); Wayback only by explicit snapshot id; one `quote.md` per dataset (verbatim text and where it sits); `--verify [<plan>]` (LS3, LS4).
  - Natural Earth (admin-0, admin-1, physical), RESOLVE 2017, Jung v004 (record page and API), AnAge, AmphiBIO, EltonTraits, PanTHERIA, COMBINE (search), and a trait source that covers Testudines (search; all 11 reptiles are turtles and tortoises, F9). JS-rendered pages: the download's README or metadata, or the DOI landing page.
  - → `out/licenses/summary.md`, one section per dataset: license, hostable, size (Content-Length or API), join keys, ingest work, what it enables.
  - Checks: Guard; spike green; `licenses.ts --verify` exits 0; every dataset has a saved page and a `quote.md`.

- [ ] S15 · Licenses, part 2, and the ranking (T1 §1; F8, F9).
  - Wikidata (CC0; names in other languages via `ids.wikidata`, labels only, never P141), Open Tree of Life (synthesis release and license), GBIF terms (Wayback; records CC0 or CC BY only), WorldClim, CHELSA, WDPA (blocks hosting: learner download only), the same way as S14.
  - `out/licenses/summary.md` gains those sections and `## Ranking`: every dataset ranked, the top three and why, blocking licenses flagged, the tables each feeds (T5), and whether mission C or D ingests it.
  - Checks: Guard; `licenses.ts --verify` exits 0; the ranking covers every dataset the brief lists.

- [ ] S16 · IUCN: terms, the four cases, the draft request (T8; 003 §6 without the lessons).
  - Check `$M/iucn-terms-of-use-*` again; then the live page; then Wayback `20261015190206` (terms) and the newest spatial-data snapshot. Saved by `licenses.ts` to `evidence/licenses/iucn/`.
  - 003 §6: quotes of §1, §4, §5, §15 and §16 with their verification label; `### Hosting the files`, `### Serving derived products`, `### Classroom use`, `### A learner's own download`, each answered from the clauses; `### Draft permission request`; the Jung map kept apart (CC BY 4.0, not Red List data). If nothing is readable: quotes marked unverified, and a handoff item (`Blocks: nothing`).
  - Checks: Guard; `licenses.ts --verify $W/$P` exits 0; `evidence/licenses/iucn/` holds only saved pages, their text and `quote.md`.

- [ ] S17 · Grown schema: stand-in data and `setup-grown` (T5; 003 §2, first half).
  - Tests first, red: GD1–GD3 in `test/grown-data.test.ts`.
  - `scripts/grown-data.ts` → `data/v1/<table>.parquet` for each table T5 and S15's ranking keep (C's top datasets; D's `country_shapes`, `occurrences`, `habitat_classes`, `country_habitats`). Real open rows where the license allows and the data is small (e.g. AnAge and AmphiBIO rows for the 76 species, v004's legend, E3c's polygons); otherwise synthetic. Each registry entry says which.
  - `src/setup-grown.sql`: after 002's tables, each table after those it points at, FKs in `CREATE TABLE`, no `DROP`, new `sources` rows before the tables citing them; `traits` and `species_traits` in 002's shapes (F4).
  - 003 §2: each table's columns, keys, cardinality, feed and credit (T5's table); the `setup-grown` block and `setup-grown-counts`.
  - Checks: Guard; spike green; `--update` diff read, `--check` exits 0; F4 shown: a scratch plan `$SP/scratch/f4.md` (003's `setup` and `setup-grown` blocks, then 002's `l16` with `-- expect: error already exists`) passes.

- [ ] S18 · The grown schema's ERD (T5 ERD, T3 `--erd`; 003 §2, second half; Disagreements).
  - Tests first, red: RE1–RE6.
  - `erd-model.ts`: 002's ERD must appear unchanged inside 003's; `||--o|` only where the child's FK is its PK or UNIQUE. `erd.ts --name <base>` (default `schema`).
  - `plans/003-learn-erd.mmd` (A1's subset) → `$SP/erd/grown.svg`, `grown.png`.
  - 003 §2: the ```` ```mermaid ```` block (= the `.mmd`); PostGIS-only learner objects listed outside it (T5). `## Disagreements with 002`: F4 (lesson 16's exercise → `my_traits`, `my_species_traits`, with `l16-check`'s rows); 002 §2 "Room to grow" against T5 (`habitat_classes` and `country_habitats` instead of `habitats` and `species_habitats`; no species–habitat table, because it would be IUCN data); anything S1–S17 found.
  - Checks: Guard; spike green; `--check --erd $W/$ERD` exits 0 (every later 003 check adds `--erd`); `erd.ts` exits 0, no `<foreignObject>`; look at the PNG (Read tool).

- [ ] S19 · 003 §1, Growing the data (T1).
  - From `out/licenses/summary.md`: the ranked table, then one `### D<n>` entry per dataset in the convention's format; the top three and why; blocking licenses flagged. `d<nn>` blocks where a join is worth showing (e.g. trait rows joined to `species`), `spike-table`.
  - Checks: Guard; `licenses.ts --verify $W/$P` exits 0; Verification V8 passes; `--check --erd` exits 0.

- [ ] S20 · 003 §3, lessons for the grown data (4–8).
  - From Lesson 17, in 002's format, each with `**Data:**`. Topics: traits and their units (`CAST`, unit per trait); comparing classes (`GROUP BY` class over traits); a self-join on the phylogeny (`tree_nodes` if kept, else `taxa`); many-to-many with habitats or ecoregions; the learner's lesson-16 design against critwire's real tables (F4); a country's share of a class from `est_area_km2` with a window function ("estimated", never stored).
  - Checks: Guard; `--update` diff read, `--check --erd` exits 0; each lesson has its `-ex` block and the `**Data:**`, `**Shown as:**` and `**Check:**` lines.

- [ ] S21 · 003 §4 spatial lessons, first half (T6; E1; F5).
  - §4 intro: who it's for; T6's "where it runs" table, each row naming its evidence run; how paired blocks read (PostGIS first, DuckDB beside it where spellings differ, F5); the learner's one-time setup (`CREATE EXTENSION postgis_raster`; `GRANT SET ON PARAMETER … TO <role>` first, else a superuser session or `ALTER DATABASE … SET`, and why the settings are guarded) as an `untested:` block, because the spike never grants.
  - Lessons: points, polygons and coordinate systems; `ST_Contains` and `ST_Intersects` (with the boundary rule, F5); distance and area (geography against the spheroid functions' lat/lon order); spatial joins (occurrences to country shapes: agree, disagree, no polygon; records, not range).
  - Checks: Guard; `--update` diff read, `--check --erd` exits 0; each lesson has its `-ex` block and the `**Runs in:**`, `**Evidence:**`, `**Shown as:**` and `**Check:**` lines.

- [ ] S22 · 003 §4 spatial lessons, second half: projection and raster (T6; E2–E4, E3b, E3c).
  - Lessons: why projection matters (vector areas in 3857, 6933 and on the spheroid; F3's Antarctic 803 overcount); the habitat value at a point; zonal statistics (the resolution read, an overview as a sample, areas "estimated", E3c); the browser companion reading the clip with geotiff.js (JS in a ```` ```js ```` fence, not counted).
  - Each raster lesson: exactly one live COG `ran` block; the rest read `learn_spatial.habitat_clips` (`spike-table`). More clips (TT, the high-latitude polygon) by S8's cut and validation if a lesson needs them; `pg-setup` updated.
  - The learner's raster sources per T6: critwire's clip, their own v004 download, or the owner's COG only after the gate (§8).
  - Checks: as S21; RP13 holds.

- [ ] S23 · 003 §6 IUCN lessons, on a synthetic stand-in (T8).
  - `learn_spatial.example_ranges`: two hand-drawn rectangles, `label = 'synthetic'`, lesson-defined column names, built by `pg-setup`; registry entry.
  - 2–3 `### IUCN lesson <n>`: join the learner's ranges to `species.iucn_id`; records against range (open-record countries outside it); habitat composition inside a range from the Jung raster. Imports as ```` ```sh ```` fences (`shp2pgsql`, `ogr2ogr`); an IUCN column name only from IUCN's public documentation, quoted with its URL; results stay on the learner's machine (§4 of the terms).
  - Checks: as S21; Verification V9 passes.

- [ ] S24 · 003 §5, the habitat raster (T5, T7, T10).
  - Version and level (S3's exclusion table) and the provenance gate (T7); the credit; options (a)–(d) with disk, bandwidth per learner (measured bytes), work and Chromebook fit (4× runs, VmHWM); the three summary methods with resolution, rule and measured error (E3c); `pnpm ingest habitat` (T5: input, output, derive's refusal, cost from E3c's timings, the tool); why summaries are ingest output, not build work; the recommendation. `r<nn>` blocks only where a query shows a number.
  - Checks: Guard; `--check --erd` exits 0; every number cites its `out/<run>/`.

- [ ] S25 · Briefs for missions C and D, and 003 §7 (T9).
  - `plans/briefs/critwire-learn-c.md` and `plans/briefs/critwire-learn-d.md` in the ops brief format (`## Goal`, `## Why`, `## Scope`, `## Definition of done`, `## Decision rules`, `## Notes`), each opening with B1's style of comment: copy and start commands, start only after B2 is merged and live, the estimate (30–40 sessions).
  - Each states what it assumes B delivered (T9's list; "where B's plans record deviations from 002, B's code wins"). C: T9's C list, the T5 attribution entries, F4's lesson 16 change. D: T9's D list, including the provenance gate, `ingest habitat` and the PostGIS lesson script with the capability check.
  - Each Definition of done: typecheck, test, build, the existing `/v1` files' bytes unchanged against that mission's own Baseline, the named E2E specs and their artifacts.
  - 003 §7: the paths, what each assumes, and the order (C before D).
  - Checks: Guard; each brief has the six headings and an estimate under 60 sessions.

- [ ] S26 · 003 §8, completeness pass, Summary inputs (T10).
  - §8: every T10 item plus any the spike added, each with a recommendation and its cost.
  - Run Verification V5–V11 (all but E2E and the release); fix any gap; every `untested:` block has a real reason.
  - Log line: the Summary's inputs (top three datasets with licenses; where each spatial lesson runs; the raster recommendation; IUCN's four answers and whether the quotes are verified; the brief paths; the §8 choices).
  - Checks: Guard; V5–V11 pass.

## Verification

Run from the worktree as one bash session; it writes its own transcript. No lint script exists (Baseline), so `pnpm typecheck` is the static check. Nothing public changes, so the repo's E2E suite proves no regression; the spike's browser runs are this mission's own E2E evidence.

```bash
set -euo pipefail
W=/srv/critter-ai/worktrees/critwire-learn-spatial-design; cd "$W"
M=/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design; SP=$M/spike; V=$M/verify; E=$M/e2e
P=plans/003-learn-data-spatial.md; ERD=plans/003-learn-erd.mmd
COG=https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif; ETAG='"975827817c839f73a5ee49d2791393a4-212"'
mkdir -p "$V"; exec > >(tee "$V/verify-$(date -u +%Y%m%dT%H%MZ).log") 2>&1
fail() { echo "FAIL: $*"; exit 1; }
hashes() { (cd "$1" && find . -type f | sort | xargs sha256sum); }
ports_free() { ! ss -ltn | grep -qE '127\.0\.0\.1:310[012] '; }
q() { psql -d critwire_dev -v ON_ERROR_STOP=1 -Atc "$1"; }

# V0 preflight: clean and pushed; scratch db; ports free; S3 reachable and the COG unchanged
test -z "$(git status --porcelain)"
git fetch -q origin; test "$(git rev-parse HEAD)" = "$(git rev-parse origin/agent/critwire-learn-spatial-design)"
node -e 'process.loadEnvFile(); process.exit(new URL(process.env.DATABASE_URL).pathname === "/critwire_dev" ? 0 : 1)' || fail "DATABASE_URL is not critwire_dev"
test "$(q "SELECT extversion FROM pg_extension WHERE extname = 'postgis_raster'")" = 3.4.2 || fail "postgis_raster"
ports_free || fail "port 3100-3102 busy"
curl -sfI "$COG" | tr -d '\r' | grep -qixF "etag: $ETAG" || fail "COG unreachable or changed (S3 dependency)"

# V1 scope: only plans/ changed, exactly these five files; 002 untouched
git diff --name-only origin/main...HEAD | grep -v '^plans/' && fail "files outside plans/ changed"
diff <(git diff --name-only origin/main...HEAD | sort) <(printf '%s\n' plans/003-learn-data-spatial.md plans/003-learn-erd.mmd \
  plans/2026-10-22-critwire-learn-spatial-design.md plans/briefs/critwire-learn-c.md plans/briefs/critwire-learn-d.md | sort) || fail "changed files"
git diff --quiet origin/main...HEAD -- plans/002-learn.md plans/002-learn-erd.mmd || fail "002 changed"

# V2 repo checks
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test

# V3 dist unchanged: a fresh build hashes exactly as Baseline's build of origin/main (157 files)
rm -rf dist; pnpm -s build > "$V/build.txt"
diff <(LC_ALL=C sort -k2 "$SP/baseline/dist.sha256") <(hashes dist | LC_ALL=C sort -k2) || fail "dist differs from main"

# V4 E2E: the repo suite (Playwright 1.58.2, headless Chromium, local Caddy 3100/3101), the same 20 as Baseline
rm -rf "$E"; E2E_ARTIFACTS="$E" pnpm e2e
jq -e '.stats.expected == 20 and .stats.unexpected == 0 and .stats.flaky == 0 and .stats.skipped == 0' "$E/results.json"
test -s "$E/playwright-report/index.html"; test -s "$E/docs-375.png"
pgrep -f 'caddy run --config e2e/Caddyfile' && fail "E2E Caddy still running"
ports_free || fail "port left busy after E2E"

# V5 spike: frozen reinstall, typecheck, every failure-mode test; under 2 GB
pnpm -C "$SP" install --frozen-lockfile
pnpm -C "$SP" typecheck
pnpm -C "$SP" test
test "$(du -sb "$SP" | cut -f1)" -lt 2000000000 || fail "spike over 2 GB"

# V6 every SQL block in 003 accounted for
awk '/^```sql$/{n++; getline a; getline b; if (a !~ /^-- q: [a-z0-9-]+$/ || b !~ /^-- status: (ran|spike-table|untested: .+)$/) {print "line " NR ": " a " / " b; bad++}}
     END{print n " sql blocks"; exit bad > 0}' "$P" || fail "sql block headers"
node "$SP/scripts/build-site.ts"
# DuckDB-WASM (headless Chromium, spike Caddy on 3102) + PostGIS (critwire_dev, critter-ai socket); rewrites $M/queries.log
node "$SP/run-queries.ts" "$W/$P" --check --erd "$W/$ERD"
grep -qE '^engine: .*DuckDB v1\.5\.6' "$M/queries.log" || fail "log: engine"
grep -qE '^postgis: .*3\.4\.2' "$M/queries.log" || fail "log: postgis"
grep -qxF "cog: $COG · etag $ETAG" "$M/queries.log" || fail "log: cog etag"
diff <(grep '^-- result: ' "$P" | sort) <(grep '^-- result: ' "$M/queries.log" | sort) || fail "recorded results differ from queries.log"
R=$(awk '/^```sql$/{getline a; getline b; if (b ~ /^-- status: (ran|spike-table)$/ && a !~ /^-- q: (setup|setup-grown|pg-setup)$/) n++} END{print n+0}' "$P")
test "$(grep -c '^-- result: ' "$P")" = "$R" || fail "a runnable block without exactly one result"
grep -n '^-- status: untested: ' "$P" || true
ports_free || fail "spike server left running"

# V7 003 and the briefs are complete
for n in 1 2 3 4 5 6 7 8; do grep -qE "^## $n\. " "$P" || fail "003 §$n missing"; done
grep -qx '## Disagreements with 002' "$P" || fail "no Disagreements section"
G=$(grep -cE '^### Lesson [0-9]+ · ' "$P"); test "$G" -ge 4 -a "$G" -le 8 || fail "grown lessons: $G"
S=$(grep -cE '^### Spatial lesson [0-9]+ · ' "$P"); test "$S" -ge 6 -a "$S" -le 10 || fail "spatial lessons: $S"
I=$(grep -cE '^### IUCN lesson [0-9]+ · ' "$P"); test "$I" -ge 1 || fail "no IUCN lessons"
test "$(grep -c '^\*\*Data:\*\* ' "$P")" = "$G" || fail "Data lines"
test "$(grep -c '^\*\*Runs in:\*\* ' "$P")" = "$((S + I))" || fail "Runs in lines"
grep '^\*\*Runs in:\*\* ' "$P" | grep -vE '^\*\*Runs in:\*\* (browser \(DuckDB spatial\)|browser \(geotiff\.js\)|your own PostGIS)' && fail "unknown Runs in"
test "$(grep -c '^\*\*Evidence:\*\* ' "$P")" = "$((S + I))" || fail "Evidence lines"
for k in 'Shown as' 'Check'; do test "$(grep -c "^\*\*$k:\*\* " "$P")" = "$((G + S + I))" || fail "$k lines"; done
for s in $(grep -oE '^### (Lesson|Spatial lesson|IUCN lesson) [0-9]+' "$P" | awk '{p = ($2 == "Lesson") ? "l" : ($2 == "Spatial") ? "s" : "i"; printf "%s%02d\n", p, $NF}'); do
  grep -qx -- "-- q: $s-ex" "$P" || fail "$s has no exercise"; done
for t in 'Hosting the files' 'Serving derived products' 'Classroom use' "A learner's own download" 'Draft permission request'; do grep -qx "### $t" "$P" || fail "§6: $t"; done
for b in c d; do f=plans/briefs/critwire-learn-$b.md; grep -qF "$f" "$P" || fail "§7 lacks $f"
  for h in Goal Why Scope 'Definition of done' 'Decision rules' Notes; do grep -qx "## $h" "$f" || fail "$f: no $h"; done; done

# V8 every §1 dataset: license quoted verbatim from its saved source page, with the URL
awk '/^## 1\. /{s=1; next} /^## 2\. /{s=0} s' "$P" > "$V/s1.md"
awk '/^### D[0-9]+ · /{if (h && !(l && x && o)) {print "incomplete: " h; bad++}; h=$0; l=x=o=0; next}
     /^\*\*License:\*\* .*https?:\/\/.*evidence\/licenses\//{l=1} /^> ./{x=1} /^\*\*Hostable:\*\* /{o=1}
     END{if (h && !(l && x && o)) {print "incomplete: " h; bad++}; exit bad > 0}' "$V/s1.md" || fail "§1 entry lacks license URL, quote or Hostable"
for n in 'Natural Earth' RESOLVE Jung AnAge AmphiBIO EltonTraits PanTHERIA COMBINE Wikidata 'Open Tree' GBIF WorldClim CHELSA WDPA '(Testudines)'; do
  grep -E '^### D[0-9]+ · ' "$V/s1.md" | grep -qF "$n" || fail "§1 lacks $n"; done
node "$SP/scripts/licenses.ts" --verify "$W/$P"     # every §1 and §6 quote is verbatim in its saved page (LS3, LS4)

# V9 no IUCN data anywhere (repo, spike, database); critwire_dev left without grants or role/db settings
IUCN_HOST='://([a-z0-9.-]+\.)?(iucnredlist|iucn|iucnrle)\.org'     # hosts, not the word: Jung's own Zenodo files are named iucn_habitatclassification_*
grep -iE "$IUCN_HOST" "$SP/downloads/SOURCES.md" && fail "a download from an IUCN host"
grep -iE "$IUCN_HOST" "$SP/evidence/licenses/SOURCES.md" | grep -vE 'iucnredlist\.org/(terms|resources/spatial-data-download)|iucnrle\.org/terms-of-use' && fail "an IUCN page that isn't terms"
find "$SP" -path "$SP/node_modules" -prune -o -type f \( -iname '*.shp' -o -iname '*.dbf' -o -iname '*.gpkg' -o -iname '*.gdb' -o -iname '*.fgb' \) -print \
  | grep -vE "^$SP/downloads/(resolve-ecoregions-2017|naturalearth-[^/]+)/" | grep . && fail "unexpected vector data file in the spike"
grep -rlaE 'YRCOMPILED|\bBINOMIAL\b|\bSEASONAL\b|"P141"|Critically Endangered|Near Threatened|Least Concern' "$SP/data" "$SP/clips" "$SP/downloads" "$SP/out" && fail "IUCN range attributes or categories in spike data"
{ awk '/^```/{f = !f; next} f' "$P"; cat "$ERD"; } | grep -nE 'Critically Endangered|Endangered|Vulnerable|Near Threatened|Least Concern|Data Deficient|Extinct in the Wild' && fail "Red List category in 003's SQL, results or ERD"
q "SELECT table_schema || '.' || table_name || '.' || column_name FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
   AND column_name ~* '^(id_no|binomial|sci_name|presence|seasonal|compiler|yrcompiled|redlist.*|red_list.*|category|assessment.*)$'" | grep . && fail "IUCN-shaped column in critwire_dev"
test "$(q "SELECT count(*) FROM learn_spatial.example_ranges WHERE label IS DISTINCT FROM 'synthetic'")" = 0 || fail "example_ranges not synthetic"
test "$(q "SELECT count(*) FROM pg_parameter_acl")" = 0 || fail "GRANT SET ON PARAMETER left"
test "$(q "SELECT count(*) FROM pg_db_role_setting WHERE array_to_string(setconfig, ',') ~ 'postgis\.'")" = 0 || fail "postgis role/db setting left"

# V10 the grown ERD renders offline to SVG in the spike folder, from the committed source
node "$SP/scripts/erd.ts" "$W/$ERD" --name grown
test -s "$SP/erd/grown.svg"; test -s "$SP/erd/grown.png"
grep -qF "data-source-sha256=\"$(sha256sum "$ERD" | cut -d' ' -f1)\"" "$SP/erd/grown.svg" || fail "SVG not from this .mmd"
grep -q '<foreignObject' "$SP/erd/grown.svg" && fail "foreignObject in SVG"

# V11 spike evidence present, no off-origin request, and the browser runs reproduce (smoke)
for r in a1-recheck a1-recheck-s12 cog tile-bytes jung e2-point e3-zonal e3b-overviews e3c-methods e4-clip e4-s3 e4-browser e1-data e1-pip licenses; do
  test -s "$SP/out/$r/summary.md" || fail "no $r summary"; done
for j in "$SP"/out/e1-pip/*/results.json "$SP"/out/e4-browser/*/results.json; do jq -e '(.blocked | length) == 0 and .failures == 0' "$j" > /dev/null || fail "$j"; done
find "$SP/out/e1-pip" "$SP/out/e4-browser" -name '*.png' | grep -q . || fail "no screenshots"
test -s "$SP/README.md"; test -s "$SP/downloads/SOURCES.md"; test -s "$SP/evidence/licenses/SOURCES.md"
node "$SP/scripts/e1-pip.ts" --smoke
node "$SP/scripts/e4-clip.ts" --browser --smoke
for j in "$SP/out/smoke/e1-pip/results.json" "$SP/out/smoke/e4-browser/results.json"; do jq -e '(.blocked | length) == 0 and .failures == 0' "$j" > /dev/null || fail "$j"; done
ports_free || fail "spike server left running"

# V12 delivery
test -z "$(git status --porcelain)"
```

What must hold: every command exits 0. V3's diff is empty (157 files). V4 is 20/20 with nothing skipped. V6: every block has both headers, `--check` finds no result difference and no ERD drift, the log's three header lines are present, and the plan's result lines equal the log's. V7–V9 as written. V10's SVG carries the `.mmd`'s sha256. V11: every run folder has its summary, and no browser run made an off-origin request.

**S3 dependency:** the only network V needs (beyond the pnpm store) is the owner's bucket: the live COG `ran` blocks in V6, one per raster lesson (T3), a few hundred KB of Range reads billed to the owner's AWS. V0 checks it first: S3 down or a changed ETag fails the run before anything is judged. Never skip or relabel those blocks to get past it; a changed file means S2's header checks re-run and a re-pin under Decisions. Zenodo, GBIF and TiTiler are needed only by the experiments, not by V.

**Artifacts:**
- Repo E2E, `$M/e2e/`: `playwright-report/` (`pnpm exec playwright show-report $M/e2e/playwright-report`), `test-results/` with a `trace.zip` per test (`pnpm exec playwright show-trace <trace.zip>`), `results.json`, `docs-375.png`, `caddy-access.log`.
- Spike browser runs (this mission's E2E evidence): `$SP/out/e1-pip/`, `$SP/out/e4-browser/`, `$SP/out/smoke/` (`results.json`, screenshots, `caddy-access.log`).
- `$M/queries.log`: every 003 block's result from DuckDB-WASM and PostGIS, with engine versions and the COG's ETag.
- `$SP/erd/grown.{svg,png}`; `$SP/evidence/licenses/`; `$SP/out/<run>/`; `$SP/README.md` with every command in order.
- `$M/verify/verify-<UTC>.log`: this run's transcript.

**Reproduce:** this script. Pieces alone: `node $SP/scripts/build-site.ts && node $SP/run-queries.ts $W/plans/003-learn-data-spatial.md --check --erd $W/plans/003-learn-erd.mmd`; `node $SP/scripts/e1-pip.ts --smoke`; `node $SP/scripts/e4-clip.ts --browser --smoke`; `rm -rf dist && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

**Release smoke** (the Release unit, not a step): after `deploy critwire`, fetch every path in Baseline's live list and compare. Any difference fails the release.

```bash
M=/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design; SP=$M/spike; L=$SP/baseline/live.sha256; R=$M/release/live-after
rm -rf "$R"; mkdir -p "$R"
awk '{print $2}' "$L" | while read -r f; do mkdir -p "$R/$(dirname "$f")"; curl -sfL -o "$R/$f" "https://critwire.com/${f#./}" || echo "FETCH FAILED $f"; done
(cd "$R" && awk '{print $2}' "$L" | xargs sha256sum) | diff - "$L" && echo RELEASE_SMOKE_OK
```

## Failure modes

Only the spike tools that the Definition of done and the experiments' verdicts rest on are tested in isolation. Each mode below is a test or fixture, written and seen failing before its code (step in brackets). "Fails" means a non-zero exit or a thrown error whose message names the cause. A1's suites come with the code they cover and must pass unchanged: SQ1–SQ7, CR1–CR12, RQ1–RQ26, RQE1–RQE5, ER1–ER4 [S1], CD1–CD11 [S10]. RS2–RS5 replace RQ6–RQ9 [S12].

**CG · COG reader (`scripts/cog.ts`), `test/cog.test.ts` [S2]**
- CG1 Bad magic, or a TIFF version other than 42 or 43, fails; classic TIFF and BigTIFF both parse.
- CG2 A Range answered `200` aborts after the first chunk (the 3.64 GB file is never downloaded); a `206` whose `Content-Range` differs from the request fails.
- CG3 Every request carries `If-Match: $ETAG`; a `412`, or a response ETag different from the pin, fails, naming both.
- CG4 An IFD, tag array or GeoKey directory beyond the fetched bytes is fetched by a further Range, or fails; a truncated header never yields values.
- CG5 Grid maths: (−60, −3) → col 129665, row 197741; origin and pixel size equal F2's; a latitude beyond ±85.0511° or a longitude beyond ±180 fails.
- CG6 Tiles: the 1×1 window at (−60, −3) touches tile 293,613 only; a window across a tile edge touches 2 (4 at a corner); level k uses its own IFD's grid; a window outside the raster fails.
- CG7 IFD k is ⌈388,996 / 2^k⌉ px per side (F2); any other size fails.
- CG8 The ghost area (`LAYOUT=IFDS_BEFORE_DATA`, `BLOCK_ORDER=ROW_MAJOR`, `BLOCK_LEADER=SIZE_AS_UINT4`) is parsed; a file without one is "not a GDAL COG", never assumed one.
- CG9 `OVR_RESAMPLING_ALG` is read when present; absent is reported as absent, never as NEAREST.
- CG10 A window's lower bound is the sum of its tiles' TileByteCounts at that level; a 0-byte (sparse) tile counts 0 and is listed.

**ZP · zip members by Range (`scripts/zip-range.ts`), `test/zip-range.test.ts` [S3]**
- ZP1 No end-of-central-directory record in the fetched tail fails; ZIP64 records are used when present.
- ZP2 A local header whose name or sizes differ from the directory's fails.
- ZP3 A CRC-32 different from the directory's fails, and the member file is deleted.
- ZP4 An inflated length different from the directory's uncompressed size fails.
- ZP5 A compression method other than stored (0) or DEFLATE (8) fails, naming it.
- ZP6 A `200` instead of `206` aborts; a whole-zip download happens only through T11's explicit fallback.

**JG · Jung version exclusion (`scripts/jung.ts`), `test/jung.test.ts` [S3]**
- JG1 A version whose code list lacks a code seen in the COG is excluded, listing the codes.
- JG2 A version whose header contradicts the COG's (data type, nodata) is excluded, naming the field.
- JG3 A version that isn't excluded is "not excluded"; the output never says confirmed or identified (F3), and the gate reads "unconfirmed" unless an owner's statement is recorded under Decisions.
- JG4 A code list or legend that can't be parsed, or is empty, fails, naming the file.
- JG5 A code zip whose md5 differs from the Zenodo API's fails.

**PG · PostGIS session (`scripts/pg.ts`), `test/pg.test.ts`, live on `critwire_dev` [S4]**
- PG1 `SPIKE_PG_URL` unset, naming a TCP host or a password, or a database other than `critwire_dev` fails before connecting; `critwire` is refused by name; `DATABASE_URL` is never read.
- PG2 A role that isn't superuser fails, saying to use the critter-ai socket and never ALTER or GRANT.
- PG3 `postgis_raster` not installed, or `postgis_raster_lib_version()` returning nothing, fails before any `SET`.
- PG4 `SHOW postgis.enable_outdb_rasters` other than `on` after the `SET`s fails, printing both `SHOW` values.
- PG5 `SHOW postgis.gdal_enabled_drivers` without the word `COG` fails.
- PG6 A misspelt name in the `SET` step (accepted silently, F1) fails at the `SHOW` of the real names: the check reads the real names, never the ones it set.
- PG7 `search_path` other than `learn_spatial, public`, or `statement_timeout` other than `60s`, fails.
- PG8 No :443 socket for the backend's pid after a cold out-db read, or an unreadable `/proc/<pid>/io`, fails the measurement; bytes are never recorded as 0.
- PG9 A static scan of `$SP/scripts`, `$SP/src` and `$SP/run-queries.ts` fails on any `ALTER ROLE|DATABASE|SYSTEM`, `GRANT` or `REVOKE`.

**VC · value comparison (`scripts/compare.ts`), `test/compare.test.ts` [S4]**
- VC1 Histograms differing in one class count fail, listing each class and both counts.
- VC2 A class present in one reader only fails.
- VC3 The 100 sample cells are a fixed grid over the window, never random; one differing cell fails with its column, row and both values; windows under 10 × 10 compare every cell.
- VC4 Nodata compares as nodata: PostGIS `NULL`, geotiff.js `0` and TiTiler's mask are one value; a reader that drops nodata from its histogram while another counts it fails.
- VC5 Windows of different shapes fail before comparing.
- VC6 A reader's error, timeout or refusal gives "can't read", never "pass" (E3b).

**FS · E3c method 3 (`scripts/e3c-methods.ts`), `test/e3c.test.ts` [S7]**
- FS1 A land cell whose fetched fractions sum below the full scale fails, naming the classes not fetched.
- FS2 A sum above the full scale (beyond the scale's rounding) fails: the scale is wrong.
- FS3 An unknown scale switches the run to relative differences only, labelled so; no absolute area is written.
- FS4 A 0.0099157° cell's geodesic area at 0°, 30° and 60° equals PostGIS `ST_Area(geography)` of the same cell within 0.1 %.
- FS5 A cell whose centre lies outside the polygon is excluded even if it overlaps; two adjacent polygons never both count a cell.

**CV · clip validation (`scripts/e4-clip.ts`), `test/clip.test.ts` [S8]**
- CV1 No ghost area, or `LAYOUT` other than `IFDS_BEFORE_DATA`, fails as "not a COG".
- CV2 Untiled, or without overviews, fails.
- CV3 A CRS other than EPSG:3857, or nodata other than 0, fails.
- CV4 `OVR_RESAMPLING_ALG` absent or not `NEAREST` fails; a code missing from the full-file histogram (an averaged overview) fails.
- CV5 Any of the 100 grid cells different from PostGIS `ST_Value` fails (VC).
- CV6 A clip written outside `$SP/clips/`, or over 50 MB, fails.

**GB · GBIF sample (`scripts/gbif-sample.ts`), `test/gbif-sample.test.ts` [S10]**
- GB1 Copied filters that differ from `OCCURRENCE_FILTERS` and `BASIS_OF_RECORD` in `$W/scripts/ingest/gbif.ts` (read as text) fail.
- GB2 A record whose license isn't CC0 1.0 or CC BY 4.0 fails.
- GB3 The throttle can't issue more than 2 requests a second; a `429` or `5xx` stops the run, with no retry loop.
- GB4 A sampled `datasetKey` missing from the species' `contributions.json` counts is reported per species, not fixed: expected for a sample drawn outside `ingest gbif`, and the reason D draws it inside (F9).
- GB5 A species id whose `ids.gbif` is null, or whose `range.status` isn't `ok`, fails.

**RS · run-queries statuses, registry and boot; fixture plans in `test/fixtures/run-queries/` [S12]**
- RS1 `-- status: draft-table` fails as unknown, listing `ran`, `spike-table`, `untested: <reason>`.
- RS2 A `ran` block naming a registry table (whole word) fails as mislabelled, naming the table.
- RS3 A `ran` block that reads a registry table only through a view it creates fails (the word test on the CREATE, `getTableNames` on the SELECT).
- RS4 A `spike-table` block that reads no registry table fails as mislabelled.
- RS5 Passes: a registry name inside a longer identifier, a string literal or a comment of a `ran` block.
- RS6 A registry that's missing or not JSON, an entry without engine, file, source URL, license or built-by, a duplicate name, or a missing file fails before any engine starts.
- RS7 `LOAD spatial` failing at boot (mirror file missing, or its sha256 differs from `assets.ts`) fails within the boot timeout, naming spatial; nothing is fetched off-origin (`blocked` empty).
- RS8 A `setup-grown` block one byte off `src/setup-grown.sql` fails; a statement error in `setup-grown` fails the boot, naming the statement.
- RS9 `-- engine:` with an unknown value, or twice in one block, fails.

**RP · run-queries PostGIS engine [S13]**
- RP1 PG1–PG7 surface through run-queries: it stops before any block, printing the reason and both `SHOW` values.
- RP2 A result with a `geometry`, `raster` or `bytea` column fails, naming the column and the fix (`ST_AsText`, `round`).
- RP3 `SELECT 1::int8, 1.50::numeric, 0.1::float8, NULL::int` renders `1 | 1.50 | 0.1 | NULL` by A1's rules; equal values hash equal in both engines.
- RP4 Isolation: block A deletes from a `learn_spatial` table and creates `learn_spatial.t`; block B sees the original counts and can create `t` again.
- RP5 Transaction control, `ALTER ROLE|DATABASE|SYSTEM`, `GRANT`, `REVOKE`, or `SET`/`RESET` outside `pg-session` fails statically.
- RP6 A statement error without `-- expect: error` fails, naming the id and the statement number; the next block still runs on a clean connection.
- RP7 A block over the timeout is cancelled and fails, naming the id (`SPIKE_BLOCK_TIMEOUT_MS` lowers it for the test).
- RP8 The COG's ETag different from the pin, or S3 unreachable (the URL overridden to `127.0.0.1:9` for the test), fails before any block reads `/vsicurl/`; the log header records what was seen.
- RP9 A `pg-setup` block one byte off `src/pg-setup.sql` fails; `pg-setup` creating anything outside `learn_spatial`, or a `learn_spatial` FK or view on a `public` table (F11), fails.
- RP10 `pg-setup` run twice gives the same `pg-setup-counts`.
- RP11 The label rule (RS2–RS5) holds for postgis blocks.
- RP12 The determinism lint covers PostGIS spellings: `random()`, `now()`, `clock_timestamp()`, `gen_random_uuid()`, `TABLESAMPLE`; a multi-row last statement without `ORDER BY` fails.
- RP13 A block reading `/vsicurl/` that isn't `ran` with `-- engine: postgis`, or a `###` section with two such blocks, fails (T3, "few live COG reads").

**LS · license evidence (`scripts/licenses.ts`), `test/licenses.test.ts` [S14]**
- LS1 A non-200 (403, 404, 5xx) is recorded with its status and never saved as evidence.
- LS2 Each saved page's URL, UTC time, status and sha256 go in `evidence/licenses/SOURCES.md`; a re-fetch writes a new dated file, never overwrites.
- LS3 `--verify`: a quote in a `quote.md`, or a `> ` quote under a §1 `### D` entry or in §6, that isn't verbatim in the saved page's text (HTML stripped, entities decoded, whitespace collapsed) fails, naming the quote and the file.
- LS4 `--verify`: a §1 entry whose `**License:**` line lacks a URL, a UTC date or an existing evidence dir fails.
- LS5 Wayback only by an explicit snapshot id; the saved file records the snapshot URL, never the live URL.
- LS6 A URL on an IUCN data path (anything on iucnredlist.org or iucn.org other than the terms and spatial-data pages; any API host) is refused before fetching.

**GD · grown stand-ins (`scripts/grown-data.ts`), `test/grown-data.test.ts` [S17]**
- GD1 A stand-in file without a registry entry, or an entry without its file, fails.
- GD2 A row whose `species_id` isn't a species, or whose `country_code` isn't a country code, fails, naming the row.
- GD3 An entry that says neither `real` (with source URL and license) nor `synthetic` fails; a synthetic entry never cites IUCN.

**RE · ERD rules (`erd-model.ts`, `erd.ts`) [S18]**
- RE1 A 002 entity missing from 003's `.mmd`, or with an attribute added, dropped, retyped or re-marked, fails, naming it.
- RE2 A 002 relationship line missing or changed fails.
- RE3 `||--o|` passes only where the child's FK columns are its PK or UNIQUE (`country_shapes`); elsewhere it fails.
- RE4 Lines outside the subset (`}o--o{`, `||--||`) still fail (RQE4).
- RE5 003's `mermaid` block different from the `.mmd` fails (RQE5 on the new file).
- RE6 `erd.ts --name grown` writes only `grown.svg` and `grown.png`; without `--name` it writes `schema.*` as before.

### Experiment outcomes (T11): how each is caught, what follows

| Risk | Caught by | Then | Step |
|---|---|---|---|
| `LOAD spatial` or WKB geometry fails in WASM v1.5.6 | the E1 page's error | GeoJSON text + `ST_GeomFromGeoJSON`; if spatial itself fails, those lessons move to the learner's PostGIS and §4 says so | S11 |
| 10m shapes over 700 MB at 4× | VmHWM | 50m or prep-time simplified shapes; size and memory of each recorded | S11 |
| A raster `SET` refused or ineffective | PG3–PG6, RP1 | the run refuses with the `SHOW` values; fix the connection, never `ALTER` | S4, S13 |
| PostGIS can't read overviews | VC6, E3b's verdict | overview reads through geotiff.js; §4's PostGIS lessons read full resolution on small polygons | S6 |
| Fractions don't sum to the scale | FS1–FS3 | fetch the members FS1 names; unknown scale → relative differences only | S7 |
| Zenodo refuses `Range`, or a CRC mismatch | ZP3, ZP6 | record it; one whole download of the 695 MB zip into `downloads/`, md5 checked, deleted after | S3, S7 |
| The COG's provenance stays unconfirmed | JG3 | default: v004 by URL for everything published; §8 item | S3, S24 |
| PostGIS can't open a local file (F12) | design | bytes by parameter (`ST_FromGDALRaster`, `ST_SetValues`); never `chmod` | S7, S13 |
| `ST_AsGDALRaster(…, 'COG')` fails or isn't a COG | CV1–CV3 | `'GTiff'` with `TILED=YES`, `COMPRESS=DEFLATE`; recorded | S8 |
| Clip overviews not nearest | CV4 | `RESAMPLING=NEAREST`; the codes-subset check | S8 |
| geotiff.js loads the 6.9 MB tile index whole | `out/e4-s3/` bytes | priced into option (a); critwire-hosted clips don't pay it | S8 |
| S3 unreachable, or the ETag changed | CG2, CG3, RP8, V0 | stop and record; re-pin only after S2's header checks re-run, under Decisions | all |
| IUCN archive unreadable | LS1 | quotes marked unverified; handoff item (`Blocks: nothing`) | S16 |
| Jung version not determinable | JG3 | §8 item (no handoff: D defaults to v004); the COG's hostability by the decision rule | S3, S24 |
| A license unclear | LS3/LS4 can't be met | not hostable, said so in §1 | S14, S15 |
| TiTiler disagrees or is down | E2/E3 comparison | recorded; TiTiler is a cross-check, no verdict rests on it | S4, S5 |
| Spike over 2 GB | Guard's `du` | delete extracted members and zips; clips only | all |
| `pnpm build` changes, or `critwire_dev` broken by spike objects | build guard, RP9 | find and drop the offending `learn_spatial` object; nothing in `public` | all |
| Caddy on 3102 while `pnpm e2e` runs | `serve.ts` | it refuses (A1) | all |

### Risks / open questions

- **Session size:** S1, S7 and S13 are the largest. Split per the mission rules if one runs over; the copy proof (S1), the fraction self-check (S7) and RP1–RP13 (S13) are the parts that must not be cut.
- **Owner's egress:** the spike's S3 reads total well under 100 MB (header and index ≈ 13 MB, E2–E4 a few MB each, V6 a few hundred KB per run): cents. TiTiler calls (E2, E3) are a few dozen on the owner's Lambda.
- **Zenodo traffic:** E3c fetches only the members its two polygons need, at most 60.2 MB each, one at a time.
- **Open until the spike runs (S):** geotiff.js's build scripts; the fraction scale; whether `GTIFF_DIR:` works over `/vsicurl/`; Caddy's Range handling under `encode`; the 4× memory of 10m shapes.

## Code review (Astra)

## Release

## Decisions

- Steps (planner, 2026-10-22): 26 steps S1–S26 from T12's 16 units; units 2–6, 10, 11, 13 split; S12–S13 added (run-queries extension, after E1 since `pg-setup` loads E1's Parquet + E4's clip).
- S1 copy proof re-runs all of 002 with `--check --erd` (`out/a1-recheck/`), not one block; S12 repeats it after `draft-table` → `spike-table`.
- E2 points: near Manaus + 9 picked in S4 (E1's GBIF sample doesn't exist yet); S11 adds a check on each sampled species' first point.
- 003 conventions fixed (ids `l17…`, `s<nn>`, `i<nn>`, `-pg` twins; §1 `### D<n> ·` with fixed License/Hostable lines; lesson `**Data:**`/`**Runs in:**`/`**Evidence:**`); Verification greps them.
- dist hash guard runs at end of every step, not only PostGIS ones.
- Every S3 Range GET sends `If-Match: <ETag>`; 200 or 412 aborts.
- A1 tests copied with each reused module; S10 copies A1's countries matcher + tests.
- Learner one-time setup (`CREATE EXTENSION`, `GRANT SET ON PARAMETER`) is an `untested:` block (spike never grants).
- One live COG read per `###` section enforced in run-queries (RP13).
- `licenses.ts --verify` checks every §1/§6 quote word for word vs saved page.
- GBIF sample `datasetKey` missing from `contributions.json`: reported, not failed (spike sample not drawn in `ingest gbif`; mission D must).
- `example_ranges.label = 'synthetic'`; `erd.ts --name`; S17 proves F4 clash via scratch plan (002 l16 fails "already exists" vs grown setup).
- Wikidata: named properties only, never whole entities (P141 = Red List category); V9 scans for `"P141"`.
- IUCN scan matches IUCN host names, not "iucn" (Jung's files are `iucn_habitatclassification_*`).
- S1: `spatial` mirrored for wasm_mvp as well as wasm_eh (both already downloaded by A1, sha256-checked): the mvp bundle is the fallback for browsers without wasm exceptions, so a lesson on it needs the same extension. Boot still loads only `parquet` until S12.
- S1: wasm_threads parquet not copied: the coi bundle needs COOP/COEP, which the live Caddyfile doesn't send, so nothing here can boot it.
- S1: `serve.ts` and `paths.ts`'s `CADDYFILES.proposed` kept unchanged (T2 "serve.ts unchanged"); there's no `Caddyfile.proposed`, so `--proposed` fails loudly in Caddy. `DUCKDB_EXT_TEST` renamed `DUCKDB_EXT_MIRRORED` (it now holds `spatial` only, no `inet`).
- S1: 003 §2 carries 002's `setup` + `setup-counts` (and the sentence between them) byte for byte, so `setup-counts` stays `-- status: draft-table`; S12 relabels it `spike-table` with the runner change.
- S2: `cog.ts` library only (HttpRangeSource = the one S3 fetch; PrefixSource(head, further) serves fetched bytes and sends the rest to a further Range or fails, CG4); `node scripts/tile-bytes.ts` is the one CLI: re-derives F2 into `out/cog/`, the index into `out/tile-bytes/`, offline `lowerBound(window, level)` from `downloads/cog-index/`.
- S2: `assertPyramid` also requires the pyramid to end at the first level that fits one tile (GDAL's COG rule), so a missing overview fails without hard-coding 10; E4's clips reuse it.
- S2 findings vs F2 (all 31 F2 checks pass): pixel y is 103.02166779498631 m (one ulp above x; test pins the file's value). IFD 1–9 TileByteCounts are 770,392 B, not F2's 867,180 (all 11 arrays: 3,080,792 B fetched + 8 B inline). F2's full-level "≈ 2,248,510,943" includes GDAL's 8 B per tile (4 B leader + 4 B repeated trailer); exact full-level tile bytes 2,242,349,355. File size = 9,246,384 + Σ tiles + 8 × 770,199 tiles, exactly. No sparse tiles at any level.
- S3 result: the COG is level 2 (÷256 and ÷1024 hold 53 and 48 level-2 codes, plus level-1 codes where Jung's tree stops). Only **v004 is not excluded**: every v001–v003 `styles/level2.clr` (001, 001_full, 002 = 002_v2, 003; 63 values) lacks 11 codes the COG holds (900, 908, 909, 1101–1106, 1200, 1206: the marine classes v004's CHANGELOG adds); v001 and v001_full are also int16 (v001 1 km: nodata unset). So every CC BY-NC version (001, 001_full, 002) is excluded. Gate stays **unconfirmed** (no owner statement; codes only exclude, F3): v004 by URL remains D's default, §8 asks the owner. Owner's answer goes under Decisions as `- Owner (Jung provenance): v<ver> · <statement>`; `jung.ts` reads it.
- S3: fraction scale found, not FS3's "not found": Zenodo's 002–004 descriptions say fractional cover "(unit: [0-1] * 1000)" (v004 quoted in `out/jung/gate.md`).
- S3: each lvl2 composite tif's IFD has tag data ≈ 1.6 MB into the file (after its strip arrays), so `InflatedPrefix` inflates 256 KB Range chunks until the header is covered (1,048,576 B compressed per composite; cap 4 MB). Strip/tile arrays stay unread (lazy in `cog.ts`).
- S3: Zenodo 403s Node's default User-Agent ("unusual traffic"); `zip-range.ts` sends `critwire-learn-spike/1.0 (research; repo URL)`, one shared 500 ms throttle. Zenodo sends no ETag, so `HttpRangeSource` takes `etag: null` and pins the API's file size via Content-Range (one fetch for S3 and Zenodo, DRY).
- S3: geotiff.js reads go through `cog.ts`'s `geotiffOver()` (a geotiff `BaseClient` on `HttpRangeSource`), so they're counted and If-Match'd like every S3 read; S4 reuses it.
- S3: `legend-v004.csv` keeps code, `level2.clr` label, the legend's IUCN class name (column A) and Mapped flag; the legend's definition and notes columns aren't copied.
- S3: v003's lvl1 composite zip uses Deflate64 (method 9); not needed (level 2 only) and `zip-range.ts` refuses it by name (ZP5).
- S3: step bytes: two runs of `jung.ts` (each S3 403,333 + Zenodo 8,878,181 B) + ≈ 6.3 MB of exploratory probes ≈ 24.9 MB, under 25 MB. No `.zip` written under `downloads/`.
- S4: `pg.ts`: `outdbWindow(bbox, level)` split into `windowForBox(grid, box)` / `windowForPoint(grid, lon, lat)` and `outdbRaster(grid, window)` (the SQL expression; grid = `levelGrid(tiff, level)`, so E3b passes overview grids). Capability check reads both settings by real name with `current_setting()` in one row (= `SHOW`); `statement_timeout` asserted from `pg_settings.setting` (`60000`), since `SHOW` prints `1min`. postgres.js needs `host: /var/run/postgresql` (an empty URL host isn't a socket to it), so `SPIKE_PG_URL` is validated, then mapped to socket options. A `user:pw@/db` URL (libpq-valid, WHATWG-invalid) is caught as "password" before parsing.
- S4: PG2, PG3 and the PG4/PG5 message checks use fake sessions (no throwaway role: the spike never creates roles or grants); PG4–PG8 also run live on `critwire_dev` with altered or misspelt SETs on fresh connections. PG9's scan matches statement shapes (`alter role|user|database|system`, `grant <word>`, `revoke <word>`), so pg.ts's own "never ALTER or GRANT" message doesn't trip it.
- S4 finding vs F6: `/proc/<pid>/io` rchar is **not** an upper bound on network bytes: GDAL's curl receives with `recv(2)`, which rchar doesn't count (cold rchar 228–236 KB whether the socket got 58 KB or 91 KB; warm 0). Kept and labelled "file reads"; the `ss` socket counter is the measurement.
- S4 E2 points (pixel centres of full-resolution cells; class from a 5 × 5 one-class block, nodata 3 × 3): manaus (−60, −3) 1405 (F1's point, as given); taiga (100.000051, 62.000215) 101; sahel (0.000463, 13.000291) 201; steppe (105.000308, 46.999744) 404; sahara (11.999969, 24.000004) 801; lake-superior (−87.499871, 47.49979) 505; north-sea (2.999877, 55.000055) 900; pacific (−140.000257, 9.999795) 1102; ne-greenland-shrub (−21.739504, 78.144229) 303; ne-greenland-nodata (−22.180022, 78.251742) nodata. Level-1 classes 100, 200, 300, 400, 500, 800, 900, 1100, 1400 + nodata; three at ≥ 60° N. No shrubland near the tried low-latitude spots (Karoo, mulga, Great Basin, Wyoming all read grassland/savanna), so 303 comes from NE Greenland. Ice reads 803 (cold desert), not nodata.
- S4 E2 result: the three readers agree on all 10 points in all 5 runs (PostGIS by cell = by point = geotiff.js = TiTiler; nodata = NULL / 0 / null). Bytes per point: PostGIS cold 58–91 KB on the socket (≈ 57 KB of GDAL header/index reads + the tile, in 16 KB chunks; ≥ the tile lower bound every time), median 362 ms; warm 0 B, 10 ms (GDAL's per-process cache). geotiff.js cold = the tile + exactly 5,084 B (header 1,024 + IFD 4,048 + one 8 B TileOffset + one 4 B TileByteCount), median 196 ms: **it reads IFD 0's tile index lazily, not F2's 6.9 MB whole** (E4/option (a) input); warm refetches the tile (no tile cache). TiTiler ≈ 80 ms per point once warm (a 4.45 s cold start in the probe). Step S3 bytes ≈ 14 MB (3 E2 runs × 4.44 MB + ≈ 0.7 MB probes).

- S5 polygons: `TT` and `AX` (Åland, Natural Earth 10m countries, centroid 60.18° N; window 1712 × 1254 = 2.15 M cells, under 5 M). Faroe (62° N) also fit; Åland is nearer 60° N. NE's Åland is 942 km² (its simplified coast), not the official land area: lessons use NE's polygon as given.
- S5 method 4: the out-db window is warped whole (`ST_Transform(rast, 6933, 'NearestNeighbor')`, GDAL's default square pixel: 101.75 m TT, 74.11 m AX), then clipped by the polygon in 6933, so the polygon is rasterized on the equal-area grid. Out-db warp works in PostGIS 3.4.2.
- S5 added row 2e (per-row cell area on the WGS84 ellipsoid, × (1 − e²)/(1 − e² sin² φ)²) and 2p (all polygon cells, `ST_AsRaster` on the same grid): the sphere's per-row cos φ gap to `ST_Area(geography)` (+0.63 % TT, −0.34 % AX, under 2 %) is Web Mercator applying the sphere's formula to WGS84 latitudes; on the ellipsoid it closes to ≤ 0.01 %. E3c's method 1 stays the plan's sphere formula; §5 says which.
- S5 E3 result: TT 502,279 habitat cells (22 classes; 17 nodata cells in the polygon), AX 357,849 (13 classes, 0 nodata). Nominal Mercator overstates area 1.034× TT (sec² φ at centroid 1.035) and 4.05× AX (sec² 4.04); vector `ST_Area(3857)` ÷ geodesic 1.041 / 4.032 (includes the ellipsoid factor). Methods 2e, 3a, 3b and 4 agree within 0.02 % on the whole polygon; per class, method 4 vs 2e within ≈ 1 % for classes over ≈ 1 % of the polygon, up to tens of % for classes of a few dozen cells (nearest-neighbour resampling). Cold read 292 KB TT / 358 KB AX (1.9–2.2 × the tile lower bound), 0.7–0.9 s; warm 30 KB / 0 B, 0.1–0.26 s.
- S5 TiTiler: `/cog/statistics` POST at full resolution returns 500 (the probe's message: "Unable to allocate 1.31 GiB", rio-tiler's 10× coverage array), so the cross-check uses `dst_crs=EPSG:3857&max_size=1024`: an overview resampled to ≈ 1.5–1.7 × the COG pixel. Class shares agree within 0.6 pp; its valid pixels, scaled, run +0.9 % TT / +3.4 % AX (edge pixels kept whole; Åland's archipelago coast), its coverage-weighted `count` scaled +0.10 % / +0.35 %. TiTiler can't give full-resolution zonal stats for a country-sized polygon: §5/§8 input.
- S6 verdict: **PostGIS reads overviews: yes (attempt 2, pixel coordinates)**. `GTIFF_DIR:<k+1>:/vsicurl/…` (GDAL 3.8.4's 1-based directory; ÷8 = `GTIFF_DIR:4`, ÷1024 = `GTIFF_DIR:11`) with the out-db band on `ST_MakeEmptyRaster(w, h, col, row, 1, 1, 0, 0, 0)` equals geotiff.js `getImage(k)` + `readRasters({ window })` on all 5 windows (TT, AX at ÷8 and ÷1024, and the whole ÷1024 level: histogram and 100 cells, warm = cold, no warnings), and the whole ÷1024 level equals F3 (56 values, nodata 67, 803 32,470, 900 19,989, 1102 51,850). Cold 0.3–0.46 s, 75–208 KB on the socket (TT ÷8 92 KB vs a 17 KB tile lower bound; AX ÷8 208 KB vs 108 KB); warm 0 B, 4–52 ms.
- S6 attempt 1 (empty raster at k × 103.02 m, band on the whole file) fails, as Fable predicted: off the origin PostGIS 3.4.2 raises a WARNING (not an error) "The in-db representation of the out-db raster is not aligned. Band data may be incorrect" and returns nodata; at the origin (whole ÷1024) it silently returns the full-resolution 380 × 380 block at (0, 0) (equal to geotiff.js level 0 there). Attempt 2g (`GTIFF_DIR` on the level's EPSG:3857 grid) fails with the same warning: GDAL gives the overview IFD no georeferencing, so only pixel coordinates line up.
- S6 deviations: attempt 2 run both ways (2p, 2g) so the verdict doesn't hang on whether GDAL georeferences an overview IFD; the whole ÷1024 level is a fifth window (F3's check on PostGIS as well as geotiff.js); `pg.ts` sessions keep the server's notices and any WARNING fails a window (VC6: a warning is a refusal). E3b lives in `scripts/e3b-overviews.ts`, run by `e3-zonal.ts --overviews`; S5's polygons moved to `scripts/polygons.ts` (an import cycle under top-level await deadlocked). `ST_DumpValues` read as `(r, 1, false)::int[]`: postgres.js parses `NULL` inside a `float8[][]` as `NaN`.
- S6 → S7/S22: a `GTIFF_DIR` raster has no georeferencing, and re-georeferencing an out-db band misaligns its reads again. So a polygon clip on an overview copies the values into a level-grid in-db raster (`ST_SetValues` on `ST_MakeEmptyRaster` at k × 103.02 m, 3857) or maps the polygon into pixel coordinates first; S7 method 2 takes the first. Lessons say both pitfalls (the warning, and the origin case that returns wrong data silently).
- S7 deviations: zip members are held in memory and never written (Node `zlib` via `zip-range.ts readMember`, CRC-32 + size checked, sha256 in `downloads/SOURCES.md`), as S3 did, not Python `zlib`; `find downloads -name '*frac*'` lists nothing. The centre rule is one PostGIS `ST_Clip` (no crop) of a ones raster on the 1 km grid per polygon (`centreMask`, FS5), applied to every class in Node; the plan's route (`ST_SetValues` of the geotiff.js window, then `ST_Clip`) is run on each polygon's largest class and must equal it (it does). Border cells = cells `ST_PixelAsPolygons` shows the boundary crossing (`ST_Clip`'s `touched` is PostGIS 3.5). Method 1 is also given on the ellipsoid (1e, S5's 2e), and method 3 (geodesic) is compared with 1e, so S5's sphere gap (+0.63 % TT, −0.34 % AX) isn't booked as method 3's error; method 2 is compared with 1 (both sphere). Self-check slack = the cell's number of non-zero classes (each stored fraction is off by < 1); a cell no fetched class covers counts as short.
- S7 T11 path, taken: run 1 (27 members, method 1's classes, 391 MB) left 2 of 4,305 TT cells short (997 from 2 classes, 998 from 1); no unfetched class in TT's unclipped window. Stage 2 (added): fetch every member FS1 names. Run 2 (all 79, 695 MB): still short, and 303 TT / 470 AX cells summed ≈ 2,000. Cause, from v004's CHANGELOG: "Marine Oceanic classes and the pelagic Neritic class (9.1) are __not__ mapped in the global composite map, but instead supplied separately in the fractional exports" (the water column over the seafloor classes). So `OVERLAY_CLASSES` = 901, 1000–1004 sit outside the partition: the self-check sums the partition, and a check asserts the overlay covers every cell whose full sum exceeds 1000 (0 unexplained). Run 3 (all 79 again, 695 MB): 16/16. The 2 short TT cells stay short with every member fetched; the COG there holds only 106 (+ 2 cells of 306), no nodata: v004's own aggregation (its 1 km cell isn't the COG's 11 × 11 block), not a missing class. Deficits over all checked cells are 0–7 (TT) and 0–5 (AX): per-class truncation.
- S7 → mission D: `pnpm ingest habitat` must sum the partition only and keep 901/10xx apart (or drop them): they'd add 360.6 km² to TT (+7 %) and 286.1 km² to AX (+30 %). Members 1000 (and 200, 504, 509, 512, 516–518, 800, 1100, 1400) are 49–50 KB compressed, 1,833,944 B inflated: all-zero layers.
- S7 E3c result (km², estimated; totals = 1 · 1e · ÷8 · ÷16 · 3 · polygon geodesic): TT 5,154.8 · 5,122.5 · 5,161.8 · 5,157.1 · 5,117.2 · 5,122.9; AX 938.8 · 942.0 · 936.9 · 939.5 · 945.1 · 942.1. Largest error on a class ≥ 1 % of the polygon: ÷8 +13.4 % TT (900) / −21.2 % AX (900); ÷16 +23.9 % TT (500) / +66.6 % AX (909); method 3 +12.5 % TT (900) / +13.9 % AX (909). Method 3 on every non-marine class ≥ 1 % is within 2.2 % of 1e (TT 106 −0.4, 306 −0.2, 1402 −0.3, 500 +2.2; AX 104 −0.4, 1403 −0.7, 500 −1.6); its error sits in coastal marine classes, whose 1 km border cells (77 % / 76 % of their area) take sea from outside the polygon. Border cells: TT 286 (6.6 % of the area), AX 457 (29.3 %: the archipelago). Classes under 1 %: the overviews drop several entirely (1206, 1207, TT 909: −100 %) and swing tens of %; method 3 keeps them within ≈ 5 % except tiny coastal ones (TT 908 −19.6 %, 1206 −9.7 %, 909 1.3 km² vs 0.07). §5: the 1 km fractions are the summary method; overviews only as a labelled sample.
- S7 cost (D's ingest estimate): all 79 members = 695,469,068 B from Zenodo in 223 s (3.1 MB/s at ≤ 2 req/s, one at a time); geotiff.js decodes 43 ms per million cells (median, full-width 256-row bands), so one 659 M-cell layer ≈ 28 s and all 79 ≈ 37 min single-threaded on this VPS; max RSS 712 MB holding one member. Method 2 cold reads 92–208 KB, 0.5–0.7 s. Step traffic: Zenodo ≈ 1.80 GB (runs 1–3 + 19.6 MB probes; free public service, no owner egress), S3 ≈ 2.4 MB.
- S7 artefacts: `out/e3c-methods/` (the offline re-render: summary, results.json, windows/ cache), `-run3/` (as fetched), `-run1/`, `-run2/` (the T11 path's evidence).
- S8 result: `ST_AsGDALRaster(ST_Clip(<out-db window>, geom), 'COG', ARRAY['COMPRESS=DEFLATE', 'BLOCKSIZE=256', 'RESAMPLING=NEAREST'])` works in PostGIS 3.4.2 / GDAL 3.8.4 (no `'GTiff'` fallback). Costa Rica (NE 10m, incl. Isla del Coco): window 4923 × 6223 (30.6 M cells), cut 3.6–4.1 s cold (median 3,966 ms), 2.33 MB S3 per cut (1.79 × the 1.30 MB tile lower bound); clip `clips/cr.cog.tif` 1,418,162 B, byte-identical over 6 cuts (sha256 `6cf2d44e…`). 6 levels (full, ÷2 … ÷32), 256 px tiles, DEFLATE, ghost `IFDS_BEFORE_DATA`, EPSG:3857, nodata 0, on the COG's grid; 35 classes. CV5: 100 cells = PostGIS `ST_Value`, full histogram = `ST_ValueCount`, clip = COG inside the polygon / nodata outside (centre rule).
- S8 deviations: (1) GDAL's COG driver writes no `OVR_RESAMPLING_ALG` (the owner's COG has it, so its maker, not GDAL's COG driver, wrote it): CV4 fails only a recorded non-NEAREST value and judges nearest by value: every overview cell's value must occur under it in the level above (±1 cell). Level by level, because the driver builds each overview from the previous one: ÷8 had 289 of 477,855 cells off their ±1 full-resolution footprint, 0 off their parent's. CV4's test proves an `AVERAGE` overview fails. (2) "Codes ⊂ the full-file histogram" = ⊂ Jung v004's legend codes (`out/jung/legend-v004.csv`): there is no full-resolution full-file histogram, and the ÷256 one lacks class 1207, which CR holds (info line). (3) `cog.ts` `assertPyramid` takes ⌈w₀ / 2^k⌉ (gdaladdo) or ⌊w_{k−1} / 2⌋ (the COG driver; CG7 extended). (4) CV5 adds the full-resolution histogram (geotiff.js = `ST_ValueCount`) and a content check (clip = out-db COG where the cell centre is inside the polygon); 83 of the 100 grid cells fall outside the polygon (ocean), so the histogram carries the weight.
- S8 browser windows (S9 reads these): 256 × 256 centred on (−84.2, 10.1) (Poás–Barva: forest, farmland, town), at full resolution (clip col 3025, row 1092) and ÷8 (level 3); Node geotiff.js histograms in `out/e4-clip/results.json` `browser`.
- S8 option (a) price (`out/e4-s3/`): geotiff.js against S3, the same windows, cold, 3 runs each: full resolution 108,232 B in 8 requests (lower bound 103,136), ÷8 87,215 B in 11 (lower bound 69,975); ≈ 195 KB per learner for the two reads, 0.2–0.4 s each. geotiff.js does **not** load IFD 0's 6,931,200 B tile index whole (it reads 264 B of it at full resolution). The clip's full-resolution window equals S3's same cells (65,536 of 65,536 with data). Step S3 ≈ 23.9 MB (3 cut runs, 1 probe cut, the price run).

## Log

- 2026-10-22 15:57 UTC: Baseline. typecheck pass, test 66/66, build 157 files, E2E 20/20; dist hashes = live = A1 baseline.
- 2026-10-22 16:17 UTC: Architecture (architect): 12 targets, findings checked live (COG header, PostGIS /vsicurl read = TiTiler value, TiTiler CORS ok, S3 none, IUCN terms via Wayback). `postgis_raster` now installed in `critwire_dev` (Baseline note superseded). Plan-only change; no code touched.
- 2026-10-22 16:20 UTC: Fable review (architecture-reviewer): APPROVE WITH CHANGES, 3 MUST-FIX (offline build: habitat summaries as committed ingest; E3b validate overview reads by values; load raster lib before SET + assert SHOW). Plan-only.
- 2026-10-22 16:21 UTC: Astra review: APPROVE_WITH_CHANGES, 4 MUST-FIX (offline build: COG summaries committed in data/; E3b pixel agreement w/ independent reader; overview counts not "true area", define resolution/aggregation; gate publication on confirmed Jung provenance). Plan-only.
- 2026-10-22 16:35 UTC: Revision (architect): all 5 MUST-FIX resolved (habitat summaries = committed `ingest habitat`, v004 1 km default; E3b value-checked vs geotiff.js; raster fn→SET→assert SHOW; est_area_km2 + E3c error per method; publication gated on Jung provenance), all SHOULD-CONSIDER adopted, new F12 (postgres can't read /srv/critter-ai). Plan-only; no grants left (pg_parameter_acl empty).
- 2026-10-22 16:55 UTC: Steps (planner): 26 steps S1–S26, Verification V0–V12 + release smoke, Failure modes (13 test groups, T11 map). Plan-only; typecheck pass; header check + result diff dry-run vs 002/A1 log: 77/77 match.
- 2026-10-22 17:08 UTC: S1. Spike scaffold: 74 files copied from A1 (provenance in `$SP/README.md`, 9 edited for paths/trim), pins installed (no ignored builds), `data/spike-tables.json` (countries). Spike typecheck pass, tests 82/82 (no edits beyond paths); copy proof 002 `--check --erd` 77/77, 0 diffs; 003 skeleton `--check` 1/1, `$M/queries.log` written; spatial wasm_eh 200 application/wasm 23,626,951 B. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 719 MB, no Caddy, 3100–3102 free.
- 2026-10-22 17:14 UTC: S2. `cog.ts` + `tile-bytes.ts`; CG1–CG10 red first (suite failed to load, 10/10), then 10/10 green; F2 re-derived 31/31 checks ok (`out/cog/`, `out/tile-bytes/`); (−60, −3) → col 129665, row 197741, tile 293,613 of 43,789 B; S3 3.61 MB for the step (fixture 262,144 + index run 3,342,936). Spike typecheck pass, tests 92/92. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 723 MB, no Caddy, 3100–3102 free.
- 2026-10-22 17:50 UTC: S3. `zip-range.ts` + `jung.ts` (+ `cog.ts`: etag-less pinned-size Range source, shared throttle, `geotiffOver`); ZP1–ZP6 + InflatedPrefix and JG1–JG5 red first (both suites failed to load, 12/12), then 12/12 green. `jung.ts` 13/13 checks ok: ÷1024 histogram = F3's (56 values; 1102 51,850, 803 32,470, 900 19,989); level 2; only v004 not excluded (v001–v003 code lists lack 11 marine codes); gate unconfirmed; fraction scale ×1000 found; `legend-v004.csv`, `frac-members.json` (79 members). Per run S3 403,333 + Zenodo 8,878,181 B; step ≈ 24.9 MB < 25 MB; no .zip in downloads/. Spike typecheck pass, tests 104/104. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 723 MB, no Caddy, 3100–3102 free.
- 2026-10-22 18:16 UTC: S4. `pg.ts` (socket-only URL, capability check, `learn_spatial`, out-db windows, `ss` counters, PG9 scan) + `compare.ts` + `e2-point.ts`; PG1–PG9 and VC1–VC6 red first (both suites failed to load, 15/15), then 15/15 green. E2 32/32 checks: 3 readers agree on 10 points × 5 runs; (−60, −3) = 1405; every cold PostGIS read ≥ tile lower bound (58–91 KB, 362 ms median; warm 0 B); geotiff.js cold = tile + 5,084 B (lazy tile index). rchar is no network bound (Decisions). S3 ≈ 14 MB for the step. Spike typecheck pass, tests 119/119. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 724 MB, no Caddy, 3100–3102 free; `learn_spatial` empty.
- 2026-10-22 18:27 UTC: S5. `e3-zonal.ts` (TT, AX/Åland): 12/12 checks; habitat counts identical over 3 cold + 3 warm reads; per-row cos φ vs geodesic +0.63 % / −0.34 % (ellipsoid ≤ 0.01 %); Mercator ÷ true 1.034 / 4.05 vs sec² φ 1.035 / 4.04; 6933 warp within 0.02 %; cold 292 / 358 KB ≥ lower bound; TiTiler full-res 500, max_size=1024 shares within 0.6 pp. S3 ≈ 4.7 MB for the step (2 runs + probes). Spike typecheck pass, tests 119/119. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 725 MB, no Caddy, 3100–3102 free; `learn_spatial` empty.
- 2026-10-22 18:46 UTC: S6. `e3b-overviews.ts` (`e3-zonal.ts --overviews`) + `polygons.ts`; pg.ts `gtiffDirPath`/`outdbPixelRaster`/notices. Verdict: PostGIS reads overviews: yes (attempt 2, `GTIFF_DIR` pixel coordinates), 5/5 windows = geotiff.js, ÷1024 = F3; attempts 1 and 2g fail ("not aligned" WARNING; attempt 1 at origin silently returns level 0). 10/10 checks. No new tests (VC6 covers the verdict). S3 ≈ 3.6 MB for the step (2 runs + probes). Spike typecheck pass, tests 119/119. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 726 MB, no Caddy, 3100–3102 free; `learn_spatial` empty.
- 2026-10-22 19:15 UTC: S7. `e3c-methods.ts` (+ `--offline`; e3-zonal exports `rowCounts`); FS1–FS5 red first (suite failed to load, 5/5), then 5/5 green. E3c 16/16 checks: 3 methods × 2 polygons; T11 path taken (all 79 v004 members; overlay 901/10xx found outside the composite partition, CHANGELOG-quoted); method 3 within 2.2 % on non-marine classes ≥ 1 %, overviews off up to 21 % (÷8) / 67 % (÷16); 2 TT cells short with every member fetched (v004 aggregation). Zenodo ≈ 1.80 GB (3 runs), S3 ≈ 2.4 MB; members never written. Spike typecheck pass, tests 124/124. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 735 MB, no Caddy, 3100–3102 free; `learn_spatial` empty.
- 2026-10-22 19:33 UTC: S8. `e4-clip.ts` (cut + `--s3-price`), `cog.ts` pyramid takes the COG driver's ⌊previous / 2⌋; CV1–CV6 red first (suite failed to load, 6/6) + CG7 case red (1/10), then green. E4 cut 12/12: CR COG clip 1,418,162 B (byte-identical × 6), 3.97 s median, 2.33 MB S3 per cut; ghost/tiles/6 levels/EPSG:3857/nodata 0/grid ok; overviews nearest by value level by level (no `OVR_RESAMPLING_ALG` from the COG driver); 100 cells + full histogram = PostGIS. Option (a) 3/3: ≈ 195 KB per learner, tile index not loaded whole. Step S3 ≈ 23.9 MB. Spike typecheck pass, tests 130/130. Guard: plans-only, 002 untouched, typecheck pass, test 66/66, dist = baseline (157), spike 737 MB, no Caddy, 3100–3102 free; `learn_spatial` empty.

## Summary
