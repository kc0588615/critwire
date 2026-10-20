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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

2026-10-20, base `0b692e6` (main `a57313f`). Node 24.21.0, pnpm 11.10.0, Postgres 16.15, PostGIS 3.4.2 in `critwire_dev`.
- `pnpm install --frozen-lockfile`: up to date.
- `pnpm typecheck`: pass. `pnpm build`: pass (placeholder `dist/`).
- No lint script, no unit tests, no E2E suite in the repo (as the brief says).
- `pnpm db:load` twice against `critwire_dev`: `loaded 76 species` both times.
- `pnpm seed:cc /srv/critter-ai/critter-connect/db/content/animals` (CC `677eb61a`, 76 profiles): rewrote `data/species.json` with no diff (idempotent).

## Architecture

Architect, 2026-10-20; revised the same day after both reviews. Parts changed in the revision are marked **[rev]**, and `## Revision notes` maps every review item to its fix.

Evidence:
- About 25 polite live calls for the first draft (GBIF, ChecklistBank, Wikidata), saved in `/srv/critter-ai/agent-state/missions/critwire-ingest/arch/`.
- **[rev]** About 230 for the revision: GBIF v2 match plus licensed and unlicensed country facets for all 76 species, at 1 request per second. Saved in `…/critwire-ingest/revision/`, and the simulation scripts are in `…/revision-tools/`.

### Findings (ranked)

1. **`pnpm seed:cc` would wipe step 2's data.** `scripts/seed-cc.ts:80-89` rebuilds each record from a fixed list of fields and sets `taxonomy: p.taxonomy`. A re-run after derive would drop `range` and `sources` and overwrite COL's taxonomy with CC's. Two writers share one file and neither owns it (SRP, separation of concerns). Fix: split inputs from outputs (§1). seed:cc writes only `data/base.json`, and `data/species.json` becomes derive's output.
2. **"Keep step 1's taxonomy" can't work if derive reads its own output.** After one derive, species.json holds COL's taxonomy and step 1's value is gone. A later unsettled identity would then keep a stale, uncited COL taxonomy, and the result depends on hidden earlier state. Same fix: derive reads `base.json` and never `species.json`, so its output is a pure function of committed inputs.
3. **seed:cc can mismatch records silently** (fail fast):
   - `seed-cc.ts:70-71` builds the `byIucn` and `byName` Maps without checking uniqueness, so the last record wins.
   - In `:77-89`, two profiles can match the same existing record and the second overwrites the first. Duplicates are only checked on the no-match path (`:79`).
   - Duplicate `scientificName` is never checked (only slugs, `:93-97`), yet step 2 keys all raw data by name.

   Fix: a shared `validateBase()` that requires unique `id`, `slug`, `scientificName` and non-null `ids.iucn`. seed:cc runs it before writing, and ingest and derive run it on read. seed:cc also throws when a second profile matches a record that was already matched.
4. **IUCN data would leak into `data/raw/gbif`.** `/v2/species/match` returns `additionalStatus` with the Red List category (verified: tiger gives `"status":"ENDANGERED","statusCode":"EN"`). That breaks the data rule. Fix: strip it at ingest and guard against it (§3).
5. **One type covers both input and output.** In `scripts/species.ts:4-20`, `Species` is both the seed record and the published record. Fix: add `BaseSpecies`, `Source`, `Mismatch` and `CountryOverride`, and add `range` and `sources` to `Species`.
6. **The schema and loader lack step 2's fields.** `db/schema.sql:4-24` already has the id columns but nothing for countries or sources. Fix: §6.
7. **Fine as is:** `load.ts` (one transaction and a full rebuild; DB constraints are its validation), `build.ts` (out of scope), and seed's id and slug assignment.

Live data that differs from the brief's Notes (expected, not a defect):
- Platysternon's name item Q754035 does carry P627 17585, which differs from the base value 9605. The generic `iucn-id` rule covers it.
- Blanding's filtered counts today are CA 7,304 and US 4,086 (the brief said about 8,700 and 7,700). This is upstream drift with no design impact. **[rev]** Counting only CC0 and CC BY 4.0 records (§5.4), they are US 745 and CA 564.
- **[rev]** 25% of the brief-filtered records across the 76 species (130,844 of 528,044) are CC BY-NC 4.0. The axolotl's 81 GB records, the brief's example, are all CC BY-NC.
- **[rev]** In some species, a zoo or collection country holds the most records: Asian elephant US 4,461 of 6,877 counted records, red panda US 23 of 62, black rhino US 245 of 718, dama gazelle ES 390 of 404.
- **[rev]** No Wikidata P846 or P10585 has several values today. Only P3151 does, for *Ailurus fulgens* and *Pongo abelii*.

### Target design

#### §1 Files and who owns them

| File | Writer | Content |
|---|---|---|
| `data/base.json` | `pnpm seed:cc` (or a person) | Our registry: `id, slug, scientificName, commonName, taxonomy` (step 1, from CC), `ids: {iucn}`, `photo, replacedBy`. Sorted by id. |
| `data/raw/{wikidata,col,gbif}/snapshot.json` | `pnpm ingest <source>` | Normalized responses, one `retrieved` date per file (§3) |
| `data/review/country-overrides.json` | owner | `[]` in this mission (§5.5) |
| `data/species.json` | `pnpm derive` only | Published records (§4) |
| `data/review/mismatches.json` | `pnpm derive` only | Review entries (§5.6) |

```
base.json ──► ingest wikidata|col|gbif ──► data/raw/<source>/snapshot.json ─┐
base.json + raw + country-overrides.json ──► derive (pure, offline) ──► species.json + mismatches.json
species.json ──► db:load ──► critwire_dev
```

- Derive never reads `species.json`, the clock or the network.
- Ingest reads only `base.json`.
- After seed:cc, run derive. If a name or IUCN id changed, derive refuses stale raw data and names the ingest to re-run (§5).

**Migration [rev].** Derive needs the raw snapshots, and ingest needs `base.json`, so the switch can't happen in a single rename. It takes three commits, and each one keeps `pnpm typecheck` and `pnpm db:load` green:

1. **With the ingest code:**
   - Create `data/base.json` as a copy of `data/species.json`, with the five null derive-owned ids mechanically dropped, and point seed:cc at it.
   - `data/species.json`, the `Species` type, `load.ts` and the schema stay exactly as step 1 left them, so db:load still loads step 1's records.
   - Don't re-seed: CC may have moved since step 1. Confirm that `pnpm seed:cc /srv/critter-ai/critter-connect/db/content/animals` reproduces `base.json` with no diff, and report any diff instead of merging it.
2. **The three raw snapshots.**
3. **One switch commit:** the `Species` type change, `db/schema.sql`, `load.ts`, derive, `data/review/country-overrides.json` (`[]`), and the first derived `species.json` and `mismatches.json`.

#### §2 Modules

No new dependencies (global `fetch`, `node:test`).

```
scripts/species.ts         types (BaseSpecies, Species, Source, Mismatch, CountryOverride), file URLs, validateBase()
scripts/json.ts            readJson; writeJson(url, value, {canonical}) → 2-space + "\n", atomic tmp+rename; canonical = keys sorted recursively
scripts/http.ts            getJson(url, init?): the only network entry point (§3)
scripts/raw.ts             snapshot types per source; readSnapshot/writeSnapshot(source); utcDate(); assertNoIucnData(); assertOpenLicenses() [rev]
scripts/ingest.ts          CLI: pnpm ingest <wikidata|col|gbif> → fetch → writeSnapshot (usage error on anything else)
scripts/ingest/{wikidata,col,gbif}.ts   fetch + normalize, return the snapshot; no fs. wikidata.ts also exports pure wikidataQuery(base)
scripts/derive.ts          CLI: read and validate the inputs, run the rules per species, sort, write both outputs, print coverage and kind counts
scripts/derive/{wikidata,col,gbif,countries}.ts   pure rules: no fs, network or clock
scripts/derive/*.test.ts   node:test (§7)
```

`package.json` gets `"ingest": "tsx scripts/ingest.ts"`, `"derive": "tsx scripts/derive.ts"` and `"test": "tsx --test scripts/derive/*.test.ts"`.

Query URLs are built only in `ingest/*` and stored in raw. Derive copies them into `sources[].url` and never rebuilds them. CQS: fetchers return data, writers write, rule functions return `{value, entries}`.

#### §3 HTTP client and raw snapshots

- **User-Agent:** `critwire-ingest/1.0 (+https://critwire.com; https://github.com/kc0588615/critwire)`. It carries no email.
- **Pacing:** requests are sequential, at least 500 ms apart between starts (2 req/s or less).
- **Timeouts:** 30 s per request, 90 s for SPARQL.
- **Retries:** on a network error, timeout, 429 or 5xx, up to 5 attempts with backoff of 1, 2, 4 and 8 s. A `Retry-After` header is honoured, capped at 60 s. Any other status, or a body that isn't JSON, throws immediately with the method, URL, status and the first 300 characters of the body.
- **Log:** one stderr line per attempt (`ISO time, status, ms, attempt, method, URL`). The code holds no log path. The mission runs `pnpm ingest <s> 2>> /srv/critter-ai/agent-state/missions/critwire-ingest/ingest-<s>.log`.
- **All or nothing:** the snapshot is built in memory and written once (temp file, then rename) only after every request succeeds. On failure the old file stays.
- **Normalization:**
  - Keys are sorted recursively. `retrieved` is the UTC `YYYY-MM-DD` at the start of the run.
  - Rows are keyed or sorted as listed below. Arrays with meaning are never re-sorted (COL classification order).
  - `assertNoIucnData` runs on the GBIF and COL snapshots. It throws on any `additionalStatus` key or any string containing `IUCN`, case-insensitive.

