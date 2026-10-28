-- q: d1-fk-genus
-- status: ran
-- expect: error Violates foreign key constraint
INSERT INTO species (id, slug, scientific_name, common_name, genus, range_status)
VALUES (1000, 'dracula-ant', 'Dracula ant', 'Dracula Ant', 'Dracula', 'ok');
