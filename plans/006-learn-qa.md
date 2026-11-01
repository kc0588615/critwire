---
title: Learn QA, one pass over all 33 modules
---

# Learn QA

For the owner: what a learner's walk through `/learn/` found. Plan and design: `plans/2026-11-01-critwire-learn-qa.md`.

Commit walked: `20e20bb` (U1a; the final Verification refreshes Pages from `e2e-final/results.json`).

Reproduce:
```sh
pnpm install --frozen-lockfile && pnpm build
E2E_ARTIFACTS=<dir> pnpm exec playwright test e2e/learn-walk   # 49 walks, the keyboard test
E2E_ARTIFACTS=<dir> pnpm e2e                                   # everything
pnpm learn:check                                               # every .sql and .py download on a fresh load
```

## Pages

47 pages at 1280 and 375 px, light and dark, every block run, every exercise filled and checked, every `<details>` open. Axe and overflow columns count violations and views that scroll sideways. Read unit: §4 of the plan.

| Page | URL | Views | Axe | Overflow | Blocks | `incomplete` | Read | Issues |
|---|---|---|---|---|---|---|---|---|
| map | `/learn/` | 4 | 0 | 0 | 0 | 0 | R1 | Q13 |
| playground | `/learn/playground/` | 4 | 0 | 0 | 0 | 278 | R1 |  |
| data | `/learn/data/` | 4 | 0 | 0 | 0 | 3248 | R1 | Q3, Q4, Q10, Q11 |
| setup | `/learn/setup/` | 4 | 0 | 0 | 1 | 22 | R1 | Q5–Q9, Q16 |
| schema | `/learn/schema/` | 4 | 0 | 0 | 0 | 114 | R1 |  |
| schema-lab | `/learn/schema/lab/` | 4 | 0 | 0 | 0 | 98 | R1 | Q12 |
| schema-star | `/learn/schema/star/` | 4 | 0 | 0 | 0 | 36 | R1 |  |
| track foundations | `/learn/foundations/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track database-architecture | `/learn/database-architecture/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track gis-in-sql | `/learn/gis-in-sql/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track spatial-statistics | `/learn/spatial-statistics/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track etl | `/learn/etl/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track power-bi | `/learn/power-bi/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track capstone | `/learn/capstone/` | 4 | 0 | 0 | 0 | 0 | R1 | Q14 |
| f1 | `/learn/foundations/select/` | 4 | 0 | 0 | 8 | 66 | R1 |  |
| f2 | `/learn/foundations/aggregate/` | 4 | 0 | 0 | 9 | 96 | R1 |  |
| f3 | `/learn/foundations/join/` | 4 | 0 | 0 | 14 | 70 | R1 | Q15 |
| f4 | `/learn/foundations/window/` | 4 | 0 | 0 | 7 | 1018 | R1 | Q40 |
| d1 | `/learn/database-architecture/keys/` | 4 | 0 | 0 | 13 | 26 | R2 | Q1, Q18, Q54 |
| d2 | `/learn/database-architecture/normalize/` | 4 | 0 | 0 | 14 | 114 | R2 | Q19, Q20 |
| d3 | `/learn/database-architecture/indexes/` | 4 | 0 | 0 | 0 | 0 | R2 | Q16, Q21–Q24 |
| d4 | `/learn/database-architecture/transactions/` | 4 | 0 | 0 | 0 | 2 | R2 | Q25 |
| d5 | `/learn/database-architecture/roles/` | 4 | 0 | 0 | 0 | 0 | R2 |  |
| d6 | `/learn/database-architecture/star/` | 4 | 0 | 0 | 2 | 2 | R2 | Q17 |
| g1 | `/learn/gis-in-sql/crs/` | 4 | 0 | 0 | 0 | 0 | R3 | Q26 |
| g2 | `/learn/gis-in-sql/load-validate/` | 4 | 0 | 0 | 0 | 0 | R3 | Q27, Q28 |
| g3 | `/learn/gis-in-sql/spatial-join/` | 4 | 0 | 0 | 0 | 0 | R3 | Q29 |
| g4 | `/learn/gis-in-sql/measure-overlay/` | 4 | 0 | 0 | 0 | 0 | R3 | Q30 |
| g5 | `/learn/gis-in-sql/spatial-index/` | 4 | 0 | 0 | 0 | 0 | R3 | Q31 |
| g6 | `/learn/gis-in-sql/grids/` | 4 | 0 | 0 | 0 | 0 | R3 | Q32 |
| g7 | `/learn/gis-in-sql/raster/` | 4 | 0 | 0 | 0 | 0 | R3 | Q33–Q37 |
| s1 | `/learn/spatial-statistics/bias/` | 4 | 0 | 0 | 3 | 394 | R4 | Q38, Q39, Q41 |
| s2 | `/learn/spatial-statistics/point-patterns/` | 4 | 0 | 0 | 0 | 0 | R4 | Q42–Q46 |
| s3 | `/learn/spatial-statistics/weights/` | 4 | 0 | 0 | 0 | 0 | R4 | Q47 |
| s4 | `/learn/spatial-statistics/moran/` | 4 | 0 | 0 | 0 | 0 | R4 | Q48, Q49 |
| s5 | `/learn/spatial-statistics/local/` | 4 | 0 | 0 | 0 | 0 | R4 | Q50–Q53 |
| s6 | `/learn/spatial-statistics/zonal/` | 4 | 0 | 0 | 0 | 0 | R4 | Q33, Q40 |
| e1 | `/learn/etl/extract/` | 4 | 0 | 0 | 0 | 2 | R5 | Q56, Q57 |
| e2 | `/learn/etl/transform-load/` | 4 | 0 | 0 | 0 | 2 | R5 | Q58–Q60 |
| e3 | `/learn/etl/idempotent/` | 4 | 0 | 0 | 1 | 2 | R5 | Q61 |
| e4 | `/learn/etl/quality-provenance/` | 4 | 0 | 0 | 0 | 0 | R5 | Q61, Q62 |
| e5 | `/learn/etl/schedule/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| p1 | `/learn/power-bi/power-query/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p2 | `/learn/power-bi/model/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p3 | `/learn/power-bi/dax/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p4 | `/learn/power-bi/maps-report/` | 4 | 0 | 0 | 0 | 0 | R6 | Q39 |
| c1 | `/learn/capstone/game-feed/` | 4 | 0 | 0 | 0 | 0 | R6 | Q39, Q40 |

Dialogs, open over their page:

| Dialog | Views | Axe | Overflow | `incomplete` |
|---|---|---|---|---|
| Schema dialog on f1 | 4 | 0 | 0 | 2 |
| Lab schema dialog on d3 | 4 | 0 | 0 | 4 |

Totals: 196 views, 72 blocks, 0 violations, 0 overflow, nothing off-origin, no page error.

Keyboard (`learn-walk.spec.ts`, d1, 375 px, dark): Tab reaches a code block and a result table, the ring shows, ArrowRight scrolls. Chromium focuses a scroller by itself, so the test also asserts the `tabindex` other browsers need; it failed on that before Q2.

## Links

Internal (`learn-map.spec.ts`; `crawl` annotation in `results.json`):

| Check | Result |
|---|---|
| Crawl from `/learn/` | 47 pages reached, all 200, one `<h1>`; 126 internal targets, all 200 |
| Same-page fragments | every one resolves to exactly one id |
| Cross-page fragments | 22 links, 11 distinct targets (`/#files`, 8 tables and `#species_taxonomy` on `/learn/schema/`, `/learn/setup/#arcpy`): each visited, id present once. Not checked before this pass |
| Prerequisite `href`s | map, 7 track pages and 33 module pages: each module's links equal `curriculum.json`'s `prereqs`, in order. Only the text was checked before, and module pages not at all |

