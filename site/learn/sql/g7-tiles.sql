-- q: g7-tiles
-- status: ran
-- engine: postgis
-- needs: raster
WITH box AS (
  SELECT clip, ST_Extent(ST_Envelope(rast)) AS ext, max(ST_ScaleX(rast)) AS d
  FROM habitat_clips
  GROUP BY clip
), grid AS (
  SELECT clip, round((ST_XMax(ext) - ST_XMin(ext)) / d)::integer AS width,
         round((ST_YMax(ext) - ST_YMin(ext)) / d)::integer AS height
  FROM box
)
SELECT g.clip, g.width || ' × ' || g.height AS box_cells,
       ceil(g.width / 256.0) || ' × ' || ceil(g.height / 256.0) AS box_tiles,
       count(*) AS tiles,
       ceil(g.width / 256.0) * ceil(g.height / 256.0) - count(*) AS left_out,
       sum(ST_Width(h.rast) * ST_Height(h.rast)) AS cells,
       sum(ST_Count(h.rast)) AS class_cells,
       ST_SameAlignment(h.rast) AS aligned
FROM habitat_clips AS h JOIN grid AS g USING (clip)
GROUP BY g.clip, g.width, g.height
ORDER BY g.clip;
