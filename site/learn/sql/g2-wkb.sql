-- q: g2-wkb
-- status: ran
-- engine: postgis
SELECT ST_AsText(p) AS wkt, encode(ST_AsBinary(p), 'hex') AS wkb_hex, ST_AsEWKT(p) AS ewkt,
       ST_Equals(ST_GeomFromWKB(ST_AsBinary(p), 4326), p) AS round_trip
FROM (SELECT ST_SetSRID(ST_Point(147.33, -42.88), 4326) AS p) AS one;
