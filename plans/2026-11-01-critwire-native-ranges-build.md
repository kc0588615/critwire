---
mission: critwire-native-ranges-build
project: critwire
branch: agent/critwire-native-ranges-build
status: active
started: 2026-11-01 20:26 UTC
---

# Mission: critwire native ranges, build: `/v1/range-listings` (native, introduced, native but absent)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-native-ranges-build.md, then run:
     mission start critwire <that file>        (base: main)
     Don't start until O1 or O2 is yes: with every question unanswered the file holds 10 rows on 5 species, none native (spike, 2026-11-01). Read handoff H7–H11 first.
     Written by mission critwire-native-ranges-design, step S10. Design: plans/007-native-ranges.md; evidence: plans/2026-11-01-critwire-native-ranges-design.md.
     Estimate: about 22–28 sessions with every answer yes (6 pipeline stages, about 12 steps, code review, verification, release). Each default removes steps. -->

### Goal

critwire publishes what named open sources list about where each animal is native or introduced, next to today's countries with open records, which aren't range:
- **`/v1/range-listings.{json,csv,parquet}`** live: one row per claim a named source makes, the 11 columns of 007's contract, conflicts shown with both rows.
- **Sources, as the owner answered** (flip table below): GBIF checklist distributions by dataset allowlist; MDD's lists for mammals with O1 yes; a curated file for the 26 non-mammals with O3 (a).
- **Attribution and docs** credit every source used and state the IUCN ties the owner accepted.
- `species.*`, `countries.*`, all of `dist/learn/` and `range.countriesWithOpenRecords` stay byte-identical.
- It's live: the mission merges and deploys at its end.

### Why

Players and learners want to know where an animal naturally lives, not only where open records exist. The design mission measured all 76 species: every usable source speaks in countries, one new file needs no `/v2` and no Learn change, and a refresh costs about 7 minutes of fetching.

### Scope

In:
- `scripts/ingest/` (`gbif-checklists`; `mdd` only with a recorded O1 yes), `scripts/raw.ts` (the guard), `scripts/derive/` (listings, `MDD_PLACES` only with a recorded O1 yes, `checklistKeys`, conflicts), `scripts/build/` (`range-listings.ts`, `sources.ts`, `attribution.ts`, `contract.ts`), `contracts/v1.json`.
- `data/raw/gbif-checklists/`, `data/raw/mdd/`, `data/range-listings.json`, `data/review/range-conflicts.json`, `data/review/range-curated.json` (each with its condition below).
- `site/index.html` (the docs page), `DATA-LICENSE.md`, `AGENTS.md`, `e2e/`, `plans/007-native-ranges.md` (fixes where code proves it wrong).

Out:
- Learn: no page, block, projection or copy-rule change (O4, O5 belong to a later mission). `dist/learn/` doesn't move.
- Polygons and the reserved name `ranges.parquet`; per-species listing files; an overrides file for listings.
- Finding 8's fix (captive records in `range.countriesWithOpenRecords`): 007, Follow-up.
- `data/review/mismatches.json` and the review queue; a new table in `db/schema.sql`.
- IUCN data, in any form; Wikipedia prose.
- The `critwire` database except through `deploy critwire`.

### The owner's answers

**Read H7–H11 in `/srv/critter-ai/handoff/critwire.md` first and copy each answer to the plan's Decisions.** Defaults, for any question unanswered when the build starts: no MDD, no GRIIS or other O2 dataset, O3 (b).

