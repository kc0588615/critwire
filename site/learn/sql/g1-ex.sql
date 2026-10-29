-- q: g1-ex
-- status: ran
-- engine: postgis
SELECT country_code,
       round(ST_YMin(geom)::numeric, 1) AS south,
       round(ST_YMax(geom)::numeric, 1) AS north,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS geography_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / 1e6)::numeric) AS mercator_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / ST_Area(geom::geography))::numeric, 2) AS stretch,
       round((1 / cos(radians(ST_Y(ST_Centroid(geom)))) ^ 2)::numeric, 2) AS one_over_cos2
FROM country_shapes
WHERE country_code IN ('CD', 'GL')
ORDER BY country_code;
