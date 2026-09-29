---
mission: design-pass
project: critwire
branch: agent/design-pass
status: active
started: 2026-09-29 05:06 UTC
---

# Mission: critwire design pass

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Give critwire's public surfaces a distinctive, deliberate visual design, following the `frontend-design` skill (`~/.claude/skills/frontend-design/SKILL.md`). Load it with the Skill tool and follow its whole process: design plan, review of the plan against this brief, build, then critique from screenshots.

1. **Critwire's own marketing site** (`/`, in `src/app/(frontend)`): critwire's identity.
2. **The studio portal** (`/g/<slug>`: the flagship landing template, patch notes and their detail pages, the issue tracker with voting, issue reports, the contact form): the layout, typography, components and states behind every studio's portal. The portal is white-label, so the design has to look intentional under *any* studio theme, not just one.
3. **A distinctive default portal theme** (`DEFAULT_THEME_COLORS` and friends), plus a Critter Connect theme tuned to the demo.

### Why

The product works and is tested (the `agent/architecture-pass` mission). It still looks like the Payload template it grew from. Studios buy it partly on how professional their portal looks to players.

### Subject (so no confirmation is needed; the owner is asleep)

- **What critwire is:** the public ops layer for an indie game. It's one hosted, branded portal per studio, holding the game site, patch notes, a public issue tracker with player voting, and a contact form. See `AGENTS.md` and `docs/features.md`.
- **Portal audience:** the players of one indie game. Their jobs are to see what's new, check whether their bug is known, vote on it, report it, or contact the studio.
- **Marketing audience:** solo founders and small indie studios deciding whether to use critwire.
- **Reference content:** the Critter Connect demo (`pnpm seed:critter-connect`). Design with its real content, not lorem ipsum.

### Scope

In:
- Styles, layout, components, typography, fonts, the default theme values, motion, empty and error states, and UI copy on the surfaces above.
- Reworking `globals.css`, `flagship.css`, the portal chrome (`PortalChrome.tsx`) and the render components of `src/site-templates/flagship-game-v1`.
- Adding theme tokens beyond colors, such as type or radius, if the design needs them. Extend `siteThemeSchema` backwards-compatibly, with defaults, so existing saved sites stay valid.

Out:
- The Payload admin panel.
- New features, new pages, and data-model changes other than optional theme tokens.
- Weakening the theme's WCAG contrast rules. Every theme must still pass them.
- The mission's architecture work and its fixes. Don't regress them.

### Definition of done

- The full E2E suite passes. Update selectors only where markup changed, never an assertion's meaning.
- `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` pass.
- **Screenshots before and after**, desktop 1440 px and mobile 390 px, of every page in scope, rendered with the Critter Connect demo. The portal is shown under the new default theme, the Critter Connect theme and one deliberately unusual theme (for example a light theme with a strong accent), to prove the white-label claim. Save them under `/srv/critter-ai/agent-state/missions/design-pass/screenshots/{before,after}/`, with an `index.html` that shows each before/after pair side by side. Capture with Playwright against a production build.
- **The quality floor from the skill:** responsive down to 390 px, visible keyboard focus, `prefers-reduced-motion` respected, and contrast passing.
- **The Summary contains:** the final design plan (palette, type, layout concept, principles), what the self-critique changed, and the screenshot index path.
- Branch `agent/design-pass` pushed. Don't merge it.

### Decision rules

