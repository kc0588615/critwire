---
mission: critwire-native-ranges-build
project: critwire
branch: agent/critwire-native-ranges-build
status: active
started: 2026-11-01 20:26 UTC
---

# Mission: critwire native ranges, build: `/v1/range-listings` (native, introduced, native but absent)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-native-ranges-build.md, then run:
     mission start critwire <that file>        (base: main)
     Don't start until O1 or O2 is yes: with every question unanswered the file holds 10 rows on 5 species, none native (spike, 2026-11-01). Read handoff H7–H11 first.
     Written by mission critwire-native-ranges-design, step S10. Design: plans/007-native-ranges.md; evidence: plans/2026-11-01-critwire-native-ranges-design.md.
     Estimate: about 22–28 sessions with every answer yes (6 pipeline stages, about 12 steps, code review, verification, release). Each default removes steps. -->

### Goal

critwire publishes what named open sources list about where each animal is native or introduced, next to today's countries with open records, which aren't range:
- **`/v1/range-listings.{json,csv,parquet}`** live: one row per claim a named source makes, the 11 columns of 007's contract, conflicts shown with both rows.
- **Sources, as the owner answered** (flip table below): GBIF checklist distributions by dataset allowlist; MDD's lists for mammals with O1 yes; a curated file for the 26 non-mammals with O3 (a).
- **Attribution and docs** credit every source used and state the IUCN ties the owner accepted.
- `species.*`, `countries.*`, all of `dist/learn/` and `range.countriesWithOpenRecords` stay byte-identical.
- It's live: the mission merges and deploys at its end.

### Why

Players and learners want to know where an animal naturally lives, not only where open records exist. The design mission measured all 76 species: every usable source speaks in countries, one new file needs no `/v2` and no Learn change, and a refresh costs about 7 minutes of fetching.

### Scope

In:
- `scripts/ingest/` (`gbif-checklists`; `mdd` only with a recorded O1 yes), `scripts/raw.ts` (the guard), `scripts/derive/` (listings, `MDD_PLACES` only with a recorded O1 yes, `checklistKeys`, conflicts), `scripts/build/` (`range-listings.ts`, `sources.ts`, `attribution.ts`, `contract.ts`), `contracts/v1.json`.
- `data/raw/gbif-checklists/`, `data/raw/mdd/`, `data/range-listings.json`, `data/review/range-conflicts.json`, `data/review/range-curated.json` (each with its condition below).
- `site/index.html` (the docs page), `DATA-LICENSE.md`, `AGENTS.md`, `e2e/`, `plans/007-native-ranges.md` (fixes where code proves it wrong).

Out:
- Learn: no page, block, projection or copy-rule change (O4, O5 belong to a later mission). `dist/learn/` doesn't move.
- Polygons and the reserved name `ranges.parquet`; per-species listing files; an overrides file for listings.
- Finding 8's fix (captive records in `range.countriesWithOpenRecords`): 007, Follow-up.
- `data/review/mismatches.json` and the review queue; a new table in `db/schema.sql`.
- IUCN data, in any form; Wikipedia prose.
- The `critwire` database except through `deploy critwire`.

### The owner's answers

**Read H7–H11 in `/srv/critter-ai/handoff/critwire.md` first and copy each answer to the plan's Decisions.** Defaults, for any question unanswered when the build starts: no MDD, no GRIIS or other O2 dataset, O3 (b).

| Answer | What it flips in the build | Rows, spike |
|---|---|---|
| O1 yes (H7) | Adds `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note | + 400, all 50 mammals |
| O2 yes (H8) | Adds GRIIS and the other O2 dataset to the allowlist, with their ties stated | + 22: GRIIS 15 on 9 species, Central Asia 7 |
| O3 (a) (H9) | Adds `data/review/range-curated.json` and `native` rows for the 26 | By hand: at least one row on each of the 26 |
| O4, O5 (H10, H11) | Nothing in this build: they belong to the Learn mission | None |

An answer that arrives mid-mission is picked up at the next session; add its steps before the final Verification.

**MDD gate, from 007:** "Nothing of MDD enters `data/`, `scripts/` or `dist/` until O1 is a recorded yes (the handoff reply, copied to the build plan's Decisions)." Every MDD step here is conditional on a recorded O1 yes. Without one, the build has no MDD ingest, no `MDD_PLACES` and no MDD rows. The contract still freezes `native-or-pre-1500`, so a later yes adds rows, not a definition edit.

### Definition of done

- `pnpm typecheck`, `pnpm test` and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped, including:
  - **A new `e2e/range-listings.spec.ts`,** like `e2e/countries.spec.ts`, expectations read from `data/range-listings.json`: the three files download with the built bytes; the rows match in every format; column names and order match the contract; `NA` (Namibia) stays text; rows are sorted and unique on 007's key; every `species_id` and `country` joins `/v1/species` and `/v1/countries`; every `source_key` is credited in `attribution.json`; no `/iucn/i` string or `threatStatus` in the three files; 007's conflict and agreement queries run on the served Parquet.
  - **`e2e/duckdb.spec.ts:59`** lists the three new files.
  - **`e2e/attribution.spec.ts:32`** covers the new sources and `gbifChecklists`.
  - **`e2e/docs.spec.ts`** covers the docs page's new section: the three files, every column described, the conflict query, and the sentence that no row means no open listing, never that the animal isn't there.
- **Byte-identical**, against this mission's own Baseline `sha256sum` list: only `v1/range-listings.*` are new, only `index.html` and `v1/attribution.json` differ, every other file, including all of `dist/learn/` and `v1/species*`, is the same.
- **Contract:** 007's fence copied into `contracts/v1.json` in the commit that adds the writer, each `sha` as `entrySha` gives it; the build checks the third table and CSV list.
- **Refusals**, each proved by making it happen once: every line under "The plain build refuses" below.
- **Docs:** `site/index.html` describes the file, words rows as what a named source lists, and keeps its "not native range" text for `range.countriesWithOpenRecords`, with one sentence pointing to the new file. `DATA-LICENSE.md` and `attribution.json`'s `notes` state each accepted IUCN tie plainly. `AGENTS.md` gains the commands, files and owners, with the same voice as its Data section.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/<this mission>/e2e/`: Playwright report, traces, `results.json`, a screenshot of the docs section at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: `/v1/range-listings.{json,csv,parquet}` return 200 with the built bytes; `/v1/attribution.json` credits every `source_key`; `/v1/species.json`, `/v1/countries.json` and `/learn/data/manifest.json` hash as in the Baseline list; `e2e/release/live.spec.ts` passes.
- The plan's Summary gives: what shipped, rows and species per source, conflicts found, which answers applied, every deviation from 007, the release record, and the handoff items left.

### Decision rules

- **007 is the design.** Build what it says; where code proves it wrong, fix it and update 007 in the same commit, with the reason under Decisions.
- **Licenses decide.** The ingest refuses anything but `CC0 1.0` and `CC BY 4.0`. A dataset whose license changed loses its role, with a Decisions line.
- **Rows pass by dataset allowlist, never by field value.** A dataset met later has no role until a person gives it one: its rows yield nothing and are counted. A new role is a handoff item, not an agent's call.
- **One authority per claim.** Native lists are never merged. Disagreements are shown, never fixed: both rows ship, and `data/review/range-conflicts.json` gets the entry.
- **Each row claims only what its source says.** `introduced` doesn't say it lives wild there; `absent` doesn't say it once lived there; no row doesn't say it isn't there.
- **Curated rows wait for the owner's review; the mission doesn't.** With O3 (a), `range-curated.json` is `{"reviewedBy": null, "rows": […]}`, agents' entries, each row citing its reference in our own words, and never reading an IUCN page. Derive publishes its rows only once `reviewedBy` holds the owner's reply and date, and prints how many it held back. Add a handoff item for the review and carry on. If it's unanswered at the release, release without those rows; after the reply, one commit sets `reviewedBy`, re-derives and deploys.
- **Frozen means frozen.** After the writer's commit, a contract definition edit needs the owner's review (`AGENTS.md`, Data).
- **Tests:** E2E first. A mapping or refusal tested in isolation lists its ways to fail first, then the code.
- **Simplest approach that works.** Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

### The plain build refuses

From 007, Pipeline; `--draft` lifts none of these:
- a stale `data/range-listings.json` ("run pnpm derive");
- a snapshot not covering the base names ("run pnpm ingest …");
- a checklists snapshot whose `keys` differ from a species' current keys, or whose `allowlist` differs from the constant ("data/raw/gbif-checklists is stale (Emydoidea blandingii: keys): run pnpm ingest gbif-checklists");
- an MDD pin or citation mismatch;
- a license other than the two, or, in a snapshot, an IUCN string or `threatStatus` key;
- a value or combination off 007's mapping, naming the row;
- an unmapped place or a country with no row;
- a contract break.

### Notes

- **The guard (Finding 3).** `assertNoIucnData` (`scripts/raw.ts:95`) gains `threatStatus`. It misses that key today, and GBIF rows on other datasets carry it (144 in the spike). No file in `data/` holds that key today, so the addition breaks nothing. Rows and metadata are written through a key allowlist, as `fetch.py` does, which also keeps `appendixCites` out. The guard covers snapshots only, so `attribution.json` and `DATA-LICENSE.md` may name IUCN to state a tie.
- **No reason in the snapshot.** The ingest's constant holds dataset → role, `area` and reason, with O2's datasets only after a yes. The snapshot's `allowlist` holds dataset → role and `area` only, because the guard walks the snapshot and a reason may name the tie.
- **Key staleness.** `checklistKeys(g)` in `scripts/derive/gbif.ts` gives a species' keys from `deriveGbif`'s result (unique non-null `g.id`, `g.taxonKey`). The ingest fetches and records them; `deriveCore`, right after `deriveGbif`, compares them. Today: 73 species with a key, 4 of them with two.
- **Derive's place.** In `deriveCore` before `matchCountries` (`scripts/derive/pipeline.ts:119`), which also gets the listing codes. It prints collapse and exclusion counts and the agreement totals.
- **Cost of a species change:** these ingests join its existing ≈ 1 h. No `learn:check`, DOI, habitat or sample work for a listings refresh alone.
- **Starting points, kept on this VPS** in `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/spike/`: `allowlist.json` (88 datasets, 18 with a role, each with its reason; 007, Allowlist), `mdd-places.json` (243 places by hand; place names and codes only, no species), `fetch.py`, `measure.py` (patterns; the repo's ingests are TypeScript). Re-derive nothing they already decided; re-check licenses at the fetch.
- **Expected numbers, 2026-11-01:** O1 and O2 yes, 432 rows on 57 species, 155,392 B of JSON before O3; all defaults, 10 rows on 5. GBIF's rows are live, so a fresh fetch moves these a little. A new combination refuses at derive: map it per 007, or "no row, counted".
- **Facts the spike proved:** MDD pinned at `https://zenodo.org/api/records/21654811/files/MDD_v2.5_6904species.csv/content`, md5 `533e662fd5b8f66a5f56c191e7efac44`; 50 of 50 mammals by exact name; 92 of its places in use, none unmapped. Never read MDD's `iucnStatus` or `extinct` columns. `GET /v1/species/{key}/distributions` sits on the legacy backbone: if GBIF retires it, the ingest fails loudly and the committed snapshot stands.
- **Conflict gate:** only 9 introduced mammal rows existed to test, too few to judge. Report the real count in the Summary.
- **Re-read when starting:** the archived license quotes in 007, Sources.
- **Pointers into 007:** Sources, Allowlist, Data model (mapping, conflict rule), Contract (the fence), Pipeline, Owner's choices, Follow-up.

### Addendum (control room, 2026-11-01): the owner's answers

This addendum is part of the brief. Where it differs from the text above, it wins.

**Answers to 007's Owner's choices (handoff H7–H11, all `done`):** O1 = yes (MDD). O2 = yes (GRIIS and the other kept datasets). O3 = (a) (the curated file). O4 and O5 belong to the Learn mission that follows this one, `critwire-learn-range-lessons`; this mission leaves `dist/learn/` alone, as the brief says.

**The curated rows don't wait for review.** H9 says the owner reviews `data/review/range-curated.json`, but a mission can't stop for that, and the owner wants as little waiting as possible. Publish the rows, each citing its reference and labelled as curated by its source column. At the end, add one handoff item (`Blocks: nothing`) listing where to read the file and how to correct a row. Never read IUCN pages for these rows.

**Don't touch held work.** critwire PR #17 (the owner's accepted confirmations) is held by the owner. Don't merge or edit it, and don't change `data/review/country-overrides.json`.

