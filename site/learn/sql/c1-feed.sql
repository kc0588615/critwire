-- q: c1-feed
-- status: ran
-- engine: postgis
-- after: s5-gistar
CREATE OR REPLACE TEMP VIEW c1_feed AS
WITH sp AS (
  SELECT id, scientific_name, common_name FROM species WHERE scientific_name = 'Sarcophilus harrisii'
), cells AS (
  SELECT c.id, c.n, c.geom, ST_Transform(ST_Point(c.cx, c.cy, 3577), 4326) AS centre,
         round(c.n::numeric / sum(c.n) OVER (), 6) AS weight,
         g.z > 0 AND g.fdr AS hot_spot
  FROM s4_cells AS c JOIN s5_gistar AS g ON g.id = c.id
  WHERE c.edge_m = 5000 AND c.n > 0
), credit AS (
  SELECT DISTINCT d.title, d.publisher
  FROM occurrences AS o
  JOIN sp ON sp.id = o.species_id
  JOIN cells AS c ON ST_Contains(c.geom, ST_Transform(o.geom, 3577))
  JOIN datasets AS d ON d.dataset_key = o.dataset_key
  WHERE o.license = 'CC BY 4.0'
)
SELECT jsonb_build_object(
  'version', 1,
  'species', (SELECT jsonb_build_object('scientific_name', scientific_name, 'common_name', common_name) FROM sp),
  'cell', '5 km hexagon, EPSG:3577',
  'meaning', 'share of the open GBIF records in each cell: where people recorded the animal, not its range',
  'source', 'GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w',
  'credit', coalesce((SELECT jsonb_agg(to_jsonb(credit) ORDER BY title, publisher) FROM credit), '[]'),
  'cells', jsonb_agg(jsonb_build_object(
    'id', id, 'lon', round(ST_X(centre)::numeric, 4), 'lat', round(ST_Y(centre)::numeric, 4),
    'records', n, 'weight', weight, 'recording_hot_spot', hot_spot) ORDER BY id)
) AS doc
FROM cells;
SELECT jsonb_array_length(doc -> 'cells') AS cells,
       (SELECT sum((c ->> 'records')::int) FROM jsonb_array_elements(doc -> 'cells') AS c) AS records,
       (SELECT sum((c ->> 'weight')::numeric) FROM jsonb_array_elements(doc -> 'cells') AS c) AS weight_sum,
       (SELECT count(*) FROM jsonb_array_elements(doc -> 'cells') AS c
        WHERE (c ->> 'recording_hot_spot')::boolean) AS hot_spots,
       jsonb_array_length(doc -> 'credit') AS datasets_to_credit,
       octet_length(doc::text) AS bytes,
       (SELECT c::text FROM jsonb_array_elements(doc -> 'cells') AS c
        ORDER BY (c ->> 'records')::int DESC, (c ->> 'id')::int LIMIT 1) AS fullest
FROM c1_feed;
