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

Architect, 2026-10-20. Evidence comes from about 25 polite live calls (GBIF, ChecklistBank, Wikidata). Their responses are saved in `/srv/critter-ai/agent-state/missions/critwire-ingest/arch/`.

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
- Blanding's filtered counts today are CA 7,304 and US 4,086 (the brief said about 8,700 and 7,700). This is upstream drift with no design impact.

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
- **Migration:** `git mv data/species.json data/base.json`, then mechanically drop the five null derive-owned ids. Don't re-seed: CC may have moved since step 1. Then confirm that `pnpm seed:cc /srv/critter-ai/critter-connect/db/content/animals` reproduces the file with no diff, and report any diff instead of merging it.

#### §2 Modules

No new dependencies (global `fetch`, `node:test`).

```
scripts/species.ts         types (BaseSpecies, Species, Source, Mismatch, CountryOverride), file URLs, validateBase()
scripts/json.ts            readJson; writeJson(url, value, {canonical}) → 2-space + "\n", atomic tmp+rename; canonical = keys sorted recursively
scripts/http.ts            getJson(url, init?): the only network entry point (§3)
scripts/raw.ts             snapshot types per source; readSnapshot/writeSnapshot(source); utcDate(); assertNoIucnData()
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
| `gbif` | `GET /v1/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`, `GET /v1/enumeration/country`, then 76 × v2 match, then 1 occurrence facet query per species-rank match | `{retrieved, checklist: {key, title, doi, license, pubDate}, countries: {<iso2>: {gbifRegion, title}}, species: {<scientificName>: {match: {url, response}, occurrences: {url, response} \| null}}}`. The match response drops `diagnostics.timeTaken`, `diagnostics.timings` and `additionalStatus`. Facet `counts` are sorted by `name`, because ties in count order aren't stable. Ingest throws if `counts.length ≥ facetLimit`. |

Query details:

- **Wikidata.** This is the exact template. VALUES lists base records in id order, with `UNDEF` for a null IUCN id. Tested live: 441 rows, and all 76 names give exactly one item.
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
- **GBIF match:** `https://api.gbif.org/v2/species/match?checklistKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c&scientificName=…`. This pins the legacy backbone; v1 match can't be pinned. The occurrence facets are only fetched when `usage.rank == "SPECIES"`.
- **GBIF occurrences:** `https://api.gbif.org/v1/occurrence/search?checklistKey=d7dddbf4-…&taxonKey=<acceptedUsage.key ?? usage.key>&facet=country&facetLimit=300&limit=0&occurrenceStatus=PRESENT&hasGeospatialIssue=false&hasCoordinate=true&basisOfRecord=HUMAN_OBSERVATION&…`. The 7 allowed `basisOfRecord` values follow, repeated, in the brief's order, and the parameters always appear in this fixed order.
  - The `checklistKey` pin is real: a bogus key returns 400.
  - The default taxonomy still resolves numeric backbone keys: `taxonKey=39LSJ` returns 0 records.
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
    { "source": "GBIF.org occurrence search", "fields": ["range.countriesWithRecords"], "retrieved": "2026-10-20",
      "url": "https://api.gbif.org/v1/occurrence/search?checklistKey=d7dddbf4-…&taxonKey=5220530&facet=country&…" },
    { "source": "Wikidata", "fields": ["ids.wikidata", "ids.inaturalist"], "license": "CC0 1.0", "retrieved": "2026-10-20",
      "url": "https://www.wikidata.org/wiki/Q185526" }
  ],
  "replacedBy": null
}
```

**Countries:** `countriesWithRecords` holds ISO alpha-2 codes, sorted. It is `null` when the GBIF taxon isn't settled and `[]` when it's settled but no country remains. It holds no counts, so a re-ingest doesn't churn the published file; the counts live in raw and in review entries.

**Sources:**
- One entry per source that filled at least one field. Entries are sorted by `source`, and `fields` keeps the fixed order `ids.*`, `taxonomy`, `range.*`.
- `ids.iucn` comes from base (CC), so it has no third-party entry. The photo keeps its own license.
- **Licenses:**
  - Wikidata: the constant `CC0 1.0`.
  - COL: ChecklistBank's `"cc by"` maps to `CC BY 4.0`, as the brief says.
  - GBIF backbone: the `…/by/4.0/legalcode` URL maps to `CC BY 4.0`.
  - Any other license string throws.
- The GBIF occurrence entry has **no `license`** (brief: "leave the field out and note it"). Records are CC0, CC BY or CC BY-NC depending on the dataset, facet queries get no DOI, and the country list is critwire-derived.
- Wikidata's `url` is the entity page, because the single batch SPARQL has no per-species URL. The exact query is kept in raw.

#### §5 Derive rules

Rules run per base species in id order, using the name `N`.

**Staleness checks:**
- Derive throws `data/raw/wikidata is stale: run pnpm ingest wikidata` unless `raw.query === wikidataQuery(base)`. That one check catches a changed base and a changed query.
- For COL and GBIF, the set of names in raw must equal the set of base names, or derive throws.

**§5.1 Wikidata** (P225 truthy, exact)

- Items are the distinct `?item` values for `N`.
- **0 items:** `ids.wikidata`, `ids.inaturalist` and `ids.ncbi` are null, with a `not-found` blocking entry.
- **More than 1 item:** all three are null, with a `multi-value` blocking entry.
- **Exactly 1 item:** `ids.wikidata = "Q…"`. Then:
  - **P3151 and P685:**
    - One value: a positive integer. A value that isn't an integer throws.
    - More than one: null with a `multi-value` blocking entry.
    - None: null with a `not-found` **info** entry.
  - **P627:** an `iucn-id` blocking entry is written in either case below. `ids.iucn` always keeps the base value. Items found only through the base IUCN id are never used for any id: they only appear in the reason.
    - The item has P627 values and the base id isn't among them.
    - Or the base id is the P627 of an item whose P225 isn't `N`. Live cases: Rafetus swinhoei with 22971 gives *Vidumelon wattii*, Chelonoidis niger with 9010 gives *Geochelone gigantea*, and Astrochelys radiata with 3901 gives *Carinurella paradoxa*.
  - **P10585 and P846** are used only as the cross-checks below.

**§5.2 COL**

The match is accepted only if all of the following hold:
- `match == true`;
- `type ∈ {exact, variant}` and `usage.name == N`;
- `usage.rank == "species"` and `usage.status == "accepted"`;
- the classification includes kingdom `Animalia`.

Otherwise `ids.col` is null and the taxonomy stays the base one, with an entry:
- COL calls `N` a synonym: `identity`, naming COL's accepted name.
- Anything else: `not-found`.

Cross-checks on an accepted match:
- Every Wikidata P10585 value must equal `usage.id`. If not, `identity`: `ids.col` is null and the taxonomy stays the base one.
- COL's genus must equal `N`'s first word. If not, `identity`.

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
- **P846:** every Wikidata P846 value must be in `{usageKey, acceptedKey}`. If none exist, that's fine. If not, `identity`: `ids.gbif` is null.
- **Status `ACCEPTED`:** nothing more.
- **Status containing `SYNONYM`:** the value is kept, with a `synonym-info` (info) entry giving the accepted name and key. Live case: *Emydoidea blandingii* 2442885 → *Emys blandingii* 5220530.
- **Any other status:** `identity`, and `ids.gbif` is null.

`ids.gbif = usageKey` (as the brief says).

**Invariant:** countries are null whenever `ids.gbif` is null, and that field's entry explains both. A further guard: when GBIF's accepted name has a different epithet from `N` (a lump, not a genus move), `ids.gbif` is kept but countries are null, with an `identity` blocking entry on `range.countriesWithRecords`. Otherwise another species' occurrences would be published.

**§5.4 Countries**

Input: the facet counts for the settled taxon key, with `ZZ` dropped. A code that's missing from the snapshot's country enumeration throws.

Let `T` be the sum of the counts, `top` the maximum count, `core` the set of GBIF regions of every country with count `top`, and `region(c)` country c's GBIF region. Each country `c` is handled by the first rule that applies:

1. `count(c) == top` → keep. The top country is never dropped, so no species with records ends up blank.
2. `region(c) ∉ core` → excluded, `country-captive-suspect` ("far outside the rest").
3. `T ≥ 50` and `count(c) == 1` → excluded, `country-borderline`. This is the minimum-records rule: once a species has 50 or more records, a country needs at least 2.
4. Otherwise → keep.

Then the overrides apply (§5.5). If no country remains (that is, `T == 0`), the result is `[]` with a `no-records` info entry.

Evidence for the rule (2026-10-20, the brief's filters including `hasCoordinate=true`):

| Species (filtered records) | What the counts show |
|---|---|
| Ili pika (1), De Winton's golden mole (1) | CN 1 and ZA 1. Any fixed minimum of 2 or more leaves them blank. |
| Saola (3) | VN 2, LA 1. LA is native. |
| Tiger (5,734) | BT 4, KH 4 and VN 2 are native but thin. DE 6 is captive. US 69 is 66 museum specimens. Singletons: DK, IT, KE, KR, MN, MW, NL, SE, TW. |
| Axolotl (333) | MX 241. GB 81: one dataset, all `PRESERVED_SPECIMEN`, all from 1905. Also CA 3, DE 2, NZ 2, US 2, AT 1, UA 1. |
| Cheetah (9,045) | IR 33 is native. US 56 and AU 11. Singletons: EG, ET, MZ, NG, PS. |
| Jaguar (143,013) | US 140 is native (Arizona). CA 2, CL 2, PL 1, UY 1. |
| Hirola (58) | KE 57, US 1. |

What follows from the evidence:
- Counts can't separate DE 6 (captive) from BT 4 (native).
- A rule based on share of records would drop native countries of species whose records are skewed to one country: tiger's BT is at 0.07%, jaguar's SR at 0.01%.
- So the count rule only removes single stray records where the evidence is plentiful. Of the 19 sample singletons at `T ≥ 50`, 17 aren't current wild populations (the exceptions are cheetah ET and MZ).
- The region rule is the only signal that catches axolotl GB (24% of its records).

On the samples, the rule:
- **Excludes:** tiger DE, US, BR, CA and ZA plus 9 singletons; axolotl GB, CA, DE, NZ, US, AT and UA; cheetah US, AU, NL, DE, IN and IQ; jaguar CA and PL; hirola US.
- **Keeps:** saola LA, the golden mole and the pika.
- **False positives (excluded but real):** tiger RU (GBIF puts RU in EUROPE), cheetah IR, ET and MZ, jaguar US. The owner restores these with `add`.
- **Misses (kept but likely captive):** tiger JP 2, jaguar CL 2. The owner drops these with `remove`.

Every country a rule excludes gets exactly one entry, so nothing disappears silently. Kept countries get no entry. The constants (`50` and the rule order) live at the top of `derive/countries.ts` with this justification, and in `AGENTS.md`.

**§5.5 `data/review/country-overrides.json`**

The file is `[]` now and owned by the owner. Each element is `{"speciesId": 25, "country": "RU", "action": "add" | "remove", "reason": "…"}`.

Derive applies the overrides last and throws on:
- keys that aren't exactly those four;
- an unknown `speciesId`;
- a country code not matching `^[A-Z]{2}$`, or `ZZ`;
- an empty `reason`;
- a duplicate `(speciesId, country)`;
- `add` of a country with no filtered records, because the field means "with records";
- any override on a species whose countries are `null`.

What each action does:
- **`add`** restores an excluded country.
- **`remove`** drops a kept one.
- A no-op is allowed.
- A country covered by an override gets no `country-*` entry: the override and its reason are the record of the decision.

**§5.6 `data/review/mismatches.json`**

Entries are sorted by `speciesId`, then `field`, `kind` and `country` (absent sorts as `""`), comparing code units. The key order is fixed:

```json
{ "speciesId": 18, "scientificName": "Rafetus swinhoei", "field": "ids.iucn", "kind": "iucn-id", "severity": "blocking",
  "values": { "base": 22971, "wikidata": ["39621"], "wikidataItemsWithBaseId": { "Q3074062": "Vidumelon wattii" } },
  "reason": "Wikidata Q1075096 (P225 Rafetus swinhoei) has P627 39621; 22971 is P627 of Q3074062 (Vidumelon wattii). Kept 22971." }
{ "speciesId": 25, "scientificName": "Panthera tigris", "field": "range.countriesWithRecords", "kind": "country-captive-suspect",
  "severity": "blocking", "country": "DE",
  "values": { "gbif": { "records": 6, "region": "EUROPE", "speciesRecords": 5734, "coreRegions": ["ASIA"] } },
  "reason": "DE (EUROPE) is outside the top country's region (ASIA); excluded. Add via country-overrides.json if wild." }
