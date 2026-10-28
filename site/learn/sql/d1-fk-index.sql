-- q: d1-fk-index
-- status: ran
-- engine: postgis
SELECT c.conname AS constraint_name,
       CASE c.contype WHEN 'p' THEN 'PRIMARY KEY' ELSE 'FOREIGN KEY' END AS constraint_type,
       a.attname AS column_name,
       EXISTS (SELECT 1 FROM pg_index AS i
               WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1]) AS indexed
FROM pg_constraint AS c
JOIN pg_attribute AS a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
WHERE c.conrelid = 'occurrences'::regclass
  AND c.contype IN ('p', 'f')
ORDER BY c.contype DESC, c.conname;
