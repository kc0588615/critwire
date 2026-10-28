-- q: d6-star-dim-country
-- status: ran
-- engine: postgis
CREATE TABLE dim_country (
  country_code VARCHAR PRIMARY KEY,
  name         VARCHAR NOT NULL,
  continent    VARCHAR NOT NULL,
  region       VARCHAR NOT NULL,
  subregion    VARCHAR NOT NULL
);
INSERT INTO dim_country
SELECT code, name, continent, region, subregion FROM countries
UNION ALL
SELECT 'ZZ', 'Unknown or outside any country', 'Unknown', 'Unknown', 'Unknown';
SELECT count(*) AS countries, count(*) FILTER (WHERE country_code = 'ZZ') AS unknown_members
FROM dim_country;
