# Mission brief: critwire Learn, the spatial track: outlines, records, the habitat map (mission D)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-d.md, then run:
     mission start critwire <that file>        (base: main after mission C is merged and live)
     Start only after B2 and C are live on critwire.com (each Release: Result: done) and the owner has answered
     plans/003-learn-data-spatial.md §8 (without an answer, build its recommendation).
     Written by mission A2 (critwire-learn-spatial-design), step S25. Design: plans/003-learn-data-spatial.md, on plans/002-learn.md.
     Before it: plans/briefs/critwire-learn-c.md (traits, names, lessons 17–21).
     Estimate: about 34–40 sessions (6 pipeline stages, about 25 steps, code review, verification, release). -->

## Goal

critwire Learn gets the advanced spatial track and the habitat map, built as `plans/003-learn-data-spatial.md` designs (§2 tables, §4 lessons, §5 raster, §6 IUCN):
- **Country outlines** (003 §1 D2): `country_shapes` from Natural Earth admin-0, the same pinned release as `/v1/countries.*`, as GeoParquet with WKB geometry: 1:50m for the browser, 1:10m for PostGIS lessons.
- **An occurrence sample** (003 §1 D3, §2 `occurrences`): a capped sample per animal of open records (CC0 1.0 and CC BY 4.0 only), drawn inside `pnpm ingest gbif` with the countries filters, in the same run, so every sampled record is one `contributions.json` already counts; each row keeps its `license` and `dataset_key`.
- **The habitat map from Jung et al. 2020 v004** (003 §1 D4, §5): `pnpm ingest habitat` computes `country_habitats` (estimated km² per country and class, method 3) and each sampled record's `habitat_code` from v004's 1 km fractional layers, and commits them under `data/raw/habitat/` with version, file, md5 and method; `habitat_classes` from v004's legend. Regional COG clips, if the owner picked option (b) (default: yes, a few, from v004).
- **The provenance gate** (003 §5): nothing cut or computed from the owner's COG is published unless the owner has confirmed its provenance; the default source is v004 by its Zenodo URL.
- **The `spatial` extension** self-hosted in B's mirror, `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/spatial.duckdb_extension.wasm`, loaded only on spatial lesson pages.
- **Lessons:** grown-data lessons 22–23 (habitats, shares); spatial lessons 1–5 and 8 in the browser (DuckDB spatial; lesson 8 with geotiff.js on a clip); spatial lessons 6–7 and the PostGIS parts of 1–5 and 8 as "run it in your own PostGIS" pages; IUCN lessons 1–3 as "on your own download" pages (003 §6), which never hold IUCN data.
- **A PostGIS lesson check:** a script (D's architecture designs it) that runs every PostGIS lesson block against `critwire_dev` and compares results, starting with F1's capability check and refusing to run if it fails. It is a dev check, never part of `pnpm build` or `deploy`.
- **Attribution** for every new table and derived field (003 §2's credit column), the docs page listing the new files, the ERD with the new tables, **its E2E**, and it's live: the mission merges and deploys at its end (owner's standing decision, 2026-10-21).

## Why

The spatial track takes learners who finished the core path to real spatial analysis: points and outlines, spatial joins, why Web Mercator lies about area, and a worldwide habitat map. It shows how much of geography is records and estimates, not facts, and how licenses decide which map critwire may publish. 003 measured where each lesson can run (browser or the learner's own PostGIS) and what each way of reaching the raster costs; this mission builds that.

## Scope

In:
- `scripts/ingest/` (`gbif`'s sample, a `naturalearth` shapes step, a new `habitat` source), `scripts/derive/` and their tests, `data/raw/habitat/`, the new derived files under `data/`, `scripts/build/` (new `/v1` writers, clips copied from `data/`, `sources.ts`, attribution, docs), `site/learn/` (setup, schema, the spatial pages, the extension mirror, the geotiff.js bundle), `e2e/`, `package.json` and the lockfile (`geotiff` 3.0.5, the PostGIS lesson script's needs), `AGENTS.md` (new commands, files, owners), `plans/003-learn-data-spatial.md` (relabelling the blocks this mission makes real; deviations).
- `CREATE EXTENSION postgis_raster` and schema `learn_spatial` in `critwire_dev`.
- The GBIF DOI refresh (`AGENTS.md`, "GBIF DOI refresh") if the new `ingest gbif` run changes the dataset counts.
- Reading the A2 spike at `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/` and porting what fits (`src/pip.ts`, `src/raster.ts`, `src/pg-setup.sql`, `scripts/e1-data.ts`, `gbif-sample.ts`, `e3c-methods.ts`, `cog.ts`, `pg.ts`, `run-queries.ts`), with its tests' failure cases. Never edit the spike.

Out:
- Any read of the owner's COG for published output before the gate is passed; changing or asking for keys to the owner's bucket; TiTiler, unless the owner chose option (d).
- IUCN data of any kind (ranges, categories, assessments), on critwire or in `critwire_dev`; Wikidata property P141; Wikipedia prose. IUCN lessons ship text, SQL and import commands only.
- WDPA and WorldClim data (003 §1: they block hosting). RESOLVE ecoregions, Natural Earth admin-1 and CHELSA: after this mission (003 §1).
- Changing any existing `/v1` file's shape; their bytes change only as a GBIF refresh changes them (below).
- `ALTER ROLE`, `ALTER DATABASE`, `ALTER SYSTEM`, `GRANT` and `chmod` (F1, F12): a needed grant is a handoff item for the control room. `/etc/caddy`, the ops Caddyfile, apt packages, the `critwire` database except through `deploy critwire` at the release.

## Definition of done

- `pnpm typecheck`, `pnpm test` (derive's sample, habitat and shapes rules, failure cases first) and plain `pnpm build` pass on the final commit; the build stays offline and reads no raster from the network.
- **Existing `/v1` files:** at Baseline, save the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`. The final build matches it for every `countries.*` file and C's files; `species.*` and `species/*` match too, or differ only in the fields derive takes from `data/raw/gbif/` (checked with a `jq` diff that lists every changed path); `attribution.json` differs only by the new entries and a refreshed DOI.
- **The data:** every sampled record is CC0 1.0 or CC BY 4.0, inside its taxon's counted datasets, and no taxon has more sampled than counted records (derive refuses otherwise); `country_habitats` covers every country with an outline, labelled **estimated** with its method; every `habitat_code` is in `habitat_classes`; derive refuses the habitat snapshot as stale when the outlines' sha256 or the GBIF snapshot's `retrieved` differ; every clip validates as a COG with nearest-neighbour overviews and the provenance in its snapshot. The DOI is current (`pnpm derive` prints `DOI current`).
- **003's queries re-run:** the blocks this mission makes real are relabelled `ran` in 003 and re-run against the built files with the spike's `run-queries.ts --check --erd` (or the port of it), each result difference explained under Decisions and `--update`d; the PostGIS lesson check passes against `critwire_dev`.
- **`pnpm e2e` passes in full**, nothing skipped: B's and C's specs unchanged, plus: every browser spatial lesson's SQL runs in its page and every exercise accepts its answer and rejects a fixed wrong one; lesson 8 reads its clip by range requests (206) and draws it; `spatial` loads from critwire's mirror with signatures on and only on spatial pages; the PostGIS and IUCN pages render their blocks; no request leaves the origin except to the two Wikimedia photo hosts (answered by a fixture).
- **Measured** under the spike's 4× CPU quota: a spatial lesson page's peak renderer memory (VmHWM) under A1's 700 MB budget, and its first-result time, recorded in the plan; over budget is a failure to fix, not a footnote.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-d/e2e/`: the Playwright HTML report, a trace per test, `results.json`, screenshots of spatial lessons 2 and 8 and of lesson 22 at 1280 and 375 px, plus the PostGIS lesson check's log, reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every new `/v1` file, clip and `/learn/` page returns 200; the clip answers a `Range` request with 206; `spatial.duckdb_extension.wasm` is `application/wasm`; every existing `/v1` file hashes as at Baseline or as the plan's recorded GBIF refresh says; one headless Chromium run against https://critwire.com/learn/contains/ runs spatial lesson 2 and shows its result.
- The plan's Summary gives: what shipped, the raster option built and the gate's state, the memory and timing numbers, whether the DOI was refreshed, the E2E counts and artifact path, every deviation from 003, and the release record.

## Decision rules

- **003 is the design**, built on 002, B's code and C's: reuse B's engine, mirror, cards, checks, page shell, ERD pipeline and E2E harness, and C's ingest and source patterns; add nothing that duplicates them. Where code shows 003 is wrong, choose the simplest fix, record it under Decisions, and update 003 in the same commit.
- **Data rules from `AGENTS.md` hold:** ingest fetches and commits; derive is offline and pure; the build only loads `data/` and copies committed clips; never hand-edit derived files; every field credits its source.
- **Records, not range:** an occurrence is a record of where an animal was seen or collected; a country outline is a mapmaker's line at one scale; a habitat area is an **estimate** from a map. Every page and string says so.
- **The gate holds:** without the owner's confirmed provenance (003 §5), everything published from the habitat map comes from v004 by URL, each file's md5 checked against its Zenodo record.
- **Self-host everything** the pages need, from pinned packages; no CDN, ever; the build stays offline.
- **PostGIS spelling first** in lessons, DuckDB's where the browser runs it, each difference shown once (003 §4); write for people aged 16 and up.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.
- The owner's answers to 003 §8 override this brief where they differ. Without an answer, use 003's recommendation: the raster as (c) summaries plus (b) a few clips from v004; commit `spatial` like B1's `parquet`; publish the occurrence sample; learners' PostGIS reads critwire's clip or their own v004 download, never the owner's bucket.

## Notes

- **What it assumes B delivered** (B1 and B2, merged and live): `/v1/countries.*` (250 rows); the self-hosted engine (duckdb-wasm 1.33.1-dev65.0, DuckDB v1.5.6, `eh` bundle) and the `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/` mirror; `setup.sql` (6 tables and the view); `site/learn/schema.mmd` with `pnpm erd` and the build's stale check; the 16 lessons (`lessons.json`, `site/learn/sql/`); the E2E harness; the cookbook, playground and game; the Caddy headers if they were approved. **Where B's plans record deviations from 002, B's code wins.**
- **What it assumes C delivered:** `traits`, `species_traits`, `species_names` (and `tree_nodes` if it shipped) in `/v1` and `setup.sql`; lessons 17–21; lesson 16 on `my_traits`; DECIMAL results decoded in the page engine (`country_habitats.est_area_km2` is `DECIMAL(12, 2)`). D uses C's tables only where 003 §3 lessons 22–23 do. Read C's plan first.
- **Pointers into 003:** datasets §1 (D2–D4); tables, setup and ERD §2; lessons 22–23 §3; the spatial track, the paired blocks and the learner's PostGIS setup §4; the raster, the gate, the options, the summary methods and `ingest habitat` §5; IUCN's terms and lessons §6; the owner's choices §8; "Disagreements with 002".
- **Facts the spike proved** (A2 plan Decisions and Findings), each a trap if forgotten:
  - DuckDB-WASM 1.33.1 can't put a GeoParquet `GEOMETRY('OGC:CRS84')` column in a table ("stoi: no conversion"): setup runs `SET enable_geoparquet_conversion = false` and `ST_GeomFromWKB(geom)`.
  - DuckDB-WASM sends an `ENUM` as an Arrow dictionary and every cell read back NULL (`ST_GeometryType`): the page engine decodes it or refuses it loudly; lessons `CAST(… AS VARCHAR)`.
  - `spatial` is 23.6 MB (6.33 MB on the wire), `LOAD spatial` 7.0 s at 4× CPU, and it, not the outlines, drives memory: boot plus `LOAD spatial` alone peaked at 624–670 MB of the 700 MB budget; 1:50m outlines 645–691 MB, 1:10m 686–725 MB. So 1:50m in the browser, `spatial` only on spatial pages, little headroom.
  - `ST_Area_Spheroid` and `ST_Distance_Spheroid` take latitude first: `ST_FlipCoordinates` before them. PostGIS: cast to `geography`.
  - On a boundary vertex `ST_Contains` is false and `ST_Covers` true in DuckDB 1.5.6 and PostGIS alike (despite DuckDB's docs).
  - Natural Earth at 1:10m: Egypt's shape fails `ST_IsValid`; nine pairs of codes share area (FR with GF, GP, MQ, RE, YT; NO with SJ, BV; NL with BQ; NZ with TK), so a point can be in two outlines; 1:50m lacks BV, GI, UM. Coastal and island records fall in no outline, more at 1:50m.
  - PostGIS raster settings are superuser-only (F1): a `SET` before `rtpostgis` loads is silently dropped, a misspelt one silently accepted, so every session runs `SELECT postgis_raster_lib_version()`, the two `SET`s, then asserts `SHOW`. An ordinary role needs `GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers` from a superuser.
  - The Postgres server can't read files under `/srv/critter-ai` (F12): rasters in PostGIS come over `/vsicurl/` or as bytes (`ST_FromGDALRaster(bytea)`, `ST_SetValues`).
  - Spike tables in `critwire_dev` must never depend on `public.species` (F11): `db:load` drops it in a transaction, and a dependent object breaks every build. Use schema `learn_spatial` only.
  - v004's 1 km fractions: 79 layers in `lvl2_frac_1km_ver004.zip` (695,484,415 B, md5 `bd8508db8118f14d8da7bfa7950523d4`), EPSG:4326, 0.0099157°; classes 901 and 1000–1004 are an overlay on the seafloor classes, so the summary counts the partition only. 223 s to download, about 37 min to decode on one thread; the worldwide centre-in-outline test is untimed. The spike's validated path is geotiff.js decode plus PostGIS `ST_SetValues` and `ST_Clip` (needs F1's grant); a Node-only path is unvalidated. D's architecture picks.
  - v004's 100 m composite is one 2.45 GB DEFLATE member (no range access): clips from it are a one-off download outside the repository, on EPSG:4326, so lesson 8's page uses a longitude–latitude step, not the spike's Web Mercator arithmetic.
  - A clip served by Caddy answered every range request with 206 and no `Content-Encoding`, under the live `encode zstd gzip`; Chromium may answer a repeat with a 304 to a conditional range request.
  - Overviews are samples, never areas (E3c: a ÷8 overview misses or doubles small classes); `GTIFF_DIR:` on a Web Mercator grid warns "not aligned" and reads wrong cells.
- **GBIF refresh:** the sample needs a fresh `ingest gbif`, which may change the dataset counts, the countries in `species.*` and new mismatches. Then follow `AGENTS.md`'s DOI refresh (tag, `pnpm gbif:register` on the VPS, derive prints `DOI current`) before the release; record the old and new DOI. If the GBIF credentials aren't in the worktree's `.env`, add a handoff item and carry on with the rest. `data/review/country-overrides.json` is the owner's: list new `country-*` review entries in the Summary, never edit the file.
- **The spike** (read only): `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/`, `README.md` lists every command; `run-queries.ts` re-runs 003's blocks in DuckDB-WASM (port 3102, never while `pnpm e2e` runs) and PostGIS (`SPIKE_PG_URL=postgresql:///critwire_dev`, critter-ai over the socket); `out/<run>/` holds every measurement 003 cites; `clips/cr.cog.tif` is cut from the owner's COG and stays research only.
