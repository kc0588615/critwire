-- q: f2-over-500
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
GROUP BY species_id
HAVING count(*) > 500
ORDER BY records DESC, species_id;
