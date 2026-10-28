-- q: d1-generated
-- status: ran
-- engine: postgis
SELECT column_name, is_generated, generation_expression
FROM information_schema.columns
WHERE table_schema = current_schema()
  AND table_name = 'occurrences'
  AND is_generated = 'ALWAYS';
