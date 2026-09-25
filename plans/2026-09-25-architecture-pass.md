---
mission: architecture-pass
project: critwire
branch: agent/architecture-pass
status: active
started: 2026-09-25 06:21 UTC
---

# Mission: critwire architecture and test-quality pass

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Leave critwire measurably cleaner and better tested, with no change in product behavior (except real bugs, which get fixed and listed):

1. **E2E coverage of the core flows.** Replace the stale Payload-template E2E suite with Playwright tests for critwire's real behavior. Every run leaves a verifiable, repeatable artifact.
2. **Low-signal tests gone.** Every test in `tests/int`, and each script in `tests/manual`, is audited. Each one that wouldn't catch a real bug the new E2E suite misses is deleted.
3. **Cleaner code.** The architect's findings against the owner's engineering standards (in `~/AGENTS.md`) are fixed where they matter.
4. **The testing rules are in critwire's own `AGENTS.md`**, so agents on every machine, not just this VPS, stop writing low-signal unit tests.

### Why

A stronger model (Opus 5.5) should raise the baseline before feature work continues. Tests should prove the product works for real users, not restate the implementation.

### Scope

In:
- New Playwright E2E tests for the core flows, derived from `docs/features.md` and `AGENTS.md`: tenant isolation (one studio can never see or change another's data), the public game portal pages, patch notes (list, detail, RSS feed), the public issue tracker with player voting, issue reports, the contact form, and admin issue triage including the kanban. The `tests/manual/verify-*.mjs` scripts show what each build phase was meant to guarantee; turn what matters into E2E scenarios.
- The E2E harness itself: make it reliable and reasonably fast on this 2-CPU VPS (see Notes), and make every run leave the artifact.
- The test audit: fan it out across parallel subagents, for example one per test file. For each test record keep or delete, with a one-line reason. When a test guards real behavior the E2E suite doesn't cover, add the E2E scenario first and then delete the test; keep it only when E2E genuinely can't reach that behavior, and say why.
- Refactors that fix the architect's findings: real violations of the principles, or real bugs, anywhere in `src/`.
- Adding to critwire's `AGENTS.md`, under a **Testing** heading:
  - Never write unit tests after you write code.
  - Highly prefer E2E tests as the sole testing mechanism. Use them to verify complex features work. At the end of E2E tests, produce a verifiable and repeatable artifact.
  - If you must test a system in isolation, first write down all the ways it could fail, then write the code.

Out:
- New features, and the open plans in `plans/` (Tally/issues kanban remediation, template-first generated sites): don't implement them.
- Custom domains and billing (phases 8 and 9).
- Database schema changes, unless a finding needs one to fix a real bug; then add a Payload migration.
- Dependency upgrades, unless a fix needs one.
- The local-development instructions in critwire's `AGENTS.md` (WSL, Docker Desktop). They describe the owner's own machine, not this VPS; leave them as they are.

### Definition of done

- Every stage and step in the plan is checked, or explicitly deferred with a reason.
- On the final commit, all of these pass: `pnpm exec tsc --noEmit`, `pnpm lint`, the full E2E suite, and `pnpm build`.
- The final E2E run's artifact (the Playwright HTML report, with a trace or screenshots for each core flow) is saved under `/srv/critter-ai/agent-state/missions/architecture-pass/`, and the plan records that path and the exact command that reproduces the run.
- The plan's Summary lists what changed and why, every deleted test with its reason, E2E coverage before and after, both review verdicts, bugs found and fixed, and anything left for the owner.
- Branch `agent/architecture-pass` is pushed. Don't merge it.

### Decision rules

- Build the E2E coverage before deleting tests: deleting first would remove the only coverage there is.
- Prefer the smallest change that fixes a real problem. Don't refactor working, clear code just to match a pattern.
- Behavior must not change. When a finding is a real bug, fix it and list it under Decisions.
- Follow critwire's `AGENTS.md` rules: Payload conventions, tenant scoping through the multi-tenant plugin, Zod at public boundaries, revalidation after writes, access control on every collection. Its "stop after each phase and wait for confirmation" rule is about feature phases and doesn't apply here: keep going through the steps.
- Anything that needs the owner goes under Questions for the owner; carry on with the rest.

### Notes

- Tests as of 2026-09-25: `tests/int` has 7 files with 45 tests, all passing. `tests/e2e` is still Payload's website-template suite with 4 tests: "can load homepage" fails (it expects the title "Payload Website Template"; the site is "Critwire"), the first admin test times out loading `/admin/login` while the dev server compiles it, and 2 didn't run.
- `playwright.config.ts` starts `pnpm dev` and records traces only on retry, with retries off locally, so runs leave no traces. On this 2-CPU box, running E2E against a production build (`pnpm build`, then `pnpm start`) is likely faster and more reliable than the dev server; the architect decides.
- The mission has its own database, `critwire_m_architecture_pass` (already set in the worktree's `.env`), which starts empty. Apply the schema, and have the tests create the fixtures they need, so the suite is repeatable on a fresh database.
- Before `pnpm payload migrate` or `pnpm build`, clear the dev-push marker (see `AGENTS.md`).
- A separate branch, `agent/prompt-audit`, also edits `AGENTS.md`. Ignore it; the owner will reconcile the two.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Recorded 2026-09-25 ~06:30 UTC on commit `9834f34`, fresh mission DB `critwire_m_architecture_pass`.

| Check | Command | Result | Wall time |
|---|---|---|---|
| Install | `pnpm install --frozen-lockfile` | OK, already up to date | <1 s |
| Migrate | `pnpm payload migrate` | OK, all 6 migrations applied to the empty DB | 9 s |
| Typecheck | `pnpm exec tsc --noEmit` | Pass, 0 errors | 13 s |
| Lint | `pnpm lint` | Pass, 0 errors, 30 warnings (25 `no-unused-vars`, mostly the `payload, req` args in generated migrations plus the old E2E specs and `verify-phase5.mjs`; 5 React-hooks warnings: `set-state-in-effect` in `src/providers/Theme/index.tsx:51` and `ThemeSelector/index.tsx:33`, render-time ref/state warnings in `src/Header/Component.client.tsx:28` and `src/components/Card/index.tsx:38,70`) | 11 s |
| Unit/int | `pnpm test:int` | Pass: 7 files, 45 tests (`site-config-schema` 15, `site-template` 9, `tally-parse` 9, `site-generator` 6, `template-revalidation` 3, `site-config-parity` 2, `api` 1) | 18 s |
| E2E | `pnpm test:e2e --reporter=list` (dev server) | **Fail**: 2 failed, 2 did not run. `Admin Panel` `beforeAll` timed out (30 s) waiting for `#field-email` on `/admin/login` while `next dev` compiled it, so its 3 tests failed or didn't run; `Frontend › can load homepage` expects title "Payload Website Template", got "Critwire". No traces kept (`trace: on-first-retry`, retries 0 locally) | 1 m 49 s |
| Build | `pnpm build` | Pass (only Sentry `disableLogger` deprecation warnings) | 1 m 48 s |

Observations for the architect:
- `tests/int/api.int.spec.ts` boots Payload with dev push, which writes the `dev` row into `payload_migrations`; after `pnpm test:int` (or any E2E run on `pnpm dev`), `pnpm build` and `pnpm payload migrate` need that row deleted first. The E2E harness must not leave the DB in that state.
- The existing E2E suite covers none of critwire's own behavior: it is Payload's website template (dashboard, users list, pages create, template homepage title). E2E coverage of the core flows before this mission: **0**.
- `tests/manual/` holds 6 scripts (1,084 lines): `verify-isolation.mjs` and `verify-phase3..7.mjs`. They are not run by any `pnpm` script.
- A production build takes ~1 m 48 s on this box; the dev-server E2E spent most of its 1 m 49 s compiling routes on first hit.

## Architecture

Reviewed: all of `src/` (config, plugins, access, collections and hooks, public routes, API routes, admin components, lib, site-templates, site-generator, jobs), `tests/`, Playwright and Vitest config, Dockerfile, `.env.example`, and the Payload, plugin and Next internals the findings depend on.

Several findings hinge on two Payload defaults:
- Local API calls default to `overrideAccess: true`. That also skips field-level access, and relationships get populated without access checks.
- A collection or global with no `access` gets `defaultAccess` (any logged-in user; `payload/dist/auth/defaultAccess.js`). In this app, every studio member is a logged-in user.

Tenant resolution today is by path only. Public requests go `/g/[gameSlug]` → project → `project.tenant`. There are no Host rewrites, because Phase 8 isn't built. For admin and REST requests, the tenant comes from the JWT user's `tenants` rows (the plugin), narrowed in admin list views by the `payload-tenant` cookie.

### Findings (ranked by impact)

**F1 (bug, cross-tenant). Jobs collection has default access.** `src/payload.config.ts:103-124` has no `jobsCollectionOverrides`, so:
- Any studio user can `GET /api/payload-jobs` and read other studios' pending or failed contact jobs, which hold players' names, emails and messages.
- Any studio user can `POST` a `discord-webhook` or `email-contact-form` job carrying another studio's `projectID`. The task delivers it to that studio's Discord or email through a privileged project read (`src/jobs/contact.ts:40-47`), bypassing Turnstile and rate limiting.
- `jobs.access.run` (`:105-117`) lets any logged-in user trigger queue runs.

Fix: in `jobsCollectionOverrides`, make create, read, update and delete super-admin only. Make `access.run` super admin or the `CRON_SECRET` bearer. Internal queue and run calls use the Local API and are unaffected.

**F2 (bug, platform content). Every studio user can change the Critwire marketing site.**
- `Posts` (`src/collections/Posts/index.ts:31-36`) and `Categories` (`src/collections/Categories.ts:9-14`) use `authenticated` for writes.
- The `header` and `footer` globals (`src/Header/config.ts:8-10`, `src/Footer/config.ts:8-10`) only define `read`, so `update` is open to any logged-in user.
- The redirects, form-builder and search plugins (`src/plugins/index.ts:84-148`) keep their default write access, and any user can read `form-submissions`.
- `authenticatedOrPublished` exposes marketing drafts to every studio user.

So a studio member can add a redirect for `/home`, which `PayloadRedirects` applies in `src/app/(frontend)/[slug]/page.tsx:72,81`. They can also edit the header, footer or blog, or read people's marketing-form submissions.

Fix: add one `superAdminOnly: Access` in `src/access/isSuperAdmin.ts`. It also replaces the inline copies in Tenants, Users and Pages. Apply it to:
- create, update and delete on posts and categories
- update on header and footer
- the plugin overrides: redirects writes, forms writes, and form-submissions read/update/delete (create stays public; see F16), plus search update/delete

Rename `authenticatedOrPublished` to `superAdminOrPublished`. Access changes only, no schema change.

**F3 (bug plus real violation). Public portal reads bypass access control.** These all use the default `overrideAccess: true` and re-implement visibility by hand (`isPublic`, `_status`):
- `src/lib/game-portal/getGameProject.ts:14-20`
- `issues.ts:46-53,59-68,105-112,126-138`
- `patchNotes.ts:21-30,39-48,63-75`
- the landing read in `src/app/(public)/g/[gameSlug]/page.tsx:33-50`
- `patch-notes/feed.xml/route.ts:23-43`

What goes wrong:
- (a) **Bug.** `getPublicIssue` uses `depth: 1`. A FIXED issue linked to an unpublished patch note shows that note's title and version on the public page and links to a 404 (`issues/[slug]/page.tsx:29-32,73-87`). Unreleased patch notes leak.
- (b) `getGameProject` puts `contact.email` and `contact.discordWebhookUrl` into the public render tree (`PortalChrome`, and `SiteRenderContext` into about 15 slots). The code documents the webhook URL as "never expose it publicly" (`GameProjects/index.ts:218-229`). Nothing serializes these fields today, but one `'use client'` slot receiving `ctx` would. The comment at `report/page.tsx:51-52` claims the opposite of what the code does.
- (c) The contact and report pages re-query the same project with `overrideAccess: true` (`contact/page.tsx:19-31`, `report/page.tsx:20-31`). The report page's re-query is pointless, because `reportForm` isn't a protected field.

This breaks patterns.md ("public reads with read-only access"), safe defaults, and DRY.

Fix:
- Every public portal read passes `overrideAccess: false`. Keep the explicit filters, since they state the query's intent.
- RSS reuses `getGameProject` and `queryPublishedPatchNotes` (add a `limit` argument).
- The only privileged portal read becomes `getContactRoute(slug)` in `src/lib/game-portal/contactRoute.ts`. It returns a union with no secrets in it: `{kind:'form',target} | {kind:'tally',url,display} | {kind:'external',url} | {kind:'none'}`. Both the contact page and the contact submit route use it, which removes the duplicated routing decision (`contact/page.tsx:62-68` vs `contact/submit/route.ts:117-129`).
- `getHasVoted` stays privileged, because votes aren't publicly readable.

**F4 (bug). Vote counting races.** In `src/app/api/vote/route.ts:73-118`, the vote write, the `count` and the `payload.update` each run in separate transactions.
- When two different players vote at the same moment, the last writer wins with a stale count. `upvoteCount` then stays too low until the next vote on that issue; the "self-healing" comment doesn't hold under concurrency.
- When the same browser token toggles twice concurrently, both requests see no vote, and the second insert hits the unique index and returns a 500.
- Every vote bumps `issues.updatedAt`, which re-sorts the landing's "Recently Fixed" list (`issues.ts:95-97`). Voting on an old fixed issue makes it look recently fixed.
- `findByID(...).catch(() => null)` (`:66-68`) turns database errors into 404s.
- The IP extraction (`:22-26`) duplicates `getClientIP`.

Fix: the `IssueVotes` hooks maintain the counter. This is the Payload convention, and patterns.md already assigns vote rules to IssueVote hooks.
- `afterChange` (on create) and `afterDelete` call `req.payload.db.updateOne({ collection:'issues', id, data:{ upvoteCount:{ $inc: ±1 } }, req, select })`. This is Payload's atomic increment, which core uses for `loginAttempts`.
- It runs inside the vote write's own transaction. It doesn't bump `updatedAt`, and it stays correct when a super admin deletes votes.
- The hooks then revalidate the landing through the shared helper from F14.

The route becomes: find the existing vote → `delete` or `create`.
- A unique-violation `ValidationError` on create means "already voted".
- A `NotFound` on delete means "already removed".
- The response returns the `upvoteCount` read after the write.
- The issue lookup uses `find` with `overrideAccess:false`: 404 for private or unknown issues, while real errors propagate.

No schema change. Existing counts stay valid, because they were last written by a recount.

**F5 (bug). Report promotion is detached and not atomic.** In `src/collections/IssueReports/hooks/promoteIssueReport.ts:90-136`:
- The Issue is created without `req`, so it commits in its own transaction even if the report save fails. That leaves an orphan public issue, and a retry creates a duplicate.
- The report's `issue` link is written by a fire-and-forget `setTimeout` after the response. Failures are only logged.
- The hook returns `{...doc, issue}`, claiming a link the database doesn't have yet. `verify-phase6.mjs` had to poll for it.

Fix: replace it with a `beforeChange` hook, `createIssueFromPublishedReport`. When a report moves to `PUBLISHED` with no linked issue, it creates the Issue with `req` (same transaction) and returns `{...data, issue: issue.id}`. That's one atomic write, with no self-update and no context flag.
- Merge `data` over `originalDoc` for partial updates, as `validateReportStatus.ts:20-21` does.
- A missing project or tenant throws `ValidationError`.
- Drop the redundant `revalidatePath('/g/<slug>/issues','layout')` (`:138-139`). Those pages are force-dynamic, and the Issue's own `afterChange` already revalidates the landing.

**F6 (bug). The admin kanban shows moves that failed.** In `src/components/admin/issues/kanban.tsx`:
- Optimistic moves do `updateIssue(...).catch(console.error)` (`:381`, `:399-401`) with no rollback and no message. A rejected PATCH (403, validation, network) leaves the board showing a status or order the database doesn't have.
- The PATCH is fired from inside a `setColumns` updater (`:364-416`), and the drag-start and drag-over handlers set state and write refs inside updaters (`:321-331`, `:341-345`). Updaters must be pure. With `reactStrictMode: true` (`next.config.ts:50`), dev mode runs them twice (duplicate PATCHes), and React may replay them in production.
- Load-more failures are unhandled promise rejections (`:304-317`, `:439-441`).
- `list.tsx:27-41` turns any query error into empty columns.

Fix:
- Compute the next columns from current state outside the updater, call `setColumns(next)`, then send the PATCH.
- On failure, restore the previous columns and show `toast.error` (the admin's own toaster from `@payloadcms/ui`). Use the same toast for load-more failures.
- Remove the error-swallowing try/catch in `list.tsx`.

**F7 (bug, rule 4). Editing a project leaves cached sub-pages stale.** `src/collections/GameProjects/hooks/revalidateGameProject.ts:19-22,33` only revalidates the page at `/g/<slug>`. Project data (name, logo, links, accent colour) also renders on the cached patch-notes feed, detail and pagination pages and in the RSS title, all cached for an hour (`revalidate = 3600`). A slug rename also leaves `/g/<old>/patch-notes/**` served from cache. Fix: call `revalidatePath('/g/<slug>','layout')` for the current, previous and deleted slugs.

**F8 (bug). `populatePublishedAt` re-dates content.** `src/hooks/populatePublishedAt.ts:3-15` sets `publishedAt = now` whenever the incoming `req.data` has no value. The hook is shared by PatchNotes, Pages and Posts.
- A partial update of a published note moves it to the top of the feed and changes its RSS `pubDate`.
- Draft saves stamp a date that the later publish keeps.
- Local API creates never get a date, and NULL sorts first on `-publishedAt`.

Fix: `data.publishedAt ?? originalDoc?.publishedAt ?? (status==='published' ? now : undefined)`, where `status = data._status ?? originalDoc?._status`.

**F9 (bug, latent integrity). Two fields don't restrict create.**
- `customDomainVerified` (`GameProjects/index.ts:325-337`) only restricts `update`. Any studio member can create a project already "verified" for any domain, and `customDomain` is globally unique, so a domain can be squatted. Phase 8 will trust this flag.
- `upvoteCount` (`Issues/index.ts:128-141`) only restricts `update`, so a member can create an issue with a fake vote count, which F4's `$inc` would then build on.

Fix: add `create` access to both fields (super admin, and `()=>false`). Payload strips the value and applies the default (`fields/hooks/beforeValidate/promise.js:216-233`).

**F10 (bug, low impact). `/next/preview` never checks the user.** `src/app/(frontend)/next/preview/route.ts:35-52` assigns the whole `payload.auth()` result, which is always an object, to `user`, so `if (!user)` never fires. Anyone with `PREVIEW_SECRET` gets Draft Mode anonymously and can read draft marketing pages and posts (`[slug]/page.tsx:116`, `posts/[slug]/page.tsx:110`). The secret is embedded in the admin preview URLs any studio user can open. Game portals are unaffected, because they re-authorize (`g/[gameSlug]/page.tsx:89-97`). Fix: `const { user } = await payload.auth(...)`.

**F11 (bug, low impact). Media folders are shared across tenants.** `Media.ts:19` enables `payload-folders`. That collection isn't in the multi-tenant plugin config (`src/plugins/index.ts:31-41`) and has default access (`payload/dist/folders/createFolderCollection.js:21-27`), so studio users can list, rename and delete other studios' folders.

Fix: add `'payload-folders': {}` to the plugin's collections (the plugin supports this explicitly), plus a migration `tenant_scoped_media_folders` that adds `tenant_id`, then regenerate types. Existing folders end up with no tenant (see Q3). This is the only schema change in the whole pass.

**F12 (DRY plus a minor bug). The contact and report handlers duplicate each other.** `contact/submit/route.ts` and `report/submit/route.ts` both define:
- `wantsJSON` (23-25 / 33-35)
- `responseFor` (27-43 / 37-53, including the no-op `'1' : '1'` ternary)
- `relationID` (45-48 / 55-58)
- the project lookup (98-115 / 108-125)
- the parse → Turnstile → rate-limit pipeline (57-95 / 67-105)

`TurnstileField` is duplicated too (`contact/page.tsx:33-43`, `report/page.tsx:33-43`).

The bug: the report endpoint never checks `reportForm.provider` (`report/submit/route.ts:107-141`). A studio that chose Tally or an external form still gets native reports in a queue nobody watches. The contact endpoint does check its target.

Fix:
- Add `src/lib/public-forms/guard.ts` with `guardPublicForm({body, schema, ip, rateLimit})` → `{ok:true,data} | {ok:false,status,error}` (steps in patterns.md order) and `formResponse({req, path, status, json})`.
- Share `src/components/game/TurnstileField.tsx`.
- Look up the project with `getGameProject` / `getContactRoute`.
- The report endpoint returns 400 when `provider !== 'native'`.

**F13 (real violation: fail-silent, SRP). Contact jobs fail silently and run the whole queue in a player's request.**
- `src/jobs/contact.ts:76-84` reports `sent: true` when `RESEND_API_KEY` is missing. A misconfigured production silently drops every message routed to email. `.env.example` documents this as intended.
- `getProject` (`:40-47`) reports database errors as "not configured".
- The Resend and Discord `fetch` calls (`:99`, `:153`) have no timeout.
- `contact/submit/route.ts:147` runs up to 10 queued jobs from any studio inside the submitter's request.

Fix:
- When Resend isn't configured: return `sent:false`, `log.error`, and `Sentry.captureMessage`.
- Use `findByID({ disableErrors: true })`.
- Add `AbortSignal.timeout(10_000)` to both fetches.
- The submit route runs only its own job with `payload.jobs.runByID({ id: job.id })`. The autoRun cron stays as the backup.
- Update `.env.example`.

**F14 (DRY, minor, mechanical). Small helpers are copied around.**
- About 12 local relation-ID helpers duplicate `extractID` from `payload/shared`: `validateReportStatus.ts:7`, `promoteIssueReport.ts:13`, `revalidateIssueLanding.ts:28`, `revalidatePatchNotes.ts:26`, both submit routes, `site-generator/service.ts:32`, `context.ts:12`, `validateUniqueSlugPerProject.ts:17`, `GamePages/index.ts:101`, `tenantAccess.ts:40` and `tenantRoles.ts:19`.
- The same-project `filterOptions` is identical in `Issues/index.ts:121-126` and `IssueReports/index.ts:62-67`.
- Three helpers each resolve a project slug and revalidate `/g/<slug>` (`revalidateGamePage.ts:9-18`, `revalidateIssueLanding.ts:31-39`, `revalidatePatchNotes.ts:20-23`).

Fix: use `extractID` everywhere (guarding nulls), one `sameGameProjectFilter` in `src/fields/`, and one `revalidateGameLanding(gameProject, payload)` in `src/hooks/` (F4 uses it too). The type checker verifies the change.

**Leave as is (with reasons):**
- **F15.** Turnstile and Upstash fail open when not configured, including in production (`verifyTurnstile.ts:22-23`, `rate-limit.ts:29-30`), although patterns.md says to fail closed. Flipping this could take down forms on a deployment that lacks the keys, so it's owner question Q1. E2E still exercises the enforced Turnstile path, using Cloudflare's test keys.
- **F16.** `form-submissions` create is a public form endpoint with no Turnstile or rate limiting, which breaks rule 8. It's part of the unused Payload website-template surface. It's dormant, because it needs a form created by a super admin. Removing that surface means a schema change, so it's Q2. F2 already closes the read and write holes.
- **F17.** The admin kanban ignores the admin tenant selector: the custom list view bypasses the plugin's `baseFilter` (`list.tsx:28-37`). Nothing leaks, since access still applies. It belongs to the open kanban remediation plan.
- **F18.** `revalidatePath` in `afterChange` runs before the REST operation's transaction commits. A render in that window of a few milliseconds can re-cache old data for up to an hour. This is Payload's standard pattern.
- **F19.** `site-generator/context.ts:78` filters media by `tenant`. That narrows the plugin-enforced scope (`overrideAccess:false, user`) to the page's tenant, which the plugin can't infer for a user in several tenants. It doesn't bypass rule 2.
- **F20. None of the 5 React-hooks lint warnings is a bug.** All are in Payload-template marketing code, not on portal or admin screens:
  - `providers/Theme/index.tsx:51` and `ThemeSelector/index.tsx:33` read `localStorage` after mount. That's the hydration-safe pattern and costs one extra render.
  - `Header/Component.client.tsx:28` copies context into state, which is harmless.
  - `components/Card/index.tsx:38,70` are false positives: the code passes ref objects to `ref`, it doesn't read `.current`.

  The 25 `no-unused-vars` warnings come from generated migration signatures (left alone) and from files this pass deletes.

**Verified fine:**
- Access on tenant collections. The plugin ANDs `tenant in user.tenants` onto every operation and validates relationship `filterOptions` on the server, so cross-tenant `gameProject` and `tenant` references are rejected (`plugin-multi-tenant/dist/utilities/withTenantAccess.js`, `addFilterOptionsToFields.js`, `payload/dist/fields/validations.js:404+`).
- Delete is owner-only.
- IssueVotes create and update over REST are disabled.
- The vote token is HMAC-signed, compared in constant time, and stored as a SHA-256 hash.
- The site-preview token is verified, and the route re-authorizes the user.
- `/next/generate-site` checks auth and origin, validates with Zod, uses `overrideAccess:false`, and only writes drafts.
- All three public endpoints validate with Zod.
- RSS output is XML-escaped.
- Nothing uses the `payload.db.drizzle` escape hatch.
- No CQS violations in our code. `checkRateLimit` is both command and query because Upstash's API is.

### E2E harness

**Decision:** Playwright runs against a production build (`next build` + `next start`) on port 3100 (`E2E_PORT` overrides it). The E2E database is dropped and re-migrated at the start of every run. A Playwright `setup` project creates fixtures over HTTP. The test process never boots Payload.

**Dev server or production build.** Production build.
- `next dev` compiles each route on first hit; that's why the baseline's admin login timed out.
- `next start` serves precompiled routes with production behaviour: `prodMigrations`, no schema push, and env inlined at build time. It costs one build per run (about 110 s).
- With `output:'standalone'`, `next start` only prints a warning (`next/dist/server/next.js:227`).

**Schema on a fresh database, without the `dev` row.** The webServer command runs `payload migrate:fresh --force-accept-warning` first.
- The CLI sets `PAYLOAD_MIGRATING=true` (`payload/dist/bin/migrate.js:36`), so nothing is pushed.
- `migrateFresh` drops everything, including any stale `dev` row, and applies all migrations. `next start` then runs `prodMigrations`, which does nothing.
- Deleting `tests/int/api.int.spec.ts` removes the only other source of dev pushes.
- Afterwards, `pnpm payload migrate` and `pnpm build` work as-is.

**Safety.** The reset only ever targets `E2E_DATABASE_URL`, which is required. `playwright.config.ts` throws "this database is dropped on every run" if it's unset. The webServer maps it to `DATABASE_URL` for the reset, the build and the server.
- For this mission, set it in the worktree `.env` to the mission database.
- On the owner's machine, use a separate database (`createdb critwire_e2e`).

**Fixtures.** `tests/e2e/auth.setup.ts` is the `setup` project, so it shows up in the report with its own trace.
- It calls `POST /api/users/first-register` to create the super admin. Anything other than 201 fails fast with "E2E database is not fresh".
- As the super admin, it creates tenants A and B and the users `aOwner`, `aMember` (tenant A) and `bOwner` (tenant B).
- It logs each user in and writes `test-results/.auth/<role>.json` (storageState) and `test-results/.auth/world.json` (tenant IDs and JWTs).
- Each spec creates its own game projects and content in `beforeAll` over REST, as the owning studio user, with slugs unique to that spec. Specs stay independent, and hooks and revalidation run inside the real server.

**Tenant resolution.** Public tests address the two studios by their two game slugs. API tests authenticate with each role's JWT. Single-tenant users don't need a `payload-tenant` cookie.

**Turnstile.** The E2E env uses Cloudflare's documented test keys:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (always passes; baked in at build time)
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`

Browser tests run the real widget and the real `siteverify` call. API tests send the dummy token `XXXX.DUMMY.TOKEN.XXXX`. "No token → 400" proves Turnstile is enforced. There's no code toggle, and production is unchanged. This needs outbound HTTPS to challenges.cloudflare.com; if it's unreachable, the form tests fail loudly at the "token issued" step.

**Upstash.** Left empty, so the existing fail-open path runs (F15). Rate limiting isn't covered by E2E, because there's no local Upstash without Docker. This is a documented gap.

**Other external services.** The webServer env forces these off with `''`. Next's env loader only fills variables that are `undefined` (`@next/env`), so a developer's `.env` can't switch them back on:
- `R2_*`: media goes to local disk.
- `RESEND_API_KEY`: email jobs return `sent:false`.
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`: Sentry is disabled, and without an auth token nothing is uploaded.
- `OPENAI_API_KEY`: the site generator returns 503.
- `UPSTASH_*` and `CRON_SECRET`.
- Stripe isn't integrated, so nothing to do.

The env also sets:
- `NEXT_PUBLIC_SERVER_URL=http://localhost:<port>` and `PORT`
- `PREVIEW_SECRET=e2e-preview-secret`
- `SKIP_BUILD_STATIC_GENERATION=1`, as the Dockerfile does

`PAYLOAD_SECRET` comes from `.env`; tests also use it to sign a site-preview token with the imported `signSitePreviewToken`. Contact delivery is tested with a Discord target pointed at a local HTTP sink that the spec runs (`http://127.0.0.1:<random>/hook`).

**Cookies.** `baseURL` must be `http://localhost`. The vote cookie is `Secure` in production builds, and Chromium only accepts Secure cookies over plain http on localhost. API vote tests send the `Cookie` header explicitly.

**Reports.**
- `reporter: [['list'],['html',{open:'never'}]]`.
- `use: {baseURL, trace:'on', screenshot:'on', video:'off'}`. Video is off because it costs CPU on 2 cores.
- One spec per core flow, with key checkpoints wrapped in `test.step()`.
- The HTML report embeds every trace, so `playwright-report/` on its own is a complete artifact.

**Workers and timeouts.**
- `workers:1` and `fullyParallel:false`.
- `retries:0`, because a retry would hide the races F4 targets.
- `forbidOnly:true`.
- Per-test timeout 60 s, `expect` timeout 10 s, webServer timeout 420 s (reset + build + boot).
- `reuseExistingServer:false`, so a busy port fails fast.
- After a write, tests use `expect(...).toPass({timeout:5_000})`. Passing within 5 s proves on-demand revalidation (timed ISR is 3600 s) and tolerates stale-while-revalidate.

**Artifact.** After the final run, the mission step:
- copies `playwright-report/` to `/srv/critter-ai/agent-state/missions/architecture-pass/e2e/playwright-report/`
- tees the list output to `…/e2e/run.log`
- writes `…/e2e/README.md` with the UTC time, commit SHA, pass/fail counts, the command to reproduce (`E2E_DATABASE_URL=<db> pnpm test:e2e`), and the command to view it (`pnpm exec playwright show-report <dir>`)

The VPS path stays out of the repo's scripts.

**Scripts:**
- `test:e2e`: `cross-env NODE_OPTIONS=--no-deprecation playwright test`. The `--import=tsx/esm` loader is dropped, since tests no longer import Payload.
- `e2e:server`: only Playwright's webServer invokes it, with the E2E env: `payload migrate:fresh --force-accept-warning && ([ "$E2E_SKIP_BUILD" = 1 ] || next build) && next start`. `E2E_SKIP_BUILD=1` is for iterating on specs only, never for verification. It reuses the previous build and its page cache.
- `test`: unchanged.

**Layout:**
```
playwright.config.ts          E2E_DATABASE_URL guard, webServer+env, projects: setup; chromium (depends on setup)
tests/e2e/auth.setup.ts       fresh-DB seed and role sessions
tests/e2e/support/env.ts      port/baseURL, Turnstile test keys, role names
tests/e2e/support/api.ts      typed REST client per role (JWT header): login/create/update/find/remove
tests/e2e/support/fixtures.ts test.extend: api(role), world, project factory, lexical(), webhookSink
tests/e2e/{tenant-isolation,portal-landing,patch-notes,issues-voting,reports-contact,admin-triage}.spec.ts
```

Also:
- `.env.example`: add `E2E_DATABASE_URL`, with the warning that the database is dropped on every run.
- Delete `tests/e2e/*.e2e.spec.ts` (the template specs), `tests/helpers/` (its `seedUser` boots Payload with a dev push), and the unused `test.env`.

### E2E scenarios

**Legend:**
- `[F#]`: the scenario fails before that fix.
- `[guard F#]`: it passes today and protects that fix.
- `[old: …]`: the old test or script it replaces.

**S1 `tenant-isolation.spec.ts`** (API, plus one browser test) [old: verify-isolation.mjs]
1. Cross-tenant reads: `bOwner` lists issues, patch-notes (`draft=true`), issue-reports, game-pages (`draft=true`), media and payload-folders, and sees none of A's documents. [F11]
2. Cross-tenant writes:
   - `bOwner` PATCHes A's project, issue and report, and DELETEs A's issue → 403 or 404.
   - `bOwner` POSTs an issue with `tenant:B` and `gameProject:<A's project>` → 400; with `tenant:A` → 400.
3. Roles: `aMember` deleting an issue → 403; `aOwner` → 200.
4. Anonymous:
   - issue-reports and issue-votes → 403.
   - A project has no `contact.email` or `discordWebhookUrl`, though `aOwner` sees both.
   - Issues: public ones only. Patch notes: published ones only.
5. `POST /api/issue-votes` as super admin → 403.
6. Field guards: a project created with `customDomainVerified:true` is stored as false; an issue created with `upvoteCount:999` is stored as 0. [F9]
7. Platform and system collections. `aOwner` cannot [F1, F2]:
   - create posts or redirects
   - update the header global
   - read form-submissions
   - read or create payload-jobs (tested with a `discord-webhook` job aimed at B's project)
   - call `/api/payload-jobs/run`
8. Slugs: a duplicate issue slug in one project → 400; the same slug in another project → 201.
9. Preview, in the browser:
   - Anonymous `/next/preview?previewSecret=…` → 403. [F10]
   - `bOwner` enters Draft Mode through `/next/site-preview` for B's own page. A's landing page then shows A's published heading, not A's saved draft.
   - A's preview token with `bOwner`'s session → 403.
10. `/next/generate-site`:
    - anonymous → 401
    - `bOwner` on A's page → 404
    - slot scope without a slot → 400 [old: site-generator "requires a slot"]
    - a valid request with no OpenAI key → 503, and A's draft is unchanged

**S2 `portal-landing.spec.ts`** [old: verify-phase3.mjs, verify-phase7.mjs SEO checks, site-template.int, site-config-schema.int, the issue-move case in template-revalidation.int]
1. `/g/<unknown>` → 404, with the same body as the 404 for an existing project's private issue, so the response doesn't reveal whether a project exists.
2. Derived default landing, for a project with no page, with Steam, platforms, Discord and trailer facts, contact `EXTERNAL_URL`, and report `external`:
   - h1 is the project name; `og:site_name` is Critwire; `twitter:card` is present.
   - The `updates`, `issues`, `report` and `contact` links resolve to `/g/<slug>/…` even though the providers are external.
   - The primary call-to-action is the first platform's store URL. A project with no facts has no store button.
   - Sections render in the fixed order.
   - The trailer has no iframe until "Play video" is clicked, then shows a youtube-nocookie iframe.
   - The name `<Evil> {Game}` renders as text.
3. Accent colour `#ffffff` → the rendered primary button's text/background contrast is at least 4.5, measured from computed styles.
4. Publishing a flagship page over REST as `aMember`:
   - Publishing with `<script>` text, a raw-URL action ref, low-contrast colours, or an unknown key → 400, and the public page is unchanged.
   - A valid publish shaped like admin data (array rows with `id`, an uploaded hero media id) renders its heading.
   - A draft save doesn't change the public page. Publishing makes it visible (`toPass`). Unpublishing falls back to the derived default.
5. Live slots:
   - "Latest update" is the newest published note.
   - Known issues are public ones only, and B's content never appears.
   - A status change updates the landing's status label (`toPass`).
   - Moving an issue from project A1 to A2 updates both landing pages.
6. A logo uploaded to `/api/media` and set on the project renders in the portal header (200).

**S3 `patch-notes.spec.ts`** [old: verify-phase4.mjs, the note-move case in template-revalidation.int]
1. Feed, with 12 published notes and 1 draft:
   - Page 1 is newest first and shows "Page 1 of 2" and the version badges.
   - The draft doesn't appear. Page 2 has the oldest note.
   - `/page/3` and `/page/1` → 404.
2. Detail pages render rich text. The draft's slug → 404. B's note slug under A's portal → 404.
3. RSS:
   - content type `application/rss+xml`, 12 items
   - titles escaped (`&lt;&amp;&gt;`)
   - item links are `<baseURL>/g/<slug>/patch-notes/<note>`
   - no drafts and nothing from B
   - an unknown game → 404
4. Revalidation:
   - A partial PATCH of an older note's title shows up in the feed, detail and RSS (`toPass`), and the note keeps its `publishedAt` and position. [F8]
   - Unpublishing removes the note from the feed and RSS, and its detail page 404s.
   - Moving a note from A1 to A2 updates both feeds.
   - Renaming the project shows the new name in the patch-notes header (`toPass`). [F7]

**S4 `issues-voting.spec.ts`** [old: verify-phase5.mjs]
1. List:
   - Public issues only, pinned first, with status badges.
   - The category dropdown and the search box update the URL and the results.
   - "Latest" sort works. B's issue doesn't appear.
2. Board: "Board view" goes to `?view=board`, issues sit in their status columns, and nothing is draggable.
3. Detail:
   - The workaround and needs-more-info boxes render.
   - A FIXED issue linked to a published note links to a page that returns 200.
   - A FIXED issue linked to a draft note doesn't show the draft's title. [F3]
   - A private issue → 404.
4. Voting in the browser:
   - Upvote → the button is pressed and the count is 1. A reload keeps it.
   - A second browser context → 2. The first context toggles off → 1.
   - The landing's known-issues count updates (`toPass`), and the "top" sort reorders.
5. Voting API:
   - Bad body → 400. Unknown id → 404. Private issue → 404.
   - A tampered cookie gets a new `Set-Cookie` and is counted once, as a new voter.
6. Concurrency [F4]:
   - 8 parallel votes from 8 fresh tokens all return 200, and `upvoteCount` = 8 = the number of vote rows (counted as super admin).
   - 2 parallel votes with one cookie: no 5xx, and the count equals the vote rows.
   - Voting doesn't change the issue's `updatedAt`.

**S5 `reports-contact.spec.ts`** [old: verify-phase6.mjs, verify-phase7.mjs Turnstile check, tally-parse.int]
1. Report in the browser: the Turnstile widget issues a token; submitting shows the `?submitted=1` banner. `aOwner` sees the report as NEW, with tenant, project and metadata; `bOwner` doesn't see it.
2. Report API guards:
   - Short description → 400. No token → 400. Unknown game → 404.
   - With the report provider set to Tally, a native submit → 400, and the page shows the Tally embed. [F12]
   - With the provider set to `external`, the page shows a link and no form.
3. Promotion:
   - `aOwner` PATCHes the report to PUBLISHED. The response and an immediate GET both carry `issue`, with no polling. [F5]
   - The new issue is public, REPORTED, has the same category and summary, and appears on the board.
   - A later edit of the report doesn't create a second issue.
   - LINKED without an issue → 400.
4. Contact through Discord:
   - The webhook points at the local sink. A browser submit shows "Message sent".
   - The sink received exactly one embed, with the subject, message and game name.
   - The webhook URL never appears in the page HTML or in anonymous REST responses. [guard F3]
5. Routing variants:
   - `EXTERNAL_URL` → a link, no form.
   - `TALLY` → an iframe with `data-tally-src` on `tally.so/embed/<id>`.
   - `https://evil-tally.so/r/x` is rejected on save (400).
   - `EMAIL` with no address → "not configured", and a submit → 400.
   - Short message → 400. No token → 400.

**S6 `admin-triage.spec.ts`** [old: tests/e2e/admin.e2e.spec.ts]
1. The login page shows Critwire's copy, and a UI login as `aOwner` reaches the dashboard.
2. The kanban lists only A's issues, with counts per column. `bOwner` opening A's issue edit URL gets Payload's not-found view.
3. Drag an issue from REPORTED to INVESTIGATING. Use mouse down, then move in steps, then up; dnd-kit needs more than 6 px of movement. The change survives a reload, shows over REST, and the public board and landing reflect it.
4. Reordering within a column survives a reload.
5. With `page.route` forcing the PATCH to return 500, the card returns to its column and an error toast appears. [F6]
6. "Table" shows Payload's list with A's issues.
7. Open a report submitted through the public form in admin, set it to Published and save. The linked issue shows, and the public board lists it.

**Coverage:** before this pass, 0 of the 7 core flows had E2E tests; after it, all 7 do. Known gaps, by design:
- Upstash rate limiting
- legacy block landing pages (hidden, frozen, slated for removal)
- actual email sending through Resend
- the internals of OpenAI site generation (covered by the int tests that stay)

### Test audit (preliminary)

| File | Call | Reason | Replaced by |
|---|---|---|---|
| int/api.int.spec.ts | delete | Only asserts that `find` returns something. It also boots Payload with a dev push and writes the `dev` row. | setup project + `/api/health` readiness |
| int/tally-parse.int.spec.ts | delete | The real risk is a non-Tally host. The URL-shape cases just restate the parser. | S5.2, S5.5 |
| int/template-revalidation.int.spec.ts | keep 1 of 3 | Keep "skips issue writes that only change kanban order": E2E can't observe that a revalidation didn't happen, and this guards the documented kanban/ISR contract. The two "moves projects" cases go to E2E. | S2.5, S3.4 |
| int/site-config-parity.int.spec.ts | keep | Checks that two declarations (Zod and the Payload fields) agree, down to every enum option. E2E would have to exercise every field. | — |
| int/site-config-schema.int.spec.ts | delete | The security cases are covered by publishing through the real hook. The boundary numbers restate the Zod config. | S2.4 |
| int/site-template.int.spec.ts | delete | Section order, derived defaults, action refs, hostile text, contrast and the trailer facade are all visible on the rendered page. | S2.2, S2.3 |
| int/site-generator.int.spec.ts | keep 5, delete 1 | The kept tests need a fake model: redaction of secrets from the model's context, a single draft-only write, no write on failure or rate limit, scope enforcement, and refusal/unknown-media handling. "Requires a slot" moves to the route test. | S1.10 |
| manual/verify-isolation.mjs | delete | folded in | S1 |
| manual/verify-phase3.mjs | delete | The flagship template replaced block pages; the legacy renderer is a documented gap. | S2 |
| manual/verify-phase4.mjs | delete | folded in | S3 |
| manual/verify-phase5.mjs | delete | folded in | S4 |
| manual/verify-phase6.mjs | delete | Folded in; its polling for the promoted issue goes away with F5. | S5, S6.7 |
| manual/verify-phase7.mjs | delete | SEO meta, login copy, the Turnstile field, health | S2.2, S6.1, S5.1, harness readiness |
| manual/README.md | delete | the directory goes | — |

Vitest stays for the 3 remaining files. `pnpm test:int` no longer touches Postgres.

### Target design summary (order for Steps)

Pair each fix with its scenario: write the scenario, watch it fail, fix, then watch it pass. Delete old tests only once the whole E2E suite is green.
1. **Harness.** Config, scripts, `support/*` and `auth.setup.ts`; `E2E_DATABASE_URL` in `.env.example` and in the worktree `.env`. Delete the template specs, `tests/helpers/` and `test.env`. Proof: the setup project passes on a fresh database, and no `dev` row exists afterwards.
2. **Access and security.** F1; F2 (`superAdminOnly`, `superAdminOrPublished`); F9; F10; F11 (plugin config, migration, `generate:types`, `generate:importmap`). Scenario S1.
3. **Public reads and revalidation.** F3 (`overrideAccess:false` helpers, `getContactRoute`, RSS reuse), F7, F8. Scenarios S2 and S3.
4. **Voting.** F4 (IssueVotes counter hooks, thin route) and the shared `revalidateGameLanding` from F14. Scenario S4.
5. **Reports and contact.** F5 (promotion in `beforeChange`); F12 (`guardPublicForm`, `formResponse`, `TurnstileField`, the provider check); F13 (`runByID`, timeouts, honest email output). Scenario S5.
6. **Kanban.** F6. Scenario S6.
7. **Rest of F14.** `extractID` and `sameGameProjectFilter`.
8. **Test audit.** Delete or trim per the table. `test:int` and the full E2E suite must pass.
9. **Docs.**
   - critwire `AGENTS.md` gets a `## Testing` section:
     - the three rules, verbatim
     - `pnpm test:e2e` needs `E2E_DATABASE_URL`, and that database is dropped on every run
     - the artifact is `playwright-report/`
     - seed through REST in the setup project, and each spec owns its projects
     - int tests only for invariants E2E can't reach, listing the ones kept
   - Update its Commands lines for `test` and `test:e2e`. Leave the local-development paragraph alone.
   - `docs/patterns.md`:
     - the hook list: IssueReport promotion in `beforeChange`; IssueVote hooks own `upvoteCount` through `$inc`
     - public portal reads use `overrideAccess:false`, and privileged reads live only in named helpers
     - jobs are super-admin only, and folders are tenant-scoped
10. **Final checks.** `tsc`, lint, `test:int`, `test:e2e` (then copy the artifact), and `pnpm build` last, so `.next` doesn't keep the public env values baked in by the E2E build.

**Schema:** one migration only (F11, `payload_folders.tenant_id`).

### Rejected alternatives
- `next dev` for E2E: it compiles routes on first hit (the baseline timed out) and doesn't behave like production.
- The standalone `server.js`: it needs its assets copied on every run, while `next start` serves the same build.
- Seeding with the Local API in `globalSetup`: a second Payload instance outside production dev-pushes the schema (the `dev` row); `revalidatePath` throws outside a Next request; and hooks would run outside the server. Playwright also starts the webServer before `globalSetup` (`playwright/lib/runner/tasks.js:100-108`).
- A test-only seed endpoint: new production surface and a new secret, for nothing REST can't already do.
- Reusing database state between runs with `payload migrate`: runs wouldn't be repeatable.
- Retries: they would hide races like F4.
- A Turnstile bypass flag or a mocked `verifyTurnstile`: weakens production. Cloudflare's test keys exercise the real path.
- Unique slugs per run: unnecessary with a fresh build and a fresh database on every run.
- Fixing votes with `SELECT … FOR UPDATE` through `payload.db.drizzle`: that's the escape hatch with manual tenant scoping, and `$inc` inside the vote's own transaction is enough.
- Promotion in `afterChange` with `req` plus a self-update: it works, but writes twice and re-runs the hooks.
- Removing the Payload template collections now: schema change and a product decision (Q2).
- Switching Turnstile and Upstash to fail closed now: it could break a live deployment (Q1).

### Owner questions (copy to Questions for the owner)
- **Q1.** Should production reject form submissions when `TURNSTILE_SECRET_KEY` or the Upstash credentials are missing? Today it silently skips both checks.
- **Q2.** Should we remove the unused Payload website-template surface (posts, categories, forms and form-submissions, search, redirects, header/footer, and the post routes)? It needs a migration. `form-submissions` is a public form endpoint with no Turnstile or rate limiting.
- **Q3.** After F11, any media folders already in production have no tenant, so only super admins can see them until someone assigns one. Do they need a backfill?

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Questions for the owner

- **Q1.** Should production reject form submissions when `TURNSTILE_SECRET_KEY` or the Upstash credentials are missing? Today it silently skips both checks (F15). Not blocking: the mission leaves fail-open behavior unchanged.
- **Q2.** Should we remove the unused Payload website-template surface (posts, categories, forms and form-submissions, search, redirects, header/footer, and the post routes)? It needs a migration. `form-submissions` is a public form endpoint with no Turnstile or rate limiting (F16). Not blocking: F2 closes the access holes.
- **Q3.** After F11, any media folders already in production have no tenant, so only super admins can see them until someone assigns one. Do they need a backfill? Not blocking for the mission.

## Log

- 2026-09-25 06:35 UTC: Baseline recorded. tsc, lint (0 errors), int (45/45) and build pass; old E2E suite fails 2, 2 not run.
- 2026-09-25 06:53 UTC: Architecture written by `architect`: 14 findings to fix (F1–F14, incl. jobs/marketing access holes, public reads bypassing access, vote-count race), 6 left with reasons; E2E harness on a production build with `migrate:fresh` on a dedicated E2E DB; scenario list and test-audit calls. Q1–Q3 copied to Questions. Plan-only change, no code verification needed.

## Summary
