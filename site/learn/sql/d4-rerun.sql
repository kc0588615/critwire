-- q: d4-rerun
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error duplicate key value violates unique constraint "sightings_pkey"
INSERT INTO sightings (occurrence_id, species_id, year, country_code)
SELECT id, species_id, year, country_code
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2019;
