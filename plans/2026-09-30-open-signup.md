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
- [ ] Steps: `planner` writes Steps and Verification

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

## Verification

## Decisions

## Log

- 2026-09-30 09:45 UTC · Baseline: created the E2E database, migrated; tsc, lint (0 errors, 20 warnings), int (13/13) and E2E (75/75) pass.
- 2026-09-30 10:13 UTC · Architecture: `architect` wrote 10 findings (incl. draft updates skipping the tenant check, scriptable SVG uploads, the demo slug) and the target design; added handoff H8 (terms/AUP, blocks nothing). Docs-only, no checks needed.
- 2026-09-30 10:20 UTC · Fable review: APPROVE_WITH_CHANGES; 2 MUST-FIX (users can self-set `_verified`; email changes skip re-verification), plus 4 missed items and 5 suggestions. Docs-only, no checks needed.
- 2026-09-30 10:21 UTC · Astra review: APPROVE_WITH_CHANGES; 5 MUST-FIX (2 overlap Fable: self-set `_verified`, email change; new: signup retry overwrites a pending password, `public/media` bypasses suspension, forgot-password lacks rate limit/Turnstile) and 5 suggestions. Docs-only, no checks needed.
- 2026-09-30 10:43 UTC · Revision: `architect` resolved all 7 MUST-FIX items (Fable 1–2, Astra 1–5): `_verified` and `email` super-admin-only; password moves from `/signup` to the verify form (no credential replacement without inbox proof); media moves out of `public/` and the Next image optimizer is off (new F11); forgot-password goes through a guarded route and REST/GraphQL `forgotPassword` is refused (new F12). Adopted 8 suggestions, declined 2 with reasons. No new handoff items. Docs-only, no checks needed.

## Summary
