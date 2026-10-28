-- q: f1-page
-- status: ran
-- show: cards
SELECT id, common_name, scientific_name
FROM species
WHERE id IN (SELECT species_id FROM species_taxonomy WHERE class = 'Mammalia')
ORDER BY common_name, id
LIMIT 5 OFFSET 5;
