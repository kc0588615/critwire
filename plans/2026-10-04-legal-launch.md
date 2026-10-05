---
mission: legal-launch
project: critwire
branch: agent/legal-launch
status: done
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
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Run on 2026-10-04 at `05522ea` (= `main` at `3054287` plus the mission start), against the mission's own databases (`critwire_m_legal_launch`, `critwire_m_legal_launch_e2e`).

- `pnpm install --frozen-lockfile`: already up to date.
- `pnpm payload migrate`: nothing to run; 19 migrations applied, the latest `20261002_161631_discord_stage_posts`. No `dev` row in `payload_migrations`.
- `pnpm exec tsc --noEmit`: pass.
- `pnpm lint`: pass, 0 errors and 20 warnings (unused args, already on `main`).
- `pnpm test:int`: pass, 4 files, 34 tests.
- `pnpm test:e2e`: pass, 181 tests in 11.3 min (the run includes the production `next build`).

## Architecture

Checked against the code at `13fe16e` (= `main` `3054287` + mission start), and read-only on this VPS. Line numbers are at that commit. Revised at `9d7027e` after both reviews, against the installed Payload 3.85.2, `@payloadcms/drizzle` and `@payloadcms/plugin-multi-tenant`; what changed and why is under Revision notes.

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

**F4 · Contact messages: deleting a delivered one is best-effort, and failed ones never expire** (fail loud, privacy; Goal 5)
- The route queues `name`, `email`, `subject` and `message` into `payload_jobs.input`, then runs the job at once (`contact/submit/route.ts:49-67`). Each successful task also copies `input` into a `payload_jobs_log` row (`payload/dist/queues/operations/runJobs/runJob/getRunTaskFunction.js:124-140`), which cascades with the job (`src/migrations/20260707_125310_initial.ts:915`).
- **On success,** Payload deletes the job only because `jobs.deleteJobOnComplete` defaults to `true` (`payload/dist/config/defaults.js:64`); `src/payload.config.ts:118-162` never says so.
  - That delete runs after the job is marked complete, and a failure is caught and only logged (`queues/operations/runJobs/index.js:400-427`).
  - Nothing retries it, so the job and its log keep the address indefinitely.
- **On failure,** there are 2 retries (`src/jobs/contact.ts:73,119`), then `hasError`. The input stays until a super admin retries or deletes the job.
  - A deleted game makes its jobs fail for ever (`contact.ts:50-67`). Those messages are never delivered and never removed.
- `contact.ts:106` writes the studio's contact address (`to`) to the journal on every email delivery.

**F5 · Deleting a studio fails, and the plugin's cleanup is best-effort and silent** (bug; Goal 6)
- **A studio with any member can't be deleted.**
  - `users_tenants.tenant_id` is NOT NULL with ON DELETE SET NULL (`src/migrations/20260707_125310_initial.ts:456,892`), and Postgres refuses to null a NOT NULL column (checked on a temp table: error 23502).
  - The plugin strips memberships only in `afterDelete`, after the row delete has already failed.
- **A game with any feedback or Discord post can't be deleted either,** by its owner or by any cleanup.
  - `issues.game_project_id`, `issue_reports.game_project_id` (`20260707_132058_phase2_collections.ts:138,141`) and `discord_posts.game_project_id` (`20261002_144959_discord.ts:25`) are NOT NULL with SET NULL.
  - `GameProjects` has no `beforeDelete` (`GameProjects/index.ts:397-402`). Issues already solve the same problem for their votes (`Issues/hooks/deleteIssueVotes.ts`).
- **The plugin's cleanup** (`@payloadcms/plugin-multi-tenant/dist/hooks/afterTenantDelete.js`, on because `cleanupAfterTenantDelete` isn't set):
  - runs one bulk `payload.delete` per tenant-scoped collection in `Promise.all`, without `req`: outside the tenant delete's transaction and in parallel, so a game's delete races its own feedback's deletes into the keys above;
  - a bulk `payload.delete` reports per-document failures in `errors` instead of throwing (`payload/dist/collections/operations/delete.js:224`), and the plugin ignores them, so a partial cleanup commits silently;
  - in that race, `IssueVotes`' `beforeDelete` calls `adjustUpvoteCount` (`src/collections/IssueVotes/hooks/adjustUpvoteCount.ts:25-33`), whose `db.updateOne` returns `null` for an issue deleted at the same moment, and `issue.isPublic` then throws.
- **What it would delete:** `game-projects`, `patch-notes` (with their versions), `issues`, `issue-reports`, `issue-votes`, `media` (files and every size, through `deleteAssociatedFiles`) and `payload-folders`, and the tenant on users.
- **Not tenant-scoped, so left alone:**
  - `discord-posts` rows, which also block the game's delete (above);
  - `abuse-reports`, which are platform records: `gameProject` is set to null and `pageUrl` stays;
  - contact jobs for the studio's games (see F4).
- No E2E deletes a studio or a game.

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
- The Brief's warning is 143 characters, so no Discord slot holds it whole.
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
- Anyone can type anyone's address into `/signup`. Only the person who opens the emailed link has shown they own it.

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
- **Writes are blocked by one check, run from two hooks:**
  - on the plugin's tenant field, beside `enforceTenantWrite` (`src/plugins/index.ts:61`), where every tenant-scoped write already passes, for the reason given in `src/access/tenantWrite.ts:9-16`;
  - on `Tenants` itself, which has no tenant field but lets owners change the studio's public `name` and `slug` (`src/collections/Tenants/index.ts:21-25`).
- **Reads and auth endpoints stay open:**
  - login, logout, `me` and `refresh-token` are needed by `/legal/accept` itself;
  - reading your own data creates no new obligation;
  - a user's own `name` and password are account actions, not content.
- The Discord install and callback routes write as the user (`overrideAccess: false, user`), so the same hooks cover them.

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
  - `getLegalDocument(slug)`, which returns `{ slug, title, version, effective, status, body, digest }`; `digest` is the SHA-256 (hex) of the file's bytes;
  - `currentLegalVersions()`, which returns `{ terms, privacy }`;
  - `assertLegalDocuments()`.
- **How it reads:**
  - from `process.cwd()/legal/<slug>.md`, lazily, never at import, so the Payload CLI and config imports read no files;
  - memoized per process in production.
- **How it validates:**
  - a strict parser takes the leading `---` block, with only the three keys and no duplicates;
  - then Zod checks `version` (`/^[0-9A-Za-z][0-9A-Za-z.-]{0,31}$/`), `effective` (`z.iso.date()`) and `status`;
  - anything else throws.
- **A version names one text.** `docs/patterns.md` states the rule: any change to a document's text bumps its version. Each acceptance also stores both documents' digests, so the exact text someone accepted can be found in git even if the rule is ever broken.
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
  - `acceptHref(next)`, which returns `/legal/accept?next=<safeNext(next), encoded>`;
  - `safeNext(next)`. It returns `next` only when all of these hold, and `/admin` otherwise:
    - it's a string that starts with exactly one `/` (not `//`);
    - it contains no `\`, no `%5c` or `%5C`, and no control characters;
    - parsed with `new URL(next, 'https://critwire.invalid')`, it keeps that origin, and its pathname is `/onboarding`, `/admin` or starts with `/admin/`.
    - It then returns the parsed `pathname + search`, never the raw string.
- **Who sees them:** the documents and everything built on them are on for every instance.
  - `docs/self-hosting.md` says `legal/` holds critwire.com's documents, which an operator replaces before anyone else uses their instance.
  - Decision: this fails safe for critwire.com (see Rejected alternatives).

#### Goal 2 · Agreement
- **The collection: `src/collections/LegalAcceptances.ts`**, slug `legal-acceptances`, platform-level (not tenant-scoped).
  - Fields:
    - `user`: relationship to users, required, indexed;
    - `termsVersion` and `privacyVersion`: required text;
    - `termsDigest` and `privacyDigest`: required text, the SHA-256 of each document as it was served.
  - Timestamps are on, and `createdAt` is the acceptance time. No IP is stored.
  - Access:
    - `read` is `superAdminOnly`;
    - `create`, `update` and `delete` are `() => false`.
  - Only server code writes records, through the Local API with `overrideAccess: true`, so nobody can forge or edit one.
  - In the admin it's hidden from everyone but super admins, as `AbuseReports` is.
- **Who accepts: only a signed-in, verified account holder.**
  - Every acceptance is recorded by `POST /legal/accept/submit`, and only there. It needs a session.
  - A session exists only for someone who opened the emailed link and set a password (`/verify`), or for an account a super admin made.
  - Signup records nothing: whoever fills in `/signup` hasn't shown they own the address.
- **`src/lib/legal/acceptance.ts`** takes `payload` and `req` from its caller and has two functions:
  - `needsLegalAcceptance({ payload, user, req? })` is a query.
    - It answers `false` for super admins.
    - Otherwise it counts this user's acceptances that match both current versions; zero means they must accept.
    - Only current versions are ever recorded, so this is the same as "the latest acceptance matches".
    - It memoizes its answer in `req.context`, keyed by user ID. The admin guard, the unauthorized view, admin server functions and the write hooks share the request, so a request costs one `count`, not one per call.
  - `recordLegalAcceptance({ payload, userID, accepted, req? })` is a command.
    - `accepted` is `{ termsVersion, privacyVersion }` as the form submitted them.
    - It throws if they aren't the current versions, so the binding holds for any caller, not only for the schema.
    - It stores them with the current digests.
- **The consent schema: `src/lib/validation/legalConsent.ts`.**
  - `acceptTerms` and `confirmAge` must each be `'on'` (from a form) or `true` (from JSON).
  - `termsVersion` and `privacyVersion` are the versions the page showed, from hidden fields, with the front-matter pattern.
  - A refinement compares them with `currentLegalVersions()` at parse time, so importing the schema reads no file. A stale version fails exactly like a missing box.
  - Signup and `/legal/accept/submit` share it.
- **`<LegalConsentFields />`**, a server component, renders:
  - the two unticked, required boxes with the Brief's labels and both documents linked in a new tab;
  - two hidden inputs carrying the versions it rendered.
- **Signup:**
  - `signup/page.tsx` adds `<LegalConsentFields />`.
  - The submit route's schema becomes `{ email: accountEmail }` (Goal 6) plus the consent schema. A request missing either box, or carrying an old version, gets the guard's 400 (`?error=1` for a form) before any work: no account, no email.
  - The boxes are checked on the server, but they aren't the recorded acceptance. `requestSignup` doesn't change.
  - The error text becomes "…check your email address, tick both boxes and try again."
- **Verify:**
  - The form doesn't change.
  - The lede becomes "Your email is confirmed once you set it. Then you'll confirm the Terms and set up your portal."
  - After sign-in it still redirects to `/onboarding`, where the gate sends a new account to `/legal/accept?next=/onboarding`.
- **The gate:**
  - `src/access/adminPanelAccess.ts` replaces `authenticated` at `Users/index.ts:24`. It allows a signed-in user for whom `needsLegalAcceptance` is false.
  - `src/components/admin/LegalGateView.tsx`, an `AdminViewServerProps` view like `ForgotPasswordView`, is registered as `admin.components.views.unauthorized`.
    - A signed-in user who still has to accept is redirected to `acceptHref(searchParams.redirect)`.
    - Anyone else sees Payload's "no access" header and Log out.
  - `onboarding/page.tsx` and `onboarding/submit/route.ts` check right after the session, then redirect to `acceptHref('/onboarding')`.
  - **API writes:** `assertLegalAcceptance(req)` in `src/access/legalWrite.ts` is the one check. Two hooks run it:
    - `requireLegalAcceptance`, a field hook added after `enforceTenantWrite` on the plugin's tenant field (`plugins/index.ts:61`), for every tenant-scoped collection;
    - `requireLegalAcceptanceForTenant`, a `beforeChange` hook on `Tenants`.
    - It lets through writes with no user, and super admins. Otherwise, while `needsLegalAcceptance` holds, it throws `APIError('Accept the current Terms of Service and Privacy Policy at /legal/accept before making changes.', 403)`.
    - Deletes pass: field hooks don't run on delete, and only super admins delete studios.
- **The `/legal/accept` page** (dynamic, noindex, in an `AccountPage`):
  - with no session, it redirects to `/admin/login?redirect=/legal/accept`;
  - for a super admin, or when there's nothing to accept, it redirects to `safeNext(next)`;
  - otherwise it shows both documents' versions and dates, `<LegalConsentFields />`, "Agree and continue", Log out, and "If you don't agree, email admin@critwire.com to close your account."
  - With `?error=1` it adds: "Tick both boxes to continue. If a document changed while this page was open, the versions above are the new ones."
- **`POST /legal/accept/submit`:**
  - it reads the session with `payload.auth({ headers })`; with none, it redirects to `/admin/login?redirect=/legal/accept`;
  - it parses the body with the consent schema. On any failure, a missing box or a stale version alike, it redirects (303) to `/legal/accept?next=…&error=1` and records nothing; the page then renders the current versions with unticked boxes;
  - it records an acceptance only if one is still needed, then redirects (303) to `safeNext(next)`;
  - like onboarding, it has no Turnstile: it's authenticated and idempotent, and the session cookie is SameSite=Lax.

```
/signup → Zod: email, both boxes, shown versions = current → pending account + email (nothing recorded)
/verify/<token> → password set, verified, signed in → /onboarding
/onboarding (+submit) → needsLegalAcceptance? → yes: /legal/accept?next=/onboarding
sign-in → /admin/* → RootPage: access.admin → needsLegalAcceptance? → no: admin
                                              → yes: /admin/unauthorized → LegalGateView → /legal/accept?next=…
REST/GraphQL write to a tenant-scoped collection or to tenants → assertLegalAcceptance → 403 until accepted
POST /legal/accept/submit → session → Zod: both boxes, shown versions = current
    → ok: recordLegalAcceptance (versions + digests) → 303 safeNext(next)
    → missing box or stale version: 303 /legal/accept?error=1, nothing recorded
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
  - `LegalConsentFields` (Goal 2);
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
  - Decision (a Brief deviation): Discord shows the shortened warning, because no slot holds 143 characters (F9). The Summary must say so, and must not claim the exact sentence appears on Discord.
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
- **Three layers remove a contact job; each one fails loudly.**
  1. **On delivery.** `payload.config.ts` sets `jobs.deleteJobOnComplete: true` explicitly, with a comment that the Privacy Policy depends on it. That removes almost every delivered job at once, but Payload only logs a failure (F4), hence layer 2.
  2. **A sweep every 10 minutes.** A new task, `purge-contact-jobs` in `src/jobs/contact.ts`:
     - it's scheduled with Payload's own `schedule: [{ cron: '*/10 * * * *', queue: 'default' }]`, so the existing every-minute `default` autoRun queues and runs it;
     - it deletes every contact job (`taskSlug` in `CONTACT_TASKS`, the two contact slugs) that has `completedAt` set, whatever Payload's own delete did, or was created more than 30 days ago, in any state, stuck ones included. Their log rows cascade;
     - it throws on any failure. The job then records the error, the handler reports it to Sentry like the other tasks do, and the next run tries again 10 minutes later. `retries: 0`, because the schedule is the retry.
  3. **On game or studio deletion.** The game's `beforeDelete` (Goal 6) deletes its contact jobs, in any state.
- **One command, `deleteContactJobs({ req, where })`**, also in `src/jobs/contact.ts`, used by the sweep and the game hook.
  - It adds `taskSlug in CONTACT_TASKS` to `where` and calls `deleteWhereOrThrow` (Goal 6).
  - The game hook matches on `input.projectID`, a JSON-path query the drizzle adapter supports (verified by Fable).
- **Lock the scheduler's state.**
  - A task with `schedule` makes Payload add the `payload-jobs-stats` global (`payload/dist/config/sanitize.js:282-285`) with default access. Any signed-in account could then read and update it (`payload/dist/globals/config/sanitize.js:33-38`, `auth/defaultAccess.js`), and moving its `lastScheduledRun` forward would postpone the sweep indefinitely.
  - Payload has no override for that global (only `jobsCollectionOverrides`). So `src/lib/payload/lockJobStatsGlobal.ts` wraps the built config: `export default lockJobStatsGlobal(buildConfig({…}))`.
  - It finds the global, sets `read` and `update` to `superAdminOnly`, and throws if the global isn't there.
  - The scheduler itself writes through `payload.db`, which skips access.
- **`contact.ts:106`** logs only `projectID`.
- **The policy's wording:**
  - delivered → deleted at once; if that delete fails, a cleanup that runs every 10 minutes deletes it;
  - not delivered → kept for retries until it's delivered (then as above), a super admin deletes it, its game or studio is deleted, or 30 days have passed since it was sent, whichever comes first;
  - a delivered message lives on in the studio's inbox or Discord, under the studio's control.
- Decision (stricter than the Brief): undelivered messages expire after 30 days. The Brief allowed "until the job is retried or cleared"; the sweep makes a bound cheap, and a bound is the more protective option.

#### Goal 6 · Deleting an account anonymizes it
- **Users collection:**
  - `access.delete` becomes `() => false`, so there are no more hard deletes.
  - A new `deleted` checkbox, writable by super admins only, sits in the sidebar:
    - label: "Delete this account";
    - description: "Removes the email, name, password and sign-ins; shows as 'Deleted user'. Studios and their content stay. Can't be undone."
  - It's data, like `suspended`.
