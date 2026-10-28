-- q: d2-provenance
-- status: ran
SELECT ss.field, ss.source_name, so.license, so.retrieved
FROM species_sources AS ss
JOIN sources AS so ON so.name = ss.source_name
WHERE ss.species_id = 51
ORDER BY ss.field;
