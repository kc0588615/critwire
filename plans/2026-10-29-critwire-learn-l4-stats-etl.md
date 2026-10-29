---
mission: critwire-learn-l4-stats-etl
project: critwire
branch: agent/critwire-learn-l4-stats-etl
status: active
started: 2026-10-29 13:38 UTC
---

# Mission: critwire Learn L4, spatial statistics and ETL: Python labs, s1–s6 and e1–e5 (mission L4)

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-l4-stats-etl.md, then run:
     mission start critwire <that file>        (base: main after mission L3 is merged and live)
     Start only after L3 (critwire-learn-l3-gis) is live on critwire.com (its plan: status done, Release: Result: done).
     Written by mission critwire-learn-curriculum, step S28. Design: plans/004-learn-curriculum.md (§3.3, §5.4, §5.5, §7, §9, §A.1, §A.2).
     Chain: L1 → L2 → L3 → L4 (this) → L5 critwire-learn-l5-powerbi-capstone.
     Estimate: about 30–36 sessions (6 pipeline stages, about 22 steps, code review, verification, release). -->

### Goal

critwire Learn's spatial statistics and ETL tracks go live, with Python labs tested like the SQL ones:
- **The Python environment** (004 §3.3): `requirements.txt` with 004's pins (CPython 3.12, GeoPandas, PySAL's `libpysal`/`esda`/`pointpats`, psycopg, …), `uv` with `--no-build`, the venv `.venv-learn` (ignored by git); `/learn/labs/requirements.txt`; the Python part of `/learn/setup/` (Windows and Linux) and the arcpy notes (§3.4). If L1 already brought the environment in, reuse it.
- **`learn:check`'s Python stage** (004 §0, §7.6): every `# q:` block runs isolated (`python -I`, empty working folder, `PGOPTIONS=-c search_path=pg_catalog` unless it uses the connect helper), its stdout's sha256 recorded and compared; its freshness key in `checked.json` covers what it executes (`py-connect`, its `# after:` chain transitively, the `-- boot` blocks, `requirements.txt`), and each `.py` download's assembled sha256 too (004 §7.5).
- **Downloads** (004 §7.3): `/learn/labs/<module>.py` and `<module>.ipynb` (one cell per block, Markdown headings; the notebook's cells equal the `.py`'s blocks), plus `setup.py`/`setup.ipynb` for §3.3's blocks. Every `.sql` and `.py` reading `s4_cells` or `s4_neighbours` (s2, s3, s4, s5, setup; c1's `.sql` in L5) carries `s4-cells` as its boot setup, after `pg-session` or `py-connect`. `untested` blocks (`e1-submit`) are commented out under their reason in the `.py` and a Markdown cell in the notebook, never run from a download.
- **`learn:check` runs the Python downloads as assembled** (004 §7.6): each `.py` on a freshly loaded database, in `.venv-learn` from an empty folder, no `GBIF_*` in its environment, exit 0; the s-modules' `.sql` likewise, as L2's stage does.
- **s1–s6 and e1–e5 written in full** (004 §5.4–5.5 outlines → full modules): concept, worked example, lab, result, exercise with its answer, check, dialects (and, for Python, the arcpy or ArcGIS Pro equivalent where one exists). Every outline block keeps its id and its result. `s6-habitat` moves from `untested: L3 builds occurrence_habitats` to `ran`, on L3's data. `e1-submit` stays `untested` (it submits a real GBIF download); the rest of e1 runs.
- **Gi\* and LISA tested against esda**, and global Moran's I in SQL equal to PySAL to 6 decimals (I, E[I], the normality z-score), as the design's spike proved (§A.2).
- **Pages**: the eleven module pages, the map marks them built; E2E `learn-labs` covers the Python blocks and the notebooks.
- It's live: the mission merges and deploys at its end.

### Why

Spatial statistics and ETL are the two areas the owner's job needs most and his existing guides cover least (004 §8). They're the course's honesty test: occurrence records are biased samples of recording effort, and the modules must teach that, with results a reader can reproduce in SQL and in Python.

### Scope

