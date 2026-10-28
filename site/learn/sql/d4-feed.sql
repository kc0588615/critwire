-- q: d4-feed
-- status: ran
-- engine: postgis
CREATE TABLE sightings (
  occurrence_id bigint PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  year integer NOT NULL,
  month integer,
  country_code text REFERENCES countries (code)
);
INSERT INTO sightings (occurrence_id, species_id, year, country_code)
SELECT id, species_id, year, country_code
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2019;
SELECT count(*) AS sightings, count(month) AS with_month FROM sightings;
