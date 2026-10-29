-- q: g7-records
-- status: ran
-- engine: postgis
-- needs: raster
SELECT v.habitat_code, c.name, count(*) AS records
FROM habitat_clips AS h
JOIN occurrences AS o ON ST_Intersects(h.rast, o.geom)
CROSS JOIN LATERAL (SELECT ST_Value(h.rast, 1, o.geom)::integer AS habitat_code) AS v
LEFT JOIN habitat_classes AS c ON c.code = v.habitat_code
WHERE h.clip = 'cr'
GROUP BY v.habitat_code, c.name
ORDER BY records DESC, v.habitat_code NULLS LAST;
