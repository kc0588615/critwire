---
mission: critwire-release
project: critwire
branch: agent/critwire-release
status: active
started: 2026-10-21 05:13 UTC
---

# Mission: critwire step 3, build and release `/v1`

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-21-critwire-release.md
     Start: mission start critwire <this file>   (base: main at aa66ff6 or later, which includes PR #5)
     Brief reviewed by Astra (gpt-6-astra, high) 2026-10-21: APPROVE_WITH_CHANGES; its 5 must-fix items are folded in
     (offline build, GBIF counts definition, safe registration, derive/DOI, serving tests). -->

### Goal

`pnpm build` turns the committed `data/` into the full static site in `dist/`: the `/v1` data files, an attribution file, and a docs page with credits. Everything the first public release needs is done and verified, including the GBIF derived-dataset DOI. The branch is ready for the owner to merge and run `deploy critwire`. This is step 3 of `plans/001-mvp.md`, which sets the file list ("Access"), the record shape ("Record") and the release requirements (step 3).

Checkable outcomes:
- `pnpm build` (one command, no network) does three things:
  - rebuilds the database named by `DATABASE_URL` from `data/` (the same schema and load as `pnpm db:load`; reuse that code, don't copy it)
  - exports `dist/v1/`: `species.parquet`, `species.csv`, `species.json` (all records) and `species/{id}.json` + `species/{slug}.json`
  - writes `dist/v1/attribution.json` and `dist/index.html`

  Output is byte-identical across two builds from the same commit.
- `ranges.parquet` only if the architect finds a real use for it now. Polygons are Later. Countries can live in `species.parquet`.
- `attribution.json` lists every source critwire uses, its license and its citation or DOI. Per-record `sources[]` stays the detail. It also lists the GBIF derived dataset's DOI and its contributing datasets.
- **GBIF derived dataset:**
  - it's registered through GBIF's API (`POST https://api.gbif.org/v1/derivedDataset`, basic auth `GBIF_USERNAME` / `GBIF_PASSWORD` from `.env`), listing every contributing occurrence dataset with its record count
  - its DOI is cited in `attribution.json`, on the docs page and in the countries field's source entry
  - the per-dataset counts come from a committed raw snapshot, using the same filters and open licenses as the countries rule; extend `pnpm ingest gbif`
  - **contributing records** are every record the countries query matched for each species whose identity is settled. That includes the records in excluded stray countries, because they decide the core region. Unsettled species are left out. Dedupe by GBIF taxon key, so two species on one accepted key count once.
  - page the `datasetKey` facet exhaustively (`facetOffset` until empty; never let the 300 facet limit truncate or stall it), and assert that the per-dataset sum equals the query's `count` for every taxon. The existing ingest throws when a facet reaches 300 entries, so handle that for datasets.
- The docs page is plain HTML, readable on a phone and written for teachers and app makers (grades 6–12 audience). It has:
  - what critwire is and how to fetch each file, with `curl` and DuckDB examples that work against `https://critwire.com/v1/`
  - the field meanings, including `range.status` and why countries are "with open records", not native range
  - the licenses (`DATA-LICENSE.md`) and a credits section built from `attribution.json`
- An E2E suite (Playwright, headless) serves `dist/` the way Caddy will and checks:
  - the docs page renders, its links resolve and there's no horizontal scroll at 375 px
  - each `/v1` file downloads, parses and matches `data/species.json` (76 records, the counts per status)
  - `species/{id}.json` and `species/{slug}.json` match
  - the Parquet reads with DuckDB, including by HTTP range requests (`Range` honored)

  It leaves the Playwright HTML report plus traces/screenshots.
- **Serving tests run against a local Caddy** that copies the live `critwire.com` block (root, headers, CORS, OPTIONS 204), on an E2E port with the admin endpoint off (`admin off`). Never touch or reload the production Caddy. They check:
  - a cross-origin browser `fetch` from a second local origin works (CORS)
  - OPTIONS preflight succeeds and the exposed headers are readable from JS
  - a `Range` request gets HTTP 206, the correct `Content-Range` and the exact bytes
  - the docs page's `curl` and DuckDB examples run against the local server, with the origin swapped (production is still the placeholder)
- `AGENTS.md`, `README.md` and `plans/001-mvp.md` are updated. There's no cutover any more (see Notes), so remove the cutover wording, and mark step 3 done with this mission's PR.

### Why

This is critwire's first public release, and Critter Connect (step 4) will read these files. Correct, cited and reproducible files matter more than polish. Every third-party value must be credited the way its license requires.

### Scope

In:
- `scripts/`, `db/schema.sql`, `package.json` scripts and dependencies, `data/raw/gbif/` (re-ingest for dataset counts), `data/` derived files, docs page sources, the E2E suite, `AGENTS.md`, `README.md`, `plans/001-mvp.md`, `DATA-LICENSE.md` (only if credits need it).

Out:
- `/srv/apps/critwire` (the live copy), `/etc/caddy`, `/srv/critter-ai/ops`: don't touch, and don't run `deploy`. Never connect to the `critwire` database, which the live build uses; the mission builds against `critwire_dev`.
- The Critter Connect repo: read-only.
- Owner-owned files: `data/review/country-overrides.json` and `data/base.json` (no `seed:cc`).
- Derive rules (countries, ids, taxonomy): unchanged. Only the field names and shapes from PR #5 apply.
- Polygons, realms, traits, the DuckDB-WASM viewer, PostgREST: Later.
- Any IUCN call or data beyond `ids.iucn`.

### Definition of done

- `pnpm typecheck`, `pnpm test`, `pnpm build` and the E2E suite pass on the final commit.
- Two `pnpm build` runs give a byte-identical `dist/`. `pnpm derive` twice gives a byte-identical `data/`.
- The GBIF derived dataset is registered and its DOI is in `attribution.json` and on the docs page. If H1 (GBIF password) is still open when everything else is done, finish with `MISSION_BLOCKED: waiting on H1`, with everything else complete, so the owner's reply resumes it to the end.
- The Playwright report, traces and screenshots go in `/srv/critter-ai/agent-state/missions/critwire-release/`. The plan's Verification gives the exact command to reproduce them.
- Mark step 3 in `plans/001-mvp.md` "implementation verified; owner deploy pending (PR #n)", not "done".
- The attribution covers photo credits too: each photo's credit, license and page, as in `photo`.
- Push `agent/critwire-release` and open a PR to `main` with `gh`. Its body gives the file list with sizes, the DOI, the E2E result and where the artifact is. No merge, no deploy.
- The plan's Summary repeats that. It lists every source in `attribution.json`, and says what the owner must do to release: merge, then `deploy critwire`.

### Decision rules

- **Astra review stage:** run `ASTRA_EFFORT=high astra-review <plan>` (the owner asked for high effort for this mission). The usual skip rules apply on exits 3, 4 and 5.
- **Simplest tool that works; the build must run offline.**
  - DuckDB isn't installed. Use the `@duckdb/node-api` npm package, pinned (it has linux-arm64 builds); smoke-test it on Node 24 here first.
  - Write Parquet from `data/species.json` with DuckDB's built-in Parquet writer. **Don't use DuckDB's `postgres` extension.** It downloads on first use, so a fresh `deploy` would need the network. Update `plans/001-mvp.md` and `AGENTS.md` ("DuckDB `postgres` extension writes Parquet") to say this.
  - The Postgres load stays part of `pnpm build`, as the plan says, but the exports are written from `species.json`, not read back from the database.
  - Prove the build is offline: run a clean `pnpm build` (fresh clone, `pnpm install --frozen-lockfile`, empty DuckDB extension cache) with outbound networking blocked and local Postgres reachable, for example `sudo unshare -n` with `DATABASE_URL` on the Unix socket `/var/run/postgresql`. Record the exact command in Verification.
  - Hold a Postgres advisory lock for the whole load in `pnpm build`, because `critwire_dev` is shared.
- **Deterministic output:**
  - nothing in `dist/` may contain a clock time
  - use the retrieval dates from `data/` and the DOI from a committed file
  - sort rows by `id`
  - fix Parquet writer settings (compression, row group size, `threads=1`), with explicit column types and order
  - determinism is bounded to the pinned lockfile on this platform; check it by comparing the full file list with hashes across two clean builds
- **The derived-dataset registration** is the one network write, so keep it apart from the build:
  - put it in a separate script (for example `pnpm gbif:register`) that writes its result (DOI, key, the dataset counts it sent) to a committed file under `data/`, which `pnpm build` reads
  - running it again must not register a second dataset:
    - before the POST, commit or write an intent record (inputs hash, time)
    - never retry a POST automatically, and don't reuse `getJson`, which retries and accepts only HTTP 200
    - on any ambiguous outcome (timeout, crash, missing result file), first list the user's derived datasets on GBIF and reconcile against the intent before doing anything else
    - when the result file exists, update that dataset or refuse
    - afterwards, read the dataset back from GBIF and check its title, sourceUrl and contribution counts
  - registration refuses stale inputs: the counts snapshot it sends must match the committed one exactly, and it never sends uncommitted data
  - the derived dataset's `sourceUrl` must already be public at registration. Use a GitHub permalink to the data at a pushed commit (the repo is public), unless GBIF needs it to be something else. Record which one you used, and why.
  - read GBIF's derived-dataset docs first (https://techdocs.gbif.org/en/data-use/derived-datasets; the owner also pointed at https://techdocs.gbif.org/en/data-use/api-downloads)
- **Derive may change for attribution only:** `pnpm derive` may read the committed registration file so the DOI reaches `sources[]` in `data/species.json`. Countries, ids and taxonomy rules stay as they are.
- **Re-ingest changes data:** the counts above (72/1/3, 214) are baseline observations, not targets. After the GBIF re-ingest, report the delta in statuses, countries and mismatches in the PR, and set the E2E expectations from the final committed snapshot. Owner overrides stay untouched.
- **CSV:** flatten `ids.*` and `taxonomy.*` into columns. Write countries as one `;`-joined column and `range_status` as its own. Leave `sources` out, and say in the docs that it's in the JSON and Parquet.
- **Licenses:** the attribution and credits must match each source's license wording. If a source's credit requirement is unclear, check its site and quote its requested citation.
- The agent may decide file layout, script structure, docs wording and E2E server details alone. Use a handoff item only for something only a person can do.

### Notes

- **The old critwire app is gone** (owner, 2026-10-21): its service, databases and files were deleted. critwire.com is already a static site: Caddy serves `/srv/apps/critwire/.live` with CORS on `/v1` (any origin, `Range` allowed, `Content-Range`, `Content-Length` and `Accept-Ranges` exposed, OPTIONS gives 204), and `deploy critwire` builds `main` and publishes `dist/`. Today it shows the placeholder page. There is no cutover: releasing is merge + `deploy critwire`.
- The live copy's `.env` points `DATABASE_URL` at the `critwire` database, so `pnpm build` on deploy loads there. Its build must not need the network or GBIF credentials.
- **H1 in `/srv/critter-ai/handoff/critwire.md` is the GBIF password**, waiting on the owner. `GBIF_USERNAME=dinobytes215` is already in `.env`. When H1 is answered, put `GBIF_PASSWORD` in this worktree's `.env` and `/srv/critter-ai/critwire/.env` (never in git), then close the item.
- The project has `MISSION_DB=no`: the mission shares `critwire_dev` from `.env`. Playwright Chromium is installed. Ports 3100–3102 are for E2E.
- Mismatches: the 60 blocking entries stay for the owner. The docs say that null ids or null countries mean "not settled", and why.
- After PR #5, the data has 76 species: `ok` 72, `no-open-records` 1, `identity-unsettled` 3; 214 mismatch entries.
- `scripts/build.ts` is a placeholder today. `scripts/load.ts` calls `process.loadEnvFile()` and builds the rows; reuse it in the build.
- Expect around 10–14 plan steps.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

At `26ad8d4` (main `aa66ff6` + mission start), Node 24.21.0, pnpm 11.10.0, db `critwire_dev`:
- `pnpm install --frozen-lockfile`: ok (deps: postgres, tsx, typescript, @types/node; no DuckDB, no Playwright package).
- `pnpm typecheck`: pass.
- Lint: no lint script in the repo; none run.
- `pnpm test`: 42/42 pass.
- `pnpm derive`: ok, no diff vs committed `data/`; second run also no diff (deterministic). Coverage: taxonomy from COL 69/76; countries ok 72 (472 codes), no-open-records 1 (47), identity-unsettled 3 (9, 19, 27); 214 mismatch entries (60 blocking).
- `pnpm db:load`: loaded 76 species.
- `pnpm build`: placeholder; writes `dist/index.html` + empty `dist/v1/`.
- E2E: no suite exists yet (built in this mission).
- Tools present: `/usr/bin/caddy` v2.11.7; Playwright Chromium 1208 browsers in `~/.cache/ms-playwright`.

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-10-21 05:13 UTC: Baseline recorded; typecheck pass, 42/42 unit, derive deterministic, db:load 76, build placeholder ok; no lint/E2E yet.

## Summary
