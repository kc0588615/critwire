-- q: g7-latitude
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
), meta AS (
  SELECT w.clip, m.*
  FROM w CROSS JOIN LATERAL ST_MetaData(w.rast) AS m
), cell_rows AS (
  SELECT clip, width, r.row = height / 2 AS is_mid,
         ST_MakeEnvelope(upperleftx, upperlefty + r.row * scaley,
                         upperleftx + scalex, upperlefty + (r.row - 1) * scaley, srid) AS cell
  FROM meta CROSS JOIN generate_series(1, height) AS r (row)
), mid AS (
  SELECT clip, ST_XMin(cell) AS x0, ST_XMax(cell) AS x1, ST_YMin(cell) AS y0, ST_YMax(cell) AS y1
  FROM cell_rows WHERE is_mid
)
SELECT c.clip,
       round(min(ST_YMin(c.cell))::numeric, 2) AS lat_south, round(max(ST_YMax(c.cell))::numeric, 2) AS lat_north,
       round(ST_Distance(ST_Point(m.x0, m.y0, 4326)::geography, ST_Point(m.x1, m.y0, 4326)::geography)::numeric, 1) AS mid_width_m,
       round(ST_Distance(ST_Point(m.x0, m.y0, 4326)::geography, ST_Point(m.x0, m.y1, 4326)::geography)::numeric, 1) AS mid_height_m,
       round(count(*) * max(c.width) * 0.01, 1) AS map_km2,
       round((sum(ST_Area(c.cell::geography)) * max(c.width) / 1e6)::numeric, 1) AS ground_km2,
       round((sum(ST_Area(c.cell::geography)) / (count(*) * 1e4))::numeric, 4) AS ground_over_map,
       round(cos(radians((m.y0 + m.y1) / 2))::numeric, 4) AS cos_mid_lat
FROM cell_rows AS c JOIN mid AS m USING (clip)
GROUP BY c.clip, m.x0, m.x1, m.y0, m.y1
ORDER BY c.clip;
