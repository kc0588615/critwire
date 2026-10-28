-- q: f2-basis
-- status: ran
SELECT basis_of_record, count(*) AS records
FROM occurrences
GROUP BY basis_of_record
ORDER BY records DESC, basis_of_record;
