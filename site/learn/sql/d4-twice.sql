-- q: d4-twice
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error cannot affect row a second time
INSERT INTO sightings AS s (occurrence_id, species_id, year, month)
SELECT id, species_id, year, month FROM occurrences WHERE species_id = 48 AND year >= 2020
UNION ALL
SELECT id, species_id, year, month FROM occurrences WHERE species_id = 48 AND year >= 2020
ON CONFLICT (occurrence_id) DO UPDATE SET month = EXCLUDED.month;
