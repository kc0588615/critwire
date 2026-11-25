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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
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
- Architect, 2026-11-25: read all 19 saved guides in full. Every quote below is verbatim from `guides/<id>.md`.

### Findings (architect)

I checked these on `b7ecd07` (= `origin/main` `524bb38` plus the plan) against the Baseline build (`dist/index.html` `ed1ea77d…`). axe-core 4.14 ran on that build at 375 and 1280 px, light and dark, with every `details` open.

1. **Keyboard users can't scroll the code blocks, and axe fails the page (serious).** The ten `<pre>` at `site/index.html:36,63,78,83,88,98,280,289,299,354` scroll sideways (`site/style.css:15`) but have no `tabindex`. axe reports `scrollable-region-focusable` (serious) on 9 of them at 375 px and 2 at 1280, in both schemes, and nothing else. In browsers that don't focus scrollers themselves (Safari), keyboard users can't scroll the code (WCAG 2.1.1). Learn's pages already fix this (`scripts/build/learn/pages.ts:66-71`, `focusableScrollers`). Fix: `tabindex="0"` on each `<pre>` in the template. `html`: "DO ensure that code blocks are accessible by adding `tabindex="0"` to the `<pre>` element if it becomes scrollable".
2. **The docs page is styled by Learn's stylesheet** (separation of concerns, modularity). `scripts/build.ts:19,47` hands `site/style.css` (`html.ts:11`) to `renderDocs`, which inlines it (`docs.ts:15,19`). Every Learn page (`learn/pages.ts:97`) and `/learn/data/` (`learn/data.ts:129`) inline the same file. Restyling the docs page there would change Learn's bytes, which this mission forbids. Fix: the docs page gets its own `site/docs.css`. `style.css` and its Learn users stay untouched.
3. **A 27-screen page with no way around it.** The 8-link index sits only in the header (`site/index.html:16-27`, a wrapping list in `style.css:23`). The Baseline screenshots measure the page at 21,667 px tall at 375 (≈ 27 screens) and 15,105 at 1280. After the first screen the reader has no index and no sign of where they are. This is the brief's main usability gap. Fix: a sticky index that follows the reader (§4).
4. **The landmarks don't match the page.** `<header>` and `<nav>` sit inside `<main>` (`site/index.html:12-28`). So the page has no banner, the title and index read as main content, and page-level notes have no footer to go in. `accessibility`: "Use the `<header>` element as a container for introductory content, … and the `<footer>` element as a container for information about the related content, such as the author, copyright information". Fix: `header` and `nav` move before `main`, and the font line goes in a `footer`.
5. **Test gaps.** `e2e/docs.spec.ts` has no axe pass, although Learn has one (`e2e/learn-walk.spec.ts:36-53`); that is how finding 1 went unnoticed. It checks 375 px in light only (`:111-116`), and nothing loads the page without JavaScript. Fix: §7.
6. **No `<meta name="color-scheme">`** (`site/index.html:3-10`). The scheme is only known once the inline CSS is parsed (`style.css:1`). The impact is low because the style follows at once, but `dark-mode` calls it "MANDATORY: … place a `<meta>` tag in your `<head>`". Fix: add the meta.

These areas are fine: `fillSlots`, `esc`, `link` and `licenseLink` (pure, escaped, and the slot set is checked both ways); the slot data `renderDocs` builds; the credits' `<details>`, which is already the searchable disclosure `search-hidden-content` recommends; `lang`, the viewport meta, the single `h1` and the heading order; the current contrast (axe finds no contrast violation); and `legacy-scan`, which reports 0 findings.

### Target design (architect)

#### 1. Files and build wiring

