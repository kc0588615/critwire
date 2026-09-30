---
mission: open-signup
project: critwire
branch: agent/open-signup
status: active
started: 2026-09-30 09:38 UTC
---

# Mission: critwire open signup

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Anyone can create a critwire portal on the hosted instance, on their own, in a few minutes, without letting the instance become a host for abuse. When this mission is done:

1. **Self-serve signup.** From `/signup`, a person signs up with an email and password and verifies their email. They then enter three things: game name, their website URL, and a store URL (optional). That creates the user, a studio tenant owned by them, and one game. They land on their live portal at `/g/<slug>` with a short "next steps" panel: share this link, add your first update, turn on ideas.
2. **Sign-in and password reset** work for these users. Payload's built-in auth flows are acceptable if they're styled to match.
3. **Hosted-tier limits, not billing.** A single config module, driven by environment variables, holds the free-tier limits: games per studio, media storage per studio, and public feedback items per game. **Every limit is off by default, so self-hosted instances are unlimited.** The hosted instance turns them on. Hitting a limit shows a clear message in the admin, never a crash. Pick modest defaults for the hosted values and record them.
4. **Abuse protection:**
   - Signup is protected by Turnstile and rate limiting.
   - An account's portal isn't public until its email is verified.
   - The content filter from the feedback pivot also screens a studio's own public text (game name, pitch, updates). Flagged text holds that content back for super-admin review.
   - A super admin can **suspend** a studio: its portal shows a neutral "unavailable" page, and its members can't publish.
   - Portals on the hosted instance have a "Report this page" link in the footer, which goes to a queue only super admins can see.
5. **The marketing page `/`** gets a "Create your portal" call to action, which leads to `/signup`, next to the self-host link.
6. **Self-hosting docs:** `docs/self-hosting.md` lists which services are required and which are optional (Postgres, Turnstile, Upstash, Resend, R2, Sentry), what fails when one is missing, and how to set up a first super admin without signup.

### Why

The owner chose open signup from day one (2026-09-29). The owner will host free portals during the early years, so the sites must stay minimal and cheap, with limits ready for an eventual paid tier. Self-hosting must always stay free and unrestricted.

### Scope

In:
- Signup, email verification, first-run onboarding, limits, suspension, the abuse-report queue, the marketing call to action, and the self-hosting docs.
- Opening the Users and Tenants collections to self-service creation in a controlled way. Today only a super admin can create them (`src/collections/Users/index.ts:10`, `src/collections/Tenants/index.ts:13`, `src/plugins/index.ts:51-56`).

Out:
- Billing and payments, custom domains, inviting teammates, OAuth sign-in, the triage inbox redesign, embeddable widgets, and a "lite" self-host profile without Turnstile or Upstash.
- Weakening the tenant isolation from `agent/architecture-pass`. A new user must never see or edit another studio's data. Prove it with E2E tests.

### Definition of done

- `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` pass, and the full E2E suite passes.
- New E2E tests cover:
  - The whole signup flow: sign up, verify through a captured email, onboard, and see the live portal.
  - An unverified account's portal not being public.
  - A second signed-up user being unable to read or write the first user's studio.
  - Each limit, when enabled, blocking with a message; and nothing being blocked when limits are unset.
  - A suspended studio's portal and publishing.
  - The report-this-page flow.
- Screenshots (desktop 1440 px and mobile 390 px) of the signup, verify, onboarding and next-steps pages and the updated `/`, saved in `/srv/critter-ai/agent-state/missions/open-signup/screenshots/` with an `index.html`.
- The Summary lists the chosen hosted limit values, the environment variables production needs (with no values), and any handoff items.
- Branch `agent/open-signup` pushed. Don't merge it.

### Decision rules

- **Fewest steps from "sign up" to a live portal link.** Anything not needed to get there waits until after.
- **Nothing an unverified or suspended account creates is public.**
- **Limits:** one module and one check per limit, enforced on the server. The UI only explains them.
- **Email in development and tests:** without Resend configured, verification emails go to the log, or to a test inbox the E2E suite can read. Production needs Resend (the owner parked the keys as H3). Don't ask for them again unless production deployment is in scope.
- **Owner decisions go in the handoff file.** Anything that truly needs the owner becomes a handoff item. Pick the more conservative option and carry on.

### Notes

- This mission builds on `agent/feedback-pivot` (start with `--from agent/feedback-pivot`), unless it has been merged.
- The feedback pivot leaves a minimal portal hub that is built from the game's details, so a new game's portal is publishable at once.
- The product review, `/srv/critter-ai/agent-state/missions/briefs/2026-09-29-product-review.md` (section 5, "Onboarding"), describes the target flow.
- A demo server may be running on port 3000 (`systemctl --user stop critwire-demo`). The E2E suite needs that port.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Commit `7e8272a`, 2026-09-30 09:38–09:44 UTC.

- **Setup:** created the disposable E2E database `critwire_m_open_signup_e2e` and added `E2E_DATABASE_URL`, a generated `CRON_SECRET` (for `pnpm seed:critter-connect`) and `CRITWIRE_CONTACT_URL` (H6) to the worktree `.env`. `pnpm install --frozen-lockfile`: up to date. `pnpm payload migrate`: all 15 migrations applied to the fresh mission database, no `dev` row.
- **Typecheck** (`pnpm exec tsc --noEmit`): pass.
- **Lint** (`pnpm lint`): pass, 0 errors, 20 warnings (all `@typescript-eslint/no-unused-vars`). Pre-existing; don't add new ones.
- **Int** (`pnpm test:int`): 2 files, 13 tests passed.
- **E2E** (`pnpm test:e2e`): 75 passed, 0 failed, 4.1 min. Report: `/srv/critter-ai/agent-state/missions/open-signup/e2e-baseline/` (`pnpm exec playwright show-report <dir>`; `run.log` alongside).
- **Ports:** the E2E suite serves on 3100 (sink on 3101); `critwire-demo` was inactive.
- **Handoff:** no items with `Status: done`. H3 (production keys) is `later`, H7 (LICENSE copyright) is waiting and blocks nothing.

## Architecture

Checked against the code at `27d23a3` and against Payload 3.85.2's and Next 16.2.6's own source in `node_modules`. Paths under `payload/dist/…`, `plugin-multi-tenant/dist/…`, `next/dist/…` and similar are that source. Revised after both reviews (see **Revision notes**); F11 and F12 were added in the revision.

### Findings

Ranked by impact.

**F1 · Draft saves skip the tenant-membership check (tenant-isolation hole).**
- **Where:** `src/plugins/index.ts:57-59` enforces "a studio user may only write into their own studio" as the tenant field's `validate` (`validateTenantMembership`, `src/access/tenantAccess.ts:55-63`).
- **Why it fails:**
  - Payload skips field validation on draft saves: `skipValidation: isSavingDraft && !hasDraftValidationEnabled` (`payload/dist/collections/operations/create.js:148`, `…/operations/utilities/update.js:154`).
  - The plugin's create access returns a `Where`, which Payload only checks for truthiness (`auth/executeAccess.js`).
  - Updates have drafts (`src/collections/PatchNotes/index.ts:85-88`).
- **Effect:** any signed-in studio user can `POST /api/patch-notes?draft=true` with another studio's `tenant`, or move their own draft there. `tenant-isolation.spec.ts` S1.2 only tries non-draft writes, so the suite passes today. Open signup makes every stranger a studio user.
- **Breaks:** fail fast, and the isolation rule.
- **Fix:** enforce it in a `beforeChange` hook on the tenant field (§7). Field hooks run on drafts: `fields/hooks/beforeChange/promise.js:56-86` runs them before the skippable validation. Add the draft case to the isolation E2E.

**F2 · Media accepts any file type and serves it from the admin's origin.**
- **Where:** `src/collections/Media.ts:42-80` sets no `upload.mimeTypes`.
- **Why it fails:** without `mimeTypes`, Payload refuses only executables and HTML, and runs its SVG safety check only when `mimeTypes` is set (`uploads/checkFileRestrictions.js`).
- **Effect:** a signed-up user can upload a scripted SVG, a PDF or a ZIP. `/api/media/file/<name>` serves it publicly (`read: anyone`, `Media.ts:23`) on the same origin as `/admin`. That is stored XSS against super admins, and free file hosting.
- **Fix:** `mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']`. The portal only shows raster images (logo, key art, update images), and the seed and E2E fixtures upload PNGs.

**F3 · Nothing can take a studio's content off the public site, and the portal gate is copied into nine files.**
- **Where visibility is decided:** per document only.
  - Game projects: `read: () => true` (`GameProjects/index.ts:42`).
  - Updates: by `_status` (`PatchNotes/index.ts:16-19`).
  - Items: by `isPublic` (`Issues/index.ts:29-32`).
  - Media: `anyone`.
- **Effect:** suspension and "held for review" can't be expressed.
- **The copied gate:** `getGameProject(slug)` + `if (!project) notFound()` appears in:
  - the layout (`g/[gameSlug]/layout.tsx:21-22`);
  - the hub (`page.tsx:25-26`);
  - the updates feed, a feed page and an update (`updates/page.tsx:23-24`, `updates/page/[pageNumber]/page.tsx:25-26`, `updates/[slug]/page.tsx:26-27`);
  - the feedback list, an item and the form (`feedback/page.tsx:81-82`, `feedback/[slug]/page.tsx:43-44`, `feedback/new/page.tsx:67-68`);
  - contact (`contact/page.tsx:24-25`).

  It can only produce a 404, never the brief's "unavailable" page.
- **Breaks:** blocker for suspension and holds; DRY.
- **What's already right:**
  - Every public read goes through `overrideAccess: false`: `getGameProject.ts:17-24`, `patchNotes.ts`, `issues.ts`, and the vote route's anonymous `findByID` (`api/vote/route.ts:72-79`). So changing the collections' anonymous `read` access covers every portal page, the RSS feed, votes, both submit routes and the REST API at once.
  - Payload applies `read`'s `Where` to files at `/api/media/file/<name>` (`uploads/checkFileAccess.js`). F11 covers the paths around it.
  - `not_equals: true` also matches `NULL` (`drizzle/queries/parseParams.js:225-227`), so an unset flag counts as "not held".
- **Fix:** §7 and §8.

**F11 · Uploaded files have public paths that skip access control (added in revision).**
- **Where:** `Media.ts:43-44` stores uploads in `public/media`, and every `Media` render goes through Next's image optimizer (`ImageMedia` → `next/image`, `next.config.ts:29-46`).
- **Why it fails:**
  - Next serves `public/` itself, with no Payload check: in production every file present at start-up (`next/dist/server/lib/router-utils/filesystem.js:161-183`), in development every file. After any restart, `/media/<filename>` serves a suspended studio's banner whatever §7 says.
  - The optimizer fetches `/api/media/file/…` anonymously (`next/dist/server/image-optimizer.js:1013-1022`) and caches the result on disk for at least 4 hours (`minimumCacheTTL`, `shared/lib/image-config.js:57`). When the upstream later refuses (403 after a suspension), Next stores the old entry again with a short TTL (`server/response-cache/index.js:290-301`), so the copy is served indefinitely. An uploader can warm it on purpose by requesting `/_next/image?url=…` before a suspension.
  - Media responses carry no `Cache-Control`, so Cloudflare applies its default edge TTL to image extensions.
- **Effect:** suspensions and holds don't take images down, and an abuser can keep them reachable deliberately.
- **What's already right:** `/api/media/file/<name>` checks `read` on every request, for local files and for R2: `uploads/endpoints/getFile.js:19-27` runs `checkFileAccess` before the storage adapter's handler, and the project doesn't set `disablePayloadAccessControl`.
- **Fix:** §7b. Uploads leave `public/`, the optimizer is off, and `/api/media/file/` is the only way to a file.

**F4 · Self-service accounts: creation is closed, there's no email verification, and the auth fields are self-writable.**
- **Where:** users and tenants can only be created by a super admin (`Users/index.ts:10`, `Tenants/index.ts:13`), and only a super admin can assign memberships (`plugins/index.ts:50-56`). Users are `auth: true` without `verify` (`Users/index.ts:27`).
- **Payload facts the design depends on:**
  - With `auth.verify`, login refuses `_verified === false` (`auth/operations/login.js:184`). `resetPassword` still issues a token without checking it (`auth/operations/resetPassword.js:64-110`), but the JWT strategy authenticates nobody whose `_verified` is false (`auth/strategies/jwt.js:72`), so that token opens nothing. A signed-in user is therefore a verified one; onboarding asserts it (§6).
  - `_verified` uses `defaultAccess` (any signed-in user) for create, read and update (`auth/baseFields/verification.js`, `auth/defaultAccess.js`), and `email` has no field access at all (`auth/baseFields/email.js`). `Users.access.update` lets a user update their own document, so a verified user can change their address and stay verified, and could write their own `_verified`. `mergeBaseFields` (`fields/mergeBaseFields.js`) deep-merges a same-named field in `Users.fields` over Payload's base field, which is how §4 restricts both.
  - `create` sends a verification email for every new user, whoever creates it (`collections/operations/create.js:228-243`), and gives every new user a `_verificationToken`, verified or not (`:182-184`). Users a super admin creates (in the admin, and in `tests/e2e/auth.setup.ts:46-53`) would start unverified and be locked out. First-register already verifies (`auth/operations/registerFirstUser.js:43-49`).
  - Existing rows need `_verified = true` when `verify` is turned on.
- **Already right:** the plugin's access wrapper suits self-service users. A user without a studio gets `false` on every studio collection and reads only their own user (`plugin-multi-tenant/dist/utilities/withTenantAccess.js`). It also wraps `unlock`, so a user can only unlock themselves or teammates.
- **Fix:** keep user and tenant creation over REST/GraphQL super-admin-only, open it only through the guarded routes (§5, §6), and make `_verified` and `email` super-admin fields (§4).

**F12 · Payload's forgot-password endpoint will mail any address, with no Turnstile or rate limit (added in revision).**
- **Where:** Payload's built-in `POST /api/users/forgot-password` and GraphQL `forgotPasswordUsers`, open to anonymous callers (`auth/operations/forgotPassword.js`). Its admin view (`/admin/forgot`) posts straight to it.
- **Effect:** harmless today only because there's no email transport (F5). Once §3 adds Resend, anyone can make the instance send mail to any inbox, unthrottled, from the owner's sending domain.
- **Breaks:** `AGENTS.md` rule 8 (rate limit and Turnstile on every public form endpoint).
- **Fix:** §4a.

**F5 · There's no email transport, and the only email path calls Resend by hand.**
- **No transport:** `src/payload.config.ts` configures no `email`, so Payload's console adapter would log only the subject of verification and reset emails. Nobody could ever verify.
- **Hand-rolled Resend:** the contact job posts to Resend's API directly (`src/jobs/contact.ts:86-123`). Adding a Payload adapter for auth emails beside it would make two Resend clients (DRY).
- **Link origin:** Payload builds its default auth links from the request's host, and falls back to a relative link unless that host is exactly a CORS origin (`utilities/getRequestOrigin.js`). The app sets no `serverURL`, so behind Nginx the default links can come out broken.
- **Fix:** one email module (§3); templates that build links from `getServerSideURL()`; the contact job sends through `payload.sendEmail`.

**F6 · The content filter only screens player submissions.**
- **Where:** `screenReportText` (`IssueReports/hooks/screenReportText.ts:6-23`).
- **What's right:** the pattern. It screens on create or when the text changes, stores `flagged` and `flagReasons`, and an approval sticks because unchanged text isn't re-screened.
- **What's wrong:** it's wired to reports only. Game names, pitches and updates are never screened.
- **Fix:** generalise it into one hook factory and reuse it (§9). `screenText` itself doesn't change.

**F7 · There are no hosted limits, and one path would turn a limit into a player's error.**
- **The natural checkpoints:** collection `beforeChange` hooks, which every write path runs (admin, REST, Local API, onboarding).
- **The trap:** `autoPublishReport` publishes a player's submission inside the public submit request (`IssueReports/hooks/autoPublishReport.ts:16-30`), and `createIssueFromPublishedReport` creates the public item in the same write (`:81-96`). A limit on public items would fail the player's POST with "Something went wrong".
- **Fix:** auto-publish asks the limit first, and the limit hooks check only studio users' writes (§11).

**F8 · The demo seed writes into the newest studio, and the demo slug can be claimed.**
- **Where:** `src/seed/critterConnect.ts:68-69` takes `tenants.docs[0]` under Payload's default sort, `-createdAt` (`drizzle/queries/buildOrderBy.js:8-11`). It then upserts the `critter-connect` game with that tenant (`:117-119`, `:150-190`).
- **Effect on an open-signup instance:** `pnpm seed:critter-connect` would put the demo into the latest stranger's studio. If a stranger took the slug first, it would move their game there instead.
- **The slug:** the home page links to that slug as the live demo (`components/marketing/links.ts:7`), and any signup could claim it.
- **Breaks:** tenant isolation, once signup is open.
- **Fix:** §7, "Demo".

**F9 · Admin copy and the project rules still describe super-admin setup.**
- **Where:**
  - The dashboard tells every user to "Create a tenant for the studio" (`BeforeDashboard/index.tsx:17-19`), which self-service users can't do.
  - The plugin comment promises invites "with onboarding (Phase 7)" (`plugins/index.ts:50-51`).
  - `AGENTS.md:97` and `docs/features.md:248-255` say not to build open signup before real users have used Phases 1-7, and put invites in Phase 8.
- **Why it's wrong now:** the owner chose open signup from day one (brief, "Why"), and invites are out of scope.
- **Fix:** §13.

**F10 · Fine as is; reuse these.**
- **Keep and reuse:**
  - `guardPublicForm` and `formResponse` (Zod, Turnstile, IP rate limit, plain-form 303s);
  - `checkRateLimit`, `TurnstileField`, `FormNotice`;
  - `screenText`;
  - the React Email render helper;
  - `revalidateGamePortal`;
  - the boot check `checkEnvironment` (`instrumentation-node.ts`);
  - `STORE_LINK_KEYS` and `resolvePrimaryStoreUrl` (`lib/game-portal/links.ts:44-67`);
  - the E2E REST fixtures.
- **Extract rather than copy:** the report promotion's slugify and `-2`, `-3` loop (`createIssueFromPublishedReport.ts:9-56`) is what onboarding needs for game and studio slugs. Its slugify emits only `[a-z0-9-]`, which the tenant slug validator (`Tenants/index.ts:44-49`) requires. Payload's own `slugify` keeps `_` and would fail it.

### Target design

#### 1. Flow

```
/signup (email, Turnstile) --POST /signup/submit--> pending user (unverified, unusable random password) + verification email
   -> /signup?submitted=1  "Check your inbox"
email link -> /verify/<token>   GET: "Choose a password" form, no side effect
   --POST /verify/submit (token, password, Turnstile)--> one transaction: set password + verify email
   -> Payload login (session cookie) -> 303 /onboarding
/onboarding (game name, website, store?) --POST /onboarding/submit--> one transaction:
   tenant (createdBy = user) + membership (owner) + game (created as the user, tenant set explicitly)
   -> 303 /g/<slug>?welcome=1 (live hub + next-steps panel), or /onboarding?held=1
```

