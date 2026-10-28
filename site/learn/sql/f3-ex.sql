-- q: f3-ex
-- status: ran
SELECT c.code, c.name
FROM countries AS c
WHERE c.continent = 'Africa'
  AND NOT EXISTS (SELECT 1 FROM occurrences AS o WHERE o.country_code = c.code)
ORDER BY c.name;
