-- q: d6-at-sea
-- status: ran
-- engine: postgis
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude,
                         coordinate_uncertainty_m, country_code_gbif, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, 146.5, -39.5, NULL, 'XZ', NULL, NULL, NULL
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT id, species_id, country_code_gbif, country_code, year FROM occurrences WHERE id = 1;
