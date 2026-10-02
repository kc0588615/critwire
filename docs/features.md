# Product & Features

## Thesis

A **player feedback board and updates hub for each indie game**, on a
minimal, themable portal that links back to the studio's own website.
Critwire complements website builders and does not compete with them:
the studio keeps its site (Carrd, Wix, itch.io, Steam or its own), and
Critwire is where its players report bugs, suggest ideas, vote, and
read what shipped.

- **Audience:** indie game studios of one to a few people, most of
  whom already have a website.
- **Product:** per game, a feedback board (bugs and ideas, votes, four
  public stages) plus updates (patch notes with RSS), on a small hub
  at `/g/<game>` in the studio's colours, with a contact form.
- **Open source:** MIT. Self-hosting is free and always will be.
- **Hosted:** see Hosting below.
- **Moderation:** submissions are reviewed before they're public by
  default. Auto-publishing is an opt-in per game and still goes
  through the content filter.
- **No AI site generation.**

**Aggregation-first:** build native features only when no adequate
external tool exists for the studio's public-facing needs; otherwise
link out. The product is NOT: a website builder, documentation
platform, ticketing system, forum, Discord replacement, sprint board,
merch storefront, live game backend, telemetry vendor, or
bug-reporting SDK.

## Collections

All tenant-scoped unless noted; tenant field is injected by the
multi-tenant plugin.

### Tenants (plugin-managed)
One tenant = one Workspace (studio). Plugin handles tenant field
injection, admin tenant switcher, and access filtering. Platform
fields, which only a super admin writes:

- `suspended`: takes the studio's portals off the public site and
  refuses its members' creates and updates (see Hosting).
- `createdBy`: the user whose onboarding created the studio (unique,
  so one self-service studio per user); empty for studios a super
  admin makes.

### Users (Payload built-in, extended)
Email/password (Payload auth). Tenant association via plugin.
Roles: `admin` (global), `owner`, `member`.

- **Email verification** (`auth.verify`): Payload signs nobody in
  until their address is verified. A self-service account verifies by
  choosing its password on `/verify/<token>`; users a super admin
  creates start verified.
- `email` and `_verified` are super-admin fields, so "verified" always
  means this address was confirmed. Users change only their name and
  password.
- Password recovery goes only through the guarded "Forgot password?"
  form (`/admin/forgot`); Payload's REST and GraphQL forgot-password
  operations are refused.

### GameProject
Primary game entity; its slug is the portal's URL (`/g/<slug>`, unique
across studios). Fields:

- **Identity:** name, slug, pitch (`description`, one line, at most
  240 characters), logo, key art (`banner`).
- **Theme:** `theme.colors` (ten semantic colour tokens), typography,
  shape, density, motion. Every save is validated whole against the
  Zod schema in `src/lib/game-portal/theme.ts`, WCAG contrast
  included; unset values fall back to the default theme.
- **Links** (approved outbound URLs, shown as given): website, steam,
  epic, itch, discord, support, docs, merch, playstation, xbox,
  nintendo, gog, youtube, pressKit, privacy, terms. `website` is the
  "Official site" link in the portal's nav and footer.
- **Availability:** releaseState, releaseDate, currentVersion,
  platforms[] (platform, storeUrl, label).
- **Contact form** (`contact`): target, email, Discord webhook,
  external URL, Tally.
- **Feedback form** (`reportForm`): provider (native, Tally or
  external); for the native form, `acceptIdeas` and
  `reviewSubmissions` (both on by default).
