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
- [x] Architecture: `architect` writes findings and the target design
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

Architect, 2026-10-21. Throwaway evidence in `/tmp/arch-cw/` (not committed):
- GBIF registry source `gbif/registry@dev`: `DerivedDatasetResource.java`, the request and usage classes, `docs/derived-dataset.md`. `techdocs.gbif.org/en/data-use/derived-datasets` is a 404 today, and gbif.org returns 403 to curl.
- 5 live GBIF facet calls (jaguar).
- `@duckdb/node-api` installed and run here.
- A local Caddy on :3102 with `admin off`.
- postgres.js socket tests and a `sudo unshare -n` dry run.

### Verified facts the design rests on

- **GBIF derived datasets:**
  - **Create:** `POST /v1/derivedDataset`, JSON, Basic auth.
    - Required: `title`, `sourceUrl` (http or https), and `relatedDatasets`, a non-empty map of dataset UUID or DOI to a record count > 0. An unknown dataset gives 400.
    - Optional: `description`, `originalDownloadDOI`, `registrationDate` (a future date embargoes the DOI).
    - It returns `{doi, title, description, sourceUrl, citation, createdBy, created, …}`. The DOI is the only key, and `citation` is GBIF's server-side text ("GBIF.org (<d Month yyyy>) Filtered export of GBIF occurrence data https://doi.org/<doi>").
  - **Update:** `PUT /v1/derivedDataset/{doi}`, creator only, changes only `title`, `description` and `sourceUrl`. **Counts can never be updated:** new counts need a new DOI.
  - **List and read:**
    - `GET /v1/derivedDataset/user/{user}` needs auth (403 without) and pages with `offset`/`limit`.
    - `GET /v1/derivedDataset/{doi}` and `GET /v1/derivedDataset/{doi}/datasets` are public. The second pages `DerivedDatasetUsage {datasetKey, datasetDOI, numberRecords}`.
- **`datasetKey` facet:** `facet=datasetKey&facetLimit=L&facetOffset=O` pages, and an offset past the end returns `counts: []`. Jaguar (taxon 5219426, licensed filters) has 125 datasets, summing to `count` 138,459.
- **Citations each source requests:**
  - GBIF backbone `citation.text`: "GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei accessed via GBIF.org on <date>."
  - COL release 316595 `citation` (HTML): "Bánki, O., Roskov, Y., Döring, M., … et al. (2026). Catalogue of Life (Version 2026-10-14). Catalogue of Life Foundation, Amsterdam, Netherlands. https://doi.org/10.48580/dgzh4". The committed COL raw doesn't store it, because the release record is allowlisted.
- **DuckDB `@duckdb/node-api@1.5.6-r.2`** (latest) on Node 24.21 / linux-arm64:
  - It's prebuilt (`@duckdb/node-bindings-linux-arm64`) with no install scripts, so no `allowBuilds` entry.
  - `parquet`, `json` and `icu` are statically linked. `httpfs` is not; it autoinstalls from the network.
  - Parquet written from `data/species.json` with explicit nested columns, `threads=1` and snappy: two runs give identical bytes (31,966 B, one row group). `range.status` and `taxonomy.order` work unquoted.
  - `read_json(columns=…)` **silently drops unknown keys**, at the top level and nested.
  - The CSV writer quotes only when needed, writes NULL as empty and `''` as `""`, in UTF-8 with LF line ends.
- **Caddy**, with the live `critwire.com` block copied to :3102:
  - A Range request gets 206 with the exact `Content-Range`, uncompressed despite `encode`. The suffix range `bytes=-8` gets 206 ending in `PAR1`.
  - OPTIONS gets 204 with every CORS header.
  - `.parquet` gets no `Content-Type`.
  - Production's admin endpoint holds 127.0.0.1:2019.
- **Postgres:**
  - postgres.js 3.4.9 can't take a socket from the URL: a `%2F…` host gives ENOTFOUND, and `?host=` is sent to the server as a setting, which errors.
  - `DATABASE_URL=postgres:///<db>` with `PGHOST=/var/run/postgresql` works. The socket uses peer auth, so it connects as role `critter-ai` (superuser), not `critwire`.
  - `process.loadEnvFile()` throws ENOENT when `.env` is missing, and never overrides variables that are already set.
- **Offline:** `sudo unshare -n setpriv --reuid=critter-ai --regid=critter-ai --init-groups env -i HOME=<empty> PATH=$PATH COREPACK_HOME=~/.cache/node/corepack …` blocks DNS, while the socket, pnpm (corepack) and DuckDB still work.
- **Playwright:** Chromium 1208 belongs to `@playwright/test` 1.58.0–1.58.2; hauntedpavement pins 1.58.2. Ports 3100–3102 are free.
- **GitHub:** the repo is public, and `raw.githubusercontent.com/kc0588615/critwire/<sha>/…` and `github.com/…/tree/<sha>/data` resolve for pushed commits. PRs are merged with merge commits.

### Findings (ranked)

1. **`load.ts` can't be reused, and it races on the shared db.**
   - `scripts/load.ts:6-47` is top-level CLI code: env, connect and run all happen at import. The build could only copy it, and the brief says reuse (SRP, modularity).
   - `:39-43` takes no lock, so two loads into `critwire_dev` can interleave drop and create. That gives a duplicate-type error, or a reader sees an empty table.
   - Fix: `scripts/db.ts` `loadDatabase(url, species)`, one transaction with `pg_advisory_xact_lock` first. `load.ts` becomes a thin CLI over it.
