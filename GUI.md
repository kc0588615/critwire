# GUI — cw design language

Use this guide and the accompanying skills to build with the supplied theme. The download contains Markdown guidance and theme references. Implement the theme in the receiving app’s existing styling system and components.

## Add to a project

Keep `GUI.md` and `gui/` at the project root. The install command places the three skills in the project’s `.agents/skills/` directory. When using the ZIP instead, copy the three folders in `skills/` there, preserving any existing skills and local edits. Add a short pointer to the project’s active agent instructions: “For UI work, follow GUI.md and use graphical-ui, graphical-convert, or graphical-audit as appropriate.” Preserve the instructions already there. Agents with other conventions can follow this guide directly.

For initial setup, inspect the app’s styling system, shared components, and their consumers before changing styles. If the user has not specified a conversion scope, ask once: **“How would you like to apply this theme?”**

- **Convert the whole app** — update existing shared components and their usage across screens.
- **Convert selected areas** — identify the pages or components and account for shared changes that could affect other screens.
- **Keep the current UI for now** — install the guidance for future work without changing application styles, components, or runtime dependencies.

Wait for the choice before changing application styles. Honor an already specified scope without asking again; a request for one component does not authorize a whole-app conversion. For selected areas, resolve any missing scope and contain shared changes using the app’s existing mechanisms. For guidance-only setup, finish installing the Markdown and instruction pointer, then stop without applying global tokens. The supplied references do not authorize later conversion outside a requested UI task.

For conversion, use `graphical-convert`, including its shadcn mapping guidance when applicable. Read the [theme reference](gui/themes.md) and linked effective component assignments. Implement the chosen scope in the app’s current theme system and shared components, covering parts, variants, sizes, states, and modes. Global token changes alone do not complete conversion. Preserve framework, routing, behavior, dependencies, and intentional local customizations; unchanged library defaults are not automatically intentional exceptions. Add only missing packages required by the implementation using the project’s package manager and version policy.

Finish conversion with `graphical-audit` to find and fix remaining gaps against the agreed target within the chosen scope. Report each component as converted, already matches, intentionally preserved, or blocked, with evidence or a reason, plus actual verification and any gaps. Skill files can be read directly from `.agents/skills/` (or `skills/` in the ZIP) when the agent does not discover them automatically.

Fonts are references only. Users must license, download, and configure their own font files. Preserve the named families, weights, and fallback stacks; report unavailable fonts rather than downloading or substituting them silently.

## Find the actual theme values

The [theme index](gui/themes.md) links to the included project’s literal font families and weights, text sizes, line heights, letter spacing, spacing, radii, borders, shadows, motion, and resolved CSS variables for both modes. Each theme links to its effective component token assignments, including defaults, shared parts, variants, and states.

These references capture the project at download time. After deliberate local customization, the app’s active token definitions and components take precedence. Read only the theme and component sections needed by the task.

## Rules for UI work

- Locate the active theme, color mode, shared components, and nearby patterns before choosing styles. Preserve existing behavior and intentional customizations.
- Use the existing theme vocabulary. Do not introduce colors, text steps, spacing steps, radii, shadows, or motion values to finish a screen. Identify a gap when no suitable choice exists; change the theme when requested.
- Keep named references at use sites. Typography includes font role, weight, size, line height, and letter spacing. Literal values belong in token definitions.
- Reuse shared components and visual roles. Compose new patterns while keeping equivalent controls consistent. Give information a clear home and avoid redundant content.
- Grid tracks, breakpoints, content widths, aspect ratios, and positioning can be structural choices. Preserve verified aliases, meaningful data encodings, and external widgets in context.
- Preserve keyboard focus, accessible labels, form values, interaction states, and theme propagation into portals. Render edges with composed box shadows and zero native border width, retaining opacity and theme stroke placement.
- Preserve dependency versions, ranges, overrides, and lockfiles. Check APIs against installed versions and follow the project’s verification and browser-review policy.

## Read what the task needs

For interface creation or revision, read Interface judgment and Foundations, then the relevant component guide. A small edit does not trigger an application-wide audit.

| Need | Reference |
| --- | --- |
| Ownership, token definitions, shared assignments, and deliberate theme changes | [Theme contract](gui/theme-contract.md) |
| Hierarchy, composition, navigation, charts, and clear controls | [Interface judgment](gui/interface-judgment.md) |
| Color, typography, spacing, surfaces, icons, and motion | [Foundations](gui/foundations.md) |
| Working with Base UI primitives | [Base UI](gui/base-ui.md) |
| Custom markup and existing component libraries | [Custom components](gui/custom-components.md) |
| The downloaded project’s concrete values and assignments | [Theme reference](gui/themes.md) |
| Proportional checks and integration failures | [Verification](gui/verification.md) |

