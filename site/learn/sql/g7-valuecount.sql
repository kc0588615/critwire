-- q: g7-valuecount
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2009, 9.8491, -83.4499, 10.6001, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
)
SELECT vc.value::integer AS habitat_code, vc.count AS cells
FROM w
JOIN country_shapes AS cs ON cs.country_code = 'CR'
CROSS JOIN LATERAL ST_ValueCount(ST_Clip(w.rast, cs.geom), 1) AS vc
ORDER BY cells DESC, habitat_code;
