-- q: e4-list-rows
-- status: ran
-- engine: postgis
-- Made up: one animal, places XA and XB, four lists. A person read each whole list and gave it a role, or none
WITH lists (list_title, license, has_role) AS (
  VALUES ('List A', 'CC0 1.0', true),
         ('List B', 'CC BY 4.0', true),
         ('List C', 'CC BY-NC 4.0', true),
         ('Catalogue D', 'CC BY 4.0', false)
), staged (row_no, list_title, place, origin) AS (
  VALUES (1, 'List A', 'XA', 'native'),
         (2, 'List A', 'XB', 'native'),
         (3, 'List B', 'XB', 'introduced'),
         (4, 'List C', 'XB', 'introduced'),
         (5, 'Catalogue D', 'XA', 'introduced')
)
SELECT s.row_no, s.list_title, l.license, s.place, s.origin,
       CASE WHEN l.license NOT IN ('CC0 1.0', 'CC BY 4.0') THEN 'dropped: license'
            WHEN NOT l.has_role THEN 'dropped: list has no role'
            ELSE 'kept' END AS decision
FROM staged AS s
JOIN lists AS l USING (list_title)
ORDER BY s.row_no;
