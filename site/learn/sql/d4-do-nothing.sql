-- q: d4-do-nothing
-- status: ran
-- engine: postgis
-- after: d4-feed
WITH added AS (
  INSERT INTO sightings (occurrence_id, species_id, year, country_code)
  SELECT id, species_id, year, country_code
  FROM occurrences
  WHERE species_id = 48 AND year >= 2000
  ON CONFLICT (occurrence_id) DO NOTHING
  RETURNING year
)
SELECT count(*) AS added, min(year) AS first_year FROM added;
