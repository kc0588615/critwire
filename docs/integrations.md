# Integrations & Infrastructure Services

| Service | Purpose | Where in code |
| --- | --- | --- |
| Cloudflare R2 | Object storage, zero egress | `@payloadcms/storage-s3` in `payload.config.ts` |
| Upstash Redis | Rate limiting, the referral counter (domain cache in Phase 9) | `/lib/upstash`, `/lib/referrals` |
| Resend | Transactional email: verification, password resets, contact forms | `/lib/email` (Payload's email adapter), jobs queue tasks |
| Sentry | Error tracking | server + client + jobs instrumentation |
| Better Stack | Uptime monitoring | external — pings health endpoint |
| Cloudflare | DNS, CDN, SSL, Turnstile | DNS/proxy config; `/lib/turnstile` |
| Tally | Optional contact/feedback forms (studio-owned) | `GameProjects` contact/reportForm; `TallyEmbed` |
| `obscenity` (MIT, local) | Content filter for player submissions and studios' public text | `/lib/moderation/screenText.ts` |
| DnD-Kit | Admin feedback kanban drag-and-drop | `src/components/admin/issues/*` |
| `opentype.js` (MIT, local) + DejaVu Sans | Text in the button images and the live badge, drawn as paths | `/lib/share/images.ts`, `/lib/share/fonts` |
| Discord (optional) | `/feedback` and Send to critwire through HTTP interactions; posts through the webhook made at install; no bot (`docs/discord.md`) | `/lib/discord`, `/app/api/discord/*`, `/jobs/discord.ts` |

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
submission's title and description, a game's name and pitch, and an
update's title, version label, summary and content; the
`screenTextHook` `beforeChange` hook stores the result as `flagged` /
`flagReasons`. It runs in process, with no external service or key:

- **Words:** `obscenity` (MIT, pinned) with its `englishDataset` and
  recommended transformers, which catch leetspeak and look-alike
  spellings; `cockpit` is whitelisted beside the dataset's own list.
- **Links:** three or more links, or any link through a known
  shortener (bit.ly, t.co, …), flag the text.
- **Reasons:** shown to moderators as written, one per line:
  `Offensive word: "<text>"` (at most five), `<n> links`,
  `Shortened link: <host>`.

A flagged submission always waits for a studio's review, even when
the game's `reviewSubmissions` is off. A flagged game or update is held
off the public site until a super admin approves it (see
`docs/features.md`). `tests/int/content-screen` covers each failure
mode.

## `opentype.js` and DejaVu Sans (share images)

The hosted buttons and the live badge (`docs/share.md`) are SVG with
their text drawn as glyph paths, never `<text>`, and sharp (already a
dependency) turns that SVG into a 2× PNG. The production runner
(`node:24-alpine`) has no fonts, so `<text>` would render blank there.

- **`opentype.js` is pinned at exactly 1.3.4**, with `@types/opentype.js`
  1.3.x. 1.3.5 (2026-04-29) isn't a small patch but a rebuild from the
  2.0 line (new entry points, dependencies inlined), and 2.0.0
  (2026-05-06) is too new. Don't bump it casually; after any bump,
  `share-kit.spec.ts`, `badge.spec.ts` and the standalone check below
  must pass.
- **The font** is `src/lib/share/fonts/DejaVuSans.ttf`, with its
  licence beside it (`LICENSE`, from the `fonts-dejavu-core`
  package). It's read once per process and never sent to browsers, so
  it isn't subset; glyphs it lacks render as boxes.
- **The standalone output must carry the font.** `next.config.ts`
  traces it into the button and badge routes
  (`outputFileTracingIncludes`). After `pnpm build`,
  `.next/standalone/src/lib/share/fonts/DejaVuSans.ttf` must exist,
  and `/buttons/give-feedback-dark.png` served by
  `node .next/standalone/server.js` must show its label.

## Cloudflare R2 (media storage)

- Via `@payloadcms/storage-s3` with **`region: 'auto'`** — R2 is
  S3-compatible but region-less. Off until `R2_BUCKET` is set; uploads
  then go to local disk in `media/`.
- Attached to the Media collection; Payload generates the image sizes
  with Sharp before upload.
- **The bucket stays private.** Files are served through
  `/api/media/file/`, which checks access before the adapter streams
  the file, so suspensions and holds take images down too. Don't turn
  on an `r2.dev` URL or a custom domain for the bucket, and don't set
  `disablePayloadAccessControl` or `generateFileURL`.
- Can also hold an instance's backups, if its operator makes them
  (critwire makes none itself; see `docs/deploy.md`).
- Do not hand-roll presigned URL logic — that was v6.1.

## Upstash Redis

`/lib/upstash`. Three uses:

1. **Rate limiting** (`/lib/upstash/rate-limit.ts`) — all public form
   endpoints (contact, feedback submission, vote, signup, verify,
   password recovery, abuse reports) and referral counts, limited by
   IP, plus a per-address budget for the emails signup and password
   recovery send. Discord reports are limited per Discord account and
   game instead (`discord-report`, 5 per 10 minutes; `discord-import`,
   30 per 10 minutes per moderator), with a 1 s Upstash timeout to stay
   inside Discord's 3 s (`docs/discord.md`).
2. **The referral counter** (`/lib/referrals/counter.ts`,
   `docs/share.md`) — arrivals through kit links, one hash per game and
   UTC day, `referrals:<gameID>:<YYYY-MM-DD>`, with a field per `ref`
   source. Counting is one MULTI (`HINCRBY`, then `EXPIRE` 35 days), so
   about three commands per page view that carries a valid `ref`
   (with the rate limit); views without one cost nothing. Each hit
   resets the TTL, so a day's key lives 35 days after its last hit.
   Opening a game's Share tab reads 30 days in one pipeline of 30
   `HGETALL`. Without Upstash the counter is off. Keys aren't
   namespaced per instance (nor are rate limits), so use one Upstash
   database per instance.
3. **Domain → slug cache** (Phase 9, not built yet) — short TTL;
   consulted by the `next.config.ts` rewrite layer; invalidated by the
   GameProject `afterChange` hook when `customDomain` changes; cache
   miss falls through to a Payload Local API query.

Local development runs without these limits when Upstash isn't
configured; production refuses the request instead, so it must
configure Upstash.

## Resend + React Email

- **One transport:** `emailAdapter()` (`src/lib/email/adapter.ts`) is
  Payload's `email` adapter. With `RESEND_API_KEY` it's the official
  `@payloadcms/email-resend`, sending from `RESEND_FROM_EMAIL`
  (`Name <address>` or a bare address; a malformed value stops boot).
- **Without Resend, the outbox:** it never sends and never refuses. It
  logs each message's recipient and subject, and the body only outside
  production, so tokens never reach production logs. With
  `EMAIL_OUTBOX_DIR` set (development and E2E only) it also writes each
  message there as JSON.
- `isEmailDeliverable()` is false only in production without Resend
  (or an outbox directory); signup and password recovery then refuse.
- **Auth emails** (`authEmails.ts`, one `AuthLinkEmail` template):
  verification, "An account was created for you" (for users a super
  admin creates, with no token) and password reset. Links come from
  `NEXT_PUBLIC_SERVER_URL`, never the request's host.
- Templates in `/lib/email` built with React Email.
- Contact emails are sent inside the Payload Jobs Queue task
  `email-contact-form` through `payload.sendEmail`, not inline in
  request handlers. Without `RESEND_API_KEY` the task fails and the job
  stays for a super admin to retry.
- Log every delivery event via pino.

## Cloudflare Turnstile

- Required on every public form: contact, feedback, signup, verify,
  "Forgot password?" and abuse reports. Payload's own login and reset
  views don't have it: login has Payload's per-account lockout, and
  reset needs a single-use token from the email.
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
- Cloudflare does cache `.svg` and `.png` by default, and honours
  `s-maxage`: the live badge for 5 minutes, the button images for a
  day. The badge redirects any query string to its bare URL, so
  cache-busters can't multiply its cache entries.
- The embeds and JSON feeds keep no server cache and send
  `public, max-age=60, s-maxage=240`. One narrow Cache Rule (in
  `docs/deploy.md`) lets Cloudflare honour it, so every copy is at
  most 5 minutes old without a purge. The loader, `/embed/v1.js`, is a
  `.js` file, cached by default for its one-day header.
- With Bot Fight Mode on, Cloudflare may set its own `__cf_bm` cookie
  on the embeds; the app sets none (`docs/embed.md`, Privacy).

## Environment variables

Single source of truth for deploy config (Docker Compose `.env`);
`.env.example` documents each one:

- `DATABASE_URL` — points at PgBouncer inside the compose network
- `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `PAYLOAD_SECRET`, `NEXT_PUBLIC_SERVER_URL`, `CRON_SECRET`,
  `PREVIEW_SECRET`
- `DATABASE_POOL_MAX`, `LOG_LEVEL`
- `CRITWIRE_CONTACT_URL` — the home page's Contact link, a `mailto:`
  or `https:` URL; unset hides it, any other value stops the server at
  startup
- `CRITWIRE_OPEN_SIGNUP` — `1` on the hosted instance only (signup,
  onboarding, "Create your portal", "Report this page"); unset to
  self-host, any other value stops the server at startup
- `CRITWIRE_HIDE_POWERED_BY` — `1` hides "Powered by Critwire" in
  the portal footer and the embeds, on a self-hosted instance only;
  unset or empty shows it. Any other value, or `1` with
  `CRITWIRE_OPEN_SIGNUP=1`, stops the server at startup
- `CRITWIRE_LIMIT_GAMES_PER_STUDIO`, `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO`,
  `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME` — the hosted limits (3, 100
  and 200 on the hosted instance); unset turns each off, anything but a
  positive whole number stops the server at startup
- R2: `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` (and `SENTRY_ORG`,
  `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for source maps at build time)