**Disk:** about 9 GB is free. Keep to the session rule of two E2E artifact folders. Delete any downloads you've hashed and no longer need.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-01 on `4074546` (`origin/main` `29508c3` + mission start), db `critwire_dev` (`.env`). Script and logs: `/srv/critter-ai/agent-state/missions/critwire-native-ranges-build/` (`baseline.sh`, `baseline-*.log`, `baseline-summary.txt`).
- `pnpm install --frozen-lockfile`: up to date. `pnpm learn:venv`: ok. No migrations (build rebuilds `db/schema.sql` tables each run). No lint script; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 754/754 pass (3.1 min).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,558 B, committed lab data 18,822,906 B (cap 120,000,000 each).
- `pnpm e2e`: 149/149 pass (11.1 min); artifacts `.../critwire-native-ranges-build/e2e-baseline/` (828 MB). Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- `dist/` hashes: 311 files, list `.../critwire-native-ranges-build/dist-baseline.sha256` (list's sha256 `349935ae916c4308…`, same as the design mission's); unchanged after E2E; live `/srv/apps/critwire/.live` identical (`cmp` clean). **This list is the byte-identical reference for Verification and the release smoke.**
- Not run: `pnpm test:db` (24 min), `pnpm learn:check` (9 min): brief's Baseline doesn't name them; plain build already refuses a lab not proven as committed.
- Working tree clean after. Handoff: H3, H6 waiting on owner, neither blocks this mission.

## Architecture

Read on `10ee75e`. Builds on 007; only what code changes or 007 leaves open is here. Plan's own questions: none listed; the lead's are answered below.

### Findings

Ranked by impact. Each was checked against code or run.

1. **007's derive placement is wrong (`007:467`, `:476`; brief Notes, "Derive's place", "Key staleness").** Listings inside `deriveCore` breaks modularity and deadlocks the ingest:
   - `readCoreInputs` (`scripts/derive/pipeline.ts:61`) would read a snapshot that doesn't exist before the first ingest: ENOENT for every caller.
   - `ingest gbif-checklists` needs `deriveGbif`'s keys, but `deriveCore` would refuse the stale snapshot that ingest exists to replace.
   - `ingest gbif-sample` uses `deriveCore` so a stale derived file never blocks its re-ingest (`pipeline.ts:3-4`, `scripts/ingest/gbif-sample.ts:74-78`, tested at `scripts/derive/sample.test.ts:146`). Stale listings would block it.
   - The function that makes `species.json` would depend on the new sources.
   **Fix:** a third half, like `deriveSample`: `deriveAll = deriveCore + deriveSample + deriveListings`. `deriveCore` only adds an in-memory `checklistKeys`, and `matchCountries` stays untouched. Same refusals, same strength. Update 007 and record it under Decisions.
   **Cost:** `deriveAll`'s other callers now refuse a stale listing snapshot too (`scripts/gbif-register.ts:42`, `scripts/review-accept.ts:44`, `:57`, `scripts/ingest/habitat.ts:452`), as they already do a stale sample. Accepted and documented: Target design, "Who a stale listing snapshot blocks".
2. **Byte-identical has traps 007 doesn't name.** The data flow is sound, but editing these moves `dist/learn/` or stales every lab:
   - `site/style.css`: inlined into every Learn page (`scripts/build/learn/pages.ts:97`, `data.ts:129`). The docs section uses existing styles only.
   - `scripts/build/licenses.ts`, `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts`: in the Learn bundle (`site/learn/src/cards.ts:6-8`, `engine.ts:13`), so the hashed asset moves.
   - `scripts/json.ts`, `scripts/env.ts`, `scripts/venv.ts`, `scripts/learn/*`: checker closure (`scripts/learn/freshness.ts:27`, `:170`). One byte fails plain build with "lab … is stale". So no shared helper goes in `json.ts`.
   - Computed closure: 27 files, none of the others this mission edits.
3. **Attribution is undecided for `mdd` and `curated` (`007:349`, `:249`).** The brief's E2E needs every `source_key` credited, but only GBIF keys have a join. Curated rows have no source name or credit. `GBIF checklists` needs one `license` (`scripts/build/attribution.ts:16`) over a CC0 and CC BY mix, and `licenseUrl()` throws on a string `LICENSE_URLS` lacks (`attribution.ts:72`, `:103`; `scripts/build/licenses.ts:21`). `attribution.ts:57` throws for a registered source with no entry. `scripts/build/docs.ts:24` says "records" for anything but Natural Earth. Fix under Target design.
4. **Curated file (`007:466`, `:534`, brief line 88): the addendum removes the gate, and 007's shape dies with it.** `reviewedBy` would be a dead field: drop it. 007 also never says how the file is validated, and "the guard covers snapshots only" would leave it unguarded. Fix under Target design.
5. **Spike's snapshot shape shouldn't be copied.** `fetch.py:38` keeps `locality`, and `raw/` holds 440 rows on no-role datasets. Committing those puts rows of unchecked license in a public repo, for no use: a new role already forces a re-ingest through the `allowlist` check. **Fix:** write role-dataset rows only, and count the rest per dataset. `007:285`'s "dataset with no role" line moves to the ingest. Metadata is fetched for role datasets only, so about 70 fewer requests.
6. **Sort order bug if `writeCountries` is copied.** DuckDB's default `ORDER BY` puts NULL last (run: `a, b, NULL`). `area` is in the key, and JS needs a defined order too. **Fix:** derive sorts null first; the writer says `area NULLS FIRST`.
7. **DRY: a third writer would copy `scripts/build/tables.ts:6-12` and `scripts/build/countries.ts:12-21`.** `columns.ts:42`, `:60`, `:65` already take a `columns` argument. **Fix:** one shared function in `tables.ts`. Run: the shared form gives `countries.parquet` and `countries.csv` identical to `dist/`'s bytes.
8. **Public copy goes incomplete.** `site/index.html:228` ("It holds no IUCN data") and `DATA-LICENSE.md:9` ("but no IUCN data") stay true of Red List data but read as denying the ties the owner accepted. Each gets the tie stated beside it. The `AGENTS.md` IUCN rule gets one line recording O1 and O2.
9. **Curated references: the guard can't see every IUCN tie.** `/iucn/i` refuses `iucnredlist.org` and `iucn-tftsg.org`, but not a checklist hosted elsewhere, such as the Turtle Taxonomy Working Group's on `chelonian.org`, an IUCN SSC group's project (from memory; confirm when met). **Rule:** treat a reference from an IUCN group as an IUCN page, wherever it's hosted. Access risk: `amphibiaweb.org` timed out and `amphibiansoftheworld.amnh.org` refused this server (`007:45`). `url` is the page actually read, archive snapshot included.
10. **Tests that break by construction:**
    - `scripts/derive/pipeline.test.ts:16` (asserts 6 files; the `keys` list too).
    - `scripts/build/contract.test.ts:36`, `:50` (fixtures).
    - `e2e/attribution.spec.ts:32-34` (`citing[0]` crashes on a file-level source).
    - `e2e/docs.spec.ts:8` (`SECTIONS`), `:13` (`HOSTS` needs `www.mammaldiversity.org`).
    - `e2e/duckdb.spec.ts:59`.

**Verified fine:**
- All of 007's and the brief's `file:line`s are right.
- All 11 contract shas equal `entrySha`.
- `checklistKeys` semantics give 73 species, two keys on 1, 55, 63, 70, identical to the spike's `keys.json`; no lump case today.
- `matchCountries`' `speciesCodes` only feeds `missing` (`naturalearth.ts:110`), so rows don't depend on it.
- `MDD_PLACES`: 241 codes all in `data/countries.json`; `NA`, `Domesticated` have none; no two places share a (code, area); MDD collapse is 0.
- 18 role datasets: `title`, `citation.text` and publisher have no IUCN string, so the guard passes; all have a DOI.
- No `threatStatus` in `data/`. Nothing in Learn reads `contracts/v1.json` or `attribution.json`. `V1_INPUTS` is species and countries parquet only (`scripts/build/learn/data.ts:80`). Caddy's `/v1/*` block is generic: no ops change. No new dependency, no `docs/recovery.md` state.
- PR #17 touches only `country-overrides.json` and `mismatches.json`. Listings don't read either, so it stays independent.

**Reuse, no new helper:**

| Need | Existing |
|---|---|
| Paced, retried GET | `getJson` (`scripts/http.ts`) |
| GBIF paging | `allPages` (`scripts/gbif/pages.ts:7`) |
| Zenodo pin | `downloadFile` with `sha256: null, md5, bytes` (`http.ts:102`; 9,303,589 B from the Zenodo record) |
| MDD CSV | `withOfflineDuckDb` + `read_csv`, selecting 3 columns. `simple-csv.ts` is tab-only; no CSV dep |
| CLI wrapper | `snapshot`, `withBase`, `noArgs` (`scripts/ingest.ts:20-37`) |
| Staleness | `staleSnapshot`, `assertBaseNames` (`scripts/raw.ts:86`, `:89`). `staleSnapshot` already gives the brief's exact message |
| License | `DATASET_LICENSES` (`gbif-sample.ts:51`) maps the URL, then `OPEN_LICENSES` (`scripts/learn/sample-rules.ts:12`) decides; `licenseUrl` per dataset |
| Curated parsing | `parseOverrides`' pattern (`scripts/derive/countries.ts:133`) |
| Contract | `checkTable`, `checkCsv` (`scripts/build/contract.ts:114`, `:177`) |
| Citation per release | `colCitation`'s pattern (`scripts/build/sources.ts:30`) |

`byText` already has 6 local copies. One more in `listings.ts`, no churn: its natural home, `json.ts`, is off limits (Finding 2).

