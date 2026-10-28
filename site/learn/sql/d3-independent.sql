-- q: d3-independent
-- status: ran
-- engine: postgis
-- after: d3-analyze
WITH mcv AS (
  SELECT s.attname, m.value, m.freq
  FROM pg_stats AS s
  CROSS JOIN LATERAL unnest(s.most_common_vals::text::text[], s.most_common_freqs) AS m (value, freq)
  WHERE s.schemaname = current_schema() AND s.tablename = 'occurrences'
)
SELECT round((SELECT freq FROM mcv WHERE attname = 'species_id' AND value = '48')
           * (SELECT freq FROM mcv WHERE attname = 'country_code' AND value = 'AU')
           * (SELECT reltuples FROM pg_class WHERE oid = 'occurrences'::regclass)) AS planner_estimate,
       (SELECT count(*) FROM occurrences WHERE species_id = 48 AND country_code = 'AU') AS actual;
