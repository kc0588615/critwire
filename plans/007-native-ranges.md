---
title: Native, introduced and historical range, a tested design
---

# Native ranges

For the owner: how critwire could publish where sources list each animal as native or introduced, from sources it may publish, next to today's "countries with open records", which aren't range. Plan and full evidence: `plans/2026-11-01-critwire-native-ranges-design.md`. Built by mission `critwire-native-ranges-build` (`plans/2026-11-01-critwire-native-ranges-build.md`): `/v1/range-listings.{json,csv,parquet}`; its Decisions list every deviation, each edited here.

## Summary

**Recommended sources.** One per claim, all at country level:

- **MDD v2.5** for mammals' native lists (CC BY 4.0), if O1 is yes.
- **GBIF checklist distributions**, by dataset allowlist, for introduced and native-but-absent rows: 18 datasets with a role, each CC0 or CC BY. GRIIS and the Central Asia checklist only if O2 is yes.
- **A hand-written curated file** for the 26 non-mammals' native rows, if O3 is (a). No open native list exists for them.

The other 19 sources are rejected or, for Natural Earth, give only the spatial unit, each with its license quoted under Sources. IUCN data is never used, and its checklist is dropped by key.

**Coverage, measured on all 76:**

| Owner's answers | Rows | Species | What it holds |
|---|---|---|---|
| All defaults | 10 | 5 | Introduced only; no native or historical rows |
| O2 only | 32 | 12 | Introduced, plus 6 native-but-absent rows |
| O1 only | 410 | 54 | Native lists for all 50 mammals |
| O1 and O2 | 432 | 57 | 155,392 B of JSON |
| O1, O2 and O3 (a) | 432 + curated | 76 | Native rows on every species |

MDD matched 50 of 50 mammals by exact name. Mammals' open-record countries sit on a listing 75 % of the time with MDD (285 of 379); across all 76, without MDD, 0.85 % (4 of 472). The conflict gate was too few to judge: 9 introduced mammal rows, under the 20 it asks for.

**Shape.** A new file family, `/v1/range-listings.{json,csv,parquet}`: one row per claim a named source makes, 11 columns, with `origin` and `presence` as separate columns. Conflicts ship, both rows shown. `species.*`, `countries.*` and all of `dist/learn/` stay byte-identical, and `range.countriesWithOpenRecords` is untouched. No row means critwire holds no open listing, never that the animal isn't there.

