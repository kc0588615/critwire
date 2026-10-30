In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# AGENTS.md
Guidance for coding agents. Facts over prose. Plan: `plans/001-mvp.md`.

## What this is
Open curated species data at critwire.com, dogfooded by Critter Connect (repo `kc0588615/phaser-june`). Static files under `/v1/` (Parquet, CSV, JSON) plus a docs page, and Learn's lab data under `/learn/data/` (plan `plans/004-learn-curriculum.md`); no server process.

## Stack
- pnpm, TypeScript (`tsx`), postgres.js + plain SQL. No web framework.
- Postgres 16 + PostGIS 3.4.2 on the Oracle VPS. No PostGIS 3.5-only functions.
- `@duckdb/node-api` (pinned) writes Parquet and CSV from `data/species.json`; no DuckDB extensions at build time (build is offline).
- Python via `uv` (`/usr/local/bin/uv`) in `.venv-learn/` (gitignored; `pnpm learn:venv`), two pin files (004 §3.3): labs' `site/learn/labs/requirements.txt` (published; 44 pins, wheels on Windows/Linux/macOS 14 arm64) and ingests' `scripts/ingest/requirements.txt` (never published; `-c` the labs file + `rasterio`, whose own GDAL decodes v004's GeoTIFFs; no system GDAL). Recompile either with `uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in` in its folder. One venv serves the labs, `learn:check`, `pnpm test:db` and the ingests; each command checks only its own file's pins first (`scripts/venv.ts`): `learn:check` the labs' (a labs-only venv passes), `ingest shapes`/`habitat` the ingests'. Build stays Node.
- Learn's browser app: `@duckdb/duckdb-wasm` (pin in `site/learn/src/assets.ts`; build refuses another installed version) + parquet extension mirror committed in `site/learn/duckdb-ext/` (sha256 pinned in `scripts/build/learn/assets.ts`); bundled by `esbuild` (pinned) from `site/learn/src/`. `dist/learn/assets/`: mtime fixed 2000-01-01, so every path there must be versioned or content-hashed (build refuses others).
- E2E: `@playwright/test` (pinned), headless Chromium, local Caddy copy of the live block (`e2e/Caddyfile`, `admin off`, ports 3100/3101). `ajv` (exact pin, e2e only: `feedSchemaErrors`, c1's feed against its JSON Schema 2020-12).

## Prefer simplicity
Simplest approach that works. Ask before adding complexity.

## Data rules (non-negotiable)
- Source of truth: snapshots committed in `data/`. Ingest scripts fetch and commit; `pnpm build` writes `dist/` from `data/` and loads the same records into Postgres as a check (rebuilt each time). Never hand-edit the db.
- IUCN: store only the SIS taxon id (`ids.iucn`). Never store, cache, proxy or serve IUCN data (categories, assessments, ranges).
- No Wikipedia prose (share-alike). Write all copy fresh, in our own words, for adults new to the topic: plain, precise English a working professional reads fast; define each term once; link to open references instead of rewriting them. Bare trait values may come from any cited source in our own words; bulk imports only from open datasets.
- Every third-party field and photo records its source and license.
- Our ids: integer, never reused, plus slug. Outside ids live in `ids`. Retired ids get `replacedBy`. Retirement isn't supported yet: Learn's projection has no replacement junction (adding one changes `/learn/data/`'s loader and setup), so a record with `replacedBy` fails `pnpm build`, `/v1` included (`scripts/build/learn/projection.ts`). Don't retire an id until a change adds the junction.

## Databases
- `critwire`: the live build. Agents never use it.
- `critwire_dev`: agents' scratch db.
- Always `DATABASE_URL` from env; never hardcode connection strings.
- `CRITWIRE_DB_TARGET` (`.env`: `critwire_dev` here, `critwire` in the live copy): `pnpm build` and `pnpm db:load` refuse before any DDL unless `current_database()` equals it. Only those two read it.
- `critwire_lab` (LOGIN, CREATEROLE; owns `learn_curriculum` in `critwire_dev`): the Learn labs' role, via `LEARN_PG_URL` in `.env`; `pnpm learn:check` never reads `DATABASE_URL`, and refuses `critwire`. `learn:check --setup` (as superuser) creates it and writes `LEARN_PG_URL`. `--reset-password` breaks every other checkout's `LEARN_PG_URL`: list each checkout's `.env` with `--env` (repeatable), or copy the line from a working checkout instead.
- CLIs load `.env` under the environment (environment wins) and log each conflicting variable's name and winner, never a value.

## Two machines (WSL + Oracle VPS)
GitHub `origin` is the hub; only pushed work exists on the other machine.
- Agent work: one issue per branch `agent/<slug>` from fresh `origin/main`; rebase before the PR; push and open a PR via `gh` (HTTPS); the owner merges. GO comes only from the owner.
- Push before you stop, WIP included.
- Paths on the VPS: agents' checkout `/srv/critter-ai/critwire`, live copy `/srv/apps/critwire`.
- Release: `deploy critwire` on the VPS (pull main into the live copy, `pnpm install --frozen-lockfile`, `pnpm build`, swap in `dist/` only if the build passed). Owner's word only, except a mission may merge its PR and deploy at its end once every check passes (owner, 2026-10-21; `~/AGENTS.md`).
- Recovery (restore a commit into a scratch db, roll back the live site, state Git doesn't hold): `docs/recovery.md`. Adding state outside Git (a lock, a role, a secret) updates it.
- VPS setup (Postgres, Caddy, CORS) is done from the Oracle control room, not from here.

## Commands
- `pnpm install`, `pnpm typecheck` (root + `site/learn/tsconfig.json`, DOM, no node types), `pnpm test` (`scripts/**/*.test.ts`: offline, no database; the Python engine's process tests need `/usr/bin/python3.12`), `pnpm test:db` (`scripts/**/*.dbtest.ts`: `critwire_dev` only, refuses any other db).
- `pnpm build [--draft]`: offline. Re-runs derive in-process and refuses derived files that differ (`data/<file> is stale: run pnpm derive`); loads `DATABASE_URL` (advisory lock); writes `dist/` (`index.html`, `v1/species.{json,parquet,csv}`, `v1/species/{id,slug}.json`, `v1/countries.{json,parquet,csv}`, `v1/attribution.json`, `learn/data/`: index, `manifest.json`, lab files, `postgis/learn_curriculum.sql`, `star/`: d6's 8 `d6-star-*` blocks run in DuckDB, one CSV per table (8) + `manifest.json`; Learn's pages (map, tracks, modules, setup, schema, playground), `learn/assets/` (engine, extension, hashed app), `learn/labs/<page>.{sql,py,ipynb}` (`assemble.ts`; `.py`/`.ipynb` for a page with a Python block besides py-connect; setup's `.sql` is `pg-checks.sql`) + the labs' `requirements.txt`, `learn/labs/c1-feed{,.schema}.json` once the course has `c1-feed-file`, `learn/diagrams/`). Plain build refuses a star block whose DuckDB result differs from its `checked/<id>.txt` (`--draft` warns). Refuses `dist/learn/data/` or the committed lab data (`data/raw/gbif-sample/`, `data/learn/`, `data/gbif-learn-sample/`) over 120,000,000 bytes (owner raised it from 50 MB, L3 H5). Plain build refuses a missing/stale DOI (countries or learn-sample); `--draft` builds without them (preview only, never deploy), never with a stale sample. Plain build refuses (`--draft` warns), once the course has `c1-feed-file`, a missing `checked/c1-feed.json` or `labs/c1-feed.schema.json`, or a feed that isn't that block's recorded result ("…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check --update"); before that, any feed file. Plain build refuses a lab `learn:check` didn't prove as committed (`site/learn/labs/checked/checked.json`: "lab <id> is stale: run pnpm learn:check"); `--draft` warns. Loop: `pnpm build --draft && pnpm learn:check && pnpm build`.
- `pnpm e2e` (after `pnpm build`): Playwright suite; artifacts in `E2E_ARTIFACTS` (default `e2e-artifacts/`). Browser block results are `e2e/__snapshots__/<id>.txt` (seeded by `learn:port`, never rewritten by a run). Release smoke (after deploy, `dist/` = the released build): `RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=<dir> pnpm exec playwright test -c playwright.release.config.ts`.
- `pnpm learn:port <page>…` (page = `setup` or a module id): writes the page's block files (`site/learn/sql/`, SQL, Python, M, DAX) and seeds their recorded results (`checked/<id>.txt` PostGIS and Python, `e2e/__snapshots__/<id>.txt` browser), and a `json` fence with `$id` `https://critwire.com/learn/labs/<name>.json` to `site/learn/labs/<name>.json` (two with one `$id` refused), from `plans/004-learn-curriculum.md`; refuses, writing nothing, a file that differs. `--check <page>…|all`: every ported file and result equals 004 (`all` = every page with a block file).
- `pnpm erd [--force]`: draws `site/learn/erd/{schema,lab,star}.svg` from their `.mmd`, offline (mermaid in Playwright's Chromium, every request refused); only stale ones unless `--force`. Commit them: build refuses a missing or stale SVG ("site/learn/erd/lab.svg is stale: run pnpm erd").
- `pnpm gbif:register [--target countries|learn-sample]` (default countries): the one network write (GBIF derived dataset). See GBIF DOI refresh.
- `pnpm learn:venv`: (re)creates `.venv-learn` from both pin files (system Python 3.12, no downloads, wheels only). `pnpm test:db` needs it.
- `pnpm learn:check [--update | --module <page>] [--setup [--env <file>]… [--reset-password]]` (after `pnpm build`; whole runs and runs with a Python block or `.py` download first check `.venv-learn` against the labs' `requirements.txt`): as `critwire_lab` (refused if superuser or CREATE on `public`: `--setup`; refused while an earlier run's Python session `critwire-learn-check-py-*` runs on the db, naming the pid to end), loads `dist/learn/data/postgis/learn_curriculum.sql` twice (counts = manifest `tables`), a forced failure (must roll back), then `lab.mmd` against `learn_curriculum` (after boot blocks), then every PostGIS block of `site/learn/` in page order, then every ran Python block (`.venv-learn`, `python -I` in an empty folder, `LEARN_BASE=file://<abs dist>`, wall time printed; fails on exit ≠ 0, timeout, a process outside its group holding its output 1 s after its exit, a session of the run left 10 s after, a committed `learn_` object; a `learn_curriculum` change stops the run), all against `site/learn/labs/checked/<id>.txt`, plus the agreement gates over those results (`scripts/learn/agree.ts`: SQL = PySAL for Moran, Gi\*, LISA and zonal, a pair checked when both its blocks ran; a failure fails the run) (`--update` writes them once both engines and the gates passed, then c1's feed `checked/c1-feed.json` from `c1-feed-file`'s one text cell `feed`, byte for byte, when changed; `--module <page>` runs the course's boot blocks, then one page, prints, writes nothing; a cross-page `-- after:` block is replayed, so `--module c1` takes as long as s5's Gi\*), then each page's download (`assemble.ts`) on a fresh load (`.sql`: ERROR lines = announced; `.py`: exit 0 within its blocks' timeouts + 60 s per boot block, the Python blocks' env; `.ipynb` not run; leak check after each, a failed file too), canary + `learn_%` leak check, then writes `checked.json` (whole runs only). Never `critwire`.

## Learn (`/learn/`, design `plans/004-learn-curriculum.md`)
Files under `site/learn/` (004 §7.5):
- `curriculum.json`: tracks + modules (`id`, `slug`, `title`, `track`, `tools[]`, `hours`, `prereqs[]`, `state` `built|planned`, `skill`, `questions[]`). A page sets its module `built`.
- `layout.html`, `pages/*.html` (map, track, setup, playground, `schema-{schema,lab,star}`), `modules/<id>.html` (prose + `{{block:}}` `{{exercise:}}` `{{skip:}}` `{{diagram:}}` slots).
- `sql/<id>.sql|.py|.m|.dax`: each block = 004's fence body, headers included (`setup.sql`: header-less, L1's). `.py`: headers `# q|status|after|timeout` (`timeout` s, default 60); `# after:` = earlier Python blocks of the page or `py-connect`; PostGIS `-- after:` = earlier blocks of the page or ran PostGIS blocks of a prerequisite page (transitive scope, `course.ts` `afterScope`; runs only the listed blocks, in order, never their own `-- after:`); browser `-- after:` page-only; a ran one never names `application_name`/`PGAPPNAME`. `.m`/`.dax`: headers `// q|status|input|twin`; `// input:` = `star/<table>.csv` or `labs/c1-feed.json`; `.dax` requires `// twin: <id>` (a ran PostGIS block of its page, the table it should return; arithmetic only), `.m` has none. `labs/checked/<id>.txt` + `checked.json` + `c1-feed.json`: written only by `learn:check`. `labs/c1-feed.schema.json`: `learn:port` (004's fence). `labs/requirements.{in,txt}`.
- `erd/{v1,schema,lab,star}.mmd` (only copies) + `{schema,lab,star}.svg` (`pnpm erd`). `diagrams/<name>{,-dark}.{html,svg}` (diagram-design, profile `critwire` in `.diagram-design`; edit both sources, re-export both).
- `src/`: the browser app (esbuild), checked by `site/learn/tsconfig.json` (DOM, no node types; also includes `scripts/build/licenses.ts`, `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts`). `duckdb-ext/`: the extension mirror.

Rules:
- 004 and the site change together: a block or result edit lands in 004 and its file in one commit; `pnpm learn:port --check all` proves it. A result that differs from 004 is a bug to find, not a number to update.
- Dev loop after editing a block, a page or a checker file: `pnpm build --draft && pnpm learn:check [--update] && pnpm build`, then `pnpm e2e`. `pnpm learn:check --module <page>` while iterating. Commit `checked/` and `checked.json` from a whole run.
- Copy: records, never range; no mission names on public pages; link only pages that exist (planned modules unlinked).
- Raster: a block using the raster API (`RASTER_API`, `scripts/learn/blocks.ts`) must say `-- needs: raster` (PostGIS only), else it's refused. `learn:check` checks once, before the first such block, that `postgis_raster` answers and the learner defaults hold (`postgis.enable_outdb_rasters` off, `gdal_enabled_drivers` `DISABLE_ALL`); never set either for a lab. A g7 block over 20 s as `critwire_lab` gets restructured, never a higher `statement_timeout`.

State: f1–f4, d1–d6 (L1, L2), g1–g7 (L3), s1–s6, e1–e5 (L4), p1–p3 (L5) built; p4, c1 planned (L5).

## Data
Files and owners (never hand-edit derived files):
- `data/base.json`: registry (id, slug, names, step-1 taxonomy, `ids.iucn`, photo, `replacedBy`), sorted by `id`. Writer: `pnpm seed:cc`.
- `data/raw/{wikidata,col,gbif,naturalearth}/snapshot.json`: normalized API responses, keys sorted, one UTC `retrieved` per file. Writer: `pnpm ingest <source>`.
- `data/raw/gbif-sample/{download.json,datasets.json,sample.csv}`: Learn's GBIF sample (download key/DOI/request/`sampleRules`/`species` `{id, gbif}` pairs, dataset + publisher metadata, capped rows). Writer: `pnpm ingest gbif-sample`.
- `data/learn/{country_shapes,admin1_shapes,ecoregions}.parquet`, `biomes.csv`, `shapes.json` (provenance: pins, tool versions, sha256s). Writer: `pnpm ingest shapes`. Build refuses a file whose sha256 differs from its provenance file, or one no provenance file lists.
- `data/learn/{country_habitats,occurrence_habitats,habitat_clips}.parquet`, `clips/{cr,tas}.tif` + `habitat.json` (pins, inputs fingerprint, measured numbers): Jung v004 estimates; clips = whole CR and Tasmania, `habitat_clips` one row per 256-cell tile touching the country (H5). Writer: `pnpm ingest habitat [--downloads <dir>]` (`.venv-learn`; 12–25 min: ≈ 11 min decoding plus Zenodo downloads; peak ≈ 3.2 GB RAM). Inputs: v004's two Zenodo files, pinned by URL, size and md5 (`HABITAT_INPUTS`, `scripts/ingest/habitat.ts`; a mismatch deletes the file and refuses; never unpin). `--downloads <dir>` (outside the repo) keeps the zips and reuses md5-matching ones on a rerun; delete it after. `habitat_classes.parquet`: v004 legend, copied once from A2's spike, listed in `habitat.json`. Build refuses `habitat.json` stale (`country_shapes.parquet` or the published records changed). Never edit.
- `data/review/country-overrides.json`: owner only (see Countries).
- `data/species.json`, `data/countries.json` (the 250 `/v1/countries` rows), `data/review/mismatches.json`, `data/issued-ids.json` (every `{id, slug}` ever derived, append-only: derive refuses an issued id removed or renamed, or its slug reused), `data/gbif-derived-dataset/contributions.json` and `data/gbif-learn-sample/contributions.json` (per-dataset counts to register): derived. Writer: `pnpm derive` only.
- `data/gbif-derived-dataset/registration.json`: DOI + GBIF's read-back. Writer: `pnpm gbif:register` only. Derive reads it; DOI goes on the countries source entries only while its counts equal `contributions.json`.
- `data/gbif-learn-sample/registration.json`: the sample's DOI + read-back (with `originalDownloadDOI`). Writer: `pnpm gbif:register --target learn-sample` only. Current only while GBIF holds the same counts from the same download.
- `contracts/v1.json`: the `/v1` contract, hand-written: per species path / countries column `type`, declared `null`, `means`, optional `values`/`pattern`/`source`(+`checklistKey`), `sha` (first 12 hex of the entry's canonical JSON without `sha`); `speciesCsv`/`countriesCsv` column order. Build (`--draft` too) checks writers and data against it (`scripts/build/contract.ts`): a removal, type change, reorder, data breaking a declaration or an entry whose `sha` doesn't match fails "needs /v2"; a new field logs "add to contracts/v1.json to freeze". Entries add-only. A definition edit (`type`, `null`, `means`, `values`, `pattern`, `source`) needs the owner's review: handoff item, then the new `sha` in the commit that records the review under the plan's Decisions.
- `scripts/build/sources.ts`: source registry (citations verbatim, `COL_CITATIONS` per release, `LICENSE_URLS`). New COL release or license string fails the build until added.

Commands, in order:
1. `pnpm seed:cc <cc-repo>/db/content/animals`: (re)writes `base.json` from Critter Connect profiles, open fields only. Keeps ids (match `ids.iucn`, then `scientificName`); new animals get max id + 1; throws on a double match. Idempotent.
2. `pnpm ingest wikidata|col|gbif|naturalearth|shapes` (one at a time; ≤ 2 req/s): only if a name or IUCN id changed, or to refresh. Logs to stderr; mission runs `2>> <state>/ingest-<s>.log`. All or nothing. `naturalearth` and `shapes` fetch pinned files (sha256 mismatch refuses; never unpin); `shapes` needs `.venv-learn`. `pnpm ingest habitat` after `derive` (it reads the published records), whenever the build calls `habitat.json` stale.
3. `pnpm ingest gbif-sample [--download <key> | --new]`: reuses `download.json`'s download, or `--new` submits one (intent written before the one POST; an interrupted run reconciles via GBIF's listing, never a second POST) and waits (~17 min).
4. `pnpm derive`: offline, pure (no network, clock or `species.json` read); refuses stale raw and names the ingest to re-run. Prints coverage and mismatch counts.
5. DOI refreshes (below): learn-sample whenever the sample changed; countries when its counts moved.
6. `pnpm db:load` or `pnpm build`: rebuilds `db/schema.sql` tables in `DATABASE_URL` and loads `species.json`, one transaction.
- `pnpm test`: unit tests of derive rules and gbif:register logic (`node:test`).

Cost of a species change: adding or removing a species, or changing an `ids.gbif`, makes the GBIF sample stale (`derive` refuses and writes nothing). Plain `pnpm build`, so `deploy`, then fails until a new GBIF download (about 17 min), `ingest gbif-sample --new`, `derive`, `ingest habitat` (the published records changed; 12–25 min) and a new learn-sample DOI (plus the countries DOI if its counts moved): ≈ 1 h. `--draft` doesn't lift either refusal.

Rules (details: `plans/2026-10-20-critwire-ingest.md` §5):
- Disagreements are never auto-fixed: id `null` (or base value kept) + entry in `mismatches.json` (severity `blocking`, `review` or `info`).
- `ids.gbif`: legacy GBIF backbone key (checklist `d7dddbf4-…`). `ids.col`: stable COL id, also COL XR key (GBIF default since 2026-06). Taxonomy from COL only when identity settled; else base.
- `sources[]` cites every third-party field once; `critwire base` covers `ids.iucn` and fallback taxonomy.

Countries (`range.countriesWithOpenRecords`):
- Means "countries with open (CC0/CC BY) records", NOT native range. ISO alpha-2, sorted. Never `[]`: `null` unless `range.status` is `ok`.
- `range.status` (always present): `ok` (≥ 1 country after filtering + overrides), `no-open-records` (GBIF identity settled, no country left), `identity-unsettled` (GBIF taxon not settled).
- GBIF occurrence facets: `occurrenceStatus=PRESENT`, no geospatial issue, has coordinate, `basisOfRecord` without `LIVING_SPECIMEN`/`FOSSIL_SPECIMEN`, `ZZ` dropped.
- Counts only CC0 1.0 + CC BY 4.0 records (`assertOpenLicenses`); field published CC BY 4.0. GBIF aggregates have no DOI.
- Rule (constants top of `scripts/derive/countries.ts`): region = GBIF `gbifRegion`, NORTH_AMERICA + LATIN_AMERICA merged (`MERGED_REGIONS`). Core = region with most countries (tie: most records; still tied: all core).
  - outside core, ≤ `STRAY_MAX` (1) record: excluded, `country-captive-suspect` blocking;
  - outside core, ≥ 2: kept, `country-captive-suspect` review;
  - in core, species ≥ `BORDERLINE_MIN_SPECIES_RECORDS` (50) records, country ≤ `BORDERLINE_MAX` (2): kept, `country-borderline` review;
  - else kept.
- Overrides, applied last: `[{"speciesId": 25, "country": "RU", "action": "keep"|"remove", "reason": "…"}]`. `keep` publishes (restores stray / confirms flag), `remove` withholds. Exactly those keys, known species, `^[A-Z]{2}$` not `ZZ`, non-empty reason, unique (speciesId, country); no `keep` without records; none on `identity-unsettled` species. Overridden country gets no `country-*` entry.

## GBIF DOI refresh
Two targets, same steps:
| Target | Stale when | Registration file | Tag | Command |
|---|---|---|---|---|
| countries | an `ingest gbif` changes dataset counts | `data/gbif-derived-dataset/registration.json` | `gbif-dd-<hex12>` | `pnpm gbif:register` |
| learn-sample | the sample changed (`ingest gbif-sample`) | `data/gbif-learn-sample/registration.json` | `gbif-learn-<hex12>` | `pnpm gbif:register --target learn-sample` |

`pnpm derive` prints `DOI stale` / `learn-sample DOI stale`; plain `pnpm build`, so `deploy`, fails until refreshed. GBIF can't change a DOI's counts; a refresh mints a new DOI. Steps:
1. `pnpm derive`
2. `git rm <registration file>`
3. commit and push
4. `git tag <tag> && git push origin <tag>` (derive prints the name; tag = pushed HEAD)
5. `<command>` (Oracle VPS only: lock + intent are local, `~/.local/state/critwire/`, one pair per target)
6. `pnpm derive` (prints `DOI current` / `learn-sample DOI current`)
7. commit and push

Never delete or move a `gbif-dd-*` or `gbif-learn-*` tag: each holds a DOI's deposit (`sourceUrl` = `github.com/kc0588615/critwire/tree/<sha>/data`). Interrupted run: re-run it; it reconciles via GBIF's listing before any POST. Delete the lock or intent only as its error message says.
