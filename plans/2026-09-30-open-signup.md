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
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-09-30 09:45 UTC · Baseline: created the E2E database, migrated; tsc, lint (0 errors, 20 warnings), int (13/13) and E2E (75/75) pass.

## Summary
