-- q: s2-nni
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT o.id, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id, island
  WHERE s.scientific_name = 'Sarcophilus harrisii'
    AND ST_Contains(island.geom, ST_Transform(o.geom, 3577))
), sets AS (
  SELECT 'every record' AS points, id, geom FROM devils
  UNION ALL
  (SELECT DISTINCT ON (ST_X(geom), ST_Y(geom)) 'distinct locations', id, geom
   FROM devils ORDER BY ST_X(geom), ST_Y(geom), id)
), nearest AS (
  SELECT a.points,
         (SELECT ST_Distance(a.geom, b.geom) FROM sets AS b
          WHERE b.points = a.points AND b.id <> a.id
          ORDER BY a.geom <-> b.geom LIMIT 1) AS d_m
  FROM sets AS a
), stats AS (
  SELECT nr.points, count(*) AS n, count(*) FILTER (WHERE nr.d_m = 0) AS zero_m,
         avg(nr.d_m) AS observed_m, ST_Area(island.geom) AS area_m2
  FROM nearest AS nr, island
  GROUP BY nr.points, island.geom
)
SELECT points, n, zero_m,
       round(observed_m::numeric, 1) AS observed_m,
       round((0.5 / sqrt(n / area_m2))::numeric, 1) AS expected_m,
       round((observed_m / (0.5 / sqrt(n / area_m2)))::numeric, 3) AS r,
       round(((observed_m - 0.5 / sqrt(n / area_m2)) / (0.26136 / sqrt(n ^ 2 / area_m2)))::numeric, 1) AS z
FROM stats
ORDER BY n DESC;
