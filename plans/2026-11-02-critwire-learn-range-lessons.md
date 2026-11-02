---
mission: critwire-learn-range-lessons
project: critwire
branch: agent/critwire-learn-range-lessons
status: active
started: 2026-11-02 00:26 UTC
---

# Mission: critwire Learn, use the new range listings in s1, f3 and e4

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-learn-range-lessons.md
     Start: started by the chain after critwire-native-ranges-build is released (base: main).
     Owner, 2026-11-01: answers to 007's O4 and O5 (handoff H10, H11). -->

### Goal

Three Learn modules use the live `/v1/range-listings` file, as `plans/007-native-ranges.md` `## Learn tie-in` describes:
- **s1 (sampling bias):** compare where open records exist with where sources list an animal as native.
- **f3 (joins):** a join against the listings.
- **e4 (quality and provenance):** the module's made-up rows, as 007 says.

d1 and d2 too, only if they fit within the size limit below. g3 and c1 are deferred.

**The copy rule (O4):** "records, never range" changes only on pages that read the listings file, in the same change, using the wording in 007's `## Learn tie-in`. Everywhere else it stands. Update `AGENTS.md`'s copy rule to say so.

### Why

Learners can now see the difference between "recorded there" and "listed as native there", which is the honest point s1 has been making all along, using real data.

### Scope

In: the s1, f3 and e4 pages and blocks under `site/learn/`; any setup needed to load the listings for those blocks; `learn:check` results; `e2e/`; `plans/004-learn-curriculum.md`; `AGENTS.md`'s copy line.

Out:
- other modules, apart from d1 and d2 if they fit
- `/v1` files
- new datasets
- IUCN data
- held work: critwire PR #17 and `data/review/country-overrides.json`

### Definition of done

- `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm e2e` pass; `learn:check` passes twice.
- Every new block ran, with its result recorded and shown on the page.
- A prose number on a changed page matches its block's result.
- Live smoke after `deploy`: each changed page returns 200, and its first new block shows the recorded result in headless Chromium.
- The Summary lists what changed per module and the exact wording used.

### Decision rules

- 007 is the design. Where code proves it wrong, fix it in the same commit and record why.
- Each listing is a claim by a named source: show the source, and show conflicts rather than resolving them.
- Keep it small: at most 12 steps.

### Notes

