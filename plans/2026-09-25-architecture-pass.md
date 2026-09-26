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
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

Fix: in `jobsCollectionOverrides`, make create, read, update and delete super-admin only. Make `access.run` super admin or the `CRON_SECRET` bearer. Internal queue and run calls use the Local API and are unaffected. The same override sets `admin.hidden: ({ user }) => !isSuperAdmin(user)` (Payload hides the collection by default, `queues/config/collection.js:104-106`), so super admins can see and recover failed contact jobs (F13).

**F2 (bug, platform content). Every studio user can change the Critwire marketing site.**
- `Posts` (`src/collections/Posts/index.ts:31-36`) and `Categories` (`src/collections/Categories.ts:9-14`) use `authenticated` for writes.
- The `header` and `footer` globals (`src/Header/config.ts:8-10`, `src/Footer/config.ts:8-10`) only define `read`, so `update` is open to any logged-in user.
- The redirects, form-builder and search plugins (`src/plugins/index.ts:84-148`) keep their default write access, and any user can read `form-submissions`.
- `authenticatedOrPublished` exposes marketing drafts to every studio user.

So a studio member can add a redirect for `/home`, which `PayloadRedirects` applies in `src/app/(frontend)/[slug]/page.tsx:72,81`. They can also edit the header, footer or blog, or read people's marketing-form submissions.

Fix: add one `superAdminOnly: Access` in `src/access/isSuperAdmin.ts`. It also replaces the inline copies in Tenants, Users and Pages. Apply it to:
- create, update and delete on posts and categories
- update on header and footer
- the plugin overrides: redirects writes, forms writes, form-submissions create/read/update/delete (create: see F16), plus search update/delete

Rename `authenticatedOrPublished` to `superAdminOrPublished`. Access changes only, no schema change. The rename covers reads that go through access; the Draft Mode render path that bypasses access is F10.

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

**Cutover reconciliation.** Existing counts can't be trusted: the race above lets a stale recount be the last write, and `$inc` would carry that error forever instead of healing it on the next vote. So a data-only migration, `reconcile_issue_upvote_counts`, recomputes the counter once:

```sql
UPDATE issues SET upvote_count = (
  SELECT count(*) FROM issue_votes v
  WHERE v.issue_id = issues.id AND v.tenant_id = issues.tenant_id
)
```

- It runs through `prodMigrations` during Payload init, before the new code serves a request. Compose recreates the single app container, so old and new code never write counts at the same time.
- The tenant predicate keeps the statement tenant-scoped (rule 2). It never drops a real vote, because the vote route copies the issue's tenant onto each vote (`vote/route.ts:94-101`).
- Raw SQL leaves `updated_at` alone. `down` is a no-op. There's no schema change.
- E2E applies it to an empty database, so the Step proves it on the mission database instead: set a wrong `upvote_count` with psql, run `pnpm payload migrate`, and check the count now equals the vote rows.

**F5 (bug). Report promotion is detached and not atomic.** In `src/collections/IssueReports/hooks/promoteIssueReport.ts:90-136`:
- The Issue is created without `req`, so it commits in its own transaction even if the report save fails. That leaves an orphan public issue, and a retry creates a duplicate.
- The report's `issue` link is written by a fire-and-forget `setTimeout` after the response. Failures are only logged.
- The hook returns `{...doc, issue}`, claiming a link the database doesn't have yet. `verify-phase6.mjs` had to poll for it.

Fix: replace it with a `beforeChange` hook, `createIssueFromPublishedReport`. When a report moves to `PUBLISHED` with no linked issue, it creates the Issue with `req` (same transaction) and returns `{...data, issue: issue.id}`. That's one atomic write, with no self-update and no context flag.
- Merge `data` over `originalDoc` for partial updates, as `validateReportStatus.ts:20-21` does.
- `uniqueIssueSlug` (`promoteIssueReport.ts:46-55`) passes `req` too, so its lookup reads inside the same transaction as the Issue create (Fable MISSED 3).
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
- Serialize moves: ignore a drag start while a move's PATCH is in flight. Otherwise restoring the snapshot from before a failed move could wipe out a later move that succeeded (Astra SHOULD-CONSIDER 1).
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

**F10 (bug). Marketing drafts are readable without authorization.**
- `src/app/(frontend)/next/preview/route.ts:35-52` assigns the whole `payload.auth()` result, which is always an object, to `user`, so `if (!user)` never fires. Anyone with `PREVIEW_SECRET` gets Draft Mode anonymously. The secret is embedded in the admin preview URLs any studio user can open.
- Draft Mode is one site-wide cookie, and every studio user gets it legitimately through `/next/site-preview` for their own game page (`site-preview/route.ts:39-74`). The marketing page and post queries then read with `draft: true, overrideAccess: true` (`[slug]/page.tsx:106-122`, `posts/[slug]/page.tsx:101-117`). F2's access rename never applies to them, so every studio user sees unpublished marketing pages and posts (Astra MUST-FIX 1).
- `ArchiveBlock` (`src/blocks/ArchiveBlock/Component.tsx:29-42`) lists posts with the default `overrideAccess: true` and no status filter. A never-published post keeps `_status: 'draft'` on its main row, so it shows up in public archive lists.

Game portals are unaffected, because they re-authorize (`g/[gameSlug]/page.tsx:89-97`).

Fix: authorize at the read, where the data leaves, and close the entry point too.
- Move `getPreviewUser` out of `g/[gameSlug]/page.tsx:54-62` into `src/utilities/getPreviewUser.ts`, shared by the game landing and both marketing queries.
- `queryPageBySlug` and `queryPostBySlug`: `previewUser = draft mode ? await getPreviewUser() : null`, `draft = isSuperAdmin(previewUser)`, then `find({ draft, overrideAccess: false, user: previewUser })`. Access decides. Non-admins query the published document: with `draft: true`, a published-only constraint would match nothing whenever the latest version is a draft, and the page would 404.
- `/next/preview`: `const { user } = await payload.auth(...)`, and 403 with `draft.disable()` unless `isSuperAdmin(user)`. After F2, only super admins edit pages and posts.
- `ArchiveBlock`: `overrideAccess: false`.

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

Also, the "routing not configured" branches (`:68-74`, `:145-151`) return a successful `sent:false`. Payload deletes successful jobs (`deleteJobOnComplete`), so the player's message is gone with no retry (Astra MUST-FIX 4).

Fix: a contact task either delivers or throws.
- Throw a descriptive error when the project is missing, when its routing no longer matches the task, when `RESEND_API_KEY` is unset, or when the Discord URL fails F21's check. The existing catch reports it to Sentry and rethrows.
- Payload then records the failed attempt and retries twice (`retries: 2`, on the next cron runs). After that it sets `hasError` and keeps the job with its `input` (`queues/errors/handleTaskError.js:54-73`); only successful jobs are deleted. No message is lost.
- Recovery: F1's override shows the Jobs collection to super admins. After fixing the configuration, a super admin unticks `hasError` on the job, and the next cron run delivers it. `hasError` is Payload's own field, described as "If hasError is true this job will not be retried". Document this in `docs/patterns.md`.
- Returning `{ state: 'failed' }` isn't an option: it's deprecated in 3.85 (`taskTypes.d.ts:9-15`), and Payload says to throw instead.
- Use `findByID({ disableErrors: true })`, so a missing project returns null while database errors throw (and are retried).
- Add `AbortSignal.timeout(10_000)` to both fetches.
- The submit route runs only its own job with `payload.jobs.runByID({ id: job.id })`. That call overrides access, so F1 doesn't affect it. The autoRun cron stays as the retry path.
- `.env.example`: `RESEND_API_KEY` is required in production whenever a studio routes contact to email. Without it, email jobs fail loudly and wait in Jobs.

**F14 (DRY, minor, mechanical). Small helpers are copied around.**
- About 12 local relation-ID helpers duplicate `extractID` from `payload/shared`: `validateReportStatus.ts:7`, `promoteIssueReport.ts:13`, `revalidateIssueLanding.ts:28`, `revalidatePatchNotes.ts:26`, both submit routes, `site-generator/service.ts:32`, `context.ts:12`, `validateUniqueSlugPerProject.ts:17`, `GamePages/index.ts:101`, `tenantAccess.ts:40` and `tenantRoles.ts:19`.
- The same-project `filterOptions` is identical in `Issues/index.ts:121-126` and `IssueReports/index.ts:62-67`.
- Three helpers each resolve a project slug and revalidate `/g/<slug>` (`revalidateGamePage.ts:9-18`, `revalidateIssueLanding.ts:31-39`, `revalidatePatchNotes.ts:20-23`).

Fix: use `extractID` everywhere (guarding nulls), one `sameGameProjectFilter` in `src/fields/`, and one `revalidateGameLanding(gameProject, payload)` in `src/hooks/` (F4 uses it too). The type checker verifies the change.

*Added or promoted in revision. Numbers stay stable so the review references still resolve.*

**F21 (bug, SSRF). Contact delivery POSTs to any URL a studio member saves.** `contact.discordWebhookUrl` accepts any http(s) URL (`GameProjects/index.ts:220-229`, `lib/validation/url.ts`). The Discord task POSTs the player's message there from the server (`jobs/contact.ts:153`), following redirects. Any studio member can point the server at internal or third-party endpoints (Fable MISSED 1, Astra MUST-FIX 3).

Fix: enforce the destination at save time, and again at the outbound request.
- `src/lib/validation/discordWebhook.ts`: `isAllowedDiscordWebhookUrl(url)` accepts only `https:` URLs with host `discord.com`, `discordapp.com`, `ptb.discord.com` or `canary.discord.com`, no port, no credentials, and a path starting with `/api/webhooks/`. It sits next to the existing Tally host validator.
- There's one test override: a URL whose origin equals `DISCORD_WEBHOOK_TEST_ORIGIN` exactly. Only the E2E webServer sets it, and production never does. It allows a single origin, not a host pattern.
- The field `validate` applies the check when `siblingData.target === 'DISCORD_WEBHOOK'`. That way a stale value in the hidden field doesn't block saving a project that routes elsewhere.
- The task checks again before it sends, which also covers values stored before this fix. It then fetches with `redirect: 'error'` and F13's timeout. A failure throws (F13), so it's loud and the job is kept.

**F22 (bug). A studio can't delete an issue once a player has voted on it.** `issue_votes.issue_id` is `NOT NULL`, but its foreign key is `ON DELETE SET NULL` (Payload's default for relationships; confirmed in the mission database's `pg_constraint`). Deleting a voted issue raises a not-null violation, and the owner's delete returns 500.

Fix: an Issues `beforeDelete` hook, `deleteIssueVotes`, runs `req.payload.db.deleteMany({ collection: 'issue-votes', where: { issue: { equals: id } }, req })` inside the delete's own transaction.
- It uses the adapter call, not `payload.delete`, so it skips F4's per-vote counter and revalidation hooks on an issue that is being deleted. The Issue's own `afterDelete` revalidates.
- The issue was already authorized by the delete's tenant-scoped access, and its votes belong to it.
- No schema change. A cascading foreign key would be reverted by Payload's schema snapshot on the next `migrate:create`.

**F24 (bug, rule 2; found in Step 2). A studio user can write documents into another studio's tenant.** `bOwner` creates an issue with `tenant: A` and A's `gameProject` → 201, and moves its own issue into tenant A → 200 (S1.2). The same path is open on every tenant-scoped collection whose create/update is `tenantMemberAccess` (game-projects, game-pages, patch-notes, issues, issue-reports, media).
- The plugin's tenant field has `filterOptions: { id: { in: userTenants } }`, but it also sets its own `validate` (`plugin-multi-tenant/dist/fields/tenantField/index.js:103-107`, presence only). A custom `validate` replaces Payload's relationship validator, and that validator is what enforces `filterOptions` on the server (`payload/dist/fields/validations.js:404+`). So `filterOptions` only narrows the admin dropdown.
- The collection-level constraint `withTenantAccess` adds is a `Where`. On create, Payload treats a `Where` as "allowed"; on update, it matches the stored document, not the incoming data.
- The `gameProject` filter the plugin adds is relative to the document's own `tenant`, so a consistent pair (tenant A + A's project) passes. That's why `tenant: B` + A's project → 400 but `tenant: A` → 201.

Fix: root `tenantField: { validate }` in the plugin config, so every tenant-scoped collection (and `payload-folders` after F11) gets it. It is the plugin's documented override, and the plugin still runs its presence check after it.
- `validateTenantMembership` (in `src/access/tenantAccess.ts`): true when there's no `req.user` (Local API system writes such as votes and seeds), when the user is a super admin, or when `extractID(value)` is one of `getTenantIDsByRole(user)`. Otherwise "You can only assign documents to your own studio."
- No schema change. Studio users only ever pick their own tenants in the admin UI, so nothing legitimate changes.

**F15 (real violation, rule 8). Production silently skips Turnstile and rate limiting when their credentials are missing.** `verifyTurnstile.ts:22-23` and `rate-limit.ts:29-30` fail open in every environment. Their own comments say the skip exists for local development ("production MUST set UPSTASH…"), and patterns.md says to fail closed on security paths (Astra MUST-FIX 2).

Fix: fail closed and loud in production only.
- `verifyTurnstile`: when `TURNSTILE_SECRET_KEY` is unset and `NODE_ENV === 'production'`, throw "TURNSTILE_SECRET_KEY is not set; refusing public form submissions".
- `checkRateLimit`: when Upstash isn't configured in production, throw unless `RATE_LIMIT_OPTIONAL=1`. That flag is E2E-only: there's no local Upstash without Docker, and S4.6's parallel votes would exceed the 10-per-minute vote limit anyway.
- Development keeps today's skip.
- The contact, report and vote routes already catch, report to Sentry and return an error (`contact/submit/route.ts:152-162`, `vote/route.ts:121-124`). F12's `guardPublicForm` lets the throw propagate to that catch. Site generation without Upstash fails the same way.
- The page's Turnstile widget reads the site key at runtime in the Docker image. Next only inlines `NEXT_PUBLIC_*` values that are defined at build time (`next/dist/lib/static-env.js`), and `.dockerignore` keeps `.env` out of the build. So production needs just the two runtime variables.
- The deploy runbook (`docs/deploy.md` step 5) lists Upstash but not Turnstile. It gets both Turnstile keys, and Resend (F13). Q1 records the deploy prerequisite.

**F16 (real violation, rule 8). `form-submissions` create is an anonymous form endpoint with no Turnstile or rate limiting.** It's the unused Payload website-template form builder (`plugins/index.ts:114-139`). It only accepts submissions for forms a super admin created.

Fix: `formSubmissionOverrides.access.create: superAdminOnly`, as part of F2. It's one line, and Local API creates are unaffected. A Form block on a live marketing page would now get 403 for anonymous visitors; Q2 asks. Removing the surface is still Q2's schema decision.

**Leave as is (with reasons):**
- **F17.** The admin kanban ignores the admin tenant selector: the custom list view bypasses the plugin's `baseFilter` (`list.tsx:28-37`). Nothing leaks, since access still applies. It belongs to the open kanban remediation plan.
- **F18.** `revalidatePath` in `afterChange` runs before the REST operation's transaction commits. A render in that window of a few milliseconds can re-cache old data for up to an hour. This is Payload's standard pattern.
- **F19.** `site-generator/context.ts:78` filters media by `tenant`. That narrows the plugin-enforced scope (`overrideAccess:false, user`) to the page's tenant, which the plugin can't infer for a user in several tenants. It doesn't bypass rule 2.
- **F20. None of the 5 React-hooks lint warnings is a bug.** All are in Payload-template marketing code, not on portal or admin screens:
  - `providers/Theme/index.tsx:51` and `ThemeSelector/index.tsx:33` read `localStorage` after mount. That's the hydration-safe pattern and costs one extra render.
  - `Header/Component.client.tsx:28` copies context into state, which is harmless.
  - `components/Card/index.tsx:38,70` are false positives: the code passes ref objects to `ref`, it doesn't read `.current`.

  The 25 `no-unused-vars` warnings come from generated migration signatures (left alone) and from files this pass deletes.
- **F23.** `src/app/api/seed/critter-connect/route.ts` is a production route that writes a demo tenant's projects, pages and notes through the Local API. It's gated only by the `CRON_SECRET` bearer (and refuses when the secret is unset). Removing it is a product decision, so it's listed with the template surface in Q2 (Fable MISSED 2). The E2E env's empty `CRON_SECRET` disables it.
- **Other `NOT NULL` + `ON DELETE SET NULL` foreign keys** (`issues.game_project_id`, `issue_reports.game_project_id`, `users_tenants.tenant_id`, `form_submissions.form_id`). Deleting a project, tenant or form that still has children fails with a database error instead of a clear message. That blocks destructive deletes rather than orphaning data. These are rare, owner or super-admin only actions, unlike F22's routine issue cleanup.

