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
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
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

All numbers below were run on this worktree's Baseline `dist/`, in Node DuckDB, over the published files (`withLabTables`).

### Findings, by impact

1. **The build can't see the listings file, so a refresh would publish false lessons (fail fast; 007 misses this).** `scripts/learn/freshness.ts:96-97,186` hashes only `manifest.files`; 007's path pins the file in `manifest.inputs.v1` (`scripts/build/learn/data.ts:74,80`). Browser results are compared only in `pnpm e2e` (`e2e/learn-browser.spec.ts:273`), and `deploy` runs only `pnpm build`. Today's browser blocks are covered indirectly: their tables are embedded in the loader (`loader.ts:268`), so a data change makes labs stale. The listings are the first browser input outside the loader. An `ingest mdd` or `ingest gbif-checklists` refresh would deploy with prose and snapshots disagreeing with the block. **Fix:** a build guard (Target design, 2).
2. **`AGENTS.md:100`, "Correcting a curated row", becomes false in two ways unless designed around.** (a) The pin moves `learn/data/manifest.json`, which the recipe doesn't list. (b) A block reading curated rows would move a lesson number on any correction, and H12 is open. **Fix:** every listing block is scoped to rows curated corrections can't touch (Target design, 3); edit the recipe.
3. **The copy rule has no gate.** Nothing scans pages for it; `e2e/docs.spec.ts:72` and `e2e/learn-labs.spec.ts:236` each check one phrase. Today `native` and `introduced` appear on no Learn page (`grep -i` over `site/learn/modules`, `pages`, `layout.html`, `curriculum.json`: 0 hits), so a gate costs nothing now and stops drift. **Fix:** one E2E test (Target design, 5).
4. **007's e4 number can't come from a block.** "44 of the 88 datasets met are CC BY-NC" is in no committed file: `data/raw/gbif-checklists/snapshot.json` keeps the 18 role datasets and `dropped` counts, no licenses for the rest. The Definition of done requires a prose number to match its block. **Fix:** e4 states no such number; 007's row is corrected in the same commit.
5. **Brief and 007 pull apart on e4.** "Three modules use the live file", but e4's rows are made up, and O4 changes wording only on pages reading the file. **Fix:** e4 doesn't read the file and doesn't get the added line. "Introduced" appears only as a term inside its made-up lists, with no real animal or country (Q3).
6. **Small things 007's path breaks.** "Four files" goes false at `site/learn/pages/setup.html:16` and `plans/004-learn-curriculum.md:475`; "species and countries files" at `site/learn/data/index.html:38`; `site/learn/pages/schema-schema.html:4` doesn't mention the file; `site/learn/src/engine.ts:4,24,88` comments. `scripts/build/learn/dist-fixture.ts:23-24` writes no listings file, so `data.ts:112` would throw in its tests. `AGENTS.md:68` in 007 is now `:69`.

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

**Existing results stay byte-stable, and it's provable:** `git diff --stat -- e2e/__snapshots__ site/learn/labs/checked` must show only new files plus `checked.json`, whose diff is limited to `blocks["e4-list-rows"]`, `downloads["e4.sql"]` and its date. Hash list against `dist-baseline.sha256`: `v1/**`, `index.html` and all of `learn/data/**` but `manifest.json` and `index.html` are identical; in `learn/labs/` only `e4.sql` differs. `learn/assets/` gets a new hashed bundle; pages differ only by its name, except the pages edited.

### Q2. Blocks

