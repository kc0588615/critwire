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

### Visual direction (mission session, `frontend-design` skill)

Subject: an open natural-history dataset, so the page borrows the museum **specimen tag** (card, punched hole, tied string): the one bold motif. Everything else stays quiet.

- **Mock:** `/srv/critter-ai/agent-state/missions/critwire-web-modernize/mock/` (`index.html` built from `dist/index.html` by `build-mock.py`; `docs.css`, `docs.js`, font + `OFL.txt`). Screens `mock/mock-{1280,375}-{light,dark}-{top,files}.png`, `mock-1280-light-full.png`. A direction, not the final code: the architect owns the wiring.
- **Color** (`light-dark()` tokens; Learn's greens kept, link green unchanged):
  | token | light | dark | role |
  |---|---|---|---|
  | paper | `#f6f8f3` | `#111813` | page |
  | ink | `#1b2620` | `#e3eae5` | text |
  | lichen | `#55625a` | `#a3b0a8` | muted text, notes |
  | moss | `#1f6b45` | `#7fd1a3` | links, focus ring, art |
  | fern | `#e1ede4` | `#1b2821` | header band, code, tags, chips |
  | rule | `#cbd8ce` | `#2e3d34` | borders |
  | pollen | `#f2d36b` | `#d9b84a` | current section only, ink `#1b2620` on it |
  Contrast (moss on paper ≈ 6:1, on fern ≈ 5.4:1) to be proved by axe in both schemes.
- **Type:** Atkinson Hyperlegible Next (OFL 1.1, Braille Institute; built to tell `l`/`I`/`1` and `0`/`O` apart, which the page's ids and codes like `NA`, `Q35694` need), one variable woff2 (wght 200–800), Latin subset with fonttools: **32,432 B**. Fallback `system-ui` stack, `font-display: swap`. Code stays `ui-monospace`. Scale: h1 `clamp(2.75rem, 9vw, 5rem)` weight 800, tracking −0.035em; h2 `clamp(1.6rem, 3.5vw, 2rem)`; body 1.0625rem/1.65; reading column ≤ 44rem (< 80 ch). Built page has no character outside Latin-1 today; `unicode-range` falls back to system fonts for any later one. Source: `https://raw.githubusercontent.com/google/fonts/main/ofl/atkinsonhyperlegiblenext/AtkinsonHyperlegibleNext[wght].ttf` + `OFL.txt`.
- **Layout** (left-aligned throughout):
  ```
  ≥ 60rem                                   375 px
  +-------------------------------------+   +------------------+
  | critwire (h1, big)        [tag SVG] |   | critwire   [tag] |
  | lead                                |   | lead             |
  +---------+---------------------------+   +------------------+
  | On this | About ...                 |   |(About)(Files)(Fi→| sticky chip row
  | page    | reading column 44rem      |   +------------------+
  | (sticky)|                           |   | About ...        |
  +---------+---------------------------+   +------------------+
  ```
  Header: fern band, wordmark + lead + hanging tag (inline SVG, `aria-hidden`, drawn fresh: tag, string, ruled lines, rosette spots after the page's jaguar example). Nav: the existing 8-link list, moved out of `<header>` into a `nav.toc`; sticky left index on wide screens, sticky horizontally scrolling chip row at 375. Current section: pollen fill + bold (not color alone). `#files dt`: each file name on a tag (notched left end, punched hole). Code: fern card, 10 px radius. `details`: fern drawer. Notes: lichen with a left rule. `dt.group`: dashed rule above.
- **Principles:** one motif (tags), no per-section icons, no numbering (sections aren't a sequence), no entrance animation; only motion is smooth anchor scrolling under `prefers-reduced-motion: no-preference` and the copy label change. A font line ("Set in Atkinson Hyperlegible Next, under the SIL Open Font License", linked to the served `OFL.txt`) sits after `#cite`, outside `#credits`.
- **JS helpers** (mock `docs.js`, module, page complete without it): Copy button per `pre` (outside `<code>`, label "Copy" → "Copied"); section index that follows the reader. **Dropped:** format switcher (would hide or reorder file links `e2e/docs.spec.ts:43,59` needs visible; every format is already one click; doesn't earn its complexity).
- **Self-review against defaults:** green-tinted paper, not cream; no serif/terracotta; no acid-on-black; no all-caps eyebrows, middle-dot meta or `→` links; rounded shapes vary by role (tag notch, 10 px cards, pill chips), no uniform card kit, no shadows.

### Modern-web-guidance log (mission session)

Guides saved in `/srv/critter-ai/agent-state/missions/critwire-web-modernize/guides/<id>.md` (retrieved 2026-11-25, `--skill-version 2026_11_16-268fb9ea` for search).

- `legacy-scan` on `dist/index.html`, `site/index.html`, `site/style.css`: **0 findings** (52 rules, 38 guides). On the mock: 1, `scrollspy/js` (IntersectionObserver toggling `aria-current`).
- Searches: scroll spy, copy to clipboard, dark mode, self-host font, text wrap, focus, smooth scroll/reduced motion, sticky TOC, details disclosure, code block scroll, LCP, decorative SVG. Retrieved: `scrollspy`, `copy-button`, `dark-mode`, `color`, `visually-stable-font-fallbacks`, `improve-text-layout-and-legibility`, `typography`, `motion`, `state-aware-sticky-headers`, `scrollability-affordance-hints`, `accessibility`, `performance`, `optimize-preload-priority`, `shaped-cutouts`, `icons`, `html`, `css`, `search-hidden-content`, `single-line-overflow`.
- Quotes this direction relies on:
  - `scrollspy`: "Apply the `scroll-target-group: auto` property to the container of your navigation links"; "the visual state must be mirrored with `aria-current`"; fallback "For browsers that do not support `scroll-target-group`, you should use a fallback based on the `IntersectionObserver` API"; "Use :is() to combine the native pseudo-class with a fallback class". Support: Chrome/Edge 140 only.
  - `copy-button`: "Declare the target with Invoker Commands (`command` + `commandfor`) … and write with the Async Clipboard API"; "DO NOT disable the button while showing feedback"; a `role="status"` element announces the result. Invoker commands Baseline newly 2025-12-12; `writeText` widely.
  - `dark-mode`: "place a `<meta>` tag in your `<head>`" (`<meta name="color-scheme" content="light dark">`); "Apply the `color-scheme` property to the `html` element or the `:root`". `light-dark()` Baseline newly 2024-05-13.
  - `visually-stable-font-fallbacks`: "`font-size-adjust: from-font`" so the fallback matches the web font's x-height (Baseline newly 2024-07-25).
  - `improve-text-layout-and-legibility`: "For short text blocks like headings, use `text-wrap: balance`"; "DO NOT apply `text-wrap: balance` globally"; `pretty` for body text.
  - `motion`: "Use `@media (prefers-reduced-motion: no-preference)` when the reduced-motion strategy is to **not have the animation at all**".
- Not yet read in full (architect: read before designing the parts they cover): `accessibility`, `performance`, `optimize-preload-priority`, `html`, `css`, `icons`, `shaped-cutouts`, `scrollability-affordance-hints`, `state-aware-sticky-headers`, `search-hidden-content`, `single-line-overflow`, `color`, `typography`.

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
