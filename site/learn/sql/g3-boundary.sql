-- q: g3-boundary
-- status: ran
-- engine: postgis
WITH square AS (SELECT ST_GeomFromText('POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))', 4326) AS geom),
points (place, geom) AS (
  VALUES ('inside', ST_SetSRID(ST_Point(0.5, 0.5), 4326)),
         ('on the edge', ST_SetSRID(ST_Point(1, 0.5), 4326)),
         ('outside', ST_SetSRID(ST_Point(2, 0.5), 4326))
)
SELECT p.place, ST_Contains(s.geom, p.geom) AS contains, ST_Covers(s.geom, p.geom) AS covers,
       ST_Intersects(s.geom, p.geom) AS intersects
FROM square AS s, points AS p
ORDER BY p.place;
