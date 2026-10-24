# Mission brief: critwire Learn L2, the site: engine, map, ERDs, foundations and database architecture (mission L2)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l2-site.md, then run:
     mission start critwire <that file>        (base: main after mission L1 is merged and live)
     Start only after L1 (critwire-learn-l1-data) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§0, §2, §3, §5.1–5.2, §6, §7, §9).
     Chain: L1 → L2 (this) → L3 critwire-learn-l3-gis → L4 critwire-learn-l4-stats-etl → L5 critwire-learn-l5-powerbi-capstone.
     Estimate: about 34–40 sessions (6 pipeline stages, about 26 steps, code review, verification, release). -->

## Goal

critwire Learn opens at `critwire.com/learn/`, built as `plans/004-learn-curriculum.md` designs it, with its first two tracks live:
- **The engine and app core** (002 §1 and §8, kept by 004 §1): DuckDB-WASM `1.33.1-dev65.0`, `eh` bundle only, in a worker, self-hosted under `/learn/assets/` with the `parquet` extension from critwire's own mirror; one engine start per visit; the 10 000-row stream cap; Reset and Stop by restart; loud start failures. The setup builds schema v2 (004 §0 `setup`, §6.1): 002's six tables and view byte for byte, plus `datasets` and `occurrences` from L1's `/learn/data/`.
- **The map and its pages** (004 §2, §7): `site/learn/curriculum.json` (all 33 modules; g1–c1 `planned`, listed unlinked "in preparation"), `/learn/` with progress (§7.4), the seven track pages, the module template (§7.2), `/learn/setup/` (§3 without the Python stage, which L4 adds), `/learn/playground/` on schema v2.
- **f1–f4 and d1–d6 in full** (004 §5.1–5.2): every section, every block, every exercise with Check and Show answer, every "Already know this?" check, every dialect note; module pages written as `site/learn/modules/<id>.html` with `{{block:<q-id>}}` slots and blocks in `site/learn/sql/` (§7.5).
- **The ERDs** (004 §6): `pnpm erd` renders the three Mermaid sources offline (no mermaid-cli) to committed SVGs; the build refuses a stale SVG; `/learn/schema/`, `/learn/schema/lab/` and `/learn/schema/star/` with their data dictionaries; the Schema and Lab schema dialogs.
- **The star** (004 §5.2 d6, §A.3): `star.sql` is d6's `d6-star-*` blocks; `writeStar` runs it in Node DuckDB (canonical) and publishes `/learn/data/star/` with its manifest and credits: the records fact and the dimensions it uses. The habitat fact waits for L5.
- **Downloads** (004 §7.3): `/learn/labs/<module>.sql` for every module with PostGIS blocks, exactly as `learn:check` runs them, with the boot setup: every `-- boot` block a file's blocks (or their `-- after:` blocks) name a table or view of, right after `pg-session`. One assembly function, shared by the build and `learn:check`. f–d need no boot block; L4's s-modules are its first users, so its isolation tests cover the rule with a fixture boot block.
- **`pnpm learn:check` grows** (004 §0, §7.5–7.6): every PostGIS block, the `-- after`, `-- boot`, `-- tx: own`, `-- fails:` and `-- expect` rules, the privilege and cleanup lints, the in-transaction leak check, the `learn_spatial` canary where it exists, and `site/learn/labs/checked/` with `checked.json`; the build refuses a stale lab ("lab <id> is stale: run pnpm learn:check"). It is the repository's port of the spike's runner; from this mission on the spike is frozen.
- **E2E** (004 §7.7): `learn-map`, `learn-browser`, `learn-labs` (SQL), `schema`, `serving`, and `learn-data` extended to the star.
- It's live: the mission merges and deploys at its end.

## Why

The owner needs working skill in database architecture first; foundations and the six database modules are the base every later track builds on, and they were written and run in full by the design mission. A course with broken labs wastes the learner's time, so every block that runs in the page or in PostGIS is tested by the build's own checks.

## Scope

