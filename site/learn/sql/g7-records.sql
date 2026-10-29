-- q: g7-records
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2007, 9.8493, -83.4501, 10.5999, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
)
SELECT v.habitat_code, c.name, count(*) AS records
FROM w
JOIN occurrences AS o ON ST_Intersects(w.rast, o.geom)
CROSS JOIN LATERAL (SELECT ST_Value(w.rast, 1, o.geom)::integer AS habitat_code) AS v
LEFT JOIN habitat_classes AS c ON c.code = v.habitat_code
GROUP BY v.habitat_code, c.name
ORDER BY records DESC, v.habitat_code NULLS LAST;
