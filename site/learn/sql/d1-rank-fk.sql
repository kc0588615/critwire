-- q: d1-rank-fk
-- status: ran
-- engine: postgis
ALTER TABLE taxa ADD CONSTRAINT taxa_name_rank_key UNIQUE (name, taxon_rank);
ALTER TABLE species
  ADD COLUMN genus_rank text NOT NULL DEFAULT 'genus' CHECK (genus_rank = 'genus'),
  ADD CONSTRAINT species_genus_rank_fkey FOREIGN KEY (genus, genus_rank) REFERENCES taxa (name, taxon_rank);
SELECT genus_rank, count(*) AS species
FROM species
GROUP BY genus_rank;
