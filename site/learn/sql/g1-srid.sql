-- q: g1-srid
-- status: ran
-- engine: postgis
SELECT srid, split_part(srtext, '"', 2) AS name,
       substring(proj4text FROM 'proj=(\w+)') AS projection,
       substring(proj4text FROM '(?:datum|ellps)=(\w+)') AS ellipsoid,
       substring(proj4text FROM '\+a=(\d+)') AS sphere_radius_m,
       substring(proj4text FROM 'units=(\w+)') AS units
FROM spatial_ref_sys
WHERE srid IN (4326, 3857, 3577)
ORDER BY srid DESC;
