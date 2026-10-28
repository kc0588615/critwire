-- q: d1-ex-license
-- status: ran
-- after: d1-ex
-- expect: error CHECK constraint failed
INSERT INTO species_photos
VALUES (1000, 74, 'https://example.org/axolotl-2.jpg', 'All rights reserved', 'A. Photographer');
