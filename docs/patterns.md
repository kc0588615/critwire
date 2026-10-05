# Coding Patterns

How code is written in this repo. Prefer Payload conventions over custom
patterns in every case. Preserve existing Payload patterns unless there
is a clear defect.

## Collections

- One file per collection under `/collections`, registered in
  `payload.config.ts`.
- Collections define the schema (→ Drizzle tables), admin UI, and API
  endpoints in one place. There is no separate migrations/ORM config to
  maintain by hand.
- Enums are Payload `select` field options (see `docs/features.md` for
  the canonical enum values).
- After changing collections, regenerate types (`payload generate:types`)
  and rely on the generated types — don't hand-write duplicates.
- Slug fields: unique per project where specified; validate/normalize in
  `beforeChange` hooks.

## Access control (replaces v6.1 `ServiceContext`)

Every collection defines `access` functions for `create`, `read`,
`update`, `delete`. No collection ships without them.

```tsx
// Example: issues (the plugin adds the tenant constraint to each)
access: {
  read: issuesRead,               // src/access/publicRead.ts
  create: tenantMemberAccess,
  update: tenantMemberAccess,
  delete: tenantOwnerAccess,
}
```

- Roles: `admin` (global), `owner`, `member`.
- Authorization lives in access control functions — never manual checks
  scattered through route handlers.
- Field-level access control where a field is more sensitive than its
  collection. Platform fields (`roles`, memberships, `email`,
  `_verified`, `suspended`, `createdBy`, `flagged`) use
  `superAdminFieldAccess`, not `admin.readOnly`, so studio users see
  them read-only and super admins can still edit them.
- **Fields only server code writes** (`GameProject.discord`) use
  `discordLinkFieldAccess` (`src/access/discordLink.ts`): a super
  admin, or a Local API write that passes `context: { discordLink: true }`.
  REST and GraphQL clients can't set `req.context`, so they can't forge
  the field. The writers live in one module (`src/lib/discord/link.ts`)
  and write as the signed-in user (`overrideAccess: false`, `user`), so
  collection access, the tenant scope and `enforceTenantWrite` still
  apply. The one system write, `stopPosting`, only clears the link
  whose webhook just failed (compare and clear in its `where`). Keep
  such writers out of `'use server'` files: every export there is a
  callable endpoint.
- Public (player-facing) reads go through Payload REST or Local API with
  read-only access; no authentication required.
- **Records only server code writes** (`legal-acceptances`) set
  `create`, `update` and `delete` to `() => false` and are written
  through the Local API with `overrideAccess: true` by one named
  command (`recordLegalAcceptance`), so no client can forge or edit
  one.

### The legal gate

An account that isn't a super admin must have accepted the current
Terms of Service and Privacy Policy before it reaches the admin,
onboarding or any write. One query decides it everywhere:
`needsLegalAcceptance` (`src/lib/legal/acceptance.ts`) counts the
account's acceptances of both current versions, and memoizes the
answer in `req.context`, so a request costs one count however many
checks share it.

- **The admin:** `adminPanelAccess` is `Users.access.admin`. Payload
  sends an account it refuses to `/admin/unauthorized`, which
  `LegalGateView` replaces: it redirects to `acceptHref(redirect)`.
- **Onboarding:** the page and its submit route check right after the
  session and redirect to `acceptHref('/onboarding')`.
- **API writes:** `assertLegalAcceptance` (`src/access/legalWrite.ts`)
  answers 403 until the account accepts. `requireLegalAcceptance` runs
  it as a `beforeChange` hook on the plugin's tenant field, beside
  `enforceTenantWrite`, so every tenant-scoped write passes it;
  `requireLegalAcceptanceForTenant` does the same on `Tenants`, which
  has no tenant field. Writes with no user and super admins pass.
  Reads, sign-in and an account's own name and password stay open:
  `/legal/accept` needs them.
