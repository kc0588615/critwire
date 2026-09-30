# Architecture

## Deployment: single-server model

The entire application runs on one Hetzner VPS (CPX31: 4 vCPU, 8 GB RAM,
160 GB NVMe, ~$15/mo, Virginia/Ashburn):

```
Internet
  → Cloudflare (CDN, DDoS, DNS, SSL termination)
    → Hetzner VPS
      → Nginx (reverse proxy)
        → Docker: Next.js + Payload (port 3000)
        → Docker: PostgreSQL 16 + PgBouncer
```

### Why not Vercel (do not revisit)

Payload is designed as a persistent Node.js server. On serverless:
~7s cold starts, per-invocation DB connection churn, admin panel
timeouts, connection pool exhaustion. Self-hosting puts app and DB on
the same box with sub-millisecond latency. One deployment target, one
`docker compose up`, one thing to monitor.

### Scaling rule

Valid for early-stage validation and initial revenue. When the VPS
becomes a bottleneck, first move: separate Postgres onto managed
Ubicloud PostgreSQL on Hetzner; run the app on a larger VPS or behind
a load balancer. Do not pre-build for this.

## Docker Compose topology

Three services (`docker-compose.yml`):

- **postgres** — `postgres:16-alpine`, named volume `postgres_data`,
  healthcheck via `pg_isready`.
- **pgbouncer** — `edoburu/pgbouncer`, `POOL_MODE: transaction`,
  `MAX_CLIENT_CONN: 200`, `DEFAULT_POOL_SIZE: 20`. Depends on postgres
  healthy.
- **app** — multi-stage Dockerfile build (Next.js + Payload), port 3000,
  `DATABASE_URL` points at **pgbouncer:6432**, not postgres directly.
  Requires `PAYLOAD_SECRET`. Non-root container user. Named volume
  `media` at `/app/media` holds uploads when R2 isn't configured.

Because the app is a persistent server, Payload's built-in job
scheduler works without any cron workaround.

## Payload as the application framework

How Payload replaces the v6.1 custom stack:

| v6.1 (custom) | v7 (Payload) |
| --- | --- |
| Prisma schema + migrations | Collections config → Drizzle |
| Clerk auth + OAuth | Payload Auth |
| Custom `forTenant()` extension | `@payloadcms/plugin-multi-tenant` |
| Service layer + `ServiceContext` | Access control functions + hooks |
| Custom dashboard pages | Payload admin panel + custom views |
| TipTap integration | Lexical rich text + custom blocks |
| Custom R2 presigned uploads | `@payloadcms/storage-s3` (region `auto`) |
| Trigger.dev v4 | Payload Jobs Queue |
| Custom REST/GraphQL API | Payload auto-generated REST + GraphQL |
| `proxy.ts` domain resolution | Next.js rewrites in `next.config.ts` |

## Data access model

```
Public route / Server Action / Admin panel action
  → Payload Local API (payload.find, payload.create, …)
    → Access control functions (tenant scoping, role checks)
      → Drizzle ORM → PgBouncer → PostgreSQL
```

- React components never query the database directly.
- All data access goes through Payload's Local API (server) or REST API
  (public read-only).
- Tenant isolation is enforced automatically by the multi-tenant
  plugin's access control filtering.
- Escape hatch for queries not expressible via Payload's API:
  `payload.db.drizzle` — always with explicit tenant scoping.

Public routes fetch via Local API in Server Components:

```tsx
// app/(public)/g/[gameSlug]/page.tsx
import { getPayload } from 'payload'
import config from '@payload-config'

export default async function HubPage({ params }) {
  const payload = await getPayload({ config })
  const project = await payload.find({
    collection: 'game-projects',
    where: { slug: { equals: params.gameSlug } },
  })
  // render
}
```

## Public URL structure

Built only by `portalPaths` (`src/lib/game-portal/paths.ts`).

