-- q: f2-ex
-- status: ran
SELECT basis_of_record,
       count(*) AS records,
       count(DISTINCT species_id) AS species,
       count(DISTINCT dataset_key) AS datasets,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY basis_of_record
HAVING count(*) >= 1000
ORDER BY records DESC, basis_of_record;
