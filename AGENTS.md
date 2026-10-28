In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# AGENTS.md
Guidance for coding agents. Facts over prose. Plan: `plans/001-mvp.md`.

## What this is
Open curated species data at critwire.com, dogfooded by Critter Connect (repo `kc0588615/phaser-june`). Static files under `/v1/` (Parquet, CSV, JSON) plus a docs page, and Learn's lab data under `/learn/data/` (plan `plans/004-learn-curriculum.md`); no server process.

## Stack
- pnpm, TypeScript (`tsx`), postgres.js + plain SQL. No web framework.
- Postgres 16 + PostGIS 3.4.2 on the Oracle VPS. No PostGIS 3.5-only functions.
- `@duckdb/node-api` (pinned) writes Parquet and CSV from `data/species.json`; no DuckDB extensions at build time (build is offline).
- Python via `uv` (`/usr/local/bin/uv`) in `.venv-learn/` (gitignored; `pnpm learn:venv`), pins in `site/learn/labs/requirements.txt`; for `ingest shapes` only. Build stays Node.
- Learn's browser app: `@duckdb/duckdb-wasm` (pin in `site/learn/src/assets.ts`; build refuses another installed version) + parquet extension mirror committed in `site/learn/duckdb-ext/` (sha256 pinned in `scripts/build/learn/assets.ts`); bundled by `esbuild` (pinned) from `site/learn/src/`. `dist/learn/assets/`: mtime fixed 2000-01-01, so every path there must be versioned or content-hashed (build refuses others).
- E2E: `@playwright/test` (pinned), headless Chromium, local Caddy copy of the live block (`e2e/Caddyfile`, `admin off`, ports 3100/3101).

## Prefer simplicity
Simplest approach that works. Ask before adding complexity.

## Data rules (non-negotiable)
- Source of truth: snapshots committed in `data/`. Ingest scripts fetch and commit; `pnpm build` writes `dist/` from `data/` and loads the same records into Postgres as a check (rebuilt each time). Never hand-edit the db.
- IUCN: store only the SIS taxon id (`ids.iucn`). Never store, cache, proxy or serve IUCN data (categories, assessments, ranges).
- No Wikipedia prose (share-alike). Write all copy fresh, in our own words, for adults new to the topic: plain, precise English a working professional reads fast; define each term once; link to open references instead of rewriting them. Bare trait values may come from any cited source in our own words; bulk imports only from open datasets.
- Every third-party field and photo records its source and license.
- Our ids: integer, never reused, plus slug. Outside ids live in `ids`. Retired ids get `replacedBy`. Until Learn's projection has a replacement junction (L2's to add), a record with `replacedBy` fails `pnpm build`, `/v1` included: don't retire an id before then.

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
- VPS setup (Postgres, Caddy, CORS) is done from the Oracle control room, not from here.

