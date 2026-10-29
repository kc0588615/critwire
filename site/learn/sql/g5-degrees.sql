-- q: g5-degrees
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
ranked AS (
  SELECT o.id,
         ST_Distance(o.geom::geography, h.geom::geography) / 1000 AS km,
         o.geom <-> h.geom AS degrees,
         ST_X(o.geom) - ST_X(h.geom) AS east_deg,
         ST_Y(o.geom) - ST_Y(h.geom) AS north_deg,
         row_number() OVER (ORDER BY o.geom <-> h.geom, o.id) AS by_degrees,
         row_number() OVER (ORDER BY ST_Distance(o.geom::geography, h.geom::geography), o.id) AS by_metres
  FROM occurrences AS o
  CROSS JOIN hobart AS h
)
SELECT id, round(km::numeric, 3) AS km, round(degrees::numeric, 4) AS degrees,
       round(east_deg::numeric, 3) AS east_deg, round(north_deg::numeric, 3) AS north_deg,
       by_degrees, by_metres
FROM ranked
WHERE (by_degrees <= 20 OR by_metres <= 20) AND by_degrees <> by_metres
ORDER BY by_metres;
