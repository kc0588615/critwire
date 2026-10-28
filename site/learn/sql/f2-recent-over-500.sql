-- q: f2-recent-over-500
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
WHERE year >= 2000
GROUP BY species_id
HAVING count(*) > 500
ORDER BY records DESC, species_id;