2. **`load.ts:6` throws without `.env`** even when `DATABASE_URL` is set: fresh clone, offline proof. It fails for the wrong reason. Fix: a shared `loadEnv()` that loads `.env` only if it exists.
3. **There is no contributing-dataset data.**
   - `scripts/ingest/gbif.ts:77-94` fetches only the country and license facets, so no derived dataset can be registered.
   - `:68` throws at 300 facet entries. That's right for countries, but fatal for datasets.
   - Fix: §5.
4. **The filters live inside one URL builder** (`ingest/gbif.ts:25-30`). A second query needs exactly the same filters, and a copy would drift (DRY). Fix: a shared `OCCURRENCE_FILTERS`; the countries URL stays byte-identical, so `sources[].url` doesn't churn.
5. **Derive is top-level script code** (`scripts/derive.ts:22-73`), so `gbif:register` can't prove its counts are fresh without re-implementing derive. Fix: `scripts/derive/pipeline.ts` with `readDeriveInputs()` and a pure `deriveAll()`; `derive.ts` stays the CLI.
6. **JSON formatting is fused with the atomic write** (`scripts/json.ts:18-23`), and `dist/` needs the same byte rules. Fix: a pure `formatJson(value, {canonical})`, used by `writeJson`.
7. **The countries source has no DOI slot** (`scripts/derive/record.ts:59-60`). Fix: add `RecordInput.gbif.doi`, set on that entry only. No rule changes.
8. **The docs have drifted:** `AGENTS.md:12` (DuckDB `postgres` extension), `AGENTS.md:34` and `plans/001-mvp.md:57,61,65,75,78` (cutover, `critwire_live`), `001-mvp.md:49` (`ranges.parquet`), `README.md:11` ("Not live yet"), `DATA-LICENSE.md:7` ("will cite"). Fix: §11.
9. **`tsconfig.json` includes only `scripts/`**, so E2E code would go unchecked, and `.gitignore` lacks the E2E outputs. Fix: §2 and §11.
10. **Fine as is:**
    - the derive rules, `countries.ts`, `assertOpenLicenses` and `gbifTaxonKey`;
    - `db/schema.sql`, which needs no change (`sources jsonb` carries the `doi`);
    - `http.ts` for GETs. Its retries and 200-only check are right for reads and wrong for the POST, which gets its own call.

### Target design

#### §1 Files, owners, data flow

| File | Writer (only) | Content |
|---|---|---|
| `data/raw/gbif/snapshot.json` | `pnpm ingest gbif` | Adds `species[N].datasets` (§5) |
| `data/gbif-derived-dataset/contributions.json` | `pnpm derive` | The counts to register (§5) |
| `data/gbif-derived-dataset/registration.json` | `pnpm gbif:register` | The DOI and what GBIF holds (§6) |
| `data/species.json` | `pnpm derive` | The countries source gets `doi` when the registration is current |
| `dist/` (not committed) | `pnpm build` | §3 |

```
raw + base + overrides + registration.json ─► derive ─► species.json, mismatches.json, contributions.json
contributions.json (committed, pushed) ─► gbif:register (network write) ─► registration.json
species.json + contributions.json + registration.json ─► build ─► Postgres (DATABASE_URL) + dist/
```

- Contributions don't depend on the registration, and the registration is a committed input, so derive is still a pure function of committed inputs.
- **Mission order:** final `ingest gbif` → `derive` → commit and push → `gbif:register` (needs H1) → `derive` (the DOI goes into `sources[]`) → commit → strict build and E2E.

#### §2 Modules

```
scripts/env.ts                   loadEnv(): process.loadEnvFile(".env") only if it exists (set vars win); requireEnv(name)
scripts/db.ts                    speciesRows(species) (pure, moved from load.ts); loadDatabase(url, species):
                                 sql.begin → pg_advisory_xact_lock(hashtext('critwire.load')) → schema → insert
scripts/load.ts                  CLI pnpm db:load: loadEnv → readJson(speciesFile) → loadDatabase
scripts/json.ts                  + formatJson(value, {canonical}) → 2-space JSON + "\n"; writeJson uses it
scripts/derive/pipeline.ts       readDeriveInputs() (fs); deriveAll(inputs) → {records, entries, contributions} (pure)
scripts/derive/contributions.ts  gbifContributions() (pure) + contributions.test.ts
scripts/derive.ts                CLI: deriveAll → 3 writes → summary (+ one line: DOI current | missing | stale)
scripts/ingest/gbif.ts           + OCCURRENCE_FILTERS, gbifDatasetsUrl(taxonKey, offset), dataset paging (§5)
scripts/gbif/derived-dataset.ts  types Contributions, Registration; file URLs; currentDoi(contributions, registration) (pure)
scripts/gbif/register.ts         pure: decide(), classifyPost(), requestBody(), readBackErrors() + register.test.ts
scripts/gbif-register.ts         CLI pnpm gbif:register (§6)
scripts/build.ts                 CLI pnpm build [--draft] (§3)
scripts/build/inputs.ts          readBuildInputs(): parse + validate species.json, contributions, registration; DOI gate
scripts/build/tables.ts          writeTables(speciesFile, outDir): DuckDB → species.parquet, species.csv
scripts/build/sources.ts         committed source registry: SOURCES, LICENSE_URLS, COL_CITATIONS (§7)
scripts/build/attribution.ts     buildAttribution(inputs) (pure)
scripts/build/docs.ts            renderDocs(template, attribution, stats) (pure)
site/index.html                  docs template: prose + {{slots}}, inline CSS, no JS
e2e/                             Caddyfile, fixtures/index.html, helpers.ts, *.spec.ts; playwright.config.ts at the root
```

