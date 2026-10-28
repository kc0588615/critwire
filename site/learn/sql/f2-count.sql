-- q: f2-count
-- status: ran
SELECT count(*) AS records,
       count(year) AS with_year,
       count(DISTINCT species_id) AS species,
       min(year) AS first_year,
       max(year) AS last_year
FROM occurrences;
