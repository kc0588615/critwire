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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

On `97a66ea` (= `origin/main` `6093a23` + mission start), 2026-10-28, db `critwire_dev` (`CRITWIRE_DB_TARGET=critwire_dev`, `LEARN_PG_URL` as `critwire_lab`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-l3-gis/baseline-*.log`.
- `pnpm install --frozen-lockfile`: ok. No migrations (build rebuilds tables). No lint script in the repo; typecheck is the static check.
- `pnpm typecheck`: ok (2 s). `pnpm test`: 549/549 (2 min).
- `pnpm build` (plain): ok, 5.6 s; `dist/learn/data/` 40,041,618 B, committed lab data 13,677,679 B (cap 50,000,000 each); `dist/` 224 files.
- `pnpm test:db`: 110/110 (5 min 20 s) after the build. Before any build it fails (LD9/LD10/LD18, LC5–LC8 read `dist/learn/data/`): order is build, then test:db.
- `pnpm learn:check`: ok (1 min 57 s); canary `learn_spatial` unchanged, leak check empty, `checked.json` unchanged.
- `pnpm e2e`: 80/80 passed (5.4 min); artifacts `.../critwire-learn-l3-gis/baseline-e2e/`.
- sha256 lists for Definition of done: `.../critwire-learn-l3-gis/baseline-sha256-repo.txt` (604 tracked files) and `baseline-sha256-dist.txt` (224 `dist/` files).
- Roles: `critwire_live` and `critwire_lab` exist. Handoff: no `done` items; H3 (L1, GBIF retention) and H4 (L2, Windows check) wait on the owner and block nothing (brief item 6: nothing L1 handed over blocks L3).
- Read: L2's Summary ("For L3") and the Codex db/backend review (`/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md`) for the architect.

## Architecture

Architect, 2026-10-28, on `9cd75d1`; revised on `eab1841` (see Revision notes). Facts checked on this VPS are marked (checked).

### Findings (ranked by impact)

1. **Whole-country 100 m clips can't live in the loader: 004's size projection is wrong.** 004 §4.4:917 budgets "the clips as rasters" inside ≈ 44–48 MB, and the brief wants them in-db (raster cast from text). In-db raster WKB is uncompressed: 2 bytes per 16BUI cell, 4 as hex, 2.67 as base64. The CR outline's bbox is 3.344° × 3.118° (checked) = 3,723 × 3,471 = 12.9 M cells at v004's 0.000898°: 51.7 MB hex, 34.5 MB base64. Tasmania's main island (`AUS-2660` part 4, 3.697° × 2.947°) = 13.5 M cells: 36 MB base64. Today `dist/learn/data/` holds 40.04 MB of the 50 MB cap. Even 8-bit codes with empty tiles skipped come to ≈ 18 MB, and §4.4's cuts can't free that much. **Fix:** each clip is a fixed 0.75° × 0.75° study window at full 100 m (≈ 0.70 M cells, ≈ 1.86 MB base64), placed where the sample's records are densest (design §1.4). This changes what goes public, so the owner gets a non-blocking handoff item (Revision notes) and the work continues. Fix 004 §4.1, §4.4 and g7 in the same commit and record it under Decisions.
2. **g7's arithmetic assumes the owner's Web Mercator COG, but v004 is longitude–latitude.** 004:5372–5432 uses 103.02 m cells, `2·atan(e^(y/R)) − π/2` and cos². 003 §5:2739 says v004's 100 m composite is EPSG:4326 at 0.000898°, so a cell's ground area shrinks with cos φ (≈ 0.985 in CR, ≈ 0.74 in Tasmania). g7's three blocks are still `untested`, so their SQL can change and keep their ids. Fix: rewrite g7-estimate for the lon/lat grid (per-cell area as `geography`, design §5), and fix 004.
3. **The data/learn layout doesn't support a clips folder.** `readLabFiles` refuses subfolders (`scripts/learn/lab-files.ts:29` "isn't a file"), but 004 §4.1 publishes `clips/{cr,tas}.tif`. `childFile` and `fileSizes` already handle nested names. Fix: provenance names may be relative paths (`clips/cr.tif`), `readLabFiles` reads recursively, and `writeLearnData` creates parent folders. Two type and rule changes go with it: `Provenance.files[].rows` (`lab-files.ts:10`) becomes optional, since a `.tif` has no rows (only `shapes.ts:128` writes it and nothing reads it: checked); and a folder holding no listed file (a stray or empty `clips/`) is refused, as a non-file is today, so `readLabFiles` and `fileSizes` (`cap.ts:11`, already recursive) see the same files.
4. **The raster can't reach the loader through its established path unless a published file holds it.** The loader is generated from dist's published files through DuckDB (`loader.ts:163` turns every BLOB into base64). DuckDB can't read a TIFF. Fix: the ingest also writes `habitat_clips.parquet` (`clip`, `rast` = PostGIS raster WKB). The existing BLOB→base64 path then carries it with no new mechanism, and `lab-keys.sql` converts it with `ST_RastFromWKB(decode(rast,'base64'))`. The existing per-BLOB `ST_SRID(...) <> 4326` check (`loader.ts:201`) works on raster unchanged.
5. **The 1 km fractions hold codes the classes file lacks.** The zip's central directory, read by range request (checked), has 79 layers named `…lvl2__<code>_<name>__ver004.tif`. Five codes, 509, 512, 516, 517 and 518, aren't in `habitat_classes.parquet`'s 75. All five are among the eleven all-zero layers (≈ 49.5 KB each: 200, 504, 509, 512, 516, 517, 518, 800, 1000, 1100, 1400). So the ingest's "unknown class" rule is concrete: a **non-zero** layer whose code isn't in `habitat_classes` fails. `habitat_classes.parquet` stays byte-identical (the DoD requires that).
6. **No Python package reads or writes GeoTIFF.** `.venv-learn`'s pins have pyogrio (vector only), shapely and numpy, but no rasterio or GDAL bindings. The system has libgdal 3.8.4 with no `gdal-bin` and no `osgeo`. `uv pip compile` with `rasterio` added, keeping the existing pins (checked), adds exactly `rasterio==1.5.2`, `affine==3.0.1`, `attrs==26.1.0` and `click==8.5.0`. Wheels exist for cp312 manylinux_2_28 aarch64/x86_64, win_amd64/arm64 and macOS, so `--no-build` holds. Its bundled GDAL has the COG driver.
7. **The `-- needs: raster` header is parsed and linted but never enforced.** `blocks.ts:189–192` sets `needsRaster`, and the runner and `check.ts` never read it. 004 §0 promises "checks the raster library and its settings". Fix: design §4.
8. **The habitat outputs depend on two committed inputs that nothing ties them to.** `country_habitats` depends on `country_shapes.parquet`, and `occurrence_habitats` on the published records, which `deriveSample` makes from `sample.csv` and `download.json`'s `sampleRules`. Without a check, a sample, rule or shapes change would publish stale habitat rows. The loader's FK would catch new ids, but not moved coordinates or changed outlines. A `sample.csv` hash alone would miss a rule change. Fix: `habitat.json` records `country_shapes.parquet`'s sha256 and a fingerprint of the records the ingest consumed (the sha256 of their canonical `id,longitude,latitude` CSV). The build recomputes both from what it publishes and refuses a mismatch, naming the ingest (design §2).
9. **`db:load` sends one INSERT** (`scripts/db.ts:75`, 22 parameters per row): postgres.js refuses 65,534 parameters or more, so ≈ 2,979 rows is the ceiling. Fix: design §7.3.
10. **There is no `/v1` contract separate from its writers** (`scripts/build/columns.ts` `RECORD_COLUMNS` and `COUNTRY_COLUMNS` are both the writer and the oracle). Meaning lives only in the docs page's prose (`site/index.html:100–216`), and nullability nowhere: the writers declare types only. There is also **no recovery document** (no `docs/`). Fix: design §7.1 and §7.2.
11. **Stand-in wording that must change with the data:**
    - `credits.ts:110` adds "(stand-in summaries)";
    - `page.ts:19–20` and `erd.ts:41` describe the stand-ins;
    - `lab.mmd:6` carries `%% planned: occurrence_habitats, habitat_clips` (the drift check fails once those tables exist, by design);
    - `credits.test.ts:56` and `lab-files.test.ts:62` assert the stand-ins.
12. **Areas that are fine:**
    - In-db raster as `critwire_lab` with `postgis.gdal_enabled_drivers = DISABLE_ALL` and outdb off (checked: `ST_RastFromWKB(decode(…,'base64'))`, `ST_ValueCount`, `ST_Value`, `ST_Clip` and `ST_PixelAsCentroids` all ran as `critwire_lab`, not a superuser). Both settings have context `superuser` (checked), so no lab may need them.
    - `postgis_raster` 3.4.2 is installed in `critwire_dev`, with GDAL 3.8.4 (checked).
    - The loader's guard, COPY csv, LAB_CHECKS and the forced failure are untouched.
    - The ERD subset already draws `occurrences ||--o| occurrence_habitats` and `habitat_classes |o--o{ occurrence_habitats` (a nullable code). The drift rules (`erd-model.ts:264–272`) accept that design.
    - `.diagram-design` exists with `profile: critwire`, so diagrams reuse it.
    - The star build publishes only six blocks (`star.ts` `STAR_BLOCKS`), so the habitat star stays L5's.
    - `d6-star-dim-habitat-class` reads only `habitat_classes`, which is unchanged, so **its result must not change**. The DoD lists it, but a change there is a bug.
    - `country_habitats` already has SC5's domain CHECK, `est_area_km2 >= 0 AND est_area_km2 < 'Infinity'` (`lab-ddl.sql:130`), and both FKs (`lab-keys.sql:62–63`), from L1. The upper bound matters: in PostgreSQL `'NaN'::numeric(12,2) >= 0` is true (checked).

### Target design

#### 1. `pnpm ingest habitat [--downloads <dir>]`

**Split, as for `ingest shapes`:**
- `scripts/ingest/habitat.ts` (Node) holds the pins, the rules and every check, and writes the outputs.
- `scripts/ingest/habitat.py` (`.venv-learn/bin/python -I`) does raster and geometry work only: no network, no class rules. It prints a JSON report on stdout and its progress on stderr.

The rules live in Node because they are pure functions there, tested offline with no venv (DoD failure cases), and the build's Parquet writers are DuckDB.

**1.1 Pins** (Zenodo record 4058819, version 004, CC BY 4.0, checked 2026-10-28), in `HABITAT_INPUTS`:

| file | URL | bytes | md5 |
|---|---|---|---|
| `lvl2_frac_1km_ver004.zip` | `https://zenodo.org/api/records/4058819/files/lvl2_frac_1km_ver004.zip/content` | 695,484,415 | `bd8508db8118f14d8da7bfa7950523d4` |
| `iucn_habitatclassification_composite_lvl2_ver004.zip` | `…/files/iucn_habitatclassification_composite_lvl2_ver004.zip/content` | 2,454,999,319 | `d9bad21c2c9e80814f59a6e57d934fa9` |

- `downloadFile` (`scripts/http.ts:101`) gains an `md5` pin beside `bytes`, hashed in the same stream tap. A mismatch deletes the file and throws, as sha256 does today. The run also records each file's sha256 in `habitat.json`.
- The two files are fetched one after the other, never in parallel.
- `LAYER_CODES`: the 79 codes above, pinned. `OVERLAY_CODES = [901, 1000, 1001, 1002, 1003, 1004]` (003 §5: the open-water overlay, left out of the partition).
- `CLIPS` (decision and measurements, design §1.4):
  - `cr`: lon −84.20…−83.45, lat 9.85…10.60;
  - `tas`: lon 147.25…148.00, lat −43.10…−42.35.
  - Bounds are snapped outward to the composite's grid.

**1.2 What Python does:**
- **Inputs:** `--fractions <zip> --composite <zip> --shapes data/learn/country_shapes.parquet --records <csv: id,longitude,latitude> --clips <json> --out <empty dir>`.
- **The 1 km grid.** Each layer is read in place through `/vsizip/` (as `shapes.py` reads RESOLVE). Python asserts:
  - EPSG:4326;
  - all 79 layers share one shape and transform;
  - values are between 0 and 1000;
  - each cell's sum over the partition layers is at most 1000 plus 1 per non-zero layer (the rounding slack).
- **Countries (method 3).** The cell indices whose centre is inside each country outline, per country, by `rasterio.features.rasterize` with `all_touched=False` over the outline's grid window, so overlapping outlines (FR ⊃ GF, RE, MQ, g3's finding) both count a shared cell, as method 3 says. A single label raster would drop the overlaps.
  - Each country's cells are computed once, as flat row-major indices sorted ascending (so sorted by row).
  - Area per cell row: `pyproj.Geod(ellps="WGS84").polygon_area_perimeter`, GeographicLib, the same algorithm as PostGIS `geography`.
  - Layers are read in row bands. The default band is the whole grid (≈ 1.3 GB as uint16, one read per layer). For each band and country, the band's slice of the sorted indices (`searchsorted`) gives Σ fraction ÷ 1000 × cell area. The memory fallback (Risks) lowers one constant, the band height, and runs the same code.
  - Outputs: `country_layer_km2.csv` (country, code, km², unrounded) and `outline_km2.csv` (country, geodesic area, cells counted).
- **Records.** Each record's cell is (row, col) from its longitude and latitude; a cell outside the grid is reported as `outside`. `record_fractions.csv` holds (id, code, fraction) for non-zero values only.
- **Clips.**
  - The composite window is read through `/vsizip/`. Python asserts EPSG:4326, uint16 and the nodata value, and records them.
  - It writes `clip_<id>.bin` (raw little-endian uint16, row-major) and `clip_<id>.tif` with rasterio's `COG` driver: DEFLATE, PREDICTOR=2, BLOCKSIZE=256, OVERVIEW_RESAMPLING=NEAREST, NUM_THREADS=1.
  - Python re-opens the COG and asserts `IMAGE_STRUCTURE` `LAYOUT=COG` and pixels equal to the `.bin`. It reports the transform, size, nodata and value counts.
- **Report:** tools (python, numpy, rasterio, GDAL, pyproj, pyarrow, shapely), the grid, per layer (code, non-zero cells, max), the clips, and timings.

**1.3 What Node does** (`buildHabitat({inDir, dest, python})`, mirroring `buildShapes`):
1. Reads the records from the same rows the build publishes: `readLearnInputs` + `deriveSample` (established interface, never a second CSV parser). It writes them as `records.csv` with `habitatRecordsCsv(occurrences)`, an exported pure function: `id,longitude,latitude`, sorted by id, JS number formatting. That file's sha256 is the records fingerprint (§1.5), and the build hashes the same function's output (§2). It also writes `clips.json`.
2. Runs Python and checks the report:
   - the layer codes equal `LAYER_CODES`;
   - the grid is EPSG:4326;
   - a non-zero layer whose code isn't in `habitat_classes.parquet` throws "unknown class <code> (layer <member>)", and so does a clip value missing from it (nodata excepted);
   - a record `outside` the grid throws, naming its id;
   - Σ estimate over every outline ÷ Σ outline area must be within ±2 %, a guard against unit or transform bugs (003 measured −0.1 % and +0.3 %).
3. Applies the rules (pure, exported):
   - `countryHabitatRows`: partition codes only, km² rounded to 0.01, a row kept when its rounded value is ≥ 0.01, finite and ≥ 0 asserted, sorted by key.
   - `pickClass(fractions)`: the largest partition fraction; ties go to the lowest code; all zero gives NULL (a record outside every layer is a row with `habitat_code` NULL, never an error).
   - `rasterWkb({width, height, ulx, uly, scale, srid: 4326, nodata, pixels})`: PostGIS raster WKB, version 0, one 16BUI band with its nodata flag.
4. Writes into a temp `out/`, through `withOfflineDuckDb` with zstd and fixed options (as `writeOccurrences`):
   - `country_habitats.parquet` (`country_code VARCHAR, habitat_code INTEGER, est_area_km2 DECIMAL(12,2)`, the stand-in's schema);
   - `occurrence_habitats.parquet` (`occurrence_id BIGINT, habitat_code INTEGER` nullable; one row per published record, sorted);
   - `habitat_clips.parquet` (`clip VARCHAR, rast BLOB`);
   - `clips/cr.tif` and `clips/tas.tif`.
5. Only after every check passes does it copy the outputs into `data/learn/` and write `habitat.json` (below). A crash mid-copy leaves sha256 mismatches that `readLabFiles` already refuses ("half-copied: re-run the ingest").

**1.4 The clips: size and windows.**
- **Size.** v004's composite cell is 0.000898315°, so a 0.75° side is 834.9 cells, or 835–836 after snapping outward: ≈ 0.70 M cells.
  - In-db raster WKB is a 61 B header, a 3 B band header (pixel type and flags, 2 B nodata) and 2 B per cell: ≈ 1.39 MB, or ≈ 1.86 MB as base64 in the loader.
  - Two clips come to ≈ 3.7 MB in the loader, plus ≈ 0.3–0.6 MB of Parquet and COGs (estimate; zstd and deflate on class runs): ≈ 4.5 MB all-in.
  - That projects `dist/learn/data/` to ≈ 45.3 MB of 50 (40.04 today), leaving ≈ 4.7 MB for L5's habitat fact (≈ 0.2 MB) and margin. Whole countries would be 34.5 MB (CR) and 36 MB (Tasmania) as base64 (finding 1).
  - If measurement says otherwise, shrink both windows equally (never below 0.5°) and record it.
- **Placement, by the sample** (Fable SC2). Every 0.75° square on a 0.05° lattice over the country was scored by the records carrying that country's code; ties go to the most land inside the outline. Measured in `critwire_dev`'s `learn_curriculum` on L1's sample (40,395 records, as the manifest says; checked). Both windows are fixed constants, so a sample refresh never moves them.
  - **`cr`**: lon −84.20…−83.45, lat 9.85…10.60, from San José to the Caribbean lowlands.
    - 202 of CR's 619 records, all inside CR's outline: red-eyed tree frog 177, brown-throated sloth 22, Baird's tapir 3.
    - Window 6,817 km², of which 6,768 km² is inside the outline (13 % of CR's 51,303 km²).
    - 4 ecoregions: Isthmian-Atlantic moist forests 4,756 km², Talamancan montane forests 953, Costa Rican seasonal moist forests 871, Gulf-Caribbean mangroves 10.
    - It ties with lon −84.15…−83.40 (202 records, 6,666 km² of land) and wins on land.
    - The first design's Osa window (lon −83.75…−83.00, lat 8.25…9.00) held 68.
    - No window holds a fourth species: all 94 CR jaguar records lie in one 0.12° patch in the north-west.
  - **`tas`**: lon 147.25…148.00, lat −43.10…−42.35, south-east Tasmania with Hobart (147.33, −42.88), the point g1 and g5 use.
    - 601 devil records of the 1,993 in and around Tasmania. 491 of them are inside AU's 1:50m outline; the rest are on coasts it simplifies (g3's finding).
    - Window 5,118 km², of which 4,027 km² is land.
    - The first design's window (lat −43.25…−42.50) held 590.
  - A one-cell margin (the outward snap) changes no count (checked).
  - The 100 m class counts per window need the composite, so the real run measures them (`habitat.json` `clips`, 004 g7). Until then the ecoregion count stands in for them.

**1.5 Outputs and provenance** (`data/learn/`, not the brief's `data/raw/habitat/`; Decision: `data/raw/<source>/` holds API snapshots that derive reads, while computed lab files with provenance live in `data/learn/` (L1's shapes pattern; `lab-files.ts:2` already names `habitat.json` as L3's); `readLabFiles`, the committed-data cap and the copy to dist then work unchanged). `habitat.json` replaces the stand-in file, with no `standIn` key and no date, so a rerun is byte-identical:
- `source`: as today, plus `version: "004"`;
- `inputs`:
  - the two Zenodo files (file, url, bytes, md5, sha256);
  - `country_shapes.parquet` sha256 (= `shapes.json`'s);
  - `records`: the fingerprint (sha256 of `habitatRecordsCsv`, §1.3) and the count. This replaces a `sample.csv` hash: it pins what the ingest consumed, so a `sampleRules` or `deriveSample` change is caught, and a sample edit that moves no published record isn't flagged;
- `method`, short text each:
  - country summaries: method 3, 1 km lon/lat, centre in outline, Σ fraction ÷ 1000 × geodesic cell area, partition only, 0.01 km², estimated;
  - record class: the record's 1 km cell, largest fraction, ties to the lowest code, NULL when none;
  - clips: v004 100 m composite window, COG options;
- `layers`: codes, all-zero codes, overlay codes;
- `clips`: bounds after snapping, width, height, nodata, value counts;
- `tools`;
- `measured`: Σ estimate ÷ Σ outline, outlines with no cell centre (tiny ones, such as VA or MC), records with NULL class;
- `files`: name → bytes, sha256, and rows for Parquet only. `Provenance.files[].rows` becomes optional in the same step, with `lab-files.test.ts` (finding 3). `habitat_classes.parquet`'s entry is carried over unchanged, and the ingest verifies it.

**1.6 Interrupts, temp folder, budget:**
- The run is all or nothing; there is no resume inside a run.
- Downloads go to a fresh `mkdtemp` folder, removed in `finally` (SIGINT and SIGTERM included; Python is a child, killed with the run).
- `--downloads <dir>` (development only) keeps and reuses md5-matching zips there, so a rerun after a late failure skips ≈ 17 min of downloading. It refuses a folder inside the repository. The mission deletes that folder when its ingest step ends, and Verification checks that it is gone (brief: deleted once hashed).
- Disk: 3.15 GB of downloads, with 13 GB free (checked).
- Memory: peak budget ≤ 6 GB (11 GiB box), measured and logged; it runs alone (one heavy job at a time).
- Time: budget ≤ 60 min end to end (≈ 17 min of downloads at A2's 3.1 MB/s, plus decoding, which A2 measured at 37 min in JS; GDAL should be faster).
- Run it in the background: `pnpm ingest habitat 2>> /srv/critter-ai/agent-state/missions/critwire-learn-l3-gis/ingest-habitat.log`. Measured time, peak memory and sizes go in the plan's Log and Summary.

**1.7 Failure cases, written as tests before the code** (`scripts/ingest/habitat.test.ts` plus `http.test.ts`, offline, with a fake Python as `shapes.test.ts` does; no venv in `pnpm test`):
1. wrong md5 → throws, no file left;
2. right md5, wrong size → same;
3. unknown class: a non-zero layer not in `habitat_classes` → throws, naming the code; the same code all-zero passes; a clip value not in classes → throws;
4. layer set ≠ `LAYER_CODES` → throws;
5. a record outside every layer → a NULL row; a record outside the grid → throws with its id;
6. `pickClass` ties → lowest code; overlay codes never win;
7. stale snapshot: `assertHabitatFresh` throws when `habitat.json`'s shapes sha256 or records fingerprint differ: a moved coordinate, an added or dropped id, or a changed `sampleRules` ("data/learn/habitat.json is stale (published records changed): run pnpm ingest habitat"). A `sample.csv` change that leaves the published `id,longitude,latitude` rows equal passes;
8. a Python report with missing outputs, extra outputs or bad JSON → nothing reaches `data/learn/`;
9. `rasterWkb`: the header layout and byte length (61 + 1 + 2 + 2·w·h: raster header, band pixel type and flags, 16-bit nodata, cells), plus a `test:db` round trip (`ST_RastFromWKB` → width, height, SRID, pixel type, `ST_Value` at known cells) in `critwire_dev`;
10. `countryHabitatRows`: rounding, the drop rule, a negative or non-finite value throws;
11. `readLabFiles` (`lab-files.test.ts`): a listed nested file (`clips/cr.tif`) without `rows` passes; an unlisted nested file, an empty or stray folder, and a non-regular file are refused, each by name.

Python's own failure modes are runtime assertions (§1.2), which fail the real run loudly.

#### 2. Build: replacing the stand-ins, published files, cap

- **Replacing the stand-ins:** one ingest run rewrites `country_habitats.parquet` (every country with a cell centre in its outline; BV, GI and UM have no 1:50m outline) and `habitat.json`, and adds the four new files. `habitat_classes.parquet` stays byte-identical. Nothing else in `data/` changes.
- **Build checks** (`readBuildInputs`, offline, in `--draft` too, since a stale `occurrence_habitats` would break the loader's FK):
  - `assertHabitatFresh`: `inputs` shapes sha256 against `shapes.json`, and the records fingerprint against the sha256 of `habitatRecordsCsv(result.learn.occurrences)`, which is already in memory in `readBuildInputs` (`inputs.ts:56`);
  - `readLabFiles` (sha256 and size, now recursive: relative paths, an empty or stray folder refused, `rows` optional; finding 3).
- **Published** under `/learn/data/` (byte copies):
  - `country_habitats.parquet`, `occurrence_habitats.parquet`, `habitat_classes.parquet`, `habitat_clips.parquet`, `clips/{cr,tas}.tif`;
  - the index page lists them, with the method notes from `habitat.json` and the word "estimated".
- **Credits** (`LAB_FILES`):
  - `country_habitats` → jung-habitat + natural-earth;
  - `occurrence_habitats` → jung-habitat + gbif-sample;
  - `habitat_clips.parquet` and `clips/*.tif` → jung-habitat;
  - the loader keeps its list;
  - "(stand-in summaries)" is removed (`credits.ts:110`).
- **Manifest:** generic. `columns` and `rows` for Parquet; bytes, sha256 and sources for `.tif`.
- **Cap:** projected ≈ 45.3 MB (`dist/learn/data/`) and ≈ 14.3 MB (committed). Both are measured and written into 004 §4.1 and §4.4. If the total is over 50 MB, 004 §4.4's order applies, after first shrinking the windows (§1.4), and it is recorded.
- **Offline:** the build reads only `data/`; `ingest habitat` is the only network step.

#### 3. The loader (004 §4.3, §6.2)

- `LAB_TABLES` gains, after `country_habitats`:
  - `occurrence_habitats` (`read_parquet('occurrence_habitats.parquet')`, key `occurrence_id`);
  - `habitat_clips` (`read_parquet('habitat_clips.parquet')`, key `clip`).
  - 16 tables.
- `lab-ddl.sql` adds:
  - `occurrence_habitats (occurrence_id bigint NOT NULL, habitat_code integer)`;
  - `habitat_clips (clip text NOT NULL, rast text NOT NULL)`, base64 until the keys step.
- `lab-keys.sql` adds:
  - `ALTER TABLE habitat_clips ALTER COLUMN rast TYPE raster USING ST_RastFromWKB(decode(rast, 'base64'))`;
  - `CHECK (ST_SRID(rast) = 4326 AND ST_NumBands(rast) = 1 AND ST_BandPixelType(rast, 1) = '16BUI')`;
  - the PK `(clip)`;
  - `occurrence_habitats` PK `(occurrence_id)`, FK → `occurrences (id)`, FK → `habitat_classes (code)`.
  - The GiST indexes, the generated Point/4326 column and the typed polygon columns are unchanged (SC5).
- **The per-BLOB SRID check's message** (`loader.ts:202`) changes from "% geometries with SRID other than 4326" to "% values with SRID other than 4326", since `habitat_clips.rast` now goes through it (Fable SC4).
- **Raster guard:** right after `BEGIN`, `DO $$ … IF to_regtype('raster') IS NULL THEN RAISE EXCEPTION 'PostGIS raster is missing: CREATE EXTENSION postgis_raster; (see /learn/setup/)'`. A loader without raster then fails loudly and changes nothing. §3.2 already installs `postgis_raster`.
- **`LAB_CHECKS`** (portable, both engines, with LX fixtures):
  - `covered('occurrence_habitats_occurrence', …)`;
  - `covered('occurrence_habitats_habitat', …)`;
  - `occurrence_habitats_complete` (every occurrence has exactly one row: SC5 plus the "one row per record" contract);
  - `country_habitats_area` stays.
  - Clip content is checked by the ingest (codes, COG equal to the WKB) and by `readLabFiles`' sha256, not in DuckDB, which has no raster.
- **Lab ERD:**
  - remove the `%% planned:` line and update `accDescr`;
  - the tables are drawn already, so the drift check passes against the loaded catalog (`raster` is named by its udt);
  - the `erd.ts` source map gains `occurrence_habitats` and `habitat_clips`, and `country_habitats`' text loses "stand-in";
  - `pnpm erd` redraws `lab.svg`.

#### 4. `learn:check`: raster support

- **The lab role.** Everything already runs as `critwire_lab` through `LEARN_PG_URL`, and nothing new is granted: in-db rasters need neither superuser-only setting (finding 12). The raster labs' role is asserted by a `runner.dbtest.ts` case: a `-- needs: raster` fixture block returns `current_user = critwire_lab`.
- **`-- needs: raster` enforced, once per run, before the first such block:**
  - `postgis_raster_lib_version()` must answer, else "block <id> needs PostGIS raster: CREATE EXTENSION postgis_raster";
  - **the settings must be the learner defaults:** `postgis.enable_outdb_rasters = off` and `postgis.gdal_enabled_drivers = DISABLE_ALL`, else refuse. A block that passes then proves it needs no setting, which is 004 §3.2's promise, and the check fails fast where a learner would.
- `Versions` gains `gdal` (from `postgis_gdal_version()`): recorded and shown, never compared (as GEOS).
- **g5's EXPLAIN blocks** (`g5-knn-plan`, `g5-cast-plan`, `g5-geography-index`) get `-- plan:` lines (L2's SC6 rule; the lint already refuses a ran EXPLAIN block without them):
  - `rows 5` + `Index Scan using occurrences_geom_idx` + `Order By`;
  - `rows 55` + `Seq Scan on occurrences` + `no Index`;
  - `rows 55` + `Bitmap Index Scan on occurrences_geography_idx`.
  - 004's g5 fences change with them.

#### 5. g1–g7

- **Each module** is ported with `pnpm learn:port <id>` from 004 and written in §5.2's form: Concept, Worked example, Lab, Result, Exercise (`<id>-ex`) with its answer and check, and Dialects (PostgreSQL, DuckDB, SQL Server). The module is then set `built`, and `/learn/gis-in-sql/<slug>/` and `/learn/labs/g<n>.sql` are generated.
  - Every outline block keeps its id. Every `ran` block keeps its sha256: same sample, same shapes, so a difference is a bug. EXPLAIN results keep their `-- plan:` meaning instead.
  - `g3-iucn` stays `untested` and is commented out in `g3.sql` automatically (S32 rule).
  - Built pages that name g1 or g3 "in preparation" link them now.
- **New blocks (SC5 teaching):**
  - `g2-coverage`: all 247 outlines are valid, yet FR's interior overlaps GF, RE and MQ. A valid geometry isn't a partition (`ST_Relate(a, b, '2********')` over `&&` pairs).
  - g4 states the same for ecoregions: the overlap in `g4-gap`'s ≈ 675 km², with a count of overlapping ecoregion pairs.
- **g7:**
  - The three blocks keep their ids and move to `ran`. Their SQL is adapted to the lon/lat grid and the windows (§1.4):
    - `g7-records`: the 100 m class under each record inside the `cr` clip (`ST_Intersects(h.rast, o.geom)`; 202 records today). 004's "619 records" becomes the window's count. All 619 still get their 1 km class in `occurrence_habitats`.
    - `g7-valuecount`: the `cr` clip's cells inside CR's outline (the outline drops the window's ≈ 49 km² Caribbean corner);
    - `g7-estimate`: per class, cells, map km² (cells × the nominal equator cell), estimated km² and the share of the clip. A lon/lat cell's ground area depends only on its row, so the estimate groups `ST_PixelAsCentroids`' cells by row and multiplies each row's count by one `ST_Area(ST_PixelAsPolygon(h.rast, 1, row)::geography)`: ≈ 835 area calls instead of ≈ 0.7 M, and the cos φ shrink is visible row by row (Fable SC1, Astra SC3).
  - Added:
    - `g7-latitude`: both clips, map vs ground area, cos φ;
    - `g7-countries`: method 3 summed vs outline area over every country (the DoD's measured habitat numbers; the distribution and the worst small islands). It stays a PostGIS block: the 247 geodesic outline areas take 132 ms (checked), and learners' databases can't read `habitat.json`;
    - `g7-scale`: each record's 100 m class (`ST_Value`) against its 1 km class (`occurrence_habitats`);
    - `g7-ex`.
  - The prose states 003 §5's error method: method 1 against method 3, with the border-cell error.
- **Result-changing blocks** (designed; one commit with their pages and 004, saying what changed and why):
  - `pg-smoke` and `d4-xmin-load`: their source also gains `occurrence_habitats` and `habitat_clips`, since "every lab table" must stay true (16 counts; §3.2's "14" becomes 16);
  - `d6-star-fact-country-habitat`: its DDL gains `CHECK (est_area_km2 >= 0 AND est_area_km2 < 'Infinity')`, the lab table's expression (`lab-ddl.sql:130`), since `>= 0` alone admits NaN in PostgreSQL (finding 12; Astra SC2). This is SC5's star part, cheap because the block re-runs anyway;
  - `d6-drill-across`;
  - **`d6-star-dim-habitat-class` must NOT change** (finding 12);
  - `p1-load` inputs, `p3-check` and `p3-measures` (unbuilt): a line in 004 says their recorded result is on the stand-ins, for L5 to re-run;
  - `s6-habitat` stays `untested` (L4).
- **Diagrams** (diagram-design, profile `critwire` already committed, `export_svg.py --system-fonts`, `self_check.py --offline`, light and dark, `<title>` plus `alt`):
  - `g3-predicates`: inside, edge and outside under Contains, Covers and Intersects, plus the double count where outlines overlap;
  - `g7-cells`: lon/lat cells narrowing with latitude, centre-in-outline at a border, 100 m vs 1 km;
  - g6's MAUP picture only if the prose falls short.

#### 6. E2E

- **`learn-labs`:** generic over built pages, so it covers g1–g7: code equals download, `g3-iucn` commented out, shown results equal recorded ones.
- **`learn-data`** adds:
  - the habitat files' sha256 and size against `habitat.json` (nested `clips/` paths);
  - `occurrence_habitats` ids equal the sample's ids, one row each;
  - every non-NULL code is in `habitat_classes`;
  - `country_habitats` codes are known;
  - the loader's 16 `tables` counts come from `data/`;
  - the `clips/*.tif` start with TIFF magic, and a `Range: bytes=0-1023` request returns 206 with those bytes (the live block, unchanged: owner said no Caddy change);
  - the credits name Jung v004 with no "stand-in".
- **`schema`:** the lab ERD page and dictionary include both tables and no `planned` badge on them; the new teaching diagrams are 200 with `<title>` and `alt`.
- **`learn-screens`:** g3 and g7 at 1280 and 375 px, light and dark, into the artifact dir.
- **`learn-map`:** the g modules are linked and built.

#### 7. Review items

**7.1 SC2: `/v1` contract.**
- **`contracts/v1.json`**, hand-written and separate from `data/` and from the writers. `species` is keyed by dotted path (`ids.gbif`, `sources[].release.key`) and `countries` by column. Each field gets one entry:
  - `type` (DuckDB type) and `null`, the **declared** nullability: may a reader ever see null or an absent key.
  - `means`, the **definition**: what the value is; its unit or format; for an identifier, its namespace. Two examples:
    - `ids.gbif`: "GBIF Backbone Taxonomy usage key (checklist d7dddbf4-2cf0-4f39-9b2a-bb099caae36c); null while the match is unsettled";
    - `range.countriesWithOpenRecords`: "ISO 3166-1 alpha-2 codes, sorted, of countries with CC0/CC BY GBIF records after critwire's filters; not native range; never []; null unless range.status is ok".
  - Optional machine-checked parts of the meaning:
    - `values`: a closed set (`range.status`, `countries.region`);
    - `pattern`: per value or list element (country codes `^[A-Z]{2}$`, `ids.wikidata` `^Q[1-9][0-9]*$`, dates);
    - `source` (+ `checklistKey`): the `sources[].source` that must cite every non-null value. Every `ids.*` field and the countries list have one. A namespace switch, such as GBIF ids from another checklist, then fails the build.
  - `sha`: the first 12 hex of sha256 over the entry's canonical JSON, without `sha`.
  - `speciesCsv` and `countriesCsv`: the ordered column names.
- The docs page (`site/index.html`) stays the readers' explanation. The contract is the normative definition and the build's oracle.
- **The check.** `scripts/build/contract.ts` `checkV1Contract(contract, {recordColumns, csvColumns, countryColumns, species, countries})` is a pure function, called in `readBuildInputs` before any database load or write, in `--draft` too.
- **It fails with "<path>: <change>: needs /v2 (plan 001, Access)" on:**
  - **writers against the contract:** a contract path or column the writer lacks (removal); a changed type; a contract CSV list that isn't a prefix of the writer's (a reorder or removal);
  - **a changed definition:** an entry whose `sha` doesn't match its content. Any edit to `means`, `type`, `null`, `values`, `pattern` or `source` counts as a change of meaning until reviewed. The message adds: "if the owner reviewed it as the same meaning (a wording fix), set sha to <x> in the commit that records the review under Decisions". A mission asks for that review with a handoff item. A missing `sha` prints the value to add;
  - **data against declarations:** a `null: false` field null or absent in any record (list elements included); a value outside `values`; a `pattern` mismatch; a non-null value not cited by its `source` or `checklistKey`.
- **Declared vs observed nullability.** `null` is a promise written by hand. The writers declare types only, and the build never infers nullability from the data.
  - A `null: true` field may hold no null today: `ids.wikidata` and `ids.iucn` are null in 0 of 76 records (checked), yet the docs say an id is null while its match is unsettled.
  - A field null in every record today (`replacedBy`, 76 of 76) is still declared by its type.
  - Only a declared non-null field holding a null fails. Changing `null` in either direction edits the entry, so the `sha` rule applies.
- **Additions pass:** a writer field or CSV column the contract lacks prints "add to contracts/v1.json to freeze". Nothing fails.
- **The limit:** the build sees one version of the contract, so deleting an entry together with its writer field is visible only in a diff. AGENTS.md states that entries are add-only, and the mission's code review diffs the branch.
- Tests come first: each failure above; a nullable field with no nulls passing; nested and appended additions passing; a `means` edit failing with the sha message; a GBIF id cited by another checklist failing.

**7.2 SC10: recovery.** `docs/recovery.md` (short):
1. What Git holds: code, `data/`, plans, and the `gbif-dd-*` and `gbif-learn-*` deposit tags (never delete).
2. What it doesn't hold:
   - `~/.local/state/critwire/`: the DOI lock and intent per target;
   - `.env` files: the agents' checkout, worktrees, `/srv/apps/critwire/.env`;
   - the database roles and their passwords (`critwire`, `critwire_live`, `critwire_lab`);
   - the frozen design spike;
   - the databases, which are rebuildable from Git and hold no unique state.
   - The control room backs up these items to the owner's PC.
3. Restoring a commit:
   - `git worktree add` at the commit, `pnpm install --frozen-lockfile`;
   - as the superuser, `createdb -O critwire critwire_restore` (the dev role has no CREATEDB);
   - a scratch `.env` (mode 600; dev role, `CRITWIRE_DB_TARGET=critwire_restore`; never `critwire_live` credentials);
   - plain `pnpm build`, then `sha256sum` every file in `dist/` and compare;
   - drop the database and remove the worktree.
4. Restoring the previous static release:
   - normal path: revert on `main` by PR, then `deploy critwire`;
   - control-room emergency: deploy's own commands at the previous commit (`git reset --hard <prev>`, install, build, `rsync -a --delete --chmod=D755,F644 dist/ .live/`), then revert `main`, or the next deploy undoes it.

**Rehearsal, once, early** (before L3 changes any data, so "previous release" is L2's live one): steps 3 and 4 at the live commit (`git -C /srv/apps/critwire rev-parse HEAD`), comparing `dist/` with `/srv/apps/critwire/.live/` (read only), and rsyncing into a scratch `.live-rehearsal/`, never the real one. Record the date, commit, file count and result in `recovery.md` and the Log. A difference between checkouts is a finding to fix or document. L4 and L5 update the file if they add state.

**7.3 `db:load` batching:** chunked INSERT in the same transaction (`BATCH_ROWS = 1000`; a unit test asserts `BATCH_ROWS × columns < 65,534`). `scripts/db.dbtest.ts` tests it first:
- 3,500 synthetic records load (count 3,500);
- a duplicate slug in the last batch rolls everything back (the previous table intact);
- the test ends by reloading the real species.

**7.4 SC5:**
- CHECKs and keys: §3.
- **Invalid teaching geometries:** their identities and counts are pinned by `g2-invalid`'s recorded result (11 rows, keys and reasons, sha256), which `learn:check` runs every time and plain build enforces through `checked.json`. The ingest asserts no new geometry rule.
- Teaching: §5 (`g2-coverage`, g4).
- The point column, polygon types and GiST indexes stay.

#### 8. Order of work (for the planner)

0. Before Steps (lead, not a plan step): file the clip-window handoff item (Revision notes). Nothing waits on it. Done: H5, 2026-10-28.
1. `db:load` batching (§7.3).
2. `/v1` contract (§7.1): tests first, then `contracts/v1.json` (definitions, `values`, `pattern`, `source`, per-entry `sha`) and `checkV1Contract`.
3. `recovery.md` and the rehearsal (§7.2), before any data change.
4. venv: add `rasterio` to `requirements.in`, re-compile keeping pins, `pnpm learn:venv`. `requirements.txt` is a checker file, so re-run `learn:check` (results unchanged) in the same step.
5. Ingest failure tests (§1.7), then `downloadFile` md5, `habitat.ts` and `habitat.py`.
6. The real run (background, `--downloads`), plus the data swap in one step: outputs and `habitat.json`; `readLabFiles` nested paths (`rows` optional, stray folders refused; test §1.7 #11 first); freshness check (shapes sha256 and records fingerprint); credits; page and ERD wording; `LAB_TABLES`, DDL, keys, guard, the SRID message and LAB_CHECKS; `lab.mmd` and `pnpm erd`; `learn:check --update` for the designed changes (`pg-smoke` and `d4-xmin-load` edited, d6 blocks with the star's finite CHECK); d4 and d6 pages and 004 (§4.1, §4.3, §4.4 measured, §6.2, p1/p3 notes). The cap is measured here.
7. `learn:check` raster enforcement and `gdal` version (§4).
8. g1 … g6, one step each (port, page, `-- plan:` lines for g5, `g2-coverage`, diagram for g3, 004, check, e2e).
9. g7 (blocks adapted to the §1.4 windows and added, `g7-estimate` by row, diagram, measured numbers and the windows' class counts into 004 §4.1 and g7).
10. E2E additions (§6) and screenshots.
11. AGENTS.md:
    - `ingest habitat` and its files;
    - rasterio in `.venv-learn`;
    - the cost of a species change now includes re-running `ingest habitat` (≈ 1 h, since the sample changes);
    - `contracts/v1.json` (entries add-only; a definition edit needs the owner's review, §7.1), `docs/recovery.md`;
    - L3's state in the Learn section.

Then Verification, code review, release.

### Risks and open decisions (with recommendation)

- **`/vsizip/` reads of the 2.6 GB composite member may be slow** (a deflate stream has no random access). Accept up to a few minutes. If it is slower, `habitat.py` extracts that one member into the temp folder (2.6 GB, room checked); record which.
- **Peak memory of whole-layer reads.** Measure it. If it exceeds 6 GB, lower the band height (§1.2): the same code and the same result.
- **A composite code not in `habitat_classes`.** A2's CR clip had none (003 r01), so this is unlikely. If it happens, it is a real finding: extend `habitat_classes` from v004's legend in a recorded Decision (it changes a file the DoD expects unchanged).
- **Cross-checkout `dist/` differences** in the recovery rehearsal. Investigate; fix any absolute path; otherwise document it.
- **COG byte determinism across reruns** isn't required: provenance pins the bytes. rasterio is pinned, so a rerun is expected to be identical; it is checked once.
- **Session budget:** ≈ 11 steps above, some split by the planner, plus stages, review, verification and release: ≈ 34–38 sessions, within the brief's estimate.
- **Owner: one handoff item, `Blocks: nothing yet`** (text in Revision notes). The 100 m clips are two 0.75° windows, not whole countries, which changes what goes public (brief decision rule). The mission builds the windows and doesn't wait.
  - If the owner later asks for whole-country rasters, they can ship only as COG files beside the windows, not in the loader: ≈ +3 MB (estimated from A2's 1.42 MB CR clip), leaving ≈ 1.7 MB of cap margin. That is an added step before Verification.
  - No item is needed for the rest, which is within the brief's license and scope: `habitat_clips.parquet` repeats published cells in another format, and rasterio joins the learners' pins (BSD-3, wheels on every platform) ahead of L4.

### Rejected alternatives

- Whole-country 100 m clips in the loader: 34.5 + 36 MB as base64, over the cap (finding 1).
- `ST_FromGDALRaster` on the COG's bytes in the loader: needs `postgis.gdal_enabled_drivers`, a superuser-context setting, so `critwire_lab` and non-superuser learners can't, and 004 §3.2 promises no settings.
- `raster2pgsql` for learners: breaks the one-file psql-only loader (§B), and a reload drops the schema.
- 8-bit class indexes: still ≈ 18 MB for whole countries, and g7 would need a lookup join.
- 1 km majority-class clips: invents a product; it isn't v004's 100 m map.
- Whole-country COGs beside window clips in the loader: ≈ +3 MB, and two extents for one name.
- A `clip_habitats` table (method 3 per window): one more table and ERD entity. `g7-countries` and `g7-scale` give the error story with tables already designed.
- Node geotiff.js (the spike's path): no COG writer, 37 min of JS decoding, a dropped pin.
- System `gdal-bin` or `python3-gdal`: unpinned, a root change, not the learners' stack.
- A separate ingest-only requirements file: two pin sets in one venv.
- PostGIS-side zonal sums (spike): superuser settings, and the server can't read the checkout (F12).
- One label raster with `bincount`: loses overlapping outlines, which method 3 counts in both.
- Outputs under `data/raw/habitat/`: `raw/` is for API snapshots derive reads; the cap, `readLabFiles` and the copy to dist would all need special cases.
- Python unit tests inside `pnpm test`: they make the offline suite need the venv. The rules sit in Node instead, and Python fails fast at run time.
- `COPY` for `db:load`: jsonb and `text[]` would need hand encoding; batches are simpler.
- A `/v1` contract generated from `RECORD_COLUMNS`: that is the shared-oracle problem SC2 names.
- An invalid-geometry identity check in the loader: validity can move with GEOS, and would refuse learners' loads. `g2-invalid`'s recorded hash already pins it where versions are known.
- The Osa window for `cr`, picked for its scenery: 68 records against 202 (§1.4).
- Placing the windows by their measured 100 m class count: it needs the 2.45 GB composite before the design, and records are the scarce input for `g7-records` and `g7-scale`. Four ecoregions, from lowland forest to montane forest, already guarantee mixed classes.
- Detecting `/v1` definition edits through Git history in the build: it ties the build to the checkout's history; a per-entry `sha` is local and offline.
- A separate frozen-hash file or a `contract:freeze` command: a second file and a command for what one key per entry does.
- Inferring `null` from the data, or warning on a declared-nullable field with no nulls: that is observed nullability, which Astra MUST-FIX 2 separates from the promise.
- `g7-countries` reading per-country numbers from `habitat.json` (Fable SC5): learners' PostGIS can't read it, and the outline areas take 132 ms (checked).
- Per-cell `geography` areas in `g7-estimate`: ≈ 0.7 M area calls for ≈ 835 distinct values (one per row).
- A `sample.csv` sha256 as the freshness input: it misses `sampleRules` and `deriveSample` changes, and it flags edits that move no published record.
- Changing the `country_habitats_area` LAB_CHECK to the finite form: in PostgreSQL the DDL CHECK refuses NaN before the check runs, and DuckDB's DECIMAL can't hold NaN, so the edit would be churn.

## Architecture review (Fable)

Fable 5.1, 2026-10-28, on `de50d8b`. Every cited line checked in the worktree; 003 §5 and 004 §4.3, §4.4, g7 read.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Window clips need a handoff item (non-blocking).** Finding 1 is right (12.9 M cells × 2.67 B base64 = 34.5 MB for CR alone; §4.4's cuts can't free that), and the 0.75° windows are the simplest fix. But the brief's deliverable is "clips, Costa Rica and Tasmania" and its rule is "anything that changes … what goes public beyond this brief goes to the owner as a handoff item". What goes public changes: `cr` is the Osa window (68 records, 3 species), not Costa Rica (619 records as g7's Expected says). Fix: add one handoff item (`Blocks: nothing yet`) stating the window bounds, the size arithmetic and that g7 now reads 68 CR records; keep building. The Decision entry stays.

MISSED:
- `assertHabitatFresh` pins `sample.csv` and `country_shapes.parquet`, but the published record set also depends on `download.json`'s `sampleRules` and `deriveSample`. A rule change leaves both hashes intact and fails later as an FK / `occurrence_habitats_complete` LAB_CHECK, with no "run pnpm ingest habitat" hint. Cheap fix: in `readBuildInputs`, compare `occurrence_habitats.parquet`'s id set with `deriveSample`'s ids (both in memory) and fail with the ingest message.
- `Provenance.files[].rows` is required (`lab-files.ts:10`); the `.tif` entries make it optional. Name that type change in the step so `shapes.json` readers and `lab-files.test.ts` move together.
- `readLabFiles` recursive: today the "listed by neither" check sees top-level names only; once recursive it must refuse a stray folder (e.g. an empty `clips/`) the same way it refuses a non-file, or `fileSizes` (recursive) and `readLabFiles` disagree on the cap input.

SHOULD-CONSIDER:
1. `g7-estimate`: a lon/lat cell's area depends only on its row, so `sum` over `ST_PixelAsCentroids` grouped by row (or `ST_Y` bucket) with one `geography` area per row is ~800 area calls instead of ~700k, and teaches the cos φ point more directly than per-pixel polygons.
2. Pick the CR window by data, not scenery: the 0.75° square holding the most CR records with ≥ N partition classes; 68 records / 3 species is thin for `g7-records` and `g7-scale`. Record the chosen bounds either way.
3. `habitat.py` per-layer whole reads (79 × 1.3 GB) plus per-country fancy indexing is fine, but store each country's cell indices once as `(row, col)` arrays sorted by row, so the memory fallback (row bands) is the same code path, not a rewrite.
4. The loader's per-BLOB SRID message says "geometries"; make it "geometries or rasters" once `habitat_clips.rast` goes through it, so a learner's failure text matches.
5. `g7-countries` sums 247 outlines' `geography` areas on every `learn:check`; it's the DoD's measurement, so also write the per-country table into `habitat.json`'s `measured` at ingest time (the ingest already has `outline_km2.csv`) and let g7 only read it, keeping the check fast and the numbers in one place.

## Architecture review (Astra)

Astra (GPT-6-Astra, medium), 2026-10-28, on `cc46b58`.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Clip scope change needs an owner handoff.** Whole-country clips become small study windows. The size justification is sound, but “nothing needs a handoff” contradicts the brief’s public-scope rule. Record bounds, reduced coverage and rationale in the project handoff; independent work can continue.
2. **The `/v1` contract cannot enforce its promised semantic compatibility.** §7.1 checks names, types and observed nulls; changed units, identifier namespaces or field meanings still pass. Record semantic definitions and require explicit compatibility review for changes. Distinguish declared nullability from whether today’s snapshot contains nulls.

SHOULD-CONSIDER:
1. Fingerprint the canonical habitat inputs—published occurrence IDs and coordinates—alongside source hashes, so freshness remains tied to what ingestion actually consumed.
2. Apply finite, nonnegative area constraints consistently to the habitat star fact; `>= 0` alone is weaker than the existing lab-table constraint.
3. Compute geodesic pixel area once per raster row in g7, preserving the intended calculation while avoiding hundreds of thousands of repeated area calculations.

## Revision notes

Architect, 2026-10-28, on `eab1841`. Window counts were measured in `critwire_dev` `learn_curriculum`, which equals L1's sample (40,395 records, as `dist/learn/data/manifest.json` says).

- **Fable MUST-FIX 1 = Astra MUST-FIX 1 (window clips need an owner handoff):** resolved. Finding 1 and Risks now have one non-blocking item (text below), and §1.4 gives the exact bounds, the size arithmetic and the measured counts.
- **Astra MUST-FIX 2 (`/v1` semantics and declared nullability):** resolved in §7.1 and finding 10.
  - Each entry carries `means` (meaning, unit or format, namespace) and machine-checked `values`, `pattern` and `source`/`checklistKey`.
  - A per-entry `sha` makes any definition edit fail with "needs /v2" until an owner-reviewed Decisions line updates it.
  - `null` is declared by hand and only checked against the data, never inferred from it.
  - Limit stated: deleting an entry together with its writer field shows only in review.
- **Fable MISSED 1 = Astra SC1 (fingerprint the consumed records):** adopted in finding 8, §1.3, §1.5, §2 and §1.7 #7. The sha256 of `habitatRecordsCsv(occurrences)` replaces the `sample.csv` hash.
- **Fable MISSED 2 (`rows` required):** adopted in finding 3 and §1.5: `rows` becomes optional. Its only writer is `shapes.ts:128` and nothing reads it (checked).
- **Fable MISSED 3 (stray folders):** adopted in finding 3, §2 and §1.7 #11.
- **Fable SC1 = Astra SC3 (area per row):** adopted in §5 `g7-estimate`.
- **Fable SC2 (CR window by data):** adopted for both clips in §1.4. `cr` moves from Osa (68 records) to the central window (202). `tas` moves 0.15° north (601 records, from 590).
- **Fable SC3 (sorted indices, one code path):** adopted in §1.2 and Risks.
- **Fable SC4 (SRID message):** adopted in §3.
- **Fable SC5 (per-country table in `habitat.json`, g7 reads it):** rejected. Learners' PostGIS can't read `habitat.json`, and the 247 outline areas take 132 ms (checked). `measured` keeps the summary.
- **Astra SC2 (finite, non-negative on the star fact):** adopted in §5, with the lab table's `>= 0 AND < 'Infinity'`. NaN passes `>= 0` in PostgreSQL (checked). The `country_habitats_area` LAB_CHECK is left as it is (Rejected alternatives).
- **Own correction:** §1.7 #9 gave the raster WKB length as 61 + 2 + 2·w·h. It is 61 + 1 + 2 + 2·w·h, because the band header is 1 B of pixel type and flags plus 2 B of nodata.

**Handoff item (filed as H5 in `/srv/critter-ai/handoff/critwire.md`; `From: critwire-learn-l3-gis`; `Blocks: nothing yet`).**
- **Title:** L3: habitat 100 m clips are two study windows, not whole countries.
- **Why:** The brief publishes 100 m clips of Costa Rica and Tasmania, and the loader must hold them in-db.
  - Whole countries would be ≈ 70 MB in the loader: CR is 12.9 M cells, 34.5 MB as base64, and Tasmania 13.5 M cells, 36 MB. The 50 MB `/learn/data/` cap already holds 40.04 MB.
  - Each clip is therefore a fixed 0.75° × 0.75° window at full 100 m: ≈ 0.70 M cells, ≈ 1.86 MB each in the loader, ≈ 4.5 MB all-in. The projected total is ≈ 45.3 MB.
  - **`cr`**: lon −84.20…−83.45, lat 9.85…10.60 (San José to the Caribbean lowlands). It holds 202 of the sample's 619 Costa Rica records and 13 % of the country's area.
  - **`tas`**: lon 147.25…148.00, lat −43.10…−42.35 (south-east Tasmania with Hobart). It holds 601 of the 1,993 devil records in and around Tasmania.
  - Both windows are where the sample's records are densest.
  - Unchanged: every country's habitat summary and every record's 1 km habitat class are published in full.
- **Steps:** 1. Read the above. 2. Reply below.
- **Your reply:** `keep windows` (the default; the mission builds this), or `also publish whole-country COG files`. The second means files only, not in the loader: ≈ +3 MB (estimated), leaving ≈ 1.7 MB of cap margin, and the mission adds a step before Verification.

## Steps

Every step:
- `M` = `/srv/critter-ai/agent-state/missions/critwire-learn-l3-gis`. "§n" = this plan's Target design.
- **First** = failure cases written and run red before the code (Log: `red n → green n`). No test written after its code. E2E cases for a feature land in the step that builds it.
- **Checks**, one heavy job at a time (none while S7's ingest runs). No lint script; `pnpm typecheck` is the static check.
  - `T` = `pnpm typecheck && pnpm test`.
  - `B` = plain `pnpm build`.
  - `D` = `B`, then `pnpm test:db` (reads `dist/`).
  - `L` = `pnpm build --draft && pnpm learn:check && pnpm build`. A step that changes a recorded result uses `learn:check --update` (whole run; commit `checked/` + `checked.json`), then `L` again.
  - `E` = `B`, then `pnpm e2e`; `jq .stats e2e-artifacts/results.json`: 0 unexpected, 0 skipped, 0 flaky.
  - `P` = `pnpm learn:port --check all`: 0 differences.
  - `H` = `(cd dist && sha256sum -c $M/baseline-sha256-dist.txt 2>/dev/null | grep -v ': OK$' | grep -vE '^\./learn/((.+/)?index\.html|data/(manifest\.json|country_habitats\.parquet|postgis/learn_curriculum\.sql)|labs/(pg-checks|d4|d6)\.sql|schema/lab\.svg|diagrams/d6-drill-across(-dark)?\.svg):')` prints nothing: every other Baseline `dist/` file (`/v1`, docs page, star, shapes, sample, assets, d1/d3/d5 downloads) unchanged. Before S9, `learn_curriculum.sql` and `manifest.json` must be OK too.
  - `HD` = `grep '  data/' $M/baseline-sha256-repo.txt | sha256sum -c 2>/dev/null | grep -v ': OK$' | grep -vE '^data/learn/(country_habitats\.parquet|habitat\.json):'` (repo root) prints nothing. Before S10, nothing may fail.
- **Content:**
  - 004 and the site change together: a block or result edit lands in 004 and its file in one commit (`P`).
  - New block: fence in 004 (`status: ran`), `pnpm learn:port <page>`, `learn:check --update` records it, its result fence copied into 004.
  - A ran g block keeps 004's sha256 (same sample, same shapes): a difference is a bug (Failure modes).
  - Copy per AGENTS.md: records, never range; estimates labelled estimates; no mission names on public pages; link only built pages.
- **Module step** (S12–S18): 004 §5.3's outline becomes the full module in 004, in §5.2's form (Concept, Worked example, Lab, Result, Exercise `g<n>-ex` with Answer and Check, Dialects: PostgreSQL, DuckDB, SQL Server). Then `pnpm learn:port g<n>`, `site/learn/modules/g<n>.html` from it, and `curriculum.json` g<n> `built` in the same commit. Built pages naming it "in preparation" link it.
- **Commit** `S<n>: …` (code + plan), push. A step finishing a review item adds `item <n>: done (S<n>)` under Decisions; S20 adds the shas.
- **Deviations from §8** (S1 records them under Decisions):
  1. Item 6 is split. S7 runs the ingest and holds its outputs in `$M/habitat-out/`, so the tree stays on the stand-ins and the build stays green. S8 is `readLabFiles`, S10 the swap, S11 004's data sections.
  2. Item 7 (raster plumbing) moves before the swap (S9), so S10 fits one session.
  3. §6's habitat E2E cases are written first, in S10, not after g7.
  4. g5 gets `g5-analyze` (planner finding, S16).
- **Estimate:** 20 steps. With the 7 sessions through Steps, the code review, ≈ 2 fix steps, Verification and Release: ≈ 32 sessions.

- [x] S1 · `db:load` batching (§7.3; item 5) + item 6
  - Save first: `$M/baseline-manifest.json` = `/srv/apps/critwire/.live/learn/data/manifest.json`, after checking its sha256 is `f180c320…9565`, the Baseline list's.
  - First [T] `scripts/db.test.ts`: `BATCH_ROWS × columns < 65,534` (columns from `speciesRows`).
  - First [D] `scripts/db.dbtest.ts`:
    - 3,500 synthetic records load (count 3,500);
    - a duplicate slug in the last batch rolls everything back (previous table and rows intact);
    - the test ends by reloading the real species.
  - Code: `scripts/db.ts` `loadDatabase`: `BATCH_ROWS = 1000`, chunked `insert` in the same transaction (today one insert, `db.ts:75`).
  - Decisions: item 5 done; item 6 done (Baseline: H3 and H4 block nothing); the §8 deviations above.
  - Check: `T`, `D`, `H`, `HD`.
- [x] S2 · `/v1` contract (§7.1; item 3, Astra MUST-FIX 2)
  - First [T] `scripts/build/contract.test.ts`. Each fails with "<path>: <change>: needs /v2 (plan 001, Access)":
    - a contract path or column the writer lacks; a changed type; a contract CSV list that isn't a prefix of the writer's;
    - an entry whose `sha` doesn't match (a `means` edit, with the sha hint); a missing `sha` prints its value;
    - a `null: false` field null or absent (list elements too); a value outside `values`; a `pattern` mismatch;
    - a non-null value its `source`/`checklistKey` doesn't cite (a GBIF id from another checklist).
    - Passes: a `null: true` field with no nulls; nested and appended additions, printing "add to contracts/v1.json to freeze".
  - Files:
    - `contracts/v1.json`: each `species` dotted path and `countries` column with `type`, declared `null`, `means` (our words, from `site/index.html:100–216`), optional `values`/`pattern`/`source`/`checklistKey`, and `sha`; plus `speciesCsv`, `countriesCsv`.
    - `scripts/build/contract.ts`: `checkV1Contract(contract, {recordColumns, csvColumns, countryColumns, species, countries})`, pure. Called in `readBuildInputs` (`scripts/build/inputs.ts`) before any load or write, `--draft` too.
    - Writers: `RECORD_COLUMNS` and `csvSelect()` (`scripts/build/columns.ts`); `COUNTRY_COLUMNS` is in `scripts/derive/naturalearth.ts:17`, not `columns.ts`.
  - Proof: a scratch `means` edit makes `B` and `pnpm build --draft` fail with the sha hint; revert.
  - Decisions: item 3 done.
  - Check: `T`, `B`, `H` (no `/v1` byte changes), `HD`.
- [x] S3 · `docs/recovery.md` + one rehearsal (§7.2; item 4), before any data change
  - Write `docs/recovery.md` (§7.2 points 1–4; L4 and L5 update it if they add state).
  - Rehearse at the live commit `C=$(git -C /srv/apps/critwire rev-parse HEAD)` (L2's release):
    - `git worktree add --detach $M/recovery/wt $C`; `pnpm install --frozen-lockfile` there;
    - as superuser, `createdb -O critwire critwire_restore`;
    - `$M/recovery/wt/.env`, mode 600: the dev role's `DATABASE_URL` with database `critwire_restore`, `CRITWIRE_DB_TARGET=critwire_restore`. Never `critwire_live` credentials;
    - plain `pnpm build`; `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum)` equals the same list over `/srv/apps/critwire/.live/` (read only);
    - §7.2 point 4's emergency `rsync -a --delete --chmod=D755,F644 dist/ $M/recovery/live-rehearsal/`, never the real `.live/`; its list equals `.live/`'s;
    - clean up: `dropdb critwire_restore`, `git worktree remove --force $M/recovery/wt`, `rm -rf $M/recovery/live-rehearsal`.
  - Record the date, commit, file count and result in `recovery.md` and the Log. A difference: fix it (an absolute path) or document it.
  - Decisions: item 4 done.
  - Check: `T`, `H`, `HD`; `psql -d postgres -XAtc "select datname from pg_database where datname='critwire_restore'"` empty; `git worktree list` without `recovery/wt`.
- [x] S4 · venv: rasterio (finding 6; §8 item 4)
  - `site/learn/labs/requirements.in` + `rasterio`. In `site/learn/labs/`: `uv pip compile --universal --python-version 3.12 -o requirements.txt requirements.in` (keeps the pins).
  - `git diff` adds exactly `rasterio==1.5.2`, `affine==3.0.1`, `attrs==26.1.0`, `click==8.5.0` (and their `# via` lines). Any other change: revert and find why.
  - `pnpm learn:venv`, then `.venv-learn/bin/python -I -c $'import rasterio\nwith rasterio.Env() as e: print(rasterio.__version__, rasterio.__gdal_version__, "COG" in e.drivers())'` prints `1.5.2 <gdal> True`.
  - `requirements.txt` is a checker file, so every lab goes stale: `L` re-proves them, and `git diff --quiet site/learn/labs/checked/*.txt` (results unchanged).
  - Check: `T`, `L`, `P`, `H`.
- [x] S5 · Ingest rules, tests first (§1.1, §1.3 rules; §1.7 #1, 2, 6, 7, 9, 10)
  - First [T]:
    - `scripts/http.test.ts`: a wrong md5 throws and leaves no file; a right md5 with a wrong size, the same.
    - `scripts/ingest/habitat.test.ts`:
      - `pickClass`: the largest partition fraction; ties to the lowest code; an overlay code never wins; all zero gives NULL.
      - `countryHabitatRows`: rounding to 0.01, rows under 0.01 dropped, a negative or non-finite value throws, sorted by key.
      - `rasterWkb`: header layout; length 61 + 1 + 2 + 2·w·h.
      - `habitatRecordsCsv`: `id,longitude,latitude`, by id, JS number formatting.
      - `assertHabitatFresh`: a different shapes sha256, a moved coordinate, an added or dropped id and a changed `sampleRules` each throw "data/learn/habitat.json is stale (published records changed): run pnpm ingest habitat". A `sample.csv` change that leaves the published rows equal passes.
  - First [D] `scripts/ingest/habitat.dbtest.ts`: `rasterWkb` through `ST_RastFromWKB` in `critwire_dev` gives width, height, SRID 4326, `16BUI`, nodata, and `ST_Value` at known cells.
  - Code:
    - `scripts/http.ts` `downloadFile` gains `md5` beside `bytes`, in the same stream tap; a mismatch deletes the file and throws.
    - `scripts/ingest/habitat.ts`: `HABITAT_INPUTS` (§1.1 pins), `LAYER_CODES` (79), `OVERLAY_CODES`, `CLIPS` (§1.4), and the pure exports above. Nothing wired to the build yet.
  - Check: `T`, `D`, `H`, `HD`.
- [x] S6 · `habitat.py`, `buildHabitat`, `pnpm ingest habitat` (§1.2, §1.3, §1.5, §1.6; §1.7 #3, 4, 5, 8)
  - First [T] `habitat.test.ts`, with a fake Python as `shapes.test.ts` does:
    - a non-zero layer not in `habitat_classes` throws "unknown class <code> (layer <member>)"; the same code all-zero passes; a clip value not in classes throws;
    - a layer set ≠ `LAYER_CODES` throws;
    - a record outside every layer gives a NULL row; one outside the grid throws with its id;
    - Σ estimate ÷ Σ outline outside ±2 % throws;
    - a report with missing outputs, extra outputs or bad JSON: nothing reaches `dest`;
    - `--downloads` inside the repository is refused; the temp folder is gone after a failure.
  - Code:
    - `scripts/ingest/habitat.py` (`.venv-learn/bin/python -I`), §1.2: the asserts; method 3 by `rasterize` per country into sorted flat indices; band reads with one band-height constant; geodesic row areas (`pyproj.Geod`); record cells; clips through `/vsizip/` to `.bin` and COG, re-opened and checked; the JSON report on stdout, progress on stderr.
    - `habitat.ts`, §1.3, §1.5, §1.6:
      - `buildHabitat({inDir, dest, python})`: records via `readLearnInputs` + `deriveSample` (`scripts/derive/sample.ts`), `records.csv`, `clips.json`; the report checks; the rules; DuckDB writers with zstd; copy only after every check; `habitat.json` with `habitat_classes.parquet`'s entry carried over and verified.
      - `ingestHabitat`: `mkdtemp`, `rm` in `finally`, SIGINT/SIGTERM kill the child; `--downloads <dir>` reuses md5-matching zips; fetches one after the other.
    - `scripts/ingest.ts`: `habitat [--downloads <dir>]`, and its header comment.
  - Smoke (not committed): make synthetic inputs with `.venv-learn` in one `mktemp -d`, keeping the script in another:
    - a 3-layer fractions zip on a 0.25° grid, with v004's member naming;
    - a small composite zip over `cr`;
    - the real `country_shapes.parquet` and 5 records.
    - Run `habitat.py` on them directly: the report parses, the COG check passes, the outputs are named as in §1.2. Log it.
  - Check: `T`, `B`, `H`, `HD`.
- [x] S7 · The real ingest run (§1.6); outputs held aside
  - Before: `git status` clean; no other heavy job; `df -B1 --output=avail /` ≥ 7,000,000,000 (3.15 GB of zips, 2.6 GB if the composite member must be extracted, and margin; 13 GB free at Architecture); `free -b` available ≥ 8 GB.
  - Run:
    - `DL=$(mktemp -d /var/tmp/critwire-habitat-XXXXXX)`, outside the repository; its path goes in the Log.
    - In the background (Bash `run_in_background`, timeout 7,200,000 ms): `/usr/bin/time -v pnpm ingest habitat --downloads "$DL" 2>> $M/ingest-habitat.log`.
  - On success:
    - `git status --porcelain data/` shows only `data/learn/{country_habitats.parquet,habitat.json}` modified and `occurrence_habitats.parquet`, `habitat_clips.parquet` and `clips/` new. `habitat_classes.parquet` is unchanged.
    - From `habitat.json`: the Σ ratio, outlines with no cell centre, NULL-class records, the clips' sizes and value counts, the tools.
    - **Cap projection**, before the downloads go: 40,041,618 + the new files' bytes + 4⁄3 × the clips' raster WKB bytes + `occurrence_habitats`' loader rows (≈ 40,395 × 12 B) + `country_habitats`' growth must be ≤ 49,000,000. Over: shrink both `CLIPS` windows equally (never below 0.5°; `T`), re-run with the same `$DL`, Decisions.
    - **Determinism, once:** re-run with the same `$DL` (no download); every output's sha256 is equal. If not, record it under Decisions (provenance pins the bytes; not blocking).
    - Hold the outputs: `cp -a --parents data/learn/{country_habitats.parquet,habitat.json,occurrence_habitats.parquet,habitat_clips.parquet,clips} $M/habitat-out/`, and `sha256sum` each file (paths from the repository root) into `$M/habitat-out.sha256`.
    - Restore the stand-ins: `git restore data/learn && git clean -fd data/learn`, only after the porcelain list matched.
    - `rm -rf "$DL"`; `test ! -e "$DL"`.
  - Log: wall time (download, decode), peak RSS (`Maximum resident set size`), band height, sizes, the cap projection, and whether the composite was read through `/vsizip/` or extracted.
  - Commit: the plan only.
  - Check: `B`, `H`, `HD` (all OK: the stand-ins are back).
- [x] S8 · `readLabFiles` nested paths (finding 3; §1.7 #11)
  - First [T] `scripts/learn/lab-files.test.ts`: a listed nested `clips/cr.tif` without `rows` passes; an unlisted nested file, an empty or stray folder, and a non-regular file are each refused by name.
  - Code:
    - `scripts/learn/lab-files.ts`: `Provenance.files[].rows` optional; a recursive read with relative names; a folder holding no listed file is refused, so `readLabFiles` and `fileSizes` (`scripts/build/learn/cap.ts`, already recursive) see the same files.
    - `scripts/build/learn/data.ts` `writeLearnData` creates parent folders. `shapes.ts` keeps writing `rows`.
  - Check: `T`, `B`, `H`, `HD`.
- [x] S9 · Raster plumbing: loader guard, SRID message, `-- needs: raster`, `gdal` (§3 guard and message, §4; item 2, role part)
  - First [T]:
    - `scripts/build/learn/loader.test.ts`: the raster guard is the first statement after `BEGIN`; the per-BLOB message reads "% values with SRID other than 4326".
    - `scripts/learn/check.test.ts`, with fake queries:
      - a `-- needs: raster` block where `postgis_raster_lib_version()` doesn't answer fails: "block <id> needs PostGIS raster: CREATE EXTENSION postgis_raster";
      - `postgis.enable_outdb_rasters` on, or `postgis.gdal_enabled_drivers` ≠ `DISABLE_ALL`, is refused, naming the setting;
      - checked once per run, before the first such block only.
    - `scripts/learn/freshness.test.ts`: `Versions.gdal` is recorded and never compared.
  - First [D]:
    - `loader.dbtest.ts`: where `to_regtype('raster')` is NULL, the loader raises "PostGIS raster is missing" and the previous schema stays.
    - `scripts/learn/runner.dbtest.ts`: a `-- needs: raster` fixture block (a raster made in SQL, such as `ST_AddBand(ST_MakeEmptyRaster(…))`) returns `current_user = critwire_lab`.
  - Code:
    - `scripts/build/learn/loader.ts`: the guard after `BEGIN`; the message (`loader.ts:202`).
    - `scripts/learn/{runner,check}.ts`: the enforcement.
    - `scripts/learn/freshness.ts` `Versions` gains `gdal`, read by `serverVersions` from `postgis_gdal_version()`; the pages' versions line shows it.
  - 004 §0 ("checks the raster library and its settings") and §3.2 (the loader needs `postgis_raster`) agree with the code.
  - The loader and the checker's sources change, so every lab goes stale: `L` re-proves them, with results unchanged.
  - Check: `T`, `D`, `L`, `P`, `E`, `H`, `HD`.
- [x] S10 · The data swap: **atomic**
  - Data, loader, ERD and recorded results land in one commit. Plain build fails on any part alone: new files without their credits or tables, or new data without its re-recorded results.
  - First:
    - [T]
      - `lab-files.test.ts` LP: the committed list gains `occurrence_habitats.parquet`, `habitat_clips.parquet`, `clips/cr.tif` and `clips/tas.tif`.
      - `credits.test.ts:56`: `jung-habitat` without "(stand-in summaries)".
      - `erd-model.test.ts:395`: `markers(LAB).planned` is `[]`.
      - `loader.test.ts`: 16 tables; the raster conversion and its CHECK in the keys step.
      - `checks.ts` `LAB_CHECK_FIXTURES` (both engines, `checks.test.ts`): a violating row each for `occurrence_habitats_occurrence`, `occurrence_habitats_habitat` and `occurrence_habitats_complete`.
    - [D] `loader.dbtest.ts`:
      - the `habitat_clips` CHECK refuses SRID ≠ 4326, two bands, and a type other than `16BUI`;
      - `occurrence_habitats` refuses an unknown occurrence, an unknown code and a duplicate `occurrence_id`.
    - [E] `e2e/learn-data.spec.ts`:
      - the loader-tables test counts only provenance entries with `rows`;
      - the habitat files' sha256 and size equal `habitat.json`'s (nested paths);
      - `occurrence_habitats` ids equal the sample's ids, one row each;
      - every non-NULL code is in `habitat_classes`, and so is every `country_habitats` code;
      - the loader's 16 `tables` counts come from `data/`;
      - `clips/*.tif` start with TIFF magic, and `Range: bytes=0-1023` returns 206 with those bytes (the live block; no Caddy change);
      - the credits name Jung v004 with no "stand-in"; the index lists the files with "estimated".
    - [E] `e2e/schema.spec.ts`: the lab ERD page and dictionary show both tables, with no `planned` badge on them.
  - Data: `cp -a $M/habitat-out/data/learn/. data/learn/`; `sha256sum -c $M/habitat-out.sha256` (repository root).
  - Code:
    - `scripts/build/inputs.ts`: `assertHabitatFresh` in `readBuildInputs` (`--draft` too), on `habitatRecordsCsv(result.learn.occurrences)`.
    - `scripts/build/learn/credits.ts` `LAB_FILES`, as §2 Credits says; "(stand-in summaries)" goes.
    - `page.ts` descriptions: the four new files; the habitat files lose "stand-in" and gain the method notes and "estimated".
    - `data.ts` `labManifest`: a `.tif` gets bytes, sha256 and sources only.
    - `scripts/build/learn/projection.ts` `LAB_TABLES` + `occurrence_habitats`, `habitat_clips`; `db/learn/lab-ddl.sql`, `db/learn/lab-keys.sql` (§3); `scripts/build/learn/checks.ts` `LAB_CHECKS` + 3.
    - `site/learn/erd/lab.mmd`: the `%% planned:` line goes, `accDescr` updated; the `scripts/build/learn/erd.ts` source map (§3 Lab ERD); `pnpm erd` (a second run writes nothing).
    - AGENTS.md's `data/learn/` stand-ins line, which is now false (the rest is S20).
  - Blocks, each 004 fence with its file:
    - `pg-smoke` and `d4-xmin-load` gain the two tables (16);
    - `d6-star-fact-country-habitat`'s DDL gains `CHECK (est_area_km2 >= 0 AND est_area_km2 < 'Infinity')`;
    - then `learn:check --update`. Only `pg-smoke`, `d4-xmin-load`, `d6-star-fact-country-habitat` and `d6-drill-across` change in `site/learn/labs/checked/`. `d6-star-dim-habitat-class` stays unchanged (finding 12).
  - Pages and 004 with them, saying what changed and why:
    - setup: §3.2's 14 tables → 16;
    - d4: "fourteen" → sixteen (004:3606, `d4.html:43`);
    - d6: the stand-in wording and the drill-across numbers, such as Trinidad and Tobago's (004:4245, d6's Result, `d6.html`);
    - d1's tbls sentence: 16 tables, with columns and lines recounted (004:2402, `d1.html:85`);
    - 004 lines for `p1-load`'s inputs, `p3-check` and `p3-measures`: recorded on the stand-ins, for L5 to re-run (near 004:7348).
  - Proof: a scratch edit of `habitat.json`'s records fingerprint makes `B` refuse with the ingest message; revert.
  - Cap: log both totals (`dist/learn/data/`, committed).
  - Decisions: the designed result changes and why; item 1, CHECKs-and-keys part.
  - Check: `T`, `D`, `L` (`--update`, then plain, twice equal), `P`, `E`, `H`, `HD`.
- [x] S11 · 004 data sections, measured (§2; finding 1's fix)
  - 004 §4.1:
    - the habitat rows: `country_habitats`, `occurrence_habitats` and `habitat_clips` rows and bytes from the build;
    - the clips row: two 0.75° windows (§1.4), with bounds and record counts;
    - the loader: 16 tables, its bytes.
  - §4.3: the raster guard, the two tables, their keys and checks. §4.4: measured totals in place of the projection, and the windows. §4.5: the credit line without "until L3". §6.2: the lab ERD draws both tables.
  - Decisions: finding 1's 004 fix has landed.
  - Check: `P`, `B`.
- [x] S12 · g1 · crs
  - Module step: `g1-area`, `g1-distance`, `g1-ex`. f3's "g1 … in preparation" links it.
  - Check: `T`, `L`, `P`, `E`, `H`.
- [ ] S13 · g2 · load-validate, with `g2-coverage` (item 1, teaching)
  - Module step:
    - `g2-wkb`, `g2-bowtie`;
    - `g2-invalid`: its 11 rows pin the identities and counts of the deliberately invalid teaching geometries (SC5, §7.4);
    - new `g2-coverage`: all 247 outlines are valid, yet FR's interior overlaps GF, RE and MQ (`ST_Relate(a, b, '2********')` over `&&` pairs): a valid geometry isn't a partition;
    - `g2-ex`.
  - Check: `T`, `L`, `P`, `E`, `H`.
- [ ] S14 · g3 · spatial-join, with diagram `g3-predicates`
  - Module step:
    - `g3-boundary`, `g3-agree`, `g3-disagree`, `g3-two-outlines`, `g3-ex`; the joins start from `country_shapes` (Notes);
    - `g3-iucn` stays `untested`, and `g3.sql` comments it out (004 §7.3);
    - d1's and f3's "g3 … in preparation" link it.
  - Diagram `site/learn/diagrams/g3-predicates{,-dark}.{html,svg}` (diagram-design, profile `critwire`): inside, edge and outside under Contains, Covers and Intersects, and the double count where outlines overlap.
    - Export with `export_svg.py --system-fonts`; pass `self_check.py --offline`.
    - `<title>` and `alt` state its point; a `{{diagram:g3-predicates}}` slot.
  - Check: `T`, `L`, `P`, `E`, `H`.
- [ ] S15 · g4 · measure-overlay, with overlap pairs (item 1 done)
  - Module step:
    - `g4-ecoregions`, `g4-gap`, `g4-border`;
    - new `g4-overlaps`: the overlapping ecoregion pairs behind `g4-gap`'s ≈ 675 km²: valid outlines aren't a non-overlapping coverage;
    - `g4-ex`.
  - Decisions: item 1 done (S10 CHECKs and keys; S13 `g2-coverage` and `g2-invalid`; S15).
  - Check: `T`, `L`, `P`, `E`, `H`.
- [ ] S16 · g5 · spatial-index: `-- plan:` lines, `g5-analyze` (item 2 done)
  - **Planner finding.** `g5-knn-plan`, `g5-cast-plan` and `g5-geography-index` say `-- after: d3-analyze`, which is on d3's page. `lintPage` refuses an `-- after:` block that isn't on the same page (`scripts/learn/blocks.ts:289`), so `learn:port g5` fails as 004 stands.
    - Fix: a `g5-analyze` block (`d3-analyze`'s SQL) first in g5's Lab, named by the three blocks.
    - Their 004 fences change with them (Decisions); the plans' meaning doesn't.
  - First [T]: the ported g5 EXPLAIN blocks fail the plan lint before their `-- plan:` lines.
  - `-- plan:` lines (§4), in 004 and the files together:
    - `g5-knn-plan`: `rows 5`, `Index Scan using occurrences_geom_idx`, `Order By`;
    - `g5-cast-plan`: `rows 55`, `Seq Scan on occurrences`, `no Index`;
    - `g5-geography-index`: `rows 55`, `Bitmap Index Scan on occurrences_geography_idx`.
    - The page shows the assertions, and the plan as an example with its versions.
  - Module step: also `g5-nearest`, `g5-coast`, `g5-ex`. d3's "g5 … in preparation" links it.
  - Decisions: item 2 done (S9 role; S16 plan meaning).
  - Check: `T`, `L` twice (assertions hold both times), `P`, `E`, `H`.
- [ ] S17 · g6 · grids
  - Module step: `g6-maup`, `g6-ex`. A MAUP diagram only if the prose falls short.
  - Check: `T`, `L`, `P`, `E`, `H`.
- [ ] S18 · g7 · raster (finding 2; the measured habitat numbers)
  - Blocks, all `-- needs: raster`, `status: ran`, ids kept:
    - `g7-records`: the 100 m class under each record in the `cr` clip (`ST_Intersects(h.rast, o.geom)`; 202 records today);
    - `g7-valuecount`: the `cr` cells inside CR's outline;
    - `g7-estimate`, by row: each row's cell count × `ST_Area(ST_PixelAsPolygon(h.rast, 1, row)::geography)`; cells, map km², estimated km², share of the clip.
  - New blocks:
    - `g7-latitude`: both clips, map vs ground area, cos φ;
    - `g7-countries`: method 3 summed vs outline area for every country (the distribution, the worst small islands);
    - `g7-scale`: each record's 100 m class (`ST_Value`) vs its 1 km class (`occurrence_habitats`);
    - `g7-ex`.
  - 004 g7 in full:
    - v004's grid is lon/lat at 0.000898315°, so a cell's ground area shrinks with cos φ; not Web Mercator;
    - the windows (§1.4), with their bounds and record counts;
    - 003 §5's error method: method 1 vs method 3, and the border-cell error;
    - every area labelled an estimate.
  - Measured numbers from the blocks and from `habitat.json` (`measured`, `clips` value counts) go into 004 §4.1 and g7.
  - Diagram `g7-cells`, as in S14: cells narrowing with latitude, centre-in-outline at a border, 100 m vs 1 km.
  - First: the S9 raster check runs, as `critwire_lab` with the learner defaults; each block stays under the 60 s `statement_timeout`.
  - Decisions: finding 2's 004 fix.
  - Check: `T`, `L` twice, `P`, `E`, `H`. `g7.sql` runs on a fresh load in learn:check's downloads stage.
- [ ] S19 · E2E completion and screenshots (§6)
  - `e2e/learn-screens.spec.ts` `PAGES` + g3 and g7: `g3-{1280,375}-{light,dark}.png` and the same for g7 (8 files).
  - `learn-map`: g1–g7 linked and built. `learn-labs` covers the g pages generically (code = download, `g3-iucn` commented, shown = recorded). `schema`: the new diagrams return 200 with `<title>` and `alt`.
  - Audit: each DoD E2E item → its test name, listed in the Log. A gap gets its test here.
  - Release helper dry run against the local Caddy (`RELEASE_ORIGIN=http://127.0.0.1:3100`): it reaches `clips/` and the g pages.
  - Check: `T`; `E2E_ARTIFACTS=$M/e2e-s19 pnpm e2e` in full, nothing skipped; `H`.
- [ ] S20 · AGENTS.md, 004 final pass, audit (§8 item 11)
  - AGENTS.md:
    - `pnpm ingest …|habitat [--downloads <dir>]` and its files in `data/learn/`;
    - the Python line: `ingest shapes` and `ingest habitat`, rasterio in `.venv-learn`;
    - the cost of a species change includes re-running `ingest habitat` (≈ 1 h);
    - `contracts/v1.json`: entries add-only; a definition edit needs the owner's review and a Decisions line with the new sha;
    - `docs/recovery.md`;
    - Learn: g1–g7 built; `-- needs: raster` enforced.
  - 004: §0, §3.2, §4, §6.2, §7.3, §7.6 and §9 agree with the code.
  - Audit:
    - items 1–6 each `done (S<n>, <sha>)` or `rejected` with evidence;
    - every deviation from 004 is under Decisions: the windows, the outputs folder, g7's lon/lat, `g5-analyze`, the star CHECK, the §8 reorder;
    - H5's state, for the Summary.
    - A gap becomes a new step before Verification.
  - Check: `T`, `P`, `L`, `E`, `H`, `HD`.

## Verification

Run once, on the final commit (after any code-review fixes), on a clean tree, in this order. `M`, `H`, `HD` and `P` are as in Steps. Log each result; the numbers go to the Summary.

Leak query, which must be empty: `psql -d critwire_dev -XAtc "select rolname from pg_roles where rolname like 'learn\_%' union all select nspname from pg_namespace where nspname like 'learn\_%' and nspname not in ('learn_spatial','learn_curriculum')"`.

1. **Install:** `pnpm install --frozen-lockfile` is up to date; `pnpm learn:venv`. S7's `$DL` (path in the Log) doesn't exist, and `find . -name '*.zip' -not -path './node_modules/*'` is empty.
2. **Build and cap:** plain `pnpm build` passes (fresh labs, current DOIs, habitat fresh, `/v1` contract, no stale SVG).
   - `find dist/learn/data -type f -printf '%s\n' | awk '{s+=$1} END{print s}'` < 50,000,000 (≈ 45.3 MB projected).
   - The same sum over `data/raw/gbif-sample data/learn data/gbif-learn-sample` < 50,000,000 (≈ 14.3 MB).
   - Both equal 004 §4.4's.
3. **E2E (primary):** `rm -rf $M/e2e && pnpm build && E2E_ARTIFACTS=$M/e2e pnpm e2e`.
   - Specs: `attribution`, `countries`, `docs`, `duckdb`, `files`, `learn-data`, `serving`, `learn-map`, `learn-browser`, `learn-labs`, `learn-screens`, `learn-timing`, `schema`.
   - `jq .stats $M/e2e/results.json`: unexpected 0, skipped 0, flaky 0.
   - Artifact `$M/e2e/`:
     - `playwright-report/index.html`;
     - one `trace.zip` per test (`find $M/e2e/test-results -name trace.zip | wc -l` = `.stats.expected`);
     - `results.json`, `setup-timing.json`, `caddy-access.log`;
     - `g3-{1280,375}-{light,dark}.png`, `g7-{1280,375}-{light,dark}.png`, and L1's and L2's screenshots.
   - Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
4. **Static and isolated tests:** `pnpm typecheck` (both tsconfigs); `pnpm test` (S2's contract cases, S5's and S6's ingest failure cases); `pnpm test:db` (S1's batching, S5's raster round trip, S9's and S10's loader cases). Then the leak query is empty.
5. **learn:check:**
   - `psql -d critwire_dev -XAtf db/learn/canary.sql > $M/canary-before.txt`.
   - `pnpm learn:check` twice, each exit 0:
     - the loader stage;
     - every PostGIS block of setup, d1–d6 and g1–g7, in check mode;
     - the raster check, as `critwire_lab` with the learner defaults;
     - every download, `g1.sql`–`g7.sql` included, with exactly its announced `ERROR:` lines.
   - After both runs: `git status --porcelain` is empty (`checked.json` unchanged byte for byte), the canary `diff` is empty, and the leak query is empty.
   - The printed versions (GDAL included) equal `checked.json`'s.
6. **Results vs 004:**
   - `P` reports 0 differences.
   - `git diff origin/main -- plans/004-learn-curriculum.md | grep -E '^-.*-- result: '` lists only `pg-smoke`, `d4-xmin-load`, `d6-star-fact-country-habitat` and `d6-drill-across`. g7 had no result, and g5's EXPLAIN text is judged by its `-- plan:` lines.
   - 004 carries the `p1-load`, `p3-check` and `p3-measures` stand-in notes, and the measured habitat numbers in §4.1 and g7 equal `habitat.json`'s `measured` and `clips`.
7. **ERDs:** `pnpm erd` writes nothing (`git status --porcelain site/learn/erd` is empty).
8. **Existing files unchanged:**
   - `H` and `HD` print nothing (Baseline lists: `$M/baseline-sha256-{dist,repo}.txt`).
   - The manifest diff is empty, with N = `def n: del(.bytes) | .files |= (with_entries(select(.key | IN("country_habitats.parquet","occurrence_habitats.parquet","habitat_clips.parquet","clips/cr.tif","clips/tas.tif","postgis/learn_curriculum.sql") | not)) | map_values(.sources |= map(.name |= sub(" \\(stand-in summaries\\)$"; "")))); n`: `diff <(jq -S "$N" dist/learn/data/manifest.json) <(jq -S "$N" $M/baseline-manifest.json)`.
9. **Determinism:** `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > $M/dist-1.sha256`; plain `pnpm build`; the same into `$M/dist-2.sha256`; `diff` is empty.

**Definition of done → proof:**

| DoD item | Proved by |
|---|---|
| typecheck, test (ingest failure cases first), plain build | steps 2 and 4; S5's and S6's Log `red n → green n` |
| `pnpm e2e` in full, nothing skipped | step 3 |
| Results: ran g blocks keep their sha256; g7 and new exercises `ran`; only the designed changes; learn:check twice; leak query; canary | steps 5 and 6 |
| Habitat numbers in 004 §4.1 and g7, with 003 §5's error method | step 6; S18 |
| 50 MB cap | step 2; `learn-data`'s cap case |
| Existing files unchanged (`country_habitats`, the loader, `manifest.json` and pages excepted) | step 8 |
| Downloads deleted once hashed | step 1; S7's Log |
| Review items 1–6 | Decisions (S20 audit, with shas) |
| Artifacts and reproduction | step 3 |
| Release smoke | below |
| Summary: shipped, the ingest's time and sizes, cap total, deviations from 004, release record, notes for L4 | written after steps 1–9 |

**Release smoke** (the Release unit, after `gh pr merge` and `deploy critwire`; `L=https://critwire.com`; `dist/` built from the merge commit):
- `RELEASE_ORIGIN=$L E2E_ARTIFACTS=$M/release-smoke pnpm exec playwright test -c playwright.release.config.ts`. Every `dist/` file is served with dist's sha256, so:
  - the seven g pages at `/learn/gis-in-sql/<slug>/` return 200;
  - so do `/learn/labs/g1.sql`–`g7.sql` and the new `/learn/data/` files;
  - plus the helper's `.wasm` type and f3 checks.
- The habitat files against the live manifest: for each of `country_habitats.parquet`, `occurrence_habitats.parquet`, `habitat_clips.parquet`, `clips/cr.tif` and `clips/tas.tif`, `curl -fsS $L/learn/data/<f> | sha256sum` and its byte count equal `.files["<f>"]` in `curl -fsS $L/learn/data/manifest.json`.
- `curl -s -o /dev/null -w '%{http_code}' -r 0-1023 $L/learn/data/clips/cr.tif` gives `206`.
- The live loader and g7:
  - download `$L/learn/data/postgis/learn_curriculum.sql` and `$L/learn/labs/g7.sql` into a `mktemp -d`;
  - `psql -X -v ON_ERROR_STOP=1 -d "$LEARN_PG_URL" -f learn_curriculum.sql` (`critwire_dev`, as `critwire_lab`);
  - then `psql -X -d "$LEARN_PG_URL" -f g7.sql`: its `ERROR:` lines are exactly g7's announced ones;
  - then the leak query is empty.
- `## Release` records the merge commit, `deploy`'s last line, these results and the log's path.

## Failure modes

Each step's isolated cases are its **First** list. What a session does when the plan meets reality:
- **Download fails** (HTTP error, timeout or cut transfer; S7): the run is all or nothing. Re-run with the same `--downloads`, which keeps md5-matching zips.
  - Zenodo down for a whole session: do S12–S17 (g1–g6 don't read habitat data), then come back.
- **md5 or size mismatch:** the file is deleted and the run throws. Re-run once.
  - A second mismatch means Zenodo's file changed. Never unpin. Add a handoff item (Blocks: S7, S10, S11, S18) and go on with g1–g6.
  - `MISSION_BLOCKED` only when nothing else can proceed.
- **Memory** (peak over 6 GB, or an OOM kill): lower `habitat.py`'s band-height constant (same code, same result), re-run with `--downloads`, and log the band height and the peak.
- **Composite read slow** (the `/vsizip/` window read takes more than a few minutes): `habitat.py` extracts that one member into the temp folder (2.6 GB; check `df` first). Record which.
- **Disk** under 7 GB free before S7: remove only this mission's leftovers (`/var/tmp/critwire-habitat-*`, `$M/recovery/`). Still short: handoff item.
- **Unknown class** (a non-zero layer or a clip value not in `habitat_classes`): a real finding. Extend `habitat_classes` from v004's legend, with a Decision. That changes a file the DoD expects unchanged, and `d6-star-dim-habitat-class`'s result with it, by design and recorded.
- **Σ ratio outside ±2 %, or a record outside the grid:** a bug (units, transform, cell area, row and column maths). Fix it. Never widen the guard or drop a record.
- **Cap overflow** (projected in S7 before the downloads go; measured in S10):
  - shrink both windows equally (never below 0.5°) and re-run;
  - still over: cut in 004 §4.4's order, recorded under Decisions with a non-blocking handoff item;
  - never drop the loader or the sample's Parquet.
- **A result differs from 004:**
  - outside S10's four designed changes, it is a bug (port, session, data or `after` chain); `d6-star-dim-habitat-class` changing is a bug too;
  - only a proven change updates 004 and the recorded file together (Decisions);
  - a PostGIS or GEOS version change shows in `checked.json`'s versions: record it with the proof.
- **An EXPLAIN assertion fails** (g5): find why (statistics, `g5-analyze`, index names). Never weaken an assertion to match.
- **Raster settings refused** (S9's check: outdb on, or drivers enabled in `critwire_dev`): the server changed. Don't change superuser settings from the mission; add a handoff item.
- **`LEARN_PG_URL` broken or `critwire_lab` missing:** `pnpm learn:check --setup` as superuser, per AGENTS.md. Never `--reset-password` without `--env` for each checkout.
- **Leak query not empty:** drop only this mission's lab-role objects, as the sweep names them. Anything else: handoff item.
- **No wheel for a new pin** (S4; `--no-build` refuses): no system GDAL and no source build (Rejected alternatives). Handoff item.
- **The recovery rehearsal differs** (S3): fix an absolute path, or document the difference in `recovery.md`.
- **H5 answered `also publish whole-country COG files`:** the planner adds one step before Verification: COG files only, not in the loader, ≈ +3 MB, with the cap re-checked.
- **Session budget:** at each session start, `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/critwire-learn-l3-gis.log` (6 at Steps). Past 48:
  - add no more review steps;
  - give each unfinished assigned item a Decisions line and a handoff item for L4;
  - go on to the code review, Verification and Release.
  - S4–S20 are Goal work and are never deferred.

## Code review (Astra)

## Release

## Decisions

- 2026-10-28 · Architecture: clips `cr`/`tas` = fixed 0.75° study windows at 100 m (Osa Peninsula; SE Tasmania incl. Hobart), not whole countries: whole-country in-db clips ≈ 70 MB vs 50 MB cap (Architecture finding 1). 004 §4.1, §4.4, g7 fixed with the code.
- 2026-10-28 · Architecture: habitat outputs in `data/learn/` + `habitat.json` (L1 shapes pattern), not brief's `data/raw/habitat/`: `raw/` = API snapshots; cap, `readLabFiles`, dist copy work unchanged.
- 2026-10-28 · Revision: clip windows placed by data (Fable SC2): the 0.75° square on a 0.05° lattice holding the most records with the country's code, ties → most land in outline. `cr` lon −84.20…−83.45, lat 9.85…10.60 (202 rec, all in CR outline; supersedes Osa, 68); `tas` lon 147.25…148.00, lat −43.10…−42.35 (601 rec, 491 in AU 1:50m outline; Hobart inside). Non-blocking owner handoff item (Revision notes); work continues.
- 2026-10-28 · Revision: `/v1` contract = hand-written `contracts/v1.json`, per field `type`, declared `null`, `means` (meaning/unit/namespace), optional `values`/`pattern`/`source`(+`checklistKey`), per-entry `sha`; any definition edit fails build "needs /v2" unless owner-reviewed (Decisions line + new sha). Nullability declared, checked against data, never inferred (Astra MUST-FIX 2).
- 2026-10-28 · Revision: habitat freshness = `country_shapes.parquet` sha256 + sha256 of the consumed records (`habitatRecordsCsv`), replacing `sample.csv` sha256 (Fable MISSED 1, Astra SC1).
- 2026-10-29 · item 5: done (S1). `loadDatabase` inserts in `BATCH_ROWS = 1000` chunks in the same transaction; B1 (unit: 1000 × 22 < 65,534), B2/B3 (db: 3,500 rows load; dup slug in last batch rolls all back).
- 2026-10-29 · item 6: done (S1). Nothing L1 handed over blocks L3: H3 (GBIF retention) and H4 (Windows check) wait on owner, block nothing (Baseline).
- 2026-10-29 · Deviations from Architecture §8 (S1): item 6 split (S7 ingest held in `$M/habitat-out/`, S8 `readLabFiles`, S10 atomic swap, S11 004 data sections); raster plumbing before swap (S9); §6 habitat E2E cases written first in S10; g5 gets `g5-analyze` (S16).
- 2026-10-29 · item 3: done (S2). `contracts/v1.json`: 39 species paths + 5 countries columns, each `type`/declared `null`/`means`/`sha` (+ `values` on `range.status`, `countries.region`; `pattern` on slug, Q-ids, country codes, https urls, dates, DOIs; `source` on every `ids.*` + countries list, `checklistKey` on `ids.gbif`); `speciesCsv`/`countriesCsv`. `checkV1Contract` pure, in `readBuildInputs` (draft too); problems throw, additions log. `ids.iucn` declared nullable (§7.1; docs: any id null while unsettled).
- 2026-10-29 · S2: entry `sha` = sha256 of `formatJson(entry, { canonical: true })` (2-space + newline), not compact JSON: reuses the existing canonical writer; exporting `sortKeys` from `scripts/json.ts` would edit a `learn:check` checker file and stale all 75 labs. Group paths typed `STRUCT`/`STRUCT[]` so nested additions don't retype the parent. Writers expose `csvColumns()` (`columns.ts`) and `COUNTRY_TYPES` (`build/countries.ts`, also its read_json columns).
- 2026-10-29 · item 4: done (S3). `docs/recovery.md` (§7.2 points 1–4 + rehearsal table). Rehearsed at live `6093a23`: restored `dist/` = `.live/` (224 files, sha256 lists equal); emergency rsync into scratch copy equal too; no differences to fix. State list adds the 3rd GBIF lock/intent pair (`gbif-sample-download`), not in §7.2.
- 2026-10-29 · S5: `LAYER_CODES` re-read from the fractions zip's central directory (range request, 80 entries = folder + 79 `.tif`): matches finding 5. `assertHabitatFresh` names its cause: "(country_shapes.parquet changed)" or "(published records changed)", same "run pnpm ingest habitat" (plan gave one message for both). Signature `assertHabitatFresh({countryShapes:{sha256}, records:{sha256,count}}, {countryShapesSha256, occurrences})`, pure; `recordsFingerprint` exported for S6's `habitat.json`. A `sampleRules` change reaches it only as another published row set (derive refuses a rules mismatch itself), tested so. `countryHabitatRows` rounds with `toFixed(2)` (half up on the exact double, not `Math.round(x*100)`) and throws on a duplicate (country, code). `downloadFile` md5 optional, checked after size and sha256.
- 2026-10-29 · S6: `habitat.py` band default `BAND_ROWS = 2048` (≈ 0.5 GB per band), not the whole grid (plan §1.2): a whole-grid band plus the partition-sum check's arrays would peak ≈ 5 GB, near the 6 GB budget; same code, same result, layers kept open so reads only move forward. Clips run first (the composite's one 2.6 GB deflate stream is the riskier read; fails before ≈ 79 layer decodes). Records from `deriveAll(readDeriveInputs()).learn.occurrences` (the build's own path to the published rows; `deriveSample` alone needs the derived core). `habitat.json` `inputs` = `{zenodo: {<file>: {url, bytes, md5, sha256}}, countryShapes: {sha256}, records: {sha256, count}}`, so `inputs` is `assertHabitatFresh`'s `HabitatFreshness`; also `grid`, and `measured.{estimateOverOutline, outlines, outlinesWithNoCell, records, nullClassRecords}`; timings and peak RSS go to stderr only (no run-dependent bytes). Node recounts each clip's `.bin` against the report. Shared `scripts/ingest/python.ts` (`venvPython`, `runPython` with abort) used by shapes and habitat; `createTable` moved to `scripts/build/duckdb.ts` (+ `BLOB`); `sha256File` → `hashFile(path, "sha256"|"md5")`. Risk for S7: smoke Σ outline area is 146.7 M km² incl. Antarctica; if v004 leaves AQ unmapped the ±2 % guard fails, a real finding to resolve there (never widen it).
- 2026-10-29 · S7: determinism re-run made from the restored stand-ins, not over the fresh outputs: a re-run over them stops at `readLabFiles` ("data/learn/clips isn't a file"), the nested-path gap S8 fixes. Outputs held in `$M/habitat-out/` first; second run byte-identical (6/6 sha256). Cap projection 45,218,602 B ≤ 49,000,000: windows kept at 0.75°. `occurrence_habitats` loader rows measure 609,402 B (ids are 10 digits), not plan's ≈ 485 KB; still within. Antarctica risk (S6) didn't occur: Σ ratio 0.99907 over 247 outlines.
- 2026-10-29 · S9: loader's raster guard tests `to_regtype('public.raster')`, not bare `raster` (§3): bare resolves on the learner's own search_path before the loader sets `<schema>, public`, so it could refuse a server that would load; LD9's "public only in search_path" allows this one type lookup too (no table outside the schema). `serverVersions` refuses a server without raster ("PostGIS raster is missing … --setup"): the loader needs it anyway, and `postgis_gdal_version()` would fail with PostgreSQL's words. `rasterGate` lives in `runner.ts` (`runBlocks` calls it per block; cycle-free), tested in `check.test.ts` as the plan says. Versions line adds "GDAL x"; a draft over a pre-S9 (stale) stamp omits it. E2E versions-line case updated with it.
- 2026-10-29 · S10: `d6-drill-across` gains `WHERE … country_code IN ('AX', 'TT')` in both halves (block + 004 fence + page lead-in): over every country it returned 352 rows and the lesson (TT's 2 records × 22 classes = 44; AX vanishes) fell outside the shown rows. Same two countries, same lesson; numbers now AX 761.16, TT 5,067.71, joined 10,135.42 km². Its diagram (`site/learn/diagrams/d6-drill-across{,-dark}`) carried the stand-in numbers: sources edited, both re-exported (`export_svg.py --system-fonts`, `self_check.py --offline` OK); H's exclusions gain `diagrams/d6-drill-across(-dark)?.svg` (designed change).
- 2026-10-29 · S10: designed result changes (stand-ins → every country): `pg-smoke` 14 → 16 rows (country_habitats 35 → 5,578; + occurrence_habitats 40,395, habitat_clips 2), `d4-xmin-load` 43,844 → 89,784 row versions, `d6-star-fact-country-habitat` 35 rows/2 countries/6,062.26 km² → 5,578/246/146,579,613.97 km² (+ DDL CHECK finite ≥ 0), `d6-drill-across` (above). `d6-star-dim-habitat-class` unchanged (37ad5647623e), as finding 12 said. Pages/004 updated with them (setup 16 counts; d1 tbls 16 tables/73 columns/17 lines, "two planned tables" dropped; d4 sixteen; d6 stand-in wording); `p1-load` inputs, `p3-check`, `p3-measures`: 004 notes "recorded on A2's stand-ins, re-run by L5".
- 2026-10-29 · S10: lab schema page's "Planned tables" section removed (none left); `schemaMain` fills `{{planned}}` only when the ERD has planned tables, so fillSlots refuses a page whose prose outlives them (or lacks the slot). `occurrence_habitats_complete` = occurrences whose habitat row count ≠ 1 (catches missing and, with the PK, extra). LC6's "elsewhere" tamper also drops `occurrence_habitats`' FK to occurrences: removing occurrences' PK alone now fails load 1 (an FK needs a unique key), not the test's point.
- 2026-10-29 · item 1, CHECKs-and-keys part: done (S10). `occurrence_habitats` PK + FKs to occurrences and habitat_classes; `habitat_clips` CHECK (SRID 4326, 1 band, 16BUI) + PK; LAB_CHECKS `occurrence_habitats_{occurrence,habitat,complete}` (both engines, LX fixtures); `country_habitats` area CHECK and FKs kept; `fact_country_habitat` gains the area CHECK. Teaching part (g2, g4, invalid-geometry identities): S13, S15.
- 2026-10-29 · finding 1's 004 fix landed (S11): §4.1 clips = two 0.75° windows (bounds, records, class shares), habitat rows/bytes measured, loader 16 tables 25,757,224 B; §4.3 raster conversion + CHECK, habitat keys, 16-table load (2.2 s as `critwire_lab`); §4.4 measured 45,228,556 / 14,444,834 B (deltas from L2 live 40,041,618) + why windows; §4.5 credit line per file, no "until L3"; §6.2 no planned tables. Also §3.2's "about 21 MB" → 26 MB (same measured fact). g7's lon/lat fix stays S18.
- 2026-10-29 · S12: g1 adds three lab blocks beyond the step's list, each `ran`, recorded by `learn:check --update` and copied into 004: `g1-srid` (what 4326/3857/3577 say, read out of `proj4text`: full `proj4text` is cut in the result view, hiding the terms the prose cites), `g1-columns` (every lab geometry column is 4326, typed), `g1-setsrid` (relabel vs move: mislabelled Hobart lands 4,990 km away, no error). `g1-area`, `g1-distance` keep 004's sha256. Exercise `g1-ex`: GL vs CD (same ground, 15× on Web Mercator; centroid 1 ÷ cos² 14.38 < stretch 16.30 for a tall shape).

## Log

- 2026-10-28 22:59 UTC · Baseline: install, typecheck, test 549/549, build, test:db 110/110, learn:check ok, e2e 80/80; sha256 lists recorded.
- 2026-10-28 23:25 UTC · Architecture: architect wrote findings + target design (clips → 0.75° windows at 100 m; Node pins/tests + Python rasterio decode; `contracts/v1.json`; `docs/recovery.md`; 1,000-row db:load batches; `g2-coverage`). Plan-only; no code checks needed.
- 2026-10-28 23:28 UTC · Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (handoff item for 0.75° windows), 3 missed, 5 should-consider. Plan-only; no code checks needed.
- 2026-10-28 23:29 UTC · Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (window-clip handoff, same as Fable; `/v1` contract semantics + declared nullability), 3 should-consider. Plan-only; no code checks needed.
- 2026-10-28 23:42 UTC · Revision: architect resolved both MUST-FIX (window handoff → H5 filed; `/v1` contract `means`/`sha`/declared nullability), folded 3 missed items, decided 8 should-consider (7 adopted, Fable SC5 rejected); `cr` window moved by data (202 records). Plan-only; no code checks needed.
- 2026-10-28 23:59 UTC · Steps: planner wrote S1–S20 + Verification (+ Failure modes). Plan-only; no code checks needed.
- 2026-10-29 00:08 UTC · S1: `$M/baseline-manifest.json` saved (sha f180c320…9565 ok). db:load batched (1000 rows). red 2 → green 2 (B1 unit; B2/B3 db, MAX_PARAMETERS_EXCEEDED before). T: typecheck ok, test 550/550. D: build ok, test:db 111/111. H, HD (strict): nothing changed.
- 2026-10-29 00:22 UTC · S2: `/v1` contract. red 12 → green 12 (V1–V12, `contract.test.ts`; red = no module). T: typecheck ok, test 562/562. B ok, no "freeze" notices. Proof: scratch `ids.gbif` means edit → `build --draft` and `build` exit 1 with sha hint; reverted. H strict (no exclusions), HD: nothing changed.
- 2026-10-29 00:25 UTC · S3: `docs/recovery.md` + rehearsal at `6093a23` (worktree, `critwire_restore`, plain build 5.7 s): 224 files, dist = `.live/` sha256; rsync rehearsal equal; cleaned (db dropped, worktree removed). T: typecheck ok, test 562/562. H, HD: nothing changed.
- 2026-10-29 00:31 UTC · S4: `rasterio` in requirements.in; compile adds exactly rasterio 1.5.2, affine 3.0.1, attrs 26.1.0, click 8.5.0. venv: `1.5.2 3.12.2 True` (GDAL 3.12.2, COG). T: typecheck ok, test 562/562. L ok (75 labs re-proved, `checked/*.txt` unchanged, only `checked.json`). P: 288 files equal. H: nothing; strict: only 6 pages' "Checked" date.
- 2026-10-29 00:40 UTC · S5: `downloadFile` md5 pin; `scripts/ingest/habitat.ts` pins (`HABITAT_INPUTS`, 79 `LAYER_CODES`, `OVERLAY_CODES`, `CLIPS`) + pure `pickClass`, `countryHabitatRows`, `rasterWkb`, `habitatRecordsCsv`, `recordsFingerprint`, `assertHabitatFresh`; not wired to build. red 9 → green 9 (HM1–2 http; HB0–HB6 unit; HB7 db: `ST_RastFromWKB` round trip, 16BUI, nodata, `ST_Value`). T: typecheck ok, test 570/570. D: build ok, test:db 112/112. H, HD (and strict manifest/loader): nothing changed.
- 2026-10-29 00:58 UTC · S6: `scripts/ingest/habitat.py` (clips via `/vsizip/` → `.bin` + COG re-checked; method 3 by per-outline `rasterize` into sorted flat indices, 2048-row bands, geodesic row areas; record cells; JSON report), `buildHabitat` (report/outputs checks, rules, DuckDB zstd writers, copy only after every check, `habitat.json`), `ingestHabitat` (`withWorkDir` temp + SIGINT/SIGTERM, `--downloads` outside repo, md5 reuse, sequential fetch), `pnpm ingest habitat`. red 13 → green 13 (HR1–HR6, `habitat-build.test.ts`; red = no exports). Smoke (not committed; synthetic 3-layer 0.25° fractions zip, 0.05° composite zip, real shapes, 5 records): exit 0, 1.2 s, 217 MB; COG check passed; outputs as §1.2; record at lon 200 reported outside; Σ partition ÷ Σ outline 0.99994. T: typecheck ok, test 583/583. B ok (40,041,618 / 13,677,679 B). H, HD: nothing (strict: only 6 pages' "Checked" date, as S4).
- 2026-10-29 01:35 UTC · S7: real `pnpm ingest habitat --downloads /var/tmp/critwire-habitat-RyJSU3` (deleted after; `test ! -e` ok). Wall 11:54 (downloads 20.2 s fractions + 72.7 s composite; decode: clips 17 s + 28 s via `/vsizip/`, no extraction; fractions 568 s, band 2048 rows), peak RSS 3.15 GB. Grid 36,308 × 18,154; 247 outlines, Σ estimate ÷ Σ outline 0.99907 (−0.09 %); no cell centre: VA only; NULL-class records 0 of 40,395; all-zero layers 11. Clips 836 × 836, nodata 0 cells: cr 20 classes, tas 16. Files: country_habitats 22,407 B (5,578 rows), occurrence_habitats 81,731 (40,395), habitat_clips 256,632 (2), cr.tif 221,986, tas.tif 180,362. Porcelain = expected list; habitat_classes unchanged. Cap projection 45,218,602 B ≤ 49 M. Determinism: rerun from stand-ins 11:10, all 6 sha256 equal. Held in `$M/habitat-out/` + `$M/habitat-out.sha256`; stand-ins restored. B ok (40,041,618 / 13,677,679 B). H, HD: nothing (manifest, loader OK).
- 2026-10-29 01:25 UTC · S8: `readLabFiles` recursive (relative names, `rows` optional, folder with no listed file refused, non-regular file refused: "isn't a regular file"); `writeLearnData` creates parent folders. red 4 → green 4 (LP5–LP8). Smoke: temp copy of `data/learn/` + `$M/habitat-out/` reads all 10 files (`clips/{cr,tas}.tif` via habitat.json). T: typecheck ok, test 587/587. B ok (40,041,618 / 13,677,679 B). H, HD: nothing (manifest, loader OK).
- 2026-10-29 02:00 UTC · S9: loader raster guard (first after BEGIN) + SRID message "values"; `-- needs: raster` gate (lib answers; outdb off, drivers DISABLE_ALL; once, before first raster block); `Versions.gdal` (recorded, never compared; pages' line). 004 §0, §4.3 agree. red 10 → green 10 (LD4, LD19 unit; MH5; NR1–NR3; FR9 (type); LD8, LD19 db; NR4 db). T: typecheck ok, test 592/592. L: 75 labs re-proved, `checked/*.txt` unchanged, checked.json keys + `gdal 3.8.4`. D: build ok (40,041,912 B, +294 loader), test:db 114/114 (first run: LD9 public-mention assert, fixed (Decisions); LE1 30 s timing incl. lab-lock wait, passed alone 17 s and on full rerun). P: 288 equal. E: 80/80, 0 skipped/flaky (`e2e-artifacts/`, `pnpm build && pnpm e2e`). H, HD: nothing.
- 2026-10-29 02:45 UTC · S10: atomic swap: `$M/habitat-out/` copied (6/6 sha256 OK); loader 16 tables (`occurrence_habitats`, `habitat_clips` in-db raster from base64 WKB + CHECK), 3 LAB_CHECKS, credits/descriptions without stand-in, `assertHabitatFresh` in `readBuildInputs`, lab ERD `%% planned:` gone (`pnpm erd` twice: 2nd wrote nothing), AGENTS.md data line. Red 7 → green 7 unit (LP, ST4 ×2, EG2, LD20, LX, PJ4); D (LD21) and E cases written before the code, first run after it (green); DS2 and LC6 test fixtures adapted to nested files and the new FK (Decisions). Proof: scratch records sha in habitat.json → plain build refuses "habitat.json is stale (published records changed): run pnpm ingest habitat"; restored (sha OK). T: typecheck ok, test 597/597. L: `--update` (only the 4 designed `checked/*.txt` + checked.json), plain twice ok, canary unchanged, leak empty, lab ERD = 16 tables. D: build ok, test:db 118/119 (LC6 "elsewhere" failed at load 1: tamper fixed, then the LC6 cases 3/3; full test:db reruns at Verification). P: 288 equal. E: 83/83, 0 skipped/flaky (`e2e-artifacts/`). H: only d6-drill-across SVGs (designed, exclusion added); HD: nothing. Cap: dist/learn/data 45,228,556 B; committed 14,444,834 B.
- 2026-10-29 · S11: 004 §4.1 (habitat rows/bytes, clips windows, loader 16 tables, notes on the habitat files from `habitat.json`), §4.3, §4.4 (measured totals), §4.5, §6.2, §3.2 loader size. Loader timed twice as `critwire_lab`: 2.28 s, 2.17 s. P: 288 equal. B ok (45,228,556 / 14,444,834 B).
- 2026-10-29 03:05 UTC · S12: g1 in full in 004 (Concept, Worked example, Lab 4 blocks, Result, Exercise, Check, Dialects); `learn:port g1`; `modules/g1.html`; curriculum g1 `built`; f3 links it. T: typecheck ok, test 597/597. L: `--update` wrote only the 4 new `checked/g1-*.txt` + checked.json (81 PostGIS blocks, g1.sql download 0 ERROR as announced, canary unchanged, leak empty); then draft, check (checked.json unchanged), plain build ok. P: 12 pages, 300 files equal. E: 83/83, 0 skipped/flaky (`e2e-artifacts/`; learn-labs covers g1 via course pages). H: nothing.

## Summary
