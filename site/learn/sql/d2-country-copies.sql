-- q: d2-country-copies
-- status: ran
SELECT c.name AS country, count(*) AS copies
FROM species_countries AS sc
JOIN countries AS c ON c.code = sc.country_code
GROUP BY c.name
ORDER BY copies DESC, country
LIMIT 5;
