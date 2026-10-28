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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

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

Written by the architect, session 2. Read: the brief and Addendum; `AGENTS.md`; 004 §0–§3, §4.3–4.5, §5.1–5.2, §6, §7, §9, §10, §A.3, §B; 002 §1, §3, §8, §10; the Codex review; L1's plan and code; the spike (`$SP` = `/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/spike`) and A1's `src/check.ts`. Line numbers are this branch's (`dc43ace`).

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
  - new: file name = `q`; every `-- after:` block is on the same page; `params` refused on page blocks (none in f–d); `-- plan:` rules (D4).
- **Page order** comes from each page's slots: the setup page first, then the modules in curriculum order. Every block file must be used by a page (`setup.sql` excepted), and a slot without a file fails.

#### D3. `pnpm learn:check` (004 §7.6), in order, under L1's lock

1. **Connect (L1).** Refusals, role checks, the lock, the canary before, the leak snapshot. It prints the versions: `server_version`, `postgis_lib_version()`, `postgis_geos_version()` (SC6).
2. **Static.** Every block parsed and linted; any error stops the run before a load.
3. **Loader stage (L1).** The loader's sha256, two loads, the forced failure.
4. **Blocks.** One session through `pgConnect`, with the session's statements (pg-session's `SET` and `statement_timeout = 60s`), checked by `assertSession`. Results come back DuckDB-shaped: int8 as BigInt, date as text, per the spike's TYPES. Boot blocks run first and are committed; then the lab ERD drift (D10); then every `ran` PostGIS block in page order:
   - **Plain blocks:** `BEGIN`; the `-- after:` blocks' statements; its own statements, with a `SAVEPOINT` before the last one when it expects an error; the leak check (`learnObjects`) before `ROLLBACK`. A server WARNING, an unrenderable column (geometry, geography, raster, bytea), a timeout (cancelled, the run goes on) or several rows without ORDER BY each fail the block.
   - **`-- tx: own` blocks:** run unwrapped. Each `-- fails:` statement must fail with its text, and the block goes on. Then: a `BEGIN` probe (left open or aborted), the session restored (`assertSession`; restore and fail if it changed), the leak check (a committed leak is reported and dropped), and the canary and `learn_curriculum` read with L1's `readTables`, equal to the reading before (TX1–TX6, LK4).
   - **`-- sessions:` blocks:** D5.
   - **Check mode (the default):** `renderResult` must equal `checked/<id>.txt`; otherwise the block fails with a `lineDiff`. EXPLAIN blocks need only their assertions to hold (D4); a difference in the plan's text prints as a note. A missing file fails: "no recorded result: run pnpm learn:check --update".
   - **`--update`:** runs each block twice; the two renderings must match (for a plan, the assertions must hold both times). Then it writes `checked/<id>.txt`.
5. **Downloads (D7).** Each assembled file runs on a freshly loaded database (the loader, then `psql -X -f`, through `childEnv`). Its `ERROR:` lines must be exactly the announced errors, in order. The leak check runs after each file, and the file's sha256 is recorded.
6. **Canary and leak check after the run (L1).**
7. **`checked.json`** (D6) is written only after every stage passed, through a temp file and a rename, and left untouched when its content didn't change.

- **Cleanup.** On every exit, failures and SIGINT/SIGTERM included:
  - L1's cleanup: cancel the running psql, free the lock, end the connections, remove temp files;
  - then a sweep: every `learn_%` role or schema not in the start snapshot is dropped as `critwire_lab` (`DROP OWNED BY` + `DROP ROLE`; `DROP SCHEMA … CASCADE`) and named in the error. This is SC7's error-path cleanup.
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
- **`-- waits: <why>`**, a statement's leading comment: the statement must block on the other window's lock. The runner sees it in `pg_blocking_pids(pid)` within 5 s, moves on, and collects the result the next time that window runs or at the end.
- **`-- fails: <text>`** works as in `tx: own`.
- **Both connections** get pg-session and `lock_timeout = '5s'`, so an unexpected wait fails fast.
- **Afterwards:** both sessions ended clean (the probe), `learn_curriculum` and the canary unchanged, no leak.
- **Result:** the rows of every statement that returns rows, as `window | statement | <columns>`; those statements must share their columns.
- **Downloads:** the block stays commented out ("needs two psql windows: run it by hand, window by window, as its page says").
- **Budget:** one runner step (W19), and the d4 step makes the two blocks `ran`. If W19 doesn't finish in its session, the blocks stay `untested`, with the reason under Decisions.

#### D6. `checked.json` and freshness (004 §7.5)

