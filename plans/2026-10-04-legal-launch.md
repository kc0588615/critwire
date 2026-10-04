---
mission: legal-launch
project: critwire
branch: agent/legal-launch
status: active
started: 2026-10-04 21:06 UTC
---

# Mission: critwire legal launch

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

critwire.com gets the legal groundwork it needs before open signup can return: three policy documents, real agreement from every studio account, notices wherever players submit something, and less personal data. When this mission is done:

1. **Three legal documents, kept in the repo and versioned.**
   - Files: `legal/terms.md`, `legal/privacy.md` and `legal/copyright.md`. Each has front matter with `version`, `effective` (a date) and `status: draft|final`.
   - They're rendered at `/legal/terms`, `/legal/privacy` and `/legal/copyright`. While a document's status is `draft`, its page says plainly that it's a draft under legal review.
   - The mission writes them as drafts for a lawyer, in plain English. Where it doesn't know a fact, it writes a `[placeholder]` in square brackets and never invents one.
   - **Operator:** **Haunted Pavement LLC**, a Wisconsin limited liability company. Contact `admin@critwire.com`. Postal address `[LLC street address]`. Wisconsin governing law, with courts in `[county] County, Wisconsin`.
   - **What they cover:** the hosted service at critwire.com only. The code is MIT-licensed, and each self-hosted instance is run by its own operator under its own terms. Say so in all three documents and in `docs/self-hosting.md`.
   - **The Terms must cover:**
     - Accounts are for people aged **18 or older**.
     - Account holders are responsible for their own accounts. Studios are responsible for their portals and for how they use the feedback players send them.
     - Acceptable use: no illegal content, harassment, sexual content involving minors, malware, spam or infringing material. No passwords, keys, payment, health or other sensitive information in any submission.
     - A limited licence to the content people submit, so the service can run. A separate grant for feedback about critwire itself.
     - The operator may review, hold or remove content, and suspend or close accounts and studios. It may change, limit or shut down the service, giving notice where practical. The free hosted tier may gain limits or paid plans later.
     - **critwire is a community feedback and project-communication service, not a system of record, archive, backup service or authoritative source.** Data and content may be incomplete, inaccurate, unavailable, lost, corrupted, changed or deleted, and users keep their own copies of anything important.
     - The service is provided "as is" and "as available". Nobody may rely on information other people post.
     - Limitation of liability, with a cap of `[cap: suggest one for the lawyer]`.
     - Narrow responsibility for one's own content.
     - How changes work: material changes get a new version, and accounts must accept it again.
   - **The Privacy Policy is written from an audit of the actual code and services, not a template.** It covers what is collected, why, where it's kept, for how long, and which outside services handle it. The starting inventory is in Notes; verify every line in the code and correct it where it's wrong.
     - Players have no accounts. Critwire isn't directed at children under 13, and it doesn't knowingly collect their personal information.
     - No ads, no analytics, no selling of data.
     - Requests go to `admin@critwire.com`.
     - Deleting an account works as Goal 6 describes.
   - **The copyright policy covers:**
     - What a notice must contain, and where to send it: the designated agent, `[DMCA agent: pending registration]` until it's registered, with `admin@critwire.com` for now.
     - Removal, counter-notices and restoration.
     - **The repeat-infringer policy:** a studio with repeated valid notices is suspended, using the suspension that already exists.
2. **Studio accounts agree for real.**
   - **At signup:** two unticked checkboxes, both required and checked on the server:
     - "I agree to the [Terms of Service] and acknowledge the [Privacy Policy]", with both documents linked.
     - "I confirm I'm at least 18 years old."
   - **A record of each acceptance:** a new collection (for example `legal-acceptances`) with the user, the Terms version, the Privacy version and the time. Only super admins can read it. Don't store an IP address for this.
   - **A first-login check:** any signed-in user who isn't a super admin, and whose latest acceptance doesn't match the current versions, goes to `/legal/accept` first, with the same two checkboxes. That applies before the admin or onboarding. It catches accounts a super admin created by hand, and runs again whenever a document's version changes.
   - Super admins are exempt, because they act for the operator.
3. **Players see the terms where they submit.**
   - **A notice next to every submit button:** "By sending this, you agree to the Terms of Service and acknowledge the Privacy Policy", with both linked. It appears on:
     - the feedback form (`/g/<game>/feedback/new`)
     - the contact form (`/g/<game>/contact`)
     - the abuse-report form (`/report-abuse`)
     - Discord: in the `/feedback` confirmation, and in the command's description where Discord allows it.
   - **A warning next to every free-text field,** including the Discord `/feedback` form: "Don't include passwords, API keys, access tokens, private keys, payment details, health information or anything else confidential or sensitive."
   - **Footer links** (Terms · Privacy · Copyright) on the home page, every portal page, and the sign-in, signup, verify and onboarding pages.
4. **The feedback form's email is removed completely.** That means the field on `/g/<game>/feedback/new`, its check in the submit route, `submitterEmail` in `src/lib/game-portal/reports.ts`, the field on `issue-reports`, the seed, the generated types, the docs and the tests.
   - A migration drops the column and its data.
   - The submit route rejects or ignores an `submitterEmail` sent anyway.
   - An audit search finds no `submitterEmail` anywhere.
5. **The contact form keeps its optional email, but critwire doesn't keep it.**
   - The label becomes "Email (optional, 13 or older), so the {game} team can reply".
   - Once the message is delivered (email or Discord), nothing in critwire still holds the address. If finished jobs stay in the database, delete them or remove the address from them.
   - A failed delivery keeps it only until the job is retried or cleared, and the Privacy Policy says so.
   - The policy also says that a delivered message lives on in the studio's own inbox or Discord.
6. **Deleting an account anonymizes it.** When a super admin deletes a user, their identifying account data goes: email, name and sessions.
   - Anything that pointed to them, such as a studio's owner field on `Tenants` and anything else the audit finds, falls back to a generic "deleted user" or is cleared.
   - Studio content stays.
   - Acceptance records are kept only as far as the Privacy Policy says, and it must say why.
   - Deleting a whole studio removes its content, as the policy describes.
7. **LICENSE** reads "Copyright (c) 2026 Haunted Pavement LLC" (handoff H7), and so does every other place that names a copyright holder.
8. **The copy matches the Terms.** The home page, the README and the docs make no promises about data safety, permanence or backups. Check them, and fix anything that does.

### Why

Danby (the owner) closed open signup on 2026-10-04 until critwire.com has proper terms (handoff H8), with Haunted Pavement LLC as the operator. His priorities are to limit legal exposure, especially around data reliability, and to reduce children's-privacy risk. Players include children, which is why critwire collects as little as possible about them and studio accounts are 18+. The documents are drafts that his Wisconsin lawyer will review. The code must already behave the way they say.

### Scope

In:
- Everything under Goal, the docs it touches, and the handoff items in "Definition of done".

Out:
- **Turning signup on.** Leave `CRITWIRE_OPEN_SIGNUP` alone; production stays as it is. Never touch `/srv/apps/critwire`, the `critwire_live` database or the deploy.
- Cookie banners and consent tools. If the audit shows one is needed, add a handoff item instead.
- Age checks beyond the checkbox. Storing IPs for acceptances.
- Emailing players.
- Legal advice: the documents are drafts, and the Summary says so.

### Definition of done

- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm build` and the full E2E suite pass.
- New E2E tests cover:
  - Each legal page rendering its version, effective date and draft note.
  - Signup refusing a request that's missing either checkbox, including one sent straight to the submit route, and recording the acceptance with both versions.
  - The first-login check: an account a super admin created goes to `/legal/accept`, reaches the admin once it accepts, and is checked again after a version bump. A super admin is never checked.
  - The notice and the warning on the feedback, contact and abuse-report forms and in the Discord `/feedback` flow, using the existing locally signed Discord test requests.
  - The feedback form with no email field, and the submit route storing no email even when one is sent.
  - A delivered contact message leaving no email anywhere in the database.
  - Deleting a user: the studio's owner shows as a deleted user, and the studio's content stays.
  - The footer links on the home page, a portal page and the auth pages.
- The migration runs cleanly on a copy of the Critter Connect seed.
- Screenshots (desktop 1440 px and mobile 390 px) of the three legal pages, signup with its checkboxes, `/legal/accept`, and the three forms with their notices. Save them in `/srv/critter-ai/agent-state/missions/legal-launch/screenshots/` with an `index.html`.
- **The Summary contains:**
  - The data inventory as a table: what, why, where, how long, who handles it.
  - Every `[placeholder]` left in the documents.
  - Anything the documents promise that the code doesn't yet do. This should be none.
  - A note that the documents are drafts pending legal review.
- **Handoff items for Danby:**
  - Fill in the placeholders (LLC street address, county, liability cap) and get the lawyer's review. When they're final, set `status: final` and bump the versions.
  - Register the DMCA agent with the U.S. Copyright Office, with click-by-click steps. It costs $6, renews every three years, and makes the LLC's name and street address public. Then put the agent's details in `legal/copyright.md`.
  - When all of that is done, turn signup back on (`CRITWIRE_OPEN_SIGNUP=1` and restart `app@critwire`).
- Close handoff H7 once the LICENSE is changed.
- Branch `agent/legal-launch` pushed. Don't merge it.

### Decision rules

- **The documents describe what the code actually does.** Where they differ, change the code or the document, and record which one under Decisions. Never ship a mismatch.
- **Collect less.** No new personal data. Players never need an account.
- **Don't invent facts.** Anything you don't know (an address, a county, a cap, a provider's region) is a `[placeholder]`, listed in the Summary.
- **Plain English.** Short sections and clear headings, without legalese where plain words do the job.
- **Owner decisions go in the handoff file.** Pick the more protective option and carry on.

### Notes

- Base: `main` at `3054287`, which is what production runs.
- **Starting data inventory for the Privacy Policy** (verify every line against the code):

  | What | Details |
  |---|---|
  | Studio accounts | Email, name, a hashed password and login sessions (Payload auth cookies). Game details, updates, feedback triage and uploaded images, stored on the server's disk in `media/`. |
  | Player feedback | Text, type, category, platform and version. No email once Goal 4 is done. |
  | Player contact messages | Name and email (both optional), subject and message. Delivered to the studio by email through Resend, or to a Discord webhook. |
  | Discord submissions | The Discord username and user ID, stored privately (`src/collections/IssueReports`, the `discord` group). |
  | Abuse reports | Page URL, reason, details and an optional email, visible only to super admins (`src/collections/AbuseReports`). |
  | Votes | A signed random token in a cookie, with only its hash on the server (`src/app/api/vote/route.ts`). |
  | IP addresses | Sent to Upstash as rate-limit keys for votes, forms and referral counts (`src/lib/public-forms/guard.ts`, `src/app/api/vote/route.ts`, `src/app/api/referrals/route.ts`). Discord user IDs are rate-limit keys too. The signup email budget uses a hash of the email. |
  | Referral counts | Counts only, per game, day and source. |
  | Outside services | Oracle Cloud (hosting, Chicago, US); Cloudflare Turnstile (on every public form); Upstash Redis (region `[placeholder]`); Resend (email, us-east-1); Discord (when a studio connects it). No Sentry, analytics or R2 in production. |
  | Logs | Caddy has no access log. The app logs to the server's journal; check whether it logs IPs or emails, and say how long the journal keeps them. |

- Files to start from:
  - Signup: `src/app/(frontend)/signup/page.tsx`, `verify/[token]/page.tsx`, `onboarding/page.tsx`.
  - The players' forms: `src/app/(public)/g/[gameSlug]/feedback/new/`, `contact/`, `src/app/(frontend)/report-abuse/`.
  - Contact jobs: `src/jobs/contact.ts`.
  - Discord feedback: `src/lib/discord/feedback.ts`.
  - Footers: `src/components/game/PortalFooter.tsx`, `src/components/marketing/MarketingHome.tsx`.
- The only relationship to `users` is on `Tenants`, at `src/collections/Tenants/index.ts:70`.
- Production has open signup off. E2E sets `CRITWIRE_OPEN_SIGNUP=1` for its own servers, so the signup tests work as before.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Run on 2026-10-04 at `05522ea` (= `main` at `3054287` plus the mission start), against the mission's own databases (`critwire_m_legal_launch`, `critwire_m_legal_launch_e2e`).

- `pnpm install --frozen-lockfile`: already up to date.
- `pnpm payload migrate`: nothing to run; 19 migrations applied, the latest `20261002_161631_discord_stage_posts`. No `dev` row in `payload_migrations`.
- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass, 0 errors and 20 warnings (unused args, already on `main`).
- `pnpm test:int`: pass, 4 files, 34 tests.
- `pnpm test:e2e`: pass, 181 tests in 11.3 min (the run includes the production `next build`).

## Architecture

Checked against the code at `13fe16e` (= `main` `3054287` + mission start), and read-only on this VPS. Line numbers are at that commit.

### Findings

Ranked by impact. Each fix is detailed under Target design.

**F1 · The feedback form collects players' emails and shows them to studios** (breaks "collect less"; Goal 4)
- `src/app/(public)/g/[gameSlug]/feedback/new/page.tsx:186,214,236-240` renders `EmailField` on the bug and the idea form. `…/feedback/new/submit/route.ts:22` accepts `submitterEmail`, and `src/lib/game-portal/reports.ts:61,81` stores it.
- `src/collections/IssueReports/index.ts:91-94` gives the field no field access, so every member of the studio reads it. The comment at `:28` admits "reports may contain emails".

**F2 · No terms, no consent, no gate** (legal; Goal 2)
- `src/collections/Users/index.ts:24` sets `access.admin: authenticated`, so any signed-in account opens the admin.
- `/signup` asks only for an email (`signup/page.tsx:53-73`, schema at `signup/submit/route.ts:16-18`).
- `/onboarding` checks only the session (`onboarding/page.tsx:33-36`, `onboarding/submit/route.ts:57-61`).
- Users a super admin creates start verified (`Users/hooks/verifyUsersSuperAdminsCreate.ts`) and see nothing at all.
- Production had open signup from 2026-09-29 to 2026-10-04, so real accounts with no agreement may exist.

**F3 · Deleting a user is a hard delete that erases the owner trail** (fails the DoD; Goal 6)
- `Users/index.ts:26` lets super admins hard-delete.
- In the current schema (`src/migrations/20261002_161631_discord_stage_posts.json`), the only references to `users` are:
  - `users_sessions`, `users_roles`, `users_tenants`, `payload_preferences_rels` and `payload_locked_documents_rels`, all cascade;
  - `tenants.created_by_id`, SET NULL (`src/migrations/20260930_111418_open_signup.ts:35`).
- No content row, no versions table (`_patch_notes_v`, `_pages_v`) and no Discord row points to a user.
- **Correction to Notes:** there is no `Tenants.owner`. `src/collections/Tenants/index.ts:64-78` (`:70` is `relationTo: 'users'`) is `createdBy`: super-admin-only, unique, and set by onboarding only.
- A studio's owners are rows in each user's plugin-managed `tenants` array (`src/plugins/index.ts:37-58`), which a hard delete cascades away.
- So today the email, hash and sessions go and the content stays. But the studio is left with no owner and nothing showing that one was deleted.

**F4 · Contact messages: deletion relies on an unstated default, and failed jobs never expire** (fail loud, privacy; Goal 5)
- The route queues `name`, `email`, `subject` and `message` into `payload_jobs.input`, then runs the job at once (`contact/submit/route.ts:49-67`). Each attempt also copies `input` into `payload_jobs_log.input`, which cascades with the job.
- **On success,** Payload deletes the job only because `jobs.deleteJobOnComplete` defaults to `true` (`payload/dist/config/defaults.js:64`, `queues/operations/runJobs/index.js:400`). `src/payload.config.ts:118-162` never says so, and a failed delete is only logged.
- **On failure,** there are 2 retries (`src/jobs/contact.ts:73,119`), then `hasError`. The input stays until a super admin retries or deletes the job.
  - A deleted game makes its jobs fail for ever (`contact.ts:50-67`). Those messages are never delivered and never removed.
- `contact.ts:106` writes the studio's contact address (`to`) to the journal on every email delivery.

**F5 · Studio deletion is untested and probably racy** (bug risk; Goal 6)
- **What runs:** the multi-tenant plugin's `afterTenantDelete` (`@payloadcms/plugin-multi-tenant/dist/hooks/afterTenantDelete.js`).
  - It deletes the tenant's `game-projects`, `patch-notes` (with their versions), `issues`, `issue-reports`, `issue-votes`, `media` and `payload-folders`, and strips the tenant from users.
  - Media deletes remove the files and every generated size from `media/` (or R2), through Payload's `deleteAssociatedFiles`.
- **Left behind:**
  - `discord-posts` rows (SET NULL; IDs only, no personal data);
  - `abuse-reports`, which are platform records: `gameProject` is set to null and `pageUrl` stays;
  - contact jobs for the studio's games (see F4).
- **The race:** the plugin deletes with `Promise.all`, without `req`, so outside the tenant delete's transaction.
  - `IssueVotes`' `beforeDelete` calls `adjustUpvoteCount` (`src/collections/IssueVotes/hooks/adjustUpvoteCount.ts:25-33`).
  - Its `db.updateOne` returns `null` when the issue was deleted at the same moment, and `issue.isPublic` then throws.
- No E2E deletes a studio.

**F6 · Docs claim backups the hosted service doesn't have** (copy contradicts the Terms; Goal 8)
- `docs/architecture.md:339-340` says "daily `pg_dump` … 30-day retention … restore tested monthly".
- `docs/integrations.md:107-108` calls R2 the destination for nightly backups.
- `docs/deploy.md:163` says "Backups (set up during Phase 7 hardening)".
- On this VPS there's no crontab and no backup timer, so `critwire_live` is never dumped.

**F7 · Logs have no time limit** (privacy)
- journald runs on its defaults:
  - no drop-ins in `/etc/systemd/journald.conf.d/`, and an empty `[Journal]` section;
  - only `ForwardToSyslog=yes`, from `/usr/lib/systemd/journald.conf.d/syslog.conf`.
- The journal is persistent: 138 MB today, oldest entry 2026-09-22. With no `MaxRetentionSec`, entries stay until the size cap (10 % of the disk, at most 4 GB), which means months.
- rsyslog also copies everything to `/var/log/syslog`, kept 4 weeks (`/etc/logrotate.d/rsyslog`).
- **What the app logs:** IDs, never IPs or player names. There are two exceptions:
  - `contact.ts:106` logs the studio's address;
  - `src/lib/email/adapter.ts:68` logs recipients, but only when Resend is off, so not on the hosted instance.
- Error entries can include technical details of the failed request.
- Caddy: no access log, confirmed. Its log holds only admin-API reloads from 127.0.0.1.

**F8 · Copyright holder** (Goal 7)
- To change: `LICENSE:3` says "Critwire contributors", and `src/Footer/Component.tsx:23` says "© {year} Critwire".
- To leave alone:
  - `src/components/game/PortalFooter.tsx:39` is the studio's own notice;
  - `src/lib/share/fonts/LICENSE` belongs to DejaVu.
- No other file names a holder: README, `package.json`, the email templates and the embed loader don't.

**F9 · Discord has room for the notice but no slot for the warning**
- The command description is 47 characters (`src/lib/discord/commands.ts:21`); Discord allows 100.
- The forms are built from Label components (`src/lib/discord/interactions.ts:292-335`). A Label can carry a `description` of up to 100 characters, but `FormFieldSpec` (`:273`) has no such field.
- A placeholder (100 characters) is the wrong slot. It vanishes once the player types, and Send to critwire's fields are prefilled, so it never shows there.
- The bug form with a game picker already has Discord's maximum of 5 components, so there's no room for a separate text block.
- The confirmations are at `src/lib/discord/feedback.ts:299-309`.

**F10 · Original uploads keep their metadata** (privacy, minor)
- Payload stores an original untouched unless sharp adjustments are configured (`payload/dist/uploads/generateFileData.js:121-128`), and `Media.ts` sets sizes only.
- So a JPEG's EXIF, GPS included, is served with the original. The policy discloses this, and stripping it is a follow-up.

#### The starting data inventory, verified

| Inventory line | Verdict |
|---|---|
| Studio accounts | Right, plus:<br>• verification and reset tokens, the failed-login count and lock time;<br>• a signup never completed leaves a pending account (email only) with no expiry;<br>• sessions in `users_sessions`: 2-hour tokens, refreshed while active (Payload's default `tokenExpiration: 7200`);<br>• cookies `payload-token`, `payload-tenant` (up to 1 year, `onboarding/submit/route.ts:40`) and `payload-theme` (1 year).<br>Images live on the server's disk in `media/` (`src/lib/media/storage.ts`); R2 is used only if `R2_BUCKET` is set. |
| Player feedback | Right once Goal 4 is done. Today it also holds `submitterEmail`, which the whole studio can read (F1). |
| Player contact messages | Right, plus where they sit: in `payload_jobs.input` and `payload_jobs_log.input` until delivered (F4).<br>• Resend gets the message, with the player's address as Reply-To and in the body.<br>• The Discord embed shows it in its "Email" field. |
| Discord submissions | "Privately" means never public. The studio's members do read the user ID, the username and, for Send to critwire, a link to the message: the group has create and update access only (`IssueReports/index.ts:131-174`).<br>The interaction ID is super-admin only.<br>A moderator can import another member's message, so its author may never have used critwire. |
| Abuse reports | Right, plus the linked game. Kept until a super admin deletes the report; there's no expiry. |
| Votes | Right. The `cw_vote_token` cookie lasts 1 year (`src/lib/security/voteToken.ts:12`) and is set only on a first vote.<br>Each vote row keeps the token hash, the item and a timestamp, so one browser's votes can be linked to each other, but not to a person. |
| IP addresses | Right for Upstash. Keys expire after 2 × window + 1 s (`@upstash/ratelimit`), so at most about 2 hours (the longest window is 1 hour).<br>Also sent to Cloudflare Turnstile as `remoteip` on every public form (`src/lib/turnstile/verifyTurnstile.ts:35`), and the widget loads from Cloudflare in the visitor's browser (`TurnstileField.tsx:14`).<br>Never stored in Postgres or in the logs.<br>The email budget uses an unsalted SHA-256 of the address, shared by signup and password recovery (`emailBudget.ts:13`). |
| Referral counts | Right. Each day's hash lives 35 days after its last hit (`referrals/counter.ts:14`). |
| Outside services | Oracle's region is confirmed as `us-chicago-1` from instance metadata.<br>Missing from the line:<br>• **Namecheap**: DNS, plus the forwarding for `admin@critwire.com` (MX `eforward*.registrar-servers.com`);<br>• **Tally**, only on portals whose studio chose it (an iframe and script from tally.so).<br>Corrections:<br>• no Cloudflare proxy sits in front of critwire.com;<br>• there are no analytics in the code;<br>• fonts are self-hosted by `next/font`.<br>Sentry and R2 are switched by env vars in the live `.env`, which is off limits here, so the owner confirms them (handoff). |
| Logs | See F7. |
| Not listed | • Legal acceptances (new).<br>• Admin preferences (`payload_preferences`, no personal data).<br>• Discord user IDs used as Upstash keys (about 20 minutes).<br>• EXIF in original images (F10).<br>• **No backups** (F6). |

**Cookie banner: not needed.** Every cookie serves something the person asked for: signing in, the chosen studio, the admin theme, a vote, a super admin's preview. There are no analytics or advertising cookies. So no handoff item, though the lawyer can confirm.

#### Every `submitterEmail`
- **Code:**
  - the feedback page, `:186,214,236-240`;
  - the submit route, `:22`;
  - `reports.ts:61,81`;
  - `IssueReports/index.ts:91-94`;
  - `src/seed/critterConnect.ts:326`;
  - `src/payload-types.ts:621,1241`.
- **Docs:** `docs/features.md:107`.
- **Tests:** `tests/e2e/reports-contact.spec.ts:74,88` and `tests/e2e/embed-feeds.spec.ts:89,107,142,223,270`.
- **History:** `src/migrations/20260707_132058_phase2_collections.ts:106`, every `.json` snapshot, and old `plans/`. Migrations are immutable, and the new migration has to name the column to drop it.
- **The audit:** `git grep -n -i -E 'submitter_?email' -- ':!src/migrations' ':!plans'` prints nothing.

#### Signup, verify, onboarding, login, and where the gate hooks in

**Today's flow**
- `/signup` (email and Turnstile) → `requestSignup` creates a pending user with a random password (`src/lib/accounts/requestSignup.ts:29-41,51-62`).
- The emailed link opens `/verify/<token>`, which sets the password, verifies the account and signs it in (`verify/submit/route.ts:60-61`).
- Then `/onboarding` → `createStudio`.
- Users a super admin creates go straight to `/admin/login`, Payload's own view.

**Gate options considered**
- **Next proxy or middleware:** none exists today, and AGENTS.md forbids custom `proxy.ts` patterns. It would also need a JWT decode and a database read on every request. Rejected.
- **`beforeDashboard`:** runs on the dashboard only, so deep links skip it. Rejected.
- **A custom admin provider:** client-side, runs after render, and can be bypassed. Rejected.
- **The `(payload)` layout or page files:** Payload generates them ("DO NOT MODIFY"), and a layout doesn't re-render on client navigation. Rejected.
- **A Payload `afterLogin` hook:** runs only at login, can't redirect, and misses existing sessions and version bumps. Rejected.

**Chosen: `Users.access.admin`, Payload's own admin guard**
- It covers client-side navigation in the admin:
  - `RootPage` checks `permissions.canAccessAdmin` on every admin render (`@payloadcms/next/dist/views/Root/index.js`), and client navigation in the admin fetches that server render.
  - Every admin server function calls `canAccessAdmin` too (`payload/dist/utilities/canAccessAdmin.js`).
- When a signed-in user fails it, Payload redirects to `/admin/unauthorized?redirect=<route>`.
- That view can be replaced, exactly as the repo already replaces `forgot` (`src/payload.config.ts:44-47`).
- `/admin/logout` stays public (`isPublicAdminRoute`).

**API: block content writes, leave reads and auth open**
- `access.admin` doesn't cover REST or GraphQL, so without more an account that never agreed could post updates or upload images through `/api/*`.
- **Writes are blocked by one hook**, beside `enforceTenantWrite` on the plugin's tenant field (`src/plugins/index.ts:61`). That's where every tenant-scoped write already passes, for the reason given in `src/access/tenantWrite.ts:9-16`.
- **Reads and auth endpoints stay open:**
  - login, logout, `me` and `refresh-token` are needed by `/legal/accept` itself;
  - reading your own data creates no new obligation.

#### Rendering the markdown
- No markdown renderer is a direct dependency. `marked@15.0.12` is already in the lockfile through `react-email@6.6.6`, so pinning it adds no package.
- Lexical's `convertMarkdownToLexical` would need a new editor config, since `defaultLexical` has no headings or lists.
- There's no front-matter parser in the dependencies, and three scalar keys don't justify `gray-matter`.
- The share font is the precedent for reading a file at runtime (`next.config.ts:43-47`):
  - production on this VPS runs `next start` from the checkout;
  - Docker runs the standalone output, so the files must be traced into it.

#### Footers
- **`src/Footer/Component.tsx`** sits in the `(frontend)` root layout (`layout.tsx:34`). It covers `/`, `/signup`, `/verify/<token>`, `/onboarding`, `/report-abuse` and the new `/legal/*` pages.
- **`PortalFooter`** covers every portal page.
  - Its nav already shows the studio's own "Privacy policy" and "Terms" links (`src/lib/game-portal/links.ts:27-28`), so critwire's links must read as critwire's.
- **`/admin/login`** belongs to Payload; its slot below the form is `admin.components.afterLogin`.

#### Copy that promises safety, permanence or backups
- F6 is the only data promise.
- Checked and fine:
  - the home page: "Nothing is public until you say so" describes the review default;
  - README and `docs/features.md:17,323`: "free … always will be" is about the MIT licence;
  - `docs/embed.md`, `share.md`, `discord.md` and `self-hosting.md`.
- Inaccurate for the hosted service: `MarketingHome.tsx:105-106` says the filter runs "on your own server".

#### Checked and fine
- Voting: tokens are hashed.
- Referrals: counts only.
- The email budget: hashed.
- Turnstile: checked on the server.
- Discord OAuth asks only for `applications.commands webhook.incoming` (`src/lib/discord/oauth.ts:34`), so it stores no identity of the person installing.
- A game's contact email and webhook are studio-only (`tenantMemberFieldRead`).
- Payload's log of a failed sign-in carries no address.
- There's no middleware.

### Target design

#### One source of truth for the versions: front matter, read at runtime
- **The files:** `legal/terms.md`, `legal/privacy.md` and `legal/copyright.md`.
  - The front matter is exactly `version` (a string), `effective` (`YYYY-MM-DD`) and `status` (`draft` or `final`).
  - The drafts start at `0.1`, `draft`, `2026-10-04`.
- **The loader, `src/lib/legal/documents.ts`** (server only, no `@payload-config`), offers:
  - `getLegalDocument(slug)`, which returns `{ slug, title, version, effective, status, body }`;
  - `currentLegalVersions()`, which returns `{ terms, privacy }`;
  - `assertLegalDocuments()`.
- **How it reads:**
  - from `process.cwd()/legal/<slug>.md`, lazily, never at import, so the Payload CLI and config imports read no files;
  - memoized per process in production.
- **How it validates:**
  - a strict parser takes the leading `---` block, with only the three keys and no duplicates;
  - then Zod checks `version` (`/^[0-9A-Za-z][0-9A-Za-z.-]{0,31}$/`), `effective` (`z.iso.date()`) and `status`;
  - anything else throws.
- **Fail fast at boot:** `checkEnvironment()` in `src/instrumentation-node.ts` calls `assertLegalDocuments()`, so a missing or broken document stops the server, the same way a bad env var does.
- **Standalone output:** `next.config.ts` adds `outputFileTracingIncludes['/**'] = ['./legal/*.md']`. Verification checks that `.next/standalone/legal/terms.md` exists.
- **Why not a module generated at build time:** a generator would have to run before `dev`, `build`, `tsc` and lint, and its committed output can drift from the markdown. The runtime read follows the font's precedent, and the boot check fails just as fast.

#### Goal 1 · The legal pages
- **The route:** `src/app/(frontend)/legal/[document]/page.tsx`.
  - `generateStaticParams` returns the three slugs and `dynamicParams` is `false`, so anything else is a 404.
  - The pages are static, built from the same files.
- **What a page shows:**
  - the title;
  - "Version 0.1 · Draft of 4 October 2026" with the banner "This is a draft under legal review. It isn't final." while the status is `draft`, or "Version 1.0 · Effective <date>" once `final`;
  - the body, rendered by `marked` into a `cw-page` prose wrapper. The input is a trusted repo file.
- **Indexing:** the page sends `robots` noindex while it's a draft.
- **`src/lib/legal/paths.ts`** has no fs, so any module can import it. It holds:
  - `LEGAL_LINKS`: each document's href, its short label (Terms, Privacy, Copyright) and its title;
  - `acceptHref(next)`;
  - `safeNext(next)`, which allows only `/admin`, `/admin/…` and `/onboarding`, and returns `/admin` otherwise.
- **Who sees them:** the documents and everything built on them are on for every instance.
  - `docs/self-hosting.md` says `legal/` holds critwire.com's documents, which an operator replaces before anyone else uses their instance.
  - Decision: this fails safe for critwire.com (see Rejected alternatives).

#### Goal 2 · Agreement
- **The collection: `src/collections/LegalAcceptances.ts`**, slug `legal-acceptances`, platform-level (not tenant-scoped).
  - Fields:
    - `user`: relationship to users, required, indexed;
    - `termsVersion` and `privacyVersion`: required text.
  - Timestamps are on, and `createdAt` is the acceptance time. No IP is stored.
  - Access:
    - `read` is `superAdminOnly`;
    - `create`, `update` and `delete` are `() => false`.
  - Only server code writes records, through the Local API with `overrideAccess: true`, so nobody can forge or edit one.
  - In the admin it's hidden from everyone but super admins, as `AbuseReports` is.
- **`src/lib/legal/acceptance.ts`** takes `payload` and `req` from its caller and has two functions:
  - `needsLegalAcceptance({ payload, user, req? })` is a query.
    - It answers `false` for super admins.
    - Otherwise it counts this user's acceptances that match both current versions; zero means they must accept.
    - Only the current versions are ever recorded, so this is the same as "the latest acceptance matches".
  - `recordLegalAcceptance({ payload, userID, req? })` is a command that records the current versions.
- **The consent schema: `src/lib/validation/legalConsent.ts`.**
  - `acceptTerms` and `confirmAge` must each be `'on'` (from a form) or `true` (from JSON).
  - Both submit routes share it.
- **Signup:**
  - `signup/page.tsx` adds `<LegalConsentFields />`: two unticked, required boxes with both documents linked in a new tab.
  - The submit route extends its schema, so the guard refuses with a 400 before doing any work.
  - `requestSignup` records an acceptance:
    - for a new account;
    - for a pending one, when `needsLegalAcceptance` says so;
    - never for a verified account, which gets nothing, as today.
  - If that record ever fails after the user is created, the gate asks at the first sign-in.
  - The error text becomes "…check your email address, tick both boxes and try again."
  - `/verify/<token>` adds the line "You agreed to the Terms of Service and Privacy Policy when you signed up", with links.
- **The gate:**
  - `src/access/adminPanelAccess.ts` replaces `authenticated` at `Users/index.ts:24`. It allows a signed-in user for whom `needsLegalAcceptance` is false.
  - `src/components/admin/LegalGateView.tsx`, an `AdminViewServerProps` view like `ForgotPasswordView`, is registered as `admin.components.views.unauthorized`.
    - A signed-in user who still has to accept is redirected to `acceptHref(searchParams.redirect)`.
    - Anyone else sees Payload's "no access" header and Log out.
  - `onboarding/page.tsx` and `onboarding/submit/route.ts` check right after the session, then redirect to `acceptHref('/onboarding')`.
  - The write hook is `requireLegalAcceptance` in `src/access/legalWrite.ts`, added after `enforceTenantWrite` (`plugins/index.ts:61`).
    - It lets through writes with no user and super admins.
    - It memoizes its answer in `req.context`.
    - Otherwise it throws `APIError('Accept the current Terms of Service and Privacy Policy at /legal/accept before making changes.', 403)`.
    - Deletes pass.
- **The `/legal/accept` page** (dynamic, noindex, in an `AccountPage`):
  - with no session, it redirects to `/admin/login?redirect=/legal/accept`;
  - for a super admin, or when there's nothing to accept, it redirects to `safeNext(next)`;
  - otherwise it shows both versions, `<LegalConsentFields />`, "Agree and continue", Log out, and "If you don't agree, email admin@critwire.com to close your account."
- **`POST /legal/accept/submit`:**
  - it reads the session with `payload.auth({ headers })`;
  - it checks consent with Zod; if consent is missing it returns to the page with `?error=1`;
  - it records an acceptance only if one is still needed, then redirects (303) to `safeNext(next)`;
  - like onboarding, it has no Turnstile: it's authenticated and idempotent, and the session cookie is SameSite=Lax.

```
sign-in → /admin/* → RootPage: access.admin → needsLegalAcceptance? → no: admin
                                              → yes: /admin/unauthorized → LegalGateView → /legal/accept?next=…
/onboarding (+submit) → needsLegalAcceptance? → yes: /legal/accept?next=/onboarding
REST/GraphQL write to a tenant-scoped collection → requireLegalAcceptance → 403 until accepted
POST /legal/accept/submit → Zod consent → recordLegalAcceptance → 303 safeNext(next)
```

#### Goal 3 · Notices, warnings and footer links
- **One copy module: `src/lib/legal/copy.ts`.** It imports no React and no fs, so Discord code can use it. It holds:
  - `SUBMIT_NOTICE`, stored in parts so links can wrap the two document names: "By sending this, you agree to the Terms of Service and acknowledge the Privacy Policy" (85 characters);
  - `noticeMarkdown(termsURL, privacyURL)`, which uses Discord's masked links `[…](<url>)`;
  - `SENSITIVE_INFO_WARNING`, the Brief's exact sentence (143 characters);
  - `SENSITIVE_INFO_WARNING_SHORT`, for Discord: "Don't include passwords, keys, tokens, payment or health details, or anything sensitive." (88);
  - `DISCORD_FEEDBACK_DESCRIPTION`: "Send a bug or idea to the game's team. Sending it accepts critwire's Terms and Privacy Policy." (94);
  - the labels of the two checkboxes.
- **Components in `src/components/legal/`:**
  - `LegalNotice`;
  - `SensitiveInfoWarning`, with id `sensitive-info-warning`;
  - `LegalConsentFields`;
  - `LegalLinks` (Terms · Privacy · Copyright, in a `nav` with a `label` prop).
- **The forms:** feedback, contact and report-abuse each get:
  - the warning once, at the top of the fields;
  - `LegalNotice` beside the submit button.
- **Accessibility:** `FormField` gains `describedBy?`, so every free-text control's `aria-describedby` includes the warning.
  - Decision: one visible warning per form, linked to every free-text field, rather than one copy under each field.
- **Discord:**
  - Text fields in `FormFieldSpec` gain an optional `description`, which `formResponse` places on the Label. It throws when a description is over 100 characters, as it already does for `custom_id`.
  - Every text field of `/feedback` and of Send to critwire gets `SENSITIVE_INFO_WARNING_SHORT`.
  - Both confirmations end with `noticeMarkdown(absoluteURL(…))`.
  - `commands.ts:21` uses `DISCORD_FEEDBACK_DESCRIPTION`; registering the commands at boot overwrites the old text.
- **Footers:**
  - the `(frontend)` Footer gets `<LegalLinks label="Legal" />`;
  - `PortalFooter` gets `<LegalLinks label="Critwire legal" />` in its bottom row, shown even when "Powered by" is hidden;
  - a new `src/components/AfterLogin/index.tsx` is registered as `admin.components.afterLogin`;
  - run `pnpm generate:importmap`.

#### Goal 4 · The feedback form's email
- **What's removed:**
  - `EmailField` from the page;
  - `submitterEmail` from the route's schema, from `createPlayerReport` and from the collection field;
  - the seed value, the docs line and the tests.
- Then regenerate the types.
- **An email sent anyway is ignored, not rejected.**
  - Zod's `z.object` strips unknown keys, and Payload drops unknown fields.
  - Rejecting would lose a player's report sent from a cached old page.
- The comment at `IssueReports/index.ts:28` becomes "unvetted content and Discord identities".
- The migration drops the column and its data.

#### Goal 5 · The contact form's email isn't kept
- **Contact form label:** "Email (optional, 13 or older), so the {game} team can reply". Hint: "Sent to the team with your message; critwire doesn't keep it."
- **Abuse form:** the email label becomes "Your email (optional, 13 or older)". It's the only other place a player gives an address. Decision, taken because it's the more protective choice.
- **`payload.config.ts`** sets `jobs.deleteJobOnComplete: true` explicitly, with a comment that the policy depends on it.
- **`contact.ts:106`** logs only `projectID`.
- **New `src/collections/GameProjects/hooks/deleteContactJobs.ts`**, an `afterDelete` hook:
  - it deletes `payload-jobs` whose `taskSlug` is in `['email-contact-form', 'discord-webhook']` and whose `input.projectID` is the game's ID (Payload's JSON query; the E2E proves it works);
  - studio deletes reach it too, because the plugin deletes each game with its hooks.
- **The policy's wording:**
  - delivered → deleted at once;
  - failed → kept until a retry delivers it, a super admin deletes it, or the game or studio is deleted;
  - a delivered message lives on in the studio's inbox or Discord.

#### Goal 6 · Deleting an account anonymizes it
- **Users collection:**
  - `access.delete` becomes `() => false`, so there are no more hard deletes.
  - A new `deleted` checkbox, writable by super admins only, sits in the sidebar:
    - label: "Delete this account";
    - description: "Removes the email, name, password and sign-ins; shows as 'Deleted user'. Studios and their content stay. Can't be undone."
  - It's data, like `suspended`.
- **Two hooks:**
  - `beforeChange` `guardAccountDeletion` refuses (`ValidationError`) to untick it, and refuses a super admin deleting their own account.
  - `afterChange` `anonymizeDeletedUser` runs when `deleted` turns true and `req.context.anonymizing` isn't set. It returns the result of `anonymizeUser({ id, req })`, so the admin shows the scrubbed account.
- **`src/lib/accounts/anonymizeUser.ts`**, a command, makes one Local API `update`, with `overrideAccess`, the same `req` (so the same transaction) and `context.anonymizing`. It sets:
  - `email` to `deleted-<id>@deleted.invalid` (`.invalid` is reserved and never delivered);
  - `name` to "Deleted user";
  - a random 32-byte password. A `beforeChange` hook can't set one (`payload/dist/collections/operations/utilities/update.js:26`).
  - `roles` to `['user']`;
  - `sessions` to `[]`, which revokes every JWT because `useSessions` is on;
  - the reset and verification tokens to empty.
- **What stays:**
  - the `tenants` memberships and `Tenants.createdBy`, which now show "Deleted user" (`useAsTitle: 'name'`);
  - the legal acceptances: they record the terms under which content that stays was posted, and they no longer identify anyone;
  - all of the studio's content.
- **Deleting a studio:**
  - keep the plugin's cleanup;
  - give `adjustUpvoteCount` a null guard: a vanished issue has nothing to decrement;
  - add `deleteContactJobs`, above;
  - the new E2E proves the end state.

#### Goal 7 · Copyright holder
- `LICENSE:3` reads "Copyright (c) 2026 Haunted Pavement LLC".
- The `(frontend)` Footer shows "© 2026 Haunted Pavement LLC", as a static string.
- Close H7.

#### Goal 8 · Copy that matches the Terms
- `docs/architecture.md:339-340`: backups are the operator's job, and `docs/deploy.md` shows one way.
- `docs/integrations.md:107-108`: R2 "can hold an instance's backups".
- `docs/deploy.md:163` becomes "Backups (the operator's job)", noting that critwire makes none itself.
- `MarketingHome.tsx:105-106` says the filter runs "inside critwire, with no outside service".

#### The migration
- One migration, `legal_launch`, made with `pnpm payload migrate:create`. It:
  - drops `issue_reports.submitter_email`;
  - creates `legal_acceptances` (`user_id` NOT NULL with Payload's default ON DELETE SET NULL, so any hard delete fails loudly; an index on `user_id`; timestamps);
  - adds `payload_locked_documents_rels.legal_acceptances_id`;
  - adds `users.deleted`, a boolean defaulting to false.
- `down` reverses it, but the dropped emails don't come back.
- Then run `pnpm generate:types`.
- The migration check follows the `tests/migrations/feedback-pivot/` precedent: `tests/migrations/legal-launch/assert.sql`, run on a copy of the Critter Connect seed.

#### Revalidation
Nothing new needs it:
- the legal pages are static and change only with a deploy;
- the footers change only with a deploy, and the restart empties the in-memory ISR cache;
- users, acceptances, jobs and reports are never public;
- deleting a game or studio already revalidates through `revalidateGameProjectDelete`.

#### DRY points
- One copy module, used by the web and Discord.
- One component each for the notice, the warning, the consent boxes and the links.
- One `needsLegalAcceptance`, used by the admin guard, onboarding, `/legal/accept` and the write hook.
- One consent schema.
- One document loader, used by the pages, the versions and the boot check.

#### Docs
- `docs/features.md`:
  - the IssueReport fields;
  - Users: the gate and `deleted`;
  - LegalAcceptances;
  - contact-email retention;
  - the legal pages and the signup boxes.
- `docs/architecture.md`:
  - the `/legal/*` URLs;
  - the rendering table;
  - the project structure;
  - backups.
- `docs/patterns.md`:
  - the gate;
  - versions from front matter;
  - account deletion;
  - the shared legal copy;
  - contact jobs deleted once delivered.
- `docs/integrations.md`: `marked`, backups, and Resend's Reply-To.
- `docs/discord.md`: the notice and the warning.
- `docs/deploy.md`:
  - backups;
  - journal retention;
  - `legal/` traced into the standalone output.
- `docs/self-hosting.md`: whose documents these are, and replacing them.
- `AGENTS.md`:
  - a docs-map line for `legal/`;
  - a Testing note about the database helper.
- README: one line pointing to `legal/`.

#### The data inventory as the Privacy Policy will state it

| What | Why | Where | How long | Who handles it |
|---|---|---|---|---|
| Studio account: email, name (optional), password hash, sign-in tokens, failed-login count | Signing in and account emails | Postgres on Oracle Cloud, Chicago | Until the account is deleted (unfinished signups included). Deletion replaces the email, name and password and ends every session | Oracle; Resend for emails |
| Session and cookies (`payload-token`, `payload-tenant`, `payload-theme`) | Keep you signed in; remember your studio and theme | Browser; Postgres | Session: 2 hours after your last activity. The two preference cookies: up to 1 year | — |
| Legal acceptance: account, versions, time (no IP) | Shows what you agreed to | Postgres | Kept with the account. After deletion it's kept without the email or name, because it records the terms that applied to content that stays | Oracle |
| Studio content: studios, games, contact settings, updates, triage, images | Running your portals | Postgres; the server's disk | Until the studio deletes it or the studio is deleted. Deleting one person's account keeps it. Images are kept as uploaded, embedded metadata included | Oracle |
| Player feedback: title, description, type, category, platform, version | The studio's feedback board | Postgres | Until the studio deletes it or the studio is deleted. Published items are public | Oracle |
| Discord submissions: the above, plus Discord user ID, username and (Send to critwire) the message link | Lets the studio follow up | Postgres; the studio sees it, never the public | As above | Discord |
| Contact message: name and email (optional, 13 or older), subject, message | Delivering it to the studio | The job queue in Postgres | Deleted once delivered. If delivery fails: until a retry delivers it, a super admin deletes it, or the game or studio is deleted. A delivered message stays with the studio | Resend or Discord |
| Abuse report: page, reason, details, optional email | Moderation | Postgres, super admins only | Until a super admin deletes it | Oracle |
| Vote: random token in a cookie; only its hash on the server | One vote per browser | Browser; Postgres | Cookie: 1 year. Vote: until it's withdrawn or the item or studio is deleted | — |
| IP address | Rate limits on forms, votes and referral counts; bot checks | Upstash; Cloudflare Turnstile | Upstash keys expire within about 2 hours. Never kept in our database or logs | Upstash `[Upstash region]`; Cloudflare |
| Discord user ID | Rate limit on Discord submissions | Upstash | About 20 minutes | Upstash |
| Hash of an account email | Limits how many account emails go to one address | Upstash | About 2 hours | Upstash |
| Referral counts (not personal) | "Where players come from" | Upstash | 35 days after the day's last count | Upstash |
| Forms a studio runs on Tally | The studio's own form | Tally | Under the studio's and Tally's terms | Tally |
| Server logs: events with internal IDs, error details | Running and fixing the service | The server's system log | `[log retention]` (today: until the log's size limit) | Oracle |
| Email to admin@critwire.com | Requests | Forwarded by Namecheap to `[mailbox provider]` | `[retention of emails to admin@critwire.com]` | Namecheap; `[mailbox provider]` |
| Backups | — | `[backups]` | `[backup retention]` | Oracle |

#### Every `[placeholder]`
- `[LLC street address]`, in all three documents.
- `[county]`, for the courts (Terms).
- `[cap: …]`, with a suggestion such as the greater of US$100 or the fees paid in the 12 months before the claim (Terms).
- `[DMCA agent: pending registration]` (Copyright).
- `[repeat-infringer threshold]` (Copyright).
- `[Upstash region]` (Privacy).
- `[log retention]` (Privacy).
- `[backups]` and `[backup retention]` (Privacy).
- `[mailbox provider]` and `[retention of emails to admin@critwire.com]` (Privacy).

#### E2E specs
- **New helper, `tests/e2e/support/db.ts`.** It uses `pg` and `@types/pg` as devDependencies; both are already in the lockfile at 8.20.0. It offers:
  - `countInDatabase(needle)`: a read-only scan of every table's rows as text;
  - `ageLegalAcceptance(userID)`: puts a user's acceptance into the state a version bump leaves behind.
  - Why: REST deliberately can't write acceptances, and only a scan proves "no email anywhere in the database". Record the exception in AGENTS.md's Testing section.
- **New `legal-pages.spec.ts`:**
  - each page shows its version, its date and, while a draft, the draft banner, checked against front matter the test parses itself;
  - an unknown document is a 404;
  - the footer links appear on `/`, a portal page, `/signup`, `/verify/<token>`, `/onboarding` and `/admin/login`.
- **New `legal-acceptance.spec.ts`:**
  - signup:
    - the two boxes start unticked, are required and link both documents;
    - a direct POST missing either box gets a 400, with no account, no email and no record;
    - a POST with both records both current versions.
  - a user a super admin created:
    - is sent to `/legal/accept`;
    - a submit without the boxes is refused;
    - a REST write gets a 403;
    - after accepting, reaches the admin, and the write works.
  - a version bump: `ageLegalAcceptance` sends that user back to `/legal/accept`, from the admin and from `/onboarding`.
  - a super admin goes straight in.
  - the records: studio users can't read them, and super admins can't create, edit or delete them.
- **New `account-deletion.spec.ts`:**
  - a signed-up studio's owner is deleted:
    - `createdBy` and the users list show "Deleted user";
    - the portal stays up;
    - the old JWT and the old password both fail;
    - `countInDatabase(oldEmail)` is 0;
    - the acceptance remains;
    - REST DELETE, unticking and deleting yourself are all refused.
  - a studio is deleted: its game, update, item, report, vote, image file and failed contact job all go, the portal is a 404, and a scan for its markers returns 0.
- **Changed:**
  - `reports-contact.spec.ts`:
    - no email field;
    - the notice and the warning;
    - an email sent anyway isn't stored, and the scan returns 0;
    - the new contact label;
    - a contact message delivered through the webhook sink leaves no job, and the scan returns 0.
  - `abuse-reports.spec.ts`: the notice, the warning and the email label.
  - `discord-interactions.spec.ts`:
    - D4: the command description holds the notice and is at most 100 characters;
    - every text field carries the warning;
    - both confirmations end with the notice.
  - `embed-feeds.spec.ts`: drop `submitterEmail`.
  - `signup.spec.ts`, `onboarding.spec.ts` and the signup helpers tick the boxes.
  - `auth.setup.ts` and the fixtures `seedUser`, `seedStudio` and `signUpStudio` accept through the real route by default, with an option not to.
  - Screenshots get a `legal` group: the three pages, signup, `/legal/accept` and the three forms, at 1440 and 390 px. `setup.shots.ts` accepts for its studio accounts.
- No new int tests.

### Rejected alternatives
- **A versions module generated at build time:** needs a generator, and its output can drift from the markdown.
- **Lexical's `convertMarkdownToLexical`:** needs an editor config with headings and lists just to render the documents.
- **A proxy, `beforeDashboard`, a provider, edited Payload route files, or an `afterLogin` hook as the gate:** each misses deep links, client navigation or existing sessions, or breaks a project rule.
- **Gating the UI only:** leaves the API as a way around the checkboxes, when one hook closes it.
- **Blocking the whole API:** breaks login, `me` and token refresh, which `/legal/accept` needs.
- **A hard delete with fallback references:** nothing could show "Deleted user", because `createdBy` is unique and ownership lives on the user row. The acceptances would also be orphaned.
- **Payload's `trash`:** trashed users drop out of relationship population, and "delete permanently" brings the hard delete back.
- **A custom endpoint and a confirm button for deletion:** more code than a super-admin field plus a hook, for the same result.
- **Storing the accepted versions on the user, in the JWT:** duplicates state, and stays stale until the token refreshes.
- **An env flag that turns the legal surface on for the hosted instance only:** if it were ever left unset on critwire.com, the site would run with no terms.
- **Rejecting a `submitterEmail` sent anyway:** loses reports from cached old pages.
- **A scheduled purge of failed contact jobs:** the Brief already says "until retried or cleared", and E2E can't reach a scheduled task.
- **The checkboxes on `/verify` too:** a second consent step; a reminder line is enough.

### Risks and open questions
- **Studio deletion race.** If the new E2E still fails or flakes after the null guard, set `cleanupAfterTenantDelete: false` and add an ordered `afterDelete` on Tenants that runs inside the delete's transaction.
- **Self-hosted instances** show critwire.com's documents until their operator replaces them. This is documented.
- **Signing up with someone else's address:** the impostor ticks the boxes, and the inbox owner who later sets the password sees only the reminder line. The risk that remains is the same as in any email signup.
- **Cost:** one indexed count per admin render, per admin server function and per studio write (memoized per request).
- **Accounts that signed up while signup was open** are sent to `/legal/accept` on their next visit. That's intended.
- **Drafts are accepted as drafts.** Making the documents final bumps the versions, and everyone accepts again.
- **Possible follow-ups:**
  - Failed contact jobs expire only when their game or studio is deleted; a 30-day purge would bound them.
  - EXIF metadata stays in original images; a `resizeOptions` cap would strip it.
- **Handoff, new:** set a time limit on the VPS journal, for example a drop-in with `MaxRetentionSec=30day`. It's a root change that affects every app and is recorded in `ops/docs/vps.md`, so it's the owner's decision. It fills `[log retention]`.
- **Handoff, part of the placeholders item:**
  - confirm the live `.env` has no `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` or `R2_*`;
  - give the Upstash region;
  - say whether Oracle volume backups are on;
  - name the mailbox behind admin@critwire.com.
- **Handoff, from the Brief:** the placeholders and the lawyer's review; registering the DMCA agent; then turning signup back on.

## Architecture review (Fable)

Checked at `980dcb3` against the code and the installed Payload (`payload`, `@payloadcms/next`, `@payloadcms/drizzle`, `@payloadcms/plugin-multi-tenant`) and Next.

VERDICT: APPROVE_WITH_CHANGES

What I verified and found right:
- Every line reference in F1–F8 opens to what the finding says (`feedback/new/submit/route.ts:22`, `reports.ts:61,81`, `IssueReports/index.ts:92`, `Users/index.ts:24,26`, `Tenants/index.ts:64-78` is `createdBy` with `ON DELETE set null`, `docs/architecture.md:339-340`, `docs/integrations.md:107-108`, `docs/deploy.md:163`, `LICENSE:3`, `src/Footer/Component.tsx:23`, `MarketingHome.tsx:105-106`). The `submitterEmail` grep matches the list exactly.
- F4: `payload/dist/config/defaults.js:64` sets `deleteJobOnComplete: true`; `runJobs/index.js:400` deletes with `db.deleteMany` (no `req`), so `payload_jobs_log` rows (which do carry `input`, `queues/config/collection.js:114`) cascade with the job. Setting the flag explicitly is the right call.
- F5: `afterTenantDelete.js` runs `payload.delete` per collection in `Promise.all` without `req`: outside the transaction, hooks on, so the `GameProjects` `afterDelete` hook will run on studio deletes and the vote race is real.
- The gate: `views/Root/index.js:118` checks `permissions.canAccessAdmin` on every admin render; `handleAuthRedirect.js` sends a signed-in user to `/admin/unauthorized?redirect=<full /admin/... route>`; `getRouteData.js:106` resolves `admin.components.views.unauthorized` before the built-in view. Replacing that view is supported. `/onboarding` and `/onboarding/submit` have no admin guard today, so the explicit check there is needed, and the design has it.
- Migration: Payload emits `NOT NULL` for required relationships (`issue_reports.game_project_id integer NOT NULL` in the phase2 migration), so `legal_acceptances.user_id NOT NULL` + `SET NULL` will indeed make a hard delete fail loudly.
- `deleteContactJobs`' JSON path query: `@payloadcms/drizzle/dist/queries/parseParams.js:79-163` builds `->>` traversal for `json` fields, so `where: { 'input.projectID': { equals } }` is supported, not a gamble.
- `outputFileTracingIncludes` keys go through picomatch with `contains: true` (`next/dist/build/collect-build-traces.js:463-470`), so `'/**'` matches every route, and the font precedent is the same mechanism.
- `instrumentation-node.ts:12` already has `checkEnvironment()`; nothing in `src/`, the seed or `tests/` hard-deletes a user, so `access.delete: () => false` breaks nothing.
- Sentry: `src/instrumentation.ts` and `instrumentation-client.ts` set no `sendDefaultPii`, so the inventory's "never kept in our logs" holds for Sentry too if a DSN is ever set.

MUST-FIX:
1. **The API write gate leaves `tenants` open.** `requireLegalAcceptance` hangs off the plugin's tenant field, so it covers only the tenant-scoped collections. `Tenants.access.update` (`src/collections/Tenants/index.ts:21-25`) lets an owner change the studio's `name` and `slug` through REST/GraphQL, both of which are public on the portal, and no tenant field exists on `tenants` itself. The design states "one hook closes [the API]" and the E2E asserts "a REST write gets a 403" only for a tenant-scoped collection. Add the same check as a collection `beforeChange` on `Tenants` (one function, two hook signatures, or a tiny wrapper), and make the E2E try a `PATCH /api/tenants/<id>` too. Users' self-updates (`name`, `password`) can stay open: they're account actions, not content.

MISSED:
- **Password recovery for an anonymized account.** `POST /forgot-password/submit` will find `deleted-<id>@deleted.invalid` and ask Resend to send to a `.invalid` address, which Resend refuses, so the route logs an error and captures it in Sentry on every such request. Have the forgot route (or `restrictPasswordRecovery`) treat a `deleted` user like an unknown address: same generic answer, no send. Cheap, and it keeps the "fail loud" log free of noise that isn't a failure.
- **The warning text on Discord deviates from the Brief.** The Brief gives one exact sentence for every free-text field "including the Discord `/feedback` form"; the design uses an 88-character short form because a Label `description` caps at 100. That's the right call, but it's a Brief deviation and belongs under **Decisions**, and the Summary's "anything the documents promise that the code doesn't do" must not claim the exact sentence is shown on Discord.

SHOULD-CONSIDER:
1. Keep `{new Date().getFullYear()}` in `src/Footer/Component.tsx` and change only the holder; a static "© 2026" goes stale, and Goal 7 is about the name, not the year.
2. In `anonymizeUser`, assert the result: after the update, `sessions` must be `[]` and `email` must equal the new value, else throw. `sessions` is a hidden auth field; if a future Payload stops accepting it from Local API data, the E2E would catch it, but a one-line check inside the command keeps the policy's "ends every session" true at the source.
3. `needsLegalAcceptance` runs on every admin render and server function. Memoizing per `req` (as the write hook does) also covers the admin path, since `canAccessAdmin` and the view share the request. State in the plan that the cost is one `count` per request, not per call.
4. `safeNext` should also reject a `next` that starts with `/admin` but contains a backslash or `%5C`, and anything with a scheme; `new URL()` is fine for the check. Spell the rule out so the planner's step doesn't re-derive it.
5. The `Tenants` `createdBy` field reads as super-admin only, so a studio member never sees "Deleted user" anywhere; the E2E assertion "createdBy shows Deleted user" must run as a super admin. Note it in the spec outline so the implementer doesn't assert it from a member session.

## Architecture review (Astra)

Run at `16f7513` (`astra-review`, exit 0).

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **The write gate misses `Tenants`.** Owners can still update studio records through REST/GraphQL without accepting. Apply the shared acceptance check to `Tenants` writes and verify this bypass is closed.

2. **Signup acceptance is attributed to an unverified identity.** Anyone can submit another person’s email and satisfy that future account’s gate. Require confirmation by the verified account holder before treating signup acceptance as authoritative; a reminder on `/verify` does not establish agreement.

3. **Acceptance is not bound to the versions displayed.** Both submit paths record whatever versions are current when the request arrives. A deployment between rendering and submission can record agreement to unseen documents. Submit the displayed versions, validate them against current versions, and require renewed confirmation on mismatch.

4. **Contact-data deletion remains best-effort.** Payload catches completed-job deletion failures and only logs them; setting `deleteJobOnComplete: true` does not change this. Delivered addresses can remain indefinitely, contradicting Goal 5. Add recoverable cleanup for completed jobs and their logs, with failure-path verification and retention wording that matches actual behavior.

SHOULD-CONSIDER:

1. Resolve studio cleanup’s transaction boundary explicitly. Parallel deletes outside the parent transaction can partially commit; a null guard and passing E2E run do not establish failure atomicity.
2. Treat `deleted` as a terminal account state across login, recovery and subsequent updates, rather than relying solely on one-time credential replacement.
3. Preserve an immutable document snapshot for each accepted version, and prevent document changes from silently reusing that version.

## Revision notes

## Steps

## Verification

## Decisions

- **H7 (copyright holder):** Danby answered "Copyright (c) 2026 Haunted Pavement LLC". That's Goal 7 already, so the scope doesn't change; the item stays `done` until the step that changes the LICENSE closes it.

## Log

- 2026-10-04 21:22 UTC: Baseline. tsc, lint (0 errors, 20 warnings), int (34/34) and E2E (181/181) all pass on the unchanged base.
- 2026-10-04 21:52 UTC: Architecture. The `architect` wrote findings (privacy audit with corrections to the brief's inventory: the Tenants field is `createdBy`, studios see Discord IDs, Turnstile gets IPs, Namecheap DNS/mail, no backups despite the docs, unbounded journal) and the target design (runtime front-matter versions, admin-access gate, `legal-acceptances`, anonymize-on-delete, delete delivered contact jobs). Plan-only change; no code to verify. The handoff items it proposes (journal retention, the live-config facts) get filed by the Steps.
- 2026-10-04 21:58 UTC: Fable review. `architecture-reviewer` verified F1–F8 against the code and installed Payload/Next: APPROVE_WITH_CHANGES, one MUST-FIX (the API write gate misses `Tenants` updates), two misses (password recovery for anonymized accounts; record the shortened Discord warning under Decisions), five SHOULD-CONSIDER. Plan-only change; no code to verify.
- 2026-10-04 21:59 UTC: Astra review. APPROVE_WITH_CHANGES with four MUST-FIX (the `Tenants` write gate, as Fable found; signup acceptance tied to an unverified email; acceptance not bound to the displayed versions; completed contact-job deletion is best-effort in Payload) and three SHOULD-CONSIDER. Plan-only change; no code to verify.

## Summary
