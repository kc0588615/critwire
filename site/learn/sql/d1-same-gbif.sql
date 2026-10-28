-- q: d1-same-gbif
-- status: ran
-- expect: error violates unique constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status, gbif_id)
VALUES (1000, 'bengal-tiger', 'Panthera tigris tigris', 'Bengal Tiger', 'Panthera', 'ok',
        (SELECT gbif_id FROM species WHERE id = 25));
