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
- [ ] Architecture: `architect` writes findings and the target design
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

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Questions for the owner

## Log

- 2026-09-25 06:35 UTC: Baseline recorded. tsc, lint (0 errors), int (45/45) and build pass; old E2E suite fails 2, 2 not run.

## Summary
