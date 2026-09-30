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
  Requires `PAYLOAD_SECRET`. Non-root container user.

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

## Custom domain resolution (Phase 8)

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
| Home page `/` | Dynamic (reads `CRITWIRE_CONTACT_URL` at request time) |
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

## Project structure

```
/src
  /app
    /(payload)            Payload admin routes (auto-generated)
    /(public)/g/[gameSlug]  public game portal routes
    /(frontend)           home page, marketing CMS pages, previews
    /api
      /health             health check
      /vote               voting endpoint
      /seed               demo seed (CRON_SECRET)
  /collections            one folder per collection config
  /components
    /game                 portal UI (hub, board, forms, chrome, theme)
    /admin/issues         admin feedback kanban
    /marketing            home page
  /lib
    /game-portal          portal paths, stages, theme, links, queries
    /moderation           content filter (screenText)
    /public-forms         guardPublicForm (Zod, Turnstile, rate limit)
    /validation           shared Zod schemas
    /upstash              Redis client, rate limits
    /turnstile            Turnstile verification
    /email                React Email templates
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
