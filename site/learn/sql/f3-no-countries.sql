-- q: f3-no-countries
-- status: ran
SELECT s.id, s.common_name, s.range_status
FROM species AS s
LEFT JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.species_id IS NULL
ORDER BY s.id;
