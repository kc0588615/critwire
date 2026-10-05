-- Migration-check assertions for legal-launch (plan S14, Failure modes
-- MC1-MC9).
--
-- Run with psql -v ON_ERROR_STOP=1 on the copy of the fixtures database
-- after `pnpm payload migrate` applied the four migrations. Raises on the
-- first mismatch; prints one NOTICE per passed group. On the unmigrated
-- database it must raise.

DO $$
DECLARE
  cc game_projects%ROWTYPE;
  n integer;
  t record;
BEGIN
  -- MC1. Every migration ran.
  SELECT count(*) INTO n FROM payload_migrations WHERE name IN (
    '20261004_225524_legal_acceptances',
    '20261004_234836_contact_job_sweep',
    '20261005_000942_users_deleted',
    '20261005_001725_drop_submitter_email'
  );
  IF n <> 4 THEN RAISE EXCEPTION 'MC1: expected the four migrations in payload_migrations, found %', n; END IF;
  RAISE NOTICE 'ok MC1: the four migrations are recorded';

  -- MC2. The email column is gone; the report stays.
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'issue_reports' AND column_name = 'submitter_email') THEN
    RAISE EXCEPTION 'MC2: issue_reports.submitter_email still exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM issue_reports WHERE title = 'Clue trail disappears after fast travel') THEN
    RAISE EXCEPTION 'MC2: the seeded report is gone';
  END IF;
  RAISE NOTICE 'ok MC2: submitter_email dropped; the seeded report stays';

  -- MC3. The seed's email is nowhere in the database.
  FOR t IN SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('SELECT count(*) FROM %I r WHERE r::text ILIKE %L', t.table_name, '%player@example.com%') INTO n;
    IF n > 0 THEN RAISE EXCEPTION 'MC3: player@example.com is still in % (% rows)', t.table_name, n; END IF;
  END LOOP;
  RAISE NOTICE 'ok MC3: player@example.com is in no table';

  -- MC4. legal_acceptances: empty, NOT NULL user with its foreign key and
  -- index, both versions and digests, no IP column.
  IF to_regclass('public.legal_acceptances') IS NULL THEN
    RAISE EXCEPTION 'MC4: legal_acceptances is missing';
  END IF;
  EXECUTE 'SELECT count(*) FROM legal_acceptances' INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'MC4: legal_acceptances holds % rows', n; END IF;
  IF (SELECT is_nullable FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'legal_acceptances' AND column_name = 'user_id') IS DISTINCT FROM 'NO' THEN
    RAISE EXCEPTION 'MC4: legal_acceptances.user_id is missing or nullable';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey)
    WHERE c.conrelid = 'public.legal_acceptances'::regclass AND c.contype = 'f'
      AND c.confrelid = 'public.users'::regclass AND c.confdeltype = 'n'
      AND a.attname = 'user_id' AND cardinality(c.conkey) = 1
  ) THEN
    RAISE EXCEPTION 'MC4: no foreign key from legal_acceptances.user_id to users ON DELETE SET NULL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    WHERE i.indrelid = 'public.legal_acceptances'::regclass AND a.attname = 'user_id'
  ) THEN
    RAISE EXCEPTION 'MC4: no index on legal_acceptances.user_id';
  END IF;
  SELECT count(*) INTO n FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'legal_acceptances'
    AND column_name IN ('terms_version', 'privacy_version', 'terms_digest', 'privacy_digest');
  IF n <> 4 THEN RAISE EXCEPTION 'MC4: legal_acceptances has % of the 4 version and digest columns', n; END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'legal_acceptances' AND column_name ILIKE '%ip%') THEN
    RAISE EXCEPTION 'MC4: legal_acceptances has a column naming ip';
  END IF;
  RAISE NOTICE 'ok MC4: legal_acceptances is empty, keyed and indexed on user_id, with versions and digests and no IP';

  -- MC5. The lock table can point at an acceptance.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'payload_locked_documents_rels'
                   AND column_name = 'legal_acceptances_id') THEN
    RAISE EXCEPTION 'MC5: payload_locked_documents_rels.legal_acceptances_id is missing';
  END IF;
  RAISE NOTICE 'ok MC5: payload_locked_documents_rels.legal_acceptances_id exists';

  -- MC6. users.deleted exists and is false for every existing user; the
  -- fixture's owner keeps its membership.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'deleted') THEN
    RAISE EXCEPTION 'MC6: users.deleted is missing';
  END IF;
  EXECUTE 'SELECT count(*) FROM users WHERE deleted IS DISTINCT FROM false' INTO n;
  IF n <> 0 THEN RAISE EXCEPTION 'MC6: % existing users are not deleted = false', n; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM users u
    JOIN users_tenants m ON m._parent_id = u.id
    JOIN tenants s ON s.id = m.tenant_id AND s.slug = 'critwire-demo'
    JOIN users_tenants_roles r ON r.parent_id = m.id AND r.value = 'owner'
    WHERE u.email = 'owner@studio.example' AND u.name = 'Studio Owner'
  ) THEN
    RAISE EXCEPTION 'MC6: the fixture owner or its membership changed';
  END IF;
  RAISE NOTICE 'ok MC6: users.deleted is false for every user; the owner keeps its membership';

  -- MC7. The jobs schema the sweep needs.
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public' AND table_name = 'payload_jobs' AND column_name = 'meta') THEN
    RAISE EXCEPTION 'MC7: payload_jobs.meta is missing';
  END IF;
  IF to_regclass('public.payload_jobs_stats') IS NULL THEN
    RAISE EXCEPTION 'MC7: payload_jobs_stats is missing';
  END IF;
  SELECT count(*) INTO n FROM pg_enum e JOIN pg_type ty ON ty.oid = e.enumtypid
  WHERE ty.typname IN ('enum_payload_jobs_task_slug', 'enum_payload_jobs_log_task_slug')
    AND e.enumlabel = 'purge-contact-jobs';
  IF n <> 2 THEN RAISE EXCEPTION 'MC7: purge-contact-jobs is in % of the 2 task-slug enums', n; END IF;
  RAISE NOTICE 'ok MC7: payload_jobs.meta, payload_jobs_stats and purge-contact-jobs in both enums';

  -- MC8. The pending contact job is untouched.
  SELECT count(*) INTO n FROM payload_jobs j
  JOIN game_projects p ON p.slug = 'critter-connect'
  WHERE j.task_slug = 'email-contact-form' AND j.completed_at IS NULL
    AND j.input = jsonb_build_object(
      'email', 'fan@players.example',
      'gameSlug', 'critter-connect',
      'message', 'The binder crashes when I sort by habitat.',
      'name', 'A Fan',
      'projectID', p.id::text,
      'subject', 'migcheck pending contact');
  IF n <> 1 THEN RAISE EXCEPTION 'MC8: found % unchanged pending contact jobs, expected 1', n; END IF;
  RAISE NOTICE 'ok MC8: the pending contact job and its input are unchanged';

  -- MC9. The studio's content stays.
  SELECT g.* INTO cc FROM game_projects g JOIN tenants s ON s.id = g.tenant_id
  WHERE g.slug = 'critter-connect' AND s.slug = 'critwire-demo';
  IF cc.id IS NULL THEN RAISE EXCEPTION 'MC9: Critter Connect is gone'; END IF;
  SELECT count(*) INTO n FROM issues WHERE game_project_id = cc.id AND slug IN (
    'card-flicker-on-open', 'sort-binder-by-habitat', 'clue-markers-drift', 'save-loses-clue-progress');
  IF n <> 4 THEN RAISE EXCEPTION 'MC9: % of the 4 seeded issues remain', n; END IF;
  IF NOT EXISTS (SELECT 1 FROM patch_notes WHERE game_project_id = cc.id AND slug = 'v0-1-0-launch') THEN
    RAISE EXCEPTION 'MC9: the seeded update is gone';
  END IF;
  SELECT count(*) INTO n FROM media WHERE tenant_id = cc.tenant_id
    AND filename IN ('field-binder-hero.png', 'discovery-card.png');
  IF n <> 2 THEN RAISE EXCEPTION 'MC9: % of the 2 seeded media rows remain', n; END IF;
  RAISE NOTICE 'ok MC9: the game, its 4 issues, its update and its 2 media rows stay';
END $$;
