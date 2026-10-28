-- q: d6-scd2
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
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
SELECT species_id, scientific_name, genus, 0, 9999, true FROM dim_species;
UPDATE dim_species_history SET valid_from = 2018 WHERE species_id IN (55, 63);
INSERT INTO dim_species_history (species_id, scientific_name, genus, valid_from, valid_to, is_current)
VALUES (55, 'Manis gigantea', 'Manis', 0, 2017, false),
       (63, 'Manis temminckii', 'Manis', 0, 2017, false);
ALTER TABLE fact_records ADD COLUMN species_key INTEGER REFERENCES dim_species_history (species_key);
UPDATE fact_records AS f SET species_key = h.species_key
FROM dim_species_history AS h
WHERE h.species_id = f.species_id
  AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END;
SELECT f.species_id, version.scientific_name AS filed_then, current_version.scientific_name AS name_now,
       count(*) AS records
FROM fact_records AS f
JOIN dim_species_history AS version ON version.species_key = f.species_key
JOIN dim_species_history AS current_version
  ON current_version.species_id = f.species_id AND current_version.is_current
WHERE f.species_id IN (55, 63)
GROUP BY f.species_id, version.scientific_name, current_version.scientific_name
ORDER BY f.species_id, filed_then;
