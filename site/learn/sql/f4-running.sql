-- q: f4-running
-- status: ran
SELECT year, count(*) AS records,
       count(*) - lag(count(*)) OVER (ORDER BY year) AS change,
       sum(count(*)) OVER (ORDER BY year ROWS UNBOUNDED PRECEDING) AS running_total
FROM occurrences
WHERE species_id = 48 AND year >= 2010
GROUP BY year
ORDER BY year;
