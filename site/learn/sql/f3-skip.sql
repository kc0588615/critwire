-- q: f3-skip
-- status: ran
SELECT c.code, c.name,
       count(DISTINCT o.species_id) AS species,
       count(o.id) AS records
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code
WHERE c.continent = 'South America'
GROUP BY c.code, c.name
ORDER BY c.name;
