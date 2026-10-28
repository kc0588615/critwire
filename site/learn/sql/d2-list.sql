-- q: d2-list
-- status: ran
-- DuckDB only: reads the published file, not a learners' table
SELECT id, slug, "range".countriesWithOpenRecords AS country_codes
FROM read_parquet('species.parquet')
WHERE slug = 'jaguar';
