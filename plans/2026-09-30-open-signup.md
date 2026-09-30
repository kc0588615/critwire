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
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
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

Checked against the code at `27d23a3` and against Payload 3.85.2's own source in `node_modules`. Paths under `payload/dist/…`, `plugin-multi-tenant/dist/…` and similar are that source.

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
  - Payload applies `read`'s `Where` to media files too (`uploads/checkFileAccess.js`).
  - `not_equals: true` also matches `NULL` (`drizzle/queries/parseParams.js:225-227`), so an unset flag counts as "not held".
- **Fix:** §7 and §8.

**F4 · Self-service accounts: creation is closed and there's no email verification.**
- **Where:** users and tenants can only be created by a super admin (`Users/index.ts:10`, `Tenants/index.ts:13`), and only a super admin can assign memberships (`plugins/index.ts:50-56`). Users are `auth: true` without `verify` (`Users/index.ts:27`).
- **Payload facts the design depends on:**
  - With `auth.verify`, login refuses `_verified === false` (`auth/operations/login.js:184`). But `resetPassword` signs the user in without checking it (`auth/operations/resetPassword.js:64-110`). A session therefore doesn't prove the email was verified, so onboarding must check `_verified` itself.
  - `create` sends a verification email for every new user, whoever creates it (`collections/operations/create.js:228-243`). Users a super admin creates (in the admin, and in `tests/e2e/auth.setup.ts:46-53`) would start unverified and be locked out. First-register already verifies (`auth/operations/registerFirstUser.js:43-49`).
  - Existing rows need `_verified = true` when `verify` is turned on.
- **Already right:** the plugin's access wrapper suits self-service users. A user without a studio gets `false` on every studio collection and reads only their own user (`plugin-multi-tenant/dist/utilities/withTenantAccess.js`).
- **Fix:** keep user and tenant creation over REST/GraphQL super-admin-only, and open it only through the two guarded routes (§5, §6).

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
- **Fix:** auto-publish asks the limit first, and leaves the submission waiting at the limit (§11).

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
/signup (email, password, Turnstile) --POST /signup/submit--> user (unverified) + verification email
   -> /signup?submitted=1  "Check your inbox"
email link -> /verify/<token> (verifies) -> "Email confirmed" -> /admin/login?redirect=/onboarding (Payload)
/onboarding (game name, website, store?) --POST /onboarding/submit--> one transaction:
   tenant (createdBy = user) + membership (owner) + game (created as the user)
   -> 303 /g/<slug>?welcome=1 (live hub + next-steps panel), or /onboarding?held=1
