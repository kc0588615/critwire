---
mission: critwire-web-modernize
project: critwire
branch: agent/critwire-web-modernize
status: active
started: 2026-11-25 05:56 UTC
---

# Mission: a friendlier, modern critwire.com home and docs page

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


<!-- Start: mission start critwire /srv/critter-ai/agent-state/missions/briefs/2026-11-24-critwire-web-modernize.md --skills web -->

### Goal

critwire.com's front page, which is also the `/v1` docs page, gets a friendlier, education-themed look. It's built with current web-platform features, checked against Google Chrome's modern-web-guidance skill, and it's live.

Done looks like:

- **A new look that's friendly and feels like a place to learn**, for its readers: students, teachers, science-class projects, researchers and app builders new to the data. It should feel warm and approachable, not like a developer reference dump, while staying clear and fast to scan. The design is the mission's to choose, within the decision rules below.
- **Easier to use:** the long page is easy to find your way around. JavaScript may add helpers, such as copying a code sample, a section navigation that follows the reader, or switching between formats. Every helper must still leave the page readable without JavaScript.
- **Modernization:** every finding from the skill's modernization flow for this page is either fixed or listed in the plan's Summary with the reason it was left. The flow is `legacy-scan`, then `search`/`retrieve` for each area.
- **The content stays:** the page still has every section, file, field and credit it has today, with the same wording. Short new UI words are fine (decision rules).
- **Learn and `/learn/data/` are byte-for-byte unchanged.**
- **Live:** merged, deployed with `deploy critwire`, and the release smoke passes against https://critwire.com.

### Why

Danby wants critwire's public face to feel friendly and educational, and to use the modern web platform rather than old habits. Today it reads like a plain spec sheet, but its readers include students and teachers. This mission is also the first run of the `web` skill pack, which turns on modern-web-guidance for this mission's agents only. Its plan and Summary show whether specialist missions are worth it.

### Scope

In:

- `site/index.html` (the page template), `scripts/build/docs.ts`, `scripts/build/html.ts`, `scripts/build.ts` (where the page is read, filled and written), and their tests (`scripts/build/html.test.ts` and others).
- The docs page's own stylesheet, JavaScript and assets, all new: inline SVG illustrations or icons, or a committed open-licensed font. They're wired into the build as the architect decides.
- `e2e/docs.spec.ts`, `e2e/helpers.ts`, and new e2e specs for the page.

Out:

- `site/style.css`. It's inlined into Learn's pages (`scripts/build/learn/pages.ts:97`) and `/learn/data/` (`scripts/build/learn/data.ts:129`). The docs page stops using it, or keeps using it unchanged.
- Learn: `site/learn/**`, `scripts/build/learn/**`, everything under `dist/learn/`.
- Data, `/v1/` files (including `attribution.json`), `contracts/`, the database, ingest and review scripts, `plans/004` and `plans/007`.
- The page's prose (decision rules).
- `e2e/Caddyfile` (`e2e/serving.spec.ts:33-38` fails if it differs from the live block), Caddy, serving headers and CORS. If a guide calls for a header, add a handoff item instead.

### Definition of done

- **Checks:** on the final commit, `pnpm typecheck`, `pnpm test`, plain `pnpm build` (not `--draft`) and the whole `pnpm e2e` suite pass.
- **Baseline, recorded in the Baseline stage from plain builds of `origin/main`:**
  - `sha256sum` of every file under `dist/learn/`. Build twice to confirm the hashes are stable; name any file that isn't, and leave it out of the comparison.
  - The before screenshots.
  - The before metrics.
- **Learn unchanged:** the final build's `dist/learn/` hashes equal the baseline's.
- **Tests for the new page:**
  - `e2e/docs.spec.ts` keeps every existing assertion. A selector changes only when the markup it targets moves.
  - New tests cover each behavior a test can see: each JavaScript helper, focus that's visible, and the 375 px layout.
  - One test loads the page with JavaScript off and checks that every section, file link and credit is there.
