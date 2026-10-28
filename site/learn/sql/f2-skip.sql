-- q: f2-skip
-- status: ran
SELECT species_id,
       count(*) AS records,
       count(DISTINCT dataset_key) AS datasets,
       sum(CASE WHEN basis_of_record = 'PRESERVED_SPECIMEN' THEN 1 ELSE 0 END) AS specimens,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY species_id
HAVING count(DISTINCT dataset_key) > 25
ORDER BY records DESC, species_id;
