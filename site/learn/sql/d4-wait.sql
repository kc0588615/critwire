-- q: d4-wait
-- status: untested: needs two sessions
-- engine: postgis
-- window A
BEGIN;
UPDATE occurrences SET month = 7 WHERE id = 6004132305;
-- window B
BEGIN;
SELECT month FROM occurrences WHERE id = 6004132305;     -- NULL, at once: B reads the old version
-- waits: A holds the row's lock
UPDATE occurrences SET month = 8 WHERE id = 6004132305;
-- window A
ROLLBACK;                                                -- now B's UPDATE finishes: UPDATE 1
-- window B
SELECT month FROM occurrences WHERE id = 6004132305;     -- 8
ROLLBACK;
