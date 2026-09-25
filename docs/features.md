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
links (steam, epic, itch, discord, support, docs, merch, playstation,
xbox, nintendo, gog, youtube, pressKit, privacy, terms, trailer);
availability facts (releaseState, releaseDate, currentVersion, demoUrl,
platforms[] with platform/storeUrl/label); meta credits (developer,
publisher, engine, rating); contact form config (target type, email,
discord webhook, external URL, Tally); timestamps.

Links and availability are **approved fact URLs**: the flagship
template and AI generation select them by ref; they never rewrite them.

### GamePage (flagship template)
One landing page per project, rendered by the code-owned
`flagship-game-v1` template (see `src/site-templates/`). Fields:
gameProject (rel), kind, title, template, schemaVersion, `site` group
(typed slot configuration: nav, theme, hero, availability, features,
trailer, gallery, adaptive, latestUpdate, knownIssues, community,
finalCta, footer), generation provenance group, drafts/versions.

- Zod schemas in `src/site-templates/flagship-game-v1/schema` are
  canonical; Payload fields mirror them (parity-tested). Publishing
  runs full Zod validation including WCAG contrast; drafts may be
  incomplete.
- Section order is fixed by the template; config controls content,
  variants, and semantic theme tokens only. Action links are approved
  refs (`primary-store`, `demo`, `steam`, …, `contact`) — internal ops
  refs always resolve to `/g/[slug]/…` routes regardless of
  contact/report provider config.
- `latestUpdate` and `knownIssues` slots query live published data
  (explicit sorts — never the admin kanban `_order`).
- The legacy `content` blocks field is hidden but still renders for
  pages published before the template shipped; projects with no
  usable page get a derived flagship default from project facts.
- Authenticated draft preview via Payload live preview and the signed
  `/next/site-preview` route.
- The admin document controls expose **Generate with AI** only for a
  saved, unmodified page. Full, theme-only, and single-slot requests go
  through `/next/generate-site`, which rechecks tenant access, limits
  usage per tenant, sends a deliberately redacted context, validates
  structured output twice, and writes a new draft version only. The AI
  cannot publish, reorder sections, emit code/classes, invent URLs, or
  access `contact.*` / `reportForm.*` provider configuration.

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
- **Admin triage:** custom Issues list view (Kanban + Table) using
  DnD-Kit and Payload `orderable` — drag status/order in admin only.

## Issue report flow

Configurable per GameProject (`reportForm`):

- **native** (default) — Critwire form (Turnstile-protected) →
  `issue-reports` review queue in Payload admin. Actions: **publish**
  (afterChange hook creates an Issue from the report), **link** to an
  existing Issue, or **dismiss**.
- **tally** — embed or button to a studio-owned Tally form; submissions
  stay in Tally.
- **external** — link out to GitHub issue template, Linear, Discord, etc.

## Contact form

Configurable routing per GameProject:

- **EMAIL** — via Resend (jobs queue)
- **DISCORD_WEBHOOK** — formatted embed (jobs queue)
- **EXTERNAL_URL** — redirect / open external page
- **TALLY** — embed or button to a studio-owned Tally form

Native EMAIL / DISCORD_WEBHOOK paths are protected by Turnstile +
Upstash rate limiting. Tally paths do not hit Critwire POST endpoints.

## Admin issue triage

Issues collection list view includes a **Kanban** board (status columns,
drag-and-drop via DnD-Kit + Payload `orderable`) and the standard
**Table** view. Public player `?view=board` remains read-only.

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
   voting system, public `?view=board`, admin Issues kanban (DnD-Kit),
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
