-- q: d4-isolation
-- status: untested: needs two sessions
-- engine: postgis
-- window A
BEGIN ISOLATION LEVEL REPEATABLE READ;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL
-- window B
UPDATE occurrences SET month = 1 WHERE id = 6004132305;  -- committed at once
-- window A
SELECT month FROM occurrences WHERE id = 6004132305;     -- still NULL: one snapshot for the whole transaction
-- fails: could not serialize access due to concurrent update
UPDATE occurrences SET month = 2 WHERE id = 6004132305;
ROLLBACK;
-- window B: undo the change
UPDATE occurrences SET month = NULL WHERE id = 6004132305;
