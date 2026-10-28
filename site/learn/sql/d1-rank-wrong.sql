-- q: d1-rank-wrong
-- status: ran
-- engine: postgis
-- after: d1-rank-fk
-- expect: error violates foreign key constraint "species_genus_rank_fkey"
UPDATE species SET genus = 'Felidae' WHERE id = 25;
