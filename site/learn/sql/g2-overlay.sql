-- q: g2-overlay
-- status: ran
-- engine: postgis
-- expect: error TopologyException
SELECT ST_Area(ST_Intersection(
         ST_GeomFromText('POLYGON((0 0, 2 2, 2 0, 0 2, 0 0))'),
         ST_GeomFromText('POLYGON((0 0, 1 0, 1 2, 0 2, 0 0))'))) AS area;