- `package.json`:
  - dependency `@duckdb/node-api` `1.5.6-r.2`, exact;
  - devDependency `@playwright/test` `1.58.2`, exact;
  - new scripts `gbif:register` and `e2e` (`playwright test`);
  - `test` becomes `tsx --test scripts/derive/*.test.ts scripts/gbif/*.test.ts`.
- `tsconfig.json` also includes `e2e` and `playwright.config.ts`.

#### §3 `pnpm build [--draft]`

1. **Arguments:** only `--draft` is accepted; anything else throws. Then `loadEnv()` and `requireEnv("DATABASE_URL")`.
2. **`readBuildInputs()`**, offline, before anything is written:
   - **`data/species.json`:**
     - its bytes must equal `formatJson(parsed)`: derive's exact output, not hand-edited;
     - the keys at each level (record, taxonomy, ids, range, photo) must be exactly the expected set, and `sources` keys a subset of the known set. This is needed because `read_json` drops unknown keys;
     - records are sorted by `id`, and no slug matches `^\d+$` (it would collide with an `{id}.json` file);
     - every non-null photo has a non-empty `url`, `credit`, `license` and `page`.
   - **DOI consistency:** `doi = currentDoi(contributions, registration)`. Each countries source entry's `doi` must equal it (absent when null), else throw "run pnpm derive". `contributions.retrieved` must equal those entries' `retrieved`.
   - **Gate:** if `doi` is null and `--draft` isn't set, throw: "no current GBIF derived-dataset DOI (registration missing or stale): run pnpm gbif:register, then pnpm derive; pnpm build --draft for a preview".
     - Deploy runs plain `pnpm build`, so a release can't ship uncited: it fails fast where it matters.
     - The mission and agents can still build and run E2E before H1.
3. **`loadDatabase(DATABASE_URL, species)`:** the same code as `db:load`, with the advisory lock held for the whole load. It works over TCP (`.env`) or the socket (`postgres:///db` plus `PGHOST`).
4. **Write `dist/`** after `rm -rf dist`:
   - `v1/species.json`: a byte copy of `data/species.json`;
   - `v1/species/{id}.json` and `v1/species/{slug}.json`: `formatJson(record)`, identical bytes;
   - `v1/species.parquet` and `v1/species.csv` (§4);
   - `v1/attribution.json` (`formatJson`, §7);
   - `index.html` (§8).

   Then print every file with its size, for the PR body.

The exports are written from `data/species.json`, never read back from the db. **No `ranges.parquet`:** the countries are a list column in `species.parquet`, and polygons are Later.

#### §4 Exports

**Parquet (`species.parquet`) is nested and mirrors the JSON record.**
- Why nested:
  - one record shape across JSON and Parquet, which is the `/v1` contract;
  - lossless, including `sources[]`;
  - read natively by DuckDB, pandas/pyarrow, polars and R arrow. Spreadsheet users get the CSV.
- **DuckDB instance:** `DuckDBInstance.create(":memory:", {threads: "1", autoinstall_known_extensions: "false", autoload_known_extensions: "false"})`. Any extension use then fails instead of reaching for the network.
- **One typed view feeds both tables:**

```sql
CREATE TEMP VIEW species AS SELECT * FROM read_json('<data/species.json>', format='array', columns={
  id:'INTEGER', slug:'VARCHAR', scientificName:'VARCHAR', commonName:'VARCHAR',
  taxonomy:'STRUCT("class" VARCHAR, "order" VARCHAR, family VARCHAR, genus VARCHAR)',
  ids:'STRUCT(iucn INTEGER, gbif BIGINT, col VARCHAR, wikidata VARCHAR, inaturalist INTEGER, ncbi INTEGER)',
  "range":'STRUCT(countriesWithOpenRecords VARCHAR[], status VARCHAR)',
  photo:'STRUCT(url VARCHAR, credit VARCHAR, license VARCHAR, page VARCHAR)',
  sources:'STRUCT(source VARCHAR, fields VARCHAR[], license VARCHAR, retrieved VARCHAR, url VARCHAR, doi VARCHAR,
           "release" STRUCT("key" INTEGER, alias VARCHAR, version VARCHAR, issued VARCHAR), checklistKey VARCHAR)[]',
  replacedBy:'INTEGER[]'});
COPY (SELECT * FROM species ORDER BY id) TO '<dist>/v1/species.parquet' (FORMAT parquet, COMPRESSION snappy, ROW_GROUP_SIZE 100000);
```

- **Column details:**
  - Dates stay ISO strings, as in the JSON.
  - A `sources` key that a record leaves out becomes NULL; the docs say so.
  - Snappy is DuckDB's default and the most widely readable codec, and the size difference is nil at 76 rows.

