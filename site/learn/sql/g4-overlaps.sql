-- q: g4-overlaps
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
pieces AS (
  SELECT e.eco_id, ST_Intersection(e.geom, cr.geom) AS geom
  FROM ecoregions AS e
  JOIN cr ON ST_Intersects(e.geom, cr.geom)
),
shared AS (
  SELECT a.eco_id || '+' || b.eco_id AS pair, ST_Relate(a.geom, b.geom) AS de9im,
         ST_Area(ST_Intersection(a.geom, b.geom)::geography) AS m2
  FROM pieces AS a
  JOIN pieces AS b ON a.eco_id < b.eco_id AND ST_Relate(a.geom, b.geom, '2********')
)
SELECT CASE WHEN GROUPING(pair) = 1 THEN 'all' ELSE pair END AS pair, de9im,
       round((sum(m2) / 1e6)::numeric, 1) AS overlap_km2
FROM shared
GROUP BY ROLLUP ((pair, de9im))
ORDER BY GROUPING(pair) DESC, overlap_km2 DESC, pair;
