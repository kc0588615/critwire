-- q: f3-bins
-- status: ran
SELECT floor(longitude / 10) * 10 AS west, floor(latitude / 10) * 10 AS south,
       count(*) AS records, count(DISTINCT species_id) AS species
FROM occurrences
GROUP BY west, south
ORDER BY records DESC, west, south
LIMIT 10;
