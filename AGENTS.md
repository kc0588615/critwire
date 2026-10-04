# Critwire — player feedback and updates for indie games

A **player feedback board and updates hub for each indie game**, on a
minimal, themable portal that links back to the studio's own website.
Critwire complements website builders (Carrd, Wix, itch.io, Steam, a
studio's own site) and does not compete with them.

- **Audience:** indie game studios of one to a few people, most of whom
  already have a website.
- **Product:** per game, a feedback board (bugs and ideas, player voting,
  four public stages) plus updates (patch notes with RSS), on a small
  hub at `/g/<game>` in the studio's colours.
- **Open source:** MIT. Self-hosting is free and always will be.
- **Hosted:** open signup, free during early access, with limits that
  keep each site minimal. A paid hosted tier may come later; there's no
  billing work now.
- **Moderation:** submissions are reviewed before they're public by
  default. Auto-publishing is an opt-in per game and still goes through
  the content filter.
- **No AI site generation.**

Multi-tenant: one tenant is one studio. Built for a solo founder, so
every decision minimizes operational overhead and maximizes shipping
velocity.

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
| `docs/features.md` | Product scope, collections/fields, feedback board + voting, public stages, submission review and content filter, Discord, updates, contact form, hosting, build phases |
| `docs/integrations.md` | R2, Upstash, Resend, Sentry, Turnstile, Cloudflare, Discord, the content filter, PgBouncer, backups, env vars |
| `docs/self-hosting.md` | Which services are required, the first super admin, open signup and the hosted limits, upgrade steps |
| `docs/share.md` | The "Put critwire on your site" kit: links, `?ref=` tags, button images, the live badge, the referral counter, Steam, what works where |
| `docs/embed.md` | The embed: the loader `/embed/v1.js` and its attributes, the board and updates widgets, voting through the item page, caching, the JSON feeds' contracts, privacy, protocol v1, what works where |
| `docs/discord.md` | Discord: `/feedback` and Send to critwire, posts to a studio's channel, the Discord tab, what's stored, self-hosting your own Discord app step by step, troubleshooting, limits |

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
informed, report a bug, suggest an idea, or find the game? (2) does it
help a small studio hear from and answer its players with less
overhead? The product is NOT a website builder, docs platform,
ticketing system, forum, Discord replacement, sprint board, storefront,
game backend, telemetry vendor, or SDK. Aggregation-first: link out to
the studio's existing site and tools rather than building native
features.

## Build process

Nine sequential phases (full detail in `docs/features.md`). Each phase
must be deployable. **Stop after each phase and wait for confirmation.**
The owner chose open signup from day one (2026-09-29), so Phase 8 (open
signup, without invites) ships alongside Phases 1–7. Do not build custom
domains (Phase 9) before real users have touched the core product.
There is no billing phase; a paid hosted tier may come later.

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
- `pnpm test:int` — vitest; the int files, no database needed
- `pnpm screenshots` — design screenshots (the Critter Connect demo's
  hub, feedback list and board, both submit forms and an update, under
  the Critter Connect and Riso themes, plus the home page `/`, signup
  and onboarding, and the `reach` group: the share kit, the admin
  dashboard and Share tab in light and dark, and the buttons and badges
  on a host page; and the `embed` group: the board, updates, floating
  button and its dialog on a studio's page, light and dark; and the
  `discord` group: the Share tab's Discord tab, not linked and linked,
  light and dark; 1440 and 390 px) against a production build on port
  3200; needs `SHOTS_SET=before|after` and an absolute `SHOTS_DIR`
  (`SHOTS_THEMES` picks groups). Drops the
  `_e2e` database like `pnpm test:e2e`, so never run the two together
  (see `playwright.screenshots.config.ts`)
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
- Two servers share that build and database. `E2E_PORT` (3100) is the
  hosted profile: open signup on, limits off. `E2E_PORT + 2` (3102) is
  the self-hosted profile: signup off, email going only to the log,
  and low limits (2 games, 1 MB of media, 3 public feedback items), for
  the specs that check a limit or what a self-hosted instance shows.
  The webhook sink listens on `E2E_PORT + 1`.
- An Upstash stand-in (`tests/e2e/support/fakeUpstash.ts`) listens on
  `E2E_PORT + 3`, and only the 3100 server uses it, so that server runs
  the real Upstash client. It answers the rate-limit calls as
  "allowed" and any command the app isn't known to send with an error.
  The 3102 server has no Upstash, as a self-hosted instance may not.
- A Discord stand-in (`tests/e2e/support/fakeDiscord.ts`) listens on
  `E2E_PORT + 4` and is the 3100 server's `DISCORD_API_BASE_URL`, so
  nothing calls the real Discord; it answers any call the app isn't
  known to make with a 404 and logs it, and lists what it received at
  `GET /debug/requests`. Specs sign interactions with a fixed-seed
  Ed25519 test key pair (`DISCORD_TEST_KEYS` in `support/env.ts`,
  helpers in `support/discord.ts`). The 3102 server runs with Discord off.
- Without Resend, the 3100 server writes every email to
  `test-results/outbox/` as JSON (`EMAIL_OUTBOX_DIR`), and specs read
  verification and reset links from there (`tests/e2e/support/email.ts`).
- The artifact is `playwright-report/`: a trace and screenshots for
  every test. Open it with `pnpm exec playwright show-report`.
- Seed through REST in the `setup` project (`tests/e2e/auth.setup.ts`
  creates the super admin, two studios and their users). Each spec
  creates the game projects it needs through the REST factories in
  `tests/e2e/support/fixtures.ts`, so specs never depend on each
  other's data.
- Specs reach the database directly only through
  `tests/e2e/support/db.ts`, and only for what REST deliberately can't
  do (putting an acceptance or a timestamp into a past state) and for
  whole-database scans. It refuses any database not ending in `_e2e`.

Int tests (`tests/int`) exist only for invariants E2E can't reach:

- `issue-revalidation` — an issue write that only moves a kanban card
  must not revalidate the hub or the update it shipped in, and E2E
  can't observe a revalidation that didn't happen.
- `content-screen` — the content filter (`src/lib/moderation/screenText.ts`),
  one test per failure mode: missed words and leetspeak, false positives
  on game words, the link count, shorteners and look-alike hosts, and
  the reasons' wording. E2E can't enumerate these inputs cheaply.
- `nginx-headers` — `nginx.conf` must not set `X-Frame-Options`, a
  `Content-Security-Policy` or a `Cross-Origin-Opener-Policy`, nor
  hide the app's CSP or COOP, and keeps its four other security
  headers. The app owns its framing policy and COOP
  (`next.config.ts`), and E2E serves `next start` without nginx, so
  only a static check sees the proxy's headers.
- `embed-loader` — the loader, `public/embed/v1.js`, stays under the
  Brief's 5 KB gzipped (zlib's default level) and never names the APIs
  it must not use: cookies, storage, `fetch(`, `XMLHttpRequest`,
  `sendBeacon`, `document.title` or `.innerHTML`. It's pasted into
  studios' sites and long cached, and E2E can't see a size budget.
  `prebuild` runs this file alone, so `pnpm build` (and the Docker
  build) stops on a loader that breaks it.
