-- q: d5-rls
-- status: ran
-- engine: postgis
-- tx: own
BEGIN;
CREATE ROLE learn_partner_au NOLOGIN;
CREATE ROLE learn_partner_br NOLOGIN;
CREATE ROLE learn_no_policy NOLOGIN;
GRANT USAGE ON SCHEMA learn_curriculum TO learn_partner_au, learn_partner_br, learn_no_policy;
GRANT SELECT ON occurrences TO learn_partner_au, learn_partner_br, learn_no_policy;
ALTER TABLE occurrences ENABLE ROW LEVEL SECURITY;
CREATE POLICY partner_au ON occurrences FOR SELECT TO learn_partner_au USING (country_code = 'AU');
CREATE POLICY partner_br ON occurrences FOR SELECT TO learn_partner_br USING (country_code = 'BR');
CREATE TEMPORARY TABLE seen (reader text PRIMARY KEY, records bigint, species bigint, countries bigint);
GRANT INSERT ON seen TO learn_partner_au, learn_partner_br, learn_no_policy;
INSERT INTO seen
SELECT '(you, the owner)', count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_partner_au;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_partner_br;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
SET ROLE learn_no_policy;
INSERT INTO seen
SELECT current_user, count(*), count(DISTINCT species_id), count(DISTINCT country_code) FROM occurrences;
RESET ROLE;
SELECT reader, records, species, countries FROM seen ORDER BY records DESC, reader;
DROP OWNED BY learn_partner_au, learn_partner_br, learn_no_policy;
ALTER TABLE occurrences DISABLE ROW LEVEL SECURITY;
DROP ROLE learn_partner_au, learn_partner_br, learn_no_policy;
ROLLBACK;
