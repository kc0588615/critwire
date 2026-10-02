# Deploy Runbook — Hetzner VPS

Single-server deployment: Docker Compose runs Postgres 16, PgBouncer,
the Next.js + Payload app, and Nginx. Cloudflare sits in front.

## One-time server setup

1. **Provision** a Hetzner CPX31 (4 vCPU / 8 GB / 160 GB NVMe),
   Ashburn (Virginia), Ubuntu 24.04 LTS.
2. **Harden**: create a non-root user with SSH key auth, disable
   password login and root SSH, enable ufw (allow 22/80/443), enable
   unattended-upgrades.
3. **Install Docker**: `curl -fsSL https://get.docker.com | sh`, add
   the deploy user to the `docker` group.
4. **Clone the repo** to `/opt/critwire`.
5. **Create `.env`** from `.env.example`:
   - strong `DB_PASSWORD` (`openssl rand -hex 24`)
   - `PAYLOAD_SECRET`, `CRON_SECRET`, `PREVIEW_SECRET` (`openssl rand -hex 32`)
   - `NEXT_PUBLIC_SERVER_URL=https://<your-domain>`
   - R2, Upstash, Sentry credentials
   - required, or public forms refuse submissions:
     `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
     (Cloudflare Turnstile), and `UPSTASH_REDIS_REST_URL` +
     `UPSTASH_REDIS_REST_TOKEN` (voting refuses without Upstash too)
   - `RESEND_API_KEY`, required for open signup and password recovery,
     and once any studio routes contact to email (without it those
     contact jobs fail), and `RESEND_FROM_EMAIL` on a domain verified
     in Resend
   - hosted instance only: `CRITWIRE_OPEN_SIGNUP=1` and the three
     limits (`CRITWIRE_LIMIT_GAMES_PER_STUDIO=3`,
     `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO=100`,
     `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME=200`); leave them unset
     to self-host (see `docs/self-hosting.md`)
   - R2 bucket: keep it private (no `r2.dev` URL, no custom domain);
     without R2, uploads go to the `media` volume
   - `NEXT_PUBLIC_*` values are baked in at build time (compose passes
     them as build args), so rebuild after changing one
   - `LOG_LEVEL=info`
   - `DATABASE_URL` is overridden by compose to point at PgBouncer; the
     value in `.env` is only used for local dev.
6. **Cloudflare DNS**: A record for the app domain → VPS IP,
   orange-cloud (proxied) ON.
7. **Cloudflare SSL**: set mode **Full (strict)**. Create an Origin CA
   certificate (SSL/TLS → Origin Server → Create Certificate), save as
   `certs/origin.pem` and `certs/origin-key.pem` in `/opt/critwire`
   (`chmod 600`, directory is gitignored).
8. **Cloudflare caching**: keep the defaults, which don't cache HTML or
   XML. Don't add a "Cache Everything" rule for `/g/*`: the hub and the
   updates pages send `s-maxage=3600`, and the app's on-demand revalidation
   can't purge Cloudflare, so edits would stay stale at the edge.

## Security headers

- **The app owns its framing policy.** Every response carries
  `Content-Security-Policy: frame-ancestors 'self'` (`headers()` in
  `next.config.ts`), so it holds behind any proxy, or none. nginx must
  not set `X-Frame-Options` or `Content-Security-Policy`, and must not
  hide the app's `Content-Security-Policy`: a second policy would
  override or narrow the app's. `nginx.conf` keeps its other security
  headers, and `pnpm test:int` fails if it breaks either rule.
- nginx mounts `nginx.conf` read-only and reads it at start, so after
  a pull that changes it, run `docker compose restart nginx`.
- **Known limitation: per-IP limits see Cloudflare, not the player.**
  nginx forwards `$remote_addr` as `X-Real-IP`, and behind Cloudflare's
  proxy that's a Cloudflare edge address. Until nginx takes the
  client's address from `CF-Connecting-IP`, trusted only from
  Cloudflare's published IP ranges, every player who arrives through
  the same edge shares one rate-limit budget, and busy periods can
  undercount referrals.

## Deploying

```bash
cd /opt/critwire
git pull
docker compose up -d --build
```

- Migrations run automatically on app boot (`prodMigrations` in
  `payload.config.ts`). New schema changes require a committed
  migration: `pnpm payload migrate:create <name>` during development.
- Verify: `curl -s https://<domain>/api/health` → `{"db":"up","status":"ok"}`.
- The app refuses to start on a bad `CRITWIRE_*` or
  `RESEND_FROM_EMAIL` value, or while `public/media` holds files; the
  log says which. See "Upgrading" in `docs/self-hosting.md`.
- Logs: `docker compose logs -f app`.

## First-run bootstrap

The first super admin needs no signup and no email:

1. Visit `https://<domain>/admin` and fill in Payload's first-user
   form, choosing **Super Admin** under Roles.
2. On a self-hosted instance, create a Tenant and assign users to it
   with owner/member roles; users a super admin creates are verified
   already. On the hosted instance, studios sign up at `/signup`
   instead.

## Volumes

`docker-compose.yml` keeps two named volumes: `postgres_data` for the
database, and `media` (mounted at `/app/media`) for uploads when R2
isn't configured. Back up `media` too if you store uploads locally.

## Backups (set up during Phase 7 hardening)

Daily `pg_dump` from the postgres container, uploaded to R2, 30-day
retention. Use a locked-down R2 bucket and credentials scoped to that
bucket:

```bash
mkdir -p /opt/critwire/backups
backup="critwire-$(date -u +%Y%m%dT%H%M%SZ).sql.gz"
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip \
  > "/opt/critwire/backups/$backup"

# Example with rclone remote `critwire-r2`:
rclone copy "/opt/critwire/backups/$backup" \
  "critwire-r2:${BACKUP_R2_BUCKET}/${BACKUP_R2_PREFIX:-production}/"

find /opt/critwire/backups -name 'critwire-*.sql.gz' -mtime +30 -delete
```

Test a restore monthly:
`gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U "$DB_USER" "$DB_NAME"`.

## Monitoring

- Better Stack: HTTP monitor on `/api/health`, the marketing page, and
  `/admin/login`.
- Sentry: set `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` in `.env`;
  source-map upload needs `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT` at build time.

## Rollback

```bash
git checkout <last-good-commit>
docker compose up -d --build
```

Note: migrations are forward-only; a rollback past a schema migration
needs `payload migrate:down` run manually before switching commits.
