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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

Architect, 2026-10-28, on `5c6c04e` (= `5ac58df` + this plan). Read: the brief and addendum; 004 §0, §1, §3, §4, §6.1–6.2, §7, §9, §10, §A.1, §B; 002 §6 and §8; the Codex review; the spike (`etl/*.py`, `scripts/{loader,credits,pg,canary}.ts`, `lab-ddl.sql`, `lab-keys.sql`, its tests) and A1/A2's `countries-draft.ts`, `e1-data.ts`, `grown-data.ts`; every file under `scripts/`, `site/`, `e2e/`, `db/`. Checked live: `critwire_dev`'s ACLs and schema owners, `pg_hba.conf`, `ensurepip`, the GBIF zip's layout and header. `SP` = the spike folder.

**In short.** The build stays one offline Node `pnpm build`. Ingests split by what each needs: TypeScript for HTTP, rules and provenance (Natural Earth attributes, the GBIF sample); one Python step for geometry only (`pnpm ingest shapes`, GEOS/GDAL), fed the TypeScript matcher's choices so 002 §6's rule exists once. Derive gains the countries file, the sample's checks and counts, and an issued-ids record. The build gains `/v1/countries.*` and `writeLearnData` (sample files, shape copies, the psql loader, the manifest, the index page, the cap). `gbif:register` gets a target descriptor instead of a second CLI. `learn:check` runs the loader as a dedicated role, `critwire_lab`.

### Findings (ranked by impact)

**F1. Nothing checks the destination before the destructive mirror load (MF1).** `scripts/db.ts:37–45` runs `db/schema.sql` (`drop table if exists species`, unqualified: `db/schema.sql:2,4`) on whatever `DATABASE_URL` resolves to; `scripts/env.ts:5–6` lets an inherited variable beat `.env` silently. Breaks fail fast. A stray URL drops another database's table, and the log never says which database was used. Fix: D11.

**F2. The spike's loader isn't safe to publish as is (MF4, SC5).** It drops with `CASCADE` (`SP/scripts/loader.ts:191`) and checks only *outbound* dependencies (`:238–250`), so a learner's view or foreign key in another schema over `learn_curriculum` vanishes on a successful reload, which contradicts 004 §3.2's advice to "keep your own work in another schema" (004:505). A direct-edge inbound query wouldn't close it either: a view depends through its `_RETURN` rule, a default through `pg_attrdef`, a trigger and a policy through their own catalogs, and `pg_identify_object` gives all four a NULL schema (checked on PG16, revision). The lab DDL has no domain checks (`SP/scripts/lab-ddl.sql:81,84,129`: uncertainty, year, `est_area_km2`). Fix: D9.6.

**F3. The lab runs as superuser, and the live catalog doesn't allow anything else yet (SC7).** The spike connects as `critter-ai` over the socket (`SP/scripts/pg.ts:12–14`), which masked Codex MF5's privilege bug. Live: `critwire_dev`'s ACL is `{critwire=CTc/critwire}` (PUBLIC has no CONNECT), and `learn_curriculum` (the spike's leftover, 42 relations) and `learn_spatial` are owned by `critter-ai`. A new role can't connect, can't drop the old schema, and can't read A2's canary. 004:8050 still says `learn:check` uses the superuser. Fix: D10.

**F4. Registration is hard-wired to one target (SC4).** Title, deposit path, tag prefix, lock and intent names are constants (`scripts/gbif-register.ts:17–23,115–126`; `scripts/gbif/register.ts:24–41`; `scripts/gbif/state.ts:10–12`; `scripts/gbif/derived-dataset.ts:5–6,50`); the request and read-back types lack `originalDownloadDOI` (`register.ts:6–11,141–158`). A second CLI would copy the decision table and the deposit check (DRY). `currentDoi` compares counts only (`derived-dataset.ts:32–37`): right for citation, wrong if read as record identity. Fix: D8.

**F5. Snapshot freshness ignores extraction rules (MF3).** `scripts/derive/pipeline.ts:44–48,56–57` compares name sets; `:68–70` one URL parameter. Changing a filter, the checklist or facet paging in `scripts/ingest/gbif.ts:22–41`, or COL's match URL, leaves the old snapshot "current". Wikidata already does it right (`scripts/derive/wikidata.ts:28–31`). Fix: D13 (GBIF, COL); D7 (the sample).

**F6. Record values aren't validated at runtime (MF2).** `scripts/species.ts:81–92` checks base ids only; `scripts/build/inputs.ts:17–23` checks key sets, all-digit slugs and photo completeness; `scripts/build.ts:33–34` puts the slug into a path unchecked; `replacedBy` is checked nowhere; `scripts/derive/wikidata.ts:58–59,76` turns P3151/P685/P846 into `Number` with no range check, so a big iNaturalist or NCBI id fails late in DuckDB's INTEGER writer. Nothing ties an id to its published slug. Fix: D12.

**F7. Silent HTTP and parse behaviour (SC3).** `scripts/http.ts:123,130–134` cuts any Retry-After to 60 s and retries early (ignores the provider, burns attempts); `scripts/json.ts:5–7` reports a truncated file as "Unexpected end of JSON input" without its path. Fix: D14.

**F8. The build isn't shaped for a second product (SRP, DRY).** `scripts/build.ts:18–46` writes every file inline; the DOI gate covers one target (`scripts/build/inputs.ts:25–27`); the offline DuckDB setup sits inside `writeTables` (`scripts/build/tables.ts:13–17`); the slot engine is private to `renderDocs` (`scripts/build/docs.ts:36–44`); the CSS is inline in `site/index.html:8–39`. Adding countries, lab data, a loader and a second page inline would make `build.ts` a god script and copy the DuckDB, slot and CSS code. Fix: D9.1–9.2.

**F9. Attribution can't credit a non-species source.** `scripts/build/attribution.ts:51–53` throws on a registered source no record cites, and entries come only from `sources[]`. 002 §6 gives Natural Earth `"release": "v5.1.2"` while `Source.release` is COL's object (`scripts/species.ts:26`): two types under one key. Fix: D4.

**F10. No Python toolchain.** `uv` isn't installed, and `python3 -m venv` is broken (`ModuleNotFoundError: No module named 'ensurepip'`), so even a plain venv needs root. Fix: D2.

**F11. Spike details that are wrong if ported verbatim.** The cap orders by md5 only (`SP/etl/sample_rules.py:72`); the country shapes were copied from A2's DuckDB-spatial output, not built from Natural Earth (`SP/etl/shapes.py:23,28–30`); RESOLVE's tolerance is a probe loop (`:31–32,109–121`); the ETL hard-codes a worktree path (`SP/etl/gbif_download.py:34`) and types the CSV inside PostGIS (`gbif_load.py`), which an ingest mustn't need. Fix: D5, D6.

**F12. No test entry point for new folders or databases.** `package.json:19` globs only `scripts/derive` and `scripts/gbif`; SC3's database cases have no target. Fix: D15.

