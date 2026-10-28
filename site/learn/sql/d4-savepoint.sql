-- q: d4-savepoint
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
SAVEPOINT before_batch_2;
-- fails: null value in column "year"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND (year < 2000 OR year IS NULL);
ROLLBACK TO SAVEPOINT before_batch_2;
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year < 2000;
SELECT count(*) FILTER (WHERE year >= 2000) AS since_2000,
       count(*) FILTER (WHERE year < 2000) AS before_2000
FROM sightings;
ROLLBACK;
