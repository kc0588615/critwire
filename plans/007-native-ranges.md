---
title: Native, introduced and historical range, a tested design
---

# Native ranges

For the owner: how critwire could publish where sources list each animal as native or introduced, from sources it may publish, next to today's "countries with open records", which aren't range. Plan and full evidence: `plans/2026-11-01-critwire-native-ranges-design.md`. Nothing here is built: `/v1` and `dist/` are unchanged.

## Summary

Written last, once every section below is final.

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

Next step: from the spike's `allowlist.json`.

## Data model

Next step.

## Contract

Next step.

## Pipeline

To follow.

## Learn tie-in

To follow.

## Owner's choices

To follow.

## Follow-up

To follow.

## Rejected

To follow.