- **Why the user comes first:** the verification token lives on the user, so the user has to exist before verification.
- **Why the password is chosen on the verify page:** only the inbox owner has the link, so only the inbox owner ever sets a credential. Submitting an address on `/signup` sets nothing: pre-registering someone else's address makes an account nobody can use until its owner opens the link, and a mail scanner that opens the link changes nothing.
- **Why the studio and game come after:** unverified accounts own nothing. There's nothing to hide, no slug squatting, and no clean-up job. This also follows the Goal's order: sign up, verify, then enter the three things.
- **No separate sign-in step:** the verify route calls Payload's own `login` (`@payloadcms/next/auth`), which opens the session and sets the cookie. That's Payload's operation, not a session we mint.

#### 2. Data model: one migration, `open_signup`

- **users:**
  - `auth.verify` adds `_verified` and `_verificationToken`.
  - The migration backfills `_verified = true` for existing users.
  - `_verified` and `email` become super-admin fields for writes (§4). That's access config, not schema.
- **tenants:**
  - `suspended`: checkbox, default false, indexed. Create and update are super-admin-only; members can read it, so their admin can tell them.
  - `createdBy`: relationship to users, `unique`, create/read/update super-admin-only. Onboarding sets it; it stays `NULL` for studios a super admin makes. The unique index makes onboarding idempotent: a double submit fails its second insert instead of leaving an orphan studio.
