-- q: g7-scale
-- status: ran
-- engine: postgis
-- needs: raster
WITH win (clip, env) AS (
  VALUES ('cr', ST_MakeEnvelope(-84.2009, 9.8491, -83.4499, 10.6001, 4326)),
         ('tas', ST_MakeEnvelope(147.2491, -43.1003, 148.0001, -42.3493, 4326))
), w AS MATERIALIZED (
  SELECT h.clip, ST_Union(ST_Clip(h.rast, win.env)) AS rast
  FROM habitat_clips AS h JOIN win ON win.clip = h.clip AND ST_Intersects(h.rast, win.env)
  GROUP BY h.clip
), grid (x0, y0, d) AS (
  VALUES (-180.0099155291168, 90.00297126602864, 0.009915667822884942)
), recs AS (
  SELECT w.clip, w.rast, ST_Value(w.rast, 1, o.geom)::integer AS class_100m, oh.habitat_code AS class_1km,
         ST_MakeEnvelope(g.x0 + k.col * g.d, g.y0 - (k.row + 1) * g.d, g.x0 + (k.col + 1) * g.d, g.y0 - k.row * g.d, 4326) AS cell_1km
  FROM w
  JOIN occurrences AS o ON ST_Intersects(w.rast, o.geom)
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  CROSS JOIN grid AS g
  CROSS JOIN LATERAL (SELECT floor((ST_X(o.geom) - g.x0) / g.d) AS col, floor((g.y0 - ST_Y(o.geom)) / g.d) AS row) AS k
), majority AS MATERIALIZED (
  SELECT r.clip, r.class_100m, r.class_1km,
         (SELECT vc.value::integer FROM ST_ValueCount(ST_Clip(r.rast, r.cell_1km), 1) AS vc
          ORDER BY vc.count DESC, vc.value LIMIT 1) AS most_100m
  FROM recs AS r
)
SELECT clip, count(*) AS records,
       count(*) FILTER (WHERE class_100m = class_1km) AS same_at_record,
       count(*) FILTER (WHERE most_100m = class_1km) AS same_as_majority,
       count(*) FILTER (WHERE class_100m = most_100m) AS record_in_majority
FROM majority
GROUP BY clip
ORDER BY clip;
