---
mission: critwire-ingest
project: critwire
branch: agent/critwire-ingest
status: active
started: 2026-10-20 05:35 UTC
---

# Mission: critwire step 2, ingest ids, taxonomy and countries

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Saved as /srv/critter-ai/agent-state/missions/briefs/2026-10-20-critwire-ingest.md
     Start: mission start critwire <this file>   (base: main at a57313f or later)
     Reviewed by fable-reviewer 2026-10-20; its API findings (live, from the VPS) are folded in below. -->

### Goal

Every one of the 76 animals in `data/species.json` gets its outside ids, its Catalogue of Life (COL) taxonomy and the countries it has wild records in, each with a cited source. Anything the sources disagree on, or anything that needs a person's judgement, goes into a committed review file for the owner and is never fixed automatically. This is step 2 of `plans/001-mvp.md`, without realms.

Checkable outcomes:
- `pnpm ingest wikidata`, `pnpm ingest col` and `pnpm ingest gbif` fetch from the live APIs and commit their raw responses under `data/raw/<source>/`. A separate, offline derive step turns the raw files (plus `data/review/country-overrides.json`) into `data/species.json` and `data/review/mismatches.json`.
- For each species: `ids.wikidata`, `ids.gbif`, `ids.col` (and `ids.inaturalist`, `ids.ncbi` where Wikidata has a single value) are filled, or are `null` with an entry in `data/review/mismatches.json` saying why.
- `taxonomy` (class, order, family, genus) comes from COL's accepted name whenever the species' identity is settled. It keeps step 1's value, with a mismatch entry, only when identity isn't settled.
- A countries field lists the countries with filtered GBIF records (rules below). Its name and docs say "countries with records", never "native range".
- `sources[]` on each record names every third-party field it holds: the source, its license, the retrieval date and the query URL. The photo keeps its own license, as in step 1.
- `db/schema.sql` and `pnpm db:load` hold the new fields (a child table for countries is fine). `critwire_dev` loads cleanly twice.
- `plans/001-mvp.md` is updated: see Notes, "Plan edits".

### Why

Critter Connect's content build will copy these ids and this taxonomy from critwire. critwire is also a public, cited dataset for school nature apps. A wrong id or a zoo country would spread into both, so correctness and citations matter more than coverage. A blank with a reason beats a guess, but a rule that blanks out valid species is wrong too.

### Scope

In:
- `scripts/` (ingest and derive scripts, shared types), `data/` (raw snapshots, `species.json`, `review/`), `db/schema.sql`, `scripts/load.ts`, `package.json` scripts, the "Data" section of `AGENTS.md`, `plans/001-mvp.md`.
- Unit tests for the derive and filter logic (`node:test`), if they help.