**CSV (`species.csv`)** comes from the same view, through DuckDB's writer (`FORMAT csv, HEADER`), ordered by `id`.
- Each column is its JSON path in snake_case, with `.` turned into `_`: `id, slug, scientific_name, common_name, taxonomy_class, taxonomy_order, taxonomy_family, taxonomy_genus, ids_iucn, ids_gbif, ids_col, ids_wikidata, ids_inaturalist, ids_ncbi, range_countries_with_open_records, range_status, photo_url, photo_credit, photo_license, photo_page, replaced_by`.
- Countries and `replaced_by` are `;`-joined with `array_to_string`; NULL stays empty.
- No `sources`: the docs say it's in the JSON and Parquet.
- UTF-8 with no BOM, LF line ends, quoted only when needed (two photo credits contain commas).

**JSON:**
- 2-space indent, keys in derive's order, a final `"\n"`, non-ASCII left unescaped.
- `species.json` is the committed file's bytes, and each per-record file is one of its elements.
- `{id}.json` and `{slug}.json` are identical copies, not symlinks, so the deploy swap and Caddy stay trivial.

#### §5 GBIF dataset counts (ingest and derive)

**Ingest** (`pnpm ingest gbif`; same run, same all-or-nothing rule):
- **Paging:** right after each species' countries query, page `…/v1/occurrence/search?checklistKey=…&taxonKey=K&facet=datasetKey&facetLimit=300&facetOffset=O&limit=0&<OCCURRENCE_FILTERS>` with O = 0, 300, …, **until a page returns `counts: []`**.
  - This runs for every species with an occurrence query: ingest doesn't know which species are settled, and the 3 extra cost 6 requests.
  - The 300-entry saturation throw doesn't apply to this facet.
- **Checks on each page:**
  - its `count` equals the countries query's `count`, which catches an index change mid-run;
  - keys are UUIDs, with no duplicates across pages;
  - counts are positive integers.

  After the last page, the counts must sum to `count`. Any failure throws and the old snapshot stays.
- **Storage:** `species[N].datasets = { url: <page-0 URL>, counts: { <datasetKey>: n } } | null`, null exactly when `occurrences` is null.
  - It goes in the same snapshot file: dataset and country counts come from one run with one `retrieved`, which the sum check relies on.
  - This adds about 2 × 76 requests, roughly 1.5 min at 2 req/s.

**Derive** (`derive/contributions.ts`, pure, attribution only):
- **Input:** the settled species, those where `deriveGbif(...).taxonKey !== null`. That includes `no-open-records` and excludes `identity-unsettled`.
- **Dedupe by taxon key:** two species on one key must have identical raw (else it throws), and they count once with `speciesIds: [a, b]`.
- **Per taxon:**
  - `datasets` missing → throw "data/raw/gbif is stale: run pnpm ingest gbif";
  - counts that don't sum to `occurrences.count` → throw;
  - records in stray countries, in `ZZ`, and in countries an override removed all count: contributing records are everything the query matched.
- **Output** (canonical JSON): `{ retrieved, records, taxa: [{taxonKey, speciesIds, records, url}], datasets: {<key>: n} }`.
  - `taxa` are sorted by `taxonKey`, and `url` is the countries query.
  - A taxon with zero records is still listed, but adds no dataset.
- **`currentDoi(contributions, registration)`** returns `registration.doi` when `registration.relatedDatasets` has exactly the keys and counts of `contributions.datasets`, and null otherwise. Derive passes it to `buildRecord` as `gbif.doi`, which sets `doi` on the countries entry only.

**Re-ingest effect:** new matches and facets can move statuses, countries and mismatches; the owner's overrides are untouched. The E2E reads its expectations from the committed data, and the PR reports the delta against the baseline (72/1/3, 472 codes, 214 entries).

#### §6 `pnpm gbif:register`

This is the one network write, so it lives outside the build.
- Reads use `getJson` (retries are safe for reads; auth goes in `init.headers`, and only URLs are logged).
- The POST is a separate single `fetch` with a 60 s timeout and no retry.

**Preconditions**, all checked before any GBIF call:
1. `GBIF_USERNAME` and `GBIF_PASSWORD` are set; otherwise throw naming H1.
2. `git status --porcelain` is empty; `sha` = HEAD.
3. **Fresh:** `formatJson(deriveAll(await readDeriveInputs()).contributions, {canonical: true})` equals the bytes of `contributions.json`.
4. **Public and exact:** `getJson("https://raw.githubusercontent.com/kc0588615/critwire/<sha>/data/gbif-derived-dataset/contributions.json")`, formatted canonically, equals the local bytes. This proves HEAD is pushed and public, and that it is exactly what gets sent.
5. `contributions.datasets` is not empty.

**Request:** `{title, description, sourceUrl, relatedDatasets: contributions.datasets}`. No `originalDownloadDOI` (no download exists) and no `registrationDate` (register now).
- **`sourceUrl` = `https://github.com/kc0588615/critwire/tree/<sha>/data`.** That is the deposit: the country lists (`species.json`), the per-dataset counts (`contributions.json`) and the per-taxon queries (raw), at a commit that is immutable and already public. `critwire.com/v1` isn't live yet, and it changes with every data update, while the DOI's counts don't.
- **`title`:** human-readable, no hash. For example: "critwire: countries with open (CC0, CC BY 4.0) GBIF occurrence records, N taxa".
- **`description`:** the filters, the licenses, the file paths and `https://critwire.com/v1/`, ending with the line `contributions-sha256: <hex>`, which is the reconciliation key.

