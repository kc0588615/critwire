# Mission brief: critwire Learn L1, the lab data: countries file, GBIF sample, shapes, loader (mission L1)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l1-data.md, then run:
     mission start critwire <that file>        (base: main with plans/004-learn-curriculum.md merged)
     Start only after the owner has reviewed plans/004-learn-curriculum.md and answered its §10 choices
     (without an answer, build its recommendation).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§4, §7, §9).
     Chain: L1 (this) → L2 critwire-learn-l2-site → L3 critwire-learn-l3-gis → L4 critwire-learn-l4-stats-etl
     → L5 critwire-learn-l5-powerbi-capstone; each starts after the one before is merged and live.
     Estimate: about 32–38 sessions (6 pipeline stages, about 24 steps, code review, verification, release). -->

## Goal

critwire.com publishes the data every Learn lab reads, built exactly as `plans/004-learn-curriculum.md` §4 designs it, and a repository check that loads it into PostGIS:
- **`/v1/countries.{parquet,csv,json}`** (002 §6, kept by 004 §1): 250 rows from Natural Earth v5.1.2 admin-0 attributes, every species country code matching, credited in `attribution.json`, listed on the docs page. Every existing `/v1` file keeps its bytes.
- **The GBIF open-records sample** (004 §4.2): `pnpm ingest gbif-sample` reuses the download in `download.json` (first, the spike's; Notes) or submits a new one, waits, fetches, and commits `data/raw/gbif-sample/{download.json,datasets.json,sample.csv}`: the species rule, the effective license, the country-key contract and the cap of 2,000 records per species by ascending `md5(gbifID)`, plus every dataset's and publisher's metadata. `pnpm derive` writes the sample's per-dataset counts.
- **Its own GBIF derived-dataset DOI**: `pnpm gbif:register --target learn-sample`, deposit tags `gbif-learn-<hex12>`, `originalDownloadDOI` = the download's DOI. Plain `pnpm build` refuses a missing or stale sample DOI. The countries target, its `gbif-dd-*` tags and `10.15468/dd.ky9cyt` are untouched.
- **The shapes** (004 §4.1): Natural Earth admin-0 and admin-1 at 1:50m (commit `f1890d9f…`), RESOLVE Ecoregions 2017 simplified per feature at 0.05° with `biomes`, written as GeoParquet 1.0.0, byte-identical on a re-run; plus the habitat legend and A2's two-country habitat summaries (real Jung v004 rows, labelled stand-ins until L3).
- **`/learn/data/`** (004 §4, §7.1): the sample's three files, the shapes, `postgis/learn_curriculum.sql` (the psql-only loader, one transaction, 14 tables, §4.3), `manifest.json` with every file's `sources` (§4.5), and the index page listing files, sizes, sources, licenses, DOIs and the sample's dataset table. The build refuses a breach of the 50 MB cap (§4.4) and any credit failure (§4.5).
- **`pnpm learn:check`, loader stage** (004 §7.6): loads the loader twice through `psql` on libpq's `PG*` variables or `LEARN_PG_URL`, never `DATABASE_URL`; refuses database `critwire` by name and by `current_database()`; checks CREATEROLE; compares row counts with the build's.
- **`AGENTS.md`**: the copy line replaced as 004 §10 says (below), the new commands and files, and the DOI refresh steps for the `learn-sample` target.
- **E2E**: `learn-data` (004 §7.7) and the countries cases from 002 §8.
- It's live: the mission merges and deploys at its end (owner's standing decision, 2026-10-21).

## Why

critwire Learn is now a practitioner curriculum (004): database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on open data, starting with the owner's own job skills. Every lab in L2–L5 reads these files, so they come first, are credited properly, and are tested the way a learner will use them (`psql -f`, not an agent's shortcut).

## Scope

