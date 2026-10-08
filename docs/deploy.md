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
   can't purge Cloudflare, so edits would stay stale at the edge. The one
   exception is the narrow rule for the embeds and JSON feeds below
   ("Cache Rule for embeds and feeds"), which honours their 4-minute
   `s-maxage`.

## Cache Rule for embeds and feeds

The embeds (`/g/<game>/embed/board`, `/g/<game>/embed/updates`) and
the JSON feeds (`/g/<game>/feedback.json`, `/g/<game>/updates.json`)
load on every view of the studios' pages, so Cloudflare should cache
them. They keep no server cache and send
`Cache-Control: public, max-age=60, s-maxage=240`, so every copy is at
most 5 minutes old with no purge (`docs/embed.md`, Caching). The app's
header is the only source of TTLs.

Cloudflare dashboard → the zone → Caching → Cache Rules → Create rule:

- **When incoming requests match** (custom filter expression, "Edit
  expression"):
  ```
  starts_with(http.request.uri.path, "/g/") and (http.request.uri.path contains "/embed/" or http.request.uri.path.extension eq "json")
  ```
- **Cache eligibility:** Eligible for cache.
- **Edge TTL:** Use cache-control header if present, bypass cache if
  not.
- **Browser TTL:** Respect origin TTL.
- **Cache key:** leave the default, query string included. Next's
  `_rsc` parameter keeps RSC payloads apart from HTML only while the
  query string is in the key; the loader adds only the snippet's own
  `theme`, `stage` and `type`, so one snippet is one entry.

Keep the rule this narrow: it must never match the hub or the updates
pages (their `s-maxage=3600` would then be honoured). Optionally turn
on Smart Tiered Cache (Caching → Tiered Cache), so one data centre
fetches for the others. The loader, `/embed/v1.js`, needs no rule:
Cloudflare caches `.js` by default and honours its one-day header.

**Check after the deploy**, with a real game's slug:

```bash
curl -sI https://<domain>/g/<game>/embed/board >/dev/null
curl -sI https://<domain>/g/<game>/embed/board | grep -iE '^(cf-cache-status|cache-control|content-security-policy):'
# cf-cache-status: HIT
# cache-control: public, max-age=60, s-maxage=240
# content-security-policy: frame-ancestors *
curl -sI https://<domain>/g/<game> | grep -i '^cf-cache-status:'
# cf-cache-status: DYNAMIC
```

The first request may answer `MISS`; the second must be `HIT`, with
the header as the app sent it. The hub must stay `DYNAMIC`. If Bot
Fight Mode is on, check that no `set-cookie: __cf_bm` comes back on
the embed.

## Security headers

- **The app owns its framing policy and COOP.** Every response carries
  `Content-Security-Policy: frame-ancestors 'self'` and
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` (`headers()`
  in `next.config.ts`), so they hold behind any proxy, or none. Two
  exceptions: the embeds send `frame-ancestors *`, and feedback item
  pages send COOP `unsafe-none`, so the embed's vote popup keeps its
  opener and can report the vote back. nginx must not set
  `X-Frame-Options`, `Content-Security-Policy` or
  `Cross-Origin-Opener-Policy`, and must not hide the app's
  `Content-Security-Policy` or `Cross-Origin-Opener-Policy`: a second
  value would override or narrow the app's. `nginx.conf` keeps its
  four other security headers, and `pnpm test:int` fails if it breaks
  any of these rules.
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
  `RESEND_FROM_EMAIL` value, while `public/media` holds files, or when
  a document in `legal/` is missing or its front matter is invalid; the
  log says which. See "Upgrading" in `docs/self-hosting.md`.
- **The legal documents ship inside the build.** The server reads
  `legal/*.md` at runtime, and `next.config.ts` traces them into the
  standalone output (`outputFileTracingIncludes`), which the Docker
  image copies. After `pnpm build`, `.next/standalone/legal/terms.md`
  must exist. A change to a document's text bumps its `version`, so
  every studio account accepts it again at its next visit
  (`docs/patterns.md`, The legal gate).
- Logs: `docker compose logs -f app`.

## This release on critwire.com: Critter Connect's site

critwire.com runs on the agent VPS, not under Docker: the live copy is
`/srv/apps/critwire`, its settings `/srv/apps/critwire/.env`, its
database `critwire_live`, and the systemd user unit `app@critwire`
runs it (`~/AGENTS.md`, Server map). Live runs `3054287`; this release
ships the merged `legal-launch`, `cw-theme` and `cc-site` branches at
once. Do these in order, as `critter-ai`, after the owner has merged
`agent/cc-site` into `main`:

1. **Back up first** (there are no backups yet), and keep both files
   until the checks pass:
   ```bash
   mkdir -p /srv/critter-ai/agent-state/backups
   stamp=$(date -u +%Y%m%dT%H%M%SZ)
   pg_dump -Fc -d critwire_live -f "/srv/critter-ai/agent-state/backups/critwire_live-$stamp.dump"
   tar -C /srv/apps/critwire -czf "/srv/critter-ai/agent-state/backups/critwire_live-media-$stamp.tgz" media
   ```
2. **Deploy:** `deploy critwire`. It builds `main` and restarts
   `app@critwire`, which applies the pending migrations on boot
   (`prodMigrations`). Until step 3 the site shows the demo samples in
   the new look.
3. **The content command** (below): the dry run, then `--apply` with
   the plan ID it printed.
   ```bash
   cd /srv/apps/critwire
   pnpm content:critter-connect                    # first line: Database: critwire_live on 127.0.0.1:5432
   pnpm content:critter-connect --apply <plan-id>
   ```
4. **Settings:** in `/srv/apps/critwire/.env`, add
   `CRITWIRE_HIDE_POWERED_BY=1` and delete the `CRITWIRE_CONTACT_URL`
   line (nothing reads it any more: `/` is now a redirect, not
   critwire's home page). Leave `CRITWIRE_OPEN_SIGNUP` unset: with it
   set, the server refuses to start with `CRITWIRE_HIDE_POWERED_BY=1`.
5. **Restart:** `systemctl --user restart app@critwire`. This also
   empties the page cache, which the content command can't revalidate.
6. **Check:**
   - `curl -s https://critwire.com/api/health` → `{"db":"up","status":"ok"}`.
   - `curl -sI https://critwire.com/` → `307`, `location: /g/critter-connect`.
   - The hub (`/g/critter-connect`), in a light and a dark browser: the
     Critter Connect logo and favicon, "Explore biodiversity through
     map-based expeditions.", the Official site and Get the game links,
     no sample feedback or update, and no "Powered by Critwire" in the
     footer. The page title is "Critter Connect".
   - `/legal/terms` shows version 0.2 with the draft banner.
   - In the admin (`/admin`): the studio is Haunted Pavement, and
     Updates holds the draft "The feedback board is open", for Danby
     to edit and publish.
   - Running the dry run again prints `Nothing to change.`
   - `journalctl --user -u app@critwire -n 50` shows no errors.

**If something goes wrong:**
- The command refuses (`Refused: …`, `Nothing written.`): stop there.
  Nothing changed and the site works, with the samples showing. Keep
  the output and hand it to an agent; don't edit data to make it pass.
- `--apply` fails partway (`Failed: …`, `Rolled back: …`): the content
  is unchanged. Run the dry run again, then `--apply` its new plan ID;
  the uploaded logo is reused.
- The build fails: `deploy` rolls back to the commit that was live by
  itself. If the app is broken after the migrations ran, stop and hand
  the `journalctl` output to an agent. Migrations are forward-only, so
  going back to `3054287` also needs step 1's backups
  (`pg_restore --clean --if-exists -d critwire_live <dump>`, and the
  `media` archive).

## The content command (`pnpm content:critter-connect`)

A one-off (`src/seed/siteContent.ts`) that turns the demo seed's data
into Critter Connect's real site: the studio "Critwire Demo" becomes
"Haunted Pavement" (slug `haunted-pavement`), the game takes the facts
in `src/seed/critterConnectData.ts` and the default cc palette, the
seed's sample feedback report, four feedback items and update are
deleted, and a draft first update ("The feedback board is open") is
left for the studio to publish. It reads `.env` from the working
directory and refuses to run with `NODE_ENV=production`, so it never
migrates.

- **The dry run** (no arguments) writes nothing. Its first line names
  the database it read (`Database: critwire_live on …`); stop if it's
  the wrong one. Then one line per change, then `Plan <id>`: twelve hex
  digits that bind those lines to the rows they were read from. With
  nothing left to do it prints `Nothing to change.` and exits 0.
- **`--apply <plan-id>`** makes exactly that plan's changes, in one
  transaction that locks the studio, the game and every sample first,
  then plans again and refuses if the ID differs: the data changed
  since the dry run, so read the new plan and apply it by its ID. A
  document open in the admin also makes it refuse.
- **A refusal** (`Refused: …`, then `Nothing written.`, exit 1) means
  it found something it can't prove is the seed's own sample: an
  edited or duplicated sample, something else linked to one (a report,
  an item shipped in the sample update, a Discord post), or a game or
  studio it doesn't expect. Nothing was written; hand the output to an
  agent.
- **A failed apply** (`Failed: …`) rolled back everything but the logo
  upload (`app-icon-512.png` in the studio's media), which happens
  before the transaction. Rerun the dry run and apply its ID, which
  reuses the upload; to abandon the change, delete that image in the
  admin's Media.
- Restart the app afterwards, so its cached pages show the change.

It was rehearsed against a copy of live's data in thirteen cases,
success, rerun and every refusal and failure above included (plan
`plans/2026-10-08-cc-site.md`, S21 and S22).

**Never run the demo seed on critwire.com** (`pnpm seed:critter-connect`
or `/api/seed/critter-connect`) once the content command has run: it
puts the sample feedback and the sample update back. The seed is for
the demo, previews and the screenshots.

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

## Backups (the operator's job)

Critwire makes no backups itself. If you want them, here is one way: a
daily `pg_dump` from the postgres container, uploaded to R2, with 30-day
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

## Logs and how long they're kept

The app logs structured JSON to standard output: events with internal
IDs, and error details when something fails. It doesn't log IP
addresses, players' names or contact emails. Without Resend, the email
outbox logs each email's recipient and subject (`docs/integrations.md`).

- Payload's own logger (`logger` in `src/payload.config.ts`) redacts
  job inputs, because a failed task logs its whole job and a contact
  job's input is a player's message.
- A failed database write can repeat its values in the error, so a
  rare error may hold feedback text or an abuse reporter's email.
- The reverse proxy logs the client's IP address with its own errors
  (for example, the app not answering, or a client dropping the
  connection). The Privacy Policy says so.

A privacy policy has to say how long logs are kept, so give them a time
limit:

- **Under systemd** (logs in the journal): add a journald drop-in, then
  restart journald. It applies to every service on the server.
  ```bash
  sudo mkdir -p /etc/systemd/journald.conf.d
  printf '[Journal]\nMaxRetentionSec=30day\n' \
    | sudo tee /etc/systemd/journald.conf.d/retention.conf
  sudo systemctl restart systemd-journald
  ```
- **Under Docker Compose:** Docker's default `json-file` log driver
  keeps a container's log, without any limit, until the container is
  removed. Either send the logs to the journal (`"log-driver":
  "journald"` in `/etc/docker/daemon.json`, then restart Docker and
  recreate the containers) and set the limit above, or rotate them by
  size (`max-size` and `max-file`), which bounds their size but not
  their age.

## Monitoring

- Better Stack: HTTP monitor on `/api/health`, the site's game hub
  (`/g/<game>`), and `/admin/login`.
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
