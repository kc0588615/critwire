-- q: f1-ex
-- status: ran
SELECT id, common_name, gbif_id, ncbi_id, inaturalist_id, wikidata_id
FROM species
WHERE gbif_id IS NULL OR ncbi_id IS NULL OR inaturalist_id IS NULL OR wikidata_id IS NULL
ORDER BY id;
