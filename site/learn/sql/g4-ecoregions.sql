-- q: g4-ecoregions
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom, ST_Area(geom::geography) AS m2 FROM country_shapes WHERE country_code = 'CR')
SELECT e.eco_id, e.name, b.name AS biome,
       round((ST_Area(ST_Intersection(e.geom, cr.geom)::geography) / 1e6)::numeric) AS km2,
       round((100 * ST_Area(ST_Intersection(e.geom, cr.geom)::geography) / cr.m2)::numeric, 1) AS pct
FROM ecoregions AS e
JOIN cr ON ST_Intersects(e.geom, cr.geom)
LEFT JOIN biomes AS b ON b.biome_id = e.biome_id
ORDER BY km2 DESC, e.eco_id;
