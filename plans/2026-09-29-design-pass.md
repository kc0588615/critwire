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
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

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

Written by the `architect` on 2026-09-29, from the code at `893b149` (source identical to `669376c`). Font choices and the two hero directions were checked with throwaway Playwright mockups (Critter Connect art, all three themes) before this plan was written. The mockup results are recorded under "Review against the brief". Revised the same day for the Fable review's MUST-FIX, MISSED and SHOULD-CONSIDER items; see "Revision notes".

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
  - The typography-plugin config, which maps `--tw-prose-body/-headings` to an undefined `var(--text)` (`tailwind.config.mjs:9-10`). It's accidental but load-bearing: the invalid variable makes prose body and heading colour inherit (F5).
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
5. **Rich text assumes a dark page, and its colours work by accident.**
   - **Where:** patch-note and issue detail use `prose dark:prose-invert` (`RichText/index.tsx:39`, `patch-notes/[slug]/page.tsx:47`, `issues/[slug]/page.tsx:91`). That only works because `(public)/layout.tsx:17` hard-codes `data-theme="dark"`. Everywhere else, prose body and heading colour come from `var(--text)`, which nothing defines (`tailwind.config.mjs:9-10`). The declaration is invalid at computed-value time, so the colour inherits.
   - **What goes wrong:** once theming reaches these pages, a light studio theme gets the invert palette's gray-300 on a light page. Simply deleting the `var(--text)` mapping would bring back the plugin's gray-700 on every dark theme.
   - **Why a surface class can't fix it:** a `.fs-prose` rule doesn't work. The plugin registers `.prose` through `addComponents`, which Tailwind 4.3.2 routes to `addUtilities`. The compiled CSS confirms `.prose{--tw-prose-body:var(--text);…}` sits in `@layer utilities`, so its own `--tw-prose-*` declarations beat any components-layer rule on the same element.
   - **Standards broken:** fail fast (a colour that works by accident); separation of concerns (prose ignores the surface's tokens).
   - **Fix:**
     - Make the plugin config the one deliberate prose mapping. `tailwind.config.mjs` points every `--tw-prose-*` colour, plus size and measure, at surface-owned `--prose-*` variables, and each root sets those (§10).
     - Drop `dark:prose-invert`.
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
- The caching and revalidation architecture, access control and Zod boundaries from the architecture pass. Only the two GamePage hooks' scope widens; the shared `revalidateGameLanding` keeps its scope (§1).

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
                       = SiteRoot(.fs-root: themeStyle, font classes, motion) + skip link + SiteNav + <main> + SiteFooter
```

- **New `src/lib/game-portal/landingPage.ts`** takes code moved out of `app/(public)/g/[gameSlug]/page.tsx`:
  - `getLandingPage(projectID, draft, user?)`: the existing query, React-cached.
  - `resolveFlagshipConfig(page, project, { draft })`: the existing normalize → parse → Sentry-on-drift → derived-default block (`page.tsx:93-116`), returning `{ config, media }`.
  - `getPortalSiteConfig(project): Promise<SiteConfigV1>`: a cached query that resolves the *published* landing and returns its flagship config, or `deriveFlagshipDefault(project)` for legacy or absent pages.
  - The landing page keeps its decision tree, calling these functions (no behaviour change).
- **`PortalChrome`** becomes an async Server Component: `<SiteFrame config={await getPortalSiteConfig(project)} project={project}>`. It still wraps ops pages and legacy block landings.
- **`SiteRoot` and `SiteFrame`** (both new, in `render/SiteFrame.tsx`):
  - **`SiteRoot({ theme, children })`** is the only element that ever carries `.fs-root`. It sets `style={themeStyle(theme)}` and `data-fs-motion`. It also applies the `.variable` classes of all three template display fonts (`flagship-game-v1/fonts.ts`); next/font defines `--font-archivo`, `--font-young-serif` and `--font-science-gothic` only where that class is applied. The faces use `preload: false`, so the browser downloads only the one `--fs-font-display` references.
  - **`SiteFrame`** is `SiteRoot` plus the skip link, `SiteNav`, `<main>` and `SiteFooter`. `FlagshipSite` renders its slots inside `SiteFrame`.
  - **The portal 404** uses `SiteRoot` alone.
  - So the motion, focus and prose rules have exactly one root to target.
- **`SiteNav` and `SiteFooter`** take `{ project, nav, value }` instead of the whole render context; they only ever read `project`.
  - **Current-page links:** `SiteNavLinks`, a tiny client component using `usePathname`, sets `aria-current="page"`. It replaces `NavShell`; the nav becomes a solid bar, so there's no scroll state.
  - **Footer contents:** always the four portal pages, each labelled with the studio's nav label for that ref when one is set, otherwise `DEFAULT_ACTION_LABELS`. Then the project's external links (moved from `PortalChrome`), then legal links. The bottom row keeps the copyright and the quiet "Powered by Critwire" credit that both chromes already carry (`SiteFooter.tsx:69-72`, `PortalChrome.tsx:101-104`); see Decisions.
- **Revalidation:**
  - **Why it changes:** ops pages now render the landing's theme, nav and footer, so the two GamePage hooks must revalidate every portal page, not just the landing. They currently call `revalidateGameLanding` at `revalidateGamePage.ts:14` and `:25`. Without the change, the ISR patch-notes pages keep the old theme for up to an hour.
  - **Shared helper:** the GameProject hook's private `revalidatePortal` (`revalidateGameProject.ts:15-18`: a log line plus `revalidatePath(PORTAL_ROUTE, 'layout')`) moves to `src/hooks/revalidateGamePortal.ts` as `revalidateGamePortal(source, payload)`. The two GameProject hooks and the two GamePage hooks all call it. The GamePage change hook keeps its published or was-published condition.
  - **What stays:** `revalidateGameLanding` is unchanged and keeps its `/g/<slug>` scope. The Issues, PatchNotes and IssueVotes hooks share it, and widening it would revalidate every portal on every vote.
- **Portal 404:** `(public)/not-found.tsx` stays at the root (no leak). It renders inside `SiteRoot` with `siteThemeSchema.parse({})`, the default theme, and needs no data.

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
- **Where the `.variable` classes go:**
  - `--font-body`: on `<html>` in both root layouts.
  - `--font-critwire`: on the `(frontend)` `<html>`.
  - The three template faces: on `.fs-root` through `SiteRoot` (§1). That covers the landing, every ops page, legacy block landings and the portal 404.
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

`--fs-font-body` goes away: body text is always `var(--font-body)`.

Width is set with `font-stretch`. That was verified during revision, not assumed:
- Google's css2 response declares `font-stretch` ranges on the variable faces: `62% 125%` for Archivo, `50% 150%` for Anybody, and `50% 200%` for Science Gothic.
- next/font's loader (`@next/font/dist/google/loader.js:136-141`) only rewrites the `src` URLs, so the range reaches the self-hosted `@font-face`.
- So `font-stretch: 78%` selects `wdth` 78, and no `font-variation-settings` is needed.

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
  - **Known issues:** rows of the status marker (an empty CSS shape, see below), title, `▲ n` and the status label, all inside the link as today, then "See all known issues". Each row's text therefore starts with the title (issues-voting:299,334).
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

Issue board: horizontally scrolling 16rem columns with snap. Each column is a <section> labelled by its
status label alone (markup below); cards hold the title link, ▲ n and a Pinned tag. Empty column: "None".

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
- **Board column markup:**

  ```html
  <section aria-labelledby="fs-board-INVESTIGATING">
    <h2><StatusMark/> <span id="fs-board-INVESTIGATING">Investigating</span> <span class="fs-count">1</span></h2>
    <ul>…cards…</ul>
  </section>
  ```

  - The region's accessible name is the status label alone, so `getByRole('region', { name: label, exact: true })` (issues-voting:169) matches.
  - The count and the marker sit in the h2 but outside the labelling element.
- **Status shape vocabulary**, one component (`IssueStatus`), each shape always beside the status text. The glyphs below only illustrate the shapes:
  - ○ ring, `muted-fg`: Reported, Closed.
  - ◐ half, `accent`: Investigating, Planned.
  - ◆ diamond, `warning`: Needs More Info, Workaround Available.
  - ● dot, `success`: Fixed.
  - The same vocabulary appears in Critwire's hero loop.
- **The marker is never a character.**
  - **Markup:** `StatusMark` (exported from `IssueStatus.tsx`) renders an empty `<span aria-hidden="true" class="status-mark" data-shape="ring|half|diamond|dot">`.
  - **Drawing:** CSS only, in `currentColor`: a bordered circle, a half `linear-gradient` fill, a 45° rotated square, a filled circle. The shape rules live once in `globals.css`. Each surface sets the colour: `IssueStatus`'s tone map on the portal, Ink in the loop.
  - **Why:** Playwright's `toHaveText` reads `textContent`, `aria-hidden` text included. A glyph would break `^title` (issues-voting:299,334) and "links contain only the title", and screen readers would announce it (F9).
  - **Where else:** the same `StatusMark` draws the ◆ in the issue-detail aside heading and the four markers in `IssueLoop`.
  - **The one glyph that stays text:** the vote `▲`, inside `VoteCount` after the title, because E2E pins `▲ n` (§7).

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
  - Board columns as regions named by a label-only element (§5).
  - Status markers are empty CSS shapes, never characters (§5).
  - **`VoteCount`** (not interactive) comes in two sizes:
    - **List tally:** the number above a visible "vote" or "votes".
    - **Inline** (board cards, landing): an `aria-hidden` `▲`, a space, the number, then a visually hidden " vote" or " votes". Its `textContent` reads `▲ n`, so E2E's `▲ 1` still matches. On the landing it renders only when n > 0.
  - **`VoteButton`** holds exactly three things:
    - the `aria-hidden` `▲`;
    - the word "Upvote" or "Upvoted";
    - `<span class="fs-vote-count">` containing only the current number.

    So its name stays `/^Upvoted?\s*\d+$/` (issues-voting:290). The count roll animates that single number with a transform; the span never holds two numbers. The "+1"/"−1" ghost (`aria-hidden`) and the helper line sit outside the button, in its wrapper. Nothing visually hidden goes inside the button.
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
| Report | Send Field Report; Field notes; Track type; "Field report received. The team will review the trail."; "The field report could not be sent…" | Report a bug; What happened?; Category; "Report sent. The {game} team can see it now."; "Your report wasn’t sent, so nothing reached the studio. Check the fields, complete the verification and send it again." |
| Contact | Studio Route; "…The team has the signal."; "Contact route is not configured" | Intro "Questions, feedback or press requests go straight to the {game} team. For bugs, use the report form."; "Message sent. If you left an email address, the {game} team can reply to it."; "{game} hasn’t set up a contact form yet" + "Reach the team through the links in the footer." |
| Tally | Invalid-URL admin instructions; "…managed in Tally, not Critwire." | "This form isn’t available right now."; "This form is hosted by Tally." |
| 404s | "This page could not be found." / Go home | "There’s no page at this address." / Go to the home page (h1 stays "404") |
| Page titles | Field Notes — {game}, Field Board — {game}, Send Field Report — {game} | {game} patch notes, {game} known issues, Report a bug in {game}. Detail titles and the RSS title are unchanged. |
| CC seed | Title Case labels; the note "v0.1.0 - Field Binder Launch" repeats the version the UI already shows | Field notes, Field board, Send report, Begin expedition, Check the field board, Send a field report, See known issues, Read the field notes; note title "Field binder launch" |

E2E selectors that change. Each keeps the assertion's meaning; Playwright name, text and label matching is case-insensitive substring unless `exact`.

| Spec:line | Now | New | Why |
|---|---|---|---|
| portal-landing:116-118 | `'Patch Notes' / 'Known Issues' / 'Report a Bug'`, `exact: true` | `'Patch notes' / 'Known issues' / 'Report a bug'` | Sentence-case labels |
| patch-notes:107 | `'Older →'` | `'Older updates'` | Arrow removed |
| issues-voting:169 | `div.w-64` with `:scope > div:first-child` | `page.getByRole('region', { name: label, exact: true })` | Columns become `<section>`s named by a label-only element (§5) |
| issues-voting:173 | `` [`📌 ${pinned.title}`] `` | `[pinned.title]`, plus `expect(column('Investigating')).toContainText('Pinned')` | The marker moved out of the link; the "marked pinned" part of the assertion is kept |
| issues-voting:293 | `span.font-mono` | `.fs-vote-count` | Count is no longer mono |
| reports-contact:65, 66, 72 | `'Field notes'`, `'Track type'`, `'Field report received.'` | `'What happened'`, `'Category'`, `'Report sent.'` | Copy |
| reports-contact:319 | `'Contact route is not configured'` | `'set up a contact form yet'` | Copy |

Still valid, and constraints the implementation must keep:
- `'Get the Game'` still matches case-insensitively; it may be aligned to 'Get the game'.
- `'RSS'` exact, `'Page 1 of 2'`, Board/List view, combobox order (category, then sort), and the `Search issues…` placeholder.
- The vote button name `/^Upvoted?\s*\d+$/`. The button's content is fixed by §7; the ghost and the helper line sit outside it.
- Send report, Send message, "Message sent.", "Open report form", "Open contact page".
- All the other labels, "The studio needs more information", "Workaround", and `'v2.1.0 — Harbor hotfix'` (kept on purpose, see the review).
- The h1 `404`.
- `.fs-hero`, `.fs-btn-primary` and `section.fs-hero img`.
- Section ids and order: the hero keeps no `aria-labelledby`.
- A single `a[href="/g/<slug>"] img`: the footer never links home with an image.
- One `banner` containing the project name.
- `article .payload-richtext`, and a single `article aside`.
- Known-issue `li` text starts with the title (the marker is an empty CSS shape), contains `▲ n` only when n > 0, and keeps the status label inside the link.
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
| `src/site-templates/flagship-game-v1/fonts.ts` (new) | Archivo, Young Serif, Science Gothic → `--font-archivo`, `--font-young-serif`, `--font-science-gothic`. The template owns its fonts; `themeStyle` references the same variable names, and `SiteRoot` applies the three `.variable` classes (§1). |
| `src/app/(frontend)/layout.tsx` | `--font-body` and `--font-critwire` classes on `<html>`, `cw-root` on `<body>`. Remove `InitTheme`, `Providers` and the Geist fonts. Header and footer stay. |
| `src/app/(public)/layout.tsx` | `--font-body` class on `<html>` (the display faces go on `.fs-root`, §1). Remove Geist and `data-theme="dark"`. |
| `src/app/(frontend)/globals.css` | Shared Tailwind entry only: Tailwind, the typography plugin, `@theme` (breakpoints, `--font-sans: var(--font-body)`), base, `.container`, the shared `.status-mark` shapes (§5), and `@import './marketing.css' layer(components); @import './portal.css' layer(components);`. Delete `--ds-*`, `cc-*`, `glass-*`, `glow-*`, the dark palette, chart and sidebar tokens, and the opacity hack. |
| `src/app/(frontend)/marketing.css` (new) | On `.cw-root`: the Critwire tokens, the shadcn variable values and the `--prose-*` values (see `tailwind.config.mjs`). Plus `cw-*` classes, the loop animation and focus styles. |
| `src/app/(frontend)/portal.css` | Renamed from `flagship.css`; now the whole portal: `--fs-*` consumers, the §2 contract, plate hero, lists, board, forms, status-marker tones, the `--prose-*` values on `.fs-root`, focus, motion. No `.fs-prose` class (F5). |
| `tailwind.config.mjs` | The one place prose is styled (F5). `typography.DEFAULT.css` (appended after the plugin's defaults, so it wins) maps: `--tw-prose-body/-headings/-links/-bold/-quotes/-code/-kbd/-pre-code` → `var(--prose-fg)`; `-lead/-captions/-counters/-bullets` → `var(--prose-muted)`; `-hr/-quote-borders/-th-borders/-td-borders/-kbd-shadows` → `var(--prose-border)`; `-pre-bg` → `var(--prose-code-bg)`. It sets `fontSize: var(--prose-size)`, `lineHeight: 1.6`, `maxWidth: var(--prose-measure)` and `a { textDecorationColor: var(--prose-link-line) }`. The template's `base`/`md` heading overrides are deleted. Values: `.fs-root` sets `--fs-fg`, `--fs-muted-fg`, `--fs-border`, `--fs-surface`, `--fs-accent`, `1.0625rem`, `68ch` (every text pair is a schema-guaranteed one, §2); `.cw-root` sets Ink, Graphite, Ink at 12%, `#FFFFFF`, Ink, `1.125rem`, `62ch`. |
| `src/site-templates/flagship-game-v1/schema/theme.ts` | New `DEFAULT_THEME_COLORS` only. |
| `.../render/themeStyle.ts` | Voice, radius and density tables (§4). |
| `.../defaults.ts` | Button-text candidates from the palette; `finalCta.heading: null`. |
| `.../actions.ts` | Sentence-case `DEFAULT_ACTION_LABELS`. |
| `.../render/SiteFrame.tsx` (new: `SiteRoot`, `SiteFrame`), `SiteNav.tsx`, `SiteNavLinks.tsx` (new, client), `SiteFooter.tsx`, `FlagshipSite.tsx`, `ui.tsx` | One root, one frame, one nav, one footer (§1). `SectionHeader` loses `eyebrow`. |
| `.../render/NavShell.tsx` | Delete. |
| `.../render/slots/*.tsx` | Plate hero and build line; the other slots per §5; `KnownIssues` uses `IssueStatus`. |
| `src/lib/game-portal/landingPage.ts` (new) | See §1. |
| `app/(public)/g/[gameSlug]/page.tsx` | Uses `landingPage.ts`. |
| `src/components/game/PortalChrome.tsx` | `SiteFrame` via `getPortalSiteConfig`. |
| `src/hooks/revalidateGamePortal.ts` (new) | `revalidateGamePortal(source, payload)`: the log line plus `revalidatePath(PORTAL_ROUTE, 'layout')`, moved from `revalidateGameProject.ts:15-18` (§1). |
| `src/collections/GameProjects/hooks/revalidateGameProject.ts` | Calls `revalidateGamePortal`; no behaviour change. |
| `src/collections/GamePages/hooks/revalidateGamePage.ts` | Both hooks call `revalidateGamePortal` instead of `revalidateGameLanding`. |
| `src/hooks/revalidateGameLanding.ts` | Unchanged: it keeps the `/g/<slug>` scope the Issues, PatchNotes and IssueVotes hooks rely on. |
| `src/components/game/IssueStatus.tsx` | Replaces `IssueStatusBadge.tsx`: tone map, `StatusMark` (an empty `aria-hidden` CSS shape, §5), label; keeps the `issueStatusLabel` export. |
| `src/components/game/VoteCount.tsx`, `format.ts` (`formatDate` replaces `formatPatchDate` and `formatSiteDate`), `PageHead.tsx`, `FormField.tsx`, `FormNotice.tsx` (all new) | Shared portal primitives (F8). |
| `PatchNotesFeed.tsx`, `IssueFilters.tsx`, `VoteButton.tsx`, `TallyEmbed.tsx`, `GameButtons.tsx`, the ops pages under `(ops)/`, `(public)/not-found.tsx` (inside `SiteRoot`) | `fs-*` classes and §8 copy. `VoteButton` and `VoteCount` follow the markup in §7. The two detail pages drop their extra `div.prose dark:prose-invert` wrapper, since `RichText` already applies `.prose`. |
| `src/blocks/game/*` (legacy blocks) | Mechanical port from `cc-*` to `fs-*` classes; no redesign. |
| `src/components/RichText/index.tsx` | Drop `dark:prose-invert`, `md:prose-md` and the `max-w-none` it adds without a gutter, so the configured measure applies. Colours, size and measure come only from `tailwind.config.mjs` and the root that contains the prose. |
| `src/app/(frontend)/page.tsx` | Renders `MarketingHome`. |
| `src/components/marketing/{MarketingHome,IssueLoop}.tsx` (new) | Server components. `IssueLoop` draws its markers with `StatusMark`. |
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
- **Projects:** `desktop` (1440×900) and `mobile` (390×844, touch). `reducedMotion: 'reduce'`, so captures are deterministic final states. Full-page screenshots.
- **Before every capture** the harness waits for two things:
  - `document.fonts.ready`.
  - When the page has a `.fs-root`, a poll until its computed `--fs-accent` equals the landing's value, read right after the theme switch. The ops pages are ISR-cached. The "before" ops pages have no `.fs-root` and skip this check.
- **Command:** `SHOTS_SET=before|after SHOTS_DIR=/srv/critter-ai/agent-state/missions/design-pass/screenshots pnpm screenshots`. `testMatch: /\.shots\.ts$/`, so the E2E suite never picks it up. It drops the same `_e2e` database, so it never runs at the same time as `pnpm test:e2e`. The plan's Verification records the exact invocation of each set, and the commit it was shot from, so the owner can reproduce the index.

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
7. **`font-stretch` on the `wdth` axis through next/font:** resolved in revision. The `@font-face` ranges survive self-hosting (§4). The first after-screenshot of `/` and the landing is the visual confirmation.
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

Skipped: usage limit reached; next retry after 2026-09-29 07:20 UTC (astra-review exit 3).

## Revision notes

Revision by the `architect`, 2026-09-29. Every claim was checked against the code at `cd22188` before the design changed.

**MUST-FIX**
1. **Prose colour mapping.** Confirmed: the compiled CSS has `.prose{--tw-prose-body:var(--text);…}` inside `@layer utilities`, because the typography plugin's `addComponents` is `addUtilities` in Tailwind 4.3.2.
   - **Changes:** rewrote F5 and its Current-state bullet. In §10, `tailwind.config.mjs` now maps every `--tw-prose-*` colour, plus size, line-height and measure, to `--prose-*` variables. `.fs-root` (portal.css) and `.cw-root` (marketing.css, on the `(frontend)` `<body>`) set their values.
   - **Removed:** the `.fs-prose` and `.cw-prose` classes. `RichText` drops `dark:prose-invert`, `md:prose-md` and `max-w-none`, and the detail pages drop their nested `div.prose`.
2. **Vote button name.** Covered in §7 Semantics and the §8 "still valid" list:
   - `VoteButton` contains only the `aria-hidden` `▲`, "Upvote"/"Upvoted" and `.fs-vote-count`, holding one number (issues-voting:290).
   - The ghost and the helper line sit outside the button.
   - The visually hidden " votes" belongs to the inline `VoteCount` only. Its `textContent` stays `▲ n`.
3. **Status marker.** In §5, the new "The marker is never a character" bullet specifies `StatusMark`: an empty `aria-hidden` span drawn with CSS. It is used by `IssueStatus`, the issue-detail aside heading and `IssueLoop`. The shape rules live in `globals.css`. The known-issues row, the §8 constraint and the §10 rows reference it. Test lines are corrected to issues-voting:299,334.
4. **Board column name.** In §5, the new "Board column markup" gives the exact markup: `aria-labelledby` points at a span holding only the status label, with the count and marker outside it. The §7 and §8 rows reference it.

**MISSED**
- **Font `.variable` classes:** §1 introduces `SiteRoot`, which applies the three template font classes on the only `.fs-root`; the portal 404 uses it too. §4 gains "Where the `.variable` classes go". The §10 rows for the fonts and both layouts are updated.
- **`revalidateGameLanding` scope:** stated in §1 Revalidation, "Fine as is" and §10. It keeps `/g/<slug>`; only the two GamePage hooks change. The plan's wrong citation `revalidateGamePage.ts:48` is corrected to `:14` and `:25`.
- **"Powered by Critwire":** the review's premise is wrong. `SiteFooter.tsx:69-72` already carries the credit, so unifying the chromes removes nothing. It is recorded under Decisions as kept, and noted in §1's footer contents.

**SHOULD-CONSIDER**
1. **Adopted:** `revalidateGamePortal` is extracted to `src/hooks/revalidateGamePortal.ts` (§1, §10). It's cheap, and it removes a repeated call.
2. **Adopted, with different wording:**
   - **Report success:** the reviewer's text still promised studio behaviour ("will appear"). It now says only what happened: "Report sent. The {game} team can see it now." The report is stored as a NEW `issue-reports` doc.
   - **Contact success:** the same fix applies: "Message sent. If you left an email address, the {game} team can reply to it."
   - **E2E:** the `'Report sent.'` and `'Message sent.'` substrings still match.
3. **Adopted:** `SiteRoot` is the only `.fs-root`, the 404 included (§1).
4. **Adopted:** before each capture the harness waits for fonts and a per-page `--fs-accent` check, and Verification records each set's invocation (§11).
5. **Resolved outright, not just moved earlier:** `font-stretch` does reach `wdth`. Google's `@font-face` declares the stretch ranges, and next/font only rewrites `src` (§4, risk 7).

## Steps

**How every step runs.** One step per session: do it, run its checks, tick it, add a Log line (UTC, what, results), commit code and plan together, push `agent/design-pass`.

- **Base checks:** `pnpm exec tsc --noEmit`, then `pnpm lint` (0 errors, no more than the baseline's 23 warnings).
- **E2E:** `pnpm test:e2e`, all green. Required whenever markup, copy, CSS or behaviour changed.
- **Look** (the skill's "critique as you build"): `SHOTS_SET=after SHOTS_DIR=/tmp/design-pass-wip SHOTS_THEMES=<groups> pnpm screenshots [--project desktop|mobile]`. Open the PNGs of the pages the step touched and fix what reads wrong before committing. The groups are `default`, `critter-connect`, `riso` and `marketing`. Never point a Look at the artifact directory.
- **Run one heavy job at a time.** E2E, the harness and `pnpm build` share `.next`, and E2E and the harness share the `_e2e` database. Never run two together, and stop any `pnpm dev` or `pnpm start` first. There is no Docker.
- **Ports:** E2E uses 3100 (sink 3101), the harness 3200, and the mission-DB server 3000. If `systemctl --user is-active critwire-demo` reports active, stop it before using 3000.
- **The `dev` row:** `pnpm dev` records one in the mission DB. Before `pnpm build`, `pnpm payload migrate` or `migrate:create`, run `psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -c "delete from payload_migrations where name='dev'"`.
- **E2E selectors** change only in the step whose markup or copy breaks them (table below), and an assertion's meaning never changes. If an unlisted selector breaks, fix the markup. If that's impossible, change the selector without changing what it asserts, and record it under Decisions.
- **Markup the E2E suite relies on** (§8):
  - one h1 per page;
  - one `banner` holding the project name;
  - a navigation named "Site" with the four portal links;
  - on patch-notes pages, `li > h2` only in the feed (patch-notes:16);
  - `section.fs-hero` without `aria-labelledby`;
  - the `main section[aria-labelledby]` order unchanged;
  - one `a[href="/g/<slug>"] img` (header only);
  - `article .payload-richtext` and exactly one `article aside`;
  - issue links containing only the title.
- **Hex colours in code are lowercase.** E2E S2.3 compares `rgbToHex` output with `DEFAULT_THEME_COLORS.accent`.
- **Ops pages keep their data calls,** caching exports and access-controlled queries. Only presentation changes, plus the S5 revalidation.

| E2E change (§8) | Step |
|---|---|
| portal-landing:116-118: sentence-case nav labels | S4 |
| portal-landing S2.4: new step, ops pages follow the published theme (written first) | S5 |
| patch-notes:107: `'Older updates'` | S13 |
| issues-voting:169: board regions. issues-voting:173: pinned title plus `toContainText('Pinned')` | S14 |
| issues-voting:293: `.fs-vote-count` | S15 |
| reports-contact:65, 66, 72 | S16 |
| reports-contact:319 | S17 |

- [x] S1 · Screenshot harness (tooling only, no `src/` change)
  - **Share E2E code instead of copying it:**
    - `requireDisposableDatabase()` and the webServer `env` block, as `serverEnv({ cronSecret })`, move from `playwright.config.ts` into `tests/e2e/support/env.ts`. That file stays free of test-runner imports.
    - `contentLayout` moves from `tenant-isolation.spec.ts` into `tests/e2e/support/fixtures.ts`.
    - Both callers import them. Record this DRY widening of §10 under Decisions.
  - **`playwright.screenshots.config.ts`:**
    - `testDir: 'tests/screenshots'`, `testMatch: /\.shots\.ts$/`, 1 worker, 0 retries.
    - Projects: `shots-setup`, then `desktop` (1440×900) and `mobile` (390×844, `isMobile`, `hasTouch`), both depending on it. `reducedMotion: 'reduce'`.
    - webServer: `pnpm e2e:server` with `serverEnv({ cronSecret: SHOTS_CRON_SECRET })`, plus `E2E_SKIP_BUILD=1` when `SHOTS_SKIP_BUILD=1`.
    - The HTML report goes to `playwright-report-shots/` and test output to `test-results/shots/`.
    - Fail fast unless `SHOTS_SET` is `before` or `after` and `SHOTS_DIR` is absolute.
    - globalSetup writes `<SHOTS_DIR>/<SHOTS_SET>/meta.json` (commit, dirty flag, UTC time, command). globalTeardown runs `tests/screenshots/writeIndex.ts`.
  - **`package.json`:** add `"screenshots": "cross-env NODE_OPTIONS=--no-deprecation E2E_PORT=3200 playwright test --config playwright.screenshots.config.ts"`. `E2E_PORT` points `BASE_URL` and the REST factories at 3200.
  - **`tests/screenshots/setup.shots.ts`** (REST only, reusing `RestClient` and the `fixtures.ts` factories):
    1. First-register a super admin and create one tenant.
    2. `POST /api/seed/critter-connect` with the harness bearer token; expect 200.
    3. Record the CC landing's `.fs-root` `style` attribute as the CC baseline.
    4. Add patch note `v0.1.1`, "Clue trail and Steam Deck fixes".
    5. Add four public CC issues:
       - Investigating and pinned: "Clue trail disappears after fast travel";
       - Needs More Info, with `needsMoreInfoText`;
       - Workaround Available, with `workaroundText`;
       - Fixed, with `fixedInPatchNote` pointing at v0.1.1.
    6. Cast votes with `castVote`: 7, 4, 2 and 1.
    7. Create a bare project (name and description only).
    8. Create a legacy project whose published landing uses game blocks (hero, features, CTA; fields from `src/blocks/game/*/config.ts`).
    9. Publish a marketing page `about-critwire` (lowImpact hero plus `contentLayout`).
    10. Write `test-results/shots/world.json`.
  - **`tests/screenshots/design.shots.ts`:**
    - One `describe` per group in `SHOTS_THEMES`. By default that's all four, in the order `default`, `riso`, `critter-connect`, `marketing`.
    - **Theme switch, in `beforeAll`:**
      - Re-POST the seed and wait for the CC baseline style.
      - `riso`: PATCH the §3 theme published (constants in `tests/screenshots/themes.ts`), then wait for `--fs-bg: #eef4d2`.
      - `default`: PATCH ten `''` colours and `null` selects (send `null` colours if Payload rejects `''`), then wait until the whole `style` differs from the CC baseline. Checking `--fs-accent` alone isn't enough: before this pass, CC's accent equals the old default's `#22d3ee`.
      - The waits reload the landing every second, for up to 60 s.
    - **Pages per theme (14):** §11's twelve pages plus two focus shots:
      - the report form with `getByLabel('Title')` focused;
      - the landing, pressing `Tab` until `.fs-hero .fs-btn-primary` has focus (at most 40 presses; fail if it never does).
    - **`default` also shoots:** the portal 404 (`/g/no-such-game`), the bare project's landing, patch notes, issues and contact pages (the first-run, empty and not-configured states), and the legacy landing.
    - **`marketing` shoots:** `/`, `/about-critwire` and `/no-such-page`.
    - **Before each capture:** wait for `networkidle` and `document.fonts.ready`. On CC pages that have a `.fs-root`, poll until its `style` equals the landing's.
    - **Output:** a full-page PNG at `<SHOTS_DIR>/<set>/<group>--<page>--<1440|390>.png`.
  - **`tests/screenshots/writeIndex.ts`:** writes a static `index.html` at `<SHOTS_DIR>`:
    - each set's meta line at the top;
    - then groups, then pages, with before and after side by side for each width;
    - thumbnails linking to full size, using relative paths;
    - "not captured" where a side is missing.
  - `.gitignore`: add `/playwright-report-shots/`. `AGENTS.md` Commands: add one line for `pnpm screenshots`, noting that it drops the `_e2e` database, like `pnpm test:e2e`.
  - **Checks:**
    - base checks;
    - `pnpm exec playwright test --list` lists the same tests as before the move;
    - the smoke run `SHOTS_SET=before SHOTS_DIR=/tmp/design-pass-smoke SHOTS_THEMES=critter-connect pnpm screenshots --project desktop` passes and writes 14 PNGs plus `index.html`, and the PNGs show CC's art and content;
    - `git diff --stat 669376c -- src public tailwind.config.mjs next.config.ts postcss.config.js` prints nothing.

- [x] S2 · Seed the mission database and capture the "before" set
  - **Mission DB** (the brief's Notes; it also enables quick `pnpm dev` looks later):
    1. Stop `critwire-demo` if it's active, and delete the `dev` row.
    2. Run `pnpm build`. This is the first production build on the mission DB. Record the result; if it fails, record why (it must pass by S24).
    3. Start `pnpm start` on 3000 in the background and wait for `/api/health`.
    4. Over REST, as in `auth.setup.ts`: `POST /api/users/first-register` (a dev super admin), then `POST /api/tenants`.
    5. Run `pnpm seed:critter-connect`. It reads `CRON_SECRET` and `NEXT_PUBLIC_SERVER_URL=http://localhost:3000` from `.env`.
    6. Confirm `/g/critter-connect` renders, then stop the server.
    7. Keep the dev admin's credentials in `/srv/critter-ai/agent-state/missions/design-pass/dev-admin.txt` (mode 600), never in git or the plan.
  - **Before set:**
    - Re-run S1's `git diff --stat 669376c …` check.
    - Run `SHOTS_SET=before SHOTS_DIR=/srv/critter-ai/agent-state/missions/design-pass/screenshots pnpm screenshots`.
    - Fallback if `src` has changed: `git worktree add --detach /tmp/design-pass-before 669376c`, copy in the harness files from the S1 commit and `.env`, run `pnpm install --frozen-lockfile`, and shoot from there.
  - **Checks:**
    - 102 PNGs: 14 pages × 3 themes × 2 widths, plus 9 once-per-width pages × 2.
    - `index.html` lists every image, with "not captured" on the after side.
    - Open the landing, issues, report and `/` at both widths under all three themes. Each theme applied (Riso's landing is light). The ops pages stay navy and cyan under every theme; that's F1, expected before the redesign.
    - Fill in the before row of the Screenshot record.
    - No source change, so no E2E.

- [ ] S3 · Extract the landing-config and portal-revalidation helpers (refactor, no behaviour change)
  - New `src/lib/game-portal/landingPage.ts`, with code moved out of `app/(public)/g/[gameSlug]/page.tsx:29-116`:
    - `getLandingPage(projectID, draft, user?)`, wrapped in React `cache`;
    - `resolveFlagshipConfig(page, project, { draft })`, returning `{ config, media }` (normalize, parse, Sentry on drift outside Draft Mode, derived default).
  - The landing page keeps its decision tree and calls these two functions.
  - New `src/hooks/revalidateGamePortal.ts`: `revalidateGamePortal(source, payload)`, the log line plus `revalidatePath(PORTAL_ROUTE, 'layout')`, moved from `revalidateGameProject.ts:15-18`. Both GameProject hooks call it. The GamePage hooks stay as they are until S5.
  - **Checks:** base checks; `pnpm test:int`; E2E.

- [ ] S4 · One root, one frame, one nav and one footer, on the landing and the portal 404
  - **New `render/SiteFrame.tsx`:**
    - `SiteRoot({ theme, children })` is the only element that carries `.fs-root`. It sets `style={themeStyle(theme)}` and `data-fs-motion`.
    - `SiteFrame({ config, project, children })` is `SiteRoot` plus the skip link, `SiteNav`, `main#fs-main` and `SiteFooter`.
    - `FlagshipSite` renders its slots inside `SiteFrame`.
  - **Nav and footer signatures:** `SiteNav({ project, value })` and `SiteFooter({ project, nav, value })`; neither takes the render context.
  - **Nav:** a new client component, `SiteNavLinks`, sets `aria-current="page"` through `usePathname`. It replaces `NavShell.tsx`, which is deleted. The header becomes a plain, solid `<header class="fs-nav">`; drop the `[data-scrolled]` rules from `flagship.css`.
  - **Footer:**
    - The four portal pages come first. Each uses the studio's nav label for its ref when one is set, otherwise `DEFAULT_ACTION_LABELS`, through `resolveSiteAction`, so there's no second label table.
    - Then the project's external links. `EXTERNAL_LINK_LABELS` moves from `PortalChrome` into `actions.ts`, and `PortalChrome` imports it until S5.
    - Then legal links in sentence case: Press kit, Privacy policy, Terms.
    - The bottom row holds the copyright and "Powered by Critwire" (see Decisions).
    - No headings inside footer lists.
  - **`actions.ts`:** sentence-case `DEFAULT_ACTION_LABELS` (§8).
    - E2E: portal-landing:116-118 become `'Patch notes'`, `'Known issues'` and `'Report a bug'`.
    - portal-landing:156 may be aligned to `'Get the game'`.
  - **`(public)/not-found.tsx`:** renders inside `SiteRoot` with `siteThemeSchema.parse({})`. Content: the h1 "404", "There’s no page at this address.", and a link "Go to the home page".
  - **Checks:**
    - base checks;
    - E2E: S2.1's identical 404s, S2.2's nav labels, S2.6's single header image;
    - Look: `default`, desktop.

- [ ] S5 · Ops pages render inside the studio's frame and theme (behaviour change, test first)
  - **Write the test first.** In portal-landing S2.4's "publishes, keeps drafts private…" test, add a step before the accent-only step:
    1. Open `/g/<slug>/patch-notes`, which warms its ISR cache.
    2. Publish the accent-only site (`#f59e0b`).
    3. `eventually`, reload the page and check that `getComputedStyle(document.querySelector('.fs-root')).getPropertyValue('--fs-accent').trim()` equals `#f59e0b`.

    Run `pnpm test:e2e tests/e2e/portal-landing.spec.ts -g "publishes, keeps drafts"` and confirm it fails, because ops pages have no `.fs-root` yet.
  - **`landingPage.ts`:** add `getPortalSiteConfig(project)`, React-cached and reading the published landing only. It returns the flagship config through `resolveFlagshipConfig`; otherwise, including legacy block pages, it returns `deriveFlagshipDefault(project)`.
  - **`PortalChrome.tsx`:** becomes an async Server Component rendering `<SiteFrame config={await getPortalSiteConfig(project)} project={project}>`. Its own header, footer, link table and `--game-accent` style are removed.
  - **`revalidateGamePage.ts`:** both hooks call `revalidateGamePortal`. The change hook keeps its published-or-was-published condition. `revalidateGameLanding` is untouched.
  - **Checks:**
    - the new step passes;
    - base checks; `pnpm test:int`;
    - full E2E: patch-notes caching and rename, issues, reports-contact, tenant-isolation;
    - Look: `riso`, desktop. The nav and footer follow the theme; page bodies stay old until S13–S17.

- [ ] S6 · Fonts through next/font, and the display-voice tables
  - **New font modules,** all `next/font/google` with subsets `latin, latin-ext` and `display: 'swap'`:
    - `src/fonts.ts`: Atkinson Hyperlegible Next as `--font-body`, preloaded;
    - `src/app/(frontend)/fonts.ts`: Anybody with `axes: ['wdth']` as `--font-critwire`, preloaded;
    - `src/site-templates/flagship-game-v1/fonts.ts`: Archivo (`wdth`), Young Serif (400) and Science Gothic (`wdth`), as `--font-archivo`, `--font-young-serif` and `--font-science-gothic`, with `preload: false`.
  - **Where the classes go:**
    - Both layouts put the body font variable on `<html>`; the `(frontend)` layout also adds `--font-critwire`. Remove the Geist imports.
    - `SiteRoot` adds the three template `.variable` classes.
    - `globals.css` `@theme`: set `--font-sans: var(--font-body)` and drop the Geist font lines.
    - Run `pnpm remove geist`.
  - **`themeStyle.ts`:**
    - Add §4's `DISPLAY`, `RADIUS` and `SECTION_Y` tables, emitting `--fs-font-display`, `--fs-display-weight/-stretch/-tracking/-scale/-leading`, `--fs-radius`, `--fs-radius-control` and `--fs-section-y`.
    - Remove `--fs-font-heading` and `--fs-font-body`. Move every consumer (`flagship.css`, `SiteNav`, `SiteFooter`, the slots) to the new variables. `.fs-root` body text uses `var(--font-body)`.
  - **Checks:**
    - base checks; E2E (its build fetches the fonts);
    - `grep -rn "geist\|fs-font-heading\|fs-font-body" src package.json` prints nothing;
    - after the E2E build, `grep -rho "font-stretch:[^;}]*" .next/static --include=*.css | sort -u` shows `62% 125%`, `50% 150%` and `50% 200%` (risk 7);
    - `grep -rlE "fonts\.(googleapis|gstatic)\.com" .next/static` prints nothing;
    - Look: `default,riso,critter-connect`, desktop. The landing shows Archivo, Young Serif and Science Gothic, not a fallback font.

- [ ] S7 · Layered stylesheets and one deliberate prose mapping
  - **Layering:**
    - `git mv src/app/(frontend)/flagship.css src/app/(frontend)/portal.css`.
    - `globals.css` imports it with `@import './portal.css' layer(components);`. If Tailwind rejects `layer()` on an import, wrap the file's contents in `@layer components { … }` instead.
    - Confirm in the built CSS that the `.fs-` rules sit inside `@layer components` (F7).
  - **Prose:**
    - `tailwind.config.mjs` gets §10's `--tw-prose-*` → `--prose-*` mapping, plus `fontSize`, `lineHeight: 1.6`, `maxWidth` and the link decoration colour. Delete the `base` and `md` heading overrides.
    - `portal.css`: `.fs-root` sets `--prose-fg`, `--prose-muted`, `--prose-border`, `--prose-code-bg`, `--prose-link-line`, `--prose-size` and `--prose-measure` from the `--fs-*` tokens (§10 values).
    - Marketing prose keeps inheriting its colour until S18 sets `.cw-root`.
  - **`RichText/index.tsx`:** drop `dark:prose-invert`, `md:prose-md` and `max-w-none`.
  - **Detail pages:** patch-note and issue detail drop their nested `div.prose dark:prose-invert`, so exactly one `.prose` wraps the rich text.
  - **`(public)/layout.tsx`:** drop `data-theme="dark"`. Until S15, the issue callouts show their light variants instead of their `dark:` twins.
  - **Checks:** base checks; E2E; Look: `riso,default`, both widths. On the light theme, detail-page prose reads in `--fs-fg`, and FinalCTA's utilities now apply.

- [ ] S8 · New default and Critter Connect themes, with the column-default migration
  - **`schema/theme.ts`:** `DEFAULT_THEME_COLORS` becomes Slate & signal (§3, lowercase).
  - **`defaults.ts`:** `ACCENT_FOREGROUND_CANDIDATES = [DEFAULT.background, DEFAULT.foreground, '#000000', '#ffffff']`, and the derived default's `finalCta.heading: null`.
  - **`src/seed/critterConnect.ts`:**
    - the Night canopy theme (technical, balanced, cinematic, subtle);
    - `accentColor: '#f3b340'`;
    - sentence-case labels (§8);
    - the launch note titled "Field binder launch".
  - **Migration:** delete the `dev` row, then run `pnpm payload migrate:create design_default_theme`.
    - It must hold exactly 20 `ALTER COLUMN … SET DEFAULT` statements (10 on `game_pages`, 10 on `_game_pages_v`) plus a matching `down`.
    - Anything else is schema drift: stop and investigate.
    - Run `pnpm payload migrate` on the mission DB.
    - Run `pnpm generate:types`; `git diff --exit-code src/payload-types.ts` must pass.
  - **Optional:** start the mission-DB server again and re-run `pnpm seed:critter-connect`, so the dev DB carries the new CC theme.
  - **Checks:**
    - base checks; `pnpm test:int` (the parity test is unchanged);
    - E2E: `migrate:fresh` runs the new migration, and S2.3's white and `#123456` cases and S2.4's invalid themes keep their meaning;
    - Look: `default,critter-connect,riso`, desktop. The Riso and CC publishes pass the schema's six WCAG pairs, or the Look fails.

- [ ] S9 · Portal base: token contract, type scale, chrome, focus and motion rules (`portal.css`, `SiteNav`, `SiteNavLinks`, `SiteFooter`)
  - **The §2 contract:**
    - the accent is used only as a fill or decoration;
    - `--fs-border` is used only for dividers;
    - input and secondary-button borders use `--fs-muted-fg`.
  - **Type:** §4's portal scale as classes: hero title, section title, ops page title, entry title, lead, body, meta, and a tally with `tabular-nums`.
  - **Layout:** the shell is `min(1180px, 100% − 2 × clamp(1rem, 4vw, 2.5rem))`, with 46rem and 60rem reading columns and the `--fs-section-y` rhythm.
  - **Controls:**
    - primary button: accent fill with `--fs-accent-fg` text;
    - secondary button: `--fs-muted-fg` border;
    - both use `--fs-radius-control`, `:active` scales to 0.98, and targets are at least 44 px;
    - links are underlined, with the accent as `text-decoration-color`.
  - **Focus, skip link and motion:**
    - the two-tone focus ring on every interactive element;
    - the skip link;
    - the root motion rules: `@media (prefers-reduced-motion: reduce)` and `[data-fs-motion='off']` stop every animation and transition and show end states.
  - No uppercase, shadows or gradients.
  - **Nav (§5, §7):**
    - a solid, sticky `--fs-bg` bar with a `--fs-border` rule;
    - at 1440 px: name, links and CTA on one row;
    - at 390 px: the name (truncating) and the CTA, then a horizontally scrolling link row, with no hamburger;
    - the `aria-current` underline in the accent.
  - **Footer:** laid out per §1.
  - **Checks:**
    - base checks; E2E;
    - Look: `default,critter-connect,riso`, both widths. At 390 px the nav is at most two rows and its links scroll. The focus shot shows the two-tone ring under all three themes.

- [ ] S10 · Shared status, count and date primitives; the landing's known issues and latest update
  - **New `src/components/game/format.ts`:** `formatDate` replaces `formatPatchDate` (PatchNotesFeed, patch-note detail) and `formatSiteDate` (`ui.tsx`, LatestUpdate, Availability) at every caller.
  - **New `IssueStatus.tsx`:** replaces `IssueStatusBadge.tsx`, which is deleted, in `KnownIssues`, the issues list and issue detail.
    - It holds the tone map, `StatusMark` and the label, and keeps the `issueStatusLabel` export.
    - `StatusMark` is an empty `<span aria-hidden="true" class="status-mark" data-shape="ring|half|diamond|dot">`.
    - The shapes are defined once in `globals.css`, CSS only, drawn in `currentColor`.
    - The portal tones live in `portal.css`: ring in `--fs-muted-fg`, half in the accent, diamond in `--fs-warning`, dot in `--fs-success`.
  - **New `VoteCount.tsx`** (§7):
    - list tally: the number above a visible "vote" or "votes";
    - inline: an `aria-hidden` ▲, a space, the number, then a visually hidden " vote" or " votes", so its `textContent` is `▲ n`.
  - **`KnownIssues`:**
    - §5 rows: marker, title, the inline `VoteCount` (only when n > 0) and the status label, all inside the link;
    - the heading "Pinned issues" for the pinned variant, and the link "See all known issues";
    - no eyebrow; its own colour map is deleted.
  - **`LatestUpdate`:** version and date in a left column, the linked h3 title, the summary, then "All patch notes". No eyebrow.
  - **Checks:**
    - base checks;
    - E2E: issues-voting's landing rows (`^title`, `▲ n`) and portal-landing S2.5;
    - `grep -rn "IssueStatusBadge\|formatPatchDate\|formatSiteDate" src` prints nothing;
    - Look: all portal groups at desktop, plus `critter-connect` at mobile.

- [ ] S11 · The title-plate hero and the build line
  - **`slots/Hero.tsx`** (§5): the plate sits on untouched art, with no scrim.
    - `leftEditorial`: plate in the lower-left, `--fs-radius` on its top-right corner, width `min(58rem, 64%)`.
    - `centeredCinematic` and `trailerBackground`: plate centred on the art's bottom edge; `trailerBackground` adds "Watch the trailer".
    - `split`: text on the left, framed art at 4:3 on the right.
    - No art: the title runs at full scale on `bg`, with no plate.
    - The studio eyebrow is a plain, muted line. At 390 px the plate keeps a 1.25rem right gutter.
    - The plate settles in: `translateY(1.25rem) → 0` over 700 ms, animating transform only, gated by the S9 rules.
  - **Build line:** under the plate, built from `availabilityFacts(project)` (exported from `slots/Availability.tsx`). It shows release state, version and platforms as separate items, with no `·` join.
  - **`Availability`:** "Where to play" as rows (platform name linked, then its label). It renders only when there are platforms or a note, with no eyebrow and no `→`.
  - **Checks:**
    - base checks;
    - E2E: `section.fs-hero img`, the hero's `.fs-btn-primary` href, the h1, section order;
    - Look: all portal groups, both widths, including the bare landing (the no-art variant).

- [ ] S12 · The remaining landing sections
  - **`Features`:** the four variants, flat; cards only where they carry media.
  - **`Gallery`:** captions below the images.
  - **`Adaptive`:** plain kind headings (Story, Characters, …); `KIND_LABELS` loses its eyebrows.
  - **`Trailer`:** the heading "Watch the trailer"; `TrailerLite` restyled.
  - **`Community` and `FinalCTA`:** the art becomes a 21:9 band with the text below it on `bg`, never over the art. `FinalCTA` uses its "Play {name}" fallback.
  - **Default headings** per §8 (Features, Join the community).
  - **Cleanup:** `SectionHeader` in `ui.tsx` loses `eyebrow`; delete `.fs-eyebrow` and the scrim rules from `portal.css`.
  - **Checks:**
    - base checks;
    - E2E: the trailer's click-to-load "Play video", the features text, section order;
    - `grep -rn "eyebrow=" src/site-templates` prints nothing;
    - Look: all portal groups, both widths.

- [ ] S13 · Patch notes pages
  - **New `PageHead.tsx`:** the page title, one line of purpose, and an optional action.
  - **`PatchNotesFeed.tsx`:**
    - each entry is an `li` with the version in a fixed left column (its own element, holding exactly the version text), then the date, the h2 link title and the summary;
    - dividers only between items; at 390 px the version sits above the rest;
    - `nav[aria-label=Pagination]` holds "Newer updates", "Page n of m" and "Older updates" as separate items;
    - the §8 empty state.
  - **List and paged pages:** `PageHead` with "Patch notes", "Every update to {game}, newest first." and the "RSS" link (exact text). Titles: "{game} patch notes" and "{game} patch notes, page n".
  - **Detail page:** the back link "All patch notes", a version and date meta line, the display h1, and prose in a 46rem column.
  - **E2E:** patch-notes:107 becomes `'Older updates'`.
  - **Checks:**
    - base checks;
    - E2E: feed order, `v1.0.12` exact, RSS, pagination, detail rich text, the rename banner, caching;
    - Look: all portal groups, both widths, including the bare project's patch notes (the empty state).

- [ ] S14 · Issues list, board and filters
  - **`issues/page.tsx`, head:** `PageHead` with "Known issues", "Bugs the {game} team knows about. Vote on the ones that affect you." and a "Report a bug" action. Title: "{game} known issues".
  - **List rows (§5):**
    - a `VoteCount` tally column;
    - an h2 link holding only the title;
    - a meta row with `IssueStatus`, the category and a "Pinned" tag (no 📌);
    - the summary.
  - **Board:**
    - one `<section aria-labelledby="fs-board-<STATUS>">` per status, with the §5 h2: `StatusMark`, a span holding only the label (it carries the id), and `.fs-count`;
    - a `ul` of cards, each with the title link, the inline `VoteCount` and the Pinned tag;
    - "None" in an empty column;
    - 16rem columns that scroll sideways with snap.
  - **Empty states:**
    - no match: "No issues match these filters." plus a "Clear filters" link;
    - no issues at all: "No known issues right now. Found a bug? Report it."
  - **`IssueFilters.tsx`:**
    - visually hidden labels for the search box and both selects;
    - the placeholder `Search issues…`, the combobox order (category, then sort) and the Board/List view names stay as they are;
    - at 390 px it wraps: search at full width, then the selects, then the toggle.
  - **E2E:** issues-voting:169 becomes `page.getByRole('region', { name: label, exact: true })`. issues-voting:173 becomes `[pinned.title]`, plus `expect(column('Investigating')).toContainText('Pinned')`.
  - **Checks:**
    - base checks;
    - E2E: the S4.x filters, board, sorting and isolation;
    - Look: all portal groups, both widths, including the bare project's issues (the empty state).

- [ ] S15 · Issue detail and the vote button
  - **`issues/[slug]/page.tsx`:**
    - the back link "All known issues";
    - a meta row: `IssueStatus`, category, "Pinned" tag;
    - the display h1, then the summary as the lead, then the vote;
    - one surface `<aside>` whose heading uses `StatusMark` (the diamond): needs more info, workaround, or fixed in `v2.1.0 — Harbor hotfix` (a link). It replaces the amber, purple and green callouts and their `dark:` twins.
    - prose details at 68ch.
  - **`VoteButton.tsx` (§7):**
    - the button holds only the `aria-hidden` ▲, "Upvote" or "Upvoted", and `<span class="fs-vote-count">` with one number;
    - outside it sit the `aria-hidden` "+1"/"−1" ghost and the helper line, "One vote per browser. Select it again to take your vote back.";
    - server messages are still shown; the network fallback reads "Your vote didn’t count. Reload the page and try again.";
    - the `#111` fallback goes; the pressed state is the accent fill.
    - Motion: the count rolls in 180 ms (a transform on the single number), the ghost runs 450 ms and the fill 150 ms. All of it stops under the S9 rules.
  - **E2E:** issues-voting:293 becomes `button(on).locator('.fs-vote-count')`.
  - **Checks:**
    - base checks;
    - E2E: vote toggle and persistence, the button name `/^Upvoted?\s*\d+$/`, the `article aside` texts, the fixed-in link, the hidden unreleased note;
    - Look: all portal groups, both widths (the issue detail with a callout, and the plain one).

- [ ] S16 · The report form, with shared form primitives
  - **New `FormField.tsx`:** label, control, and a hint linked by `aria-describedby` that sits outside the `<label>`, so label names stay stable.
  - **New `FormNotice.tsx`:** success uses `role="status"` and errors `role="alert"`. Its text is in `--fs-fg` beside a status shape, so colour never carries the message alone.
  - **`report/page.tsx`:**
    - `PageHead` "Report a bug", then "Tell the {game} team what went wrong." and "Check the known issues first: if your bug is there, vote on it." (with a link).
    - A surface panel holds the form: Title; What happened? (hint below it); Category; Email (optional) beside Platform (optional), one column at 390 px; Game version (optional); Turnstile; "Send report".
    - Success: "Report sent. The {game} team can see it now."
    - Error: "Your report wasn’t sent, so nothing reached the studio. Check the fields, complete the verification and send it again."
    - The external and Tally variants keep "Open report form".
    - Title: "Report a bug in {game}". `TurnstileField` follows the form's rhythm.
  - **E2E:** reports-contact:65 becomes `'What happened'`, :66 `'Category'`, and :72 `'Report sent.'`.
  - **Checks:**
    - base checks;
    - E2E: the S5.x report flows, the Turnstile submit, the external and Tally variants;
    - Look: all portal groups, both widths (report, report error, the focus shot).

- [ ] S17 · The contact form and Tally embeds
  - **`contact/page.tsx`:**
    - `PageHead` "Contact", then "Questions, feedback or press requests go straight to the {game} team. For bugs, use the report form."
    - Fields use `FormField` and banners use `FormNotice`; the button stays "Send message".
    - Success: "Message sent. If you left an email address, the {game} team can reply to it."
    - Not configured: "{game} hasn’t set up a contact form yet", then "Reach the team through the links in the footer."
    - "Open contact page" stays.
  - **`TallyEmbed.tsx`:**
    - an invalid URL shows "This form isn’t available right now.";
    - the footnote reads "This form is hosted by Tally.";
    - `fs-*` styling.
  - **E2E:** reports-contact:319 becomes `'set up a contact form yet'`.
  - **Checks:**
    - base checks;
    - E2E: the Discord, email, external, Tally and not-configured contact flows;
    - `grep -rnE "Field (Notes|Board|report)|Track type|Studio Route|the signal" src/app src/components src/site-templates` prints nothing;
    - Look: all portal groups, both widths (contact, contact submitted), including the bare project's contact page (not configured).

- [ ] S18 · Critwire marketing shell
  - **`(frontend)/layout.tsx`:** `cw-root` on `<body>`. Remove `InitTheme` and `Providers`; `AdminBar`, `Header`, the page content and `Footer` stay.
  - **New `(frontend)/marketing.css`,** imported by `globals.css` with `layer(components)`. On `.cw-root` it sets:
    - the §3 tokens: `#f6d33c`, `#1d1f55`, `#f2f3f8`, `#4a4d6e`;
    - the shadcn variables, re-pointed: `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted-foreground`, `--border`, `--ring`;
    - the §10 `--prose-*` values;
    - §4's Critwire type: Anybody for headings, Atkinson for body;
    - focus: a 2px Ink outline with offset, yellow on the ink footer;
    - the reduced-motion mirror of the portal rules.
  - **`Header/Component.tsx` and `Footer/Component.tsx`:** Server Components with the text wordmark "Critwire" (Anybody wdth 130, w800).
    - Header: transparent, 4.5rem tall, in normal flow, with "Demo portal" (`/g/critter-connect`) and "Sign in" (`/admin`). At 390 px: the wordmark and "Sign in".
    - Footer: an ink band with the wordmark, "Demo portal", "Sign in" and the copyright.
  - **Delete:** `providers/**`, `components/Logo/Logo.tsx`, `[slug]/page.client.tsx` and its use, and the `html{opacity:0}` hack.
  - **`heros/HighImpact`:** becomes a Server Component with no header-theme plumbing.
  - **`(frontend)/not-found.tsx`:** paper background, a large "404", "There’s no page at this address." and "Go to the home page".
  - **Checks:**
    - base checks;
    - E2E: tenant-isolation's marketing Draft Mode and preview tests;
    - `grep -rn "useHeaderTheme\|InitTheme\|githubusercontent\|Payload Logo" src` prints nothing;
    - Look: `marketing`, both widths.

- [ ] S19 · Critwire home page `/`
  - **Files:**
    - new `components/marketing/MarketingHome.tsx` and `IssueLoop.tsx`, both Server Components;
    - `(frontend)/page.tsx` renders `MarketingHome` with its own metadata;
    - `[slug]/page.tsx` loses the `homeStatic` fallback (with no CMS `home` page, `/home` now 404s);
    - delete `endpoints/home-static.ts`.
  - **Content (§5):**
    - The yellow slip hero is pulled up under the header with `margin-top: calc(-1 * var(--cw-header-h))`. It holds:
      - the h1 "A public home for your game’s patch notes, known issues and bug reports.";
      - the lede;
      - "See a live portal" (`/g/critter-connect`) and "Sign in".
    - `IssueLoop`: an `<ol>` of the four stages (A player reports it, You publish it, Players vote it up, You ship the fix), with Critter Connect's real content and Ink `StatusMark` markers.
    - Then, on paper, "What players get on your portal" as a `<dl>` of Patch notes, Known issues, Bug reports and Your game’s site. Each entry links into the demo. The h2 is sticky at one-third width; everything stacks at 390 px.
    - Claims cover only what's built: no pricing and no custom domains.
  - **Motion:** the wire draws down over about 2.2 s. Stages appear at 0, 0.6, 1.2 and 1.8 s; the third marker fills halfway and the fourth fully. It's CSS only, and reduced motion shows the end state.
  - **Checks:**
    - base checks; E2E;
    - neither `MarketingHome` nor `IssueLoop` has `'use client'`;
    - Look: `marketing`, both widths.

- [ ] S20 · Critwire CMS pages restyled
  - **Files:** `[slug]/page.tsx`, `heros/{HighImpact,MediumImpact,LowImpact}` and `blocks/{Content,CallToAction,MediaBlock}`.
  - **Restyle:**
    - paper background with the S18 header and footer;
    - an Anybody h1 and a 62ch prose column;
    - `Button` and `CMSLink` styled through the re-pointed shadcn variables;
    - no `dark:` or `data-theme` left.
  - **Checks:** base checks; E2E (tenant-isolation's marketing tests); Look: `marketing`, both widths (`/about-critwire` and the 404).

- [ ] S21 · Port the legacy game blocks, and delete the dead style layers
  - **Legacy blocks:** `src/blocks/game/*` and `GameButtons.tsx` move mechanically from `cc-*` to `fs-*` classes (buttons, panels, headings). No redesign.
  - **`globals.css`** ends as the shared entry only (§10). Delete:
    - `--ds-*`, including `--ds-gem-*`;
    - `cc-*`, `glass-*` and `glow-*`;
    - the shadcn `:root` and `[data-theme='dark']` palette, and the chart and sidebar tokens;
    - the `dark` custom variant, once nothing uses `dark:`.
  - **Checks:**
    - base checks;
    - E2E: tenant-isolation still renders a `gameHero` block landing;
    - every audit under Verification prints nothing;
    - delete the `dev` row, then `pnpm build`;
    - Look: all groups, desktop. Nothing has lost its styles, and the legacy landing sits in the studio's frame.

- [ ] S22 · The "after" set, quality probes and the before/after index
  - **Add probes to the harness** in `tests/screenshots/probes.ts`. They use `expect.soft`, run only when `SHOTS_SET=after`, and also write their results to `after/checks.json`:
    1. At 390 px, no page scrolls sideways (`scrollWidth ≤ innerWidth`).
    2. At 390 px, buttons, form controls and header links are at least 44 px tall.
    3. In the focus shots, the focused element has a 2px solid outline in the root's `--fs-fg` (portal) or in Ink (marketing).
    4. `document.getAnimations().length === 0` on the landing and `/` after load (reduced motion).
    5. Prose on patch-note and issue detail renders in `--fs-fg` (F5).
    6. No request goes to `fonts.googleapis.com`, `fonts.gstatic.com` or `raw.githubusercontent.com`.
    7. Every portal page has exactly one `.fs-root`.
  - **Shoot:** `rm -rf /srv/critter-ai/agent-state/missions/design-pass/screenshots/after`, then `SHOTS_SET=after SHOTS_DIR=/srv/critter-ai/agent-state/missions/design-pass/screenshots pnpm screenshots`.
  - **Checks:**
    - 102 PNGs, and `index.html` pairs every image (no "not captured");
    - probe failures are fixed here if they're small (run E2E if the fix changes markup); otherwise they become the first inputs to S23;
    - fill in the after row of the Screenshot record.

- [ ] S23 · Self-critique from the screenshots, and its fixes
  - **Review:** open the after PNGs next to their befores in `index.html`. At minimum, cover all three themes of the landing, issues, board, issue detail and report, plus `/`, at both widths.
  - **Critique against the skill:**
    - the five generic clusters;
    - the typographic tells: one accented word, all caps, labels above content, `·` joins, "WORD — fragment", mono data labels, arrows;
    - boldness spent only on the Critwire slip and the portal plate, with the ops pages calm;
    - one motion moment per surface;
    - copy: sentence case, active voice, errors that say what to do, empty states that invite an action;
    - white-label: Riso lime must look designed, not broken;
    - the quality floor (the S22 probes);
    - Chanel's rule: remove one accessory per surface.
  - **Record** `### Self-critique` under Decisions: the findings, the concrete change list (file and change) and what was removed.
  - **Apply the list.** If it doesn't fit one session, apply the most important items and add the rest as S23b and onwards, before S24.
  - **Re-shoot** the after set with the S22 command.
  - **Checks:** base checks; E2E; clean probes; fill in the post-critique row of the Screenshot record.

- [ ] S24 · Final verification and Summary
  - **Verify:**
    - Run all of Verification in order, E2E first.
    - Copy `playwright-report/` to `/srv/critter-ai/agent-state/missions/design-pass/e2e-final/`.
    - Delete the `dev` row, then run `pnpm payload migrate:status` and `pnpm build`.
    - Run the audits.
    - Re-shoot the after set if anything changed since S23's capture.
  - **Summary:**
    - the final design plan as built (palette, type, layout concept, principles; §3–§6 plus deviations);
    - what the self-critique changed;
    - the screenshot index path, and the E2E artifact path with its command;
    - the check results;
    - the review verdicts: Fable APPROVE_WITH_CHANGES; Astra skipped (usage limit);
    - handoff items waiting on the owner (H6, plus any new ones);
    - the deviations recorded under Decisions.
  - **Close:** set `status: done` in the front matter, commit, and push `agent/design-pass` (don't merge).

### Risks while executing

- **Google Fonts is fetched on every build** (E2E, the harness, `pnpm build`). If a fetch fails, retry once. If it keeps failing, switch to `next/font/local` (see Rejected alternatives) and record it under Decisions.
- **`@import … layer(components)`** may not be supported. Fallback: wrap the file's contents in `@layer components`.
- **Payload may reject `''` colours** in the harness's `default` theme. Send `null` colours instead; `normalizeSiteInput` treats both as unset.
- **Turnstile loads from Cloudflare at runtime.** A slow widget fails that shot's `settle` (S2: one mobile "Contact, sent" of 102). Re-shoot just that test with `SHOTS_SKIP_BUILD=1 … --grep "<label>"` straight after the run; `meta.json` records both runs. Fail twice in a row on the same page and it's the page, not the network.
- **Theme waits:** if a CC ops page never matches the landing's `style`, that's a revalidation bug from S5, not harness flakiness. Fix it; don't raise the timeout.
- **Mixed visuals mid-pass are expected:** new frames around old ops-page bodies until S13–S17. Each Look judges only its own step's pages.
- **The harness's build bakes port 3200.** Use `SHOTS_SKIP_BUILD=1` only straight after a harness run, never after E2E (3100), or media URLs point at a dead port.

## Verification

E2E comes first. Run everything from the worktree root, one job at a time, with no `pnpm dev` or `pnpm start` running. Nothing is tested in isolation: no new int tests are written, and the three existing int files stay as they are. So there is no Failure modes section.

**Commands and what they must show**

1. `pnpm test:e2e`
   - Every test passes, 0 failed, no retries. That's 73 tests at baseline; S5 adds a step to an existing test, not a new test.
   - Artifact: `playwright-report/`, with a trace and a screenshot per test. The final run is copied to `/srv/critter-ai/agent-state/missions/design-pass/e2e-final/`.
   - Reproduce with `pnpm test:e2e`. View with `pnpm exec playwright show-report /srv/critter-ai/agent-state/missions/design-pass/e2e-final`.
2. `pnpm exec tsc --noEmit`: exit 0.
3. `pnpm lint`: 0 errors and no more than 23 warnings (the baseline), none in files this mission added.
4. `pnpm test:int`: 3 files, 9 tests pass. `site-config-parity` passes untouched, since no enum changes.
5. Build:
   - First run `psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -c "delete from payload_migrations where name='dev'"`.
   - `pnpm payload migrate:status` shows every migration run, including `*_design_default_theme`.
   - `pnpm build` exits 0.
   - `grep -rlE "fonts\.(googleapis|gstatic)\.com" .next/static` prints nothing: the fonts are self-hosted, with no runtime requests.

**E2E scenarios this pass touches.** Each keeps its meaning:
- **portal-landing:**
  - S2.1: identical 404s, now inside `SiteRoot`;
  - S2.2: sentence-case nav labels, facts, section order;
  - S2.3: the white and `#123456` accents against the new default;
  - S2.4: publishing, plus the new step, "ops pages follow the published theme";
  - S2.5: known-issue rows;
  - S2.6: the header logo.
- **patch-notes:** feed and pagination ("Older updates"), detail rich text, the rename banner, ISR revalidation.
- **issues-voting:** filters, board regions and the pinned tag, the `.fs-vote-count` vote button, landing rows.
- **reports-contact:** report labels and success, contact flows, "not configured".
- **tenant-isolation:** marketing Draft Mode and preview, and the legacy `gameHero` landing.
- **admin-triage:** untouched; the admin is out of scope, but it must still pass.

**Screenshots.** The harness runs Playwright against a production build on port 3200 and drops and re-seeds the `_e2e` database on every run, so never run it alongside `pnpm test:e2e`. `DIR=/srv/critter-ai/agent-state/missions/design-pass/screenshots`.

```
SHOTS_SET=before SHOTS_DIR=$DIR pnpm screenshots                           # full before set (S2)
SHOTS_SET=before SHOTS_DIR=$DIR SHOTS_THEMES=default pnpm screenshots
SHOTS_SET=before SHOTS_DIR=$DIR SHOTS_THEMES=critter-connect pnpm screenshots
SHOTS_SET=before SHOTS_DIR=$DIR SHOTS_THEMES=riso pnpm screenshots
SHOTS_SET=before SHOTS_DIR=$DIR SHOTS_THEMES=marketing pnpm screenshots
SHOTS_SET=after  SHOTS_DIR=$DIR pnpm screenshots                           # full after set (S22, S23, S24)
SHOTS_SET=after  SHOTS_DIR=$DIR SHOTS_THEMES=default pnpm screenshots
SHOTS_SET=after  SHOTS_DIR=$DIR SHOTS_THEMES=critter-connect pnpm screenshots
SHOTS_SET=after  SHOTS_DIR=$DIR SHOTS_THEMES=riso pnpm screenshots
SHOTS_SET=after  SHOTS_DIR=$DIR SHOTS_THEMES=marketing pnpm screenshots
# one width: append --project desktop (1440×900) or --project mobile (390×844)
# per-step Looks use SHOTS_DIR=/tmp/design-pass-wip, never $DIR
```

The before set must come from a commit whose `src` equals `669376c`. Each run writes `<set>/meta.json` (commit, UTC time, command), and `index.html` shows it.

Screenshot record:

| Set | Step | Commit | UTC | Command | PNGs | Probes |
|---|---|---|---|---|---|---|
| before | S2 | `f86f948` (src = `669376c`) | 2026-09-29 06:47–06:53 | full set, then `SHOTS_THEMES=critter-connect SHOTS_SKIP_BUILD=1 … --project mobile --grep "Contact, sent"` (see Log) | 102 | n/a |
| after | S22 | | | | | |
| after, post-critique | S23 | | | | | |
| after, final (if re-shot) | S24 | | | | | |

**Quality floor, and what proves each part**

- **Responsive down to 390 px:**
  - the `mobile` project captures every page;
  - probe 1: no page scrolls sideways; only the nav link row and the board scroll, inside their own containers;
  - probe 2: 44 px targets;
  - review the 390 column in `index.html`.
- **Visible keyboard focus:**
  - the report Title field and the landing CTA reached by `Tab` are shot under `default`, `critter-connect` and `riso`, and marketing links are checked in the `marketing` Look;
  - probe 3: a 2px solid ring in `--fs-fg` (portal) or Ink (marketing).
- **`prefers-reduced-motion`:**
  - every capture runs with `reducedMotion: 'reduce'`;
  - probe 4: no running animations on the landing or `/`;
  - every animation and transition in `portal.css` and `marketing.css` sits behind the `prefers-reduced-motion: reduce` and `[data-fs-motion='off']` rules.
- **Contrast, for all three themes including Riso lime:**
  - (a) Each palette passes the schema's six WCAG pairs, or its publish fails the run: Slate & signal through E2E S2.3 and S2.4, Night canopy through the seed, and Riso lime through the harness publish.
  - (b) The §2 contract audits below.
  - (c) Probe 5: prose renders in `--fs-fg` on every theme.
  - (d) Marketing: `pnpm exec tsx -e "import { contrastRatio as c } from './src/site-templates/flagship-game-v1/schema/contrast'; for (const [f, b] of [['#1d1f55','#f6d33c'],['#4a4d6e','#f6d33c'],['#1d1f55','#f2f3f8'],['#4a4d6e','#f2f3f8'],['#f6d33c','#1d1f55'],['#f2f3f8','#1d1f55']]) console.log(f, b, c(f, b).toFixed(2))"` prints at least 4.50 on every line.
- **No runtime third-party font requests:** probe 6, plus the build grep in command 5.

**Audits.** Run them from the worktree root. Each must print nothing.

```
P='src/app/(frontend) src/app/(public) src/components/game src/components/marketing src/components/RichText src/site-templates src/blocks src/heros src/Header src/Footer'
grep -rnE "(^|[;{[:space:]])color:[[:space:]]*var\(--fs-(accent|border|success|warning|error)\)" 'src/app/(frontend)/portal.css'   # §2: never as text
grep -rnE "text-(\(|\[var\()--fs-(accent|border|success|warning|error)" $P
grep -rnE "\b(cc|glass|glow)-[a-z]|--ds-|dark:|#111\b|(text|bg|border)-(slate|cyan|emerald|amber|violet|purple|green|blue)-[0-9]" $P
grep -rnE "uppercase|font-mono" $P
grep -rnE "→|←|📌|' · '" $P
grep -rnE "Field (Notes|Board|report)|Track type|Studio Route|the signal|Payload Logo|githubusercontent" $P
```

**Artifacts**

- `/srv/critter-ai/agent-state/missions/design-pass/screenshots/index.html`: every before/after pair. Alongside it are `before/` and `after/`, each with a `meta.json`, plus `after/checks.json`.
- `/srv/critter-ai/agent-state/missions/design-pass/e2e-final/`: the final Playwright HTML report, with traces and screenshots.
- `/srv/critter-ai/agent-state/missions/design-pass/e2e-baseline/`: the pre-change report, for comparison.

## Decisions

- **Keep the "Powered by Critwire" credit (proposed at the Revision stage, 2026-09-29).**
  - **What:** `SiteFooter`, now on every portal page, keeps it as one quiet muted line beside the copyright, linking to `/`. Both chromes carry it today (`PortalChrome.tsx:101-104`, `SiteFooter.tsx:69-72`), so nothing is removed.
  - **Why keep it:** `docs/features.md:173-174` prices it. FREE includes "platform branding" and INDIE sells "remove branding". Deleting it now would give that paid option away before billing (Phase 9) exists, and drop the product's only in-portal referral.
  - **Why it fits white-label:** white-label here means the studio's name, art, theme and words lead, and one muted footer line doesn't compete with them.
  - **What still goes:** the Tally footnote that named Critwire (F9) is an admin-facing aside, not the credit, so it's still removed.
  - **Reversal:** one line in `SiteFooter` if the owner disagrees. The per-tier toggle belongs to Phase 9.

- **S1: the harness shares E2E code instead of copying it (2026-09-29).** `requireDisposableDatabase()` and the webServer env (`serverEnv({ cronSecret })`) moved from `playwright.config.ts` into `tests/e2e/support/env.ts`, and `contentLayout` from `tenant-isolation.spec.ts` into `tests/e2e/support/fixtures.ts`. This widens §10's file map. The E2E list is unchanged (73 tests; only line numbers in tenant-isolation moved).
- **S1: how the harness differs from the Steps as written (2026-09-29).**
  - **`default` theme:** publishes `siteThemeSchema.parse({})` imported from the tree under test, not ten `''` colours. Each build still renders its own default (old navy/cyan before, Slate & signal after), and the wait checks the exact `--fs-bg` instead of "differs from the CC baseline". `riso` waits on `--fs-bg: #eef4d2` as planned.
  - **Page list:** one catalog (`tests/screenshots/catalog.ts`) drives both the capture spec and `index.html`, so the index can list "not captured" for any page.
  - **Settling:** waits for `load`, every image decoded (lazy ones forced eager, for full-page captures), the Turnstile token where a form has one, and `document.fonts.ready`. Not `networkidle`: the Turnstile widget keeps the network busy, so report and contact never settled (smoke run 1: 5 timeouts).
  - **`meta.json`** keeps a `runs` list (commit, dirty flag, UTC start, the reproducing command), so partial re-shoots don't hide the earlier runs; `index.html` shows every run.
  - **Mobile** captures at `deviceScaleFactor: 2`, so the 390 px shots stay legible in the critique; desktop at 1.

## Log

- 2026-09-29 05:13 UTC · Baseline: E2E db and env set up, migrations applied; tsc pass, lint 0 errors/23 warnings, int 9/9, E2E 73/73.
- 2026-09-29 05:44 UTC · Architecture: `architect` wrote the design plan (tokens, type, layouts, brief review, file map, E2E impact, screenshot harness). Added handoff H6 (prod demo seed, CMS home page, marketing contact), blocking nothing. No code changed, so no checks run.
- 2026-09-29 05:50 UTC · Fable review: `architecture-reviewer` verdict APPROVE_WITH_CHANGES, 4 MUST-FIX (prose colour mapping, vote button name, CSS-only status marker, board region name) for the Revision stage. Plan-only change, no checks needed.
- 2026-09-29 05:51 UTC · Astra review: skipped, astra-review exit 3 (usage limit). Plan-only change, no checks needed.
- 2026-09-29 06:00 UTC · Revision: `architect` resolved all 4 Fable MUST-FIX items (prose vars via tailwind.config, VoteButton name, CSS-only StatusMark, label-only board region name), the 3 MISSED items (SiteRoot carries font classes; revalidateGameLanding scope kept; "Powered by Critwire" kept, see Decisions) and adopted the SHOULD-CONSIDER items. Plan-only change, no checks needed.
- 2026-09-29 06:20 UTC · Steps: `planner` wrote 24 steps (S1 harness, S2 seed + before shots, S3–S21 build, S22 after shots + index, S23 self-critique, S24 final verification) and the Verification section. Plan-only change, no checks needed.
- 2026-09-29 06:42 UTC · S1: screenshot harness (`playwright.screenshots.config.ts`, `tests/screenshots/*`, `pnpm screenshots`), E2E env/fixtures shared. tsc pass; lint 0 errors/23 warnings; `playwright test --list` same 73 tests; harness lists 103 (setup + 102 shots); smoke `SHOTS_THEMES=critter-connect --project desktop` 15/15 passed, 14 PNGs + index.html showing CC art; `git diff --stat 669376c -- src public …` empty.
- 2026-09-29 06:55 UTC · S2: mission DB built (`pnpm build` pass, first on the mission DB), dev super admin + tenant created over REST (credentials in `agent-state/missions/design-pass/dev-admin.txt`, 600), `pnpm seed:critter-connect` ok, `/g/critter-connect` 200. Before set: full run 102/103 passed (mobile CC "Contact, sent": Turnstile widget never rendered), that test re-shot and passed; 102 PNGs + `index.html` (all before images, after side "not captured"). Looked at landing/issues/report/`/` under all themes: Riso landing light, ops pages navy/cyan under every theme (F1, expected), `/` the Payload template. No source change, so no E2E.

## Summary
