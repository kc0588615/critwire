-- q: g2-invalid
-- status: ran
-- engine: postgis
WITH shapes AS (
  SELECT 'country_shapes' AS table_name, country_code AS key, geom FROM country_shapes
  UNION ALL SELECT 'admin1_shapes', adm1_code, geom FROM admin1_shapes
  UNION ALL SELECT 'ecoregions', eco_id::text, geom FROM ecoregions
), checked AS (
  SELECT table_name, key, geom, ST_IsValidDetail(geom) AS d FROM shapes
)
SELECT table_name, key, (d).reason,
       ST_NumGeometries(geom) AS parts, ST_NumGeometries(ST_MakeValid(geom)) AS parts_after,
       GeometryType(ST_MakeValid(geom)) AS type_after,
       round(((ST_Area(ST_MakeValid(geom)::geography) - ST_Area(geom::geography)) / 1e6)::numeric, 1) AS km2_change
FROM checked
WHERE NOT (d).valid
ORDER BY table_name, key;