**Verified fine:**
- Access on tenant collections. The plugin ANDs `tenant in user.tenants` onto every read, update and delete, and validates the `gameProject` relationship's `filterOptions` on the server, so a `gameProject` from another tenant than the document's is rejected (`plugin-multi-tenant/dist/utilities/withTenantAccess.js`, `addFilterOptionsToFields.js`, `payload/dist/fields/validations.js:404+`). **Correction (Step 2):** the `tenant` field itself is not validated against the user's tenants; see F24.
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

**Safety.** The reset only ever targets `E2E_DATABASE_URL`, which is required. The webServer maps it to `DATABASE_URL` for the reset, the build and the server. `playwright.config.ts` refuses to start, with "this database is dropped on every run", unless all of these hold (Astra SHOULD-CONSIDER 3):
- `E2E_DATABASE_URL` is set.
- Its database name ends in `_e2e`.
- It names a different database than `.env`'s `DATABASE_URL`.

Where to point it:
- For this mission: a dedicated `critwire_m_architecture_pass_e2e`, created once with `createdb` (the `critwire` role has CREATEDB). The mission database stays intact for `migrate:create`, `migrate` and `pnpm build`.
- On the owner's machine: `createdb critwire_e2e`.
- A separate database role isn't worth it: role management lives outside the repo, and the name guard already stops the realistic mistake.

**Fixtures.** `tests/e2e/auth.setup.ts` is the `setup` project, so it shows up in the report with its own trace.
- It calls `POST /api/users/first-register` to create the super admin. Anything other than 200 fails fast with "E2E database is not fresh". (Planner fix: Payload 3.85.2 answers 200 on success and 403 once a user exists, `payload/dist/auth/endpoints/registerFirstUser.js:42`; the original text said 201.)
- As the super admin, it creates tenants A and B and the users `aOwner`, `aMember` (tenant A) and `bOwner` (tenant B).
- It logs each user in and writes `test-results/.auth/<role>.json` (storageState) and `test-results/.auth/world.json` (tenant IDs and JWTs).
- Each spec creates its own game projects and content in `beforeAll` over REST, as the owning studio user, with slugs unique to that spec. Specs stay independent, and hooks and revalidation run inside the real server.

**Tenant resolution.** Public tests address the two studios by their two game slugs. API tests authenticate with each role's JWT. Single-tenant users don't need a `payload-tenant` cookie.

**Turnstile.** The E2E env uses Cloudflare's documented test keys:
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA` (always passes; baked in at build time)
- `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`

Browser tests run the real widget and the real `siteverify` call. API tests send the dummy token `XXXX.DUMMY.TOKEN.XXXX`. "No token → 400" proves Turnstile is enforced. There's no Turnstile toggle: the E2E build runs production's own path (F15), just with test keys. This needs outbound HTTPS to challenges.cloudflare.com; if it's unreachable, the form tests fail loudly at the "token issued" step.

**Upstash.** Left empty, with `RATE_LIMIT_OPTIONAL=1`, the explicit opt-out F15 adds. Without it the production build would refuse every rate-limited request. Rate limiting isn't covered by E2E, because there's no local Upstash without Docker. This is a documented gap.

**Other external services.** The webServer env forces these off with `''`. Next's env loader only fills variables that are `undefined` (`@next/env`), so a developer's `.env` can't switch them back on:
- `R2_*`: media goes to local disk.
- `RESEND_API_KEY`: email contact jobs fail and stay in Jobs (F13, S5.6).
- `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`: Sentry is disabled, and without an auth token nothing is uploaded.
- `OPENAI_API_KEY`: the site generator returns 503.
- `UPSTASH_*` and `CRON_SECRET`.
- Stripe isn't integrated, so nothing to do.

The env also sets:
- `NEXT_PUBLIC_SERVER_URL=http://localhost:<port>` and `PORT`
- `PREVIEW_SECRET=e2e-preview-secret`
- `SKIP_BUILD_STATIC_GENERATION=1` for `next build` only, set inline in `e2e:server`, as the Dockerfile's build stage does (Step 5: set for `next start` too, it made on-demand marketing renders fail with `DYNAMIC_SERVER_USAGE`)
- `RATE_LIMIT_OPTIONAL=1` (F15)
- `DISCORD_WEBHOOK_TEST_ORIGIN=http://127.0.0.1:<E2E_PORT+1>` (F21)

`PAYLOAD_SECRET` comes from `.env`; tests also use it to sign a site-preview token with the imported `signSitePreviewToken`. Contact delivery is tested with a Discord target pointed at a local HTTP sink that the spec runs on that fixed origin (`support/env.ts` derives the port; `workers:1` means nothing else competes for it). It's the only non-Discord destination the server accepts.

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
- `e2e:server`: only Playwright's webServer invokes it, with the E2E env: `payload migrate:fresh --force-accept-warning && ([ "$E2E_SKIP_BUILD" = 1 ] || SKIP_BUILD_STATIC_GENERATION=1 next build) && next start`. `E2E_SKIP_BUILD=1` is for iterating on specs only, never for verification. It reuses the previous build and its page cache.
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
- `.env.example`: add `E2E_DATABASE_URL` with the warning that the database is dropped on every run and its name must end in `_e2e`. Add `RATE_LIMIT_OPTIONAL` and `DISCORD_WEBHOOK_TEST_ORIGIN`, commented out and marked "E2E only; never set in production".
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
3. Roles: `aMember` deleting an issue → 403. `aOwner` deleting an issue that has a player vote → 200, and its vote rows are gone (counted as super admin). [F22]
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

   Also, anonymous `POST /api/form-submissions` → 403. [F16]
8. Slugs: a duplicate issue slug in one project → 400; the same slug in another project → 201.
9. Preview, in the browser. The super admin has saved a draft title on a published marketing page, and a never-published post exists.
   - `/next/preview?previewSecret=…` → 403, both anonymously and with `bOwner`'s session. [F10]
   - `bOwner` enters Draft Mode through `/next/site-preview` for B's own page. Then:
     - A's landing page shows A's published heading, not A's saved draft.
     - The marketing page shows its published title, not the draft. [F10]
   - The super admin, through `/next/preview`, sees the marketing draft.
   - A marketing page with an Archive block doesn't list the never-published post. [F10]
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
   - The same 8 tokens withdraw in parallel: all return 200, and `upvoteCount` = 0 = the vote rows (Astra SHOULD-CONSIDER 2).
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
   - The webhook points at the local sink (`DISCORD_WEBHOOK_TEST_ORIGIN`). A browser submit shows "Message sent".
   - The sink received exactly one embed, with the subject, message and game name.
   - The webhook URL never appears in the page HTML or in anonymous REST responses. [guard F3]
   - The webhook points at a sink path that answers 307 to a second sink path. After a submit, the second path received nothing, and the job is not complete (super admin, `payload-jobs`). [F21]
5. Routing variants:
   - `EXTERNAL_URL` → a link, no form.
   - `TALLY` → an iframe with `data-tally-src` on `tally.so/embed/<id>`.
   - `https://evil-tally.so/r/x` is rejected on save (400).
   - With target `DISCORD_WEBHOOK`: `https://discord.com/api/webhooks/1/abc` saves; `http://169.254.169.254/latest/meta-data/` and `https://discord.com.evil.test/api/webhooks/1/x` → 400. [F21]
   - `EMAIL` with no address → "not configured", and a submit → 400.
   - Short message → 400. No token → 400.
6. Email routing without Resend (the E2E env has no key) [F13]:
   - Target `EMAIL` with an address: a submit → 200.
   - As super admin, `payload-jobs` still holds the `email-contact-form` job, with the player's message in `input`, no `completedAt`, and a failed entry in `log`. Today the job "succeeds" and is deleted.

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
- production refusing forms when credentials are missing (F15): covering it would take a second server build. The check is one guarded branch in each of `verifyTurnstile` and `checkRateLimit`.
- the upvote reconciliation migration (F4): E2E runs it on an empty database, so the Step proves it on the mission database
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
1. **Harness.** Config (with the `_e2e` database guard), scripts, `support/*` and `auth.setup.ts`. Put `E2E_DATABASE_URL` in `.env.example` and in the worktree `.env`, pointing at `critwire_m_architecture_pass_e2e` (`createdb` it first). The webServer env includes `RATE_LIMIT_OPTIONAL=1` and `DISCORD_WEBHOOK_TEST_ORIGIN`. Delete the template specs, `tests/helpers/` and `test.env`. Proof: the setup project passes on a fresh database, and no `dev` row exists afterwards.
2. **Access and security.** In order:
   - F1, including Jobs admin visibility for super admins
   - F2 (`superAdminOnly`, `superAdminOrPublished`) with F16 (form-submissions create)
   - F9
   - F10 (`getPreviewUser` shared, marketing reads authorized, super-admin-only `/next/preview`, `ArchiveBlock`)
   - F11 (plugin config, migration, `generate:types`, `generate:importmap`)
   - F15 (production refusal in `verifyTurnstile` and `checkRateLimit`)

   Scenario S1.
3. **Public reads and revalidation.** F3 (`overrideAccess:false` helpers, `getContactRoute`, RSS reuse), F7, F8. Scenarios S2 and S3.
4. **Voting.** F4 (IssueVotes counter hooks, thin route, the `reconcile_issue_upvote_counts` migration and its psql proof), F22 (`deleteIssueVotes`), and the shared `revalidateGameLanding` from F14. Scenarios S4 and S1.3.
5. **Reports and contact.** In order:
   - F5 (promotion in `beforeChange`, `req` in `uniqueIssueSlug`)
   - F12 (`guardPublicForm`, `formResponse`, `TurnstileField`, the provider check)
   - F13 (deliver or throw, `runByID`, timeouts)
   - F21 (`isAllowedDiscordWebhookUrl` at save and at send, `redirect: 'error'`)

   Scenario S5.
6. **Kanban.** F6, including serialized moves. Scenario S6.
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
     - the hook list: IssueReport promotion in `beforeChange`; IssueVote hooks own `upvoteCount` through `$inc`; Issue `beforeDelete` removes its votes
     - public portal reads use `overrideAccess:false`, and privileged reads live only in named helpers. Draft Mode reads authorize the preview user.
     - jobs are super-admin only, and folders are tenant-scoped
     - contact tasks deliver or throw; how a super admin recovers a failed job
     - Discord destinations are restricted; production refuses forms without Turnstile or Upstash
   - `.env.example` and `docs/deploy.md` step 5 list as production-required:
     - `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
     - Upstash
     - `RESEND_API_KEY`, when email routing is used
   - Drop the "fail open / succeed without it" wording.
10. **Final checks.** `tsc`, lint, `test:int`, `test:e2e` (then copy the artifact), and `pnpm build` last, so `.next` doesn't keep the public env values baked in by the E2E build.

**Migrations:** two, each created with `pnpm payload migrate:create` on the mission database with no `dev` row:
- `tenant_scoped_media_folders` (F11, adds `payload_folders.tenant_id`). This is the only schema change.
- `reconcile_issue_upvote_counts` (F4). It's data only: a blank migration with the SQL above and a no-op `down`, created after F11's so it sorts later.

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
- Keeping Turnstile and Upstash fail-open in production with only a Sentry alert (F15): it still runs forms unprotected, against rule 8, patterns.md and the code's own comments.
- Failing startup when form credentials are missing (F15): it would take the portals and admin down over a forms-only problem. Refusing per request is proportional, and it still reaches Sentry.
- Protecting form-submissions with Turnstile and rate limiting (F16): that needs a widget in the template Form block and a new hook, for a surface no product flow uses. Disabling anonymous create is one line, and Q2 covers bringing it back.
- Checking the Discord URL only at save time (F21): stored values and redirects would still reach arbitrary hosts. The outbound request needs the check too.
- Accepting any `127.0.0.1` port for the test sink: broader than needed. One exact origin is enough.
- Recounting votes in the hooks on every vote, instead of reconciling once (F4): that brings back the race F4 removes.
- Reconciling counts in a startup task or an admin endpoint: new surface. A migration runs exactly once per database, at deploy.
- `{ state: 'failed' }` from contact tasks (F13): deprecated in Payload 3.85. Throwing is the supported path.
- `ON DELETE CASCADE` for issue votes by migration (F22): Payload's schema snapshot would put `SET NULL` back on the next `migrate:create`.

### Owner questions (copy to Questions for the owner)
- **Q1.** Deploy prerequisite (F15, F13). This branch makes production refuse public form submissions and votes when their protection isn't configured, instead of silently skipping it. Before deploying, set these in production `.env`:
  - `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
  - `RESEND_API_KEY`, if any studio routes contact to email. Without it, those messages now wait in Jobs rather than vanishing.

  The old runbook listed Upstash but not Turnstile or Resend. Recommendation: set them. Say so if you'd rather keep fail-open.
- **Q2.** Should we remove the unused Payload website-template surface (posts, categories, forms and form-submissions, search, redirects, header/footer, the post routes) and the `api/seed/critter-connect` route (F23)? It needs a migration. Meanwhile, anonymous form-submissions are now refused (F16). If the live marketing site has a Form block visitors use, tell us, and we'll add Turnstile and rate limiting to it instead. Recommendation: remove the surface.
- **Q3.** After F11, any media folders already in production have no tenant, so only super admins can see them until someone assigns one. Do they need a backfill?
- **Q4. Nothing under `/g` is actually cached.** The patch-notes pages and RSS feed declare `revalidate = 3600`, but with no `generateStaticParams` Next renders them on every request (the build lists them as ƒ), so each portal view hits Postgres. Adding `export async function generateStaticParams() { return [] }` to the patch-notes feed, pagination, detail and RSS routes would make them on-demand ISR, and the revalidation hooks (F7 and the existing patch-note hook) already keep them fresh. The landing and issue pages stay dynamic, because they read Draft Mode and cookies. This is a performance change, not a bug, so the mission doesn't make it. Recommendation: do it after this branch merges, with S3 as the guard. Not blocking.
- **Note (formerly Q4, resolved by F21).** A project whose saved `discordWebhookUrl` isn't a Discord webhook stops receiving contact messages. Its jobs fail loudly and stay recoverable.

## Architecture review (Fable)

VERDICT: APPROVE

MUST-FIX: none

MISSED:
1. **SSRF through `contact.discordWebhookUrl`** (`GameProjects/index.ts:220-228`, `jobs/contact.ts:153`). The field accepts any http(s) URL (`lib/validation/url.ts`) and the job POSTs the player's message to it from the server, so any studio member can point the server at internal or third-party HTTP endpoints. The E2E design relies on this looseness (the local webhook sink in S5.4), so don't tighten it in this pass; record it as **Q4** for the owner: restrict to `https://discord.com/api/webhooks/` (and `discordapp.com`) in production, which would require the E2E sink to move behind a host allowlist.
2. **`src/app/api/seed/critter-connect/route.ts`** is not in the findings. It is a production route that creates and updates a demo tenant's projects, pages and notes through the Local API, gated only by `CRON_SECRET` (the same secret as the job runner). Out of scope to remove (product decision), but the E2E env's `CRON_SECRET=''` correctly disables it, and the Summary should list it as leftover surface next to Q2.
3. **F5 detail.** `uniqueIssueSlug` (`promoteIssueReport.ts:46-55`) calls `req.payload.find` without `req`. In the new `beforeChange` design pass `req` so the lookup runs in the same transaction as the Issue create; otherwise it reads outside the transaction (harmless today, wrong by construction).

SHOULD-CONSIDER:
1. **Harness proof for `migrate:fresh`.** `migrateFresh` calls `dropDatabase` (drops and recreates schema `public`), which needs the DB role to own the schema. The Baseline only ran `migrate`; make Step 1's proof include one `payload migrate:fresh --force-accept-warning` run against `critwire_m_architecture_pass` before writing the config around it.
2. **Pipe the webServer output.** Playwright ignores webServer stdout by default; with `next build` inside the command, set `webServer.stdout: 'pipe'` so build failures and timing land in `run.log` (the artifact).
3. **F4 DRY.** Put the `$inc` write in one `adjustUpvoteCount({ issueID, delta, req })` used by both IssueVotes hooks, and pass `select: { upvoteCount: true }` so the hook can return the post-write count without a second read. `$inc` is supported by the Postgres adapter (`@payloadcms/drizzle/dist/transform/write/traverseFields.js:592`), and `db.updateOne` does not touch `updatedAt`, so S4.6's `updatedAt` assertion is sound.
4. **F11 migration ordering.** The plugin's folder `tenant` field validates presence rather than `required: true` (`plugin-multi-tenant/dist/fields/tenantField/index.js:103-107`), so the generated column is nullable and the migration is safe on a production DB with existing folders (Q3 stays a visibility question only). Generate it with `migrate:create` on a DB with no `dev` row, then `generate:types`; note that order in the Steps.
5. **S2.3 contrast check.** Measuring 4.5:1 from `getComputedStyle` works but couples the test to the palette derivation; asserting the derived button colours match the template's documented fallback pair is less brittle and still catches the regression that `site-template.int` guarded.

