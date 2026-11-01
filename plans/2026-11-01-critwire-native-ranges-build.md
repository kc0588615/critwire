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
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

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
2. **Byte-identical has traps 007 doesn't name.** The data flow is sound, but editing these moves `dist/learn/` or stales every lab:
   - `site/style.css`: inlined into every Learn page (`scripts/build/learn/pages.ts:97`, `data.ts:129`). The docs section uses existing styles only.
   - `scripts/build/licenses.ts`, `scripts/build/learn/sql.ts`, `scripts/learn/cell.ts`: in the Learn bundle (`site/learn/src/cards.ts:6-8`, `engine.ts:13`), so the hashed asset moves.
   - `scripts/json.ts`, `scripts/env.ts`, `scripts/venv.ts`, `scripts/learn/*`: checker closure (`scripts/learn/freshness.ts:27`, `:170`). One byte fails plain build with "lab … is stale". So no shared helper goes in `json.ts`.
   - Computed closure: 27 files, none of the others this mission edits.
3. **Attribution is undecided for `mdd` and `curated` (`007:349`, `:249`).** The brief's E2E needs every `source_key` credited, but only GBIF keys have a join. Curated rows have no source name or credit. `GBIF checklists` needs one `license` (`scripts/build/attribution.ts:16`) over a CC0 and CC BY mix. `attribution.ts:57` throws for a registered source with no entry. `scripts/build/docs.ts:24` says "records" for anything but Natural Earth. Fix under Target design.
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
| License | `DATASET_LICENSES` (`gbif-sample.ts:51`), `OPEN_LICENSES` (`scripts/learn/sample-rules.ts:12`), `licenseUrl` |
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
| `scripts/derive/mdd-places.ts` (new) | `MDD_PLACES`, from `mdd-places.json` |
| `scripts/derive/listings.ts` (new) | Files, `readListingInputs`, `deriveListings`: freshness, curated parsing, mapping, collapse, conflicts. Pure. Split curated parsing out if it grows past about 300 lines |
| `scripts/derive/pipeline.ts` | `CoreResult.checklistKeys`, third half in `deriveAll`, two more `derivedFiles` (appended, so `species.json` stays first) |
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
- A role dataset whose license isn't one of the two, or that lacks `doi`, `title` or `citation.text`: the ingest throws, nothing written. A person removes the role, with a Decisions line.
- The red-list dataset's key is never written; only its count is.
- MDD: the Zenodo record's `license.id`, DOI and version are read each run. Refuses unless 6,904 rows and unique names. `iucnStatus` and `extinct` are never selected. The temp file lives in its own `mkdtemp` folder and is removed after.
- "Mammal" means `base[].taxonomy.class`, in both ingest and derive. `assertBaseNames` takes the filtered list unchanged.

**Derived file:** `data/range-listings.json`: `{ sources: { gbifChecklists: { retrieved, datasets: [{ key, title, license, doi, citation, rows }] }, mdd: { retrieved, release, license, rows }, curated: { rows } }, rows }`. Datasets with 0 rows aren't "used" and aren't listed (GRIIS Australia today). `data/review/range-conflicts.json`: `Mismatch[]`, `canonical: false`.

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
`deriveListings` order: freshness and guard on both snapshots → parse curated → map GBIF, MDD, curated → check each code against `core.countries.rows` → collapse, sort → conflicts, not-found → guard on rows. Printed by `scripts/derive.ts`: rows and species per source, collapsed, each exclusion's count, `dropped`, conflicts, agreement totals.

**Where each refusal lives** (all run in `pnpm derive` or before `scripts/build.ts` writes anything):

