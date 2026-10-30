-- q: c1-ex
-- status: ran
-- engine: postgis
-- after: s5-gistar, c1-feed
WITH fullest AS (
  SELECT (c ->> 'id')::int AS id
  FROM c1_feed, jsonb_array_elements(doc -> 'cells') AS c
  ORDER BY (c ->> 'records')::int DESC, (c ->> 'id')::int
  LIMIT 1
)
SELECT f.id AS cell, d.title, o.basis_of_record,
       count(*) AS records,
       count(DISTINCT (o.longitude, o.latitude)) AS places,
       min(o.year) AS first_year, max(o.year) AS last_year
FROM fullest AS f
JOIN s4_cells AS c ON c.id = f.id AND c.edge_m = 5000
JOIN occurrences AS o ON ST_Contains(c.geom, ST_Transform(o.geom, 3577))
JOIN species AS s ON s.id = o.species_id
JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE s.scientific_name = 'Sarcophilus harrisii'
GROUP BY f.id, d.title, o.basis_of_record
ORDER BY records DESC, d.title, o.basis_of_record;
