-- q: d6-scd2
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records, d6-scd2-versions
ALTER TABLE fact_records ADD COLUMN species_key INTEGER REFERENCES dim_species_history (species_key);
UPDATE fact_records AS f SET species_key = h.species_key
FROM dim_species_history AS h
WHERE h.species_id = f.species_id
  AND CASE WHEN f.year = -1 THEN h.is_current ELSE f.year BETWEEN h.valid_from AND h.valid_to END;
ALTER TABLE fact_records ALTER COLUMN species_key SET NOT NULL;
SELECT f.species_id, version.scientific_name AS name_then, current_version.scientific_name AS name_now,
       count(*) AS records
FROM fact_records AS f
JOIN dim_species_history AS version ON version.species_key = f.species_key
JOIN dim_species_history AS current_version
  ON current_version.species_id = f.species_id AND current_version.is_current
WHERE f.species_id IN (55, 63)
GROUP BY f.species_id, version.scientific_name, current_version.scientific_name
ORDER BY f.species_id, name_then;
