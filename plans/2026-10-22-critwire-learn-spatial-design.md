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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-22 15:57 UTC: Baseline. typecheck pass, test 66/66, build 157 files, E2E 20/20; dist hashes = live = A1 baseline.
- 2026-10-22 16:17 UTC: Architecture (architect): 12 targets, findings checked live (COG header, PostGIS /vsicurl read = TiTiler value, TiTiler CORS ok, S3 none, IUCN terms via Wayback). `postgis_raster` now installed in `critwire_dev` (Baseline note superseded). Plan-only change; no code touched.
- 2026-10-22 16:20 UTC: Fable review (architecture-reviewer): APPROVE WITH CHANGES, 3 MUST-FIX (offline build: habitat summaries as committed ingest; E3b validate overview reads by values; load raster lib before SET + assert SHOW). Plan-only.
- 2026-10-22 16:21 UTC: Astra review: APPROVE_WITH_CHANGES, 4 MUST-FIX (offline build: COG summaries committed in data/; E3b pixel agreement w/ independent reader; overview counts not "true area", define resolution/aggregation; gate publication on confirmed Jung provenance). Plan-only.
- 2026-10-22 16:35 UTC: Revision (architect): all 5 MUST-FIX resolved (habitat summaries = committed `ingest habitat`, v004 1 km default; E3b value-checked vs geotiff.js; raster fn→SET→assert SHOW; est_area_km2 + E3c error per method; publication gated on Jung provenance), all SHOULD-CONSIDER adopted, new F12 (postgres can't read /srv/critter-ai). Plan-only; no grants left (pg_parameter_acl empty).

## Summary