**Decision:** a pure function `decide({registration, contributionsSha, datasets, intent, listing})`.

| State | Action |
|---|---|
| `registration.json` exists, counts equal | **verify**: read back; write nothing; exit 0 |
| `registration.json` exists, counts differ | **refuse**: "GBIF can't change a DOI's counts; for a new DOI, git rm registration.json, commit, push, re-run" |
| missing: list all pages of `GET /derivedDataset/user/{user}`, then: | |
| exactly 1 listed with this `contributions-sha256` | **adopt**: read back, write `registration.json`, delete the intent |
| more than 1 listed | **refuse**: duplicates are already on GBIF; add a handoff item |
| 0 listed, an intent file exists | **refuse**: "a POST at <time> may have registered; re-run later; delete <intent> only when sure nothing was created" |
| 0 listed, no intent | **post** |

**Intent record:** before the POST, write `${XDG_STATE_HOME:-~/.local/state}/critwire/gbif-register-intent.json` with `{contributionsSha256, sourceUrl, startedAt}`.
- It lives outside git because the tree must stay clean.
- It is per GBIF user, so every checkout on this VPS sees it.

**POST outcome** (`classifyPost`):
- **Created:** 200 or 201 with a parseable `doi`. Read back, then write `registration.json`, then delete the intent.
- **Rejected:** 400, 401, 403 or 415 (GBIF validates before it creates). Delete the intent and throw with the first 300 characters of the body.
- **Ambiguous:** anything else (5xx, timeout, network error, 2xx without a DOI). Keep the intent and throw "re-run to reconcile"; the next run lists first.

**Read-back:**
- `GET /derivedDataset/{doi}`: `title`, `description` and `sourceUrl` equal what was sent, and `createdBy` equals `GBIF_USERNAME`.
- `GET /derivedDataset/{doi}/datasets`, all pages: the `datasetKey → numberRecords` map equals `contributions.datasets`.
- On any mismatch it throws, writes nothing and keeps the intent, so the next run adopts the dataset.

**`registration.json`** (canonical, committed): `{doi, citation, title, description, sourceUrl, createdBy, contributionsSha256, records, relatedDatasets}`. `citation` is GBIF's text, verbatim. It holds no `created` or `modified` times. There's no PUT path: nothing needs one now, and PUT can't change counts.

#### §7 `attribution.json` and the source registry

- **Where the source list comes from:** the distinct `sources[].source` values in `species.json`, plus the photos, critwire itself and the derived dataset.
- **Registry:** `scripts/build/sources.ts` is committed and holds, per source name, its homepage, its citation and notes. The citation is the source's requested wording, verbatim; it is a template only where the source's own format includes an access date.
  - An unknown source name throws, and so does a registry entry the data doesn't use.
- **Per-source values** (`license`, `retrieved`, `doi`, `release`, `checklistKey`) come from `species.json`. They must be identical across records (one snapshot each), or the build throws.

| Source | License | Citation |
|---|---|---|
| Catalogue of Life | CC BY 4.0 | `COL_CITATIONS[release.key]`: ChecklistBank's release `citation`, verbatim as plain text (316595 above). A missing key throws "add the citation for COL release N from api.checklistbank.org/dataset/N". The build checks that it contains the release DOI and version. |
| GBIF Backbone Taxonomy | CC BY 4.0 | GBIF's own text, keyed by DOI `10.15468/39omei`, with `{retrieved}` filled in |
| GBIF.org occurrence search | CC BY 4.0 (critwire-derived from CC0/CC BY records) | `registration.citation` (the DOI). In `--draft` only: "GBIF.org occurrence search, accessed {retrieved}; per-species query URLs in sources[]" |
| Wikidata | CC0 1.0 | "Wikidata, https://www.wikidata.org/ (CC0 1.0)". No attribution is required; it's credited as a courtesy |
| critwire base, and critwire itself | CC BY 4.0 | "critwire (https://critwire.com), CC BY 4.0", as `DATA-LICENSE.md` asks |
| Photos (Wikimedia Commons) | per file | `{credit}, {license}, via Wikimedia Commons, {page}` |

`LICENSE_URLS` maps every license string in the data to its deed URL: `Public domain` → null, `CC0` → CC0 1.0, `CC BY-SA 2.0 de` → `/by-sa/2.0/de/`. An unknown string throws.

```json
{
  "critwire": { "license": "CC BY 4.0", "licenseUrl": "…", "credit": "critwire (https://critwire.com), CC BY 4.0",
                "terms": "https://github.com/kc0588615/critwire/blob/main/DATA-LICENSE.md", "code": { "license": "MIT", "url": "…/LICENSE" } },
  "sources": [ { "source": "Catalogue of Life", "url": "https://www.catalogueoflife.org/", "fields": ["ids.col", "taxonomy"], "records": 69,
                 "license": "CC BY 4.0", "licenseUrl": "…", "retrieved": "2026-10-20", "doi": "10.48580/dgzh4", "citation": "…" } ],
  "gbifDerivedDataset": { "doi": "…", "url": "https://doi.org/…", "citation": "…", "title": "…", "sourceUrl": "…", "records": 0,
                          "datasets": [ { "datasetKey": "…", "records": 0 } ] },
  "photos": [ { "speciesId": 1, "slug": "…", "credit": "…", "license": "…", "licenseUrl": "…", "page": "…" } ]
}
```

