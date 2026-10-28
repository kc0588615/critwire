-- q: d6-export
-- status: ran
COPY (
  SELECT code AS country_code, name, continent, region, subregion FROM countries ORDER BY code
) TO 'dim_country.csv' (FORMAT csv, HEADER);
SELECT count(*) AS rows, min(country_code) AS first_code, max(country_code) AS last_code
FROM read_csv('dim_country.csv', header = true, all_varchar = true);
