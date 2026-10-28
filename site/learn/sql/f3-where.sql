-- q: f3-where
-- status: ran
SELECT c.code, c.name, count(o.id) AS records_since_2020
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code
WHERE c.continent = 'South America' AND o.year >= 2020
GROUP BY c.code, c.name
ORDER BY c.name;