In:
- `site/learn/` (004 §7.5's layout), `site/style.css`, `site/index.html` (the Learn link), `scripts/build/` (`writeLearn`, `writeStar`, the ERD stale check, refusals), `scripts/erd*`, the `learn:check` command and its tests, `e2e/`, `package.json` and the lockfile (the pins below), `tsconfig` files, `AGENTS.md` (new commands and files), `plans/004-learn-curriculum.md` (fixes where code proves it wrong) and its ERD sources (moved under `site/learn/` if the architect chooses; one copy only).
- `site/learn/duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm` committed (3.22 MB, 002 §8), unless the owner chose otherwise in 004 §10.
- Reading, never editing, the spike `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/` (`src/engine.ts`, `sql.ts`, `cards.ts`, `format.ts`, `setup.sql`, `scripts/erd*.ts`, `plan-queries.ts`, `pg.ts`, `privilege.ts`, `canary.ts`, `star.ts`, `credits.ts`, `run-queries.ts`, and their tests' failure cases) and A1's spike for anything 002 names.
- Scratch schema `learn_curriculum` and `learn_…` roles in `critwire_dev` (as `critter-ai` over the socket), each dropped by its own block.

Out:
- g1–g7, s1–s6, e1–e5, p1–p4 and c1 pages (L3–L5); Python blocks and downloads (L4); the habitat fact (L5).
- Any change to a `/v1` file or to L1's `/learn/data/` files, except the manifest gaining `star/`.
- DuckDB's `spatial` extension, the `mvp` and `coi` bundles, the DuckDB shell, PGlite (004 §B, 002 §1). No CDN.
- Caddy and `e2e/Caddyfile`'s headers, unless the owner approved 002 §10 item 7 in 004 §10 (then the ops change is a handoff item).
- IUCN data; Wikipedia prose; the `critwire` database except through `deploy critwire`; schema `learn_spatial`.

## Definition of done

- `pnpm typecheck` (root and `site/learn/tsconfig.json`), `pnpm test` (the spike's failure cases ported first: runner, plan, privilege, cleanup, leak, ERD) and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped: every browser block of f1–d6 runs in its page; every exercise accepts its answer and rejects a fixed wrong one; every "Already know this?" marks its module done; Reset, Stop and one engine start across three pages; each lab page's code equals its download; no request leaves the origin except the Wikimedia photo hosts (fixture).
- **Results equal 004's.** L1 published the spike's sample (L1's Summary), so every browser block's result and every PostGIS result `learn:check` records has the sha256 004 prints. A difference is a bug to find, not a number to update; where L1 recorded a moved value (a dataset title), the page and 004 change together.
- **`learn:check`** runs every PostGIS block of f1–d6 green in `critwire_dev`, twice with the same results, then every assembled `.sql` download on a freshly loaded database with no unexpected `ERROR:` line (004 §7.6); the leak query (`learn\_%` roles, schemas other than `learn_spatial` and `learn_curriculum`) is empty after it.
- **Existing files unchanged:** at Baseline, save `sha256sum` of every file in `dist/` from a fresh `origin/main` build; every `/v1` and `/learn/data/` file matches, except `manifest.json` (gains `star/`) and `index.html`.
- **The 50 MB cap** holds with the star (004 §4.4: about 40.0 MB).
- **Measured:** the setup takes at most 1.5× A1's 2.9 s on desktop (the spike: 3.22 s), else load `occurrences` only on the modules that use it (the design mission's risk table, T13).
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l2-site/e2e/`: the Playwright HTML report, a trace per test, `results.json`, screenshots of the map, f3 and d3 (one per tool), `/learn/schema/lab/` and the setup page at 1280 and 375 px, light and dark; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every `/learn/` page this mission built returns 200; `/learn/assets/*.wasm` are `application/wasm`; every `/v1` and L1 `/learn/data/` file hashes as at Baseline (manifest aside); one headless Chromium run against https://critwire.com/learn/foundations/join/ runs f3's first block and shows its recorded result; a downloaded `/learn/labs/d3.sql` runs after the live loader in `critwire_dev` without an unexpected error.
- The plan's Summary gives: what shipped, E2E counts and artifact path, the setup timing, every deviation from 004, the release record, and what L3 needs to know.

## Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **One harness.** `learn:check` is the spike's runner ported, not a second design; the browser blocks are tested by E2E in the real pages.
- **Simplest approach that works**: static pages from `pnpm build`, one esbuild bundle, no web framework, no server process, no CDN; the build stays offline.
- **Copy** follows `AGENTS.md`'s line (applied by L1): adults new to the topic, our own words, open references linked. SQL Server appears only in dialect notes.
- **Records, never range**, in every page and string.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.

## Notes

- **Needs from L1:** `/v1/countries.*`; `/learn/data/` (`occurrences.parquet`, `datasets.csv`, the shapes, `postgis/learn_curriculum.sql`, `manifest.json`); the credits function and the cap; `learn:check`'s loader stage. Read L1's Summary first.
- **Pins (002 §8):** `@duckdb/duckdb-wasm` 1.33.1-dev65.0 (DuckDB v1.5.6, same as `@duckdb/node-api` 1.5.6-r.2) and `esbuild` 0.28.2 in `dependencies`; `mermaid` 12.2.0 in `devDependencies`. No install scripts. The extension's sha256 is `33094a01b3a1dc27c4158f4c1fa13c45c240eea6ba07197a19a1925f002ca473`; `writeLearn` checks it.
- **Engine traps** (002 §1, A1's Decisions): `parquet` must be `LOAD`ed from the mirror with autoinstall and autoload off; a missing `.wasm` makes `instantiate` hang (HEAD it first); `mvp` loses SQL errors; multi-statement strings return the first result (split with the spike's lexer, which also knows dollar quotes); stream every statement and cut at 10 000 rows; Arrow dates arrive as epoch ms; Reset is a restart; fixed modification times under `dist/learn/assets/` keep ETags stable; Playwright's `context.route` disables the HTTP cache.
- **Runner rules the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S6–S23): `-- boot` blocks commit and can't be named in `-- after`; `after` isn't transitive; an `EXPLAIN`'s rows need no `ORDER BY`; d3's blocks run after `d3-analyze` (full-sample `ANALYZE`, stable plans); `-- tx: own` blocks restore the session and refuse plain `SET`; `-- fails:` is allowed only there; d5's role blocks need CREATEROLE and, on PostgreSQL 16, `createrole_self_grant = 'set, inherit'` for the role that runs them (§3.2); d4's two-session demos stay `untested`.
- **Two machines**: `learn:check` connects with libpq's `PG*` or `LEARN_PG_URL`, never `DATABASE_URL`, so it also runs on the owner's WSL PostGIS.
- **After this mission**, 004 §10 suggests a 30-minute Windows check by the owner (Docker PostGIS plus the loader, one d-module download): add it as a handoff item; it blocks nothing.
- **Pointers into 004:** conventions and headers §0, map §2, setup §3, modules §5.1–5.2, ERDs §6, site §7, chain §9, owner's choices §10, star spike §A.3.