| Snapshot | Requests | Shape (keys sorted) |
|---|---|---|
| `wikidata` | 1 POST to `https://query.wikidata.org/sparql` | `{retrieved, endpoint, query, response: {head, results: {bindings}}}`. Bindings are sorted by their values in `head.vars` order. |
| `col` | `GET /dataset/3LR`, then 76 × `GET /dataset/{key}/match/nameusage?scientificName=…` | `{retrieved, release: {key, alias, title, version, issued, doi, license, url}, matches: {<scientificName>: {url, response}}}`. The release is allowlisted: the full record is 113 KB, 103 KB of it `creator`. ChecklistBank's `created`, `modified` and `modifiedBy` are therefore never stored. |
| `gbif` | `GET /v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, `GET /v1/enumeration/country`, then 76 × v2 match, then 1 occurrence facet query per species-rank match | `{retrieved, checklist: {key, title, doi, license, pubDate}, countries: {<iso2>: {gbifRegion, title}}, species: {<scientificName>: {match: {url, response}, occurrences: {url, response} \| null}}}`. The match response drops `diagnostics.timeTaken`, `diagnostics.timings`, `additionalStatus` and **[rev]** the nested-set indexes `left` and `right`, which move on every backbone rebuild (verified present in v2). **[rev]** The occurrence response's `facets` are sorted by `field`, and each `counts` by `name`, because ties in count order aren't stable. Ingest throws if any facet's `counts.length ≥ facetLimit`, and runs `assertOpenLicenses`. |

Query details:

- **Wikidata [rev].** This is the exact template. VALUES lists base records in id order. `wikidataQuery(base)` throws on an `ids.iucn` that is null or not a positive integer: with `?iucn` unbound, the second UNION branch would join every item that has a P627. `validateBase()` already rejects such a record, so this is a second, fail-fast guard. Tested live: 441 rows, and all 76 names give exactly one item.
  ```sparql
  SELECT DISTINCT ?name ?item ?prop ?value ?iucnItem ?iucnItemName WHERE {
    VALUES (?name ?iucn) { ("Emydoidea blandingii" "7709") … }
    { ?item wdt:P225 ?name .
      OPTIONAL { VALUES (?prop ?p) { ("P627" wdt:P627) ("P846" wdt:P846) ("P10585" wdt:P10585) ("P3151" wdt:P3151) ("P685" wdt:P685) }
                 ?item ?p ?value . } }
    UNION
    { ?iucnItem wdt:P627 ?iucn . OPTIONAL { ?iucnItem wdt:P225 ?iucnItemName . } }
  } ORDER BY ?name ?item ?prop ?value ?iucnItem ?iucnItemName
  ```
- **GBIF match:** `https://api.gbif.org/v2/species/match?checklistKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c&scientificName=…`. This pins the legacy backbone; v1 match can't be pinned. The occurrence facets are only fetched when `usage.rank == "SPECIES"` (all 76 today).
- **GBIF occurrences [rev]:** `https://api.gbif.org/v1/occurrence/search?checklistKey=d7dddbf4-…&taxonKey=<acceptedUsage.key ?? usage.key>&facet=country&facet=license&facetLimit=300&limit=0&occurrenceStatus=PRESENT&hasGeospatialIssue=false&hasCoordinate=true&license=CC0_1_0&license=CC_BY_4_0&basisOfRecord=HUMAN_OBSERVATION&…`.
  - The 7 allowed `basisOfRecord` values follow, repeated, in the brief's order. The parameters always appear in this fixed order.
  - The `checklistKey` pin is real: a bogus key returns 400.
  - The default taxonomy still resolves numeric backbone keys: `taxonKey=39LSJ` returns 0 records.
  - **[rev]** The `license` filter was verified live:
    - A bogus value returns 400.
    - One request returns both facets.
    - With the filter, the LICENSE facet holds only `CC0_1_0` and `CC_BY_4_0` (Blanding's: 944 and 365, summing to `count` 1,309).
    - GBIF's license enumeration is `CC0_1_0, CC_BY_4_0, CC_BY_NC_4_0, UNSPECIFIED, UNSUPPORTED`.
  - **[rev]** `assertOpenLicenses(response)` throws unless every LICENSE facet name is in `{CC0_1_0, CC_BY_4_0}` and their counts sum to `count`. Ingest and derive both call it.
  - `gbifTaxonKey(match)` is shared by ingest and derive.

#### §4 Record in `data/species.json`

The key order is fixed. `range` has no `realms`, and there is no `traits` key.

```json
{
  "id": 1, "slug": "blandings-turtle", "scientificName": "Emydoidea blandingii", "commonName": "Blanding's Turtle",
  "taxonomy": { "class": "Reptilia", "order": "Testudines", "family": "Emydidae", "genus": "Emydoidea" },
  "ids": { "iucn": 7709, "gbif": 2442885, "col": "39LSJ", "wikidata": "Q185526", "inaturalist": 39885, "ncbi": null },
  "range": { "countriesWithRecords": ["CA", "US"] },
  "photo": { "url": "…", "credit": "Andrew C", "license": "CC BY 2.0", "page": "…" },
  "sources": [
    { "source": "Catalogue of Life", "fields": ["ids.col", "taxonomy"], "license": "CC BY 4.0", "retrieved": "2026-10-20",
      "url": "https://api.checklistbank.org/dataset/316595/match/nameusage?scientificName=Emydoidea%20blandingii",
      "doi": "10.48580/dgzh4", "release": { "key": 316595, "alias": "COL26.10", "version": "2026-10-14", "issued": "2026-10-14" } },
    { "source": "GBIF Backbone Taxonomy", "fields": ["ids.gbif"], "license": "CC BY 4.0", "retrieved": "2026-10-20",
      "url": "https://api.gbif.org/v2/species/match?checklistKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c&scientificName=Emydoidea%20blandingii",
      "doi": "10.15468/39omei", "checklistKey": "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c" },
    { "source": "GBIF.org occurrence search", "fields": ["range.countriesWithRecords"], "license": "CC BY 4.0", "retrieved": "2026-10-20",
      "url": "https://api.gbif.org/v1/occurrence/search?checklistKey=d7dddbf4-…&taxonKey=5220530&facet=country&facet=license&…&license=CC0_1_0&license=CC_BY_4_0&…" },
    { "source": "Wikidata", "fields": ["ids.wikidata", "ids.inaturalist"], "license": "CC0 1.0", "retrieved": "2026-10-20",
      "url": "https://www.wikidata.org/wiki/Special:EntityData/Q185526.json" },
    { "source": "critwire base", "fields": ["ids.iucn"], "license": "CC BY 4.0",
      "url": "https://github.com/kc0588615/critwire/blob/main/data/base.json" }
  ],
  "replacedBy": null
}
```

**Countries:** `countriesWithRecords` holds ISO alpha-2 codes, sorted. It is `null` when the GBIF taxon isn't settled and `[]` when it's settled but no country remains. It holds no counts, so a re-ingest doesn't churn the published file; the counts live in raw and in review entries.

**Sources:**
- One entry per source that filled at least one field. Entries are sorted by `source` (code units), and `fields` keeps the fixed order `ids.*`, `taxonomy`, `range.*`.
- **[rev]** Every published `ids.*` value, the `taxonomy`, and a non-null `range.countriesWithRecords` appear in exactly one entry's `fields`. Derive asserts this before it writes. The photo keeps its own license.
- **[rev] `critwire base`** lists `ids.iucn` on every record, plus `taxonomy` whenever the step-1 value is kept (Astra MUST-FIX 2).
  - These values came from Critter Connect's profiles (the owner's project) through seed:cc. The profiles record no upstream source for them, so they are critwire's own registry data under `DATA-LICENSE.md` (CC BY 4.0).
  - The entry has no `retrieved` date, because nothing was fetched.
- **Licenses:**
  - Wikidata: the constant `CC0 1.0`.
  - COL: ChecklistBank's `"cc by"` maps to `CC BY 4.0`, as the brief says.
  - GBIF backbone: the `…/by/4.0/legalcode` URL maps to `CC BY 4.0`.
  - **[rev]** GBIF occurrence search: `CC BY 4.0` (see below).
  - Any other license string throws.
- **[rev] Licensing basis for countries** (Astra MUST-FIX 2):
  - The query counts only records that GBIF labels CC0 1.0 or CC BY 4.0, and `assertOpenLicenses` proves it from the same response. So the country list is derived only from CC0 and CC BY data, and critwire publishes it under CC BY 4.0, like its other derived data.
  - CC BY-NC records are never counted, stored in raw, or published.
  - **Attribution** follows the brief: "GBIF.org occurrence search, accessed `<retrieved>`, `<url>`". CC BY 4.0 lets attribution be given in a reasonable manner, including a link to a resource with the details. The query URL is that link: it reproduces the counts, and with `facet=datasetKey` added it lists every contributing dataset.
  - The API gives no DOI for aggregates. GBIF's derived-dataset registration would give one, but it needs a GBIF account and the published export, so it's a step-3 item (Notes for `plans/001-mvp.md`, below).
- **[rev]** Wikidata's `url` is the per-entity JSON (`Special:EntityData/Q….json`), which is per-species and machine-checkable. The exact batch SPARQL is kept in raw.

#### §5 Derive rules

Rules run per base species in id order, using the name `N`.

**Staleness checks:**
- Derive throws `data/raw/wikidata is stale: run pnpm ingest wikidata` unless `raw.query === wikidataQuery(base)`. That one check catches a changed base and a changed query.
- For COL and GBIF, the set of names in raw must equal the set of base names, or derive throws.

**§5.1 Wikidata** (P225 truthy, exact) **[rev]**

- `items(N)` are the distinct `?item` values for `N`.
- `values(N, P)` are the distinct values of property P over **all** of `items(N)`. With one item, that's the item's own values. With several, pooling them means an ambiguous item can't hide a conflicting P846, P10585 or P627 (Astra SHOULD-CONSIDER 2).
- **0 items:** `ids.wikidata`, `ids.inaturalist` and `ids.ncbi` are null, with one `not-found` blocking entry on `ids.wikidata` that explains all three. The COL and GBIF cross-checks then have no Wikidata evidence, and that entry records it.
- **More than 1 item:** the same three are null, with one `multi-value` blocking entry on `ids.wikidata`. P627, P846 and P10585 are still checked, using the pooled values.
- **Exactly 1 item:** `ids.wikidata = "Q…"`.
- **Cardinality first** (Astra MUST-FIX 3). Before any value is used or compared, a property with more than one distinct value nulls the field it serves and writes a `multi-value` blocking entry:

  | Property | Field nulled |
  |---|---|
  | P3151 | `ids.inaturalist` |
  | P685 | `ids.ncbi` |
  | P846 | `ids.gbif`, and therefore the countries |
  | P10585 | `ids.col`, and the taxonomy stays the base one |
  | P627 | none: the entry goes on `ids.iucn`, which keeps the base value as always |

  This covers P846 holding both the GBIF usage key and the accepted key: the brief says a multi-valued property gives null. Only Ailurus and Pongo (P3151) hit this rule today.
- **P3151 and P685 with one value:** a positive integer. A value that isn't an integer throws. With no value: null, with a `not-found` **info** entry.
- **P627.** `ids.iucn` always keeps the base value. An `iucn-id` blocking entry is written in either case below. Items found only through the base IUCN id are never used for any id; they only appear in the reason.
  - P627 has exactly one value, and it isn't the base id.
  - Or the base id is the P627 of an item whose P225 isn't `N`. This is checked whatever P627's cardinality. Live cases: Rafetus swinhoei with 22971 gives *Vidumelon wattii*, Chelonoidis niger with 9010 gives *Geochelone gigantea*, and Astrochelys radiata with 3901 gives *Carinurella paradoxa*.
- **P10585 and P846 with one value** are used only as the cross-checks in §5.2 and §5.3.

**§5.2 COL**

The match is accepted only if all of the following hold:
- `match == true`;
- `type ∈ {exact, variant}` and `usage.name == N`;
- `usage.rank == "species"`, and **[rev]** `usage.status` is `accepted` or `provisionally accepted`;
- the classification includes kingdom `Animalia`.

**[rev]** `provisionally accepted` is still COL's accepted usage of `N`: nothing disputes which taxon it is. It adds a `status-info` (info) entry carrying `values.col.status` (Fable SHOULD-CONSIDER 2).

Otherwise `ids.col` is null and the taxonomy stays the base one, with an entry:
- COL calls `N` a synonym: `identity`, naming COL's accepted name.
- Anything else: `not-found`.

Cross-checks on an accepted match:
- **[rev]** If P10585 has several values, §5.1 has already nulled `ids.col`. One P10585 value that differs from `usage.id` gives `identity`: `ids.col` is null and the taxonomy stays the base one.
- COL's genus must equal `N`'s first word. If not, `identity`.

Whenever `ids.col` is null, the taxonomy is the base one, and the `ids.col` entry explains both.

