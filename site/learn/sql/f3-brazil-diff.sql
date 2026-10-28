-- q: f3-brazil-diff
-- status: ran
SELECT s.id, s.common_name
FROM species AS s
JOIN occurrences AS o ON o.species_id = s.id
WHERE o.country_code = 'BR'
EXCEPT
SELECT s.id, s.common_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'BR'
ORDER BY id;
