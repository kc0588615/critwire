-- q: d3-ex-rows
-- status: ran
-- engine: postgis
SELECT id, year, month
FROM occurrences
WHERE species_id = 48 AND year BETWEEN 2000 AND 2009
ORDER BY year DESC, id DESC
LIMIT 20;
