---
mission: critwire-learn-l1-data
project: critwire
branch: agent/critwire-learn-l1-data
status: active
started: 2026-10-28 06:48 UTC
---

# Mission: critwire Learn L1, the lab data: countries file, GBIF sample, shapes, loader (mission L1)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l1-data.md, then run:
     mission start critwire <that file>        (base: main with plans/004-learn-curriculum.md merged)
     Start only after the owner has reviewed plans/004-learn-curriculum.md and answered its §10 choices
     (without an answer, build its recommendation).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§4, §7, §9).
     Chain: L1 (this) → L2 critwire-learn-l2-site → L3 critwire-learn-l3-gis → L4 critwire-learn-l4-stats-etl
     → L5 critwire-learn-l5-powerbi-capstone; each starts after the one before is merged and live.
     Estimate: about 32–38 sessions (6 pipeline stages, about 24 steps, code review, verification, release). -->

### Goal

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

### Why

critwire Learn is now a practitioner curriculum (004): database architecture, GIS in SQL, spatial statistics, ETL and Power BI, taught on open data, starting with the owner's own job skills. Every lab in L2–L5 reads these files, so they come first, are credited properly, and are tested the way a learner will use them (`psql -f`, not an agent's shortcut).

### Scope

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

### Definition of done

- `pnpm typecheck`, `pnpm test` (ported failure cases first: the spike's CK, SC, LD and the countries matcher's) and plain `pnpm build` pass on the final commit; `pnpm derive` prints `DOI current` for both targets.
- **`pnpm e2e` passes in full**, nothing skipped, including `learn-data` with every case 004 §7.7 lists and the countries cases.
- **Existing files unchanged:** at Baseline, save `sha256sum` of every file in `dist/` from a fresh `origin/main` build. The final build matches it for every `species.*` and `species/*` file; `attribution.json` differs only by the Natural Earth entry (checked with `jq`); `index.html` may change.
- **The sample is the spike's**: from the spike's download (Notes), the published `occurrences` holds the same 40,395 records with the same values as the spike's `site/learn/data/occurrences.parquet` (a test compares them; a difference is a bug in the port, not a new number). Every load check 0; the download's echo of both `checklistKey`s checked; datasets and publishers all titled. Only if the reuse is impossible, a new download, and then 004 §4.2's numbers are re-measured on it.
- **The loader**: `pnpm learn:check` loads it twice in `critwire_dev` with the same rows; a forced failure (004 §4.3) leaves the previous `learn_curriculum` intact; `learn_spatial`'s canary is the same before and after.
- **Sizes**: `dist/learn/data/` and the committed lab data each under 50,000,000 bytes; the build refuses either above (a test proves it).
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l1-data/e2e/`: the Playwright HTML report, a trace per test, `results.json`, screenshots of `/learn/data/` at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: `/v1/countries.*` return 200 with 250 rows; every `/learn/data/` file returns 200 and hashes as `manifest.json` says; every existing `/v1` file hashes as at Baseline (except `attribution.json`, as above); the live loader, downloaded, loads with `psql -X -v ON_ERROR_STOP=1 -d critwire_dev -f` and matches `pg-smoke`'s row counts.
- The plan's Summary gives: what shipped, both DOIs, the measured numbers, every deviation from 004 (and the 004 commit that records it), the release record, and what L2 needs to know.

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Simplest approach that works**, and critwire stays static files: no server process, the build stays offline.
- **Data rules from `AGENTS.md` hold:** snapshots committed, derive offline and pure, build from `data/`, never hand-edit derived files, every third-party field and file credited.
- **Licenses decide what's published.** If unclear, don't publish. The effective-license rule (004 §4.2) stands unless the owner's §10 answer changes it.
- **Records, never range**, in every page and string.
- The owner's answers to 004 §10 override this brief where they differ; without an answer, use 004's recommendation. Choose freely between equal options and record the call; anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.

### Notes

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

### Addendum (control room, 2026-10-28): the owner's answers and the database review

This addendum is part of the brief. Where it differs from the text above, it wins.

**The owner's answers to 004 §10:**
- **Every item takes 004's recommendation except item 4's Caddy headers, which are a NO.** No precompression, no `immutable` or `no-cache` change, and no Caddy or `e2e/Caddyfile` change. Learn ships without them.
- **Item 7: all five missions are queued** and run back to back, L1 → L5. Each starts only after the previous one is merged and live.
- **Item 8:** the Windows checks stay handoff items that block nothing.

**The Codex database and backend review** (GPT-6-Astra high, 2026-10-28; verdict SOUND_WITH_CHANGES) is at `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md`. Read it at Baseline.
- The items assigned to this mission (below) are in scope and part of the Definition of done, even where the Scope section above excludes the file they touch.
- The architect folds them into the plan. Record each under Decisions as **done** (with the commit) or **rejected** (with evidence-backed reasons). Don't drop one silently.
- The review's line references are to `main` at `5ac58df`.

**Database roles:**
- The live-build database `critwire` will belong to role `critwire_live` (the control room is setting it up), used only by `/srv/apps/critwire/.env` through `deploy`.
- The dev role `critwire` (the repo `.env`) can't connect to `critwire` and has no CREATEDB.
- Never put `critwire_live` credentials in a worktree or a test.
- Both `.env` files carry `CRITWIRE_DB_TARGET` (L1's item 1).
- If this paragraph isn't true when the mission starts (`psql -d postgres -Atc "select rolname from pg_roles where rolname='critwire_live'"` is empty), carry on: the code guard in review MUST-FIX 1 is still required.

**Diagrams.** The `diagram-design` Claude Code plugin (2.6.136) is installed for every session here.
- **ERDs:** the Mermaid sources stay the source of truth, rendered by the build (`pnpm erd`) and drift-checked against the loaded database. Don't replace that pipeline.
- **Every other teaching diagram** is drawn with diagram-design and committed as an SVG under `site/learn/`: pipelines, ETL flows, how a spatial join or zonal statistic works, grains and conformed dimensions, critwire's own architecture. Use system fonts (no Google Fonts; the build is offline), give light and dark variants, and add alt text that states the diagram's point.
- Draw one where a diagram teaches better than prose, not on every page.
- **The plugin's first-run gate asks the user a question, and nobody is there.** Answer it yourself: keep the default tokens, set `Font source: system`, save profile `critwire` (home library), and commit `.diagram-design` with `profile: critwire`. The first mission to draw a diagram does this; later ones reuse it.
- Export with the plugin's `scripts/export_svg.py --system-fonts` (python3, no dependencies) and check with `self_check.py --offline`. **SVG only**: PNG export needs Python Playwright, which isn't installed.
- "Alt text" means the page's `<img alt>` plus the SVG's `<title>`. The E2E checks that each referenced SVG returns 200 and has both.

**Order and budget:**
- The Goal's deliverables are never deferred. This mission's review items are built with the code they touch.
- Count sessions with `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/<slug>.log`.
- Past 48 sessions, add no more review steps: finish verification and the release, and hand each unfinished assigned item to the next mission as a handoff item.

#### Review items assigned to L1

The review's numbering: MF = MUST-FIX, SC = SHOULD-CHANGE.

1. **MF1: guard the destination before any destructive load.**
   - `scripts/db.ts` refuses to drop or rebuild unless `current_database()` equals `CRITWIRE_DB_TARGET`. If the variable is missing, it fails with a message naming it.
   - Both `.env` files already carry `CRITWIRE_DB_TARGET`: `critwire_dev` in `/srv/critter-ai/critwire/.env` (copied into this worktree at start) and `critwire` in `/srv/apps/critwire/.env`, so `deploy` keeps working.
   - At Baseline run `grep -c '^CRITWIRE_DB_TARGET=' /srv/apps/critwire/.env .env`, never printing the files. If either count is 0, add a handoff item, and build MF1 so that a missing variable refuses only a *drop* and logs a warning, until the control room sets it.
   - **Guard scope:** the guard lives only in `scripts/db.ts`'s `loadDatabase` (the `DATABASE_URL` path: `pnpm build`, `pnpm db:load`). `learn:check`, E2E and L4's Python stage never read `CRITWIRE_DB_TARGET`. `learn:check` keeps 004 §7.6's refusal of `critwire` by name and by `current_database()`, because the owner's WSL has no such variable.
   - Document the variable in `AGENTS.md`.
   - Schema-qualify the mirror's objects.
   - Make `scripts/env.ts`'s environment-over-`.env` override explicit and logged (database name only, never the URL).
   - Tests: a wrong or missing target refuses before any DDL; the matching target builds.
   - Don't change `~/.local/bin/deploy`; if it needs a change, add a handoff item for the control room.
2. **MF2: one runtime record validator,** shared by the build and `db:load`. It checks:
   - non-empty strings
   - slug grammar (`^[a-z0-9]+(-[a-z0-9]+)*$`) and that every output path stays inside its folder
   - safe integers within each export's range
   - null and list combinations
   - `replacedBy` targets that exist, are unique, don't point to themselves and form no cycle
   - Wikidata's integer conversion range-checked (`scripts/derive/wikidata.ts:61–73`)
   - ids and slugs verified against the previously published registry (the live `/v1/species.json` at Baseline, saved in the mission folder): an existing id never changes slug or disappears without `replacedBy`

   Add a failing case for each. The `/v1` representation is unchanged.
3. **MF3: freshness covers extraction rules.** GBIF and COL snapshots are checked against the current request builders: the checklist, filters and dataset-facet predicates, as Wikidata's whole-query check does, or with a recorded extraction fingerprint. Changing a rule demands a re-ingest. Write the failing case first. Keep the original URLs as provenance. Elapsed time alone isn't staleness.
4. **MF4: the loader refuses inbound dependencies.** Before `DROP SCHEMA learn_curriculum CASCADE`, it refuses (with a clear message) when an object outside the schema depends on one inside it. Test this with an outside view and an outside foreign key. 004 §3.2 recommends a disposable lab database, and says that schema separation isn't dependency isolation. The transactional rebuild stays.
5. **SC1: state the projection's assumptions and enforce them before publishing.**
   - The external-id UNIQUE constraints, `taxa.name` (one rank and parent per name), and `range_status` against the junction rows are checked across the whole projection, and a violation fails the build.
   - Handle legitimate shared crosswalk ids explicitly (`scripts/derive/contributions.ts`' D3 case) instead of forcing UNIQUE. Where an external id can be shared, teach it as optional and non-unique.
   - Retired records are never counted as active.
6. **SC2 (L1 part):** Learn's `manifest.json` records the sha256 of the `/v1/species` and `/v1/countries` inputs it was tested with. The machine-readable `/v1` contract file is L3's.
7. **SC3: integration failure tests,** run only against an explicitly isolated scratch target:
   - an insert failing after the DROP
   - two concurrent loads
   - a lock timeout (add lock and statement timeouts)
   - changed extraction predicates
   - truncated JSON
   - facet pages moving
   - `Retry-After`, honoured beyond 60 s or stopped with a clear error
   - a stale or missing DOI
   - an interrupted multi-file derive
8. **SC4: two registration targets.** Each target keeps its own deposit identity, intent and lock. On read-back, check `originalDownloadDOI` as well as the counts. Test that the targets stay separate, and test an ambiguous successful POST. Document that `currentDoi()` compares counts, not record identity.
9. **SC5 (L1 part): domain checks in the lab.**
   - `est_area_km2 >= 0` in the lab (L5 does the star)
   - finite, non-negative coordinate uncertainty
   - documented year bounds and how unknowns are written
   - load-time checks of the country-code mapping, taxonomy ranks and parents, and `range_status` against the junction rows
10. **SC7 (L1 part): isolation.**
    - `learn:check` holds one lock for its whole run.
    - Labs run as one persistent role, **`critwire_lab`** (not `learn_…`).
      - `learn:check --setup` creates it once, as `critter-ai`, with CREATE on `critwire_dev`, CREATEROLE, `createrole_self_grant = 'set, inherit'`, and no CREATE on `public`. The superuser creates the extensions.
      - `learn:check` connects as `critwire_lab` through `LEARN_PG_URL` (its password goes in the repo `.env`, like `DATABASE_URL`), never through `SET ROLE`, because a block's `RESET ROLE` would return to the superuser.
      - The leak query ignores `critwire_lab`.
      - Update 004 §0 and §3.2 in the same commit.
    - `pg-role-smoke` gets its own BEGIN/ROLLBACK.
    - Cleanup is checked on error and interrupted paths, not only on success.
11. **004 corrections:**
    - §4.2: "a refresh changes only what GBIF changed" is wrong (a newly eligible low-hash row can displace one). Order the cap by hash, then id.
    - §0 and d2: the build writes exports from JSON, not from normalized tables.

**Order and budget (L1):**
- The Goal's deliverables are never deferred.
- MF1 and MF4 are built with the code they guard; the other review items follow the Goal.
- Count sessions with `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l1-data.log`. Past 48, add no more review steps: finish verification and the release, and hand each unfinished item to L3 as a handoff item.
- Estimate with these items: about 44–52 sessions.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-28, HEAD `5c6c04e` (= `origin/main` `5ac58df` + this plan only). Saved in `/srv/critter-ai/agent-state/missions/critwire-learn-l1-data/baseline/`.
- `pnpm install --frozen-lockfile`: up to date. No migrations (build rebuilds `db/schema.sql` tables). No lint script in `package.json`; `pnpm typecheck` is the static check.
- `pnpm typecheck`: pass. `pnpm test`: 66/66 pass.
- `pnpm derive`: no diff in `data/`; `DOI current 10.15468/dd.ky9cyt` (taxa 73, datasets 454, records 396627).
- Plain `pnpm build`: pass, 157 files in `dist/`. `dist.sha256` = sha256 of each; identical to live `/srv/apps/critwire/.live` (`live.sha256`).
- `pnpm e2e`: 20/20 pass (artifacts `baseline/e2e/`).
- Registry baseline (MF2): live `https://critwire.com/v1/species.json` saved as `baseline/live-species.json` (sha256 `f58d0ae8…6028c`, = build).
- MF1: `grep -c '^CRITWIRE_DB_TARGET='` = 1 in `/srv/apps/critwire/.env` and in worktree `.env` (`critwire_dev`). No handoff item needed; build the strict guard.
- Roles: `critwire_live` exists and owns db `critwire`; `critwire_dev` owned by `critwire`. `critwire_lab` doesn't exist yet (SC7: `learn:check --setup`).
- `critwire_dev`: PostGIS 3.4.2 + `postgis_raster` 3.4.2. Schemas `learn_spatial` (A2's, never touch) and `learn_curriculum` (spike leftover, 42 relations) exist.
- Spike download: `0041824-260928105237408` zip sha256 `729e9e28…806b` matches its `download.json`; GBIF API: `SUCCEEDED`, DOI `10.15468/dl.fbpk9w`, 394,532 records, `eraseAfter 2027-04-23` → reuse it.
- Tooling: `python3` 3.12.3; **`uv` is not installed** (spike used `spike/.venv`). The architect decides: install `uv` (record in `ops/docs/vps.md`) or a plain `python3 -m venv` with pinned `requirements.txt`.
- Codex DB/backend review (`/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md`, 175 lines, SOUND_WITH_CHANGES) read; its L1 items are in the brief's addendum for the architect.

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-28 06:49 UTC Baseline: typecheck ok, test 66/66, build ok (dist = live), e2e 20/20; baseline hashes + live species.json saved.

## Summary
