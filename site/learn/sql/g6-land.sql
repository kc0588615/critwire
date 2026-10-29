-- q: g6-land
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), cells AS (
  SELECT e.edge_m, h.geom, ST_Covers(island.geom, h.geom) AS all_land,
         ST_Area(ST_Intersection(h.geom, island.geom)) / ST_Area(h.geom) AS land_share
  FROM island, (VALUES (5000), (10000)) AS e (edge_m), ST_HexagonGrid(e.edge_m, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
)
SELECT c.edge_m, round((min(ST_Area(c.geom)) / 1e6)::numeric, 2) AS cell_km2, count(*) AS cells,
       count(*) FILTER (WHERE c.all_land) AS all_land,
       count(*) FILTER (WHERE c.land_share < 0.5) AS under_half_land,
       round((sum(ST_Area(c.geom)) / 1e6)::numeric) AS cells_km2,
       round((ST_Area(i.geom) / 1e6)::numeric) AS island_km2
FROM cells AS c CROSS JOIN island AS i
GROUP BY c.edge_m, i.geom
ORDER BY c.edge_m;
