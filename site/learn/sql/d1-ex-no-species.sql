-- q: d1-ex-no-species
-- status: ran
-- after: d1-ex
-- expect: error Violates foreign key constraint
INSERT INTO species_photos
VALUES (1000, 1000, 'https://example.org/dracula-ant.jpg', 'CC BY 4.0', 'A. Photographer');
