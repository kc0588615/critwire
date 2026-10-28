-- q: f2-distinct
-- status: ran
SELECT count(DISTINCT dataset_key) AS datasets,
       count(DISTINCT license) AS licenses,
       count(DISTINCT country_code) AS countries
FROM occurrences;