```

- **Why the user comes first:** the verification token lives on the user, so the user has to exist before verification.
- **Why the studio and game come after:** unverified accounts own nothing. There's nothing to hide, no slug squatting, and no clean-up job. This also follows the Goal's order: sign up, verify, then enter the three things.
- **Why there's a sign-in step:** Payload won't give a session without the password. Minting one ourselves would mean reimplementing auth.

#### 2. Data model: one migration, `open_signup`

- **users:**
  - `auth.verify` adds `_verified` and `_verificationToken`.
  - The migration backfills `_verified = true` for existing users.
- **tenants:**
  - `suspended`: checkbox, default false, indexed. Create and update are super-admin-only; members can read it, so their admin can tell them.
  - `createdBy`: relationship to users, `unique`, create/read/update super-admin-only. Onboarding sets it; it stays `NULL` for studios a super admin makes. The unique index makes onboarding idempotent: a double submit fails its second insert instead of leaving an orphan studio.
- **game-projects and patch-notes (patch-notes' versions table too):**
  - `flagged` (checkbox, default false, indexed) and `flagReasons` (textarea).
  - Both are read-only in the admin, and create/update is super-admin-only.
  - Field access is applied in `beforeValidate`, before collection hooks, so the screening hook can set them in `beforeChange` while studios can't clear them.
- **abuse-reports (new; platform-level, not in the multi-tenant plugin):**
  - Fields:
    - `pageUrl`: text, required.
    - `gameProject`: relationship, optional.
    - `reason`: select (spam, scam or phishing, offensive, impersonation or copyright, other).
    - `details`: textarea.
    - `reporterEmail`: email, optional.
    - `status`: select (open, resolved, dismissed), default open.
    - timestamps.
  - Access: super admin only for everything, and `admin.hidden` for everyone else, as for `IssueVotes` and `jobs`. Only the report route creates them, through the Local API.
- **media:** no schema change; `mimeTypes` is config.
- **After the schema changes:** regenerate types and the import map, and generate the migration with `migrate:create`, plus the `_verified` backfill.

#### 3. Email

`src/lib/email/adapter.ts` exports `emailAdapter()` (for `payload.config.ts`'s `email`) and `isEmailDeliverable()`.

- **With `RESEND_API_KEY`:** the official `@payloadcms/email-resend` adapter, pinned to 3.85.2, sending from `RESEND_FROM_EMAIL`.
- **Without it, an outbox adapter that never sends:**
  - It logs `to` and `subject`. Outside production it also logs the HTML, so a developer can click the link; tokens never reach production logs.
  - When `EMAIL_OUTBOX_DIR` is set, it also writes each message there as a JSON file, creating the directory if needed. The E2E harness sets it and reads it. Nothing else is test-specific.
- **`isEmailDeliverable()`** is true when Resend is configured, when not in production, or when `EMAIL_OUTBOX_DIR` is set.
  - Signup refuses when it's false (production without Resend), the way forms refuse without Turnstile.
  - Super admins can still create users without Resend, because the outbox adapter never throws.
- **One template, `AuthLinkEmail`** (heading, one sentence, a button and the plain link), rendered by `renderAuthLinkEmail`. It backs:
  - `Users.auth.verify.generateEmailHTML` and `generateEmailSubject`, with the link `${getServerSideURL()}/verify/<token>`;
  - `auth.forgotPassword.generateEmailHTML` and `generateEmailSubject`, with the link `${getServerSideURL()}/admin/reset/<token>` (Payload's reset view);
  - the signup route's resend (§5).

  Links never come from the request's host (F5).
- **The contact job** sends through `req.payload.sendEmail`. It keeps its explicit "`RESEND_API_KEY` unset → throw" rule, so a contact email never lands in a log counted as delivered, and failed jobs are still retried.

#### 4. Accounts and sign-in: Payload's built-ins, styled

- **`Users.auth`:** the `verify` and `forgotPassword` templates above; Payload's defaults otherwise, including lockout after 5 failed logins.
- **A Users `beforeChange` hook on create:** a user a super admin creates gets `_verified: true`.
  - The super admin vouches for them.
  - `auth.setup.ts` keeps working unchanged.
  - The admin never needs its hidden `_verified` toggle.
  - Payload still emails them a harmless confirmation link; that's accepted.
- **Sign-in, forgot and reset:** Payload's admin views `/admin/login`, `/admin/forgot` and `/admin/reset/<token>`, which the brief allows. Styled to match through:
  - `admin.components.graphics.Logo` and `Icon`: the Critwire wordmark;
  - `admin.meta`: title suffix and favicon;
  - `custom.scss`: the auth views;
  - `BeforeLogin`: "New to Critwire? Create your portal", when signup is open.

  The login view's `?redirect=` sends the user back to onboarding; Payload's `getSafeRedirect` accepts `/onboarding`.
- **`/verify/[token]`** (in `(frontend)`, dynamic, `noindex`) calls `payload.verifyEmail` while rendering, as Payload's own admin verify view does.
  - On success: "Email confirmed. Sign in to set up your portal", linking to `/admin/login?redirect=%2Fonboarding`.
  - On failure: "This link has been used or is invalid. If you've already confirmed, sign in."
  - The GET having a side effect is intended: a mail scanner that opens the link does what the user wanted.

#### 5. Signup: `/signup` and `POST /signup/submit`

- **Availability:** both 404 unless `CRITWIRE_OPEN_SIGNUP=1` (§10).
- **Shape:** a plain form and a route handler, the project's public-form shape.
  - `guardPublicForm` validates `{ email, password (8-128) }`, checks Turnstile, and rate-limits by IP: key `signup`, 5 per hour.
  - Then a per-address limit, `checkRateLimit({ key: 'signup-email', identifier: <sha256 of the lower-cased email>, limit: 3, windowSeconds: 3600 })`. Nobody can flood someone's inbox from many IPs.
- **Refusal:** when `!isEmailDeliverable()`, the route answers 500 with a generic message and reports to Sentry.
- **By case:**
  - **New address:** `payload.create({ collection: 'users', data: { email, password }, overrideAccess: true })`. Only those two fields go in, so `roles` stays `['user']` and `tenants` stays empty. Payload sends the verification email inside the create's transaction, so a failed send rolls the user back.
  - **Existing, unverified:** set the submitted password, rotate `_verificationToken` (Local API, `overrideAccess`) and send a new link. It's the only way to get a new link. It also defeats pre-registering someone else's address: only the inbox owner can verify, and the latest password submitted wins.
  - **Existing, verified:** send nothing.
- **One outcome page:** every case redirects to `/signup?submitted=1` ("Check your inbox"), so the form doesn't reveal which addresses have accounts. The page links to sign-in and to "Forgot password?".
- **REST:** `POST /api/users` and `POST /api/tenants` stay super-admin-only.

#### 6. Onboarding: `/onboarding` and `POST /onboarding/submit`

- **Availability:** both 404 unless signup is open.
- **Authentication:** `payload.auth({ headers })`, which accepts the session cookie and the E2E's `JWT` header.
  - No user: redirect to `/admin/login?redirect=/onboarding`.
  - `_verified !== true` (a session from a password reset, F4): 403, "Confirm your email first. Sign up again with the same address for a new link."
  - The user already has a studio: redirect to `/admin`.
- **Input (Zod over `readRequestBody`):**
  - `name`: 1-80 characters.
  - `website`: an http(s) URL, required.
  - `store`: optional. It maps to a link field by host through one new pure function beside `STORE_LINK_KEYS`, `storeLinkKey(url)`, which knows Steam, itch.io, Epic, GOG, PlayStation, Xbox and Nintendo. An unknown host is a form error listing those stores; others can be added in the admin later. `resolvePrimaryStoreUrl` then makes the store "Get the game" with no change.
- **`createStudio({ user, input })`** (`src/lib/onboarding/createStudio.ts`, the one command) runs in one transaction, using `createLocalReq`, `initTransaction`, `commitTransaction` and `killTransaction` (all exported by `payload`):
  1. **Create the tenant** with `overrideAccess`: name = the game name, slug = `uniqueSlug(name)` checked against tenants, `createdBy = user.id`.
  2. **Add the membership:** set `user.tenants = [{ tenant, roles: ['owner'] }]` with `overrideAccess`. The plugin's array field stays super-admin-only.
  3. **Create the game as the user:** set `req.user` to the updated user and create the game with `overrideAccess: false`.
     - Every studio rule then applies exactly as in the admin: the plugin's access, the tenant-write hook, the reserved slug, the games limit and screening.
     - The data: name; `slug = uniqueSlug(name)` checked against game projects, with reserved slugs counted as taken; `links.website`; the store link; `reportForm.acceptIdeas: false`.
     - Passing a slug explicitly also stops Payload regenerating it later (`fields/baseFields/slug/generateSlug.js`).
  - A unique violation on `createdBy` (a double submit) redirects to `/admin`.
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
  | media | `tenant.suspended` not true (file serving applies this too) |

  These are relationship paths in a Payload `Where`, so there are no copied flags to keep in sync.
- **Unchanged:**
  - Users read and update only themselves; studio users read only their own tenants.
  - Roles, memberships, `suspended`, `createdBy` and `flagged` are super-admin fields.
  - Submissions and votes are never public.
- **Demo (F8):**
  - `isReservedGameSlug` reserves the home page's demo slug (from `links.ts`). A game-project write by a non-super-admin user can't use it, following the issues' `issueSlugify` and `rejectReservedSlug` pattern, and onboarding's `uniqueSlug` counts it as taken. Seeds (no user) and super admins may use it.
  - `seedCritterConnect` finds or creates the tenant with slug `critwire-demo`, and throws if `critter-connect` already belongs to another tenant.

#### 8. Portal availability

- **`getGameProject(slug)` doesn't change:** it's an anonymous read, so held and suspended portals come back `null`.
- **Added beside it:**
  - `portalExists(slug)`: a privileged `count` that returns only a boolean, the same pattern as `getContactRoute`.
  - `requirePortalProject(slug)`: returns the project. Otherwise, if `portalExists`, it calls `redirect('/unavailable')`; if not, `notFound()`.
- **Where it's used:** the layout and every portal page call `requirePortalProject` instead of `getGameProject` + `notFound()` (F3, DRY). Route handlers that return a `Response` (RSS and both submit routes) keep `getGameProject` and answer 404.
- **Why every segment:** the redirect is decided wherever a segment renders, so it also holds on client-side navigation. A layout-only gate wouldn't, because Next re-renders pages without re-running a shared layout.
- **`/unavailable`** (in `(public)`, static, default theme, `noindex`): "This portal is unavailable." No name and no reason; held and suspended portals share it, so it doesn't say which.
- **Revalidation:**
  - A Tenants `afterChange` hook calls `revalidateGamePortal` when `suspended` changes.
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
  - `1` turns on signup, onboarding, the home page's call to action and the portal's "Report this page" link.
  - Unset or empty turns all of them off. That's the self-hosted default.
  - Any other value stops the server at boot (`checkEnvironment`).
- **Suspension:**
  - The portal redirects to `/unavailable`. Its updates, items, media and votes also disappear from REST and the vote route.
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
- **The messages:**
  - "Your studio has reached its limit of 3 games on the hosted plan."
  - "This upload would take your studio past its 100 MB of media."
  - "This game has reached 200 public feedback items. Make older items private or delete them to add more."
- **Auto-publish (F7):** `autoPublishReport` asks `hasPublicFeedbackRoom`, which uses the same count, and leaves a submission `NEW` at the limit. The player's POST never fails; a studio that publishes it in the admin gets the message.
- **Counting** uses the Local API with `req` (the same transaction), so no raw Drizzle is needed. Two concurrent writes can pass a limit by one; that's accepted for soft plan limits.
- **The admin only explains:** the dashboard lists the active limits.

#### 12. Abuse reports

- **The link:** `PortalFooter` shows "Report this page" (to `/report-abuse?page=/g/<slug>`) when signup is open. The flag is read at render time, and portal pages render at runtime.
- **The form:** `/report-abuse` (in `(frontend)`, `noindex`, 404 when signup is off) names the portal being reported and asks for a reason, details and an optional email, with Turnstile.
- **The submit route:** `POST /report-abuse/submit`
  1. runs `guardPublicForm`, with key `abuse-report` and 5 per 10 minutes;
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
    | Turnstile and Upstash | required in production for public forms, votes, signup and abuse reports |
    | Resend | optional |
    | R2 | optional (local disk otherwise) |
    | Sentry | optional |

  - **Without Resend:** contact-by-email jobs fail and wait for a retry, signup refuses, and password-reset emails aren't delivered, so a super admin sets passwords in the admin.
  - **The first super admin:** the first-user form at `/admin`, choosing Super Admin. Users a super admin creates are verified automatically.
  - **Defaults:** `CRITWIRE_OPEN_SIGNUP` and the limits are all off.
- **Updated docs:**
  - `AGENTS.md`: a docs-map row, and a Phase 8 sequencing rule that reflects the owner's decision.
  - `docs/features.md`: user verification, Hosting, and Phase 8 without invites.
  - `docs/architecture.md`: the new URLs (`/signup`, `/verify/<token>`, `/onboarding`, `/report-abuse`, `/unavailable`) and their rendering.
  - `docs/patterns.md`: the tenant-write hook, public reads, `requirePortalProject`, the screening hook, and limits.
  - `docs/integrations.md`: the Resend adapter and the new env vars.
  - `docs/deploy.md`: the first-run bootstrap.
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
- **New fixtures:**
  - `readEmail(to)` polls the outbox for the newest message to an address. Every run uses random addresses.
  - `signUpStudio(playwright, name)` signs up, verifies, signs in and onboards over HTTP, with `TURNSTILE_DUMMY_TOKEN`. It returns `{ token, tenantID, project }`.
  - `limitsApi(role)` is a `RestClient` for port 3102.

**New tests, by Definition-of-done item.**

| Definition-of-done item | Test | Server |
|---|---|---|
| The whole signup flow | In the browser: `/signup`, "Check your inbox", the link from the outbox, "Email confirmed", `/admin/login?redirect=/onboarding`, onboarding, then `/g/<slug>?welcome=1` shows the game's name and the next steps. An anonymous context sees the hub. | 3100 |
| Sign-in and password reset for these users | Sign out, then back in at `/admin/login`. `/admin/forgot`, the email in the outbox, `/admin/reset/<token>`, then signed in with the new password. | 3100 |
| An unverified account's portal isn't public | An unverified signup's login is refused ("verify"). `/onboarding` redirects to sign-in. A session from a password reset is refused by `/onboarding/submit` (403). The slug the game would have had answers 404. | 3100 |
| A second signed-up user can't read or write the first's studio | Two `signUpStudio`s. B's lists hold none of A's projects, updates (drafts included), items, submissions, media, folders, users or tenants. B's `PATCH` and `DELETE` on A's documents are refused. B's creates with `tenant: A` are refused, **including a draft update (F1)**. A's project edit URL in the admin shows B nothing. | 3100 |
| Each limit blocks, with a message | A fresh studio. The third game gets a 403 with the message, and saving it in the admin shows the toast. A 1.5 MB noise PNG (generated with `sharp`) gets a 403. The fourth public item gets a 403. A player's submission to a review-off game at the limit stays `NEW`, and the player sees the normal confirmation. | 3102 |
| Nothing is blocked when limits are unset | The same actions all succeed: 3 games, the 1.5 MB PNG, 4 public items. | 3100 |
| A suspended studio's portal and publishing | A super admin suspends the studio. The hub and item pages land on `/unavailable` with none of the game's text. Anonymous REST, the vote route and both submit routes find nothing. The owner's create and update, drafts included, get the 403 message. The dashboard shows the banner. Unsuspending brings the hub back (revalidation). | 3100 |
| The report-this-page flow | Footer link, form, submitted. The super admin sees the report with its game. `GET /api/abuse-reports` is 403 for studio users and anonymous visitors. | 3100 |

**Other new tests:**
- A held game name (a word from the filter's dataset) shows `/unavailable` until a super admin unticks `flagged`.
- A held update is missing from the feed and RSS until it's approved.
- An SVG upload is refused (F2).
- The home page's call to action links to `/signup`.
- `POST /signup/submit` without a Turnstile token gets a 400.

**Screenshots.** A new `signup` group in the screenshot harness captures `/signup`, `/signup?submitted=1`, `/verify/<token>`, `/onboarding` and `/g/<slug>?welcome=1`, plus the existing `/`, at 1440 and 390 px. They go into `/srv/critter-ai/agent-state/missions/open-signup/screenshots/` with an `index.html`. Opening a verification link consumes it, so setup creates one unverified user per width.

### Rejected alternatives

- **Create the user, studio and game before verification and hide them until verified:** unverified strangers could squat slugs, it would need a clean-up job, and Payload won't give them a session anyway.
- **Open `POST /api/users` and `POST /api/tenants` to anonymous callers:** it bypasses Turnstile and the rate limits, and exposes field-level roles to anonymous writes.
- **Our own verification tokens, sessions or sign-in pages:** they reimplement Payload's auth, and the brief allows its admin views.
- **Minting a session after verification to skip the sign-in step:** hand-rolled auth.
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

- **Verify, then sign in, then onboard.** Only a verified, signed-in user creates a studio and game (§1).
- **`CRITWIRE_OPEN_SIGNUP` gates signup, onboarding, the call to action and "Report this page", and is off by default.** The hosted instance sets it.
- **Hosted limits:** 3 games per studio, 100 MB of uploads per studio (originals, in MiB), and 200 public feedback items per game.
- **Games created at signup start with ideas off.** That matches the brief's "turn on ideas" next step and gives new accounts a smaller public surface. `reviewSubmissions` stays on.
- **Suspended studios can still delete, but can't create or update anything.** Held and suspended portals share one neutral `/unavailable` page.
- **Screening covers the game name, the pitch and the visible text of updates (the brief's list), with the filter unchanged.** Link targets in rich text and studio-written feedback items aren't screened; "Report this page" and suspension cover them.
- **Users a super admin creates are verified automatically.**
- **The owner's open-signup decision supersedes `AGENTS.md`'s Phase 8 sequencing rule, and the docs change to match.** Invites stay out of scope.

### Open questions for the owner

- **H8 (added to `/srv/critter-ai/handoff/critwire.md`), blocks nothing:** Terms of service and an acceptable-use policy for hosted signup. Hosting strangers' portals usually needs both, linked from `/signup`. It's a legal call only the owner can make, and the mission ships without them.
- **H3 stays `later`:** production signup needs `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (on a domain verified in Resend) as well as H3's Turnstile and Upstash keys, all before deploy. Not asked again now.