When settled:
- `ids.col = usage.id`.
- The taxonomy is the class, order, family and genus taken from `usage.classification`. That's the match response's own embedded classification, verified identical to `/taxon/{id}/classification` for 39LSJ, which saves 76 requests.
- If a rank is missing: `ids.col` stays filled, the taxonomy stays the base one, and a `not-found` blocking entry is written on `taxonomy`.
- Each rank that differs from base gets a `taxonomy-info` (info) entry, and COL's value is used.

**§5.3 GBIF** (from the v2 response)

`usageKey = int(usage.key)` and `acceptedKey = int(acceptedUsage.key)` when present. A key that isn't an integer throws.

The match is accepted only if all of the following hold:
- `diagnostics.matchType == "EXACT"`;
- `usage.rank == "SPECIES"` and `usage.canonicalName == N`;
- the classification includes KINGDOM `Animalia`.

Otherwise `ids.gbif` is null, with a `not-found` blocking entry.

Cross-check and status:
- **P846 [rev]:** if it has several values, §5.1 has already nulled `ids.gbif`. One value must be `usageKey` or `acceptedKey`, and no value at all is fine. Otherwise it's an `identity` entry, and `ids.gbif` is null.
- **Status `ACCEPTED`:** nothing more.
- **Status containing `SYNONYM`:** the value is kept, with a `synonym-info` (info) entry giving the accepted name and key. **[rev]** The entry's reason also says that the countries are counted for that accepted key, which covers all of its synonyms (Astra SHOULD-CONSIDER 1). Live cases: *Emydoidea blandingii* 2442885 → *Emys blandingii* 5220530, and *Smutsia gigantea*.
- **Any other status:** `identity`, and `ids.gbif` is null.

`ids.gbif = usageKey` (as the brief says).

**Invariant:** countries are null whenever `ids.gbif` is null, and that field's entry explains both.

**Lump guard:** when GBIF's accepted name has a different epithet from `N` (a lump, not a genus move), `ids.gbif` is kept but the countries are null, with an `identity` blocking entry on `range.countriesWithRecords`. Otherwise another species' occurrences would be published. **[rev]** This is a heuristic: it catches the obvious lumps, but a matching epithet doesn't prove that the accepted taxon has the same scope. The `synonym-info` entry is what points a person at those cases.

**§5.4 Countries [rev: rewritten]**

**Input:** the COUNTRY facet of the settled taxon's licensed occurrence query (§3), with `ZZ` dropped. A code that's missing from the snapshot's country enumeration throws.

**Definitions:**
- `count(c)`: country c's record count. `T`: the sum of the counts.
- `region(c)`: GBIF's `gbifRegion` for c, with `NORTH_AMERICA` and `LATIN_AMERICA` merged into `AMERICAS` (Fable SHOULD-CONSIDER 1). GBIF's NORTH_AMERICA holds only CA, GL, PM and US, so without the merge, spiny softshell MX, black-footed ferret MX and jaguar US would all be flagged.
- `core`: the region with the most countries. A tie goes to the region with the most records, and regions still tied are all core. Every country votes, strays included.

**Rules.** Each country gets at most one entry:

| # | Condition | Result | Entry, severity |
|---|---|---|---|
| 1 | Stray: `region(c) ∉ core` and `count(c) == 1` | excluded | `country-captive-suspect`, `blocking` |
| 2 | Far from the rest: `region(c) ∉ core` and `count(c) ≥ 2` | kept | `country-captive-suspect`, `review` |
| 3 | Borderline: `region(c) ∈ core`, `T ≥ 50` and `count(c) ≤ 2` | kept | `country-borderline`, `review` |
| 4 | Anything else | kept | none |

Then the overrides apply (§5.5).
- If nothing is counted (`T == 0`), the result is `[]` with a `no-records` info entry: "no CC0 or CC BY 4.0 records match the filters".
- `core` is never empty and core countries are never excluded. So a species with counted records never ends up blank.

**This is the minimum-records rule** the brief asks for: a country outside the species' core region needs at least 2 counted records, and inside the core 1 is enough. A region difference alone never excludes anything. It is a review signal, and it is how the brief's "a country far outside the rest" is read.

**Constants and docs.** The constants (`STRAY_MAX = 1`, `BORDERLINE_MAX = 2`, `BORDERLINE_MIN_SPECIES_RECORDS = 50`, and the region merge) live at the top of `derive/countries.ts` with this justification, and in `AGENTS.md` "Data". The Summary repeats this rule as the final countries rule.

**Not implemented:** the brief's other captive signal, "mostly one sound or zoo archive". It needs a per-country `datasetKey` facet (about 500 requests) and a judgement about which datasets are zoo archives (see Rejected alternatives). The far-from-the-rest signal catches the brief's example, tiger DE.