- **game-projects and patch-notes (patch-notes' versions table too):**
  - `flagged` (checkbox, default false, indexed) and `flagReasons` (textarea), defined once by `moderationFields()` in `src/fields/moderation.ts`, so their access and admin settings can't drift.
  - Create and update are super-admin-only field access. Studio users see both read-only, and a super admin can untick `flagged` to approve (§9). No `admin.readOnly`, which would lock super admins out too.
  - Field access is applied in `beforeValidate` (`fields/hooks/beforeValidate/promise.js:215-226`), before collection hooks, so the screening hook can set them in `beforeChange` while studios can't clear them.
  - IssueReports keeps its own `flagged` fields: there the studio decides by publishing, so they stay read-only for everyone.
- **abuse-reports (new; platform-level, not in the multi-tenant plugin):**
  - Fields:
    - `pageUrl`: text, required.
    - `gameProject`: relationship, optional. Like every relationship here its foreign key is `ON DELETE SET NULL`, so deleting a game clears it and `pageUrl` stays the record.
    - `reason`: select (spam, scam or phishing, offensive, impersonation or copyright, other).
    - `details`: textarea.
    - `reporterEmail`: email, optional.
    - `status`: select (open, resolved, dismissed), default open.
    - timestamps.
  - Access: super admin only for everything, and `admin.hidden` for everyone else, as for `IssueVotes` and `jobs`. Only the report route creates them, through the Local API.
- **media:** no schema change; `mimeTypes`, `staticDir`, the WebP sizes and the response headers are config (§7b).
- **After the schema changes:** regenerate types and the import map, and generate the migration with `migrate:create`, plus the `_verified` backfill.

#### 3. Email

`src/lib/email/adapter.ts` exports `emailAdapter()` (for `payload.config.ts`'s `email`) and `isEmailDeliverable()`.

- **With `RESEND_API_KEY`:** the official `@payloadcms/email-resend` adapter, pinned to 3.85.2, sending from `RESEND_FROM_EMAIL`.
- **Without it, an outbox adapter that never sends:**
  - It logs `to` and `subject`. Outside production it also logs the HTML, so a developer can click the link; tokens never reach production logs.
  - When `EMAIL_OUTBOX_DIR` is set, it also writes each message there as a JSON file, creating the directory if needed. The E2E harness sets it and reads it. Nothing else is test-specific.
- **`isEmailDeliverable()`** is true when Resend is configured, when not in production, or when `EMAIL_OUTBOX_DIR` is set.
  - Signup and password recovery refuse when it's false (production without Resend), the way forms refuse without Turnstile.
  - Super admins can still create users without Resend, because the outbox adapter never throws.
- **One template, `AuthLinkEmail`** (heading, one sentence, a button and the plain link), rendered by `renderAuthLinkEmail`. `src/lib/email/authEmails.ts` holds the three messages, each a function returning `{ subject, html }`:
  - `verificationEmail(token)`: "Confirm your email and choose a password", linking to `${getServerSideURL()}/verify/<token>`. `Users.auth.verify.generateEmailHTML` and `generateEmailSubject` use it, and so does the signup route's resend (§5).
  - `accountCreatedEmail()`: "An account was created for you", linking to `/admin/login`, with no token. `generateEmailHTML` picks it when the new user is already verified (a super admin created them, §4), so such users never receive a live verification link.
  - `passwordResetEmail(token)`: linking to `${getServerSideURL()}/admin/reset/<token>` (Payload's reset view), for `auth.forgotPassword`.

  Links never come from the request's host (F5).
- **The contact job** sends through `req.payload.sendEmail`. It keeps its explicit "`RESEND_API_KEY` unset → throw" rule, so a contact email never lands in a log counted as delivered, and failed jobs are still retried.

#### 4. Accounts and sign-in: Payload's built-ins, styled

- **`Users.auth`:** the email messages above; Payload's defaults otherwise, including lockout after 5 failed logins.
- **Fields a user can't write**, declared in `Users.fields` and merged over Payload's base fields (F4):
  - `_verified`: `create` and `update` super-admin-only. Payload's own writes aren't affected: `verifyEmail` and `resetPassword` write through `payload.db`, and first-user registration updates through the Local API's default `overrideAccess`.
  - `email`: `update` super-admin-only. An address can't be swapped after it's verified, so "verified" always means this address was confirmed. A super admin changes addresses and vouches for the new one.
  - Field access applies to REST, GraphQL, the admin and Local API calls with `overrideAccess: false`. A denied field is dropped from the write (`fields/hooks/beforeValidate/promise.js:215-226`), and the admin shows both read-only to studio users.
  - One helper, `superAdminFieldAccess` beside `superAdminOnly` in `src/access/isSuperAdmin.ts`, serves these, `tenants.suspended` and `createdBy`, and `moderationFields()`.
- **A Users `beforeChange` hook on create:** a user a super admin creates gets `_verified: true`.
  - The super admin vouches for them.
  - `auth.setup.ts` keeps working unchanged.
  - Their creation email is `accountCreatedEmail()`, with no verification link (§3).
- **Sign-in and reset:** Payload's admin views `/admin/login` and `/admin/reset/<token>`, which the brief allows. Forgot password is §4a. Styled to match through:
  - `admin.components.graphics.Logo` and `Icon`: the Critwire wordmark;
  - `admin.meta`: title suffix and favicon;
  - `custom.scss`: the auth views;
  - `BeforeLogin`: "New to Critwire? Create your portal", when signup is open.

  The login view's `?redirect=` sends a user whose session expired back to onboarding; Payload's `getSafeRedirect` accepts `/onboarding`.
- **`/verify/[token]`** (in `(frontend)`, dynamic, `noindex`, 404 unless signup is open):
  - **GET renders only.** When `findPendingUserByToken(token)` finds a user, it shows "Choose a password" (password, Turnstile). Otherwise: "This link has been used or is invalid. If you've already set your password, sign in."
  - **`POST /verify/submit`:**
    1. `guardPublicForm` validates `{ token, password (8-128) }`, checks Turnstile, and rate-limits by IP: key and scope `verify`, 10 per 10 minutes.
    2. `findPendingUserByToken(token)` (`src/lib/accounts/pendingUser.ts`, a query: a privileged `find` on `_verificationToken` and `_verified: false`, with `showHiddenFields`). No match: back to the page with the "used or invalid" message.
    3. `activateAccount({ userID, token, password })` (`src/lib/accounts/activateAccount.ts`, the command), in one transaction: `payload.update` sets the password (`overrideAccess`), then `payload.verifyEmail({ token })` marks the user verified and clears the token. If the token was used in between, `verifyEmail` throws and the password change rolls back.
    4. `login({ collection: 'users', config, email, password })` from `@payloadcms/next/auth` sets the session cookie; Next copies it onto the route's redirect (`next/dist/server/route-modules/app-route/module.js:506-511`). 303 to `/onboarding`.
  - Only unverified users match, so the token of a verified user (a used link, or one a super admin created) can never set a password.
  - Payload's own `POST /api/users/verify/<token>` and `/admin/users/verify/<token>` stay. They need the same token and set no password, so an inbox owner who uses them gets a verified account and chooses a password through "Forgot password?".
- **`withTransaction(fn)`** (`src/lib/payload/withTransaction.ts`) wraps `createLocalReq`, `initTransaction`, `commitTransaction` and `killTransaction` (all exported by `payload`) once, for `activateAccount` and `createStudio` (§6).

#### 4a. Password recovery behind Turnstile and rate limits

- **The form:** `admin.components.views.forgot` replaces Payload's view at `/admin/forgot` with `ForgotPasswordView` (`src/components/admin/ForgotPasswordView.tsx`).
  - Payload resolves a view by key before its own, and renders it in the login page's minimal template (`@payloadcms/next/dist/views/Root/getRouteData.js:106-128`). The login page's "Forgot password?" link and the styling stay as they are.
  - It's a plain form (email and `TurnstileField`) that posts to `POST /forgot-password/submit`, and shows "Check your inbox" on `?submitted=1`.
  - When `!isEmailDeliverable()` it shows "Ask the person who runs this site to reset your password" instead of the form.
- **`POST /forgot-password/submit`:**
  1. `guardPublicForm`: `{ email }`, Turnstile, key and scope `password-reset`, 5 per hour per IP.
  2. The per-address budget shared with signup (§5).
  3. `payload.forgotPassword({ collection: 'users', data: { email } })` through the Local API. Payload stays silent for unknown addresses.
  4. Every case 303s to `/admin/forgot?submitted=1`, so the form doesn't reveal which addresses have accounts. It refuses (500, Sentry) when email isn't deliverable, like signup.
- **The raw endpoints:** a Users `beforeOperation` hook, `restrictPasswordRecovery`, throws `Forbidden` when `operation === 'forgotPassword'` and `req.payloadAPI !== 'local'`.
  - REST requests carry `'REST'` and GraphQL `'GraphQL'` (`utilities/createPayloadRequest.js:64`); Local API calls carry `'local'` (`utilities/createLocalReq.js:87`).
  - That closes `POST /api/users/forgot-password` and GraphQL's `forgotPasswordUsers` in one place, so the guarded route is the only way to send a reset email.
- **Reset and login stay as Payload ships them:** reset sends nothing and needs a single-use 160-bit token that expires in an hour; login has the per-account lockout. See Rejected alternatives.

#### 5. Signup: `/signup` and `POST /signup/submit`

- **Availability:** both 404 unless `CRITWIRE_OPEN_SIGNUP=1` (§10).
- **Shape:** a plain form (email and Turnstile) and a route handler, the project's public-form shape. The page says the link lets them choose a password.
  - `guardPublicForm` validates `{ email }`, checks Turnstile, and rate-limits by IP: key and scope `signup`, 5 per hour. `key` names the Upstash budget; `scope` is required and joins the IP in the identifier (`guard.ts:14-17`).
  - Then the per-address budget, `checkAccountEmailBudget(email)` (`src/lib/accounts/emailBudget.ts`): `checkRateLimit({ key: 'account-email', identifier: <sha256 of the lower-cased email>, limit: 3, windowSeconds: 3600 })`. Signup and password recovery share it, so nobody can flood an inbox from many IPs through either form. Over budget: nothing is sent, and the outcome page is the same.
- **Refusal:** when `!isEmailDeliverable()`, the route answers 500 with a generic message and reports to Sentry.
- **By case:**
  - **New address:** `payload.create({ collection: 'users', data: { email, password: <32 random bytes, base64url> }, overrideAccess: true })`.
    - Payload requires a password (`auth/strategies/local/generatePasswordSaltHash.js`). This one is never shown, sent or stored in clear, so the account is unusable until its owner chooses a password on the verify page.
    - Only those two fields go in, so `roles` stays `['user']` and `tenants` stays empty.
    - Payload sends the verification email inside the create's transaction and awaits it (`create.js:228-243`), so a failed send rolls the user back and a retry starts clean.
    - A concurrent signup for the same address fails on the unique email (a `ValidationError` on `email`) and is handled as the next case.
  - **Existing, unverified:** resend the stored link. Read `_verificationToken` (`overrideAccess`, `showHiddenFields`) and send `verificationEmail(token)` with `payload.sendEmail`. Nothing is written: the password isn't touched and the token isn't rotated. A retry can't take the account over or invalidate the owner's link, and a failed send leaves nothing to recover; the user submits again.
  - **Existing, verified:** send nothing.
- **One outcome page:** every case redirects to `/signup?submitted=1` ("Check your inbox"), so the form doesn't reveal which addresses have accounts. The page links to sign-in and to "Forgot password?".
- **REST:** `POST /api/users` and `POST /api/tenants` stay super-admin-only.

#### 6. Onboarding: `/onboarding` and `POST /onboarding/submit`

- **Availability:** both 404 unless signup is open.
- **Authentication:** `payload.auth({ headers })`, which accepts the session cookie and the E2E's `JWT` header.
  - No user: redirect to `/admin/login?redirect=/onboarding`.
  - Payload never authenticates an unverified user (F4). The route asserts `user._verified === true` and throws (500, Sentry) if that ever breaks, rather than keeping a user-facing branch nobody can reach.
  - The user already has a studio: redirect to `/admin`.
- **Input (Zod over `readRequestBody`):**
  - `name`: 1-80 characters.
  - `website`: an http(s) URL, required.
  - `store`: optional. It maps to a link field by host through one new pure function beside `STORE_LINK_KEYS`, `storeLinkKey(url)`, which knows Steam, itch.io, Epic, GOG, PlayStation, Xbox and Nintendo. An unknown host is a form error listing those stores; others can be added in the admin later. `resolvePrimaryStoreUrl` then makes the store "Get the game" with no change.
- **`createStudio({ user, input })`** (`src/lib/onboarding/createStudio.ts`, the one command) runs in one transaction through `withTransaction` (§4):
  1. **Create the tenant** with `overrideAccess`: name = the game name, slug = `uniqueSlug(name)` checked against tenants, `createdBy = user.id`.
  2. **Add the membership:** set `user.tenants = [{ tenant, roles: ['owner'] }]` with `overrideAccess`. The plugin's array field stays super-admin-only.
  3. **Create the game as the user:** set `req.user` to the updated user and create the game with `overrideAccess: false`.
     - Every studio rule then applies exactly as in the admin: the plugin's access, the tenant-write hook, the reserved slug, the games limit and screening.
     - The data: `tenant` = the new tenant's ID, set explicitly (the plugin's default comes only from the `payload-tenant` cookie and is `null` here, `plugin-multi-tenant/dist/fields/tenantField/index.js`); name; `slug = uniqueSlug(name)` checked against game projects, with reserved slugs counted as taken; `links.website`; the store link; `reportForm.acceptIdeas: false`.
     - Passing a slug explicitly also stops Payload regenerating it later (`fields/baseFields/slug/generateSlug.js`).
  - **Unique violations** come back as a `ValidationError` naming the field (`@payloadcms/drizzle/dist/upsertRow/handleUpsertError.js`):
    - on `createdBy` (a double submit): redirect to `/admin`;
    - on a `slug` (another signup took it between the check and the insert): run the whole transaction again, at most 3 attempts in all; `uniqueSlug` then picks the next suffix.
- **`uniqueSlug({ base, fallback, isTaken })`** (`src/utilities/uniqueSlug.ts`) is the report promotion's slugify and loop, extracted; `createIssueFromPublishedReport` uses it too.
- **Where the user lands:**
  - On success: a 303 to `/g/<slug>?welcome=1`.
  - If screening held the name: a 303 to `/onboarding?held=1`, which says "Your portal is set up and waiting for a quick review" and links to the admin.
- **The next-steps panel** is `WelcomePanel`, a client component in the hub inside `<Suspense>` that reads `?welcome=1` with `useSearchParams`.
  - The hub stays ISR-cached, because search params aren't part of its cache key; only the browser shows the panel.
  - It lists "Share this link" (the absolute URL, with Copy), "Add your first update" (`/admin/collections/patch-notes/create`) and "Turn on ideas" (`/admin/collections/game-projects/<id>`).
  - The steps come from one list, `src/lib/onboarding/nextSteps.ts`, which the admin dashboard shares.
  - Anyone can add `?welcome=1`; the panel contains nothing private.

#### 7. Access control and isolation

- **The tenant-write hook:** `enforceTenantWrite` in `src/access/tenantWrite.ts`, registered as `tenantField: { hooks: { beforeChange: [enforceTenantWrite] } }`. It replaces `validateTenantMembership`.
  - The tenant it checks is `value ?? previousValue`.
  - No user, or a super admin: it passes, as today. That covers system writes: votes, public submissions, seeds, and onboarding's steps 1 and 2.
  - Otherwise:
    - the user must be a member of the tenant, or a `ValidationError` on `tenant` (400, today's message, so S1.2 still passes);
    - the tenant must not be suspended, or an `APIError` 403: "This studio is suspended, so changes can't be saved."
  - It runs on drafts, which closes F1, and on every studio-scoped collection and on media folders.
- **Anonymous public reads:** `src/access/publicRead.ts`, one `Where` builder per collection shape, applied when `!req.user`. Signed-in users keep today's rules plus the plugin's tenant constraint.

  | Collection | An anonymous visitor sees a document when |
  |---|---|
  | game projects | `flagged` not true, and `tenant.suspended` not true |
  | updates | `_status` is published, `flagged` not true, `tenant.suspended` not true, and `gameProject.flagged` not true |
  | feedback items | `isPublic`, `tenant.suspended` not true, and `gameProject.flagged` not true |
  | media | `tenant.suspended` not true, checked on every file request (§7b) |

  These are relationship paths in a Payload `Where`, so there are no copied flags to keep in sync.
- **Unchanged:**
  - Users read only themselves. They can update their name and password, but not their `email` or `_verified` (§4). Studio users read only their own tenants.
  - Roles, memberships, `suspended`, `createdBy` and `flagged` are super-admin fields.
  - Submissions and votes are never public.
- **Demo (F8):**
  - `isReservedGameSlug` reserves the home page's demo slug (from `links.ts`). A game-project write by a non-super-admin user can't use it, following the issues' `issueSlugify` and `rejectReservedSlug` pattern, and onboarding's `uniqueSlug` counts it as taken. Seeds (no user) and super admins may use it.
  - `seedCritterConnect` finds or creates the tenant with slug `critwire-demo`, and throws if `critter-connect` already belongs to another tenant.

#### 7b. Media files: one serving path, checked on every request

- **Storage outside `public/`:** `staticDir` becomes `path.resolve(process.cwd(), 'media')`: the project root under `pnpm dev` and `next start`, and `/app` in the image. `.gitignore` and `.dockerignore` swap `public/media` for `media`.
- **Existing files:** `mv public/media/* media/` on dev machines and local-disk self-hosts. Rows store only filenames, so nothing else changes.
  - `checkEnvironment` stops the server at boot while `public/media` still holds files, and says to move them. A forgotten move fails loud instead of leaving files public.
  - `docs/self-hosting.md` gets an "Upgrading" note.
- **Docker:** the image creates `/app/media` owned by `nextjs`, and `docker-compose.yml` mounts a named volume `media` there, so local-disk uploads are writable and survive a rebuild. Today the app container has no volume for them.
- **No image optimizer:** `images: { unoptimized: true }` in `next.config.ts`. `localPatterns`, `qualities` and `remotePatterns` go, since they only configured the optimizer. `/_next/image` then answers 404 (`next/dist/server/next-server.js:198-200`), and no copy is cached outside Payload's check.
  - `ImageMedia` renders Payload's generated sizes instead: a `<source srcSet>` inside its existing `<picture>`, built from `resource.sizes` (300 to 1920 px wide) with the component's `sizes`. `next/image` (unoptimized) still renders the fallback `<img>`, the fill layout and the blur placeholder.
  - The display sizes (`thumbnail` to `xlarge`) are generated as WebP (`formatOptions: { format: 'webp' }`), which takes over the optimizer's format conversion. `og` keeps the upload's format for link previews.
  - `VideoMedia` and its branch in `Media` go. F2's `mimeTypes` make videos impossible, and it links `/media/<filename>`.
- **Cache headers:** `upload.modifyResponseHeaders` sets `Cache-Control: private, max-age=300` on every media file response. It applies to local files and to R2 (`storage-s3/dist/getFile.js:102-103` calls it too). Browsers keep a file for 5 minutes and Cloudflare doesn't cache it, so a suspension or hold reaches every visitor within 5 minutes, and nobody can keep a shared copy warm.
- **R2:** the bucket stays private. Critwire never sets `disablePayloadAccessControl` or `generateFileURL`, and the docs say not to turn on an `r2.dev` URL or a custom domain for the bucket. Every file then goes through `/api/media/file/`, which checks access before the adapter streams it.

#### 8. Portal availability

- **`getGameProject(slug)` doesn't change:** it's an anonymous read, so held and suspended portals come back `null`.
- **Added beside it:**
  - `portalExists(slug)`: a privileged `count` that returns only a boolean, the same pattern as `getContactRoute`.
  - `requirePortalProject(slug)`: returns the project. Otherwise, if `portalExists`, it calls `redirect('/unavailable')`; if not, `notFound()`.
- **Where it's used:** the layout and every portal page call `requirePortalProject` instead of `getGameProject` + `notFound()` (F3, DRY). Route handlers that return a `Response` (RSS and both submit routes) keep `getGameProject` and answer 404.
- **Why every segment:** the redirect is decided wherever a segment renders, so it also holds on client-side navigation. A layout-only gate wouldn't, because Next re-renders pages without re-running a shared layout.
- **`/unavailable`** (in `(public)`, static, default theme, `noindex`): "This portal is unavailable." No name and no reason; held and suspended portals share it, so it doesn't say which.
- **Revalidation:**
  - A Tenants `afterChange` hook calls `revalidateGamePortal` once when `suspended` changes. One call covers every game of the studio: it revalidates the `/g/[gameSlug]` layout, which is every portal page of every game (`src/hooks/revalidateGamePortal.ts:13-16`).
  - `flagged` changes are already covered: any game-project write revalidates the portal, and a published update's write revalidates the updates and the hub.

#### 9. Screening studio text, and holding it for review

- **`screenTextHook(textOf)`** (`src/hooks/screenText.ts`) returns the `beforeChange` hook described in F6. It screens on create, or when any screened field changed, and sets `flagged` and `flagReasons`.

  | Collection | Screened text |
  |---|---|
  | IssueReports | title and description (replaces `screenReportText`; behaviour unchanged) |
  | GameProjects | name and pitch |
  | PatchNotes | title, version label, summary, and the content's plain text (`convertLexicalToPlaintext` from `@payloadcms/richtext-lexical/plaintext`) |

- **Approval:** a super admin unticks `flagged`. The text didn't change, so it isn't screened again. There's no super-admin bypass, the same rule as for reports.
- **What "held" means:** not public (§7).
  - A held game shows `/unavailable`.
  - A held update is missing from the feed, its own page, RSS and the hub.
  - The studio sees "Held for review" and the reasons in the admin sidebar and on its dashboard.
- **Scope:** only the brief's list is screened. Feedback items a studio writes, and link targets inside rich text, aren't (see Decisions).

#### 10. Hosted flag and suspension

- **`isOpenSignup()`** (`src/lib/hosting.ts`) reads `CRITWIRE_OPEN_SIGNUP`.
  - `1` turns on signup, verification, onboarding, the home page's call to action and the portal's "Report this page" link.
  - Unset or empty turns all of them off. That's the self-hosted default. Password recovery (§4a) doesn't depend on it.
  - Any other value stops the server at boot (`checkEnvironment`).
- **Suspension:**
  - The portal redirects to `/unavailable`. Its updates, items and votes also disappear from REST and the vote route, and its files answer 403 at `/api/media/file/` (§7b).
  - Members can still sign in and read, but every create or update in the studio fails with the 403 message (the hook in §7), drafts included.
  - Deletes stay allowed, since they can only remove content.
  - The dashboard shows a banner.
  - Unticking `suspended` restores everything, and revalidation brings the pages back.

#### 11. Limits

- **The module:** `src/lib/limits/index.ts`, the only one.
  - `getLimits()` parses these variables once and memoises them:
    - `CRITWIRE_LIMIT_GAMES_PER_STUDIO`
    - `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO`
    - `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME`
  - Unset or empty means off, and a positive integer means on. Anything else stops the server at boot. All three are off by default, so self-hosted instances are unlimited.
  - `LimitReachedError` is an `APIError` with status 403 and a public message. The admin's form shows `errors[0].message` as a toast, word for word (`@payloadcms/ui` `forms/Form`).
  - Each limit has exactly one count-and-compare.
- **Hosted values** (record them in `.env.example`, `docs/self-hosting.md` and the Summary):

  | Limit | Hosted value | Checked in | What it counts |
  |---|---|---|---|
  | Games per studio | 3 | GameProjects `beforeChange`, on create or a tenant change | the studio's game projects |
  | Media per studio | 100 MB (MiB) | Media `beforeChange`, whenever a file is written | the `filesize` of the studio's original uploads, minus the one being replaced; generated sizes don't count |
  | Public feedback items per game | 200 | Issues `beforeChange`, when an item becomes public (created with `isPublic`, `false → true`, or moved to another game while public) | the game's `isPublic` items, archived ones included |

  The media check is a collection hook, so it runs before the storage adapter's upload hook.
- **Whose writes are checked:** studio users'. Super admins and system writes (seeds, a player's submission that auto-publishes) aren't checked by the hooks.
- **The messages:**
  - "Your studio has reached its limit of 3 games on the hosted plan."
  - "This upload would take your studio past its 100 MB of media."
  - "This game has reached 200 public feedback items. Make older items private or delete them to add more."
- **Auto-publish (F7):** `autoPublishReport` asks `hasPublicFeedbackRoom`, which uses the same count, and leaves a submission `NEW` at the limit. The Issues hook doesn't check this system write, so the player's POST never fails, even when a concurrent publish takes the last slot between the question and the write. A studio that publishes a waiting submission in the admin gets the message.
- **Counting** uses the Local API with `req` (the same transaction), so no raw Drizzle is needed. Two concurrent writes can pass a limit by one; that's accepted for soft plan limits.
- **The admin only explains:** the dashboard lists the active limits.

#### 12. Abuse reports

- **The link:** `PortalFooter` shows "Report this page" (to `/report-abuse?page=/g/<slug>`) when signup is open. The flag is read at render time, and portal pages render at runtime.
- **The form:** `/report-abuse` (in `(frontend)`, `noindex`, 404 when signup is off) names the portal being reported and asks for a reason, details and an optional email, with Turnstile.
- **The submit route:** `POST /report-abuse/submit`
  1. runs `guardPublicForm`, with key and scope `abuse-report` and 5 per 10 minutes;
  2. requires `page` to be a `/g/<slug>…` path;
  3. resolves the game project with a privileged lookup, so reports about held or suspended portals still resolve;
  4. creates the `abuse-reports` document through the Local API with `overrideAccess`;
  5. redirects to `?submitted=1`.
- **The queue:** the super-admin-only list, linked from their dashboard with the open count.

#### 13. Admin, home page and docs

- **The dashboard (`BeforeDashboard`), by role:**
  - **Super admin:** links and counts for held game projects (`?where[flagged][equals]=true`), held updates, open abuse reports, and studios.
  - **Studio user:**
    - each game's portal link and status (Live, Held for review, or Unavailable: suspended);
    - the next steps;
    - the active limits.
  - **Signed in without a studio:** "Set up your portal" (`/onboarding`), when signup is open.
- **The home page:** `MarketingHome` gets `signupHref`: `/signup` when signup is open, otherwise `null`. It shows as "Create your portal" beside "Critwire on GitHub" in the self-host block, and is hidden when `null`, like Contact.
- **New `docs/self-hosting.md`:**
  - **Services:**

    | Service | Needed |
    |---|---|
    | Postgres | required |
    | Turnstile and Upstash | required in production for public forms, votes, signup, password recovery and abuse reports |
    | Resend | optional |
    | R2 | optional (local disk in `./media` otherwise); the bucket must stay private |
    | Sentry | optional |

  - **Without Resend:** contact-by-email jobs fail and wait for a retry, signup refuses, and "Forgot password?" asks the user to contact whoever runs the site, so a super admin sets passwords in the admin.
  - **The first super admin:** the first-user form at `/admin`, choosing Super Admin. Users a super admin creates are verified automatically.
  - **Defaults:** `CRITWIRE_OPEN_SIGNUP` and the limits are all off.
  - **Upgrading:** move `public/media` to `media` (§7b).
- **Updated docs:**
  - `AGENTS.md`: a docs-map row, and a Phase 8 sequencing rule that reflects the owner's decision.
  - `docs/features.md`: user verification, Hosting, and Phase 8 without invites.
  - `docs/architecture.md`: the new URLs (`/signup`, `/verify/<token>`, `/onboarding`, `/report-abuse`, `/unavailable`, the custom `/admin/forgot`) and their rendering, and media serving (§7b).
  - `docs/patterns.md`: the tenant-write hook, public reads, `requirePortalProject`, the screening hook, `moderationFields()`, limits, and "uploads are served only through `/api/media/file/`".
  - `docs/integrations.md`: the Resend adapter, the private R2 bucket and the new env vars.
  - `docs/deploy.md`: the first-run bootstrap and the `media` volume.
  - `.env.example` and `environment.d.ts`.

#### 14. E2E strategy

**Harness.**
- **Server env:** `serverEnv()` adds:
  - `CRITWIRE_OPEN_SIGNUP=1`;
  - `EMAIL_OUTBOX_DIR=<cwd>/test-results/outbox`. Playwright empties `test-results` before it starts the web servers, so each run starts with an empty outbox;
  - the three limit variables as `''`, so a developer's `.env` can't turn them on.
- **Limits without a rebuild:** `playwright.config.ts` gets a second `webServer`: `pnpm start` on `E2E_PORT + 2` (3102), with the same env plus low limits (2 games, 1 MB of media, 3 public feedback items).
  - Playwright starts web servers in order and waits for each one's URL (`playwright/lib/runner/taskRunner.js`), so the second starts only after the first has migrated and built.
  - It reuses that `.next` build and the same database, and never runs `migrate:fresh`.
  - The app reads limits at runtime, so no app code knows about the tests.
  - It inherits the build's `NEXT_PUBLIC_SERVER_URL` (3100). `serverURL` stays unset, so its admin calls its own API; its tests touch nothing that renders absolute links.
- **New fixtures:**
  - `readEmail(to)` polls the outbox for the newest message to an address. Every run uses random addresses.
  - `signUpStudio(playwright, name)` signs up, reads the link, posts the verify form with a password, signs in over REST for a JWT, and onboards over HTTP, with `TURNSTILE_DUMMY_TOKEN`. It returns `{ token, tenantID, project }`.
  - `limitsApi(role)` is a `RestClient` for port 3102.

**New tests, by Definition-of-done item.**

| Definition-of-done item | Test | Server |
|---|---|---|
| The whole signup flow | In the browser: `/signup` (email), "Check your inbox", the link from the outbox, "Choose a password", then straight to `/onboarding` signed in, onboarding, then `/g/<slug>?welcome=1` shows the game's name and the next steps. An anonymous context sees the hub. | 3100 |
| Sign-in and password reset for these users | Sign out, then back in at `/admin/login`. "Forgot password?" opens the custom `/admin/forgot`; the form, the email in the outbox, `/admin/reset/<token>`, then signed in with the new password. | 3100 |
| An unverified account's portal isn't public | A pending signup. Opening its link twice with GET, as a mail scanner would, leaves it unverified. Forgot and reset then take over its password: `POST /api/users/reset-password` returns a token, but with that token `GET /api/users/me` is `null`, `PATCH /api/users/<id> { "_verified": true }` is 403 and `/onboarding` redirects to sign-in. Login with the new password is refused ("verify"). A super admin still reads `_verified: false`. | 3100 |
| A second signed-up user can't read or write the first's studio | Two `signUpStudio`s. B's lists hold none of A's projects, updates (drafts included), items, submissions, media, folders, users or tenants. B's `PATCH` and `DELETE` on A's documents are refused. B's creates with `tenant: A` are refused, **including a draft update (F1)**. A's project edit URL in the admin shows B nothing. | 3100 |
| Each limit blocks, with a message | A fresh studio. The third game gets a 403 with the message, and saving it in the admin shows the toast. A 1.5 MB noise PNG (generated with `sharp`) gets a 403. The fourth public item gets a 403. A player's submission to a review-off game at the limit stays `NEW`, and the player sees the normal confirmation. | 3102 |
| Nothing is blocked when limits are unset | The same actions all succeed: 3 games, the 1.5 MB PNG, 4 public items. | 3100 |
| A suspended studio's portal and publishing | First fetch the hub, an update page, RSS, and the banner's `/api/media/file/` URLs (the original and one size), so every cache is warm. A super admin suspends the studio. The hub, update and item pages land on `/unavailable` with none of the game's text; RSS answers 404; both media URLs answer 403. Anonymous REST, the vote route and both submit routes find nothing. The owner's create and update, drafts included, get the 403 message. The dashboard shows the banner. Unsuspending brings the hub and the files back (revalidation). | 3100 |
| The report-this-page flow | Footer link, form, submitted. The super admin sees the report with its game. `GET /api/abuse-reports` is 403 for studio users and anonymous visitors. | 3100 |

**Other new tests:**
- A held game name (a word from the filter's dataset) shows `/unavailable` until a super admin unticks `flagged` in the admin.
- A held update is missing from the feed and RSS until it's approved.
- Media (F2, F11): an SVG upload is refused; `/_next/image?url=/api/media/file/<name>&w=640&q=75` answers 404; a media response carries `Cache-Control: private, max-age=300`.
- Password recovery (F12): `POST /api/users/forgot-password` and GraphQL's `forgotPasswordUsers` are refused, and the outbox gets nothing; `POST /forgot-password/submit` without a Turnstile token gets a 400.
- Retries and addresses: a second signup for a pending address sends the same link and leaves the user unchanged (`updatedAt`); after the link is used it answers "used or invalid". A signed-in user's `PATCH` of their own `email` or `_verified` changes neither; a super admin's `email` change sticks. The email to a user a super admin creates has no `/verify/` link.
- The home page's call to action links to `/signup`.
- `POST /signup/submit` without a Turnstile token gets a 400.

**Screenshots.** A new `signup` group in the screenshot harness captures `/signup`, `/signup?submitted=1`, `/verify/<token>`, `/onboarding` and `/g/<slug>?welcome=1`, plus the existing `/`, at 1440 and 390 px. They go into `/srv/critter-ai/agent-state/missions/open-signup/screenshots/` with an `index.html`. Opening a verification link doesn't consume it, so one pending user serves both widths.

### Rejected alternatives

- **Create the user, studio and game before verification and hide them until verified:** unverified strangers could squat slugs, it would need a clean-up job, and Payload won't give them a session anyway.
- **Open `POST /api/users` and `POST /api/tenants` to anonymous callers:** it bypasses Turnstile and the rate limits, and exposes field-level roles to anonymous writes.
- **Our own verification tokens, sessions or sign-in pages:** they reimplement Payload's auth, and the brief allows its admin views.
- **Minting a session ourselves after verification:** hand-rolled auth. The verify route calls Payload's `login`.
- **The password on `/signup`, with the latest submission winning for a pending account:** whoever submits last chooses the credential that the inbox owner then confirms, possibly through a mail scanner.
- **The password on `/signup`, re-entered on the verify form:** a pre-registered address would lock its real owner out until a reset, and every user types the password twice.
- **A verification link that verifies on GET:** mail scanners open links, so it would confirm without the owner.
- **Rotating the verification token on every retry:** anyone could keep invalidating the owner's link. Resending the stored token writes nothing.
- **Re-verifying a changed email instead of forbidding the change:** a pending-address flow for a need no studio has yet. A super admin changes addresses.
- **A Next redirect from `/admin/forgot` to a frontend page:** Payload's view override by key is the extension point for this.
- **Turnstile on Payload's login and reset:** reset sends nothing and needs a single-use 160-bit token that expires in an hour; login has Payload's per-account lockout. Neither view has room for a widget without replacing it.
- **Keeping Next's image optimizer and purging its cache on suspension:** Next has no per-entry purge, and it stores stale entries again when the upstream fails.
- **Public (CDN) caching of media:** a member's own authorised request would refresh the shared copy of a suspended studio's files.
- **`serverURL` in `payload.config.ts`:** it joins Payload's CSRF allowlist (`payload/dist/config/sanitize.js:340-341`), so cookie sessions on any other origin stop authenticating, including the E2E's second server. Links already come from `getServerSideURL()`.
- **Server Actions for signup and reports:** `guardPublicForm` works on `Request` route handlers, the project's public-form shape.
- **An "unavailable" gate in the layout only:** Next re-renders pages without the layout on client navigation, so data would leak. Rendering the page inside the layout while pages call `notFound()` conflicts.
- **A copied "public" flag on every document, kept in sync by hooks:** a sync hazard. A relationship `Where` in access is one place.
- **Suspension in access functions:** create access's `Where` isn't checked against the incoming data, and drafts skip validation. The tenant-field hook covers every case.
- **Test-only switches in app code to toggle limits (a header or an env flag):** test code in production. Two `next start` processes of one build instead.
- **A separate Playwright config for limits:** a second report and a second seed.
- **An HTTP email sink:** emails sent while no test's fixture is listening would be lost. The file outbox catches everything.
- **Per-studio limit overrides, or a plan field:** billing-adjacent and speculative.
- **Summing media with raw Drizzle:** the Local API is enough at these sizes.
- **Counting generated image sizes:** hard to explain to a studio, and bounded by the originals anyway.
- **Screening studio-written feedback items and rich-text link targets:** it changes the feedback pivot's "the studio decides" rule for items, and would hold link-heavy updates for the owner to review.
- **Signup open by default:** every self-hosted instance would host strangers' portals.

### Decisions (the conservative choices; record them under Decisions)

- **Confirm by choosing a password.** `/signup` takes an email; the password is chosen on the verify page, which then signs the user in. Only a verified, signed-in user creates a studio and game (§1).
- **`CRITWIRE_OPEN_SIGNUP` gates signup, verification, onboarding, the call to action and "Report this page", and is off by default.** The hosted instance sets it.
- **Hosted limits:** 3 games per studio, 100 MB of uploads per studio (originals, in MiB), and 200 public feedback items per game. They check studio users' writes.
- **Games created at signup start with ideas off.** That matches the brief's "turn on ideas" next step and gives new accounts a smaller public surface. `reviewSubmissions` stays on.
- **Suspended studios can still delete, but can't create or update anything.** Held and suspended portals share one neutral `/unavailable` page.
- **Screening covers the game name, the pitch and the visible text of updates (the brief's list), with the filter unchanged.** Link targets in rich text and studio-written feedback items aren't screened; "Report this page" and suspension cover them.
- **Users a super admin creates are verified automatically, and get no verification link.**
- **Only a super admin changes a user's email address.**
- **Password recovery goes only through the Turnstile-guarded form.** Payload's REST and GraphQL forgot-password are closed. Signup and recovery share a budget of 3 emails per address per hour.
- **Uploads live in `./media` and are served only through `/api/media/file/`,** with Next's image optimizer off and `Cache-Control: private, max-age=300`.
- **The owner's open-signup decision supersedes `AGENTS.md`'s Phase 8 sequencing rule, and the docs change to match.** Invites stay out of scope.

### Open questions for the owner

- **H8 (added to `/srv/critter-ai/handoff/critwire.md`), blocks nothing:** Terms of service and an acceptable-use policy for hosted signup. Hosting strangers' portals usually needs both, linked from `/signup`. It's a legal call only the owner can make, and the mission ships without them.
- **H3 stays `later`:** production signup needs `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (on a domain verified in Resend) as well as H3's Turnstile and Upstash keys, all before deploy. Not asked again now.
- The revision added no owner questions.

**Production environment variables (names only):**
- New: `CRITWIRE_OPEN_SIGNUP`, `CRITWIRE_LIMIT_GAMES_PER_STUDIO`, `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO`, `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME`.
- Needed for signup and password recovery: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- The existing ones stay as they are.
- `EMAIL_OUTBOX_DIR` is for tests and development only.

### Risks

- **The redirect from a cached portal page:** a `redirect()` in an ISR page has to be cached and revalidated like the page itself. The suspension test checks both suspending and unsuspending, with the pages warmed first.
- **The second E2E server:** it adds about 1 GB of memory on an 11 GiB machine. If the two processes' job crons collide on contact jobs, turn off `jobs.shouldAutoRun` for the second one.
- **The link-count rule:** it can hold updates with many links. The reasons say why, and a super admin approves them.
- **Media without a CDN:** `private` caching sends each visitor's image requests to the origin (once per 5 minutes per browser), streamed by Node from disk or R2. That's fine at early-access scale; if image traffic becomes a load problem, this is the setting to revisit.
- **WebP sizes only for new uploads:** existing uploads keep their sizes' current format until re-uploaded, so a page with large PNG key art is heavier than it was with Next's conversion until then.
- **The boot check stops servers that haven't moved their media:** any checkout whose `public/media` still holds files (this worktree, the owner's dev checkout, the demo service) won't start until the files are moved. The message says how, and a Step must move this worktree's files.
- **The verified-session invariant:** onboarding relies on Payload's JWT strategy refusing unverified users (`jwt.js:72`). The assertion makes a regression fail loud, and the unverified-account E2E catches it on a Payload upgrade.

## Architecture review (Fable)

Checked the findings and design against the code at `27d23a3` and Payload 3.85.2 in `node_modules`.

**Findings verified as real:** F1 (`tenantField` spreads `overrides`, so `hooks` pass through; `create.js:148` and `utilities/update.js:154` skip validation on drafts; `withTenantAccess.js` never looks at incoming data), F2 (`checkFileRestrictions.js` only runs the SVG check under `mimeTypes`), F3 (nine `notFound()` copies confirmed), F4 (`login.js:184` refuses `_verified === false`; `resetPassword.js` sets `_verified = Boolean(_verified)` and still opens a session), F5 (`payload.config.ts` sets no `email` and no `serverURL`; `contact.ts:95-118` calls Resend by hand), F6, F7 (`autoPublishReport.ts:16-30`), F8 (`critterConnect.ts:68-69`), F9. `mergeBaseFields.js` deep-merges a same-named field in `Users.fields` over Payload's base auth field, so the fixes below need no hook gymnastics.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Email verification can be bypassed by any signed-up user.** Payload's `_verified` base field uses `defaultAccess` for `update` (`auth/baseFields/verification.js` → `auth/defaultAccess.js`: `Boolean(user)`), and `Users.access.update` lets a user update their own document. Combined with the plan's own F4 fact (a password reset opens a session for an unverified user), the sequence is: sign up → `/admin/forgot` → `/admin/reset/<token>` (session) → `PATCH /api/users/<id> { "_verified": true }` → onboarding passes. Fix: declare `_verified` in `Users.fields` with `access: { create: superAdmin, read: superAdmin, update: superAdmin }` (first-user registration is unaffected: `registerFirstUser.js:40` creates with `overrideAccess: true`, and the plan's super-admin `beforeChange` hook runs after field access). Add this exact sequence to the "unverified account" E2E and assert `_verified` stays false.
2. **Email address can be changed without re-verification.** The same self-update path lets a verified user set `email` to any address; `_verified` stays true. That breaks "verifies their email" (Goal 2), and because §5 answers "existing, verified: send nothing", the address's real owner can never sign up and gets no explanation. Fix: `email` field `access.update: isSuperAdmin` (same `mergeBaseFields` override), or reject the change in the Users `beforeChange` hook §4 already adds. Say so in §4/§7 ("Unchanged" currently implies users may update themselves freely).

MISSED:
- **Media served from `public/media` bypasses every access rule.** `Media.ts:44` sets `staticDir` to `public/media`, so on any instance without R2 (dev, E2E, self-hosted local disk) Next serves `/media/<filename>` statically with no `checkFileAccess`. §7's "file serving applies this too" and the suspension E2E ("media … disappear from REST") are only true for `/api/media/file/<name>` and for R2-backed instances. Either move `staticDir` out of `public/` (one line; Payload's URL field already points at `/api/media/file/`) or state the limitation and assert the E2E against `/api/media/...` only.
- **Onboarding step 3 must pass `tenant` explicitly.** The plugin's tenant `defaultValue` reads the `payload-tenant` cookie and, absent that, returns `null` unless autosave is on (`tenantField/index.js`); a Local API create as the user would fail the field's required validation. §6's data list omits `tenant`.
- **Tenant `afterChange` revalidation must cover every game of the studio.** §8 says "calls `revalidateGamePortal`"; a tenant can hold up to 3 games, so it needs a `find` of the studio's game projects and one call each.
- **`guardPublicForm` requires `rateLimit.scope`** (`guard.ts:14-17`, keyed `${ip}:${scope}`); §5 and §12 should name the scope (e.g. `'signup'`, `'abuse-report'`) so the per-IP budget isn't accidentally shared with a game's contact form.

SHOULD-CONSIDER:
1. The "existing, unverified: latest password wins" rule has a small race (attacker resubmits the victim's address with their own password after the victim signs up but before they click; the victim's newest link then verifies the attacker's password). Cheapest closure and one fewer step for the user: make `/verify/<token>` a form that takes the password, calls `verifyEmail` then `payload.login`, sets the cookie and 303s to `/onboarding`. It uses only Payload's operations, so it isn't hand-rolled auth.
2. Set `serverURL: getServerSideURL()` in `payload.config.ts` as well as building links from it in the templates; `getRequestOrigin.js` then never consults the proxied host, and the CORS warning noise disappears.
3. `flagged` + `flagReasons` appear on three collections; define them once (`moderationFields()` beside `screenTextHook`) so their access, admin read-only settings and index can't drift (DRY).
4. `abuse-reports.gameProject` dangles when a game is deleted (Payload doesn't cascade); either make `pageUrl` the source of truth in the queue or clear it in `GameProjects.afterDelete`.
5. The second E2E server on 3102 inherits `NEXT_PUBLIC_SERVER_URL=http://localhost:3100`; keep its tests REST-only (as planned) and set `PORT` alone, so nothing there renders absolute links.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Verification is user-writable (§4, §7).** Payload permits authenticated users to update `_verified`, and password reset can authenticate an unverified user. Restrict verification-state writes to trusted operations; enforce this across all account-update interfaces.
2. **Email changes retain verification (§7).** Self-service email updates let verified accounts claim unverified addresses. Either prohibit these changes or require verification of the replacement address.
3. **Signup retries replace credentials without ownership proof (§5).** An attacker can overwrite a pending account’s password; the recipient then verifies the attacker’s credentials by opening the newest email, potentially automatically through a mail scanner. Require inbox ownership before setting replacement credentials.
4. **Local media bypasses suspension (§7–§10).** Files under `public/media` remain accessible outside Payload’s access controls. Move storage outside the public directory, migrate existing files, and ensure supported serving paths enforce suspension.
5. **Password recovery bypasses abuse controls (§4).** Default forgot-password endpoints send email without the proposed signup protections. Apply rate limiting and Turnstile to public recovery submissions, including direct API access, as required by AGENTS.md.

SHOULD-CONSIDER:

1. Explicitly assign the new tenant when onboarding creates its game; membership alone does not select it.
2. Test suspension against previously cached pages, RSS, and direct media URLs.
3. Handle concurrent slug collisions with bounded retries.
4. Ensure concurrent feedback publication cannot turn the limit precheck into a failed player submission.
5. Define recovery when token rotation succeeds but verification-email delivery fails.

## Revision notes

Revised 2026-09-30 by `architect`. Everything was re-checked against Payload 3.85.2 and Next 16.2.6 in `node_modules`.

**MUST-FIX items**
- **Fable 1 / Astra 1 · Users can write `_verified`.** Resolved. `_verified` is declared in `Users.fields` with super-admin-only create and update, merged over the base field by `mergeBaseFields`. That covers REST, GraphQL, the admin and Local API calls with `overrideAccess: false` (§4, F4). The unverified-account E2E now runs forgot → reset → `PATCH _verified` and asserts `_verified` stays false (§14).
  - **A correction to the premise:** the chain as written already fails today. Payload's JWT strategy authenticates no unverified user (`auth/strategies/jwt.js:72`), so the token from the reset can't make the PATCH. The field access is still added, so verification doesn't depend on that alone.
  - F4's "a session doesn't prove verification" is corrected to match. Onboarding's unreachable 403 branch becomes an invariant assertion that fails loud (§6).
- **Fable 2 / Astra 2 · Changing the email keeps verification.** Resolved. `email` update is super-admin-only (§4). §7's "Unchanged" now says users update only their name and password. The E2E asserts that a self-PATCH of `email` changes nothing (§14).
- **Astra 3 · A signup retry replaces a pending account's password.** Resolved by moving the password to the verify page (§1, §4, §5):
  - `/signup` takes only an email, and a new account gets an unusable random password.
  - A retry resends the stored link and writes nothing: no password change, no token rotation.
  - `GET /verify/<token>` has no side effect. Its POST sets the password, verifies and signs in through Payload's `login`, and it only matches unverified users.
  - Only the inbox owner ever sets a credential, and a mail scanner changes nothing. "Latest password wins" is gone.
- **Astra 4 (and Fable's first MISSED item) · Local media bypasses access control.** Resolved in the new F11 and §7b:
  - `staticDir` moves to `./media`.
  - A boot check refuses to start while `public/media` still holds files. Migration is `mv public/media/* media/`, documented under Upgrading.
  - Docker gets a writable `media` volume.
  - **A second bypass found in revision:** Next's image optimizer keeps serving cached copies after the upstream starts refusing (`response-cache/index.js:290-301`), and anyone can warm it. It's turned off; `ImageMedia` serves Payload's WebP sizes, and media responses are `private, max-age=300`, so no shared cache holds them.
  - R2 stays behind `/api/media/file/` with a private bucket.
  - The suspension E2E asserts 403 on warmed media URLs.
- **Astra 5 · Password recovery bypasses abuse controls.** Resolved in the new F12 and §4a:
  - `/admin/forgot` is replaced through Payload's view override by key. It posts to a `guardPublicForm` route (Turnstile, IP limit) that shares the per-address budget with signup.
  - A Users `beforeOperation` hook refuses `forgotPassword` unless `req.payloadAPI === 'local'`, which closes REST and GraphQL.
  - Reset and login stay as Payload ships them, with reasons under Rejected alternatives.

**Fable's MISSED items**
- **Explicit `tenant` on onboarding's game create:** adopted (§6, step 3).
- **Tenant `afterChange` revalidating every game:** one call already does it. `revalidateGamePortal` revalidates the whole `/g/[gameSlug]` layout (`src/hooks/revalidateGamePortal.ts:13-16`), so there's no per-game loop. §8 says so.
- **`guardPublicForm` scopes:** named. `signup`, `verify`, `password-reset` and `abuse-report` are each both key and scope, plus the shared per-address budget `account-email` (§4, §4a, §5, §12).

**Self-found fix:** §2 had `flagged` as `admin.readOnly`, which would have stopped super admins from unticking it to approve. It now relies on super-admin-only field access, so studios see it read-only.

**SHOULD-CONSIDER items adopted**
- **Fable 1** (the verify form takes the password and signs in): adopted in a stronger form. The form sets the password (Astra 3).
- **Fable 3** (`moderationFields()`): adopted for games and updates. IssueReports keeps its own fields, because the studio approves reports by publishing them.
- **Fable 5** (the server on 3102 inherits 3100's URL): adopted as a harness note. `serverURL` stays unset, so 3102's admin calls itself.
- **Astra 1:** same as Fable's second MISSED item.
- **Astra 2** (suspension against cached pages, RSS and media URLs): adopted. The suspension E2E warms them first.
- **Astra 3** (slug collisions): adopted. On a slug unique violation, the whole transaction is retried, at most 3 attempts (§6).
- **Astra 4** (a concurrent publish against the precheck): adopted. The limit hooks check studio users' writes only, so auto-publish can't fail a player's POST (§11).
- **Astra 5** (token rotation against failed delivery): resolved by not rotating. A resend writes nothing (§5).

**SHOULD-CONSIDER items declined**
- **Fable 2** (`serverURL`): Payload adds it to the CSRF allowlist (`config/sanitize.js:340-341`), which breaks cookie sessions on any other origin, including the E2E's second server. Links already come from `getServerSideURL()`.
- **Fable 4** (a dangling `abuse-reports.gameProject`): it doesn't dangle. Relationship foreign keys in this schema are `ON DELETE SET NULL`, and `pageUrl` stays (§2).

## Steps

18 steps, one per session, in dependency order. Each security hole the design found (F1, F2, F11, F12) is closed early, together with the scenario that proves it. Onboarding lands before signup, so the verify route's redirect target exists when signup ships. Docs, screenshots and the full verification come last.

### How every step runs

- **Shell helpers.** The shell forgets variables between tool calls, so repeat them in each call:
  ```bash
  cd /srv/critter-ai/worktrees/open-signup
  DB=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)      # the mission database, never reset
  MISSION=/srv/critter-ai/agent-state/missions/open-signup
  ```
- **Standard checks** end every step unless the step says otherwise. Run heavy jobs one at a time, with nothing else on ports 3100–3102:
  1. `pnpm exec tsc --noEmit` → 0 errors.
  2. `pnpm lint` → 0 errors. Warnings stay at 20 or fewer (the Baseline count), and none are in a file this mission touched.
  3. `set -o pipefail; pnpm test:e2e 2>&1 | tee /tmp/e2e-step<N>.log` → exit 0. This is the full suite: a fresh build on a freshly migrated E2E database, with 0 failed. This mission's hooks and access rules apply to every collection, so every code step runs the whole suite, not only its own spec.

  The step's Log line records the passed count, the wall time, and anything the step checked by hand.
- **Test first when a step closes an existing hole.** That means F1, F2, F11, F12, and the cross-studio file read in Step 4. Write those scenarios first and run `pnpm test:e2e <spec>` on the unchanged code. Record in the Log which tests fail and how (for example "expected 400, received 201"). Then fix. For new features, write the spec in the same step as the code; no run on the old code is needed.
- **The `dev` row gotcha:**
  - Never run `pnpm dev` in this worktree. It dev-pushes the schema into the mission database and records a `dev` row in `payload_migrations`.
  - Before any `pnpm payload migrate`, `pnpm payload migrate:create` or `pnpm build`, run `psql "$DB" -c "delete from payload_migrations where name='dev'"`.
- **Schema changes** happen in Step 2 only, in this order:
  1. Clear the `dev` row.
  2. `pnpm payload migrate:create open_signup`.
  3. Read the generated SQL and add the backfill.
  4. `pnpm payload migrate`.
  5. `pnpm generate:types`.

  Commit the migration (`.ts`, `.json` and `src/migrations/index.ts`) and `src/payload-types.ts`.
- **`pnpm generate:importmap`** after adding an admin component (Steps 13 and 15). Commit `src/app/(payload)/admin/importMap.js`.
- **`E2E_SKIP_BUILD=1 pnpm test:e2e <spec>`** is only for iterating on a spec right after a full run. It is never a step's verification: it reuses `.next` and the env the last build baked in.
- **Environment variables:** `.env.example` and `src/environment.d.ts` change in the step that introduces the variable. The prose docs change in Step 16.
- **Owner items:** nothing here waits on H3 (production keys) or H8 (terms). Without them the app works as the design says:
  - email goes to the outbox (outside production, or when `EMAIL_OUTBOX_DIR` is set);
  - Turnstile uses Cloudflare's test keys in E2E and is skipped in development;
  - rate limits are off (`RATE_LIMIT_OPTIONAL=1` in E2E).
- **Finishing a step:** check it off, add the Log line, and commit code and plan together with a message that says why. Then push `agent/open-signup`.

### Planner decisions

The session that carries out the affected step copies the matching line into **Decisions**.

- **P1 · Signed-in visitors can read public media files (Step 4).**
  - **Why it's needed:** once Next's image optimizer is off (Step 5), browsers fetch `/api/media/file/…` themselves, sending the visitor's session cookie. Payload accepts that cookie because no CSRF allowlist is configured (`payload/dist/auth/extractJWT.js`). The multi-tenant plugin then limits a signed-in studio user to their own studios' files, and gives a user with no studio `false` (`plugin-multi-tenant/dist/utilities/withTenantAccess.js`).
  - **Effect without the fix:** a signed-in owner opening the demo or another studio's portal would get 403s for every image. So would every newly verified user who hasn't onboarded yet.
  - **The fix:** the plugin's per-collection `accessResultOverride` for `media`, as `mediaFileReadOverride` in `src/access/publicRead.ts`.
    - It applies only when `accessKey === 'read'` and `isReadingStaticFile` is set, and only to signed-in non-super-admins. They get `{ or: [<the plugin's result>, <the anonymous media rule>] }`, or just the anonymous rule when the plugin's result is `false`.
    - Lists, the admin and REST documents keep the tenant constraint. Only file bytes are widened, and only to what an anonymous visitor may already fetch.
    - Suspension still hides files from everyone outside the studio. The studio's own members still see their files in the admin.
- **P2 · The second E2E server doubles as the self-hosted profile (Step 6).**
  - Port 3102 serves the same build with the low limits, plus `CRITWIRE_OPEN_SIGNUP=''` and `EMAIL_OUTBOX_DIR=''`.
  - So the suite also proves what a self-hosted instance gets by default:
    - `/signup`, `/verify/…`, `/onboarding` and `/report-abuse` answer 404;
    - `/` shows no "Create your portal";
    - portal footers show no "Report this page";
    - "Forgot password?" tells the user to ask whoever runs the site.
  - None of these assertions depend on the limits. §14 gave the second server the first server's env plus limits.
- **P3 · Pages that read the signup flag render per request (Steps 9–15).**
  - Every page or admin component that calls `isOpenSignup()` renders per request: `await connection()` as `/` already does, or a request API such as `searchParams`, `headers` or `payload.auth`.
  - The reason: the Docker build runs with an empty environment, so a prerendered `/signup` would stay baked "off". The E2E build would bake it "on".
  - P2's second server serves the flag-on build with the flag off, so a baked page fails the suite.
- **P4 · Onboarding lands before signup (Steps 9–10, then 11).** `/verify/submit` redirects to `/onboarding`, so onboarding must exist first. Until signup exists, onboarding's tests use a user a super admin created without a studio. §13 already covers that case ("Signed in without a studio: Set up your portal").
- **P5 · Account pages reuse the portal's form components.**
  - `/signup`, `/verify/<token>`, `/onboarding` and `/report-abuse` share one shell, `src/components/accounts/AccountPage.tsx`.
  - They reuse `FormField`, `FormNotice` and `TurnstileField` instead of copying them, and `marketing.css` styles those classes inside `.cw-root`.
  - Inputs and buttons are at least 44 px tall, which the screenshot probes check at 390 px.
- **P6 · `/report-abuse` shows the reported path, not the game's name.**
  - Its GET does no lookup, so the page reveals nothing about whether a portal is held or suspended. The submit route still resolves the game with a privileged lookup (§12).
  - The rule for which paths are portal paths lives in `paths.ts`, as `parsePortalPath`, beside every other portal URL.
- **P7 · Concurrency is tested by outcome in E2E.** Each assertion holds whatever the interleaving, so none is flaky. Together they exercise §4's rollback and §6's unique-index and retry paths.
  - Two `POST /verify/submit` with one token and different passwords: exactly one password signs in.
  - Two `POST /onboarding/submit` for one user: exactly one studio and one game.
  - Two users onboarding the same game name at once: two portals with distinct slugs.
- **P8 · The image `srcSet` uses only the width-only sizes.**
  - `thumbnail`, `small`, `medium`, `large` and `xlarge` keep the upload's aspect ratio.
  - `square` (500×500) and `og` (1200×630) are crops and never go in the `srcSet`.
  - A size Payload skipped (because the upload is narrower than it) has no URL and is left out.
- **P9 · The ignore files add `media` and keep `public/media`,** so leftover files never reach git or a Docker image. The boot check still stops any server whose `public/media` holds files.
- **P10 · The E2E artifact includes the outbox.** The final run copies `test-results/outbox/` next to the report, so every captured email can be re-read: verification, account created and password reset.
- **P11 · The limit hooks live beside the module,** in `src/lib/limits/hooks.ts`. `src/lib/limits/` is then the only place that knows the limits; the collections only register the hooks.
- **P12 · `createStudio` returns nothing (CQS).**
  - A double submit comes back as a `StudioExistsError`, which the route turns into a redirect to `/admin`.
  - On success, the route calls a query, `findOnboardedProject(userID)` in `src/lib/onboarding/`, to get the new game's slug and whether it was held.

### Checklist

- [x] Step 1: One email transport, the auth-email templates, and the contact job through Payload (§3, F5)
  - **Files:**
    - `package.json`, `pnpm-lock.yaml`: `pnpm add @payloadcms/email-resend@3.85.2`, pinned exactly like the other `@payloadcms/*` packages.
    - New `src/lib/email/adapter.ts` with `emailAdapter()` and `isEmailDeliverable()` (§3):
      - With `RESEND_API_KEY`: `resendAdapter`, with the sender name and address parsed from `RESEND_FROM_EMAIL` (`Name <address>`). The default is `Critwire <notifications@critwire.local>`, the contact job's current fallback.
      - Without it: an outbox adapter that never throws. It logs `to` and `subject` through `getLogger('email')`, and the HTML only outside production.
      - When `EMAIL_OUTBOX_DIR` is set (empty counts as unset), the outbox adapter also writes each message as `<ISO time>-<random>.json` containing `{ to: string[], from, subject, html, text, sentAt }`. It creates the directory first.
      - `isEmailDeliverable()` is true when Resend is configured, when `NODE_ENV !== 'production'`, or when `EMAIL_OUTBOX_DIR` is set.
    - New `src/lib/email/render.tsx`: `renderEmail(element)` → `{ html, text }`. These are the two `render` calls now in `renderContactFormEmail.tsx`; both email renderers use it.
    - New `src/lib/email/templates/AuthLinkEmail.tsx` (a heading, one sentence, a button and the plain link) and `renderAuthLinkEmail`, next to `renderContactFormEmail`.
    - New `src/lib/email/authEmails.ts`: `verificationEmail(token)`, `accountCreatedEmail()` and `passwordResetEmail(token)`, each returning `Promise<{ subject, html }>`.
      - Links come only from `getServerSideURL()`: `/verify/<token>`, `/admin/login` and `/admin/reset/<token>`.
      - Subjects: "Confirm your email and choose a password", "An account was created for you", "Reset your Critwire password".
    - `src/payload.config.ts`: `email: emailAdapter()`.
    - `src/jobs/contact.ts`: keep the rule that an unset `RESEND_API_KEY` throws. Replace the `fetch` to `api.resend.com` with `req.payload.sendEmail({ to, subject, html, text, replyTo })`.
    - `src/environment.d.ts`: add `EMAIL_OUTBOX_DIR?`.
    - `.env.example`: the Email section says Resend also sends verification and password-reset emails, and production needs it for signup and password recovery. `EMAIL_OUTBOX_DIR` is for development and tests only.
  - **Checks:** standard.
    - Nothing sends auth email yet, so the full suite is a regression check.
    - `reports-contact.spec.ts`'s contact tests must pass unchanged: with `RESEND_API_KEY=''`, an email contact job still fails.
    - `grep -rn "api.resend.com" src` prints nothing.

- [x] Step 2: Data model and account rules, in the migration `open_signup` (§2, §4, F4)
  - **Files:**
    - `src/access/isSuperAdmin.ts`: add `superAdminFieldAccess: FieldAccess`.
    - `src/collections/Users/index.ts`:
      - `auth: { verify: { generateEmailHTML, generateEmailSubject } }`. Use `accountCreatedEmail()` when `user._verified` is true, otherwise `verificationEmail(token)` (§3).
      - Two fields, merged by name over Payload's base auth fields: `_verified` (checkbox; `access.create` and `access.update` set to `superAdminFieldAccess`) and `email` (email; `access.update` set to `superAdminFieldAccess`).
      - `hooks.beforeChange`: new `src/collections/Users/hooks/verifyUsersSuperAdminsCreate.ts`. When a super admin creates a user, it sets `_verified: true`.
    - `src/collections/Tenants/index.ts`: two new fields.
      - `suspended`: checkbox, default false, indexed, in the sidebar; create and update use `superAdminFieldAccess`.
      - `createdBy`: relationship to `users`, `unique`, in the sidebar; create, read and update use `superAdminFieldAccess`.
    - New `src/fields/moderation.ts` exporting `moderationFields()`, spread into `src/collections/GameProjects/index.ts` and `src/collections/PatchNotes/index.ts`:
      - `flagged`: checkbox, default false, indexed, in the sidebar, with the description "Held for review: not public until a Critwire admin approves it."
      - `flagReasons`: textarea in the sidebar, shown when `flagged` is set.
      - Both use `superAdminFieldAccess` for create and update, and neither sets `admin.readOnly`.
    - `src/collections/options.ts`: `ABUSE_REPORT_REASON_OPTIONS` (spam, scam or phishing, offensive, impersonation or copyright, other) and `ABUSE_REPORT_STATUS_OPTIONS` (open, resolved, dismissed).
    - New `src/collections/AbuseReports/index.ts`:
      - slug `abuse-reports`, with the fields from §2;
      - every access function is `superAdminOnly`, and `admin.hidden` is `({ user }) => !isSuperAdmin(user)`;
      - `useAsTitle: 'pageUrl'`; default columns: page, reason, status, createdAt.

      Register it in `src/payload.config.ts`, not in the multi-tenant plugin.
    - The migration `src/migrations/<timestamp>_open_signup.ts`, its `.json` and `index.ts` (see "How every step runs"):
      - In `up`, after the generated SQL, add `UPDATE "users" SET "_verified" = true;`.
      - Check the generated SQL for: a unique `created_by_id` with `ON DELETE SET NULL`; `abuse_reports.game_project_id` with `ON DELETE SET NULL`; the `flagged` indexes; and `version_flagged` and `version_flag_reasons` on `_patch_notes_v`.
    - `src/payload-types.ts`, from `pnpm generate:types`.
    - E2E harness:
      - `tests/e2e/support/env.ts`: export `OUTBOX_DIR` (`<cwd>/test-results/outbox`), and `serverEnv()` sets `EMAIL_OUTBOX_DIR: OUTBOX_DIR`.
      - New `tests/e2e/support/email.ts`:
        - `readEmail(to)` polls `OUTBOX_DIR` for up to 10 s and returns the newest message to that address as `{ subject, html, links }`.
        - `linkTo(email, pathPrefix)` returns the one link starting with `${BASE_URL}${pathPrefix}`, or fails the test.
      - `tests/e2e/support/fixtures.ts`: `randomEmail(label)` returns `<label>-<uuid>@e2e.test`. Every account test uses fresh addresses.
  - **Tests**, in the new `tests/e2e/accounts.spec.ts`:
    - S9.1: a user a super admin creates is verified and can sign in. Their email, "An account was created for you", links to `/admin/login` and contains no `/verify/` link.
    - S9.2: a signed-in user's `PATCH` of their own `email` and `_verified` changes neither; a super admin's `email` change sticks. Use a fresh user, never a `world` user.
    - S9.3: studio users can't write platform fields.
      - An owner's `PATCH` of `suspended` and `createdBy` on their own tenant changes nothing.
      - On a game the owner creates with `flagged: true` and `flagReasons`, both are stored as `false` and empty.
      - On a game a super admin flagged, the owner's `flagged: false` leaves it `true`.
    - S9.4: `GET` and `POST /api/abuse-reports` answer 403 to a studio owner and to an anonymous visitor. A super admin can list them.
  - **Migration backfill check:**
    1. Before `pnpm payload migrate`: `psql "$DB" -c "insert into users (email, updated_at, created_at) values ('pre-existing@open-signup.test', now(), now())"`.
    2. After it: `psql "$DB" -tc "select _verified from users where email='pre-existing@open-signup.test'"` prints `t`.
    3. Delete the row, and put the result in the Log.
  - **Checks:** standard. `auth.setup.ts` must pass unchanged: its super admin creates the studio users, and they must be verified to sign in.

- [x] Step 3: Tenant writes: close the draft hole (F1) and enforce suspension (§7)
  - **Files:**
    - New `src/access/tenantWrite.ts` with `enforceTenantWrite`, the field `beforeChange` hook from §7:
      - The tenant it checks is `value ?? previousValue`.
      - No user, or a super admin: it passes.
      - Not a member of the tenant: a `ValidationError` on `tenant` with today's message, "You can only assign documents to your own studio."
      - Tenant suspended (a privileged `findByID` on `tenants` with `select: { suspended: true }` and `req`): an `APIError` 403, "This studio is suspended, so changes can't be saved."
    - `src/plugins/index.ts`: `tenantField: { hooks: { beforeChange: [enforceTenantWrite] } }` replaces `validate: validateTenantMembership`.
    - `src/access/tenantAccess.ts`: delete `validateTenantMembership`.
    - `tests/e2e/support/fixtures.ts`, two new fixtures (added early, in Step 2, as worker fixtures `seedStudio(label)` and `seedUser(label)` beside `signIn(email, password)`; the owner's REST client is `owner.client`):
      - `seedStudio(api, label)`: the super admin creates a tenant and an owner (fresh email, `PASSWORD`, owner membership), then signs the owner in over REST. Returns `{ tenant: { id, slug }, owner: { id, email, password, token }, client }`.
      - `seedUser(api, label)`: a user the super admin creates with no studio, signed in over REST. Returns `{ id, email, password, token }`.

      Specs that change a studio's state use these, never `world`'s studios.
  - **Tests.** Write them first, run them on the unchanged code, and log the failures:
    - `tenant-isolation.spec.ts` S1.11 [F1]:
      - Studio B's `POST /api/patch-notes?draft=true` with `tenant: A` answers 400, and A has no such draft.
      - B moving its own draft to A with `PATCH ?draft=true` answers 400, and the draft stays in B.
    - The new `tests/e2e/suspension.spec.ts`, S10.1: a suspended studio can't publish.
      - Set up a `seedStudio` studio with a game, a published update, a draft and an item. The super admin sets `suspended: true`.
      - Each of the owner's creates (game, update, draft update, item, media upload) and updates (game, publishing the draft, saving the draft) answers 403 with the message.
      - Deleting the item answers 200.
      - After `suspended: false`, a create works again.
  - **Checks:** standard.

- [x] Step 4: Public visibility, `requirePortalProject` and `/unavailable` (§7, §8, F3; P1)
  - **Files:**
    - New `src/access/publicRead.ts`:
      - one `Where` per collection shape (§7's table), using relationship paths (`tenant.suspended`, `gameProject.flagged`) with `not_equals: true`, so `NULL` counts as not held;
      - signed-in users keep today's result (`true`, with the plugin's tenant constraint);
      - `mediaFileReadOverride` (P1).
    - `src/collections/GameProjects/index.ts`, `src/collections/PatchNotes/index.ts`, `src/collections/Issues/index.ts` and `src/collections/Media.ts`: `access.read` comes from `publicRead.ts`.
    - `src/plugins/index.ts`: `media: { accessResultOverride: mediaFileReadOverride }`.
    - `src/lib/game-portal/getGameProject.ts`, two additions:
      - `portalExists(slug)`: a privileged `count` that returns a boolean, wrapped in React `cache`.
      - `requirePortalProject(slug)`: returns the project; if there's none, `redirect('/unavailable')` when the portal exists, otherwise `notFound()`.
    - The layout and all eight portal pages from F3 call `requirePortalProject`: `g/[gameSlug]/layout.tsx`, `page.tsx`, `updates/page.tsx`, `updates/page/[pageNumber]/page.tsx`, `updates/[slug]/page.tsx`, `feedback/page.tsx`, `feedback/[slug]/page.tsx`, `feedback/new/page.tsx` and `contact/page.tsx`.
      - `generateMetadata`, `updates/feed.xml/route.ts` and both submit routes keep `getGameProject` and answer 404.
    - New `src/app/(public)/unavailable/page.tsx`:
      - static, with `robots: { index: false }`;
      - says "This portal is unavailable." inside `PortalRoot` with `DEFAULT_THEME`;
      - shows no name and no reason.
    - `src/collections/Tenants/index.ts`: an `afterChange` hook, the new `src/collections/Tenants/hooks/revalidateSuspension.ts`. When `suspended` changed, it calls `revalidateGamePortal('tenant suspension', payload)` once.
  - **Tests:**
    - Write first [P1]: `suspension.spec.ts` S10.2, files follow the portal.
      - Upload a banner to a `seedStudio` studio.
      - The original at `/api/media/file/<banner>` and one of its sizes answer 200 to an anonymous visitor, to studio B's JWT, and to a `seedUser` with no studio.
      - On today's code, B and the user with no studio get 403, so the test fails first.
    - `suspension.spec.ts` S10.3, a suspended studio's portal. This is §14's row except the dashboard banner, which Step 15 adds.
      - Warm the caches: the hub, an update page, an item page, RSS and the banner URLs.
      - Suspend the studio. The pages land on `/unavailable` with none of the game's text, and RSS answers 404.
      - The media URLs answer 403 to an anonymous visitor and to B, and still 200 to the studio's owner.
      - Anonymous REST finds none of the studio's games, updates, items or media. `POST /api/vote` answers 404, and so do both submit routes.
      - Unsuspend. The hub, the pages and the files come back (`eventually`).
    - The new `tests/e2e/screening.spec.ts`. Step 7 adds the automatic flagging.
      - S13.1: a game a super admin flags shows `/unavailable` until it's unflagged.
      - S13.2: a published update a super admin flags leaves the feed, its page, RSS and the hub until it's unflagged.
    - `portal-landing.spec.ts` S2.1 still gets its 404 for an unknown slug.
  - **Checks:** standard.
  - **This step's risk:** relationship paths inside access `Where`s. S10.3 and S13.2 fail first if Drizzle can't query one of them.

- [x] Step 5: Media: raster images only, files outside `public/`, one way to serve them (§7b, F2, F11; P8, P9)
  - **Files:**
    - New `src/lib/media/storage.ts`, with no Payload or React imports (`instrumentation-node.ts` loads it):
      - `MEDIA_DIR = path.resolve(process.cwd(), 'media')`;
      - `assertNoLegacyPublicMedia()`, which throws when `public/media` holds files and names the `mv public/media/* media/` fix.
    - `src/collections/Media.ts`:
      - `mimeTypes` as listed in F2;
      - `staticDir: MEDIA_DIR`;
      - `formatOptions: { format: 'webp' }` on every size except `og`;
      - `modifyResponseHeaders` setting `Cache-Control: private, max-age=300`.
    - `src/instrumentation-node.ts`: `checkEnvironment` also calls `assertNoLegacyPublicMedia()`.
    - `next.config.ts`: `images: { unoptimized: true }`. Remove `localPatterns`, `qualities`, `remotePatterns` and the constant only they used.
    - `src/components/Media/ImageMedia/index.tsx`:
      - Add a `<source type="image/webp" srcSet sizes>` built from the width-only sizes (P8), inside the existing `<picture>`. The `next/image` fallback, the fill layout and the blur placeholder stay.
      - Replace the template's comment block with one saying files are only served from `/api/media/file/`.
    - Delete `src/components/Media/VideoMedia/`; `src/components/Media/index.tsx` renders only `ImageMedia`.
    - `.gitignore` adds `/media` and `.dockerignore` adds `media`; both keep `public/media` (P9).
    - `Dockerfile`: in the runner stage, before `USER nextjs`, add `RUN mkdir media && chown nextjs:nodejs media`.
    - `docker-compose.yml`: `app.volumes: [media:/app/media]` and a named `media` volume.
    - Docker isn't installed here, so the `Dockerfile` and `docker-compose.yml` changes are only checked by reading them, and the Log says so.
    - In this worktree, move the leftover E2E uploads (untracked; see the architecture's Risks): `mkdir -p media && mv public/media/* media/ && rmdir public/media`.
  - **Tests**, in the new `tests/e2e/media.spec.ts`. Write S11.1–S11.3 first and run them on the unchanged code.
    - S11.1 [F2]: an SVG containing a script, a PDF and a ZIP are each refused with 400, and nothing is stored.
    - S11.2 [F11]:
      - `/_next/image?url=%2Fapi%2Fmedia%2Ffile%2F<name>&w=640&q=100` answers 404. Today it answers 200, since `q=100` is the only configured quality.
      - An upload lands in `<cwd>/media/` and not in `public/media/`; the test checks this on disk.
    - S11.3 [F11]: media file responses carry `Cache-Control: private, max-age=300`, for the original and for a size.
    - S11.4: the hub's key art is served from `/api/media/file/`.
      - Upload a 1600 px noise PNG made with `sharp`.
      - The `<source>` lists WebP sizes from `thumbnail` to `large`, and each URL answers 200.
      - The `<img>` loads (`naturalWidth > 0`).
    - S11.5 [P1]: a browser signed in as studio B (`bOwner`'s storage state) sees studio A's portal logo load.
    - `portal-landing.spec.ts` S2.6 (an 8 px logo, so no sizes) still passes.
  - **Boot check**, after the E2E run, which leaves a fresh `.next`:
    ```bash
    mkdir -p public/media && touch public/media/leftover.png
    PORT=3199 timeout 90 pnpm start > /tmp/boot-media.log 2>&1; echo "exit $?"
    rm -r public/media
    ```
    It must print `exit 1` (124 means the server didn't stop), and the log must name `public/media` and the `mv` command.
  - **Checks:** standard.

- [x] Step 6: Hosted limits and the second E2E server (§11, F7; P2, P11)
  - **Files:**
    - New `src/lib/limits/index.ts`:
      - `getLimits()`, memoised. Unset or empty means off, a positive integer means on, and anything else throws naming the variable.
      - `LimitReachedError`: an `APIError` with status 403 and a public message.
      - One count per limit: `countStudioGames`, `sumStudioMediaBytes` and `countPublicFeedback`, all through the Local API with `req`.
      - `assertGameRoom`, `assertMediaRoom` and `assertPublicFeedbackRoom`, which throw at the limit.
      - `hasPublicFeedbackRoom`, a query for auto-publish.
      - The messages are §11's, with the configured numbers.
    - New `src/lib/limits/hooks.ts`. Each hook skips super admins and writes without a user.
      - `checkGamesLimit`: GameProjects `beforeChange`, on create or when the tenant changes.
      - `checkMediaLimit`: Media `beforeChange`, when `req.file` is present. It counts the `filesize` of the studio's original uploads, minus the document being replaced.
      - `checkPublicFeedbackLimit`: Issues `beforeChange`, when an item becomes public: created public, changed from private to public, or moved to another game while public.
    - Register the hooks in `src/collections/GameProjects/index.ts`, `src/collections/Media.ts` and `src/collections/Issues/index.ts`.
    - `src/collections/IssueReports/hooks/autoPublishReport.ts`: when `hasPublicFeedbackRoom` is false, the submission stays `NEW`.
    - `src/instrumentation-node.ts`: `checkEnvironment` calls `getLimits()`.
    - `src/environment.d.ts` and `.env.example`: the three `CRITWIRE_LIMIT_*` variables, off by default. The `.env.example` comments give the hosted values (3, 100, 200).
    - `tests/e2e/support/env.ts`:
      - `serverEnv()` sets the three limits to `''`.
      - Add `SECOND_PORT = E2E_PORT + 2` and `SECOND_BASE_URL`.
      - Add `secondServerEnv()`: `serverEnv()` plus `PORT`, `CRITWIRE_OPEN_SIGNUP: ''`, `EMAIL_OUTBOX_DIR: ''` and the limits `2`, `1` and `3` (P2).
    - `playwright.config.ts`: `webServer` becomes a list. The second entry runs `pnpm start` with `secondServerEnv()` and waits for `${SECOND_BASE_URL}/api/health` (timeout 120 s), with `reuseExistingServer: false` and piped output. It never migrates or builds.
    - `tests/e2e/support/fixtures.ts`: `secondApi(role)`, worker-scoped `RestClient`s on `SECOND_BASE_URL` using the `world` tokens. Both servers share the database, so fixtures always seed through 3100.
  - **Tests**, in the new `tests/e2e/limits.spec.ts`:
    - S12.1, limits on (port 3102), in a fresh `seedStudio` studio:
      - The third game gets a 403 with the games message. Saving a third game in the admin on 3102 shows the same text as a toast.
      - A 1.5 MB noise PNG gets a 403 with the media message.
      - The fourth public item gets a 403 with its message, and so does making a private item public.
      - A player's submission to a game with review off, at the limit, gets the normal confirmation and stays `NEW`.
      - A super admin can still add a game past the limit.
    - S12.2, limits unset (port 3100): the same actions all succeed.
  - **Boot check:** `CRITWIRE_LIMIT_GAMES_PER_STUDIO=three PORT=3199 timeout 90 pnpm start > /tmp/boot-limits.log 2>&1; echo "exit $?"` prints `exit 1`, and the log names the variable.
  - **Checks:** standard. Two servers run from now on, so the Log also records the suite's wall time and peak memory (`free -m` during the run).

- [x] Step 7: Screen studio text and hold it for review (§9, F6)
  - **Files:**
    - New `src/hooks/screenText.ts`: `screenTextHook(textOf)`.
      - It screens on create, and on update when `textOf({ ...originalDoc, ...data })` differs from `textOf(originalDoc)`. That's how "any screened field changed" is detected without a second list of fields.
      - It sets `flagged`, and sets `flagReasons` to the reasons joined by newlines, or `null` when the text is clean.
    - `src/collections/IssueReports/index.ts`: `screenTextHook` with the title and description replaces `screenReportText`. Delete `src/collections/IssueReports/hooks/screenReportText.ts`.
    - `src/collections/GameProjects/index.ts`: screen the name and the pitch.
    - `src/collections/PatchNotes/index.ts`: screen the title, the version label, the summary, and the content's plain text (`convertLexicalToPlaintext`).
  - **Tests**, in `screening.spec.ts`:
    - S13.3: a game named with an offensive word (like the flagged inputs in `reports-contact.spec.ts` S5.11) is held.
      - It's stored `flagged`, with its reason, and the hub shows `/unavailable`.
      - The owner's admin shows the flag and the reason, read-only.
      - A super admin unticks `flagged` in the admin and saves, and the hub appears (`eventually`).
      - The owner saving the unchanged name keeps it approved.
    - S13.4: a published update with an offensive word in its content is missing from the feed, its own page (404), RSS and the hub until a super admin approves it.
    - S13.5: a pitch with three links is held with the reason "3 links".
    - `reports-contact.spec.ts` S5.11 passes unchanged.
  - **Checks:** standard.

- [x] Step 8: Reserve the demo slug and pin the demo seed to its own studio (§7 Demo, F8)
  - **Files:**
    - `src/components/marketing/links.ts`: `DEMO_GAME_SLUG = 'critter-connect'` and `DEMO_PORTAL = portalPaths(DEMO_GAME_SLUG)`.
    - New `src/collections/GameProjects/reservedSlug.ts`, on the model of `Issues/reservedSlug.ts`:
      - `isReservedGameSlug(slug)`;
      - `gameSlugify`, the slug field's `slugify`. It throws the reserved-slug `ValidationError` unless the write has no user or comes from a super admin, using the `req` Payload passes;
      - `rejectReservedGameSlug`, a `beforeValidate` hook for slugs typed by hand.
    - `src/collections/GameProjects/index.ts`: `slugField({ useAsSlug: 'name', slugify: gameSlugify })` and `beforeValidate: [rejectReservedGameSlug]`.
    - `src/seed/critterConnect.ts`: find or create the tenant with slug `critwire-demo` (named "Critwire Demo"). Throw if `critter-connect` belongs to another tenant. Never read `tenants.docs[0]`.
    - `tests/screenshots/setup.shots.ts`: drop the `demo-studio` tenant it creates, since the seed now makes its own.
  - **Tests:** `tenant-isolation.spec.ts` S1.12. A studio owner can't create a game as `critter-connect`, or rename one to it, whether by slug or by a name that slugifies to it (400). A super admin can.
  - **Seed check.** The E2E server has no `CRON_SECRET`, so the seed is checked by hand here and again in Step 17:
    1. Run `pnpm seed:critter-connect` twice on the mission database.
    2. `psql "$DB" -tc "select t.slug from game_projects g join tenants t on t.id = g.tenant_id where g.slug='critter-connect'"` prints `critwire-demo`.
    3. Move the game to another tenant with `psql`. The seed must exit non-zero with the ownership message. Move the game back.
    4. Clear the `dev` row the script's dev push leaves.
  - **Checks:** standard.

- [x] Step 9: Onboarding: `createStudio` and `POST /onboarding/submit` (§6, §10; P3, P4, P7, P12)
  - **Files:**
    - New `src/lib/hosting.ts`: `isOpenSignup()`. `CRITWIRE_OPEN_SIGNUP=1` is on, unset or empty is off, and anything else throws naming the variable.
      - `src/instrumentation-node.ts` calls it at boot.
      - `environment.d.ts` and `.env.example` document it: hosted instances only, leave it unset to self-host.
    - New `src/utilities/uniqueSlug.ts`: `uniqueSlug({ base, fallback, isTaken })`, the slugify and `-2`, `-3` loop extracted from `createIssueFromPublishedReport.ts`. That hook now uses it, and reserved feedback slugs still count as taken.
    - `src/lib/game-portal/links.ts`: `storeLinkKey(url)`, a pure function next to `STORE_LINK_KEYS`.
      - It returns the link key for Steam (`steampowered.com`), itch.io (`itch.io`), Epic (`epicgames.com`), GOG (`gog.com`), PlayStation (`playstation.com`), Xbox (`xbox.com`) and Nintendo (`nintendo.com`), and `null` for anything else.
      - A URL matches when its host is the domain or a subdomain of it, split on a dot boundary.
    - New `src/lib/payload/withTransaction.ts` (§4).
    - New `src/lib/onboarding/createStudio.ts` (§6 steps 1–3):
      - A unique violation on `createdBy` throws `StudioExistsError`.
      - A unique violation on `slug` reruns the whole transaction, at most 3 attempts in all.
      - It returns nothing (P12).
    - New `src/lib/onboarding/findOnboardedProject.ts`: a query returning the slug and `flagged` of the game in the studio the user created.
    - New `src/lib/onboarding/nextSteps.ts`: the three next steps as data (label, description, and an href built from the project). The dashboard shares it in Step 15.
    - New `src/app/(frontend)/onboarding/submit/route.ts`:
      - 404 unless `isOpenSignup()`.
      - Authenticates with `payload.auth({ headers })`. No user: 303 to `/admin/login?redirect=%2Fonboarding`.
      - The `_verified` invariant (§6): if it fails, throw to the route's catch (500, Sentry).
      - A user already in a studio: 303 to `/admin`.
      - Zod: `name` 1–80 characters; `website` an http(s) URL; `store` optional and mapped with `storeLinkKey`. An unknown store host: 303 to `/onboarding?error=store`.
      - Calls `createStudio`, then `findOnboardedProject`. Redirects with 303 to `/g/<slug>?welcome=1`, or to `/onboarding?held=1` when the game was held. `StudioExistsError`: 303 to `/admin`.
      - Any other error: Sentry, then 303 to `/onboarding?error=1`.
    - `tests/e2e/support/env.ts`: `serverEnv()` sets `CRITWIRE_OPEN_SIGNUP: '1'`. The second server already overrides it with `''`.
    - `tests/e2e/support/fixtures.ts`: `onboard(request, token, input)` posts the form with the JWT and `maxRedirects: 0`, and returns the `Location` header.
  - **Tests**, in the new `tests/e2e/onboarding.spec.ts`:
    - S14.1: a `seedUser` onboards over HTTP.
      - This creates one tenant (`createdBy` is the user, who is its owner) and one game: the name, `links.website`, the Steam URL in `links.steam`, ideas off and review on.
      - `Location` is `/g/<slug>?welcome=1`, and the anonymous hub shows the name and "Get the game".
    - S14.2: a store URL on an unknown host is refused with the list of known stores, and nothing is created.
    - S14.3 [P7]: two concurrent submits for one user create exactly one studio and one game. A later submit redirects to `/admin`.
    - S14.4 [P7]: two users onboarding the same game name at once both get portals, with distinct slugs.
    - S14.5: a game named "Critter Connect" gets the slug `critter-connect-2`. A name the filter flags lands on `/onboarding?held=1`, with the game stored `flagged`.
    - S14.6: without a session, the submit redirects to sign-in; a studio member's submit redirects to `/admin`; the second server answers 404.
  - **Boot check:** `CRITWIRE_OPEN_SIGNUP=yes PORT=3199 timeout 90 pnpm start > /tmp/boot-flag.log 2>&1; echo "exit $?"` prints `exit 1`, and the log names the variable.
  - **Checks:** standard. `reports-contact.spec.ts` S5.7 (a submission titled "New" becomes `new-2`) covers the `uniqueSlug` extraction.

- [x] Step 10: The onboarding page and the next-steps panel (§6; P3, P5)
  - **Files:**
    - New `src/components/accounts/AccountPage.tsx`: the account-page shell (heading, lede, notices, children). Steps 10–14 use it.
    - `src/app/(frontend)/marketing.css`: `.cw-root` rules for the classes of `FormField`, `FormNotice` and `TurnstileField`, with controls at least 44 px tall (P5).
    - New `src/app/(frontend)/onboarding/page.tsx`:
      - dynamic and `noindex`; 404 unless signup is open;
      - the same session rules as the route: no user goes to `/admin/login?redirect=/onboarding`, and a user with a studio goes to `/admin`;
      - the form: game name, your website, and an optional store link, with the known stores listed in its hint;
      - the `?error=1`, `?error=store` and `?held=1` states, with §6's copy.
    - New `src/components/game/WelcomePanel.tsx`: a client component that uses `useSearchParams` and renders only with `welcome=1`.
      - It shows the three steps from `nextSteps.ts`. "Share this link" shows the absolute hub URL (from `getClientSideURL()`) with a Copy button.
      - The hub page (`src/app/(public)/g/[gameSlug]/page.tsx`) renders it inside `<Suspense>` above `HubHeader`, passing the project's ID and slug.
  - **Tests**, in `onboarding.spec.ts`:
    - S14.7: in the browser, a `seedUser` signs in at `/admin/login`, opens `/onboarding` and fills in the form.
      - They land on `/g/<slug>?welcome=1`, which shows the game's name and the three steps.
      - The steps are: the absolute link (`${BASE_URL}/g/<slug>`) with Copy; "Add your first update", linking to `/admin/collections/patch-notes/create`; and "Turn on ideas", linking to `/admin/collections/game-projects/<id>`.
      - An anonymous context opening `/g/<slug>` sees the hub without the panel.
    - S14.8: `/onboarding` without a session redirects to `/admin/login?redirect=%2Fonboarding`, and signing in there returns to `/onboarding`. A studio owner is sent to `/admin`. The second server answers 404.
  - **Checks:** standard.

- [ ] Step 11: Signup and verification (§1, §4, §5)
  - **Files:**
    - New `src/lib/accounts/emailBudget.ts`: `checkAccountEmailBudget(email)`, the `account-email` budget from §5 (sha256 of the lower-cased address, 3 per hour).
    - New `src/lib/accounts/pendingUser.ts`: `findPendingUserByToken(token)`, a query.
    - New `src/lib/accounts/activateAccount.ts`: `activateAccount({ userID, token, password })`, a command running in one `withTransaction`.
    - New `src/app/(frontend)/signup/page.tsx`:
      - `await connection()`; 404 unless signup is open; `noindex`;
      - an email field and `TurnstileField`, with the text "We'll email you a link to choose your password.";
      - on `?submitted=1`, "Check your inbox", with links to sign in and to "Forgot password?" (`/admin/forgot`);
      - an `?error=1` state.
    - New `src/app/(frontend)/signup/submit/route.ts` (§5): every case redirects with 303 to `/signup?submitted=1`. When `!isEmailDeliverable()`, it answers 500 and reports to Sentry.
    - New `src/app/(frontend)/verify/[token]/page.tsx`: GET only renders. It shows either "Choose a password" (a password of 8–128 characters, plus Turnstile), or "This link has been used or is invalid…" with a sign-in link.
    - New `src/app/(frontend)/verify/submit/route.ts` (§4 steps 1–4):
      - signs in with `login` from `@payloadcms/next/auth`, then 303 to `/onboarding`;
      - no pending user: 303 back to `/verify/<token>`, which shows the "used or invalid" state;
      - invalid input: `?error=1`.
    - `tests/e2e/support/fixtures.ts`: `startSignup(request, email)` and `verifyAccount(request, token, password)`, which Step 12's `signUpStudio` builds on.
  - **Tests**, in the new `tests/e2e/signup.spec.ts`:
    - S15.1 [DoD]: the whole flow in the browser.
      - `/signup`, then "Check your inbox", then the link from the outbox, then "Choose a password".
      - The user lands on `/onboarding`, signed in, and onboards with a game name, a website and a Steam URL.
      - `/g/<slug>?welcome=1` shows the name, "Get the game" and the next steps, and an anonymous context sees the hub.
    - S15.2 [DoD, first half]: a pending account.
      - Opening its link twice with GET leaves it unverified; a super admin reads `_verified: false`.
      - It owns no tenant and no game.
      - `/onboarding` without a session goes to sign-in.

      Step 13 adds the password-reset half.
    - S15.3: a second signup for a pending address sends the same link and leaves the user's `updatedAt` unchanged. A signup for a verified address sends nothing. All three answer "Check your inbox".
    - S15.4: once the link is used, GET shows "used or invalid", and posting it again changes nothing.
    - S15.5 [P7]: two concurrent verify posts with one token and different passwords. Exactly one of the passwords signs in over REST.
    - S15.6: `POST /signup/submit` and `POST /verify/submit` without a Turnstile token answer 400.
    - S15.7: the second server answers 404 for `/signup`, `/verify/<token>` and both submit routes.
  - **Checks:** standard.

- [ ] Step 12: Prove signed-up studios stay isolated (DoD; §14 row 4)
  - **Files:**
    - `tests/e2e/support/fixtures.ts`: `signUpStudio(playwright, name)`, as in §14: signup, the outbox link, verification with a password, a REST sign-in for a JWT, then onboarding over HTTP. Returns `{ email, password, token, tenantID, project }`.
    - `tests/e2e/tenant-isolation.spec.ts`: S1.13.
  - **Tests:** S1.13, two signed-up studios A and B.
    - A creates a published update, a draft update, a public item and a private item, a submission (through the public form), a media upload and a media folder.
    - B's lists hold none of A's projects, updates (drafts included, with `?draft=true`), items, submissions, media, folders, users or tenants.
    - B's `PATCH` and `DELETE` on each of A's documents are refused.
    - B's creates with `tenant: A` are refused, including a draft update (F1).
    - B can't join A: `PATCH /api/users/<B>` with `tenants: [A]` changes nothing, and `PATCH /api/tenants/<A>` is refused.
    - A's project edit URL, opened in the admin as B, shows none of A's data.
  - **Checks:** standard. The brief makes isolation non-negotiable, so a hole found here is fixed here, and the Log says so.

- [ ] Step 13: Password recovery behind Turnstile and rate limits (§4, §4a, F12)
  - **Files:**
    - `src/collections/Users/index.ts`:
      - `auth.forgotPassword: { generateEmailHTML, generateEmailSubject }`, using `passwordResetEmail(token)`;
      - `hooks.beforeOperation: [restrictPasswordRecovery]`, in the new `src/collections/Users/hooks/restrictPasswordRecovery.ts`.
    - New `src/components/admin/ForgotPasswordView.tsx` (§4a): a server component that reads `isEmailDeliverable()` and the `submitted` and `error` search params Payload passes.
      - Register it as `admin.components.views.forgot` in `src/payload.config.ts`, then run `pnpm generate:importmap`.
    - New `src/app/(frontend)/forgot-password/submit/route.ts` (§4a steps 1–4).
  - **Tests**, in the new `tests/e2e/password-recovery.spec.ts`. Write S16.1 first and run it on the unchanged code.
    - S16.1 [F12]:
      - `POST /api/users/forgot-password` and GraphQL's `forgotPasswordUsers` are refused for a real user's address, and the outbox gets nothing for it.
      - `POST /forgot-password/submit` without a Turnstile token answers 400.
    - S16.2 [DoD]: a `signUpStudio` user signs out, then signs back in at `/admin/login`.
      - "Forgot password?" opens the custom `/admin/forgot`.
      - The user submits the form (with Turnstile) and sees "Check your inbox".
      - The email links to `/admin/reset/<token>`; after choosing a new password there, the user is signed in.
      - REST login works with the new password and fails with the old one.
    - S16.3 [DoD, second half]: a pending account (signup only) goes through recovery with the form.
      - `POST /api/users/reset-password` with the emailed token returns a token.
      - With that token, `GET /api/users/me` returns `null`, `PATCH /api/users/<id> { "_verified": true }` answers 403, and `/onboarding` redirects to sign-in.
      - Login with the new password is refused, with a message that mentions verification.
      - A super admin still reads `_verified: false`.
    - S16.4: on the second server, where email isn't deliverable, `/admin/forgot` tells the user to ask whoever runs the site and shows no form. `POST /forgot-password/submit` answers 500.
  - **Checks:** standard. `admin-triage.spec.ts` S6.1 (the login page) must still pass.

- [ ] Step 14: Hosted-only public links: "Report this page" and "Create your portal" (§12, §13; P3, P6)
  - **Files:**
    - `src/lib/game-portal/paths.ts`: `parsePortalPath(path)` returns `{ gameSlug }` for `/g/<slug>` and any path under it, and `null` otherwise.
    - `src/lib/hosting.ts`: `SIGNUP_PATH` and `reportAbuseHref(pagePath)`.
    - `src/components/game/PortalFooter.tsx`: "Report this page", linking to `reportAbuseHref(portalPaths(slug).hub)`, when `isOpenSignup()`.
    - New `src/app/(frontend)/report-abuse/page.tsx`:
      - dynamic and `noindex`; 404 unless signup is open;
      - shows the reported path (P6);
      - the form: a reason (`ABUSE_REPORT_REASON_OPTIONS`), details (up to 2000 characters), an optional email, and Turnstile;
      - `?submitted=1` and `?error=1` states.
    - New `src/app/(frontend)/report-abuse/submit/route.ts` (§12). `page` is checked with `parsePortalPath`.
    - `src/components/marketing/MarketingHome.tsx`: a `signupHref` prop. "Create your portal" (`cw-btn`) sits next to "Critwire on GitHub" and is hidden when the prop is `null`.
    - `src/app/(frontend)/page.tsx` passes `isOpenSignup() ? SIGNUP_PATH : null`.
  - **Tests:**
    - The new `tests/e2e/abuse-reports.spec.ts`:
      - S17.1 [DoD]: "Report this page" in a portal's footer opens the form (reason, details, Turnstile), and submitting it shows the thank-you notice. The super admin's `GET /api/abuse-reports` lists the report with its `pageUrl` and game. A report about a suspended studio's portal still resolves its game.
      - S17.2: `POST /report-abuse/submit` answers 400 without a Turnstile token, and 400 for a `page` outside `/g/`.
      - S17.3: on the second server, the portal footer has no "Report this page" and `/report-abuse` answers 404.
    - `tests/e2e/home.spec.ts`:
      - S8.1: on 3100, "Create your portal" links to `/signup`, next to "Critwire on GitHub".
      - S8.2: on the second server, the home page has no signup link. The old S8.1 assertion moves here.
  - **Checks:** standard.

- [ ] Step 15: The admin: a dashboard for each role, and Critwire branding on sign-in (§4 styling, §10, §13, F9)
  - **Files:**
    - `src/components/BeforeDashboard/index.tsx` and `index.scss`: a server component that uses the `payload` and `user` props Payload passes. It replaces "Launch checklist" and "Create a tenant for the studio" with three variants (§13):
      - **Super admin:** counts, each linking to its filtered list: held games (`?where[flagged][equals]=true`), held updates, open abuse reports, and studios.
      - **Studio user:**
        - each game's portal link and status: Live, Held for review, or Unavailable: suspended;
        - a banner when the studio is suspended;
        - the next steps from `nextSteps.ts`;
        - the active limits from `getLimits()`, or nothing when all are off.
      - **Signed in without a studio:** "Set up your portal", linking to `/onboarding`, when signup is open.
    - `src/components/BeforeLogin/index.tsx`: keep "Welcome to Critwire.", and add "New to Critwire? Create your portal" (linking to `/signup`) when signup is open.
    - New `src/components/admin/Logo.tsx` and `Icon.tsx`, reusing `src/components/marketing/Wordmark.tsx`.
    - `src/payload.config.ts`: `admin.components.graphics.Logo` and `Icon`, and `admin.meta` with `titleSuffix: ' | Critwire'` and the favicons.
    - `src/app/(payload)/custom.scss`: styles for the login, forgot-password and reset views.
    - `src/plugins/index.ts`: the membership comment no longer promises invites (F9).
    - `pnpm generate:importmap`.
  - **Tests:**
    - The new `tests/e2e/admin-dashboard.spec.ts`:
      - S18.1: the super admin's dashboard shows the counts of held games, held updates, open reports and studios, each linking to its filtered list.
      - S18.2: a studio owner's dashboard lists each game's portal link and status, and the next steps. It shows no limits on 3100, and the three limits (2 games, 1 MB, 3 items) on the second server.
      - S18.3: a signed-in user with no studio sees "Set up your portal" on 3100, and not on the second server.
      - S18.4: `/admin/login` shows the Critwire logo and "Create your portal" on 3100, and no "Create your portal" on the second server.
    - `suspension.spec.ts` S10.3 adds: the owner's dashboard shows the suspended banner, and the banner is gone after unsuspending.
    - `admin-triage.spec.ts` S6.1: replace the "Launch checklist" assertion with the studio dashboard's heading.
  - **Checks:** standard.

- [ ] Step 16: Docs: self-hosting, the new URLs and the patterns (§13; F9)
  - **Files:**
    - New `docs/self-hosting.md` (§13):
      - the services table, with what fails without each service;
      - the first super admin, made through `/admin`'s first-user form;
      - `CRITWIRE_OPEN_SIGNUP` and the limits, all off by default, with the hosted values;
      - an Upgrading section: `mv public/media/* media/`, and the Docker `media` volume.
    - `AGENTS.md`:
      - a docs-map row for `docs/self-hosting.md`;
      - Build process: the owner chose open signup from day one (2026-09-29), and Phase 8 has no invites;
      - Testing: the second server on `E2E_PORT + 2` (signup off, email off, low limits), and the outbox at `test-results/outbox`.
    - `docs/features.md`: user verification, Hosting, and Phase 8 with its sequencing rule.
    - `docs/architecture.md`: the new URLs and how each renders, and how media is served.
    - `docs/patterns.md`:
      - the tenant-write hook;
      - public reads and the media file-read override;
      - `requirePortalProject`;
      - the screening hook and `moderationFields()`;
      - limits;
      - uploads are served only through `/api/media/file/`;
      - pages that read the signup flag render per request.
    - `docs/integrations.md`: the Resend adapter and the outbox, the private R2 bucket, and the new env vars.
    - `docs/deploy.md`: the first-run bootstrap (the first super admin needs no signup), and the `media` volume.
    - `README.md`: a link to `docs/self-hosting.md`.
  - **Checks:**
    - `pnpm exec tsc --noEmit` and `pnpm lint`. The step changes docs only, so no E2E.
    - Every variable in `src/environment.d.ts` appears in `.env.example` and in `docs/integrations.md`, except the E2E-only ones, which `.env.example` marks as such.

- [ ] Step 17: Screenshots of the signup pages and the updated home page (DoD)
  - **Files:**
    - `tests/screenshots/catalog.ts`:
      - a `signup` group, "Sign up and onboarding", with `/signup`, `/signup?submitted=1`, `/verify/<token>`, `/onboarding` (signed in) and `/g/<slug>?welcome=1`;
      - `ShotsWorld.signup` and an optional `Shot.signedIn`;
      - `isPortalGroup` lists the portal groups by name, so the new group isn't treated as a portal group.
    - `tests/screenshots/setup.shots.ts`:
      - a pending signup's token;
      - a verified user with no studio, whose session is saved to `test-results/shots/onboarding-user.json`;
      - a `signUpStudio` studio for the welcome page;
      - an assertion that the seed put `critter-connect` in `critwire-demo`.
    - `tests/screenshots/design.shots.ts`: signed-in shots use a browser context with that storage state.
    - `playwright.screenshots.config.ts`: update its comment.
  - **Run:** `SHOTS_SET=after SHOTS_DIR=/srv/critter-ai/agent-state/missions/open-signup/screenshots pnpm screenshots`.
    - It covers every group, so the portal pages are re-checked after Step 5's image change.
    - The run must pass with every probe, and `index.html` must show the signup group and the home page at 1440 and 390 px.
    - Look at every PNG: the hub's key art renders, the forms fit at 390 px, and the home page shows "Create your portal".
  - **Checks:** tsc and lint. Also run the full E2E suite if `tests/e2e/support` changed.

- [ ] Step 18: Full verification, artifacts and Summary
  - Run the whole **Verification** below, in order.
  - Update H3 in `/srv/critter-ai/handoff/critwire.md`. Keep its status (`later`) and don't ask again; add that:
    - production signup and password recovery also need `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` on a domain verified in Resend;
    - the hosted instance sets `CRITWIRE_OPEN_SIGNUP=1` and the three limits.
  - Write the **Summary**:
    - what shipped;
    - the hosted limits: 3 games per studio, 100 MB of media per studio, 200 public feedback items per game;
    - the production environment variable names;
    - the handoff items: H3 `later`, H7 and H8 waiting, none blocking;
    - after merging: run `mv public/media/* media/` in `/srv/critter-ai/critwire` and restart `critwire-demo`, or the boot check stops them;
    - where the E2E and screenshot artifacts are;
    - both review verdicts.
  - Set `status: done` in the front matter, commit and push.

### Risks for the steps

- **P1 is the only place file reads are widened.** S10.2 and S11.5 prove it works, and S10.3 proves suspension still wins over it.
- **Suite length and memory.** Two servers and about 45 new tests put a full run at roughly 8–10 minutes and add about 1 GB of memory. The Log records both from Step 6 on. Per the architecture's Risks, if contact-job tests turn flaky with two job crons, turn off `jobs.shouldAutoRun` on the second server.
- **The `/admin/forgot` override** relies on Payload resolving `admin.components.views.forgot` before its own view (`getRouteData.js:106-128`, as the architecture read it). If it doesn't, S16.2 fails at its first action.
- **Cached redirects.** ISR caching of `redirect()` (an architecture risk) is covered by S10.3, which warms the pages, suspends, then unsuspends.
- **Network access for Turnstile.** The Turnstile test keys load `challenges.cloudflare.com`, as the existing form tests already do. A network outage fails the browser tests, not the app.

## Verification

E2E first. Run everything from the worktree root, one heavy job at a time, with nothing else on ports 3100–3102 or 3200.

There are no new int tests and no Failure modes section:
- every new behaviour can be reached end to end;
- concurrency is tested by outcome (P7);
- the three boot-time refusals are checked by the commands below.

**Commands and what they must show (Step 18)**

```bash
cd /srv/critter-ai/worktrees/open-signup
DB=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
OUT=/srv/critter-ai/agent-state/missions/open-signup
```

1. **E2E:** `set -o pipefail; pnpm test:e2e 2>&1 | tee /tmp/open-signup-e2e.log`
   - Exit 0 and 0 failed; the config allows no retries.
   - The passed count is Baseline's 75 plus the new tests, and it matches the last step's Log line.
   - **Artifact:** `rm -rf $OUT/e2e-final && cp -r playwright-report $OUT/e2e-final && cp /tmp/open-signup-e2e.log $OUT/e2e-final/run.log && cp -r test-results/outbox $OUT/e2e-final/outbox`
     - Every test has a trace and screenshots (`trace: 'on'`, `screenshot: 'on'`).
     - The outbox copy holds every email the run sent (P10).
   - **Reproduce:** `pnpm test:e2e`. **View:** `pnpm exec playwright show-report $OUT/e2e-final`.
2. **Typecheck:** `pnpm exec tsc --noEmit` exits 0.
3. **Lint:** `pnpm lint` shows 0 errors and 20 or fewer warnings, none in a file this mission added or changed.
4. **Int:** `pnpm test:int` passes the two existing files, `content-screen` and `issue-revalidation`.
5. **Build:**
   1. `psql "$DB" -c "delete from payload_migrations where name='dev'"`.
   2. `pnpm payload migrate:status` lists `…_open_signup` as run.
   3. `pnpm build` exits 0. It builds with `.env`, where signup is off, so nothing that depends on the flag may be prerendered (P3).
6. **Boot checks**, after the build. Each must print `exit 1` (124 means the server didn't stop), and its log must name the problem:
   ```bash
   CRITWIRE_OPEN_SIGNUP=yes PORT=3199 timeout 90 pnpm start > /tmp/boot-flag.log 2>&1; echo "exit $?"
   CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO=-5 PORT=3199 timeout 90 pnpm start > /tmp/boot-limits.log 2>&1; echo "exit $?"
   mkdir -p public/media && touch public/media/leftover.png && PORT=3199 timeout 90 pnpm start > /tmp/boot-media.log 2>&1; echo "exit $?"; rm -r public/media
   mkdir -p $OUT/e2e-final/boot-checks && cp /tmp/boot-*.log $OUT/e2e-final/boot-checks/
   ```
7. **Migration backfill:** rerun Step 2's check if the migration changed after Step 2.
8. **Screenshots:** rerun Step 17's command if any UI changed after Step 17. Every probe must pass, and `$OUT/screenshots/index.html` must exist.
9. **Audits.** Each of these prints nothing:
   ```bash
   grep -rn "validateTenantMembership\|screenReportText\|VideoMedia\|api.resend.com" src
   grep -nE "remotePatterns|localPatterns|qualities" next.config.ts
   grep -rn "if (!project) notFound()" 'src/app/(public)/g'           # F3: the copied gate is gone
   grep -rnF '/g/${' src | grep -v src/lib/game-portal/paths.ts        # portal URLs come from paths.ts
   grep -rln "CRITWIRE_LIMIT_" src | grep -vE "src/lib/limits/index.ts|src/environment.d.ts"
   grep -rln "CRITWIRE_OPEN_SIGNUP" src | grep -vE "src/lib/hosting.ts|src/environment.d.ts"
   grep -rln "EMAIL_OUTBOX_DIR" src | grep -vE "src/lib/email/adapter.ts|src/environment.d.ts"
   ```
   And `grep -c '"@payloadcms/email-resend": "3.85.2"' package.json` prints `1`.

**Definition of done: what proves each item**

| Definition of done | Proof | Step |
|---|---|---|
| `tsc`, `lint` and `build` pass, and the full E2E suite passes | Commands 1–5 | 18 |
| The whole signup flow: sign up, verify through a captured email, onboard, see the live portal | `signup` › S15.1, plus `e2e-final/outbox` | 11 |
| An unverified account's portal isn't public | `signup` › S15.2; `password-recovery` › S16.3 | 11, 13 |
| A second signed-up user can't read or write the first user's studio | `tenant-isolation` › S1.13, plus S1.11 for draft writes [F1] | 12, 3 |
| Each limit, when enabled, blocks with a message | `limits` › S12.1 (port 3102) | 6 |
| Nothing is blocked when limits are unset | `limits` › S12.2 (port 3100) | 6 |
| A suspended studio's portal and publishing | `suspension` › S10.1–S10.3 | 3, 4, 15 |
| The report-this-page flow | `abuse-reports` › S17.1–S17.3 | 14 |
| Screenshots of signup, verify, onboarding, next steps and `/`, at 1440 and 390 px, with `index.html` | Command 8 → `$OUT/screenshots/` | 17 |
| The Summary lists the hosted limits, the production env vars and the handoff items | **Summary** | 18 |
| `agent/open-signup` pushed and not merged | Every step pushes; `git status` is clean at the end | all |

**The rest of the Goal: what proves each item**

| Goal item | Proof | Step |
|---|---|---|
| Sign-in and password reset work, styled to match | `password-recovery` › S16.2; `admin-dashboard` › S18.4 | 13, 15 |
| One limits module, driven by env vars, off by default | `limits` › S12.2; boot check 6; the audits | 6 |
| Signup is protected by Turnstile and rate limiting | `signup` › S15.6 for Turnstile. E2E has no Upstash (`RATE_LIMIT_OPTIONAL=1`), so the rate limit runs through `guardPublicForm` and `checkRateLimit`, the same code as the existing forms, and isn't exercised to exhaustion | 11 |
| The content filter screens a studio's own text | `screening` › S13.3–S13.5; `onboarding` › S14.5 | 7, 9 |
| A super admin can suspend a studio | `suspension` › S10.1–S10.3 | 3, 4 |
| The design's hardening (F1, F2, F8, F11, F12) | `tenant-isolation` › S1.11, S1.12; `media` › S11.1–S11.3; `password-recovery` › S16.1 | 3, 5, 8, 13 |
| Self-hosted defaults: no signup, no call to action, no report link, recovery without email | The second-server tests: S8.2, S14.6, S14.8, S15.7, S16.4, S17.3, S18.3, S18.4 | 9–15 |
| `/` has "Create your portal", leading to `/signup` | `home` › S8.1 | 14 |
| Self-hosting docs | `docs/self-hosting.md` | 16 |

## Decisions

- **Step 1 · The contact email loses its own 10-second timeout.** It now sends through `@payloadcms/email-resend`, which has no timeout option, so a hung Resend call waits for Node's fetch timeouts instead. Accepted over a second hand-rolled Resend client (F5, DRY): the job runs off the request path and is retried on failure.
- **Step 1 · A failed outbox write throws.** The outbox never refuses a message, but an unwritable `EMAIL_OUTBOX_DIR` (development and E2E only) fails loudly rather than silently dropping the email a test waits for. Outbox file names replace `:` and `.` in the ISO time with `-`, so they're valid on every filesystem.
- **Step 1 · A malformed `RESEND_FROM_EMAIL` stops boot.** It must be `Name <address>` or a bare address (then the name is "Critwire").

- **Step 2 · The account fixtures land in Step 2, not Step 3.** S9.2 needs a fresh user and S9.3 a fresh studio, so `signIn`, `seedUser` and `seedStudio` are worker fixtures now. They sign in on a throwaway request context and return a client that authenticates by header on a cookie-free one, so a new account's session cookie can never leak into the shared `anonymous` client.
- **Step 2 · An abuse report's `reason` is required and its `status` is indexed.** The form always asks for a reason, and the super-admin dashboard counts open reports.
- **Step 2 · The first user still gets a verification email.** Payload's first-register creates the user unverified (sending `verificationEmail`), then verifies them, which clears the token. That email's link lands on "This link has been used or is invalid. If you've already set your password, sign in", which is true for them. Accepted over detecting "no users yet" in the create hook, which would add a query to every signup for a one-time case.
- **Step 3 · Membership is checked before suspension.** A non-member gets the 400 membership error without the hook ever reading the target studio, so a write can't reveal whether another studio is suspended. A tenant ID that doesn't exist fails loudly (404) instead of passing.
- **Step 4 · P1 · Signed-in visitors can read public media files.** The plugin's `accessResultOverride` for `media` (`mediaFileReadOverride`) gives signed-in non-super-admins, on file reads only, `{ or: [<plugin result>, <the anonymous rule>] }`, or the anonymous rule when the plugin says `false`. Lists, REST documents and the admin keep the tenant constraint; suspension still hides files from everyone outside the studio.
- **Step 4 · `/unavailable` links to the home page,** like the 404 page, and still names no game and gives no reason. `src/access/anyone.ts` is deleted: media was its last user.
- **Step 5 · P8 · The image `srcSet` uses only the width-only sizes** (`thumbnail` to `xlarge`); `square` and `og` are crops, and a size Payload skipped has no URL and is left out.
- **Step 5 · P9 · The ignore files add `media` and keep `public/media`,** so leftover files never reach git or a Docker image.
- **Step 5 · The `<source>` has no `type`.** Uploads from before this step keep their sizes in the original format, so `type="image/webp"` would mislabel them; every supported browser decodes WebP, so the attribute bought nothing.
- **Step 5 · `ImageMedia`'s default `sizes` is `100vw`,** and the portal logo passes `36px`. The template's default (`(max-width: 640px) 1280w, …`) wasn't valid `sizes` syntax, so browsers already read it as `100vw`; with a real `srcSet` that would fetch a large size for a 36 px logo. `src/cssVariables.js` went with it (its only user).
- **Step 5 · `MEDIA_DIR` is marked `turbopackIgnore`.** Without it, Turbopack traced `process.cwd()/media` and copied every upload into `.next/standalone/media`.
- **Step 6 · P2 · The second E2E server doubles as the self-hosted profile.** Port 3102 serves the same build and database with the low limits (2 games, 1 MB, 3 public items), `CRITWIRE_OPEN_SIGNUP=''` and `EMAIL_OUTBOX_DIR=''`.
- **Step 6 · P11 · The limit hooks live beside the module,** in `src/lib/limits/hooks.ts`; the collections only register them.
- **Step 6 · A limit only counts writes into the user's own studio.** Payload runs collection `beforeChange` hooks before field hooks, so the limit hooks run before `enforceTenantWrite`. They skip a write into a studio the user doesn't belong to and leave it to that hook's 400, so a limit message never reveals another studio's counts (as with suspension in Step 3). A suspended studio at a limit gets the limit message rather than the suspension one; both refuse the write.
- **Step 6 · For Step 10: a one-studio user's first admin page must not be a create form.** The multi-tenant plugin picks the only studio on the server but sets the `payload-tenant` cookie in the browser, so a create view opened before any other admin page saves with "The following field is invalid: Assigned Tenant" (seen in S12.1's first run). S12.1 opens `/admin` first. Next-steps links from onboarding should go to the dashboard or a list view, or onboarding should set the cookie.
- **Step 6 · `secondApi` takes a role or an account** (`secondApi(studio.owner)`), not only `world`'s roles: S12.1 limits a fresh `seedStudio` studio, so it never fills `world`'s studios up to a limit.
- **Step 7 · A held draft stays held when it's published.** Payload's `originalDoc` for an update is the latest version, so a draft flagged for its text is published unchanged and isn't screened again; the owner can't clear the flag, so the published update stays held (S13.4).
- **Step 7 · The demo seed passes the filter.** None of `critterConnect.ts`'s strings is flagged, and its store links sit in link fields, which aren't screened, so the demo is never held.
- **Step 7 · `asStudioAdmin` is a shared fixture.** S12.1's setup (a seeded owner's admin, waiting for the studio cookie) now also serves S13.3.
- **Step 8 · The seed checks who owns `critter-connect` before any write,** the demo studio's creation included, so a refused run changes nothing.
- **Step 8 · The seed route returns its failure reason to the caller and logs it.** Before, the reason went only to Sentry and the script printed "Critter Connect seed failed", so the ownership refusal was invisible to the operator. Only a caller holding `CRON_SECRET` reaches that response.
- **Step 8 · The reserved-slug error is shared** (`reservedSlugError(collection, slug)` in `Issues/reservedSlug.ts`), and so is the tests' `fieldErrors` (`tests/e2e/support/api.ts`). S1.12's super-admin case deletes its game, because the slug is global and the home page links to it.
- **Step 9 · P4 · Onboarding lands before signup.** Until Step 11, onboarding's tests use users a super admin created without a studio.
- **Step 9 · P7 · Concurrency is tested by outcome.** S14.3 (one user, two submits: one studio, one game, one `/admin`) and S14.4 (two users, one name: `x` and `x-2`) hold whatever the interleaving. A slug retry logs a warning, and the Step 9 run hit it in both tests: S14.3's second submit retried on the slug, then failed on `createdBy` and went to `/admin`.
- **Step 9 · P12 · `createStudio` returns nothing.** A double submit is a `StudioExistsError` (the route redirects to `/admin`); the route then asks `findOnboardedProject(payload, userID)` for the slug and `flagged`.
- **Step 9 · The studio takes the game's name.** Its slug and the game's come from `uniqueSlug` (the report promotion's ASCII slugify), with the fallbacks `studio` and `game` for a name with no ASCII letters or digits.
- **Step 9 · Every failure lands on `/onboarding?error=1`.** That includes input Zod rejects and the `_verified` invariant. Unexpected errors still go to Sentry and the log; the user gets a page, not a bare 500. An unknown store host is `?error=store`. `KNOWN_STORE_NAMES` (in `links.ts`) is exported for Step 10's hint and error.
- **Step 9 · The `payload-tenant` cookie is left to Step 10.** Step 6 found that a create view opened before any other admin page saves without a studio. "Add your first update" links to `/admin/collections/patch-notes/create`, so Step 10 must make that work: set the cookie, or link through the dashboard.
- **Step 10 · P5 · Account pages reuse the portal's form components.** `AccountPage` is the shell; `FormField`, `FormNotice` and the `fs-form`/`fs-input` classes read Critwire's palette through `--fs-*` tokens set on `.cw-account` in `marketing.css`, not copies of their rules. Controls and buttons are at least 44 px tall (checked at 390 and 1440 px: inputs 46.8 px, the button 44 px).
- **Step 10 · P3 · `/onboarding` renders per request** (it reads the session through `headers()`).
- **Step 10 · Onboarding selects the new studio.** `POST /onboarding/submit` sets `payload-tenant` to the new studio on its redirect (the plugin's own cookie: path `/`, a year, not HttpOnly, so the plugin can still change it). So "Add your first update" opens a create form that saves into the studio, in the browser that onboarded. Chosen over linking through the dashboard, which would add a click to every new studio's first update. `findOnboardedProject` now also returns the studio's ID.
- **Step 10 · `/onboarding?held=1` shows to a user who has a studio.** The route lands there right after creating one, so the held notice comes before the "has a studio → `/admin`" redirect. It says only that the portal waits for review and links to the admin.
- **Step 10 · The error square is the one colour beyond ink on account pages** (`#c0262d`); the success dot is ink. Neither carries text, so the palette stays ink on paper.

## Log

- 2026-09-30 09:45 UTC · Baseline: created the E2E database, migrated; tsc, lint (0 errors, 20 warnings), int (13/13) and E2E (75/75) pass.
- 2026-09-30 10:13 UTC · Architecture: `architect` wrote 10 findings (incl. draft updates skipping the tenant check, scriptable SVG uploads, the demo slug) and the target design; added handoff H8 (terms/AUP, blocks nothing). Docs-only, no checks needed.
- 2026-09-30 10:20 UTC · Fable review: APPROVE_WITH_CHANGES; 2 MUST-FIX (users can self-set `_verified`; email changes skip re-verification), plus 4 missed items and 5 suggestions. Docs-only, no checks needed.
- 2026-09-30 10:21 UTC · Astra review: APPROVE_WITH_CHANGES; 5 MUST-FIX (2 overlap Fable: self-set `_verified`, email change; new: signup retry overwrites a pending password, `public/media` bypasses suspension, forgot-password lacks rate limit/Turnstile) and 5 suggestions. Docs-only, no checks needed.
- 2026-09-30 10:43 UTC · Revision: `architect` resolved all 7 MUST-FIX items (Fable 1–2, Astra 1–5): `_verified` and `email` super-admin-only; password moves from `/signup` to the verify form (no credential replacement without inbox proof); media moves out of `public/` and the Next image optimizer is off (new F11); forgot-password goes through a guarded route and REST/GraphQL `forgotPassword` is refused (new F12). Adopted 8 suggestions, declined 2 with reasons. No new handoff items. Docs-only, no checks needed.
- 2026-09-30 11:05 UTC · Steps: `planner` wrote 18 steps in dependency order (hole-closing steps write their tests first; onboarding before signup; a second E2E server doubling as the self-hosted profile) and the Verification mapping each DoD item to a named test; 12 planner decisions (P1–P12) to be copied into Decisions by the step that applies them. Docs-only, no checks needed.
- 2026-09-30 11:14 UTC · Step 1: `src/lib/email/` (Resend-or-outbox adapter, `renderEmail`, `AuthLinkEmail`, the three auth emails), `email: emailAdapter()` in the config, contact job via `payload.sendEmail`. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 75/75 in 4.1 min (contact job still fails without `RESEND_API_KEY`); no `api.resend.com` left in `src`; rendered the three emails by hand: links use `NEXT_PUBLIC_SERVER_URL` and encode the token.
- 2026-09-30 11:26 UTC · Step 2: migration `open_signup` (tenants `suspended`/`createdBy`, `flagged`/`flagReasons` on games and updates incl. versions, `abuse-reports`, `auth.verify` with the `_verified` backfill); `_verified`/`email` and the platform fields are super-admin-only; super-admin-created users start verified. Backfill check: a pre-existing user read `t` after migrating, then deleted. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 81/81 in 4.3 min, incl. `accounts.spec.ts` S9.1–S9.4.
- 2026-09-30 11:31 UTC · Step 3: `enforceTenantWrite` (`src/access/tenantWrite.ts`) replaces `validateTenantMembership` as a `beforeChange` hook on the tenant field, so membership is checked on draft saves too (F1) and a suspended studio's members get a 403 on every create and update. Before the fix: S1.11 create-draft got 201 and move-draft got 200 (expected 400); S10.1 got 201 on a game create (expected 403). tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 84/84 in 4.3 min, incl. S1.11 and `suspension.spec.ts` S10.1.
- 2026-09-30 11:45 UTC · Step 4: anonymous reads from `src/access/publicRead.ts` (held games and updates, suspended studios' games, updates, items and media leave the public site via `tenant.suspended`/`gameProject.flagged` paths), `mediaFileReadOverride` (P1), `requirePortalProject` on the layout and all 8 portal pages (held or suspended → `/unavailable`, unknown → 404), static noindex `/unavailable`, Tenants `revalidateSuspension`. Before the fix: S10.2 got 403 for studio B's owner on `/api/media/file/s102-banner.png` (expected 200). tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 88/88 in 4.6 min, incl. S10.2, S10.3, S13.1, S13.2 and S2.1's 404; build lists `/unavailable` as static.
- 2026-09-30 12:05 UTC · Step 5: media is raster-only (`mimeTypes`), stored in `media/` (`src/lib/media/storage.ts`, boot refuses a non-empty `public/media`), served only by `/api/media/file/` with `Cache-Control: private, max-age=300`; image optimizer off, `ImageMedia` adds a `<source srcSet>` of Payload's WebP sizes; `VideoMedia` removed; Dockerfile/compose get a `media` dir and volume (read, not run: no Docker here). Moved this worktree's 24 leftover uploads to `media/`. Before the fix: S11.1 SVG upload got 201 (expected 400); S11.2 `/_next/image?…&q=100` got 200 (expected 404) and the upload wasn't in `media/`; S11.3 had no `Cache-Control`. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 93/93 in 5.1 min, incl. `media.spec.ts` S11.1–S11.5 and S2.6; boot check with `public/media/leftover.png` printed `exit 1` and the `mv` command.
- 2026-09-30 12:24 UTC · Step 6: `src/lib/limits/` (`getLimits`, off unless a positive whole number, checked at boot; one count and one assert per limit; `LimitReachedError` 403) and its hooks on GameProjects, Media and Issues, for studio users writing into their own studio; auto-publish leaves a submission `NEW` at the limit. E2E gets a second server on 3102 (same build and DB, limits 2/1/3, signup and outbox off). tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 95/95 in 5.6 min wall, peak used memory 4.6 GB (idle 1.5 GB), incl. `limits.spec.ts` S12.1 (REST messages, admin toast, player submission stays `NEW`, super admin exempt) and S12.2; boot with `CRITWIRE_LIMIT_GAMES_PER_STUDIO=three` printed `exit 1` naming the variable. First run failed only S12.1's toast (no studio selected on a direct create URL; see Decisions).
- 2026-09-30 12:33 UTC · Step 7: `screenTextHook(textOf)` (`src/hooks/screenText.ts`) screens on create or when the merged text changes; replaces `screenReportText` (deleted) and now also screens game name and pitch, and an update's title, version label, summary and content plain text. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 98/98 in 5.9 min, incl. `screening.spec.ts` S13.3–S13.5 (held game shown read-only to the owner, approved by a super admin in the admin, kept approved on an unchanged save; held update incl. a flagged draft published; "3 links") and S5.11 unchanged. First run failed only S13.3: the super admin's untick landed before the admin hydrated, so the test now waits for the reasons field to hide.
- 2026-09-30 12:51 UTC · Step 8: `isReservedGameSlug` reserves `critter-connect` (`DEMO_GAME_SLUG` in `links.ts`) through `gameSlugify` and `rejectReservedGameSlug`, for every write but a super admin's or a seed's; the seed finds or creates `critwire-demo`, refuses a demo owned by another studio before any write, and the seed route now returns and logs its failure reason; the screenshot setup no longer creates `demo-studio`. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 99/99 in 5.9 min, incl. `tenant-isolation.spec.ts` S1.12 and S5.7 unchanged. Seed check on the mission database (a `next start` of the E2E build on 3100): two runs exit 0 and the game's tenant is `critwire-demo`; with the game moved to another tenant the run exits 1 with the ownership message; moved back, a third run exits 0; no `dev` row (the script calls the route, so nothing dev-pushes).
- 2026-09-30 13:09 UTC · Step 9: `isOpenSignup()` (boot-checked), `uniqueSlug` (the report promotion now uses it), `storeLinkKey`, `withTransaction`, `createStudio` (studio, owner membership and game in one transaction, the game created as the new owner; slug races retried up to 3 attempts; `createdBy` race → `StudioExistsError`), `findOnboardedProject`, `nextSteps`, `POST /onboarding/submit`; E2E server gets `CRITWIRE_OPEN_SIGNUP=1`. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 105/105 in 6.1 min, incl. `onboarding.spec.ts` S14.1–S14.6 and S5.7 unchanged; both races took the retry path (logged). Boot with `CRITWIRE_OPEN_SIGNUP=yes` printed `exit 1` naming the variable.
- 2026-09-30 13:31 UTC · Step 10: `AccountPage` shell and `.cw-account` tokens (P5), `/onboarding` (per request, noindex; sign-in redirect, studio → `/admin`, `?error=1`, `?error=store` listing the stores, `?held=1`), `WelcomePanel` on the hub in `<Suspense>` (the three next steps, the absolute link with Copy); the submit route now sets `payload-tenant` to the new studio. tsc pass; lint 0 errors, 20 warnings (none in touched files); E2E 107/107 in 6.2 min, incl. S14.7 (browser sign-in and onboarding, panel links, clipboard, the studio cookie, anonymous hub without the panel) and S14.8 (sign-in round trip, error and held states, owner → `/admin`, 404 on the second server). First run failed only S14.8: Next's route announcer is a second `alert`, so the check is scoped to `main`. Checked by hand: screenshots of `/onboarding?error=store` and the welcome panel at 390 and 1440 px.

## Summary