No broken link found. Each new check was seen to fail on a `dist/` with a wrong prerequisite `href` (map, f2's page) and a removed `#t-species`.

External: 415 distinct URLs in `dist/learn` (13 hand-written, 402 dataset, source and download DOIs), one `curl` each at 2 req/s; every non-200 then checked through its DOI record and GBIF's API, and opened once in headless Chromium. Not a gate.

| Result | URLs | What it means |
|---|---|---|
| 200 | 111 | Reached, 12 of the 13 hand-written among them |
| 403, GBIF | 295 | Cloudflare answers "Attention Required" to this server, in Chromium too: a block on the caller, not a dead link. Each confirmed another way: 292 dataset DOIs resolve to a dataset GBIF's registry still lists, undeleted; the download and the derived dataset answer on `api.gbif.org`. `https://www.gbif.org/` itself (hand-written) is confirmed only by the API being up |
| 403, other publishers | 7 | Bot challenge or CloudFront refusal here: `10.1093/biosci/bix014` (OUP), `10.5519/qd.dyj48ok9` (NHM), `10.5962/bhl.title.96897` (BHL), `10.71819/{kjau6n,lr0yrg,qu77cz,wrldzz}` (SiBBr, ICMBio). Each DOI resolves; the page behind it is unconfirmed from this server |
| Dead | 2 | Q3, Q4 below, both dataset DOIs, both at the publisher |

Hand-written links: none dead. One added since (Q39): `10.5061/dryad.2dh0223`, the Jaguar Movement Database's record, 200 through its DOI.

## Axe

axe-core 4.14.0, default rules, `axe.run()` on each view after the page's blocks ran.

| Rule | Before | After |
|---|---|---|
| `scrollable-region-focusable` (serious, WCAG 2.1.1) | 1,248 nodes, 188 views, 38 pages (architecture probe): `pre.code` 666, `pre.recorded` 438, `.table-wrap` 118, `figure.diagram` 24, bare `pre` 2 | 0 |
| every other rule | 0 | 0 |

`incomplete` (axe can't decide, recorded, not asserted): 5,598 nodes over the 196 views. Sample read on map, setup, d1 and data at 1280 light and 375 dark: all `color-contrast`, with "background color could not be determined because it's partially obscured" or "content is too short". Likely cause, inferred, not proven: cells and lines clipped by a scrolling region hide their background from axe (`/learn/data/` shows none at 1280 light and 1,624 at 375 dark, on its table cells). `/learn/data/` is most of the total (3,248 nodes). The same colours pass where axe can decide: 0 contrast violations in either theme.

## Labs

47 files. `.ipynb` run once by the Method's script: only `requirements.txt` plus `ipykernel` and `nbclient`, as `critwire_lab`, under the lab lock. `requirements.txt` sha256: `d5bbe28024cc61d16a57e584dd94fd539c8cc08113899798b4450fd003820ab0`. `.sql` and `.py` results: baseline `learn-check` log (`$S/baseline-learncheck.log`, `$S` = the mission's state folder); the final Verification replaces them. ERROR lines are the ones a lab announces on purpose. The `.ipynb` hashes bind this evidence: if one differs from the final `dist/`, the run is repeated.

| File | Kind | How run | Result | sha256 |
|---|---|---|---|---|
| `e1.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 4.8 s, nothing left | `03c594f2e75fdff959200d83c242c2f0b8ddd580c3ccaed6181c335c6fa1a2c1` |
| `e2.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 5.4 s, nothing left | `519b901978a7d31ae985be4a9e9a976f7b66a14f82c4f1b5150143ac00f9b504` |
| `e3.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 2.0 s, nothing left | `5ca3beec784d482b89af8766c157d0b0d372057093b5d8fbdae31485e24ea96d` |
| `e4.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 1.2 s, nothing left | `3b0a6c70e92425c9cdc696d53ef64d6011ec41346dea7edcf4a4ce905598e9aa` |
| `e5.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 4.5 s, nothing left | `8178de426f1fe9b5e27d18115b938d9f5214157965347c65520b8d56e8525864` |
| `s2.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 4.4 s, nothing left | `dbde10457f1e8546db5f9e6edfee2d9d54b703aef99c70b1692a7adb03829033` |
| `s3.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 4.9 s, nothing left | `61e76bb8014b3fb906ff500f431eb2792e54cf4c9e5d55c5bc301606747ec857` |
| `s4.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 5.6 s, nothing left | `87f6f51cf78055d1d953e722622de3101ad62e48358d331ec273d53c590ba8b2` |
| `s5.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 5.1 s, nothing left | `8f47201bec39e83b6909190e848ecd50ae9ef3d1525c76062f9b4f7d30e3c2b6` |
| `s6.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 2.5 s, nothing left | `a5a4aabdecbd93e64e7b055263e923331d005ab6bec31812c019220619976911` |
| `setup.ipynb` | notebook | learner's venv, `nbclient`, fresh load | exit 0, 3.5 s, nothing left | `66f1a6219d0402c4bbb5accb56168533cb0ae7c120e250fec42ac32fc383aece` |
| `pg-checks.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `setup.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (2.4 s); nothing left | |
| `d1.sql` | psql | `learn:check` downloads stage, fresh load | 4 ERROR line(s), as announced; nothing left | |
| `d3.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `d4.sql` | psql | `learn:check` downloads stage, fresh load | 8 ERROR line(s), as announced; nothing left | |
| `d5.sql` | psql | `learn:check` downloads stage, fresh load | 5 ERROR line(s), as announced; nothing left | |
| `d6.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g1.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g2.sql` | psql | `learn:check` downloads stage, fresh load | 1 ERROR line(s), as announced; nothing left | |
| `g3.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g4.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g5.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g6.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `g7.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s1.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s2.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s2.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (3.2 s); nothing left | |
| `s3.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s3.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (3.8 s); nothing left | |
| `s4.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s4.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (4.5 s); nothing left | |
| `s5.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s5.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (3.9 s); nothing left | |
| `s6.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `s6.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (1.6 s); nothing left | |
| `e1.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (2.8 s); nothing left | |
| `e2.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (1.6 s); nothing left | |
| `e3.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `e3.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (0.9 s); nothing left | |
| `e4.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `e4.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (0.3 s); nothing left | |
| `e5.py` | script | `learn:check` downloads stage, fresh load | python exit 0 (3.5 s); nothing left | |
| `p2.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `p3.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `p4.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |
| `c1.sql` | psql | `learn:check` downloads stage, fresh load | 0 ERROR line(s), as announced; nothing left | |

No notebook failed.

## Setup vs downloads

`/learn/setup/` matches what the downloads need. One step gap, already known: the page says "in VS Code or Jupyter" and never installs Jupyter (finding 8; U4 fixes it).

| Page's claim | Evidence |
|---|---|
| Packages | The `.py` files import the standard library plus numpy, scikit-learn, geopandas, sqlalchemy, pyogrio, shapely, libpysal, scipy, esda, psycopg: all pinned. All 11 notebooks ran with nothing but the pins, `ipykernel` and `nbclient`; `rasterio`, which `.venv-learn` adds, isn't pinned |
| The page's Linux commands | Run as written in a new folder, bar copying `requirements.txt` from `dist/` (live's has the same sha256) and no `uv python install` (system 3.12): the import check passed |
| "pins 44 packages" (`setup.html:87`) | 44 in the file; 44 installed after `uv pip sync` |
| uv 0.13.5 | Version on this server; both install URLs answer 200 |
| Prebuilt package for Windows x86-64, Linux x86-64 and ARM, macOS 14+ on Apple silicon | `uv pip install --dry-run --only-binary :all: --python-platform <each>` resolves all 44 on all four. Resolved only: installed and run on Linux ARM alone |
| "Intel Macs aren't covered: pyproj 3.8.0 has no build" | Same command, `x86_64-apple-darwin`, macOS 14: refused, "pyproj==3.8.0 has no usable wheels" |
| Extensions `postgis`, `postgis_raster` | No other `CREATE EXTENSION` in the page or any block; `setup.ts:76` requires exactly these two |
| PostgreSQL 16, PostGIS 3.4 | This server: 16.15, 3.4.2 |
| Privileges list | `setup.ts:85-95` gives the lab role the same list and every download passes as that role; `check.ts:263` refuses more |
| `ipykernel` is added, nothing depends on it, the next sync removes it | Installs under the pins' constraint (70 packages, `ipykernel` 7.4.0); `uv pip sync` returned to 44, `ipykernel` gone |

Hand-only, not run here: Docker and its image tags, the EDB installer and Stack Builder, every Windows and macOS command, `pgpass.conf`, VS Code's `ipykernel` prompt, Power BI (H6).

## Astra leftovers

| Suggestion | Verdict | Evidence |
|---|---|---|
| Safe slug filenames | Covered, no new test | `validateRecords` refuses a slug outside `SLUG`, or all digits (`scripts/species.ts:132`). It runs in `deriveCore` (`scripts/derive/pipeline.ts:115`), which `readBuildInputs` reaches before any write (`scripts/build/inputs.ts:63`), and in `pnpm db:load` (`scripts/load.ts:13`). Test: V2 `scripts/species.test.ts:75` (`../x`, `a/b`, empty, `123`, among others). Second guard: `childFile` (`scripts/build/paths.ts:8`) at the writes (`scripts/build.ts:54-55`), tested by CF1 (`scripts/build/paths.test.ts:11`) |
| GBIF dataset-facet paging past 300 | Test added, no bug found | `fetchDatasets` now exported; `PG(a)`–`PG(f)` in `scripts/ingest/gbif.test.ts`, against a fixture `fetch`: 305 datasets, exactly 300, a short page, overlapping pages, a total that moves, counts short of the total. All pass on the code as it stood. Each of 7 deliberate breaks of `fetchDatasets` and `toDatasetPage` failed the mode it should (first page or short page ends paging, stops after page 2, `seen` not passed, count check gone, sum check gone, wrong URL stored) |

## Issues

`Q<n>`: fix commits start with it; SHAs are filled by U12. Tier: the plan's §7.

| Q | Page | Kind | Tier | What | State | Caught by |
|---|---|---|---|---|---|---|
| Q1 | d1 | layout | T0 | After Run, `d1-ex-same-url`'s error (an unbroken URL) made the page 734 px wide at 375 | fixed | `learn-walk.spec.ts` scrollWidth |
| Q2 | 38 pages | axe | T0 | Code, recorded results, result tables and diagrams that scroll sideways weren't in the tab order | fixed | `learn-walk.spec.ts` axe and keyboard `tabindex` |
| Q3 | data | dead link | list | DOI `10.18165/qmltit` (UAMZ amphibians and reptiles, 5 records) resolves to `ipt.museums.ualberta.ca`, where the whole `/ipt/` path answers 404; GBIF still lists the dataset, with endpoints on that dead path | listed. Recommendation: no change. The DOI is the dataset's published identifier and the fault is the publisher's; rewriting it would break the credit. If you want it repaired, tell helpdesk@gbif.org | one-off link check |
| Q4 | data | dead link | list | DOI `10.36102/dwc.3` (NCSM Herpetology, 109 records) resolves to `ipt.vertnet.org:8080`, connection refused. The same resource answers 200 on `https://ipt.vertnet.org/resource?r=ncsm_herps`, so the DOI record is out of date | listed. Recommendation: no change, same reason as Q3; VertNet can update the DOI's URL | one-off link check |
| Q5 | setup | missing step | T0 | Says to run cells "in VS Code or Jupyter", but no step installs Jupyter and `requirements.txt` has none (finding 8). Added the install line, run as written in a learner's venv: `jupyter lab --version` 4.6.5, no pin moved, the next `uv pip sync` removes it | fixed | `qa-fixes.ts` |
| Q6 | setup | missing step | T0 | The Python fences fail when pasted: uv's installer changes `PATH` for new terminals only, so the next `uv` line isn't found (run on Linux with an empty `HOME`; `install.ps1`'s own message says the same). Each fence now adds it for the current terminal, with the line the installer prints | fixed | `qa-fixes.ts` |
| Q7 | setup | missing step | T0 | `psql -X -d learn -f pg-checks.sql` assumes `psql` on `PATH`, which neither Windows route gives: EDB's is `$psql`, Docker's is in the container. Added both forms, built from the page's own commands (Docker and EDB are hand-only here, as the page says) | fixed | `qa-fixes.ts` |
| Q8 | setup | missing step | T0 | Connection settings gave PowerShell only, while the page promises Linux and macOS, and named libpq without saying what it is. Added the `export` line and `~/.pgpass`; libpq defined | fixed | `qa-fixes.ts` |
| Q9 | setup | prose | T0 | "The same 16 counts mean your lab matches", but the recorded result prints 5 rows and "… 11 more rows", so the page can't be compared. Now says so, and that the lab file checked all 16 before it committed (`learn_curriculum.sql`'s validation) | fixed | `qa-fixes.ts` |
| Q10 | data | prose | T0 | "Nothing but `psql` and the PostGIS extension", but the file stops without `postgis_raster` (its first check; setup installs both). 004 §4 already had it right | fixed | `qa-fixes.ts` |
| Q11 | data | navigation | T0 | The only page with no way back to Learn: its header's "Learn" was plain text | fixed | `qa-fixes.ts` |
| Q12 | schema-lab | prose | T0 | "Two whole-country clips": Tasmania is an Australian state, not a country. Names the two | fixed | `qa-fixes.ts` |
| Q13 | map | prose | T0 | "Has an exercise that checks your answer": true of 8 of the 36 exercises, the browser's. The other 28 (PostGIS, Python, Power BI) show the answer to compare | fixed | `qa-fixes.ts` |
| Q14 | capstone | prose | T0 | A track of one module told the learner to "work through them in order" | fixed | `qa-fixes.ts` |
| Q15 | f3 | prose | T0 | The devil's box "across the Pacific": `min`/`max` of longitude give -106.66 to 150.25, 257° the long way round through Africa and Asia. The box misses the Pacific, which is why a lat/lon box can't wrap the antimeridian | fixed | `qa-fixes.ts` |
| Q16 | d3, setup, every lab page | missing step | T0 | d3 says `ROLLBACK;` after each lab, but lab 2 needs lab 1's index and most blocks need `d3-analyze`, whose `ANALYZE` the `ROLLBACK` undoes (seen in the lab db: `dataset_key`'s common values back to the default's 100 after it). Only browser blocks showed `-- after:`; a PostGIS or Python block named nothing to run first, on any page. They now show the same Runs after line: linked on the page, named when it's another page's (`py-connect`, d6's star) | fixed | `learn-labs.spec.ts` Runs after; `qa-fixes.ts` |
| Q17 | d6 | missing step | T0 | Lab 3 follows the worked example, which leaves the star built, and says "build the star after" the new record. Done in one transaction, `CREATE TABLE` refuses; with the star kept, the record never reaches it and step 3 isn't the 40,396 shown. Now says to roll back first | fixed | `qa-fixes.ts` |
| Q18 | d1 | jargon | T0 | Lab 8 reads `pg_constraint` and `pg_index` and lab 9 says "as the catalog describes it" with no word on what the catalog is, `::regclass`, or why `indkey[0]` meets `conkey[1]`; d3, d4 and d5 read it too. Defined once | fixed | `qa-fixes.ts` |
| Q19 | d2 | jargon | T0 | `read_parquet` and `species.parquet` carry the worked example, and no page says what Parquet is. Defined at the first module that uses it | fixed | `qa-fixes.ts` |
| Q20 | d2 | prose | T0 | "The outside ids from Wikidata and GBIF", under a result whose first row is `ids.col`, from the Catalogue of Life | fixed | `qa-fixes.ts` |
| Q21 | d3 | prose | T0 | Result: "40,386 of the pangolin's 40,395 rows". The pangolin has nine; 40,395 is the table | fixed | `qa-fixes.ts` |
| Q22 | d3 | number | T0 | "`year` is partly ordered (0.62), the rest close to 0", over a result showing `license` at 0.39. 0.62 is the sixth row, which the page doesn't print; seen in the lab db, 0.624 | fixed | `qa-fixes.ts` |
| Q23 | d3 | prose | T0 | "This year's records" over `year >= 2026`: wrong from next January | fixed | `qa-fixes.ts` |
| Q24 | d3 | jargon | T0 | `VACUUM` and autovacuum carry the Index Only Scan rule, one module before d4 says what they do. Says it in a word, with a link | fixed | `qa-fixes.ts` |
| Q25 | d4 | jargon | T0 | Lab 10, the exercise and the Check turn on `IS DISTINCT FROM`, and `month` is often `NULL`, which is the point of it. No page said what it does | fixed | `qa-fixes.ts` |
| Q26 | g1 | number | T0 | Check: Greenland's north coast "about 81" times; 1 ÷ cos²(83.6°) is 80.5 (lab db, `ST_YMax` 83.5996) | fixed | `qa-fixes.ts` |
| Q27 | g2 | jargon | T0 | `(ST_IsValidDetail(geom)).valid` carries the worked example, and `(d).reason` the lab; no page said why the parentheses. g6's `(part).geom` and s2, s4 lean on the same syntax. Said once | fixed | `qa-fixes.ts` |
| Q28 | g2 | prose | T0 | "The square's left half": no square had been mentioned, only a bow-tie. Names it | fixed | `qa-fixes.ts` |
| Q29 | g3 | missing step | T0 | The IUCN appendix asks for one multipolygon per taxon with the id in `iucn_id`, but not that IUCN's files name it `id_no` and hold several rows per taxon (presence, origin, season). Without a dissolve the block counts a record once per row. Field names from public listings of IUCN's layers, no file read; block not run, as the page says | fixed | `qa-fixes.ts` |
| Q30 | g4 | prose | T0 | A strip is "close to" length × 10 km "and smaller", beside Nicaragua's 2,673 against 2,670. The buffer's round ends add area; said so | fixed | `qa-fixes.ts` |
| Q31 | g5 | prose | T0 | Result: "436 lie within 5 km of one, 529 within 25 km". 965 lie within 25 km; 529 is the 5 to 25 km band | fixed | `qa-fixes.ts` |
| Q32 | g6 | jargon | T0 | `ST_Dump` picks the main island in every g6 block (and s2, s4), and no page says what it does. Defined at its first use | fixed | `qa-fixes.ts` |
| Q33 | g7, s6 | prose | T0 | "Two ways to summarise a country", named method 1 and method 3, and no page says what became of 2. The names are in the block's columns, so they stay; says where they come from (design plan's E3c) | fixed | `qa-fixes.ts` |
| Q34 | g7 | number | T0 | "Rivers and streams (501, 502) come out 3.9 and 4.8 % smaller": 501 is −4.8, 502 is −3.9 (`g7-country`, past the 5 rows printed). The medians beside them, 5 and 3, are in the right order (lab db) | fixed | `qa-fixes.ts` |
| Q35 | g7 | prose | T0 | "The 0.75° square holding the most of the sample's records": true only on 0.05° steps. Stepped by 0.01°, a square holds 204 (`cr`) and 607 (`tas`) against 202 and 601 (lab db) | fixed | `qa-fixes.ts` |
| Q36 | g7 | prose | T0 | As Q12: `tas` is called a country, in four places. And "the country reaches every edge of its box": Tasmania's box runs 3.5 km past the main island in the north, for records there (`scripts/ingest/habitat.ts:45`). What holds is that land lies in the outermost tiles | fixed | `qa-fixes.ts` |
| Q37 | g7 | prose | T0 | Result: "the worst are islands under 135 km²". The list holds Vatican City and Macau | fixed | `qa-fixes.ts` |
| Q38 | s1 | number | T0 | "19 of the 28 museum specimens have no year": 20 do (10, 5, 3, 1, 1 across the rows, lab db) | fixed | `qa-fixes.ts` |
| Q39 | s1, p4, c1 | prose | T0 | "A few collared animals": the Jaguar Movement Database holds 134,690 fixes from 117 jaguars ([its record](https://doi.org/10.5061/dryad.2dh0223)). s1 now says so, with the link; p4 and c1 drop "a few". What each page teaches stands | fixed | `qa-fixes.ts` |
| Q40 | f4, s6, c1 | prose | T0 | "One collar study": the sample's dataset is a database that many teams' tracking fed, in 5 countries, so "study" says more than the data does. `jaguar_datasets` counts datasets; the prose now does too | fixed | `qa-fixes.ts` |
| Q41 | s1 | jargon | T0 | "A Darwin Core term", with no word on what Darwin Core is. Defined here; d6's passing use reads as itself | fixed | `qa-fixes.ts` |
| Q42 | s2 | prose | T0 | Result: "Every test says clustered", though the Concept says kernel density "doesn't test anything" and DBSCAN only labels. Two of the four are tests | fixed | `qa-fixes.ts` |
| Q43 | s2 | prose | T0 | "A z-score below −1.96 means a mean distance this small would happen by chance less than 5 % of the time": that's the two-sided figure s5 gives; one side alone is 2.5 % | fixed | `qa-fixes.ts` |
| Q44 | s2 | missing step | T0 | The worked example counts 1,972 records and lab 1 counts 1,784, with no word why. A hexagon that touches land reaches past the outline: 188 records lie in a cell but outside the island, at most 4.2 km from it (lab db) | fixed | `qa-fixes.ts` |
| Q45 | s2 | prose | T0 | 913 noise and 913 distinct locations, in one page and one paragraph of its Result: unrelated counts that read as one. Said so at the first | fixed | `qa-fixes.ts` |
| Q46 | s2 | wrong fact | T0 | "`ST_ClusterWithin` [is a] window function": it's an aggregate (`prokind` a, lab db). The window form is `ST_ClusterWithinWin`, PostGIS 3.4 | fixed | `qa-fixes.ts` |
| Q47 | s3 | prose | T0 | "A cell with no neighbour wouldn't appear here at all", then says its `count(*)` gives 0. The `LATERAL` count returns a row for it, so it would appear, with 0; that's what the check rests on | fixed | `qa-fixes.ts` |
| Q48 | s4 | number | T0 | "Differ … by 10⁻¹² at most": `z_norm` at 5 km differs by 1.05 × 10⁻¹² (`s4-moran-sql`, `s4-agree`) | fixed | `qa-fixes.ts` |
| Q49 | s4 | missing step | T0 | "This block runs when a PostGIS run starts" is the checker's view, and a learner told to roll back (setup, d3) would lose s4's tables. Says to keep its work | fixed | `qa-fixes.ts` |
| Q50 | s5 | jargon | T0 | "Under the null hypothesis", the course's only use, unexplained; s4 said "with no pattern" | fixed | `qa-fixes.ts` |
| Q51 | s5 | wrong fact | T0 | `esda.fdr` returns the Bonferroni bound "if every test would pass": it does when none passes (`len(sig_all) == 0`, esda 2.10.0) | fixed | `qa-fixes.ts` |
| Q52 | s5 | wrong fact | T0 | Concept's `m2 = Σ_k z_k² / n`, then the Dialects' esda gives `Is`: esda divides by `n − 1` (esda 2.10.0), so a learner comparing sees each off by (n − 1)/n. Says so; no sign or p-value moves | fixed | `qa-fixes.ts` |
| Q53 | s5 | prose | T0 | "The museum's material samples 21.4 % against 28.1 %": those shares are the whole dataset, specimens and an observation included (`s1-devil`, 569 rows, 558 samples) | fixed | `qa-fixes.ts` |
| Q54 | d1 | missing step | T0 | The tbls exercise says 16 tables agree, but `setup.py` and every download holding `s4-cells` leave s4's table and view in `learn_curriculum`, so a learner who ran one sees two more (the ledger's open item) | fixed | `qa-fixes.ts` |
| Q55 | every `.sql` holding `s4-cells` (s2–s5, c1) | prose | T2 | The download's header says each block "changes nothing", and `-- tx: own` runs as written; a `-- boot` block commits its tables (`s4.sql` has the `COMMIT`). Add it to the header, `scripts/learn/assemble.ts:81-82` | queued | `learn:check` download stage |
| Q56 | e1 | number | T0 | "73 GBIF keys and the lab sample's six filters": the request's six predicates are the keys plus five filters, as `e1-request` prints them | fixed | `qa-fixes.ts` |
| Q57 | e1 | wrong fact | T0 | "Apart from `creator` and `sendNotification`, it equals, as JSON, the request GBIF stored": the stored one also holds `type`, `interpretedExtensions` and `verbatimExtensions` (`data/raw/gbif-sample/download.json`). Its `format`, `checklistKey` and `predicate` do equal `build_request`'s, every key in order (lab db), and those are what `same` compares | fixed | `qa-fixes.ts` |
| Q58 | e2 | prose | T0 | "The decimal comma two records later": `e2-casts` puts `30 m` on the first record and the comma on the second | fixed | `qa-fixes.ts` |
| Q59 | e2 | wrong fact | T0 | "`read_postgis(sql, con, geom_col=…)` needs the geometry column's name": it defaults to `geom` (geopandas signature, the pinned version) | fixed | `qa-fixes.ts` |
| Q60 | e2 | prose | T0 | "The catalogue (`pg_class`…)": d1 defines the term as "catalog"; f1's "other catalogues" means something else and stays | fixed | `qa-fixes.ts` |
| Q61 | e3, e4 | missing step | T0 | e4's lead says "everything runs in the Python environment" and e3's names only Python and the browser; e4 has 3 PostGIS blocks and e3 has 2, which a learner runs in a SQL client. Worded as s6's. No 004 sentence: the leads are only on the pages | fixed | `qa-fixes.ts` |
| Q62 | e4 | prose | T2 | `e4-derived`'s comment ends "(§4.2)", a section of the design plan that a learner has no way to read as one. Drop it from 004's fence and `site/learn/sql/e4-derived.py`; the comment isn't output, so the result stays | queued | `learn:port --check e4`; `learn:check` |
| Q63 | p1 | number | T0 | "The other six tables": the worked example builds `fact_records` only, so seven of the eight remain, and the step goes on to name seven | fixed | `qa-fixes.ts` |
| Q64 | p2 | wrong fact | T0 | "Home → DAX query view": Microsoft's page says to select its icon on the left side. p2 opens Model view from the same bar. H6's step 5 corrected too | fixed | `qa-fixes.ts` |
| Q65 | p3 | prose | T0 | The Check sorts every continent but one: Seven seas has 0.0002 of the records against 0.0001 of the area (star files), past the 5 rows printed | fixed | `qa-fixes.ts` |
| Q66 | p4 | prose | T0 | "p3's `Records` measure": p2's Lab adds it, and p3's and p4's Labs both say it's there from p2 | fixed | `qa-fixes.ts` |
| Q67 | p4 | wrong fact | T0 | "With no gateway, because the base URL is fixed": the fixed URL avoids a dynamic data source. p1 has it right: files on a public URL need no gateway | fixed | `qa-fixes.ts` |
| Q68 | p4 | missing step | T0 | The pandas line's `.explore()` raises `ImportError` in the course's environment (run here): `folium` isn't pinned. Said as c1 says it of `jsonschema` | fixed | `qa-fixes.ts` |
| Q69 | c1 | missing step | T0 | Lead: "everything runs in your own PostgreSQL", but the Lab's stages use Python (e1 to e4) and Power BI, and the module's tools say so. As Q61. No 004 sentence: the leads are only on the pages | fixed | `qa-fixes.ts` |
| Q70 | c1 | prose | T0 | Q40's word left behind in the Concept: the records show a dataset, and the Lab already says "if one dataset dominates" | fixed | `qa-fixes.ts` |
| Q71 | c1 | prose | T0 | "The jaguar's 2,000 records are 1,948 GPS-collar fixes" reads as if the rest weren't records. p4's wording used | fixed | `qa-fixes.ts` |
| Q72 | c1 | prose | T0 | "A gateway, as d5's PostgreSQL connection does": d5 makes the login and sends the reader to p1; only p1's Lab connects and names the gateway. Removes §4's c1→d5 link | fixed | `qa-fixes.ts` |

## Ledger

R1–R6 read this first; R7 reads only this and what it points to. Prereqs read fine as ordered on R1's pages.

**Terms** (term | defined at | used undefined at):

| Term | Defined at | Used undefined at |
|---|---|---|
| record | map, schema, data | |
| DuckDB, PostgreSQL, PostGIS | setup | map names them as tools, with a link |
| GEOS, libpq, virtual environment, `ipykernel`, GeoPackage | setup | |
| haversine | setup ("the distance along the Earth's surface") | |
| WSL 2 | no | setup (Docker's backend; the installer handles it) |
| SRID, WGS 84, EPSG | g1 | setup, data, schema-lab, before g1 |
| WKB | g2 | setup, data, before g2 |
| GDAL, GeoParquet, GEOS's `TopologyException` context | no; the reader's trade. g2, g7 say what they do where they lean on them | setup, data, g2, g7 |
| Parquet | d2 (Q19) | data, setup, schema, before d2 |
| GiST | d3; g5 agrees (a tree of bounding boxes) | schema-lab, before d3 |
| ERD, PK, FK, UK, view | schema | |
| fact, dimension, grain, factless, conformed, unknown member | schema-star; d6 agrees | |
| `NULL`, `IS NULL`, `coalesce`, `IN` | f1 | |
| aggregate, `GROUP BY`, `HAVING`, `CASE`, `basis_of_record`, `MACHINE_OBSERVATION` | f2 | |
| join kinds, anti join, junction table, bounding box, `EXCEPT` | f3 | |
| normalized | f3 links forward to d2 | |
| subquery, CTE, window function, frame (`ROWS UNBOUNDED PRECEDING`) | f4 | |
| entity; candidate, alternate, natural, surrogate, foreign key; `CHECK`; generated column | d1 | |
| catalog, `::regclass` | d1 (Q18) | |
| functional dependency, anomalies, 1NF–3NF, BCNF, lossless split, denormalizing | d2 | |
| sequential scan, planner, statistics, B-tree, Index/Bitmap scan, correlation, BRIN, `EXPLAIN` | d3 | |
| `VACUUM`, autovacuum | d4; d3 says "housekeeping" (Q24) | |
| ACID, autocommit, savepoint, MVCC, snapshot, isolation levels, deadlock, idempotent, upsert, `EXCLUDED`, `RETURNING` | d4 | |
| `IS DISTINCT FROM` | d4 (Q25) | |
| role, membership, owner, PUBLIC, schema, `search_path`, default privileges, RLS | d5 | |
| measures (additive, semi, non), snowflake, degenerate, drill across, slowly changing types, aggregate fact | d6 | |
| fan-out | d6 says it explains itself in f3, which calls it "the row multiplier" (block `f3-fan-out`). R7: other uses | d6 |
| `DISTINCT ON` | no; g7 says what it does where it uses it (keeps each record once) | d4 names it as the fix for a duplicated batch (s2 answers, below) |
| `FILTER (WHERE …)`, `LATERAL` beyond f3 | blocks only; `FILTER` reads as itself | d3, d4, d5, d6 |
| ACL, SQLSTATE, struct | no; the reader's trade | d5, d4, d2 |
| CRS, ellipsoid, datum, geographic, projected, equal-area, conformal, `geography`, axis order | g1 | |
| WKT, EWKT, shell, hole, part, valid, nested shells, coverage, DE-9IM | g2 | WKT in g1's `srtext`, a line before g2 |
| one field of a row, `(f(x)).field` | g2 (Q27) | |
| spatial predicate, spatial join, prepared copy; `ROLLUP`, `MATERIALIZED` | g3 | |
| buffer, overlay, dissolve | g4 | |
| `<->`, nearest neighbours, expression index on `geom::geography` | g5 | |
| `ST_Dump` | g6 (Q32) | |
| MAUP, scale effect, zoning effect | g6 | |
| raster, georeference, out-db, tile, nodata, method 1, method 3 (Q33), border cells | g7 | method 1 in s6, with a link |
| Darwin Core | s1 (Q41) | d6, in passing |
| basis of record's seven values, telemetry, fix, recording effort, the wording rule | s1 | |
| complete spatial randomness, clustered, dispersed, quadrat, VMR, Clark-Evans R, study area, kernel density, bandwidth, DBSCAN, core point, noise | s2 | |
| `DISTINCT ON` | s2 says it where it uses it (one record per pair of coordinates); answers R2's question | d4 |
| z-score | s2 by use, s4 by definition; s5 agrees (Q43) | |
| standard error, standard deviation, Poisson, kurtosis | s2, s4 gloss in place or lean on the reader's trade | s2, s4 |
| weights matrix, binary, distance band, k-nearest, ties, contiguity, rook, queen, spatial lag, island (a unit with no neighbour), k-d tree | s3 | island used in s4's geometry check, with its gloss |
| spatial autocorrelation, global and local, Moran's I, E[I], normality, randomization, permutation test, pseudo p-value | s4 | |
| Gi\*, hot and cold spot, two-sided, LISA, quadrants, outlier, conditional permutation, FDR, Bonferroni | s5 | |
| null hypothesis | s5 (Q50) | |
| zonal statistics, density, record-to-area ratio, target group, effort-normalized ratio, chi-square, degrees of freedom, EASE-Grid 2.0 | s6 | |
| search API, download API, predicate, 429, 5xx, exponential backoff, `Retry-After`, jitter, sha256, intent file, reconciling, checklist | e1 | |
| staging, `COPY`, NUL byte, `pg_input_is_valid`, `pg_input_error_info`, synonym (`taxonKey`, `speciesKey`), effective license | e2 | effective license also in e4, with the same words; savepoint glossed again in place |
| deterministic, idempotent batch, ledger, snapshot, job key, `TRANSFORM_VERSION`, `SCHEMA_VERSION` | e3; e5 agrees | |
| reject and flag checks, `NaN`, quarantine, provenance, derived dataset | e4 | |
| exit code, `EnvironmentFile=`, `OnFailure=`, `MAILTO`, advisory lock, incremental load | e5 | advisory lock named in e3's Dialects, with a link |

**Claims** (claim | where | checked):

| Claim | Where | Checked |
|---|---|---|
| Sample: 40,395 records, 400 datasets, 71 of 76 species, 106 countries, 250 `countries` rows | setup, f2 | results |
| Cap 2,000 records per species, lowest `md5` of the GBIF id; 13 species at the cap | data, f2, f4 | results |
| Licences: only CC0 1.0 and CC BY 4.0, the record's or the dataset's when stricter | data, f2, f3 | results |
| 5 species without records: 3 unsettled, Ili Pika none open, Yangtze turtle's only open record in a CC BY-NC dataset | f1, f3 | results; the turtle's dataset not re-checked |
| Country rule: one record outside the core region is left out; the sample keeps it | f3 | AGENTS.md rule; ids 4 and 50 have 1 BR record each, Tiger, Chimpanzee, Wild Dog on both lists (lab db) |
| Devil: 2,000 records, 1,993 around Tasmania, 7 elsewhere; Jaguar: 20 countries, 97.4 % one GPS dataset | f3, f4 | results. Why 1,972: below |
| Most species' samples lean on one or two datasets | f4 | 55 of 71 have ≥ 50 % in their top two (lab db) |
| Before 1900 mostly specimens | f2 | 110 of 140 (lab db) |
| Exactly 2 animals with `photo_license` `NULL` | f1 | lab db |
| Tested pair: PostgreSQL 16, PostGIS 3.4; EDB also 3.5; Docker tags 16-3.5, 16-3.6 may change last digits | setup | image dates from Docker Hub: 16-3.4 last built 2024-10-14, amd64 only, as stated |
| Python 3.12, uv 0.13.5, 44 pins; `.venv` installers | setup | U2; Q5, Q6 run here |
| Browser result cap 10,000 rows; 4 files build 8 tables + 1 view | setup, schema | `setup-counts` |
| Editors roll back; only the playground keeps changes, and they follow the learner through in-site links until Reset or reload | playground, f1–f4, d1 | `learn-browser.spec.ts:570-590`. So "if you changed them in the playground, Reset database first" is right, though it reads odd |
| PostGIS results print the first 5 rows and "… n more rows" | setup | `result.ts`. Prose can't ask to compare rows it doesn't print (Q9); R2–R6 watch for it |
| Lab: 16 tables, admin-1 for nine countries, clips all of Costa Rica and Tasmania, loader needs `postgis` and `postgis_raster` | schema-lab, data, setup | lab db, loader, Q10, Q12. R3 (g7) to agree |
| s4 at 5 km: 1,094 cells, I = 0.273296, z_rand 15.246590 | setup's arcpy block | s4's results agree |
| Star: `dim_country` 251 rows, `ZZ` and `-1` unknown members; rows 76, 251, 400, 177, 40,395, 472, 75, 5,578 | setup, schema-star, d6 | d6's results agree; R6 to agree |
| Hours: 6, 12, 12.5, 12.5, 10, 7, 8 | map, tracks | sums of `curriculum.json` |
| Every module has an exercise; 8 browser checks, 28 show an answer | map (Q13) | 33 modules, 36 slots |

| Lab: 16 tables, 74 columns, 17 ERD lines; rows 90,072, one transaction | d1, d4 | lab db, `lab.mmd`. Every download holding the boot block `s4-cells` (`s2`–`s5`, `c1`, `setup`) commits `s4_cells` and `s4_neighbours` into `learn_curriculum` (`s4.sql` has the `COMMIT`; seen in the lab db after `setup.ipynb`). `DROP … IF EXISTS` first, so re-running is safe; one run before d1's tbls exercise shows 17 tables; d1 says so (Q54), s4 says to keep it (Q49), the header queued (Q55) |
| Devil: 2,000 records, 41 no year, 1,858 since 2000, 101 before; 1,998 `AU`, 2 `US`; 182 in 2010. Jaguar: 1,994 with a year | d3, d4, d5 | results; jaguar lab db |
| Pangolins: Temminck's 9 (first 1930), giant 10; 13 of 19 before 2018; 2018 a teaching boundary (Gaubert et al. 2018) | d3, d6 | results |
| Outside ids: 8 `UNIQUE` on `species` (slug, name, six ids); missing gbif 3, col 7, wikidata 0, inaturalist 2, ncbi 1 | d1 | results; f1's three |
| iNaturalist research-grade in the full download: 9,581 CC BY, 3,152 CC0; dataset declares CC BY-NC | d2 | Not in the repo's sample, so not re-checked. Source named by the build plan `plans/2026-10-23-critwire-learn-curriculum.md:1506` (an earlier spike's `summary.md`, not committed) |
| `ANALYZE` in a transaction is undone by `ROLLBACK` | d3 (Q16) | lab db: 316 common `dataset_key`s inside, 100 after |
| `occurrences`: 8 kB pages, about 50 rows each, 832 pages, 7 BRIN ranges | d3 | `d3-sizes` 6,656 kB; `d3-brin` |
| Every geometry column has a GiST index; loader ends tables with `ANALYZE` (16) and starts with `ON_ERROR_STOP` | d3, d4 | lab db, loader |
| `MU`, `RE` are "Seven seas (open ocean)" | d6 | lab db |
| Trinidad and Tobago 2 records, 22 habitat classes; Åland 0 | d6 | results |
| tbls 1.96.1 sha256s | d1 | both downloaded, both match |
| PUBLIC's and the test db's privileges as d5 says | d5 | full 13 rows of `d5-privileges` in the lab db |
| 8,500 systems; 3577's parallels and `+towgs84` | g1 | lab db |
| Ellipsoid and Albers within 0.1 % on all 9 states; Mercator 1.13 to 1.81, within 0.01 of 1 ÷ cos² | g1 | all 9 rows, lab db |
| 11 invalid shapes (Goiás, 10 ecoregions: 7 ring, 3 nested); 247 valid outlines; 8 overlapping pairs | g2, g3, g4 | names and part counts, lab db |
| Join: 40,329 pairs, 39,396 records in an outline, 39,190 agree, 206 disagree, 999 in none; 933 in two; `FR` 944 falls to 11, the 11 coded `FR` | g3, g5, g7 | results; lab db. 193 of the 206 lie within 5 km of their coded country's outline, so g4's "mostly records like these" holds |
| Timings 7 s against 0.3 s; 82 s against 0.45 s | g3 | here: 6.8 s, 0.31 s, 82.4 s |
| Costa Rica: outline 51,303 km², pieces 49,908, gap 2,070, of it 969 within 5 km of the sea; strips' 3 and 2 records outside the outline | g4 | lab db |
| Hobart's nearest: 11 records at 7.081 km, 13 at 8.003, one at 8.185, ranks 16 to 30 | g5 | lab db |
| The 999: 436 under 5 km, 529 from 5 to 25, 34 beyond; 346 bilby on one island (136.1° E, 35.0° S), 133 turtle at 144.5° E, 7.7° S | g5 | lab db; `nearest in metres for all 999` not re-checked |
| Devil in cells: 1,972 at 5 km, 1,990 at 10 km; Maria Island's 12, 11.7 to 13.9 km off; 6 on other states (3 Victoria, 1 Northern Territory, 2 New Mexico). Top 10 km cell's 475 split 309, 137, 29 | g6 | lab db. s4's cells are these; why 1,972: below |
| Windows 836 × 836, most records on 0.05° steps (Q35); 5,003 + 6,329 marine neritic cells; `g7-scale`'s 78 (46 tied, 31 within 9 cells, 1 on the clip's edge) and the other 78 on montane forest | g7 | lab db |
| Method 3 over method 1: 0.999074 of the outlines, as `data/learn/habitat.json`'s `estimateOverOutline` | g7 | file; full 35 rows of `g7-country` and 13 of `g7-ex` read |
| Trinidad and Tobago and Åland, marine +12.5 % and +13.9 % | g7 | Earlier comparison's numbers, not in the repo's sample, not re-checked |
| IUCN's files: `id_no`, several rows per taxon; the name column's 2023 rename | g3 | `id_no` and the row codes from public listings of IUCN's layers. No IUCN file read, as the rules ask. The rename not re-checked |
| Basis of record: 7 values, 17,587 / 10,568 / 8,418 / 1,805 / 1,384 / 441 / 192; machine observations from 22 species | s1 | lab db |
| Of 38 species with ≥ 100 records, 17 over half from one dataset, 6 at 90 % or more; flying fox `INSDC Sequences`, sengi Dakatcha survey | s1 | lab db |
| Peaks: frog 2017, zebra 2008, tiger 2021 (1,198 Facebook, India), cheetah 2007 (919), each named from its dataset's title; no year beats every year for 11 species, softshell 362 against 87 | s1 | lab db. "Each peak is one project" names three of the four; the flying fox's 61 are one dataset's, Comoros, 2016 |
| Jaguar Movement Database: 134,690 fixes, 117 jaguars; 1,948 here in BR, PY, AR, CR, MX, 2001 to 2016; all 94 of Costa Rica's, 2014 to 2016 | s1 (Q39), e4, s6, p4, c1 | Sample: lab db. Whole database: its Dryad record and data paper, not in the repo's sample. R5, R6 to agree |
| Devil's 28 museum specimens: 20 with no year (Q38); 1,367 + 46 atlas, 70.7 %; first year 1599 | s1 | lab db |
| Devil: 1,784 inside the main island, 188 in a cell outside it (≤ 4.2 km, Q44), 28 in no 5 km cell (12 Maria Island, 10 offshore, 4 mainland, 2 New Mexico) | s2, s4 | lab db. Answers R1's and R3's "say why 1,972". f3's 7 elsewhere are these 6 off Tasmania's states plus one at 150.3° E |
| s4's cells: 1,094 and 296, 1,972 and 1,990, 256 and 475; 6,246 and 1,620 ordered pairs; I 0.2733, z 15.18, `z_rand` 15.25 | s2–s5, setup | results; setup's arcpy block agrees |
| Cell 917's and 888's neighbours; 947 and 948 touch; 888's other five hold 6 | s2 | lab db |
| 5 km cells by neighbours 1, 7, 36, 66, 45, 939; 10 km fewest 2 (6 cells), 221 with six; cell 1051 | s3 | lab db |
| Outlines: 247, 76 intersect none, 84 by `ST_Touches`, 12 in eight nested pairs, 16 for China; Singapore 3.0 km from Malaysia | s3 | lab db, all 12 listed. g2's eight pairs agree |
| Mean `y` 0.364 below ln 2; 787 cells empty | s5 | lab db |
| Costa Rica: 619 records, 591 inside, 501 in a zone (3 in two), 90 in gaps; estimated 51,199 km², arable 31 %, montane 26 %; 216 tree frogs on arable, plantations 2 | s6 | lab db |
| Marine Neritic 59: 54 inside, up to 3.3 km from the edge, 5 outside | s6 | lab db |
| `esda` 2.10.0: `fdr` falls back when no test passes (Q51), `Is` uses n − 1 (Q52), `p_norm` one-sided, `q` numbering, value at the mean is low; `DistanceBand` leaves two points at one spot apart; `libpysal` 4.15.1 `Graph.build_*` | s3, s4, s5 | read in the venv's source, or run |
| DuckDB 1.5.6: `count(DISTINCT (a, b))`, `ILIKE`, `arg_max`, `var_*`, `stddev_pop`, `^`, `**`, `/`, `//`, no `erfc` | s1, s2, s4, s5 | run here |
| Course's download: 394,532 records, 454 datasets, 34,725,756-byte zip, created 2026-10-23, 73 keys; its `format`, `checklistKey`, `predicate` = `build_request`'s (Q57) | e1, e2 | `data/raw/gbif-sample/download.json`, lab db. 16 min 41 s: the ingest plan's log |
| GBIF: "If no `checklistKey` is supplied the obsolete GBIF Backbone Taxonomy will be used" | e1 | techdocs.gbif.org, read today, word for word |
| GBIF keeps a cited download | e1 | GBIF's stated rule, not re-read. The course's own still shows `eraseAfter` 2027-04-23 though cited: open with the owner as H3 |
| Load 6.7 s and 14.2 s; text format changed 9 rows, csv form kept 97; 2,385 synonym records | e2 | Only in 004's spike notes; the spike's files aren't in the repo, not re-checked. The 4 synonym species agree with the ingest plan |
| `pg_input_is_valid` strict, so NULL gives NULL; sample has a `CHECK` on uncertainty, `>= 0 AND < 'Infinity'` | e2, e4 | lab db |
| 100 per species: 4,766 records, 38 species at 100 of 71; lowest devil id has no year, so "one missing year" holds | e3 | lab db |
| No record within 5° of 0, 0 (nearest 5.73°); two tiger records at 102° E on the equator, `ID`; 10 records before 1700, all devil, 1599 | e4 | lab db |
| Devil and jaguar: 33 datasets, 29 CC BY (3,992), 4 CC0 (8); Jaguar Movement Database 1,948 of 2,000 agrees with R4's row | e4 | lab db, results |
| `datasets`: 400, 124 CC0 1.0, 276 CC BY 4.0, none without a DOI | e4, e5 | lab db |
| `POST /v1/derivedDataset`, `relatedDatasets` a map of dataset key to count | e4 | `scripts/gbif/derived-dataset.ts`, `scripts/gbif-register.ts` |
| Systemd recipe: units parse, `Mon *-*-* 04:17:00` next falls on a Monday | e5 | `systemd-analyze verify` and `calendar` here; the one complaint is the example's unbuilt `.venv`. Not started as a timer |
| DuckDB `read_csv` with `delim`, `quote = ''`, `all_varchar`, `store_rejects` into `reject_errors`; `NaN` equal to itself and greatest; `isfinite`, `isnan`, `isinf`; both upsert forms; `md5` | e2, e3, e4 | run here, DuckDB 1.5.6 |

