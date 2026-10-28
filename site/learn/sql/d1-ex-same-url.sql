-- q: d1-ex-same-url
-- status: ran
-- after: d1-ex
-- expect: error PRIMARY KEY or UNIQUE constraint violation
INSERT INTO species_photos
SELECT 1000, id, photo_url, photo_license, photo_credit FROM species WHERE id = 74;