- If `/v1/range-listings` isn't live on `main`, add a handoff item and finish with `MISSION_BLOCKED: range listings not live`.
- Critter Connect's E2E isn't involved. Critwire's E2E harness uses ports 3100 and 3101.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-02 on `0d8556c` (`origin/main` `bceb0bf` + mission start), db `critwire_dev` (`.env`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-range-lessons/` (`baseline.log`, `baseline-e2e.log`).
- `pnpm install --frozen-lockfile`: up to date. `pnpm learn:venv`: ok. No migrations (build rebuilds tables each run). No lint script; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 811/811 pass (4 min).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,558 B, committed lab data 18,822,906 B (cap 120,000,000 each).
- `pnpm e2e`: 166/166 pass (11.2 min); artifacts `.../critwire-learn-range-lessons/e2e-baseline/` (839 MB). Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- `dist/` hashes: 314 files, list `.../critwire-learn-range-lessons/dist-baseline.sha256` (list's sha256 `9fd1afc7763a859f…`); unchanged after E2E; live `/srv/apps/critwire/.live` identical (`cmp` clean).
- `/v1/range-listings.{json,csv}` live: 200 (brief's precondition holds).
- Not run: `pnpm test:db`, `pnpm learn:check`: brief's Baseline doesn't name them; plain build already refuses a lab not proven as committed.
- Working tree clean after. Handoff: H3, H6, H12 waiting on owner, none blocks this mission.

## Architecture

All numbers below were run on this worktree's Baseline `dist/`, in Node DuckDB, over the published files (`withLabTables`). The final block texts in Q2 also ran in Baseline's WASM engine (see Q2, "Same text on both engines").

### Findings, by impact

1. **The build can't see the listings file, so a refresh would publish false lessons (fail fast; 007 misses this).** `scripts/learn/freshness.ts:96-97,186` hashes only `manifest.files`; 007's path pins the file in `manifest.inputs.v1` (`scripts/build/learn/data.ts:74,80`). Browser results are compared only in `pnpm e2e` (`e2e/learn-browser.spec.ts:273`), and `deploy` runs only `pnpm build`. Today's browser blocks are covered indirectly: their tables are embedded in the loader (`loader.ts:268`), so a data change makes labs stale. The listings are the first browser input outside the loader. An `ingest mdd` or `ingest gbif-checklists` refresh would deploy with prose and snapshots disagreeing with the block. **Fix:** a build guard (Target design, 2).
2. **`AGENTS.md:100`, "Correcting a curated row", becomes false in two ways unless designed around.** (a) The pin moves `learn/data/manifest.json`, which the recipe doesn't list. (b) A block reading curated rows would move a lesson number on any correction, and H12 is open. **Fix:** every listing block is scoped to rows curated corrections can't touch (Target design, 3); edit the recipe.
3. **The copy rule has no gate.** Nothing scans pages for it; `e2e/docs.spec.ts:72` and `e2e/learn-labs.spec.ts:236` each check one phrase. Today `\b(native|introduced)\b` has 0 matches, case-insensitive, in `site/learn/modules` (33), `pages` (7), `data/index.html`, `layout.html`, `curriculum.json` and every page's block files, so a gate costs nothing now and stops drift. The one hit in `site/learn/` is `site/learn/sql/setup.sql:83` ("not the native range"): no page shows it, and it isn't a page's block (`scripts/learn/course-files.ts:56`). It reaches only the app bundle and the loader, and stays, because `setup.sql` stays byte-identical. **Fix:** one E2E test (Target design, 5).
4. **007's e4 number can't come from a block.** "44 of the 88 datasets met are CC BY-NC" is in no committed file: `data/raw/gbif-checklists/snapshot.json` keeps the 18 role datasets and `dropped` counts, no licenses for the rest. The Definition of done requires a prose number to match its block. **Fix:** e4 states no such number; 007's row is corrected in the same commit.
5. **Brief and 007 pull apart on e4.** "Three modules use the live file", but e4's rows are made up, and O4 changes wording only on pages reading the file. **Fix:** e4 doesn't read the file and doesn't get the added line. "Introduced" appears only as a term inside its made-up lists, with no real animal or country (Q3).
6. **Small things 007's path breaks.** Each page still builds its tables from four files, and now fetches a fifth that makes no table; `setup.sql` reads only the four. So no copy may say "five files setup.sql reads". Each line below says four tables' files plus one file lesson blocks read in place (exact copy: Target design, 1): `site/learn/pages/setup.html:16`, `plans/004-learn-curriculum.md:475`, `site/learn/src/engine.ts:4,24,88`. "Species and countries files" goes false at `site/learn/data/index.html:38`. `site/learn/pages/schema-schema.html:3` stays: it speaks of the tables, and those come from four files. `scripts/build/learn/dist-fixture.ts:23-24` writes no listings file, so `data.ts:112` would throw in its tests. `AGENTS.md:68` in 007 is now `:69`.
7. **The refusal harness can't hold a guard refusal (this plan's first draft missed it).** `e2e/range-listings-refusals.ts:198` fails any refusal after the db load, `:208` requires `dist/`'s hashes unchanged, every case must refuse in both modes, and `RESTORED` (`:28`) covers only `data` and `contracts`. The guard runs after `dist/` is written and, on a result difference, only warns under `--draft`. **Fix:** a second case shape (Target design, 6).

**Verified fine:**
- 007's path: `V1_INPUTS` + `DATA_FILES` is enough. The engine registers every entry by name (`engine.ts:236`), Node resolves the same name (`projection.ts:80`), and `read_parquet` in a lesson editor is established (`site/learn/sql/d2-list.sql`).
- 007's numbers: 275 of 364 (75.5 %), 89, 94 of 379.
- `scripts/learn-check.ts`'s import closure holds one `scripts/build/` file (`learn/sql.ts`), so `data.ts`, the engine and the guard don't enter any lab key.

### Q1. How blocks reach the listings

| Option | What it touches | Verdict |
|---|---|---|
| **A. Browser reads `/v1/range-listings.parquet` by name** | `data.ts:80`, `engine.ts:25`, fixture, copy | **Chosen.** 12,321 B per boot, same-origin, sha-pinned (SC2). `manifest.files` unchanged: 0 of 189 lab keys move. No loader, ERD, setup.sql, star, cap or H6 change |
| B. Table or view in `setup.sql`, browser only | 004 §0 fence (byte for byte), `schema.mmd`, `schema.svg`, dictionary, the schema catalog check in E2E | Rejected: churn for a shorter `FROM`; browser and PostGIS schemas stop matching |
| C. 17th lab table in `LAB_TABLES` | Loader bytes, so **all 189 lab keys and `labErd`** (`freshness.ts:97`); `lab.mmd`, `pnpm erd`, `pg-smoke`'s 16 rows, setup page, manifest `tables` | Rejected: **every curated correction would then need a whole `learn:check --update`** |
| D. Copy under `/learn/data/` | New `manifest.files` entry, so as C; cap | Rejected: same staleness, and not the live file |

**Engines:** f3, s1 and d2's new blocks are browser. e4's is PostGIS with inline rows and reads no file. No new Python block, so no `.py` or `.ipynb` moves. Cap: `/v1` isn't counted, `dist/learn/data/` stays 96,026,558 B. H6's star rows don't move.

**Existing results stay byte-stable, and it's provable:** `git diff --stat -- e2e/__snapshots__ site/learn/labs/checked` must show only new files plus `checked.json`, whose diff is limited to `blocks["e4-list-rows"]`, `downloads["e4.sql"]` and its date. Hash list against `dist-baseline.sha256`: `v1/**`, `index.html` and all of `learn/data/**` but `manifest.json` and `index.html` are identical (`learn/data/index.html` differs this once, for the copy edit at `data/index.html:38`); in `learn/labs/` only `e4.sql` differs. `learn/assets/` gets a new hashed bundle; pages differ only by its name, except the pages edited.

### Q2. Blocks

All `status: ran`. "Mammal scope" means `sourceKey = 'mdd'` or `species_taxonomy.class = 'Mammalia'`. Browser blocks carry d2-list's comment, `-- DuckDB only: reads the published file, not a learners' table`.

The `ORDER BY` column is each block's whole order. "Proof" counts rows against distinct keys on Baseline `dist/`.

| Page | Block | Engine | Computes | `ORDER BY`; proof it's total | Recorded result |
|---|---|---|---|---|---|
| f3, Lab step 1 | `f3-listed-no-records` | browser | Anti join on two columns: MDD `present` rows with no `species_countries` row. Columns: animal, country, origin, source | `s.common_name, s.id, c.name, l.origin`. 89 rows, 89 distinct (`s.id`, `c.name`); MDD holds one row per animal and country (400 of 400). `source` is one value under the `mdd` filter | 89 rows, `sha256 d0d87c462f63`; first `Aardvark \| Burundi \| native-or-pre-1500 \| Mammal Diversity Database` |
| f3, Exercise | `f3-ex-listed` | browser | `NOT EXISTS` on two columns: the Tiger's open-record countries on no listing | `c.name`. `countries.name` is `UNIQUE` (`setup.sql`), one animal; 4 of 4 | 4 rows, `sha256 b70a76ec0dab`: Brazil, Germany, South Africa, United States of America. `WRONG`: drop the species condition, 0 rows |
| s1, new Lab step 4 | `s1-listed` | browser | One row: source, listed, with_records, pct, no_records, record_countries, on_no_listing | None: `GROUP BY source` under the `mdd` filter gives 1 row | `sha256 157fdfaf5ca5`: `Mammal Diversity Database \| 364 \| 275 \| 75.5 \| 89 \| 379 \| 94` |
| s1 | `s1-listed-species` | browser | Per animal: animal, source, listed, with_records, no_records | `no_records DESC, listed DESC, s.id`. One group per `s.id`; 50 of 50 | 50 rows, `sha256 4b230741b745`; first `Aardvark \| Mammal Diversity Database \| 42 \| 19 \| 23` |
| s1 | `s1-listed-conflicts` | browser | Mammal rows on docs' conflict definition (`site/index.html:289-295`), each claim with source and url | `s.id, m.country, m.origin, m.presence, m.sourceKey`, the file's key with `area` NULL; 416 of 416 mammal rows with no `area` | 2 rows, `sha256 9557e3eb4326`: Black Rhinoceros, South Africa: GRIIS South Africa `introduced`, MDD `native-or-pre-1500`. Prose resolves nothing and links the docs query for all animals |
| d2, Worked example | `d2-listing-facts` | browser | Mammal rows by origin and presence: origin, presence, listings, sources | `listings DESC, l.origin, l.presence`. The group key is unique | 5 rows, `sha256 2ab668eb6f13`: 364, 36, 7, 6, 3. `native` + `absent` is why origin and presence are two columns |
| e4, Lab, after quarantine | `e4-list-rows` | PostGIS | Inline `VALUES`: made-up lists and rows, each row kept or dropped by license, then by the list's role | `row_no`, a column the `VALUES` numbers 1–5. `scripts/learn/runner.ts:239` refuses a multi-row PostGIS block with no `ORDER BY` | 5 rows. Kept: 3, two of which disagree (both stay). Dropped: CC BY-NC by license; an open, well-formed row from a catalogue with no role, which marks the animal introduced in its home country |

The six browser blocks, as they ran. Each file adds its `-- q:`, `-- status: ran` and d2-list's comment. Prose may reshape a block; the guard then compares the new result with its snapshot.

```sql
-- f3-listed-no-records
SELECT s.common_name AS animal, c.name AS country, l.origin, l.source
FROM read_parquet('range-listings.parquet') AS l
JOIN species AS s ON s.id = l.speciesId
JOIN countries AS c ON c.code = l.country
LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
WHERE l.sourceKey = 'mdd' AND l.presence = 'present' AND sc.species_id IS NULL
ORDER BY s.common_name, s.id, c.name, l.origin;

-- f3-ex-listed
SELECT c.name AS country
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
JOIN countries AS c ON c.code = sc.country_code
WHERE s.common_name = 'Tiger'
  AND NOT EXISTS (SELECT 1 FROM read_parquet('range-listings.parquet') AS l
                  WHERE l.speciesId = sc.species_id AND l.country = sc.country_code)
ORDER BY c.name;

-- s1-listed
WITH listed AS (
  SELECT l.source, sc.species_id IS NOT NULL AS has_records
  FROM read_parquet('range-listings.parquet') AS l
  LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
  WHERE l.sourceKey = 'mdd' AND l.presence = 'present'
), recorded AS (
  SELECT NOT EXISTS (SELECT 1 FROM read_parquet('range-listings.parquet') AS l
                     WHERE l.speciesId = sc.species_id AND l.country = sc.country_code) AS on_no_listing
  FROM species_countries AS sc
  JOIN species_taxonomy AS t ON t.species_id = sc.species_id
  WHERE t.class = 'Mammalia'
)
SELECT source,
       count(*) AS listed,
       count(*) FILTER (WHERE has_records) AS with_records,
       round(100.0 * count(*) FILTER (WHERE has_records) / count(*), 1) AS pct,
       count(*) FILTER (WHERE NOT has_records) AS no_records,
       (SELECT count(*) FROM recorded) AS record_countries,
       (SELECT count(*) FROM recorded WHERE on_no_listing) AS on_no_listing
FROM listed
GROUP BY source;

-- s1-listed-species
SELECT s.common_name AS animal, l.source, count(*) AS listed,
       count(sc.species_id) AS with_records,
       count(*) - count(sc.species_id) AS no_records
FROM read_parquet('range-listings.parquet') AS l
JOIN species AS s ON s.id = l.speciesId
LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
WHERE l.sourceKey = 'mdd' AND l.presence = 'present'
GROUP BY s.id, s.common_name, l.source
ORDER BY no_records DESC, listed DESC, s.id;

-- s1-listed-conflicts
WITH mammal_rows AS (
  SELECT l.*
  FROM read_parquet('range-listings.parquet') AS l
  JOIN species_taxonomy AS t ON t.species_id = l.speciesId
  WHERE t.class = 'Mammalia' AND l.area IS NULL
), conflicts AS (
  SELECT speciesId, country
  FROM mammal_rows
  GROUP BY speciesId, country
  HAVING (count(*) FILTER (origin LIKE 'native%') > 0 AND count(*) FILTER (origin = 'introduced') > 0)
      OR (count(*) FILTER (presence = 'present') > 0 AND count(*) FILTER (presence = 'absent') > 0)
)
SELECT s.common_name AS animal, c.name AS country, m.origin, m.presence, m.source, m.url
FROM mammal_rows AS m
JOIN conflicts USING (speciesId, country)
JOIN species AS s ON s.id = m.speciesId
JOIN countries AS c ON c.code = m.country
ORDER BY s.id, m.country, m.origin, m.presence, m.sourceKey;

-- d2-listing-facts
SELECT l.origin, l.presence, count(*) AS listings, count(DISTINCT l.sourceKey) AS sources
FROM read_parquet('range-listings.parquet') AS l
JOIN species_taxonomy AS t ON t.species_id = l.speciesId
WHERE t.class = 'Mammalia'
GROUP BY l.origin, l.presence
ORDER BY listings DESC, l.origin, l.presence;
```

**Same text on both engines (verified, not assumed).**
- One renderer: `renderResult` (`scripts/learn/result.ts:25`) and `cellText` (`scripts/learn/cell.ts`) serve Node and the browser's snapshot alike. Only the values reaching them could differ.
- Same engine: both are DuckDB v1.5.6 on one thread (`scripts/build/duckdb.ts:14`; WASM's `current_setting('threads')` is 1). Neither promises an order without `ORDER BY`, and a data change can move a group's place, so the rule stands.
- Same values for four types: VARCHAR, INTEGER, BIGINT and DOUBLE reach `cellText` as string, number, bigint and number on both, and these blocks use only VARCHAR, BIGINT and DOUBLE. The ones that differ or fail: LIST and STRUCT (`d2-list`, the miss in Target design 2) and ENUM, which the browser refuses (`engine.ts:146`). The guard allows only the four.
- Proof: the six texts above, plus `f3-ex-listed`'s `WRONG`, ran in Node over Baseline `dist/`, then in Baseline's real engine in headless Chromium (playground, the published parquet bytes read by URL, since Baseline doesn't register the name yet). `renderResult` matched byte for byte on all 7, hashes included. Registering the name doesn't change the reader: `read_parquet('species.parquet')` works by name in the same engine.

Rules for these blocks:
- e4's rows use a made-up animal and codes no country has (`XA`, `XB`), from lists titled only `List A`, `List B`, `List C` and `Catalogue D`, like no real GBIF dataset. "Introduced" appears only as a field value in the block's `VALUES`, never in `e4.html`. The prose says a filter on license or on a field's value can't catch the last row, only a person's check of the whole list can, and links `/#range-listings`, which works that way. No count of real datasets.
- f3 follows 007 (one exercise) and adds a lesson block, because an exercise hides its result and the Definition of done needs one shown.
- f3 and s1 say no row means critwire holds no open listing, and a listed country with no record shows nothing either way.
- s1's prose words `on_no_listing` as "on no listing from any source", which is what the query asks. Counting only MDD also gives 94 today (measured).
- Each page defines MDD once and links `/#licenses`, where its IUCN tie is stated. No IUCN data, no Wikipedia prose.

### Q3. Copy rule

**The added line, on each reader (d2, f3, s1), 007's text word for word:**

> On this page, native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range.

The example is true: MDD lists the Black Rhinoceros in Kenya. `s1.html:19`, `p4.html:7`, `c1.html:35`, `map.html:11` and `schema-schema.html:4` stay as they are; s1's bullet is true of records.

**`AGENTS.md:69` becomes:**

> - Copy: records, never range; no mission names on public pages; link only pages that exist (planned modules unlinked). A page with a block reading `/v1/range-listings` (d2, f3, s1) adds, in the change that makes it read the file (owner O4, plan 007): "native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range." Elsewhere those words stay off Learn's pages, except inside e4's made-up rows (`e4-list-rows`). `e2e/learn-labs.spec.ts` checks this on the sources.

**`AGENTS.md`'s Learn rules gain, beside "Raster:":**

> - Listings: a block reaches `/v1/range-listings` only as `read_parquet('range-listings.parquet')`, in one read-only, ran browser statement: mammal rows only, cells VARCHAR, INTEGER, BIGINT or DOUBLE, and past one row a final `ORDER BY` with a unique tiebreaker. Any other mention of the file, in any block of any engine, is refused (`scripts/build/learn/listing-blocks.ts`).

### Q4. d1, d2

**d2 yes, one block; d1 no.** 007 counts them as one block. d2 already reads the published file (`d2.html:20`) and needs no new concept. d1 would need that aside, for a composite key that f3's join already teaches. Size: 9 steps without release (plumbing, guard, f3, s1, e4, d2, copy gate and recipes, live smoke and curated proof, final Verification). **If the planner passes 12, d2 is cut first.** g3 and c1 stay deferred.

### Q5. Prose numbers and proof

Each link in the chain has a gate:
- **Data = snapshot:** the new guard, at every plain build.
- **Browser = snapshot:** `e2e/learn-browser.spec.ts:273,418` (add the new ids to its `seen` lists, `f3-ex-listed` to `WRONG`).
- **004 = snapshot and checked:** `pnpm learn:port --check all`. No suite runs it, so Verification must name it.
- **PostGIS = checked, page = checked:** `learn:check`, `e2e/learn-labs.spec.ts:98`.
- **Prose = result:** reuse `QA_FIXES` with `from: { file, values }` (`e2e/qa-fixes.ts`; `e2e/learn-walk.spec.ts:122` on dist, `release/live.spec.ts:100` on the origin). One row per quoted number, with a new id prefix; its header comment gets one line. `from` reads the recorded file's shown rows, so prose quotes only `s1-listed`, a block's row count, or its first 5 rows.

**Live smoke:** one new test in `e2e/release/live.spec.ts`, beside `:61`. For f3, s1 and d2 it asserts the page answers 200, runs the first new block and compares with its snapshot. For e4 it compares `#q-e4-list-rows pre.recorded` with `checked/e4-list-rows.txt`.

### Q6. Consequences for later data changes

| Change | After this mission |
|---|---|
| **Correcting a curated row (H12)** | **Recipe stays:** no `learn:check`, DOI, habitat or sample work, no result moves. A curated row on a mammal is refused (`scripts/derive/range-curated.ts:30`), and the guard refuses a listing block that reads anything but mammal rows. Moves `v1/range-listings.*` and now `learn/data/manifest.json` (plus `attribution.json` and `index.html` if the row count does). `learn/data/index.html` doesn't move: `scripts/build/learn/page.ts:59` reads `inputs.sample`, never `inputs.v1` |
| `ingest gbif-checklists` or `ingest mdd` moving a mammal row | No `learn:check`, DOI, habitat or sample work. **New:** plain build refuses, naming the block, until the new result is in 004, the snapshot and the prose, in one commit. So does `deploy` |
| `ingest gbif` or an override moving a published country | As today (`learn:check --update`, ≈ 1–2 h), and the guard names the listing blocks too. PR #17 was confirm-only and is merged; nothing moved |
| Species change | As today's ≈ 1 h chain, plus any re-recording the guard names |
| This mission, once | One whole `learn:check --update`, for e4's new block and `e4.sql` only. No DOI, habitat or sample work |

**`AGENTS.md:100` becomes:** "…`deploy critwire`. Moves only `v1/range-listings.*` and `learn/data/manifest.json` (the file's pin), plus `v1/attribution.json` and `index.html` if the row count does; no `learn:check`, DOI or sample work. Learn's listing blocks read mammals only (the build checks it), and a curated row can't be a mammal."

**`AGENTS.md:105`'s last sentence gains:** "If a refresh moves a listing block's result, plain `pnpm build` refuses: put it in 004, `e2e/__snapshots__/<id>.txt` and the page's prose, one commit."

`AGENTS.md:46` (the build line) gains the guard's refusal.

### Target design

1. **Plumbing (one concern, no new interface).** Add `"range-listings.parquet"` to `V1_INPUTS`; one `DATA_FILES` entry; `dist-fixture.ts` writes the file through `writeRangeListings`. `setup.sql` is untouched, so `learn:port --check setup` holds and no ERD moves. Copy from Finding 6:
   - `setup.html:16`, after the sentence naming the four files, add: "The page also fetches <code>/v1/range-listings.parquet</code>, which builds no table: a few lesson blocks read that file in place."
   - `004:475`, the same sentence in its place, with backticks.
   - `data/index.html:38`: "The labs also read critwire's species, countries and range-listings files under…"
   - `engine.ts:4`: "fetch manifest.json, the four files setup.sql reads and the one lesson blocks read in place". `:24`: "The files the page fetches: the four setup.sql reads and the one lesson blocks read in place, by the name…". `:88`: "The files, each checked against manifest.json (SC2)…".
2. **Guard: new `scripts/build/learn/listing-blocks.ts`, two functions on `star.ts`'s pattern.**
   - **`listingBlocks(pages)` (query):** returns `{ blocks, errors }`, each block with its page, like `starBlocks`. `readLearnInputs` adds its `errors` to `all` (`site.ts:62`), so these refuse in both modes, before the db load and any write. It reads `block.text` of **every block on every page, in every engine and status** (browser, PostGIS, Python, Power BI; a comment counts). A listing block is one holding the only supported spelling, `read_parquet('range-listings.parquet')`. It refuses:
     - **Another form of the name:** with that spelling removed, `/range[-_ ]?listings/i` still matches. Catches `FROM 'range-listings.parquet'`, double quotes, `parquet_scan`, a list argument, a URL, `.csv`, `.json`, a table name, Python's `f"{BASE}/v1/range-listings.parquet"`, a comment, `READ_PARQUET`.
     - **The file reached without its name:** a `read_parquet(` or `parquet_scan(` whose argument isn't one plain literal (`/\b(read_parquet|parquet_scan)\s*\(\s*(?!'[^'*?\[\]]+'\s*[,)])/i`), or a glob in a data-file literal (`/'[^'\n]*[*?\[][^'\n]*\.(parquet|csv|json)'/i`). `read_parquet('*.parquet')`, `read_parquet('spec*.parquet')` and `'spe' || 'cies.parquet'` all resolve in the WASM engine (tested), so once the file is registered each would reach it.
     - **A listing block that isn't plain:** engine other than `duckdb`, status other than `ran`, `-- after:` or `-- expect:`, more than one statement, or not `readsOnly`. One read-only statement is also what lets blocks share the guard's session.
     - **A dependency through a chain:** any block naming a listing block in `-- after:`, since its result would depend on the file while its text doesn't name it.
     - All 15 forms tested: each refused but the supported one. All 277 of today's block files pass (no false positive).
   - **`assertListingBlocks(out, blocks, { draft })`,** called from `scripts/build.ts` after `writeStar`, in one `withLabTables` of its own. For each block, naming every failure:
     - **Cell types:** any column outside VARCHAR, INTEGER, BIGINT, DOUBLE (`reader.columnTypes()`) is refused. This makes Q2's rendering rule mechanical.
     - **Order:** more than one row with no `ORDER BY` at paren depth 0 of `codeOnly(text)` is refused. `rowsOrdered` (`result.ts:62`) won't do: it accepts a window's or a subquery's `ORDER BY`, and editing it would move every lab key, because `scripts/learn/` is in the checker's closure. Depth 0 is the query's own final order. Tested: true for `… ORDER BY a LIMIT 3`, false for `OVER (ORDER BY a)`, `string_agg(a ORDER BY a)` and a CTE's.
     - **Mammal scope:** the block runs a second time with the spelling replaced by `(SELECT * FROM read_parquet('range-listings.parquet') WHERE speciesId IN (SELECT species_id FROM species_taxonomy WHERE class = 'Mammalia'))`. A different result is refused: "reads non-mammal rows; a curated correction would move it".
     - **Snapshot:** `renderResult` must equal `e2e/__snapshots__/<id>.txt`. A plain build throws with `lineDiff`; `--draft` warns (`star.ts`'s policy). A missing snapshot prints the rendered result, which is how an author gets the text for 004's fence.
     - Cell types, order and scope refuse in both modes: they're faults in the block, not results waiting to be recorded.
   - Reuses `star.ts`'s `asResult` (export it), `lineDiff`, `SNAPSHOT_DIR`, `codeOnly`, `readsOnly`. It stays outside `scripts/learn/` so no lab key moves.
   - **Evidence it's sound:** of the 54 single-`SELECT` browser blocks tried, 53 render in Node byte-identical to their browser snapshots. The miss is `d2-list`, a list cell, which the type rule refuses. Measured cost: a 0.5 s lab session and about 60 ms per pass over the 6 blocks.
3. **Scope rule.** Every listing block is in mammal scope, and the guard now enforces it. s1 and f3 read MDD or one mammal; d2 and s1's conflicts filter on `class`. All 6 pass the mammal pass. It catches an unscoped count, an origin-by-presence table with no class filter, and docs' whole-file conflict query (2 rows against 1). This is also the honest lesson boundary: 50 mammals, one named native source. Consequence, stated in s1's prose: the axolotl's conflict in Germany isn't shown there; docs' query lists it.
4. **Pages.** s1's new step sits after the devil, in the browser; the lead and Result gain a sentence. f3's step sits beside "Which have no records at all?". `curriculum.json` is unchanged. 004 and files change together.
5. **Copy gate: one E2E test in `e2e/learn-labs.spec.ts`. It scans sources, not rendered pages,** so a source's title in a result cell isn't taken for copy.
   - `listingBlocks`' pages equal exactly `["d2", "f3", "s1"]`, the same detector the build uses.
   - Each holds the line as written in HTML.
   - `\b(native|introduced)\b` (case-insensitive) may appear only in the pages `listingBlocks` names (d2, f3, s1), anywhere in their HTML and block files, and in e4, only in its made-up rows (`e4-list-rows.sql`). Every other fragment under `site/learn/modules`, `pages`, `data/index.html`, `layout.html`, `curriculum.json` (which fills the map and tracks) has 0 matches, `e4.html` included, and so does every other page's block text, because an editor prints it.
   - Holds today: 0 matches in all of that (Finding 3). No existing page or block must change. `setup.sql:83` is out of scope because it's no page's block.
6. **Refusals and proof.** `e2e/range-listings-refusals.ts` keeps its 6 "ways this harness could lie" and gains (Finding 7):
   - `RESTORED` adds `site/learn/sql` and `e2e/__snapshots__`.
   - **Static cases, today's shape (both modes, before the load):** the file respelled `FROM 'range-listings.parquet'` in `f3-listed-no-records.sql`; its name in a comment of a PostGIS block (`e4-checks.sql`) and in a Python block (`e1-checksum.py`); a glob in `d2-list.sql`; `-- after: s1-listed` on another s1 browser block.
   - **Guard cases, a second shape (after the load, so `:198` is lifted for them):** drop `f3-listed-no-records`' `ORDER BY`, drop `d2-listing-facts`' class filter, add a list cell to `s1-listed`: each refuses in both modes. Edit `s1-listed`'s snapshot: plain refuses with the diff, `--draft` warns and passes.
   - After the last case it re-runs `pnpm build`, then checks `:208`. The build's bytes are deterministic, so the hashes must match.
   - **The mammal pass is the repeatable evidence for the correction recipe:** it runs at every build. Verification also does the recipe once at its worst: set `range-curated.json` to `[]`, `pnpm derive`, `pnpm build` passes with no `learn:check`, only the expected files differ from the prior hash list, then `git checkout -- data`. Expected: under `data/`, `review/range-curated.json`, `range-listings.json` and `review/range-conflicts.json` (it gains `range-not-found` entries for the 26 non-mammals; its 2 conflicts have no curated row, so they stay); under `dist/`, the Q6 files.
7. **007 corrected in the same commit, recorded under Decisions:** the guard; f3 gains a lesson block; e4's unsourceable number; `AGENTS.md:69`.

### Rejected alternatives

- **Lab table, setup table, Learn copy of the file:** Q1.
- **The file's sha in lab keys:** every curated correction stales 189 blocks.
- **Relying on `pnpm e2e` for result drift:** `deploy` doesn't run it, so false prose goes live.
- **Scoping by `sourceKey <> 'curated'`:** an operational carve-out in learners' SQL; mammal scope gives the same immunity and reads as the lesson.
- **Whole-file conflict block:** a correction adding a conflict would refuse a deploy, breaking the recipe, for a second row s1's mammal lesson doesn't need.
- **Lazy-fetching the file only on reader pages:** a second loading path to save 12 KB.
- **A new prose-number table:** `QA_FIXES` already does it, on dist and origin.
- **d1:** Q4.
- **Guard inside `writeStar`'s session (Fable SC1):** that session holds the star's tables, which no browser has, so a block naming `dim_species` would pass the guard and fail on the page. It saves 0.5 s, measured.
- **Dropping only curated rows in the scope pass:** misses docs' whole-file conflict query (the same 2 rows either way), which a later correction could still move. The mammal pass catches it.
- **Scanning rendered pages for the copy rule:** result cells hold source titles ("Global Register of Introduced…"), which aren't copy.
- **Proving each `ORDER BY` total by machine:** each key is proved above, a tie can't split two engines that are the same version on one thread, and a tie that surfaced later would fail the guard loudly.

### Open risks

- A future DuckDB bump could split Node and WASM rendering; the guard then fails loudly, and the fix is a block change.
- A checklists refresh now blocks `deploy` until re-recorded if a mammal row in scope moves. Intended: one commit, no `learn:check`.
- The `[]` proof assumes the build accepts an empty curated file (AGENTS.md: "A non-mammal without a row gets `range-not-found`, not a refusal"). If an unrelated check refuses, remove all rows but one and record that.
- The detector reads text. A name assembled outside a reader call (Python string addition, a Python glob over `/v1/`) gets past it. No block reads `/v1/` from Python today, `SET` is refused in browser blocks (`sql.ts:131`), and such a block would be plain to any reviewer. Accepted.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code: findings 1–6 hold. `scripts/learn/freshness.ts:96-97` hashes `manifest.files` only, so pinning the file in `inputs.v1` (`scripts/build/learn/data.ts:80,114`) moves no lab key; `withLabTables` puts `v1/` on `file_search_path` (`scripts/build/learn/projection.ts:77`), so Node resolves `range-listings.parquet` by the name the engine registers (`site/learn/src/engine.ts:236`); curated rows on mammals are refused (`scripts/derive/range-curated.ts:30`); `data/raw/gbif-checklists/snapshot.json` carries `license` for the 18 role datasets only, so e4's "44 of 88" is unsourceable; `assemble.ts:122,178` put PostGIS blocks in `.sql` and Python in `.py`, so a new e4 PostGIS block moves `e4.sql` only. Every number in Q2 recomputed from Baseline `dist/`: 364/275/89, 379/94, tiger's 4 (BR, DE, US, ZA), one mammal conflict (black rhino ZA: GRIIS introduced, MDD native-or-pre-1500); MDD lists the black rhino in KE, so 007's example sentence is true. Runtimes: browser via `DATA_FILES` (registered buffer, sha-pinned), PostGIS e4 inline `VALUES` (no file), no Python block; all covered. 9 steps ≤ 12; `/v1` isn't under the `learn/data/` cap (`data.ts:95`). Listings stay claims by named source with the conflict's both rows shown (Q2 `s1-listed-conflicts`); copy change scoped to d2, f3, s1 as O4 asks.

MUST-FIX:
1. **Deterministic row order on every multi-row listing block.** `renderResult` (`scripts/learn/result.ts:26-28`) hashes every row in order, and the guard (Target design 2) fails a plain build on any difference between Node DuckDB (multi-threaded) and WASM (one thread). Q2 gives an `ORDER BY` only to `s1-listed-species` (plan :127); `f3-listed-no-records` (89 rows), `f3-ex-listed`, `s1-listed-conflicts` and `d2-listing-facts` (:124-129) have none, and an anti join's output order isn't defined. State a total `ORDER BY` (unique tiebreaker) for each, and have the guard refuse a listing block returning more than one row without a trailing `ORDER BY`, as the no-list-cell rule already does for rendering.
2. **Copy gate's third clause is ambiguous and, read literally, breaks the lesson** (Target design 5, :196: "matches no other fragment … except `e4`"). s1's and f3's own prose must say "listed as native" (Q2 rows, Q3), not only the added line. Write it as: `\b(native|introduced)\b` may appear only in the pages `listingBlocks` names (d2, f3, s1) and in e4; every other fragment under `site/learn/modules`, `pages`, `data/index.html`, `layout.html` has 0 matches. Say the gate scans the HTML sources, not rendered pages.

MISSED:
1. **Both gates key on one spelling.** `listingBlocks` matches `read_parquet('range-listings.parquet')` (:186) and the copy gate takes its page list from it (:194). A block written `FROM 'range-listings.parquet'` or with double quotes reads the file unguarded and its page escapes the copy rule. Have `listingBlocks` refuse any browser block whose text contains `range-listings` in another form.
2. **Finding 6's replacement copy must not call it a file setup.sql reads.** `setup.html:16`, `004:475`, `engine.ts:4,24,88` all say "the four files setup.sql reads"; the listings file is registered for lesson blocks only and `setup.sql` stays byte-identical (Target design 1). "Five files setup.sql reads" would be false; word it as four tables' files plus one file lesson blocks read in place.

SHOULD-CONSIDER:
1. Run the guard inside `writeStar`'s `withLabTables` session (`star.ts:126`) instead of a fourth table build per `pnpm build`; same policy, same `draft` switch, ~2 s saved.
2. Q6's `AGENTS.md:100` text: also say `learn/data/index.html` doesn't move on a curated correction (`page.ts:59` renders only the sample's rows, not `inputs.v1`), since Q1's hash-list proof names it as differing this mission for the copy edit only.
3. s1's prose for `record_countries` 379 / `on_no_listing` 94: say "on no listing from any source", since GRIIS and the Central Asia checklist rows on mammals count as listings there (tiger KZ/TJ/UZ, cheetah, addax, devil).
4. e4's made-up catalogue: give it no title resembling a real GBIF dataset, and keep "introduced" there as a field value in a `VALUES` row, not in e4's prose, so the `AGENTS.md:69` carve-out stays as narrow as written.
5. The `[]` curated proof removes the spiny softshell conflict row from `range-conflicts.json` too; list that file among the expected diffs so the proof's "only Q6's files differ" check doesn't read as a failure.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Guard coverage must fail closed.** Target design 2 recognizes one SQL spelling, and the copy gate shares that detector. An equivalent file reference could bypass both protections, allowing stale lessons through deployment. Require every listings dependency to be guarded; reject unsupported reference forms.
2. **Define deterministic cross-engine results.** The guard compares order-sensitive hashes, but Q2 specifies total ordering for only one multi-row block. Require stable ordering and compatible scalar representations for every guarded result; otherwise unchanged data can fail builds or browser checks.

SHOULD-CONSIDER:

1. Clarify that the copy gate permits terminology throughout reader pages and e4’s fictional examples, not just the mandatory sentence.
2. Keep listing validation separate from star generation; sharing a connection solely to save two seconds adds unnecessary coupling.
3. Preserve the curated-row independence check as repeatable regression evidence supporting the revised correction workflow.

## Revision notes

**MUST-FIX**
- **Fable 1 + Astra 2, deterministic results: resolved.** Q2's table states each block's total `ORDER BY` with its proof; Target design 2 refuses more than one row without an `ORDER BY` at paren depth 0. Q2's "Same text on both engines" covers scalars: an allow-list of four types, enforced, and all 7 texts byte-identical in Node and Baseline's WASM engine. One premise corrected: Node isn't multi-threaded here (`scripts/build/duckdb.ts:14`, `threads: "1"`). The rule stands anyway.
- **Fable 2, copy gate clause: resolved** (Target design 5), and Astra SC1 with it: reader pages may use the words throughout. The literal rule holds: 0 matches today, so no page must change. Narrower than asked in one place: e4 may use the words only in `e4-list-rows.sql`, not in `e4.html`, which follows Fable SC4 and `AGENTS.md:69`'s text. Wider in one: the scan adds `curriculum.json` and other pages' block text, both printed on pages, both 0 matches.
- **Fable MISSED 1 + Astra 1, guard fails closed: resolved** (Target design 2). The check reads every block of every engine and status, before the db load, in both modes. Testing went further than the review: globs and a concatenated literal reach registered files in WASM, so those are refused too, along with `-- after:` chains on a listing block. Limit stated under Open risks.
- **Fable MISSED 2, replacement copy: resolved** (Finding 6, Target design 1). Exact text given; `setup.sql` stays byte-identical. `schema-schema.html:3` needs no edit, a correction to Finding 6.

**SHOULD-CONSIDER**
- **Fable SC1 against Astra SC2: Astra's taken, separate session.** The star's tables would make the guard's session differ from a browser's, and the saving is 0.5 s, measured, not 2 s.
- **Fable SC2: taken** (Q6, Q1). Verified at `page.ts:59`.
- **Fable SC3: taken** (Q2 rules). The wording follows the query; the count is 94 even for MDD alone, so no number depended on it.
- **Fable SC4: taken** (Q2 rules, Target design 5).
- **Fable SC5: taken, with its reason corrected** (Target design 6). `range-conflicts.json` belongs in the expected diffs, but it holds no spiny softshell row: its 2 conflicts have no curated row and stay, and an empty curated file adds `range-not-found` entries instead.
- **Astra SC3: taken, more strongly than asked.** The one-off proof becomes a pass at every build (the mammal pass), and the one-off stays for the file list. A curated-rows-only pass was tried and rejected: it misses docs' whole-file query.

**Also corrected while verifying**
- `f3-ex-listed`'s fourth row is "United States of America".
- The first draft's R21 couldn't run in the harness (Finding 7).

## Steps

Written on `9612822`. Read **Architecture** as revised first: block texts, guard rules, copy and recipes live there, not here. `E1`–`E7` are under Verification, `F1`–`F12` under Failure modes, `R21`–`R29` in S7. Paths use `S=/srv/critter-ai/agent-state/missions/critwire-learn-range-lessons`.

**Every step:**
- Ends with, one at a time: `pnpm typecheck && pnpm test && pnpm build` (plain), `pnpm learn:port --check all`, the byte check. No lint script exists; typecheck is the static check.
- **Byte check** (S1 creates `$S/baseline-html/`, because the hash list holds no text):
  ```
  norm() { sed -E 's/app-[A-Z0-9]+\.js/app-HASH.js/g; s/Checked [0-9-]{10} on /Checked DATE on /' "$1"; }
  moved=$( (cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | diff $S/dist-baseline.sha256 - | grep '^[<>]' | awk '{print $3}' | sort -u)
  echo "$moved" | grep -vE '\.html$|/learn/assets/app-[A-Z0-9]+\.js$'
  for f in $(echo "$moved" | grep '\.html$'); do cmp -s <(norm $S/baseline-html/$f) <(norm dist/$f) || echo "$f"; done
  ```
  It prints exactly these lines. A page outside them differs by more than the bundle's name and the checked date: find out why.

  | After | Lines |
  |---|---|
  | S1, S2 | `./learn/data/manifest.json`, `./learn/data/index.html`, `./learn/setup/index.html` |
  | S3 | adds `./learn/foundations/join/index.html` |
  | S4 | adds `./learn/spatial-statistics/bias/index.html` |
  | S5 | adds `./learn/database-architecture/normalize/index.html` |
  | S6 on | adds `./learn/labs/e4.sql`, `./learn/etl/quality-provenance/index.html` |
- **Off limits:** `scripts/learn/`, `scripts/learn-check.ts` and `scripts/build/learn/sql.ts` (the checker's closure: one byte stales all 189 labs), `data/`, `contracts/`, `db/`, `site/learn/sql/setup.sql`, `site/learn/curriculum.json`, `site/learn/erd/`, existing block files and results. Held work too: PR #17, `data/review/country-overrides.json`. "lab … is stale" before S6 means something here moved: revert it, never `learn:check --update`.
- **E2E artifacts:** `E2E_ARTIFACTS=$S/e2e-s<N>`, never the in-repo default. A full run is about 840 MB and 11 min; about 7.5 GB free. Before writing one: `rm -rf $S/e2e-baseline $S/e2e-s*`. Bash timeout 1800000 ms for a full E2E, a whole `learn:check` and the refusals harness.
- **New browser block, in this order:**
  1. `site/learn/sql/<id>.sql`: `-- q: <id>`, `-- status: ran`, d2-list's comment, then Q2's text. Its slot in the page.
  2. `pnpm build --draft 2>&1 | tee $S/s<N>-draft.log`: the guard warns with the rendered result of each block with no snapshot. Row count and hash must equal Q2's table. A difference is a bug to find, not a number to take.
  3. In 004, at the block's place on the page: a `sql` fence holding the file, byte for byte, then a `text` fence holding the rendered result, byte for byte; then the prose.
  4. `pnpm learn:port <page>` seeds `e2e/__snapshots__/<id>.txt`.
  5. Page prose. One `QA_FIXES` row per quoted number (`e2e/qa-fixes.ts`, ids `RL<n>`, `from` the recorded file). Quote only what that file shows: a row count, or its first 5 rows.
- **A reader page's copy** (d2, f3, s1): holds this line, exactly:
  ```html
  <p>On this page, native, introduced and range words describe only <code>/v1/range-listings</code> rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range.</p>
  ```
  Each page defines MDD once and links `/#licenses`. Every listing is a named source's claim. No row means critwire holds no open listing, and a listed country with no record shows nothing either way. No IUCN data, no Wikipedia prose, no mission names. Own words, for adults new to the topic.
- **A deviation from 007 or Architecture:** edit it in the same commit, with a Decisions line.

- [x] S1. **The file reaches the engine by name.** Most enabling: every block needs it, and every page's boot changes.
  - First: `mkdir -p $S/baseline-html && rsync -a --prune-empty-dirs --include='*/' --include='*.html' --exclude='*' /srv/apps/critwire/.live/ $S/baseline-html/`, then `(cd $S/baseline-html && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | diff - <(grep '\.html$' $S/dist-baseline.sha256)` prints nothing.
  - E1 first, in `e2e/learn-browser.spec.ts` beside the Reset test: playground, `SELECT count(*) AS n FROM read_parquet('range-listings.parquet')` equals `rows.length` of `data/range-listings.json`; Reset database; same again. Seen failing: `E2E_ARTIFACTS=$S/e2e-s1 pnpm exec playwright test e2e/learn-browser.spec.ts -g "range-listings"`.
  - Files: `scripts/build/learn/data.ts:80` (`V1_INPUTS`), `site/learn/src/engine.ts` (`DATA_FILES`; comments `:4,24,88`), `scripts/build/learn/dist-fixture.ts` (`writeRangeListings(derived.listings.file.rows, new URL("v1/", out))`), `site/learn/pages/setup.html:16`, `plans/004-learn-curriculum.md:475`, `site/learn/data/index.html:38` (all copy: Target design 1), `e2e/qa-fixes.ts` (`RL1` on `/learn/setup/`, `RL2` on `/learn/data/`, one header line).
  - Verified: the common checks; full `E2E_ARTIFACTS=$S/e2e-s1 pnpm e2e`: 167 pass.
  - Proves: boot fetches, pins and registers a fifth file on every page, and keeps it across Reset. The plain build passing with no `learn:check` proves 0 of 189 lab keys moved.

- [x] S2. **The guard.** Riskiest logic: a fault either blocks a deploy or lets a false lesson go live. No listing block exists yet, so it's proved in isolation, F1–F12 first, in the test file's header, seen failing (pattern: `scripts/build/learn/star.test.ts:1-8`, its `edited` helper and `withDist`).
  - Files: `scripts/build/learn/listing-blocks.test.ts` (first), `scripts/build/learn/listing-blocks.ts` (new: `listingBlocks`, `assertListingBlocks`, Target design 2), `scripts/build/learn/star.ts` (export `asResult`), `scripts/build/learn/site.ts:62` (`LearnInputs.listings`; its `errors` into `all`), `scripts/build.ts` (after `writeStar`; one log line naming the count), `AGENTS.md` (build line: the refusal; `Listings:` rule beside "Raster:"; "Correcting a curated row"; "Cost of a species change"; texts in Q3, Q6), `plans/007-native-ranges.md` (`## Learn tie-in`: the guard).
  - `assertListingBlocks` takes `recorded` as a map, as `writeStar` does, so its tests need no file; `scripts/build.ts` reads it from `SNAPSHOT_DIR`. A one-parameter change to Target design 2's signature: Decisions line.
  - Verified: F1–F12 pass; the common checks; byte check as S1, so no E2E.
  - Proves: every refusal, on synthetic blocks over real published files; a build with 0 listing blocks is unchanged. S7 repeats the refusals through the real CLI.

- [x] S3. **f3 and the copy gate.** First real reader, so the whole chain runs once.
  - E5 first, in `e2e/learn-labs.spec.ts` (Target design 5), with `READERS = ["f3"]`; S4 and S5 grow it.
  - Blocks: `f3-listed-no-records` (Lab step 1, same `<li>`, after `f3-no-countries`), `f3-ex-listed` (`{{exercise:…}}` under Exercise; the prose says how to read the file). Follow the browser-block order above; `f3-ex-listed`'s snapshot shows once its answer is right.
  - Files: `plans/004-learn-curriculum.md` (`#### f3 · join`), `site/learn/sql/{f3-listed-no-records,f3-ex-listed}.sql`, their `e2e/__snapshots__/*.txt`, `site/learn/modules/f3.html`, `e2e/learn-browser.spec.ts` (first id in the first `seen`, second in the exercise `seen`; `WRONG["f3-ex-listed"]`: the answer without `l.speciesId = sc.species_id`, `hint: "Your result has 0 rows; the answer has 4."`), `e2e/qa-fixes.ts` (`89 rows`; 4 countries if quoted), `AGENTS.md` copy rule (Q3), `plans/007-native-ranges.md` (f3 gains a lesson block; `AGENTS.md:68` is `:69`).
  - Verified: the common checks; hashes `d0d87c462f63`, `b70a76ec0dab`; `E2E_ARTIFACTS=$S/e2e-s3 pnpm exec playwright test e2e/learn-browser.spec.ts e2e/learn-labs.spec.ts e2e/learn-walk.spec.ts` (about 8 min).
  - Proves: the guard passes a real block; data = snapshot = browser (E2); a wrong answer is refused (E3); prose = result (E6); the copy gate holds (E5).

- [x] S4. **s1: records against listings.** The brief's main lesson.
  - Blocks: `s1-listed`, `s1-listed-species`, `s1-listed-conflicts`: one new `<li>` after the devil's, marked as running in the browser. Lead and Result gain a sentence each: the lead says "first part", so name this step too. `s1.html:19` stays.
  - Prose: `on_no_listing` as "on no listing from any source". The rhino's conflict shows both claims with their sources and resolves nothing. The axolotl's conflict in Germany isn't shown here: link `/#range-listings`, whose query lists all animals.
  - Files: `plans/004-learn-curriculum.md` (`#### s1 · bias`), `site/learn/sql/s1-listed{,-species,-conflicts}.sql`, their snapshots, `site/learn/modules/s1.html`, `e2e/learn-browser.spec.ts` (`seen`), `e2e/qa-fixes.ts` (364, 275, 75.5, 89, 379, 94 from `s1-listed`; each other number quoted), `e2e/learn-labs.spec.ts` (`READERS` adds `s1`).
  - Verified: the common checks; hashes `157fdfaf5ca5`, `4b230741b745`, `9557e3eb4326`; same three specs, `E2E_ARTIFACTS=$S/e2e-s4`.
  - Proves: the brief's comparison on real data, with its source and its conflict on the page.

- [x] S5. **d2: origin and presence as two facts.** Small: one block.
  - Block: `d2-listing-facts`, in the Worked example, after `d2-provenance`'s paragraph. Prose: `native` with `absent` is why these are two columns. d1 stays out (Q4).
  - Files: `plans/004-learn-curriculum.md` (`#### d2 · normalize`), `site/learn/sql/d2-listing-facts.sql`, its snapshot, `site/learn/modules/d2.html`, `e2e/learn-browser.spec.ts` (`seen`), `e2e/qa-fixes.ts` (364, 36, 7, 6, 3), `e2e/learn-labs.spec.ts` (`READERS` becomes `["d2", "f3", "s1"]`, final).
  - Verified: the common checks; hash `2ab668eb6f13`; same three specs, `E2E_ARTIFACTS=$S/e2e-s5`.
  - Proves: the gate's final reader list against the build's own detector.

- [x] S6. **e4: made-up lists.** The one lab change, so the one whole `learn:check` before Verification.
  - Block: `e4-list-rows`, a new `<li>` after quarantine (Q2 rows and rules): inline `VALUES`, `row_no` 1–5, `ORDER BY row_no`; made-up animal, codes `XA`, `XB`, lists `List A`, `List B`, `List C`, `Catalogue D`. Three kept, two of which disagree and both stay; one dropped by CC BY-NC; one open, well-formed row dropped for its catalogue's lack of a role.
  - Prose: no filter on license or a field's value catches the last row, only a person's check of the whole list; link `/#range-listings`. No count of real datasets. `e4.html` never holds "native" or "introduced" (E5 fails if it does); neither does it read the file, so no added line.
  - Order: block file and slot; `pnpm build --draft`; `pnpm learn:check --module e4` prints the result; 004's fences (`#### e4 · quality-provenance`); `pnpm learn:port e4` seeds `checked/e4-list-rows.txt`; prose and `RL` rows; then `pnpm build --draft && pnpm learn:check 2>&1 | tee $S/s6-learncheck.log && pnpm build`.
  - Plain `learn:check`, not Q6's `--update`: 004 already seeded the one new result, so any of the other 189 moving fails the run, and a whole run still writes `checked.json`. Decisions line.
  - Files: `plans/004-learn-curriculum.md`, `site/learn/sql/e4-list-rows.sql`, `site/learn/labs/checked/{e4-list-rows.txt,checked.json}`, `site/learn/modules/e4.html`, `e2e/qa-fixes.ts`, `plans/007-native-ranges.md` (e4's row loses "44 of the 88 datasets": no committed file holds it).
  - Verified: the common checks; once committed, the two result checks under Verification (`git diff --name-status`, `checked.json`); full `E2E_ARTIFACTS=$S/e2e-s6 pnpm e2e`, because `checked.json`'s new date moves `.checked` on all 28 lab pages (the byte check normalizes that date).
  - Proves: 189 results byte-stable; the new block's result on the page equals what PostGIS gave (E4).

- [x] S7. **Refusals and the curated recipe, on real files.**
  - `e2e/range-listings-refusals.ts` (Target design 6): `RESTORED` adds `site/learn/sql`, `e2e/__snapshots__`; header gains the second shape; a case flag lifts the db-load failure (`:198`); another lets `--draft` pass (R29); after the last case, `pnpm build`, then the hash check (`:208`). `AGENTS.md`'s harness line: its new "Interrupted" list.
  - Each message is pinned with the doctored block's id:

    | Case | Shape | File | Doctor | Refused for |
    |---|---|---|---|---|
    | R21 | static | `f3-listed-no-records.sql` | `FROM 'range-listings.parquet'` | another form of the name |
    | R22 | static | `e4-checks.sql` | the name in a comment | same, PostGIS |
    | R23 | static | `e1-checksum.py` | the name in a comment | same, Python |
    | R24 | static | `d2-list.sql` | `read_parquet('spec*.parquet')` | a glob |
    | R25 | static | `s1-ex.sql` | `-- after: s1-listed` | a chain. `s1-ex` is the one later non-listing block on the page; an earlier one only fails lint |
    | R26 | guard | `f3-listed-no-records.sql` | drop `ORDER BY` | order |
    | R27 | guard | `d2-listing-facts.sql` | drop the class filter | mammal scope |
    | R28 | guard | `s1-listed.sql` | add a list cell | cell type |
    | R29 | guard | `e2e/__snapshots__/s1-listed.txt` | one byte | plain: refused with the diff; `--draft`: warns, passes |
  - Verified: commit first (the harness refuses a dirty tree), then `pnpm build && pnpm exec tsx e2e/range-listings-refusals.ts 2>&1 | tee $S/refusals.log`: last line `33 cases, 0 failed; tree clean, dist/ unchanged`. Then the curated proof under Verification, once. If an unrelated check refuses `[]`, follow Architecture's Open risks and record it. Typecheck; byte check as S6. The plan's Log goes in a second commit.
  - Proves: the guard through the real CLI in both modes; a curated correction moves no lesson and needs no `learn:check`.

- [x] S8. **Live smoke, rehearsed locally.**
  - `e2e/release/live.spec.ts`: one new test beside `:61`, one header line. For f3 (`f3-listed-no-records`), s1 (`s1-listed`) and d2 (`d2-listing-facts`): the page answers 200, the block runs, its result equals its snapshot. For e4: 200, and `#q-e4-list-rows pre.recorded` equals `checked/e4-list-rows.txt`.
  - Dry run, on the plain build:
    ```
    mkdir -p $S/e2e-s8
    CRITWIRE_DIST=$PWD/dist CRITWIRE_FIXTURES=$PWD/e2e/fixtures E2E_ARTIFACTS=$S/e2e-s8 caddy run --config e2e/Caddyfile --adapter caddyfile   # in the background; stop it after
    curl --retry 20 --retry-connrefused --retry-delay 1 -fsS -o /dev/null http://127.0.0.1:3100/
    RELEASE_ORIGIN=http://127.0.0.1:3100 E2E_ARTIFACTS=$S/e2e-s8 pnpm exec playwright test -c playwright.release.config.ts
    ```
  - Verified: the common checks; all pass; `ss -ltn` shows nothing left on 3100 or 3101.
  - Proves: the release smoke works before the release needs it, `RL` rows included.

**Risks and open questions, beyond Architecture's Open risks:**
- `e4-list-rows`' result doesn't exist until S6: Q2 fixes its shape, not its hash.
- Rebasing at release can move results if `origin/main` changed data. The guard or `learn:check` names what moved; put it in 004, the snapshot and the prose, then re-run Verification.
- Disk: S1, S6 and the final run each write about 840 MB, and the release re-verifies. Hold to the deletion rule above.
- `AGENTS.md` line numbers shift as S2 and S3 edit it: match by text.

## Verification

**E2E scenarios** (Playwright, headless Chromium, local Caddy copy of the live block; `pnpm e2e` runs all):
- **E1** `e2e/learn-browser.spec.ts`, new: `range-listings.parquet` resolves by name in the browser, before and after Reset.
- **E2** `e2e/learn-browser.spec.ts:273`: every browser block equals its snapshot, the 5 new lesson blocks in `seen`.
- **E3** `e2e/learn-browser.spec.ts`, exercise test: `f3-ex-listed` refuses `WRONG`, accepts its answer, result = snapshot.
- **E4** `e2e/learn-labs.spec.ts:98`: `#q-e4-list-rows pre.recorded` = `checked/e4-list-rows.txt`.
- **E5** `e2e/learn-labs.spec.ts`, new: the copy gate. `listingBlocks`' pages are exactly d2, f3, s1; each holds the line; `\b(native|introduced)\b` nowhere else in sources but `e4-list-rows.sql`.
- **E6** `e2e/learn-walk.spec.ts:122`: `QA_FIXES` on dist; every `RL` row's text on its page, its numbers in its recorded file.
- **E7** the rest of the suite, unchanged.

**Order, on the final commit, clean tree, one at a time:**
```
S=/srv/critter-ai/agent-state/missions/critwire-learn-range-lessons; A=$S/e2e-final
git fetch -q origin main
pnpm typecheck 2>&1 | tee $S/final-typecheck.log
pnpm test 2>&1 | tee $S/final-test.log
pnpm learn:port --check all 2>&1 | tee $S/final-port.log
pnpm build 2>&1 | tee $S/final-build.log
pnpm learn:check 2>&1 | tee $S/final-learncheck-1.log
pnpm learn:check 2>&1 | tee $S/final-learncheck-2.log
git status --porcelain
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) > $S/dist-final.sha256
# the byte check, under Steps
git diff --name-status origin/main...HEAD -- site/learn/sql e2e/__snapshots__ site/learn/labs/checked | grep -v '^A'
git diff --name-status origin/main...HEAD -- site/learn/sql e2e/__snapshots__ site/learn/labs/checked | grep -c '^A'
node -e 'const a=JSON.parse(require("child_process").execSync("git show origin/main:site/learn/labs/checked/checked.json"));const b=require("./site/learn/labs/checked/checked.json");const d=[];for(const k of ["blocks","downloads"])for(const i of new Set([...Object.keys(a[k]),...Object.keys(b[k])]))if(JSON.stringify(a[k][i])!==JSON.stringify(b[k][i]))d.push(k+"."+i);for(const k of ["versions","labErd"])if(JSON.stringify(a[k])!==JSON.stringify(b[k]))d.push(k);console.log(d)'
rm -rf $S/e2e-baseline $S/e2e-s* $A
E2E_ARTIFACTS=$A pnpm e2e 2>&1 | tee $S/final-e2e.log
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | cmp - $S/dist-final.sha256
node -e 'const s=require(process.argv[1]).stats;console.log(s);process.exit(s.unexpected||s.skipped||s.flaky?1:0)' $A/results.json
pnpm exec tsx e2e/range-listings-refusals.ts 2>&1 | tee $A/refusals.log
# curated proof: the correction recipe at its worst
printf '[]\n' > data/review/range-curated.json
pnpm derive 2>&1 | tee $S/curated-derive.log
pnpm build 2>&1 | tee $S/curated-build.log
git status --porcelain
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | diff $S/dist-final.sha256 - | grep '^[<>]' | awk '{print $3}' | sort -u
git checkout -- data
pnpm build 2>&1 | tee $S/final-build-2.log
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | cmp - $S/dist-final.sha256
# scope
git diff --name-only origin/main...HEAD -- data contracts db scripts/learn scripts/learn-check.ts scripts/build/learn/sql.ts site/learn/sql/setup.sql site/learn/curriculum.json site/learn/erd
git diff origin/main...HEAD -- site/learn | grep -iE '^\+.*(iucn|wikipedia)'
git status --porcelain
```

**Must show:**
- Typecheck exit 0. Test: `fail 0`, more than Baseline's 811 pass. `learn:port --check`: exit 0.
- Build: exit 0, no `--draft`; log names 6 listing blocks; `dist/learn/data/` about 96.03 MB (Baseline's 96,026,558 B plus the manifest's new entry and one copy edit, under 1 KB), under the cap; committed lab data 18,822,906 B.
- `learn:check`, both runs: last line `learn:check: ok`; `unchanged: site/learn/labs/checked/checked.json`; 25 `.sql` and 11 `.py` download lines. `git status` empty after.
- **Byte check:** exactly the 8 lines of "S6 on": `./learn/data/manifest.json`, `./learn/labs/e4.sql`, and 6 pages. `dist-final.sha256` has 314 lines. `v1/**`, `index.html` and the rest of `learn/data/**` are identical.
- **Results stable:** the first `git diff` prints only `M site/learn/labs/checked/checked.json`; the count prints 14 (7 block files, 6 snapshots, `e4-list-rows.txt`). The `node` line prints `[ 'blocks.e4-list-rows', 'downloads.e4.sql' ]`.
- **E2E:** `results.json` `unexpected` 0, `skipped` 0, `flaky` 0, `expected` at least 168 (Baseline's 166, E1, E5). `cmp` silent: E2E changed nothing.
- **Refusals:** every case `PASS` in both modes; last line `33 cases, 0 failed; tree clean, dist/ unchanged`.
- **Curated proof:** derive and build pass with no `learn:check`. `git status`: exactly ` M data/range-listings.json`, ` M data/review/range-conflicts.json`, ` M data/review/range-curated.json`. Hash diff: exactly `./index.html`, `./learn/data/manifest.json`, `./v1/attribution.json`, `./v1/range-listings.csv`, `./v1/range-listings.json`, `./v1/range-listings.parquet`. After restoring: `cmp` silent.
- **Scope:** the last three commands print nothing.
- `pnpm test:db` isn't run: not in the Definition of done, and no `*.dbtest.ts`-covered code changes. If a step changes that, add it here.

**Artifact:** `$S/e2e-final/`: `playwright-report/`, `test-results/` (traces, screenshots), `results.json`, `refusals.log`. Beside it: `$S/final-*.log`, `$S/curated-*.log`, `$S/dist-final.sha256`. The brief names no folder, so this one takes that role in the disk rule: never delete it. Reproduce: `pnpm install --frozen-lockfile && pnpm learn:venv && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

**Definition of done, line by line:**

| Brief | Check |
|---|---|
| `typecheck`, `test`, `build`, `e2e` pass; `learn:check` twice | The commands above |
| Every new block ran, result recorded and shown | The six browser blocks: guard at every plain build, E2, E3. `e4-list-rows`: `learn:check` twice, E4. File count: 14 |
| A prose number on a changed page matches its block | E6, on dist; `QA_FIXES` on the origin. Also list `git diff origin/main...HEAD -- site/learn/modules \| grep '^+' \| grep -oE '[0-9][0-9,.]*' \| sort -u`: each number has an `RL` row, or is the copy line's 1500 or a link's own |
| Live smoke after `deploy` | Release smoke, below |
| Summary: per module, exact wording | Summary holds f3, s1, d2, e4 and the setup and data pages' copy; the line as published; `AGENTS.md`'s copy rule; that e4 doesn't read the file and why; that d1 stayed out |
| Show the source, show conflicts | `s1-listed-conflicts`: both claims with source and url (E2); prose resolves nothing (S4) |
| At most 12 steps | 8 |
| Out of scope: `/v1`, new data, IUCN, held work | Byte check, scope commands; `git diff --name-only origin/main...HEAD -- data/review/country-overrides.json` prints nothing |

**Release smoke,** after `deploy critwire`, with `dist/` the released commit's build. Delete `$S/e2e-s*` first; `$S/e2e-final/` stays.
```
for u in /learn/foundations/join/ /learn/spatial-statistics/bias/ /learn/database-architecture/normalize/ /learn/etl/quality-provenance/ /learn/setup/ /learn/data/ /learn/data/manifest.json /learn/labs/e4.sql /v1/range-listings.parquet; do curl -fsS -o /dev/null -w "%{http_code} $u\n" https://critwire.com$u; done
curl -fsS https://critwire.com/v1/range-listings.parquet | sha256sum
node -e 'console.log(require("./dist/learn/data/manifest.json").inputs.v1["range-listings.parquet"].sha256)'
RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=$S/e2e-release pnpm exec playwright test -c playwright.release.config.ts
```
Nine lines of `200`; the two hashes equal; `e2e/release/live.spec.ts` all pass. Its new test is the Definition of done's smoke: each changed page answers 200, and its first new block shows the recorded result in headless Chromium. `QA_FIXES` on the origin covers the `RL` rows; "every dist/ file is served with dist's bytes" covers the rest.

## Failure modes

The guard alone is tested in isolation: at S2 no listing block exists to push through a real build, and a fault either blocks a deploy or publishes a false lesson. These go in the header of `scripts/build/learn/listing-blocks.test.ts`, as tests, before the code. S7 proves the same refusals through the real CLI.

`listingBlocks`, in both modes, before the db load:
- **F1. Another form of the name reads the file unguarded:** `FROM 'range-listings.parquet'`; double quotes; `parquet_scan('range-listings.parquet')`; a list argument; a URL; `.csv`; `.json`; a table named `range_listings`; Python's `f"{BASE}/v1/range-listings.parquet"`; a comment; `READ_PARQUET('range-listings.parquet')`. Each refused, naming the block.
- **F2. The file is reached without its name:** `read_parquet('*.parquet')`; `read_parquet('spec*.parquet')`; `read_parquet('spe' || 'cies.parquet')`; `parquet_scan(x)`; `FROM '*.parquet'`. Each refused, on a block of any engine.
- **F3. A listing block isn't plain:** engine PostGIS, Python or Power BI; status other than `ran`; `-- after:`; `-- expect:`; two statements; not `readsOnly`. Each refused.
- **F4. A chain hides the dependency:** another block's `-- after:` names a listing block. Refused, naming both.
- **F5. A false positive blocks the course:** the real course gives `errors: []`; `read_parquet('species.parquet')` and its named parameters pass.
- **F6. The wrong page is named:** each block comes back with its page, which the copy gate relies on; the supported spelling is the one thing recognized as a listing block.

`assertListingBlocks`, on real published files through `withLabTables`:
- **F7. The block doesn't run in a browser's tables:** a SQL error, or a star table such as `dim_species`, refuses in both modes, naming the block, never a bare DuckDB error.
- **F8. A cell the two engines render differently:** LIST, STRUCT, ENUM, DECIMAL, DATE or BOOLEAN refuses in both modes; VARCHAR, INTEGER, BIGINT and DOUBLE pass.
- **F9. Row order isn't the query's own:** more than one row and no `ORDER BY` at paren depth 0 refuses in both modes. `OVER (ORDER BY a)`, `string_agg(a ORDER BY a)`, a CTE's `ORDER BY`, and `ORDER BY` inside a string or a comment don't count. `… ORDER BY a LIMIT 3` passes, and so does one row with none.
- **F10. A curated correction would move the lesson:** an unscoped count, an origin-by-presence table with no class filter, and docs' whole-file conflict query each refuse in both modes, with "reads non-mammal rows". A block filtered on MDD or `Mammalia` passes.
- **F11. The result differs from its snapshot:** plain throws with `lineDiff`, `--draft` warns and passes. A missing snapshot does the same and prints the rendered result. An equal one is silent.
- **F12. One failure hides another, or the guard leaves a mess:** every failure of every block is named in one error; the session closes after a failure; 0 blocks passes; nothing under `dist/` changes.

## Code review (Astra)

## Release

## Decisions

- S1: also edited `plans/004-learn-curriculum.md`'s manifest `inputs` line and `data.ts`'s `inputs` comment. Both said `v1` holds only the files the lab tables are built from, which the pin makes false; Finding 6 missed them.
- S2: `assertListingBlocks(out, blocks, { recorded, draft })`: `recorded` is a map, as `writeStar`'s, so its tests need no file; `readSnapshots` in the same module fills it for `scripts/build.ts`.
- S2: Target design 2's reader regex corrected: with `\s*` outside the lookahead, it backtracked past the space and refused `read_parquet( 'species.parquet' )`. Now `\((?!\s*'…'\s*[,)])`. F5's own spaced case found it; no course block is spelled that way.
- S3: `f3-ex-listed` sits after `f3-not-in`, so `f3-ex`, its answer note and the `NOT IN` trap stay together. f3's lead gains "and one published file" (the blocks no longer read only the Schema page's tables); its Result gains one sentence with the 89.
- S3: 007's copy rule cites `AGENTS.md`'s Learn rules, not a line number (S3's `:69`): S2 and S3 edit that file, so a number goes stale.
- S4: 007's s1 row said one block; Q2 has three (the numbers, per animal, the conflict, so a source's disagreement is shown), so 007 now says three. Prose says MDD's rows are all native or introduced before 1500: of MDD's 400 rows, 364 present and 36 uncertain, all that origin (checked on `data/range-listings.json`).
- S5: d2's lead says "published files" (it now reads two). Prose also says neither column fixes the other, and names the source of the 6 `native` + `absent` rows (Central Asia checklist, checked on `data/range-listings.json`); per the contract it says nothing about why or since when. Its Result gains one sentence.
- S1: Q1's "`dist/learn/data/` stays 96,026,558 B" holds for the manifest's own `bytes` (95,877,990, unmoved: it counts `files` only). The build's logged total, which counts `manifest.json` and `index.html`, is 96,026,726: +168 B from the pin and the copy edit.
- S6: plain `learn:check`, not Q6's `--update`: 004 had seeded the one new result, so any of the other 189 moving would fail the run; a whole run still writes `checked.json`. `e4.html` holds neither word: row 5 is worded "came from elsewhere to XA, the place List A says it comes from". Lead and Result each gain one clause. 007's row loses "44 of the 88".
- S7: curated proof compared against this step's own hash list (`$S/dist-s7.sha256`), since `dist-final.sha256` is written only at Verification. `[]` accepted, so Open risks' fallback wasn't needed. R26 also trips the mammal pass in both modes (2 faults under `--draft`): with no `ORDER BY`, the wrapped query's row order moves. Its pinned message still names the order fault.

## Log

- 2026-11-02 00:43 UTC: Baseline: typecheck pass, test 811/811, build pass, E2E 166/166; dist equals live; listings live.
- 2026-11-02 00:55 UTC: Architecture written: browser blocks read `/v1/range-listings.parquet` by name, 7 new blocks (f3, s1, d2, e4), new build guard, copy gate; candidate queries ran on Baseline `dist/`, nothing built yet.
- 2026-11-02 01:00 UTC: Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (total ORDER BY on listing blocks + guard; copy gate clause), for Revision; Q2 numbers recomputed by reviewer from Baseline `dist/`; no code touched.
- 2026-11-02 01:01 UTC: Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (guard fails closed on other spellings; deterministic cross-engine results), for Revision; no code touched.
- 2026-11-02 01:17 UTC: Revision: all 4 MUST-FIX resolved in Architecture (total ORDER BY + guard, copy gate scope, fail-closed detector, replacement copy); 6 blocks + WRONG query byte-identical Node vs Baseline WASM; no code touched.
- 2026-11-02 01:30 UTC: Steps: planner wrote 8 steps (limit 12), Verification, Failure modes (guard F1-F12); named paths checked; no code touched.
- 2026-11-02 01:47 UTC: S1: `range-listings.parquet` fetched, pinned, registered by name on every page; E1 seen failing, then passing. typecheck pass, test 811/811, plain build pass with no `learn:check`, port check 538 files equal, byte check exactly the 3 expected lines, E2E 167/167 (`$S/e2e-s1`).
- 2026-11-02 02:02 UTC: S2: guard `listing-blocks.ts` in the build, 0 listing blocks yet. F1-F12 seen failing on a stub (11 of 12; F5 can't fail on a stub's empty errors, and later caught the regex bug), then all pass. typecheck pass, test 823/823 (811 + 12), plain build pass with no `learn:check`, port check 538 files equal, byte check exactly the 3 expected lines. No E2E, per the step.
- 2026-11-02 02:18 UTC: S3: f3 reads the listings (`f3-listed-no-records`, `f3-ex-listed`), copy line on the page, `AGENTS.md` copy rule, copy gate E5 seen failing then passing. Hashes `d0d87c462f63`, `b70a76ec0dab` as planned. typecheck pass, test 823/823, plain build pass (2 listing blocks), port check 542 files equal, byte check exactly the 4 expected lines, three specs 83/83 (`$S/e2e-s3`).
- 2026-11-02 02:34 UTC: S4: s1 compares records with listings (`s1-listed`, `s1-listed-species`, `s1-listed-conflicts`), copy line on the page, `READERS` adds s1. Hashes `157fdfaf5ca5`, `4b230741b745`, `9557e3eb4326` as planned. typecheck pass, test 823/823, plain build pass (5 listing blocks), port check 548 files equal, byte check exactly the 5 expected lines, three specs 83/83 (`$S/e2e-s4`).
- 2026-11-02 02:49 UTC: S5: d2 reads the listings (`d2-listing-facts`), copy line on the page, `READERS` final `["d2", "f3", "s1"]`. Hash `2ab668eb6f13` as planned. typecheck pass, test 823/823, plain build pass (6 listing blocks), port check 550 files equal, byte check exactly the 6 expected lines, three specs 83/83 (`$S/e2e-s5`).
- 2026-11-02 03:18 UTC: S6: e4 `e4-list-rows` (5 rows, hash `a4db17261e6f`), whole `learn:check` ok, 189 results unmoved (`checked.json` diff: `blocks.e4-list-rows`, `downloads.e4.sql`, date; 14 added files). typecheck pass, test 823/823, plain build pass (6 listing blocks), port check 552 files equal, byte check exactly the 8 expected lines, E2E 168/168 (`$S/e2e-s6`).
- 2026-11-02 03:27 UTC: S7: harness adds R21-R29 (real block files, both modes); 33 cases, 0 failed, tree clean, dist/ unchanged (`$S/refusals.log`). Curated proof: `[]` derives and builds with no `learn:check`; exactly 3 `data/` files and the 6 expected `dist/` files moved; restored byte-identical. typecheck pass, test 823/823, plain build pass (6 listing blocks), port check 552 files equal, byte check exactly the 8 expected lines. No E2E, per the step.
- 2026-11-02 03:33 UTC: S8: release smoke adds f3, s1, d2 listing blocks + e4's recorded rows; dry run on plain build against local Caddy 9/9 (`$S/e2e-s8`, `$S/s8-e2e.log`), `RL` rows included, nothing left on 3100/3101. typecheck pass, test 823/823, plain build pass, port check 552 files equal, byte check exactly the 8 expected lines.

## Summary
