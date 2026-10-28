-- q: d1-identity
-- status: ran
-- engine: postgis
CREATE TABLE field_notes (
  note_id    integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  species_id integer NOT NULL REFERENCES species (id),
  observer   text NOT NULL CHECK (observer <> ''),
  seen_on    date NOT NULL,
  UNIQUE (species_id, observer, seen_on)
);
INSERT INTO field_notes (species_id, observer, seen_on)
VALUES (48, 'Ana', DATE '2026-03-14'), (48, 'Ana', DATE '2026-03-15'), (25, 'Ben', DATE '2026-03-14');
SELECT note_id, species_id, observer, seen_on
FROM field_notes
ORDER BY note_id;
