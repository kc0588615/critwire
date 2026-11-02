-- q: f3-ex-listed
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT c.name AS country
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
JOIN countries AS c ON c.code = sc.country_code
WHERE s.common_name = 'Tiger'
  AND NOT EXISTS (SELECT 1 FROM read_parquet('range-listings.parquet') AS l
                  WHERE l.speciesId = sc.species_id AND l.country = sc.country_code)
ORDER BY c.name;