**R1's flagged numbers:** setup's 3.4, 3.5, 5432, 5433, 2024, 10,000 and 251, f2's 1.0, 4.0, 1,000 and 3.5 (`7 / 2`), f4's 1,000: all right; versions, ports, thresholds or the outside facts above. f1 and f3 flag none.

**R2's flagged numbers:** d1's 1.96 (tbls), d2's 9,581 and 3,152 (above, unchecked), 2025 (SQL Server), d3's 300, 100, 30,000, 1,000 and 300,000 (`ANALYZE`'s sample), 0.62 (Q22), d4's 2005 (its record, lab db), 2019, 496, 143, 1,994 (each derived, added up), 9.5 (version), d5's 9.5, 2016 (versions), d6's 2000, 2005, 2017, 2018, 2010, 2020, 2016 (years in prose): all right. Small integers and rates (seven in ten, 72 %, nine times, a twentieth, three pages, seven ranges, four of them, 84 datasets, 22 classes): each worked out from its result.

**R3's flagged numbers:** g1's 111, 0.1, 1.13, 0.01, 8,500, 1.29, 4.76, 2.6, 3.95, 190, 664, 0.5; g2's 3.10, 0.05, 811, 481, 477; g3's 0.3, 0.1, 933, 40,395, 924, 2023, 247, 0.45; g4's 4326, 0.05, 637, 198, 97.3, 100, 51,978, 675, 1.3, 4.0, 40,395, 0.7, 10,000, 5.2, 4.5, 2,670, 2,500, 206; g5's 4326, 1.36, 147.33, 42.88, 8.185, 81.7, 111.1, 999, 436, 346, 7,088, 7,081; g6's 4.8, 40.6, 43.7, 8.2, 11.1, 2,000, 0.3, 384, 3.1; g7's 2020, 10.5281, 1.6, 14.1, 4326, the grid's constants, 635, 836, the windows' bounds, 0.75, 698,896, 42.7, 110.6, 111.1, the four cell areas, 7,386, 202, 693,893, 5,003, 900, 6,329, 6,785.90, 0.01, 0.978, 618, 121, 132, 0.09, 431, 0.71, 13.16, 1,900, 908, 6.4, 909, 1.3, 501, 502, 3.9, 290, 2,616, 135, 1.1, 2.8, 1200, 500, 11.04, 144, 12.5, 13.9: all right, by the claims above, by arithmetic or as outside facts, bar 81 (Q26) and the order of 3.9 and 4.8 (Q34). Small integers and rates (seven ecoregions, ten pairs, eight pairs, thirteen records, a quarter less, half of the gap, 54 %, 60 %): each worked out from its result.

**R4's flagged numbers:** s1's 40,395, 441, 192, 70.7, 1642, 1,198, 2007, 919, 362, 1976; s2's 1.96, 31,000, 37,000; s3's 1,094, 221, 296, 8.66, 155, 449, 1,972, 1.2; s4's 1.73, 3577, 8,660.254, the rounded 0.2733, 15.18, 0.2036, 15.25, 0.0008, 0.0182, 0.2291; s5's 1.96, 999, 1000, 1.29, 787, 0.001, 3.6, 1,108, 1,972, 1.5; s6's 7.41, 6933, 2.0, 501, 216, 2,107, 0.08, 514, 9.50, 20.01, 3.3, 4326: all right, by the claims above, by arithmetic or as outside facts. Small integers and rates (55 cells by chance, three in four, more than half, a seventh, a quarter, 31 %, 56 %, the chi-square's 77.4 by hand, the FDR cut 47 × 0.05 ÷ 1,094): each worked out. 19 (Q38) and 10⁻¹² (Q48) weren't.

