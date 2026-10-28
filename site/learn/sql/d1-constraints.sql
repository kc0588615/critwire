-- q: d1-constraints
-- status: ran
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'species'
  AND constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
ORDER BY constraint_type, constraint_name;
