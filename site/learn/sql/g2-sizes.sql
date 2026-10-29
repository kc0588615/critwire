-- q: g2-sizes
-- status: ran
-- engine: postgis
WITH shapes AS (
  SELECT 'country_shapes' AS table_name, geom FROM country_shapes
  UNION ALL SELECT 'admin1_shapes', geom FROM admin1_shapes
  UNION ALL SELECT 'ecoregions', geom FROM ecoregions
)
SELECT table_name, count(*) AS shapes, sum(ST_NPoints(geom)) AS points,
       sum(length(ST_AsBinary(geom))) AS wkb_bytes,
       sum(length(translate(encode(ST_AsBinary(geom), 'base64'), E'\n', ''))) AS base64_chars,
       sum(length(encode(ST_AsBinary(geom), 'hex'))) AS hex_chars,
       sum(length(ST_AsText(geom))) AS wkt_chars
FROM shapes
GROUP BY table_name
ORDER BY wkb_bytes DESC;