| Request | Skill |
| --- | --- |
| Build or edit UI using the current theme | `graphical-ui` |
| Apply the supplied theme to an existing interface | `graphical-convert` |
| Find theme drift and repair it when requested | `graphical-audit` |

## Local decisions

Critwire's decisions on top of the cw snapshot above, from the mission plan `plans/2026-10-07-cw-theme.md` (Architecture §5, §6 and §11). Everything above this section is the downloaded guidance, unedited. Where a decision and the snapshot disagree, the decision wins.

### Fonts and icons

- **Inter** replaces GT Standard M (paid) for the `ui`, `brand` and `editorial` roles. It's OFL, self-hosted with `next/font/google`, `latin` and `latin-ext`, variable `wght`, loaded with `axes: ['opsz']` so optical sizing works. It's the closest free face: a neutral neo-grotesque in the same Standard/Akzidenz lineage, with horizontal terminals, a straight-legged R, a large x-height, tabular figures and UI-size text cuts; its optical-size axis stands in for GT Standard's size-specific cuts. Geist, Instrument Sans, Schibsted Grotesk and Public Sans were rejected as more geometric or with more character than the original. A licensed GT Standard replaces it in one place, `src/fonts.ts`, behind the role tokens `--font-ui`, `--font-brand` and `--font-editorial`.
- **Geist Mono** (OFL, self-hosted the same way) fills the `data` role ("Sidebar Geist Mono").
- Server-side images (share buttons, badge, favicons, OG) use Inter Medium (InterDisplay Bold for the brand assets), with DejaVu Sans as the per-character fallback (D17).
- **Icons:** `lucide-react` at cw's `--icon-stroke-width` of 2, in place of the paid Central set. No other icon package.

### Accessibility departures

WCAG AA wins over snapshot values: 4.5:1 for text, 3:1 for large text, field boundaries and focus indicators. Each fix uses another cw token, never a new colour.

| # | Where | cw snapshot | Replacement | Ratio before → after |
|---|---|---|---|---|
| A1 | Light primary label (and Form/Dialog action) | neutral-1 on color-1 | neutral-10 (`--cte-accent-text`) | 2.08 → 10.10 |
| A2 | Light danger label | neutral-1 on error | neutral-10 | 3.16 → 6.64 (dark already 6.64) |
| A3 | Field, select and checkbox boundaries, light and dark | `rgb(0 0 0 / .1)`, the same on black | text-muted n7 | light 1.25 → 5.22 (n1), 4.99 (n2); dark ≈1.0 → 8.30 (n1), 6.45 (n2) |
| A4 | Component edges in dark (cards, popups, outline buttons, dividers) | `rgb(0 0 0 / .1)`; n4-transparent | n4 `#37383a`, cw's own dark separator edge | 1.79 on n1, 1.39 on n2, 1.21 on n3 (light edge: 1.25) |
| A5 | Tabs, rest trigger | n6 | text-muted n7, both modes | light 2.95 → 5.22; dark 4.69 → 8.30 |
| A6 | Field error text, light | error as text | n10 text plus an error mark | 3.16 → 21 |
| A7 | Light color-1, success, warning, error as text, links or the only edge | as text | fills and marks only; links underlined in currentColor | color-1 2.08, success 1.47, warning 1.99, error 3.16 on n1 |
| A8 | Toggle pressed / selected | n3 fill only | accent fill (embed), or n3 plus heavy weight (admin switch) | n3 vs n1: 1.14 light, 1.48 dark |
| A9 | Embed light neutral palette accent | color-1 | n10, with n1 on it | 2.08 → 21.00 |
| A10 | Muted text on the light hero band | n7 | n10 on the band only | 4.49 → 18.06 |
| A11 | Focus ring | 50 % n10 mix, kept | 2 px offset, never drawn over a color-1 fill | light 3.95 (n1), 3.95 (n2), 3.87 (n3), 3.84 on the hero band; dark 5.32, 5.09, 4.72, 4.92 on the band |

### Design decisions

