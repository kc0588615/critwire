-- q: d1-check-taxa
-- status: ran
-- expect: error CHECK constraint failed
INSERT INTO taxa (name, taxon_rank, parent_name)
VALUES ('Dracula', 'genus', NULL);
