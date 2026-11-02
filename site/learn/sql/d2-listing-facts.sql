-- q: d2-listing-facts
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT l.origin, l.presence, count(*) AS listings, count(DISTINCT l.sourceKey) AS sources
FROM read_parquet('range-listings.parquet') AS l
JOIN species_taxonomy AS t ON t.species_id = l.speciesId
WHERE t.class = 'Mammalia'
GROUP BY l.origin, l.presence
ORDER BY listings DESC, l.origin, l.presence;
