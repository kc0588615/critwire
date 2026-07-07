# Manual verification scripts

`verify-isolation.mjs` — tenant-isolation smoke suite. Boot the app
(`pnpm dev` or the standalone build) against a DB that has the Phase 1
first user (dev@critwire.local), then run:

```bash
node tests/manual/verify-isolation.mjs
```

It is idempotent: fixtures are find-or-create.
