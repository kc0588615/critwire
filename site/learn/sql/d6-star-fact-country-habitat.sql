-- q: d6-star-fact-country-habitat
-- status: ran
-- engine: postgis
-- after: d6-star-dim-country, d6-star-dim-habitat-class
CREATE TABLE fact_country_habitat (
  country_code VARCHAR NOT NULL REFERENCES dim_country (country_code),
  habitat_code INTEGER NOT NULL REFERENCES dim_habitat_class (habitat_code),
  est_area_km2 DECIMAL(12, 2) NOT NULL,
  PRIMARY KEY (country_code, habitat_code)
);
INSERT INTO fact_country_habitat
SELECT country_code, habitat_code, est_area_km2 FROM country_habitats;
SELECT count(*) AS country_classes, count(DISTINCT country_code) AS countries, sum(est_area_km2) AS total_km2
FROM fact_country_habitat;
