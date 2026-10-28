-- q: f3-brazil-list
-- status: ran
-- show: cards
SELECT s.id, s.common_name, s.scientific_name
FROM species AS s
JOIN species_countries AS sc ON sc.species_id = s.id
WHERE sc.country_code = 'BR'
ORDER BY s.common_name;
