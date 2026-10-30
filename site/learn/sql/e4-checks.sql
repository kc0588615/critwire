-- q: e4-checks
-- status: ran
-- engine: postgis
SELECT 'coordinates out of range' AS check_name, 'reject' AS action, count(*) AS records
FROM occurrences WHERE longitude NOT BETWEEN -180 AND 180 OR latitude NOT BETWEEN -90 AND 90
UNION ALL
SELECT 'coordinates exactly 0, 0', 'reject', count(*)
FROM occurrences WHERE longitude = 0 AND latitude = 0
UNION ALL
SELECT 'license not CC0 1.0 or CC BY 4.0', 'reject', count(*)
FROM occurrences WHERE license NOT IN ('CC0 1.0', 'CC BY 4.0')
UNION ALL
SELECT 'dataset with no title or publisher', 'reject', count(*)
FROM occurrences AS o JOIN datasets AS d ON d.dataset_key = o.dataset_key
WHERE coalesce(trim(d.title), '') = '' OR coalesce(trim(d.publisher), '') = ''
UNION ALL
SELECT 'GBIF country code with no countries row', 'reject', count(*)
FROM occurrences WHERE country_code_gbif IS NOT NULL AND country_code IS NULL AND country_code_gbif NOT IN ('ZZ', 'XZ')
UNION ALL
SELECT 'year after the download (2026)', 'reject', count(*)
FROM occurrences WHERE year > 2026
UNION ALL
SELECT 'year before 1700', 'flag', count(*)
FROM occurrences WHERE year < 1700
UNION ALL
SELECT 'coordinate uncertainty over 100 km', 'flag', count(*)
FROM occurrences WHERE coordinate_uncertainty_m > 100000
UNION ALL
SELECT 'no coordinate uncertainty', 'flag', count(*)
FROM occurrences WHERE coordinate_uncertainty_m IS NULL
UNION ALL
SELECT 'repeats a record: same species, dataset, place, year and month', 'flag', count(*) - count(DISTINCT (species_id, dataset_key, longitude, latitude, year, month))
FROM occurrences
ORDER BY records DESC, check_name;
