-- q: d4-replace
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
DROP TABLE IF EXISTS sightings;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year IS NOT NULL;
COMMIT;
-- the same file, run again:
BEGIN;
DROP TABLE IF EXISTS sightings;
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year IS NOT NULL;
COMMIT;
SELECT count(*) AS sightings, count(DISTINCT xmin::text) AS written_by_transactions FROM sightings;
DROP TABLE sightings;
