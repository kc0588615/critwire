-- q: d6-star-dim-species
-- status: ran
-- engine: postgis
CREATE TABLE dim_species (
  species_id      INTEGER PRIMARY KEY,
  scientific_name VARCHAR NOT NULL,
  common_name     VARCHAR NOT NULL,
  class           VARCHAR NOT NULL,
  order_name      VARCHAR NOT NULL,
  family          VARCHAR NOT NULL,
  genus           VARCHAR NOT NULL
);
INSERT INTO dim_species
SELECT s.id, s.scientific_name, s.common_name, t.class, t.order_name, t.family, t.genus
FROM species AS s
JOIN species_taxonomy AS t ON t.species_id = s.id;
SELECT count(*) AS species, count(DISTINCT class) AS classes, count(DISTINCT family) AS families
FROM dim_species;