- **Only `/legal/accept/submit` records an acceptance,** for a signed-in
  account. Signup checks the same boxes, but whoever fills in `/signup`
  hasn't shown they own the address, so no record rests on it; the
  verified holder ticks them again at `/legal/accept`.
- **Bound to what was shown:** `legalConsentSchema`
  (`src/lib/validation/`) compares the versions from the form's hidden
  fields with the current ones at parse time, and
  `recordLegalAcceptance` refuses any other versions, whoever calls it.

**Versions come from front matter.** `legal/<slug>.md` holds `version`,
`effective` and `status`, read at runtime by `getLegalDocument`
(`src/lib/legal/documents.ts`): lazily, never at import, memoized in
production, and checked at boot (`assertLegalDocuments` in
`checkEnvironment`), so a broken document stops the server.
**A version names one text:** any change to a document's text, even a
typo, bumps its `version`, and every account accepts again. Each
acceptance also stores both files' SHA-256 digests, so the exact text
someone accepted can be found in git even if the rule is broken once.

### Public reads

`src/access/publicRead.ts` holds what an anonymous visitor may read,
one `Where` per collection: held content (`flagged`) and suspended
studios leave the public site through relationship paths such as
`tenant.suspended` and `gameProject.flagged`, so there are no copied
flags to keep in sync. Signed-in users get `true`, which the plugin
narrows to their own studios. Add a new public collection's rule there.

The one widening is `mediaFileReadOverride`, the plugin's
`accessResultOverride` for media: on file reads only, a signed-in
non-super-admin may also fetch what an anonymous visitor may, so
portals' images don't 403 for a signed-in studio user. Lists,
documents and the admin keep the tenant limit.

## Tenant isolation

- `@payloadcms/plugin-multi-tenant` injects the tenant field and filters
  every tenant-scoped collection automatically. **Never** manually inject
  or filter by workspace/tenant ID in application code.
- The plugin owns the Tenants collection (a tenant = a Workspace/studio)
  and the admin tenant switcher.
- Media folders (`payload-folders`) are tenant-scoped too: a studio
  only sees its own folders.
- **The tenant-write hook:** `enforceTenantWrite`
  (`src/access/tenantWrite.ts`) runs as a `beforeChange` hook on the
  plugin's tenant field for every tenant-scoped collection. A studio
  user may only write into a studio they belong to (400), and not while
  it's suspended (403). It's a hook, not a `validate`, because Payload
  skips field validation on draft saves. Writes without a user (votes,
  public submissions, seeds) and super admins pass. The legal gate's
  `requireLegalAcceptance` hangs on the same field (see The legal
  gate).
- **Self-service studios** are created only by `createStudio`
  (`src/lib/onboarding/`): the studio and the membership as the system,
  then the game as the new owner with `overrideAccess: false`, so every
  studio rule applies to it. `POST /api/users` and `POST /api/tenants`
  stay super-admin-only.
- Escape hatch: `payload.db.drizzle` for complex queries — must include
  explicit tenant scoping, since the plugin can't filter raw Drizzle.

## Hooks (replaces v6.1 service layer)

Business logic lives in collection lifecycle hooks, not standalone
services. The established hooks:

- **GameProject `afterChange` / `afterDelete`** — revalidate every
  portal page by route pattern, which covers renamed and deleted slugs.
- **PatchNote `beforeChange`** — stamp `publishedAt` on first publish
  only; `afterChange` / `afterDelete` revalidate the updates pages and
  the hub.
- **Issue `afterChange` / `afterDelete`** — revalidate the hub when a
  field it shows changes, and the page of any update the item is (or
  was) linked to through "Shipped in update". A write that only moves
  a kanban card (`_order`) revalidates nothing. **Issue
  `beforeDelete`** removes the item's votes in the same transaction.
- **IssueReport `beforeChange`**, in this order: **screen** (the
  content filter sets `flagged` / `flagReasons` on create, or when the
  title or description changes), then **auto-publish** (a new,
  unflagged submission becomes `PUBLISHED` when the game's
  `reviewSubmissions` is off and the game has room for another public
  item), then **promote** (status → `PUBLISHED`: create the Issue with
  `req`, same transaction, copying the type, and set the report's
  `issue` in the same write).