All `status: ran`. "Mammal scope" means `sourceKey = 'mdd'` or `species_taxonomy.class = 'Mammalia'`. Browser blocks carry d2-list's comment, `-- DuckDB only: reads the published file, not a learners' table`.

| Page | Block | Engine | Computes | Recorded result |
|---|---|---|---|---|
| f3, Lab step 1 | `f3-listed-no-records` | browser | Anti join on two columns: MDD `present` rows with no `species_countries` row. Columns: animal, country, origin, source | 89 rows; first `Aardvark \| Burundi \| native-or-pre-1500 \| Mammal Diversity Database` |
| f3, Exercise | `f3-ex-listed` | browser | `NOT EXISTS` on two columns: the Tiger's open-record countries on no listing | 4 rows: Brazil, Germany, South Africa, United States. `WRONG`: drop the species condition, 0 rows |
| s1, new Lab step 4 | `s1-listed` | browser | One row: source, listed, with_records, pct, no_records, record_countries, on_no_listing | `Mammal Diversity Database \| 364 \| 275 \| 75.5 \| 89 \| 379 \| 94` |
| s1 | `s1-listed-species` | browser | Per animal: source, listed, with_records, no_records; `ORDER BY no_records DESC, listed DESC, s.id` | 50 rows; first `Aardvark \| … \| 42 \| 19 \| 23` |
| s1 | `s1-listed-conflicts` | browser | Mammal rows on docs' conflict definition (`site/index.html`, `range-conflicts`), each claim with source and url | 2 rows: Black Rhinoceros, ZA: GRIIS South Africa `introduced`, MDD `native-or-pre-1500`. Prose resolves nothing and links the docs query for all animals |
| d2, Worked example | `d2-listing-facts` | browser | Mammal rows by origin and presence, with distinct sources | 5 rows: 364, 36, 7, 6, 3. `native` + `absent` is why origin and presence are two columns |
| e4, Lab, after quarantine | `e4-list-rows` | PostGIS | Inline `VALUES`: made-up lists and rows, each row kept or dropped by license, then by the list's role | 5 rows. Kept: 3, two of which disagree (both stay). Dropped: CC BY-NC by license; an open, well-formed row from a catalogue with no role, which marks the animal introduced in its home country |

Rules for these blocks:
- e4's rows use a made-up animal and codes no country has (`XA`, `XB`). The prose says a filter on license or on a field's value can't catch the last row, only a person's check of the whole list can, and links `/#range-listings`, which works that way. No count of real datasets.
- f3 follows 007 (one exercise) and adds a lesson block, because an exercise hides its result and the Definition of done needs one shown.
- f3 and s1 say no row means critwire holds no open listing, and a listed country with no record shows nothing either way.
- Each page defines MDD once and links `/#licenses`, where its IUCN tie is stated. No IUCN data, no Wikipedia prose.
- No list-typed cell: Node and the browser render lists differently (below).

### Q3. Copy rule

**The added line, on each reader (d2, f3, s1), 007's text word for word:**

> On this page, native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range.

The example is true: MDD lists the Black Rhinoceros in Kenya. `s1.html:19`, `p4.html:7`, `c1.html:35`, `map.html:11` and `schema-schema.html:4` stay as they are; s1's bullet is true of records.

**`AGENTS.md:69` becomes:**

> - Copy: records, never range; no mission names on public pages; link only pages that exist (planned modules unlinked). A page with a block reading `/v1/range-listings` (d2, f3, s1) adds, in the change that makes it read the file (owner O4, plan 007): "native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range." Elsewhere those words stay off Learn's pages, except inside e4's made-up lists.

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
| **Correcting a curated row (H12)** | **Recipe stays:** no `learn:check`, DOI, habitat or sample work, no result moves. A curated row on a mammal is refused (`scripts/derive/range-curated.ts:30`), and all 6 listing blocks are in mammal scope. Moves `v1/range-listings.*` and now `learn/data/manifest.json` (plus `attribution.json` and `index.html` if the row count does) |
| `ingest gbif-checklists` or `ingest mdd` moving a mammal row | No `learn:check`, DOI, habitat or sample work. **New:** plain build refuses, naming the block, until the new result is in 004, the snapshot and the prose, in one commit. So does `deploy` |
| `ingest gbif` or an override moving a published country | As today (`learn:check --update`, ≈ 1–2 h), and the guard names the listing blocks too. PR #17 was confirm-only and is merged; nothing moved |
| Species change | As today's ≈ 1 h chain, plus any re-recording the guard names |
| This mission, once | One whole `learn:check --update`, for e4's new block and `e4.sql` only. No DOI, habitat or sample work |

