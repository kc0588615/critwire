---
mission: critwire-learn-l2-site
project: critwire
branch: agent/critwire-learn-l2-site
status: active
started: 2026-10-28 11:53 UTC
---

# Mission: critwire Learn L2, the site: engine, map, ERDs, foundations and database architecture (mission L2)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l2-site.md, then run:
     mission start critwire <that file>        (base: main after mission L1 is merged and live)
     Start only after L1 (critwire-learn-l1-data) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§0, §2, §3, §5.1–5.2, §6, §7, §9).
     Chain: L1 → L2 (this) → L3 critwire-learn-l3-gis → L4 critwire-learn-l4-stats-etl → L5 critwire-learn-l5-powerbi-capstone.
     Estimate: about 34–40 sessions (6 pipeline stages, about 26 steps, code review, verification, release). -->

### Goal

critwire Learn opens at `critwire.com/learn/`, built as `plans/004-learn-curriculum.md` designs it, with its first two tracks live:
- **The engine and app core** (002 §1 and §8, kept by 004 §1): DuckDB-WASM `1.33.1-dev65.0`, `eh` bundle only, in a worker, self-hosted under `/learn/assets/` with the `parquet` extension from critwire's own mirror; one engine start per visit; the 10 000-row stream cap; Reset and Stop by restart; loud start failures. The setup builds schema v2 (004 §0 `setup`, §6.1): 002's six tables and view byte for byte, plus `datasets` and `occurrences` from L1's `/learn/data/`.
- **The map and its pages** (004 §2, §7): `site/learn/curriculum.json` (all 33 modules; g1–c1 `planned`, listed unlinked "in preparation"), `/learn/` with progress (§7.4), the seven track pages, the module template (§7.2), `/learn/setup/` (§3 without the Python stage, which L4 adds), `/learn/playground/` on schema v2.
- **f1–f4 and d1–d6 in full** (004 §5.1–5.2): every section, every block, every exercise with Check and Show answer, every "Already know this?" check, every dialect note; module pages written as `site/learn/modules/<id>.html` with `{{block:<q-id>}}` slots and blocks in `site/learn/sql/` (§7.5).
- **The ERDs** (004 §6): `pnpm erd` renders the three Mermaid sources offline (no mermaid-cli) to committed SVGs; the build refuses a stale SVG; `/learn/schema/`, `/learn/schema/lab/` and `/learn/schema/star/` with their data dictionaries; the Schema and Lab schema dialogs.
- **The star** (004 §5.2 d6, §A.3): `star.sql` is d6's `d6-star-*` blocks; `writeStar` runs it in Node DuckDB (canonical) and publishes `/learn/data/star/` with its manifest and credits: the records fact and the dimensions it uses. The habitat fact waits for L5.
- **Downloads** (004 §7.3): `/learn/labs/<module>.sql` for every module with PostGIS blocks, exactly as `learn:check` runs them, with the boot setup: every `-- boot` block a file's blocks (or their `-- after:` blocks) name a table or view of, right after `pg-session`. `untested` blocks (`d4-wait`, `d4-isolation`, `d5-database`) commented out under their reason, never run from the file. One assembly function, shared by the build and `learn:check`. f–d need no boot block; L4's s-modules are its first users, so its isolation tests cover the rule with a fixture boot block.
- **`pnpm learn:check` grows** (004 §0, §7.5–7.6): every PostGIS block, the `-- after`, `-- boot`, `-- tx: own`, `-- fails:` and `-- expect` rules, the privilege and cleanup lints, the in-transaction leak check, the `learn_spatial` canary where it exists, and `site/learn/labs/checked/` with `checked.json`, whose freshness key per block covers what it executes (its `-- after:` chain transitively, the `-- boot` blocks, `pg-session`, the manifest, loader, checker sources, `requirements.txt`) and per download its assembled sha256 (004 §7.5); the build refuses a stale lab ("lab <id> is stale: run pnpm learn:check"). It is the repository's port of the spike's runner; from this mission on the spike is frozen.
- **E2E** (004 §7.7): `learn-map`, `learn-browser`, `learn-labs` (SQL), `schema`, `serving`, and `learn-data` extended to the star.
- It's live: the mission merges and deploys at its end.

### Why

The owner needs working skill in database architecture first; foundations and the six database modules are the base every later track builds on, and they were written and run in full by the design mission. A course with broken labs wastes the learner's time, so every block that runs in the page or in PostGIS is tested by the build's own checks.

### Scope

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

### Definition of done

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

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **One harness.** `learn:check` is the spike's runner ported, not a second design; the browser blocks are tested by E2E in the real pages.
- **Simplest approach that works**: static pages from `pnpm build`, one esbuild bundle, no web framework, no server process, no CDN; the build stays offline.
- **Copy** follows `AGENTS.md`'s line (applied by L1): adults new to the topic, our own words, open references linked. SQL Server appears only in dialect notes.
- **Records, never range**, in every page and string.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.

### Notes

- **Needs from L1:** `/v1/countries.*`; `/learn/data/` (`occurrences.parquet`, `datasets.csv`, the shapes, `postgis/learn_curriculum.sql`, `manifest.json`); the credits function and the cap; `learn:check`'s loader stage. Read L1's Summary first.
- **Pins (002 §8):** `@duckdb/duckdb-wasm` 1.33.1-dev65.0 (DuckDB v1.5.6, same as `@duckdb/node-api` 1.5.6-r.2) and `esbuild` 0.28.2 in `dependencies`; `mermaid` 12.2.0 in `devDependencies`. No install scripts. The extension's sha256 is `33094a01b3a1dc27c4158f4c1fa13c45c240eea6ba07197a19a1925f002ca473`; `writeLearn` checks it.
- **Engine traps** (002 §1, A1's Decisions): `parquet` must be `LOAD`ed from the mirror with autoinstall and autoload off; a missing `.wasm` makes `instantiate` hang (HEAD it first); `mvp` loses SQL errors; multi-statement strings return the first result (split with the spike's lexer, which also knows dollar quotes); stream every statement and cut at 10 000 rows; Arrow dates arrive as epoch ms; Reset is a restart; fixed modification times under `dist/learn/assets/` keep ETags stable; Playwright's `context.route` disables the HTTP cache.
- **Runner rules the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S6–S23): `-- boot` blocks commit and can't be named in `-- after`; `after` isn't transitive; an `EXPLAIN`'s rows need no `ORDER BY`; d3's blocks run after `d3-analyze` (full-sample `ANALYZE`, stable plans); `-- tx: own` blocks restore the session and refuse plain `SET`; `-- fails:` is allowed only there; d5's role blocks need CREATEROLE and, on PostgreSQL 16, `createrole_self_grant = 'set, inherit'` for the role that runs them (§3.2); d4's two-session demos stay `untested`.
- **Two machines**: `learn:check` connects with libpq's `PG*` or `LEARN_PG_URL`, never `DATABASE_URL`, so it also runs on the owner's WSL PostGIS.
- **After this mission**, 004 §10 suggests a 30-minute Windows check by the owner (Docker PostGIS plus the loader, one d-module download): add it as a handoff item; it blocks nothing.
- **Pointers into 004:** conventions and headers §0, map §2, setup §3, modules §5.1–5.2, ERDs §6, site §7, chain §9, owner's choices §10, star spike §A.3.

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

#### Review items assigned to L2

The review's numbering: MF = MUST-FIX, SC = SHOULD-CHANGE.

1. **SC6: check plans by meaning.** Recorded `EXPLAIN` output stays as an example on the page, but `learn:check` asserts what the lesson teaches:
   - the index condition
   - the row result
   - a Sort's presence or absence where the lesson needs it

   Don't compare the plan text's hash. Report the PostgreSQL, PostGIS and GEOS versions. Qualify the "every printed hash equal" rule in this brief accordingly. Data results keep their hashes.
2. **SC9 (L2 part):**
   - **The star ERD:** mark the two unshipped tables `planned`, as the lab ERD does, and teach the difference; keep the drift check strict.
   - **d6's type-2 history:**
     - check for overlapping or missing versions before the UPDATE
     - check that exactly one version matches
     - make the version foreign key NOT NULL afterwards
     - teach that the partial unique index means at most one current row, not exactly one
     - call the 2018 boundary a teaching convention, and separate observation time from identification time
   - **§6.3:** `dim_species` is shared by the two species facts, not by the habitat fact.