- **Screening a studio's text** (GameProject and PatchNote
  `beforeChange`): `screenTextHook(textOf)` (`src/hooks/screenText.ts`)
  is the one screening hook, IssueReport's included. It screens on
  create or when the text `textOf` builds changes, so a super admin's
  approval (unticking `flagged`) sticks. The held fields come from
  `moderationFields()` (`src/fields/moderation.ts`), so their access
  can't drift between collections.
- **Tenant `afterChange`** — `revalidateSuspension` revalidates every
  portal of the studio when `suspended` changes.
- **GameProject and Tenant `beforeDelete`** — `deleteGameContent` and
  `deleteStudioContent` delete what the game or studio holds, in the
  delete's transaction (see Deleting games and studios).
- **Users** — `guardAccountDeletion` (`beforeChange`),
  `anonymizeDeletedUser` (`afterChange`) and `refuseDeletedLogin`
  (`beforeLogin`) (see Account deletion).
- **IssueVote `afterChange` / `beforeDelete`** — own `upvoteCount`
  through `$inc`: increment on create, decrement in `beforeDelete` (so
  a concurrent withdrawal of the same vote can't decrement twice).
  Nothing else writes the counter. Both revalidate the hub and, for a
  shipped item, its update's page.
- **Discord posts** (PatchNote and Issue `afterChange`):
  `queueDiscordUpdatePost` queues when an update becomes visible
  (published and not held, and it wasn't before);
  `queueDiscordStagePost` queues on update when a public item's public
  stage changes to Planned, In progress or Shipped. Both go through
  `queueDiscordPost` (`src/lib/discord/posts.ts`), which checks the
  env first and reads the game's webhook with a privileged helper
  (`gameWebhook`), passing `req` only to stay in the write's
  transaction.

Rule: any hook that mutates published content calls `revalidatePath()`
or `revalidateTag()` **after** the DB write. A single page revalidates
by its URL (`/g/<slug>`); a subtree only by its route pattern, route
groups included (`PORTAL_ROUTE` and `UPDATES_ROUTE` in `src/lib/game-portal/paths.ts`), because Next never tags
pages with a concrete path's layout.

The embeds and the JSON feeds are outside this rule: they keep no
server cache (`force-dynamic`, no `revalidate`), so no hook refreshes
them. Their freshness is `EMBED_CACHE_CONTROL`
(`src/lib/embed/cacheControl.ts`), at most 5 minutes behind any cache
(`docs/embed.md`, Caching). Don't give them ISR: an expired entry is
served once more after `revalidatePath`, and the edge would keep it.

## Deleting games and studios

A delete that takes dependent rows with it does so in its own
transaction, before the row goes, through `deleteWhereOrThrow`
(`src/lib/payload/`): a Local API delete with `where`, `req` and
`overrideAccess` that throws one error naming every document it failed
to delete. Payload's bulk delete only reports failures, so never call
it bare where a partial delete would break a promise.

- **`deleteGameContent`** (GameProject `beforeDelete`): Discord post
  records, submissions, feedback items (each removes its votes),
  updates with their versions, then waiting contact jobs
  (`deleteContactJobs`). The keys to the game are NOT NULL, so the
  game can't go first. Each delete runs its collection's hooks, so
  items and updates revalidate themselves.
- **`deleteStudioContent`** (Tenant `beforeDelete`) replaces the
  plugin's cleanup (`cleanupAfterTenantDelete: false`), which ran after
  the delete, outside its transaction, and dropped failures. It
  deletes the studio's games first, then every other collection in
  `TENANT_SCOPED_COLLECTIONS` (exported from `src/plugins/index.ts`,
  so a newly scoped collection is cleaned too), media last because
  files can't roll back, then the studio from every user's
  memberships.

## Account deletion

Users are never hard-deleted (`access.delete: () => false`). A super
admin ticks `deleted`, and:

- `anonymizeDeletedUser` (`afterChange`) calls `anonymizeUser`
  (`src/lib/accounts/`), one Local API update in the same transaction
  with `context: { anonymizing: true }`: a `.invalid` email, "Deleted
  user", a random password (a `beforeChange` hook can't set one),
  `roles: ['user']`, no sessions (which revokes every JWT) and no
  reset or verification token. It reads the account back and throws
  unless the email changed and no session is left.
- `guardAccountDeletion` (`beforeChange`) makes `deleted` terminal:
  it refuses a super admin deleting their own account and, once
  deleted, any change but studio memberships, unless
  `context.anonymizing` is set.
- `refuseDeletedLogin` (`beforeLogin`) is the second lock on sign-in.
- `accountEmail` (`src/lib/validation/`) is signup's and password
  recovery's one email rule; it refuses `.invalid`, so neither reaches
  a deleted account.

What points to the account (`Tenants.createdBy`, memberships, legal
acceptances) stays and now shows "Deleted user".

## Shared legal copy

Every legal sentence is written once, in `src/lib/legal/copy.ts` (no
React, no fs, so Discord code can import it): the submit notice, the
sensitive-info warning and Discord's shorter one, `/feedback`'s
description and the consent boxes' labels. A sentence that names
documents is stored in parts, and each surface links them its own way:
`LegalCopyText` on the web, `noticeMarkdown` on Discord. The web uses
one component each (`src/components/legal/`): `LegalNotice` beside a
player form's submit button (which names it in `aria-describedby`),
`SensitiveInfoWarning` once at the top of the form (every free-text
field names it through `FormField`'s `describedBy`),
`LegalConsentFields` for the boxes and their hidden versions, and
`LegalLinks` for footers. Links come from `LEGAL_LINKS`
(`src/lib/legal/paths.ts`).

## Hosted limits

`src/lib/limits/` is the only place that knows the limits: `getLimits()`
reads them from the environment (off unless set, checked at boot), with
one count and one assertion per limit, and `describeLimits()` words
them for the dashboard. Its hooks (`checkGamesLimit`, `checkMediaLimit`,
`checkPublicFeedbackLimit` in `hooks.ts`) are collection `beforeChange`
hooks that the collections only register.

- They check only a studio user's writes into their own studio. Super
  admins and system writes pass, and a write into another studio is
  left to the tenant-write hook, so a limit message never reveals
  another studio's counts.
- A limit is a `LimitReachedError` (403), whose message the admin shows
  as its toast word for word. Never let a limit fail a player's
  request: system writes ask first (`hasPublicFeedbackRoom`).
- Counts use the Local API with `req`, in the write's transaction.

## Data access

- Server Components and Server Actions use the Local API:
  `payload.find`, `payload.create`, `payload.update`, `payload.delete`.
- React components never touch the database directly.
- Get the instance with `getPayload({ config })` (config imported from
  `@payload-config`).
- Public portal reads pass `overrideAccess: false`, so collection
  access decides what a player sees. Privileged reads live only in named
  helpers (`getContactRoute`, `getHasVoted`, `portalExists`) that return
  only what the page needs, never secrets.
- Portal pages and the portal layout get their game with
  `requirePortalProject(slug)`, never `getGameProject` + `notFound()`:
  a held or suspended portal redirects to `/unavailable`, an unknown
  one is a 404. Call it in every page as well as the layout, because
  Next re-renders pages without the layout on client navigation. Route
  handlers that return a `Response` use `getGameProject` and answer 404.
- **Embed routes** (`src/app/(embed)/`) use `getGameProject`, never
  `requirePortalProject`: its redirect would send the frame to
  `/unavailable`, which other sites can't frame. A missing game renders an empty embed, with no
  text and no theme, in the layout and every page.
- **The badge is the one exception** (`src/lib/share/badge.ts`): an
  unknown, held or suspended game gets the same neutral image, byte for
  byte, with status 200, because a host page would otherwise show a
  broken image and the response would tell unknown games from held
  ones. A badge URL with any query string gets a 308 to the bare URL,
  decided from `req.url` before any read, so made-up query strings cost
  neither a render nor a cache entry.
- Multi-step writes that must succeed or fail together run in
  `withTransaction` (`src/lib/payload/`), passing its `req` to each
  Local API call.
- Pages and admin components that read `isOpenSignup()` render per
  request (`await connection()`, or a request API such as `headers`,
  `searchParams` or `payload.auth`). The Docker image is built with an
  empty environment, so a prerendered page would keep the flag off.

## Embeds

- **Links are plain anchors** (`EmbedLink`): `target="_blank"
  rel="noopener"`, tagged through `embedHref` / `embedURL`
  (`src/lib/embed/links.ts`). Never `next/link`, which would prefetch
  on every host page view and navigate inside the frame.
- **No forms, no vote control, no `/api/vote` call.** Votes happen on
  the item page, in a popup (`docs/embed.md`, Voting). The board's
  filters are local state, never the URL, so nothing reaches the host
  page's history.
- **No images and no `next/font`**: the widget downloads no font file
  and uses the host's font through `--cw-font`.
- **The client gets only what it renders.** The board's rows are
  `EmbedFeedbackRow`s built key by key by `feedbackRow`, which
  `feedback.json`'s mapping spreads, so a row never carries a field
  the feed doesn't have.
- **`public/embed/v1.js` and protocol v1 are contracts**: they may only
  gain optional attributes and message types. Anything incompatible is
  `/embed/v2.js`.

## Uploads

Files are served only through `/api/media/file/<name>`, which checks
access on every request. Never link or render an upload by another
path: local uploads live in `media/`, outside `public/`, the image
optimizer is off, and the R2 bucket stays private. Render images with
`ImageMedia`, which builds its `srcSet` from Payload's generated sizes.
Media accepts raster images only (`mimeTypes`).
- Draft Mode reads authorize the preview user: drafts only for a super
  admin in Draft Mode, still with `overrideAccess: false`.

## Client-state rule

Default to Server Components, Server Actions, `router.refresh()`, and
nuqs for URL state (filters/sort/search on public pages). Add SWR or
TanStack Query only when a specific surface truly needs client-side
freshness or optimistic state — justify it in the PR/commit.

## Validation

- Zod at every public API boundary (contact and feedback submission,
  `/api/vote`, `/api/referrals`, signup, verify, onboarding, password recovery, abuse
  reports and `/legal/accept/submit`). Shared schemas in
  `/lib/validation`: `accountEmail`, and `legalConsentSchema`, which
  signup intersects with its email (`.and()`).
- Inside Payload, prefer field-level validation on collections over
  duplicate Zod checks.

## Jobs (Payload Jobs Queue, replaces Trigger.dev)

Tasks are defined in `/jobs` and registered in `payload.config.ts`:

- `discord-webhook` — Discord embed for contact submissions targeting
  Discord.
- `email-contact-form` — contact submission via Resend to the studio's
  configured email.
- `discord-update-post`, `discord-stage-post` (`src/jobs/discord.ts`)
  — a game's Discord post for a published update, or for an item that
  reached a public stage (`docs/discord.md`).
- `purge-contact-jobs` (`src/jobs/contact.ts`) — every 10 minutes on
  the `default` queue (Payload's `schedule`), deletes every contact
  job that completed and every one older than 30 days, in any state.

The app is a persistent server, so the built-in scheduler just works —
no cron workarounds. The submit route runs its own job (`jobs.runByID`);
the autorun cron retries failures.

- **Delayed and merged jobs:** queue with `waitUntil` and give the
  task a `concurrency` key with `supersedes: true`
  (`jobs.enableConcurrencyControl` is on). Queuing again for the same
  key deletes the pending job, so quick changes become one job, run by
  the autorun after the last one's delay. The Discord posts wait 60 s.
- **Their own queue when servers differ:** Discord posts run on the
  `discord` queue, which `jobs.autoRun` adds only when Discord is on.
  A server with Discord off that shares the database (E2E's second
  server) never claims a post and completes it unsent.
- **Read as an anonymous visitor in jobs.** A job's `req.user` is
  whoever ran the queue: nobody for the autorun, a super admin or the
  `CRON_SECRET` bearer for `/api/payload-jobs/run`, and `publicRead`
  gives any signed-in user everything. So a job that must respect what
  the public can see reads without the job's `req` and with
  `overrideAccess: false`, as the portal's queries do. Privileged reads
  and writes are named helpers with `overrideAccess: true` and no
  `req` (`gameWebhook`, the post log, `stopPosting`).
- **No `@payload-config` in modules the config imports** (hooks, jobs,
  access): take `payload` or `req` from the caller, so there's no
  import cycle through the config.

- Jobs are super-admin only: the jobs collection and `jobs.access.run`
  (or the `CRON_SECRET` bearer). They hold every studio's messages.
- Contact tasks deliver or throw. A missing project, a changed routing
  target, an unset `RESEND_API_KEY` or a disallowed webhook URL throws,
  so the job keeps its input and error instead of disappearing.
- **A contact job holds a player's message and optional email, and the
  Privacy Policy promises how long.** Three layers remove it, each
  failing loudly: `jobs.deleteJobOnComplete: true` (stated in
  `payload.config.ts`, though it's Payload's default) deletes it on
  delivery; `purge-contact-jobs` deletes any completed one Payload
  failed to delete, and any older than 30 days; and deleting its game
  or studio deletes it. All go through `deleteContactJobs`, which
  matches the two contact task slugs (`CONTACT_TASKS`). Never log a
  contact job's input or recipient.
- **The scheduler's global is locked.** A scheduled task makes Payload
  add the `payload-jobs-stats` global with default access, so any
  signed-in account could move `lastScheduledRun` and postpone the
  sweep. `lockJobStatsGlobal` (`src/lib/payload/`) wraps the built
  config and limits it to super admins, and throws if the global is
  missing. The scheduler writes through `payload.db`, which skips
  access.
- Recovering a failed job: fix the configuration, then as a super admin
  open the job in the admin and untick `hasError`; the autorun picks it
  up again. A contact job can be recovered only within its 30 days.

## Public form endpoints

Every public form endpoint follows the same shape:

1. Zod-parse the body.
2. Verify Cloudflare Turnstile token (`/lib/turnstile`).
3. Rate-limit by IP via Upstash (`/lib/upstash/rate-limit.ts`).
4. Do the work (Local API write, or enqueue a job).
5. Structured pino log + Sentry capture on failure.

Steps 1–3 are `guardPublicForm` (`/lib/public-forms/guard.ts`); use it
for any new form, with its own rate-limit `key` and `scope` (for
example `signup`, `verify`, `password-reset`, `abuse-report`) so forms
don't share a per-IP budget. Forms that send email to an address also
spend that address's budget (`checkAccountEmailBudget`, 3 an hour,
shared by signup and password recovery), and refuse when email isn't
deliverable (`isEmailDeliverable`). Answer through `formResponse`: a
303 back to the page for a browser, JSON for other clients. In production, a form endpoint refuses to run without
Turnstile (`TURNSTILE_SECRET_KEY`) or Upstash. Only local development
skips them, plus Upstash in E2E builds (`RATE_LIMIT_OPTIONAL=1`).
Contact webhooks must be Discord's (`isAllowedDiscordWebhookUrl`,
checked on save and again before sending, which also refuses
redirects). Every Discord webhook call, contact or post, goes through
`executeDiscordWebhook` (`src/lib/discord/webhook.ts`), which adds
`allowed_mentions: { parse: [] }` and throws `DiscordWebhookGoneError`
on a deleted webhook.

## The Discord interactions endpoint

`POST /api/discord/interactions` is public but isn't a form: Discord's
servers call it, so there's no Turnstile and no client IP to limit.
Its shape, in order (`src/app/api/discord/interactions/route.ts`):

1. 404 when Discord is off, before reading the request.
2. Read the raw body and verify it before parsing: the
   `X-Signature-Timestamp` within ±300 s and the Ed25519
   `X-Signature-Ed25519` over timestamp‖body, with Node's `crypto`
   (`src/lib/discord/verify.ts`). Any failure is a bare 401 with no
   Sentry event: Discord sends bad signatures on purpose when the
   endpoint URL is saved.
3. Zod on the interaction (`src/lib/discord/interactions.ts`): our
   application ID, a server, a member. Anything else is a 400.
4. Answer within Discord's 3 s. Commands answer at once with a form or
   an ephemeral message, with no writes. A form submission is answered
   after its report is saved: Zod on the values, the game bound to the
   form and still linked, a rate limit per Discord account and game
   (Upstash capped at 1 s), then `createPlayerReport`, the web form's
   own path (`src/lib/game-portal/reports.ts`). A unique
   `discord.interactionId` turns a replay into "That was already
   sent."
5. On a throw: Sentry, the log, and an ephemeral "nothing was sent"
   reply. A submission over 2 s logs a warning. Every reply is
   ephemeral with `allowed_mentions: { parse: [] }`.

## Public JSON endpoints

`/api/vote` and `/api/referrals` are called by the portal's own
scripts, never by forms, and follow one shape:

1. `isJSONRequest(req)` (`src/lib/public-forms/request.ts`) first: the
   media type must be exactly `application/json`, or the route answers
   400 without reading the body. Forms and `no-cors` fetches can only
   send `text/plain` and the form encodings, `text/plain;
   x=application/json` included, which is why it doesn't use
   `includes()`.
2. No CORS headers. A cross-site JSON fetch needs a preflight, which
   Next answers with no `Access-Control-*` header, so it fails and the
   browser never sends the request.
3. Then Zod on the body, an Upstash rate limit by IP, and a read of
   the target through access (`overrideAccess: false`), before the
   work.
4. Sentry capture and a pino log on failure, answered with a 500.

The public feeds (`feedback.json`, `updates.json`) are the opposite
case: read-only GETs that any site may read. Every answer, 404s
included, goes through `feedResponse` (`src/lib/game-portal/feeds.ts`):
`Access-Control-Allow-Origin: *`, never
`Access-Control-Allow-Credentials`, and `EMBED_CACHE_CONTROL`. They
read no cookies and show nothing the portal doesn't.

The referral beacon (`ReferralPing`) sends
`Content-Type: application/json` explicitly and ignores the answer, so
it never affects the page. It has no Turnstile: it isn't a form and
has no user input. The whitelist, the public-game check and the rate
limit bound it instead.

## Voting model

- Signed browser-token cookie; the token is **hashed** before storage
  (`/lib/security`).
- One vote per issue per token, enforced by a unique
  `[issue, browserTokenHash]` index. The route treats a duplicate or an
  already-withdrawn vote as done.
- `upvoteCount` is owned by the IssueVote hooks (see Hooks).
- IP rate limiting via Upstash on the `/api/vote` endpoint.

## Rich text

- Lexical (via Payload) everywhere — no TipTap.

## Error handling & observability

- Sentry capture in hooks, jobs, and API routes where failures matter.
- Structured JSON logging with pino; log hooks/access-control events,
  webhook processing, email delivery, contact routing, domain
  resolution.
- Fail closed on security paths: unknown domains → generic 404, invalid
  Turnstile → reject, missing tenant context → deny.

## Anti-patterns (grounds for rejection)

- Manual tenant filtering outside the plugin.
- Standalone service classes / `ServiceContext`-style contexts.
- Direct DB access from components.
- New abstractions for a single call site.
- Reintroducing removed dependencies (Clerk, Prisma, TipTap,
  Trigger.dev).
- Client-side data fetching where a Server Component suffices.
- Building infrastructure a managed service or Payload already provides.
