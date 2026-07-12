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
| Clerk auth + OAuth | Payload Auth with GitHub OAuth |
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

export default async function GamePage({ params }) {
  const payload = await getPayload({ config })
  const project = await payload.find({
    collection: 'game-projects',
    where: { slug: { equals: params.gameSlug } },
  })
  // render
}
```

## Public URL structure

```
/g/[gameSlug]                     game landing page
/g/[gameSlug]/patch-notes         patch notes feed
/g/[gameSlug]/patch-notes/[slug]  patch note detail
/g/[gameSlug]/issues              public issue board (?view=board for kanban)
/g/[gameSlug]/issues/[slug]       issue detail
/g/[gameSlug]/issues/report       submit issue report
/g/[gameSlug]/contact             contact form
```

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
| Marketing site | SSG |
| Public landing page | ISR + on-demand revalidation |
| Patch notes index/detail | ISR + on-demand revalidation |
| Contact form | SSR |
| Public issue tracker | SSR |
| Payload admin panel | SSR (Payload-managed) |

**Revalidation rule:** every Payload hook that modifies published
content calls `revalidatePath()` / `revalidateTag()` after the DB
write. Timed ISR exists only as a fallback safety net.

## Project structure

```
/app
  /(payload)            Payload admin routes (auto-generated)
  /(public)/g/[gameSlug]  public game portal routes
  /(marketing)          landing page, pricing
  /api
    /webhooks           Stripe webhooks
    /health             health check
    /contact            contact form endpoint
    /vote               voting endpoint
/collections            one file per collection config
/blocks                 Lexical landing-page blocks (hero, features,
                        media-gallery, cta, trailer)
/components             shared UI (shadcn/ui)
/lib
  /validation           shared Zod schemas
  /rate-limit           Upstash helpers
  /turnstile            Turnstile verification
  /domain-cache         Upstash domain → slug cache
  /email                React Email templates, Resend helpers
  /security             token hashing, cookie helpers
/jobs                   Payload Jobs Queue task definitions
payload.config.ts       main Payload configuration
next.config.ts          Next.js config with domain rewrites
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
  Stripe webhooks, email delivery, contact form routing, domain
  resolution.
