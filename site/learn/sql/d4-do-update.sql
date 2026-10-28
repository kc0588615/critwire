-- q: d4-do-update
-- status: ran
-- engine: postgis
-- after: d4-feed
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id = 48 AND year >= 2000
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
SELECT count(*) FILTER (WHERE inserted) AS inserted,
       count(*) FILTER (WHERE NOT inserted) AS updated
FROM upserted;
