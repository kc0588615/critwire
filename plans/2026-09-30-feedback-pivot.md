---
mission: feedback-pivot
project: critwire
branch: agent/feedback-pivot
status: active
started: 2026-09-30 04:52 UTC
---

# Mission: critwire feedback pivot

This file is the mission's state. Agents: follow "In a mission session" in `~/.claude/CLAUDE.md`, and keep this file current.

## Brief


### Goal

Turn critwire from a game website with a bug tracker into a **player feedback and updates hub that complements a studio's existing website**. When this mission is done:

1. **The product is described correctly.** Replace the thesis at the top of `AGENTS.md` and the scope and pricing in `docs/features.md` with the "Product direction" below. The repo gets a `LICENSE` file matching `package.json` (MIT).
2. **The OpenAI site generator is gone.** Remove its code, admin UI, environment variables, dependency, rate limits, docs and tests, and add a migration for any data it stored.
3. **The portal is minimal.** `/g/<game>` becomes a hub, not a marketing page:
   - A small header with the game's identity: name, one piece of key art, a one-line pitch, and links to the studio's website, store pages and Discord.
   - The latest updates and the top feedback below it.
   - The portal chrome shows a clear link back to the studio's own website whenever one is set.
   - The multi-section landing builder goes: hero, feature and "adaptive" section variants, section ordering, and the page-editing UI that exists only for it.
   - Keep the theme tokens, the WCAG contrast checks and the design-pass visual system, so a studio can match the portal to its own site.
4. **Feedback, not just bugs:**
   - Reports and issues get a type, **Bug** or **Idea**.
   - A new internal status, `IN_PROGRESS`.
   - Players see **four public stages** (Under review, Planned, In progress, Shipped), mapped from the internal statuses by one function:

     | Public stage | Internal statuses |
     |---|---|
     | Under review | `REPORTED`, `INVESTIGATING`, `NEEDS_MORE_INFO`, `WORKAROUND_AVAILABLE` |
     | Planned | `PLANNED` |
     | In progress | `IN_PROGRESS` |
     | Shipped | `FIXED` |

     `CLOSED` items are archived: off the board, but still reachable by link.
   - The board has four columns, filterable by type. The list stays the default view.
   - The submit form asks "Bug or idea?" first. Platform and version are asked for bugs only.
   - Routes and copy are renamed:

     | Old | New |
     |---|---|
     | `issues` | `feedback` |
     | `report` | `feedback/new` |
     | `patch-notes` | `updates` |

     "Report a bug" and "Suggest an idea" replace the bug-only copy. Every old URL, **including the RSS feed**, permanently redirects to its new one.
5. **Studios choose how ideas are published.** Each game has two settings:
   - "Accept ideas": on by default.
   - "Review submissions before they're public": **on by default**. With review off, a submission publishes immediately, **unless the content filter flags it**; flagged submissions always wait for review.
6. **A content filter screens all player-submitted text.** It covers bug reports and ideas (title and body) and screens for profanity, slurs, sexual content and spam links. It runs locally: no external service and no API key, so self-hosted instances get it too. Flagged items show the reason in the admin. The filter sits behind a small interface, so a moderation provider can be added later.
7. **Updates and feedback link both ways.**
   - Each update's page lists "From your feedback": the items it shipped, with their vote counts.
   - Shipped cards and items show the version that shipped them.
8. **Critwire's own home page (`/`) tells the new story.** Critwire adds player feedback and updates to the website you already have, is free to self-host, and has a free hosted early-access tier. The page links to the GitHub repo. Signup comes in the next mission, so there's no signup button yet.

   The page also gets a **Contact** link, which the owner asked for (H6). Its target (a `mailto:` or `https:` address) comes from one environment variable. When the variable is unset, the link is hidden, so self-hosted instances don't show a contact for critwire's owner. Document the variable in `.env.example`. The owner will supply the production value.

### Why

The owner's product decision (2026-09-29): website builders are a crowded market that critwire must not compete in. What indie studios lack is a free, game-aware feedback loop (report → vote → status → the update that shipped it) that sits alongside the website they already have. The owner's product review is at `/srv/critter-ai/agent-state/missions/briefs/2026-09-29-product-review.md`. Read its sections 4–6. Where it conflicts with the Product direction below, the Product direction wins.

### Product direction (the owner's decisions; write these into AGENTS.md and docs/features.md)

- **Audience:** indie game studios of one to a few people, most of whom already have a website (Carrd, Wix, itch.io, Steam or their own).
- **Product:** a player feedback board plus updates (patch notes with RSS) for each game, on a minimal, themable portal that links back to the studio's own site. Critwire complements website builders and does not compete with them.
- **Open source:** MIT. Self-hosting is free and always will be.
- **Hosted:** a hosted instance with open signup from day one. It's free during the early years, with restrictions that keep each site minimal. A paid hosted tier may come later. There's no billing work now.
- **Moderation:** submissions are reviewed before they're public by default. Auto-publishing is an opt-in per game and still goes through the content filter.
- **No AI site generation.**

### Scope

In:
- Everything under Goal: the data model, migrations, routes, redirects, public UI, the admin fields and settings the Goal needs, and the docs.
- Fix F17 (the admin Issues kanban ignores the tenant/game selector) if the board work touches that code anyway.

Out:
- Signup, onboarding, invites, hosted-tier limits, billing, custom domains: the next mission (`open-signup`).
- A redesigned triage inbox, merge-as-vote, and email notifications to reporters.
- Embeddable widgets for external sites, press kits, studio pages (`/s/<studio>`), comments, and theme presets.
- Weakening the security fixes from `agent/architecture-pass` (tenant isolation, vote integrity, fail-closed form protection).

