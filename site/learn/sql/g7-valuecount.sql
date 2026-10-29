-- q: g7-valuecount
-- status: ran
-- engine: postgis
-- needs: raster
SELECT vc.value::integer AS habitat_code, vc.count AS cells
FROM habitat_clips AS h
JOIN country_shapes AS cs ON cs.country_code = 'CR'
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(h.rast, cs.geom), 1) AS vc
WHERE h.clip = 'cr'
ORDER BY cells DESC, habitat_code;