```

**Severity:**
- `blocking`: the field is null, kept from base, or the country is excluded because of this entry, so a person settles it upstream, in base, or in overrides.
- `info`: the value was filled normally or is simply absent upstream.

Every null `ids.{wikidata,gbif,col,inaturalist,ncbi}` has exactly one entry. `values` is keyed by source (`base`, `wikidata`, `col`, `gbif`) and arrays inside it are sorted. Reasons use only integers and strings: no floats, no `localeCompare`.

| kind | field | severity |
|---|---|---|
| `not-found` | ids.wikidata, ids.col, ids.gbif, taxonomy | blocking |
| `not-found` | ids.inaturalist, ids.ncbi (no value on the item) | info |
| `multi-value` | ids.wikidata, ids.inaturalist, ids.ncbi | blocking |
| `identity` | ids.col, ids.gbif, range.countriesWithRecords | blocking |
| `iucn-id` | ids.iucn | blocking (base value kept) |
| `synonym-info` | ids.gbif | info |
| `taxonomy-info` | taxonomy.class, .order, .family or .genus | info |
| `country-captive-suspect`, `country-borderline` | range.countriesWithRecords (+`country`) | blocking (excluded) |
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
- `jsonb_array_length(sources)` is at least 1 for each species that has any third-party field.

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

**COL**
- C1: exact or variant match with the same name → id plus taxonomy.
- C2: variant with a different name → `not-found`, base taxonomy.
- C3: COL synonym → `identity`.
- C4: P10585 differs from the COL id → `identity`, `ids.col` null, base taxonomy.
- C5: a missing rank → `not-found` on taxonomy.
- C6: genus differs from `N`'s first word → `identity`.
- C7: a rank differs from base → `taxonomy-info`.
- C8: unknown license → throws.

**GBIF**
- G1: EXACT, SPECIES, same canonical name, no P846 → `usageKey`.
- G2: synonym with P846 equal to the usage key or the accepted key → filled plus `synonym-info`.
- G3: P846 outside that set → `identity`, ids.gbif and countries null.
- G4: FUZZY, HIGHERRANK or another name → `not-found`.
- G5: accepted epithet differs → id kept, countries null plus `identity`.
- G6: key that isn't an integer → throws.

**Countries**
- K1: `ZZ` dropped.
- K2: `T < 50` keeps singletons (saola).
- K3: `T ≥ 50` same-region singleton → `country-borderline`.
- K4: other region, any count → `country-captive-suspect` (axolotl GB 81).
- K5: top and tied-top countries are never dropped, and ties in different regions all count as core.
- K6: unknown country code → throws.
- K7: overrides: `add` restores and removes the entry; `remove` drops; `add` without records throws; unknown species, duplicates or bad keys throw.
- K8: `T == 0` → `[]` plus `no-records`.
- K9: output sorted and stable when the input order is shuffled.

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

#### §9 Decisions (architect)

- **D1** `base.json` and `species.json` are split (findings 1 and 2).
- **D2** GBIF match uses v2 pinned with `checklistKey`, and `additionalStatus` is stripped. Occurrence search is pinned the same way.
- **D3** COL classification comes from the match response.
- **D4** The COL release record is allowlisted.
- **D5** The Wikidata source `url` is the entity page.
- **D6** The countries rule and thresholds are as in §5.4.
- **D7** The GBIF occurrence source has no `license`.
- **D8** Countries are stored as codes only.
- **D9** The DB uses a `text[]` column and `sources jsonb`.
- **D10** Request logs go through a stderr redirect; the code holds no path.
- **D11** Unit tests cover the derive rules only.
- **D12** One snapshot file per source, keyed by `scientificName` (the query input), not one file per species. This gives one `retrieved` date per file and readable diffs, at roughly 0.3–0.7 MB per file.

**Risks:**
- **R1** GBIF regions are political, not biogeographic, which causes the false positives in §5.4. They're visible in review and fixed by overrides.
- **R2** A species whose top country is a museum or zoo country would invert the region rule. Every native country would then be flagged, which is obvious when reviewing; the spot-check should include one heavily zoo-recorded species.
- **R3** API shape changes are caught by field validation, which throws.
- **R4** `mismatches.json` may hold roughly 300–400 country entries, mostly correct exclusions. The PR body summarizes them by kind, and the owner only scans for false positives.

**Notes for `plans/001-mvp.md`:**
- The Record example becomes `"range": { "countriesWithRecords": [] }` and shows the `sources[]` entry shape above.
- Crosswalk: `ids.col` doubles as the COL XR key.
- GBIF occurrence aggregates have no DOI and no single license.

### Rejected alternatives

- **One `species.json` that seed:cc merges into:** two writers, the step-1 taxonomy is lost after the first derive, and derive's output would depend on its own past output.
- **A `species_country` child table:** it loses null versus `[]` (it would need a flag column), and the file is the interface anyway.
- **GBIF v1 `species/match`:** it can't pin the backbone. (It does carry no IUCN fields, but v2 plus a strip and guard is explicit.)
- **The separate COL `/taxon/{id}/classification` call:** the data is identical to the match response's, at 76 more requests.
- **Per-country `datasetKey`/`basisOfRecord` facets** to detect "one sound or zoo archive": about 700 more requests, and deciding which datasets are zoo archives needs dataset metadata. The region rule already catches the brief's examples.
- **Share-based or per-record `continent` thresholds:** they drop native countries of skewed species, and axolotl GB holds 24% of its species' records.
- **A hand-made table of transcontinental countries:** it's judgement-laden data, and it would still miss the MX/US split. Overrides are cheaper.
- **Flagged countries kept by default:** a zoo country would be published until the owner acts, which contradicts "a blank with a reason beats a guess".
- **A year cutoff:** it isn't in the brief, it changes what the field means, and it drops old specimens of data-poor species.

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-10-20 05:36 UTC: Baseline. typecheck, build, db:load x2, seed:cc idempotency all pass; no lint/tests/E2E exist.
- 2026-10-20 05:55 UTC: Architecture. architect wrote findings + target design (base.json/species.json split, raw snapshots, derive rules, countries rule, D1–D12); ~25 live API calls, evidence in agent-state arch/. No code changed.

## Summary
