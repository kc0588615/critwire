-- q: g5-analyze
-- status: ran
-- engine: postgis
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences;
SELECT c.reltuples::bigint AS planner_rows, (SELECT count(*) FROM occurrences) AS table_rows
FROM pg_class AS c
WHERE c.oid = 'occurrences'::regclass;
