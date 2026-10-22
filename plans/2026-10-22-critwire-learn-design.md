---
mission: critwire-learn-design
project: critwire
branch: agent/critwire-learn-design
status: active
started: 2026-10-22 06:00 UTC
---

# Mission: critwire learn, research and design (mission A1)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-22-critwire-learn-design.md
     Start: mission start critwire <this file>   (base: main at 871d0a6 or later)
     Owner's choices (control room, 2026-10-22):
     - research in two missions: this one, A1, covers what the first build (mission B) needs; A2 (critwire-learn-spatial-design)
       covers growing the data, the spatial track and IUCN afterwards
     - lessons for ages 16 and up
     - DuckDB-WASM preferred
     - first tables built in the browser, plus one new /v1 countries file
     - a query cookbook plus one small demo
     - an entity relationship diagram is a must
     - the data will grow
     Target look: /srv/critter-ai/agent-state/missions/critwire-learn-design/vision.png, copied there by the control room
     before start; if it's missing, design from "The look" below and say so.
     Brief reviewed by Fable 2026-10-22: APPROVE_WITH_CHANGES; its 9 must-fix items are folded in, and the split is its suggestion. -->

### Goal

A tested design for **critwire Learn**: pages on critwire.com where people aged 16 and up, new to SQL, learn **relational database concepts and SQL** by asking questions about critwire's animals. The SQL runs in their browser, and the answers come back as animal cards. Learn also has a cookbook of game-style queries and one small playable demo built only on critwire's data.

**The idea: learn databases and learn about biodiversity at the same time.**

The lessons use the data critwire has today, but **the database will grow**. A later research mission (A2) covers new datasets, an advanced spatial track (PostGIS and a worldwide habitat raster) and IUCN, so this design must leave room for them. This mission **researches and designs; it builds nothing public**. Mission B builds it after the owner reviews this design.

#### The engine: DuckDB-WASM unless the numbers say otherwise

The owner prefers **DuckDB-WASM as the engine, with critwire's own teaching interface**. Treat that as the expected architecture, and the DuckDB web shell as a possible embedded playground.
- Evaluate **PGlite** as the one real alternative.
- Give **sql.js** a short assessment: a paragraph and its measured size.
- Investigate no other engines.
- Recommend switching away from DuckDB-WASM only if measurements or a real technical limit justify it.

Answer these, in this order, with measurements:
1. **Can DuckDB-WASM reliably query the existing Parquet files** (`https://critwire.com/v1/species.parquet`; CORS and Range are already on) in desktop browsers and on a school Chromebook? You can't use real Chromebooks, so emulate a low-end one in headless Chromium:
   - CPU throttling of about 4–6x (`Emulation.setCPUThrottlingRate`)
   - a slow network, such as busy school Wi-Fi or slow 4G

   Chromium can't emulate a memory limit. Measure peak memory instead: the JS heap via `Performance.getMetrics`, plus the size of the worker's `WebAssembly.Memory`. Then say what that means for a 4 GB Chromebook. Say what the emulation proves and what only real hardware would.
2. **What are the real first-load size, startup time and memory use?** Measure:
   - bytes on the wire, compressed and uncompressed
   - time to the first query result, cold and warm
   - peak JS and WASM memory

   Measure the DuckDB-WASM bundles `mvp` and `eh`, which are both single-threaded. Measure `coi` (threads) only if it's clearly faster. It needs `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` on the page, which also forces `crossorigin` loading of the Wikimedia photos. See https://duckdb.org/docs/2.0/clients/wasm/deploying_duckdb_wasm.html. Measure PGlite the same way.
3. **Can everything be self-hosted, with no outside CDN?** That covers the WASM files, the workers, any DuckDB extensions the lessons need, and the application. Everything is served from critwire.com by the existing Caddy and built offline by `pnpm build` from pinned packages. Say whether self-hosted extensions work, since A2 will want `spatial`, and what Caddy needs (compression, caching) as a change the control room makes.
4. **Embed the DuckDB shell for an advanced playground, or build our own SQL editor on DuckDB-WASM?** Cover what each costs to self-host and maintain, and whether the shell can open with critwire's tables already loaded.
5. **How do query results drive the interface?** Show how results become animal cards, how exercises check answers, and how a game reads query results.

**Recommend the simplest solution you can maintain.**

#### The look: lesson cards

`/srv/critter-ai/agent-state/missions/critwire-learn-design/vision.png` is a mockup the owner likes (made with another AI; illustrative only). It has a dark card with:
- a "CRITWIRE LEARN / LESSON 04" label and a "Beginner SQL" badge
- the lesson's question as the title ("Which animals have been recorded in Brazil?")
- one line on the concept
- an SQL editor with a "Run query" button
- **results shown as animal cards**: photo, common name, scientific name in italics

Design for that experience. Fix what the mockup gets wrong:
- **Concept order:** it teaches `WHERE` but uses a `JOIN`. Either the lesson comes after joins, or the lesson provides a ready-made table and explains it later. Pick one and say why.
- **Photo credits:** cards must show each photo's credit and license (from `photo`), because the licenses require it. CC BY-SA is the most common.
- **Missing photos:** two animals have no photo, so cards need a no-photo state.
- **Tables:** the tables it uses (`species`, `species_countries`, `scientific_name`) don't exist yet. The Parquet is nested, with camelCase fields.

#### What goes in `plans/002-learn.md`

1. **Engine and interface.** The answers to the five questions above, with numbers, and the recommendation.
2. **The learners' schema, first version.** The flat, snake_case tables (or views) the page builds from the `/v1` files when it loads, for example:
   - `species`
   - `species_countries`
   - `countries`
   - `taxonomy` or `taxa`
   - `sources`

   Give their columns, primary and foreign keys, and how they're built. It's a first version: name things so that new tables (traits, habitats, regions, occurrences) join on later without renaming old ones. Learners write standard SQL against these; the nested Parquet is only the source.
3. **Entity relationship diagram (required).**
   - An ERD of the first schema, showing entities, attributes, primary and foreign keys, and cardinality (crow's foot or equivalent).
   - Keep the source in the repo as text: Mermaid `erDiagram` or another plain-text format, chosen and justified.
   - Say how the site shows it: an SVG drawn at build time and offline, unless there's a good reason to render it in the browser. A learner should be able to open the ERD from every lesson.
   - Say how mission B's build makes the SVG offline. `mermaid-cli` needs a Chromium, and `pnpm-workspace.yaml` only allows esbuild's build scripts (`allowBuilds`). Committing the rendered SVG next to its source, with a check that they match, is a valid answer.
4. **Lessons: the core path.** An ordered path of about 12–16 lessons for people aged 16 and up who are new to SQL. Each lesson answers a real question about the animals, and **relational concepts are first-class, not an afterthought**. Cover at least:
   - tables, rows and columns
   - `SELECT`, `WHERE`, `ORDER BY` and `LIMIT`
   - counting and `GROUP BY`
   - `NULL`: `range_status`, why some animals have no countries, and the two animals with no photo
   - **entities and attributes, and reading the ERD**
   - **keys:** primary keys (`id`), natural and alternate keys (`slug`, the outside ids), foreign keys
   - **relationships:** one-to-many (taxonomy) and many-to-many (species ↔ countries) with a junction table
   - **normalization:** why nested lists break first normal form, how the flat tables come from the nested file, and 2NF and 3NF in plain words
   - inner and left joins, including animals with no countries
   - the countries lookup
   - the taxonomy hierarchy
   - views
   - **designing a table for new data:** for example traits, as an exercise that extends the ERD
   - where data comes from: `sources`, licenses, and "countries with open records" not being native range

   For each lesson give:
   - the concept and the question
   - the SQL
   - the real result from today's data: row count and first rows
   - how the result is shown (cards, a table, a count or the ERD)
   - one "your turn" exercise with its answer
   - how the page checks the learner's answer

   End with a short note on where advanced lessons (spatial, raster) would attach. A2 designs them.
5. **Cookbook.** At least 25 game- or app-style queries, for example:
   - an animal of the day that's the same for everyone on a given date
   - quiz questions with wrong answers drawn from the same class
   - "which animals could you meet in country X"
   - animals that share a country
   - family trees
   - odd-one-out sets
   - countries with the most animals
   - a random team of 5 with no two from the same family

   For each: what a game uses it for, the SQL and its real result.
6. **The countries file.** The design of the first new data: a `/v1/countries` file in Parquet, CSV and JSON.
   - **Fields:** at least the ISO alpha-2 code, an English name, continent, region and subregion.
   - **Source:** compare Natural Earth admin-0 attributes (public domain) with GBIF's country enumeration, and quote each license.
   - **Ingest:** how it's taken as a committed snapshot (attributes only, no geometry yet).
   - **Matching:** how all 107 country codes in `species.json` match.
   - **Credit:** how it's credited in `attribution.json`.
   - **The `/v1` rule:** why adding a file doesn't break "the `/v1` shape is frozen". Existing files keep exactly their shape.
7. **Demo.** Two or three ideas for one small playable game that runs only on critwire's data in the browser and uses the same cards. Recommend one, with its rules, the queries it runs, and how it works on a phone.
8. **Site.**
   - URLs (for example `/learn/`, `/learn/<lesson>/`, `/learn/schema/` for the ERD, `/cookbook/`, `/play/<demo>/`)
   - how the pages are built: extend the existing build and docs template; no web framework unless the engine truly needs one, and say why
   - the editor, whether a plain `<textarea>` or a small pinned editor
   - accessibility and keyboard use
   - what a page shows before the database has loaded
   - how the E2E suite tests it, using the existing local-Caddy harness
9. **Mission B.** A ready-to-start brief in `plans/` for the build: engine, learners' schema, ERD, core lessons, cookbook, countries file and demo. Use the ops brief format (Goal, Why, Scope, Definition of done, Decision rules, Notes). Size it to finish well within 60 sessions; if it can't, split it into B1 and B2, each with its own brief.
10. **For the owner.** Choices only the owner can make, each with a recommendation and its cost.

Also: in `plans/001-mvp.md`, point the "Phase 2 viewer" line under Later to `plans/002-learn.md`.

#### The spike, recorded

Headless Chromium on this VPS runs the recommended setup, self-hosted from the spike's own Caddy. It must:
- load `species.parquet` and a draft countries table
- build the learners' tables
- run the Brazil join from the mockup
- render the results as cards with photo credits, including the no-photo state

Record:
- the load time
- the bytes
- the memory
- the throttled run
- a screenshot

Run PGlite's measurements the same way, without the cards.

How it runs:
- **Packages:** any npm package the spike needs goes in the spike folder's own `package.json`, never the repo's.
- **Server:** serve files from a copy of `e2e/Caddyfile` in the spike folder on `127.0.0.1:3102`. Ports 3100/3101 belong to the E2E harness; never run the spike while `pnpm e2e` runs.
- **`.wasm` files:** Caddy already serves them as `application/wasm`; confirm with `curl -I`.

### Why

critwire is open species data for people making nature apps. Learn turns it into a place where people aged 16 and up learn transferable SQL and relational design with real animals, and see what a game can do with the data. Every query must be tested, because a tutorial with a broken example teaches the wrong thing. The owner wants to review the design before anything goes live.

### Scope

In:
- `plans/002-learn.md`, the ERD source file under `plans/`, the mission B brief or briefs under `plans/`, `plans/001-mvp.md` (the one pointer), and the plan file.
- The spike and measurements in a scratch folder outside the repo: `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`. Copy into the plan any code the design needs to show.
- Reading the web, and downloading pinned packages and open data for the spike.

Out:
- **Nothing public changes.** No new or changed files under `scripts/`, `site/`, `e2e/`, `data/` or `db/`, and no `package.json` or lockfile changes. `pnpm build` must produce the same `dist/` as `main`. The release at the end merges the plan files only.
- `/srv/apps/critwire`, `/etc/caddy`, `/srv/critter-ai/ops`, and apt packages. Never connect to the `critwire` database, except through `deploy critwire` at the release; use `critwire_dev`, or DuckDB on the files.
- **Belongs to A2:**
  - growing the data beyond the countries file
  - the spatial track and the habitat raster
  - IUCN
- No IUCN data of any kind, and no Wikipedia prose.

### Definition of done

- `pnpm typecheck` and `pnpm test` pass.
- **`dist/` is unchanged:**
  - At Baseline, save to the spike folder the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`, and of the live `/v1` files.
  - The final Verification compares the branch's build against that list.
  - The release smoke compares the live files after `deploy` against it. Any difference fails.
- **Every SQL statement in `plans/002-learn.md` ran.**
  - Every ```` ```sql ```` block starts with `-- q: <id>` and `-- status: ran | draft-table | untested: <reason>`:
    - `ran`: runs against today's data
    - `draft-table`: needs mission B's countries file and runs against the spike's draft table
    - `untested`: anything else, with the reason; there should be almost none
  - `spike/run-queries.ts` extracts the blocks, runs the `ran` and `draft-table` ones in the recommended engine, and writes `/srv/critter-ai/agent-state/missions/critwire-learn-design/queries.log` (id, row count, first rows).
  - Each block's recorded result in the plan matches the log. Verification re-runs the script, and any difference fails.
- The ERD exists as a text source in the repo and renders to SVG with the chosen tool; put the SVG in the spike folder.
- The spike's evidence goes in the spike folder: timings, bytes, memory, the throttled run, screenshots, and the commands to reproduce them.
- The plan's Summary gives:
  - the engine recommendation and its key numbers (first-load bytes, time to first result normal and throttled, peak memory), next to PGlite's
  - shell embed vs our own editor
  - whether self-hosted DuckDB extensions work
  - the lesson list and the cookbook count
  - the demo pick
  - the countries source
  - the mission B brief's path
  - the owner's choices from section 10

### Decision rules

- **Simplest approach that works** (`AGENTS.md`), with no server process: critwire stays static files.
- **Self-host everything** (WASM, workers, extensions, app) from pinned packages. Mention a CDN only to explain why it's not used. Schools often block third-party CDNs, and critwire.com should work on its own.
- **Standard, transferable SQL** in every lesson. The DuckDB-specific parts (reading Parquet, lists, `UNNEST`) stay in the page's setup code that builds the learners' tables. Show them only in the normalization lesson, labelled as DuckDB.
- **Write for people aged 16 and up who are new to SQL.** Plain, direct explanations, real questions about animals, and no jargon left unexplained. Be honest about the data: countries mean "recorded there in open records", not where an animal naturally lives.
- **Licenses decide what critwire can host.** If a source's terms are unclear, treat it as not hostable and say so.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public belongs to the owner: put it in section 10 with a recommendation. Add a handoff item only if the mission can't finish without an answer.

### Notes

- **Data today** (`main` `871d0a6`, live at critwire.com):
  - 76 species: 50 Mammalia, 15 Amphibia, 11 Reptilia
  - `range.status`: `ok` 72, `no-open-records` 1, `identity-unsettled` 3
  - 107 distinct country codes
  - no traits
  - `species.parquet` keeps the nested shape: `taxonomy`, `ids`, `range`, `photo` and `sources` are structs and lists
  - field meanings: `plans/001-mvp.md` ("Record") and the docs page `site/index.html`, rendered by `scripts/build/docs.ts`
  - 74 of 76 records have a Wikimedia Commons photo with `url` (a 500 px thumbnail), `credit`, `license` and `page`. Ids 19 (`floreana-giant-tortoise`) and 47 (`ili-pika`) have `photo: null`. Photo licenses: CC BY-SA 49, CC BY 15, public domain 8, CC0 2.
- **Serving:** Caddy serves `/v1` with CORS (`*`, `Range` allowed, range headers exposed) and answers `OPTIONS` with 204. DuckDB already reads the live `species.parquet` over HTTPS (release smoke X6, 76 rows). The E2E harness runs a local Caddy copy of the live block on ports 3100/3101 (`e2e/Caddyfile`). Playwright 1.58.2 Chromium runs headless on this ARM64 VPS, and Chromium's DevTools protocol can throttle CPU and network.
- **Engine facts from the brief review** (Fable, 2026-10-22). Confirm them in the spike.
  - **DuckDB-WASM extensions** self-host as a mirror with the layout `<repo>/duckdb-wasm/$duckdb_version_hash/$duckdb_platform/<name>.duckdb_extension.wasm`, served with CORS. `INSTALL` defers to `LOAD`, and signatures survive copying. See https://duckdb.org/docs/2.0/clients/wasm/extensions.html.
  - **PGlite 0.4** (2026-03-25) runs Postgres in the browser. Its PostGIS add-on is experimental. See https://pglite.dev/extensions/.
  - **The DuckDB shell** has `embed({shellModule, container, resolveDatabase, backgroundColor, fontFamily})` (`packages/duckdb-wasm-shell/src/shell.ts`). It takes a `Promise<AsyncDuckDB>`, so critwire's tables can be loaded before the shell opens.
- **The old plan:** `plans/001-mvp.md` Later has "Phase 2 viewer: DuckDB-WASM table in the browser; novices tick animals, filter, download their own copy." Fold it into section 8, or say why not.
- **Natural Earth quirk:** in admin-0, `ISO_A2` is `-99` for a few countries (France and Norway among them). `ISO_A2_EH` fixes most of them. Check every one of the 107 codes, plus anything GBIF uses that isn't strictly ISO, such as `XK` for Kosovo.
- **Release:** critwire missions merge and deploy themselves at the end (`MISSION_RELEASE=deploy`). Here the merge carries only plan files, so the deploy republishes the same `dist/`. The release smoke should confirm the live site's files are unchanged.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-22, worktree HEAD `e3fd843` (= `origin/main` `871d0a6` + this plan; `git diff --stat origin/main HEAD` touches only this plan, so its build is `main`'s build).
- `pnpm install --frozen-lockfile`: up to date. No lint script and no migrations: `pnpm build` rebuilds the schema in `critwire_dev` each run.
- `pnpm typecheck`: pass. `pnpm test`: 66/66 pass.
- `pnpm build`: pass, 157 files in `dist/`.
- `E2E_ARTIFACTS=/srv/critter-ai/agent-state/missions/critwire-learn-design/baseline-e2e pnpm e2e`: 20/20 pass (report `baseline-e2e/playwright-report/`); no Caddy left running.
- **dist hashes** (Definition of done): `spike/baseline/dist.sha256` (157 files, `sha256sum` from inside `dist/`). Live copies fetched from https://critwire.com into `spike/baseline/live/`, hashed in `spike/baseline/live.sha256`: identical to `dist.sha256`. Spike folder = `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`.
- Reproduce: `rm -rf dist && pnpm build && (cd dist && find . -type f | sort | xargs sha256sum) | diff - <spike>/baseline/dist.sha256`.
- Brief's data facts confirmed from `data/species.json`: 76 species (Mammalia 50, Amphibia 15, Reptilia 11); `range.status` ok 72, identity-unsettled 3, no-open-records 1; 107 distinct country codes; `photo: null` for 19 `floreana-giant-tortoise` and 47 `ili-pika`; photo licenses CC BY-SA 49, CC BY 15, public domain 8, CC0 2.
- `vision.png` present in the mission state folder.

## Architecture

A1 builds nothing public, so the "code in scope" is the repo that Learn has to fit (build, docs template, E2E harness, data) plus the mockup. Each finding is a fact checked on 2026-10-22 against this worktree, `data/species.json`, npm/jsDelivr metadata or a live endpoint. **(S)** marks a fact the spike must confirm in the browser.

### Findings (ranked by impact)

**F1. DuckDB-WASM's browser entry needs a bundler, and esbuild is the only one the repo can install.** `@duckdb/duckdb-wasm@1.33.1-dev57.0` `dist/duckdb-browser.mjs` imports the bare specifier `apache-arrow`, so a static page can't load it directly. `pnpm-workspace.yaml:1-2` allows build scripts for esbuild only, and esbuild 0.28.2 (+ `@esbuild/linux-arm64`) is already installed as a tsx dependency. pnpm doesn't hoist it, though (`node_modules/esbuild` doesn't exist), so the build can't import it as is. Fix: esbuild `0.28.2` as a direct, exact-pinned dependency (§4 Build) bundles the page code, duckdb-wasm and arrow into one ESM file. No `allowBuilds` change.

**F2. duckdb-wasm runs a different DuckDB from the repo's, and it releases only dev builds.**
- npm `latest` is the prerelease `1.33.1-dev57.0` (2026-06-22) and `next` is `1.33.1-dev65.0` (2026-09-29). The last plain release on npm is 1.32.0 (2025-12-16), and GitHub v1.31.0 says "Based on DuckDB v1.4.0". The repo builds with `@duckdb/node-api 1.5.6-r.2` (`package.json:28`; `SELECT version()` = v1.5.6).
- So: (a) recorded results must come from the WASM engine itself; (b) the extension mirror path is keyed by the WASM build's DuckDB version, and a dev build may have no published extensions; (c) the repo's pnpm release-age gate (`pnpm-workspace.yaml:3-13` has to exclude day-old node-api builds) also blocks PGlite 0.5.11 (2026-10-21). PGlite is now 0.5.x, not the brief's 0.4.
- Uncompressed sizes (jsDelivr listing):

  | Package | Files |
  |---|---|
  | duckdb-wasm | `duckdb-eh.wasm` 35.9 MB; `duckdb-mvp.wasm` 41.3 MB; `duckdb-coi.wasm` 35.6 MB; each worker ≈ 0.8 MB |
  | PGlite 0.5.10 | `pglite.wasm` 10.5 MB, `pglite.data` 6.2 MB, `initdb.wasm` 0.3 MB, `index.js` 1.9 MB |
  | sql.js 1.15.1 | `sql-wasm.wasm` 0.68 MB |
  | duckdb-wasm-shell | `shell_bg.wasm` 1.4 MB, plus its xterm dependencies |

**F3. As configured, Caddy makes every learner download the engine again after each deploy.**
- The live block (copied in `e2e/Caddyfile:10-36`) has `encode zstd gzip` and no `Cache-Control`.
- Caddy 2.11.7 carries `application/wasm*` as an encode-matcher pattern, so the 36 MB WASM is compressed on the fly for every request on a 2-core ARM box (S: `curl`).
- `scripts/build.ts:28` deletes and rewrites `dist/`, and Caddy's `file_server` ETag comes from mtime + size. Every deploy, even a data-only one, therefore changes the engine's ETag.
- Fix, repo side (B1 default, no Caddy change): `writeLearn` sets a fixed mtime (`fs.utimes`, 2000-01-01T00:00:00Z) on every vendored engine file after copying. The ETag (mtime + size) then survives deploys, so browsers get a 304 or reuse their cache instead of downloading 36 MB again. A new engine version gets a new directory (`duckdb-<version>/`), so a fixed mtime can't serve stale bytes. pnpm store files carry install-time mtimes (checked), so copying the source mtime wouldn't be stable.
- Fix, control room (owner's choice): `Cache-Control: public, max-age=31536000, immutable` on `/learn/assets/*`, and optionally `file_server { precompressed br zstd gzip }` with `.br` files the build writes. Learn must work without either. `e2e/serving.spec.ts:31-36` fails on drift, so any such change goes into the ops Caddyfile first and `e2e/Caddyfile` after it.

**F4. The mockup's query and results don't fit critwire's data.** Checked with DuckDB on `dist/v1/species.parquet`:
- (a) It teaches `WHERE` using a `JOIN`.
- (b) `JOIN species_countries USING (species_id)` can't work when the primary key is `species.id` (the brief's naming). It needs `ON sc.species_id = s.id`.
- (c) It selects only `scientific_name` but shows photos and common names.
- (d) Capybara isn't one of the 76 animals.
- (e) Brazil returns 12 animals, including Tiger, Chimpanzee and African Wild Dog. Those are open records outside the native range, and the lesson has to say so.
- (f) There are no photo credits, and none of the 12 lacks a photo, so showing the no-photo state needs a second query (ids 19 and 47).

**F5. Data facts the learners' schema depends on** (checked on `data/species.json`):
- Taxonomy has 3 classes, 22 orders, 50 families and 68 genera. Each genus has exactly 1 family, each family 1 order, each order 1 class. No name is used at two ranks, and the genus equals the first word of `scientificName` for all 76. Taxon names therefore work as a natural key.
- There are 472 species–country pairs across 107 codes. Four species have none: 9, 19 and 27 are `identity-unsettled`, 47 is `no-open-records`.
- Non-null outside ids are unique: iucn 76, gbif 73, col 69, wikidata 76, inaturalist 74, ncbi 75.
- `sources[]` has 5 sources, each with one license and one `retrieved` (null for `critwire base`). (species, field) is unique: 591 pairs.
- `taxonomy.order` and `range` need quoting in DuckDB (`scripts/build/columns.ts:14,16`; `site/index.html:95`), so learner tables must avoid reserved names.
- `db/schema.sql:4-27` already gives every scalar field a snake_case name (`scientific_name`, `order_name`, `iucn_id`, `photo_url`, `range_status`, …). The learner tables reuse those names.

