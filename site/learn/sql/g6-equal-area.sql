-- q: g6-equal-area
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(geom) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom::geography) DESC
  LIMIT 1
), cells AS (
  SELECT 'EPSG:3577, edge 10 km' AS grid, ST_Transform(h.geom, 4326) AS geom
  FROM island, ST_HexagonGrid(10000, ST_Transform(island.geom, 3577)) AS h
  WHERE ST_Intersects(h.geom, ST_Transform(island.geom, 3577))
  UNION ALL
  SELECT 'EPSG:4326, edge 0.1°', h.geom
  FROM island, ST_HexagonGrid(0.1, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
)
SELECT grid, count(*) AS cells,
       round((min(ST_Area(geom::geography)) / 1e6)::numeric, 3) AS min_km2,
       round((max(ST_Area(geom::geography)) / 1e6)::numeric, 3) AS max_km2,
       round((max(ST_Area(geom::geography)) / min(ST_Area(geom::geography)))::numeric, 4) AS max_over_min
FROM cells
GROUP BY grid
ORDER BY grid;
