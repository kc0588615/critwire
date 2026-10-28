-- q: d3-mcv
-- status: ran
-- engine: postgis
-- after: d3-analyze
SELECT m.value AS basis_of_record,
       round(m.freq * c.reltuples) AS planner_estimate,
       (SELECT count(*) FROM occurrences AS o WHERE o.basis_of_record = m.value) AS actual
FROM pg_stats AS s
CROSS JOIN LATERAL unnest(s.most_common_vals::text::text[], s.most_common_freqs) AS m (value, freq)
JOIN pg_class AS c ON c.oid = 'occurrences'::regclass
WHERE s.schemaname = current_schema()
  AND s.tablename = 'occurrences'
  AND s.attname = 'basis_of_record'
ORDER BY m.value;
