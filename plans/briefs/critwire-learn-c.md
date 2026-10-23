# Mission brief: critwire Learn, the grown data: traits, names and lessons 17–21 (mission C)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-c.md, then run:
     mission start critwire <that file>        (base: main after mission B2 is merged and live)
     Start only after B2 is live on critwire.com (its Release: Result: done) and the owner has answered
     plans/003-learn-data-spatial.md §8 (without an answer, build its recommendation).
     Written by mission A2 (critwire-learn-spatial-design), step S25. Design: plans/003-learn-data-spatial.md, on plans/002-learn.md.
     Next: plans/briefs/critwire-learn-d.md (the spatial track), started only after this mission is live.
     Estimate: about 30–36 sessions (6 pipeline stages, about 20 steps, code review, verification, release). -->

## Goal

critwire.com publishes its first data beyond species and countries, and critwire Learn teaches with it, as `plans/003-learn-data-spatial.md` designs:
- **Traits** (003 §1 D1, D6, D7; §2 "The grown tables"): `/v1/traits.{parquet,csv,json}` (critwire's trait list: name, unit, its own description) and `/v1/species_traits.{parquet,csv,json}` (one value per animal and trait, with each row's source name, license and retrieval date), from AnAge Build 15 (CC BY 3.0), the Amniote life-history database (CC BY 4.0) and AmphiBIO v1 (CC BY 4.0), in that order of precedence (003 §3 lesson 21).
- **Names in other languages** (003 §1 D5): `/v1/species_names.{parquet,csv,json}` from Wikidata labels (`rdfs:label`, CC0).
- **The phylogeny, if its id match works** (003 §1 D8, §2): `tree_nodes` from Open Tree of Life 16.1 (CC0), with a `depth` column so DuckDB loads it one level per `INSERT`. If Open Tree can't match every animal exactly, it is left out and recorded; lesson 20 stays on `taxa`.
- **Learn grows:** the new tables in `setup.sql` (003 §2's `setup-grown` blocks for these tables, merged in); `site/learn/schema.mmd` and its SVG with the new tables; `/learn/schema/`'s data dictionary; **lessons 17–21** (003 §3: units, compare-classes, languages, relatives, two-sources) at `/learn/<slug>/`, after lesson 16 on the path index.
- **Lesson 16 moves to its own names** (003 "Disagreements with 002"): its blocks, exercise and check use `my_traits` and `my_species_traits`, so they don't collide with the real tables.
- **Attribution:** an entry per new source in `scripts/build/sources.ts` (citation verbatim, license URL in `LICENSE_URLS`), each listing the fields it covers; the docs page lists the new files.
- **Its E2E**, and it's live: the mission merges and deploys at its end (owner's standing decision, 2026-10-21).

## Why

