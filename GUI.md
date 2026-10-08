# GUI — cc design language

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

Critwire's decisions on top of the cc snapshot above, from the mission plan `plans/2026-10-08-cc-site.md` (Architecture §3–§5 and §14). Everything above this section is the downloaded guidance (phaser-june `75799a8`), unedited. Where a decision and the snapshot disagree, the decision wins. The game's own implementation of cc (phaser-june's `globals.css`) is followed unless accessibility requires otherwise.

### Fonts and icons

- **Nunito** stands in for GT Maru (paid) in the `ui`, `brand` and `editorial` roles. **Open Runde** takes the `data` role, as in the snapshot. Both are OFL and self-hosted from `public/fonts/nunito/` and `public/fonts/open-runde/`, each folder with its `OFL.txt`, declared in `src/styles/fonts.css` with the game's own `@font-face` rules; no page requests a third-party font host.
- `--face-sans` and `--face-data` in `src/styles/fonts.css` are the one swap point: a licensed GT Maru replaces Nunito there, behind the role tokens `--font-ui`, `--font-brand`, `--font-editorial` and `--font-data`.
- Server-side images (share buttons, badge, favicons, OG) use static **Nunito Bold** from `src/lib/share/fonts/` (ExtraBold for `generate:brand` only), because the renderer reads TTF and not WOFF2. DejaVu Sans stays as the per-character fallback, so studio-written badge text keeps its script coverage. cc's tracking (−0.04 em) is drawn into the images.
- Emails use cc's ui fallback, `sans-serif`; no web font. Embeds use the host page's font for every role. Neither takes cc's tracking or its 700 medium (D17).
- **Icons:** `lucide-react` at cc's `--icon-stroke-width` of 2, in place of the paid Central set. No other icon package.

### Accessibility departures

WCAG AA wins over snapshot values: 4.5:1 for text, 3:1 for large text, field boundaries and focus indicators. Each fix uses another cc token, never a new colour. Ratios are WCAG 2.x, computed as `src/lib/game-portal/contrast.ts` does; light / dark.

| # | Where | cc snapshot | Replacement | Ratio before → after |
|---|---|---|---|---|
| A1 | Labels on color-1 and on status fills (primary and danger buttons, tags, the badge label, the email button) | `--cte-accent-text` n2 (`#fcfbfa` / `#241f16`); the game's buttons use n1 | light **n10** `#000000`; dark **n1** `#051411` (the game's own dark label) | on color-1: light 3.90 → 5.21, dark 4.06 → 4.67; on error 4.05 → 5.19 light, 4.66 dark; on success 9.39 / 8.42; on warning 17.02 / 15.27 |
| A2 | Muted text, light | n7 `#837e72` | **n8** `#595449` | 4.04 → 7.53 on n1; 3.91 → 7.28 on n2; 3.68 → 6.85 on n3. Dark n7 stays: 8.21 / 7.09 / 6.17 |
| A3 | Field, select and checkbox boundaries | n4 at 0 px | 1 px (`--stroke-s`) **text-muted** | light 1.25 → 7.53 on n1 (7.28 on the n2 fill); dark 1.75 → 8.21 on n1 (7.09 on n2) |
| A4 | Component edges (cards, panels, dividers, outline buttons, share images) | `--border-default-color` n4 at 20 %: 1.04 light, 1.08 dark (invisible) | **n4** solid at 1 px, cc's own Separator and outline-Button edge | light 1.25 on n1, 1.21 on n2; dark 1.75, 1.51 (decorative: text or fills identify every control) |
| A5 | Focus ring (critwire's own pages, the admin) | none (`initial`; cc's focus is a 20 % color-1 border, invisible) | the game's ring: 2 px solid color-1, offset 2 px | light 4.03 on n1, 3.90 on n2, 3.67 on n3, 3.14 on the 20 % color-1 banner; dark 4.67, 4.03, 3.51, 3.71 |
| A6 | Fonts | GT Maru (paid) | Nunito (above) | n/a |
| A7 | color-1 and status colours as text | used as text and link colour (Preview card trigger) | fills and marks only, always with a word or shape; links underlined, in currentColor on critwire's own pages and in the accent in portals and embeds (an underline is a mark: color-1 4.03 / 4.67 ≥ 3, and a saved palette's accent passes `siteThemeSchema`) | color-1 4.03 on light n1 and on dark n2 (fails 4.5); success 2.24, warning 1.23, error 4.05 on light n1; error 4.02 on dark n2 |
| A8 | Tabs (share kit, Discord tab, kanban/table switch) | rest n7; selected = n1 fill on the n3 list | rest **text-muted**; selected n1 fill **plus heavy weight** (a non-colour cue) | rest light 3.68 → 6.85 on n3; the selected fill against the list is 1.10 light / 1.33 dark, too faint alone |
| A9 | Pressed toggles (embed filters) | n3 fill | accent fill with accent text; the admin switch: n3 plus heavy weight | n3 vs n1 1.10 / 1.33 → color-1 vs n1 4.03 / 4.67 |
| A10 | Tag chips (`.fs-tag`) | emphasis-type: color-1 with an n2 label | color-1 (the palette's accent) with accent text | 3.90 → 5.21 light; 4.03 → 4.67 dark |
| A11 | Portal nav, the current page | navigation-active (color-1 fill, n2 label) / Navigation menu link selected n3 | the accent bar under the link (kept from cw) | label 3.90 → n10 21; bar color-1 4.03 / 4.67 ≥ 3 |
| A12 | Dark neutrals | cc's warm ramp (`#000000 #241f16 …`) | the game's teal ramp, at the same OKLCH lightness (table below) | text on canvas 21.00 → 18.84; every other pair within 1.12× of the snapshot's |

cc's 0-opacity shadows `s` and `l` stay: cc is flat by design. Shadow `m` shows on light popups only, also as designed. The brand logo's accent `#6FA8BC` is 2.62:1 on white; as a logo it's exempt from 1.4.3 and 1.4.11, and it's used as staged.

### Dark neutrals: snapshot and game

The game keeps cc's lightness for each dark step with a cool green-teal hue (OKLCH h 180), so its panels and the game board read as one surface. Critwire follows the game (D2). Light neutrals are the snapshot's in both. This table is documentation, and no test parses it; `SNAPSHOT_DARK_NEUTRALS` in `src/lib/theme/tokens.ts` is the copy the `theme-tokens` int test checks against `gui/themes/cc.md`.

| Step | Snapshot (`cc.md`, dark) | Game (used) |
|---|---|---|
| neutral-1 | `#000000` | `#051411` |
| neutral-2 | `#241f16` | `#142320` |
| neutral-3 | `#2f2a21` | `#1f2e2b` |
| neutral-4 | `#413c32` | `#30413d` |
| neutral-5 | `#5b564b` | `#4a5b57` |
| neutral-6 | `#888377` | `#768884` |
| neutral-7 | `#b0aa9e` | `#9dafab` |
| neutral-8 | `#d4cec2` | `#c7d1cf` |
| neutral-9 | `#f5f4f1` | `#ecf7f4` |
| neutral-10 | `#ffffff` | `#ffffff` |

### Design decisions

- **D1.** Theme-neutral names: `src/lib/theme/tokens.ts` (`TOKENS`), the generated `src/styles/tokens.css`, `src/styles/fonts.css`, `src/styles/roles.css`, and the int test `theme-tokens`. No cw value or theme-named identifier remains (migration history excepted).
- **D2.** Dark neutrals follow the game (A12). `tokens.ts` keeps the snapshot's beside them (`SNAPSHOT_DARK_NEUTRALS`), so the code records exactly what it departs from.
- **D3.** Modes are `light-dark()` with a `color-scheme` per surface, and the light value as the fallback for browsers without `light-dark()`: tokens set their light value first and the `light-dark()` pair inside `@supports`; portal and embed palettes map `--fs-light-*`/`--fs-dark-*` the same way.
- **D4.** Labels on color-1 and on status fills: n10 in light, n1 in dark (A1).
- **D5.** Field boundaries: 1 px text-muted (A3).
- **D6.** Component edges: 1 px n4, cc's Separator edge (A4).
- **D7.** cc's border steps are all 0 px, so stroke widths are critwire's own: `STROKE` s 1 / l 2, generated as `--stroke-s`/`--stroke-l`, replaces every use of `--border-*` as a width. cc's 0 px `--border-*` steps stay defined and unused.
- **D8.** Focus: the game's 2 px color-1 ring, offset 2 px, on critwire's own pages and in the admin. Portals and embeds keep the two-tone fg/bg ring, the only ring guaranteed under any valid saved palette.
- **D9.** Type scale: UI text s; prose and the email body m; lede l; h3 l; h2 xl; h1 xxl; meta s, medium weight, muted; fine print xs; tracking −0.04 em throughout on cc's faces (D17).
- **D10.** The 44 px tap floor (`TAP_MIN`, generated as `--tap-min`) stays, and now equals cc's own control height (padding s + line s + 12).
- **D11.** `SHAPE_RADIUS` gains `button` (sharp: zero; balanced and soft: full), written as `--fs-radius-button`; buttons are cc pills.
- **D12.** Tabs are cc's segmented control: rest text-muted, selected n1 plus heavy weight (A8).
- **D13.** Pressed toggles: the accent fill in embeds; n3 plus heavy weight for the admin switch (A9).
- **D14.** The checkbox stays native, with `accent-color` set to the accent.
- **D15.** Cards and notices: the surface fill, the A4 edge, cc's shadow m and `--fs-radius`.
- **D16.** Fonts: Nunito and Open Runde through `fonts.css` from `public/fonts/`; `--face-sans`/`--face-data` are the one swap point. Images use static Nunito Bold (ExtraBold for the generator) with DejaVu per character, and draw cc's tracking.
- **D17.** cc's −0.04 em tracking and its 700 medium belong to its faces. Surfaces set in another face take neither: embeds (the host page's font) set every `--letter-spacing-*` to `normal` and medium to regular in `embed.css`, and the emails (`sans-serif`) do the same in `email/templates/styles.ts`. Titles stay heavy, so the hierarchy reads as it did on cw. The share images draw Nunito, so they keep both.
- **D18.** Inline `code` (rich text, the share kit's sentences, the reported page's path): the data face at 0.875 em, regular, in a chip with a 1 px n4 edge (A4), radius xs and padding xxs at the sides, closed on each line it wraps onto (`box-decoration-break: clone`), in place of the typography plugin's backticks. Open Runde sets larger than Nunito at one size, so the step down keeps it in the line, and the edge marks it as code without a fill the portal palette lacks. `pre` blocks keep the plugin's reset.

