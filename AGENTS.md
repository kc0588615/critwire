# Critwire — Indie Game Developer Portal (Build Spec v7)

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

## Stack (v7 — do not reintroduce v6.1 choices)

- **Framework:** Payload CMS 3.73.0+ inside Next.js. TypeScript strict.
- **Next.js version:** 16.2.x required for Payload's Next 16 support. If
  16.2.0 stable is not yet released when scaffolding, **pin 15.4.11** and
  upgrade later — Payload supports both. Verify at phase start; never
  hardcode "latest".
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

**Removed in v7 — never add back:** Clerk, Prisma, TipTap, Trigger.dev,
custom `forTenant()` / `ServiceContext` / `proxy.ts` patterns, Vercel.

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

Output expectations per phase: list files created/changed, full code
(no pseudocode), error handling, Sentry capture where appropriate,
production-oriented and minimal.

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
- `pnpm test` — vitest (int) + playwright (e2e)
- `docker compose up -d --build` — full stack (see `docs/deploy.md`)

Local Postgres for dev: `docker compose up -d postgres` (Docker Desktop
is available in this WSL distro; `docker-compose.override.yml` exposes
it on `localhost:5432`). `DATABASE_URL` in `.env` points at it for
`pnpm dev` and the payload CLI. Note: running dev/tests uses Payload's
dev push and records a `dev` row in `payload_migrations`, after which
`pnpm payload migrate` and `pnpm build` (which boots Payload during
page-data collection) block on an interactive confirmation prompt —
delete that row first: `delete from payload_migrations where
name='dev'`.