| New file (committed) | What | Served as |
|---|---|---|
| `site/docs.css` | the docs page's whole stylesheet | inlined via `{{style}}` |
| `site/docs.js` | plain ES module: no TypeScript, no dependencies | inlined via `{{script}}` |
| `site/fonts/atkinson-hyperlegible-next.woff2` | the font step's output (below). The mock's subset was 32,432 B, sha256 `a896eccb…31cda59`; if the step's bytes differ, this row takes the new size and sha | `/fonts/atkinson-hyperlegible-next.woff2` |
| `site/fonts/OFL.txt` | the upstream license at the pinned commit: 4,431 B, sha256 `aca6a428…c4030` (git blob `88955733…` = the mock's copy, checked) | `/fonts/OFL.txt` |

- **CSS and JS are inlined through slots, not served as files.** That means no extra requests. Caddy sends no `Cache-Control` (`e2e/Caddyfile:10-36`, the live block, which this mission can't change), so separate files with fixed names would be cached by heuristic from `Last-Modified` and could go stale against a newer HTML. Inlined code can't. Learn inlines `style.css` the same way. `performance`: "DO inline critical CSS" (here the whole sheet is critical; the mock's is 2.4 KB gzipped) and "`type="module"` is preferred for modern JavaScript and is deferred by default".
- **Raw-text guard (fail fast).** `fillSlots` inserts slot values verbatim. A `</style` in the CSS, or a `</script` or `<!--` in the JS, would end the element early, and the build would report nothing. New in `html.ts`: `rawText(element: "style" | "script", text: string, name: string): string`. It returns `text` unchanged, or throws `<name>: contains </style` (case-insensitive). `renderDocs` passes `style` and `script` through it. Learn doesn't call it.
- **The font keeps a fixed name under `/fonts/`.** It can't go under `dist/learn/assets/`, which refuses unhashed files (`learn/assets.ts:72-78`), or under `/v1/`, which is the data contract. Its bytes never change, so a heuristically cached copy is still the same font. The `FONT` comment states the rule: new bytes need a new file name. The font is same-origin, so it needs no CORS. Caddy serves `font/woff2` and `text/plain; charset=utf-8` from `/etc/mime.types` (both Caddy servers run on this VPS).
- **One constant drives the path, the preload and `@font-face`.** In `docs.ts`:
  - `site = new URL("../../site/", import.meta.url)`, with `docsTemplate`, `docsStyle` and `docsScript` resolved from it;
  - `FONT = "fonts/atkinson-hyperlegible-next.woff2"`, `FONT_LICENSE = "fonts/OFL.txt"` and `DOCS_FILES = [FONT, FONT_LICENSE]`.

  `renderDocs(template, { style, script }, attribution, species)` adds three slots: `script`, `fontUrl` (`esc("/" + FONT)`) and `fontLicenseUrl`. The template uses `{{fontUrl}}` twice: in the preload and in the `@font-face` rule. So `@font-face` lives in the template's `<style>`, just before `{{style}}`. The two URLs must match byte for byte, or the browser fetches the font twice. `fillSlots` already refuses a slot that is missing or unused. The `docs.ts` header comment changes to name `site/docs.css` and `site/docs.js`.
- **`scripts/build.ts`.** Drop the `styleSheet` import; Learn's modules import it themselves. Read the template, `docsStyle`, `docsScript` and every `DOCS_FILES` entry (`readFile(childFile(site, f))`) **before** `rm(out)`, so a missing file fails the build before `dist/` is touched. After writing `index.html`, write each file to `childFile(out, f)`, creating its folder first. `childFile` is the existing guard for computed output paths (`paths.ts`).
- **Font step** (one implementation step, before the font is committed; never part of `pnpm build`, which stays offline and only copies the bytes). The mock's woff2 isn't committed: nobody recorded how it was made.
  - Pinned inputs: google/fonts commit `66eef70728ca29f28c31cdc5e7947f2c2de73e8d` (2025-01-07, the last commit that touched the TTF or `OFL.txt`; replaces the Visual direction's `main` URL). There the TTF is 114,552 B, sha256 `5a455d1cfa099b601ab70751bb9673e8fe1854dc4500c80e1a220d0d75e31745`, and `OFL.txt` 4,431 B, sha256 `aca6a428580965d2297d1b718042dd427c2a9443ece3b0d02d758e161e0c4030` (both fetched and hashed 2026-11-25).
  - Command, run once from the repo root (feasibility checked: uv resolves fonttools 4.68.0 and brotli 1.2.1 on this VPS):
    ```sh
    set -euo pipefail; d=$(mktemp -d); u=https://raw.githubusercontent.com/google/fonts/66eef70728ca29f28c31cdc5e7947f2c2de73e8d/ofl/atkinsonhyperlegiblenext
    curl -fsSL -o "$d/font.ttf" "$u/AtkinsonHyperlegibleNext%5Bwght%5D.ttf" && curl -fsSL -o "$d/OFL.txt" "$u/OFL.txt"
    printf '%s  %s\n' 5a455d1cfa099b601ab70751bb9673e8fe1854dc4500c80e1a220d0d75e31745 "$d/font.ttf" aca6a428580965d2297d1b718042dd427c2a9443ece3b0d02d758e161e0c4030 "$d/OFL.txt" | sha256sum -c
    mkdir -p site/fonts && cp "$d/OFL.txt" site/fonts/OFL.txt
    /usr/local/bin/uv tool run --from 'fonttools[woff]==4.68.0' --with 'brotli==1.2.1' pyftsubset "$d/font.ttf" \
      --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD' \
      --name-IDs='*' --flavor=woff2 --output-file=site/fonts/atkinson-hyperlegible-next.woff2
    sha256sum site/fonts/atkinson-hyperlegible-next.woff2; rm -r "$d"
    ```
    The code points are the mock's `unicode-range` (`mock/docs.css:7`). `brotli` is pinned because it writes the woff2's bytes. `--name-IDs='*'` keeps the license and its URL (name IDs 13, 14) inside the file, so a copy saved alone still carries them (OFL condition 2); layout features stay pyftsubset's default set.
  - `sha256sum -c` stops the step on any other input bytes. The source TTF has name IDs 13 and 14 and sxHeight 496 (checked with ttx); subsetting keeps both. A woff2 whose bytes differ from the mock's updates the table row and the budget, and its sxHeight is re-read for §3's `font-size-adjust`.
  - The `FONT` comment in `docs.ts` records: the two pinned URLs, both input sha256s, the command as run, the tool versions, the woff2's sha256, and that the copyright line names no Reserved Font Name, so the subset may keep its name (OFL condition 3). No hash is pinned in code: Git holds the bytes, and the build only copies them.
- **Preload without `fetchpriority`.** `<link rel="preload" href="{{fontUrl}}" as="font" type="font/woff2" crossorigin>`.
  - `performance`: "DO preload critical fonts … for fonts seen above the fold" and "DON'T use `fetchpriority="high"` on fonts".
  - `optimize-preload-priority`: "ensure that font preloads always have the `crossorigin` attribute (even if same-origin)".

  `@font-face` uses `font-display: swap` and `font-weight: 200 800`, with no `unicode-range`. The browser already falls back glyph by glyph for anything outside the Latin subset, and that is one less list to keep equal to the subset.
- **Budget (estimate; `measure.mjs after` measures it).** HTML ≈ 66 KB raw, ≈ 18 KB compressed, plus the font's ≈ 32 KB: about 50 KB of the 150 KB budget, and one more request. LCP is text painted in the fallback font, with nothing blocking render, so expect about the baseline (budget ≤ 172 ms).

#### 2. Markup (`site/index.html`)

The prose, the slots and the eight `<section id>`s stay word for word.

**The section ids are a contract with Learn**, which this mission can't change. Learn links `/#files` (`site/learn/pages/map.html:19`, `pages/schema-schema.html:4`, `data/index.html:38`, `modules/s1.html:19`), `/#licenses` (`modules/d2.html:33`, `f3.html:32`, `s1.html:38`) and `/#range-listings` (`modules/e4.html:36`, `s1.html:47`). All eight ids stay on their `<section>`s (D1 is why they don't move onto headings). Test 5 deep-loads these three.

```
<head> + <meta name="color-scheme" content="light dark">
       + <link rel="preload" … {{fontUrl}} …>
       <style>@font-face{… url("{{fontUrl}}") …}{{style}}</style>
       + <script type="module">{{script}}</script>
<body>
  <header class="masthead"> <h1>critwire</h1> <svg class="tag-art" viewBox="…" aria-hidden="true">…</svg> <p class="lead">…</p> </header>
  <div class="page">
    <nav class="toc" aria-label="Sections"> <h2>On this page</h2> <ul> the same 8 links </ul> </nav>
    <main>
      the 8 sections, unchanged except that each <pre> gains tabindex="0"
      <footer><p class="font-note">Set in Atkinson Hyperlegible Next, under the <a href="{{fontLicenseUrl}}">SIL Open Font License</a>.</p></footer>
    </main>
  </div>
```

- `header` and `nav` move out of `main` (finding 4). The `footer` holds the font line, after `#cite` and outside `#credits`, as the brief asks. The tag SVG drops the mock's `focusable="false"` (an old IE workaround). `html`: "DO hide purely decorative SVG images from assistive technology using `aria-hidden="true"`".
- Every existing e2e selector still matches and none changes: `section#<id> h2`, `#files a[href…]`, `#fields dt code`, `#countries dt code`, `section#range-listings dl > dt code`, `#credits dt|summary|li a`, `a[href="/learn/"]`, `pre > code[data-example]`, `code[data-query]`. The new `/fonts/OFL.txt` link is covered automatically by docs.spec's same-origin 200 check.
- **Sections get no `tabindex="-1"`**, against the scrollspy guide (Decisions D1).
- The only new UI words: "On this page", the font line, and the script's "Copy", "Copied" and "Copy failed".

#### 3. Style (`site/docs.css`): the Visual direction, built to these rules

- **Tokens.** Plain custom properties on `:root`, with the dark values in `@media (prefers-color-scheme: dark) { :root {…} }` and `:root { color-scheme: light dark }`. `dark-mode`: "Apply the `color-scheme` property to the `html` element or the `:root` pseudo-class". `light-dark()` isn't used (D5).
- **No `*` reset.** `css`: "DO NOT use global resets (styles on `*`)". `box-sizing: border-box` goes only on boxes that set both a width and padding. Spacing uses logical properties (`css`: "Prefer logical properties and values").
- **Font fallback.** `body { font-size-adjust: 0.496 }`: Atkinson's OS/2 sxHeight 496 ÷ unitsPerEm 1000, read from the committed woff2, with a comment saying so. `code, pre { font-size-adjust: none }`, because the property inherits and would rescale the monospace font. `visually-stable-font-fallbacks`: "Manual calculation: If you know the specific value (e.g., 0.545 for Verdana), you can provide it directly for more precise control." Not `from-font` (D6).
- **Sizes.** Each `clamp()` mixes rem and vw, and its maximum stays ≤ 2.5 × its minimum; h1 is about `clamp(2.75rem, 1.5rem + 5vw, 5rem)`. `typography`: "DO combine viewport-relative and font-relative units in `clamp()`" and "keep the maximum no more than 2.5 times the minimum". The reading column is ≤ 44rem (< 80 ch). Boxes holding text get no fixed height: targets use `min-block-size`.
- **Wrapping.** `text-wrap: balance` on h1–h3 only, and `pretty` on `p`, `li` and `dd`. The `#files` tags get neither, since they have a visible box. `improve-text-layout-and-legibility`: "For short text blocks like headings, use `text-wrap: balance`"; "DO NOT apply `text-wrap: balance` globally"; "Avoid elements that have visible boxes such as borders or backgrounds".
- **Focus rings.** `:where(a, button, summary, pre):focus-visible { outline: 3px solid var(--moss); outline-offset: 2px }`. Moss on paper is 6.05:1 in light and 9.92:1 in dark. `accessibility`: "Use `:focus-visible` when styling focus indicators" and "Pair custom focus outlines with `outline-offset`".
- **Nav link rings.** Nav links use `outline: 2px solid currentColor; outline-offset: -2px`, for two reasons. The chip row clips its overflow, so an outset ring would be cut (`single-line-overflow`: "give those items an inset outline (`outline-offset: -2px`)"). And `currentColor` keeps ≥ 4.5:1 against the chip's fill, whereas moss on dark pollen is 1.06:1.
- **Nav.** `nav.toc` is `position: sticky` with `z-index: 1`, so it stays above the positioned `.example` blocks and file tags.
  - Below 60rem it is a chip row at `top: 0`, with an opaque paper background and a bottom rule.
  - At 60rem and up it is the left column (`top: 1.5rem`, `align-self: start`).
  - The `h2` is `display: none` below 60rem.
  - `html { scroll-padding-top }` is at least the chip row's height plus a gap below 60rem, and smaller above. `state-aware-sticky-headers`: "Add `scroll-padding-top` to the scrollport and set the value to be equal or greater than the sticky element's height".
- **Chip row** (`nav.toc ul`, below 60rem):
  - `overflow-x: auto`. The native scrollbar stays: `scrollbar-width: thin` at most, never `none` (D7). No scroll snapping. Block padding so nothing gets clipped.
  - **Default: an unmasked row.** Its only cue is the chip cut at the row's edge (at 375 the mock cuts "Range listings", x 316–432, against a row ending at 355); phone scrollbars are overlays, hidden at rest (D7).
  - **End fades only inside `@supports (animation-timeline: scroll()) and (animation-range: 0 1px)`**, nested in the below-60rem rules: the `mask`, the `animation`, `animation-timeline: scroll(self inline)`, `animation-range` and `scroll-padding-inline` (= the fade size) all sit in that block, built as the guide builds them. Only the two `@property` rules and the keyframes stay outside; on their own they paint nothing. Ungated, a browser without scroll timelines drops `animation-timeline`/`animation-range`, runs `animation: … linear both` as a 0 s time animation and holds its end state: a permanent 3rem fade over "About" (Fable's probe: `--fade-start: 48px` at `scrollLeft` 0). `scrollability-affordance-hints`: a fade suits "a row of items (tabs, chips, carousels)"; "MANDATORY: Register `--fade-start` and `--fade-end` with `@property`"; "Set `scroll-padding-inline` … to the fade size if the scroller … contains focusable items".
  - Kept rather than dropped: scroll-driven animations are Baseline in all three engines since 2026-10-27, the guide picks a fade for exactly this row, and gated it costs nothing where it's missing. Test 8 proves the gate and the cut chip.
- **Current section.** `nav.toc a:is(:target-current, .target-current)` gets the pollen fill, `--on-pollen` text and weight 700. `scrollspy`: "Use :is() to combine the native pseudo-class with a fallback class"; "AVOID relying solely on color for the active state: Include other visual cues like font weight". Under `@media (forced-colors: active)` the same selector also gets `text-decoration: underline`, because fills disappear there (`color`: "Support Forced Colors Mode").
- **No room reserved after the last section** (the `#cite` reserve is dropped; it left ≈ 450 px blank at 800 high and ≈ 1,050 at 1400). Cite can't reach the landing line, so both paths mark it once the page can't scroll further: Chromium's native tracking does this by itself, and the fallback has the same page-end rule (§4). Probe on the mock, no reserve, Chromium 145, at 1280×800, 375×812 and 1280×1400: the native path and the §4 rule both give the clicked link for all 8 links, Cite at the end. The rule needs Credits to reach the line before the page end, i.e. (page end − Credits' top) > (window height − `scroll-padding-top`): 2,546 > 1,376 at 1280×1400, and 3,929 at 375. So it holds in windows up to ≈ 2,570 px tall; taller ones would mark Cite after a Credits jump in the fallback (accepted). `scrollspy`: "DO provide enough vertical space for sections": every section but Cite is ≥ 591 px.
- **File tags** (`#files dl > dt`). The notched shape is the dt's `::before` (a clip-path polygon at `z-index: -1`, with the dt `position: relative; isolation: isolate`), and the punched hole is its `::after`. The dt itself is never clipped, so its links' text and focus rings can't be cut. `shaped-cutouts`: "Apply the mask to an adjacent element rather than the parent element containing text". `motion`: clip-path and mask "also clip the element's own focus outline".
- **Code cards and the copy UI.**
  - `pre` is a fern card with a 10 px radius and `overflow-x: auto`; `pre code { white-space: pre }` and `pre.wrap code { white-space: pre-wrap }` as today.
  - `.example { position: relative }`. `.example > pre` gets a top strip (`padding-block-start` ≈ the button's height plus gaps). `.copy` (the button and its status) sits absolutely in that strip, top right, so it never covers code, at rest or while scrolling (D8).
  - The button has a paper background and a `--lichen` border, which gives a boundary of at least 3:1 (`color`: "Maintain a minimum contrast ratio of 3:1 for user interface component boundaries and states"). It uses `min-inline-size`/`min-block-size` ≥ 24 px (`copy-button`: "Size the button at least 24×24 CSS px with `min-inline-size`/`min-block-size`").
  - The status bubble is styled only when `:not(:empty)`. Nothing is animated.
- **Motion.** The only motion is `@media (prefers-reduced-motion: no-preference) { html { scroll-behavior: smooth } }`. `motion`: "Use `@media (prefers-reduced-motion: no-preference)` when the reduced-motion strategy is to **not have the animation at all**". The script's chip-row scroll is always instant (§4), so it needs no motion check.
- **`summary`** keeps its native marker (`html`: "DON'T hide visible triangles via `list-style: none`").

#### 4. Script (`site/docs.js`): two independent parts, each feature-detected

**Copy buttons** (`copy-button`, Async Clipboard API; one click path, no invoker commands: D10):
- The buttons are added only when `navigator.clipboard?.writeText` exists (D2).
- For each `pre > code` (10):
  - wrap the `pre` in `div.example`;
  - add `<span class="copy"><button type="button">Copy</button><span role="status"></span></span>` after the `pre`.

  The button stays outside both `<code>` and `<pre>`, because duckdb.spec and range-listings.spec run `code`'s `textContent`. Its accessible name is the visible "Copy", with no `aria-label` (`copy-button`: "If the button shows visible text, that text is the name; do not add an `aria-label` that differs from it").
- **`copy(button, code)`** awaits `navigator.clipboard.writeText(code.textContent)` (D3), then calls `report(button, ok)`. `report` follows the guide:
  - one timer per button (a WeakMap);
  - "Copied" or "Copy failed" written into the sibling `role="status"`, with U+00A0 appended when the message repeats the last one;
  - `data-copied`/`data-failed` set, then cleared after 2 s;
  - the button is never `disabled`.

  `copy-button`: "The confirmation bubble IS the live region. Keep it empty until a copy, and outside the button"; "append a no-break space (` `) so it differs"; "DO NOT disable the button while showing feedback".
- **One wiring path, every browser:** one delegated `click` listener on `document`; for a `.copy button` it calls `copy(button, button.closest(".example").querySelector("code"))`. Enter and Space reach it as the button's native click. `copy-button`'s own fallback: "keep the same markup and add a click listener that calls the same `copy()` function".

**Section index** (`scrollspy`):
- `links` = `nav.toc a[href^="#"]`. `setCurrent(link)` puts `aria-current="true"` on that link, removes it from the others, then calls `reveal(link)`.
- **Native path** (`CSS.supports("scroll-target-group: auto")`). CSS `nav.toc { scroll-target-group: auto }` draws the highlight. `sync = () => setCurrent(nav.querySelector("a:target-current"))` runs at start, on `scrollend` (on `document`) and on `load` (which covers a deep link's jump). `scrollspy`: "Apply the `scroll-target-group: auto` property to the container of your navigation links"; "the visual state must be mirrored with `aria-current`"; "update `aria-current="true"` on the active link when scrolling stops".
- **Fallback path: the section at the anchor landing line** (D9). `at()` returns, in order:
  1. the last section, once the page can't scroll further: `scrollY + root.clientHeight ≥ root.scrollHeight − 2`;
  2. else the last section whose `getBoundingClientRect().top ≤ line`, with `line = parseFloat(getComputedStyle(root).scrollPaddingTop) + 2` (2 px of sub-pixel slack);
  3. else the first section (the header is still in view).

  `scroll-padding-top` is exactly where the browser lands an anchor, and CSS already sets it below the sticky chip row (§3), so the line accounts for the nav in both layouts. The nav's own height would be wrong at 1280, where it's a 314 px column beside the text. The value is read on every run, so the 60rem switch needs no extra code.
  - `update()` toggles `.target-current` on the links and calls `setCurrent`, only when `at()` changed. It runs at start and 100 ms after the last `scroll` or `resize` (one timer, passive listeners). So a smooth 15,000 px jump updates once when it stops, not for each section it passes. `performance`: "DO debounce or throttle rapid event listeners: Limit the execution frequency of handlers attached to `scroll`, `resize`". `scrollspy`: "update `aria-current="true"` on the active link when scrolling stops".
  - A deep link's jump, and any scroll-anchoring shift after the font swaps, fire `scroll` and so run `update()`.
  - `legacy-scan` will report it as `scrollspy/js` ("Manual scroll listener calculates section positions"); it is a kept fallback, gated by the `CSS.supports` check.
- **`reveal(link)`** (the 375 px chip row). If the row overflows and the link isn't fully inside the row's box minus its `scroll-padding-inline` (the fade size where the fade runs, 0 elsewhere: one source, §3), it calls `row.scrollTo({ left, behavior: "instant" })`. Always instant: it is a short sideways nudge after the page has stopped, never an animation (Fable SC2). It never uses `scrollIntoView`, which scrolls every ancestor, the viewport included; `row.scrollTo` moves only the row. Both paths call it only once scrolling has stopped (`scrollend` natively, the timer in the fallback).
- **Without JavaScript**, Chromium 140+ still highlights the current section through `:target-current`, CSS only and without `aria-current`. Other browsers show the plain index. The links work everywhere.

#### 5. Newer browser features (for the Summary)

| Feature | Status (from the guides) | Without it |
|---|---|---|
| `scroll-target-group`, `:target-current` | Chrome/Edge 140 only | the landing-line fallback (§4); with no JS, a plain index |
| Async Clipboard `writeText` | widely available | no copy buttons |
| `font-size-adjust` | Baseline 2024-07-25 | the fallback font at its own size |
| `text-wrap: balance` / `pretty` | Baseline 2024-05-13 / Chrome and Safari 26 | normal wrapping |
| Scroll-driven animations (the chip fade) | Baseline 2026-10-27 | `@supports`-gated: an unmasked row, the cut chip as the cue |
| `scrollend` | used only on the native path (Chrome 114+) | n/a |

Not used: `light-dark()`, invoker commands (D10), scroll-state queries, popover, `hidden="until-found"`, `content-visibility`.

#### 6. Unit tests

- `scripts/build/html.test.ts` gets HT2, written before `rawText` exists, with the failure modes listed first:
  - `</style` in a style, in any case (`</STYLE >`), throws and names the file;
  - `</script` in a script, in any case, throws;
  - `<!--` in a script throws;
  - `<!--` in a style passes;
  - clean text comes back unchanged.
- No other unit tests: `renderDocs`'s output is what the E2E tests check (the owner prefers E2E).

#### 7. E2E

- **`e2e/helpers.ts`** gains:
  - `DOCS_SECTIONS`, moved from `docs.spec.ts:8`; docs.spec imports it and every assertion stays the same;
  - an optional second argument on `learnContext(browser, options?: BrowserContextOptions)` (`helpers.ts:135`), passed to `browser.newContext`. Existing callers don't change; docs-ui gets its viewport, `javaScriptEnabled`, `reducedMotion` and clipboard permissions through it, and its off-origin guard with them (no second route guard);
  - `docsAttribution()`, which reads dist's `attribution.json`.
- **axe runs inline in test 9**, in `learn-walk.spec.ts:44-45`'s form (`id: count (first target)`). No shared helper: learn-walk is outside the brief's e2e scope, and its loop also sums `incomplete`, so sharing would mean editing a Learn spec for two lines.
- **New `e2e/docs-ui.spec.ts`.** Every test opens its page through `learnContext` and asserts no `pageerror` and an empty `offOrigin`. Screenshots go to `ARTIFACTS/docs-ui-*.png` and are attached to the report.
  1. **No JavaScript** (`javaScriptEnabled: false`, 375 px):
     - the nav's hrefs are `#` + DOCS_SECTIONS, in order, and every section's h2 is visible;
     - `#files` has a visible link to every top-level file in `dist/v1/`, plus `/v1/species/51.json` and `/v1/species/jaguar.json`;
     - the `#credits dt` texts equal attribution's sources, with one `#credits li` per checklist and per photo;
     - the page has no `button`;
     - the font line sits outside `#credits` and links `/fonts/OFL.txt`;
     - scrollWidth ≤ 375.
  2. **Copy** (one wiring, D10):
     - 10 buttons, each `type="button"`, each in the same `.example` as its `pre`, and none inside a `pre`;
     - clicking a button calls `writeText` exactly once (recorded by an init-script wrapper; clipboard permissions granted) with that `code`'s `textContent`;
     - the status shows "Copied", then empties within 4 s, and a repeat shows "Copied ";
     - pressing Enter on a focused button copies.
  3. **Copy fails.** When `writeText` rejects, the status shows "Copy failed", and the button stays enabled and focused.
  4. **No clipboard** (`Navigator.prototype.clipboard` returns undefined): no buttons and no `.example` wrappers.
  5. **Scroll-spy**, on the native and the fallback path, with `reducedMotion: "reduce"`, at 1280×800, 375×812 and 1280×1400 (the window where a midpoint band picked Files for About).
     - Fallback = one init script that turns off both kinds of native tracking: `CSS.supports` returns false for any query naming `scroll-target-group`, and a style `nav.toc { scroll-target-group: none !important }` is added at `DOMContentLoaded`. The test asserts `nav.toc a:target-current` matches nothing, so the highlight it sees is the script's `.target-current`.
     - After each of the 8 nav links is clicked, exactly that link has `aria-current="true"` and font-weight ≥ 700 (fallback: and class `target-current`). Cite is reached at the page's end.
     - Deep loads at 375, the three Learn links to: `/#files`, `/#range-listings`, `/#licenses`. That link is current, and the section's h2 top ≥ the nav's bottom.
     - At 375, after a jump to Credits, the current chip lies inside the row's box minus its `scroll-padding-inline`, and the h2's top didn't change: the chip scroll didn't move the page.
  6. **Motion.** `scroll-behavior` computes to `smooth` with `reducedMotion: "no-preference"` and to `auto` with `"reduce"`.
  7. **Focus.**
     - Tab from the top reaches the first nav link, which matches `:focus-visible` with an outline that isn't `none`.
     - Tab also reaches a copy button and an overflowing `pre` (`tabindex="0"`), each showing a ring.
     - At 375, ArrowRight scrolls that `pre`.
     - Each focused element is screenshotted.
  8. **Layout**, at 375 and 1280 px in light and dark:
     - scrollWidth ≤ the width;
     - at 375, the nav stays at `top: 0` after scrolling and stays one row;
     - at 375, the row overflows and, at `scrollLeft` 0, one chip crosses its inline end (the cue without the fade); the first chip is unmasked (`--fade-start` computes to `0px`);
     - the fade's gate, read from the CSSOM: every style rule that sets `mask`, `animation-timeline` or `scroll-padding-inline` on the row has an `@supports` ancestor whose condition names `animation-timeline` and `animation-range` (the only proof Chromium can give that other browsers get no mask);
     - at 1280, the nav sits left of `main`;
     - full-page screenshots.
  9. **axe**, with JS on, every `details` open and a section current, at 1280 and 375 px in light and dark: no violations.
  10. **Font**:
      - the woff2 is requested once per load, with status 200 and `font/woff2`;
      - `document.fonts.check('1em "Atkinson Hyperlegible Next"')` passes after `document.fonts.ready`;
      - `/fonts/OFL.txt` returns 200, `text/plain`, with the same bytes as `site/fonts/OFL.txt`.
- **Artifacts:** the Playwright HTML report and traces (the config has `trace: "on"`), plus the `docs-ui-*.png` files, all in `E2E_ARTIFACTS`. To re-run after `pnpm build`: `E2E_ARTIFACTS=<dir> pnpm exec playwright test e2e/docs.spec.ts e2e/docs-ui.spec.ts`.
- Performance numbers and screenshots come from `measure.mjs after` (see Baseline).

#### 8. Proofs for Verification

- **Learn unchanged.** After the final plain build, hash `dist/learn/` as the Baseline did and diff against `baseline/learn-sha256-1.txt`: the diff is empty.
- **/v1 unchanged.** Hash every non-Learn file in `dist/` as `baseline/nonlearn-sha256.txt` did. The only differences: `./index.html` changed, and `./fonts/atkinson-hyperlegible-next.woff2` and `./fonts/OFL.txt` added.
- **Prose unchanged.** From `git show origin/main:site/index.html` and from the branch's template, take each `<section id>…</section>`, plus `<title>`, the description meta's `content`, the `h1`, `.lead` and the 8 nav link texts (the last three move in §2); strip the tags and collapse whitespace: each pair must be equal. The slots fill the same way, so the built text matches too. New words appear only outside them (the nav heading and the footer).
- **`legacy-scan`** on the final `dist/index.html`, `site/docs.css` and `site/docs.js`: the only expected hit is `scrollspy/js` on the gated fallback ("Manual scroll listener calculates section positions"), recorded as kept.
- **AGENTS.md.** The list of what `pnpm build` writes to `dist/` gains `fonts/` (the docs page's font and its license).

### Decisions to log (architect: conflicts between guides, the Visual direction and critwire's rules)

- **D1. Sections get no `tabindex="-1"`.**
  - `scrollspy` wants it: "Each section must have a unique ID matching a link fragment in the <nav> and tabindex="-1" so it can receive focus."
  - `accessibility` warns against it: "If the target contains focusable elements, this creates another usability issue as clicking within the target will always set the **sequential focus navigation start point** to the target rather than at a point between focusable elements."
  - `copy-button` adds: "a focusable container makes `Tab` skip the copy button in Firefox after a click in the text."
  - Every section here is long and full of links, and browsers already move the sequential focus navigation starting point to a fragment's target, so Tab after a jump continues inside the section. Moving the ids onto focusable headings (`accessibility`'s own fix) would rename every `#<id>` container selector in the e2e specs for one attribute.
- **D2. No copy buttons without a clipboard.** `copy-button` keeps the button and shows a failure: "a missing `navigator.clipboard` throws inside the `try`, so the failure message is shown and announced". critwire.com is HTTPS-only (HSTS), so a missing clipboard only happens on a copy of the page served over plain HTTP, where every button could only fail. A helper must not leave dead UI. A refused write (denied permission) still shows "Copy failed".
- **D3. `textContent`, not `innerText`.** The guide uses `innerText` ("innerText (unlike textContent) keeps rendered line breaks"). The targets are `<code>` inside `<pre>`, with literal newlines and no `<br>` or block elements, so both give the same string. `textContent` is exactly what `e2e/duckdb.spec.ts:24-26` runs, so the copy test can compare exactly.
- **D4. Scrollable `pre` get `tabindex="0"` only, no `role="region"`.** `html` asks for "`role="region"` to the `<pre>`, along with an accessible name". `accessibility` counters: "Don't overuse landmarks: Too many landmarks dilute their value." That would make ten landmarks for ten code samples. Learn's code blocks use `tabindex="0"` alone and pass axe in learn-walk.
- **D5. Media-query tokens, not the Visual direction's `light-dark()`.** With `light-dark()`, `dark-mode` requires "MANDATORY: Fallback for browsers without light-dark support", and that media query does the whole job alone; `light-dark()` "is not required for a basic implementation". No element on the page sets its own scheme. Using only `light-dark()` would leave old browsers with dark ink on an unfilled current chip over the dark canvas.
- **D6. `font-size-adjust: 0.496`, not the Visual direction's `from-font`.** `from-font` reads the first available font, which during the swap is the fallback itself, so it adjusts nothing at the moment it matters.
- **D7. The chip row keeps its scrollbar and gates its fade** (the mock had `scrollbar-width: none`; the guide's fade CSS has no gate).
  - We never hide the scrollbar. `scrollability-affordance-hints`: "If the scrollbar is hidden, the hints are the only cue that the region scrolls, so you MUST use a fallback." Desktop browsers with classic scrollbars show it.
  - Phone scrollbars are overlays, hidden at rest. So where the fade is unsupported (Safari < 26, Firefox < 159), the cue is the chip cut at the row's edge, which test 8 checks at 375; there is no JavaScript fallback for the fade (the guide's IntersectionObserver one would redraw a cue the cut chip already gives).
  - The fade is gated by `@supports (animation-timeline: scroll()) and (animation-range: 0 1px)` (§3). Ungated, the guide's CSS fades "About" for good in those browsers (Fable's probe), which would break the brief's "content and links stay complete and readable without it".
- **D8. The copy button sits in a top strip, not over `padding-inline-end`** (the guide's default and the mock's). `copy-button` itself notes: "On a horizontally scrolling `<pre>`, that padding is only reached at the end of the scroll range, so long lines can pass under the button while scrolling." At 375 px the button would also cover the end of the first line. The strip adds height and never takes width, which is the guide's actual concern ("a permanent margin that narrows the code area on small screens").
- **D9. The scroll-spy fallback uses the anchor landing line and a debounced scroll listener, not the guide's `-50%` IntersectionObserver band.**
  - `scrollspy`'s fallback: "{ rootMargin: '-50% 0px -50% 0px', threshold: 0 }". At 1280×1400 that band marks Files after a jump to About (About is 591 px tall, the midline is at 700), and Credits after Cite (Fable's and Astra's probes).
  - §4's rule (last section at the page end; else the last section whose top ≤ `scroll-padding-top` + 2 px) matched Chromium's native tracking for all 8 links at 1280×800, 375×812 and 1280×1400, and on deep loads of `/#files`, `/#range-listings`, `/#licenses` and `/#cite` (probe on the mock, 2026-11-25). With it, the `#cite` reserve goes.
  - An observer with a px band is exact too, but its bottom margin depends on the window's height, so it would be rebuilt on every resize, and the page end would need a second observer. One function read 100 ms after scrolling stops is fewer parts. `performance`: "DO debounce or throttle rapid event listeners".
- **D10. Copy buttons use one click listener, not invoker commands.** `copy-button`: "Declare the target with Invoker Commands (`command` + `commandfor`) instead of per-button JavaScript wiring". But a custom `--copy` command does nothing by itself, so a listener is needed either way. And invoker commands are only newly Baseline, so the guide's own rule needs the click fallback beside them anyway: "If your Baseline target does not include Invoker Commands, keep the same markup and add a click listener that calls the same `copy()` function". So the click listener alone serves every browser: one path and one test pass, and no ids added to the `<code>`s. "Prefer simplicity" wins (Fable SC5).

### Rejected alternatives (architect)

- **Separate `docs.css`/`docs.js` files:** extra requests, and with Caddy sending no cache headers, fixed-name files would need content hashing plus slot plumbing. Inlining is what Learn already does.
- **A content-hashed font name:** the bytes never change, so hashing would add a build step and a CSS slot for nothing.
- **The font as a base64 `data:` URL:** +43 KB on every HTML load, never cached on its own, and it delays first paint.
- **Restyling `site/style.css`, or layering docs.css over it:** the first changes Learn's bytes; the second fights its rules (`main` width, `h2` borders, nav list).
- **`font-display: optional`:** no swap shift, but a first visit on a slow link never shows the chosen font. Swap with a preload and matched x-height keeps the font, at the cost of a small shift.
- **Copy buttons in the markup, hidden until JS runs:** the HTML would ship buttons that do nothing, and JS would still have to reveal them.
- **`scrollIntoView` for the active chip:** it scrolls the viewport too and can cut a smooth page scroll short.
- **Reusing Learn's `focusableScrollers`** (`learn/pages.ts:69`): it would import a Learn module into the docs build for ten static attributes, and moving it into `html.ts` would edit `scripts/build/learn/`, which is out of scope.
- **A format switcher:** already dropped in the Visual direction (it would hide file links that docs.spec needs visible).
- **The guide's `-50%` observer band, or a higher percentage band (`-20% 0px -80% 0px`):** any percentage line misses the line where anchors land, so the right link depends on the window's height (D9).
- **An IntersectionObserver with a 1 px band in px:** exact, but it has to be rebuilt on every resize, plus a second observer for the page end (D9).
- **A `#cite` (or wrapper) reserve so that Cite reaches the top:** ≈ 450–1,050 px of blank paper at the end; the page-end rule needs none (§3).
- **Dropping the chip fade:** gated, it costs nothing where unsupported, and it is Baseline in all three engines (§3).
- **Dropping smooth page scrolling (Fable SC2):** the flicker came from updating on every section passed; the fallback's debounce and an instant `reveal` remove it, and smooth scrolling stays the one motion under `no-preference`.
- **A shared axe helper with learn-walk importing it:** that edits a Learn spec outside the brief's e2e scope, for two lines (§7).

### Guides checked, not applied (architect)

- **`state-aware-sticky-headers`, stuck styles.** The chip row is opaque with a rule whether stuck or not. The guide: "consider setting your layout up so that the default styling works everywhere (Progressive Enhancement)". Only its `scroll-padding-top` is applied.
- **`performance`, `content-visibility`.** "DON'T apply `content-visibility: auto` on smaller, simpler pages". Its placeholder sizes would also shift the scroll-spy targets.
- **`css`, `@layer`.** One small sheet with no third-party CSS to order against.
- **`search-hidden-content`.** The credits already use `<details>`: "The `<details>` element has searchable and accessible text by default, and no special implementation is required."
- **`copy-button` §3 (selection popover)** ("Skip it for code blocks") and **§4 (hide until hover).** Ten always-visible buttons are simpler and work on touch screens.
- **`copy-button`, invoker commands** (`command="--copy"` + `commandfor`): D10.
- **`accessibility`, skip link.** The index is the first focusable thing on the page, and each link skips to a section: "Avoid using skip links where they are not needed".
- **`color`, `prefers-contrast`.** Text and controls already pass AA. The `--rule` lines are decoration, not component boundaries.
- **`icons`, the CSS icon engine.** The page has one decorative inline SVG and no icon set. Only its "Mark decorative SVGs with `aria-hidden="true"`" is applied.
- **`dark-mode`: `accent-color`, `scrollbar-color` and a theme toggle.** The page has no form controls, and `color-scheme` already themes the scrollbars. "Most sites do not need a persistent toggle in the site UI."
- **`single-line-overflow`, truncation.** Chips and file names never truncate. Only its inset-outline rule is applied.
- **`optimize-preload-priority`, `fetchpriority`.** "Note that fonts are already high priority by default."
- **`shaped-cutouts`, SVG masks.** A clip-path polygon covers the notch. Only its adjacent-element rule is applied.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:
1. **The chip-row fade hides the first chip in browsers without scroll-driven animations** (Safari < 26, Firefox < 159; Baseline only since 2026-10-27).
   - Evidence: §3 "Chip row" (plan:280-281) builds the fade "as the guide builds them" and says such browsers "show no fade"; §5 (plan:328) repeats it. The guide's CSS has no `@supports` gate. Where `animation-timeline` and `animation-range` are unknown they are dropped, and `animation: … linear both` then runs as a 0 s time animation that holds its end state.
   - Probe (Chromium 145, the guide's CSS with those two declarations removed, `scrollLeft` 0): `--fade-start: 48px`, `--fade-end: 0px`. That is a permanent 3rem fade over "About" (the chip spans x 20–84 at 375 in the mock) and no end fade. With the declarations: `0px` / `48px`.
   - It breaks the brief's rule "content and links stay complete and readable without it", and no Chromium test can see it.
   - Fix: put the `mask`, `animation`, `animation-timeline`, `animation-range` and `scroll-padding-inline` inside `@supports (animation-timeline: scroll())`; the `@property` rules stay outside. Or drop the fade: at 375 the row already cuts "Range listings" at its edge (x 316–432, row ends at 355). Correct D7 (plan:407) too: phone scrollbars are overlays, hidden at rest, so without the fade the cue is the clipped chip, not the scrollbar.
2. **The font's provenance can't be written as designed.**
   - Evidence: §1 (plan:231) has the `FONT` comment record the upstream TTF's sha256, "the exact `pyftsubset` command" and the fonttools version. None of the three is recorded: plan:164 gives only a `main`-branch URL, `mock/` holds `build-mock.py` and the finished woff2, and fonttools isn't installed (`python3 -c "import fontTools"` fails; the worktree has no `.venv-learn`). A later session would have to guess a command nobody ran.
   - Fix: one step before the font is committed. Fetch the TTF at a pinned `google/fonts` commit and record its sha256. Run one written command (for example `uv tool run --from 'fonttools[woff]==<version>' pyftsubset … --unicodes=<the list in mock/docs.css:7> --flavor=woff2`). Commit the bytes that command produces, and put the command, the version and both hashes in the comment. If the result differs from `a896eccb…`, update §1's size and sha. Never a reconstructed command.

MISSED:
- **The section ids are a contract with Learn**, which this mission can't change. Learn deep-links here: `/#files` (`site/learn/pages/map.html:19`, `pages/schema-schema.html:4`, `data/index.html:38`, `modules/s1.html:19`), `/#licenses` (`modules/d2.html:33`, `f3.html:32`, `s1.html:38`), `/#range-listings` (`modules/e4.html:36`, `s1.html:47`). The design keeps all eight ids on the sections (D1 is right not to move them onto headings). Say so in §2, and have test 5's deep-link case also load `/#files` and `/#range-listings` at 375 (heading below the sticky row).

SHOULD-CONSIDER:
1. **The fallback scroll-spy picks the wrong link in tall windows** (§4, plan:315; `#cite` reserve, plan:283). Probe on the mock with the guide's `-50%` observer: right at 1280×800 and 375×812; at 1280×1400, clicking About makes Files current (About is 591 px tall, the midline is at 700) and Cite makes Credits current. The planned reserve fixes Cite only. The native path (same mock, no reserve, Chromium 145) is right at all three sizes, with Cite current at the page's end. Suggest a higher line (about `-20% 0px -80% 0px`) and a 1280×1400 case in test 5. The reserve then only has to let Cite reach that line, so it can go below the footer; as designed it leaves about 450 px blank at 800 high, and about 1,050 at 1400, between Cite's text and the font line.
2. **Smooth scrolling costs more than it gives** (plan:290, 316). In the fallback path `setCurrent` calls `reveal` for every section the line crosses during a smooth 15,000–21,000 px jump, so chips flicker and smooth row scrolls stack. Either drop `scroll-behavior: smooth` (test 6 and `reveal`'s `behavior` branch go with it), or keep it and make `reveal` always `instant`.
3. **Reuse the e2e helpers** (§7, plan:345-349). The off-origin guard exists: give `learnContext` (`e2e/helpers.ts:135-150`) an optional context-options argument (viewport, `javaScriptEnabled`, `reducedMotion`, permissions) rather than writing a second route guard. `axeViolations` repeats `e2e/learn-walk.spec.ts:44-45`; have learn-walk import it too (test-only, `dist/learn/` unaffected), or note why not.
4. **The prose proof covers only the eight sections** (§8, plan:391). The lead and the nav labels move outside them. Compare `<title>`, the description, `h1`, `.lead` and the nav link texts as well.
5. **Two copy wirings for one behavior** (§4, plan:310). A `--copy` custom command still needs a listener, so invoker commands save no code here; the click path alone serves every browser, and keeping both doubles test 2. The brief allows it. Record it under Decisions as guide over "Prefer simplicity", or ship the click path only and list invoker commands under "checked, not applied".

Verified (on `3e68dce` = `origin/main` `524bb38` + plan):
- Findings 1–6: line references match the code. axe 4.14 on the Baseline `dist/index.html`: `scrollable-region-focusable` 9 at 375, 2 at 1280, nothing else.
- Contrast recomputed from the tokens: every text pair ≥ 5.3:1 in both schemes (moss on paper 6.05 / 9.92, on fern 5.37 / 8.42; lichen on fern 5.31 / 6.80; ink on pollen 10.64 / 8.11).
- Learn stays byte-equal by design: `site/style.css` and `scripts/build/learn/**` untouched, `html.ts` keeps `styleSheet` and only gains a function, nothing new under `dist/learn/`. No test or tsconfig walks `site/`'s root.
- `fillSlots`: CSS and JS enter through slots, which aren't rescanned (HT1, `html.test.ts:8`); the replace uses a callback, so `$` in the JS is safe; the template's `@font-face` and SVG hold no `{{`.
- Copy buttons sit outside `<pre>` and `<code>`, so `pre > code[data-example]` (`e2e/duckdb.spec.ts:25`) and `code[data-query]` (`e2e/range-listings.spec.ts:132`) read the same text. No file link is hidden.
- Serving: `/etc/mime.types` has `font/woff2`; the live block equals `e2e/Caddyfile` (no `Cache-Control`), which inlining and the fixed-bytes font tolerate. The release smoke walks every `dist/` file (`e2e/release/live.spec.ts:31-49`) and `deploy` rsyncs all of `dist/`, so `/fonts/*` is covered.
- Font: `OFL.txt` names no Reserved Font Name; x-height measured in Chromium ≈ 0.50, so D6's 0.496 is sound. Budget: about 51 KB of 150, feasible; the first `pre` sits at y ≈ 788 (1280) and 1,082 (375), so the copy strip adds no shift in the measured viewports.

Guides consulted (saved copies in the state folder's `guides/`):
- `scrollability-affordance-hints`: "Without scroll-driven animations, the fades are never shown" (not so without the gate: MUST-FIX 1); "If the scrollbar is hidden, the hints are the only cue that the region scrolls, so you MUST use a fallback."
- `scrollspy`: "{ rootMargin: '-50% 0px -50% 0px', threshold: 0 }"; "DO provide enough vertical space for sections".
- `copy-button`: "keep the same markup and add a click listener that calls the same `copy()` function"; "`command` events do not bubble: listen in the capture phase on document."
- `visually-stable-font-fallbacks`: "Manual calculation: If you know the specific value (e.g., 0.545 for Verdana), you can provide it directly for more precise control."
- `performance`: "Do include the `crossorigin` attribute for all fonts (even same origin fonts)."
- `state-aware-sticky-headers`: "Add `scroll-padding-top` to the scrollport and set the value to be equal or greater than the sticky element's height."
- `motion`: "Use `@media (prefers-reduced-motion: no-preference)` when the reduced-motion strategy is to **not have the animation at all**".

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. §4’s fallback can announce the wrong section. The recorded 1280×1400 case selects **Files** after the reader follows **About**. Select the section at the anchor landing position, accounting for the sticky navigation, and test that case with native scroll tracking disabled. Percentage observer margins do not reliably define a viewport-height midpoint. [Intersection Observer specification](https://w3c.github.io/IntersectionObserver/#dom-intersectionobserver-rootmargin)
2. §3’s mobile navigation fade can obscure **About** in browsers without scroll-driven animations. Make the unmasked row the default. Enable the mask and animation together only when the required timeline and range are supported, or omit the fade. [CSS animation fill behavior](https://drafts.csswg.org/css-animations-1/#animation-duration)

SHOULD-CONSIDER:

1. Regenerate the font subset from a pinned upstream revision and record the command and hashes. Keep font generation outside the offline site build.
2. Test direct mobile loads of `/#files` and `/#range-listings`. Learn links to both, and each heading should land below the sticky row.
3. In §7’s fallback test, disable native CSS tracking as well as the JavaScript feature check. Otherwise Chromium can still supply the visual highlight the test is meant to verify.

## Revision notes

Architect, 2026-11-25, one round. Probes on the mock (Chromium 145, `/tmp` scripts, nothing committed).

MUST-FIX:
- **Chip fade (Fable MF1 = Astra MF2): fixed.** The row is unmasked by default. Mask, animation, timeline, range and `scroll-padding-inline` sit only in `@supports (animation-timeline: scroll()) and (animation-range: 0 1px)` (`CSS.supports` true in Chromium 145). The fade is kept, not dropped (§3: Baseline in all three engines, the guide picks it, free where missing). D7 is corrected: phone scrollbars are overlays, so without the fade the cue is the cut chip. Test 8 checks the cut chip, `--fade-start` 0px at rest and the gate in the CSSOM. `reveal` reads the row's `scroll-padding-inline`, so it follows the gate.
- **Font provenance (Fable MF2; Astra SC1): fixed.** §1 "Font step": google/fonts commit `66eef707…` (the TTF's and `OFL.txt`'s last change), one written `curl` + `uv tool run --from 'fonttools[woff]==4.68.0' --with 'brotli==1.2.1' pyftsubset …` command, both sha256s recorded, the produced bytes committed, everything named in the `FONT` comment, and §1's row updated if the bytes differ from the mock's. It runs outside `pnpm build`. Checked, not run: uv resolves both pins; at that commit `OFL.txt`'s git blob equals the mock's.
- **Fallback scroll-spy (Astra MF1, Fable SC1): fixed.** §4/D9: the last section at the page end; else the last section whose top ≤ computed `scroll-padding-top` + 2 px (the browser's own landing line, which already sits below the sticky row; the nav's height would be wrong in the 1280 column); else the first. It runs 100 ms after the last scroll or resize. The probe matched native at 1280×800, 375×812 and 1280×1400 for all 8 links, Cite at the end, and on 375 deep loads. The `#cite` reserve is dropped (re-sized to zero): the page-end rule needs none, and the bound is stated (windows ≤ ≈ 2,570 px tall). Test 5 adds 1280×1400, and its fallback turns off both the JS check and CSS tracking (`scroll-target-group: none !important`; it asserts `:target-current` matches nothing) (Astra SC3).

Also:
- **Section ids as Learn's contract (Fable MISSED = Astra SC2): adopted.** §2 lists Learn's links; test 5 deep-loads `/#files`, `/#range-listings`, `/#licenses` at 375, h2 below the nav.
- **Fable SC2, smooth scroll: adopted in part.** Smooth page scrolling stays. The fallback's debounce updates once per stop, and `reveal` is always instant, so the chips can't flicker and row scrolls can't stack. The motion branch in `reveal` is gone.
- **Fable SC3, reuse e2e helpers: adopted in part.** `learnContext` gets an optional `BrowserContextOptions` argument, and docs-ui uses its off-origin guard. No `axeViolations` helper: axe runs inline in learn-walk's form, because sharing would edit learn-walk (outside the brief's e2e scope, and it also sums `incomplete`).
- **Fable SC4, prose proof: adopted.** It also compares `<title>`, the description, `h1`, `.lead` and the nav link texts.
- **Fable SC5, two copy wirings: adopted, click path only** (D10). Invoker commands are listed as checked, not applied; test 2 runs once; no ids on the `<code>`s.

## Steps

## Verification

## Code review (Astra)


## Release

## Decisions

## Log

- 2026-11-25 06:25 UTC · Baseline: typecheck ok, test 823/823, plain build ×2 (Learn hashes stable, 151 files), e2e 168/168, before screens + metrics recorded.
- 2026-11-25 06:43 UTC · Architecture: frontend-design → Visual direction + mock (`mock/`, screens light/dark 1280/375, no overflow, font loads); modern-web-guidance legacy-scan (page 0 findings, mock 1 `scrollspy/js`), 12 searches, 19 guides saved to `guides/`; architect wrote Findings (axe `scrollable-region-focusable` on current `<pre>`s) + Target design + D1–D8. Plan-only change.
- 2026-11-25 06:57 UTC · Fable review: APPROVE WITH CHANGES, 2 MUST-FIX (chip fade needs `@supports` gate; font subset provenance reproducible), 1 missed (section-id deep-link contract), 5 SHOULD-CONSIDER. Plan-only change.
- 2026-11-25 07:00 UTC · Astra review: APPROVE_WITH_CHANGES, 2 MUST-FIX (fallback scroll-spy wrong section at 1280×1400, test with native tracking off; chip fade gate, same as Fable's), 3 SHOULD-CONSIDER. Plan-only change.
- 2026-11-25 07:14 UTC · Revision: architect fixed all MUST-FIX (chip fade behind `@supports`, D7 corrected; pinned font step w/ hashes + pyftsubset cmd; fallback scroll-spy at anchor landing line, D9, 1280×1400 test w/ native tracking off), adopted section-id contract + Fable SC2–SC5 (D10 click-only copy), rejected shared axe helper. Plan-only change.

## Summary