Still in force from the cw theme (`plans/2026-10-07-cw-theme.md`):

- `light-dark()` ships unrewritten: `next.config.ts` excludes it from Lightning CSS (`experimental.lightningCssFeatures`), as Tailwind does, so each token resolves against the `color-scheme` of the element using it. Keep that exclusion while the tokens use `light-dark()`.
- Tailwind's width utilities read `--spacing-*` before `--container-*`, so with cc's spacing names `max-w-xl` is 32 px. Size containers in CSS, not with `max-w-<cc step>`.
- Tailwind's default design namespaces are reset; the same `@theme` redefines `--font-sans`, `--font-mono` and `--default-transition-*` from cc's roles.
- Generators run by hand, with their outputs committed: `generate:theme` (the tokens CSS) and `generate:brand` (favicons, OG). `prebuild` runs only the int tests.
- Payload is themed through its `--theme-*` variables, overridden unlayered in `custom.scss`, and its buttons only through Payload's button variables on `.btn--style-primary|secondary|pill|tab`, named without `.btn` as Payload names them (a split button carries its style class on a wrapper). primary is cc's primary, secondary cc's outline, pill cc's secondary (color-1 at 20 % with n10: 16.29:1 light, 14.98:1 dark) and tab cc's toggle. The three Button variants are pills through `--style-radius-s`, which `.btn` reads, set on the variant alone.

