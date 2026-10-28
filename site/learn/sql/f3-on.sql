-- q: f3-on
-- status: ran
SELECT c.code, c.name, count(o.id) AS records_since_2020
FROM countries AS c
LEFT JOIN occurrences AS o ON o.country_code = c.code AND o.year >= 2020
WHERE c.continent = 'South America'
GROUP BY c.code, c.name
ORDER BY c.name;
