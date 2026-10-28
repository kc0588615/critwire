-- q: d4-ex
-- status: ran
-- engine: postgis
-- after: d4-feed
CREATE TABLE sightings_runs (run integer PRIMARY KEY, inserted bigint NOT NULL, updated bigint NOT NULL);
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id IN (48, 51) AND year IS NOT NULL
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
INSERT INTO sightings_runs
SELECT 1, count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM upserted;
WITH upserted AS (
  INSERT INTO sightings AS s (occurrence_id, species_id, year, month, country_code)
  SELECT id, species_id, year, month, country_code
  FROM occurrences
  WHERE species_id IN (48, 51) AND year IS NOT NULL
  ON CONFLICT (occurrence_id) DO UPDATE
    SET month = EXCLUDED.month, country_code = EXCLUDED.country_code
    WHERE (s.month, s.country_code) IS DISTINCT FROM (EXCLUDED.month, EXCLUDED.country_code)
  RETURNING xmax = 0 AS inserted
)
INSERT INTO sightings_runs
SELECT 2, count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) FROM upserted;
SELECT run, inserted, updated, (SELECT count(*) FROM sightings) AS sightings_after
FROM sightings_runs
ORDER BY run;