```json
{ "versions": {"postgresql": "16.15", "postgis": "3.4.2", "geos": "3.12.1"}, "checked": "<UTC date of the writing run>",
  "blocks": {"<id>": "<sha256>"}, "downloads": {"d3.sql": "<sha256>"}, "labErd": "<sha256>" }
```

- **Block key:** a sha256 over, in this order:
  - `id\0text` of the block, its `-- after:` blocks taken transitively (sorted), every `-- boot` block (sorted) and pg-session;
  - then `path\0sha256` for each manifest `files` entry outside `star/` (sorted);
  - the checker's sources: the relative-import closure of `scripts/learn-check.ts` (sorted), plus `db/learn/canary.sql` and `site/learn/labs/requirements.txt`.
- **`labErd`:** a sha256 over `lab.mmd`, the loader's sha256 and the boot blocks.
- **Recorded, not compared:** versions and date. The page shows them.
- **The build** (`assertLabsFresh`, after the manifest is written) recomputes everything and refuses each of these:
  - "lab <id> is stale: run pnpm learn:check" (the first 5 plus a count);
  - a missing or orphan key;
  - a download whose sha256 differs;
  - a changed `labErd`.
- **Plain build refuses; `--draft` only warns** (the dev loop, D16).

#### D7. Downloads: one assembly function, shared by build and learn:check

- **Which pages:** every page with PostGIS blocks gets `/learn/labs/<page>.sql`: setup (§0's checks: an addition, recorded) and d1, d3, d4, d5, d6.
- **`assembleSql(page, blocks)`, in this order:**
  1. a head comment: run after the loader with `psql -X -d <db> -f <file>`; no `ON_ERROR_STOP`, because some statements fail on purpose;
  2. pg-session as written, not wrapped;
  3. the boot blocks the file needs: those whose `CREATE TABLE`/`VIEW` names any block or `-- after:` block in the file uses as a whole word. Each appears once, committed;
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
  - refuses star.mmd drift (planned excused) and a missing unknown member (`ZZ`, `-1`).
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
  - `isolated(after[], sql)` = `BEGIN`; the after blocks as written; `sql`; `ROLLBACK`. Used by lessons, exercises, probes and references.
  - `persistent(sql)`: the playground only. It marks the database changed, and lesson pages then say "Reset database restores the tables".
- **Reset and Stop** restart the engine. A generation counter drops late results.
- **Older browsers:** without WebAssembly exception handling, a notice; without JavaScript, a `<noscript>` line.
- **One start per visit.** The first page with a browser editor starts the engine. `nav.ts` swaps `<main>` for same-origin Learn pages (not `/learn/data/`, `/learn/labs/`, `*.svg` or `/learn/assets/`), uses pushState and popstate, focuses the `<h1>` and announces the page; a failure falls back to a full load.
- **Cards and results** (spike `cards.ts`): the card rule; 10 000 rows kept, 200 drawn; "N rows changed".
- **Checks** (A1 `check.ts` port):
  - `result`: as a multiset or in order, with hints;
  - probes: every `-- expect: error` block whose `-- after:` names the exercise runs isolated after the learner's SQL and must fail with its text;
  - the reference is computed at the first Check of each engine generation and cached. No `answers.ts` registry: the page's data attributes carry the SQL.
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
  - the 10 000-row cap; three pages, one worker (`page.on("worker")`);
  - the `.wasm` held back (text readable, Run disabled with progress), the `.wasm` answering 404 (it says why), a tampered `/v1/species.parquet` (SC2 refusal);
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
| 3 | SC7 | `critwire_lab` via `LEARN_PG_URL` (F2), the cleanup sweep and leak checks on error and abort paths (D3). **d5's copy:** a fresh-database default (PostgreSQL 15+ `public`) isn't proof, so inspect the ACLs (`\dn+`, `has_schema_privilege`); membership `INHERIT` and `SET` are options (`GRANT … WITH INHERIT FALSE, SET FALSE`) | W4, W20 |
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
| 4 | `tx: own`, boot, the cleanup sweep on error and abort (SC7) | [D] TX1–6, LK4, PC7, sweep cases | 1 |
| 5 | `assemble.ts`, `freshness.ts`, the downloads stage, `assertLabsFresh` and the `--draft` warning | [T] assembly incl. a fixture boot block, key sensitivity; [D] the ERROR-line rule | 1 |
| 6 | `erd-model.ts`, sources moved (`git mv`), the star `planned` marker, `accTitle`, dictionaries, base and star drift | [T] RQE1–5, RE1–6, EG1–4 | 1 |
| 7 | `pnpm erd` (mermaid pin), the SVGs, the build's stale refusal, lab drift in learn:check | [T] ER1–4, stale | 1 |
| 8 | `writeStar`, the 8 star blocks ported, `LAB_FILES` and descriptions, `learn-data` for the star | [T] ST3, ST5; [E] PB2–7 via `star-check` | 1 |
| 9 | pins (duckdb-wasm, esbuild), the extension committed, `licenses.ts`, assets and bundle, mtimes, site tsconfig | [T] build refusals; [E] serving | 1 |
| 10 | engine, `format`, `cards`, `check`; a minimal playground; `learn-timing` (the T13 decision) | [T] spike and A1 cases; [E] engine cases (D13) | 2 |
| 11 | `curriculum.json`, layout, map, track pages, progress, nav, docs link | [T] curriculum refusals; [E] `learn-map` | 1 |
| 12 | module template and slots, every block kind, exercises, setup page, schema pages and dialogs, playground, downloads in `dist/` | [E] `learn-labs`, `schema` | 2 |
| 13–14 | f1 + f2; f3 + f4 | [E] seeded snapshots | 2 |
| 15–18 | d1, d2, d3 (SC6 assertions), d4 | [E] / learn:check against seeded results | 4 |
| 19 | the `-- sessions:` runner; d4-wait and d4-isolation `ran` | [D] | 1 |
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
| R4 | Hash determinism | browser runs isolated as the spike ran them (F3); PostGIS blocks run in page order right after a fresh load, so d3's plans and correlations and `d4-xmin-load`'s single transaction come before any committing `tx: own` or sessions block; `d3-analyze` reads the full sample; plan text isn't asserted (D4); the star is `ORDER BY` pk with fixed writer options; esbuild is deterministic; SVGs re-render only on a source change; `checked.json` is written only on a change |
| R5 | Mermaid offline | the spike's proven path (`mermaid.min.js` in Playwright's Chromium, requests blocked); a missing bundle file or any request fails loudly |
| R6 | d5 as `critwire_lab` | the spike ran it as superuser, so results may move. `critwire_lab` owns `learn_curriculum` (L1), so owner semantics hold; each difference goes to 004 and Decisions with its reason |
| R7 | Fixed mtimes vs deploy's `rsync -a` quick check | only versioned or content-hashed paths under `/learn/assets/`, refused otherwise (D8) |
| R8 | Lock-wait detection (D5) | `pg_blocking_pids` polled with a deadline, and `lock_timeout = '5s'`; on failure the blocks stay untested (brief) |
| R9 | Build and learn:check need each other | `--draft` warns instead of refusing; the loop is in AGENTS.md (D16) |
| R10 | New pins vs pnpm's minimum release age | exact pins; if refused, `minimumReleaseAgeExclude`, as L1 did for node-api |
| R11 | Isolated lessons change 002's UX | learners keep their work in the playground; each module page says so in one line |

