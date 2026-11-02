-- q: s1-listed
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
WITH listed AS (
  SELECT l.source, sc.species_id IS NOT NULL AS has_records
  FROM read_parquet('range-listings.parquet') AS l
  LEFT JOIN species_countries AS sc ON sc.species_id = l.speciesId AND sc.country_code = l.country
  WHERE l.sourceKey = 'mdd' AND l.presence = 'present'
), recorded AS (
  SELECT NOT EXISTS (SELECT 1 FROM read_parquet('range-listings.parquet') AS l
                     WHERE l.speciesId = sc.species_id AND l.country = sc.country_code) AS on_no_listing
  FROM species_countries AS sc
  JOIN species_taxonomy AS t ON t.species_id = sc.species_id
  WHERE t.class = 'Mammalia'
)
SELECT source,
       count(*) AS listed,
       count(*) FILTER (WHERE has_records) AS with_records,
       round(100.0 * count(*) FILTER (WHERE has_records) / count(*), 1) AS pct,
       count(*) FILTER (WHERE NOT has_records) AS no_records,
       (SELECT count(*) FROM recorded) AS record_countries,
       (SELECT count(*) FROM recorded WHERE on_no_listing) AS on_no_listing
FROM listed
GROUP BY source;
