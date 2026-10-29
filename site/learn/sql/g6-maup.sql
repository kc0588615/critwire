-- q: g6-maup
-- status: ran
-- engine: postgis
WITH island AS (
  SELECT (part).geom
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
  ORDER BY ST_Area((part).geom) DESC
  LIMIT 1
), devils AS (
  SELECT ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), grids (edge_m, shift_m) AS (
  VALUES (5000, 0), (10000, 0), (10000, 5000)
), cells AS (
  SELECT g.edge_m, g.shift_m, h.i, h.j, ST_Translate(h.geom, g.shift_m, g.shift_m) AS geom
  FROM island, grids AS g, ST_HexagonGrid(g.edge_m, ST_Translate(island.geom, -g.shift_m, -g.shift_m)) AS h
  WHERE ST_Intersects(ST_Translate(h.geom, g.shift_m, g.shift_m), island.geom)
), counts AS (
  SELECT c.edge_m, c.shift_m, c.i, c.j, count(d.geom) AS n
  FROM cells AS c LEFT JOIN devils AS d ON ST_Contains(c.geom, d.geom)
  GROUP BY c.edge_m, c.shift_m, c.i, c.j
)
SELECT edge_m, shift_m, count(*) AS cells, count(*) FILTER (WHERE n > 0) AS occupied,
       sum(n) AS records, max(n) AS max_n,
       round(100.0 * count(*) FILTER (WHERE n > 0) / count(*), 1) AS pct_occupied,
       round(100.0 * max(n) / sum(n), 1) AS top_cell_pct
FROM counts
GROUP BY edge_m, shift_m
ORDER BY edge_m, shift_m;
