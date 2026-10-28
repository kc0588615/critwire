-- q: f4-years
-- status: ran
SELECT year, count(*) AS records,
       rank() OVER (ORDER BY count(*) DESC) AS place,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS share_pct
FROM occurrences
WHERE year >= 2000
GROUP BY year
ORDER BY place, year;
