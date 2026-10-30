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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

Read on `6e8d566`. Line refs are to that commit. Facts marked "verified" were run during this stage (DuckDB/psql probes on the committed data; no build, learn:check or e2e). Revised on `0428cfe` after both reviews (F9, T1, T2, T3, T4, T5, T8, T9, T10; see Revision notes).

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
- First repo run of `p2-check` (`022cceeadc7e`), `p4-check` (`26cbac454e1c`) and `c1-feed` (`0ed7d7c256c4`, before F9's fields; T4): a difference is a bug to find, not a number to update.
- Disk is 9.2 GB free (not 11; 8.7 GB at Revision): about 750 MB per e2e run, keep two.
- Each `learn:check` run takes about 9–10 min and each `test:db` run about 22 min: one heavy run per session.

**F9. 004's feed ships without a license and with partial credits (Astra MUST-FIX 1).** The `c1-feed` doc has `source` (the download citation) and `credit` (title and publisher only). It has no license of its own, no credit for critwire (whose species names, cells and weights it holds), and no per-dataset DOI, although e4's credit query (`e4-credits`) teaches `doi`. Published at `/learn/labs/`, outside `/learn/data/`'s manifest, it would break AGENTS.md's rule that every third-party field records its source and license, and CC BY 4.0's license-notice and URI terms.
- Verified: the hardcoded `source` equals the build's `downloadCitation` (`/learn/data/manifest.json`'s gbif-sample citation), and all 7 credited devil datasets have a DOI in `datasets.csv`.
- Nothing binds that string to the sample, so after a sample refresh the feed would cite the old download.

### Target design

**T1. Cross-page `-- after:` for PostGIS blocks (fixes F1).**
- Rule (004 §0): a PostGIS block's `-- after:` may name an earlier block of its own page, or a ran PostGIS block on a page in its **scope**: its module's prerequisites, transitively. Python keeps "its page or `py-connect`". DuckDB stays page-only, because the browser runs `data-after` from the page DOM.
- **Scope is transitive; execution isn't (Astra SC1).** A block runs exactly the blocks its `-- after:` lists, in that order, each with only its own statements, as the runner and downloads do today. So `p3-check` lists every d6 star block it needs, as 004 already does.
  - The runner (`runBlock`) and the downloads (`blockPart`, and boot detection's `used`) resolve the same ids from the same map, and run or inline the same list.
  - Freshness's `afterChain` stays transitive over that map, so its key covers a superset of what runs. A stale result can't look fresh; at worst a block re-runs when it didn't need to.
- `course.ts`, three queries:
  - `afterScope(curriculum, pageId) → Set<pageId>`: the module's prerequisites, transitively (`setup` → ∅). It **throws** on an unknown page, a module naming itself, or a prerequisite cycle (naming the cycle), never returning an empty set. `parseCurriculum` already rejects cycles; this guards direct callers such as `port.ts`.
  - `courseBlocks(pages) → Map<id, Block>`: every page's blocks. It is the **one id resolver** for the runner, `assemble.ts` and `freshness.ts` (freshness's own `all` map moves here). Ids are unique course-wide, because `assembleCourse` refuses a block on two pages.
  - `assembleCourse(curriculum, pages, blocks, diagrams)` runs in **two passes (Fable MUST-FIX 2)**. First it collects every page's slots and `onPage`; then it lints each page with helpers = `py-connect` ∪ every PostGIS block on its `afterScope` pages. The lint no longer depends on page order.
- `lintPage`: the chain becomes `first.get(a) ?? helpers.get(a)`.
  - Its existing checks (boot, untested, expects an error, own transaction, sessions, engine) refuse every helper but a plain ran PostGIS block. So a DuckDB or Python block naming a helper fails the engine check.
  - A block outside the scope stays "unknown block … (not on this page or a prerequisite's)".
- Users of `courseBlocks`:
  - `runner.ts` `blockRuns`/`runBlock`, passed by `check.ts`, so `--module p3` resolves d6's blocks.
  - `assemble.ts` `sqlDownload`'s `byId`, so `used` sees `s5-gistar`'s code and `c1.sql` gets `s4-cells`.
  - `freshness.ts` `afterChain`.
- `port.ts` `helpers()`: reads `site/learn/curriculum.json` and ports the blocks of the `afterScope` pages from 004.
- Byte-neutral today: no existing block names another page's block, so every existing download, key and page is unchanged.

**T2. The habitat fact in the star (fixes F2, F3; Goal 1).**
- `d6-star-fact-country-habitat.sql` and 004 d6 get the F2 CHECK in one commit; the result sha stays the same, the reason goes under Decisions. Its key and `d6-drill-across`'s go stale, so `learn:check` re-runs them. `/learn/labs/d6.sql` changes: a recorded deviation from the baseline sha256 list.
- `STAR_BLOCKS` += `d6-star-dim-habitat-class`, `d6-star-fact-country-habitat`, in that order (`starBlocks` checks the `-- after:` order).
- `LAB_FILES` gets two entries: `star/dim_habitat_class.csv` → `jung-habitat`; `star/fact_country_habitat.csv` → `jung-habitat`, `natural-earth`, as `country_habitats.parquet`.
- Shapes, from d6's DDL, which stays the one definition:
  - `dim_habitat_class(habitat_code INTEGER PK, name, level1_code, level1_name)`.
  - `fact_country_habitat(country_code VARCHAR NOT NULL FK dim_country, habitat_code INTEGER NOT NULL FK dim_habitat_class, est_area_km2 DECIMAL(12,2) NOT NULL CHECK (>= 0 AND <= 9999999999.99), PK (country_code, habitat_code))`, rows ordered by the PK.
