# Mission brief: critwire Learn, build part 2: cookbook, playground and the game (mission B2)

<!-- Copy to /srv/critter-ai/agent-state/missions/briefs/<YYYY-MM-DD>-critwire-learn-b2.md, then run:
     mission start critwire <that file>        (base: main after mission B1 is merged and live)
     Start only after B1 is live on critwire.com (its Release: Result: done).
     Written by mission A1 (critwire-learn-design), step S21. Design: plans/002-learn.md. Part 1: plans/briefs/critwire-learn-b1.md.
     Estimate: about 18–24 sessions (6 pipeline stages, about 10 steps, code review, verification, release). -->

## Goal

critwire Learn gets the pages B1 left out, built as `plans/002-learn.md` designs them, on B1's engine, cards and page shell:
- **`/learn/cookbook/`** (002 §5, §8): all 26 cookbook entries on one page, each with an anchor (`#c01` …), its game use, its SQL in an editor, its example parameters as inputs, and Run. Each query lives once in `site/learn/sql/c<nn>.sql`.
- **`/learn/playground/`** (002 §8, "The playground"): free SQL on every table, cards or a table, the table list linked to the data dictionary, and "Download CSV" of the current result (RFC 4180, UTF-8, at most the 10 000 rows the page kept, and it says so). This is `plans/001-mvp.md`'s "Phase 2 viewer".
- **`/play/name-that-animal/`** (002 §7): ten rounds a day, the same for everyone on a UTC day (`d01` + `c02`), photo card with the name hidden, four same-class names as buttons, score, end screen with full cards, "How this game works" with its two queries; works at 375 px, by touch and by keyboard (1–4, Enter), with no storage.
- **Its E2E specs** (002 §8 "E2E", B2): `cookbook.spec.ts`, `play.spec.ts`, `playground.spec.ts`.
- **Caddy headers, only if the owner approved them** (002 §10): precompressed `.br`/`.zst` engine files from `writeLearn`, `immutable` on `/learn/assets/*`, `no-cache` on `/v1/*`.
- It's live: the mission merges and deploys at its end (owner's standing decision, 2026-10-21).

## Why

The cookbook and the game show what an app can do with critwire's data, using only the tables the lessons teach; the playground lets anyone ask their own questions and take the answer away. They reuse B1's engine and cards, so this part adds pages, not machinery.

## Scope

In:
- `site/learn/` (the cookbook, playground and play page fragments, `cookbook.json`, `sql/c*.sql` and `sql/d01.sql`, `src/game.ts`, `src/csv.ts`, `src/pages/*.ts`), `scripts/build/learn.ts`, `e2e/`, `AGENTS.md`, `plans/002-learn.md` (deviations only).
- If the owner approved the headers: `writeLearn`'s precompression and `e2e/Caddyfile`, after the control room has changed the live block (a handoff item asks for it; `serving.spec.ts` catches drift).
- Reading the A1 spike at `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/` (never editing it).

Out:
- Changing B1's lessons, schema, engine or countries file, except to fix a bug B2 finds (record it under Decisions).
- `/etc/caddy` and the ops Caddyfile: the control room changes them, never this mission.
- Any `/v1` file's shape or bytes.
- Storing anything for the player or learner (cookies, `localStorage`, accounts), ticking animals into a list, the DuckDB shell link (002 §10 unless the owner asked for it), the other two game ideas.
- A2's work: spatial, rasters, new datasets, IUCN. No IUCN data, no Wikipedia prose.
- The `critwire` database, except through `deploy critwire` at the release.

## Definition of done

- `pnpm typecheck`, `pnpm test` and plain `pnpm build` pass on the final commit.
- **`pnpm e2e` passes in full**, nothing skipped, including B1's specs unchanged and the three new ones with every case 002 §8 lists for B2:
  - every cookbook file runs on the cookbook page with its example parameters, row counts recomputed from `data/` where 002 §8 says (c03, c07, c09, c26), and every `-- show: cards` entry draws cards;
  - with the clock fixed at 2026-10-22T12:00:00Z, the game's ten rounds are the ten the test computes from `data/species.json` with the shuffle key; all right scores 10 of 10, one wrong scores 9 and marks the right button; keys 1–4 and Enter play a whole game;
  - "Download CSV" holds the result's header and rows;
  - no request leaves the origin except to the two Wikimedia photo hosts (answered by a fixture).
