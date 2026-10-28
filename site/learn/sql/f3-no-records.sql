-- q: f3-no-records
-- status: ran
SELECT s.id, s.common_name, s.range_status, s.gbif_id
FROM species AS s
LEFT JOIN occurrences AS o ON o.species_id = s.id
WHERE o.id IS NULL
ORDER BY s.id;
