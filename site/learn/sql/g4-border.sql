-- q: g4-border
-- status: ran
-- engine: postgis
WITH cr AS (SELECT geom FROM country_shapes WHERE country_code = 'CR'),
border AS (
  SELECT n.country_code AS neighbour,
         ST_LineMerge(ST_CollectionExtract(ST_Intersection(ST_Boundary(cr.geom), ST_Boundary(n.geom)), 2)) AS geom
  FROM cr
  JOIN country_shapes AS n ON n.country_code <> 'CR' AND ST_Touches(n.geom, cr.geom)
)
SELECT b.neighbour,
       round((ST_Length(b.geom::geography) / 1000)::numeric) AS border_km,
       count(o.id) AS records_within_10km,
       count(o.id) FILTER (WHERE o.country_code_gbif = 'CR') AS coded_cr,
       count(o.id) FILTER (WHERE o.country_code_gbif = b.neighbour) AS coded_neighbour
FROM border AS b
LEFT JOIN occurrences AS o
  ON o.country_code_gbif IN ('CR', b.neighbour) AND ST_DWithin(o.geom::geography, b.geom::geography, 10000)
GROUP BY b.neighbour, b.geom
ORDER BY b.neighbour;
