# Data license

Code in this repo is MIT (`LICENSE`). Data critwire writes itself (records, traits in our own words, derived ranges) is [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/): use it freely, credit "critwire".

Third-party fields and photos keep their own license, recorded per record in `sources[]` and `photo.license`.

Country lists (`range.countriesWithOpenRecords`) are counted only from CC0 1.0 and CC BY 4.0 GBIF occurrence records. They state where open records exist, not a species' native range. The underlying records keep their publishers' licenses; critwire cites a GBIF derived-dataset DOI listing the contributing datasets (see `/v1/attribution.json`).

Range listings (`/v1/range-listings.{json,csv,parquet}`) state what named sources list about where an animal is native or introduced, not that it lives there. Each row's `license` column gives its values' license, CC0 1.0 or CC BY 4.0, and `source`, `doi` and `url` say whom to credit. GBIF checklist rows keep their dataset's license; Mammal Diversity Database rows are CC BY 4.0; `critwire curated` rows are critwire's own, CC BY 4.0: facts read from the reference in `url`, in our own words. That reference's text isn't copied and keeps its own terms.

critwire stores the IUCN Red List species id (`ids.iucn`, the SIS taxon id) so you can match its records, but no IUCN data. Get Red List data from IUCN with your own token, under their terms.

Three range-listings sources have ties to IUCN, stated plainly. The Mammal Diversity Database's paper says its data were "initially sourced from the IUCN, HMW, and CMW", and no row says which. The Global Register of Introduced and Invasive Species lists are published by the Invasive Species Specialist Group, a group of IUCN's Species Survival Commission; national experts write their rows. The Checklist of the mammals of Central Asia says it used IUCN, GBIF and Catalogue of Life for cross-checking. critwire keeps no Red List status from any of them, and reads no IUCN page for curated rows.