- **`deleted` is a terminal state:**
  - `beforeChange` `guardAccountDeletion` refuses (`ValidationError`):
    - a super admin deleting their own account;
    - once an account is deleted, any change to it except its studio memberships, unless `req.context.anonymizing` is set. That covers unticking, and a new email, name, roles, `_verified` or password.
  - `beforeLogin` `refuseDeletedLogin` throws Payload's `AuthenticationError` for a deleted account. Its password is random anyway; this is the second lock.
  - **`src/lib/validation/accountEmail.ts`** is the one email rule. Signup and password recovery each define it today (`signup/submit/route.ts:16-18`, `forgot-password/submit/route.ts:13-15`); both now import it.
    - It also refuses the reserved `.invalid` top-level domain, which can never receive mail.
    - So neither route reaches a deleted account's address, or asks Resend to send to one.
    - Every `.invalid` address gets the same 400, so the answer reveals nothing about accounts.
- **`afterChange` `anonymizeDeletedUser`** runs when `deleted` turns true and `req.context.anonymizing` isn't set. It returns the result of `anonymizeUser({ id, req })`, so the admin shows the scrubbed account.
- **`src/lib/accounts/anonymizeUser.ts`**, a command, makes one Local API `update`, with `overrideAccess`, the same `req` (so the same transaction) and `context.anonymizing`. It sets:
  - `email` to `deleted-<id>@deleted.invalid` (`.invalid` is reserved and never delivered);
  - `name` to "Deleted user";
  - a random 32-byte password. A `beforeChange` hook can't set one (`payload/dist/collections/operations/utilities/update.js:26`).
  - `roles` to `['user']`;
  - `sessions` to `[]`, which revokes every JWT because `useSessions` is on;
  - the reset and verification tokens to empty.
  - It then reads the result back with `showHiddenFields` and throws unless `email` is the new address and `sessions` is empty, so "ends every session" holds at the source.
- **What stays:**
  - the `tenants` memberships and `Tenants.createdBy`, which now show "Deleted user" (`useAsTitle: 'name'`);
  - the legal acceptances: they record the terms under which content that stays was posted, and they no longer identify anyone;
  - all of the studio's content.
- **`src/lib/payload/deleteWhereOrThrow.ts`**: a Local API `payload.delete` with `where`, `req` and `overrideAccess`. If `errors` isn't empty, it throws one error naming the collection and every failed ID. The game hook, the studio hook and the contact sweep use it.
- **Deleting a game removes its content, in the game delete's transaction.** A new `GameProjects` `beforeDelete`, `deleteGameContent`, follows `deleteIssueVotes`:
  - with `req`, it deletes the game's issues (each removes its votes through `deleteIssueVotes`, with no counter hook), issue reports, updates (with their versions), `discord-posts` rows and contact jobs;
  - so an owner can now delete a game that has feedback, which fails today (F5).
  - Decision (beyond the Brief): deleting a game deletes its feedback, updates and votes.
- **Deleting a studio, in the studio delete's transaction.** `cleanupAfterTenantDelete: false` turns the plugin's cleanup off. A new `Tenants` `beforeDelete`, `deleteStudioContent`, replaces it:
  1. it deletes the studio's games, each through `deleteGameContent`;
  2. it deletes whatever is left in the other tenant-scoped collections, media last (each file and size goes with its row);
  3. it removes the studio from every user's memberships, deleted users included, so the NOT NULL key no longer blocks the tenant row.
  - It does all of this with `req`, one step after another, through `deleteWhereOrThrow`. Any failure rolls the whole studio delete back, and the super admin sees the error.
  - The collections come from the plugin's own map: `src/plugins/index.ts` exports its keys as `TENANT_SCOPED_COLLECTIONS`, so a collection added to the plugin is cleaned too.
  - With issues deleting their own votes, the vote-counter race in F5 can't happen, so `adjustUpvoteCount` doesn't change.
- Abuse reports stay as platform records: their `gameProject` becomes null, and the page URL stays. The policy says so.

#### Goal 7 · Copyright holder
- `LICENSE:3` reads "Copyright (c) 2026 Haunted Pavement LLC".
- The `(frontend)` Footer keeps `{new Date().getFullYear()}` and changes only the holder: "© <year> Haunted Pavement LLC".
- Close H7.

#### Goal 8 · Copy that matches the Terms
- `docs/architecture.md:339-340`: backups are the operator's job, and `docs/deploy.md` shows one way.
- `docs/integrations.md:107-108`: R2 "can hold an instance's backups".
- `docs/deploy.md:163` becomes "Backups (the operator's job)", noting that critwire makes none itself.
- `MarketingHome.tsx:105-106` says the filter runs "inside critwire, with no outside service".

