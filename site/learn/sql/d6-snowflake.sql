-- q: d6-snowflake
-- status: ran
-- engine: postgis
-- after: d6-star-dim-species, d6-star-dim-country, d6-star-dim-dataset, d6-star-dim-year, d6-star-fact-records
SELECT star.class, star.records AS star_records, snowflake.records AS snowflake_records
FROM (
  SELECT sp.class, count(*) AS records
  FROM fact_records AS f
  JOIN dim_species AS sp ON sp.species_id = f.species_id
  GROUP BY sp.class
) AS star
JOIN (
  SELECT c.name AS class, count(*) AS records
  FROM occurrences AS o
  JOIN species AS s ON s.id = o.species_id
  JOIN taxa AS g ON g.name = s.genus
  JOIN taxa AS fam ON fam.name = g.parent_name
  JOIN taxa AS ord ON ord.name = fam.parent_name
  JOIN taxa AS c ON c.name = ord.parent_name
  GROUP BY c.name
) AS snowflake ON snowflake.class = star.class
ORDER BY star.class;