## Commands
- `pnpm install`, `pnpm typecheck` (root + `site/learn/tsconfig.json`, DOM, no node types), `pnpm test` (`scripts/**/*.test.ts`: pure, offline), `pnpm test:db` (`scripts/**/*.dbtest.ts`: `critwire_dev` only, refuses any other db).
- `pnpm build [--draft]`: offline. Re-runs derive in-process and refuses derived files that differ (`data/<file> is stale: run pnpm derive`); loads `DATABASE_URL` (advisory lock); writes `dist/` (`index.html`, `v1/species.{json,parquet,csv}`, `v1/species/{id,slug}.json`, `v1/countries.{json,parquet,csv}`, `v1/attribution.json`, `learn/data/`: index, `manifest.json`, lab files, `postgis/learn_curriculum.sql`, `star/`: d6's `d6-star-*` blocks run in DuckDB, one CSV per table + `manifest.json`). Plain build refuses a star block whose DuckDB result differs from its `checked/<id>.txt` (`--draft` warns). Refuses `dist/learn/data/` or the committed lab data (`data/raw/gbif-sample/`, `data/learn/`, `data/gbif-learn-sample/`) over 50,000,000 bytes. Plain build refuses a missing/stale DOI (countries or learn-sample); `--draft` builds without them (preview only, never deploy), never with a stale sample. Plain build refuses a lab `learn:check` didn't prove as committed (`site/learn/labs/checked/checked.json`: "lab <id> is stale: run pnpm learn:check"); `--draft` warns. Loop: `pnpm build --draft && pnpm learn:check && pnpm build`.
- `pnpm e2e` (after `pnpm build`): Playwright suite; artifacts in `E2E_ARTIFACTS` (default `e2e-artifacts/`).
- `pnpm erd [--force]`: draws `site/learn/erd/{schema,lab,star}.svg` from their `.mmd`, offline (mermaid in Playwright's Chromium, every request refused); only stale ones unless `--force`. Commit them: build refuses a missing or stale SVG ("site/learn/erd/lab.svg is stale: run pnpm erd").
- `pnpm gbif:register [--target countries|learn-sample]` (default countries): the one network write (GBIF derived dataset). See GBIF DOI refresh.
- `pnpm learn:venv`: (re)creates `.venv-learn` (system Python 3.12, no downloads, wheels only).
- `pnpm learn:check [--update | --module <page>] [--setup [--env <file>]… [--reset-password]]` (after `pnpm build`): as `critwire_lab`, loads `dist/learn/data/postgis/learn_curriculum.sql` twice (counts = manifest `tables`), a forced failure (must roll back), then `lab.mmd` against `learn_curriculum` (after boot blocks), then every PostGIS block of `site/learn/` in page order against `site/learn/labs/checked/<id>.txt` (`--update` writes them; `--module <page>` runs one page, prints, writes nothing), canary + `learn_%` leak check, then each page's download (`assemble.ts`) on a fresh load (ERROR lines = announced), then writes `checked.json` (whole runs only). Never `critwire`.

## Data
Files and owners (never hand-edit derived files):
- `data/base.json`: registry (id, slug, names, step-1 taxonomy, `ids.iucn`, photo, `replacedBy`), sorted by `id`. Writer: `pnpm seed:cc`.
- `data/raw/{wikidata,col,gbif,naturalearth}/snapshot.json`: normalized API responses, keys sorted, one UTC `retrieved` per file. Writer: `pnpm ingest <source>`.
- `data/raw/gbif-sample/{download.json,datasets.json,sample.csv}`: Learn's GBIF sample (download key/DOI/request/`sampleRules`/`species` `{id, gbif}` pairs, dataset + publisher metadata, capped rows). Writer: `pnpm ingest gbif-sample`.
- `data/learn/{country_shapes,admin1_shapes,ecoregions}.parquet`, `biomes.csv`, `shapes.json` (provenance: pins, tool versions, sha256s). Writer: `pnpm ingest shapes`. Build refuses a file whose sha256 differs from its provenance file, or one no provenance file lists.
- `data/learn/{habitat_classes,country_habitats}.parquet` + `habitat.json`: stand-ins (`standIn: true`), copied once from A2's spike; L3's `ingest habitat` replaces them. Never edit.
- `data/review/country-overrides.json`: owner only (see Countries).
- `data/species.json`, `data/countries.json` (the 250 `/v1/countries` rows), `data/review/mismatches.json`, `data/issued-ids.json` (every `{id, slug}` ever derived, append-only: derive refuses an issued id removed or renamed, or its slug reused), `data/gbif-derived-dataset/contributions.json` and `data/gbif-learn-sample/contributions.json` (per-dataset counts to register): derived. Writer: `pnpm derive` only.
- `data/gbif-derived-dataset/registration.json`: DOI + GBIF's read-back. Writer: `pnpm gbif:register` only. Derive reads it; DOI goes on the countries source entries only while its counts equal `contributions.json`.
- `data/gbif-learn-sample/registration.json`: the sample's DOI + read-back (with `originalDownloadDOI`). Writer: `pnpm gbif:register --target learn-sample` only. Current only while GBIF holds the same counts from the same download.
- `scripts/build/sources.ts`: source registry (citations verbatim, `COL_CITATIONS` per release, `LICENSE_URLS`). New COL release or license string fails the build until added.

Commands, in order:
1. `pnpm seed:cc <cc-repo>/db/content/animals`: (re)writes `base.json` from Critter Connect profiles, open fields only. Keeps ids (match `ids.iucn`, then `scientificName`); new animals get max id + 1; throws on a double match. Idempotent.
2. `pnpm ingest wikidata|col|gbif|naturalearth|shapes` (one at a time; ≤ 2 req/s): only if a name or IUCN id changed, or to refresh. Logs to stderr; mission runs `2>> <state>/ingest-<s>.log`. All or nothing. `naturalearth` and `shapes` fetch pinned files (sha256 mismatch refuses; never unpin); `shapes` needs `.venv-learn`.
3. `pnpm ingest gbif-sample [--download <key> | --new]`: reuses `download.json`'s download, or `--new` submits one (intent written before the one POST; an interrupted run reconciles via GBIF's listing, never a second POST) and waits (~17 min).
4. `pnpm derive`: offline, pure (no network, clock or `species.json` read); refuses stale raw and names the ingest to re-run. Prints coverage and mismatch counts.
5. DOI refreshes (below): learn-sample whenever the sample changed; countries when its counts moved.
6. `pnpm db:load` or `pnpm build`: rebuilds `db/schema.sql` tables in `DATABASE_URL` and loads `species.json`, one transaction.
- `pnpm test`: unit tests of derive rules and gbif:register logic (`node:test`).

Cost of a species change: adding or removing a species, or changing an `ids.gbif`, makes the GBIF sample stale (`derive` refuses and writes nothing). Plain `pnpm build`, so `deploy`, then fails until a new GBIF download (about 17 min), `ingest gbif-sample --new`, `derive` and a new learn-sample DOI (plus the countries DOI if its counts moved). `--draft` doesn't lift it.

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
