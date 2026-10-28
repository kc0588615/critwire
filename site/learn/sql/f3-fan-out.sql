-- q: f3-fan-out
-- status: ran
SELECT s.common_name, count(*) AS joined_rows, count(DISTINCT o.id) AS records,
       count(DISTINCT sc.country_code) AS countries
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
JOIN occurrences AS o ON o.species_id = s.id
WHERE s.id = 51
GROUP BY s.common_name;
