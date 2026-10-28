-- q: d6-star-dim-habitat-class
-- status: ran
-- engine: postgis
CREATE TABLE dim_habitat_class (
  habitat_code INTEGER PRIMARY KEY,
  name         VARCHAR NOT NULL,
  level1_code  INTEGER NOT NULL,
  level1_name  VARCHAR NOT NULL
);
INSERT INTO dim_habitat_class
SELECT h.code, h.name, coalesce(h.level1_code, h.code), coalesce(p.name, h.name)
FROM habitat_classes AS h
LEFT JOIN habitat_classes AS p ON p.code = h.level1_code;
SELECT count(*) AS classes, count(DISTINCT level1_code) AS level1_classes
FROM dim_habitat_class;