- **Accessibility:** axe-core (already an e2e dependency, as in `e2e/learn-walk.spec.ts`) runs on the docs page in light and dark, with no violations.
- **Performance budget**, measured in Playwright's Chromium against the local build, before and after:
  - CLS ≤ 0.05.
  - LCP, median of 5 loads, at most 100 ms above the baseline.
  - The page's compressed transfer, HTML plus everything it loads, ≤ 150 KB. Today it's one 53.5 KB request, 14.3 KB gzipped.
  - Put the numbers in the Summary.
- **Screenshots**, before and after, full page, in `/srv/critter-ai/agent-state/missions/critwire-web-modernize/screens/`: the docs page at 1280 and 375 px, light and dark; Learn's map, one module page and `/learn/data/`, light and dark.
- **The plan's Summary has:**
  - each change, with the guide ids that drove it;
  - each guide that was checked but not applied, and why;
  - the skill's `### Modern Web Guidance` section, built from the guide ids and quotes each step logged in the plan, never from memory; the PR body carries the same section;
  - three lines on the skill pack: did the agents use it, what the mission cost (`mission usage`), and whether it was worth it.
- **Released**, as `critwire`'s settings say (`MISSION_RELEASE=deploy`): PR merged, `deploy critwire`, release smoke passed. The smoke already compares every `dist/` file with the live site (`e2e/release/live.spec.ts:39`), so new assets are covered.

### Decision rules

- **critwire's own rules beat a guide on substance.** The data rules, copy rules, offline build and no outside requests stay. "Prefer simplicity" still holds: a design touch has to earn its complexity. Record each conflict under Decisions.
- **New browser features are allowed** (Danby): Baseline newly available, and features not yet in Baseline. Each one needs feature detection or graceful degradation: content and links stay complete and readable without it. No polyfills. Only Chromium is installed for tests, so reason it through for other browsers and note each such feature in the Summary.
- **JavaScript is allowed** (Danby), as progressive enhancement:
  - The page works without it.
  - No framework and no new npm dependency: plain modules, inline or a small file the build writes.
  - Honor `prefers-reduced-motion` for any animation.
- **The look may change** (Danby): colors, type, layout, illustrations.
  - Keep it friendly, educational and calm.
  - Contrast passes WCAG AA in light and dark. Both schemes are designed, and the 375 px phone layout is first-class.
  - Illustrations are drawn fresh (inline SVG) or are open-licensed.
  - Fonts are system fonts, or one open-licensed (OFL) font committed to the repo, never a font CDN. A font's license file is committed and served beside it, and named in one line outside `#credits`. `attribution.json` doesn't change.
  - The new look should still sit comfortably beside Learn (same family of greens), without restyling Learn.
