-- q: d2-ex
-- status: ran
-- after: d2-flat
CREATE TABLE r_species (
  species_id  INTEGER PRIMARY KEY,
  common_name VARCHAR NOT NULL
);
CREATE TABLE r_datasets (
  dataset_key VARCHAR PRIMARY KEY,
  title       VARCHAR NOT NULL,
  publisher   VARCHAR NOT NULL
);
CREATE TABLE r_records (
  id          BIGINT PRIMARY KEY,
  species_id  INTEGER NOT NULL REFERENCES r_species (species_id),
  dataset_key VARCHAR NOT NULL REFERENCES r_datasets (dataset_key),
  license     VARCHAR NOT NULL
);
INSERT INTO r_species SELECT DISTINCT species_id, common_name FROM records_flat;
INSERT INTO r_datasets SELECT DISTINCT dataset_key, title, publisher FROM records_flat;
INSERT INTO r_records SELECT id, species_id, dataset_key, license FROM records_flat;
CREATE VIEW r_joined AS
SELECT r.id, r.species_id, s.common_name, r.dataset_key, d.title, d.publisher, r.license
FROM r_records AS r
JOIN r_species AS s ON s.species_id = r.species_id
JOIN r_datasets AS d ON d.dataset_key = r.dataset_key;
SELECT (SELECT count(*) FROM r_species) AS species,
       (SELECT count(*) FROM r_datasets) AS datasets,
       (SELECT count(*) FROM r_records) AS records,
       (SELECT count(*) FROM (SELECT * FROM records_flat EXCEPT SELECT * FROM r_joined)) AS lost,
       (SELECT count(*) FROM (SELECT * FROM r_joined EXCEPT SELECT * FROM records_flat)) AS added;