| Answer | What it flips in the build | Rows, spike |
|---|---|---|
| O1 yes (H7) | Adds `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note | + 400, all 50 mammals |
| O2 yes (H8) | Adds GRIIS and the other O2 dataset to the allowlist, with their ties stated | + 22: GRIIS 15 on 9 species, Central Asia 7 |
| O3 (a) (H9) | Adds `data/review/range-curated.json` and `native` rows for the 26 | By hand: at least one row on each of the 26 |
| O4, O5 (H10, H11) | Nothing in this build: they belong to the Learn mission | None |

An answer that arrives mid-mission is picked up at the next session; add its steps before the final Verification.

**MDD gate, from 007:** "Nothing of MDD enters `data/`, `scripts/` or `dist/` until O1 is a recorded yes (the handoff reply, copied to the build plan's Decisions)." Every MDD step here is conditional on a recorded O1 yes. Without one, the build has no MDD ingest, no `MDD_PLACES` and no MDD rows. The contract still freezes `native-or-pre-1500`, so a later yes adds rows, not a definition edit.

### Definition of done

- `pnpm typecheck`, `pnpm test` and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped, including:
  - **A new `e2e/range-listings.spec.ts`,** like `e2e/countries.spec.ts`, expectations read from `data/range-listings.json`: the three files download with the built bytes; the rows match in every format; column names and order match the contract; `NA` (Namibia) stays text; rows are sorted and unique on 007's key; every `species_id` and `country` joins `/v1/species` and `/v1/countries`; every `source_key` is credited in `attribution.json`; no `/iucn/i` string or `threatStatus` in the three files; 007's conflict and agreement queries run on the served Parquet.
  - **`e2e/duckdb.spec.ts:59`** lists the three new files.
  - **`e2e/attribution.spec.ts:32`** covers the new sources and `gbifChecklists`.
  - **`e2e/docs.spec.ts`** covers the docs page's new section: the three files, every column described, the conflict query, and the sentence that no row means no open listing, never that the animal isn't there.
- **Byte-identical**, against this mission's own Baseline `sha256sum` list: only `v1/range-listings.*` are new, only `index.html` and `v1/attribution.json` differ, every other file, including all of `dist/learn/` and `v1/species*`, is the same.
- **Contract:** 007's fence copied into `contracts/v1.json` in the commit that adds the writer, each `sha` as `entrySha` gives it; the build checks the third table and CSV list.
- **Refusals**, each proved by making it happen once: every line under "The plain build refuses" below.
- **Docs:** `site/index.html` describes the file, words rows as what a named source lists, and keeps its "not native range" text for `range.countriesWithOpenRecords`, with one sentence pointing to the new file. `DATA-LICENSE.md` and `attribution.json`'s `notes` state each accepted IUCN tie plainly. `AGENTS.md` gains the commands, files and owners, with the same voice as its Data section.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/<this mission>/e2e/`: Playwright report, traces, `results.json`, a screenshot of the docs section at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: `/v1/range-listings.{json,csv,parquet}` return 200 with the built bytes; `/v1/attribution.json` credits every `source_key`; `/v1/species.json`, `/v1/countries.json` and `/learn/data/manifest.json` hash as in the Baseline list; `e2e/release/live.spec.ts` passes.
- The plan's Summary gives: what shipped, rows and species per source, conflicts found, which answers applied, every deviation from 007, the release record, and the handoff items left.

### Decision rules

- **007 is the design.** Build what it says; where code proves it wrong, fix it and update 007 in the same commit, with the reason under Decisions.
- **Licenses decide.** The ingest refuses anything but `CC0 1.0` and `CC BY 4.0`. A dataset whose license changed loses its role, with a Decisions line.
- **Rows pass by dataset allowlist, never by field value.** A dataset met later has no role until a person gives it one: its rows yield nothing and are counted. A new role is a handoff item, not an agent's call.
- **One authority per claim.** Native lists are never merged. Disagreements are shown, never fixed: both rows ship, and `data/review/range-conflicts.json` gets the entry.
- **Each row claims only what its source says.** `introduced` doesn't say it lives wild there; `absent` doesn't say it once lived there; no row doesn't say it isn't there.
- **Curated rows wait for the owner's review; the mission doesn't.** With O3 (a), `range-curated.json` is `{"reviewedBy": null, "rows": […]}`, agents' entries, each row citing its reference in our own words, and never reading an IUCN page. Derive publishes its rows only once `reviewedBy` holds the owner's reply and date, and prints how many it held back. Add a handoff item for the review and carry on. If it's unanswered at the release, release without those rows; after the reply, one commit sets `reviewedBy`, re-derives and deploys.
- **Frozen means frozen.** After the writer's commit, a contract definition edit needs the owner's review (`AGENTS.md`, Data).
- **Tests:** E2E first. A mapping or refusal tested in isolation lists its ways to fail first, then the code.
- **Simplest approach that works.** Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