#### The migration
- One migration, `legal_launch`, made with `pnpm payload migrate:create`. It:
  - drops `issue_reports.submitter_email`;
  - creates `legal_acceptances` (`user_id` NOT NULL with Payload's default ON DELETE SET NULL, so any hard delete fails loudly; an index on `user_id`; the two versions and two digests; timestamps);
  - adds `payload_locked_documents_rels.legal_acceptances_id`;
  - adds `users.deleted`, a boolean defaulting to false;
  - adds what Payload's scheduler needs: `payload_jobs.meta` (json) and the `payload_jobs_stats` global table.
- `down` reverses it, but the dropped emails don't come back.
- Then run `pnpm generate:types`.
- The migration check follows the `tests/migrations/feedback-pivot/` precedent: `tests/migrations/legal-launch/assert.sql`, run on a copy of the Critter Connect seed.

#### Revalidation
Nothing new needs it:
- the legal pages are static and change only with a deploy;
- the footers change only with a deploy, and the restart empties the in-memory ISR cache;
- users, acceptances, jobs and reports are never public;
- deleting a game or studio already revalidates through `revalidateGameProjectDelete`, and the items and updates it now deletes go through the Local API, so their own `afterDelete` revalidation runs.

#### DRY points
- One copy module, used by the web and Discord.
- One component each for the notice, the warning, the consent boxes and the links.
- One `needsLegalAcceptance`, used by the admin guard, onboarding, `/legal/accept` and the write check; one `assertLegalAcceptance`, used by both write hooks.
- One consent schema, and one account-email schema.
- One document loader, used by the pages, the versions, the digests and the boot check.
- One `deleteWhereOrThrow`, used by game deletion, studio deletion and the contact sweep; one `deleteContactJobs`; one `TENANT_SCOPED_COLLECTIONS`, used by the plugin and the studio cleanup.
- One "make pending jobs due and run the queue" E2E helper, used by the Discord specs and the sweep spec.

#### Docs
- `docs/features.md`:
  - the IssueReport fields;
  - Users: the gate, and `deleted` as a terminal state;
  - LegalAcceptances;
  - contact-email retention and the sweep;
  - deleting a game or a studio;
  - the legal pages and the signup boxes.
- `docs/architecture.md`:
  - the `/legal/*` URLs;
  - the rendering table;
  - the project structure;
  - backups.
- `docs/patterns.md`:
  - the gate, and why only `/legal/accept` records;
  - versions from front matter, and "a version names one text";
  - account deletion;
  - deleting games and studios in one transaction, with `deleteWhereOrThrow`;
  - the shared legal copy;
  - contact jobs: deleted on delivery, swept every 10 minutes, the stats-global lock.
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
| Studio account: email, name (optional), password hash, sign-in tokens, failed-login count | Signing in and account emails | Postgres on Oracle Cloud, Chicago | Until the account is deleted (unfinished signups included). Deletion replaces the email, name and password, ends every session and blocks sign-in | Oracle; Resend for emails |
| Session and cookies (`payload-token`, `payload-tenant`, `payload-theme`) | Keep you signed in; remember your studio and theme | Browser; Postgres | Session: 2 hours after your last activity. The two preference cookies: up to 1 year | — |
| Legal acceptance: account, document versions and fingerprints (SHA-256), time (no IP) | Shows what you agreed to, and the exact text | Postgres | Kept with the account. After deletion it's kept without the email or name, because it records the terms that applied to content that stays | Oracle |
| Studio content: studios, games, contact settings, updates, triage, images | Running your portals | Postgres; the server's disk | Until the studio deletes it or the studio is deleted. Deleting a game deletes its updates and feedback. Deleting one person's account keeps it. Images are kept as uploaded, embedded metadata included | Oracle |
| Player feedback: title, description, type, category, platform, version | The studio's feedback board | Postgres | Until the studio deletes it or its game, or the studio is deleted. Published items are public | Oracle |
| Discord submissions: the above, plus Discord user ID, username and (Send to critwire) the message link | Lets the studio follow up | Postgres; the studio sees it, never the public | As above | Discord |
| Contact message: name and email (optional, 13 or older), subject, message | Delivering it to the studio | The job queue in Postgres | Deleted once delivered; if that delete fails, a cleanup every 10 minutes deletes it. Not delivered: until a retry delivers it, a super admin deletes it, the game or studio is deleted, or 30 days pass. A delivered message stays with the studio | Resend or Discord |
| Abuse report: page, reason, details, optional email | Moderation | Postgres, super admins only | Until a super admin deletes it | Oracle |
| Vote: random token in a cookie; only its hash on the server | One vote per browser | Browser; Postgres | Cookie: 1 year. Vote: until it's withdrawn or the item, game or studio is deleted | — |
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
  - `ageLegalAcceptance(userID)`: puts a user's acceptance into the state a version bump leaves behind;
  - `ageJob(jobID, days)`: moves a job's `createdAt` back.
  - Why: REST deliberately can't write acceptances or timestamps, and only a scan proves "no email anywhere in the database". Record the exception in AGENTS.md's Testing section.
- **New helper, `tests/e2e/support/jobs.ts`:** `runDueJobs(superAdmin, { queue, where })`, the "a minute passes" step `runDiscordPosts` does today: make the matching pending jobs due, then run the queue through the REST endpoint as the super admin, until they've run. `runDiscordPosts` becomes a call to it. For the sweep, a first run of the `default` queue lets Payload's scheduler queue it.
- **New `legal-pages.spec.ts`:**
  - each page shows its version, its date and, while a draft, the draft banner, checked against front matter the test parses itself;
  - an unknown document is a 404;
  - the footer links appear on `/`, a portal page, `/signup`, `/verify/<token>`, `/onboarding` and `/admin/login`.
- **New `legal-acceptance.spec.ts`:**
  - signup:
    - the two boxes start unticked, are required and link both documents, and the hidden versions match the front matter;
    - a direct POST missing either box, or carrying an old version, gets a 400, with no account, no outbox email and no record;
    - a complete signup records nothing until the verified holder accepts: no record after `/signup`, none after `/verify`; then `/onboarding` sends them to `/legal/accept`, ticking both boxes records one acceptance with both current versions and the digests of the files the test hashes itself, and they land on `/onboarding`.
  - a user a super admin created:
    - is sent to `/legal/accept`;
    - a submit without the boxes, and one with an old version, are both refused with `?error=1` and no record;
    - as an owner, a REST write to a tenant-scoped collection gets a 403, and so does `PATCH /api/tenants/<id>` on their studio's name;
    - after accepting, reaches the admin, and both writes work.
  - a version bump: `ageLegalAcceptance` sends that user back to `/legal/accept`, from the admin and from `/onboarding`.
  - a super admin goes straight in.
  - the records: studio users can't read them, and super admins can't create, edit or delete them.
- **New `account-deletion.spec.ts`:**
  - a signed-up studio's owner is deleted:
    - as the super admin, since `createdBy` is readable only by super admins: `createdBy` and the users list show "Deleted user";
    - the portal stays up;
    - the old JWT and the old password both fail;
    - password recovery and signup for `deleted-<id>@deleted.invalid` get a 400 and leave no outbox email;
    - changing the deleted account's email, unticking `deleted`, a REST DELETE and deleting yourself are all refused;
    - `countInDatabase(oldEmail)` is 0;
    - the acceptance remains.
  - a game is deleted by its owner: its items, votes, reports, update and a failed contact job go, and the studio stays.
  - a studio with a member is deleted by the super admin: its game, update, item, report, vote, image file and failed contact job all go; the member's account stays without the membership; the portal is a 404; a scan for its markers returns 0.
- **Changed:**
  - `reports-contact.spec.ts`:
    - no email field;
    - the notice and the warning;
    - an email sent anyway isn't stored, and the scan returns 0;
    - the new contact label;
    - a contact message delivered through the webhook sink leaves no job, and the scan returns 0;
    - **the failure path, Payload's own delete having failed:** as the super admin, create a contact job that looks delivered (`completedAt` set, a `log` entry with the same input) and two failed ones, one aged past 30 days with `ageJob`. `runDueJobs` runs `purge-contact-jobs`. The delivered and the aged jobs are gone, scans for their markers return 0 (`payload_jobs_log` included), and the recent failed one stays.
  - `tenant-isolation.spec.ts`: a studio owner gets a 403 reading and updating `/api/globals/payload-jobs-stats`.
  - `abuse-reports.spec.ts`: the notice, the warning and the email label.
  - `discord-interactions.spec.ts`:
    - D4: the command description holds the notice and is at most 100 characters;
    - every text field carries the warning;
    - both confirmations end with the notice.
  - `embed-feeds.spec.ts`: drop `submitterEmail`.
  - `signup.spec.ts`, `onboarding.spec.ts` and the signup helpers tick the boxes, and the signup flow now passes through `/legal/accept`.
  - `auth.setup.ts` and the fixtures `seedUser`, `seedStudio` and `signUpStudio` accept through the real route by default, with an option not to.
  - Screenshots get a `legal` group: the three pages, signup, `/legal/accept` and the three forms, at 1440 and 390 px. `setup.shots.ts` accepts for its studio accounts.
- **Not reachable from E2E:** a sweep that itself fails, and a studio delete that fails halfway. Both throw: the first leaves the error on the job and in Sentry, the second shows the error to the super admin and rolls back.
- No new int tests.

### Rejected alternatives
- **A versions module generated at build time:** needs a generator, and its output can drift from the markdown.
- **Lexical's `convertMarkdownToLexical`:** needs an editor config with headings and lists just to render the documents.
- **A proxy, `beforeDashboard`, a provider, edited Payload route files, or an `afterLogin` hook as the gate:** each misses deep links, client navigation or existing sessions, or breaks a project rule.
- **Gating the UI only:** leaves the API as a way around the checkboxes, when two small hooks close it.
- **Blocking the whole API:** breaks login, `me` and token refresh, which `/legal/accept` needs.
- **Recording the acceptance at signup:** whoever types an address hasn't shown they own it, so the record could bind someone who never saw the form.
- **Checkboxes on `/verify`, recorded there:** a second recording path for what the gate already asks the same verified person one step later.
- **Carrying signup's ticks over to the verification token:** the inbox owner would never have ticked anything.
- **Binding acceptance to digests, in the gate and the hidden fields:** every typo fix would make every account accept again, against the Brief's "material changes get a new version". The recorded digest already pins the exact text.
- **A committed digest manifest checked in CI:** the same commit can rewrite it, so it slows a mistake down without preventing it.
- **A hard delete with fallback references:** nothing could show "Deleted user", because `createdBy` is unique and ownership lives on the user row. The acceptances would also be orphaned.
- **Payload's `trash`:** trashed users drop out of relationship population, and "delete permanently" brings the hard delete back.
- **A custom endpoint and a confirm button for deletion:** more code than a super-admin field plus a hook, for the same result.
- **Keeping the plugin's studio cleanup with a null guard:** it can't delete a studio that has members at all, and it drops per-document failures.
- **Storing the accepted versions on the user, in the JWT:** duplicates state, and stays stale until the token refreshes.
- **An env flag that turns the legal surface on for the hosted instance only:** if it were ever left unset on critwire.com, the site would run with no terms.
- **Rejecting a `submitterEmail` sent anyway:** loses reports from cached old pages.
- **Relying on `deleteJobOnComplete` alone:** Payload logs a failed delete and moves on.
- **Stripping the address inside the task:** Payload writes the task's log, input included, after the handler returns.
- **`jobs.runHooks` with a jobs-collection hook that strips the address on completion:** slows every job, and Payload warns against it.
- **Delivering in the route and queueing only on failure:** a bigger change, and a retried delivery would still need the sweep.
- **A self-rescheduling sweep job, or a timer in `instrumentation-node.ts`:** the chain breaks for good on one failed enqueue, and a timer bypasses Payload's jobs. Payload's `schedule` re-arms every minute from its own state.
- **A system timer calling `/api/payload-jobs/run`:** configuration outside the repo, left to each operator; the app should clean up after itself.

### Risks and open questions
- **Media files aren't transactional.** If a game or studio delete fails after its media rows were deleted, the rows roll back but the files are already gone. Media goes last to keep that window small; the error shows, and a retry finishes the job.
- **A sweep left `processing` by a crash** stops Payload's scheduler from queueing the next one, because it counts unfinished scheduled jobs (`countRunnableOrActiveJobsForQueue.js`). It shows in the jobs list, and a super admin deletes it. Payload's own scheduled tasks share this. Delivered jobs still go on delivery meanwhile.
- **The stats-global lock depends on the shape of Payload's sanitized config.** It throws at boot if the global ever moves, and the E2E checks the 403.
- **A new account ticks the boxes twice:** at signup, which only sends the email, and on `/legal/accept` after setting a password, which is the record. That's the price of recording only the verified holder's consent.
- **Self-hosted instances** show critwire.com's documents until their operator replaces them. This is documented.
- **Cost:** one indexed count per request that reaches the admin guard, the unauthorized view, an admin server function or a studio write, memoized per request. Plus one sweep query every 10 minutes, and the scheduler's small stats write each minute.
- **Accounts that signed up while signup was open** are sent to `/legal/accept` on their next visit. That's intended.
- **Drafts are accepted as drafts.** Making the documents final bumps the versions, and everyone accepts again.
- **Possible follow-up:** EXIF metadata stays in original images; a `resizeOptions` cap would strip it.
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

Revised by the `architect` at `9d7027e`. Every MUST-FIX is resolved by a design change; none was disputed.

**MUST-FIX**
- **Fable 1 = Astra 1, `Tenants` writes bypass the gate.** One check, `assertLegalAcceptance(req)`, now runs from the tenant field hook and from a new `Tenants` `beforeChange`. The E2E sends `PATCH /api/tenants/<id>` and expects a 403. See Findings › "API: block content writes", Target design › Goal 2 (The gate), E2E specs.
- **Astra 2, signup acceptance tied to an unverified email.**
  - Signup records nothing now. The only place that records is `POST /legal/accept/submit`, and it needs a session, which only someone who verified the email (or an account a super admin made) can have.
  - New accounts reach it through the existing onboarding gate, right after `/verify`. That's the simplest sound option: no new recording path, and `requestSignup` and `/verify` stay as they are.
  - Signup's boxes are still required and checked on the server (400, no account, no email), but they aren't the record.
  - The E2E now checks there's no record after `/signup` or `/verify`, and exactly one, with both versions, after the verified holder ticks the boxes on `/legal/accept`.
  - See Target design › Goal 2 ("Who accepts", Signup, Verify, the flow), E2E specs, Rejected alternatives, Risks.
- **Astra 3, acceptance not bound to the versions shown.** `LegalConsentFields` posts the versions it rendered in hidden fields. The shared Zod schema checks them against the current versions when it parses. A mismatch fails like a missing box: 400 or `?error=1`, the page re-renders with the current versions and unticked boxes, and nothing is recorded. `recordLegalAcceptance` also refuses versions that aren't current. See Target design › Goal 2, E2E specs (stale-version cases).
- **Astra 4, deleting a delivered contact job is best-effort.**
  - There are now three layers: `deleteJobOnComplete`; a `purge-contact-jobs` sweep scheduled every 10 minutes through Payload's own `schedule`, which throws loudly and is retried by the schedule; and deletion with the game or studio.
  - The sweep also bounds undelivered messages at 30 days.
  - The policy says "deleted once delivered; if that fails, a cleanup every 10 minutes deletes it", with the 30-day bound for undelivered ones.
  - The E2E covers the failure path: a job that looks delivered, as a failed delete would leave it, and an aged failed one are removed by the sweep, and the scan finds 0.
  - See Findings › F4, Target design › Goal 5, The migration, the inventory table, E2E specs.
- **Found while fixing Astra 4:** Payload's scheduler adds a `payload-jobs-stats` global that any signed-in account can update, which could postpone the sweep for ever. `lockJobStatsGlobal` limits it to super admins, and the E2E checks the 403. See Target design › Goal 5.

**MISSED**
- **Fable, password recovery for a deleted account.** A shared `accountEmail` schema, used by signup and recovery, refuses the reserved `.invalid` domain, so neither route reaches `deleted-<id>@deleted.invalid` or calls Resend. See Target design › Goal 6, E2E specs.
- **Fable, the shortened Discord warning is a Brief deviation.** Recorded below as a Decision. Goal 3 also says the Summary must not claim the exact sentence appears on Discord. See Findings › F9, Target design › Goal 3.

**SHOULD-CONSIDER**
- **Fable 1, keep `getFullYear()`:** taken. See Goal 7.
- **Fable 2, assert `anonymizeUser`'s result:** taken. It reads the account back and throws unless the email changed and `sessions` is empty. See Goal 6.
- **Fable 3, memoize `needsLegalAcceptance` per request:** taken, in `req.context` by user ID: one `count` per request. See Goal 2, Risks.
- **Fable 4, spell out `safeNext`:** taken. See Goal 1.
- **Fable 5, assert `createdBy` as a super admin:** taken. See E2E specs.
- **Astra 1, the transaction boundary of studio cleanup:** taken. Checking it turned up a real bug, so F5 is rewritten:
  - a studio with any member can't be deleted today, and neither can a game with feedback (NOT NULL keys with SET NULL);
  - the plugin also drops per-document failures.
  - The plugin's cleanup is now off. Ordered `beforeDelete` hooks on `GameProjects` and `Tenants` delete everything with `req`, in the parent's transaction, through `deleteWhereOrThrow`.
  - With this, the earlier `adjustUpvoteCount` null guard isn't needed and is dropped.
  - See Findings › F5, Target design › Goal 6, Risks.
- **Astra 2, `deleted` as a terminal state:** taken. Once an account is deleted, only its memberships can change; `beforeLogin` refuses it; recovery and signup refuse `.invalid`. See Goal 6.
- **Astra 3, an immutable snapshot per accepted version:** taken in part.
  - Each acceptance stores the SHA-256 digest of both documents, git keeps every text, and `docs/patterns.md` states "a version names one text".
  - Not taken: gating on digests, which would force everyone to accept again after a typo fix, against the Brief's "material changes"; and a digest manifest, which the same commit can rewrite. See the loader, Goal 2, Rejected alternatives.
- **Reversed from the first draft:** "a scheduled purge of failed contact jobs" was rejected because no scheduled task existed. The sweep now exists, so the 30-day bound costs one condition.

**Decisions for the Decisions section**
- Decision: Discord shows a shortened warning ("Don't include passwords, keys, tokens, payment or health details, or anything sensitive.", 88 characters) and a 94-character form of the notice in the command description, because Discord caps both at 100 characters. The confirmations carry the full notice. The Summary says Discord doesn't show the Brief's exact warning.
- Decision: signup's two checkboxes are required and checked on the server, but the recorded acceptance comes from `/legal/accept`, ticked by the signed-in, verified account holder. A new account ticks twice, so that a record never rests on an unverified address.
- Decision: undelivered contact messages are deleted after 30 days. The Brief allowed "until the job is retried or cleared"; a bound is the more protective option.
- Decision: deleting a game deletes its feedback, updates, votes, Discord post records and queued contact messages. Today the delete fails whenever the game has feedback.
- Decision: each acceptance also stores both documents' SHA-256 digests, beyond the Brief's user, versions and time. No personal data.
- Decision: one visible warning per form, linked to every free-text field through `aria-describedby`, rather than one copy under each field.

## Steps

Planner: Opus 5.5, 2026-10-04, from the revised Architecture, the Revision notes and Decisions.

**For every step:**
- Do one step per session. Finish with `pnpm exec tsc --noEmit` and `pnpm lint` (0 errors, and no warnings beyond the baseline's 20), plus the checks the step names. Then check the step off, add a Log line, commit code and plan together, and push.
- `pnpm test:e2e <files>` builds the app, drops and re-migrates `critwire_m_legal_launch_e2e`, and runs the `setup` project first. Use `E2E_SKIP_BUILD=1` only when nothing outside `tests/` has changed since `.next` was built.
- **A step that changes the schema:**
  1. Delete any `dev` row from `payload_migrations` in `critwire_m_legal_launch` (AGENTS.md).
  2. `pnpm payload migrate:create <name>`.
  3. Read the SQL. It must hold only what the step names; if anything else appears, stop and find out why.
  4. `pnpm payload migrate`, then `pnpm payload migrate:down` and `pnpm payload migrate` once more, to prove `down`.
  5. `pnpm generate:types`.
  6. Remove unused `payload`/`req` arguments from the generated file, as the later migrations do, so lint stays at 20 warnings.
  7. Commit the migration pair, `src/migrations/index.ts` and `src/payload-types.ts`.
- Heavy jobs run one at a time. Never run `pnpm screenshots` alongside `pnpm test:e2e`.
- **New tests:**
  - Name each one with its ID (`LP1`, `LA1`, `AD1`, `S5.12` …) so the report maps to the Verification table.
  - Every test makes its own accounts and games (`seedUser`, `seedStudio`, `signUpStudio`, `createProject`). Tests about acceptance state use `{ accept: false }` accounts and never change `world`'s users.
  - Specs assert the Brief's literal sentences and the front matter they parse themselves. They never import `src/lib/legal/*`, so a wrong constant fails a test.

**Planner notes:**
- **Order.**
  - The documents (S1) and their loader (S2) come first, because everything else needs them.
  - Acceptance records (S3) and accounts that accept (S4) come before the gate (S5). The gate changes what every existing spec's accounts may do. With S4 in place, S5's full run shows only the gate's own effects: a spec failing there with a 403 or a `/legal/accept` redirect is an account S4 missed. Fix the fixture, not the spec.
  - The contact cleanup (S6) brings `deleteWhereOrThrow` and `deleteContactJobs`. Game and studio deletion (S7) reuse them, and account deletion (S8) follows.
  - The email removal (S9) uses S6's database scan.
  - Copy (S10–S12) and docs (S13) follow. The migration check (S14) runs once all four migrations exist.
  - Then the documents' audit against the code as built (S15), and screenshots of the audited pages (S16).
- **The sweep runs in the background during E2E.** Both E2E servers run the `default` queue every minute. From S6 on, Payload's scheduler queues `purge-contact-jobs` there, so it can run at any moment. No test may depend on a completed contact job still existing, or on when the sweep runs. S5.14 is written to pass either way.

- [x] S1 · **The three legal drafts, and the handoff items.**
  - **Files:** `legal/terms.md`, `legal/privacy.md`, `legal/copyright.md`. No code.
  - **Front matter,** exactly: `version: 0.1`, `effective: 2026-10-04`, `status: draft`. Bare values, no quotes, LF line endings.
  - **How to write them:**
    - Plain English: short sections under `##` headings, and no legalese where plain words do the job.
    - Write from the Brief's Goal 1 lists, the Architecture's "The data inventory as the Privacy Policy will state it" and "Every `[placeholder]`", and Goals 5 and 6.
    - Each document opens by saying who runs critwire.com (Haunted Pavement LLC, a Wisconsin limited liability company, `admin@critwire.com`, `[LLC street address]`). It then says the document covers only the hosted service at critwire.com: the code is MIT-licensed, and each self-hosted instance is run by its own operator under its own terms.
  - **Terms:** one section for each of the Brief's bullets, in the Brief's order:
    - 18 or older;
    - your account and your portal, including how a studio uses the feedback players send it;
    - acceptable use: the Brief's list, plus no passwords, keys, payment, health or other sensitive information in any submission;
    - the limited licence to run the service, and the separate grant for feedback about critwire;
    - review, holds, removal, suspension and closure;
    - changing, limiting or ending the service, with notice where practical, and the free tier possibly gaining limits or paid plans;
    - **not a system of record**: the Brief's sentence nearly word for word, and "keep your own copies";
    - "as is" and "as available", and no reliance on what others post;
    - the liability cap `[cap: suggestion for the lawyer: the greater of US$100 or the fees paid to critwire in the 12 months before the claim]`;
    - narrow responsibility for one's own content;
    - changes to the Terms: a material change gets a new version, and accounts accept it again at `/legal/accept`;
    - Wisconsin law, with courts in `[county] County, Wisconsin`;
    - contact.
  - **Privacy Policy:** one section per group of rows of the Architecture's inventory table, with what, why, where, how long and who handles it. Every row must be there, including:
    - each cookie, by name and lifetime;
    - acceptance records: kept after an account is deleted, and why;
    - images keep embedded metadata such as location (F10);
    - Discord identities: the studio sees them, the public never does;
    - contact messages, in Goal 5's exact wording. Deleted once delivered, and if that delete fails, a cleanup every 10 minutes deletes them. Undelivered ones are kept until a retry delivers them, a super admin deletes them, the game or studio is deleted, or 30 days pass. A delivered message lives on in the studio's inbox or Discord, under the studio's control;
    - IP addresses go to Upstash (gone within about 2 hours) and Cloudflare Turnstile, and are never kept in critwire's database or logs;
    - abuse reports stay after their game is deleted, with the page URL;
    - `[log retention]`, `[mailbox provider]`, `[retention of emails to admin@critwire.com]`, `[backups]`, `[backup retention]` and `[Upstash region]`.

    Then:
    - the outside services (Oracle Cloud `us-chicago-1`, Cloudflare Turnstile, Upstash, Resend `us-east-1`, Discord, Namecheap, Tally);
    - no ads, no analytics, no selling of data;
    - children: players have no accounts, critwire isn't directed at children under 13 and doesn't knowingly collect their information, and the contact email field says "13 or older";
    - requests to `admin@critwire.com`;
    - deleting an account (Goal 6), and deleting a game or a studio;
    - changes to the policy.
  - **Copyright policy:**
    - what a notice must contain (the elements of 17 U.S.C. §512(c)(3), in plain words);
    - where to send it: `[DMCA agent: pending registration]`, and `admin@critwire.com` until then;
    - removal, and telling the studio;
    - counter-notices and their elements, and restoration;
    - a plain-words warning against false claims;
    - **repeat infringers:** a studio with `[repeat-infringer threshold]` valid notices is suspended through the existing `suspended` flag;
    - self-hosted instances.
  - **Square brackets** appear only in placeholders and in Markdown link text (`[text](url)`). The S15 audit relies on that.
  - **The handoff items,** in `/srv/critter-ai/handoff/critwire.md`, under `## Open` after the last open item, in the exact `~/AGENTS.md` format (`Status: waiting on you`, `From: legal-launch · <date>`, `Blocks:`, **Why:**, **Steps:**, **Your reply:**).
    - H15 was the highest number when this plan was written. Check again; if H16–H19 are taken, use the next free numbers and update this plan's references.
    - **H16 · The legal drafts: fill in the facts, and the lawyer's review.**
      - Blocks: making the documents final, and H19.
      - Steps:
        1. Read the drafts at `https://github.com/kc0588615/critwire/tree/agent/legal-launch/legal`.
        2. Find each fact:
           - the Upstash region: console.upstash.com → the critwire database → Details → Region;
           - Oracle volume backups: Oracle Cloud console → Storage → Block Storage → Boot Volumes → the instance's volume → Backup policy;
           - the mailbox behind `admin@critwire.com`: Namecheap → Domain List → critwire.com → Manage → Redirect Email;
           - whether the live `.env` sets `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` or any `R2_*`. The lead can check this for you.
        3. Have the Wisconsin lawyer review the three documents, together with the plan's Summary.
      - Reply lines:
        - `LLC street address =`
        - `County for the courts =`
        - `Liability cap =` (the draft suggests one)
        - `Repeat-infringer threshold =` (for example, three valid notices in 12 months)
        - `Upstash region =`
        - `Sentry or R2 on critwire.com =`
        - `Oracle volume backups and how long they're kept =`
        - `Mailbox behind admin@critwire.com =`
        - `How long emails to admin@critwire.com are kept =`
        - `Lawyer's review =` (done, with the changes, or pending)
      - Say that an agent then fills in the placeholders, sets `status: final` and bumps every version to `1.0`, after which every account accepts again.
    - **H17 · Register critwire's DMCA agent ($6).**
      - Blocks: the agent's details in `legal/copyright.md`, and H19.
      - Why: in plain words, a U.S. service that hosts other people's content keeps its protection against copyright claims about that content only with a designated agent registered with the Copyright Office.
      - Steps, click by click, through the Copyright Office's DMCA Designated Agent Directory (`https://dmca.copyright.gov/osp/`; check that it answers with `curl -sI` first):
        1. Create the registration account, then log in.
        2. Designate a new agent. The service provider is Haunted Pavement LLC, with its street address; the alternate names are critwire and critwire.com.
        3. The agent's details: a name or a title such as "Copyright Agent", the address, a phone number and `admin@critwire.com`.
        4. Pay the $6 through Pay.gov.
      - Say plainly that the LLC's name and street address become public, and that the designation expires after three years unless renewed.
      - Reply lines: `Agent name or title =`, `Agent address =`, `Agent phone =`, `Agent email =`, `Registration number =`, `Expires =`.
    - **H18 · Keep the server's logs for 30 days at most.**
      - Blocks: `[log retention]` in the Privacy Policy.
      - Why: F7. journald keeps entries until its size cap, which means months. It's a root change that affects every app, so it's your decision.
      - Steps: nothing to do outside chat.
      - Reply:
        - "30 days" (the default): an agent adds `/etc/systemd/journald.conf.d/retention.conf` with `MaxRetentionSec=30day`, restarts journald and records it in `/srv/critter-ai/ops/docs/vps.md`. `/var/log/syslog` already rotates after 4 weeks;
        - or another limit;
        - or "no limit".
    - **H19 · Turn signup back on once the legal launch is live.**
      - Blocks: nothing in the mission. It waits on H16, H17 and the merge.
      - Steps:
        1. Merge `agent/legal-launch`.
        2. Ask the lead in Buzz to deploy critwire.
        3. Set `CRITWIRE_OPEN_SIGNUP=1` in `/srv/apps/critwire/.env`, or ask the lead to.
        4. Run `systemctl --user restart app@critwire`.
        5. Open `https://critwire.com/signup`. It shows the two unticked boxes, and both links open the documents.
      - Reply: "done".
    - **H8:** add one line under its **Your reply**: `**legal-launch (<date>):** the drafts and the agreement flow are on agent/legal-launch; what's left for you is H16–H19.` Leave its `Status:` as the owner set it.
  - **Verify:**
    - Each document covers every one of the Brief's bullets for it.
    - `grep -n -o -P '\[[^\]]+\](?!\()' legal/*.md` lists exactly the Architecture's placeholders. Put the list in the Log line.
    - No street address, county, cap figure (beyond the marked suggestion), Upstash region, mailbox provider or retention period appears outside a placeholder.
    - Each file starts with `---` followed by the three keys.
    - The handoff items match the format, and H8 has its note.
    - tsc and lint still pass.

- [x] S2 · **The document loader, the legal pages and the boot check (Goal 1).**
  - **First:** write the throwaway loader check from Failure modes DL1–DL12 in `/tmp/legal-loader-check.ts`, and run it from the repo root with `pnpm exec tsx`. It must fail, since there's no loader yet. Then write the code.
  - **`src/lib/legal/documents.ts`,** exactly as the Architecture says:
    - server only, and no `@payload-config`;
    - files read lazily from `process.cwd()/legal/`, memoized in production;
    - the strict parser, then Zod;
    - `digest` is the SHA-256 (hex) of the file's bytes;
    - titles "Terms of Service", "Privacy Policy" and "Copyright Policy".

    It exports `getLegalDocument`, `currentLegalVersions`, `assertLegalDocuments` and the slug type, with a comment pointing to the rule "a version names one text".
  - **`src/lib/legal/paths.ts`** (no fs): `LEGAL_LINKS`, `acceptHref` and `safeNext`, exactly as Goal 1 specifies.
  - **`src/app/(frontend)/legal/[document]/page.tsx`:**
    - `generateStaticParams` returns the three slugs, and `dynamicParams` is `false`;
    - metadata: the title, and `robots` noindex while the status is `draft`;
    - the version line: "Version 0.1 · Draft of 4 October 2026", or "Version 1.0 · Effective <date>" once final;
    - while a draft, the banner "This is a draft under legal review. It isn't final.";
    - the body rendered by `marked` inside the existing `cw-page` prose styles. Add CSS only if the prose styles lack something.
  - **Dependencies:** `pnpm add --save-exact marked@15.0.12`. It's already in the lockfile through react-email.
  - **`src/instrumentation-node.ts`:** `checkEnvironment()` calls `assertLegalDocuments()`.
  - **`next.config.ts`:** `outputFileTracingIncludes['/**'] = ['./legal/*.md']`, with a comment like the font's.
  - **`tests/e2e/support/legal.ts`:** the specs' own reading of the files: `LEGAL_SLUGS`, `legalFrontMatter(slug)` (a few lines of its own parsing) and `legalDigest(slug)`.
  - **New spec `tests/e2e/legal-pages.spec.ts`:**
    - LP1, for each document:
      - the `h1` title;
      - the version line, built from the front matter the spec read;
      - the draft banner;
      - `meta[name=robots]` noindex;
      - the document's first `##` heading rendered as an `h2`, which shows the body rendered.
    - LP2: `/legal/unknown` and `/legal/terms.md` are 404s.
  - **Verify:**
    - The loader check passes every DL item. Save the script and its output in `/srv/critter-ai/agent-state/missions/legal-launch/loader-check/`.
    - tsc and lint, then `pnpm test:e2e tests/e2e/legal-pages.spec.ts tests/e2e/home.spec.ts`.
    - After the run, `ls .next/standalone/legal/` lists the three files.
    - `pnpm install --frozen-lockfile` is up to date.

- [x] S3 · **Acceptance records and `/legal/accept` (Goal 2; nothing is enforced yet).**
  - **`src/collections/LegalAcceptances.ts`,** exactly as Goal 2 says:
    - fields `user`, `termsVersion`, `privacyVersion`, `termsDigest` and `privacyDigest`, with timestamps and no IP;
    - `read` is `superAdminOnly`; create, update and delete are `() => false`;
    - in the admin, hidden from everyone but super admins, as `AbuseReports` is.

    Register it in `payload.config.ts`, but not in the multi-tenant plugin's collections.
  - **Migration `legal_acceptances`:** only the `legal_acceptances` table (`user_id` NOT NULL, ON DELETE SET NULL, indexed) and `payload_locked_documents_rels.legal_acceptances_id`.
  - **`src/lib/legal/acceptance.ts`:**
    - `needsLegalAcceptance`, memoized in `req.context` by user ID whenever a `req` is passed;
    - `recordLegalAcceptance`, which throws unless the versions are current, stores both digests, and writes with `overrideAccess: true`.
  - **`src/lib/validation/legalConsent.ts`:** the consent schema, whose refinement compares the versions with `currentLegalVersions()` when it parses.
  - **`src/lib/legal/copy.ts`:** for now, the two checkbox labels, with the agreement label stored in parts so the document names can be links. S10 and S11 add the rest.
  - **`src/components/legal/LegalConsentFields.tsx`:**
    - two unticked, `required` boxes with the Brief's labels;
    - Terms and Privacy linked, opening in a new tab with `rel="noopener"`;
    - hidden `termsVersion` and `privacyVersion` inputs.
  - **`src/app/(frontend)/legal/accept/page.tsx`** (dynamic, noindex, an `AccountPage`) **and `legal/accept/submit/route.ts`:** exactly as Goal 2 says, with 303s and no Turnstile. The route reads the body with `readRequestBody`.
  - **Test support:**
    - `support/legal.ts` gains `acceptLegal(request, token, { versions?, next? })`. It posts to the real route with `Authorization: JWT <token>` and expects a 303.
    - In `support/fixtures.ts`, `seedUser(label, { accept })` and `seedStudio(label, { accept })` gain the option, defaulting to `false` in this step; S4 flips it.
  - **New spec `tests/e2e/legal-acceptance.spec.ts`:**
    - LA1:
      - with no session, the page sends you to `/admin/login?redirect=%2Flegal%2Faccept`;
      - a super admin, and an account that has already accepted, go straight to `next`.
    - LA2: on `/legal/accept`, the boxes start unticked and are `required`. Their labels are the Brief's, both documents are linked, and the hidden versions equal the front matter.
    - LA3: each of these is refused with a 303 to `/legal/accept?next=…&error=1` and creates no record:
      - a post without `acceptTerms`;
      - a post without `confirmAge`;
      - an old `termsVersion`;
      - an old `privacyVersion`.

      The `error=1` page shows its text with the boxes unticked.
    - LA4: a complete post redirects to `next`. It leaves exactly one record, holding both current versions and digests equal to the spec's own SHA-256 of the files. A second post adds nothing.
    - LA5: the `next` cases in Failure modes SN1–SN8, plus the allowed ones, run against an account that has already accepted.
    - LA6:
      - a super admin reads the records, but can't create, update or delete one over REST (403);
      - `world`'s `aOwner` and an anonymous visitor read none.
  - **Verify:** the migration procedure, tsc and lint, then `pnpm test:e2e tests/e2e/legal-acceptance.spec.ts tests/e2e/tenant-isolation.spec.ts tests/e2e/accounts.spec.ts`.

- [x] S4 · **Signup asks for both boxes, and every test account accepts.**
  - **`signup/page.tsx`:**
    - `<LegalConsentFields />` before Turnstile;
    - the error text becomes "…check your email address, tick both boxes and try again."
  - **`signup/submit/route.ts`:** the schema becomes the email plus the consent schema. A failure gets the guard's answer (a 400 for JSON, `?error=1` for a form) before any work. `requestSignup` doesn't change.
  - **`verify/[token]/page.tsx`:** the lede becomes "Your email is confirmed once you set it. Then you'll confirm the Terms and set up your portal."
  - **The fixtures:**
    - `startSignup` posts both boxes and the current versions, with options to leave a box out or send an old version;
    - `seedUser` and `seedStudio` now default to `accept: true`;
    - `signUpStudio` accepts after `/verify` and before onboarding;
    - `auth.setup.ts` accepts for `aOwner`, `aMember` and `bOwner` with their tokens;
    - `tests/screenshots/setup.shots.ts` accepts for its onboarding user and its studio user.
  - **`signup.spec.ts`:** S15.1 ticks both boxes in the browser.
  - **`legal-acceptance.spec.ts`, LA7:**
    - on `/signup`, the boxes are unticked, `required` and linked, and the hidden versions equal the front matter;
    - each refused request (a JSON POST and a form POST, each missing either box, or carrying an old version) gets a 400 or `/signup?error=1`. Each leaves no account (the super admin finds no user with that email), no outbox email and no record;
    - a complete signup leaves no record after `/signup`, and none after `/verify`.
  - **Verify:** tsc and lint, then the full `pnpm test:e2e`, because `auth.setup.ts` and every account fixture changed. The harness change is first run in S16.

- [x] S5 · **The gate: accept before the admin, onboarding or any write (Goal 2).**
  - **`src/access/adminPanelAccess.ts`** replaces `authenticated` as `Users.access.admin`.
  - **`src/components/admin/LegalGateView.tsx`** becomes `admin.components.views.unauthorized` in `payload.config.ts`. Then run `pnpm generate:importmap`.
  - **`onboarding/page.tsx` and `onboarding/submit/route.ts`:** right after the session check, `needsLegalAcceptance` sends the user to `acceptHref('/onboarding')`, with a 303 from the route.
  - **API writes:** `src/access/legalWrite.ts` has `assertLegalAcceptance(req)`, run from two hooks:
    - `requireLegalAcceptance`, after `enforceTenantWrite` in `src/plugins/index.ts`;
    - `requireLegalAcceptanceForTenant`, in `src/collections/Tenants/hooks/`, added to the `Tenants` `beforeChange`.
  - **`tests/e2e/support/db.ts`:**
    - `pnpm add -D --save-exact pg@8.20.0 @types/pg@8.20.0`;
    - a client on `requireDisposableDatabase()`;
    - `ageLegalAcceptance(userID)`.

    Add a Testing bullet to AGENTS.md: specs reach the database only through `support/db.ts`, for what REST deliberately can't do (acceptance state, timestamps) and for whole-database scans.
  - **`legal-acceptance.spec.ts`:**
    - LA8, a new account:
      - after `/signup` and `/verify` there's still no record;
      - `/onboarding`, in the browser, goes to `/legal/accept?next=%2Fonboarding`;
      - ticking both boxes records one acceptance with both versions and digests, and lands on `/onboarding`.
    - LA9, accounts from `seedStudio(…, { accept: false })` and `seedUser(…, { accept: false })`:
      - `/admin/collections/patch-notes/create` goes to `/legal/accept` with that `next`, and so does `/onboarding`;
      - `POST /onboarding/submit` answers with a 303 to it and creates no studio;
      - these are refused with a 403 and the gate's message: a REST create of an update, `PATCH /api/tenants/<id>` on the studio's name, and a GraphQL `updateTenant` (the name doesn't change);
      - `GET /api/users/me` still answers, and Log out still works;
      - after accepting in the browser, the deep link opens the create view, and both writes succeed.
    - LA10: after `ageLegalAcceptance`, the account is sent to `/legal/accept` from `/admin` and from `/onboarding`, and a REST write gets a 403 again. Accepting again leaves two records.
    - LA11: a super admin with no record opens `/admin` and writes, and `/legal/accept` sends them on to `/admin`.
  - **`signup.spec.ts`:** S15.1 passes through `/legal/accept` between `/verify` and onboarding.
  - **Verify:** tsc and lint, the import map committed, then the full `pnpm test:e2e`.

- [x] S6 · **Contact messages: deleted on delivery, swept every 10 minutes, and gone after 30 days (Goal 5).**
  - **`src/lib/payload/deleteWhereOrThrow.ts`,** as Goal 6 says.
  - **`src/jobs/contact.ts`:**
    - `CONTACT_TASKS` and `deleteContactJobs({ req, where })`.
    - The task `purge-contact-jobs`:
      - `schedule: [{ cron: '*/10 * * * *', queue: 'default' }]`, with `retries: 0`;
      - it deletes contact jobs that have `completedAt` set, or were created more than 30 days ago;
      - Sentry capture and rethrow, like the other tasks.
    - The log line at `:106` logs only `projectID`.
  - **`payload.config.ts`:**
    - `jobs.deleteJobOnComplete: true`, with a comment that the Privacy Policy depends on it;
    - register the task;
    - `export default lockJobStatsGlobal(buildConfig({…}))`.
  - **`src/lib/payload/lockJobStatsGlobal.ts`:** finds the `payload-jobs-stats` global, sets its `read` and `update` to `superAdminOnly`, and throws if the global is missing. `buildConfig` returns a promise, so wrap the promise.
  - **Migration `contact_job_sweep`:**
    - only `purge-contact-jobs` in both jobs task-slug enums, `payload_jobs.meta`, and the `payload_jobs_stats` global's tables;
    - its `down` deletes that task's rows first, as `discord_stage_posts` does.
  - **Test support:**
    - `tests/e2e/support/jobs.ts`: `runDueJobs(superAdmin, { queue, where })`. It runs the queue once, which lets Payload's scheduler queue what's due. It then makes the matching pending jobs due and runs the queue until none remain. `runDiscordPosts` becomes a call to it.
    - `support/db.ts` gains `countInDatabase(needle)`, a read-only scan of every public table's rows as text, and `ageJob(jobID, days)`.
  - **`reports-contact.spec.ts`:**
    - S5.13: a contact message with a unique email is delivered to the webhook sink. Eventually there's no job for it, and `countInDatabase(email)` is 0.
    - S5.14, as the super admin, with the markers held in each job's input:
      - A: a contact job that looks delivered (`completedAt` set, and a `log` entry with the same input);
      - B: a recent failed contact job;
      - C: a failed contact job aged 31 days with `ageJob`;
      - D: a control, a failed `discord-update-post` job aged 31 days.

      Run `runDueJobs(…, { queue: 'default', where: { taskSlug: { equals: 'purge-contact-jobs' } } })`. A and C scan to 0, `payload_jobs_log` included; B and D stay.
  - **`tenant-isolation.spec.ts`, S1.14:** a studio owner gets a 403 reading and updating `/api/globals/payload-jobs-stats`; a super admin reads it.
  - **Verify:**
    - The migration procedure, tsc and lint.
    - `pnpm test:e2e tests/e2e/reports-contact.spec.ts tests/e2e/tenant-isolation.spec.ts tests/e2e/discord-posts.spec.ts`.
    - The servers' output shows no `purge-contact-jobs` error.

- [x] S7 · **Deleting a game or a studio removes its content, in one transaction (Goal 6, F5).**
  - **`src/plugins/index.ts`:** export `TENANT_SCOPED_COLLECTIONS`, the keys of the map the plugin is given, and set `cleanupAfterTenantDelete: false`.
  - **`src/collections/GameProjects/hooks/deleteGameContent.ts`,** a `beforeDelete` that follows `deleteIssueVotes`. With `req`, through `deleteWhereOrThrow`, it deletes:
    - the game's issues, each removing its votes through its own hook;
    - its issue reports;
    - its updates, with their versions;
    - its `discord-posts` rows;
    - its contact jobs, through `deleteContactJobs` on `input.projectID`. `projectID` is a text input field, so compare it with `String(id)`.
  - **`src/collections/Tenants/hooks/deleteStudioContent.ts`,** a `beforeDelete`. With `req`, one step after another, it:
    1. deletes the studio's games, each through `deleteGameContent`;
    2. deletes whatever is left in `TENANT_SCOPED_COLLECTIONS`, media last;
    3. removes the studio from every user's `tenants`, deleted users included.

    Any failure throws, and the whole delete rolls back.
  - **New spec `tests/e2e/account-deletion.spec.ts`:**
    - AD1: an owner deletes a game that has:
      - an item with a vote;
      - a report;
      - a published update;
      - a `discord-posts` row: link with `linkDiscord`, publish, then `runDiscordPosts`;
      - a failed contact job: the game routes contact to email, and E2E has no Resend.

      The delete succeeds. The super admin finds none of these, a scan for the content's marker returns 0, and the studio and its other game stay.
    - AD2: a super admin deletes a studio that has a second member. Its game holds an update, an item, a report, a vote, an uploaded image, a failed contact job, and an abuse report about its portal. Then:
      - every one of these is gone, except the abuse report;
      - the image's file URL is a 404;
      - `/g/<slug>` is a 404;
      - the member's account stays, with no `tenants`;
      - the abuse report stays, with `gameProject` null and its page URL;
      - a control studio's game and items are untouched;
      - a scan for a marker that only the studio's content carries returns 0.
  - **Verify:** tsc and lint, then `pnpm test:e2e tests/e2e/account-deletion.spec.ts tests/e2e/tenant-isolation.spec.ts tests/e2e/issues-voting.spec.ts tests/e2e/discord-posts.spec.ts tests/e2e/media.spec.ts`.

- [x] S8 · **Deleting an account anonymizes it (Goal 6).**
  - **`Users`:**
    - `access.delete: () => false`;
    - the `deleted` checkbox: in the sidebar, writable by super admins only, with Goal 6's label and description;
    - the hooks `guardAccountDeletion` (`beforeChange`), `refuseDeletedLogin` (`beforeLogin`) and `anonymizeDeletedUser` (`afterChange`), in `src/collections/Users/hooks/`.
  - **`src/lib/accounts/anonymizeUser.ts`:** exactly as Goal 6 says, including reading the result back and throwing unless it holds.
  - **`src/lib/validation/accountEmail.ts`:** the one email rule, which refuses `.invalid`. `signup/submit/route.ts` and `forgot-password/submit/route.ts` import it.
  - **Migration `users_deleted`:** only `users.deleted`, a boolean defaulting to false.
  - **`account-deletion.spec.ts`:**
    - AD3, on a `signUpStudio` owner whose email, token and password the spec has kept. A super admin sets `deleted: true`. Then:
      - the response shows `deleted-<id>@deleted.invalid` and "Deleted user";
      - the super admin sees "Deleted user" in the studio's `createdBy` (at depth 1) and in the users list;
      - the portal and its content stay;
      - the old JWT is refused by `/api/users/me`;
      - the old password and the old email can't sign in;
      - `countInDatabase(oldEmail)` is 0;
      - the acceptance record stays.
    - AD4:
      - on the deleted account, these are refused: a new email, `deleted: false`, a new name, and a REST DELETE (403);
      - a super admin can't delete their own account;
      - `/forgot-password/submit` and `/signup/submit` refuse `deleted-<id>@deleted.invalid` with a 400, and no outbox email is written.
  - **Verify:** the migration procedure, tsc and lint, then `pnpm test:e2e tests/e2e/account-deletion.spec.ts tests/e2e/accounts.spec.ts tests/e2e/password-recovery.spec.ts tests/e2e/signup.spec.ts tests/e2e/legal-acceptance.spec.ts`.

- [x] S9 · **The feedback form's email is gone (Goal 4).**
  - **Remove it everywhere** the Architecture's "Every `submitterEmail`" list names:
    - the page: `EmailField` and both of its uses;
    - the route's schema;
    - `reports.ts`;
    - the field on `IssueReports`, whose comment at `:28` becomes "unvetted content and Discord identities";
    - the seed;
    - `docs/features.md`;
    - `reports-contact.spec.ts` and `embed-feeds.spec.ts`.
  - **Migration `drop_submitter_email`:** only the dropped column. Its `down` adds the column back, empty.
  - **`reports-contact.spec.ts`:**
    - S5.1 no longer fills an email.
    - S5.12:
      - neither the bug form nor the idea form has an email input or label;
      - a POST to the submit route with `[STALE_EMAIL_FIELD]` set to a unique address still files the report;
      - `countInDatabase(address)` is 0.

      `STALE_EMAIL_FIELD = 'submitterEmail'` is the spec's one mention of the old name.
  - **Verify:**
    - The migration procedure, tsc and lint.
    - `pnpm test:e2e tests/e2e/reports-contact.spec.ts tests/e2e/embed-feeds.spec.ts tests/e2e/discord-interactions.spec.ts tests/e2e/screening.spec.ts`.
    - `git grep -n -i -E 'submitter_?email' -- ':!src/migrations' ':!plans' ':!tests/migrations'` prints only the `STALE_EMAIL_FIELD` line.

- [x] S10 · **The notice, the warning and the footer links on the web (Goals 3 and 5).**
  - **`copy.ts`:** `SUBMIT_NOTICE` (in parts) and `SENSITIVE_INFO_WARNING`.
  - **Components in `src/components/legal/`:** `LegalNotice`, `SensitiveInfoWarning` (id `sensitive-info-warning`) and `LegalLinks`.
  - **`FormField`** gains `describedBy?`, which it merges with the hint's ID.
  - **The three forms** (feedback, contact, report-abuse):
    - the warning once, at the top of the fields;
    - `describedBy="sensitive-info-warning"` on every free-text control (Decision): the feedback title, description, platform and game version; the contact name, subject and message; the abuse report's details;
    - `LegalNotice` beside the submit button.
  - **Labels:**
    - contact: "Email (optional, 13 or older), so the {game} team can reply", with the hint "Sent to the team with your message; critwire doesn't keep it.";
    - abuse report: "Your email (optional, 13 or older)".
  - **Footers:**
    - `<LegalLinks label="Legal" />` in `src/Footer/Component.tsx`;
    - `<LegalLinks label="Critwire legal" />` in `PortalFooter`'s bottom row, shown whether or not "Powered by" is;
    - a new `src/components/AfterLogin/index.tsx` as `admin.components.afterLogin`, then `pnpm generate:importmap`.
  - **Specs:**
    - `reports-contact.spec.ts`, S5.15, on the bug form, the idea form and the contact form:
      - the warning's exact text appears once;
      - every free-text control's `aria-describedby` includes `sensitive-info-warning`;
      - the notice's exact text sits next to the submit button, linking `/legal/terms` and `/legal/privacy`;
      - the contact label and hint.

      Update any assertion of the old contact label.
    - `abuse-reports.spec.ts`, S17.4: the same checks, and the email label.
    - `legal-pages.spec.ts`, LP3: a nav with Terms, Privacy and Copyright on:
      - `/`;
      - a portal hub on 3100, and on 3102, where "Powered by" is hidden;
      - `/signup`;
      - `/verify/<token>`, from a pending signup;
      - `/onboarding`, for an accepted `seedUser`;
      - `/admin/login`.
  - **Verify:** tsc and lint, the import map committed, then `pnpm test:e2e tests/e2e/legal-pages.spec.ts tests/e2e/reports-contact.spec.ts tests/e2e/abuse-reports.spec.ts tests/e2e/home.spec.ts tests/e2e/portal-landing.spec.ts tests/e2e/admin-triage.spec.ts tests/e2e/admin-dashboard.spec.ts tests/e2e/embed.spec.ts`. The embed spec shows the portal footer doesn't reach the embeds.

- [x] S11 · **The notice and the warning on Discord (Goal 3).**
  - **`copy.ts`** gains:
    - `SENSITIVE_INFO_WARNING_SHORT`;
    - `DISCORD_FEEDBACK_DESCRIPTION`;
    - `noticeMarkdown(termsURL, privacyURL)`, with masked links `[…](<url>)`.
  - **`interactions.ts`:** text fields in `FormFieldSpec` gain `description?`, which goes on the Label. Over 100 characters throws.
  - **`feedback.ts`:**
    - every text field of `/feedback` and of Send to critwire carries the short warning;
    - both success confirmations end with `noticeMarkdown`, built on `getServerSideURL()`'s absolute URLs.
  - **`commands.ts`:** `/feedback`'s description is `DISCORD_FEEDBACK_DESCRIPTION`.
  - **`discord-interactions.spec.ts`:**
    - D4, the registered commands: the `/feedback` description is the exact 94-character text, at most 100 characters.
    - D2:
      - every text field of the form has the short warning as its Label description, and the selects have none;
      - the confirmation ends with the notice, linking the absolute `/legal/terms` and `/legal/privacy`.
    - D4, Send to critwire: its form and its confirmation, the same way.
  - **Verify:** tsc and lint, then `pnpm test:e2e tests/e2e/discord-interactions.spec.ts tests/e2e/discord-posts.spec.ts`.

- [x] S12 · **The copyright holder, and copy that promises nothing about keeping data (Goals 7 and 8).**
  - **Goal 7:**
    - `LICENSE:3` reads "Copyright (c) 2026 Haunted Pavement LLC";
    - `src/Footer/Component.tsx` keeps `getFullYear()` and names "Haunted Pavement LLC".
  - **Goal 8:**
    - `MarketingHome.tsx:105-106` says the filter runs "inside critwire, with no outside service";
    - `docs/architecture.md:339-340`, `docs/integrations.md:107-108` and `docs/deploy.md:163` change as Goal 8 says.
  - **Check the rest of the copy:** `git grep -n -i -E 'backup|never lose|permanent|forever|guarantee|safe|archive' -- README.md docs src/components/marketing`. Fix any promise about data safety, permanence or backups, and list what was checked in the Log line.
  - **Close H7** in the handoff file:
    - set `Status: closed`;
    - add `**Picked up:** legal-launch, <date>. LICENSE and the site footer now name Haunted Pavement LLC (commit <sha>).`;
    - move the item to the top of `## Closed`.
  - **Verify:**
    - tsc and lint, then `pnpm test:e2e tests/e2e/home.spec.ts tests/e2e/legal-pages.spec.ts`.
    - `git grep -n -E 'Critwire contributors|© \{new Date\(\)\.getFullYear\(\)\} Critwire'` prints nothing.
    - `git grep -n -i 'copyright (c)' -- ':!plans'` shows only `LICENSE` and DejaVu's licence.

- [x] S13 · **Docs.**
  - **Each file the Architecture's Docs list names:**
    - `docs/features.md`;
    - `docs/architecture.md`;
    - `docs/patterns.md`, including "a version names one text", and why only `/legal/accept` records;
    - `docs/integrations.md`;
    - `docs/discord.md`, including that Discord shows the shortened warning;
    - `docs/deploy.md`: backups; journal retention, with the drop-in from H18 as the way to set it; and `legal/` traced into the standalone output;
    - `docs/self-hosting.md`: `legal/` holds critwire.com's documents, which an operator replaces before anyone else uses their instance; the MIT and own-terms sentence from Goal 1;
    - `AGENTS.md`: a docs-map row for `legal/`;
    - README: one line pointing to `legal/`.
  - **Verify:**
    - tsc and lint.
    - Every path, route, collection, task, env var and component the docs name exists: grep for each.
    - Every relative link resolves.
    - No E2E, since no code changes.

- [x] S14 · **The migration check on a copy of the Critter Connect seed.**
  - **`tests/migrations/legal-launch/fixtures.sql`,** written against `3054287`, which is what production runs. It finds rows by slug, never by ID, and adds:
    - a studio user with a membership in `demo-studio`;
    - a pending `email-contact-form` job whose input holds an email;
    - the seed's own report with `player@example.com`.
  - **`tests/migrations/legal-launch/assert.sql`:** one `DO` block covering MC1–MC9 (Failure modes). It raises on the first mismatch and prints one `NOTICE` per group that passes.
  - **Run it** with Verification's "Migration check" commands, and save `commands.sh`, `migrate.log` and `assert.log` in `/srv/critter-ai/agent-state/missions/legal-launch/migration-check/`.
    - Run `assert.sql` on the unmigrated copy as well. It must raise, which proves it checks something; save that as `assert-unmigrated.log`.
    - Keep the two scratch databases and `/tmp/ll-premig` until S17.
  - **Verify:** `migrate.log` lists the four migrations; `assert.log` ends without an `ERROR`; tsc and lint.

- [x] S15 · **The documents match the code as built.**
  - **Re-check every statement in `legal/*.md` against the code at HEAD:**
    - each inventory row: what, why, where, how long, and who handles it;
    - the cookies' names and lifetimes;
    - the contact-job wording against S6;
    - deletion against S7 and S8;
    - acceptance against S3–S5;
    - Discord against S11, which must not claim the Brief's exact warning appears on Discord;
    - the repeat-infringer policy against the `suspended` flag.
  - **Every mismatch** is fixed in the code or in the document, and recorded under Decisions with which one changed. The versions stay `0.1` (Decisions).
  - **Placeholders:** compare `grep -n -o -P '\[[^\]]+\](?!\()' legal/*.md` with H16, and update H16 if they differ.
  - **The Summary:** write its data inventory table (what, why, where, how long, who handles it) and its list of placeholders, both from the final documents.
  - **Verify:** tsc and lint, then `pnpm test:e2e tests/e2e/legal-pages.spec.ts tests/e2e/legal-acceptance.spec.ts`, plus the specs for any code that changed.

- [x] S16 · **Screenshots.**
  - **`tests/screenshots/catalog.ts`:** a `legal` group, labelled "Legal pages, agreement and player notices". It shoots:
    - `/legal/terms`, `/legal/privacy` and `/legal/copyright`;
    - `/signup`;
    - `/legal/accept`, with a new `accept` session;
    - the Critter Connect bug form;
    - `/g/<cc>/contact`, which the seed routes to email;
    - `/report-abuse?page=<the hub's URL>`.
  - **`setup.shots.ts`:** the `accept` session belongs to a user the super admin creates and signs in, who hasn't accepted. Add it to `SESSION_STATE_PATHS`.
  - **Mention the `legal` group** in `playwright.screenshots.config.ts`'s header and in AGENTS.md's `pnpm screenshots` line.
  - **Run,** with nothing else running: `SHOTS_SET=after SHOTS_DIR=/srv/critter-ai/agent-state/missions/legal-launch/screenshots SHOTS_THEMES=legal,signup,marketing pnpm screenshots`. The signup and marketing groups are reshot because signup, onboarding and the home footer changed.
  - **It must leave:**
    - 16 files `after/legal--*.png` (8 pages at 1440 and 390 px);
    - the signup and marketing shots;
    - `index.html`;
    - `after/checks.json`, with no failed probe.
  - **Look at them:**
    - each page reads well at 390 px;
    - the draft banner shows;
    - the boxes are unticked;
    - the notice sits beside the button, and the warning sits above the fields;
    - the footer links show.
  - **Verify:** tsc and lint.

- [x] S17 · **Full verification, the Summary and `status: done`.**
  - **Run the Verification section below, in order.** Fix anything that fails, and rerun the full suite after any fix.
  - **The migration check:** rerun it if `git diff <S14's commit> -- src/migrations tests/migrations` isn't empty. Then drop `critwire_m_legal_launch_premig` and `critwire_m_legal_launch_migcheck`, and remove `/tmp/ll-premig`.
  - **Finish the Summary:**
    - what changed, goal by goal;
    - the results and every artifact path;
    - both review verdicts (Fable and Astra: APPROVE_WITH_CHANGES, every MUST-FIX resolved in the Revision);
    - the data inventory table and every `[placeholder]` from S15;
    - anything the documents promise that the code doesn't do: this should be none;
    - **the Brief deviations, from Decisions:**
      - Discord shows a shortened warning, 88 characters, not the Brief's exact sentence, and a 94-character notice in the command description;
      - signup records nothing: the record comes from the verified holder on `/legal/accept`;
      - undelivered contact messages expire after 30 days;
      - deleting a game deletes its content;
      - four migrations instead of one;
    - that the documents are drafts pending legal review, not legal advice;
    - the open handoff items (H16–H19) and H7 closed.
  - **Then** set `status: done`, commit, and push `agent/legal-launch`. Don't merge.

## Verification

E2E is the proof. The mission adds no int tests (Architecture › E2E specs); the four existing int files must still pass. Two parts are checked in isolation, because E2E can't reach them: the document loader's parser (S2) and the migrations on existing data (S14). Their failure modes are listed below, before any code. Each step runs its own checks above; the end-of-mission run (S17) is below.

**The end-of-mission run, one command at a time:**
1. `pnpm install --frozen-lockfile`: up to date. `marked`, `pg` and `@types/pg` are pinned.
2. `pnpm exec tsc --noEmit`: no errors.
3. `pnpm lint`: 0 errors, and no warnings beyond the baseline's 20.
4. `pnpm test:int`: all 4 files pass.
5. The generated files are current: `pnpm generate:types && pnpm generate:importmap`, then `git status --porcelain` prints nothing.
6. **The build:**
   - Delete any `dev` row from `payload_migrations` in `critwire_m_legal_launch`.
   - `pnpm payload migrate` applies the four new migrations, and `pnpm payload migrate:status` shows all of them run.
   - `pnpm build` passes; its `prebuild` runs `embed-loader`.
   - `ls .next/standalone/legal/` lists `copyright.md`, `privacy.md` and `terms.md`.
7. **The full E2E run:** `pnpm test:e2e 2>&1 | tee /srv/critter-ai/agent-state/missions/legal-launch/e2e-final-run.log`, run once.
   - It uses `E2E_DATABASE_URL` from the worktree's `.env` (`critwire_m_legal_launch_e2e`).
   - Every test passes, with none failed or flaky (retries are 0).
8. `rm -rf /srv/critter-ai/agent-state/missions/legal-launch/e2e-final && cp -r playwright-report /srv/critter-ai/agent-state/missions/legal-launch/e2e-final`. It holds a trace and screenshots for every test.
   - **To view it:** `pnpm exec playwright show-report /srv/critter-ai/agent-state/missions/legal-launch/e2e-final`.
   - **To rerun it:** `pnpm test:e2e`, with `E2E_DATABASE_URL` set to a database whose name ends in `_e2e`.
9. **The migration check** (S14) is in `/srv/critter-ai/agent-state/missions/legal-launch/migration-check/`:
   - `migrate.log` lists the four migrations;
   - `assert.log` ends without an `ERROR`;
   - `assert-unmigrated.log` raises.
10. **The loader check** (S2) is in `/srv/critter-ai/agent-state/missions/legal-launch/loader-check/`, with the script and its output: every DL item passes.
11. **The screenshots** (S16) are in `/srv/critter-ai/agent-state/missions/legal-launch/screenshots/`: `index.html`, 16 `after/legal--*.png`, and `after/checks.json` with no failed probe. Rerun S16's command only if a page it shoots has changed since, and never during step 7.
12. **Audits:**
    - `git grep -n -i -E 'submitter_?email' -- ':!src/migrations' ':!plans' ':!tests/migrations'` prints only the `STALE_EMAIL_FIELD` line in `tests/e2e/reports-contact.spec.ts`.
    - `git grep -n -E 'Critwire contributors|© \{new Date\(\)\.getFullYear\(\)\} Critwire'` prints nothing, and `git grep -n -i 'copyright (c)' -- ':!plans'` shows only `LICENSE` (Haunted Pavement LLC) and DejaVu's licence.
    - `git grep -n -i -E '30-day retention|restore tested|destination for nightly|set up during Phase 7|on your own server' -- docs README.md src` prints nothing.
    - `grep -n -o -P '\[[^\]]+\](?!\()' legal/*.md` prints exactly the Summary's placeholders.
    - `grep -n -x 'status: draft' legal/*.md` prints three lines.
13. `git push origin agent/legal-launch`. Don't merge.

**Migration check (S14; S17 reruns it if a migration changed).** The mission's database role has CREATEDB. This follows `/srv/critter-ai/agent-state/missions/feedback-pivot/migration-check/commands.sh`. Write `commands.sh` with the parts `setup|premig|seed|fixtures|migrate|assert|cleanup`, since the shell keeps no variables between tool calls, and run the parts in order:

```
CHECK=/srv/critter-ai/agent-state/missions/legal-launch/migration-check; mkdir -p $CHECK
U="$(grep ^DATABASE_URL= .env | cut -d= -f2-)"; B="${U%/*}"
PRE=critwire_m_legal_launch_premig; COPY=critwire_m_legal_launch_migcheck
psql "$U" -c "drop database if exists $PRE" -c "drop database if exists $COPY" -c "create database $PRE" -c "create database $COPY"
git worktree add --detach /tmp/ll-premig 3054287
sed -e "s|^DATABASE_URL=.*|DATABASE_URL=$B/$PRE|" -e "s|^NEXT_PUBLIC_SERVER_URL=.*|NEXT_PUBLIC_SERVER_URL=http://localhost:3300|" .env > /tmp/ll-premig/.env
cd /tmp/ll-premig && pnpm install --frozen-lockfile && pnpm payload migrate && SKIP_BUILD_STATIC_GENERATION=1 pnpm build
PORT=3300 pnpm start        # in the background; wait for http://localhost:3300/api/health
# on :3300, as feedback-pivot's `seed` part does: POST /api/users/first-register, POST /api/tenants (demo-studio),
# then POST /api/seed/critter-connect with the CRON_SECRET bearer; stop the server
cd /srv/critter-ai/worktrees/legal-launch
psql "$B/$PRE" -v ON_ERROR_STOP=1 -f tests/migrations/legal-launch/fixtures.sql
pg_dump "$B/$PRE" | psql -v ON_ERROR_STOP=1 -q "$B/$COPY"
psql "$B/$PRE" -v ON_ERROR_STOP=1 -f tests/migrations/legal-launch/assert.sql 2>&1 | tee $CHECK/assert-unmigrated.log   # must raise
DATABASE_URL="$B/$COPY" pnpm payload migrate 2>&1 | tee $CHECK/migrate.log
psql "$B/$COPY" -v ON_ERROR_STOP=1 -f tests/migrations/legal-launch/assert.sql 2>&1 | tee $CHECK/assert.log
```

**Definition of done, and what proves each item**

| Definition of done | Proof | Step |
|---|---|---|
| tsc, lint, build and the full E2E suite pass | Steps 2, 3, 6 and 7 above; the report in `e2e-final/` | S17 |
| Each legal page renders its version, effective date and draft note | `legal-pages` › LP1, checked against front matter the spec parses itself. LP2: unknown documents are 404s | S2 |
| Signup refuses a request missing either box, including one sent straight to the submit route | `legal-acceptance` › LA7: JSON and form posts missing either box, or carrying an old version, get a 400 or `?error=1`, with no account, no outbox email and no record | S4 |
| …and records the acceptance with both versions | LA8: exactly one record with both current versions and digests, made by the verified holder on `/legal/accept`. Signup itself records nothing (Decisions). LA4 covers the route on its own | S5, S3 |
| The first-login check | LA9: a super-admin-made account goes to `/legal/accept` from a deep admin link and from onboarding; REST and GraphQL writes, `PATCH /api/tenants` included, get a 403 until it accepts; then it reaches the admin. LA10: checked again after a version bump. LA11: a super admin is never checked | S5 |
| The notice and the warning on the feedback, contact and abuse-report forms | `reports-contact` › S5.15; `abuse-reports` › S17.4 | S10 |
| …and in the Discord `/feedback` flow, with locally signed requests | `discord-interactions` › D2 and D4: the shortened warning on every text field, the notice on both confirmations, the command's description (Decisions: the shortened warning) | S11 |
| The feedback form has no email field, and the route stores none even when one is sent | `reports-contact` › S5.12 | S9 |
| A delivered contact message leaves no email anywhere in the database | `reports-contact` › S5.13; S5.14 covers a delivered job that Payload failed to delete | S6 |
| Deleting a user: the studio's owner shows as a deleted user, and its content stays | `account-deletion` › AD3, read as a super admin, and AD4 | S8 |
| Footer links on the home page, a portal page and the auth pages | `legal-pages` › LP3 | S10 |
| The migration runs cleanly on a copy of the Critter Connect seed | `migration-check/`: MC1–MC9 pass on the migrated copy and raise on the unmigrated one | S14 |
| Screenshots at 1440 and 390 px of the legal pages, signup, `/legal/accept` and the three forms | `screenshots/index.html` and `after/legal--*.png` | S16 |
| The Summary's inventory, placeholders, unkept promises (none) and the draft note | Drafted in S15 from the final documents, completed in S17 | S15, S17 |
| Handoff: the placeholders and the lawyer's review, the DMCA agent, turning signup back on | H16, H17 and H19 (and H18, journal retention), filed in S1 and updated in S15 | S1 |
| H7 closed | The handoff file's `## Closed` | S12 |
| Branch pushed, not merged | Step 13 | S17 |

**Goal items outside the Definition of done:**
- **Hosted service only; self-hosted instances run under their own terms:** all three documents (S1, S15) and `docs/self-hosting.md` (S13).
- **Deleting a game or a studio removes its content:** `account-deletion` › AD1 and AD2.
- **Failed deliveries, and the 30-day bound:** `reports-contact` › S5.14, and the Privacy Policy's wording (S15).
- **The scheduler's state is locked:** `tenant-isolation` › S1.14.
- **The documents in the standalone output:** step 6.
- **Goals 4, 7 and 8:** the audits in step 12.

**Existing tests whose expected values change.** Nothing else may change meaning.
- `signup.spec.ts` S15.1: the boxes, then `/legal/accept`.
- `reports-contact.spec.ts` S5.1: no email.
- `reports-contact.spec.ts`: any assertion of the contact form's old email label.
- `embed-feeds.spec.ts` E8: no `submitterEmail`.
- `discord-interactions.spec.ts` D2 and D4: descriptions and confirmations.
- `home.spec.ts`, if it asserts the footer's copyright holder.
- `runDiscordPosts`, which becomes a call to `runDueJobs`.

**Manual checks:**
- Read the three pages in the 390 px screenshots.
- Read each document once more against the Brief's bullets for it (S1, S15).
- Read D2's recorded confirmation in its report, to see the notice as Discord would render it.

## Failure modes

The two isolated checks below are specifications: the loader script is written from DL1–DL12 before the loader (S2), and `assert.sql` from MC1–MC9 (S14). The other lists are the ways the risky parts can fail. Each names the E2E assertion that catches it, and that assertion is written in its step before the code.

**The document loader (S2; a throwaway script, saved in `loader-check/`).** Each case runs against a scratch `legal/` folder (`process.chdir` into a temp directory). These must throw, naming the file and the problem:
- DL1. A missing file.
- DL2. No front matter: the file doesn't start with a `---` line, or the block never closes.
- DL3. A missing key: each of `version`, `effective` and `status` in turn.
- DL4. An extra key, such as `title: x`.
- DL5. A duplicate key.
- DL6. A bad `version`: empty, `.1`, `0 1`, 33 characters, or a quoted `"0.1"`. Values are bare; a quote fails loudly rather than being half-parsed.
- DL7. A bad `effective`: `2026-13-01`, `2026-02-30` or `4 October 2026`.
- DL8. A bad `status`: `Draft` or `published`.
- DL9. A slug that isn't one of the three, such as `../package`, throws before any read.

These must pass:
- DL10. The committed files parse to `0.1`, `2026-10-04` and `draft`, and the body starts after the closing `---`.
- DL11. `digest` equals `sha256sum legal/<slug>.md`.
- DL12. Importing `documents.ts` and `src/payload.config.ts` from a folder with no `legal/` reads nothing and doesn't throw. Only a call reads.

**The migrations on existing data (S14, `assert.sql`).** It raises when:
- MC1. Any of the four migrations isn't recorded in `payload_migrations`.
- MC2. `issue_reports.submitter_email` still exists, or a seeded report is gone (looked up by title).
- MC3. The seed's `player@example.com` is still anywhere in the database, by a scan of every table's rows as text.
- MC4. `legal_acceptances` is missing or not empty, or any of these holds:
  - its `user_id` is nullable;
  - it lacks the foreign key to `users` (ON DELETE SET NULL) or the index on `user_id`;
  - it lacks a version or digest column;
  - it has a column whose name contains `ip`.
- MC5. `payload_locked_documents_rels.legal_acceptances_id` is missing.
- MC6. `users.deleted` is missing, or an existing user isn't `false`.
- MC7. `payload_jobs.meta` or the `payload_jobs_stats` table is missing, or `purge-contact-jobs` isn't in both jobs task-slug enums.
- MC8. The fixture's pending contact job is gone or its input changed.
- MC9. Studio content is gone: the seed's game, its issues, its updates and its media rows.

**`next` after accepting (S3, LA5).** Each of these must redirect to `/admin`:
- SN1. `//evil.example/admin` and `///evil.example`.
- SN2. `https://evil.example/admin` and `javascript:alert(1)`.
- SN3. `/\evil.example` and `/admin\@evil.example`.
- SN4. `/%5cevil.example` and `/admin%5C..%5Cx`.
- SN5. A control character: `/admin%0d%0aSet-Cookie:x` and `/admin%09`.
- SN6. Paths outside the allowlist: `/g/x`, `/legal/accept` (a loop), `/api/users/logout` and `/administrator`.
- SN7. `/admin/../api/x`, which normalizes to a path outside the allowlist.
- SN8. No `next`, an empty one, or two `next` parameters.

These pass through as their parsed path and query: `/onboarding`, `/admin` and `/admin/collections/game-projects?limit=10`.

**Agreement and the gate (S3–S5).**
- A1. A record made without both boxes, or for a version the page didn't show: LA3, LA7.
- A2. A record made at signup or verification, before the inbox's owner ticked anything: LA7, LA8.
- A3. Two records from one acceptance: LA4.
- A4. A digest that isn't the file's: LA4.
- A5. A deep admin link, or a REST, GraphQL or onboarding write, getting past the gate: LA9.
- A6. The gate blocking what `/legal/accept` needs (`me`, Log out, the page itself): LA9.
- A7. A version bump going unnoticed, because the memo outlives its request: LA10.
- A8. A super admin being asked: LA11.
- A9. Writes with no user (jobs, Discord interactions) being blocked: D2–D6 and S5.4 still pass.
- A10. Anyone but a super admin reading a record, or anyone writing one: LA6.

**Contact messages (S6).**
- C1. A delivered message's address staying in `payload_jobs` or `payload_jobs_log`: S5.13.
- C2. A job Payload failed to delete after delivery staying: S5.14, job A.
- C3. An undelivered message outliving 30 days: S5.14, job C.
- C4. The sweep deleting a recent undelivered message, or another task's job: S5.14, jobs B and D.
- C5. The scheduler never queueing the sweep: S5.14 fails waiting for it.
- C6. A studio user reading the scheduler's state, or postponing the sweep: S1.14.

**Deletion (S7, S8).**
- X1. A game with feedback, votes, a Discord post record or contact jobs that can't be deleted: AD1.
- X2. Any of a deleted game's content surviving: AD1's REST finds and its scan.
- X3. A studio with a member that can't be deleted: AD2.
- X4. A studio delete touching another studio, the member's account or the abuse report: AD2's control studio, member and report.
- X5. An uploaded file outliving its studio: AD2.
- X6. A deleted account keeping a working session or password: AD3.
- X7. Its email surviving anywhere in the database: AD3's scan.
- X8. The studio losing its content or its owner row: AD3.
- X9. A deleted account being undeleted, given a new email or name, hard-deleted or self-deleted, or being sent email: AD4.
- Not reachable from E2E: a sweep that itself fails, and a studio delete that fails halfway. Both throw (Architecture › E2E specs).

**Notices (S10, S11).**
- N1. A free-text field not linked to the warning: S5.15, S17.4.
- N2. The notice's links pointing anywhere but `/legal/terms` and `/legal/privacy`, or being relative on Discord: S5.15, S17.4, D2, D4.
- N3. A Discord text over 100 characters: D4, and `formResponse` throwing.
- N4. The portal's critwire links disappearing when "Powered by" is hidden: LP3 on the 3102 server.

## Decisions

- **H7 (copyright holder):** Danby answered "Copyright (c) 2026 Haunted Pavement LLC". That's Goal 7 already, so the scope doesn't change; the item stays `done` until the step that changes the LICENSE closes it.
- **Discord warning (Brief deviation):** Discord shows a shortened warning (88 characters) and a 94-character notice in the command description, because Discord caps both at 100 characters; the confirmations carry the full notice. The Summary must say Discord doesn't show the Brief's exact warning sentence.
- **Who accepts (Astra MUST-FIX 2):** signup's two checkboxes stay required and server-checked, but the recorded acceptance comes only from `/legal/accept`, ticked by the signed-in, verified holder. New accounts tick twice, so no record rests on an unverified address.
- **Undelivered contact messages are deleted after 30 days** by the `purge-contact-jobs` sweep. The Brief allowed "until retried or cleared"; a bound is more protective.
- **Deleting a game deletes its content** (feedback, updates, votes, Discord post records, queued contact messages). Today that delete fails whenever the game has feedback.
- **Each acceptance also stores both documents' SHA-256 digests**, beyond the Brief's user, versions and time. No personal data.
- **One visible warning per form**, linked to every free-text field via `aria-describedby`, rather than a copy under each field.
- **Planner: four migrations instead of one.**
  - The Architecture names a single `legal_launch` migration. Instead, each schema change lands in the step that uses it, so every step leaves the app working, and E2E checks each migration as it lands:
    - `legal_acceptances` (S3);
    - `contact_job_sweep` (S6);
    - `users_deleted` (S8);
    - `drop_submitter_email` (S9).
  - The final schema is the same, and the migration check (S14) runs all four on the Critter Connect copy.
  - Precedent: feedback-pivot split its M14 the same way.
- **Planner: the sweep's migration also adds `purge-contact-jobs` to both jobs task-slug enums.**
  - The Architecture's migration list leaves this out, but Payload generates it for every new task, as `discord_stage_posts` did.
  - Its `down` deletes that task's rows first.
- **Planner: the documents stay at version `0.1` until this branch ships.**
  - "A version names one text" applies from the first deploy, and nothing has been deployed.
  - So S15's corrections keep `0.1`, and every acceptance recorded in E2E carries the digest of the text as built.
- **Planner: handoff items H16–H19 are filed in S1, together with the drafts.**
  - That way the DMCA registration and the lawyer's review can start while the mission runs.
  - S15 updates H16 if the list of placeholders changes.
  - The live-config facts (Sentry and R2, the Upstash region, Oracle backups, the mailbox) are part of H16, as the Architecture says.
  - H8 gets a pointer to the new items; its status stays the owner's to set.
- **Planner: the shared `accountEmail` rule, which refuses `.invalid`, lands with account deletion (S8),** not with the signup boxes (S4). The step that creates `.invalid` addresses also refuses them and tests it.
- **Planner: "free-text field" means a text input or a textarea.**
  - The warning is linked to the feedback form's title, description, platform and game version; the contact form's name, subject and message; and the abuse report's details.
  - Email fields and selects aren't free text.
- **Planner: the `submitterEmail` audit allows exactly one line,** the `STALE_EMAIL_FIELD` constant in `reports-contact.spec.ts`.
  - The DoD requires sending the old field to prove the route drops it, so the spec has to name it once.
  - The audit also excludes `tests/migrations/`, since `assert.sql` checks the column is gone.
- **Planner: the loader's parser is checked by a throwaway script.**
  - The script is written from Failure modes DL1–DL12 before the loader, and saved with its output under `agent-state/missions/legal-launch/loader-check/`.
  - Why: the Architecture adds no int tests, and E2E can't serve a broken document.
- **Planner: test accounts accept by default from S4, one step before the gate (S5).**
  - The `{ accept }` option arrives in S3, defaulting to `false`, and S4 flips the default.
  - The gate's step then changes only enforcement and its own tests.
- **S2: no `dynamicParams = false` on `/legal/[document]`.** With it, Next 16 logs `Error: Internal: NoFallbackError` on the server for every unknown path, so any stray `/legal/x` hit would put a false error in the journal. The page keeps `generateStaticParams` (the three documents build static, `●`) and returns the 404 through its own `isLegalSlug` check and `notFound()`. LP2 proves `/legal/unknown` and `/legal/terms.md` are still 404s.
- **S2: `LEGAL_SLUGS`, `isLegalSlug` and the titles live in `src/lib/legal/paths.ts`** (no fs), and `documents.ts` takes each title from `LEGAL_LINKS` and re-exports the slug type, so the slugs and titles are written once.
- **S3: the generated `down` of `legal_acceptances` was fixed by hand.** `DROP TABLE "legal_acceptances" CASCADE` already drops the lock table's foreign key, so Payload's following `DROP CONSTRAINT` failed and `migrate:down` refused to run. The line is removed, with a comment, and down → up was proven on `critwire_m_legal_launch`.
- **S3: one refined `legalConsentSchema`, which signup intersects with its email (`.and()`) in S4.** A `withLegalConsent(shape)` helper lost Zod 4's type inference inside the refinement, and Zod 4 can't `.extend()` a refined object.
- **S3: `next` travels in the form's action (`/legal/accept/submit?next=…`), not a hidden field.** The route reads it with `getAll('next')`, so a repeated `next` is refused by `safeNext` on the route exactly as on the page (SN8).
- **S3: the age box reads "I confirm I’m at least 18 years old." with a typographic apostrophe,** as all of the site's copy does. The specs assert that exact text.
- **S3: small shared pieces.** `legalVersionLine` (`src/lib/legal/format.ts`) gives the legal pages and `/legal/accept` the same version line; `LEGAL_CONTACT_EMAIL` sits in `copy.ts`; `LegalCopyText` renders a copy sentence's parts with the documents linked, for S10 to reuse; `acceptLegal` gained an `omit` option for LA3.
- **S4: `startSignup` stays the happy path; refused signups post `legalConsentForm(options)` directly.** The plan gave `startSignup` options to leave a box out or send an old version, but it asserts "Check your inbox", so a refused post can't go through it. Instead `support/legal.ts` has one `legalConsentForm({ omit, versions })`, which `startSignup`, `acceptLegal`, S15.6 and LA7's JSON and form posts all use, so the consent fields are written once.
- **S5: `ageLegalAcceptance` appends `-old` to the account's recorded Terms versions,** the state a bump leaves behind, without changing the files the server reads. `support/db.ts` opens one client per call, so no pool outlives a test.
- **S5: `LegalGateView` reuses Payload's own i18n strings** for the "no access" header and Log out, so anyone the gate doesn't redirect sees exactly what Payload's view showed.
- **S6: `runDueJobs` lets the scheduler run only on its first queue run; the later runs pass `disableScheduling=true`.** Every run of the `default` queue otherwise calls Payload's `handleSchedules`, which queues the next `purge-contact-jobs` as soon as the last one is deleted, so "until none remain" would never end. It also waits on a matching job another runner holds (the servers' own autorun) instead of making it due, and throws after 20 runs, so a stuck job fails the test.
- **S6: S5.14 doesn't scan for A before the sweep.** The servers' own sweep could delete A between its creation and that scan; the test checks A's log row in the create response instead, so it passes whenever the sweep runs.
- **S7: AD2 checks the image URL answers 200 before the delete and 403 after, not 404, and that the file is gone from disk.** Payload's `checkFileAccess` answers 403 to a reader whose access is a query and finds no row (an anonymous player), and a super admin's `true` access skips the row lookup and reads the disk, which answers 500 for a missing file. Both are Payload's own behaviour for any missing file, not this step's. The disk check proves the file itself is gone (X5).
- **S7: the plugin's cleanup also expired the deleting super admin's `payload-tenant` cookie when it named the deleted studio. That isn't replicated:** the plugin's `TenantSelectionProvider` ignores a cookie that matches none of its options.
- **S7: a game's content goes in this order:** Discord post records, reports, items (each with its votes), updates, contact jobs. Only the keys to the game are NOT NULL; the order spares Payload setting reports' and Discord posts' nullable keys to items and updates just before deleting them.
- **S9: `embed-feeds` proves a report's private detail stays out of the feeds with a `platform` marker instead of the email.** Promotion copies only the title and description, so the platform is now the report's private field that a feed could leak. The bug form's platform and game version share the row the email used to take.
- **S10: the web copy ends its sentences and uses typographic apostrophes.** The notice reads the Brief's sentence plus a full stop, and the warning starts "Don’t", as the site's copy does (S3's age box set the rule). The specs assert those exact strings.
- **S10: each player form's submit button names the notice in `aria-describedby`** (`LEGAL_NOTICE_ID`), as the free-text fields name the warning, so a screen reader hears the notice with the button. The specs check the button's accessible description and that the notice ends at most 150 px above it.
- **S10: the contact form's name and email no longer share a row.** The email's label is now a long sentence, and beside "Name (optional)" the two inputs would sit at different heights.
- **S11: `noticeMarkdown(href)` takes one function from document to URL, not two URLs.** It renders `SUBMIT_NOTICE`'s parts, as `LegalCopyText` does on the web, so the Discord notice can't drift from the web's sentence; `feedback.ts` passes `absoluteURL(LEGAL_LINKS[document].href)`.
- **S11: every Discord text field is built by one `textField` helper in `feedback.ts`, which always adds the short warning.** A new text field can't be added without it; the selects (Game, Type) don't go through it and carry none. `TextFieldSpec` is exported from `interactions.ts` for it.
- **S14: the fixture's studio user is an owner of `critwire-demo`, not a member of `demo-studio`.** The seed puts Critter Connect in its own `critwire-demo` studio; `demo-studio` (made by the check's `seed` part) stays empty. A membership in the studio that holds the content is the realistic case. `commands.sh` also has an `unmigrated` part, which saves `assert-unmigrated.log` and fails unless it holds an `ERROR`.
- **S15: the audit's mismatches, and which side changed.** Three read-only agents checked every statement in `legal/*.md` against HEAD and the installed Payload 3.85.2, Next 16.2.6 and the plugin.
  - **Code changed:**
    - Payload's logger redacts `job.input` and `job.log[*].input`. A failed task logged the whole job, so every failed contact delivery wrote the player's name, email and message to the journal. The error and the job's ID are still logged, so the failure stays loud; the targeted E2E run's log shows `"input": "[Redacted]"` and no player address.
    - `admin.avatar: 'default'` and `telemetry: false`. Payload's defaults sent each account holder's IP and email hash to Gravatar, and hashed IDs to Payload's telemetry server, and the policy lists neither. Turning them off collects less, where adding them to the policy would collect the same.
    - `refuseSuspendedStudioChange` on `Tenants`: an owner could still rename a suspended studio or change its slug, against the documents and the field's own description. S10.1 now checks it.
    - The contact form's email hint says "doesn’t keep it once it’s delivered", since an undelivered message is kept up to 30 days.
  - **Documents changed:**
    - **Deletes stay open to an account that hasn't accepted** (Terms, Privacy, `features.md`, `patterns.md`): they now say it must accept "before it can use the admin, or add to or change its studio's content, again". Gating deletes would block nothing anyone agrees to.
    - **Suspension** (Terms, Copyright): members "can't add or change anything", and the Terms add that they can still delete, as `suspension.spec.ts` asserts on purpose. The repeat-infringer sentence is an operator action ("We suspend…"), since nothing counts notices.
    - **The Terms' limits:** the hosted service already has limits; it "may change those limits or add paid plans later".
    - **Privacy:**
      - accounts also hold memberships and roles, timestamps and admin preferences;
      - a pending signup also holds its unused link;
      - the `payload-lng` cookie;
      - only JPEG and PNG keep their metadata;
      - publishing copies the feedback to a public item that stays until the studio deletes it;
      - the subject is optional;
      - a failed delivery is tried 3 times within minutes, then waits for an administrator or the 30 days;
      - a Discord contact post shows the name too;
      - the logs: a rare failed save can repeat what was sent, and Caddy's own error lines hold IPs (the ops Caddyfile is the owner's, so the policy says it instead of a filter; H18's Why now says so too).
  - The versions stay `0.1`, and the placeholders still match H16, H17 and H18.

- **S16 · What the screenshots found, and what changed:**
  - **The consent boxes were 20 px tall at 390 px**, below the 44 px tap-target floor (the probe failed on signup and `/legal/accept`). Fixed in `portal.css`: each input is 1.25rem wide and 2.75rem tall. Chromium draws the box at the smaller side, centred, so the box stays 20 px, and a negative top margin keeps it on the label's first line.
  - **The Privacy Policy's tables made the page 422 px wide at 390 px,** and `no-side-scroll` passed anyway: under `isMobile`, Chromium widens the layout viewport (`innerWidth`) to fit the content. Fixed both:
    - `probes.ts` now measures a page against the viewport's width (a frame still uses its `innerWidth`);
    - `marketing.css` makes a legal page's table a block that scrolls on its own, so the four-column "Outside services" table scrolls inside its box instead of widening the page.
  - **Code in the legal documents showed tailwind typography's backticks.** A `marketing.css` rule can't remove them, because it's imported into `@layer components` and the plugin's rules are in `utilities`. The page uses the plugin's own `prose-code:before:content-none prose-code:after:content-none` instead.
  - **Not changed: the space above the submit button on the bug, contact and abuse forms is blank in the shots.** That's where the Turnstile widget goes. It's a cross-origin iframe, and Chromium leaves those blank in a full-page capture below the first viewport. Signup's widget sits inside the first viewport and does show. The always-pass token is filled, as `settle` checks, and the feedback-pivot mission's shots have the same blank, so this predates the mission.
- **S17 · Two audit hits that aren't defects, so nothing changed:**
  - The holder grep (`Critwire contributors|© …Critwire`) prints only lines in `plans/`: older plans, and this one's own findings, which quote the old text as history. Nothing outside `plans/` matches, as S12 found.
  - The copy grep matches `MarketingHome.tsx:121`, "Run it on your own server with only Postgres". That's the self-hosting sentence, and it's accurate. The pattern was aimed at the old filter claim (Findings, "Copy that promises safety…"), which S12 replaced with "inside critwire, with no outside service".

## Log

- 2026-10-04 21:22 UTC: Baseline. tsc, lint (0 errors, 20 warnings), int (34/34) and E2E (181/181) all pass on the unchanged base.
- 2026-10-04 21:52 UTC: Architecture. The `architect` wrote findings (privacy audit with corrections to the brief's inventory: the Tenants field is `createdBy`, studios see Discord IDs, Turnstile gets IPs, Namecheap DNS/mail, no backups despite the docs, unbounded journal) and the target design (runtime front-matter versions, admin-access gate, `legal-acceptances`, anonymize-on-delete, delete delivered contact jobs). Plan-only change; no code to verify. The handoff items it proposes (journal retention, the live-config facts) get filed by the Steps.
- 2026-10-04 21:58 UTC: Fable review. `architecture-reviewer` verified F1–F8 against the code and installed Payload/Next: APPROVE_WITH_CHANGES, one MUST-FIX (the API write gate misses `Tenants` updates), two misses (password recovery for anonymized accounts; record the shortened Discord warning under Decisions), five SHOULD-CONSIDER. Plan-only change; no code to verify.
- 2026-10-04 21:59 UTC: Astra review. APPROVE_WITH_CHANGES with four MUST-FIX (the `Tenants` write gate, as Fable found; signup acceptance tied to an unverified email; acceptance not bound to the displayed versions; completed contact-job deletion is best-effort in Payload) and three SHOULD-CONSIDER. Plan-only change; no code to verify.
- 2026-10-04 22:20 UTC: Revision. The `architect` resolved all four MUST-FIX items: the `Tenants` write gate; acceptance recorded only by the verified holder at `/legal/accept`; versions bound through hidden fields; a scheduled `purge-contact-jobs` sweep backing up Payload's best-effort delete. It also folded in the cheap review suggestions and fixed two problems neither review found: studio/game deletes that fail today, and the open `payload-jobs-stats` global. Decisions recorded. Plan-only change; no code to verify.
- 2026-10-04 22:37 UTC: Steps. The `planner` wrote 17 steps (S1 legal drafts and handoff items through S17 full verification), the Verification (commands, specs against the Definition of done, artifact location), Failure modes, and nine Decisions (four migrations, one per step that needs it; `.invalid` email rule moves to S8; documents stay at 0.1 until ship, among others). Plan-only change; no code to verify.
- 2026-10-04 22:55 UTC: S1. Wrote `legal/terms.md`, `privacy.md` and `copyright.md` (v0.1, draft, 2026-10-04), covering every Brief bullet and every inventory row, cookies by name and lifetime. Placeholders (grep): `[LLC street address]` ×3 docs, `[county]`, `[cap: suggestion for the lawyer: …]`, `[DMCA agent: pending registration]`, `[repeat-infringer threshold]`, `[Upstash region]`, `[log retention]`, `[backups]`, `[backup retention]`, `[mailbox provider]`, `[retention of emails to admin@critwire.com]`: exactly the Architecture's list. Filed H16–H19 (numbers were free) and the H8 note; H17 points at `dmca.copyright.gov/osp/login.html` (200). tsc pass; lint 0 errors, 20 warnings.
- 2026-10-04 22:52 UTC: S2. Loader `src/lib/legal/documents.ts` (strict front matter + Zod, lazy read, memoized in production, SHA-256 digest), `src/lib/legal/paths.ts` (`LEGAL_LINKS`, `safeNext`, `acceptHref`), the static `/legal/[document]` page (version line, draft banner, noindex, `marked@15.0.12` pinned), the boot check, and `legal/*.md` traced into standalone. Loader check written first and failing, then 29/29 DL1–DL12 pass (`agent-state/missions/legal-launch/loader-check/`). tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e legal-pages home`: 7/7; `.next/standalone/legal/` has all three; frozen lockfile up to date. Dropped `dynamicParams = false` (Decisions).
- 2026-10-04 23:06 UTC: S3. `legal-acceptances` collection (super-admin read, no REST writes, no IP) and migration `legal_acceptances` (generated `down` fixed: CASCADE already drops the lock FK; up → down → up proven), `needsLegalAcceptance` (memoized per request) and `recordLegalAcceptance` (refuses non-current versions, stores both digests), the shared consent schema, `LegalConsentFields`, `/legal/accept` and its submit route (303s, `safeNext`), and the `{ accept }` fixture option (default false). tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e legal-acceptance legal-pages tenant-isolation accounts`: 45/45 (LA1–LA6 included).
- 2026-10-04 23:38 UTC: S4. Signup's form shows `LegalConsentFields` and its route parses the email `.and(legalConsentSchema)` before any work (400 / `?error=1`, no account, no email); new error text and verify lede. Fixtures accept by default (`seedUser`, `seedStudio`, `signUpStudio`, `auth.setup.ts` for aOwner/aMember/bOwner, `setup.shots.ts`), with one shared `legalConsentForm` (Decisions); S15.1 ticks both boxes; LA7 added. tsc pass; lint 0 errors, 20 warnings; full `pnpm test:e2e`: 191/192, the one failure S6.1's login form reset by hydration (empty Email, unrelated); given the `networkidle` wait the other login specs already use, `admin-triage` 8/8, and `admin-triage signup legal-acceptance` 22/22 on the same build.
- 2026-10-04 23:44 UTC: S5. The gate: `adminPanelAccess` as `Users.access.admin`, `LegalGateView` as the admin's unauthorized view (import map regenerated), onboarding's page and route send to `acceptHref('/onboarding')`, and `assertLegalAcceptance` on the tenant field and `Tenants` `beforeChange` (403 with the gate's message). `support/db.ts` (`pg`/`@types/pg` 8.20.0, exact) with `ageLegalAcceptance`, and the AGENTS.md Testing bullet. LA8–LA11 added; S15.1 passes through `/legal/accept`. tsc pass; lint 0 errors, 20 warnings; targeted `legal-acceptance signup onboarding` 27/27; full `pnpm test:e2e` 196/196.
- 2026-10-04 23:55 UTC: S6. `deleteWhereOrThrow`, `CONTACT_TASKS`, `deleteContactJobs` and the `purge-contact-jobs` task (every 10 minutes on `default`, `retries: 0`, deletes completed or 30-day-old contact jobs, Sentry and rethrow); the contact log line drops `to`; `deleteJobOnComplete: true` stated; `lockJobStatsGlobal` limits `payload-jobs-stats` to super admins. Migration `contact_job_sweep` (the enum value, `payload_jobs.meta`, `payload_jobs_stats`; `down` deletes the task's rows first; up → down → up proven). `support/jobs.ts` `runDueJobs` (Decisions), `runDiscordPosts` on top of it, `countInDatabase` and `ageJob`; S5.13, S5.14 and S1.14 added. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e reports-contact tenant-isolation discord-posts` 54/54; no `purge-contact-jobs` error in the servers' output.
- 2026-10-05 00:10 UTC: S7. `TENANT_SCOPED_COLLECTIONS` exported from the plugin's own map, and `cleanupAfterTenantDelete: false`; `GameProjects` `beforeDelete` `deleteGameContent` (Discord posts, reports, items with votes, updates with versions, contact jobs, through `deleteWhereOrThrow`/`deleteContactJobs`); `Tenants` `beforeDelete` `deleteStudioContent` (games first, the other scoped collections, media last, then memberships), all with `req`. New `account-deletion.spec.ts` AD1 and AD2. The image check is 200 → 403 plus the disk, not a 404 (Decisions). tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e account-deletion tenant-isolation issues-voting discord-posts media` 52/53, the one failure AD2's 404 expectation; after the fix, `account-deletion` 3/3 on the same build (only the spec changed).
- 2026-10-05 00:15 UTC: S8. `Users`: no hard deletes (`access.delete: () => false`), the super-admin-only `deleted` checkbox in the sidebar, and the hooks `guardAccountDeletion` (no self-delete; a deleted account keeps its email, name, roles, `_verified`, `deleted` and password, and only its memberships change), `refuseDeletedLogin` and `anonymizeDeletedUser`; `anonymizeUser` (`deleted-<id>@deleted.invalid`, "Deleted user", random password, `roles: ['user']`, no sessions or tokens, read back and checked, in the same transaction); the shared `accountEmail` rule refusing `.invalid`, used by signup and password recovery. Migration `users_deleted` (only `users.deleted`, default false; up → down → up proven), types regenerated. AD3 and AD4 added (AD4 also refuses a new password). tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e account-deletion accounts password-recovery signup legal-acceptance` 33/33.
- 2026-10-05 00:25 UTC: S9. `submitterEmail` removed from the feedback page (its `EmailField`; platform and version now pair up), the route's schema (a stale field is stripped by Zod and ignored), `createPlayerReport`, the `IssueReports` field (comment now "unvetted content and Discord identities"), the seed, `docs/features.md` and both specs; `embed-feeds` uses a private `platform` marker instead (Decisions). Migration `drop_submitter_email` (only the column; up → down → up proven), types regenerated. S5.1 no longer fills an email; S5.12 added. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e reports-contact embed-feeds discord-interactions screening` 36/36; the audit grep prints only the `STALE_EMAIL_FIELD` line.
- 2026-10-05 00:42 UTC: S10. `SUBMIT_NOTICE` and `SENSITIVE_INFO_WARNING` in `copy.ts`; `LegalNotice`, `SensitiveInfoWarning` and `LegalLinks` in `src/components/legal/`; `FormField` `describedBy`. The feedback, contact and abuse forms show the warning at the top (linked from every text input and textarea) and the notice above the submit (which it describes); new contact and abuse email labels and hint. Footers: `Legal` in the site footer, `Critwire legal` in the portal's base row whatever "Powered by" does, and `AfterLogin` on `/admin/login` (import map regenerated). LP3, S5.15 and S17.4 added; S17.1 uses the new label. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e legal-pages reports-contact abuse-reports home portal-landing admin-triage admin-dashboard embed` 60/60; screenshots of the three forms and the admin sign-in checked by eye.
- 2026-10-05 00:38 UTC: S11. `copy.ts` gains `SENSITIVE_INFO_WARNING_SHORT` (88), `DISCORD_FEEDBACK_DESCRIPTION` (94) and `noticeMarkdown`; `formResponse` puts a text field's `description` on its Label and throws over 100 characters; `/feedback`'s four text fields and Send to critwire's two carry the warning (one `textField` helper), both confirmations end with the notice's masked absolute links, and `/feedback`'s description is the new text. `discord-interactions.spec.ts`: D4 (registration) asserts the description and its length, D2/D6/D4 check every text field's warning and no select's, D2/D3/D4 the notice. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e discord-interactions discord-posts` 13/13.
- 2026-10-05 00:42 UTC: S12. `LICENSE` and the site footer name Haunted Pavement LLC (the footer keeps `getFullYear()`); the home page's filter runs "inside critwire, with no outside service"; `docs/architecture.md` and `docs/integrations.md` make backups the operator's job, and `docs/deploy.md`'s section is "Backups (the operator's job)", saying critwire makes none. Copy grep checked: README ("free and always will be" is the MIT licence), `docs/architecture.md:134,215,242`, `deploy.md:111`, `embed.md:184`, `features.md:171-174,208,324`, `self-hosting.md:7,58`, `share.md:62` and the home page (also for keep/store/reliable/secure/lost/uptime): no promise left. H7 closed. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e home legal-pages` 8/8; the holder grep prints nothing outside `plans/` (the older plans and this one quote the old line as history), and `copyright (c)` shows only `LICENSE` and DejaVu's licence.
- 2026-10-05 00:46 UTC: S13. Docs: `features.md` (Users' gate and `deleted`, LegalAcceptance, the signup's `/legal/accept` step, contact-email retention, new sections Legal documents and agreement, Deleting games, studios and accounts), `architecture.md` (`/legal/*` URLs, rendering rows, structure, `legal/`), `patterns.md` (The legal gate with "a version names one text" and why only `/legal/accept` records, Deleting games and studios with `deleteWhereOrThrow`, Account deletion, Shared legal copy, the sweep and the stats-global lock), `integrations.md` (`marked`, Resend's Reply-To), `discord.md` (the shortened warning and the notice; a game's delete), `deploy.md` (Logs and how long they're kept, with the journald drop-in; `legal/` in the standalone output), `self-hosting.md` (Your own terms: `legal/`, MIT and own-terms), the AGENTS.md docs-map row and a README line. Every named symbol and path greps to a file; relative links resolve (the one hit, `share.md:36`, is example syntax in code). tsc pass; lint 0 errors, 20 warnings; no E2E (docs only).
- 2026-10-05 00:53 UTC: S14. `tests/migrations/legal-launch/fixtures.sql` (a verified owner of `critwire-demo` with its membership, a pending `email-contact-form` job holding an email, a guard that the seed's report still has `player@example.com`) and `assert.sql` (one `DO` block, MC1–MC9). On a copy of the Critter Connect seed at `3054287`: `migrate.log` lists the four migrations, `assert.log` prints nine `ok` notices and no `ERROR`, and `assert-unmigrated.log` raises at MC1 (`agent-state/missions/legal-launch/migration-check/`, with `commands.sh`). Scratch databases and `/tmp/ll-premig` kept for S17. tsc pass; lint 0 errors, 20 warnings.
- 2026-10-05 01:08 UTC: S15. Three audit agents checked the documents against HEAD; the mismatches are fixed in code (Payload logger redacts job inputs, Gravatar and telemetry off, a suspended studio can't be renamed, the contact hint) or in the documents (deletes and the gate, suspension, limits, nine Privacy details), all under Decisions. Docs updated (`features.md`, `patterns.md`, `deploy.md`, `integrations.md`), H18's Why corrected; placeholders unchanged. Summary's inventory and placeholders drafted. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e legal-pages legal-acceptance suspension admin-dashboard reports-contact` 45/45, its log (`agent-state/missions/legal-launch/s15/e2e-targeted.log`) shows job inputs redacted and no player email.
- 2026-10-05 01:34 UTC: S16. A `legal` group in `catalog.ts` (the three documents, signup, `/legal/accept` with a new `accept` session that a super admin made and that hasn't accepted, and the bug, contact and abuse forms). `setup.shots.ts` makes that session, and the config header and AGENTS.md mention the group. The probes caught the 20 px consent boxes and, once `no-side-scroll` measured against the viewport, the Privacy tables' overflow. Both are fixed, and the typography backticks are gone (Decisions). `SHOTS_THEMES=legal,signup,marketing pnpm screenshots`: 29/29; `agent-state/missions/legal-launch/screenshots/` holds 16 `after/legal--*.png`, the signup and marketing shots, `index.html`, and `after/checks.json` with 28 entries and no failed probe. Checked by eye at 390 and 1440 px. tsc pass; lint 0 errors, 20 warnings; `pnpm test:e2e legal-pages legal-acceptance signup` 24/24 (`s16/e2e-targeted.log`).
- 2026-10-05 01:52 UTC: S17. Full Verification at `7caaa94`: frozen install up to date; tsc pass; lint 0 errors, 20 warnings; int 34/34; generated types and import map current; four new migrations run; `pnpm build` passes with `legal/` in standalone; full `pnpm test:e2e` 207/207, none failed or flaky (`e2e-final/`, `e2e-final-run.log`). Migration, loader and screenshot artifacts checked (no migration or shot page changed, so neither was rerun); audits pass, two non-defect hits recorded under Decisions. Scratch databases and `/tmp/ll-premig` removed. Summary written; `status: done`.

## Summary

The documents are **drafts for Haunted Pavement LLC's Wisconsin lawyer to review, not legal advice.** The code already does what they say. Signup stays off (`CRITWIRE_OPEN_SIGNUP` untouched); production, `/srv/apps/critwire` and `critwire_live` weren't touched. Branch `agent/legal-launch` is pushed, not merged.

### What changed, goal by goal

1. **Three legal documents.** `legal/terms.md`, `privacy.md` and `copyright.md` (v0.1, `status: draft`, effective 2026-10-04), in plain English. Every Brief bullet is covered, and the Privacy Policy comes from an audit of the code and the installed Payload, Next and plugin. Each says it covers critwire.com only, and that self-hosted instances run under their own terms (so does `docs/self-hosting.md`). A strict front-matter loader (`src/lib/legal/documents.ts`) reads them at runtime, a boot check fails on a broken one, and the standalone build ships them. They render at `/legal/terms`, `/legal/privacy` and `/legal/copyright` with their version, effective date and a draft banner.
2. **Agreement.**
   - Signup has two unticked boxes (Terms and Privacy; 18 or older), both required and checked by the server.
   - A `legal-acceptances` collection records the user, both versions, both documents' SHA-256 digests and the time, with no IP. Only super admins can read it.
   - A gate sends every signed-in user who isn't a super admin, and hasn't accepted the current versions, to `/legal/accept` before the admin or onboarding. It refuses their REST and GraphQL writes, `Tenants` included, with a 403. A version bump asks again.
3. **Notices.**
   - The submit notice and the sensitive-information warning appear on the feedback, contact and abuse-report forms. The warning is linked from every free-text field and the notice from the submit button.
   - On Discord, every text field carries a shortened warning, both confirmations end with the notice, and `/feedback`'s description carries it too.
   - Terms · Privacy · Copyright links are in the site footer, every portal page's base row and the admin sign-in.
4. **The feedback form's email is gone:** the field, the route (a stale field is stripped), `reports.ts`, the collection, the seed, the types, the docs and the tests. The `drop_submitter_email` migration drops the column.
5. **Contact emails aren't kept.** The new label reads "Email (optional, 13 or older)…". A delivered job is deleted, and a `purge-contact-jobs` sweep every 10 minutes backs that up and removes undelivered ones after 30 days. The log line no longer names the address, and Payload's logger redacts job inputs.
6. **Deletion.**
   - Users are never hard-deleted. A super admin marks one `deleted`, which anonymizes the account: `deleted-<id>@deleted.invalid`, "Deleted user", a random password, no sessions, tokens or memberships. Its acceptance records stay. The studio's `createdBy` then shows the deleted user, and the studio's content stays.
   - Deleting a game or a studio deletes its content in one transaction. Before, deleting a game with feedback failed.
7. **Copyright holder.** `LICENSE` and the site footer name Haunted Pavement LLC. H7 is closed.
8. **Copy.** The home page, README and docs promise nothing about backups or keeping data. Backups are the operator's job (`docs/deploy.md`).
- **Found by the S15 audit and fixed in code:**
  - Gravatar avatars and Payload telemetry are off, so neither gets account data.
  - A suspended studio can no longer be renamed.

### Results and artifacts

Run on 2026-10-05 at `7caaa94` (S16's commit; S17 changes only this plan):
- `pnpm install --frozen-lockfile` up to date.
- `tsc --noEmit` passes.
- `pnpm lint`: 0 errors and 20 warnings, the baseline's.
- `pnpm test:int`: 4 files, 34/34.
- The generated types and import map are current.
- `pnpm payload migrate:status` shows all four new migrations run.
- `pnpm build` passes, and `.next/standalone/legal/` has all three documents.
- **Full E2E: 207/207 passed in 13.0 min, with none failed or flaky** (the baseline had 181).
  - Report: `/srv/critter-ai/agent-state/missions/legal-launch/e2e-final/`, with a trace for each of the 207 tests. View it with `pnpm exec playwright show-report /srv/critter-ai/agent-state/missions/legal-launch/e2e-final`.
  - Log: `…/legal-launch/e2e-final-run.log`. No `purge-contact-jobs` error; job inputs show as `[Redacted]`.
  - Rerun with `pnpm test:e2e`, with `E2E_DATABASE_URL` set to a database whose name ends in `_e2e`.
- **Migration check:** `…/legal-launch/migration-check/` (`commands.sh`).
  - `migrate.log` lists the four migrations.
  - `assert.log` passes MC1–MC9 with no `ERROR`.
  - `assert-unmigrated.log` raises.
  - No migration changed since S14, so it wasn't rerun. The scratch databases and `/tmp/ll-premig` are removed.
- **Loader check:** `…/legal-launch/loader-check/`, 29/29 (DL1–DL12).
- **Screenshots:** `…/legal-launch/screenshots/index.html`.
  - 16 `after/legal--*.png` (8 pages at 1440 and 390 px), plus the signup and marketing groups.
  - `after/checks.json` has 28 entries and no failed probe.
- **Audits:** all pass, with two notes (Decisions, S17).

### Reviews

- **Fable** (`architecture-reviewer`): APPROVE_WITH_CHANGES, one MUST-FIX (the write gate missed `Tenants` updates).
- **Astra:** APPROVE_WITH_CHANGES, four MUST-FIX:
  - the `Tenants` gate;
  - acceptance tied to an unverified email;
  - acceptance not bound to the versions shown;
  - Payload's best-effort job deletion.
- The Revision resolved every MUST-FIX.

### Deviations from the Brief (Decisions)

- **Discord's warning is shortened:** 88 characters, not the Brief's exact sentence, because Discord caps field labels at 100. The command description carries a 94-character notice, and the confirmations carry the full one.
- **Signup records nothing.** The record comes from the verified holder ticking the boxes on `/legal/accept`, so new accounts tick them twice.
- **Undelivered contact messages expire after 30 days** (the Brief allowed "until retried or cleared").
- **Deleting a game deletes its content.**
- **Four migrations instead of one:** `legal_acceptances`, `contact_job_sweep`, `users_deleted` and `drop_submitter_email`.
- **Each acceptance also stores both documents' digests.** No personal data.

### Handoff

- **Waiting on Danby:**
  - H16: fill in the placeholders, and the lawyer's review; then `status: final` and new versions.
  - H17: register the DMCA agent ($6).
  - H18: keep the server's logs 30 days at most.
  - H19: turn signup back on once the legal launch is live.
- H8 points at them.
- H7 is closed.

### Data inventory (critwire.com, from `legal/privacy.md` v0.1 as built)

| What | Why | Where | How long | Who handles it |
|---|---|---|---|---|
| Studio account: email, optional name, password hash, sessions, verification and reset tokens, failed sign-ins and lock time, memberships and roles, timestamps, admin preferences | Sign-in and account emails | Postgres on the Oracle Cloud server (us-chicago-1) | Until the account is deleted (anonymized); a never-finished signup keeps its email and unused link with no expiry | Oracle Cloud; Resend sends the account emails |
| Cookies: `payload-token`, `payload-tenant`, `payload-theme`, `payload-lng`, `cw_vote_token`, `__prerender_bypass` | Sign-in, admin settings, one vote per browser, staff previews | The visitor's browser | 2 h (renewed in the admin); up to 1 year; 1 year; 1 year; session | None |
| Legal acceptances: user, both versions, both SHA-256 digests, time; no IP | Prove what was agreed, and to which text | Postgres; super admins only | Kept after the account is deleted (it then shows no email or name) | Oracle Cloud |
| Studio content: studios, games, contact settings, updates, triage, images | Run the portals | Postgres; images on the server's disk | Until deleted; deleting a game or studio deletes its content; JPEG/PNG keep their metadata | Oracle Cloud |
| Player feedback: title, description, type, category, platform, version; no name or email | The studio's board | Postgres | Until the studio deletes it, the game or the studio; a published copy stays until the studio deletes it | Oracle Cloud |
| Discord feedback: the above plus Discord user ID, username, message link | Follow-up on Discord | Postgres; studio members only | As feedback | Discord |
| Contact messages: optional name and email (13+), optional subject, message | Deliver to the studio | Payload's job queue in Postgres | Deleted on delivery (sweep every 10 min backs it up); undelivered: 3 tries, then until an admin acts, the game/studio is deleted, or 30 days | Resend (email, reply-to) or Discord (post shows name and email) |
| Abuse reports: page URL, reason, details, game, optional email (13+) | Moderation | Postgres; super admins only | Until an admin deletes it; kept with the URL after the game goes | Oracle Cloud |
| Votes: hash of the browser's token, item, time | One vote per browser | Postgres; token in the `cw_vote_token` cookie | Until withdrawn, or the item, game or studio is deleted; cookie 1 year | Oracle Cloud |
| IP addresses | Rate limits; Turnstile bot checks | Upstash keys; Cloudflare | Upstash about 2 h; never in Postgres; Caddy's own error lines | Upstash ([Upstash region]), Cloudflare Turnstile |
| Discord user IDs, SHA-256 email hashes | Rate limits | Upstash | About 20 min; about 2 h | Upstash |
| Referral counts per game, day and source | The studio's counter | Upstash | 35 days after the last visit | Upstash |
| Server logs: internal IDs, errors (rarely a failed save's values; Caddy's errors include IPs; job inputs redacted) | Run and fix critwire | The server's journal | [log retention] (H18) | Oracle Cloud |
| Email to admin@critwire.com | Requests and notices | Forwarded by Namecheap to [mailbox provider] | [retention of emails to admin@critwire.com] | Namecheap, [mailbox provider] |
| Backups | n/a: critwire makes none | [backups] | [backup retention] | Oracle Cloud, if any |
| Tally forms (only where a studio chose one) | The studio's own form | Tally | Tally's and the studio's terms | Tally |

### Placeholders left in the documents

- `[LLC street address]`: all three documents, twice each (H16).
- `[county]`: Terms, Law and courts (H16).
- `[cap: suggestion for the lawyer: the greater of US$100 or the fees paid to critwire in the 12 months before the claim]`: Terms, Limitation of liability (H16).
- `[repeat-infringer threshold]`: Copyright, Repeat infringers (H16).
- `[DMCA agent: pending registration]`: Copyright, Where to send it (H17).
- `[Upstash region]`: Privacy, twice (H16).
- `[log retention]`: Privacy, Server logs (H18).
- `[mailbox provider]` and `[retention of emails to admin@critwire.com]`: Privacy, Email to admin@critwire.com (H16).
- `[backups]` and `[backup retention]`: Privacy, Backups (H16).

### Promises the code doesn't keep

None.
- S15's audit found none.
- S16 changed only styling and the screenshot probes, not what the documents describe.
- The full run passes the specs behind each promise: LP, LA, AD, S5.12–S5.15, S17.4, D2/D4 and S10.1.

The documents are drafts for Haunted Pavement LLC's Wisconsin lawyer to review, not legal advice.