**Production environment variables (names only):**
- New: `CRITWIRE_OPEN_SIGNUP`, `CRITWIRE_LIMIT_GAMES_PER_STUDIO`, `CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO`, `CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME`.
- Needed for signup: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- The existing ones stay as they are.
- `EMAIL_OUTBOX_DIR` is for tests and development only.

### Risks

- **The redirect from a cached portal page:** a `redirect()` in an ISR page has to be cached and revalidated like the page itself. The suspension test checks both suspending and unsuspending.
- **The second E2E server:** it adds about 1 GB of memory on an 11 GiB machine. If the two processes' job crons collide on contact jobs, turn off `jobs.shouldAutoRun` for the second one.
- **The link-count rule:** it can hold updates with many links. The reasons say why, and a super admin approves them.

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

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-09-30 09:45 UTC · Baseline: created the E2E database, migrated; tsc, lint (0 errors, 20 warnings), int (13/13) and E2E (75/75) pass.
- 2026-09-30 10:13 UTC · Architecture: `architect` wrote 10 findings (incl. draft updates skipping the tenant check, scriptable SVG uploads, the demo slug) and the target design; added handoff H8 (terms/AUP, blocks nothing). Docs-only, no checks needed.
- 2026-09-30 10:20 UTC · Fable review: APPROVE_WITH_CHANGES; 2 MUST-FIX (users can self-set `_verified`; email changes skip re-verification), plus 4 missed items and 5 suggestions. Docs-only, no checks needed.

## Summary