### Definition of done

- `pnpm exec tsc --noEmit`, `pnpm lint` and `pnpm build` pass.
- The full E2E suite passes. Update selectors where markup or routes changed, but never an assertion's meaning.
- New E2E tests cover:
  - A bug and an idea submitted and published.
  - The four-stage mapping on the board.
  - The ideas and review settings.
  - Review off: clean text auto-publishes, and flagged text waits for review.
  - Every old URL, including RSS, redirecting.
  - The update ↔ feedback links.
  - No generator in the admin or the API.
- Migrations run up cleanly on a copy of the Critter Connect seed. The Summary lists every field, collection or table removed, and what existing content was mapped where.
- Screenshots (desktop 1440 px and mobile 390 px) of `/`, a portal hub, the board, the list, the submit form and an update page, under the Critter Connect theme and one unusual theme. Save them in `/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots/` with an `index.html`.
- The Summary lists what was removed and why, the migrations, the content filter's approach and its word-list source and licence, and any open follow-ups.
- Branch `agent/feedback-pivot` pushed. Don't merge it.

### Decision rules

- **Complement, don't compete.** When a feature is for building a website rather than for feedback and updates, cut it and record the cut under Decisions.
- **Simpler wins.** Prefer removing code to adding configuration.
- **Keep existing studio content.** Map it into the new model wherever there's a place for it; drop only what has no place, and list it in the Summary.
- **No new external services.** Everything must keep working self-hosted with only Postgres added. The existing hosted integrations (Turnstile, Upstash, Resend, R2) stay as they are.
- **Word list:** the content filter's list must have a licence compatible with MIT. Keep false positives low, since flagged items only wait for review and are never deleted.
- **Owner decisions go in the handoff file.** Anything that truly needs the owner becomes a handoff item. Pick the more conservative option and carry on.

### Notes

- This mission starts from `main`, which now includes `agent/architecture-pass` and `agent/design-pass` (fast-forwarded to `51a629d` on 2026-09-30).
- Starting points in the code:
  - The generator: `src/site-generator/`.
  - Statuses and categories: `src/collections/options.ts`. `FEATURE_REQUEST` becomes the Idea type.
  - Board query: `src/lib/game-portal/issues.ts`. It caps the board at 200 items.
  - Promoting a report to an issue: `src/collections/IssueReports/hooks/createIssueFromPublishedReport.ts`.
  - Issue → update link: `fixedInPatchNote` on Issues.
  - Landing template: `src/site-templates/flagship-game-v1/` and `src/collections/GamePages/`.
- The design pass hard-coded "Known issues" and "Report a bug" in about nine files, and E2E selectors depend on them.
- Handoff item H6: the owner answered "yes, a Contact link" (Goal 8), but hasn't given the address yet. The pivot makes H6's other two questions moot (the Critter Connect link and a CMS page with the slug `home`). Close them in H6 with a note saying so, and leave H6 waiting only for the address.
- A demo server may be running on port 3000 (`systemctl --user stop critwire-demo`). The E2E suite needs that port.

## Stages

- [x] Baseline: install, migrate, run typecheck, lint, unit and E2E tests; record the results under Baseline
- [ ] Architecture: `architect` writes findings and the target design
- [ ] Fable review: `architecture-reviewer`
- [ ] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [ ] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [ ] Steps: `planner` writes Steps and Verification

## Baseline

Commit `8cd22d9`, 2026-09-30 04:52–04:57 UTC.

- **Setup:** created the disposable E2E database `critwire_m_feedback_pivot_e2e` and added `E2E_DATABASE_URL`, a generated `CRON_SECRET` (for `pnpm seed:critter-connect`) and `CRITWIRE_CONTACT_URL` (H6) to the worktree `.env`. `pnpm install --frozen-lockfile`: up to date. `pnpm payload migrate`: all 11 migrations applied to the fresh mission database, no `dev` row.
- **Typecheck** (`pnpm exec tsc --noEmit`): pass.
- **Lint** (`pnpm lint`): pass, 0 errors, 20 warnings (all `@typescript-eslint/no-unused-vars`). Pre-existing; don't add new ones.
- **Int** (`pnpm test:int`): 3 files, 9 tests passed.
- **E2E** (`pnpm test:e2e`): 73 passed, 0 failed, 3.8 min. Report: `/srv/critter-ai/agent-state/missions/feedback-pivot/e2e-baseline/` (`pnpm exec playwright show-report <dir>`; `run.log` alongside). Three of the 73 (`S1.10 AI site generation`) test the generator this mission removes; they go with it.
- **Ports:** the E2E suite serves on 3100 (sink on 3101); `critwire-demo` was inactive.

## Architecture

## Architecture review (Fable)

## Architecture review (Astra)

## Revision notes

## Steps

## Verification

## Decisions

- **H6 picked up (2026-09-30).** The home page's Contact link reads `CRITWIRE_CONTACT_URL` (a `mailto:` or `https:` value; hidden when unset). Owner's value: `mailto:admin@critwire.com`, in the worktree `.env` and `/srv/critter-ai/agent-state/secrets/critwire.production.env`. H6's other two questions are moot after the pivot and were closed with a note.
- **Owner (H6, 2026-09-30): existing production data need not be preserved.** Migrations may drop existing studio content instead of mapping it. This relaxes the brief's "Keep existing studio content" rule: map where it's cheap and obvious, drop otherwise, and list every drop in the Summary as before.

## Log

- 2026-09-30 04:58 UTC · Baseline: E2E db and env set up, migrations applied; tsc pass, lint 0 errors/20 warnings, int 9/9, E2E 73/73. Picked up H6 (contact address, data-preservation decision) and closed it.

## Summary
