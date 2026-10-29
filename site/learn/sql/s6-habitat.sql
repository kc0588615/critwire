-- q: s6-habitat
-- status: ran
-- engine: postgis
WITH records AS (
  SELECT oh.habitat_code, count(*) AS records
  FROM occurrences AS o
  JOIN occurrence_habitats AS oh ON oh.occurrence_id = o.id
  WHERE o.country_code = 'CR'
  GROUP BY oh.habitat_code
)
SELECT ch.habitat_code, hc.name, ch.est_area_km2, coalesce(r.records, 0) AS records,
       round((coalesce(r.records, 0) / sum(coalesce(r.records, 0)) OVER ())
             / (ch.est_area_km2 / sum(ch.est_area_km2) OVER ()), 2) AS record_ratio
FROM country_habitats AS ch
LEFT JOIN records AS r ON r.habitat_code = ch.habitat_code
LEFT JOIN habitat_classes AS hc ON hc.code = ch.habitat_code
WHERE ch.country_code = 'CR'
ORDER BY ch.est_area_km2 DESC, ch.habitat_code;
