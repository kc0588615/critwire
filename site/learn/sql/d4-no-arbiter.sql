-- q: d4-no-arbiter
-- status: ran
-- engine: postgis
-- after: d4-feed
-- expect: error there is no unique or exclusion constraint matching the ON CONFLICT specification
INSERT INTO sightings (occurrence_id, species_id, year)
SELECT id, species_id, year
FROM occurrences
WHERE species_id = 48 AND year >= 2020
ON CONFLICT (species_id, year) DO NOTHING;
