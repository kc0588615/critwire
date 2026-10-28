-- q: d1-same-id
-- status: ran
-- expect: error violates primary key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (25, 'siberian-tiger', 'Panthera tigris altaica', 'Siberian Tiger', 'Panthera', 'ok');
