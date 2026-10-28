-- q: f1-unknown
-- status: ran
SELECT NULL = NULL AS equal,
       NULL <> 'CC BY 4.0' AS not_equal,
       NULL IS NULL AS is_null,
       coalesce(NULL, 'no photo') AS replaced;
