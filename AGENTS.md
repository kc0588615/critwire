# Critwire — Indie Game Developer Portal

Multi-tenant white-label SaaS: the **public ops layer for an indie game**.
Each studio gets one hosted, branded portal: game website + patch notes +
public issue tracker with player voting + contact form. Built for a solo
founder selling B2B — every decision minimizes operational overhead and
maximizes shipping velocity.

**Payload CMS IS the app.** Not a CMS bolted onto a custom app. Payload
provides auth, admin panel, collections, access control, hooks, rich text
(Lexical), media, jobs queue, and API generation. Custom code lives in
Payload's extension points and in public-facing Next.js routes colocated
in the same project.

## Docs map — read before working in these areas

| Doc | Read when |
| --- | --- |
| `docs/architecture.md` | Deployment, Docker, domain resolution, rendering/ISR, data access model, project structure |
| `docs/patterns.md` | Writing any collection, hook, access control, Server Component, job, or validation code |
| `docs/features.md` | Product scope, collections/fields, issue tracker + voting behavior, contact form, pricing tiers, build phases |
| `docs/integrations.md` | R2, Upstash, Resend, Stripe, Sentry, Turnstile, Cloudflare, PgBouncer, backups, env vars |

## Stack

- **Framework:** Payload CMS 3.73.0+ inside Next.js. TypeScript strict.
- **Next.js version:** 16.2.x (pinned exact in `package.json`; never
  "latest").
- **Runtime:** Node.js 24.x LTS.
- **DB:** PostgreSQL 16 via `@payloadcms/db-postgres` (Drizzle inside),
  PgBouncer in front (transaction mode).
- **UI:** TailwindCSS + shadcn/ui. URL state via nuqs.
- **Deploy:** single Hetzner VPS (CPX31, Virginia), Docker Compose
  (Postgres + PgBouncer + app), Nginx, Cloudflare in front. No Vercel.
- **Plugins:** `@payloadcms/plugin-multi-tenant`, `@payloadcms/storage-s3`
  (R2, region `auto`), `@payloadcms/richtext-lexical`,
  admin Issues kanban via DnD-Kit + Payload `orderable` (not a
  separate marketplace plugin).

**Not used — Payload covers these:** Clerk, Prisma, TipTap, Trigger.dev,
custom `forTenant()` / `ServiceContext` / `proxy.ts` patterns, Vercel.
Don't add them.

## Non-negotiable rules

1. **Payload conventions over custom patterns.** Hooks for business
   logic, access control functions for authorization, Local API
   (`payload.find` / `payload.create`) for all data access. React
   components never query the DB directly.
2. **Tenant scoping goes through the multi-tenant plugin.** Never
   hand-roll tenant filtering. The one escape hatch — `payload.db.drizzle`
   for complex queries — must include explicit tenant scoping.
3. **Zod validation at every public API boundary.**
4. **Every hook that mutates published content calls `revalidatePath()` /
   `revalidateTag()` after the write.** Timed ISR is a fallback only.
5. **Server Components + Server Actions + `router.refresh()` by
   default.** No SWR/TanStack Query unless a surface truly needs
   client-side freshness or optimistic state.
6. **No microservices, no speculative abstraction, no infrastructure
   that managed services already handle.** Modular monolith.
7. **Access control on every collection** — no exceptions.
8. Rate-limit (Upstash) + Turnstile on all public form endpoints.
9. Generic 404 on unknown/unverified custom domains — no info leakage.

## Scope guardrail

Every feature must answer yes to both: (1) does it help a player stay
informed, report an issue, or find the game? (2) does it help a small
studio present their game professionally with less overhead? The product
is NOT a docs platform, ticketing system, forum, Discord replacement,
sprint board, storefront, game backend, telemetry vendor, or SDK.
Aggregation-first: link out to the studio's existing tools rather than
building native features.

## Build process

Nine sequential phases (full detail in `docs/features.md`). Each phase
must be deployable. **Stop after each phase and wait for confirmation.**
Do not build custom domains (Phase 8) or billing (Phase 9) before
Phases 1–7 have shipped and real users have touched the core product.

Output expectations per phase: list files created/changed; code is
production-oriented and minimal, with error handling and Sentry capture
where appropriate.

## Commands

- `pnpm dev` — dev server (needs Postgres running and `.env`)
- `pnpm build` — production build (standalone output + sitemap)
- `pnpm exec tsc --noEmit` — typecheck
- `pnpm lint` — eslint
- `pnpm generate:types` — regenerate `src/payload-types.ts` after any
  collection change (commit the result)
- `pnpm generate:importmap` — regenerate admin import map after adding
  admin components
- `pnpm payload migrate:create <name>` — create a migration after
  schema changes (commit it; prod runs them on boot via `prodMigrations`)
- `pnpm payload migrate` — apply migrations locally
- `pnpm test` — `test:int`, then `test:e2e`
- `pnpm test:e2e` — Playwright against a fresh production build on the
  disposable E2E database (see Testing)
- `pnpm test:int` — vitest; the three int files, no database needed
- `docker compose up -d --build` — full stack (see `docs/deploy.md`)

Local Postgres for dev: `DATABASE_URL` in `.env` must point at a running
Postgres 16 (native on the agent VPS; `docker compose up -d postgres`
on machines with Docker, exposed on `localhost:5432` by
`docker-compose.override.yml`). Note: running dev/tests uses Payload's
dev push and records a `dev` row in `payload_migrations`, after which
`pnpm payload migrate` and `pnpm build` (which boots Payload during
page-data collection) block on an interactive confirmation prompt —
delete that row first: `delete from payload_migrations where
name='dev'`.

## Testing

- Never write unit tests after you write code.
- Highly prefer E2E tests as the sole testing mechanism. Use them to
  verify complex features work. At the end of E2E tests, produce a
  verifiable and repeatable artifact.
- If you must test a system in isolation, first write down all the ways
  it could fail, then write the code.

How the E2E suite works:

- `pnpm test:e2e` needs `E2E_DATABASE_URL` pointing at a dedicated
  database whose name ends in `_e2e`. That database is **dropped and
  re-migrated on every run** (`payload migrate:fresh`); the config
  refuses any other name, or the same database as `DATABASE_URL`. Each
  run builds the app and serves it with `next start`.
- The artifact is `playwright-report/`: a trace and screenshots for
  every test. Open it with `pnpm exec playwright show-report`.
- Seed through REST in the `setup` project (`tests/e2e/auth.setup.ts`
  creates the super admin, two studios and their users). Each spec
  creates the game projects it needs through the REST factories in
  `tests/e2e/support/fixtures.ts`, so specs never depend on each
  other's data.

Int tests (`tests/int`) exist only for invariants E2E can't reach:

- `site-generator` — needs a fake model: E2E has no OpenAI key and can't
  see the model's input or force its failures.
- `site-config-parity` — checks the Zod schema and the Payload field
  tree agree down to every enum option.
- `template-revalidation` — nothing under `/g` is ISR-cached yet, so E2E
  can't observe that writes revalidate the right paths.
