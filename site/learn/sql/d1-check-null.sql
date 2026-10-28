-- q: d1-check-null
-- status: ran
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, longitude, latitude, NULL, year, NULL
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT id, species_id, country_code, month
FROM occurrences
WHERE id = 1;
