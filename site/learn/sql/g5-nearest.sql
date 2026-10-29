-- q: g5-nearest
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom)
SELECT o.id, s.common_name,
       round((ST_Distance(o.geom::geography, h.geom::geography) / 1000)::numeric, 2) AS km
FROM occurrences AS o
JOIN species AS s ON s.id = o.species_id
CROSS JOIN hobart AS h
ORDER BY o.geom <-> h.geom, o.id
LIMIT 5;