- `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`,
  `DISCORD_CLIENT_SECRET` — the instance's Discord app
  (`docs/discord.md`); all three or none, a blank value counts as
  unset, and a partial or malformed set stops the server at startup
- Development and E2E only, never in production: `EMAIL_OUTBOX_DIR`,
  `RATE_LIMIT_OPTIONAL`, `DISCORD_WEBHOOK_TEST_ORIGIN`,
  `DISCORD_API_BASE_URL` (a loopback stand-in for Discord's API; any
  other host stops the server at startup), and the E2E harness's
  `E2E_DATABASE_URL`, `E2E_PORT`

`docs/self-hosting.md` says which services are required and what fails
without each.

Never commit secrets; keep `.env.example` current as variables are
added.

## Security checklist (applies to every feature)

- Tenant isolation via multi-tenant plugin access control
- Collection- and field-level access control
- Upstash rate limiting on public endpoints
- Public JSON endpoints accept only `application/json` and send no CORS
  headers, so other sites can't make players' browsers call them
- Turnstile on public forms; Discord interactions, which can't carry
  Turnstile, are verified by their Ed25519 signature and timestamp
  instead, and rate-limited per Discord account
- Content filter on player submissions (review on by default) and on
  studios' public text (held for a super admin)
- UUID identifiers (Payload default on Postgres)
- Uploads only through `/api/media/file/` (private R2 bucket, raster
  images only)
- Nothing an unverified or suspended account creates is public
- Generic 404 on unknown/unverified custom domains
- Hashed vote tokens in DB
- HTTPS enforced via Cloudflare
- Docker containers run as non-root
- Nginx security headers; the app owns its framing policy
  (`frame-ancestors 'self'`, `*` on the embeds only) and COOP
- Public feeds (`feedback.json`, `updates.json`) are the only
  cross-origin reads: GET only, no credentials, public fields only
