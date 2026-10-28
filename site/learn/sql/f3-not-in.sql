-- q: f3-not-in
-- status: ran
SELECT 'BR' NOT IN ('AR', NULL) AS not_in, 'BR' IN ('BR', NULL) AS is_in;
