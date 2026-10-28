-- q: f4-ex
-- status: ran
WITH per_species AS (
  SELECT t.class, o.species_id, count(*) AS records
  FROM occurrences AS o
  JOIN species_taxonomy AS t ON t.species_id = o.species_id
  GROUP BY t.class, o.species_id
),
ranked AS (
  SELECT class, species_id, records,
         row_number() OVER (PARTITION BY class ORDER BY records DESC, species_id) AS place,
         round(100.0 * records / sum(records) OVER (PARTITION BY class), 1) AS share_pct
  FROM per_species
)
SELECT class, species_id, records, place, share_pct
FROM ranked
WHERE place <= 3
ORDER BY class, place;
