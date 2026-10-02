# Self-hosting

Critwire is MIT-licensed, and self-hosting is free and unrestricted.
A self-hosted instance has no signup page and no limits unless you turn
them on. You create the accounts and studios in the admin.

For the server itself (Docker Compose, Nginx, Cloudflare, backups), see
`docs/deploy.md`. Every variable below is documented in `.env.example`.

## Services

| Service | Needed | Variables | Without it |
| --- | --- | --- | --- |
| PostgreSQL 16 | Required | `DATABASE_URL` (compose also uses `DB_USER`, `DB_PASSWORD`, `DB_NAME`) | Nothing runs. |
| Cloudflare Turnstile | Required in production | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Every public form refuses submissions: feedback, contact, "Forgot password?", and with open signup also signup, verification and abuse reports. Local development runs the forms without it. |
| Upstash Redis | Required in production | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | The same forms refuse, and so does voting. The referral counter ("Where players come from") is off; the share kit's links, buttons and badge still work. Local development runs without rate limits. |
| Resend | Optional | `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | Emails go to the server log (the full body only outside production). Contact-by-email jobs fail and wait for a super admin to retry them. "Forgot password?" tells people to ask whoever runs the site, so a super admin sets passwords in the admin. Open signup refuses. |
| Cloudflare R2 | Optional | `R2_BUCKET`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Uploads stay on local disk in `./media` (the `media` volume under Docker). |
| Sentry | Optional | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | Errors reach only the log. |
| Discord | Optional | `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY`, `DISCORD_CLIENT_SECRET` | No `/feedback` or Send to critwire in studios' servers, no posts to their channels, and no Discord tab; `/api/discord/*` answers 404. Everything else works. Setting it up: `docs/discord.md`. In production it also needs Upstash. |

**Keep the R2 bucket private.** Don't turn on its `r2.dev` URL or give
it a custom domain. Every file is served through `/api/media/file/`,
which checks access on each request, so a suspended studio's or a held
game's images go offline with it. A public bucket URL would skip that.

## The first super admin

1. Start the app on an empty database and open `/admin`.
2. Payload shows its first-user form. Enter your email and a password,
   and choose **Super Admin** under Roles.
3. Create a studio under **Tenants**, then create users and add them to
   it as owner or member.

No signup is involved, and no email is needed: users a super admin
creates are verified already. Their "An account was created for you"
email goes to the log without Resend, so tell them their password
yourself.

## Open signup and the hosted limits

All of these are off by default. The hosted instance turns them on.

- `CRITWIRE_OPEN_SIGNUP=1` opens `/signup`, email verification,
  onboarding, the home page's "Create your portal" and the portals'
  "Report this page" link, whose reports only super admins see. Unset or
  empty turns all of them off; those URLs then answer 404. Any other
  value stops the server at startup. Signup needs Resend in production.
- The limits each take a positive whole number, and are off when unset
  or empty. Any other value stops the server at startup. Studio users
  who reach one get a message in the admin; super admins and the app's
  own writes aren't limited.

| Variable | What it limits | Hosted value |
| --- | --- | --- |
| `CRITWIRE_LIMIT_GAMES_PER_STUDIO` | Games per studio | `3` |
| `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO` | Original uploads per studio, in MB (MiB); generated sizes don't count | `100` |
| `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME` | Public feedback items per game, archived ones included | `200` |

A player's submission to a game at its feedback limit is still
accepted; it waits in the studio's review queue instead of going
public.

## "Powered by Critwire"

The portal footer and every embed end with "Powered by Critwire". A
self-hosted instance can hide it with `CRITWIRE_HIDE_POWERED_BY=1`.
Unset or empty shows it. Any other value stops the server at startup,
and so does `1` together with `CRITWIRE_OPEN_SIGNUP=1`: the hosted
instance always shows it.

## Embeds without a CDN

The embeds and JSON feeds (`docs/embed.md`) keep no server cache.
Behind Cloudflare with the Cache Rule in `docs/deploy.md`, each URL
renders at most once every 4 minutes per data centre. Without a shared
cache, every view whose browser copy (1 minute) has expired renders at
the origin: up to 15 small indexed queries for the board, about five
for the updates. That's fine for most games; if a studio with heavy
traffic embeds the board, put a CDN in front that honours
`s-maxage`.

## Upgrading

### Uploads moved out of `public/media`

Uploads used to live in `public/media`, where Next served them without
checking access. They now live in `media/` at the project root, and
the server refuses to start while `public/media` still holds files. The
startup error says what to run:

```bash
mkdir -p media
mv public/media/* media/
```

Database rows store only file names, so nothing else changes. Instances
on R2 have nothing to move.

Under Docker Compose, uploads live in the named volume `media`, mounted
at `/app/media`. Before this change the app container had no volume
for uploads, so local-disk uploads were lost on every rebuild. Copy any
you still have into the volume once, for example with
`docker compose cp ./media/. app:/app/media/`.