- **`sources`:**
  - sorted like `sources[]`;
  - `fields` is the union of the fields the source fills, in the fixed FIELDS order;
  - `records` is the number of records citing it;
  - optional keys are omitted rather than null.
- **`gbifDerivedDataset`:** null only in `--draft`; its `datasets` are sorted by key.
- **`photos`:** sorted by `speciesId`, leaving out species with no photo.
- No build time anywhere: every date comes from `data/`.

#### §8 Docs page (`dist/index.html`)

- **Template:** `site/index.html` holds hand-written prose for grades 6–12 and app makers, with inline CSS, no JS and no external assets.
- **Rendering:** `renderDocs` fills the `{{slot}}`s.
  - Values are HTML-escaped, and list fragments are built already escaped.
  - An unknown or unused slot throws.
- **Sections** (stable ids, which the E2E uses):
  - `#about`: what critwire is.
  - `#files`: every `/v1` file, with `curl` and DuckDB examples.
  - `#fields`: every field.
    - `range.status`.
    - "Countries with open records" is not native range: only CC0 and CC BY records count, and strays are excluded.
    - A null id or null countries means "not settled": critwire never guesses, and a person reviews disagreements.
    - The CSV column naming.
    - `sources` is only in the JSON and Parquet.
  - `#licenses`: `DATA-LICENSE.md` and `LICENSE` in plain words, with links to both on GitHub. IUCN gets an id only.
  - `#credits`, built from `attribution.json`:
    - the source citations with license links;
    - the GBIF DOI with the number of contributing datasets, linking to `https://doi.org/<doi>` and `/v1/attribution.json`;
    - the photo credits, inside `<details>`.
  - `#cite`: how to cite critwire.
- **Examples:** written as `<pre><code data-example="shell|sql">` against `https://critwire.com/v1/…`, the only origin in the build.
  - The E2E swaps that text for its local origin, so the build needs no origin option and `dist/` stays one deterministic output.
  - The curl examples cover every `/v1` file. The SQL examples cover Parquet (filtered by country), CSV and JSON.
- **Mobile:**
  - a viewport meta tag and `max-width: 42rem`;
  - `pre { overflow-x: auto }`;
  - `overflow-wrap: anywhere` for URLs, DOIs and UUIDs;
  - `<dl>` lists instead of wide tables.

#### §9 E2E (Playwright 1.58.2, headless Chromium 1208, `workers: 1`)

**Server.** `webServer` runs `caddy run --config e2e/Caddyfile --adapter caddyfile` with `reuseExistingServer: false`, so a busy port fails fast. It waits on `http://127.0.0.1:3101/`, which is always present.
- **Global options:** `admin off`, `auto_https off`, `persist_config off`.
- **`http://127.0.0.1:3100`** copies the live `critwire.com` block: its headers, CORS, the `@preflight` 204 and `encode`.
  - Only the root differs (`{$CRITWIRE_DIST}`).
  - It adds a JSON access `log` to `{$E2E_ARTIFACTS}/caddy-access.log`.
- **`http://127.0.0.1:3101`** serves `e2e/fixtures/`, a blank page, as the second origin.
- **Drift test:** compares the 3100 block with the `critwire.com` block in `/srv/critter-ai/ops/config/etc/caddy/Caddyfile`, read only, ignoring the root and log lines. Where that file can't be read (other machines), it skips and says why.

**Artifacts:** `E2E_ARTIFACTS` (default `e2e-artifacts/`, gitignored).
- Contents: `playwright-report/`, `test-results/` (`trace: 'on'`, `screenshot: 'on'`), `results.json` and `caddy-access.log`.
- The mission uses `/srv/critter-ai/agent-state/missions/critwire-release/e2e`.
- A first check fails with "run pnpm build" unless `dist/v1/species.json` equals `data/species.json`.

**Specs:**
- **`docs`:**
  - The page renders with every section, and gets a full-page screenshot at 375×812.
  - `scrollWidth` is at most 375.
  - Same-origin links return 200, and every anchor target exists.
  - External links must be https on an allowlist of hosts. They aren't fetched, because gbif.org returns 403 to bots.
- **`files`:**
  - every `/v1` file returns 200;
  - `species.json` bytes equal `data/species.json`, and the record count and per-status counts are computed from the data;
  - `{id}.json` and `{slug}.json` are byte-identical and equal their record;
  - the CSV, read with DuckDB `read_csv(all_varchar)`, equals a flattening re-implemented in the test;
  - the Parquet equals the records, read both as a local file and over HTTP (NULL ↔ an absent `sources` key).
- **`serving`:**
  - **Range:** `bytes=100-199` gives 206, the exact `Content-Range: bytes 100-199/<size>` and the exact bytes, for both Parquet and CSV. This proves `encode` doesn't break ranges.
  - **Preflight:** a direct OPTIONS gives 204 with every CORS header.
  - **Cross-origin with preflight:** from the 3101 page, `fetch(parquet, {headers: {Range: 'bytes=-8'}})`. A suffix range isn't CORS-safelisted, so Chromium preflights it.
    - The response is 206 and ends in `PAR1`.
    - JS can read `Content-Range`, `Content-Length` and `Accept-Ranges`.
    - The access log shows the OPTIONS 204 from that origin.
  - **Cross-origin without preflight:** a plain `fetch` of `species.json` parses.
