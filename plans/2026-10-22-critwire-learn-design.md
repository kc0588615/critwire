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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-22 UTC · Baseline: install, typecheck, unit 66/66, build, E2E 20/20 green; dist + live /v1 hashes saved (identical, 157 files).

## Summary
