# Manual verification scripts

`verify-isolation.mjs` — tenant-isolation smoke suite. Boot the app
(`pnpm dev` or the standalone build) against a DB that has the Phase 1
first user (dev@critwire.local), then run:

```bash
node tests/manual/verify-isolation.mjs
```

It is idempotent: fixtures are find-or-create.

`verify-phase3.mjs` — landing page blocks, publish/unpublish flow,
on-demand revalidation, 404s, media upload. Requires the Phase 2
fixtures (run verify-isolation.mjs first on a fresh DB).

`verify-phase4.mjs` — patch notes feed/pagination/detail/RSS +
revalidation. Requires Phase 2/3 fixtures.

`verify-phase5.mjs` — issue tracker filters/board/detail + voting
(toggle, per-token uniqueness, tampered cookies). Requires Phase 2-4
fixtures.

`verify-phase6.mjs` — public issue report form, report-to-issue
promotion hook, contact form routing, and jobs queue execution. Requires
Phase 2-5 fixtures and a standalone or dev server on port 3000.