### The plain build refuses

From 007, Pipeline; `--draft` lifts none of these:
- a stale `data/range-listings.json` ("run pnpm derive");
- a snapshot not covering the base names ("run pnpm ingest …");
- a checklists snapshot whose `keys` differ from a species' current keys, or whose `allowlist` differs from the constant ("data/raw/gbif-checklists is stale (Emydoidea blandingii: keys): run pnpm ingest gbif-checklists");
- an MDD pin or citation mismatch;
- a license other than the two, or, in a snapshot, an IUCN string or `threatStatus` key;
- a value or combination off 007's mapping, naming the row;
- an unmapped place or a country with no row;
- a contract break.

### Notes

- **The guard (Finding 3).** `assertNoIucnData` (`scripts/raw.ts:95`) gains `threatStatus`. It misses that key today, and GBIF rows on other datasets carry it (144 in the spike). No file in `data/` holds that key today, so the addition breaks nothing. Rows and metadata are written through a key allowlist, as `fetch.py` does, which also keeps `appendixCites` out. The guard covers snapshots only, so `attribution.json` and `DATA-LICENSE.md` may name IUCN to state a tie.
- **No reason in the snapshot.** The ingest's constant holds dataset → role, `area` and reason, with O2's datasets only after a yes. The snapshot's `allowlist` holds dataset → role and `area` only, because the guard walks the snapshot and a reason may name the tie.
- **Key staleness.** `checklistKeys(g)` in `scripts/derive/gbif.ts` gives a species' keys from `deriveGbif`'s result (unique non-null `g.id`, `g.taxonKey`). The ingest fetches and records them; `deriveCore`, right after `deriveGbif`, compares them. Today: 73 species with a key, 4 of them with two.
- **Derive's place.** In `deriveCore` before `matchCountries` (`scripts/derive/pipeline.ts:119`), which also gets the listing codes. It prints collapse and exclusion counts and the agreement totals.
- **Cost of a species change:** these ingests join its existing ≈ 1 h. No `learn:check`, DOI, habitat or sample work for a listings refresh alone.
- **Starting points, kept on this VPS** in `/srv/critter-ai/agent-state/missions/critwire-native-ranges-design/spike/`: `allowlist.json` (88 datasets, 18 with a role, each with its reason; 007, Allowlist), `mdd-places.json` (243 places by hand; place names and codes only, no species), `fetch.py`, `measure.py` (patterns; the repo's ingests are TypeScript). Re-derive nothing they already decided; re-check licenses at the fetch.
- **Expected numbers, 2026-11-01:** O1 and O2 yes, 432 rows on 57 species, 155,392 B of JSON before O3; all defaults, 10 rows on 5. GBIF's rows are live, so a fresh fetch moves these a little. A new combination refuses at derive: map it per 007, or "no row, counted".
- **Facts the spike proved:** MDD pinned at `https://zenodo.org/api/records/21654811/files/MDD_v2.5_6904species.csv/content`, md5 `533e662fd5b8f66a5f56c191e7efac44`; 50 of 50 mammals by exact name; 92 of its places in use, none unmapped. Never read MDD's `iucnStatus` or `extinct` columns. `GET /v1/species/{key}/distributions` sits on the legacy backbone: if GBIF retires it, the ingest fails loudly and the committed snapshot stands.
- **Conflict gate:** only 9 introduced mammal rows existed to test, too few to judge. Report the real count in the Summary.
- **Re-read when starting:** the archived license quotes in 007, Sources.
- **Pointers into 007:** Sources, Allowlist, Data model (mapping, conflict rule), Contract (the fence), Pipeline, Owner's choices, Follow-up.

### Addendum (control room, 2026-11-01): the owner's answers

This addendum is part of the brief. Where it differs from the text above, it wins.

**Answers to 007's Owner's choices (handoff H7–H11, all `done`):** O1 = yes (MDD). O2 = yes (GRIIS and the other kept datasets). O3 = (a) (the curated file). O4 and O5 belong to the Learn mission that follows this one, `critwire-learn-range-lessons`; this mission leaves `dist/learn/` alone, as the brief says.

**The curated rows don't wait for review.** H9 says the owner reviews `data/review/range-curated.json`, but a mission can't stop for that, and the owner wants as little waiting as possible. Publish the rows, each citing its reference and labelled as curated by its source column. At the end, add one handoff item (`Blocks: nothing`) listing where to read the file and how to correct a row. Never read IUCN pages for these rows.

**Don't touch held work.** critwire PR #17 (the owner's accepted confirmations) is held by the owner. Don't merge or edit it, and don't change `data/review/country-overrides.json`.

