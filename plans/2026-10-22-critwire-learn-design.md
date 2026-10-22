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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-22 UTC · Baseline: install, typecheck, unit 66/66, build, E2E 20/20 green; dist + live /v1 hashes saved (identical, 157 files).
- 2026-10-22 06:24 UTC · Architecture: architect wrote findings F1–F10 + target design (spike harness, learners schema v1, Mermaid ERD w/ committed SVG, 16-lesson path, B1/B2 split, PGlite thresholds). No code; nothing to verify beyond review.
- 2026-10-22 06:29 UTC · Fable review: APPROVE_WITH_CHANGES, 3 MUST-FIX (species_countries FK order, reset = fresh db not DROP, esbuild/duckdb-wasm/mermaid direct deps). Design only; nothing to run.
- 2026-10-22 06:30 UTC · Astra review: APPROVE_WITH_CHANGES, 3 MUST-FIX (one schema init sequence for both dbs, reset = fresh db + pristine refs, card detection needs explicit species metadata). Design only; nothing to run.
- 2026-10-22 06:41 UTC · Revision: architect resolved all 6 MUST-FIX (one setup.sql w/ countries before species_countries; reset = engine.restart() fresh db, refs pristine via rollback; esbuild/duckdb-wasm/mermaid pinned direct deps; cards only on `-- show: cards`) + adopted review SC/MISSED items. DuckDB facts rechecked in node DuckDB 1.5.6.

## Summary
