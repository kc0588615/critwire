-- q: d4-one-transaction
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
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
WHERE species_id = 48 AND year >= 2000;
-- fails: null value in column "year"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND (year < 2000 OR year IS NULL);
-- fails: current transaction is aborted
SELECT count(*) FROM sightings;
ROLLBACK;
SELECT to_regclass('sightings') IS NULL AS nothing_left;