- **`duckdb`:**
  - `SELECT … FROM 'http://127.0.0.1:3100/v1/species.parquet'` works, and the access log shows `GET species.parquet` with `Range` answered 206.
    - httpfs autoinstalls into `node_modules/.cache/critwire-duckdb`.
    - The E2E may use the network; the build never does.
  - **Docs examples:** every `data-example` from `dist/index.html` runs with `https://critwire.com` replaced by `http://127.0.0.1:3100`.
    - Shell examples run with `bash -euo pipefail` in a temp dir.
    - SQL examples run in DuckDB and must return at least one row.
    - Together, the curl examples must cover every `/v1` file.
- **`attribution`:**
  - the source set equals the distinct `sources[].source` plus photos;
  - every entry has a license and a citation;
  - `photos` matches the records that have a photo.
  - If `registration.json` exists:
    - its DOI appears in `attribution.json`, in the docs `#credits` and in every countries source entry of `/v1/species.json`;
    - `datasets` equals `contributions.json` and sums to `records`.
  - Otherwise: `test.skip('no GBIF registration yet (H1)')`. The final verification requires a strict build and 0 skipped in `results.json`.

**Command:** `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

#### §10 Determinism and offline proof

- **What keeps output stable:**
  - nothing reads the clock;
  - rows are sorted by `id`;
  - DuckDB runs with `threads=1` and explicit columns, compression and row-group size.

  Determinism is bounded to the pinned lockfile on linux-arm64.
- **Checks:**
  - two `pnpm build` runs give an identical `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum)`;
  - `pnpm derive` twice, then `git diff --exit-code data/`.
- **Offline proof** (the exact command for Verification):

```sh
T=$(mktemp -d); git clone -q https://github.com/kc0588615/critwire "$T/cw" && git -C "$T/cw" checkout -q <pushed sha>
(cd "$T/cw" && pnpm install --frozen-lockfile) && mkdir "$T/home" && createdb critwire_offline
sudo unshare -n setpriv --reuid=critter-ai --regid=critter-ai --init-groups \
  env -i HOME="$T/home" PATH="$PATH" COREPACK_HOME="$HOME/.cache/node/corepack" \
  DATABASE_URL=postgres:///critwire_offline PGHOST=/var/run/postgresql bash -c "cd $T/cw && pnpm build"
dropdb critwire_offline; test ! -e "$T/home/.duckdb"   # DuckDB fetched no extension
```

  Its dist hash list must equal the worktree build's.
- **Never point the socket build at `critwire_dev`.** Peer auth connects as `critter-ai`, so the recreated table would belong to `critter-ai`, and the `critwire` role's next `drop table` would fail. That's why it uses the throwaway `critwire_offline`.

#### §11 Docs and repo updates

- **`AGENTS.md`:**
  - Stack: "`@duckdb/node-api` (pinned) writes Parquet and CSV from `data/species.json`; no DuckDB extensions at build time (offline)".
  - Commands: `pnpm build [--draft]`, `pnpm e2e`, `pnpm gbif:register`.
  - Data: the two `data/gbif-derived-dataset/` files and their writers.
  - Release: drop the cutover sentence.
- **`plans/001-mvp.md`:**
  - `:49`: `ranges.parquet` moves to Later; the files are `species/{id}.json` and `species/{slug}.json`.
  - `:57`: no postgres extension; the exports come from `species.json`.
  - `:61` and `:65`: drop `critwire_live` and the cutover.
  - `:75`: "set at cutover" becomes "set".
  - `:78` (step 3): "implementation verified; owner deploy pending (PR #n)", plus the DOI.
- **`README.md`:** the files, the docs URL, and the dev commands (`build`, `e2e`, `gbif:register`).
- **`DATA-LICENSE.md:7`:** "will cite" becomes "cites a GBIF derived-dataset DOI listing the contributing datasets (see `/v1/attribution.json`)". The DOI itself isn't repeated there.
- **`.gitignore`:** add `e2e-artifacts/`, `test-results/` and `playwright-report/`.

#### §12 Unit tests

Only where E2E can't reach. The failure modes are written first, as in the existing tests.
- **`derive/contributions.test.ts`:**
  - D1: counts that don't sum to `count` → throws.
  - D2: a settled species without `datasets` → throws (stale raw).
  - D3: one taxon key on two species counts once; different raw on a shared key → throws.
  - D4: unsettled species are excluded.
  - D5: a zero-record taxon is listed but adds no dataset.
  - D6: a bad key, or a count of 0 or less → throws.
  - D7: shuffled input gives the same output.
- **`derive/record.test.ts`**, S3: the DOI goes only on the countries entry; a null DOI leaves no `doi` key; null countries get no entry at all.
- **`gbif/derived-dataset.test.ts`**, `currentDoi`:
  - R1: no registration → null.
  - R2: an extra key, a missing key or a different count → null.
  - R3: equal counts → the DOI.
- **`gbif/register.test.ts`:** G1–G7 cover every row of the decision table, plus `classifyPost`. A real POST mints a public DOI, so these paths can't be exercised live.

Build, docs and attribution get no unit tests; the E2E covers them.

### Decisions (for the lead to copy)

- **A1** Exports are written from `data/species.json` by DuckDB (`@duckdb/node-api` 1.5.6-r.2, exact pin) with extension autoload and autoinstall off. No postgres extension.
- **A2** `species.parquet` is nested, mirroring the JSON, with snappy compression, `ROW_GROUP_SIZE 100000` and `threads=1`. The CSV is the flat view: snake_case paths, `;`-joined lists, no `sources`.
- **A3** No `ranges.parquet`.
- **A4** `dist/v1/species.json` is a byte copy of `data/species.json`, and the `{id}` and `{slug}` files are identical copies.
- **A5** Dataset counts go in the same GBIF snapshot (`species[N].datasets`), paged until an empty page, with sum checks. `pnpm derive` turns them into `data/gbif-derived-dataset/contributions.json`.
- **A6** `pnpm gbif:register`:
  - freshness: proven by `deriveAll` run in-process, a clean tree, and byte equality with raw.githubusercontent at HEAD;
  - reconciliation: by the `contributions-sha256` line in the description;
  - the intent record lives in `~/.local/state/critwire/`;
  - no PUT path, and changed counts are refused.
- **A7** `sourceUrl` = `https://github.com/kc0588615/critwire/tree/<sha>/data`: public, immutable, and holding the lists, the counts and the queries.
- **A8** A plain `pnpm build` refuses a missing or stale DOI; `--draft` covers the time before H1 and local previews. Deploy runs plain `pnpm build`.
- **A9** Citations are each source's own wording, verbatim, kept in a committed registry. The COL citation is keyed by release, so the build fails on a new release until its citation is added. COL raw isn't re-ingested, because that's outside the brief's scope.
- **A10** The E2E Caddy copies the live block with `admin off`, on ports 3100 and 3101, adds an access log, and is drift-checked against the ops Caddyfile.
- **A11** The offline proof uses a throwaway `critwire_offline` db over the socket, never `critwire_dev`.
- **A12** `loadEnv()` loads `.env` only if it exists. The socket is reached with `postgres:///db` plus `PGHOST`.