In:
- `data/raw/gbif-sample/`, `data/raw/naturalearth/`, the committed shape files (path per 004 §4.1, the architect names it), `data/countries.json`.
- `scripts/ingest/` (`gbif-sample`, `naturalearth`, the shapes), `scripts/derive/` (countries, the sample's counts) and their tests, `scripts/build/` (the countries writer, `writeLearnData`, the loader writer, credits and the manifest, `sources.ts` entries, the cap), `scripts/gbif/` (`--target learn-sample`), the `learn:check` command, `site/` (docs link, the `/learn/data/` index template), `e2e/`, `package.json` and the lockfile (only what the design needs), `AGENTS.md`, `plans/004-learn-curriculum.md` (fixes where code proves it wrong).
- One derived-dataset registration (the only network write), and a new GBIF occurrence download only if the spike's can't be reused.
- Reading, never editing, the spike `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/` (`etl/`, `scripts/loader.ts`, `lab-ddl.sql`, `lab-keys.sql`, `credits.ts`, `pg.ts`, `privilege.ts`, `canary.ts`, tests) and porting from it.
- Scratch schema `learn_curriculum` in `critwire_dev` (as `critter-ai` over the socket); `learn_t_*` test fixtures that their tests drop.

Out:
- `/learn/` pages other than `/learn/data/`, the browser engine, module pages, the star export, ERD pages: L2.
- `pnpm ingest habitat`, `occurrence_habitats`, the clips: L3. The Python stage of `learn:check`: L4.
- Any change to an existing `/v1` file's shape or bytes (only `attribution.json` gains the Natural Earth entry); `db/schema.sql`.
- `ingest gbif`, `contributions.json`, `registration.json` and `10.15468/dd.ky9cyt`; any `gbif-dd-*` tag.
- Caddy (`/etc/caddy`, the ops Caddyfile): `/learn/data/` gets no CORS unless the owner chose it in 004 §10, and then it's a control-room change (handoff item).
- IUCN data of any kind; Wikipedia prose; WorldClim; WDPA. The `critwire` database, except through `deploy critwire`. Schema `learn_spatial` (A2's): never written or dropped.

## Definition of done

- `pnpm typecheck`, `pnpm test` (ported failure cases first: the spike's CK, SC, LD and the countries matcher's) and plain `pnpm build` pass on the final commit; `pnpm derive` prints `DOI current` for both targets.
- **`pnpm e2e` passes in full**, nothing skipped, including `learn-data` with every case 004 §7.7 lists and the countries cases.
- **Existing files unchanged:** at Baseline, save `sha256sum` of every file in `dist/` from a fresh `origin/main` build. The final build matches it for every `species.*` and `species/*` file; `attribution.json` differs only by the Natural Earth entry (checked with `jq`); `index.html` may change.
- **The sample is the spike's**: from the spike's download (Notes), the published `occurrences` holds the same 40,395 records with the same values as the spike's `site/learn/data/occurrences.parquet` (a test compares them; a difference is a bug in the port, not a new number). Every load check 0; the download's echo of both `checklistKey`s checked; datasets and publishers all titled. Only if the reuse is impossible, a new download, and then 004 §4.2's numbers are re-measured on it.
- **The loader**: `pnpm learn:check` loads it twice in `critwire_dev` with the same rows; a forced failure (004 §4.3) leaves the previous `learn_curriculum` intact; `learn_spatial`'s canary is the same before and after.
- **Sizes**: `dist/learn/data/` and the committed lab data each under 50,000,000 bytes; the build refuses either above (a test proves it).
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l1-data/e2e/`: the Playwright HTML report, a trace per test, `results.json`, screenshots of `/learn/data/` at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: `/v1/countries.*` return 200 with 250 rows; every `/learn/data/` file returns 200 and hashes as `manifest.json` says; every existing `/v1` file hashes as at Baseline (except `attribution.json`, as above); the live loader, downloaded, loads with `psql -X -v ON_ERROR_STOP=1 -d critwire_dev -f` and matches `pg-smoke`'s row counts.
- The plan's Summary gives: what shipped, both DOIs, the measured numbers, every deviation from 004 (and the 004 commit that records it), the release record, and what L2 needs to know.

## Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Simplest approach that works**, and critwire stays static files: no server process, the build stays offline.
- **Data rules from `AGENTS.md` hold:** snapshots committed, derive offline and pure, build from `data/`, never hand-edit derived files, every third-party field and file credited.
- **Licenses decide what's published.** If unclear, don't publish. The effective-license rule (004 §4.2) stands unless the owner's §10 answer changes it.
- **Records, never range**, in every page and string.
- The owner's answers to 004 §10 override this brief where they differ; without an answer, use 004's recommendation. Choose freely between equal options and record the call; anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.

## Notes

- **Copy line (004 §10, applied here):** in `AGENTS.md`, replace "No Wikipedia prose (share-alike); write copy fresh for grades 6–12." with "No Wikipedia prose (share-alike). Write all copy fresh, in our own words, for adults new to the topic: plain, precise English a working professional reads fast; define each term once; link to open references instead of rewriting them."
- **Python or TypeScript.** The spike wrote the shapes with Python (`etl/shapes.py`: GeoPandas, pyogrio, Shapely's topology-preserving simplify) and the sample with Python (`etl/gbif_download.py`, `gbif_load.py`, `sample_rules.py`). The build is Node and stays Node. Recommendation: the sample ingest in TypeScript like the other ingests (HTTP, a zip, CSV, DuckDB); the shapes ingest on 004 §3.3's pinned `uv` environment (`.venv-learn`, `requirements.txt`), since Node has no GEOS or shapefile reader without extensions. If L1 brings the `uv` environment forward, L4 reuses it. Record the call.
- **Facts the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S2–S15), each a trap if forgotten:
  - Pin `checklistKey` to the legacy backbone `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, at the top level and on `TAXON_KEY`; check GBIF's stored request echoes it.
  - 4 `ids.gbif` are backbone synonyms: species by `speciesKey`, else `taxonKey`; none or two fails.
  - 11 datasets declare CC BY-NC 4.0 over records GBIF labels CC0/CC BY; effective license = the stricter of record and dataset; iNaturalist holds two record licenses, so `license` stays on `occurrences`.
  - `COPY … (FORMAT csv)` only; text format silently altered 9 rows (F10). The loader writes shapes as base64 WKB and sets `client_encoding` UTF8 after `BEGIN` (psql on Windows).
  - Node DuckDB reads GeoParquet `geom` as `GEOMETRY` unless `enable_geoparquet_conversion = false`.
  - RESOLVE `ECO_ID` 0 "Rock and Ice": `biome_id` and `realm` NULL; any other `N/A` fails. Admin-1's `iso_3166_2` is dropped (`AU-X02~`); `adm1_code` is the key.
  - **Reuse the spike's download** (004 §4.2): key `0041824-260928105237408`, DOI `10.15468/dl.fbpk9w`, the owner's GBIF account; its zip and `download.json` are in the spike's `downloads/gbif-0041824-260928105237408/` (sha256 recorded), and GBIF serves it. GBIF erases an uncited download after six months, on 2027-04-23; registering the sample's derived dataset cites it and keeps it, so register well before then. Same download + same rules = the same sample, so every result in 004 holds on the published files and L2–L5's pages match 004. If 2027-04-23 has passed: a new download (the spike's took 16 min 41 s), and every 004 result is re-run on it (record it; it adds sessions here and in L2).
  - Dataset and publisher metadata took 5 min 55 s at ≤ 2 req/s; titles can change between reads, so a block that prints a title may move (record which).
- **GBIF credentials** (`GBIF_USERNAME`, `GBIF_PASSWORD`) are in `.env` (handoff H1, closed). Never log or commit them. `pnpm gbif:register` runs on the Oracle VPS only (lock and intent in `~/.local/state/critwire/`); never delete or move a `gbif-dd-*` or `gbif-learn-*` tag.
- **PostGIS**: `critwire_dev` has PostGIS 3.4.2 and `postgis_raster`; `critter-ai` over the socket is superuser, the `.env` role `critwire` can't create roles. No PostGIS 3.5-only functions.
- **Pointers into 004:** carry-overs §1, data §4 (§4.2 the sample, §4.3 the loader, §4.4 the cap, §4.5 credits, §4.6 CORS), site §7 (§7.1 URLs, §7.5 build refusals, §7.6 `learn:check`, §7.7 E2E), chain §9, owner's choices §10, the ETL spike §A.1, differences from 002/003 §B.
