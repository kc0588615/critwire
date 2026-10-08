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
/g/[gameSlug]/roadmap                  alias: 307 to feedback?view=board, keeping the query
/g/[gameSlug]/badge.svg, badge.png     live badge (stage counts, latest version)
/g/[gameSlug]/feedback.json            public feedback feed (contract v1)
/g/[gameSlug]/updates.json             updates as JSON Feed 1.1
/g/[gameSlug]/embed/board              board widget, framable by any site
/g/[gameSlug]/embed/updates            updates widget, framable by any site
/buttons/<button>-<light|dark>.<svg|png>   hosted button images, the same for every game
/embed/v1.js                           the embed loader (static, a versioned contract)
```

The embed (`docs/embed.md`) is a second root layout,
`src/app/(embed)/`, with no portal chrome and no web font. Both route
groups name the segment `[gameSlug]`, so they share the `/g/` prefix,
and the portal's layout never wraps an embed.

The share kit (`docs/share.md`) links these with `?ref=<place>`; the
portal's `ReferralPing` strips the tag and reports it to
`POST /api/referrals`, which counts in Upstash only.

`feedback/new` is a static route, so `new` is a reserved item slug.
The old `/issues/*`, `/report` and `/patch-notes/*` URLs redirect
permanently (`redirects.ts`; 308 for the old form's POST).

Every portal page and the layout get their game through
`requirePortalProject(slug)` (`src/lib/game-portal/getGameProject.ts`):
a held game or a suspended studio's game redirects to `/unavailable`,
an unknown slug is a 404. The RSS feed, the JSON feeds and the submit
routes answer 404 for both. The embeds use `getGameProject` too: a
held, suspended or unknown game gets an empty embed that collapses to
nothing on the host page. The badge answers all three with one neutral image instead,
so host pages never show a broken image.

### Accounts, hosting and moderation URLs

```
/unavailable                 a held or suspended portal; names no game and gives no reason
/admin/forgot                "Forgot password?" (a custom Payload view) → POST /forgot-password/submit
/admin/login, /admin/reset/<token>   Payload's own views, in Critwire's styling
/admin/unauthorized          LegalGateView: an account that must accept goes on to /legal/accept
/legal/terms, /legal/privacy, /legal/copyright   the documents in legal/, on every instance
/legal/accept?next=<path>    the two consent boxes → POST /legal/accept/submit (signed in; records the acceptance)
```

`next` is kept only when it's `/onboarding` or under `/admin`
(`safeNext`, `src/lib/legal/paths.ts`); anything else becomes
`/admin`.

Only with open signup (`CRITWIRE_OPEN_SIGNUP=1`, `src/lib/hosting.ts`);
otherwise each answers 404:

```
/signup                      email, the two consent boxes + Turnstile → POST /signup/submit
/verify/<token>              "Choose a password" → POST /verify/submit (verifies, signs in)
/onboarding                  game name, website, store → POST /onboarding/submit
/report-abuse?page=/g/<slug> "Report this page" → POST /report-abuse/submit
```

### Discord URLs

Only when the instance sets its Discord variables (`docs/discord.md`);
otherwise each answers 404:

```
POST /api/discord/interactions   Discord's signed interactions: /feedback, Send to critwire, their forms
GET  /api/discord/install?game=<id>   a studio member's "Add critwire to your Discord" → Discord's screen
GET  /api/discord/callback       Discord's redirect back: links the game, then the Share tab with ?discord=
```

They're explicit routes, which win over Payload's `/api/[...slug]`.

The submit routes are public form endpoints (`guardPublicForm`), except
onboarding's and `/legal/accept/submit`, which need a signed-in user. Each answers a browser with
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
| `/legal/<document>` | Static (`generateStaticParams`; the files change only with a deploy), `noindex` while a draft |
| `/legal/accept` | Dynamic, `noindex` (reads the session) |
| Marketing CMS pages | SSG (Draft Mode previews) |
| Game hub | ISR on first visit + on-demand revalidation |
| Updates feed, pages, detail, RSS | ISR on first visit + on-demand revalidation |
| Feedback list, board, item pages | SSR |
| Submit and contact forms | SSR |
| Payload admin panel | SSR (Payload-managed) |
| Live badge (`badge.svg`, `badge.png`) | Dynamic, HTTP-cached 5 minutes (`s-maxage=300`); no server cache, so nothing to revalidate |
| Button images (`/buttons/*`) | Dynamic, memoized per process, HTTP-cached a day |
| Embeds (`/g/<game>/embed/*`) and JSON feeds (`feedback.json`, `updates.json`) | Dynamic (`force-dynamic`), HTTP-cached 5 minutes in total (`EMBED_CACHE_CONTROL`: `max-age=60, s-maxage=240`); no server cache, so nothing to revalidate |
| Embed loader (`/embed/v1.js`) | Static file, HTTP-cached a day (`LOADER_CACHE_CONTROL`) |

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

## Framing and COOP

The app owns its framing policy and its Cross-Origin-Opener-Policy:
`headers()` in `next.config.ts` sends
`Content-Security-Policy: frame-ancestors 'self'` and
`Cross-Origin-Opener-Policy: same-origin-allow-popups` on every
response, so they hold behind any proxy, or none. nginx sets neither
(`docs/deploy.md`, Security headers; `tests/int/nginx-headers` checks).
A route that needs another value gets a later `headers()` entry; Next
sends the last matching one for each header. Today:

- the embeds (`/g/:game/embed/:widget`) send `frame-ancestors *`, and
  their `Cache-Control`;
- feedback item pages (`/g/:game/feedback/:slug`) send COOP
  `unsafe-none`, so the embed's vote popup keeps its opener and can
  report the vote back; a later entry gives `/g/:game/feedback/new`
  `same-origin-allow-popups` again;
- `/embed/v1.js` gets its one-day `Cache-Control`.

Next 16.2 keeps a `Cache-Control` set in `headers()` on dynamic pages
and static files; E2E asserts the exact values, so an upgrade that
changes this fails the suite.

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

## Styling: the cc theme

Critwire's UI uses **cc**, Critter Connect's design language in
`GUI.md` and `gui/` (follow them for UI work). Its values are defined
once, and every surface reads them as named tokens.

- **The source:** `src/lib/theme/tokens.ts` holds the theme as typed
  data (`TOKENS`): text steps, spacing, radii, borders, weights,
  shadows, motion, font fallbacks, the four colours, the status colours,
  and the ten neutrals and the accent text for light and dark (the dark
  neutrals are the game's; `SNAPSHOT_DARK_NEUTRALS` keeps cc's beside
  them). It is the only file with the theme's literal values. Beside
  them it exports critwire's own constants, which aren't theme values:
  `TAP_MIN` (the 44 px tap-target floor, `--tap-min`), `STROKE` (edge
  widths, `--stroke-s`/`--stroke-l`) and `FOCUS` (the ring's width and
  offset).
- **`pnpm generate:theme`** (`src/lib/theme/generate.ts`, through
  `tokensCss.ts`) writes `src/styles/tokens.css`: every value as a
  CSS variable. A mode-dependent one is written with its light value
  for every browser, then as `light-dark(<light>, <dark>)` inside
  `@supports (color: light-dark(white, black))`, so a browser without
  `light-dark()` gets the light mode, fully styled. The file is
  generated and committed; edit `tokens.ts`, then rerun.
- **`src/styles/roles.css`** is hand-written and holds no literal: the
  roles built on the tokens (`--cte-*`, the 20 % `-transparent` colours,
  edges as inset shadows, the focus ring, the font roles `--font-ui`,
  `--font-brand`, `--font-editorial`, `--font-data`).
- **`pnpm generate:brand`** (`src/lib/theme/brand.ts`) draws
  `public/favicon.svg`, `public/favicon.ico` and the default share
  image `public/og.png` from `tokens.ts` and the wordmark. Rerun it only
  when the brand colours or the wordmark change, and commit the result.
- **Fonts** (`src/styles/fonts.css`): Nunito for the ui, brand and
  editorial roles and Open Runde for data, as plain `@font-face` rules
  on the files in `public/fonts/` (each folder with its `OFL.txt`), so
  no page calls a font service. `--face-sans` and `--face-data` there
  are the one place a face is named.
- **The guard:** `tests/int/theme-tokens.int.spec.ts` fails when
  `tokens.ts` drifts from the snapshot in `gui/themes/cc.md`, when the
  committed `tokens.css` differs from what `tokens.ts` generates, when a
  mode-dependent colour lacks its light fallback, when either
  entry point stops loading the tokens, faces and roles, when a face
  in `fonts.css` names a missing file, or when the loader's
  colours drift from `tokens.ts`. `prebuild` runs it.

Two style entry points load the tokens, the faces, then the roles, directly (no
nested CSS import):

| Entry point | Loads them with | Renders |
| --- | --- | --- |
| `src/app/(frontend)/globals.css` | `@import` after `tailwindcss` | `(frontend)`, `(public)` and `(embed)` |
| `src/app/(payload)/custom.scss` | `@use` | the Payload admin and its custom views |

Tailwind's `@theme` resets its own default scales, so only the theme's
utilities exist. `site.css`, `portal.css`, `embed.css`, `share-kit.css`,
`kanban.css` and the custom views' SCSS load no tokens themselves;
they always render under one of the two entry points. Server output
that isn't CSS (emails, the share buttons and badge, the brand files,
the portal's default theme, the embed's neutral palette) imports
`TOKENS` from `tokens.ts`. `public/embed/v1.js` can't import, so it
carries its two colours as literals, which the int test keeps equal to
`tokens.ts`.

**Light and dark.** Each surface sets its own `color-scheme`, and
`light-dark()` in the tokens follows it (with the light value as the
fallback where `light-dark()` isn't supported); no component rule is written twice per
mode.

| Surface | Mode |
| --- | --- |
| Critwire's pages (`(frontend)`) | The visitor's system setting: the layout's `viewport.colorScheme` and `.cw-root` are `light dark`. No toggle. |
| Admin | Payload's own light, dark or auto switch: Payload sets `color-scheme: dark` on `html[data-theme='dark']`, and `custom.scss` maps Payload's variables onto the theme. |
| Portals | The game's theme: `themeStyle` sets `colorScheme` from the palette's background (`backgroundScheme` in `src/lib/game-portal/contrast.ts`). New games default to cc dark. |
| Embeds | `data-theme` / `?theme=`: `.cw-embed` sets `color-scheme` per mode (`docs/embed.md`, Modes and fonts). |
| Emails | The theme's light mode only (`src/lib/email/templates/styles.ts`), inline styles and no web font. |

## Project structure

```
/src
  /app
    /(payload)            Payload admin routes (auto-generated)
    /(public)/g/[gameSlug]  public game portal routes
    /(public)/unavailable   held or suspended portal
    /(public)/buttons       hosted button images
    /(embed)/g/[gameSlug]/embed  embed widgets (their own root layout)
    /(frontend)           home page, marketing CMS pages, previews,
                          signup, verify, onboarding, report-abuse,
                          forgot-password, legal (documents, accept)
    /api
      /health             health check
      /vote               voting endpoint
      /referrals          referral counter (JSON only, Upstash only)
      /discord            interactions, install, callback (Discord on only)
      /seed               demo seed (CRON_SECRET)
  /access                 access functions, the tenant-write and legal-write checks, adminPanelAccess
  /collections            one folder per collection config
  /components
    /game                 portal UI (hub, board, forms, chrome, theme, referral ping)
    /share                "Put critwire on your site" panel: links and buttons, the Embed tab and the Discord tab (client, no data access)
    /embed                the embed widgets (board, updates, frame, "Powered by")
    /accounts             AccountPage, the signup/verify/onboarding shell
    /legal                notice, sensitive-info warning, consent boxes, footer links
    /AfterLogin           the legal links under the admin's sign-in form
    /admin                forgot-password view, legal gate view, logo, feedback kanban, Share tab
    /BeforeDashboard      admin dashboard for each role
    /marketing            home page
  /lib
    /game-portal          portal paths, stages, theme, links, queries
    /accounts             signup, pending users, activation, email budget, anonymizeUser
    /legal                document loader, versions, acceptance checks, shared copy, paths
    /onboarding           createStudio, next steps
    /limits               hosted-plan limits and their hooks
    /hosting.ts           the open-signup flag, "Powered by Critwire"
    /media                where local uploads live
    /admin                dashboard queries, admin paths
    /share                share kit, platforms, buttons, badge, image renderer + font
    /embed                embed snippets, protocol, cache headers, theme, platforms
    /referrals            referral counter (Upstash)
    /discord              Discord app: config, signatures, interactions, commands, OAuth, game links, posts, webhooks
    /payload              withTransaction, unique-violation helper, deleteWhereOrThrow, lockJobStatsGlobal
    /moderation           content filter (screenText)
    /public-forms         guardPublicForm (Zod, Turnstile, rate limit)
    /validation           shared Zod schemas
    /upstash              Redis client, rate limits
    /turnstile            Turnstile verification
    /email                Resend-or-outbox adapter, React Email templates
    /security             vote-token hashing, signed values (sign.ts)
    /tally                Tally form URLs
    /theme                tokens.ts (the theme's values), the token and brand generators
  /styles                 tokens.css (generated), fonts.css (faces) and roles.css (roles)
  /jobs                   Payload Jobs Queue task definitions
  /migrations             Payload migrations (run on boot in production)
  payload.config.ts       main Payload configuration
legal/                    critwire.com's Terms, Privacy and Copyright (markdown, versioned front matter)
public/embed/v1.js        the embed loader (hand-written, no build step)
next.config.ts / redirects.ts
docker-compose.yml / Dockerfile / nginx.conf
```

## Operations

- **Local seeding:** run content seeds through the app process, for
  example `pnpm seed:critter-connect` against a running local app with
  `CRON_SECRET` set. Do not run `pnpm dev` against a database currently
  owned by the Docker app stack; Payload dev push can leave development
  migration state that blocks the production-like container on restart.
- **Backups:** the operator's job; critwire makes none itself.
  `docs/deploy.md` shows one way (a daily `pg_dump` uploaded to R2).
- **Errors:** Sentry on Next.js server, client, and jobs-queue tasks.
- **Uptime:** Better Stack pings marketing site, canary tenant portal,
  admin login, health endpoint.
- **Logging:** structured JSON via pino — hooks/access-control events,
  email delivery, contact form routing, domain resolution.
