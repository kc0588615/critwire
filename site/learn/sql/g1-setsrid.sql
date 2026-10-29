-- q: g1-setsrid
-- status: ran
-- engine: postgis
WITH hobart AS (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS geom),
albers AS (
  SELECT 'ST_Transform' AS how, ST_Transform(geom, 3577) AS geom FROM hobart
  UNION ALL
  SELECT 'ST_SetSRID', ST_SetSRID(geom, 3577) FROM hobart
)
SELECT a.how,
       round(ST_X(a.geom)::numeric, 2) AS x, round(ST_Y(a.geom)::numeric, 2) AS y,
       ST_AsText(ST_Transform(a.geom, 4326), 4) AS back_in_4326,
       round((ST_Distance(ST_Transform(a.geom, 4326)::geography, h.geom::geography) / 1000)::numeric) AS km_from_hobart
FROM albers AS a, hobart AS h
ORDER BY km_from_hobart;