Verification notes (what I checked): F1 (`payload.config.ts:103-124`, no `jobsCollectionOverrides`; Payload's jobs collection carries no `access` block so `defaultAccess` applies), F2 (Posts, Categories, Header, Footer, plugin overrides), F3 (all five call sites default to `overrideAccess: true`; field access on `contact.email` / `discordWebhookUrl` is `tenantMemberFieldRead`; the multi-tenant plugin passes anonymous reads through unchanged, so `overrideAccess:false` yields exactly the public filter), F4 (three separate Local API calls; recount-then-update), F5 (create without `req`, `setTimeout` self-update), F6 (`updateIssue(...).catch` inside `setColumns` updaters; `reactStrictMode: true`), F7 (`revalidatePath('/g/<slug>')` only, while patch-notes pages and feed are `revalidate = 3600`), F8 (`req.data` gate; Local API never sets `req.data`), F9 (both fields restrict `update` only), F10 (`user = await payload.auth(...)` assigns the result object), F11 (`folders: true`, folders not in the plugin config; plugin supports `payload-folders` explicitly), F12 (byte-identical helpers; report route never reads `reportForm.provider`), F13 (`sent: true` without `RESEND_API_KEY`; `jobs.run({ limit: 10 })` in the request). Dropping the `/g/<slug>/issues` revalidation in F5 is correct: both issues pages are `force-dynamic`. Harness: `migrate.js` sets `PAYLOAD_MIGRATING` and accepts `--force-accept-warning`; `next start` only warns on `output: 'standalone'`; `payload.jobs.runByID` exists in 3.85.2; Playwright runs plugin setup (webServer) before `globalSetup`; Chromium accepts `Secure` cookies on `http://localhost`; `test-results/` and `playwright-report/` are gitignored. Scope: no new features; the one schema change (F11) fixes a real cross-tenant access hole; all other changes are access, hook and helper changes with behaviour preserved except for the listed bugs.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **F2/F10 leave marketing drafts exposed.** Any authenticated studio user can still enable Draft Mode, and marketing queries use `overrideAccess: draft`. Enforce super-admin authorization for marketing previews and authorize draft reads themselves.
2. **F15/F16 explicitly retain violations of AGENTS.md rule 8.** Missing production credentials must reject submissions or fail startup. Protect or disable public `form-submissions` creation; removing its schema is unnecessary.
3. **Q4 preserves an SSRF vulnerability for test convenience.** Restrict Discord delivery destinations, including redirects, at the outbound request boundary. Adapt the test sink without allowing arbitrary production destinations.
4. **F13 still loses undelivered messages.** Returning `output: { sent: false }` marks the Payload task successful, preventing retries. Missing delivery configuration must produce a failed job with retained input and a recovery path.
5. **F4 requires an existing-count reconciliation.** The old recount can commit stale values—the finding itself establishes this. Switching to increments preserves that error indefinitely. Reconcile counts against vote rows during a controlled cutover.

SHOULD-CONSIDER:

1. Serialize overlapping kanban mutations or reconcile from the server; restoring an old snapshot can erase a later successful move.
2. Test concurrent vote removals as well as insertions, and failed report promotion rollback.
3. Strengthen destructive E2E reset isolation with a dedicated database role and explicit disposable-database validation.

## Revision notes

One revision round. Every Astra MUST-FIX was checked against the code; all five hold and are designed in.

**Astra MUST-FIX**
1. **Marketing drafts through Draft Mode: accepted.** Confirmed: `/next/site-preview` hands any studio user the site-wide Draft Mode cookie, and the marketing queries then read with `overrideAccess: draft`.
   - Changed F10: marketing reads now go through access with the preview user, drafts only for super admins; `/next/preview` is super-admin only; `ArchiveBlock` gets `overrideAccess:false`. It turned out to leak never-published posts too.
   - Extended S1.9.
2. **Rule 8: accepted, as the smallest safe version.**
   - F15 is promoted to a fix. Production (`NODE_ENV=production`) throws when `TURNSTILE_SECRET_KEY` or Upstash is missing. The routes' existing catch turns that into Sentry plus an error response. Development is unchanged.
   - The only opt-out is `RATE_LIMIT_OPTIONAL=1`, for E2E: there's no local Upstash, and S4.6 exceeds the vote limit.
   - Why not keep treating it as a question: the code's own comments say the skip is for local development. The branch only goes live when the owner merges it, and the failure is loud. The real risk is a deploy prerequisite, since the runbook never listed Turnstile. So Q1 is reworded into that prerequisite, and `docs/deploy.md` gets the variables.
   - I checked that the Docker image can take the site key at runtime (`next/dist/lib/static-env.js` only inlines defined values; `.env` is dockerignored).
   - Failing at startup was rejected: it would take portals and admin down over forms.
   - F16 is promoted to a fix: form-submissions `create` becomes super-admin only. Q2 asks whether a live Form block exists.
3. **Discord webhook SSRF: accepted.** New F21: an allowlist validator at save time, the same check at send time, `redirect: 'error'`, and one exact test origin (`DISCORD_WEBHOOK_TEST_ORIGIN`) that production never sets. Harness, S5.4 and S5.5 updated. Q4 is removed and replaced by a deploy note.
4. **Contact jobs "succeed" without delivering: accepted.** Payload semantics confirmed (`handleTaskError.js`: a final failure sets `hasError` and keeps the job with its input; only successful jobs are deleted).
   - F13 now delivers or throws.
   - Recovery: F1 shows Jobs to super admins, who untick `hasError` after fixing the configuration.
   - New scenario S5.6.
5. **Upvote reconciliation: accepted.** F4's claim that existing counts are valid was wrong: the old recount can leave a stale last write, as F4 itself describes.
   - Added the data-only migration `reconcile_issue_upvote_counts`, tenant-scoped, running once through `prodMigrations` before the new code serves.
   - The Step proves it with psql. The Migrations line now reads "two", and still has one schema change.

**Found while verifying**
- F22: `issue_votes.issue_id` is `NOT NULL` with `ON DELETE SET NULL` (checked in `pg_constraint`), so an owner can't delete any voted issue. Fixed with a `beforeDelete` hook. Tested in S1.3.

**Fable MISSED**
1. Now F21 (above).
2. Recorded as F23 under "leave as is", and added to Q2.
3. Folded into F5 (`req` passed to `uniqueIssueSlug`).

**Astra SHOULD-CONSIDER**
1. Taken: F6 serializes moves.
2. Parallel withdrawals taken (S4.6). Promotion-rollback test not taken: it needs a failure injected after the Issue create, which means test-only code. The single `beforeChange` write is what guarantees atomicity.
3. Partly taken: a dedicated `_e2e` database with a name and difference guard. A separate database role isn't worth it (see the harness Safety notes).

Fable's SHOULD-CONSIDER items are left to the planner.

## Steps

24 steps, one per session. The E2E harness and coverage come first. Fixes land with, or right after, the scenario that proves them. Steps 17a–17c carry out the owner's H1 and H2 answers. Tests are deleted only after the suite is green (Steps 18–19).

### How every step runs

- Shell helpers, from the repo root:
  ```bash
  cd /srv/critter-ai/worktrees/architecture-pass
  DB=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)          # mission DB, never reset
  E2E_DB=$(grep '^E2E_DATABASE_URL=' .env | cut -d= -f2-)  # dropped on every E2E run (from Step 1)
  PROOFS=/srv/critter-ai/agent-state/missions/architecture-pass/proofs   # mkdir -p once
  ```
- **Standard checks** end every step unless the step says otherwise. Run them one at a time:
  1. `pnpm exec tsc --noEmit` → 0 errors.
  2. `pnpm lint` → 0 errors, and the warning count never goes up.
  3. `set -o pipefail; pnpm test:e2e 2>&1 | tee /tmp/e2e-step<N>.log` → exit 0. This is the full suite, on a freshly reset E2E database, with a fresh build. 0 failed and 0 flaky; the only expected-to-fail tests are the ones still annotated.

  The Log line records passed and expected-fail counts and wall time.
- **Expected-failure convention.** Sometimes a spec lands in an earlier step than its fix. Then each test that exposes a finding is a separate test, tagged in its title (`… [F11]`), and starts with `test.fail(true, 'F11: fixed in Step 4')`.
  - Before committing, read each failure in the list output and confirm it shows the finding's symptom (for example "expected 403, received 201"), not a bug in the test.
  - The fixing step deletes the `test.fail` line. If the test then doesn't pass, Playwright fails the run, so no annotation can be forgotten.
  - When a spec and its fix land in the same step, don't annotate. Run the spec before the fix, list the failing tests in the Log, then fix.
- **Dev-row gotcha.**
  - Never run `pnpm dev`.
  - Until Step 18, never run the full `pnpm test:int`: `tests/int/api.int.spec.ts` dev-pushes into the mission DB. Run single files instead: `pnpm test:int tests/int/<file>`.
  - Before any `pnpm payload migrate` or `pnpm build`, run `psql "$DB" -c "delete from payload_migrations where name='dev'"`.
- `E2E_SKIP_BUILD=1 pnpm test:e2e <spec>` is only for iterating on a spec right after a full run. Never use it for a step's verification: it reuses `.next`, with the env the last E2E build baked in.
- Heavy jobs (E2E, build, migrate) run one at a time.
- Code a step touches uses `extractID` from `payload/shared` instead of a local relation-ID helper (F14), so Step 17 only has to sweep what's left.

### Planner decisions

The session that carries out the affected step copies the matching line into **Decisions**.

- **Fable SHOULD-CONSIDER 1: taken (Step 1).** Prove `payload migrate:fresh --force-accept-warning` against the E2E database before building the config around it. That is the database the harness drops; the mission database is never reset.
- **SC2: taken (Step 1).** Set `webServer.stdout: 'pipe'`; stderr is piped by default. Build output and timings then land in `run.log`.
- **SC3: taken, with one change (Step 9).**
  - One `adjustUpvoteCount({ issueID, delta, req })` serves both IssueVotes hooks, using `$inc`.
  - Its `select` asks for the issue's `gameProject` and `isPublic`, so the landing can be revalidated without a second read.
  - The helper itself returns nothing (CQS). A hook's return value can't reach the route anyway, so the route reads `upvoteCount` after the write, as F4 already specifies.
- **F4 refinement (Step 9): the decrement runs in `beforeDelete`, not `afterDelete`.**
  - The race: `@payloadcms/drizzle/dist/deleteOne.js` never checks how many rows `deleteWhere` removed, and `deleteByID` runs `afterDelete` regardless. Two concurrent withdrawals with the same cookie both pass the existence check. The second DELETE waits for the first, removes 0 rows, and would still decrement.
  - Why `beforeDelete` fixes it: there, the `$inc` takes the issue's row lock before `deleteByID` re-reads the vote (`payload/dist/collections/operations/deleteByID.js:44-76`). The second request waits, then finds no vote, throws NotFound, and rolls back its own decrement.
  - S4.6 gets a same-cookie parallel-withdrawal case.
- **SC4: taken (Step 4).** In order: clear the `dev` row, `migrate:create`, read the SQL, `migrate`, check with psql, then `generate:types` and `generate:importmap`.
- **SC5: rejected (Step 6).**
  - Measuring contrast from computed styles asserts the invariant (at least 4.5:1) whatever the palette. It also catches a broken CSS-variable mapping (`flagship.css:106-108`). Pinning a "fallback pair" would tie the test to the palette.
  - For the scenario's `#ffffff` there's no fallback anyway. White clears 3:1 against the `#0b0d14` background, so the derivation keeps it and only switches the foreground to `#0b1016`.
- **F3 is split.** The portal reads are Step 8. `getContactRoute`, and removing the contact and report pages' privileged re-queries, move to Step 13 with F12, so S5 covers those pages before they change.
- **Scenario additions:**
  - S1.2: a rejected cross-tenant DELETE of a voted issue leaves its votes in place. The Issue `beforeDelete` runs before the document-level access filter, so this relies on the rollback.
  - S1.9: a published post that the Archive block must list.
  - S5.3: a single write. The report's `updatedAt` in the PATCH response must equal a GET one second later; today this fails every time.
  - S5.5: the full Discord allowlist case list.
  - S4.6: parallel withdrawals with the same cookie.
- **Harness text fix.** `first-register` answers 200, not 201. The harness section is corrected.
- **H1: two steps, code first (17a), then the migration (17b).** In between, the app runs on the old schema: Payload ignores tables and nullable columns its config no longer has. This keeps each diff reviewable and gives the drop SQL its own proof. Nothing may run `migrate:create` between 17a and 17b, or it would absorb the drops. H2 (17c) comes after, so its blank migration sees no drift.
- **H1: what goes and what stays.** Goes: everything in Step 17a's delete list, which is code that only posts, categories, forms, search, redirects or the header/footer globals use. Stays:
  - Pages and everything it uses: the hero, CTA, Content and Media blocks, `link`/`linkGroup`, `plugin-seo`, `superAdminOrPublished`, `getMarketingReadOptions`, `/next/preview`, AdminBar, LivePreviewListener, HeaderTheme, `home-static` and the pages sitemap.
  - The Header and Footer components.
  - `src/seed/critterConnect.ts` and its route (H5).

  There is no template seed code to remove: `src/endpoints/seed` doesn't exist, and the critter-connect seed writes only critwire collections.
- **H1: the Archive and Form blocks leave Pages.** Archive only lists posts (filtered by categories), and Form only renders form-builder forms, so neither works without the removed collections. Existing marketing pages lose those blocks.
- **H1: the header and footer lose their nav, and nothing replaces it.** The header renders the logo link; the footer renders the logo and the theme selector. The search link goes with search. Hard-coding nav links would be a new feature.
- **H1: `link.reference` stays polymorphic, with `relationTo: ['pages']`.** A plain `'pages'` would change the stored shape (`{ relationTo, value }` to a bare id) and every `CMSLink` caller.
- **H1: rich-text internal links that can't be resolved render `'#'` instead of throwing.** `'#'` is the Lexical converter's own fallback. After the removal, a link to a post stays an unpopulated id, and today's `throw` in `internalDocToHref` would turn the whole page into a 500. The same already happens for a link to a page the reader can't see, so this fixes that too.
- **H1: E2E.**
  - S1.7's posts, redirects, header and form-submissions checks, and the F16 test, become one "surface is gone" test. A 404 for a super admin proves removal, not just denial.
  - S1.7's F2 test now guards the platform content that remains, Pages.
  - S1.9 loses its Archive test (the F10 `ArchiveBlock` fix leaves with the block), and its fixture swaps the Archive block for a Content block.
  - Net: S1 has one test fewer.
- **H1: packages whose last importer is deleted are removed** (eight, listed in Step 17a). The brief rules out dependency upgrades, not removals, and keeping unused Payload plugins installed would contradict the owner's decision.
- **H1: the drop migration deletes dangling references before the generated DDL.** That covers page relationships to posts and categories, locks on removed documents and globals, and pending `schedulePublish` jobs for posts. `payload_preferences` rows for removed collections stay, because Payload never reads them again.
- **H2: nested folders count through their media.** A folder's contents are the media in it and in all its descendant folders.
  - Counting only direct media would leave a parent that holds only one studio's subfolders without a tenant. The studio then couldn't reach its own subfolders in the folder browser.
  - Descendant folders' own tenants aren't consulted: in production, every folder is still null when this runs, right after the F11 migration.
- **H2: nothing is assigned that the contents don't justify.** A folder that already has a tenant is never overwritten, and a media item without a tenant disqualifies its folder.
- **H2: unassigned folders are printed with `payload.logger.warn`.** In production the migration runs through `prodMigrations` at boot, so the list lands in the deploy log. The Summary tells the owner to look there.

### Checklist

- [x] **Step 1: E2E harness on a fresh database**
  - **Files:**
    - `playwright.config.ts`
    - `package.json` (scripts)
    - new `tests/e2e/auth.setup.ts`
    - new `tests/e2e/support/env.ts`, `api.ts`, `fixtures.ts`
    - `.env.example`
    - the worktree `.env` (not committed)
    - delete `tests/e2e/admin.e2e.spec.ts`, `tests/e2e/frontend.e2e.spec.ts`, `tests/helpers/` and `test.env`
  - **Do:**
    1. **Pre-flight.**
       - `psql "$DB" -c 'create database critwire_m_architecture_pass_e2e'` (the `critwire` role has CREATEDB and will own it).
       - Add `E2E_DATABASE_URL` to `.env`: the `DATABASE_URL` value with the database name swapped.
       - `curl -sSI https://challenges.cloudflare.com/turnstile/v0/api.js` should return 200, because S5 needs it. If it doesn't, write it under Questions and carry on.
    2. **SC1 proof**, saved to `$PROOFS/step1-migrate-fresh.log`:
       - Note `psql "$DB" -Atc "select min(created_at) from payload_migrations"`.
       - `DATABASE_URL="$E2E_DB" pnpm payload migrate:fresh --force-accept-warning` → exit 0, with "Migrated:" for all 6 migrations.
       - `psql "$E2E_DB" -Atc "select name from payload_migrations order by id"` → 6 names, no `dev`.
       - The mission DB's `min(created_at)` is unchanged.

       If this fails (for example on schema ownership), fix it before writing any config.
    3. **`playwright.config.ts`**, as in "E2E harness":
       - Keep `import 'dotenv/config'`.
       - The guard throws "E2E_DATABASE_URL: this database is dropped on every run; …" unless the URL is set, its database name ends in `_e2e`, and it differs from `DATABASE_URL`.
       - `E2E_PORT` defaults to 3100; `baseURL` is `http://localhost:<port>`.
       - Projects: `setup` (`testMatch: /auth\.setup\.ts/`) and `chromium` (`testMatch: /\.spec\.ts$/`, `dependencies: ['setup']`, Desktop Chrome).
       - Reporters, `use`, workers, retries, `forbidOnly` and timeouts as specified.
       - `webServer`:
         - `command: 'pnpm e2e:server'`, `url: <baseURL>/api/health`, `timeout: 420_000`, `reuseExistingServer: false`, `stdout: 'pipe'`, `stderr: 'pipe'`.
         - `env`: `DATABASE_URL` set to `E2E_DATABASE_URL`; `PORT`; `NEXT_PUBLIC_SERVER_URL`; both Turnstile test keys; `PREVIEW_SECRET`; `SKIP_BUILD_STATIC_GENERATION=1`; `RATE_LIMIT_OPTIONAL=1`; `DISCORD_WEBHOOK_TEST_ORIGIN=http://127.0.0.1:<port+1>`.
         - Also in `env`, set to `''`: `R2_*`, `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `OPENAI_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` and `CRON_SECRET`.
    4. **Scripts:**
       - `test:e2e` = `cross-env NODE_OPTIONS=--no-deprecation playwright test`
       - `e2e:server` = `payload migrate:fresh --force-accept-warning && ([ "$E2E_SKIP_BUILD" = 1 ] || next build) && next start`
    5. **Support files:**
       - `support/env.ts`: port, baseURL, sink origin, the dummy Turnstile token, role names and credentials, auth file paths.
       - `support/api.ts`: a REST client per role on Playwright's `APIRequestContext`, sending `Authorization: JWT <token>`. Methods: `create`, `update`, `find`, `findByID`, `remove` and `raw`. Each returns `{ status, body }` and never throws on non-2xx, so tests can assert status codes.
       - `support/fixtures.ts`: `test.extend` with `world` (reads `world.json`) and `api(role)`, both **worker-scoped** so `beforeAll` can use them. Later steps add the project factory, `lexical()`, `upload()` and `webhookSink`.
    6. **`auth.setup.ts`**, as in "Fixtures":
       - first-register expects 200
       - create tenants A and B, then `aOwner`, `aMember` and `bOwner`
       - log in every role, including the super admin
       - write `test-results/.auth/<role>.json` and `world.json`
    7. **`.env.example`:**
       - `E2E_DATABASE_URL`, with the warning that it's dropped on every run and must end in `_e2e`
       - `RATE_LIMIT_OPTIONAL` and `DISCORD_WEBHOOK_TEST_ORIGIN`, commented out and marked "E2E only; never set in production"
    8. Delete the template specs, `tests/helpers/` and `test.env`.
  - **Verify:**
    - Standard checks. The log shows `[WebServer]` build lines and `1 passed` (setup), and `playwright-report/index.html` holds the setup trace.
    - `psql "$E2E_DB" -Atc "select count(*) from payload_migrations where name='dev'"` → 0. The same query on `$DB` → 0, and `$DB`'s `min(created_at)` is unchanged.
    - Guard proof. Each of these must exit non-zero within seconds, without starting a server:
      - `E2E_DATABASE_URL="$DB" pnpm test:e2e`
      - `DATABASE_URL="$E2E_DB" E2E_DATABASE_URL="$E2E_DB" pnpm test:e2e`
    - Record the run's wall time.

- [x] **Step 2: Tenant-isolation spec, API scenarios (S1.1–S1.8, S1.10)**
  - **Files:**
    - new `tests/e2e/tenant-isolation.spec.ts`
    - `tests/e2e/support/fixtures.ts`: add a project factory (creates a game project as a given role, with a spec-unique slug) plus the issue, patch-note and report factories it needs
  - **Do:** write S1.1–S1.8 and S1.10 as in "E2E scenarios", one test per finding so expected failures are exact.
    - Pass `tenant` explicitly on every tenant-scoped create. That includes `payload-folders`, which ignores the field until F11.
    - S1.1: the `payload-folders` check is its own test [F11], annotated `test.fail` → Step 4. The other collections pass today.
    - S1.2: add a check. A's issue gets a player vote, cast through `POST /api/vote` with a fresh cookie jar. `bOwner`'s DELETE returns 403 or 404, and the vote row still exists (counted as super admin).
    - S1.3: the owner deleting a voted issue [F22] is annotated → Step 10. `aMember`'s 403 is a separate test that passes.
    - S1.6 [F9] → Step 4.
    - S1.7 becomes three tests, all annotated → Step 3:
      - jobs [F1]. The run endpoint is `GET /api/payload-jobs/run` and answers 401 when denied.
      - platform content [F2]
      - anonymous form-submissions create [F16]
    - S1.10 passes today. Send a same-origin `Origin` header, or none.
  - **Verify:** standard checks. `setup` and S1 pass, and exactly six tests are expected to fail (F1, F2, F9, F11, F16, F22). The Log line gives each one's symptom.
  - **Deviation (done):** seven expected failures, not six. S1.2's `tenant: A` case, which the plan expected to pass, exposed a new bug, F24. It's a separate test annotated → Step 3.

- [x] **Step 3: Lock system and platform collections to super admins (F1, F2, F16), and the tenant field to the user's studios (F24)**
  - **Scenarios:** remove the `test.fail` from the three S1.7 tests and from S1.2's `[F24]` test.
  - **Files:**
    - `src/access/isSuperAdmin.ts`: add `superAdminOnly: Access`.
    - `src/access/authenticatedOrPublished.ts` → `superAdminOrPublished.ts`, and its importers `Pages/index.ts` and `Posts/index.ts`.
    - `src/collections/Tenants/index.ts`, `Users/index.ts`, `Pages/index.ts`: replace each collection-level `({ req }) => isSuperAdmin(req.user)` with `superAdminOnly`. Leave the role-aware read/update functions and field-level access (`FieldAccess`) as they are.
    - `src/collections/Posts/index.ts`, `src/collections/Categories.ts`: create, update and delete.
    - `src/Header/config.ts`, `src/Footer/config.ts`: `update`.
    - `src/plugins/index.ts`: redirects writes, forms writes, form-submissions create/read/update/delete, search update/delete.
    - `src/payload.config.ts`:
      - `jobs.access.run`: super admin, or the `CRON_SECRET` bearer when the secret is set.
      - `jobsCollectionOverrides`: create/read/update/delete super admin only, and `admin.hidden: ({ user }) => !isSuperAdmin(user)`.
    - F24: `src/access/tenantAccess.ts` gets `validateTenantMembership`; `src/plugins/index.ts` passes it as the multi-tenant plugin's root `tenantField: { validate }`.
  - **Do:** access changes only, no schema change. `authenticated` stays where it's still right (Users `admin`, Media).
  - **Verify:** standard checks.

- [x] **Step 4: Field create guards, tenant-scoped media folders, production refusal (F9, F11, F15)**
  - **Scenarios:**
    - Remove the `test.fail` from S1.6 and from the S1.1 folders test.
    - F15 has no E2E scenario (documented gap), so there's a manual proof below. The E2E suite proves production still serves forms when it's configured.
  - **Files:**
    - `src/collections/GameProjects/index.ts`: `customDomainVerified.access.create` for super admins.
    - `src/collections/Issues/index.ts`: `upvoteCount.access.create: () => false`.
    - `src/plugins/index.ts`: add `'payload-folders': {}`.
    - new `src/migrations/<ts>_tenant_scoped_media_folders.ts` and `.json`, plus `src/migrations/index.ts`.
    - `src/payload-types.ts` and `src/app/(payload)/admin/importMap.js`.
    - `src/lib/turnstile/verifyTurnstile.ts` and `src/lib/upstash/rate-limit.ts`: throw in production, per F15. Only `checkRateLimit` reads `RATE_LIMIT_OPTIONAL=1`.
    - `src/environment.d.ts`: declare `RATE_LIMIT_OPTIONAL`, and the Upstash variables if missing.
  - **Do (F11, in this order, SC4):**
    1. `psql "$DB" -c "delete from payload_migrations where name='dev'"`
    2. Add the plugin entry.
    3. `pnpm payload migrate:create tenant_scoped_media_folders`
    4. Read the generated SQL. It may only add a nullable `payload_folders.tenant_id`, its foreign key to `tenants`, and an index. Anything else means the schema snapshot has drifted: stop and find out why.
    5. `pnpm payload migrate` (mission DB).
    6. `pnpm generate:types`
    7. `pnpm generate:importmap`
  - **Verify:**
    - Standard checks.
    - Migration proof, saved to `$PROOFS/step4-folders.log`: `psql "$DB" -c '\d payload_folders'` shows a nullable `tenant_id integer` with its foreign key, and `pnpm payload migrate:status` lists the migration as applied.
    - F15 manual proof, saved to `$PROOFS/step4-f15.log`. It reuses this step's E2E build; see Failure modes.
      1. Start `DATABASE_URL="$E2E_DB" PORT=3102 TURNSTILE_SECRET_KEY= RATE_LIMIT_OPTIONAL= UPSTASH_REDIS_REST_URL= UPSTASH_REDIS_REST_TOKEN= pnpm start` in the background.
      2. `curl -s -X POST -H 'content-type: application/json' -d '{"message":"hello there, studio","turnstileToken":"x"}' localhost:3102/g/any/contact/submit` → 500 `{"error":"Something went wrong."}`. The server log shows "Public contact form submission failed" with the Turnstile message.
      3. `curl -s -X POST -H 'content-type: application/json' -d '{"issueId":1}' localhost:3102/api/vote` → 500.
      4. Stop the server.

- [x] **Step 5: Authorize Draft Mode reads (F10) with its preview scenario (S1.9)**
  - **Files:**
    - `tests/e2e/tenant-isolation.spec.ts` (S1.9)
    - new `src/utilities/getPreviewUser.ts`, moved from `src/app/(public)/g/[gameSlug]/page.tsx:54-62`
    - `src/app/(public)/g/[gameSlug]/page.tsx`
    - `src/app/(frontend)/[slug]/page.tsx` (`queryPageBySlug`)
    - `src/app/(frontend)/posts/[slug]/page.tsx` (`queryPostBySlug`)
    - `src/app/(frontend)/next/preview/route.ts`
    - `src/blocks/ArchiveBlock/Component.tsx`
  - **Do:**
    1. Write S1.9 first, in the browser, using the setup project's storage states. The test signs B's site-preview token with `signSitePreviewToken` from `src/lib/security/sitePreviewToken.ts`, using `PAYLOAD_SECRET` from `.env`.
    2. Fixtures, created as super admin over REST:
       - a published marketing page whose title has a later draft
       - a marketing page with an Archive block (`populateBy: 'collection'`)
       - one published post, which the archive must list
       - one never-published post, which it must not
    3. Run it, and log the parts that fail. Expected: anonymous and `bOwner` requests to `/next/preview` get Draft Mode instead of 403; `bOwner` sees the marketing draft; the archive lists the draft post.
    4. Implement F10 as specified:
       - Marketing reads use `draft = isSuperAdmin(previewUser)`, `overrideAccess: false` and `user: previewUser`.
       - `/next/preview` destructures `{ user }`, and returns 403 with `draft.disable()` unless the user is a super admin.
       - `ArchiveBlock` reads with `overrideAccess: false`.
  - **Verify:** standard checks. All of S1 passes.

- [x] **Step 6: Portal landing spec (S2)**
  - **Files:**
    - new `tests/e2e/portal-landing.spec.ts`
    - `tests/e2e/support/api.ts`: add `upload()`, a multipart `POST /api/media` with `file` plus `_payload` JSON that includes `tenant`
    - `tests/e2e/support/fixtures.ts`
  - **Do:** S2.1–S2.6 as specified. They all pass today; they replace `site-template.int`, `site-config-schema.int`, and the SEO checks in `verify-phase3/7`.
    - S2.1: compare the rendered `main` text of the two 404s, not the raw HTML; RSC payloads differ per request.
    - S2.3 (SC5 rejected):
      - Read the rendered primary button's computed `color` and `backgroundColor`, and convert both to hex.
      - Assert `contrastRatio(fg, bg) >= 4.5`, using the pure helper in `src/site-templates/flagship-game-v1/schema/contrast.ts`; it imports nothing from Payload.
    - S2.4:
      - Build the publish body the way the admin sends it: array rows with an `id`, and the hero media id from `upload()`.
      - Each invalid variant gets its own assertion: status 400, and the public page unchanged.
  - **Verify:** standard checks.
  - **Deviation (done):** not everything passed today. S2.4 found a new bug, **F25**: `deepMerge` treated `null` as an object, so publishing a flagship page whose stored `site` already held a null that the request also sent answered 500 (`Object.keys(null)`). Fixed in this step (`src/utilities/deepMerge.ts`, one line). The "unknown key → 400" case was replaced by "unapproved variant → 400": Payload drops keys outside the field schema, so an unknown key is never stored, and the valid publish asserts that instead.

- [x] **Step 7: Patch-notes spec with the revalidation and publish-date fixes (F7, F8)**
  - **Scenarios:** S3.1–S3.4. For F8, a partial PATCH keeps `publishedAt` and the note's position. For F7, the renamed project shows in the patch-notes header.
  - **Files:**
    - new `tests/e2e/patch-notes.spec.ts`
    - `tests/e2e/support/fixtures.ts`: add `lexical(text)`, a minimal Lexical root JSON
    - `src/collections/GameProjects/hooks/revalidateGameProject.ts`: `revalidatePath('/g/<slug>', 'layout')` for the current, previous and deleted slugs
    - `src/hooks/populatePublishedAt.ts`
  - **Do:**
    1. Write the spec. Give the 12 notes explicit, distinct `publishedAt` values so the order is deterministic.
    2. For F7, load the patch-notes page first so it's cached, then rename the project.
    3. Run it before the fixes, and log the F7 and F8 failures.
    4. Fix, then run again.

    The F8 rule: `data.publishedAt ?? originalDoc?.publishedAt ?? (status === 'published' ? now : undefined)`, where `status = data._status ?? originalDoc?._status`. PatchNotes, Pages and Posts share this hook.
  - **Verify:** standard checks.
  - **Deviation (done):** F7 did not fail before the fix. Every `/g/**` route builds as dynamic (ƒ) and has no `generateStaticParams`, so nothing under `/g` is ISR-cached despite `revalidate = 3600` (see Decisions and Q4). `lexical()` already existed from Step 2. The spec also covers F8's draft-dating symptom.

- [x] **Step 8: Issue list, board and detail spec, and public reads through access (F3, part 1)**
  - **Scenarios:** S4.1–S4.3; the draft patch-note title is the F3 failure. S2, S3 and S1.4 guard the change.
  - **Files:**
    - new `tests/e2e/issues-voting.spec.ts`, S4.1–S4.3 only
    - `src/lib/game-portal/getGameProject.ts`
    - `src/lib/game-portal/issues.ts`: every read except `getHasVoted`
    - `src/lib/game-portal/patchNotes.ts`: add a `limit` argument to `queryPublishedPatchNotes`
    - the published landing read in `src/app/(public)/g/[gameSlug]/page.tsx`
    - `src/app/(public)/g/[gameSlug]/(ops)/patch-notes/feed.xml/route.ts`: reuse `getGameProject` and `queryPublishedPatchNotes({ limit: 20 })`
  - **Do:**
    1. Write S4.1–S4.3, run them, and log the F3 failure.
    2. Pass `overrideAccess: false` on every public portal read, and keep the explicit filters.
       - With access applied, relationships the visitor can't read come back as bare IDs: the draft patch note, and the project's `tenant`.
       - The issue detail page already handles an ID (`issues/[slug]/page.tsx:29-32`). Any other code that assumes a populated object must handle an ID too; tsc and S2 show where.
    3. Leave the contact and report pages' privileged reads for Step 13.
  - **Verify:** standard checks.

- [x] **Step 9: Voting counter owned by IssueVotes hooks (F4) and the shared landing revalidation (F14, part)**
  - **Scenarios:**
    - S4.4–S4.6.
    - The planner's same-cookie case: vote with cookie C, then send two parallel `POST /api/vote` with C, for 5 rounds. In every round there's no 5xx, and `upvoteCount` equals the number of vote rows.
  - **Files:**
    - `tests/e2e/issues-voting.spec.ts`
    - new `src/hooks/revalidateGameLanding.ts`: a command that resolves the slug and calls `revalidatePath('/g/<slug>')`. It replaces the local copies in `src/collections/GamePages/hooks/revalidateGamePage.ts`, `src/collections/Issues/hooks/revalidateIssueLanding.ts` and `src/collections/PatchNotes/hooks/revalidatePatchNotes.ts`. Keep one slug lookup per hook call.
    - new `src/collections/IssueVotes/hooks/adjustUpvoteCount.ts`, and the hooks in `src/collections/IssueVotes/index.ts`
    - `src/app/api/vote/route.ts`
  - **Do:**
    1. Write S4.4–S4.6 and the extra case, run them, and log the failures. The `updatedAt` check fails every time; the parallel cases usually do.
    2. `adjustUpvoteCount({ issueID, delta, req })` calls `req.payload.db.updateOne({ collection: 'issues', id, data: { upvoteCount: { $inc: delta } }, req, select: { gameProject: true, isPublic: true } })`. If the issue is public it then calls `revalidateGameLanding`. It returns nothing.
    3. IssueVotes hooks (see Planner decisions):
       - `afterChange` on create → `+1`.
       - `beforeDelete`: read the vote with `req` (`findByID`, `disableErrors: true`; return if it's null) → `-1`.
    4. The route, per F4:
       - Use `getClientIP`.
       - Look up the issue with `find` and `overrideAccess: false`: 404 for private or unknown issues, while real errors propagate.
       - Find the existing vote, then `delete` it (NotFound means already removed) or `create` one (a unique-violation `ValidationError` means already voted).
       - Respond with `upvoteCount` read after the write.
       - The catch logs the error (as the contact route does) as well as reporting to Sentry. Found in Step 4's F15 proof: today a production refusal from `checkRateLimit` leaves no trace in the server log.
  - **Verify:** standard checks. `pnpm test:int tests/int/template-revalidation.int.spec.ts` still passes (3 tests).

- [x] **Step 10: Upvote reconciliation migration (F4) and deletable voted issues (F22)**
  - **Scenarios:** remove the `test.fail` from S1.3's owner-delete test [F22]. S1.2's votes-survive check guards the rollback.
  - **Files:**
    - new `src/migrations/<ts>_reconcile_issue_upvote_counts.ts` and `.json`, plus `src/migrations/index.ts`
    - new `src/collections/Issues/hooks/deleteIssueVotes.ts`, and `beforeDelete` in `src/collections/Issues/index.ts`
    - `$PROOFS/reconcile-upvotes.sql`, outside the repo
  - **Do:**
    1. Write the proof SQL first. "Failure modes" lists what it must rule out.
    2. Clear the `dev` row, then run `pnpm payload migrate:create reconcile_issue_upvote_counts --force-accept-warning`. The flag creates a blank migration without the interactive prompt. The generated SQL must be empty, and the migration must sort after F11's. Write `up` with F4's SQL through `db.execute(sql\`…\`)`, and a no-op `down`.
    3. Proof on the mission DB, saved to `$PROOFS/step10-reconcile.log`:
       - Run the fixture part of the SQL: two tenants and one project. Issue X has 2 same-tenant votes and 1 vote carrying the other tenant; issue Y has none. Set `upvote_count` to 7 and 3, and note both `updated_at` values.
       - `pnpm payload migrate`.
       - Check: X = 2, Y = 0, both `updated_at` unchanged, and `migrate:status` shows the migration applied.
       - Delete the fixture rows.
    4. F22: `deleteIssueVotes` (`beforeDelete`) calls `req.payload.db.deleteMany({ collection: 'issue-votes', where: { issue: { equals: id } }, req })`.
  - **Verify:** standard checks.

- [x] **Step 11: Reports and contact spec (S5)**
  - **Files:**
    - new `tests/e2e/reports-contact.spec.ts`
    - `tests/e2e/support/fixtures.ts`: add `webhookSink`, an HTTP server on the `DISCORD_WEBHOOK_TEST_ORIGIN` port that records requests per path and can answer 307 to another path
  - **Do:** write S5.1–S5.6, plus the planner additions.
    - Browser tests use the real Turnstile widget: wait until the hidden `cf-turnstile-response` input has a value before submitting. API tests send `XXXX.DUMMY.TOKEN.XXXX`.
    - Annotate these tests:
      - **S5.2** [F12] → Step 13: with the report provider set to Tally, a native submit is rejected.
      - **S5.3** [F5] → Step 12: PATCH the report to PUBLISHED. The response and an immediate GET both carry `issue`. After 1 s, a GET's `updatedAt` equals the PATCH response's (one write).
      - **S5.4** [F21] → Step 14: the redirect isn't followed and the job is kept. The rest of S5.4 passes today; it's the F3 guard.
      - **S5.5** [F21] → Step 14: the Discord allowlist. With target `DISCORD_WEBHOOK`:
        - Saves: `https://discord.com/api/webhooks/1/abc`, the same path on `discordapp.com`, `ptb.discord.com` and `canary.discord.com`, and the sink origin.
        - Rejected with 400:
          - `http://discord.com/api/webhooks/1/abc` (not https)
          - `https://discord.com:8443/api/webhooks/1/abc` (port)
          - `https://u:p@discord.com/api/webhooks/1/abc` (credentials)
          - `https://discord.com/api/v10/users/@me` (path)
          - `https://discord.com.evil.test/api/webhooks/1/x` (host suffix)
          - `https://evil.test/discord.com/api/webhooks/1/x`
          - `http://169.254.169.254/latest/meta-data/`
          - `http://127.0.0.1:<sink port + 1>/api/webhooks/1/x` (the test host on another port)
      - **S5.6** [F13] → Step 14: the email job is kept.
    - Not annotated, because they pass today:
      - a separate guard test: a project routed to `EMAIL` still saves while its hidden `discordWebhookUrl` holds a stale non-Discord value
      - the other S5.5 variants
  - **Verify:** standard checks. Exactly these five tests are expected to fail, each with its symptom.
  - **Deviation (done):** S5.3's non-annotated guard test (issue public, REPORTED, on the board; a later edit makes no second issue; LINKED without an issue → 400) waits up to 5 s for the report's `issue` link before reading it, because today the link lands after the response. The F5 test pins the one-write behaviour down; Step 12 can drop that wait.

- [ ] **Step 12: Atomic report promotion (F5)**
  - **Scenarios:** remove the `test.fail` from S5.3. S5.1, and later S6.7, guard it.
  - **Files:**
    - replace `src/collections/IssueReports/hooks/promoteIssueReport.ts` with `createIssueFromPublishedReport.ts`, a `beforeChange` hook
    - `src/collections/IssueReports/index.ts` (hooks)
  - **Do:** as F5. Keep today's trigger: a change into `PUBLISHED` with no linked issue, including a create that is already `PUBLISHED`.
    - Merge `data` over `originalDoc`.
    - Create the Issue with `req`, so it's in the same transaction, and pass `req` to `uniqueIssueSlug`.
    - Return `{ ...data, issue: issue.id }`.
    - A missing project or tenant throws `ValidationError`.
    - No `setTimeout`, no self-update, no context flag, and no `/issues` layout revalidation.
    - Use `extractID`.
  - **Verify:** standard checks.

- [ ] **Step 13: Contact routing helper and shared public-form guard (F3 part 2, F12)**
  - **Scenarios:** remove the `test.fail` from S5.2. S5.1, S5.4 and S5.5 guard the refactor.
  - **Files:**
    - new `src/lib/game-portal/contactRoute.ts`: `getContactRoute(slug)`, returning the union without secrets
    - new `src/lib/public-forms/guard.ts`: `guardPublicForm` and `formResponse`
    - new `src/components/game/TurnstileField.tsx`
    - `src/app/(public)/g/[gameSlug]/(ops)/contact/page.tsx`, `contact/submit/route.ts`, `report/page.tsx` and `report/submit/route.ts`
  - **Do:**
    - The contact page and the contact submit route both take routing from `getContactRoute`, the only privileged portal read. The route gets the project itself from `getGameProject`.
    - The report page drops `getReportProject` and reads `reportForm` from `getGameProject`.
    - Both submit routes use `guardPublicForm` (parse → Turnstile → rate limit, in patterns.md order; F15's throws reach the route's catch) and `formResponse`.
    - The report route looks up the project with `getGameProject`, and returns 400 when `reportForm.provider !== 'native'`.
    - `TurnstileField` replaces both copies. Delete the no-op ternary.
    - The contact route still queues and runs jobs as it does today; Step 14 changes that.
  - **Verify:** standard checks.

- [ ] **Step 14: Contact jobs deliver or throw, and Discord destinations are restricted (F13, F21)**
  - **Scenarios:** remove the `test.fail` from S5.4's redirect test, S5.5's allowlist test and S5.6.
  - **Files:**
    - new `src/lib/validation/discordWebhook.ts` (`isAllowedDiscordWebhookUrl`)
    - `src/collections/GameProjects/index.ts`: `discordWebhookUrl.validate` applies the check when `siblingData.target === 'DISCORD_WEBHOOK'`
    - `src/jobs/contact.ts`
    - `src/app/(public)/g/[gameSlug]/(ops)/contact/submit/route.ts`: `payload.jobs.runByID({ id: job.id })` instead of `jobs.run({ limit: 10 })`
    - `src/environment.d.ts` (`DISCORD_WEBHOOK_TEST_ORIGIN`)
  - **Do:** as F13 and F21.
    - `getProject` uses `findByID({ disableErrors: true })`.
    - Throw on a missing project, a routing mismatch, an unset `RESEND_API_KEY`, or a URL that fails the allowlist.
    - Both fetches get `AbortSignal.timeout(10_000)`. The Discord fetch also gets `redirect: 'error'`.
    - Keep the Sentry capture and rethrow.
  - **Verify:** standard checks. In S5.6's report output, the kept job's `log` entry shows the thrown message.

- [ ] **Step 15: Admin triage spec (S6)**
  - **Files:** new `tests/e2e/admin-triage.spec.ts`.
  - **Do:** S6.1–S6.7, using `aOwner`'s storage state; S6.1's UI login uses a fresh context.
    - Drag with `page.mouse`: down, several `move` steps adding up to more than 6 px (dnd-kit's activation distance), then up.
    - S6.5 [F6] → annotate for Step 16. `page.route` answers the PATCH with 500; expect the card back in its original column and an error toast.
  - **Verify:** standard checks. Only S6.5 is expected to fail: the card stays in the new column and no toast appears.

- [ ] **Step 16: Kanban shows only moves the server accepted (F6)**
  - **Scenarios:** remove the `test.fail` from S6.5. S6.3 and S6.4 guard.
  - **Files:** `src/components/admin/issues/kanban.tsx` and `src/components/admin/issues/list.tsx`.
  - **Do:** as F6.
    - Compute the next columns from current state outside any updater, call `setColumns(next)`, then send the PATCH.
    - On failure, restore the snapshot and call `toast.error` (from `@payloadcms/ui`).
    - Ignore drag start while a move is in flight.
    - The drag-start and drag-over handlers read state directly, not through updaters.
    - Load-more failures show the same toast.
    - Remove the error-swallowing try/catch in `list.tsx`.

    E2E runs `next start`, where strict mode doesn't double-invoke updaters, so check that part by reading the code: every remaining `setColumns((prev) => …)` must be pure, with no fetch, ref write or other setter inside.
  - **Verify:** standard checks.

- [ ] **Step 17: Remaining DRY helpers (F14)**
  - **Files:**
    - Whichever of these still have a local relation-ID helper: `src/collections/IssueReports/hooks/validateReportStatus.ts`, `src/collections/Issues/hooks/revalidateIssueLanding.ts`, `src/collections/PatchNotes/hooks/revalidatePatchNotes.ts`, `src/site-generator/service.ts`, `src/site-generator/context.ts`, `src/hooks/validateUniqueSlugPerProject.ts`, `src/collections/GamePages/index.ts`, `src/access/tenantAccess.ts`, `src/access/tenantRoles.ts`. Find the rest with `grep -rnE "=== 'object' .*\.id" src --include=*.ts --include=*.tsx`.
    - new `src/fields/sameGameProjectFilter.ts`, used by `src/collections/Issues/index.ts` and `src/collections/IssueReports/index.ts`.
  - **Do:** replace each helper with `extractID`, guarding nulls first, and use one `sameGameProjectFilter`. No behavior change.
  - **Verify:** standard checks. `pnpm test:int tests/int/template-revalidation.int.spec.ts tests/int/site-generator.int.spec.ts` passes.

- [ ] **Step 17a: Remove the website-template code (H1, part 1)**
  - **Scenarios** (`tests/e2e/tenant-isolation.spec.ts`). The spec changes and the removal land together, so nothing is annotated.
    - **S1.7:**
      - The F1 jobs test stays as it is.
      - The F2 test becomes "studio users cannot change the marketing site [F2]". `aOwner` creating a marketing page → 403, and PATCHing a published one the super admin seeded (with a Content block, as in S1.9) → 403. Pages is the platform content that's left; this guards its `superAdminOnly`.
      - Delete the F16 test. Its check moves into a new test, "the website-template surface is gone [H1]", with one `test.step` for each of these:
        - As super admin, `GET /api/{posts,categories,forms,form-submissions,redirects,search}` and `GET /api/globals/{header,footer}` → 404 (Payload's "Route not found"). A super admin getting 404 proves the collection is gone, not just denied.
        - Anonymous `POST /api/form-submissions` → 404. The public form endpoint F16 locked no longer exists.
        - Anonymous `GET /posts`, `/posts/<any>`, `/search` and `/posts-sitemap.xml` → 404.
        - `GET /pages-sitemap.xml` → 200, and it lists neither `/posts` nor `/search`.

        The removed slugs aren't `CollectionSlug`s any more, so these steps use the client's `raw()`.
    - **S1.9:**
      - The marketing page fixture's `layout` becomes one `content` block (one `full` column with `lexical(…)`) instead of the Archive block.
      - Delete the two post seeds, `publishedPostTitle`, `draftPostTitle`, and the test "the Archive block lists published posts only [F10]". The F10 `ArchiveBlock` fix leaves with the block.
      - The other four S1.9 tests stay unchanged and keep covering marketing Draft Mode.
  - **Files to delete** (`git rm -r`):
    - Collections and globals:
      - `src/collections/Posts/` (with `populateAuthors` and `revalidatePost`)
      - `src/collections/Categories.ts`
      - `src/Header/config.ts`, `src/Header/RowLabel.tsx`, `src/Header/Nav/`, `src/Header/hooks/`
      - `src/Footer/config.ts`, `src/Footer/RowLabel.tsx`, `src/Footer/hooks/`
    - Plugin code: `src/search/` (`Component.tsx`, `beforeSync.ts`, `fieldOverrides.ts`) and `src/hooks/revalidateRedirects.ts`.
    - Routes: `src/app/(frontend)/posts/`, `src/app/(frontend)/search/` and `src/app/(frontend)/(sitemaps)/posts-sitemap.xml/`.
    - Blocks and heroes:
      - `src/blocks/ArchiveBlock/` and `src/blocks/Form/`
      - `src/blocks/Banner/` and `src/blocks/Code/` (Posts' rich-text blocks)
      - `src/blocks/RelatedPosts/`
      - `src/heros/PostHero/`
    - Components:
      - `src/components/Card/`, `CollectionArchive/`, `PageRange/`, `Pagination/` and `PayloadRedirects/`
      - the shadcn primitives only they used: `src/components/ui/{pagination,checkbox,textarea,input,label}.tsx`
    - Utilities:
      - `src/utilities/{formatAuthors,formatDateTime,useClickableCard,useDebounce,getDocument,getRedirects,getGlobals}.ts`
      - `getMeUser.ts` and `toKebabCase.ts`: template utilities nothing imports today
  - **Files to edit:**
    - `src/payload.config.ts`: drop `Posts`, `Categories`, and `globals` (`Header`, `Footer`).
    - `src/plugins/index.ts`:
      - Drop `redirectsPlugin`, `nestedDocsPlugin` (categories only), `formBuilderPlugin` and `searchPlugin`, with their imports.
      - `generateTitle` and `generateURL` take `Page` only.
      - `seoPlugin` stays; Pages' SEO tab uses it.
    - `src/collections/Pages/index.ts`: the `layout` blocks become `[CallToAction, Content, MediaBlock]`. `src/blocks/RenderBlocks.tsx` loses `archive` and `formBlock`.
    - `src/fields/link.ts`: `relationTo: ['pages']`, still an array (see Planner decisions). `src/fields/defaultLexical.ts`: `enabledCollections: ['pages']`.
    - `src/components/Link/index.tsx`: `reference` is a page; the href is `/${slug}`.
    - `src/components/RichText/index.tsx`:
      - Remove the `blocks` converters (`banner`, `code`, `mediaBlock`, `cta`). Once Posts goes, no editor has `BlocksFeature`.
      - `internalDocToHref` returns `/${slug}` for a populated page and `'#'` otherwise, instead of throwing (Planner decisions).
    - `src/utilities/generatePreviewPath.ts`: drop `posts`.
    - `src/utilities/generateMeta.ts`: `Page` only.
    - The comments in `src/utilities/getPreviewUser.ts` and `src/app/(frontend)/next/preview/route.ts`: "pages", not "pages and posts".
    - `src/app/(frontend)/[slug]/page.tsx`: call `notFound()` (from `next/navigation`) where it rendered `<PayloadRedirects url={url} />`, and drop the `disableNotFound` instance.
    - Header and footer:
      - `src/Header/Component.tsx` and `Component.client.tsx`: the logo link only, with no global read and no search link. If `Component.tsx` would be left as an empty wrapper, fold it into the client component, keeping the `Header` export `layout.tsx` imports.
      - `src/Footer/Component.tsx`: the logo and `ThemeSelector`, with no global read.
    - `src/components/AdminBar/index.tsx`: drop the `posts` label, and the dead `projects` one.
    - `src/app/(frontend)/(sitemaps)/pages-sitemap.xml/route.ts`: drop the `/search` and `/posts` default entries.
    - `next-sitemap.config.cjs`: drop `posts-sitemap.xml` from `exclude` and `additionalSitemaps`, and `/posts/*` from `exclude`.
    - `src/payload-types.ts` (`pnpm generate:types`) and `src/app/(payload)/admin/importMap.js` (`pnpm generate:importmap`).
    - `package.json` and `pnpm-lock.yaml`: `pnpm remove @payloadcms/plugin-form-builder @payloadcms/plugin-nested-docs @payloadcms/plugin-redirects @payloadcms/plugin-search react-hook-form prism-react-renderer @radix-ui/react-checkbox @radix-ui/react-label`. This step deletes the last importer of each. Nothing that stays declares them as peers (checked when planning).
  - **These stay:**
    - `redirects.ts` at the repo root (Next's IE redirect, not the plugin)
    - `src/endpoints/home-static.ts` (the Pages home fallback)
    - `public/website-template-OG.webp` (the default OG image)
    - `src/seed/critterConnect.ts` and `api/seed/critter-connect` (H5)
  - **Do:**
    1. Rewrite S1.7 and S1.9 first. Run `pnpm test:e2e tests/e2e/tenant-isolation.spec.ts` and log the result: only the H1 test fails, because the template endpoints answer 200.
    2. `pnpm ls --depth 0 > /tmp/deps-before.txt`.
    3. Delete and edit as listed, then `pnpm generate:types` and `pnpm generate:importmap`, and let tsc find the leftovers. Run `rm -rf .next/types` before tsc: Next's generated `validator.ts` imports the deleted routes until the next build.
    4. Run the `pnpm remove` above.
    5. No schema change in this step. The app runs on the current schema, because Payload ignores the template tables and the nullable `*_id` columns it no longer knows. Don't run `migrate:create` until Step 17b.
  - **Verify:**
    - Standard checks. S1 passes, including the H1 test. The Log records the new lint warning count (the two `Card` warnings go).
    - `grep -rnE "@payloadcms/plugin-(form-builder|nested-docs|redirects|search)|collections/(Posts|Categories)|getCachedGlobal|PayloadRedirects|BlocksFeature" src tests package.json next-sitemap.config.cjs` → nothing.
    - `pnpm ls --depth 0` compared with `/tmp/deps-before.txt`: only the eight removed packages differ. `pnpm install --frozen-lockfile` passes.

- [ ] **Step 17b: Migration that drops the template tables (H1, part 2)**
  - **Scenarios:** none new. The standard E2E run applies the migration through `migrate:fresh` (9 migrations), then exercises every remaining flow on the reduced schema.
  - **Files:**
    - new `src/migrations/<ts>_remove_website_template.ts` and `.json`, plus `src/migrations/index.ts`
    - `$PROOFS/remove-template.sql`, outside the repo
  - **Do:**
    1. Write the proof SQL first. "Failure modes" lists what it must rule out.
       - Save `select tablename from pg_tables where schemaname='public' order by 1` to `$PROOFS/step17b-tables-before.txt`.
       - Fixture rows on the mission DB:
         - pages P1 and P2, post X and category C
         - `pages_rels` rows P1→P2 (`hero.links.0.link.reference`), P1→X and P1→C
         - a `_pages_v` version of P1, with `_pages_v_rels` rows →P2 and →X
         - form F with one submission
         - `payload_locked_documents` L1 (rels → X), L2 (`global_slug = 'header'`) and L3 (rels → P1)
         - `payload_jobs` J1 and J2, both `schedulePublish`, with `input` `{"doc":{"relationTo":"posts","value":<X>}}` and `{"doc":{"relationTo":"pages","value":<P1>}}`
    2. Clear the `dev` row, then run `pnpm payload migrate:create remove_website_template`. Nothing is added or renamed, so there should be no prompt. If one appears, stop and read it, and never accept a rename.
    3. Read the generated SQL. It may only drop the items below, with their indexes and constraints. Anything else means the snapshot has drifted: stop and find out why.
       - The 37 tables:
         - `posts`, `posts_rels`, `posts_populated_authors`, `_posts_v`, `_posts_v_rels`, `_posts_v_version_populated_authors`
         - `categories`, `categories_breadcrumbs`
         - `forms`, `forms_emails`, `forms_blocks_{checkbox,country,email,message,number,select,select_options,state,text,textarea}`
         - `form_submissions`, `form_submissions_submission_data`
         - `redirects`, `redirects_rels`
         - `search`, `search_categories`, `search_rels`
         - `header`, `header_nav_items`, `header_rels`, `footer`, `footer_nav_items`, `footer_rels`
         - `pages_blocks_archive`, `_pages_v_blocks_archive`, `pages_blocks_form_block`, `_pages_v_blocks_form_block`
       - The 10 columns:
         - `posts_id` and `categories_id` on `pages_rels` and on `_pages_v_rels`
         - `posts_id`, `categories_id`, `forms_id`, `form_submissions_id`, `redirects_id` and `search_id` on `payload_locked_documents_rels`
       - The 10 enums: `enum_posts_status`, `enum__posts_v_version_status`, `enum_forms_confirmation_type`, `enum_redirects_to_type`, `enum_header_nav_items_link_type`, `enum_footer_nav_items_link_type`, `enum_pages_blocks_archive_{populate_by,relation_to}` and `enum__pages_v_blocks_archive_{populate_by,relation_to}`.
    4. At the top of `up`, before the generated statements, add the cleanup that the column drops need, in one `db.execute`:
       ```sql
       DELETE FROM pages_rels WHERE posts_id IS NOT NULL OR categories_id IS NOT NULL;
       DELETE FROM _pages_v_rels WHERE posts_id IS NOT NULL OR categories_id IS NOT NULL;
       DELETE FROM payload_locked_documents WHERE global_slug IN ('header', 'footer') OR id IN (
         SELECT parent_id FROM payload_locked_documents_rels
         WHERE posts_id IS NOT NULL OR categories_id IS NOT NULL OR forms_id IS NOT NULL
            OR form_submissions_id IS NOT NULL OR redirects_id IS NOT NULL OR search_id IS NOT NULL);
       DELETE FROM payload_jobs WHERE task_slug = 'schedulePublish' AND input->'doc'->>'relationTo' = 'posts';
       ```
       - Without these, the column drops leave relationship rows that point at nothing, and a pending scheduled post publish fails on every cron run.
       - `down` stays as generated. It recreates the tables empty; add a comment saying so.
       - Destructure only what `up` and `down` use (Step 4's lint rule).
    5. Run `pnpm payload migrate` on the mission DB, then the check part of the proof. Save it to `$PROOFS/step17b-remove-template.log`:
       - Compared with `step17b-tables-before.txt`, exactly the 37 tables are gone and nothing is added.
       - None of the 10 columns or 10 enums exist. Check the names listed; a pattern would also match `enum_issues_category` and `enum_game_projects_availability_platforms_platform`, which stay.
       - The `pages` count is unchanged. P1 keeps exactly its P2 row in `pages_rels` and in `_pages_v_rels`.
       - L1 and L2 are gone; L3 and its rels row remain. J1 is gone; J2 remains.
       - `migrate:status` lists the migration as applied, after `reconcile_issue_upvote_counts`.
       - Then delete the fixture rows that are left (P1, P2, P1's version row, L3 and J2).
  - **Verify:** standard checks. `run.log` shows `migrate:fresh` applying 9 migrations.

- [ ] **Step 17c: Backfill media-folder tenants (H2)**
  - **Scenarios:** none in E2E, because E2E applies the migration to an empty database. The proof runs on the mission DB, like Step 10's.
  - **Files:**
    - new `src/migrations/<ts>_backfill_media_folder_tenants.ts` and `.json`, plus `src/migrations/index.ts`
    - `$PROOFS/backfill-folders.sql`, outside the repo
  - **Do:**
    1. Write the proof SQL first ("Failure modes"). The fixture, on the mission DB, has tenants A and B and these folders and media:

       | Folder | Contents | Expected tenant |
       |---|---|---|
       | F1 | 2 media items of A | A |
       | F2 | media of A and of B | none |
       | F3 | nothing | none |
       | F4 | media of A, and one item with no tenant | none |
       | P, with subfolder C | P holds only C; C holds media of A | P = A, C = A |
       | Q, with subfolders Q1 and Q2 | Q1 holds media of A; Q2 holds media of B | Q none, Q1 = A, Q2 = B |
       | R | already tenant B; holds media of A | B (untouched) |
       | S1 and S2 | each is the other's parent (a cycle); S1 holds media of A | both A |

       Before migrating, save `select id, tenant_id, folder_id from media order by id` and `select id, name, folder_id, updated_at from payload_folders order by id`.
    2. Clear the `dev` row, then run `pnpm payload migrate:create backfill_media_folder_tenants --force-accept-warning`. The generated SQL must be empty; anything else means drift.
    3. Write `up({ db, payload })`:
       - One `UPDATE … RETURNING id` with a recursive CTE. Each folder's subtree is the folder plus every descendant folder. Use `UNION`, not `UNION ALL`, so a parent cycle terminates.
       - A folder gets tenant T when its subtree holds at least one media item and every media item in it has tenant T: `count(*) = count(m.tenant_id) AND count(DISTINCT m.tenant_id) = 1`.
       - Only folders whose `tenant_id` is null are updated.
       - Then select the folders still without a tenant. Log the assigned ids with `payload.logger.info`. When any folders are left, log their ids with `payload.logger.warn`: "empty, or holding media of several studios or of none; only super admins see them".
       - Raw SQL leaves `updated_at` alone. `down` is a no-op.
    4. Run `pnpm payload migrate`, and check the results against the table. Save the checks and the migrate output to `$PROOFS/step17c-folder-backfill.log`:
       - The warn line lists exactly F2, F3, F4 and Q.
       - The media rows, and the folders' names, parents and `updated_at`, are unchanged.
       - `migrate:status` lists the migration after `remove_website_template`.
       - Then delete the fixture rows.
  - **Verify:** standard checks. `run.log` shows `migrate:fresh` applying 10 migrations.

- [ ] **Step 18: Audit and trim `tests/int`**
  - **Files:**
    - Delete `tests/int/api.int.spec.ts`, `tally-parse.int.spec.ts`, `site-config-schema.int.spec.ts` and `site-template.int.spec.ts`.
    - Trim `template-revalidation.int.spec.ts`: keep only "still skips issue writes that only change kanban order".
    - Trim `site-generator.int.spec.ts`: drop "requires a slot only for slot-scoped generation".
    - In the plan, add a `### Test audit results` table at the end of this Steps section.
  - **Do:**
    1. Fan out one subagent per int file: 7, in parallel, read-only. Each lists every test in its file with:
       - keep or delete
       - a one-line reason
       - the exact title of the E2E test that replaces it, confirmed to exist and to have passed in the last run's list output
    2. Where a test guards real behavior that no E2E test covers, add the E2E case first (in the matching spec), run it, then delete the test. Keep a test only where E2E can't reach the behavior, and say why.
    3. Apply the calls and record the table.
    4. Leave devDependencies alone; list any that became unused, for the Summary. Step 17a already removed the runtime packages H1 left unused. No int file imports anything H1 removed (checked when planning), so H1 changes none of the calls above.
  - **Verify:**
    - tsc and lint.
    - `pnpm test:int` → 3 files, 8 tests (site-config-parity 2, site-generator 5, template-revalidation 1).
    - `psql "$DB" -Atc "select count(*) from payload_migrations where name='dev'"` → 0; nothing boots Payload any more.
    - The full E2E suite, only if a case was added.

- [ ] **Step 19: Audit and remove `tests/manual`**
  - **Files:**
    - delete `tests/manual/` (6 scripts and the README)
    - E2E specs, only if a gap turns up
    - extend `### Test audit results`
  - **Do:**
    1. Fan out one subagent per script: 6, in parallel. Each lists every assertion the script makes, with the E2E test that covers it, or marks it as a gap.
    2. Add E2E tests for real gaps first, and run them. The legacy block renderer (`verify-phase3`) stays a documented gap.
    3. Delete the directory.
    4. `grep -rn "tests/manual\|verify-phase\|verify-isolation" --exclude-dir=node_modules --exclude-dir=plans .` → nothing.
  - **Verify:** tsc and lint (the `verify-phase5.mjs` warnings are gone). The full E2E suite, if tests were added.

- [ ] **Step 20: Testing rules and deploy docs**
  - **Files:** `AGENTS.md`, `docs/patterns.md`, `docs/deploy.md`, `.env.example`, `README.md`.
  - **Do:** as Target design item 9.
    - **`AGENTS.md`:**
      - A new `## Testing` section with:
        - the brief's three rules, verbatim
        - `pnpm test:e2e` needs `E2E_DATABASE_URL`, whose name must end in `_e2e`; that database is dropped on every run
        - the artifact is `playwright-report/`, with a trace and screenshots for every test (`pnpm exec playwright show-report`)
        - seed through REST in the setup project; each spec owns its projects
        - int tests only for invariants E2E can't reach, naming the three kept files and why
      - In Commands: update the `pnpm test` line, and add `pnpm test:e2e` and `pnpm test:int`. Leave the local-development paragraph alone.
    - **`docs/patterns.md`:**
      - **Hooks:**
        - IssueReport promotion runs in `beforeChange`.
        - IssueVote hooks own `upvoteCount` through `$inc`: increment on create, decrement in `beforeDelete`.
        - Issue `beforeDelete` removes the issue's votes.
        - Remove the stale "Issue afterChange recalculates upvoteCount" and "IssueVote beforeChange" claims.
      - **Data access:** public portal reads use `overrideAccess: false`. Privileged reads live only in named helpers (`getContactRoute`, `getHasVoted`). Draft Mode reads authorize the preview user.
      - **Jobs:** super-admin only. Contact tasks deliver or throw. Recovery: fix the configuration, then untick `hasError`.
      - **Tenant isolation:** folders are tenant-scoped.
      - **Public form endpoints:** production refuses forms without Turnstile or Upstash, and Discord destinations are restricted.
      - **Voting model:** remove the `beforeChange` claim.
    - **`.env.example` and `docs/deploy.md` step 5:**
      - Production requires `TURNSTILE_SECRET_KEY` and `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, Upstash, and `RESEND_API_KEY` when a studio routes contact to email.
      - Remove the "fails open", "skipped" and "succeed without it" wording.
    - **`README.md`** is still Payload's website-template README (posts, categories, search, redirects, the seed button), which H1 made false. Replace it with a short critwire README: the one-paragraph description from `AGENTS.md`, pointers to `AGENTS.md` and `docs/`, and the commands. Nothing more.
    - The other docs don't mention the removed template surface (checked when planning). `docs/features.md`'s phase history ("website template") stays.
  - **Verify:**
    - tsc and lint.
    - `grep -niE "fails open|succeed without|verification is skipped" .env.example docs AGENTS.md` → nothing.
    - `grep -n "^## Testing" AGENTS.md` → exactly one line.
    - `grep -niE "website template|posts|categories|redirects" README.md` → nothing.

- [ ] **Step 21: Final verification, artifact and Summary**
  - **Do:**
    1. Commit all code first, so the recorded SHA is the tested code.
    2. Run the Verification section end to end, save the artifact, and write its README. `pnpm build` goes last.
    3. Write the Summary:
       - what changed and why, per finding, plus the owner's H1 and H2 answers: the removed template surface and packages, and the two migrations (`remove_website_template`, `backfill_media_folder_tenants`)
       - every deleted test and its reason, from `### Test audit results`
       - E2E coverage before (0 of 7 flows) and after (7 of 7, with test counts per spec)
       - both review verdicts: Fable APPROVE; Astra APPROVE_WITH_CHANGES, with its MUST-FIX items resolved in Revision
       - the bugs found and fixed: F1–F13, F21, F22, F24 and F25, one line each. H1 superseded some of them by removing the surface they protected: F2's post, category, header, footer, redirect, form and search locks, F16, and F10's `ArchiveBlock` fix. Say so in their lines.
       - the planner decisions
       - what's left for the owner:
         - H3 (the deploy keys, formerly Q1), H4 (patch-notes ISR, formerly Q4) and H5 (the seed route, F23), if they're still open
         - Before deploying, back up production. `remove_website_template` drops the template's data for good (its `down` recreates empty tables). Marketing pages lose any Archive or Form blocks, and the header and footer lose any nav links.
         - After deploying, the app log's warn line lists media folders left without a tenant, for a super admin to assign (H2).
         - the coverage gaps, and any devDependencies that became unused
       - the artifact path and the reproduce command
    4. Set `status: done`, then commit and push.
  - **Verify:** everything in Verification passes. The artifact directory holds `playwright-report/index.html`, `run.log` and `README.md`.

### Risks

- **Turnstile needs outbound HTTPS** to challenges.cloudflare.com, from both the browser and the server. Step 1 checks it. If it's blocked, the S5 browser tests fail at "token issued": record that under Questions, and don't add a bypass.
- **Build time.** Every standard check includes a build of about 110 s, so by Step 16 a full run takes roughly 5–8 minutes. If the build ever outgrows the 420 s webServer timeout, raise the timeout; don't skip the build.
- **The autoRun cron** (every minute, limit 10) also runs inside the E2E server.
  - It retries failed contact jobs. S5.4 and S5.6 still hold across retries: nothing reaches the redirect target, and email jobs keep failing.
  - It could race `runByID` for a job that was just queued. Payload marks a job `processing` before running it, so the job still runs once. If S5.4's "exactly one embed" ever flakes, look here first; don't add retries.
- **Uploads pile up.** Media from E2E runs accumulates in the gitignored `public/media/`, because `migrate:fresh` doesn't delete files. It's harmless; clear the folder by hand if it grows.
- **F15** has only Step 4's manual proof. The first production deploy of this branch needs Q1's variables.
- **H1 removes content, not just code.**
  - On production, marketing pages lose any Archive or Form blocks. Link fields that pointed at posts render nothing, and rich-text links to posts render `'#'`.
  - Any header or footer nav links go with their globals; the header and footer keep the logo and theme selector.
  - The migration can't be undone with its data (`down` recreates empty tables), so the Summary tells the owner to back up before deploying.
  - Nobody on the mission can see production's content. If the owner relies on any of it, that surfaces at review, before merge.
- **Order between 17a and 17b.** Running `migrate:create` for anything else between them would fold the template drops into that migration. 17c's "generated SQL must be empty" check catches a slip.
- **Lockfile churn.** `pnpm remove` should only drop packages. If `pnpm ls --depth 0` shows any other version change, restore `package.json` and `pnpm-lock.yaml` from git, keep the packages installed, and list them in the Summary as unused.
- **Stale route types.** After routes are deleted, tsc still reads Next's `.next/types/validator.ts`, which imports them. Step 17a clears `.next/types` before tsc; the next build regenerates it.
- **H2 mixed trees.** Take a subfolder assigned to a studio whose parent stays without a tenant (because its contents are mixed). It's hidden from that studio's folder browser, though its media still show in the media list. The warn line names the parent, and a super admin assigns it.

## Verification

E2E is the verification; no unit tests are added. The 7 core flows map to 6 specs:

| Core flow | Spec | Scenarios |
|---|---|---|
| Tenant isolation | `tenant-isolation.spec.ts` | S1.1–S1.10 |
| Public game portal pages | `portal-landing.spec.ts` | S2.1–S2.6 |
| Patch notes (list, detail, RSS) | `patch-notes.spec.ts` | S3.1–S3.4 |
| Public issue tracker with voting | `issues-voting.spec.ts` | S4.1–S4.6 |
| Issue reports | `reports-contact.spec.ts`, `admin-triage.spec.ts` | S5.1–S5.3, S6.7 |
| Contact form | `reports-contact.spec.ts` | S5.4–S5.6 |
| Admin triage and kanban | `admin-triage.spec.ts` | S6.1–S6.6 |

S1.7 also proves that the website-template surface H1 removed answers 404, and that the remaining platform content (Pages) is super-admin only. Step 17a describes the new S1.7 and S1.9.

**Final run (Step 21).** From `/srv/critter-ai/worktrees/architecture-pass`, one command at a time:

```bash
cd /srv/critter-ai/worktrees/architecture-pass
DB=$(grep '^DATABASE_URL=' .env | cut -d= -f2-)
E2E_DB=$(grep '^E2E_DATABASE_URL=' .env | cut -d= -f2-)
ART=/srv/critter-ai/agent-state/missions/architecture-pass/e2e

git status --short                                    # empty: the run tests committed code
grep -rnE "test\.(only|fail|skip|fixme)\(" tests/e2e  # no output
pnpm exec tsc --noEmit                                # 0 errors
pnpm lint                                             # 0 errors
pnpm test:int                                         # 3 files, 8 tests pass
psql "$DB" -Atc "select count(*) from payload_migrations where name='dev'"      # 0

rm -rf playwright-report test-results
set -o pipefail
pnpm test:e2e 2>&1 | tee /tmp/e2e-final.log            # exit 0
psql "$E2E_DB" -Atc "select count(*) from payload_migrations where name='dev'"  # 0

rm -rf "$ART" && mkdir -p "$ART"
cp -r playwright-report "$ART/playwright-report"
cp /tmp/e2e-final.log "$ART/run.log"
# then write "$ART/README.md" (contents below)

psql "$DB" -c "delete from payload_migrations where name='dev'"
pnpm payload migrate:status                           # all 10 migrations applied, including the four new ones
pnpm build                                            # last, so .next doesn't keep the E2E build's baked-in env
grep -n posts public/robots.txt                       # no output: next-sitemap no longer lists the posts sitemap
```

**What it must show:**
- `run.log`:
  - the `[WebServer]` lines for `migrate:fresh` (all 10 migrations) and `next build`
  - then the list reporter: `setup` and every test in the six specs passed, with 0 failed, 0 flaky, 0 skipped and 0 expected-to-fail
- `playwright-report/`:
  - a trace for every test (`trace: 'on'`)
  - screenshots for every browser test (`screenshot: 'on'`)
  - each spec's key checkpoints as `test.step()` entries
  - it opens on its own, with nothing else needed
- Neither database has a `dev` row. The mission database keeps its own data; the reset only touched `*_e2e`.
- `$ART/README.md` records:
  - the UTC time and the tested commit (`git rev-parse HEAD`)
  - passed, failed and flaky counts from the list output, and the wall time
  - the flow → spec table above
  - the reproduce and view commands below
  - a note that the E2E database is dropped on every run

**Reproduce and view:**
```bash
cd /srv/critter-ai/worktrees/architecture-pass       # or any checkout of agent/architecture-pass after pnpm install
createdb critwire_e2e                                 # once; any name ending in _e2e, never the dev database
E2E_DATABASE_URL=postgres://<user>:<password>@127.0.0.1:5432/critwire_e2e pnpm test:e2e
pnpm exec playwright show-report /srv/critter-ai/agent-state/missions/architecture-pass/e2e/playwright-report
```
On this VPS the worktree `.env` already points `E2E_DATABASE_URL` at `critwire_m_architecture_pass_e2e`, so `pnpm test:e2e` on its own reproduces the run.

**Other proofs**, saved during the steps under `/srv/critter-ai/agent-state/missions/architecture-pass/proofs/`: `step1-migrate-fresh.log`, `step4-folders.log`, `step4-f15.log`, `reconcile-upvotes.sql`, `step10-reconcile.log`, `remove-template.sql`, `step17b-tables-before.txt`, `step17b-remove-template.log`, `backfill-folders.sql` and `step17c-folder-backfill.log`.

## Failure modes

This covers only the parts proven outside the E2E suite. The list is written before the code; each proof must show that none of these happens.

**`reconcile_issue_upvote_counts`** (Step 10, psql proof):
1. A stale count survives: issue X keeps 7 instead of 2.
2. An issue with no votes keeps a non-zero count: Y stays at 3 instead of 0. The correlated `count(*)` must give 0.
3. A vote carrying another tenant is counted (X becomes 3), meaning the tenant predicate is missing.
4. `updated_at` changes, which would re-sort "Recently Fixed".
5. The migration is pending, or sorts before `tenant_scoped_media_folders`, in `migrate:status`.
6. `down` changes data.
7. `migrate:create` also generated schema SQL, meaning the snapshot has drifted.

**`tenant_scoped_media_folders`** (Step 4, psql proof):
1. `tenant_id` is `NOT NULL`, which would fail on production databases that already have folders.
2. The migration touches tables other than `payload_folders`.
3. The foreign key is missing, or doesn't point at `tenants`.

**F15 production refusal** (Step 4, manual proof):
1. Production with `TURNSTILE_SECRET_KEY` unset still processes a contact submission (200 or 400 instead of 500).
2. Production without Upstash, and without `RATE_LIMIT_OPTIONAL`, still processes a vote (anything but 500).
3. The refusal escapes the route's catch: no JSON error body, or an unhandled rejection in the server log.
4. `RATE_LIMIT_OPTIONAL` also relaxes Turnstile. Check that `grep -rn RATE_LIMIT_OPTIONAL src` finds it only in `checkRateLimit`.
5. Development gets refused too, because the throw isn't gated on `NODE_ENV === 'production'`. Check by reading both functions.
6. The E2E production build refuses forms even though it's configured. The S4 and S5 specs catch this.

**`remove_website_template`** (Step 17b, psql proof; the E2E run proves it applies to a fresh database and that every remaining flow works on the reduced schema):
1. One of the 37 template tables, the 10 `*_id` columns or the 10 enums survives.
2. Anything else changes: a table outside the 37 disappears, a surviving table loses another column, or anything is created. This would also mean the snapshot drifted.
3. A page is lost, or a page's relationship to another page (P1→P2 in `pages_rels` or `_pages_v_rels`).
4. A relationship row that pointed at a post or category survives as a row pointing at nothing.
5. A lock on a removed document or on the header or footer global survives, or a lock on a page is deleted.
6. A pending `schedulePublish` job for a post survives (it would fail on every cron run), or one for a page is deleted.
7. The migration fails on a database that holds template data. The fixture includes a form with a submission, because `form_submissions.form_id` is `NOT NULL` with `ON DELETE SET NULL`.
8. The migration is pending, or sorts before `reconcile_issue_upvote_counts`.

**`backfill_media_folder_tenants`** (Step 17c, psql proof):
1. A folder whose media all belong to one studio stays without a tenant (F1).
2. A folder gets a tenant although its media belong to two studios (F2), it's empty (F3), or one of its media items has no tenant (F4).
3. Nested contents are ignored: P stays without a tenant although its only subfolder holds A's media.
4. A parent whose subfolders belong to different studios gets a tenant (Q), or those subfolders don't get theirs (Q1, Q2).
5. A folder that already has a tenant is overwritten (R).
6. A parent cycle makes the recursive query run forever (S1, S2).
7. The warn line misses a folder left without a tenant, or lists an assigned one.
8. Media rows change, or folders' names, parents or `updated_at` do.
9. `down` changes data.
10. `migrate:create` generated schema SQL (drift), or the migration sorts before `tenant_scoped_media_folders`.

## Decisions

- **Fable SC1: taken (Step 1).** `payload migrate:fresh --force-accept-warning` was proven against `critwire_m_architecture_pass_e2e` before the config was built around it: exit 0, 6 migrations, no `dev` row, mission DB untouched (`proofs/step1-migrate-fresh.log`).
- **Fable SC2: taken (Step 1).** `webServer.stdout: 'pipe'` (and stderr), so `[WebServer]` migrate and build lines land in the run log.
- **Step 1: the API fixture creates one request context per role up front** (4 roles + anonymous) instead of lazily: `newContext` is async, and five idle contexts cost nothing. Playwright attaches worker-scoped request contexts to each test's trace (`artifactsRecorder` walks `request._contexts` at test start), so API calls made from these clients still show up in every test's trace.
- **Step 2: F24 is a new bug, fixed in Step 3.** S1.2 showed a studio user can create and move documents into another studio's tenant: the plugin's own `validate` on the tenant field replaces the relationship validator that would enforce its `filterOptions`. It goes in Step 3 because it's the same kind of change (access only, no schema), and it's a cross-tenant write, so it shouldn't wait. The fix is one root `tenantField.validate` in the plugin config rather than per-collection access, so every tenant-scoped collection, including `payload-folders` after F11, is covered in one place (rule 2).
- **Step 2: specs get a `uniqueSlug` worker fixture** (`<base>-w<workerIndex>`). After an unexpected failure Playwright restarts the worker and re-runs `beforeAll`; unique slugs keep the re-seed from colliding with the first one.
- **Step 2: `playwright-report/` and `test-results/` are in the ESLint ignores.** The HTML report bundles minified JS that lint would otherwise scan.
- **Step 3: form-submissions `update` stays the plugin's `() => false`** rather than becoming `superAdminOnly` as Step 3 listed. Nobody needs to edit a submission, and loosening a deny to super admins isn't part of any fix. Create, read and delete are `superAdminOnly`. The forms and redirects plugins get `superAdminOnly` create/update/delete; search gets update/delete (its create is already `false`).
- **Step 3: `jobs.access.run` no longer admits every logged-in user**, only super admins or the `CRON_SECRET` bearer. The jobs collection's `admin.hidden` casts the admin's `ClientUser` to `User` for `isSuperAdmin`; it carries `roles` at runtime.
- **Step 3: `validateTenantMembership` trusts writes with no `req.user`** (Local API system writes: votes, seeds, jobs) and super admins, and leaves null to the plugin's presence check. It's wired once as the plugin's root `tenantField.validate`, so every tenant-scoped collection gets it.
- **Step 4: the new migration destructures only `db`.** The generator's unused `payload, req` args added 4 lint warnings, and the rule is that the count never goes up. The generated SQL is unchanged: a nullable `payload_folders.tenant_id`, its `ON DELETE SET NULL` foreign key to `tenants`, and an index (`proofs/step4-folders.log`).
- **Step 4: `/api/vote`'s catch doesn't log, only reports to Sentry**, so the F15 refusal there is visible only as the JSON 500 (no unhandled rejection). Step 9 rewrites that route, so the log line was added to Step 9's Do list rather than done here.
- **Step 5: the E2E server no longer runs with `SKIP_BUILD_STATIC_GENERATION=1`; only `next build` gets it**, inline in `e2e:server`. The Dockerfile sets it only in the build stage, so production's `next start` never sees it. With it set at runtime, `deferStaticGenerationIfRequested()` calls `connection()` inside an on-demand ISR render, and every anonymous marketing page answered 500 (`DYNAMIC_SERVER_USAGE`). S1.9's archive test found this; the harness now matches production.
- **Step 5: `getMarketingReadOptions()` next to `getPreviewUser()`** in `src/utilities/getPreviewUser.ts` returns `{ draft, overrideAccess: false, user }` for both marketing queries, so the "drafts only for a super admin in Draft Mode" rule lives in one place instead of being repeated in `queryPageBySlug` and `queryPostBySlug`. `PREVIEW_SECRET` moved into `tests/e2e/support/env.ts`, shared by the config and S1.9.
- **Step 5: S1.9 post titles carry the worker suffix.** Every marketing archive lists every post, so titles from a restarted worker's re-seed would otherwise match twice.
- **Step 6: F25 is a new bug, fixed in the same step.** `isObject` in `src/utilities/deepMerge.ts` returned true for `null`, so `validatePublishedSiteConfig`'s merge of the stored `site` with the incoming one called `Object.keys(null)` whenever both held a null at the same path. Any publish of an existing flagship page whose form carried empty fields (the admin sends them as null) answered 500. `isObject` now excludes null, so an incoming null replaces the stored value, as a PATCH should. It's the smallest fix; `deepMerge`'s only other callers (`fields/link.ts`, `linkGroup.ts`) merge config objects, where the change is also correct.
- **Step 6: S2.4's "unknown key" expectation was wrong, not the code.** Payload drops keys outside the `site` field schema before storage, and `normalizeSiteInput` copies only known keys, so an unknown key is never stored or rendered; the publish succeeds. The rejected-publish list uses an unapproved hero variant instead (400), and the valid publish asserts the stored doc has no unknown key.
- **Step 6: E2E uploads use an 8×8 RGB PNG (`PNG_8PX`, `uploadImage()` in fixtures), not the 1×1.** `naturalWidth` is density-corrected from the srcset, and 1 px at the 1920w candidate on a 1280 px viewport rounds to 0, so "the logo rendered" couldn't be told from "the logo failed to decode".
- **Step 6: S2.1 compares the 404s' `body` text and `<title>`, not `main`.** The public not-found page has no `main`. The private issue's 404 also must not mention the project's name.
- **Step 7: F7 is latent, but the fix stays.** The architect's premise that the patch-notes pages are "cached for an hour" doesn't hold. The build marks every `/g/**` route ƒ (dynamic), and `.next/prerender-manifest.json` has no `/g` dynamic routes: without `generateStaticParams`, `export const revalidate = 3600` doesn't make an on-demand ISR route, so each request renders fresh and no stale header can be served. The rename scenario passed before the fix. The one-line fix (`revalidatePath('/g/<slug>', 'layout')` for current, previous and deleted slugs) stays because the routes declare ISR and rule 4 requires hooks to revalidate what they change; the scenario now guards it. Turning on real ISR is a performance change, left to the owner (Q4).
- **Step 7: F8 uses "absent keeps, explicit null clears" instead of the plan's `??` chain.** `data.publishedAt === undefined ? originalDoc?.publishedAt : data.publishedAt`, stamped with now only when that's empty and the resulting status is published. With `??`, a user clearing a draft's date in the admin would silently get the old date back. Only PatchNotes and Pages use the hook; Posts has its own `publishedAt` field and never did. Pages autosave drafts no longer get a date on the first autosave.
- **Step 7: `eventually(check)` moved into `support/fixtures.ts`** (the 5 s `toPass` that proves on-demand revalidation), shared by S2's `expectLanding` and S3.
- **Step 1: the DB guard compares host and database name** of `E2E_DATABASE_URL` and `DATABASE_URL`, so a different user or password on the same database still counts as "the same database".
- **H1 (owner, 2026-09-26): remove the Payload website-template surface.** Posts, categories, forms and form-submissions, search, redirects, the header and footer globals, and the post routes go, with a schema migration. This extends the brief's scope ("schema changes only when a finding needs one"): the owner decided it. The planner added the steps before the docs and final-verification steps. The `api/seed/critter-connect` route (F23) wasn't part of the answer and stays until the owner answers H5.
- **H2 (owner delegated, 2026-09-26): backfill media-folder tenants by data migration.** A new data-only migration, sorted after `tenant_scoped_media_folders`, sets each folder's tenant when every media item in it belongs to one tenant, and leaves empty or mixed folders null (super-admin only), printing their ids. It's a separate migration rather than an edit of the F11 one, which is already applied on the mission database. Nothing becomes visible to a studio that didn't already own everything inside.
- **Step 8: the landing's published read passes `user` too** (`overrideAccess: false, user` on both paths, `user` undefined for visitors), so draft and published reads share one options shape instead of a conditional spread. The explicit `_status` filter stays.
- **Step 8: `getGameProject` now returns the project as a visitor sees it.** Access strips `contact.email` and `contact.discordWebhookUrl` from the portal render tree (F3 b) and leaves `tenant` as an ID; no portal render code read either. The contact and report pages' privileged re-queries stay until Step 13, as planned.
- **Step 8: S4.2 compares equal-vote board cards without order.** The board sorts by `-isPinned, -upvoteCount` only, so ties come back in database order. That's harmless on a board and not changed.
- **Planner SC3 (Step 9): taken.** One `adjustUpvoteCount({ delta, issueID, req })` serves both IssueVotes hooks with `$inc`; its `select` returns `gameProject` and `isPublic` for the landing revalidation, and it returns nothing (CQS). The route reads `upvoteCount` after the write.
- **Planner F4 refinement (Step 9): taken.** The decrement runs in `beforeDelete`, so a concurrent withdrawal of the same vote waits on the issue row lock, finds the vote gone, throws NotFound and rolls back its own decrement. S4.6's same-cookie case passes 5 rounds of parallel withdrawals and adds.
- **Step 9: the `$inc` write passes `updatedAt: null`.** The architect's premise that `db.updateOne` leaves `updatedAt` alone was wrong: the Drizzle adapter stamps it on every update unless the data carries `updatedAt: null` (`@payloadcms/drizzle/dist/transform/write/traverseFields.js:570-576`, its escape hatch for session-only writes). With `$inc` alone, S4.6's `updatedAt` test still failed.
- **Step 9: the route looks the issue up with `findByID` (`overrideAccess: false`, `disableErrors: true`) instead of `find`.** `disableErrors` only turns "not found or not readable" into null; database errors still propagate, which is what F4 asks for, and it is Payload's own API for the case.
- **Step 9: a unique-violation on create counts as "already voted" only if the vote is then found.** The adapter reports it as a `ValidationError`, whose path for a compound index isn't stable, so the route re-reads the caller's vote and rethrows any other `ValidationError`.
- **Step 9: `issueId` must be a positive int4 number** (`z.number().int().positive().max(2_147_483_647)`). Issue ids are Postgres serials and the only client sends a number. Before, a string or out-of-range id reached the database, and the old `.catch(() => null)` turned the error into a 404; with errors now propagating it would be a 500. Malformed ids are 400 now (S4.5).
- **Step 9: `revalidateGameLanding(gameProject, payload, section?)`.** The optional `section` also revalidates `/g/<slug>/<section>` as a layout, so the patch-notes hooks keep one slug lookup per call. GamePages, Issues and PatchNotes hooks and the vote counter all use it; its log line replaces three slightly different ones.
- **Step 9: the touched hooks compare projects with `extractID`, guarded for create** (`previousDoc` is `{}` there; `extractID(undefined)` throws where the old local helper returned undefined). Same outcome as before on create.
- **Step 9: the vote route's catch logs through `getLogger('public.vote')`** as well as reporting to Sentry (Step 4's F15 note).
- **Step 10: the reconcile migration's `down` takes no arguments** (`down(): Promise<void> {}`), for the same reason as Step 4: unused generator args would raise the lint warning count. Its "no-op" was proven by running it: `migrate:down` left a deliberately wrong count (11) in place, and re-applying `up` set it back to 2 (`proofs/step10-reconcile.log`).
- **Step 10: the Issues `upvoteCount` comment now names the IssueVotes hooks** as the counter's owner instead of "the voting endpoint", which stopped being true in Step 9.

## Questions for the owner

See /srv/critter-ai/handoff/critwire.md (Q1 → H3, Q2 → H1, Q3 → H2, Q4 → H4, F23 → H5).

## Log

- 2026-09-25 06:35 UTC: Baseline recorded. tsc, lint (0 errors), int (45/45) and build pass; old E2E suite fails 2, 2 not run.
- 2026-09-25 06:53 UTC: Architecture written by `architect`: 14 findings to fix (F1–F14, incl. jobs/marketing access holes, public reads bypassing access, vote-count race), 6 left with reasons; E2E harness on a production build with `migrate:fresh` on a dedicated E2E DB; scenario list and test-audit calls. Q1–Q3 copied to Questions. Plan-only change, no code verification needed.
- 2026-09-25 07:00 UTC: Fable review by `architecture-reviewer`: APPROVE, MUST-FIX none. Verified F1–F13 against code; 3 missed items (SSRF via Discord webhook URL → Q4, CRON_SECRET seed route, pass `req` in F5 slug lookup) and 5 should-consider notes for the planner. Plan-only change.
- 2026-09-25 07:02 UTC: Astra review: APPROVE_WITH_CHANGES, 5 MUST-FIX (marketing draft-mode authorization, fail-closed rule 8 on missing Turnstile/Upstash creds + form-submissions create, Discord webhook SSRF restriction, failed-not-successful contact job when delivery unconfigured, upvote count reconciliation on cutover) and 3 should-consider. Plan-only change; MUST-FIX go to the Revision stage.
- 2026-09-25 07:16 UTC: Revision by `architect`: all 5 Astra MUST-FIX accepted (F10 draft-mode super-admin only, F15/F16 fail-closed in production + form-submissions create locked, new F21 Discord webhook allowlist, F13 contact task throws so jobs stay recoverable, F4 reconcile-upvotes data migration); new bug F22 (voted issues can't be deleted) found; Fable MISSED folded in (F21, F23, F5 `req`). Q1 reworded as deploy prerequisite, Q4 resolved. Plan-only change.
- 2026-09-25 07:34 UTC: Steps by `planner`: 21 steps (harness → fixes with their E2E scenarios, with expected-fail marks until each fix lands → tests/int and tests/manual audit → docs → final verification), plus Verification and Failure modes. Fable SC1–4 taken, SC5 rejected with a reason. F4 decrement moved to `beforeDelete`, which fixes the double-decrement on concurrent withdrawals; checked against `deleteByID.js` (re-read after beforeDelete → NotFound → rollback). Plan-only change.
- 2026-09-25 07:42 UTC: Step 1 done: E2E harness on a production build with `migrate:fresh` on `critwire_m_architecture_pass_e2e`; `setup` project seeds super admin, studios A/B and aOwner/aMember/bOwner and saves sessions + `world.json`; template specs, `tests/helpers/` and `test.env` deleted. Turnstile reachable (siteverify OK with test keys). tsc 0; lint 0 errors, 27 warnings (was 30); E2E 1 passed (setup), 0 expected-fail, 124 s wall (build 84 s); report holds the setup trace; `dev` rows 0 in both DBs, mission DB `min(created_at)` unchanged; all 3 guard cases exit 1 in 2 s (`proofs/step1-guard.log`).
- 2026-09-26 03:00 UTC: Step 2 done: `tenant-isolation.spec.ts` (S1.1–S1.8, S1.10; 20 tests) plus project/issue/patch-note/report/vote factories, `upload()` and `uniqueSlug`. New bug **F24** found (studio B creates/moves issues into tenant A: 201/200), root-caused to the plugin tenant field's custom `validate` skipping `filterOptions`; fix scheduled in Step 3. tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 21 passed incl. 7 expected-fail with their symptoms: F11 folder listed to B, F24 expected 400 got 201, F22 expected 200 got 500, F1 payload-jobs read 200, F2 post create 201, F16 anonymous form-submission 201, F9 `customDomainVerified` stored true; 0 flaky; 129 s wall; `dev` rows 0 in both DBs.
- 2026-09-26 03:03 UTC: Step 3 done: `superAdminOnly` replaces the inline super-admin checks (Tenants, Users, Pages) and locks posts, categories, header/footer update, redirects/forms writes, form-submissions create/read/delete, search update/delete and the jobs collection (plus `jobs.access.run`); `authenticatedOrPublished` → `superAdminOrPublished`; F24 fixed with `validateTenantMembership` as the plugin's root `tenantField.validate`. tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 21 passed incl. 3 expected-fail (F9, F11, F22), F1/F2/F16/F24 tests now pass (F24 rejects with "You can only assign documents to your own studio."); 0 flaky; 131 s wall; `dev` rows 0 in both DBs.
- 2026-09-26 03:09 UTC: Step 4 done: F9 `create` guards on `customDomainVerified` (super admin) and `upvoteCount` (`() => false`); F11 `payload-folders` in the multi-tenant plugin + migration `20260926_030253_tenant_scoped_media_folders` (nullable `tenant_id`, FK to tenants, index; applied to mission DB; types regenerated, import map unchanged); F15 production refusal in `verifyTurnstile` and `checkRateLimit` (`RATE_LIMIT_OPTIONAL=1` read only there). tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 21 passed incl. 1 expected-fail (F22), F9/F11 tests now pass, `migrate:fresh` applied 7 migrations; 0 flaky; 130 s wall; `dev` rows 0 in both DBs. F15 proof: contact 500 "Something went wrong." with the Turnstile message logged, vote 500 (`proofs/step4-f15.log`).
- 2026-09-26 03:22 UTC: Step 5 done: F10 fixed. `getPreviewUser` moved to `src/utilities/getPreviewUser.ts` with `getMarketingReadOptions` (drafts only for a super admin in Draft Mode, `overrideAccess: false`) used by both marketing queries; `/next/preview` destructures `{ user }` and 403s unless super admin; `ArchiveBlock` reads through access. S1.9 (5 browser tests) before the fix: anonymous `/next/preview` 200 instead of 403, `bOwner` in Draft Mode saw the marketing draft hero, the archive listed the never-published post; the anonymous marketing page 500'd because the harness set `SKIP_BUILD_STATIC_GENERATION` at runtime (now build-only, as in the Dockerfile). tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 26 passed incl. 1 expected-fail (F22), 0 flaky, 136 s wall; no `DYNAMIC_SERVER_USAGE` in the log; `dev` rows 0 in both DBs.
- 2026-09-26 03:36 UTC: Step 6 done: `portal-landing.spec.ts` (S2.1–S2.6, 10 tests) plus `uploadImage()`/`PNG_8PX` fixtures. New bug **F25** found and fixed: publishing an existing flagship page answered 500 (`deepMerge` treated null as an object); before the fix both S2.4 tests failed with 500 on publish, and the unknown-key case returned 200 (Payload strips unknown keys; case replaced by an unapproved variant). tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 36 passed incl. 1 expected-fail (F22), 0 flaky, 150 s wall; `dev` rows 0 in both DBs.
- 2026-09-26 03:43 UTC: Step 7 done: `patch-notes.spec.ts` (S3.1–S3.4, 8 tests) and a shared `eventually()` fixture. Before the fixes (spec only): 2 F8 failures, a partial title PATCH re-dated the note (`publishedAt` 2026-02-01 → the edit time), and a REST draft was stamped at save time; plus one selector bug in the spec, since fixed. The F7 rename test passed: `/g/**` routes render dynamically, so F7 is latent (Decisions, Q4). Fixed F8 in `populatePublishedAt` and F7 in `revalidateGameProject` (layout-level revalidation of current, previous and deleted slugs). tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 44 passed incl. 1 expected-fail (F22), 0 flaky, 166 s wall; `dev` rows 0 in both DBs.

- 2026-09-26 04:01 UTC: Handoff H1 (remove template surface: yes) and H2 (folder backfill: delegated) picked up: Decisions recorded, `planner` added Steps 17a–17c; the plan's remaining questions moved to the handoff file as H3 (deploy keys + backup), H4 (ISR) and H5 (seed route). Step 8 done: `issues-voting.spec.ts` (S4.1–S4.3, 3 tests). Before the fix, S4.3 showed the F3 leak (the FIXED issue's page read "This issue was fixed in v9.9.9 — Secret expansion patch" for a draft note); S4.2 also failed on a spec bug (equal-vote board order), since fixed. F3 part 1: every public portal read in `getGameProject`, `issues.ts` (except `getHasVoted`), `patchNotes.ts` and the landing passes `overrideAccess: false`; RSS reuses `getGameProject` and `queryPublishedPatchNotes({ limit: 20 })`. tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 47 passed incl. 1 expected-fail (F22), 0 flaky, 173 s wall; `dev` rows 0 in both DBs.
- 2026-09-26 04:22 UTC: Step 9 done: S4.4–S4.6 added to `issues-voting.spec.ts` (6 tests). Before the fix (spec only, previous build): 8 parallel votes left `upvoteCount` 4 with 8 vote rows; a same-cookie parallel add answered 500; one vote moved the issue's `updatedAt`. Fixed F4: IssueVotes `afterChange`/`beforeDelete` hooks own the counter via `adjustUpvoteCount` (`$inc`, `updatedAt: null`), the route is a thin toggle (`getClientIP`, visitor-access lookup, NotFound/unique-violation treated as done, count read after the write, errors logged). New shared `revalidateGameLanding` replaces three copies (F14 part). Spec fix: S2.1 now waits for the 404 heading before reading the body (it read an empty body once). tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 53 passed incl. 1 expected-fail (F22), 0 flaky, 183 s wall; `template-revalidation.int` 3/3; `dev` rows 0 in both DBs.
- 2026-09-26 04:28 UTC: Step 10 done: F4 cutover migration `20260926_042239_reconcile_issue_upvote_counts` (data only; `migrate:create` produced a blank migration and a snapshot identical to 030253, so no drift) recounts each issue's same-tenant votes. Proof on the mission DB (`proofs/reconcile-upvotes.sql`, `proofs/step10-reconcile.log`): X 7 → 2 with a third, other-tenant vote not counted, Y 3 → 0, both `updated_at` unchanged, migration applied in batch 3 after `tenant_scoped_media_folders`; `down` left a count of 11 untouched and re-applying restored 2; fixture rows deleted (0 left). F22 fixed: Issues `beforeDelete` `deleteIssueVotes` removes the votes in the delete's transaction. tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 53 passed, 0 expected-fail (F22 now passes, S1.2's rejected cross-tenant delete keeps its votes), 0 flaky, 179 s wall; `dev` rows 0 in both DBs.
- 2026-09-26 04:40 UTC: Step 11 done: `reports-contact.spec.ts` (S5.1–S5.6, 11 tests) and a worker-scoped `webhookSink` fixture (HTTP server on `DISCORD_WEBHOOK_TEST_ORIGIN`, records requests per path, 307 on request). Five expected failures, each with its finding's symptom: [F12] a native report to a Tally-routed project answered 200, not 400; [F5] the PATCH response and an immediate GET carried `issue`, but 1 s later `updatedAt` had moved (06.582Z → 06.611Z) from the detached self-update; [F21] the 307 target path received the POST; [F21] all 8 non-Discord webhook URLs saved (200), the 5 allowed ones too; [F13] the undelivered email job was gone (0 kept). Browser Turnstile (real widget, test keys) works. tsc 0; lint 0 errors, 27 warnings (unchanged); E2E exit 0, 65 passed incl. 5 expected-fail, 0 flaky, 196 s wall; `dev` rows 0 in both DBs.

## Summary
