-- q: d6-star-fact-species-country
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country
CREATE TABLE fact_species_country (
  species_id   INTEGER NOT NULL REFERENCES dim_species (species_id),
  country_code VARCHAR NOT NULL REFERENCES dim_country (country_code),
  PRIMARY KEY (species_id, country_code)
);
INSERT INTO fact_species_country
SELECT species_id, country_code FROM species_countries;
SELECT count(*) AS pairs, count(DISTINCT species_id) AS species, count(DISTINCT country_code) AS countries
FROM fact_species_country;