- The design plan (the skill's token system and the "review against the brief" step) is the Architecture stage. The `architect` writes it into the plan's Architecture section, and both reviews judge it against this brief and the skill's list of generic defaults to avoid.
- Take the skill's advice to "spend your boldness in one place". Put it in the marketing hero and the portal landing hero. Keep the operational pages (patch notes, issues, forms) calm, fast and legible.
- Fonts must be self-hosted through `next/font`, with no runtime third-party requests, and have a licence that allows commercial use.
- Anything that needs the owner (buying a font, choosing between two finished directions) goes in the handoff file. Pick the stronger option and carry on.

### Notes

- This mission builds on `agent/architecture-pass`, which isn't merged yet (started with `--from`).
- Before shooting "before" screenshots, seed the Critter Connect demo into the mission database. The seed needs `CRON_SECRET` in `.env` and one existing tenant; see how `tests/e2e/auth.setup.ts` creates users and tenants over REST.
- The current fonts are Geist Sans and Mono, from the template.
- A demo server may be running on port 3000 (`systemctl --user stop critwire-demo`). The E2E suite needs that port.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Commit `669376c`, 2026-09-29 05:07–05:12 UTC.

- **Setup:** created the disposable E2E database `critwire_m_design_pass_e2e` and added `E2E_DATABASE_URL` and a generated `CRON_SECRET` (needed by `pnpm seed:critter-connect`) to the worktree `.env`. `pnpm install --frozen-lockfile`: up to date. `pnpm payload migrate`: all migrations applied to the fresh mission database, no `dev` row.
- **Typecheck** (`pnpm exec tsc --noEmit`): pass.
- **Lint** (`pnpm lint`): pass, 0 errors, 23 warnings (mostly `@typescript-eslint/no-unused-vars`, plus 3 `react-hooks/set-state-in-effect` and 1 `react-hooks/exhaustive-deps`). Pre-existing; don't add new ones.
- **Int** (`pnpm test:int`): 3 files, 9 tests passed.
- **E2E** (`pnpm test:e2e`): 73 passed, 0 failed, 3.7 min. Report: `/srv/critter-ai/agent-state/missions/design-pass/e2e-baseline/` (`pnpm exec playwright show-report <dir>`).
- **Ports:** the E2E suite serves on 3100 (sink on 3101), not 3000; `critwire-demo` was inactive.
- **Not yet done:** the "before" screenshots. No source has changed since `669376c`, so they can still be shot from it; the Steps must capture them before the first design change (or from a checkout of `669376c`).

## Architecture

Written by the `architect` on 2026-09-29, from the code at `893b149` (source identical to `669376c`). Font choices and the two hero directions were checked with throwaway Playwright mockups (Critter Connect art, all three themes) before this plan was written. The mockup results are recorded under "Review against the brief".

### Current state (what exists)

- **Fonts:** Geist Sans and Mono from the `geist` package, on both root layouts (`src/app/(frontend)/layout.tsx:4-5,23`, `src/app/(public)/layout.tsx:3-4,16`). The template's `editorial` typography is system Georgia; `technical` is Geist Mono (`render/themeStyle.ts:16-24`).
- **Where styles live:** everything is one Tailwind v4 entry, `src/app/(frontend)/globals.css`, imported by both root layouts. It holds three unrelated layers:
  1. Payload-template shadcn tokens (oklch neutrals plus a `[data-theme='dark']` palette, lines 112-186) for the marketing site.
  2. A Critter Connect-flavoured `--ds-*` / `cc-*` / `glass-*` / `glow-*` layer (lines 90-110, 248-364) used by the ops pages. It includes `--ds-gem-*` tokens nothing uses.
  3. `@import './flagship.css'`, the `--fs-*` template system.
  shadcn/ui usage is small: `Button` (via `CMSLink` and the marketing 404). `ui/card.tsx` and `ui/select.tsx` are unused.
- **Payload-template leftovers:**
  - The `/` fallback `endpoints/home-static.ts` ("Visit the admin dashboard…", meta "An open-source website built with Payload and Next.js.").
  - `Header` and `Logo`. `Logo` hot-links the Payload logo from raw.githubusercontent.com at runtime, with alt text "Payload Logo".
  - `Footer` with `ThemeSelector`, plus `InitTheme`, `providers/Theme` and `providers/HeaderTheme`.
  - The `html { opacity: 0 }` hack (`globals.css:239-246`).
  - The `heros/*` components, `blocks/{Content,CallToAction,MediaBlock}` and `AdminBar`.
  - The typography-plugin config, which maps prose colours to an undefined `var(--text)` (`tailwind.config.mjs:9-10`).
- **How the theme flows from data to CSS** (landing only):
  1. The Payload `site.theme` group goes through `normalizeSiteInput`, then `siteConfigV1Schema`. Zod enforces six WCAG pairs (`schema/theme.ts:39-44`).
  2. `themeStyle()` writes the result as `--fs-*` inline custom properties on `.fs-root` (`FlagshipSite.tsx:62-66`), and `flagship.css` consumes them.
  3. With no published flagship page, `deriveFlagshipDefault` uses `DEFAULT_THEME_COLORS`. The only exception is `project.accentColor`, which it keeps only if it clears 3:1 against the default background (`defaults.ts:21-34`).
  4. The ops pages never read the theme (F1).
- **Constraints that bind the design:**
  - **Contrast rules** (Zod refine, publish-time).
  - **Parity:** `site-config-parity` compares Payload fields and Zod keys and enum options, so enums can't gain or lose values without both sides changing.
  - **Stored defaults:** Payload `defaultValue`s are Postgres column defaults (migration `20260712_082516:177-253`), so changing `DEFAULT_THEME_COLORS` needs a migration.
  - **AI output schema:** it mirrors the theme enums (`site-generator/outputSchema.ts:44-50`).
  - **`template-revalidation`** covers issue hooks only.
  - **404 without leaks:** the portal 404 renders at the `(public)` root, outside the studio chrome, so it can't leak the game (S2.1).
  - **Caching:** the patch-notes pages are ISR-cached until a hook revalidates them.
  - **E2E hooks on markup:** see the table in "UI copy and E2E impact".

### Findings (ranked by impact)

1. **The white-label portal is white-label on one page type out of seven.**
   - **Where:** `PortalChrome.tsx:35-107` wraps every ops page in a hard-coded navy/cyan `cc-portal` (`globals.css:272-280`) with raw Tailwind palette classes (`text-slate-*`, `text-cyan-200`, `border-cyan-300/30`). The same fixed-palette pattern appears in:
     - `IssueStatusBadge.tsx:7-15`: fixed slate, emerald, blue, amber, violet.
     - The issue callouts, `issues/[slug]/page.tsx:60,67,74`: light-mode amber, purple and green with `dark:` twins.
     - `VoteButton.tsx:43`: `bg-(--game-accent,#111)`.
   - **What goes wrong:** a studio's published theme reaches only `/g/<slug>`. The nav, its labels, its links and the footer also change between the landing (`SiteNav`/`SiteFooter`) and the ops pages (`PortalChrome`), whose external-link list exists only there (`PortalChrome.tsx:8-17`, duplicating the label table in `SiteFooter.tsx:7-11,39-50` and `actions.ts:21-32`).
   - **Standards broken:** separation of concerns (the theme is bypassed, not consumed), DRY (two chromes), established interfaces.
   - **Fix:** one `SiteFrame` for every portal page, fed by the published site config (Target design §1).
2. **A valid theme can still produce unreadable UI.** Schema-valid colours are used in ways the schema never checks:
   - `--fs-success` and `--fs-warning` are text colours (`flagship.css:179-187`) but are never validated.
   - The accent is used as text: `.fs-eyebrow` (`:48`), `.fs-link:hover` (`:131`) and the `→` in `Availability.tsx:66-68`. It's only guaranteed 3:1 against the background, and not at all against the surface.
   - The focus ring is the accent (`:257-263`).
   - Body text sits on art behind 35–55% scrims (`:160-167`, used by Hero, Community and FinalCTA).
   - Inputs are bounded only by the unvalidated `--fs-border` (WCAG 1.4.11).
   - **Standards broken:** fail fast (invalid states pass), the quality floor.
   - **Fix:** the white-label token contract (§2). No schema change is needed.
3. **Critter Connect's in-world vocabulary is platform copy.** Every studio's portal says "Field Notes", "Field Board", "Send Field Report", "Track type", "The team has the signal":
   - `PortalChrome.tsx:60-72`
   - `PatchNotesFeed.tsx:27-28,37`
   - `issues/page.tsx:99-102,152,206`
   - `report/page.tsx:28-32,40-46,63,67,94,108`
   - `contact/page.tsx:37-40,71`
   - `patch-notes/page.tsx:41-42`
   - **Standard broken:** separation of concerns (studio content hard-coded in the platform).
   - **Fix:** plain, neutral copy. A studio's vocabulary lives in its own nav labels (§8).
4. **The marketing site is the Payload template, and it's fragile.**
   - `/` renders `homeStatic` filler. The header ships a third-party runtime image request.
   - `InitTheme` plus `html{opacity:0}` means a blocked or failed script leaves the whole page invisible.
   - **Bug and standards broken:** the invisible page is a bug; KISS (a light/dark switch nobody designed).
   - **Fix:** a code-owned marketing home and a single deliberate palette (§5).
5. **Rich text assumes a dark page.** Patch-note and issue detail use `prose dark:prose-invert`. That only works because `(public)/layout.tsx:17` hard-codes `data-theme="dark"` (`RichText/index.tsx:39`, `patch-notes/[slug]/page.tsx:47`, `issues/[slug]/page.tsx:91`). Once theming reaches these pages, a light studio theme would render light-on-light body text.
   - **Fix:** map the typography plugin's `--tw-prose-*` variables to surface tokens and drop `dark:`.
6. **The default theme is the generic default, and it looks the same as Critter Connect.**
   - `DEFAULT_THEME_COLORS` (`schema/theme.ts:49-60`, #0b0d14 plus #22d3ee), the CC seed theme (`critterConnect.ts:197-209`) and the ops layer are all near-black plus cyan (skill cluster 2). Screenshots "under the default" and "under CC" would look identical.
   - `defaults.ts:19` uses the tinted near-black `#0b1016` as a button-text candidate.
   - **Fix:** three distinct palettes (§3), plus a column-default migration (§4).
7. **CSS cascade conflicts.** `flagship.css` is unlayered, so it beats Tailwind utilities on the same element:
   - `FinalCTA.tsx:29` (`fs-h2 text-4xl sm:text-5xl`) never gets its size.
   - The same happens at `Adaptive.tsx:46` and `LatestUpdate.tsx:35`.
   - **Fix:** import surface stylesheets into `@layer components` (the skill's specificity warning).
8. **Duplication (DRY):**
   - **Status→colour** is mapped twice (`IssueStatusBadge.tsx:7-15`, `KnownIssues.tsx:18-24`).
   - **Two date formatters** give different outputs ("September 26, 2026" in `PatchNotesFeed.tsx:8-15`, "Sep 26, 2026" in `render/ui.tsx:91-96`).
   - **Vote-count markup** appears three times (`issues/page.tsx:48-50,75`, `KnownIssues.tsx:56-60`).
   - **Form field markup** is repeated eleven times, and the success/error banners twice (report and contact pages).
   - **Fix:** shared portal primitives (§7).
9. **Accessibility gaps:**
   - The issue search and both selects have no labels (`IssueFilters.tsx:33-62`).
   - "Pinned" is an emoji with only a `title` (`issues/page.tsx:38,72`, `issues/[slug]/page.tsx:41`).
   - The `▲` in `KnownIssues.tsx:58` is read aloud.
   - Board columns are unlabelled `div`s (`issues/page.tsx:61-66`).
   - The Tally invalid-URL message gives admin instructions to players (`TallyEmbed.tsx:59-61,113`), and its footnote names Critwire on a white-label portal (`:77-88`).
   - There's no current-page state in the nav.
10. **Mobile header:** `SiteNav.tsx:31` and `PortalChrome.tsx:55` wrap four to nine links under the name at 390 px, which makes a two- or three-line sticky header.
11. **Dead layers:** `--ds-*`, `glass-*`, `glow-*` and `cc-*` (after F1), the shadcn `[data-theme='dark']`, chart and sidebar tokens, the `geist` dependency, `render/NavShell.tsx` (only needed for the overlay nav), `[slug]/page.client.tsx`, and the header-theme plumbing in `heros/HighImpact`.

**Fine as is (keep):**
- The Zod theme schema and its contrast refine.
- The slot registry and fixed `SLOT_ORDER`.
- The action-ref contract.
- The click-to-load trailer and the skip link.
- The reduced-motion handling in the template.
- The caching and revalidation architecture, access control and Zod boundaries from the architecture pass. Only the GamePage hook's scope widens (§1).

### Target design

#### 1. Components, boundaries, data flow

```
GameProject ──┐
              ├─ getPortalSiteConfig(project) ─► SiteConfigV1 (published flagship config, or derived default)
GamePage ─────┘          (React cache, published only)
                                 │
landing /g/[slug] ── FlagshipSite ─┐        ops layout ── PortalChrome ─┐
                                   ▼                                    ▼
                       SiteFrame(config.theme, config.nav, config.footer, project)
                       = .fs-root[style=themeStyle(theme)] + skip link + SiteNav + <main> + SiteFooter
```

- **New `src/lib/game-portal/landingPage.ts`** takes code moved out of `app/(public)/g/[gameSlug]/page.tsx`:
  - `getLandingPage(projectID, draft, user?)`: the existing query, React-cached.
  - `resolveFlagshipConfig(page, project, { draft })`: the existing normalize → parse → Sentry-on-drift → derived-default block (`page.tsx:93-116`), returning `{ config, media }`.
  - `getPortalSiteConfig(project): Promise<SiteConfigV1>`: a cached query that resolves the *published* landing and returns its flagship config, or `deriveFlagshipDefault(project)` for legacy or absent pages.
  - The landing page keeps its decision tree, calling these functions (no behaviour change).
- **`PortalChrome`** becomes an async Server Component: `<SiteFrame config={await getPortalSiteConfig(project)} project={project}>`. It still wraps ops pages and legacy block landings.
- **`SiteFrame`** (new, `render/SiteFrame.tsx`) is the only place that creates `.fs-root`. `FlagshipSite` renders slots inside it.
- **`SiteNav` and `SiteFooter`** take `{ project, nav, value }` instead of the whole render context; they only ever read `project`.
  - **Current-page links:** `SiteNavLinks`, a tiny client component using `usePathname`, sets `aria-current="page"`. It replaces `NavShell`; the nav becomes a solid bar, so there's no scroll state.
  - **Footer contents:** always the four portal pages, each labelled with the studio's nav label for that ref when one is set, otherwise `DEFAULT_ACTION_LABELS`. Then the project's external links (moved from `PortalChrome`), then legal links.
- **Revalidation:** ops pages now render the landing's theme, nav and footer, so the GamePage hooks (`revalidateGamePage.ts:48`, the delete hook) call `revalidatePath(PORTAL_ROUTE, 'layout')`, the same scope the GameProject hook already uses. Without this, the ISR patch-notes pages keep the old theme for up to an hour.
- **Portal 404:** `(public)/not-found.tsx` stays at the root (no leak) and renders in a plain `.fs-root` with `themeStyle(siteThemeSchema.parse({}))`, the default theme. It needs no data.

#### 2. The white-label token contract (why any valid theme works)

The schema guarantees these pairs:

- `fg` against `bg` and against `surface`: at least 4.5:1.
- `muted-fg` against `bg` and against `surface`: at least 4.5:1.
- `accent-fg` against `accent`: at least 4.5:1.
- `accent` against `bg`: at least 3:1.

The design uses colour only through those pairs:

| Token | Allowed use |
|---|---|
| `--fs-fg`, `--fs-muted-fg` | All text, on `bg` or `surface`. Also every interactive boundary: input and secondary-button borders use `--fs-muted-fg`, which is at least 4.5:1, so WCAG 1.4.11 is met. |
| `--fs-accent` | Fills only: primary button, pressed vote button, the `aria-current` nav underline on `bg`, link underline colour (decoration). Never text, never on `surface`. |
| `--fs-accent-fg` | Text on accent fills only. |
| `--fs-border` | Decorative dividers only. Nothing a player must perceive depends on it. |
| `--fs-success/-warning/-error` | Fills of status markers only, always beside a text label in `fg`. |
| Focus | `outline: 2px solid var(--fs-fg); outline-offset: 2px; box-shadow: 0 0 0 2px var(--fs-bg)`. This two-tone ring (WCAG technique C40) is at least 4.5:1 against the page, a surface or an accent button, under any theme. |
| Art | Text never sits on art. Hero, community and final-CTA text sit on solid `bg` (the "plate"). Gallery captions go below images. |

#### 3. Token system: colour

**Critwire (marketing), "Addendum".** The reference is the coloured "read me first" slip that used to ship inside game boxes, listing late changes and known issues: the paper ancestor of patch notes.

| Name | Hex | Role | Contrast |
|---|---|---|---|
| Slip yellow | `#F6D33C` | Hero field; CTA text on ink | — |
| Ink | `#1D1F55` | Text, CTA fill, the "wire", footer band | 10.4:1 on yellow, 13.7:1 on paper |
| Paper | `#F2F3F8` | Page background after the hero | — |
| Graphite | `#4A4D6E` | Secondary text | 5.6:1 on yellow, 7.4:1 on paper |

There's no second accent and no gradients or shadows. The shadcn variables (`--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--border`, `--ring`) are re-pointed to these, so `Button` and `CMSLink` keep working.

**Portal themes** (all values checked against the schema's six pairs):

| Token | New default "Slate & signal" | Critter Connect "Night canopy" | Screenshot test theme "Riso lime" |
|---|---|---|---|
| background | `#1F2030` | `#0F1F26` | `#EEF4D2` |
| surface | `#282A3D` | `#172B33` | `#FBFDF2` |
| foreground | `#F1F1F5` (14.3) | `#E6F1F0` (14.6) | `#1C1A3A` (14.7) |
| mutedForeground | `#A9ACC2` (7.2 / 6.3) | `#9AB5B8` (7.8 / 6.8) | `#4F4E6E` (7.0 / 7.7) |
| accent | `#AEB8FF` signal lilac (8.5) | `#F3B340` firefly amber (9.1) | `#2446E8` riso blue (5.9) |
| accentForeground | `#1F2030` (8.5) | `#10191C` (9.6) | `#FFFFFF` (6.7) |
| border | `#3B3E56` | `#28444E` | `#C8D49A` |
| success / warning / error | `#6FD39B` / `#F2A05C` / `#FF7B86` | `#5BD49C` / `#EF8A50` / `#FF6F7D` | `#1F7A45` / `#9A5A00` / `#B8302A` |
| typography / shape / density / motion | modern / balanced / cinematic / subtle | technical / balanced / cinematic / subtle | editorial / sharp / compact / subtle |

- **Default:** a perceptibly blue-violet slate, not a near-black. It stays dark because studios' key art is overwhelmingly dark, and because `deriveAccentColors` checks studio accents against this background (E2E S2.3's white and `#123456` fixtures keep their meaning; recomputed at 16.1:1 and 1.26:1).
- **Critter Connect:** from its own art. The night-jungle teal is the background, and the amber of the clue-trail dots (the game's core mechanic, "follow living clue trails") is the accent. The cyan HUD stays in the art.
- **Riso lime:** light, with a strong saturated accent. It exercises light themes, white-on-accent buttons, sharp corners, compact density and the serif voice.
- **`ACCENT_FOREGROUND_CANDIDATES`** becomes `[DEFAULT.background, DEFAULT.foreground, '#000000', '#ffffff']`.
- **Seed:** the CC seed's `accentColor` becomes `#f3b340`.

#### 4. Token system: type

**Fonts:**

| Family | Role | Licence | Loaded by |
|---|---|---|---|
| Atkinson Hyperlegible Next (variable wght 200–800) | Body and UI everywhere, all numerals | OFL 1.1 (Braille Institute) | `src/fonts.ts` → both layouts, `preload: true` |
| Anybody (variable wdth 50–150, wght) | Critwire display | OFL 1.1 (Tyler Finck / ETC) | `src/app/(frontend)/fonts.ts`, `preload: true` |
| Archivo (variable wdth 62–125, wght) | Portal `modern` display (default) | OFL 1.1 (Omnibus-Type) | `src/site-templates/flagship-game-v1/fonts.ts`, `preload: false` |
| Young Serif (400) | Portal `editorial` display | OFL 1.1 (Bastien Sozeau) | same, `preload: false` |
| Science Gothic (variable wdth 50–200, wght) | Portal `technical` display | OFL 1.1 (Phinney, Kateliev, Buerkle) | same, `preload: false` |

- **Why Atkinson for body:** it was designed for low-vision readers, and the portal's job is reading. Its distinct `I l 1` and slashed zero suit version strings like `v0.1.0`.
- **Loading:** all five are served through `next/font/google` with subsets `latin, latin-ext`, `display: 'swap'` and axes `['wdth']` where listed. Google Fonts is reachable from this VPS (`curl` to `fonts.googleapis.com` answered, and the css2 API returned all five families). Next 16.2.6's bundled font list contains all five. Next downloads and self-hosts the files at build time, so there are no runtime third-party requests.
- **Why the portal display fonts aren't preloaded:** the display face depends on the studio's theme, which isn't known statically. Swap plus Next's fallback metrics keeps layout shift low.
- **Cleanup:** remove `geist` from `package.json`. Code blocks in prose use the system `ui-monospace` stack (no web font).
- **Studio type choice:** no new theme token is needed. `typography` (modern | editorial | technical), `shape`, `density` and `motion` already exist in Zod, in Payload and in the AI schema. Only what they *map to* changes, in `themeStyle.ts`. So there's no enum change, no parity-test change and no migration for tokens.

`themeStyle()` gets a display-voice table (the single source):

```ts
const DISPLAY = {
  modern:    { family: 'var(--font-archivo)',        weight: 800, stretch: '78%',  tracking: '-0.012em', scale: 1,    leading: 0.95 },
  editorial: { family: 'var(--font-young-serif)',    weight: 400, stretch: '100%', tracking: '-0.02em',  scale: 0.94, leading: 1 },
  technical: { family: 'var(--font-science-gothic)', weight: 700, stretch: '112%', tracking: '0',        scale: 0.78, leading: 1 },
} // → --fs-font-display, --fs-display-weight/-stretch/-tracking/-scale/-leading
const RADIUS = { sharp: ['0', '0'], balanced: ['0.5rem', '0.375rem'], soft: ['1rem', '0.625rem'] } // → --fs-radius (surfaces), --fs-radius-control
const SECTION_Y = { cinematic: 'clamp(4.5rem, 9vw, 8rem)', compact: 'clamp(2.75rem, 5vw, 4.5rem)' }
```

`--fs-font-body` goes away: body text is always `var(--font-body)`. If `font-stretch` doesn't reach the `wdth` axis through next/font's `@font-face`, use `font-variation-settings: 'wdth' N` instead. This is a check at implementation time, not a design change.

**Portal type scale.** Root is 16 px. The ratio is about 1.25 for text, with display jumps. The measure keeps lines under 80 characters.

| Role | Face | Size | Leading | Weight | Tracking | Measure |
|---|---|---|---|---|---|---|
| Hero title (landing h1) | display | `clamp(2.75rem, 1.5rem + 5vw, 6rem) × scale` | voice | voice | voice | max 12em |
| Section title (landing h2) | display | `clamp(1.875rem, 1.3rem + 1.9vw, 3rem) × scale` | 1.05 | voice | voice | 20em |
| Ops page title (h1) | display | `clamp(2.25rem, 1.8rem + 1.5vw, 3.25rem) × scale` | 1.05 | voice | voice | — |
| Entry title (patch note, issue, feature) | Atkinson | 1.25rem | 1.3 | 700 | 0 | — |
| Lead | Atkinson | 1.1875rem | 1.55 | 400 | 0 | 36em |
| Body | Atkinson | 1.0625rem | 1.6 | 400 | 0 | 68ch |
| Meta, labels, nav | Atkinson | 0.875–0.9375rem | 1.45 | 500–600 | 0.005em | — |
| Tally (vote count), version | Atkinson, `tabular-nums` | 1.75rem / 1rem | 1 | 700 | 0 | — |

Numerals always use the body face. In the mockup, Young Serif's old-style `1` read as `I` in the vote tally.

**Critwire type scale:**

| Role | Face | Size | Leading | Details |
|---|---|---|---|---|
| Hero h1 | Anybody, wdth 112 (100 below 640 px), w800 | `clamp(2.5rem, 1rem + 5vw, 5.5rem)` | 0.95 | tracking −0.015em, max 22ch |
| h2 | Anybody, wdth 108, w750 | `clamp(1.75rem, 1.2rem + 1.6vw, 2.625rem)` | 1.05 | |
| List term | Anybody, wdth 100, w700 | 1.375rem | 1.2 | |
| Lede | Atkinson | 1.3125rem | 1.5 | 34em |
| Body | Atkinson | 1.125rem | 1.6 | 62ch |
| Loop stage name | Atkinson 700, graphite | 0.9375rem | — | |
| Loop value | Atkinson | 1.25rem | 1.35 | |

No text is uppercase anywhere. The wordmark "Critwire" is Anybody wdth 130, w800.

#### 5. Layout

**Alignment everywhere:** left-aligned and ragged right. Centring is used only for the studio-chosen `centeredCinematic` and `trailerBackground` hero variants, the community banner and the 404s. Tallies are right-aligned tabular numerals, so digits line up.

- **Portal shell:** `min(1180px, 100% − 2 × clamp(1rem, 4vw, 2.5rem))`.
- **Ops reading column:** 46rem for detail pages and forms, 60rem for lists.

**Critwire `/`.** One yellow slip carries the headline and the report-to-fix loop; everything after it is ink on paper. The header is transparent, 4.5rem tall, in normal flow. The home hero pulls up under it with `margin-top: calc(-1 * var(--cw-header-h))`, so `AdminBar` still sits above everything.

```
1440                                                              390
┌ slip #F6D33C ─────────────────────────────────────────────┐     ┌ slip ───────────────────┐
│ Critwire                          Demo portal    Sign in   │     │ Critwire         Sign in │
│                                                            │     │ A public home for        │
│ A public home for your game’s patch notes,                 │     │ your game’s patch        │
│ known issues and bug reports.        (h1, 3 lines)         │     │ notes, known issues      │
│                                                            │     │ and bug reports.         │
│ Critwire gives your studio one │ ○ A player reports it     │     │ lede…                    │
│ hosted site where players see… │ │ Clue trail disappears…  │     │ [ See a live portal    ] │
│ [See a live portal]  Sign in   │ ○ You publish it          │     │ ○ A player reports it    │
│                                │ │ Reported                │     │ │ …                      │
│                                │ ◐ Players vote it up      │     │ ● You ship the fix       │
│                                │ │ 23 votes, Investigating │     └──────────────────────────┘
│                                │ ● You ship the fix        │     paper: What players get
│                                │   Fixed in v0.1.1 …       │     (term above description)
└────────────────────────────────────────────────────────────┘     ink footer, stacked
 paper
│ What players get on    │ Patch notes      Every update, newest first, with…   │
│ your portal (h2,       │                  Critter Connect’s patch notes (link) │
│ sticky, 1/3)           │ Known issues     …  (4 rows: patch notes, known       │
│                        │ Bug reports      …   issues, bug reports, your game’s │
│                        │ Your game’s site …   site; each links into the demo)  │
 ink footer: Critwire          Demo portal   Sign in            © 2026 Critwire
```

- **"What players get" structure:** a `<dl>`, not a card grid.
- **What's left out:** a pricing section, because billing isn't built and promising custom domains would be false, and a "what your studio does" section, because the loop already says it.
- **Other marketing pages:** `[slug]` CMS pages and the marketing 404 use paper, the same header and footer, an Anybody h1 and a 62ch prose column. The 404 reads: a large "404", "There’s no page at this address.", then "Go to the home page".

**Portal landing.** The studio's key art runs untouched under a solid nav. The game's title sits on a plate of page colour cut into the art's lower-left corner, with the game's live build facts beneath. This is the portal's one loud element.

```
1440                                                                 390
┌ nav: solid --fs-bg, sticky, 1px --fs-border ───────────────────┐   ┌ [logo] Critter Co… [Begin expedition] ┐
│ [logo] Critter Connect   Field notes Field board Send report   │   │ Field notes  Field board  Send rep ›  │ ← scroll row
│                          Contact            [Begin expedition] │   ├───────────────────────────────────────┤
├────────────────────────────────────────────────────────────────┤   │ key art 16:10, untouched              │
│ key art, full bleed, ~62vh, untouched (no scrim)               │   │                                       │
│                                                                │   │┌─────────────────────────────────┐    │
│┌──────────────────────────────────────┐                        │   ││ plate (bg), right gutter 1.25rem│    │
││ plate: --fs-bg, top-right corner =   │                        │   │└ A field expedition built on…    ┘    │
││ --fs-radius, width min(58rem, 64%)   │ art continues ────────┘   │ Every clue earns its place in the     │
││ A field expedition built on evidence │ (studio eyebrow: plain, muted) │ binder.                        │
││ Every clue earns its place           │                            │ tagline…                              │
││ in the binder.  (display h1)         │                            │ [Begin expedition]                    │
││ Track real places, decode… (lead)    │                            │ [Check the field board]               │
││ [Begin expedition] [Check the field board]                        │ Early access  Version 0.1.0           │
│└──────────────────────────────────────┘                            │ Windows, Steam Deck                   │
│  Early access    Version 0.1.0    Windows, Steam Deck  ← build line (facts from project.availability)
```

- **Hero variants** (the enum is unchanged):
  - `leftEditorial`: as drawn.
  - `centeredCinematic` and `trailerBackground`: the plate is centred on the art's bottom edge. `trailerBackground` adds "Watch the trailer".
  - `split`: text left, framed art right at 4:3, no overlap.
  - No art: no plate. The title runs at full hero scale on `bg`; this is the derived-default first run.
- **The build line** replaces the `facts.join(' · ')` eyebrow in `Availability.tsx:40`, so the facts move rather than duplicate. A shared `availabilityFacts(project)` helper feeds it. `Availability` then renders only when there are platforms or a note.
- **Sections below the hero are calm.** They use one reading rhythm (`--fs-section-y`), display h2s, and no eyebrows:
  - **Availability:** "Where to play" as a list of rows (platform, label, link on the platform name).
  - **Features:** the four variants, flat with no shadows. Cards appear only where they carry media.
  - **Gallery:** captions go below the images.
  - **Adaptive:** kind headings only.
  - **Latest update:** version and date in a left column, then the linked h3 title, the summary, and "All patch notes".
  - **Known issues:** rows of status marker, title, `▲ n` and the status label, then "See all known issues".
  - **Community and final CTA:** the art becomes a 21:9 band with the text block *below* it, never over it.
  - **Mobile:** everything stacks into one column.

**Ops pages** (patch notes, issues, report, contact). One left-aligned reading column under the same nav: the page title, one line of purpose, then the list or form, with numbers in a fixed left column.

```
Patch notes (1440)                                       Issues list (1440)
Patch notes                                  RSS         Known issues                          [Report a bug]
Every update to Critter Connect, newest first.           Bugs the Critter Connect team knows about. Vote on the ones that affect you.
─────────────────────────────────────────────            [Search issues…] [All categories▾] [Most upvoted▾]  [Board view]
v0.1.0    Sep 26, 2026                                   ──────────────────────────────────────────────────────────
          Field binder launch          (h2 link)          23 │ Clue trail disappears after fast travel   (h2 link)
          The field binder ships with discovery…        votes│ ◐ Investigating   Gameplay   Pinned
─────────────────────────────────────────────                │ Fast-traveling from the marsh camp…
Newer updates      Page 1 of 2      Older updates         ───┼──────────────────────────────────────────────────
                                                           3 │ Discovery card flickers when opened quickly
390: version sits above the date and title.              390: tally column 3rem; filters wrap: search full width,
                                                              then the two selects, then the toggle.

Issue board: horizontally scrolling 16rem columns with snap. Each column is <section aria-labelledby>
with an h2 status name, marker and count; cards hold the title link, ▲ n and a Pinned tag. Empty column: "None".

Issue detail (46rem)                                     Report a bug / Contact (46rem)
All known issues                                         Report a bug
◐ Investigating   Visual   Pinned                        Tell the Critter Connect team what went wrong. …
Discovery card flickers when opened quickly (h1)          Check the known issues first: if your bug is there, vote on it.
Rapidly opening a new discovery card… (lead)             ┌ surface panel ─────────────────────────────┐
[▲ Upvote  3]  One vote per browser. Select it again     │ Title                                      │
               to take your vote back.                   │ What happened?   (hint below the field)    │
┌ aside (surface) ◆ The studio needs more information ┐   │ Category ▾                                 │
│ Which save slot were you on?                        │   │ Email (optional)   | Platform (optional)   │
└─────────────────────────────────────────────────────┘   │ Game version (optional)                    │
details (prose, 68ch)                                     │ Turnstile           [Send report]          │
                                                          └────────────────────────────────────────────┘
```

- **Dividers** separate items of the same list only; there are no section rules.
- **Status shape vocabulary**, one component (`IssueStatus`), each shape always beside the status text:
  - ○ ring, `muted-fg`: Reported, Closed.
  - ◐ half, `accent`: Investigating, Planned.
  - ◆ diamond, `warning`: Needs More Info, Workaround Available.
  - ● dot, `success`: Fixed.
  - The same vocabulary appears in Critwire's hero loop.

#### 6. Principles (what makes each surface itself)

- **Critwire:**
  - Show the loop (a real report becoming a shipped fix), not adjectives.
  - One loud colour field; everything else ink on paper.
  - Type does the shouting (Anybody, wide).
  - Plain claims only about what's built.
- **Portal:**
  - The studio's art and words lead, and the frame recedes. Art is never tinted and never carries text.
  - Loud once (the title plate). Ops pages are calm, fast and dense enough to scan.
  - One chrome and one theme on every portal page.
  - Status has a shape, not only a colour.
  - The token contract (§2) is how "any valid theme" is guaranteed; it isn't just hoped for.

#### 7. Motion and quality floor

- **Critwire, one moment:** on load, the wire draws down through the loop over about 2.2 s. Each stage fades in as the line reaches its marker (0, 0.6, 1.2, 1.8 s), the third marker fills halfway and the fourth fully. It's CSS only; the marketing page ships no JS.
- **Portal landing, one moment:** the title plate settles into the art (`translateY(1.25rem) → 0`, 700 ms, `cubic-bezier(.2,.7,.2,1)`). Only transform animates, so the LCP text paints at the first frame.
- **Ops pages:** no load motion.
- **Action feedback (the only other motion):**
  - Vote: the count rolls (180 ms), an `aria-hidden` "+1" or "−1" rises and fades (450 ms), and the pressed fill transitions (150 ms).
  - Buttons: `:active` scale 0.98.
- **Reduced motion:** `prefers-reduced-motion: reduce` and theme `motion: 'off'` disable all of it and show the final state (existing rules in the template, mirrored in marketing CSS).
- **Down to 390 px:**
  - The nav's link row scrolls horizontally, with no hamburger, so the four ops links players come for stay visible.
  - The name truncates.
  - The hero plate keeps a 1.25rem right gutter so the stepped edge still reads.
  - The issue filters wrap.
  - The board scrolls sideways.
  - Form fields go to one column.
  - Tap targets are at least 44 px.
- **Focus:** the two-tone ring from §2 on every interactive element in the portal. In marketing it's a 2px Ink outline with offset (yellow on the ink footer).
- **Contrast:** guaranteed by the schema plus the §2 contract. The status colours and `border` never carry required information.
- **Semantics:**
  - Labels for search and selects (visually hidden).
  - `aria-current` in the nav.
  - Board columns as labelled regions.
  - Vote glyph `▲` `aria-hidden`, with visually hidden " votes".
  - Hints linked by `aria-describedby`, outside the `<label>`, so label names stay stable for E2E.
  - One `<aside>` per issue detail (E2E reads `article aside`).

#### 8. UI copy and E2E impact

All copy is sentence case and active voice. Errors say what happened and what to do. Empty states invite an action. Status and category names stay as they are in `collections/options.ts`: the studio triages with the same words in the admin (one name per thing across the flow), and the admin is out of scope.

| Where | Now | New |
|---|---|---|
| `DEFAULT_ACTION_LABELS` and footer | Get the Game, Play the Demo, Join the Discord, Known Issues, Report a Bug, Patch Notes | Get the game, Play the demo, Join the Discord, Known issues, Report a bug, Patch notes |
| Template default headings | Core Features, Watch the Trailer, Join the Community, Status Board Highlights, "A World Worth Saving", other kind headings, all eyebrows | Features, Watch the trailer, Join the community, Pinned issues, Story (and plain kind names); eyebrows removed |
| Derived final CTA | "Ready to jump in?" | `null` heading, so the renderer's "Play {name}" is used |
| Landing links | Full issue board →, All patch notes → | See all known issues, All patch notes |
| Patch notes | Update Log / Field Notes; "No field notes published yet…"; ← Newer, Older → | "Patch notes" and "Every update to {game}, newest first."; empty: "{game} hasn’t published any patch notes yet. Follow the RSS feed to hear about the first one."; Newer updates, Older updates |
| Back links | ← All patch notes, ← All issues | All patch notes, All known issues |
| Issues | Player Signals / Field Board; "No tracks match…" | "Known issues" and "Bugs the {game} team knows about. Vote on the ones that affect you."; no match: "No issues match these filters." + "Clear filters"; none at all: "No known issues right now. Found a bug? Report it." |
| Pinned | 📌 | "Pinned" tag in the meta row, outside the title link |
| Vote | Vote failed. | Helper "One vote per browser. Select it again to take your vote back."; network fallback "Your vote didn’t count. Reload the page and try again." (server messages still shown) |
| Report | Send Field Report; Field notes; Track type; "Field report received. The team will review the trail."; "The field report could not be sent…" | Report a bug; What happened?; Category; "Report sent. The {game} team reviews every report; confirmed bugs appear on the known issues page."; "Your report wasn’t sent, so nothing reached the studio. Check the fields, complete the verification and send it again." |
| Contact | Studio Route; "…The team has the signal."; "Contact route is not configured" | Intro "Questions, feedback or press requests go straight to the {game} team. For bugs, use the report form."; "Message sent. The {game} team will reply by email if you left an address."; "{game} hasn’t set up a contact form yet" + "Reach the team through the links in the footer." |
| Tally | Invalid-URL admin instructions; "…managed in Tally, not Critwire." | "This form isn’t available right now."; "This form is hosted by Tally." |
| 404s | "This page could not be found." / Go home | "There’s no page at this address." / Go to the home page (h1 stays "404") |
| Page titles | Field Notes — {game}, Field Board — {game}, Send Field Report — {game} | {game} patch notes, {game} known issues, Report a bug in {game}. Detail titles and the RSS title are unchanged. |
| CC seed | Title Case labels; the note "v0.1.0 - Field Binder Launch" repeats the version the UI already shows | Field notes, Field board, Send report, Begin expedition, Check the field board, Send a field report, See known issues, Read the field notes; note title "Field binder launch" |

E2E selectors that change. Each keeps the assertion's meaning; Playwright name, text and label matching is case-insensitive substring unless `exact`.

| Spec:line | Now | New | Why |
|---|---|---|---|
| portal-landing:116-118 | `'Patch Notes' / 'Known Issues' / 'Report a Bug'`, `exact: true` | `'Patch notes' / 'Known issues' / 'Report a bug'` | Sentence-case labels |
| patch-notes:107 | `'Older →'` | `'Older updates'` | Arrow removed |
| issues-voting:169 | `div.w-64` with `:scope > div:first-child` | `page.getByRole('region', { name: label, exact: true })` | Columns become labelled sections |
| issues-voting:173 | `` [`📌 ${pinned.title}`] `` | `[pinned.title]`, plus `expect(column('Investigating')).toContainText('Pinned')` | The marker moved out of the link; the "marked pinned" part of the assertion is kept |
| issues-voting:293 | `span.font-mono` | `.fs-vote-count` | Count is no longer mono |
| reports-contact:65, 66, 72 | `'Field notes'`, `'Track type'`, `'Field report received.'` | `'What happened'`, `'Category'`, `'Report sent.'` | Copy |
| reports-contact:319 | `'Contact route is not configured'` | `'set up a contact form yet'` | Copy |

Still valid, and constraints the implementation must keep:
- `'Get the Game'` still matches case-insensitively; it may be aligned to 'Get the game'.
- `'RSS'` exact, `'Page 1 of 2'`, Board/List view, combobox order (category, then sort), and the `Search issues…` placeholder.
- The vote button name `/^Upvoted?\s*\d+$/`. The "+1" ghost must be `aria-hidden`.
- Send report, Send message, "Message sent.", "Open report form", "Open contact page".
- All the other labels, "The studio needs more information", "Workaround", and `'v2.1.0 — Harbor hotfix'` (kept on purpose, see the review).
- The h1 `404`.
- `.fs-hero`, `.fs-btn-primary` and `section.fs-hero img`.
- Section ids and order: the hero keeps no `aria-labelledby`.
- A single `a[href="/g/<slug>"] img`: the footer never links home with an image.
- One `banner` containing the project name.
- `article .payload-richtext`, and a single `article aside`.
- Known-issue `li` text starts with the title, contains `▲ n` only when n > 0, and keeps the status label inside the link.
- Issue list and board links contain only the title.

**One new E2E step, written first:** in S2.4, warm `/g/<slug>/patch-notes`, publish the accent `#f59e0b`, then `eventually` that page's `.fs-root` has `--fs-accent` equal to `#f59e0b`. This proves ops pages follow the theme and that the widened revalidation reaches cached pages.

#### 9. Migration consequence

- **No new tokens,** so there are no new columns and nothing to change in parity, types or the AI schema.
- **New defaults need a migration.** Changing `DEFAULT_THEME_COLORS` changes the Payload `defaultValue` of ten colour fields, which are Postgres column defaults on `game_pages` and `_game_pages_v`. So add one generated migration, `pnpm payload migrate:create design_default_theme`: twenty `ALTER COLUMN … SET DEFAULT` statements, plus the snapshot. Commit it.
- **No data is rewritten.** Existing rows keep their stored colours: a studio's saved page is its choice. `pnpm seed:critter-connect` re-applies the new CC theme.

#### 10. File map

| File | Change |
|---|---|
| `src/fonts.ts` (new) | Atkinson Hyperlegible Next → `--font-body` |
| `src/app/(frontend)/fonts.ts` (new) | Anybody → `--font-critwire` |
| `src/site-templates/flagship-game-v1/fonts.ts` (new) | Archivo, Young Serif, Science Gothic → `--font-archivo`, `--font-young-serif`, `--font-science-gothic`. The template owns its fonts; `themeStyle` references the same variable names. |
| `src/app/(frontend)/layout.tsx` | Font classes. Remove `InitTheme`, `Providers` and the Geist fonts. Header and footer stay. |
| `src/app/(public)/layout.tsx` | Font classes. Remove Geist and `data-theme="dark"`. |
| `src/app/(frontend)/globals.css` | Shared Tailwind entry only: Tailwind, the typography plugin, `@theme` (breakpoints, `--font-sans: var(--font-body)`), base, `.container`, and `@import './marketing.css' layer(components); @import './portal.css' layer(components);`. Delete `--ds-*`, `cc-*`, `glass-*`, `glow-*`, the dark palette, chart and sidebar tokens, and the opacity hack. |
| `src/app/(frontend)/marketing.css` (new) | Critwire tokens (plus the shadcn variable values), `cw-*` classes, the loop animation, and focus styles. Prose colour mapping: `.cw-prose` sets the `--tw-prose-*` variables to Ink and Graphite (the marketing counterpart of `.fs-prose`). |
| `src/app/(frontend)/portal.css` | Renamed from `flagship.css`; now the whole portal: `--fs-*` consumers, the §2 contract, plate hero, lists, board, forms, status markers, `.fs-prose`, focus, motion. |
| `tailwind.config.mjs` | Drop the dead `var(--text)` prose mapping. |
| `src/site-templates/flagship-game-v1/schema/theme.ts` | New `DEFAULT_THEME_COLORS` only. |
| `.../render/themeStyle.ts` | Voice, radius and density tables (§4). |
| `.../defaults.ts` | Button-text candidates from the palette; `finalCta.heading: null`. |
| `.../actions.ts` | Sentence-case `DEFAULT_ACTION_LABELS`. |
| `.../render/SiteFrame.tsx` (new), `SiteNav.tsx`, `SiteNavLinks.tsx` (new, client), `SiteFooter.tsx`, `FlagshipSite.tsx`, `ui.tsx` | One frame, one nav, one footer. `SectionHeader` loses `eyebrow`. |
| `.../render/NavShell.tsx` | Delete. |
| `.../render/slots/*.tsx` | Plate hero and build line; the other slots per §5; `KnownIssues` uses `IssueStatus`. |
| `src/lib/game-portal/landingPage.ts` (new) | See §1. |
| `app/(public)/g/[gameSlug]/page.tsx` | Uses `landingPage.ts`. |
| `src/components/game/PortalChrome.tsx` | `SiteFrame` via `getPortalSiteConfig`. |
| `src/collections/GamePages/hooks/revalidateGamePage.ts` | `revalidatePath(PORTAL_ROUTE, 'layout')` in both hooks. |
| `src/components/game/IssueStatus.tsx` | Replaces `IssueStatusBadge.tsx`: tone map, shape marker, label; keeps the `issueStatusLabel` export. |
| `src/components/game/VoteCount.tsx`, `format.ts` (`formatDate` replaces `formatPatchDate` and `formatSiteDate`), `PageHead.tsx`, `FormField.tsx`, `FormNotice.tsx` (all new) | Shared portal primitives (F8). |
| `PatchNotesFeed.tsx`, `IssueFilters.tsx`, `VoteButton.tsx`, `TallyEmbed.tsx`, `GameButtons.tsx`, the ops pages under `(ops)/`, `(public)/not-found.tsx` | `fs-*` classes and §8 copy. |
| `src/blocks/game/*` (legacy blocks) | Mechanical port from `cc-*` to `fs-*` classes; no redesign. |
| `src/components/RichText/index.tsx` | Drop `dark:prose-invert`. Callers add `fs-prose` or `cw-prose`. |
| `src/app/(frontend)/page.tsx` | Renders `MarketingHome`. |
| `src/components/marketing/{MarketingHome,IssueLoop}.tsx` (new) | Server components. |
| `src/Header/Component.tsx`, `src/Footer/Component.tsx` | Server components with the text wordmark. |
| `(frontend)/[slug]/page.tsx`, `(frontend)/not-found.tsx`, `heros/*`, `blocks/{Content,CallToAction,MediaBlock}` | Restyled with tokens. `HighImpact` becomes a server component. The home fallback is removed. |
| Delete | `endpoints/home-static.ts`, `[slug]/page.client.tsx`, `providers/**`, `components/Logo/Logo.tsx`, the `geist` dependency |
| `src/seed/critterConnect.ts` | CC theme, `accentColor` and sentence-case labels (§3, §8). |
| `src/migrations/*_design_default_theme.*` (new) | §9 |
| Tests | Selector updates and the new step (§8). |
| Screenshot harness (new) | `playwright.screenshots.config.ts`, `tests/screenshots/design.shots.ts`, and a `screenshots` script in `package.json` (§11). `requireDisposableDatabase` moves out of `playwright.config.ts` into `tests/e2e/support/env.ts` so both configs share it. |

The ops pages keep their data calls, caching exports and access-controlled queries as they are; the redesign touches presentation only.

#### 11. Screenshot plan

**Harness:** a reusable, committed Playwright config and spec, not a one-off. The design critique and later passes rerun it.

- **Config:** `playwright.screenshots.config.ts` reuses the E2E server command (`pnpm e2e:server`: `migrate:fresh` on the disposable `_e2e` database, `SKIP_BUILD_STATIC_GENERATION=1 next build`, `next start`). It runs on port 3200 with `CRON_SECRET` set, `RATE_LIMIT_OPTIONAL=1`, the Turnstile always-pass test key, and every external service blank, as in the E2E config.
- **Projects:** `desktop` (1440×900) and `mobile` (390×844, touch). `reducedMotion: 'reduce'`, so captures are deterministic final states. Captures wait for `document.fonts.ready` and take full-page screenshots.
- **Command:** `SHOTS_SET=before|after SHOTS_DIR=/srv/critter-ai/agent-state/missions/design-pass/screenshots pnpm screenshots`. `testMatch: /\.shots\.ts$/`, so the E2E suite never picks it up. It drops the same `_e2e` database, so it never runs at the same time as `pnpm test:e2e`.

**Fixtures,** created through REST only, so before and after share identical data:
1. Register the first user (super admin) and create one tenant.
2. `POST /api/seed/critter-connect` with the bearer `CRON_SECRET`. The server's own seed runs, so the before run uses the old CC theme and the after run the new one.
3. Add fixtures:
   - A patch note "v0.1.1".
   - Four more public CC issues: Investigating and pinned; Needs More Info with text; Workaround Available with text; Fixed with `fixedInPatchNote` pointing at v0.1.1.
   - A few votes through `POST /api/vote` from fresh request contexts (7, 4, 2, 1). The counter stays owned by the IssueVote hooks.
4. A bare project (name and description only, no page, no art), to show the derived-default first run.

**Themes:** before each theme set, fetch CC's landing (`depth=0`), replace `site.theme` and PATCH it published. Then poll the landing until `.fs-root`'s `--fs-accent` changes.
- **`default`:** all ten colours `''` and the selects `null`. `normalizeSiteInput` treats partial or empty colours as unset, so each build renders *its own* default (old navy/cyan before, Slate & signal after).
- **`critter-connect`:** re-run the seed.
- **`riso`:** the §3 values.

**Pages per theme, at both widths:**
- Landing
- Patch notes list
- Patch note detail
- Issues list
- Issues with no match (`?q=zzzz`)
- Board (`?view=board`)
- Issue detail, one with a callout and one plain
- Report, and report with `?error=1`
- Contact, and contact with `?submitted=1`
- Portal 404
- A focus shot: the report form with the Title field focused, and the landing's primary CTA reached by keyboard `Tab`

Also captured, once per width: `/`, the marketing 404, and the bare project's landing and patch notes (default only).

**Output:** `<SHOTS_DIR>/<set>/<theme>--<page>--<1440|390>.png`. An `afterAll` rewrites `<SHOTS_DIR>/index.html`: static HTML grouped by theme, then page; each row shows the label, then before and after images side by side, linking to full size, with "not captured" when a side is missing.

**Before:** capture from the current tree before the first design change; only harness files are added. A detached worktree at `669376c` is the fallback. The harness talks HTTP only, so it can point at any build.

### Review against the brief (what the first draft got wrong, and what changed)

Before settling the plan, it was checked against a generic "portal for indie games" prompt, the skill's five clusters and its typographic tells:

1. **Cream, serif and terracotta.** My first Critwire idea, the addendum slip, started as warm cream paper with a serif, which is cluster 1. I changed it to saturated slip yellow, indigo ink and a *cool* paper, with no serif in Critwire's identity. The serif exists only as a studio's `editorial` choice.
2. **Near-black with one bright accent.**
   - The existing default, the CC seed and the ops layer are all cluster 2. My first new default was slate with a "lamp" yellow accent: still near-black plus one bright accent, and it collided with CC's amber.
   - I changed it: the default's background is lifted to a visibly blue-violet slate, the accent is a pale lilac, and CC takes amber from its own art.
   - Dark stays the default on purpose: it hosts game key art, and `deriveAccentColors` (with E2E S2.3) is anchored to a dark background.
3. **Broadsheet hairlines.**
   - My first changelog draft had a rule under every row, a rule between sections and a table-like version column.
   - Now dividers separate items of one list only. Grouping is done by spacing, and corner radius comes from the shape token, not a forced zero.
   - The version column stays, because patch notes really are a sequence.
4. **The SaaS-card kit.**
   - The current portal is exactly this: `cc-panel` gradients, `rgba(0,0,0,.25)` shadows, and every section boxed.
   - My first "what players get" draft was four identical icon cards.
   - Now: flat surfaces, no shadows, no gradient washes, and lists as lists (issues, patch notes, platforms). Cards appear only where media lives (features `cardGrid`, board cards). Two radii encode hierarchy (surface and control), and the marketing section is a `<dl>` with links into the live demo.
5. **Template chrome and typographic tells:**
   - **All-caps tracked eyebrows** (`.fs-eyebrow`, `.cc-kicker`, "UPDATE LOG", "TRANSPARENCY", the `KIND_LABELS` eyebrows): removed. The studio-authored hero eyebrow is content, so it stays, as a plain muted sentence-case line.
   - **Unnecessary labels above content:** removed. The loop's stage names stay because the content is a real sequence; they use status shapes rather than 01/02/03.
   - **Middle-dot meta strings** (`facts.join(' · ')`): the facts become separate items in the build line. Titles use no dots.
   - **"WORD — fragment":** page titles are rewritten without it. The fixed-in link "v2.1.0 — Harbor hotfix" stays: it's a version joined to a release name (a data join players know from changelogs), not a decorative label, and E2E pins it.
   - **`#111` for black:** `bg-(--game-accent,#111)` and the `#0b1016` candidate are replaced by theme tokens.
   - **Mono for small data labels:** Geist Mono version chips, vote counts and kickers are replaced by the body face's tabular figures.
   - **`→` and `←` on links:** all removed ("All patch notes", "Older updates", "See all known issues").
   - **One accented word in a headline:** I was tempted to put "known issues" in the Critwire h1 in ink-on-yellow reverse. Not done; the headline is uniform.
6. **Hero defaults.**
   - My first portal hero was the genre default: full-bleed art, a gradient scrim, text over the art.
   - The Riso-lime mockup showed muddy art, an unreadable overlay nav, and contrast that can't be proven.
   - It became the title plate on untouched art, with a solid nav.
   - The "big number, small label, gradient" treatment was never used. Critwire's hero shows the product's loop, not a mockup in a browser frame.
7. **Typeface defaults.**
   - **Portal `modern`:** my first choice was Bricolage Grotesque, currently the indie-maker default. It became Archivo semi-condensed, which has a game-box title voice.
   - **`technical`:** was Geist Mono or Martian Mono headlines, which read as a dev tool. It became Science Gothic wide, an instrument or HUD voice that matches Critter Connect's art.
   - **Numerals:** my first draft set tallies in the display face; Young Serif's old-style `1` read as `I`, so numerals use the body face.
8. **Motion:** there are no per-section fade-ups. There's one moment per surface, plus feedback to the player's own actions.

### Rejected alternatives

- **Add new theme tokens (type or radius):** `typography`, `shape`, `density` and `motion` already exist. New ones would mean parity, AI-schema and migration churn for no visual gain.
- **Tighten Zod to validate status and border colours:** stored configs would start failing at render. The §2 contract makes those tokens decorative instead.
- **`next/font/local` with vendored woff2:** hermetic, but it needs subset tooling and five licence bundles. Google is reachable. Switch only if a build fails to fetch fonts.
- **A light default theme:** it tints dark key art, and it would invert the meaning of the derived-accent check and E2E S2.3.
- **Keep full-bleed art with a gradient scrim:** it failed the light-theme mockup, and contrast over art can't be guaranteed.
- **Keep `/` CMS-driven (Pages hero and blocks):** the generic heroes can't express the loop, and no home page is authored; `homeStatic` is filler.
- **Rename portal tokens to shadcn variables:** churn across the template and the E2E class hooks, with no user-visible gain.
- **A hamburger menu on mobile:** it hides the four ops links players come for. The scroll row needs no JS.
- **Ops page titles taken from the studio's nav labels:** couples the pages to nav config. Titles stay plain; the studio's vocabulary lives in the nav.
- **A separate Tailwind entry per surface:** two builds. One entry with prefixed, layered files is enough.
- **A data migration rewriting old-default colours:** it would silently restyle studios' saved pages.
- **Add votes and extra issues to the committed seed:** that's screenshot fixture data, and it belongs to the harness so before and after share it.

### Answers to the brief's questions

- **Fonts:** see §4. They're served through `next/font/google` (build host checked; no runtime requests). All are OFL 1.1.
- **Studio type token:** yes, through the existing `typography` token, with a new mapping and no schema change.
- **Migration:** one column-default migration, and no data migration (§9).
- **Where the boldness goes:** Critwire's yellow slip with the loop, and the portal's title plate. Everything operational is calm (§5).
- **Motion:** one moment per surface, feedback motion, reduced motion and `motion: 'off'` honoured (§7).
- **Quality floor:** see §7. The focus ring is derived from `fg` and `bg`, the only pair guaranteed at 4.5:1 against both page and surface.
- **Copy and E2E impact:** see §8.
- **File map:** see §10.
- **Screenshots:** see §11. The harness is reusable and committed.

### Risks for the reviewers

1. **Google Fonts is fetched on every build,** including each E2E run and the Hetzner Docker build. Next retries, but an outage fails the build. The fallback is `next/font/local`.
2. **Any landing publish now revalidates every portal's pages.** The GameProject hook already does the same, and it's fine at this scale.
3. **Moving surface CSS into `@layer components` changes precedence.** Utilities that were silently ignored (FinalCTA's `text-4xl`) will start to apply. The screenshots are the check.
4. **Existing saved pages keep their stored old-default navy/cyan** until the studio re-themes them. This is deliberate.
5. **`/` stops rendering a CMS `home` Page.** If production has one, it's only reachable at `/home`.
   - "See a live portal" points at `/g/critter-connect`, which exists only if the demo is seeded in production.
   - The lead should add one handoff item, blocking nothing: confirm the demo is seeded in prod, say whether a CMS home page exists, and name a contact destination if prospects should be able to reach the owner. There's no signup or contact route today, so the only marketing actions are "See a live portal" and "Sign in".
6. **Sentry may get noise.** `getPortalSiteConfig` reports stored-config drift, and the issues pages are dynamic, so a drifted config reports on every view until it's fixed (fail loud, by the owner's rules).
7. **`font-stretch` on the `wdth` axis through next/font** needs checking at build time; the fallback is `font-variation-settings`.
8. **E2E:** nine selector changes across seven table rows, plus one new step. Reviewers should confirm that the pinned-board update (issues-voting:173) keeps its meaning.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code at `9d2e8c4`: every contrast ratio in §3 recomputed (all six schema pairs pass for Slate & signal, Night canopy and Riso lime; marketing ink/yellow 10.37, graphite/yellow 5.55; white and `#123456` against `#1F2030` are 16.06 and 1.26, so S2.3 keeps its meaning); the five families exist in Next 16.2.6's `font-data.json` with the axes and subsets claimed; `siteThemeSchema` gains no keys, so the parity test, the AI schema and types are untouched; the ten colour defaults are Postgres column defaults on `game_pages` and `_game_pages_v` (10 + 10 statements, as §9 says); `PortalChrome`, `revalidateGamePage.ts`, `SiteNav`/`SiteFooter`, `flagship.css:44-52,128-133,158-190,255-263` and the cited E2E lines read as described. The design avoids the skill's five clusters and its typographic tells, spends boldness in exactly the two places the brief names, keeps the ops pages calm, and the §2 token contract is a genuine guarantee, not a hope (focus ring from `fg`/`bg`, accent never as text, text never over art). The screenshot harness meets the Definition of done (three themes, 1440/390, before/after index, Playwright against a production build, reduced motion for determinism). No feature or data-model change beyond re-pointed defaults. The four items below are places where the plan contradicts its own E2E constraints or would produce a defect as written.

MUST-FIX:
1. **Prose colour mapping (F5, §10 `tailwind.config.mjs`, `.fs-prose`/`.cw-prose`).** The plan calls the `--tw-prose-body: var(--text)` mapping "dead" and deletes it, then sets `--tw-prose-*` from `.fs-prose` inside `@layer components`. Both halves are wrong. `var(--text)` being undefined is what makes prose text *inherit* the page colour today (invalid at computed-value time → `color: inherit`), so removing it reinstates the plugin's grey-700 body text, which fails contrast on every dark theme. And `.prose` is a utility (`@plugin` output lands in the utilities layer), so a `.fs-prose` rule in the components layer loses to `.prose`'s own `--tw-prose-*` declarations on the same element. Fix: keep the plugin-config mechanism and make it deliberate: map `--tw-prose-body/-headings/-links/-bold/-quotes/-code/-hr/-th-borders/-td-borders/-counters/-bullets` to surface-owned variables (for example `var(--prose-fg)`, `var(--prose-muted)`, `var(--prose-border)`) in `tailwind.config.mjs`, and set those variables on `.fs-root` (from `--fs-*`) and on the marketing root (ink, graphite). Drop `dark:prose-invert` as planned.
2. **Vote button name (§7 "visually hidden ' votes'" vs §8 "`/^Upvoted?\s*\d+$/` kept").** If the hidden " votes" is inside the button, its accessible name becomes "Upvote 3 votes" and issues-voting:288 fails. State explicitly: the button's content is the `aria-hidden` glyph, the "Upvote"/"Upvoted" word and the `.fs-vote-count` only; the visually hidden " votes" belongs to `VoteCount` on lists, board cards and the landing, never to `VoteButton`.
3. **Status marker must not be a text glyph.** §5 puts the marker first in the known-issues row ("status marker, title, ▲ n, label") and draws ○◐◆● as characters. Playwright's `toHaveText` uses `textContent`, which includes `aria-hidden` text, so a glyph breaks `^${title}` (issues-voting:295,334) and the "links contain only the title" constraint, and screen readers announce the glyph (the plan's own F9). Pin it: `IssueStatus` renders the marker as an empty `<span aria-hidden>` drawn with CSS (border/border-radius/clip-path), never a character, so the row's text starts with the title. Same for the ◆ in the issue-detail aside and the loop markers in `IssueLoop`.
4. **Board column accessible name (§5, §8 issues-voting:169).** The h2 is described as "status name, marker and count", but `getByRole('region', { name: label, exact: true })` needs the region's name to be the status name alone. `aria-labelledby` must point at an element containing only the status label; the count (and the CSS marker) sit outside it.

MISSED:
- The template display fonts (`flagship-game-v1/fonts.ts`) are loaded through `next/font`, whose `--font-archivo` etc. only exist where the font's `.variable` class is applied. The plan never says where. Apply all three on `.fs-root` in `SiteFrame` and on the portal 404's `.fs-root`, otherwise `themeStyle` points at undefined variables and the fallback stack renders.
- `PortalChrome`'s footer carries "Powered by Critwire" on every ops page today; `SiteFooter` (which replaces it) has no such link. Removing it is fine for white-label, but it's a product decision the plan doesn't name. Record it under Decisions.
- `revalidateGameLanding` is shared by the Issues, PatchNotes and IssueVotes hooks and must keep its `/g/<slug>` scope; only the two GamePage hooks change. The plan implies this but should say it, so nobody widens the shared helper.

SHOULD-CONSIDER:
1. Extract the GameProject hook's `revalidatePortal` (`revalidatePath(PORTAL_ROUTE, 'layout')` plus the log line) into `src/hooks/revalidateGamePortal.ts` and call it from both GamePage hooks, rather than repeating the call (DRY).
2. "Report sent. The {game} team reviews every report; confirmed bugs appear on the known issues page." promises studio behaviour the platform can't guarantee. Say only what happened: "Report sent. If the {game} team confirms it, it will appear on the known issues page."
3. `SiteFrame` applies the font variable classes and `data-fs-motion` in one place; make it the only element that ever carries `.fs-root` (the 404 included), so the motion and focus rules have one root to target.
4. In the screenshot harness, wait for the `.fs-root` `--fs-accent` poll *and* `document.fonts.ready` before each capture, and record the exact `pnpm screenshots` invocation for each set in the plan's Verification, so the artifact is reproducible by the owner.
5. Check the `font-stretch` ↔ `wdth` behaviour in the first mockup step, not at the end: Anybody at wdth 112/130 is the marketing identity, so if `font-variation-settings` is needed it changes several rules at once.

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

- 2026-09-29 05:13 UTC · Baseline: E2E db and env set up, migrations applied; tsc pass, lint 0 errors/23 warnings, int 9/9, E2E 73/73.
- 2026-09-29 05:44 UTC · Architecture: `architect` wrote the design plan (tokens, type, layouts, brief review, file map, E2E impact, screenshot harness). Added handoff H6 (prod demo seed, CMS home page, marketing contact), blocking nothing. No code changed, so no checks run.
- 2026-09-29 05:50 UTC · Fable review: `architecture-reviewer` verdict APPROVE_WITH_CHANGES, 4 MUST-FIX (prose colour mapping, vote button name, CSS-only status marker, board region name) for the Revision stage. Plan-only change, no checks needed.

## Summary
