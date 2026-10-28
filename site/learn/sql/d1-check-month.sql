-- q: d1-check-month
-- status: ran
-- expect: error CHECK constraint failed
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, longitude, latitude, year, 13
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