**Your choices** (details under Owner's choices):

- **O1:** publish MDD's lists, given their stated IUCN ancestry? Recommend yes.
- **O2:** publish GRIIS rows, given their IUCN-group publisher? Recommend yes.
- **O3:** a curated native file for the 26 non-mammals? Recommend (a).
- **O4:** change the copy rule when a page first reads this file? Recommend yes.
- **O5:** which Learn additions, when? Recommend s1, f3 and e4, one small mission after the build goes live.

All defaults publish only 10 rows, so the build shouldn't start until O1 or O2 is yes. The build brief is `plans/briefs/critwire-native-ranges-build.md`.

## Sources

The 76 are 50 Mammalia, 15 Amphibia and 11 Reptilia (all Testudines): no birds, fish or marine species. Coverage comes from the spike (all 76, 2026-11-01) unless marked "probe" (a sample read while choosing sources, 19 species or fewer). Quotes are checked against saved copies in `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/arch-probe/`. Live pages on `www.gbif.org`, `www.inaturalist.org`, `amphibiansoftheworld.amnh.org`, `avibase.bsc-eoc.org` and `www.birds.cornell.edu` refused this server, and `amphibiaweb.org` timed out, so those quotes come from the Internet Archive snapshots linked. No user agent was disguised. The build re-reads them when it starts.

| Source | License, quoted | Republishing terms | Spatial unit | Coverage | Verdict |
|---|---|---|---|---|---|
| MDD v2.5 (Mammal Diversity Database) | `"license": {"id": "cc-by-4.0"}`, https://zenodo.org/api/records/21654811 | Attribution; citation in the release's `release.toml`. Its paper says the data were "initially sourced from the IUCN, HMW, and CMW", https://doi.org/10.1093/jmammal/gyaf047, and no row says which | Country names; 243 places in the file, each mapped by hand to a code and optional `area` | 50 of 50 mammals by exact name, 400 rows, 36 uncertain; 0 of 26 others, by scope | **Used, if O1 is yes.** The one native list. Native or pre-1500 only: "only the species native distribution or ancient introductions (before the year 1500 CE) are included" |
| GBIF checklist distributions (GRIIS and other allowlisted checklists) | Per dataset, e.g. `"license": "http://creativecommons.org/licenses/by/4.0/legalcode"`, https://api.gbif.org/v1/dataset/168568e7-eb5f-4ef6-8c59-f73ceaf57e91. Of 88 datasets met: 29 CC BY, 14 CC0, 44 CC BY-NC, 1 unspecified | "Users must comply with the terms and conditions included in the licence selected by each Data Publisher"; "the identifier of ownership of data must be retained with every data record shared onward for reuse" (archived: http://web.archive.org/web/20260724235545/https://www.gbif.org/terms/data-user) | ISO alpha-2 `country`; `locality` and `locationId` not kept | 73 species have a key, 70 a row beyond the IUCN checklist's, 31 a row with a country; kept through the allowlist: 32 rows on 12 species | **Used, GRIIS and other O2 datasets only if O2 is yes.** Introduced, and native but absent. By dataset allowlist, never by field value |
| COL distributions | `"license":"cc by"`, https://api.checklistbank.org/dataset/316595. Not uniform: its sources are 147 `cc by`, 10 `cc0`, 1 `unspecified`, https://api.checklistbank.org/dataset/316595/source?limit=1000 | Per source, as listed there | `"gazetteer": "text"`; no status on any row | Probe, 12 species: 10 with text, 0 with a country code. Aye-aye "Africa"; tiger "Southern Asia" | **Rejected.** Text can't become countries, and it has no status |
| GBIF occurrence `establishmentMeans`, `degreeOfEstablishment` | Per record. CC0: "under which data are made available for any use without restriction or particular requirements on the part of users" (archived: http://web.archive.org/web/20260831053310/https://www.gbif.org/terms) | Per record's license; filtered to CC0 and CC BY as `scripts/ingest/gbif.ts` does | Per record: `native`, rarely `uncertain`; `captive`, `managed` | Probe, 10 species: 0 `introduced`; `native` on 78 of 1,223 Blanding's turtle records, 12 of 3,254 tiger, 0 of 69 aye-aye | **Rejected.** Too sparse, and a label on some records isn't a range. See Follow-up |
| Wikidata P183, P9714, P2341 | "Wikidata requires a CC0 license, which is equivalent to public domain", https://www.wikidata.org/wiki/Wikidata:Licensing | None | Place items | A value on 33 of 76 (23 of 50 mammals, 10 of 26 others), a reference on 16 (12, 4). P2341 on 0 | **Rejected, comparator only.** Sparse, and mostly unsourced |
| AmphibiaWeb | "available under a Creative Commons Attribution-NonCommercial (CC-BY-NC) license. This applies to all of the content and data" (archived: http://web.archive.org/web/20261012052714/https://amphibiaweb.org/data/datause.html) | "Users may not download multiple images or large amounts of data" without explicit permission | ISO `isocc`, `intro_isocc`: the ideal shape | Probe: 7 of 7 amphibians | **Rejected.** Noncommercial, bulk download barred, can't sit in a CC BY file |
| Reptile Database | "Copyright © 1995-2026 by Peter Uetz", http://www.reptile-database.org/, against `"license":"cc by"`, https://api.checklistbank.org/dataset/1008 | The two statements conflict | Free text | Probe: ChecklistBank's copy holds the same one fragment | **Rejected.** Terms conflict, and the CC BY copy is unusable |
| Amphibian Species of the World | "Any use of the documents available from this server must be for informational purposes only and in no instance for commercial purposes" (archived: http://web.archive.org/web/20260831192007/https://amphibiansoftheworld.amnh.org/Copyright-and-terms-of-use) | "Copyright © 1998–2026 Darrel R. Frost and American Museum of Natural History. All Rights Reserved" | Country filter on the site | Not probed: the live site refused this server | **Rejected.** Noncommercial, all other rights reserved |
| CITES Species+ | "You may not redistribute the Materials in whole or in part by any means", https://speciesplus.net/terms-of-use | Barred, as quoted | Not probed | Not probed | **Rejected.** Barred |
| iNaturalist listed taxa | "you agree to license Content you contribute to the Platform under the Creative Commons Attribution Noncommercial license (CC BY-NC)" (archived: http://web.archive.org/web/20260911052554/https://www.inaturalist.org/pages/terms) | No terms for listed taxa found | Places, establishment means | API not probed | **Rejected.** Noncommercial by default |
| GARD 1.1 reptile polygons | `"license": "https://spdx.org/licenses/CC0-1.0.html"`, https://datadryad.org/api/v2/datasets/doi%3A10.5061%2Fdryad.83s7k | None (CC0) | Polygons, native only | `Sources.xlsx` answered 401; turtles unverified | **Rejected.** 526 MB and a spatial pipeline for at most 11 species. First to reconsider if O3 says no |
| Mammal range maps (Marsh et al.) | `"license": {"id": "cc-by-4.0"}`, https://zenodo.org/api/records/6644198 | Attribution | Polygons, native only | Not probed, 20.5 GB | **Rejected.** Mammals only, already covered, far too heavy |
| ITIS (through GBIF and COL) | `"license": "http://creativecommons.org/publicdomain/zero/1.0/legalcode"`, https://api.gbif.org/v1/dataset/9ca92552-f23a-41a8-a140-01abaa31c931 | None (CC0) | Region text | Probe: the same regions as COL | **Rejected.** Too coarse |
| Natural Earth | "All versions of Natural Earth raster + vector map data found on this website are in the public domain", https://www.naturalearthdata.com/about/terms-of-use/ | None | Countries, admin-1 | 250 codes in `/v1/countries` | **Used as the unit, not a source.** Every usable source speaks in countries, so the unit is ISO alpha-2 |
| RESOLVE | "Licensed under CC-BY 4.0", https://ecoregions.appspot.com/ | Attribution | Ecoregions | In `data/learn/ecoregions.parquet`; no source speaks in ecoregions | **Not used.** Spatial unit only, with nothing to join |
| FishBase | "This work is licensed under Attribution-NonCommercial 4.0 International", https://www.fishbase.se/search.php | Noncommercial, as quoted | Not checked | No fish among the 76 | **Rejected.** Out of scope, and noncommercial |
| SeaLifeBase | "This work is licensed under Attribution-NonCommercial 4.0 International", https://www.sealifebase.se/search.php | Noncommercial, as quoted | Not checked | No marine species among the 76 | **Rejected.** Out of scope, and noncommercial |
| WoRMS | "The text on the WoRMS pages is open-access under the terms of the Creative Commons Attribution License (CC-BY)", https://www.marinespecies.org/about.php | "provided it is cited as requested" | Not checked | No marine species among the 76 | **Rejected.** Out of scope |
| Avibase | "© Denis Lepage" (archived: http://web.archive.org/web/20260608230758/https://avibase.bsc-eoc.org/about.jsp); no license stated there | Not stated: unclear, so not used | Regional checklists | No birds among the 76 | **Rejected.** Out of scope, terms unclear |
| Clements (eBird/Clements checklist) | "To not reproduce, distribute, modify, re-post on another site (regardless of the server on which the Content is stored), or sell any Content without specific written authorization from Cornell Lab of Ornithology" (archived: http://web.archive.org/web/20261007205020/https://www.birds.cornell.edu/home/terms-of-use/) | Barred without authorization, as quoted | Range text | No birds among the 76 | **Rejected.** Out of scope, and barred |
| IOC World Bird List | "is licensed under a Creative Commons Attribution 3.0 Unported License", https://www.worldbirdnames.org/new/ | Attribution | Not checked | No birds among the 76 | **Rejected.** Out of scope; CC BY 3.0 isn't one of critwire's two licenses either |

IUCN data is never used. GBIF offers the IUCN checklist as CC BY (dataset `19491596-35ae-4a91-9a98-85cf505f1bd3`); it's dropped by key whatever its license, 72 rows in the spike.

Three findings decide the design:

- **GBIF's fields can't be trusted across datasets.** Brazil's *Catálogo Taxonômico* marks the Asian elephant INTRODUCED in India and Sri Lanka, the radiated tortoise in Madagascar and the axolotl in Mexico: those are their home countries. South Africa's COLSA marks the axolotl and the tomato frog NATIVE in South Africa. Both datasets are CC BY. So rows pass by dataset allowlist, never by field value.
- **"Introduced" means "on a national register", not "living wild".** GRIIS lists the tiger in Colombia and Ecuador. The docs and the contract say so.
- **IUCN ancestry reaches both good sources, and rows can't always be filtered.** All of this is your call (O1, O2):
  - MDD's quote above is in the table. It also has an `iucnStatus` column and an `extinct` column; neither is ever read into a snapshot.
  - GRIIS is published by "The Invasive Species Specialist Group ISSG of the Species Survival Commission of the International Union for Conservation of Nature", https://api.gbif.org/v1/organization/cdef28b1-db4e-4c58-aa71-3c5238c2d0b5, and "The IUCN ISSG was recognised to lead this activity", https://griis.org/about. Its rows aren't Red List categories, assessments or ranges; national experts write each list, under CC BY or CC0.
  - The Central Asia checklist (CC0), the only source of `native` + `absent` rows, says "Global aggregators (IUCN, GBIF, Catalogue of Life) were used for cross-checking", https://api.gbif.org/v1/dataset/c71d02ff-b756-4cc0-b089-d29ba9155619. A cross-check, not a source of rows, but stated.

## Spike results

Measured 2026-11-01, all 76 species, read-only, at most 2 requests a second (706 requests in 389 s). GBIF's rows are live, so these numbers are for the saved `raw/` at that date. Totals only: MDD's lists were held in memory and never written, because O1 is open. `<5` means a small cell, pooled so it can't read back a species' list.

| metric | value |
|---|---|
| mdd_exact_name_matches | 50 of 50 |
| mdd_rows | 400 |
| mdd_rows_uncertain | 36 |
| mdd_rows_per_species_min_median_max | 1 / 3.0 / 42 |
| mdd_domestic_flagged_of_matched | 0 / 2 |
| mdd_na_domesticated_tokens_whole_file | 2 / 17 |
| gbif_species_with_keys | 73 |
| gbif_species_row_beyond_red_list | 70 |
| gbif_species_country_row | 31 |
| listings_griis_only | 15 rows, 9 species, 10 datasets |
| listings_non_griis | 17 rows, 7 species, 7 datasets |
| listings_griis_and_non_griis | 32 rows, 12 species, 17 datasets |
| listings_all_defaults | 10 rows, 5 species, 6 datasets |
| listings_both_introduced_absent | 1 rows, 1 species |
| listings_both_introduced_present | 21 rows, 11 species |
| listings_both_introduced_uncertain | 4 rows, 2 species |
| listings_both_native_absent | 6 rows, 2 species |
| conflict_rate_both | <5 (9 rows, 4 species) |
| conflict_rate_griis_only | <5 (4 rows, 3 species) |
| conflict_rate_non_griis | <5 (5 rows, 2 species) |
| conflict_rate_both_area_null | <5 (9 rows, 4 species) |
| section3_conflict_pairs_origin_presence | <5 / <5 |
| native_recall_mammals_micro_macro | 0.7555 / 0.8448 |
| records_explained_mammals_micro_macro | 0.752 / 0.7683 |
| records_explained_all_without_mdd | 0.0085 |
| records_outside_mammals_countries_records | 94 / 5916 |
| records_outside_mammals_flagged_share | 0.7021 |
| red_list_rows_dropped | 72 |
| threat_rows_other_datasets | 144 |
| griis_rows_fetched | 17 |
| datasets_rows_dropped_for_license | 88 datasets, 125 rows dropped |
| shape_combinations_unmapped | 13 / 0 |
| projection_all_defaults | 10 rows, 5 species, 4217 JSON bytes |
| projection_all_yes_without_curated | 432 rows, 57 species, 155392 JSON bytes |
| wikidata_non_mammals_value_reference | 10 / 4 of 26 |
| gate1NameMatches | pass |
| gate2PlacesMapped | pass |
| gate3ConflictRate | too few to judge |
| gate4NoGuardedStrings | pass |
| gate5Licenses | pass |

**What the numbers mean**

- **MDD:** every mammal matches by exact name, at 3 rows per species in the median. It says nothing on the 26 others.
- **GBIF:** of 679 rows fetched, 72 were the IUCN checklist's, 125 had another license (123 CC BY-NC, 2 unspecified), 7 came from a dataset naming IUCN in its title (itself CC BY-NC), and 475 were kept in the spike's raw files. Only 35 of those sit on allowlisted datasets, giving 32 listings after the mapping. Most rows are native-only or blank-only datasets with no role here.
- **`listings_*`:** what each owner answer publishes. `griis_only` is O2's GRIIS lists, `non_griis` every other allowlisted dataset, `all_defaults` what remains with no owner answer (no `native` rows: all six `native` + `absent` come from an O2 dataset).
- **`conflict_rate_*`:** the share of introduced rows on MDD's list for that species. Only 9 such rows exist, so it can't be judged either way (gate 3).
- **`native_recall`:** of MDD's 364 `present` rows, 275 have open records (0.7555; 0.8448 averaged per species). The rest are places open records don't reach.
- **`records_explained`:** of 379 mammal record countries, 285 are on a listing, MDD's or another's. Without MDD, across all 76, it's 4 of 472 (0.0085): that's O1's worth.
- **`records_outside`:** 94 mammal record countries on no listing, 5,916 records, 1.55 % of mammal records. 70 % of those countries already carry a `country-*` flag in `data/review/mismatches.json`, so the review queue already catches most of them.
- **Other datasets' `NATIVE` rows:** 78 mammal rows on 3 datasets without a role, ≥ 95 % on MDD's list. Other lists' native claims mostly agree with it. They're left out because each claim has one authority, not because they're wrong.
- **`projection_*`:** the file's size. All yes is 155,392 B of JSON before O3; O1 alone is 410 rows on 54 species, O2 alone 32 on 12.
- **`wikidata_non_mammals_value_reference`:** 4 of 26 have a referenced value, under the 13 that would make it a lead for curated rows.

**By class and `range.status`**

| Group | Species | MDD rows | GBIF key | Row beyond IUCN's | Country row | Listings, all but MDD (rows, species) | All defaults (rows, species) |
|---|---|---|---|---|---|---|---|
| Mammalia | 50 | 400 | 49 | 49 | 21 | 16, 5 | 5, 1 |
| Amphibia | 15 | 0 | 14 | 11 | 6 | 9, 4 | 3, 2 |
| Reptilia | 11 | 0 | 10 | 10 | 4 | 7, 3 | 2, 2 |
| `ok` | 72 | 398 | 72 | 69 | 31 | 32, 12 | 10, 5 |
| `no-open-records` | 1 | <5 | 1 | 1 | 0 | 0, 0 | 0, 0 |
| `identity-unsettled` | 3 | <5 | 0 | 0 | 0 | 0, 0 | 0, 0 |

**Gates**

- MDD name matches at least 45 of 50: pass, 50 of 50.
- Every place the matched species use is mapped: pass, 92 used, 0 unmapped.
- Conflict rate at most 10 %: too few to judge, 9 introduced mammal rows on 4 species (the rule asks for 20). Neither pass nor fail.
- No IUCN string kept: pass, 0 in the raw files and results.
- Every kept row CC0 or CC BY: pass.

**Outcomes applied**

- All defaults publish only 10 rows, so the build brief says not to start until O1 or O2 is yes.
- GRIIS alone reaches 9 species, under the plan's line of 10. The design holds: it's still the only global introduced source found.
- GRIIS Belgium's rows mix `Belgium` and `Flemish Region`, so its `area` stays null, which doesn't claim the whole country.
- The conflict gate is reported as too few. Nothing was dropped to pass it.

**Reproduce** (the fetch moves the counts; `measure.py` on the same `raw/` repeats byte for byte):

```
S=/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/spike
python3 -I $S/fetch.py --repo /srv/critter-ai/worktrees/critwire-native-ranges-design --out $S/raw 2>> $S/fetch.log
python3 -I $S/measure.py --repo /srv/critter-ai/worktrees/critwire-native-ranges-design --raw $S/raw --out $S
```

**Evidence:** `$S/results.json` (sha256 `5b1b81baf4b10fd1c330bcd7602bffb9749dcf45f9ba65c015edd1d18f1d857b`), `$S/results.tsv`, `$S/fetch.log`, `$S/raw/`, `$S/allowlist.json`, `$S/mdd-places.json`, `$S/datasets-first-pass.tsv`, code `$S/fetch.py`, `$S/measure.py`. MDD stays reproducible from Zenodo's pinned file (md5 `533e662fd5b8f66a5f56c191e7efac44`).

## Allowlist

From the spike's `allowlist.json`. Rows pass by dataset, never by field value (Sources). Every dataset the spike met has an entry and a reason: 88 datasets, 18 with a role, 70 without. A dataset met later has no role until a person gives it one: its rows yield nothing, and the ingest counts them.

- **`register`:** holds only non-native species, so a blank `establishmentMeans` means introduced there.
- **`checklist`:** holds native and non-native species alike, so a blank means nothing.
- **`area`:** only where the whole dataset covers less than its country. Null doesn't claim the whole country.
- **O2:** left out unless O2 is yes. 12 of the 18; the other 6 are what an all-defaults build holds.
- **Rows:** the dataset's rows in the spike's `raw/`, before the Data model's mapping and collapse key. 35 rows in all: one yields nothing (GRIIS Australia's blank), 34 map, 32 remain after the collapse.

**The GRIIS tie (O2),** for the 11 rows marked below: published by ISSG, a group of IUCN's Species Survival Commission; metadata names ISSG as project lead or contact, and some lists cite IUCN's alien-species definition or the EICAT paper. Rows are national expert lists of non-native species, not Red List data, so it's the owner's question, not a drop.

| Dataset | Key | Role | `area` | License | Rows | O2 | Reason |
|---|---|---|---|---|---|---|---|
| Dyntaxa. Svensk taxonomisk databas | `de8934f4-a136-481c-a87a-b0b202b80a31` | checklist | null | CC0 1.0 | 1 | no | Sweden's national taxon database: native and non-native species alike, so checklist. Its one row states INTRODUCED outright. No IUCN mention. |
| Checklist of alien herpetofauna of Belgium | `a12e2bf8-13ce-4d0b-b2d4-b1cd20450a63` | register | null | CC0 1.0 | 1 | no | Belgium's alien herpetofauna list. Row's locality is a region but the dataset spans the country, so area null. No IUCN mention. |
| Checklist of alien mammals of Belgium | `9a52d8bf-864a-4abb-95ba-319c4edfca8d` | register | null | CC0 1.0 | 1 | no | Belgium's alien mammals list. Row's locality is a region but the dataset spans the country, so area null. No IUCN mention. |
| DAISIE - Inventory of alien invasive species in Europe | `39f36f10-559b-427f-8c86-2d28afff68ca` | register | null | CC BY 4.0 | 1 | no | Inventory of alien species in Europe; per-row country. Only IUCN tie is one contact's affiliation (ISSG's European chair), read in session: no use of IUCN data, so not O2. |
| List of Alien Species in South Africa 2025 | `78ee0f56-267b-49e1-8afc-19f03cf81276` | register | null | CC BY 4.0 | 3 | no | SANBI's list of alien species in South Africa: by its title holds only non-native species, so a blank means introduced. No IUCN mention. |
| RINSE - Registry of non-native species in the Two Seas region countries (Great Britain, France, Belgium and the Netherlands) | `3f5e930b-52a5-461d-87ec-26ecd66f14a3` | register | null | CC0 1.0 | 4 | no | Registry of non-native species for four countries; per-row country, so no dataset area. No IUCN mention. |
| Checklist of the mammals of Central Asia (Kazakhstan, Kyrgyzstan, Tajikistan, Turkmenistan, Uzbekistan) | `c71d02ff-b756-4cc0-b089-d29ba9155619` | checklist | null | CC0 1.0 | 7 | yes | The only native-but-absent source met, plus one explicit INTRODUCED row. Stated sources are literature, monographs and institutional checklists; metadata says global aggregators including IUCN were used for cross-checking and its conservation status follows the Red List. Status is never kept. A stated cross-check, not a stated source of rows, so O2's question, not a drop. |
| Global Register of Introduced and Invasive Species - Australia | `15147db1-27c3-49b5-9c69-c78d55a4b8ff` | checklist | null | CC BY 4.0 | 1 | yes | GRIIS Australia isn't non-native only: its one row met has a blank means on the greater bilby, an Australian endemic, and an even sample of its species read in session gave 24 INTRODUCED rows and 1 blank. So a blank can't mean introduced here: role checklist, the row yields none, explicit INTRODUCED rows still count. GRIIS tie, above. |
| GRIIS Checklist of Introduced and Invasive Species - Ecuador | `1df9467e-0c60-4e5a-a7b0-2b60bd6648ed` | register | null | CC BY 4.0 | 4 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Belgium | `6d9e952f-948c-4483-9807-575348147c7e` | register | null | CC BY 4.0 | 2 | yes | National list of introduced species; rows met say INTRODUCED outright. Rows mix scopes in locality (Belgium, Flemish Region), so area null. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Colombia | `168568e7-eb5f-4ef6-8c59-f73ceaf57e91` | register | null | CC BY 4.0 | 2 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Germany | `2a281675-c184-4d54-a47e-5d3a7ec6653f` | register | null | CC BY 4.0 | 1 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Hawaii, United States (ver.2.0, 2022) | `6baf6a53-c106-40fb-bbde-f6d4e4051513` | register | Hawaii | CC0 1.0 | 1 | yes | US-RIIS Hawaii list: 'a taxon must be non-native everywhere in the locality'; 'Native pest species are not included'. Whole dataset is Hawaii, so area. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Japan | `5c5a6e45-d510-45ed-b7bf-6d0624fac056` | register | null | CC BY 4.0 | 1 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Peru | `5aa5f29e-532e-4ae5-81c0-f8a9eb4dcaf2` | register | null | CC BY 4.0 | 1 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - Singapore | `7b6661a3-5bbd-4dbb-b3e4-0c26df341977` | register | null | CC BY 4.0 | 1 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Introduced and Invasive Species - South Africa | `3cabcf37-db13-4dc1-9bf3-e6f3fbfbbe23` | register | null | CC BY 4.0 | 2 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |
| Global Register of Invasive and Introduced Species - Norway | `38de3b7a-5af3-4b6f-a1c5-4c0aa6abf010` | register | null | CC BY 4.0 | 1 | yes | National list of introduced species; rows met say INTRODUCED outright. GRIIS tie, above. |

**Without a role.** 70 datasets, 440 rows in `raw/`, none published:

| Why no role | Datasets | Rows in `raw/` | Rows dropped at fetch |
|---|---|---|---|
| License isn't CC0 or CC BY (44 CC BY-NC, 1 unspecified) | 45 | 0 | 125 |
| Fields can't be trusted: the Brazil catalogue marks animals INTRODUCED in their home countries, COLSA marks exotic animals NATIVE in South Africa | 2 | 233 | 0 |
| Text, no country on any row: COL and ITIS | 2 | 150 | 0 |
| Local, regional or national list with blank means and status: no claim to map | 16 | 42 | 0 |
| National list of `NATIVE` rows, or `NATIVE` and blank: no row under one native authority; comparison only | 3 | 13 | 0 |
| National or regional red list with a blank means: no origin claimed | 2 | 2 | 0 |

**Dropped before any of the above, and not among the 88:**

- The IUCN checklist (`19491596-35ae-4a91-9a98-85cf505f1bd3`), by key, whatever its license: 72 rows.
- Humboldt Institute's list of mammals prioritised for national Red Book categorisation (`9e86d932-72b2-46ca-a441-0ecb68dc5d1a`), which names IUCN in its title and citation and is CC BY-NC anyway: 7 rows.

So 679 rows fetched = 72 + 7 + 125 for license + 475 in `raw/`, of which 35 on the 18 and 440 on the 70.

## Data model

**A new file family: `/v1/range-listings.{json,csv,parquet}`**, one row per claim a source makes: "this source lists this animal in this country as…". The word *listings* keeps it honest and leaves `ranges.parquet` free for the polygons `plans/001-mvp.md:49` reserves that name for. The JSON is an array of rows, like `/v1/countries.json`.

It's a file and not a field under `range` for three reasons:

- `scripts/build/columns.ts:17` and `:47-50` put a new `range.*` leaf before `photo_url` in the CSV, and `scripts/build/contract.ts:177` then fails "needs /v2".
- `sources[]` allows one source per field (`scripts/derive/record.ts:19`, `:74`), and a country list has many.
- `/learn/data/manifest.json` pins `species.parquet`'s sha256 (`scripts/build/learn/data.ts:80`), so any species byte would change `dist/learn/`.

A new file leaves `species.*`, `countries.*` and all of `dist/learn/` byte-identical.

| JSON (CSV) | Type | Null | Means |
|---|---|---|---|
| `speciesId` (`species_id`) | INTEGER | no | `/v1/species` `id` |
| `country` | VARCHAR | no | `/v1/countries` `code`; pattern `^[A-Z]{2}$` |
| `area` | VARCHAR | yes | The narrower scope the source states (Hawaii, Azores), set per dataset in the allowlist or per place in `MDD_PLACES`, never from free-text `locality`. Null: none recorded, which doesn't claim the whole country |
| `origin` | VARCHAR | no | Table below |
| `presence` | VARCHAR | no | Table below |
| `source` | VARCHAR | no | The dataset's name; `attribution.json` credits each |
| `sourceKey` (`source_key`) | VARCHAR | no | Stable id: GBIF `datasetKey`, `mdd` or `curated`; joins `attribution.gbifChecklists[].key` |
| `license` | VARCHAR | no | `CC0 1.0`, `CC BY 4.0` |
| `doi` | VARCHAR | yes | The dataset's DOI; null only on curated rows (O3). All 18 datasets with a role have one |
| `url` | VARCHAR | no | The row's evidence page: `https://www.gbif.org/species/{sourceTaxonKey}`; `https://www.mammaldiversity.org/taxon/{id}`; a curated row's own reference |
| `sourceTerm` (`source_term`) | VARCHAR | no | What the source said. A source's row, verbatim: `Cambodia?`, `INTRODUCED/PRESENT`, `-/PRESENT` (`-` = blank). A curated row: our paraphrase of its reference, in our own words |

- **Codes:** ISO alpha-2 only. GBIF's TDWG, GADM and free-text `locationId` values aren't kept.
- **Key and order:** rows are sorted by `speciesId, country, area, origin, presence, sourceKey`, and that tuple is the key.
- **Collapse:** rows with the same key become one, so a usage-key and an accepted-key fetch can't double count. The lowest `sourceTaxonKey` gives `url` and `sourceTerm`, and derive prints how many collapsed.
- **Size, spike:** all yes before O3, 432 rows on 57 species, 155,392 B JSON, 68,669 B CSV. All defaults, 10 rows on 5 species, 4,217 B JSON. A whole file, so no per-species JSON at first (additive later).
- **`area` in the spike:** one row has it, GRIIS Hawaii's. MDD has 10 places with an `area`, and no matched species uses them.

**Values.** Two columns, because "uncertain" alone would blur *uncertainly native* with *doubtfully introduced*, and they mirror Darwin Core's `establishmentMeans` and occurrence status. Each value claims only what the source says. The contract freezes all of them in the first build, whatever O1 to O3 say, so a later yes adds rows, not a definition edit.

| `origin` | Means |
|---|---|
| `native-or-pre-1500` | MDD's rule: native, or introduced before 1500 CE. MDD doesn't separate the two |
| `native` | The source says native, without that blur: a checklist, or a curated row's reference |
| `introduced` | The source says introduced, or lists it on a register of non-native species. Doesn't say it lives wild there |
| `uncertain` | The source marks its origin uncertain |

| `presence` | Means |
|---|---|
| `present` | The source says present. MDD: "extant or reintroduced into its native distribution" |
| `uncertain` | MDD's `?`: "uncertainly present or possibly extinct". GBIF: `DOUBTFUL` |
| `absent` | The source says absent. Doesn't say it once lived there, or why, or since when |
| `unstated` | The source gives no status. Doesn't say it lives there now |

**Mapping.** Exhaustive; first match wins. `*` = by status: `PRESENT`, `COMMON`, `RARE`, `IRREGULAR`, `DETECTED` → `present`; `DOUBTFUL` → `uncertain`; `ABSENT` → `absent`; blank → `unstated`.

| Role | `establishmentMeans` | `status` | `origin` | `presence` |
|---|---|---|---|---|
| MDD | `Kenya` | | `native-or-pre-1500` | `present` |
| MDD | `Cambodia?` | | `native-or-pre-1500` | `uncertain` |
| MDD | `NA`, `Domesticated` | | no row, counted | |
| curated (O3) | as its reference says | | `native` | `present`, `uncertain` or `absent` |
| dataset with no role | any | any | no row, counted by the ingest per dataset key; its rows never reach the snapshot | |
| register, checklist | no `country` | any | no row, counted | |
| register, checklist | any | `EXCLUDED`, `NOT_DETECTED` | no row, counted | |
| register, checklist | `MANAGED` | any | no row, counted | |
| register, checklist | `INTRODUCED`, `NATURALISED`, `INVASIVE` | any | `introduced` | `*` |
| register, checklist | `UNCERTAIN` | any | `uncertain` | `*` |
| register | blank | any | `introduced` | `*` |
| register | `NATIVE` | any | no row, counted | |
| checklist | `NATIVE` | `ABSENT` | `native` | `absent` |
| checklist | `NATIVE` | other | no row, counted: one native authority (below) | |
| checklist | blank | any | no row, counted: no origin claimed | |

- A dataset gets role `register` only if it holds only non-native species, which is what lets a blank mean `introduced` there: GRIIS Hawaii's `Apalone spinifera` row (`-/PRESENT`, remark "Native to: contiguous 48 states"), South Africa's alien list.
- `COMMON`, `RARE` and `IRREGULAR` all assert presence; `sourceTerm` keeps the adjective.
- **Any other value or combination refuses at derive, naming the row.** Derive prints each exclusion's count.

**Every combination the spike met,** all 475 rows in `raw/`, each with its outcome above, none unmapped (`-` = blank):

| Role | `establishmentMeans` | `status` | Rows | Outcome |
|---|---|---|---|---|
| register | - | PRESENT | 4 | `introduced` / `present` |
| register | INTRODUCED | ABSENT | 1 | `introduced` / `absent` |
| register | INTRODUCED | DOUBTFUL | 3 | `introduced` / `uncertain` |
| register | INTRODUCED | PRESENT | 18 | `introduced` / `present` |
| checklist | - | PRESENT | 1 | no row: no origin claimed |
| checklist | INTRODUCED | DOUBTFUL | 1 | `introduced` / `uncertain` |
| checklist | INTRODUCED | PRESENT | 1 | `introduced` / `present` |
| checklist | NATIVE | ABSENT | 6 | `native` / `absent` |
| none | - | - | 139 | no row: dataset has no role |
| none | - | PRESENT | 81 | no row: dataset has no role |
| none | INTRODUCED | - | 8 | no row: dataset has no role |
| none | NATIVE | - | 204 | no row: dataset has no role |
| none | NATIVE | PRESENT | 8 | no row: dataset has no role |

Most of the mapping's lines met no row today. They stay, because the enums allow those values and a refresh may bring them.

**Historical is thin, by the sources' choice.** MDD says "Recently introduced and extinct populations are not included in the distribution of living mammals". The file's only historical signal is `native` + `absent`: 6 rows on 2 species, all from the Central Asia checklist, an O2 dataset. So an all-defaults build has no historical rows at all. That checklist's remark, "исчез на территории" (disappeared from the territory), isn't kept, so the row claims only what its field says, and `url` leads to the rest. The contract says rows state what open checklists list, with no promise of completeness.

**Null and absent.** No row means critwire holds no open listing, never that the animal isn't there. No arrays, no `[]`, no per-species status: `range.status` stays what it is, about records. A species with `identity-unsettled` can still have MDD rows, because that state is about GBIF's match.

**Conflict rule.** Prefer one good source:

- **One authority per claim.** Native lists: MDD for mammals (O1), the curated file for others (O3). Introduced, and native but absent: the allowlisted registers and checklists. No two native lists are ever merged.
- **Disagreements are shown, never fixed.** A conflict is a claim against its opposite, on `area`-null rows of one species and country: `native` or `native-or-pre-1500` against `introduced`; `present` against `absent`. `uncertain` and `unstated` contradict nothing. **Both rows ship**, and `data/review/range-conflicts.json` gets a `range-conflict` entry, severity `review`, with one entry per species and country whose `values.claims` names every `area`-null row's `sourceKey` (a cell can hold three). Agreeing rows from two registers also both ship, each credited.
- **Name misses.** A species with no row from its native authority gets a `range-not-found` entry, severity `info`: a mammal with no MDD row (the spike had none), a non-mammal with no curated row. Coverage of the curated file is checked in E2E, not refused at derive, so a future non-mammal can't block a deploy.

`range-conflicts.json` uses the `Mismatch` shape (`scripts/species.ts:60`), but stays out of `data/review/mismatches.json`, because `scripts/review/presort.ts:172-174` refuses a queue that differs from its evidence. That file isn't served, so the docs page prints the same test, checked on DuckDB against synthetic rows (found: `native-or-pre-1500` against `introduced`, `native` + `absent` against `introduced` + `present`, `introduced` + `present` against `introduced` + `absent`; not found: a pair where one row has an `area`, `native` against `native-or-pre-1500`, `uncertain` against `introduced`):

```sql
SELECT speciesId, country FROM 'range-listings.parquet' WHERE area IS NULL GROUP BY 1, 2
HAVING (COUNT(*) FILTER (origin LIKE 'native%') > 0 AND COUNT(*) FILTER (origin = 'introduced') > 0)
    OR (COUNT(*) FILTER (presence = 'present') > 0 AND COUNT(*) FILTER (presence = 'absent') > 0);
```

**Against `range.countriesWithOpenRecords`.** It isn't replaced or touched: it answers "where do open records exist", this file answers "what do sources list". The agreement measure is a join anyone can run, and `pnpm derive` prints the totals. Checked on DuckDB against today's `species.parquet`, whose 472 species-country pairs all stay in the result:

```sql
SELECT s.id, s.code, l.origin, l.presence, l.source
FROM (SELECT id, unnest("range".countriesWithOpenRecords) AS code FROM 'species.parquet') AS s
LEFT JOIN 'range-listings.parquet' AS l ON l.speciesId = s.id AND l.country = s.code;
```

Spike, totals only, the 50 mammals: 285 of 379 record countries are on a listing (0.752), and 275 of MDD's 364 `present` rows have open records (0.7555).

**Attribution.** `attribution.sources[]` gains `GBIF checklists` and, with O1, `Mammal Diversity Database`, registered in `scripts/build/sources.ts` (MDD's citation per release, as `COL_CITATIONS` does, so a new release fails until added). `fields` lists the columns file-qualified, one by one, as Natural Earth's does (`scripts/build/attribution.ts:71`). A new top-level `gbifChecklists` lists every used dataset with key, license, DOI, citation and row count, as `gbifDerivedDataset.datasets` does. `notes` and `DATA-LICENSE.md` state the IUCN ties of whatever the owner accepts, plainly.

## Contract

The build copies this into `contracts/v1.json` in the commit that adds the writer. It needs two new top-level keys in `V1Contract` and one more `checkTable` and `checkCsv` call (`scripts/build/contract.ts:25-31`, `:185-197`). Entries for a new file are additions, not definition edits, so there's no `/v2` and no owner review (`AGENTS.md`, Data). Each `sha` is `entrySha`'s (`contract.ts:47`).

The wording names no source, so an O1 no leaves nothing false or dangling: `native-or-pre-1500` is defined by what it says, and MDD's rule is what the Values table above ties it to.

```json contract
{
  "rangeListings": {
    "speciesId": {
      "type": "INTEGER",
      "null": false,
      "means": "the animal's id in /v1/species (its id field)",
      "sha": "a73d3a0a2316"
    },
    "country": {
      "type": "VARCHAR",
      "null": false,
      "means": "the country the source lists the animal in: a code from /v1/countries; a row says what a source lists, not that the animal lives there; no row means critwire holds no open listing, never that the animal isn't there",
      "pattern": "^[A-Z]{2}$",
      "sha": "97766e3f4fc0"
    },
    "area": {
      "type": "VARCHAR",
      "null": true,
      "means": "the narrower scope the source states inside the country (Hawaii, Azores), set per source or place, never from free text; null: none recorded, which doesn't claim the whole country",
      "sha": "55345a8d47d7"
    },
    "origin": {
      "type": "VARCHAR",
      "null": false,
      "means": "how the source says the animal came to be there: native-or-pre-1500 (native, or introduced before 1500 CE; the source doesn't separate the two), native (the source says native, without that blur), introduced (the source says introduced, or lists it on a register of non-native species; doesn't say it lives wild there), uncertain (the source marks its origin uncertain)",
      "values": [
        "native",
        "native-or-pre-1500",
        "introduced",
        "uncertain"
      ],
      "sha": "a795d9fe9e82"
    },
    "presence": {
      "type": "VARCHAR",
      "null": false,
      "means": "what the source says about the animal being there: present (the source says present; a native list's present can include a reintroduction into the native distribution), uncertain (the source marks it doubtful, uncertainly present or possibly extinct), absent (the source says absent; doesn't say it once lived there, or why, or since when), unstated (the source gives no status; doesn't say it lives there now)",
      "values": [
        "present",
        "uncertain",
        "absent",
        "unstated"
      ],
      "sha": "33fd7bdaecf0"
    },
    "source": {
      "type": "VARCHAR",
      "null": false,
      "means": "the source's name, as attribution.json credits it",
      "sha": "fec809e5dd0b"
    },
    "sourceKey": {
      "type": "VARCHAR",
      "null": false,
      "means": "the source's stable id: a GBIF dataset key, or a short name for any other source (mdd, curated); a GBIF key joins attribution.json's gbifChecklists[].key",
      "sha": "b0c4c6d8169f"
    },
    "license": {
      "type": "VARCHAR",
      "null": false,
      "means": "the license of this row's values, as its source grants it",
      "values": [
        "CC0 1.0",
        "CC BY 4.0"
      ],
      "sha": "af0ed682f935"
    },
    "doi": {
      "type": "VARCHAR",
      "null": true,
      "means": "a DOI to cite the source by (bare, without https://doi.org/); null only on a curated row, whose url is its reference",
      "sha": "f6a1312e9caa"
    },
    "url": {
      "type": "VARCHAR",
      "null": false,
      "means": "the page to check this row against: the source's page for the taxon, or a curated row's own reference",
      "sha": "38ff98ecc068"
    },
    "sourceTerm": {
      "type": "VARCHAR",
      "null": false,
      "means": "what the source said: on a source's row verbatim, a place as listed, with its question mark if it has one (Cambodia?), or establishment means and status joined by a slash (INTRODUCED/PRESENT; - when blank); on a curated row, our paraphrase of its reference, in our own words",
      "sha": "830c1de6fcd0"
    }
  },
  "rangeListingsCsv": [
    "species_id",
    "country",
    "area",
    "origin",
    "presence",
    "source",
    "source_key",
    "license",
    "doi",
    "url",
    "source_term"
  ]
}
```

## Pipeline

| Command | Owns | Notes |
|---|---|---|
| `pnpm ingest mdd` | `data/raw/mdd/snapshot.json` | **Exists only after O1 is a recorded yes.** Pinned file (md5 `533e662fd5b8f66a5f56c191e7efac44`); cut columns and names only, keyed by base mammal name (null = no match); under 1 min |
| `pnpm ingest gbif-checklists` | `data/raw/gbif-checklists/snapshot.json` | Per species `keys` and role-dataset rows only (rows of unchecked license stay out of a public repo; a new role forces a re-ingest through the `allowlist` check, so nothing is lost), the `allowlist` it used, drop counts per reason, no-role rows by dataset key. About 6 min at ≤ 2 req/s: the spike's GBIF part took 630 requests, which at its 0.55 s throttle is 347 s |
| hand, agents + owner (O3) | `data/review/range-curated.json` | Only if O3 is (a). Each row cites its reference, and no IUCN page. `sourceKey` `curated`, `license` `CC BY 4.0` (critwire's own, `DATA-LICENSE.md`), `doi` null. A bare array, like `country-overrides.json`; each element has exactly `speciesId, country, area, presence, url, sourceTerm`, and derive fills the rest. No review gate (owner, build brief's addendum): rows publish labelled curated by `source`, and a handoff item says how to correct one |
| `pnpm derive` | `data/range-listings.json` (`{sources, rows}`, like `countries.json`), `data/review/range-conflicts.json` | Pure and offline, a third half of `deriveAll`, like `deriveSample` (`scripts/derive/listings.ts`), not in `deriveCore`: there it would read a snapshot before the first ingest, and refuse the stale snapshot `ingest gbif-checklists` exists to replace, or a stale one during `ingest gbif-sample`. `matchCountries` stays untouched; `deriveListings` checks each code against `countries.rows`, so a code with no country row throws, naming the row. Every code the spike's rows and places use has a row today. `MDD_PLACES` crosswalk: an unknown place throws |
| `pnpm build` | `dist/v1/range-listings.{json,csv,parquet}` | `scripts/build/range-listings.ts`, like `countries.ts`; after `writeCountries` (`scripts/build.ts:58`) |

**The allowlist in the snapshot.** The ingest's constant holds dataset → role, `area` and reason, with O2's datasets only after a yes. The snapshot's `allowlist` holds dataset → role and `area` only. `reason` stays in the ingest's constant and in this file, because `assertNoIucnData` (the pattern at `scripts/ingest/gbif.ts:138`) walks the snapshot, and a reason may name the tie.

**The guard.** `assertNoIucnData` (`scripts/raw.ts:95`) catches `iucn` and `additionalStatus`, but not `threatStatus` or `appendixCites`: the spike met 144 rows with `threatStatus` on other datasets. Rows and metadata are written through a key allowlist, as the spike's `fetch.py` does, which keeps both out, and the guard gains `threatStatus`. It covers snapshots only; `attribution.json` and `DATA-LICENSE.md` may name IUCN to state a tie.

**O1 gate.** Nothing of MDD enters `data/`, `scripts/` or `dist/` until O1 is a recorded yes (the handoff reply, copied to the build plan's Decisions). Until then the build has no MDD ingest, no `MDD_PLACES` and no MDD rows; the brief makes these steps conditional.

**Key staleness.** The GBIF rows belong to the taxon they were fetched for, and base names don't show a changed key. One function, `checklistKeys(g)` in `scripts/derive/gbif.ts`, gives a species' keys from `deriveGbif`'s result: the unique non-null `g.id`, `g.taxonKey`. The ingest fetches those and records them. `deriveCore` only collects them in memory; `deriveListings` compares them (`assertGbifChecklistsFresh`, `scripts/derive/listings.ts`), the pattern of `assertGbifFresh` (`scripts/derive/gbif.ts:30`) and `assertBaseNames` (`scripts/raw.ts:89`): `staleSnapshot` names the species and the ingest, and nothing is written. Today that's 73 species with a key, 4 of them with two.

**Refresh cost:** about 7 min of fetching (GBIF 6, MDD 1), then derive and build. No `learn:check`, no DOI, no habitat, no sample. A species change adds these two ingests to its existing ≈ 1 h.

**DOI impact:** none. Rows cite each dataset's own DOI; the derived-dataset DOIs cover occurrence counts, which don't move.

**The plain build refuses, and `--draft` lifts none of these:**

- a stale `data/range-listings.json` ("run pnpm derive");
- a snapshot not covering the base names ("run pnpm ingest …");
- a checklists snapshot whose `keys` differ from a species' current keys, or whose `allowlist` differs from the constant ("data/raw/gbif-checklists is stale (Emydoidea blandingii: keys): run pnpm ingest gbif-checklists");
- an MDD pin or citation mismatch;
- a license other than the two, or, in a snapshot, an IUCN string or `threatStatus` key;
- a value or combination off the Data model's mapping, naming the row;
- an unmapped place or a country with no row;
- a contract break.

**`/learn/data` doesn't change in the first build.** The build's check, against that mission's own Baseline hash list: only `v1/range-listings.*` are new, only `index.html` and `v1/attribution.json` differ, and every other file, including all of `dist/learn/` and `v1/species*`, is byte-identical. Learn's credits don't read `attribution.json`'s contents (`scripts/build/learn/credits.ts`).

**Risk.** `/v1/species/{key}/distributions` sits on the legacy backbone. It answered all 73 keyed species in the spike, serving datasets published in late October 2026. If GBIF retires it, the ingest fails loudly, the committed snapshot stands and builds keep working.

## Learn tie-in

Recommended: **no Learn change in the first build**, then a small separate mission, whose native-row lessons (s1, f3) need O1 or O3 (a). Each addition follows the 004-and-site-together rule. A browser block needs one entry in `V1_INPUTS` (`scripts/build/learn/data.ts:80`) and in `DATA_FILES` (`site/learn/src/engine.ts:25`), which changes `manifest.json`, but no loader table. No lab key sees that file, so a build guard (`scripts/build/learn/listing-blocks.ts`) runs each block reading it against its snapshot: mammal rows only, so a curated correction moves no lesson. Plan `2026-11-02-critwire-learn-range-lessons`.

| Module | What it gains | Path | Cost |
|---|---|---|---|
| **s1 Bias** | Answers its own question, "What can records say about where an animal lives, and what can't they?": records against native listings, per species. Spike, mammals: 275 of 364 native rows have open records (0.7555), and 94 record countries sit on no listing, each one a question to ask | Browser | Three blocks (the numbers, per animal, the one mammal conflict), prose, results |
| **f3 Joins** | An anti join: listed native countries with no open record (89 of those 364), next to "Which have no records at all?" | Browser | One lesson block (an exercise hides its result), one exercise |
| **d1/d2** | A long table against a list in a cell; a composite key; origin and presence as two facts | Browser | One block |
| **e4 Provenance** | A license and quality case from what the spike met, on made-up rows: a list dropped for CC BY-NC, a catalogue marks animals introduced in their home countries, a row to drop by dataset | PostGIS, inline rows | One block |
| **g3 Spatial joins** | An open version of the appendix on records against a range (`site/learn/modules/g3.html:43`, today IUCN-download-only): records per outline against listed countries | PostGIS: a 17th lab table, so loader, `LAB_TABLES`, `lab.mmd`, `checked/` | Largest; defer |
| **c1 Feed** | A flag on each cell's country (listed or not) | Feed schema and results change | Defer |

**Copy rule.** "Records, never range" (`AGENTS.md`, Learn rules) stays for records. A page reading this file needs one added line: *native, introduced and range words describe only `/v1/range-listings` rows, worded as what a named source lists ("MDD lists it in Kenya as native or introduced before 1500"); records are still never range.* That's O4. `site/learn/modules/s1.html:19`, `p4.html:7`, `c1.html:35`, `site/index.html:140` and `DATA-LICENSE.md` are all true and stay true for records; each needs a sentence only when its page first reads the file.

## Owner's choices

Nothing in this design waited on these. The build brief carries the defaults, and the build starts when you start it.

**Defaults, for any question unanswered when the build starts: no MDD, no GRIIS or other O2 dataset, O3 (b).** An all-defaults build publishes 10 rows on 5 species, all introduced, none native. So **don't start the build until O1 or O2 is yes.**

| Answer | What it flips in the build | Rows, spike |
|---|---|---|
| O1 yes | Adds `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note | + 400, all 50 mammals |
| O2 yes | Adds GRIIS and the other O2 dataset to the allowlist, with their ties stated | + 22: GRIIS 15 on 9 species, Central Asia 7 |
| O3 (a) | Adds `data/review/range-curated.json` and `native` rows for the 26 | By hand: at least one row on each of the 26 |
| O4, O5 | Nothing in this build: they belong to the Learn mission | None |

- **O1 (handoff H7). May critwire publish MDD's country lists, given their IUCN ancestry?** They're the American Society of Mammalogists' curated work, under CC BY 4.0, but the paper says the data were "initially sourced from the IUCN, HMW, and CMW", and no row says which. **Recommend yes**, with no IUCN field stored and the ancestry stated in attribution and `DATA-LICENSE.md`.
  - **Worth:** 400 rows on all 50 mammals by exact name, 36 of them uncertain. It's the only practical open route found to country-level native lists. It lifts open-record countries on a listing from 4 of 472 across all 76 to 285 of 379 for the mammals.
  - **Agreement:** only 9 introduced rows on 4 mammals exist to test it against, under the 20 the gate asks for, so the conflict rate was too few to judge. Fewer than 5 of them conflict. Other lists' native claims agree with MDD: at least 95 % of 78 such rows.
  - **The honest risk:** IUCN's terms bar sharing what's made from its ranges (`site/learn/modules/g3.html:44`), and this is a step removed from that, not free of it.
  - **No answer means no MDD anywhere:** no rows, nothing in `data/`, and even this spike kept only aggregates, because your rule is non-negotiable. A no leaves the curated route (O3) as the only native source.
- **O2 (handoff H8). May critwire publish GRIIS rows, given that an IUCN specialist group publishes them?** They aren't Red List data: national experts write them, and each is CC BY or CC0. The same question covers the one other kept dataset that says it uses IUCN, the Central Asia checklist (a stated cross-check; its 7 rows include all 6 `native` + `absent`, the file's only historical signal). **Recommend yes.** It's the only global introduced source found.
  - **Worth:** GRIIS alone reaches only 9 species, 15 rows from 10 datasets; with every other kept dataset, 32 rows on 12.
  - **Agreement:** the same 9 rows, too few to judge.
  - **No answer means all of them are left out:** 10 rows on 5 species from the other lists, and no historical rows.
- **O3 (handoff H9). The 26 non-mammals have no open native list.** Either (a) a hand-written `data/review/range-curated.json`, agents' entries, each row citing its reference (the build brief's addendum: published without waiting for your review, a handoff item says how to correct one), under the existing rule "Bare trait values may come from any cited source in our own words; bulk imports only from open datasets", never reading IUCN pages, about two sessions plus your review; or (b) introduced rows only for them, no native rows. **Recommend (a).** It's the one route where every row names its reference, so IUCN can be kept out row by row, and with O1 it takes native coverage from 50 to 76. Wikidata won't shortcut it: 4 of the 26 have a referenced value. Without an answer: (b).
- **O4 (handoff H10). Change the copy rule as in Learn tie-in** when a page first reads this file. **Recommend yes,** only then, in that change.
- **O5 (handoff H11). Which Learn additions, and when?** **Recommend** s1, f3 and e4 as one small mission after the build goes live; d1/d2 if it fits; defer g3 and c1. s1 and f3 need O1 or O3 (a), because they read native rows. e4 uses made-up rows, so it needs neither.

## Follow-up

Not in the first build, and nothing here depends on them.

- **Captive records may reach `range.countriesWithOpenRecords`.** `scripts/ingest/gbif.ts:17` filters by `basisOfRecord` only, and 4,433 of the Asian elephant's 6,884 open records carry `degreeOfEstablishment=captive` (probe, one species; not measured across the 76). Open-record countries outside every listing, a possible symptom, come to 94 for mammals, 5,916 records or 1.55 % of mammal records, and 70 % of those countries already carry a `country-*` flag. The fix changes `/v1` and Learn: published countries move, and `BASIS_OF_RECORD` is shared with the lab sample's download. So it costs at least the ≈ 1 h of a new sample plus ≈ 1–2 h of `learn:check --update` and results (`AGENTS.md`, Countries), and it needs its own plan. Measure first: the share of captive-labelled records per species, and which countries would fall away.
- **Per-species JSON,** `/v1/range-listings/{id}.json`. Additive. Not needed at 155,392 B.
- **Polygons,** under the reserved name `ranges.parquet` (`plans/001-mvp.md:49`). GARD first for the turtles if O3 is (b); it needs a spatial pipeline and has native rows only.
- **Overrides for listings.** Additive, once a real conflict needs one. Today conflicts are shown, and fewer than 5 exist.
- **Re-read the archived quotes** when the build starts, and a dataset's license at each ingest (the ingest refuses any but the two). A dataset met later has no role until a person gives it one.

## Rejected

- **Fields under `range` in species records:** CSV prefix rule, one source per field, and it changes `dist/learn/manifest.json`.
- **Native list only, no introduced:** the brief asks for both.
- **Merging every GBIF checklist by its fields:** the Brazil catalogue and COLSA rows prove that's wrong (Sources).
- **Deriving native from records (a core-region rule):** records aren't range.
- **One `status` column:** blurs uncertain native with doubtful introduced.
- **`extirpated` as a value:** GBIF's `ABSENT` doesn't say so, and may also retract an old claim.
- **Plain `native` for MDD:** its rule includes introductions before 1500.
- **`area` from `locality`:** free text ("Belgium", "Flanders", "Flemish Region") makes near-duplicate keys.
- **Keeping a cut of MDD in the spike folder:** retains the lists O1 asks about.
- **Leaving MDD out of the spike:** the brief requires its numbers, and you couldn't weigh O1 without them.
- **Polygons (GARD, range maps, RESOLVE):** native only, hundreds of MB to 20 GB, and a spatial pipeline; countries are what the sources and the game can use now.
- **An overrides file now:** conflicts are shown, and nothing needs one yet; additive when something does.
- **Conflicts in `mismatches.json`:** breaks the review queue (Data model).
- **A Learn lab table now:** loader, manifest, ERD and `checked/` churn with no need.
- **Using the CC BY GBIF copy of the IUCN checklist:** your rule forbids it whatever the license.
- **Sources,** each for the reason in its row: COL, GBIF occurrence fields, Wikidata, AmphibiaWeb, Reptile Database, Amphibian Species of the World, CITES Species+, iNaturalist, GARD, Mammal range maps, ITIS, RESOLVE, FishBase, SeaLifeBase, WoRMS, Avibase, Clements, IOC.
