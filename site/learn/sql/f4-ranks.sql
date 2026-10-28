-- q: f4-ranks
-- status: ran
SELECT species_id, count(*) AS records,
       row_number() OVER (ORDER BY count(*) DESC, species_id) AS by_row,
       rank() OVER (ORDER BY count(*) DESC) AS by_rank,
       dense_rank() OVER (ORDER BY count(*) DESC) AS by_dense_rank
FROM occurrences
GROUP BY species_id
ORDER BY by_row
LIMIT 16;
