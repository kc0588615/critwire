-- q: d4-locks
-- status: ran
-- engine: postgis
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
ALTER TABLE species ADD COLUMN note text;
SELECT relation::regclass::text AS table_name, mode
FROM pg_locks
WHERE pid = pg_backend_pid()
  AND locktype = 'relation'
  AND relation IN ('occurrences'::regclass, 'species'::regclass)
ORDER BY table_name, mode;
