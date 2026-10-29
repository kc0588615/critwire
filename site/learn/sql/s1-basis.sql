-- q: s1-basis
-- status: ran
SELECT basis_of_record,
       count(*) AS records,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct,
       count(DISTINCT species_id) AS species
FROM occurrences
GROUP BY basis_of_record
ORDER BY records DESC, basis_of_record;