In:
- `requirements.txt` (and `requirements.in`), `.gitignore`, the `learn:check` Python stage and its tests, `scripts/build/` (Python downloads, `.ipynb` writer, freshness keys), `site/learn/` (s and e modules, blocks, curriculum state, setup page), `e2e/`, `AGENTS.md` (the Python setup and commands), `plans/004-learn-curriculum.md` (the s and e modules in full; fixes where code proves it wrong).
- Reading, never editing, the design spike's `scripts/py-engine.ts`, `tests_py/`, `moran/`, `etl/` and their failure cases.
- `uv` installed in `~/.local/bin` if missing (standalone installer, sha256 checked); no apt.

Out:
- p1–p4 and c1 (L5); the habitat fact in the star (L5).
- Any GBIF download or registration: e1's submit stays an untested block; the lab data is L1's.
- Changes to `/v1` or to L1–L3's data files; `numba` or any package without an aarch64 cp312 wheel (004 §3.3).
- The `critwire` database except through `deploy critwire`; schema `learn_spatial`; IUCN data; Wikipedia prose.

### Definition of done

- `pnpm typecheck`, `pnpm test` (the Python engine's failure cases ported first: PY1–PY10 in the spike) and plain `pnpm build` pass on the final commit; `uv pip sync --no-build requirements.txt` and `uv pip check` are clean.
- **`pnpm e2e` passes in full**, nothing skipped; every `.ipynb` cell equals its `.py` block.
- **Results:** every s and e block 004 recorded as `ran` keeps its sha256, SQL and Python alike; `s6-habitat` and the new exercise blocks `ran`; two `learn:check` runs give the same hashes (seeds fixed, explicit formatting). Leak query empty; `learn_spatial` canary unchanged.
- **Moran**: SQL and PySAL agree on I, E[I] and z to 6 decimals on the 5 km grid, the neighbour pairs equal (the spike's `moran/compare.py` gates, ported into a block or a test).
- **Existing files unchanged** except pages and `manifest.json` (if a file is added): compared with the Baseline `sha256sum` list.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl/e2e/`: Playwright report, traces, `results.json`, screenshots of s4, s5 and e2 at 1280 and 375 px; reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: every s and e page returns 200; `/learn/labs/requirements.txt` equals the repo's; `/learn/labs/s4.py`, downloaded, runs in `.venv-learn` against `critwire_dev` after the live loader and prints s4's recorded result.
- The plan's Summary gives: what shipped, the pins, the Python timings, every deviation from 004, the release record, and what L5 needs to know.

### Decision rules

- **004 is the design.** Build what it says; where code proves 004 wrong, fix it and update 004 in the same commit, with the reason under Decisions.
- **Honest data:** records are recording effort, never where an animal lives; every map, hot spot and ratio is labelled that way.
- **Fix the SQL, never the threshold**: a disagreement between SQL and PySAL beyond 5e-7 is diffed (neighbours, k, S0/S1/S2, the mean) and fixed.
- **Simplest approach that works**: Python runs on the learner's machine and in `learn:check`, never in `pnpm build` or `deploy`.
- The owner's answers to 004 §10 override this brief; without an answer, 004's recommendation. Anything that changes cost, licensing or what goes public goes to the owner as a handoff item.

### Notes

- **Needs from L3:** `occurrence_habitats`, `country_habitats` for every country, the clips; g6's hexagon grids (s2–s5 read the boot block `s4-cells`). Read L3's Summary first.
- **Facts the spike proved** (plan `plans/2026-10-23-critwire-learn-curriculum.md`, Decisions S2, S3, S10, S25, S26):
  - `uv` 0.13.5, 44 pins, every one a wheel on aarch64 cp312; Windows x86-64, Linux and macOS 14 arm64 resolve with `--no-build`; Intel macOS has no pyproj 3.8.0 wheel. `ipykernel` isn't pinned; decide whether the notebooks need it.
  - `SHOW search_path` after the connect helper prints `learn_curriculum,public` (no space).
  - Coincident points are `ST_DWithin` neighbours but not `DistanceBand` ones; 28 of 2,000 devil records lie in no 5 km cell.
  - k-nearest ties: SQL ranks by distance rounded to 0.01 m, then id; PySAL's KDTree breaks the same 1,025 ties its own way; teach it, don't hide it.
  - Gi\* SQL equals esda `G_Local(star=True, transform="B")` to 6 decimals (99 hot, 39 after FDR, no cold spot); p-values via PostgreSQL 16's `erfc`. Permutation blocks are seeded (`seed=2026`; global `Moran` needs `np.random.seed(2026)`).
  - e2's text-format `COPY` trap (three made-up records, all silently changed) and the four backbone synonyms; e4's flags (1,109 shared coordinates; devil records dated 1599).
- **Pointers into 004:** Python setup §3.3, arcpy §3.4, statistics §5.4, ETL §5.5, site §7, chain §9, the ETL spike §A.1, Moran §A.2.

### Addendum (control room, 2026-10-28): the owner's answers and the database review

This addendum is part of the brief. Where it differs from the text above, it wins.

**The owner's answers to 004 §10:**
- **Every item takes 004's recommendation except item 4's Caddy headers, which are a NO.** No precompression, no `immutable` or `no-cache` change, and no Caddy or `e2e/Caddyfile` change. Learn ships without them.
- **Item 7: all five missions are queued** and run back to back, L1 → L5. Each starts only after the previous one is merged and live.
- **Item 8:** the Windows checks stay handoff items that block nothing.

**The Codex database and backend review** (GPT-6-Astra high, 2026-10-28; verdict SOUND_WITH_CHANGES) is at `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md`. Read it at Baseline.
- The items assigned to this mission (below) are in scope and part of the Definition of done, even where the Scope section above excludes the file they touch.
- The architect folds them into the plan. Record each under Decisions as **done** (with the commit) or **rejected** (with evidence-backed reasons). Don't drop one silently.
- The review's line references are to `main` at `5ac58df`.

**Database roles:**
- The live-build database `critwire` will belong to role `critwire_live` (the control room is setting it up), used only by `/srv/apps/critwire/.env` through `deploy`.
- The dev role `critwire` (the repo `.env`) can't connect to `critwire` and has no CREATEDB.
- Never put `critwire_live` credentials in a worktree or a test.
- Both `.env` files carry `CRITWIRE_DB_TARGET` (L1's item 1).
- If this paragraph isn't true when the mission starts (`psql -d postgres -Atc "select rolname from pg_roles where rolname='critwire_live'"` is empty), carry on: the code guard in review MUST-FIX 1 is still required.

**Diagrams.** The `diagram-design` Claude Code plugin (2.6.136) is installed for every session here.
- **ERDs:** the Mermaid sources stay the source of truth, rendered by the build (`pnpm erd`) and drift-checked against the loaded database. Don't replace that pipeline.
- **Every other teaching diagram** is drawn with diagram-design and committed as an SVG under `site/learn/`: pipelines, ETL flows, how a spatial join or zonal statistic works, grains and conformed dimensions, critwire's own architecture. Use system fonts (no Google Fonts; the build is offline), give light and dark variants, and add alt text that states the diagram's point.
- Draw one where a diagram teaches better than prose, not on every page.
- **The plugin's first-run gate asks the user a question, and nobody is there.** Answer it yourself: keep the default tokens, set `Font source: system`, save profile `critwire` (home library), and commit `.diagram-design` with `profile: critwire`. The first mission to draw a diagram does this; later ones reuse it.
- Export with the plugin's `scripts/export_svg.py --system-fonts` (python3, no dependencies) and check with `self_check.py --offline`. **SVG only**: PNG export needs Python Playwright, which isn't installed.
- "Alt text" means the page's `<img alt>` plus the SVG's `<title>`. The E2E checks that each referenced SVG returns 200 and has both.

**Order and budget:**
- The Goal's deliverables are never deferred. This mission's review items are built with the code they touch.
- Count sessions with `grep -c '^=== .* session ' /srv/critter-ai/agent-state/missions/<slug>.log`.
- Past 48 sessions, add no more review steps: finish verification and the release, and hand each unfinished assigned item to the next mission as a handoff item.

#### Review items assigned to L4

The review's numbering: MF = MUST-FIX, SC = SHOULD-CHANGE.

1. **MF5:**
   - `e2-geopandas` passes `schema="learn_curriculum"` and qualifies its verification query.
   - It runs, and every Python lab runs, as `critwire_lab` (L1's role, no CREATE on `public`), not the superuser.
   - A test checks the table's namespace while the transaction is open.
2. **SC8: a restartable refresh.**
   - **e3:** distinguish deterministic output, idempotent batch application, and "the target currently holds snapshot X". Loading A, then B, then A again must leave A. Include the transform, config and schema version in the job identity. Teach that `md5(id)` gives a repeatable capped sample, not stable membership under refresh.
   - **e5:** keep today's TEMP-table job, labelled as a simulation, then teach and test the real pattern:
     - a persistent target and state table
     - an atomic replace-and-update of the state
     - a lock covering the comparison and the replacement
   - **Verify:** two separate processes, changed input, a failed load, and overlapping refreshes.
   - The cron example's output claim matches its redirect. The log-only notification doesn't claim to alert a person.
3. **Teaching corrections** (the review's table):
   - **e1:** persist the request identity and reconcile before resubmitting. Retry the whole file (resetting `.part`), not just opening the response. Handle `Retry-After` and set a polling deadline.
   - **e2:** loading through text staging can still fail. Cast errors report the source row and key. The made-up licence mapping isn't the effective-licence pipeline.
   - **e4:** the capped sample isn't abundance or unbiased effort. Rejecting zero coordinates is a rule for this dataset, not a GIS truth. Detect negative or non-finite uncertainty. The quarantine report keeps the key and the reason.
   - **e5:** check the scheduler's PostgreSQL settings and credentials without logging them.
   - Fix each in 004 and on the page in the same commit.
4. **SC7 (L4 part):** cleanup is checked on error and interrupted paths for the Python stage too.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

On `358abb9` (= `origin/main` `7508fc7` + mission start), 2026-10-29, db `critwire_dev` (`CRITWIRE_DB_TARGET=critwire_dev`, `LEARN_PG_URL` as `critwire_lab`). Logs: `/srv/critter-ai/agent-state/missions/critwire-learn-l4-stats-etl/baseline-*.log`.
- `pnpm install --frozen-lockfile`: ok. No migrations (build rebuilds tables). No lint script; typecheck is the static check.
- `pnpm learn:venv`: ok (uv 0.13.5 already at `/usr/local/bin/uv`; CPython 3.12.3; 48 packages). `uv pip check`: clean. L1 brought the environment in (`site/learn/labs/requirements.{in,txt}`): reuse it.
- `pnpm typecheck`: ok (2 s). `pnpm test`: 601/601 (2 min 5 s).
- `pnpm build` (plain): ok, 6.7 s; `dist/learn/data/` 95,936,992 B, committed lab data 18,822,906 B (cap 120,000,000 each); `dist/` 246 files.
- `pnpm test:db`: 121/121 (11 min 8 s), after the build.
- `pnpm learn:check`: ok (3 min 56 s); canary `learn_spatial` unchanged, leak check empty, `checked.json` unchanged.
- `pnpm e2e`: 87/87 passed (5.9 min); artifacts `.../critwire-learn-l4-stats-etl/baseline-e2e/`.
- sha256 lists for Definition of done: `.../critwire-learn-l4-stats-etl/baseline-sha256-repo.txt` (728 tracked files) and `baseline-sha256-dist.txt` (246 `dist/` files).
- Roles: `critwire_live` and `critwire_lab` exist. Handoff: no `done` items; H3 (GBIF retention) waits on the owner, blocks nothing.
- For the architect: L3's Summary notes (Python blocks `py-connect`, `py-smoke` skipped by `learn:port` until L4; species change also needs `ingest habitat`); Codex db/backend review at `/srv/critter-ai/agent-state/reviews/2026-10-28-critwire-db-backend-codex.md` (L4 items: MF5, SC8, teaching corrections, SC7 Python part).

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

- 2026-10-29 14:02 UTC: Baseline: install, venv, typecheck, test 601/601, build, test:db 121/121, learn:check, e2e 87/87 all pass; sha256 lists saved.

## Summary