3. **SC7 (L2 part):** role and privilege labs run as `critwire_lab`, the role L1 creates (through `LEARN_PG_URL`), not the superuser, and cleanup is checked on error paths. d5 states that a fresh-database default (PostgreSQL 15+ `public`) isn't proof: inspect the actual ACLs. Membership `INHERIT` and `SET` are configurable.
4. **d4 two-session demos:** replace the `untested` `d4-wait` and `d4-isolation` with a coordinated two-connection regression in `learn:check`, if it fits in about two steps; otherwise keep them `untested` and record why. Scope the upsert examples: they don't cover deleted or changed upstream rows. "Readers don't wait" holds for ordinary MVCC reads, not for locking reads or DDL.
5. **Teaching corrections** (the review's table, d1–d6):
   - **d1:** a nullable UNIQUE column isn't a candidate key. Teach that rank can be enforced declaratively with a composite foreign key to `(name, taxon_rank)`.
   - **d2:** lists can be joined and counted (UNNEST). What's lost is element-level foreign keys. The "non-key determines non-key" rule is introductory. A lossless decomposition needs the shared attributes to determine a component.
   - **d3:** avoiding index-only scans removes only one source of variation. BRIN doesn't need perfect physical order.
   - Fix each in 004 and on the page in the same commit.
6. **SC1 and SC2 (L2 parts):**
   - Schema v2's UNIQUE constraints on external ids follow L1's "shared id" decision; read it in L1's Decisions.
   - The browser setup and the E2E check `manifest.json`'s recorded `/v1` input hashes against the files actually served, and refuse a mismatch with a clear message.
7. **Optional, only if under 45 sessions at the Steps stage:** a short d1 or d2 exercise that reverse-engineers an ERD from the learner's own lab database with `tbls`, a single static binary. Install it pinned and with its sha256 checked into `~/.local/bin`, with no apt. Compare its output with the course's lab ERD. Otherwise record it as a later idea in 004.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-10-28 ~12:05 UTC on `1c19b55` (= `origin/main` `85d5ca3` + this plan), Node 24.21.0, pnpm 11.10.0. Session 1 of the mission.
- **Precondition:** L1 is live: its plan says `status: done`, its branch's `## Release` says `Result: done`; `/srv/apps/critwire` is at `85d5ca3`; live `https://critwire.com/learn/data/manifest.json` returns 200 and hashes equal to this build's.
- **Roles/dbs:** `critwire_live` exists and owns `critwire`; `critwire` owns `critwire_dev`; `critwire_lab` exists. `.env`: `DATABASE_URL` and `LEARN_PG_URL` → `critwire_dev`, `CRITWIRE_DB_TARGET=critwire_dev`. The mission has no db of its own (`DB=''`): it uses `critwire_dev`.
- **Versions** (for SC6's report): PostgreSQL 16.15 (aarch64), PostGIS 3.4.2, GEOS 3.12.1.
- `pnpm install --frozen-lockfile`: up to date. No migrations (build rebuilds the db). No lint script exists (typecheck is the static check).
- `pnpm typecheck`: exit 0.
- `pnpm test`: 285/285 pass, 0 skipped.
- `pnpm test:db`: before any build 65/78 (13 fail: `dist/ has no Learn files: run pnpm build first`; they read `dist/`); after `pnpm build` 78/78. Run order matters: build first.
- `pnpm build` (plain): exit 0, 3.9 s; `dist/learn/data/` 35,452,055 B, committed lab data 13,677,679 B (cap 50,000,000).
- **Baseline hashes:** `sha256sum` of all 172 files in `dist/` → `/srv/critter-ai/agent-state/missions/critwire-learn-l2-site/baseline-dist.sha256` (`index.html` `0986f22d…`, `learn/data/manifest.json` `c756dbcb…`). The DoD's "existing files unchanged" compares against it.
- `pnpm learn:check`: ok (two loads = manifest's 14 tables, forced failure rolled back, pg-role-smoke 0 left, canary unchanged, leak check empty).
- `pnpm e2e`: 38/38 pass, 0 skipped/flaky, 25.6 s. Artifacts: `/srv/critter-ai/agent-state/missions/critwire-learn-l2-site/baseline-e2e/`.
- **Inputs read:** Codex review `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md` (175 lines; L2's items listed in the brief's addendum); L1's Summary ("For L2": docs link → `/learn/`, d6 "star rebuilt from normalized tables" at 004:4093, `replacedBy` junction, diagram-design setup still to do, Astra SHOULD-CONSIDER `scripts/env.ts:27` `export X=` duplicate detection). Spike at `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike/` present (`src/engine.ts`, `cards.ts`, `format.ts`, `setup.sql`, `run-queries.ts`, …). Current `site/`: `index.html`, `style.css`, `learn/{data,labs,sql}`.

## Architecture

Written by the architect, session 2. Read: the brief and Addendum; `AGENTS.md`; 004 §0–§3, §4.3–4.5, §5.1–5.2, §6, §7, §9, §10, §A.3, §B; 002 §1, §3, §8, §10; the Codex review; L1's plan and code; the spike (`$SP` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike`) and A1's `src/check.ts`. Line numbers are this branch's (`dc43ace`). Revised once for both reviews: D3, D5, D6, D7, D9, D11, D13, W4–W19, R8–R13; see Revision notes.

### Findings (ranked by impact)

| # | Where | Problem | Rule / bug | Fix |
|---|---|---|---|---|
| F1 | `$SP/run-queries.ts` (710 lines), `$SP/scripts/plan-queries.ts:201` | One file runs static checks, a browser page, PostGIS, Python, Power BI inputs and three ERDs, reading 004 itself. L2's source is block files (brief), not 004 | SRP; wrong input | Port by responsibility (D2–D7): `blocks`, `privilege`, `result`, `plan`, `runner`, `assemble`, `freshness`, `erd-model`. Browser blocks leave the runner: E2E runs them in the real pages (brief, "one harness") |
| F2 | `$SP/scripts/pg.ts:46` `parseSpikeUrl` | The spike's PostGIS session is the superuser over the socket (it refuses TCP and passwords). That masked e2's namespace bug (Codex MF5), and d5 has never run as a non-superuser | SC7 | The runner uses L1's `PgTarget`/`pgConnect`/`childEnv` (`scripts/learn/pg.ts`): `critwire_lab` through `LEARN_PG_URL`. d5's results may move (R6) |
| F3 | 004 §7.2; `$SP/run-queries.ts:187` `runBlock` | Nothing says how a browser block runs in its page. 002 §8's lesson editors write to the live database, but 004's results were recorded with every block in `BEGIN … ROLLBACK` after its `-- after:` blocks. Several blocks change data: `d1-check-null` inserts occurrence 1; `d2-update-anomaly` and `d2-delete-anomaly` edit `records_flat`; `d1-ex`, `d2-ex` and `d6-ex` create tables. Run in page order on one database, they collide ("already exists") or change later results | bug: 004's results can't be reproduced, and E2E would depend on what ran before | D11: lesson, exercise, probe and reference runs are isolated exactly as learn:check runs a PostGIS block. Only the playground keeps changes |
| F4 | `site/learn/sql/pg-role-smoke.sql:4-15`, `scripts/learn/check.ts:198-200` | `pg-role-smoke` has two definitions: 004 §0's block, and L1's copy wrapped in `BEGIN`/`SET LOCAL`/`ROLLBACK`, run as a special step | DRY | The file becomes 004's block verbatim. The runner and the download assembly add the transaction, as for every block. The special step goes: the blocks stage runs it, leak check included |
| F5 | `scripts/build/sources.ts:3-4`, `:75-92` | `LICENSE_URLS` and `licenseUrl` sit in a module that imports `gbif/derived-dataset.ts` (`node:crypto`) and `species.ts`. The browser bundle needs the deed links for cards (002 §8), but the DOM tsconfig can't typecheck those imports | separation of concerns | Move both to an import-free `scripts/build/licenses.ts` and re-export them from `sources.ts`, so no caller changes. The lexer `scripts/build/learn/sql.ts` is already import-free: the bundle imports it, and the spike's `scriptStatements` and `ScriptError` are added there (one lexer) |
| F6 | `$SP/src/engine.ts:184` `fresh` | The spike's engine has no `HEAD` before the `.wasm` (a missing file hangs `instantiate`), registers the data by URL so nothing ties the bytes to the tested release (SC2), and still chooses between the mvp, eh and coi bundles | fail fast; SC2 | D11: `HEAD` first. Then fetch the manifest and the four inputs, check each sha256 against the manifest, and register the checked bytes as buffers. `eh` only |
| F7 | `plans/004-star-erd.mmd` | It draws 8 tables with no `planned` marker. L2 ships 6 (the habitat fact waits for L5), so a strict drift check fails | SC9 | `%% planned: dim_habitat_class, fact_country_habitat`, with the lab ERD's rule: excused while absent, a failure once present (D10) |
| F8 | 004 and the brief vs code and the review | See the table below | — | as listed |
| F9 | `scripts/learn/check.ts:150-218` `checkLab` | One function holds every loader check, and L2 adds four stages | SRP | Split it into stage functions under the same lock and cleanup, with the same behaviour (LC1–LC10 stay green). The runner reuses `learnObjects` (`check.ts:109`) as the leak query: no second `LEAK_SQL` |
| F10 | `scripts/build/html.ts:15-27` `fillSlots` | It matches only `{{word}}`, so `{{block:d3-plan}}` would pass through to the page unfilled | fail fast | A block-slot pass runs before `fillSlots`, then any leftover `{{` is refused (D12) |

**F8, the conflicts and their resolution:**

| Source | Says | Conflict | Resolution |
|---|---|---|---|
| 004 §0 "Result blocks"; d3 | every printed hash compared, EXPLAIN text included | SC6 | `-- plan:` assertions on EXPLAIN blocks (D4); the text stays as the page's example |
| 004 §7.5 | the freshness key covers "the data manifest" | the manifest holds `dois.sample` (null in a `--draft` build) and the star's sha256s, so a draft build or a star edit would make every lab stale | the key covers the manifest's `files` sha256s outside `star/` (the loader's among them), never `dois` or `bytes` (D6) |
| 004 §6 | Mermaid sources under `plans/`, embedded in 004 with their dictionaries; SVG and PNG | three copies of each ERD; the site uses no PNG | `site/learn/erd/*.mmd` is the only copy; SVG only. 004 §6 keeps the prose and points at the files and pages (D10) |
| 004 §0:272 | `pg-role-smoke` runs from a wrapped file | F4 | the block verbatim |
| 004 §7.3, §7.7 | `d4-wait` and `d4-isolation` untested; `schema` spec checks all three ERDs | review item 4; the lab and star drift checks run elsewhere | `-- sessions:` (D5); each ERD's drift checked in one place (D10) |
| 004 §7.5 | the keys `curriculum.json` holds | track pages show questions (§7.1) | add `skill`, `questions` and `tools[]` |
| 004 §6.3 (also p2 at 004:7091) | `dim_species` is shared by every fact | SC9 | fixed in W21 |
| `AGENTS.md:24` | the replacement junction is "L2's to add" | the brief's Out forbids changing L1's `/learn/data/` (loader, setup); SC1 says "when retirement is first supported"; no id is retired | keep the refusal (`projection.ts:66-68`); reword AGENTS.md (W24) |
| brief DoD | unchanged except `manifest.json` and `index.html` | `/learn/data/index.html` lists every manifest file and throws without a description (`page.ts:38-39`) | both `index.html` files change; the star's 7 files get descriptions. Recorded under Decisions |

**Fine as they are; reuse, don't rewrite:**
- `credits()` and `LAB_FILES` (`build/learn/credits.ts`), the cap (`cap.ts`).
- `withLabTables` (`projection.ts:74`), which is the star's input.
- The loader and its forced failure; `env.ts`, `pg.ts`; `withLabSchema` (`scripts/test-db.ts`).
- The Caddy E2E harness and `assertBuilt`; `childFile`.
- L1 already provides the credits function, the cap, the loader, env handling, learn:check's loader stage and the E2E harness. L2 builds on them.

### Target design

#### D1. Files (one copy of each thing)

```text
site/index.html                     docs page: "Learn" → /learn/ (replaces L1's /learn/data/ line; the docs E2E follows)
site/learn/
  curriculum.json                   7 tracks; 33 modules {id, slug, title, track, tools[], hours, prereqs[], state, skill, questions[]}
  layout.html                       shell, filled by fillSlots: {{title}} {{style}} {{css}} {{js}} {{page}} {{main}}
  pages/{map,track,setup,playground,schema}.html   fragments
  modules/<id>.html                 f1–f4, d1–d6: prose + {{block:…}} {{exercise:…}} {{skip:…}} {{diagram:…}}
  sql/<id>.sql | <id>.m             every SQL and Power BI block: 004's fence body verbatim (headers included); setup.sql stays header-less (L1)
  labs/checked/<id>.txt, checked.json   written only by learn:check
  erd/v1.mmd, schema.mmd, lab.mmd, star.mmd   git mv of plans/002-learn-erd.mmd, plans/004-{learn,lab,star}-erd.mmd
  erd/{schema,lab,star}.svg         pnpm erd output, committed
  diagrams/<name>.html | .svg | -dark.svg   diagram-design source and exports
  duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm   3,221,597 B, copied from $SP/downloads (sha256 33094a01…a473)
  src/                              app.ts engine.ts assets.ts format.ts cards.ts check.ts nav.ts progress.ts editor.ts csv.ts pages/*.ts learn.css text.d.ts
  tsconfig.json                     DOM + ES2023, types [], includes src/
scripts/
  erd.ts  learn-port.ts             pnpm erd; pnpm learn:port (D16)
  learn-check.ts                    (L1) + --update, --module <id>
  build/licenses.ts                 LICENSE_URLS + licenseUrl (F5)
  build/learn/site.ts               readLearnInputs (checks, writes nothing), assertLabsFresh, writeLearn
  build/learn/{assets,pages,star,erd}.ts   vendoring + bundle; HTML; writeStar; stale SVG, drift, dictionaries
  learn/blocks.ts course.ts privilege.ts result.ts plan.ts assemble.ts freshness.ts erd-model.ts star-check.ts   pure, shared by build, learn:check and E2E
  learn/runner.ts                   PostGIS block execution (pg.ts)
  learn/check.ts                    (L1) the stages (D3)
e2e/  helpers.ts (+ Learn), learn-map, learn-browser, learn-labs, learn-timing, schema, serving (+), learn-data (+), docs (+); __snapshots__/<id>.txt
```

`scripts/learn/` holds what build and checker share (L1 put `lab-files.ts` there for the same reason). `plans/003-learn-erd.mmd` stays as 003's record.

#### D2. Blocks: the one model

- **File text = 004's fence body**, headers included, with the file name equal to its `-- q:`. Ports are mechanical (`learn:port`, D16), and downloads keep the ids. The editor shows the body without the test headers; `-- show: cards` stays. `setup.sql` is the one exception (header-less, byte for byte §0's, the bundle's text import).
- **Grammar** is the spike's (`plan-queries.ts:21`): `q`, `status`, `engine`, `after`, `expect`, `params`, `needs`, `boot`, `tx`, plus a statement-leading `-- fails:`. Two headers are new: `-- plan:` (D4) and `-- sessions:` (D5).
- **Lints** (pure, in `pnpm test`):
  - the spike's static rules RQ1–RQ5, RQ13, RQ15, RQ17, RQ18 (ORDER BY; EXPLAIN exempt), RQ26, RP5, RP12, PC1 (pg-session = the runner's session), PC7 and RP14;
  - the privilege rules PV1–PV8 and the cleanup rules CL1–CL9 (`privilege.ts`, ported);
  - new: file name = `q`; every `-- after:` block is on the same page; `params` refused on page blocks (none in f–d); `-- plan:` rules (D4); no browser block statement starts with a keyword `isolated()` refuses (D11).
- **Page order** comes from each page's slots: the setup page first, then the modules in curriculum order. Every block file must be used by a page (`setup.sql` excepted), and a slot without a file fails.

#### D3. `pnpm learn:check` (004 §7.6), in order, under L1's lock

1. **Connect (L1).** Refusals, role checks, the lock, the canary before, the leak snapshot. It prints the versions: `server_version`, `postgis_lib_version()`, `postgis_geos_version()` (SC6). The lock is held by the **cleanup connection** (L1's `lock`, `check.ts:153`), which runs no block; it is also D5's monitor. Every other session the run opens records its `pg_backend_pid()`.
2. **Static.** Every block parsed and linted; any error stops the run before a load.
3. **Loader stage (L1).** The loader's sha256, two loads, the forced failure.
4. **Blocks.** One session through `pgConnect`, with the session's statements (pg-session's `SET` and `statement_timeout = 60s`), checked by `assertSession`. Results come back DuckDB-shaped: int8 as BigInt, date as text, per the spike's TYPES. Boot blocks run first and are committed; then the lab ERD drift (D10); then every `ran` PostGIS block in page order:
   - **Plain blocks:** `BEGIN`; the `-- after:` blocks' statements; its own statements, with a `SAVEPOINT` before the last one when it expects an error; the leak check (`learnObjects`) before `ROLLBACK`. A server WARNING, an unrenderable column (geometry, geography, raster, bytea), a timeout (cancelled, the run goes on) or several rows without ORDER BY each fail the block.
   - **`-- tx: own` blocks:** run unwrapped. Each `-- fails:` statement must fail with its text, and the block goes on. Then: a `BEGIN` probe (left open or aborted), the session restored (`assertSession`; restore and fail if it changed), the leak check (a committed leak is reported and dropped), and the canary and `learn_curriculum` read with L1's `readTables`, equal to the reading before (TX1–TX6, LK4).
   - **`-- sessions:` blocks:** D5.
   - **Check mode (the default):** `renderResult` must equal `checked/<id>.txt`; otherwise the block fails with a `lineDiff`. EXPLAIN blocks need only their assertions to hold (D4); a difference in the plan's text prints as a note. A missing file fails: "no recorded result: run pnpm learn:check --update".
   - **`--update`:** runs each block twice; the two renderings must match (for a plan, the assertions must hold both times). Then it writes `checked/<id>.txt`. Boot blocks run once, at connect. A `tx: own` or sessions block's second run means something because its end checks (TX1–TX6, D5) require it to leave the session, `learn_curriculum` and the canary as it found them.
5. **Downloads (D7).** Each assembled file runs on a freshly loaded database (the loader, then `psql -X -f`, through `childEnv`). Its `ERROR:` lines must be exactly the announced errors, in order. The leak check runs after each file, and the file's sha256 is recorded.
6. **Canary and leak check after the run (L1).**
7. **`checked.json`** (D6) is written only after every stage passed, through a temp file and a rename, and left untouched when nothing but its date would change.

- **Cleanup.** On every exit, failures and SIGINT/SIGTERM included, in this order, all before the lock is freed (L1's `finally` frees it first, `check.ts:213-217`; the F9 split reorders it):
  1. **Stop the run's work:** cancel the running psql and await its exit (L1); then, from the cleanup connection, `pg_terminate_backend(pid, 10000)` for each recorded session (blocks, sessions windows), so their transactions roll back and their locks go. A backend still alive after 10 s fails the run, named.
  2. **Sweep, on the cleanup connection:** the leak query's objects that weren't in the start snapshot and that the lab role made: roles on which `critwire_lab` holds ADMIN OPTION (PostgreSQL 16 grants it to the creating role), schemas it owns. Roles first (`DROP OWNED BY` + `DROP ROLE`), then schemas (`DROP SCHEMA … CASCADE`), each named in the error. This is SC7's error-path cleanup.
  3. **Then** free the lock, end the cleanup connection, remove temp files.
  - **Why that scope is this run's:** the lab lock serializes every lab-role writer (learn:check; test:db's `withLabSchema`, `test-db.ts:33-34`), and the sweep holds it. Any other new `learn_%` object (a superuser's test fixture, `learn-check.dbtest.ts:42-51`) is named with its superuser cleanup command (the spike's `committedLeak`), never dropped.
  - **Cleanup connection lost:** the server frees the lock with it, so the run drops nothing and fails naming every new object with its cleanup command.
- **`--module <id>`:** the static checks, the loader, then that page's blocks and its download, printed; it never writes. No other partial runs.
- **Never `DATABASE_URL`** (L1).

#### D4. SC6: plans checked by meaning

- **Three header forms**, on blocks whose last statement is `EXPLAIN`:
  - `-- plan: <text>`: some line of the plan contains the text (the node, the index, `Index Cond`);
  - `-- plan: no <text>`: no line contains it (`no Sort`, `no Seq Scan`);
  - `-- plan: rows <n>`: the top node's `actual rows=<n>`.
- **Lint:** every EXPLAIN block has a `rows` assertion and at least one node or condition assertion; `-- plan:` appears nowhere else.
- **Example**, `d3-btree`: `-- plan: rows 9` · `-- plan: Bitmap Index Scan on occurrences_species_id_idx` · `-- plan: Index Cond: (species_id = 63)` · `-- plan: no Seq Scan`.
- **What learners see:** the headers, which tell them what to look for, and the recorded plan as an example, labelled with its versions.
- **Data results keep their hashes.** The DoD's "every printed hash equal" is qualified accordingly (under Decisions; 004 §0 and d3 change in W17).

#### D5. d4's two sessions (review item 4): built, in about two steps

- **`-- sessions: A, B`**: PostGIS only; it excludes `after`, `boot`, `expect` and `tx`.
- **`-- window <name>`** comment lines switch the session for the statements that follow.
- **`-- waits: <why>`**, a comment line directly before the statement: the statement must block on the other window's lock. 004's d4 blocks put the wait and the error in trailing comments (`-- waits for A's row lock`, `-- ERROR:  could not serialize …`); W18 rewrites them as leading `-- waits:` and `-- fails:` lines, in 004 and on the page together.
- **`-- fails: <text>`** works as in `tx: own`.
- **Watching for waits:** while a window's statement runs, the cleanup connection (D3) polls `pg_blocking_pids(pid)` every 50 ms.
  - A `waits` statement must show as blocked by the other window's backend within **5 s** (the detection deadline), else the block fails ("didn't wait"). The runner then moves on and collects its result the next time that window runs or at the end.
  - Any other statement seen blocked fails the block at once and is cancelled (`pg_cancel_backend`). So an unexpected wait fails fast without relying on a timeout.
- **Timeouts:** both connections get pg-session (its `statement_timeout = 60s` is the hard stop) and `lock_timeout = '30s'`, six times the detection deadline: a server-side stop if the runner stalls, never reached by a legitimate wait. A statement still pending 30 s after its blocker's window moved on is cancelled and fails the block.
- **Afterwards:** both sessions ended clean (the probe), `learn_curriculum` and the canary unchanged, no leak.
- **Result:** the rows of every statement that returns rows, as `window | statement | <columns>`; those statements must share their columns.
- **Downloads:** the block stays commented out ("needs two psql windows: run it by hand, window by window, as its page says").
- **Budget:** one runner step (W19), and the d4 step makes the two blocks `ran`. If W19 doesn't finish in its session, the blocks stay `untested`, with the reason under Decisions.

#### D6. `checked.json` and freshness (004 §7.5)

```json
{ "versions": {"postgresql": "16.15", "postgis": "3.4.2", "geos": "3.12.1"}, "checked": "<UTC date of the last run that changed anything else>",
  "blocks": {"<id>": {"key": "<sha256>", "result": "<sha256 of checked/<id>.txt>"}},
  "downloads": {"pg-checks.sql": "<sha256>", "d3.sql": "<sha256>"}, "labErd": "<sha256>" }
```

- **Block key:** a sha256 over, in this order:
  - `id\0text` of the block, its `-- after:` blocks taken transitively (sorted), every `-- boot` block (sorted) and pg-session;
  - then `path\0sha256` for each manifest `files` entry outside `star/` (sorted);
  - the checker's sources: the relative-import closure of `scripts/learn-check.ts` (sorted), plus `db/learn/canary.sql` and `site/learn/labs/requirements.txt`. The closure stays off `scripts/build/` except the lexer `build/learn/sql.ts` (no `credits.ts` → `sources.ts` → `species.ts` chain). A pure test pins its file list, so a new import is a visible change: every lab goes stale on a checker edit.
- **`result`:** the sha256 of `checked/<id>.txt` as learn:check verified or wrote it. A recorded result edited afterwards (by hand, or a bad merge) loses its stamp.
- **`labErd`:** a sha256 over `lab.mmd`, the loader's sha256 and the boot blocks.
- **Recorded, not compared:** versions and date. The page shows them. The date moves only when a key, result, download, `labErd` or a version changes; otherwise `checked.json` stays byte for byte.
- **The build** (`assertLabsFresh`, after the manifest is written) recomputes everything and refuses each of these:
  - "lab <id> is stale: run pnpm learn:check" (the first 5 plus a count);
  - "site/learn/labs/checked/<id>.txt changed after learn:check: run pnpm learn:check" (`result` differs);
  - a missing or orphan key;
  - a download whose sha256 differs;
  - a changed `labErd`.
- **Plain build refuses; `--draft` only warns** (the dev loop, D16).

#### D7. Downloads: one assembly function, shared by build and learn:check

- **Which pages:** every page with PostGIS blocks gets `/learn/labs/<page>.sql`: d1, d3, d4, d5, d6, and the setup page's `/learn/labs/pg-checks.sql` (§0's checks: an addition, recorded; not `setup.sql`, which is the browser's schema). One function maps page to file name.
- **`assembleSql(page, blocks)`, in this order:**
  1. a head comment: run after the loader with `psql -X -d <db> -f <file>`; no `ON_ERROR_STOP`, because some statements fail on purpose;
  2. pg-session as written, not wrapped;
  3. the boot blocks the file needs: those whose `CREATE TABLE`/`VIEW` names any block or `-- after:` block in the file uses as a whole word in its code (the lexer's `codeOnly`: comments and strings stripped, so a name in prose pulls nothing in). Each appears once, committed;
  4. each block in page order:
     - **ran:** `BEGIN;`, then each `-- after:` block as `-- runs first: <id>` plus its body, then the block's file text verbatim, then `ROLLBACK;`;
     - **`tx: own`:** the file text verbatim;
     - **`untested` or `sessions`:** `-- not run from this file: <reason>. Run it by hand, as its page says.`, the header lines as written, every other line behind `-- `.
- **Announced errors:** per runnable block, its `-- expect: error` text and then its `-- fails:` texts, in order.
- **The boot rule** has no user in f–d: a pure test covers it with a fixture boot block (brief).

#### D8. The build (`scripts/build.ts`)

1. `readBuildInputs` (L1) plus **`readLearnInputs`**, which checks and refuses, before anything is written:
   - the curriculum: an unknown prerequisite, a cycle, a prerequisite listed below its module, an unknown track, a duplicate slug, a built module without a page or a planned one with one;
   - the slots and blocks (D2);
   - the ERDs: a stale SVG ("site/learn/erd/lab.svg is stale: run pnpm erd"), the v1 base check, a dictionary entity without a source;
   - the diagrams (D14);
   - the extension's sha256 (`33094a01…a473`); the installed `@duckdb/duckdb-wasm` version against the pin in `site/learn/src/assets.ts` (one constant, shared with the bundle);
   - `checked.json` parses; every `ran` PostGIS block has `checked/<id>.txt`; no orphan result;
   - every Power BI `// input:` names a star file this build publishes.
2. **L1's steps:** `/v1`, the docs page, `writeLearnData`, `projectLearn` and `assertLabChecks`, `writeLabLoader`.
3. **`writeStar`** (D9).
4. **`writeLabIndex` (L1):** the manifest and index gain `star/`; the cap.
5. **`assertLabsFresh`** (D6).
6. **`writeLearn`:**
   - assets: the engine files and the extension mirror, the esbuild bundle, a fixed mtime of 2000-01-01T00:00:00Z on every file under `dist/learn/assets/`, and a refusal of any path there that is neither versioned nor content-hashed (R7);
   - the pages (D12), the ERD SVGs, the diagrams;
   - `dist/learn/labs/<page>.sql`.

Renderers are queries; the `write*` functions are commands (CQS).

#### D9. The star (004 §A.3, d6)

- **`STAR_BLOCKS`** (in `build/learn/star.ts`): the six `d6-star-*` blocks L2 publishes: dim-species, dim-country, dim-dataset, dim-year, fact-records, fact-species-country. The two habitat blocks are on the d6 page and learn:check runs them; L5 publishes them.
- **`writeStar`:**
  - runs `withLabTables(out)`, then each block's statements: no schema name (ST5), and its first statement is `CREATE TABLE <table>`;
  - writes `COPY … ORDER BY <pk> TO 'star/<table>.csv' (FORMAT csv, HEADER)`;
  - writes `star/manifest.json` with `files.<file>` = `{table, columns, primaryKey, foreignKeys, rows, bytes, sha256, sources}`. Keys come from `duckdb_constraints()` and sources from `credits("star/<file>")`;
  - refuses star.mmd drift (planned excused) and a missing unknown member (`ZZ`, `-1`);
  - **cross-engine guard** (replaces the spike's ST1): renders each block's last result with `result.ts` and compares it with `checked/<id>.txt`, the result PostGIS gave learn:check. Plain build refuses a difference ("star block <id>: Node DuckDB gives …, PostGIS recorded …", `lineDiff`); `--draft` warns, as for staleness (D16's loop).
- **`LAB_FILES`** gains the 6 CSVs and `star/manifest.json`; `page.ts` gains their 7 descriptions. 004:4093 then holds: the star is rebuilt by every build from the lab's normalized tables (W21 rewords it).
- **Size:** the spike's 8 files came to 4,576,053 B; L2's 6 drop 5,025 B; plus the manifest, so `/learn/data/` ≈ 40.0 MB.

#### D10. ERDs (004 §6)

- **`erd-model.ts`** (spike port): `parseErd` (strict subset, line numbers on errors), `dbMeta`, `META_SQL`, `PG_META_SQL`, `erdDrift`, `baseDrift`, `markers` (`%% lab-made:`, `%% planned:`), the lab and star marker drift, `starMeta`. Each `.mmd` gains `accTitle`/`accDescr`, which become the SVG's `<title>` and `<desc>`.
- **`pnpm erd`** (port of `$SP/scripts/erd.ts`), no mermaid-cli:
  - mermaid 12.2.0's `dist/mermaid.min.js` in Playwright's Chromium (`@playwright/test`), with every request blocked;
  - Mermaid's parser first; `htmlLabels` off; font `Verdana, "DejaVu Sans", sans-serif`; it refuses `<foreignObject>` and any missing entity;
  - width and height from the viewBox, plus `data-source-sha256`;
  - SVG only, and only stale SVGs (`--force` renders all); atomic writes.
- **Each drift check in one place:**
  - `schema.mmd` against the browser's database: E2E `schema` (catalog queries through the playground);
  - `lab.mmd` against `learn_curriculum` after the boot blocks: learn:check (`labErd`);
  - `star.mmd` against the star manifest: the build;
  - the v1 base: the build.
- **Dictionaries:** the build writes them from the `.mmd` (column, type, key, meaning) and a source map in `build/learn/erd.ts`: the spike's `SOURCES`/`COLUMN_SOURCES`, rewritten without mission names. Each page adds the relationships in words, the view `species_taxonomy`, and the lab-made and planned lists. The star page teaches "planned": drawn, not yet published.

#### D11. Browser app (002 §1, §8)

- **One bundle.** esbuild, entry `src/app.ts` plus `learn.css`: ESM, minified, platform browser, `[name]-[hash]`, `.sql` loaded as text, the metafile filling `{{js}}` and `{{css}}`.
  - It imports `setup.sql`, `scripts/build/learn/sql.ts` and `scripts/build/licenses.ts`; esbuild fails loudly on any `node:` import.
  - `pnpm typecheck` runs both tsconfigs.
- **Engine** (`src/engine.ts`, spike port). Boot:
  1. `HEAD` the `.wasm` (non-2xx → "The database couldn't start: <url> answered <status>"), racing the worker's `error`;
  2. instantiate `eh`, open `:memory:`;
  3. fetch `manifest.json` and the four inputs with `cache: "no-cache"` (revalidation); sha256 each (SubtleCrypto) against `inputs.v1` and `files` (SC2);
  4. on a mismatch, refuse: "…isn't the file /learn/data/ was built from (sha256 …): reload; if it persists, the site is mid-update";
  5. otherwise `registerFileBuffer` the checked bytes, and keep them for restarts;
  6. settings: autoinstall and autoload off, `memory_limit = '512MB'`, the custom extension repository, `LOAD parquet`;
  7. `setup.sql`, then the species lookup for cards.
- **Running SQL.** Statements split by the lexer, each streamed and cut after 10 000 rows (`cancelSent`). One call at a time; a restart drops the queue. DATE, TIMESTAMP and DECIMAL arrive as DuckDB's text; ENUM is refused; errors read "statement n of m: …".
  - `isolated(after[], sql)` = `BEGIN`; the after blocks as written; `sql`; `ROLLBACK`, after an error too. Used by lessons, exercises, probes and references.
    - Refused before anything runs, by a statement's first keyword: transaction control (`BEGIN`, `START`, `COMMIT`, `END`, `ROLLBACK`, `ABORT`) and session state (`SET`, `RESET`, `USE`, `PRAGMA`, `ATTACH`, `DETACH`, `INSTALL`, `LOAD`), which would outlive the ROLLBACK: "<keyword> isn't run here: this editor's changes are rolled back; use the playground". No 004 browser block starts that way (checked); the D2 lint keeps it so.
    - If `BEGIN` or `ROLLBACK` itself fails, the transaction state can't be trusted: the engine restarts (as Reset) and says why.
  - `persistent(sql)`: the playground only. Transaction control is refused there too: an open transaction would break every isolated run (transactions are practised in psql, d4). A statement that isn't `readsOnly` marks the generation **changed**; lesson pages then say "Reset database restores the tables".
  - `readsOnly(statement)` (pure, in the lexer module): first keyword `SELECT`, `FROM`, `WITH`, `VALUES`, `DESCRIBE`, `SHOW`, `SUMMARIZE` or `EXPLAIN`, and none of the words `INSERT`, `UPDATE`, `DELETE`, `INTO`, `CREATE`, `DROP`, `ALTER`, `COPY`, `ANALYZE`, `nextval`, `setval` in its `codeOnly` text. It errs toward "changed": a false alarm costs a Reset, a miss a wrong verdict.
- **Reset and Stop** restart the engine: a new generation, unchanged. A generation counter drops late results.
- **Older browsers:** without WebAssembly exception handling, a notice; without JavaScript, a `<noscript>` line.
- **One start per visit.** The first page with a browser editor starts the engine. `nav.ts` swaps `<main>` for same-origin Learn pages (not `/learn/data/`, `/learn/labs/`, `*.svg` or `/learn/assets/`), uses pushState and popstate, focuses the `<h1>` and announces the page; a failure falls back to a full load.
- **Cards and results** (spike `cards.ts`): the card rule; 10 000 rows kept, 200 drawn; "N rows changed".
- **Checks** (A1 `check.ts` port):
  - `result`: as a multiset or in order, with hints;
  - probes: every `-- expect: error` block whose `-- after:` names the exercise runs isolated after the learner's SQL and must fail with its text;
  - **pristine data only** (004:8015, 002 §1): on a changed generation, Check and skip checks refuse with 002's message, "Changed the tables? Reset database brings them back.", and run nothing. The reference is computed at the first Check of an unchanged generation and cached for it, and the learner's answer runs on the same unchanged tables, so no verdict reads changed data. One flag, one `if`.
  - No `answers.ts` registry: the page's data attributes carry the SQL.
- **Progress:** `localStorage` `critwire.learn.done.v1` (§7.4); passing a skip check marks its module done.
- **Test hook:** `window.critwireLearn.result(blockId)` → `{columns, rows: string[][] (cellText), truncated}` or `{error}`. It is read-only.

#### D12. Pages

- **Filling.** A block-slot pass first (`{{block:<id>}}`, `{{exercise:<id>[ in order]}}`, `{{skip:<id>[ in order]}}`, `{{diagram:<name>}}`), then `fillSlots`; a leftover `{{` is refused.
- **Blocks, by engine:**
  - **duckdb:** a labelled textarea with `data-block` and `data-after`; Run (Ctrl/Cmd+Enter), Stop, Reset database; a "Runs after: <id>" note; a result region with Cards and Table tabs.
  - **postgis:** the file text, read-only, with Copy; the recorded result, or the `untested` reason; "Checked <date> on PostgreSQL…, PostGIS…, GEOS…", once per page; a link to the download; a Lab schema button.
  - **m/dax:** the code; the input files with their rows and sha256, from the star manifest; "Not run by critwire: Power BI Desktop is Windows-only."
  - **exercises:** browser ones get "Your answer", Check, a verdict in the live region, and Show answer in a `<details>`; PostGIS ones get Show answer with the code and the recorded result.
- **The pages:**
  - `/learn/`, the map; 7 track pages; the modules (Prev/Next within the track, prerequisites linked, Mark done, Schema/Lab schema dialogs);
  - `/learn/setup/`: §3.1 with `setup-counts`, §3.2 with §0's four PostGIS checks, §3.5 with `pbi-smoke` (L4 adds §3.3–3.4);
  - `/learn/playground/`: persistent; the tables listed and linked to the dictionary; Download CSV;
  - `/learn/schema/`, `/learn/schema/lab/`, `/learn/schema/star/`, plus each SVG alone.
- **Copy:** AGENTS.md's line; records, never range; no mission names on a public page ("in preparation", "planned").

#### D13. E2E (004 §7.7; no Caddyfile change)

- **Helpers:**
  - `learnContext`: every request off `127.0.0.1:3100` fails, except the two Wikimedia hosts, answered with the fixture image after asserting each URL is a record's `photo.url`;
  - `waitReady`;
  - `runBlock(page, id)`: renders the result through `scripts/learn/result.ts`.
- **`learn-map`:**
  - the map and track pages follow `curriculum.json` (hours, prerequisites, planned modules unlinked);
  - a tick survives a reload, and Clear progress removes it;
  - every `/learn/` page returns 200, has one `<h1>` and no broken internal link;
  - every `<img>` SVG has an alt and a `<title>`;
  - the docs page links to `/learn/`.
- **`learn-browser`:**
  - every browser block runs in its page; its rendering equals its snapshot, and cards follow the card rule;
  - every exercise accepts its answer and rejects a fixed wrong one (a missing row; the wrong order for "in order"; a missing constraint for probes);
  - every skip check marks its module done;
  - Reset (playground: a learner table plus a DELETE), and Stop (a runaway query), and the next query runs;
  - the changed generation: a playground SELECT leaves a lesson's Check working; a playground DELETE → that Check refuses with 002's message → Reset → the same Check passes; a `COMMIT` typed in a lesson editor is refused and the next run's result is unchanged;
  - the 10 000-row cap; three pages, one worker (`page.on("worker")`);
  - the `.wasm` held back (text readable, Run disabled with progress), the `.wasm` answering 404 (it says why), a tampered `/v1/species.parquet` (SC2 refusal). The first two act on boot step 1's `HEAD`, a main-thread fetch, so they don't depend on routing worker requests. W10's first case asserts that the worker's own `.wasm` fetch does reach `context.route`, because the origin fence relies on it;
  - keyboard only; the dialogs close with Escape and return focus.
- **`learn-labs`:**
  - each PostGIS and Power BI block's page code appears verbatim in its download;
  - untested and sessions blocks are commented out under their reason (uncommented, they equal the page code);
  - the shown result equals `checked/<id>.txt`, and the versions equal `checked.json`'s;
  - `pbi-smoke`'s inputs pass `star-check`.
- **`schema`:** schema v2's drift against the browser catalog; the three pages and SVGs; planned tables marked.
- **`serving` (+):** `.wasm` served as `application/wasm`; `Last-Modified: Sat, 01 Jan 2000 00:00:00 GMT` on every `/learn/assets/` file.
- **`learn-data` (+):** the star: key coverage (`star-check`: header, rows, sha256, keys unique and filled, foreign keys found, unknown members, `NA` read as text); the manifest lists `star/`; the cap.
- **`learn-timing`:** D15.
- **Snapshots:** browser renderings in `e2e/__snapshots__/<id>.txt`, via `snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}"` and `updateSnapshots: "none"`. `learn:port` seeds them from 004; `--update-snapshots` only on purpose. Playwright's own mechanism, not a new one.
- **Artifacts and screenshots** as the DoD lists them: map, f3, d3, `/learn/schema/lab/` and setup, at 1280 and 375 px, light and dark.

#### D14. Diagrams (Addendum)

- **The first diagram step** answers the plugin's first-run gate: default tokens, `Font source: system`, profile `critwire` saved, `.diagram-design` committed with `profile: critwire`.
- **Four diagrams:**
  - `critwire-pipeline` (setup page): `data/` → derive → build → `/v1`, `/learn/data/`, loader, star → browser, PostGIS, Power BI;
  - `d3-scans`: the pages a Seq Scan, an Index Scan and a Bitmap Heap Scan read;
  - `d4-mvcc`: row versions and what each session sees;
  - `d6-drill-across`: two facts summed to the shared dimension, then joined, against a row-to-row fan-out.
- **Exports and checks:** `export_svg.py --system-fonts`, light and dark, each passing `self_check.py --offline`.
- **The slot** writes `<picture>`: a dark `<source>` and an `<img alt>` taken from the SVG's `<title>`.
- **The build refuses** a missing variant, an SVG without `<title>`, any remote reference, and an unused file.

#### D15. Setup timing (DoD "Measured", T13)

- **`learn-timing.spec.ts`:** 5 first visits to a page without photos, each in a new context with no routes (Playwright's `route` disables the cache). It measures navigation start to the engine's `setup` mark, takes the median, writes `setup-timing.json` to the artifacts, and asserts ≤ 4,350 ms (1.5 × 2.9 s).
- **When:** measured in W10, before pages are built on the engine.
- **The fallback** (the brief's) splits `setup.sql`'s v2 part off and runs it only on pages whose blocks read `occurrences` or `datasets`. Only f1, the setup page and the playground are spared, so it gains little. The spike's 3.22 s leaves 35 % margin.

#### D16. Commands and the dev loop

- **`pnpm learn:port <page> [--check [all]]`:** writes the block files and seeds their recorded results from 004's fences for that page (its module section; `setup` = §0 + §3.1, 3.2, 3.5): `checked/<id>.txt` for PostGIS, the E2E snapshot for browser blocks (the exact `renderResult` text, no final newline). It refuses to overwrite a file that differs.
  - `--check` compares every ported file and recorded result with 004. That is the DoD's "results equal 004's", and it enforces "004 and the page change together".
  - L3–L5 reuse it.
- **After editing a block or a checker file:** `pnpm build --draft && pnpm learn:check [--update] && pnpm build`.
- **AGENTS.md** gets the commands, the files and this loop (W24).

### Review items assigned to L2

| # | Item | Design | Step |
|---|---|---|---|
| 1 | SC6 | D4. Versions printed and shown (D3, D6). The DoD's hash rule qualified: data results keep their hashes; EXPLAIN text is an example, asserted by meaning | W1, W17 |
| 2 | SC9 | star `planned` marker and its teaching (F7, D9, D10). **d6-scd2:** before the UPDATE, a query of the facts matching ≠ 1 version must return 0 (overlap or gap); after it, `ALTER TABLE fact_records ALTER COLUMN species_key SET NOT NULL`; the partial unique index taught as "at most one current", with a query proving exactly one; the 2018 boundary called a teaching convention; observation time vs identification time. §6.3 and 004:7091 corrected | W6, W8, W21 |
| 3 | SC7 | `critwire_lab` via `LEARN_PG_URL` (F2), the cleanup sweep (under the lock, this run's objects only) and leak checks on error and abort paths (D3). **d5's copy:** a fresh-database default (PostgreSQL 15+ `public`) isn't proof, so inspect the ACLs (`\dn+`, `has_schema_privilege`); membership `INHERIT` and `SET` are options (`GRANT … WITH INHERIT FALSE, SET FALSE`) | W4, W20 |
| 4 | d4 two sessions | D5: fits in two steps, so built. Copy: the upsert labs don't cover upstream deletions or changed keys; "readers don't wait" holds for ordinary MVCC reads, not locking reads or DDL (`d4-locks` shows the exception; 004:3304, 3560) | W18, W19 |
| 5 | d1–d3 teaching | **d1** (004:1950–1952, 1995 and the rank-needs-a-trigger claim): a nullable UNIQUE is an optional unique id, not a candidate key; a composite FK to `taxa (name, taxon_rank)` enforces rank declaratively. **d2** (004:2357, 2360): lists can be unnested, joined and counted; what's lost is element-level foreign keys; the 3NF mnemonic is introductory; a lossless split needs the shared attributes to determine a component. **d3** (004:2693, 2696): avoiding index-only scans removes one source of variation, not all; BRIN helps with partial correlation | W15, W16, W17 |
| 6 | SC1, SC2 | **SC1:** the UNIQUEs stay as L1's A7 decided; `assertLearnProjection` refuses a shared id; d1's copy per item 5. **SC2:** D11's hash check and E2E's tampered-file case; L1's `learn-data` already checks the manifest's `inputs` against the served files | W10, W15 |
| 7 | tbls | **Optional, last** (W25). The condition (under 45 sessions at the Steps stage) holds. Plan: pinned arm64 release, sha256 checked, into `~/.local/bin`; a short d1 exercise (a `sh` fence, so not counted); one recorded comparison of its Mermaid output with `lab.mmd` through `erd-model`. First to drop | W25 |

Each content correction lands in 004 and on its page in the same commit, in its module's step. `learn:port --check` holds the two equal.

### Proposed work breakdown (the planner writes the Steps)

Every step writes its failure cases first: [T] `pnpm test`, [D] `pnpm test:db`, [E] E2E. Ports bring the spike's cases (ids below) before any code.

| W | Group | First | Sessions |
|---|---|---|---|
| 1 | `blocks.ts` (grammar incl. `plan`/`sessions`), `result.ts`, `plan.ts`, `course.ts` (slots), `learn:port` for `setup` | [T] RQ1–5, 11, 13, 15, 17, 18, 26, RP5, RP12, PC1, PC7, RP14; plan cases | 1 |
| 2 | `privilege.ts` wired into the lint | [T] PV1–8, CL1–9 | 1 |
| 3 | runner core + blocks stage: plain blocks, results compare and `--update`, `checked/`, block keys, versions; §0's blocks ported; F4; F9 split | [D] RP1–7, RP12, RQ12–14, 21, 23, LK1–3, LK5, PC1 | 2 |
| 4 | `tx: own`, boot, the cleanup order (terminate, sweep, unlock) and scope (SC7, D3) | [D] TX1–6, LK4, PC7; SIGINT mid-block (no run backend, no new object, lock freed last); a second learn:check during cleanup refused; a superuser-made `learn_t_` role named, not dropped | 1 |
| 5 | `assemble.ts` (`pg-checks.sql`), `freshness.ts` (result sha256s, date moves only with a change, the pinned checker closure), the downloads stage, `assertLabsFresh` and the `--draft` warning | [T] assembly incl. a fixture boot block and a table named only in a comment, key sensitivity, an edited `checked/<id>.txt` refused, a rerun with nothing changed leaves `checked.json` byte for byte, the closure list; [D] the ERROR-line rule | 1 |
| 6 | `erd-model.ts`, sources moved (`git mv`), the star `planned` marker, `accTitle`, dictionaries, base and star drift | [T] RQE1–5, RE1–6, EG1–4 | 1 |
| 7 | `pnpm erd` (mermaid pin), the SVGs, the build's stale refusal, lab drift in learn:check | [T] ER1–4, stale | 1 |
| 8 | `writeStar` with the cross-engine guard, the 8 star blocks ported, `LAB_FILES` and descriptions, `learn-data` for the star | [T] ST3, ST5, a star block whose Node result differs from its recorded one refused; [E] PB2–7 via `star-check` | 1 |
| 9 | pins (duckdb-wasm, esbuild), the extension committed, `licenses.ts`, assets and bundle, mtimes, site tsconfig | [T] build refusals; [E] serving | 1 |
| 10 | engine, `format`, `cards`, `check`; `isolated()`'s refusals and recovery, `readsOnly`, the changed flag; a minimal playground; `learn-timing` (the T13 decision) | [T] spike and A1 cases, `readsOnly` cases (a CTE DELETE, `EXPLAIN ANALYZE`, a keyword inside a string); [E] engine cases (D13), first the worker route check | 2 |
| 11 | `curriculum.json`, layout, map, track pages, progress, nav, docs link | [T] curriculum refusals; [E] `learn-map` | 1 |
| 12 | module template and slots, every block kind, exercises, setup page, schema pages and dialogs, playground, downloads in `dist/` | [E] `learn-labs`, `schema`, the changed-generation case | 2 |
| 13–14 | f1 + f2; f3 + f4 | [E] seeded snapshots | 2 |
| 15–18 | d1, d2, d3 (SC6 assertions), d4 (`-- waits:`/`-- fails:` as leading lines, 004 and page together) | [E] / learn:check against seeded results | 4 |
| 19 | the `-- sessions:` runner (poller, 5 s detection, 30 s lock_timeout); d4-wait and d4-isolation `ran` | [D] a `waits` statement that doesn't wait; an unmarked one that does (fails at once, cancelled); a release after 10 s still passes | 1 |
| 20–21 | d5 (as `critwire_lab`); d6 (SC9) | learn:check, [E] | 2 |
| 22 | diagrams | [E] alt and `<title>` | 1 |
| 23 | E2E completion: screenshots, artifacts, a full run, the release smoke helper | [E] | 1 |
| 24 | AGENTS.md, 004 final pass (§0, §6, §7.3, §7.5–7.7, §9), the Windows-check handoff item | — | 1 |
| 25 | optional: tbls (item 7) | — | 1 |

- **Estimate:** 28 step sessions. With the 6 stages (2 done), the code review, about 2 fix steps, verification and release, the mission comes to about 39–40 sessions, under the 48 cap.
- **Drop order** if the cap comes close: W25, then W19 (record why). The Goal's deliverables are never deferred.

### Risks

| # | Risk | Mitigation |
|---|---|---|
| R1 | Engine traps (brief's Notes) | each has a fix in D11 and a case in W10: autoinstall and autoload off with `LOAD parquet` from the mirror; `HEAD` before instantiate; `eh` only; the lexer split (dollar quotes); every statement streamed and cut; epoch-ms dates as text; Reset by restart; fixed mtimes; no routes where the cache matters |
| R2 | T13 setup timing | the spike measured 3.22 s against a 4.35 s bound; the hashing and buffers add an estimated 0.1 s; measured in W10 before pages depend on it; fallback per D15 |
| R3 | 50 MB cap | ≈ 40.0 MB with the star; L3 projects 44–48 MB. `assertCap` names the largest files. `fact_records` (4.48 MB) repeats `occurrences.csv`'s rows; L3 weighs it with 004 §4.4's cuts |
| R4 | Hash determinism | browser runs isolated as the spike ran them (F3); PostGIS blocks run in page order right after a fresh load, so d3's plans and correlations and `d4-xmin-load`'s single transaction come before any committing `tx: own` or sessions block; `d3-analyze` reads the full sample; plan text isn't asserted (D4); the star is `ORDER BY` pk with fixed writer options; esbuild is deterministic; SVGs re-render only on a source change; `checked.json` is written only when a key, result, download or version changes (D6) |
| R5 | Mermaid offline | the spike's proven path (`mermaid.min.js` in Playwright's Chromium, requests blocked); a missing bundle file or any request fails loudly |
| R6 | d5 as `critwire_lab` | the spike ran it as superuser, so results may move. `critwire_lab` owns `learn_curriculum` (L1), so owner semantics hold; each difference goes to 004 and Decisions with its reason |
| R7 | Fixed mtimes vs deploy's `rsync -a` quick check | only versioned or content-hashed paths under `/learn/assets/`, refused otherwise (D8) |
| R8 | Lock-wait detection (D5) | `pg_blocking_pids` polled every 50 ms: expected waits seen within 5 s, unexpected ones fail at once; `lock_timeout = '30s'` and `statement_timeout = 60s` only as backstops, so load can't race them; on failure the blocks stay untested (brief) |
| R9 | Build and learn:check need each other | `--draft` warns instead of refusing; the loop is in AGENTS.md (D16) |
| R10 | New pins vs pnpm's minimum release age | exact pins; if refused, `minimumReleaseAgeExclude`, as L1 did for node-api |
| R11 | Isolated lessons change 002's UX | learners keep their work in the playground; each module page says so in one line |
| R12 | Check refused after playground changes (D11) | only non-`readsOnly` statements mark the generation; the refusal names Reset; learners lose playground work on Reset, as in 002 |
| R13 | The sweep drops something not this run's (D3) | it runs under the lab lock, before unlock, and only on lab-role-made objects new since the start snapshot; anything else is named, never dropped; [D] cases in W4 |

### Rejected alternatives

- **004 as the build's source of blocks:** the brief makes `site/learn/` the source.
- **E2E reading 004's hashes, or a new results folder:** Playwright snapshots are the established interface; `learn:port --check` keeps 004 parity.
- **Exercise references computed at build time in Node DuckDB:** value forms differ from WASM, and 002/004 say nothing is pre-rendered.
- **Lesson blocks writing to the live database (002):** results then depend on history (F3).
- **002's `answers.ts`/`lessons.json` registry:** the page's data attributes carry the same SQL, from one source.
- **Cross-engine star CSV diff in learn:check (spike ST1):** proven once in the spike; D9's per-block result comparison in the build guards later edits at no cost.
- **A second, pristine DuckDB database for Check:** doubles memory and setup time (T13).
- **Every reference computed eagerly after each start (002 §1):** adds to every start, and the learner's answer would still run on changed tables.
- **Any playground run marks the generation changed:** a SELECT would force a Reset; `readsOnly` is one pure function.
- **Sweeping every new `learn_%` object, or after unlock:** drops another process's objects (Astra MF2).
- **A Caddy fixture path for the `.wasm` cases:** Caddy changes are the owner's NO; the cases act on the main-thread `HEAD`.
- **Lab ERD drift in E2E:** E2E has no PostgreSQL; learn:check has the session.
- **PNG renders:** nothing uses them.
- **`-- plan:` in a side JSON file:** it would split a lesson's teaching from its block; headers are the existing grammar.
- **The replacement junction now:** it changes L1's loader and setup (Out), and no id is retired.
- **Partial learn:check runs that write:** they would leave a partial `checked.json`; `--module` only reads.
- **Mermaid in the page:** 5.5 MB to draw one picture (002 §3).

### Edits to 004 in this stage

None. Every correction above lands with the code that proves it (brief), in the step named. L1's `env.ts` SHOULD-CONSIDER is outside this brief's Scope; it goes to the Summary for the owner.

## Architecture review (Fable)

Reviewed 2026-10-28 against `dc43ace`: every cited line opened (`check.ts`, `html.ts`, `sources.ts`, `projection.ts`, `page.ts`, `build.ts`, the three `.mmd`, the spike's `engine.ts`, `pg.ts`, `plan-queries.ts`, `run-queries.ts` (root, not `scripts/`), 004's d3/d4/d6 blocks, L1's A7). Findings F1–F10 are real; F3 confirmed: the spike's `runBlock` wraps browser blocks too (`duckdbExec` → `control("BEGIN")`). Every brief deliverable and review item 1–7 has a design and a step. d2 has no PostGIS block, so the download list (setup, d1, d3–d6) is right. The SC2 inputs total ~565 kB, so hashing them can't touch T13.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **D11 exercise references vs the playground.** 004:8015 and 002 §1: the reference runs "on the pristine database". D11 computes it lazily at the first Check of a generation, but `persistent()` lets the playground change data in that same generation; a reference computed (or a learner answer checked) after a playground `DELETE` is wrong and the verdict is silently wrong either way. Define it: once the generation is marked changed, Check refuses with 002's message ("Changed the tables? Reset database brings them back.") until Reset; references are computed only on an unchanged generation. One flag, one `if`; E2E case: playground DELETE → lesson Check → refusal → Reset → pass.
2. **D5 deadlines are equal, so the sessions runner is flaky by construction.** Both windows get `lock_timeout = '5s'` and the runner also polls `pg_blocking_pids` for up to 5 s before it "moves on" to the other window's statement that releases the lock. Under any load (a build running one job at a time on 2 ARM cores) B's waiting UPDATE hits `lock_timeout` before A's ROLLBACK is sent, and the block fails spuriously. Make `lock_timeout` clearly larger than the detection deadline (e.g. detect within 5 s, `lock_timeout = '30s'`), and keep `statement_timeout` as the hard stop. Also note `-- waits:` must be the statement's leading comment; 004's blocks carry the wait as a trailing comment, so W18 rewrites them (004 and page together).

MISSED:
1. **The star is run in two engines with no guard once ST1 is dropped.** `STAR_BLOCKS` are `engine: postgis` on d6's page (learn:check records them) and `writeStar` runs the same text in Node DuckDB. Each block ends in a SELECT (`76 | 3 | 50`); `writeStar` should render that last result with `result.ts` and compare it to `checked/<id>.txt`. Nearly free, reuses one renderer, and catches a divergence when L5 edits the blocks. Add to W8 (treat as a must if the planner has room).
2. **D6 `checked.json` "left untouched when its content didn't change"** can't hold as written: `checked` (the run's date) changes every `--update`. Compare without the date, or write the date only when a block, download or `labErd` key changed.

SHOULD-CONSIDER:
1. Name collision: the setup page's download `/learn/labs/setup.sql` (PostGIS checks) vs `site/learn/sql/setup.sql` (the DuckDB schema the bundle imports). Call the download `pg-checks.sql` or similar.
2. D6's "relative-import closure of `scripts/learn-check.ts`" decides how often every lab goes stale. Keep the checker off `scripts/build/` except `learn/sql.ts` (no `credits.ts` → `sources.ts` → `species.ts` chain), and add a pure test that prints and pins the closure so a stray import is noticed.
3. D13 relies on `context.route` seeing the worker's fetch of the `.wasm` (held-back and 404 cases). Verify in W10's first E2E case; if Chromium's worker requests bypass the route, serve those cases from a Caddy fixture path instead.
4. D3 `--update` runs every block twice, `tx: own` blocks included; state the rule that a `tx: own` block must be idempotent (TX rules) so the second run is meaningful, and that `-- boot` blocks run once.
5. D7's boot rule matches table names "as a whole word" in block text; say it matches `codeOnly` text (comments and strings stripped, lexer already there) so a table named in prose comments doesn't pull a boot block into a download.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **D11: exercise checks can use modified data.** Playground changes survive into lessons, while references are computed lazily. Refuse Check after persistent changes until Reset, or provide a separate pristine database for checking.
2. **D3: cleanup releases the lock before destructive sweeping.** Another checker can start and create objects that the first runner then drops. Complete cleanup while holding the lock, retain a cleanup connection, and restrict deletion to objects owned by this run.
3. **D5: lock timeout equals the detection deadline.** A legitimate waiting statement can time out before the runner detects it and releases the blocker. Give lock acquisition substantially more time than detection; retain a bounded overall timeout.

SHOULD-CONSIDER:
1. Restore cross-engine star validation: compare Node DuckDB results with the checked PostGIS results before publishing.
2. D6 freshness should cover recorded result files, so altered displayed results cannot retain a valid check stamp.
3. Define failure recovery for browser isolation: rollback after SQL errors; restart if transaction state cannot be restored.

## Revision notes

One round, 2026-10-28. Every MUST-FIX resolved by a design change; every MISSED and SHOULD-CONSIDER item adopted (one variant declined).

| Item | Resolution |
|---|---|
| Fable MF1 · Astra MF1 (Check on changed data) | D11: a non-`readsOnly` playground statement marks the generation changed; Check and skip checks then refuse with 002's message until Reset; references and the learner's answer run only on an unchanged generation. E2E: playground SELECT → Check works; DELETE → refusal → Reset → pass (D13, W12). `readsOnly` pure cases (W10). R12 |
| Fable MF2 · Astra MF3 (D5 deadlines) | D5: 50 ms `pg_blocking_pids` poller on the cleanup connection; `waits` seen within 5 s; an unmarked wait fails at once; `lock_timeout = '30s'` (6×) and pg-session's `statement_timeout = 60s` as backstops. `-- waits:`/`-- fails:` are leading lines; W18 rewrites 004's d4 blocks and the page together. W19 cases incl. a 10 s release. R8 |
| Astra MF2 (sweep after unlock) | Verified: `check.ts:213-217` frees the lock first; `withLabSchema` (`test-db.ts:33-34`) is the other lab-role writer, under the lock; `learn-check.dbtest.ts:42-51` makes superuser fixtures outside it. D3 Cleanup: terminate the run's recorded backends, sweep on the lock-holding cleanup connection, then unlock; sweep only lab-role-made objects (ADMIN OPTION roles, owned schemas) new since the snapshot; others named, never dropped; connection lost → drop nothing, fail naming all. W4 cases, R13 |
| Fable MISSED1 · Astra SC1 (star cross-engine) | Adopted: D9 compares each star block's Node DuckDB result with `checked/<id>.txt` (plain build refuses, `--draft` warns). W8 |
| Fable MISSED2 (date churn) | Adopted: D6, D3 step 7: the date moves only with a key, result, download, `labErd` or version change. W5 |
| Fable SC1 (setup.sql name clash) | Adopted: the setup page's download is `/learn/labs/pg-checks.sql` (D7, D6) |
| Fable SC2 (checker closure) | Adopted: D6, the closure stays off `scripts/build/` except the lexer; a pure test pins it. W5 |
| Fable SC3 (route vs worker fetch) | Adopted: the held-back and 404 cases act on the main-thread `HEAD`; W10's first case asserts worker routing (D13). Declined the Caddy fixture fallback: Caddy changes are the owner's NO |
| Fable SC4 (`--update` twice) | Adopted: D3, boot runs once; `tx: own`/sessions end checks make the second run meaningful |
| Fable SC5 (boot rule on prose) | Adopted: D7 matches `codeOnly` text. W5 case |
| Astra SC2 (result files in freshness) | Adopted: D6 `blocks.<id>.result` = sha256 of `checked/<id>.txt`; the build refuses an edited result. W5 |
| Astra SC3 (browser isolation recovery) | Adopted: D11 ROLLBACK after errors; transaction control and session statements refused in isolated runs (tx control in the playground too); restart if `BEGIN`/`ROLLBACK` fails. D2 lint. W10 |

## Steps

Every step:
- `M` = `/srv/critter-ai/agent-state/missions/critwire-learn-l2-site`; `SP` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike`; `A1` = `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike`. Read the spikes; never edit them.
- **First** = the failure cases, written and run red before the code (Log: `red n → green n`). Ports bring the spike's cases (ids as the Architecture names them) before the code. No test is written after its code.
- **Checks**, one heavy job at a time. There is no lint script; `pnpm typecheck` is the static check (both tsconfigs from S10).
  - `T` = `pnpm typecheck && pnpm test`.
  - `B` = plain `pnpm build`.
  - `D` = `B`, then `pnpm test:db` (it reads `dist/`).
  - `L` = `pnpm build --draft && pnpm learn:check && pnpm build` (D16's loop). Before S6: `B && pnpm learn:check`.
  - `E` = `B`, then `pnpm e2e`. All pass, and `jq .stats e2e-artifacts/results.json` shows 0 unexpected, 0 skipped, 0 flaky.
  - `H` = `(cd dist && grep -vE ' \./(index\.html|learn/data/(manifest\.json|index\.html))$' $M/baseline-dist.sha256 | sha256sum -c --quiet)`: 169 files equal Baseline.
  - `P` = `pnpm learn:port --check all` (from S5): every ported block file and recorded result equals 004. S1 fixes the exact CLI form.
- **Content:**
  - A correction lands in 004 and on its page (block file, `checked/<id>.txt` or snapshot) in the same commit, and `P` proves they agree.
  - Copy follows AGENTS.md: records, never range; no mission names on a public page.
  - Links point only at pages that exist. Planned modules are listed unlinked.
- **Module state:** `curriculum.json` starts with every module `planned` (S2). The step that writes a module's page (or a skeleton of it) sets the module `built`, so the build's "built without a page" refusal holds at every commit.
- **A recorded result that differs from 004** is a bug to find. Only a proven change (a review fix, R6) updates 004 and the file together, with its reason under Decisions.
- **Commit** `S<n>: …` (code + plan), then push. A step that finishes a review item adds `item <n>: done (S<n>)` under Decisions; S27 adds the shas.
- **Estimate:** 28 steps. With the 6 sessions through the Steps stage, the code review, about 2 fix steps, Verification and Release, that's about 39 sessions.
- **Order vs W1–W25.** Same work and session counts. These changes go under Decisions at S1:
  1. `curriculum.json` and its refusals move from W11 to S2, because page order (`course.ts`) needs them.
  2. W3 and W4 are reordered: runner core (S3), then `tx: own`, boot and cleanup (S4), then §0's real blocks (S5). This way the runner is complete before real blocks run. `learn:port`'s first real run is in S5, because before F4 it would refuse L1's wrapped `pg-role-smoke.sql`.
  3. Slot-only skeletons get prose later: setup (S5, prose in S15) and d6 (S9, prose in S24). They give learn:check its page order and `writeStar` its recorded star results.
  4. `layout.html` moves to S11, because the first playground needs it.
  5. W12a (module template) comes before W11 (map), so the map never links a page that isn't rendered.
  6. E2E's "three pages, one worker" moves to S16, the first step with module pages.
- **Drop order** if the session cap comes close: S28 (W25, tbls), then S22 (W19, sessions runner). See Failure modes.

- [x] S1 · W1: lexer, block grammar and lints, results, plan assertions, `learn:port` (D2, D4, D16; F5's lexer half)
  - Files:
    - `scripts/build/learn/sql.ts`: gains `scriptStatements`, `ScriptError` and `codeOnly` with dollar quotes. It stays the one import-free lexer.
    - `scripts/learn/{blocks,result,plan}.ts` and their `.test.ts`. `blocks.ts` parses the grammar for `--`, and `//` for `.m`/`.dax`, including the `plan`, `sessions`, `window` and `waits` lines. The sessions runner comes in S22.
    - `scripts/learn-port.ts`; `package.json` (`learn:port`); a fixture 004 excerpt under `scripts/fixtures/`.
  - First [T]:
    - SQ1–8.
    - RQ1–5, 11, 13, 15, 17, 18, 26, RP5, RP12, PC1, PC7, RP14.
    - New lints: file name ≠ `q`; `params` on a page block; `-- plan:` outside an EXPLAIN block; an EXPLAIN block without a `rows` assertion or without a node/condition assertion; `sessions` with `after`, `boot`, `expect` or `tx`; a browser statement starting with a keyword `isolated()` refuses (D11's list).
    - Plan: a `rows` mismatch, a `no <text>` that is present, a `<text>` that is absent, each failing with its line.
    - `renderResult` gives 004's result format: header, columns, 5 rows cut at 60, "… n more", sha256 over the uncut rows. `lineDiff`.
    - `learn:port`: refuses to overwrite a differing file; `--check` names each difference; the seeded text is `renderResult`'s with no final newline.
  - Verify: `T`, `B`, `H`.
- [x] S2 · W2 + curriculum: privilege and cleanup lints, `course.ts`, `curriculum.json` (D2, D8.1)
  - Files:
    - `scripts/learn/privilege.ts` and `.test.ts`, ported from `$SP/scripts/privilege.ts`. `blocks.ts`'s lint calls it.
    - `scripts/learn/course.ts` and `.test.ts`: slots `{{block|exercise|skip|diagram:…}}`; page order is the setup page, then built modules in curriculum order; every `-- after:` block is on the same page.
    - `site/learn/curriculum.json`: 7 tracks and 33 modules from 004 §2, with `skill`, `questions` and `tools[]`, all `planned`.
    - `scripts/build/learn/site.ts`: `readLearnInputs` with the curriculum refusals, called from `scripts/build.ts`.
  - First [T]:
    - PV1–8, CL1–9.
    - Moved from S1 (Decisions): RQ15 (PostGIS blocks), RQ18 (determinism functions), RP5's privilege cases, RP12, RP14.
    - Curriculum refusals: unknown prerequisite, cycle, prerequisite listed after its module, unknown track, duplicate slug, `built` without a page, `planned` with one.
    - Slots: unknown kind, a slot without a file, a block file no page uses, `after` across pages.
  - Verify: `T`, `B`, `H`.
- [x] S3 · W3a: runner core, plain blocks, recorded results; F9 split (D3 steps 1, 2, 4; F2, F9)
  - Files:
    - `scripts/learn/runner.ts`:
      - connects through L1's `PgTarget`/`pgConnect`/`childEnv` as `critwire_lab`;
      - the session is pg-session plus `statement_timeout = 60s`, checked by `assertSession`;
      - DuckDB-shaped TYPES;
      - plain blocks: `BEGIN`, the after blocks, a SAVEPOINT before an expected error, the `learnObjects` leak check, `ROLLBACK`.
    - `scripts/learn/check.ts`: `checkLab` split into stage functions with the same lock and cleanup; it prints `server_version`, `postgis_lib_version()` and `postgis_geos_version()` (SC6).
    - `scripts/learn-check.ts`: check mode, and `--update` (runs twice, the renderings must match, then writes `site/learn/labs/checked/<id>.txt`).
    - `scripts/learn/runner.dbtest.ts`: fixture blocks under `withLabSchema`.
  - First [D]:
    - RP1–7, RP12, RQ12–14, 21, 23, LK1–3, LK5, PC1.
    - Each of these fails the block: a server WARNING; a geometry column; a timeout (cancelled, the run goes on); several rows without ORDER BY.
    - A missing recorded file fails: "no recorded result: run pnpm learn:check --update". A differing result fails with a `lineDiff`.
  - Verify: `T`; `D` (LC1–LC10 still green, since the split changes no behaviour); `pnpm learn:check` ok, as at Baseline.
- [x] S4 · W4: `tx: own`, boot, cleanup order and scope (D3 Cleanup; item 3 runner part, SC7 error paths; R13)
  - Files: `scripts/learn/{runner,check}.ts` and dbtests.
    - The cleanup connection holds the lock and records every session's `pg_backend_pid()`.
    - On every exit: cancel psql; `pg_terminate_backend(pid, 10000)` for each recorded session; sweep the new objects the lab role made (ADMIN OPTION roles: `DROP OWNED BY` + `DROP ROLE`; owned schemas: `DROP SCHEMA … CASCADE`); then unlock.
    - If the cleanup connection is lost, drop nothing and name everything.
  - First [D]:
    - TX1–6, LK4, PC7.
    - SIGINT mid-block leaves no run backend and no new object, and the lock is freed last.
    - A second learn:check during cleanup is refused.
    - A superuser-made `learn_t_` role is named with its cleanup command, not dropped.
    - A backend still alive after 10 s fails the run, named.
    - A boot block is committed once at connect and refused in `-- after:`.
  - 004 §7.6 Cleanup bullet: terminate, sweep, unlock, in that order.
  - Verify: `T`, `D`, `pnpm learn:check`. Afterwards the leak query is empty (Verification step 4).
- [x] S5 · W3b: §0's blocks ported, F4, the blocks stage live (D2, D3, D16)
  - Files:
    - `pnpm learn:port setup` writes `site/learn/sql/` for pg-session, pg-smoke, pg-role-smoke, pg-tx-smoke, setup-counts and pbi-smoke. `setup.sql` stays header-less. It also seeds `site/learn/labs/checked/*.txt` and `e2e/__snapshots__/setup-counts.txt`.
    - `pg-role-smoke.sql` becomes 004's block verbatim (F4).
    - `site/learn/pages/setup.html`: slots only, prose in S15.
    - `scripts/learn/check.ts`: L1's special pg-role-smoke step goes; the static stage; the blocks stage in page order; `--module <id>`.
    - `readLearnInputs`: slot and block refusals over the real files; `checked/` presence; orphans.
  - First:
    - [D] The LC case for pg-role-smoke now expects it from the blocks stage (red until the special step goes). `--module setup` prints and writes nothing.
    - [T] The real files pass every lint.
  - 004: §0's pg-role-smoke paragraph and §7.6's loader-stage bullet say the runner wraps every block.
  - Verify: `T`, `D`; `pnpm learn:check` twice, equal to 004's seeds; `--update` leaves `git status` clean; `P`, `B`, `H`.
- [x] S6 · W5: downloads and freshness (D6, D7; Fable MISSED2, SC2, SC5; Astra SC2)
  - Files:
    - `scripts/learn/{assemble,freshness}.ts` and their `.test.ts`.
    - `check.ts`'s downloads stage: the loader, then `psql -X -f` through `childEnv`; the `ERROR:` lines must equal the announced ones; a leak check after each file. `checked.json` is written last, through a temp file and a rename.
    - `site.ts`: `assertLabsFresh` runs after the manifest is written; plain build refuses, `--draft` warns.
    - `scripts/build.ts`; `site/learn/labs/checked/checked.json`.
  - First [T]:
    - Assembly: head comment; pg-session unwrapped; the ran, `tx: own`, untested and sessions forms; a fixture boot block pulled in once by a whole-word name in code, and not by a name only in a comment or a string; page → file (`setup` → `pg-checks.sql`); announced-error order.
    - Key sensitivity: each of these makes the block stale: its text, a transitive after block, a boot block, pg-session, a manifest file outside `star/`, a checker source, `canary.sql`, `requirements.txt`. `dois`, `bytes` and `star/` don't.
    - An edited `checked/<id>.txt` is refused.
    - A rerun with nothing changed leaves `checked.json` byte for byte.
    - The pinned checker closure: nothing from `scripts/build/` except `build/learn/sql.ts`.
  - First [D]: the ERROR-line rule. An unannounced error, a missing announced one, and the wrong order each fail, naming the file.
  - Verify: `T`, `D`, `L`, `H`. With a scratch block edit (reverted afterwards), plain build refuses "lab <id> is stale" and `--draft` only warns.
- [x] S7 · W6: ERD model, sources moved, star `planned` (D10; item 2, the star ERD)
  - Files:
    - `git mv plans/002-learn-erd.mmd site/learn/erd/v1.mmd`, and `plans/004-{learn,lab,star}-erd.mmd` → `site/learn/erd/{schema,lab,star}.mmd`. Then grep for every reference to the old paths and update it.
    - Each `.mmd` gains `accTitle`/`accDescr`. `star.mmd` gains `%% planned: dim_habitat_class, fact_country_habitat`.
    - `scripts/learn/erd-model.ts` and `.test.ts`, the spike port: `parseErd`, `dbMeta`, `META_SQL`, `PG_META_SQL`, `erdDrift`, `baseDrift`, `markers`, `starMeta`.
    - `scripts/build/learn/erd.ts`: dictionaries plus the source map, without mission names.
    - `readLearnInputs`: the v1 base check; a dictionary entity without a source.
  - First [T]: RQE1–5, RE1–6, EG1–4. EG3 runs against a fixture star manifest. A planned entity that is present fails; one that is absent is excused.
  - 004 §6: pointers to `site/learn/erd/*.mmd` and the pages replace the embedded fences. §6.3 states the planned marker.
  - Verify: `T`, `B`, `H`.
- [x] S8 · W7: `pnpm erd`, SVGs, stale refusal, lab drift (D10; R5)
  - Files:
    - `package.json`: `mermaid` 12.2.0 as an exact devDependency with no install scripts; the `erd` script. If pnpm refuses it, add `minimumReleaseAgeExclude` (R10).
    - `scripts/erd.ts`, the port of `$SP/scripts/erd.ts`.
    - `site/learn/erd/{schema,lab,star}.svg`.
    - `readLearnInputs`: a stale SVG, by `data-source-sha256`.
    - `check.ts`: lab drift after the boot blocks; `labErd` in `checked.json`.
  - First [T]:
    - ER1–4.
    - A stale SVG is refused: "site/learn/erd/lab.svg is stale: run pnpm erd".
    - A `<foreignObject>` or a missing entity is refused.
    - Any request during the render fails it.
  - First [D]: a scratch column added to a lab table makes learn:check fail, naming it.
  - Verify: `T`; `pnpm erd` twice (the second run writes nothing); `L`, `D`, `H`.
- [x] S9 · W8: the star, d6 ported (D9; F7; Fable MISSED1, Astra SC1)
  - Save first: `$M/baseline-manifest.json` = `/srv/apps/critwire/.live/learn/data/manifest.json`, after checking its sha256 is `c756dbcb…` (Baseline).
  - Files:
    - `pnpm learn:port d6`: 17 block files, plus seeded results and snapshots.
    - `site/learn/modules/d6.html`: slots only, in 004 order. `curriculum.json` marks d6 `built`.
    - `scripts/build/learn/star.ts`: `STAR_BLOCKS`; `writeStar` after `withLabTables`; `COPY … ORDER BY <pk>`; `star/manifest.json`; the cross-engine guard against `checked/<id>.txt`; star drift with planned excused; the unknown members `ZZ` and `-1`.
    - `scripts/learn/star-check.ts`.
    - `credits.ts` (`LAB_FILES` + 7); `page.ts` (7 descriptions); `scripts/build.ts`.
    - `readLearnInputs`: every `// input:` names a published star file.
    - `e2e/learn-data.spec.ts` (+ the star).
  - First [T]:
    - ST3, ST5.
    - A star block whose Node result differs from its recorded one: plain build refuses with a `lineDiff`, `--draft` warns.
    - A missing unknown member is refused.
    - An `// input:` naming an unpublished file is refused.
  - First [E]: PB2–7 via `star-check` (header, rows, sha256, keys unique and filled, foreign keys found, unknown members, `NA` read as text); the manifest lists `star/`; the cap.
  - Decisions: `/learn/data/index.html` changes (F8, last row).
  - Verify:
    - `T`; `L` (every d6 PostGIS block green against 004's results); `D`, `E`, `H`, `P`.
    - `dist/learn/data/` is about 40.0 MB, under 50,000,000.
    - The manifest differs from `$M/baseline-manifest.json` only in `star/` and `bytes`.
- [x] S10 · W9: pins, extension, bundle, assets (D8.6, D11 bundle; F5; R7, R10)
  - Files:
    - `package.json` and the lockfile: `@duckdb/duckdb-wasm` 1.33.1-dev65.0 and `esbuild` 0.28.2 in `dependencies`, exact. `typecheck` runs both tsconfigs. `minimumReleaseAgeExclude` only if pnpm refuses a pin.
    - `site/learn/duckdb-ext/v1.5.6/wasm_eh/parquet.duckdb_extension.wasm`, from `$SP/downloads`, sha256 `33094a01…a473`.
    - `scripts/build/licenses.ts`: moved out of `sources.ts`, which re-exports it.
    - `site/learn/tsconfig.json`; `site/learn/src/{app.ts,assets.ts,learn.css,text.d.ts}`: the entry stub and the pin constant.
    - `scripts/build/learn/assets.ts`: vendoring, the esbuild metafile, mtime 2000-01-01, and a refusal of any path that is neither versioned nor hashed.
    - `e2e/serving.spec.ts` (+).
  - First [T]: the extension's sha256 differs; the installed duckdb-wasm ≠ the pin; an unversioned path under `assets/`; a `node:` import fails esbuild.
  - First [E]: `.wasm` served as `application/wasm`; `Last-Modified: Sat, 01 Jan 2000 00:00:00 GMT` on every `/learn/assets/` file.
  - Verify: `T`, `E`, `H`. Two builds give an identical `dist/learn/assets/`.
- [x] S11 · W10a: engine, SC2, T13 (D11 boot, D15; item 6 SC2; R1, R2)
  - Files:
    - `site/learn/src/engine.ts`, the spike port: boot steps 1–7, streaming with the 10 000-row cut, the generation counter, Reset and Stop by restart.
    - `site/learn/layout.html`; `pages/playground.html` (minimal); `src/pages/playground.ts`.
    - `scripts/build/learn/pages.ts`: layout and playground only.
    - `e2e/helpers.ts`: `learnContext`, `waitReady`.
    - `e2e/learn-browser.spec.ts`, `e2e/learn-timing.spec.ts`.
    - `playwright.config.ts`: `snapshotPathTemplate`, `updateSnapshots: "none"`.
  - First [E], in this order:
    1. The worker's `.wasm` fetch reaches `context.route`.
    2. With the `.wasm` held back, the text is readable and Run is disabled, with progress.
    3. With the `.wasm` answering 404, the page says why.
    4. A tampered `/v1/species.parquet` is refused (SC2).
    5. The 10 000-row cap.
    6. Reset (a learner table plus a DELETE) and Stop (a runaway query), then the next query runs.
    7. Then `learn-timing`: the median of 5 first visits is written to `setup-timing.json` and must be ≤ 4,350 ms.
  - T13: if the median is over 4,350 ms, apply D15's fallback in this step and re-measure; record it under Decisions.
  - Verify: `T`, `E`, `H`. Log the median.
- [x] S12 · W10b: format, cards, checks, isolation (D11; Fable MF1, Astra MF1, Astra SC3; R11, R12)
  - Files:
    - `site/learn/src/{format,cards,check,csv}.ts`, ported from the spike and from `A1/src/check.ts`.
    - `sql.ts`: `readsOnly`.
    - `engine.ts`: `isolated(after[], sql)`, `persistent(sql)`; refusals by first keyword; ROLLBACK after an error; a restart if `BEGIN` or `ROLLBACK` fails; the changed flag.
    - `window.critwireLearn.result`.
    - `blocks.ts`: the lint shares the keyword list.
  - First [T]:
    - CR1–12, DC1–5.
    - A1's check cases: multiset, in order, hints, probes.
    - `readsOnly` classifies each correctly: a CTE `DELETE`, `EXPLAIN ANALYZE`, a keyword inside a string or comment, `nextval`, `SELECT … INTO`.
    - The isolated refusal list.
  - First [E]: transaction control is refused in the playground; a playground SELECT leaves the generation unchanged; a DELETE marks it changed. The lesson side of this lands in S15.
  - Verify: `T`, `E`, `H`.
- [x] S13 · W12a: module template, block kinds, downloads (D12; F10; 004 §7.2–7.3)
  - Files:
    - `pages.ts`: the block-slot pass before `fillSlots`; a leftover `{{` is refused.
    - The module frame: title and id, badges, Prev/Next within the track (built modules only), prerequisites, Mark done.
    - Block kinds:
      - duckdb: an editor with `data-block`/`data-after`, Run/Stop/Reset, "Runs after", Cards/Table tabs;
      - postgis: read-only with Copy, the recorded result or the untested reason, "Checked <date> on PostgreSQL…, PostGIS…, GEOS…", the download link, a Lab schema button;
      - m/dax: inputs from the star manifest;
      - exercises and skip checks.
    - `src/{editor,pages/module}.ts`.
    - `writeLearn`: `dist/learn/labs/<page>.sql` from `assembleSql`.
    - `e2e/learn-labs.spec.ts`; `learn-browser` (+).
  - First [T]: a leftover `{{` is refused; so is an unknown slot kind.
  - First [E]:
    - learn-labs: page code appears verbatim in its download; untested and sessions blocks are commented out under their reason; the shown result = `checked/<id>.txt`; the versions = `checked.json`'s.
    - learn-browser: every browser block of the setup and d6 skeletons equals its snapshot, and cards follow the card rule; `d6-ex` accepts its answer and rejects a fixed wrong one.
  - Verify: `T`, `L`, `E`, `H`.
- [x] S14 · W11: map, tracks, progress, nav, docs link (D11 nav, D12; 004 §7.1, §7.4)
  - Files:
    - `site/learn/pages/{map,track}.html`; `src/{nav,progress}.ts`; `pages.ts` (the map and the 7 track pages with their questions).
    - `site/index.html`: "Learn" → `/learn/`, replacing L1's `/learn/data/` line.
    - `site/style.css`; `e2e/learn-map.spec.ts`; `e2e/docs.spec.ts`.
  - First [E]:
    - Map and tracks follow `curriculum.json`: order, hours, prerequisites, planned modules unlinked "in preparation".
    - A tick survives a reload, and Clear progress removes it.
    - Every `/learn/` page returns 200, has one `<h1>` and no broken internal link.
    - The docs page links to `/learn/`.
    - Nav swaps `<main>` and focuses the `<h1>`; a failure falls back to a full load.
  - Verify: `T`, `E`, `H`.
- [x] S15 · W12b: setup page, schema pages and dialogs, playground (D10 dictionaries, D12; item 2 planned teaching; Fable MF1 E2E)
  - Files:
    - `pages/setup.html` prose: §3.1 with `setup-counts`, §3.2 with §0's four PostGIS checks and `pg-checks.sql`, §3.5 with `pbi-smoke`.
    - `pages/schema.html`: `/learn/schema/`, `/lab/` and `/star/`, each with its dictionary, the relationships in words, `species_taxonomy`, and the lab-made and planned lists. The star page teaches "planned": drawn, not yet published. Each SVG is also linked on its own.
    - Schema and Lab schema dialogs: Escape closes them and returns focus.
    - Playground: tables listed and linked to the dictionary; Download CSV.
    - The map gains its setup and schema links.
    - `e2e/schema.spec.ts`; `learn-browser` (+); `learn-labs` (+ `pbi-smoke` via `star-check`).
  - First [E]:
    - Schema v2 drift against the browser catalog, through the playground.
    - The three pages and their SVGs, planned tables marked.
    - Changed generation: after a playground SELECT, `d6-ex`'s Check works. After a playground DELETE, Check refuses with "Changed the tables? Reset database brings them back."; after Reset, it passes.
    - A `COMMIT` typed in a lesson editor is refused, and the next result is unchanged.
    - The dialogs work by keyboard alone.
  - 004 §3.2: the `pg-checks.sql` download (recorded under Decisions).
  - Verify: `T`, `L`, `E`, `H`.
- [x] S16 · W13: f1 + f2 (004 §5.1)
  - Files:
    - `pnpm learn:port f1`, `f2`.
    - `site/learn/modules/{f1,f2}.html`: "Already know this?", then Concept, Worked example, Lab, Result, Exercise, Answer, Check, Dialects. SQL Server appears only in dialect notes.
    - `curriculum.json`: f1, f2 `built`.
  - First [E]: the seeded snapshots run red before the pages exist; each skip check marks its module done; three pages (f1, f2, playground) start one worker (`page.on("worker")`).
  - Verify: `T`, `P`, `E`, `H`.
- [x] S17 · W14: f3 + f4, as S16. f3's first block is the release smoke's; check that it renders cards or a table as 004 says. Verify: `T`, `P`, `E`, `H`.
- [x] S18 · W15: d1 (item 5 d1; item 6 SC1)
  - Files: `pnpm learn:port d1`; `modules/d1.html`; d1 `built`.
  - 004 and page together:
    - 004:1950–1952, 1995 and the claim that rank needs a trigger: a nullable UNIQUE is an optional unique id, not a candidate key; a composite FK to `taxa (name, taxon_rank)` enforces rank declaratively. A changed or added block is recorded by `learn:check --update`, and 004's result block changes with it.
    - SC1: the external-id UNIQUEs stay, as L1's A7 decided; the copy says a shared id fails the build.
  - First [E]: snapshots; every exercise, including the `-- expect: error` probes (a missing constraint is rejected). learn:check runs against the seeded results.
  - Verify: `T`, `L`, `P`, `E`, `H`; `d1.sql` is listed in `checked.json`.
- [x] S19 · W16: d2 (item 5 d2)
  - `pnpm learn:port d2`; `modules/d2.html`; d2 `built`. No PostGIS block.
  - 004:2357, 2360 and page: lists can be unnested, joined and counted, but element-level foreign keys are lost; the 3NF mnemonic is introductory; a lossless split needs the shared attributes to determine a component.
  - First [E]: snapshots, exercises.
  - Verify: `T`, `P`, `E`, `H`.
- [x] S20 · W17: d3 (item 1 SC6; item 5 d3)
  - `pnpm learn:port d3`; `modules/d3.html`; d3 `built`.
  - `-- plan:` headers on every EXPLAIN block (`rows` plus a node or condition, as D4's `d3-btree`), with `d3-analyze` first. The page shows the assertions and the plan as an example, labelled with its versions.
  - 004 and page:
    - §0 "Result blocks": plan text is an example; data results keep their hashes.
    - 004:2693, 2696: avoiding index-only scans removes one source of variation, not all; BRIN helps with partial correlation.
  - Decisions: the DoD's "every printed hash equal" is qualified (item 1).
  - First:
    - [T] The real d3 blocks fail the plan lint before their headers.
    - [D] A scratch assertion that doesn't hold fails, named.
  - Verify: `T`; `L` twice, with equal results; `P`, `E`, `H`.
- [x] S21 · W18: d4 (item 4 copy)
  - `pnpm learn:port d4`; `modules/d4.html`; d4 `built`.
  - `d4-wait` and `d4-isolation` stay `untested` here, rewritten with leading `-- waits:` and `-- fails:` lines, in 004 and on the page.
  - 004:3304, 3560 and page: the upsert labs don't cover upstream deletions or changed keys; "readers don't wait" holds for ordinary MVCC reads, not for locking reads or DDL (`d4-locks`).
  - Verify: `T`, `L`, `P`, `E`, `H`. `d4.sql` comments out both blocks under their reason.
- [x] S22 · W19: the `-- sessions:` runner (D5; item 4; R8). Dropped second.
  - Files:
    - `scripts/learn/runner.ts`:
      - two recorded sessions, both with pg-session and `lock_timeout = '30s'`;
      - a 50 ms `pg_blocking_pids` poller on the cleanup connection;
      - a `waits` statement must show as blocked within 5 s;
      - an unmarked wait fails at once and is cancelled;
      - result rows are `window | statement | …`;
      - the end checks.
    - `d4-wait` and `d4-isolation` become `-- sessions: A, B`, `ran`, with recorded results.
    - 004: §0 statuses, §7.3's untested list, d4's text. The downloads still comment both blocks out ("needs two psql windows").
  - First [D]:
    - A `waits` statement that doesn't wait fails: "didn't wait".
    - An unmarked statement that waits fails at once and is cancelled.
    - A release after 10 s passes.
    - Cleanup terminates both backends.
  - If it isn't done in its session: revert to S21's state; the blocks stay `untested`; the reason goes under Decisions (D5 Budget).
  - Verify: `T`, `D`; `L` twice; `P`, `E`, `H`.
- [ ] S23 · W20: d5 as `critwire_lab` (item 3 d5 copy; R6)
  - `pnpm learn:port d5`; `modules/d5.html`; d5 `built`. `d5-database` stays `untested`, with 004's reason.
  - 004 and page: a fresh-database default (PostgreSQL 15+ `public`) isn't proof, so inspect the actual ACLs (`\dn+`, `has_schema_privilege`); membership `INHERIT` and `SET` are options (`GRANT … WITH INHERIT FALSE, SET FALSE`).
  - A result that moves as `critwire_lab` (R6) goes to 004 and the recorded file, with its reason under Decisions.
  - Verify: `T`; `L` twice; `P`, `E`, `H`. The leak query is empty afterwards.
- [ ] S24 · W21: d6 prose and SC9 (item 2)
  - `modules/d6.html` prose on S9's skeleton.
  - `d6-scd2`, in 004 and page:
    - before the UPDATE, a query of the facts matching ≠ 1 version returns 0 (overlap or gap);
    - after it, `ALTER TABLE fact_records ALTER COLUMN species_key SET NOT NULL`;
    - the partial unique index means at most one current row, and a query proves exactly one;
    - the 2018 boundary is a teaching convention;
    - observation time is separate from identification time.
  - 004 §6.3 and 004:7091: `dim_species` is shared by the two species facts, not the habitat fact. 004:4093 says the star is rebuilt by each build from the lab's normalized tables.
  - Verify: `T`; `L` twice; `P`, `E`, `H`. The star files stay unchanged unless a `STAR_BLOCKS` block changed.
- [ ] S25 · W22: diagrams (D14)
  - First-run gate, answered per the Addendum: default tokens, `Font source: system`, profile `critwire`, and `.diagram-design` committed.
  - `site/learn/diagrams/`: `critwire-pipeline` (setup), `d3-scans`, `d4-mvcc`, `d6-drill-across`. Each is exported light and dark with `export_svg.py --system-fonts`, passes `self_check.py --offline`, and goes in a `{{diagram:…}}` slot that writes `<picture>`.
  - First:
    - [T] The build refuses a missing variant, an SVG without `<title>`, a remote reference, and an unused file.
    - [E] Every referenced SVG returns 200 and has its `<img alt>` and `<title>`.
  - Verify: `T`, `E`, `H`.
- [ ] S26 · W23: E2E completion and the release helper (D13 artifacts)
  - Screenshots `<page>-<width>-<scheme>.png` for the map, f3, d3, `schema-lab` and setup, at 1280 and 375 px, light and dark: 20 files. Every DoD E2E item has a test; list them in the Log.
  - `playwright.release.config.ts` + `e2e/release/live.spec.ts`, which the default config ignores. They run against `RELEASE_ORIGIN`:
    - every built `/learn/` page returns 200;
    - the `.wasm` files are served as `application/wasm`;
    - f3's first block on `/learn/foundations/join/` equals its snapshot.
  - Verify:
    - `T`.
    - `E2E_ARTIFACTS=$M/e2e-s26 pnpm e2e`: full, nothing skipped.
    - The helper dry-runs against the local Caddy (`RELEASE_ORIGIN=http://127.0.0.1:3100`).
    - `H`.
- [ ] S27 · W24: AGENTS.md, 004 final pass, handoff, audit
  - AGENTS.md:
    - the commands `learn:port`, `erd`, `learn:check --update|--module`;
    - the files under `site/learn/` and the tsconfigs;
    - the dev loop (D16);
    - the `replacedBy` line reworded: the refusal stays until retirement is supported (F8).
  - 004: §0 (re-running the tests: `pnpm learn:check`; the spike is frozen), §6, §7.3, §7.5–7.7 and §9 agree with the code.
  - Handoff item in `/srv/critter-ai/handoff/critwire.md`: the owner's 30-minute Windows check (Docker PostGIS, the loader, one d-module download). It blocks nothing.
  - Audit: each of items 1–7 has a Decisions line, `done (S<n>, <sha>)` or `rejected` with evidence. Every "Order vs W1–W25" change is under Decisions. L1's `env.ts` SHOULD-CONSIDER is noted for the Summary. A gap becomes a new step before Verification.
  - Verify: `T`, `P`, `L`, `E`, `H`.
- [ ] S28 · W25 (optional, dropped first): tbls (item 7)
  - The condition (under 45 sessions at the Steps stage) holds; the cap still applies (Failure modes).
  - Install a pinned arm64 release, with its sha256 checked, into `~/.local/bin`, with no apt.
  - d1 gets a short `sh` exercise that reverse-engineers the learner's lab database. tbls's Mermaid output is compared once with `lab.mmd` through `erd-model`; the record goes to `$M/tbls-compare.txt`. 004's d1 and the page change together.
  - If dropped: 004 records it as a later idea.
  - Either way, item 7 gets its Decisions line.
  - Verify: `T`, `P`, `E`, `H`.

## Verification

Run once, on the final commit (after any code-review fixes), on a clean tree, in this order. `M`, `H` and `P` are as in Steps. Log each result; the numbers go to the Summary. Leak query: `psql -d critwire_dev -XAtc "select rolname from pg_roles where rolname like 'learn\_%' union all select nspname from pg_namespace where nspname like 'learn\_%' and nspname not in ('learn_spatial','learn_curriculum')"` must be empty.

1. **Install:** `pnpm install --frozen-lockfile` is up to date. `jq -r '.dependencies["@duckdb/duckdb-wasm"], .dependencies.esbuild, .devDependencies.mermaid' package.json` gives `1.33.1-dev65.0`, `0.28.2`, `12.2.0`.
2. **Build:** plain `pnpm build` passes (fresh labs, current DOIs, no stale SVG). `find dist/learn/data -type f -printf '%s\n' | awk '{s+=$1} END{print s}'` is under 50,000,000 (about 40.0 MB), and so is the same sum over `data/raw/gbif-sample data/learn data/gbif-learn-sample`.
3. **E2E (primary):** `rm -rf $M/e2e && E2E_ARTIFACTS=$M/e2e pnpm e2e`.
   - Specs: `attribution`, `countries`, `docs`, `duckdb`, `files`, `learn-data`, `serving`, `learn-map`, `learn-browser`, `learn-labs`, `learn-timing`, `schema`.
   - `jq .stats $M/e2e/results.json`: unexpected 0, skipped 0, flaky 0.
   - Artifact `$M/e2e/` holds:
     - `playwright-report/index.html`;
     - one `trace.zip` per test (`find $M/e2e/test-results -name trace.zip | wc -l` = `.stats.expected`);
     - `results.json`, `setup-timing.json`, `caddy-access.log`;
     - the 20 screenshots (S26) and L1's `learn-data-*.png` and `docs-375.png`.
   - Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
4. **Static and isolated tests:** `pnpm typecheck` (root and `site/learn/tsconfig.json`); `pnpm test`; `pnpm test:db`. Then the leak query is empty.
5. **learn:check:**
   - `psql -d critwire_dev -XAtf db/learn/canary.sql > $M/canary-before.txt`.
   - `pnpm learn:check` twice, each exit 0: the loader stage; every PostGIS block of setup and d1–d6 green in check mode; every download (`pg-checks.sql`, `d1.sql`, `d3.sql`–`d6.sql`) with exactly its announced `ERROR:` lines.
   - After both runs `git status --porcelain` is empty (`checked.json` unchanged byte for byte), the canary `diff` is empty, and the leak query is empty.
   - The printed versions equal `checked.json`'s.
6. **004 parity:** `P` reports 0 differences: every block file, PostGIS result and browser snapshot equals 004. EXPLAIN text is exempt, per D4; its assertions hold in step 5.
7. **ERDs:** `pnpm erd` writes nothing (`git status --porcelain site/learn/erd` is empty).
8. **Existing files unchanged:** `H` passes (169 files), and this diff is empty: `diff <(jq -S 'del(.bytes) | .files |= with_entries(select(.key | startswith("star/") | not))' dist/learn/data/manifest.json) <(jq -S 'del(.bytes)' $M/baseline-manifest.json)`.
9. **Determinism:** `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > $M/dist-1.sha256`, then plain `pnpm build`, then the same into `$M/dist-2.sha256`. `diff` is empty.

**Definition of done → proof:**

| DoD item | Proved by |
|---|---|
| typecheck (both), test (ports first), plain build | steps 1, 2, 4; each step's Log `red n → green n` |
| `pnpm e2e` in full: every browser block of f1–d6, every exercise accepted and a fixed wrong one rejected, skip checks, Reset/Stop/one start across three pages, lab code = download, origin fence (Wikimedia fixture only) | step 3 (`learn-browser`, `learn-labs`, `learn-map`; `learnContext`) |
| Results equal 004's (data hashes; plans by meaning, SC6) | steps 5 and 6 |
| learn:check twice, downloads on a fresh load, leak query empty | step 5 |
| Existing files unchanged (manifest gains `star/`; both `index.html`) | step 8 |
| 50 MB cap with the star | step 2; `learn-data` cap case |
| Measured: setup ≤ 1.5 × 2.9 s (T13) | `$M/e2e/setup-timing.json`, median ≤ 4,350 ms |
| Artifacts | step 3 |
| dist reproducible | step 9 |
| Release smoke | below |
| Summary: shipped, E2E counts and path, setup timing, every deviation from 004, release record, notes for L3 | written after steps 1–9 |

**Release smoke** (the Release unit, after `gh pr merge` and `deploy critwire`; `L` = `https://critwire.com`; `dist/` is built from the merge commit):
- Every built `/learn/` page (each `dist/learn/**/index.html` outside `learn/data/`) returns 200 at `$L/<path>/`, with a body sha256 equal to dist's. `$L/` contains `href="/learn/"`.
- `$L/learn/assets/*.wasm` returns 200 with `content-type: application/wasm`. Every `/learn/assets/`, `/learn/labs/*.sql`, `/learn/schema/*.svg` and `/learn/diagrams/*.svg` file returns 200 with a sha256 equal to dist's.
- `$L/learn/data/manifest.json` equals dist's. Every `star/` file returns 200, with the sha256 and bytes the manifest gives.
- Every Baseline `/v1` and L1 `/learn/data/` file (the `H` list) fetched from `$L` hashes as in `$M/baseline-dist.sha256`.
- `RELEASE_ORIGIN=$L pnpm exec playwright test -c playwright.release.config.ts`, with artifacts in `$M/release-smoke/`: f3's first block on `/learn/foundations/join/` shows its recorded result.
- `$L/learn/data/postgis/learn_curriculum.sql` and `$L/learn/labs/d3.sql`, saved to a temp folder:
  - `psql -X -v ON_ERROR_STOP=1 -d "$LEARN_PG_URL" -f learn_curriculum.sql`;
  - then `psql -X -d "$LEARN_PG_URL" -f d3.sql`: its `ERROR:` lines are exactly d3's announced ones (none);
  - then the leak query is empty.
- `## Release` records the merge commit, `deploy`'s last line, these results and the log path.

## Failure modes

Each step's isolated cases are its **First** list. What a session does when the plan meets reality:
- **A result differs from 004** (learn:check, a snapshot or `P`): find the bug (port, types, isolation, session). Only a proven change updates 004 and the recorded file together (Decisions).
- **T13 over 4,350 ms** (S11): apply D15's fallback in S11 and re-measure. If it's still over, record it under Decisions and in the Summary; it blocks nothing.
- **S22 unfinished in its session:** revert its uncommitted work. d4's two blocks stay `untested`; record why under Decisions; go on with S23.
- **pnpm refuses a pin** (S8, S10): `minimumReleaseAgeExclude` for that exact package, as L1 did. Never loosen a pin.
- **diagram-design gate or export:** answer per the Addendum. Fix a `self_check.py --offline` failure in the source. SVG only.
- **Cap breach:** stop. 004 §4.4's cuts change what's published: add a handoff item, record under Decisions.
- **`LEARN_PG_URL` broken or `critwire_lab` missing:** `pnpm learn:check --setup` as superuser per AGENTS.md. Never `--reset-password` without `--env` for each checkout.
- **Leak query not empty:** the sweep's message names each object and its command. Drop only this mission's lab-role objects; anything else becomes a handoff item.
- **Session budget:** at each session start, `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l2-site.log`. Past 48:
  - check S28 off as dropped (004 records tbls as a later idea), then S22 if it isn't done (the blocks stay `untested`);
  - give each unfinished assigned item a Decisions line and a handoff item for L3;
  - go on to the code review, Verification and Release.
  - S1–S21 and S23–S27 hold Goal work and are never deferred.

## Code review (Astra)

## Release

## Decisions

- 2026-10-28 · Steps stage: planner reordered W1–W25 into S1–S28 (content unchanged): `curriculum.json` + checks W11→S2 (page order needs them); runner finished on fixtures (S3, S4) before §0's blocks run live (S5; L1's `pg-role-smoke.sql` would refuse them earlier); setup (S5) and d6 (S9) pages start as slot-only skeletons, prose in S15/S24, modules `planned` until their page lands; layout moves to S11 (first playground needs it); module template S13 before map S14 (map never links a missing page); "three pages, one engine start" E2E moves to S16. No lint script in package.json: typecheck is the static check. Drop order: S28 (tbls), then S22 (sessions runner).
- 2026-10-28 · S1: RQ15's PostGIS half, RQ18's determinism half, RP5's privilege cases, RP12 and RP14 move to S2: the spike implements them in `privilege.ts`'s `blockRuleErrors`, so porting them in S1 would write PV code before PV1–8's tests. S1 covers RQ15 for browser blocks (D11's isolated-refusal lint, which also refuses DuckDB `SET`, RP5 p5i), RP5 p5j/p5k (params refused; `after` across engines) and RQ18's ORDER BY half as the pure `rowsOrdered` (enforced at run time, S3). RQ11 is `learn:port`'s (a ran fence without its result, a result for another id, an orphan).
- 2026-10-28 · S1: `-- params` is refused on every block (D2: page blocks take none, and every block is a page block). `cellText` lives in import-free `scripts/learn/cell.ts`, so `result.ts` (Node, sha256) and S12's browser `format.ts` share one cell form. Block paths (`BLOCK_DIR`, `CHECKED_DIR`, `SNAPSHOT_DIR`), `PG_SESSION` and `PBI_STATUS` live in `scripts/learn/blocks.ts`. Statement-level lints (browser refusals, `-- fails:`/`-- waits:`/`-- window`, raster, `-- plan:`) apply to `ran` blocks only, so d4's untested window blocks pass until S22.
- 2026-10-28 · S1: `P`'s form is `pnpm learn:port --check all`; `all` = every 004 page with any block file in `site/learn/sql/`. It fails until S5 because L1's wrapped `pg-role-smoke.sql` makes `setup` count as ported and differs from 004 (F4), as the plan expected. Writing refuses `all`; it ports named pages only.
- 2026-10-28 · S2: `privilege.ts` is the spike's, with one change: a DuckDB block's SET, RESET and transaction control are refused once, by S1's `isolatedRefusal` (D11), not again by PV5/PV7 (DuckDB `set_config` and ALTER SYSTEM/DATABASE still are). The leak query and messages (spike LK) aren't ported here: the runner reuses `check.ts` `learnObjects` (F9), S3/S4. `lintPage` runs PV1–PV8 with each block's `-- after:` chain and CL1–CL9 (minus `-- fails:` statements) on ran PostGIS blocks.
- 2026-10-28 · S2: `curriculum.json` comes from 004 §2's table; `tools[]` from each module's `**Tool:**` line (codes B, PG, Py, PBI; "PG + B" for d6, as its header says), `questions[]` split at each `?`, titles written fresh (004 has only slugs). Slugs are unique across the course, not just per track. Two refusals beyond the list: a module page with no curriculum entry, and a track with no module. `readLearnInputs` checks the curriculum only for now; `assembleCourse` (slots, block files, unused files, per-page lint) is wired over the real files in S5, when the setup page lands (before that, L1's two block files have no page).
- 2026-10-28 · S3: `learnObjects` (the leak query) moves from `check.ts` to `runner.ts` and `CANARY_SCHEMA` to `pg.ts` (`check.ts` re-exports it), so `check.ts` → `runner.ts` stays one-way. The session's timeout is `SET statement_timeout = '1min'` after pg-session's SET; the per-block client deadline (60 s, `timeoutMs` in tests) cancels, and a `57014` from the server's own timeout counts as the same timeout. The blocks stage runs the `blocks` `checkLab` is given: none until S5 wires the course (the CLI prints `blocks: 0 PostGIS block(s)`). `--update` writes only when every block passed and both runs agree (plan blocks: assertions both times), and leaves equal files untouched. Until S4, `runBlock` refuses `-- boot`, `-- tx: own` and `-- sessions:` blocks loudly. L1's explicit unlock is kept (S4 reorders cleanup).
- 2026-10-28 · S4: the lock-holding cleanup connection is its own module, `scripts/learn/cleanup.ts` (`takeLabLock` → `record`, `release`): it reads the start snapshot itself, so `check.ts`'s `Run.objectsBefore` became `lock.known`. The leak query and the sweep's parts (`learnObjects`, `labMade`, `dropObjects`, `superuserCleanup`) moved to `scripts/learn/leaks.ts`, shared by the runner (LK4) and the cleanup, so neither imports the other's module for them; `tablesDiff` moved to `runner.ts` (TX3 needs it), `readTables` is exported. Recorded sessions are stopped only if their `application_name` is the runner's (`RUNNER_APP`), so a reused pid can't hit an unrelated backend. A `-- tx: own` block reads its watched schemas (canary where it exists, `learn_curriculum`) before and after itself, rather than carrying a reading between blocks. An abort now reaches the runner: `openSession(target, signal)` cancels the running statement and throws the reason; a session whose connection closed refuses to run (postgres.js would reconnect silently without pg-session). The cleanup connection sets `lock_timeout = '30s'`, so a sweep waiting on a lock fails instead of hanging. "A backend alive after 10 s" is tested with a superuser's backend the lab role can't terminate (CU4): no session can be made to survive SIGTERM on purpose.
- 2026-10-28 · S5: one course reader, `scripts/learn/course-files.ts` `readCourse` (curriculum, setup + module pages, every block file's lint, slots, `checked/` presence and orphans), shared by the build's `readLearnInputs({draft})` and learn:check's static stage, so the checker stays inside `scripts/learn/`. learn:check's static stage (`check.ts` `staticStage`) runs before connecting: a lint error needs no database to fail. A ran PostGIS block without `checked/<id>.txt` fails a plain build and only warns with `--draft` (D16's loop: `learn:check --update` writes it); an orphan `checked/*.txt` fails both. The loader stage now ends with its own leak check: with real blocks running, a loader's leak was otherwise blamed on every block (LC8 went red on it); LC8 expects "the loader left behind". `runBlocks` logs `q <id>: ok` per block (the LC case proves pg-role-smoke ran in the blocks stage). `--module <page>` takes setup or a built module, refuses `--update`, prints each block's rendered result. `setup.html` has no `{{block:setup}}`: setup.sql is header-less and runs at boot. AGENTS.md's learn:check line changed now, since it named the removed step; S27 does the rest.
- 2026-10-28 · S6: learn:check assembles the downloads itself with the build's `assembleDownloads` and runs them from its temp folder; the build writes `dist/learn/labs/` in S13 (`writeLearn`), from the same function, and already stamps their sha256 through `freshness.ts`. `labErd` waits for S8, where the drift check it stamps lands. Assembly: a page's own boot blocks are in its download's boot section too (D7's name rule alone would leave the page that teaches one without it); an `-- after:` block appears as `-- runs first: <id>` plus its code (headers dropped, so each id's `-- q:` line appears once), direct only, as the runner runs it; a ran `-- sessions:` block is commented out with "it needs one psql window per session (A, B)". Key: the involved block ids sorted as one set (004's "block ids sorted, then the files"), every input as `name\0sha256`. `checked.json` is written by every whole-course run, check mode included (that is D16's loop), never by `--module`, and not by `checkLab` callers without `stamp` (the dbtests' fixture runs). A ran block without `checked/<id>.txt` gets `result: ""` (readCourse already names it). 004 §7.3 (pg-checks.sql, sessions blocks) and §7.5 (manifest `files` outside `star/`, result sha256, date rule) follow; AGENTS.md's build and learn:check lines now name the refusal and the loop.
- 2026-10-28 · S7: `labDrift` became `markerDrift` (lab and star share it) plus `markerErrors` (markers vs the diagram alone, no catalog: the build's static check); a planned table that exists gives one message (the stale marker), not also "in the database but not in the ERD". `starMeta` reads a structural `StarTables` type in `erd-model.ts`; S9's `StarManifest` must satisfy it. `parseErd` reads `accTitle:`/`accDescr:` (one line each; the block form refused, since `accDescr {` would otherwise open an entity) and keeps each type as written (`written`, for the lab's lower-case dictionaries). The drawn three need both; v1.mmd needs neither and stays byte-equal to 002 §3's block. RE5 is now the records test: 002 §3's block equals `v1.mmd`, 003's block equals `plans/003-learn-erd.mmd`, whose `%% extends:` now names `../site/learn/erd/v1.mmd`, unchanged against it (`embedDrift` kept for that). RE6 (`erd.ts --name`) moves to S8 with the render script. Dictionaries are data (`Dictionary[]`; S15 renders HTML). Source map rewritten: no mission names, no § numbers, and no DOI in the occurrences source ("cited in the credits"), so a sample refresh can't stale it. Before 004 §6 lost its dictionaries, they were compared with the generated ones (`$M/s7-dict-compare.ts`): 0 structural differences after `lab.mmd` took 004's CHECK details for 3 columns (coordinate_uncertainty_m, year, est_area_km2). `readLearnInputs` returns `erds` (the four texts) for S8/S9/S15.
- 2026-10-28 · S8: renderer in `scripts/learn/erd-render.ts` (`renderErd`, `writeErds`), CLI `scripts/erd.ts` (`pnpm erd [--force]`: checks the sources with `erdErrors` first, draws only stale SVGs, writes none if one fails). No `--name` (RE6 dropped): the CLI draws the three fixed names; `writeErds(dir, names)` is what the tests drive. Spike port plus: `handDrawnSeed: 1` (Mermaid 12's rough.js shapes take random control points, so two forced renders differed byte for byte; seeded, two `--force` runs are equal); the SVG's `<title>`/`<desc>` must equal accTitle/accDescr; the request guard refuses everything but data:/blob: (no origin to allow). `svgStale` lives in `erd-model.ts` (renderer and build share it; `ERD_DIR`, `LAB_ERD` moved there too, so learn:check's closure stays off `scripts/build/`; FR7's pinned list gains `erd-model.ts`). Lab drift: `runBlocks` gained `afterBoot`, learn:check's `assertLabErd` (PG_META_SQL on the runner session, `markerDrift`); a drift throws before any other block runs. `checkLab({labErd})` is optional so fixture runs keep their own schemas; the CLI always passes the committed `lab.mmd` (static stage parses it). `labErd` = sha256 over `lab.mmd`, the loader's manifest sha256 and the ran boot blocks; a stamp without it or with another is refused. `mermaid` 12.2.0 installed exact with no release-age exclude needed and no build scripts. `LOADER` is exported once from `freshness.ts` (check.ts imports it).
- 2026-10-28 · S9: `/learn/data/index.html` changes (F8): it lists every manifest file, so it gains the star's 7 rows (descriptions in `page.ts`); `/learn/data/manifest.json` gains `star/` and `bytes` moves, nothing else (checked against `$M/baseline-manifest.json`). `star-check.ts` is a module, not a CLI: the build (`writeStar`) and E2E (`learn-data`) import it; the spike's ST1 (`semanticDiff`, PostGIS `\copy`) is not ported, D9's per-block guard replaces it; ST2's Python half is dropped (DuckDB `read_csv(all_varchar)` is the reader both sides use). `writeStar` runs the six blocks in one DuckDB session in `STAR_BLOCKS` order (`starBlocks` refuses an `-- after:` not published earlier), renders each last result with `renderResult` (DuckDB objects such as DECIMAL as their text) and compares it with `checked/<id>.txt` (`readRecorded`, exported from `freshness.ts`); unknown members and star.mmd drift fail `--draft` too, only the guard warns. Credits: `dim_country` Natural Earth, `dim_dataset`/`dim_year`/`fact_records` the GBIF sample, `dim_species`/`fact_species_country`/`star/manifest.json` critwire (the spike's map). `STAR_INPUT` exported from `blocks.ts`. `withDist` moved from `projection.test.ts` to `dist-fixture.ts` (star.test.ts shares it). CU6 now reads the real module pages: built ⇔ page. The six CSVs equal the spike's export byte for byte (sha256).
- 2026-10-28 · S10: only the eh engine is vendored (`duckdb-eh.wasm`, `duckdb-browser-eh.worker.js`): D11 boots eh and gives other browsers a notice, so mvp/coi (~77 MB) would be dead weight. `site/learn/src/assets.ts` holds the browser pin (`DUCKDB_WASM`, `DUCKDB_DIR`, `DUCKDB_EXT`, `extensionFile`); the extension's sha256 pin is build-only (`scripts/build/learn/assets.ts` `EXTENSION_SHA256`). `site/learn/tsconfig.json` also includes `scripts/build/licenses.ts` and `scripts/build/learn/sql.ts` so F5's shared modules are typechecked without node types before the stub `app.ts` imports them (S11+; the stub bundles to a 0-byte `app-<hash>.js`). `writeLearn(out)` in `site.ts` runs last in `build.ts`; `writeAssets` returns the bundle URLs (esbuild's metafile) for S11's `{{js}}`/`{{css}}`. No `minimumReleaseAgeExclude` needed.
- 2026-10-28 · S11: `format.ts` lands now with only `decimalText` (DC1–5 ported first, `scripts/learn/format.test.ts`), because the engine's cells need it; `cellText` stays S1's `scripts/learn/cell.ts` (site tsconfig includes it). Result view is `src/results.ts` (summary + 200-row table; S12's cards/tabs build on it). `startEngine()` returns at once: `state`/`onChange` (loading text, ready, failed), `generation`, `run` (serial queue; `Superseded` when a restart overtook it), `restart` (Reset and Stop). The data fetch runs beside the engine download, once per visit (retried on the next boot only if it failed); buffers copied per boot since `registerFileBuffer` transfers them. Boot failures read "The database couldn't start: <why>." in `#engine-status` (layout) and `body[data-engine]`. Deferred to S12 with the cards: boot step 7's species lookup and `learnContext`'s Wikimedia fixture (S11's `learnContext` aborts every off-origin request and records it). Layout header links `/` and `/learn/data/` until the map exists (S14). T13: median 3,451 ms ≤ 4,350, no fallback.
- 2026-10-28 · S12: the run logic is `site/learn/src/isolation.ts` (`runIsolated`, `assertPersistable`, `changesTables`, `AfterError`, `TransactionLost`) on any `exec`, so Node tests drive it with a fake; `engine.ts` queues it and replaces `run` with `isolated(after, sql)` / `persistent(sql)`, `changed`, `species` (boot step 7). An after block's error is an `AfterError` naming it, never the SQL's `ScriptError`; a failed BEGIN/ROLLBACK restarts the engine and the run rejects saying so. `Result`/`ROW_CAP` moved to import-free `query-result.ts` (root tsc would otherwise pull engine.ts and its `.sql` import). `check.ts`: A1's result compare as written; A1's error/schema kinds and `pristine` dropped (D11 has result + probes); a probe passes as learn:check's rule (last statement, text contained); `Checker` caches the reference per generation and exercise; only the learner's own `ScriptError` is a verdict, anything else is thrown. `cards.ts` is the spike's minus `tableHtml` (results.ts keeps its DOM table) plus `countOf` and `rowsChanged` (002 §8's large count and "N rows changed"; CR13–14 written first). The playground refuses transaction control only (D11); its SET and the like mark the generation changed. The changed state is `body[data-changed]` plus the layout status line ("…lesson checks wait until then"), shared by every page. `csv.ts` (`csvText`, DuckDB COPY's form) is tested now; its button lands with the playground's list in S15. `sql.ts` exports `firstWord` (cards' `rowsChanged` shares it); it is in learn:check's pinned closure, so `checked.json` re-stamped through D16's loop. `learnContext` answers a record's `photo.url` on the two Wikimedia hosts with a 1×1 PNG (`Access-Control-Allow-Origin: *`, the cards' `crossorigin`) and lists them in `photos`.
- 2026-10-28 · S13: the block-slot pass and block kinds live in `scripts/build/learn/module-html.ts` (`fillBlockSlots` reuses course.ts `pageSlots`, so one slot grammar; `renderFragment`, `moduleFrame`, `moduleUrl`); `pages.ts` lists and writes the pages (`learnPages`). `fillSlots` also refuses any non-`{{word}}` `{{` in its template (HT1). Rendered code goes in after the leftover check, so pbi-smoke's M records (`{{"country_code", …}}`) are no leftover. A PostGIS or Power BI block shows its code without test headers (as the editor does); the download keeps them. `Verdict.result`: `Checker.check` returns the learner's result with the verdict (EX4/EX6 changed first), so the page shows it and the hook holds it (the exercise snapshot is compared through it). Lesson `-- after:` blocks run as written (an editor's `defaultValue`, an exercise's Show-answer code), never a learner's edit. The engine starts only on a page with an editor or exercise (`app.ts` `start`, once). `editor.ts` `wireEditor` is shared by the playground (refactored: buttons by `data-run`/`data-stop`/`data-reset` in `#playground`) and the lessons. `progress.ts` (the 004 §7.4 key; Mark done toggles, a passed skip check sets it) lands now; S14 adds the map's ticks and Clear progress. Schema and Lab schema dialogs are minimal (heading, SVG, Close; native `<dialog>`, Escape closes) and the build writes `dist/learn/schema/{schema,lab,star}.svg` now; S15 adds the dictionaries and the schema pages. A `{{diagram:…}}` slot is refused at render until S25 (D14). `/learn/setup/` gets an `<h1>`; prose stays S15's. d6's `d6-ex` slot became `{{exercise:d6-ex}}`.
- 2026-10-28 · S14: map and track pages in `scripts/build/learn/map-html.ts` (`mapMain`, `trackMain`, `inlineCode` for curriculum text's backticks) inside templates `site/learn/pages/{map,track}.html`; `pages.ts` `readTemplates` replaces `readPlayground`. `module-html.ts` exports `hoursText`, `badges` and `prerequisites` (the frame, map and tracks share them; E2E imports `hoursText`/`TOOL_NAMES`). The map links `/learn/setup/` now (the page exists, prose S15); the schema links wait for S15's pages. `/v1` link = the docs' `/#files` (no `/v1/` index). `#engine-status` moved from `<main>` into the layout's header, beside a visually hidden `#nav-status` (aria-live), so a swap keeps them. nav.ts swaps only `/learn/…/` directory pages outside `/learn/data/` and `/learn/assets/`, needs the fetched page's `<body data-page>`, and on any failure does `location.assign` (popstate too: same URL, a replace). Page inits get an `AbortSignal` that aborts on the next swap; `engine.onChange(listener, signal)` drops the old page's listeners, so editors don't pile up across pages. Ticks: `.done` in each `li[data-module]`, shown by `src/pages/map.ts` (data-page `map` and `track`); `progress.ts` `clearProgress`. `site/style.css` unchanged (Learn's styles are in `learn.css`). The docs page's `/learn/data/` line now leads with the Learn link.
- 2026-10-28 · S15: schema pages in `scripts/build/learn/schema-html.ts` (`schemaMain`, `relationshipText`, `tablesList`) with one template per page, `site/learn/pages/schema-{schema,lab,star}.html` (the prose differs per page; the plan named one `schema.html`). Relationships in words come from the parsed `.mmd` (cardinality from the drawn markers). The lab dictionary lists only the tables that differ from schema v2 (erd.ts `dictionaries(…, { except })`, as S7 designed) and links the others to `/learn/schema/#t-<table>`; the star dictionary links each published file, none for `%% planned:` tables. Item 2 (SC9, L2 part): the star page teaches "planned: drawn, not yet published" and §6.3's sharing; 004 §6.3 now says `dim_species` is shared by the two species facts, not the habitat fact, `dim_country` by all three. Dialogs: native `<dialog>` already closes on Escape and Chromium returns focus to the opener, so no JS was added; each dialog now links its schema page and the SVG alone. Playground: `{{tables}}` (schema v2's tables + `species_taxonomy`, linked to the dictionary) and Download CSV (`csv.ts`; disabled until a result, again on a new run, Stop or Reset). Setup page: 004 §3.1, §3.2, §3.5 in our words; Python is one "in preparation" paragraph (L4 adds §3.3–3.4); the loader's size isn't printed on the page (it links `/learn/data/`, which lists it), and 004 §3.2's "about 30 MB" is corrected to 21 MB (manifest: 21,338,761 bytes). 004 §3.2 now names the `pg-checks.sql` download of §0's four PostGIS checks. The changed-generation (d6-ex across pages through nav) and lesson-`COMMIT` E2E passed on their first run: S12 built that logic; they are its cross-page regression tests.
- 2026-10-28 · S16: foundations pages use h2 sections "Already know this?", Concept, Worked example, Lab (numbered steps), Result, Exercise, Check, Dialects; 004's "Answer" is the exercise's Show answer (D12), and f1's note after its answer sits in an "About the answer" `<details>` so it doesn't give the answer away. 004's plan refs (§0, §4, 002 §4) become links to /learn/data/ and /learn/schema/ or plain words; f3 named unlinked "in preparation" until S17. learn-browser's exercise case now covers skip checks too, wrong answer first (so a passed skip is what marks the module done).
- 2026-10-28 · S17: "f3's first block" (release smoke) = its first `{{block:}}` slot, `f3-brazil-list`, not the skip check (an empty editor until answered); it has `-- show: cards`, as 004 says, and E2E counts its 12 cards. f4's exercise and skip use `in order` (004: "result, in order"). f3's note after its answer: the LEFT JOIN sentence goes in "About the answer"; the `NOT IN` line and `f3-not-in` stay visible (a block inside a closed `<details>` can't be run). Unbuilt modules named in the copy (d2, g1, g3, s1) are unlinked "in preparation"; f1's two f3 mentions now link. The sample has no record without `country_code`, so `NOT IN (SELECT country_code …)` happens to work here: f3-ex's fixed wrong answer is an inner-join anti join instead (0 rows). The course walks in learn-browser now get 15 s per course page (`PAGE_BUDGET_MS`): with six pages the block walk passed 30 s.
- 2026-10-28 · S18: item 5 (d1 part) done (S18). 004 never held the "rank needs a trigger" claim (it is 002 §2 / lesson 12, a superseded design); d1 now teaches the declarative form instead, with two new PostGIS blocks in Lab step 7 (`d1-rank-fk`: `UNIQUE (name, taxon_rank)` + a `genus_rank` column `CHECK`ed to `genus` + composite FK, all 76 animals pass; `d1-rank-wrong`: tiger → Felidae refused), recorded by learn:check and copied into 004 (old steps 7–9 renumbered 8–10). Candidate key now means NOT NULL + UNIQUE (`id`, `slug`, `scientific_name`); the six outside ids are "optional unique ids". 002 left as is (historical design doc, not published).
- 2026-10-28 · S18: item 6 SC1 (d1 copy) done (S18): UNIQUEs stay (L1 A7); `d1-same-gbif`'s lead says one GBIF id per animal holds for critwire's animals and the build fails on a shared id, not a GBIF rule. SC2 was S11's.
- 2026-10-28 · S20: item 1 (SC6) done (S20). 17 d3 EXPLAIN blocks carry `-- plan:` lines (rows + node/condition, plus `no` where the lesson says what's absent), chosen from the plans PostgreSQL 16.15 gave; learn:check checks them, not the plan text (a moved text is a note). 004 §0 gains the `-- plan:` header and the Result-blocks exception (EXPLAIN result = example from the named versions; data results keep their hashes). The DoD's "every PostGIS result has the sha256 004 prints" is qualified the same way: EXPLAIN results by their `-- plan:` lines.
- 2026-10-28 · S20: item 5 (d3 part) done (S20): index-only-scan avoidance removes one source of plan variation, not all (Concept + EXPLAIN bullet); BRIN helps as far as values follow physical order, partly with partial correlation (step 16 skips 3 of 7 ranges at correlation 0.62). Shown code drops test headers, so module-html renders an EXPLAIN block's `-- plan:` lines in words (`ul.plan-checks`) above the recorded plan, labelled an example (`p.plan-example`); D4's "learners see the headers" holds that way. The PostGIS exercise's reasoning sits under Check, not before Show answer.
- 2026-10-28 · S21: item 4 (copy part) done (S21): 004 d4 + page: MVCC "neither waits" scoped to plain reads vs row writes (locking reads `FOR UPDATE`/`FOR SHARE` wait; DDL's AccessExclusiveLock blocks plain reads, `d4-locks`), lab 5 retitled "Plain readers don't wait", lab 6 adds the FOR UPDATE / ALTER TABLE counter-cases; upsert bullet + lab 10: adds and updates only (month/country), upstream deletions and changed keys/animal/year stay, full refresh deletes rows missing from a complete batch. Also the review's d4 note: `xmin` is a diagnostic, not an audit column (wraparound, freezing). `d4-wait`/`d4-isolation` stay `untested` with leading `-- waits:` / `-- fails:` lines (004 + page); the two-connection runner is S22's.
- 2026-10-28 · S22: item 4 done (S22): `d4-wait`/`d4-isolation` are `ran` `-- sessions: A, B` blocks, checked by learn:check (results `window | statement | month`: B 4 NULL, B 7 8; A 2 NULL, A 4 NULL, as 004's comments said). Deviations from D5: the blocking poll runs on the runner's own session (idle during a sessions block, and already in `runBlock`), not the lock's cleanup connection, so `runBlock` needed one new option only, `open` (learn:check opens each window as the lab role and records its pid with the lock, so release still terminates it); a pending statement is cancelled from the same session (`pg_cancel_backend`, same role). Each window is a fresh session per block (pg-session + 60 s timeout, then `SET lock_timeout = '30s'`), ended after the block. On the first failure the block stops; pending statements are cancelled and both windows ended, then `tx: own`'s leak and watched-schema checks run (shared helpers `leftOpen`, `failsAsMarked`, `committedChanges`, factored out of `runOwnBlock`). A wait on a non-window backend fails ("not another window"). `privilege.ts`: transaction control and the SET LOCAL rule now apply to unwrapped blocks (`tx: own` or `-- sessions:`). 004 §0 gains the `-- sessions:` header and drops "a second session" from the untested reasons; §7.3's untested list drops the two d4 blocks (the download still comments them out, as sessions blocks).

## Log

- 2026-10-28 12:10 UTC · Baseline: typecheck ok, test 285/285, test:db 78/78 (after build), build ok, learn:check ok, e2e 38/38; dist hashes saved.
- 2026-10-28 12:29 UTC · Architecture: architect wrote findings F1–F10, design D1–D16, review items 1–7 mapped, 25 work groups (~39–40 sessions est.); no 004 edits; plan-only change, no checks needed.
- 2026-10-28 12:35 UTC · Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (D11 Check vs changed playground; D5 lock_timeout vs detection window), 2 MISSED, 5 SHOULD-CONSIDER; plan-only, no checks needed.
- 2026-10-28 12:36 UTC · Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (D11 Check on modified data; D3 cleanup after lock release; D5 lock_timeout = detection deadline), 3 SHOULD-CONSIDER; plan-only, no checks needed.
- 2026-10-28 12:43 UTC · Revision: architect resolved 5 MUST-FIX (D11 Check refuses on changed generation until Reset; D3 sweep under lock, lab-role objects only; D5 lock_timeout 30s vs 5s detection); adopted MISSED 1–2 and all SC except Caddy fallback; Revision notes table; plan-only, no checks needed.
- 2026-10-28 12:55 UTC · Steps: planner wrote S1–S28 (~39 sessions est.), Verification (DoD map, E2E artifact in $M/e2e/, release smoke), Failure modes; ordering deviations under Decisions; plan-only, no checks needed.
- 2026-10-28 13:10 UTC · S1: lexer (`scriptStatements`, `ScriptError`, `isolatedRefusal`), `blocks.ts` (grammar incl. plan/sessions/window/waits; file and page lints), `plan.ts`, `result.ts` + `cell.ts`, `learn:port` (`port.ts`, CLI, fixture). Red: 5 new test files failing to load (55 cases) → green 55. T: typecheck ok, test 340/340; B ok; H 169 files equal. Real 004 pages parse clean except d3's EXPLAIN blocks (plan lint, S20's job).
- 2026-10-28 13:20 UTC · S2: `privilege.ts` (PV1–8, CL1–9; lintPage calls it with `-- after:` chains), `course.ts` (curriculum parse + refusals, slots, page order, `assembleCourse`), `curriculum.json` (7 tracks, 33 modules, all planned), `build/learn/site.ts` `readLearnInputs` in build. Red: 2 new test files failing to load (33 cases) → green 33. T: typecheck ok, test 373/373; B ok (prints `learn curriculum: 7 tracks, 33 modules (0 built)`); H 169 equal; a planned module with a page refused (manual).
- 2026-10-28 13:30 UTC · S3: `runner.ts` (session as critwire_lab via LEARN_PG_URL, pg-session + 1min timeout asserted, DuckDB-shaped types, plain blocks in BEGIN…ROLLBACK with after blocks, SAVEPOINT for expected errors, leak check, WARNING/unrenderable/ORDER BY/plan/timeout failures; `runBlocks` check mode + `--update`), `check.ts` split into connect/loader/blocks/end stages with versions printed (PostgreSQL 16.15, PostGIS 3.4.2, GEOS 3.12.1), CLI `--update`. Red: `runner.dbtest.ts` failing to load (12 cases) → green 12. T: typecheck ok, test 373/373; D: build ok, test:db 90/90 (LC1–LC10 green); learn:check ok; H 169 equal; leak query empty.
- 2026-10-28 13:56 UTC · S4: runner `-- tx: own` (unwrapped, `-- fails:`, BEGIN probe + rollback, session restore, committed leaks dropped/named, watched schemas) and `-- boot` (first, once, committed); `cleanup.ts` (lock connection: terminate recorded sessions, sweep lab-made objects under the lock, then unlock; lost connection drops nothing); `leaks.ts`; abort reaches the runner; 004 §0 tx: own + §7.6 Cleanup. Red: runner.dbtest and learn-check.dbtest failing to load (10 new cases) → green. T: typecheck ok, test 373/373; D: build ok, test:db 100/100; learn:check ok; leak query empty; H 169 equal.
- 2026-10-28 14:11 UTC · S5: `learn:port setup` wrote pg-session, pg-smoke, pg-role-smoke (004's block verbatim, F4), pg-tx-smoke, setup-counts, pbi-smoke + 4 `checked/*.txt` + `e2e/__snapshots__/setup-counts.txt`; `pages/setup.html` (slots); `course-files.ts` `readCourse` (build + learn:check); learn:check static stage, `--module`, special pg-role-smoke step gone, loader leak check; 004 §0 + §7.6. Red: T 2 files failing to load (3 cases), D 3 (LC5+LC10, LM1, LM2) → green; LC8 then red (blocks blamed for the loader's leak) → loader leak check → green. T: typecheck ok, test 376/376; D: build ok, test:db 102/102; learn:check ×2 ok (4 PostGIS blocks = 004), `--update` wrote nothing; P: 11 files equal 004; B ok; H 169 equal; leak query empty; missing result: plain build refuses, `--draft` warns (manual).
- 2026-10-28 14:40 UTC · S6: `assemble.ts` (`assembleDownloads`, `downloadName`: head, pg-session, boot, ran/tx-own/untested/sessions forms, announced errors), `freshness.ts` (keys, results, downloads, `staleness`, `nextStamp`, pinned checker closure), check.ts downloads stage (fresh load, `psql -X -f`, ERROR lines = announced, leak check) + stamp (temp + rename, unchanged when only the date would move), `assertLabsFresh` in build, `checked.json`; 004 §7.3/§7.5, AGENTS.md. Red: T 2 files failing to load (18 cases), D DL1 + LC5/LM1 download lines → green (FR1's download list fixed: an untested PostGIS block's page has a download). T: typecheck ok, test 394/394; L: draft build, learn:check ok (pg-checks.sql 0 ERROR lines, wrote checked.json), plain build ok, rerun `unchanged`; D: build ok, test:db 103/103; H 169 equal; P 11 equal; leak query empty; scratch edit of pg-smoke: plain build refuses "lab pg-smoke is stale" + download stale, `--draft` warns (reverted).
- 2026-10-28 14:35 UTC · S7: `git mv` of the four ERD sources to `site/learn/erd/{v1,schema,lab,star}.mmd` (schema extends `v1.mmd`; accTitle/accDescr on the drawn three; star `%% planned: dim_habitat_class, fact_country_habitat`); `erd-model.ts` (spike port + `markerErrors`/`markerDrift`, acc lines), `build/learn/erd.ts` (`dictionaries`, source map, `erdErrors`, `readErds`) in `readLearnInputs`; 004 §6 pointers + planned paragraph; 002/003 path notes. Red: 2 files failing to load (46 cases) → 45 green, 1 red (`accDescr {` parsed as an entity) → fixed → 46. T: typecheck ok, test 440/440; B ok; H 169 equal; P 11 equal; scratch edits (no accTitle on star, v1 type change in schema): build refuses both, named (reverted).
- 2026-10-28 14:54 UTC · S8: `pnpm erd` (`erd-render.ts` + CLI; mermaid 12.2.0 pinned), `site/learn/erd/{schema,lab,star}.svg` committed (seeded, deterministic), build refuses missing/stale SVG (`svgErrors`), learn:check lab ERD drift after boot blocks (`afterBoot`, `assertLabErd`), `labErd` in checked.json + staleness; AGENTS.md. Red: T 2 files failing to load (20 cases) + FR7/FR8 → green; D LE1 red with the hook unwired → green. T: typecheck ok, test 448/448; `pnpm erd` twice (second: up to date), `--force` twice byte-equal; L: draft build, learn:check ok (lab ERD = learn_curriculum, 14 tables; wrote checked.json), plain build ok, rerun unchanged; D: build ok, test:db 104/104; H 169 equal; P 11 equal; leak query empty; scratch `lab.mmd` edit: build refuses `lab.svg is stale` (reverted).
- 2026-10-28 15:10 UTC · S9: `learn:port d6` (17 blocks, 15 checked + 2 snapshots), `modules/d6.html` (slots), d6 `built`; `star-check.ts` (spike port: readCsv, checkInput, unknown members, ST5), `build/learn/star.ts` (`STAR_BLOCKS`, `starBlocks`, `starInputErrors`, `writeStar` + cross-engine guard, star.mmd drift), wired in `readLearnInputs` and the build; `LAB_FILES` + 7, `page.ts` + 7; `learn-data` E2E star case; AGENTS.md build line. Red: T 2 files failing to load (16 cases) → green 16 (one fixture fix: SB6 edit dropped the `;`); E star case written before the code, not run red. T: typecheck ok, test 464/464 (CU6 updated: built ⇔ page); L: draft build, learn:check ok (19 PostGIS blocks = 004, d6.sql download 0 ERROR lines), plain build ok; D: test:db 104/104; E: 39/39, 0 skipped/flaky; H 169 equal; P 45 files equal 004; `dist/learn/data/` 40,041,618 B; manifest vs baseline: only `star/` + `bytes`; star CSVs sha256 = spike export.
- 2026-10-28 15:17 UTC · S10: pins `@duckdb/duckdb-wasm` 1.33.1-dev65.0 + `esbuild` 0.28.2 (deps, exact); parquet extension committed (sha256 33094a01…a473); `licenses.ts` split from `sources.ts` (re-exported); `site/learn/{tsconfig.json,src/{app.ts,assets.ts,learn.css,text.d.ts}}`; `build/learn/assets.ts` (`assetErrors` in readLearnInputs, `unversionedAssets`, `bundle`, `writeAssets`: eh engine + mirror + bundle, mtime 2000-01-01) via `writeLearn`; typecheck runs both tsconfigs; serving E2E (+1). Red: T assets.test.ts failing to load (9 cases), E Learn assets case failing → green. T: typecheck ok, test 473/473; B ok; E 40/40 (0 unexpected/skipped/flaky); H 169 equal; two builds: `dist/learn/assets/` sha256 identical, every mtime 2000-01-01.
- 2026-10-28 15:36 UTC · S11: `site/learn/src/{engine,format,results}.ts`, `pages/playground.ts`, `app.ts` (data-page init, engine state); `layout.html`, `pages/playground.html`, `learn.css`; `scripts/build/learn/pages.ts` (`renderPage`, `writePages`; `writeLearn` writes `/learn/playground/`); `e2e/helpers.ts` `learnContext`/`waitReady`; `learn-browser.spec.ts` (6), `learn-timing.spec.ts`; playwright `snapshotPathTemplate` + `updateSnapshots: "none"`. Red: E 7/7 failing, DC 5 failing → green. T: typecheck ok, test 478/478; B ok (bundle 234 kB); E 47/47 (0 unexpected/skipped/flaky); H 169 equal; setup timing median 3,451 ms (3315, 3492, 3419, 3494, 3451), `e2e-artifacts/setup-timing.json`.
- 2026-10-28 17:02 UTC · S12: `sql.ts` `readsOnly`, `playgroundRefusal`, `firstWord`; `site/learn/src/{isolation,cards,check,csv,hook,query-result}.ts`, `format.ts` `esc`; engine `isolated`/`persistent`/`changed`/species lookup, restart on lost transaction; results Cards/Table tabs, card-rule reason, large count, "N rows changed"; playground persistent + hook; `body[data-changed]` + status; learnContext Wikimedia fixture. Red: T 5 files failing to load (51 cases) + CR13–14 → green; E 5/11 failing → green. T: typecheck ok, test 531/531; L: draft build, learn:check ok (re-stamped, sql.ts in closure), plain build ok; E 52/52 (0 unexpected/skipped/flaky); H 169 equal; setup timing 3441, 3318, 3272, 3513, 3480 ms.
- 2026-10-28 17:30 UTC · S13: `module-html.ts` (block-slot pass, leftover `{{` + unknown kind refused, duckdb editor / postgis recorded + versions + download + Lab schema / Power BI inputs / exercise + skip, module frame), `pages.ts` (`learnPages`: playground, /learn/setup/, built modules), `writeLearn` writes `dist/learn/labs/{pg-checks,d6}.sql` + `dist/learn/schema/*.svg`; `fillSlots` leftover refusal; browser `editor.ts`, `pages/module.ts`, `progress.ts`, playground refactored; `Verdict.result`; `learn-labs.spec.ts` (3), learn-browser (+2). Red: T module-html.test failing to load (9) + EX4/EX6 + HT1 → green; E 5/5 failing on the old dist → green. T: typecheck ok, test 541/541; L: draft build, learn:check ok (checked.json unchanged), plain build ok; E 57/57 (0 unexpected/skipped/flaky); H 169 equal; P 45 equal; setup timing 3508, 3366, 3470, 3592, 3365 ms.
- 2026-10-28 17:41 UTC · S14: map + 7 track pages (`map-html.ts`, `pages/{map,track}.html`, `readTemplates`), ticks + Clear progress (`src/pages/map.ts`, `progress.ts` `clearProgress`), `nav.ts` (swap `<main>`, pushState/popstate, h1 focus, `#nav-status`, full-load fallback), page inits get an AbortSignal (`engine.onChange(listener, signal)`), status lines moved to the layout header, docs page links `/learn/`. Red: learn-map failing to load (no `hoursText`), then 6/6 failing (5 learn-map + docs link) → green. T: typecheck ok, test 541/541; E: build ok, e2e 63/63 (0 unexpected/skipped/flaky); H 169 equal.
- 2026-10-28 17:58 UTC · S15: `schema-html.ts` + `pages/schema-{schema,lab,star}.html` (SVG, relationships in words, dictionaries, planned/lab-made lists), setup page prose (§3.1, §3.2 + pg-checks.sql, §3.5), playground table list + Download CSV, dialog links, map links setup + schemas; `e2e/schema.spec.ts` (3), learn-browser (+3), learn-labs (+1, pbi-smoke via star-check), learn-map (schema pages, SVG alt/<title>); 004 §3.2, §6.3. Red: 6/10 failing (4 already-built behaviors passed) → green. T: typecheck ok, test 541/541; L: draft build, learn:check ok (checked.json unchanged), plain build ok; P 45 equal; E 70/70 (0 unexpected/skipped/flaky); H 169 equal.
- 2026-10-28 18:10 UTC · S16: `learn:port f1 f2` (17 blocks + 17 snapshots), `modules/{f1,f2}.html` (skip check, Concept, Worked example, Lab, Result, Exercise, Check, Dialects), f1/f2 `built`; learn-browser: WRONG for f1-skip/f1-ex/f2-skip/f2-ex, exercise case covers skip checks (marks done), new "f1, f2, playground: one worker". Red: 3/3 failing on the old dist → green. T: typecheck ok, test 541/541; B ok; P 4 pages, 79 files equal 004; E 71/71 (0 unexpected/skipped/flaky); H 169 equal.
- 2026-10-28 18:27 UTC · S17: `learn:port f3 f4` (21 blocks + 21 snapshots), `modules/{f3,f4}.html` (f4 checks in order), f3/f4 `built`, f1 links f3; learn-browser: WRONG for f3-skip/f3-ex/f4-skip/f4-ex, seen lists + f3-brazil-list (cards) etc., per-page timeout on the course walks. Red: 4/5 failing on the old dist → green. T: typecheck ok, test 541/541; P 6 pages, 121 files equal 004; B ok; E 71/71 (0 unexpected/skipped/flaky); H 169 equal.
- 2026-10-28 18:45 UTC · S18: `learn:port d1` (21 blocks: 13 snapshots, 7 + 2 new checked), `modules/d1.html`, d1 `built`; 004 d1: candidate vs optional unique id, GBIF-id scope + build check, Lab step 7 composite-FK rank (`d1-rank-fk`, `d1-rank-wrong`, learn:check-recorded); E2E: WRONG d1-ex (no UNIQUE url), new test: each missing constraint (UNIQUE, FK, CHECK) failed by its probe. Red: 3/3 failing on the old dist → green. T: typecheck ok, test 541/541; L: draft build, learn:check ok (28 PostGIS blocks, d1.sql 4 ERROR lines as announced, checked.json lists d1.sql), plain build ok; P 7 pages, 165 files equal 004; E 72/72 (0 unexpected/skipped/flaky); H 169 equal.
- 2026-10-28 18:53 UTC · S19: `learn:port d2` (14 blocks + 14 snapshots), `modules/d2.html`, d2 `built`, f3 links d2; 004 d2: 1NF lists can be unnested/joined/counted, lost = per-item FK/UNIQUE; 3NF mnemonic a first approximation + exact rule (X superkey or Y prime), BCNF; lossless two-part split needs shared columns = key of one part (title split adds rows). E2E: WRONG d2-ex (no key on r_datasets → d2-ex-two-titles runs), d2 ids in seen lists. Red: 2/2 failing on the old dist → green. T: typecheck ok, test 541/541; P 8 pages, 193 files equal 004; B ok; E 72/72 (0 unexpected/skipped/flaky, `$M/e2e-s19`); H 169 equal.
- 2026-10-28 19:10 UTC · S20: 004 d3 `-- plan:` headers (17 blocks) + §0 header/Result-blocks text + Concept fixes; `learn:port d3` (25 blocks, 25 recorded), `modules/d3.html`, d3 `built`, d1 links d3; module-html `planChecks` (MH5b) + CSS; E2E labs test asserts plan-check items. Red: [T] port d3 refused (17 EXPLAIN blocks, plan lint) → green; MH5b 1 → green; [E] labs 2/4 failing on old dist → green; [D] scratch `rows 10`/`no Bitmap Heap Scan` on d3-btree failed naming lines 5 and 9, reverted. T: typecheck ok, test 542/542; L twice: 53 PostGIS blocks ok, d3.sql 0 ERROR lines, recorded files + checked.json (bar date) equal across runs, no plan-text notes; P 9 pages, 241 files equal 004; E 72/72 (0 unexpected/skipped/flaky, `$M/e2e-s20`); H 169 equal.
- 2026-10-28 19:22 UTC · S21: 004 d4 copy fixes (MVCC/locking reads/DDL, upsert scope, xmin) + `d4-wait`/`d4-isolation` leading `-- waits:`/`-- fails:`; `learn:port d4` (15 blocks, 13 recorded), `modules/d4.html`, d4 `built`. T: typecheck ok, test 542/542; P 10 pages, 271 files equal 004; L: draft build, learn:check ok (66 PostGIS blocks equal 004's results, d4.sql 8 ERROR lines as announced, both untested blocks commented out under "needs two sessions", leak empty), plain build ok; E 72/72 (0 unexpected/skipped/flaky, `$M/e2e-s21`); H 169 equal.
- 2026-10-28 19:45 UTC · S22: runner `-- sessions:` blocks (`runSessionsBlock`: window sessions via `open`, 50 ms `pg_blocking_pids` poll, `-- waits:` seen within 5 s and collected later, unmarked wait fails + cancelled, lock_timeout 30s, end probes + leak/watch checks, `window | statement | …` result), learn:check records window pids; privilege lint allows tx control in sessions blocks; d4-wait/d4-isolation `ran` (004 §0, d4 text + results, §7.3; page). Red: [D] SS1–SS6 6/6 failing → green; privilege RQ15 sessions case red → green. T: typecheck ok, test 542/542; L twice: 68 PostGIS blocks equal, d4.sql 8 ERROR lines as announced, checked.json equal across runs; D: test:db 110/110; P 10 pages, 273 files equal 004; E 72/72 (0 unexpected/skipped/flaky, `$M/e2e-s22`); H 169 equal; leak query empty.

## Summary
