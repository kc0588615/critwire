-- q: s1-listed-conflicts
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
WITH mammal_rows AS (
  SELECT l.*
  FROM read_parquet('range-listings.parquet') AS l
  JOIN species_taxonomy AS t ON t.species_id = l.speciesId
  WHERE t.class = 'Mammalia' AND l.area IS NULL
), conflicts AS (
  SELECT speciesId, country
  FROM mammal_rows
  GROUP BY speciesId, country
  HAVING (count(*) FILTER (origin LIKE 'native%') > 0 AND count(*) FILTER (origin = 'introduced') > 0)
      OR (count(*) FILTER (presence = 'present') > 0 AND count(*) FILTER (presence = 'absent') > 0)
)
SELECT s.common_name AS animal, c.name AS country, m.origin, m.presence, m.source, m.url
FROM mammal_rows AS m
JOIN conflicts USING (speciesId, country)
JOIN species AS s ON s.id = m.speciesId
JOIN countries AS c ON c.code = m.country
ORDER BY s.id, m.country, m.origin, m.presence, m.sourceKey;
