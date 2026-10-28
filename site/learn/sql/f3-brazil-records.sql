-- q: f3-brazil-records
-- status: ran
SELECT s.id, s.common_name, count(*) AS records
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE o.country_code = 'BR'
GROUP BY s.id, s.common_name
ORDER BY records DESC, s.id;
