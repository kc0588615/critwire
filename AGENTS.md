In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# AGENTS.md
Guidance for coding agents. Facts over prose. Plan: `plans/001-mvp.md`.

## What this is
Open curated species data at critwire.com, dogfooded by Critter Connect (repo `kc0588615/phaser-june`). Static files under `/v1/` (Parquet, CSV, JSON) plus a docs page; no server process.

## Stack
- pnpm, TypeScript (`tsx`), postgres.js + plain SQL. No web framework.
- Postgres 16 + PostGIS 3.4.2 on the Oracle VPS. No PostGIS 3.5-only functions.
- `@duckdb/node-api` (pinned) writes Parquet and CSV from `data/species.json`; no DuckDB extensions at build time (build is offline).
- E2E: `@playwright/test` (pinned), headless Chromium, local Caddy copy of the live block (`e2e/Caddyfile`, `admin off`, ports 3100/3101).

## Prefer simplicity
Simplest approach that works. Ask before adding complexity.

## Data rules (non-negotiable)
- Source of truth: snapshots committed in `data/`. Ingest scripts fetch and commit; `pnpm build` loads `data/` into Postgres (rebuilt each time) and writes `dist/`. Never hand-edit the db.
- IUCN: store only the SIS taxon id (`ids.iucn`). Never store, cache, proxy or serve IUCN data (categories, assessments, ranges).
- No Wikipedia prose (share-alike); write copy fresh for grades 6–12. Bare trait values may come from any cited source in our own words; bulk imports only from open datasets.
- Every third-party field and photo records its source and license.
- Our ids: integer, never reused, plus slug. Outside ids live in `ids`. Retired ids get `replacedBy`.

## Databases
- `critwire`: the live build. Agents never use it.
- `critwire_dev`: agents' scratch db.
- Always `DATABASE_URL` from env; never hardcode connection strings.
- `CRITWIRE_DB_TARGET` (`.env`: `critwire_dev` here, `critwire` in the live copy): `pnpm build` and `pnpm db:load` refuse before any DDL unless `current_database()` equals it. Only those two read it.
- CLIs load `.env` under the environment (environment wins) and log each conflicting variable's name and winner, never a value.

## Two machines (WSL + Oracle VPS)
GitHub `origin` is the hub; only pushed work exists on the other machine.
- Agent work: one issue per branch `agent/<slug>` from fresh `origin/main`; rebase before the PR; push and open a PR via `gh` (HTTPS); the owner merges. GO comes only from the owner.
- Push before you stop, WIP included.
- Paths on the VPS: agents' checkout `/srv/critter-ai/critwire`, live copy `/srv/apps/critwire`.
- Release: `deploy critwire` on the VPS (pull main into the live copy, `pnpm install --frozen-lockfile`, `pnpm build`, swap in `dist/` only if the build passed). Owner's word only, except a mission may merge its PR and deploy at its end once every check passes (owner, 2026-10-21; `~/AGENTS.md`).
- VPS setup (Postgres, Caddy, CORS) is done from the Oracle control room, not from here.

## Commands
- `pnpm install`, `pnpm typecheck`, `pnpm test` (`scripts/**/*.test.ts`: pure, offline), `pnpm test:db` (`scripts/**/*.dbtest.ts`: `critwire_dev` only, refuses any other db).
- `pnpm build [--draft]`: offline. Re-runs derive in-process and refuses derived files that differ (`data/<file> is stale: run pnpm derive`); loads `DATABASE_URL` (advisory lock); writes `dist/` (`index.html`, `v1/species.{json,parquet,csv}`, `v1/species/{id,slug}.json`, `v1/attribution.json`). Plain build refuses a missing/stale GBIF DOI; `--draft` builds without it (preview only, never deploy).
- `pnpm e2e` (after `pnpm build`): Playwright suite; artifacts in `E2E_ARTIFACTS` (default `e2e-artifacts/`).
- `pnpm gbif:register`: the one network write (GBIF derived dataset). See GBIF DOI refresh.

## Data
Files and owners (never hand-edit derived files):
- `data/base.json`: registry (id, slug, names, step-1 taxonomy, `ids.iucn`, photo, `replacedBy`), sorted by `id`. Writer: `pnpm seed:cc`.
- `data/raw/{wikidata,col,gbif}/snapshot.json`: normalized API responses, keys sorted, one UTC `retrieved` per file. Writer: `pnpm ingest <source>`.
- `data/review/country-overrides.json`: owner only (see Countries).
- `data/species.json`, `data/review/mismatches.json`, `data/gbif-derived-dataset/contributions.json` (per-dataset counts to register): derived. Writer: `pnpm derive` only.
- `data/gbif-derived-dataset/registration.json`: DOI + GBIF's read-back. Writer: `pnpm gbif:register` only. Derive reads it; DOI goes on the countries source entries only while its counts equal `contributions.json`.
- `scripts/build/sources.ts`: source registry (citations verbatim, `COL_CITATIONS` per release, `LICENSE_URLS`). New COL release or license string fails the build until added.

Commands, in order:
1. `pnpm seed:cc <cc-repo>/db/content/animals`: (re)writes `base.json` from Critter Connect profiles, open fields only. Keeps ids (match `ids.iucn`, then `scientificName`); new animals get max id + 1; throws on a double match. Idempotent.
2. `pnpm ingest wikidata|col|gbif` (one at a time; ≤ 2 req/s): only if a name or IUCN id changed, or to refresh. Logs to stderr; mission runs `2>> <state>/ingest-<s>.log`. All or nothing.
3. `pnpm derive`: offline, pure (no network, clock or `species.json` read); refuses stale raw and names the ingest to re-run. Prints coverage and mismatch counts.
4. `pnpm db:load`: rebuilds `db/schema.sql` tables in `DATABASE_URL` and loads `species.json`, one transaction.
- `pnpm test`: unit tests of derive rules and gbif:register logic (`node:test`).

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
Any `ingest gbif` that changes dataset counts makes the DOI stale: `pnpm derive` prints `DOI stale`; plain `pnpm build`, so `deploy`, fails until refreshed. GBIF can't change a DOI's counts; a refresh mints a new DOI. Steps:
1. `pnpm derive`
2. `git rm data/gbif-derived-dataset/registration.json`
3. commit and push
4. `git tag gbif-dd-<hex12> && git push origin gbif-dd-<hex12>` (derive prints the name; tag = pushed HEAD)
5. `pnpm gbif:register` (Oracle VPS only: lock + intent are local, `~/.local/state/critwire/`)
6. `pnpm derive` (prints `DOI current`)
7. commit and push

Never delete or move a `gbif-dd-*` tag: each holds a DOI's deposit (`sourceUrl` = `github.com/kc0588615/critwire/tree/<sha>/data`). Interrupted run: re-run it; it reconciles via GBIF's listing before any POST. Delete the lock or intent only as its error message says.
