-- q: g7-scale
-- status: ran
-- engine: postgis
-- needs: raster
WITH grid (x0, y0, d) AS (
  VALUES (-180.0099155291168, 90.00297126602864, 0.009915667822884942)
), recs AS (
  SELECT h.clip, h.rast, ST_Value(h.rast, 1, o.geom)::integer AS class_100m, oh.habitat_code AS class_1km,
         ST_MakeEnvelope(g.x0 + k.col * g.d, g.y0 - (k.row + 1) * g.d, g.x0 + (k.col + 1) * g.d, g.y0 - k.row * g.d, 4326) AS cell_1km
  FROM habitat_clips AS h
  JOIN occurrences AS o ON ST_Intersects(h.rast, o.geom)
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  CROSS JOIN grid AS g
  CROSS JOIN LATERAL (SELECT floor((ST_X(o.geom) - g.x0) / g.d) AS col, floor((g.y0 - ST_Y(o.geom)) / g.d) AS row) AS k
), majority AS (
  SELECT r.*, (SELECT vc.value::integer FROM ST_ValueCount(ST_Clip(r.rast, r.cell_1km), 1) AS vc
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
