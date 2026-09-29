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

- [ ] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

## Log

## Summary
