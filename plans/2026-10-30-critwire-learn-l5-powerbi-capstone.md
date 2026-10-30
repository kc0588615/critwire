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
- [ ] Architecture: `architect` writes findings and the target design
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

## Summary