**R5's flagged numbers:** e1's 300 and 100,000 (GBIF's search limits, from what's known of its API, not re-read), 1.0, 4.0, 34,725,756, 394,532, 9110 and 10.2 (the RFC), 502, 504 (curl's retried codes), 1984 (WGS 1984); e2's 394,532, 6.7, 14.2, 2,385 (above), 180 (the `CHECK`); e4's 200,000 (an illustration), 1.0, 59.4, 1599, 1642, 3,992, 2031 (made up): all right, by the claims above, by arithmetic or as outside facts. e3 and e5 flag none. Small integers and rates (e1's 73, e2's three records and one-kilometre buffers, 6,273.1 km² as 2,000 × a 64-sided circle, GeoPandas' default, e3's 4,766, runs 1 to 8, e4's 29 and 4, e5's 124 and 400): each worked out from its result. "Six" (Q56) and "two records later" (Q58) weren't.

R5's reading of the dialects: DuckDB's as in the claims; PostgreSQL's by the blocks and `pg_proc`; GeoPandas's by the pinned signature (Q59). curl, urllib3, pygbif, rgbif, SQL Server, `pg_cron`, Task Scheduler and ArcGIS Pro lines read against what's known of those tools, not run. One doubt left as written: e5 says Task Scheduler "can restart a failed task", and the recipe sets `-RestartCount 2`. Microsoft's schema page says a task restarts "if the task fails for any reason"; whether a non-zero exit counts isn't stated, and there's no Windows here to try. The recipe's real alert is its last sentence, `LastTaskResult`, which holds either way. e2's and e5's diagram alt text read: says what each figure shows. `e1-submit` isn't run (`untested`, its reason on the page); read only.

For R7: e4→s1, s2, s5 still owe their verdict. Spelling: e1, e2, p1, p4 write "licence" and the rest "license". `setup.sql:101`'s comment names `plans/004-learn-curriculum.md`, a path in the public repo, so it resolves; a boot block, no change proposed. Q62's check found no other "§" in `site/learn/`. R5 prereqs read fine as ordered.

R4's reading of the dialects: DuckDB, esda and libpysal lines as in the claims; PostgreSQL's by `pg_proc` and the blocks. SQL Server and ArcGIS Pro lines read against what's known of those products, not run; no such tool here, as setup says. R7 still owes the verdict on s1→f4, s2→g5, s3→g5. s4's diagram alt text read: says what the figure shows.

R3 prereqs read fine as ordered; R7 still owes the verdict on the out-of-closure links (g2→d3, g3→d3, g4→d3, g5→g4, g6→g5, g7→g5). `g3-iucn` isn't run (`untested`, its reason on the page); read only. Diagrams' alt text read: both say what the figure shows.

R2 prereqs read fine as ordered; d3's and d6's links back all resolve to what they name. `d5-database` isn't run (`untested`, its reason on the page); read only.

**Finding 8's other site:** `scripts/learn/assemble.ts:190`, "Open it in Jupyter or VS Code, with the environment's Python as its kernel", reads true now that setup installs Jupyter (Q5). No change; nothing queued for U11 from R1.

## Method

Throwaway scripts, kept here because they're in no repo file.

Reader's triage (R1–R6): its totals today are 1,133 tokens, 739 present, 394 absent. Save as `/tmp/critwire-qa/qa-read.mts`:

```ts
// Prose-number triage for one page, or the whole course's totals (`all`). Not a gate; a human gives every verdict. From the repo root:
//   pnpm exec tsx /tmp/critwire-qa/qa-read.mts <module id|setup|playground|schema-schema|schema-lab|schema-star|dist path|all>
// Prints the page with each slot expanded to its code + recorded result, then every number token outside code/pre/var absent from the page's results.
import { existsSync, readdirSync, readFileSync } from "node:fs";

const read = (f: string) => readFileSync(f, "utf8");
const MODS = readdirSync("site/learn/modules").map((f) => f.replace(".html", ""));
const OTHER = ["setup", "playground", "schema-schema", "schema-lab", "schema-star"];
const sourceOf = (p: string) => [`site/learn/modules/${p}.html`, `site/learn/pages/${p}.html`, `dist/${p.replace(/\/?$/, "/")}index.html`].find(existsSync);
const blockCode = (id: string) => {
  const f = ["sql", "py", "m", "dax"].map((e) => `site/learn/sql/${id}.${e}`).find(existsSync);
  return f ? read(f) : "";
};
const resultOf = (id: string) => [`site/learn/labs/checked/${id}.txt`, `e2e/__snapshots__/${id}.txt`].filter(existsSync).map(read).join("\n");
const SLOT = /\{\{(block|exercise|skip|diagram):([^}]+)\}\}/g;
const ids = (html: string) => [...html.matchAll(SLOT)].filter((m) => m[1] !== "diagram").map((m) => m[2]!.split(" ")[0]!);
const strip = (s: string) => s.replace(/<(pre|code|var|script|style)\b[\s\S]*?<\/\1>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ");
const NUM = /(?<![\w.,-])\d{1,3}(?:,\d{3})+(?:\.\d+)?|(?<![\w.,-])\d+\.\d+|(?<![\w.,-])\d{3,}(?![\w-])/g;
const tokens = (html: string) => [...strip(html.replace(SLOT, " ")).matchAll(NUM)].map((m) => m[0]);
const bare = (t: string) => t.replace(/,/g, "");
const scan = (p: string) => {
  const html = read(sourceOf(p)!);
  const results = ids(html).map(resultOf).join("\n").replace(/,/g, "");
  return { html, toks: tokens(html), absent: tokens(html).filter((t) => !results.includes(bare(t))) };
};
const arg = process.argv[2]!;
if (arg === "all") {
  const all = [...MODS, ...OTHER].map(scan);
  const n = all.reduce((a, s) => a + s.toks.length, 0), abs = all.reduce((a, s) => a + s.absent.length, 0);
  console.log(`${n} tokens, ${n - abs} present, ${abs} absent`);
} else {
  const { html, absent } = scan(arg);
  console.log(html.replace(SLOT, (_m, kind: string, slot: string) => { const id = slot.split(" ")[0]!; return kind === "diagram" ? `[diagram ${id}]` : `\n--- ${kind} ${slot}\n${blockCode(id)}\n--- result\n${resultOf(id)}\n---\n`; }));
  console.log("\n=== numbers absent from this page's results");
  for (const t of [...new Set(absent)]) {
    const elsewhere = [...MODS, ...OTHER].filter((q) => q !== arg && (read(sourceOf(q)!).includes(t) || ids(read(sourceOf(q)!)).some((i) => resultOf(i).replace(/,/g, "").includes(bare(t)))));
    console.log(`${t}  elsewhere: ${elsewhere.join(" ") || "-"}`);
  }
}
```

Notebooks, in a learner's venv under `learn:check`'s protocol. From the repo root, after `pnpm build`, the script saved as `/tmp/critwire-qa/qa-notebooks.mts`:

```sh
# From the repo root, after pnpm build; the script saved as /tmp/critwire-qa/qa-notebooks.mts
V=$(mktemp -d); cp dist/learn/labs/requirements.txt "$V"
(cd "$V" && export UV_PYTHON_DOWNLOADS=never && uv venv --python 3.12 && uv pip sync --no-build requirements.txt \
  && .venv/bin/python -c "import geopandas, esda; print(geopandas.__version__, esda.__version__)" \
  && uv pip install --constraint requirements.txt ipykernel nbclient)
pnpm exec tsx /tmp/critwire-qa/qa-notebooks.mts "$V/.venv"; rm -rf "$V"
```

```ts
// Runs every dist/learn/labs/*.ipynb in a learner's venv under learn:check's protocol. From the repo root:
//   pnpm exec tsx <this file> <venv>
// .mts: outside the package, top-level await needs ESM. Imports at run time, so it reads the repo as it stands.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const from = (p: string) => import(pathToFileURL(resolve(p)).href);
const { loadEnv } = await from("scripts/env.ts");
const { childEnv, labTarget, LAB_ROLE, pgConnect, psqlArgs } = await from("scripts/learn/pg.ts");
const { assertConnectedNotLive } = await from("scripts/learn/check.ts");
const { takeLabLock } = await from("scripts/learn/cleanup.ts");
const { LOADER } = await from("scripts/learn/freshness.ts");
const { learnObjects } = await from("scripts/learn/leaks.ts");
const { pythonApp, pythonEnv, pythonFailure, runPython } = await from("scripts/learn/python.ts");

const venv = resolve(process.argv[2]!);
const TIMEOUT_S = 600;
const stop = new AbortController();
for (const s of ["SIGINT", "SIGTERM"] as const) process.once(s, () => stop.abort(new Error(`interrupted by ${s}`)));
loadEnv();
const lab = labTarget(process.env);
const sql = pgConnect(lab);
const [who] = await sql`select current_database() as db, current_user as "user", rolsuper as superuser from pg_roles where rolname = current_user`;
assertConnectedNotLive(who.db);
if (who.user !== LAB_ROLE || who.superuser) throw new Error(`${who.user}: run as ${LAB_ROLE}, no superuser`);
const app = pythonApp();
const lock = await takeLabLock(lab, who.db, { app });
const tmp = await mkdtemp(join(tmpdir(), "critwire-qa-nb-"));
try {
  const mplConfig = join(tmp, "mpl");
  await mkdir(mplConfig);
  const env = { ...pythonEnv(lab, { learnBase: pathToFileURL(resolve("dist")).href, app, mplConfig }), PATH: `${venv}/bin:/usr/bin:/bin` };
  const labs = resolve("dist/learn/labs");
  for (const name of (await readdir(labs)).filter((f) => f.endsWith(".ipynb")).sort()) {
    const file = join(labs, name);
    await promisify(execFile)("psql", ["-q", ...psqlArgs(resolve("dist/learn/data", LOADER))], { env: childEnv(lab), maxBuffer: 64 << 20, signal: stop.signal, killSignal: "SIGINT" });
    const driver = `import nbclient, nbformat\nnbclient.NotebookClient(nbformat.read(${JSON.stringify(file)}, as_version=4), kernel_name="python3").execute()\n`;
    const started = Date.now();
    const r = await runPython(driver, { python: `${venv}/bin/python`, env, timeoutMs: TIMEOUT_S * 1000, signal: stop.signal });
    const failed = pythonFailure(r, TIMEOUT_S);
    if (failed) throw new Error(`${name}: ${failed}`);
    const left = (await learnObjects(sql)).filter((o: string) => !lock.known.has(o));
    if (left.length) throw new Error(`${name} left behind: ${left.join(", ")}`);
    console.log(`${name} ${createHash("sha256").update(await readFile(file)).digest("hex")} exit 0, ${((Date.now() - started) / 1000).toFixed(1)} s, nothing left`);
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
  await sql.end();
  await lock.release();
}
```

External links:

```sh
grep -rhoE 'href="https?://[^"]+"' dist/learn --include=index.html | sed -E 's/^href="|"$//g; s/&amp;/\&/g' | sort -u > /tmp/critwire-qa/links.txt
sed 's/.*/url = "&"\noutput = "\/dev\/null"/' /tmp/critwire-qa/links.txt > /tmp/critwire-qa/links.curl
curl --rate 2/s -sSL --max-time 30 -A 'critwire-qa (+https://critwire.com)' -w '%{http_code} %{url}\n' -K /tmp/critwire-qa/links.curl > /tmp/critwire-qa/links.out 2>&1
```

Non-200 DOIs, a file of DOIs as argument (`python3.12 -I classify.py <file>`). Then each one left unconfirmed opened once in Chromium.

```py
# For each non-200 DOI: the DOI handle record, then GBIF's own registry entry when the target is a GBIF dataset. <= 2 req/s.
import json, re, sys, time, urllib.request, urllib.error
UA = {"User-Agent": "critwire-qa (+https://critwire.com)"}
def get(u):
    time.sleep(0.5)
    try:
        with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=30) as r:
            return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b""
    except Exception as e:
        return 0, str(e).encode()
out = {}
for line in open(sys.argv[1]):
    doi = line.strip()
    s, b = get("https://doi.org/api/handles/" + doi)
    rec = {"handle": s}
    if s == 200:
        v = [x["data"]["value"] for x in json.loads(b)["values"] if x["type"] == "URL"]
        rec["url"] = v[0] if v else None
        m = re.search(r"gbif\.org/dataset/([0-9a-f-]{36})", rec["url"] or "")
        if m:
            s2, b2 = get("https://api.gbif.org/v1/dataset/" + m[1])
            rec["gbif"] = s2
            if s2 == 200:
                d = json.loads(b2)
                rec["deleted"] = d.get("deleted"); rec["title"] = d.get("title", "")[:60]
    out[doi] = rec
    print(doi, json.dumps(rec), flush=True)
```

Setup's platform claims, from a folder holding `requirements.txt`, for each `--python-platform` of `x86_64-pc-windows-msvc`, `x86_64-unknown-linux-gnu`, `aarch64-unknown-linux-gnu`, `aarch64-apple-darwin`, `x86_64-apple-darwin` (`MACOSX_DEPLOYMENT_TARGET=14.0` for the last two):

```sh
uv pip install --dry-run --target d --python-version 3.12 --python-platform <platform> --only-binary :all: --no-deps -r requirements.txt
```
