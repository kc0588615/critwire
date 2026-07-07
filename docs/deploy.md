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
   - `DATABASE_URL` is overridden by compose to point at PgBouncer; the
     value in `.env` is only used for local dev.
6. **Cloudflare DNS**: A record for the app domain → VPS IP,
   orange-cloud (proxied) ON.
7. **Cloudflare SSL**: set mode **Full (strict)**. Create an Origin CA
   certificate (SSL/TLS → Origin Server → Create Certificate), save as
   `certs/origin.pem` and `certs/origin-key.pem` in `/opt/critwire`
   (`chmod 600`, directory is gitignored).

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
- Logs: `docker compose logs -f app`.

## First-run bootstrap

1. Visit `https://<domain>/admin` — create the first user (gets the
   Super Admin role via the first-registration path).
2. Create a Tenant, assign users to it with owner/member roles.

## Backups (set up during Phase 7 hardening)

Daily `pg_dump` from the postgres container, uploaded to R2, 30-day
retention:

```bash
docker compose exec -T postgres pg_dump -U "$DB_USER" "$DB_NAME" | gzip \
  | <upload to R2 via rclone/aws cli>
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
