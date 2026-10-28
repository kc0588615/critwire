-- q: d3-stats
-- status: ran
-- engine: postgis
-- after: d3-analyze
SELECT attname AS column_name, null_frac, n_distinct, correlation
FROM pg_stats
WHERE schemaname = current_schema()
  AND tablename = 'occurrences'
  AND attname IN ('id', 'species_id', 'year', 'basis_of_record', 'license', 'country_code')
ORDER BY attname;
