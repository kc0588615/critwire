# Mission brief: critwire Learn, build part 1: countries file, engine, ERD and the 16 lessons (mission B1)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-b1.md, then run:
     mission start critwire <that file>        (base: main with plans/002-learn.md merged)
     Start only after the owner has reviewed plans/002-learn.md and answered its §10 choices.
     Written by mission A1 (critwire-learn-design), step S21. Design: plans/002-learn.md. Part 2: plans/briefs/critwire-learn-b2.md,
     started only after this mission is live.
     Estimate: about 32–38 sessions (6 pipeline stages, about 25 steps, code review, verification, release). -->

## Goal

critwire.com gets its first new data file and the core of **critwire Learn**, built exactly as `plans/002-learn.md` designs them:
- **`/v1/countries.{parquet,csv,json}`** (002 §6): one row per country code from Natural Earth v5.1.2 admin-0 attributes, 250 rows, every species country code matching, credited in `attribution.json`, listed on the docs page. Every existing `/v1` file keeps its exact bytes.
- **The engine** (002 §1): DuckDB-WASM 1.33.1-dev65.0, `eh` bundle only, in a worker, self-hosted under `/learn/assets/`, with the `parquet` extension from critwire's own mirror; one engine start per visit; loud start failures; results capped by streaming; Reset and Stop by restart.
- **The learners' schema** (002 §2): `setup.sql` builds the six tables and the view from `/v1/species.parquet` and `/v1/countries.parquet`.
- **The ERD** (002 §3): `site/learn/schema.mmd` and its committed `schema.svg`, rendered offline by `pnpm erd`, stale-checked by `pnpm build`; `/learn/schema/` with the data dictionary; a Schema dialog on every lesson.
- **The 16 lessons** (002 §4) at `/learn/<slug>/`, with the path index `/learn/`: editors, Run, cards with photo credits and the no-photo state, "Your turn" with Check and Show answer, keyboard and screen-reader use, readable before the database loads.
- **Its E2E specs** (002 §8 "E2E", B1): `learn.spec.ts`, `schema.spec.ts`, `countries.spec.ts`, plus the additions to `serving.spec.ts`, `docs.spec.ts` and `duckdb.spec.ts`.
- It's live: the mission merges and deploys at its end (owner's standing decision, 2026-10-21).

## Why

critwire Learn teaches people aged 16 and up relational databases and SQL with critwire's own animals, and every query on the page must work, because a broken example teaches the wrong thing. The design was researched, measured and run query by query in mission A1; this mission builds the part learners need first, so that B2 (cookbook, playground, game) only adds pages.

## Scope