- **The copy stays.** Short new UI words (button labels, a section's one-line intro) are fine and follow `AGENTS.md`'s copy rules. No rewritten prose.
- **No new dependencies.** The skill's own `npx` calls during the mission are fine; nothing it fetches ships in `dist/`.

### Notes

- **Design, in the Architecture stage:** the architect subagent has no Skill tool and may only edit the plan, so the mission session itself does this part:
  1. Run the `frontend-design` skill.
  2. Write the visual direction into the plan.
  3. Save a static mock and its screenshot to the mission's state folder.
  4. Then call the architect for the build design.

  Fable and Astra review it as usual. Danby accepted that the result goes live without his preview.
- **The skill pack:** this mission runs with `--skills web` (ops `docs/missions.md`, "Skill packs"). Every session, and the planner, architect and Fable reviewer, has modern-web-guidance.
  - Use the commands exactly as its `SKILL.md` gives them (they carry `--skill-version`).
  - This brief explicitly asks for the modernization flow (`legacy-scan`), which the skill otherwise saves for open-ended audits. Point it at the built `dist/index.html` and the docs page's sources only.
  - Each step logs, in the plan, the guide ids it used and the short quotes it relied on.
  - Astra's read-only sandbox can't run `npx`. Its prompt can point at the guides under `~/.codex/plugins/cache/googlechrome/modern-web-guidance/1.0.2/skills/modern-web-guidance/guides/`.
- **The page:** `site/index.html` (359 lines) is a template.
  - `scripts/build.ts:47` reads it and the stylesheet. `renderDocs` (`scripts/build/docs.ts`) fills its `{{slot}}`s through `fillSlots` (`scripts/build/html.ts`). `scripts/build.ts:64` writes `dist/index.html`.
  - `fillSlots` throws on any `{{` that isn't a slot (`html.ts:17-19`), so inline JavaScript or CSS containing `{{` must come in through a slot.
  - The page has no `<script>` today.
- **Tests that pin the markup:**
  - `e2e/duckdb.spec.ts:24-26` runs the `textContent` of every `pre > code[data-example]`, and `e2e/range-listings.spec.ts:131-132` that of `code[data-query]`. A copy button must sit outside the `<code>`.
  - `e2e/docs.spec.ts:43,59` need every file link visible, so a format switcher can't hide links.
- **Build rules:**
  - `dist/learn/assets/` refuses unhashed files (`scripts/build/learn/assets.ts:72-78`), so put the page's assets elsewhere.
  - The root `tsconfig.json` has no DOM types. Browser TypeScript needs its own config, like `site/learn/tsconfig.json`; plain JavaScript avoids that.
  - There's no CSP (`e2e/Caddyfile`), so inline scripts work.
- **Build in the mission's worktree:** the agents' checkout `/srv/critter-ai/critwire` has a stale `dist/`.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Branch `agent/critwire-web-modernize` at `def743d` = `origin/main` `524bb38` + this plan (no code change). Db `critwire_dev` (no mission db: `DB=''`). 2026-11-25.

- `pnpm install --frozen-lockfile`: up to date. No migrate step (build reloads db). No lint script in repo: typecheck is the lint.
- `pnpm typecheck`: pass. `pnpm test`: 823/823 pass (268 s).
- Plain `pnpm build` ×2: both pass (≈ 8 s). `dist/learn/`: 151 files, sha256 identical across both builds (no unstable file): `/srv/critter-ai/agent-state/missions/critwire-web-modernize/baseline/learn-sha256-1.txt` (= `-2.txt`). Non-Learn `dist/` hashes: `baseline/nonlearn-sha256.txt`. Logs `baseline/build{1,2}.log`.
- `dist/index.html`: 53,546 B, sha256 `ed1ea77d…4319`, gzip -9 14,234 B.
- `E2E_ARTIFACTS=/srv/critter-ai/agent-state/missions/critwire-web-modernize/e2e-baseline pnpm e2e`: 168/168 pass (12.4 min). Log `baseline/e2e.log`; report `e2e-baseline/playwright-report/`.
- Before screens (full page): `/srv/critter-ai/agent-state/missions/critwire-web-modernize/screens/before-*.png`: docs 1280 + 375, Learn map, f1 module (`/learn/foundations/select/`), `/learn/data/`; light + dark each (10).
- Before metrics (`/srv/critter-ai/agent-state/missions/critwire-web-modernize/before/metrics.json`), Playwright Chromium vs local Caddy (e2e/Caddyfile, `encode zstd gzip`), 5 fresh loads each:
  - 1280×800: LCP median **72 ms** (84, 72, 72, 68, 64); CLS **0**.
  - 375×812: LCP median **64 ms**; CLS **0**.
  - Transfer: **1 request, 15,453 B** (zstd body 15,057 + headers 396). Budget ≤ 150 KB; LCP budget ≤ 172 ms (1280).
- Repeat (screens + metrics, after `pnpm build`, from repo root): `node /srv/critter-ai/agent-state/missions/critwire-web-modernize/tools/measure.mjs <label>` (starts e2e/Caddyfile on :3100; writes `screens/<label>-*.png`, `<label>/metrics.json`). Use label `after` for the final run.

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

- 2026-11-25 06:25 UTC · Baseline: typecheck ok, test 823/823, plain build ×2 (Learn hashes stable, 151 files), e2e 168/168, before screens + metrics recorded.

## Summary