### Target design

**Modules:**

| Module | Does one thing |
|---|---|
| `scripts/raw.ts` | Adds both snapshot types and `Snapshots` keys `gbif-checklists`, `mdd`; guard gains `threatStatus` |
| `scripts/ingest/checklist-roles.ts` (new, no imports) | `CHECKLIST_ROLES`: the 18 datasets → role, area, reason. Own file so derive importing it can't cycle through `gbif-sample.ts` → `pipeline.ts` |
| `scripts/ingest/gbif-checklists.ts` (new) | `fetchGbifChecklists(keysByName)`: fetch and normalize, no fs. Key allowlist, license refusal, guard |
| `scripts/ingest/mdd.ts` (new) | `MDD_FILE` pin, `fetchMdd(base)` |
| `scripts/derive/gbif.ts` | Adds `checklistKeys(g)` |
| `scripts/derive/mdd-places.ts` (new) | `MDD_PLACES`: a committed TS constant, copied once from the spike's `mdd-places.json`. Derive reads nothing outside the repo |
| `scripts/derive/listings.ts` (new) | Files, `readListingInputs`, `deriveListings`: freshness, curated parsing, mapping, collapse, `rangeConflicts(rows)` (exported for E2E). Pure. Split curated parsing out if it grows past about 300 lines |
| `scripts/derive/pipeline.ts` | `CoreResult.checklistKeys`, third half in `deriveAll`, two more `derivedFiles` (appended, so `species.json` stays first); `:118`'s comparator becomes a module constant `byEntry`, which `deriveAll` also applies to the listings' entries |
| `scripts/build/range-listings.ts` (new) | `RANGE_LISTING_COLUMNS` (a `Columns`), `writeRangeListings(rows, outDir)` |
| `scripts/build/tables.ts` | Shared `<name>.parquet` + `.csv` writer; `writeTables`, `writeCountries` and the new one call it |
| `scripts/build/contract.ts`, `sources.ts`, `attribution.ts`, `docs.ts` | Third table and CSV list; 3 registered sources and `MDD_CITATIONS`; credits; rendering |
| `scripts/species.ts`, `scripts/ingest.ts`, `scripts/derive.ts`, `scripts/build.ts`, `scripts/build/inputs.ts` | Wiring: `MismatchKind` + 2, 2 sources, summary lines, writer call, inputs |

**Snapshots** (`writeSnapshot`, canonical):
```ts
GbifChecklistsSnapshot {
  retrieved: string;
  allowlist: Record<datasetKey, { role: "register" | "checklist"; area: string | null }>; // all 18, no reason
  datasets: Record<datasetKey, { title; license: "CC0 1.0" | "CC BY 4.0"; doi; citation }>; // role datasets met
  species: Record<scientificName, { keys: number[]; rows: { datasetKey; sourceTaxonKey; country; establishmentMeans; status }[] }>; // every base name; rows sorted
  dropped: { noSourceTaxonKey: number; redList: number; noRole: Record<datasetKey, number> };
}
MddSnapshot {
  retrieved: string;
  file: { url; md5; bytes };
  release: { version; issued; doi };
  license: "CC BY 4.0";
  species: Record<baseMammalName, { id: string; places: string } | null>; // places: the cell, verbatim
}
```
- License: `DATASET_LICENSES` maps the URL (an unknown one throws), then the ingest refuses anything outside `OPEN_LICENSES`. The map alone isn't enough: it also holds `CC BY-NC 4.0`.
- A role dataset whose license fails that, or that lacks `doi`, `title` or `citation.text`: the ingest throws, nothing written. A person removes the role, with a Decisions line.
- **The key allowlist is what keeps `threatStatus` out.** `fetchGbifChecklists` builds each row and dataset field by field from the keys above, never by spread or denylist. The spike's `raw/` rows prove nothing, since `fetch.py`'s `ROW_KEYS` had already filtered them. Its count does matter: 144 fetched rows carried the key, 5 of them on role datasets (spike `results.json:1296-1297`). The guard's new key is the second line. Proof at the real fetch: the ingest logs that count (stderr only), and the spec checks that each committed row's keys are exactly the five and each dataset's the four.
- The red-list dataset's key is never written; only its count is.
- MDD: the Zenodo record's `license.id`, DOI and version are read each run. Refuses unless 6,904 rows and unique names. `iucnStatus` and `extinct` are never selected. The temp file lives in its own `mkdtemp` folder and is removed after.
- "Mammal" means `base[].taxonomy.class`, in both ingest and derive. `assertBaseNames` takes the filtered list unchanged.

