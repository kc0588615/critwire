-- q: d1-missing-ids
-- status: ran
SELECT count(*) AS species,
       count(*) - count(gbif_id) AS no_gbif_id,
       count(*) - count(col_id) AS no_col_id,
       count(*) - count(wikidata_id) AS no_wikidata_id,
       count(*) - count(inaturalist_id) AS no_inaturalist_id,
       count(*) - count(ncbi_id) AS no_ncbi_id
FROM species;
