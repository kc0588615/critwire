-- q: g2-coverage
-- status: ran
-- engine: postgis
SELECT a.country_code AS outline, b.country_code AS inside_it,
       ST_Relate(a.geom, b.geom) AS de9im,
       round((ST_Area(ST_Intersection(a.geom, b.geom)::geography) / 1e6)::numeric) AS overlap_km2,
       round((100 * ST_Area(ST_Intersection(a.geom, b.geom)::geography) / ST_Area(b.geom::geography))::numeric, 1) AS pct_of_inside_it
FROM country_shapes AS a
JOIN country_shapes AS b ON a.geom && b.geom AND a.country_code <> b.country_code
WHERE ST_Relate(a.geom, b.geom, '2********')
  AND ST_Area(a.geom::geography) > ST_Area(b.geom::geography)
ORDER BY overlap_km2 DESC, outline, inside_it;
