---
mission: critwire-native-ranges-design
project: critwire
branch: agent/critwire-native-ranges-design
status: active
started: 2026-11-01 17:41 UTC
---

# Mission: critwire, research native and introduced ranges (design only)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-native-ranges-design.md
     Start: started by the chain after critwire-learn-qa is released (base: main).
     Owner, 2026-11-01: "do everything" from the list of next work; third of three chained critwire missions.
     From plans/001-mvp.md "Later": native / introduced / historical range from a source critwire may use (not IUCN). -->

### Goal

A tested design, in `plans/007-native-ranges.md`, for adding **native, introduced and historical range** to critwire's 76 species from sources critwire is allowed to publish. That would sit alongside today's "countries with open records", which are not range.

The design covers:
1. **Sources**, each with its **license quoted from the source, with its URL**, its coverage of the 76 species (measured, not guessed), its spatial unit (country, region, polygon), and its terms on republishing. Candidates:
   - COL distributions (ChecklistBank)
   - GBIF species profiles and checklist distributions, such as GRIIS (the Global Register of Introduced and Invasive Species)
   - GBIF occurrence fields `establishmentMeans` and `degreeOfEstablishment`
   - Wikidata (endemism and range properties)
   - Natural Earth and RESOLVE as the spatial units
   - any other open source found

   **IUCN data is never used** (critwire's rule). Record why a source is rejected.
2. **The data model:** a new field or file. The `/v1` rule holds (additions only), so: what shape it takes; how native, introduced and uncertain are told apart; how sources conflict and how a conflict is shown; and how it relates to `range.countriesWithOpenRecords` without replacing it.
3. **A spike:** fetch the top two sources for all 76 species (read-only, ≤ 2 req/s) and measure coverage and agreement. Record every result in the plan, with the evidence kept in the mission folder.
4. **Learn tie-in:** where this data would add a lesson or improve an existing one, such as s1's sampling bias or g3's spatial joins.
5. **A ready-to-start build brief** in `plans/briefs/`, sized to finish well within 60 sessions.
6. **For the owner:** choices only the owner can make, each with a recommendation.

### Why

Players and learners want to know where an animal naturally lives, not only where open records exist. critwire's MVP plan deferred this to "its own research step". The owner asked for it now.

### Scope

In: `plans/007-native-ranges.md`, the build brief, and spike code and data in the mission's state folder (never in the repo).

Out:
- Any change to `scripts/`, `data/`, `site/` or `/v1`: `dist/` must stay byte-identical, which is checked at Baseline, at Verification and in the release smoke.
- IUCN data; Wikipedia prose.

### Definition of done

- `pnpm typecheck` and `pnpm test` pass, and `dist/` is unchanged.
- Every source has its license quoted with its URL.
- The spike's coverage numbers are in the plan, with the commands to reproduce them.
- The build brief exists.
- The Summary gives the recommended source(s), the coverage, the data shape and the owner's choices.

### Decision rules

- **Licenses decide.** If a source's terms are unclear, it isn't used.
- Prefer one good source over a merge of many. If merging is needed, say how conflicts are shown.
- Keep it simple; at most 20 steps.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-01 on `e1f4461` (`origin/main` `40a0274` + mission start), db `critwire_dev` (`.env`). Script and logs: `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/` (`baseline.sh`, `baseline-*.log`, `baseline-summary.txt`).
- `pnpm install --frozen-lockfile`: up to date. `pnpm learn:venv`: ok. No migrations (build rebuilds `db/schema.sql` tables each run). No lint script; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 754/754 pass (3.1 min).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,558 B, committed lab data 18,822,906 B (cap 120,000,000 each).
- `pnpm e2e`: 149/149 pass (11.0 min); artifacts `.../critwire-native-ranges-design/e2e-baseline/` (827 MB). Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- `dist/` hashes: 311 files, list `.../critwire-native-ranges-design/dist-baseline.sha256` (list's sha256 `349935ae916c4308…`); unchanged after E2E; live `/srv/apps/critwire/.live` identical (`cmp` clean). **This list is the byte-identical reference for Verification and the release smoke.**
- Not run: `pnpm test:db` (24 min), `pnpm learn:check` (9 min): brief's Baseline doesn't name them, and this mission changes no code; plain build already refuses a lab not proven as committed.
- Working tree clean after. Handoff: H3, H6 waiting on owner, neither blocks this mission; no `Status: done` items.

## Architecture

Evidence: `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/arch-probe/` (`probe-commands.txt`, `sample-summary.json`, `col/`, `gbif/`, `mdd/`, `wikidata/`, `terms/`, `papers/`, `gard/`, `amphibiaweb/`). Probed 2026-11-01, read-only, ≤ 2 req/s, 19 species for GBIF rows and fewer elsewhere; the full 76 is the spike. IUCN content arrived inside raw responses; it was read to learn how to detect it, then removed from the saved files (19 rows, 11 usage records, `threatStatus`, MDD's and AmphibiaWeb's status columns, Wikidata's status claims; counts kept).

Live pages on `www.gbif.org`, `www.catalogueoflife.org` and `www.inaturalist.org` answered 403, `amphibiansoftheworld.amnh.org` a CAPTCHA, and `amphibiaweb.org` timed out from this VPS. Quotes from those sites come from Internet Archive snapshots, named below. No user agent was disguised. Licenses that decide a row come from the `api.*` and Zenodo endpoints, which answered directly.

### 1. Findings

Ranked by impact. All verified by reading the code.

1. **A field under `range` can't be added to the species files.**
   - `scripts/build/columns.ts:17` and `:47-50`: CSV columns follow `RECORD_COLUMNS` order, so a new `range.*` leaf lands before `photo_url`. `scripts/build/contract.ts:177` (prefix rule) then fails "needs /v2". A `STRUCT[]` skips the CSV (`columns.ts:50`), so CSV readers would get nothing.
   - `scripts/build/learn/data.ts:80` pins `species.parquet`'s sha256 in `/learn/data/manifest.json`, so any species byte change also changes `dist/learn/`.
   - Breaks established interfaces and the additions-only rule. **Fix:** a new file family; species files untouched.
2. **`sources[]` can't carry this data.** `scripts/derive/record.ts:19` and `:74` (`assertCitations`) require each field in exactly one source. A country list built from many checklists has many sources per record. **Fix:** provenance on every row.
3. **The IUCN guard has a gap for this data.** `scripts/raw.ts:95` catches keys and strings matching `iucn` and `additionalStatus`. It misses `threatStatus`, which GBIF rows carry on non-IUCN datasets (South Africa's checklist gives the cheetah `VULNERABLE` on its rows), and `appendixCites`. Breaks fail fast. **Fix:** allowlist datasets and row fields at ingest, and add `threatStatus` to the guard.
4. **`mismatches.json` is the review queue.** `scripts/review/presort.ts:172-174` refuses any queue that differs from the evidence, so new entries there would force `pnpm review:evidence` (network) and break `review:presort --check`. Breaks SRP. **Fix:** conflicts go in their own derived file, same `Mismatch` shape (`scripts/species.ts:60`).
5. **The contract knows two tables.** `scripts/build/contract.ts:25-31` and `:185-197`. Small extension: a third table and CSV list. Until its entries exist, a new writer column only logs "add to contracts/v1.json to freeze" (`contract.ts:116`), so the build freezes them in the same commit. Entries for a new file are additions, not definition edits, so no `/v2` and no owner review (AGENTS.md, Data).
6. **The name `ranges.parquet` is taken.** `plans/001-mvp.md:49` reserves it for later polygons. **Fix:** this file gets another name (§3).
7. **Copy.** `AGENTS.md:68` ("records, never range"), `site/learn/modules/s1.html:19`, `p4.html:7`, `c1.html:35`, `site/index.html:140` and `DATA-LICENSE.md` are all true and stay true for records. They only need a sentence when a page first reads the new file (§6).
8. **Side finding, out of scope.** `scripts/ingest/gbif.ts:17` filters by `basisOfRecord` only. 4,433 of the Asian elephant's 6,884 open records carry `degreeOfEstablishment=captive`, so captive animals may reach `range.countriesWithOpenRecords`. Changing that changes `/v1` and Learn, so 007 records it as follow-up work; this design's cross-check will surface its effect.

Fine as it is:
- **`/v1` today:** `species.{json,csv,parquet}`, `species/{id,slug}.json`, `countries.{json,csv,parquet}`, `attribution.json`; `e2e/duckdb.spec.ts:59` pins the list. New files add to it.
- **`range.countriesWithOpenRecords`:** its contract entry (`contracts/v1.json:115`) already says "not native range", and AGENTS.md, Countries, defines it. Nothing here edits either.
- **Learn projection:** `scripts/build/learn/projection.ts` and `site/learn/sql/setup.sql:90` read species and countries only, and nothing here changes them.
- **GBIF-sample staleness:** `scripts/derive/sample.ts:69` keys on `ids.gbif` and filters, and the habitat check (`scripts/build/inputs.ts:85`) on occurrences. Neither moves, so the ≈ 1 h species-change cost doesn't apply.
- **DOIs:** both come from `data/raw/gbif` and the sample, not these snapshots.
- **Licenses:** `scripts/build/licenses.ts` already holds `CC0 1.0` and `CC BY 4.0`, and throws on anything else.
- **Attribution:** `scripts/build/attribution.ts:66` (Natural Earth) and `gbifDerivedDataset` are the patterns to copy.
- **Writer:** `scripts/build/countries.ts` is the pattern to copy.
- **Postgres:** `db/schema.sql` holds species only, and countries aren't loaded either, so the new file isn't.

### 2. Sources

The 76 are 50 Mammalia, 15 Amphibia and 11 Reptilia (all Testudines): no birds, fish or marine species.

**The two picked for the spike**

| | MDD v2.5 (Mammal Diversity Database) | GBIF checklist distributions |
|---|---|---|
| **License** | `"license": {"id": "cc-by-4.0"}`, https://zenodo.org/api/records/21654811 | Per dataset, e.g. `"license": "http://creativecommons.org/licenses/by/4.0/legalcode"`, https://api.gbif.org/v1/dataset/168568e7-eb5f-4ef6-8c59-f73ceaf57e91. Sample: 30 datasets, 15 CC BY, 8 CC0, **7 CC BY-NC** |
| **Republishing terms** | Attribution; citation in the release's `release.toml` | "Users must comply with the terms and conditions included in the licence selected by each Data Publisher"; "the identifier of ownership of data must be retained with every data record shared onward for reuse" (archived 2026-07-24: http://web.archive.org/web/20260724235545/https://www.gbif.org/terms/data-user) |
| **Spatial unit** | Country names, 243 places across the file; 22 aren't exact `/v1/countries.name` (China, United States, Azores, Galápagos Islands…) | ISO alpha-2 `country`, plus `locality` and mixed `locationId` (GADM, TDWG, ISO 3166-2, free text) |
| **Vocabulary** | Native list; `?` = uncertain or possibly extinct. "only the species native distribution or ancient introductions (before the year 1500 CE) are included, whereas subjectively recently introduced populations in different countries are not included" (`META_v2.5.csv`). No introduced, no historical | `establishmentMeans` NATIVE, INTRODUCED, UNCERTAIN; `status` PRESENT, ABSENT, DOUBTFUL |
| **Probe coverage** | 16 of 16 mammals matched by exact name, including `Smutsia gigantea`, `Pongo abelii`, `Beatragus hunteri` and `Zaglossus bruijnii`. Non-mammals: none, by scope | 17 of 19 species have rows beyond IUCN's; 11 of 19 have a row with a country; 6 of 19 have a GRIIS row |
| **Role** | Native, uncertain | Introduced, extirpated |

**Rejected**

| Source | License, quoted | Spatial unit, vocabulary | Probe | Why rejected |
|---|---|---|---|---|
| COL distributions | `"license": "cc by"`, https://api.checklistbank.org/dataset/316595. Not uniform: its sources are 147 `cc by`, 10 `cc0`, 1 `unspecified` (PaleoBioDB), https://api.checklistbank.org/dataset/316595/source?limit=1000 | `"gazetteer": "text"`; no status on any row | 12 species: 10 with text, 0 with a country code. Aye-aye "Africa"; tiger "Southern Asia"; Blanding's "Canada (S Ontario, SW Quebec, isolated populations in SC Nova Scotia)," with the US lost | Text can't become countries; no status. Mostly ITIS's regions |
| GBIF occurrence `establishmentMeans`, `degreeOfEstablishment` | Per record. CC0: "under which data are made available for any use without restriction or particular requirements on the part of users" (archived: http://web.archive.org/web/20260831053310/https://www.gbif.org/terms). Filtered to CC0 and CC BY as `scripts/ingest/gbif.ts` does | Per record: `native`, rarely `uncertain`; `captive`, `managed` | 10 species: **0 `introduced`**; `native` on 78 of 1,223 Blanding's, 12 of 3,254 tiger, 0 of 69 aye-aye | Too sparse, and a label on some records isn't a range |
| Wikidata P183, P9714, P2341 | "Wikidata requires a CC0 license, which is equivalent to public domain", https://www.wikidata.org/wiki/Wikidata:Licensing | Place items | 16 species: P183 on 3, P9714 on 1 (Darwin's frog: Argentina only), P2341 on 0; **no references on any** | Sparse, unsourced. Spike comparator only |
| AmphibiaWeb | "available under a Creative Commons Attribution-NonCommercial (CC-BY-NC) license. This applies to all of the content and data"; "Users may not download multiple images or large amounts of data … without explicit permission" (archived: http://web.archive.org/web/20261012052714/https://amphibiaweb.org/data/datause.html) | ISO `isocc`, `intro_isocc`: the ideal shape | 7 of 7 amphibians | Noncommercial, and bulk download barred. Can't sit in a CC BY file |
| Reptile Database | "Copyright © 1995-2026 by Peter Uetz", http://www.reptile-database.org/, against `"license": "cc by"`, https://api.checklistbank.org/dataset/1008 | Free text | ChecklistBank's copy holds the same one fragment | Terms conflict, and the CC BY copy is unusable |
| Amphibian Species of the World | Not fetched: CAPTCHA, no archive copy | | | Unclear terms = not used |
| CITES Species+ | "You may not redistribute the Materials in whole or in part by any means", https://speciesplus.net/terms-of-use | Would be ideal | Not probed | Barred |
| iNaturalist listed taxa | "you agree to license Content you contribute to the Platform under the Creative Commons Attribution Noncommercial license (CC BY-NC)" (archived: http://web.archive.org/web/20260911052554/https://www.inaturalist.org/pages/terms) | Places, establishment means | API not probed | Noncommercial by default; no terms for listed taxa found |
| GARD 1.1 reptile polygons | `"license": "https://spdx.org/licenses/CC0-1.0.html"`, https://datadryad.org/api/v2/datasets/doi%3A10.5061%2Fdryad.83s7k | Polygons, native only | `Sources.xlsx` answered 401; turtles unverified | 526 MB and a spatial pipeline for at most 11 species. First to reconsider if O3 says no |
| Mammal range maps (Marsh et al.) | `cc-by-4.0`, https://zenodo.org/api/records/6644198 | Polygons, native only | 20.5 GB | Mammals only, already covered; far too heavy |
| ITIS (through GBIF and COL) | `"license": "http://creativecommons.org/publicdomain/zero/1.0/legalcode"`, https://api.gbif.org/v1/dataset/9ca92552-f23a-41a8-a140-01abaa31c931 | Region text | Same regions as COL | Too coarse |
| FishBase, SeaLifeBase, WoRMS, Avibase, Clements, IOC | Terms not checked | | Not probed | No fish, marine species or birds among the 76 |

**Natural Earth and RESOLVE** are spatial units, not sources: "All versions of Natural Earth raster + vector map data found on this website are in the public domain" (https://www.naturalearthdata.com/about/terms-of-use/); RESOLVE "Licensed under CC-BY 4.0" (https://ecoregions.appspot.com/). `/v1/countries` (250 codes) and `data/learn/{country_shapes,admin1_shapes,ecoregions}.parquet` already hold them. Every usable source speaks in countries, so the unit is ISO alpha-2. No source speaks in ecoregions.

**Three things the probe found that decide the design**

- **GBIF's fields can't be trusted across datasets.**
  - Brazil's *Catálogo Taxonômico* marks the Asian elephant INTRODUCED in India and Sri Lanka, the radiated tortoise in Madagascar and the axolotl in Mexico: those are their home countries.
  - South Africa's COLSA marks the axolotl and the tomato frog NATIVE in South Africa.
  - Both datasets are CC BY. So rows pass by **dataset allowlist**, never by field value.
- **"Introduced" means "on a national register", not "living wild".** GRIIS lists the tiger in Colombia and Ecuador. The docs and the contract must say so.
- **IUCN ancestry reaches both good sources, and rows can't always be filtered.**
  - **MDD:** "Species distributional data were initially sourced from the IUCN, HMW, and CMW and supplemented with records published in peer-reviewed literature and regional taxonomic and geographic compendia" (Burgin et al. 2025, https://doi.org/10.1093/jmammal/gyaf047). No row says which, so it can't be dropped by row. It also has an `iucnStatus` column and an `extinct` column "informed by data compiled by" IUCN; neither is kept.
  - **GRIIS:** published by "The Invasive Species Specialist Group ISSG of the Species Survival Commission of the International Union for Conservation of Nature" (https://api.gbif.org/v1/organization/cdef28b1-db4e-4c58-aa71-3c5238c2d0b5); "The IUCN ISSG was recognised to lead this activity" (https://griis.org/about). Its rows aren't Red List categories, assessments or ranges; national experts write each list, under CC BY or CC0 (first 300 of 383 datasets: 297 CC BY, 3 CC0).
  - Both are the owner's call (§7).

**Fetches**

*MDD* (one file):
- `GET https://zenodo.org/api/records/21654811/files/MDD_v2.5_6904species.csv/content`, pinned by record, name and md5 `533e662fd5b8f66a5f56c191e7efac44`.
- Keep only `sciName`, `id`, `countryDistribution`, `domestic`, `flagged`, for base names. `iucnStatus` and `extinct` are never read into the snapshot. Exact name match; a miss is an entry, not a guess.
- License checked from the record's `metadata.license.id`, once per release.

*GBIF checklists*:
- `GET https://api.gbif.org/v1/species/{key}/distributions?limit=1000` until `endOfRecords`, for `ids.gbif` **and** the accepted key where they differ (species 1, 55, 63, 70: Blanding's rows sit on 2442885, and accepted 5220530 has none). No key for species 9, 19, 27 (`identity-unsettled`): no GBIF rows.
- Each `sourceTaxonKey`: `GET /v1/species/{key}` → `datasetKey`. Each dataset: `GET /v1/dataset/{key}` → `license`, `doi`, `title`, `citation.text`, `publishingOrganizationKey`. Don't rely on the row's `source` string: it was empty on some sampled rows (Norway, Peru).
- **IUCN rows:** `datasetKey` = `19491596-35ae-4a91-9a98-85cf505f1bd3` (The IUCN Red List of Threatened Species; GBIF offers it as CC BY, and every one of the 19 sampled species has exactly one row, e.g. `sourceTaxonKey` 176713917 on `Apalone spinifera`). Dropped before anything is written; only the count is kept.
- **License per row:** the dataset's `license` must be exactly the CC BY 4.0 or CC0 1.0 legalcode URL, else the row is dropped and counted.
- **Kept fields only:** `country`, `locality`, `establishmentMeans`, `status`, `sourceTaxonKey`, `datasetKey`. `threatStatus`, `appendixCites` and `remarks` never land.

### 3. Target data model

**A new file family: `/v1/range-listings.{json,csv,parquet}`**, one row per claim a source makes: "this source lists this animal in this country as…". The word *listings* keeps it honest and leaves `ranges.parquet` free for 001's polygons. Why a file and not a field: Findings 1 and 2, and because it leaves `species.*`, `countries.*` and all of `dist/learn/` byte-identical.

| JSON (CSV) | Type | Null | Means |
|---|---|---|---|
| `speciesId` (`species_id`) | INTEGER | no | `/v1/species` `id` |
| `country` | VARCHAR | no | `/v1/countries` `code`; pattern `^[A-Z]{2}$` |
| `area` | VARCHAR | yes | The part of the country the row covers, in the source's words (Hawaii); null = the country as a whole |
| `origin` | VARCHAR | no | `native`, `introduced`, `unknown` |
| `presence` | VARCHAR | no | `present`, `uncertain`, `extirpated` |
| `source` | VARCHAR | no | The dataset's name; `attribution.json` credits each |
| `license` | VARCHAR | no | `CC0 1.0`, `CC BY 4.0` |
| `doi` | VARCHAR | yes | The dataset's DOI; null only on curated rows (O3) |
| `url` | VARCHAR | no | The row's evidence page |
| `sourceTerm` (`source_term`) | VARCHAR | no | What the source said, verbatim: `Cambodia?`, `INTRODUCED/PRESENT` |

Codes are ISO alpha-2 only; GBIF's TDWG, GADM and free-text `locationId` values aren't kept. Rows are sorted by `speciesId, country, area, origin, presence, source`, and that tuple is the key. Size is an estimate until the spike: about 650 rows, 150 KB JSON. A whole file, so no per-species JSON at first (additive later).

**Mapping.** Two columns, because "uncertain" alone would blur *uncertainly native* with *doubtfully introduced*, and they mirror Darwin Core's `establishmentMeans` and occurrence status.

| Source says | `origin` | `presence` |
|---|---|---|
| MDD `Kenya` (extant or reintroduced into its native range) | native | present |
| MDD `Cambodia?` | native | uncertain |
| Register row, `INTRODUCED` or blank, `PRESENT` or blank | introduced | present |
| Register row, `DOUBTFUL` | introduced | uncertain |
| Allowlisted checklist, `NATIVE` + `ABSENT` (the Central Asia checklist on the tiger in Tajikistan) | native | extirpated |
| `UNCERTAIN` + `PRESENT` | unknown | present |
| `INTRODUCED` + `ABSENT` (DAISIE on the axolotl in Germany, "not established") | no row, counted | |
| Any other `NATIVE` row | no row: one native authority (below) | |

**Historical is thin, by the sources' choice.** MDD says "Recently introduced and extinct populations are not included in the distribution of living mammals". So `extirpated` rows come only from allowlisted checklists: in the probe, one (tiger, cheetah in Central Asia, CC0). The contract says rows state what open checklists list, with no promise of completeness.

**Null and absent.** No row means critwire holds no open listing, never that the animal isn't there. No arrays, no `[]`, no per-species status: `range.status` stays what it is, about records. A species with `identity-unsettled` can still have MDD rows, because that state is about GBIF's match.

**Conflict rule.** Prefer one good source:
- **One authority per claim.** Native lists: MDD for mammals, the curated file for others if O3 says so. Introduced and extirpated: the allowlisted registers. No two native lists are ever merged.
- **Disagreements are shown, never fixed.** When whole-country rows for one species and country differ on `origin` or `presence` (a register says introduced where MDD says native), **both rows ship**, and `data/review/range-conflicts.json` gets a `range-conflict` entry, severity `review`, naming both sources. Agreeing rows from two registers also both ship, each credited.
- **Name misses.** A base name with no MDD row gets a `range-not-found` entry, severity `info`, when it's a mammal.

**Against `range.countriesWithOpenRecords`.** It isn't replaced or touched: it answers "where do open records exist", this file answers "what do sources list". The agreement measure is a join anyone can run, and `pnpm derive` prints the totals:

```sql
SELECT s.id, s.code, l.origin, l.presence, l.source
FROM (SELECT id, unnest("range".countriesWithOpenRecords) AS code FROM 'species.parquet') AS s
LEFT JOIN 'range-listings.parquet' AS l ON l.speciesId = s.id AND l.country = s.code;
```

Probe flavour, 8 mammals against MDD: 72 record countries, 47 on the list (65 %), 25 outside (tiger: BR, DE, US, ZA; elephant: BE, DE, DK, US). 44 of 53 native countries have open records (83 %).

**Attribution.** `attribution.sources[]` gains `Mammal Diversity Database` and `GBIF checklists`, registered in `scripts/build/sources.ts` (MDD's citation per release, as `COL_CITATIONS` does, so a new release fails until added), each with `fields: ["range-listings.*"]`. A new top-level `gbifChecklists` lists every used dataset with key, license, DOI, citation and row count, as `gbifDerivedDataset.datasets` does. `notes` and `DATA-LICENSE.md` state MDD's and GRIIS's IUCN ancestry plainly, if the owner accepts them.

### 4. Pipeline

| Command | Owns | Notes |
|---|---|---|
| `pnpm ingest mdd` | `data/raw/mdd/snapshot.json` | Pinned file; cut columns and names only; ≈ 1 min |
| `pnpm ingest gbif-checklists` | `data/raw/gbif-checklists/snapshot.json` | Reads the keys from `data/raw/gbif`; allowlist constant at the top of the ingest; ≈ 5 min at ≤ 2 req/s, sized by the spike; stores drop counts per reason |
| hand, agents + owner (O3) | `data/review/range-curated.json` | Only if O3 says yes; each row cites its reference; no IUCN page |
| `pnpm derive` | `data/range-listings.json` (`{sources, rows}`, like `countries.json`), `data/review/range-conflicts.json` | Pure and offline, in `deriveCore` after `matchCountries` (`scripts/derive/pipeline.ts:119`), which also gets the listing codes, so a code with no country row throws. `MDD_PLACES` crosswalk: an unknown place throws |
| `pnpm build` | `dist/v1/range-listings.{json,csv,parquet}` | `scripts/build/range-listings.ts`, like `countries.ts`; after `writeCountries` (`scripts/build.ts:58`) |

**Refresh cost:** ≈ 6 min of fetching, then derive and build. No `learn:check`, no DOI, no habitat, no sample. A species change adds these two ingests to its existing ≈ 1 h.

**DOI impact:** none. Rows cite each dataset's own DOI; the derived-dataset DOIs cover occurrence counts, which don't move.

**The plain build refuses, and `--draft` lifts none of these:**
- a stale `data/range-listings.json` ("run pnpm derive");
- a snapshot not covering the base names ("run pnpm ingest …");
- an MDD pin or citation mismatch;
- a dataset off the allowlist in a snapshot, a license other than the two, or an IUCN string or `threatStatus` key;
- an unmapped place or a country with no row;
- a contract break.

**`/learn/data` doesn't change in the first build.** The build's check: against `dist-baseline.sha256`, only `v1/range-listings.*` are new, only `index.html` and `v1/attribution.json` differ, and every other file, including all of `dist/learn/` and `v1/species*`, is byte-identical.

**Risk.** `/v1/species/{key}/distributions` sits on the legacy backbone. It's live today, serving datasets published in late October 2026. If GBIF retires it, the ingest fails loudly, the committed snapshot stands and builds keep working.

### 5. Spike scope (a later Step)

**Sources:** MDD v2.5 and GBIF checklist distributions, all 76. Wikidata P183, P9714, P2341 as a comparator only (76 entity GETs), to answer with a number whether it could help the 26 non-mammals.

**Where:** `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/spike/`: `fetch.py`, `measure.py`, `allowlist.json`, `raw/`, `results.json`, `results.tsv`, `fetch.log`. Standard library only, run with `python3 -I`, read-only against the repo, nothing in the repo. IUCN rows and columns are dropped **before** writing; only counts are kept.

**Reproduce:**
```
S=/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/spike
python3 -I $S/fetch.py --repo /srv/critter-ai/worktrees/critwire-native-ranges-design --out $S/raw 2>> $S/fetch.log
python3 -I $S/measure.py --repo /srv/critter-ai/worktrees/critwire-native-ranges-design --raw $S/raw --out $S
```

**Allowlist from evidence.** The first pass lists every dataset met, with rows, license, publisher and how its rows agree with MDD. Each gets a role by hand, with a reason, in `allowlist.json`: `register`, `checklist`, or none. Starting exclusions, already evidenced: the Brazil catalogue, COLSA, ITIS, COL, anything BY-NC.

**Record, per metric, all 76, by class and by `range.status`:**
- **Coverage:** MDD exact-name matches of 50, native and uncertain rows per species, `domestic` and `flagged` among them. GBIF: species with any row, with a country row, with kept rows per `origin`/`presence`. Under three allowlists: GRIIS only, non-GRIIS registers only, both.
- **Agreement, two sources.** For mammal *s*, M(*s*) = MDD countries, I(*s*) = kept introduced countries:
  - *conflict rate* = Σ|M∩I| / Σ|I|, with the list of pairs.
  - For every other dataset's present `NATIVE` rows, the share in M, per dataset. This validates the exclusions.
- **Agreement with records.** R(*s*) = `countriesWithOpenRecords`, N native, U uncertain, X extirpated, micro and macro:
  - *native recall* = |N∩R| / |N|.
  - *records explained* = |R∩(N∪U∪I∪X)| / |R|.
  - *records outside* = R minus those, with record counts from the GBIF snapshot, and the share already flagged `country-*` in `mismatches.json`.
- **IUCN:** rows dropped per species; rows with `threatStatus` on other datasets; kept strings matching `/iucn/i` (must be 0, or the guard needs a decision); GRIIS rows counted separately.
- **Licenses:** datasets and rows by license; rows dropped for license.
- **Shape:** distinct `locality` values (finalizes the whole-country rule for `area`), crosswalk size, projected rows and bytes.

**Gates.** A failure changes the recommendation and is reported, not silently passed:
- ≥ 45 of 50 MDD name matches, each miss explained.
- Every MDD place mapped.
- Conflict rate ≤ 10 %.
- 0 IUCN strings kept.
- Every kept row CC0 or CC BY.

### 6. Learn tie-in

Recommended: **no Learn change in the first build**, then a small separate mission. Each addition follows the 004-and-site-together rule. A browser block needs one entry in `V1_INPUTS` (`scripts/build/learn/data.ts:80`) and in `DATA_FILES` (`site/learn/src/engine.ts:25`), which changes `manifest.json`, but no loader table.

| Module | What it gains | Path | Cost |
|---|---|---|---|
| **s1 Bias** | Answers its own question, "What can records say about where an animal lives, and what can't they?": records against native listings, per species; recall and records outside, each outside country a question to ask | Browser | One block, prose, results |
| **f3 Joins** | An anti join: listed native countries with no open record, next to "Which have no records at all?" | Browser | One exercise |
| **d1/d2** | A long table against a list in a cell; a composite key; origin and presence as two facts | Browser | One block |
| **e4 Provenance** | A real license and quality case on made-up rows: 7 of 30 datasets BY-NC, a mislabelled catalogue, a row to drop by dataset | PostGIS, inline rows | One block |
| **g3 Spatial joins** | An open version of the appendix on records against a range (`site/learn/modules/g3.html:43`, today IUCN-download-only): records per outline against listed countries | PostGIS: a 17th lab table, so loader, `LAB_TABLES`, `lab.mmd`, `checked/` | Largest; defer |
| **c1 Feed** | A flag on each cell's country (listed or not) | Feed schema and results change | Defer |

**Copy rule.** "Records, never range" (`AGENTS.md:68`) stays for records. A page reading this file needs one added line: *native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it as native in Kenya"); records are still never range.* That's O4.

### 7. Owner's choices

Steps must put O1 to O4 in the handoff file. The build brief starts only after they're answered.

- **O1. May critwire publish MDD's country lists, given their IUCN ancestry?** They're the American Society of Mammalogists' curated work, under CC BY 4.0, but the paper says the data were "initially sourced from the IUCN, HMW, and CMW", and no row says which. **Recommend yes**, with no IUCN field stored and the ancestry stated in attribution and `DATA-LICENSE.md`. It's the only practical open route found to country-level native lists for 50 species. The honest risk: IUCN's terms bar sharing what's made from its ranges (`g3.html:44`), and this is a step removed from that, not free of it. **No answer means no MDD rows,** because your rule is non-negotiable. A no leaves the curated route (O3) as the only native source.
- **O2. May critwire publish GRIIS rows, given that an IUCN specialist group publishes them?** They aren't Red List data: national experts write them, and each is CC BY or CC0. **Recommend yes.** It's the only global introduced source found. **No answer means GRIIS is left out;** the spike shows what the non-GRIIS registers alone cover.
- **O3. The 26 non-mammals have no open native list.** Either (a) a hand-written `data/review/range-curated.json`, agents' entries you review, each row citing its reference, under the existing rule "Bare trait values may come from any cited source in our own words; bulk imports only from open datasets", never reading IUCN pages, about two sessions plus your review; or (b) introduced rows only for them, native absent. **Recommend (a).** Native coverage goes from 50 to 76, and it's the one route where every row names its reference, so IUCN can be kept out row by row. Without an answer: (b).
- **O4. Change the copy rule as in §6** when a page first reads this file. **Recommend yes,** only then, in that change.
- **O5. Which Learn additions, and when?** **Recommend** s1, f3 and e4 as one small mission after the build goes live; defer g3 and c1.

### 8. Rejected alternatives

- **Fields under `range` in species records:** CSV prefix rule, one source per field, and it changes `dist/learn/manifest.json`.
- **Native list only, no introduced:** the brief asks for both.
- **Merging every GBIF checklist by its fields:** the Brazil catalogue and COLSA rows prove that's wrong.
- **Deriving native from records (a core-region rule):** records aren't range.
- **One `status` column:** blurs uncertain native with doubtful introduced.
- **Polygons (GARD, range maps, RESOLVE):** native only, hundreds of MB to 20 GB, and a spatial pipeline; countries are what the sources and the game can use now.
- **An overrides file now:** conflicts are shown, and nothing needs one yet; additive when something does.
- **Conflicts in `mismatches.json`:** breaks the review queue (Finding 4).
- **A Learn lab table now:** loader, manifest, ERD and `checked/` churn with no need.
- **Using the CC BY GBIF copy of the IUCN checklist:** your rule forbids it whatever the license.

### Later Steps' deliverables and size

- **`plans/007-native-ranges.md`:** license quotes with URLs, spike numbers and reproduce commands, the final allowlist with reasons, exact contract entries (`means` drafted, `sha` filled), mapping, conflict rule, pipeline, Learn tie-in, owner's choices, follow-up (Finding 8).
- **`plans/briefs/critwire-native-ranges-build.md`:** the L-series format (header comment with estimate, Goal, Why, Scope, Out, Definition of done, Decision rules). Starts only after O1 to O3. Done means live, with the byte-identical check in §4, an E2E spec like `e2e/countries.spec.ts`, and `e2e/duckdb.spec.ts:59`, `e2e/attribution.spec.ts:32`, the docs page and `AGENTS.md` updated.
- **Rough size:** about 12 steps and 22–28 sessions, well within 60. Ingests 2, derive 1–2, curated file 1–2 (if O3), contract and writer 1–2, attribution and docs 2, E2E and release checks 2, plus the pipeline stages, code review, verification and release.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code and the evidence (`arch-probe/`): every cited line (`columns.ts:17,47-50`, `contract.ts:177,185-197,116`, `raw.ts:95`, `record.ts:19,74`, `presort.ts:172-174`, `species.ts:60`, `pipeline.ts:119`, `learn/data.ts:80`, `build.ts:58`, `duckdb.spec.ts:59`, `001-mvp.md:49`) says what the plan says. Every license quote is in the saved `terms/` file or API JSON named: MDD `cc-by-4.0` and md5 `533e662f…` (`mdd/record-21654811.json`), the GBIF data-user and CC0 sentences (`archived-gbif-*.html`), Wikidata CC0, Natural Earth public domain, RESOLVE CC-BY 4.0, AmphibiaWeb BY-NC + bulk-download bar, CITES "may not redistribute", iNaturalist BY-NC, GARD CC0 (`gard/dryad.json`), Reptile Database © only. Dataset licenses: 15 CC BY / 8 CC0 / 7 BY-NC (`gbif/dataset/`), GRIIS 297 CC BY / 3 CC0 of 300 (`griis-datasets.json`). The MDD quotes ("initially sourced from the IUCN, HMW, and CMW"; `countryDistribution` definition) are in `papers/mdd-2025-fulltext.xml` and `mdd/META_v2.5.csv:42`. Class split 50/15/11, the 3 `identity-unsettled` ids and the 4 accepted-key cases match `data/species.json`. The IUCN checklist dataset `19491596-…` is CC BY on GBIF, so the by-datasetKey drop (not by license) is the right filter. GRIIS's IUCN strings live only in dataset `description` (3 of 300, `griis-datasets.json`), a field the design never stores, so `assertNoIucnData` over the snapshot is coherent with O2 = yes. The "Licenses decide" rule is respected: every kept row is CC0 1.0 or CC BY 4.0 by exact legalcode URL, and every unclear source (ASW, Reptile Database, COL's `unspecified` source) is rejected, not passed. Rate: ≈ 76 distribution calls + ≈ 800 usage lookups (cached per `sourceTaxonKey`) + ≈ 100 dataset calls + 76 Wikidata, ≈ 10 min at 0.55 s; measures all 76. Size (12 steps, 22–28 sessions) fits the brief.

MUST-FIX:
1. **§3 mapping isn't exhaustive, and the gap is the common case.** In the 94 probe rows (`gbif/dist-*.json`), 45 have no `status` and 53 no `establishmentMeans`; GBIF's `OccurrenceStatus` also has `COMMON`, `RARE`, `IRREGULAR`, `EXCLUDED`. The table defines blanks only for register rows and says nothing for an allowlisted *checklist* row with a blank or one of those values, so derive would either guess or silently skip (breaks fail fast, `~/AGENTS.md`). Fix: one line in §3: any (`role`, `establishmentMeans`, `status`) combination not in the table refuses at derive, naming the row, and the spike's Shape metric lists every distinct combination met so the table is complete before the build. Also state that `description` (and `rights`, `contacts`) are never read into the snapshot, since that is where GRIIS mentions IUCN.

MISSED:
- **Key-drift staleness between the two GBIF snapshots.** `ingest gbif-checklists` "reads the keys from `data/raw/gbif`", but §4's refusal list covers only base-name coverage. If `ingest gbif` changes an `ids.gbif` or an accepted key, the checklists snapshot still "covers the names" and derive would publish rows fetched for the old key. Store the keys fetched in the snapshot and have derive refuse when they differ from `data/raw/gbif`'s (same pattern as `assertBaseNames`).
- **`presence = extirpated` overstates `ABSENT`.** A `NATIVE` + `ABSENT` checklist row (Central Asia, cheetah in KZ/TJ/TM/UZ) is mapped to `extirpated`, but GBIF's `ABSENT` is "not present", which a checklist may also use for an erroneous historical claim. `sourceTerm` keeps the verbatim, but the contract `means` for `extirpated` must say "the source lists it as native and absent", not "went extinct there", or name the value `absent`.
- **`url` is NOT NULL but undefined.** Say which page: `https://www.gbif.org/species/{sourceTaxonKey}` for checklist rows and MDD's taxon page (`id` is kept for it) for MDD rows; the curated file's rows (O3) supply their own reference URL.

SHOULD-CONSIDER:
1. `area` from GBIF `locality` is free text in the probe ("Belgium", "Flanders", "Flemish Region", "Great Britain" on BE/GB rows) and sits in the row key, so one dataset can yield several near-duplicate rows. Simplest rule: `area` is set only when the *dataset* is a sub-national register (GRIIS Hawaii/Alaska), else null; drop `locality` otherwise. The spike's Shape metric can confirm.
2. Contract `means` for `origin = native` from MDD should say "native or pre-1500 introduction (MDD's rule)", and `presence = uncertain` from MDD's `?` "uncertainly present or possibly extinct", so historical is not claimed where MDD blurs it.
3. Attribution `fields: ["range-listings.*"]` is a new wildcard convention; Natural Earth lists its columns file-qualified (`attribution.ts:71`). List the columns the same way, so `e2e/attribution.spec.ts` and the Learn cards need no new rule.
4. Make explicit in §7 and the deliverables that the build brief is written in *this* mission with the defaults (no answer = no MDD, no GRIIS, O3 (b)) and says what each owner answer flips, so the unattended mission isn't blocked on handoff replies; and note that the all-defaults build publishes only non-GRIIS register rows (probe: a handful), which the owner should know when weighing O1–O3.
5. Document the conflict query (`GROUP BY speciesId, country HAVING COUNT(DISTINCT origin || presence) > 1`) on the docs page next to the file, since the published representation of a conflict is "two rows" and `range-conflicts.json` isn't served.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Snapshot freshness (§4).** Base-name coverage cannot detect changed GBIF usage or accepted keys. Record fetched keys and validate them against current resolved identities during derive; reject stale snapshots before publishing another taxon’s listings.
2. **Status semantics (§3).** `ABSENT` does not establish extirpation; blank register status does not establish current presence. Preserve absence/unknown unless the dataset explicitly supports stronger claims. MDD’s native-or-pre-1500-introduction category must also remain distinguishable from strictly native.
3. **Incomplete mapping (§3).** Unlisted combinations of dataset role, establishment and presence have no defined outcome. Specify exhaustive mapping and explicit counted exclusions; reject unexpected combinations. Otherwise refreshes can silently discard or misclassify claims.
4. **Approval boundary (§5 versus §7).** The unconditional MDD spike retains country lists whose inseparable IUCN ancestry is explicitly awaiting O1. Gate retention on the owner’s recorded exception, including research snapshots; deleting status columns does not remove range ancestry.

SHOULD-CONSIDER:

1. Use a stable source identifier in row identity and attribution joins; dataset titles can change or collide.
2. Define geographic normalization explicitly: island/subnational listings must retain their scope; missing locality must not automatically mean whole-country coverage.
3. Specify duplicate handling across usage-key and accepted-key fetches so repeated evidence cannot inflate coverage or conflict metrics.

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

- 2026-11-01 17:56 UTC: Baseline: typecheck pass, test 754/754, build pass, e2e 149/149; `dist/` 311 files = live.
- 2026-11-01 18:26 UTC: Architecture: architect wrote findings + design, light probe (evidence `arch-probe/`). Picks: MDD v2.5 + GBIF checklist distributions; new `/v1/range-listings.*`. Spot-checked species counts, cited code lines, MDD license, md5 and quotes against evidence: all match; stripped MDD `extinct` from saved cut. Plan-only diff; no code, no build.
- 2026-11-01 18:32 UTC: Fable review: APPROVE_WITH_CHANGES, 1 MUST-FIX (§3 mapping not exhaustive: refuse unlisted combos, spike lists all met, never store dataset `description`); 3 missed, 5 should-consider, all for Revision. Plan-only diff; no build.
- 2026-11-01 18:33 UTC: Astra review: APPROVE_WITH_CHANGES, 4 MUST-FIX (key-stale snapshot, status semantics incl. MDD pre-1500, exhaustive mapping, O1 gate on MDD spike retention); 3 should-consider, all for Revision. Plan-only diff; no build.

## Summary
