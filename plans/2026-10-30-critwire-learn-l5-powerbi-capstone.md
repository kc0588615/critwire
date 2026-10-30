---
mission: critwire-learn-l5-powerbi-capstone
project: critwire
branch: agent/critwire-learn-l5-powerbi-capstone
status: active
started: 2026-10-30 04:23 UTC
---

# Mission: critwire Learn L5, Power BI and the capstone: the habitat fact, p1–p4, c1 (mission L5)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l5-powerbi-capstone.md, then run:
     mission start critwire <that file>        (base: main after mission L4 is merged and live)
     Start only after L4 (critwire-learn-l4-stats-etl) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§3.5, §5.6, §5.7, §6.3, §7, §9, §A.3).
     Chain: L1 → L2 → L3 → L4 → L5 (this, the last).
     Estimate: about 22–28 sessions (6 pipeline stages, about 16 steps, code review, verification, release). -->

### Goal

critwire Learn is complete: the Power BI track and the capstone go live, and every module on the map is built:
- **The habitat fact in the star** (004 §6.3, §A.3): `writeStar` adds `dim_habitat_class` and `fact_country_habitat` (grain: one country × one habitat class, `est_area_km2`) from L3's summaries for every country; `/learn/data/star/` and its manifest hold all eight files; the star ERD's drift check passes.
- **p1–p4 written in full** (004 §5.6 outlines → full modules): Power Query on `Web.Contents` with named critwire CSV files and an explicit culture, relationships, DAX measures, maps with honest titles, refresh. Power Query M and DAX stay `untested: Power BI is Windows-only`; their inputs are verified (`-- input:` lines: header, keys, rows, sha256), and each DAX block keeps its PostGIS twin (`p2/p3/p4-check`) giving the table Power BI should show.
- **c1 written in full** (004 §5.7): the pipeline from L1's data through Gi\* on hexagons to a report and a static JSON feed a game reads, labelled as records, never range. `/learn/labs/c1-feed.json` (written by `c1-feed`'s query) and `c1-feed.schema.json` (JSON Schema 2020-12), and the feed validates against it in E2E.
- **A curriculum pass**: all 33 modules `built` in `curriculum.json`; every page's prerequisites, hours and links checked; 004 §2's map and the site agree.
- **A handoff item** for the owner's Windows check (004 §10): open Power BI Desktop, run p1's query and p2–p4's DAX query view queries against the live files, compare each table with its PostGIS twin, report.
- It's live: the mission merges and deploys at its end.

### Why

Power BI is how the owner's work reaches people; the star schema from d6 is its input, and the capstone ties every track together into something a game developer ships: an honest data feed for Critter Connect-style encounters, built from open records.

### Scope

In:
- `scripts/build/` (`writeStar`'s habitat fact, the feed and its schema, the manifest), `site/learn/` (p and c modules, blocks, curriculum state), the star ERD source, `learn:check` (`-- input:` checks for Power BI blocks, if L2 didn't port them), `e2e/`, `AGENTS.md`, `plans/004-learn-curriculum.md` (p1–p4 and c1 in full; fixes where code proves it wrong).
- A JSON Schema validator as a pinned dev dependency, if the E2E needs one (none is in the pins today).
- One handoff item (the Windows check) in `/srv/critter-ai/handoff/critwire.md`.