Learn's core path teaches tables, keys and joins on critwire's animals; the grown data lets the next lessons ask real questions (how heavy, how long-lived, what it's called in German) and show how open datasets are licensed, credited and combined. These datasets are the open, small, non-spatial ones 003 ranks at the top, so they come before the spatial track, which needs more machinery.

## Scope

In:
- `scripts/ingest/` (new sources `anage`, `amniote`, `amphibio`, `opentree`, and Wikidata labels), `scripts/derive/` and their tests, `data/raw/<source>/`, the new derived files under `data/`, `scripts/build/` (writers for the new `/v1` files, `sources.ts`, attribution, docs), `site/learn/` (setup, schema, lessons 17–21, lesson 16's rename, the engine's DECIMAL decoding if B's lacks it), `e2e/`, `AGENTS.md` (new commands, files and their owners), `plans/003-learn-data-spatial.md` (relabelling the blocks this mission makes real; deviations).
- Reading the A2 spike at `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/` (`run-queries.ts`, `scripts/grown-data.ts`, `src/setup-grown.sql`, `src/format.ts` `decimalText`, `data/spike-tables.json`) and porting what fits, with its tests' failure cases. Never edit the spike.

Out:
- Everything spatial: `country_shapes`, `occurrences`, `habitat_classes`, `country_habitats`, clips, the `spatial` extension, lessons 22–23, the spatial and IUCN lessons. That is mission D.
- EltonTraits, COMBINE, ReptTraits, PanTHERIA (003 §1: optional or "not yet"); add one only if the three trait sources leave a lesson without data, and record why. COMBINE and ReptTraits only through an explicit column allow-list without their IUCN-sourced columns.
- Changing any existing `/v1` file's shape or bytes, or re-running `ingest wikidata`, `col` or `gbif` for the existing fields.
- IUCN data of any kind (categories, assessments, ranges), Wikidata property P141, Wikipedia prose.
- `/etc/caddy`, the ops Caddyfile, the `critwire` database except through `deploy critwire` at the release.

## Definition of done

- `pnpm typecheck`, `pnpm test` (the new derive rules and matchers, failure cases first) and plain `pnpm build` pass on the final commit.
- **Existing `/v1` files unchanged:** at Baseline, save the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`. The final build matches it for every `species.*`, `species/*` and `countries.*` file; `attribution.json` differs only by the new source entries (checked with `jq`); `index.html` may change.
- **The new files:** every `species_traits` row names a known species, trait and source; every trait has a unit; no animal has two values for one trait; every `species_names` row is one label per language. Derive refuses a stale snapshot, a name matched twice and an unknown column, as `AGENTS.md`'s data rules say. Coverage per class and per trait is printed by derive and recorded in the plan.
- **003's queries re-run:** lessons 17–21's blocks, lesson 16's renamed blocks and `setup-grown`'s tables are relabelled `ran` in 003 and re-run against the built `/v1` files with the spike's `run-queries.ts --check --erd` (or the port of it), each result difference explained under Decisions and `--update`d.
- **`pnpm e2e` passes in full**, nothing skipped: B's specs, with lesson 16's cases on the new names; every lesson 17–21 SQL file runs in its page; every exercise accepts its answer and rejects a fixed wrong one; `/learn/schema/` shows the new tables; a DECIMAL result prints as DuckDB prints it; no request leaves the origin except to the two Wikimedia photo hosts (answered by a fixture).
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-c/e2e/`: the Playwright HTML report, a trace per test, `results.json`, screenshots of lessons 17 and 21 at 1280 and 375 px and of `/learn/schema/`, reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every new `/v1` file and every `/learn/` page returns 200; the new files' row counts equal the build's; every existing `/v1` file hashes as at Baseline (except `attribution.json`, as above); one headless Chromium run against https://critwire.com/learn/units/ runs lesson 17 and shows its result.
- The plan's Summary gives: what shipped, coverage per class and trait, whether `tree_nodes` shipped, the E2E counts and artifact path, every deviation from 003, the release record, and what mission D needs to know.

## Decision rules

- **003 is the design**, built on 002 and on B's code: reuse B's engine, `runScript`, cards, checks, page shell, ERD pipeline and E2E harness; add nothing that duplicates them. Where code shows 003 is wrong, choose the simplest fix, record it under Decisions, and update 003 in the same commit.
- **Data rules from `AGENTS.md` hold:** ingest fetches and commits a snapshot; derive is offline and pure; the build loads `data/` only; never hand-edit derived files; every third-party field and every row of `species_traits` credits its source.
- **Matching is never guessed:** exact scientific name, then Catalogue of Life synonyms from critwire's own COL snapshot; anything else is a miss, listed in `mismatches.json`, never a fuzzy match.
- **A trait value is what one dataset recorded**, with its unit, never an average across datasets; the precedence order fixes which one critwire shows.
- **Licenses decide what critwire hosts.** Only the licenses 003 §1 quotes; a column or file whose terms are unclear is left out.
- **Standard SQL in lessons** (PostgreSQL and DuckDB both run it: `percentile_cont`, not `median`); write for people aged 16 and up; no counts in prose that the data can change.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.
- The owner's answers to 003 §8 override this brief where they differ. Without an answer, use 003's recommendation.

## Notes

- **What it assumes B delivered** (B1 and B2, merged and live): `/v1/countries.*` (250 rows); the self-hosted engine (duckdb-wasm 1.33.1-dev65.0, DuckDB v1.5.6, `eh` bundle) and the `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/` extension mirror; `setup.sql` (6 tables and the `species_taxonomy` view); `site/learn/schema.mmd` with `pnpm erd` and the build's stale check; the 16 lessons (`lessons.json`, `site/learn/sql/`); the E2E harness; the cookbook, playground and game; the Caddy headers if the owner approved them. **Where B's plans record deviations from 002, B's code wins**; read `plans/<date>-critwire-learn-b1.md` and `-b2.md` first.
- **Pointers into 003:** datasets, licenses, sizes and ingest work §1 (D1, D5–D8); tables, keys, the setup and the ERD §2; lessons §3; the lesson 16 rename and the setup merge in "Disagreements with 002"; the owner's choices §8.
- **Facts the spike proved** (A2 plan Decisions), each a trap if forgotten:
  - Lesson 16 after the grown setup fails `Table with name "traits" already exists!` (and `"species_traits"`); renamed, its check's expected rows change in one line only: `FOREIGN KEY (trait_name) REFERENCES my_traits("name")`.
  - DuckDB-WASM 1.33.1 returns a `DECIMAL` column as raw 32-bit words (`[246491, 0, 0, 0]`); the spike's `decimalText` (`src/format.ts`, by Arrow type id 7 and the field's scale) prints it as DuckDB does. A literal like `1.5` is `DECIMAL` in DuckDB, so learners meet this in any lesson.
  - New `sources` rows ride in `species_traits.parquet` (name, license, retrieved per row) and the setup inserts the distinct ones before `species_traits`; no separate sources file.
  - DuckDB checks a self-referencing foreign key statement by statement: `tree_nodes` loads one `depth` per `INSERT`, as `taxa` loads one rank per `INSERT`.
  - Coverage by exact name today: AnAge 35/50 mammals, 8/11 turtles, 6/15 amphibians; AmphiBIO 15/15 amphibians; the Amniote database 9/11 turtles and 46/50 mammals, so AnAge with the Amniote database covers 10/11 turtles (not *Rafetus swinhoei*, unless a synonym matches).
  - The Amniote database writes `-999` for missing: it becomes NULL, never a value.
  - EltonTraits' metadata asks that its body-mass sources be cited: cite them or leave body mass to AnAge.
  - Wikidata: named properties only, never whole entities; P141 is a Red List category. Text in other Wikimedia namespaces is CC BY-SA and never used.
- **Wikidata labels without touching `species.*`:** keep the labels in their own snapshot (for example `data/raw/wikidata-labels/`), so the existing Wikidata snapshot, and with it `species.json`, keeps its bytes.
- **The ERD:** `site/learn/schema.mmd` grows; 002's entities and lines stay exactly as they are (A2's `baseDrift` rule, `scripts/erd-model.ts`). The `||--o|` line for a primary-key foreign key is D's (it adds `country_shapes`).
- **GBIF DOI:** nothing here touches GBIF counts; plain `pnpm build` and `deploy` still refuse a stale DOI, as today.
- **The spike** (read only): `/srv/critter-ai/agent-state/missions/critwire-learn-spatial-design/spike/`, `README.md` lists every command; `run-queries.ts` re-runs 003's blocks on port 3102 (never while `pnpm e2e` runs) and needs `SPIKE_PG_URL=postgresql:///critwire_dev` only for 003's PostGIS blocks, which this mission doesn't change.