**F13. 004 statements the code disproves** (fixed in 004 in the same commit as the code, D16): §4.2's "a refresh changes only what GBIF changed" (004:844); d2's "build loads data/ into tables, then writes nested" and "rebuilt from the normalized tables" (004:2350–2351): exports come from `data/species.json` (`scripts/build.ts:30,36`); §3.2 (004:505); §7.6 (004:8050); `pg-role-smoke` without BEGIN/ROLLBACK (004:274–286); §4.1 calls the admin-0 shapes zstd, built by the ingest (they were A2's snappy copy).

**Fine, kept and reused:** derive purity and atomic writes (`json.ts:23–28`); `gbifContributions` and its D3 case; `decide`/`classifyPost`/intent (reused per target, unchanged); `getJson` pacing (apart from Retry-After); `RECORD_COLUMNS`; the advisory-lock transaction in `db.ts`; the E2E harness and Caddy copy (no change: owner's §10 item 4 answer).

### Target design

#### D1. Boundaries and order
- Unchanged: static files only; snapshots in `data/`; ingest → derive → build; the build is offline and needs no Python, psql, `unzip` or network (so `deploy` is unchanged). `learn:check` is a dev command, never part of build or deploy.
- Order (addendum): MF1 first, because every later build loads a database. MF4, SC1, SC2, SC4, SC5, SC7 and the sample's MF3 are built inside the code they belong to (loader, manifest, register, learn:check, sample derive): building them later would mean rework. MF2, MF3 for GBIF/COL, and the SC3 cases on existing code (Retry-After, truncated JSON, facet pages, interrupted derive) come after the Goal's deliverables. They are the first to go to L3 as handoff items if the session count passes 48.

#### D2. Toolchain (decision 1)
- **`uv` 0.13.5**, the version 004 §3.3 tells learners to install, goes to `/usr/local/bin/{uv,uvx}` as root, from `uv-aarch64-unknown-linux-gnu.tar.gz` (sha256 `4bb69cf95ed13f23713bb7bc09f241896ea0c75b7c557e615a20604b82f9c403`, the file the spike verified). Record it in `/srv/critter-ai/ops/docs/vps.md`.
- **`.venv-learn/`** (gitignored) on system CPython 3.12.3, no managed Python (`UV_PYTHON_DOWNLOADS=never`). `pnpm learn:venv` runs `uv venv --python /usr/bin/python3.12 .venv-learn` and `uv pip sync --no-build` of `site/learn/labs/requirements.txt` into it.
- **`site/learn/labs/requirements.in` and `requirements.txt`**: 004 §3.3's 44 pins verbatim (= `SP/requirements.*`; aarch64 wheels proven). L1 uses pyarrow, shapely, pyogrio and numpy; L4 publishes the same file and runs its Python stage in the same venv.

#### D3. Files (decision 3)
| Path | Writer | Content |
|---|---|---|
| `data/raw/naturalearth/snapshot.json` | `pnpm ingest naturalearth` | 1:10m admin-0 `countries` and `map_units` attributes, cut to the matcher's fields (002 §6 step 1), plus `release`, `commit`, `fields` (the cut list: the extraction fingerprint), `retrieved`; keys sorted |
| `data/countries.json` | `pnpm derive` | `{source, rows}`; `rows` = the 250 `/v1/countries` rows |
| `data/issued-ids.json` | `pnpm derive` | `[{id, slug}]` of every id ever derived, sorted, append-only (MF2) |
| `data/raw/gbif-sample/download.json` | `pnpm ingest gbif-sample` | key, doi, license, created, eraseAfter, totalRecords, numberDatasets, `request` (GBIF's echo minus `creator`), downloadLink, `zip {bytes, sha256}`, `datasetCounts`, `sampleRules` (fingerprint, D6) |
| `data/raw/gbif-sample/datasets.json` | `pnpm ingest gbif-sample` | `retrieved`, `downloadKey`, every dataset of the download: key, title, publisher, publishingOrganizationKey, doi, license, licenseUrl, records, recordLicenses, `deleted` when set |
| `data/raw/gbif-sample/sample.csv` | `pnpm ingest gbif-sample` | `id,species_id,dataset_key,license,basis_of_record,longitude,latitude,coordinate_uncertainty_m,country_code_gbif,year,month`; sorted by id; numbers as GBIF delivered them; empty = NULL |
| `data/gbif-learn-sample/contributions.json` | `pnpm derive` | `downloadKey`, `originalDownloadDoi`, `records`, `datasets {key: n}`, `sample {file, sha256}` |
| `data/gbif-learn-sample/registration.json` | `pnpm gbif:register --target learn-sample` | GBIF's read-back, with `originalDownloadDOI` |
| `data/learn/{country_shapes,admin1_shapes,ecoregions}.parquet`, `biomes.csv`, `shapes.json` | `pnpm ingest shapes` | GeoParquet 1.0.0 (WKB `geom`, bbox, CRS84, zstd, sorted by key); `shapes.json`: source URLs, bytes and sha256, tolerance, tool versions (Python, shapely, GEOS, pyogrio, GDAL, pyarrow), per output rows, bytes, sha256 and invalid-geometry counts, the 1:50m matcher report |
| `data/learn/{habitat_classes,country_habitats}.parquet` | copied once from `SP/data/learn/` (= A2's `grown-data.ts` output) | stand-ins until L3's `pnpm ingest habitat` replaces them |
| `data/learn/habitat.json` | written once with the copy (L3's `ingest habitat` takes it over) | like `shapes.json`: per file bytes, sha256, rows; source (Jung et al. habitat map v004, cited as A2's `grown-data.ts` cites it), license, `standIn: true`, copied-from path and sha256 |

`dist/learn/data/`: `index.html`, `manifest.json`, `occurrences.parquet`, `occurrences.csv`, `datasets.csv`, the four shape files, the two habitat files, `postgis/learn_curriculum.sql`. Committed lab data, for the cap: `data/raw/gbif-sample/`, `data/learn/`, `data/gbif-learn-sample/`.

New code: `scripts/ingest/{naturalearth,shapes,gbif-sample}.ts`, `scripts/ingest/shapes.py`; `scripts/learn/{sample-rules,download,pg}.ts`; `scripts/derive/{naturalearth,sample}.ts`; `scripts/gbif/targets.ts`; `scripts/build/{duckdb,html,countries}.ts`, `scripts/build/learn/{data,projection,checks,loader,credits,page}.ts`; `scripts/learn-check.ts`; `db/learn/{lab-ddl,lab-keys,canary}.sql`; `site/style.css`, `site/learn/data/index.html`, `site/learn/sql/{setup,pg-role-smoke}.sql`. `scripts/ingest.ts` dispatches `<source> → run()`; the three existing sources keep their snapshot behaviour through a wrapper.

#### D4. Countries (002 §6, kept by 004 §1)
- **Ingest** `naturalearth`: the two pinned 1:10m files (sha256 `239eec57…f255`, `57da82be…8862`) via a new `getBytes` in `http.ts` (same pacing and retries; refuses a sha256 mismatch: CD11). Attributes only.
- **Derive** `scripts/derive/naturalearth.ts`: the pure matcher, ported from `countries-draft.ts` with CD1–CD10 first. Signature `matchCountries(layers, {speciesCodes})` → rows plus a report (per code: layer, field, feature index; folded, from map units, gaps). Refuses a species code with no row, a stale snapshot (release, commit or `fields` differ from the constants), and every matching-rule failure.
- **Build** `scripts/build/countries.ts`: `/v1/countries.json` = `formatJson(rows)`; Parquet and CSV through DuckDB from that file, every column VARCHAR (`NA` stays text), sorted by `code`, fixed writer options.
- **Attribution:** `"Natural Earth"` is registered once in `scripts/build/sources.ts` (url, the long citation; its `citation` ignores the `Source` argument, as Wikidata's does). Lab credits reuse that entry. `buildAttribution(species, registration, countries)` merges one entry: fields `countries.{name,continent,region,subregion}`, records 250, license `Public domain`, licenseUrl null, `retrieved`, `release: {version: "v5.1.2", issued: "2022-05-13"}` (a subset of the keys COL's `release` has, so one JSON key keeps one shape; this refines 002 §6), notes. The "registered but uncited" check counts `countries.json` as citing it.
- **Typing (revision):** Natural Earth is never a record `Source`, so `Source.release` and `colCitation` don't change. The subset is typed on the attribution entry only: `Attribution["sources"][n].release` becomes `{ version: string; issued: string; key?: number; alias?: string }`, to which COL's release is assignable.
- **Docs:** the three files, the field table, the `NA` note and "names follow Natural Earth"; "Used for 250 countries"; the "every file holds the same N records" line reworded; a link to `/learn/data/` (L2 changes it to `/learn/`).

#### D5. Shapes (004 §4.1)
- `pnpm ingest shapes` (TypeScript) fetches the pinned 1:50m admin-0 `countries` and `map_units` (`3e458fc0…fdeb`, `b8d421ac…4db0`), 1:50m admin-1 (`69a0e06e…26b9`) and `Ecoregions2017.zip` (`be36d620…2a60`) into a fresh temp folder (`downloadFile`, streamed and hashed). It runs `matchCountries` on the 1:50m attributes with gaps allowed (BV, GI, UM expected) and writes `select.json`: per code, the layer and feature index, plus that feature's `ADM0_A3`/`GU_A3` as a cross-check.
- It then runs `.venv-learn/bin/python -I scripts/ingest/shapes.py --in <tmp> --select <file> --out <tmp-out>`. The Python script has no network and applies no country rule. It writes `country_shapes` (selected features, checked against the cross-check property), `admin1_shapes` (`adm1_code` key, `iso_a2` → `country_code`, `name`; `iso_3166_2` dropped), and `ecoregions` + `biomes.csv` (read in place via `/vsizip/`; `ECO_ID` 0 → NULL biome and realm, any other `N/A` fails; `simplify(preserve_topology=True)` per feature at a fixed 0.05°, no probe loop). All are GeoParquet via pyarrow with fixed options, so a re-run is byte-identical. It prints a JSON report.
- TypeScript renames the outputs into `data/learn/` and writes `shapes.json`. The build refuses any of the six `data/learn/` data files whose sha256 differs from its provenance file, `shapes.json` or `habitat.json` (it catches hand edits and a half-finished rename), and a file that neither lists.
- **Port check:** `country_shapes` equals the spike's/A2's per code (WKB equal, 247 rows); `admin1_shapes` and `ecoregions` equal the spike's files by sha256 (same pins, same code), or the difference is explained under Decisions.

#### D6. The GBIF sample ingest, in TypeScript (decision 2)
- **Pure modules.** `scripts/learn/download.ts`: `downloadRequest(gbifKeys)`, which builds 004 §4.2's predicate from constants exported by `scripts/ingest/gbif.ts` (`BACKBONE_KEY`, `BASIS_OF_RECORD`: one definition of the countries rule), plus `sameRequest(stored, built)` over `{format, checklistKey, predicate}`, the echo check included. Its doc comment says the rest of GBIF's echo (`sendNotification`, `type`, `interpretedExtensions`, `verbatimExtensions`) is left out on purpose: full equality would refuse the spike's own download (DL1). `scripts/learn/sample-rules.ts`, ported from `sample_rules.py`: `speciesFor`, `effectiveLicense` (CC0 1.0 < CC BY 4.0 < CC BY-NC 4.0), `capSample(rows, 2000)` by ascending md5 of the decimal gbifID **then gbifID**, `countryKey(code, countryCodes)` (used by derive, D7), and `SAMPLE_RULES`, the fingerprint written into `download.json`.
- **Which download.** `pnpm ingest gbif-sample [--download <key> | --new]`. The species (and their `ids.gbif`) come from `deriveCore(await readDeriveInputs())`, computed **in memory**. The ingest never calls `assertDerivedFiles` and never reads `species.json`: `deriveCore` refuses only stale *raw* inputs (the wikidata, col, gbif and naturalearth snapshots), whose ingests read no derived file. So the refresh order is a line with no cycle (D7). The first run is `--download 0041824-260928105237408`; later runs reuse `download.json`'s key. Reuse requires GBIF status SUCCEEDED, `sameRequest`, and an unchanged zip sha256 when `download.json` exists. Otherwise it refuses and points to `--new`.
- **State.** One lock (`gbif-sample-download.lock`) covers the whole run. The intent `gbif-sample-download-intent.json` holds `{request, startedAt, searchCount, key}`. Both use D8's named state helpers. While an intent exists, any run only resumes or reconciles it (rows 1–2 below), and a `--download` of another key is refused.
- **`--new`, decided by a pure `decideDownload` (first matching row wins):**
  1. An intent with a `key`: resume polling that key. No POST.
  2. An intent with `key: null` (the POST's outcome is unknown): list the user's downloads, `GET /occurrence/download/user/<GBIF_USERNAME>` (authenticated, every page). Keep those `created` at or after `startedAt` minus 5 min whose `request` passes `sameRequest` against the intent's request.
     - One match: adopt it (write its key into the intent) and resume.
     - Several: refuse, naming the keys.
     - None: refuse with "a POST at <t> may have created a download and GBIF lists none yet; re-run later; delete <intent> only when sure nothing was created". This is `decide`'s rule in `gbif:register`: never a second POST while one may exist.
  3. No intent and `--new`:
     - Write the intent with `key: null` **before** the POST (`wx`), recording the search count at submit.
     - Then the one POST (never retried; `postOnce`, D8), classified by `classifyPost` with the download-key parser (`^\d{7}-\d{15}$` on the text body).
     - Created: rewrite the intent with the key (temp file + rename).
     - Rejected (4xx other than 408/429): delete the intent and stop.
     - Ambiguous: keep the intent and stop ("re-run to reconcile").
- **Polling.** Once a minute. At the end, `totalRecords` must be within 0.1 % of the intent's `searchCount`. KILLED, FAILED or CANCELLED is final on GBIF's side: the run deletes the intent and stops, naming the key and the status. After a successful write (below), the intent is deleted **after** `download.json` holds the key, so a key is never lost (`finish`'s order in `gbif:register`).
- **Fetch.** `downloadFile` streams the zip into a fresh temp folder; its size must equal GBIF's `size`. `unzip -Z1` must list exactly `<key>.csv` (the zip is one 229 MB deflate member with a data descriptor), and `unzip -p` streams it, CRC-checked.
- **Parse.** A line reader splits on tab only (SIMPLE_CSV has no quoting, F10) and requires exactly the header's 50 fields. Each column is typed with a refusal (P1–P8, D15), and the species rule is applied. It counts rows per dataset and per record license, then checks: rows = `totalRecords`; per-dataset rows = GBIF's paged `/occurrence/download/<key>/datasets` listing. These are the spike's load checks, without PostGIS.
- **Metadata.** `/dataset/<key>` and `/organization/<key>` (once per publisher) through `getJson` at ≤ 2 req/s. An unknown license URL, a missing title or a missing publisher fails and writes nothing.
- **Write.** The three files (temp, then rename), with stage counts printed for the Summary (expected 394,532 → 381,065 → 40,395). The spike's per-taxon comparison with today's search counts is not re-run on reuse: counts have drifted since 2026-10-23, and the zip's sha256 and `totalRecords` already prove the download. After the live run, list dataset titles that differ from the spike's `datasets.json` under Decisions, for L2.
- **Parity (DoD).** `scripts/learn/sample-parity.test.ts` writes occurrences through the build's own writer into a temp folder. It compares the row count and a canonical DuckDB md5 (the 12 columns as text, ordered by id) with `SPIKE_SAMPLE`, a constant computed once from `SP/site/learn/data/occurrences.parquet` by the same query (command in the commit). Verification also runs a one-off `EXCEPT` both ways against the spike file. Only a new download may change the constant (004 §9).

#### D7. Derive
- `deriveAll` = `deriveCore` (species, mismatches, contributions, countries, issued ids) + `deriveLearn(core, learnInputs)` (sample, learn contributions, learn DOI). `pnpm derive`, `build` and `gbif:register` call `deriveAll`. `ingest gbif-sample` calls only `deriveCore`, in memory, and asserts no committed derived file (D6), so a stale sample never blocks its own re-ingest. `derivedFiles` lists the three new files.
- **Refresh order after a species change (revision, Astra MF1).** The steps run in one line:
  1. `seed:cc`;
  2. `ingest wikidata|col|gbif` as needed (they read `base.json` only);
  3. `ingest gbif-sample --new` (reads raw snapshots, computes the core in memory);
  4. `pnpm derive`, which writes everything at once;
  5. the DOI refreshes (learn-sample always; countries when its counts moved);
  6. `build`.

  `pnpm derive` refuses a stale sample and writes nothing before step 3, so `species.json` is never committed out of step with the sample. Nothing reads a derived file to produce a raw one.
- **Cost, stated (Fable MISSED 1).** Adding or removing a species, or changing an `ids.gbif`, changes `downloadRequest`, so the sample is stale. Plain `pnpm build`, and so `deploy`, refuses until all of this is done: a new GBIF download (about 17 min of waiting), `ingest gbif-sample --new`, derive, a new `learn-sample` DOI (tag and register), and the countries DOI refresh whenever its counts moved. `--draft` lifts only the two DOI checks, never freshness: a stale sample fails every build. D17 puts this in `AGENTS.md`, and the Summary repeats it for L2.
- `scripts/derive/sample.ts` (pure): parses `sample.csv` (refuses malformed rows, duplicate ids, unknown dataset keys). **Freshness (MF3, sample):** `download.request` must equal `downloadRequest(core's ids.gbif)`, `download.sampleRules` must equal `SAMPLE_RULES`, and `datasets.json.downloadKey` must equal the download's key. Otherwise: "data/raw/gbif-sample is stale: run pnpm ingest gbif-sample".
- It applies `countryKey` against the core's in-memory countries rows (= `countries.json` once derived; an unknown code that isn't ZZ or XZ fails, naming it). It returns the 12-column occurrence rows, the sample's dataset rows (declared license) and the contributions. The contract runs here, not in the ingest, so `sample.csv` doesn't depend on `countries.json`: a countries fix (002 §6's narrowest new rule) needs no GBIF re-ingest. One function either way.
- It prints `learn-sample DOI current <doi>`, or `missing/stale: commit, push, push tag gbif-learn-<hex12>, then pnpm gbif:register --target learn-sample`.

#### D8. Two registration targets (SC4)
- `scripts/gbif/targets.ts`: `TARGETS.countries` and `TARGETS["learn-sample"]`, each with `{contributionsFile, registrationFile, depositPath, tagPrefix, stateName, requestBody(c, sha, sourceUrl), downloadDoi(c), isCurrent(c, reg)}`. `countries` keeps every current value (files, `gbif-dd-`, `gbif-register.lock`, `gbif-register-intent.json`, title and description), so its behaviour and `registration.json` bytes don't change.
- `learn-sample`: `data/gbif-learn-sample/`, tags `gbif-learn-`, state name `gbif-register-learn-sample`. Its body adds `originalDownloadDOI` and describes the sample (download DOI, rules, files at sourceUrl) above the hash line. `isCurrent` requires the same counts **and** the same `originalDownloadDOI`.
- `state.ts`: the lock and intent take a name, and the intent's type is a parameter (`readIntent<T>(name)`, `createIntent(name, value)`, new `replaceIntent(name, value)` by temp file + rename, `deleteIntent(name)`, `withLock(name, label, fn)`). The countries names stay `gbif-register.lock` and `gbif-register-intent.json`. The sample download (D6) uses the same helpers.
- `depositTag(prefix, sha)`. `readBackErrors` gains `expectedDownloadDoi`: a mismatch is a hard error, on post, adopt and verify alike. `DerivedDatasetRecord` and `Registration` gain an optional `originalDownloadDOI`, written only for a target that has one (so countries' canonical JSON is unchanged).
- `decide` doesn't change. `classifyPost(outcome, parse = parseDoi)` gains an optional parser, so the download POST reuses its 2xx / 4xx / ambiguous rule; register's call is unchanged. `postOnce` moves from `gbif-register.ts` to `scripts/gbif/post.ts` (body and auth as parameters), the one never-retried POST for both.
- `pnpm gbif:register [--target countries|learn-sample]`, countries by default so AGENTS.md's steps keep working; `checkDeposit` uses the target's path and prefix.
- A doc comment on `isCurrent`: it checks counts for citation (plus the download for learn-sample), never record identity. Identity is the contributions' `sample.sha256` under the hash line, and the manifest's sha256s.
- Before the one POST: read GBIF's derived-dataset API docs on `originalDownloadDOI` + `relatedDatasets` (does GBIF keep our subset counts when both are given?) and record the answer under Decisions. If it's unclear, add a handoff item and do other steps meanwhile.

#### D9. Build
**9.1 Flow.** `build.ts` orchestrates:
1. `readBuildInputs` runs `deriveAll` + `assertDerivedFiles`, `validateRecords` and `assertRecordKeys` (D12), `assertLearnProjection` (9.5), the `data/learn/` sha256 check (D5) and the committed-data cap. A plain build refuses either DOI if it isn't current, naming the target and the refresh steps. `--draft` builds without both DOIs, and lifts nothing else (D7).
2. Attribution, docs.
3. `loadDatabase` (D11).
4. `rm dist`, then `/v1` species files (unchanged code path), `/v1/countries.*`, attribution, `index.html`.
5. `writeLearnData(dist, inputs)`.
6. Size listing.

**9.2 Shared helpers.**
- `build/duckdb.ts` `openOfflineDuckDb({searchPath})`: threads 1, autoinstall and autoload off, `enable_geoparquet_conversion = false`. `tables.ts`, countries, learn data and the loader all use it.
- `build/html.ts` `esc`, `link`, `fillSlots(template, slots, name)`, moved out of `docs.ts`.
- `site/style.css`, inlined into both pages through a `{{style}}` slot, so `dist/index.html`'s CSS bytes don't move.
- One `childFile(dir, name)` that refuses a path outside `dir`, for every computed output path.

**9.3 `writeLearnData`** (`build/learn/data.ts`):
- `occurrences.{parquet,csv}` from derive's rows, through DuckDB (Parquet zstd, CSV with header, `ORDER BY id`). `datasets.csv` from the sample's dataset rows (5 columns, sorted by key).
- Byte copies of the six `data/learn/` files.
- The loader (9.6), the manifest (9.7), the index page (9.8), then the dist cap.

**9.4 One projection, two engines.**
- `site/learn/sql/setup.sql` = 004 §0's `setup` block without its plan-only header lines (= `SP/src/setup.sql`). It runs in DuckDB with `file_search_path` set to `dist/v1` and `dist/learn/data`, and builds the eight browser tables from the published bytes. L2 reuses the same file in the browser.
- The six lab-only tables are read from the copied files.
- `build/learn/checks.ts` `LAB_CHECKS: {name, sql}[]` is portable SQL, each query returning a violation count:
  - range_status ok ⇔ species_countries rows;
  - each taxon's parent is exactly one rank up; species.genus has rank genus;
  - the country-key contract (`country_code` = `country_code_gbif` when that is a countries row, else NULL with the GBIF code NULL, ZZ or XZ);
  - foreign-key coverage of the lab-only tables (shapes, admin-1 and habitat codes in countries; ecoregions' biome; habitat level-1);
  - est_area ≥ 0; uncertainty finite and ≥ 0; month 1–12; year > 0.
- The build runs `LAB_CHECKS` in DuckDB (any count > 0 fails the build, so `deploy` never publishes a loader that won't load). The loader's DO block runs the same list (SC5, at load time).

**9.5 SC1, `assertLearnProjection(species)`** (pure TypeScript, in `readBuildInputs`):
- No two records share a non-null external id (iucn, gbif, col, wikidata, inaturalist, ncbi). The message names the column, the value and the ids, and the fix: make that column non-unique in `setup.sql`, `lab-keys.sql` and both ERDs, and teach it as an optional, non-unique id.
- Each taxon name has one rank and one parent.
- No record has `replacedBy`: a retired record needs the replacement junction first, and is never counted as active.
- UNIQUE stays today, with evidence. `ids.gbif` is unique by construction: an EXACT match whose canonicalName equals the unique scientific name (`scripts/derive/gbif.ts:48`). D3's shared key is the countries' accepted `taxonKey`, which the projection doesn't publish. `ids.iucn` is unique through `validateBase`. The other four hold over all 76 rows.

**9.6 The loader** (`build/learn/loader.ts`, a port of `SP/scripts/loader.ts` with its schema parameter):
1. `\set ON_ERROR_STOP on`, `BEGIN`, `SET client_encoding = 'UTF8'`, `SET LOCAL lock_timeout = '60s'`.
2. **The MF4 guard and the drop, one DO block (revision, Astra MF3).** Postgres computes the cascade itself, so the guard doesn't re-implement its dependency rules (internal-owner promotion, rules, partitions, extensions). The guard only classifies what the cascade removed:
   - a. **Snapshot:** every distinct dependent `(classid, objid, objsubid)` in `pg_depend` whose owning schema isn't the lab schema, keyed to `pg_identify_object(…).type || ' ' || identity`.
     - The owning schema is `pg_identify_object(…).schema`, except for rules, triggers, defaults and policies, whose schema is NULL there. Those four take their relation's: `pg_rewrite.ev_class`, `pg_trigger.tgrelid`, `pg_attrdef.adrelid`, `pg_policy.polrelid`.
     - `pg_toast` is excluded: a TOAST table and its index belong to their table, which has its own entry.
     - A NULL schema after that (casts, event triggers) counts as outside.
   - b. `DROP SCHEMA IF EXISTS <schema> CASCADE`.
   - c. **Diff:** a snapshot entry that is no longer a dependent in `pg_depend` was removed by the cascade. If there is any, `RAISE` with every identity and the explanation: these are yours, outside `<schema>`, and the reload would drop them; move or drop them, or use a database just for the labs. The raise aborts the loader's one transaction, so nothing changes.
   - Proven on PG16 in `critwire_dev`, in rolled-back probes (revision):
     - It caught an outside view and materialized view (with their `_RETURN` rules and row types), an FK with its RI triggers, a column of an inside enum, two defaults (an inside function and an inside sequence), a function taking an inside type, a trigger running an inside function, and a policy reading an inside table.
     - No inside object was reported (TOAST, identity, index, inside view).
     - A non-superuser schema owner's cascade drops another role's outside view: the guard is what stops it.
     - It took about 0.85 s with 3,170 outside dependents (PostGIS and postgis_raster installed).
     - Today nothing outside depends on the spike's leftover `learn_curriculum` (a read-only edge count, 0), so the first real load isn't refused.
   - The generator emits the block per schema parameter (`learn_curriculum`, or `learn_t_*` in tests).
3. `CREATE SCHEMA`, `SET LOCAL search_path`.
4. `db/learn/lab-ddl.sql`: the spike's, plus SC5's CHECKs: `coordinate_uncertainty_m >= 0 AND coordinate_uncertainty_m < 'Infinity'`, which also rejects NaN; `year > 0`; `est_area_km2 >= 0`. Unknown values stay NULL. The ingest already bounds the year at the download's year.
5. `COPY … FROM stdin (FORMAT csv)` per table, ordered by key; WKB as base64.
6. `db/learn/lab-keys.sql`.
7. `ANALYZE`.
8. The DO block: row counts, SRID 4326, `LAB_CHECKS`.
9. `COMMIT`.

The browser's `setup.sql` stays 004's byte for byte; CHECKs aren't drawn on the ERDs.

**9.7 Credits and manifest** (`build/learn/credits.ts`).
- `LAB_SOURCES` (critwire, Natural Earth from `sources.ts`, the GBIF download with `datasets: "datasets.csv"` and the sample's derived-dataset DOI, RESOLVE, and Jung, read from `habitat.json` and marked "stand-in until L3") and `LAB_FILES` (file → source ids). `credits(file)` refuses: no sources, an unknown source, a license missing from `LICENSE_URLS`, CC BY without a citation, a sample dataset without title or publisher.
- `manifest.json` (keys in fixed order, no clock):
  - `cap`, `bytes`;
  - `inputs` (SC2): bytes and sha256 of `/v1/species.parquet` and `/v1/countries.parquet`, the two files the projection read; plus `sample.csv`'s sha256 (= `contributions.json`'s `sample.sha256`, the DOI deposit's file) and rows (= its `records`), so a learner and `assertBuilt` (D15) can tie the published sample to the deposit;
  - `dois {download, sample}` (sample null in a draft);
  - `files`, per data file: `columns`, `rows` (Parquet and CSV), `bytes`, `sha256`, `sources`. The loader entry adds `tables` (14 row counts), which `learn:check` and E2E compare against.
- The manifest excludes itself and `index.html`, both written after it.

**9.8 Index page** (`site/learn/data/index.html` through `fillSlots`): the files with sizes, rows, sources, licenses and links; both DOIs; the `NA` note; the dataset table (title, publisher, DOI link, license, records in the sample: 400 rows). No diagram (D18).

**9.9 The cap.** Pure `assertCap(label, sizes, 50_000_000)`, refusing a total above 50,000,000 bytes and naming it, for `dist/learn/data/` and for the committed lab directories (D3).

#### D10. `pnpm learn:check` (004 §7.6; SC7)
- **Connection** (`scripts/learn/pg.ts`): `LEARN_PG_URL` if set, else libpq `PG*`; never `DATABASE_URL`. Child processes get an explicit environment (PATH, HOME, the PG* values derived from the URL, `PGOPTIONS`), so no password reaches argv or the logs, and no `DATABASE_URL` or `GBIF_*`.
- **Checks in this order:**
  1. Refuse `critwire` by name, before connecting (from the URL, `PGDATABASE`, or libpq's default, the user name).
  2. Connect; refuse `critwire` by `current_database()`.
  3. Require CREATEROLE and `createrole_self_grant` ⊇ set, inherit, else name `--setup`.
  4. Take `pg_try_advisory_lock(hashtext('critwire.learn'))` on a dedicated connection for the whole run; if it's held, refuse.
  5. Read the canary on `learn_spatial` when that schema exists. It's read as libpq's socket default (`critter-ai` here), so the lab role needs no access to A2's schema.
  6. Snapshot `learn_%` roles and schemas.
  7. Check the loader's sha256 against the manifest.
  8. `psql -X -v ON_ERROR_STOP=1 -f` the loader twice; after each run, the 14 row counts must equal the manifest's `tables`.
  9. **Forced failure (revision, Fable MF1, Astra SC2): an injected constraint-violating row, never a cut.**
     - The check writes a temp copy of the loader with one extra line before the `\.` that ends the `occurrences` COPY: a copy of that COPY's first data row, so its `id` is a duplicate.
     - Every COPY then succeeds, and the load fails at `ALTER TABLE occurrences ADD PRIMARY KEY` in `lab-keys.sql`. That is the latest point after the DROP, so the run proves the whole load is one transaction.
     - The injection site must be found exactly once (the `COPY <schema>.occurrences … FROM stdin (FORMAT csv);` line and its `\.`), else learn:check fails with "loader layout changed".
     - It asserts all three: psql exits non-zero, stderr names the duplicate key, and the 14 counts and per-table md5 equal those after step 8's second load.
     - A cut COPY isn't used: on a row boundary psql ends the COPY at EOF, exits 0 and the disconnect rolls back, so it's non-deterministic.
  10. Run `site/learn/sql/pg-role-smoke.sql` (in its own BEGIN/ROLLBACK, so its last SELECT gives 0, the same result as 004's block); this proves CREATEROLE.
  11. Canary after = before; leak check = snapshot.
- **Cleanup:** a `finally` releases the lock, ends the connections and removes temp files. A SIGINT/SIGTERM handler kills the running psql and then runs the same cleanup.
- **`--setup [--env <file>]… [--reset-password]`** connects as libpq's default role, which must be a superuser, and refuses `critwire`. Idempotent:
  1. `CREATE ROLE critwire_lab LOGIN CREATEROLE PASSWORD <random>` if missing, and `ALTER ROLE critwire_lab SET createrole_self_grant = 'set, inherit'`.
  2. `GRANT CONNECT, CREATE, TEMPORARY ON DATABASE <db>`.
  3. If it exists, `ALTER SCHEMA learn_curriculum OWNER TO critwire_lab` (needed for the spike's leftover).
  4. Refuse if `critwire_lab` has CREATE on `public` or if `postgis` is missing (the superuser creates extensions).
  5. **`LEARN_PG_URL` (revision, Fable SC2).** A password is set only when the role is created or with `--reset-password`; a missing or failing URL never resets it silently, because a reset breaks every other checkout's copy.
     - With a new password, it writes `LEARN_PG_URL=postgres://critwire_lab:…@127.0.0.1:5432/<db>` into each `--env` file (default `./.env`).
     - Without one, each listed file must already hold a URL that connects as `critwire_lab`. Otherwise it refuses, naming the file and the fix: copy the line from a checkout where it works, or `--reset-password` with every checkout's file listed.
     - The write replaces only the `LEARN_PG_URL=` line (or appends it). Every other line stays byte for byte, and so does the file mode: a temp file in the same folder, chmod to the original mode, then rename. No value is ever printed.
     - L1's setup step runs it with `--env .env --env /srv/critter-ai/critwire/.env`. The project `.env` is the one the mission runner copies into new worktrees (`~/AGENTS.md`), so L2–L5 inherit a working URL and never reset.
- **Update 004 §0, §3.2 and §7.6 in the same commit:** `critwire_lab` via `LEARN_PG_URL`; `pg-role-smoke` wrapped in its own transaction; a disposable lab database recommended; the loader's dependency refusal; the canary read as the admin role.

#### D11. MF1
- `loadDatabase` first runs `select current_database()` and calls the pure `assertTarget(current, process.env.CRITWIRE_DB_TARGET)`. A missing variable throws naming it; a mismatch throws naming both database names. Only then does it take the advisory lock, under `SET LOCAL lock_timeout` (30 s) and `statement_timeout` (120 s), with the test-only overrides as parameters.
- `db/schema.sql` and the insert use `public.species`.
- **`loadEnv` (revision, Fable MF2, Astra MF4): one rule for every variable, no special case.**
  - It parses `.env` with `node:util` `parseEnv` and sets only the variables the environment lacks.
  - For each variable that both set to different values, it logs one line: `env: <NAME> from the environment (overrides .env)`. The line holds the name and the winning source, never a value or any part of one (no URL host, user or database). This covers `DATABASE_URL`, `LEARN_PG_URL` and `GBIF_PASSWORD` alike. Values are compared in memory only.
  - The database name the brief asks for comes from the server: `loadDatabase` logs `loading into <current_database()>` after the guard. No code parses a URL in order to log it.
  - `requireEnv` and every refusal name the variable, never its value.
- `learn:check`, E2E and L4 never read `CRITWIRE_DB_TARGET`. `deploy` is unchanged (both `.env` files carry the variable: Baseline).

#### D12. MF2
- **`validateRecords(records, issuedIds)`** in `scripts/species.ts`, next to `validateBase`, is the one record *value* validator. It runs inside `deriveCore` (so in derive, build, register and ingest) and in `pnpm db:load`. It absorbs the `inputs.ts` value checks (all-digit slug, photo completeness).
- **The key-shape check stays where it is (revision, Fable SC4).** `assertRecordKeys` stays in `build/columns.ts` with `RECORD_COLUMNS`, the list it checks against, so derive never imports build code. `readBuildInputs` and `load.ts` each call both checks; `load.ts` already sits on the build side, next to `db.ts`. One definition each, no layer crossing.
- **What it checks:**
  - non-empty strings;
  - slug grammar `^[a-z0-9]+(-[a-z0-9]+)*$`, not all digits;
  - integers: `id` and `ids.{iucn,inaturalist,ncbi}` in 1..2³¹−1; `ids.gbif` a positive safe integer;
  - countries: null ⇔ status ≠ ok, otherwise a non-empty, sorted, unique list of `^[A-Z]{2}$`;
  - photo null or all four fields;
  - `replacedBy` null, or a non-empty list of existing, distinct, non-self ids with no cycle.
- **Issued ids:** every `issued-ids.json` pair is still present with the same slug, retired records included; no current record takes an issued slug under another id. Derive writes the union back. The first derive writes today's 76 pairs; Verification checks once that they equal `baseline/live-species.json`.
- **Elsewhere:** the Wikidata integer conversion range-checks P3151 and P685 (int32) and P846 (safe integer); `childFile` guards the species paths. The `/v1` bytes don't change.

#### D13. MF3 for GBIF and COL
`assertGbifFresh(snapshot, base)` and `assertColFresh(snapshot, base)` replay the ingest's request plan with the current builders, as Wikidata's whole-query check does:
- per name, `match.url = gbifMatchUrl(N)`;
- occurrences present ⇔ `usage.rank = SPECIES`, and then `occurrences.url = gbifOccurrenceUrl(taxonKey)` and `datasets.url = gbifDatasetsUrl(taxonKey, 0)`;
- `checklist.key = BACKBONE_KEY`;
- COL's `url = colMatchUrl(release.key, N)`.

These replace the name-set and `taxonKey` checks. URLs stay stored as provenance; elapsed time is never staleness. The failure cases are written first; then derive must show no diff on today's data.

#### D14. SC3: every case and where it runs
| Case | Where | Test |
|---|---|---|
| Insert failing after DROP | mirror (`db.ts`); lab loader | `test:db` G6; `test:db` LD5/LD7, and `learn:check`'s forced failure |
| Two concurrent loads | mirror | `test:db` G7 (serialized, both succeed) |
| Lock timeout | mirror (advisory lock held by a test session, short `lock_timeout`) | `test:db` G5 |
| Changed extraction predicates | GBIF, COL, sample | `pnpm test` F1–F8 |
| Truncated JSON | `readJson` names the file | `pnpm test` H2 |
| Facet pages moving | `toDatasetPage` exported (count changed, key repeated) | `pnpm test` H3 |
| Retry-After | `http.ts`: honoured up to 60 s; above that, stop with "asked to wait N s, more than 60 s: re-run later" | `pnpm test` H1, against a local `http.createServer` on port 0 |
| Stale or missing DOI | both targets: a plain build refuses, `--draft` passes | `pnpm test` H5 (the pure DOI gate) |
| Interrupted multi-file derive | `assertDerivedFiles` names the file that differs | `pnpm test` H4 |

#### D15. Testing (decision 5)
- **Runners.** `pnpm test` = `tsx --test 'scripts/**/*.test.ts'`: pure, offline, no database (DuckDB in memory allowed). New `pnpm test:db` = `tsx --test 'scripts/**/*.dbtest.ts'`, against `critwire_dev` only: lab cases as `critwire_lab` in `learn_t_*` schemas they drop, under the lab lock; mirror cases as the `.env` role. It refuses any other database. Failure cases are written before the code, per module:
- **Ports:** CD1–CD10 (matcher); CK1–CK5, spike-SC1–SC5 (cap, plus the gbifID tie-break), species rule (speciesKey first, synonym via taxonKey, none fails, two fail), effective license (stricter wins, unknown fails); LD1–LD4, LD10, LD11 in `test`, LD5–LD9 and LD12 in `test:db`; the spike's credit refusals (ST4).
- **New:**
  - **P1–P8 parser:** field count, non-numeric or out-of-range coordinates, negative/NaN/infinite uncertainty, year < 1 or after the download's year, month outside 1–12, unknown basis, license or status, duplicate gbifID, unknown dataset key.
  - **DL1–DL15 download:** the builder equals the spike's stored predicate for the 73 keys (and `sameRequest` accepts GBIF's full echo); an echo missing a checklistKey; stored ≠ built refuses reuse; zip sha256; totalRecords; per-dataset counts; unknown license or no title or publisher writes nothing. Then `decideDownload` and the POST path (revision):
    - DL8: the intent is on disk before the POST is sent;
    - DL9: an intent with a key resumes without a POST;
    - DL10–DL12: an intent without a key lists, and one match adopts, two refuse naming both, none refuses (no POST in any of them);
    - DL13: a rejected POST deletes the intent; an ambiguous one keeps it;
    - DL14: KILLED or FAILED deletes the intent and stops; with an intent present, a run only resumes or reconciles, and `--download <other key>` is refused.
    - DL15: `ingest gbif-sample`'s species come from the in-memory core: with `species.json` deliberately stale and a raw snapshot fresh, it still builds the request (no `assertDerivedFiles`; Astra MF1).
  - **RT1–RT7 register:** targets don't share lock, intent, tag or deposit path; one target's intent doesn't block the other; the learn body carries `originalDownloadDOI`; a wrong read-back DOI is a hard error; an ambiguous successful POST is adopted on the next run, DOI checked; countries' `registration.json` bytes unchanged; `isCurrent` is false on the same counts with another download.
  - **LD13–LD18 loader (`test:db`):**
    - LD13: an outside view is refused, naming it, with both schemas intact.
    - LD14: an outside foreign key, the same.
    - LD15: the other kinds the guard must catch (a materialized view, a column of an inside type, a default calling an inside function, a function over an inside type, a trigger, a policy), each refused alone.
    - LD16: no false positive: inside views, identity columns, indexes and a TOAST-backed column reload cleanly.
    - LD17: SC5 CHECK violations.
    - LD18: `LAB_CHECKS` raising in the DO block.
  - **LX, one case per `LAB_CHECKS` entry, in both engines (revision, Fable SC1):** `LAB_CHECK_FIXTURES` gives, per check, one clean row set and one violating row. `checks.test.ts` (DuckDB in memory) and `checks.dbtest.ts` (Postgres, a `learn_t_*` schema) run every query on both, and require 0 on the clean set and exactly 1 on the violating one. The fixtures include `'Infinity'`, NaN, a negative uncertainty and month 13, where the engines differ.
  - **PJ1–PJ3 projection; CAP1–CAP3 cap.**
  - **G1–G7 MF1:** G1–G2 pure plus database (wrong or missing target refuses before any DDL: the table's oid is unchanged); G3 matching target loads; **G4 redaction (revision):** sentinel values for `DATABASE_URL`, `LEARN_PG_URL` and `GBIF_PASSWORD`, set differently in the environment and in a temp `.env`, with stdout and stderr of `loadEnv` and `loadDatabase` captured. The captured output names each overridden variable and its source and the `current_database()`, and contains no sentinel or any part of one (password, host, user, or a database name taken from the URL).
  - **V1–V16 MF2:** each validator rule and each issued-ids rule.
  - **F1–F8 MF3:** each URL, the checklist, occurrences presence, the sample's request, `sampleRules`.
  - **LC1–LC10 `learn:check`** (`test:db`, spawning the CLI): name refusal, `current_database()` refusal, no CREATEROLE, lock held, counts, forced failure (the injected duplicate row: exit non-zero, counts and md5 unchanged, and a loader without the injection site fails "layout changed"), canary diff, leaked role, SIGINT mid-run (lock free, nothing left), and no `DATABASE_URL` in the child environment. **LS1–LS5 `--setup`:** privileges; idempotent; refuses a non-superuser; LS4 the `.env` rewrite keeps every other line and the mode byte for byte, and no value reaches the output; LS5 an existing role with no working URL in a listed file is refused unless `--reset-password` is given.
- **E2E** (expectations from `data/` and the manifests, never typed in).
  - New `countries.spec.ts`: the three files return 200; exactly five VARCHAR columns, non-empty, sorted, unique code and name; 250 rows equal `countries.json`; the same rows in all three formats; `NA` is text; k01 gives 0 unmatched.
  - `docs.spec.ts`, `duckdb.spec.ts` and `attribution.spec.ts` gain the countries files, the `/learn/data/` link and the Natural Earth entry.
  - New `learn-data.spec.ts`:
    - the manifest lists exactly the files in `dist/learn/data/` (minus itself and `index.html`); each returns 200 with its sha256 and size;
    - Parquet and CSV row counts and CSV headers match the manifest's columns; occurrences and datasets also match `data/`;
    - the loader's `tables` equal counts computed from `data/`;
    - total ≤ 50,000,000;
    - every file has sources, each CC BY source has a citation, the sample files carry both DOIs (= `registration.json`);
    - `inputs` sha256 = the served `/v1` files';
    - the index lists every sample dataset with title, publisher, license and records, every file, and both DOIs;
    - screenshots of `/learn/data/` at 1280 and 375 px.
  - **`assertBuilt` (global setup; revision, Fable MISSED 3)** also refuses a stale `dist/learn/data/`, with one read of `manifest.json` and no new mechanism: `inputs`' sha256 must equal `dist/v1/{species,countries}.parquet`, `inputs`' sample sha256 must equal `contributions.json`'s, and each copied `data/learn/` file's manifest sha256 must equal `shapes.json`/`habitat.json`.
  - The star's key coverage is L2's case. The registration conditions skip only while `registration.json` is missing, as `attribution.spec.ts` does, so the final run skips nothing.
- **Unchanged `/v1` bytes** (Verification, not E2E): the species files' sha256 against `baseline/dist.sha256`; `attribution.json` differs only by the Natural Earth entry (`jq`).

#### D16. Corrections to 004 (and 002 §6), each in the commit of the code that proves it
- **§0:** `critwire_lab` via `LEARN_PG_URL`; `pg-role-smoke` in its own transaction (result unchanged).
- **d2 (004:2350–2351, and the paragraph after `d2-sources`):** the exports are written from JSON; the Postgres mirror is a check.
- **§3.2:** a disposable lab database is recommended; schema separation isn't dependency isolation; the loader refuses inbound dependencies; CONNECT and TEMPORARY are added to the privileges.
- **§4.1:** `data/learn/`; all three shape files rebuilt by `ingest shapes` (zstd); re-measured sizes.
- **§4.2:**
  - cap order: md5, then gbifID;
  - "a refresh changes only what GBIF changed" → a newly eligible low-hash record can displace one;
  - the contract runs in derive;
  - `download.json` gains `sampleRules`;
  - the read-back checks `originalDownloadDOI`;
  - `isCurrent` is a citation check;
  - a new download writes its intent before the POST and reconciles through the user's download listing (revision).
- **§4.3:** the dependency guard (drop, then diff, inside the transaction), the CHECKs and `LAB_CHECKS`, `lock_timeout`.
- **§4.4:** the committed directories.
- **§4.5:** the manifest schema (`inputs`, `dois`, `tables`).
- **§6.2 dictionary:** year and uncertainty bounds; NULL = unknown.
- **§7.6:** the role, `--setup`, the canary identity, the forced failure.
- **§7.7:** the L1/L2 split of learn-data.
- **§1 or §B:** the Natural Earth `release` object (D4).

#### D17. AGENTS.md
- The copy line, replaced verbatim (Notes).
- **Commands:** `ingest naturalearth|shapes|gbif-sample`, `learn:venv`, `learn:check [--setup]`, `test:db`, `gbif:register --target`.
- **Data list:** D3's files and who writes each; the stand-ins and `habitat.json`.
- **Refresh order and its cost (revision, Fable MISSED 1):** D7's line of steps, and the warning:
  - adding or removing a species, or changing an `ids.gbif`, makes the GBIF sample stale;
  - `deploy` then fails until a new GBIF download (about 17 min), `ingest gbif-sample --new`, derive and a new `learn-sample` DOI;
  - `--draft` doesn't lift it.
- **Next to "Retired ids get `replacedBy`" (revision, Fable MISSED 2):** until Learn's projection has a replacement junction (L2's to add), a record with `replacedBy` fails `pnpm build`, `/v1` included, so don't retire an id before then.
- **Databases:** `CRITWIRE_DB_TARGET` (the build and `db:load` only), `critwire_lab`/`LEARN_PG_URL`. `learn:check --setup --reset-password` breaks every other checkout's `LEARN_PG_URL`: list each checkout's `.env` with `--env`, or copy the line instead. CLIs log environment variable names, never values.
- **Stack:** Python via `uv` in `.venv-learn`, for `ingest shapes` only.
- **GBIF DOI refresh:** the same steps per target, with the target's file, tag prefix and `--target`; never move a `gbif-dd-*` or `gbif-learn-*` tag.

#### D18. Diagrams (decision 7)
None in L1. `/learn/data/` is a reference table of files and credits; a picture wouldn't teach more than the table. The `diagram-design` first-run gate stays for the first mission that draws one (L2).

#### D19. Sessions (decision 6)
About 30 steps, each one session:
| Area | Steps |
|---|---|
| MF1 | 1 |
| Countries (ingest; matcher + derive; build, attribution, docs, E2E) | 3 |
| `uv` + venv + stand-ins | 1 |
| Shapes (orchestrator + Python; run + port check) | 2 |
| Sample rules | 1 |
| Download module + reuse ingest | 2 |
| Live ingest | 1 |
| `--new` path | 1 |
| Sample derive + parity | 1 |
| Register targets | 1 |
| Live registration | 1 |
| Build helpers + `writeLearnData` | 1 |
| Projection + checks | 1 |
| Loader | 2 |
| Credits / manifest / page / cap | 1 |
| `--setup` | 1 |
| `learn:check` + `test:db` | 2 |
| E2E learn-data | 1 |
| AGENTS.md + 004 batch | 1 |
| MF2 | 2 |
| MF3 (GBIF/COL) | 1 |
| SC3 leftovers | 1 |

With the 4 remaining stages, the code review, about 2 fix steps, verification and the release, that's about 42 sessions. The revision adds about one step's work (the download reconciliation, the guard's cases, the two-engine check fixtures, `--setup`'s `.env` handling): about 31 steps, about 43 sessions.

Risky units:
- **The live registration:** the one network write. Do it right after the sample derive (around session 20), months before 2027-04-23.
- **The live ingest:** about 7 min of network, plus the 35 MB zip.
- **The shapes run:** 149 MB download, about 5 min of simplification.
- **A new GBIF download only if reuse fails:** that adds a 17-minute wait and re-runs every 004 result (L2 sessions too).

### Rejected alternatives
- Plain `python3 -m venv` + pip: `ensurepip` is missing, so it needs root anyway, and the pins are compiled with `uv`. Two tools instead of one.
- `uv` via the user installer into `~/.local/bin`: that folder holds the agent system's tools. Root in `/usr/local/bin`, recorded in vps.md, is cleaner.
- The sample ingest in Python (the spike as is): the ingests and build are Node; the sample needs only HTTP, a zip and lines of text; and derive must share its rules.
- Typing the CSV inside PostGIS (`gbif_load.py`): an ingest mustn't need a database; the parity test proves the TypeScript typing.
- DuckDB `read_csv` for SIMPLE_CSV: quote and escape inference risks F10-style silent changes; splitting on tab is exact.
- Shapes in TypeScript: RESOLVE's simplification needs GEOS, and two GeoParquet writers would duplicate code.
- 002 §6's rule re-implemented in Python for 1:50m: duplication; the TypeScript matcher chooses, Python only writes.
- The country-key contract in the ingest: it ties `sample.csv` to `countries.json`.
- Dropping UNIQUE on external ids now: no shared id exists and d1 teaches them; fail loudly instead (9.5).
- Filtering retired records out of the projection: `setup.sql` is 002's byte for byte; refuse until a junction exists.
- Granting `critwire_lab` read on `learn_spatial`, or `pg_read_all_data`, for the canary: that edits A2's schema or widens the role. Read as the admin role.
- `SET ROLE critwire_lab` from the superuser: a block's `RESET ROLE` would return to the superuser (SC7).
- Checking ids against the live `species.json` at build time: the build is offline.
- Committing the GBIF zip, or a new download: 35 MB that GBIF archives under its DOI; reuse works (Baseline).
- CORS or Caddy header changes: the owner's answer is no.
- (Revision) A recursive `pg_depend` walk that resolves owners in SQL: it re-implements Postgres's cascade rules (internal-owner promotion, rules, partitions, extension members), and a missed rule silently drops a learner's object. Drop-then-diff lets Postgres compute the closure.
- (Revision) A probe DROP in a subtransaction, then the real DROP: two drops and a gap between them. The one real DROP, checked before COMMIT, is atomic.
- (Revision) Locking every schema relation before the snapshot: `LOCK … ACCESS EXCLUSIVE` needs privileges the lab role lacks on the spike's leftover (owned by `critter-ai`), and it only narrows a sub-second gap that concurrent DDL alone could hit (Open risks 9).
- (Revision) The sample ingest checking the committed derived files: that creates Astra MF1's cycle. Raw inputs are checked for staleness; derived ones are recomputed.
- (Revision) `pnpm derive` writing the core files while the sample is stale: it would commit `species.json` out of step with the sample. Fail and write nothing.
- (Revision) Saving the download key only after the POST: a crash or timeout leaves a possible download untracked, and the next run duplicates it.
- (Revision) Re-POSTing when the listing shows no match: a lagging listing would duplicate the download. Refuse, as `gbif:register` does.
- (Revision) A cut COPY as the forced failure: exit 0 on a row boundary (Fable MF1).
- (Revision) Logging the database name parsed from `DATABASE_URL` in `loadEnv`: it special-cases one variable and parses a secret to print it; `current_database()` is the truth, and it's safe.
- (Revision) `--setup` silently resetting the password when a URL fails: it breaks the other checkouts' copies and ping-pongs between them.
- (Revision, Astra SC1) Building the replacement junction in L1: `setup.sql` stays 004's byte for byte and the junction changes the browser projection and both ERDs, which is L2's scope. It's documented instead (D17), with 0 retired records today.

### Review items assigned to L1
| Item | Built in | Disposition |
|---|---|---|
| MF1 | D11, first step | build |
| MF2 | D12, after the Goal | build |
| MF3 | D7 (sample, with it); D13 (GBIF/COL, after the Goal) | build |
| MF4 | D9.6, with the loader (drop, then diff, before COMMIT) | build |
| SC1 | D9.5 | build. Shared ids fail loudly with a documented fix rather than dropping UNIQUE (evidence in 9.5); retired records are refused |
| SC2 | D9.7 `inputs` | build |
| SC3 | D14 | build, every case mapped |
| SC4 | D8 | build |
| SC5 | D9.4, D9.6 | build (the star's CHECKs are L5's) |
| SC7 | D10 | build |
| 004 corrections | D16 | build |

None is rejected.

### Open risks
1. **GBIF's handling of `originalDownloadDOI` together with `relatedDatasets`.** If GBIF replaces our counts with the download's, the read-back fails after the DOI is minted and the run stays unverifiable. Mitigation: the docs check before the POST (D8); the intent machinery keeps a minted DOI recoverable; otherwise a handoff item.
2. **The spike's download is erased on 2027-04-23 if uncited.** Register early (D19). If reuse fails, a new download re-runs every 004 result (L2 sessions too).
3. **Port differences** (parse, typing, cap tie-break) show up as a parity failure. They're bugs in the port, fixed before going on.
4. **Shape bytes depend on the pinned GEOS, shapely and pyarrow.** A pin change changes bytes; `shapes.json` records the versions.
5. **Dataset titles may have changed since 2026-10-23,** so blocks that print titles (e4-credits) may move. They're listed for L2.
6. **`critwire_lab` holds CREATEROLE cluster-wide** (labs need it). `learn_` naming, the leak check and L2's cleanup lint limit it.
7. **`lock_timeout` on advisory-lock waits** is assumed to work; G5 proves it, or the guard switches to `pg_try_advisory_xact_lock` with a retry deadline.
8. **The session budget** depends on the live steps not looping. Past 48, MF2, MF3 (GBIF/COL) and the SC3 leftovers go to L3 as handoff items.
9. **The MF4 guard's gap.** A dependent created by *another* session between the guard's snapshot and its DROP (under a second) isn't in the snapshot, so it isn't caught. A lab database is single-user, and `learn:check` holds its lock. Accepted and documented in 004 §4.3.
10. **The download listing's fields.** Reconciliation relies on `/occurrence/download/user/<user>` returning `created` and `request` as the per-key endpoint does (the endpoint exists: 401 without auth, checked in revision). If it doesn't, reconciliation refuses at its first live use (an unknown POST is refused, never repeated) and the field mapping is fixed then. The path runs only after an ambiguous `--new` POST.

## Architecture review (Fable)

Fable 5.1, 2026-10-28, on `4bfb653`. Checked F1–F13 against the cited lines (`scripts/db.ts`, `env.ts`, `db/schema.sql`, `derive/pipeline.ts`, `ingest/gbif.ts`, `http.ts`, `json.ts`, `build.ts`, `build/inputs.ts`, `build/attribution.ts`, `species.ts`, `derive/wikidata.ts`, `gbif/*.ts`, `gbif-register.ts`, `package.json`), the spike (`loader.ts:191,238–250`, `pg.ts:12–14`, `sample_rules.py:59–72`, `shapes.py` tolerance loop, `downloads/SOURCES.md` pins), 004 lines 505/844/2350–2351/8050/274–286, `e2e/Caddyfile` (`file_server` on the whole root, so `/learn/data/` needs no Caddy change), live `critwire_dev` (ACL `{critwire=CTc/critwire}`, both `learn_*` schemas owned by `critter-ai`), `ensurepip` missing, `uv` absent. Every finding is real and every line reference is right; the 1:50m pins are GeoJSON (TS can read the attributes), 0.05° is the tolerance the spike kept, `data/species.json` has 0 `replacedBy` records today.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **D10 step 9 / D15 LD5, the forced failure is non-deterministic as written.** "A copy cut inside the `occurrences` COPY" fails only if the cut lands mid-row. On a row boundary psql ends the COPY at EOF, never reaches `COMMIT`, exits 0, and the open transaction is rolled back by the disconnect: the schema stays intact but "psql must fail" is false and the test flakes. Define the forced failure as an injected invalid row (one that trips a NOT NULL, FK or SC5 CHECK) or a cut inside a row, and assert both the non-zero exit and the unchanged counts/md5.
2. **D11 `loadEnv` logging must be names-only, stated explicitly.** "Logs each variable that both sources set and which source won. For `DATABASE_URL` it logs only the database name" reads as if other values may be printed; `.env` also holds `GBIF_PASSWORD` and, after `--setup`, `LEARN_PG_URL`. Spell out: the log line carries the variable name and the winning source, never a value; `DATABASE_URL`/`LEARN_PG_URL` at most the database name. Add it to G4's redaction case.

MISSED:
- **Adding or renaming a species now blocks `deploy`.** D7's freshness rule (`download.request` = `downloadRequest(ids.gbif)`) means any `base.json` change that touches `ids.gbif` makes the sample stale: plain `pnpm build` (so `deploy`) refuses until a new GBIF download (~17 min), `ingest gbif-sample`, derive and a new `learn-sample` DOI. Right per MF3 and 004, but nowhere stated; AGENTS.md (D17) and the Summary must say that a species change costs a download and a DOI, and that `--draft` doesn't lift it.
- **D9.5's `replacedBy` refusal couples `/v1` to Learn.** The first retired species fails the whole build, `/v1` included, until L2's junction exists. Acceptable today (0 retired) but AGENTS.md must say so next to `replacedBy`, so a retirement isn't attempted before the junction.
- **`e2e/helpers.ts` `assertBuilt` only compares `dist/v1/species.json` to `data/`.** A stale `dist/learn/data/` after a sample, shape or stand-in change passes global setup. Extend it to the manifest's `inputs` and the sample's sha256 (one more read; no new mechanism).
- **D4 touches `Source.release`'s type.** `release: { key, alias, version, issued }` is what `colCitation` reads (`sources.ts:26–31`). Natural Earth is never a record `Source`, only an attribution entry; type the subset on the attribution entry, not on `Source`, or `colCitation` needs a new guard for a case that can't occur.

SHOULD-CONSIDER:
1. D9.4 `LAB_CHECKS` run in two engines: add one violating fixture per check and prove each query counts it in both DuckDB and Postgres (`'Infinity'`, NaN ordering and integer division differ enough to pass in one and not the other). Build-time DuckDB passing while Postgres raises is loud but late.
2. D10 `--setup` rewriting `./.env`: preserve every other line and the mode byte for byte (parse, replace one key, atomic rename); a password reset invalidates `/srv/critter-ai/critwire/.env`'s copy, so say so in AGENTS.md.
3. The two habitat stand-ins (D3) have no provenance file: give them a `data/learn/habitat.json` like `shapes.json` (source, license, sha256) so the build's sha256 check and `credits()` cover all six `data/learn/` files from data, not from a Decisions line.
4. D12 "absorbs `assertRecordKeys`": that function lives in `build/columns.ts` with the DuckDB column list; pulling it into `species.ts` imports build code into derive. Keep the key list shared and the check in one place without crossing the layer.
5. D6 reuse of `download.json`: `sameRequest` compares `{format, checklistKey, predicate}`; GBIF's echo (`sendNotification`, `interpretedExtensions`, `type`) is dropped on purpose. State that in the code comment so a later reader doesn't "fix" it to a full equality that breaks DL1.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **D6–D7: refresh dependency cycle.** Sample ingest refuses stale core outputs, while deriving those outputs requires a fresh sample. After species changes, neither command can proceed. Let sample ingest consume freshly computed core results without requiring committed derived files to match.
2. **D6: download intent is persisted too late.** Saving the returned key after POST leaves interrupted or ambiguous requests untracked, allowing duplicate downloads. Persist request intent before POST; define reconciliation before any subsequent submission.
3. **D9.6: dependency protection needs full dependency traversal.** Direct `pg_depend` edges filtered by object schema do not cover dependencies represented through internal objects, including view rules. Resolve owning objects and dependencies transitively before allowing `CASCADE`; otherwise outside objects can still disappear.
4. **D11: specify a universal secret-redaction boundary.** Environment-conflict logging must contain variable names and winning sources only. Protect every value, including `GBIF_PASSWORD` and `LEARN_PG_URL`, rather than special-casing `DATABASE_URL`.

SHOULD-CONSIDER:

1. D9.5 blocks all publication when a species retires. Support replacement relationships before retirement is needed; document this temporary limitation.
2. D10’s rollback check should inject a guaranteed constraint violation; truncating COPY can produce a successful exit.
3. Record habitat stand-ins’ provenance and hashes in machine-readable metadata, validated alongside shapes.

## Revision notes

Architect, 2026-10-28, on `281ef43`. The single revision round. I verified against `scripts/derive/pipeline.ts`, `scripts/derive.ts`, `scripts/gbif-register.ts`, `scripts/gbif/{register,state}.ts`, `scripts/env.ts`, `scripts/db.ts`, `scripts/load.ts`, `scripts/build/{inputs,columns,attribution,sources}.ts`, `scripts/species.ts`, `e2e/helpers.ts`, and the spike's `loader.ts` and `lab-keys.sql`. I also ran two rolled-back probes on `critwire_dev` (schemas `learn_t_in` and `learn_t_out`; none left behind) and made one unauthenticated GBIF call (the user-download listing returns 401, so it exists; the download's `request` echo has `checklistKey`, `format` and `predicate`).

**Fable MUST-FIX**
- MF1 (non-deterministic forced failure): fixed in D10 step 9. An injected duplicate `occurrences` row fails at the primary key after every COPY. The check asserts a non-zero exit, stderr, and unchanged counts and md5; a missing injection site fails. D15 LC covers it, and LD5/LD7 already fail deterministically. A18.
- MF2 (names-only logging): fixed in D11. One rule: name and winning source, never a value. The database name comes from `current_database()` in `loadDatabase`. G4 is now a sentinel test over `DATABASE_URL`, `LEARN_PG_URL` and `GBIF_PASSWORD`. A17.

**Fable MISSED**
- A species change costs a download and a DOI, and `--draft` doesn't lift it: stated in D7 ("Cost, stated"), in D17's `AGENTS.md` list, and in the Summary for L2. A15.
- The `replacedBy` refusal couples `/v1` to Learn: D17 adds the note next to "Retired ids get `replacedBy`", and the Summary passes it to L2. The refusal itself stays (A7).
- `assertBuilt` was blind to `dist/learn/data/`: D15 extends it to the manifest's `inputs` (the `/v1` parquet hashes and the sample sha256, D9.7) and the copied `data/learn/` hashes.
- `Source.release` typing: D4 types the subset on the attribution entry only. `Source` and `colCitation` are unchanged.

**Fable SHOULD-CONSIDER**
- SC1 (`LAB_CHECKS` fixtures in both engines): adopted. D15 LX: one clean and one violating fixture per check, in DuckDB (`test`) and Postgres (`test:db`).
- SC2 (`.env` rewrite): adopted, and extended to stop a silent password reset. The rewrite replaces one line and keeps the mode; a password is set only on creation or with `--reset-password`; `--env` takes several files; L1 also writes `/srv/critter-ai/critwire/.env` (D10 step 5, LS4–LS5, D17). A19.
- SC3 (habitat provenance): adopted. `data/learn/habitat.json` (D3); the build's sha256 check and `credits()` read it (D5, D9.7). A20.
- SC4 (`assertRecordKeys` crossing layers): adopted. It stays in `build/columns.ts`; `validateRecords` checks values only (D12).
- SC5 (`sameRequest` comment): adopted in D6, and DL1 also asserts it accepts the full echo.

**Astra MUST-FIX**
- MF1 (refresh cycle): confirmed. The old D6 had the ingest use `deriveCore` "which refuses stale derived files", while `deriveAll` refuses a stale sample, so after a species change neither could run.
  - Fixed: the ingest uses `deriveCore(readDeriveInputs())` in memory and never calls `assertDerivedFiles`. `deriveCore` refuses only stale raw snapshots, whose ingests read no derived file.
  - D7 states the order: seed, core ingests, sample ingest, derive, DOIs, build. `pnpm derive` still writes nothing while the sample is stale. DL15. A15.
- MF2 (intent too late): fixed in D6 (State, `--new`).
  - The intent `{request, startedAt, searchCount, key: null}` is written (`wx`) before the POST. It's rewritten with the key on success, kept on an ambiguous outcome, and deleted on a rejection or a final GBIF failure.
  - A key-less intent reconciles through `GET /occurrence/download/user/<user>`, matching `sameRequest` and `created` ≥ `startedAt` − 5 min: one match adopts it, and none or several refuse, as `gbif:register`'s `decide` does.
  - This reuses `state.ts`, made generic (D8), `classifyPost` with a parser argument, and a shared `postOnce`. DL8–DL14. A16.
- MF3 (transitive dependencies): fixed in D9.6 step 2. No hand-written traversal: snapshot the outside dependents, run the one `DROP … CASCADE`, diff, and raise before COMMIT.
  - The probe proved it on PG16: views and materialized views (through `_RETURN` rules), an FK with RI triggers, a column of an inside type, defaults, a function, a trigger and a policy were all caught. No false positive, TOAST included.
  - It also showed the risk is real: a non-superuser schema owner's cascade drops another role's view.
  - LD13–LD16. F2 notes why direct edges miss rules (NULL schema). A14.
- MF4 (universal redaction): fixed together with Fable MF2 (D11, G4). A17.

**Astra SHOULD-CONSIDER**
- SC1 (support replacement before retiring): documentation adopted (D17, Summary). Building the junction in L1 is rejected because `setup.sql` stays 004's byte for byte, and the junction is L2's projection and ERD change (Rejected alternatives).
- SC2 (guaranteed constraint violation): adopted, the same as Fable MF1 (D10 step 9).
- SC3 (habitat provenance): adopted, the same as Fable SC3 (D3, `habitat.json`).

## Steps

Every step:
- `M` = `/srv/critter-ai/agent-state/missions/critwire-learn-l1-data`; `SP` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike`; A1's spike = `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike`.
- **First** = failure cases written and run red before the code (Log: `red n → green n`). No test is written after its code.
- Checks: `T` = `pnpm typecheck && pnpm test`. `D` = `pnpm test:db` (from S1). `B` = plain `pnpm build`; from S14 until S16 is done, `pnpm build --draft` (no learn-sample DOI yet). `E` = `B` then `pnpm e2e`, all pass, 0 skipped. `H` = `(cd dist && grep ' \./v1/species' $M/baseline/dist.sha256 | sha256sum -c --quiet)`: 155 species files = Baseline.
- Commit `S<n>: …` (code + plan), push. A step that finishes a review item adds `<item>: done (S<n>)` under Decisions; S31 adds the shas.
- Network stderr: `2>> $M/<name>.log`. Never print `.env` values (source it with `set -a; . ./.env; set +a`).
- 004 fixes go in the commit of the code that proves them (D16); each step names its own.
- Estimate: 31 steps; with the 6 sessions so far, code review, about 2 fix steps, Verification and Release, about 42 sessions.

- [x] S1 · MF1: destination guard, names-only env log, test runners (D11, D15)
  - Files: `scripts/env.ts`, `scripts/db.ts` (`assertTarget`, `loading into <current_database()>`), `db/schema.sql` + insert (`public.species`), `package.json` (`test` = `tsx --test 'scripts/**/*.test.ts'`; new `test:db` = `'scripts/**/*.dbtest.ts'`, refusing any database but `critwire_dev`), `scripts/db.test.ts`, `scripts/db.dbtest.ts`, `AGENTS.md` (Databases: `CRITWIRE_DB_TARGET`, build and `db:load` only).
  - First: G1 (pure: missing names the variable; mismatch names both), G2 (wrong or missing target refuses before DDL; `species` oid unchanged), G3 (matching target loads), G4 (sentinel redaction).
  - Verify: `T`, `D`, `E`; full `(cd dist && sha256sum -c --quiet $M/baseline/dist.sha256)` (157/157). Decisions: MF1 done.
- [x] S2 · SC3 mirror cases: lock and statement timeouts (D11, D14)
  - Files: `scripts/db.ts` (`SET LOCAL lock_timeout` 30 s, `statement_timeout` 120 s, test overrides as parameters), `scripts/db.dbtest.ts`.
  - First: G5 (advisory lock held by a test session: short timeout refuses, naming it), G6 (insert failing after DROP: previous table and rows intact), G7 (two concurrent loads serialize, both succeed).
  - G5 proves `lock_timeout` doesn't bound advisory waits (Open risk 7): switch to `pg_try_advisory_xact_lock` + deadline; record.
  - Verify: `T`, `D`, `B`, `H`.
- [ ] S3 · `ingest naturalearth` + ingest dispatcher (D3, D4) · light network (2 pinned files)
  - Files: `scripts/http.ts` (`getBytes`), `scripts/ingest.ts` (`<source> → run()`; wikidata, col, gbif wrapped, unchanged), `scripts/ingest/naturalearth.ts` + `.test.ts`, `data/raw/naturalearth/snapshot.json`.
  - First: CD11 (sha256 mismatch refuses, writes nothing); NE1 (snapshot = 002 §6's ten fields per unit + `release`, `commit`, `fields`, `retrieved`; keys sorted; no geometry).
  - Run: `pnpm ingest naturalearth 2>> $M/ingest-naturalearth.log`.
  - Verify: `T`; `pnpm ingest` usage lists 4 sources; `pnpm derive`: no diff; `B`, `H`.
- [ ] S4 · Countries matcher + derive (D4, D7)
  - Files: `scripts/derive/naturalearth.ts` + `.test.ts` (fixtures from A1's spike `test/fixtures/`), `scripts/derive/pipeline.ts` (`deriveCore` gains countries; `derivedFiles` + `data/countries.json`), `scripts/derive.ts`, `data/countries.json`.
  - First: CD1–CD10 (port of A1's `test/countries-draft.test.ts`); NE2 (`release`, `commit` or `fields` ≠ constants → "data/raw/naturalearth is stale: run pnpm ingest naturalearth").
  - Verify: `T`; `pnpm derive` writes 250 rows, equal to `SP/data/v1/countries.json`'s (`jq`); `B`, `H`.
- [ ] S5 · `/v1/countries.*`, attribution, docs, E2E (D4, D9.2 DuckDB helper, D15)
  - Files: `scripts/build/duckdb.ts` (`openOfflineDuckDb`; `tables.ts` uses it), `scripts/build/countries.ts`, `scripts/build/attribution.ts` (Natural Earth entry; `release` typed on the attribution entry only), `scripts/build/sources.ts`, `scripts/build/inputs.ts`, `scripts/build/docs.ts`, `site/index.html` (three files, field table, `NA` note, "Used for 250 countries", reworded "same N records" line), `scripts/build.ts`; `e2e/countries.spec.ts` (new), `e2e/{docs,duckdb,attribution}.spec.ts`; 004 §1/§B (Natural Earth `release` object).
  - First: the E2E cases (D15: countries.spec incl. k01 = 0 unmatched; the attribution entry; the docs lines), red on the old build.
  - Save `/srv/apps/critwire/.live/v1/attribution.json` as `$M/baseline/attribution.json` after checking its sha256 = `dist.sha256`'s `./v1/attribution.json` line.
  - Verify: `T`, `E`, `H`; `diff <(jq -S '.sources |= map(select(.source != "Natural Earth"))' dist/v1/attribution.json) <(jq -S . $M/baseline/attribution.json)` empty; two builds give identical `dist/v1/countries.*`.
- [ ] S6 · `uv`, `.venv-learn`, habitat stand-ins (D2, D3; A1, A20)
  - Root: `uv` 0.13.5 to `/usr/local/bin/{uv,uvx}` from `SP/downloads/uv-0.13.5/` (sha256 `4bb69cf9…c403` checked first); record in `/srv/critter-ai/ops/docs/vps.md`.
  - Files: `site/learn/labs/requirements.{in,txt}` (= `SP/requirements.*`), `package.json` (`learn:venv`), `.gitignore` (`.venv-learn/`), `data/learn/{habitat_classes,country_habitats}.parquet` (byte copies of `SP/data/learn/`), `data/learn/habitat.json`.
  - First: none (no logic).
  - Verify: `uv --version` = 0.13.5; `pnpm learn:venv` twice (second a no-op); `.venv-learn/bin/python -I -c 'import shapely, pyogrio, pyarrow, numpy'` prints versions; habitat sha256 = `habitat.json` = SP's; `T`.
- [ ] S7 · Shapes ingest code: TS orchestrator + `shapes.py` (D5)
  - Files: `scripts/http.ts` (`downloadFile`: streamed, hashed, size-checked), `scripts/derive/naturalearth.ts` (gaps-allowed option), `scripts/ingest/shapes.ts` + `.test.ts`, `scripts/ingest/shapes.py`, `scripts/ingest.ts` (`shapes`).
  - First: SH1 (`downloadFile` refuses a sha256 or size mismatch, leaves no file; local `http.createServer` on port 0); SH2 (1:50m selection allows exactly BV, GI, UM as gaps; any other gap fails); SH3 (non-zero Python exit, a missing output, or a report whose rows or cross-check counts disagree: nothing written to `data/learn/`).
  - `shapes.py` fails fast: cross-check property ≠ selection; `N/A` biome or realm on `ECO_ID` ≠ 0; missing `adm1_code`. No network, no country rule, fixed writer options.
  - Verify: `T`; `.venv-learn/bin/python -I scripts/ingest/shapes.py --help`.
- [ ] S8 · LIVE shapes run + port check (D5) · RISKY: ~149 MB download, ~5 min simplification
  - Run twice: `pnpm ingest shapes 2>> $M/ingest-shapes.log`; `sha256sum data/learn/*` identical across runs.
  - Port check: `country_shapes` WKB equal per code to SP's (247 rows); `admin1_shapes`, `ecoregions`, `biomes.csv` sha256 = `SP/data/learn/`'s, or the difference explained under Decisions.
  - Files: `data/learn/{country_shapes,admin1_shapes,ecoregions}.parquet`, `biomes.csv`, `shapes.json`; 004 §4.1 (`data/learn/`, all three rebuilt by the ingest, zstd, re-measured sizes).
  - Stop: a pin's sha256 differs → never unpin; handoff item; continue at S9.
  - Verify: `T`, `B`, `H`; `du -sb data/learn`.
- [ ] S9 · Sample rules (D6)
  - Files: `scripts/learn/sample-rules.ts` + `.test.ts` (port of `SP/etl/sample_rules.py`, `SP/tests_py/test_sample_rules.py`); 004 §4.2 (cap order md5 then gbifID; a newly eligible low-hash record can displace one).
  - First: CK1–CK5; spike SC1–SC5 + the gbifID tie-break; species rule (speciesKey first; synonym via taxonKey; none fails; two fail); effective license (stricter wins; unknown fails); `countryKey` (known → code; null, ZZ, XZ → NULL; unknown fails).
  - Verify: `T`.
- [ ] S10 · Download request + SIMPLE_CSV parser (D6)
  - Files: `scripts/ingest/gbif.ts` (export `BACKBONE_KEY`, `BASIS_OF_RECORD`), `scripts/learn/download.ts` (`downloadRequest`; `sameRequest` with the comment on the omitted echo fields), `scripts/learn/simple-csv.ts` (tab split, exactly 50 fields, typed columns), tests; fixture = `request` from `SP/downloads/gbif-0041824-260928105237408/download.json`.
  - First: DL1 (builder = the spike's predicate for the 73 keys; `sameRequest` accepts GBIF's full echo), DL2 (echo missing a `checklistKey` refuses), DL3 (stored ≠ built refuses reuse); P1–P8.
  - Verify: `T`; `pnpm derive`: no diff.
- [ ] S11 · `ingest gbif-sample`, reuse path (D6; D8 state helpers)
  - Files: `scripts/gbif/state.ts` (named lock and intent: `readIntent<T>`, `createIntent`, `replaceIntent`, `deleteIntent`, `withLock(name, …)`; countries names unchanged), `scripts/ingest/gbif-sample.ts` (`--download <key>` or `download.json`'s key: status, `downloadFile`, `unzip -Z1`/`-p`, parse, species rule, counts, `/dataset` and `/organization` at ≤ 2 req/s, temp + rename of the three files), `scripts/ingest.ts`, tests (local HTTP server on port 0, fixture zip).
  - First: DL4 (zip sha256), DL5 (`totalRecords`), DL6 (per-dataset counts ≠ GBIF's listing), DL7 (unknown license, no title or no publisher: nothing written), DL15 (species from the in-memory core while `species.json` is stale); `state.test.ts` passes unchanged.
  - Verify: `T`.
- [ ] S12 · LIVE `pnpm ingest gbif-sample --download 0041824-260928105237408` (D6) · RISKY: 35 MB zip + ~6 min metadata
  - Pre: `date -u` before 2027-04-23.
  - Run: `pnpm ingest gbif-sample --download 0041824-260928105237408 2>> $M/ingest-gbif-sample.log`.
  - Must show: zip sha256 `729e9e28…806b`; stages 394,532 → 381,065 → 40,395; 400 datasets, each with title and publisher; every `checklistKey` in the echo = `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`.
  - Files: `data/raw/gbif-sample/{download.json,datasets.json,sample.csv}`. Decisions: dataset titles that differ from `SP/downloads/gbif-0041824-260928105237408/datasets.json` (A6, for L2).
  - Stop: reuse refused → Failure modes "reuse impossible". GBIF down → leave unchecked, do S13 this session.
  - Verify: `T`; `du -sb data/raw/gbif-sample` (~4.9 MB).
- [ ] S13 · `--new` path: intent before POST, reconcile (D6, D8; A16)
  - Files: `scripts/learn/download.ts` (`decideDownload`), `scripts/ingest/gbif-sample.ts` (`--new`, polling, `totalRecords` within 0.1 % of `searchCount`), `scripts/gbif/post.ts` (`postOnce` moved from `scripts/gbif-register.ts`), `scripts/gbif/register.ts` (`classifyPost(outcome, parse = parseDoi)`), tests; 004 §4.2 (intent before POST; listing reconcile).
  - First: DL8–DL14; register tests pass unchanged.
  - Not run live unless S12 proved reuse impossible.
  - Verify: `T`.
- [ ] S14 · Sample derive, DOI gate, parity (D6 Parity, D7, D9.1; MF3 sample, SC3 H5)
  - Files: `scripts/derive/sample.ts` + `.test.ts`, `scripts/derive/pipeline.ts` (`deriveAll` = `deriveCore` + `deriveLearn`; `derivedFiles` + the learn contributions), `scripts/derive.ts` (learn-sample DOI line), `scripts/build/inputs.ts` (both DOI gates; `--draft` lifts only the DOIs), `scripts/build/learn/data.ts` (occurrences writer only), `scripts/learn/sample-parity.test.ts` (`SPIKE_SAMPLE` from `SP/site/learn/data/occurrences.parquet`, query in the commit message), `data/gbif-learn-sample/contributions.json`; 004 §4.2 (contract in derive; `sampleRules`).
  - First: SD1–SD4 (malformed row; duplicate id; unknown dataset key; unknown country code not ZZ/XZ), SD5 (`pnpm derive` writes nothing while the sample is stale), F7 (request ≠ `downloadRequest`), F8 (`sampleRules` or `downloadKey` differ), H5 (plain build refuses a missing or stale DOI per target, naming it; `--draft` passes), parity (40,395 rows; md5 = `SPIKE_SAMPLE`).
  - Parity red = a port bug: fix it here. Never change `SPIKE_SAMPLE` on reuse.
  - Verify: `T`; `pnpm derive` prints `DOI current 10.15468/dd.ky9cyt` and learn-sample missing; plain `pnpm build` refuses naming learn-sample; `pnpm build --draft && pnpm e2e`; `H`. Decisions: MF3 (sample) done.
- [ ] S15 · Two registration targets (D8; SC4)
  - Files: `scripts/gbif/targets.ts`, `scripts/gbif/{register,derived-dataset,state}.ts` (`depositTag(prefix, sha)`; `readBackErrors` + `expectedDownloadDoi`; optional `originalDownloadDOI`; per-target `isCurrent` with its doc comment: counts for citation, not record identity), `scripts/gbif-register.ts` (`--target countries|learn-sample`, countries default; `deriveAll`), tests; 004 §4.2 (read-back checks the download DOI; `isCurrent` is a citation check).
  - First: RT1–RT7.
  - Then read GBIF's derived-dataset API docs on `originalDownloadDOI` + `relatedDatasets` (are our counts kept?) and record the answer under Decisions. Unclear → handoff item; S16 waits; continue at S17.
  - Verify: `T`; `pnpm derive` still `DOI current 10.15468/dd.ky9cyt`; `git diff --exit-code data/gbif-derived-dataset/`. Decisions: SC4 done.
- [ ] S16 · LIVE registration `--target learn-sample` · RISKY: the mission's one network write
  - Pre: S14 parity green; S15's docs answer recorded; `date -u` before 2027-04-23; clean tree.
  - Run: `pnpm derive` (prints `gbif-learn-<hex12>`); commit and push if anything changed; `git tag gbif-learn-<hex12> && git push origin gbif-learn-<hex12>` (tag = pushed HEAD); `pnpm gbif:register --target learn-sample 2>> $M/gbif-register-learn-sample.log`; `pnpm derive` → `learn-sample DOI current <doi>`; commit `data/gbif-learn-sample/registration.json`, push.
  - Never re-POST by hand, move or delete a tag, or delete a lock or intent except as its message says. Ambiguous POST → re-run next session (it reconciles).
  - Verify: plain `pnpm build` passes again; `pnpm e2e`; `H`. Decisions: the DOI, and the download's `eraseAfter` from `GET /occurrence/download/0041824-260928105237408` after registering.
- [ ] S17 · `writeLearnData` core, `childFile`, `data/learn/` provenance check (D5, D9.1–9.3)
  - Files: `scripts/build/learn/data.ts` (`datasets.csv`; byte copies of the six `data/learn/` files), `childFile` (D9.2) on every computed output path, `scripts/build/inputs.ts` (each `data/learn/` file's sha256 against `shapes.json`/`habitat.json`), `scripts/build.ts` (D9.1 flow), tests.
  - First: LP1 (a hand-edited `data/learn/` file is refused), LP2 (a file neither provenance file lists), LP3 (a listed file missing); CF1 (`childFile` refuses `..`, `/`, an absolute path, empty).
  - Verify: `T`, `E`, `H`; `ls dist/learn/data`.
- [ ] S18 · Projection + `LAB_CHECKS` in DuckDB (D9.4, D9.5; SC1, SC5 build half)
  - Files: `site/learn/sql/setup.sql` (`cmp` = `SP/src/setup.sql`), `scripts/build/learn/projection.ts` (`setup.sql` over `dist/v1` + `dist/learn/data`; the six lab tables from the copies; `assertLearnProjection`), `scripts/build/learn/checks.ts` (`LAB_CHECKS`, `LAB_CHECK_FIXTURES`), `checks.test.ts`, `projection.test.ts`, `scripts/build/inputs.ts`.
  - First: PJ1–PJ3 (shared external id: names column, value, ids and the fix; a taxon name with two ranks or parents; `replacedBy` refused); LX, DuckDB half (every check 0 on clean, 1 on violating, incl. `'Infinity'`, NaN, negative uncertainty, month 13).
  - Verify: `T`, `E` (the build's `LAB_CHECKS` all 0), `H`. Decisions: SC1 done.
- [ ] S19 · `critwire_lab` + `learn:check --setup` (D10 connection and setup; SC7)
  - Files: `scripts/learn/pg.ts`, `scripts/learn-check.ts` (`--setup [--env <file>]… [--reset-password]` only), `package.json` (`learn:check`), the `test:db` lab harness (`critwire_lab` via `LEARN_PG_URL`, `learn_t_*` schemas, lab lock), `scripts/learn/setup.dbtest.ts`, `scripts/learn/pg.test.ts`; 004 §0 and §3.2 (the role, CONNECT and TEMPORARY, a disposable lab database recommended).
  - First: LS1–LS5 (on a `learn_t_` role and temp `.env` files; never resets `critwire_lab`); LC1 and LC10 at the `pg.ts` level (name refusal from the URL, `PGDATABASE` or the default user; the child env has no `DATABASE_URL`, `GBIF_*` or password in argv).
  - Run as `critter-ai`: `pnpm learn:check --setup --env .env --env /srv/critter-ai/critwire/.env`, then again (idempotent, no reset).
  - Verify: `T`, `D`; `grep -c '^LEARN_PG_URL=' .env /srv/critter-ai/critwire/.env` = 1 each; both modes unchanged (`stat -c %a`); `learn_curriculum`'s owner = `critwire_lab`.
- [ ] S20 · Loader core (D9.6 steps 1 and 3–9, without the guard and CHECKs)
  - Files: `scripts/build/learn/loader.ts` (port of `SP/scripts/loader.ts`, schema parameter, `lock_timeout`), `db/learn/{lab-ddl,lab-keys}.sql` (from SP), `scripts/build/learn/data.ts` (writes `postgis/learn_curriculum.sql`), `loader.test.ts`, `loader.dbtest.ts`.
  - First: LD1–LD4, LD10, LD11 (`test`); LD5–LD9, LD12 (`test:db`).
  - Verify: `T`, `D`, `E`, `H`; `psql -X -v ON_ERROR_STOP=1 -d "$LEARN_PG_URL" -f dist/learn/data/postgis/learn_curriculum.sql` twice: the 14 counts = 004 §4.3's.
- [ ] S21 · MF4 dependency guard, SC5 CHECKs, `LAB_CHECKS` at load (D9.6 steps 2, 4, 8; A14)
  - Files: `scripts/build/learn/loader.ts`, `db/learn/lab-ddl.sql`, `scripts/build/learn/checks.dbtest.ts`, `loader.dbtest.ts`; 004 §3.2 (schema separation isn't dependency isolation; the loader refuses), §4.3 (guard, CHECKs, `LAB_CHECKS`, `lock_timeout`, Open risk 9's gap), §6.2 (year and uncertainty bounds; NULL = unknown).
  - First: LD13–LD18; LX, Postgres half.
  - Verify: `T`, `D`, `E`, `H`; S20's manual load twice. Decisions: MF4 done; SC5 done.
- [ ] S22 · Credits, manifest, index page, cap (D9.2, D9.7–9.9; SC2)
  - Files: `scripts/build/learn/credits.ts`, `scripts/build/learn/page.ts`, `site/learn/data/index.html`, `scripts/build/html.ts` (`esc`, `link`, `fillSlots` moved from `docs.ts`), `site/style.css` + `{{style}}` slot (`dist/index.html` CSS bytes unchanged), `scripts/build/learn/data.ts` (manifest, page, dist cap), `scripts/build/inputs.ts` (committed-data cap), `site/index.html` (link to `/learn/data/`); 004 §4.4 (the committed directories), §4.5 (manifest: `inputs`, `dois`, `tables`).
  - First: ST4 (no sources; unknown source; license not in `LICENSE_URLS`; CC BY without citation; dataset without title or publisher); CAP1–CAP3.
  - Verify: `T`, `E`, `H`; two builds give identical `dist/learn/data/` sha256s; both totals printed, each < 50,000,000. Decisions: SC2 done.
- [ ] S23 · `learn:check` loader stage (D10 checks 1–8, 10, 11)
  - Files: `scripts/learn-check.ts`, `db/learn/canary.sql`, `site/learn/sql/pg-role-smoke.sql` (own BEGIN/ROLLBACK), `scripts/learn-check.dbtest.ts`.
  - First: LC1–LC5, LC7, LC8, LC10 (spawning the CLI).
  - Run: `pnpm build && pnpm learn:check`: two loads, counts = manifest `tables`, canary equal, no leak (`critwire_lab` ignored).
  - Verify: `T`, `D`.
- [ ] S24 · `learn:check` forced failure + cleanup (D10 check 9 and Cleanup; A18)
  - Files: `scripts/learn-check.ts`, `scripts/learn-check.dbtest.ts`; 004 §7.6 (the role, `--setup`, the canary's identity, the forced failure).
  - First: LC6 (injected duplicate row: exit ≠ 0, stderr names the key, 14 counts and per-table md5 unchanged; no injection site → "loader layout changed"); LC9 (SIGINT mid-run: lock free, no temp file or role left); a failing check releases the lock too.
  - Verify: `T`, `D`; `pnpm learn:check` twice, exit 0. Decisions: SC7 done.
- [ ] S25 · E2E `learn-data` + `assertBuilt` (D15 E2E; 004 §7.7)
  - Files: `e2e/learn-data.spec.ts` (every D15 learn-data bullet; screenshots `learn-data-1280.png`, `learn-data-375.png` in `E2E_ARTIFACTS`), `e2e/helpers.ts` (`assertBuilt` per D15); 004 §7.7 (the L1/L2 split of learn-data).
  - First: run red against a tampered `dist/` (one byte changed in `dist/learn/data/datasets.csv`; a stale `inputs` sha in `manifest.json`): the sha256 case and `assertBuilt` fail; then rebuild.
  - Verify: `T`, `E` (0 skipped), `H`.
- [ ] S26 · `AGENTS.md` + remaining 004 fixes (D16, D17)
  - Files: `AGENTS.md` (the copy line verbatim from Notes; commands; data list; refresh order and its cost; the `replacedBy` note; databases; stack; DOI refresh per target), `plans/004-learn-curriculum.md` (d2: exports written from JSON, the mirror is a check; any D16 bullet not yet in).
  - Verify: `grep -cF` the new copy line = 1, the old = 0; each D16 bullet located in 004 (listed in Log); `T`. Decisions: 004 corrections done.
- [ ] S27 · MF2 record validator (D12) · review item: to L3 if past 48 sessions
  - Files: `scripts/species.ts` (`validateRecords`), `scripts/derive/pipeline.ts`, `scripts/load.ts` (+ `assertRecordKeys`), `scripts/build/inputs.ts` (value checks moved out), `scripts/derive/wikidata.ts` (P3151, P685 int32; P846 safe integer), `scripts/build.ts` (`childFile` on species paths), tests.
  - First: V1–V10 (one per D12 value rule, plus the Wikidata ranges).
  - Verify: `T`, `D`, `E`, `H`.
- [ ] S28 · MF2 issued ids (D12) · review item
  - Files: `scripts/species.ts`, `scripts/derive/pipeline.ts` (`derivedFiles` + `data/issued-ids.json`), `data/issued-ids.json`.
  - First: V11–V16 (pair gone; slug changed; an issued slug under another id; retired record kept; union sorted and append-only; first write).
  - Verify: `T`; `diff <(jq -c 'map({id,slug}) | sort_by(.id)' $M/baseline/live-species.json) <(jq -c 'sort_by(.id)' data/issued-ids.json)` empty; `E`, `H`. Decisions: MF2 done.
- [ ] S29 · MF3 for GBIF and COL (D13) · review item
  - Files: `scripts/derive/pipeline.ts` (`assertGbifFresh`, `assertColFresh` replace the name-set and `taxonKey` checks), `scripts/ingest/{gbif,col}.ts` (export the URL builders), tests.
  - First: F1–F6 (match URL; occurrences URL; datasets URL; checklist key; occurrences ⇔ SPECIES; COL URL).
  - Verify: `T`; `pnpm derive`: no diff; `B`, `H`. Decisions: MF3 done.
- [ ] S30 · SC3 leftovers (D14) · review item
  - Files: `scripts/http.ts` (Retry-After above 60 s stops), `scripts/json.ts` (`readJson` names the file), `scripts/ingest/gbif.ts` (export `toDatasetPage`), `scripts/derive/pipeline.ts` (`assertDerivedFiles` names the file).
  - First: H1 (local server, port 0), H2, H3, H4.
  - Verify: `T`; `pnpm derive`: no diff; `E`, `H`. Decisions: SC3 done (G5–G7, G6/LD5/LD7/LC6, F1–F8, H1–H5).
- [ ] S31 · Review-items audit
  - Every row of "Review items assigned to L1" and addendum items 1–11 has a Decisions line: `done (S<n>, <sha>)` (`git log --oneline --grep '^S<n>:'`) or `handed to L3 (H<n>)`. None dropped.
  - Every D16 bullet is in 004 and every D17 bullet in `AGENTS.md` (grep; listed in Log).
  - Dry run: `T`, `D`, `E`, `H`, `pnpm learn:check`. A gap → a new step before Verification.

## Verification

Once, on the final commit (after any code-review fixes), clean tree, in this order. `M`, `SP` as in Steps. Log each result; the numbers go to the Summary.

1. **Build:** plain `pnpm build` passes; its size listing shows `dist/learn/data/` and the committed lab data each under 50,000,000 bytes.
2. **E2E (primary):** `E2E_ARTIFACTS=$M/e2e pnpm e2e`.
   - Specs: `attribution`, `docs`, `duckdb`, `files`, `serving`, `countries`, `learn-data`.
   - `jq .stats $M/e2e/results.json`: `unexpected` 0, `skipped` 0, `flaky` 0.
   - Artifact in `$M/e2e/`: `playwright-report/index.html`; one `trace.zip` per test (`find $M/e2e/test-results -name trace.zip | wc -l` = `.stats.expected`); `results.json`; `learn-data-1280.png`, `learn-data-375.png`; `caddy-access.log`.
   - Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
3. **Static and isolated tests:** `pnpm typecheck`; `pnpm test` (CD, CK, spike SC, P, DL, SD, RT, LD pure, LX DuckDB, PJ, LP, CF, CAP, ST4, V, F, H, G1, G4, parity); `pnpm test:db` (G2, G3, G5–G7, LD5–LD18, LX Postgres, LS, LC). Afterwards no `learn_t_%` schema or role in `critwire_dev` (`psql -d critwire_dev -Atc`).
4. **DOIs:** `pnpm derive` prints `DOI current 10.15468/dd.ky9cyt` and `learn-sample DOI current <doi>`; `git status --porcelain` empty.
5. **Existing files unchanged** (Baseline in `$M/baseline/`):
   - `(cd dist && grep ' \./v1/species' $M/baseline/dist.sha256 | sha256sum -c --quiet)`: 155 files, exit 0.
   - `diff <(jq -S '.sources |= map(select(.source != "Natural Earth"))' dist/v1/attribution.json) <(jq -S . $M/baseline/attribution.json)` empty, and `jq '[.sources[] | select(.source == "Natural Earth")] | length' dist/v1/attribution.json` = 1. `index.html` may differ.
   - Issued ids = the live registry: S28's `diff` empty.
6. **The sample is the spike's:**
   - `sample-parity.test.ts` green (step 3).
   - One-off DuckDB (`@duckdb/node-api`): the 12 columns as VARCHAR; `dist/learn/data/occurrences.parquet` `EXCEPT ALL` `SP/site/learn/data/occurrences.parquet` = 0 rows, and the reverse = 0; both 40,395 rows.
   - `jq '[.. | objects | .checklistKey? // empty] | unique' data/raw/gbif-sample/download.json` = `["d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"]`; every dataset in `datasets.json` has a non-empty title and publisher.
7. **The loader:**
   - `psql -d critwire_dev -XAtf db/learn/canary.sql > $M/canary-before.txt`.
   - `pnpm learn:check` twice, each exit 0: two loads with equal 14 counts = manifest `tables`; the forced failure exits non-zero with counts and md5 unchanged; `pg-role-smoke` 0; no leak.
   - Canary again: `diff` with `$M/canary-before.txt` empty.
   - The 14 counts = 004 §4.3's (`occurrences` 40,395, `datasets` 400, …), or each difference recorded with its 004 commit; 004's `lab-credits` on `learn_curriculum`: 0 rows.
8. **Caps:** `find dist/learn/data -type f -printf '%s\n' | awk '{s+=$1} END {print s}'`, and the same over `data/raw/gbif-sample data/learn data/gbif-learn-sample`: each < 50,000,000. CAP1–CAP3 (step 3) prove the refusal.

**Release smoke** (the Release unit, after `gh pr merge` and `deploy critwire`; `L` = `https://critwire.com`):
- `$L/v1/countries.{json,csv,parquet}`: 200; JSON 250 rows, CSV 251 lines, Parquet 250 rows; bytes = `dist/v1/countries.*`.
- `$L/learn/data/` and `$L/learn/data/manifest.json`: 200. Every manifest file: 200, sha256 and bytes as the manifest says.
- Every Baseline `/v1/species*` file hashes as `$M/baseline/dist.sha256` (155); `$L/v1/attribution.json` passes step 5's `jq` diff.
- `$L/learn/data/postgis/learn_curriculum.sql` downloaded to a temp folder, sha256 = manifest; `psql -X -v ON_ERROR_STOP=1 -d "$LEARN_PG_URL" -f <file>` (database `critwire_dev`, as `critwire_lab`, so `learn_curriculum` keeps its owner); `pg-smoke`'s 14 counts = manifest `tables`.
- `## Release` records the merge commit, `deploy`'s last line, these results and the log path.

## Failure modes

What can go wrong across steps, and what the session does. `MISSION_BLOCKED` only when no other step can proceed.
- **GBIF, GitHub or PyPI unreachable** (S3, S6, S8, S12, S16): leave the step unchecked, Log it, do the next step that doesn't need its output (S12 → S13; S16 → S17 on; S8 → S9); retry next session.
- **Spike download not reusable** (S12: erased, status ≠ SUCCEEDED, zip sha256 ≠ `729e9e28…806b`, `totalRecords` ≠ 394,532, `sameRequest` false), **or 2027-04-23 has passed:** record under Decisions; add a step after S13 for `pnpm ingest gbif-sample --new` (≈17 min wait); re-measure 004 §4.2's numbers and update 004 and `SPIKE_SAMPLE` in that commit (004 §9); add a handoff item (it re-runs 004's results and adds sessions here and in L2; blocks nothing).
- **Ambiguous download POST** (only if `--new` runs): keep the intent; the next session reconciles through the listing; never a second POST. Still no match → handoff item; don't delete the intent.
- **Parity red** (S14): a port bug (parse, typing, cap tie-break). Fix before S16.
- **GBIF docs unclear on `originalDownloadDOI` + `relatedDatasets`** (S15): handoff item; S16 waits; S17–S31 build with `--draft`. Still unanswered at Verification → `MISSION_BLOCKED: learn-sample DOI`.
- **Registration interrupted or ambiguous** (S16): re-run `pnpm gbif:register --target learn-sample` next session (it reconciles before any POST). Delete a lock or intent only as its error says; never move or delete a `gbif-learn-*` or `gbif-dd-*` tag.
- **Read-back mismatch after a DOI is minted** (Open risk 1): stop S16; handoff item with the DOI and the mismatching fields; continue at S17.
- **A pinned file's sha256 differs** (S3, S8): never unpin; handoff item (upstream changed); continue with independent steps.
- **Shapes not byte-identical on a re-run, or the port check differs** (S8): fix the writer options; an explained difference (tool versions) goes under Decisions with 004 §4.1's numbers.
- **A missing aarch64 wheel** (S6): handoff item; S9–S16 need no Python.
- **Cap breach** (S22 on): stop; 004 §4.4's cut order is a design change (Decisions + 004); anything that changes what's published goes to the owner.
- **The MF4 guard refuses the first real load** (the spike's leftover has outside dependents): list them; never drop them by hand; handoff item if they aren't this mission's.
- **`critwire_lab` setup refused** (S19: CREATE on `public`, `postgis` missing): fix as superuser in `critwire_dev` only; never touch `critwire` or `learn_spatial`; record.
- **`CRITWIRE_DB_TARGET` missing from `/srv/apps/critwire/.env` at release:** `deploy` fails; don't edit `deploy`; handoff item for the control room; `Result: failed`, `MISSION_BLOCKED`.
- **Plain build red from S14 until S16:** expected (no learn-sample DOI); use `--draft` there only.
- **Session budget:** at each session start, `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l1-data.log`. Past 48: start no review step (S27–S30). For each unfinished one, add a handoff item for L3 (what's left, its D-section), check the step off as `handed to L3 (H<n>)`, record it under Decisions, and go on to S31, the code review, Verification and Release. S1–S26 hold Goal work and are never deferred.

## Code review (Astra)

## Release

## Decisions

- A1 (architect): Python via `uv` 0.13.5, installed as root to `/usr/local/bin` from the spike-verified tarball and recorded in ops `vps.md`; `.venv-learn` on system CPython 3.12.3 with 004 §3.3's pins. Plain `python3 -m venv` is broken here (no `ensurepip`) and the pins are compiled with `uv` anyway. L4 reuses the venv (D2).
- A2 (architect): the sample ingest is in TypeScript (HTTP, `unzip -p`, tab split, rules in `scripts/learn/sample-rules.ts`, shared with derive). The shapes ingest is TypeScript orchestration (downloads, pins, 002 §6's matcher at 1:50m) plus a Python script for geometry only, so the matching rule exists once (D5, D6).
- A3 (architect): file layout per D3. Lab snapshots go in `data/learn/`; the sample's derived dataset in `data/gbif-learn-sample/`; ids in `data/issued-ids.json` (append-only, written by derive).
- A4 (architect): the country-key contract is applied in derive, not the ingest, so `sample.csv` doesn't depend on `countries.json` and a countries fix needs no GBIF re-ingest. This is a deviation from the brief's wording, recorded in 004 §4.2 (D7).
- A5 (architect): RESOLVE tolerance fixed at 0.05° (004's value), with no probe loop. Cap order: md5 of the decimal gbifID, then gbifID (004 §4.2 correction).
- A6 (architect): on reuse, the spike's per-taxon comparison with live search counts is not re-run (counts drift; the zip's sha256 and `totalRecords` prove the download). Dataset metadata is re-read live, and titles that moved are listed for L2.
- A7 (architect): SC1. External-id UNIQUE stays in the projection (d1 teaches it, and every id is unique today; `ids.gbif` is unique by construction). A shared id fails the build with the documented fix. Retired records fail the Learn projection until a replacement junction exists (D9.5).
- A8 (architect): SC7. `critwire_lab` is created by `learn:check --setup`, and `LEARN_PG_URL` is written to `./.env`. The `learn_spatial` canary is read as libpq's socket default (critter-ai), never through grants on A2's schema (D10).
- A9 (architect): order. MF1 first; the review items that live in Goal code are built with it; MF2, MF3 (GBIF/COL) and the SC3 leftovers come after the Goal and go to L3 first if sessions pass 48 (D1).
- A10 (architect): attribution's Natural Earth `release` is `{version, issued}`, a subset of COL's release keys, not 002 §6's bare string, so one key keeps one type (D4).
- A11 (architect): no teaching diagram in L1. The docs page links to `/learn/data/`; L2 points it at `/learn/`.
- A12 (architect): `pnpm test` stays pure and offline; database cases go in a new `pnpm test:db` (`*.dbtest.ts`), on `critwire_dev` only, using `learn_t_*` schemas (D15).
- A13 (architect): Retry-After above 60 s stops with a clear error instead of being silently shortened (D14).
- A14 (architect, revision): the MF4 guard runs *drop, then diff* inside the loader's transaction. It snapshots the outside dependents in `pg_depend`, with rules, triggers, defaults and policies resolved to their relation's schema and `pg_toast` excluded. It runs `DROP SCHEMA … CASCADE` and raises before COMMIT if any snapshot entry vanished. Postgres computes the cascade itself. Proven on PG16 by rolled-back probes in `critwire_dev` (about 0.85 s). The sub-second gap for concurrent DDL is accepted (Open risks 9) (D9.6).
- A15 (architect, revision): the refresh order is one line, with no cycle. `ingest gbif-sample` computes the core in memory and never asserts committed derived files. `pnpm derive` refuses a stale sample and writes nothing. A species or `ids.gbif` change costs a new download and DOI, `--draft` doesn't lift it, and it goes in `AGENTS.md` (D6, D7, D17).
- A16 (architect, revision): a new GBIF download writes its intent before the POST. A key-less intent reconciles through the user's download listing, and no match or several matches refuse rather than re-POST. `state.ts` and `classifyPost` are shared with `gbif:register`, and `postOnce` moves to `scripts/gbif/post.ts` (D6, D8).
- A17 (architect, revision): environment-conflict logging is names and the winning source only, for every variable. The database name logged is `current_database()`, from `loadDatabase` (D11).
- A18 (architect, revision): `learn:check`'s forced failure injects a duplicate `occurrences` row, which fails at the primary key after every COPY. It asserts a non-zero exit, unchanged counts and unchanged md5 (D10).
- A19 (architect, revision): `learn:check --setup` sets `critwire_lab`'s password only on creation or with `--reset-password`. It writes `LEARN_PG_URL` into each `--env` file, keeping the other lines and the mode. L1 writes the worktree's and `/srv/critter-ai/critwire/.env`, so later missions inherit it (D10).
- A20 (architect, revision): the habitat stand-ins get `data/learn/habitat.json` (provenance and sha256, `standIn: true`), checked by the build and read by `credits()`. L3's `ingest habitat` takes it over (D3, D5, D9.7).
- A21 (planner): step order. MF1's guard (S1) is split from its SC3 mirror cases (S2). The live reuse ingest (S12) comes before the `--new` path (S13), so the network read happens early. The live registration (S16) comes right after parity (S14) and the targets (S15). `--setup` (S19) comes before the loader (S20–S21), so the loader's `test:db` cases are written before its code. MF2, MF3 for GBIF/COL and the SC3 leftovers come last (S27–S30) and are the first to go to L3 past 48 sessions. Review-item lines say "done (S<n>)"; S31 adds the shas.
- MF1: done (S1). Guard in `loadDatabase` (`assertTarget` on `current_database()` before the lock and DDL); `public.species`; `loadEnv` via `parseEnv`, names-only conflict log. G4 lives in `scripts/env.test.ts` (it tests `env.ts`) plus G4's `loadDatabase` half in `db.dbtest.ts`; `test:db` runs files with `--test-concurrency=1` (one shared `critwire_dev`) and refuses other dbs through `scripts/test-db.ts`.
- S2: Open risk 7 closed. `lock_timeout` (set with `set_config(…, true)`, = `SET LOCAL`) bounds `pg_advisory_xact_lock` waits on PG16: G5 refused at ~0.3 s. No switch to `pg_try_advisory_xact_lock`. The 55P03 error is rethrown naming `critwire.load` and the wait. G6/G7 were green before the change (the existing transaction + advisory lock already gave them); kept as SC3 regression cases.
- A22 (planner): Release smoke loads the live loader with `psql -X -v ON_ERROR_STOP=1 -d "$LEARN_PG_URL" -f` (still `critwire_dev`, as `critwire_lab`), not the brief's `-d critwire_dev` as superuser: a superuser load would leave `learn_curriculum` owned by `critter-ai`, so `critwire_lab` (and L2's `learn:check`) could no longer replace it.

## Log

- 2026-10-28 06:49 UTC Baseline: typecheck ok, test 66/66, build ok (dist = live), e2e 20/20; baseline hashes + live species.json saved.
- 2026-10-28 07:16 UTC Architecture: architect wrote F1–F13, D1–D19, review-item map, risks; decisions A1–A13 (uv as root, TS sample ingest, data/issued-ids.json, critwire_lab via --setup, no L1 diagrams). Plan-only, no code; no checks needed.
- 2026-10-28 07:22 UTC Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (deterministic learn:check forced failure; loadEnv logs names only), 4 missed, 5 SHOULD-CONSIDER. Plan-only; no checks needed.
- 2026-10-28 07:23 UTC Astra review: APPROVE_WITH_CHANGES, 4 MUST-FIX (sample/derive refresh cycle; download intent before POST; transitive pg_depend; redact all env values), 3 SHOULD-CONSIDER. Plan-only; no checks needed.
- 2026-10-28 07:35 UTC Revision: architect resolved all 6 MUST-FIX (deterministic forced failure; names-only env logs; in-memory core for sample ingest, no cycle; intent before POST + listing reconcile; CASCADE snapshot/diff guard, PG16-probed), 4 MISSED, 9/10 SC adopted (Astra SC1 junction rejected → L2); A14–A20. Plan-only; no checks needed.
- 2026-10-28 07:48 UTC Steps: planner wrote S1–S31 (MF1 first; countries; shapes; sample + live reuse ingest; live registration S16 right after parity; loader, learn:check, E2E; review items S27–S30 last), Verification, Failure modes; A21–A22. Plan-only; no checks needed.
- 2026-10-28 07:50 UTC S1: MF1 guard, names-only env log, `test`/`test:db` runners. Red 7 (G1×3, G4, G2×2, G3) → green: test 70/70, test:db 3/3 (and refuses db `postgres`); typecheck ok; build ok; e2e 20/20; dist 157/157 = Baseline.
- 2026-10-28 07:55 UTC S2: `loadDatabase` lock_timeout 30 s / statement_timeout 120 s (test overrides), named lock-timeout error. Red 1 (G5; G6, G7 green already) → green: test:db 6/6, test 70/70, typecheck ok, build ok, H 155/155.

## Summary