In:
- `data/raw/naturalearth/`, `data/countries.json`, `scripts/ingest/` (a `naturalearth` source), `scripts/derive/naturalearth.ts` and its tests, `scripts/build/` (`template.ts`, `learn.ts`, attribution and docs changes, the countries writer), `site/style.css`, `site/index.html`, `site/learn/` (002 §8's file layout, without the cookbook, playground and play page fragments), `e2e/`, `package.json` and the lockfile (the three pins below), `tsconfig` files, `AGENTS.md` (the new commands and files), `plans/002-learn.md` (relabelling `draft-table` blocks `ran`; noting deviations).
- `/learn/` and its links from the docs page; `/learn/schema.svg`; `/learn/assets/`.
- Reading the A1 spike at `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/` and porting its modules (`src/engine.ts`, `sql.ts`, `cards.ts`, `check.ts`, `format.ts`, `setup.sql`, `scripts/erd.ts`, `erd-model.ts`, `countries-draft.ts`) and its tests' failure cases. Never edit the spike.

Out:
- The cookbook page, the playground, the game, `/play/`: B2.
- Caddy (`/etc/caddy`, the ops Caddyfile) and `e2e/Caddyfile`'s headers. Learn works on today's Caddy (002 §1 Q3); header changes are B2's, if the owner approves them.
- The DuckDB shell, `mvp` and `coi` bundles, PGlite (002 §1 rejected them).
- Changing any existing `/v1` file's shape or bytes; `db/schema.sql` (002 §6: no Postgres copy of the countries).
- A2's work: spatial, rasters, new datasets, IUCN. No IUCN data of any kind, and no Wikipedia prose.
- The `critwire` database, except through `deploy critwire` at the release.

## Definition of done

- `pnpm typecheck` (root and `site/learn/tsconfig.json`), `pnpm test` (including the Natural Earth matcher's tests, ported from the spike's CD1–CD10) and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped, including `learn.spec.ts`, `schema.spec.ts` and `countries.spec.ts` with every case 002 §8 lists for B1. Every lesson SQL file (`site/learn/sql/l*.sql`) runs in its page in E2E, every exercise accepts its answer and rejects the fixed wrong one, and no request leaves the origin except to the two Wikimedia photo hosts (answered by a fixture).
- **Existing `/v1` files unchanged:** at Baseline, save the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`. The final build matches it for every `species.*` and `species/*` file; `attribution.json` differs only by the one Natural Earth entry (checked with `jq`); `index.html` may change.
- **The countries file:** 250 rows, `k01` (002 §6) returns 0 unmatched against the built file; derive refuses a missing code and a stale snapshot, as 002 §6 says.
- **002's queries re-run:** the `draft-table` blocks in `plans/002-learn.md` are relabelled `ran` and re-run against the built `/v1/countries.parquet` with the spike's `run-queries.ts --check --erd` (paths in 002 §3), with no result difference.
- **Measured:** the pristine-references step (002 §1) takes at most 10 % of setup time on desktop and under the spike's 4× CPU quota, or the fallback 002 §1 names is built; the numbers go in the plan.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-b1/e2e/`: the Playwright HTML report, a trace per test, `results.json`, and the screenshots 002 §8 names (lesson 9's cards and lesson 4's no-photo state at 1280 and 375 px, light and dark; a check's verdict; the Schema dialog; `/learn/schema/`), reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every `/learn/` page and `/learn/schema.svg` returns 200; `/v1/countries.*` return 200 with 250 rows; every existing `/v1` file hashes as at Baseline (except `attribution.json`, as above); the engine `.wasm` and the extension are `application/wasm`; one headless Chromium run against https://critwire.com/learn/many-to-many/ draws lesson 9's Brazil cards with credits.
- The plan's Summary gives: what shipped, the E2E counts and artifact path, the pristine-references timing, every deviation from 002, the release record, and anything B2 needs to know.

## Decision rules

- **002 is the design.** Build what it says; where code shows it's wrong or impossible, choose the simplest fix, record it under Decisions, and update 002 in the same commit.
- **Simplest approach that works**, no server process, no web framework: static pages from `pnpm build`, one esbuild bundle (002 §8).
- **Self-host everything** from pinned packages; the build stays offline. No CDN, ever.
- **Data rules from `AGENTS.md` hold:** snapshot committed, derive offline and pure, build from `data/`, never hand-edit derived files, every third-party field credited.
- **Standard SQL in lessons**; DuckDB-specific SQL only in `setup.sql` and lesson 14, labelled.
- **Countries are "recorded there in open records"**, never native range, in every page and string.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.
- The owner's answers to 002 §10 override this brief where they differ. Without an answer, use 002's recommendation.

## Notes

- **Pins (002 §8):** `@duckdb/duckdb-wasm` 1.33.1-dev65.0 (DuckDB v1.5.6, same as the repo's `@duckdb/node-api` 1.5.6-r.2) and `esbuild` 0.28.2 in `dependencies`; `mermaid` 12.2.0 in `devDependencies`. None has an install script, so `allowBuilds` stays as it is (A1 Decisions). pnpm doesn't hoist: each must be a direct dependency. 1.33.1-dev65.0 (npm tag `next`, 2026-09-29) is past pnpm's release-age gate, so no exclude is needed.
- **The parquet extension** isn't an npm package: `site/learn/duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm` (3.22 MB) is committed (002 §8), byte-identical to `extensions.duckdb.org/v1.5.6/wasm_eh/`, sha256 `33094a01b3a1dc27c4158f4c1fa13c45c240eea6ba07197a19a1925f002ca473` (the spike's `downloads/SOURCES.md`), and `writeLearn` checks its sha256. If the owner chose a pinned download instead (002 §10), make it an ingest-like fetch with a sha256 check, never a build-time download.
- **Facts the spike proved** (002 §1, A1 Decisions), each a trap if forgotten:
  - duckdb-wasm statically links only `core_functions`; `parquet` must be `LOAD`ed from the mirror, with `autoinstall_known_extensions` and `autoload_known_extensions` off and `custom_extension_repository` set to `<origin>/learn/assets/duckdb-ext`.
  - A missing engine `.wasm` makes `instantiate` hang without an error: `HEAD` it first. A worker that can't load only fires `error`: race it.
  - `mvp` loses every SQL error message; vendor `eh` only, and show "browser too old" without WebAssembly exception handling.
  - A multi-statement string returns the first statement's result: split statements (the spike's `sql.ts` lexer).
  - The 21 M-row cross join kills the worker unless the last statement is streamed (`conn.send(sql, true)`) and cut at 10 000 rows.
  - Arrow returns `DATE`/`TIMESTAMP` as epoch ms: map them by Arrow type id (the spike's `engine.ts` `toResult`).
  - DuckDB declares foreign keys only in `CREATE TABLE`, refuses multi-row self-referencing inserts (one `INSERT` per taxon rank), and can't drop a referenced table: Reset is a restart, never a re-run of the setup.
  - `DELETE FROM species` is refused by the foreign keys; tests that change data delete `species_countries` rows.
  - Fixed modification time (2000-01-01 UTC) on everything under `dist/learn/assets/` keeps Caddy's ETags stable across deploys (15/15 in the spike).
  - Under Playwright's `context.route` Chromium disables the HTTP cache; E2E specs that need caching or worker counts must not depend on it.
  - Playwright's Chromium on this ARM VPS runs headless; Firefox and WebKit need apt packages (out of scope).
- **The spike** (read only): `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`, with `README.md` listing every command; `run-queries.ts` re-runs 002's blocks (ports 3102, never while `pnpm e2e` runs).
- **Countries matching:** two narrow rules on Natural Earth's own fields (002 §6 "Matching rule"): keep the row whose `ADM0_A3 = ISO_A3_EH` when several share an `ISO_A2_EH`; drop map units of `TYPE` "Overlay". `NA` is Namibia: read every column as VARCHAR.
- **GBIF DOI:** the countries file touches no GBIF counts, so the DOI stays current; plain `pnpm build` (and `deploy`) still refuses a stale DOI, as today.
- **Pointers into 002:** engine and interface §1, schema §2, ERD §3, lessons §4, countries §6, site and E2E §8, the split §9, the owner's choices §10.
