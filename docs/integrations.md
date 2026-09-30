# Integrations & Infrastructure Services

| Service | Purpose | Where in code |
| --- | --- | --- |
| Cloudflare R2 | Object storage, zero egress | `@payloadcms/storage-s3` in `payload.config.ts` |
| Upstash Redis | Rate limiting (domain cache in Phase 9) | `/lib/upstash` |
| Resend | Transactional email | `/lib/email`, jobs queue tasks |
| Sentry | Error tracking | server + client + jobs instrumentation |
| Better Stack | Uptime monitoring | external — pings health endpoint |
| Cloudflare | DNS, CDN, SSL, Turnstile | DNS/proxy config; `/lib/turnstile` |
| Tally | Optional contact/feedback forms (studio-owned) | `GameProjects` contact/reportForm; `TallyEmbed` |
| `obscenity` (MIT, local) | Content filter for player submissions | `/lib/moderation/screenText.ts` |
| DnD-Kit | Admin feedback kanban drag-and-drop | `src/components/admin/issues/*` |

## Tally (optional contact + feedback forms)

Studios own their Tally account. Critwire stores only a form URL (or
form ID) and display mode (`embed` | `button`):

- **Contact:** `GameProjects.contact.target = TALLY` + `tallyUrl`
- **Feedback:** `GameProjects.reportForm.provider = tally` + `tallyUrl`

Public pages render an approved iframe embed (or a button to the share
URL). Submissions, spam protection, and exports live in Tally — not
Critwire. Always show that boundary to players.

Native Critwire contact (email / Discord webhook) and feedback forms
remain available when Tally is not configured. Do not store Tally API
keys; Level 1–2 integration only (URL + embed).

Helpers: `src/lib/tally/parseTallyForm.ts`,
`src/components/game/TallyEmbed.tsx`.

## Admin feedback kanban (DnD-Kit)

Adapted from the Payload orderable kanban pattern (DnD-Kit + fractional
`_order`). Custom list view on the `issues` collection with a Kanban /
Table tab switcher. Dragging updates `status` and `_order` via the
Payload REST API. The board applies the multi-tenant plugin's list
filter, so it follows the tenant selector. Public player
`?view=board` is unchanged (read-only).

Components: `src/components/admin/issues/`. Collection:
`orderable: true` on `issues`.

## Content filter (`obscenity`, local)

`screenText` (`src/lib/moderation/screenText.ts`) screens every native
submission's title and description; the IssueReport `beforeChange`
hook stores the result as `flagged` / `flagReasons`. It runs in
process, with no external service or key:

- **Words:** `obscenity` (MIT, pinned) with its `englishDataset` and
  recommended transformers, which catch leetspeak and look-alike
  spellings; `cockpit` is whitelisted beside the dataset's own list.
- **Links:** three or more links, or any link through a known
  shortener (bit.ly, t.co, …), flag the text.
- **Reasons:** shown to moderators as written, one per line:
  `Offensive word: "<text>"` (at most five), `<n> links`,
  `Shortened link: <host>`.

A flagged submission always waits for a studio's review, even when
the game's `reviewSubmissions` is off. `tests/int/content-screen`
covers each failure mode.

## Cloudflare R2 (media storage)

- Via `@payloadcms/storage-s3` with **`region: 'auto'`** — R2 is
  S3-compatible but region-less.
- Attached to the Media collection; handles presigned URLs, client
  uploads, and image optimization via Sharp.
- Also the destination for nightly `pg_dump` backups (zero egress makes
  restores free).
- Do not hand-roll presigned URL logic — that was v6.1.

## Upstash Redis

`/lib/upstash`. Two uses:

1. **Rate limiting** (`/lib/upstash/rate-limit.ts`) — all public form
   endpoints (contact, feedback submission, vote) limited by IP.
2. **Domain → slug cache** (Phase 9, not built yet) — short TTL;
   consulted by the `next.config.ts` rewrite layer; invalidated by the
   GameProject `afterChange` hook when `customDomain` changes; cache
   miss falls through to a Payload Local API query.

Local development runs without these limits when Upstash isn't
configured; production refuses the request instead, so it must
configure Upstash.

## Resend + React Email

- Templates in `/lib/email` built with React Email.
- Delivery happens inside the Payload Jobs Queue task
  `email-contact-form`, not inline in request handlers. Without
  `RESEND_API_KEY` the task fails and the job stays for a super admin
  to retry.
- Log every delivery event via pino.

## Cloudflare Turnstile

- Required on every public form: contact form, feedback form.
- Server-side verification in `/lib/turnstile`; reject on failure
  before doing any work. Production refuses submissions when
  `TURNSTILE_SECRET_KEY` is unset.

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
- Cloudflare doesn't cache the app's HTML or RSS (its defaults). The app
  caches them itself (ISR) and revalidates on every write, which a
  Cloudflare "Cache Everything" rule would bypass. See `docs/deploy.md`.

## Environment variables

Single source of truth for deploy config (Docker Compose `.env`);
`.env.example` documents each one:

- `DATABASE_URL` — points at PgBouncer inside the compose network
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `CRON_SECRET`,
  `PREVIEW_SECRET`
- `CRITWIRE_CONTACT_URL` — the home page's Contact link, a `mailto:`
  or `https:` URL; unset hides it, any other value stops the server at
  startup
- R2: bucket, endpoint, access key ID, secret access key
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Turnstile site key + secret key
- Sentry DSN

Never commit secrets; keep `.env.example` current as variables are
added.

## Security checklist (applies to every feature)

- Tenant isolation via multi-tenant plugin access control
- Collection- and field-level access control
- Upstash rate limiting on public endpoints
- Turnstile on public forms
- Content filter on player submissions; review on by default
- UUID identifiers (Payload default on Postgres)
- R2 presigned URLs with restrictions
- Generic 404 on unknown/unverified custom domains
- Hashed vote tokens in DB
- HTTPS enforced via Cloudflare
- Docker containers run as non-root
- Nginx security headers
