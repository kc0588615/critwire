-- q: g3-iucn
-- status: untested: reads your own IUCN download, which critwire never holds
-- engine: postgis
SELECT s.common_name, count(*) AS records,
       count(*) FILTER (WHERE ST_Covers(r.geom, o.geom)) AS inside_range
FROM my_iucn.ranges AS r
JOIN species AS s ON s.iucn_id = r.iucn_id
JOIN occurrences AS o ON o.species_id = s.id
GROUP BY s.common_name
ORDER BY s.common_name;
