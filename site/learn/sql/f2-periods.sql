-- q: f2-periods
-- status: ran
SELECT basis_of_record,
       sum(CASE WHEN year < 1900 THEN 1 ELSE 0 END) AS before_1900,
       sum(CASE WHEN year BETWEEN 1900 AND 1999 THEN 1 ELSE 0 END) AS from_1900,
       sum(CASE WHEN year >= 2000 THEN 1 ELSE 0 END) AS from_2000,
       count(*) - count(year) AS no_year
FROM occurrences
GROUP BY basis_of_record
ORDER BY basis_of_record;
