-- q: g4-ex
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
border AS (
  SELECT n.country_code AS neighbour,
         ST_LineMerge(ST_CollectionExtract(ST_Intersection(ST_Boundary(cr.geom), ST_Boundary(n.geom)), 2)) AS geom
  FROM cr
  JOIN country_shapes AS n ON n.country_code <> 'CR' AND ST_Touches(n.geom, cr.geom)
),
strip AS (
  SELECT b.neighbour, b.geom AS line,
         ST_Intersection(ST_Buffer(b.geom::geography, 10000)::geometry, cr.geom) AS geom
  FROM border AS b, cr
)
SELECT s.neighbour,
       round((ST_Area(s.geom::geography) / 1e6)::numeric) AS strip_km2,
       count(o.id) AS records,
       count(o.id) FILTER (WHERE o.country_code_gbif = s.neighbour) AS coded_neighbour,
       count(o.id) FILTER (WHERE ST_DWithin(o.geom::geography, s.line::geography, 10000)) AS within_10km
FROM strip AS s
LEFT JOIN occurrences AS o ON ST_Covers(s.geom, o.geom)
GROUP BY s.neighbour, s.geom
ORDER BY s.neighbour;