- **Review:** `flagged` and `flagReasons`, set by the content filter
  (see Holding a studio's text for review).
- customDomain, customDomainVerified (Phase 9); timestamps.

### PatchNote ("Updates" in the admin and the portal)
Draft/publish workflow. Fields: gameProject (rel), title, slug (unique
per project), summary, content (Lexical), versionLabel, isPublished,
publishedAt, flagged and flagReasons (set by the content filter),
timestamps.

### Issue ("Feedback" in the admin)
A public feedback item, a bug or an idea. Fields: gameProject (rel),
title, slug (unique per project; `new` is reserved for the submit
form), summary, details, type, category, status, isPublic, isPinned,
needsMoreInfoText, workaroundText, fixedInPatchNote ("Shipped in
update", rel, optional), upvoteCount (number, default 0), timestamps.

### IssueReport ("Submissions" in the admin)
Inbound player submission. Fields: gameProject (rel), issue (rel,
optional — set when linked), title, description, type, category,
submitterEmail / platform / gameVersion (all optional; ideas carry no
platform or version), status, flagged and flagReasons (set by the
content filter), timestamps.

### IssueVote ("Votes" in the admin)
Fields: issue (rel), browserTokenHash, timestamps. Unique constraint:
`[issueId, browserTokenHash]`.

### Media (Payload built-in)
Upload collection via `@payloadcms/storage-s3` → R2, or local disk in
`media/` without R2. Game logos, key art and update images: raster
only (PNG, JPEG, WebP, GIF, AVIF), served only through
`/api/media/file/`.

### AbuseReport ("Abuse reports" in the admin; platform-level)
A visitor's report about a portal, from "Report this page". Not
tenant-scoped, and only super admins can see it. Fields: pageUrl (the
reported `/g/<slug>` path), gameProject (rel, optional), reason (spam,
scam or phishing, offensive, impersonation or copyright, other),
details, reporterEmail (optional), status (open, resolved, dismissed),
timestamps.

## Enums (Payload select options)

Canonical values in `src/collections/options.ts`.

```ts
FeedbackType = ['BUG', 'IDEA']

IssueCategory = ['INFORMATION', 'PATCH_NOTES', 'GAMEPLAY', 'CRASHES',
  'USER_INTERFACE', 'AUDIO', 'VISUAL', 'QUESTS', 'PERFORMANCE', 'OTHER']

IssueStatus = ['REPORTED', 'INVESTIGATING', 'NEEDS_MORE_INFO',
  'WORKAROUND_AVAILABLE', 'PLANNED', 'IN_PROGRESS', 'FIXED', 'CLOSED']

IssueReportStatus = ['NEW', 'PUBLISHED', 'LINKED', 'DISMISSED']

ContactFormTarget = ['EMAIL', 'DISCORD_WEBHOOK', 'EXTERNAL_URL', 'TALLY']
```

## Public stages

Players never see the internal statuses. One function
(`publicStage` in `src/lib/game-portal/stages.ts`) maps them to four
public stages; every public surface uses it.

| Public stage | Internal statuses |
| --- | --- |
| Under review | `REPORTED`, `INVESTIGATING`, `NEEDS_MORE_INFO`, `WORKAROUND_AVAILABLE` |
| Planned | `PLANNED` |
| In progress | `IN_PROGRESS` |
| Shipped | `FIXED` |
| (archived) | `CLOSED` |

An archived item leaves the board, the list and the hub, keeps its page
(marked "Archived") and stops taking votes (`/api/vote` answers 409).

## The portal

Custom React Server Components using the Local API — **not** a Payload
admin view. Every URL comes from `portalPaths` in
`src/lib/game-portal/paths.ts`. The chrome (nav: Updates, Feedback,
Contact) shows an "Official site" link back to the studio whenever
`links.website` is set, and renders in the project's theme.

- **Hub** (`/g/<game>`): a small header (name, key art, pitch, the
  build line, "Get the game", other stores, Discord, Official site),
  then the three latest updates (with RSS) and the top five open
  feedback items, with "Report a bug" and, when ideas are on, "Suggest
  an idea".
- **Feedback list** (`/feedback`): search, type, stage and category
  filters, sort (most upvoted / latest), stage badges, type tags,
  pinned items. nuqs for URL state (`feedbackSearchParams.ts`).
- **Board** (`/feedback?view=board`): one column per public stage, 25
  items each with "See all N" to the filtered list; type filter.
  Read-only, no drag-and-drop for players.
- **Item page** (`/feedback/<slug>`): all public fields, upvote button
  with count, workaround and "Needs more info" callouts, and "Shipped
  in <version>" linking to the update when it's published.
- **Updates** (`/updates`, `/updates/<slug>`, `/updates/feed.xml`):
  paginated feed, detail pages and RSS. An update's page lists "From
  your feedback": the public items whose "Shipped in update" is that
  update.
- **Voting:** signed browser-token cookie, hashed in DB, one vote per
  item per token, IP rate-limited via Upstash.
- **JSON feeds** (`/feedback.json`, contract v1, and `/updates.json`,
  JSON Feed 1.1): the public items and updates, readable from any
  site, never more than the portal shows (`docs/embed.md`).
- **Old URLs** (`/issues/*`, `/report`, `/patch-notes/*`) redirect
  permanently (`redirects.ts`); RSS item GUIDs keep the old
  `/patch-notes/` path so readers don't redeliver items.

## The embed

A studio pastes one `<script>` tag (`/embed/v1.js`) into its own site
and gets the game's **board** (public items with votes, stage and type
filters) or its **updates** (the latest three, with "From your
feedback"), or a floating **Feedback** button that opens the board in
a dialog. Wix takes the iframe instead. Full detail in
`docs/embed.md`.

- An iframe from critwire, in the game's colours and the host page's
  font, light, dark or following the visitor. No forms and no images:
  reporting, suggesting and reading open critwire's own pages.
- **Voting** opens the item page in a popup, where the portal's own
  cookie counts one vote per browser across the portal and every
  site. No site can vote for a player.
- Every copy is at most 5 minutes old; a held or suspended game gives
  an empty embed. No cookies, and nothing read from the host page but
  its font.
- "Powered by Critwire" follows the portal footer's rule.
- The **Embed** tab of "Put critwire on your site" builds the
  snippets, with a live preview and per-platform instructions.

## Submissions: submit, filter, review

Configurable per GameProject (`reportForm`):

- **native** (default) — the Critwire form at `/feedback/new`
  (Turnstile-protected, rate-limited). It asks "Bug or idea?" first
  (straight to the bug form when `acceptIdeas` is off; the route
  refuses ideas then). Every submission lands in `issue-reports`:
  1. **Content filter** (`screenText`, `src/lib/moderation/screenText.ts`):
     on create and on a title or description change, sets `flagged`
     and `flagReasons` (offensive words, three or more links, or any
     link shortener). Local, no external service.
  2. **Auto-publish:** when the game's `reviewSubmissions` is off, a
     new unflagged submission is published at once. Flagged ones
     always wait for a studio.
  3. **Review queue** in the admin (Submissions): **publish**
     (a `beforeChange` hook creates the feedback item from the
     submission, copying its type), **link** to an existing item, or
     **dismiss**.
- **tally** — embed or button to a studio-owned Tally form;
  submissions stay in Tally.
- **external** — link out to a GitHub issue template, Linear, Discord,
  etc.

## Updates ↔ feedback

A feedback item's "Shipped in update" (`fixedInPatchNote`) links it to
the update that shipped it. The item's page, list row and board card
show "Shipped in <version>"; the update's page lists the item under
"From your feedback". Issue and vote hooks revalidate the linked
update's page.

## Holding a studio's text for review

The content filter that screens player submissions also screens a
studio's own public text: a game's name and pitch, and an update's
title, version label, summary and content. It runs on create and
whenever that text changes, on every write path, and sets `flagged`
and `flagReasons`.

- A **held game** shows the neutral `/unavailable` page instead of its
  portal; a **held update** is missing from the feed, its page, RSS
  and the hub.
- The studio sees the hold and its reasons in the admin, read-only.
- A super admin approves by unticking `flagged`. Unchanged text isn't
  screened again, so the approval sticks.

Feedback items a studio writes, and link targets inside rich text,
aren't screened.

## Contact form

Configurable routing per GameProject:

- **EMAIL** — via Resend (jobs queue)
- **DISCORD_WEBHOOK** — formatted embed (jobs queue)
- **EXTERNAL_URL** — redirect / open external page
- **TALLY** — embed or button to a studio-owned Tally form

Native EMAIL / DISCORD_WEBHOOK paths are protected by Turnstile +
Upstash rate limiting. Tally paths do not hit Critwire POST endpoints.

## Admin feedback triage

The Feedback (issues) list view includes a **Kanban** board (one column
per internal status, drag-and-drop via DnD-Kit + Payload `orderable`)
and the standard **Table** view. It follows the admin's tenant
selector. Public player `?view=board` remains read-only.

## Hosting

- **Self-hosting** is free forever (MIT). Signup and the limits are
  off by default; see `docs/self-hosting.md`.
- **Hosted:** open signup, free during early access, with limits that
  keep each site minimal (Phase 8).
- A paid hosted tier may come later. There is no billing work now.

### Open signup (`CRITWIRE_OPEN_SIGNUP=1`)

1. **`/signup`**: an email address and Turnstile. Every accepted
   address lands on "Check your inbox", so the form never reveals which addresses have
   accounts. A pending address gets its existing link again; a verified
   one gets nothing.
2. **`/verify/<token>`**: the link from the email. Opening it changes
   nothing (mail scanners open links); the person chooses a password
   there, which verifies the account and signs them in.
3. **`/onboarding`**: game name, website and an optional store link.
   That creates a studio they own and one game, in one transaction.
4. **`/g/<slug>?welcome=1`**: the live portal with a "next steps"
   panel: "Put critwire on your site" (the share kit inline: links,
   buttons and the live badge, and the embed), add your first update,
   turn on ideas.
   The admin dashboard lists the same steps as links, the first one to
   the game's **Share** tab. If the filter held the name,
   `/onboarding?held=1` says the portal is waiting for a quick review.

Unverified accounts own nothing, so nothing of theirs is ever public.
There are no invites; a super admin adds teammates in the admin.

### Hosted limits

One module, `src/lib/limits/`, driven by environment variables and off
unless set. The hosted values are 3 games per studio, 100 MB of media
per studio and 200 public feedback items per game. Studio users who
reach a limit get a message in the admin; the admin dashboard lists
the limits in force. A player's submission that would auto-publish at
the feedback limit waits for review instead.

### Abuse protection

- Signup, verification, password recovery and abuse reports are behind
  Turnstile and per-IP rate limits, and signup and recovery share a
  per-address budget of 3 emails an hour.
- **Suspension:** a super admin ticks the studio's `suspended`. Its
  portals show `/unavailable`, its content and files leave the public
  API, and its members can still sign in and delete but can't create
  or update anything, drafts included. Unticking restores everything.
- **Report this page:** every portal's footer links to
  `/report-abuse`, which files an abuse report for super admins. Their
  dashboard counts open reports, held games and held updates.

## Development phases

Sequential; each phase must be deployable. Stop after each phase for
confirmation.

1. **Foundation** — `create-payload-app` (website template);
   db-postgres adapter + PgBouncer-aware settings; Docker Compose
   (Postgres + PgBouncer + app); multi-tenant plugin; storage-s3 → R2;
   Payload Auth; Sentry; health endpoint; Upstash connection; deploy
   to Hetzner with Nginx + Cloudflare DNS.
2. **Collections + multi-tenancy** — define all collections, access
   control everywhere, verify tenant isolation with test tenants, slug
   validation/uniqueness.
3. **Portal hub + theme** — `/g/[gameSlug]` hub (identity header,
   latest updates, top feedback); project theme with WCAG contrast
   checks; nav and footer with the link back to the studio's site; R2
   uploads through admin.
4. **Updates** — draft/publish workflow, public feed with pagination,
   detail pages, RSS, revalidation.
5. **Feedback board** — bugs and ideas, four public stages, list
   (search/filter/sort), board, item pages, voting, admin kanban
   (DnD-Kit), updates ↔ feedback links, revalidation.
6. **Submissions + contact** — Turnstile "Bug or idea?" form, content
   filter, review queue and opt-in auto-publish, submission → item
   promotion, contact routing via jobs queue, Resend, rate limiting on
   all public forms.
7. **Polish + deploy** — React Email templates, SEO/OG, Turnstile
   everywhere, admin empty states, pino logging, Docker build
   optimization, Nginx hardening, production deploy.
8. **Open signup** — signup with email verification, onboarding,
   suspension, abuse reports, screening a studio's own text, and the
   hosted early-access limits. No invites.
9. **Custom domains** — domain input + verification in admin,
   Cloudflare DNS API CNAME verification, `next.config.ts` rewrites,
   Upstash domain cache, SSL via Cloudflare proxy.

**Sequencing rule:** the owner chose open signup from day one
(2026-09-29), so Phase 8 ships with Phases 1–7 on the platform
subdomain. Get real user feedback *before* building custom domains
(Phase 9).
