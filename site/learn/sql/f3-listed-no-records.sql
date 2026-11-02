-- q: f3-listed-no-records
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT s.common_name AS animal, c.name AS country, l.origin, l.source
FROM read_parquet('range-listings.parquet') AS l
JOIN species AS s ON s.id = l.speciesId
JOIN countries AS c ON c.code = l.country
LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
WHERE l.sourceKey = 'mdd' AND l.presence = 'present' AND sc.species_id IS NULL
ORDER BY s.common_name, s.id, c.name, l.origin;
