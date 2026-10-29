-- q: g6-records
-- status: ran
-- engine: postgis
WITH parts AS (
  SELECT (part).geom, rank() OVER (ORDER BY ST_Area((part).geom) DESC) AS size_rank
  FROM (SELECT ST_Dump(ST_Transform(geom, 3577)) AS part
        FROM admin1_shapes WHERE country_code = 'AU' AND name = 'Tasmania') AS parts
), island AS (
  SELECT geom FROM parts WHERE size_rank = 1
), cells AS (
  SELECT e.edge_m, h.geom
  FROM island, (VALUES (5000), (10000)) AS e (edge_m), ST_HexagonGrid(e.edge_m, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
), devils AS (
  SELECT o.geom AS geom_4326, ST_Transform(o.geom, 3577) AS geom
  FROM occurrences AS o JOIN species AS s ON s.id = o.species_id
  WHERE s.scientific_name = 'Sarcophilus harrisii'
), placed AS (
  SELECT d.geom,
         CASE WHEN ST_Covers(i.geom, d.geom) THEN 'main island'
              WHEN EXISTS (SELECT 1 FROM parts AS p WHERE ST_Covers(p.geom, d.geom)) THEN 'smaller island'
              WHEN EXISTS (SELECT 1 FROM admin1_shapes AS a WHERE ST_Covers(a.geom, d.geom_4326)) THEN 'another state'
              ELSE 'no outline' END AS place
  FROM devils AS d CROSS JOIN island AS i
)
SELECT p.place, count(*) AS records,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM cells AS c WHERE c.edge_m = 5000 AND ST_Contains(c.geom, p.geom))) AS in_5km_cell,
       count(*) FILTER (WHERE EXISTS (SELECT 1 FROM cells AS c WHERE c.edge_m = 10000 AND ST_Contains(c.geom, p.geom))) AS in_10km_cell
FROM placed AS p
GROUP BY p.place
ORDER BY array_position(ARRAY['main island', 'smaller island', 'no outline', 'another state'], p.place);
