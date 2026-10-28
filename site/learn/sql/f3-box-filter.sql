-- q: f3-box-filter
-- status: ran
SELECT s.id, s.common_name, count(*) AS records
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
WHERE o.longitude BETWEEN 143.5 AND 149.0
  AND o.latitude BETWEEN -44.0 AND -39.5
GROUP BY s.id, s.common_name
ORDER BY records DESC, s.id;
