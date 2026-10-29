-- q: g1-distance
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
launceston AS (SELECT ST_SetSRID(ST_Point(147.14, -41.44), 4326) AS geom)
SELECT round(ST_Distance(h.geom, l.geom)::numeric, 4) AS degrees,
       round((ST_Distance(h.geom::geography, l.geom::geography) / 1000)::numeric, 2) AS geography_km,
       round((ST_Distance(ST_Transform(h.geom, 3577), ST_Transform(l.geom, 3577)) / 1000)::numeric, 2) AS albers_km,
       round((ST_Distance(ST_Transform(h.geom, 3857), ST_Transform(l.geom, 3857)) / 1000)::numeric, 2) AS mercator_km
FROM hobart AS h, launceston AS l;
