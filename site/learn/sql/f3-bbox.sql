-- q: f3-bbox
-- status: ran
SELECT s.id, s.common_name, count(*) AS records,
       min(o.longitude) AS west, max(o.longitude) AS east,
       min(o.latitude) AS south, max(o.latitude) AS north
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.id IN (25, 48, 51)
GROUP BY s.id, s.common_name
ORDER BY s.id;
