-- Migration-check fixtures for legal-launch (plan S14).
--
-- Written against the schema at 3054287 (what production runs), on a
-- database that ran the Critter Connect seed. Adds what the seed alone
-- lacks: a studio user with a membership, and a pending contact job whose
-- input holds an email. The seed's own report with player@example.com is
-- checked, not added. Rows are found by slug or title, never by IDs.
-- Run once, with psql -v ON_ERROR_STOP=1.

BEGIN;

-- The seed's report, whose email drop_submitter_email removes.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM issue_reports
                 WHERE title = 'Clue trail disappears after fast travel'
                   AND submitter_email = 'player@example.com') THEN
    RAISE EXCEPTION 'the seed''s report with player@example.com is missing';
  END IF;
END $$;

-- A verified studio user, owner of the studio that holds Critter Connect
-- (the seed puts its game in `critwire-demo`). users_deleted must give it
-- `deleted = false` and keep its membership.
INSERT INTO users (name, email, salt, hash, _verified)
VALUES ('Studio Owner', 'owner@studio.example', 'migcheck-salt', 'migcheck-hash', true);

INSERT INTO users_roles ("order", parent_id, value)
SELECT 1, u.id, 'user' FROM users u WHERE u.email = 'owner@studio.example';

INSERT INTO users_tenants (_order, _parent_id, id, tenant_id)
SELECT 1, u.id, substr(md5('migcheck-membership'), 1, 24), t.id
FROM users u, tenants t
WHERE u.email = 'owner@studio.example' AND t.slug = 'critwire-demo';

INSERT INTO users_tenants_roles ("order", parent_id, value)
VALUES (1, substr(md5('migcheck-membership'), 1, 24), 'owner');

-- An undelivered contact message, queued as the contact route queues it.
-- contact_job_sweep must leave it, and its input, untouched.
INSERT INTO payload_jobs (input, task_slug, queue, total_tried)
SELECT jsonb_build_object(
  'email', 'fan@players.example',
  'gameSlug', p.slug,
  'message', 'The binder crashes when I sort by habitat.',
  'name', 'A Fan',
  'projectID', p.id::text,
  'subject', 'migcheck pending contact'
), 'email-contact-form', 'default', 1
FROM game_projects p
WHERE p.slug = 'critter-connect';

COMMIT;
