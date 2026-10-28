-- q: d1-synonyms
-- status: ran
SELECT id, slug, scientific_name, gbif_id
FROM species
WHERE gbif_id IN (2442885, 2440897, 5786560, 5786559)
ORDER BY id;
