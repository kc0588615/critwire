-- q: d6-scd2-versions
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
CREATE TABLE dim_species_history (
  species_key     INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id      INTEGER NOT NULL,
  scientific_name VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL,
  valid_from      INTEGER NOT NULL,
  valid_to        INTEGER NOT NULL,
  is_current      BOOLEAN NOT NULL,
  UNIQUE (species_id, valid_from)
);
CREATE UNIQUE INDEX ON dim_species_history (species_id) WHERE is_current;
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
SELECT species_id, scientific_name, genus, 0, 9999, true FROM dim_species;
UPDATE dim_species_history SET valid_from = 2018 WHERE species_id IN (55, 63);
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
VALUES (55, 'Manis gigantea', 'Manis', 0, 2017, false),
       (63, 'Manis temminckii', 'Manis', 0, 2017, false);
SELECT
  (SELECT count(*)
   FROM (SELECT f.record_id
         FROM fact_records AS f
         LEFT JOIN dim_species_history AS h
           ON h.species_id = f.species_id
          AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END
         GROUP BY f.record_id
         HAVING count(h.species_key) <> 1) AS wrong) AS records_without_one_version,
  (SELECT count(*)
   FROM (SELECT species_id
         FROM dim_species_history
         GROUP BY species_id
         HAVING count(*) FILTER (WHERE is_current) <> 1) AS wrong) AS species_without_one_current;
