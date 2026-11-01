---
mission: critwire-learn-qa
project: critwire
branch: agent/critwire-learn-qa
status: active
started: 2026-11-01 11:16 UTC
---

# Mission: critwire Learn, a fresh-eyes QA pass over all 33 modules

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-learn-qa.md
     Start: started by the chain after critwire-review-presort is released (base: main).
     Owner, 2026-11-01: "do everything" from the list of next work; second of three chained critwire missions. -->

### Goal

critwire Learn (https://critwire.com/learn/; 33 modules, built by missions L1–L5) gets one pass as a **learner** would take it, from the map to the capstone. Fix what's small, and list what isn't.

Do this:
1. **Walk every page** in headless Chromium at 1280 px and at 375 px, light and dark.
   - Every link resolves.
   - Every prerequisite link points to the right module.
   - Every browser block runs and shows the result the page states.
   - Every exercise accepts its answer and rejects a wrong one.
   - The text agrees with the results shown: numbers in prose match the blocks.
   - Every diagram has alt text and a `<title>`.
   - No horizontal scroll.
   - The axe accessibility checks pass.
2. **Download every lab file** (`.sql`, `.py`, `.ipynb`) and run it as a learner would, using `learn:check`'s assembled-download stage. Confirm `/learn/setup/` still matches what the downloads need.
3. **Read for the owner's level:** a GIS specialist and game developer, new to the topic, reading fast. Flag jargon left undefined, steps that skip a needed action, and contradictions between modules.
4. **Astra's two leftover suggestions** from `critwire-release`:
   - a fixture test for GBIF dataset-facet paging past 300 datasets (`scripts/ingest/gbif.ts`)
   - safe slug filenames

   Check whether L1's record validator already covers slugs (`scripts/build/inputs.ts`, the validator). If it does, record that; if not, add the test.

**Fix** anything small: typos, a broken link, a wrong number in prose, a missing alt text, an exercise check bug. Write every fix with a test or an E2E assertion that would have caught it.

**List** anything bigger in `plans/006-learn-qa.md` with a recommendation, for the owner. That covers a module that teaches something wrong, a missing step, or a redesign. Don't do those.

### Why

L1–L5 were built and tested piece by piece. One end-to-end read by a fresh pair of eyes catches what per-module tests can't: cross-module contradictions, unclear steps and drift between the setup page and the labs. The owner is about to study from it.

### Scope

In: `site/learn/`, `scripts/build/` and the `learn:check` fixes the bugs need, `e2e/`, `plans/006-learn-qa.md`, the two Astra tests, and `plans/004-learn-curriculum.md` where code proves it wrong.

Out:
- new modules, new datasets, design changes, `/v1` changes
- the Caddy configuration
- IUCN data

### Definition of done

- `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- `pnpm e2e` passes in full.
- `learn:check` passes twice.
- `plans/006-learn-qa.md` lists every page walked, every issue found (fixed, with its commit, or listed, with a recommendation), and the axe and link results.
- The live smoke after `deploy`: every `/learn/` page returns 200, and the fixed pages show the fix.

### Decision rules

- **Fix small, list big.** If a fix needs more than about one step or changes what a module teaches, list it instead.
- Keep the 48-session limit and the E2E-artifact disk rule (session rules, step 3).
- Keep it simple; at most 25 steps.

## Stages

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

## Log

## Summary
