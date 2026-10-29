-- q: g2-bowtie
-- status: ran
-- engine: postgis
SELECT (ST_IsValidDetail(geom)).valid, (ST_IsValidDetail(geom)).reason,
       ST_AsText((ST_IsValidDetail(geom)).location) AS at,
       ST_Area(geom) AS area,
       ST_AsText(ST_MakeValid(geom)) AS made_valid,
       ST_Area(ST_MakeValid(geom)) AS valid_area
FROM (SELECT ST_GeomFromText('POLYGON((0 0, 2 2, 2 0, 0 2, 0 0))') AS geom) AS shape;
