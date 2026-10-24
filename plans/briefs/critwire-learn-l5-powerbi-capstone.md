# Mission brief: critwire Learn L5, Power BI and the capstone: the habitat fact, p1–p4, c1 (mission L5)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l5-powerbi-capstone.md, then run:
     mission start critwire <that file>        (base: main after mission L4 is merged and live)
     Start only after L4 (critwire-learn-l4-stats-etl) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§3.5, §5.6, §5.7, §6.3, §7, §9, §A.3).
     Chain: L1 → L2 → L3 → L4 → L5 (this, the last).
     Estimate: about 22–28 sessions (6 pipeline stages, about 16 steps, code review, verification, release). -->

## Goal

critwire Learn is complete: the Power BI track and the capstone go live, and every module on the map is built:
- **The habitat fact in the star** (004 §6.3, §A.3): `writeStar` adds `dim_habitat_class` and `fact_country_habitat` (grain: one country × one habitat class, `est_area_km2`) from L3's summaries for every country; `/learn/data/star/` and its manifest hold all eight files; the star ERD's drift check passes.
- **p1–p4 written in full** (004 §5.6 outlines → full modules): Power Query on `Web.Contents` with named critwire CSV files and an explicit culture, relationships, DAX measures, maps with honest titles, refresh. Power Query M and DAX stay `untested: Power BI is Windows-only`; their inputs are verified (`-- input:` lines: header, keys, rows, sha256), and each DAX block keeps its PostGIS twin (`p2/p3/p4-check`) giving the table Power BI should show.
- **c1 written in full** (004 §5.7): the pipeline from L1's data through Gi\* on hexagons to a report and a static JSON feed a game reads, labelled as records, never range. `/learn/labs/c1-feed.json` (written by `c1-feed`'s query) and `c1-feed.schema.json` (JSON Schema 2020-12), and the feed validates against it in E2E.
- **A curriculum pass**: all 33 modules `built` in `curriculum.json`; every page's prerequisites, hours and links checked; 004 §2's map and the site agree.
- **A handoff item** for the owner's Windows check (004 §10): open Power BI Desktop, run p1's query and p2–p4's DAX query view queries against the live files, compare each table with its PostGIS twin, report.
- It's live: the mission merges and deploys at its end.

## Why

Power BI is how the owner's work reaches people; the star schema from d6 is its input, and the capstone ties every track together into something a game developer ships: an honest data feed for Critter Connect-style encounters, built from open records.

## Scope

In:
- `scripts/build/` (`writeStar`'s habitat fact, the feed and its schema, the manifest), `site/learn/` (p and c modules, blocks, curriculum state), the star ERD source, `learn:check` (`-- input:` checks for Power BI blocks, if L2 didn't port them), `e2e/`, `AGENTS.md`, `plans/004-learn-curriculum.md` (p1–p4 and c1 in full; fixes where code proves it wrong).
- A JSON Schema validator as a pinned dev dependency, if the E2E needs one (none is in the pins today).
- One handoff item (the Windows check) in `/srv/critter-ai/handoff/critwire.md`.

Out:
- A `.pbix` file (it can't be built or tested here; 004 §7.3).
- Critter Connect's repository and its servers: the feed is a critwire download; the game would ship its own copy (no CORS needed).
- Changes to `/v1`, to L1's sample or to L3's habitat files; new datasets.
- The `critwire` database except through `deploy critwire`; schema `learn_spatial`; IUCN data; Wikipedia prose.

## Definition of done

- `pnpm typecheck`, `pnpm test` and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped: `learn-map` shows all 33 modules built; `learn-labs` checks every p and c page, the feed against its schema, and every Power BI block's inputs; `learn-data` checks the eight star files' key coverage (no NULL foreign key; unknown members `ZZ` and `-1`).
- **Results:** every p and c block keeps the sha256 004 records, except those L3 marked as recorded on the habitat stand-ins (`p1-load`'s inputs, `p3-check`, `p3-measures`): those are re-run on L3's summaries, and the pages and 004 updated in the same commit with what changed. `learn:check` green twice; leak query empty; `learn_spatial` canary unchanged.
- **The 50 MB cap** holds with the full star.
- **Existing files unchanged** except the star, `manifest.json` and pages: compared with the Baseline `sha256sum` list.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l5-powerbi-capstone/e2e/`: Playwright report, traces, `results.json`, screenshots of the map (all built), p3 and c1 at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every `/learn/` page returns 200; `/learn/data/star/*` hash as their manifest says; `c1-feed.json` validates against `c1-feed.schema.json` as served.
- The plan's Summary gives: what shipped, the course in numbers (modules, blocks `ran`/`untested`, hours), every deviation from 004, the release record, and the Windows check's handoff item.

## Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Untestable is said, not hidden**: a Power BI block's page shows "Not run by critwire: Power BI Desktop is Windows-only", its inputs and its PostGIS twin.
- **Records, never range**: the feed's `meaning` field, every title and every map say so.
- **Simplest approach that works**; the feed is a static file.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

## Notes

- **Needs from L4:** s5's Gi\* (temp view `s5_gistar`, which `c1-feed` reads with `-- after: s5-gistar`), s4's cells, e4's credit query, the Python downloads. Read L4's Summary first.
- **Facts the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S11, S26, S27):
  - DuckDB's star is canonical; PostgreSQL's export differs only in whole doubles (`805.0` vs `805`), equal in value.
  - Each DAX block is a DAX query view query (`DEFINE MEASURE` + `EVALUATE`), so the Windows check compares one table per module with its PostGIS twin.
  - The feed: 307 cells, weights summing to 0.999954 (the game draws by weight ÷ sum), 37 recording hot spots (s5's 39 FDR hot cells less 2 empty ones), 7 datasets to credit, about 35 KB.
  - p3's forest ratio ran on the stand-ins (TT 0.698 records per 1,000 km²); L3's summaries change it.
- **Pointers into 004:** Power BI setup §3.5, Power BI §5.6, capstone §5.7, star ERD §6.3, site §7, chain §9, owner's choices §10, star spike §A.3.
