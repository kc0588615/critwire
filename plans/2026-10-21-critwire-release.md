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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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
- **GitHub:** the repo is public, and `raw.githubusercontent.com/kc0588615/critwire/<sha>/…` and `github.com/…/tree/<sha>/data` resolve for pushed commits. PRs are merged with merge commits. Origin has no tags today (`git ls-remote --tags origin` is empty). The mission's release step rebases the branch, which leaves the pre-rebase commits on no branch; GitHub doesn't promise to keep such commits.
- **Derive cost:** `pnpm derive` takes 0.84 s here and changes nothing, so the build and `gbif:register` can re-run it in-process to prove freshness.
- **Node has no `flock`**; `open(path, "wx")` (O_EXCL) is atomic on a local fs.

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
5. **Derive is top-level script code** (`scripts/derive.ts:22-73`), so neither `gbif:register` nor the build can prove the committed derived files are fresh without re-implementing derive. Today `load.ts:11` loads whatever `species.json` holds. Fix: `scripts/derive/pipeline.ts` with `readDeriveInputs()`, a pure `deriveAll()` and `assertDerivedFiles()`; `derive.ts` stays the CLI.
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
data/ (derive inputs + derived files) ─► build (re-runs deriveAll: must equal the committed files) ─► Postgres (DATABASE_URL) + dist/
```

- Contributions don't depend on the registration, and the registration is a committed input, so derive is still a pure function of committed inputs.
- **Mission order:** final `ingest gbif` → `derive` → commit and push → push tag `gbif-dd-<hex12>` at that commit (§6) → `gbif:register` (needs H1) → `derive` (the DOI goes into `sources[]`) → commit → strict build and E2E. Later commits, the release rebase and the merge don't touch the registration: it is checked against `registration.json` and the tag, never HEAD.

#### §2 Modules

```
scripts/env.ts                   loadEnv(): process.loadEnvFile(".env") only if it exists (set vars win); requireEnv(name)
scripts/db.ts                    speciesRows(species) (pure, moved from load.ts); loadDatabase(url, species):
                                 sql.begin → pg_advisory_xact_lock(hashtext('critwire.load')) → schema → insert
scripts/load.ts                  CLI pnpm db:load: loadEnv → readJson(speciesFile) → loadDatabase
scripts/json.ts                  + formatJson(value, {canonical}) → 2-space JSON + "\n"; writeJson uses it
scripts/derive/pipeline.ts       readDeriveInputs() (fs, incl. registration.json); deriveAll(inputs) → {records, entries,
                                 contributions, doi} (pure); assertDerivedFiles(result): the 3 committed files equal
                                 formatJson of the result byte for byte, else throw "data/<file> is stale: run pnpm derive"
scripts/derive/contributions.ts  gbifContributions() (pure) + contributions.test.ts
scripts/derive.ts                CLI: deriveAll → 3 writes → summary (+ one line: DOI current | missing | stale, and when
                                 not current the tag to push: gbif-dd-<hex12>)
scripts/ingest/gbif.ts           + OCCURRENCE_FILTERS, gbifDatasetsUrl(taxonKey, offset), dataset paging (§5)
scripts/gbif/derived-dataset.ts  types Contributions, Registration; file URLs; currentDoi(contributions, registration) (pure)
scripts/gbif/register.ts         pure: decide(), classifyPost(), requestBody(), readBackErrors() + register.test.ts
scripts/gbif/state.ts            stateDir; withLock(fn) (O_EXCL lock file); readIntent, createIntent ("wx"), deleteIntent
                                 + state.test.ts
scripts/gbif-register.ts         CLI pnpm gbif:register (§6), incl. checkDeposit (network reads)
scripts/build.ts                 CLI pnpm build [--draft] (§3)
scripts/build/columns.ts         RECORD_COLUMNS: the one nested spec (key → DuckDB type, in record order) from which
                                 the read_json columns, the record key check and the CSV select list are generated
scripts/build/inputs.ts          readBuildInputs(): deriveAll + assertDerivedFiles; key check vs RECORD_COLUMNS; DOI gate
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
2. **`readBuildInputs()`**, offline, before anything is written, in every build (strict and `--draft`):
   - **Freshness:** `result = deriveAll(await readDeriveInputs())`, then `assertDerivedFiles(result)`. `data/species.json`, `data/review/mismatches.json` and `contributions.json` must equal derive's output byte for byte. This covers hand edits, stale derives, formatting, `id` order and the DOI on the countries entries (derive sets it from `currentDoi`). Derive is offline and takes under 1 s.
   - **`data/species.json`** (beyond what derive guarantees):
     - the keys at each level (record, taxonomy, ids, range, photo) must be exactly the `RECORD_COLUMNS` set, and `sources` keys a subset of its set. This is needed because `read_json` drops unknown keys, so a field added to derive but not to the spec fails here and isn't silently dropped;
     - no slug matches `^\d+$` (it would collide with an `{id}.json` file);
     - every non-null photo has a non-empty `url`, `credit`, `license` and `page`.
   - **Gate:** `doi = result.doi`. If it is null and `--draft` isn't set, throw: "no current GBIF derived-dataset DOI (registration missing or stale): see AGENTS.md, GBIF DOI refresh; pnpm build --draft for a preview".
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
- **One typed view feeds both tables.** Its `columns={…}` string is generated from `RECORD_COLUMNS` (keys quoted where they are SQL keywords), which renders exactly this:

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

