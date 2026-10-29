-- q: g2-ex
-- status: ran
-- engine: postgis
WITH shapes (name, geom) AS (VALUES
  ('hole outside its shell', ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0), (5 1, 6 1, 6 2, 5 2, 5 1))')),
  ('shell inside a shell', ST_GeomFromText('MULTIPOLYGON(((0 0, 4 0, 4 4, 0 4, 0 0)), ((1 1, 2 1, 2 2, 1 2, 1 1)))')),
  ('shell with a hole', ST_GeomFromText('POLYGON((0 0, 4 0, 4 4, 0 4, 0 0), (1 1, 2 1, 2 2, 1 2, 1 1))'))
)
SELECT name, (ST_IsValidDetail(geom)).valid, (ST_IsValidDetail(geom)).reason,
       ST_Area(geom) AS area,
       ST_Area(ST_MakeValid(geom)) AS linework_area,
       ST_Area(ST_MakeValid(geom, 'method=structure')) AS structure_area
FROM shapes
ORDER BY name;
