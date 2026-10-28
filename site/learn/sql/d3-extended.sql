-- q: d3-extended
-- status: ran
-- engine: postgis
CREATE STATISTICS occurrences_species_country (mcv) ON species_id, country_code FROM occurrences;
SET LOCAL default_statistics_target = 1000;
ANALYZE occurrences;
SELECT s.most_common_vals[i][1] AS species_id, s.most_common_vals[i][2] AS country_code,
       round(s.most_common_freqs[i] * c.reltuples) AS planner_estimate
FROM pg_stats_ext AS s
CROSS JOIN generate_subscripts(s.most_common_freqs, 1) AS i
JOIN pg_class AS c ON c.oid = 'occurrences'::regclass
WHERE s.statistics_name = 'occurrences_species_country'
  AND s.most_common_vals[i][1] = '48'
ORDER BY planner_estimate DESC;
