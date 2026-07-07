# Product & Features

## Thesis

The **public ops layer for an indie game** — the unified surface where
players find updates, known issues, and communication from the studio.
Key promise: *"Set up the public ops layer for your game in an
afternoon — publish updates, track known issues, and give players one
place to look."*

Each studio (tenant/Workspace) gets one hosted, branded portal doing
three jobs well and one adequately:

1. Public game website (core differentiator)
2. Patch notes and updates (highest retention feature)
3. Public issue tracker with player voting (most unique feature)
4. Branded contact form routing to existing tools (adequate)

**Aggregation-first:** build native features only when no adequate
external tool exists for the studio's public-facing needs; otherwise
link out. The product is NOT: a documentation platform, ticketing
system, forum, Discord replacement, sprint board, merch storefront,
live game backend, telemetry vendor, or bug-reporting SDK.

## Collections

All tenant-scoped unless noted; tenant field is injected by the
multi-tenant plugin.

### Tenants (plugin-managed)
One tenant = one Workspace (studio). Plugin handles tenant field
injection, admin tenant switcher, and access filtering.

### Users (Payload built-in, extended)
Email/password + GitHub OAuth. Tenant association via plugin.
Roles: `admin` (global), `owner`, `member`.

### GameProject
Primary game entity. Fields: name, slug (unique), description; logoUrl,
bannerUrl, accentColor; customDomain, customDomainVerified; external
links (steam, epic, itch, discord, support, docs, merch, …); contact
form config (target type, email, discord webhook, external URL);
timestamps.

### Page
Structured landing page content. Fields: gameProject (rel), kind
(e.g. "landing"), title, content (Lexical with custom blocks: hero,
features, media gallery, CTA, trailer embed), isPublished, timestamps.

### PatchNote
Draft/publish workflow. Fields: gameProject (rel), title, slug (unique
per project), summary, content (Lexical), versionLabel, isPublished,
publishedAt, timestamps.

### Issue
Public tracker item. Fields: gameProject (rel), title, slug (unique per
project), summary, details, category, status, isPublic, isPinned,
needsMoreInfoText, workaroundText, fixedInPatchNote (rel, optional),
upvoteCount (number, default 0), timestamps.

### IssueReport
Inbound player report. Fields: gameProject (rel), issue (rel, optional
— set when linked), title, description, category, submitterEmail /
platform / gameVersion (all optional), status, timestamps.

### IssueVote
Fields: issue (rel), browserTokenHash, timestamps. Unique constraint:
`[issueId, browserTokenHash]`.

### Media (Payload built-in)
Upload collection via `@payloadcms/storage-s3` → R2. Game logos,
banners, patch-note images, issue-report attachments.

## Enums (Payload select options)

```ts
IssueCategory = ['INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES',
  'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE',
  'FEATURE_REQUEST', 'OTHER']

IssueStatus = ['REPORTED', 'INVESTIGATING', 'NEEDS_MORE_INFO',
  'WORKAROUND_AVAILABLE', 'PLANNED', 'FIXED', 'CLOSED']

IssueReportStatus = ['NEW', 'PUBLISHED', 'LINKED', 'DISMISSED']

ContactFormTarget = ['EMAIL', 'DISCORD_WEBHOOK', 'EXTERNAL_URL']
```

## Public issue tracker behavior

Custom React Server Components using the Local API — **not** a Payload
admin view.

- **List page:** search, sort (most upvoted / latest), category filters,
  status badges, pinned items. nuqs for URL state.
- **Detail page:** all Issue fields, upvote button with count, optional
  workaround text, "Needs More Info" callout, patch-note link when
  fixed.
- **Voting:** signed browser-token cookie, hashed in DB, one vote per
  issue per token, IP rate-limited via Upstash.
- **Public kanban:** `?view=board` renders issues grouped by status —
  read-only Server Component, no drag-and-drop for players.
- **Admin triage:** `payload-kanban-board` plugin gives studio users
  drag-and-drop status management in the admin panel.

## Issue report flow

Public form (Turnstile-protected) → studio review queue in Payload
admin. Actions: **publish** (afterChange hook creates an Issue from the
report), **link** to an existing Issue, or **dismiss**.

## Contact form

Configurable routing per GameProject:

- **EMAIL** — via Resend (jobs queue)
- **DISCORD_WEBHOOK** — formatted embed (jobs queue)
- **EXTERNAL_URL** — redirect

Protected by Turnstile + Upstash rate limiting.

## Pricing tiers

| Tier | Price | Includes |
| --- | --- | --- |
| FREE | $0 | 1 project, public site, patch notes, issue tracker, contact form, 50 submissions/mo, platform branding, no custom domain, RSS |
| INDIE | $19/mo | 1 project, unlimited submissions, custom domain, remove branding, attachments, email notifications |
| STUDIO | $39/mo | Up to 5 projects, team seats, priority support, all INDIE features |

Feature gating implemented via Payload access control (Phase 9).

## Development phases

Sequential; each phase must be deployable. Stop after each phase for
confirmation.

1. **Foundation** — `create-payload-app` (website template);
   db-postgres adapter + PgBouncer-aware settings; Docker Compose
   (Postgres + PgBouncer + app); multi-tenant plugin; storage-s3 → R2;
   Payload Auth (email + GitHub OAuth); Sentry; health endpoint;
   Upstash connection; deploy to Hetzner with Nginx + Cloudflare DNS.
2. **Collections + multi-tenancy** — define all collections, access
   control everywhere, verify tenant isolation with test tenants, slug
   validation/uniqueness.
3. **Landing page editor** — Lexical blocks (hero, features, media
   gallery, CTA, trailer); Page collection; public renderer at
   `/g/[gameSlug]`; external links; on-demand revalidation; R2 uploads
   through admin.
4. **Patch notes** — draft/publish workflow, public feed with
   pagination, detail pages, RSS, revalidation.
5. **Public issue tracker** — list (search/sort/filter/badges), detail,
   voting system, public `?view=board`, admin kanban plugin,
   revalidation.
6. **Issue reports + contact form** — Turnstile report form, admin
   review queue, report→issue promotion hook, contact routing via jobs
   queue, Resend, rate limiting on all public forms.
7. **Polish + deploy** — React Email templates, onboarding flow, SEO/OG,
   Turnstile everywhere, admin empty states, pino logging, Docker build
   optimization, Nginx hardening, production deploy.
8. **Custom domains** — domain input + verification in admin, Cloudflare
   DNS API CNAME verification, `next.config.ts` rewrites, Upstash
   domain cache, SSL via Cloudflare proxy.
9. **Billing** — Stripe Checkout, Customer Portal, webhook handler at
   `/api/webhooks/stripe`, plan gating via access control, FREE-tier
   usage tracking (50 submissions/mo).

**Sequencing rule:** ship Phases 1–7 on the platform subdomain, get real
user feedback, *then* build domains and billing.