- The cross-engine guard compares Node DuckDB's result with the PostGIS records (`37ad5647623e`, `80b11c41e5b3`).
- Rounding, verified (Fable MISSED): `country_habitats.parquet`'s `est_area_km2` is already `DECIMAL(12,2)`. None of the 5,578 rows goes beyond 2 places, and DuckDB's sum, 146,579,613.97, equals the recorded PostGIS `total_km2`. Neither engine rounds on insert, so `sum(est_area_km2)` agrees. Goes under Decisions.
- The manifest gains both files (columns, keys from DuckDB's catalog, rows, bytes, sha256, credits); the data manifest and index list them through the existing `writeLabIndex`.
- `star.mmd`: drop the `%% planned:` line and its comment, and update the accDescr. `schema-star.html`: drop the "Planned" section and its `{{planned}}` slot, keeping a sentence that the habitat areas are map estimates.
- `pnpm erd` re-renders `star.svg`. `d6.html` and 004 d6/§6.3 say "published".
- The drift check passes unexcused, and `learn-data`'s star test covers 8 files automatically (`STAR_FILES`): no NULL foreign key, `ZZ` and `-1` present, `NA` stays Namibia.
- `star.test.ts`'s cases are updated first (eight files; the CHECK runs in DuckDB).

**T3. The Power BI block model (fixes F5).**
- **`// twin: <id>`** (DAX only, required). It names a ran PostGIS block on the same page. `PBI_HEADERS` += `twin`; `lintPage` refuses a DAX block without one, an M block with one, and a twin that is missing, not PostGIS or not ran.
  - One resolver (Fable SC): `lintPage` looks the twin up in its page map `first`, with no helpers, because a twin is on its own page.
  - It checks the twin with the same named-block predicate as `-- after:`, factored out of the loop once.
- **Page text.** `powerBiHtml` keeps "Not run by critwire: Power BI Desktop is Windows-only." exactly as now, and for DAX adds one `<p class="twin">`: "The table it should return, from the same files in PostGIS: <a href="#q-…">…</a>. That twin checks the arithmetic only, not M parsing, relationship direction, filter context or DAX execution." No new CSS: reuse existing styles, so the asset hashes stay.
- **Inputs.** `// input:` is `star/<file>.csv` (under `/learn/data/`) or `labs/c1-feed.json` (under `/learn/`).
  - `STAR_INPUT` becomes `INPUT = /^(star\/[a-z_]+\.csv|labs\/c1-feed\.json)$/`.
  - `starInputErrors` → `inputErrors`, allowing `STAR_FILES` ∪ {`FEED.input`}.
  - `PageContext.star` → `inputs: Map<input, {url, rows, sha256}>`. `writeLearn` builds it from the star manifest and from the published feed (rows = `cells.length`).
  - In `--draft`, a missing input renders "not built yet (draft build)", as `labResult` does, so c1's page can build before the first feed exists. A plain build throws.
- **Exercises.** `{{exercise:}}` is allowed for Power BI, rendered in the same `<details class="exercise-answer">` as lab blocks; `skip` is still refused.

**T4. The feed and its schema (fixes F4, F9; Goal 3).** Everything below hangs off one constant in a new pure module, `scripts/learn/feed.ts`: `FEED = { block: "c1-feed-file", column: "feed", file: "site/learn/labs/checked/c1-feed.json", schema: "site/learn/labs/c1-feed.schema.json", input: "labs/c1-feed.json", sources: ["critwire", "gbif-sample"] }`.
- **Blocks (004 §5.7):**
  - `c1-feed` (after `s5-gistar`) becomes `CREATE OR REPLACE TEMP VIEW c1_feed AS <004's WITH … SELECT jsonb_build_object(…) AS doc FROM cells>;` followed by 004's summary query `FROM c1_feed`.
  - New `c1-feed-file` (after `s5-gistar, c1-feed`): `SELECT doc::text AS feed FROM c1_feed;`. Its result is the whole feed as one text cell; the 60-character render goes in 004, and its sha256 covers the full text.
  - **Two moves, two commits.** First the restructure, with 004's doc verbatim: it must hold `0ed7d7c256c4`, which proves the view is faithful. Then the license and attribution fields (below): after that only `bytes` may differ from 004's row (cells 307, records 1,972, weight_sum 0.999954, hot spots 37, credits 7, `fullest` all unchanged). The second commit records the new sha and bytes in 004, with the deviation under Decisions.
- **License and attribution (F9; Astra MUST-FIX 1).** A game copies the feed alone, so the feed carries its own license and complete credits, with no companion file.
  - The doc gains three fields:
    - `license` `'CC BY 4.0'`: DATA-LICENSE.md's license for data critwire derives. This applies the existing license and is no new licensing decision, so it needs no handoff item.
    - `license_url`: that license's deed.
    - `attribution`: critwire's requested credit (`CRITWIRE_CREDIT`).
  - Each `credit` item gains `doi` (`e4-credits`' column), ordered by title, publisher and doi.
  - Kept as they are: `source` (GBIF's download citation, with its DOI, which lists every dataset) and `meaning` (marks the change: shares per cell).
  - Schema (004's fence): `required` += `license`, `license_url`, `attribution`. Credit items' `required` += `doi` (`["string", "null"]`). `license_url` gets `"pattern": "^https://"` and no `format`, because Ajv strict refuses `format` without ajv-formats.
  - **Build check, reusing the credit interfaces.** `feedAttributionErrors(doc, expected)` in `feed.ts` is pure. `expected` comes from `credits(FEED.input, {...labCredits, files: {[FEED.input]: FEED.sources}})`, so ST4's checks apply for free, plus `labCredits.datasets`.
    - `CreditDataset` gains `doi: string | null`. Its values are already `learn.datasets`, which carry it.
    - It requires `license`, `license_url` and `attribution` to equal the critwire credit's `license`, `licenseUrl` and `citation`.
    - It requires `source` to equal the gbif-sample credit's `citation`, which catches a sample refresh that leaves the old citation in the SQL.
    - It requires every `credit` row to equal one sample dataset's (title, publisher, doi), unique and sorted. The list's completeness belongs to the SQL, bound by the recorded `datasets_to_credit`.
  - The e2e and the release smoke (T8) call the same `feedAttributionErrors` on the served files.
- **Write.** `Outcome` (record.ts) gains `result?: Result`, the uncut result `runBlock` rendered from.
  - After `settleResults` succeeds in a whole `--update` run, `check.ts` calls `writeFeed(runs)`.
  - `writeFeed` requires exactly one row, one column `feed`, and a cell with `typeof === "string"` (Fable SC). A `jsonb` slip arrives as an object and is refused, not rendered.
  - It writes `FEED.file` byte for byte, `utf8`, with no newline, only when it changed. The size is measured at the first run with attribution; 004's 34,848 B predates the new fields.
  - `--module` and plain runs write nothing.
- **Bind (build, offline).** `feedStaleness(feedText, recorded)` in `feed.ts` requires `renderResult(FEED.block, {columns: ["feed"], rows: [[feedText]]}) === checked/c1-feed-file.txt`. That recorded result is itself stamped in `checked.json`, so the existing chain proves the file came from the query.
  - `assertLabsFresh` gains `labCredits` and adds the feed's errors to its list: a missing feed, `feedStaleness`, then `feedAttributionErrors`.
  - One policy for all three: plain refuses ("…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check --update"), `--draft` warns. A throw in `--draft` would block the `build --draft && learn:check --update` loop that rewrites the feed.
  - No new freshness field and no `checked.json` format change.
- **Publish.** `writeLearn` copies `FEED.file` → `dist/learn/labs/c1-feed.json` and `FEED.schema` → `dist/learn/labs/c1-feed.schema.json`. They sit outside `/learn/data/`, so the data cap and manifest are untouched.
- **Schema source.** `site/learn/labs/c1-feed.schema.json` is 004's ```` ```json ```` fence. `learn:port` gains one rule: a `json` fence whose `$id` is `https://critwire.com/learn/labs/<name>.json` ports to `site/learn/labs/<name>.json`. `--check all` then proves the two are the same.
- **Validator.** `ajv` as an exact-pinned devDependency, like `@playwright/test` (8.20.0 is current). Construct it with `strict: true, allErrors: true`.
  - Import it as `import { Ajv2020 } from "ajv/dist/2020.js"`. The root tsconfig is `nodenext` and includes `e2e/`, so the extension is required, and the named export can be constructed where the default import of this CommonJS module can't. `pnpm typecheck` proves it (Fable SC).
  - It is used only from e2e: a helper `feedSchemaErrors(feed, schema)` in `e2e/helpers.ts`, shared by `learn-labs` and `release/live.spec.ts`. The build and `learn:check` never import it.
- **Report block.** `c1-report` (M, `// input: labs/c1-feed.json`) loads the feed with p1's pattern: `Json.Document(Web.Contents("https://critwire.com", [RelativePath = "learn/labs/c1-feed.json"]))`, cells to a typed table. So the game and the report read the same bytes, with no extra CSV. Deviation from §5.7, recorded.

**T5. Modules in full (Goal 2, 3).** 004 is written first, then `learn:port <page>`, then the page; the module's `curriculum.json` state turns `built` in the same commit. Form: §5's (Concept, Worked example, Lab, Result, Exercise, Answer, Check, plus a "Dialects" section, which for p is how other tools say the same). Copy is for adults, records not range, and has no mission names.
- **p1** (PBI): `p1-load` (function `LoadStar`, eight inputs) and `p1-fact-records`, plus an M exercise. Expected rows are re-measured from the build's manifest (75 classes; 5,578 rows); §A.3's two habitat rows/bytes are updated. The page's input table already shows rows and sha256 from the manifest.
- **p2** (PBI, PG): `p2-measures` (twin `p2-check`, keep `022cceeadc7e`), plus a DAX exercise with its own PostGIS twin.
- **p3** (PBI, PG):
  - `p3-check` gets `round(1000 * coalesce(r.records, 0) / NULLIF(h.forest_km2, 0), 3)`, which matches DAX `DIVIDE`'s blank, and its column is renamed `sample_records_per_1000_km2_forest`. It is re-run on L3's summaries (215 rows, from 2), re-recorded, and 004 is updated with what changed.
  - The `p3-measures` measure becomes "Sample records per 1,000 km2 of forest".
  - The prose calls it "sample records divided by forest area" and says why it isn't sampling effort.
  - Plus a DAX exercise and its twin.
  - One commit (Fable SC): 004, `p3-check` (`NULLIF`, rename), `p3-measures`, the prose and the re-recorded result. TT's ratio before (0.698, on the stand-ins) and after goes under Decisions.
- **p4** (PBI, PG): `p4-labels` (twin `p4-check`, keep `26cbac454e1c`), plus an exercise.
- **c1** (PG, Py, PBI):
  - Blocks: `c1-feed` and `c1-feed-file` (T4), `c1-report` (T4), and one ran PostGIS exercise (for example s1's "look before counting" on the fullest cell). The `json` schema fence. Diagrams `c1-pipeline` and `c1-feed`.
  - Py stays: the lab has the learner run e1–e4's downloads for their own species, and the page links them. 004 §5.7 already says this; §2's "all" is corrected.
  - `c1.sql` carries `s4-cells` as boot (T1). The feed's `meaning`, every title and the report say records, never range.
  - The prose says what a game's credits screen shows: `attribution`, `source` and each `credit` with its DOI. It also says a learner's own feed names its maker in `attribution`.
- Two blocks change a recorded result. `p3-check` (and `p3-measures`' prose) runs on L3's summaries; `c1-feed` changes only its `bytes` column, from the feed's attribution fields (T4). Every other p/c sha holds or is new.

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
  - The feed, against its recorded summary (`checked/c1-feed.txt`'s row):
    - The served bytes equal `checked/c1-feed.json`, the served schema equals `site/learn/labs/c1-feed.schema.json`, and the feed is Ajv-valid. `meaning` says "not its range".
    - cells, records, hot spots and credits equal the row.
    - `Buffer.byteLength` of the served file equals `bytes` (Fable MISSED).
    - Σ `round(weight × 10⁶)` equals `weight_sum × 10⁶` in integer arithmetic (Astra SC2).
  - The feed's attribution: `feedAttributionErrors` returns none against the served `/learn/data/manifest.json` credits (critwire, gbif-sample) and the served `datasets.csv` (title, publisher, doi).
  - The s4-cells boot list gains `c1.sql`.
- `learn-data`: the star test needs nothing new (8 files); its "every Power BI input" loop takes star inputs only.
- `schema`: the star page has no planned list.
- `learn-screens`: + `p3`, `c1`.
- Release smoke (`e2e/release/live.spec.ts`), on the live site:
  - The served feed is Ajv-valid against the served schema, which requires the license and attribution fields.
  - `feedAttributionErrors` returns none against the served manifest and `datasets.csv`.
  - Each `/learn/data/star/*` sha256 matches the served star manifest.
  - The existing "every dist file served" already covers every `/learn/` page returning 200.

**T9. AGENTS.md.** Update:
- State: all built.
- Stack: ajv for e2e (`ajv/dist/2020.js`, exact pin).
- Learn files: `labs/c1-feed.schema.json`, `checked/c1-feed.json` (`learn:check --update` only), `// twin:`, inputs incl. `labs/c1-feed.json`.
- The `-- after:` scope rule: scope transitive, execution only the listed blocks, in order.
- The build list: `learn/labs/c1-feed.json` and `c1-feed.schema.json`; the star's 8 files; the feed refusals (binding and attribution: plain refuses, `--draft` warns).
- `learn:check --update` writes the feed.
- `--module` note (Fable SC): `--module p2|p3|p4` replays d6's star blocks inside each twin's transaction, and `--module c1` replays `s5-gistar`. Slower page runs are expected, not a regression.

**T10. Handoff H6 (Goal 5; Addendum item 1d, 2).** "Power BI Desktop check against the live star", `Blocks: nothing`.
- **Timing (Fable MUST-FIX 1; Astra SC3).** It is written in the AGENTS.md + review-audit step, before Verification, so the Summary can name it.
  - Its Why tells the owner to run it against https://critwire.com once the mission's PR is merged and deployed.
  - The release unit at most appends the merge commit to it. The mission never waits on it.
- Steps:
  - p1: `LoadStar` and the eight queries; row counts equal each page's input table.
  - Empty `month` / `coordinate_uncertainty_m` cells become null, not errors.
  - `NA` is Namibia, never null or blank. The unknown members `ZZ` and `-1` are present and filterable.
  - p2's relationships: many-to-one, single direction.
  - `p2-measures`, `p3-measures` and `p4-labels` in DAX query view, each compared with its twin on the page. The devil's species-filtered credits are 7.
  - c1: `c1-report`'s 307 rows; the feed's `license`, `attribution`, `source` and 7 credits are readable in Power Query.

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
- **The feed's attribution**:
  - A companion file (`c1-feed.credits.json`): a game copies the feed alone, so a sidecar gets lost.
  - Adding the license only in `c1-feed-file`'s SELECT (keeping `0ed7d7c256c4`): the learner's doc and the published one would differ, and `bytes` would stop matching the file.
  - The build recomputing the credit list: cell membership needs PostGIS. The SQL and the recorded `datasets_to_credit` bind it.
  - Attribution errors throwing in `--draft`: that blocks the loop that rewrites the feed.
- **Making freshness's `afterChain` non-transitive**, to mirror execution exactly: it would only shrink keys. The transitive key is a safe superset, and unchanged today.
- **Linting each page inside `assembleCourse`'s single pass**: correct only while prerequisites precede their dependents in page order.
- **A `dim_habitat_class` unknown member**: no fact row lacks a class.
- **Leaving `< 'Infinity'` and skipping the habitat block in DuckDB**: the star must come from one text.

### For the planner: order, risks, budget

- **Order** (each item needs the ones before it):
  1. T1, with its unit cases written first in `course.test.ts`, `blocks.test.ts`, `assemble.test.ts`, `freshness.test.ts`, `port.test.ts` and the runner's tests.
  2. T2, then a build, `learn:check` (d6 keys stale), and the e2e `learn-data` and `schema` specs.
  3. T3 and T4's code, with cases first in `blocks.test.ts`, `module-html.test.ts`, `star.test.ts`, `record`/`check` and `port.test.ts`; then the ajv install.
  4. p1, p2, p3, p4: one module per step, each 004 → port → page → `build --draft && learn:check --update && build` → the relevant e2e. p1 and p3 need T2 first, because their inputs must be star files.
  5. c1:
     - First `c1-feed` restructured with 004's doc verbatim, `c1-feed-file`, the page and the schema. The first `--update` writes the feed, and `0ed7d7c256c4` must hold.
     - Then the license and attribution fields (004's SQL, schema and Expected; only `bytes` moves) with `feedAttributionErrors`.
     - Then `c1-report` and the exercise.
  6. The diagrams; the curriculum pass and 004's map/tables; the remaining e2e and the release smoke.
  7. AGENTS.md, the review-item audit and H6 (written there; T10).
  8. Verification; code review; release (appends the merge commit to H6).
- **Risks**:
  - The first repo run of `c1-feed`, `p2-check` or `p4-check` may differ from 004: treat it as a bug and investigate before re-recording.
  - `c1-feed`'s restructure must keep `0ed7d7c256c4`. After the attribution fields, only `bytes` may move.
  - Write c1-feed.json from `doc::text` exactly (no reformat), or the binding fails.
  - Keep CSS unchanged so the asset hashes don't move. Expected dist changes against the baseline list: the star (+2 CSVs, its manifest), the data manifest and index, pages, `schema/star.svg`, `labs/d6.sql`, new `labs/p2–p4.sql`, `c1.sql`, `c1-feed.json`, `c1-feed.schema.json`, new diagrams. `/v1/*` stays byte-identical.
  - Disk (8.7 GB free at Revision): delete older e2e artifact folders.
- **Budget**: 5 sessions used (Baseline, Architecture, Fable, Astra, Revision). Estimated remaining:
  - the Steps stage, 1;
  - about 16–18 steps (T1 1, T2 1–2, T3+T4 2, p1–p4 4, c1 2–3, diagrams 1, curriculum pass 1, e2e 1, AGENTS + audit + H6 1, Verification 1–2);
  - the code review 1, its fixes about 2, final Verification 1, release 1.

  That makes about 22–25 sessions, ≈ 27–30 in all, against the 48 cap.

## Architecture review (Fable)

Checked on `ade619e` against the code: `blocks.ts` `lintPage` (helpers = py-connect only, `first.get(a)` chain), `course.ts` `assembleCourse`, `assemble.ts` `blockPart` (throws on an off-page `-- after:`), `freshness.ts` `afterChain` (page map), `runner.ts` `blockRuns`/`runBlock` (run-list map), `port.ts` `helpers()`, `star.ts` `STAR_BLOCKS` (6) / `starInputErrors`, `credits.ts` `LAB_FILES`, `star.mmd` `%% planned:` + `schema-html.ts:66` slot rule, `module-html.ts:207` exercise refusal, `result.ts` `MAX_CELL`/`SHOWN_ROWS` + full-text sha, `course-files.ts` `stems` (`.txt` only, so `checked/c1-feed.json` isn't an orphan), the `'Infinity'` CHECK in `d6-star-fact-country-habitat.sql`, 004's `p2-check`/`p3-check` `-- after:` lines, c1-feed (`jsonb`, `octet_length(doc::text)` = 34848), prereq chains p2→p1→d6, c1→s5/p4, `e2e/learn-data.spec.ts` (already `STAR_FILES`-driven; the inputs loop at :177 would break on the feed input, T8 covers it). F1–F8 are accurate; T1–T10 are in the brief's scope, reuse existing interfaces (star guard, `checkInput`, freshness stamp, `writeLabIndex`, `assembleDownloads`), and the rejected alternatives are the right calls (feed from `learn:check`, Ajv only in e2e, no 9th star file).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **H6 is sequenced after the mission can write it.** T10 says the handoff item is "written once the release is live", but the brief's Definition of done requires the Summary (written before the release unit) to name the item, and the release session ends with `MISSION_DONE`. Write H6 in the AGENTS/audit step (before Verification), `Blocks: nothing`, telling the owner to run it against critwire.com once the mission's PR is merged; the release unit only appends the merge commit to it if useful.
2. **T1's helper scope must come from the full course map, not from pages assembled so far.** `assembleCourse` lints each page inside the one `pages.map` pass; "passes each page's in-scope blocks to lintPage as helpers" implemented there works only because prerequisite pages happen to precede their dependents in page order (the same "works by accident" F1 criticises in `blockRuns`). State it: collect every page's `onPage` first, then lint each page with helpers = ran PostGIS blocks of `afterScope(pageId)` pages, and make `afterScope` refuse a page naming itself or a prerequisite cycle (fail loud, not an empty set).

MISSED:
- `writeStar` casts `country_habitats.est_area_km2` into `DECIMAL(12,2)` in DuckDB while PostGIS casts into `numeric(12,2)`; if the parquet holds more than two decimals, the two engines may round a `.xx5` differently and the star guard fails on `sum(est_area_km2)`. Confirm before T2 (one DuckDB probe: `est_area_km2 = round(est_area_km2, 2)` for every row) and note the result under Decisions.
- The feed's `bytes` column (`c1-feed`'s summary, 34848) is a free end-to-end check the design doesn't use: T8 should also assert `Buffer.byteLength(checked/c1-feed.json) === bytes` from `checked/c1-feed.txt`'s row, besides cells/records/hot spots/credits.

SHOULD-CONSIDER:
- Root `tsconfig.json` includes `e2e/` under `moduleResolution: nodenext`: import `ajv/dist/2020.js` (with the extension), or `pnpm typecheck` fails; pin `ajv` exact as the other dev deps are.
- `writeFeed`: write with `utf8` and refuse a result whose cell isn't a string (postgres.js returns `text` as string; a `jsonb` slip would arrive as an object and `cellText` would render it, not serialise it).
- `--module p3`/`--module c1` now replay d6's six star blocks or `s5-gistar` (a spatial join over all occurrences) inside each twin's transaction; acceptable, but say so in AGENTS.md's `--module` note so the next mission doesn't read a slow page run as a regression.
- The `// twin:` lint can reuse `lintPage`'s existing helper resolution for "ran PostGIS on this page" instead of a second lookup; keep one id resolver.
- In T5, write the p3 prose change (SC9) and the `NULLIF` + column rename in one commit with 004 and the re-recorded result, and record the before/after ratio row for TT under Decisions, since the brief calls it out.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. T4 publishes a standalone feed outside the data manifest without an explicit license or complete attribution mechanism. Its credits contain only titles/publishers and a download citation. AGENTS.md requires source and license for every third-party field. Define published attribution covering the feed and its reuse—embedded metadata or a companion attribution file—and verify it ships with the download.

SHOULD-CONSIDER:
1. Make T1 explicit that prerequisite scope is transitive, but SQL `after` execution remains ordered and non-transitive. Preserve identical behavior across runner, downloads and freshness checks.
2. Check feed byte length and weight sum against the recorded summary, alongside the proposed counts.
3. Create the Windows-check handoff before final verification; keep it nonblocking as authorized.

## Revision notes

One round, on `0428cfe`. Nothing rejected outright; one item taken in part (Astra SC1, freshness).
- **Fable MUST-FIX 1 (H6 timing):** resolved. T10 writes H6 in the AGENTS.md + audit step, before Verification, `Blocks: nothing`, to be run against critwire.com once the PR is merged; the release only appends the merge commit. Planner order items 7–8 updated.
- **Fable MUST-FIX 2 (T1 scope from the full map):** resolved in T1. `assembleCourse` runs in two passes (every page's `onPage` first, then the lint with `afterScope` helpers). `afterScope` throws on an unknown page, a module naming itself, or a cycle.
- **Astra MUST-FIX 1 (feed license and attribution):** resolved by new finding F9 and T4's "License and attribution". The feed embeds `license`, `license_url`, `attribution` and a per-credit `doi`, and the schema requires them. The build checks them with `feedAttributionErrors` against `credits()`/`labCredits`; the e2e and the release smoke run the same check on the served files (T8). `c1-feed` moves only `bytes` (two commits, T4); the deviation goes under Decisions. Companion file rejected.
- **Fable MISSED (DECIMAL rounding):** probed now, no risk (T2). The parquet column is `DECIMAL(12,2)`, no row goes beyond 2 places, and the DuckDB sum 146,579,613.97 equals the recorded PostGIS `total_km2`.
- **Fable MISSED (feed bytes):** T8, `Buffer.byteLength` = `bytes`.
- **Astra SC1 (transitive scope, ordered non-transitive execution):** taken in T1. The runner and downloads share `courseBlocks` and run exactly the listed blocks, in order. Freshness's `afterChain` is deliberately kept transitive (a safe superset key, unchanged today), so it isn't made "identical"; reason in Rejected alternatives.
- **Astra SC2 (weight sum):** T8, integer sum of `round(weight × 10⁶)` = `weight_sum × 10⁶`.
- **Astra SC3 (handoff before Verification):** same fix as Fable MUST-FIX 1 (T10).
- **Fable SC (ajv import and pin):** T4 Validator and T9: exact pin, `import { Ajv2020 } from "ajv/dist/2020.js"`. The named import is used because the CommonJS default import isn't constructable under `nodenext`.
- **Fable SC (writeFeed `utf8` and refusing a non-string cell):** T4 Write.
- **Fable SC (AGENTS.md `--module` slowness note):** T9.
- **Fable SC (one id resolver for `// twin:`):** T3 (lintPage's `first` and a shared named-block predicate); T1's `courseBlocks` is the one course-wide resolver.
- **Fable SC (p3 in one commit; TT before/after under Decisions):** T5 p3.
- **Budget:** 5 sessions used; ≈ 27–30 in all is unchanged (c1 grows to 2–3 steps).

## Steps

Every step:
- `M` = `/srv/critter-ai/agent-state/missions/critwire-learn-l5-powerbi-capstone`. `B0` = `afed437` (Baseline). T<n>/F<n> = this plan's Architecture. Test ids (XS1, FD1, …) = Failure modes below.
- **First** = the step's failure cases written and run red before its code (Log: `red n → green n`). No test after its code. E2E cases for a feature land in its step, before its code; red shown in the Log, or by a scratch mutation that is reverted.
- **Checks**, one heavy job at a time (never two of build, test:db, learn:check, e2e; test:db and learn:check share the lab lock). No lint script: `pnpm typecheck` is the static check.
  - `T` = `pnpm typecheck && pnpm test`.
  - `B` = plain `pnpm build`. If it calls a lab stale, run `L`.
  - `D` = `B`, then `pnpm test:db` (≈ 22 min). While iterating: `pnpm exec tsx --test --test-concurrency=1 <file>.dbtest.ts`.
  - `L` = `pnpm build --draft && pnpm learn:check && pnpm build` (≈ 10 min). A whole run re-stamps `checked.json`; `git status --porcelain site/learn/labs/checked` shows `checked.json` only. Needed when a step touches learn:check's import closure or a block.
  - `LU` = `pnpm build --draft && pnpm learn:check --update && pnpm build` (each block runs twice), then `P`: only the step's new or designed-changed results differ. Copy each into its 004 result fence; `P` again = 0. `git status --porcelain site/learn/labs/checked` lists only those results, `checked.json`, and (S9 on) `c1-feed.json` when the feed changed.
  - `E` = `B`, then `rm -rf $M/e2e-s* e2e-artifacts && E2E_ARTIFACTS=$M/e2e-s<n> pnpm e2e`; `jq .stats $M/e2e-s<n>/results.json`: unexpected 0, skipped 0, flaky 0. Disk (8.7 GB free, ≈ 750 MB per run): one intermediate folder at a time. S2's `E` first copies `$M/baseline-e2e/results.json` to `$M/baseline-e2e-results.json`, then deletes `$M/baseline-e2e`.
  - `P` = `pnpm learn:port --check all`: 0 differences.
  - `Q` (leak query) = `psql -d critwire_dev -XAtc "select rolname from pg_roles where rolname like 'learn\_%' union all select nspname from pg_namespace where nspname like 'learn\_%' and nspname not in ('learn_spatial','learn_curriculum')"` prints nothing.
  - `H` = `(cd dist && sha256sum -c $M/baseline-sha256-dist.txt 2>/dev/null | grep -v ': OK$' | grep -vE '^\./learn/((.+/)?index\.html|data/(star/)?manifest\.json|schema/star\.svg|labs/d6\.sql): FAILED$')` prints nothing. Every Baseline `dist/` file is byte-identical except Learn's pages, the two manifests, `star.svg` and `d6.sql` (all four from S2). That covers `/v1/**`, `/index.html`, `learn/assets/**`, the six Baseline star CSVs and every other `learn/data/**`, `learn/labs/**` and `learn/diagrams/**` file. Before S2, only pages may differ, and only in the versions line's date.
  - `HN` = `comm -13 <(awk '{print $2}' $M/baseline-sha256-dist.txt | sort) <(cd dist && find . -type f | sort) | grep -vE '^\./learn/(data/star/(dim_habitat_class|fact_country_habitat)\.csv|(power-bi|capstone)/[a-z-]+/index\.html|labs/((p[2-4]|c1)\.sql|c1-feed(\.schema)?\.json)|diagrams/c1-(pipeline|feed)(-dark)?\.svg)$'` prints nothing: no new `dist/` file outside the Architecture's list. Power BI blocks have no download, so there is no `p1.sql`; c1 has no Python block, so there is no `c1.py`.
  - `HR` (repo root) = `sha256sum -c $M/baseline-sha256-repo.txt 2>/dev/null | grep -v ': OK$' | grep -vE '^(AGENTS\.md|package\.json|pnpm-lock\.yaml|plans/(004-learn-curriculum|2026-10-30-critwire-learn-l5-powerbi-capstone)\.md|site/learn/(curriculum\.json|modules/(d5|d6|s5)\.html|pages/schema-star\.html|erd/star\.(mmd|svg)|sql/d6-star-fact-country-habitat\.sql|labs/checked/checked\.json)|e2e/(release/)?[a-z-]+(\.spec)?\.ts|scripts/.+\.ts|scripts/fixtures/(learn-port-004\.md|star-manifest\.json)): FAILED$'` prints nothing, and `git diff --quiet $B0 -- data contracts db docs .diagram-design e2e/__snapshots__ site/learn/duckdb-ext site/learn/labs/requirements.in site/learn/labs/requirements.txt site/learn/erd/v1.mmd site/learn/erd/schema.mmd site/learn/erd/schema.svg site/learn/erd/lab.mmd site/learn/erd/lab.svg` exits 0. Any other changed file needs a Decision.
  - `A` = `git diff --quiet $B0 -- site/learn/src site/learn/sql/setup.sql scripts/build/learn/sql.ts scripts/learn/cell.ts scripts/build/licenses.ts` exits 0. These are the bundle's inputs, CSS included: T3 adds no CSS, and `H` then proves `learn/assets/**`.
- **Draft builds:** every step ends on a passing plain `B`. Mid-step, a plain build refuses a stale lab, and from S9 a missing or unbound feed (T4); `--draft` warns instead. That is why the draft → check → plain loop of `L`/`LU` exists.
- **Content:**
  - 004 and the site change together: a block, result or schema edit lands in 004 and its file in one commit (`P`). 004's prose (§0, §3.5, §5.6, §5.7, §6.3, §7.x, §9, §A.3) changes with the code that makes it true.
  - Ported 004 results hold. A difference is a bug (Failure modes): `p2-check` `022cceeadc7e`, `p4-check` `26cbac454e1c`, and `c1-feed` `0ed7d7c256c4` until S10. The designed changes are `p3-check` (S7, SC9 on L3's summaries) and `c1-feed`'s `bytes` (S10, attribution).
  - **A new ran block** goes into 004 with a provisional result fence (`-- result: <id> · 0 rows · sha256 000000000000`), so `learn:port` accepts it. Iterate with `pnpm learn:check --module <page>`, which writes nothing and replays cross-page `-- after:` blocks. Then `LU` records it.
  - A changed block's file: `learn:port` refuses a file that differs, so delete it and re-port, or edit both; `P` proves them equal.
  - Copy: records, never range (every title, map, ratio and feed field); plain English for adults new to the topic, each term defined once; no Wikipedia prose; no mission names on public pages; link only built pages.
- **Module step** (S5–S8; c1 across S9–S11):
  - 004 §5.6/§5.7's outline becomes the full module in 004, in §5's form: Concept, Worked example, Lab, Result, Exercise `<id>-ex` with its answer, Check, and Dialects (how other tools say the same: Excel's Power Query, Tableau, pandas or SQL).
  - Then `pnpm learn:port <id>`, `site/learn/modules/<id>.html` from it, and `curriculum.json` `<id>` set `built` with T6's tools, all in one commit. Planner's call (Decision at S1): a built page's badges must be true, so the tools change with the page, and S13 verifies them.
  - Power BI blocks keep `untested: Power BI is Windows-only` and their `// input:` lines. Each DAX block names a ran PostGIS twin on its page (`// twin:`). A DAX exercise `<id>-ex` gets its own twin `<id>-ex-check`, both in exercise slots.
  - Pages that call the module "in preparation" link it instead.
- **AGENTS.md:** a step that changes a command, a file rule or the build list updates that line in the same commit. S15 does the final pass (T9).
- **Commit** `S<n>: …` (code + plan), then push. A step that finishes a review item or makes a deviation from 004 adds it under Decisions; S15 adds the shas.
- **Deviations from the Architecture's planner order** (recorded under Decisions at the Steps stage):
  1. `feedAttributionErrors` and `CreditDataset.doi` land in S10 with the attribution fields (planner order 5b), not with T4's other code in S4. S9's plain build binds the feed without attribution checks.
  2. The build's feed check and `writeFeed` apply only when the course has `FEED.block`. A feed file without that block is refused. This keeps S4–S8 plain-green before c1 exists.
  3. `FEED` (the constant only) is created in S3, since T3's input rule names `FEED.input`.
  4. S16 runs the full Verification once before the code review. Rule 7 runs it again on the final commit.
- **Estimate:** 16 steps. With 6 sessions through Steps, plus code review 1, ≈ 2 fix steps, final Verification 1 and Release 1: ≈ 27 of the 48 cap. Count at each session start with `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l5-powerbi-capstone.log`. Past 48, the brief's rule applies: no more review steps; finish Verification and Release; each unfinished assigned item becomes a handoff item.

- [x] S1. Cross-page `-- after:` (T1; F1)
  - First [T]: XS1–XS5 (`scripts/learn/course.test.ts`), XA1–XA3 (`blocks.test.ts`), AS18–AS20 (`assemble.test.ts`), FR13–FR14 (`freshness.test.ts`), PT14 (`port.test.ts`), BF2 (`check.test.ts`). First [D]: XR1 (`runner.dbtest.ts`).
  - Code:
    - `course.ts`: `afterScope`, `courseBlocks`, and `assembleCourse(curriculum, pages, blocks, diagrams)` in two passes. Update its callers (`course-files.ts`, …).
    - `blocks.ts` `lintPage`: the chain is `first.get(a) ?? helpers.get(a)`; the message becomes "(not on this page or a prerequisite's)"; the privilege chain includes the helpers.
    - `assemble.ts`: `sqlDownload`, `blockPart` and boot `used` resolve through `courseBlocks`.
    - `freshness.ts`: `afterChain` over `courseBlocks`; its own `all` map goes.
    - `runner.ts` `blockRuns`/`runBlock` take `courseBlocks` from `check.ts`.
    - `port.ts` `helpers()`: the `afterScope` pages' blocks, from 004.
  - 004 §0 gets the scope rule: scope is transitive, execution runs only the listed blocks, in order; DuckDB stays page-only; Python takes its page or `py-connect`. 004 §7.6: `--module` replays cross-page `-- after:` blocks. AGENTS.md: the scope rule and the `--module` slowness note (T9).
  - Byte-neutral: no block names another page's block yet.
  - Check: `T`, `D`, `L` (every key moves with the checker's closure; `checked/*.txt` unchanged), `P`, `H` and `HN` print nothing, `A`.
- [x] S2. The habitat fact in the star (T2; F2, F3; SC9 c)
  - First [T]: SB1 and SB4 rewritten for eight files, SB8–SB9 (`scripts/build/learn/star.test.ts`), ST6 (`credits.test.ts`). First [E]: `e2e/schema.spec.ts`: the star page has no planned list or badge and links all eight files (red: the Planned section exists).
  - Files:
    - `site/learn/sql/d6-star-fact-country-habitat.sql` and 004 d6, in one commit: `CHECK (est_area_km2 >= 0 AND est_area_km2 <= 9999999999.99)`.
    - `scripts/build/learn/star.ts` `STAR_BLOCKS` += `d6-star-dim-habitat-class`, `d6-star-fact-country-habitat`; `credits.ts` `LAB_FILES` += the two CSVs (T2).
    - `site/learn/erd/star.mmd`: drop `%% planned:` and its comment; rewrite the accDescr. Then `pnpm erd` re-renders `star.svg`.
    - `site/learn/pages/schema-star.html`: drop the Planned section and `{{planned}}`; keep one sentence saying the habitat areas are map estimates.
    - `site/learn/modules/d6.html:34` says "published". 004: d6 ("later (L5)" goes), §6.3 (the planned paragraph goes). Update `scripts/fixtures/star-manifest.json` only if a test needs it.
    - AGENTS.md: the build list's star has 8 files.
  - Decisions: the CHECK's reason (F2) and that sha `80b11c41e5b3` holds; SC9 c (habitat fact `>= 0`, NOT NULL FKs, unknown members kept): done (S2).
  - Log: the two files' rows (75, 5,578) and bytes; `dist/learn/data/` bytes against Baseline.
  - Check: `T`; `L` (`d6-star-fact-country-habitat` and `d6-drill-across` re-run, results unchanged); `P`; `E` (learn-data's star test now covers 8 files: no NULL FK, `ZZ`/`-1`, `NA` as text); `H`; `HN`; `HR`; `A`.
- [x] S3. The Power BI block model (T3; F5; review item 2 on pages)
  - First [T]: PW1–PW2 (`blocks.test.ts`), SB10 (`star.test.ts`), MH15–MH17 (`module-html.test.ts`).
  - First [E]:
    - `e2e/learn-labs.spec.ts`: the Power BI test is generalized to inputs by kind. A star input is checked against the manifest and `checkInput`; the feed input by rows = `cells.length` and the served file's sha256. For DAX twins: `#q-<twin>` exists with its recorded result, and the twin sentence is shown. It iterates over no DAX block until S6.
    - `e2e/learn-data.spec.ts`: its Power BI inputs loop takes `star/` inputs only.
  - Code:
    - `scripts/learn/feed.ts` (new; the `FEED` constant only).
    - `blocks.ts`: `PBI_HEADERS` += `twin`; `INPUT`; the twin lint through the shared named-block predicate, on the page map `first`, with no helpers.
    - `star.ts`: `starInputErrors` → `inputErrors`.
    - `module-html.ts`: `PageContext.inputs`; `powerBiHtml`'s `<p class="twin">` with T3's exact text; Power BI exercises.
    - `site.ts`/`pages.ts` build `inputs` from the star manifest; S4 adds the feed's entry.
    - No CSS (`A`).
  - 004: §0 and §7.5 (`// twin:`, the inputs); §3.5 and §5.6's intro (the twins check arithmetic only, not M parsing, relationship direction, filter context or DAX execution). AGENTS.md Learn files: `// twin:`, and inputs including `labs/c1-feed.json`.
  - Check: `T`, `L`, `P`, `E`, `H`, `HN`, `A`.
- [x] S4. The feed's machinery before c1 (T4 except attribution; F4)
  - First [T]: FD1–FD2 (`scripts/learn/feed.test.ts`, new), WF1–WF3 (`check.test.ts`), PT15–PT16 (`port.test.ts`). First [D]: OR1 (`runner.dbtest.ts`).
  - Code:
    - `feed.ts`: `feedStaleness`, plus the build's feed errors, gated on `FEED.block` (deviation 2).
    - `record.ts` `Outcome.result`, set by `runner.ts` `runBlock`.
    - `check.ts` `writeFeed(runs)`, after `settleResults`, in whole `--update` runs only.
    - `site.ts`:
      - `assertLabsFresh` adds the feed errors: plain refuses, `--draft` warns.
      - `writeLearn` copies `FEED.file` → `dist/learn/labs/c1-feed.json` and `FEED.schema` → `c1-feed.schema.json`.
      - `inputs` gets the feed's entry once the feed is published.
    - `port.ts`: the `json` fence `$id` rule.
  - Validator:
    - `pnpm add -D -E ajv@<current 8.x>` (exact pin; Log the version).
    - `e2e/helpers.ts` `feedSchemaErrors(feed, schema)`: `import { Ajv2020 } from "ajv/dist/2020.js"`, `strict: true, allErrors: true`.
    - Runtime probe, in the Log: `pnpm exec tsx -e` calls it on 004's schema text with `{}`, and errors are listed. A schema with an unknown keyword throws (strict).
  - 004 §7.3 (`learn:check --update` writes the feed from `c1-feed-file`), §7.5 (the refusals), §7.6. AGENTS.md:
    - Stack: ajv for e2e, exact pin.
    - Commands: `learn:check --update` writes the feed; the build list gets `learn/labs/c1-feed{,.schema}.json`; the feed refusals.
  - No feed exists yet, so `dist/` is unchanged.
  - Check: `T`, `D`, `L`, `P`, `H`, `HN`, `HR`, `A`.
- [x] S5. p1 · power-query (T5 p1)
  - Module step: `p1-load` (`LoadStar`, eight inputs), `p1-fact-records`, `p1-ex` (M, untested).
  - Expected values are re-measured from `dist/learn/data/star/manifest.json` (75; 5,578). The stand-in note goes. 004 §A.3's two habitat rows and bytes come from the manifest.
  - `d5.html:24` and `d6.html:16` link p1.
  - No PostGIS block, so no download and no learn:check run.
  - Check: `T`, `P`, `B`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S6. p2 · model (T5 p2)
  - Module step: `p2-measures` (`// twin: p2-check`); `p2-check` (its first repo run must give `022cceeadc7e`); `p2-ex` (DAX) with `p2-ex-check` (PostGIS, ran, new). `d6.html:40` links p2. Tools `[PBI, PG]`.
  - learn-labs' twin test is now real: add `expect(dax.length).toBeGreaterThan(0)` and Log the count.
  - Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S7. p3 · dax, with SC9 (T5 p3; SC9 a, b)
  - One commit holds:
    - 004 p3.
    - `p3-check`: `round(1000 * coalesce(r.records, 0) / NULLIF(h.forest_km2, 0), 3)`, column `sample_records_per_1000_km2_forest`.
    - `p3-measures`: `// twin: p3-check`; the measure becomes "Sample records per 1,000 km2 of forest".
    - Prose: "sample records divided by forest area", and why it isn't sampling effort (the numerator counts records outside forest and is capped per species).
    - The re-recorded result (215 rows, from 2), Expected rewritten from it, and the stand-in note removed.
    - p3's question in `curriculum.json` and in 004 §2's row says "sample records". Tools `[PBI, PG]`.
    - `p3-ex` (DAX) with `p3-ex-check`.
  - TT before: 0.698, on the stand-ins. TT after: `p3-check`'s SQL filtered to `TT`, run once by hand (psql as `critwire_lab` after d6's star blocks in one transaction, rolled back; or DuckDB on `dist/learn/data/star/`). Log the command; both values go under Decisions.
  - Decisions: SC9 a (`NULLIF`) and SC9 b (wording): done (S7). Deviation: `p3-check`'s result and column name.
  - Check: `T`, `P`, `LU` (`p3-check` is a designed change, so 004 takes its new result), `E`, `H`, `HN`, `HR`, `A`.
- [x] S8. p4 · maps-report (T5 p4)
  - Module step: `p4-labels` (`// twin: p4-check`); `p4-check` (must give `26cbac454e1c`); `p4-ex` (with `p4-ex-check` if it's DAX). The prose covers Azure Maps, titles from a measure that say records and never range, credits from `dim_dataset`, and publishing with anonymous scheduled refresh. Tools `[PBI, PG]`.
  - Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S9. c1 (1/3) · the feed through a view (T4 restructure; T5 c1)
  - First [E] `learn-labs.spec.ts` (red: 404):
    - The served `c1-feed.json` equals `checked/c1-feed.json`, and the served schema equals `site/learn/labs/c1-feed.schema.json`.
    - `feedSchemaErrors` returns none, and `meaning` contains "not its range".
    - Against `checked/c1-feed.txt`'s row: cells, records, hot spots and datasets_to_credit are equal; `Buffer.byteLength` = `bytes`; Σ `round(weight × 10⁶)` = `weight_sum × 10⁶` (integers).
    - The s4-cells boot list gains `c1.sql`.
  - 004 c1:
    - `c1-feed` becomes `CREATE OR REPLACE TEMP VIEW c1_feed AS …` (004's doc verbatim), then the summary `FROM c1_feed`.
    - New `c1-feed-file` (after `s5-gistar, c1-feed`), with a provisional fence.
    - The schema fence is unchanged.
  - `pnpm learn:port c1` writes `c1-feed.sql`, `c1-feed-file.sql` and `site/learn/labs/c1-feed.schema.json`.
  - `site/learn/modules/c1.html`: Concept, a worked example with both blocks, the feed's fields and schema, and links to `/learn/labs/c1-feed.json` and its schema. Curriculum c1 `built`, tools `[PG, Py, PBI]`.
  - `LU`:
    - `c1-feed` must hold `0ed7d7c256c4`, which proves the view faithful.
    - `c1-feed-file`'s result goes into 004.
    - `checked/c1-feed.json` is written (Log: 34,848 B), and plain `B` binds it.
  - Decisions: deviation, 004 §5.7/§7.3: a view plus `c1-feed-file`; `learn:check --update` writes the feed.
  - Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- [x] S10. c1 (2/3) · the feed's license and attribution (T4; F9; Astra MUST-FIX 1)
  - First [T]: FD3–FD6 (`feed.test.ts`), ST7 (`credits.test.ts`). First [E] `learn-labs.spec.ts`: `feedAttributionErrors` on the served feed, against the served `/learn/data/manifest.json` credits and `datasets.csv` (title, publisher, doi), returns none (red: no `license`).
  - Code:
    - `feed.ts` `feedAttributionErrors`.
    - `credits.ts` `CreditDataset.doi`.
    - `site.ts`: `assertLabsFresh` takes `labCredits` and adds the attribution errors after the binding (plain refuses, `--draft` warns).
  - 004 c1:
    - The doc gains `license` `'CC BY 4.0'`, `license_url` (the deed) and `attribution` (`CRITWIRE_CREDIT`'s text).
    - Each credit gains `doi`; credits are ordered by title, publisher, doi.
    - Schema: `required` += the three fields; credit items `required` += `doi` (`["string","null"]`); `license_url` gets `"pattern": "^https://"`.
    - Expected: the new bytes.
    - `c1-feed.sql` and the schema file change with it.
  - `LU`: against 004's row, only `bytes` moves (cells 307, records 1,972, weight_sum 0.999954, hot spots 37, credits 7, `fullest` all equal). `c1-feed-file` gets a new sha, and the feed is rewritten. 004 takes both results.
  - Decisions: deviation, the feed's license and attribution with its new bytes and sha. No new licensing decision: it applies DATA-LICENSE.md's CC BY 4.0.
  - Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- [ ] S11. c1 (3/3) · the report, the exercise, the whole page (T4 report; T5 c1)
  - 004 c1 and `c1.html`:
    - `c1-report` (M, `// input: labs/c1-feed.json`, p1's `Web.Contents` pattern, cells to a typed table; untested).
    - `c1-ex` (PostGIS, ran, new; for example, look before counting on the fullest cell).
    - Prose: each pipeline stage with its honesty rule; records, never range, in every title and the report; what a game's credits screen shows (`attribution`, `source`, each `credit` with its DOI); a learner's own feed names its maker in `attribution`; the Python part (run e1–e4's downloads for your own species, linked); Dialects.
  - Decision: deviation, the report reads the feed instead of 004 §5.7's cell CSV.
  - `s5.html:17` links c1. learn-labs' Power BI input test now covers the feed input.
  - Check: `T`, `P`, `LU`, `E`, `H`, `HN`, `HR`, `A`.
- [ ] S12. Diagrams `c1-pipeline` and `c1-feed` (T7; review item 3)
  - First [E]: `schema.spec.ts` `DIAGRAMS` += both (red: no SVG).
  - Files: `site/learn/diagrams/c1-{pipeline,feed}{,-dark}.{html,svg}`, content per T7.
    - Profile `critwire` (`.diagram-design` exists). If the plugin asks its first-run question anyway, answer per the brief's addendum: default tokens, `Font source: system`, profile `critwire`.
    - System fonts; SVG only.
    - Export with `python3 $DD/export_svg.py --system-fonts`; check with `python3 $DD/self_check.py --offline` (`DD=~/.claude/plugins/cache/diagram-design/diagram-design/2.6.136/skills/diagram-design/scripts`).
  - The `<title>` and `alt` state each diagram's point. `{{diagram:c1-pipeline}}` and `{{diagram:c1-feed}}` go in `c1.html`; 004 c1 names them.
  - Decisions: review item 3: done (S12).
  - Check: `T`, `B`, `E`, `H`, `HN`, `A`.
- [ ] S13. Curriculum pass (T6; Goal 4)
  - `curriculum.json`: all 33 `built`; tools per T6; hours (p 7.0, c 8.0, total 68.0) and prerequisites unchanged; p3's question (S7) checked.
  - 004:
    - §2: the Tool column (p1 `PBI`, p2–p4 `PBI + PG`, c1 `PG + Py + PBI`), Depth `full`, the Depth paragraph, totals "33 full".
    - §3's tool table (PG gains p2–p4).
    - §5.6 and §5.7 intros (no longer outlines).
    - §6.3 and §7.1 as built; §7.7 with L5's e2e items; §9's L5 row as built.
  - First [E] `learn-map.spec.ts`:
    - `BUILT_TRACKS` becomes "all 33 modules built, each linked from the map and its track page, returning 200".
    - No `/learn/` page contains "in preparation".
    - Red proof: a scratch "in preparation" in a page makes it fail; revert.
  - Verification 8's §2 script prints `bad 0`.
  - Check: `T`, `P`, `B`, `E`, `H`, `HN`, `HR`, `A`.
- [ ] S14. E2E completion and the release smoke (T8)
  - `learn-screens.spec.ts` `PAGES` += `p3`, `c1`, giving `{p3,c1}-{1280,375}-{light,dark}.png`.
  - `learn-labs`: one test names p1–p4 and c1. Each is built, each Power BI block is untested with its inputs, and each DAX block has its twin.
  - `e2e/release/live.spec.ts` += T8's three tests:
    - each `/learn/data/star/*` sha256 equals the served star manifest's;
    - the served feed is valid against the served schema (`feedSchemaErrors`);
    - `feedAttributionErrors` returns none against the served manifest and `datasets.csv`.
  - Release dry run, as L4 S26: a local Caddy on `e2e/Caddyfile`, then `RELEASE_ORIGIN=http://127.0.0.1:3100 E2E_ARTIFACTS=$M/release-dry pnpm exec playwright test -c playwright.release.config.ts`. Every test passes. Red proof: a scratch edit of one star CSV in `dist/` fails the star test; rebuild.
  - Audit: map each Definition of done E2E item to its test name, in the Log. A gap gets its test here.
  - Check: `T`, `E`, the dry run, `H`, `HN`, `A`.
- [ ] S15. AGENTS.md, 004 final pass, review-item audit, handoff H6 (T9, T10)
  - AGENTS.md final pass (T9): State (all 33 built), Stack (ajv), Learn files (`labs/c1-feed.schema.json`, `checked/c1-feed.json`, `// twin:`, inputs), the scope rule, the build list (8 star files, the feed and schema, the feed refusals), `learn:check --update` writes the feed, the `--module` note.
  - 004: §0, §3.5, §5.6, §5.7, §6.3, §7.1, §7.3, §7.5, §7.6, §7.7, §9 and §A.3 agree with the code.
  - `docs/recovery.md`: L5 adds no state outside Git (the feed is committed; ajv is in the lockfile). If a step added state, document it and add a Decision (`HR`).
  - Audit, under Decisions:
    - Each item is `done (S<n>, <sha>)`, or `rejected` with evidence: SC9 a–d; twins wording (pages S3, handoff here); diagrams (S12).
    - Every deviation from 004 is recorded: cross-page `-- after:` (S1), the CHECK (S2), `// twin:` (S3), the feed's writer (S4, S9), attribution (S10), the report reading the feed (S11), p3 (S7), §2's c1 tools (S13), and the 120 MB cap (H5) instead of the brief's 50 MB.
  - H6 in `/srv/critter-ai/handoff/critwire.md`:
    - The number is the next free one (H6 expected); use `~/AGENTS.md`'s exact item format. Title "Power BI Desktop check against the live star", with no values. `From: critwire-learn-l5-powerbi-capstone · <date>`, `Blocks: nothing`.
    - **Why:** run it against https://critwire.com once the mission's PR is merged and deployed.
    - **Steps** per T10:
      - p1: `LoadStar` and the eight queries; row counts equal each page's input table.
      - Empty `month` and `coordinate_uncertainty_m` cells become null, not errors.
      - `NA` is Namibia, never null or blank. `ZZ` and `-1` are present and filterable.
      - p2's relationships are many-to-one, single direction.
      - `p2-measures`, `p3-measures` and `p4-labels` in DAX query view, each against its twin. The devil's species-filtered credits are 7.
      - `c1-report` has 307 rows. The feed's license, attribution, source and 7 credits are readable.
    - The sentence: the twins verify arithmetic only, not M parsing, relationship direction, filter context or DAX execution; this check covers those.
    - **Your reply:** per query, "matches" or what differs.
  - Decisions: SC9 d and item 2 (handoff part): done.
  - Check: `T`, `P`, `B`, `H`, `HN`, `HR`, `A`. Add `E` if a gap fix changed behaviour.
- [ ] S16. Verification: run the full Verification below
  - Every item, in order, on this commit; Log each.
  - A failure becomes a new fix step before this one, and this step re-runs.
  - This is the run before the code review. Rule 7 repeats it on the final commit.

## Verification

Run on the final commit, after the code review's fixes, on a clean tree, in this order. S16 runs the same once before the code review. `M`, `B0`, `P`, `Q`, `H`, `HN`, `HR` and `A` are as in Steps. Log each result; the numbers go to the Summary.

1. **Install:**
   - `pnpm install --frozen-lockfile` changes nothing.
   - `jq -r .devDependencies.ajv package.json` is an exact version (no `^`/`~`), and `pnpm ls ajv` shows it.
   - `pnpm learn:venv`, then `uv pip check --python .venv-learn`: clean.
2. **Static and isolated tests:**
   - `pnpm typecheck` passes (both tsconfigs).
   - `pnpm test` passes in full, including XS1–XS5, XA1–XA3, AS18–AS20, FR13–FR14, PT14–PT16, BF2, WF1–WF3, SB1–SB10, ST6–ST7, PW1–PW2, MH15–MH17 and FD1–FD6. Each step's Log shows `red n → green n`.
3. **Build and cap:**
   - Plain `pnpm build` passes: labs fresh, the feed bound to `c1-feed-file` and attributed, DOIs current, habitat fresh, `/v1` contract, ERDs and diagrams current.
   - `ls dist/learn/data/star` shows 8 CSVs + `manifest.json`, and `jq '.files|keys' dist/learn/data/star/manifest.json` lists the 8 CSVs.
   - `find dist/learn/data -type f -printf '%s\n' | awk '{s+=$1} END{print s}'` ≤ `jq .cap dist/learn/data/manifest.json` = 120,000,000. Expected ≈ 96.0 MB: Baseline 95,936,992 plus the two CSVs and the manifest growth; Log the exact number.
     - The brief's "50 MB cap" predates the owner's H5 raise to 120,000,000 (AGENTS.md). The build's cap is the one that holds (Decision in S15).
     - The committed lab data, the same sum over `data/raw/gbif-sample data/learn data/gbif-learn-sample`, = 18,822,906 (unchanged).
4. **E2E (primary):** `rm -rf $M/e2e-s* $M/e2e && pnpm build && E2E_ARTIFACTS=$M/e2e pnpm e2e`.
   - Specs: `attribution`, `countries`, `docs`, `duckdb`, `files`, `learn-data`, `serving`, `learn-map`, `learn-browser`, `learn-labs`, `learn-screens`, `learn-timing`, `schema`.
   - `jq .stats $M/e2e/results.json`: unexpected 0, skipped 0, flaky 0.
   - Among the passes:
     - learn-map: all 33 modules built, and no "in preparation".
     - learn-labs: the p/c pages test; Power BI inputs (star and feed) and DAX twins; the feed (served = committed, schema served = committed, Ajv-valid, counts, bytes, weight sum, attribution); the s4-cells boot list with `c1.sql`.
     - learn-data: the star (8 files, no NULL FK, `ZZ` and `-1`, `NA` as text).
     - schema: the star page has no planned list; `c1-pipeline` and `c1-feed` light and dark, each with `<title>` = `alt`.
   - Artifact `$M/e2e/`:
     - `playwright-report/index.html`;
     - one `trace.zip` per test: `find $M/e2e/test-results -name trace.zip | wc -l` = `.stats.expected`;
     - `results.json`, `setup-timing.json`, `caddy-access.log`;
     - `{map,p3,c1}-{1280,375}-{light,dark}.png` (12), plus the earlier missions' screenshots.
   - Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
5. **test:db:** `pnpm test:db` passes in full (XR1 and OR1 included), then `Q` prints nothing.
6. **learn:check:**
   - `psql -d critwire_dev -XAtf db/learn/canary.sql > $M/canary-before.txt`.
   - `pnpm learn:check` twice, each exiting 0, as `critwire_lab`. Each run covers:
     - the loader stage;
     - every ran PostGIS and Python block of every built page against its recorded result, including p2–p4's twins and exercise twins, `c1-feed`, `c1-feed-file` and `c1-ex`;
     - the gates;
     - every download on a fresh load, `p2.sql`, `p3.sql`, `p4.sql` and `c1.sql` included.
   - After both:
     - `git status --porcelain` is empty (`checked.json`, `checked/*.txt` and `checked/c1-feed.json` unchanged);
     - `diff $M/canary-before.txt <(psql -d critwire_dev -XAtf db/learn/canary.sql)` is empty;
     - `Q` prints nothing.
   - `pnpm learn:check --module p3` and `pnpm learn:check --module c1` pass (cross-page `-- after:`, F1).
   - Log the wall times.
7. **Results vs 004:**
   - `P`: 0 differences, covering blocks, results and `c1-feed.schema.json`.
   - `git diff $B0 -- plans/004-learn-curriculum.md | grep -E '^-.*-- result: '` lists only `p3-check` (SC9) and `c1-feed` (bytes), plus any change a Decision proves.
     - `p2-check` `022cceeadc7e`, `p4-check` `26cbac454e1c` and every Baseline result are unchanged, including d6's `80b11c41e5b3` and `37ad5647623e`.
   - `c1-feed`'s recorded row differs from Baseline 004's only in `bytes`.
     - `wc -c < site/learn/labs/checked/c1-feed.json` = that `bytes`.
     - `cmp dist/learn/labs/c1-feed.json site/learn/labs/checked/c1-feed.json` and `cmp dist/learn/labs/c1-feed.schema.json site/learn/labs/c1-feed.schema.json` print nothing.
   - Power BI blocks:
     - `grep -L '^// status: untested: Power BI is Windows-only' site/learn/sql/*.{m,dax}` prints nothing;
     - `grep -L '^// twin: ' site/learn/sql/*.dax` prints nothing.
   - Block counts (Summary): `grep -hE '^(--|#|//) status: ' site/learn/sql/* | grep -oE 'status: (ran|untested)' | sort | uniq -c`.
8. **Curriculum:**
   - `jq '([.modules[]|select(.state=="built")]|length), ([.modules[].hours]|add)' site/learn/curriculum.json` prints 33 and 68.
   - `grep -rl 'in preparation' site/learn/modules site/learn/pages` prints nothing.
   - The §2 script prints `bad 0`:
     ```
     python3 -I - <<'EOF'
     import json, re
     doc = open('plans/004-learn-curriculum.md').read()
     sec = doc.split('\n## 2. The curriculum map', 1)[1].split('\n## 3.', 1)[0]
     rows = [r for r in sec.splitlines() if re.match(r'^\| [a-z]\d \|', r)]
     c = json.load(open('site/learn/curriculum.json')); title = {t['id']: t['title'] for t in c['tracks']}
     bad = int(len(rows) != len(c['modules']))
     for r, m in zip(rows, c['modules']):
         i, tr, slug, skill, q, tool, h, pre, depth = [x.strip() for x in r.strip('|').split('|')]
         tools = {'B' if t == 'DuckDB' else t for t in re.findall(r'\b(B|PG|Py|PBI|DuckDB)\b', tool)}
         got = (i, tr, slug, skill, q, tools, float(h), [] if pre == '—' else [p.strip() for p in pre.split(',')], depth, m['state'])
         want = (m['id'], title[m['track']], m['slug'], m['skill'], ' '.join(m['questions']), set(m['tools']), m['hours'], m['prereqs'], 'full', 'built')
         if got != want: bad += 1; print(i, [(g, w) for g, w in zip(got, want) if g != w])
     print('bad', bad)
     EOF
     ```
9. **ERDs and diagrams:**
   - `pnpm erd` writes nothing (`git status --porcelain site/learn/erd` is empty).
   - `grep -c '%% planned' site/learn/erd/star.mmd` prints 0.
   - `self_check.py --offline` passes on `c1-pipeline` and `c1-feed`, light and dark.
10. **Existing files unchanged:**
    - `H`, `HN` and `HR` print nothing, and `A` exits 0. Their exceptions are exactly the Architecture's expected changes: the star (+2 CSVs, its manifest), the data manifest and index, pages, `schema/star.svg`, `labs/d6.sql`, the new `labs/p2–p4.sql` and `c1.sql`, `c1-feed.json`, `c1-feed.schema.json`, and the four diagrams.
    - `/v1` is byte-identical: `(cd dist && grep -E '  \./v1/' $M/baseline-sha256-dist.txt | sha256sum -c --quiet)` exits 0, and `find dist/v1 -type f | wc -l` = 159 (Baseline's count).
11. **Determinism:**
    - `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > $M/dist-1.sha256`;
    - plain `pnpm build`;
    - the same into `$M/dist-2.sha256`;
    - `diff` is empty.
12. **Handoff:** `/srv/critter-ai/handoff/critwire.md` holds S15's item with `Status: waiting on you` and `Blocks: nothing`. It lists empty numerics, `NA`, `ZZ`/`-1` and the species-filtered credits, and it has the twins-verify-arithmetic sentence.

**Definition of done → proof:**

| DoD item | Proved by |
|---|---|
| typecheck, test, plain build | 2, 3 |
| `pnpm e2e` in full, nothing skipped; learn-map 33 built; learn-labs p/c pages, feed vs schema, every Power BI input; learn-data 8 star files' key coverage (`ZZ`, `-1`) | 4 |
| Results: p/c shas as 004, except `p3-check`/`p3-measures`/`p1-load` inputs (re-run on L3) and `c1-feed` bytes (S10 Decision); learn:check twice; leak query; canary | 6, 7 |
| Cap with the full star (120,000,000 per H5; brief's 50 MB superseded) | 3 |
| Existing files unchanged except star, manifests, pages (and the Architecture's listed additions) | 10 |
| Artifacts and reproduction | 4 |
| Goal: habitat fact, p1–p4, c1 + feed + schema, curriculum pass, H6 | 3, 4, 7, 8, 9, 12 |
| Review items (SC9 a–d, twins wording, capstone diagrams) | 4, 7, 9, 12; Decisions with shas (S15) |
| Release smoke | below |
| Summary: what shipped, the course in numbers (33 modules, blocks ran/untested from 7, 68.0 h), deviations from 004, release record, H6 | written after 1–12 |

**Release smoke**, in the Release unit after `gh pr merge` and `deploy critwire`. `O=https://critwire.com`; `dist/` = plain `pnpm build` of the merge commit.
- `RELEASE_ORIGIN=$O E2E_ARTIFACTS=$M/release-smoke pnpm exec playwright test -c playwright.release.config.ts`: every test passes.
  - Every `dist/` file is served with dist's bytes. That covers every `/learn/` page (200, the p and c pages included), `c1-feed.json`, `c1-feed.schema.json`, `p2–p4.sql`, `c1.sql` and the star.
  - The `.wasm` types; f3's block; the `s4.py` run.
  - Each `/learn/data/star/*` sha256 matches the served star manifest.
  - The served feed is valid against the served schema, and `feedAttributionErrors` returns none against the served manifest and `datasets.csv`.
- Independent curl checks:
  - Pages: `(cd dist && find learn -name index.html | sed 's#index\.html$##') | while read p; do printf '%s /%s\n' "$(curl -s -o /dev/null -w '%{http_code}' "$O/$p")" "$p"; done | grep -v '^200 '` prints nothing.
  - Star: in a new empty temp dir, `curl -fsS $O/learn/data/star/manifest.json | jq -r '.files|to_entries[]|"\(.value.sha256)  \(.key)"' > star.sha`, then fetch each listed file from `$O/learn/data/star/`. `sha256sum -c star.sha` shows 8 OK.
  - Feed: `curl -fsS $O/learn/labs/c1-feed.json | cmp - site/learn/labs/checked/c1-feed.json` and `curl -fsS $O/learn/labs/c1-feed.schema.json | cmp - site/learn/labs/c1-feed.schema.json` print nothing.
- `## Release` records the merge commit, `deploy`'s last line, these results and `$M/release-smoke/`. The release unit appends the merge commit to H6 (T10).

## Failure modes

These are the isolated tests, each written red before its code (owner's rule), listed per part. The ids go in the test names.

**Cross-page `-- after:` (S1)**
- XS1 `afterScope`: `p3` → its prerequisites, transitively (p2, p1, d6, d2, d4, d3, d1, f3, f2, f1 on the real curriculum). `setup` → ∅, and so does a module without prerequisites.
- XS2 `afterScope` throws, naming the page, for an unknown page, a module naming itself, or a prerequisite cycle (the cycle named). The curricula are built by hand, past `parseCurriculum`.
- XS3 `courseBlocks` returns every page's blocks by id, equal to the union of `assembleCourse`'s pages.
- XS4 `assembleCourse` in two passes: a page listed before its prerequisite's page may name that page's ran PostGIS block. The result doesn't depend on page order.
- XS5 Naming a block on a page outside the scope (unrelated, or a dependent page) fails "unknown block "<id>" (not on this page or a prerequisite's)".
- XA1 A cross-page helper that is untested, `-- boot`, expects an error, owns its transaction or runs in sessions is refused with today's message for that case.
- XA2 A DuckDB or Python block naming a cross-page PostGIS block fails the engine check. Python still takes `py-connect`.
- XA3 The privilege chain (`blockRuleErrors(b, chain)`) includes a cross-page helper's statements, as it does an on-page helper's.
- AS18 A page's `.sql` runs a cross-page `-- after:` block's own statements before the block, in the listed order, inside its `BEGIN; … ROLLBACK;`. It never brings that helper's own `-- after:` blocks.
- AS19 Boot detection sees a cross-page helper's code: a helper naming `s4_cells` puts `s4-cells` after `pg-session` in the dependent page's `.sql`.
- AS20 The existing fixture downloads are byte-identical.
- FR13 A block's key moves when a cross-page `-- after:` block changes, and when that block's own `-- after:` block changes (a transitive superset).
- FR14 The key doesn't move for a non-boot block on another page that the block doesn't name.
- PT14 `learn:port` ports a page whose block names a prerequisite page's ran PostGIS block. Naming a non-prerequisite page's block is an error naming 004's line.
- BF2 `--module <page>`: a block naming a prerequisite page's block resolves through `courseBlocks`. The run list is still boot blocks, then the page's blocks; a whole run's list is unchanged.
- XR1 [db] `runBlock` with a cross-page `-- after:` runs exactly the listed blocks, in order, inside the block's transaction.
  - A fixture relying on a helper's own `-- after:` fails, naming the missing relation.
  - The result equals the same block's result with the helper on its own page.

**The habitat fact (S2)**
- SB1, SB4 Eight blocks and eight CSVs, in `STAR_BLOCKS` order with `-- after:` respected. Each CSV passes the input check.
- SB8 The habitat fact's DDL in DuckDB: the committed rows insert. `est_area_km2` of −1 and of 10,000,000,000 are refused.
- SB9 A NULL `country_code` or `habitat_code`, a duplicate (country, class), or a `habitat_code` missing from `dim_habitat_class` is refused.
- ST6 `star/dim_habitat_class.csv` credits `jung-habitat`. `star/fact_country_habitat.csv` credits `jung-habitat` and `natural-earth`, as `country_habitats.parquet` does.

**The Power BI block model (S3)**
- PW1 These are refused, each naming file and line: a `.dax` without `// twin:`; a `.m` with one; a twin that is missing, on another page, not PostGIS, or untested.
- PW2 `// input:` takes `star/<table>.csv` and `labs/c1-feed.json`. It refuses `labs/other.json`, `star/x.parquet`, `/learn/data/star/x.csv` and `../x.csv`.
- SB10 `inputErrors` refuses an input outside `STAR_FILES` ∪ {`FEED.input`}, naming the block and the input.
- MH15 A DAX block shows "Not run by critwire: Power BI Desktop is Windows-only." as today. Then one `<p class="twin">` with T3's sentence and a link to `#q-<twin>`. An M block has no twin line.
- MH16 A Power BI `{{exercise:}}` renders in `<details class="exercise-answer">`. A Power BI `{{skip:}}` is still refused.
- MH17 The inputs table comes from `PageContext.inputs`: star → `/learn/data/star/<file>`, feed → `/learn/labs/c1-feed.json`, with rows and sha256 from the map. An input missing from the map renders "not built yet (draft build)" in `--draft`, and in a plain build throws naming the block and input.

**The feed's machinery (S4)**
- FD1 `feedStaleness(text, recorded)` returns none when `renderResult(FEED.block, {columns: ["feed"], rows: [[text]]})` equals the recorded result. A changed byte, an added final newline or re-indented JSON gives "…c1-feed.json isn't c1-feed-file's result: run pnpm learn:check --update".
- FD2 The build's feed check:
  - with `c1-feed-file` in the course and no feed file: "missing";
  - with no `c1-feed-file`: no check, and nothing published;
  - a feed file without the block: refused.
  - Plain refuses; `--draft` warns.
- WF1 `writeFeed` refuses, naming the block: no `c1-feed-file` outcome, or a failed one; 0 or 2 rows; 2 columns; a column not named `feed`; a cell that isn't a string (a `jsonb` object).
- WF2 It writes `FEED.file` as the cell's text, byte for byte (utf8, no final newline), and leaves an equal file untouched (mtime kept).
- WF3 A `--module` run, a plain run and an `--update` run whose results didn't settle write nothing.
- PT15 A `json` fence whose `$id` is `https://critwire.com/learn/labs/<name>.json` ports to `site/learn/labs/<name>.json` byte for byte.
  - A `json` fence without such an `$id` is neither a block nor an error.
  - `--check` reports a differing file.
- PT16 Two fences with the same `$id` are refused, naming both 004 lines.
- OR1 [db] `Outcome.result` holds the uncut result (7 rows, a 100-character cell), while the recorded text is cut (`SHOWN_ROWS`, `MAX_CELL`) and hashed over the whole.

**The feed's attribution (S10)**
- FD3 `feedAttributionErrors(doc, expected)` returns none for a matching doc. If `license`, `license_url` or `attribution` is missing, or differs from critwire's credit (`license`, `licenseUrl`, `citation`), it gives one error naming the field.
- FD4 A `source` that differs from the gbif-sample credit's `citation` is an error. This is the case of a sample refresh that leaves the old citation in the SQL.
- FD5 `credit` errors: a row equal to no sample dataset's (title, publisher, doi); a duplicate; rows out of (title, publisher, doi) order; a missing `doi` key. `doi: null` passes only for a dataset whose doi is null.
- FD6 A doc that isn't an object, or has no `credit` array, gives errors, never a throw.
- ST7 `CreditDataset.doi` comes from the sample's datasets. `credits(FEED.input, {...labCredits, files: {[FEED.input]: FEED.sources}})` gives the critwire and gbif-sample credits, with ST4's checks.

**When the plan meets reality:**
- **A first repo run differs from 004** (`p2-check`, `p4-check`, or `c1-feed` after S9's restructure). It's a bug. Check, in turn:
  - the `-- after:` list and its order against 004;
  - S2's CHECK text;
  - `PGOPTIONS`/`search_path`;
  - the view against the CTE (`--module c1` prints both).
  Never re-record to match. Only a proven change updates 004 and the file together, under Decisions.
- **After S10, a `c1-feed` column other than `bytes` moves:** the attribution SQL changed which cells or credits are in the doc, or their order. Fix the SQL.
- **`writeFeed` refuses a non-string cell:** the SELECT lacks `::text`.
- **The build refuses the binding after `--update`:** something rewrote the file (an editor or a formatter). Re-run `learn:check --update`; never hand-edit `checked/`.
- **Ajv strict refuses the schema** (an unknown keyword, or `format`): fix 004's fence and the file together (`P`). Never loosen `strict`.
- **The DuckDB star guard fails on the habitat fact:** compare `sum(est_area_km2)` and the counts in both engines (F2's probe found them equal). Fix the DDL text; never skip the block in DuckDB.
- **The lint refuses a p/c block** ("not on this page or a prerequisite's"): its page's prerequisites don't reach the named block's page. Fix the `-- after:` (and 004); never widen the scope rule.
- **`self_check.py --offline` fails, or an export references fonts:** fix the diagram. System fonts and SVG only.
- **`H`, `HN`, `HR` or `A` prints something:** find what changed it. A bundle-input edit (`A`) is reverted, so no new CSS. A needed change gets a Decision.
- **learn:check refuses the venv or the lab role, or names an earlier run's session, or the leak query isn't empty:**
  - venv: run `pnpm learn:venv`;
  - lab role: run `pnpm learn:check --setup`, never `--reset-password` without `--env` for each checkout;
  - earlier session: end it with the printed command, only if no learn:check is running;
  - leaks: drop only this mission's lab-role objects.
- **Disk under 3 GB before an `E`:** delete older intermediate folders; never delete the final `$M/e2e`.
- **A heavy job passes a time limit:** measure it. Raise only that test's limit, with a Decision; never skip it.
- **Session budget:** see the Estimate in Steps.

## Code review (Astra)

## Release

## Decisions

- Rounding probe (Fable MISSED): `country_habitats.est_area_km2` already `DECIMAL(12,2)`, no row > 2 places; DuckDB sum 146,579,613.97 = PostGIS `total_km2`. No DuckDB/PostGIS rounding risk for T2.
- Freshness `afterChain` stays transitive (Astra SC1 taken in part): superset key can't make a stale result look fresh; runner + downloads run listed `-- after:` only, in order.
- Feed attribution embedded in the feed JSON (license, license_url, attribution, per-credit doi), no companion file (Astra MUST-FIX 1).
- Planner order deviations (Steps stage): `feedAttributionErrors` + `CreditDataset.doi` land in S10 with attribution fields, not S4; build's feed check + `writeFeed` apply only when course has `FEED.block` (stray feed file refused), keeps S4–S8 plain-green; `FEED` constant created in S3 (T3 input rule names `FEED.input`); S16 runs full Verification once before code review, rule 7 reruns it on final commit.
- Data cap: Verification checks the build's 120,000,000 B cap (owner raised it, L3 H5), not the brief's 50 MB; `/learn/data/` already 95.9 MB at Baseline.
- S1 (planner's call): a built page's `curriculum.json` tools change in the same commit as its page (badges must be true); S13 verifies them.
- S1: `portPage(doc, page, setupSql, scope)` takes the scope as a 4th arg (default none); `learn:port` computes it from `curriculum.json` via `afterScope`. Lint errors from port now carry their fence's `004:<line>:` prefix (PT14). `blockRuns` takes `course` (courseBlocks) as an option, default the run list, so existing callers are unchanged.
- S2 (F2): habitat fact CHECK `>= 0 AND <= 9999999999.99` (DECIMAL(12,2) max) replaces `< 'Infinity'`, which DuckDB can't compare with a decimal; same text runs in PostGIS + DuckDB. Result sha `80b11c41e5b3` holds (`checked/d6-star-fact-country-habitat.txt`, `d6-drill-across.txt` unchanged). SC9 c (habitat fact `>= 0`, NOT NULL FKs, unknown members kept): done (S2). Star habitat CSVs credit as their lab files (`habitat_classes`/`country_habitats.parquet`: Jung, + Natural Earth for the fact). `%% planned:` marker machinery kept (lab may reuse); tests now build their own planned fixture.
- S3: `// input:` rule is `isInput` (`STAR_INPUT` or `FEED.input`), not a merged `INPUT` regex; `STAR_INPUT` stays for `star-check.ts` `checkInput`. `// twin:` may sit before or after its DAX block on the page (004 puts twins after); the shared `namedError` predicate also refuses a boot, expects-error, own-tx or sessions twin. A plain build throws `input <x> isn't built` for an input missing from `PageContext.inputs`. `blocks.ts` imports `feed.ts`, so the checker's closure (FR7) gains it and every key moved (L re-stamped `checked.json` only). 004's three DAX fences (`p2-measures`, `p3-measures`, `p4-labels`) got their `// twin:` now, so S6–S8 port them as is. Review item 2 (twins verify arithmetic only) now on pages (`p.twin`), in 004 §0, §3.5, §5.6, §7.2 and AGENTS.md.
- S4: `check.ts` `recordRuns(runs, {feed, ...settle})` = `settleResults`, then `writeFeed(runs, feed)` only with `update` and `feed` (set by `blocksStage` when the course has `FEED.block`); WF3 tests it directly. `feedErrors(FeedState)` also refuses a missing `c1-feed.schema.json` once the block exists ("run pnpm learn:port c1"), not in FD2's list but fail-fast. `writeLearn` publishes the feed + schema only when block, feed and schema all exist (a `--draft` without the feed skips it); feed input = `{url /learn/labs/c1-feed.json, rows cells.length, sha256 full hex}` like the star's. `learn:port`'s `$id` duplicate check scans all of 004, not just the page (two pages can't claim one file). ajv 8.20.0 exact.
- S5: p1 in full in 004 (Concept, Worked example, Lab, Result, Exercise, Answer, Check, Dialects); `p1-load`/`p1-fact-records` byte-identical to the outline. `p1-ex` = an M load check (rows, empty keys, LeftAnti orphans, total + Namibia km², `Currency.Type` for `DECIMAL(12,2)`), inputs the two habitat CSVs; Check values measured from the built star (75; 5,578; 0; 0; 146,579,613.97; 822,099.38). Lab adds the manifest→M type table and Power BI's PostgreSQL connector (d5's `learn_powerbi`, gateway needed for Service refresh) so d5's link to p1 is true. §A.3 habitat rows → 5,578 / 78,367 B, §4.1 star bytes → 4,653,920; 12,139, §9 note: p1's stand-in note gone. Page prose writes literal M `{{` as `&#123;{` (the slot pass refuses a leftover `{{`, F10). AGENTS.md State: p1 built.
- S6: p2 in full in 004 (Concept, Worked example with the 9-relationship table, Lab 5 steps, Result, Exercise, Answer, Check, Dialects); `p2-measures`/`p2-check` byte-identical to the outline, `p2-check` first repo run `022cceeadc7e` (holds). `p2-ex` = records + habitat km² by `dim_country[continent]` (answers p2's question: one country column filters both facts); twin `p2-ex-check` (new, `-- after:` d6's 4 dims + fact_records + habitat dim/fact) `755d2b0ec7e2`, 8 rows: Antarctica 12,356,486.85 km², no records (SUMMARIZECOLUMNS keeps a group while any measure has a value). "Expected" folded into Result. AGENTS.md State: p1–p2 built.
- S7: p3 in full in 004 (Concept, Worked example, Lab 5 steps, Result, Exercise, Answer, Check, Dialects). SC9 a (`p3-check` `NULLIF(h.forest_km2, 0)`, matches DAX `DIVIDE`'s blank): done (S7). SC9 b ("sample records divided by forest area", why not sampling effort: numerator counts records outside forest, sample capped 2,000/species; measure "Sample records per 1,000 km2 of forest", column `sample_records_per_1000_km2_forest`, p3 question in `curriculum.json` + 004 §2): done (S7). Deviation from 004 (designed): `p3-check` result `66ff688f234f` (2 rows, stand-ins) → `a26cfe30c3ed` (215 rows, L3's summaries) + column rename. TT before 0.698 (2 / 2,865.12 km², stand-ins), after 0.713 (2 / 2,806.26 km²): `p3-check`'s SQL (with `NULLIF`) over `dist/learn/data/star/{fact_country_habitat,dim_habitat_class,fact_records}.csv` `\copy`'d into temp tables in one psql transaction on `critwire_dev`, rolled back (= the star DuckDB reads). No forest area is 0, so `NULLIF` changes no row. New exercise `p3-ex` (continent share of records vs share of habitat area, `CALCULATE(…, ALL(dim_country))`) with ran twin `p3-ex-check` `70c1540a66db` (8 rows, window `sum() OVER ()`). Stand-in note gone from p3 and §9 (§9 now records the re-run). §2's p3 state/tools column left for S13 (as p1–p2).
- S8: p4 in full in 004 (Concept, Worked example, Lab 7 steps, Result, Exercise, Answer, Check, Dialects); `p4-labels`/`p4-check` byte-identical to the outline, `p4-check` first repo run `26cbac454e1c` (holds). New exercise `p4-ex` (DAX credits table for the devil: dataset title/publisher/DOI, records, CC BY records) with ran twin `p4-ex-check` `561748a1ef09` (9 rows; 7 CC BY datasets to credit, 2 CC0 Arctos). Lab numbers measured on the built star (devil 1,014 points, 4 mainland AU records + 1 Albuquerque point; jaguar 1,948 Jaguar Movement Database fixes, BR 1,370, PY 302, 22 of 25 datasets CC BY; maned wolf 1,128; Namibia 176; 40,395 of 40,395 with coordinates). No page called p4 "in preparation"; nothing to relink. Tools `[PBI, PG]`.
- S9: deviation from 004 §5.7/§7.3 (designed, T4): `c1-feed` keeps the doc as temp view `c1_feed` (004's doc verbatim, dedented out of the old `feed` CTE) and returns the summary `FROM c1_feed`; new `c1-feed-file` (`-- after: s5-gistar, c1-feed`) returns `doc::text AS feed`, and `learn:check --update` writes `checked/c1-feed.json` from it. `c1-feed` first repo run `0ed7d7c256c4` (holds: view faithful). c1 page partial until S11 (Concept, Worked example, the feed's fields, schema + links; Lab/report/exercise/Check/Dialects in S11); curriculum c1 `built` now (tools `[PG, Py, PBI]` as planned; S13 verifies badges). 004 c1 gained Worked example + fields prose; Goal/Report/Expected outline lines left for S11.
- S10: deviation from 004 §5.7 (designed, T4/F9; Astra MUST-FIX 1: done, S10): the feed carries `license` `CC BY 4.0`, `license_url` (deed) and `attribution` (`CRITWIRE_CREDIT`), each credit its `doi`, credits ordered title, publisher, doi; schema requires them (`license_url` `pattern ^https://`, credit `doi` `[string, null]`). Only `bytes` moved: 34,848 → 35,178 (cells 307, records 1,972, weight_sum 0.999954, hot spots 37, credits 7, fullest unchanged); `c1-feed` `0ed7d7c256c4` → `4eb751b94b5d`, `c1-feed-file` `cf7491953851` → `330d13fc6135`. No new licensing decision: applies DATA-LICENSE.md's CC BY 4.0. `version` stays 1: no feed was ever served (L5 unreleased), so 004's "a field change bumps version" doesn't apply yet. Build check `feedAttributionErrors` (pure, `feed.ts`; `FeedAttribution` declared structurally so `credits.ts` stays out of learn:check's import closure) against `credits.ts` `feedAttribution(labCredits)` = `credits(FEED.input, …FEED.sources)` + the sample's datasets; credit order compared as UTF-8 bytes, null doi last (= Postgres C collation, the dev and live dbs' `C.UTF-8`). e2e helper `servedFeedAttribution` (served manifest credits + `datasets.csv` via DuckDB) for learn-labs now and the release smoke in S14.

## Log

- 2026-10-30 05:05 UTC: Baseline on `afed437`: install, venv, typecheck ok; test 664/664; build ok (`/learn/data/` 95.9 MB); test:db 138/138; learn:check ok; e2e 96/96; sha256 lists saved.
- 2026-10-30 05:21 UTC: Architecture by `architect`: F1 cross-page `-- after:` (prereq pages), F2 DuckDB CHECK fix, habitat fact = 2 star blocks, feed via `c1-feed-file` + checked file + ajv, DAX `// twin:` header; est. 25–28 more sessions. Plan-only change, no checks needed.
- 2026-10-30 05:28 UTC: Fable review by `architecture-reviewer`: APPROVE_WITH_CHANGES, 2 MUST-FIX (H6 handoff before Verification, not after release; T1 cross-page scope from full course map, refuse self/cycles). Plan-only change, no checks needed.
- 2026-10-30 05:29 UTC: Astra review: APPROVE_WITH_CHANGES, 1 MUST-FIX (T4 feed needs published license + attribution shipped with download). Plan-only change, no checks needed.

- 2026-10-30 05:40 UTC: Revision by `architect`: 3 MUST-FIX resolved (H6 before Verification; T1 two-pass scope from full map, afterScope refuses self/cycle/unknown; F9/T4 feed embeds license + attribution, checked at build/e2e/smoke); SCs folded in; rounding probe clean. Plan-only change, no checks needed.

- 2026-10-30 05:53 UTC: Steps by `planner`: 16 steps (S1 cross-page after … S16 Verification), Verification, Failure modes; planner deviations under Decisions. Plan-only change, no checks needed.
- 2026-10-30 06:47 UTC: S1 cross-page `-- after:`: `afterScope`/`courseBlocks`, two-pass `assembleCourse`, lint/assemble/freshness/runner/port resolve course-wide; 004 §0, §7.6, AGENTS.md. Red 18 (11 failing + course/check suites not loading: XS1–5, SL4, BF2; XA1–XA2 already held by `lintPage`'s helpers) → green. T: typecheck ok, test 679/679; L: learn:check ok, only `checked.json` re-stamped; build ok; D: test:db 139/139 (XR1 incl.); P 0 diffs; H, HN, HR empty, A ok (`dist/` byte-identical to Baseline); Q empty.
- 2026-10-30 09:00 UTC: S2 habitat fact in the star: `STAR_BLOCKS` 8, `LAB_FILES`/descriptions += 2 CSVs, CHECK fix (004 + file), star.mmd unplanned + `star.svg` re-rendered, star page Planned section gone, d6/004 §6.3 copy. Red: SB1/SB4 (6 files), SB8 (DuckDB CHECK), ST6, e2e star links (habitat CSVs 0 of 1) → green. New files: `dim_habitat_class.csv` 75 rows 4,525 B, `fact_country_habitat.csv` 5,578 rows 78,367 B; `/learn/data/` 96,026,477 B (Baseline 95,936,992; +89,485). T: test 682/682; L: learn:check ok (d6-star-fact-country-habitat, d6-drill-across re-run, results unchanged; only `checked.json`); build ok; E: e2e 96/96 (`$M/e2e-s2`, unexpected/skipped/flaky 0); P 509 equal; H, HN, HR empty; A ok; Q empty. Session interrupted by usage limit after E; checks re-verified (T rerun) before commit.
- 2026-10-30 09:30 UTC: S3 Power BI block model: `feed.ts` (`FEED` only), `// twin:` (DAX required, M refused, lint via shared `namedError` on the page map), inputs `star/<t>.csv` | `labs/c1-feed.json`, `inputErrors`, `PageContext.inputs` (+ draft note / plain refusal), twin line, Power BI exercises; e2e Power BI test by input kind + twins, learn-data star inputs only; 004 §0/§3.5/§5.6/§7.2/§7.5 + DAX `// twin:`; AGENTS.md. Red 5 (BL8, PW1, PW2; star + module-html suites not loading: SB3, SB10, MH7, MH15–MH17) → green; e2e red by scratch mutation on `dist/` (stray `p.twin` on pbi-smoke: toHaveCount 0 got 1), reverted. T: typecheck ok, test 688/688 (FR7 closure + `feed.ts`); L: learn:check ok, only `checked.json`; build ok; E: e2e 96/96 (`$M/e2e-s3`, unexpected/skipped/flaky 0); P 509 equal; H, HN, HR empty; A ok; Q empty.
- 2026-10-30 10:08 UTC: S4 feed machinery: `feed.ts` `feedStaleness`/`feedErrors` (gated on `c1-feed-file`), `Outcome.result` (runBlock), `check.ts` `writeFeed`/`recordRuns` (whole `--update` only), `site.ts` binds (plain refuses, draft warns), publishes feed+schema, feed input; `port.ts` json `$id` fence rule; ajv 8.20.0 (`-D -E`), `e2e/helpers.ts` `feedSchemaErrors` (`Ajv2020`, strict, allErrors); 004 §7.3/§7.5/§7.6, AGENTS.md. Red: feed + check suites not loading (FD1–FD2, WF1–WF3), PT15, PT16; OR1 red by scratch revert of `o.result` → green. Probe: 004's schema on `{}` lists 7 missing required props; unknown keyword throws (strict). T: typecheck ok, test 697/697; D: build stale (closure) as expected, test:db 140/140; L: learn:check ok (147 PostGIS + 33 Python equal), only `checked.json` keys moved; build ok; P 509 equal; H, HN, HR empty; A ok; Q empty; `playwright test --list` 96 (helpers load ajv). No feed yet, `dist/` unchanged.
- 2026-10-30 10:27 UTC: S5 p1 power-query: 004 p1 full module, `learn:port p1` (3 `.m` files), `modules/p1.html`, `curriculum.json` p1 built (tools `[PBI]`), d5/d6 link p1; §A.3/§4.1/§9 re-measured on the published star. No new tests (step lists none; e2e's generic Power BI inputs test now covers p1's 3 blocks, map test p1 linked). T: typecheck ok, test 697/697; P 512 equal; B ok (first try refused a literal `{{` in prose, escaped); E: e2e 96/96 (`$M/e2e-s5`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok. No PostGIS block: no download, no learn:check.
- 2026-10-30 11:06 UTC: S6 p2 model: 004 p2 full module, `learn:port p2` (2 `.dax`, 2 `.sql`), `modules/p2.html`, `curriculum.json` p2 built (`[PBI, PG]`), d6 links p2. Red 1 → green 1: learn-labs Power BI test `dax.length > 0` (0 before; 2 now: `p2-measures`, `p2-ex`). T: typecheck ok, test 697/697; LU: learn:check --update ok (p2-check `022cceeadc7e` unchanged, p2-ex-check new `755d2b0ec7e2`, download p2.sql 0 ERROR as announced; only those 2 results + `checked.json`), build ok; P 518 equal; E: e2e 96/96 (`$M/e2e-s6`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok; Q empty.
- 2026-10-30 11:35 UTC: S7 p3 dax: 004 p3 full module (SC9 a `NULLIF`, b wording), `learn:port p3` (2 `.dax`, 2 `.sql`), `modules/p3.html`, `curriculum.json` p3 built (`[PBI, PG]`, question "sample records"), 004 §2 question + §9 note, p2 links p3, AGENTS.md State. No new tests (step lists none; learn-labs' generic Power BI/twin test covers p3's 2 DAX blocks, map test p3 linked). T: typecheck ok, test 697/697; LU: learn:check --update ok (p3-check `a26cfe30c3ed` 215 rows, designed change; p3-ex-check new `70c1540a66db`; download p3.sql 0 ERROR as announced; only those 2 results + `checked.json`), build ok; P 524 equal; E: e2e 96/96 (`$M/e2e-s7`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok; Q empty; canary unchanged.
- 2026-10-30 14:31 UTC: S8 p4 maps-report: 004 p4 full module, `learn:port p4` (2 `.dax`, 2 `.sql`), `modules/p4.html`, `curriculum.json` p4 built (`[PBI, PG]`), AGENTS.md State. No new tests (learn-labs' generic Power BI/twin test covers p4's 2 DAX blocks, map test p4 linked). Prior session's LU interrupted before commit; resumed: lab numbers re-measured (pandas on `dist/learn/data/star/`), one wording fix ("4 records"). T: typecheck ok, test 697/697; P 530 equal; LU's results kept (p4-check `26cbac454e1c` unchanged, p4-ex-check new `561748a1ef09`), L re-run: learn:check ok, download p4.sql 0 ERROR as announced, `checked.json` unchanged; build ok; E: e2e 96/96 (`$M/e2e-s8`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok; Q empty.
- 2026-10-30 15:00 UTC: S9 c1 feed through a view: 004 c1 `c1-feed` → temp view `c1_feed` + summary, new `c1-feed-file`, Worked example + fields prose; `learn:port c1` (2 `.sql`, schema file); `modules/c1.html` (Concept, Worked example, fields, schema, links to feed + schema); curriculum c1 built (`[PG, Py, PBI]`); AGENTS.md State. Red 2 (e2e: feed 404; s4-cells boot list lacks `c1.sql`) → green 2. T: typecheck ok, test 697/697; `--module c1`: `c1-feed` `0ed7d7c256c4` holds; LU: learn:check --update ok (`c1-feed-file` new `cf7491953851`, `checked/c1-feed.json` 34,848 B written, download c1.sql 0 ERROR as announced; checked/ lists only c1-feed{,-file}.txt, c1-feed.json, checked.json), result into 004; build ok (binds feed; dist feed = checked); P 535 equal; E: e2e 97/97 (`$M/e2e-s9`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok; Q empty; canary unchanged.
- 2026-10-30 15:30 UTC: S10 feed license + attribution: `feed.ts` `feedAttributionErrors`/`FeedAttribution`, `credits.ts` `CreditDataset.doi` + `feedAttribution`, `site.ts` `assertLabsFresh(…, labCredits)` (plain refuses, draft warns: seen warning on the old feed), e2e `servedFeedAttribution` + learn-labs attribution test; 004 c1 SQL/schema/fields prose/results/bytes, `learn:port c1` (c1-feed.sql, schema), c1.html fields. Red: feed + credits suites not loading (FD3–FD6 5 tests, ST7 1) → green; e2e red on the S9 dist (license/license_url/attribution missing, 7× no doi; source ok) → green. T: typecheck ok, test 703/703; LU: learn:check --update ok (155 PostGIS + 33 Python; only `bytes` moved, 35,178 B feed; checked/ lists c1-feed{,-file}.txt, c1-feed.json, checked.json; c1.sql 0 ERROR as announced; canary unchanged), build ok; P 535 equal; B ok; E: e2e 98/98 (`$M/e2e-s10`, unexpected/skipped/flaky 0); H, HN, HR empty; A ok; Q empty; dist feed = checked.

## Summary
