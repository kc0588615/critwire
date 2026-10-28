-- q: d1-fk-wrong
-- status: ran
-- engine: postgis
INSERT INTO occurrences (id, species_id, dataset_key, license, basis_of_record, longitude, latitude,
                         country_code_gbif, country_code, year, month)
SELECT 1, species_id, dataset_key, license, basis_of_record, -47.9, -15.8, 'AU', 'AU', year, month
FROM occurrences
WHERE species_id = 48
ORDER BY id
LIMIT 1;
SELECT o.id, o.country_code, ST_AsText(o.geom) AS point,
       ST_Covers(cs.geom, o.geom) AS in_its_country,
       (SELECT s.country_code FROM country_shapes AS s WHERE ST_Covers(s.geom, o.geom)) AS point_is_in
FROM occurrences AS o
JOIN country_shapes AS cs ON cs.country_code = o.country_code
WHERE o.id = 1;