### Risks

- **R1** The re-ingest can change statuses and countries, and a new GBIF match can change which species are settled. This is expected; the PR reports the delta.
- **R2** GBIF's index can change between a species' countries query and its dataset pages. The per-page `count` check then makes the ingest throw; re-run it.
- **R3** A squash merge would leave `<sha>` off `main`. The PR ref keeps it reachable, and the repo uses merge commits; the PR body asks for a merge commit.
- **R4** Each monthly COL release fails the build until `COL_CITATIONS` has its citation. That's deliberate and loud. Later: allowlist `citation` in the COL ingest at its next refresh and drop the table.
- **R5** Every later GBIF re-ingest that changes any count makes the DOI stale. A plain build then fails until a new DOI is registered (git rm `registration.json`, then register).
- **R6** The E2E needs the network the first time it installs httpfs. The build never does.
- **R7** Caddy serves `.parquet` with no `Content-Type`. That's harmless for DuckDB and `fetch`; an optional ops tweak later, not a handoff item.
- **R8** DataCite registers the DOI asynchronously, so `doi.org` can lag GBIF by minutes. The read-back uses GBIF's API, not doi.org.

### Rejected alternatives

- **DuckDB `postgres` extension:** it downloads on first use, so the deploy would need the network.
- **Flattened Parquet:** two record shapes to document, and `sources[]` would become a JSON string or be lost.
- **A hand-written CSV encoder:** DuckDB's writer is established and already loaded.
- **A separate dataset-counts snapshot file:** separate runs can't guarantee that the counts sum to the countries `count`.
- **Contributions computed in ingest:** knowing which species are settled needs the Wikidata cross-check and derive's GBIF rule.
- **Contributions computed only inside register:** there would be no committed counts for the deposit to point at, and the brief wants them committed before sending.
- **Derive throwing on a stale registration:** derive couldn't then write the new contributions that re-registration needs. A deadlock.
- **A build that always renders without a DOI:** merging before registration would ship an uncited release, silently.
- **A strict build with no `--draft`:** the mission couldn't run E2E before H1.
- **The script committing its intent record:** heavier, and it breaks the clean-tree precondition. The listing hash is the real guard.
- **`sourceUrl` = critwire.com/v1:** not public yet, and it changes.
- **`sourceUrl` = a blob link to `contributions.json`:** the deposit is the lists plus the counts, not just the counts.
- **A PUT update path:** GBIF's PUT can't change counts, and nothing needs it now.
- **Fetching every contributing dataset's title and license:** hundreds of requests, while GBIF's DOI page already lists them with citations.
- **Re-ingesting COL to get its citation:** outside the brief's scope, and it could pull a new release.
- **A `--origin` build option for the E2E:** that gives two different outputs; a text swap in the test keeps `dist/` single.
- **Symlinked slug files:** a risk to the deploy and to serving, to save about 200 KB.

### Owner items

None beyond H1 (`GBIF_PASSWORD`).

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

- Architecture decisions A1–A12: see Architecture → "Decisions (for the lead to copy)" (single copy kept there, pending reviews).

## Log

- 2026-10-21 05:13 UTC: Baseline recorded; typecheck pass, 42/42 unit, derive deterministic, db:load 76, build placeholder ok; no lint/E2E yet.
- 2026-10-21 05:35 UTC: Architecture written by `architect` (findings, target design, A1–A12, risks R1–R8); DuckDB node-api 1.5.6-r.2 smoke-tested on arm64 (deterministic Parquet). Docs-only change; no checks needed.

## Summary
