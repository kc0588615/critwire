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

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Run 2026-11-01 on `5ec037f` (= `origin/main` `daa896d` + mission start), worktree db `critwire_dev`-style target from `.env`.
- `pnpm install --frozen-lockfile`: up to date. No migrations (build rebuilds `db/schema.sql` tables each run). No lint script in `package.json`; typecheck is the static check.
- `pnpm typecheck`: pass.
- `pnpm test`: 703/703 pass (133 s).
- `pnpm build` (plain): pass; `dist/learn/data/` 96,026,477 B, committed lab data 18,822,906 B.
- `pnpm e2e`: 98/98 pass (7.2 min); artifacts `/srv/critter-ai/agent-state/missions/critwire-review-presort/e2e-baseline/`.
- `dist/` hashes: 311 files, `sha256sum` list at `/srv/critter-ai/agent-state/missions/critwire-review-presort/dist-baseline.sha256` (list's own sha256 `e9b15e99…2adee`). Live `/srv/apps/critwire/.live` hashes identical (diff empty). Re-check: `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) | diff - <state>/dist-baseline.sha256`.
- Review queue `data/review/mismatches.json`: 214 entries. By kind: country-borderline 95, country-captive-suspect 91, iucn-id 10, identity 7, synonym-info 4, not-found 4, multi-value 2, no-records 1. By severity: blocking 60, review 148, info 6. `country-overrides.json`: `[]`.

## Architecture

### Findings (ranked)

1. **An override that changes a published country blocks the next release, and nothing says so.** AGENTS.md (Countries, Overrides) and derive's own entry reasons (`scripts/derive/countries.ts:84,90,93`: "Settle with keep or remove in country-overrides.json") make settling look like one file edit plus `pnpm derive`. That holds only for **confirming** overrides (keep a kept country, remove an excluded stray): they just delete the entry from `mismatches.json`, which no build output contains. An **output-changing** override (remove a kept country, keep an excluded stray) changes `data/species.json`, so `/v1` and Learn's lab data (`dist/learn/data/postgis/learn_curriculum.sql` holds `species_countries`; `star/fact_species_country.csv`). Their sha256s enter every ran lab block's key (`scripts/learn/freshness.ts:1-14`, manifest `files`). Plain `pnpm build`, and so `deploy`, then refuses "lab <id> is stale: run pnpm learn:check". Results also change for the ~15 blocks that count `species_countries`/`range_status`: `setup-counts` (472 rows in `e2e/__snapshots__/setup-counts.txt`), `f3-*`, `d2-country-copies`, `pg-smoke`, `d4-xmin-load`, `d6-star-fact-species-country` and `p2-check`. The 004 rule then requires changing 004, `checked/` and `e2e/__snapshots__/` in one commit, plus prose numbers (`site/learn/modules/f3.html:36`, "The Jaguar has 2,000 records and 20 countries"). Fail fast holds (the build refuses), but the established interface hides the cost until deploy time. **Fix:** every proposal is classified as confirming or output-changing (`changesOutput`). 005 splits the high-confidence set that way, `review:accept` gets `--confirm-only` and prints the follow-on whenever a published country changes, and AGENTS.md Overrides gets one line. Derive is unchanged.
2. **The countries rule's record filters can't be reused for a records query.** `occurrenceSearchQuery` (`scripts/ingest/gbif.ts:35`) hardcodes `limit=0`, and `OCCURRENCE_FILTERS` (`:27`) is private. Evidence must count exactly derive's records (license, basisOfRecord and geospatial filters); a copied filter list would drift (DRY). **Fix:** an optional third parameter `limit = 0`. Existing URLs stay byte-identical, and `assertGbifFresh` (`scripts/derive/gbif.ts:42-43`) proves it on every derive and build.
3. **The SPARQL POST, the COL API base and the atomic text write are inline or private** (`scripts/ingest/wikidata.ts:44-50`, `scripts/ingest/col.ts:7`, `scripts/json.ts:39-43`). **Fix:** export `postSparql(query): Promise<unknown>` (`fetchWikidata` calls it and keeps its own head and bindings checks), rename and export `API` as `COL_API`, and extract `writeText(url, text)` (temp + rename) from `writeJson`, which calls it (same bytes). Accept's byte-exact backup (Q5) needs `writeText`. Minor.
4. **Review entries have no id.** `Mismatch` (`scripts/species.ts`) has no id field. Derive sorts by (speciesId, field, kind, country) (`pipeline.ts:118`) but never asserts that this tuple is unique. In live data it's unique, and (speciesId, country) is unique across the 186 country entries. **Fix:** the presort builds keys and asserts uniqueness itself; derive is out of scope.

Fine as is (verified, reused unchanged):
- **Override validation.** It's complete for AGENTS.md's rules: `parseOverrides` (`countries.ts:133`: keys, species, code, action, reason, duplicates), `deriveCountries` (`:47`, `:57-59`: a keep without records, a species with null countries) and `matchCountries` (`naturalearth.ts:111`: a kept code with no country row). The proposal is therefore validated by running `deriveCore` with the proposal as its overrides. There is no second validator.
- **DOIs, habitat and `countries.json`** don't depend on overrides (Q6).
- **Nothing scans `data/review/` or `plans/`.** Derive and build read explicit paths (`readCoreInputs`, `pipeline.ts:61`), and `learn-port` reads only 004. New files there are invisible to them.

### Target design

#### Flow, files, modules

```
mismatches.json + data/raw/{gbif,col,wikidata} + species.json
  └─ pnpm review:evidence  (network, read-only, ≤ 2 req/s) ─► data/review/presort/evidence.json
evidence.json + data/review/presort/recommendations.json (agents write)
  └─ pnpm review:presort [--check]  (offline, pure)        ─► plans/005-review-presort.md
                                                            ─► data/review/country-overrides.proposed.json
proposal + recommendations + evidence + country-overrides.json
  └─ pnpm review:accept  (only on the owner's word)        ─► country-overrides.json, then pnpm derive
```

| File | Writer | Read by |
|---|---|---|
| `data/review/presort/evidence.json` | `pnpm review:evidence` | `review:presort`, `review:accept` |
| `data/review/presort/recommendations.json` | agents (owner may edit) | `review:presort`, `review:accept` |
| `plans/005-review-presort.md` | `pnpm review:presort` | people |
| `data/review/country-overrides.proposed.json` | `pnpm review:presort` | `review:accept`, the validation test |
| `data/review/country-overrides.json.pre-accept` (untracked, only during an accept) | `pnpm review:accept` | its A13 refusal, and the Undo command (Q5) |

Modules. Pure modules have no fs or network; the CLIs only do IO and printing.
- `scripts/review/presort.ts` (pure): the file URLs, types `Evidence` and `Recommendation`, `entryKey`, `indexEntries`, `statusQuo`, `changesOutput`, `assertEvidence`, `assertRecommendations`, `sameFlag`, `proposalOf`.
- `scripts/review/evidence.ts`: fetch and normalize, no fs. Exports `fetchEvidence(entries, snapshots, species)`.
- `scripts/review/render.ts` (pure): `renderPresort(...)` returns 005's text.
- `scripts/review/accept.ts` (pure): `parseAcceptArgs`, `selectProposals`, `mergeOverrides`, `countryChanges`, `backupFile` (the URL).
- CLIs: `scripts/review-evidence.ts`, `scripts/review-presort.ts` and `scripts/review-accept.ts`, plus three `package.json` scripts.
- Reused as they are: `getJson` (`http.ts`); `occurrenceSearchQuery` and `BACKBONE_KEY` (`ingest/gbif.ts`); `postSparql` and `WIKIDATA_ENDPOINT` (`ingest/wikidata.ts`); `COL_API`; `gbifTaxonKey`, `assertNoIucnData` and `readSnapshot` (`raw.ts`); `utcDate`; `bindingsByName` (`derive/wikidata.ts`); `readJson`, `readOptionalText`, `writeJson`, `writeText` and `formatJson` (`json.ts`); `parseOverrides`; `deriveCore`, `readCoreInputs`, `deriveAll`, `readDeriveInputs` and `assertDerivedFiles` (`derive/pipeline.ts`); `mismatchesFile` and `overridesFile` (`species.ts`); `isDeepStrictEqual` (as in `derive/sample.ts`).

**Entry keys** (`entryKey`). A country entry is `<speciesId>:<CC>` (`25:DE`): the same pair `parseOverrides` treats as unique, so one key names exactly one override. Any other entry is `<speciesId>:<field>:<kind>` (`9:ids.gbif:identity`). `indexEntries` throws on a repeated key.

**`statusQuo(entry)`**: `remove` for `country-captive-suspect` + `blocking` (an excluded stray), otherwise `keep` (§5.4 table). `changesOutput(entry, action)` is `action !== statusQuo(entry)`. Both are pure queries, used by R4, `--confirm-only`, 005's summary and accept's report.

**`sameFlag(a, b)`**: the two entries are equal once `values.gbif.speciesRecords` and `reason` (which quotes that total) are left out. Everything that decides the flag stays compared: kind, severity, country, records, region and core. Accept uses it (A8), so a re-ingest that only moves a species' total doesn't void its keys.

**`assertEvidence(evidence, gbif)`** throws, listing every problem:
- each item's `key` equals `entryKey(entry)`, and keys are unique (`indexEntries`);
- the IUCN gate on the fetched sections (Q1);
- each country item's `taxonKey` equals `gbifTaxonKey` of the species' match in the current GBIF snapshot ("taxon changed: re-run pnpm review:evidence"). This binds the evidence to the identity that derive counts.

`review:presort` and `review:accept` both run `assertEvidence` and `assertRecommendations` before anything else.

#### Q1 Evidence

**Already offline (no request):**
- Each entry's `values`: records, region, T and core.
- Each species' full COUNTRY facet with regions (`data/raw/gbif`): the context line.
- The COL match and release, and the Wikidata P627, P846, P10585 and P3151 values (snapshots).
- `species.json` ids.

The lab sample (`data/raw/gbif-sample`) is **not** used: it caps at 2,000 records per species, which misses flagged countries of large species, and it has no establishment fields.

**Fetched (read-only):**
- **GBIF, one query per country entry (186).** `occurrenceSearchQuery([gbifTaxonKey(match)], ["country=CC", "facet=basisOfRecord", "facet=datasetKey", "facet=institutionCode", "facet=establishmentMeans", "facet=degreeOfEstablishment", "facet=year", "facet=stateProvince", "facetLimit=100"], 20)`: the same taxon key and filters as derive.
  - It stores the `taxonKey` it queried, the live `count` and the facets. A facet whose counts sum below `count` is marked `truncated`. `stateProvince` shows where a large entry's records cluster (a zoo city) at no extra request.
  - It stores up to 20 records, allowlisted to: `key, datasetKey, license, basisOfRecord, institutionCode, year, month, decimalLatitude, decimalLongitude, coordinateUncertaintyInMeters, stateProvince, locality, establishmentMeans, degreeOfEstablishment, issues`, plus `occurrenceRemarks` cut to 200 characters. The allowlist drops GBIF's `iucnRedListCategory` and `recordedBy`.
  - 20 records covers every record of 174 of the 186 entries. The 12 larger ones (for example elephant US 4,461 and dama gazelle ES 390) rely on the facets.
- **GBIF datasets and publishers.** `/v1/dataset/{key}` for every dataset key in those records and facets (title, type, license, doi, publishingOrganizationKey), and `/v1/organization/{key}` for the publisher's title. A zoo publisher is the main captivity signal.
- **COL.** `{COL_API}/dataset/{col.release.key}/taxon/{ids.col}/info` for the 42 country-flag species that have an `ids.col`: the same release derive used. Distributions are allowlisted to area name, globalId, gazetteer and establishmentMeans, never `source` or threat fields.
- **Non-country lookups.**
  - GBIF `/v1/species/{key}` for both keys in the 2 `ids.gbif` identity entries.
  - COL `nameusage/{id}` for both ids in the 5 `ids.col` identity entries and for the 2 `ids.col` not-found variants: name, rank, status, accepted.
- **Wikidata: one SPARQL POST** (`postSparql`).
  - Items: those from the snapshot (`bindingsByName`) plus `wikidataItemsWithBaseId`.
  - Statements of P627, P846, P10585, P3151, P2341 (indigenous to) and P183 (endemic to), with rank, the value's P297 when it's a country, and references (P248, P813).
  - **Label-free:** no `wikibase:label` service, no `rdfs:label` or `schema:name`. Items, references (P248) and ranks stay IRIs or Q-ids, and dates stay dates. A label such as "IUCN Red List" would trip the gate. Variable names and the stored query avoid "iucn" too (property ids only), unlike the ingest's `?iucnItem`.

**Budget:** 186 + up to 300 datasets + up to 150 organizations + 42 + about 15 + 1 = **up to about 700 requests, at most 6 min** through `getJson` (pacing at ≤ 2 req/s, retries, one stderr line per attempt). Run it as `pnpm review:evidence 2>> /srv/critter-ai/agent-state/missions/critwire-review-presort/review-evidence.log`.

**Shape and writing.**
- Shape: `{retrieved, sources[], entries: [{key, entry, gbif|null}], datasets, organizations, col, gbifSpecies, wikidata}`.
- `entries[].entry` copies `mismatches.json` verbatim: the queue the evidence was gathered for.
- All or nothing: the file is built in memory first. Free text matching `/iucn/i` (locality, remarks, titles, area names) is set to `null`, and the record stays citable by key.
- **The IUCN gate** (`assertNoIucnData`, `raw.ts:95`, which throws on any key or string matching `/iucn/i`) runs on the fetched sections only: `sources`, `entries[].gbif`, `datasets`, `organizations`, `col`, `gbifSpecies` and `wikidata`. It skips `entries[].key` and `entries[].entry`: those are our own queue's words (`ids.iucn`, `iucn-id`, "has P627 17585", 20 strings in the live queue), which the gate would always reject. `assertEvidence` re-runs it on every read. Then one `writeJson(…, {canonical: true})` writes the file.
- `sources` cites GBIF.org (each record keeps its datasetKey and license, CC0 or CC BY only by the query's filter), the COL release (as derive cites it) and Wikidata (CC0).

**Where it lives:** committed, about 0.7 MB. The owner and Astra can check every citation and regenerate 005. Derive and build never read it (guard test, Q4).

#### Q2 Recommendations: facts from code, judgment from agents, rubric checked by code

There's no automatic keep or remove rule. Establishment fields are rarely filled, and spotting zoos by a title pattern would be false precision. Code computes and renders facts; agents decide; `assertRecommendations` enforces the parts of the rubric a script can check.

**What keep and remove mean.** This is the assumption 005 states at its top, and the owner can override it.
- **keep:** at least one counted record documents the animal outside captivity in that country: native, introduced or vagrant.
- **remove:** every counted record is captive (a zoo, breeding centre, farm or pet), misplaced (wrong coordinates or country) or misidentified.
- The list stays "countries with open records". 005 never claims range in its own voice: Wikidata P2341/P183 and COL distributions are quoted as theirs.

**Confidence:**
- **high:** the cited records settle it on their own.
  - remove: each counted record is captive or misplaced according to its own fields, its dataset or publisher, or its locality (R7 checks coverage).
  - keep: at least one wild record (a field locality, or a community-verified observation), and an independent source agrees: a second dataset, a COL distribution, or Wikidata P2341/P183.
- **medium:** the evidence points one way, but one condition of high is missing.
- **low:** thin or conflicting evidence. The recommendation is then always the status quo, so accepting it never changes the output.

**`recommendations.json`:** `[{key, recommendation, confidence, reason, cite[]}]`.
- For a country entry, `recommendation` is `keep` or `remove`.
- For any other kind, it's the concrete fix, naming where it lands and what it costs:
  - a Critter Connect profile edit, then `pnpm seed:cc`;
  - a Wikidata edit, then `pnpm ingest wikidata`;
  - or "no action" for `info` entries.
  - A change of scientificName or `ids.gbif` triggers AGENTS.md's "Cost of a species change" (about 1 h). A change of `ids.iucn` makes the Wikidata snapshot stale, because the query embeds the ids. 005 says so for each fix.
- Cites: `gbif:occurrence:<key>`, `gbif:dataset:<uuid>`, `gbif:species:<key>`, `col:<id>`, `wikidata:<Q…>`, or `entry` (the flag's own values).
- `iucn-id` entries can't be settled from IUCN (out of scope). Their fix cites Wikidata's statement and references, and gives the two `iucnredlist.org/species/<id>` links for the owner to click; that's a link, not data.

**`assertRecommendations`** throws, listing every problem it found:
- **R1** coverage: each key exactly once (enforced only in `--check`).
- **R2** every cite resolves in evidence for that key.
- **R3** `keep` or `remove` for country kinds only, and a fix text otherwise.
- **R4** low means the status quo.
- **R5** a country entry at medium or high cites at least one `gbif:occurrence` or `gbif:dataset`.
- **R6** the reason is 1–300 characters (it becomes the override's `reason`).
- **R7** a `high` `remove` needs complete coverage: the live `count` equals the entry's `records`, and the `datasetKey` facet isn't `truncated`, so a judgment per dataset covers every counted record. Twenty records and a truncated facet can't prove that every record is captive.

**Authoring:** agents write in batches by kind, so the same rubric gets applied consistently: the 28 non-country entries, the 38 strays, the 53 kept captive-suspect entries, then the 95 borderline entries in two batches. Each batch runs `pnpm review:presort`, which renders the pending entries' evidence into 005, then writes the batch's recommendations and runs it again.

#### Q3 Generating 005 and the proposal; coverage

**`pnpm review:presort`:**
- Reads `mismatches.json`, evidence, recommendations, `base.json` (common names) and the GBIF snapshot (context).
- Refuses unless evidence `entries` deep-equal `mismatches.json`: "queue changed: re-run pnpm review:evidence".
- Runs `assertEvidence` and R2–R7.
- Writes 005 (entries without a recommendation render as "pending") and the proposal (the recommended country entries only).
- **Deterministic**, so `--check` gives the same answer on any day: `renderPresort` reads no clock. Its only dates are evidence `retrieved` and the snapshots' `retrieved`, in the front matter too. Numbers use a fixed `en-US` format, and the order is speciesId, then key. The proposal holds no date.

**`--check`** (the coverage script):
- R1 complete, so no "pending" entries are left.
- 005 and the proposal equal the regenerated bytes, otherwise "<file> is stale: run pnpm review:presort".
- Each key appears exactly once as an entry heading in 005's text: the literal coverage check.

**005 layout:**
- Front matter; then how to read it (what keep and remove mean, the confidence rubric, the wording rule).
- **Summary table:** recommendation (keep, remove, fix, no action) by confidence, plus a "changes /v1" column.
- **Accept in one go:** the high-confidence keys, split into confirming and output-changing (each with its count, also in the plan's Summary), with both commands and their consequences (Q6). It warns when a species would lose every published country (species 69 has every published country flagged).
- **Per species**, in id order: a heading with id, scientific and common name, and the context line (snapshot counts per country with region, core, T). Then one block per entry:
  - heading `#### <key> · <kind> (<severity>, kept|excluded)`;
  - what was flagged: derive's reason;
  - the evidence: live vs snapshot count, basisOfRecord, datasets (title, publisher, count), years, institutions, establishment values, up to 5 cited records (gbif.org link, coordinates, locality), the COL distribution, and Wikidata P2341/P183;
  - the recommendation, confidence and reason.

**Proposal:** `proposalOf(recommendations)` gives `{speciesId, country, action, reason}` per country recommendation, in AGENTS.md's key order, sorted by speciesId, then country, written with `writeJson`.

#### Q4 Validation

`scripts/review/presort.test.ts` runs in `pnpm test`, offline. Failure modes first:
- **P1** a key missing, repeated or unknown.
- **P2** evidence entries differ from the queue.
- **P3** a wrong recommendation type for the kind.
- **P4** a bad confidence value.
- **P5** low that isn't the status quo.
- **P6** a cite that doesn't resolve, or a country entry at medium or high with no GBIF cite.
- **P7** an empty reason, or one over 300 characters.
- **P8** the committed proposal breaks an override rule.
- **P9** some other script reads the presort files.
- **P10** a `high` `remove` without complete coverage (R7).
- **P11** evidence that breaks `assertEvidence`: a key that isn't `entryKey(entry)`, a fetched string or key matching `/iucn/i` (while `ids.iucn` in `entry` passes), or a changed taxon key.

The tests:
- **"The proposal passes the overrides rules" (P8):** `deriveCore({...await readCoreInputs(), overrides: <proposal JSON>})` doesn't throw. These are the exact checks derive runs on `country-overrides.json`: `parseOverrides`, `deriveCountries` and `matchCountries`. The test doesn't depend on the owner's current overrides; conflicts are accept's job.
- **Reader guard (P9):** one regex, `/overrides\.proposed|review\/presort|from "\.\.?\/(\.\.\/)*review\//`, over every `.ts` file under `scripts/` and `e2e/` except `scripts/review/` and `scripts/review-*.ts`. Together with the `dist/` hash comparison, this proves derive and build don't read the proposal.
- Unit tests of `assertEvidence`, `assertRecommendations` and `proposalOf` for P1–P7, P10 and P11.

Coverage and 005's freshness are **not** in `pnpm test`: they would fail after every legitimate accept or re-ingest. `review:presort --check` runs in this mission's Verification instead.

#### Q5 `pnpm review:accept`

Usage: `pnpm review:accept (--confidence high|medium|low | --ids 25:DE,25:RU) [--confirm-only]`.
- Exactly one of `--confidence` and `--ids`. Each selects only what it says, so it can't select more than the owner expects. "High plus 25:DE" is two runs.
- `--confidence medium` means medium or higher.
- `--confirm-only` keeps only the proposals where `changesOutput` is false.

**Backup:** `backupFile` = `data/review/country-overrides.json.pre-accept`. It's untracked and not ignored, so `git status` shows an unfinished accept. It exists only while an accept is writing.

Flow. Every check runs before any write:
1. Parse the arguments. Refuse if the backup exists (A13).
2. Read the proposal, recommendations, evidence, the GBIF snapshot and the current overrides (exact bytes).
3. `assertEvidence` and `assertRecommendations` (R2–R7) on what was read, then refuse unless the proposal file equals `formatJson(proposalOf(recommendations))`. An edited confidence or cite therefore fails here, whether or not the proposal changed.
4. `selectProposals`.
5. `before = deriveAll(readDeriveInputs())`, then `assertDerivedFiles(before)`, so that the later derive reflects only the accepted overrides.
6. `mergeOverrides(parseOverrides(current), selected)` returns `{merged, added, skipped}`.
   - The owner's existing entries keep their order and text. New ones are appended, sorted by speciesId, then country.
   - The same pair with the same action already present is skipped (already settled). The same pair with another action is a conflict, and it throws.
   - Each added key's evidence `entry` must `sameFlag` an entry in `before.entries`, else the presort is stale for that key (A8). A moved species total is printed as a warning.
7. `after = deriveAll({...inputs, overrides: merged})`. It throws on any override rule.
8. `countryChanges(before.records, after.records)`: per species, the countries added and removed.
9. If nothing was added: print "already accepted", exit 0, write nothing.
10. Write, in this order:
    - `writeText(backupFile, <current bytes>)`;
    - `writeJson(overridesFile, merged)`;
    - spawn `pnpm derive` (cwd: the repo root from `import.meta.url`; stdio inherited);
    - on exit 0, delete the backup.
11. Print the accepted and skipped keys and the country changes. If anything changed, print the follow-on from Q6.

**Recovery.** Derive writes its 6 files one by one (`derive.ts:15-18`). Each write is atomic (temp + rename, `json.ts:39-43`), but the set isn't: a failure or kill between renames leaves some files new and some old. If derive exits non-zero, or a kill leaves the backup, the error (and A13's refusal on the next run) names both ways out:
- **Undo:** `mv data/review/country-overrides.json.pre-accept data/review/country-overrides.json && pnpm derive`. This restores the exact pre-run bytes, including uncommitted earlier accepts that `git restore` would lose. Step 5 proved the pre-run derived files equal derive's output from those inputs, so this derive also rewrites them byte for byte.
- **Finish:** `pnpm derive && rm data/review/country-overrides.json.pre-accept`.

Both re-run derive from inputs, and that is idempotent: derive reads none of its outputs except `issued-ids.json` (`pipeline.ts:61-72`, `sample.ts:53-61`), and an override can't change that file (ids and slugs come from `base.json`, `pipeline.ts:115-117`). A kill during a write can also leave a `<file>.tmp-<pid>`; `git status` shows it, and you delete it.

Accept never writes the proposal, the recommendations or 005. Non-country keys are refused ("not an override; its fix is in 005"): their fixes are follow-on work the owner orders separately. After an accept, the queue no longer equals the evidence, so `review:presort` refuses: 005 is then the record of what was proposed, and a fresh presort needs `review:evidence` first.

**Failure modes**, each throwing with nothing written unless the item says otherwise:
- **A1** no selector, both selectors, an unknown flag, or a bad level: usage message, exit 2.
- **A2** an unknown key.
- **A3** a non-country key.
- **A4** an empty selection.
- **A5** the evidence or the recommendations fail `assertEvidence` or R2–R7, or the proposal differs from `proposalOf(recommendations)` or fails `parseOverrides`.
- **A6** the derived files are stale before the run.
- **A7** a conflict with an override already in the file.
- **A8** the flag moved (`sameFlag` false) or the taxon key changed since the evidence was gathered.
- **A9** the merged overrides break a derive rule.
- **A10** derive fails after the write: the backup stays, and the error names Undo and Finish.
- **A11** a rerun: idempotent, exit 0.
- **A12** a file other than the backup, the overrides file and derive's outputs is touched.
- **A13** the backup exists (an earlier accept didn't finish): refused, naming Undo and Finish.

**Tests:** `scripts/review/accept.test.ts`.
- Pure tests of `selectProposals`, `mergeOverrides`, `sameFlag` and `countryChanges`.
- CLI runs on a **self-contained throwaway copy**. Every path resolves from `import.meta.url`, so the CLI and the `pnpm derive` it spawns act only on the copy. There are no test-only path parameters in production code, and no step reads the real repo's review state (proposal, recommendations, evidence or overrides).
  - **Setup:**
    1. `mkdtemp`; copy `scripts/`, `data/`, `package.json` and `tsconfig.json`; symlink `node_modules`; create `plans/`.
    2. Write the overrides as hand-formatted bytes (`[ ]`, not `formatJson`'s), then run `pnpm derive`. The copy's queue now depends only on the committed raw data.
    3. From that queue, pick two kept country entries of species with at least 2 published countries: K1 gets `keep` (confirming) and K2 gets `remove` (output-changing). Throw if there aren't two.
    4. Write a fixture `evidence.json`: `entries` is the copy's queue, and every country item gets a synthetic `gbif` section (the snapshot's taxon key, `count` = `records`, one synthetic dataset covering them).
    5. Write a fixture `recommendations.json` with K1 and K2 at `high`, citing that dataset.
    6. Run `pnpm review:presort`.
  - **Success** (`--ids K1,K2`): the overrides content, both entries gone, `species.json` changed only in K2's species' countries, and no backup left.
  - A rerun (A11), a conflict (A7, the conflicting override set up and derived first), a hand-edited proposal (A5) and a recommendation edited to `low` with the proposal untouched (A5). Each leaves every file's hash unchanged.
  - **Interrupted derive** (A10, A13). `chmod 0555 data/gbif-learn-sample/`, the last directory derive writes to, so derive fails after five renames (the test throws if run as root, where chmod doesn't block):
    - accept K2 fails, naming Undo and Finish;
    - the backup bytes equal `[ ]`, and `species.json` is already changed;
    - a second accept is refused (A13), with no hash changed;
    - after restoring the mode, Undo leaves the overrides bytes equal to `[ ]` and every hash equal to the pre-run hashes.
  - Afterwards, the real repo's `data/` hashes are unchanged.

#### Q6 What accepting does downstream

| | Confirming override | Output-changing override |
|---|---|---|
| `mismatches.json` | the entry is removed | the entry is removed |
| `species.json`, `/v1` | unchanged | the country is added or removed (removing every published country turns the status into `no-open-records`) |
| Countries DOI | stays current | **stays current**: `gbifContributions` counts every record of the countries query per dataset, strays included (`contributions.ts:2`), and `currentDoi` compares dataset counts only |
| Learn-sample DOI, `habitat.json` | current | current: both come from `sample.csv`, and `deriveSample` reads only `countries.rows` (all 250 rows, which don't depend on any species' list) |
| `data/countries.json` | unchanged | unchanged. All 38 stray codes have a country row, so a keep can't trip `matchCountries` |
| `pnpm build`, `deploy` | pass, `dist/` byte-identical | **refused** ("lab <id> is stale") until `pnpm build --draft && pnpm learn:check --update`. Changed results then need 004, `checked/`, `e2e/__snapshots__/` and the prose numbers changed in one commit, then `pnpm build`, `pnpm e2e` and the deploy. That's a separate follow-on unit, about 1–2 h |

The owner sees this table in 005's "Accept in one go" section, with two reply sentences: "accept the high-confidence set" (`--confidence high`) and "accept the high-confidence confirmations only" (`--confidence high --confirm-only`).

#### Docs and invariants

AGENTS.md changes:
- **Data:** the 4 presort files with their writers, marked "never read by derive or build", and the accept backup.
- **Commands:** the 3 new commands.
- **Overrides:** one line on output-changing overrides (Q6).

`docs/recovery.md` §2 (state Git doesn't hold) gets one line: `country-overrides.json.pre-accept`, which exists only during an accept, and its Undo and Finish commands (Q5).

The mission's end-state proof: `dist/` hashes equal the Baseline's, and `git diff origin/main -- data/review/country-overrides.json data/species.json data/review/mismatches.json` is empty.

#### Q7 Size

About 11 units, well under 25:
1. The exports, the evidence module and CLI, and the evidence run.
2. Presort and render, with their tests.
3. Accept, with its tests.
4. Five recommendation batches (four kinds; the borderline kind in two).
5. The final generation and `--check`.
6. AGENTS.md and `docs/recovery.md`.
7. Verification.

### Rejected alternatives

- **A deterministic keep/remove rule engine over the signals:** the signals are sparse and zoo titles are heuristic, so it would add false precision. The rubric plus mechanical checks (R2–R7) keeps it honest instead.
- **Hand-writing 005 and the proposal:** it would duplicate the reasons, need hand-counted summaries, and make coverage depend on parsing markdown.
- **Evidence only in the mission state folder:** the owner and Astra couldn't check it, 005 couldn't be regenerated, and the checks would depend on uncommitted files.
- **The lab sample as offline per-record evidence:** it's capped at 2,000 records per species and has no establishment fields. The uniform live query costs 186 requests.
- **Confidence in the proposal** (a fifth key, or a prefix in the reason): it breaks the exact override format, or hides data in prose.
- **Accept writing the derived files in-process** (`derivedFiles` + `writeJson`): it would duplicate `derive.ts`'s write loop and summary. Spawning `pnpm derive` is the documented interface; the in-memory `deriveAll` serves only as the pre-write check.
- **Path-injection parameters for accept:** they're test-only code. The throwaway copy runs the real CLI on real paths.
- **`git restore` as accept's undo, or requiring a committed overrides file:** the first loses uncommitted earlier accepts. The second ties a data CLI to git, and the throwaway copy isn't a repo.
- **The backup in `os.tmpdir()` or `~/.local/state/critwire/`:** it would be lost on reboot, or shared across checkouts, and invisible to `git status`.
- **`--confidence` and `--ids` as a union or an intersection:** either can surprise the owner. Exclusive selectors say exactly what they select.
- **A8 as a whole-entry deep-equal:** any re-ingest that moves a species' total would void all its keys. `sameFlag` plus the taxon-key check covers what decides the flag.
- **Coverage and 005 freshness in `pnpm test`:** they would turn red after every legitimate accept or re-ingest.
- **Changing derive** (an id on entries, a dataset-facet captive rule): derive rules are out of scope, and `dist/` must stay identical.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code: findings 1–4 are accurate. `deriveCountries` (`scripts/derive/countries.ts:100-104`) applies overrides by `entries.delete` + `published.add/delete`, so confirming vs output-changing is exactly as described; `gbifContributions` and `currentDoi` take `occurrences`/`datasets`, never `k` (`pipeline.ts:106-108`), so the DOI claim holds. Data claims re-counted from `mismatches.json`/`species.json`: 214 entries, 186 country, 186 unique (speciesId, country), 28 unique other keys, 38 strays, 174 entries ≤ 20 records, 45 flagged species of which 42 have `ids.col`, species 69 has all 7 published countries flagged. `occurrenceSearchQuery` hardcodes `limit=0` (`ingest/gbif.ts:35`); its only other caller (`gbif-sample.ts:314`) uses the default, so a trailing `limit = 0` parameter is URL-neutral and `assertGbifFresh` proves it. Validation reuse through `deriveCore` is the right call: `parseOverrides` + `deriveCountries` + `matchCountries` are the complete rule set.

MUST-FIX:
1. **Q1 "assertNoIucnData runs on the whole file" contradicts "entries copies mismatches.json verbatim".** `assertNoIucnData` (`scripts/raw.ts:95`) throws on any string matching `/iucn/i`; the queue has 20 such strings (`field: "ids.iucn"`, `kind: "iucn-id"`, reasons like "has P627 17585"). As designed, `review:evidence` can never write its file. Fix: run `assertNoIucnData` on the fetched sections only (`entries[].gbif`, `datasets`, `organizations`, `col`, `gbifSpecies`, `wikidata`), never on the verbatim `entries[].entry` copy, and state that in Q1.
2. **Q5's CLI test depends on the committed proposal and the current overrides, so it goes red after the owner's first accept** (the same reason Q4 keeps coverage out of `pnpm test`). After `review:accept --confidence high`, the two keys "picked from the committed proposal" are either already in `country-overrides.json` (skipped → the success assertions fail) or gone from `mismatches.json` (A8 throws); a re-ingest that moves any `speciesRecords` total breaks A8 for every key. Fix: the throwaway copy must be self-contained: the test writes `country-overrides.json = []`, runs `pnpm derive` in the copy, then writes its own small `recommendations.json`/`evidence.json` (entries = the copy's queue; a synthetic `gbif:dataset` cite so one key can be `high` and output-changing) and generates the proposal with `review:presort` in the copy, then runs accept. No assertion may read the real repo's proposal or overrides content.

MISSED:
- `review:presort --check` requires 005 and the proposal to equal the regenerated bytes, so 005's front matter and text must carry no clock value (use evidence `retrieved`, never `utcDate()` at render time). Say so under Q3, or `--check` is non-deterministic across days.
- Q1's SPARQL asks for references (P248) on P627 statements. Reference items are Q-ids, fine, but if labels are ever added they'd say "IUCN Red List" and trip the IUCN gate; keep the query label-free and note it.

SHOULD-CONSIDER:
- A8 deep-equals the whole entry, so any re-ingest that moves `values.gbif.speciesRecords` invalidates every recommendation at once. Compare the parts that decide the flag (kind, severity, country, `records`) and report a changed total as a warning instead.
- The reader-guard test (P9) greps other source files for strings; the Baseline `dist/` hash comparison plus derive's explicit-path reads already prove the point. Drop it unless you want the message at `pnpm test` time; if kept, make it one regex over `scripts/**/*.ts` excluding `scripts/review/` and `scripts/review-*.ts`.
- For the 12 entries over 20 records, add `facet=stateProvince` (facetLimit 20) to the same query: it shows where a zoo-heavy country's records cluster (US 4,461 elephants) at no extra request.
- `review:accept` A10 names `git restore` for the overrides file; derive's partial writes can't happen (`deriveAll` ran in memory first), so say that instead of implying derive may half-write.
- Pass the `confirming`/`output-changing` split into the Summary's counts too, so the owner's one-sentence reply is unambiguous about which build consequence follows.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **Q1’s evidence validation always fails.** The copied queue contains `ids.iucn` and `iucn-id`; `assertNoIucnData` rejects those strings. Apply the prohibition check to allowlisted fetched sections, excluding the existing queue metadata.
2. **Q5 bypasses recommendation validation.** Acceptance checks proposal equality but never runs `assertRecommendations`. Editing confidence or citations leaves the proposal unchanged and can bypass the rubric. Validate recommendations and evidence before selection and writes.
3. **Q5’s recovery instruction can lose owner decisions.** `git restore country-overrides.json` discards earlier uncommitted acceptances too. Preserve the exact pre-run contents and provide recovery that restores that state. Account for interrupted derived-file writes: in-memory validation does not make multiple filesystem writes transactional.
4. **Acceptance tests depend on mutable production review state.** Selecting success cases from the committed proposal can fail after legitimate acceptance or re-ingestion. Use self-contained review fixtures in the throwaway copy, independent of existing proposals and owner overrides.

SHOULD-CONSIDER:
1. Bind evidence to the source snapshot and taxon identity, not only the mismatch entry: its country counts can remain identical while the underlying identity changes.
2. Explicitly disallow high-confidence removal when record/dataset coverage is incomplete; twenty records and truncated facets cannot establish that every record warrants exclusion.
3. Define `--confidence` plus `--ids` as an intersection, or clearly document the union beside each example; union can accept more entries than the owner expects.

## Revision notes

MUST-FIX:
- **Fable 1 / Astra 1 (the IUCN gate vs the verbatim queue):** the gate runs on the fetched sections only, never on `entries[].key` or `entries[].entry` (Q1). `assertEvidence` re-runs it on every read, and P11 tests both sides.
- **Astra 2 (accept bypasses the rubric):** accept step 3 runs `assertEvidence` and R2–R7 before the proposal-equality check, the selection and any write. A5 covers it, with a test that edits a recommendation to `low` and leaves the proposal untouched.
- **Astra 3 (recovery):**
  - Accept first writes the exact pre-run bytes to `country-overrides.json.pre-accept` (atomic `writeText`), and deletes the file only after derive exits 0.
  - The next accept refuses while it exists (A13). Both errors name Undo (`mv` + `pnpm derive`, which restores the exact bytes and, by step 5, the pre-run derived files) and Finish (`pnpm derive` + `rm`).
  - Derive's 6 writes are each atomic but not transactional (`derive.ts:15-18`). Rerunning `pnpm derive` is idempotent, because derive reads no output except `issued-ids.json`, which an override can't change (`pipeline.ts:61-72,115-117`, `sample.ts:53-61`).
  - A chmod test makes derive fail after 5 renames and proves Undo gives back the same bytes and hashes. `docs/recovery.md` gets one line.
- **Fable 2 / Astra 4 (the test depends on live review state):** the throwaway copy resets its overrides to `[ ]` and re-derives. It then picks K1 and K2 from its own queue and writes fixture evidence and recommendations, and `review:presort` writes the proposal in the copy. No step reads the real repo's review state.

MISSED:
- **The clock:** `renderPresort` reads no clock (only the `retrieved` dates, a fixed number format, and a fixed order), so `--check` gives the same answer every day (Q3).
- **SPARQL labels:** the query is label-free, and its variable names avoid "iucn" (Q1).

SHOULD-CONSIDER, adopted:
- Fable: A8 compares through `sameFlag` (the species total is a warning).
- Fable: P9 is one regex.
- Fable: `facet=stateProvince`.
- Fable: the confirming/output-changing counts go in 005 and the Summary.
- Astra 1: the evidence stores `taxonKey`, and `assertEvidence` checks it against the current snapshot.
- Astra 2: R7, a high `remove` needs complete coverage.
- Astra 3: `--confidence` and `--ids` are exclusive, not a union or an intersection.

SHOULD-CONSIDER, rejected:
- Fable: "derive's partial writes can't happen". That's wrong: the in-memory `deriveAll` stops a rule failure, but not a kill, a full disk or a permissions error between renames (Astra 3).
- Fable: drop P9. It's kept as one regex: the Brief asks that no script read the proposal, and the test gives that message at `pnpm test` time.

## Steps

Shorthands: `<state>` = `/srv/critter-ai/agent-state/missions/critwire-review-presort`. GUARD = `git diff --exit-code $(git merge-base HEAD origin/main) -- data/review/country-overrides.json data/species.json data/review/mismatches.json` (must print nothing). Every step: `pnpm typecheck`, `pnpm test`, GUARD, then commit + push. Heavy jobs (test, build, e2e, evidence run) one at a time. `review:accept` is never run on the real `data/`.

- [x] S1. **Shared helpers (Findings 2–3).** `scripts/ingest/gbif.ts`: `occurrenceSearchQuery(taxonKeys, facets = [], limit = 0)`, `limit=${limit}` where `limit=0` stands. `scripts/ingest/wikidata.ts`: export `postSparql(query)`; `fetchWikidata` calls it, keeps its head/bindings checks. `scripts/ingest/col.ts`: `API` → exported `COL_API`. `scripts/json.ts`: `writeText(url, text)` (temp + rename); `writeJson` calls it. No new tests (existing ones cover the bytes). Check: also `pnpm derive && git diff --exit-code data/` (derive's `assertGbifFresh` proves URLs unchanged), then `pnpm build` and `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) | diff - <state>/dist-baseline.sha256` empty.
- [x] S2. **Presort core, tests first.** Failure modes P1–P7, P9–P11 (Q4) are listed; write `scripts/review/presort.test.ts` first, one case per mode (P9 = the one reader-guard regex over `scripts/**/*.ts` and `e2e/**/*.ts` minus `scripts/review/`, `scripts/review-*.ts`); run it red. Then `scripts/review/presort.ts` (pure): file URLs (evidence, recommendations, proposal, 005), `Evidence`/`Recommendation` types, `entryKey`, `indexEntries`, `statusQuo`, `changesOutput`, `assertEvidence` (keys; IUCN gate via `assertNoIucnData` on fetched sections only; `taxonKey` = `gbifTaxonKey` of the snapshot), `assertRecommendations` (R1 opt-in, R2–R7), `proposalOf`. Check: `pnpm exec tsx --test scripts/review/presort.test.ts` green.
- [x] S3. **Evidence module, CLI and the one fetch run (network; riskiest).** `scripts/review/evidence.ts` (`fetchEvidence(entries, snapshots, species)`: Q1's queries through `getJson`, record/COL allowlists, `/iucn/i` free text → `null`, `truncated` facets, label-free SPARQL via `postSparql`, variables without "iucn"). `scripts/review-evidence.ts` (reads queue, snapshots, `species.json`; builds in memory; `assertEvidence`; one `writeJson(…, {canonical: true})`). `package.json` `review:evidence`. Run once: `pnpm review:evidence 2>> <state>/review-evidence.log` (≈ 700 requests, ≤ 6 min). Commit `data/review/presort/evidence.json`. Check: log has no unretried failure and paces ≤ 2 req/s; `jq '.entries|length'` = 214, `jq '[.entries[]|select(.gbif!=null)]|length'` = 186; file ≈ 0.7 MB; Log line counts entries whose live `count` ≠ `records`. If the session runs long: commit the code green, split the run into its own item.
- [x] S4. **Render + `review:presort`.** `scripts/review/render.ts` (`renderPresort`, Q3 layout; no clock, `en-US` numbers, order speciesId then key; pending blocks show full evidence so batches read 005). `scripts/review-presort.ts` (queue deep-equals evidence else "queue changed: re-run pnpm review:evidence"; `assertEvidence`, R2–R7; writes 005 + proposal; prints counts by recommendation × confidence and pending; `--check`: R1, byte freshness, one heading per key). `package.json` `review:presort`. `data/review/presort/recommendations.json` = `[]`. P8 case in `presort.test.ts` (`deriveCore` with the committed proposal as overrides). Run → `plans/005-review-presort.md` (214 pending), `data/review/country-overrides.proposed.json` (`[]`). Check: `pnpm test` (P8, P9 green); a second `pnpm review:presort` leaves `git status --porcelain` unchanged; `--check` fails only on 214 pending; `grep -c '^#### ' plans/005-review-presort.md` = 214.
- [x] S5. **Accept core, tests first.** Failure modes A1–A4, A7, A8, A11 and the selection rules (Q5) are listed; write the pure cases of `scripts/review/accept.test.ts` first: `parseAcceptArgs` (A1: none, both, unknown flag, bad level → usage, exit 2), `selectProposals` (`--confidence medium` = medium + high; `--confirm-only` drops `changesOutput`; A2 unknown, A3 non-country, A4 empty), `mergeOverrides` (owner entries keep order and text, new ones appended sorted; A11 same pair + action skipped; A7 other action throws), `sameFlag` (ignores `speciesRecords` and `reason`; false on kind, severity, country, records, region, core), `countryChanges`. Red, then `scripts/review/accept.ts` (`parseAcceptArgs`, `selectProposals`, `mergeOverrides`, `countryChanges`, `backupFile`) and `sameFlag` in `presort.ts`. Check: `pnpm exec tsx --test scripts/review/accept.test.ts` green.
- [x] S6. **`review:accept` CLI + throwaway-copy E2E (A5, A10–A13).** CLI cases first in `accept.test.ts` (Q5 Tests: `mkdtemp` copy of `scripts/`, `data/`, `package.json`, `tsconfig.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, symlinked `node_modules`, never `.env`; setup 1–6; success `--ids K1,K2`; A11 rerun; A7; A5 hand-edited proposal; A5 rec edited to `low`, proposal untouched; A10 + A13 + Undo via `chmod 0555 data/gbif-learn-sample/`, test throws as root; A12 per-file hashes of the copy; real repo `data/` hashes unchanged). Then `scripts/review-accept.ts` (Q5 flow 1–11, every check before any write; backup written atomically by a local `writeText` (temp + rename; not in `json.ts`, see Decisions) → overrides → spawn `pnpm derive` at the root from `import.meta.url` → delete backup on exit 0; Undo/Finish text on A10/A13; Q6 follow-on when a country changes), `package.json` `review:accept`, `docs/recovery.md` §2 line (backup, Undo, Finish; same text as the CLI's). Check: `pnpm test` green; `git status --porcelain` shows only this step's files (no `.pre-accept`, no `*.tmp-*`).
- [x] S7. **Recs batch 1: 28 non-country entries** (iucn-id 10, identity 7, synonym-info 4, not-found 4, multi-value 2, no-records 1). Each fix names where it lands (CC profile + `pnpm seed:cc`, Wikidata edit + `pnpm ingest wikidata`, or "no action" for `info`) and its cost (scientificName or `ids.gbif` → "Cost of a species change", ≈ 1 h; `ids.iucn` → Wikidata snapshot stale). `iucn-id`: Wikidata statement + references and the two `iucnredlist.org/species/<id>` links only. Files: `data/review/presort/recommendations.json`, then `pnpm review:presort` → 005, proposal. Check: `review:presort` exit 0, pending 186.
- [x] S8. **Recs batch 2: 38 strays** (`country-captive-suspect`, blocking, excluded; status quo `remove`). Same files and run. Check: `review:presort` exit 0, pending 148; P8 (proposal validates) green in `pnpm test`.
- [x] S9. **Recs batch 3: 53 kept `country-captive-suspect`** (review; status quo `keep`). Check: pending 95; P8 green.
- [x] S10. **Recs batch 4: borderline, first 48 keys** in 005 order (speciesId, country). Check: pending 47; P8 green.
- [x] S11. **Recs batch 5: borderline, remaining 47.** Check: pending 0; P8 green; `pnpm review:presort --check` exit 0.
- [ ] S12. **Consistency pass + final presort.** Re-read all 214 against the rubric: the same dataset or publisher signal gets the same call and confidence across batches; every high `keep` cites an independent source (second dataset, COL distribution, Wikidata P2341/P183); no reason claims range in our voice (review `grep -in 'native\|range' data/review/presort/recommendations.json`); 005 warns for species 69 and any other species that would lose every published country. Regenerate. Record under Decisions: counts by recommendation × confidence, the high set split confirming / output-changing, and the two reply sentences (for the Summary). Check: `--check` exit 0.
- [ ] S13. **Docs.** `AGENTS.md`: Data (the 4 presort files + writers, "never read by derive or build", the `.pre-accept` backup; `plans/005-review-presort.md`), Commands (`review:evidence`, `review:presort [--check]`, `review:accept` usage, "owner's word only"), Overrides (one line: an output-changing override makes plain `pnpm build`, so `deploy`, refuse until the `learn:check --update` follow-on, Q6). Check: AGENTS.md commands match each CLI's usage text and 005's "Accept in one go"; `pnpm review:presort --check` exit 0.
- [ ] S14. **Final Verification.** Run `## Verification` 1–10 in order, artifacts in `<state>/e2e-final/`; one Log line with results.

## Verification

E2E scenarios: (a) `review:accept` end to end on a throwaway copy: real CLI, real `pnpm derive` (success, rerun, conflict, tampered proposal, tampered rec, interrupted derive + refusal + Undo), in `scripts/review/accept.test.ts`; (b) `review:presort --check` over the committed files (coverage: 214 keys once each; 005 + proposal fresh); (c) the Playwright suite + `dist/` hashes proving the site unchanged.

`A=/srv/critter-ai/agent-state/missions/critwire-review-presort/e2e-final`; `rm -rf $A && mkdir -p $A` first (keep `e2e-baseline/`; at most two artifact folders).
1. `pnpm install --frozen-lockfile`: up to date.
2. `pnpm typecheck`: exit 0.
3. `pnpm test 2>&1 | tee $A/pnpm-test.log`: all pass (703 + the new `presort.test.ts`, `accept.test.ts` cases), 0 fail.
4. `pnpm review:presort --check 2>&1 | tee $A/presort-check.log`: exit 0; 214/214, 0 pending; counts equal S12's Decisions.
5. `pnpm build`: plain, exit 0.
6. `(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > $A/dist.sha256 && diff /srv/critter-ai/agent-state/missions/critwire-review-presort/dist-baseline.sha256 $A/dist.sha256`: empty.
7. GUARD: empty. `git diff --stat $(git merge-base HEAD origin/main) -- data | tee $A/data-diff.txt`: only `data/review/presort/{evidence,recommendations}.json` and `data/review/country-overrides.proposed.json`.
8. `git status --porcelain`: empty (no `.pre-accept`, no `*.tmp-*`).
9. `E2E_ARTIFACTS=$A pnpm e2e`: 98/98 pass, as Baseline.
10. `ls data/review/country-overrides.json.pre-accept` fails (absent); `git log -1 --format=%H > $A/commit.txt`.

Artifact: `$A` holds the Playwright HTML report, traces and screenshots, `pnpm-test.log` (scenario a), `presort-check.log` (b), `dist.sha256` + `data-diff.txt` (c), `commit.txt`. Reproduce: `git checkout $(cat $A/commit.txt) && pnpm test && pnpm review:presort --check && pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.

Release smoke (runner's Release unit, not a step): `(cd /srv/apps/critwire/.live && find . -type f -print0 | sort -z | xargs -0 sha256sum) | diff - <state>/dist-baseline.sha256` empty, plus the release Playwright config.

## Failure modes

Isolated units: P1–P11 (Q4, tests in S2/S4) and A1–A13 (Q5, tests in S5/S6), listed before their code; each step writes its tests red first. Mission-level:
- **`/v1` or Learn output moves** (a shared helper changes bytes): S1 build + hash diff; Verification 6.
- **Derive or build reads a presort file:** P9 (S2); Verification 6–7.
- **IUCN data enters evidence** (GBIF `iucnRedListCategory`, SPARQL labels, free text): allowlists + label-free query (S3); gate before write and on every read (P11).
- **Evidence run fails midway** (network, rate limit, COL 404, SPARQL timeout): built in memory, nothing written; `getJson` retries; log in `<state>`. A 404 or a split SPARQL query is handled explicitly in S3 and recorded under Decisions, never swallowed.
- **Evidence bound to a different queue or taxon:** queue deep-equal (P2) and `taxonKey` check (P11). If `origin/main` changes `data/raw/` or `mismatches.json` mid-mission, presort refuses; re-run S3, re-check affected recs, record under Decisions.
- **Recommendation by plausibility:** R2 cites resolve, R5 GBIF cite, R7 complete coverage for high `remove`, R4 low = status quo; S12 cross-batch pass.
- **"Native range" claim in our voice:** rubric in 005's header; S12 review.
- **Owner-only files touched:** GUARD each step; accept never run on real data; S6 asserts real `data/` hashes unchanged.
- **Accept test leaks into the real repo or passes vacuously:** paths from `import.meta.url` in the copy; `git status --porcelain` after `pnpm test`; chmod case throws as root; pnpm in the copy gets the lockfile and workspace file.
- **005 not reproducible:** no clock in `renderPresort`; S4 double run; `--check`.
- **Disk:** at most `e2e-baseline/` + `e2e-final/`; the throwaway copy removed by the test.

## Code review (Astra)

## Release

## Decisions

- 2026-11-01, S1: **`writeText` stays out of `scripts/json.ts`.** `json.ts` is in `learn-check.ts`'s import closure, whose sha256s enter every lab key (`scripts/learn/freshness.ts`). Any edit there makes plain `pnpm build` refuse 189 labs as stale; re-stamping with `pnpm learn:check` (tried: 9 min 33 s, ok, results unchanged) moves `checked.json`'s date, which 31 module pages print ("Checked 2026-11-01 …"), so `dist/` stops being byte-identical (a Definition of done item). So `json.ts` and `checked.json` are unchanged; accept's CLI writes its backup with a local temp + rename (S6). The other three S1 exports (`occurrenceSearchQuery` `limit`, `postSparql`, `COL_API`) are outside the closure. Rule for later steps: edit no file in the relative-import closure of `scripts/learn-check.ts` (`importClosure`, `freshness.ts`).
- 2026-11-01, S2: **Presort core calls the design left open.** (a) R4 for non-country entries: low means the fix is exactly `no action` (`NO_ACTION`); `statusQuo` throws on non-country entries. (b) Cite scope (R2): `gbif:occurrence`/`gbif:dataset` resolve only in the entry's own query (records, `datasetKey` facet); `gbif:species`, `col`, `wikidata` (item, value or reference Q-id) anywhere in their sections. Every rec needs ≥ 1 cite. (c) `assertEvidence` also requires exact top-level and item keys (an unknown section would skip the IUCN gate) and `gbif` exactly on country entries. (d) P2 is the pure `assertQueue` (deep-equal, same order), for S4's CLI. (e) S3 contract: `gbif.facets` keyed by query parameter name (`datasetKey`, `basisOfRecord`, …), `truncated` per facet.
- 2026-11-01, S3: **Evidence calls.** (a) GBIF answers valid URLs with a transient empty 404 (both runs, different URLs; each then 200s), and `getJson` never retries a 404: `getGbif` in `evidence.ts` retries 404 up to 4 tries, then throws; `http.ts` unchanged. (b) A COL `nameusage` 404 stores status `not in this release` (Wikidata can name an id the release lacks; none did this run); a `/info` 404 throws. (c) Beyond Q1: **a P2341/P183 statement sourced from the Red List (`P248` = Q32059, or a reference URL matching /iucn/i) is dropped whole**, since it would be IUCN range data via Wikidata; `?refUrl` is read for this and never stored; dropped 0 this run. (d) Also fetched `27:ids.gbif:not-found`'s variant usage (2433391), so that entry has a `gbif:species` cite: 5 species, not 4. (e) `GBIF_API` exported (renamed from `API`), like `COL_API`; outside `learn-check`'s closure (checked with `importClosure`). (f) `truncated` = counts sum below `count`, as Q1 says. On optional facets (`establishmentMeans`, `year`, …) it also means unfilled, so S4 renders it as "partial"; `datasetKey` is always filled, so R7's use is exact (0 truncated). (g) File is 1.06 MB, not ≈ 0.7 MB (facets); accepted.
- 2026-11-01, S3: **For the rec batches.** 6 entries' live counts moved since the snapshot: `25:RU` 8→6, `25:US` 64→67, `28:US` 4461→4468, `43:DE` 3→0, `57:TG` 1→0, `69:TD` 2→1. `43:DE` and `57:TG` have no live records, so no `gbif:occurrence`/`gbif:dataset` cite can resolve: R5 leaves them `low` (status quo `keep`). No high `remove` possible on any of the 6 (R7). P2341 has 0 statements on these items; P183 has 9.
- 2026-11-01, S4: **Render calls.** (a) COL distribution and Wikidata P2341/P183 are per species, once above its entries, not repeated in each block; 005 is grouped by species, and that keeps it readable. (b) It reads `species.json` instead of `base.json`: same common name, plus the published list and `ids.col` that the warning and the COL line need; also the COL and Wikidata snapshots (release, items). (c) `colIdsOf`, `gbifKeysOf` and the item lookup moved from `evidence.ts` to `presort.ts` (now `wikidataItemsOf`, deduped), so the pure renderer doesn't import network code. (d) `writeText` is `scripts/review/io.ts`, shared by `review:presort` and S6's accept CLI (S1's decision keeps it out of `json.ts`). (e) The warning lists species whose every published country is flagged (only these can lose all), with what the high set and all recommendations leave: today only species 69.
- 2026-11-01, S5: **Accept core calls.** (a) `parseAcceptArgs` uses `node:util` `parseArgs` with `multiple: true`, so a repeated selector is refused (A1), not last-wins; a repeated key in `--ids` is deduped. (b) A malformed line throws `UsageError` (exported, with `ACCEPT_USAGE`); S6's CLI prints it and exits 2. (c) A2 also covers a key in the evidence with no recommendation. (d) `byOverride` (presort.ts) is the one sort for `proposalOf` and `mergeOverrides`. (e) `--confidence` silently passes over high non-country recs (they aren't overrides); only `--ids` refuses them (A3).
- 2026-11-01, S6: **Accept CLI calls.** (a) `flagDrift` (accept.ts) is A8's pure query: `moved` throws, `totalMoved` warns; a key missing from today's queue counts as moved. (b) "Nothing added" exits right after the merge, before step 7's second derive: nothing to prove. (c) `OUTPUT_CHANGE_FOLLOW_ON` (presort.ts) is the one Q6 follow-on text, used by 005's table and the CLI; 005's bytes unchanged. (d) Beyond the listed CLI cases: A4, A6, A8, evidence failing `assertEvidence`, `--confidence high --confirm-only` (one of the owner's two replies) and Finish, since each is one short case on the same copy. (e) Copy: `tmpdir()`; `after` restores the chmod before `rm`.
- 2026-11-01, S7: **Batch 1 calls.** (a) **Critter Connect's own profiles were read (ids only).** In 9 of the 10 `iucn-id` profiles, `iucnId` disagrees with the same file's Red List link, and the link equals Wikidata's P627: two sources against one field, so those 9 are `high` and the fix lands in the profile. Their cites resolve to Wikidata only (R2 has no profile cite), so each reason names the profile's link, and the fix gives the file. Species 62 is the exception: `iucnId` and its link agree, so Wikidata's 2016 value is the suspect (`medium`, click first). (b) **Three one-off reads beyond `evidence.json`,** logged in `<state>/review-evidence.log`, no file changed: COL `nameusage/TVKZ` (404, twice), COL search for `Chelonoidis abingdonii` (subspecies C6Q3T of C. niger), Wikidata P3151 holders of the 4 iNat ids (418148 is also on Q89502501). Reasons state them; 22 and 35 can't cite them, so they stay `medium`. (c) **Cost beyond the design:** `EXTERNAL_IDS` (`projection.ts`) puts every id in Learn's lab data, whose sha256 enters every lab key, so any fix changing an id holds the release until `learn:check --update`, same as Q6. Each fix says so. (d) **Rename vs stay:** 27 is a rename (agreed identity, spelling only), `medium` because derive joins Wikidata on P225, so Q635949's P225 must change too. 7 and 70's `ids.col` stay `no action`, `low`: a rename fills one id, costs about 1 h and breaks the join. 40 is `low` for lack of evidence on which value; its reason gives the click. (e) None of the 20 ids these fixes name is held by another species in `species.json`, so `assertLearnProjection`'s uniqueness holds.
- 2026-11-01, S8: **Batch 2 calls.** (a) **`high` remove only where the record itself says it:** a zoo or zoo gift in locality or remarks, a `captive` field, a turtle museum, an aquatic DNA read, or a remark doubting the country (18). (b) **Inference stays `medium`** (13): GenBank-mined or INSDC sequences with no locality, city localities (Arnhem, Amsterdam), coordinates alone. (c) **One one-off read beyond `evidence.json`,** logged in `<state>/review-evidence.log`, no file changed: Wikidata zoos and aquaria near 8 coordinates. It placed 23:FR 0.12 km from Paris Zoological Park, 50:BR 0.04 km from São Paulo Zoo, 20:DE 0.42 km from Luisenpark, 25:NL and 39:NL 6.6 km from Burgers' Zoo, and 2:PT 1.8 km from Lisbon Zoo; none near 28:BR or 23:CN; 28:NL's query got a 504, not retried, and its reason doesn't use it. R2 can't cite these items, so reasons state them and those entries stay `medium` or lower, as in S7. (d) **Two output-changing keeps, both `medium`:** 2:PT (iNaturalist research-grade) and 58:IQ (dated 1928 field specimen); neither has a second source for that country, since COL's "Southern Asia" doesn't clearly include Iraq. (e) **Five `low`** (status quo remove): 4:CD, 20:ES, 28:BR, 28:CF, 69:PA. 69:PA's "at sea" is read from its coordinates.

- 2026-11-01, S9: **Batch 3 calls.** (a) **Captive-mark arithmetic decides high on large entries:** the facet's `captive` count minus the marked records we read gives what's unread and unmarked. Zero left and every unmarked one naming a zoo is `high` remove (40:US, 48:US); any left is `medium` (25:US 15, 28:US 35, 35:US 3, 56:US 5, 58:US 9, 65:US 1), and 25:US and 28:US are barred by R7 anyway (live count moved). (b) **Output-changing removes dominate:** 40 of the 53 are `remove` (8 high, 32 medium), each holding the release until the Q6 follow-on; 16 of the 40 are `US` rows. Keeps: 3 high (17:ID, 25:RU, 58:IR, each flagged only by GBIF's region map or core choice), 3 medium, 7 low. (c) **DNA reads:** water reads stay `high` as in S8 (56:SE); air-sampling reads are `medium` (56:AU, 56:DK, 58:AU, 64:DK), since nothing in the record says misidentified and some sit by a zoo. (d) **TAXREF territory checklist rows** (4:RE, 20:MQ) are `low` keep: a list line documents no animal and its status isn't in the fields. (e) **43:DE's `keep` is a trap if accepted:** GBIF returns 0 live records, so after the next `ingest gbif` derive throws "keep … no counted records" (`countries.ts:59`). The reason says leave it unaccepted; low isn't in the high set. S10's 57:TG is the same; S12 re-checks both. (f) **One one-off read beyond `evidence.json`,** logged in `<state>/review-evidence.log`, no file changed: Wikidata zoos, aquaria and parks within 10 km of 31 coordinates. R2 can't cite these items, so reasons state them and those entries stay `medium` or lower, as in S7 and S8. (g) **50:MX's at-sea call** rests on the coordinates against the coast, same as S8's 69:PA; not checked against shapes (`data/learn/country_shapes.parquet` needs a tool the venv lacks).
- 2026-11-01, S10: **Batch 4 calls.** (a) **Most keep, most confirm:** 48 entries: keep 41 (22 high, 14 medium, 5 low), remove 7 (4 high, 3 medium); only the removes change output. (b) **COL's continent counts as the independent source for a high `keep`,** as in S9's 58:IR; where COL gives no distribution (5, 10, 14) or the species has no COL id (7), a keep stays `medium`. (c) **`high` remove only on the record's own words:** 6:US (zoo + `captive`), 39:ZM (zoo, shipped to the US), 52:MX (a remark calling the identification wrong), 54:SR (its fields say French Guiana). 54:SR's removal doesn't add GF. (d) **Inference stays `medium`:** 21:MU ("und Umgebung" leaves room), 28:BD (coordinates), 56:KE (locality; the Sweetwaters sanctuary is stated as common account, since no source read names it). (e) **Forest elephant in Kenya and South Africa (41:KE, 41:ZA) is `low`:** the doubt is identity, and no record shows how it was told apart; 41:RW is `medium` for the same reason. A rubric-only reading would call 41:KE high (two datasets, COL Africa), but COL's "Africa" can't settle which elephant. S12 checks the same reasoning across batches. (f) **One one-off read beyond `evidence.json`,** logged in `<state>/review-evidence.log`, no file changed: Wikidata places near 2:AR (Buenos Aires Eco-Park, 2.5 km), 28:BD (Gazipur Safari Park, 0.35 km), 56:KE, and McDougall's Bay (Q31953520, -29.28, against 14:NA's record at -26.27). R2 can't cite them, so reasons state them and those entries stay `medium`. (g) Cites generated: every read record, every dataset in the facet, plus `col:<id>` where the reason uses COL. (h) 57:TG, which S9's note places in S10, sorts into S11's 47.
- 2026-11-01, S11: **Batch 5 calls.** (a) **47 entries: keep 42 (26 high, 9 medium, 7 low), remove 5 (4 high, 1 medium).** Only the removes change output. (b) **Two `high` removes are misplaced by their own locality, with the sign of the latitude apparently lost:** 56:SS names Cape Kungwe, Tanganyika Territory, and 64:SD names N. Rhodesia near Chingola, both with coordinates north of the equator. Tanzania and Zambia aren't flagged for those species and stay published on other records. (c) **Coordinate placeholders aren't localities:** MHNG's (9, 18) and "Afrique occidentale" at 1,000 km (56:ML, 56:TD, 57:ML, 58:TD, 69:ET) are `low`; KU's "NO LOCALITY" (66:AO) is `low`, as in S10's 54:MX; NTNU's "Africa continent" adds nothing. (d) **74:CA is `high` on the locality's own word, "Colony at Ottawa".** S12 should compare it with the batch 2 and 3 rule that inference stays `medium`. (e) **69:KE is `medium`, not the rubric's `high`,** as with S10's forest elephant: COL's "Africa" can't settle a lone 1930 gazelle specimen with nothing on how it was identified. (f) **57:TG is `low` with the same no-records trap as 43:DE,** with the same wording. (g) No reads beyond `evidence.json`.

## Log

- 2026-11-01 08:11 UTC: Baseline. typecheck pass, test 703/703, build pass, e2e 98/98; dist hashes recorded = live.
- 2026-11-01 08:25 UTC: Architecture. architect wrote findings (output-changing overrides make plain build refuse until learn:check --update; no DOI staleness) + target design (review:evidence/presort/accept, keys, deriveCore-based proposal validation). Plan-only change; no code to verify.
- 2026-11-01 08:30 UTC: Fable review. APPROVE_WITH_CHANGES, 2 MUST-FIX (IUCN gate vs verbatim queue copy; accept CLI test must be self-contained). Plan-only change; no code to verify.
- 2026-11-01 08:31 UTC: Astra review. APPROVE_WITH_CHANGES, 4 MUST-FIX (IUCN gate scope, accept must run assertRecommendations, overrides recovery must preserve pre-run bytes + interrupted derive writes, self-contained accept test). Plan-only change; no code to verify.
- 2026-11-01 08:38 UTC: Revision. architect resolved all 6 MUST-FIX (IUCN gate on fetched sections only; accept runs assertEvidence + R2–R7 first; .pre-accept backup + Undo/Finish, derive rerun idempotent; self-contained accept test) + 2 MISSED; 7 SHOULD-CONSIDER adopted, 2 rejected. Plan-only change; no code to verify.
- 2026-11-01 08:43 UTC: Steps. planner wrote S1–S14 (helpers, presort/accept cores tests-first, evidence fetch, 5 rec batches covering 214 entries, consistency pass, docs, final Verification), Verification (10 cmds, artifact e2e-final/) + Failure modes. Plan-only change; no code to verify.
- 2026-11-01 09:00 UTC: S1. `occurrenceSearchQuery(…, limit = 0)`, exported `postSparql`, `COL_API`; `writeText` dropped from `json.ts` (Decisions). typecheck ok, test 703/703, derive: data/ unchanged, build ok, dist = Baseline hashes, GUARD empty.
- 2026-11-01 09:05 UTC: S2. `scripts/review/presort.test.ts` written first (14 cases: P1–P7, P9–P11, proposalOf, statusQuo), red, then `scripts/review/presort.ts`; green 14/14. typecheck ok, test 717/717, GUARD empty.
- 2026-11-01 09:20 UTC: S3. `scripts/review/evidence.ts`, `scripts/review-evidence.ts`, `review:evidence`; run 1 failed on a GBIF empty 404 (log `review-evidence-run1-failed.log`), run 2 with `getGbif` ok, 3 min 58 s, 395 requests (1 retried 404), ≤ 2 req/s. `evidence.json`: 214 entries, 186 GBIF, 81 datasets, 67 publishers, 54 COL ids, 5 GBIF species, 238 Wikidata statements, 1.06 MB; 6 live counts ≠ queue. typecheck ok, test 717/717, derive leaves data/ unchanged, GUARD empty.
- 2026-11-01 09:40 UTC: S4. `scripts/review/render.ts`, `scripts/review/io.ts`, `scripts/review-presort.ts`, `review:presort`, `recommendations.json` = `[]`, P8 test; generated `plans/005-review-presort.md` (214 pending, 422 KB) + empty proposal. typecheck ok, test 718/718, second run byte-identical, `--check` fails only on 214 "no recommendation", 214 headings, build ok, dist = Baseline hashes, GUARD empty.
- 2026-11-01 09:29 UTC: S5. `scripts/review/accept.test.ts` written first (13 cases: A1–A4, A7, A8, A11, selection rules), red, then `scripts/review/accept.ts` + `sameFlag`, `byOverride` in `presort.ts`; green 13/13. typecheck ok, test 731/731, GUARD empty.
- 2026-11-01 09:36 UTC: S6. `scripts/review-accept.ts`, `flagDrift`, `RECOVERY`, `review:accept`, `docs/recovery.md` §2 line; CLI cases written first (13, throwaway copy: A1, A4–A8, A10–A13, Undo, Finish, real `data/` untouched), red, then green. typecheck ok, test 744/744, second presort leaves 005 unchanged, build ok, dist = Baseline hashes, GUARD empty, no `.pre-accept` or `*.tmp-*`.
- 2026-11-01 09:44 UTC: S7. 28 non-country recs in `recommendations.json` (fix 18: 14 high, 4 medium; no action 10: 6 high, 1 medium, 3 low), 005 regenerated. `review:presort` exit 0, pending 186, second run byte-identical, `--check` fails only on 186 "no recommendation". typecheck ok, test 744/744, GUARD empty.
- 2026-11-01 09:55 UTC: S8. 38 stray recs (remove 36: 18 high, 13 medium, 5 low; keep 2: medium, output-changing), 005 + proposal regenerated. `review:presort` exit 0, pending 148, 38 proposals, second run byte-identical, `--check` fails only on 148 "no recommendation". typecheck ok, test 744/744 (P8 green), GUARD empty.
- 2026-11-01 10:04 UTC: S9. 53 kept captive-suspect recs (remove 40: 8 high, 32 medium; keep 13: 3 high, 3 medium, 7 low), 005 + proposal regenerated. `review:presort` exit 0, pending 95, 91 proposals, second run byte-identical, `--check` fails only on 95 "no recommendation". typecheck ok, test 744/744 (P8 green), GUARD empty.
- 2026-11-01 10:12 UTC: S10. 48 borderline recs (keep 41: 22 high, 14 medium, 5 low; remove 7: 4 high, 3 medium), 005 + proposal regenerated. `review:presort` exit 0, pending 47, 139 proposals, second run byte-identical, `--check` fails only on 47 "no recommendation". typecheck ok, test 744/744 (P8 green), GUARD empty.
- 2026-11-01 10:19 UTC: S11. 47 borderline recs (keep 42: 26 high, 9 medium, 7 low; remove 5: 4 high, 1 medium), 005 + proposal regenerated. `review:presort` exit 0, pending 0, 186 proposals, second run byte-identical, `--check` exit 0. typecheck ok, test 744/744 (P8 green), GUARD empty.

## Summary
