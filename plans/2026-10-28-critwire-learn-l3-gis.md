---
mission: critwire-learn-l3-gis
project: critwire
branch: agent/critwire-learn-l3-gis
status: active
started: 2026-10-28 22:43 UTC
---

# Mission: critwire Learn L3, GIS in SQL: the habitat map and g1–g7 (mission L3)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l3-gis.md, then run:
     mission start critwire <that file>        (base: main after mission L2 is merged and live)
     Start only after L2 (critwire-learn-l2-site) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§4, §5.3, §6.2, §7, §9); habitat: plans/003-learn-data-spatial.md §5.
     Chain: L1 → L2 → L3 (this) → L4 critwire-learn-l4-stats-etl → L5 critwire-learn-l5-powerbi-capstone.
     Estimate: about 28–34 sessions (6 pipeline stages, about 20 steps, code review, verification, release). -->

### Goal

critwire Learn's GIS in SQL track goes live, with the habitat data it needs:
- **`pnpm ingest habitat`** (003 §5, kept by 004 §1): from Jung et al. 2020 **v004 by its Zenodo URL** (doi 10.5281/zenodo.4058819), computes `country_habitats` for every country (estimated km², 003 §5's method 3) and the level-2 class at each sample record (`occurrence_habitats`: the most common class in the record's 1 km cell), and cuts two clips, Costa Rica (`cr`) and Tasmania (`tas`). It commits the results under `data/raw/habitat/` with version, file, md5 and method. A2's two-country stand-ins (L1) are replaced.
- **Published** (004 §4.1): `/learn/data/country_habitats.parquet` (every country), `occurrence_habitats.parquet`, `habitat_classes.parquet`, `clips/{cr,tas}.tif` (cloud-optimized GeoTIFF), credited in `manifest.json` (CC BY 4.0, Jung et al. 2020, v004).
- **The loader grows** (004 §4.3, §6.2): `occurrence_habitats` and `habitat_clips` (in-db rasters, no out-db settings: 004 §1, §3.2), their keys, and its check; the lab ERD's `%% planned:` tables become drawn tables, and its drift check passes against the loaded database.
- **g1–g7 written in full** (004 §5.3 outlines → full modules): concept, worked example, lab, result, exercise with its answer, check, dialects (PostgreSQL, DuckDB, SQL Server), as f1–d6 are. Every outline block keeps its id and its result; g7's three blocks move from `untested: L3 builds the clips` to `ran`; the optional IUCN appendix to g3 stays `untested` (it reads the learner's own `my_iucn` schema).
- **Pages and downloads**: the seven module pages at `/learn/gis-in-sql/<slug>/`, `/learn/labs/g<n>.sql` (`g3-iucn` commented out, 004 §7.3), the map marks them built; `learn:check` runs every g block.
- **E2E**: `learn-labs` and `learn-data` cover the g modules and the habitat files; `schema` covers the grown lab ERD.
- It's live: the mission merges and deploys at its end.

### Why

GIS in SQL is the owner's daily work moved from ArcGIS and SQL Server to PostGIS and open data; the habitat raster is the one place the course teaches raster analysis and estimated areas honestly. Spatial statistics (L4) and Power BI (L5) both read the habitat summaries, so they come before them.

### Scope

In:
- `scripts/ingest/` (`habitat`), `scripts/derive/` and `scripts/build/` (the habitat files, the loader's new tables, the manifest), `data/raw/habitat/`, `site/learn/` (g modules, blocks, curriculum state), `learn:check` (raster support: `-- needs: raster`), `e2e/`, `AGENTS.md`, `plans/004-learn-curriculum.md` (the g modules in full, §4's measured sizes, fixes where code proves it wrong) and the lab ERD source.
- The Python environment if L1 brought it in (or `@duckdb/node-api`/a pinned Node decoder): the architect picks the simplest path that reads v004's GeoTIFFs and writes COGs, and records it.
- The Zenodo downloads (695 MB of 1 km fractions; one-off 2.45 GB 100 m composite for the clips), in a temporary folder, deleted once hashed; never committed.

Out:
- s1–s6 pages, Python lab blocks, `.ipynb` (L4); the habitat fact in the star (L5).
- The owner's COG on S3 or anywhere: nothing cut or computed from it is published unless the owner has confirmed its provenance (003 §5's gate). v004 by URL is the source.
- DuckDB `spatial` in the browser; `/v1` changes; L1's sample or shapes (unchanged).
- IUCN data of any kind (the appendix holds none); Wikipedia prose; the `critwire` database except through `deploy critwire`; schema `learn_spatial`.

### Definition of done