```
/g/[gameSlug]                          game hub (identity, latest updates, top feedback)
/g/[gameSlug]/updates                  updates feed (/updates/page/[n] for later pages)
/g/[gameSlug]/updates/[slug]           update detail, with "From your feedback"
/g/[gameSlug]/updates/feed.xml         RSS
/g/[gameSlug]/feedback                 feedback list (?view=board for the four-stage board)
/g/[gameSlug]/feedback/[slug]          feedback item
/g/[gameSlug]/feedback/new             "Bug or idea?" submit form (?type=bug|idea)
/g/[gameSlug]/contact                  contact form
```

`feedback/new` is a static route, so `new` is a reserved item slug.
The old `/issues/*`, `/report` and `/patch-notes/*` URLs redirect
permanently (`redirects.ts`; 308 for the old form's POST).

Every portal page and the layout get their game through
`requirePortalProject(slug)` (`src/lib/game-portal/getGameProject.ts`):
a held game or a suspended studio's game redirects to `/unavailable`,
an unknown slug is a 404. The RSS feed and the submit routes answer 404
for both.

### Accounts, hosting and moderation URLs

```
/unavailable                 a held or suspended portal; names no game and gives no reason
/admin/forgot                "Forgot password?" (a custom Payload view) → POST /forgot-password/submit
/admin/login, /admin/reset/<token>   Payload's own views, in Critwire's styling
```

Only with open signup (`CRITWIRE_OPEN_SIGNUP=1`, `src/lib/hosting.ts`);
otherwise each answers 404:

```
/signup                      email + Turnstile → POST /signup/submit
/verify/<token>              "Choose a password" → POST /verify/submit (verifies, signs in)
/onboarding                  game name, website, store → POST /onboarding/submit
/report-abuse?page=/g/<slug> "Report this page" → POST /report-abuse/submit
```

The submit routes are public form endpoints (`guardPublicForm`), except
onboarding's, which needs a signed-in user. Each answers a browser with
a 303 back to its page (`?submitted=1`, `?error=1`) and a JSON client
with JSON.

## Custom domain resolution (Phase 9)

Resolved at the Next.js level — no separate proxy service:

1. Nginx forwards the request to Next.js.
2. `next.config.ts` `rewrites` (beforeFiles) match on the Host header.
3. Known custom domains rewrite to the `/g/[slug]` route structure.
4. Domain → slug lookup: Upstash Redis cache with short TTL; cache miss
   falls through to a Payload Local API query.
5. Unknown/unverified hosts return a **generic 404** — no information
   leakage.

Keep the rewrite layer lightweight: resolution only, no business logic.

## Rendering strategy

| Route | Strategy |
| --- | --- |
| Home page `/` | Dynamic (reads `CRITWIRE_CONTACT_URL` and the signup flag at request time) |
| `/signup`, `/verify/<token>`, `/onboarding`, `/report-abuse` | Dynamic, `noindex` (read the signup flag or the session per request) |
| `/unavailable` | Static, `noindex` |
| Marketing CMS pages | SSG (Draft Mode previews) |
| Game hub | ISR on first visit + on-demand revalidation |
| Updates feed, pages, detail, RSS | ISR on first visit + on-demand revalidation |
| Feedback list, board, item pages | SSR |
| Submit and contact forms | SSR |
| Payload admin panel | SSR (Payload-managed) |

**Revalidation rule:** every Payload hook that modifies published
content calls `revalidatePath()` / `revalidateTag()` after the DB
write. Timed ISR exists only as a fallback safety net.

ISR routes return `[]` from `generateStaticParams`, so nothing renders
at build time; each path renders on its first visit and is cached. The
cache lives in Next's memory LRU only (`experimental.isrFlushToDisk:
false`), because it also stores 404s for made-up slugs and would
otherwise grow on disk without bound. A restart or deploy empties it.
Subtrees revalidate by route pattern (`PORTAL_ROUTE` and `UPDATES_ROUTE` in `src/lib/game-portal/paths.ts`).

Pages that read `CRITWIRE_OPEN_SIGNUP` must render per request: the
Docker image is built without the runtime environment, so a prerendered
page would keep the build's value.

## Media serving

Uploads are served only by Payload, at `/api/media/file/<name>`, which
checks the Media collection's `read` access on every request, for local
disk and R2 alike. So a suspended studio's files answer 403 there.

- **Local disk** stores uploads in `media/` at the project root
  (`MEDIA_DIR`, `src/lib/media/storage.ts`), outside `public/`, because
  Next serves `public/` without asking Payload. The server refuses to
  start while `public/media` holds files. Docker mounts the `media`
  volume at `/app/media`.
- **R2** keeps the bucket private: no `r2.dev` URL, no custom domain,
  no `disablePayloadAccessControl`.
- **No image optimizer** (`images.unoptimized`): it would fetch and
  cache files outside Payload's check. `ImageMedia` instead offers
  Payload's generated WebP sizes (`thumbnail` to `xlarge`) as a
  `srcSet`.
- Every file response sends `Cache-Control: private, max-age=300`, so
  Cloudflare never keeps a copy and a suspension or hold reaches every
  browser within five minutes.
- Signed-in visitors may read any file an anonymous visitor may
  (`mediaFileReadOverride`); lists and documents keep the tenant
  limit.

## Project structure

```
/src
  /app
    /(payload)            Payload admin routes (auto-generated)
    /(public)/g/[gameSlug]  public game portal routes
    /(public)/unavailable   held or suspended portal
    /(frontend)           home page, marketing CMS pages, previews,
                          signup, verify, onboarding, report-abuse,
                          forgot-password
    /api
      /health             health check
      /vote               voting endpoint
      /seed               demo seed (CRON_SECRET)
  /collections            one folder per collection config
  /components
    /game                 portal UI (hub, board, forms, chrome, theme)
    /accounts             AccountPage, the signup/verify/onboarding shell
    /admin                forgot-password view, logo, feedback kanban
    /BeforeDashboard      admin dashboard for each role
    /marketing            home page
  /lib
    /game-portal          portal paths, stages, theme, links, queries
    /accounts             signup, pending users, activation, email budget
    /onboarding           createStudio, next steps
    /limits               hosted-plan limits and their hooks
    /hosting.ts           the open-signup flag
    /media                where local uploads live
    /admin                dashboard queries
    /payload              withTransaction, unique-violation helper
    /moderation           content filter (screenText)
    /public-forms         guardPublicForm (Zod, Turnstile, rate limit)
    /validation           shared Zod schemas
    /upstash              Redis client, rate limits
    /turnstile            Turnstile verification
    /email                Resend-or-outbox adapter, React Email templates
    /security             vote-token hashing
    /tally                Tally form URLs
  /jobs                   Payload Jobs Queue task definitions
  /migrations             Payload migrations (run on boot in production)
  payload.config.ts       main Payload configuration
next.config.ts / redirects.ts
docker-compose.yml / Dockerfile / nginx.conf
```

## Operations

- **Local seeding:** run content seeds through the app process, for
  example `pnpm seed:critter-connect` against a running local app with
  `CRON_SECRET` set. Do not run `pnpm dev` against a database currently
  owned by the Docker app stack; Payload dev push can leave development
  migration state that blocks the production-like container on restart.
- **Backups:** daily `pg_dump` cron on the VPS, 30-day retention,
  uploaded to R2 (zero egress for restore), restore tested monthly.
- **Errors:** Sentry on Next.js server, client, and jobs-queue tasks.
- **Uptime:** Better Stack pings marketing site, canary tenant portal,
  admin login, health endpoint.
- **Logging:** structured JSON via pino — hooks/access-control events,
  email delivery, contact form routing, domain resolution.
