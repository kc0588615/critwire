-- q: f4-above-average
-- status: ran
SELECT species_id, count(*) AS records
FROM occurrences
GROUP BY species_id
HAVING count(*) > (SELECT avg(n) FROM (SELECT count(*) AS n FROM occurrences GROUP BY species_id) AS per_species)
ORDER BY records DESC, species_id;
