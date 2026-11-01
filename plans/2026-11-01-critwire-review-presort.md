---
mission: critwire-review-presort
project: critwire
branch: agent/critwire-review-presort
status: active
started: 2026-11-01 08:01 UTC
---

# Mission: critwire, pre-sort the review queue for the owner

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-11-01-critwire-review-presort.md
     Start: mission start critwire <this file>   (base: main)
     Owner, 2026-11-01: "do everything" from the list of next work; first of three chained critwire missions. -->

### Goal

The owner settles critwire's review queue, `data/review/mismatches.json` (214 entries at its last count: 186 country flags, 60 marked `blocking`), in minutes instead of hours. For **every entry**, the mission prepares a recommendation with evidence, so that the owner only has to say yes or no.

Deliverables:
- **`plans/005-review-presort.md`:** every entry, grouped by species, in plain language.
  - For each entry give:
    - what was flagged
    - the evidence: GBIF record counts, `basisOfRecord`, datasets, years and coordinates; signs of captivity, introduction or vagrancy; what COL and Wikidata say
    - the recommendation: for a country flag, `keep` or `remove`; for other kinds, the concrete fix
    - a confidence level: high, medium or low
  - Put a summary table at the top: counts by recommendation and confidence, and the **high-confidence entries the owner can accept in one go**.
- **`data/review/country-overrides.proposed.json`:** every country recommendation, in exactly the format `AGENTS.md` gives for `country-overrides.json` (`speciesId`, `country`, `action`, `reason`), with each reason short and citing its evidence. **It's a proposal:**
  - Never edit `data/review/country-overrides.json`, which is owner-only.
  - Make sure no script reads the proposal, so `pnpm derive` and `pnpm build` stay exactly as they were.
  - Add a test that the proposal file passes the same validation rules as the overrides file (`AGENTS.md`, "Overrides").
- **How the owner accepts:** document one command, for example `pnpm review:accept --confidence high`, or `--ids` with a list. It copies the chosen proposals into `country-overrides.json` and runs `pnpm derive`, so a later session or the lead can apply the owner's answer. The command is built and tested in this mission, but **not run**.

### Why

The owner keeps the country filter (CC0 and CC BY records only) and settles flags over time. 214 entries is too many to research by hand, so the agents do the research and the owner makes the call.

### Scope

In:
- reading `data/raw/`, `data/review/` and `data/species.json`
- GBIF and COL read-only API calls (≤ 2 req/s, logged), and Wikidata SPARQL
- the plan, the proposal file, the accept command and its tests

Out:
- `country-overrides.json` and derive rules
- IUCN data of any kind; "native range" claims (these are open records)
- re-ingesting sources
- `/v1` output: `dist/` must stay byte-identical, and the release smoke checks that the live files are unchanged

### Definition of done

- `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- `dist/` hashes equal the Baseline's, and so do the live files after `deploy`.
- Every entry in `mismatches.json` appears exactly once in the plan, with a recommendation and a confidence level. A script checks this coverage.
- The proposal file validates.
- The accept command is tested on a throwaway copy of the files.
- The plan's Summary gives the counts and the one sentence the owner can reply with to accept the high-confidence set.

### Decision rules

- **Evidence over plausibility.** No recommendation without a cited record, dataset or source. If the evidence is thin, say `low` and explain.
- **Honest wording:** countries are where open records exist, not native range.
- Keep it simple; at most 25 steps.

### Notes

- Read `AGENTS.md` (Countries, Overrides) and `plans/2026-10-20-critwire-ingest.md` §5 for the flag rules (`country-captive-suspect`, `country-borderline`, and the rest).
- Release: critwire missions merge and deploy at their end. Here `dist/` is unchanged, so the deploy republishes the same site.

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