- **D1.** Inter replaces GT Standard M for the ui, brand and editorial roles, loaded with `axes: ['opsz']`; Geist Mono for data.
- **D2.** `src/lib/theme/cw.ts` is the single literal source. `src/styles/cw-tokens.css` is generated from it, and `src/styles/cw.css` holds the roles with no `@import`. Each entry point (`globals.css`, `custom.scss`) loads the tokens, then the roles. An int test guards drift and runs in `prebuild`.
- **D3.** Modes use `light-dark()`, with a `color-scheme` per surface.
- **D4.** The dark edge is n4.
- **D5.** Field boundaries use text-muted (n7) in both modes.
- **D6.** Labels on color-1 and on status fills are `#000` in both modes.
- **D7.** Rest tabs use n7, and the selected tab keeps a 2 px bar.
- **D8.** Pressed is the accent fill (embed), or n3 plus heavy weight (admin).
- **D9.** The checkbox stays native, with `accent-color` = text (cw's `controlSize` has no resolved values).
- **D10.** The 44 px tap-target floor is kept over cw's 34 px controls.
- **D11.** Portals: cw dark is the default theme, with `standard` typography, the `SHAPE_RADIUS` steps, density as multiples of `--space-xxl`, and cw's motion curves. The studio's saved theme applies on top.
- **D12.** The portal's two-tone fg/bg focus ring is kept: it's the only ring guaranteed under any valid studio palette, where cw's 50 % ring could fall to about 2:1.
- **D13.** Embeds use the host page's font for every role.
- **D14.** The embed loader: n1/n10 colours, the 22 px pill (cw xl), dialog radius m and padding l, flat. Its `rgba(128,128,128,.4)` edge is kept for unknown host backgrounds (1.61 on white, 1.66 on black).
- **D15.** The wordmark is lowercased with CSS; the DOM text stays "Critwire", and screen readers announce "critwire", deliberately. The favicon is a "c" on color-1; the admin Icon is the small wordmark.
- **D16.** Share buttons keep their published widths (156 / 120 / 136 px). cw's outline Button geometry is centred in them: a 9 px color-1 mark, a 6 px gap and an Inter Medium label at 15 px. Floor `--space-m` of side padding; fallback: the label drops to 13 px.
- **D17.** Inter Medium replaces DejaVu as the images' face. DejaVu Sans stays as the per-character fallback, so studio-written badge text keeps today's script coverage.
- **D18.** The default OG image is `public/og.png`, 1200×630, through one constant.
- **D19.** Emails are cw light, with borders instead of box shadows and cw's fallback font stack; no web fonts.
- **D20.** The Issues kanban is BEM CSS; its count chips are neutral.
- **D21.** Payload: `--theme-*` is overridden unlayered; buttons go through Payload's button variables; only the minimal template gets the field edge.
- **D22.** Tailwind's default design namespaces are reset; the same `@theme` redefines `--font-sans`, `--font-mono` and `--default-transition-*` from cw roles.
- **D23.** Saved portal themes keep their look: a migration writes the old default into every unset slot of the columns whose default changes; set values never change.
- **D24.** cw's 0-opacity shadows stay; separation comes from edges.
- **D25.** Two ordered migrations: the first adds the `standard` typography enum value alone; the second sets the column defaults and completes saved themes.
- **D26.** In Payload's own views, three rules where the error colour meets text: the required asterisk and the errored blocks header get `light-dark(n10, error)`, and the relationship load error's text gets `#000`.
- **D27.** Generators run by hand, with their outputs committed: `generate:theme` (the tokens CSS) and `generate:brand` (favicons, OG). `prebuild` runs only the int tests.
- **D28.** The focus ring's colour is its own role, `--focus-ring-color`; the screenshot probe resolves that same expression.
- **D33.** The share buttons and the email button use cw Button's radius `s` (5 px); the 9 px colour mark uses `xs` (2 px).
- **D34.** The live badge's radius is `SHAPE_RADIUS[shape].control`, since the badge is a control-sized chip; `SHAPE_RADIUS` in `src/lib/game-portal/theme.ts` is the one table.
- **D37.** `light-dark()` ships unrewritten: `next.config.ts` excludes it from Lightning CSS (`experimental.lightningCssFeatures`), as Tailwind does, so each token resolves against the `color-scheme` of the element using it. Keep that exclusion while the tokens use `light-dark()`.
- **D38.** Tailwind's width utilities read `--spacing-*` before `--container-*`, so with cw's spacing names `max-w-xl` is 25 px. Size containers in CSS, not with `max-w-<cw step>`.
- **D40.** Payload's folder drag count (`.drag-overlay-selection__card-count`) sets its text in success-50 on success-600; under the ramp mapping that's a tint on cw's text colour, so its text is the canvas (21:1). Payload's toast close buttons turn a tint on hover over a tint, as in stock Payload; left as they are (G9).

### Selectors into Payload's own views

The only ones: D26's three rules (the required asterisk, the errored blocks header, the relationship load error), D40's folder drag count, the minimal template's field edge and focus ring (`.template-minimal .field-type :is(input, textarea)`, the edge on fields without an error), and the breadcrumb's wordmark slot (`.step-nav__home`). Payload's buttons are themed only by setting its button variables on `.btn--style-primary|secondary|pill|tab`. Everything else in the admin is themed through Payload's documented variables.

### Gaps

The unresolved gaps G1–G8 (Payload's built-in field edges, native `<select>` popups and Turnstile, old-default rows, faint light status marks, and others) are listed in `plans/2026-10-07-cw-theme.md`, Architecture §11, and in that plan's Summary.
