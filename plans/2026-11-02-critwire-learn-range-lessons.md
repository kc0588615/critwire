---
mission: critwire-learn-range-lessons
project: critwire
branch: agent/critwire-learn-range-lessons
status: active
started: 2026-11-02 00:26 UTC
---

# Mission: critwire Learn, use the new range listings in s1, f3 and e4

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-learn-range-lessons.md
     Start: started by the chain after critwire-native-ranges-build is released (base: main).
     Owner, 2026-11-01: answers to 007's O4 and O5 (handoff H10, H11). -->

### Goal

Three Learn modules use the live `/v1/range-listings` file, as `plans/007-native-ranges.md` `## Learn tie-in` describes:
- **s1 (sampling bias):** compare where open records exist with where sources list an animal as native.
- **f3 (joins):** a join against the listings.
- **e4 (quality and provenance):** the module's made-up rows, as 007 says.

d1 and d2 too, only if they fit within the size limit below. g3 and c1 are deferred.

**The copy rule (O4):** "records, never range" changes only on pages that read the listings file, in the same change, using the wording in 007's `## Learn tie-in`. Everywhere else it stands. Update `AGENTS.md`'s copy rule to say so.

### Why

Learners can now see the difference between "recorded there" and "listed as native there", which is the honest point s1 has been making all along, using real data.

### Scope

In: the s1, f3 and e4 pages and blocks under `site/learn/`; any setup needed to load the listings for those blocks; `learn:check` results; `e2e/`; `plans/004-learn-curriculum.md`; `AGENTS.md`'s copy line.

Out:
- other modules, apart from d1 and d2 if they fit
- `/v1` files
- new datasets
- IUCN data
- held work: critwire PR #17 and `data/review/country-overrides.json`

### Definition of done

- `pnpm typecheck`, `pnpm test`, `pnpm build` and `pnpm e2e` pass; `learn:check` passes twice.
- Every new block ran, with its result recorded and shown on the page.
- A prose number on a changed page matches its block's result.
- Live smoke after `deploy`: each changed page returns 200, and its first new block shows the recorded result in headless Chromium.
- The Summary lists what changed per module and the exact wording used.

### Decision rules

- 007 is the design. Where code proves it wrong, fix it in the same commit and record why.
- Each listing is a claim by a named source: show the source, and show conflicts rather than resolving them.
- Keep it small: at most 12 steps.

### Notes

- If `/v1/range-listings` isn't live on `main`, add a handoff item and finish with `MISSION_BLOCKED: range listings not live`.
- Critter Connect's E2E isn't involved. Critwire's E2E harness uses ports 3100 and 3101.

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
