-- q: g1-columns
-- status: ran
-- engine: postgis
SELECT f_table_name AS table_name, f_geometry_column AS column_name, type, srid
FROM geometry_columns
WHERE f_table_schema = current_schema()
  AND f_table_name <> 's4_cells'
ORDER BY table_name, column_name;
