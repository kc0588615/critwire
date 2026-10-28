-- q: d1-ex
-- status: ran
CREATE TABLE species_photos (
  photo_id   INTEGER PRIMARY KEY,
  species_id INTEGER NOT NULL REFERENCES species (id),
  url        VARCHAR NOT NULL UNIQUE,
  license    VARCHAR NOT NULL CHECK (license LIKE 'CC%' OR license = 'Public domain'),
  credit     VARCHAR NOT NULL CHECK (trim(credit) <> '')
);
INSERT INTO species_photos
SELECT row_number() OVER (ORDER BY id), id, photo_url, photo_license, photo_credit
FROM species
WHERE photo_url IS NOT NULL;
SELECT count(*) AS photos, count(DISTINCT species_id) AS species, count(DISTINCT license) AS licenses
FROM species_photos;
