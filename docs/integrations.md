# Integrations & Infrastructure Services

| Service | Purpose | Where in code |
| --- | --- | --- |
| Cloudflare R2 | Object storage, zero egress | `@payloadcms/storage-s3` in `payload.config.ts` |
| Upstash Redis | Rate limiting, domain cache | `/lib/rate-limit`, `/lib/domain-cache` |
| Resend | Transactional email | `/lib/email`, jobs queue tasks |
| Stripe | Billing (Phase 9) | `/api/webhooks/stripe` |
| Sentry | Error tracking | server + client + jobs instrumentation |
| Better Stack | Uptime monitoring | external — pings health endpoint |
| Cloudflare | DNS, CDN, SSL, Turnstile | DNS/proxy config; `/lib/turnstile` |
| Tally | Optional contact/report forms (studio-owned) | `GameProjects` contact/reportForm; `TallyEmbed` |
| DnD-Kit | Admin Issues kanban drag-and-drop | `src/components/admin/issues/*` |

## Tally (optional contact + report forms)

Studios own their Tally account. Critwire stores only a form URL (or
form ID) and display mode (`embed` | `button`):

- **Contact:** `GameProjects.contact.target = TALLY` + `tallyUrl`
- **Report:** `GameProjects.reportForm.provider = tally` + `tallyUrl`

Public pages render an approved iframe embed (or a button to the share
URL). Submissions, spam protection, and exports live in Tally — not
Critwire. Always show that boundary to players.

Native Critwire contact (email / Discord webhook) and report forms
remain available when Tally is not configured. Do not store Tally API
keys; Level 1–2 integration only (URL + embed).

Helpers: `src/lib/tally/parseTallyForm.ts`,
`src/components/game/TallyEmbed.tsx`.

## Admin Issues kanban (DnD-Kit)

Adapted from the Payload orderable kanban pattern (DnD-Kit + fractional
`_order`). Custom list view on the `issues` collection with a Kanban /
Table tab switcher. Dragging updates `status` and `_order` via the
Payload REST API. Public player `?view=board` is unchanged (read-only).

Components: `src/components/admin/issues/`. Collection:
`orderable: true` on `issues`.

## Cloudflare R2 (media storage)

- Via `@payloadcms/storage-s3` with **`region: 'auto'`** — R2 is
  S3-compatible but region-less.
- Attached to the Media collection; handles presigned URLs, client
  uploads, and image optimization via Sharp.
- Also the destination for nightly `pg_dump` backups (zero egress makes
  restores free).
- Do not hand-roll presigned URL logic — that was v6.1.

## Upstash Redis

Two uses only:

1. **Rate limiting** (`/lib/rate-limit`) — all public form endpoints
   (contact, issue report, vote) limited by IP.
2. **Domain → slug cache** (`/lib/domain-cache`) — short TTL; consulted
   by the `next.config.ts` rewrite layer; invalidated by the
   GameProject `afterChange` hook when `customDomain` changes; cache
   miss falls through to a Payload Local API query.

## Resend + React Email

- Templates in `/lib/email` built with React Email.
- Delivery happens inside Payload Jobs Queue tasks
  (`email-contact-form`, `email-confirmation`), not inline in request
  handlers.
- Log every delivery event via pino.

## Cloudflare Turnstile

- Required on every public form: contact form, issue report form.
- Server-side verification in `/lib/turnstile`; reject on failure
  before doing any work.

## Stripe (Phase 9 — do not build earlier)

- Stripe Checkout for subscription purchase; Customer Portal for
  self-service management.
- Webhook handler at `/api/webhooks/stripe`: **always** validate the
  webhook signature; Zod-parse event payloads; log every event.
- Plan gating (FREE/INDIE/STUDIO) via Payload access control, not
  ad-hoc conditionals.
- FREE tier: track 50 submissions/month usage.

## Sentry

Instrument three surfaces: Next.js server (Payload + custom routes),
Next.js client, and Payload Jobs Queue tasks. Capture in hooks and API
routes where failure matters; don't swallow errors.

## PgBouncer

- App connects to `pgbouncer:6432`, never straight to Postgres.
- `POOL_MODE: transaction`, `MAX_CLIENT_CONN: 200`,
  `DEFAULT_POOL_SIZE: 20`.
- Configure `@payloadcms/db-postgres` with PgBouncer-aware settings
  (transaction pooling forbids session-level features like prepared
  statements held across transactions — verify adapter settings in
  Phase 1).

## Nginx + Cloudflare edge

- Cloudflare terminates SSL (orange-cloud proxy), provides CDN + DDoS.
- Nginx reverse-proxies to the app container with appropriate headers
  (forwarded host/proto matter for domain resolution and Payload URLs).
- Custom domain SSL is handled by Cloudflare proxy — no certbot on the
  VPS.

## Environment variables

Single source of truth for deploy config (Docker Compose `.env`):

- `DATABASE_URL` — points at PgBouncer inside the compose network
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PAYLOAD_SECRET`
- R2: bucket, endpoint, access key ID, secret access key
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`
- Turnstile site key + secret key
- Stripe secret key + webhook secret (Phase 9)
- Sentry DSN
- GitHub OAuth client ID + secret

Never commit secrets; keep `.env.example` current as variables are
added.

## Security checklist (applies to every feature)

- Tenant isolation via multi-tenant plugin access control
- Collection- and field-level access control
- Upstash rate limiting on public endpoints
- Turnstile on public forms
- Validated Stripe webhook signatures
- UUID identifiers (Payload default on Postgres)
- R2 presigned URLs with restrictions
- Generic 404 on unknown/unverified custom domains
- Hashed vote tokens in DB
- HTTPS enforced via Cloudflare
- Docker containers run as non-root
- Nginx security headers
