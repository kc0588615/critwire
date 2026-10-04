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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

- **H7 (copyright holder):** Danby answered "Copyright (c) 2026 Haunted Pavement LLC". That's Goal 7 already, so the scope doesn't change; the item stays `done` until the step that changes the LICENSE closes it.

## Log

- 2026-10-04 21:22 UTC: Baseline. tsc, lint (0 errors, 20 warnings), int (34/34) and E2E (181/181) all pass on the unchanged base.

## Summary