### Selectors into Payload's own views

The only ones: where the error colour meets text (cc error is 4.05 as text on light n1 and 4.02 on dark n2), the required asterisk and the errored blocks header use n10 in both modes, and the relationship load error's text on its error fill uses `--cte-accent-text`; the folder drag count (`.drag-overlay-selection__card-count`) sets its text in the canvas; and the minimal template's field edge and focus ring (`.template-minimal .field-type :is(input, textarea)`). The breadcrumb's home icon is critwire's own `Icon` (`.cw-admin-icon`). Everything else in the admin is themed through Payload's documented variables: elevation 0 n1, 50 n2, 100 n3, 150–200 n4, 250–300 n5, 350 n6, 400–650 text-muted, 700–750 n8, 800–850 n9, 900–1000 n10.

### Gaps

- **G2 (blocked, split buttons only).** A split button's menu half (`.popup-button`, the Pages Publish with its schedule menu) has a compiled Sass radius (`$style-radius-m: 4px` in `@payloadcms/ui`), so a split button keeps cc's radius s rather than half a pill. Every other admin button is a cc pill.
- **Payload's built-in field edges** stay elevation-150 = n4: 1.25:1 in light, 1.75:1 in dark, as in stock Payload. Darkening them needs a scoped rule over Payload's input selectors, which is the owner's call (handoff H21, still open).
- The mission's remaining gaps are listed in its plan's Summary.