Out:
- The Critter Connect repo (`/srv/critter-ai/critter-connect`): read-only. CC's IUCN ids may turn out to be wrong (see Notes). Report it; don't change CC.
- The `critwire` database (the live build). Use only `critwire_dev`, from `.env`.
- Realms, range polygons, traits, new species, photos (keep step 1's).
- `/v1` export, docs page, `dist/`, Caddy, `deploy critwire`: all step 3. Leave `pnpm build` as it is.
- Any IUCN API call or IUCN data beyond the id that's already stored.
- Wikidata P14607 ("GBIF taxon ID", the new COL XR key): too sparse to use.

### Definition of done

- `pnpm typecheck` and `pnpm build` pass. Any tests added pass.
- Determinism: running the derive step twice from the committed `data/raw/` gives a byte-identical `data/species.json` and `data/review/mismatches.json` (`git diff --exit-code data/`). Raw files have volatile fields stripped (GBIF `diagnostics.timeTaken` and timings; ChecklistBank `created`, `modified` and `modifiedBy`), keys and rows sorted, and one UTC `retrieved` date per source file. A re-ingest on the same day shouldn't churn `data/raw/` beyond real upstream changes.
- `pnpm db:load` runs clean twice against `critwire_dev`. Row counts: 76 species, plus whatever child tables the design adds.
- `data/review/mismatches.json` is sorted by species id, with one entry per issue: species id, field, each source's value, a kind (for example `identity`, `iucn-id`, `synonym-info`, `multi-value`, `country-borderline`, `country-captive-suspect`) and a short reason.
- `data/review/country-overrides.json` exists. It's empty in this mission, owned by the owner and applied by the derive step (see the Countries rule).
- Push the branch `agent/critwire-ingest` and open a PR to `main` with `gh`. Its body gives coverage counts per field, the mismatch count by kind, and the most important findings in plain words (including any CC IUCN ids that look wrong). No merge, no deploy.
- The plan's Summary repeats those counts, lists the countries rule as it was finally set, lists species with no countries left after filtering, and names the 5 species spot-checked against the source websites.
- Request logs and anything bulky go in `/srv/critter-ai/agent-state/missions/critwire-ingest/`, not the repo.

### Decision rules

- **Never auto-fix a disagreement.** If sources disagree on *which taxon* something is, leave that id `null` (keep step 1's `ids.iucn` and taxonomy) and write a mismatch entry. Information that doesn't block a value (for example "GBIF's old backbone calls this a synonym") is an *info* entry, and the value is still filled.
- **Wikidata (one SPARQL query, `ORDER BY` for stable output):**
  - Find each species' item by exact scientific name (P225) first, matching the step-1 `scientificName`.
  - A P627 (IUCN) lookup only counts when that item's P225 equals our `scientificName`. Several step-1 IUCN ids resolve to unrelated taxa (see Notes).
  - Where the item's P627 differs from our `ids.iucn`, that's an `iucn-id` mismatch, and `ids.iucn` stays as step 1 set it.
  - If a property has more than one value (for example two P3151 iNaturalist ids), the field is `null` with a `multi-value` entry.
  - Properties: P627 IUCN, P846 GBIF (legacy backbone key), P10585 COL id, P3151 iNaturalist, P685 NCBI.
- **COL via ChecklistBank:**
  - Resolve the current release with `GET /dataset/3LR` (today COL26.10, key 316595). Store its key, alias, version, DOI and `issued` date in the source record.
  - Match each name with `/dataset/{key}/match/nameusage?scientificName=…`. Accept `type` `exact`, or `variant` when the canonical names are equal.
  - Take the classification from `/dataset/{key}/taxon/{id}/classification`. `ids.col` is COL's stable id (for example `39LSJ`), which is also the COL XR key GBIF now uses, and is comparable to Wikidata's P10585. If the two differ, that's an `identity` mismatch.
- **GBIF id = the legacy numeric backbone key** (what Wikidata P846, `api.gbif.org/v1/species/match` and `occurrence/search?taxonKey=` use). GBIF moved its default taxonomy to COL XR in June 2026; record the backbone's checklistKey in `sources[]` and say in the plan that `ids.col` doubles as the COL XR key.
  - Accept a match when `matchType=EXACT`, `rank=SPECIES`, `canonicalName` equals our `scientificName`, and Wikidata's P846 is either `usageKey` or `acceptedUsageKey` (or absent). Store `usageKey`.
  - If `status=SYNONYM`, keep the value and write a `synonym-info` entry with the accepted name. The old backbone calls valid COL species synonyms, for example *Emydoidea blandingii* → *Emys blandingii*.
  - Never take taxonomy from GBIF. Its backbone gives turtles class Testudines and no order.
- **Countries from GBIF facets.** Query `occurrence/search` with `taxonKey=<speciesKey>`, which is the accepted key and covers synonyms, plus:
  - `facet=country`, `facetLimit=300`, `limit=0`
  - `occurrenceStatus=PRESENT`, `hasGeospatialIssue=false`, `hasCoordinate=true`
  - `basisOfRecord` passed as the allowed values, repeated: `HUMAN_OBSERVATION`, `OBSERVATION`, `MACHINE_OBSERVATION`, `PRESERVED_SPECIMEN`, `MATERIAL_SAMPLE`, `MATERIAL_CITATION`, `OCCURRENCE`. Negation (`!LIVING_SPECIMEN`) returns HTTP 400. `LIVING_SPECIMEN` (zoos, gardens) and `FOSSIL_SPECIMEN` are left out this way.

  Then:
  - Drop `ZZ`/unknown.
  - Apply a minimum-records rule that the architect sets, documents and justifies, against strays.
  - Apply `data/review/country-overrides.json` last.

  **No threshold can remove every zoo country.** Captive animals recorded as observations stay (for example the tiger in Germany, the axolotl in Great Britain). So flag suspicious ones as `country-captive-suspect` (a country far outside the rest, or mostly one sound or zoo archive) and borderline ones as `country-borderline`, for the owner to settle through the overrides file. Don't try to tell native from introduced.
- **Realms:** none in this step. Don't add an empty `realms` field anywhere.
- **Polite API use:** a User-Agent naming critwire and https://critwire.com, at most about 2 requests per second to GBIF and ChecklistBank, retries with backoff.
- **Licenses:**
  - Wikidata: CC0.
  - COL: CC BY 4.0, cited with the release DOI. ChecklistBank says "cc by" without a version; COL's site and GBIF's dataset record say 4.0.
  - GBIF counts: "GBIF.org occurrence search, accessed <date>, <query URL>". The API gives no DOI for aggregates; note this in the plan.
  - If a license is unclear, leave the field out and note it.
- The agent may decide file layout, schema details and script structure alone. Ask the owner (handoff item) only if something blocks the whole step.

### Notes

- From the VPS, all sources were reachable on 2026-10-20: query.wikidata.org, api.gbif.org, api.checklistbank.org.
- Live findings from the review (2026-10-20) that the mission should expect, not "fix":
  - **Step-1 IUCN ids that resolve in Wikidata to other taxa:**
    - 22971 (*Rafetus swinhoei*) gives a snail
    - 9010 (*Chelonoidis niger*) gives *Geochelone gigantea*
    - 3901 (*Astrochelys radiata*) gives *Carinurella paradoxa*

    Wikidata's own items for these carry 39621, 9023 and 9014. These are probably wrong ids in Critter Connect's data: an important finding for the owner.
  - **No P627 at all:** Platysternon, Heosemys, Malacochersus, Carettochelys, Centrochelys, *Chelonoidis abingdonii*, Andrias.
  - **Synonyms in GBIF's legacy backbone, accepted in COL:** *Emydoidea blandingii*, *Smutsia gigantea*.
  - **Two iNaturalist ids:** *Ailurus fulgens*, *Pongo abelii*.
  - **Blanding's turtle countries:** with all the filters including `hasCoordinate=true`, only US and CA remain, roughly 8,700 and 7,700 records.
  - **Tiger:** without `hasCoordinate`, Germany shows 291 records, mostly zoo sound recordings.
- Neither `duckdb` nor GDAL is installed, and this step needs no geometry. There are no birds among the 76.
- The project has `MISSION_DB=no`: the mission shares `critwire_dev` from the checkout's `.env` (Postgres 16, PostGIS 3.4.2). Never connect to `critwire`.
- Step 1's design and rules: `AGENTS.md` ("Data rules", "Data"), `scripts/seed-cc.ts`, `scripts/load.ts` and `scripts/species.ts`. `pnpm seed:cc` must still work and keep its ids. If it now has to preserve the new fields when re-run, make it do so.
- There's no end-to-end suite. Verification is typecheck, build, the determinism check, two `db:load` runs, and spot-checks of 5 species against the source websites.
- Expect around 10 plan steps, well under the 60-session cap.
- Plan edits for `plans/001-mvp.md`, the owner's decisions of 2026-10-20:
  - **Range (MVP):** "countries from GBIF occurrence facets (filtered; 'countries with records', not native range; owner overrides in `data/review/country-overrides.json`). Realms later: GBIF points ∩ RESOLVE Ecoregions 2017 realms (CC BY 4.0), built with the polygons." Natural Earth has no biogeographic realms.
  - **Crosswalk:** `ids.gbif` is the legacy GBIF backbone key, and `ids.col` is the stable COL id (also COL XR's key, GBIF's default since June 2026).
  - **Step 2:** delete "Natural Earth realms"; mark it done with this mission's PR.
  - **Later:** add realms to the range polygons bullet.
  - **Record:** `range` has no `realms` until then, not an empty array.
- The WSL planning session isn't changing `plans/001-mvp.md` in parallel. If `origin/main` moves, rebase before the PR.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-20, base `0b692e6` (main `a57313f`). Node 24.21.0, pnpm 11.10.0, Postgres 16.15, PostGIS 3.4.2 in `critwire_dev`.
- `pnpm install --frozen-lockfile`: up to date.
- `pnpm typecheck`: pass. `pnpm build`: pass (placeholder `dist/`).
- No lint script, no unit tests, no E2E suite in the repo (as the brief says).
- `pnpm db:load` twice against `critwire_dev`: `loaded 76 species` both times.
- `pnpm seed:cc /srv/critter-ai/critter-connect/db/content/animals` (CC `677eb61a`, 76 profiles): rewrote `data/species.json` with no diff (idempotent).

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-10-20 05:36 UTC: Baseline. typecheck, build, db:load x2, seed:cc idempotency all pass; no lint/tests/E2E exist.

## Summary