**Disk:** about 9 GB is free. Keep to the session rule of two E2E artifact folders. Delete any downloads you've hashed and no longer need.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-01 on `4074546` (`origin/main` `29508c3` + mission start), db `critwire_dev` (`.env`). Script and logs: `/srv/critter-ai/agent-state/missions/critwire-native-ranges-build/` (`baseline.sh`, `baseline-*.log`, `baseline-summary.txt`).
- `pnpm install --frozen-lockfile`: up to date. `pnpm learn:venv`: ok. No migrations (build rebuilds `db/schema.sql` tables each run). No lint script; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 754/754 pass (3.1 min).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,558 B, committed lab data 18,822,906 B (cap 120,000,000 each).
- `pnpm e2e`: 149/149 pass (11.1 min); artifacts `.../critwire-native-ranges-build/e2e-baseline/` (828 MB). Reproduce: `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- `dist/` hashes: 311 files, list `.../critwire-native-ranges-build/dist-baseline.sha256` (list's sha256 `349935ae916c4308…`, same as the design mission's); unchanged after E2E; live `/srv/apps/critwire/.live` identical (`cmp` clean). **This list is the byte-identical reference for Verification and the release smoke.**
- Not run: `pnpm test:db` (24 min), `pnpm learn:check` (9 min): brief's Baseline doesn't name them; plain build already refuses a lab not proven as committed.
- Working tree clean after. Handoff: H3, H6 waiting on owner, neither blocks this mission.

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Code review (Astra)

## Release

## Decisions

- 2026-11-01: owner's answers, from handoff H7–H11 (`Status: done`, control room), picked up and closed:
  - **O1 = yes** (H7). MDD gate open: `ingest mdd`, `MDD_PLACES`, `native-or-pre-1500` rows, `range-not-found`, MDD's attribution and ancestry note.
  - **O2 = yes** (H8). GRIIS and the other O2 dataset (Central Asia checklist) on the allowlist, ties stated.
  - **O3 = (a)** (H9). `data/review/range-curated.json`, agents' rows, each citing its reference, never reading IUCN pages. Brief's addendum wins over H9's "owner reviews" and the Decision rule's `reviewedBy` gate: rows publish without waiting, labelled curated by source column; one final handoff item (`Blocks: nothing`) says where to read the file and how to correct a row.
  - **O4 = yes**, only when a page first reads the listings file, in that change (H10). **O5 = s1, f3, e4** as one small mission after the build goes live; d1/d2 only if it fits; g3, c1 deferred (H11). Neither changes this build: `critwire-learn-range-lessons`.
- Held work (addendum): PR #17 stays held; `data/review/country-overrides.json` isn't touched.

## Log

- 2026-11-01 20:45 UTC: Baseline on `4074546`: typecheck pass, test 754/754, plain build pass, e2e 149/149, 311 `dist/` hashes = live. H7–H11 picked up, closed, copied to Decisions.

## Summary
