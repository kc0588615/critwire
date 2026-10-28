-- q: d1-generated-write
-- status: ran
-- engine: postgis
-- expect: error can only be updated to DEFAULT
UPDATE occurrences
SET geom = ST_SetSRID(ST_MakePoint(0, 0), 4326)
WHERE id = (SELECT min(id) FROM occurrences);
