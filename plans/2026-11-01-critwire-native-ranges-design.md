---
mission: critwire-native-ranges-design
project: critwire
branch: agent/critwire-native-ranges-design
status: active
started: 2026-11-01 17:41 UTC
---

# Mission: critwire, research native and introduced ranges (design only)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-native-ranges-design.md
     Start: started by the chain after critwire-learn-qa is released (base: main).
     Owner, 2026-11-01: "do everything" from the list of next work; third of three chained critwire missions.
     From plans/001-mvp.md "Later": native / introduced / historical range from a source critwire may use (not IUCN). -->

### Goal

A tested design, in `plans/007-native-ranges.md`, for adding **native, introduced and historical range** to critwire's 76 species from sources critwire is allowed to publish. That would sit alongside today's "countries with open records", which are not range.

The design covers:
1. **Sources**, each with its **license quoted from the source, with its URL**, its coverage of the 76 species (measured, not guessed), its spatial unit (country, region, polygon), and its terms on republishing. Candidates:
   - COL distributions (ChecklistBank)
   - GBIF species profiles and checklist distributions, such as GRIIS (the Global Register of Introduced and Invasive Species)
   - GBIF occurrence fields `establishmentMeans` and `degreeOfEstablishment`
   - Wikidata (endemism and range properties)
   - Natural Earth and RESOLVE as the spatial units
   - any other open source found

   **IUCN data is never used** (critwire's rule). Record why a source is rejected.
2. **The data model:** a new field or file. The `/v1` rule holds (additions only), so: what shape it takes; how native, introduced and uncertain are told apart; how sources conflict and how a conflict is shown; and how it relates to `range.countriesWithOpenRecords` without replacing it.
3. **A spike:** fetch the top two sources for all 76 species (read-only, ≤ 2 req/s) and measure coverage and agreement. Record every result in the plan, with the evidence kept in the mission folder.
4. **Learn tie-in:** where this data would add a lesson or improve an existing one, such as s1's sampling bias or g3's spatial joins.
5. **A ready-to-start build brief** in `plans/briefs/`, sized to finish well within 60 sessions.
6. **For the owner:** choices only the owner can make, each with a recommendation.

### Why

Players and learners want to know where an animal naturally lives, not only where open records exist. critwire's MVP plan deferred this to "its own research step". The owner asked for it now.

### Scope

In: `plans/007-native-ranges.md`, the build brief, and spike code and data in the mission's state folder (never in the repo).

Out:
- Any change to `scripts/`, `data/`, `site/` or `/v1`: `dist/` must stay byte-identical, which is checked at Baseline, at Verification and in the release smoke.
- IUCN data; Wikipedia prose.

### Definition of done

- `pnpm typecheck` and `pnpm test` pass, and `dist/` is unchanged.
- Every source has its license quoted with its URL.
- The spike's coverage numbers are in the plan, with the commands to reproduce them.
- The build brief exists.
- The Summary gives the recommended source(s), the coverage, the data shape and the owner's choices.

### Decision rules

- **Licenses decide.** If a source's terms are unclear, it isn't used.
- Prefer one good source over a merge of many. If merging is needed, say how conflicts are shown.
- Keep it simple; at most 20 steps.

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
