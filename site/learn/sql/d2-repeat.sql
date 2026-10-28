-- q: d2-repeat
-- status: ran
SELECT g.parent_name AS family, count(*) AS animals
FROM species AS s
JOIN taxa AS g ON g.name = s.genus
GROUP BY g.parent_name
HAVING count(*) > 1
ORDER BY animals DESC, family;
