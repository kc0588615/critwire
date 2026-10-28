-- q: d2-unnest
-- status: ran
-- DuckDB only: unnest turns a list into rows
SELECT id, unnest("range".countriesWithOpenRecords) AS country_code
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar'
ORDER BY country_code;
