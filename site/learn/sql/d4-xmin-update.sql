-- q: d4-xmin-update
-- status: ran
-- engine: postgis
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
SELECT id, month, xmin::text = pg_current_xact_id()::xid::text AS written_by_this_transaction
FROM occurrences
WHERE id IN (6004132305, 6004132353)
ORDER BY id;