### Rejected alternatives

- **004 as the build's source of blocks:** the brief makes `site/learn/` the source.
- **E2E reading 004's hashes, or a new results folder:** Playwright snapshots are the established interface; `learn:port --check` keeps 004 parity.
- **Exercise references computed at build time in Node DuckDB:** value forms differ from WASM, and 002/004 say nothing is pre-rendered.
- **Lesson blocks writing to the live database (002):** results then depend on history (F3).
- **002's `answers.ts`/`lessons.json` registry:** the page's data attributes carry the same SQL, from one source.
- **Cross-engine star CSV diff in learn:check (spike ST1):** proven once in the spike; the block results and E2E's key checks suffice.
- **Lab ERD drift in E2E:** E2E has no PostgreSQL; learn:check has the session.
- **PNG renders:** nothing uses them.
- **`-- plan:` in a side JSON file:** it would split a lesson's teaching from its block; headers are the existing grammar.
- **The replacement junction now:** it changes L1's loader and setup (Out), and no id is retired.
- **Partial learn:check runs that write:** they would leave a partial `checked.json`; `--module` only reads.
- **Mermaid in the page:** 5.5 MB to draw one picture (002 §3).

### Edits to 004 in this stage

None. Every correction above lands with the code that proves it (brief), in the step named. L1's `env.ts` SHOULD-CONSIDER is outside this brief's Scope; it goes to the Summary for the owner.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-28 12:10 UTC · Baseline: typecheck ok, test 285/285, test:db 78/78 (after build), build ok, learn:check ok, e2e 38/38; dist hashes saved.
- 2026-10-28 12:29 UTC · Architecture: architect wrote findings F1–F10, design D1–D16, review items 1–7 mapped, 25 work groups (~39–40 sessions est.); no 004 edits; plan-only change, no checks needed.

## Summary
