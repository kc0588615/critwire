-- q: f2-years
-- status: ran
SELECT year, count(*) AS records
FROM occurrences
WHERE year >= 2016
GROUP BY year
ORDER BY year;
