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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-02 00:43 UTC: Baseline: typecheck pass, test 811/811, build pass, E2E 166/166; dist equals live; listings live.
- 2026-11-02 00:55 UTC: Architecture written: browser blocks read `/v1/range-listings.parquet` by name, 7 new blocks (f3, s1, d2, e4), new build guard, copy gate; candidate queries ran on Baseline `dist/`, nothing built yet.
- 2026-11-02 01:00 UTC: Fable review: APPROVE_WITH_CHANGES, 2 MUST-FIX (total ORDER BY on listing blocks + guard; copy gate clause), for Revision; Q2 numbers recomputed by reviewer from Baseline `dist/`; no code touched.
- 2026-11-02 01:01 UTC: Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (guard fails closed on other spellings; deterministic cross-engine results), for Revision; no code touched.
- 2026-11-02 01:17 UTC: Revision: all 4 MUST-FIX resolved in Architecture (total ORDER BY + guard, copy gate scope, fail-closed detector, replacement copy); 6 blocks + WRONG query byte-identical Node vs Baseline WASM; no code touched.

## Summary
