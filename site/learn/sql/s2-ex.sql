-- q: s2-ex
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), locations AS (
  SELECT DISTINCT ON (ST_X(g), ST_Y(g)) g AS geom
  FROM (SELECT ST_Transform(o.geom, 3577) AS g
        FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
        WHERE s.scientific_name = 'Sarcophilus harrisii'
          AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))) AS devils
  ORDER BY ST_X(g), ST_Y(g)
), observed AS (
  SELECT count(*) AS n,
         avg((SELECT ST_Distance(a.geom, b.geom) FROM locations AS b
              WHERE NOT ST_Equals(b.geom, a.geom)
              ORDER BY a.geom <-> b.geom LIMIT 1)) AS observed_m,
         ST_Collect(geom) AS points
  FROM locations AS a
), areas AS (
  SELECT 'main island' AS area, ST_Area(island.geom) AS area_m2 FROM island
  UNION ALL
  SELECT 'bounding rectangle', ST_Area(ST_Envelope(points)) FROM observed
  UNION ALL
  SELECT 'smallest rectangle', ST_Area(ST_OrientedEnvelope(points)) FROM observed
  UNION ALL
  SELECT 'convex hull', ST_Area(ST_ConvexHull(points)) FROM observed
)
SELECT a.area, round((a.area_m2 / 1e6)::numeric) AS km2, o.n,
       round(o.observed_m::numeric, 1) AS observed_m,
       round((0.5 / sqrt(o.n / a.area_m2))::numeric, 1) AS expected_m,
       round((o.observed_m / (0.5 / sqrt(o.n / a.area_m2)))::numeric, 3) AS r,
       round(((o.observed_m - 0.5 / sqrt(o.n / a.area_m2)) / (0.26136 / sqrt(o.n ^ 2 / a.area_m2)))::numeric, 1) AS z
FROM areas AS a, observed AS o
ORDER BY a.area_m2 DESC;