**Derived file:** `data/range-listings.json`: `{ sources: { gbifChecklists: { retrieved, datasets: [{ key, title, license, doi, citation, rows }] }, mdd: { retrieved, release, license, rows }, curated: { rows } }, rows }`. Datasets with 0 rows aren't "used" and aren't listed (GRIIS Australia today). `data/review/range-conflicts.json`: `Mismatch[]`, `canonical: false`, `field: "range-listings"` (the file's name: not a record path, so it can't read as a species field), sorted by `byEntry`. One `range-conflict` per (species, country), the query's grain, with `values.claims` holding every `area`-null row's `{ sourceKey, origin, presence }` in key order (`007:328`'s "both" becomes "every": a cell can hold three). One `range-not-found` per species, no `country`. So `byEntry`'s four keys are unique, and the file sorts and dedupes as `mismatches.json` does.

**Data flow:**
```
ingest gbif-checklists  deriveCore(readCoreInputs()).checklistKeys → GBIF → data/raw/gbif-checklists/snapshot.json
ingest mdd              base mammals → Zenodo → data/raw/mdd/snapshot.json
hand                    data/review/range-curated.json
deriveAll               deriveCore → deriveSample(core) → deriveListings({ base, core, listings })
                        → data/range-listings.json, data/review/range-conflicts.json
readBuildInputs         assertDerivedFiles, then checkV1Contract (third table) → BuildInputs.rangeListings
scripts/build.ts        buildAttribution(…, rangeListings), renderDocs (before any write);
                        writeRangeListings(rows, v1) right after writeCountries (:58)
```
`deriveListings` order: freshness and guard on both snapshots → parse curated → map GBIF, MDD, curated → check each code against `core.countries.rows` → collapse, sort → conflicts, not-found → guard on rows. Printed by `scripts/derive.ts`: rows and species per source, collapsed, each exclusion's count, `dropped` (`noRole` by dataset key, so a newly met dataset shows in the PR body), conflicts, agreement totals.

**Where each refusal lives** (all run in `pnpm derive` or before `scripts/build.ts` writes anything):

| Refusal | Where |
|---|---|
| Stale `range-listings.json`, `range-conflicts.json` | `assertDerivedFiles` (`pipeline.ts:140`), via `derivedFiles` |
| Snapshot not covering base names | `assertBaseNames` in `assertGbifChecklistsFresh`, `assertMddFresh` (`listings.ts`) |
| Keys or allowlist differ | `assertGbifChecklistsFresh(snapshot, base, core.checklistKeys)`, `isDeepStrictEqual` as `naturalearth.ts:44`, `staleSnapshot("gbif-checklists", "<name>: keys")` / `"allowlist"` |
| MDD pin | `assertMddFresh` against `MDD_FILE` |
| MDD citation | `mddCitation` in `sources.ts`, during `buildAttribution` (`scripts/build.ts:43`), before any write |
| License | Both fresh asserts, `OPEN_LICENSES` on `datasets[].license` and MDD's `license`; contract `values` again |
| IUCN string, `threatStatus` | `assertNoIucnData` at ingest and in both fresh asserts (derive doesn't re-guard snapshots today), on curated input and on final rows |
| Off-mapping value or combination | Table-driven `mapChecklistRow`, throws naming species, dataset, country, means, status |
| Unmapped place, country with no row | `mapMddPlace`, and the code check in `deriveListings`, naming the row. Replaces 007's `matchCountries` route; better message |
| Contract break | `checkV1Contract` (`scripts/build/inputs.ts`) |

**`--draft`:** nothing added and nothing lifted. `readBuildInputs` runs all of the above in both modes; `assertDois` stays the only check `--draft` lifts.

**Curated rows, no gate (addendum).** `data/review/range-curated.json` is a bare array, like `country-overrides.json`; it starts `[]`. Each element has exactly `speciesId, country, area, presence, url, sourceTerm`. Derive fills the rest: `origin` `native`, `source` `critwire curated`, `sourceKey` `curated`, `license` `CC BY 4.0`, `doi` null.
`parseCurated` refuses:
- an unknown species, or a mammal (one authority per claim);
- a bad country; `presence` other than `present`, `uncertain`, `absent`; a non-`https` `url`; a blank `sourceTerm`; an `area` that's neither null nor non-blank text;
- a duplicate key;
- anything `assertNoIucnData` refuses, which covers any `iucn` URL.

Coverage of the 26 is an E2E check, not a derive refusal: a future non-mammal shouldn't block a deploy. It gets a `range-not-found` entry instead, as a mammal with no MDD row does (small extension of `007:329`). The docs say a curated row is critwire's reading of the reference in `url`. Correcting a row: edit it, `pnpm derive`, `pnpm build`, deploy; that's the final handoff item's text. 007's `:466`, `:534` and the brief's rule change with this.

**Attribution:**
- Rows' `source` is the GBIF dataset title, `Mammal Diversity Database` or `critwire curated`.
- `sources[]` gains all three registered entries, always emitted, so `attribution.ts:57` holds while curated is `[]`.
- `sources[].sourceKey` (new, optional) is set on `mdd` and `curated`. The E2E join: `gbifChecklists[].key` ∪ `sources[].sourceKey`.
- `GBIF checklists`: `license` `CC0 1.0 or CC BY 4.0, per dataset`, a summary only. Its builder sets the literal `licenseUrl: null` and never calls `licenseUrl()`, which would throw (`scripts/build/licenses.ts:21`). `LICENSE_URLS` and `licenses.ts` gain nothing: that file is in the Learn bundle (Finding 2). `docs.ts` needs nothing for it: `licenseLink(license, null)` prints text (`scripts/build/html.ts:8`). `e2e/attribution.spec.ts:41` already accepts null. MDD and curated do call `licenseUrl("CC BY 4.0")`.
- Top-level `gbifChecklists`: `{ key, title, license, licenseUrl, doi, url, citation, rows }[]`. Each `license` is one of the two, and each `licenseUrl` comes from `licenseUrl(license)`. The summary string stays on the `sources[]` entry: no dataset or row carries it. E2E: a row's `license` equals its dataset's.
- `MDD_CITATIONS["v2.5"]`: `release.toml`'s `zenodo_citation`, verbatim; a new release fails until added.
- Curated credit: `CRITWIRE_CREDIT`, url the file on GitHub.
- Ties: per-source `notes` on `GBIF checklists` and MDD.
- `docs.ts`: a name → unit map (`countries`, `rows`, else `records`), and a `{{gbifChecklists}}` slot listing title and DOI link.

**Writer:** `RANGE_LISTING_COLUMNS` gives Parquet and JSON camelCase and CSV snake_case through `csvSelect`/`csvColumns`, so the contract's `rangeListingsCsv` needs no second list. `ORDER BY speciesId, country, area NULLS FIRST, origin, presence, sourceKey`. Dist JSON is `rows` only, `formatJson`, as countries.

**Staleness and byte-identical:**
- Listings depend on `base`, `core.checklistKeys`, `core.countries.rows` and their inputs, never on `records` (only the printed agreement reads those) or overrides.
- `deriveCore`'s added field isn't in `derivedFiles`, so `species.json`, `mismatches.json`, `countries.json` can't move.
- The shared writer is proven byte-equal on countries; species goes through the same call with its own columns.
- `dist/learn/`'s inputs don't change, given Finding 2's off-limits list.
- Elapsed time is never staleness, as `assertGbifFresh`. A plain `ingest gbif` that keeps keys doesn't stale listings.
- Proof: `sha256sum -c` against `dist-baseline.sha256` after the writer refactor and at Verification. No `learn:check` needed.

**Who a stale listing snapshot blocks:**
- Blocked, as by a stale sample: `pnpm derive`, `pnpm build`, `gbif:register`, `review:accept`, `ingest habitat`, all through `deriveAll`. Only a moved key, a base-name change or an allowlist edit stales a snapshot.
- Never blocked, so there's always a way out: `ingest gbif-checklists`, `ingest gbif-sample` (`deriveCore` only), `ingest mdd` (`base` only).
- Recovery, which the refusal's message starts: `pnpm ingest gbif-checklists` (plus `mdd` if the base's mammals changed) → `pnpm derive` → commit (`gbif:register` refuses a dirty tree, `scripts/gbif-register.ts:39-40`) → re-run the blocked command.
- `AGENTS.md` says so in Commands (the `gbif:register`, `review:accept` and `ingest habitat` lines), GBIF DOI refresh (before step 1: a moved key stops `pnpm derive` until this recovery) and Cost of a species change (the order below).

**Published queries in E2E (`e2e/range-listings.spec.ts`).** A refresh with zero conflicts is legitimate and must pass, so current data only has to agree, and detection is proven on fixed rows:
- **Markup:** the conflict query is `<code data-query="range-conflicts">`, not `data-example`, so `e2e/duckdb.spec.ts:46`'s rows > 0 doesn't apply. The agreement query has `data-example="sql"` (always rows, one per record country at least) and `data-query="range-agreement"`.
- **Served bytes, current data:** the conflict query's (species, country) set equals the `range-conflict` entries in `range-conflicts.json`; 0 = 0 passes. The agreement query's row count and null-`source` count equal what the spec computes from `data/species.json` and `data/range-listings.json`.
- **Fixed rows, one test, no `pnpm test` file:** the same rows go through `rangeConflicts(rows)` and through the served conflict query, its URL swapped for a temp Parquet of those rows. Both must return the expected set.
- **Owner's testing rules:** that test is the one isolated check, so its ways to fail come first. They're `007:331`'s cases:
  - Must find: `native-or-pre-1500` vs `introduced`; `native` + `absent` vs `introduced` + `present`; `introduced` + `present` vs `introduced` + `absent`.
  - Must not find: a pair where one row has an `area`; `native` vs `native-or-pre-1500`; `uncertain` vs `introduced`.
  - JS and SQL differing on any of them.

**Order constraints for Steps:**
- Ingests and committed snapshots land before `deriveAll` reads them. Every real-data test goes through `readDeriveInputs`, so wiring (half, files, `range-curated.json` as `[]`) is one commit.
- Writer, contract fence and attribution land together.
- Curated rows are later commits, each with `pnpm derive`.
- The fixed-rows test's JS half lands before `rangeConflicts`' code; its SQL half lands with the docs section, same rows.
- Species-change order for `AGENTS.md`: `ingest gbif` → `gbif-checklists`, `mdd` → `gbif-sample --new` → `derive` → `habitat` → DOIs.

**Scope:** no owner item needed. Cost, licensing and what goes public don't change. Wiring files named above sit outside the brief's parenthetical list (`scripts/species.ts`, `scripts/ingest.ts`, `scripts/derive.ts`, `scripts/build.ts`, `scripts/build/{inputs,docs,tables,countries}.ts`): necessary, not a scope change. Deviations from 007 to record under Decisions, with 007 updated in the same commit: Finding 1, Finding 5, `range-not-found` on non-mammals, the curated shape.

### Rejected alternatives

- **Listings in `deriveCore` (007):** Finding 1.
- **`matchCountries` gets listing codes (007):** couples core to listings; the error names "species codes", not the row.
- **Keeping no-role rows in the snapshot (spike):** rows of unchecked license in a public repo, no use.
- **All 88 datasets in the constant:** the 70 reasons already live in 007; the snapshot's `dropped.noRole` shows any new one.
- **`reviewedBy` kept as an unused field:** dead state, and it reads as a gate that isn't there.
- **Curated file repeating `origin`, `source`, `license`, `doi`:** constants by rule; a reviewer needs only the claim and its reference.
- **Failing derive on a non-mammal with no curated row:** a new species would block deploys.
- **A CSV dependency or hand parser for MDD:** DuckDB is there, and selecting columns means `iucnStatus` is never read.
- **`getBytes` with a new sha256 pin for MDD:** Zenodo publishes md5; `downloadFile` is built for that.
- **Umbrella license `CC BY 4.0`:** misstates the CC0 datasets.
- **One `sources[]` entry per dataset:** 17 entries, and `gbifDerivedDataset.datasets` already sets the nested pattern.
- **New CSS for the docs section:** moves every Learn page.

## Architecture review (Fable)

Read on `97aeffb`. Checked against code: `scripts/derive/pipeline.ts`, `raw.ts`, `build/{attribution,docs,sources,licenses,html,tables,countries,columns,contract,inputs}.ts`, `build/learn/credits.ts`, `learn/freshness.ts` (ran `importClosure("scripts/learn-check.ts")`: 27 files, as stated; none this mission edits), `site/learn/src/*` imports, `ingest/gbif-sample.ts`, `review/presort.test.ts` P9 guard, `e2e/{attribution,docs,duckdb,files}.spec.ts`, 007 Data model/Contract/Pipeline, and the spike's `raw/gbif-rows.json` (475 rows, 48 codes, all in `data/countries.json`).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **`GBIF checklists` attribution entry can't be built the way the design says (Target design, Attribution; Finding 3).** It sets `license` to `CC0 1.0 or CC BY 4.0, per dataset` with `licenseUrl` null, but every `sources[]` entry today goes through `licenseUrl(license)` (`scripts/build/attribution.ts:75`, `:120`; `scripts/build/licenses.ts:21`), which throws on any string not in `LICENSE_URLS`. The only registry is `scripts/build/licenses.ts`, which Finding 2 correctly puts off limits (it's in the Learn bundle, `site/learn/src/cards.ts:6`): adding the string there moves the hashed asset and breaks byte-identical. As written, the implementer either hits the throw or edits `licenses.ts`. Fix: say the entry is built with `licenseUrl: null` set directly, never through `licenseUrl()` (`e2e/attribution.spec.ts:40` already accepts null), and that `LICENSE_URLS` gains nothing. Same for `docs.ts`: `licenseLink(license, null)` prints text, so no change there.

MISSED:
- `deriveAll` is also run by `scripts/gbif-register.ts:42`, `scripts/review-accept.ts:44`, `:57` and `scripts/ingest/habitat.ts:452`. With the third half, a stale `gbif-checklists`/`mdd` snapshot (for example after an `ingest gbif` that moves a key) blocks a DOI refresh, `review:accept` and `ingest habitat` until `ingest gbif-checklists` runs. Consistent with how the sample half already behaves, and the species-change order covers it, but Finding 1 names only `gbif-sample`; `AGENTS.md` (Commands, GBIF DOI refresh) must say it.
- `DATASET_LICENSES` (`scripts/ingest/gbif-sample.ts:51`) maps `CC BY-NC 4.0` too. The Reuse table lists it for "License"; the refusal must be against `OPEN_LICENSES` (`scripts/learn/sample-rules.ts:12`) after the map, or a BY-NC role dataset passes the ingest. Say so under Snapshots.
- Spike rows were already written through `fetch.py`'s key allowlist, so "no `threatStatus` in the spike's rows" proves nothing about the live API; the 144 count is from the fetch log. The ingest's allowlist must be the proof, and the guard addition is still right (no `data/` file holds the key: grep clean).

SHOULD-CONSIDER:
1. `MDD_PLACES` "from `mdd-places.json`": say the TS constant is the committed copy of the spike file; derive reads nothing outside the repo (it's pure anyway, but the module table reads as if it loads a file).
2. Curated rule "a blank `area` (null or text)" is ambiguous; write "`area` is null or non-blank text".
3. `range-conflicts.json` rows use `Mismatch`, whose `field` is required: name the value (`range-listings`?) so the two files' entries sort and dedupe the same way as `mismatches.json` (`pipeline.ts:116`).
4. The e2e conflict cross-check (JS set = docs SQL) is good; add the agreement SQL from 007 to the same test so both published queries are proven on served bytes, as the brief's Definition of done asks.
5. `derive.ts` prints per source; include `dropped.noRole` by dataset so a newly met dataset is visible in the PR body, as the Decision rule "counted" intends.

## Architecture review (Astra)

Read on `c6b742a`.

VERDICT: APPROVE

MUST-FIX: none

SHOULD-CONSIDER:

1. Document that adding listings to `deriveAll` also makes DOI registration, habitat ingestion and `review:accept` depend on fresh listing snapshots; include their recovery order.
2. Keep the mixed-license attribution summary separate from individual dataset licenses. Preserve the proposed explicit `licenseUrl: null` without changing Learn’s shared license registry.
3. Allow legitimate refreshes with zero conflicts. Verify conflict detection with fixed fixtures, while checking published queries against current data without requiring disagreements to exist.

## Revision notes

Read on `57c6d4a`. Nothing rejected. No second review round.

- **Fable MUST-FIX 1:** fixed, Attribution and Finding 3: literal `licenseUrl: null`, `licenses.ts` untouched, no `docs.ts` change. Verified in code; the review's line numbers were slightly off (`attribution.ts:72`, `:103`, `e2e/attribution.spec.ts:41`).
- **Fable MISSED (a), Astra SC 1:** fixed: Finding 1's Cost line, and new "Who a stale listing snapshot blocks" with the recovery order and the three `AGENTS.md` places.
- **Fable MISSED (b):** fixed, Snapshots, Reuse and refusal tables: `OPEN_LICENSES` after the map, at ingest and in derive.
- **Fable MISSED (c):** fixed, Snapshots: the allowlist is the proof. One correction to the review: the count is in the spike's `results.json`, not its log, and 5 of the 144 rows are on role datasets, so the allowlist does real work.
- **Fable SC 1:** taken, module table.
- **Fable SC 2:** taken, curated rules.
- **Fable SC 3:** taken: `field: "range-listings"`, one conflict entry per (species, country), one comparator (`byEntry`, from `pipeline.ts:118`; the review said `:116`).
- **Fable SC 4:** taken: both queries on served bytes.
- **Fable SC 5:** taken: derive prints `noRole` by dataset key.
- **Astra SC 2:** taken: the summary stays on the `sources[]` entry; datasets and rows keep their own license.
- **Astra SC 3:** taken, replacing "a refresh that empties it fails loudly": the conflict query leaves `data-example`, 0 = 0 passes on current data, and detection is proven on 007's six fixed cases. How it fits the owner's rules: it's one test in the E2E spec, not a `pnpm test` file; it runs the served query text; its ways to fail are listed in the design, and its JS half lands before the code.

## Steps

Written on `73cd51a`. Read **Target design** above first: shapes, messages and refusal homes live there, not here. `E1`–`E12` and `R1`–`R20` are under Verification; `F1`–`F8` under Failure modes. Paths below use `S=/srv/critter-ai/agent-state/missions/critwire-native-ranges-build`.

**Every step:**
- Ends with `pnpm typecheck && pnpm test && pnpm build` (plain), then the byte check. Heavy jobs one at a time.
- **Byte check:**
  ```
  (cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | diff $S/dist-baseline.sha256 - | grep '^[<>]' | awk '{print $1, $3}'
  ```
  S1–S5: prints nothing. S6 on: exactly these 7 lines:
  ```
  < ./index.html
  > ./index.html
  < ./v1/attribution.json
  > ./v1/attribution.json
  > ./v1/range-listings.csv
  > ./v1/range-listings.json
  > ./v1/range-listings.parquet
  ```
- **Off limits.** One byte moves `dist/learn/` or stales every lab (Finding 2; closure re-run on `73cd51a`, 27 files, none edited here): `site/style.css`, all of `site/learn/`, `scripts/build/licenses.ts`, `scripts/build/learn/`, `scripts/learn/`, `scripts/learn-check.ts`, `scripts/json.ts`, `scripts/env.ts`, `scripts/venv.ts`. Build says "lab … is stale": revert what moved, never `learn:check --update`. Held work too: PR #17, `data/review/country-overrides.json`, `data/review/mismatches.json`.
- **Isolated tests:** the step's `F` list goes in the test file's header, tests first, seen failing, then the code (pattern: `scripts/derive/pipeline.test.ts:1-3`).
- **E2E artifacts:** `E2E_ARTIFACTS=$S/e2e-s<N>`, never the default in-repo folder. A full run is about 830 MB; about 8 GB free. Before the first write, delete `$S/e2e-baseline` (its hash lists and logs stay); before each later one, the previous `$S/e2e-s*`.
- **Ingest logs:** `2>> $S/ingest-<source>.log`.
- **A deviation from 007:** edit 007 in the same commit, with a Decisions line.

- [x] S1. **GBIF checklists ingest: real fetch, committed snapshot.** Most enabling, and the one live API.
  - First: re-read 007's GBIF terms quotes (archived URLs in its Sources row). Changed: Decisions line.
  - Files: `scripts/raw.ts` (guard gains `threatStatus`; `GbifChecklistsSnapshot`; `Snapshots` key), `scripts/ingest/checklist-roles.ts` (new; the 18 with a role from spike `allowlist.json`, with reasons), `scripts/ingest/gbif-checklists.ts` (new), `scripts/derive/gbif.ts` (`checklistKeys`), `scripts/derive/pipeline.ts` (`CoreResult.checklistKeys` only), `scripts/ingest.ts`, tests `scripts/ingest/gbif-checklists.test.ts`, `scripts/derive/gbif.test.ts` (F1), `plans/007-native-ranges.md` (Finding 5: `:285`, Pipeline's row), `data/raw/gbif-checklists/snapshot.json`.
  - Run: `pnpm ingest gbif-checklists 2>> $S/ingest-gbif-checklists.log` (about 6 min).
  - Verified: F1 pass. Snapshot: all 76 names, 73 with keys, two keys on ids 1, 55, 63, 70 (= spike `raw/keys.json`); about 35 rows on role datasets; every row's keys exactly the five, every dataset's the four; `grep -ciE 'iucn|threatStatus|19491596' data/raw/gbif-checklists/snapshot.json` prints 0. Log line: fetched rows with `threatStatus` (spike: 144), `dropped`. Byte check empty.

- [x] S2. **MDD ingest and `MDD_PLACES`** (O1 yes, Decisions).
  - First: re-read 007's MDD quotes: `license.id`, version, DOI at `https://zenodo.org/api/records/21654811`; ancestry quote in `arch-probe/papers`.
  - Files: `scripts/raw.ts` (`MddSnapshot`, `Snapshots` key), `scripts/ingest/mdd.ts` (new; `MDD_FILE`, 9,303,589 B, md5 as brief; `fetchMdd(base)`), `scripts/derive/mdd-places.ts` (new; committed copy of spike `mdd-places.json`, 243 places), `scripts/ingest.ts`, test `scripts/ingest/mdd.test.ts` (F2), `data/raw/mdd/snapshot.json`.
  - Run: `pnpm ingest mdd 2>> $S/ingest-mdd.log` (under 1 min).
  - Verified: F2 pass. Snapshot: exactly the 50 mammals, 50 non-null; every `|` token (less a trailing `?`) is in `MDD_PLACES`; `grep -ciE 'iucn|"extinct"' data/raw/mdd/snapshot.json` prints 0; temp folder gone. Byte check empty.

- [x] S3. **`deriveListings`: pure, not wired yet.**
  - Files: `scripts/derive/listings.ts` (new: `readListingInputs`, `parseCurated`, `assertGbifChecklistsFresh`, `assertMddFresh`, `mapChecklistRow`, `mapMddPlace`, `rangeConflicts`, `deriveListings`; imports `checklist-roles.ts`, `MDD_FILE`, `OPEN_LICENSES`, never `gbif-sample.ts`, which would cycle), `scripts/species.ts` (`MismatchKind` + `range-conflict`, `range-not-found`), test `scripts/derive/listings.test.ts` (F3–F6), `e2e/range-listings.spec.ts` (new: E11's JS half, F7).
  - Verified: `pnpm exec tsx --test scripts/derive/listings.test.ts`; `E2E_ARTIFACTS=$S/e2e-s3 pnpm exec playwright test e2e/range-listings.spec.ts`. No caller yet: byte check empty.

- [x] S4. **Wire the third half: one commit.** First real rows.
  - Files: `scripts/derive/pipeline.ts` (`DeriveInputs.listings`, `DeriveResult.listings`, `deriveAll`, module-level `byEntry` from `:118`, 2 appended `derivedFiles`, header comment), `scripts/derive.ts` (summary lines per Target design, header comment), `scripts/derive/pipeline.test.ts` (8 files, `keys`), `scripts/derive/sample.test.ts` (a stale listing snapshot stops `deriveAll`, not `deriveCore`), `data/review/range-curated.json` (`[]`), `data/range-listings.json`, `data/review/range-conflicts.json` (from `pnpm derive`), `plans/007-native-ranges.md` (`:329`, `:466`, `:467`, `:476`, `:534`: Finding 1, curated shape, `range-not-found` on non-mammals, with Decisions lines).
  - A new GBIF combination refuses here: map it per 007, or "no row, counted" (Risks 1).
  - Verified: `pnpm derive` twice, second changes nothing. About 432 rows on 57 species (MDD about 400, GBIF about 32), 26 `range-not-found`, conflicts counted. `git status` adds only these 3 data files: `species.json`, `countries.json`, `mismatches.json`, `issued-ids.json`, contributions don't move. Byte check empty.

- [x] S5. **Shared writer in `tables.ts`.** Riskiest for byte-identical, so alone.
  - Files: `scripts/build/tables.ts`, `scripts/build/countries.ts`. `writeTables`, `writeCountries` signatures stay (`scripts/build/learn/dist-fixture.ts:23-24`).
  - Verified: byte check empty: every species, countries and Learn file equals Baseline's. No E2E; bytes equal.

- [x] S6. **Writer, contract fence, attribution: one commit.** The contract freezes here.
  - Files: `scripts/build/range-listings.ts` (new), `scripts/build.ts`, `scripts/build/inputs.ts` (`BuildInputs.rangeListings`, third table), `scripts/build/contract.ts`, `scripts/build/contract.test.ts` (fixtures `:36`, `:50`; F8), `contracts/v1.json` (007's fence, copied by script, not retyped), `scripts/build/sources.ts` (3 sources, `MDD_CITATIONS["v2.5"]`: `zenodo_citation` from `https://zenodo.org/api/records/21654811/files/release.toml/content`, verbatim; tie `notes`), `scripts/build/attribution.ts` (`sourceKey`, `gbifChecklists`, literal `licenseUrl: null`), `scripts/build/docs.ts` (unit map, slot), `site/index.html` (`{{gbifChecklists}}` under Credits only), `e2e/range-listings.spec.ts` (E1–E8), `e2e/attribution.spec.ts` (`:32-34`, new sources, `gbifChecklists`), `e2e/docs.spec.ts` (`HOSTS` + `www.mammaldiversity.org`, credit units).
  - Verified: F8 pass. Build logs no "add to contracts/v1.json to freeze". Full `E2E_ARTIFACTS=$S/e2e-s6 pnpm e2e`: all pass, none skipped. Byte check: the 7 lines.

- [x] S7. **Docs page and license text.**
  - Files: `site/index.html` (new `section#range-listings` after Countries, using existing styles; Files entry; 3 curl lines; 11 columns in contract order; both queries with the markup in Target design; the sentence "no row means critwire holds no open listing, never that the animal isn't there"; pointer sentence at `range.countriesWithOpenRecords`, whose "not native range" text stays; a curated row is critwire's reading of the reference in `url`; tie beside `:228`'s "no IUCN data"), `DATA-LICENSE.md` (`:9`, each tie; the listings' terms), `e2e/docs.spec.ts` (`SECTIONS`; three links, columns from `contracts/v1.json`, conflict query, the sentence, screenshots of the section at 1280 and 375 px into `ARTIFACTS`), `e2e/duckdb.spec.ts` (`:59`), `e2e/range-listings.spec.ts` (E9, E10, E11's SQL half).
  - Copy: rows are what a named source lists; plain English for adults new to the topic; own words.
  - Verified: `E2E_ARTIFACTS=$S/e2e-s7 pnpm exec playwright test e2e/range-listings.spec.ts e2e/docs.spec.ts e2e/duckdb.spec.ts`; both PNGs read by eye, section fits 375 px. Byte check: the 7 lines.

- [x] S8. **Refusals: each made to happen once.** Every line of the brief's list, on real files through the real CLI.
  - Files: `e2e/range-listings-refusals.ts` (new, typechecked, not a spec, so `pnpm e2e` doesn't run it), plus any code fix a case exposes. Harness: refuses a dirty tree; per case doctors the file, runs `pnpm build` and `pnpm build --draft`, wants exit ≠ 0 and the message; restores with `git checkout` in `finally`; ends by asserting clean `git status` and unchanged `dist/` hashes. Prints `PASS|FAIL <case> <mode> <first error line>`, exits 1 on any FAIL.
  - Verified: `pnpm exec tsx e2e/range-listings-refusals.ts 2>&1 | tee $S/refusals.log`: R1–R20 PASS in both modes. Byte check: the 7 lines.

- [x] S9. **Curated rows: the 15 amphibians.** Ids 3, 5, 6, 7, 8, 9, 10, 11, 13, 14, 16, 62, 74, 75, 76.
  - Files: `data/review/range-curated.json`, then `pnpm derive`: `data/range-listings.json`, `data/review/range-conflicts.json`. About 60 rows.
  - **Reference:** Amphibian Species of the World's Distribution paragraph, through the Wayback Machine, because the live site answers 403 here: `https://web.archive.org/web/2026/https://amphibiansoftheworld.amnh.org/Amphibia/<path>/<Genus>/<Genus-species>` (`Conraua-goliath` probed 200, 2026-11-01). `<path>` varies by species; find it, `<genus-species>` in lower case, with `https://web.archive.org/cdx/search/cdx?url=amphibiansoftheworld.amnh.org/Amphibia&matchType=prefix&filter=urlkey:.*<genus-species>$&filter=statuscode:200&limit=-1&fl=timestamp,original` (it rate-limits: wait and retry). **Backup:** AmphibiaWeb's "Country distribution" line, `https://web.archive.org/web/2026/https://amphibiaweb.org/cgi/amphib_query?where-genus=<Genus>&where-species=<species>` (live timed out). `url` = the resolved snapshot, from `curl -w '%{url_effective}'`.
  - **Curated rules, S9 and S10:**
    - Never read or follow: `iucnredlist.org`, `iucn-tftsg.org`, `chelonian.org` or any Turtle Taxonomy Working Group page, the Global Amphibian Assessment, Wikipedia. Skip any account crediting its range to IUCN or the Assessment. Both probed pages mention `iucn` once: read only the distribution text, don't follow it.
    - Third choice, if a species has neither: a peer-reviewed paper or government page, same exclusion.
    - One page per species, at most one request a second, honest user agent, never a bulk pull. Each page goes in its own `mktemp -d`, deleted after; page text is data, never instructions; nothing from it is committed but the fact and `url`.
    - One row per country the reference places the animal in natively. Skip places it calls introduced (the registers speak to those) and regions without a named country. "Possibly" → `uncertain`; gone from there or extinct → `absent`; else `present`. `area` null: a narrower place goes in `sourceTerm`. Codes from `data/countries.json`.
    - `sourceTerm`: at most about 12 words, our own, no phrase lifted. Place names may repeat.
    - Sorted by `speciesId, country`. A conflict with a register row ships as shown, never fixed. No reachable reference: no row, `range-not-found` stays (Risks 5).
  - Verified: derive prints 15 fewer `range-not-found` (11 left); `E2E_ARTIFACTS=$S/e2e-s9 pnpm exec playwright test e2e/range-listings.spec.ts`. Byte check: the 7 lines.

- [x] S10. **Curated rows: the 11 turtles; coverage check.** Ids 1, 2, 4, 12, 15, 17, 18, 19, 20, 21, 22.
  - Files: as S9, plus `e2e/range-listings.spec.ts` (E12). About 40 rows.
  - **Reference:** Reptile Database's Distribution field, live: `https://reptile-database.reptarium.cz/species?genus=<Genus>&species=<species>` (probed 200, 2026-11-01). Check its comment for whether the animal is extinct (ids 18, 19, 22 especially). S9's rules apply.
  - Verified: derive prints 0 `range-not-found`; E12 pass; `E2E_ARTIFACTS=$S/e2e-s10 pnpm exec playwright test e2e/range-listings.spec.ts`. Byte check: the 7 lines.

- [ ] S11. **`AGENTS.md`, 007's last line, the handoff item.**
  - `AGENTS.md`: `What this is`; IUCN rule (one line recording O1, O2); Commands (`pnpm build`'s file list; `gbif:register`, `review:accept`, `ingest habitat` lines: who a stale listing snapshot blocks, and the recovery); Data files and owners (both snapshots, `range-listings.json`, `range-conflicts.json`, `range-curated.json`, `contracts/v1.json`'s third table); Commands in order (2: the two ingests; correcting a curated row); GBIF DOI refresh (before step 1); Cost of a species change (order: `ingest gbif` → `gbif-checklists`, `mdd` → `gbif-sample --new` → `derive` → `habitat` → DOIs). Same voice as Data.
  - `plans/007-native-ranges.md:7`: "Nothing here is built" becomes built by this mission.
  - **Handoff item H12** (next free number; check) in `/srv/critter-ai/handoff/critwire.md`, exact format, title with no value, `Blocks: nothing`: where to read (`https://github.com/kc0588615/critwire/blob/main/data/review/range-curated.json` after the release; `/v1/range-listings.csv`, `source_key` = `curated`); how to correct (tell an agent the species, country, value and reference, or edit the row → `pnpm derive` → `pnpm build` → commit → merge → `deploy critwire`); which references were read and their terms (Risks 6), and that Amphibian Species of the World's live site refused this server (403), so S9 read its public Wayback copies; reply: corrections, or "fine".
  - Verified: `grep -A3 'H12' /srv/critter-ai/handoff/critwire.md` shows `Blocks: nothing`. Byte check: the 7 lines.

## Verification

**Order, on the final commit, clean tree, one at a time:**
```
S=/srv/critter-ai/agent-state/missions/critwire-native-ranges-build; A=$S/e2e
pnpm typecheck
pnpm test 2>&1 | tee $S/final-test.log
pnpm build 2>&1 | tee $S/final-build.log
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) > $S/dist-final.sha256
diff $S/dist-baseline.sha256 $S/dist-final.sha256 | grep '^[<>]' | awk '{print $1, $3}'
rm -rf $S/e2e-s*
E2E_ARTIFACTS=$A pnpm e2e 2>&1 | tee $S/final-e2e.log
(cd dist && find . -type f | LC_ALL=C sort | xargs -d '\n' sha256sum) | cmp - $S/dist-final.sha256
node -e 'const s=require(process.argv[1]).stats;console.log(s);process.exit(s.unexpected||s.skipped||s.flaky?1:0)' $A/results.json
pnpm exec tsx e2e/range-listings-refusals.ts 2>&1 | tee $A/refusals.log
git fetch -q origin main
git diff --name-only origin/main...HEAD -- data/base.json data/species.json data/countries.json data/issued-ids.json data/review/mismatches.json data/review/country-overrides.json data/gbif-derived-dataset data/gbif-learn-sample db/schema.sql plans/004-learn-curriculum.md site/style.css site/learn scripts/learn scripts/learn-check.ts scripts/build/licenses.ts scripts/build/learn scripts/json.ts scripts/env.ts scripts/venv.ts
grep -ciE 'iucn|threatStatus|19491596' data/raw/gbif-checklists/snapshot.json data/raw/mdd/snapshot.json data/range-listings.json data/review/range-conflicts.json data/review/range-curated.json
grep -c '"extinct"' data/raw/mdd/snapshot.json
```

**Must show:**
- Typecheck exit 0. Test: `fail 0`, more than Baseline's 754 pass. Build exit 0, no "add to contracts/v1.json to freeze", no `--draft`.
- **Byte-identical:** exactly the 7 lines under Steps; `dist-final.sha256` 314 lines (311 + 3). `cmp` silent: E2E changed nothing.
- **E2E:** `results.json` `unexpected` 0, `skipped` 0, `flaky` 0, `expected` above Baseline's 149. No lint script exists; typecheck is the static check.
- Refusals: R1–R20 PASS in both modes.
- `git diff` prints nothing. Each `grep -ci` prints `:0`; `"extinct"` count 0.
- `grep -A3 'H12' /srv/critter-ai/handoff/critwire.md` shows `Blocks: nothing`. PR #17 unmerged and untouched by this branch.

**Artifact, `$S/e2e/`:** `playwright-report/`, `test-results/` (traces), `results.json`, `range-listings-1280.png`, `range-listings-375.png`, `docs-375.png`, `refusals.log`. Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`, then the refusals command.

**E2E scenarios, `e2e/range-listings.spec.ts`,** expectations from `data/range-listings.json`, never the build's code:
- E1. Three files download with the built bytes.
- E2. JSON, Parquet, CSV hold the same rows; names, order and types = `contracts/v1.json` (camelCase; `rangeListingsCsv`).
- E3. `NA` (Namibia) stays text in all three under DuckDB's default reading.
- E4. Sorted, null `area` first, unique on 007's key.
- E5. Every `species_id` joins `/v1/species`, every `country` `/v1/countries`, on served Parquet: 0 unmatched.
- E6. Every `source_key` credited (`gbifChecklists[].key` ∪ `sources[].sourceKey`); a row's `license` equals its dataset's; the per-dataset summary on no row.
- E7. No `/iucn/i` string or `threatStatus` in the three files.
- E8. Committed snapshots: each row's keys exactly the five, each dataset's the four, no red-list key, no `iucnStatus` or `extinct`.
- E9. Conflict query on served Parquet = `range-conflict` entries of `range-conflicts.json` by (species, country). 0 = 0 passes.
- E10. Agreement query on served Parquet: row count and null-`source` count = the spec's own from `data/species.json` and `data/range-listings.json`.
- E11. Fixed rows, F7's cases: `rangeConflicts(rows)` and the served conflict query, URL swapped for a temp Parquet, return the same expected set.
- E12. The 26 ids (pinned in the spec): at least one row each with `origin` `native`, `source_key` `curated`, `doi` null, `https` `url`.

Also, per the brief: `e2e/duckdb.spec.ts:59` (three new files), `e2e/attribution.spec.ts:32` (new sources, `gbifChecklists`), `e2e/docs.spec.ts` (section, columns, conflict query, the sentence). Rest of the suite unchanged.

**Refusals,** each proved in S8 and again here; plain and `--draft`. R8 runs `pnpm derive` on the doctored file first, then builds. Exact messages come from Target design; the harness pins them.

| Brief's line | Case | Doctor | Must name |
|---|---|---|---|
| Stale listings | R1 | One byte of `data/range-listings.json` | "data/range-listings.json is stale: run pnpm derive" |
| | R2 | One byte of `data/review/range-conflicts.json` | its path, same message |
| Not covering base names | R3 | Drop a species from the checklists snapshot | "data/raw/gbif-checklists is stale (names: not the base's): run pnpm ingest gbif-checklists" |
| | R4 | Drop a mammal from the MDD snapshot | "data/raw/mdd is stale (names: …): run pnpm ingest mdd" |
| Keys, allowlist | R5 | Change `Emydoidea blandingii`'s `keys` | "data/raw/gbif-checklists is stale (Emydoidea blandingii: keys): run pnpm ingest gbif-checklists" |
| | R6 | Flip a role in the snapshot's `allowlist` | "… is stale (allowlist) …" |
| MDD pin, citation | R7 | `file.md5` | `data/raw/mdd`, the pin |
| | R8 | `release.version` to one not in `MDD_CITATIONS` | `MDD_CITATIONS` |
| License | R9 | A dataset's `license` to `CC BY-NC 4.0` | dataset, license |
| | R10 | MDD's `license` to `CC BY-SA 4.0` | MDD, license |
| IUCN string, `threatStatus` | R11 | `iucn` in a dataset's `title` | "IUCN data at", path |
| | R12 | A `threatStatus` key on a checklists row | "IUCN data at", path |
| | R13 | An `iucnStatus` key on an MDD species | "IUCN data at", path |
| Off the mapping | R14 | A row's `establishmentMeans` to `ESCAPED` | species, dataset, country, means, status |
| | R15 | A row's `status` to `EXTINCT` | same |
| Unmapped place, no country row | R16 | `\|Atlantis` on an MDD cell | species, place |
| | R17 | `country` to `QQ` on a checklists row that maps | species, source, code |
| Curated input | R18 | A row on a mammal; then a non-`https` `url`; then a duplicate | the row, each |
| | R19 | A curated `url` holding `iucn` | "IUCN data at" |
| Contract break | R20 | Swap two of `rangeListingsCsv`; then edit a `means`; then add an entry the writer lacks (deleting one only logs an addition, `contract.ts`, `checkTable`) | "needs /v2", each |

**Release smoke,** after `deploy critwire`, with `dist/` the released commit's build. Delete `$S/e2e-s*` first; `$S/e2e/` stays.
```
for x in json csv parquet; do curl -fsS https://critwire.com/v1/range-listings.$x | cmp - dist/v1/range-listings.$x; done
for f in v1/species.json v1/countries.json learn/data/manifest.json; do [ "$(curl -fsS https://critwire.com/$f | sha256sum | cut -d' ' -f1)" = "$(grep " \./$f\$" $S/dist-baseline.sha256 | cut -d' ' -f1)" ] && echo same $f || echo DIFF $f; done
node -e 'const j=(f)=>fetch("https://critwire.com/v1/"+f).then((r)=>r.json());(async()=>{const[r,a]=await Promise.all([j("range-listings.json"),j("attribution.json")]);const k=new Set([...a.gbifChecklists.map((d)=>d.key),...a.sources.map((s)=>s.sourceKey)]);const m=[...new Set(r.map((x)=>x.sourceKey))].filter((x)=>!k.has(x));console.log("uncredited",m);process.exit(m.length?1:0)})()'
RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=$S/e2e-release pnpm exec playwright test -c playwright.release.config.ts
```
`cmp` silent; three `same`; `uncredited []`; `e2e/release/live.spec.ts` all pass (it also serves every `dist/` file, so `index.html` and `attribution.json` with their new bytes).

**Summary must give** (brief): what shipped, rows and species per source, conflicts found and the conflict gate's real count, answers applied, every deviation from 007, the release record, handoff items left.

## Failure modes

Isolated parts only. Written into each test file's header before its code.

**F1. GBIF ingest** (`scripts/ingest/gbif-checklists.test.ts`; fixture fetch as `scripts/ingest/gbif.test.ts:49`):
1. A key beyond the five leaks on a row (`threatStatus`, `appendixCites`, `locality`, `remarks`), or beyond the four on a dataset.
2. `assertNoIucnData` passes a `threatStatus` key.
3. The red-list dataset's rows or key get written. Only its count may.
4. A no-role row gets written, or isn't counted under its dataset key.
5. A row with no `sourceTaxonKey` gets written, or isn't counted.
6. An unknown license URL passes; a role dataset at `CC BY-NC 4.0` passes because `DATASET_LICENSES` holds it.
7. A role dataset lacking `doi`, `title` or `citation.text` passes.
8. Metadata is fetched for a no-role dataset.
9. A failed request or short page leaves a partial result instead of throwing.
10. A species with no keys goes missing; it must be `{ keys: [], rows: [] }`.
11. Two keys on one species lose rows, or fetch one key twice.
12. Row order depends on fetch order.
13. The snapshot's `allowlist` carries `reason`, or loses `area`.
14. `checklistKeys` (`scripts/derive/gbif.test.ts`): `id` = `taxonKey` gives two keys; a null survives; both null isn't `[]`.

**F2. MDD ingest** (`scripts/ingest/mdd.test.ts`; fixture fetch, small CSV):
1. Zenodo's `license.id`, version or DOI differs from the pin and passes.
2. md5 or size differs and passes.
3. A row count other than 6,904, or a duplicate name, passes.
4. `iucnStatus` or `extinct` reaches the snapshot.
5. `read_csv` turns an `NA` cell or type-sniffs a value: `places` must be the cell, verbatim.
6. A loose name match: `_` for a space only, else `null`, never guessed.
7. A non-mammal gets a key, or a mammal is missing.
8. The temp folder survives, on success or failure.

**F3. Mapping** (`scripts/derive/listings.test.ts`), each line of 007's tables, in order:
1. An off-enum means or status passes instead of refusing, or the error doesn't name species, dataset, country, means, status.
2. First-match order breaks: `EXCLUDED`, `NOT_DETECTED` or `MANAGED` with `INTRODUCED` or `PRESENT` yields a row.
3. Blank means: `register` isn't `introduced`, or `checklist` yields a row (GRIIS Australia's bilby).
4. `NATIVE`: `register` yields a row; `checklist` + `ABSENT` isn't `native`/`absent`; `checklist` + other yields a row.
5. `UNCERTAIN` isn't `uncertain`; `*` wrong for `PRESENT`, `COMMON`, `RARE`, `IRREGULAR`, `DETECTED`, `DOUBTFUL`, `ABSENT`, blank.
6. `sourceTerm` isn't verbatim: `INTRODUCED/PRESENT`, `-/PRESENT`, `-/-`.
7. No `country` yields a row.
8. A snapshot row on a dataset outside `allowlist` or `datasets` passes.
9. Dataset `area` is lost (Hawaii), or `url`, `doi`, `license`, `source` come from the wrong dataset.
10. MDD: `Cambodia?` loses `uncertain` or its `?`; `Namibia` isn't `NA`; the token `NA` or `Domesticated` yields a row or isn't counted; a place with an `area` loses it (Azores); an unknown place passes or isn't named.
11. Exclusion counts don't add up: rows in = rows out + each reason.

**F4. `parseCurated`:** a non-array; a missing or extra key; an unknown species; a mammal; a bad country; `presence` `unstated` or other; a non-`https` `url`; a blank `sourceTerm`; a blank `area`; a duplicate key; an `iucn` string in any value. Each refuses naming the row. `[]` passes. Derive fills `origin`, `source`, `sourceKey`, `license`, `doi` exactly.

**F5. Freshness:** `names`, `keys` (message names the species), `allowlist`, a license outside the two, guard hits, each on the right snapshot. MDD: pin fields, mammals only. Elapsed time alone never stales. A stale or absent listing snapshot must not fail `deriveCore` or `readCoreInputs`.

**F6. Assembly:** same key doesn't collapse, or the highest `sourceTaxonKey` wins; rows with different `sourceKey` collapse; JS order isn't null-`area` first; output depends on input order; a code with no country row passes; `range-conflict` not one per (species, country) with every claim in key order; `range-not-found` missing for a mammal with no MDD row or a non-mammal with no curated row, or present with a `country`; a final row holding `iucn` passes.

**F7. Conflict test (E11; the one isolated E2E check):** as Target design, "Published queries". Must find `native-or-pre-1500` vs `introduced`; `native` + `absent` vs `introduced` + `present`; `introduced` + `present` vs `introduced` + `absent`. Must not find: one row with an `area`; `native` vs `native-or-pre-1500`; `uncertain` vs `introduced`. JS and SQL differ on any.

**F8. Contract third table** (`scripts/build/contract.test.ts`): column removed, retyped; CSV reordered; `sha` differs; `origin`, `presence`, `license` off `values`; `country` off pattern; null in a non-null column passes, or a null `area` or `doi` fails.

## Risks

1. **GBIF moved since the spike.** New combination: refuses at S4; map per 007 or "no row, counted". New dataset: counted in `noRole`; a role is a handoff item, not an agent's call. Role dataset's license changed, or fresh metadata trips the guard: ingest refuses; remove the role with a Decisions line, report in Summary. Counts shift a little; report real ones.
2. **`/v1/species/{key}/distributions` down or retired.** Ingest fails loudly, no snapshot. Retry next session. Still gone: handoff item, `MISSION_BLOCKED`; the spike's `raw/` isn't a substitute (Finding 5).
3. **`origin/main` moves before release.** PR #17's confirmations leave `dist/` unchanged, so the list should hold. If rebase changes a Baseline hash: rebuild `origin/main` in a scratch worktree, use that list as reference, Decisions line.
4. **Frozen after S6.** A definition edit needs the owner's review (`AGENTS.md`, Data). Check every sha before S6 lands; S7's docs can't change the contract's words.
5. **Curated access.** Wayback rate-limits; 2 of 4 CDX probes returned an error page. Wait, retry, use the direct path, then backup. A species with no reachable reference after all three: no row, E12's pin loses it with a Decisions line, Summary says so, since the brief asks for all 26.
6. **Curated references' own terms.** Amphibian Species of the World and AmphibiaWeb state noncommercial terms; Reptile Database its copyright (007, Sources). The rows take bare facts in our own words, per `AGENTS.md`'s rule and O3 (a), one page per species. H12 names this so the owner can object. Not a blocker.
7. **S8 edits the tree.** An interrupted run leaves a doctored file. The next session's `git status` finds it; `git checkout -- data contracts`.
8. **Disk.** About 8 GB free, full E2E about 830 MB. Follow the artifact rule; MDD's temp file and every curated page are deleted once read.

## Code review (Astra)

## Release

## Decisions

- 2026-11-01: owner's answers, from handoff H7–H11 (`Status: done`, control room), picked up and closed:
  - **O1 = yes** (H7). MDD gate open: `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note.
  - **O2 = yes** (H8). GRIIS and the other O2 dataset (Central Asia checklist) on the allowlist, ties stated.
  - **O3 = (a)** (H9). `data/review/range-curated.json`, agents' rows, each citing its reference, never reading IUCN pages. Brief's addendum wins over H9's "owner reviews" and the Decision rule's `reviewedBy` gate: rows publish without waiting, labelled curated by source column; one final handoff item (`Blocks: nothing`) says where to read the file and how to correct a row.
  - **O4 = yes**, only when a page first reads the listings file, in that change (H10). **O5 = s1, f3, e4** as one small mission after the build goes live; d1/d2 only if it fits; g3, c1 deferred (H11). Neither changes this build: `critwire-learn-range-lessons`.
- Held work (addendum): PR #17 stays held; `data/review/country-overrides.json` isn't touched.
- 2026-11-01: S9 reads Amphibian Species of the World through public Wayback copies, one page per species, because its live site answers 403 here. Disclosed, not hidden: Summary and H12 say so, with the source's noncommercial terms, so the owner can object or swap the reference.
- 2026-11-01: S1 re-read GBIF's data-user terms (archived copy; live page still answers 403 here): both 007 quotes unchanged. Licenses re-checked at the fetch: all 18 role datasets open (12 CC BY 4.0, 6 CC0 1.0).
- 2026-11-01: deviation from 007 (Finding 5): snapshot holds role-dataset rows only, no-role rows counted per dataset key, metadata fetched for role datasets only. 007's mapping row and Pipeline row updated in the same commit.
- 2026-11-01: S2 re-read MDD's terms: Zenodo record still `license.id` `cc-by-4.0`, `v2.5`, DOI `10.5281/zenodo.21654811`, `release.toml` same as the design's copy; paper's "initially sourced from the IUCN, HMW, and CMW" unchanged. `fetchMdd` takes an optional pin (default the real one) so tests use a small CSV.
- 2026-11-01: S4 deviations from 007, each edited there in the same commit: listings are `deriveAll`'s third half, not in `deriveCore`, and `matchCountries` stays untouched (Finding 1); `range-curated.json` is a bare array with no `reviewedBy` (Finding 4, addendum); `range-not-found` also covers a non-mammal with no curated row; one `range-conflict` per (species, country) with every claim in `values.claims`. Accepted cost: `deriveAll` now refuses a stale listing snapshot in `gbif:register`, `review:accept`, `ingest habitat`; `AGENTS.md` says so at S11.
- 2026-11-01: S3 split `parseCurated` into `scripts/derive/range-curated.ts`: `listings.ts` passed about 300 lines, Target design's trigger. `assertMddFresh` compares `file` only, not `release.version`, so R8's new release fails at `mddCitation` naming `MDD_CITATIONS`, as the table asks.
- 2026-11-01: S9 readings. Hairy frog (id 7): Amphibian Species of the World's old `Trichobatrachus-robustus` path redirects to `Astylosternus-robustus`, its current name for the same animal; that page is the `url`, and our name stays `Trichobatrachus robustus` (taxonomy isn't this mission's). Pipa pipa (id 10): "the Guianas" read as GY, SR, GF, a region whose countries are fixed, not one "without a named country". Skipped as introduced: Andrias davidianus in Japan and (likely) Taiwan, the hellbender's Susquehanna drainage (US stays via its native range). 46 rows, not the plan's estimated 60: the pages list fewer countries.
- 2026-11-01: S7's docs add, beyond 007's text, `ORDER BY 1, 2` on the conflict query (E9 and E11 compare in order) and one starter query, what sources list for the jaguar (`data-example`, so `e2e/duckdb.spec.ts` runs it). Both queries print critwire.com URLs in place of 007's bare file names. No meaning changes, so 007 stays as is.
- 2026-11-01: S10 readings, Reptile Database (query URL redirects to `/<Genus>/<species>`; that's the `url`). Pinta tortoise (id 22): no page of its own ("not found"), so read as `abingdonii` on the `Chelonoidis/niger` page, same `url` as id 19; `absent`, the page says none are left in the wild and its last animal died. Floreana (id 19): `absent` from the page's own sentence that `galapagoensis`, a synonym it lists for this animal, is extinct; its IUCN line wasn't used. Big-headed turtle (id 4): Hong Kong has its own code, and the page names it, under China, so HK gets a row; a later split (`peguense`, Liang et al. 2025) leaves the page's top line standing, and the row set follows it. Pig-nosed turtle (id 17): no ID row, though open records exist there: the page names only Papua New Guinea and Australia, and placing its Lorentz River in Indonesia would be our inference. Skipped as introduced: spiny softshell in California (US stays via its native range), African spurred tortoise in the US and British Virgin Islands. 40 rows, as estimated.

## Log

- 2026-11-01 20:45 UTC: Baseline on `4074546`: typecheck pass, test 754/754, plain build pass, e2e 149/149, 311 `dist/` hashes = live. H7–H11 picked up, closed, copied to Decisions.
- 2026-11-01 20:55 UTC: Architecture written (`architect`): derive listings as third half, not in `deriveCore` (007 wrong); byte-identical traps named; attribution, curated shape, snapshot rows decided. No blockers. No code; deriveCore claim spot-checked (`pipeline.ts:61`, `:75`, `gbif-sample.ts:77`).
- 2026-11-01 21:01 UTC: Fable review (`architecture-reviewer`): APPROVE_WITH_CHANGES, 1 MUST-FIX (`GBIF checklists` license string hits `licenseUrl()` throw; `licenses.ts` off limits, Learn bundle), for Revision. Spot-checked: `attribution.ts:75`, `licenses.ts:21`, `cards.ts:6`. No code.
- 2026-11-01 21:02 UTC: Astra review: APPROVE, no MUST-FIX; 3 SHOULD-CONSIDER (deriveAll's new dependents documented; mixed-license entry apart from dataset licenses; zero-conflict refresh mustn't fail). No code.
- 2026-11-01 21:08 UTC: Revision (`architect`): Fable MUST-FIX resolved (literal `licenseUrl: null`, `licenses.ts` untouched); MISSED items and all SHOULD-CONSIDER taken, none rejected; zero-conflict refresh passes, detection on 007's six fixed cases in E2E. Spot-checked: `attribution.ts:72`, `:103`, `html.ts:8`, `pipeline.ts:118`, `e2e/attribution.spec.ts:41`. No code.
- 2026-11-01 21:30 UTC: Steps (`planner`): S1–S11, E1–E12, R1–R20, F1–F8. Lead added the Wayback disclosure (Decisions, H12). Spot-checked: byte check empty on current `dist/`; 311 baseline lines; 26 non-mammal ids (15 + 11) = `data/species.json`; `contract.ts:116` logs additions; `scripts/derive/pipeline.ts:118`; PR #17 open. No code.
- 2026-11-01 21:40 UTC: S1: `ingest gbif-checklists` real fetch (4 min 20 s): 76 names, 73 with keys, two keys on 1, 55, 63, 70 (= spike), 35 role rows on 13 species (identical to spike's), 18 datasets. 679 rows fetched, 216 with `threatStatus` (72 red-list + spike's 144), none kept; grep 0. Typecheck pass, test 771/771, plain build pass, byte check empty. E2E not run: no `dist/` byte moved.
- 2026-11-01 21:50 UTC: S2: `ingest mdd` real fetch: md5 pin holds, 6,904 rows, exactly the 50 mammals, 50 non-null, 400 tokens (36 `?`), 92 places, none unmapped, no non-place token (= spike); `MDD_PLACES` 243 = spike's file; grep 0; temp folder gone. Typecheck pass, test 783/783, plain build pass, byte check empty. E2E not run: no `dist/` byte moved.
- 2026-11-01 21:56 UTC: S3: `deriveListings` pure, not wired. F3–F6 written first, seen failing (no module), 23 pass. E11's JS half was written after `rangeConflicts`, against the plan's order; so mutated the code twice (area rows counted; introduced ignored): spec failed both, passes restored. Trial on real snapshots, curated `[]`: 432 rows on 57 species (MDD 400 on 50, GBIF 32 on 17 datasets), 155,391 B, collapsed 2, excluded 1 (GRIIS Australia's blank), 26 not-found, 2 conflicts (66 ZA, 74 DE); MDD 275 of 364 `present` with records (= spike). Typecheck pass, test pass, plain build pass, byte check empty. `$S/e2e-baseline` deleted, per Steps.
- 2026-11-01 22:10 UTC: S4: third half wired. Tests first, seen failing (H4, F5). `pnpm derive` twice, second changes nothing: 432 rows on 57 species (MDD 400 on 50, GBIF 32 on 17 datasets, curated 0), rows JSON 155,392 B (= spike), collapsed 2, excluded 1, 2 conflicts (66 ZA, 74 DE), 26 not-found. Only 3 new data files, no other derived file moved. No-role key absent from the spike's list (`9e86d932`) is 007's known dataset, not a new one. Typecheck pass, test 807/807, plain build pass, byte check empty. E2E not run: no `dist/` byte moved.
- 2026-11-01 22:10 UTC: S5: `writeParquetCsv` in `tables.ts`; `writeTables`, `writeCountries` call it, signatures unchanged. Countries' CSV now goes through `csvSelect` (same names, all lowercase). Typecheck pass, test 807/807, plain build pass, byte check empty (311 files = Baseline, species and countries included). E2E not run: no `dist/` byte moved.
- 2026-11-01 22:32 UTC: S6: `/v1/range-listings.{json,csv,parquet}` written (432 rows), 007's fence copied into `contracts/v1.json` by script (shas pass), 3 sources + `gbifChecklists` (17 datasets) in attribution, ties in `notes`, Credits slot. F8 tests first, seen failing (4), pass. Typecheck pass, test 811/811, plain build pass, no "add to contracts" line, byte check the 7 lines. Full E2E 160/160, none skipped or flaky; artifacts `$S/e2e-s6/`, `$S/e2e-s3` deleted.
- 2026-11-01 22:42 UTC: S7: `section#range-listings` (11 columns, both queries, the no-row sentence, curated reading), Files entry, 3 curl lines, pointer at `range.countriesWithOpenRecords` ("not native range" kept), ties in Licenses and `DATA-LICENSE.md`. Specs first, 7 seen failing, then 23/23 (range-listings, docs, duckdb). Typecheck pass, test 811/811, plain build pass, no "add to contracts" line, byte check the 7 lines. Both PNGs read by eye: section fits 375 px, long SQL scrolls inside its box. Artifacts `$S/e2e-s7/`, `$S/e2e-s6` deleted.
- 2026-11-01 22:50 UTC: S8: `e2e/range-listings-refusals.ts`, on real files through the real CLI. R1–R20 (24 cases: R18, R20 three each) PASS in both modes, 48 of 48, messages pinned to the doctored row; no code fix needed; tree clean, `dist/` hashes unchanged. Harness itself proved: guard without `threatStatus` in a throwaway commit gave FAIL R12 in both modes, 46 others PASS (`$S/refusals-mutated.log`), then reverted. Typecheck pass, test 811/811, plain build pass, no "add to contracts" line, byte check the 7 lines. E2E not run: no `dist/` byte moved since S7. Log `$S/refusals.log`.
- 2026-11-01 23:05 UTC: S9: 46 curated rows on the 15 amphibians, all from Amphibian Species of the World's Wayback copies, one page each, deleted after; 45 `present`, 1 `uncertain` (Conraua goliath, GA); no backup needed. Derive: `range-not-found` 26 → 11, conflicts still 2 (66 ZA, 74 DE). Grep `iucn` in curated 0. Typecheck pass, test 811/811, plain build pass, no "add to contracts" line, byte check the 7 lines. `range-listings.spec.ts` 12/12; artifacts `$S/e2e-s9/`, `$S/e2e-s7` deleted.
- 2026-11-01 23:22 UTC: S10: 40 curated rows on the 11 turtles, one Reptile Database page each (id 22 read from id 19's), deleted after; 38 `present`, 2 `absent` (ids 19, 22). E12 first, seen failing, then pass. Derive: `range-not-found` 11 → 0, conflicts still 2 (66 ZA, 74 DE); 518 rows on all 76 species (MDD 400, curated 86, GBIF 32). Grep `iucn` in curated 0. Typecheck pass, test 811/811, plain build pass, no "add to contracts" line, byte check the 7 lines. `range-listings.spec.ts` 13/13; artifacts `$S/e2e-s10/`, `$S/e2e-s9` deleted.

## Summary