- **Existing `/v1` files unchanged:** at Baseline, save the `sha256sum` of every file in `dist/` from a fresh build of `origin/main`; the final build matches it for every file under `dist/v1/`.
- **Artifacts** in `/srv/critter-ai/agent-state/missions/critwire-learn-b2/e2e/`: the Playwright HTML report, a trace per test, `results.json`, and the screenshots 002 §8 names (a game round before and after answering at 375 px, the end screen), plus the cookbook page and the playground at 1280 and 375 px, reproducible with `pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e`.
- **Release smoke** after `deploy critwire`: `/learn/cookbook/`, `/learn/playground/` and `/play/name-that-animal/` return 200; B1's pages still do; every `/v1` file hashes as at Baseline; one headless Chromium run against https://critwire.com/play/name-that-animal/ plays a round; if the headers shipped, the engine `.wasm` comes back `br` with `immutable`.
- The plan's Summary gives: what shipped, the E2E counts and artifact path, every deviation from 002, whether the headers shipped, the release record, and the owner's real-device check (002 §10) as done or still waiting.

## Decision rules

- **002 is the design**, and B1's code is how it was built: reuse B1's engine, `runScript`, cards, checks, page shell and soft navigation; add nothing that duplicates them. Where code shows 002 is wrong, choose the simplest fix, record it under Decisions, and update 002 in the same commit.
- **Simplest approach that works**, no server process, no web framework, the build offline, everything self-hosted.
- **Same for everyone:** no `random()` or `hash()` in any query (the shuffle key of 002 §5; c02's buttons use its order key, so the answer isn't last most rounds), and dates come in as parameters, never `current_date`.
- **Countries are "recorded there in open records"**, never native range; games say "recorded in", never "lives in".
- **The real-device check** (002 §10: a lesson and the game on an iPhone, and a Chromebook if one is at hand) is the owner's: add it as a handoff item when the game first runs on this branch and carry on. It doesn't block the release unless the owner says so.
- Choose freely between equal options and record the call under Decisions. Anything that changes cost, licensing or what goes public beyond this brief goes to the owner as a handoff item.
- The owner's answers to 002 §10 override this brief where they differ. Without an answer, use 002's recommendation.

## Notes

- **Parameters** bind through `?` in order (`engine.runScript(text, params)`); multi-value or reused ones in a first `WITH p AS (SELECT CAST(? AS …) …)`. A JavaScript number binds as `DOUBLE`, hence the `CAST`. The `-- params:` line exists only in 002; the cookbook page shows those values as inputs (`cookbook.json`'s `params`).
- **c22** takes the collection as one comma-separated text parameter (`string_split` + `list_contains`, DuckDB functions, said so in the entry).
- **The game** plays only animals with a photo, from classes with at least four animals (both rules are in `d01`). Its state functions are pure (`newGame`, `startRound`, `answer`, `next`) and work on species ids, never button positions; photos are fetched one round ahead with `crossorigin="anonymous"`. The photo credit stays visible while the name is hidden (the license requires it).
- **Precompression,** if approved: brotli 11 + zstd 19 on the shipped `eh` files took about 2 minutes in the spike (4 m 47 s for all 9 files); skip it when the versioned file hasn't changed. Measured gain: first load 9.02 → 6.25 MB, and Caddy's CPU for 10 learners loading at once 3.47 → 0.05 s (002 §1 Q3).
- **E2E:** one engine start per spec file where possible (`mode: "serial"`, a shared page); `page.clock.setFixedTime` for the game; `page.waitForEvent("download")` for the CSV.
- **The spike** (read only): `/srv/critter-ai/agent-state/missions/critwire-learn-design/spike/`; every cookbook and `d01` query ran there in DuckDB-WASM, with results in 002.
- **Pointers into 002:** cookbook §5, demo §7, site, playground and E2E §8, the split §9, the owner's choices §10. B1's plan (`plans/<date>-critwire-learn-b1.md`) records how B1 actually built the shared parts.
