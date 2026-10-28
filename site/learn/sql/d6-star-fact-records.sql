-- q: d6-star-fact-records
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year
CREATE TABLE fact_records (
  record_id                BIGINT PRIMARY KEY,
  species_id               INTEGER NOT NULL REFERENCES dim_species (species_id),
  country_code             VARCHAR NOT NULL REFERENCES dim_country (country_code),
  dataset_key              VARCHAR NOT NULL REFERENCES dim_dataset (dataset_key),
  year                     INTEGER NOT NULL REFERENCES dim_year (year),
  month                    INTEGER,
  basis_of_record          VARCHAR NOT NULL,
  license                  VARCHAR NOT NULL,
  longitude                DOUBLE PRECISION NOT NULL,
  latitude                 DOUBLE PRECISION NOT NULL,
  coordinate_uncertainty_m DOUBLE PRECISION
);
INSERT INTO fact_records
SELECT id, species_id, coalesce(country_code, 'ZZ'), CAST(dataset_key AS VARCHAR), coalesce(year, -1), month,
       basis_of_record, license, longitude, latitude, coordinate_uncertainty_m
FROM occurrences;
SELECT count(*) AS records,
       count(*) FILTER (WHERE country_code = 'ZZ') AS unknown_country,
       count(*) FILTER (WHERE year = -1) AS unknown_year,
       count(coordinate_uncertainty_m) AS with_uncertainty
FROM fact_records;