Out:
- A `.pbix` file (it can't be built or tested here; 004 §7.3).
- Critter Connect's repository and its servers: the feed is a critwire download; the game would ship its own copy (no CORS needed).
- Changes to `/v1`, to L1's sample or to L3's habitat files; new datasets.
- The `critwire` database except through `deploy critwire`; schema `learn_spatial`; IUCN data; Wikipedia prose.

### Definition of done

- `pnpm typecheck`, `pnpm test` and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped: `learn-map` shows all 33 modules built; `learn-labs` checks every p and c page, the feed against its schema, and every Power BI block's inputs; `learn-data` checks the eight star files' key coverage (no NULL foreign key; unknown members `ZZ` and `-1`).
- **Results:** every p and c block keeps the sha256 004 records, except those L3 marked as recorded on the habitat stand-ins (`p1-load`'s inputs, `p3-check`, `p3-measures`): those are re-run on L3's summaries, and the pages and 004 updated in the same commit with what changed. `learn:check` green twice; leak query empty; `learn_spatial` canary unchanged.
- **The 50 MB cap** holds with the full star.
- **Existing files unchanged** except the star, `manifest.json` and pages: compared with the Baseline `sha256sum` list.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l5-powerbi-capstone/e2e/`: Playwright report, traces, `results.json`, screenshots of the map (all built), p3 and c1 at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every `/learn/` page returns 200; `/learn/data/star/*` hash as their manifest says; `c1-feed.json` validates against `c1-feed.schema.json` as served.
- The plan's Summary gives: what shipped, the course in numbers (modules, blocks `ran`/`untested`, hours), every deviation from 004, the release record, and the Windows check's handoff item.

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Untestable is said, not hidden**: a Power BI block's page shows "Not run by critwire: Power BI Desktop is Windows-only", its inputs and its PostGIS twin.
- **Records, never range**: the feed's `meaning` field, every title and every map say so.
- **Simplest approach that works**; the feed is a static file.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

### Notes

- **Needs from L4:** s5's Gi\* (temp view `s5_gistar`, which `c1-feed` reads with `-- after: s5-gistar`), s4's cells, e4's credit query, the Python downloads. Read L4's Summary first.
- **Facts the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S11, S26, S27):
  - DuckDB's star is canonical; PostgreSQL's export differs only in whole doubles (`805.0` vs `805`), equal in value.
  - Each DAX block is a DAX query view query (`DEFINE MEASURE` + `EVALUATE`), so the Windows check compares one table per module with its PostGIS twin.
  - The feed: 307 cells, weights summing to 0.999954 (the game draws by weight ÷ sum), 37 recording hot spots (s5's 39 FDR hot cells less 2 empty ones), 7 datasets to credit, about 35 KB.
  - p3's forest ratio ran on the stand-ins (TT 0.698 records per 1,000 km²); L3's summaries change it.
- **Pointers into 004:** Power BI setup §3.5, Power BI §5.6, capstone §5.7, star ERD §6.3, site §7, chain §9, owner's choices §10, star spike §A.3.

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

#### Review items assigned to L5

The review's numbering: SC = SHOULD-CHANGE.

1. **SC9 (L5 part):**
   - `p3-check` uses `NULLIF` (or the equivalent) so that zero and unknown denominators behave like DAX `DIVIDE`.
   - Call p3's ratio "**sample records divided by forest area**", not sampling effort: the numerator includes records outside forest and is capped per species.
   - The habitat fact gets `est_area_km2 >= 0` and its foreign keys are NOT NULL, with the unknown members kept.
   - The Windows-check handoff item lists: empty numerics, Namibia (`NA` must not become NULL), the unknown members, and species-filtered credits.
2. Say plainly that the SQL twins verify arithmetic, not M parsing, relationship direction, filter context or DAX execution, both on the pages and in the handoff item.
3. The capstone's diagrams (pipeline, feed) use diagram-design under the addendum's diagram rule.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `afed437` (= `origin/main` `67ceb8f`, L4 merged and live, + mission start), 2026-10-30, db `critwire_dev` (`CRITWIRE_DB_TARGET=critwire_dev`, `LEARN_PG_URL` as `critwire_lab`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-l5-powerbi-capstone/baseline-*.log` (`$S` below).
- `pnpm install --frozen-lockfile`: ok. No migrations (build rebuilds tables). No lint script; typecheck is the static check.
- `pnpm learn:venv`: ok (CPython 3.12.3, 48 packages, both pin files); `uv pip check`: clean.
- `pnpm typecheck`: ok (2 s). `pnpm test`: 664/664 (2 min 10 s).
- `pnpm build` (plain): ok, 6.8 s; `dist/learn/data/` 95,936,992 B, committed lab data 18,822,906 B (cap 120,000,000 each); `dist/` 294 files. Star today: 6 CSVs + `manifest.json` (no `dim_habitat_class`, `fact_country_habitat`).
- `pnpm test:db`: 138/138 (21 min 28 s), after the build.
- `pnpm learn:check`: ok (9 min 20 s); canary `learn_spatial` unchanged, leak check empty, `checked.json` unchanged, working tree clean.
- `pnpm e2e`: 96/96 passed (7.2 min); artifacts `$S/baseline-e2e/` (748 MB).
- sha256 lists for Definition of done: `$S/baseline-sha256-repo.txt` (895 tracked files) and `$S/baseline-sha256-dist.txt` (294 `dist/` files).
- Roles: `critwire_live` and `critwire_lab` exist. Handoff: no `done` items; H3 (GBIF retention) waits on the owner, blocks nothing. Session 1 of the mission.
- For the architect: L4's Summary (`plans/2026-10-29-critwire-learn-l4-stats-etl.md`, Summary; Python engine, s4/s5 boot blocks, downloads); Codex db/backend review `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md` (L5 items in the brief's addendum: SC9 L5 part, twins-verify-arithmetic wording, capstone diagrams). Disk: 11 GB free; E2E artifacts ≈ 750 MB per run.

## Architecture

Read on `6e8d566`. Line refs are to that commit. Facts marked "verified" were run during this stage (DuckDB/psql probes on the committed data; no build, learn:check or e2e).

### Findings (ranked by impact)

**F1. `-- after:` can't cross pages, but 004's twins and feed need it (blocks p2–p4, c1).** `p2-check`, `p3-check`, `p4-check` name d6's `d6-star-*` blocks and `c1-feed` names `s5-gistar`, all on other pages. Today:
- `scripts/learn/blocks.ts` `lintPage` refuses them ("unknown block … (not on this page)"); `course.ts` `assembleCourse` passes only `py-connect` as a helper.
- `scripts/learn/assemble.ts` `sqlDownload`/`blockPart` resolve `-- after:` in the page's own `byId` and would throw. Boot detection would also miss `s4-cells` for `c1.sql`, because `s5-gistar`'s code names `s4_cells` and that code isn't on c1's page.
- `scripts/learn/freshness.ts` `afterChain` is page-scoped, so `p3-check`'s key would leave out the d6 blocks. Editing them would then leave `p3-check` looking fresh while its result is stale (a correctness hole).
- `scripts/learn/runner.ts:566` `blockRuns` builds its lookup from the run list. Whole runs work by accident; `--module p3` fails.
- `scripts/learn/port.ts` `helpers()` refuses them too, so `learn:port p2` can't port.
- `lintPage` builds the privilege chain (`blockRuleErrors(b, chain)`) from page blocks only.

Breaks: established interfaces (004 §0's runner semantics) and fail fast (stale keys pass).

**F2. `d6-star-fact-country-habitat`'s CHECK breaks `writeStar` in DuckDB (bug, verified).** `CHECK (est_area_km2 >= 0 AND est_area_km2 < 'Infinity')` (L3 S10, against NaN) fails on insert in DuckDB: `Could not convert string "Infinity" to DECIMAL(12,2)`. Adding the block to `STAR_BLOCKS` as it stands fails the build. Facts behind the fix, all verified:
- PostgreSQL can't store Infinity in `numeric(12,2)` ("cannot hold an infinite value").
- In PostgreSQL, `'NaN'::numeric(12,2) <= 9999999999.99` is false.
- DuckDB accepts `CHECK (x >= 0 AND x <= 9999999999.99)` and refuses −1.

Fix: that bound. One text for both engines, still non-negative and NaN-proof. The block's result is a count summary, so its sha256 `80b11c41e5b3` holds. The lab table's own CHECK (`db/learn/lab-ddl.sql`, PostGIS only) stays.

**F3. The star publishes 6 of 8 files; the habitat fact is wired as "planned".** Where:
- `scripts/build/learn/star.ts:30` `STAR_BLOCKS` has six ids.
- `scripts/build/learn/credits.ts:47` `LAB_FILES` lacks the two star CSVs.
- `site/learn/erd/star.mmd` carries `%% planned: dim_habitat_class, fact_country_habitat` (and its accDescr).
- `site/learn/pages/schema-star.html` has a "Planned" section with a `{{planned}}` slot. `schema-html.ts` refuses that slot once nothing is planned.
- `site/learn/modules/d6.html:34` says "not yet published".
- `scripts/build/learn/star.test.ts` SB1/SB4 say "six"; 004 §5.2 d6 says "later (L5)" and §6.3 still calls the two tables planned.

Already right, no change needed: the data reach DuckDB already (`projection.ts` `LAB_TABLES` loads `habitat_classes` and `country_habitats`); the DDL already has NOT NULL foreign keys and a PK; `markerDrift` + `starMeta` already check the ERD against the manifest; `normType` strips `DECIMAL(12,2)` to `DECIMAL`.

Data, verified: 5,578 rows; 246 countries, all in `countries`; `est_area_km2` min 0.01, none 0; 75 classes, 13 level-1 (including 1700 Other); 215 countries have forest, min 0.02 km².

No habitat unknown member is needed: no fact row lacks a class (d6's rule: a member per kind of missing). `UNKNOWN_MEMBERS` (`ZZ`, `-1`) stays.

**F4. The feed can't be derived from a recorded result, and the build can't compute it.**
- A recorded SQL result keeps 5 rows, cells cut at 60 characters (`result.ts` `MAX_CELL`, `SHOWN_ROWS`).
- A Python result is its whole stdout, but `learn:port` seeds results from 004, which would put the 35 KB feed into 004.
- The build has no PostGIS, and `c1-feed` needs `ST_*` and the boot table `s4_cells`.

So the feed must be a file `learn:check` writes, bound to a recorded result the build can recheck offline. 004 §7.3 says "written by `c1-feed`'s query" and specifies no mechanism.

**F5. The Power BI block model lacks what p/c need.**
- Inputs are only `star/<file>.csv`: `blocks.ts:79` `STAR_INPUT`, `star.ts` `starInputErrors`, `module-html.ts` `powerBiHtml` (`ctx.star`), and the e2e Power BI tests.
- `module-html.ts:207` refuses a Power BI exercise.
- Nothing declares or shows a DAX block's PostGIS twin (004 §7.2), and no page says what the twins don't check (Addendum item 2).

**F6. Already in place (fine; reuse, don't rebuild).**
- `.m`/`.dax` parsing, the `// input:` lint and the forced status (`blocks.ts` `parseBlock`).
- The input checks themselves (`star-check.ts` `checkInput`: header, keys, NULL FK, rows, sha256), run on the served files in `e2e/learn-data.spec.ts:153` and on dist in `e2e/learn-labs.spec.ts:167`; the build checks input names (`starInputErrors`). L2 ported them, so **`learn:check` needs no `-- input:` stage**: 004 §0 makes E2E the Power BI runner.
- `learn:port` knows `m`/`dax` and the p/c headings (`port.ts` `EXT`, `MODULE`).
- `pbi-smoke` is on the setup page. `.diagram-design` (`profile: critwire`) exists, with 9 diagrams.
- `checked.json` freshness (`freshness.ts`), the draft/plain policy (`site.ts` `assertLabsFresh`), and the boot-block rules for downloads.

**F7. Where 004 is wrong or unclear, against code and data.**
- p3: the Goal says the ratio "measures how much recording happened per area of forest" (SC9: the numerator includes records outside forest and is capped per species). `p3-check` divides without `NULLIF` (SC9). `p3-check`, `p3-measures`' Expected, p1's Expected (`fact_country_habitat 35`) and §A.3's habitat rows/bytes are all stand-in numbers.
- §2: p/c Depth `outline`; c1 Tool "all", but §5.7 and `curriculum.json` say PG + Py + PBI. p2–p4 have PostGIS twins but are badged PBI only, and §3's PG list omits them.
- §5.7's "cell CSV beside the star" for the report is an extra file. The report can read the feed itself (T4).
- §6.3's planned paragraph and d6's "later (L5)".
- §0 and §7.3: the `-- after:` scope (F1) and the feed's writer (F4) are unspecified.
- The brief's "50 MB cap": the cap is 120,000,000 bytes (H5). Estimated growth ≈ +0.1 MB (two CSVs ≈ 90 KB plus manifest lines), so `/learn/data/` ≈ 96.0 MB.
- Pages say "in preparation" for p1, p2 and c1 (`d5.html:24`, `d6.html:16,40`, `s5.html:17`); they must become links (AGENTS.md: link only pages that exist).

**F8. Risks.**
- First repo run of `p2-check` (`022cceeadc7e`), `p4-check` (`26cbac454e1c`) and `c1-feed` (`0ed7d7c256c4`): a difference is a bug to find, not a number to update.
- Disk is 9.2 GB free (not 11): about 750 MB per e2e run, keep two.
- Each `learn:check` run takes about 9–10 min and each `test:db` run about 22 min: one heavy run per session.

### Target design

**T1. Cross-page `-- after:` for PostGIS blocks (fixes F1).**
- Rule (004 §0): a PostGIS block's `-- after:` may name an earlier block of its own page, or a ran PostGIS block on a page of its module's **prerequisites, transitively**. Python keeps "its page or `py-connect`". DuckDB stays page-only, because the browser runs `data-after` from the page DOM.
- One query in `course.ts`, `afterScope(curriculum, pageId) → Set<pageId>`, used in two places:
  - `assembleCourse`: it gains the curriculum, then passes each page's in-scope blocks to `lintPage` as helpers.
  - `port.ts` `helpers()`: it reads `site/learn/curriculum.json` and ports the scope pages' blocks from 004.
- `lintPage`: the chain becomes `(first.get(a) ?? helpers.get(a))`, and helpers are refused for DuckDB blocks.
- Everyone else resolves ids course-wide, and the lint alone decides scope. Ids are unique course-wide: one file per id, and `assembleCourse` refuses a block on two pages.
  - `runner.ts` `blockRuns`/`runBlock` take the course's `Map<id, Block>`; `check.ts` passes it.
  - `assemble.ts` `sqlDownload` uses `all` for `byId`, so `used` sees `s5-gistar`'s code and `c1.sql` gets `s4-cells`.
  - `freshness.ts` `afterChain` uses `all`.
- Byte-neutral today: no existing block has a cross-page `-- after:`, so every existing download, key and page is unchanged.

**T2. The habitat fact in the star (fixes F2, F3; Goal 1).**
- `d6-star-fact-country-habitat.sql` and 004 d6 get the F2 CHECK in one commit; the result sha stays the same, the reason goes under Decisions. Its key and `d6-drill-across`'s go stale, so `learn:check` re-runs them. `/learn/labs/d6.sql` changes: a recorded deviation from the baseline sha256 list.
- `STAR_BLOCKS` += `d6-star-dim-habitat-class`, `d6-star-fact-country-habitat`, in that order (`starBlocks` checks the `-- after:` order).
- `LAB_FILES` gets two entries: `star/dim_habitat_class.csv` → `jung-habitat`; `star/fact_country_habitat.csv` → `jung-habitat`, `natural-earth`, as `country_habitats.parquet`.
- Shapes, from d6's DDL, which stays the one definition:
  - `dim_habitat_class(habitat_code INTEGER PK, name, level1_code, level1_name)`.
  - `fact_country_habitat(country_code VARCHAR NOT NULL FK dim_country, habitat_code INTEGER NOT NULL FK dim_habitat_class, est_area_km2 DECIMAL(12,2) NOT NULL CHECK (>= 0 AND <= 9999999999.99), PK (country_code, habitat_code))`, rows ordered by the PK.
- The cross-engine guard compares Node DuckDB's result with the PostGIS records (`37ad5647623e`, `80b11c41e5b3`).
- The manifest gains both files (columns, keys from DuckDB's catalog, rows, bytes, sha256, credits); the data manifest and index list them through the existing `writeLabIndex`.
- `star.mmd`: drop the `%% planned:` line and its comment, and update the accDescr. `schema-star.html`: drop the "Planned" section and its `{{planned}}` slot, keeping a sentence that the habitat areas are map estimates.
- `pnpm erd` re-renders `star.svg`. `d6.html` and 004 d6/§6.3 say "published".
- The drift check passes unexcused, and `learn-data`'s star test covers 8 files automatically (`STAR_FILES`): no NULL foreign key, `ZZ` and `-1` present, `NA` stays Namibia.
- `star.test.ts`'s cases are updated first (eight files; the CHECK runs in DuckDB).

**T3. The Power BI block model (fixes F5).**
- **`// twin: <id>`** (DAX only, required). It names a ran PostGIS block on the same page. `PBI_HEADERS` += `twin`; `lintPage` refuses a DAX block without one, an M block with one, and a twin that is missing, not PostGIS or not ran.
- **Page text.** `powerBiHtml` keeps "Not run by critwire: Power BI Desktop is Windows-only." exactly as now, and for DAX adds one `<p class="twin">`: "The table it should return, from the same files in PostGIS: <a href="#q-…">…</a>. That twin checks the arithmetic only, not M parsing, relationship direction, filter context or DAX execution." No new CSS: reuse existing styles, so the asset hashes stay.
- **Inputs.** `// input:` is `star/<file>.csv` (under `/learn/data/`) or `labs/c1-feed.json` (under `/learn/`).
  - `STAR_INPUT` becomes `INPUT = /^(star\/[a-z_]+\.csv|labs\/c1-feed\.json)$/`.
  - `starInputErrors` → `inputErrors`, allowing `STAR_FILES` ∪ {`FEED.input`}.
  - `PageContext.star` → `inputs: Map<input, {url, rows, sha256}>`. `writeLearn` builds it from the star manifest and from the published feed (rows = `cells.length`).
  - In `--draft`, a missing input renders "not built yet (draft build)", as `labResult` does, so c1's page can build before the first feed exists. A plain build throws.
- **Exercises.** `{{exercise:}}` is allowed for Power BI, rendered in the same `<details class="exercise-answer">` as lab blocks; `skip` is still refused.

**T4. The feed and its schema (fixes F4; Goal 3).** Everything below hangs off one constant in a new pure module, `scripts/learn/feed.ts`: `FEED = { block: "c1-feed-file", column: "feed", file: "site/learn/labs/checked/c1-feed.json", schema: "site/learn/labs/c1-feed.schema.json", input: "labs/c1-feed.json" }`.
- **Blocks (004 §5.7):**
  - `c1-feed` (after `s5-gistar`) becomes `CREATE OR REPLACE TEMP VIEW c1_feed AS <004's WITH … SELECT jsonb_build_object(…) AS doc FROM cells>;` followed by 004's summary query `FROM c1_feed`. It is the same doc and the same summary row, so the sha `0ed7d7c256c4` must hold.
  - New `c1-feed-file` (after `s5-gistar, c1-feed`): `SELECT doc::text AS feed FROM c1_feed;`. Its result is the whole feed as one text cell; the 60-character render goes in 004, and its sha256 covers the full text.
- **Write.** `Outcome` (record.ts) gains `result?: Result`, the uncut result `runBlock` rendered from.
  - After `settleResults` succeeds in a whole `--update` run, `check.ts` calls `writeFeed(runs)`. It requires exactly one row and one text column `feed`, and writes `FEED.file` byte for byte (34,848 B per 004; no newline) when it changed.
  - `--module` and plain runs write nothing.
- **Bind (build, offline).** `feedStaleness(feedText, recorded)` in `feed.ts` requires `renderResult(FEED.block, {columns: ["feed"], rows: [[feedText]]}) === checked/c1-feed-file.txt`. That recorded result is itself stamped in `checked.json`, so the existing chain proves the file came from the query.
  - It is called from `assertLabsFresh`: plain refuses ("…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check --update"), `--draft` warns. A missing feed is the same error.
  - No new freshness field and no `checked.json` format change.
- **Publish.** `writeLearn` copies `FEED.file` → `dist/learn/labs/c1-feed.json` and `FEED.schema` → `dist/learn/labs/c1-feed.schema.json`. They sit outside `/learn/data/`, so the data cap and manifest are untouched.
- **Schema source.** `site/learn/labs/c1-feed.schema.json` is 004's ```` ```json ```` fence. `learn:port` gains one rule: a `json` fence whose `$id` is `https://critwire.com/learn/labs/<name>.json` ports to `site/learn/labs/<name>.json`. `--check all` then proves the two are the same.
- **Validator.** `ajv` as an exact-pinned devDependency (current 8.x at install), `import Ajv2020 from "ajv/dist/2020"`, `strict: true, allErrors: true`. It is used only from e2e: a helper `feedSchemaErrors(feed, schema)` in `e2e/helpers.ts`, shared by `learn-labs` and `release/live.spec.ts`. The build and `learn:check` never import it.
- **Report block.** `c1-report` (M, `// input: labs/c1-feed.json`) loads the feed with p1's pattern: `Json.Document(Web.Contents("https://critwire.com", [RelativePath = "learn/labs/c1-feed.json"]))`, cells to a typed table. So the game and the report read the same bytes, with no extra CSV. Deviation from §5.7, recorded.

**T5. Modules in full (Goal 2, 3).** 004 is written first, then `learn:port <page>`, then the page; the module's `curriculum.json` state turns `built` in the same commit. Form: §5's (Concept, Worked example, Lab, Result, Exercise, Answer, Check, plus a "Dialects" section, which for p is how other tools say the same). Copy is for adults, records not range, and has no mission names.
- **p1** (PBI): `p1-load` (function `LoadStar`, eight inputs) and `p1-fact-records`, plus an M exercise. Expected rows are re-measured from the build's manifest (75 classes; 5,578 rows); §A.3's two habitat rows/bytes are updated. The page's input table already shows rows and sha256 from the manifest.
- **p2** (PBI, PG): `p2-measures` (twin `p2-check`, keep `022cceeadc7e`), plus a DAX exercise with its own PostGIS twin.
- **p3** (PBI, PG):
  - `p3-check` gets `round(1000 * coalesce(r.records, 0) / NULLIF(h.forest_km2, 0), 3)`, which matches DAX `DIVIDE`'s blank, and its column is renamed `sample_records_per_1000_km2_forest`. It is re-run on L3's summaries (215 rows, from 2), re-recorded, and 004 is updated with what changed.
  - The `p3-measures` measure becomes "Sample records per 1,000 km2 of forest".
  - The prose calls it "sample records divided by forest area" and says why it isn't sampling effort.
  - Plus a DAX exercise and its twin.
- **p4** (PBI, PG): `p4-labels` (twin `p4-check`, keep `26cbac454e1c`), plus an exercise.
- **c1** (PG, Py, PBI):
  - Blocks: `c1-feed` and `c1-feed-file` (T4), `c1-report` (T4), and one ran PostGIS exercise (for example s1's "look before counting" on the fullest cell). The `json` schema fence. Diagrams `c1-pipeline` and `c1-feed`.
  - Py stays: the lab has the learner run e1–e4's downloads for their own species, and the page links them. 004 §5.7 already says this; §2's "all" is corrected.
  - `c1.sql` carries `s4-cells` as boot (T1). The feed's `meaning`, every title and the report say records, never range.
- Only `p3-check` (and `p3-measures`' prose) changes a recorded result; every other p/c sha holds or is new.

**T6. Curriculum pass (Goal 4).** `curriculum.json`:
- all 33 `built`; tools p1 `[PBI]`, p2–p4 `[PBI, PG]`, c1 `[PG, Py, PBI]`;
- hours unchanged (p 7.0, c 8.0, total 68.0); prerequisites unchanged;
- p3's question reworded per SC9.

004 is updated to match:
- §2: Tool column, Depth `full`, totals "33 full";
- §3's tool table (PG gains p2–p4);
- §5.6 and §5.7 intros (no longer outlines);
- §6.3 and §7.1 as built, §7.7 with the L5 e2e items, §9's L5 row as built.

Every "in preparation" text under `site/learn/` becomes a link (F7). Verification compares §2's table with `curriculum.json` row by row (scripted), and checks every page's prereqs, hours and links.

**T7. Diagrams (Addendum item 3).**
- Two diagrams, drawn with diagram-design under the existing profile `critwire` (no first-run question; `.diagram-design` exists):
  - `c1-pipeline`: GBIF download → load (e1–e4) → look (s1) → hexagons + Gi* (g6, s4, s5) → report (p1–p4) and feed → game, each stage with its honesty rule;
  - `c1-feed`: one cell's fields, weight as share, a cumulative draw with one random number, "missing cell = no record, not no animal".
- Each has four files under `site/learn/diagrams/`, exported with `export_svg.py --system-fonts` and checked with `self_check.py --offline`; SVG only. The `<title>` and alt state the point, and c1 shows them with `{{diagram:…}}`.
- The existing `diagrams.ts` checks and the e2e diagram tests cover them.

**T8. E2E (Definition of done).**
- `learn-map`: replace `BUILT_TRACKS` with "all 33 modules built, linked from the map and their track, 200"; no "in preparation" anywhere.
- `learn-labs`:
  - The Power BI test is generalized to `inputs`: star → manifest and `checkInput`; feed → rows = cells, sha256 of the served file.
  - Each DAX block's twin link resolves to `#q-<twin>` with its recorded result, and shows the twin sentence.
  - The feed: served bytes = `checked/c1-feed.json`, served schema = `site/learn/labs/c1-feed.schema.json`, Ajv-valid, `meaning` says "not its range", and cells/records/hot spots/credits equal `checked/c1-feed.txt`'s first row.
  - The s4-cells boot list gains `c1.sql`.
- `learn-data`: the star test needs nothing new (8 files); its "every Power BI input" loop takes star inputs only.
- `schema`: the star page has no planned list.
- `learn-screens`: + `p3`, `c1`.
- Release smoke (`e2e/release/live.spec.ts`): the served feed is Ajv-valid against the served schema, and each `/learn/data/star/*` sha256 matches the served star manifest. The existing "every dist file served" already covers every `/learn/` page returning 200.

**T9. AGENTS.md.** Update:
- State: all built.
- Stack: ajv for e2e.
- Learn files: `labs/c1-feed.schema.json`, `checked/c1-feed.json` (`learn:check --update` only), `// twin:`, inputs incl. `labs/c1-feed.json`.
- The `-- after:` scope rule; the build list (`learn/labs/c1-feed.json`, `c1-feed.schema.json`; star 8 files; the feed binding refusal).
- `learn:check --update` writes the feed.

**T10. Handoff H6 (Goal 5; Addendum item 1d, 2).** "Power BI Desktop check against the live star", `Blocks: nothing`, written once the release is live. Steps:
- p1: `LoadStar` and the eight queries; row counts equal each page's input table.
- Empty `month` / `coordinate_uncertainty_m` cells become null, not errors.
- `NA` is Namibia, never null or blank. The unknown members `ZZ` and `-1` are present and filterable.
- p2's relationships: many-to-one, single direction.
- `p2-measures`, `p3-measures` and `p4-labels` in DAX query view, each compared with its twin on the page. The devil's species-filtered credits are 7.
- c1: `c1-report`'s 307 rows.

The item states that the twins verify arithmetic only, not M parsing, relationship direction, filter context or DAX execution, which is what this check covers. Reply: per query, "matches" or what differs.

### Addendum review items → where

| Item | Done in |
|---|---|
| SC9 `p3-check` `NULLIF` | T5 p3 (`p3-check`, 004, re-recorded) |
| SC9 "sample records divided by forest area" | T5 p3 (prose, DAX measure name, SQL column), T6 (question), 004 §5.6 |
| SC9 habitat fact `est_area_km2 >= 0`, FKs NOT NULL, unknown members kept | T2. Already in d6's DDL; the CHECK is made engine-neutral (F2); `learn-data` proves no NULL FK and `ZZ`/`-1` |
| SC9 Windows item: empty numerics, Namibia, unknown members, species-filtered credits | T10 |
| Twins verify arithmetic only (pages and handoff) | T3 (`powerBiHtml` twin line on every DAX block; e2e asserts it), T10, 004 §3.5/§5.6 |
| Capstone diagrams via diagram-design | T7 |

Each one is recorded under Decisions with its commit.

### Rejected alternatives

- **The cross-page `-- after:` scope**:
  - "any earlier page": looser than the prerequisites a learner has done.
  - Copying d6's star SQL into each twin: breaks DRY and star.sql's one definition.
  - Making the star blocks `-- boot`: that commits the tables, and d6's own lesson would then fail on "already exists".
- **Where the feed comes from**:
  - A Python block printing the feed: 004 would hold 35 KB, and Python can't see the temp view.
  - The build computing it: no PostGIS offline.
  - `learn:check` writing into `dist/`: the build owns dist.
  - A generic `-- writes:` header: machinery for one file.
- **jsonb `doc` instead of `doc::text`**: cellText renders objects as `{k: v}`, not JSON, so the binding would need a jsonb re-serializer.
- **A cell CSV for the c1 report (004 §5.7) or a 9th star file**: an extra published file with the same data as the feed, and the star stays "eight".
- **Validating with Python `jsonschema`**: it changes the published labs' `requirements.txt` (44 pins, every Python key stale). **A hand-rolled subset validator**: it ignores keywords nobody implemented, while Ajv strict refuses them. **`@cfworker/json-schema`**: less established than Ajv. **Validating in build/learn:check**: the e2e and the release smoke are the one place, and ajv stays out of the build.
- **A `dim_habitat_class` unknown member**: no fact row lacks a class.
- **Leaving `< 'Infinity'` and skipping the habitat block in DuckDB**: the star must come from one text.

### For the planner: order, risks, budget

- **Order** (each item needs the ones before it):
  1. T1, with its unit cases written first in `course.test.ts`, `blocks.test.ts`, `assemble.test.ts`, `freshness.test.ts`, `port.test.ts` and the runner's tests.
  2. T2, then a build, `learn:check` (d6 keys stale), and the e2e `learn-data` and `schema` specs.
  3. T3 and T4's code, with cases first in `blocks.test.ts`, `module-html.test.ts`, `star.test.ts`, `record`/`check` and `port.test.ts`; then the ajv install.
  4. p1, p2, p3, p4: one module per step, each 004 → port → page → `build --draft && learn:check --update && build` → the relevant e2e. p1 and p3 need T2 first, because their inputs must be star files.
  5. c1: first `c1-feed`, `c1-feed-file`, the page and the schema; the first `--update` writes the feed. Then `c1-report` and the exercise.
  6. The diagrams; the curriculum pass and 004's map/tables; the remaining e2e and the release smoke; AGENTS.md; the review-item audit; Verification; code review; release; H6.
- **Risks**:
  - The first repo run of `c1-feed`, `p2-check` or `p4-check` may differ from 004: treat it as a bug and investigate before re-recording.
  - `c1-feed`'s restructure must keep `0ed7d7c256c4`.
  - Write c1-feed.json from `doc::text` exactly (no reformat), or the binding fails.
  - Keep CSS unchanged so the asset hashes don't move. Expected dist changes against the baseline list: the star (+2 CSVs, its manifest), the data manifest and index, pages, `schema/star.svg`, `labs/d6.sql`, new `labs/p2–p4.sql`, `c1.sql`, `c1-feed.json`, `c1-feed.schema.json`, new diagrams. `/v1/*` stays byte-identical.
  - Disk: delete older e2e artifact folders.
- **Budget**: 2 sessions used (Baseline, Architecture). Estimated remaining:
  - 4 pipeline stages;
  - about 16 steps (T1 1, T2 1–2, T3+T4 2, p1–p4 4, c1 2, diagrams 1, curriculum pass 1, e2e 1, AGENTS + audit 1, Verification 1–2);
  - the code review 1, its fixes about 2, final Verification 1, release 1.

  That makes about 25–28 sessions, ≈ 27–30 in all, against the 48 cap.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-10-30 05:05 UTC: Baseline on `afed437`: install, venv, typecheck ok; test 664/664; build ok (`/learn/data/` 95.9 MB); test:db 138/138; learn:check ok; e2e 96/96; sha256 lists saved.
- 2026-10-30 05:21 UTC: Architecture by `architect`: F1 cross-page `-- after:` (prereq pages), F2 DuckDB CHECK fix, habitat fact = 2 star blocks, feed via `c1-feed-file` + checked file + ajv, DAX `// twin:` header; est. 25–28 more sessions. Plan-only change, no checks needed.

## Summary