- `pnpm typecheck`, `pnpm test` (the ingest's failure cases first: a wrong md5, an unknown class, a record outside every layer, a stale snapshot) and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped.
- **Results:** every g block 004 recorded as `ran` keeps its sha256 (the sample and shapes are L1's, unchanged); g7's blocks `ran` on the published clips; new exercise blocks `ran`. Replacing the two-country stand-ins changes, by design, the blocks that read `country_habitats` or its star tables: `pg-smoke`, `d4-xmin-load`, `d6-star-dim-habitat-class`, `d6-star-fact-country-habitat`, `d6-drill-across`, `p1-load`'s inputs, `p3-check`, `p3-measures`. Those on built pages (§0, d4, d6) are re-run by `learn:check` and their pages and 004 updated in the same commit, with what changed and why; those of modules not yet built (p1, p3) get a line in 004 saying their recorded result is on the stand-ins, for L4 and L5 to re-run. Any other result change is a bug. `learn:check` green twice in `critwire_dev`; leak query empty; `learn_spatial` canary unchanged.
- **The habitat numbers** (each country's summed estimate against its outline's area, the clips' class counts) are measured and written into 004 §4.1 and g7, with the estimate's error method from 003 §5.
- **The 50 MB cap** holds (004 §4.4 projects ≈ 44–48 MB). If it doesn't, cut in §4.4's order and record it; never drop the loader or the sample's Parquet.
- **Existing files unchanged** except those this mission replaces (`country_habitats`, the loader, `manifest.json`) and pages: compared with the Baseline `sha256sum` list.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l3-gis/e2e/`: Playwright report, traces, `results.json`, screenshots of g3 and g7 at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every g page returns 200; the new `/learn/data/` files hash as `manifest.json` says; the live loader loads in `critwire_dev` and `/learn/labs/g7.sql` runs after it without an unexpected error.
- The plan's Summary gives: what shipped, the ingest's measured time and sizes, the cap total, every deviation from 004, the release record, and what L4 needs to know.

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Estimates are labelled estimates**: a habitat area is from a map, never measured; a record's class is its 1 km cell's, never a species' preference.
- **Simplest approach that works**; the build stays offline (the ingest fetches, the build reads `data/`).
- The owner's answers to 004 §10 (item 5, the habitat raster) override this brief; without an answer, the recommendation: v004 summaries plus the two clips.
- Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.

### Notes

- **Needs from L2:** the pages, templates, `curriculum.json`, `learn:check` with its lints and `checked.json`, the ERD pipeline. Read L2's Summary first.
- **A2's measurements** (003 §1 D4, §5): 1 km fractions zip 695,484,415 bytes, 79 layers, 223 s to download and about 37 min of single-threaded decoding; the 100 m composite 2,454,999,319 bytes; the Costa Rica clip 1.42 MB. The three summary methods and their measured errors are in 003 §5; method 3 is the recommendation.
- **g7 needs no raster settings** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S24): in-db rasters run `ST_Clip`, `ST_ValueCount`, `ST_PixelAsCentroids` and `ST_Value` with `postgis.gdal_enabled_drivers = DISABLE_ALL`, so 003's `pg-once` grants are dropped. Keep the clips in-db in the loader (raster cast from text, as tested).
- **Facts from the g outlines** (Decisions S24): g3's joins start from `country_shapes` (25× faster than from `occurrences`); Natural Earth's FR outline includes GF, RE and MQ, so 933 records sit in two outlines; g5's `EXPLAIN` blocks run after `d3-analyze`.
- **Pointers into 004:** data §4, GIS outlines §5.3, lab ERD §6.2, site §7, chain §9, owner's choices §10.

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

#### Review items assigned to L3

The review's numbering: SC = SHOULD-CHANGE.

1. **SC5 (L3 part):**
   - `country_habitats` and `occurrence_habitats` get their domain CHECKs: `est_area_km2 >= 0` and finite, and class codes must exist in `habitat_classes`.
   - Check the expected identities and counts of the deliberately invalid teaching geometries.
   - g2 and g4 teach that a valid geometry isn't the same as a non-overlapping coverage.
   - The generated Point/4326 geometry, the typed polygon columns and the GiST indexes stay.
2. **Raster labs** run as `critwire_lab` (L1), not the superuser. Assert the meaning of g5's `EXPLAIN` blocks, not the plan text (L2's SC6 rule).
3. **SC2 (moved from L1): a machine-readable `/v1` contract**, kept separate from the data: field names, types and nullability for `species.*` and `countries.*`. The build compares the writers with it; a change of type or meaning, or a removal, fails with "needs /v2". Additions pass.
4. **SC10 (moved from L1): recovery.** Write `docs/recovery.md` and rehearse it once:
   - restore a chosen commit with pinned dependencies into a new scratch database, then compare the output hashes
   - restore the previous static release
   - list the state Git doesn't hold (the DOI intent and lock in `~/.local/state/critwire/`, `.env` credentials) and say that the control room backs them up to the owner's PC

   L4 and L5 update it if they add state.
5. **Loader scaling (moved from L1):** batch `db:load`'s single INSERT (postgres.js stops below 65,534 parameters, so about 2,979 rows) inside the same transaction, or use COPY. Test it with more than 3,000 synthetic rows in scratch.
6. **Anything L1 handed over** as a handoff item comes first.

Estimate with these items: about 34–40 sessions.

## Stages

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

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

## Summary
