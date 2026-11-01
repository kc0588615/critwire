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
| map | `/learn/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| playground | `/learn/playground/` | 4 | 0 | 0 | 0 | 278 | R1 |  |
| data | `/learn/data/` | 4 | 0 | 0 | 0 | 3248 | R1 | Q3, Q4 |
| setup | `/learn/setup/` | 4 | 0 | 0 | 1 | 22 | R1 |  |
| schema | `/learn/schema/` | 4 | 0 | 0 | 0 | 114 | R1 |  |
| schema-lab | `/learn/schema/lab/` | 4 | 0 | 0 | 0 | 98 | R1 |  |
| schema-star | `/learn/schema/star/` | 4 | 0 | 0 | 0 | 36 | R1 |  |
| track foundations | `/learn/foundations/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track database-architecture | `/learn/database-architecture/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track gis-in-sql | `/learn/gis-in-sql/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track spatial-statistics | `/learn/spatial-statistics/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track etl | `/learn/etl/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track power-bi | `/learn/power-bi/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| track capstone | `/learn/capstone/` | 4 | 0 | 0 | 0 | 0 | R1 |  |
| f1 | `/learn/foundations/select/` | 4 | 0 | 0 | 8 | 66 | R1 |  |
| f2 | `/learn/foundations/aggregate/` | 4 | 0 | 0 | 9 | 96 | R1 |  |
| f3 | `/learn/foundations/join/` | 4 | 0 | 0 | 14 | 70 | R1 |  |
| f4 | `/learn/foundations/window/` | 4 | 0 | 0 | 7 | 1018 | R1 |  |
| d1 | `/learn/database-architecture/keys/` | 4 | 0 | 0 | 13 | 26 | R2 | Q1 |
| d2 | `/learn/database-architecture/normalize/` | 4 | 0 | 0 | 14 | 114 | R2 |  |
| d3 | `/learn/database-architecture/indexes/` | 4 | 0 | 0 | 0 | 0 | R2 |  |
| d4 | `/learn/database-architecture/transactions/` | 4 | 0 | 0 | 0 | 2 | R2 |  |
| d5 | `/learn/database-architecture/roles/` | 4 | 0 | 0 | 0 | 0 | R2 |  |
| d6 | `/learn/database-architecture/star/` | 4 | 0 | 0 | 2 | 2 | R2 |  |
| g1 | `/learn/gis-in-sql/crs/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g2 | `/learn/gis-in-sql/load-validate/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g3 | `/learn/gis-in-sql/spatial-join/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g4 | `/learn/gis-in-sql/measure-overlay/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g5 | `/learn/gis-in-sql/spatial-index/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g6 | `/learn/gis-in-sql/grids/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| g7 | `/learn/gis-in-sql/raster/` | 4 | 0 | 0 | 0 | 0 | R3 |  |
| s1 | `/learn/spatial-statistics/bias/` | 4 | 0 | 0 | 3 | 394 | R4 |  |
| s2 | `/learn/spatial-statistics/point-patterns/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s3 | `/learn/spatial-statistics/weights/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s4 | `/learn/spatial-statistics/moran/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s5 | `/learn/spatial-statistics/local/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| s6 | `/learn/spatial-statistics/zonal/` | 4 | 0 | 0 | 0 | 0 | R4 |  |
| e1 | `/learn/etl/extract/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| e2 | `/learn/etl/transform-load/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| e3 | `/learn/etl/idempotent/` | 4 | 0 | 0 | 1 | 2 | R5 |  |
| e4 | `/learn/etl/quality-provenance/` | 4 | 0 | 0 | 0 | 0 | R5 |  |
| e5 | `/learn/etl/schedule/` | 4 | 0 | 0 | 0 | 2 | R5 |  |
| p1 | `/learn/power-bi/power-query/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p2 | `/learn/power-bi/model/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p3 | `/learn/power-bi/dax/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| p4 | `/learn/power-bi/maps-report/` | 4 | 0 | 0 | 0 | 0 | R6 |  |
| c1 | `/learn/capstone/game-feed/` | 4 | 0 | 0 | 0 | 0 | R6 |  |

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

Hand-written links: none dead.

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

## Ledger

Filled by U4–U9: terms (term, defined at, used undefined at) and claims (sample cap, versions, licences, what a table holds, rules).

## Method

Throwaway scripts, kept here because they're in no repo file. U4 adds the reader's.

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