**CSV (`species.csv`)** comes from the same view, through DuckDB's writer (`FORMAT csv, HEADER`), ordered by `id`. Its select list is generated from `RECORD_COLUMNS` too (every leaf except `sources`).
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
- **Checks on each page** (consistency is best-effort: equal totals catch an index change that moves `count`, not one that keeps it; the DOI records this one run's counts either way):
  - its `count` equals the countries query's `count`;
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
- Run it on the Oracle VPS only (AGENTS.md says so): the lock and the intent are local files, and the GBIF listing is the only guard across machines.

**State files** (`scripts/gbif/state.ts`) live in `${XDG_STATE_HOME:-~/.local/state}/critwire/`: outside git, because the tree must stay clean, and shared by every checkout of this OS user on this machine (per OS user, not per GBIF user; there is one of each here).
- **Lock** `gbif-register.lock`. `withLock(fn)` creates it with `open(…, "wx")` (O_EXCL, atomic) holding `{pid, startedAt}`, runs the whole run inside it (reconciliation, POST, read-back, writing `registration.json`, deleting the intent), and deletes it in `finally`.
  - If it already exists, throw: "gbif:register is running (pid N) or was killed; if pid N isn't running, delete <lock> and re-run (the intent still guards any POST)".
  - It is never broken automatically, because two breakers could race.
- **Intent** `gbif-register-intent.json`: `{contributionsSha256, request, startedAt}`, where `request` is the exact body about to be sent, `sourceUrl` included. `createIntent` writes it with `{flag: "wx"}` right before the POST. It survives crashes. Only a rejected POST, a written `registration.json` or a verify of the same hash deletes it. An unreadable intent counts as present.

**Preconditions**, local, on every run, before any network call:
1. `GBIF_USERNAME` and `GBIF_PASSWORD` are set; otherwise throw naming H1.
2. `git status --porcelain` is empty.
3. **Fresh:** `assertDerivedFiles(deriveAll(await readDeriveInputs()))`, the same check as the build. `species.json`, `mismatches.json` and `contributions.json` must equal derive's output, so a DOI can't point at stale country lists.
4. `contributions.datasets` is not empty.

`contributionsSha256` is the sha256 of the `contributions.json` bytes, and `tag` is `gbif-dd-<its first 12 hex>`.

**Deposit check** `checkDeposit(sourceUrl, sha256)`: network reads, every failure hard.
- `sourceUrl` matches `^https://github\.com/kc0588615/critwire/tree/([0-9a-f]{40})/data$`, which captures the commit.
- `git ls-remote origin refs/tags/gbif-dd-<sha256[0:12]>` returns that commit.
  - The tag keeps the commit reachable after the release rebase or a squash merge, which would otherwise orphan it.
  - Missing: throw with the exact `git tag <tag> <commit> && git push origin <tag>`.
- Unauthenticated `raw.githubusercontent.com/kc0588615/critwire/<commit>/data/gbif-derived-dataset/contributions.json`, re-formatted canonically, hashes to `sha256`. That proves the file is public and exact.

**Request** (post only): `{title, description, sourceUrl, relatedDatasets: contributions.datasets}`. No `originalDownloadDOI` (no download exists) and no `registrationDate` (register now).
- **`sourceUrl` = `https://github.com/kc0588615/critwire/tree/<HEAD>/data`.** That is the deposit: the country lists (`species.json`), the per-dataset counts (`contributions.json`) and the per-taxon queries (raw), at a commit that is immutable, public and held by its tag. `critwire.com/v1` isn't live yet, and it changes with every data update, while the DOI's counts don't.
- **HEAD is used only here.** Verify and adopt check against `registration.json`, the intent and the tag, so later commits and rebases don't matter.
- **`title`:** human-readable, no hash. For example: "critwire: countries with open (CC0, CC BY 4.0) GBIF occurrence records, N taxa".
- **`description`:** the filters, the licenses, the file paths and `https://critwire.com/v1/`, ending with the line `contributions-sha256: <hex>`, which is the reconciliation key.

**Decision:** a pure function `decide({registration, contributionsSha256, datasets, intent, listing})`. `listing` holds the user's datasets whose description carries this hash's line. The first matching row wins.

| State | Action |
|---|---|
| `registration.json` exists, its `relatedDatasets` equal `contributions.datasets` | **verify** against `registration.json`: read back, then delete a leftover intent with the same hash; write nothing else; exit 0 |
| `registration.json` exists, counts differ | **refuse**: "GBIF can't change a DOI's counts; for a new DOI see AGENTS.md, GBIF DOI refresh" |
| missing: list all pages of `GET /derivedDataset/user/{user}`, then: | |
| an intent for another hash | **refuse**: names the intent's `sourceUrl`; "check out that commit and re-run to adopt it, or delete <intent> only when sure nothing was created" |
| exactly 1 listed | **adopt**: read back, write `registration.json`, delete the intent |
| more than 1 listed | **refuse**: duplicates are already on GBIF; add a handoff item |
| 0 listed, an intent exists | **refuse**: "a POST at <time> may have registered; re-run later; delete <intent> only when sure nothing was created" |
| 0 listed, no intent | **post**: `checkDeposit(HEAD sourceUrl, contributionsSha256)`, `createIntent`, POST |

**POST outcome** (`classifyPost`):
- **Created:** 200 or 201 with a parseable `doi`. Read back, then write `registration.json`, then delete the intent.
- **Rejected:** any 4xx except 408 and 429 (GBIF validates before it creates). Delete the intent and throw with the first 300 characters of the body.
- **Ambiguous:** everything else (408, 429, 5xx, timeout, network error, 2xx without a DOI). Keep the intent and throw "re-run to reconcile"; the next run lists first.

**Read-back** (`readBackErrors(expected, record, usages)` returns `{hard, warnings}`) reads `GET /derivedDataset/{doi}` and every page of `GET /derivedDataset/{doi}/datasets`. `expected` is the request after a POST, the intent (if any) on adopt, and `registration.json` on verify. `hash` is `contributionsSha256`, or on verify `registration.contributionsSha256` (a re-ingest can change `retrieved` without changing counts).
- **Hard** (throw, write nothing, keep the intent):
  - the `datasetKey → numberRecords` map equals `contributions.datasets`;
  - `createdBy` equals `GBIF_USERNAME`;
  - the description carries the `contributions-sha256: <hash>` line;
  - `sourceUrl` equals `expected.sourceUrl` when there is one;
  - `checkDeposit(record.sourceUrl, hash)` passes.
- **Warning** (printed, the run still succeeds): `title` or the rest of `description` differs from `expected`. `registration.json` stores GBIF's values, so a minted DOI never ends up with every re-run throwing, and the brief's title check is still done and reported.

**`registration.json`** (canonical, committed): `{doi, citation, title, description, sourceUrl, createdBy, contributionsSha256, records, relatedDatasets}`, taken from GBIF's read-back. It is the persisted record that later verify runs check against. `citation` is GBIF's text, verbatim. It holds no `created` or `modified` times. There's no PUT path: nothing needs one now, and PUT can't change counts.

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
    - A null id means "not settled": critwire never guesses, and a person reviews disagreements.
    - Null countries have two meanings, told apart by `range.status`: `no-open-records` (we know the GBIF taxon, but no country is left after the open-license and quality filters) and `identity-unsettled` (we couldn't confirm which GBIF taxon it is, so nothing was counted).
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
  - Otherwise: `test.skip('no GBIF registration yet (H1)')`. The final verification requires a strict build and 0 skipped in `results.json` **on this VPS**. Elsewhere the drift test may skip too.

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

  Its dist hash list must equal the worktree build's. Before H1, both builds use `pnpm build --draft` (a strict build refuses without a DOI). The final Verification uses plain `pnpm build`. Verification gives both forms.
- **Never point the socket build at `critwire_dev`.** Peer auth connects as `critter-ai`, so the recreated table would belong to `critter-ai`, and the `critwire` role's next `drop table` would fail. That's why it uses the throwaway `critwire_offline`.

#### §11 Docs and repo updates

- **`AGENTS.md`:**
  - Stack: "`@duckdb/node-api` (pinned) writes Parquet and CSV from `data/species.json`; no DuckDB extensions at build time (offline)".
  - Commands: `pnpm build [--draft]`, `pnpm e2e`, `pnpm gbif:register`.
  - Data: the two `data/gbif-derived-dataset/` files and their writers. `pnpm build` refuses derived files that differ from `pnpm derive`'s output.
  - **GBIF DOI refresh** (a short section). Any `ingest gbif` that changes dataset counts makes the DOI stale: `pnpm derive` prints `DOI stale`, and plain `pnpm build`, and so `deploy`, fails until the refresh is done. Steps:
    1. `pnpm derive`
    2. `git rm data/gbif-derived-dataset/registration.json`
    3. commit and push
    4. `git tag gbif-dd-<hex12> && git push origin gbif-dd-<hex12>` (derive prints the name)
    5. `pnpm gbif:register` (on the Oracle VPS only)
    6. `pnpm derive`
    7. commit and push

    Never delete or move a `gbif-dd-*` tag: each one holds a DOI's deposit. If a run is interrupted, re-run it; it reconciles. Delete the lock or the intent only as its error message says.
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
- **`gbif/register.test.ts`** (a real POST mints a public DOI, so these paths can't be exercised live):
  - G1–G8: every row of the decision table, in precedence order, including a verify that deletes a leftover intent with the same hash and an intent for another hash;
  - P1: `classifyPost`. 200 or 201 with a DOI → created. 400, 401, 403, 404, 409, 415 and 422 → rejected. 408, 429, 5xx, a timeout, a network error, and a 2xx without a DOI → ambiguous;
  - B1: `readBackErrors`. Counts, `createdBy`, the hash line and `sourceUrl` are hard; `title` and the rest of `description` are warnings only.
- **`gbif/state.test.ts`**, using a temp `XDG_STATE_HOME`:
  - L1: a second `withLock` while the first holds it → throws naming the pid, and the first lock stays;
  - L2: the lock is gone after `fn` throws;
  - L3: `createIntent` when an intent exists → throws.

Build, docs, attribution and `assertDerivedFiles` get no unit tests. The E2E covers them, plus one Verification negative check: one changed byte in `data/species.json` makes `pnpm build --draft` fail naming `pnpm derive`.

### Decisions (for the lead to copy)

- **A1** Exports are written from `data/species.json` by DuckDB (`@duckdb/node-api` 1.5.6-r.2, exact pin) with extension autoload and autoinstall off. No postgres extension.
- **A2** `species.parquet` is nested, mirroring the JSON, with snappy compression, `ROW_GROUP_SIZE 100000` and `threads=1`. The CSV is the flat view: snake_case paths, `;`-joined lists, no `sources`.
- **A3** No `ranges.parquet`.
- **A4** `dist/v1/species.json` is a byte copy of `data/species.json`, and the `{id}` and `{slug}` files are identical copies.
- **A5** Dataset counts go in the same GBIF snapshot (`species[N].datasets`), paged until an empty page, with sum checks. `pnpm derive` turns them into `data/gbif-derived-dataset/contributions.json`.
- **A6** `pnpm gbif:register`:
  - freshness: a clean tree, and `assertDerivedFiles` (species, mismatches and contributions equal `deriveAll`, run in-process);
  - deposit: `checkDeposit`, meaning the tag on origin and the public raw file hashing to the contributions;
  - reconciliation: by the `contributions-sha256` line in the description;
  - mutual exclusion: an O_EXCL lock covering the whole run, and an O_EXCL intent holding the exact request. Both live in `~/.local/state/critwire/` (per OS user, this machine); register on the VPS only;
  - verify and adopt check against `registration.json` or the intent, never HEAD;
  - read-back: counts, `createdBy`, the hash line and `sourceUrl` are hard; title and description are warnings;
  - any 4xx except 408 and 429 is rejected;
  - no PUT path, and changed counts are refused.
- **A7** `sourceUrl` = `https://github.com/kc0588615/critwire/tree/<sha>/data`: public, immutable, and holding the lists, the counts and the queries. A pushed tag `gbif-dd-<hex12>` keeps `<sha>` reachable through the release rebase and any squash merge. These are the repo's first tags; they are never moved or deleted.
- **A8** Every build (strict and `--draft`) refuses committed derived files that differ from derive's output. A plain `pnpm build` also refuses a missing or stale DOI; `--draft` covers the time before H1 and local previews. Deploy runs plain `pnpm build`.
- **A9** Citations are each source's own wording, verbatim, kept in a committed registry. The COL citation is keyed by release, so the build fails on a new release until its citation is added. COL raw isn't re-ingested, because that's outside the brief's scope.
- **A10** The E2E Caddy copies the live block with `admin off`, on ports 3100 and 3101, adds an access log, and is drift-checked against the ops Caddyfile.
- **A11** The offline proof uses a throwaway `critwire_offline` db over the socket, never `critwire_dev`.
- **A12** `loadEnv()` loads `.env` only if it exists. The socket is reached with `postgres:///db` plus `PGHOST`.

### Risks

- **R1** The re-ingest can change statuses and countries, and a new GBIF match can change which species are settled. This is expected; the PR reports the delta.
- **R2** GBIF's index can change between a species' countries query and its dataset pages. The per-page `count` check makes the ingest throw when `count` moves; re-run it. A change that keeps `count` equal goes undetected (best-effort).
- **R3** The release rebase, or a squash merge, leaves `<sha>` on no branch. The `gbif-dd-*` tag keeps it reachable, and `checkDeposit` refuses to register or verify without it.
- **R4** Each monthly COL release fails the build until `COL_CITATIONS` has its citation. That's deliberate and loud. Later: allowlist `citation` in the COL ingest at its next refresh and drop the table.
- **R5** Every later GBIF re-ingest that changes any count makes the DOI stale. A plain build, and so `deploy`, then fails until a new DOI is registered (AGENTS.md, GBIF DOI refresh).
- **R6** The E2E needs the network the first time it installs httpfs. The build never does.
- **R7** Caddy serves `.parquet` with no `Content-Type`. That's harmless for DuckDB and `fetch`; an optional ops tweak later, not a handoff item.
- **R8** DataCite registers the DOI asynchronously, so `doi.org` can lag GBIF by minutes. The read-back uses GBIF's API, not doi.org.
- **R9** The lock and intent are per machine. Two machines posting within the same seconds could both mint a DOI. The listing catches any finished POST, AGENTS.md limits registration to the VPS, and a duplicate would show up as "more than 1 listed" on the next run.
- **R10** A killed run (SIGKILL, a reboot) leaves the lock behind. The next run refuses with the pid and the exact delete instruction; the intent still guards the POST.

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
- **A Postgres advisory lock for register:** it would add a db dependency to a script that has none, and each machine has its own db anyway.
- **A `flock(1)` wrapper:** it needs a shell line in `package.json` or a re-exec. An O_EXCL file with a clear stale-lock message is simpler for a script that runs a few times a year.
- **Breaking stale locks automatically:** two breakers can race. A manual delete is safe, and it's rare.
- **Freshness checks in strict builds only:** a draft built from stale data is just as wrong, and one rule is simpler.
- **An `--adopt <doi>` flag:** making title and description warnings removes the dead end without adding a path.
- **`sourceUrl` at a tag URL (`tree/gbif-dd-…`):** tags can be moved. The sha is immutable, and the tag only keeps it reachable.
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

Fable, 2026-10-21. Checked findings 1–10 against `scripts/load.ts`, `scripts/ingest/gbif.ts`, `scripts/derive.ts`, `scripts/derive/record.ts`, `scripts/json.ts`, `scripts/http.ts`, `db/schema.sql`, `tsconfig.json`, the cited doc lines and the ops Caddyfile `critwire.com` block. All ten are accurate (line numbers match; `loadEnvFile()` does throw ENOENT; `load.ts:39-43` holds no lock; `toOccurrences` throws at 300 for every facet; `Source.doi?` already exists so only `RecordInput.gbif.doi` is new). The design covers every checkable outcome and decision rule in the Brief: offline build, reuse of the load code with an advisory lock, exports from `species.json` with no DuckDB extensions, exhaustive `datasetKey` paging with sum checks, settled-only contributions deduped by taxon key, a separate register script with intent + listing reconciliation and read-back, DOI in `attribution.json`, docs and the countries source entry, Caddy-based serving tests with CORS/preflight/Range, the docs-example runner, and the doc updates. No derive rule changes. Schema untouched. Nothing weakens access control; credentials stay in `.env`/headers and only URLs are logged. Scope is proportionate; the register decision table is the brief's own requirement, not over-engineering.

VERDICT: APPROVE

MUST-FIX: none

MISSED: none

SHOULD-CONSIDER:
1. §3/§4 DRY: define the record column spec once (name → DuckDB type, nested) and derive both the `read_json(columns=…)` string and the expected-key-set validation from it, so a new field can't be added to one and silently dropped by the other.
2. §6 read-back: a mismatch on `title`/`description` after a successful create leaves a minted DOI with no scripted way out (every re-run adopts → read-back throws again). Treat `sourceUrl` + counts as hard failures (the brief's requirement) and title/description drift as a warning, or add an explicit `--adopt <doi>` path. Also classify all 4xx except 408/429 as "rejected" so a 409/422 doesn't park a dead intent.
3. §11 `AGENTS.md`: spell out the refresh workflow R5 implies (`ingest gbif` → `derive` → `git rm` the stale `registration.json` → commit/push → `gbif:register` → `derive` → commit) and that plain `pnpm build`/`deploy` fails on a stale DOI. Otherwise the next agent's first re-ingest breaks deploy with no documented recovery.
4. §9/§10: the drift test skips off this VPS, which contradicts "0 skipped in `results.json`" as a general rule; state the final-verification requirement as "0 skipped on this VPS", and note that the offline proof needs `--draft` until H1 is answered (Verification should give both forms).
5. §6 intent path wording: `~/.local/state/critwire/` is per OS user, not per GBIF user; fine in practice (one account here), just say so.

## Architecture review (Astra)

Astra (gpt-6-astra, medium), 2026-10-21.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. §6 read-back uses a `sourceUrl` generated from current HEAD. Committing `registration.json` changes HEAD, so subsequent verification rejects the existing registration. Persist the original request and verify/adopt against its original URL, including recovery after rebases.
2. §6 registration validates fresh contributions but not fresh `species.json`. It can mint a DOI pointing to stale country lists. Compare committed species and mismatches with `deriveAll` before registration; enforce derived-output freshness before strict builds too.
3. §6 intent handling lacks mutual exclusion. Concurrent registrations can both observe no intent and POST, minting duplicate DOIs. Require an exclusive lock covering reconciliation through result persistence, with atomic intent creation.

SHOULD-CONSIDER:
1. §5 equal totals detect some index changes, not all; describe facet consistency as best-effort.
2. §8 distinguish null countries caused by `no-open-records` from `identity-unsettled`.
3. Document the complete stale-DOI refresh workflow in AGENTS.md.

## Revision notes

Architect, 2026-10-21. A single round; all 3 Astra MUST-FIX items are resolved, and all 8 SHOULD-CONSIDER items are taken.
- **Astra MF1** (`sourceUrl` from HEAD):
  - the intent persists the exact request, `sourceUrl` included, and `registration.json` persists GBIF's read-back. Verify checks against `registration.json`, adopt against the intent and the listing, and HEAD is used only to build a new POST (§6);
  - also fixed: the release rebase would orphan `<sha>`, and R3's claim that "the PR ref keeps it" was wrong. A pushed tag `gbif-dd-<hex12>` now holds it, checked by `checkDeposit` (§6, A7, R3).
- **Astra MF2** (stale `species.json`): a shared `assertDerivedFiles` checks species, mismatches and contributions against `deriveAll`. It runs before any GBIF call in register and in every build, strict and draft. It replaces the build's separate format, sort, DOI and `retrieved` checks (§2, §3, §6, A6, A8, Finding 5).
- **Astra MF3** (mutual exclusion): an O_EXCL lock covers the whole run, from reconciliation to writing `registration.json`; the intent is created with `wx`; there's no automatic lock breaking. Cross-machine registration is limited to the VPS (§6, §11, R9, R10, L1–L3).
- **Fable SC1**: `build/columns.ts` `RECORD_COLUMNS` generates the `read_json` columns, the key check and the CSV select list (§2–§4).
- **Fable SC2**: read-back now has hard fields (counts, `createdBy`, the hash line, `sourceUrl`, the deposit) and warnings (title, description), and `registration.json` stores GBIF's values. Any 4xx except 408 and 429 is rejected (§6, P1, B1). `--adopt` was rejected: it isn't needed.
- **Fable SC3 / Astra SC3**: AGENTS.md gets a "GBIF DOI refresh" section, including the tag step and the rule never to delete tags (§11, R5).
- **Fable SC4**: §9 now says "0 skipped on this VPS"; §10 gives the `--draft` form of the offline proof for before H1.
- **Fable SC5**: §6 says the state is per OS user on this machine, not per GBIF user.
- **Astra SC1**: facet consistency is described as best-effort (§5, R2).
- **Astra SC2**: the docs tell `no-open-records` and `identity-unsettled` nulls apart (§8).

## Steps

Planner, 2026-10-21. Conventions:
- `W=/srv/critter-ai/worktrees/critwire-release`, `L=/srv/critter-ai/agent-state/missions/critwire-release`. Scratch and smoke scripts go in `$L/smoke/` and are never committed.
- One commit per step (code, plan check-off, one Log line), pushed. Where a check needs a clean tree (S5, S6), commit and push the code first, run the check, then check off in a second commit.
- **Green** = `pnpm typecheck && pnpm test && pnpm build`. From S7, `pnpm build` is the strict build, which needs S6's DOI. If S6 is blocked, use `pnpm build --draft` and say so in the Log.
- §12 tests are written first, named by id (`test("D1 …")`), and run red before the code; put the failing count in the Log. §12's register tests G1–G8 are named **RG1–RG8**, because `scripts/derive/gbif.test.ts` already has G1–G7.
- The S9 and S10 E2E specs are written first and seen failing, then the code.
- Network use: S2 (ingest), S5 and S6 (GBIF registry, GitHub), and the E2E (httpfs install on its first run). The build never.
- Run heavy jobs one at a time. Bash timeouts: ingest 1200000, register 600000, E2E and the offline proof 900000.
- V-ids are in Verification and F-ids in Failure modes.

- [x] S1 · Foundations: env, db, json and the derive pipeline (findings 1, 2, 5, 6; §2). No output change.
  - Before editing: `pnpm -s derive > $L/smoke/derive-baseline.txt`. This is S2's delta baseline.
  - New files:
    - `scripts/env.ts`: `loadEnv`, `requireEnv`;
    - `scripts/db.ts`: `speciesRows`, and `loadDatabase` with `pg_advisory_xact_lock(hashtext('critwire.load'))` first in the transaction;
    - `scripts/derive/pipeline.ts`: `readDeriveInputs`, `deriveAll` → `{records, entries}`, and `assertDerivedFiles` over `species.json` + `mismatches.json`.
  - Changed files:
    - `scripts/load.ts` becomes a thin CLI;
    - `scripts/json.ts` gets `formatJson`, which `writeJson` uses;
    - `scripts/derive.ts` becomes a CLI over the pipeline with the same stdout.
  - Checks:
    - green;
    - `pnpm -s derive | diff $L/smoke/derive-baseline.txt -`, then `git diff --exit-code data/`;
    - lock: `pnpm -s db:load > $L/smoke/l1 & a=$!; pnpm -s db:load > $L/smoke/l2 & b=$!; wait $a; wait $b; cat $L/smoke/l1 $L/smoke/l2` prints `loaded 76 species` twice;
    - no `.env`: with `DB=$(node -e 'process.loadEnvFile();process.stdout.write(process.env.DATABASE_URL)')`, `(cd "$(mktemp -d)" && DATABASE_URL="$DB" $W/node_modules/.bin/tsx $W/scripts/load.ts)` prints `loaded 76 species`. Without `DATABASE_URL` it exits non-zero and names it;
    - freshness smoke: `$L/smoke/fresh.mts` (`.mts`: outside the package, tsx defaults to CJS) runs `assertDerivedFiles(deriveAll(await readDeriveInputs()))`. It passes on HEAD. After adding one space in `data/review/mismatches.json` it throws naming `pnpm derive`. Then `git checkout -- data/review/mismatches.json`.
- [x] S2 · GBIF dataset counts: the ingest code and the live re-ingest (findings 3 and 4; §5 Ingest; A5).
  - `scripts/ingest/gbif.ts`:
    - `OCCURRENCE_FILTERS` is shared by `gbifOccurrenceUrl` (URLs stay byte-identical) and the new `gbifDatasetsUrl(taxonKey, offset)`;
    - page until `counts: []`, with the per-page and final checks of §5;
    - the 300-entry throw stays for the country and license facets only.
  - `scripts/raw.ts`: the `species[N].datasets` type.
  - Before the ingest, `$L/smoke/urls.ts` asserts that `gbifOccurrenceUrl(taxonKey)` equals every committed `occurrences.url`.
  - Run `pnpm ingest gbif 2>> $L/ingest-gbif.log`, then `pnpm -s derive | tee $L/derive-reingest.txt`.
  - Commit `data/raw/gbif/snapshot.json`, `data/species.json` and `data/review/mismatches.json`.
  - Write `$L/reingest-delta.md` for the PR:
    - statuses, codes, and entries by kind and severity, before (`derive-baseline.txt`: 72/1/3, 472 codes, 214 entries, 60 blocking) and after;
    - every species whose `range` changed (id, name, before → after), from `git show HEAD:data/species.json` (before the commit) against the new file.
  - If the ingest throws because `count` moved (R2), re-run it once. If it throws again, record that in the Log and stop the step. Ingest is all-or-nothing, so no partial snapshot is left.
  - Checks, with `S=data/raw/gbif/snapshot.json`:
    - green;
    - `jq -e '(.species | length) == 76 and all(.species[]; (.datasets == null) == (.occurrences == null))' $S`;
    - `jq -e 'all(.species[] | select(.datasets); ([.datasets.counts[]] | add // 0) == .occurrences.response.count and (.datasets.url | test("facet=datasetKey") and test("facetOffset=0")) and all(.datasets.counts | to_entries[]; (.key | test("^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$")) and .value >= 1 and .value == (.value | floor)))' $S`;
    - `jq -e '.species["Panthera onca"].datasets.counts | length >= 100' $S` (125 on 2026-10-21);
    - after `git add data/`, a second `pnpm -s derive` leaves `git diff --exit-code data/` clean;
    - `git diff --exit-code HEAD -- data/base.json data/review/country-overrides.json data/raw/wikidata data/raw/col`;
    - `grep -qiE 'iucn|additionalStatus' $S` finds nothing.
- [x] S3 · Contributions and the DOI slot in derive (§5 Derive, finding 7, §1).
  - Tests first, run red:
    - D1–D7 in `scripts/derive/contributions.test.ts`;
    - S3 in `scripts/derive/record.test.ts`;
    - R1–R3 in `scripts/gbif/derived-dataset.test.ts`.
  - `package.json` `test` becomes `tsx --test scripts/derive/*.test.ts scripts/gbif/*.test.ts`.
  - Then:
    - `scripts/derive/contributions.ts`;
    - `scripts/gbif/derived-dataset.ts`: types, file URLs, `currentDoi`;
    - `RecordInput.gbif.doi` in `scripts/derive/record.ts`;
    - `pipeline.ts` reads `registration.json` if present. The result gains `contributions` and `doi`, and `assertDerivedFiles` also covers `contributions.json`;
    - `scripts/derive.ts` writes `data/gbif-derived-dataset/contributions.json` (canonical) and prints `DOI current|missing|stale`. When the DOI isn't current, it also prints the tag `gbif-dd-<hex12>`.
  - Commit `contributions.json`.
  - Checks, with `C=data/gbif-derived-dataset/contributions.json`:
    - green, with the red counts in the Log;
    - `pnpm -s derive | tee $L/derive-S3.txt` prints `DOI missing` and `gbif-dd-$(sha256sum $C | cut -c1-12)`;
    - `git diff --exit-code data/species.json data/review/mismatches.json`: a null DOI adds no key;
    - `jq -e '.records == ([.datasets[]] | add) and .records == ([.taxa[].records] | add) and .taxa == (.taxa | sort_by(.taxonKey))' $C`;
    - every settled species is counted and no unsettled one: `test "$(jq '[.taxa[].speciesIds[]] | length' $C)" = "$(jq '[.[] | select(.range.status != "identity-unsettled")] | length' data/species.json)"`;
    - `jq -e --slurpfile g data/raw/gbif/snapshot.json '.retrieved == $g[0].retrieved' $C`;
    - a second `pnpm -s derive` leaves `git diff --exit-code data/` clean.
- [x] S4 · Register core: pure functions, tests first (§6 decision table, POST outcome, read-back and state; A6).
  - Tests first, run red:
    - RG1–RG8, P1 and B1 in `scripts/gbif/register.test.ts`;
    - L1–L3 in `scripts/gbif/state.test.ts`, using a temp `XDG_STATE_HOME`.
  - Then:
    - `scripts/gbif/register.ts`, all pure: `decide`, `classifyPost`, `requestBody`, `readBackErrors`;
    - `scripts/gbif/state.ts`: `stateDir`, `withLock`, `readIntent`, `createIntent` (`wx`), `deleteIntent`.
  - Nothing calls them yet.
  - Checks:
    - green, with the red counts in the Log;
    - the tests leave nothing in `${XDG_STATE_HOME:-$HOME/.local/state}/critwire/`.
- [ ] S5 · The `pnpm gbif:register` CLI, checked live without any POST (§6; A6, A7).
  - `scripts/gbif-register.ts` runs:
    1. preconditions 1–4;
    2. `withLock`;
    3. the listing (every page, with auth);
    4. `decide`;
    5. `checkDeposit`;
    6. `createIntent`;
    7. the single POST through its own `fetch` (60 s, no retry). It logs one stderr line in `getJson`'s format (`<time>, <status>, <ms>, 1, POST, <url>`);
    8. `classifyPost`;
    9. the read-back (every page);
    10. writing `registration.json`;
    11. deleting the intent.

    Reads go through `getJson` with the auth header, and only URLs are logged.
  - `package.json`: add the `gbif:register` script.
  - Guard first: `test -z "$(git ls-remote --tags origin 'gbif-dd-*')"`, and there is no `data/gbif-derived-dataset/registration.json`. With no tag on origin, `checkDeposit` throws before any POST.
  - Commit and push the code. Then run F5a–F5d, each `2>&1 | tee $L/register-F5<x>.log`, and check off with their results in the Log.
  - Checks:
    - green;
    - F5a–F5d pass;
    - no log contains `, POST, ` or the password (`grep -F`);
    - neither `gbif-register-intent.json` nor `gbif-register.lock` exists in `${XDG_STATE_HOME:-$HOME/.local/state}/critwire/`.
- [ ] S6 · Register the GBIF derived dataset (the one irreversible write), then derive the DOI in (§1 mission order, §6; A7).
  1. Preflight:
     - the tree is clean;
     - after `git fetch origin`, HEAD equals `origin/agent/critwire-release`;
     - green;
     - `pnpm -s derive` leaves `git diff --exit-code data/` clean and prints `DOI missing` and the tag `T`;
     - no intent or lock (S5's check).
  2. `git tag "$T" HEAD && git push origin "$T"`. `git ls-remote origin "refs/tags/$T"` shows HEAD. This tag is lightweight and is never moved or deleted.
  3. `pnpm gbif:register 2>&1 | tee $L/register.log`, once.
     - Exit 0: `data/gbif-derived-dataset/registration.json` exists. Go on.
     - "re-run to reconcile": re-run once. It lists first, then adopts.
     - Any refusal, a second ambiguous outcome, or "more than 1 listed":
       - never POST by hand, and never delete the intent or the lock unless the condition in the message is verified;
       - add a handoff item and record it under Decisions;
       - check S6 off as blocked, and add `S6b · finish the GBIF registration (H<n>)` just before S13;
       - S7–S12 then build with `--draft`.
  4. `pnpm -s derive | tee $L/derive-doi.txt` prints `DOI current`. Only the countries entries change:
     - `diff <(jq 'walk(if type == "object" and .source == "GBIF.org occurrence search" then del(.doi) else . end)' data/species.json) <(git show HEAD:data/species.json | jq .)`;
     - `jq -e --slurpfile r data/gbif-derived-dataset/registration.json '[.[].sources[] | select(.source == "GBIF.org occurrence search")] | length > 0 and all(.doi == $r[0].doi)' data/species.json`;
     - `git diff --exit-code data/review/mismatches.json data/gbif-derived-dataset/contributions.json`.
  5. Commit `registration.json` and `species.json`, and push.
  6. Idempotence: `pnpm gbif:register 2>&1 | tee $L/register-verify.log` takes the verify path: exit 0, no `, POST, ` line, a clean tree, and no intent (F6).
  7. Evidence, from public reads, in `$L/gbif-dd/`: `curl -sf https://api.gbif.org/v1/derivedDataset/<doi>`, and every page of `…/<doi>/datasets`. `doi.org` may lag by minutes (R8); just note it.
  8. Under Decisions, record:
     - the DOI;
     - the `sourceUrl` (the GitHub permalink at the tagged commit) and why (A7);
     - the tag.

     Then check off, with the DOI in the Log.
- [ ] S7 · `pnpm build`: inputs, the DOI gate, the db load, and the JSON, Parquet and CSV files (§3, §4; A1–A4, A8, A12).
  - `pnpm add -E @duckdb/node-api@1.5.6-r.2`, and commit the lockfile. `allowBuilds` doesn't change.
  - New files:
    - `scripts/build/columns.ts`: `RECORD_COLUMNS`, plus the `read_json` columns, the key sets and the CSV select list, all generated from it;
    - `scripts/build/inputs.ts`: `readBuildInputs` (§3.2);
    - `scripts/build/tables.ts`: `writeTables`, with the DuckDB options of §4.
  - `scripts/build.ts`, per §3:
    - an unknown argument throws `unknown argument: <arg>`;
    - `loadEnv`, then the inputs, then `loadDatabase`;
    - `rm -rf dist`, then the JSON copies and the tables;
    - it prints every file with its size.
  - `dist/index.html` stays the placeholder until S10.
  - Checks:
    - green. `pnpm ls @duckdb/node-api` shows 1.5.6-r.2;
    - `pnpm -s build | tee $L/smoke/build-S7.txt`, then from V6: `cmp dist/v1/species.json data/species.json`, the file count, the `{id}`/`{slug}` `cmp` loop, and no `ranges.parquet`;
    - `$L/smoke/read.ts` reads the local files with DuckDB:
      - Parquet: its rows equal the records, and the per-status counts and `sum(len(sources))` match `data/species.json`;
      - CSV: the header is §4's 21 columns, in order, and the rows equal the records;
    - `psql -d critwire_dev -XAtc 'select count(*) from species'` equals the records;
    - V5's determinism lines;
    - F1, F2 and F3 (V7);
    - F4: V8, with `rsync -a --exclude node_modules --exclude dist --exclude .env --exclude .git $W/ "$O/cw/"` in place of the GitHub clone. Its hash list equals the worktree build's, and `test ! -e "$O/home/.duckdb"`.
- [ ] S8 · E2E harness: Playwright and a local Caddy, with the `files`, `serving` and `duckdb` (HTTP) specs (§9; A10).
  - `pnpm add -DE @playwright/test@1.58.2`, plus the `e2e` script (`playwright test`) and the lockfile.
  - `playwright.config.ts`:
    - `workers: 1`, headless Chromium, `trace: 'on'`, `screenshot: 'on'`;
    - the html and json reporters and `outputDir` all under `E2E_ARTIFACTS`;
    - `webServer` runs Caddy, with `reuseExistingServer: false`.
  - `e2e/Caddyfile`:
    - `admin off`, `auto_https off`, `persist_config off`;
    - `:3100` is the live block, with root `{$CRITWIRE_DIST}` and a JSON access log;
    - `:3101` serves `e2e/fixtures/`.
  - `e2e/fixtures/index.html`.
  - `e2e/helpers.ts`:
    - the artifact dir and the data readers;
    - the first check, which fails with `run pnpm build`;
    - DuckDB, with httpfs in `node_modules/.cache/critwire-duckdb`.
  - Specs:
    - `e2e/files.spec.ts`;
    - `e2e/serving.spec.ts`: Range, preflight, cross-origin with and without preflight, the access log's OPTIONS 204, and the drift test against the ops Caddyfile (read-only);
    - `e2e/duckdb.spec.ts`, its HTTP Parquet part: the query, plus a 206 for `species.parquet` in the access log.
  - `tsconfig.json` includes `e2e` and `playwright.config.ts`. `.gitignore` adds `e2e-artifacts/`, `test-results/` and `playwright-report/`.
  - Checks:
    - before: `ss -ltn | grep -E ':310[01] '` is empty;
    - `pnpm exec playwright --version` is 1.58.2, and no browser download happens (it uses Chromium 1208);
    - green;
    - `pnpm build && E2E_ARTIFACTS=$L/e2e pnpm e2e` passes, along with V9's `results.json`, report and trace lines (`docs-375.png` comes in S10). The access log holds an OPTIONS 204 with `Origin: http://127.0.0.1:3101` and a `species.parquet` 206;
    - F8;
    - after: `pgrep -f e2e/Caddyfile` finds nothing, and `curl -s -o /dev/null -w '%{http_code}' https://critwire.com/` still gives 200 (production untouched).
- [ ] S9 · `attribution.json` and the source registry (§7; A9).
  - E2E first, run red: `e2e/attribution.spec.ts` (§9), and add `attribution.json` to the `files` spec's file list.
  - Save the requested citations in `$L/citations/`:
    - `https://api.checklistbank.org/dataset/316595` (`citation`);
    - `https://api.gbif.org/v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c` (`citation.text`).

    Quote them verbatim, and compare them with "Verified facts".
  - Then:
    - `scripts/build/sources.ts`:
      - `SOURCES`;
      - `LICENSE_URLS`, covering every license string in the data: today the 10 photo licenses plus the source licenses;
      - `COL_CITATIONS[316595]`;
    - `scripts/build/attribution.ts`: `buildAttribution`, pure;
    - `scripts/build.ts` writes `dist/v1/attribution.json`.
  - Checks:
    - green;
    - the E2E passes with 0 skipped;
    - `jq -e --slurpfile r data/gbif-derived-dataset/registration.json '.gbifDerivedDataset.doi == $r[0].doi and (.gbifDerivedDataset.datasets | length) == ($r[0].relatedDatasets | length)' dist/v1/attribution.json`;
    - V5's determinism lines.
- [ ] S10 · Docs page (§8).
  - E2E first, run red:
    - `e2e/docs.spec.ts` (§9 `docs`):
      - every section;
      - a 375×812 full-page screenshot, also written to `$E2E_ARTIFACTS/docs-375.png`;
      - `scrollWidth ≤ 375`;
      - same-origin links return 200, and every anchor target exists;
      - external links are https, on the host allowlist;
    - the docs-examples tests in `e2e/duckdb.spec.ts`:
      - the origin swapped to the local server;
      - shell examples run with `bash -euo pipefail` in a temp dir;
      - SQL examples return at least one row;
      - the curl examples cover every `/v1` file.
  - Then `site/index.html`:
    - prose written fresh for grades 6–12 and app makers;
    - `#about`, `#files`, `#fields`, `#licenses`, `#credits`, `#cite`;
    - inline CSS, no JS, no external assets;
    - every field of §8, including the two kinds of null countries.
  - `scripts/build/docs.ts`: `renderDocs`. `scripts/build.ts` renders `dist/index.html`.
  - Checks:
    - green;
    - the E2E passes with 0 skipped;
    - open `$L/e2e/docs-375.png` and check that it reads well on a phone; if it doesn't, fix it and re-run;
    - V5's determinism lines.
- [ ] S11 · Repo docs (§11; finding 8).
  - `AGENTS.md`:
    - the Stack DuckDB line;
    - Commands: `pnpm build [--draft]`, `pnpm e2e`, `pnpm gbif:register`;
    - Data: the two `data/gbif-derived-dataset/` files and their writers, and that the build refuses stale derived files;
    - a "GBIF DOI refresh" section: §11's 7 steps, the tag rule, the VPS only, interrupted runs;
    - Release: drop the cutover sentence, and add that a mission may merge and deploy at its end (owner, 2026-10-21; `~/AGENTS.md`).
  - `README.md`: the `/v1/` files, the docs at `https://critwire.com/` and the dev commands; drop "Not live yet".
  - `plans/001-mvp.md`:
    - `:49`, `:57`, `:61`, `:65` and `:75` per §11;
    - `:78`, step 3, gets the DOI. The PR number comes in S12.
  - `DATA-LICENSE.md:7` per §11.
  - Checks:
    - green;
    - `grep -nE 'cutover|critwire_live|extension writes Parquet|Not live yet|will cite' AGENTS.md README.md DATA-LICENSE.md plans/001-mvp.md` finds nothing;
    - `grep -q 'GBIF DOI refresh' AGENTS.md`.
- [ ] S12 · Rebase, offline proof, E2E, PR.
  - Run `git fetch origin`. If `git merge-base --is-ancestor origin/main HEAD` fails:
    1. `git rebase origin/main`;
    2. green; `pnpm -s derive` leaves `data/` unchanged and prints `DOI current`;
    3. `git push --force-with-lease origin agent/critwire-release`.

    If the rebase makes the DOI stale (main changed a derive input), stop. Record it under Decisions, and add AGENTS.md's "GBIF DOI refresh" as new steps before S13.
  - Run the Verification block's prelude, then V5, V8 (the GitHub clone at the pushed HEAD) and V9.
  - Write `$L/pr-body.md` (not in the repo):
    1. what and why, in 2–3 lines. The mission merges and deploys after the final review (H2);
    2. the files with their sizes, from `pnpm -s build`; the `species/` files as a count and a total;
    3. the GBIF derived dataset:
       - the DOI and its citation;
       - the contributing datasets and records;
       - the `sourceUrl`, the `gbif-dd-*` tag, and why that `sourceUrl` (A7);
    4. the re-ingest delta (`$L/reingest-delta.md`);
    5. the E2E: passed/total, 0 skipped, the artifact `$L/e2e/` (report, traces, screenshots, `caddy-access.log`) and the reproduce command;
    6. determinism, the offline proof, and the review verdicts: Fable APPROVE; Astra APPROVE_WITH_CHANGES, whose 3 MUST-FIX were resolved in the revision.
  - `gh pr create --base main --head agent/critwire-release --title "step 3: build and release /v1 (Parquet, CSV, JSON, attribution, docs, GBIF DOI)" --body-file $L/pr-body.md`. If a PR already exists, use `gh pr edit agent/critwire-release --body-file $L/pr-body.md`.
  - `plans/001-mvp.md` step 3: "implementation verified; owner deploy pending (PR #<n>)", with the DOI. Commit and push.
  - Checks: V10.
- [ ] S13 · Full Verification.
  - Run the Verification block (V0–V10) as one session.
  - If anything fails, add a fix step before this one, do it, and re-run.
  - Log: the transcript path, the unit and E2E counts, determinism, and the offline proof.
  - If a number changed, run `gh pr edit` with an updated `pr-body.md`.
  - X1–X6 are the release unit's, after `deploy critwire`.

Notes for the implementing sessions:
- After S6, change no derive input (`data/base.json`, `data/raw/`, derive rules) except through "GBIF DOI refresh". Any change to the counts makes the DOI stale and needs a new one (R5).
- Live numbers (125 jaguar datasets, 72/1/3) drift. Never tune a rule to a number; record the drift in the Log.
- If a smoke run exposes a bug from an earlier step, fix it in the current step, with a failing test first where §12 covers it, and say so in the Log.

## Verification

Run this from the worktree as one bash session; it writes its own transcript. Lint: the repo has none (Baseline), so `pnpm typecheck` is the static check.

The final Verification is strict: V2–V4 and V6 need the DOI. The `--draft` forms noted under V5 and V8 are only for checks before a DOI exists (S6 blocked).

```bash
set -euo pipefail
W=/srv/critter-ai/worktrees/critwire-release; cd "$W"
L=/srv/critter-ai/agent-state/missions/critwire-release; V=$L/verify; E=$L/e2e; mkdir -p "$V"
exec > >(tee "$V/verify-$(date -u +%Y%m%dT%H%MZ).log") 2>&1
fail() { echo "FAIL: $*"; exit 1; }
neg() { local want=$1 out; shift; if out=$("$@" 2>&1); then fail "expected failure: $*"; fi; grep -qF -- "$want" <<<"$out" || fail "wrong error from $*: $out"; }
hashes() { (cd "$1" && find . -type f -print0 | sort -z | xargs -0 sha256sum); }
envget() { node -e "process.loadEnvFile(); process.stdout.write(process.env.$1 ?? '')"; }
DB=$(envget DATABASE_URL); PW=$(envget GBIF_PASSWORD); test -n "$PW"
R=data/gbif-derived-dataset/registration.json; C=data/gbif-derived-dataset/contributions.json
N=$(jq length data/species.json); ST=${XDG_STATE_HOME:-$HOME/.local/state}/critwire

# V0 preflight: clean and pushed, scratch db only, E2E ports free, no register leftovers
test -z "$(git status --porcelain)"
git fetch -q origin; test "$(git rev-parse HEAD)" = "$(git rev-parse origin/agent/critwire-release)"
[[ "$DB" =~ /critwire_dev(\?|$) ]] || fail "DATABASE_URL is not critwire_dev"
ss -ltn | grep -qE ':310[01] ' && fail "E2E port busy"
test ! -e "$ST/gbif-register.lock"; test ! -e "$ST/gbif-register-intent.json"

# V1 install, typecheck, unit tests (every §12 id present)
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test 2>&1 | tee "$V/test.txt"
for id in W{1..11} C{1..9} G{1..7} K{1..11} S{1..3} D{1..7} R{1..3} RG{1..8} P1 B1 L{1..3}; do grep -qw "$id" "$V/test.txt" || fail "missing test $id"; done

# V2 derive: equals the committed files, twice byte-identical, pure (rebuilds its outputs from inputs alone), DOI current
pnpm -s derive | tee "$V/derive.txt"; git diff --exit-code data/
grep -q 'DOI current' "$V/derive.txt"
pnpm -s derive >/dev/null; git diff --exit-code data/
rm data/species.json data/review/mismatches.json "$C"; pnpm -s derive >/dev/null; git diff --exit-code data/

# V3 data: DOI on every countries entry and nowhere else; registration = contributions; the tag holds the deposit; owner files untouched; no IUCN in raw
jq -e --slurpfile r "$R" '[.[].sources[] | select(.doi == $r[0].doi)] as $d | ($d | length) > 0 and all($d[]; .source == "GBIF.org occurrence search") and all(.[].sources[] | select(.source == "GBIF.org occurrence search"); .doi == $r[0].doi)' data/species.json
jq -e --slurpfile c "$C" '.relatedDatasets == $c[0].datasets and .records == $c[0].records' "$R"
jq -e '.records == ([.datasets[]] | add) and .records == ([.taxa[].records] | add)' "$C"
tag=gbif-dd-$(jq -r '.contributionsSha256[:12]' "$R"); dep=$(jq -r '.sourceUrl | capture("/tree/(?<s>[0-9a-f]{40})/data$").s' "$R")
test "$(git ls-remote origin "refs/tags/$tag" | cut -f1)" = "$dep"
git diff --exit-code origin/main -- data/base.json data/review/country-overrides.json
grep -qiE 'iucn|additionalStatus' data/raw/gbif/snapshot.json && fail "IUCN data in raw"

# V4 the GBIF registration still verifies (network reads only: no POST, no write)
pnpm gbif:register 2>&1 | tee "$V/register-verify.txt"
test -z "$(git status --porcelain)"
grep -qF ', POST, ' "$V/register-verify.txt" && fail "POST in verify run"
grep -qF -- "$PW" "$V/register-verify.txt" && fail "password in log"

# V5 two strict builds: identical dist (file list + sha256); db loaded. Draft form: pnpm -s build --draft
pnpm -s build | tee "$V/build.txt"; hashes dist > "$V/dist-1.sha"
pnpm -s build >/dev/null; hashes dist > "$V/dist-2.sha"; cmp "$V/dist-1.sha" "$V/dist-2.sha"
test "$(psql -d critwire_dev -XAtc 'select count(*) from species')" = "$N"
test "$(pnpm -s db:load)" = "loaded $N species"

# V6 dist contents
cmp dist/v1/species.json data/species.json
for f in index.html v1/species.parquet v1/species.csv v1/attribution.json; do test -s "dist/$f"; done
test ! -e dist/v1/ranges.parquet
test "$(find dist/v1/species -type f | wc -l)" = $((2 * N))
jq -r '.[] | "\(.id) \(.slug)"' data/species.json | while read -r id slug; do cmp "dist/v1/species/$id.json" "dist/v1/species/$slug.json"; done
jq -e --slurpfile r "$R" '.gbifDerivedDataset.doi == $r[0].doi' dist/v1/attribution.json
grep -qF "$(jq -r .doi "$R")" dist/index.html
grep -rqE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}' dist && fail "clock time in dist"

# V7 F1-F3 in a throwaway copy (never the worktree; it has no .env, so it also proves loadEnv skips a missing .env)
T=$(mktemp -d); rsync -a --exclude node_modules --exclude dist --exclude .env --exclude .git ./ "$T/cw/"
(cd "$T/cw" && pnpm install --frozen-lockfile --offline >/dev/null)
b() { env -C "$T/cw" DATABASE_URL="$DB" pnpm -s build "$@"; }
neg 'unknown argument' b --nope                                                    # F1
sed -i '0,/"slug": "/s//"slug":  "/' "$T/cw/data/species.json"
neg 'is stale: run pnpm derive' b --draft; test ! -e "$T/cw/dist"                  # F2
cp data/species.json "$T/cw/data/species.json"
rm "$T/cw/$R"; (cd "$T/cw" && pnpm -s derive | grep -q 'DOI missing')
neg 'no current GBIF derived-dataset DOI' b                                        # F3 strict refuses
b --draft >/dev/null; jq -e '.gbifDerivedDataset == null' "$T/cw/dist/v1/attribution.json"   # F3 draft builds
rm -rf "$T"

# V8 offline proof (F4): fresh clone at the pushed HEAD, pnpm install --frozen-lockfile, empty HOME (no DuckDB
# extension cache), no network, Postgres over the socket into a throwaway db (A11; never critwire_dev).
# Draft form: "pnpm build --draft" here, compared with a worktree "pnpm build --draft".
O=$(mktemp -d); git clone -q https://github.com/kc0588615/critwire "$O/cw"; git -C "$O/cw" checkout -q "$(git rev-parse HEAD)"
(cd "$O/cw" && pnpm install --frozen-lockfile >/dev/null); mkdir "$O/home"
off() { sudo unshare -n setpriv --reuid=critter-ai --regid=critter-ai --init-groups \
  env -i HOME="$O/home" PATH="$PATH" COREPACK_HOME="$HOME/.cache/node/corepack" \
  DATABASE_URL=postgres:///critwire_offline PGHOST=/var/run/postgresql bash -c "$1"; }
off 'getent hosts api.gbif.org' && fail "network reachable inside unshare"
dropdb --if-exists critwire_offline; createdb critwire_offline
off "cd $O/cw && pnpm build" | tee "$V/offline-build.txt"
test "$(psql -d critwire_offline -XAtc 'select count(*) from species')" = "$N"
dropdb critwire_offline
test ! -e "$O/home/.duckdb"
hashes "$O/cw/dist" > "$V/dist-offline.sha"; cmp "$V/dist-1.sha" "$V/dist-offline.sha"
rm -rf "$O"

# V9 E2E: Playwright 1.58.2, headless Chromium 1208, local Caddy :3100 (live block copy) + :3101 (second origin), admin off
rm -rf "$E"; pnpm -s build >/dev/null
E2E_ARTIFACTS="$E" pnpm e2e
jq -e '.stats.expected > 0 and .stats.unexpected == 0 and .stats.flaky == 0 and .stats.skipped == 0' "$E/results.json"   # 0 skipped on this VPS
test -s "$E/playwright-report/index.html"; test -s "$E/docs-375.png"; test -s "$E/caddy-access.log"
test "$(find "$E/test-results" -name trace.zip | wc -l)" -ge 1
pgrep -f 'e2e/Caddyfile' && fail "E2E Caddy still running"

# V10 no secret in git or artifacts; delivery
test "$(git log -p origin/main..HEAD | grep -cF -- "$PW")" = 0
test "$(grep -rlF -- "$PW" "$L" | wc -l)" = 0
test -z "$(git status --porcelain)"
git merge-base --is-ancestor origin/main HEAD
gh pr view agent/critwire-release --json state,baseRefName -q '.state + " " + .baseRefName' | grep -qx 'OPEN main'
```

**E2E artifact** (DoD), in `/srv/critter-ai/agent-state/missions/critwire-release/e2e/`:
- `playwright-report/`: open it with `pnpm exec playwright show-report $L/e2e/playwright-report`;
- `test-results/`: a `trace.zip` and screenshots per test; open a trace with `pnpm exec playwright show-trace <trace.zip>`;
- `results.json`;
- `docs-375.png`;
- `caddy-access.log`.

Reproduce it from the worktree with `pnpm build && E2E_ARTIFACTS=/srv/critter-ai/agent-state/missions/critwire-release/e2e pnpm e2e`.

**Other artifacts** in `$L`:
- `verify/`: `verify-<UTC>.log` (the full transcript), `test.txt`, `derive.txt`, `build.txt` (file sizes for the PR), the `dist-*.sha` hash lists, `offline-build.txt` and `register-verify.txt`;
- `register*.log` and `gbif-dd/`;
- `ingest-gbif.log`, `derive-baseline.txt`, `derive-reingest.txt` and `reingest-delta.md`;
- `citations/` and `pr-body.md`.

**Release smoke, X1–X6.** The release unit runs these after `deploy critwire`. They are read-only requests to production. `dist/` must be the Verification build of the merged tree: the release rebases first, so the trees are equal.

```bash
set -euo pipefail; cd /srv/critter-ai/worktrees/critwire-release
L=/srv/critter-ai/agent-state/missions/critwire-release; X=$L/release-smoke; mkdir -p "$X"
exec > >(tee "$X/smoke-$(date -u +%Y%m%dT%H%MZ).log") 2>&1
B=https://critwire.com; P=$B/v1/species.parquet; O='Origin: https://example.org'
# X1 docs page: 200, same bytes as the build
curl -sf "$B/" -o "$X/index.html"; cmp "$X/index.html" dist/index.html
# X2 every /v1 file: 200, same bytes as the build
for f in species.json species.csv species.parquet attribution.json; do curl -sf "$B/v1/$f" -o "$X/$f"; cmp "$X/$f" "dist/v1/$f"; done
for f in dist/v1/species/*.json; do curl -sf "$B/v1/species/${f##*/}" | cmp - "$f"; done
# X3 CORS on a cross-origin GET
curl -sfI -H "$O" "$P" > "$X/get.h"
grep -qi '^access-control-allow-origin: \*' "$X/get.h"
grep -qi '^access-control-expose-headers: content-range, content-length, accept-ranges' "$X/get.h"
# X4 preflight: 204 with the CORS headers
curl -s -D "$X/options.h" -o /dev/null -X OPTIONS -H "$O" -H 'Access-Control-Request-Method: GET' -H 'Access-Control-Request-Headers: range' "$P"
grep -qE '^HTTP/[0-9.]+ 204' "$X/options.h"; grep -qi '^access-control-allow-headers: range' "$X/options.h"
# X5 Range: 206, exact Content-Range and bytes; a suffix range ends in PAR1
size=$(stat -c %s dist/v1/species.parquet)
curl -s -D "$X/range.h" -H "$O" -H 'Range: bytes=100-199' "$P" -o "$X/range.bin"
grep -qE '^HTTP/[0-9.]+ 206' "$X/range.h"; grep -qi "^content-range: bytes 100-199/$size" "$X/range.h"
cmp "$X/range.bin" <(tail -c +101 dist/v1/species.parquet | head -c 100)
test "$(curl -s -H 'Range: bytes=-4' "$P")" = PAR1
# X6 DuckDB reads the live Parquet over HTTPS (the docs' quickstart)
node --input-type=module -e '
import { DuckDBInstance } from "@duckdb/node-api";
const db = await DuckDBInstance.create(":memory:", { extension_directory: "node_modules/.cache/critwire-duckdb", autoinstall_known_extensions: "true", autoload_known_extensions: "true" });
const r = await (await db.connect()).runAndReadAll("SELECT count(*)::INTEGER FROM read_parquet(\x27https://critwire.com/v1/species.parquet\x27)");
console.log(r.getRows()[0][0]);' > "$X/duckdb.txt"
test "$(cat "$X/duckdb.txt")" = "$(jq length data/species.json)"
```

## Failure modes

**Unit-tested** (§12). Each is written first, seen red in the step named, and has its id in the test title.
- S3:
  - D1–D7, `derive/contributions.test.ts`;
  - S3, `derive/record.test.ts`;
  - R1–R3, `gbif/derived-dataset.test.ts`.
- S4, `gbif/register.test.ts`:
  - RG1–RG8 are §12's G1–G8, one per decision-table row, in precedence order:
    - RG1: verify;
    - RG2: verify deletes a leftover intent with the same hash;
    - RG3: a registration with other counts → refuse;
    - RG4: an intent for another hash → refuse, ahead of any listing;
    - RG5: 1 listed → adopt;
    - RG6: more than 1 listed → refuse;
    - RG7: 0 listed with an intent → refuse;
    - RG8: 0 listed, no intent → post.
  - P1 and B1 are in the same file.
- S4, L1–L3: `gbif/state.test.ts`.

**Checked by a negative run.** The messages are fixed, so V7 can match them.
- **F1 · Unknown build argument.** The build throws `unknown argument: <arg>` and writes nothing. S7, V7.
- **F2 · A derived file differs from derive's output.** Every build, strict or `--draft`, throws `data/<file> is stale: run pnpm derive` before it writes anything. S7, V7.
- **F3 · No current DOI.** `pnpm build` throws `no current GBIF derived-dataset DOI …`, and `--draft` builds with `gbifDerivedDataset: null`. S7, V7.
- **F4 · The build reaches the network** (a DuckDB extension autoload, a fetch). The offline build fails, or `$HOME/.duckdb` appears. S7, V8.
- **F5 · gbif:register refuses before any POST, and leaves no intent and no lock.** S5:
  - **a:** a dirty tree (`touch zz-dirty`, then remove it). It names the uncommitted changes, with no network line before;
  - **b:** in a throwaway copy made as in V7 (`rsync` without `.env` and `.git`, then `pnpm install --frozen-lockfile --offline`), with `env -u GBIF_PASSWORD GBIF_USERNAME=x pnpm -s gbif:register`. It names `GBIF_PASSWORD` and H1, with no network line;
  - **c:** a clean, pushed tree with no tag on origin. It lists (auth, 200), then throws with the exact `git tag gbif-dd-<hex12> <sha> && git push origin gbif-dd-<hex12>`. No `, POST, ` line;
  - **d:** a hand-written lock (`{"pid": 999999, "startedAt": "x"}`) in the state dir. It names the pid and the lock path, and the lock stays. Delete it afterwards.
- **F6 · A second register run after success.** It takes the verify path: exit 0, no POST, a clean tree. S6, V4.
- **F7 · A dataset paging anomaly:**
  - a page `count` differs from the countries query's;
  - a duplicate or non-UUID key;
  - a count ≤ 0;
  - a sum ≠ `count`.

  Ingest throws and the old snapshot stays. This isn't unit-tested: the sum and duplicate checks run on every live taxon, and any missing, extra or overlapping page breaks one of them. S2.
- **F8 · The E2E on a missing or stale `dist/`.** It fails first with `run pnpm build`. Check: `rm -rf dist && E2E_ARTIFACTS=$(mktemp -d) pnpm e2e`, then `pnpm build`. S8.
- **F9 · Touching the live `critwire` db or the production Caddy.**
  - V0's `DATABASE_URL` guard;
  - the E2E Caddy runs with `admin off` on :3100/:3101 only;
  - the offline proof uses only `critwire_offline` (A11).

## Decisions

- Architecture decisions A1–A12: see Architecture → "Decisions (for the lead to copy)" (single copy kept there, pending reviews).
- Release (H2, owner 2026-10-21): overrides the brief's "no merge, no deploy". After Verification passes and Astra code-review fixes are done: rebase on `origin/main`, re-run checks, `gh pr merge --merge`, `deploy critwire`, smoke-test https://critwire.com (`/`, every `/v1` file, CORS, 206 Range). On failure: no merge (or leave site as `deploy` left it), handoff item, `MISSION_BLOCKED`. Record merge commit + smoke results in Summary. Step 3 in `plans/001-mvp.md` may then say done.
- Steps (planner, 2026-10-21): register early (S6), before build work, so S7+ build strict with the real DOI. Cost: a later derive-input change (fix or rebase) makes the DOI stale and needs a second DOI; accepted. If S6 blocks: handoff item + `S6b` before S13, S7–S12 use `--draft`.
- S11 also updates the project `AGENTS.md` release line (missions may merge + deploy at the end), per H2.

## Log

- 2026-10-21 05:13 UTC: Baseline recorded; typecheck pass, 42/42 unit, derive deterministic, db:load 76, build placeholder ok; no lint/E2E yet.
- 2026-10-21 05:35 UTC: Architecture written by `architect` (findings, target design, A1–A12, risks R1–R8); DuckDB node-api 1.5.6-r.2 smoke-tested on arm64 (deterministic Parquet). Docs-only change; no checks needed.
- 2026-10-21 05:39 UTC: H2 (merge+deploy at end) picked up into Decisions. Fable review: APPROVE, 0 MUST-FIX, 5 SHOULD-CONSIDER. Docs-only; no checks needed.
- 2026-10-21 05:40 UTC: Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (§6 sourceUrl vs HEAD, stale species.json before register, register lock), 3 SHOULD-CONSIDER. Docs-only; no checks needed.
- 2026-10-21 05:47 UTC: Revision by `architect`: 3 Astra MUST-FIX resolved (§6 persisted request + `gbif-dd-*` tag, `assertDerivedFiles`, O_EXCL lock), 8 SHOULD-CONSIDER taken. Docs-only; no checks needed.
- 2026-10-21 05:59 UTC: Steps S1–S13, Verification V0–V10 + release smoke X1–X6, Failure modes (§12 ids, F1–F9) written by `planner`. Register tests renamed RG1–RG8 (G1–G7 taken). Docs-only; no checks needed.
- 2026-10-21 06:20 UTC: S1 done: `env.ts`, `db.ts` (advisory lock), `derive/pipeline.ts` (`readDeriveInputs`/`deriveAll`/`derivedFiles`/`assertDerivedFiles`), `formatJson`; `load.ts`, `derive.ts` thin CLIs. Green (typecheck, 42/42, build); derive stdout + `data/` unchanged; 2 parallel loads ok, load waits 4 s on a held lock; db rows sha256 identical to pre-refactor; load without `.env` ok, without `DATABASE_URL` exits 1 naming it; freshness smoke passes, fails `data/review/mismatches.json is stale: run pnpm derive` on one added space. Note: `speciesRows` passes `sources` as the array (postgres.js serializes by the jsonb column type; a JSON string got double-encoded).
- 2026-10-21 06:10 UTC: S2 done: `OCCURRENCE_FILTERS` + `gbifDatasetsUrl`, datasetKey facet paged to an empty page with per-page count/UUID/dup/positive checks and final sum; `species[N].datasets` in raw. 76 committed countries URLs byte-identical before ingest. Live `ingest gbif` ok first try (151 dataset pages; jaguar 125 datasets, max 125, none needed a 3rd page). All S2 jq checks pass; owner files + wikidata/col raw untouched; no IUCN. Delta (`$L/reingest-delta.md`): statuses 72/1/3, 472 codes, 214 entries (60 blocking) unchanged, no `range` change; only GBIF `retrieved` → 2026-10-21 and record counts in 40 entries (species 57, 58, 64, 66). Derive twice stable; green (typecheck, 42/42, build).
- 2026-10-21 06:14 UTC: S3 done: `derive/contributions.ts` (`gbifContributions`), `gbif/derived-dataset.ts` (types, file URLs, `currentDoi`, `contributionsSha256`, `depositTag`), `RecordInput.gbif.doi` on the countries entry only; pipeline is two-pass (rules, then contributions → DOI → records), reads `registration.json` if present, `assertDerivedFiles` covers `contributions.json` (canonical). Red first: 3 failing (S3; contributions + derived-dataset files unloadable, 10 new tests); then green (typecheck, 53/53, build). `contributions.json`: 73 taxa (no shared key), 454 datasets, 396,627 records; derive prints `DOI missing` + `gbif-dd-b58ac1e3105b` (= sha256sum); species/mismatches unchanged; all S3 jq checks pass; derive twice stable; freshness smoke names a stale `contributions.json`. Throwaway-registration smoke: current → DOI on exactly the 72 countries entries; one count changed → `stale`; removed → `missing`; `data/` restored.
- 2026-10-21 06:35 UTC: S4 done: `gbif/register.ts` (pure: `requestBody`, `decide` (table rows + `list` when not yet listed; filters the listing by the `contributions-sha256:` line itself), `classifyPost`, `readBackErrors`, `toRegistration`, `hashLine`), `gbif/state.ts` (`stateDir`, `lockFile`, `intentFile`, `withLock` O_EXCL, `readIntent` (unreadable → throws), `createIntent` `wx`, `deleteIntent`); `sameCounts` shared by `currentDoi`, `decide`, read-back. Response shapes checked on GBIF's public API (record: doi/title/description/sourceUrl/citation/createdBy; usages: datasetKey/numberRecords; user listing paged, ours empty). Red first: 2 files unloadable (13 new tests: RG1–RG8, P1, B1, L1–L3); then green (typecheck, 66/66, build). Real state dir untouched.

## Summary
