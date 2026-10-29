-- q: g1-area
-- status: ran
-- engine: postgis
SELECT name,
       round(ST_Y(ST_Centroid(geom))::numeric, 1) AS lat,
       round((ST_Area(geom::geography) / 1e6)::numeric) AS geography_km2,
       round((ST_Area(ST_Transform(geom, 3577)) / 1e6)::numeric) AS albers_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / 1e6)::numeric) AS mercator_km2,
       round((ST_Area(ST_Transform(geom, 3857)) / ST_Area(geom::geography))::numeric, 2) AS stretch,
       round((1 / cos(radians(ST_Y(ST_Centroid(geom)))) ^ 2)::numeric, 2) AS one_over_cos2
FROM admin1_shapes
WHERE country_code = 'AU'
ORDER BY ST_Y(ST_Centroid(geom)), name;