| Refusal | Where |
|---|---|
| Stale `range-listings.json`, `range-conflicts.json` | `assertDerivedFiles` (`pipeline.ts:140`), via `derivedFiles` |
| Snapshot not covering base names | `assertBaseNames` in `assertGbifChecklistsFresh`, `assertMddFresh` (`listings.ts`) |
| Keys or allowlist differ | `assertGbifChecklistsFresh(snapshot, base, core.checklistKeys)`, `isDeepStrictEqual` as `naturalearth.ts:44`, `staleSnapshot("gbif-checklists", "<name>: keys")` / `"allowlist"` |
| MDD pin | `assertMddFresh` against `MDD_FILE` |
| MDD citation | `mddCitation` in `sources.ts`, during `buildAttribution` (`scripts/build.ts:43`), before any write |
| License | Both fresh asserts, on `datasets[].license` and MDD's `license`; contract `values` again |
| IUCN string, `threatStatus` | `assertNoIucnData` at ingest and in both fresh asserts (derive doesn't re-guard snapshots today), on curated input and on final rows |
| Off-mapping value or combination | Table-driven `mapChecklistRow`, throws naming species, dataset, country, means, status |
| Unmapped place, country with no row | `mapMddPlace`, and the code check in `deriveListings`, naming the row. Replaces 007's `matchCountries` route; better message |
| Contract break | `checkV1Contract` (`scripts/build/inputs.ts`) |

**`--draft`:** nothing added and nothing lifted. `readBuildInputs` runs all of the above in both modes; `assertDois` stays the only check `--draft` lifts.

**Curated rows, no gate (addendum).** `data/review/range-curated.json` is a bare array, like `country-overrides.json`; it starts `[]`. Each element has exactly `speciesId, country, area, presence, url, sourceTerm`. Derive fills the rest: `origin` `native`, `source` `critwire curated`, `sourceKey` `curated`, `license` `CC BY 4.0`, `doi` null.
`parseCurated` refuses:
- an unknown species, or a mammal (one authority per claim);
- a bad country; `presence` other than `present`, `uncertain`, `absent`; a non-`https` `url`; a blank `sourceTerm`; a blank `area` (null or text);
- a duplicate key;
- anything `assertNoIucnData` refuses, which covers any `iucn` URL.

Coverage of the 26 is an E2E check, not a derive refusal: a future non-mammal shouldn't block a deploy. It gets a `range-not-found` entry instead, as a mammal with no MDD row does (small extension of `007:329`). The docs say a curated row is critwire's reading of the reference in `url`. Correcting a row: edit it, `pnpm derive`, `pnpm build`, deploy; that's the final handoff item's text. 007's `:466`, `:534` and the brief's rule change with this.

**Attribution:**
- Rows' `source` is the GBIF dataset title, `Mammal Diversity Database` or `critwire curated`.
- `sources[]` gains all three registered entries, always emitted, so `attribution.ts:57` holds while curated is `[]`.
- `sources[].sourceKey` (new, optional) is set on `mdd` and `curated`. The E2E join: `gbifChecklists[].key` ∪ `sources[].sourceKey`.
- `GBIF checklists`: `license` `CC0 1.0 or CC BY 4.0, per dataset`, `licenseUrl` null. `licenseLink` prints plain text (`scripts/build/html.ts:8`).
- Top-level `gbifChecklists`: `{ key, title, license, licenseUrl, doi, url, citation, rows }[]`.
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
- E2E addition: the set of (species, country) from the docs' conflict SQL equals `range-conflict` entries in `range-conflicts.json`, proving JS and SQL agree. Today at least one non-MDD conflict exists (species 74, DE), so `e2e/duckdb.spec.ts:46`'s rows > 0 holds. A refresh that empties it fails loudly; replace the example then.

**Order constraints for Steps:**
- Ingests and committed snapshots land before `deriveAll` reads them. Every real-data test goes through `readDeriveInputs`, so wiring (half, files, `range-curated.json` as `[]`) is one commit.
- Writer, contract fence and attribution land together.
- Curated rows are later commits, each with `pnpm derive`.
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

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-11-01: owner's answers, from handoff H7–H11 (`Status: done`, control room), picked up and closed:
  - **O1 = yes** (H7). MDD gate open: `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note.
  - **O2 = yes** (H8). GRIIS and the other O2 dataset (Central Asia checklist) on the allowlist, ties stated.
  - **O3 = (a)** (H9). `data/review/range-curated.json`, agents' rows, each citing its reference, never reading IUCN pages. Brief's addendum wins over H9's "owner reviews" and the Decision rule's `reviewedBy` gate: rows publish without waiting, labelled curated by source column; one final handoff item (`Blocks: nothing`) says where to read the file and how to correct a row.
  - **O4 = yes**, only when a page first reads the listings file, in that change (H10). **O5 = s1, f3, e4** as one small mission after the build goes live; d1/d2 only if it fits; g3, c1 deferred (H11). Neither changes this build: `critwire-learn-range-lessons`.
- Held work (addendum): PR #17 stays held; `data/review/country-overrides.json` isn't touched.

## Log

- 2026-11-01 20:45 UTC: Baseline on `4074546`: typecheck pass, test 754/754, plain build pass, e2e 149/149, 311 `dist/` hashes = live. H7–H11 picked up, closed, copied to Decisions.
- 2026-11-01 20:55 UTC: Architecture written (`architect`): derive listings as third half, not in `deriveCore` (007 wrong); byte-identical traps named; attribution, curated shape, snapshot rows decided. No blockers. No code; deriveCore claim spot-checked (`pipeline.ts:61`, `:75`, `gbif-sample.ts:77`).
- 2026-11-01 21:01 UTC: Fable review (`architecture-reviewer`): APPROVE_WITH_CHANGES, 1 MUST-FIX (`GBIF checklists` license string hits `licenseUrl()` throw; `licenses.ts` off limits, Learn bundle), for Revision. Spot-checked: `attribution.ts:75`, `licenses.ts:21`, `cards.ts:6`. No code.
- 2026-11-01 21:02 UTC: Astra review: APPROVE, no MUST-FIX; 3 SHOULD-CONSIDER (deriveAll's new dependents documented; mixed-license entry apart from dataset licenses; zero-conflict refresh mustn't fail). No code.

## Summary
