-- q: d1-identity-twice
-- status: ran
-- engine: postgis
-- after: d1-identity
-- expect: error duplicate key value violates unique constraint
INSERT INTO field_notes (species_id, observer, seen_on)
VALUES (48, 'Ana', DATE '2026-03-14');
