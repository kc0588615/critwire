-- q: g4-gap
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR')
SELECT round((ST_Area(cr.geom::geography) / 1e6)::numeric) AS country_km2,
       round((sum(ST_Area(ST_Intersection(e.geom, cr.geom)::geography)) / 1e6)::numeric) AS ecoregion_pieces_km2,
       round((ST_Area(ST_Difference(cr.geom, ST_Union(e.geom))::geography) / 1e6)::numeric) AS in_no_ecoregion_km2
FROM cr
JOIN ecoregions AS e ON ST_Intersects(e.geom, cr.geom)
GROUP BY cr.geom;
