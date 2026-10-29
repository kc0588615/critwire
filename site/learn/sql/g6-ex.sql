-- q: g6-ex
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
), cells AS (
  SELECT h.i, h.j, h.geom, ST_Area(ST_Intersection(h.geom, island.geom)) / 1e6 AS land_km2
  FROM island, ST_HexagonGrid(10000, island.geom) AS h
  WHERE ST_Intersects(h.geom, island.geom)
), counts AS (
  SELECT c.i, c.j, c.land_km2, count(d.geom) AS n
  FROM cells AS c LEFT JOIN devils AS d ON ST_Contains(c.geom, d.geom)
  GROUP BY c.i, c.j, c.land_km2
)
SELECT i, j, n, round(land_km2::numeric, 2) AS land_km2,
       round((n / land_km2)::numeric, 3) AS per_land_km2,
       rank() OVER (ORDER BY n DESC) AS rank_by_n
FROM counts
WHERE n > 0
ORDER BY n / land_km2 DESC, i, j
LIMIT 5;