**`AGENTS.md:100` becomes:** "…`deploy critwire`. Moves only `v1/range-listings.*` and `learn/data/manifest.json` (the file's pin), plus `v1/attribution.json` and `index.html` if the row count does; no `learn:check`, DOI or sample work. Learn's listing blocks read mammals only, and a curated row can't be a mammal."

**`AGENTS.md:105`'s last sentence gains:** "If a refresh moves a listing block's result, plain `pnpm build` refuses: put it in 004, `e2e/__snapshots__/<id>.txt` and the page's prose, one commit."

`AGENTS.md:46` (the build line) gains the guard's refusal.

### Target design

1. **Plumbing (one concern, no new interface).** Add `"range-listings.parquet"` to `V1_INPUTS`; one `DATA_FILES` entry; `dist-fixture.ts` writes the file through `writeRangeListings`; copy from Finding 6. `setup.sql` is untouched, so `learn:port --check setup` holds and no ERD moves.
2. **Guard: new `scripts/build/learn/listing-blocks.ts`, called from `scripts/build.ts` after `writeStar`.**
   - `listingBlocks(pages)` (query): browser blocks whose code has `read_parquet('range-listings.parquet')`.
   - `assertListingBlocks(out, pages, { draft })`: inside one `withLabTables`, runs each and compares `renderResult` with `e2e/__snapshots__/<id>.txt`. Plain build throws, naming every block with `lineDiff`; `--draft` warns (`star.ts`'s policy).
   - A missing snapshot prints the rendered result, which is how an author gets the text for 004's fence. A listing block with `-- after:` is refused.
   - Reuses `star.ts`'s `asResult` (export it), `lineDiff`, `SNAPSHOT_DIR`. It stays outside `scripts/learn/` so no lab key moves.
   - **Evidence it's sound:** of the 54 single-`SELECT` browser blocks tried, 53 render in Node byte-identical to their browser snapshots. The miss is `d2-list`, a list cell, hence the no-list rule. Adds about 2 s.
3. **Scope rule.** Every listing block is in mammal scope. s1 and f3 read MDD or one mammal; d2 and s1's conflicts filter on `class`. This is also the honest lesson boundary: 50 mammals, one named native source. Consequence, stated in s1's prose: the axolotl's conflict in Germany isn't shown there; docs' query lists it.
4. **Pages.** s1's new step sits after the devil, in the browser; the lead and Result gain a sentence. f3's step sits beside "Which have no records at all?". `curriculum.json` is unchanged. 004 and files change together.
5. **Copy gate: one E2E test in `e2e/learn-labs.spec.ts`.**
   - `listingBlocks`' pages equal exactly `["d2", "f3", "s1"]`.
   - Each holds the line as written in HTML.
   - `\b(native|introduced)\b` (case-insensitive) matches no other fragment under `site/learn/modules`, `pages`, `data/index.html`, `layout.html`, except `e4`.
6. **Refusal and proof.** `e2e/range-listings-refusals.ts` gains R21 (append to `s1-listed`'s snapshot: refused, both modes as its cases allow). Verification also does the recipe at its worst: set `range-curated.json` to `[]`, `pnpm derive`, `pnpm build` passes with no `learn:check`, every block's guard passes, only the files in Q6 differ from the prior hash list, then `git checkout -- data`. Emptying the file proves no curated row reaches any block, not just one row.
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

### Open risks

- A future DuckDB bump could split Node and WASM rendering; the guard then fails loudly, and the fix is a block change.
- A checklists refresh now blocks `deploy` until re-recorded if a mammal row in scope moves. Intended: one commit, no `learn:check`.
- The `[]` proof assumes the build accepts an empty curated file (AGENTS.md: "A non-mammal without a row gets `range-not-found`, not a refusal"). If an unrelated check refuses, remove all rows but one and record that.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-02 00:43 UTC: Baseline: typecheck pass, test 811/811, build pass, E2E 166/166; dist equals live; listings live.
- 2026-11-02 00:55 UTC: Architecture written: browser blocks read `/v1/range-listings.parquet` by name, 7 new blocks (f3, s1, d2, e4), new build guard, copy gate; candidate queries ran on Baseline `dist/`, nothing built yet.

## Summary
