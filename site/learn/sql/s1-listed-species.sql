-- q: s1-listed-species
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT s.common_name AS animal, l.source, count(*) AS listed,
       count(sc.species_id) AS with_records,
       count(*) - count(sc.species_id) AS no_records
FROM read_parquet('range-listings.parquet') AS l
JOIN species AS s ON s.id = l.speciesId
LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
WHERE l.sourceKey = 'mdd' AND l.presence = 'present'
GROUP BY s.id, s.common_name, l.source
ORDER BY no_records DESC, listed DESC, s.id;