**Evidence** (2026-10-20, all 76 species, the brief's filters plus the license filter):

| Species (counted records) | Outcome |
|---|---|
| Blanding's turtle (1,309) | US 745 and CA 564, no entries. |
| Saola (3), De Winton's golden mole (1) | VN 2 and LA 1; ZA 1. All kept with no entries, because `T < 50`. |
| Ili pika (0) | Its only record is CC BY-NC, so the result is `[]` plus `no-records`. |
| Tiger (3,251; core ASIA with 11 of 22 countries) | **Strays excluded:** CA, DK, KE, MW, NL and SE. **Kept, captive-suspect:** US 64, BR 14, RU 8 (native: GBIF puts RU in EUROPE), DE 6 (captive) and ZA 2. **Kept, borderline:** BD 2 and VN 1. |
| Asian elephant (6,877) | The top country is US with 4,461, but ASIA has 13 of 20 countries, so the core is ASIA. **Flagged:** US, DE, BE and DK. **Strays:** BR, CF and NL. Using the top country's region instead would have flagged all 13 range countries and left US unflagged. |
| Cheetah (5,269; core AFRICA) | **Kept, captive-suspect:** US 56, IR 32 (native), AU 11, NL 3 and DE 2. **Stray:** IQ 1. |
| Jaguar (138,459; core AMERICAS) | US 99 (Arizona) is unflagged. **Kept, borderline:** HN 1, SR 1 and UY 1. |
| Spiny softshell (4,174) | US, MX 496 and CA are unflagged. **Borderline:** AR 1. **Stray:** PT 1. |
| Black-footed ferret (132) | **Kept, borderline:** MX 2. |
| Axolotl (229) | MX 222. **Borderline:** CA 2. **Kept, captive-suspect:** DE 2 and NZ 2. **Stray:** UA 1. |
| Dama gazelle (404) | The top country is ES with 390 (captive breeding), but AFRICA has 5 of 8 countries. **Flagged:** ES and US. **Stray:** PA 1. |

Across all 76 species:
- **Published:** 482 countries for 75 species; Ili pika is blank.
- **Excluded:** 39 strays.
- **Flagged:** 54 kept captive-suspect and 97 kept borderline countries.

What follows from the evidence:
- **Nothing documented as valid is withheld.** The cases Astra and Fable named (tiger RU, cheetah IR, jaguar US, spiny softshell MX, ferret MX) are all published. RU and IR carry a review flag that the owner settles with `keep`.
- **Why the minimum applies only outside the core.** A global minimum of 2 would drop 62 single in-core records in species with `T ≥ 50`. Now that CC BY-NC records aren't counted, these are mostly real but thin native records, for example the aardvark's BF, GH, ML, NE, SL and TG and the jaguar's HN and SR. A single record outside the core was a captive or misplaced record in all 39 cases: zoo countries such as DE, NL and US, and singletons such as tiger KE and MW.
- **Why the core counts countries, not records.** Zoo and museum records pile up in a few countries, while a range spans many. Counting countries fixes the four inverted species (Asian elephant, red panda, black rhino, dama gazelle), and it lets the top country itself be flagged (Astra MUST-FIX 1).
- **Why borderline needs `T ≥ 50`.** Below 50 counted records, 52% of countries have 2 or fewer records (44 of 85, across 24 species), so a thin flag carries no signal there. Far-off countries are still flagged at any `T`.
- **Remaining false flags** (kept, so nothing is lost): tiger RU, cheetah IR, and pig-nosed turtle ID 2 and *Zaglossus bruijnii* ID 3. The ID cases are New Guinea, which GBIF puts in ASIA.
- **Remaining misses:** a captive country inside the core region with 3 or more records isn't flagged. The spot-checks look for these.

**§5.5 `data/review/country-overrides.json` [rev]**

The file is `[]` now and owned by the owner. Each element is `{"speciesId": 25, "country": "RU", "action": "keep" | "remove", "reason": "…"}`.

Derive applies the overrides last and throws on:
- keys that aren't exactly those four;
- an unknown `speciesId`;
- a country code not matching `^[A-Z]{2}$`, or `ZZ`;
- an empty `reason`;
- a duplicate `(speciesId, country)`;
- `keep` of a country with no counted records, because the field means "with records";
- any override on a species whose countries are `null`.

What each action does:
- **`keep`** publishes the country. It restores an excluded stray, or confirms a flagged one.
- **`remove`** withholds the country. It drops a kept one, or confirms an exclusion.
- A country covered by an override gets no `country-*` entry: the override and its reason are the record of the decision. An override that changes nothing is allowed, because that's how a review is recorded.

**§5.6 `data/review/mismatches.json`**

Entries are sorted by `speciesId`, then `field`, `kind` and `country` (absent sorts as `""`), comparing code units. The key order is fixed:

```json
{ "speciesId": 18, "scientificName": "Rafetus swinhoei", "field": "ids.iucn", "kind": "iucn-id", "severity": "blocking",
  "values": { "base": 22971, "wikidata": ["39621"], "wikidataItemsWithBaseId": { "Q3074062": "Vidumelon wattii" } },
  "reason": "Wikidata Q1075096 (P225 Rafetus swinhoei) has P627 39621; 22971 is P627 of Q3074062 (Vidumelon wattii). Kept 22971." }
{ "speciesId": 25, "scientificName": "Panthera tigris", "field": "range.countriesWithRecords", "kind": "country-captive-suspect",
  "severity": "review", "country": "DE",
  "values": { "gbif": { "records": 6, "region": "EUROPE", "speciesRecords": 3251, "coreRegions": ["ASIA"] } },
  "reason": "DE (EUROPE) is outside the core region (ASIA); kept. Settle with keep or remove in country-overrides.json." }
```

**Severity [rev]:**
- `blocking`: critwire withheld a value or fell back. The field is null, kept from base, or the country is excluded. A person settles it upstream, in base, or with an override.
- `review`: the value is published, but a person should confirm it. Today this means a kept, flagged country, settled with `keep` or `remove`.
- `info`: nothing to do. The value was filled normally, or it is simply absent upstream.

**[rev]** Every null `ids.{wikidata,gbif,col,inaturalist,ncbi}` is explained by exactly one entry (Fable SHOULD-CONSIDER 5). The single 0-item or multi-item entry on `ids.wikidata` explains all three Wikidata-derived ids. `values` is keyed by source (`base`, `wikidata`, `col`, `gbif`), and arrays inside it are sorted. Reasons use only integers and strings: no floats, no `localeCompare`.

| kind | field | severity |
|---|---|---|
| `not-found` | ids.wikidata, ids.col, ids.gbif, taxonomy | blocking |
| `not-found` | ids.inaturalist, ids.ncbi (no value on the item) | info |
| `multi-value` | ids.wikidata, ids.inaturalist, ids.ncbi, **[rev]** ids.gbif (P846), ids.col (P10585) | blocking |
| `multi-value` **[rev]** | ids.iucn (P627; base value kept) | blocking |
| `identity` | ids.col, ids.gbif, range.countriesWithRecords | blocking |
| `iucn-id` | ids.iucn | blocking (base value kept) |
| `synonym-info` | ids.gbif | info |
| `status-info` **[rev]** | ids.col (`provisionally accepted`) | info |
| `taxonomy-info` | taxonomy.class, .order, .family or .genus | info |
| `country-captive-suspect` **[rev]** | range.countriesWithRecords (+`country`) | blocking (stray, excluded) or review (kept) |
| `country-borderline` **[rev]** | range.countriesWithRecords (+`country`) | review (kept) |
| `no-records` | range.countriesWithRecords | info |

`derive` prints, for the PR body: coverage per field (filled out of 76), the number of species whose taxonomy came from COL, and the entry count by kind and severity.

#### §6 Database

`db/schema.sql` adds two columns to `species`. Everything else stays.
- `countries_with_records text[]`: `null` means the GBIF taxon isn't settled, and `'{}'` means none. It round-trips null versus `[]` exactly, which a child table can't do without an extra flag column.
- `sources jsonb not null`.

`load.ts` adds `countries_with_records: s.range.countriesWithRecords` and `sources: sql.json(s.sources)` to its row mapping. It stays one transaction and a full rebuild.

Verification after each of two loads:
- `count(*) = 76`;
- `count(*) filter (where countries_with_records is not null)` and `sum(cardinality(countries_with_records))` equal the totals derive printed;
- **[rev]** `jsonb_array_length(sources) ≥ 1` for all 76, since every record has the `critwire base` entry.

#### §7 Tests

Unit tests are warranted for the pure rules in `derive/*`: they're subtle and correctness-critical, and there's no E2E suite. HTTP and ingest code don't get unit tests: the live ingest run exercises them, and they fail loudly.

Per the owner's rule, write the failure-mode list into the test files first, then the code. Fixtures are inline and modelled on the live cases. The failure modes:

**Wikidata**
- W1: no item → three nulls plus `not-found`.
- W2: two items → `multi-value`.
- W3: two P3151 values (Ailurus) → iNat null plus `multi-value`; the other ids still filled.
- W4: the item's P627 differs from base → `iucn-id`, base kept.
- W5: the base id sits on another taxon's item → `iucn-id` naming that item, which is used for nothing.
- W6: a P3151, P685 or P846 value that isn't numeric → throws.
- W7: stale query → throws.
- **[rev]** W8: P846 = {usageKey, acceptedKey} → `ids.gbif` null plus `multi-value`, and countries null.
- **[rev]** W9: two P10585 values → `ids.col` null plus `multi-value`, and the base taxonomy is kept.
- **[rev]** W10: two items with different P846 values → `multi-value` on `ids.gbif`. Two items with the same single value → the cross-check runs on it.
- **[rev]** W11: `wikidataQuery` with a null or non-integer `ids.iucn` → throws.

**COL**
- C1: exact or variant match with the same name → id plus taxonomy.
- C2: variant with a different name → `not-found`, base taxonomy.
- C3: COL synonym → `identity`.
- C4: one P10585 value that differs from the COL id → `identity`, `ids.col` null, base taxonomy.
- C5: a missing rank → `not-found` on taxonomy.
- C6: genus differs from `N`'s first word → `identity`.
- C7: a rank differs from base → `taxonomy-info`.
- C8: unknown license → throws.
- **[rev]** C9: `provisionally accepted` → filled plus `status-info`.

**GBIF**
- G1: EXACT, SPECIES, same canonical name, no P846 → `usageKey`.
- G2: synonym with a single P846 equal to the usage key or the accepted key → filled plus `synonym-info`, which names the accepted key used for countries.
- G3: P846 outside that set → `identity`, ids.gbif and countries null.
- G4: FUZZY, HIGHERRANK or another name → `not-found`.
- G5: accepted epithet differs → id kept, countries null plus `identity`.
- G6: key that isn't an integer → throws.
- **[rev]** G7: a LICENSE facet containing `CC_BY_NC_4_0`, or license counts that don't sum to `count` → throws.

**Countries [rev]**
- K1: `ZZ` dropped.
- K2: `T < 50` keeps in-core singletons with no entry (saola).
- K3: `T ≥ 50`: in-core counts of 1 and 2 → kept plus `country-borderline` (review); 3 → no entry.
- K4: outside the core, count 1 → excluded plus `country-captive-suspect` (blocking), at any `T` (hirola US 1).
- K5: outside the core, count ≥ 2 → kept plus `country-captive-suspect` (review) (tiger DE 6, RU 8).
- K6: core by country count:
  - it beats a dominant top country (elephant US 4,461);
  - ties go to the most records, and full ties make every tied region core;
  - NORTH_AMERICA and LATIN_AMERICA count as one region (spiny softshell MX, jaguar US).
- K7: unknown country code → throws.
- K8: overrides:
  - `keep` restores a stray and removes its entry; `keep` on a flagged kept country removes the entry;
  - `remove` drops a kept country;
  - `keep` without counted records throws;
  - an unknown species, a duplicate, bad keys, or an override on null countries throws.
- K9: `T == 0` → `[]` plus `no-records`.
- K10: output sorted and stable when the input order is shuffled.

**Sources [rev]**
- S1: every published `ids.*`, `taxonomy` and non-null countries field is listed in exactly one entry. A fallback taxonomy is listed under `critwire base`. A field that is listed twice, or not at all, throws.

#### §8 Determinism and ownership

- **Derive:** reads inputs only, never the clock (`retrieved` comes from raw), and uses no locale sorting. Records are built in a fixed key order, and every array is sorted before output.
- **Checks:**
  1. `pnpm derive && git diff --exit-code data/`.
  2. Purity: `rm data/species.json data/review/mismatches.json && pnpm derive && git diff --exit-code data/`.
  3. No churn on the same day: re-run `pnpm ingest wikidata` and `pnpm ingest col`, then `git diff --exit-code data/raw/`. Any diff must be explained as an upstream change in the Log.
- **Who owns what:**
  - seed:cc owns `base.json`.
  - Ingest owns `data/raw/`.
  - The owner owns `country-overrides.json`.
  - Derive owns `species.json` and `mismatches.json`.

  Nobody hand-edits the derived files. `AGENTS.md` "Data" says so and lists the commands.
- **[rev] Suggested spot-check set** (the brief's 5 species), one per risk:

  | Species | Risk it covers |
  |---|---|
  | Blanding's turtle | GBIF synonym, countries from the accepted key |
  | Tiger | RU and DE flags, strays |
  | Asian elephant | zoo-heavy top country |
  | Spiny softshell | the US/MX seam |
  | *Rafetus swinhoei* | `iucn-id`, data-poor |

#### §9 Decisions (architect)

- **D1** `base.json` and `species.json` are split (findings 1 and 2).
- **D2** GBIF match uses v2 pinned with `checklistKey`, and `additionalStatus` is stripped. Occurrence search is pinned the same way.
- **D3** COL classification comes from the match response.
- **D4** The COL release record is allowlisted.
- **D5 [rev]** The Wikidata source `url` is `Special:EntityData/Q….json`.
- **D6 [rev]** The countries rule is as in §5.4: strays (1 record outside the core) are excluded, other far-off and thin countries are flagged and kept, the core counts countries, and the Americas are merged.
- **D7 [rev]** Countries are counted only from CC0 1.0 and CC BY 4.0 records, and the field is CC BY 4.0.
- **D8** Countries are stored as codes only.
- **D9** The DB uses a `text[]` column and `sources jsonb`.
- **D10** Request logs go through a stderr redirect; the code holds no path.
- **D11** Unit tests cover the derive rules only.
- **D12** One snapshot file per source, keyed by `scientificName` (the query input), not one file per species. This gives one `retrieved` date per file and readable diffs, at roughly 0.3–0.7 MB per file.
- **D13 [rev]** Wikidata cardinality is resolved before any cross-check, and ambiguous items pool their values.
- **D14 [rev]** A `critwire base` source entry covers `ids.iucn` and any fallback taxonomy.
- **D15 [rev]** The migration takes three commits, each green (§1).
- **D16 [rev]** COL `provisionally accepted` is accepted, with a `status-info` entry.
- **D17 [rev]** The `review` severity is added for published values that a person should confirm.

**Risks:**
- **R1 [rev]** GBIF regions are political, not biogeographic. The US/MX seam is merged away. The RU (EUROPE) and Indonesian New Guinea (ASIA versus OCEANIA) seams remain, only as review flags on kept countries.
- **R2 [rev]** Counting countries for the core handles a zoo-heavy top country (four live cases). A species whose zoo countries outnumber its range countries in one region would still invert. The spot-check includes the Asian elephant.
- **R3** API shape changes are caught by field validation, which throws.
- **R4 [rev]** Expect about 190 country entries (39 blocking, 151 review), plus the id entries. The PR body summarizes them by kind and severity.
- **R5 [rev]** The license filter drops a quarter of the filtered records and about a fifth of the country entries (123 of 644). It also leaves Ili pika blank. That's the price of a clear license, and the PR body states it. The alternative is in Rejected alternatives.

**Notes for `plans/001-mvp.md`:**
- The Record example becomes `"range": { "countriesWithRecords": [] }` and shows the `sources[]` entry shape above.
- Crosswalk: `ids.col` doubles as the COL XR key.
- **[rev]** Countries are counted only from CC0 and CC BY 4.0 GBIF records, and the field is CC BY 4.0. GBIF aggregates have no DOI.
- **[rev]** Later (step 3): register a GBIF derived dataset for the published country lists, to get a citable DOI.

### Rejected alternatives

- **One `species.json` that seed:cc merges into:** two writers, the step-1 taxonomy is lost after the first derive, and derive's output would depend on its own past output.
- **A `species_country` child table:** it loses null versus `[]` (it would need a flag column), and the file is the interface anyway.
- **GBIF v1 `species/match`:** it can't pin the backbone. (It does carry no IUCN fields, but v2 plus a strip and guard is explicit.)
- **The separate COL `/taxon/{id}/classification` call:** the data is identical to the match response's, at 76 more requests.
- **Per-country `datasetKey`/`basisOfRecord` facets** to detect "one sound or zoo archive": about 500 more requests, and deciding which datasets are zoo archives needs dataset metadata and judgement.
- **Share-based or per-record `continent` thresholds:** they drop native countries of species whose records are skewed to one country (in the unfiltered data, tiger BT was 0.07% of its records).
- **A hand-made table of transcontinental countries:** it's judgement-laden data. The Americas merge covers the seam that matters, and the rest are only review flags now.
- **A year cutoff:** it isn't in the brief, it changes what the field means, and it drops old specimens of data-poor species.
- **[rev] Region-based exclusion** (the first draft): it excluded documented native countries (tiger RU, cheetah IR, jaguar US, spiny softshell MX), and the brief says captive suspects stay and are flagged.
- **[rev] A global minimum of 2 records:** it drops 62 thin in-core countries, which under the license filter are mostly native.
- **[rev] Core = the top country's region:** it inverts for zoo-heavy species. For the elephant it would flag all 13 range countries and leave US unflagged.
- **[rev] Merging EUROPE and ASIA too:** it would hide the brief's own example, tiger DE.
- **[rev] Counting CC BY-NC records** and giving those species' field a `CC BY-NC 4.0` license (GBIF's most-restrictive rule for downloads): the license would be clear, but the field would become non-commercial, unlike the rest of critwire, with the license varying per record.
- **[rev] Ignoring licenses because counts are facts:** that's a legal argument the brief doesn't make, and the brief says "if a license is unclear, leave the field out".
- **[rev] Treating P846 = {usage key, accepted key} as one compatible value:** the brief says a multi-valued property gives null.

## Architecture review (Fable)

Fable, 2026-10-20. Checked findings against `scripts/seed-cc.ts`, `scripts/species.ts`, `scripts/load.ts`, `scripts/build.ts`, `db/schema.sql`, `data/species.json` (76 records, 76 unique names, 0 null `ids.iucn`, only `ids.iucn` filled). Re-ran ~12 polite live calls: GBIF v2 match (tiger, Blanding's, Apalone, ferret), `enumeration/country`, pinned occurrence facets, ChecklistBank `3LR` + 5 matches, and the SPARQL template with 3 names. No IUCN calls.

Findings 1–6 are real and the cited lines are accurate (`seed-cc.ts:70-71` Maps with last-wins, `:77-89` second-match overwrite, `:79` dup check only on the no-match path, `:93-97` slug-only uniqueness; `species.ts` one type for input and output; schema has no countries/sources). Finding 4 confirmed live: v2 match returns `additionalStatus[{datasetAlias:"IUCN", status:"ENDANGERED", statusCode:"EN", …}]`; v1 doesn't, but v2 is the only one that pins the backbone, so strip-and-guard is right. Live shapes match the design: ChecklistBank match has `usage.classification` (genus→domain, kingdom present), `type` comes back `variant` for every exact name sent without authorship (so `exact|variant` + `usage.name == N` is necessary, not optional); `Chelonoidis abingdonii` matches `higherrank` to the genus (→ `not-found`, base taxonomy, as designed); P10585 values are the stable ids (`4JZ39`, `793TZ`); pinned facets differ from unpinned (11,390 vs 11,393), so the `checklistKey` pin is doing something. The SPARQL template parses and binds `?name` on both UNION branches, so `iucnItem` rows attach to the right species. The base.json/species.json split (D1) is the correct fix for findings 1–2 and is not over-engineered; module count, `severity`, and the test list are proportionate.

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **`UNDEF` in the SPARQL VALUES is a live hazard, and dead text.** If `?iucn` is `UNDEF`, the second UNION branch `?iucnItem wdt:P627 ?iucn` has an unbound object and joins every Wikidata item with a P627 (hundreds of thousands of rows for that one name): a timeout or a multi-MB snapshot. `validateBase()` (finding 3) already requires non-null `ids.iucn` and `seed-cc.ts:39` already rejects a missing `iucnId`, so the case can't occur. Make it explicit: `wikidataQuery(base)` throws on a null id and §3 drops the "UNDEF for a null IUCN id" sentence. Fail fast, no silent blow-up path.

MISSED:
1. **The region rule excludes a large native country on the sample set.** *Apalone spinifera* today (brief's filters): US 18,207, MX 1,012, CA 475, AR 13, PT 11, IT 7, CN 1. GBIF puts MX in `LATIN_AMERICA` and `NORTH_AMERICA` holds only 4 countries (US, CA, GL, BM), so MX (5% of records, native range along the Rio Grande) is excluded as `country-captive-suspect`. Same for *Mustela nigripes* MX (reintroduced; the brief says not to tell native from introduced). These aren't in the §5.4 false-positive list and "captive-suspect" is the wrong word for a 1,012-record neighbour. The override path covers it, so not a defect, but R1 should name the US/MX seam, and the spot-check list should include Apalone. See SHOULD-CONSIDER 1 for a one-line rule change.
2. **Migration window.** §1 does `git mv data/species.json data/base.json` before derive exists; between that step and the first `pnpm derive`, `pnpm db:load` has no input and `load.ts` won't typecheck against the new `Species` (required `range`, `sources`). `build.ts` is unaffected (it reads nothing). The planner must order Steps so the rename, the type change, `load.ts`, derive and the first derived `species.json` land in one step (or one commit), so every commit keeps `pnpm typecheck` and `pnpm db:load` green.

SHOULD-CONSIDER:
1. Countries: treat `NORTH_AMERICA` and `LATIN_AMERICA` as one region for the core test. Cost: axolotl US 2 and CA 3 are then kept (rule 3 doesn't catch counts of 2–3) and need `remove` overrides. Gain: Apalone MX 1,012, ferret MX, jaguar US 140 stop being flagged. The architect's "would still miss the MX/US split" argument cuts the other way once Apalone is on the table. Either way, document the choice in `derive/countries.ts`.
2. COL status: ChecklistBank also returns `provisionally accepted`. The rule sends it to `not-found`, which misdescribes it. Report it as `identity` with `values.col.status`, or accept it with an info entry; pick one and state it.
3. Wikidata `sources[].url`: the brief asks for a query URL. `https://www.wikidata.org/wiki/Special:EntityData/Q185526.json` is both per-species and a verifiable query; prefer it over the HTML entity page, or store both.
4. GBIF v2 match also returns `left`/`right` (nested-set indexes) that move whenever the backbone is rebuilt; drop them with `diagnostics.timeTaken`/`timings` to cut raw churn.
5. §5.6 says "every null `ids.*` has exactly one entry", but the 0-items Wikidata case writes one entry for three nulls. Reword to "is explained by exactly one entry" so the invariant the tests check is the one the text states.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **Country filtering makes unsupported identity decisions (§5.4).** Political regions automatically exclude documented valid records (tiger RU, cheetah IR, jaguar US), while top countries and known same-region captive suspects remain unflagged. Empty overrides leave these defects in the output. Use regional differences as review signals, not automatic exclusions; flag known captive suspects regardless of whether retained.

2. **Provenance contract violates AGENTS.md (§4).** Omitting the occurrence license does not satisfy “every third-party field … records its source and license.” “Leave the field out” means withholding the unsupported data field, not merely its license attribute. Establish an explicit, supported licensing basis before publishing countries. Preserve provenance for base taxonomy used as fallback, too.

3. **Multi-valued GBIF IDs can be published (§5.3).** Wikidata P846 containing both `usageKey` and `acceptedKey` passes the proposed cross-check, despite the brief requiring multi-valued properties to produce null plus a `multi-value` entry. Resolve cardinality before compatibility checks.

SHOULD-CONSIDER:

1. An unchanged epithet does not establish that an accepted taxon has the same scope. Treat the epithet check as a warning heuristic, not proof that synonym-expanded occurrences belong to the intended species.
2. Specify how ambiguous Wikidata items affect downstream COL/GBIF cross-checks; do not silently treat ambiguity as absent evidence.
3. Remove the contradictory SPARQL `UNDEF` path; enforce the non-null IUCN-ID prerequisite at query construction.
4. Land the base-file migration, derive pipeline, loader changes and regenerated output together.

## Revision notes

Architect, 2026-10-20. This is the one revision, covering both reviews. Evidence for it is in `/srv/critter-ai/agent-state/missions/critwire-ingest/revision/`. It took about 230 polite GBIF calls at 1 request per second, and no IUCN calls.

**MUST-FIX**
- **Fable 1, SPARQL `UNDEF`.** Resolved in §3. `wikidataQuery(base)` throws on a null or non-integer `ids.iucn`, the `UNDEF` sentence is gone, and test W11 covers it.
- **Astra 1, country filtering.** Resolved by rewriting §5.4.
  - The brief, re-read, says "Captive animals recorded as observations stay … flag suspicious ones … for the owner to settle through the overrides file". The only filter it asks for is a minimum-records rule "against strays". So regions are now only review signals.
  - The minimum-records rule is: 1 record outside the core region is a stray, and is excluded. This scopes the brief's minimum by region, but region alone never excludes. It caught 39 of 39 non-wild singletons, while a global minimum would drop 62 mostly native singletons.
  - Every other far-off country, and every in-core country with 1–2 records in a species with 50 or more records, is **kept** with a new `review` severity. That includes the top country, now that the core counts countries.
  - All five documented valid records are published: tiger RU, cheetah IR, jaguar US, spiny softshell MX and ferret MX. Known captive suspects are flagged while kept, for example tiger DE and elephant US.
  - Overrides are now `keep` or `remove`, so the owner can also confirm a flag.
  - Not implemented: the brief's "mostly one sound or zoo archive" signal. Rejected alternatives give the reason.
- **Astra 2, occurrence license and provenance.** Resolved in §3 and §4.
  - The facet query now adds `license=CC0_1_0&license=CC_BY_4_0&facet=license`. Verified live: the filter works with facets, a bogus value returns 400, and the filtered LICENSE facet holds only CC0 and CC BY.
  - `assertOpenLicenses` enforces this at ingest and at derive. The field is published as CC BY 4.0, with the brief's GBIF.org citation and the query URL. The DOI route (a GBIF derived dataset) is noted for step 3.
  - Cost, measured on all 76 species: 25% of the filtered records and 123 of 644 country entries, and Ili pika becomes blank, with a `no-records` entry. The brief ranks correctness and citations above coverage, and it says "if a license is unclear, leave the field out". So this needs no handoff item, but the PR body must state the cost.
  - Base provenance: a `critwire base` source entry now covers `ids.iucn` and any fallback taxonomy. Derive asserts that every published third-party field is cited exactly once (test S1).
- **Astra 3, multi-valued P846.** Resolved in §5.1. Cardinality is resolved first for all five properties. P846 holding {usage key, accepted key} gives `ids.gbif` null with `multi-value`, and countries null. P10585 and P627 get the same rule. Tests W8–W10 cover it. Live, no P846 or P10585 has several values, so coverage doesn't change.
- **Fable missed 2 / Astra SHOULD-CONSIDER 4, migration window.** Resolved in §1. The migration takes three green commits:
  1. Copy `base.json` (not move it) with the ingest code.
  2. Commit the raw snapshots.
  3. One switch commit: the types, schema, `load.ts`, derive and the first derived outputs.

**MISSED**
- **Fable missed 1, the US/MX false positives.** Resolved: NORTH_AMERICA and LATIN_AMERICA are merged, R1 names the remaining seams (RU, Indonesian New Guinea), and spiny softshell is in the suggested spot-check set (§8).

**SHOULD-CONSIDER**
- **Fable 1, merge the Americas:** adopted. With flags no longer excluding, the old cost (axolotl US/CA unflagged) is gone: CA 2 is caught as borderline, and US isn't counted under the license filter.
- **Fable 2, COL `provisionally accepted`:** adopted, as accepted with a `status-info` info entry. It's COL's accepted usage, so nothing disputes the taxon, and the entry keeps it visible.
- **Fable 3, `Special:EntityData` URL:** adopted. It's cheap, per species and machine-checkable.
- **Fable 4, drop `left` and `right`:** adopted. Both are verified present in the v2 match response.
- **Fable 5, invariant wording:** adopted in §5.6.
- **Astra 1, epithet check as a heuristic:** adopted as wording (§5.3). The `synonym-info` reason names the accepted key used for countries. A real scope check would need both sides' synonym lists, which is out of proportion for two live cases.
- **Astra 2, ambiguous Wikidata items:** adopted. P627, P846 and P10585 values are pooled over all of `N`'s items, so ambiguity can't pass as absent evidence (§5.1, W10).
- **Astra 3:** the same item as Fable MUST-FIX 1, done.
- **Astra 4:** the same item as Fable missed 2, done.

**Where the brief overrides an example or a reviewer**
- The brief's axolotl GB example disappears: all 81 of those records are CC BY-NC. Its data rules on licenses win over the example.
- Nothing a reviewer asked for was declined on the brief's basis.

## Steps

Planner, 2026-10-20. How the steps map onto the migration (§1, D15):
- S1–S4 are migration commit 1 (`base.json` plus the ingest code). Each raw snapshot goes in with the code that wrote it, which is commit 2.
- S5–S7 add pure rule modules that nothing calls yet.
- S8 is the switch commit, done in one commit.
- Until S8, `data/species.json`, `Species`, `load.ts` and `db/schema.sql` stay exactly as step 1 left them.

Every step is one commit (the code, the plan check-off and one Log line), pushed. "Green" means `pnpm typecheck && pnpm test && pnpm build`; there is no `test` script before S2. `L` is `/srv/critter-ai/agent-state/missions/critwire-ingest`. A step's §7 tests are written first, named after their id (`test("K4 …")`), and run red before the code is written (put the failing count in the Log). V0–V9 are defined in Verification, F1–F9 in Failure modes.

- [x] S1 · Split `data/base.json` from `data/species.json`; harden seed:cc.
  - `scripts/species.ts`: add `BaseSpecies` (`ids: {iucn}`), `baseFile` and `validateBase()`. It requires `id`, `slug`, `scientificName` and `ids.iucn` to be unique, and `ids.iucn` to be a positive integer.
  - Add `scripts/json.ts` (§2).
  - `scripts/seed-cc.ts`:
    - reads and writes only `data/base.json`, through `json.ts`;
    - runs `validateBase` on the base it reads and on the result before writing;
    - throws when a profile matches a record that is already matched (finding 3).
  - `data/base.json`: a one-off mechanical copy of `data/species.json` without the five null ids, made with a node one-liner, not with seed:cc. `species.json`, `Species`, `load.ts` and the schema stay untouched.
  - Checks:
    - green;
    - V2. If CC has moved, record the diff in the Log, restore `base.json` and never merge it;
    - F1;
    - `pnpm -s db:load` prints `loaded 76 species`.
- [x] S2 · HTTP client, raw module, ingest CLI, Wikidata ingest and its snapshot.
  - Add `scripts/http.ts`, `scripts/raw.ts` (snapshot types, `readSnapshot`/`writeSnapshot`, `utcDate`), `scripts/ingest.ts` and `scripts/ingest/wikidata.ts` (the exact §3 template, bindings sorted).
  - `package.json`: add `ingest` and `test`.
  - Tests first: W11 in `scripts/derive/wikidata.test.ts`.
  - Run `pnpm ingest wikidata 2>> $L/ingest-wikidata.log` and commit `data/raw/wikidata/snapshot.json`.
  - Checks:
    - green;
    - `retrieved` is today's UTC date, and there are about 441 bindings;
    - `jq -e '[.response.results.bindings[] | select(.item) | [.name.value, .item.value]] | unique | group_by(.[0]) | length == 76 and all(.[]; length == 1)' data/raw/wikidata/snapshot.json`;
    - a second run the same day leaves `git diff --exit-code data/raw/wikidata` clean;
    - `pnpm ingest nope` exits non-zero with a usage message.
- [x] S3 · COL ingest and its snapshot.
  - `scripts/ingest/col.ts`: resolve 3LR to the allowlisted release record, then fetch the 76 matches, keyed by name as `{url, response}`. Strip `created`, `modified` and `modifiedBy` wherever they appear.
  - `raw.ts`: add `assertNoIucnData`, which runs before the write.
  - Run `pnpm ingest col 2>> $L/ingest-col.log` and commit `data/raw/col/snapshot.json`.
  - Checks:
    - green;
    - `jq -e '(.matches | length) == 76 and (.release | .key and .alias and .version and .issued and .doi and .license)' data/raw/col/snapshot.json`;
    - V4's COL raw lines;
    - F4;
    - a second run the same day leaves `git diff --exit-code data/raw/col` clean.
- [x] S4 · GBIF ingest and its snapshot. After this step all three raw snapshots are committed.
  - `scripts/ingest/gbif.ts` per §3: the checklist allowlist, the country enumeration, the v2 match with its fields stripped, the occurrence facets with the parameters in fixed order, facet sorting and the `facetLimit` guard.
  - `raw.ts`: add `assertOpenLicenses` and `gbifTaxonKey`.
  - Tests first: G7 in `scripts/derive/gbif.test.ts`.
  - Run `pnpm ingest gbif 2>> $L/ingest-gbif.log` and commit `data/raw/gbif/snapshot.json`.
  - Checks:
    - green;
    - `jq -e '(.species | length) == 76 and all(.species[]; .occurrences != null)' data/raw/gbif/snapshot.json`;
    - V4's GBIF raw lines;
    - `jq -e '.species["Emydoidea blandingii"].occurrences.response.facets[] | select(.field == "COUNTRY") | [.counts[].name] == ["CA","US"]' data/raw/gbif/snapshot.json`;
    - `du -h` shows roughly 0.3–0.7 MB.
- [x] S5 · Countries rule, the riskiest logic.
  - Tests first: K1–K10 in `scripts/derive/countries.test.ts`.
  - Then `scripts/derive/countries.ts`: the §5.4 constants with their justification at the top, the §5.5 override validation and application, and entries in the §5.6 shape.
  - `species.ts`: add the `Mismatch` and `CountryOverride` types. This only adds types; `Species` doesn't change.
  - Checks:
    - green;
    - smoke run: a throwaway `$L/smoke/countries.ts` (never committed) runs the rule on `data/raw/gbif` for all 76 species with no overrides, and prints the tallies of `$L/revision/final-rule.txt`. Expect about 482 codes across 75 species, Ili pika `[]`, 39 strays, and 54 plus 97 review flags. Record any drift in the Log.
- [x] S6 · Wikidata rules.
  - Tests first: W1–W10, added to `scripts/derive/wikidata.test.ts`.
  - Then `scripts/derive/wikidata.ts`:
    - the staleness check (W7), pooled values, cardinality first and the P627 rule;
    - it returns the Wikidata ids, the entries, and the P846 and P10585 evidence (none, one or several values) that S7 uses.
  - Checks:
    - green;
    - smoke run on the real snapshot: all 76 have `ids.wikidata`, species 4, 18, 19 and 21 get `iucn-id`, and species 35 and 40 get `multi-value` on `ids.inaturalist`.
- [x] S7 · COL and GBIF rules.
  - Tests first: C1–C9 in `scripts/derive/col.test.ts`, and G1–G6 in `gbif.test.ts`.
  - Then `scripts/derive/col.ts` and `scripts/derive/gbif.ts` (§5.2 and §5.3, including the lump guard). Their license maps throw on an unknown license.
  - Checks:
    - green;
    - smoke run: species 22 gets `not-found` on `ids.col`, and species 1 and 55 get `synonym-info` on `ids.gbif`. Record the counts of settled COL and GBIF matches in the Log.
  - From the S3 snapshot (decide in S7, test first): `usage.name` carries a subgenus for *Marmota vancouverensis* (`Marmota (Petromarmota) vancouverensis`) and *Ochotona iliensis* (`Ochotona (Conothoa) iliensis`). The brief's "canonical names are equal" means comparing without the subgenus; a literal `usage.name == N` would blank both. *Zaglossus bruijnii* → `Zaglossus bruijni` (spelling variant, not equal → `not-found`). COL synonyms: *Tapirus bairdii*, *Trichobatrachus robustus* (→ `identity`).
- [x] S8 · Switch commit (migration 3 of 3), in one commit.
  - Tests first: S1 in `scripts/derive/record.test.ts`.
  - Then `scripts/derive/record.ts`. It is pure: it builds the §4 record in a fixed key order, builds `sources[]`, and asserts that every field is cited exactly once. This module is the planner's layout choice, so that S1 needs no file system.
  - `species.ts`: add `range` and `sources` to `Species`, and add the `Source` type.
  - `scripts/derive.ts`, the CLI per §2 and §5:
    - validates its inputs and checks staleness;
    - runs the rules in id order and sorts the entries per §5.6;
    - writes both outputs;
    - prints the coverage per field, the number of taxonomies from COL, the country totals (including the species with `[]` and with `null`), and the entries by kind and severity.
  - Also in this commit:
    - `data/review/country-overrides.json`, containing `[]`;
    - the `derive` script in `package.json`;
    - `db/schema.sql` and `scripts/load.ts` per §6.
  - Run `pnpm -s derive | tee $L/derive-S8.txt`, then `git add -A data/`.
  - Checks: green; V3, V4, V5 and V6; F2 and F3.
- [x] S9 · seed:cc after the switch, and the docs.
  - `AGENTS.md`, "Data" section:
    - who owns each file (§8);
    - the commands and their order: `pnpm seed:cc`, then `pnpm ingest <source>` if a name or IUCN id changed, then `pnpm derive`, then `pnpm db:load`; plus `pnpm test`;
    - the derived files are never hand-edited;
    - the field means "countries with records, not native range";
    - counts come only from CC0 and CC BY records, and the field is CC BY 4.0;
    - the §5.4 rule and its constants, and the overrides format.
  - `plans/001-mvp.md`:
    - the Brief's "Plan edits": the Range (MVP) text, the Crosswalk, Step 2 without Natural Earth (the "done" mark comes in S11), realms under Later, and the Record without `realms`;
    - the Architecture's "Notes for `plans/001-mvp.md`": the Record's `range` and `sources[]` shape, `ids.col` as the COL XR key, the license basis and the missing DOI, and the step-3 GBIF derived dataset.
  - Checks: green; V2, then V3. seed:cc must leave `base.json` and the derived files byte-identical.
- [x] S10 · Spot-checks and the same-day no-churn check.
  - The species are 1 (Blanding's turtle), 25 (tiger), 28 (Asian elephant), 2 (spiny softshell) and 18 (*Rafetus swinhoei*), as in §8.
  - For each one, compare the published ids, taxonomy, countries and mismatch entries with fresh responses from each source's own site, not with `data/raw`:
    - Wikidata: `https://www.wikidata.org/wiki/Special:EntityData/<Q>.json` (P225, P627, P846, P10585, P3151, P685);
    - COL: `https://api.checklistbank.org/dataset/<key>/taxon/<ids.col>` and its `/classification` (what `catalogueoflife.org/data/taxon/<id>` shows);
    - GBIF: `https://api.gbif.org/v1/species/<ids.gbif>`, and the occurrence URL stored in `sources[].url`;
    - the human pages, for the owner: `wikidata.org/wiki/<Q>`, `catalogueoflife.org/data/taxon/<id>` and `gbif.org/species/<key>`. Take screenshots where possible with `~/.cache/ms-playwright/chromium_headless_shell-1208/chrome-linux/headless_shell --screenshot=<png> --window-size=1280,1600 --virtual-time-budget=15000 <url>`.
  - Save the responses and screenshots in `$L/spot-checks/`, plus `spot-checks.md`: its first line is `git rev-parse HEAD:data/species.json`, followed by a table of species, field, published value, source value and verdict.
  - Run V7.
  - If this finds a rule bug, add a fix step before S11, with a failing test first. Record upstream drift in the Log.
  - Commit the plan only.
- [x] S11 · Rebase and open the PR.
  - Run `git fetch origin`. If `git merge-base --is-ancestor origin/main HEAD` fails:
    1. `git rebase origin/main`;
    2. re-run V1–V4;
    3. `git push --force-with-lease origin agent/critwire-ingest`.
  - Write `$L/pr-body.md` (not in the repo), with:
    1. what changed and why in 2–3 lines, and "no merge, no deploy";
    2. coverage per field out of 76 (`ids.wikidata`, `gbif`, `col`, `inaturalist`, `ncbi`), the number of taxonomies from COL, and the species with countries, with `[]` and with `null`, plus the total codes. These come from V3's `derive.txt`;
    3. the mismatch counts by kind and severity;
    4. the findings in plain words:
       - the CC IUCN ids that look wrong: each `iucn-id` entry, with the base id and what Wikidata says, for the owner to check in CC (CC isn't changed here);
       - the GBIF synonyms, the two iNaturalist ids, and the COL not-found;
    5. the countries rule as finally set (§5.4 constants), and the review queue: the strays excluded, the captive-suspect and borderline flags, and how to settle them in `country-overrides.json`;
    6. the license-filter cost: only CC0 and CC BY 4.0 records are counted. Measured on 2026-10-20, that drops 130,844 of 528,044 filtered records (25%) and 123 of 644 country entries, and leaves Ili pika blank. The field is CC BY 4.0, and GBIF aggregates have no DOI (a step-3 item);
    7. the verification results and artifact paths, and the review verdicts (Fable and Astra both APPROVE_WITH_CHANGES; the revision resolved every MUST-FIX).
  - Run `gh pr create --base main --head agent/critwire-ingest --title "step 2: Wikidata ids, COL taxonomy, GBIF countries" --body-file $L/pr-body.md`. If a PR already exists, run `gh pr edit agent/critwire-ingest --body-file …` instead.
  - Mark step 2 in `plans/001-mvp.md` as "Done: PR #<n>", then commit and push.
  - Checks: V9.

Notes for the implementing sessions:
- The evidence numbers (441 bindings, 482/39/54/97) were taken on 2026-10-20. Expect upstream drift and record it in the Log; never tune a rule to match a number.
- Smoke scripts and scratch files go in `$L/smoke/` and are never committed. Run ingests one at a time; the pacing is per process.
- If a smoke run exposes a bug from an earlier step, fix it in the current step with a failing test first, and say so in the Log.

## Verification

Run this from the worktree, as one bash session. It writes its own transcript.

```bash
set -euo pipefail
cd /srv/critter-ai/worktrees/critwire-ingest
L=/srv/critter-ai/agent-state/missions/critwire-ingest; V=$L/verify; mkdir -p "$V"
exec > >(tee "$V/verify-$(date -u +%Y%m%dT%H%MZ).log") 2>&1

# V0 preflight: clean tree, critwire_dev only
test -z "$(git status --porcelain)"
node -e 'process.loadEnvFile(); if (!/\/critwire_dev(\?|$)/.test(process.env.DATABASE_URL ?? "")) { console.error("DATABASE_URL is not critwire_dev"); process.exit(1) }'

# V1 install, typecheck, unit tests (every §7 id present), build
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test 2>&1 | tee "$V/test.txt"
for id in W{1..11} C{1..9} G{1..7} K{1..10} S1; do grep -qw "$id" "$V/test.txt" || { echo "missing test $id"; exit 1; }; done
pnpm build

# V2 seed:cc idempotent; doesn't touch derived files (if CC moved: Log + PR note, restore, never merge)
pnpm -s seed:cc /srv/critter-ai/critter-connect/db/content/animals
git diff --exit-code data/

# V3 derive determinism and purity
pnpm -s derive | tee "$V/derive.txt"
git diff --exit-code data/
rm data/species.json data/review/mismatches.json
pnpm -s derive >/dev/null
git diff --exit-code data/

# V4 output and raw invariants
jq -e 'length == 76 and . == sort_by(.id)' data/species.json
jq -e '. == sort_by(.speciesId, .field, .kind, (.country // ""))' data/review/mismatches.json
jq -e '. == []' data/review/country-overrides.json
jq -en --slurpfile b data/base.json --slurpfile s data/species.json '[$b[0], $s[0]] | transpose | all(.[];
  .[0] as $x | .[1] as $y
  | ($x | del(.ids, .taxonomy)) == ($y | {id, slug, scientificName, commonName, photo, replacedBy})
  and $y.ids.iucn == $x.ids.iucn
  and ($y.ids.col != null or $y.taxonomy == $x.taxonomy)
  and ($y.ids.gbif != null or $y.range.countriesWithRecords == null)
  and ($y.range | keys) == ["countriesWithRecords"] and ($y | has("traits") | not)
  and ($y.sources | length) >= 1)'
if grep -qiE 'iucn|additionalStatus' data/raw/col/snapshot.json data/raw/gbif/snapshot.json; then echo "IUCN data in raw"; exit 1; fi
jq -e '[paths | .[-1] | select(. == "left" or . == "right" or . == "timeTaken" or . == "timings" or . == "additionalStatus")] | length == 0' data/raw/gbif/snapshot.json
jq -e '[paths | .[-1] | select(. == "created" or . == "modified" or . == "modifiedBy")] | length == 0' data/raw/col/snapshot.json

# V5 expected live findings (2026-10-20). A miss is a bug unless it's upstream drift: then record it in Decisions and adjust this list.
m=data/review/mismatches.json
has() { jq -e --argjson id "$1" --arg f "$2" --arg k "$3" 'any(.[]; .speciesId == $id and .field == $f and .kind == $k)' $m >/dev/null || { echo "missing $*"; exit 1; }; }
for id in 4 12 15 17 18 19 20 21 22 62; do has $id ids.iucn iucn-id; done
for id in 35 40; do has $id ids.inaturalist multi-value; done
for id in 1 55; do has $id ids.gbif synonym-info; done
has 22 ids.col not-found
for id in 7 9 59 70 73; do has $id ids.col identity; done
for id in 9 19; do has $id ids.gbif identity; done
has 27 ids.col not-found; has 27 ids.gbif not-found
for id in 63 70; do has $id ids.gbif synonym-info; done
has 47 range.countriesWithRecords no-records
jq -e '.[] | select(.id == 47) | .range.countriesWithRecords == []' data/species.json
jq -e '.[] | select(.id == 1) | .range.countriesWithRecords == ["CA","US"]' data/species.json
jq -e '(.[] | select(.id == 25) | .range.countriesWithRecords) as $c | (["DE","RU","US"] - $c) == [] and ($c - ["CA","DK","KE","MW","NL","SE"]) == $c' data/species.json
jq -e 'any(.[]; .speciesId == 25 and .country == "DE" and .kind == "country-captive-suspect" and .severity == "review")' $m
jq -e 'any(.[]; .speciesId == 28 and .country == "US" and .kind == "country-captive-suspect" and .severity == "review")' $m

# V6 db:load twice into critwire_dev; DB matches species.json (null vs [] round-trips)
test "$(pnpm -s db:load)" = "loaded 76 species"
test "$(pnpm -s db:load)" = "loaded 76 species"
want=$(jq -r '[length, (map(select(.range.countriesWithRecords != null)) | length), (map(select(.range.countriesWithRecords == [])) | length), (map(.range.countriesWithRecords // [] | length) | add), (map(select(.sources | length >= 1)) | length)] | map(tostring) | join("|")' data/species.json)
got=$(psql -d critwire_dev -XAtc "select count(*), count(*) filter (where countries_with_records is not null), count(*) filter (where countries_with_records = '{}'), coalesce(sum(cardinality(countries_with_records)), 0), count(*) filter (where jsonb_array_length(sources) >= 1) from species")
echo "db want $want got $got"; test "$want" = "$got"

# V7 same-day raw no-churn (wikidata, col). Any diff must be explained in the Log as an upstream change. Restores HEAD after.
today=$(date -u +%F)
for s in wikidata col; do
  if [ "$(jq -r .retrieved data/raw/$s/snapshot.json)" != "$today" ]; then pnpm -s ingest $s 2>> "$L/ingest-$s.log"; git add data/raw/$s; fi
  pnpm -s ingest $s 2>> "$L/ingest-$s.log"
  git diff --exit-code data/raw/$s > "$V/churn-$s.diff" || echo "CHURN in $s: see $V/churn-$s.diff"
  git restore --source=HEAD --staged --worktree data/raw/$s
done

# V8 spot-checks done on the current data
head -1 "$L/spot-checks/spot-checks.md" | grep -q "$(git rev-parse HEAD:data/species.json)"

# V9 (after the final push) delivery
test -z "$(git status --porcelain)"
git fetch -q origin && git merge-base --is-ancestor origin/main HEAD
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/agent/critwire-ingest)"
gh pr view agent/critwire-ingest --json state,baseRefName -q '.state + " " + .baseRefName' | grep -qx 'OPEN main'
```

**Artifacts**, all in `/srv/critter-ai/agent-state/missions/critwire-ingest/`:
- `verify/verify-<UTC>.log`: the full transcript. Reproduce it by re-running the block above.
- `verify/test.txt`.
- `verify/derive.txt`: the numbers for the PR and the Summary.
- `verify/churn-*.diff`, when V7 finds churn.
- `spot-checks/`: `spot-checks.md`, the fetched responses and the screenshots.
- `ingest-{wikidata,col,gbif}.log`.
- `pr-body.md`.

**Final pass, after S11** (the mission flow):
1. Run V0–V8.
2. Write the Summary: the coverage and kind counts from `derive.txt`, the final countries rule (§5.4 plus its constants), the species with `[]` and with `null` countries, the 5 spot-checked species with their verdicts, and the artifact paths.
3. Set `status: done`, commit and push.
4. Run V9.

## Failure modes

The unit-tested failure modes are §7's list: W1–W11, C1–C9, G1–G7, K1–K10 and S1. Each one is written, and seen failing, before its code, in the step named above.

Failure modes checked by a negative run instead of a unit test (D11):
- **F1 · seed:cc matches one record twice.**
  - Setup: copy the CC profiles to `T=$(mktemp -d)`, then copy one profile to `$T/zz-dup.json`.
  - Pass: `pnpm -s seed:cc "$T"` exits non-zero and `git diff --exit-code data/` stays clean.
  - Step: S1.
- **F2 · Invalid base.**
  - Setup: back up `data/base.json`, then give `.[1]` the `scientificName` of `.[0]`.
  - Pass: `pnpm -s derive` exits non-zero and names the duplicate.
  - Step: S8, after `git add -A data/`.
- **F3 · Stale raw.**
  - Setup: rename `.[0].scientificName` to a new, unique name.
  - Pass: `pnpm -s derive` exits non-zero, naming `pnpm ingest wikidata`. Then `git checkout -- data/base.json && git diff --exit-code data/`, which proves derive wrote nothing.
  - Step: S8.
- **F4 · Interrupted ingest.**
  - Setup: `timeout 10 node --import tsx scripts/ingest.ts col` (a single process, so the kill reaches it).
  - Pass: it exits non-zero, and `git status --porcelain --ignored data/` is empty: the old snapshot is intact and no temp file is left.
  - Step: S3.
- **F5 · IUCN data or volatile keys in raw.** Ingest throws (`assertNoIucnData`), and V4's raw lines check it. The strip runs on every live v2 match, which carries `additionalStatus`.
- **F6 · A saturated GBIF facet** (`counts.length ≥ 300`). Ingest throws. This is checked by code review only: today's maximum is about 40 countries.
- **F7 · Non-determinism** (clock, locale sorting, Map order, unsorted arrays). Caught by V3.
- **F8 · A derived record drifts from base** (names, photo, `ids.iucn`, or the taxonomy when `ids.col` is null). Caught by V4's jq invariant.
- **F9 · Touching the live `critwire` db.** Caught by V0's guard; `load.ts` reads `DATABASE_URL` only.

## Decisions

- 2026-10-20 (Revision): GBIF country facets count only CC0 + CC BY 4.0 records (`license=CC0_1_0&license=CC_BY_4_0`); field published as CC BY 4.0. Why: AGENTS.md requires a license per third-party field; CC BY-NC records can't be republished under one clear license. Cost: ~25% of records, 123/644 country entries, Ili pika blank. Must be stated in the PR body; owner can revisit.
- 2026-10-20 (Revision): regions are review signals only; sole automatic exclusion = single record outside the species' core region (core = region with most countries; Americas merged). Overrides support `keep`/`remove`.
- 2026-10-20 (S6): `iucn-id` fires on 10 species, not the 4 the plan expected. The brief's "no P627 at all" species (12 Heosemys, 15 Malacochersus, 17 Carettochelys, 20 Centrochelys, 22 C. abingdonii, 62 Andrias; plus 4 Platysternon) have no item carrying the *base* id, but their own P225 item has one P627 that differs from base, so §5.1's rule flags them. Rule unchanged; V5 list extended to all 10. All 10 go in the PR as suspect CC IUCN ids.
- 2026-10-20 (S7): COL names compared without a subgenus (`Marmota (Petromarmota) vancouverensis` == `Marmota vancouverensis`); any other spelling difference is `not-found` (Zaglossus bruijni). Smoke on raw: beyond the plan's expected cases, Wikidata disagrees on P10585 for 9 Dendrobates tinctorius, 59 Manis crassicaudata, 73 Pteronura brasiliensis (→ `ids.col` identity) and on P846 for 9 and 19 Chelonoidis niger (→ `ids.gbif` identity, countries null); 27 Zaglossus bruijnii is not-found in both COL and GBIF (spelling `bruijni`). Rules unchanged (brief: never auto-fix); V5 extended. All go in the PR as findings for the owner.

## Log

- 2026-10-20 05:36 UTC: Baseline. typecheck, build, db:load x2, seed:cc idempotency all pass; no lint/tests/E2E exist.
- 2026-10-20 05:55 UTC: Architecture. architect wrote findings + target design (base.json/species.json split, raw snapshots, derive rules, countries rule, D1–D12); ~25 live API calls, evidence in agent-state arch/. No code changed.
- 2026-10-20 06:01 UTC: Fable review. APPROVE_WITH_CHANGES; 1 MUST-FIX (SPARQL UNDEF for null IUCN id → throw instead), 2 missed (MX false positives in region rule, rename/derive sequencing), 5 should-consider. Plan-only change.
- 2026-10-20 06:02 UTC: Astra review. APPROVE_WITH_CHANGES; 3 MUST-FIX (region rule auto-excludes valid records → review signals; occurrence-license provenance gap; P846 multi-value must null before cross-check), 4 should-consider. Plan-only change.
- 2026-10-20 06:22 UTC: Revision. architect resolved all 5 MUST-FIX + 2 missed (countries rule → review signals + 1-record-outside-core stray rule; license filter CC0/CC-BY; multi-value before cross-check; UNDEF throw; 3-commit green migration); all should-consider adopted. ~230 GBIF calls, evidence in agent-state revision/. Plan-only change.
- 2026-10-20 06:33 UTC: Steps. planner wrote S1–S11 (base split, 3 ingests w/ snapshots, rule modules test-first, switch commit, seed:cc+docs, spot-checks, PR), Verification V0–V9, Failure modes F1–F9. Plan-only change.
- 2026-10-20 06:34 UTC: S1. `data/base.json` (copy of species.json, ids→{iucn}), `scripts/json.ts`, `BaseSpecies`/`validateBase`, seed:cc writes base.json + throws on double match. typecheck+build green; V2 seed:cc (CC 677eb61a) no diff; F1 dup profile exits 1, data/ clean; db:load 76.
- 2026-10-20 06:37 UTC: S2. `http.ts` (UA, 500 ms pacing, retries/backoff, stderr log), `raw.ts`, `ingest.ts` CLI, `ingest/wikidata.ts` (§3 template, bindings sorted); `ingest`+`test` scripts. W11 red (1 fail, no module) then green. Live ingest: 441 bindings, 76 names → 1 item each, 188 KB, retrieved 2026-10-20; 2nd run no churn; `ingest nope` exit 2; typecheck+test+build green.

- 2026-10-20 06:38 UTC: S3. `ingest/col.ts` (3LR → allowlisted release COL26.10 key 316595, 76 matches keyed by name, `created/modified/modifiedBy` stripped), `raw.ts` `omitKeys` + `assertNoIucnData`. Live: 76 matches, 464 KB, no IUCN/volatile keys; 2nd run no churn; F4 (timeout 10) exit 124, snapshot intact, no temp file. typecheck+test+build green. Noted for S7: subgenus in `usage.name` (2), Zaglossus spelling variant, 2 COL synonyms, Chelonoidis abingdonii higherrank.
- 2026-10-20 06:43 UTC: S4. `ingest/gbif.ts` (backbone checklist allowlist, country enum 250, v2 match w/ timeTaken/timings/additionalStatus/left/right stripped, occurrence facets fixed param order, sorted, facetLimit guard), `raw.ts` GBIF types + `assertOpenLicenses` + `gbifTaxonKey`. G7 red (1 fail) then green. Live: 76 species all with occurrences, 288 KB, 397,200 records / 521 country entries (= revision evidence exactly), Blanding's CA+US, Ili pika count 0, no IUCN/volatile keys. typecheck+test+build green. Noted for S7: 4 GBIF synonyms (Emydoidea, Smutsia gigantea, Smutsia temminckii, Tapirus bairdii), not just 2.
- 2026-10-20 06:51 UTC: S5. `derive/countries.ts` (§5.4 constants + justification, core by countries/records/all-tied, Americas merged, stray/captive-suspect/borderline, `parseOverrides` + keep/remove applied last, null countries reject overrides, calls `assertOpenLicenses`), `Mismatch`/`CountryOverride` types. K1–K10 red (1 fail, no module) then green. Smoke on raw gbif: 76 species, 482 codes, Ili pika `[]`, 39 strays, 54 captive-suspect + 97 borderline review (= revision evidence, no drift). typecheck+test+build green.
- 2026-10-20 07:05 UTC: S6. `derive/wikidata.ts` (`assertWikidataFresh`, `bindingsByName`, `deriveWikidata`: pooled values, cardinality first, P846/P10585 multi-value entries + evidence handed to S7, P627 rule, Q-id/integer validation). W1–W10 red (1 fail, no module) then green (22 tests). Smoke on raw: 76/76 ids.wikidata, inat 74, ncbi 75; iucn-id on 4,12,15,17,18,19,20,21,22,62 (see Decisions); multi-value inat 35, 40; ncbi not-found info 1; no P846/P10585 multi. typecheck+test+build green.
- 2026-10-20 07:30 UTC: S7. `derive/col.ts` (§5.2: subgenus-free name compare, accepted/provisionally accepted, synonym → identity naming accepted, P10585 cross-check, genus check, missing rank → taxonomy not-found, taxonomy-info, `colLicense`), `derive/gbif.ts` (§5.3: EXACT/SPECIES/name/Animalia, P846 cross-check, status, synonym-info, lump guard, `gbifBackboneLicense`); `ColMatchResponse` types in raw.ts. C1–C9 + G1–G6 red (2 files fail, no modules) then green (37 tests). Smoke on raw: COL settled 69/76 (taxonomy from COL 69, 0 taxonomy-info: base already = COL), GBIF settled 73/76, countable 73; 22 not-found col, synonym-info 1/55/63/70, no lump hits; extra identity cases in Decisions. typecheck+test+build green.
- 2026-10-20 07:50 UTC: S8. `derive/record.ts` (fixed key order, sources[] sorted, `assertCitations`), `derive.ts` CLI (validateBase, wikidata/col/gbif staleness, overrides, taxonKey↔occurrence URL check, sorted entries, summary), `Species` + `range`/`sources`, `Source` type, schema `countries_with_records text[]` + `sources jsonb`, load.ts, `country-overrides.json` `[]`, first derived outputs. S1 red (1 fail, no module) then green (41 tests). derive: wikidata 76, gbif 73, col 69, inat 74, ncbi 75, taxonomy from COL 69; countries 72 listed / 1 `[]` (47) / 3 null (9, 19, 27, per S7 identity/not-found) / 472 codes; 214 entries (38 stray, 53 captive-suspect review, 95 borderline; vs smoke 482/39/54/97, gap = the 3 null species). V3–V6 pass (db 76|73|1|472|76), F2, F3 pass; typecheck+test+build green. Transcript `verify/verify-S8-*.log`, `derive-S8.txt`.
- 2026-10-20 08:05 UTC: S9. AGENTS.md "Data": file owners, command order (seed:cc → ingest → derive → db:load; test), never hand-edit derived, countries = "with records" not native range, CC0/CC BY only + CC BY 4.0 field + no DOI, §5.4 rule + constants, overrides format. `plans/001-mvp.md`: Record (`range.countriesWithRecords`, no realms, sources[] shape), Crosswalk (`ids.gbif` legacy backbone, `ids.col` = COL XR key), Range (MVP) text + RESOLVE realms later, Step 2 without Natural Earth (done mark in S11), step-3 GBIF derived dataset, realms under Later. typecheck+test (41)+build green; V2 seed:cc (CC 677eb61a) no diff; V3 derive twice + purity no diff.
- 2026-10-20 07:03 UTC: S10. Spot-checked 1, 25, 28, 2, 18 vs fresh Wikidata EntityData, ChecklistBank taxon+classification, GBIF species + stored occurrence URL: 55/55 fields ok, 0 rule bugs; fresh occurrence counts = raw exactly (no drift). Findings for PR: 18 base IUCN 22971 = Wikidata P627 of *Vidumelon wattii* (snail), own item 39621; Blanding's license filter keeps 1,309/11,390 records (89% CC BY-NC), countries unchanged. Screenshots: Wikidata only (COL blank in headless_shell, gbif.org Cloudflare-blocks it). Upstream note: Wikidata banner says the Query service is migrating to a new endpoint; ingest may need it later. V7 wikidata+col same-day re-ingest: no churn; V8 ok. Artifacts `spot-checks/` (spot-checks.md, raw/, screenshots/), scripts in `smoke/`. Plan-only change.
- 2026-10-20 07:04 UTC: S11. origin/main a57313f already ancestor, no rebase. PR body `$L/pr-body.md` (coverage, 214 entries by kind, 10 suspect CC IUCN ids, identity/not-found/synonyms/multi-value, countries rule + override howto, license cost, verification). Opened PR #3 (https://github.com/kc0588615/critwire/pull/3); 001-mvp step 2 "Done: PR #3". Plan-only change; V9 after push.

## Summary
