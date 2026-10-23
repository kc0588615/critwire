# 003: critwire Learn, growing the data and the spatial track

> **Superseded 2026-10-23** by plans/004-learn-curriculum.md (practitioner curriculum). Kept as a record; 004 §1 lists what is reused.

This extends [`002-learn.md`](002-learn.md) (engine, learners' schema, ERD and core lessons, all kept as they are) with what data critwire could add next and an advanced spatial track on PostGIS and the worldwide habitat map. It designs and measures; it builds nothing public. Every SQL block here was run by the spike or says why not (`-- status:`), and the build missions C and D start from the briefs in §7.

## 1. Growing the data

Every dataset the brief names, plus a trait source for the turtles and tortoises, ranked by what the lessons gain for the ingest work, with license risk first: a dataset whose terms block hosting can't rank above one that doesn't. Each license is quoted word for word from a page the spike saved (`evidence/licenses/<dir>/` in the spike folder, with its URL, time and sha256 in `evidence/licenses/SOURCES.md`); `licenses.ts --verify` checks every quote below against that page. Mission C ingests the non-spatial data, mission D the spatial (§7). Tables are §2's.

| # | Dataset | License | Hostable | Feeds (§2) | Mission |
|---|---|---|---|---|---|
| D1 | AnAge | CC BY 3.0 | yes | `traits`, `species_traits` | C |
| D2 | Natural Earth admin-0 (v5.1.2) | public domain | yes | `country_shapes` | D |
| D3 | GBIF occurrence sample | per record; CC0 1.0 and CC BY 4.0 only | yes, open records only | `occurrences` | D |
| D4 | Jung et al. 2020 habitat map, v004 | CC BY 4.0 | yes, v004 only | `habitat_classes`, `country_habitats`, `occurrences.habitat_code` | D |
| D5 | Wikidata labels | CC0 | yes | `species_names` | C |
| D6 | AmphiBIO v1 | CC BY 4.0 | yes | `species_traits` | C |
| D7 | Amniote life-history database | CC BY 4.0 (ESA) / CC0 (Wiley's copy) | yes | `species_traits` | C |
| D8 | Open Tree of Life 16.1 | CC0 | yes | `tree_nodes` | C |
| D9 | RESOLVE Ecoregions 2017 | CC BY 4.0 | yes | `ecoregions`, `biomes` | D |
| D10 | Natural Earth admin-1 and physical layers | public domain | yes | none yet (a later `region_shapes`) | D, optional |
| D11 | EltonTraits 1.0 | CC BY 4.0 (ESA) / CC0 (Wiley's copy) | yes | `species_traits` | C, optional |
| D12 | COMBINE | CC BY 4.0 | yes, minus its IUCN-sourced columns | `species_traits` | C, optional |
| D13 | ReptTraits | CC BY 4.0 | yes, minus its IUCN columns | `species_traits` | not yet |
| D14 | PanTHERIA | CC BY 4.0 (ESA) / CC0 (Wiley's copy) | yes | `species_traits` | not yet |
| D15 | CHELSA 2.1 | CC0 | yes | none yet (a later `country_climate`) | after D |
| D16 | WorldClim 2.1 | non-commercial, no redistribution | **no: blocks hosting** | none | never |
| D17 | WDPA | no redistribution, no commercial use | **learner download only** | none | D, one learner-own lesson at most |

**Add first: AnAge, Natural Earth admin-0 and the GBIF occurrence sample.**
- **AnAge** gives mission C its whole first lesson set (a traits table, units, comparing classes) from one small file that covers mammals, reptiles and amphibians.
- **Natural Earth admin-0** and **the GBIF sample** are what every spatial lesson stands on: E1's point-in-polygon ran on exactly these two (§4), and the habitat track (D4) joins through both.
- All three are open (CC BY 3.0, public domain, CC0 or CC BY per record), small, and fit pipelines critwire already has (A1's country matcher, `ingest gbif` and its license filter). Where AnAge leaves a class thin (`d01` below), AmphiBIO (D6) and the Amniote database (D7) fill the same `species_traits` table, so the top three don't change.

**Licenses that block hosting:** WorldClim (D16: no redistribution, non-commercial) and WDPA (D17: no redistribution, no commercial use). A learner may download either for their own use; critwire serves neither, nor anything computed from them. **Conditional:** COMBINE (D12) and ReptTraits (D13) only without the columns they took from IUCN's Red List (critwire never stores IUCN data, §6); Jung only version 004 (versions 001 and 002 were CC BY-NC); GBIF only CC0 1.0 and CC BY 4.0 records. IUCN's own range files are §6.

### D1 · AnAge

**Enables:** the traits table and its units (§3), comparing classes on the same trait, NULLs where a species has no value; a "who lives longest" card game.

**License:** CC BY 3.0 Unported · https://genomics.senescence.info/legal.html · retrieved 2026-10-22T21:18:46Z · evidence/licenses/anage/

> This work is licensed under a Creative Commons Attribution 3.0 Unported License. In brief, HAGR is free for all purposes, including commercial, educational, and research purposes, provided you mention the use of HAGR in subsequent presentations, publications, etc.

The same page says the observations themselves are copyrighted, so the license is what lets critwire publish them:

> the data sheets in its databases, including the observations in AnAge and descriptions in GenAge, and the HAGR interface are copyrighted.

**Hostable:** yes, credited (HAGR and the AnAge paper; CC BY 3.0's URL added to `LICENSE_URLS`).

**Size:** `species/dataset.zip`, 169,150 bytes (HEAD, Last-Modified 2023-07-03): one tab-separated file.

**Joins on:** genus and species name → `species.scientific_name`; names that differ are matched through Catalogue of Life synonyms and listed in `mismatches.json`, never guessed.

**Ingest work:** small. A new `ingest anage`: pick named columns (adult body mass, maximum longevity, female maturity, clutch size), each with its unit, into `traits` and `species_traits`.

How far exact names reach today (the spike's stand-in rows, AnAge plus AmphiBIO's body length; mission C's synonym match adds to it):

```sql
-- q: d01
-- status: spike-table
SELECT t.class,
       count(DISTINCT t.species_id)  AS species,
       count(DISTINCT st.species_id) AS with_traits
FROM species_taxonomy AS t
LEFT JOIN species_traits AS st ON st.species_id = t.species_id
GROUP BY t.class
ORDER BY t.class;
```

```text
-- result: d01 · 3 rows · sha256 7df873d2ab7f
class | species | with_traits
Amphibia | 15 | 15
Mammalia | 50 | 35
Reptilia | 11 | 8
```

### D2 · Natural Earth admin-0 (country outlines)

**Enables:** `country_shapes`: every point-in-polygon and spatial-join lesson (§4), the habitat area per country (D4); a "which country is this point in" map game.

**License:** public domain · https://www.naturalearthdata.com/about/terms-of-use/ · retrieved 2026-10-22T21:18:40Z · evidence/licenses/naturalearth/

> All versions of Natural Earth raster + vector map data found on this website are in the public domain. You may use the maps in any manner, including modifying the content and design, electronic dissemination, and offset printing.

The repository's LICENSE.md at the pinned commit (v5.1.2) says the same:

> # Everything here is public domain.

> No permission is needed to use Natural Earth. Crediting the authors is unnecessary.

**Hostable:** yes. critwire credits it anyway, with the version.

**Size:** admin-0 as GeoParquet (the spike's files): 1:10m 7.35 MB, 1:50m 1.21 MB.

**Joins on:** `countries.code` (ISO alpha-2) by A1's matcher (`scripts/countries-draft.ts`), one outline per code.

**Ingest work:** small. Pin the commit; GeoJSON → GeoParquet with WKB geometry, as the spike's `e1-data.ts` does; 1:50m for the browser, 1:10m for PostGIS.

Countries that critwire lists for some species and that have an outline to test points against:

```sql
-- q: d02
-- status: spike-table
SELECT count(DISTINCT sc.country_code) AS listed_countries,
       count(DISTINCT cs.country_code) AS with_outline
FROM species_countries AS sc
LEFT JOIN country_shapes AS cs ON cs.country_code = sc.country_code;
```

```text
-- result: d02 · 1 row · sha256 08e89e7c46e4
listed_countries | with_outline
107 | 107
```

### D3 · GBIF occurrence sample

**Enables:** `occurrences`: points for spatial joins, distance, the habitat value at a point (§4), and the honest lesson that records are not a native range; a "where was it seen" map game.

**License:** per record: CC0, CC BY or CC BY-NC; critwire takes CC0 1.0 and CC BY 4.0 only · https://web.archive.org/web/20260831053310id_/https://www.gbif.org/terms · retrieved 2026-10-22T21:34:17Z · evidence/licenses/gbif/

> the GBIF Governing Board established a general policy to "ensure that all species occurrence datasets within the network are associated with digital licenses equivalent to one of…three choices supplied by Creative Commons":

> CC0, under which data are made available for any use without restriction or particular requirements on the part of users

> CC BY, under which data are made available for any use provided that attribution is appropriately given for the sources of data used, in the manner specified by the owner

> CC BY-NC, under which data are made available for any use provided that attribution is appropriately given and provided the use is not for commercial purposes

The data user agreement (Wayback 20260724235545):

> Users must comply with the terms and conditions included in the licence selected by each Data Publisher, and the licensing information included with each data download.

**Hostable:** yes, CC0 1.0 and CC BY 4.0 records only (the filter critwire's countries already use, `assertOpenLicenses`); never CC BY-NC. Each row keeps its `license` and `dataset_key`, and the derived-dataset DOI credits the datasets.

**Size:** a capped sample per species (the spike's: one page of up to 300 records per species, 12 KB of Parquet for three species), not every open record.

**Joins on:** `species.gbif_id` (GBIF's taxonKey) → `occurrences.species_id`; the record's country → `countries.code`; `habitat_code` → `habitat_classes.code` (D4).

**Ingest work:** medium. The sample is drawn inside `ingest gbif`, with the same filters and in the same run, so the dataset counts and the DOI don't change; derive checks every sampled record's dataset is counted.

The spike's sample by license, and how many of its records fall in a country critwire already lists for that species:

```sql
-- q: d03
-- status: spike-table
SELECT o.license,
       count(*)                                         AS records,
       count(DISTINCT o.species_id)                     AS species,
       count(*) FILTER (WHERE sc.species_id IS NOT NULL) AS in_listed_country
FROM occurrences AS o
LEFT JOIN species_countries AS sc
  ON sc.species_id = o.species_id AND sc.country_code = o.country_code
GROUP BY o.license
ORDER BY o.license;
```

```text
-- result: d03 · 2 rows · sha256 092d7f7b2773
license | records | species | in_listed_country
CC BY 4.0 | 377 | 3 | 373
CC0 1.0 | 151 | 3 | 150
```

### D4 · Jung et al. 2020 habitat map, v004

**Enables:** the raster lessons (§4), habitat composition per country (`country_habitats`, a many-to-many lesson in §3), the habitat class at open-record points; a "guess the habitat" game from a map tile.

**License:** CC BY 4.0 · https://zenodo.org/records/4058819 · retrieved 2026-10-22T21:18:43Z · evidence/licenses/jung/

> Rights License Creative Commons Attribution 4.0 International

> Please cite the published paper and state the used version of the habitat map

The API record names the version:

> "license": {"id": "cc-by-4.0"}

> "version": "004"

**Hostable:** yes for version 004, and anything computed from it, credited with the paper and the version. Versions 001 and 002 were CC BY-NC 4.0; the owner's COG names no version, so its provenance is §5's gate.

**Size** (Zenodo API): level-2 fractions at 1 km, `lvl2_frac_1km_ver004.zip`, 695,484,415 bytes (79 layers); level-2 composite at 100 m, 2,454,999,319 bytes; the legend's code zip, 2,149,859 bytes.

**Joins on:** class `code` → `habitat_classes` (from the legend); `country_habitats (country_code, habitat_code)` and `occurrences.habitat_code` are computed by `ingest habitat` (§2, §5).

**Ingest work:** large (mission D): `pnpm ingest habitat`, measured in the spike as 695 MB from Zenodo in 223 s and about 37 minutes of single-threaded decoding for all 79 layers (§5).

### D5 · Wikidata labels

**Enables:** `species_names`: a one-to-many lesson (names per language), `GROUP BY language`, a `LEFT JOIN` for names that are missing; a name-matching game in the learner's own language.

**License:** CC0 · https://www.wikidata.org/wiki/Wikidata:Licensing · retrieved 2026-10-22T21:34:14Z · evidence/licenses/wikidata/

> All structured data (i.e. the main, Property, Lexeme, and EntitySchema namespaces) is released into the public domain under Creative Commons Zero.

> All data in Wikidata has a CC0 license.

**Hostable:** yes. Wikidata is already a cited source; labels are structured data. Text in other namespaces (CC BY-SA) is never used.

**Size:** a few hundred KB as JSON (the spike's `species_names.parquet`: 70 KB).

**Joins on:** `species.wikidata_id` → `species_names (species_id, language)`.

**Ingest work:** small. `ingest wikidata` already fetches named properties; it adds `rdfs:label` per language. Never whole entities, and never property P141, which is a Red List category.

Languages per species in the stand-in:

```sql
-- q: d04
-- status: spike-table
SELECT count(*)    AS species,
       min(n)      AS fewest_languages,
       median(n)   AS median_languages,
       max(n)      AS most_languages
FROM (SELECT species_id, count(*) AS n FROM species_names GROUP BY species_id);
```

```text
-- result: d04 · 1 row · sha256 2c42f01843c0
species | fewest_languages | median_languages | most_languages
76 | 32 | 58.5 | 224
```

### D6 · AmphiBIO v1

**Enables:** the amphibians' traits in more depth than AnAge (body size, age at maturity, clutch size, habitat flags), so comparing classes isn't mammals against nothing.

**License:** CC BY 4.0 · https://api.figshare.com/v2/articles/4644424 · retrieved 2026-10-22T21:18:47Z · evidence/licenses/amphibio/

> "license": {"value": 1, "name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/"}

> "doi": "10.6084/m9.figshare.4644424.v5"

**Hostable:** yes, credited.

**Size:** `AmphiBIO_v1.zip`, 1,437,220 bytes (API).

**Joins on:** species name → `species.scientific_name`, the amphibians only.

**Ingest work:** small: one CSV in a zip; named columns, each with its unit.

### D7 · Amniote life-history database (Testudines)

**Enables:** one set of columns and units (body mass, longevity, clutch size, maturity) across mammals and reptiles, the turtles and tortoises included: the cleanest "comparing classes" lesson, and the reptile rows AnAge lacks.

**License:** CC BY 4.0 archive-wide at ESA; CC0 on the publisher's figshare copy · https://esapubs.org/archive/copyright.htm · retrieved 2026-10-22T21:19:11Z · evidence/licenses/amniote/

> Except where otherwise noted, Ecological Archives are covered under the Creative Commons Attribution (CC BY 4.0) license.

> Copyright restrictions: None.

Wiley's figshare copy (record 3563457):

> "license": {"value": 2, "name": "CC0", "url": "https://creativecommons.org/publicdomain/zero/1.0/"}

> "title": "An amniote life-history database to perform comparative analyses with birds, mammals, and reptiles"

**Hostable:** yes, credited as CC BY 4.0 (the stricter of the publisher's two open statements).

**Size:** `ECOL_96_269.zip`, 6,539,535 bytes (API).

**Joins on:** genus and species → `species.scientific_name`.

**Ingest work:** small: one CSV in a zip; `-999` means missing and becomes NULL. Simpler than ReptTraits (D13): smaller, CC0 at the source, and no IUCN columns.

### D8 · Open Tree of Life 16.1

**Enables:** `tree_nodes`: the self-join lesson (parent and child), a recursive CTE ("all the ancestors of …"), "closest relative" questions; a tree-building game.

**License:** CC0 · https://tree.opentreeoflife.org/about/licenses · retrieved 2026-10-22T21:34:15Z · evidence/licenses/opentree/

> Where not limited by pre-existing terms of use, all data are published with a CC0 public domain dedication (copyright waiver).

> Open Tree of Life version 16.1

**Hostable:** yes, credited with the synthesis release and the Open Tree paper. The tree is Open Tree's own output; the source studies stay in Open Tree's phylesystem, which critwire never copies.

**Size:** the whole release is a 38 MB archive; the induced subtree of critwire's species, from the API, is a few KB of Newick.

**Joins on:** Open Tree's taxon id, matched from `species.ncbi_id` or `species.gbif_id` through Open Tree's taxonomy sources, else by name; unmatched species listed, never guessed → `tree_nodes.species_id`.

**Ingest work:** small to medium: a new `ingest opentree` (match names, one `induced_subtree` call), Newick parsed into `tree_nodes` with a `depth` column so DuckDB can load the self-reference level by level (§2).

### D9 · RESOLVE Ecoregions 2017

**Enables:** `ecoregions` and `biomes`: a many-to-many through records (species ↔ ecoregions where they were recorded, never a native range), biomes as a `GROUP BY`, "which biome is this point in".

**License:** CC BY 4.0 · https://ecoregions.appspot.com/ · retrieved 2026-10-22T21:18:42Z · evidence/licenses/resolve/

> Download data: • Shapefile (150mb zip) Licensed under CC-BY 4.0

**Hostable:** yes, credited.

**Size:** `Ecoregions2017.zip`, 149,248,653 bytes (HEAD, Last-Modified 2019-05-07): one shapefile.

**Joins on:** no species keys: its own ecoregion and biome ids, then spatial joins (occurrence points → ecoregion; ecoregion ∩ `country_shapes`).

**Ingest work:** medium. Read the shapefile with DuckDB `spatial`'s `ST_Read` in Node (the VPS has no GDAL command-line tools), split biomes out, simplify for the browser, commit GeoParquet.

### D10 · Natural Earth admin-1 and physical layers

**Enables:** "which state or province" questions, deserts, mountain ranges, rivers and lakes for map games.

**License:** public domain · https://www.naturalearthdata.com/about/terms-of-use/ · retrieved 2026-10-22T21:18:40Z · evidence/licenses/naturalearth/

> All versions of Natural Earth raster + vector map data found on this website are in the public domain.

**Hostable:** yes.

**Size** (GeoJSON at the pinned commit, HEAD): admin-1 1:10m 40,726,851 bytes, 1:50m 2,325,694; geography regions 1:50m 4,305,815; rivers 1:50m 827,318; lakes 1:50m 876,018.

**Joins on:** admin-1 by its ISO 3166-2 code and its country's alpha-2 (A1's matcher); physical layers have no keys, spatial joins only.

**Ingest work:** small, as D2. Admin-1 at 1:10m is too big for a browser page: 1:50m only there, or a PostGIS lesson.

### D11 · EltonTraits 1.0

**Enables:** a diet lesson: ten diet categories per mammal, in percent, that should sum to 100 (a `GROUP BY … HAVING sum(…) <> 100` check).

**License:** CC BY 4.0 archive-wide at ESA; CC0 on the publisher's figshare copy · https://esapubs.org/archive/copyright.htm · retrieved 2026-10-22T21:18:53Z · evidence/licenses/eltontraits/

> Except where otherwise noted, Ecological Archives are covered under the Creative Commons Attribution (CC BY 4.0) license.

> Copyright restrictions: None.

> Ecological Archives are also hosted on FigShare.

> "license": {"value": 2, "name": "CC0", "url": "https://creativecommons.org/publicdomain/zero/1.0/"}

**Hostable:** yes, credited as CC BY 4.0. The ESA data-paper page shows only "Copyright Authors", a holder rather than a license; the archive's own page and the publisher's copy are the two open statements, and critwire follows the stricter.

**Size:** `MamFuncDat.txt`, 579,107 bytes (API).

**Joins on:** scientific name (an older mammal taxonomy, MSW3), through Catalogue of Life synonyms; mismatches listed.

**Ingest work:** small: one tab-separated file. Its metadata asks that the body-mass sources be cited too, so mission C cites them or leaves body mass to AnAge.

### D12 · COMBINE

**Enables:** the widest mammal trait set, and a lesson on reported against imputed values (two files: what was measured, and what was estimated to fill gaps).

**License:** CC BY 4.0 · https://api.figshare.com/v2/articles/13028255 · retrieved 2026-10-22T21:19:04Z · evidence/licenses/combine/

> "license": {"value": 1, "name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/"}

> COMBINE contains information on 54 traits for 6,234 extant and recently extinct mammal species

**Hostable:** yes, credited, **without the columns it sourced from IUCN** (its own source list names the Red List for the elevation limits, generation length and life-habit method). Each ingest names its columns; any other is refused.

**Size:** `trait_data_reported.csv` 1,612,538 bytes, `trait_data_imputed.csv` 1,891,897 bytes (API).

**Joins on:** binomial (the Red List 2020-2 and PHYLACINE 1.2 taxonomy, names only) → `species.scientific_name`, the mammals.

**Ingest work:** small to medium: one CSV, an explicit column allow-list, reported values first and imputed ones labelled.

### D13 · ReptTraits (Testudines)

**Enables:** reptile traits beyond the Amniote database (D7): more columns for the turtles and tortoises.

**License:** CC BY 4.0 · https://api.figshare.com/v2/articles/24572683 · retrieved 2026-10-22T21:19:05Z · evidence/licenses/repttraits/

> "license": {"value": 1, "name": "CC BY 4.0", "url": "https://creativecommons.org/licenses/by/4.0/"}

> 40 traits from 12060 species of reptile (Amphisbaenia, Crocodylia, Rhynchocephalia, Sauria, Serpentes and Testudines)

> along with availability of genetic data, IUCN red list assessments, and population trends.

**Hostable:** yes, credited, **without its IUCN columns** (the Red List assessments the description names).

**Size:** `ReptTraits dataset v1-2.xlsx`, 18,545,434 bytes (API).

**Joins on:** species name (Reptile Database taxonomy) → `species.scientific_name`.

**Ingest work:** medium: an xlsx (read as the spike reads v004's legend) and a column allow-list. Only if D7 leaves gaps.

### D14 · PanTHERIA

**Enables:** the same mammal trait lessons, and a NULL lesson: its missing values are coded `-999`.

**License:** CC BY 4.0 archive-wide at ESA; CC0 on the publisher's figshare copy · https://esapubs.org/archive/copyright.htm · retrieved 2026-10-22T21:19:00Z · evidence/licenses/pantheria/

> Except where otherwise noted, Ecological Archives are covered under the Creative Commons Attribution (CC BY 4.0) license.

> Copyright restrictions: None.

> "license": {"value": 2, "name": "CC0", "url": "https://creativecommons.org/publicdomain/zero/1.0/"}

**Hostable:** yes, credited as CC BY 4.0, as EltonTraits.

**Size:** `ECOL_90_184.zip`, 2,950,934 bytes (API).

**Joins on:** binomial (MSW05 taxonomy), as EltonTraits; mammals only.

**Ingest work:** small, but COMBINE (D12) already includes it: not yet.

### D15 · CHELSA 2.1 climatologies

**Enables:** climate at open-record points (mean temperature, rainfall), comparing species' records by climate, and a raster lesson with continuous values (`AVG`, not class counts).

**License:** CC0 1.0 · https://www.envidat.ch/api/action/package_show?id=chelsa-climatologies · retrieved 2026-10-22T21:34:22Z · evidence/licenses/chelsa/

> "license_id": "CC0-1.0", "license_title": "Creative Commons Zero - No Rights Reserved (CC0 1.0)"

> "version": "2.1"

**Hostable:** yes. EnviDat holds the dataset of record (chelsa-climate.org renders its pages in JavaScript, with no license text in the HTML). critwire cites Karger et al. 2017 anyway.

**Size:** one variable at 30 arc-seconds, worldwide: `CHELSA_bio1_1981-2010_V.2.1.tif`, 115,490,323 bytes (HEAD); the 19 bioclimatic variables about 2 GB.

**Joins on:** no keys: raster values inside `country_shapes` or at `occurrences` points, as the habitat raster.

**Ingest work:** medium to large: an `ingest climate` modelled on `ingest habitat` (one or two variables, per-country summaries and point values, with the method and version). After mission D.

### D16 · WorldClim 2.1

**Enables:** nothing critwire hosts. CHELSA (D15) covers the same need under CC0.

**License:** non-commercial, no redistribution without permission · https://www.worldclim.org/about.html · retrieved 2026-10-22T21:34:21Z · evidence/licenses/worldclim/

> The data are freely available for academic use and other non-commercial use. Redistribution or commercial use is not allowed without prior permission.

**Hostable:** no: blocks hosting. Values computed from it are treated as not hostable too: the terms don't say they're allowed, and unclear terms mean no (decision rules). A learner may download it for their own use.

**Size:** `wc2.1_10m_bio.zip` 49,869,449 bytes; `wc2.1_30s_bio.zip` 10,401,038,857 bytes (HEAD).

**Joins on:** as CHELSA.

**Ingest work:** none.

### D17 · WDPA (Protected Planet)

**Enables:** at most one "your own PostGIS, your own download" lesson (records inside protected areas), like the IUCN lessons in §6: critwire supplies the SQL and setup steps, never the data.

**License:** UNEP-WCMC terms: no commercial use, no redistribution · https://www.protectedplanet.net/en/legal · retrieved 2026-10-22T21:34:22Z · evidence/licenses/wdpa/

> may be put to Commercial Use without the prior written permission of UNEP-WCMC.

> You may not redistribute the WDPCA and GD-PAME Data contained in the WDPCA and GD-PAME in whole or in part by any means including (but not limited to) electronic formats such as web downloads, through web services, through interactive web maps (including mobile applications) that grant users download access, KML Files or through file transfer protocols.

> You may publish the WDPCA and GD-PAME Materials in whole or in part, including on-line, providing (a) the WDPCA and GD-PAME Data are not downloadable and (b) the proper attribution is clearly visible

**Hostable:** learner download only. critwire is static files, and every file it serves can be downloaded.

**Size:** not measured: the download sits behind the terms, and critwire never downloads it.

**Joins on:** none on critwire's side; in a learner's own PostGIS, spatial joins to `country_shapes` and `occurrences`.

**Ingest work:** none.

## 2. The grown schema and its ERD

The grown schema adds tables to 002's first version without renaming or changing any of it. Its setup runs after 002's `setup`, copied here byte for byte. Every block in this file runs on the database both setups build, so the row counts below already include the grown setup's new `sources` rows:

```sql
-- q: setup
-- status: ran
-- critwire Learn: the learners' tables (schema v1), built on a fresh in-memory database
-- from /v1/species.parquet and /v1/countries.parquet. Every table a foreign key points at is
-- created first, and taxa go in one rank per INSERT, top down: DuckDB declares foreign keys
-- only in CREATE TABLE and checks them statement by statement. Nothing is ever dropped;
-- a fresh database comes from a restart.

CREATE TABLE taxa (
  name        VARCHAR PRIMARY KEY,
  taxon_rank  VARCHAR NOT NULL CHECK (taxon_rank IN ('class', 'order', 'family', 'genus')),
  parent_name VARCHAR REFERENCES taxa (name),
  CHECK ((taxon_rank = 'class') = (parent_name IS NULL))
);

INSERT INTO taxa
SELECT DISTINCT taxonomy.class, 'class', NULL FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy."order", 'order', taxonomy.class FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.family, 'family', taxonomy."order" FROM read_parquet('species.parquet');

INSERT INTO taxa
SELECT DISTINCT taxonomy.genus, 'genus', taxonomy.family FROM read_parquet('species.parquet');

CREATE TABLE species (
  id              INTEGER PRIMARY KEY,
  slug            VARCHAR NOT NULL UNIQUE,
  scientific_name VARCHAR NOT NULL UNIQUE,
  common_name     VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL REFERENCES taxa (name),
  range_status    VARCHAR NOT NULL CHECK (range_status IN ('ok', 'no-open-records', 'identity-unsettled')),
  photo_url       VARCHAR,
  photo_credit    VARCHAR,
  photo_license   VARCHAR,
  photo_page      VARCHAR,
  iucn_id         INTEGER UNIQUE,
  gbif_id         BIGINT UNIQUE,
  col_id          VARCHAR UNIQUE,
  wikidata_id     VARCHAR UNIQUE,
  inaturalist_id  INTEGER UNIQUE,
  ncbi_id         INTEGER UNIQUE
);

INSERT INTO species
SELECT id, slug, scientificName, commonName, taxonomy.genus, "range".status,
       photo.url, photo.credit, photo.license, photo.page,
       ids.iucn, ids.gbif, ids.col, ids.wikidata, ids.inaturalist, ids.ncbi
FROM read_parquet('species.parquet');

CREATE TABLE sources (
  name      VARCHAR PRIMARY KEY,
  license   VARCHAR NOT NULL,
  retrieved DATE
);

INSERT INTO sources
SELECT DISTINCT s.source, s.license, CAST(s.retrieved AS DATE)
FROM (SELECT unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE species_sources (
  species_id  INTEGER NOT NULL REFERENCES species (id),
  field       VARCHAR NOT NULL,
  source_name VARCHAR NOT NULL REFERENCES sources (name),
  PRIMARY KEY (species_id, field)
);

INSERT INTO species_sources
SELECT id, unnest(s.fields), s.source
FROM (SELECT id, unnest(sources) AS s FROM read_parquet('species.parquet'));

CREATE TABLE countries (
  code      VARCHAR PRIMARY KEY,
  name      VARCHAR NOT NULL UNIQUE,
  continent VARCHAR NOT NULL,
  region    VARCHAR NOT NULL,
  subregion VARCHAR NOT NULL
);

INSERT INTO countries
SELECT code, name, continent, region, subregion FROM read_parquet('countries.parquet');

-- Countries with open (CC0 / CC BY) occurrence records, not the native range.
CREATE TABLE species_countries (
  species_id   INTEGER NOT NULL REFERENCES species (id),
  country_code VARCHAR NOT NULL REFERENCES countries (code),
  PRIMARY KEY (species_id, country_code)
);

INSERT INTO species_countries
SELECT id, unnest("range".countriesWithOpenRecords) FROM read_parquet('species.parquet');

CREATE VIEW species_taxonomy AS
SELECT s.id AS species_id, c.name AS class, o.name AS order_name, f.name AS family, g.name AS genus
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
JOIN taxa AS f ON f.name = g.parent_name
JOIN taxa AS o ON o.name = f.parent_name
JOIN taxa AS c ON c.name = o.parent_name;
```

The row count of every table and of the view, today (`countries` is the spike's draft, so this block is `spike-table`):

```sql
-- q: setup-counts
-- status: spike-table
SELECT (SELECT count(*) FROM taxa)              AS taxa,
       (SELECT count(*) FROM species)           AS species,
       (SELECT count(*) FROM sources)           AS sources,
       (SELECT count(*) FROM species_sources)   AS species_sources,
       (SELECT count(*) FROM countries)         AS countries,
       (SELECT count(*) FROM species_countries) AS species_countries,
       (SELECT count(*) FROM species_taxonomy)  AS species_taxonomy;
```

```text
-- result: setup-counts · 1 row · sha256 95651e075a7c
taxa | species | sources | species_sources | countries | species_countries | species_taxonomy
143 | 76 | 7 | 591 | 250 | 472 | 76
```

### The grown tables

Each new table joins 002's schema through keys it already has (`species.id`, `countries.code`, `sources.name`); nothing in 002 is renamed or changed. `traits` and `species_traits` keep exactly the shapes 002 §2 "Room to grow" gave them (so lesson 16's exercise moves to its own names; see Disagreements with 002).

| Table | Columns | Keys | Cardinality | Fed by (mission) | Credit |
|---|---|---|---|---|---|
| `traits` | `name`, `unit`, `description` | `name` PK | one row per trait; one source per trait | critwire's trait list over AnAge, AmphiBIO, the Amniote db (C) | critwire (the descriptions are its own words) |
| `species_traits` | `species_id`, `trait_name`, `value` (text), `source_name` | (`species_id`, `trait_name`) PK; FKs → `species`, `traits`, `sources` | a species has 0..n traits, a trait 0..n species: `species_traits` is the many-to-many | AnAge, AmphiBIO, the Amniote db (C) | per row: its dataset → `value` |
| `species_names` | `species_id`, `language`, `name` | (`species_id`, `language`) PK; FK → `species` | a species has 0..n names, at most one per language | Wikidata labels (C) | Wikidata (CC0) → `name` |
| `habitat_classes` | `code`, `level1_code`, `name` | `code` PK; `level1_code` FK → `habitat_classes` (NULL for level 1) | a level-1 class has 1..n level-2 classes | Jung et al. 2020 v004 legend (D) | Jung v004 → `name` |
| `country_habitats` | `country_code`, `habitat_code`, `est_area_km2` | (`country_code`, `habitat_code`) PK; FKs → `countries`, `habitat_classes` | many-to-many: a country has 0..n classes, a class 0..n countries | `pnpm ingest habitat` (D): v004 1 km fractions × each cell's area on the ellipsoid, inside Natural Earth's outline | Jung v004 + Natural Earth → `est_area_km2`, with the method; always "estimated" |
| `country_shapes` | `country_code`, `geom` | `country_code` PK and FK → `countries` | a country has 0 or 1 outline | Natural Earth admin-0, version pinned (D) | Natural Earth → `geom` |
| `occurrences` | `id` (GBIF's), `species_id`, `country_code`, `longitude`, `latitude`, `year`, `license`, `dataset_key`, `habitat_code` | `id` PK; FKs → `species`, `countries` (nullable), `habitat_classes` (nullable) | a species has 0..n records; a record has at most one country and one habitat class | a capped CC0 / CC BY sample in `pnpm ingest gbif` (D); `habitat_code` from `ingest habitat` | GBIF.org + the derived-dataset DOI → the row (`license`, `dataset_key` per row); Jung v004 → `habitat_code` |

- **New `sources` rows** come from the file that cites them, before the table that points at them, as `species.parquet` brings its own: `species_traits.parquet` carries each row's source name, license and retrieval date, and the setup inserts the distinct ones. Wikidata is already a source.
- **`occurrences.habitat_code`** is the most common level-2 class in the record's 1 km cell of v004's fractional layers: it claims no 100 m precision for a point record. It's NULL in the spike, where `ingest habitat` doesn't exist yet.
- **A country's share of a class** is computed in SQL from `est_area_km2` (a window function, §3), never stored.
- **No species–habitat table.** Which habitats a species uses comes from IUCN's assessments, which are Red List data (§6). critwire's honest version is "the habitat class at open-record points", `occurrences.habitat_code`.
- **Designed, not built in the spike:** `tree_nodes (id PK, parent_id FK → tree_nodes, name, species_id UNIQUE FK → species)` from Open Tree (C, if its id match works) and `ecoregions`, `biomes` from RESOLVE (D, after the habitat track). DuckDB checks a self-referencing foreign key statement by statement, as `taxa` shows, so a real tree loads one depth level per `INSERT`: mission C ships a `depth` column and inserts by depth. Until then the self-join lesson uses `taxa` (§3).

**What the spike loads** (the stand-ins; each file's source and license are in the spike's registry, `data/spike-tables.json`). Every row is real open data, matched by exact scientific name and never guessed:
- `traits`, `species_traits`: AnAge Build 15 (CC BY 3.0) for adult mass, clutch size, female maturity and maximum longevity; AmphiBIO v1 (CC BY 4.0) for the amphibians' body length. Animals AnAge doesn't list under the same name have no rows here; mission C matches through Catalogue of Life synonyms and fills reptile gaps from the Amniote db.
- `species_names`: every Wikidata label (`rdfs:label`) of every species.
- `habitat_classes`: the classes v004's legend marks as mapped.
- `country_habitats`: two countries only, Trinidad and Tobago and Åland, the polygons the spike's area experiment measured with v004's fractions (§5).
- `country_shapes`, `occurrences`: the spike's Natural Earth shapes and GBIF sample (§4).

The setup that builds them runs after `setup`, in the same database:

```sql
-- q: setup-grown
-- status: spike-table
-- critwire Learn: the grown tables (A2's design), run after setup.sql on the same database, from
-- /v1/<table>.parquet. Same rules as setup.sql: each table after the tables it points at, foreign
-- keys only in CREATE TABLE, nothing dropped. New sources rows come from the file that cites them,
-- before the table that points at them. Needs the spatial extension (country_shapes.geom).

INSERT INTO sources
SELECT DISTINCT source_name, source_license, source_retrieved
FROM read_parquet('species_traits.parquet');

CREATE TABLE traits (
  name        VARCHAR PRIMARY KEY,
  unit        VARCHAR,
  description VARCHAR NOT NULL
);

INSERT INTO traits
SELECT name, unit, description FROM read_parquet('traits.parquet');

-- One value per animal and trait, as text: CAST it to compare numbers. The unit is the trait's.
CREATE TABLE species_traits (
  species_id  INTEGER REFERENCES species (id),
  trait_name  VARCHAR REFERENCES traits (name),
  value       VARCHAR NOT NULL,
  source_name VARCHAR NOT NULL REFERENCES sources (name),
  PRIMARY KEY (species_id, trait_name)
);

INSERT INTO species_traits
SELECT species_id, trait_name, value, source_name FROM read_parquet('species_traits.parquet');

-- Names in other languages: Wikidata labels, one per language code.
CREATE TABLE species_names (
  species_id INTEGER NOT NULL REFERENCES species (id),
  language   VARCHAR NOT NULL,
  name       VARCHAR NOT NULL,
  PRIMARY KEY (species_id, language)
);

INSERT INTO species_names
SELECT species_id, language, name FROM read_parquet('species_names.parquet');

-- The habitat map's classes (Jung et al. 2020, version 004): level 1 first, then level 2.
CREATE TABLE habitat_classes (
  code        INTEGER PRIMARY KEY,
  level1_code INTEGER REFERENCES habitat_classes (code),
  name        VARCHAR NOT NULL,
  CHECK ((code % 100 = 0) = (level1_code IS NULL))
);

INSERT INTO habitat_classes
SELECT code, level1_code, name FROM read_parquet('habitat_classes.parquet') WHERE level1_code IS NULL;

INSERT INTO habitat_classes
SELECT code, level1_code, name FROM read_parquet('habitat_classes.parquet') WHERE level1_code IS NOT NULL;

-- Estimated area of each habitat class in a country, computed from the map: never a measured area.
CREATE TABLE country_habitats (
  country_code VARCHAR NOT NULL REFERENCES countries (code),
  habitat_code INTEGER NOT NULL REFERENCES habitat_classes (code),
  est_area_km2 DECIMAL(12, 2) NOT NULL CHECK (est_area_km2 >= 0),
  PRIMARY KEY (country_code, habitat_code)
);

INSERT INTO country_habitats
SELECT country_code, habitat_code, est_area_km2 FROM read_parquet('country_habitats.parquet');

-- One outline per country (Natural Earth), longitude and latitude in degrees (WGS 84).
CREATE TABLE country_shapes (
  country_code VARCHAR PRIMARY KEY REFERENCES countries (code),
  geom         GEOMETRY NOT NULL
);

-- DuckDB-WASM 1.33.1 can't store GeoParquet's GEOMETRY('OGC:CRS84') type, so the file's
-- geometry is read as plain WKB (for the rest of the session) and turned into GEOMETRY here.
SET enable_geoparquet_conversion = false;

INSERT INTO country_shapes
SELECT country_code, ST_GeomFromWKB(geom) FROM read_parquet('country_shapes.parquet');

-- Open (CC0 / CC BY) occurrence records: where someone recorded the animal, not its native range.
CREATE TABLE occurrences (
  id           BIGINT PRIMARY KEY,
  species_id   INTEGER NOT NULL REFERENCES species (id),
  country_code VARCHAR REFERENCES countries (code),
  longitude    DOUBLE NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  latitude     DOUBLE NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  year         INTEGER,
  license      VARCHAR NOT NULL CHECK (license IN ('CC0 1.0', 'CC BY 4.0')),
  dataset_key  VARCHAR NOT NULL,
  habitat_code INTEGER REFERENCES habitat_classes (code)
);

INSERT INTO occurrences
SELECT id, species_id, country_code, longitude, latitude, year, license, dataset_key, NULL
FROM read_parquet('occurrences.parquet');
```

Row counts it gives, with 002's tables beside them where the grown setup adds rows:

```sql
-- q: setup-grown-counts
-- status: spike-table
SELECT (SELECT count(*) FROM sources)          AS sources,
       (SELECT count(*) FROM traits)           AS traits,
       (SELECT count(*) FROM species_traits)   AS species_traits,
       (SELECT count(*) FROM species_names)    AS species_names,
       (SELECT count(*) FROM habitat_classes)  AS habitat_classes,
       (SELECT count(*) FROM country_habitats) AS country_habitats,
       (SELECT count(*) FROM country_shapes)   AS country_shapes,
       (SELECT count(*) FROM occurrences)      AS occurrences;
```

```text
-- result: setup-grown-counts · 1 row · sha256 e690c0c6dc46
sources | traits | species_traits | species_names | habitat_classes | country_habitats | country_shapes | occurrences
7 | 5 | 179 | 5274 | 75 | 35 | 250 | 528
```

### The grown ERD

The grown schema's entity relationship diagram, in 002 §3's notation and format. Its source is [`003-learn-erd.mmd`](003-learn-erd.mmd), and this block is the same text. 002's six tables and their lines appear in it unchanged: the source names 002's diagram on its `%% extends:` line, and the spike's runner fails if any of 002's entities or lines differ, or if the diagram and the database the two setups build disagree on a table, column, type, key or line. The spike renders it offline to SVG and PNG (`erd/grown.svg`, `erd/grown.png`), as 002's is rendered.

One kind of line is new: `countries ||--o| country_shapes` says a country has zero or one outline, because the outline's foreign key, `country_code`, is also its primary key. The runner accepts `||--o|` only where the child's foreign key is its primary key or unique, and it refuses a "many" line on such a key. DuckDB's `DECIMAL(12, 2)` is drawn as `DECIMAL`, since Mermaid's types are single words.

```mermaid
%% critwire Learn: the grown schema (plans/003-learn-data-spatial.md §2): 002's schema v1, unchanged, plus the grown tables.
%% extends: 002-learn-erd.mmd
%% Tables only; the view species_taxonomy is listed beside it, and PostGIS-only learner objects are listed in §2's text.
%% Keys: PK primary key, FK foreign key, UK unique. Lines: || exactly one, |o or o| zero or one, |{ one or more, o{ zero or more.
erDiagram
    taxa {
        VARCHAR name PK "Agalychnis, Phyllomedusidae, Anura, Amphibia"
        VARCHAR taxon_rank "class, order, family or genus"
        VARCHAR parent_name FK "the taxon one rank up; NULL for a class"
    }
    species {
        INTEGER id PK "critwire's own id, never reused"
        VARCHAR slug UK "red-eyed-tree-frog"
        VARCHAR scientific_name UK "Agalychnis callidryas"
        VARCHAR common_name "Red-eyed Tree Frog"
        VARCHAR genus FK "a taxa row of rank genus"
        VARCHAR range_status "ok, no-open-records or identity-unsettled"
        VARCHAR photo_url "NULL when there is no photo"
        VARCHAR photo_credit "who took the photo"
        VARCHAR photo_license "CC BY-SA 4.0, CC BY 2.0, CC0, Public domain"
        VARCHAR photo_page "the photo's Wikimedia Commons page"
        INTEGER iucn_id UK "IUCN Red List taxon id"
        BIGINT gbif_id UK "GBIF backbone taxon key"
        VARCHAR col_id UK "Catalogue of Life id"
        VARCHAR wikidata_id UK "Wikidata item"
        INTEGER inaturalist_id UK "iNaturalist taxon id"
        INTEGER ncbi_id UK "NCBI Taxonomy id"
    }
    countries {
        VARCHAR code PK "ISO 3166-1 alpha-2, plus XK"
        VARCHAR name UK "Brazil"
        VARCHAR continent "South America"
        VARCHAR region "Americas"
        VARCHAR subregion "South America"
    }
    species_countries {
        INTEGER species_id PK, FK "the animal"
        VARCHAR country_code PK, FK "recorded there in open records"
    }
    sources {
        VARCHAR name PK "Wikidata, Catalogue of Life, critwire base"
        VARCHAR license "the license of what critwire took"
        DATE retrieved "when critwire took it; NULL for critwire base"
    }
    species_sources {
        INTEGER species_id PK, FK "the animal"
        VARCHAR field PK "a path in the record, such as ids.col"
        VARCHAR source_name FK "who supplied that field"
    }
    traits {
        VARCHAR name PK "adult_mass, clutch_size, body_length"
        VARCHAR unit "g, young, days, years, mm; NULL when it has none"
        VARCHAR description "what the trait measures, in critwire's words"
    }
    species_traits {
        INTEGER species_id PK, FK "the animal"
        VARCHAR trait_name PK, FK "the trait"
        VARCHAR value "text: CAST it to compare numbers"
        VARCHAR source_name FK "the dataset that gave the value"
    }
    species_names {
        INTEGER species_id PK, FK "the animal"
        VARCHAR language PK "a Wikidata language code, such as de"
        VARCHAR name "Amerikanische Sumpfschildkröte"
    }
    habitat_classes {
        INTEGER code PK "Jung v004 class, such as 105"
        INTEGER level1_code FK "its level-1 class, such as 100; NULL for level 1"
        VARCHAR name "Forest – Subtropical/tropical dry"
    }
    country_habitats {
        VARCHAR country_code PK, FK "the country"
        INTEGER habitat_code PK, FK "the habitat class"
        DECIMAL est_area_km2 "estimated from the map, never measured"
    }
    country_shapes {
        VARCHAR country_code PK, FK "the country"
        GEOMETRY geom "Natural Earth outline, lon/lat degrees (WGS 84)"
    }
    occurrences {
        BIGINT id PK "GBIF's record id"
        INTEGER species_id FK "the animal recorded"
        VARCHAR country_code FK "where the record is; NULL when unknown"
        DOUBLE longitude "degrees east"
        DOUBLE latitude "degrees north"
        INTEGER year "NULL when the record has none"
        VARCHAR license "CC0 1.0 or CC BY 4.0"
        VARCHAR dataset_key "the GBIF dataset to credit"
        INTEGER habitat_code FK "most common class in its 1 km cell; NULL if none"
    }

    taxa |o--o{ taxa : "parent of"
    taxa ||--o{ species : "genus of"
    species ||--o{ species_countries : "recorded in"
    countries ||--o{ species_countries : "has records of"
    species ||--o{ species_sources : "fields from"
    sources ||--|{ species_sources : "supplies"
    traits ||--o{ species_traits : "values of"
    species ||--o{ species_traits : "has traits"
    sources ||--o{ species_traits : "supplies"
    species ||--o{ species_names : "named in"
    habitat_classes |o--o{ habitat_classes : "level 1 of"
    countries ||--o{ country_habitats : "estimated to hold"
    habitat_classes ||--o{ country_habitats : "estimated in"
    countries ||--o| country_shapes : "outlined by"
    species ||--o{ occurrences : "recorded as"
    countries |o--o{ occurrences : "contains"
    habitat_classes |o--o{ occurrences : "class at"
```

**Outside the ERD.** These live only in your own PostGIS (§4, §6), not in critwire's schema, so the diagram leaves them out:
- `learn_spatial.country_shapes` and `learn_spatial.occurrences`: the same rows as the grown tables, loaded by `pg-setup` from the same files, with PostGIS `geometry(Geometry, 4326)` and a spatial (GiST) index.
- `learn_spatial.habitat_clips`: small clips of the habitat map stored in the database (§5), and the out-db raster windows a raster lesson builds inside a query over the full file.
- your own IUCN range polygons, imported from your own download (§6), and `learn_spatial.example_ranges`, the hand-drawn synthetic stand-in the lessons are tested on.
- 002's view `species_taxonomy`, unchanged, which 002's diagram also lists beside it rather than in it.

## 3. Lessons for the grown data

**Where they go.** After 002's lesson 16, numbered on from 17, in 002 §4's format: concept and question, a plain explanation, the SQL with the result it gave, **Shown as**, "Your turn" with its answer, **Check** (the same kinds as 002: `result, any row order`, `result, in order`, `error`). A page runs `setup` and then `setup-grown` (§2), so every table below is there from the start, and "Reset database" rebuilds both.

**What they run on.** Each lesson's **Data** line says so. A lesson that waits for a build mission ran here against the spike's stand-ins (§2, "What the spike loads"): real rows from the real datasets, but not all of them, so its results change when the mission publishes the full files. Lessons 17–21 ship with mission C (traits, names); lessons 22–23 with mission D, which computes `country_habitats` for every country. The rules of 002 hold: a trait value is what one dataset recorded, a habitat area is an estimate from a map, and an occurrence is a record, not a range.

### Lesson 17 · units

**Concept:** numbers stored as text; `CAST`; a unit that belongs to the trait. **Question:** Which animals are heaviest?

`species_traits.value` is text, because one column holds every trait (lesson 16). Text sorts character by character, so `'950'` sorts after `'92500'`: both start with `9`, and `5` comes after `2`. Sorting heaviest first on the text puts a small turtle near the top:

```sql
-- q: l17-text
-- status: spike-table
SELECT s.id, s.common_name, st.value
FROM species_traits AS st
JOIN species AS s ON s.id = st.species_id
WHERE st.trait_name = 'adult_mass'
ORDER BY st.value DESC, s.id
LIMIT 5;
```

```text
-- result: l17-text · 5 rows · sha256 d0be670212d7
id | common_name | value
12 | Spiny Hill Turtle | 950
50 | Addax | 92500
51 | Jaguar | 81150
43 | Goodfellow's Tree-kangaroo | 7400
69 | Dama Gazelle | 73000
```

A number without its unit isn't an answer either: is `92500` grams or kilograms? The unit is a fact about the trait, not about the animal, so it's stored once, in `traits` (lesson 14):

```sql
-- q: l17-units
-- status: spike-table
SELECT name, unit, description FROM traits ORDER BY name;
```

```text
-- result: l17-units · 5 rows · sha256 20ccf3ea7528
name | unit | description
adult_mass | g | typical body mass of a grown animal
body_length | mm | largest adult body length recorded
clutch_size | young | young born, or eggs laid, at one time
female_maturity | days | age at which females can first breed
max_longevity | years | longest lifespan recorded for one animal
```

`adult_mass` is in grams. `CAST(st.value AS DOUBLE)` turns the text into a number, so it sorts as one, and dividing by 1000 gives kilograms. If a value weren't a number, `CAST` would stop the query with an error, which is what you want: a wrong answer without an error is worse.

```sql
-- q: l17
-- status: spike-table
-- show: cards
SELECT s.id, s.common_name, CAST(st.value AS DOUBLE) / 1000 AS adult_mass_kg
FROM species_traits AS st
JOIN species AS s ON s.id = st.species_id
WHERE st.trait_name = 'adult_mass'
ORDER BY adult_mass_kg DESC, s.id
LIMIT 5;
```

```text
-- result: l17 · 5 rows · sha256 07078e835f1c
id | common_name | adult_mass_kg
64 | African Savanna Elephant | 4800
28 | Asian Elephant | 3178
44 | Javan Rhinoceros | 1750
66 | Black Rhinoceros | 1100
39 | Grévy's Zebra | 384
```

**Shown as:** cards for the heaviest, with `adult_mass_kg` on each; the other results as tables.

**Your turn:** Which animals have the longest recorded lifespans? Show `id`, `common_name`, the value as a number named `max_longevity`, and the trait's `unit` from `traits` (join it, don't type it), longest first, ties by `id`, the top five.

```sql
-- q: l17-ex
-- status: spike-table
SELECT s.id, s.common_name, CAST(st.value AS DOUBLE) AS max_longevity, t.unit
FROM species_traits AS st
JOIN species AS s ON s.id = st.species_id
JOIN traits AS t ON t.name = st.trait_name
WHERE st.trait_name = 'max_longevity'
ORDER BY max_longevity DESC, s.id
LIMIT 5;
```

```text
-- result: l17-ex · 5 rows · sha256 a1f442d7a82c
id | common_name | max_longevity | unit
28 | Asian Elephant | 79.6 | years
1 | Blanding's Turtle | 77 | years
56 | Chimpanzee | 68 | years
64 | African Savanna Elephant | 65 | years
66 | Black Rhinoceros | 57 | years
```

**Check:** `result, in order` (the order is the question).

**Data:** spike stand-in; waits for mission C

### Lesson 18 · compare-classes

**Concept:** comparing groups fairly; the median; a `LEFT JOIN` whose condition belongs in `ON`. **Question:** Do reptiles live longer than mammals?

`species_taxonomy` (002's view) gives each animal's class, so the traits can be grouped by it. `max_longevity` is the longest any single animal is known to have lived, often in a zoo, not a typical lifespan. The median (the middle value) is less pulled by one record-breaker than the average. `percentile_cont(0.5) WITHIN GROUP (ORDER BY …)` is the standard way to write it, and works in PostgreSQL and DuckDB alike:

```sql
-- q: l18
-- status: spike-table
SELECT t.class,
       count(*) AS with_value,
       percentile_cont(0.5) WITHIN GROUP (ORDER BY CAST(st.value AS DOUBLE)) AS median_years,
       max(CAST(st.value AS DOUBLE)) AS max_years
FROM species_traits AS st
JOIN species_taxonomy AS t ON t.species_id = st.species_id
WHERE st.trait_name = 'max_longevity'
GROUP BY t.class
ORDER BY t.class;
```

```text
-- result: l18 · 3 rows · sha256 da6175a4078c
class | with_value | median_years | max_years
Amphibia | 5 | 14 | 29
Mammalia | 32 | 27.15 | 79.6
Reptilia | 8 | 29.9 | 77
```

Before trusting the comparison, ask how many animals each median stands for. A dataset doesn't cover every animal, and the gaps are uneven: AnAge, the source of `max_longevity`, lists far more mammals than amphibians. To count the animals *without* a value, the class list must keep every animal, so it goes on the left of a `LEFT JOIN` (lesson 11). The trait's name goes in the `ON` condition: in `WHERE`, it would throw away the rows the left join kept for animals without a value, and the query would quietly become a plain join again.

```sql
-- q: l18-cover
-- status: spike-table
SELECT t.class, count(*) AS animals, count(st.value) AS with_value
FROM species_taxonomy AS t
LEFT JOIN species_traits AS st
  ON st.species_id = t.species_id AND st.trait_name = 'max_longevity'
GROUP BY t.class
ORDER BY t.class;
```

```text
-- result: l18-cover · 3 rows · sha256 a7aef34e880c
class | animals | with_value
Amphibia | 15 | 5
Mammalia | 50 | 32
Reptilia | 11 | 8
```

A median over a few animals of a class is a small sample, not a fact about the class. Say how many animals stand behind any number you compare.

**Shown as:** a table.

**Your turn:** At what age do females first breed, by class? For `female_maturity` (in days), show `class`, the number of animals with a value as `with_value`, and the median in years (days ÷ 365.25) rounded to one decimal as `median_years`.

```sql
-- q: l18-ex
-- status: spike-table
SELECT t.class,
       count(*) AS with_value,
       round(percentile_cont(0.5) WITHIN GROUP (ORDER BY CAST(st.value AS DOUBLE)) / 365.25, 1) AS median_years
FROM species_traits AS st
JOIN species_taxonomy AS t ON t.species_id = st.species_id
WHERE st.trait_name = 'female_maturity'
GROUP BY t.class
ORDER BY t.class;
```

```text
-- result: l18-ex · 3 rows · sha256 2f7317209c31
class | with_value | median_years
Amphibia | 2 | 3.2
Mammalia | 33 | 2.1
Reptilia | 2 | 13.4
```

**Check:** `result, any row order`.

**Data:** spike stand-in; waits for mission C

### Lesson 19 · languages

**Concept:** a key of two columns; one row per animal and language. **Question:** What is the axolotl called in other languages, and which animals have no Swahili name yet?

`species_names` holds an animal's name in other languages, from Wikidata's labels (CC0). Its primary key is (`species_id`, `language`): an animal has at most one label per language, and many languages per animal. The language is a code: `de` German, `es` Spanish, `fr` French, `ja` Japanese, `sw` Swahili, `zh` Chinese.

```sql
-- q: l19
-- status: spike-table
SELECT language, name
FROM species_names
WHERE species_id = 74 AND language IN ('de', 'es', 'fr', 'ja', 'sw', 'zh')
ORDER BY language;
```

```text
-- result: l19 · 6 rows · sha256 99c5508c7c67
language | name
de | Axolotl
es | Ambystoma mexicanum
fr | Axolotl
ja | メキシコサンショウウオ
sw | Axolotl
… 1 more row
```

A label is what Wikidata's volunteers have entered so far, so some languages have names for few of critwire's animals, and some labels are just the scientific name, copied because nobody has added a common name yet:

```sql
-- q: l19-sci
-- status: spike-table
SELECT n.language, count(*) AS labels, count(*) FILTER (WHERE n.name = s.scientific_name) AS scientific_name_only
FROM species_names AS n
JOIN species AS s ON s.id = n.species_id
WHERE n.language IN ('de', 'en', 'es', 'fr', 'ja', 'sw', 'zh')
GROUP BY n.language
ORDER BY n.language;
```

```text
-- result: l19-sci · 7 rows · sha256 c2a4bc2275ea
language | labels | scientific_name_only
de | 76 | 7
en | 76 | 16
es | 76 | 66
fr | 76 | 31
ja | 71 | 0
… 2 more rows
```

`count(*) FILTER (WHERE …)` counts only the rows the condition keeps, inside the same group.

**Shown as:** a table.

**Your turn:** Which animals have no Swahili (`sw`) label? Show `id` and `common_name`. (Every animal on the left; the language goes in `ON`, as in lesson 18.)

```sql
-- q: l19-ex
-- status: spike-table
-- show: cards
SELECT s.id, s.common_name
FROM species AS s
LEFT JOIN species_names AS n ON n.species_id = s.id AND n.language = 'sw'
WHERE n.species_id IS NULL
ORDER BY s.id;
```

```text
-- result: l19-ex · 65 rows · sha256 5ee581b27f39
id | common_name
1 | Blanding's Turtle
2 | Spiny Softshell Turtle
3 | Darwin Frog
4 | Big-headed Turtle
5 | Wallace's Flying Frog
… 60 more rows
```

**Check:** `result, any row order`.

**Data:** spike stand-in; waits for mission C

### Lesson 20 · relatives

**Concept:** a self-join that makes pairs; `<` so each pair appears once; how close two animals are on the tree. **Question:** Which of critwire's animals are close relatives?

Joining `species_taxonomy` to itself on `family` pairs every animal with every animal of its family. `b.species_id > a.species_id` keeps each pair once, and never pairs an animal with itself; with `<>` instead, every pair would appear twice, once each way round.

```sql
-- q: l20
-- status: ran
SELECT a.family, sa.common_name AS animal, sb.common_name AS relative
FROM species_taxonomy AS a
JOIN species_taxonomy AS b ON b.family = a.family AND b.species_id > a.species_id
JOIN species AS sa ON sa.id = a.species_id
JOIN species AS sb ON sb.id = b.species_id
ORDER BY a.family, a.species_id, b.species_id;
```

```text
-- result: l20 · 41 rows · sha256 169ce8174849
family | animal | relative
Bovidae | Saola | Addax
Bovidae | Saola | Hirola
Bovidae | Saola | Dama Gazelle
Bovidae | Addax | Hirola
Bovidae | Addax | Dama Gazelle
… 36 more rows
```

How close are two animals? Climb the tree from both until the ranks meet: the same genus is one step up, the same family two, the same order three. A `CASE` reads the closest match first. The tiger's relatives in its order, Carnivora, closest first:

```sql
-- q: l20-steps
-- status: ran
-- show: cards
SELECT s.id, s.common_name,
       CASE WHEN b.genus = a.genus THEN 1
            WHEN b.family = a.family THEN 2
            ELSE 3 END AS steps_up
FROM species_taxonomy AS a
JOIN species_taxonomy AS b ON b.order_name = a.order_name AND b.species_id <> a.species_id
JOIN species AS s ON s.id = b.species_id
WHERE a.species_id = 25
ORDER BY steps_up, s.id;
```

```text
-- result: l20-steps · 10 rows · sha256 61e8af71f0f7
id | common_name | steps_up
51 | Jaguar | 1
58 | Cheetah | 2
26 | Black-footed Ferret | 3
33 | Ethiopian Wolf | 3
35 | Red Panda | 3
… 5 more rows
```

Four ranks make a coarse tree: every animal in a family is equally close here, though some split from each other far longer ago than others. A real phylogeny such as the Open Tree of Life (§1) has a branch for each split, and would be `tree_nodes`, a table that points at itself as `taxa` does (§2); until mission C loads it, `taxa` is the tree.

**Shown as:** a table for the pairs; cards for the tiger's relatives, with `steps_up` on each.

**Your turn:** How close is every other amphibian to the Chinese giant salamander (id 62)? Show `id`, `common_name` and `steps_up` (genus 1, family 2, order 3, class 4), closest first, ties by `id`.

```sql
-- q: l20-ex
-- status: ran
SELECT s.id, s.common_name,
       CASE WHEN b.genus = a.genus THEN 1
            WHEN b.family = a.family THEN 2
            WHEN b.order_name = a.order_name THEN 3
            ELSE 4 END AS steps_up
FROM species_taxonomy AS a
JOIN species_taxonomy AS b ON b.class = a.class AND b.species_id <> a.species_id
JOIN species AS s ON s.id = b.species_id
WHERE a.species_id = 62
ORDER BY steps_up, s.id;
```

```text
-- result: l20-ex · 14 rows · sha256 a570f0810d43
id | common_name | steps_up
75 | Hellbender | 2
74 | Axolotl | 3
3 | Darwin Frog | 4
5 | Wallace's Flying Frog | 4
6 | Red-eyed Tree Frog | 4
… 9 more rows
```

**Check:** `result, in order`.

**Data:** runs today

### Lesson 21 · two-sources

**Concept:** lesson 16's design meets real data; what a primary key decides when two datasets give a value; `ON CONFLICT`. **Question:** Are critwire's trait tables the ones you designed, and what happens when a second dataset offers a value?

Lesson 16 asked you to design `my_traits` and `my_species_traits`. critwire's own tables, `traits` and `species_traits`, have exactly that design. Lesson 16's check, run on critwire's table, gives the same rows its expected answer has, apart from the names:

```sql
-- q: l21
-- status: ran
SELECT 'column' AS kind,
       column_name || ' ' || data_type || CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END AS detail
FROM information_schema.columns
WHERE table_name = 'species_traits'
UNION ALL
SELECT 'key', constraint_text
FROM duckdb_constraints()
WHERE table_name = 'species_traits' AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
ORDER BY kind, detail;
```

```text
-- result: l21 · 8 rows · sha256 cec372f2d16e
kind | detail
column | source_name VARCHAR NOT NULL
column | species_id INTEGER NOT NULL
column | trait_name VARCHAR NOT NULL
column | value VARCHAR NOT NULL
key | FOREIGN KEY (source_name) REFERENCES sources("name")
… 3 more rows
```

The primary key (`species_id`, `trait_name`) allows one value per animal and trait. Real datasets overlap: AnAge and the Amniote database both give adult masses for turtles, and the two needn't agree. Here a second dataset offers a mass for the spiny softshell turtle (id 2), which already has one from AnAge. The dataset and its value are made up for the lesson; on the page, Reset removes them:

```sql
-- q: l21-second
-- status: spike-table
-- expect: error violates primary key constraint
INSERT INTO sources VALUES ('Example dataset', 'CC0 1.0', NULL) ON CONFLICT DO NOTHING;
INSERT INTO species_traits VALUES (2, 'adult_mass', '5000', 'Example dataset');
```

```text
-- result: l21-second · error: statement 2 of 2: Constraint Error: Duplicate key "species_id: 2, trait_name: adult_mass" violates primary key constraint.
```

The database refuses it, so a design with this key has to decide in advance which dataset wins. (The `sources` row did go in: each statement is saved on its own. That is why both blocks add it with `ON CONFLICT DO NOTHING`, explained next, so they run in any order.) critwire's rule: datasets are taken in a fixed order, and a later one only fills gaps. In SQL, `ON CONFLICT DO NOTHING` says exactly that: a row whose key is already taken is skipped instead of failing the statement. The turtle keeps AnAge's mass and gains the clutch size AnAge didn't have:

```sql
-- q: l21-fill
-- status: spike-table
INSERT INTO sources VALUES ('Example dataset', 'CC0 1.0', NULL) ON CONFLICT DO NOTHING;
INSERT INTO species_traits VALUES
  (2, 'adult_mass', '5000', 'Example dataset'),
  (2, 'clutch_size', '20', 'Example dataset')
ON CONFLICT DO NOTHING;
SELECT trait_name, value, source_name FROM species_traits WHERE species_id = 2 ORDER BY trait_name;
```

```text
-- result: l21-fill · 4 rows · sha256 c2d6172a4544
trait_name | value | source_name
adult_mass | 4765 | AnAge Build 15
clutch_size | 20 | Example dataset
female_maturity | 3285 | AnAge Build 15
max_longevity | 25.2 | AnAge Build 15
```

The other design puts `source_name` in the key, (`species_id`, `trait_name`, `source_name`), and keeps every dataset's value. Nothing is lost, but every query on a trait then has to say which source it wants, or it counts an animal twice. Both are honest, as long as each value says where it came from.

**Shown as:** a table; the refused `INSERT` as the database's error, which Learn shows as the expected outcome.

**Your turn:** Try to give the tiger (id 25) a `wingspan` of `0`, from `AnAge Build 15`. Which constraint stops it?

```sql
-- q: l21-ex
-- status: spike-table
-- expect: error Violates foreign key constraint
INSERT INTO species_traits VALUES (25, 'wingspan', '0', 'AnAge Build 15');
```

```text
-- result: l21-ex · error: statement 1 of 1: Constraint Error: Violates foreign key constraint because key "name: wingspan" does not exist in the referenced table
```

**Check:** `error` (the foreign key on `trait_name`: `wingspan` isn't a `name` in `traits`).

**Data:** spike stand-in; waits for mission C

### Lesson 22 · habitats

**Concept:** a many-to-many table that holds a fact about the pair; a class tree in one table; `COALESCE`. **Question:** Which habitats cover the most of Trinidad and Tobago, by the habitat map's estimate?

`country_habitats` links `countries` and `habitat_classes` the way `species_countries` links animals and countries (lesson 9), with one difference: each row also holds a number about the pair, `est_area_km2`, the area of that class inside the country's outline. It's an **estimate**, added up from a map of cells about 1 km across, each with the share of every class the map's authors found in it (Jung et al. 2020, §5). A map can be wrong about a cell, and the outline is Natural Earth's, so the numbers are good for comparing, not for quoting as measured.

```sql
-- q: l22
-- status: spike-table
SELECT h.code, h.name, ch.est_area_km2
FROM country_habitats AS ch
JOIN habitat_classes AS h ON h.code = ch.habitat_code
WHERE ch.country_code = 'TT'
ORDER BY ch.est_area_km2 DESC, h.code
LIMIT 6;
```

```text
-- result: l22 · 6 rows · sha256 6176e679b1ec
code | name | est_area_km2
106 | Forest – Subtropical/tropical moist lowland | 2464.91
306 | Shrubland – Subtropical/tropical moist | 998.51
1402 | Pastureland | 481.41
1405 | Urban Areas | 378.61
109 | Forest – Subtropical/tropical moist montane | 323.49
… 1 more row
```

The classes form a two-level tree in one table, as `taxa` does (lesson 12): `level1_code` points at the broad class, so 106 ("Forest – Subtropical/tropical moist lowland") points at 100 ("Forest"). Some rows of `country_habitats` are broad classes themselves, where the map said "forest" but not which kind; their `level1_code` is `NULL`. `COALESCE(h.level1_code, h.code)` returns the first value that isn't `NULL`: the broad class for a level-2 row, the code itself for a level-1 row. Joining `habitat_classes` once more on it totals each country by broad class:

```sql
-- q: l22-level1
-- status: spike-table
SELECT l1.name AS level1, sum(ch.est_area_km2) AS est_area_km2
FROM country_habitats AS ch
JOIN habitat_classes AS h ON h.code = ch.habitat_code
JOIN habitat_classes AS l1 ON l1.code = COALESCE(h.level1_code, h.code)
WHERE ch.country_code = 'TT'
GROUP BY l1.name
ORDER BY est_area_km2 DESC, level1;
```

```text
-- result: l22-level1 · 8 rows · sha256 ad2de4f391a9
level1 | est_area_km2
Forest | 2865.12
Shrubland | 1029.64
Artificial - Terrestrial | 1011.35
Marine Neritic | 121.55
Wetlands (inland) | 58.85
… 3 more rows
```

**Shown as:** a table.

**Your turn:** For each country with habitat estimates, show its `code`, its `name` (from `countries`) and its estimated forest area as `forest_km2`: every class under Forest (100), and 100 itself.

```sql
-- q: l22-ex
-- status: spike-table
SELECT c.code, c.name, sum(ch.est_area_km2) AS forest_km2
FROM country_habitats AS ch
JOIN countries AS c ON c.code = ch.country_code
JOIN habitat_classes AS h ON h.code = ch.habitat_code
WHERE COALESCE(h.level1_code, h.code) = 100
GROUP BY c.code, c.name
ORDER BY c.code;
```

```text
-- result: l22-ex · 2 rows · sha256 95b6f877382c
code | name | forest_km2
AX | Åland | 233.33
TT | Trinidad and Tobago | 2865.12
```

**Check:** `result, any row order`.

**Data:** spike stand-in; waits for mission D

### Lesson 23 · shares

**Concept:** window functions: a group's total beside each row (`OVER (PARTITION BY …)`), and a rank within the group. **Question:** What share of each country's mapped area is each habitat class?

A share needs each row's area and its country's total in the same row. `GROUP BY` would give the total but fold the classes into one row. A **window function** computes over a group of rows (the "window") and writes the answer beside every row of it, folding nothing: `sum(ch.est_area_km2) OVER (PARTITION BY ch.country_code)` is the country's total, on each of its rows.

```sql
-- q: l23
-- status: spike-table
SELECT ch.country_code, h.name, ch.est_area_km2,
       round(100 * ch.est_area_km2 / sum(ch.est_area_km2) OVER (PARTITION BY ch.country_code), 1) AS pct_of_mapped
FROM country_habitats AS ch
JOIN habitat_classes AS h ON h.code = ch.habitat_code
ORDER BY ch.country_code, ch.est_area_km2 DESC, h.code;
```

```text
-- result: l23 · 35 rows · sha256 e6dbe6234774
country_code | name | est_area_km2 | pct_of_mapped
AX | Plantations | 406.59 | 43
AX | Forest – Temperate | 230.41 | 24.4
AX | Shrubland –Temperate | 83.33 | 8.8
AX | Arable Land | 76.12 | 8.1
AX | Seagrass (Submerged) | 60.08 | 6.4
… 30 more rows
```

The total is the area the map classifies inside the outline, not the country's official area, so the column says `pct_of_mapped`. critwire computes shares in SQL like this and never stores them (§2): a stored share would go stale the moment one estimate changed.

**Shown as:** a table.

**Your turn:** Each country's three largest classes by estimated area. Show `country_code`, `name`, `est_area_km2` and `place` (1 for the largest), using `rank() OVER (PARTITION BY … ORDER BY …)`. A window function can't go in `WHERE`, because `WHERE` runs before it, so rank in a `WITH` first and keep `place <= 3` after.

```sql
-- q: l23-ex
-- status: spike-table
WITH ranked AS (
  SELECT ch.country_code, h.name, ch.est_area_km2,
         rank() OVER (PARTITION BY ch.country_code ORDER BY ch.est_area_km2 DESC) AS place
  FROM country_habitats AS ch
  JOIN habitat_classes AS h ON h.code = ch.habitat_code
)
SELECT country_code, name, est_area_km2, place
FROM ranked
WHERE place <= 3
ORDER BY country_code, place;
```

```text
-- result: l23-ex · 6 rows · sha256 9426a444f95a
country_code | name | est_area_km2 | place
AX | Plantations | 406.59 | 1
AX | Forest – Temperate | 230.41 | 2
AX | Shrubland –Temperate | 83.33 | 3
TT | Forest – Subtropical/tropical moist lowland | 2464.91 | 1
TT | Shrubland – Subtropical/tropical moist | 998.51 | 2
… 1 more row
```

**Check:** `result, any row order`.

**Data:** spike stand-in; waits for mission D

## 4. The advanced spatial track

**Who it's for.** Learners of 16 and up who have finished 002's core path (lessons 1–16: joins, `GROUP BY`, `LEFT JOIN`, `WITH`). The grown-data lessons (§3) help but aren't needed. The track starts with points and outlines in the browser and ends with the habitat map in the learner's own PostGIS. The data stays honest throughout: an occurrence is a record of where someone saw or collected an animal, not its native range, and a country outline is a line a mapmaker drew at one scale.

**Where each lesson runs** (T6). Each lesson names the spike run that backs it under **Evidence**; the runs are in the spike folder's `out/`.

| Lessons | Topic | Runs in | Evidence |
|---|---|---|---|
| 1 | points, outlines, coordinate systems | browser (DuckDB spatial); the PostGIS spelling beside it | `out/e1-data/`, `out/e1-pip/` |
| 2 | `ST_Contains`, `ST_Covers`, `ST_Intersects` and the boundary | browser (DuckDB spatial) | `out/e1-pip/` |
| 3 | distance and area on the ellipsoid | browser (DuckDB spatial) | `out/run-queries/`, `queries.log` |
| 4 | spatial joins: records against outlines | browser (DuckDB spatial) | `out/e1-pip/` |
| 5 | why projection matters | browser (vector areas) and your own PostGIS (raster cells) | `out/e3-zonal/`, `out/e3b-overviews/` |
| 6–7 | the habitat value at a point; zonal statistics | your own PostGIS | `out/e2-point/`, `out/e3-zonal/`, `out/e3b-overviews/`, `out/e3c-methods/` |
| 8 | reading a habitat clip in the browser | browser (geotiff.js) | `out/e4-clip/`, `out/e4-browser/` |
| §6 | IUCN ranges against records | your own PostGIS, with your own download | §6 |

**In the browser** the page loads DuckDB's `spatial` extension from critwire's own mirror, as 002 §1 does for `parquet` (self-hosted, signatures checked), and only on spatial lesson pages: the extension, not the outlines, is most of the page's download and memory (`out/e1-pip/`). There is no raster in DuckDB, so the habitat map is read in PostGIS or, in the browser, by geotiff.js.

**What the lessons ran on.** The spike's stand-ins (§2): critwire's draft country outlines at 1:10m, and every open record of three animals, the African Spurred Tortoise (`20`), the Sunda Pangolin (`24`) and the Axolotl (`74`). Mission D publishes the outlines at 1:50m, which stayed within the browser's memory budget where 1:10m didn't (`out/e1-pip/`), and a capped sample of records for every animal (§2, `occurrences`). So the results change when D ships: a coarser coastline leaves a few more coastal records outside every outline.

**How the paired blocks read.** The SQL is PostGIS's (`ST_` functions). Where DuckDB spells something differently (F5), the lesson shows the PostGIS block first, its id ending `-pg`, and the DuckDB block the browser runs after it. A lesson shows each difference once; its later blocks are DuckDB's, and the text says what to change for PostGIS. The differences the track meets:

| | PostGIS 3.4 | DuckDB `spatial` 1.5 |
|---|---|---|
| coordinate system | every geometry carries an SRID: `ST_SetSRID(ST_Point(lon, lat), 4326)`; mixing SRIDs is an error | a `GEOMETRY` here carries none: `ST_Point(lon, lat)`, and you keep track |
| Well-Known Text | `POINT(-99.14 19.27)`; `ST_AsEWKT` adds `SRID=4326;` | `POINT (-99.14 19.27)` |
| geometry type | `ST_MultiPolygon` (text) | `MULTIPOLYGON`, an `ENUM`: `CAST(… AS VARCHAR)` to show it |
| distance and area in metres | cast to `geography`, longitude first: `ST_Distance(a::geography, b::geography)`, `ST_Area(g::geography)` | `ST_Distance_Spheroid`, `ST_Area_Spheroid`, which take **latitude first**: `ST_FlipCoordinates` before them |
| rounding | `round(x::numeric, 1)`: only `numeric` rounds to decimal places | `round(x, 1)` |
| a point on the boundary | `ST_Contains` false, `ST_Covers` true | the same in the spike (lesson 2), though DuckDB's documentation says otherwise |
| raster | `postgis_raster` (lessons 5–7) | none |

### Your own PostGIS: the session and the tables

Raster lessons read the habitat map with PostGIS's out-db rasters: the database keeps only the raster's grid and a path, and GDAL fetches the pixels it needs from the file when a query asks for them. That is powerful, so PostgreSQL guards the two settings that allow it. `postgis.enable_outdb_rasters` lets GDAL open files outside the database, and `postgis.gdal_enabled_drivers` says which file formats it may read; with both on, a query can make the server read its own files or fetch any URL. Only a superuser may change them, unless a superuser allows your role once (PostgreSQL 15 or later). Ask whoever runs your server to run this in your database, as a superuser, with your role's name for `my_role`:

```sql
-- q: pg-once
-- status: untested: needs your server's superuser and grants a privilege; the spike never grants (F1)
-- engine: postgis
CREATE EXTENSION IF NOT EXISTS postgis_raster CASCADE;
CREATE SCHEMA IF NOT EXISTS learn_spatial AUTHORIZATION my_role;
-- Lets my_role switch the two raster settings on in its own sessions, and nothing more.
GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers TO my_role;
-- Before PostgreSQL 15, or if no one can grant: work in a superuser session, or switch the settings on for every role
-- in this one database (wider: each of them may then make the server read files and URLs):
-- ALTER DATABASE my_db SET postgis.enable_outdb_rasters = on;
-- ALTER DATABASE my_db SET postgis.gdal_enabled_drivers = 'GTiff COG';
```

Then start every session like this. The first line loads the raster library: a setting changed before it loads is quietly forgotten. The last line shows both settings, because a refused or misspelt `SET` can also fail without an error. If you don't see `on` and a list with `COG`, the raster lessons won't work in this session.

```sql
-- q: pg-session
-- status: ran
-- engine: postgis
SELECT postgis_raster_lib_version();
SET postgis.enable_outdb_rasters = on;
SET postgis.gdal_enabled_drivers = 'GTiff COG';
SET search_path = learn_spatial, public;
SELECT current_setting('postgis.enable_outdb_rasters') AS enable_outdb_rasters,
       current_setting('postgis.gdal_enabled_drivers') AS gdal_enabled_drivers;
```

```text
-- result: pg-session · 1 row · sha256 f9b08121f403
enable_outdb_rasters | gdal_enabled_drivers
on | GTiff COG
```

The lessons' tables live in their own schema, `learn_spatial`, built from the same files the browser lessons read: country shapes (Natural Earth, public domain), a sample of GBIF occurrence records (CC0 and CC BY only; records, not native range) the habitat map's classes and a clip of the map around Costa Rica (Jung et al. 2020, CC BY 4.0), stored in the database so the lessons that use it don't touch the full file; and, for the IUCN lessons (§6), critwire's animals with their countries with open records, from its published species file, and two made-up ranges labelled `synthetic`. The block below is how critwire builds them; in your own PostGIS, the lesson pages give import commands for the same files instead.

```sql
-- q: pg-setup
-- status: spike-table
-- engine: postgis
-- learn_spatial: the spatial lessons' tables, rebuilt from critwire's files. Each `-- rows:` or `-- bytes:` line names
-- the file passed as $1: a Parquet file's rows as JSON (geometry as WKB hex, nested fields as JSON), or a file's bytes. Only learn_spatial is
-- touched, nothing in it refers to another schema's tables, and running it again gives the same tables.
DROP TABLE IF EXISTS learn_spatial.example_ranges;
DROP TABLE IF EXISTS learn_spatial.species_countries;
DROP TABLE IF EXISTS learn_spatial.species;
DROP TABLE IF EXISTS learn_spatial.habitat_clips;
DROP TABLE IF EXISTS learn_spatial.habitat_classes;
DROP TABLE IF EXISTS learn_spatial.occurrences;
DROP TABLE IF EXISTS learn_spatial.country_shapes;

CREATE TABLE learn_spatial.country_shapes (
  country_code text PRIMARY KEY,
  geom geometry(Geometry, 4326) NOT NULL
);

-- rows: country_shapes.parquet
INSERT INTO learn_spatial.country_shapes (country_code, geom)
SELECT r.country_code, ST_GeomFromWKB(decode(r.geom, 'hex'), 4326)
FROM jsonb_to_recordset($1::jsonb) AS r(country_code text, geom text);

CREATE INDEX country_shapes_geom ON learn_spatial.country_shapes USING gist (geom);

CREATE TABLE learn_spatial.occurrences (
  id bigint PRIMARY KEY,
  species_id integer NOT NULL,
  dataset_key text NOT NULL,
  license text NOT NULL,
  longitude double precision NOT NULL,
  latitude double precision NOT NULL,
  country_code text,
  year integer
);

-- rows: occurrences.parquet
INSERT INTO learn_spatial.occurrences (id, species_id, dataset_key, license, longitude, latitude, country_code, year)
SELECT r.id, r.species_id, r.dataset_key, r.license, r.longitude, r.latitude, r.country_code, r.year
FROM jsonb_to_recordset($1::jsonb) AS r(id bigint, species_id integer, dataset_key text, license text,
                                        longitude double precision, latitude double precision, country_code text, year integer);

-- The habitat map's classes (Jung et al. 2020, v004 legend): level-2 classes point at their level-1 class.
CREATE TABLE learn_spatial.habitat_classes (
  code integer PRIMARY KEY,
  level1_code integer REFERENCES learn_spatial.habitat_classes (code),
  name text NOT NULL,
  CHECK ((code % 100 = 0) = (level1_code IS NULL))
);

-- rows: habitat_classes.parquet
INSERT INTO learn_spatial.habitat_classes (code, level1_code, name)
SELECT r.code, r.level1_code, r.name
FROM jsonb_to_recordset($1::jsonb) AS r(code integer, level1_code integer, name text);

-- The habitat map cut to Costa Rica, stored in the database: lessons that read it don't touch the full file.
CREATE TABLE learn_spatial.habitat_clips (
  clip text PRIMARY KEY,
  rast raster NOT NULL
);

-- bytes: clips/cr.cog.tif
INSERT INTO learn_spatial.habitat_clips (clip, rast)
VALUES ('cr', ST_FromGDALRaster($1));

-- critwire's animals, from its published species file: the keys the IUCN lessons (§6) join on, and the countries with
-- open records (records, not native range).
CREATE TABLE learn_spatial.species (
  id integer PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  scientific_name text NOT NULL UNIQUE,
  common_name text NOT NULL,
  class text NOT NULL,
  iucn_id integer UNIQUE
);

-- rows: species.parquet
INSERT INTO learn_spatial.species (id, slug, scientific_name, common_name, class, iucn_id)
SELECT r.id, r.slug, r."scientificName", r."commonName", r.taxonomy ->> 'class', (r.ids ->> 'iucn')::integer
FROM jsonb_to_recordset($1::jsonb) AS r(id integer, slug text, "scientificName" text, "commonName" text, taxonomy jsonb, ids jsonb);

CREATE TABLE learn_spatial.species_countries (
  species_id integer NOT NULL REFERENCES learn_spatial.species (id),
  country_code text NOT NULL,
  PRIMARY KEY (species_id, country_code)
);

-- rows: species.parquet
INSERT INTO learn_spatial.species_countries (species_id, country_code)
SELECT r.id, c.code
FROM jsonb_to_recordset($1::jsonb) AS r(id integer, "range" jsonb)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(r."range" -> 'countriesWithOpenRecords') = 'array' THEN r."range" -> 'countriesWithOpenRecords' ELSE '[]' END
) AS c(code);

-- Two made-up ranges for the IUCN lessons (§6): rectangles drawn by hand, labelled synthetic. critwire never holds IUCN's
-- ranges; a learner runs the same lessons on their own download, loaded with these columns.
CREATE TABLE learn_spatial.example_ranges (
  range_id integer PRIMARY KEY,
  iucn_id integer NOT NULL,
  name_in_file text NOT NULL,
  label text NOT NULL CHECK (label = 'synthetic'),
  geom geometry(MultiPolygon, 4326) NOT NULL
);

INSERT INTO learn_spatial.example_ranges (range_id, iucn_id, name_in_file, label, geom)
VALUES (1, 55290, 'Agalychnis callidryas', 'synthetic', ST_Multi(ST_MakeEnvelope(-84.0, 9.7, -82.8, 10.9, 4326))),
       (2, 1095, 'Ambystoma mexicanum', 'synthetic', ST_Multi(ST_MakeEnvelope(-99.15, 19.22, -98.95, 19.32, 4326)));

ANALYZE learn_spatial.country_shapes;
ANALYZE learn_spatial.occurrences;
ANALYZE learn_spatial.habitat_classes;
ANALYZE learn_spatial.habitat_clips;
ANALYZE learn_spatial.species;
ANALYZE learn_spatial.species_countries;
ANALYZE learn_spatial.example_ranges;
```

What the setup built, today:

```sql
-- q: pg-setup-counts
-- status: spike-table
-- engine: postgis
SELECT (SELECT count(*) FROM country_shapes)              AS country_shapes,
       (SELECT sum(ST_NPoints(geom)) FROM country_shapes) AS shape_vertices,
       (SELECT count(*) FROM occurrences)                 AS occurrences,
       (SELECT count(*) FROM habitat_classes)             AS habitat_classes,
       (SELECT count(*) FROM habitat_clips)               AS habitat_clips,
       (SELECT count(*) FROM species)                     AS species,
       (SELECT count(*) FROM species_countries)           AS species_countries,
       (SELECT count(*) FROM example_ranges)              AS example_ranges,
       (SELECT ST_Width(rast) || ' × ' || ST_Height(rast) || ' cells, SRID ' || ST_SRID(rast)
          FROM habitat_clips WHERE clip = 'cr')           AS cr_clip;
```

```text
-- result: pg-setup-counts · 1 row · sha256 41087fe24683
country_shapes | shape_vertices | occurrences | habitat_classes | habitat_clips | species | species_countries | example_ranges | cr_clip
250 | 551273 | 528 | 75 | 1 | 76 | 472 | 2 | 4923 × 6223 cells, SRID 3857
```

### Spatial lesson 1 · points-and-shapes

**Concept:** points and outlines as values; longitude first; Well-Known Text; a coordinate system (WGS 84, EPSG:4326). **Question:** What does the database see in a record's position and in a country's outline?

Every occurrence record has a `longitude` and a `latitude`: degrees east of Greenwich (west is negative) and north of the equator (south is negative), on WGS 84, the model of the Earth that GPS uses. Mapmakers number their coordinate systems, and this one is **EPSG:4326**. `ST_Point(x, y)` turns two numbers into a point, and **x comes first: x is longitude**, the east–west position, as on a graph. `ST_AsText` writes a geometry as Well-Known Text (WKT), the plain-text form every spatial database reads and writes.

In PostGIS a geometry also carries its coordinate system, as a number called the SRID. The outlines are stored with SRID 4326, so a point built from a record is given it too (`ST_SetSRID`), and `ST_AsEWKT`, "extended" WKT, prints it:

```sql
-- q: s01-point-pg
-- status: spike-table
-- engine: postgis
SELECT o.id, ST_AsEWKT(ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326)) AS point
FROM occurrences AS o
WHERE o.species_id = 74
ORDER BY o.id
LIMIT 3;
```

```text
-- result: s01-point-pg · 3 rows · sha256 7e96511853bc
id | point
543678766 | SRID=4326;POINT(-99.1401032 19.2706253)
543710270 | SRID=4326;POINT(-99.138611 19.434167)
543710271 | SRID=4326;POINT(-99.138611 19.434167)
```

The browser's DuckDB keeps no coordinate system on a geometry, so its point is plain `ST_Point`, and its WKT has a space after `POINT`. The same three Axolotl records:

```sql
-- q: s01-point
-- status: spike-table
SELECT o.id, ST_AsText(ST_Point(o.longitude, o.latitude)) AS point
FROM occurrences AS o
WHERE o.species_id = 74
ORDER BY o.id
LIMIT 3;
```

```text
-- result: s01-point · 3 rows · sha256 7853fb9ca2d5
id | point
543678766 | POINT (-99.1401032 19.2706253)
543710270 | POINT (-99.138611 19.434167)
543710271 | POINT (-99.138611 19.434167)
```

Forgetting the SRID in PostGIS isn't a silent mistake: comparing a point that has none with an outline in 4326 stops with an error. DuckDB compares them without asking, so in the browser keeping track is your job.

```sql
-- q: s01-srid-pg
-- status: spike-table
-- engine: postgis
-- expect: error mixed SRID geometries
SELECT count(*) AS records
FROM occurrences AS o
JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))
WHERE c.country_code = 'MX';
```

```text
-- result: s01-srid-pg · error: statement 1 of 1: contains: Operation on mixed SRID geometries (MultiPolygon, 4326) != (Point, 0)
```

An outline is a **polygon**: a ring of vertices, the corners of the line the mapmaker drew, ending where it started. A country with islands is a **multipolygon**, several polygons in one value. `ST_NumGeometries` counts the parts, `ST_NPoints` the vertices, and `ST_XMin`, `ST_XMax`, `ST_YMin` and `ST_YMax` give the bounding box, the smallest rectangle around the shape, in degrees:

```sql
-- q: s01-pg
-- status: spike-table
-- engine: postgis
SELECT country_code, ST_GeometryType(geom) AS shape_type, ST_NumGeometries(geom) AS parts, ST_NPoints(geom) AS vertices,
       round(ST_XMin(geom)::numeric, 2) AS west, round(ST_XMax(geom)::numeric, 2) AS east,
       round(ST_YMin(geom)::numeric, 2) AS south, round(ST_YMax(geom)::numeric, 2) AS north
FROM country_shapes
WHERE country_code IN ('BJ', 'MQ', 'MX')
ORDER BY country_code;
```

```text
-- result: s01-pg · 3 rows · sha256 34186ac28f1b
country_code | shape_type | parts | vertices | west | east | south | north
BJ | ST_Polygon | 1 | 616 | 0.76 | 3.84 | 6.21 | 12.40
MQ | ST_Polygon | 1 | 133 | -61.23 | -60.81 | 14.41 | 14.88
MX | ST_MultiPolygon | 51 | 7419 | -118.37 | -86.70 | 14.55 | 32.71
```

```sql
-- q: s01
-- status: spike-table
SELECT country_code, CAST(ST_GeometryType(geom) AS VARCHAR) AS shape_type, ST_NumGeometries(geom) AS parts, ST_NPoints(geom) AS vertices,
       round(ST_XMin(geom), 2) AS west, round(ST_XMax(geom), 2) AS east,
       round(ST_YMin(geom), 2) AS south, round(ST_YMax(geom), 2) AS north
FROM country_shapes
WHERE country_code IN ('BJ', 'MQ', 'MX')
ORDER BY country_code;
```

```text
-- result: s01 · 3 rows · sha256 4b3326117057
country_code | shape_type | parts | vertices | west | east | south | north
BJ | POLYGON | 1 | 616 | 0.76 | 3.84 | 6.21 | 12.4
MQ | POLYGON | 1 | 133 | -61.23 | -60.81 | 14.41 | 14.88
MX | MULTIPOLYGON | 51 | 7419 | -118.37 | -86.7 | 14.55 | 32.71
```

DuckDB returns the type as an `ENUM`, a column type that can hold only names from a fixed list; Learn's result reader shows it only as text, hence the `CAST`. Benin is one polygon; Mexico's islands make it a multipolygon. More vertices means a more detailed line, and a bigger file: that is the whole difference between the 1:10m and 1:50m outlines.

**Shown as:** tables.

**Your turn:** Which five outlines have the most parts? Show `country_code`, the country's `name` from `countries`, and `parts`, most first, ties by `country_code`.

```sql
-- q: s01-ex
-- status: spike-table
SELECT c.country_code, k.name, ST_NumGeometries(c.geom) AS parts
FROM country_shapes AS c
JOIN countries AS k ON k.code = c.country_code
ORDER BY parts DESC, c.country_code
LIMIT 5;
```

```text
-- result: s01-ex · 5 rows · sha256 d0c2e3622aaf
country_code | name | parts
CA | Canada | 412
US | United States of America | 344
ID | Indonesia | 264
RU | Russia | 214
AQ | Antarctica | 179
```

**Check:** `result, in order`.

**Runs in:** browser (DuckDB spatial); the `-pg` blocks in your own PostGIS

**Evidence:** `out/e1-data/` (the outlines and records, at both scales), `out/e1-pip/` (the same tables in DuckDB-WASM, Node DuckDB and PostGIS)

### Spatial lesson 2 · contains

**Concept:** `ST_Contains`, `ST_Covers` and `ST_Intersects`; which argument goes first; a point on the line; swapped coordinates. **Question:** Which countries' outlines hold the African Spurred Tortoise's records?

`ST_Contains(a, b)` is true when `b` lies inside `a`: the outline first, then what's inside it. Joining on it pairs each record with every outline around its point, and `GROUP BY` counts them. In PostGIS the point gets its SRID, as in lesson 1:

```sql
-- q: s02-pg
-- status: spike-table
-- engine: postgis
SELECT c.country_code, count(*) AS records
FROM occurrences AS o
JOIN country_shapes AS c ON ST_Contains(c.geom, ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326))
WHERE o.species_id = 20
GROUP BY c.country_code
ORDER BY records DESC, c.country_code;
```

```text
-- result: s02-pg · 17 rows · sha256 72503940077c
country_code | records
BJ | 41
NE | 4
TD | 4
US | 4
FR | 3
… 12 more rows
```

```sql
-- q: s02
-- status: spike-table
SELECT c.country_code, count(*) AS records
FROM occurrences AS o
JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))
WHERE o.species_id = 20
GROUP BY c.country_code
ORDER BY records DESC, c.country_code;
```

```text
-- result: s02 · 17 rows · sha256 72503940077c
country_code | records
BJ | 41
NE | 4
TD | 4
US | 4
FR | 3
… 12 more rows
```

The tortoise lives wild along the southern edge of the Sahara, yet some records sit in outlines on other continents. It is a popular pet, and someone recorded a kept or escaped animal: these are records, not its range. Martinique's records are counted twice, under `MQ` and under `FR`, because critwire's outline for France includes its overseas regions (002 §6), so a point there is inside both.

**A point on the line.** `ST_Contains` needs the point strictly inside; a point exactly on the outline's line isn't contained. `ST_Covers` accepts the line as well, and `ST_Intersects` is true whenever the two touch at all. The point below is the first corner of Luxembourg's outline:

```sql
-- q: s02-boundary-pg
-- status: spike-table
-- engine: postgis
SELECT country_code,
       ST_Contains(geom, ST_SetSRID(ST_Point(6.117487, 50.120456), 4326)) AS contains,
       ST_Covers(geom, ST_SetSRID(ST_Point(6.117487, 50.120456), 4326)) AS covers,
       ST_Intersects(geom, ST_SetSRID(ST_Point(6.117487, 50.120456), 4326)) AS intersects
FROM country_shapes
WHERE country_code = 'LU';
```

```text
-- result: s02-boundary-pg · 1 row · sha256 deecc4fea9d2
country_code | contains | covers | intersects
LU | false | true | true
```

```sql
-- q: s02-boundary
-- status: spike-table
SELECT country_code,
       ST_Contains(geom, ST_Point(6.117487, 50.120456)) AS contains,
       ST_Covers(geom, ST_Point(6.117487, 50.120456)) AS covers,
       ST_Intersects(geom, ST_Point(6.117487, 50.120456)) AS intersects
FROM country_shapes
WHERE country_code = 'LU';
```

```text
-- result: s02-boundary · 1 row · sha256 deecc4fea9d2
country_code | contains | covers | intersects
LU | false | true | true
```

DuckDB's documentation says its `ST_Contains` counts the boundary too, but DuckDB 1.5.6 answered as PostGIS does, in the browser and in Node alike. When a manual and an engine disagree, a small test like this one settles it. A GPS point rarely lands exactly on a line, so for records it seldom matters; for two neighbouring outlines it does: they intersect along their border, but neither contains the other.

**Swapped coordinates.** The classic mistake is `ST_Point(latitude, longitude)`. Nothing stops it: a swapped point is still a point, and many land inside some outline, just the wrong one.

```sql
-- q: s02-swap
-- status: spike-table
SELECT o.species_id, c.country_code, count(*) AS records
FROM occurrences AS o
JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.latitude, o.longitude))
GROUP BY o.species_id, c.country_code
ORDER BY o.species_id, c.country_code;
```

```text
-- result: s02-swap · 12 rows · sha256 036b9e8a4ef8
species_id | country_code | records
20 | AO | 3
20 | AQ | 2
20 | CG | 1
20 | CM | 3
20 | GQ | 3
… 7 more rows
```

Tortoises in Antarctica give it away. An Axolotl in Iran is less obviously wrong, which is why it pays to look at a few points on a map before trusting a join.

**Shown as:** tables.

**Your turn:** In one row: how many Axolotl records (species `74`) lie inside Mexico's outline (`in_outline`), and how many has GBIF labelled `MX` (`gbif_says_mx`)? `count(*) FILTER (WHERE …)` counts only the rows its condition keeps.

```sql
-- q: s02-ex
-- status: spike-table
SELECT count(*) FILTER (WHERE ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))) AS in_outline,
       count(*) FILTER (WHERE o.country_code = 'MX') AS gbif_says_mx
FROM occurrences AS o, country_shapes AS c
WHERE o.species_id = 74 AND c.country_code = 'MX';
```

```text
-- result: s02-ex · 1 row · sha256 223d98092899
in_outline | gbif_says_mx
222 | 222
```

**Check:** `result, any row order`.

**Runs in:** browser (DuckDB spatial); the `-pg` blocks in your own PostGIS

**Evidence:** `out/e1-pip/` (the boundary point and the per-country counts: DuckDB-WASM, Node DuckDB and PostGIS give the same answers)

### Spatial lesson 3 · distance-and-area

**Concept:** degrees aren't lengths; distance and area on the curved Earth (the ellipsoid); DuckDB's latitude-first spheroid functions. **Question:** How far from its home lakes was the Axolotl recorded, and how big is a country?

`ST_Distance` on longitudes and latitudes measures straight across the flat grid of numbers, so its answer is in degrees, which isn't a length: a degree of longitude is about 111 km at the equator and shrinks to nothing at the poles. A distance in metres is measured along the Earth's curved surface, on the WGS 84 ellipsoid. PostGIS does that when both points are cast to `geography`; DuckDB's `ST_Distance_Spheroid` does it too but wants **latitude first**, so `ST_FlipCoordinates` swaps x and y just before. The fixed point is Xochimilco, the lakes at the edge of Mexico City where the Axolotl lives wild:

```sql
-- q: s03-pg
-- status: spike-table
-- engine: postgis
SELECT o.id, o.country_code,
       round(ST_Distance(ST_SetSRID(ST_Point(-99.10, 19.26), 4326),
                         ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326))::numeric, 1) AS degrees,
       round((ST_Distance(ST_SetSRID(ST_Point(-99.10, 19.26), 4326)::geography,
                          ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326)::geography) / 1000)::numeric) AS km
FROM occurrences AS o
WHERE o.species_id = 74
ORDER BY km DESC, o.id
LIMIT 5;
```

```text
-- result: s03-pg · 5 rows · sha256 cfd1234b3c29
id | country_code | degrees | km
1268744697 | NZ | 279.4 | 11190
1268746426 | NZ | 279.4 | 11190
4913773496 | UA | 133.6 | 11025
5019486819 | DE | 117.2 | 9759
5014867447 | DE | 111.8 | 9605
```

```sql
-- q: s03
-- status: spike-table
SELECT o.id, o.country_code,
       round(ST_Distance(ST_Point(-99.10, 19.26), ST_Point(o.longitude, o.latitude)), 1) AS degrees,
       round(ST_Distance_Spheroid(ST_FlipCoordinates(ST_Point(-99.10, 19.26)),
                                  ST_FlipCoordinates(ST_Point(o.longitude, o.latitude))) / 1000) AS km
FROM occurrences AS o
WHERE o.species_id = 74
ORDER BY km DESC, o.id
LIMIT 5;
```

```text
-- result: s03 · 5 rows · sha256 cfd1234b3c29
id | country_code | degrees | km
1268744697 | NZ | 279.4 | 11190
1268746426 | NZ | 279.4 | 11190
4913773496 | UA | 133.6 | 11025
5019486819 | DE | 117.2 | 9759
5014867447 | DE | 111.8 | 9605
```

Both engines give the same kilometres. The degrees are another story: New Zealand is about as far from Mexico City as Ukraine, yet twice as many degrees away, because the flat grid ends at 180° east and the straight line across it goes the long way round, while the real shortest path crosses the Pacific. The farthest records are kept animals: the Axolotl is a favourite of aquariums and laboratories worldwide, and only the Xochimilco records are its wild range.

`ST_Area` has the same problem: on these outlines it gives square degrees, and a square degree near the poles covers far less ground than one at the equator. The area on the ellipsoid is `ST_Area(geom::geography)` in PostGIS and `ST_Area_Spheroid` (latitude first again) in DuckDB, in square metres:

```sql
-- q: s03-area-pg
-- status: spike-table
-- engine: postgis
SELECT country_code,
       round(ST_Area(geom)::numeric, 1) AS square_degrees,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS km2
FROM country_shapes
WHERE country_code IN ('BJ', 'CA', 'GL', 'MX', 'NE')
ORDER BY km2 DESC, country_code;
```

```text
-- result: s03-area-pg · 5 rows · sha256 3e1c8df84508
country_code | square_degrees | km2
CA | 1691.9 | 9945629
GL | 659.9 | 2154381
MX | 174.2 | 1957847
NE | 100.6 | 1181301
BJ | 9.6 | 116113
```

```sql
-- q: s03-area
-- status: spike-table
SELECT country_code,
       round(ST_Area(geom), 1) AS square_degrees,
       round(ST_Area_Spheroid(ST_FlipCoordinates(geom)) / 1e6) AS km2
FROM country_shapes
WHERE country_code IN ('BJ', 'CA', 'GL', 'MX', 'NE')
ORDER BY km2 DESC, country_code;
```

```text
-- result: s03-area · 5 rows · sha256 3e1c8df84508
country_code | square_degrees | km2
CA | 1691.9 | 9945629
GL | 659.9 | 2154381
MX | 174.2 | 1957847
NE | 100.6 | 1181301
BJ | 9.6 | 116113
```

In square degrees, Canada and Greenland look far bigger next to Mexico than they are, and the farther north, the bigger the flattery. Lesson 5 meets the same effect in a projected map, where it is built into every cell.

**Shown as:** tables.

**Your turn:** The area in km² of each outline whose code GBIF gave to an African Spurred Tortoise record (species `20`): `country_code` and `km2`, largest first, ties by `country_code`.

```sql
-- q: s03-ex
-- status: spike-table
SELECT c.country_code, round(ST_Area_Spheroid(ST_FlipCoordinates(c.geom)) / 1e6) AS km2
FROM country_shapes AS c
WHERE c.country_code IN (SELECT country_code FROM occurrences WHERE species_id = 20)
ORDER BY km2 DESC, c.country_code;
```

```text
-- result: s03-ex · 17 rows · sha256 12947d7d2106
country_code | km2
US | 9464228
MX | 1957847
SD | 1855614
TD | 1266282
ML | 1252724
… 12 more rows
```

**Check:** `result, in order`.

**Runs in:** browser (DuckDB spatial); the `-pg` blocks in your own PostGIS

**Evidence:** `out/run-queries/` and `queries.log` (this lesson's blocks in DuckDB-WASM and PostGIS: the same kilometres and km²)

### Spatial lesson 4 · spatial-join

**Concept:** a join on a spatial test; `LEFT JOIN` to keep what matches nothing; checking one source against another. **Question:** Does the outline around each record agree with the country GBIF gave it?

Every GBIF record carries a country code, from its publisher or worked out by GBIF from the coordinates. Joining the records to the outlines checks one against the other. The `LEFT JOIN` keeps a record whose point is in no outline, with `NULL` for the outline, and `count(shape_code)` counts only real matches. Each record then **agrees** (one of its outlines is GBIF's country), **disagrees** or has **no polygon**:

```sql
-- q: s04-pg
-- status: spike-table
-- engine: postgis
WITH hits AS (
  SELECT o.id, o.country_code AS gbif_code, c.country_code AS shape_code
  FROM occurrences AS o
  LEFT JOIN country_shapes AS c ON ST_Contains(c.geom, ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326))
), per_record AS (
  SELECT id, count(shape_code) AS shapes, bool_or(shape_code = gbif_code) AS agrees
  FROM hits
  GROUP BY id
)
SELECT CASE WHEN shapes = 0 THEN 'no polygon' WHEN agrees THEN 'agree' ELSE 'disagree' END AS outcome,
       count(*) AS records,
       count(*) FILTER (WHERE shapes > 1) AS in_two_outlines
FROM per_record
GROUP BY 1
ORDER BY 1;
```

```text
-- result: s04-pg · 3 rows · sha256 42a80558287d
outcome | records | in_two_outlines
agree | 506 | 3
disagree | 1 | 0
no polygon | 21 | 0
```

```sql
-- q: s04
-- status: spike-table
WITH hits AS (
  SELECT o.id, o.country_code AS gbif_code, c.country_code AS shape_code
  FROM occurrences AS o
  LEFT JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))
), per_record AS (
  SELECT id, count(shape_code) AS shapes, bool_or(shape_code = gbif_code) AS agrees
  FROM hits
  GROUP BY id
)
SELECT CASE WHEN shapes = 0 THEN 'no polygon' WHEN agrees THEN 'agree' ELSE 'disagree' END AS outcome,
       count(*) AS records,
       count(*) FILTER (WHERE shapes > 1) AS in_two_outlines
FROM per_record
GROUP BY 1
ORDER BY 1;
```

```text
-- result: s04 · 3 rows · sha256 42a80558287d
outcome | records | in_two_outlines
agree | 506 | 3
disagree | 1 | 0
no polygon | 21 | 0
```

Most records agree. The ones that don't are worth a look:

```sql
-- q: s04-misses
-- status: spike-table
WITH hits AS (
  SELECT o.id, o.species_id, o.country_code AS gbif_code, c.country_code AS shape_code, o.longitude, o.latitude
  FROM occurrences AS o
  LEFT JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))
)
SELECT id, species_id, gbif_code, shape_code, round(longitude, 3) AS longitude, round(latitude, 3) AS latitude
FROM hits
WHERE id NOT IN (SELECT id FROM hits WHERE shape_code = gbif_code)
ORDER BY id;
```

```text
-- result: s04-misses · 22 rows · sha256 eca7db517e0e
id | species_id | gbif_code | shape_code | longitude | latitude
665802841 | 24 | MY | NULL | 118.233 | 5.833
665831156 | 24 | MY | NULL | 118.117 | 5.833
665831157 | 24 | MY | NULL | 118.117 | 5.833
1319221115 | 24 | ID | NULL | 103.941 | 0.919
1571143542 | 20 | SN | NULL | -17.414 | 14.794
… 17 more rows
```

Nearly all are on coasts: a record on a beach, a mangrove shore or a small island, just outside an outline whose coastline the mapmaker simplified. One sits on the wrong side of a border. Neither the record nor the outline is simply wrong; they disagree at the precision of the map, and a coarser map (1:50m) leaves more records outside. A country assigned from an outline is an estimate, like every other number derived from a map.

**Shown as:** tables.

**Your turn:** For the Axolotl (species `74`), how many records fall in each outline? Keep the records in no outline (their `country_code` is `NULL`). Show `country_code` and `records`, most first, ties by `country_code` with `NULL` last.

```sql
-- q: s04-ex
-- status: spike-table
SELECT c.country_code, count(*) AS records
FROM occurrences AS o
LEFT JOIN country_shapes AS c ON ST_Contains(c.geom, ST_Point(o.longitude, o.latitude))
WHERE o.species_id = 74
GROUP BY c.country_code
ORDER BY records DESC, c.country_code NULLS LAST;
```

```text
-- result: s04-ex · 5 rows · sha256 651b56289c7c
country_code | records
MX | 222
CA | 2
DE | 2
NZ | 2
UA | 1
```

**Check:** `result, in order`.

**Runs in:** browser (DuckDB spatial); the `-pg` block in your own PostGIS

**Evidence:** `out/e1-pip/` (outcome, per-country and mismatches: DuckDB-WASM, Node DuckDB and PostGIS agree at 1:10m, and DuckDB at 1:50m too)

### Spatial lesson 5 · projection

**Concept:** a projection flattens the Earth onto a map; Web Mercator (EPSG:3857) keeps shapes and stretches areas; an equal-area projection (EPSG:6933) keeps areas; a raster on a Mercator grid stretches every cell. **Question:** How much bigger do countries and habitats look on a Web Mercator map than they are?

A flat map needs a projection, a rule that turns longitude and latitude into x and y in metres. Most web maps use **Web Mercator** (EPSG:3857). It keeps shapes right in any small area, which is why street maps use it, but at latitude φ it stretches every length by 1 ÷ cos φ, so every area by 1 ÷ cos² φ: a few percent near the equator, four times at 60° north, and without limit towards the poles, which it cuts off at about 85°. An **equal-area** projection such as EASE-Grid 2.0 (EPSG:6933) does the opposite: shapes bend, but every area is true.

`ST_Transform` reprojects a geometry. PostGIS knows the outline's SRID, so it needs only the target. DuckDB needs both systems, as text, and `always_xy := true`, because EPSG's own definition of 4326 puts latitude first. Lesson 3's five outlines, measured on the ellipsoid, on a Web Mercator map and in the equal-area projection:

```sql
-- q: s05-pg
-- status: spike-table
-- engine: postgis
SELECT country_code,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS km2,
       round((ST_Area(ST_Transform(geom, 3857)) / 1e6)::numeric) AS mercator_km2,
       round((ST_Area(ST_Transform(geom, 6933)) / 1e6)::numeric) AS equal_area_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / ST_Area(geom::geography))::numeric, 2) AS stretch
FROM country_shapes
WHERE country_code IN ('BJ', 'CA', 'GL', 'MX', 'NE')
ORDER BY km2 DESC, country_code;
```

```text
-- result: s05-pg · 5 rows · sha256 e3a60347a0b3
country_code | km2 | mercator_km2 | equal_area_km2 | stretch
CA | 9945629 | 51086659 | 9945628 | 5.14
GL | 2154381 | 35187509 | 2154380 | 16.33
MX | 1957847 | 2372542 | 1957845 | 1.21
NE | 1181301 | 1307983 | 1181303 | 1.11
BJ | 116113 | 120313 | 116113 | 1.04
```

```sql
-- q: s05
-- status: spike-table
SELECT country_code,
       round(ST_Area_Spheroid(ST_FlipCoordinates(geom)) / 1e6) AS km2,
       round(ST_Area(ST_Transform(geom, 'EPSG:4326', 'EPSG:3857', always_xy := true)) / 1e6) AS mercator_km2,
       round(ST_Area(ST_Transform(geom, 'EPSG:4326', 'EPSG:6933', always_xy := true)) / 1e6) AS equal_area_km2,
       round(ST_Area(ST_Transform(geom, 'EPSG:4326', 'EPSG:3857', always_xy := true)) / ST_Area_Spheroid(ST_FlipCoordinates(geom)), 2) AS stretch
FROM country_shapes
WHERE country_code IN ('BJ', 'CA', 'GL', 'MX', 'NE')
ORDER BY km2 DESC, country_code;
```

```text
-- result: s05 · 5 rows · sha256 e3a60347a0b3
country_code | km2 | mercator_km2 | equal_area_km2 | stretch
CA | 9945629 | 51086659 | 9945628 | 5.14
GL | 2154381 | 35187509 | 2154380 | 16.33
MX | 1957847 | 2372542 | 1957845 | 1.21
NE | 1181301 | 1307983 | 1181303 | 1.11
BJ | 116113 | 120313 | 116113 | 1.04
```

The equal-area column agrees with the ellipsoid to within rounding; the Web Mercator column doesn't. Benin and Niger, in the tropics, grow a little; Canada and Greenland, far north, swell several times over. That is why Greenland looks the size of Africa on a web map.

The habitat map has the same problem built into every cell. It is a grid in Web Mercator: each cell is 103.02 m on a side **on the map**, so on the ground it is 103.02 × cos φ m on a side, about 101 m in Costa Rica and half that at 60° north. A count of cells is therefore not an area. Each cell's area is (103.02 · cos φ)² m², with φ the latitude of its row, which comes back from a Web Mercator y as φ = 2 · atan(e^(y ÷ R)) − π ÷ 2, R = 6,378,137 m.

The map file also holds smaller copies of itself, its **overviews**, each half the width of the one before. The smallest, at ÷1024, covers the whole world in a single tile of 380 × 380 cells, each 105 km on the map. It keeps one full-resolution cell in about a million, so its areas are rough, but it is small enough to read whole. `GTIFF_DIR:11:` opens the file's 11th image, that overview, on its own; GDAL gives an overview no coordinates, so the raster below is in cell numbers (row 1 at the top), and the latitude comes from the row. Two shortcuts fail, and the first fails silently: an empty raster with the overview's cell size on the whole file reads full-resolution cells anyway, and `GTIFF_DIR:` on a Web Mercator grid draws a warning that the band is "not aligned" and reads the wrong cells (`out/e3b-overviews/`). The block reads it straight from the 3.64 GB file, with a few range requests:

```sql
-- q: s05-cells
-- status: ran
-- engine: postgis
WITH level AS (
  SELECT ST_AddBand(ST_MakeEmptyRaster(380, 380, 0, 0, 1, 1, 0, 0, 0),
                    'GTIFF_DIR:11:/vsicurl/https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif',
                    ARRAY[1], 1, 0) AS rast
), cells AS (
  -- one row per cell with a habitat class (nodata skipped), and the latitude of its row's centre
  SELECT p.val AS habitat_code,
         2 * atan(exp((20037508.342789248 - (p.y - 0.5) * 40075016.685578496 / 380) / 6378137)) - pi() / 2 AS lat
  FROM level CROSS JOIN LATERAL ST_PixelAsPoints(level.rast, 1) AS p
)
SELECT habitat_code,
       count(*) AS cells,
       round(count(*) * (40075016.685578496 / 380 / 1000) ^ 2) AS map_km2,
       round(sum((40075016.685578496 / 380 / 1000 * cos(lat)) ^ 2)) AS est_km2
FROM cells
GROUP BY habitat_code
ORDER BY map_km2 DESC, habitat_code
LIMIT 5;
```

```text
-- result: s05-cells · 5 rows · sha256 018e01c0c7b4
habitat_code | cells | map_km2 | est_km2
1102 | 51850 | 576672168 | 247460749
803 | 32470 | 361129128 | 16840141
900 | 19989 | 222316296 | 32479093
1103 | 8142 | 90554769 | 42370329
1101 | 4920 | 54719905 | 17512835
```

Class 11.2 (`1102`, the abyssal plain of the deep ocean) is the largest either way. Class 8.3 (`803`, cold desert) is second on the map and shrinks to a fraction once each cell is corrected: most of it is Antarctica, whose rows sit closest to Mercator's edge. Any count of cells from this map, by a country or a species' records, has to be corrected the same way before it is called an area, and even then it is an **estimate**. Lesson 7 does it at full resolution.

**Shown as:** tables.

**Your turn:** For each outline whose code GBIF gave to an African Spurred Tortoise record (species `20`), how many times bigger it is on a Web Mercator map than on the ellipsoid: `country_code` and `stretch` (2 decimal places), most stretched first, ties by `country_code`.

```sql
-- q: s05-ex
-- status: spike-table
SELECT c.country_code,
       round(ST_Area(ST_Transform(c.geom, 'EPSG:4326', 'EPSG:3857', always_xy := true)) / ST_Area_Spheroid(ST_FlipCoordinates(c.geom)), 2) AS stretch
FROM country_shapes AS c
WHERE c.country_code IN (SELECT country_code FROM occurrences WHERE species_id = 20)
ORDER BY stretch DESC, c.country_code;
```

```text
-- result: s05-ex · 17 rows · sha256 3fd0b75d776b
country_code | stretch
NL | 2.65
DE | 2.54
US | 2.3
ES | 1.72
EG | 1.26
… 12 more rows
```

**Check:** `result, in order`.

**Runs in:** browser (DuckDB spatial) for the outlines; your own PostGIS for the raster cells (`s05-pg`, `s05-cells`)

**Evidence:** `out/e3-zonal/` (Mercator ÷ true area, row by row, against 1 ÷ cos² φ: TT and AX), `out/e3b-overviews/` (PostGIS reads the ÷1024 overview through `GTIFF_DIR:11:` cell for cell as geotiff.js does, and its histogram equals F3's), `queries.log` (this lesson's blocks in both engines)

### Spatial lesson 6 · point-value

**Concept:** a raster is a grid of cells, each holding one value; the grid's origin and cell size; reading the cell under a point (`ST_Value`); an out-db raster reads only the cells a query needs; nodata as `NULL`. **Question:** Which habitat class does the map give at a place?

The habitat map (Jung et al. 2020, CC BY 4.0) gives each cell of about 100 m one class of IUCN's habitat classification scheme, at its second level, written as a number without the dot: `106` is class 1.6, "Forest – Subtropical/tropical moist lowland", and `1405` is 14.5, "Urban Areas". A class whose code ends in `00` is a first-level class, used where the map couldn't tell the second level. `0` means no data. The map is one file of 3.64 GB, far too big to load, so PostGIS reads it **out-db**: the database holds only an empty grid and the file's address, and GDAL fetches the few kilobytes a query needs, by HTTP range requests.

Reading a point takes three steps:
1. Put the point on the map's grid: `ST_Transform` to Web Mercator (3857).
2. Find its cell. The grid starts at the map's top-left corner, x₀ = −20,037,508.34 m and y₀ = +20,037,508.34 m, and its cells are 103.02 m: column = ⌊(x − x₀) ÷ 103.02⌋, row = ⌊(y₀ − y) ÷ 103.02⌋.
3. Make an empty one-cell raster at that cell's corner, add the file's band 1 to it (`ST_AddBand` with the file's path, band `ARRAY[1]`, nodata `0`), and ask `ST_Value` for the value under the point.

```sql
-- q: s06
-- status: ran
-- engine: postgis
WITH grid (x0, y0, size) AS (
  VALUES (-20037508.342789244::float8, 20037508.342789248::float8, 103.02166779498629::float8)
), places (place, lon, lat) AS (
  VALUES ('Xochimilco', -99.10, 19.26), ('Near Manaus', -60.0, -3.0), ('Amazon forest', -62.0, -3.0)
), points AS (
  SELECT place, ST_Transform(ST_SetSRID(ST_Point(lon, lat), 4326), 3857) AS pt
  FROM places
), cells AS (
  SELECT place, pt, floor((ST_X(pt) - x0) / size) AS col, floor((y0 - ST_Y(pt)) / size) AS row, x0, y0, size
  FROM points CROSS JOIN grid
), windows AS (
  SELECT place, pt, col, row,
         ST_AddBand(ST_MakeEmptyRaster(1, 1, x0 + col * size, y0 - row * size, size, -size, 0, 0, 3857),
                    '/vsicurl/https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif', ARRAY[1], 1, 0) AS rast
  FROM cells
)
SELECT place, col, row, ST_Value(rast, 1, pt) AS habitat_code
FROM windows
ORDER BY place;
```

```text
-- result: s06 · 3 rows · sha256 8eb56049ee3c
place | col | row | habitat_code
Amazon forest | 127504 | 197741 | 106
Near Manaus | 129665 | 197741 | 1405
Xochimilco | 87416 | 173283 | 1405
```

The spike timed this: a fresh session reads a few tens of kilobytes per point in under half a second, and the same cell again costs nothing (`out/e2-point/`). The Axolotl's lakes come out as Urban Areas: Xochimilco's canals run between the houses at the edge of Mexico City, and a canal narrower than a cell disappears into the class that covers most of it. A class at a point is the map's answer for the whole cell, not what an animal there was using.

**Which file.** The spike read the owner's copy of the map (`habitat_cog.tif`). Whether learners may read it too waits on the owner (§5, §8): its version is unconfirmed, and its downloads are billed to the owner. The same SQL works on any copy that PostGIS can reach, with that copy's path in `ST_AddBand`: critwire's clip of Costa Rica, if critwire hosts it (§5), or your own download of Jung's version 004 from Zenodo (CC BY 4.0), which is on a longitude–latitude grid (EPSG:4326): skip the `ST_Transform` and use that file's origin and cell size, which `ST_MetaData` shows.

critwire's lesson database already holds that clip (`habitat_clips`, from `pg-setup`), stored in the database. A stored raster knows its own grid, so `ST_Value` needs only the point, in the raster's coordinate system. Cells outside Costa Rica's outline are nodata, so a point at sea gives `NULL`:

```sql
-- q: s06-clip
-- status: spike-table
-- engine: postgis
WITH places (place, lon, lat) AS (
  VALUES ('San José', -84.08, 9.93), ('Tortuguero', -83.52, 10.54), ('Monteverde', -84.82, 10.30),
         ('Irazú summit', -83.85, 9.98), ('Pacific, off Nicoya', -85.80, 9.50)
)
SELECT p.place, v.habitat_code, h.name
FROM places AS p
CROSS JOIN habitat_clips AS c
CROSS JOIN LATERAL (SELECT ST_Value(c.rast, 1, ST_Transform(ST_SetSRID(ST_Point(p.lon, p.lat), 4326), 3857))::integer AS habitat_code) AS v
LEFT JOIN habitat_classes AS h ON h.code = v.habitat_code
WHERE c.clip = 'cr'
ORDER BY p.place;
```

```text
-- result: s06-clip · 5 rows · sha256 2d31564e64da
place | habitat_code | name
Irazú summit | 307 | Shrubland – Subtropical/tropical high altitude
Monteverde | 109 | Forest – Subtropical/tropical moist montane
Pacific, off Nicoya | NULL | NULL
San José | 1405 | Urban Areas
Tortuguero | 106 | Forest – Subtropical/tropical moist lowland
```

Mission D gives every published occurrence record a class this way (`occurrences.habitat_code`, lesson 22), from Jung's 1 km layers rather than a 100 m cell, since a record's position is rarely that precise.

**Shown as:** tables.

**Your turn:** For the same five places, add the first-level class each class belongs to: `place`, `habitat_code`, `name` and `level1_name` (the name of the class `level1_code` points at), in place order. A place at sea keeps its row.

```sql
-- q: s06-ex
-- status: spike-table
-- engine: postgis
WITH places (place, lon, lat) AS (
  VALUES ('San José', -84.08, 9.93), ('Tortuguero', -83.52, 10.54), ('Monteverde', -84.82, 10.30),
         ('Irazú summit', -83.85, 9.98), ('Pacific, off Nicoya', -85.80, 9.50)
)
SELECT p.place, v.habitat_code, h.name, l1.name AS level1_name
FROM places AS p
CROSS JOIN habitat_clips AS c
CROSS JOIN LATERAL (SELECT ST_Value(c.rast, 1, ST_Transform(ST_SetSRID(ST_Point(p.lon, p.lat), 4326), 3857))::integer AS habitat_code) AS v
LEFT JOIN habitat_classes AS h ON h.code = v.habitat_code
LEFT JOIN habitat_classes AS l1 ON l1.code = h.level1_code
WHERE c.clip = 'cr'
ORDER BY p.place;
```

```text
-- result: s06-ex · 5 rows · sha256 c8576c83d96c
place | habitat_code | name | level1_name
Irazú summit | 307 | Shrubland – Subtropical/tropical high altitude | Shrubland
Monteverde | 109 | Forest – Subtropical/tropical moist montane | Forest
Pacific, off Nicoya | NULL | NULL | NULL
San José | 1405 | Urban Areas | Artificial - Terrestrial
Tortuguero | 106 | Forest – Subtropical/tropical moist lowland | Forest
```

**Check:** `result, in order`.

**Runs in:** your own PostGIS

**Evidence:** `out/e2-point/` (PostGIS out-db, geotiff.js and TiTiler agree on 10 points over 5 runs; bytes and times per read), `out/e4-clip/` (the clip equals the full map cell for cell inside the outline), `queries.log`

### Spatial lesson 7 · zonal

**Concept:** zonal statistics: counting a raster's cells by value inside a polygon (`ST_Clip`, `ST_ValueCount`); which cells count (the centre rule); from cells to an estimated area; an overview is a sample. **Question:** What covers the land inside an outline, and how much of each?

`ST_Clip(rast, polygon)` keeps the cells whose **centre** lies inside the polygon and makes the rest nodata; `ST_ValueCount` then counts the cells of each value, nodata left out. Both run on the out-db grid of lesson 6, now one window over the polygon's bounding box instead of one cell. The zone is a circle of 3 km around the point near Manaus, drawn on the ellipsoid (a `geography` buffer) and then put on the map's grid. Its cells are near the equator, so one cos φ at the point serves for all of them:

```sql
-- q: s07
-- status: ran
-- engine: postgis
WITH grid (x0, y0, size) AS (
  VALUES (-20037508.342789244::float8, 20037508.342789248::float8, 103.02166779498629::float8)
), zone AS (
  SELECT ST_Transform(ST_Buffer(ST_SetSRID(ST_Point(-60.0, -3.0), 4326)::geography, 3000)::geometry, 3857) AS geom
), box AS (
  SELECT geom, x0, y0, size,
         floor((ST_XMin(geom) - x0) / size) AS col0, ceil((ST_XMax(geom) - x0) / size) AS col1,
         floor((y0 - ST_YMax(geom)) / size) AS row0, ceil((y0 - ST_YMin(geom)) / size) AS row1
  FROM zone CROSS JOIN grid
), window_ AS (
  SELECT geom,
         ST_AddBand(ST_MakeEmptyRaster((col1 - col0)::integer, (row1 - row0)::integer, x0 + col0 * size, y0 - row0 * size,
                                       size, -size, 0, 0, 3857),
                    '/vsicurl/https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif', ARRAY[1], 1, 0) AS rast
  FROM box
)
SELECT vc.value AS habitat_code, vc.count AS cells,
       round((vc.count * (103.02166779498629 * cos(radians(-3.0))) ^ 2 / 1e6)::numeric, 2) AS est_km2
FROM window_ CROSS JOIN LATERAL ST_ValueCount(ST_Clip(rast, geom)) AS vc
ORDER BY cells DESC, habitat_code;
```

```text
-- result: s07 · 6 rows · sha256 89f0e1658427
habitat_code | cells | est_km2
1405 | 1913 | 20.25
406 | 378 | 4.00
306 | 222 | 2.35
106 | 140 | 1.48
1401 | 7 | 0.07
… 1 more row
```

The estimates add up to nearly the circle's own area, π × 3² ≈ 28.3 km²; the difference is the edge, where a cell counts whole or not at all.

A country is the same query with its outline as the zone. critwire's clip of Costa Rica is stored, so this reads no file. Costa Rica spans a few degrees of latitude, so one cos φ, at the outline's middle, is within a fraction of a percent of correcting row by row (`out/e3-zonal/`). The classes with the most land, with their names:

```sql
-- q: s07-clip
-- status: spike-table
-- engine: postgis
WITH zone AS (
  SELECT ST_Transform(geom, 3857) AS geom, radians(ST_Y(ST_Centroid(geom))) AS lat
  FROM country_shapes
  WHERE country_code = 'CR'
), counts AS (
  SELECT vc.value::integer AS habitat_code, vc.count AS cells, zone.lat
  FROM habitat_clips AS c
  CROSS JOIN zone
  CROSS JOIN LATERAL ST_ValueCount(ST_Clip(c.rast, zone.geom)) AS vc
  WHERE c.clip = 'cr'
)
SELECT k.habitat_code, h.name, k.cells,
       round((k.cells * (103.02166779498629 * cos(k.lat)) ^ 2 / 1e6)::numeric) AS est_km2,
       round((100.0 * k.cells / sum(k.cells) OVER ())::numeric, 1) AS share_pct
FROM counts AS k
JOIN habitat_classes AS h ON h.code = k.habitat_code
ORDER BY k.cells DESC, k.habitat_code
LIMIT 6;
```

```text
-- result: s07-clip · 6 rows · sha256 57c95610d8de
habitat_code | name | cells | est_km2 | share_pct
1401 | Arable Land | 1583248 | 16300 | 31.7
109 | Forest – Subtropical/tropical moist montane | 1278346 | 13161 | 25.6
106 | Forest – Subtropical/tropical moist lowland | 699066 | 7197 | 14.0
201 | Savanna - Dry | 352517 | 3629 | 7.1
105 | Forest – Subtropical/tropical dry | 223842 | 2304 | 4.5
… 1 more row
```

Counting every cell is exact for the map but slow for a large country at full resolution (a whole country can be hundreds of millions of cells). An overview is quicker, but it is a **sample**: the map's ÷8 overview keeps one full-resolution cell from each 8 × 8 block (nearest-neighbour), so each of its cells stands for 64 that weren't looked at. `ST_Rescale` with `'NearestNeighbor'` makes the same kind of sample from the clip. The largest classes keep their shares closely; the smaller a class, the further its sampled share wanders, in either direction:

```sql
-- q: s07-sample
-- status: spike-table
-- engine: postgis
WITH zone AS (
  SELECT ST_Transform(geom, 3857) AS geom FROM country_shapes WHERE country_code = 'CR'
), clip AS (
  SELECT rast FROM habitat_clips WHERE clip = 'cr'
), full_res AS (
  SELECT vc.value::integer AS habitat_code, vc.count AS cells
  FROM clip CROSS JOIN zone CROSS JOIN LATERAL ST_ValueCount(ST_Clip(clip.rast, zone.geom)) AS vc
), sampled AS (
  SELECT vc.value::integer AS habitat_code, vc.count AS cells
  FROM clip CROSS JOIN zone
  CROSS JOIN LATERAL ST_ValueCount(ST_Clip(ST_Rescale(clip.rast, 8 * ST_PixelWidth(clip.rast), -8 * ST_PixelWidth(clip.rast), 'NearestNeighbor'), zone.geom)) AS vc
), shares AS (
  SELECT f.habitat_code,
         100.0 * f.cells / sum(f.cells) OVER () AS full_pct,
         100.0 * coalesce(s.cells, 0) / sum(s.cells) OVER () AS sample_pct
  FROM full_res AS f
  LEFT JOIN sampled AS s USING (habitat_code)
)
SELECT habitat_code,
       round(full_pct::numeric, 2) AS full_pct,
       round(sample_pct::numeric, 2) AS sample_pct,
       round((100 * (sample_pct - full_pct) / full_pct)::numeric) AS change_pct
FROM shares
ORDER BY full_pct DESC, habitat_code;
```

```text
-- result: s07-sample · 35 rows · sha256 e2b2d413056b
habitat_code | full_pct | sample_pct | change_pct
1401 | 31.66 | 31.74 | 0
109 | 25.57 | 25.53 | 0
106 | 13.98 | 13.96 | 0
201 | 7.05 | 6.99 | -1
105 | 4.48 | 4.49 | 0
… 30 more rows
```

That is why critwire's published habitat areas (`country_habitats.est_area_km2`, lessons 22–23) come from Jung's 1 km layers, which record the share of each class inside every cell rather than one class per cell, and why they are labelled estimated: each method has a measured error, largest for small classes (§5, `out/e3c-methods/`).

**Shown as:** tables.

**Your turn:** How much of Costa Rica's land does the map give to forest of any kind? Add up the estimated km² of `100` ("Forest") and every class under it (`COALESCE`, lesson 22), using the outline's middle latitude as `s07-clip` does: one column, `forest_km2`, rounded to a whole km².

```sql
-- q: s07-ex
-- status: spike-table
-- engine: postgis
WITH zone AS (
  SELECT ST_Transform(geom, 3857) AS geom, radians(ST_Y(ST_Centroid(geom))) AS lat
  FROM country_shapes
  WHERE country_code = 'CR'
)
SELECT round((sum(vc.count) * (103.02166779498629 * cos(zone.lat)) ^ 2 / 1e6)::numeric) AS forest_km2
FROM habitat_clips AS c
CROSS JOIN zone
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(c.rast, zone.geom)) AS vc
JOIN habitat_classes AS h ON h.code = vc.value::integer
WHERE c.clip = 'cr' AND COALESCE(h.level1_code, h.code) = 100
GROUP BY zone.lat;
```

```text
-- result: s07-ex · 1 row · sha256 99cd689799fd
forest_km2
23445
```

**Check:** `result`.

**Runs in:** your own PostGIS

**Evidence:** `out/e3-zonal/` (the out-db zonal read for TT and AX: identical counts cold and warm, bytes against the tile lower bound, areas four ways), `out/e3b-overviews/` (overview reads), `out/e3c-methods/` (full resolution, ÷8 and ÷16 samples and Jung's 1 km fractions per class, with their errors), `queries.log`

### Spatial lesson 8 · browser-clip

**Concept:** a Cloud-Optimized GeoTIFF (COG): tiles and overviews that a reader fetches by HTTP range requests; reading a window of a raster in the browser with geotiff.js; from longitude and latitude to a cell. **Question:** Can a browser read the habitat map without downloading it?

DuckDB has no raster type, so the browser reads the habitat map with a JavaScript library, **geotiff.js**. A COG keeps its cells in square tiles of 256 × 256 and starts with an index of where each tile is, followed by the same for each overview. `fromUrl` reads the header and that index; `getImage(i)` picks the full resolution (`0`) or an overview (`1` to `5`); `readRasters({ window })` fetches only the tiles under the window, each by one range request. The clip of Costa Rica is 1.4 MB, and a window of 256 × 256 cells costs a few tens of kilobytes (`out/e4-browser/`).

This is JavaScript for the lesson page, not SQL (the clip's address is the spike's; mission D publishes its own, §5):

```js
import { fromUrl } from "geotiff";

const tiff = await fromUrl("/learn/spike-data/cr.cog.tif", { allowFullFile: false }); // never the whole file
const image = await tiff.getImage(0); // full resolution; 1–5 are the overviews

// Longitude and latitude → Web Mercator metres → the clip's column and row.
const [lon, lat] = [-84.2, 10.1];
const x = (lon * 20037508.342789244) / 180;
const y = 6378137 * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
const [x0, y0] = image.getOrigin(); // the clip's top-left corner
const [dx, dy] = image.getResolution(); // 103.02 m, and −103.02 m (rows run south)
const col = Math.floor((x - x0) / dx) - 128;
const row = Math.floor((y - y0) / dy) - 128;

// The 256 × 256 cells around the point, and how many of each class.
const [band] = await image.readRasters({ window: [col, row, col + 256, row + 256], samples: [0] });
const counts = new Map();
for (const code of band) counts.set(code, (counts.get(code) ?? 0) + 1);
console.log(col, row, [...counts].sort((a, b) => b[1] - a[1]));
```

The spike ran this page in headless Chromium, on a desktop profile and at a quarter of the CPU (a Chromebook's stand-in): every request was a range request, the page never fetched the whole clip, and its counts equalled those of geotiff.js in Node and of PostGIS for the same cells (`out/e4-browser/`). The window starts at column 3025, row 1092 of the clip.

The clip has to be served by critwire, or by any host that answers range requests and allows the page's origin (CORS). The owner's full map can't be read this way today, because its bucket sends no CORS headers; that choice is the owner's (§5, §8).

**Shown as:** a picture of the window (one colour per class) and a table of classes with their cells and shares.

**Your turn:** Check the page against the database: count the classes of the same window in PostGIS. The window's corners are the clip's cells (column 3026, row 1093) and (3282, 1349) in PostGIS's numbering, which starts at 1; `ST_RasterToWorldCoord` gives a cell's top-left corner. Show `habitat_code` and `cells`, most first, ties by `habitat_code`; nodata counts as `0`.

```sql
-- q: s08-ex
-- status: spike-table
-- engine: postgis
WITH clip AS (
  SELECT rast FROM habitat_clips WHERE clip = 'cr'
), box AS (
  SELECT rast,
         ST_MakeEnvelope((ST_RasterToWorldCoord(rast, 3026, 1093)).longitude, (ST_RasterToWorldCoord(rast, 3282, 1349)).latitude,
                         (ST_RasterToWorldCoord(rast, 3282, 1349)).longitude, (ST_RasterToWorldCoord(rast, 3026, 1093)).latitude,
                         3857) AS geom
  FROM clip
)
SELECT vc.value::integer AS habitat_code, vc.count AS cells
FROM box CROSS JOIN LATERAL ST_ValueCount(ST_Clip(rast, geom), 1, false) AS vc
ORDER BY cells DESC, habitat_code;
```

```text
-- result: s08-ex · 11 rows · sha256 cade1a7f5771
habitat_code | cells
109 | 22928
1401 | 19448
1405 | 9938
307 | 8072
1403 | 3786
… 6 more rows
```

**Check:** `result, in order` (the page's table has the same classes and cells, nodata as `0`).

**Runs in:** browser (geotiff.js); the check in your own PostGIS

**Evidence:** `out/e4-clip/` (the clip cut by PostGIS and validated as a COG), `out/e4-browser/` (desktop and 4× CPU runs: range requests only, bytes, times, memory, screenshots), `queries.log` (`s08-ex`)

## 5. The habitat raster

The owner's COG (`https://habitat-cog.s3.us-east-2.amazonaws.com/habitat_cog.tif`) is one worldwide band of habitat class codes in Web Mercator, 388,996 cells a side at 103.02 m, with ten nearest-neighbour overviews (÷2 to ÷1024), 3.64 GB (`out/cog/`, `out/tile-bytes/`). This section says which map it is and what that allows, how browsers and learners could reach it, what each way of summarizing it gets wrong, and how mission D turns it into committed data. Every figure below names the spike run it comes from; every area is **estimated**.

### Which map it is: Jung et al. 2020, level 2, version unconfirmed

**Level 2.** The overviews hold level-2 codes (106 "Forest – Subtropical/tropical moist lowland", 1403 "Plantations") beside level-1 codes where Jung's tree stops at level 1 (100, 500, 900, 1200), so it is the level-2 map (`out/jung/`, ÷256 and ÷1024 overviews). Marine classes (9xx, 12xx) are in it too. The Costa Rica clip shows the same split, read in PostGIS from the clip and joined to v004's legend (`habitat_classes`, §2):

```sql
-- q: r01
-- status: spike-table
-- engine: postgis
SELECT CASE WHEN h.code IS NULL THEN 'not in v004''s legend'
            WHEN h.level1_code IS NULL THEN 'level 1 only'
            ELSE 'level 2' END AS level,
       count(*) AS classes,
       sum(vc.count) AS cells
FROM habitat_clips AS c
CROSS JOIN LATERAL ST_ValueCount(c.rast, 1, true) AS vc
LEFT JOIN habitat_classes AS h ON h.code = vc.value::integer
WHERE c.clip = 'cr'
GROUP BY 1
ORDER BY 1;
```

```text
-- result: r01 · 2 rows · sha256 477d100c7c2a
level | classes | cells
level 1 only | 5 | 65520
level 2 | 30 | 4934695
```

**Version: only 004 is left, and that isn't proof.** Jung's Zenodo concept has six versions. The spike read each one's level-2 code list (`styles/level2.clr`) and its level-2 composite's header, inflated from the zip by range requests, never the 2.3–2.5 GB bodies (`out/jung/`, 9.3 MB from Zenodo and S3 together):

| version | license | against the COG | why |
|---|---|---|---|
| 001, 001_full | CC BY-NC 4.0 | excluded | its code list lacks 11 codes the COG holds (900, 908, 909, 1101–1106, 1200, 1206); `int16`, the COG `uint16` |
| 002 | CC BY-NC 4.0 | excluded | lacks the same 11 codes |
| 002_v2, 003 | CC BY 4.0 | excluded | lack the same 11 codes |
| 004 | CC BY 4.0 | **not excluded** | codes, data type and nodata agree |

A class code that a version never assigns can't appear in a file made from it, so the exclusions are firm, and every non-commercial version is among them. "Not excluded" is weaker: it says nothing about which file the COG was made from, or how it was reprojected to Web Mercator and resampled. The COG's own metadata names no version, and Critter Connect's repository records none (plan F3). So the COG's provenance is **unconfirmed** (`out/jung/gate.md`).

**The gate (what mission D may publish).**
- **Confirmed** means the owner states which Zenodo version and file the COG was made from, and how it was reprojected and resampled, and that version isn't excluded above. Only then may D publish anything cut or computed from the COG, or send learners to the bucket, credited "Jung et al. 2020, version 00X, reprojected to EPSG:3857 by <who>".
- **Until then** everything critwire publishes from the habitat map comes from **version 004 by URL**: Zenodo record 4058819, CC BY 4.0, each file's md5 checked against the record. That is D's default, so D never waits on the answer (§8).
- The spike read the COG for research only; its clip stays in the spike folder.

**The credit** (Zenodo: "Please cite the published paper and state the used version of the habitat map"; `out/jung/gate.md`): Jung, M., Dahal, P.R., Butchart, S.H.M., Donald, P.F., De Lamo, X., Lesiv, M., Kapos, V., Rondinini, C., Visconti, P. (2020). A global map of terrestrial habitat types. *Scientific Data* 7, 256. https://doi.org/10.1038/s41597-020-00599-8. Version 004, https://doi.org/10.5281/zenodo.4058819 (CC BY 4.0). It goes in `scripts/build/sources.ts` with the fields it covers (`habitat_classes.name`, `country_habitats.est_area_km2`, `occurrences.habitat_code`, any clip), with critwire's method note beside the computed fields (§2, "Every new table and derived field names its credit"). Class names come from v004's legend (`IUCN_mapping_legend.xlsx` in its code zip), never from iucnredlist.org. Jung's map assigns IUCN's habitat *classes* to places; it is not Red List data (§6).

### How browsers and learners reach it: four options

Browsers can't read the owner's bucket today: S3 answers range requests (206) but sends no CORS headers, and a preflight from `https://critwire.com` gets 403 (plan F7). A learner's own PostGIS needs no CORS: it reads over `/vsicurl/` from the server side. Bytes per learner are measured for one full-resolution and one ÷8 window of 256 × 256 cells around a point in Costa Rica, cold, the reads lesson 8's page makes.

| | (a) bucket CORS | (b) critwire hosts clips | (c) summaries only | (d) the owner's TiTiler |
|---|---|---|---|---|
| **what** | the owner adds a CORS rule to the bucket; pages read the full COG with geotiff.js | small regional COG clips, served by critwire's Caddy; pages read them with geotiff.js | `country_habitats` and `occurrences.habitat_code`, plain tables in the core engine | pages call TiTiler's `/cog/point` and `/cog/statistics` on the owner's AWS |
| **disk on critwire** | none | a few MB: the Costa Rica clip is 1.42 MB for 30.6 M cells (`out/e4-clip/`); clips are committed, so each refresh adds to the repository's history | KB: one row per country and class | none |
| **bytes per learner** | 195,447 B from S3, billed to the owner (`out/e4-s3/`); geotiff.js reads only the tile-index entries it needs (264 B of IFD 0's 6.9 MB index at full resolution) | 84,240 B of the clip in 27 range requests; 188,670 B with the page and its geotiff.js bundle (`out/e4-browser/`) | the table rows, inside the page's normal data | 74–76 B of JSON per point (`out/e2-point/`); TiTiler's own S3 reads are on the owner's AWS, unseen |
| **work** | the owner: one rule (`AllowedOrigins https://critwire.com`, `AllowedMethods GET HEAD`, `AllowedHeaders Range`, `ExposeHeaders Content-Range Content-Length ETag Accept-Ranges`); D: lesson 8's page pointed at S3. Only after the gate | D: clips as `ingest habitat` output (below), validated as E4's was; lesson 8's page | D: `pnpm ingest habitat` (below) | the owner keeps a server running; D: a client for it |
| **Chromebook (4× CPU)** | the same reader as (b), plus S3's latency | **measured**: done 2.1 s after navigation, peak renderer memory 154–162 MB of A1's 700 MB budget; school Wi-Fi 3.2 s, slow 4G 5.3 s computed from bytes (`out/e4-browser/`) | the core engine's page, without the spatial extension (002 §1) | light for the browser; a point answered in 84 ms median, 172 ms at most (`out/e2-point/`), `/cog/info` 4.08 s on a cold start (plan F7) |
| **against it** | egress on the owner's bill for every learner; blocked by the gate until provenance is confirmed | clips must be cut and committed; lessons cover only the clipped places | no map to look at, only numbers | a server outside critwire; zonal statistics only from overviews: full resolution returned HTTP 500, `max_size=1024` resampled to about 150–170 m (`out/e3-zonal/`) |

**(b), where the clips come from.** If the owner confirms the COG's provenance, D cuts clips from it the way E4 did: `ST_AsGDALRaster(ST_Clip(…), 'COG', …)` over an out-db window, 2.33 MB of S3 and 3.9 s for Costa Rica, byte-identical over repeated cuts, validated as a COG with nearest-neighbour overviews (`out/e4-clip/`). Otherwise D cuts them from v004's 100 m composite, a one-off 2.45 GB download outside the repository (one DEFLATE member in the zip, so no range access; plan F3). Those clips are on v004's longitude–latitude grid (EPSG:4326, 0.000898°), so lesson 8's page drops its Web Mercator arithmetic for a plain longitude and latitude step. A full copy of the COG on critwire (3.64 GB) isn't a clip: `dist/` is copied on every build, and a route outside it is a control-room change, so it isn't offered.

**Learners' own PostGIS** (§4 lessons 5–7) reads one of three sources over `/vsicurl/`: critwire's clip (at most the clip's size, served with range support: every request in `out/e4-browser/` was a 206 without `Content-Encoding` under the live block's `encode zstd gzip`); their own v004 download from Zenodo; or the owner's COG, only after the gate and only if the owner accepts the egress (§8). From the COG a cold point read costs 58–91 KB and a small country's zonal statistics 292–358 KB (`out/e2-point/`, `out/e3-zonal/`).

### Summaries: three methods and what each gets wrong

A per-country summary is "how much of each class lies inside the outline". E3c computed it three ways for Trinidad and Tobago (TT, 10.6° N) and Åland (AX, 60.2° N), whose outlines are Natural Earth's 1:10m, against the outline's own area on the ellipsoid (`ST_Area(geom::geography)`) (`out/e3c-methods/`):

| method | resolution | rule | whole outline | classes ≥ 1 % of the outline | classes under 1 % |
|---|---|---|---|---|---|
| 1. COG, full resolution | 103.02 m, EPSG:3857 | cells whose centre is inside × (103.02 m · cos φ of the cell's row)² | sphere +0.6 % / −0.3 %; on the ellipsoid within 0.01 % | the reference for 2 and 3 | the reference |
| 2. COG overview ÷8 / ÷16 | 824 m / 1,648 m | the same over the overview's cells, × k²: a nearest overview keeps one 100 m cell per k × k block, a 1-in-64 or 1-in-256 **sample** | within 0.2 % of method 1 | ÷8 −21.2 % to +13.8 %; ÷16 −28.2 % to +66.6 % | lost or doubled: TT's 1206 and 1207 vanish (−100 %), TT's 505 at ÷16 +276 % |
| 3. v004 1 km fractions | 0.0099157° (about 1.1 km), EPSG:4326 | cells whose centre is inside: Σ fraction ÷ 1000 × the cell's area on the ellipsoid | TT −0.1 %, AX +0.3 % of method 1 | within ±2.2 %, except TT's 900 "Marine – Neritic" +12.5 % and AX's 909 "Marine – Seagrass" +13.9 %, each with three quarters of its area in border cells | within ±10 % but two: TT's 908 "Coral Reefs" −19.6 %, TT's 909 0.07 → 1.30 km² (all in border cells) |

What the table says:
- **Method 1** is the best this COG allows, and still not "true area": it inherits the COG's unrecorded reprojection, and worldwide it would mean 2.24 GB of the owner's egress and 151 G cells on two CPUs per refresh (`out/tile-bytes/`). Its nominal Mercator version, cells × 103.02², overstates TT by 3.4 % and AX four times over (`out/e3-zonal/`, lesson 5).
- **Method 2** gets the totals right and the classes wrong: a sample can't see small, thin or patchy classes (rivers, reefs, mangroves, towns), and it misses or doubles them by chance. It is never published as an area; lesson 7 shows it only as a sample.
- **Method 3** keeps the 100 m map's proportions inside each 1 km cell, so its error sits in the border cells, where a whole 1 km cell is counted in or out by its centre: 6.6 % of TT's area, 29.3 % of AX's (a small island country, so more border). Coastal and marine classes, which line the border, carry the largest errors. The fractional layers also hold an **overlay** of open-water classes (901, 1000–1004) laid over the seafloor classes; summed with the rest they'd add 7 % to TT and 30 % to AX, so the summary counts the partition only (plan Decisions, S7; `out/e3c-methods/`).

**The pick: method 3.** It comes from the identified, licensed release, needs none of the owner's egress, and its error is small and explainable where the numbers matter. Published areas are `est_area_km2`, labelled **estimated**, with the resolution and rule in the source entry; lessons compare classes and countries with them (§3, lessons 22–23), never quote them as measured.

### `pnpm ingest habitat` (mission D)

- **Input:** v004's `lvl2_frac_1km_ver004.zip` by its Zenodo URL (695,484,415 B, md5 `bd8508db8118f14d8da7bfa7950523d4`), downloaded whole into a temporary directory outside the repository, md5 checked against the record, deleted after. The outlines: the committed Natural Earth file, by sha256. Never the owner's COG, unless the gate is passed and D's plan says so.
- **Work:** for each of the 79 layers, decode in full-width bands of 256 rows (memory stays bounded; a whole layer is 659 M cells), keep the partition (drop the overlay classes 901, 1000–1004), and add fraction × the cell's area on the ellipsoid to every country whose outline holds the cell's centre. The same layers give each sampled occurrence its `habitat_code`: the partition class with the largest share of the record's 1 km cell (§2, `occurrences`).
- **Output, committed:** `data/raw/habitat/snapshot.json`, keys sorted, one UTC `retrieved`, with `source` (Zenodo record 4058819, version `004`, the file name, md5, `CC BY 4.0`), `method` (the resolution, EPSG:4326, Σ fraction × area on the ellipsoid, centre-in-outline, partition only, the rounding, the outlines' sha256, the GBIF snapshot's `retrieved`) and the values. Clips, if the owner picks (b), go in `data/raw/habitat/clips/<cc>.cog.tif` with their sha256 and the same provenance in the snapshot.
- **Derive** checks it and refuses it as stale (`run pnpm ingest habitat`) when the outlines' sha256 or the GBIF snapshot's `retrieved` differ, or a code isn't in `habitat_classes`. **Build** only loads the derived rows and copies the clips.
- **Cost per refresh, on this VPS:** 695,469,068 B from Zenodo in 223 s, one member at a time; decoding at 43 ms per million cells, about 28 s a layer, so about 37 minutes for all 79 on one thread, less where layers are empty: eleven are all-zero, 49–50 KB each (`out/e3c-methods/`). The outline test over every land cell isn't measured yet; D's architecture times it.
- **Tool:** the spike's path is geotiff.js in Node for the decode and PostGIS for the centre-in-outline sum (`ST_SetValues` into an in-db raster, then `ST_Clip`, checked against the centre mask on each polygon's largest class; `out/e3c-methods/`), because the Postgres server can't read files in the checkout (plan F12). An ingest through PostGIS runs F1's capability check and needs a superuser session or `GRANT SET ON PARAMETER` for its role, a control-room change. A Node-only path (DuckDB spatial for the outline test) avoids that but wasn't validated here; D's architecture picks from these timings.

**Why ingest, not build.** `pnpm build` is offline and loads only `data/` (`AGENTS.md`), and `deploy` runs it every time: a raster read in the build would tie every deploy to Zenodo or S3 and add the better part of an hour. Ingest fetches once, commits what it computed with its provenance, and derive's staleness check keeps the two in step, as for GBIF today.

### Recommendation

**(c) summaries, plus (b) a few clips on critwire, both from v004 by URL; no CORS on the bucket and no TiTiler.**
- (c) carries the lessons that need numbers (§3 lessons 22–23, the occurrence classes) with no server, nothing on the owner's bill, and the error measured above stated beside it.
- (b) gives the browser a real map (lesson 8) at under 200 KB per learner and well inside a Chromebook's memory, and gives learners' own PostGIS a source to read over `/vsicurl/` without the owner's bucket.
- (a) and (d) put every learner on the owner's AWS bill; (a) also waits on the gate, and (d) is a server outside critwire whose zonal statistics come from overviews.
- If the owner confirms the COG's provenance, D may cut the clips from the COG instead (2.33 MB of S3 per clip, on the grid lesson 8 already uses); nothing else changes. These are the owner's choices (§8).

## 6. IUCN

The owner has IUCN's range polygons and asked whether critwire could host some for teaching. It can't, and critwire's rule stays as `AGENTS.md` and `001-mvp.md` set it: critwire never stores, caches, proxies or serves IUCN data (ranges, categories, assessments), and keeps only each species' SIS taxon id, `ids.iucn`. This section quotes IUCN's terms, answers four cases from them, and drafts a request for a waiver that the owner may send. The lessons that use IUCN ranges run only in the learner's own PostGIS, on the learner's own download; critwire supplies the text, the SQL and the import commands, never the data.

### The terms, quoted

**Verified against the Internet Archive's copy of 2026-10-15** (snapshot `20261015190206`, saved 2026-10-22T21:56:05Z as `evidence/licenses/iucn/20261022T215605Z-terms-of-use-wayback-20261015190206.html`, sha256 `6271c8b6ceeb…`). The live page, `https://www.iucnredlist.org/terms/terms-of-use`, refuses this server (403 from Cloudflare, 2026-10-22T21:55:59Z), and the owner saved no copy. The capture is version 3.1 (June 2024). The spatial-data page is quoted from its newest readable capture, `20260516165500` (live page also 403). `licenses.ts --verify` checks every quote below against those saved pages.

What counts as Red List data (§1):

> For the purposes of this Agreement, IUCN Red List Data comprise all tabular, and all spatial and associated attribute data, contained within The IUCN Red List.

Who the license is for (§1):

> The rights and obligations concerning use of The IUCN Red List in accordance with this User Agreement are personal to you or to members of your household and are not transferable to any other person or entity.

No commercial use (§3), and §15's definition of it:

> Neither (a) IUCN Red List Data nor (b) any work derived from or based upon IUCN Red List Data (i.e., “Derivative Works”) may be put to Commercial Use without the prior written permission of IUCN.

> Commercial Use means a) any use by, on behalf of, or to inform or assist the activities of, a commercial entity (an entity that operates 'for profit') or b) use by any individual or non-profit entity for the purposes of revenue generation.

No reposting or redistribution (§4):

> All forms of reposting, and any sub-licensing, reselling, or other forms of redistribution of IUCN Red List Data in their original format, either whole or in part, alone or combined with other data, including within Derivative Works, are strictly prohibited without the prior written permission of IUCN.

> You may not repost, or redistribute to any third party, IUCN Red List Data in whole, or in part, by any means, including (but not limited to) electronic formats such as internet postings, web downloads, through web services including utilization of The IUCN Red List APIs, through interactive web maps that grant users download access, KML files or through file transfer protocols, electronic mailing, faxing, archiving in a public data, redistributing via a computer network, digital storage, memory stick or other electronic media or device, except as may otherwise be expressly permitted by IUCN in writing through a formal Waiver.

What you may do (§5):

> you are hereby granted a non-transferable license to use, download and print IUCN Red List, without requesting prior permission, solely for conservation or education purposes, scientific analyses, and research.

> Either an electronic copy or two paper copies of all reports, publications or other products published using IUCN Red List Data must be sent, free of charge, to IUCN

Citation (§6) and versions (§7):

> The recipient of the data will provide full acknowledgement and citation (which includes reference to the version of the IUCN Red List Data used) in any materials or publications derived in part or in whole from the data

> Unless required to do so for specific analyses, you should not use any version of the IUCN Red List Data after it has been superseded by a subsequent version.

Definitions (§15):

> Reposting involves publishing IUCN Red List Data in a largely unmodified form, in whole or in part, alone or combined with other data, by any means including (but not limited to) electronic formats such as a website or internet posting.

> Redistribution involves distributing or transmitting IUCN Red List Data to any third party, in whole or in part, by any means including (but not limited to) electronic formats such as web downloads, through web services such as APIs, through interactive web maps that grant users download access, KML files or file transfer protocols

> A Derivative Work is a new work that is based upon all, or part, of the IUCN Red List Data. To be considered a Derivative Work, the new work must be transformative and include originality on the part of the creator, otherwise it may simply be considered Reposting or Redistribution, depending on the way the new work is made available.

Since version 3 (May 2017), every derivative needs a waiver (§17):

> Section 4. Modified to indicate that permission Waivers must must now be sought for all Derivatives.

Contact (§16). The capture hides the e-mail address behind Cloudflare's obfuscation; the page's `data-cfemail` decodes to `redlist@iucn.org`.

> please contact the IUCN Red List Unit at: Red List Unit Biodiversity Assessment and Knowledge Team Centre for Science and Knowledge IUCN David Attenborough Building, Pembroke Street Cambridge CB2 3QZ, United Kingdom

The spatial-data page (capture `20260516165500`):

> The data are made freely available for non-commercial use, to help inform conservation planning and other non-commercial decision-making processes (see Terms and Conditions of Use).

> Polygons in Esri shapefile format, containing the known range of each species. Note that sometimes the range is incomplete.

One clause loosens the rule for categories (§3):

> IUCN warrants that you are free to view and query The IUCN Red List, and places no restrictions on use of the IUCN Red List Categories associated with each named taxonomic entity.

critwire still doesn't store categories. The rule is the owner's (the brief: "That rule stays"), and it is also the simpler one: a category changes with each Red List update, §7 asks users not to keep superseded versions, and a static file would go stale between builds. A learner who wants a category reads it at iucnredlist.org.

### Hosting the files

**Not allowed without a written waiver.** The range polygons and their attribute tables are Red List data (§1), and §4 forbids reposting or redistributing them "in whole, or in part, by any means", naming "web downloads", "web services" and "interactive web maps that grant users download access", "except as may otherwise be expressly permitted by IUCN in writing through a formal Waiver". A browser lesson that reads a range file from critwire.com fetches it to the learner's machine, so even a lesson-only file is a web download. A simplified or clipped polygon is still the data "in part". critwire's published files are CC0 and CC BY besides, and IUCN's terms can't sit inside either.

### Serving derived products

**Not allowed without a written waiver, either.** Anything critwire would compute from the ranges and publish (a species' countries inside its range, range area, the habitat mix inside a range, a map tile, a "records outside the range" count) is a work "based upon all, or part, of the IUCN Red List Data" (§15). If it is transformative it is a Derivative Work, which §4 covers by name ("including within Derivative Works") and which needs a waiver since version 3 (§17). If it isn't transformative, §15 counts it as reposting or redistribution. Either way, critwire can't publish it on its own say.

### Classroom use

**Education is a permitted use, but each learner needs their own copy.** §5 grants a license "solely for conservation or education purposes, scientific analyses, and research", so a class may use the data. The license is personal and not transferable (§1), and §4 forbids passing the data to "any third party" by e-mail, a computer network, "digital storage, memory stick" or any other medium. A teacher therefore can't hand out the files, put them on a shared drive or load them into a class database; each learner signs up and downloads them for themselves. The terms say nothing about showing a result on a screen in class. Publishing a map or table made from the data (on a class website, say) needs the citation with the version (§6), a copy sent to IUCN (§5), and, as a derivative, a waiver (§4).

### A learner's own download

**Allowed, on the learner's machine, for learning.** With their own free account, a learner may "use, download and print" the data for education (§5); the spatial page says the data are "freely available for non-commercial use". The conditions:
- non-commercial only (§3; "Commercial Use" includes any use "for the purposes of revenue generation");
- the files and anything made from them stay on the learner's machine: no sharing, posting or uploading (§4);
- cite the data with its version (§6), and use the current version (§7);
- anything the learner publishes from the data goes to IUCN as a copy (§5), and needs a waiver if it is a derivative (§4).

That is the only way critwire's IUCN lessons run: critwire's lesson text, SQL and import commands, the learner's own download, the learner's own PostGIS. critwire's side of the join is `species.iucn_id`, the SIS taxon id it already publishes.

### Lessons on your own download

These lessons run only in your own PostGIS, on IUCN range polygons you downloaded yourself with your own free account (§5 above). critwire never holds the files: the lessons give the text, the SQL and the import commands, and you bring the data. Everything you make from it stays on your machine (§4): don't share the file, upload it, or post a map or table made from it.

The lessons need the spatial track's tables (§4: `country_shapes`, `occurrences`, `habitat_classes`, `habitat_clips`) and critwire's animals with their countries with open records (`species`, `species_countries`), all in schema `learn_spatial`. Then load your download. IUCN's ranges come as Esri shapefiles; check the `.prj` file next to the `.shp` first. If it says `GCS_WGS_1984`, PostGIS's own `shp2pgsql` loads it as it is; otherwise `ogr2ogr` (GDAL) reads the `.prj` and reprojects to longitude and latitude on the way in:

```sh
# Your own download, into your own database. Never upload it or share it (IUCN terms, §1 and §4).
SHP=path/to/your/download.shp
shp2pgsql -s 4326 -I "$SHP" learn_spatial.iucn_download | psql -d my_db
# or, if the .prj isn't WGS 84 longitude-latitude:
ogr2ogr -f PostgreSQL PG:dbname=my_db "$SHP" -nln learn_spatial.iucn_download -lco GEOMETRY_NAME=geom -nlt PROMOTE_TO_MULTI -t_srs EPSG:4326
```

The file's column names are IUCN's, and they change. The spatial-data page (capture `20260516165500`, https://www.iucnredlist.org/resources/spatial-data-download) says:

> As of the 2023-1 update, the 'binomial' attribute has been renamed as 'sci_name'

> Any processes that refer to the 'binomial' attribute will need to be amended to 'sci_name'.

So the lessons never name IUCN's columns. One table, `my_ranges`, puts your file into the lessons' own columns: `iucn_id`, the SIS taxon id that critwire publishes as `species.iucn_id`; `name_in_file`, the name as your file spells it; and `geom`, one multipolygon per animal, since a species' range can come as several polygons, one for each part with a different distribution status. Your download's metadata document names the column that holds the taxon id; put it where the block says `taxon_id_column`, and use `binomial` for `sci_name` if your file is older than 2023-1. The join on `species` keeps only critwire's animals. If `ST_Union` stops at an invalid polygon, wrap `f.geom` in `ST_MakeValid`.

```sql
-- q: i01-import
-- status: untested: reads your own IUCN download, which critwire never holds
-- engine: postgis
DROP TABLE IF EXISTS learn_spatial.my_ranges;
CREATE TABLE learn_spatial.my_ranges AS
SELECT row_number() OVER (ORDER BY f.taxon_id_column)::integer AS range_id,
       f.taxon_id_column::integer AS iucn_id,
       min(f.sci_name) AS name_in_file,
       ST_Multi(ST_Union(f.geom))::geometry(MultiPolygon, 4326) AS geom
FROM learn_spatial.iucn_download AS f
JOIN learn_spatial.species AS s ON s.iucn_id = f.taxon_id_column::integer
GROUP BY f.taxon_id_column;
```

The blocks below were run on a stand-in, `example_ranges`, with the same columns: two rectangles critwire drew by hand, one over Costa Rica's Caribbean lowlands for the Red-eyed Tree Frog and one over the lakes south of Mexico City for the Axolotl, each labelled `synthetic`. They are made up, so their answers say nothing about the animals; on your own download, write `my_ranges` where the blocks say `example_ranges`.

### IUCN lesson 1 · ranges-join

**Concept:** joining someone else's file to critwire's by a shared id; why the key is the SIS taxon id, not a name or a column that can be renamed; an area on the ellipsoid, **estimated**. **Question:** Which of critwire's animals does your file have a range for, and how big is each range?

`species.iucn_id` holds each animal's SIS taxon id, the same number IUCN's files carry. Names make a weak key: a species can be renamed or moved to another genus, and the file's own name column was renamed in 2023-1. The id stays.

```sql
-- q: i01
-- status: spike-table
-- engine: postgis
SELECT s.id, s.common_name, s.scientific_name, r.name_in_file,
       round((ST_Area(r.geom::geography) / 1e6)::numeric) AS est_km2
FROM example_ranges AS r
JOIN species AS s ON s.iucn_id = r.iucn_id
ORDER BY s.id;
```

```text
-- result: i01 · 2 rows · sha256 d05ab4e25036
id | common_name | scientific_name | name_in_file | est_km2
6 | Red-eyed Tree Frog | Agalychnis callidryas | Agalychnis callidryas | 17447
74 | Axolotl | Ambystoma mexicanum | Ambystoma mexicanum | 233
```

A range is a polygon drawn by experts around where they judge the species lives; IUCN's page says "sometimes the range is incomplete". Its area is the area inside the line, not the area the animal uses: a frog's range includes the farmland and towns between its forests.

**Shown as:** tables.

**Your turn:** For each class, how many of critwire's animals are there, and how many of them have a range in the table? Columns `class`, `animals` and `with_range`, in class order.

```sql
-- q: i01-ex
-- status: spike-table
-- engine: postgis
SELECT s.class, count(*) AS animals, count(r.range_id) AS with_range
FROM species AS s
LEFT JOIN example_ranges AS r ON r.iucn_id = s.iucn_id
GROUP BY s.class
ORDER BY s.class;
```

```text
-- result: i01-ex · 3 rows · sha256 9885c20d1799
class | animals | with_range
Amphibia | 15 | 2
Mammalia | 50 | 0
Reptilia | 11 | 0
```

**Check:** `result, in order`.

**Runs in:** your own PostGIS

**Evidence:** `out/run-queries/` and `queries.log` (this lesson's blocks in PostGIS, on the synthetic stand-in)

### IUCN lesson 2 · records-against-range

**Concept:** comparing two kinds of evidence: records (where someone saw an animal) against a range (where experts judge it lives); a country outline that touches a range (`ST_Intersects`); a record outside a range (`ST_Covers`). **Question:** Which countries with open records lie outside the range, and which records?

critwire's `species_countries` lists the countries with open records of each animal: places where a record was made, after critwire's filters, not the native range. Comparing them with a range finds where the two disagree:

```sql
-- q: i02
-- status: spike-table
-- engine: postgis
SELECT s.common_name, sc.country_code,
       EXISTS (SELECT 1 FROM country_shapes AS c
               WHERE c.country_code = sc.country_code AND ST_Intersects(c.geom, r.geom)) AS touches_range
FROM example_ranges AS r
JOIN species AS s ON s.iucn_id = r.iucn_id
JOIN species_countries AS sc ON sc.species_id = s.id
ORDER BY s.common_name, touches_range DESC, sc.country_code;
```

```text
-- result: i02 · 12 rows · sha256 1d4741daf28b
common_name | country_code | touches_range
Axolotl | MX | true
Axolotl | CA | false
Axolotl | DE | false
Axolotl | NZ | false
Red-eyed Tree Frog | CR | true
… 7 more rows
```

A country outside the range isn't a mistake in either source by itself. The record may be of a captive or escaped animal, the animal may have been misidentified, or the range may be incomplete. Here most of the disagreement is the stand-in's doing: a rectangle drawn round part of Costa Rica leaves out most of the countries the frog lives in. On a real range, the Axolotl's records in Europe and Oceania are worth a look: it is kept as a pet far beyond the lakes it comes from.

**Shown as:** tables.

**Your turn:** Down to the records: for the Axolotl (`slug = 'axolotl'`), count its open records whose point lies outside its range, by the country the record names (`(none)` where it names none). Columns `country_code` and `records_outside`, most first, then by country.

```sql
-- q: i02-ex
-- status: spike-table
-- engine: postgis
SELECT coalesce(o.country_code, '(none)') AS country_code, count(*) AS records_outside
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
JOIN example_ranges AS r ON r.iucn_id = s.iucn_id
WHERE s.slug = 'axolotl'
  AND NOT ST_Covers(r.geom, ST_SetSRID(ST_Point(o.longitude, o.latitude), 4326))
GROUP BY o.country_code
ORDER BY records_outside DESC, country_code;
```

```text
-- result: i02-ex · 5 rows · sha256 6e5e6b74210a
country_code | records_outside
MX | 53
CA | 2
DE | 2
NZ | 2
UA | 1
```

The records come from the spatial track's sample (§4), which holds every open record of three animals; mission D's sample covers every animal. A country here that `species_countries` doesn't list was left out by critwire's country rules, which hold back a single record far outside an animal's main region as a likely captive (`AGENTS.md`, Countries); the point is still a record.

**Check:** `result, in order`.

**Runs in:** your own PostGIS

**Evidence:** `out/run-queries/` and `queries.log` (this lesson's blocks in PostGIS, on the synthetic stand-in), `out/e1-pip/` (the same records against country outlines)

### IUCN lesson 3 · habitat-in-range

**Concept:** zonal statistics with a range as the zone (spatial lesson 7's method); a raster that covers only part of the zone; shares and **estimated** areas; comparing a zone with its surroundings. **Question:** What covers the land inside a range, by the habitat map?

The habitat map (Jung et al. 2020, CC BY 4.0) isn't Red List data, so critwire's clip of it may sit beside your range. The query is spatial lesson 7's, with the range in place of the country outline. The clip covers Costa Rica only, so the parts of the rectangle in Nicaragua and at sea count no cells; on your own download of Jung's map, the whole range would count.

```sql
-- q: i03
-- status: spike-table
-- engine: postgis
WITH zone AS (
  SELECT ST_Transform(r.geom, 3857) AS geom, radians(ST_Y(ST_Centroid(r.geom))) AS lat
  FROM example_ranges AS r
  JOIN species AS s ON s.iucn_id = r.iucn_id
  WHERE s.slug = 'red-eyed-tree-frog'
), counts AS (
  SELECT vc.value::integer AS habitat_code, vc.count AS cells, zone.lat
  FROM habitat_clips AS c
  CROSS JOIN zone
  CROSS JOIN LATERAL ST_ValueCount(ST_Clip(c.rast, zone.geom)) AS vc
  WHERE c.clip = 'cr'
)
SELECT k.habitat_code, h.name, k.cells,
       round((k.cells * (103.02166779498629 * cos(k.lat)) ^ 2 / 1e6)::numeric) AS est_km2,
       round((100.0 * k.cells / sum(k.cells) OVER ())::numeric, 1) AS share_pct
FROM counts AS k
JOIN habitat_classes AS h ON h.code = k.habitat_code
ORDER BY k.cells DESC, k.habitat_code
LIMIT 6;
```

```text
-- result: i03 · 6 rows · sha256 4d97be867e2b
habitat_code | name | cells | est_km2 | share_pct
1401 | Arable Land | 288797 | 2967 | 30.1
109 | Forest – Subtropical/tropical moist montane | 273186 | 2807 | 28.5
106 | Forest – Subtropical/tropical moist lowland | 191248 | 1965 | 20.0
306 | Shrubland – Subtropical/tropical moist | 49618 | 510 | 5.2
1403 | Plantations | 43520 | 447 | 4.5
… 1 more row
```

A share of the range is not a share of where the animal lives: the map says what covers each cell, and the range says where the species is judged to occur, so the mix inside a range includes land the animal doesn't use. The numbers are a result made from the range, so they stay on your machine (§4).

**Shown as:** tables.

**Your turn:** Is the range more forested than the country around it? For two zones, the range (`'range'`) and Costa Rica's outline (`'Costa Rica'`), give the share of cells, in percent to one decimal, whose class is `100` ("Forest") or under it (`COALESCE`, lesson 22): columns `zone` and `forest_pct`, in zone order.

```sql
-- q: i03-ex
-- status: spike-table
-- engine: postgis
WITH zones (zone, geom) AS (
  SELECT 'range', ST_Transform(r.geom, 3857)
  FROM example_ranges AS r
  JOIN species AS s ON s.iucn_id = r.iucn_id
  WHERE s.slug = 'red-eyed-tree-frog'
  UNION ALL
  SELECT 'Costa Rica', ST_Transform(geom, 3857) FROM country_shapes WHERE country_code = 'CR'
)
SELECT z.zone,
       round((100.0 * sum(vc.count) FILTER (WHERE COALESCE(h.level1_code, h.code) = 100) / sum(vc.count))::numeric, 1) AS forest_pct
FROM zones AS z
CROSS JOIN habitat_clips AS c
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(c.rast, z.geom)) AS vc
LEFT JOIN habitat_classes AS h ON h.code = vc.value::integer
WHERE c.clip = 'cr'
GROUP BY z.zone
ORDER BY z.zone;
```

```text
-- result: i03-ex · 2 rows · sha256 d2ecfb4e37c6
zone | forest_pct
Costa Rica | 45.5
range | 52.2
```

**Check:** `result, in order`.

**Runs in:** your own PostGIS

**Evidence:** `out/run-queries/` and `queries.log` (this lesson's blocks in PostGIS, on the synthetic stand-in), `out/e4-clip/` (the clip equals the full map cell for cell inside the outline), `out/e3c-methods/` (the errors of counting cells)

### Draft permission request

For the owner to send if they choose (§8); sending it changes nothing until IUCN answers in writing. It asks for the narrowest waiver that would let Learn show ranges in the browser. Before sending, check that the facts in it are still true (free, no advertising, no fees) and that the live terms are still version 3.1; it goes to the §16 address.

```text
To: IUCN Red List Unit <redlist@iucn.org>
Subject: Request for a formal Waiver (Terms of Use, section 4): simplified ranges for free SQL lessons

Dear Red List Unit,

critwire (https://critwire.com) publishes open data on 76 animal species (mammals, amphibians and
turtles) for students aged 16 and over. Its Learn section teaches SQL and spatial analysis in the
browser. The site is free, carries no advertising, charges no fees and is not run for profit. It
keeps only each species' SIS taxon id and no Red List data.

Under section 4 of the Terms and Conditions of Use (version 3.1), we ask whether IUCN would grant a
formal Waiver for the following, and on what conditions:

1. Range polygons of those of our 76 species that IUCN maps, simplified to a tolerance you choose,
   served from critwire.com as a file that the lesson page loads into the learner's browser. We
   would not offer a separate download link, but a browser that loads a file holds a copy of it, so
   we are asking about that copy too.
2. Lesson results computed from those polygons and shown on the lesson page, for example the
   habitat mix inside a range or the countries with open occurrence records that lie outside it.

The files would carry the citation and the Red List version (section 6), be replaced at each Red
List update (section 7), and be kept apart from critwire's CC0 and CC BY files, under IUCN's terms.
We would send IUCN a copy of the lessons (section 5).

If a waiver isn't possible, our lessons will keep asking each learner to download the data with
their own account and use it locally, as section 5 allows.

Kind regards,
<the owner's name>, critwire
```

### The habitat map is not Red List data

Jung et al. 2020 (Zenodo 4058819, version 004) maps the classes of IUCN's Habitats Classification Scheme across the world from land-cover and climate layers. It uses IUCN's class names and codes but contains no Red List data: no species, ranges, categories or assessments. Its license is CC BY 4.0, quoted in §1 from its Zenodo record (`evidence/licenses/jung/`), and its class labels come from version 004's own legend, never from iucnredlist.org. So critwire may host clips and summaries of it, within §5's provenance gate for the owner's COG, and IUCN's terms above don't apply to it. The two only meet in the learner's own PostGIS, when a lesson asks for the habitat mix inside the learner's own range polygon.

## 7. The build missions

Two missions build this design, each with a ready-to-start brief in the ops format (Goal, Why, Scope, Definition of done, Decision rules, Notes):

| Mission | Brief | What it builds | Estimate |
|---|---|---|---|
| C | `plans/briefs/critwire-learn-c.md` | the non-spatial datasets §1 ranks top: AnAge, the Amniote database and AmphiBIO into `traits` and `species_traits`, Wikidata labels into `species_names`, Open Tree into `tree_nodes` if its id match works; their ingest, snapshots, derive rules and `/v1` files with attribution; the tables in `setup.sql`, the ERD, lessons 17–21 (§3), lesson 16's move to `my_traits` (Disagreements with 002); E2E | about 30–36 sessions |
| D | `plans/briefs/critwire-learn-d.md` | the spatial track: Natural Earth outlines as `country_shapes`, the occurrence sample drawn in `ingest gbif`, `pnpm ingest habitat` from v004 (`habitat_classes`, `country_habitats`, `occurrences.habitat_code`) with the provenance gate (§5), clips per the owner's raster choice, the self-hosted `spatial` extension, lessons 22–23, spatial lessons 1–8 (§4), IUCN lessons 1–3 as own-download pages (§6), the PostGIS lesson check with F1's capability check; E2E | about 34–40 sessions |

**What both assume B delivered** (B1 and B2, merged and live): `/v1/countries.*` (250 rows); the self-hosted engine and the `/learn/assets/duckdb-ext/v1.5.6/wasm_eh/` mirror; `setup.sql` (6 tables and the view); `site/learn/schema.mmd` with `pnpm erd` and the build's stale check; the 16 lessons (`lessons.json`, `site/learn/sql/`); the E2E harness; B2's cookbook, playground and game, and the Caddy headers if the owner approved them. Where B's plans record deviations from 002, B's code wins. D also assumes C's tables, lessons and the page engine's DECIMAL decoding.

**Order: C, then D.** C starts from `main` after B2 is merged and live; D starts after C is. C is small, open, non-spatial data on B's machinery and ships lessons soon; D adds the heavier parts (a second extension, geometry, a raster ingest, a GBIF refresh and possibly a new DOI) and uses C's tables only where lessons 22–23 do. Each brief's first comment says how to start it: copy it to `/srv/critter-ai/agent-state/missions/briefs/<date>-critwire-learn-<c|d>.md`, then `mission start critwire <that file>`. Both release themselves at the end (merge and `deploy critwire`), and both read §8's answers first: without one, they build its recommendation.

## 8. For the owner

Choices only the owner can make, each with a recommendation and its cost. Missions C and D read this section first; an answer overrides their brief, and without one they build the recommendation (§7). To answer, edit the brief before starting it, or tell the lead.

| # | Choice | Recommendation | Mission |
|---|---|---|---|
| 1 | Which datasets to add first | AnAge, Natural Earth admin-0, the GBIF sample | C, D |
| 2 | How browsers reach the raster | (c) summaries + (b) a few clips, from v004 | D |
| 3 | The COG's provenance | answer it if you know it; nothing waits on it | D |
| 4 | Learners' PostGIS reading your bucket | no: critwire's clip or their own v004 download | D |
| 5 | Committing the `spatial` extension | commit it, as B1 committed `parquet` | D |
| 6 | Publishing occurrence records | yes: a capped sample of open records | D |
| 7 | How `ingest habitat` gets raster rights in PostGIS | no grant: the VPS superuser socket, or a Node-only path | D |
| 8 | Sending the IUCN request | not now | none |
| 9 | WDPA, WorldClim and CHELSA | WDPA and WorldClim never hosted; CHELSA after D | after D |

**1. Datasets to add first: AnAge, Natural Earth admin-0 and the GBIF occurrence sample (§1).**
- **Why:** AnAge alone gives C its first trait lessons for all three classes; the outlines and the sample are what every spatial lesson stands on, and the habitat track joins through both. All three are open and fit pipelines critwire already has.
- **Cost:** AnAge is a 169 KB download and a small new ingest; the outlines are 1.21 MB (1:50m) and 7.35 MB (1:10m) of GeoParquet in the repository; the sample is drawn inside `ingest gbif` (item 6). C adds AmphiBIO, the Amniote database, Wikidata labels and, if its names match, Open Tree; D adds Jung v004. EltonTraits, COMBINE, ReptTraits and PanTHERIA wait unless a lesson lacks data.
- **Instead:** any reorder within the hostable rows of §1's table; the blocked rows (D16, D17) can't move up.

**2. How browsers reach the raster: (c) precomputed summaries plus (b) a few regional clips on critwire, both from v004 by URL (§5).**
- **Why:** no server, nothing on your AWS bill, and it works without the provenance answer (item 3). Lesson 8's map loads 84 KB of a clip (189 KB with its page and reader) and peaked at 162 MB of renderer memory at 4× CPU slowdown (`out/e4-browser/`).
- **Cost:** about 37 minutes of decoding and 695 MB from Zenodo per `ingest habitat` refresh, on the VPS, nothing in `deploy`; KB of summary rows; about 1.4 MB per clip, committed, so each refresh adds to the repository's history; a one-off 2.45 GB download, outside the repository, to cut clips from v004's composite. Summaries are estimates; §5 gives each method's measured error.
- **Instead:** (a) a CORS rule on your bucket: one rule for you, then 195 KB of S3 egress per learner per map view on your bill, and only after item 3 is answered. (d) your TiTiler: a server outside critwire, cold starts of about 4 s, Lambda costs, and zonal statistics only from overviews.

**3. The COG's provenance: answer it if you know it.**
- **What:** which Zenodo version and file of Jung et al. 2020 `habitat_cog.tif` was made from, and how it was reprojected to Web Mercator and resampled. The spike excluded every version but 004 (§5), which is not proof.
- **Why:** a confirmed v004 lets D cut clips from the COG (2.33 MB of S3 egress per clip) instead of downloading the 2.45 GB composite, and puts them on the grid lesson 8 already uses. A version other than 004 would mean nothing from the COG is ever published.
- **Cost:** none to answer. Without an answer D uses v004 by URL and loses nothing but that download.

**4. Learners' own PostGIS reading your bucket: no.**
- **Why:** spatial lessons 5–7 read over `/vsicurl/` from critwire's clip or the learner's own v004 download, which costs you nothing and needs no gate.
- **Cost of yes:** 58–91 KB of S3 egress per cold point read and 292–358 KB per small country's zonal statistics, per learner, on your bill (`out/e2-point/`, `out/e3-zonal/`), and only after item 3 is answered. It would let a lesson reach any place on Earth at 100 m, not only the clipped ones.

**5. The `spatial` extension: commit it to the repository, as B1 commits `parquet`.**
- **Why:** the build stays offline and the file is checked by its pin, with no new download step in `deploy`.
- **Cost:** 23.6 MB in git history per DuckDB version, and again at each upgrade (002 §10 item 11). The alternative, a pinned, sha256-checked fetch at install, keeps the history small but ties every fresh checkout to one more download.

**6. Publishing occurrence records: yes, a capped sample per animal of open records (CC0 1.0 and CC BY 4.0 only).**
- **Why:** the spatial joins (§4 lessons 1–4) and the habitat at a record (`occurrences.habitat_code`) need points. Each row keeps its license and dataset key, and every sampled record is one the derived-dataset DOI already counts.
- **Cost:** a new public file of a few hundred KB; a fresh `ingest gbif` in D, which may change the dataset counts and so need the usual DOI refresh (a new DOI, `AGENTS.md`), and may add `country-*` review items for you in `country-overrides.json`. Records are where an animal was seen or collected, not its range; every page says so.
- **Instead:** no points published; spatial lessons 1–4 then run only on learners' own GBIF downloads, and `occurrences.habitat_code` (the habitat at a record) goes.

**7. Raster rights for `ingest habitat` in PostGIS: no grant.**
- **What:** the spike's validated path counts habitat inside outlines in PostGIS, whose raster settings only a superuser may set (§4). An ordinary role needs `GRANT SET ON PARAMETER`, a control-room change.
- **Recommendation:** no grant. `ingest habitat` runs on the VPS as `critter-ai` over the socket, as the spike did, and never in `deploy`; or D's architecture takes the Node-only path if it validates it.
- **Cost:** the ingest runs only on the VPS (as `gbif:register` does). A grant would let it run elsewhere, at the cost of a standing permission on the scratch database's role.

**8. The IUCN request (§6): not now.**
- **Why:** the IUCN lessons need nothing from IUCN: they run on each learner's own download, which IUCN's terms allow. A waiver would make critwire serve non-open files under IUCN's terms beside its CC0 and CC BY ones, replaced at each Red List update, and would need an exception to critwire's no-IUCN rule (`AGENTS.md`).
- **Cost of sending:** one e-mail, the draft above, checked before sending. Nothing changes until IUCN answers in writing; if it grants a waiver, a later mission designs the files and their updates.

**9. WDPA, WorldClim and CHELSA.**
- **WDPA and WorldClim** stay learner-download only: their terms forbid redistribution (§1, D16, D17). Whether D adds one "your own download" lesson on protected areas: not in D; a later lesson can follow the IUCN lessons' pattern.
- **CHELSA** is CC0 and hostable: a `country_climate` table after D, when the spatial machinery exists. Cost: a later mission's ingest of a worldwide raster, like `ingest habitat`.

## Disagreements with 002

003 changes nothing in `002-learn.md`; where its design and 002's differ, the build missions follow this section.

- **Lesson 16's exercise moves to its own names.** 002's lesson 16 has learners create `traits` and `species_traits`, and 002 §2 "Room to grow" gives critwire's real trait tables the same names and shapes. Once mission C adds the real tables to the one setup every page runs, lesson 16's blocks fail with `Table with name "traits" already exists!` (and `"species_traits"`): the spike ran both after the grown setup and saw exactly that. The real tables keep 002's names, since nothing in 002's schema is renamed. Mission C moves the lesson and its exercise to `my_traits` and `my_species_traits`, and `l16-check` reads `table_name = 'my_species_traits'`. Its expected rows stay the same but one: `FOREIGN KEY (trait_name) REFERENCES my_traits("name")` instead of `… REFERENCES traits("name")` (the spike ran the renamed lesson, exercise and check). A grown-data lesson (§3) then sets the learner's design beside critwire's real tables.
- **Habitats: map classes, not species preferences.** 002 §2 "Room to grow" lists `habitats` + `species_habitats`. 003 has `habitat_classes` and `country_habitats` instead, and no species–habitat table: which habitats a species uses comes from IUCN's assessments, which are Red List data critwire never stores (§6). The honest version is `occurrences.habitat_code`, the habitat class at an open record's location.
- **Regions wait.** 002's `regions` + `country_regions` aren't in the grown schema. The candidates are ranked in §1 (Natural Earth's admin-1 regions, RESOLVE's ecoregions); `ecoregions` and `biomes` are designed in §2 but not built, and come after the habitat track.
- **The grown tables have their own setup for now.** 002 puts every new table in the same `setup.sql`. 003 keeps them in `setup-grown`, run after 002's `setup`, so 002's setup stays byte for byte as A1 left it while the grown tables are stand-ins; mission C merges `setup-grown` into `setup.sql` when it publishes the files.
- **One more kind of ERD line.** 002 §3's check ("What the check holds") accepts one-to-many lines only. The grown diagram adds `||--o|` for `country_shapes`, whose foreign key is also its primary key, and the check accepts it only on such a key and refuses a "many" line there (§2). Mission D, which adds `country_shapes`, ports that rule; mission C, the first to grow the diagram, ports the rule that 002's entities and lines stay unchanged.
