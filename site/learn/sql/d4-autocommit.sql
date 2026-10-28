-- q: d4-autocommit
-- status: ran
-- engine: postgis
-- tx: own
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
-- the script, run again after the failure:
-- fails: duplicate key value violates unique constraint "sightings_pkey"
INSERT INTO sightings
SELECT id, species_id, year, month, country_code
FROM occurrences
WHERE species_id = 48 AND year >= 2000;
SELECT count(*) AS rows_left_behind FROM sightings;
DROP TABLE sightings;
