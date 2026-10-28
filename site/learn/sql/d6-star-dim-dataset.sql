-- q: d6-star-dim-dataset
-- status: ran
-- engine: postgis
CREATE TABLE dim_dataset (
  dataset_key VARCHAR PRIMARY KEY,
  title       VARCHAR NOT NULL,
  publisher   VARCHAR NOT NULL,
  doi         VARCHAR,
  license     VARCHAR NOT NULL
);
INSERT INTO dim_dataset
SELECT CAST(dataset_key AS VARCHAR), title, publisher, doi, license
FROM datasets;
SELECT count(*) AS datasets, count(doi) AS with_doi, count(DISTINCT publisher) AS publishers
FROM dim_dataset;