**F6. DuckDB's foreign keys and statement handling constrain setup, reset and the runner.** Checked in node DuckDB 1.5.6 (S: check again in WASM):
- FKs are checked statement by statement. A self-referencing FK works, but a multi-row `INSERT` whose child row points at a parent inserted by the same statement fails ("Violates foreign key constraint because key "name: a" does not exist"). The setup therefore inserts `taxa` one rank at a time, top down.
- An FK can only be declared in `CREATE TABLE`: `ALTER TABLE … ADD FOREIGN KEY` is "Not implemented". So every referenced table must exist before its child, in one setup.
- A parent can't be dropped while a child references it (`DROP TABLE species` fails while `species_countries` or a learner's `species_traits` exists; `CASCADE` doesn't help). Re-running setup can't reset a database.
- `BEGIN; CREATE TABLE species_traits (… REFERENCES species(id)); INSERT …; <failing INSERT>; ROLLBACK` leaves the catalog exactly as before.
- Multi-statement text returns the *first* statement's result (`SELECT 1; SELECT 2` gives 1). Text must be split into statements.
- `getTableNames(sql)` (node-api and duckdb-wasm's `AsyncDuckDBConnection`) lists the tables a statement reads and expands views (a view over `countries` reports `countries`), ignores string literals, and returns `[]` for `CREATE TABLE` and `CREATE VIEW`.

**F7. Country matching has known traps.**
- The 107 codes include GF, MQ and RE (French overseas regions), HK and NA.
- In Natural Earth's admin-0 *countries* layer, France is one unit with `ISO_A2 = -99`, so GF/MQ/RE are expected only in the *map units* layer (S).
- GBIF's `/v1/enumeration/country` (fetched: 250 entries with `iso2, iso3, isoNumerical, title, gbifRegion, enumName`) has no continent or subregion and states no license.
- pandas' default CSV reader turns `NA` (Namibia) into a missing value, so the `countries.csv` docs need a note.

**F8. The build renders exactly one page.**
- `scripts/build/docs.ts:7` hard-codes `site/index.html`. The slot filler, with its unknown/unused-slot checks, lives inside `renderDocs` (`docs.ts:36-44`), and `scripts/build.ts:24,38` writes only `index.html`. Learn should extract that filler (DRY), not copy it.
- `tsconfig.json` covers only `scripts` and `e2e`, with `types: ["node"]`. Browser code needs its own tsconfig with the DOM lib, and `pnpm typecheck` must run both.
- `e2e/duckdb.spec.ts:57-58` pins the exact set of `/v1` file kinds the docs' curl examples cover. The countries files need a docs and test update in mission B.

**F9. mermaid-cli can't run on this box, but Playwright's Chromium can render Mermaid.** `@mermaid-js/mermaid-cli` 12.0.0 drives puppeteer. Puppeteer's postinstall downloads Chrome, which `allowBuilds` blocks, and Chrome for Testing has no linux-arm64 build (this VPS is aarch64). Playwright 1.58.2 (`package.json:22`) and its `chromium-1208` are installed and already run the E2E suite, and `mermaid`'s own browser bundle renders in them.

**F10. Card photos come straight from Wikimedia's servers.**
- 72 are on `thumb.wikimedia.org`, 2 on `upload.wikimedia.org`, and 2 are null.
- Wikimedia sends `access-control-allow-origin: *` (checked), so `<img crossorigin>` would work under COEP if `coi` were ever used.
- Card credit links need the license deed URLs in `scripts/build/sources.ts:65` (`LICENSE_URLS`). The browser bundle imports that same registry.

**Already fine:**
- `/v1` CORS, Range and preflight (`e2e/serving.spec.ts:38-88`), and the offline build.
- `.wasm` gets `application/wasm` from `/etc/mime.types` (S: `curl -I`).
- The docs promise "Inside v1 we only add things" (`site/index.html:63`), so a new `/v1/countries.*` file fits.
- Caddy's `file_server` serves `dir/index.html`, so `/learn/<slug>/` needs no routing config.
- The docs' Brazil example uses DuckDB's `list_contains` (`site/index.html:93-96`). Learn teaches the standard-SQL join and can point out the difference.

### Target design

#### 1. The spike (`<spike>` = `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`, outside the repo)

```
README.md              every command to reproduce, in order
package.json           own deps, exact pins (+ pnpm-lock.yaml, pnpm-workspace.yaml with allowBuilds: esbuild; release-age excludes only if a pin needs one)
Caddyfile              e2e/Caddyfile's globals + its :3100 block on http://127.0.0.1:3102 (root {$SPIKE_SITE}, log {$SPIKE_OUT}/caddy-access.log); the :3101 block dropped
Caddyfile.proposed     Caddyfile + the control-room proposal: Cache-Control immutable on /learn/assets/*, precompressed br zstd gzip, COOP/COEP on /coi/* only
src/                   browser code and SQL: engine.ts, sql.ts, cards.ts, check.ts, card-page.ts, runner-page.ts, pglite-page.ts, shell-page.ts, measure-worker.js,
                       *.html, setup.sql, setup-pglite.sql
scripts/               Node 24 runs .ts directly: build-site.ts, serve.ts, measure.ts, run-queries.ts, erd.ts, countries-draft.ts
downloads/<name>/      each untrusted download in its own new directory (naturalearth-<ver>/, gbif-enum/, duckdb-ext-<ver>/)
site/                  generated web root: v1/ (copy of baseline/live/v1 + draft countries.{parquet,json}), learn/assets/duckdb-<ver>/, pglite/, sqljs/, pages, bundles
erd/                   schema.svg, schema.png
out/<run>/             results.json, summary.md, screenshots, caddy-access.log, env.txt (package versions, Chromium, CPU, SELECT version())
baseline/              exists
```

**Pins:**
- `@duckdb/duckdb-wasm` and `@duckdb/duckdb-wasm-shell` at the same version: the newest one older than the release-age gate whose `SELECT version()` is a tagged DuckDB release with `wasm_eh` extensions published under `extensions.duckdb.org/<version>/`. Check 1.32.0 and the newest dev build, and record both.
- `@electric-sql/pglite`: the newest version outside the gate (0.5.10 today). `sql.js` 1.15.1.
- `esbuild` 0.28.2 (the repo's).
- `playwright` 1.58.2: the same version as the repo's `@playwright/test`, so it reuses `~/.cache/ms-playwright/chromium-1208` without a download. Every script launches it with `channel: "chromium"` (full Chromium, new headless), not the default headless shell: closer to a Chromebook's Chrome, and it has the CDP domains (`SystemInfo`) the memory probe needs.
- `mermaid`: the newest version outside the gate. Installing the spike with the repo's `allowBuilds` (esbuild only) shows whether `@duckdb/duckdb-wasm` or `mermaid` need any other build script; record it, since B1 adds both to the repo.
- `@duckdb/node-api` 1.5.6-r.2, used only to write the draft countries Parquet, never for results.

**Serving:**
- `scripts/serve.ts` checks with `ss -ltn` that 3102 is free, refuses to start while an E2E Caddy is on 3100/3101, runs `caddy run --config <Caddyfile|Caddyfile.proposed>`, and stops it on exit. `measure.ts` and `run-queries.ts` both use it.
- The first spike step runs `curl -sI` on a `.wasm` (expect `application/wasm`). It then runs `curl -s -H 'Accept-Encoding: <zstd|gzip|br>' -o /dev/null -w '%{size_download}'` for every asset, to build a byte table that doesn't depend on the browser.
- **Classroom load:** 10 parallel `curl -H 'Accept-Encoding: zstd'` fetches of `duckdb-eh.wasm`, under `Caddyfile` (on-the-fly compression) and under `Caddyfile.proposed` (precompressed). Record wall time and Caddy's CPU seconds (`utime + stime` from `/proc/<caddy pid>/stat`, before and after). §10's precompression recommendation is weighted by this number.

**Page code:**
- `src/engine.ts` is the one boot path for the card page, the runner and the measurements. It uses manual `mvp`/`eh` bundles with self-hosted URLs (never `getJsDelivrBundles`) and an `AsyncDuckDB` in a worker.
- `boot()` and `restart()` share one function: new worker and `AsyncDuckDB`, `instantiate`, `open` (`:memory:`), settings, register files, run `setup.sql`. `restart()` first calls `db.terminate()`. Every fresh database comes from this path (F6: nothing is ever dropped to reset).
- Settings: `autoinstall_known_extensions=false` and `autoload_known_extensions=false`, so a missing extension fails loudly instead of fetching from extensions.duckdb.org; `memory_limit` (start at 512 MB, then set from the measured peak), so a runaway query fails with DuckDB's out-of-memory error rather than killing the tab.
- It always registers `species.parquet` and `countries.parquet` with `registerFileURL(name, location.origin + '/v1/…', HTTP)`. In the spike, `site/v1/countries.parquet` is the draft; in mission B it's the published file. SQL never contains an origin, so the same text runs on critwire.com, in the spike and in E2E.
- `runScript(text, params?)` splits the text with `src/sql.ts` `splitStatements` (top-level `;` outside quotes, quoted identifiers and comments; pure), runs the statements in order and returns the last one's `{ columns, rows }`. An error names the statement's number. `params` bind to the last statement. The editor, the runner and the measurements all use it (F6: multi-statement text returns the first result).
- Timing marks: `nav → engine → setup → query → cards`, plus `restart` when it runs.

**Measurement harness (`scripts/measure.ts`):**
- **Matrix:** engine {duckdb-eh, duckdb-mvp, pglite} × profile × {cold, warm}, 5 runs each, reporting median and max. Then duckdb-eh alone again under `Caddyfile.proposed`, to show the effect of caching and br. Cold means a new browser and context; warm means a reload in the same context. Three extra duckdb-eh cases per profile:
  - **warm after rebuild:** rerun `build-site.ts` (which applies F3's fixed mtime), then reload. It passes if the engine files come back 304 or from cache, with the same ETag.
  - **restart:** `engine.restart()` in a warm page (what Reset and Stop cost).
  - **runaway query:** one cross join of `species` × `species_countries` × `species_sources`, to confirm `memory_limit` gives an error, not a crashed worker (S).

  The profiles:

  | Profile | CPU | Down / up | Latency |
  |---|---|---|---|
  | desktop | none | none | none |
  | school-wifi | 4x | 5 / 1 Mbps | 100 ms |
  | slow-4g | 6x | 1.6 / 0.75 Mbps | 150 ms |

- **Throttling** uses CDP `Emulation.setCPUThrottlingRate` and `Network.emulateNetworkConditions` on the page session. DuckDB runs in a worker, so validate both before trusting them:
  - (a) Time a fixed busy loop in a Worker at rate 1 and at rate 4. If the ratio is under 2.5, the worker isn't throttled: run every throttled profile, for every engine, under `systemd-run --user --scope -p CPUQuota=<100/rate>%` instead. That throttles every thread, is transient and needs no root. Record which method was used.
  - (b) Check that the worker's `.wasm` download time ≈ bytes ÷ throughput. Only if it isn't, put a small rate-limiting Node proxy on 3102 in front of Caddy, which then listens on a Unix socket.

  Every engine is measured the same way, so PGlite (main thread) and DuckDB (worker) compare fairly.
- **Bytes:** the Caddy access log's `size` and `Content-Encoding` per request give the on-the-wire bytes, and file sizes give the uncompressed bytes. CDP `encodedDataLength` is a cross-check. Report per asset and in total, cold and warm. Warm under the live config shows the F3 re-download.
- **Memory:**
  - Peak renderer RSS: `VmHWM` from `/proc/<pid>/status`, with renderer pids from browser CDP `SystemInfo.getProcessInfo`. It covers page, worker and WASM.
  - Main-thread JS heap from `Performance.getMetrics`.
  - WASM linear memory: `memory.buffer.byteLength`, captured by wrapping `WebAssembly.instantiate*`. For DuckDB, `measure-worker.js` patches them and then `importScripts` the DuckDB worker; for PGlite, a page init script does it. WASM memory only grows, so the final value is the peak.
- **Times** come from the page marks. Photo loading (a third-party host) is reported separately.
- **Self-hosting proof:** `context.route('**')` allows only `127.0.0.1:3102` and the two Wikimedia hosts. Any other request is aborted and listed in the results; the list must be empty.
- **coi gate:** run `/coi/` once on desktop and once at 4x under `Caddyfile.proposed`, checking `crossOriginIsolated`. Run the full matrix only if its median time to first result is at least 30 % lower than eh's; otherwise record the quick numbers.
- **PGlite:** `pglite-page.ts` fetches `/v1/species.json` and the draft `/v1/countries.json`, builds the same tables with `setup-pglite.sql` (Postgres `jsonb_array_elements`), and runs the Brazil join. Same metrics, no cards, on the main thread (PGlite's default). Note how long it blocks the main thread.
- **sql.js:** the curl byte table plus the assessment paragraph.
- **Other browsers:** an optional functional check in Firefox, if `playwright install firefox` works without apt. WebKit needs apt packages, so it's out of scope; say so.
- **What emulation can't prove** (002 §1 states it): throttled Chromium on this ARM server proves timing under CPU and network limits, and the peak memory Chrome needs. It can't prove a real Chromebook's memory pressure (tab discarding at 4 GB), ChromeOS GPU and thermal behaviour, Android Chrome, or iOS Safari (WebKit's WASM memory limits, and whether the `eh` bundle loads or `selectBundle` falls back to `mvp`). The 375 px screenshots check layout only, not mobile browsers. §10 asks the owner for one real-device check.

**Extension mirror test:**
- Download the `inet` (small) and `spatial` extensions for `wasm_eh` and `wasm_mvp`, for the pinned build's DuckDB version, into `downloads/duckdb-ext-<ver>/`. Copy them to `site/learn/assets/duckdb-ext/<version>/<platform>/<name>.duckdb_extension.wasm`.
- Then run `SET custom_extension_repository = '<origin>/learn/assets/duckdb-ext'; INSTALL spatial; LOAD spatial; SELECT ST_AsText(ST_Point(1, 2));` with signature checks left on.
- It passes if the result is right and no request leaves the origin. Record compressed bytes and what Caddy needs.
- v1 lessons need no extension (S: `duckdb_extensions()` shows parquet and json statically linked). Vendoring extension binaries is A2's decision.

**Shell (time-boxed to one session):** `shell-page.ts` bundles `@duckdb/duckdb-wasm-shell` with esbuild and calls `embed({ shellModule, container, resolveDatabase: () => db })` on the already-built database. It types `SELECT count(*) FROM species;` through `page.keyboard` and takes a screenshot. Record the bytes and notes on screen readers and phone keyboards. If the shell doesn't work within the time box, record why.

**Card page:** reproduces the mockup as lesson 9 (§4): label, badge, question, concept line, a `<textarea>` with the join, a Run button, and cards with credits. It also runs the NULL lesson's query (ids 19 and 47) to show the no-photo state. Screenshots: desktop, 375 px, and a throttled run.

**`scripts/run-queries.ts` contract:**
- **Path:** the Definition of done's `spike/run-queries.ts` is `<spike>/scripts/run-queries.ts`; Verification runs `node <spike>/scripts/run-queries.ts`.
- **Usage:** `node scripts/run-queries.ts <plans/002-learn.md> [--check|--update] [--erd plans/002-learn-erd.mmd]`. It starts the spike Caddy through `serve.ts` and opens `runner.html` in headless Chromium. That page boots `engine.ts` with the same bundle, version and setup SQL as the card page, and exposes `window.runScript(text, params)` and `window.tableNames(sql)` (`conn.getTableNames`).
- **Engine:** DuckDB-WASM in headless Chromium, never the node DuckDB. Node runs DuckDB 1.5.6 with `icu` loaded; the WASM build runs another version with another extension set (F2). The log has to hold what a learner's browser returns.
- **Block headers:** every ```` ```sql ```` block starts with `-- q: <id>` (unique, `[a-z0-9-]+`) and `-- status: ran | draft-table | untested: <reason>`. Optional headers:
  - `-- params: <JSON array>`, bound to the last statement's `?` through `prepare`.
  - `-- expect: error <substring>`, for exercises that must hit a constraint error. Only the last statement may fail; an earlier error fails the run.
  - `-- show: cards`: the result is drawn as cards (§4). It is not a plan-only header: the site shows it to learners as part of the SQL.

  A missing or duplicate header fails the run.
- **Setup block:** `q: setup` in 002 §2 must equal `src/setup.sql` byte for byte, apart from the header lines, so the plan shows the real setup. The runner page runs it once at boot (it is the setup, so it has no result block); `q: setup-counts` records each table's row count.
- **One database, one setup:** the same `setup.sql` builds every table, `countries` included, exactly as mission B ships it (§2). Every block runs inside `BEGIN … ROLLBACK`, so each sees the pristine database (F6: learner DDL with FKs and failed constraints roll back cleanly). A failed `ROLLBACK` stops the run.
- **Labels are checked, not trusted:** a block is `draft-table` exactly when one of its statements reads `countries`: `getTableNames` reports it (this covers views), or the statement's text has the whole word `countries` outside comments and strings (`getTableNames` returns nothing for `CREATE`). `species_countries` and `countriesWithOpenRecords` don't match. A `ran` block that reads `countries`, or a `draft-table` block that doesn't, fails the run. The draft file therefore only shapes `draft-table` results; a `ran` block depends on it only in that setup needs every species code to exist in `countries`.
- **Display check:** a `-- show: cards` block whose result fails the card rule (§4) fails the run.
- **One rendering function:**
  - The result line is `-- result: <id> · <n> rows · sha256 <first 12 hex of the full rendered result>`.
  - Then a `col | col` header and the first 5 rows: NULL as `NULL`, lists as `[a, b]`, BigInt as digits, cells over 60 characters cut with `…`.
  - Errors: `-- result: <id> · error: <first line>`. Untested blocks: `-- skipped: <id> · <reason>`.
- **Log:** writes `/srv/critter-ai/agent-state/missions/critwire-learn-design/queries.log`. The first line names the engine (package version, bundle, `SELECT version()`, UTC time); then one result per block, in plan order.
- **Comparison:**
  - In the plan, every `ran`/`draft-table` block except `q: setup` is followed by a ```` ```text ```` block holding exactly its rendered result.
  - `--check` is the default and what Verification runs. It fails on any difference, and on a missing or orphan result block.
  - `--update` rewrites the plan's result blocks from the log, snapshot-style; review the diff before committing.
- **`--erd`:** compares the Mermaid entities and attributes with the pristine database's `information_schema.columns` and `duckdb_constraints()`. It also checks that 002 §3's ```` ```mermaid ```` block equals the `.mmd` file. Any drift fails.
- **Determinism:** every recorded query has an `ORDER BY` on a unique key, or returns one row. No `random()`, `hash()`, `uuid()` or `current_date`; "random" cookbook picks use arithmetic on ids, with the seed or date passed as a literal or a `?` parameter.

**Other scripts:**
- `scripts/erd.ts` loads `mermaid`'s browser bundle into a Playwright page and renders the `.mmd` it's given with `htmlLabels: false`, so labels are plain SVG text that renders inside `<img>`. It fails if the output contains `<foreignObject>`, and writes `erd/schema.svg` plus a PNG.
- `scripts/countries-draft.ts` reads the attributes of Natural Earth admin-0 `countries` and `map_units` from a pinned release in `downloads/` (GeoJSON properties only; geometry dropped) and applies the §2 matching rule. It fails, listing the codes, if any of the 107 codes or `XK` doesn't match. It writes `site/v1/countries.parquet` and `countries.json` (columns as in §2; the JSON only feeds the PGlite measurement) and `out/countries-match.md`, which lists each code with the layer and field it matched and the name.

#### 2. Learners' schema v1

**How it's built:** one `setup.sql`, run once on a fresh in-memory database, builds every table below from `species.parquet` and `countries.parquet`. It is the only initialization sequence: the spike, run-queries, every Learn page and E2E run the same text, and only the file behind `/v1/countries.parquet` differs (the spike's draft in A1, the published file in mission B). So `countries` always exists and `species_countries` always has both FKs.
- **Order** (F6: FKs only in `CREATE TABLE`, checked per statement): `taxa` one rank at a time, top down → `species` → `sources` → `species_sources` → `countries` → `species_countries` → view `species_taxonomy`.
- **No `DROP`**, ever: a fresh database comes only from `engine.restart()` (§1, §4).
- **Fails loudly:** a species code missing from `countries`, a source with two licenses, or a taxon collision breaks a constraint, and the page shows the error. Mission B's E2E runs this setup, so a deploy can't ship a setup that fails.
- Tables use standard types and constraints, and DuckDB-only syntax (`read_parquet`, `unnest`, struct access) appears only in this setup.
- Mission B ships Learn only together with or after `/v1/countries.*` (B1 builds the countries file first), and then relabels 002's `draft-table` blocks `ran`.

**Naming:** entity tables are plural snake_case, junction tables are `<a>_<b>`, and FKs are `<entity>_id`, `_code` or `_name`. Scalar column names follow `db/schema.sql`.

| Table | Columns and keys | Built from |
|---|---|---|
| `taxa` | `name` PK; `taxon_rank` NOT NULL CHECK in (class, order, family, genus); `parent_name` FK → `taxa.name`, NULL for classes | `DISTINCT taxonomy.*`, one INSERT per rank, top down (F6) |
| `species` | `id` PK; `slug` UNIQUE NOT NULL; `scientific_name` UNIQUE NOT NULL; `common_name` NOT NULL; `genus` FK → `taxa.name`; `range_status` NOT NULL CHECK (3 values); `photo_url`, `photo_credit`, `photo_license`, `photo_page`; `iucn_id`, `gbif_id`, `col_id`, `wikidata_id`, `inaturalist_id`, `ncbi_id` (each UNIQUE, nullable) | the record's flat fields |
| `countries` | `code` PK (ISO 3166-1 alpha-2, plus `XK`); `name` UNIQUE NOT NULL; `continent`, `region`, `subregion` NOT NULL | the spike's draft table, then `/v1/countries.parquet` (mission B) |
| `species_countries` | `species_id` FK → `species.id`; `country_code` FK → `countries.code`; PK (`species_id`, `country_code`) | `unnest("range".countriesWithOpenRecords)`; means "countries with open records", never native range |
| `sources` | `name` PK; `license` NOT NULL; `retrieved` DATE (NULL for critwire base) | `DISTINCT` over `unnest(sources)`; a source with two licenses or dates breaks the PK (fails loudly) |
| `species_sources` | `species_id` FK; `field` (the file path, e.g. `ids.col`); `source_name` FK → `sources.name`; PK (`species_id`, `field`) | `unnest(sources)`, then `unnest(fields)` |
| view `species_taxonomy` | `species_id`, `class`, `order_name`, `family`, `genus` | the 4-way `taxa` self-join; setup ships it for the cookbook and the game, and the views lesson explains it |

**Expected counts today:** `taxa` 143 (3 + 22 + 50 + 68), `species` 76, `species_countries` 472, `sources` 5, `species_sources` 591, `countries` ≥ 107.

**Limits the lessons state:**
- `species.genus → taxa.name` can't make sure the referenced row is a genus: a CHECK can't look at another row. Lesson 12 says so (and that a trigger or a per-rank table would be needed), so learners don't assume an FK checks more than existence.
- Taxon names are a natural key because no name is used twice today (F5); that's a fact about the data, not a rule of nomenclature. Mission B's `pnpm derive` refuses (blocking) a taxon name at two ranks or under two parents, so a collision fails at derive, not in learners' browsers. Fixing one would be a schema change (a surrogate `taxa.id`), decided then.

**Left out of v1:** `replaced_by` (all null today; later a `species_replacements` table) and each record's source query URLs.

**Room to grow (A2), with no renames:**
- `traits` + `species_traits (species_id, trait_name, value, unit, source_name)`
- `habitats` + `species_habitats`
- `regions` + `country_regions`
- `occurrences (id, species_id, country_code, …)`
- new ranks as `taxa` rows, with the CHECK widened

A future native range would be a new table, such as `species_native_countries`, never a new meaning for `species_countries`.

**Countries source** (for 002 §6). The A1 research step finds the exact license quotes and the pinned release.
- **Source:** Natural Earth admin-0 (public domain) supplies every published field. GBIF's enumeration is used only as an unpublished cross-check of the code set, because its license is unclear.
- **Matching rule:**
  - `code` = `ISO_A2_EH`, which fixes the `-99` codes for France, Norway and Kosovo; otherwise `ISO_A2`.
  - Rows come from the `countries` layer. The `map_units` layer is used only for codes that have no country row (expected: GF, MQ, RE).
  - `name` = `NAME_EN` (or `NAME_LONG`; pick by which matches). `continent` = `CONTINENT`, `region` = `REGION_UN`, `subregion` = `SUBREGION`.
- **Mission B ingest** follows the existing pattern:
  - `pnpm ingest naturalearth` writes `data/raw/naturalearth/snapshot.json`: attributes only, keys sorted, with `retrieved`.
  - `pnpm derive` writes `data/countries.json` and refuses any species code without a row.
  - The build writes `/v1/countries.{json,parquet,csv}`.
- **Credit:** one new entry in `attribution.json`'s `sources` array, using only the keys entries already have, so no existing file changes shape.
  - Today `buildAttribution` (`scripts/build/attribution.ts:42-79`) makes one entry per source the species records cite, with `records` = citing species records, and throws on a registered source no record cites. Natural Earth is cited by no species record.
  - So B1 gives `data/countries.json` its own source block (name, license, `retrieved`, release), and `buildAttribution(species, countries, registration)` merges one entry built from it into the sorted list. Its `fields` are file-qualified (`countries.name`, `countries.continent`, `countries.region`, `countries.subregion`) so they can't be read as species fields; its `records` counts country rows; its `notes` says both. The unused-source check counts a source cited by the countries file.
  - The docs page's "Used for N records" line (`scripts/build/docs.ts:26`) says "N countries" for this entry, and `e2e/docs.spec.ts` checks it.

#### 3. ERD

- **Format: Mermaid `erDiagram`.** It's plain text with crow's-foot cardinality, `PK`/`FK`/`UK` markers and per-attribute comments, and GitHub renders it in Markdown, so the owner can review it in the PR. A1 writes `plans/002-learn-erd.mmd` and embeds the same text in 002 §3; `run-queries --erd` checks that the two match. The ERD shows tables only; the view is listed next to it.
- **Relationships:**
  - `taxa |o--o{ taxa`: parent of
  - `taxa ||--o{ species`: genus of
  - `species ||--o{ species_countries`
  - `countries ||--o{ species_countries`
  - `species ||--o{ species_sources`
  - `sources ||--|{ species_sources`
- **Spike:** `scripts/erd.ts` writes `<spike>/erd/schema.svg`.
- **Mission B:**
  - `git mv` the source to `site/learn/schema.mmd`.
  - `pnpm erd` (Playwright Chromium plus a pinned `mermaid` devDependency; no new `allowBuilds`) writes `site/learn/schema.svg` with a `data-source-sha256` attribute on the root `<svg>`.
  - `pnpm build` (offline, no browser) recomputes the hash and refuses a stale SVG with "site/learn/schema.svg is stale: run pnpm erd", like derive's stale check.
  - The schema page's text data dictionary, the accessible equivalent of the picture, is generated from the same `.mmd` attributes and comments.
  - E2E runs the `--erd` drift check against the database the browser builds.
- **From every lesson:** a "Schema" button opens a `<dialog>` with the SVG (an `<img>` with alt text, plus a link to `/learn/schema/`), so the editor keeps the learner's text.

#### 4. Learn: what 002 designs and mission B builds

**002 outline (brief §1–10):**

| § | Content | Evidence |
|---|---|---|
| 1 Engine and interface | answers to Q1–Q5 with numbers; the recommendation; what emulation proves and what only real hardware would | `out/<run>/summary.md` |
| 2 Schema | the table above, plus the `setup` block and `setup-counts` | `src/setup.sql` (byte-checked) |
| 3 ERD | the `.mmd` embed and how it's rendered | `erd/schema.svg` |
| 4 Lessons | the 16 lessons below, each with concept, question, SQL, result block, display, exercise with answer SQL, and check kind; a closing note on where A2's advanced track attaches (after lesson 16) | queries.log |
| 5 Cookbook | at least 25 queries with ids `c01…`, each with its game use, SQL (`?` via `-- params`) and result | queries.log |
| 6 Countries file | fields; Natural Earth vs GBIF with license quotes; ingest; the 107-code match table; credit; the `/v1` rule; the `NA` CSV note | `out/countries-match.md` |
| 7 Demo | 2–3 ideas, the pick, its rules, its queries (by cookbook id), the phone layout | |
| 8 Site | everything under "Site" below, with the Phase 2 viewer folded in | |
| 9 Mission B | paths of the brief(s) | `plans/…-b1.md`, `…-b2.md` |
| 10 For the owner | the choices listed at the end of this section, plus any the spike adds | |

**Concept order: the Brazil question moves after joins, to lesson 9.** The `WHERE` lesson uses single-table questions that are just as real ("Which animals are frogs?", "Which animals are in the genus *Panthera*?"). Brazil then explains why there's a junction table: one animal has many countries, so countries live in their own table. A ready-made joined table early on would show a join's output before learners know about keys, and they would have to unlearn it.

**Lesson path skeleton.** The lesson-writing step finalizes it; the slugs are the URLs.

| # | slug | concept | question | shown as |
|---|---|---|---|---|
| 1 | tables | tables, rows, columns; `--` comments, and Learn's `-- show: cards` | What does critwire know about an animal? | cards + table |
| 2 | select | SELECT, ORDER BY, LIMIT | Which animals come first from A to Z? | cards |
| 3 | where | WHERE, AND/OR, LIKE | Which animals are frogs? | cards |
| 4 | null | NULL, IS NULL | Which animals have no photo? | cards (no-photo state) |
| 5 | counting | COUNT, GROUP BY | How many animals have each range status? | table |
| 6 | erd | entities, attributes, reading the ERD | Where is each fact stored? (`information_schema.columns`) | ERD + table |
| 7 | keys | PK `id`, alternate keys (`slug`, outside ids), FK, constraints | Can two animals share an id? | cards + constraint error |
| 8 | one-to-many | 1:N, inner join | Which genus and family is the jaguar in? | cards |
| 9 | many-to-many | junction table, join (the mockup) | Which animals have been recorded in Brazil? | cards + "not native range" note |
| 10 | countries | lookup table | In which countries has the jaguar been recorded? | table (draft-table) |
| 11 | left-join | LEFT JOIN, NULL again | Which animals have no country records, and why? | cards |
| 12 | hierarchy | self-reference, tree; what an FK can't check (a genus row's rank) | How many mammals, amphibians and reptiles? | table |
| 13 | views | CREATE VIEW | Save "animals with their class" as a view | table |
| 14 | normalization | 1NF/2NF/3NF; nested file → flat tables (DuckDB-labelled) | How do 76 records with lists become 472 rows? | table |
| 15 | sources | provenance, licenses, open records ≠ native range | Who filled in the jaguar's taxonomy, and which photos are share-alike? | table |
| 16 | design | designing a table for new data | How would critwire store body mass and diet? | ERD + schema check |

**How results drive the interface** (one module each, pure where possible):
- **Query results:** `engine.runScript(text, params?)` (§1) returns the last statement's `{ columns, rows }` as plain JS values, with BigInt converted to a number when that's safe.
- **Cards:**
  - When cards appear: only when the SQL says so. A result shows as cards only if the text starts with the comment line `-- show: cards`; anything else is a table. Nothing is inferred from column names or values: `SELECT count(*) AS id FROM species` is a table. The directive is visible, travels with the SQL (lesson, cookbook file, playground, copy-paste), and lesson 1 explains it. Lessons marked "cards" in the path above start with it.
  - The card key: column `species_id` if the result has one, else `id`. Its values must be non-null integers, unique, and all known species ids; otherwise the page shows a table and one line saying why ("Cards need one row per animal, with its id in `id` or `species_id`"). run-queries and E2E fail a `-- show: cards` query that breaks this rule.
  - What a card shows: a lookup map built at boot (`SELECT id, common_name, scientific_name, photo_* FROM species`) supplies the title (common name), the italic scientific name, the photo and the credit. The row's other columns appear as small "column: value" lines.
  - Credit: always visible, as "Photo: {credit}, {license, linked to its deed from `LICENSE_URLS`}, via Wikimedia Commons", linking to `photo_page`.
  - No photo: a neutral placeholder that says "No photo yet".
  - Other views: the Table tab always shows the raw result, and a result of one row with one number also shows as a large count. At most 200 rows are drawn ("showing 200 of N").
- **Exercise checks:** they run in the page against today's data, so they keep working as the data grows (no stored expected rows). There are three kinds:
  - `result` compares the learner's result with the reference answer's, positionally: column names are ignored, and rows are compared as a multiset unless the exercise is `ordered`. Hints cover row count, column count, column order and row order.
  - `error` expects the learner's last statement to fail with a constraint error.
  - `schema` runs a verify query (for example on `information_schema`) whose expected rows are written in the lesson. It checks the learner's own tables, so it runs on the learner's database by design.

  **Pristine references:** right after setup (at boot and after every restart), before any learner statement, the page runs each `result` reference answer inside `BEGIN … ROLLBACK` and keeps its rows in memory for the page session. A learner's `DELETE`, `CREATE` or `DROP` can therefore never move the expected answer; a mismatch hint mentions that changed tables can cause it and offers Reset. No second database is kept, because a learner could reach it by name.

  "Show answer" reveals the reference. **"Reset database" discards the database:** `engine.restart()` (terminate the worker, boot a new `AsyncDuckDB` from the cached files, setup, references), keeping the editor text. Nothing is dropped (F6). A page reload gives the same fresh state, since the database lives in memory.
- **Limits and recovery:** `memory_limit` (§1) bounds a runaway query's memory, so it ends in an error, not a crashed tab. While a query runs, a Stop button is enabled; Stop calls `engine.restart()`, because a single-threaded worker can't be interrupted mid-query (`cancelSent` only stops streamed results between batches). A worker `error` event takes the same path and says the database was restarted. The 200-row cap bounds drawing, not execution.
- **Games:**
  - They call cookbook queries by id: `site/learn/cookbook/<id>.sql`, imported as text by esbuild, so the cookbook page, the game and E2E share one source.
  - They bind parameters (UTC date, seed) and map rows to game state with pure functions.
  - They draw with the same card component, with cards as buttons, passing species ids explicitly (no display detection).
- **Lesson prose** gives no result counts, because the data grows; the result panel shows them.

**Site:**
- **URLs:**
  - `/learn/`: the lesson path.
  - `/learn/<slug>/`: lessons.
  - `/learn/schema/` and `/learn/schema.svg`: the ERD and data dictionary.
  - `/learn/cookbook/`.
  - `/learn/playground/`: free SQL on every table, cards or table, and "Download CSV". This is the Phase 2 viewer from `plans/001-mvp.md:83`; ticking animals is deferred.
  - `/play/<demo>/`.
  - Assets under `/learn/assets/` (`duckdb-<version>/…` and a hashed `app-<hash>.js`).

  URLs use slugs, not numbers, so inserting a lesson breaks no link.
- **Build:** extend `pnpm build`; no framework.
  - **New direct dependencies (B1), exact pins.** pnpm doesn't hoist transitive packages (`node_modules/esbuild` doesn't exist today; only `.pnpm/esbuild@0.28.2`), so `import "esbuild"` would fail without them:
    - `dependencies` (what `pnpm build`, and so `deploy`, needs, like `@duckdb/node-api` today): `esbuild` `0.28.2` (the version tsx already resolves, so the store and `allowBuilds: esbuild` already cover it) and `@duckdb/duckdb-wasm` (the spike's pin).
    - `devDependencies` (only `pnpm erd`): `mermaid` (the spike's pin).
    - The page code imports nothing from `apache-arrow` directly; if it ever must, `apache-arrow` becomes a direct dependency pinned to duckdb-wasm's version.
    - A pin younger than the release-age gate gets a `minimumReleaseAgeExclude` entry, as `@duckdb/node-api` has; no `allowBuilds` change (the spike's install proves it, §1).
  - `scripts/build/template.ts` exports `fillTemplate`, extracted from `docs.ts:36-44`; the docs page uses it too.
  - `scripts/build/learn.ts` (`writeLearn`):
    - Copies the mvp and eh WASM files and workers from `node_modules/@duckdb/duckdb-wasm/dist` to `dist/learn/assets/duckdb-<version>/`, then sets each copy's mtime to the fixed date (F3), so its ETag survives deploys. `selectBundle` picks one bundle at runtime, and only that one downloads.
    - Bundles `site/learn/src/*.ts` with esbuild's JS API (bundle, ESM, minify, `[name]-[hash]` file names, `.sql` loaded as text).
    - Fills `site/learn/layout.html` with each lesson fragment `site/learn/lessons/<slug>.html`, in the order of `site/learn/lessons.json`.
    - Writes the schema and cookbook pages and checks the ERD hash.
  - Lesson SQL and exercises live in data attributes (`<pre><code data-sql="lesson">`, `data-answer`, `data-check`). That's the pattern the docs examples already use (`site/index.html:62`, read by `e2e/duckdb.spec.ts:25`).
  - The shared CSS tokens move from `site/index.html:9-12` to `site/style.css`, which both the docs and Learn link. Light or dark follows the system setting, as the docs page already does.
  - A new `site/learn/tsconfig.json` (DOM lib); `pnpm typecheck` runs both configs.
- **Editor:** a plain `<textarea>` (with a label, `spellcheck=false`, `autocapitalize=off`, monospace), a Run button, and Ctrl/Cmd+Enter. Tab leaves the editor, so focus is never trapped. No syntax highlighting in v1.
- **Accessibility and keyboard:**
  - Semantic landmarks and headings.
  - Status and a result summary ("12 rows") in an `aria-live="polite"` region.
  - Cards are a list of `<article>` elements with headings, `alt="Photo of {common name}"` and visible credits.
  - Tables are real `<table>`s with `<th scope="col">`.
  - The ERD dialog, with the text data dictionary one link away.
  - Visible focus styles and WCAG AA contrast in both themes.
  - A layout that works at 375 px; game cards are buttons, so they work by keyboard and touch.
- **Before the database loads:**
  - The page is complete static HTML: lesson text, with the SQL already editable.
  - Run is disabled and shows "Loading database: x of y MB", from DuckDB's instantiate progress.
  - On failure, it shows the error and its reason, never an endless spinner.
  - `<noscript>` explains that running SQL needs JavaScript.
  - No pre-rendered results, because they would go stale.
- **E2E** (the existing harness, serving `dist/` on 3100):
  - `learn.spec.ts`:
    - The path lists the lessons in order.
    - Every lesson's SQL runs without error, and it renders cards exactly when it starts with `-- show: cards` (card count = row count).
    - Reset and Stop: after a learner `CREATE TABLE … REFERENCES species(id)` and a `DELETE FROM species`, Reset gives the setup's row counts and no learner table; a runaway query can be stopped and the next query runs.
    - The Brazil and no-photo lessons are checked against `data/species.json`; expectations come from the data, as in `e2e/docs.spec.ts`.
    - Each exercise accepts its answer and rejects a wrong one.
    - The ERD dialog opens, a lesson can be run by keyboard alone, and pages fit 375 px.
    - No request leaves the origin except to the photo hosts. `page.route` serves photos from a fixture image and asserts the requested URLs equal the data's `photo.url`.
  - `schema.spec.ts`: ERD-to-database drift.
  - `countries.spec.ts`: the files, their shape, and every species code joining.
  - `serving.spec.ts`: `.wasm` content type and encoding.
  - B2 adds `cookbook.spec.ts` (every query) and `play.spec.ts`.
  - Artifacts as today: the HTML report and traces, plus screenshots of a lesson's cards, the no-photo state and the ERD.
- **Mission B sizing:** as one mission it's about 45–50 sessions (6 pipeline stages, about 35 implementation steps, then review, verification and release). That's too close to 60, so split it:
  - **B1 (about 32–38 sessions):**
    - The countries file end to end: ingest, derive, build, attribution, docs, E2E.
    - Engine vendoring and the app core.
    - The ERD pipeline and schema page.
    - The 16 lessons with their checks, and E2E.
  - **B2 (about 18–24 sessions, after B1 is live):**
    - The cookbook page and the playground with CSV download.
    - The demo game, and E2E for the cookbook and game.
    - Caddy cache headers, if the owner approves them.

  The A1 Steps stage writes both briefs.

#### 5. DuckDB-WASM vs PGlite: decision thresholds

DuckDB-WASM (the better of eh and mvp, under the live Caddy config) must meet these medians:

| Metric | Budget |
|---|---|
| Reliability | 0 failures in every run of every profile |
| Warm time to first result, slow-4g profile (6x CPU) | ≤ 8 s |
| Cold time to first result, school-wifi profile (4x CPU) | ≤ 40 s |
| Peak renderer memory (`VmHWM`) | ≤ 700 MB |
| Cold bytes; cold time on slow-4g | reported, no budget (paid once per device, then cached) |

**When to recommend PGlite:**
- DuckDB-WASM misses a budget even under the proposed Caddy config, **and** PGlite meets every budget, **and** PGlite is at least 1.5x better on each metric DuckDB missed.
- Or DuckDB-WASM has a hard technical limit, meaning it can't run in a target configuration, and PGlite doesn't.

If both engines miss, DuckDB-WASM stays, and §10 states what the miss costs learners and how to soften it. Smaller downloads alone never justify a switch. A switch would change `engine.ts` and the setup SQL (Postgres JSON functions instead of `unnest`), but not the standard SQL in the lessons. If the warm boot misses 8 s, first reconsider separate lesson pages (each page boots the engine), before reconsidering the engine.

#### Brief questions: answered now, or left to the spike

| Question | Answer now | The spike settles |
|---|---|---|
| Q1 Parquet in desktop browsers and on a Chromebook | expected to work: CORS and Range are proven by E2E, and parquet is built in | reliability at 4x/6x, whether throttling reaches the worker; what emulation can't prove (real Chromebook memory pressure, phones, iOS Safari: §1) |
| Q2 size, startup, memory | raw sizes in F2 | every number |
| Q3 self-hosting | WASM, workers and app: yes (npm files + esbuild, no CDN, autoinstall off). Caddy works unchanged; B1's fixed mtime keeps ETags across deploys, and cache headers and br are recommended (F3) | the extension mirror (`inet`, `spatial`), `.wasm` MIME, compressed bytes, classroom load, 304s after a rebuild |
| Q4 shell vs own editor | our own `<textarea>` editor for lessons, cookbook, game and playground, since cards, checks and games need it. The shell stays out of mission B unless the spike shows it costs almost nothing | shell embed with tables preloaded; its bytes; keyboard and phone notes |
| Q5 results → interface | cards only on `-- show: cards`; check kinds with pristine references; reset/Stop by restart; game flow (§4) | the card screenshots, restart time, the `memory_limit` error |
| Concept order | Brazil is lesson 9, after joins | — |
| ERD format and offline SVG | Mermaid; commit the SVG with a source-hash check; render with Playwright + mermaid | that the SVG renders with no `foreignObject` |
| Countries source | Natural Earth (public domain); GBIF's list only as an unpublished check | that all 107 codes and `XK` match |
| PGlite vs DuckDB | thresholds in §5 | the numbers |

**Owner choices this design already raises** (for 002 §10, each with its cost):
- Caddy `Cache-Control` and precompression: a control-room change plus the e2e copy. B1's fixed mtime already stops re-downloads after deploys (304s); these add no-revalidation caching and less CPU when a class loads at once (the spike's classroom-load number sizes the gain).
- Photos linked from Wikimedia vs critwire hosting its own copies: disk and bandwidth, against schools that block wikimedia.org.
- Publishing `/v1/countries.*` from Natural Earth: a public addition.
- The Brazil lesson as lesson 9 instead of the mockup's 04.
- Light/dark following the system vs the mockup's dark only.
- The B1/B2 split.
- One real-device check before B2's demo ships: the owner opens a lesson and the demo on an iPhone (Safari) and, if one is at hand, a Chromebook, about 15 minutes. Emulation can't prove either (§1).

### Rejected alternatives

- PGlite as the default: the owner prefers DuckDB-WASM, so PGlite wins only through §5.
- sql.js: no Parquet reader and SQLite's loose typing; only its size is assessed.
- The `coi` bundle by default: needs COOP/COEP on every page and `crossorigin` photos, and threads can't speed up 76 rows. It gets only the quick check.
- jsDelivr or any CDN for engine files: schools block CDNs, and the brief requires self-hosting.
- An import map instead of a bundler: arrow and its own bare dependencies need many map entries, which break easily on upgrades.
- A web framework: static pages plus one bundled module are enough; esbuild is needed only for the bare imports.
- The DuckDB shell as the lesson interface: a terminal can't show cards or check exercises, and works poorly with screen readers and phone keyboards.
- CodeMirror in v1: an extra dependency and bundle just for highlighting, while a textarea is fully accessible. Revisit after learner feedback.
- Rendering Mermaid in the browser: about 3 MB of JS per page for a static picture.
- mermaid-cli / puppeteer: blocked install script and no linux-arm64 Chrome (F9).
- DBML, PlantUML, D2: no pinned offline renderer here (DBML's renderer is a hosted service, PlantUML needs Java, D2 a binary). DOT through a WASM Graphviz renders in Node, but its crow's-foot source is verbose and GitHub doesn't preview it.
- One table per taxonomic rank (`classes`, `orders`, …): four tables, and a new table for every new rank. `taxa` grows by rows and teaches self-reference.
- Taxonomy as text columns on `species` (as in `db/schema.sql`): repeats class, order and family on every animal, which is the 3NF problem lesson 14 teaches.
- Integer ids for `taxa`: assigned by sort order, they would shift as the data grows. Taxon names are unique (F5).
- Photos in their own 1:0..1 table: the NULL lesson wants `photo_url IS NULL`, and cards would need one more join.
- Outside ids as rows of `species_ids (system, value)`: loses the one-UNIQUE-column-per-id example the alternate-keys lesson needs.
- The Brazil lesson early, on a ready-made joined table: shows a join's output before keys, while single-table WHERE questions are just as real.
- run-queries on the node DuckDB: a different DuckDB version and extension set from the browser's (F2).
- Numbered lesson URLs: renumbering would break links.
- Stored expected results for exercises: they break when the data grows; comparing with the reference query at check time doesn't.
- One single-page app for all lessons: a router and state management for a gain the warm-boot budget may not need (§5).
- GBIF's country enumeration as the countries source: no continent or subregion, and no stated license.
- Committing DuckDB extension binaries in mission B: no v1 lesson needs one, and A2 decides.
- Two setups (`setup.sql` with `species_countries` holding the `species` FK only, then `setup-countries.sql` dropping and recreating it with both FKs): two schemas for one product, a `DROP` in the init path, and A1 would verify a schema B doesn't ship. The single setup plus the checked labels gives the same guarantee.
- A second, pristine database (or `ATTACH ':memory:'`) for reference answers: the learner can reach it by name; references computed at boot can't be touched.
- `AsyncDuckDB.reset()` for Reset: what it keeps (registered files, connections) is undocumented, and Stop needs terminate-and-restart anyway, so one path serves both.
- Inferring cards from an `id`/`species_id` column: a number that happens to be a species id isn't an animal (`count(*) AS id`); the directive makes it explicit.
- Renaming the species key to `species_id` so cards need no directive: the brief names `id`, and `species.species_id` reads worse in the keys lesson.
- Copying the npm file's mtime to the vendored engine files: pnpm store files carry install-time mtimes, so the ETag would still change between installs.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the worktree on 2026-10-22: every cited line (`docs.ts:36-44`, `build.ts:24,28,38`, `columns.ts`, `site/index.html:9-12,62,63,93-96`, `e2e/duckdb.spec.ts:56-57`, `e2e/serving.spec.ts:31-36`, `db/schema.sql`, `sources.ts:65`, `pnpm-workspace.yaml`) reads as the findings say. Data facts in F5 recomputed from `data/species.json`: 143 taxa (3/22/50/68, no parent conflicts, genus = first word for all 76), 472 pairs over 107 codes, 591 unique (species, field) pairs, one license and one `retrieved` per source, 76 unique scientific names. Caddy 2.11.7, `ss`, `systemd-run` and `chromium-1208` are on the box. In node DuckDB 1.5.6 I reproduced F6 and found three more behaviours the design relies on without saying so (MUST-FIX 1–2, SHOULD-CONSIDER 1).

MUST-FIX:
1. **The two-database run-queries design can't declare the `species_countries → countries` FK.** §1 says DB 1 runs `setup` only and DB 2 runs `setup-countries` then `setup` "so the FK to `countries` exists", while `setup.sql` must be byte-identical in both. A `REFERENCES countries(code)` in `setup.sql` fails in DB 1 (no `countries` table), and DuckDB has no `ALTER TABLE … ADD FOREIGN KEY` (`Not implemented Error: No support for that ALTER TABLE option yet!`), so it can't be added afterwards either. Fix: `setup-countries.sql` runs *after* `setup.sql`, creates `countries`, then `DROP TABLE species_countries` and recreates it with both FKs (no other table references `species_countries`, so the drop works); `setup.sql` creates it with the `species` FK only. The ERD check (`--erd`) and the lessons from 10 on use DB 2. State this in §1 and §2.
2. **"Reset database re-runs the setup" breaks on DuckDB's FK dependencies.** `DROP TABLE taxa` fails with `Could not drop the table because this table is main key table of the table "species"`, and `DROP TABLE taxa CASCADE` fails the same way. Learner-made tables from lessons 7 and 16 that reference `species` make the order unknowable. Fix: reset means discarding the database (`AsyncDuckDB.reset()` or a new instance) and re-running setup; `setup.sql` contains no `DROP`, and `run-queries` opens a fresh database per setup rather than dropping tables.
3. **Mission B's build imports `esbuild` without declaring it.** F1 relies on esbuild being "already installed as a tsx dependency", but pnpm's strict layout doesn't hoist it (`ls node_modules` has no `esbuild`; only `node_modules/.pnpm/esbuild@0.28.2`), so `import "esbuild"` from `scripts/build/learn.ts` fails. §4 Build must say: add `esbuild` (exact pin), `@duckdb/duckdb-wasm` and `mermaid` as direct dependencies in B1. The spike's own `package.json` already does this; the repo one is the gap.

MISSED:
1. **A repo-side fix for F3 that needs no control-room change.** Caddy's ETag/Last-Modified come from mtime + size, so `writeLearn` can set the vendored engine files' mtime deterministically (for example to the npm package's own file mtime via `fs.utimes`) after `copyFile`; the hashed `app-<hash>.js` names already make the app stable. Browsers then revalidate with `If-None-Match` and get 304 instead of re-downloading 36 MB after every deploy, even before any `Cache-Control` is added. Record it as the B1 default and leave `Cache-Control`/precompression as the owner's improvement.
2. **Classroom load on the server.** With the live config, 30 students loading cold at once trigger 30 on-the-fly zstd compressions of a 36 MB file on a 2-core box. The spike should run one concurrent-load measurement (for example 10 parallel `curl --compressed` fetches, timing and `caddy` CPU) and §1 should state it, because it changes how strongly precompression is recommended.
3. **F2 misdates the pinned prerelease:** `1.33.1-dev57.0` (`latest`) was published 2026-06-22; 2026-09-29 is `1.33.1-dev65.0` (`next`). Doesn't change the design, but the pin rationale should use the right dates.
4. **Path drift from the Definition of done**, which names `spike/run-queries.ts`; the design puts it at `<spike>/scripts/run-queries.ts`. Either move it or add the mapping to the plan so Verification finds it.

SHOULD-CONSIDER:
1. Don't rely on "the last statement's result is the block's result": node DuckDB returns the *first* result for `SELECT 1; SELECT 2`, and duckdb-wasm's `conn.query` behaviour is unverified. Always split blocks on top-level `;` (outside string literals and comments) and run statements one at a time; it also makes `-- expect: error` attributable to a statement.
2. Measure with Playwright's full Chromium (`channel: "chromium"`, new headless) rather than the default `chromium_headless_shell`: it's closer to a real Chromebook's Chrome and avoids CDP domains (`SystemInfo`) that the shell may lack.
3. Add to §1's "what only real hardware proves": phones and iOS Safari (WASM memory limits, `eh` support), since §7 promises the demo works on a phone and the spike only checks a 375 px viewport.
4. `species.genus → taxa.name` can't enforce that the referenced row is a genus (a CHECK can't look across rows); say so in lesson 7 or 12 rather than letting learners assume the FK does it.
5. `sql.js` and `coi` are already minimal; keep the rate-limiting proxy fallback in §1 out of the first run and add it only if check (b) actually fails, so the harness stays simple.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Setup dependency conflict (§1–2).** Identical setup cannot create `species_countries → countries` in both databases when DB 1 lacks `countries`. Define one consistent schema initialization sequence; distinguish draft data from published data without changing required table availability.
2. **Reset lacks database isolation (§4).** Re-running setup cannot reliably restore tables after learner DDL, including new foreign-key dependencies. Reset must discard the database and initialize a fresh instance. Exercise reference queries also need pristine state so learner mutations cannot change the expected answer.
3. **Card detection can misrepresent results (§4).** A unique `id` containing valid species numbers does not establish species identity: `SELECT COUNT(*) AS id FROM species` could display an unrelated animal. Require explicit species-result metadata or an intentional `species_id` convention; default arbitrary results to tables.

SHOULD-CONSIDER:
1. Define query cancellation, execution limits and worker recovery; limiting displayed rows does not bound query memory or execution.
2. Taxon names being unique today does not establish a durable natural key. Define collision handling before expanding taxonomy.
3. Specify how countries attribution joins the existing species-based attribution pipeline, including what its `records` count means.
4. Separate viewport checks from actual mobile browser compatibility; Chromium alone cannot validate Safari/WASM behavior.

## Revision notes

2026-10-22, architect. DuckDB facts the fixes rely on were rechecked in node DuckDB 1.5.6 (now in F6); WASM rechecks are marked (S).

MUST-FIX:
- **Fable 1 / Astra 1 (setup and the `countries` FK):** went past Fable's drop-and-recreate to one `setup.sql` that always builds `countries` before `species_countries`, with both FKs. The spike, the runner, the pages and E2E all run it, and only the file behind `/v1/countries.parquet` changes (draft in A1, published in B). One database, every block in `BEGIN … ROLLBACK`. `draft-table` vs `ran` is no longer a matter of which tables exist: run-queries checks the labels with `getTableNames` (which expands views) plus a word test for `CREATE` statements. §1 (Page code, run-queries "One database" and "Labels"), §2 "How it's built", F6. Fable's variant is under Rejected alternatives.
- **Fable 2 / Astra 2 (reset and pristine references):** Reset, Stop and a worker crash all go through `engine.restart()`: terminate the worker, start a new `AsyncDuckDB`, run setup. `setup.sql` has no `DROP`. Reference answers run right after setup, inside `BEGIN … ROLLBACK`, and stay in memory, so learner changes can't move them. run-queries isolates blocks by rollback. See §1 Page code, §2, §4 "Exercise checks", and the E2E Reset/Stop test.
- **Fable 3 (direct dependencies):** §4 Build adds exact pins: `esbuild` `0.28.2` and `@duckdb/duckdb-wasm` in `dependencies`, `mermaid` in `devDependencies`, a gate exclude only where a pin needs one, and no `allowBuilds` change (the spike's install proves this). F1 updated.
- **Astra 3 (card detection):** cards appear only when the SQL starts with `-- show: cards`; the key is `species_id`, else `id`, and is validated. Anything else, including `count(*) AS id`, shows as a table. run-queries and E2E fail a cards query that breaks the rule. See §4 Cards, the run-queries `-- show` header and lesson 1.

Other items:
- Fable MISSED 1 (fixed mtime): adopted as the B1 default with a constant date, not the npm file's mtime, because pnpm store mtimes are install-time (checked). The spike tests "warm after rebuild". F3, §1, §4 Build.
- Fable MISSED 2 (classroom load): adopted, 10 parallel fetches under both Caddyfiles, recording Caddy CPU. §1 Serving, §10.
- Fable MISSED 3 (dates): fixed in F2 (dev57.0 on 2026-06-22, `next` dev65.0 on 2026-09-29; checked on npm).
- Fable MISSED 4 (path): mapping added under the run-queries contract.
- Fable SC1 (split statements): adopted. `splitStatements` in `src/sql.ts` is shared by the page and the runner, and only the last statement may carry `expect: error`. §1.
- Fable SC2 (full Chromium): adopted, `channel: "chromium"`. §1 Pins.
- Fable SC3 / Astra SC4 (real devices): §1 "What emulation can't prove", the Q1 row, and an owner real-device check in §10.
- Fable SC4 (genus FK can't check rank): §2 "Limits the lessons state", lesson 12.
- Fable SC5 (proxy fallback): it was already conditional; the text now says "Only if".
- Astra SC1 (cancellation, limits, recovery): adopted. `memory_limit`, Stop = restart (a single-threaded worker can't be interrupted), and a worker error takes the same path. §1, §4 "Limits and recovery", spike runaway-query case.
- Astra SC2 (taxon collisions): B's derive refuses a name at two ranks or under two parents, so a collision fails at build time, not in learners' browsers. §2.
- Astra SC3 (countries attribution): its own source block in `countries.json`, file-qualified `fields`, `records` = country rows, the unused-source check extended, and the docs line says "N countries". §2 Credit.

## Steps

Planner, 2026-10-22. Conventions:
- `W=/srv/critter-ai/worktrees/critwire-learn-design`, `M=/srv/critter-ai/agent-state/missions/critwire-learn-design`, `SP=$M/spike`, `P=plans/002-learn.md`. The spike lives only in `$SP` and is never committed. Every command a step adds goes, in order, into `$SP/README.md`.
- One step per session: commit the plan (and any `plans/` file) with the check-off and one Log line, then push.
- **Guard** (every step): `git -C $W diff --name-only origin/main...HEAD | grep -v '^plans/'` prints nothing, and `pnpm typecheck && pnpm test` pass. The repo has no lint script (Baseline), so `pnpm typecheck` is the static check.
- **Spike green:** `pnpm -C $SP typecheck` (from S1) and `pnpm -C $SP test` (from S2, when the first tests exist).
  - `typecheck` runs `tsc --noEmit` on `tsconfig.json` (scripts, Node types) and `src/tsconfig.json` (DOM lib).
  - `test` is `node --test test/*.test.ts`. It holds only the Failure-mode tests, written first and seen failing; put the red count in the Log.
- **Browser runs:** the spike's `playwright` 1.58.2, `channel: "chromium"`, headless, always through `scripts/browser.ts`: one launcher that starts `serve.ts` and installs the route guard (allows `127.0.0.1:3102`, `thumb.wikimedia.org`, `upload.wikimedia.org`; aborted requests go into `blocked`).
  - Never while `pnpm e2e` runs. Heavy runs one at a time.
  - Long runs: one engine × profile per command, Bash timeout 1800000, or `run_in_background`.
- **Run output:** `$SP/out/<run>/` holds `summary.md`, `env.txt` and, for browser runs, `results.json` (with `blocked`: array, `failures`: number), screenshots and `caddy-access.log`.
- **Downloads:** each into its own new `$SP/downloads/<name>/`, read by path from `$SP/scripts/`. Record URL, release and sha256 in `$SP/downloads/SOURCES.md`.
- **002 conventions** (Verification greps them):
  - sections `## 1. Engine and interface` … `## 10. For the owner`, numbered and titled as in the brief;
  - lessons `### Lesson <n> · <slug>`, each with a `**Shown as:**` and a `**Check:**` line;
  - cookbook entries `### c<nn> · <title>`, each with a `**Game use:**` line;
  - q-ids: `setup`, `setup-counts`; `l<nn>` and `l<nn>-<word>` lesson queries; `l<nn>-ex` the exercise answer; `c<nn>` cookbook; `k<nn>` countries file; `d<nn>` demo extras;
  - result blocks are written only by `run-queries --update`; read the diff before committing;
  - ages 16+ and new to SQL; no result counts in prose; no Wikipedia prose; no IUCN data (only `iucn_id`); countries are "recorded there in open records", never native range.
- **Decisions:** every pin, the countries layer and field choices, the throttle method, the engine pick and the brief paths, each with its reason.
- **Contingencies:**
  - S9 picks PGlite, or finds a DuckDB-WASM hard limit (§5): insert steps before S12 that port `engine.ts`, the setup and run-queries to it (lesson SQL unchanged); use the planner if that's more than two steps.
  - No duckdb-wasm build meets S1's pin rule: pin the newest tagged-release build outside the gate, and S10 records the extension gap for A2.
  - A species code Natural Earth can't match: add the narrowest rule on Natural Earth's own fields that matches it and record it. Never invent a row.
  - A step outgrows its session: split it per the mission rules; the first part is done and checked.

- [x] S1 · Spike scaffold: pins, install, serving, vendored engine files (§1 Pins, Serving; F2, F3).
  - Pins:
    - `npm view @duckdb/duckdb-wasm time --json`: candidates 1.32.0 and the newest dev build outside pnpm's release-age gate. For each, the DuckDB version and source hash from the wasm (`strings duckdb-eh.wasm | grep -E '^v1\.[0-9]+\.[0-9]+'`), and `curl -sI https://extensions.duckdb.org/<ver>/wasm_{eh,mvp}/{inet,spatial}.duckdb_extension.wasm`. Pick by §1's rule; `@duckdb/duckdb-wasm-shell` at the same version.
    - `@electric-sql/pglite` and `mermaid`: newest outside the gate. `sql.js` 1.15.1, `esbuild` 0.28.2, `playwright` 1.58.2, `typescript` (the repo's resolved version) + `@types/node`, `@duckdb/node-api` 1.5.6-r.2 (with the repo's gate excludes).
  - `$SP/package.json` (exact pins; scripts `typecheck`, `test`), `pnpm-workspace.yaml` (`allowBuilds: esbuild` only; a gate exclude only where a pin needs one), `pnpm install`. Any "ignored build scripts" line goes under Decisions: B1 adds duckdb-wasm and mermaid to the repo.
  - `Caddyfile`, `Caddyfile.proposed` (§1 layout), `scripts/serve.ts`, `scripts/browser.ts` (no page yet).
  - `scripts/build-site.ts`:
    - `site/v1/` = a copy of `baseline/live/v1/`;
    - mvp + eh `.wasm` files and workers into `site/learn/assets/duckdb-<ver>/`, PGlite and sql.js files into `pglite-<ver>/` and `sqljs-<ver>/`; every copy's mtime set to 2000-01-01T00:00:00Z (F3);
    - esbuild bundles every `src/*-page.ts` (ESM, `.sql` loaded as text) into `site/learn/assets/`;
    - `--precompress` writes `.br`, `.zst`, `.gz` beside the vendored files (used in S9).
  - Checks:
    - Guard; spike green;
    - under `serve.ts`, `curl -sI …/duckdb-eh.wasm` shows `content-type: application/wasm`;
    - the ETag of `duckdb-eh.wasm` is the same before and after a second `build-site.ts`;
    - `out/bytes/summary.md`: per vendored asset, its file size and `curl -s -o /dev/null -w '%{size_download}'` bytes with `Accept-Encoding` identity, gzip, zstd and br, under `Caddyfile`;
    - `serve.ts` exits non-zero naming the port when something listens on 3102, and when something listens on 3100 (`node -e "require('net').createServer().listen(3100,'127.0.0.1')" &`, killed after);
    - no spike Caddy left running (`pgrep -f "$SP/Caddyfile"` is empty).

- [x] S2 · Engine boot, both bundles, self-hosted (§1 Page code; Q1, first half). Deviations (Decisions, S2): parquet loads from our own extension mirror (not linked); `species.parquet` is read whole (no 206); json not loaded.
  - Tests first, red: SQ1–SQ7 in `test/sql.test.ts`.
  - `src/sql.ts`: `splitStatements`, pure.
  - `src/engine.ts`:
    - `boot`, `restart`, `runScript`, timing marks;
    - manual mvp and eh bundles from self-hosted URLs; `?bundle=eh|mvp` forces one, otherwise `selectBundle`;
    - settings: autoinstall and autoload off, `memory_limit` 512 MB;
    - registers `species.parquet` and `countries.parquet` with `registerFileURL` on `location.origin`; the setup text is optional until S4.
  - `src/runner-page.ts` + `runner.html`: exposes `window.runScript`, `window.tableNames` and `window.engineInfo`.
  - `scripts/boot-check.ts`, per bundle, → `out/boot/`: `SELECT version()`, `SELECT count(*) FROM read_parquet('species.parquet')`, the loaded rows of `duckdb_extensions()`, and `LOAD spatial`.
  - Checks:
    - Guard; spike green (SQ tests now pass);
    - both bundles: count 76; `version()` matches S1's string (otherwise re-pin per S1 and record); parquet and json loaded; `LOAD spatial` errors without any request; `blocked` empty;
    - the Caddy log shows `206` range reads of `species.parquet`;
    - `runScript('SELECT 1; SELECT 2')` returns 2, and an error in statement 2 of 3 says "statement 2".

- [x] S3 · Draft countries table from Natural Earth (§2 Countries source; F7; brief §6 research). Deviations (Decisions, S3): two narrow matching rules added (fold by ADM0_A3 = ISO_A3_EH; drop Overlay units); the CLI writes `$SP/draft/v1/`, which `build-site.ts` copies into `site/v1/`.
  - Downloads:
    - Natural Earth admin-0 `countries` and `map_units` attributes from one pinned release of `nvkelso/natural-earth-vector`, at the scale whose map units include GF, MQ and RE, into `downloads/naturalearth-<ver>/`;
    - `https://api.gbif.org/v1/enumeration/country` into `downloads/gbif-enum/`.
  - `out/countries-sources.md`: each source's license or terms quoted verbatim, with URL, release and retrieval date. GBIF's enumeration has no stated license, so it's a cross-check only.
  - Tests first, red: CD1–CD11 in `test/countries-draft.test.ts`, on small fixture GeoJSONs in `test/fixtures/`.
  - `scripts/countries-draft.ts` (pure matcher + thin CLI) writes:
    - `site/v1/countries.parquet` via `@duckdb/node-api`, columns `code, name, continent, region, subregion`;
    - `site/v1/countries.json` (feeds PGlite only);
    - `out/countries-match.md`: each of the 107 codes plus XK with its layer, field and name, and the GBIF differences.
  - Checks:
    - Guard; spike green; the CLI exits 0;
    - every code in `data/species.json` is in the draft;
    - FR, NO and XK come through `ISO_A2_EH`; GF, MQ and RE come from `map_units`;
    - `NA` is the string `"NA"` (Namibia) in both the JSON and the Parquet;
    - a fixture with one code removed fails, naming it.
  - The name field (`NAME_EN` or `NAME_LONG`) and the scale go under Decisions.

- [x] S4 · Learners' schema v1 in the browser; F6 in WASM; restart and the memory limit (§2; F6). Deviations (Decisions, S4): runaway split in two (learner's cross join fails in malloc, not memory_limit; a hash aggregate shows memory_limit); `getTableNames` of CTAS reports its source; `taxa` adds a rank/parent CHECK.
  - `src/setup.sql` per §2: `taxa` one INSERT per rank, top down → `species` → `sources` → `species_sources` → `countries` → `species_countries` → view `species_taxonomy`. Standard types and constraints; no `DROP`. `engine.ts` runs it at boot and in `restart()`.
  - `scripts/schema-check.ts` → `out/schema/`:
    - counts: `taxa` 143 (3 classes, 22 orders, 50 families, 68 genera), `species` 76, `species_countries` 472, `sources` 5, `species_sources` 591, `countries` = the draft's rows, `species_taxonomy` 76;
    - F6 again in WASM, each case pass/fail with its error text in `out/schema/f6-wasm.md`: a self-referencing multi-row INSERT fails; `ALTER TABLE … ADD FOREIGN KEY` isn't implemented; `DROP TABLE species` fails while a child exists; `BEGIN; CREATE TABLE … REFERENCES species(id); INSERT …; <failing INSERT>; ROLLBACK` leaves `information_schema.tables` unchanged; what raw `conn.query('SELECT 1; SELECT 2')` returns; `getTableNames` expands a view over `countries`, ignores literals and returns `[]` for `CREATE`;
    - restart: after `CREATE TABLE t (id INTEGER REFERENCES species(id))` and `DELETE FROM species_countries`, `restart()` gives the setup counts and no `t`; record its time;
    - runaway: §1's cross join ends in DuckDB's out-of-memory error, the worker survives, and `SELECT 1` runs next. If the tab crashes instead, lower `memory_limit` and record it;
    - fails loudly: setup against a copy of the draft Parquet without `BR` fails with an FK error.
  - Checks: Guard; spike green; `schema-check.ts` exits 0; `blocked` empty.

- [x] S5 · Card page: the mockup as lesson 9, cards with credits, the no-photo state, one exercise (§1 Card page; §4 Cards, Exercise checks; Q5). Deviations (Decisions, S5): `DELETE FROM species` is refused (FK), so the pristine-reference check deletes India's `species_countries` rows; cards hide columns they already show; renderers return HTML strings.
  - Tests first, red: CR1–CR12 in `test/cards.test.ts`, CK1–CK11 in `test/check.test.ts`.
  - `src/cards.ts`: the card rule (pure) and rendering. License deeds come from the repo's `scripts/build/sources.ts` `LICENSE_URLS`, imported by path, never copied.
  - `src/check.ts`: the compare (pure); `result`, `error` and `schema` kinds; pristine references computed right after setup inside `BEGIN … ROLLBACK`.
  - `src/card-page.ts` + `card.html`: "CRITWIRE LEARN · LESSON 09" label, "Beginner SQL" badge, question, concept line, labelled `<textarea>` with the Brazil join (`-- show: cards`), Run and Ctrl/Cmd+Enter, Cards and Table tabs, an `aria-live` status, Reset, Stop, one exercise with Check and Show answer, a Schema button.
  - `scripts/card-check.ts` → `out/card-page/`:
    - Brazil: card count = row count = the species with `BR` in `data/species.json`. Each card has a heading, the italic scientific name, `alt="Photo of …"`, a visible credit whose license link equals `LICENSE_URLS[license]`, and a link to `photo_page`;
    - ids 19 and 47: two "No photo yet" placeholders, no `<img>`;
    - `SELECT count(*) AS id FROM species` without the directive shows a table; `-- show: cards` with `SELECT 999 AS id` shows a table and the reason line;
    - the exercise accepts its answer and rejects a wrong one. After `DELETE FROM species` the answer still checks against the pristine reference, and Reset restores the setup counts;
    - keyboard only: Tab reaches the editor, Ctrl+Enter runs, Tab leaves the editor;
    - screenshots at 1280 px, at 375 px (`scrollWidth <= innerWidth`), and of the no-photo state;
    - `blocked` empty.
  - Checks: Guard; spike green; `card-check.ts` exits 0; look at the screenshots (Read tool) next to `vision.png`.

- [x] S6 · Measurement harness, validated, plus a smoke run (§1 Measurement harness; MS1–MS9). Deviations (Decisions, S6): no route guard while measuring (it disables the HTTP cache): own Chromium over CDP with a real profile dir and `--host-resolver-rules`; CPU throttling by CPUQuota (CDP doesn't reach the worker); browser-side bytes from Resource Timing `encodedBodySize`; one wasm hook file for worker and page.
  - MS1–MS9 are run-time assertions in `measure.ts`; write them before the measuring code.
  - `scripts/measure.ts` (`--engine duckdb-eh|duckdb-mvp|pglite|coi --profile desktop|school-wifi|slow-4g --runs N --config live|proposed --out <dir>`, plus `--validate` and `--smoke`), `src/measure-worker.js` (wraps `WebAssembly.instantiate*`, then `importScripts` the DuckDB worker), and a page init script for PGlite.
    - Cold = a new browser and context; warm = a reload in the same context.
    - Metrics per §1: wire bytes and encodings from the Caddy log (CDP `encodedDataLength` as a cross-check), uncompressed sizes, the marks `nav → engine → setup → query → cards` (+ `restart`), photo time separately, renderer `VmHWM` (`SystemInfo.getProcessInfo` + `/proc/<pid>/status`), JS heap (`Performance.getMetrics`), WASM `memory.buffer.byteLength`.
    - `results.json` per run and `summary.md` (median and max per cell); the first run of each profile is screenshotted.
  - `--validate` → `out/throttle-validation/`:
    - (a) a Worker busy loop at CPU rate 1 and 4. If the ratio is under 2.5, every throttled profile of every engine uses `systemd-run --user --scope -p CPUQuota=<100/rate>%` instead;
    - (b) the worker's `.wasm` download time is within ±30 % of bytes ÷ throughput. Only if it isn't, add the rate-limiting proxy;
    - the method used goes under Decisions.
  - `--smoke`: desktop, duckdb-eh, live config, cold + warm, one run each; 12 Brazil cards, `failures` 0, `blocked` empty. Verification re-runs it.
  - Checks: Guard; spike green; `--validate` and `--smoke` exit 0; the smoke's wire bytes for `duckdb-eh.wasm` are within 1 % of S1's zstd count.

- [x] S7 · DuckDB-WASM matrix under the live Caddy config (Q1, Q2; §5). Deviations (Decisions, S7): extras run in all 5 runs, not once; throttled cells re-run after an MS2 fix (Chromium left the CPUQuota scope); budgets computed by `measure.ts`, interpretation in `notes.md`.
  - duckdb-eh and duckdb-mvp × desktop, school-wifi, slow-4g × cold, warm, 5 runs each → `out/duckdb-live/`.
  - duckdb-eh extras per profile:
    - warm after rebuild: re-run `build-site.ts`, then reload; the engine files come back 304 or from cache, with the same ETag;
    - restart time;
    - the runaway query: an error, and the worker is alive after it.
  - `summary.md`: median and max per cell, §5's budgets met or missed per bundle, the better bundle, the throttled screenshots, and what the peak `VmHWM` means for a 4 GB Chromebook.
  - Checks: Guard; 5 runs in every cell; `blocked` empty in every `results.json`. A reliability failure is a result: keep its error and count it, never re-run it away.

- [x] S8 · PGlite and sql.js measured (§1 PGlite, sql.js). Deviations (Decisions, S8): main-thread blocking by a 10 ms interval probe (longtask observer reported 0); MS3 checks the `.wasm`'s concurrent download batch; parity also checks columns.
  - `src/setup-pglite.sql` builds the same tables from `/v1/species.json` and the draft `/v1/countries.json` with `jsonb_array_elements`. `src/pglite-page.ts` + `pglite.html`: the same marks, the Brazil join, no cards, main thread, total long-task time via `PerformanceObserver`.
  - In the page, before measuring: the table counts equal S4's, and the Brazil join returns the same ids as DuckDB's.
  - pglite × 3 profiles × cold, warm × 5 → `out/pglite-live/`.
  - `out/sqljs/summary.md`: bytes from S1's table, and the assessment paragraph (no Parquet reader, SQLite's loose typing).
  - Checks: Guard; spike green; counts and ids equal; `blocked` empty.

- [x] S9 · Proposed Caddy config, classroom load, coi gate; the engine decision (§1 Serving, coi gate; §5; F3). Deviations (Decisions, S9): coi can't read Parquet (hard limit), so no coi matrix; `Caddyfile.proposed` adds COEP on `/learn/assets/*` (worker scripts); the 4× coi run wraps the whole check in one CPUQuota scope; `bytes.ts` writes both configs into `out/bytes/`.
  - `build-site.ts --precompress`, then duckdb-eh × 3 profiles × cold, warm × 5 under `Caddyfile.proposed` → `out/duckdb-proposed/`. Add the proposed config's bytes to `out/bytes/summary.md`.
  - Classroom → `out/classroom/`: 10 parallel `curl -s -H 'Accept-Encoding: zstd' -o /dev/null` of `duckdb-eh.wasm` under each Caddyfile; wall time, and Caddy's `utime + stime` from `/proc/<pid>/stat` before and after.
  - coi → `out/coi/`: the `/coi/` page at desktop and at 4x under `Caddyfile.proposed`; `crossOriginIsolated === true`; photos load with `crossorigin`. The full matrix runs only if its median time to first result is at least 30 % below eh's.
  - The engine decision: apply §5 to S7–S9 and record the verdict, with the numbers side by side, under Decisions. Anything but DuckDB-WASM: Contingencies.
  - Checks: Guard; spike green; `blocked` empty; classroom numbers for both configs.

- [x] S10 · Self-hosted extension mirror; Firefox check (Q3; §1 Extension mirror). Deviations (Decisions, S10): a tampered-signature case added; boot-check's missing-extension probe is now `LOAD fts` (spatial is mirrored); Firefox not run (GTK libs need apt).
  - Download `inet` and `spatial` for `wasm_eh` and `wasm_mvp` at the pin's DuckDB version into `downloads/duckdb-ext-<ver>/`; copy them to `site/learn/assets/duckdb-ext/<ver>/<platform>/<name>.duckdb_extension.wasm`.
  - A runner mode runs, on both bundles with signature checks on: `SET custom_extension_repository = '<origin>/learn/assets/duckdb-ext'; INSTALL spatial; LOAD spatial; SELECT ST_AsText(ST_Point(1, 2));`, and the same for `inet`.
  - → `out/ext-mirror/`: the result `POINT (1 2)`, `blocked` empty, compressed bytes, the `.duckdb_extension.wasm` content type, and what Caddy needs. If no binaries exist for the version, record that for A2 and check off.
  - Firefox: `pnpm -C $SP exec playwright install firefox` (no apt, no sudo). If it installs, run `card-check.ts` in it → `out/firefox/`; otherwise record why. WebKit needs apt: out of scope, say so.
  - Checks: Guard; spike green; the outputs above exist.

- [x] S11 · DuckDB shell embed, time-boxed to this session (Q4; §1 Shell). Deviations (Decisions, S11): extra runs (DOM renderer, URL-hash query, broken WebGL, busy typing); output checked by a side-channel table under WebGL (text is on a canvas); `xterm` 5.3.0 pinned in the spike for its CSS.
  - `src/shell-page.ts` + `shell.html`: `embed({ shellModule, container, resolveDatabase: () => db })` on the database after setup.
  - `scripts/shell-check.ts` → `out/shell/`: types `SELECT count(*) FROM species;` through `page.keyboard`, takes a screenshot, records the shell's bytes from the Caddy log, and notes on screen readers and phone keyboards.
  - If it doesn't work within the session, `out/shell/summary.md` says why. Check off either way.
  - Checks: Guard; spike green; `blocked` empty.

- [x] S12 · run-queries, and 002's skeleton with §2 (§1 run-queries contract; §2). Deviations (Decisions, S12): 26 fixture plans (RQ13/17/18/19 split pass/fail; RQ20 hash, RQ22–24 in test code); RQ14 deletes `species_countries` (species delete is FK-refused); a failed ROLLBACK is handled (fatal) but not fixtured; `setup-counts` is one row and `draft-table`.
  - Fixtures first, red: one plan per RQ1–RQ24 in `test/fixtures/run-queries/`, each with its expected exit code and message; `test/run-queries.test.ts` spawns the script on each.
  - `scripts/run-queries.ts` per the contract (`--check` default, `--update`; `--erd` comes in S13). It reuses `browser.ts`, `engine.ts`, `sql.ts` and `cards.ts`; per-block timeout 60 s, boot 120 s; writes `$M/queries.log`.
  - Create `$P`: title, one paragraph on what it is, the ten section headings. Write §2 in full:
    - the tables: columns, PK, FK and UK, and what each is built from;
    - naming; build order and why (F6); no `DROP`, a fresh database only by restart;
    - the limits lessons state; what v1 leaves out; room to grow;
    - the `setup` block (= `src/setup.sql`) and `setup-counts` with its result.
  - Checks:
    - Guard; spike green (the RQ fixtures pass);
    - `node $SP/scripts/run-queries.ts $W/$P --update`, then `--check`, exits 0;
    - a second `--update` leaves `git diff --exit-code $P` clean;
    - the first line of `queries.log` names the engine, bundle and DuckDB version.

- [x] S13 · ERD: Mermaid source, offline SVG, drift check, 002 §3 (§3; F9). Deviations (Decisions, S13): RQE tests are pure on a hand-made catalog plus two run-queries runs on the real database; RQE4 also checks the one end against FK nullability, and the parser refuses many-to-many and one-to-one lines; ER3 provoked by a `themeCSS` background image; `erd.ts` already adds `data-source-sha256` and `width`/`height`.
  - Fixtures first, red: ER1–ER4 and RQE1–RQE5.
  - `plans/002-learn-erd.mmd`: the six tables with types, `PK`/`FK`/`UK` markers and attribute comments, and §3's relationships.
  - `scripts/erd.ts` (mermaid's browser bundle in a Playwright page, `htmlLabels: false`, route guard) → `$SP/erd/schema.svg` and `schema.png`. `run-queries --erd`.
  - 002 §3:
    - the ```` ```mermaid ```` block (= the `.mmd`), and the view listed beside it;
    - why Mermaid, against DBML, PlantUML, D2 and DOT;
    - how the site shows it: the dialog from every lesson, and `/learn/schema/` with the text data dictionary;
    - mission B's `pnpm erd`, the `data-source-sha256` attribute, the build's stale refusal, and why not mermaid-cli (F9).
  - Checks: Guard; spike green; `erd.ts` exits 0 with no `<foreignObject>`; `run-queries $W/$P --check --erd $W/plans/002-learn-erd.mmd` exits 0; look at the PNG (Read tool): crow's feet and keys are readable.

- [x] S14 · 002 §1 Engine and interface (Q1–Q5; §5). Deviations (Decisions, S14): a result-cap probe added (`cap-check.ts`, runner `streamCapped`), since S4/S7 left the cap unproven; references for the whole path at each setup (one engine start per visit).
  - Numbers come only from `$SP/out/*/summary.md`, each citing its run folder.
  - Q1: reliability per bundle and profile; what emulation proves and what only real hardware would (Chromebook memory pressure, ChromeOS, Android, iOS Safari).
  - Q2: bytes, times and memory for eh, mvp and PGlite side by side; sql.js size and paragraph; coi's quick numbers.
  - Q3: self-hosting; the extension mirror; Caddy needs as a control-room change (cache headers, precompression with the classroom numbers, the fixed-mtime default).
  - Q4: shell embed vs our own editor, with S11's evidence.
  - Q5: results to cards (the rule), the three check kinds and pristine references, Reset and Stop, how a game reads results; the card screenshots' paths; the small pieces of engine and card code the design needs to show.
  - The recommendation, per §5.
  - Checks: Guard; `run-queries $W/$P --check --erd $W/plans/002-learn-erd.mmd` exits 0.

- [x] S15 · 002 §4 lessons 1–8 (tables to one-to-many). Deviations (Decisions, S15): DATE/TIMESTAMP cells were epoch ms → `engine.ts` converts them (RQ25 first); lesson 3 asks the frog question by name (`LIKE`), lesson 8 answers it by order Anura.
  - A short intro to the path: who it's for, how a lesson page works, the `-- show: cards` directive.
  - Each lesson: concept and question; a plain explanation with every term explained; the SQL (`l<nn>`…) and its result block; `**Shown as:**`; "Your turn" with the `l<nn>-ex` answer and its result; `**Check:**` (`result`, ordered or not; `error`; or `schema` with its verify query and expected rows).
  - Lesson 4 shows the no-photo state (ids 19, 47) and `range_status`. Lesson 6 reads the ERD and `information_schema.columns`. Lesson 7's exercise is an `error` check (`-- expect: error`).
  - Checks: Guard; `--update`, read the diff, then `--check --erd` exits 0; lessons 1–8 each have `l<nn>-ex`, `**Shown as:**` and `**Check:**`; `-- show: cards` appears exactly in the lessons §4's path marks as cards.

- [x] S16 · 002 §4 lessons 9–16, and where advanced lessons attach. Deviations (Decisions, S16): lesson 16's ERD lines sit in a `text` fence (RQE5: one `mermaid` block); its schema check's verify query is `l16-ex`'s last statement, expected rows listed in full; §2's `species_traits` drops `unit` (3NF).
  - 9: the mockup's Brazil question as a junction-table join (`ON sc.species_id = s.id`), with the "open records, not native range" note (Tiger, Chimpanzee, African Wild Dog).
  - 10: the countries lookup (`draft-table`).
  - 11: LEFT JOIN; the four animals with no country records, and why.
  - 12: the hierarchy as a self-join; what the genus FK can't check.
  - 13: views. 14: normalization in plain words (1NF, 2NF, 3NF), with the DuckDB-labelled `unnest` from `species.parquet`. 15: sources and licenses, share-alike photos.
  - 16: designing `species_traits`: a `schema` check on `information_schema` and `duckdb_constraints()`, plus the ERD lines it adds.
  - Closing note: where A2's spatial and raster lessons attach, after lesson 16, and which tables they join on.
  - Checks: as S15, for lessons 9–16; 16 lessons in total.

- [x] S17 · 002 §5 cookbook c01–c13. Deviations (Decisions, S17): one shuffle key `(id * 619 + seed * 211) % 1009` for every seeded pick; multi-value params bound once in a `WITH p` CTE with `CAST`.
  - Intro: parameters (`?` through `-- params`), determinism (arithmetic on ids, date and seed as parameters, never `random()`), how a game loads `<id>.sql`.
  - Includes the brief's eight: animal of the day (date parameter); a quiz with wrong answers from the same class; animals you could meet in country X; animals that share a country; family trees (`taxa`, `species_taxonomy`); odd one out; countries with the most animals; a seeded team of 5 with no two from the same family.
  - Checks: Guard; `--update`, read the diff, then `--check --erd` exits 0; every `c<nn>` has `**Game use:**`.

- [x] S18 · 002 §5 cookbook c14 onward, at least 25 in total. Deviations (Decisions, S18): 13 entries (c14–c26), not 12; collection progress takes ids as one comma-separated text param (DuckDB list functions, labelled).
  - More game and app queries in the same format (for example higher or lower on country counts, guess the class, memory pairs from one family, the photo-license mix, countries per continent as `draft-table`).
  - Checks: as S17; at least 25 `c<nn>` blocks.

- [x] S19 · 002 §6 the countries file. Deviations (Decisions, S19): derive module named `scripts/derive/naturalearth.ts` (existing `countries.ts` is the GBIF rule); snapshot cut to the 10 fields the rule reads; no Postgres `countries` table; CSV note covers R too.
  - From `out/countries-sources.md` and `out/countries-match.md`:
    - fields and types;
    - Natural Earth vs GBIF, with the verbatim license quotes and whether each can be hosted;
    - the ingest: `pnpm ingest naturalearth`, a snapshot of attributes only with `retrieved`, and derive's refusal of an unmatched code;
    - the matching rule and the table of the 107 codes (code, layer, field, name), XK noted;
    - credit: §2's attribution entry and the docs line;
    - the `/v1` rule: a new file; existing files keep their bytes (the Baseline hashes are the evidence);
    - the `NA` CSV note; B1 relabels `draft-table` blocks `ran`.
  - `k01`: every species code joins `countries` (`draft-table`; 0 unmatched).
  - Checks: Guard; `--check --erd` exits 0; the match table has 107 code rows.

- [x] S20 · 002 §7 demo and §8 site. Deviations (Decisions, S20): one extra block `d01` (the day's ten); a §8 "Serving" subsection (Q3 promised the `/v1` no-cache note there); SQL lives once in `site/learn/sql/<q-id>.sql`; `answers.ts` imports the 16 answers by name.
  - §7: two or three game ideas on the cards; the pick with its rules, its queries by cookbook id (extra `d<nn>` blocks if needed, run), the round flow, the phone layout (375 px, cards as buttons, touch and keyboard), what it shows before the database loads.
  - §8: URLs; the build (`fillTemplate` extraction, `writeLearn`, the esbuild bundle, fixed mtime, direct dependencies with the pins from Decisions, `site/learn/tsconfig.json`, `site/style.css`); the editor; accessibility and keyboard; before the database loads; the Phase 2 viewer folded into `/learn/playground/`; the E2E plan on the local-Caddy harness (§4's specs and artifacts).
  - Checks: Guard; `--check --erd` exits 0; every cookbook id §7 names exists in §5.

- [x] S21 · Mission B briefs, and 002 §9. Deviations (Decisions, S21): each brief's Definition of done compares only the existing `/v1` files with a Baseline taken from `origin/main` at that mission's start (not A1's list); B1 also relabels 002's `draft-table` blocks with the spike's runner.
  - `plans/briefs/critwire-learn-b1.md` and `plans/briefs/critwire-learn-b2.md`, in the ops brief format (`## Goal`, `## Why`, `## Scope`, `## Definition of done`, `## Decision rules`, `## Notes`). They sit under `plans/briefs/` so that a mission's own plan, `plans/<date>-<slug>.md`, can't collide with its brief; record that under Decisions.
  - Each starts with a comment: copy to `/srv/critter-ai/agent-state/missions/briefs/<date>-critwire-learn-b<n>.md`, then `mission start critwire <that file>`; B2 only after B1 is live.
  - Content per §4's split, with the session estimate:
    - B1: the countries file end to end; engine vendoring and the app core; the ERD pipeline and schema page; the 16 lessons with their checks and E2E;
    - B2: the cookbook page; the playground with CSV download; the demo game; their E2E; Caddy headers if the owner approves.
  - Definition of done: typecheck, test, build, the named E2E specs and their artifacts, and every lesson and cookbook query run in E2E. Notes: the pins, the F1–F10 facts B needs, and pointers into 002.
  - 002 §9: the paths and why it's split.
  - Checks: Guard; each brief has the six headings and an estimate well under 60 sessions.

- [x] S22 · 002 §10, the 001 pointer, completeness pass. Deviations (Decisions, S22): §10 adds the engine pin, the start-time acceptance and the shell link as owner items; photo-hosting cost measured (74 thumbnails, 5.7 MB).
  - §10: every owner choice from §4's list plus any the spike added (for example vendoring extensions for A2, the iPhone and Chromebook check), each with a recommendation and its cost.
  - `plans/001-mvp.md` Later: the "Phase 2 viewer" line points to `plans/002-learn.md` (one line).
  - Run Verification V6–V8 and fix any gap. The Log line lists the Summary's inputs: engine and key numbers next to PGlite's, shell vs editor, extensions, lessons, cookbook count, demo, countries source, brief paths, owner choices.
  - Checks: Guard; V6–V8 pass.

- [x] S23 · Code review fix 1: `l16-ex` is the answer alone (Astra MUST-FIX 1). Deviations (Decisions, S23): `-- after:` not transitive (lists every block); after-blocks may not be untested, expect an error or be `setup`; their `countries` reads count toward the block's label; `lessons.json` gains `after`/`verify`.
  - Today `l16-ex` repeats `CREATE TABLE traits`, which `l16` already made, so a learner (or the B1 page, which ships `site/learn/sql/l16-ex.sql` from this block) hits "Table with name 'traits' already exists!".
  - Spike first: a runner header `-- after: <q-id>[, …]` that runs the named blocks' SQL before the block inside the same `BEGIN … ROLLBACK` (static check: named blocks exist and come earlier; no cycles). Failure-mode tests first, seen red: unknown id, later id, after-block fails, result is still the block's own last statement.
  - 002: `l16-ex` = `-- after: l16` + the `species_traits` DDL only; the verify query becomes its own block `l16-check` (`-- after: l16, l16-ex`), and lesson 16's **Check** names it. §1 (exercise checks, pristine references), §8 (`answers.ts`, file layout) and the B1 brief say how `-- after:` maps to the page: prerequisites are the lesson's own earlier blocks, run by the learner; the schema check runs `l16-check` on the learner's tables.
  - Checks: Guard; spike typecheck + tests; `run-queries --update` diff read (l16-ex, l16-check only), then `--check --erd` exit 0; V7.
- [x] S24 · Code review fix 2: c02's button order independent of the decoy pick (Astra MUST-FIX 2). Deviations (Decisions, S24): evidence via a scratch run-queries file (DuckDB-WASM), not try-sql; B2 brief's same-for-everyone note names the order key.
  - The decoys are the three lowest of key `(id * 619 + seed * 211) % 1009`, and the buttons sort by the same key, so the answer lands last most rounds (Astra: 9 of 10 on 2026-10-22).
  - 002 c02: buttons ordered by a second key with other constants (one documented "order key", e.g. `(id * 211 + seed * 619) % 1009`), stated in §5's intro next to the shuffle key; §7 wording checked.
  - Evidence: a scratch query over every photo-deck answer (c09) × seeds 1–10 counting the answer's position 1–4 (each 15–35 %), run in DuckDB-WASM (`try-sql.ts` or a `d`-block), counts in the Log; same count for the old order to show the bias.
  - Checks: Guard; `run-queries --update` diff read (c02 only), `--check --erd` exit 0.
- [x] S25 · Code review fix 3: every statement's result read capped, not only the last (Astra MUST-FIX 3). Deviations (Decisions, S25): engine queues calls (one script at a time); result gains `truncated`; cap-check's wrap case moved to uncapped `rawQuery`.
  - "Statements before the last run as usual" lets `<runaway join>; SELECT 1` build the whole join again (2.6 GB, malloc failure).
  - Spike: `runScript` (and the page runner) streams every statement with `conn.send(sql, true)`; earlier statements' batches are read and dropped up to the cap, then `cancelSent()`; only the last keeps rows. `cap-check.ts` adds the multi-statement case first (seen red with today's code): `<RUNAWAY>; SELECT count(*) FROM species` ends with 76, renderer peak ≤ 600 MB like the single case, and a following `INSERT …; SELECT …` script still applies the insert.
  - 002 §1 "Huge results" rewritten to say every statement is streamed and capped, with the new numbers (`spike/out/cap/`); B1 brief's engine notes match.
  - Checks: Guard; spike typecheck + tests; `cap-check.ts` 0 failures, blocked []; boot-check and card-check 0 failures; `--check --erd` exit 0 (no result changes).

## Verification

Run from the worktree as one bash session; it writes its own transcript. No lint script exists (Baseline), so `pnpm typecheck` is the static check. Nothing public changes, so the repo's E2E suite proves no regression, and the spike's browser runs are this mission's E2E evidence.

```bash
set -euo pipefail
W=/srv/critter-ai/worktrees/critwire-learn-design; cd "$W"
M=/srv/critter-ai/agent-state/missions/critwire-learn-design; SP=$M/spike; V=$M/verify; E=$M/e2e
P=plans/002-learn.md; ERD=plans/002-learn-erd.mmd; mkdir -p "$V"
exec > >(tee "$V/verify-$(date -u +%Y%m%dT%H%MZ).log") 2>&1
fail() { echo "FAIL: $*"; exit 1; }
hashes() { (cd "$1" && find . -type f | sort | xargs sha256sum); }
ports_free() { ! ss -ltn | grep -qE '127\.0\.0\.1:310[012] '; }

# V0 preflight: clean and pushed, scratch db, ports 3100-3102 free
test -z "$(git status --porcelain)"
git fetch -q origin; test "$(git rev-parse HEAD)" = "$(git rev-parse origin/agent/critwire-learn-design)"
node -e 'process.loadEnvFile(); process.exit(new URL(process.env.DATABASE_URL).pathname === "/critwire_dev" ? 0 : 1)' || fail "DATABASE_URL is not critwire_dev"
ports_free || fail "port 3100-3102 busy"

# V1 scope: only plans/ changed (no scripts/, site/, e2e/, data/, db/, package.json or lockfile)
git diff --name-only origin/main...HEAD | grep -v '^plans/' && fail "files outside plans/ changed"

# V2 repo checks
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test

# V3 dist unchanged: a fresh build hashes exactly as Baseline's build of origin/main
rm -rf dist; pnpm -s build > "$V/build.txt"
diff <(LC_ALL=C sort -k2 "$SP/baseline/dist.sha256") <(hashes dist | LC_ALL=C sort -k2) || fail "dist differs from main"

# V4 E2E regression: the repo suite (Playwright 1.58.2, headless Chromium, local Caddy 3100/3101), same 20 as Baseline
rm -rf "$E"; E2E_ARTIFACTS="$E" pnpm e2e
jq -e '.stats.expected == 20 and .stats.unexpected == 0 and .stats.flaky == 0 and .stats.skipped == 0' "$E/results.json"
test -s "$E/playwright-report/index.html"; test -s "$E/docs-375.png"
pgrep -f 'caddy run --config e2e/Caddyfile' && fail "E2E Caddy still running"

# V5 spike: frozen reinstall, typecheck, failure-mode tests (SQ, CD, CR, CK, RQ, RQE, ER)
pnpm -C "$SP" install --frozen-lockfile
pnpm -C "$SP" typecheck
pnpm -C "$SP" test

# V6 every SQL block in 002 ran: re-run in DuckDB-WASM (headless Chromium, spike Caddy on 3102), compare
# with the recorded results, rewrite queries.log; ERD drift against the browser-built database
node "$SP/scripts/run-queries.ts" "$W/$P" --check --erd "$W/$ERD"
head -1 "$M/queries.log" | grep -q 'duckdb-wasm' || fail "queries.log engine line"
grep '^-- status: untested: ' "$P" || true
test "$(grep -c '^-- status: untested: ' "$P" || true)" -le 3 || fail "too many untested blocks"
ports_free || fail "spike server left running"

# V7 002 and the briefs are complete
for n in 1 2 3 4 5 6 7 8 9 10; do grep -qE "^## $n\. " "$P" || fail "002 section $n missing"; done
L=$(grep -cE '^### Lesson [0-9]+ · ' "$P"); test "$L" -ge 12 -a "$L" -le 16 || fail "lessons: $L"
for n in $(grep -oE '^### Lesson [0-9]+' "$P" | grep -oE '[0-9]+$'); do
  grep -qxF -- "-- q: l$(printf %02d "$n")-ex" "$P" || fail "lesson $n has no exercise"; done
test "$(grep -c '^\*\*Shown as:\*\*' "$P")" = "$L"; test "$(grep -c '^\*\*Check:\*\*' "$P")" = "$L"
C=$(grep -cE '^-- q: c[0-9]{2}$' "$P"); test "$C" -ge 25 || fail "cookbook: $C"
test "$(grep -cE '^### c[0-9]{2} · ' "$P")" = "$C"; test "$(grep -c '^\*\*Game use:\*\*' "$P")" = "$C"
for b in b1 b2; do f=plans/briefs/critwire-learn-$b.md
  for h in Goal Why Scope 'Definition of done' 'Decision rules' Notes; do grep -qx "## $h" "$f" || fail "$f: no $h"; done; done
grep 'Phase 2 viewer' plans/001-mvp.md | grep -q '002-learn.md' || fail "001 pointer"

# V8 the ERD renders offline to SVG with the chosen tool
node "$SP/scripts/erd.ts" "$W/$ERD"
test -s "$SP/erd/schema.svg"; test -s "$SP/erd/schema.png"
grep -q '<foreignObject' "$SP/erd/schema.svg" && fail "foreignObject in SVG"

# V9 spike evidence present, no off-origin request anywhere, and the spike reproduces (smoke)
for r in bytes boot schema card-page throttle-validation duckdb-live pglite-live sqljs duckdb-proposed classroom coi/desktop coi/4x ext-mirror shell; do
  test -s "$SP/out/$r/summary.md" || fail "no $r summary"; done
for j in "$SP"/out/*/results.json "$SP"/out/*/*/results.json; do jq -e '(.blocked | length) == 0' "$j" >/dev/null || fail "off-origin request in $j"; done
test -s "$SP/README.md"; test -s "$SP/out/countries-match.md"; test -s "$SP/out/countries-sources.md"
ls "$SP"/out/card-page/*.png "$SP"/out/duckdb-live/*/*.png > /dev/null
node "$SP/scripts/measure.ts" --smoke --out "$SP/out/verify-smoke"
jq -e '.failures == 0 and (.blocked | length) == 0' "$SP/out/verify-smoke/duckdb-eh-desktop/results.json"
ports_free || fail "spike server left running"

# V10 delivery
test -z "$(git status --porcelain)"
```

What must hold: every command exits 0. V3's diff is empty (157 files). V4 is 20/20 with nothing skipped. V6 shows no result difference and no ERD drift. V7: 12–16 lessons, each with an exercise; at least 25 cookbook entries; both briefs complete; the 001 pointer. V9: every run folder has its summary, and no browser run made a request off the origin other than the two Wikimedia photo hosts.

**Artifacts:**
- Repo E2E, in `$M/e2e/`: `playwright-report/` (`pnpm exec playwright show-report $M/e2e/playwright-report`), `test-results/` with a `trace.zip` per test (`pnpm exec playwright show-trace <trace.zip>`), `results.json`, `docs-375.png`, `caddy-access.log`.
- Spike, in `$SP/`: `out/<run>/` (`summary.md`, `results.json`, screenshots, `caddy-access.log`, `env.txt`), `erd/schema.{svg,png}`, `README.md` with every command in order.
- `$M/queries.log`: each 002 block's result from DuckDB-WASM.
- `$M/verify/verify-<UTC>.log`: this run's transcript.

**Reproduce:** this script. Pieces alone: `node $SP/scripts/run-queries.ts $W/plans/002-learn.md --check --erd $W/plans/002-learn-erd.mmd`; `node $SP/scripts/measure.ts --smoke --out <dir>`; `rm -rf dist && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

**Release smoke** (the Release unit, not a step): after `deploy critwire`, fetch every path in `$SP/baseline/live.sha256` from https://critwire.com and diff the hashes against it. Any difference fails the release.

## Failure modes

Only the spike tools that the Definition of done rests on are tested in isolation. Each mode below is a test or fixture, written and seen failing before its code (step in brackets). "Fails" means a non-zero exit, or a thrown error, with a message naming the cause.

**SQ · `splitStatements` (`src/sql.ts`), `test/sql.test.ts` [S2]**
- SQ1 `;` inside a single-quoted string, including `''` escapes, doesn't split.
- SQ2 `;` inside a double-quoted identifier doesn't split.
- SQ3 `;` inside a `--` line comment or a `/* */` block comment doesn't split.
- SQ4 No trailing `;`: the last statement is kept. A trailing `;` followed only by whitespace or comments adds no empty statement.
- SQ5 Empty statements (`;;`) are dropped. Comment-only text gives zero statements, and `runScript` fails with "no SQL to run".
- SQ6 Statement numbers are kept (1-based), so an error in statement 2 says "statement 2".
- SQ7 An unterminated string, identifier or block comment fails; it's never passed through as one statement.

**CD · `countries-draft.ts`, `test/countries-draft.test.ts` on fixture GeoJSONs [S3]**
- CD1 A species code with no row fails, listing every unmatched code.
- CD2 `ISO_A2 = -99` with a valid `ISO_A2_EH` uses `ISO_A2_EH` (FR, NO, XK).
- CD3 A row with both codes `-99` gets no code; if a species needs it, CD1 fails.
- CD4 `map_units` supplies only codes with no `countries` row (GF, MQ, RE); for a code with a country row, the country row wins.
- CD5 Two rows with the same code fail, listing both.
- CD6 Two rows with the same name fail.
- CD7 An empty or null `name`, `continent`, `region` or `subregion` fails.
- CD8 `NA` (Namibia) stays the string `"NA"` in the Parquet and the JSON.
- CD9 The outputs have exactly `code, name, continent, region, subregion`: no geometry and no other field.
- CD10 Codes missing from GBIF's enumeration are listed in the report and don't fail; XK is present.
- CD11 An input file that's missing, or whose sha256 differs from `downloads/SOURCES.md`, fails.

**CR · the card rule and cards (`src/cards.ts`), `test/cards.test.ts` [S5]**
- CR1 Without `-- show: cards` the result is a table, even with a valid `id` column.
- CR2 The directive counts only as the first non-blank line, exactly `-- show: cards`; anywhere else it's an ordinary comment.
- CR3 With both `species_id` and `id`, the key is `species_id`.
- CR4 No key column: table, plus the reason line.
- CR5 A NULL key: table, plus the reason line.
- CR6 Duplicate keys: table, plus the reason line.
- CR7 A key that isn't a known species id (999, 0): table, plus the reason line.
- CR8 A non-integer key (1.5, the string `'7'`): table, plus the reason line. A BigInt within the safe range is accepted.
- CR9 Zero rows with the directive: an empty state ("No animals match"), not an error.
- CR10 Over 200 rows: 200 cards and "showing 200 of N".
- CR11 `photo_url` NULL: the "No photo yet" placeholder, no `<img>` and no credit. A photo: credit text, a license link to `LICENSE_URLS[license]`, and a link to `photo_page`. A license missing from `LICENSE_URLS` throws.
- CR12 Other columns show as "column: value", with NULL shown as `NULL`.

**CK · exercise checks (`src/check.ts`), `test/check.test.ts` [S5]**
- CK1 The same rows under different column names pass.
- CK2 The same rows in another order pass when unordered, and fail with the "row order" hint when ordered.
- CK3 An extra or missing row fails with the row-count hint.
- CK4 A different column count fails with the column-count hint.
- CK5 Swapped columns fail with the "column order" hint (comparison is positional).
- CK6 Duplicates count (multiset): `[a, a, b]` vs `[a, b, b]` fails.
- CK7 NULL matches NULL; NULL doesn't match 0 or `''`.
- CK8 BigInt `5n` matches the number 5; lists compare element by element.
- CK9 Floats match within a relative 1e-9, so a different summing order still passes.
- CK10 `error` kind: success fails with a hint; a non-constraint error (syntax) fails and shows it; a constraint error passes.
- CK11 `schema` kind: the verify query's rows are compared, unordered, with the lesson's expected rows.

**RQ · `run-queries.ts`, one fixture plan per mode in `test/fixtures/run-queries/`, `test/run-queries.test.ts` [S12]**
- RQ1 A ```` ```sql ```` block without `-- q:` fails.
- RQ2 A duplicate id fails.
- RQ3 An id outside `[a-z0-9-]+` fails.
- RQ4 A missing or unknown `-- status:` fails.
- RQ5 `untested:` with an empty reason fails.
- RQ6 A `ran` block that reads `countries` fails as mislabelled.
- RQ7 A `ran` block `CREATE VIEW v AS SELECT * FROM countries; SELECT * FROM v;` fails as mislabelled (the word test catches the CREATE, `getTableNames` the SELECT).
- RQ8 A `draft-table` block that reads no `countries` fails as mislabelled.
- RQ9 Passes: `species_countries`, `countriesWithOpenRecords`, a `'countries'` literal and a `-- countries` comment in a `ran` block.
- RQ10 A recorded result that differs in one cell, the row count or the hash fails, naming the id and showing the diff.
- RQ11 A `ran` or `draft-table` block with no following ```` ```text ```` result fails; a result block whose id isn't the preceding block's, or with no block before it, fails.
- RQ12 A statement error without `-- expect: error` fails, naming the id and the statement number.
- RQ13 `-- expect: error X` fails when nothing errors, when the error lacks X, or when an earlier statement errors. An error in the last statement containing X passes and renders as `-- result: <id> · error: …`.
- RQ14 Isolation passes: block A runs `DELETE FROM species; CREATE TABLE t (id INTEGER REFERENCES species(id));`, then block B still counts 76 species and can create `t` again.
- RQ15 A block containing `BEGIN`, `COMMIT` or `ROLLBACK` fails, and the run stops; so does a failed `ROLLBACK`.
- RQ16 A `-- show: cards` block whose result breaks the card rule (CR4–CR8) fails.
- RQ17 `-- params` that isn't a JSON array, or whose length differs from the last statement's `?` count, fails. A correct one binds and passes.
- RQ18 Determinism lint: `random(`, `hash(`, `uuid(`, `gen_random_uuid(`, `now(`, `current_date` or `current_timestamp` outside strings and comments fails; a last statement returning more than one row without `ORDER BY` fails.
- RQ19 A `setup` block that differs from `src/setup.sql` by one byte (header lines aside), or a missing `setup` block, fails.
- RQ20 Rendering is exact: NULL as `NULL`, lists as `[a, b]`, a BigInt above 2^53 as its digits, a 61-character cell cut to 60 plus `…`, `|` in a cell escaped as `\|`. The sha256 covers the full result: two results differing only in row 6 hash differently.
- RQ21 A multi-statement block records the last statement's result (`SELECT 1; SELECT 2` gives 2).
- RQ22 Port 3102 busy, or a listener on 3100/3101, fails before anything runs; no spike Caddy is left after any exit, including a failure.
- RQ23 `--update` then `--check` passes, and a second `--update` changes nothing.
- RQ24 An engine that can't boot (a missing `.wasm`) fails with the error within the boot timeout; it never hangs.

**RQE · `run-queries --erd` [S13]**
- RQE1 A table in the `.mmd` missing from the database, or a database table (not the view) missing from the `.mmd`, fails.
- RQE2 A missing or extra attribute, or a type that differs after normalizing names (INTEGER, VARCHAR, DATE), fails.
- RQE3 A `PK`, `FK` or `UK` marker that disagrees with `duckdb_constraints()` fails.
- RQE4 A relationship with no matching FK, or an FK with no relationship, fails.
- RQE5 002's ```` ```mermaid ```` block differing from the `.mmd` fails.

**ER · `erd.ts` [S13]**
- ER1 A Mermaid syntax error fails with the parser's message, and the previous SVG stays (write to a temp file, then rename).
- ER2 An SVG containing `<foreignObject>` fails.
- ER3 Any network request while rendering fails (route guard).
- ER4 An empty SVG or PNG fails.

**MS · `measure.ts` run-time assertions (it stops and writes why) [S6]**
- MS1 A worker busy-loop ratio under 2.5 at rate 4 switches every throttled run to the CPUQuota method and records it; it never carries on silently.
- MS2 A CPUQuota scope that fails to start stops the run.
- MS3 A `.wasm` download time off by more than 30 % from bytes ÷ throughput stops that profile (check (b)).
- MS4 No renderer pid, or a `VmHWM` of 0, stops the run.
- MS5 No `WebAssembly.Memory` seen by the hook stops the run.
- MS6 A warm run that downloads the engine again under the live config, outside "warm after rebuild", stops the run (cache broken).
- MS7 A request the page made that's missing from the Caddy log stops the run.
- MS8 Any off-origin request is listed in `blocked`, and the run fails.
- MS9 A card count that differs from the Brazil row count counts as a failure.

## Code review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. `plans/002-learn.md:1657`: `l16-ex` recreates `traits`, although learners must first run `l16`, which creates it. Reproduced: “Table with name 'traits' already exists!” Separate prerequisite SQL, displayed answer, and verification; test the actual lesson→exercise sequence.
2. `plans/002-learn.md:1802`: c02 orders choices by the same key used to select the three lowest-ranked decoys. This puts the correct answer last overwhelmingly often—9/10 rounds on 2026-10-22. Use an independent deterministic ordering for buttons and verify answer-position distribution.
3. `plans/002-learn.md:152`: Only the last statement gets streamed and capped. Appending `; SELECT 1` to the documented runaway join makes that join materialize fully again, restoring the measured 2.6 GB memory failure. Bound result consumption for every statement; test multi-statement submissions.

SHOULD-CONSIDER:
1. `plans/002-learn.md:541` and `:1535`: Exercises explicitly request sorted output, but their checks accept any row order. Require ordered comparison so missing `ORDER BY` fails.

## Release

## Decisions

- Mission B briefs go in `plans/briefs/` so a mission's own plan file can't collide with its brief.
- Lessons (§4) and cookbook (§5) each split over two steps (S15/S16, S17/S18) to fit one session apiece; ~31 sessions total, under the 60 cap.
- Final Verification: V9 checked `out/coi/summary.md`, but S9 writes coi evidence per label (`out/coi/{desktop,4x}/`, spike README). `measure.ts` likewise writes per cell (`out/<run>/<engine>-<profile>/`). V9 now checks both coi label summaries, `out/*/*/results.json` in the off-origin check (32 files, all blocked 0), `duckdb-live/*/*.png`, and the smoke at `verify-smoke/duckdb-eh-desktop/results.json`. Evidence unchanged.
- **duckdb-wasm pin: `1.33.1-dev65.0`** (+ `-shell` same). Probed in node-blocking build: 1.32.0 = DuckDB v1.4.3 `d1dc88f950`; dev57.0 (npm `latest`) = v1.5.4 `08e34c447b`; dev65.0 (npm `next`, 2026-09-29, outside the 1-day gate) = v1.5.6 `069cc9f9b5`, a tagged release, = repo's node-api DuckDB. `inet` + `spatial` published for `wasm_eh` and `wasm_mvp` on all three (HTTP 200). Newest that meets §1's rule → dev65.0.
- **Other spike pins:** `@electric-sql/pglite` 0.5.10 (0.5.11 of 2026-10-21 11:48 is inside pnpm's release-age gate; no exclude added), `mermaid` 12.2.0, `sql.js` 1.15.1, `esbuild` 0.28.2, `playwright` 1.58.2 (Chromium 145.0.7632.0 = cached `chromium-1208`, no download), `typescript` 7.0.2, `@types/node` 26.6.5, `@duckdb/node-api` 1.5.6-r.2 (repo's gate excludes copied).
- **Build scripts:** spike installed with the repo's `allowBuilds: esbuild` only; `pnpm ignored-builds` = None. duckdb-wasm, duckdb-wasm-shell, pglite, mermaid need no build script → B1 adds them without an `allowBuilds` change.
- **Precompression cost:** `build-site.ts --precompress` (brotli 11, zstd 19, gzip 9 on 9 vendored files) takes 4 m 47 s on this box; eh.wasm on the wire: live on-the-fly zstd 7.98 MB vs precompressed br 5.47 MB / zstd 5.79 MB. Weighs into §10 (S9 adds classroom-load CPU).
- **Fixed mtime works:** `duckdb-eh.wasm` ETag `"76xfr58qsqo0-lfjfa"` identical across a full `site/` rebuild (Last-Modified 2000-01-01). Spike `src/assets.ts` holds vendored files + versioned dirs; build fails if installed version ≠ pin.
- `pglite.data` is served with no Content-Type (no `/etc/mime.types` entry); harmless for `fetch`, noted for S8.
- **S2: duckdb-wasm links only `core_functions`.** `parquet` and `json` are extensions in 1.32.0 and 1.33.1-dev65.0 alike (`scripts/probe-static.cjs`), so F6/§1's "parquet and json statically linked" was wrong and v1 needs an extension. Engine: autoload/autoinstall stay off, `custom_extension_repository` = `<origin>/learn/assets/duckdb-ext`, explicit `LOAD parquet` at boot; signature checks on, passes. Mirror layout `duckdb-ext/v1.5.6/wasm_{eh,mvp}/parquet.duckdb_extension.wasm` (versioned path + fixed mtime, F3). Bytes: eh 3.22 MB raw / 0.74 MB zstd live, mvp 3.02 / 0.71. json not loaded (setup needs only parquet; saves 0.82 MB). `LOAD spatial` → one same-origin 404, error, nothing off-origin. → S14 (002 §1) states it; S21: B1 needs the extension binary at an offline build and it isn't an npm package (commit it with a sha256 check, or a pinned download step): a §10 owner choice.
- **S2: mvp loses every SQL error message** (`_setThrew is not defined` instead of DuckDB's text; the database survives). Same in 1.32.0. Learners need the error text, so 002 §1 should recommend eh only (wasm exception handling: Chrome 95, Firefox 100, Safari 15.2) with a plain "browser too old" notice instead of mvp; S7 still measures mvp for the record.
- **S2: HTTP files are read whole.** Default config: one `GET` (200, whole file, no `Range`) per boot for a registered file; `HEAD` + whole `GET` for a URL (checked with a 73 MB file). With `reliableHeadRequests`/`allowFullHTTPReads: false`, duckdb-wasm's `HEAD` + `Range: bytes=0-` probe reaches Caddy without `Range`, gets 200, and the open fails. v1 is fine (setup reads all of a 32 KB file in one request); range reads for large files are an A2 question. Same without Playwright interception, so not a harness artefact. The S2 "206" check became "one 200 GET per boot".
- **S2: `registerFileURL` is lazy:** `countries.parquet` (absent until S3) doesn't break boot.
- Interception note: under `context.route`, Chromium adds `Cache-Control: no-cache`/`Pragma: no-cache` to every request, so revalidation/caching measurements (S6 MS6, "warm after rebuild") must not rely on the route guard's context alone; S6 decides.
- **S3: countries source = Natural Earth v5.1.2** (tag, commit `f1890d9f15`), **1:10m** admin-0 `countries` + `map_units`. 110m lacks HK SG MU SC KM; 50m covers the 107 but lacks GI BV UM against GBIF; 10m gives 250 codes = GBIF's 250 exactly, so species recorded later in small territories still match. License: public domain, credit optional ("Made with Natural Earth."), quotes in `$SP/out/countries-sources.md`. GBIF enumeration: no stated license; `gbif.org/terms` 403 to this VPS; cross-check only, never published.
- **S3: name = `NAME_EN`** (not `NAME_LONG`): both equal GBIF's title for 209 codes; `NAME_LONG` abbreviates ("Dem. Rep. Korea", "Lao PDR", "Heard I. …"), `NAME_EN` gives everyday names (Russia, Laos, Ivory Coast). Quirks for 002 §6: CN = "People's Republic of China", CC = "Cocos", TW = "Taiwan" (GBIF: Chinese Taipei); RE's `CONTINENT` = "Seven seas (open ocean)", MQ's = "North America". Published as Natural Earth has them, no edits.
- **S3: two narrow rules on Natural Earth's own fields** (per the contingency): (1) several `countries` rows with one `ISO_A2_EH` (FR+Clipperton, KZ+Baykonur, BR+Brazilian Island, AU+3 dependencies) keep the row whose `ADM0_A3 = ISO_A3_EH`, failing unless exactly one is; (2) map units of `TYPE` "Overlay" (UNDOF `XD`, Korean DMZ ×2) are dropped. 13 units with no code (Somaliland, N. Cyprus, sovereign base areas, Bir Tawil, …) drop out. Result: 239 countries-layer + 11 map_units rows (BQ BV CC CX GF GP MQ RE SJ TK YT). TW via `ISO_A2_EH` (its `ISO_A2` is `CN-TW`).
- **S3: draft lives in `$SP/draft/v1/`** (not `site/v1/` directly), because `build-site.ts` wipes `site/`; it copies `draft/v1/` in after the baseline files. Parquet written from the JSON with every column read as VARCHAR, so `NA` stays "NA" in both (checked: 250 rows, 0 null codes).
- **S4: setup = 16 statements, one init path.** `src/setup.sql` per §2; `engine.ts` imports it (esbuild text loader) and runs it in `fresh()`, so boot and `restart()` can't differ (the optional `setup` boot option is gone). `taxa` adds `CHECK ((taxon_rank = 'class') = (parent_name IS NULL))` (§2 says "NULL for classes"; now enforced). Counts in WASM = §2's (taxa 143 = 3/22/50/68, species 76, species_countries 472, sources 5, species_sources 591, countries 250, view 76). Without BR in countries.parquet setup fails at statement 15 with DuckDB's FK error naming `code: BR`.
- **S4: F6 holds in WASM** (`$SP/out/schema/f6-wasm.md`): multi-row self-referencing INSERT fails, one row per INSERT works; `ALTER TABLE … ADD FOREIGN KEY` = "Not implemented"; `DROP TABLE species` fails with or without `CASCADE`; learner DDL + failed INSERT rolls back to the same catalog; raw `conn.query('SELECT 1 AS a; SELECT 2 AS b')` returns the **first** result (a = 1). `getTableNames`: view over countries → `[countries]`, literal/comment ignored, plain `CREATE TABLE`/`CREATE VIEW` → `[]`, but **`CREATE TABLE … AS SELECT … FROM countries` → `[countries]`** (F6 only covered CREATE without AS). The label rule (word test + getTableNames) catches both; S12 keeps it.
- **S4: runaway query fails outside DuckDB's limit.** `SELECT * FROM species, species_countries, species_sources` (21.2 M rows) ends in `malloc of size 2147483648 failed` after ~3.5 s, not DuckDB's out-of-memory error: duckdb-wasm materializes the whole result for Arrow, outside the buffer manager. The tab and worker survive, `SELECT 1` runs and the tables are intact, so `memory_limit` stays (512 MB = 488.2 MiB reported). Inside operators the limit works: `SELECT count(*) FROM (SELECT DISTINCT * FROM <same join>)` → "Out of Memory Error … no temporary directory". → S5/S14: the error a learner sees for a huge result is unhelpful and the worker may have grown to ~2 GB first; 002 §1 should cap results (stream with `conn.send` and stop at a row cap, or wrap the last statement with a LIMIT probe) and translate the malloc error; S6 measures peak memory.
- **S4: Caddy log per run.** `serve.ts` deletes `<out>/caddy-access.log` before starting Caddy (it appends), so a run's log holds only that run; S2's "one GET per boot" check failed on a reused `out/boot/` without it. With setup at boot: one GET per data file per fresh database (setup's 8 `read_parquet` calls reuse it); restart GETs both again (200: the route guard sends no-cache).
- **S4: `scripts/runner-client.ts`** holds `bootPage`, `run`, `runError`, `json`, `Check`, `writeChecks`, shared by boot-check and schema-check (and S5+). `Engine`/runner add `restart()` and `rawQuery()` (unsplit, F6 probe only). `restart()` takes 2.65 s on desktop (new worker + instantiate + setup).
- **S5: card page = `src/card.html` + `card-page.ts`; logic pure in `cards.ts` (card rule + HTML-string renderers, escaped), `check.ts` (compares, `pristine()`), `format.ts` (`cellText`, shared with S12's rendering).** Renderers return HTML strings so Node tests (CR, CK) see exactly what the page draws; mission B may keep it. `sql.ts` gains `ScriptError` (statement, total, DuckDB detail; same message), which the `error` check kind needs ("last statement" + `Constraint Error`). Engine gains `onProgress` (instantiate bytes) for "Loading database: x of y MB".
- **S5: card extras skip the columns a card already shows** (`common_name`, `scientific_name`, `photo_*`), besides the key; every other column is a "column: value" line. §4 said "the row's other columns"; showing `common_name: Jaguar` under the title "Jaguar" only repeats it.
- **S5: `DELETE FROM species` is refused** (`Constraint Error: Violates foreign key constraint … still referenced`), so it can't show the pristine reference. card-check deletes India's rows from `species_countries` instead: the exercise answer then fails "0 rows; the answer has 6", i.e. the reference wasn't recomputed; Reset restores 76/472 and it passes again. The refusal itself is good lesson-7 material.
- **S5: licenses via the repo's `licenseUrl`** (`scripts/build/sources.ts`, imported by relative path; throws on an unknown license, CR11); Public domain shows unlinked. Photos load straight from Wikimedia (12/12) with `referrerpolicy=no-referrer`, `loading=lazy`.
- **S5: Stop works by restart** while a long query runs (3.1 s, then the next query runs); a stale run's result is dropped by a generation counter, since the old worker's promise may never settle. Reset 2.8 s, boot to ready 3.0 s (desktop, unthrottled).
- **S5: the page follows the system theme** (dark tokens = the mockup, light as the docs page); headless defaults to light, so card-check also saves `brazil-1280-dark.png`. A DML result (`DELETE` → one `Count` row) currently reads "1 row" in the status; 002 §8 should say "N rows changed".

- **S6: measuring runs without the route guard.** Playwright's `context.route` disables the HTTP cache (and Chromium sends `no-cache`), and `newContext()` is off-the-record (memory cache), so warm runs would measure nothing real. `browser.ts` `launchMeasured` spawns Playwright's Chromium itself (`--headless --no-sandbox`, as Playwright does; Ubuntu 24.04 blocks the userns sandbox), connects over CDP, and gives each cold run a new `--user-data-dir` (disk cache, as a learner has). Self-hosting proof: `--host-resolver-rules=MAP * ~NOTFOUND` except 127.0.0.1 and the two Wikimedia hosts, and every off-origin request a page or worker makes listed in `blocked` (MS8; checked: a `fetch('https://example.com')` is listed and fails). Result: a warm reload under the live config takes the engine `.wasm`, worker and parquet extension from cache (0 B), the page and data files 304 (0 B): F3's fixed mtime holds, MS6 passes.
- **S6: CPU throttling = `systemd-run --user --scope -p CPUQuota=<100/rate>%`** around the whole browser, for every throttled profile and engine (`out/throttle-validation/`). CDP `setCPUThrottlingRate 4` slows the main thread 4.08× but the worker 1.01× (MS1 → switch); CPUQuota 25 % slows the worker 4.01×. MS2 checks the browser's `cpu.max` after launch (decimals work: 16.67 %). Side effect for S7: CPUQuota caps the browser's network service and compositor too, so it is harsher than per-thread throttling; PGlite (main thread) is measured the same way, so the comparison stays fair.
- **S6: network throttling holds for the worker's download, no proxy.** CDP `Network.emulateNetworkConditions` on the page session: eh.wasm (7 976 059 B zstd) took 12 868 ms at school-wifi (expected 12 862) and 40 032 ms at slow-4g (40 030), ratio 1.00 (MS3 tolerance ±30 %).
- **S6: harness details.** Bytes: Caddy log `size` + `Content-Encoding` per request (split by log offset per load), file sizes from `site/`; the browser-side cross-check is Resource Timing `encodedBodySize` (page + worker; Playwright's CDP `encodedDataLength` isn't exposed for worker requests), also used for MS7 (`transferSize > 0` = went to the network). WASM memory: `src/wasm-hook.js` (one file: `measure-worker.js` imports it before the DuckDB worker; PGlite gets it as an init script) wraps `WebAssembly.Memory` and `instantiate*` and reads only exports: Emscripten's dynamic-linking imports are Proxies whose getters create GOT entries, so enumerating them broke DuckDB's boot. Card page: `?bundle=`, `?measure` (wrapper worker + auto-run), marks `query`/`cards` on every run. Photo time = scroll to cards → last visible photo's responseEnd (they're lazy and below the fold). VmHWM is the renderer's lifetime peak, so warm includes cold. A missing page (pglite, coi until S8/S9) stops the run naming it.
- **S6: first numbers (1 run each; S7 does the matrix).** desktop eh: cards at 2.98 s cold / 2.53 s warm, 9.02 MB wire cold (40.28 MB uncompressed), 0 B warm, VmHWM ~0.5 GB, WASM memory 50 MB, JS heap 4.6 MB, photos 236 ms. school-wifi (CPUQuota 25 %): cards at 27.1 s cold / 14.6 s warm; the engine mark comes at 23.4 s cold, 11.5 s warm, so without the download it's still ~11 s of CPU (compile + setup) at 4×. That weighs on §5's budgets.

- **S7: harness extras.** `measure.ts --extras` (card-page engines) runs, after every warm load: `buildSite()` + reload measured as a `rebuilt` load (MS6 applies), the eh.wasm ETag via `HEAD` before/after, Reset (click → `restart` mark, click → ready) and the runaway cross join typed into the editor, then `SELECT 1`. Done in all 5 runs per eh cell (5 samples each), not once. `summary.md` now computes §5's budgets per engine/config once all 3 profiles exist, lists screenshots and per-run extras, and appends a hand-written `notes.md`; `--summary <dir>` rewrites it.
- **S7: Chromium moved itself out of the CPUQuota scope.** Its browser process asks systemd over D-Bus for its own `app-org.chromium.Chromium-<pid>.scope`; renderers (page + DuckDB worker) stay in the quota scope, but the browser and what it launches later don't. Surfaced when mvp slow-4g run 5 hit the launch-time MS2 check. Fix: Chromium runs under `env DBUS_SESSION_BUS_ADDRESS=unix:path=/nonexistent` (all 9 processes stay in the scope), and MS2 now checks the browser + every `SystemInfo` process after every load. `--validate` and the 4 throttled cells re-run; pre-fix data kept in `$SP/out/duckdb-live-prefix/` (within ~3 %, renderers were throttled throughout). S6's "CPUQuota caps the network service too" is true only from this fix on.
- **S7: DuckDB-WASM under the live config (`$SP/out/duckdb-live/`, medians of 5).** 0 failures in 30 loads + 15 eh extras, `blocked` empty everywhere.

  | | desktop | school-wifi (4×) | slow-4g (6×) |
  |---|---|---|---|
  | eh cold, first result | 2.9 s | 27.1 s | 64.2 s |
  | eh warm, first result | 2.5 s | 15.1 s | 22.0 s |
  | mvp cold / warm | 3.4 / 2.9 s | 31.3 / 16.9 s | 73.1 / 25.8 s |
  | eh Reset (click → ready) | 2.4 s | 14.2 s | 21.0 s |
  | eh peak renderer VmHWM | 0.50 GB | 0.49 GB | 0.52 GB |

  Cold wire 9.02 MB eh (40.28 MB uncompressed) / 10.10 MB mvp; warm 0 B. WASM memory 50 MB, JS heap < 10 MB. **Better bundle: eh** (faster everywhere, smaller, keeps error text). **§5:** reliability, cold school-wifi (27.1 ≤ 40 s) and memory (≤ 529 MB ≤ 700) met; **warm slow-4g missed** by both (eh 22.0 s vs 8 s). The warm load is pure CPU: engine mark 17.8 s (worker + compile/instantiate of the cached module + `LOAD parquet`), setup 3.4 s, query + cards 0.8 s. → S9 applies §5's rule (first "one boot per Learn visit", then the engine; S8 gives PGlite's numbers).
- **S7: deploys don't re-download the engine (F3 holds).** 15/15 rebuilt loads: identical ETag, no engine file requested; page, bundles and /v1 files come back 200 (0.10 MB) since their mtimes change.
- **S7: Reset costs a warm boot** (14–21 s throttled). → S14/S20: make restarts rare (e.g. run learner statements in a transaction rolled back by default; restart only for Stop or after a malloc error).
- **S7: runaway query on a Chromebook.** 15/15 clean malloc error (3.7 / 17.7 / 27.0 s), worker usable after, but renderer RSS peaks at 2.55–2.65 GB and the worker keeps 2.19 GB of linear memory until restart. Normal tab ~0.5 GB fits a 4 GB Chromebook as one heavy tab (may be discarded in the background → warm boot on return); 2.6 GB likely crashes the tab there instead of the clean error. → S14: cap results before they materialize and restart the worker after a malloc error; §10's real-device check.

- **S8: PGlite parity first** (`$SP/out/pglite-check/`): `src/setup-pglite.sql` (Postgres JSON functions over a temp `v1_files` table the page fills from `/v1/species.json` + `countries.json`) builds the same 7 tables/view, same 37 columns (names, order), same counts and the same 12 Brazil rows as DuckDB eh; `blocked` []. PGlite 0.5.10 = PostgreSQL 18.6, self-hosted (`compileStreaming` of `pglite.wasm` + `initdb.wasm`, `pglite.data` as `fsBundle`), main thread. esbuild needs `external: ["node:*"]` for PGlite's Node-only branch.
- **S8: main-thread blocking = 10 ms interval probe** in `wasm-hook.js` (sum and longest gap > 50 ms), replacing the longtask PerformanceObserver, which reported 0 while PGlite froze the page ~3 s (checked: it does count a plain busy loop). **MS3 checks the `.wasm`'s download batch** (all same-origin downloads overlapping it): PGlite fetches 5 files at once, so its `.wasm` alone took 1.6× bytes ÷ throughput and the first throttled cells stopped; batch ratios 1.00–1.02, DuckDB unchanged (batch = its `.wasm`, 1.04; smoke re-run green).
- **S8: PGlite under the live config (`$SP/out/pglite-live/`, medians of 5),** 0 failures in 30 loads, `blocked` empty. Beside DuckDB eh (S7):

  | | DuckDB eh | PGlite |
  |---|---|---|
  | desktop cold / warm | 2.9 / 2.5 s | 4.0 / 2.4 s |
  | school-wifi (4×) cold / warm | 27.1 / 15.1 s | 35.7 / 14.0 s |
  | slow-4g (6×) cold / warm | 64.2 / 22.0 s | 70.3 / 21.6 s |
  | cold wire | 9.02 MB | 6.44 MB |
  | peak VmHWM cold desktop | 0.50 GB | 1.07 GB |
  | longest main-thread freeze, cold desktop / 4× | 0 / 0.29 s | 2.8 / 20.3 s |

  **§5 for PGlite:** reliability and cold school-wifi met; warm slow-4g missed (21.6 s, 1.02× DuckDB's, not 1.5×); memory missed (1.07 GB). So §5's switch rule isn't met; S9 records the verdict. PGlite's real cost is the frozen page (Postgres on the main thread; a worker variant exists but changes neither boot time nor memory). DuckDB's 4× figure is from one run (`$SP/out/pglite-live-duckdb-probe/`); S7's cells predate the probe.
- **S8: sql.js not recommended** (`$SP/out/sqljs/summary.md`): 0.37 MB zstd (SQLite 3.54.0), ~24× smaller than DuckDB's first load, but no Parquet/HTTP reader, loose typing, FKs off by default, no `information_schema`, no spatial path. Not run in the browser (brief: paragraph + size).

- **S9: coi (threads) is not viable: hard limit** (`$SP/out/coi/{desktop,4x}/`). (1) Under COEP the worker script needs `Cross-Origin-Embedder-Policy: require-corp` on its own response, or `new Worker` is `ERR_BLOCKED_BY_RESPONSE`; `Caddyfile.proposed` now sends it on `/learn/assets/*`. (2) coi needs the `wasm_threads` parquet extension (downloaded, sha256 in `SOURCES.md`); DuckDB publishes it, but it imports a **non-shared** `env.memory` (import section read by `coi-check.ts`; v1.4.3's build too), and `LOAD parquet` fails: `LinkError … mismatch in shared state of memory`. (3) Instantiate also hangs (> 60 s, no error) in 4/5 desktop and 2/5 4× boots. 10 of 10 coi boots gave no database. Even its time to failure (4.8 s desktop, 37–42 s at 4×) is slower than eh's whole engine boot on the same isolated page (2.3 / 14.7 s), so the 30 % gate isn't met: no coi matrix. A2 should re-check only if DuckDB ships shared-memory `wasm_threads` extensions.
- **S9: cards always load photos with `crossorigin="anonymous"`.** Wikimedia sends `access-control-allow-origin: *` but no CORP, so under COEP a plain `<img>` is blocked; with `crossorigin` 12/12 load (`coi-check` control: same photo without it blocked on the isolated page, loads on a normal one). Harmless without COEP, so one rule for every page.
- **S9: the engine fails loudly when its worker can't load.** A blocked/404 worker only fires `error`, and `instantiate` waited forever ("Loading database…"); `engine.ts` races it against the worker's `error` → "DuckDB worker failed to load: <url>". `bundleParam` validates `?bundle=` on both pages. → mission B's engine keeps both.
- **S9: proposed Caddy config** (`$SP/out/duckdb-proposed/`, eh, 30 loads, 0 failures, `blocked` empty; `out/bytes/summary.md` now has live and proposed tables):

  | eh, medians of 5 | live | proposed (precompressed br + immutable) |
  |---|---|---|
  | cold wire | 9.02 MB | 6.25 MB |
  | desktop cold / warm | 2.9 / 2.5 s | 2.7 / 2.6 s |
  | school-wifi (4×) cold / warm | 27.1 / 15.1 s | 23.6 / 15.7 s |
  | slow-4g (6×) cold / warm | 64.2 / 22.0 s | 51.4 / 23.9 s |
  | peak VmHWM | 0.52 GB | 0.52 GB |
  | classroom: Caddy CPU for 10 parallel eh.wasm fetches | 3.47 s (1.89 s wall) | 0.05 s (0.09 s wall) |

  Precompression: −31 % cold bytes, −13 to −20 % cold time on slow links, ~0.35 Caddy CPU s saved per learner's first load. Warm unchanged (CPU-bound). Immutable: a warm load sends only the page (304); live already reused the engine thanks to F3's fixed mtime, so its gain is no revalidation. Build cost: ~2 min per build to precompress the shipped eh files (brotli 11 on eh.wasm 106 s); all vendored files ~7 min. → §10 recommends precompression (br + zstd sidecars for the shipped engine files; B1 can skip recompressing when the versioned file is unchanged) and immutable caching as optional. Note: under the proposed run warm loads made no `/v1` request at all (live: 304s), most likely Chromium's heuristic freshness (no Cache-Control on `/v1`); 002 §8 should say whether `/v1` gets `Cache-Control: no-cache`.
- **S9: engine decision (§5): DuckDB-WASM, `eh` bundle, stays.** Side by side, medians:

  | §5 metric | budget | DuckDB eh live | DuckDB eh proposed | PGlite live |
  |---|---|---|---|---|
  | reliability | 0 failures | 0/30 (+15 extras) | 0/30 | 0/30 |
  | warm first result, slow-4g | ≤ 8 s | 22.0 s **missed** | 23.9 s **missed** | 21.6 s **missed** |
  | cold first result, school-wifi | ≤ 40 s | 27.1 s met | 23.6 s met | 35.7 s met |
  | peak VmHWM | ≤ 700 MB | 0.52 GB met | 0.52 GB met | 1.07 GB **missed** |
  | cold wire (desktop) | reported | 9.02 MB | 6.25 MB | 6.44 MB |
  | cold first result, slow-4g | reported | 64.2 s | 51.4 s | 70.3 s |

  The switch rule needs DuckDB to miss under the proposed config **and** PGlite to meet every budget **and** be ≥ 1.5× better on the missed metric: PGlite misses two budgets and is 1.02× (vs live) / 1.11× (vs proposed) on warm slow-4g. No hard limit for eh (coi's limit only rules out threads). Both miss the warm budget → per §5, DuckDB-WASM stays, and the softening comes first from the page design: **one engine boot per Learn visit** (lessons switch inside one page instead of each lesson page booting the engine), lesson text readable before the database is ready, restarts rare (S7). 002 §1/§8 and §10 state the cost: ~16 s (4×) / ~24 s (6×) to the first result on each visit on a low-end device once cached, ~24–51 s on the very first visit. No contingency steps needed.
- **S10: extension mirror works, signatures on** (`$SP/out/ext-mirror/`, `notes.md`). inet + spatial (DuckDB v1.5.6, `wasm_eh` + `wasm_mvp`, byte-identical to extensions.duckdb.org, sha256 in `SOURCES.md`) at `/learn/assets/duckdb-ext/v1.5.6/<platform>/<name>.duckdb_extension.wasm`; `SET custom_extension_repository …; INSTALL; LOAD` → `POINT (1 2)` and `192.168.1.5` on both bundles, `allow_unsigned_extensions` false, `blocked` []. `INSTALL` fetches nothing in WASM; `LOAD` makes the one GET. Added case: inet with one byte flipped, from a second repo on our origin, is refused at `LOAD` ("signature is either missing or invalid"), so self-hosting needs no unsigned mode. Caddy needs nothing new (built-in `.wasm` → `application/wasm`, same origin, no CORS). Bytes eh: inet 0.59 MB → 0.09 zstd live / 0.06 br proposed; spatial 23.63 → 6.33 / 4.53 (≈ 6× parquet; A2: load per spatial lesson, never at boot). Cold INSTALL+LOAD+query desktop: inet ~0.2 s, spatial ~1.5 s. `DUCKDB_EXT_TEST` + `mirrorFiles()` in `src/assets.ts` (build-site, bytes share it); `--precompress` now 9 m 39 s.
- **S10: boot-check's missing-extension probe is now `LOAD fts`** (core, not mirrored): `LOAD spatial` would now succeed. Same evidence: error, only request our mirror's 404. boot-check re-run 0 failures.
- **S10: Firefox not run.** `playwright install firefox` (1.58.2, firefox-1509 aarch64) downloads, then fails host validation: GTK 3 stack missing (`libxcursor1 libgtk-3-0t64 libpangocairo-1.0-0 libcairo-gobject2 libgdk-pixbuf-2.0-0`); headless launch fails the same. apt is out of the step's scope; download removed again. WebKit needs apt too: out of scope. Browser evidence is Chromium 145 only; 002 §1 lists Firefox with the real-device checks for §10 (`$SP/out/firefox/summary.md` has the commands).

- **S11: the DuckDB shell embeds on our database, self-hosted** (`$SP/out/shell/`, `notes.md`; 0 failures, `blocked` []). `shell-page.ts` boots eh, then `embed({ shellModule: <origin>/learn/assets/shell-1.33.1-dev65.0/shell_bg.wasm, container, resolveDatabase: async () => engine.db })`; `Engine` gains a `db` getter (current database, follows `restart()`). Typed `SELECT count(*) FROM species;` → 76 at the first prompt; a table the shell creates is visible to the page's connection. The shell's URL hash (`#,<q>`, its own space↔`-`, `;`↔`~` swap) runs queries at open (countries 250). Cost: +0.39 MB `shell_bg.wasm` + 0.17 MB `shell-page.js` zstd (~+0.5 MB on 9.02 MB), embed 0.2–0.7 s after setup (desktop). xterm's CSS needs `xterm` 5.3.0 as a direct dep (npm: deprecated, moved to `@xterm/*`); the shell is Rust/wasm-bindgen we can't patch.
- **S11: shell defects (known, recorded):** (1) screen readers get no output: rows `aria-hidden` (DOM) or canvas (WebGL, the default); the shell's options can't turn on xterm's `screenReaderMode`; the ARIA tree is one "Terminal input" textbox. (2) Input only via raw keydowns (`attachCustomKeyEventHandler`, no `onData`): text committed by input events (Android keyboards, IME, dictation; `insertText`) is dropped, Enter still arrives; key events work and 375 px is usable (39 cols). (3) The whole line typed while a query runs is lost. (4) WebGL2 advertised but no context → `embed` throws "WebGL2 not supported", no shell. → Q4 (S14): our own `<textarea>` editor everywhere; the shell at most an optional power-user link (§10), never the only way in. Check method: under WebGL the text is pixels, so the 76 check reads a table the shell created; a DOM-renderer run (no `WebGL2RenderingContext`) checks the text itself.

- **S12: run-queries = `scripts/run-queries.ts` (engine side) + `scripts/plan-queries.ts` (pure: parse, lint, render, write back).** Static checks run first and stop the run before Caddy or Chromium start: headers, ids, status, params (JSON array, length = `?` outside strings/comments of the last statement), `-- expect: error <text>`, transaction control (first keyword BEGIN/COMMIT/ROLLBACK/START/END/ABORT), determinism names, setup = `src/setup.sql`, result-block pairing (the next fence after a `ran`/`draft-table` block must be a ```` ```text ```` starting `-- result: `; an unclaimed one is an orphan). `--update` writes only when nothing else failed; missing/mismatched result blocks are then rewritten or inserted right after the block. `untested` blocks get no result block (log line `-- skipped: <id> · <reason>`).
- **S12: blocks run statement by statement from Node** (`BEGIN`, then per statement `getTableNames` → `runScript`, then `ROLLBACK`), so `getTableNames` sees views an earlier statement created (RQ7) and errors name `statement n of N`. Label rule per statement: word test (`codeOnly`: comments and strings blanked, quoted identifiers kept) first, else `getTableNames`. Timeout 60 s per page call (fatal: the run stops).
- **S12: rendering.** `-- result: <id> · <n> row(s) · sha256 <12 hex>`, header, first 5 rows (cells cut at 60 code points + `…`), then `… <k> more row(s)`; `|` → `\|`, newline → `\n`; the hash covers header + all rows uncut. BigInt above 2^53 survives Playwright's `evaluate` as digits (RQ20 fixture: 9007199254740993). DATE columns aren't in a recorded result yet: S16 (lesson 15, `sources.retrieved`) checks how they render.
- **S12: shared code.** `src/sql.ts` now has one lexer behind `splitStatements` and the new `codeOnly` (SQ1–7 unchanged, green). `cards.ts` exports `SPECIES_LOOKUP` + `speciesMap` (card page and run-queries share the card rule's species lookup). `paths.ts`: `SPIKE_SITE` env overrides the web root (RQ24), `MISSION` = the mission folder (default log path). Fixtures write `{{SETUP}}` / `{{SETUP_CHANGED}}`, which the test replaces with the real setup block, so 24 fixtures don't each copy 100 lines of setup.
- **S12: a missing engine `.wasm` hangs duckdb-wasm.** With `duckdb-eh.wasm` 404 (Caddy log), `instantiate` never settles and the worker fires no `error`: the page stays at "booting…". `runner-client.ts` `bootPage` now reports the 120 s timeout as `boot failed: no engine after 120 s` (RQ24 passes at ~121 s). → S14/B1: the engine needs its own boot timeout (or a `HEAD` check of the `.wasm`) so a learner sees "couldn't load the database" instead of an endless spinner.
- **S12: `setup-counts` is one row** (all 7 counts visible in the 5-row display) and `draft-table` (it counts `countries`). WASM counts = §2: taxa 143, species 76, sources 5, species_sources 591, countries 250, species_countries 472, view 76.
- **S13: ERD source `plans/002-learn-erd.mmd`**: the six tables with DuckDB types, `PK`/`FK`/`UK` (composite keys as `PK, FK`), a short note per column with real examples from today's data, and the six relationships of §3 (`taxa |o--o{ taxa`, `taxa ||--o{ species`, junctions `||--o{`, `sources ||--|{ species_sources`). All lines identifying (`--`); the view is listed beside it in 002 §3, not drawn.
- **S13: drift check = `scripts/erd-model.ts` (pure) + `run-queries --erd`.** A strict parser for the subset the schema uses (anything else fails with its line; many-to-many and one-to-one lines refused: v1 draws M:N through junctions). The catalog (`information_schema.tables/columns`, `duckdb_constraints()` PK/UNIQUE/FK) is read on the pristine database after boot, before any block. Types compare after synonyms (INT/INT4 → INTEGER, TEXT/STRING/CHAR → VARCHAR, INT8 → BIGINT). Beyond RQE1–5: the one end must match FK nullability (`||` ⇔ NOT NULL, `|o` ⇔ nullable) so the drawn cardinality is true; `|{`/`o{` on the many end are data facts, not checked. A file that doesn't parse stops the run before boot; drift and embed differences fail it after.
- **S13: RQE tests** run the pure checks against a small hand-made catalog (22 tests, milliseconds) and prove the wiring with two run-queries runs on the real WASM database (pass; and a dropped `photo_page` + stale embed, both reported). One boot per mode would add ~2 min for no extra coverage.
- **S13: `erd.ts`** renders with `mermaid.min.js` 12.2.0 via `addScriptTag` into `setContent` (no server), route guard on, `securityLevel: strict`, `theme: neutral`, `htmlLabels: false`, `fontFamily: Verdana, "DejaVu Sans", sans-serif` (close metrics, so boxes measured on the VPS fit learners' Verdana). It inserts the SVG into the page so anything it would fetch is tried (ER3), sets `width`/`height` from the viewBox and `data-source-sha256`, then draws the PNG through an `<img>` (proves `<img>` rendering; natural size must equal the viewBox). ER4 = the source has ≥ 1 entity and every entity label is in the SVG. Both files written only after every check, via temp + rename.
- **S13: ER3's trigger.** A `themeCSS` `@import` lands after mermaid's own rules, where browsers ignore it (no request, verified); a `background-image` in `themeCSS` is fetched and caught. So the guard is the real defence, not a scan of the SVG text.
- **S13: SVG size** 142,522 B (21,640 gzip -9), 1901 × 1166 px; paths are ~55 % (row backgrounds and borders). Fine as one cached file; rendering in the browser instead would ship `mermaid.min.js` 5.5 MB (1.6 MB gzip).

- **S14: results are capped by streaming, proven** (`$SP/out/cap/`, `scripts/cap-check.ts`, runner `streamCapped`). The last statement goes through `conn.send(sql, true)` and reading stops at 10 000 rows: the 21.2 M-row join stops in 0.14 s at a 387 MB renderer peak (was malloc failure, 2.6 GB). Same columns and row order as `runScript`. `cancelSent()` returns false after the early break, but closing that connection suffices (next query 50 ms). Rejected: `SELECT * FROM (…) LIMIT` wrap (bounded, 458 MB, but renames duplicate columns `a, a` → `a, a_1` and only fits queries). A sort over the join ends in `memory_limit`'s OOM (830 MB peak). Page keeps ≤ 10 000 rows, draws 200.
- **S14: eh only.** Mission B vendors no `mvp` (it loses SQL error text, S2; slower, bigger); a browser without WASM exceptions gets a "too old" notice. coi stays out (S9).
- **S14: references for the whole lesson path at every setup**, not per page: with one engine start per visit (S9), a learner's change in one lesson must not move another lesson's expected answer. B measures it (budget: ≤ 10 % of setup time); fallback = compute on lesson open while no learner statement has changed data, else ask for Reset.
- **S14: start failures.** B's engine `HEAD`s the engine `.wasm` before `instantiate` (a 404 `.wasm` hangs duckdb-wasm, S12) and keeps S9's worker-error race. DML results read "N rows changed" (S5).
- **S15: DATE/TIMESTAMP cells as DuckDB writes them.** Arrow-js returns both as epoch ms, so lesson 1's `sources.retrieved` showed `1792454400000` (cards, Table tab, run-queries). `engine.ts` `toResult` now maps by the field's Arrow type id (Date 8, Timestamp 10; Schema.fbs, stable) to `2026-10-20` / `2026-10-20 12:34:56[.789]`; no direct `apache-arrow` import. RQ25 fixture written first, seen red (`1792454400000`), then green; spike 100/100.
- **S15: lesson choices.** Lesson 3's "Which animals are frogs?" uses `LIKE '%Frog%'` (no joins yet) and says the name misses the Suriname Toad; lesson 8 answers it by order Anura with two joins on `taxa` (the toad appears). Lesson 1 shows the whole table with `ORDER BY id` (runner needs ORDER BY for multi-row; also teaches "a table has no order"). Lesson 7 lists keys from standard `information_schema.table_constraints`, filtering out DuckDB's NOT NULL rows (listed as CHECK); its exercise is the FK error (genus `Dracula`), the lesson shows the PK error. Lesson 6 lists catalog rows naming `countries` but its SQL doesn't read the table, so `ran` is right (catalog, not data).
- **S16: lesson 16's schema check is proven by run-queries.** `l16-ex` = the lesson's `traits` DDL + the answer's `species_traits` DDL + the verify query as last statement (each block runs in its own BEGIN … ROLLBACK, so it needs `traits` too). Verify = `information_schema.columns` (name, type, NOT NULL) UNION ALL `duckdb_constraints().constraint_text` (PK/FK/UNIQUE): DuckDB writes that text from the catalog, so `TEXT`, `REFERENCES species` without `(id)` and explicit NOT NULL on key columns all give the same rows (checked in node-api). The result block shows 5 of 8 rows; 002 lists all 8, and their sha256 equals the block's (`cec372f2d16e`). The ERD lines it adds are a `text` fence, since RQE5 allows exactly one `mermaid` block.
- **S16: `species_traits` without `unit`.** §2 Room to grow listed `unit` on both `traits` and `species_traits`; a unit depends on the trait (3NF, the rule lesson 14 teaches), so it's on `traits` only. `value` is VARCHAR (one column for every trait; numbers need `CAST`), stated as the design's cost; A2 decides the real one.
- **S16: lesson choices.** 9: `l09-pairs` shows raw junction rows first; exercise India (as the S5 card page). 10 and its exercise (Tiger by continent) and 11's exercise (African countries with no records) read `countries`, so `draft-table`. 11: `count(sc.country_code)` gives 0 for no partner. 12: `l12-limit` inserts a test animal with genus `Felidae` (accepted, rolled back) to show what the FK can't check. 13: exercise view `country_counts` (alias `recorded_in`, since a column named `countries` would mislabel the block). 14: `read_parquet` + `unnest` labelled DuckDB; `HAVING` introduced for the 3NF repeat query. 15: IUCN id only, and why.
- **S17: one shuffle key, no `hash()`.** run-queries bans `random()`/`hash()` (hash isn't stable across DuckDB versions), so every seeded pick sorts by `(id * 619 + seed * 211) % 1009`, ties by `id`: 1009 prime, so no ties below id 1009; a seed shifts the deck's start (rotation, not a new permutation), stated in §5. Animal of the day = deck position `(date − 2000-01-01) % deck size` (seed 0), so every animal gets its day before a repeat while the data is unchanged.
- **S17: params.** Multi-value or reused params go in a first `WITH p AS (SELECT CAST(? AS …) …)` (one bind each, typed; a JS number binds as DOUBLE); single-use ones stay inline `?`. The `-- params:` line is plan-only; B2's cookbook page shows example values as inputs. Cookbook entries carry `**Game use:**` but no `**Shown as:**` (V7 counts that line per lesson); `-- show: cards` marks the ones a page draws as cards (c01, c03, c04, c06, c08, c09, c13).
- **S17: cookbook c01–c13** = the brief's eight (c01 day, c02 quiz with same-class decoys, c03 country, c04 shared countries, c05 lineage by `WITH RECURSIVE`, c06 odd one out, c07 top countries `draft-table`, c08 team of 5 one per family) + c09 photo deck (photo games skip ids 19/47), c10 clue ladder, c11 same-genus pairs, c12 shared countries of two animals, c13 name search. S18's planned ideas (higher/lower, guess the class, memory pairs from one family, license mix, continents) left for it.
- **S18: cookbook c14–c26** = the planned ideas (c14 higher or lower on country counts, c15 guess the class, c16 family pairs for memory, c25 photo-license mix, c19 animals per continent `draft-table`) + c17 only-here (one country), c18 globetrotters (continents, `draft-table`), c20 an animal's countries by name (`draft-table`), c21 biggest families, c22 collection book, c23 next/previous (`lag`/`lead`), c24 an animal's field sources, c26 photos wanted. 13, not 12, so the app helpers (credits, sources, help wanted) are all there for B2.
- **S18: c22's collection as one text param.** The player's ids arrive as `"25,51,74"` → `CAST(string_split(…) AS INTEGER[])` + `list_contains` (DuckDB functions, said so in the entry; `FILTER` is standard). Text keeps the param a plain scalar in every binding API. Rejected: a temp table (a game would have to write it before each read).
- **S18: c14 deck rule.** Higher-or-lower draws only `range_status = 'ok'` animals: a 0 for the others means unsettled, not nowhere.
- **S19: 002 §6 choices.** B1's matcher is `scripts/derive/naturalearth.ts` (per-source naming like `col.ts`/`gbif.ts`; `countries.ts` already holds the GBIF open-records rule, which keeps using GBIF's `gbifRegion` unchanged). The ingest snapshot keeps only the 10 fields the rule reads (no geometry: the GeoJSONs are ~13 MB each) and refuses a sha256 other than the pinned one (CD11 moves there). No Postgres `countries` table: nothing reads it (KISS). Published JSON = array of 5-key objects; the source block lives in `data/countries.json` and reaches the public only via `attribution.json`. `/v1` rule evidence: species files' hashes = Baseline `dist.sha256`; `attribution.json` existing entries equal as JSON; `index.html` changes (its "Every file holds the same {{species}} records" line is reworded). DuckDB `read_csv` of a CSV written from the draft keeps `NA` as VARCHAR (node-api probe, 250/250 codes non-null); pandas not installed here, so its `NaN` behaviour stays the documented default (F-finding), fix `keep_default_na=False`; R `na.strings = character(0)`. `species.csv` unaffected (`;`-joined lists). SZ's `NAME_EN` is "Eswatini" (`countries-match.md` shows the unit "eSwatini").
- **S20: demo = Name that animal** (photo card, name hidden, four same-class names from `c02`). Rejected: higher or lower (`c14`: rewards guessing a country count, which measures recording effort, the misreading lessons 9/15 warn about), family pairs (`c16`: most UI, 8 photos must load, small at 375 px). `d01` = the day's ten: photo animals in classes with ≥ 4 animals (so every round has 4 names as data grows), shuffle key seeded by day number, returns class + family for the reveal. Day-to-day overlap 0 for every day 2026-10-22 → 2027-10-22 (node check on `species.json`). Credit stays visible during a round (license), though its Commons link can give the name away; `alt` hides the name. No storage (scores, edits), daily set only; "Play again" replays it.
- **S20: site build.** Soft navigation inside `/learn/` + `/play/` (fetch page, swap `<main>`, `pushState`, focus `<h1>`), the engine kept: §1's one start per visit. SQL once in `site/learn/sql/<q-id>.sql` (002 block minus plan-only lines), filled into `<textarea>`s via `{{sql:<q-id>}}` slots of `fillTemplate` (moved to `scripts/build/template.ts`); `answers.ts` imports the 16 exercise answers by name (explicit, not an esbuild glob), and `writeLearn` refuses a mismatch with `lessons.json`, an unused `.sql` or a missing one. All of `dist/learn/assets/` gets the fixed mtime (app files too). Parquet extension committed under `site/learn/duckdb-ext/` with a sha256 check, pending §10. E2E plan: photo hosts answered by `page.route` with a fixture after asserting the URL is a `photo.url`; worker count via `page.on("worker")` proves one start; `page.clock` fixes the game date; `Last-Modified` 2000-01-01 on assets in `serving.spec.ts`. Header changes (precompression, `immutable`, `/v1` no-cache) as one control-room change if approved.
- **S21: mission B briefs** `plans/briefs/critwire-learn-b1.md` (about 32–38 sessions) and `-b2.md` (about 18–24), split as Architecture §4 sized it. Calls: (1) each mission's "`/v1` unchanged" check uses its own Baseline hashes of a fresh `origin/main` build, since data may move between missions; B1 allows `attribution.json` to differ by the one Natural Earth entry and `index.html` to change. (2) B1 re-runs 002's `draft-table` blocks against the built countries file with the spike's `run-queries.ts` (read only) and relabels them `ran`. (3) The parquet extension's default is committed in `site/learn/` with its sha256 checked (002 §8), unless the owner picks a pinned download in §10. (4) The real-device check is a B2 handoff item that doesn't block B2's release unless the owner says so. (5) Owner's §10 answers override either brief; without one, 002's recommendation holds.
- **S22: 002 §10, 11 owner items** (B1: start time, `1.33.1-dev65.0` pin, committed parquet binary, countries file, Brazil = lesson 9; B2: system light/dark, Caddy headers (recommend all three), photos linked, no shell link, real-device check incl. Firefox; A2: further extensions) + the B1/B2 split; no answer → recommendation (briefs already say so). Added beyond §4's list: the start-time acceptance (S9), the dev pin (npm `latest` is itself dev57.0), the shell link (S11), Firefox (S10). Photo-hosting cost from `HEAD` of the 74 `photo.url`s: 5 725 607 bytes (2026-10-22). 001 pointer appended to the existing "Phase 2 viewer" line (one line).
- **S23: `-- after:` design.** Header lists earlier blocks explicitly, not transitive (`l16-check` names `l16, l16-ex`): one rule, nothing hidden. Static refusals (nothing runs): unknown id, same or later block, untested, `-- expect: error`, `setup` (runs at boot), named twice, not an id list. After-blocks run with their own `-- params` on their last statement; their `countries` reads count toward the block's `ran`/`draft-table` label (its result depends on them). A failing after-block fails the block (`q X: after Y: statement n of m: …`). The page gets the same lists from `lessons.json` (`after`, `verify`), since `-- after:` is plan-only like `-- params:`. Expected rows for `schema` are now computed like every pristine reference (l16 → l16-ex → l16-check in one ROLLBACK), not written in the lesson; the lesson's table stays for readers. Side find: `sum()` of INTEGER (HUGEINT) renders as `[10, 0, 0, 0]` in the spike's `format.ts`; no 002 block uses it; B1 note if a lesson ever does.
- **Astra code review (2026-10-22): APPROVE_WITH_CHANGES.** All 3 MUST-FIX real, checked against 002: (1) `l16-ex` re-creates `traits`, and B1 ships the block as the page's answer file; (2) c02 sorts buttons by the decoy key, so the answer sorts last unless it beats a decoy; (3) §1 caps only the last statement. Fixes = S23–S25. SHOULD-CONSIDER (ordered checks where the exercise asks for sorted output, l06/l15-style) → Summary for the owner; not adopted here (B1 can flip `any row order` per lesson).
- 2026-10-22 · S24: c02 buttons sorted by an **order key** `(id * 211 + seed * 619) % 1009` (shuffle key's multipliers swapped), stated in §5's intro. Kept arithmetic, no `hash()`/`random()`, so the §5 same-for-everyone rule holds; measured 19–31 % per position, inside the 15–35 % bar. Evidence ran as a scratch plan (`$SP/scratch/s24-positions.md`) through run-queries, so it's DuckDB-WASM (try-sql is node-api); 740 rounds = 74 photo-deck answers × seeds 1–10, all with 4 buttons.
- 2026-10-22 · S25: `runOn` streams every statement (`conn.send(sql, true)`, the parametrized last one via `stmt.send`) through one `readCapped`: past `ROW_CAP` (10 000) rows it stops reading and calls `cancelSent()` on the page's own connection (no second connection: transactions and session state stay on one); earlier statements' rows dropped, the last keeps 10 000 and gets `truncated: true` (absent otherwise, so recorded results don't change). Streaming exposed a race (erd-drift test red): `run-queries` read the catalog with three concurrent `runScript`s and each new `send` cancelled the previous stream, so all came back empty. Fixed in the engine, not the caller: `runScript`/`tableNames`/`rawQuery` run one at a time (promise chain); `restart()` drops the queue so Stop never waits on a hung query. 002 §1 says both. cap-check's S14 "wrap" case now uses `rawQuery` (uncapped) so it still measures `LIMIT` alone. Rerunning cap-check overwrites `out/cap/summary.md`; S14's hand-written notes re-appended with S25's.

## Log

- 2026-10-22 UTC · Baseline: install, typecheck, unit 66/66, build, E2E 20/20 green; dist + live /v1 hashes saved (identical, 157 files).
- 2026-10-22 06:24 UTC · Architecture: architect wrote findings F1–F10 + target design (spike harness, learners schema v1, Mermaid ERD w/ committed SVG, 16-lesson path, B1/B2 split, PGlite thresholds). No code; nothing to verify beyond review.
- 2026-10-22 06:29 UTC · Fable review: APPROVE_WITH_CHANGES, 3 MUST-FIX (species_countries FK order, reset = fresh db not DROP, esbuild/duckdb-wasm/mermaid direct deps). Design only; nothing to run.
- 2026-10-22 06:30 UTC · Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (one schema init sequence for both dbs, reset = fresh db + pristine refs, card detection needs explicit species metadata). Design only; nothing to run.
- 2026-10-22 06:41 UTC · Revision: architect resolved all 6 MUST-FIX (one setup.sql w/ countries before species_countries; reset = engine.restart() fresh db, refs pristine via rollback; esbuild/duckdb-wasm/mermaid pinned direct deps; cards only on `-- show: cards`) + adopted review SC/MISSED items. DuckDB facts rechecked in node DuckDB 1.5.6.
- 2026-10-22 06:52 UTC · Steps: planner wrote S1–S22, Verification (V0–V10 script), Failure modes (94 cases). Plan only; nothing to run.
- 2026-10-22 07:02 UTC · S1: spike scaffold in `$SP` (pins, frozen install, Caddyfile + proposed, serve/browser/build-site/bytes). Checks: guard clean, repo typecheck + 66/66, spike typecheck; `.wasm` = application/wasm; ETag stable across rebuild; `out/bytes/summary.md` (eh: 36.00 MB file, 7.98 zstd / 8.53 gzip live); serve exits 1 naming 3102/3100/3101; no Caddy left.
- 2026-10-22 07:10 UTC · S2: `sql.ts` splitStatements (SQ1–7: 7 red → 7 green), `engine.ts` (manual eh/mvp, self-hosted parquet ext mirror, settings, registerFileURL, runScript w/ statement numbers), runner page, `boot-check.ts`. `out/boot`: 0 failures, eh+mvp count 76, v1.5.6 069cc9f9b5, blocked []; mvp error text = known defect. Guard clean, repo typecheck + 66/66, spike typecheck + 7/7, no Caddy left.
- 2026-10-22 07:17 UTC · S3: Natural Earth v5.1.2 10m + GBIF enum downloaded (sha256 in SOURCES.md), `countries-draft.ts` (CD1–CD11: 10 red → 10 green), draft = 250 rows (11 from map_units), all 107 species codes + XK matched, FR/NO/XK/TW via ISO_A2_EH, GF/MQ/RE from map_units, NA = "NA" in JSON + Parquet; `out/countries-{match,sources}.md`. Guard clean, repo typecheck + 66/66, spike typecheck + 17/17.
- 2026-10-22 07:23 UTC · S4: `src/setup.sql` (16 stmts) run by `engine.ts` at boot + restart; `runner-client.ts` (shared), `schema-check.ts`; `serve.ts` fresh log per run. `out/schema`: 0 failures, counts = §2 (countries 250), F6 holds in WASM (CTAS getTableNames = [countries]; raw multi-stmt = first), restart 2.65 s, cross join → malloc error, memory_limit OOM via DISTINCT, worker alive, no-BR setup fails FK; blocked []. boot-check re-run 0 failures. Guard clean, repo typecheck + 66/66, spike typecheck + 17/17, no Caddy left.
- 2026-10-22 07:45 UTC · S5: `cards.ts`, `check.ts`, `format.ts`, card page (lesson 9) + `card-check.ts` (CR1–12, CK1–11: 23 red → green; spike 40/40). `out/card-page`: 20 checks, 0 failures: keyboard run (1 Tab, Ctrl+Enter, Tab out), Brazil 12 cards = data, credits/deeds/pages match, photos 12/12, 375 px no overflow, no-photo 19+47, table fallbacks + reason, exercise pass/col-hint/row-hint, pristine ref after delete, Reset 76/472, Stop, Schema dialog, blocked []. Guard clean, repo typecheck + 66/66, no Caddy left.
- 2026-10-22 08:00 UTC · S6: `measure.ts` (MS1–MS9 asserts first; matrix CLI, `--validate`, `--smoke`), `browser.ts` `launchMeasured` (CDP-launched Chromium, profile dir, host-resolver block, CPUQuota scope + cpu.max check), `wasm-hook.js` + `measure-worker.js`, card page `?measure`. `--validate` exit 0: CDP CPU 1.01× on the worker → CPUQuota (4.01×), network ratio 1.00/1.00. `--smoke` exit 0: 12/12 cards cold+warm, failures 0, blocked [], eh.wasm 7 976 059 B zstd = S1 exactly, warm 0 B. school-wifi 1-run check exit 0 (cards 27.1 s cold). card-check 0 failures; spike 40/40; guard clean, repo typecheck + 66/66, no Caddy/Chromium left.
- 2026-10-22 09:24 UTC · S7: `measure.ts --extras` (rebuild + reload, Reset, runaway) + §5 budgets/notes in summary; MS2 fix (Chromium left the CPUQuota scope via D-Bus → no session bus, per-load check) and throttled cells re-run. `out/duckdb-live`: 6 cells × 5, 0 failures, blocked [] everywhere; eh better bundle; §5: warm slow-4g missed (22.0 s vs 8 s), rest met; ETag stable 15/15; runaway errors cleanly 15/15 (2.6 GB peak). Guard clean, repo typecheck + 66/66, spike typecheck + 40/40, no Caddy/Chromium left.
- 2026-10-22 11:13 UTC · S8: `pglite.html` + `setup-pglite.sql` + `pglite-check.ts` (parity: tables, 37 columns, counts, 12 Brazil rows = DuckDB; blocked []); harness: main-thread freeze probe, MS3 on the concurrent batch. `out/pglite-live`: 3 cells × 5, 0 failures, blocked []; §5 for PGlite: warm slow-4g 21.6 s and memory 1.07 GB missed → switch rule not met. `out/sqljs/summary.md`. DuckDB smoke re-run green. Guard clean, repo typecheck + 66/66, spike typecheck + 40/40, no Caddy/Chromium left.
- 2026-10-22 12:14 UTC · S9: coi vendored + `/coi/` page + `coi-check.ts`: hard limit (wasm_threads parquet ext non-shared memory → LinkError; instantiate hangs 6/10), gate not met, no coi matrix; photos crossorigin (12/12 under COEP); engine fails loudly on worker error. `build-site --precompress`, `bytes.ts` both configs, `classroom.ts` (Caddy CPU 3.47 s live vs 0.05 s precompressed). `out/duckdb-proposed`: 3 cells × 5, 0 failures, blocked []; warm slow-4g 23.9 s missed, rest met. Engine verdict: DuckDB-WASM eh stays (PGlite misses 2 budgets, 1.02–1.11× on the missed one). card-check, smoke, boot-check 0 failures; guard clean, repo typecheck + 66/66, spike typecheck + 40/40, no Caddy/Chromium left.
- 2026-10-22 12:28 UTC · S10: inet + spatial (eh, mvp) mirrored; `ext-mirror-check.ts` 0 failures: INSTALL+LOAD from our origin, signatures on, tampered inet refused, application/wasm, blocked []; bytes both configs (spatial 6.33 MB zstd live / 4.53 br); boot-check (now `LOAD fts`) 0 failures. Firefox: GTK libs need apt → not run, recorded. Guard clean, repo typecheck + 66/66, spike typecheck + 40/40, no Caddy/Chromium left.
- 2026-10-22 12:37 UTC · S11: `shell-page.ts` + `shell.html` (embed on engine.db, shell_bg.wasm vendored, xterm CSS), `shell-check.ts` → `out/shell`: 0 failures, blocked []; 76 typed at first prompt (WebGL side-channel + DOM text), URL-hash query 250, phone key events ok; known: no screen-reader output, on-screen-keyboard text dropped, busy typing lost, broken WebGL → no shell; +0.5 MB zstd. Q4 → own editor. boot-check 0 failures. Guard clean, repo typecheck + 66/66, spike typecheck + 40/40, no Caddy/Chromium left.
- 2026-10-22 13:05 UTC · S12: RQ1–RQ24 first (26 fixture plans + test: 32 red → green; spike 72/72); `run-queries.ts` + `plan-queries.ts` (static checks before boot, per-statement labels, BEGIN … ROLLBACK isolation, render/hash, --check/--update), `sql.ts` `codeOnly`; found a 404 `.wasm` hangs duckdb-wasm (boot timeout now = boot failure). `plans/002-learn.md`: title, intro, 10 headings, §2 in full + `setup`/`setup-counts`. `--update` → `--check` exit 0, second `--update` no change, log line 1 = duckdb-wasm eh v1.5.6. Guard clean, repo typecheck + 66/66, spike typecheck, no Caddy/Chromium left.
- 2026-10-22 13:14 UTC · S13: RQE1–5 + ER1–4 first (erd-drift.test.ts failed to load: 22; erd.test.ts 5/5 red → green; spike 99/99); `plans/002-learn-erd.mmd`; `erd-model.ts` + `run-queries --erd` (catalog vs ERD, embed check); `erd.ts` → `$SP/erd/schema.{svg,png}` (no foreignObject; PNG read: crow's feet, keys, notes readable); 002 §3 written (diagram, view, reading guide, Mermaid vs DBML/PlantUML/D2/DOT, dialog + `/learn/schema/` dictionary, `pnpm erd` + stale refusal, why not mermaid-cli). `run-queries 002 --check --erd` exit 0 ("6 tables, 1 view, 6 relationships match"); Guard ok (typecheck, test 66/66).
- 2026-10-22 13:29 UTC · S14: `cap-check.ts` probe (`out/cap`: stream cap 10 047 rows 0.14 s / 387 MB vs 2.6 GB; wrap renames dup cols; sort → memory_limit OOM; 0 failures, blocked []); 002 §1 written (recommendation + key numbers vs PGlite, method, Q1–Q5, §5 verdict table, Caddy live vs proposed, shell vs editor, engine code, cards/checks/Reset/Stop/cap, emulation limits). `run-queries --check --erd` exit 0; spike typecheck + 99/99; Guard ok (typecheck, 66/66, only plans/); no Caddy/Chromium left.
- 2026-10-22 13:58 UTC · S15: 002 §4 intro + lessons 1–8 (tables, select, where, null, counting, erd, keys, one-to-many; 25 blocks incl. 2 expected-error); DATE/TIMESTAMP fix in `engine.ts` (RQ25 red → green; spike 100/100). `run-queries --update` diff read; `--check --erd` exit 0 (ERD 6 tables, 1 view, 6 rels); each lesson has `l<nn>-ex`, Shown as, Check; `-- show: cards` exactly in 1,2,3,4,7,8. Guard ok (only plans/, typecheck, 66/66); no Caddy/Chromium left.
- 2026-10-22 13:50 UTC · S16: 002 §4 lessons 9–16 (many-to-many, countries, left-join, hierarchy, views, normalization, sources, design) + after-16 note (A2 joins on `species.id`, `countries.code`; spatial from the mirror); §2 traits line fixed. `run-queries --update` (48 blocks) diff read; `--check --erd` exit 0 (ERD 6/1/6); 16 lessons, each with `l<nn>-ex`, Shown as, Check; `-- show: cards` exactly in 1–4, 7–9, 11; l16 schema rows hash = block. Guard ok (only plans/, typecheck, 66/66); no Caddy/Chromium left.
- 2026-10-22 14:03 UTC · S17: 002 §5 intro (params, shuffle key, file per query, open-records wording) + c01–c13. `run-queries --update` (13 new blocks) diff read, matches node-api scratch; `--check --erd` exit 0 (61 blocks, ERD 6/1/6); 13 `c<nn>` blocks = 13 headings = 13 Game use. Spike 100/100; Guard ok (only plans/, typecheck, 66/66); no Caddy/Chromium left.
- 2026-10-22 14:15 UTC · S18: 002 §5 c14–c26 (higher/lower, guess class, family pairs, only here, globetrotters, per continent, an animal's countries, biggest families, collection book, next/prev, field sources, photo licenses, photos wanted). `run-queries --update` (13 new blocks) diff read, matches node-api scratch; `--check --erd` exit 0 (74 blocks, ERD 6/1/6); 26 `c<nn>` blocks = 26 headings = 26 Game use. Spike 100/100; Guard ok (only plans/, typecheck, 66/66); no test Caddy/Chromium left.
- 2026-10-22 14:23 UTC · S19: 002 §6 countries file (fields; NE vs GBIF, verbatim license quotes, hostability; v5.1.2 1:10m pin + sha256; 6-part matching rule; 107-row match table + XK note; B1 ingest/derive/build; credit; `/v1` additions-only rule with Baseline-hash evidence; `NA` CSV note; draft-table relabel) + `k01` (107 used, 107 with a row, 0 unmatched). `--update` diff read (k01 only, placeholder line removed); `--check --erd` exit 0 (75 blocks, ERD 6/1/6); match table 107 code rows. Spike tc + 100/100; Guard ok (only plans/, typecheck, 66/66); ports free.
- 2026-10-22 14:38 UTC · S20: 002 §7 (3 ideas, pick Name that animal: rules, `d01` + `c02`, state functions, name hiding, phone layout 375 px, before-load) + §8 (URLs, one engine start per visit via soft nav, file layout, `fillTemplate`/`writeLearn` steps, pins, typecheck, serving, editor, a11y, before-load, playground = Phase 2 viewer, E2E B1/B2 specs + artifacts). `--update` diff read (d01 only); `--check --erd` exit 0 (76 blocks, ERD 6/1/6); every §7/§8 cookbook id exists. Spike tc + 100/100; Guard ok (only plans/, typecheck, 66/66); ports free.
- 2026-10-22 14:41 UTC · S21: briefs `plans/briefs/critwire-learn-b1.md` (countries file, engine, schema, ERD, 16 lessons, their E2E; ~32–38 sessions) + `-b2.md` (cookbook, playground + CSV, game, their E2E, Caddy headers if approved; ~18–24), six ops headings each; 002 §9 (paths, why split, order). Guard ok (only plans/, typecheck, test 0 fail); `run-queries --check --erd`: 76 blocks, 0 failures, 0 differences, ERD matches.
- 2026-10-22 14:44 UTC · S22: 002 §10 (11 owner items + split, each recommendation + cost) and the 001 "Phase 2 viewer" pointer. Guard: only plans/ changed, typecheck ok, test 66/66. V6 `--check --erd`: 76 blocks, 0 failures, 0 differences, 0 untested, ERD 6/1/6; V7: 10 sections, 16 lessons with exercises, 26 cookbook, both briefs complete, 001 pointer; V8: schema.svg/png, no foreignObject. Summary inputs: DuckDB-WASM eh 1.33.1-dev65.0 (9.02 MB wire, first result 2.9/27.1/64.2 s first visit, 2.5/15.1/22.0 s returning, 518 MB peak) vs PGlite 0.5.10 (6.44 MB, 4.0/35.7/70.3, 2.4/14.0/21.6, 1 440 MB, main-thread freeze 20.3 s at 4×); own `<textarea>` editor, shell not built; self-hosted extensions work, signatures on (parquet, inet, spatial); 16 lessons; 26 cookbook; demo Name that animal; countries Natural Earth v5.1.2; briefs `plans/briefs/critwire-learn-b{1,2}.md`; owner choices 002 §10.
- 2026-10-22 14:47 UTC · Code review (Astra, `--code origin/main`): exit 0, APPROVE_WITH_CHANGES, 3 MUST-FIX accepted → S23–S25 added; 1 SHOULD-CONSIDER → Summary. Plan only; nothing to run.
- 2026-10-22 14:57 UTC · S23: runner `-- after:` header (RQ26 fixtures static/fails/pass: 3 red → green; spike typecheck + 103/103); 002 `l16-ex` = `species_traits` DDL alone (after l16), new `l16-check` (after l16, l16-ex), same 8-row hash `cec372f2d16e`; §1 Prerequisites + Pristine references, §8 `lessons.json` after/verify, `sql/` plan-only lines, `answers.ts`, E2E; intro; B1 brief fact. `--update` diff read (l16-ex, l16-check only); `--check --erd` exit 0 (77 blocks, ERD 6/1/6). Guard ok (only plans/, typecheck, 66/66); V7 pass; ports free.
- 2026-10-22 15:10 UTC · S24: c02 buttons by order key `(id*211 + seed*619) % 1009` (§5 intro, c02, §7, B2 brief). Answer position over 74 photo answers × seeds 1–10 (740 rounds, DuckDB-WASM, `$SP/out/s24-positions/`): old 30/28/29/653 (88 % last), new 181/227/190/142 (24/31/26/19 %); node-api scratch same. `--update` diff read (c02 row order only, same 4 rows); `--check --erd` exit 0 (77 blocks, ERD 6/1/6). Guard ok (only plans/, typecheck, 66/66); ports free.
- 2026-10-22 15:24 UTC · S25: every statement streamed + capped (`$SP/src/engine.ts` `readCapped`, `serial`). cap-check "script:" cases red first on old code (`$SP/scratch/s25-red/`: malloc at 2 419 MB, 3.6 s); green: `<runaway>; SELECT count(*) FROM species` 76 in 0.13 s, peak 390 MB; runaway alone 10 000 rows truncated, 393 MB; later INSERT applies; exact-cap not truncated; empty result keeps columns. cap-check 0 failures (18 checks), boot-check 0, card-check 0, blocked [] each; spike typecheck + 103/103; `--check --erd` exit 0 (77 blocks, 0 differences, ERD 6/1/6). 002 §1 (Huge results, one call at a time), B1 engine fact. Guard ok (only plans/, typecheck, 66/66); ports free.

## Summary
