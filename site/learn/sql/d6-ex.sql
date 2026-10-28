-- q: d6-ex
-- status: ran
CREATE TABLE dim_decade (
  decade INTEGER PRIMARY KEY,
  label  VARCHAR NOT NULL
);
INSERT INTO dim_decade
SELECT DISTINCT year - year % 10, CAST(year - year % 10 AS VARCHAR) || 's'
FROM occurrences
WHERE year IS NOT NULL
UNION ALL
SELECT -1, 'Unknown';
CREATE TABLE fact_species_decade (
  species_id INTEGER NOT NULL REFERENCES species (id),
  decade     INTEGER NOT NULL REFERENCES dim_decade (decade),
  records    INTEGER NOT NULL,
  PRIMARY KEY (species_id, decade)
);
INSERT INTO fact_species_decade
SELECT species_id, coalesce(year - year % 10, -1), count(*)
FROM occurrences
GROUP BY species_id, coalesce(year - year % 10, -1);
SELECT count(*) AS fact_rows, sum(records) AS records,
       sum(records) = (SELECT count(*) FROM occurrences) AS reconciles,
       sum(records) FILTER (WHERE decade = -1) AS unknown_decade
FROM fact_species_decade;
