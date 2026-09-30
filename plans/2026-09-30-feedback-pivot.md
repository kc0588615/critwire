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
- [x] Architecture: `architect` writes findings and the target design
- [x] Fable review: `architecture-reviewer`
- [x] Astra review: `astra-review` (write "Skipped: <reason>" if it's unavailable)
- [x] Revision: `architect` resolves MUST-FIX items (check off as "none needed" if there are none)
- [x] Steps: `planner` writes Steps and Verification

## Baseline

Commit `8cd22d9`, 2026-09-30 04:52–04:57 UTC.

- **Setup:** created the disposable E2E database `critwire_m_feedback_pivot_e2e` and added `E2E_DATABASE_URL`, a generated `CRON_SECRET` (for `pnpm seed:critter-connect`) and `CRITWIRE_CONTACT_URL` (H6) to the worktree `.env`. `pnpm install --frozen-lockfile`: up to date. `pnpm payload migrate`: all 11 migrations applied to the fresh mission database, no `dev` row.
- **Typecheck** (`pnpm exec tsc --noEmit`): pass.
- **Lint** (`pnpm lint`): pass, 0 errors, 20 warnings (all `@typescript-eslint/no-unused-vars`). Pre-existing; don't add new ones.
- **Int** (`pnpm test:int`): 3 files, 9 tests passed.
- **E2E** (`pnpm test:e2e`): 73 passed, 0 failed, 3.8 min. Report: `/srv/critter-ai/agent-state/missions/feedback-pivot/e2e-baseline/` (`pnpm exec playwright show-report <dir>`; `run.log` alongside). Three of the 73 (`S1.10 AI site generation`) test the generator this mission removes; they go with it.
- **Ports:** the E2E suite serves on 3100 (sink on 3101); `critwire-demo` was inactive.

## Architecture

**Summary.** Payload collections and their slugs stay (`issues`, `issue-reports`, `issue-votes`, `patch-notes`); only what players and studios see is renamed. The landing builder (GamePages, `src/site-templates/`, legacy game blocks, studio Draft Mode) and the generator are deleted, and the one part worth keeping, the theme, moves onto `GameProjects`. Feedback is the existing report → issue loop plus a `type`, one new status, one pure status → stage map, and a moderation step inside the IssueReports hooks, so auto-publish reuses the existing promotion hook and nothing can bypass the filter. Every portal URL comes from one module, and old URLs redirect in `redirects.ts`. Three migrations.

### Findings

Verified against `683de8d`, most impact first.

- **F1. The board silently drops items and miscounts.** `lib/game-portal/issues.ts:13,58-72` loads at most `BOARD_ISSUE_LIMIT = 200` public issues in one query. `issues/page.tsx:87-95` groups them in memory and shows `column.length` as the count. Past 200 items, the lowest-voted cards vanish without a sign and every count is wrong. This is a bug. Fix: one query per stage column, each with its own limit, the count taken from `totalDocs`, and a link to the list filtered to that stage (§5).
- **F2. Portal URLs and bug-only copy are hand-written in about 18 files.** URL literals: the route pages, `PatchNotesFeed.tsx:15`, `actions.ts:106-114`, `SiteFooter.tsx:15`, `SiteNav.tsx:23`, `KnownIssues.tsx:28`, `LatestUpdate.tsx:21`, `feed.xml/route.ts:34`, `jobs/contact.ts:92,164`, `MarketingHome.tsx:11-32`, `hooks/portalRoutes.ts:12` and the seed. Copy ("Known issues", "Report a bug", "Patch notes"): `actions.ts:27-31`, `issues/page.tsx:44,59-61,137,141,246`, `issues/[slug]/page.tsx:53`, `report/page.tsx:37,42,47-66,169,187`, `KnownIssues.tsx:12,56`, `LatestUpdate.tsx:46`, `PatchNotesFeed.tsx:28`, `contact/page.tsx:36-37`. This breaks DRY, and during the rename any literal we miss becomes a silent broken link. Fix: `src/lib/game-portal/paths.ts` becomes the only place that builds a portal URL, and the nav labels live next to it.
- **F3. `feedback/new` would shadow an item whose slug is `new`.** `createIssueFromPublishedReport.ts:8-16` slugifies titles, so a report titled "New" gets the slug `new`, and the static form route wins over `feedback/[slug]`. The rename introduces this bug. Fix: reserve `new` in the slug generator and in Issues validation; M13 renames any existing `new` slug.
- **F4. Update pages would show stale vote counts.** Update pages are ISR (`patch-notes/[slug]/page.tsx:12`, which S3.5 asserts), but a vote only revalidates the landing (`adjustUpvoteCount.ts:30-32`). Once an update lists its items with their votes (Goal 7), those counts can go an hour stale, which breaks rule 4. Fix: the vote hook and the Issue hooks also revalidate the linked update's page (§6).
- **F5. Players see the internal workflow.** The public board has one column per internal status, seven in all (`issues/page.tsx:87`), and badges and landing rows show internal labels (`IssueStatus.tsx:22-23`, `KnownIssues.tsx:48`). The brief asks for four public stages. Fix: one pure mapping (§3) used by every public surface; the admin keeps the internal statuses.
- **F6. The theme is locked inside the landing config.** To get its theme and nav, every ops page loads the published GamePage (`PortalChrome.tsx:20` → `landingPage.ts:98-103`, one `game-pages` query per request). When there's no published page, the portal derives the accent from `GameProjects.accentColor` (`defaults.ts:26-39`), so the accent has two sources (DRY). Fix: a `theme` group on `GameProjects`, read from the project the layout already loads; `accentColor` is removed.
- **F7. The landing builder is website-building, which the brief cuts, and it's heavy to keep.** It covers GamePages (drafts, versions, live preview, `/next/site-preview` Draft Mode), 10 slot renderers, `normalize.ts` (200 lines reshaping Payload data for Zod), a parity int test, and a hidden legacy `content` blocks field that still renders (`GamePages/index.ts:77-88`: "dropped in a later cleanup migration" that never came), plus its five blocks in `src/blocks/game/`.
- **F8. The template and the seed depend on the generator.** `FlagshipSite.tsx:9` imports `collectSiteMediaRefs` from `site-generator/media`, and `seed/critterConnect.ts:9` imports `siteConfigToPayloadSite` from `site-generator/storage`. The dependency points the wrong way (separation of concerns): deleting `src/site-generator/` by itself breaks the build. See the sequencing note in §1.
- **F9. The filter params are declared twice, with different types.** In `IssueFilters.tsx:13-21` (client), `sort` and `view` are free strings; in `issues/page.tsx:28-34` (server), they're literals. This breaks DRY, and adding `type` and `stage` would double the drift. Fix: one parser map shared by `createLoader` and `useQueryStates`.
- **F10. The kanban ignores the tenant selector (F17).** `components/admin/issues/list.tsx:28-41` and `kanban.tsx:85-96` (`fetchMoreIssues`) query without the plugin's list filter, so a super admin or a multi-studio user sees every studio's issues. Access still applies, so nothing leaks. The plugin's filter is `admin.baseFilter`, which only Payload's default list view applies (`@payloadcms/next/dist/views/List/index.js:114-124`); a custom list view's Local API and REST calls never get it (§8). A second bug: the tenant selector calls `router.refresh()`, but `IssuesKanban` seeds its state from `initialColumns` once (`kanban.tsx:345`), so a new selection wouldn't show even with the filter. We touch these files anyway: `PILL_STYLES` is a `Record<IssueStatus,…>`, so adding `IN_PROGRESS` forces an edit. Fix in §8.
- **F11. Link fields the admin says are public are never shown.** `GameProjects/index.ts:86-119` describes the links as "shown on the public portal", but `gog`, `playstation`, `xbox`, `nintendo` and `youtube` are missing from `EXTERNAL_LINK_LABELS` (`actions.ts:39-48`). The `meta` group (developer, publisher, engine, rating) is rendered nowhere; only the generator read it. The hub needs the store links (Goal 3). Fix: label all of them in `links.ts` and drop `meta`.
- **F12. Three int tests lose their reason to exist.** `template-revalidation` exists because "the landing renders dynamically" (AGENTS.md). The hub becomes ISR, so E2E can now observe the case where an issue moves between games (S2.5). `site-config-parity` guards a field tree that goes away, and `site-generator` tests deleted code.

**Areas that are fine and only get renamed:**
- the vote route and IssueVotes counter hooks
- `guardPublicForm` and the guard order in both submit routes
- `formRoutes.ts` (Tally and external routing)
- the tenant access helpers and plugin config
- `validateUniqueSlugPerProject`
- patch-note revalidation by route pattern
- the contact jobs
- the marketing `pages` collection and its super-admin Draft Mode

### Target design

#### 1. Modules

**Removed:**
- `src/site-generator/`, `src/app/(frontend)/next/generate-site/`, `src/components/admin/game-pages/`
- `src/collections/GamePages/`, `src/blocks/game/`, `components/game/GameButtons.tsx`, `lib/validation/video.ts`, `lib/game-portal/landingPage.ts`, `components/game/PortalChrome.tsx`
- `/next/site-preview` and `lib/security/sitePreviewToken.ts`. Studio Draft Mode existed only for GamePages; the marketing `/next/preview` stays.
- Everything in `src/site-templates/` except the parts listed under "Moved", then the directory itself
- the `(ops)` route group and its layout (§5)
- the `openai` dependency, `OPENAI_API_KEY`, `OPENAI_SITE_MODEL`, and the `site-generation` Upstash limit (it lives only in `service.ts`)
- landing-only rules in `portal.css`: features, gallery, adaptive, community band, final CTA, trailer, availability rows

**Moved, with the same behaviour:**
- `schema/theme.ts` and `schema/contrast.ts` → `src/lib/game-portal/theme.ts` and `contrast.ts`: the schema, `DEFAULT_THEME_COLORS` and the WCAG refinements.
- `render/themeStyle.ts` and `fonts.ts` → `src/components/game/theme/`.
- `SiteFrame` (with `SiteRoot`), `SiteNav`, `SiteNavLinks`, `SiteFooter` → `components/game/PortalFrame.tsx`, `PortalNav.tsx`, `PortalNavLinks.tsx`, `PortalFooter.tsx`. They take `project`, not a site config.
- `resolveProjectLinks`, the link label tables and `resolvePrimaryStoreUrl` → `src/lib/game-portal/links.ts`. `resolvePrimaryStoreUrl` stops falling back to `links.website`, since the Official site link covers that. The action refs are removed.
- `availabilityFacts` → the hub header.

**New:**
- `lib/game-portal/paths.ts`. `portalPaths(slug)` returns `hub`, `feedback`, `feedbackItem(s)`, `newFeedback(type?)`, `feedbackSubmit`, `updates`, `updatesPage(n)`, `update(s)`, `updateGuid(s)` (§7), `rss`, `contact` and `contactSubmit`. The module also holds `RESERVED_FEEDBACK_SLUGS = ['new']` with `isReservedFeedbackSlug()`, `PORTAL_NAV` (Updates, Feedback, Contact) and the revalidation patterns now in `hooks/portalRoutes.ts` (`PORTAL_ROUTE`, and `UPDATES_ROUTE`, which replaces `PATCH_NOTES_ROUTE`).
- `lib/game-portal/stages.ts` (§3) and `lib/game-portal/feedbackSearchParams.ts` (§5).
- `lib/moderation/screenText.ts` (§4).
- Collection code: `collections/GameProjects/theme.ts` (the field and its validation hook), `IssueReports/hooks/{screenReportText,autoPublishReport}.ts`, `Issues/reservedSlug.ts` (the slug field's `slugify` option and the `rejectReservedSlug` hook, §2), `Issues/hooks/revalidateLinkedUpdates.ts`, and `src/hooks/revalidateUpdatePage.ts`.
- Components: `HubHeader`, `LatestUpdates`, `TopFeedback`, `FeedbackBoard` and `FromYourFeedback`. `IssueFilters` becomes `FeedbackFilters`, and `IssueStatus` becomes `FeedbackStatus` (stage mark, label and type tag).
- `LICENSE`, `tests/int/content-screen.int.spec.ts`, and the migration check's `tests/migrations/feedback-pivot/{fixtures,assert}.sql` (§10).
- Dependency: `qs-esm` as a direct dependency, pinned to the `8.0.1` Payload already resolves, for the kanban's REST query (§8).

**Sequencing (F8):** remove the generator in the same step as `FlagshipSite` and the seed rewrite, or after it. If the generator goes first, that step moves `collectSiteMediaRefs` into the template and `siteConfigToPayloadSite` into the seed. Either order keeps every step building.

#### 2. Data model

The slugs stay. The admin labels change:

| Collection | New admin label |
|---|---|
| Issues | "Feedback" (singular "Feedback item") |
| IssueReports | "Submissions" |
| PatchNotes | "Updates" |
| IssueVotes | "Votes" |

The kanban heading reads the collection label instead of the literal "Issues" (`list.client.tsx:50`).

`options.ts`:
- Add `FEEDBACK_TYPE_OPTIONS` (Bug `BUG`, Idea `IDEA`).
- `ISSUE_STATUS_OPTIONS` gains In Progress (`IN_PROGRESS`), between PLANNED and FIXED.
- Remove `FEATURE_REQUEST` from `ISSUE_CATEGORY_OPTIONS`. Its rows become `type: IDEA, category: OTHER` (M13).

| Collection | Field | Notes |
|---|---|---|
| issues | `type` | Select, required, default BUG, indexed. Shown as a tag everywhere. |
| issues | `status` | Gains IN_PROGRESS. Admin only; players see the stage. |
| issues | `fixedInPatchNote` | Unchanged; relabelled "Shipped in update". It's the only source of "shipped in version": its `versionLabel`, or its title when that's empty. |
| issue-reports | `type` | Select, required, default BUG. The admin shows `platform` and `gameVersion` only for bugs. |
| issue-reports | `flagged` | Checkbox, default false, indexed, read-only, sidebar. Set by `screenReportText`. |
| issue-reports | `flagReasons` | Textarea, read-only, sidebar, shown when flagged, one reason per line. |
| game-projects | `reportForm.acceptIdeas` | Checkbox, default true. The group is relabelled "Player feedback"; both new fields show only when the provider is native. |
| game-projects | `reportForm.reviewSubmissions` | Checkbox, default true, labelled "Review submissions before they're public". |
| game-projects | `theme` | A group: `colors` (the ten keys), `typography`, `shape`, `density`, `motion`. The field tree is generated from the Zod schema (keys from `DEFAULT_THEME_COLORS`, options from the enums, schema defaults), so parity holds by construction. |
| game-projects | `description` | Relabelled "Pitch", `maxLength: 240`, admin help text: "One line under the name on your portal and in link previews." |
| game-projects | `banner` | Relabelled "Key art". |
| game-projects | Removed | `accentColor`, `links.trailer`, `availability.demoUrl` and the `meta` group (M14). |

**Theme validation.** `validateProjectTheme` (GameProjects `beforeChange`) merges the default theme, then `originalDoc.theme`, then `data.theme`, and runs the theme schema's `safeParse`. The merge is per level (`theme`, then `theme.colors`), and `null` or `undefined` never overrides a value: a REST PATCH of one colour arrives as a partial nested object, and a shallow spread would drop the other nine and report a misleading error. A failure throws a `ValidationError` with paths `theme.colors.<key>`; the hook only throws (CQS). Rendering reads `project.theme` through `safeParse`. If a stored theme ever fails (it shouldn't), we report it to Sentry and use the default theme, the same policy as `landingPage.ts:72-81` today.

**Reserved slugs.** Payload writes an Issue's slug at two points, so `Issues/reservedSlug.ts` guards both with `isReservedFeedbackSlug()`:
- **Generated slugs.** `slugField`'s `generateSlug` is a *field* `beforeChange` hook (`payload/dist/fields/baseFields/slug/generateSlug.js`). It runs after every collection hook and slugifies `data.slug || data.title` on create, so an admin-created item titled "New" gets `new` after any `beforeValidate` check has passed. Issues therefore pass `slugField({ disableUnique: true, slugify: issueSlugify })`, Payload's documented override. `issueSlugify` is synchronous (the create path assigns its return value without `await`), calls Payload's own `slugify` (`payload/shared`), and throws a `ValidationError` on `slug` ("`new` is reserved; choose another slug") for a reserved result. The admin's generate-slug button uses the same function.
- **Hand-set slugs on update.** With the generate box unchecked (the state after every create), Payload stores `data.slug` as typed. `rejectReservedSlug` (Issues `beforeValidate`) rejects it, with the same error.
- **Promotion.** `uniqueIssueSlug` treats reserved slugs as taken, so a report titled "New" becomes `new-2` (or the next free suffix).
- M13 renames any existing `new` slug (§10).

**Moderation state lives on the submission.** The review queue is the existing report `status` (NEW, PUBLISHED, LINKED, DISMISSED), plus `flagged` and `flagReasons`. No new status and no new collection.

#### 3. Public stages

`src/lib/game-portal/stages.ts` is pure and imports nothing from Payload:

```ts
export const PUBLIC_STAGES = [
  { id: 'under-review', label: 'Under review', shape: 'ring' },
  { id: 'planned', label: 'Planned', shape: 'diamond' },
  { id: 'in-progress', label: 'In progress', shape: 'half' },
  { id: 'shipped', label: 'Shipped', shape: 'dot' },
] as const
const STAGE_OF: Record<IssueStatus, PublicStageId | null> = {
  REPORTED: 'under-review', INVESTIGATING: 'under-review', NEEDS_MORE_INFO: 'under-review',
  WORKAROUND_AVAILABLE: 'under-review', PLANNED: 'planned', IN_PROGRESS: 'in-progress',
  FIXED: 'shipped', CLOSED: null,
}
export const publicStage = (status: IssueStatus): PublicStage | null => …
export const statusesFor = (stage: PublicStageId): IssueStatus[] => …   // derived from STAGE_OF
export const ARCHIVED_STATUSES: IssueStatus[] = …                          // derived: ['CLOSED']
```

- Because `STAGE_OF` is a `Record<IssueStatus, …>`, adding a status is a compile error until it's mapped (fail fast).
- The list, board, hub and update-page queries add `status not_in ARCHIVED_STATUSES`. `getPublicIssue` doesn't, so archived items stay reachable by link, and their page says "Archived".
- **Voting.** Every public stage takes votes, Shipped included: a vote on a shipped item still tells the studio what mattered, and §6 keeps the update page's counts fresh. Archived items don't: their page shows the count (`VoteCount`) without `VoteButton`, and `/api/vote`, which already loads the issue (`vote/route.ts:70-80`), selects `status` next to `tenant` and answers 409 for `ARCHIVED_STATUSES` before the toggle. Casting and withdrawing both stop, so an archived count is frozen, and the rule holds on the server, not just in the UI.
- "Workaround" and "Needs more info" stay as notes on the item page, unchanged (`issues/[slug]/page.tsx:69-79`).
- Status shapes are now defined per stage instead of per status.

#### 4. Moderation, auto-publish and the content filter

Everything below runs inside the report create's transaction, through `req`:

```
POST /g/<game>/feedback/new/submit
  guardPublicForm (Zod → Turnstile → Upstash)       unchanged, fails closed
  type=IDEA and !reportForm.acceptIdeas           → 400
  payload.create('issue-reports', { …, status: 'NEW' }, overrideAccess)
    beforeChange[0] screenReportText   on create, or on an update that changes title/description:
                                       { flagged, reasons } = await screenText(`${title}\n\n${description}`)
    beforeChange[1] autoPublishReport  create only; status NEW, !flagged and reportForm.reviewSubmissions === false
                                       → status = 'PUBLISHED'  (one findByID of the project, select reportForm, via req)
    beforeChange[2] createIssueFromPublishedReport   the existing hook; now copies `type`
  → the new Issue's afterChange revalidates the hub
  reply: { id, ok, published }; an HTML post gets a 303 to …/feedback/new?type=…&submitted=published|1
```

- Screening runs in the collection hook, so every write path goes through it, not just today's route.
- A flag never blocks the studio: it can publish a flagged report by hand. The flag only stops auto-publish.
- Auto-publish reuses the existing promotion hook, so there's one path from report to issue.
- Auto-publish happens only when a report is created. Turning review off doesn't publish the backlog. Existing NEW reports keep `flagged: false`, because SQL can't screen them.
- `autoPublishReport` reads `reportForm` itself, with one `findByID` (primary key, depth 0, through `req` so it's in the transaction). The route doesn't pass the setting through `req.context`: the hook also runs for reports created in the admin or over REST, and one code path is simpler than a context shortcut plus a fallback.
- `formResponse` takes an optional `submitted` value (default `'1'`), so the form can say either "It's on the board now" or "The team reviews submissions before they're public".

**The filter's interface**, `src/lib/moderation/screenText.ts`:

```ts
export type ScreenResult = { flagged: boolean; reasons: string[] } // reasons are shown to moderators as written
export const screenText = async (text: string): Promise<ScreenResult> => …
```

- This function is the whole interface. Callers import only it, and the implementation stays private to the module.
- The async signature means a hosted moderation provider can replace the body later without changing the hooks.
- **The contract, stated once in the doc comment:** `screenText` resolves with a verdict on all of the text, or it rejects. It never resolves `flagged: false` for text it didn't screen. Callers don't catch: a rejection fails the write, so nothing is stored and nothing auto-publishes. On the submit route, its existing catch (`report/submit/route.ts:87-90`) reports the error to Sentry and answers 500; in the admin, the save shows the error.
- The local implementation does no I/O, so it only rejects on a bug. A future provider keeps the same contract: on an outage it may reject, or resolve `flagged: true` with the reason "Screening unavailable", but never resolve clean.

**The local filter:**
- **Word list and matcher: `obscenity@0.4.6`.** MIT, no dependencies, about 150 kB unpacked, last updated 2026-01. I checked it in the npm registry and ran it locally.
  - It uses `RegExpMatcher` with `englishDataset` and `englishRecommendedTransformers`, which cover profanity, slurs and sexual terms and normalise leetspeak and look-alike characters (`sh1t`, `a$$`, `f*ck`).
  - Its built-in whitelists avoid false positives on words that merely contain a bad word. These came back clean: assassin, Scunthorpe, class, analysis, cocktail, Hancock, therapist, grape, Essex, arsenal, cockroach, Hitchcock.
  - The module adds one game-specific whitelist entry, `cockpit`, the only false positive the probe found that game text is likely to use.
  - Why not vendor a list: we would have to write our own normaliser and whitelist, which is the hard part.
- **Spam links: it counts URLs, not tokens.**
  - One global, case-insensitive regex has three alternatives, built from the shortener list `SHORTENERS` (`bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `is.gd`, `rb.gy`, `cutt.ly`):
    1. `https?://` followed by non-space characters;
    2. `\bwww\.` followed by non-space characters;
    3. `\b(?:<shortener>)/` followed by non-space characters, for a bare `bit.ly/abc`.
  - Each match is one link. Matching runs left to right and consumes the whole URL, so `https://www.example.com/clip` is one match: its `www.` is never matched again. There's no lookbehind and no second pass.
  - The host of each match is the leading `[a-z0-9.-]` run after any scheme, lowercased, without a leading `www.`. A link is a shortener when its host is exactly one in `SHORTENERS`, so `https://notbit.ly/x` and `https://bit.ly.example.com/x` are ordinary links, and a bare `notbit.ly/x` doesn't match at all.
  - It flags 3 or more links, or any shortener. One or two links, such as a clip and a screenshot, pass however they're written.
  - Probed in Node: `https://www.a.com/x https://www.a.com/y` counts 2; `www.a.com, www.b.com and http://c.com` counts 3; `bit.ly/abc`, `https://bit.ly/x` and `HTTPS://WWW.T.CO/x` are shorteners; `notbit.ly/x` and `at.co/y` don't match.
- **Reasons:** `Offensive word: "<matched text>"` (deduplicated, at most 5), `<n> links`, `Shortened link: <host>` (one per host).

#### 5. Portal

The `(ops)` group goes. `g/[gameSlug]/layout.tsx` both 404s unknown slugs and renders `PortalFrame`, so the hub and every page share one frame. A `notFound()` below the layout still reaches `(public)/not-found.tsx`, so S2.1's rule (an unknown game and a private item get the same 404) still holds.

| Route | Page | Rendering |
|---|---|---|
| `/g/[gameSlug]` | hub | ISR (`revalidate` 3600, `generateStaticParams` returns []) |
| `/g/[gameSlug]/feedback` | list (default) or `?view=board` | dynamic |
| `/g/[gameSlug]/feedback/[slug]` | item | dynamic (reads the vote cookie) |
| `/g/[gameSlug]/feedback/new` | submit form | dynamic |
| `/g/[gameSlug]/feedback/new/submit` | POST | route handler |
| `/g/[gameSlug]/updates`, `/updates/page/[n]`, `/updates/[slug]`, `/updates/feed.xml` | updates and RSS | ISR, as today |
| `/g/[gameSlug]/contact(/submit)` | contact | unchanged |

**Chrome (`PortalFrame`).**
- The theme comes from `project.theme`.
- Nav: the logo and name (linking to the hub), then the fixed links Updates, Feedback and Contact (`PORTAL_NAV`).
- On the right, an external **"Official site"** link to `links.website`, whenever it's set, at every width. The phone rule that hides `.fs-nav-cta` doesn't apply to it.
- Nothing in the chrome is configurable any more: no nav labels, no nav call to action, no footer tagline, no legal-links switch.
- Footer: the game's name, the portal links, every outbound link the project has, and "Powered by Critwire".

**Hub** (`g/[gameSlug]/page.tsx`, with no Draft Mode and no configuration):
- **`HubHeader`** uses the design pass's title plate.
  - Key art is the project's `banner`: the title sits on a plate over it, or directly on the page when there's no art.
  - The `h1` is the name, the pitch is `description`, and the build line comes from `availabilityFacts`.
  - Links, deduplicated by URL: "Get the game" (`resolvePrimaryStoreUrl`) as the primary button, then the other store links from `links`, then Discord and Official site.
- **`LatestUpdates`** (`#fs-latest-updates-heading`): the 3 newest published updates, then "All updates" and RSS. It reuses `queryPublishedPatchNotes({ limit: 3 })`.
- **`TopFeedback`** (`#fs-top-feedback-heading`): the 5 top open items (not shipped, not archived), sorted pinned, then votes, then newest, each with its stage, type and votes. It ends with "Report a bug", "Suggest an idea" (only when `acceptIdeas` is on) and "See all feedback". The query is `queryTopFeedback`, today's compact `queryLandingIssues`. The pinned and recently-fixed variants go, along with their config.
- When a section is empty, its empty state invites the first update or the first report instead of the section disappearing.

**Feedback page:**
- **URL state.** One parser map in `feedbackSearchParams.ts` feeds both `createLoader` and `useQueryStates` (F9). It imports from `nuqs/server`, which has no server-only guard, so client code can import it too.
  - `view`: list or board; list by default.
  - `type`: bug or idea; all by default.
  - `stage`: a stage id.
  - `category`: one of the category values. A stale `FEATURE_REQUEST` is ignored rather than returning nothing.
  - `q`, `sort` (top or latest) and `page`.
  - In board mode, only the type filter shows.
- **List:** 20 items per page, with the existing search, category and sort plus `type` and `stage`. Each row shows the stage, type, category and pin; shipped rows add "Shipped in v2.1.0".
- **Board:** four regions, each named by its stage label.
  - `queryBoardColumn({ projectID, stage, type })` runs once per stage in a `Promise.all`, with `limit: 25` and the pinned, votes, newest sort.
  - Its `select` covers only the card fields, and it populates `fixedInPatchNote` at depth 1 with `overrideAccess: false`. A draft update therefore stays a bare ID and never leaks, the same protection as the architecture pass's F3 gives the item page today.
  - The column count is `totalDocs`. Past 25 items, "See all N" links to the list with `?stage=<id>` (F1).
- **Header:** title "Feedback"; purpose "Bugs and ideas from {game} players. Vote on the ones you care about."; buttons "Report a bug" and, when `acceptIdeas` is on, "Suggest an idea".

**Submit form** (`feedback/new`), server-rendered, with no client JS:
- Tally and external providers render as they do today, whatever the type.
- **Native form:**
  - The first control is **"Bug or idea?"**: two links (`?type=bug`, `?type=idea`), with `aria-current` on the chosen one.
  - Until a type is chosen, the rest of the form doesn't show. When `acceptIdeas` is off, the page goes straight to the bug form.
  - Bug: title, "What happened?", category, email, platform, game version, and "Send report".
  - Idea: title, "What's your idea?", category, email, and "Send idea".
  - A hidden `type` input carries the choice.
- The Zod schema has `type: z.enum(['BUG','IDEA']).default('BUG')`, so stale forms posting through the 308 redirect keep working. For ideas, platform and version are dropped before the write.

**Item page:** shows the stage (or "Archived", with the vote count but no vote button, §3), the type tag and the notes as today. The fix note reads "Shipped in {version — title}" and links to the update. The back link is "All feedback".

#### 6. Updates ↔ feedback

- **On the update page:** `FromYourFeedback` lists `queryShippedFeedback(noteID)`: public items whose `fixedInPatchNote` is this update and whose status is FIXED, sorted by votes, each with its title link, type and `VoteCount`. The section hides when it's empty.
- **On shipped items** (list rows, board cards, the item page): the update's `versionLabel`, or its title, when the update is published; otherwise just "Shipped".
- **Revalidation (rule 4),** always after the write:
  - New `revalidateUpdatePage(noteID, payload)`: reads the update's slug, project and status, and if it's published calls `revalidatePath(portalPaths(game).update(slug))`. A single page, revalidated by its URL (as `portalRoutes.ts` explains).
  - New Issues `afterChange` hook `revalidateLinkedUpdates`: when `fixedInPatchNote` changes, or a linked public item's `title`, `slug`, `status`, `type` or `isPublic` changes, it revalidates both the old and the new update's page. Writes that only change `_order` don't trigger it (the kanban contract). `afterDelete` does the same for a linked item.
  - `adjustUpvoteCount` also selects `fixedInPatchNote` and `status`. A vote on a public, shipped, linked item now revalidates that update's page as well as the hub.
  - `revalidateIssueLanding`'s `LANDING_FIELDS` gains `type`.
  - Nothing is needed in the other direction: the feedback pages are dynamic, and writes to updates already revalidate the updates subtree and the hub.

#### 7. Redirects

These go in `redirects.ts`, which `next.config.ts` already wires in:

```ts
{ source: '/g/:game/report/submit',      destination: '/g/:game/feedback/new/submit', permanent: true }, // 308: keeps the POST
{ source: '/g/:game/report',             destination: '/g/:game/feedback/new',        statusCode: 301 },
{ source: '/g/:game/issues/:rest*',      destination: '/g/:game/feedback/:rest*',     statusCode: 301 },
{ source: '/g/:game/patch-notes/:rest*', destination: '/g/:game/updates/:rest*',      statusCode: 301 },
```

- These four rules cover the list (query strings pass through, so `?view=board` survives), item pages, the form, the feed and its pages, update pages and `feed.xml`.
- **Why `redirects.ts`:** it's declarative, runs before routing and the ISR cache, leaves no code behind in the old directories, and is the established place. AGENTS.md rules out middleware (`proxy.ts`), and route handlers would keep dead routes around.
- **Status codes:** 301 for GETs, because feed readers treat a 301 as "update the subscription". 308 for the submit URL, so a stale form's POST isn't turned into a GET.
- The destinations are path templates on the same host, so these can't become open redirects.
- **RSS guids don't change.** Each item's `<link>` moves to `/updates/<slug>`, but its `<guid isPermaLink="true">` stays byte-identical to today's (`<site>/g/<game>/patch-notes/<slug>`), built by `portalPaths(game).updateGuid(slug)`. That URL still resolves through the 301, so it stays a valid permalink, and subscribers don't get the last 20 updates again. The feed route already writes the two elements separately (`feed.xml/route.ts:43-44`). `updateGuid` is the one place the old path survives, and its comment says why it's frozen.
- **The one old URL that can't follow its item.** Before the pivot, `/g/<game>/issues/new` was the page of an item whose slug was `new`, if one existed. M13 renames that item to `new-<n>` (§10), and the `issues/:rest*` rule sends the old URL to `/feedback/new`, the submit form, not to `new-<n>`. `redirects.ts` is static, and following the item would need a lookup route kept alive for a row that almost certainly doesn't exist (a report titled exactly "New"). Accepted under the owner's H6 decision that existing production data need not be preserved: the item survives under its new slug and is on the board and in the list, and the Summary lists the exception. Every other old item URL keeps its slug and lands on the same item.

#### 8. Admin

- **Submissions list:** default columns title, type, gameProject, status, flagged, createdAt, and `flagged` is filterable. The status field's description says: "Flagged submissions wait here even when review is off."
- **Kanban:** gains an In Progress column (a `PILL_STYLES` entry).
- **F17 fix: reuse the plugin's list filter, exactly as Payload's own list view does.** Nothing here builds a tenant clause.
  - **What the plugin provides.** For every tenant-scoped collection, it installs `admin.baseFilter`: `combineFilters` around `filterDocumentsByTenants` (`@payloadcms/plugin-multi-tenant/dist/index.js:318-335`). That returns `{ tenant: { in: [selected] } }` for the selected studio, the user's studios when nothing is selected, or `null` for a super admin with no selection (`dist/filters/filterDocumentsByTenants.js`). Our plugin config keeps it on (`src/plugins/index.ts:23-62` sets no `useBaseFilter: false`).
  - **Why the kanban must call it itself.** Only Payload's admin list view (`@payloadcms/next/dist/views/List/index.js:114-124`), Lexical's link and block fields, and folder views read `admin.baseFilter`, as its type doc says (`payload/dist/collections/config/types.d.ts:238-247`). Nothing under `payload/dist/collections/operations/` references it, so Local API `find` and REST `GET /api/issues` never apply it. A custom `views.list.Component` gets `collectionConfig` in its server props but no `req` (`ListViewServerPropsOnly`, `ServerProps` in `payload/dist/config/types.d.ts:308-320`).
  - **Server (`list.tsx`).** It builds a request with Payload's `createLocalReq({ req: { headers: await headers() }, user }, payload)` and calls `collectionConfig.admin.baseFilter({ limit, page: 1, req, sort: '_order' })`. That's the configured plugin filter, combined with any base filter the collection sets, and the same call the default list view makes. Each column's `where` is `combineWhereConstraints([{ status: { equals } }, tenantFilter])` (`payload/shared`, the helper the list view uses at line 123).
  - **Client (`kanban.tsx`).** `list.tsx` passes `tenantFilter` (a plain `Where`, or `null`) as a prop. `fetchMoreIssues` builds its `where` with the same `combineWhereConstraints` and serialises its query with `qs-esm`'s `stringify`, the format Payload's REST API parses, instead of today's hand-built `URLSearchParams`.
  - **Remount on a new selection.** `list.client.tsx` renders `<IssuesKanban key={JSON.stringify(tenantFilter)} …>`. The selector's `router.refresh()` (`TenantSelectionProvider/index.client.js:65-75`) re-renders the server view with the new cookie, and the new key replaces the stale `useState` seeded from `initialColumns`.
  - **It only narrows.** Every query keeps `overrideAccess: false` plus the user, so a forged `payload-tenant` cookie yields `tenant in [forged] AND access`, never more.
  - No per-game selector: the triage redesign is out of scope.
- **Dashboard (`BeforeDashboard`):** the Game Pages step becomes "Theme and links" (on the game project) and "Review submissions".

#### 9. Home page `/`

**Content.** `MarketingHome` is rewritten.
- Headline: "Player feedback and updates for the game site you already have."
- The loop, retold with stages (`IssueLoop`): report, vote, stage, the update that shipped it.
- What players get: updates with RSS, the feedback board, and the bug and idea forms.
- Moderation, on by default.
- "Free to self-host (MIT). Free hosted early access."
- Links: the demo portal, **GitHub** and **Contact**. `GITHUB_REPO_URL = 'https://github.com/kc0588615/critwire'` lives in `components/marketing/links.ts`, and the header links to it too.
- No signup button; "Sign in" stays.

**Contact link.**
- `getContactHref()` in `links.ts` reads `CRITWIRE_CONTACT_URL`.
- Unset or empty returns `null`, and the link is hidden.
- Anything that isn't a URL with the protocol `mailto:` or `https:` throws. That fails loudly and rules out `javascript:` links.
- **Checked at boot.** `register()` in `src/instrumentation.ts` calls `getContactHref()` once in the Node.js runtime, so a bad value stops the server at startup instead of failing the home page on every visit. After that, the same function can only return the value or `null`, because the environment doesn't change while the server runs. `links.ts` stays free of React imports so instrumentation can load it.
- The home page calls `await connection()` before reading the variable. Today `/` is prerendered at build time, and the Docker build has no runtime env, so a build-time read would hide the link in production forever.
- Only the home page shows the link: putting it in the shared footer would make every marketing page dynamic.
- The variable is documented in `.env.example` and `environment.d.ts`, and E2E sets `CRITWIRE_CONTACT_URL=mailto:e2e@critwire.test`.

#### 10. Migrations and seed

Each migration is created with `pnpm payload migrate:create`, then hand-edited so the data statements come before the generated type changes. They're plain SQL and don't import app code, because a migration must never change after it ships.

**M12 `remove_site_generator`**
- Drops `game_pages.generation_{model,prompt,generated_at}`, `_game_pages_v.version_generation_*`, `game_pages_generation_change_summary` and `_game_pages_v_version_generation_change_summary`.
- Data lost: the AI provenance.

**M13 `feedback_model`**
- Creates `enum_issues_type` and `enum_issue_reports_type` (BUG, IDEA), and adds `type` NOT NULL DEFAULT 'BUG' (indexed) to `issues` and `issue_reports`.
- Runs `UPDATE … SET type='IDEA', category='OTHER' WHERE category='FEATURE_REQUEST'` on both tables, **before** the generated recreation of `enum_issues_category` and `enum_issue_reports_category` without FEATURE_REQUEST. In the other order, the cast fails.
- Adds IN_PROGRESS to `enum_issues_status`. PostgreSQL 16 allows `ADD VALUE` inside the transaction as long as nothing there uses the new value.
- Adds `issue_reports.flagged` (default false, indexed) and `issue_reports.flag_reasons`.
- Adds `game_projects.report_form_accept_ideas` and `report_form_review_submissions`, both default true, so existing games get review on.
- **Renames reserved slugs without collisions.** `gameProject_slug_1_idx` is unique on `(game_project_id, slug)` (`20260707_132058_phase2_collections.ts:179`), so a blind `new-<id>` could hit an existing slug and abort the migration. Instead, for each issue whose slug is `new` (at most one per game, by that index), a short loop in the migration's `up` picks the first `new-<n>`, n ≥ 2, that no issue in that game uses, then updates that one row. That's the sequence `uniqueIssueSlug` follows, so the result matches what promotion would have produced. It's plain SQL through `db.execute`, in the migration's transaction, and it can't violate the index. The old URL is covered in §7.

**M14 `portal_hub`**
- Adds the `game_projects.theme_*` columns and their enums, with the schema defaults.
- Copies from each project's **published** flagship page (`_status = 'published' AND template = 'flagship-game-v1'`). Reading the main table is correct: Payload writes it only when a save isn't a draft (`payload/dist/collections/operations/utilities/update.js:253-256`), so a draft saved over a published page stays in `_game_pages_v` and the main row keeps the published version. A page that was never published, or was unpublished, has `_status = 'draft'` there and is skipped. The copy:
  - the ten `site_theme_colors_*`, only when all ten are set (the old renderer treated a partial palette as unset);
  - `typography`, `shape`, `density` and `motion` when set, cast through `::text::` to the new enums;
  - `banner_id` from `site_hero_background_media_id`, where the project has no banner;
  - `description` from `site_hero_tagline`, where the project has none.
- Deletes the lock rows that point at game pages, drops `payload_locked_documents_rels.game_pages_id`, and deletes `payload_preferences` keyed `collection-game-pages` or `collection-game-pages-%`. In Payload 3.85.2 those are the only keys for a collection: the list view's (`@payloadcms/next/dist/views/List/index.js:71`) and each document's (`@payloadcms/ui/dist/providers/DocumentInfo/index.js:134`). There's no `game-pages-list` key, and the folder-view key (`<slug>-collection-folder`) exists only for collections with folders, which game-pages doesn't have.
- Drops every `game_pages*` and `_game_pages_v*` table and the `enum_game_pages_*` types.
- Drops `game_projects.accent_color`, `links_trailer`, `availability_demo_url` and `meta_{developer,publisher,engine,rating}`.
- Media used only by pages stays in the library.

**Dropped, for the Summary:**
- every landing section: the hero's eyebrow, heading, variant and actions; features; gallery; adaptive; community; final CTA; trailer settings; the latest-update and known-issues headings and variants
- the nav links, labels and CTA; the footer tagline and legal-links switch
- legacy block pages, and page drafts and versions
- the AI provenance
- `accentColor` on projects without a published flagship page (with one, the page's full theme replaces it)
- the trailer and demo URLs, and the meta credits
- the old `/issues/new` URL of an item slugged `new` (the item stays, as `new-<n>`; §7)

**Check (for Verification).** Two SQL files in `tests/migrations/feedback-pivot/` make it repeatable, since the seed alone has no collisions, ideas or partial themes.
1. At `683de8d`, migrate a fresh database, run the Critter Connect seed route, then apply `fixtures.sql`, which adds:
   - in Critter Connect, an issue with the slug `new` and another with `new-2`;
   - an issue and a report with the category FEATURE_REQUEST;
   - a second project with a published flagship page that sets 3 of the 10 colours, `typography`, and a hero tagline, on a project with no description;
   - a third project whose only flagship page is a draft with a full palette.
2. `pg_dump` the result into a copy. On this branch, run `pnpm payload migrate` on the copy.
3. Run `assert.sql`, a `DO` block that raises on the first mismatch, and save its psql output next to the E2E report:
   - Critter Connect keeps the seed's theme (`#0f1f26` background, technical typography), its banner and its description, and its seeded issue and report are BUG;
   - `new` became `new-3`, and `new-2` is unchanged;
   - the FEATURE_REQUEST rows are IDEA with the category OTHER;
   - the partial-palette project has the default palette but the page's typography, and its description is the tagline;
   - the draft-only project has the default theme;
   - no `game_pages*` or `_game_pages_v*` table, `enum_game_pages_*` type or `collection-game-pages%` preference row remains.

**Seed** (`src/seed/critterConnect.ts`; the route stays, per H5).
- Writes the project with its `theme` (the current Critter Connect palette), and drops the landing page, `meta` and the `site-generator` import.
- Keeps the launch update, the sample bug and the NEW report.
- Adds an idea (PLANNED), an in-progress bug and a shipped bug linked to the launch update, so the demo shows every stage and "From your feedback".

#### 11. Security

- **Tenant isolation.** There are no new collections. The new fields sit on existing tenant-scoped collections under the plugin. The moderation hook reads only the report's own project, which is already validated. The kanban uses the plugin's own list filter, which only narrows (§8).
- **Vote integrity.** The counter hooks are unchanged, and the vote route only gains the archived check (§3), which rejects more and never less. A submission isn't an issue until it's published, so it can't be voted on. Archived items keep their votes, and their counts are frozen.
- **Fail-closed forms.**
  - The submit route keeps `guardPublicForm`, which refuses to run in production without Turnstile and Upstash.
  - The old submit URL reaches it through a 308.
  - "Accept ideas" is enforced on the server.
  - Auto-publish can only happen after screening, in the same transaction.
- **Public reads.** `theme`, `acceptIdeas` and `reviewSubmissions` are public and hold no secrets. `flagged` and `flagReasons` sit on reports, which are never public. `CRITWIRE_CONTACT_URL` is limited to `mailto:` and `https:`.

#### 12. Tests

**Existing E2E specs.** Routes, labels and selectors change. An assertion's expected value changes only where the brief changes what players see, and each such case is named here so reviewers can check it.

- **`portal-landing.spec.ts` becomes the hub spec:**
  - S2.1: path only.
  - S2.2: heading and share metadata unchanged; nav labels and paths become Updates, Feedback, Contact; "primary store = the first platform's store" is kept, with its selector moved to the hub header; "sections in the template's fixed order" becomes the hub's order [latest updates, top feedback]; the bare-project test is kept. **The trailer test is deleted** (the trailer is cut).
  - **S2.3 is deleted.** Both tests exercise `deriveAccentColors`, which goes with `accentColor`. The invariant they protect (readable button text) is now enforced by theme validation and tested in the new S2.4.
  - S2.4 becomes "project theme":
    - invalid contrast (text on background, button text) or a 3-digit hex answers 400 and leaves the portal unchanged;
    - a valid save re-themes the cached updates page and the hub (eventually);
    - a save that sets only the accent keeps the default palette.
    - Deleted along with their fields: the unsafe-tagline, raw-URL-ref and unapproved-variant cases, and the draft, publish and unpublish steps.
  - S2.5 becomes the hub sections:
    - Latest updates lists v2 then v1 and never the draft. The brief makes this section plural.
    - The top-feedback step is kept as it is.
    - The status-change step moves an item from REPORTED to PLANNED, so its stage label actually changes.
    - The move-between-games step is unchanged.
  - S2.6 is unchanged.
- **`issues-voting.spec.ts`:** paths become `/feedback`.
  - S4.1: badge values become stage labels (the step still checks that every row carries its status), and the combobox indexes follow the new filter bar.
  - **S4.2 is rewritten as the four-stage test** (below), keeping its privacy and read-only steps word for word.
  - S4.3: the back-link text changes and the fix link's href moves to `/updates/`; the no-leak step (architecture-pass F3) is kept.
  - S4.4: new hub section selector.
  - S4.5 and S4.6 are unchanged.
- **`reports-contact.spec.ts`:** paths become `/feedback/new(/submit)`; S5.1 picks "Bug" first; the form selector becomes `form[action$="/feedback/new/submit"]`; S5.3 uses the new board path. The contact tests are unchanged.
- **`admin-triage.spec.ts`:**
  - The kanban heading becomes "Feedback".
  - S6.2 gets the In Progress column (derived from the options) and an F17 step: a super admin with studio A selected sees none of B's items, and switching the selector to B shows B's items without a reload (the remount).
  - S6.3 drags an item from Reported to **Planned**, with a wider viewport so both columns are on screen, then checks the public "Planned" column and the hub. Reported → Investigating is now invisible to players, so "the public board follows" would prove nothing.
  - S6.7: new submit path, and the public column is "Under review".
- **`patch-notes.spec.ts`:** `feedPath` becomes `/updates`, and the page and RSS channel titles say "Updates". S3.5 keeps its meaning (update pages stay ISR).
- **`tenant-isolation.spec.ts`:**
  - `game-pages` leaves S1.1 and the fixtures.
  - S1.9 keeps its two marketing tests. **Deleted:** "a studio user in Draft Mode…" and "studio B cannot preview…". Studio Draft Mode and its route are gone, and new test 7 below asserts their 404.
  - **S1.10 is deleted** with the generator.
- **Support files:** `support/env.ts` drops `OPENAI_API_KEY` and adds `CRITWIRE_CONTACT_URL`. The fixtures stay as they are, since `type` defaults to BUG.

**New E2E tests (Definition of done):**
1. **Bug and idea.** In the browser, submit a bug (with platform and version) and an idea (its form has no platform or version fields). After the studio publishes both, they're on the board and the list with their types. A report titled "New" publishes under a reachable slug. A studio creating an issue titled "New" with no slug, over REST, gets a 400 with the error on `slug`.
2. **Four stages** (the S4.2 rewrite).
   - Each internal status sits in its stage column, including Planned and In progress.
   - A CLOSED item is absent from the board, the list and the hub, but its page is reachable and marked Archived. It shows its vote count but no vote button, and `POST /api/vote` for it answers 409 and leaves the count unchanged.
   - The type filter narrows the board.
   - A column with more than 25 items shows its true count and a link to the filtered list.
3. **Settings.**
   - With `acceptIdeas` off: no "Suggest an idea", no idea choice on the form, and a POST with `type=IDEA` answers 400.
   - With review on (the default): a clean submission stays NEW and off the board.
4. **Review off.** Clean text is on the board immediately. Flagged text (one profanity, and a body with 3 links) stays NEW and off the board, with `flagged` and the reason visible in the admin.
5. **Redirects.** Each old URL answers 301 or 308 with the right `Location`, and following it lands on a 200. The URLs: the list with `?view=board`, an item, the form, a POST to `report/submit`, the updates feed, feed page 2, an update page, and `feed.xml`. The new feed's items link to `/updates/<slug>`, and their guids are still the `/patch-notes/<slug>` URLs.
6. **Updates ↔ feedback.**
   - An update page lists its shipped items with their votes.
   - A vote on one of them updates the cached update page (eventually).
   - Linking another item makes it appear on the page.
   - Board cards and the item page show the version; a draft update's version never shows.
7. **No generator or builder.** `POST /next/generate-site`, `GET /next/site-preview`, `GET /api/game-pages` and `/admin/collections/game-pages` all answer 404, and the admin nav has no Game Pages.
8. **Home and chrome.** The home page has the GitHub link and the Contact link with the configured `mailto:`, and no signup button. The portal's "Official site" link is present when `links.website` is set and absent when it isn't.

**Int tests.**
- Delete `site-generator` and `site-config-parity` (F12).
- Trim `template-revalidation` to its `_order` case (no E2E test can see a skipped revalidation) and rename it `issue-revalidation`.
- Add `content-screen.int.spec.ts`, the one invariant E2E can't enumerate cheaply. Following the testing rule, the plan first lists its failure modes, then the test is written, **before** `screenText`. The failure modes:
  - a missed profanity, slur or sexual term;
  - missed leetspeak;
  - whitelisted game words flagged;
  - 1 or 2 links flagged, including two `https://www.` links (each URL counts once);
  - 3 links missed, whatever mix of `https://`, `http://` and bare `www.` they use;
  - a shortener missed, with or without a scheme (`https://bit.ly/x`, `bit.ly/x`, `www.t.co/x`);
  - a look-alike host flagged as a shortener (`notbit.ly/x`, `https://bit.ly.example.com/x`);
  - empty reasons on a flagged result;
  - duplicate reasons.
- Update AGENTS.md's int-test list.

**Screenshots.**
- The harness switches themes by PATCHing `game-projects.theme` instead of the landing, and sets `links.website` on Critter Connect so the Official site link shows.
- It drops the legacy-landing shots.
- It captures `/`, the hub, the list, the board, the submit form (bug and idea) and an update page with "From your feedback", under Critter Connect and Riso (the unusual theme), at 1440 and 390 px.
- Output goes to `/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots/`, with an `index.html`. One set, from this build; the before/after split isn't needed.

#### 13. Docs

- **`AGENTS.md`:** the thesis becomes the Product direction (audience, product, MIT and free self-hosting, the free hosted early-access tier, review on by default, no AI generation). The scope guardrail adds "website builder". The int-test list is updated.
- **`docs/features.md`:** the thesis; the collections (GamePage removed; GameProject theme, pitch, key art and feedback settings; Issue `type` and IN_PROGRESS; IssueReport `type` and flags); the enums; the four stages; the submit, review and filter flow; updates ↔ feedback. Pricing is replaced with: self-hosting is free forever; hosted is free during early access, with limits that keep each site minimal; a paid hosted tier may come later; no billing work now. The phases are rewritten to match.
- **`docs/architecture.md`:** the URL table, the rendering table (hub is ISR), and the project structure (no `site-templates`, `site-generator` or `blocks/game`).
- **`docs/patterns.md`:** the hooks list (report: screen, then auto-publish, then promote; the Issue and vote hooks revalidate linked update pages). The "Rich text / landing pages" section goes.
- **`docs/integrations.md`:** the OpenAI section and Upstash use 3 go. Add the content filter (local, `obscenity`, MIT) and `CRITWIRE_CONTACT_URL` in the env list.
- **Other:** `README.md` summary and `.env.example`. `LICENSE`: the MIT text, "Copyright (c) 2026 Critwire contributors" (see the proposed handoff items).

### Proposed decisions (cuts)

1. **The whole landing builder goes:** GamePages, section variants, section order, page drafts and versions, live preview, studio Draft Mode and the legacy game blocks. It's website-building.
2. **The portal chrome is fixed.** Nav labels (Updates, Feedback, Contact) can't be changed, and there's no nav call to action, footer tagline or legal-links switch. Critter Connect's "Field notes" and "Field board" labels are dropped. Simpler wins, and the brief doesn't ask for renaming (the product review suggested it).
3. **Project fields cut:** `accentColor` (the theme owns the accent), `links.trailer`, `availability.demoUrl` and `meta.*`.
4. **Theme changes go live on save,** with no preview. WCAG validation on save is the safeguard.
5. **Internal collection slugs stay.** Admin labels, public routes and copy change.
6. **Kept on purpose:**
   - Tally and external report providers, and contact routing.
   - `availability.platforms`, which drives the primary store link and the build line.
   - The links group, minus the trailer.
   - The marketing `pages` CMS.

### Rejected alternatives

- **Renaming collection slugs** to `feedback`, `submissions` or `updates` renames tables, foreign keys, enums, REST paths, every E2E fixture and the kanban's API calls, and players gain nothing from it.
- **A stripped-down GamePages that holds only the theme** keeps drafts, versions and a page query on every request, all for 14 fields that belong on the project.
- **Screening in the submit route** would let a second write path skip it; the collection hook can't be bypassed.
- **A separate moderation status field** isn't needed: the report status is already the review queue.
- **One board query with a higher cap** only moves the overflow, and the counts stay wrong.
- **Rendering update pages dynamically for live vote counts** breaks S3.5's ISR guarantee, and targeted revalidation is cheap.
- **Middleware or route handlers for the redirects:** AGENTS.md rules out `proxy.ts`, and handlers keep dead routes around.
- **Showing or hiding the bug-only fields in client JS:** a URL-driven `type` works without JS and gives "Report a bug" and "Suggest an idea" direct links.
- **Vendoring a word list:** LDNOOBW is CC-BY-4.0, and a plain list would need our own normaliser and whitelist. `obscenity` is MIT, has no dependencies and already has both.
- **A `shippedInVersion` field** would duplicate `fixedInPatchNote.versionLabel`, which already says it.
- **A hand-built `{ tenant: { equals } }` for the kanban** breaks rule 2 (tenant scoping through the plugin), and it would skip any other base filter on the collection.
- **The plugin's `getTenantListFilter` export** is the same function, but the call site would repeat the plugin's config (field name, tenants slug, `userHasAccessToAllTenants`); `collectionConfig.admin.baseFilter` is the configured instance.
- **Loading more kanban cards through a server action** would need its own auth and request setup for what the REST API already does under access control.
- **A lookup route that sends `/issues/new` to the renamed item** keeps a dead route alive for a row that almost certainly doesn't exist; see §7.
- **Only a `beforeValidate` check for reserved slugs** misses slugs that Payload generates later, in the slug field's `beforeChange` hook (§2).
- **Closing votes on shipped items** would freeze the "From your feedback" counts and remove a signal studios want. It would save only the vote hook's update-page revalidation, since status and link changes still revalidate that page.
- **Passing `reviewSubmissions` through `req.context`** saves one primary-key read but needs a fallback for admin and REST creates, so there would be two paths.

### Risks and resolved questions

- **RSS duplicates: avoided.** Item links move, but guids keep their pre-pivot value (§7), so subscribers see nothing again.
- **The old URL of an item slugged `new`** lands on the submit form, not on the renamed item (§7). Accepted under H6; listed in the Summary.
- **Enum migration order.** In M13, the data updates must come before the generated enum recreation. The migration's comment says so.
- **`obscenity` false positives.** The probe found cockpit, "Dickson" and "tit" (the bird). A flag only makes an item wait for review, and the whitelist lives in the module and the int test.
- **The home page becomes dynamic** (`connection()`). It does no database work, so this costs nothing.
- **Older NEW reports** aren't screened and don't auto-publish when a studio turns review off. The admin help text and the docs say so.
- **The hub is cacheable for the first time.** Today `draftMode()` makes the landing dynamic, so every hub input now has to revalidate it. All of them already do: issue writes, votes, update publishes and project changes (through the portal route pattern). No GamePage hook is left to miss.
- **`description` gets `maxLength: 240`.** A longer existing description blocks the next save of that project until it's shortened, with the error on the field. That's fail-loud, and no data is truncated.
- **F18** (revalidation runs before the commit) stays as the architecture pass decided.

### Handoff items

- **Repo visibility:** not needed. `https://github.com/kc0588615/critwire` is public (checked 2026-09-30, HTTP 200 without auth).
- **LICENSE holder:** filed as H7. It ships as "Critwire contributors" until the owner answers. Nothing is blocked.

## Architecture review (Fable)

VERDICT: APPROVE_WITH_CHANGES

Checked against the code at `ab95970`. Every finding cites real code: the 200-item cap and in-memory counts (`issues.ts:13,58-72`, `issues/page.tsx:87-95`), the `new` slug shadowing introduced by `feedback/new` (`createIssueFromPublishedReport.ts:8-16`), vote revalidation reaching only the landing while update pages are ISR (`adjustUpvoteCount.ts:30-32`, `patch-notes/[slug]/page.tsx:12`), the theme locked inside the landing config plus a second accent source (`PortalChrome.tsx`, `defaults.ts:26-39`), the wrong-way imports (`FlagshipSite.tsx:9`, `seed/critterConnect.ts:9`), the parser drift (`IssueFilters.tsx:13-21` vs `issues/page.tsx:28-34`), the unfiltered kanban queries (`list.tsx:28-41`, `kanban.tsx#fetchMoreIssues`) and the unlabelled store links (`actions.ts:39-48`). External facts verified: `getTenantFromCookie(headers, 'number' | 'text')` is exported from `@payloadcms/plugin-multi-tenant/utilities`; `obscenity@0.4.6` is MIT and current in the registry; `nuqs/server` carries no `server-only` guard and exports `createLoader`; the M14 source columns (`site_hero_tagline`, `site_hero_background_media_id`, `template`, `site_theme_*`) exist in `20260712_082516_flagship_site_config.ts`; the E2E fixtures don't reference the removed project fields. The design matches the brief's Goal, Product direction, Scope and Decision rules, and the moderation and tenant/vote/form-protection stances in §11 hold up. Nothing here is over-engineered: each new module replaces duplicated literals or a real bug.

MUST-FIX:
1. **§4 spam-link rule double-counts.** "Counts `https?://` and `www.` occurrences" scores `https://www.example.com/clip` as 2, so two ordinary screenshot links (`https://www.…` twice) reach the "3 or more" threshold and get flagged, contradicting "one or two links pass" and the int test's "1 or 2 links flagged" failure mode. Count URLs, not tokens: one regex that matches either `https?://\S+` or a bare `www.` not preceded by `//`, then count matches; extract the host from each match for the shortener check.

MISSED:
- **`screenText`'s contract contradicts itself.** §4 states the doc comment promises "never throws and never lets text through" (a failing provider returns `flagged: true`, "Screening unavailable") and, two lines later, that the local implementation "doesn't catch errors" and throws to the route. Pick one for the interface and state it once: either callers handle throws (the local rule, fail-loud) and a future provider wraps its network errors into the flagged result itself, or the interface never throws. As written, the hook author can't know which to code for.
- **Archived items still accept votes.** `/api/vote` checks only read access (`vote/route.ts:70-80`), and §3 keeps CLOSED items reachable by link with their vote counts. The design doesn't say whether the item page still renders `VoteButton` for archived (or shipped) items. Decide and state it; if votes stay open, note it as deliberate.
- **M14 preference cleanup misses the list-view key.** Payload keys per-document preferences `collection-game-pages-<id>` (matches the `collection-game-pages%` pattern) but list preferences `game-pages-list`. Add `key = 'game-pages-list'` to the delete, or the orphan rows stay forever.

SHOULD-CONSIDER:
1. §9: validate `CRITWIRE_CONTACT_URL` once at boot (`instrumentation.ts` `register()`), not per request. A typo in the env var would otherwise 500 the marketing home page on every visit; failing at startup is earlier and louder, and `getContactHref()` then only reads.
2. §4: `autoPublishReport` re-reads the project the route already loaded. Passing `reviewSubmissions` through `req.context` from the route would save the query, but only if the admin create path is also covered; if not, keep the `findByID` and say so. Either is fine; just don't do both.
3. §6 / Risks: the RSS duplicate-once could be avoided by keeping each item's `guid` stable (the old path or the note ID) while `link` moves. Cheap if the feed builder already separates the two; skip otherwise.
4. §2: for the theme `beforeChange` merge, note that the merge is per level (`theme`, then `theme.colors`), since a REST PATCH of one colour arrives as a partial nested object; a shallow spread would wipe the other nine before `safeParse` and produce a misleading validation error.
5. §10: state explicitly that the `_status = 'published'` main-table read is correct because Payload keeps the published document in the main table when a later draft is saved (drafts go to `_game_pages_v`); a reviewer who assumes the opposite will flag it as data loss.

## Architecture review (Astra)

VERDICT: APPROVE_WITH_CHANGES

MUST-FIX:

1. **§8 bypasses the prescribed tenant-filtering interface.** Constructing `{ tenant: { equals: selected } }` manually violates AGENTS.md’s prohibition on hand-rolled tenant filtering. Reuse the plugin-provided list filter for both initial kanban queries and pagination, retaining access enforcement.

2. **§10’s reserved-slug migration can fail and breaks existing links.** Renaming `new` to `new-<id>` can collide with an existing slug in the same game, violating the compound unique index. Meanwhile, §7 redirects `/issues/new` to the submission form instead of the migrated feedback item. Specify collision-safe allocation and permanent redirects from affected old item URLs to their migrated destinations.

SHOULD-CONSIDER:

1. Resolve §4’s contradictory screening contract: it promises never to throw but explicitly permits local exceptions. Define one failure policy that prevents unscreened auto-publication.
2. Define the spam threshold in terms of distinct URL occurrences; counting both `https://` and `www.` flags two ordinary links incorrectly.
3. Preserve RSS GUIDs while changing item links to avoid replaying existing updates.
4. Extend migration verification beyond the seed: include reserved-slug collisions, existing ideas, and partial theme data.
5. State whether archived feedback accepts new votes; retaining existing vote counts does not settle that behavior.

## Revision notes

Every MUST-FIX is resolved in place. Items both reviewers raised are answered once.

**MUST-FIX**
- **Fable 1 / Astra SC2 (link count).** §4 now counts URLs with one left-to-right regex (scheme, bare `www.`, or a bare shortener path), so `https://www.…` is one match. The shortener check uses each match's exact host. I probed the cases in Node, and §12's failure modes now agree (two `https://www.` links pass; look-alike hosts aren't shorteners). Repeats of the same URL each count, because pasting a link again is itself a spam signal.
- **Astra 1 (kanban tenant filter).** §8 rewritten. The kanban calls the plugin-installed `collectionConfig.admin.baseFilter` with a `createLocalReq` request, the same call Payload's list view makes, and combines it with `combineWhereConstraints`. The client's REST "load more" gets the same `Where` through `qs-esm`. Evidence that a custom view must do this itself: `admin.baseFilter` is read only by the admin list view, Lexical and folders, never by Local API or REST operations (file and line refs in §8 and F10). While checking, I found a second F17 bug: a new selection never replaced the kanban's `useState`. It's fixed by keying the kanban on the filter (F10, §8, S6.2).
- **Astra 2 (reserved slugs).** §10 M13 now picks the first free `new-<n>` per game, with the `uniqueIssueSlug` sequence, so it can't hit `gameProject_slug_1_idx`. The redirect half is rejected: `redirects.ts` is static, and a per-item lookup route for a row that almost certainly doesn't exist isn't worth keeping. So an old `/issues/new` goes to the form, stated in §7, Risks and the Summary list, under the owner's H6 decision. While checking, I found that a `beforeValidate` guard can't see slugs Payload generates later, so §2 adds a synchronous `slugify` override, and §12 test 1 covers it.

**Missed / should-consider**
- **`screenText` contract (Fable missed, Astra SC1).** §4 states one contract: resolve a verdict or reject, never resolve clean for unscreened text. Callers don't catch, so a rejection stores and publishes nothing.
- **Votes on archived and shipped items (Fable missed, Astra SC5).** §3: shipped items keep voting. Archived items show the count read-only, and `/api/vote` answers 409. Also §5, §11 and §12 test 2.
- **M14 `game-pages-list` key (Fable missed): rejected.** Payload 3.85.2 keys list preferences `collection-<slug>` (`@payloadcms/next/dist/views/List/index.js:71`) and documents `collection-<slug>-<id>`. `game-pages-list` never exists. §10 now names the two keys and cites both.
- **Contact URL at boot (Fable SC1).** Adopted in §9: `instrumentation.ts` `register()` calls `getContactHref()` once.
- **`reviewSubmissions` re-read (Fable SC2).** Kept the `findByID` and dropped `req.context` (§4, Rejected alternatives): admin and REST creates need it anyway.
- **RSS guids (Fable SC3, Astra SC3).** Adopted in §7: guids stay the pre-pivot URLs through `updateGuid`. Risks and §12 test 5 are updated.
- **Per-level theme merge (Fable SC4).** Adopted in §2, and `null` never overrides a value.
- **`_status = 'published'` read (Fable SC5).** §10 explains it, citing Payload's update operation.
- **Migration coverage (Astra SC4).** §10 Check adds `fixtures.sql` and `assert.sql`, covering a slug collision, FEATURE_REQUEST rows, a partial palette and a draft-only page.

## Steps

**How every step runs.** One step per session: do it, run its checks, tick it, add a Log line (UTC, what, results, the E2E pass count), commit code and plan together, and push `agent/feedback-pivot`.

- **Base checks:** `pnpm exec tsc --noEmit` (it also compiles `tests/` and the screenshot harness), then `pnpm lint`: 0 errors and no more than Baseline's 20 warnings, none in a file the step touched.
- **E2E:** `pnpm test:e2e`, all green, whenever code, markup, copy, routes or schema changed. The pass count moves as tests are added and deleted; the Log records it.
- **Int:** `pnpm test:int` when a step touches `tests/int` or a module an int test imports.
- **Schema changes:** `pnpm generate:types` (commit `src/payload-types.ts`), then `pnpm payload migrate:create <name>`, hand-edited as §10 says (data statements before the generated type changes; plain SQL, no app imports), then `pnpm payload migrate` and `pnpm payload migrate:status` on the mission database. `pnpm test:e2e` replays every migration on its fresh database, so a broken migration fails there too. Labels and `maxLength` don't change the schema; don't run `migrate:create` for them (it prompts).
- **Admin components added or removed:** `pnpm generate:importmap` (commit `src/app/(payload)/admin/importMap.js`).
- **The `dev` row:** `pnpm dev` records one in the mission database. Before `pnpm build`, `pnpm payload migrate` or `migrate:create`, run `psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -c "delete from payload_migrations where name='dev'"`.
- **One heavy job at a time.** E2E, the screenshot harness and `pnpm build` share `.next`; E2E and the harness share the `_e2e` database. Stop any `pnpm dev` or `pnpm start` first. Ports: E2E 3100 (sink 3101), harness 3200, migration check 3300. If `systemctl --user is-active critwire-demo` says active, stop it. No Docker.
- **E2E edits.** A spec changes in the step whose route, markup or copy breaks it. Paths and selectors change freely. An expected value changes only where §12 names the change; each step lists its own, and Verification collects them. Anything else that breaks is a bug in the code, not the test. Specs keep their own literal path helpers and don't import `paths.ts`, so they check the app's URLs independently. Spec file names stay.
- **New tests land with their behaviour**, in the step that implements it. Verification maps each Definition-of-done test to its step.

- [x] S1 · Remove the site generator (M12 `remove_site_generator`)
  - **First move the two helpers other code imports (F8):** `collectSiteMediaRefs` from `site-generator/media.ts` into `site-templates/flagship-game-v1/media.ts` (for `FlagshipSite`), and `siteConfigToPayloadSite` from `site-generator/storage.ts` into `src/seed/siteConfig.ts` (for the seed). Both die with the template in S13.
  - **Delete:** `src/site-generator/`, `src/app/(frontend)/next/generate-site/`, `src/components/admin/game-pages/` and `tests/int/site-generator.int.spec.ts`. In `GamePages/index.ts`, drop the `beforeDocumentControls` entry; in `GamePages/siteFields.ts`, drop `generationField`.
  - `pnpm remove openai`. The `site-generation` Upstash limit lived only in `service.ts`, so it goes with it.
  - **The generator's env and docs:** the "AI site generation" block in `.env.example`; `OPENAI_API_KEY` in `tests/e2e/support/env.ts`; the OpenAI section, Upstash use 3 and the env-list entry in `docs/integrations.md`; `/site-generator` in `docs/architecture.md`'s tree; the `site-generator` bullet in AGENTS.md's int-test list. The rest of the docs change in S21.
  - `pnpm generate:importmap`, `pnpm generate:types`, then **M12**. Its generated SQL must drop exactly §10 M12's columns and tables.
  - **E2E (`tenant-isolation`):** S1.10's three generator tests are deleted. In their place, new **S1.10 "the site generator and the landing builder are gone"** (DoD test 7, first part): `POST /next/generate-site` with a valid body answers 404 for studio A's owner and for an anonymous caller. S13 extends it.
  - **Verify:** base checks; `pnpm test:int` (2 files); migrate and `migrate:status`; `pnpm test:e2e`; `grep -rnE "site-generator|openai|OPENAI|generate-site" src tests docs AGENTS.md package.json .env.example --exclude-dir=migrations | grep -v tenant-isolation.spec.ts` prints nothing.

- [x] S2 · Feedback data model (M13 `feedback_model`)
  - **`collections/options.ts`:** add `FEEDBACK_TYPE_OPTIONS` (Bug `BUG`, Idea `IDEA`); add In Progress (`IN_PROGRESS`) between Planned and Fixed; remove Feature Request.
  - **Issues:** `type` (select, required, default BUG, indexed). `fixedInPatchNote` is labelled "Shipped in update"; its condition and filter stay.
  - **IssueReports:** `type` (select, required, default BUG); `platform` and `gameVersion` shown only when `type` is BUG; `flagged` (checkbox, default false, indexed, admin read-only, sidebar); `flagReasons` (textarea, admin read-only, sidebar, shown when flagged). Nothing sets the flags until S17.
  - **GameProjects `reportForm`:** relabel the group "Player feedback". Add `acceptIdeas` (default true) and `reviewSubmissions` (default true, labelled "Review submissions before they're public"), both shown only when the provider is native. `reviewSubmissions`'s help text says that turning review off doesn't publish submissions already waiting, and that flagged submissions always wait. Nothing reads either until S17.
  - `createIssueFromPublishedReport` copies `type` onto the new issue.
  - **The `Record<IssueStatus,…>` tables that stop compiling** each get an In Progress entry: `PILL_STYLES` in `components/admin/issues/kanban.tsx` (the kanban's new column) and `STATUS_SHAPES` in `components/game/IssueStatus.tsx` (`half`; S7 replaces this table).
  - `pnpm generate:types`, then **M13**, hand-edited per §10 M13:
    - the two `UPDATE … SET type='IDEA', category='OTHER' WHERE category='FEATURE_REQUEST'` statements come before the generated recreation of both category enums, with a comment saying why;
    - the per-game loop renames each `new` slug to the first free `new-<n>` (n ≥ 2), through `db.execute`, in the migration's transaction;
    - check the generated rest: `type` NOT NULL DEFAULT 'BUG' on both tables (indexed on `issues`), `ADD VALUE 'IN_PROGRESS'` before FIXED, the flag columns and index, and both `report_form_*` booleans DEFAULT true.
  - **E2E:** no expected value changes. The public board and the kanban each gain an In Progress column from the options, and S6.2's per-column counts already iterate the options.
  - **Verify:** base checks; migrate and `migrate:status`; `psql "$(grep ^DATABASE_URL= .env | cut -d= -f2-)" -Atc "select enum_range(null::enum_issues_category)" -c "select enum_range(null::enum_issues_status)"` shows no FEATURE_REQUEST and IN_PROGRESS before FIXED; `pnpm test:e2e`. S15 checks the data statements on real rows.

- [x] S3 · Admin labels and the kanban's tenant filter (F17)
  - **Labels (§2):** Issues "Feedback" (singular "Feedback item"), IssueReports "Submissions", PatchNotes "Updates", IssueVotes "Votes". The kanban heading and its create button's `aria-label` read the collection's labels, passed from `list.tsx`'s `collectionConfig`, instead of the literal "Issues" (`list.client.tsx:50`).
  - **F17, exactly as §8:**
    - `list.tsx`: build `req` with `createLocalReq({ req: { headers: await headers() }, user }, payload)`, then `tenantFilter = (await collectionConfig.admin.baseFilter?.({ limit, page: 1, req, sort: '_order' })) ?? null`. Each column's `where` is `combineWhereConstraints([{ status: { equals } }, tenantFilter])` from `payload/shared`, still with `overrideAccess: false` and the user. `tenantFilter` goes to the client as a prop.
    - `kanban.tsx`: `fetchMoreIssues` builds the same `where` and serialises its query with `qs-esm`'s `stringify`. Add `qs-esm` as a direct dependency pinned to the version Payload resolves (`pnpm why qs-esm`; §1 says `8.0.1`).
    - `list.client.tsx`: `<IssuesKanban key={JSON.stringify(tenantFilter)} …>`, so a new selection remounts the board.
  - **E2E (`admin-triage`):** `openKanban` expects the heading "Feedback" (§12). **New S6.2 step (F17):** in a super admin's browser, select studio A in the admin's tenant selector: B's issue isn't on the board. Switch the selector to B with no reload or navigation: B's issue appears and A's `reported` card is gone. The studio-owner steps stay as they are.
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S4 · One module builds every portal URL (F2; no behaviour change)
  - New `src/lib/game-portal/paths.ts`. `portalPaths(slug)` has the keys §1 lists and returns root-relative paths; callers add `getServerSideURL()` where they need absolute URLs.
    - This step returns **today's** URLs (`/issues`, `/report`, `/patch-notes`), so no output changes; S6 switches them.
    - `newFeedback(type?)` appends `?type=bug|idea`: lower case in URLs, while the stored values stay BUG and IDEA.
    - `updateGuid(s)` builds `/g/<game>/patch-notes/<slug>`, with a comment saying the guid is frozen (§7).
  - Move `PORTAL_ROUTE` and `PATCH_NOTES_ROUTE` from `hooks/portalRoutes.ts` into `paths.ts`, renaming the latter `UPDATES_ROUTE` (its value stays `…/(ops)/patch-notes` for now). Keep the file's comment on how Next matches route patterns, then delete the file.
  - Replace every hand-written portal URL with `portalPaths` (F2's list): the route pages, both submit routes' `path`, `PatchNotesFeed.tsx`, `feed.xml/route.ts` (item link and guid built separately), `actions.ts` (`resolveSiteAction`'s internal refs), `SiteFooter.tsx`, `SiteNav.tsx`, `KnownIssues.tsx`, `LatestUpdate.tsx`, `jobs/contact.ts`, `MarketingHome.tsx`, `DEMO_PORTAL_HREF` in `components/marketing/links.ts`, `revalidateGameLanding.ts`, `revalidateGameProject.ts`, `revalidatePatchNotes.ts`, `revalidateGamePortal.ts` and the seed.
  - **E2E:** no spec changes.
  - **Verify:** base checks; `grep -rnF '/g/${' src | grep -v src/lib/game-portal/paths.ts` and `grep -rn "'/g/" src | grep -v src/lib/game-portal/paths.ts` print nothing; `pnpm test:e2e` passes unchanged.

- [x] S5 · Reserve the `new` feedback slug (F3)
  - `paths.ts`: `RESERVED_FEEDBACK_SLUGS = ['new']` and `isReservedFeedbackSlug()`.
  - New `collections/Issues/reservedSlug.ts` (§2):
    - `issueSlugify`: synchronous; Payload's `slugify` from `payload/shared`, then, for a reserved result, a `ValidationError` on `slug` reading "`new` is reserved; choose another slug". Issues use `slugField({ disableUnique: true, slugify: issueSlugify })`.
    - `rejectReservedSlug`: an Issues `beforeValidate` hook with the same error, for a slug typed by hand. It runs before `validateUniqueSlugPerProject`.
  - `uniqueIssueSlug` (in `createIssueFromPublishedReport.ts`) treats reserved slugs as taken, so a report titled "New" becomes `new-2`.
  - **E2E, new `reports-contact` S5.7 "a submission titled "New" never takes the form's URL [F3]"** (DoD test 1, slug part), in its own project:
    - a report titled "New", published by the studio, gets a slug other than `new` (`new-2` here), and its public page answers 200 with that title;
    - a studio creating an issue titled "New" with no slug over REST gets 400 with the error on `slug`;
    - changing an existing issue's slug to `new` over REST gets the same 400.
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S6 · Rename the routes and copy, and redirect every old URL (§5, §7)
  - **Routes:** inside `(ops)`, move `issues/` → `feedback/`, `report/page.tsx` → `feedback/new/page.tsx`, `report/submit/` → `feedback/new/submit/`, and `patch-notes/` → `updates/` (with `page/[pageNumber]`, `[slug]` and `feed.xml`). The `(ops)` group itself goes in S12.
  - `paths.ts` returns the new URLs, and `UPDATES_ROUTE` becomes `${PORTAL_ROUTE}/(ops)/updates`. `updateGuid` keeps `/patch-notes/`.
  - `redirects.ts`: §7's four rules, after the IE rule (301 for GETs, 308 for `report/submit`).
  - **RSS:** each item's `<link>` is `update(s)` and its `<guid isPermaLink="true">` is `updateGuid(s)`, byte-identical to today's. The channel title is "{game} — Updates", and the description no longer says "patch notes".
  - **Copy:**
    - updates pages: "Updates" in the page title, metadata and empty state; the back link reads "All updates";
    - feedback page header per §5: title "Feedback"; purpose "Bugs and ideas from {game} players. Vote on the ones you care about."; "Report a bug" (`newFeedback('bug')`) and, when `reportForm.acceptIdeas` is on, "Suggest an idea" (`newFeedback('idea')`); metadata and empty states to match;
    - the item page's back link reads "All feedback"; the form page's intro points to "feedback" instead of "known issues"; the contact page links to the feedback form;
    - the PatchNotes `summary` help text says "updates feed", and code comments that name the old pages or routes follow.
    - The template's nav labels stay until S11 replaces the chrome, and the form's title until S18.
  - **E2E (paths unless noted):**
    - every spec's path helpers move to `/feedback`, `/feedback/new` and `/updates`: `issuesPath`, `reportPath`, `feedPath`, the S5.3, S6.3 and S6.7 board URLs, S2.1's private-item URL and S2.2's nav hrefs;
    - the form selector becomes `form[action$="/feedback/new/submit"]`, and S6.7 posts to `/feedback/new/submit`;
    - S4.3's fix-link href moves to `/updates/`;
    - `patch-notes`: S3.4's rename test expects the channel title "{game} — Updates", and S3.3's item links are `/updates/<slug>` (§12);
    - S2.2's nav labels don't change here.
  - **New `tests/e2e/redirects.spec.ts`, S7.1 "every old portal URL redirects permanently"** (DoD test 5), in its own project with 11 published updates, so page 2 exists:
    - with `maxRedirects: 0`, each old URL answers 301 with the new URL as `Location`, and following it lands on a 200: `/issues?view=board` (the query survives), `/issues/<slug>`, `/report`, `/patch-notes`, `/patch-notes/page/2`, `/patch-notes/<slug>` and `/patch-notes/feed.xml`;
    - a JSON POST to `/report/submit` answers 308 to `/feedback/new/submit`, and followed, it stores the report;
    - the new feed's items link to `/updates/<slug>`, and their guids are still `<site>/g/<game>/patch-notes/<slug>`.
  - **Verify:** base checks; `pnpm test:e2e`; `grep -nE "issues|report|patch-notes" src/lib/game-portal/paths.ts` shows only `updateGuid` and its comment.

- [x] S7 · Public stages and archived items (§3, F5)
  - New `src/lib/game-portal/stages.ts`: §3's API exactly (`PUBLIC_STAGES`, the `STAGE_OF` record, `publicStage`, `statusesFor`, `ARCHIVED_STATUSES`), importing nothing from Payload.
  - New `components/game/FeedbackStatus.tsx`, replacing `IssueStatus` and `IssueMeta`: the stage's mark (shape per stage) and label, a type tag ("Bug" or "Idea"), then the category and pin. `StatusMark` moves here, and `marketing/IssueLoop.tsx` imports it from here. List rows, the item page (and its notes' marks) and the landing's known-issues rows use it. The board's per-status headings keep the old label helpers until S8.
  - **Archived:** `queryPublicIssues`, `queryBoardIssues` and `queryLandingIssues` add `status not_in ARCHIVED_STATUSES`; `getPublicIssue` doesn't. An archived item's page says "Archived" and shows `VoteCount` with no `VoteButton`. `/api/vote` selects `status` next to `tenant` and answers 409 for archived items, before the toggle.
  - **E2E:**
    - `issues-voting` S4.1: the badge step expects stage labels (the Reported, Investigating, Workaround Available and Needs More Info rows say "Under review"; the Fixed row says "Shipped"), still checking every row (§12).
    - `portal-landing` S2.5 "follow issue changes": the status change goes REPORTED → PLANNED, expecting "Under review", then "Planned" (§12).
    - `admin-triage` S6.3: the drag goes from Reported to **Planned**, in a viewport wide enough for both columns (`page.setViewportSize`); REST reports PLANNED; the public board's Planned column and the landing's row show it (§12).
    - **New `issues-voting` S4.7 "an archived item leaves the board, the list and the landing, keeps its page and stops taking votes"** (DoD test 2, archived part), in its own project: a public CLOSED item with one vote isn't on the board, the list or the landing; its page answers 200, says "Archived", and shows the count with no vote button; `POST /api/vote` answers 409, and the stored count stays 1 (the `tally` helper).
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S8 · The four-stage board and shared filters (§5, F1, F9)
  - New `lib/game-portal/feedbackSearchParams.ts`: one parser map from `nuqs/server`:
    - `view` (list or board; list by default), `type` (bug or idea), `stage` (a stage id), `category` (a category value; a stale `FEATURE_REQUEST` parses as unset), `q`, `sort` (top or latest) and `page`;
    - the page's `createLoader` and the client's `useQueryStates` both use it.
  - `IssueFilters` becomes `FeedbackFilters`: search ("Search feedback…"), category, type, stage and sort in list mode; only the type filter and the view toggle in board mode.
  - `queryPublicIssues` gains `type` and `stage` (through `statusesFor`).
  - New `queryBoardColumn({ projectID, stage, type })`: `limit: 25`; sorted pinned, votes, newest; a `select` of the card fields; `fixedInPatchNote` populated at depth 1 with `overrideAccess: false`.
  - New `FeedbackBoard`:
    - four regions, each named by its stage label alone (as the status columns are today);
    - the four queries in one `Promise.all`; each count is its `totalDocs`;
    - each card shows its title, type tag, votes and pin;
    - past 25 items, "See all N" links to the list with `?stage=<id>`.
  - `BOARD_ISSUE_LIMIT`, `queryBoardIssues` and `IssueStatus.tsx` go.
  - **E2E:**
    - **`issues-voting` S4.2 rewritten as "the board shows four public stages"** (DoD test 2). It gets its own describe and project, so S4.1's list stays as it is:
      - each internal status sits in its stage's column, Planned and In progress included, and a CLOSED item is in none;
      - the type filter narrows the board to ideas, and back;
      - a column with 26 items shows 26 and "See all 26", which opens the list filtered to that stage (page 1 of 2, only that stage);
      - the privacy and read-only steps are kept word for word.
    - S4.1: the combobox indexes follow the new filter bar, and the placeholder is "Search feedback…" (selectors only).
    - `admin-triage`: `boardColumn` finds the region by `publicStage(status).label`; S6.7's public column is "Under review" (§12).
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S9 · The project theme: field, validation and M14 `portal_theme` (§2, §10)
  - **Move, with the same behaviour:** `schema/theme.ts` and `schema/contrast.ts` → `src/lib/game-portal/theme.ts` and `contrast.ts`; `render/themeStyle.ts` and `fonts.ts` → `src/components/game/theme/`. Update every import: `GamePages/siteFields.ts`, the template, `(public)/not-found.tsx`, `tests/e2e/portal-landing.spec.ts`, `tests/screenshots/*` and `tests/int/site-config-parity.int.spec.ts`.
  - **New `collections/GameProjects/theme.ts`:**
    - the `theme` group field, built from the Zod schema: colour keys from `DEFAULT_THEME_COLORS`, options from the enums, defaults from the schema;
    - `validateProjectTheme` (GameProjects `beforeChange`), exactly as §2 says: merge per level (the default theme, then `originalDoc.theme`, then `data.theme`, where `null` or `undefined` never overrides a value), `safeParse`, and on failure a `ValidationError` with paths `theme.colors.<key>`. The hook only throws.
  - The Critter Connect seed also writes the project's `theme`: the palette its flagship page uses today.
  - `pnpm generate:types`, then **M14**: the generated `theme_*` columns and enums, then, hand-written after them, the copy from each project's **published** flagship page, per the first four bullets of §10 M14 (all ten colours or none; the four selects cast through `::text::`; `banner_id` where the project has none; `description` from the tagline where the project has none). The lock-row, preference and drop statements belong to M15 (S13; see Decisions).
  - Rendering doesn't change yet: the portal wears the landing's theme until S10.
  - **E2E, new `portal-landing` "S2.4 project theme" (first part):** saving `theme` with low-contrast text on the background, low-contrast button text or a 3-digit hex answers 400; a save that sets only the accent answers 200, and the stored palette is the default with that accent. The old "S2.4 publishing a flagship page" stays until S10 and S12 take it apart.
  - **Verify:** base checks; `pnpm test:int` (the parity test imports the moved schema); migrate and `migrate:status`; `pnpm test:e2e`.

- [x] S10 · The portal wears the project's theme (F6)
  - `resolveProjectTheme(project)` in `lib/game-portal/theme.ts`: `safeParse` of `project.theme`; on failure, report to Sentry and use the default theme (§2).
  - `SiteRoot` and `SiteFrame` take that theme: the landing (`FlagshipSite` and legacy blocks) and the ops pages (`PortalChrome`) pass `resolveProjectTheme(project)`, and a page's `site.theme` is no longer read. GameProjects writes already revalidate the whole portal.
  - **E2E (`portal-landing`):**
    - **S2.3 is deleted** (§12): both tests exercise `deriveAccentColors`, and `accentColor` no longer affects anything.
    - The old S2.4 loses its three theme cases (low-contrast colours, low-contrast button text, 3-digit hex) and its two theme steps ("ops pages follow the published theme", "setting only the accent keeps the default palette"). Its heading and publish steps stay until S12.
    - "S2.4 project theme" is completed: each rejected save leaves the landing's `.fs-root` style as it was; a valid save re-themes the cached updates page and the landing (eventually, through `--fs-accent`); after the accent-only save, the primary button's background is the accent.
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S11 · Fixed portal chrome and the Official site link (§1 Moved, §5 Chrome, F11)
  - New `lib/game-portal/links.ts`: `resolveProjectLinks`; one label table covering every link field, the gog, playstation, xbox, nintendo and youtube links included (F11); and `resolvePrimaryStoreUrl` without the `links.website` fallback. `actions.ts` imports them.
  - `PORTAL_NAV` (Updates, Feedback, Contact) in `paths.ts`.
  - New `components/game/PortalFrame.tsx` (with `PortalRoot`), `PortalNav.tsx`, `PortalNavLinks.tsx` and `PortalFooter.tsx` replace `SiteFrame`/`SiteRoot`, `SiteNav`, `SiteNavLinks` and `SiteFooter`, which are deleted. They take `project` and get the theme from `resolveProjectTheme`.
    - **Nav:** the logo and name, linking to the hub; the three `PORTAL_NAV` links; an external "Official site" link to `links.website` when it's set, at every width (the phone rule that hides `.fs-nav-cta` doesn't apply to it).
    - **Footer:** the name, the portal links, every outbound link the project has, and "Powered by Critwire". No tagline or legal-links switch.
  - `FlagshipSite`, the legacy-block landing and the `(ops)` layout render `PortalFrame`. `PortalChrome` and `getPortalSiteConfig` go, so no ops page queries `game-pages` any more (F6). `(public)/not-found.tsx` uses `PortalRoot` with the default theme.
  - **E2E (`portal-landing`):**
    - S2.2's nav step expects Updates, Feedback and Contact, linking to `/updates`, `/feedback` and `/contact` (§12).
    - **New S2.7 "the portal links back to the studio's own site"** (DoD test 8, chrome part): with `links.website` set, the banner has an "Official site" link to it at 1440 and at 390 px; without it, there's none. S2.6 stays.
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S12 · The hub replaces the landing (§5 Hub, F12)
  - `g/[gameSlug]/page.tsx` becomes the hub: `revalidate = 3600`, `generateStaticParams` returning `[]`, no Draft Mode, no configuration; `generateMetadata` unchanged.
  - **`HubHeader`:** the design pass's title plate over the `banner`, or directly on the page when there's no art. The `h1` is the name, the pitch is `description`, and the build line comes from `availabilityFacts` (moved here). Links, deduplicated by URL: "Get the game" (`resolvePrimaryStoreUrl`) as the primary button, then the other store links, Discord and Official site. It carries no `aria-labelledby`, so S2.2's order check sees only the two sections.
  - **`LatestUpdates`** (`#fs-latest-updates-heading`): `queryPublishedPatchNotes({ limit: 3 })`, then "All updates" and RSS.
  - **`TopFeedback`** (`#fs-top-feedback-heading`): 5 open items from `queryTopFeedback`, today's compact `queryLandingIssues` (not shipped, not archived; pinned, then votes, then newest). Each row's text starts with its title, as the known-issues rows do today (S4.4 reads them), then `FeedbackStatus` and the votes. The section ends with "Report a bug", "Suggest an idea" (when `acceptIdeas` is on) and "See all feedback".
  - An empty section invites the first update or the first report instead of disappearing.
  - **The `(ops)` group goes:** its pages move up to `g/[gameSlug]/`, its layout is deleted, and `g/[gameSlug]/layout.tsx` 404s unknown slugs and renders `PortalFrame`. `UPDATES_ROUTE` becomes `${PORTAL_ROUTE}/updates`; update its comment's example.
  - `revalidateIssueLanding`'s `LANDING_FIELDS` gains `type`.
  - **GameProjects:** `description` is relabelled "Pitch", with `maxLength: 240` and §2's help text; `banner` is relabelled "Key art". `pnpm generate:types`; no migration.
  - The landing's render path (`FlagshipSite`, the slots, `landingPage.ts`, `RenderGameBlocks`) is now unused; S13 deletes it with the rest.
  - **Int:** `template-revalidation.int.spec.ts` is trimmed to its `_order` case and renamed `issue-revalidation.int.spec.ts` (F12). E2E S2.5 now observes the move between games.
  - **E2E:**
    - `portal-landing` S2.2 becomes the hub (§12): heading and share metadata unchanged; "the primary call to action is the first platform's store", with its selector in the hub header; section order `[fs-latest-updates-heading, fs-top-feedback-heading]`; the bare-project test is kept. **The trailer test is deleted**, and `links.trailer` leaves the fixture.
    - S2.5 becomes the hub sections (§12): Latest updates lists v2, then v1, and never the draft; the top-feedback step is kept; the status-change and move-between-games steps read `#fs-top-feedback-heading`.
    - The rest of the old S2.4 is deleted (§12): "publishes, keeps drafts private, and falls back when unpublished", and "rejects an unsafe or invalid configuration" with its tagline, raw-URL-ref and variant cases. The hub renders no page.
    - `issues-voting` S4.4 and `admin-triage` S6.3 read the hub's `#fs-top-feedback-heading` rows (selectors only).
    - `tenant-isolation` S1.9: "a studio user in Draft Mode sees only published marketing content and other studios' published pages" is deleted (§12). "studio B cannot preview studio A's landing page" stays until S13 removes the route.
  - **Verify:** base checks; `pnpm test:int`; `pnpm test:e2e`, including S3.5 (updates pages stay ISR) and S3.4 (the new `UPDATES_ROUTE`).

- [x] S13 · Remove the landing builder (M15 `remove_landing_builder`)
  - **Delete:** `src/collections/GamePages/`; the rest of `src/site-templates/`, then the directory; `src/blocks/game/`; `components/game/GameButtons.tsx`; `lib/validation/video.ts`; `lib/game-portal/landingPage.ts`; `src/seed/siteConfig.ts`; `app/(frontend)/next/site-preview/` and `lib/security/sitePreviewToken.ts`; the `game-pages` entries in `payload.config.ts` and `plugins/index.ts`. `resolveProjectSlug` types its argument without `GamePage`. The marketing `/next/preview` stays.
  - **GameProjects:** remove `accentColor`, `links.trailer`, `availability.demoUrl` and the `meta` group, and the "AI site generation" and "action registry" wording in the admin descriptions.
  - **Dashboard (`BeforeDashboard`, §8):** the Game Pages step becomes "Theme and links" (the game project) and "Review submissions" (the Submissions list), and no step mentions a landing page, patch notes or known issues any more.
  - **Seed:** no landing page, `accentColor` or `meta`.
  - `pnpm generate:types`, `pnpm generate:importmap`, then **M15**:
    - first, hand-written: delete the lock rows that point at game pages, drop `payload_locked_documents_rels.game_pages_id`, and delete the `payload_preferences` rows keyed `collection-game-pages` or `collection-game-pages-%` (§10 M14, third bullet);
    - then the generated drops: every `game_pages*` and `_game_pages_v*` table, the `enum_game_pages_*` types, and `game_projects.accent_color`, `links_trailer`, `availability_demo_url` and `meta_*`. Nothing else; media stays.
  - **Int:** delete `site-config-parity.int.spec.ts` (F12).
  - **Screenshot harness, so it compiles** (S14 finishes it): `setup.shots.ts` stops reading the flagship page and creating the legacy block landing (`legacy` leaves `ShotsWorld`) and reads the Critter Connect baseline style from the hub; `design.shots.ts`'s `applyTheme` PATCHes `game-projects.theme` for Riso and the default theme, and re-POSTs the seed for Critter Connect.
  - **E2E:**
    - `tenant-isolation`: `game-pages` leaves S1.1's list and the fixtures; S1.9's page fixtures and "studio B cannot preview studio A's landing page" are deleted (§12); the `GamePage` and `signSitePreviewToken` imports go.
    - S1.10 (DoD test 7) gains: `GET /next/site-preview?token=x` answers 404; the super admin's `GET /api/game-pages` answers 404; `/admin/collections/game-pages` answers 404; the super admin's admin nav has no "Game Pages" link.
    - `portal-landing` drops its `GamePage` import.
  - **Verify:** base checks; `pnpm test:int` (1 file); migrate and `migrate:status`; `pnpm test:e2e`; `grep -rnE "game-pages|GamePage|site-templates|blocks/game|site-preview|sitePreview|accentColor|demoUrl" src tests --exclude-dir=migrations | grep -v tenant-isolation.spec.ts` prints nothing.

- [x] S14 · Prune the landing-only styles and point the screenshot harness at the hub
  - `portal.css`: delete the landing-only rules §1 lists (features, gallery, adaptive, community band, final CTA, trailer, availability rows, and the hero variants `HubHeader` doesn't use). Keep the title plate, the tokens, the focus, motion and prose rules, and everything the hub, the portal pages and the forms use. Grep `src` for each selector before deleting it.
  - **Harness, per §12:**
    - `catalog.ts`: groups `critter-connect`, `riso` and `marketing`; the `default` group, its first-run shots, the legacy shot and the focus shots go (see Decisions). Themed pages: the hub, the feedback list, the board, the submit form as a bug (`?type=bug`) and as an idea (`?type=idea`), and the launch update's page. Marketing: `/`.
    - `setup.shots.ts` sets `links.website` on Critter Connect, so the Official site link shows.
    - `writeIndex.ts` shows only the sets that have a `meta.json`, under a title for this mission. Probes that name the landing name the hub.
  - **Look:** `SHOTS_SET=after SHOTS_DIR=/tmp/feedback-pivot-wip SHOTS_THEMES=critter-connect,riso pnpm screenshots --project desktop`. Open the hub, list, board and update PNGs and fix anything the pruning broke. Never point a Look at the artifact directory.
  - **Verify:** base checks; the Look run passes; `pnpm test:e2e`.

- [x] S15 · Migration check on a copy of the Critter Connect seed (§10 Check)
  - **`tests/migrations/feedback-pivot/fixtures.sql`**, written against the `683de8d` schema, finding rows by slug (never by hard-coded IDs):
    - in Critter Connect, an issue slugged `new` and another slugged `new-2`;
    - an issue and a report with the category FEATURE_REQUEST;
    - a second project, with no description, whose published flagship page sets 3 of the 10 colours, `typography` and a hero tagline. Set the other seven colours to NULL explicitly: the columns have defaults;
    - a third project whose only flagship page is a draft with a full palette;
    - a `collection-game-pages` preference row and a lock row on a game page, so the cleanup assertions test something (see Decisions).
  - **`assert.sql`:** one `DO` block that raises on the first mismatch, covering every bullet of §10 Check step 3, plus the dropped `game_projects` columns and the lock rows.
  - **Run it** with Verification's "Migration check" commands, and save `commands.sh`, `migrate.log` and `assert.log` in `/srv/critter-ai/agent-state/missions/feedback-pivot/migration-check/`.
  - A failure is fixed in the migration it points at (none has shipped yet), then the check re-runs from the dump.
  - **Verify:** `assert.sql` finishes without an exception. If a migration changed: base checks and `pnpm test:e2e`.

- [x] S16 · Content filter: failure modes, then the int test, then `screenText` (§4)
  1. Re-read the Failure modes section below against §4, and add any mode found since.
  2. `pnpm add obscenity@0.4.6` (exact version).
  3. Create `src/lib/moderation/screenText.ts` exporting §4's `ScreenResult` type and a `screenText` that rejects with "not implemented". Write `tests/int/content-screen.int.spec.ts` from the Failure modes list, one `it` per mode. Run `pnpm test:int` and see every new test fail.
  4. Implement §4's local filter: `RegExpMatcher` with `englishDataset` and `englishRecommendedTransformers`; the `cockpit` whitelist entry; the one link regex built from `SHORTENERS`; the host rule; the thresholds (3 or more links, or any shortener); the reason formats. The contract goes in the doc comment, once. The module exports only `screenText` and `ScreenResult`.
  - Nothing calls it until S17.
  - **Verify:** `pnpm test:int` (3 files) green; base checks. No E2E: no behaviour changes.

- [x] S17 · Moderation: screening, auto-publish and the submit endpoint (§4)
  - **`IssueReports/hooks/screenReportText.ts`** (`beforeChange[0]`): on create, or on an update that changes `title` or `description`, it screens `` `${title}\n\n${description}` `` of the merged report and sets `flagged` and `flagReasons` (one reason per line; cleared when the text is clean). It doesn't catch.
  - **`IssueReports/hooks/autoPublishReport.ts`** (`beforeChange[1]`): on create only, when the status is NEW, the report isn't flagged and the project's `reportForm.reviewSubmissions === false` (one `findByID`: depth 0, `select: { reportForm: true }`, through `req`), it sets the status to PUBLISHED. The existing promotion hook, now `beforeChange[2]`, creates the issue.
  - **Submissions list (§8):** default columns title, type, gameProject, status, flagged and createdAt; `flagged` filterable; the status field's description reads "Flagged submissions wait here even when review is off."
  - **`feedback/new/submit/route.ts`:**
    - the Zod schema gains `type: z.enum(['BUG','IDEA']).default('BUG')`;
    - an idea when `acceptIdeas` is off answers 400;
    - an idea's platform and version are dropped before the write;
    - the JSON reply is `{ id, ok, published }`; an HTML post gets a 303 to `newFeedback(type)` with `submitted=published` or `submitted=1`;
    - `formResponse` takes an optional `submitted` value (default `'1'`);
    - the guard order is unchanged.
  - **E2E (`reports-contact`):**
    - **S5.9 "with review on, a clean submission waits for the studio"** (DoD test 3, review part): on a project with default settings, a JSON submission answers `published: false`; the report is NEW and not flagged; the board doesn't list it.
    - **S5.10 "turning ideas off refuses ideas"** (DoD test 3, ideas part; S18 adds the pages): with `acceptIdeas` off, a JSON POST with `type: 'IDEA'` answers 400 and stores nothing, and a bug still answers 200.
    - **S5.11 "with review off, clean text publishes at once and flagged text waits"** (DoD test 4): with `reviewSubmissions` off, a clean submission answers `published: true` and is on the board at once, with its type. A title with one profanity, and a body with three links, each answer `published: false`, stay NEW and stay off the board. In the studio owner's admin, each shows Flagged checked and its reason (`Offensive word: …`, `3 links`).
    - S5.1's `[?&]submitted=1` check keeps passing unchanged.
  - **Verify:** base checks; `pnpm test:int`; `pnpm test:e2e`.

- [x] S18 · The submit form asks "Bug or idea?" (§5 Submit form)
  - `feedback/new/page.tsx`, server-rendered, with no client JS. Tally and external providers render as they do today, whatever the type.
  - **Native form:**
    - the first control is "Bug or idea?": two links (`?type=bug`, `?type=idea`), with `aria-current` on the chosen one;
    - the rest shows only once a type is chosen; with `acceptIdeas` off, the page goes straight to the bug form;
    - Bug: title, "What happened?", category, email, platform, game version, and "Send report". Idea: title, "What's your idea?", category, email, and "Send idea". A hidden `type` input carries the choice;
    - the h1 follows the type: "Report a bug", "Suggest an idea", or "Send feedback" before a choice (see Decisions).
  - **Notices by `submitted`:** `published` adds "It's on the board now."; `1` adds "The team reviews submissions before they're public." Each starts with "Report sent." or "Idea sent.", which S5.1 reads.
  - **E2E (`reports-contact`):**
    - S5.1 picks "Bug" first, then fills the form as today (§12).
    - **New S5.8 "a bug and an idea from the browser reach the board and the list with their types"** (DoD test 1): in the browser, submit a bug with platform and version, and an idea, whose form has no platform or version fields; the studio publishes both over REST; both are on the board and the list, tagged "Bug" and "Idea".
    - S5.10 gains the pages: with `acceptIdeas` off, the feedback page and the hub (eventually) have no "Suggest an idea", and the form offers no type choice and shows the bug form.
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S19 · Updates ↔ feedback (§6)
  - **`FromYourFeedback`** on the update page: `queryShippedFeedback(noteID)` returns public FIXED items whose `fixedInPatchNote` is this update, sorted by votes; each shows its title link, type and `VoteCount`. The section hides when empty.
  - **Shipped version** on list rows, board cards and the item page: the update's `versionLabel`, or its title, when the update is published; otherwise just "Shipped". The item page's note reads "Shipped in {version — title}" and links to the update (S4.3's link name `v2.1.0 — Harbor hotfix` stays). The list query populates `fixedInPatchNote` like the board's: depth 1, through access, selected fields.
  - **Revalidation (rule 4):**
    - new `src/hooks/revalidateUpdatePage.ts`: `revalidateUpdatePage(noteID, payload)` reads the update's slug, project and status and, when it's published, calls `revalidatePath(portalPaths(game).update(slug))`;
    - new `Issues/hooks/revalidateLinkedUpdates.ts`: an `afterChange` hook that revalidates the old and the new update's page when `fixedInPatchNote` changes, or when a linked public item's `title`, `slug`, `status`, `type` or `isPublic` changes (never for `_order`-only writes), plus the same on `afterDelete` for a linked item;
    - `adjustUpvoteCount` also selects `fixedInPatchNote` and `status`, and a vote on a public, shipped, linked item also revalidates that update's page.
  - **Seed:** add an idea (PLANNED), an in-progress bug and a shipped bug linked to the launch update (§10 Seed).
  - **E2E, new `patch-notes` S3.6 "an update lists the feedback it shipped"** (DoD test 6):
    - an update's page lists its two shipped items with their votes, the higher first;
    - a vote on one updates the cached page (eventually);
    - linking a third item makes it appear (eventually);
    - board cards and the item page show the version; an item shipped in a draft update shows "Shipped", never the draft's version or title.
    - The update page stays ISR (S3.5).
  - **Verify:** base checks; `pnpm test:e2e`.

- [x] S20 · Critwire's home page and its Contact link (§9)
  - **`components/marketing/links.ts`** (no React imports): `GITHUB_REPO_URL`, and `getContactHref()`, which reads `CRITWIRE_CONTACT_URL`: unset or empty returns `null`, and anything but a `mailto:` or `https:` URL throws. `register()` in `src/instrumentation.ts` calls it once in the Node.js runtime. `environment.d.ts` and `.env.example` document the variable.
  - **`(frontend)/page.tsx`** awaits `connection()`, reads `getContactHref()` and passes it to `MarketingHome`, rewritten per §9:
    - the headline; the loop retold with stages (`IssueLoop`); what players get (updates with RSS, the board, the bug and idea forms, each linking into the demo through `portalPaths`); moderation on by default; "Free to self-host (MIT). Free hosted early access.";
    - links to the demo portal, GitHub and Contact (Contact only when set). No signup button; "Sign in" stays. The marketing header links to GitHub.
  - Copy that still describes the old product: `/`'s metadata, the `(frontend)` and `(public)` layout descriptions, and `BeforeLogin`.
  - `tests/e2e/support/env.ts`: `CRITWIRE_CONTACT_URL: 'mailto:e2e@critwire.test'`.
  - **E2E, new `tests/e2e/home.spec.ts`, S8.1 "the home page tells the feedback story and links to GitHub and Contact"** (DoD test 8, home part): `/` answers 200; it has a link to `https://github.com/kc0588615/critwire` and a "Contact" link to `mailto:e2e@critwire.test`; no link or button is named like sign up, signup, get started or create account; "Sign in" is there.
  - **Fail-loud check:** after the E2E run, `CRITWIRE_CONTACT_URL='javascript:alert(1)' PORT=3000 pnpm start` must fail at startup. If Next only logs the error and keeps serving, make `register()` stop the process, and record it under Decisions.
  - **Verify:** base checks; `pnpm test:e2e`; the fail-loud check.

- [x] S21 · Docs, README, .env.example and LICENSE (§13)
  - **AGENTS.md:** the thesis becomes the Product direction; the scope guardrail adds "website builder"; the build-process paragraph matches the rewritten phases; the int-test list names `content-screen` and `issue-revalidation`, with their reasons; the `pnpm screenshots` entry matches the new catalog. Nothing mentions OpenAI, the generator, GamePages or the landing builder.
  - `docs/features.md`, `docs/architecture.md`, `docs/patterns.md` and `docs/integrations.md` per §13; the `README.md` summary; `.env.example` reviewed end to end.
  - **`LICENSE`:** the MIT text with "Copyright (c) 2026 Critwire contributors", or the holder the owner gave in H7 if it's answered by then.
  - **Verify:** base checks; Verification's audits print nothing. No E2E: docs only.

- [x] S22 · Screenshots (Definition of done)
  - Run `SHOTS_SET=after SHOTS_DIR=/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots pnpm screenshots`, never alongside `pnpm test:e2e`. It must write 26 PNGs (6 portal pages × 2 themes × 2 widths, plus `/` at both widths), `after/meta.json`, `after/checks.json` and `index.html`.
  - Open every PNG at both widths: the hub, the list, the board, both forms, and the update page's "From your feedback". Fix what reads wrong; if code changed, run `pnpm test:e2e`, then re-shoot.
  - Fill in the screenshot record in Verification.
  - **Verify:** the run passes with every probe; base checks, and `pnpm test:e2e` if code changed.

- [ ] S23 · Full verification and the Summary
  - Run Verification's commands in order, one at a time, and archive the E2E report and its log. Re-run the migration check if `git diff <S15's commit> -- src/migrations tests/migrations` isn't empty.
  - **Write the Summary** (Definition of done):
    - what was removed, and why;
    - the four migrations and what each does;
    - every field, collection and table removed, and what existing content was mapped where (§10's lists, the `/issues/new` exception included);
    - the content filter's approach, its word list (`obscenity`'s `englishDataset`) and its licence (MIT);
    - the E2E, int, migration-check and screenshot artifacts, with the commands that reproduce them;
    - both review verdicts;
    - open follow-ups, H7 included if it's still waiting.
  - Set `status: done` in the front matter. Drop the two scratch databases and remove the temporary worktree.
  - **Verify:** everything in Verification.

## Verification

E2E comes first. Run everything from the worktree root, one heavy job at a time, with no `pnpm dev` or `pnpm start` running. The only test written in isolation is the content filter's int test; its failure modes are listed below, before any code.

**Commands and what they must show (S23)**

1. `pnpm test:e2e 2>&1 | tee /tmp/feedback-pivot-e2e.log`
   - Every test passes, 0 failed; the config allows no retries. The count is Baseline's 73, minus the 10 tests the steps delete, plus the new ones; it must equal the last step's Log count.
   - Artifact: copy `playwright-report/` to `/srv/critter-ai/agent-state/missions/feedback-pivot/e2e-final/`, and the log to `e2e-final/run.log`. Every test has a trace and screenshots (`trace: 'on'`, `screenshot: 'on'`).
   - Reproduce with `pnpm test:e2e`. View with `pnpm exec playwright show-report /srv/critter-ai/agent-state/missions/feedback-pivot/e2e-final`.
2. `pnpm exec tsc --noEmit`: exit 0.
3. `pnpm lint`: 0 errors and no more than 20 warnings (Baseline), none in a file this mission added.
4. `pnpm test:int`: 2 files, `content-screen` and `issue-revalidation`, all passing.
5. Build: delete the `dev` row; `pnpm payload migrate:status` shows every migration run, the four new ones included; `pnpm build` exits 0.
6. Migration check (commands below): `assert.log` ends without an exception.
7. Screenshots (S22): the run passes with every probe.
8. Audits. Each prints nothing:

```
grep -rniE "site-generator|openai|generate-site|site-preview|sitePreview|game-pages|GamePage|site-templates|blocks/game|accentColor|demoUrl" src docs AGENTS.md README.md .env.example package.json --exclude-dir=migrations
grep -rlE "site-generator|OPENAI|generate-site|site-preview|game-pages|GamePage|site-templates|accentColor" tests | grep -vE "tests/e2e/tenant-isolation.spec.ts|tests/migrations/"
grep -rnF '/g/${' src | grep -v src/lib/game-portal/paths.ts        # F2: every portal URL comes from paths.ts
grep -rn "'/g/" src | grep -v src/lib/game-portal/paths.ts
grep -rnE "Known issues|known issues|Patch notes|patch notes" src --include=*.ts --include=*.tsx --exclude-dir=migrations
grep -nE '"(obscenity|qs-esm)": "[~^]' package.json                  # both pinned exactly
```

**Migration check (S15; S23 re-runs it if a migration changed).** The mission's database role has CREATEDB.

```
CHECK=/srv/critter-ai/agent-state/missions/feedback-pivot/migration-check; mkdir -p $CHECK
U="$(grep ^DATABASE_URL= .env | cut -d= -f2-)"; B="${U%/*}"
PRE=critwire_m_feedback_pivot_premig; COPY=critwire_m_feedback_pivot_migcheck
psql "$U" -c "drop database if exists $PRE" -c "drop database if exists $COPY" -c "create database $PRE" -c "create database $COPY"
git worktree add --detach /tmp/fp-premig 683de8d
sed -e "s|^DATABASE_URL=.*|DATABASE_URL=$B/$PRE|" -e "s|^NEXT_PUBLIC_SERVER_URL=.*|NEXT_PUBLIC_SERVER_URL=http://localhost:3300|" .env > /tmp/fp-premig/.env
cd /tmp/fp-premig && pnpm install --frozen-lockfile && pnpm payload migrate && SKIP_BUILD_STATIC_GENERATION=1 pnpm build
PORT=3300 pnpm start        # in the background; wait for http://localhost:3300/api/health
# over REST on :3300, as tests/screenshots/setup.shots.ts does: POST /api/users/first-register, then POST /api/tenants
curl -fsS -X POST -H "Authorization: Bearer $(grep ^CRON_SECRET= .env | cut -d= -f2-)" http://localhost:3300/api/seed/critter-connect
# stop the server, then:
cd /srv/critter-ai/worktrees/feedback-pivot
psql "$B/$PRE" -v ON_ERROR_STOP=1 -f tests/migrations/feedback-pivot/fixtures.sql
pg_dump "$B/$PRE" | psql -v ON_ERROR_STOP=1 -q "$B/$COPY"
DATABASE_URL="$B/$COPY" pnpm payload migrate 2>&1 | tee $CHECK/migrate.log
psql "$B/$COPY" -v ON_ERROR_STOP=1 -f tests/migrations/feedback-pivot/assert.sql 2>&1 | tee $CHECK/assert.log
```

The shell doesn't keep variables between agent tool calls, so write the block into `$CHECK/commands.sh` and run it in pieces from there; it's then also the record of what ran. `migrate.log` must list M12 to M15 as run; `assert.log` must end without an `ERROR`.

**New tests, the requirement each covers, and the step it lands in.** The first seven rows are the Definition of done's list; the other three are §12's remaining new tests.

| Requirement | Spec › test | Step |
|---|---|---|
| A bug and an idea submitted and published | `reports-contact` › S5.8 a bug and an idea from the browser reach the board and the list with their types; S5.7 a submission titled "New" never takes the form's URL [F3] | S18, S5 |
| The four-stage mapping on the board | `issues-voting` › S4.2 the board shows four public stages; S4.7 an archived item leaves the board, the list and the landing, keeps its page and stops taking votes | S8, S7 |
| The ideas and review settings | `reports-contact` › S5.9 with review on, a clean submission waits for the studio; S5.10 turning ideas off refuses ideas | S17, S18 |
| Review off: clean text auto-publishes, flagged text waits | `reports-contact` › S5.11 with review off, clean text publishes at once and flagged text waits | S17 |
| Every old URL, including RSS, redirecting | `redirects` › S7.1 every old portal URL redirects permanently | S6 |
| The update ↔ feedback links | `patch-notes` › S3.6 an update lists the feedback it shipped | S19 |
| No generator in the admin or the API | `tenant-isolation` › S1.10 the site generator and the landing builder are gone | S1, S13 |
| The home page and the portal's link back (Goal 3, 8) | `home` › S8.1 the home page tells the feedback story and links to GitHub and Contact; `portal-landing` › S2.7 the portal links back to the studio's own site | S20, S11 |
| The theme stays valid and themable (Goal 3) | `portal-landing` › S2.4 project theme | S9, S10 |
| The kanban follows the tenant selector (F17) | `admin-triage` › S6.2, its F17 step | S3 |

**Existing tests whose expected values change.** §12 names each one; nothing else may change meaning.

| Spec › test | Change | Step |
|---|---|---|
| `tenant-isolation` › S1.10 | the three generator tests become one "gone" test | S1, S13 |
| `admin-triage` › every kanban test | heading "Issues" → "Feedback" | S3 |
| `patch-notes` › S3.3, S3.4 | item links go to `/updates/<slug>`; the RSS channel title says "Updates" | S6 |
| `issues-voting` › S4.3 | the fix link's href is `/updates/…` | S6 |
| `issues-voting` › S4.1 | badges show stage labels | S7 |
| `portal-landing` › S2.5 | the status change is REPORTED → PLANNED ("Under review" → "Planned") | S7 |
| `admin-triage` › S6.3 | the drag goes Reported → Planned; the public Planned column | S7 |
| `issues-voting` › S4.2 | rewritten as the four-stage test | S8 |
| `admin-triage` › S6.7 | the public column is "Under review" | S8 |
| `portal-landing` › S2.4 | the page-publishing tests become "project theme" | S9, S10, S12 |
| `portal-landing` › S2.3 | deleted | S10 |
| `portal-landing` › S2.2 | nav is Updates, Feedback, Contact (S11); hub section order, the store button in the hub header, the trailer test deleted (S12) | S11, S12 |
| `portal-landing` › S2.5 | Latest updates lists v2, then v1 | S12 |
| `tenant-isolation` › S1.9 | the two studio Draft Mode tests are deleted | S12, S13 |
| `reports-contact` › S5.1 | picks "Bug" first | S18 |

**Screenshot record** (S22). `DIR=/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots`; reproduce with `SHOTS_SET=after SHOTS_DIR=$DIR pnpm screenshots` (add `--project desktop` or `--project mobile` for one width). The harness drops and re-seeds the `_e2e` database, so never run it alongside `pnpm test:e2e`.

| Set | Step | Commit | UTC | Command | PNGs | Probes |
|---|---|---|---|---|---|---|
| after | S22 | `abadeb9` (clean) | 2026-09-30 09:17 | `SHOTS_SET=after SHOTS_DIR=$DIR pnpm screenshots` (27 tests passed, 3.1 min) | 26 (6 portal pages × Critter Connect, Riso × 1440, 390; `/` × 1440, 390) | 88/88 pass (no side scroll and ≥ 44 px tap targets at 390; no font hosts, one `.fs-root`, motion checks) |

**Artifacts**

- `/srv/critter-ai/agent-state/missions/feedback-pivot/e2e-final/`: the final Playwright HTML report (traces and screenshots for every test) and `run.log`.
- `/srv/critter-ai/agent-state/missions/feedback-pivot/e2e-baseline/`: the pre-change report, for comparison.
- `/srv/critter-ai/agent-state/missions/feedback-pivot/migration-check/`: `commands.sh`, `migrate.log`, `assert.log`.
- `/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots/index.html`, with `after/` (the PNGs, `meta.json`, `checks.json`).

## Failure modes

Only the content filter is tested in isolation (`tests/int/content-screen.int.spec.ts`, S16), because E2E can't enumerate its inputs cheaply. These are the ways `screenText` can fail. S16 writes one test per mode, then the code.

1. **A missed term.** A profanity (`fuck`), a slur and a sexual term, each alone and inside a sentence, in any case (`FUCK`, `Fuck`), resolves `flagged: false`.
2. **Missed obfuscation.** Leetspeak and look-alike spellings (`sh1t`, `a$$`, `f*ck`) pass.
3. **Ordinary words flagged.** Any of assassin, Scunthorpe, class, analysis, cocktail, Hancock, therapist, grape, Essex, arsenal, cockroach, Hitchcock or cockpit is flagged; so is a plain bug report ("The game crashes when I open the map on Steam Deck.") or the empty string.
4. **One or two links flagged.** `https://youtu.be/clip`; `https://www.a.com/x https://www.a.com/y` (each URL counts once: a scheme URL's `www.` isn't counted again); a clip plus a screenshot link in any spelling.
5. **Three links missed**, in any mix: three `https://` links; `www.a.com, www.b.com and http://c.com`; the same URL three times.
6. **A shortener missed**, with or without a scheme or `www.`: `https://bit.ly/x`, `bit.ly/abc`, `www.t.co/x`, `HTTPS://WWW.T.CO/x`, or one shortener among ordinary links.
7. **A look-alike counted.** `https://notbit.ly/x` or `https://bit.ly.example.com/x` counted as a shortener; a bare `notbit.ly/x` or `at.co/y` counted as a link at all.
8. **A flag without a reason.** Any flagged result with empty `reasons`.
9. **Bad reasons.** A repeated word or shortener host gives duplicate reasons; more than five `Offensive word:` reasons; wording other than `Offensive word: "<matched text>"`, `<n> links` and `Shortened link: <host>`.
10. **Mixed text half-screened.** Text with both a profanity and three links gives only one kind of reason.
11. **A prefixed look-alike counted** (added in S16). `\b` also matches after `-` and `.`, so a bare `my-bit.ly/x` or `foo.bit.ly/x` would match the shortener alternative from `bit.ly` and be reported as `Shortened link: bit.ly`, though its host isn't a shortener.

## Decisions

- **H6 picked up (2026-09-30).** The home page's Contact link reads `CRITWIRE_CONTACT_URL` (a `mailto:` or `https:` value; hidden when unset). Owner's value: `mailto:admin@critwire.com`, in the worktree `.env` and `/srv/critter-ai/agent-state/secrets/critwire.production.env`. H6's other two questions are moot after the pivot and were closed with a note.
- **Owner (H6, 2026-09-30): existing production data need not be preserved.** Migrations may drop existing studio content instead of mapping it. This relaxes the brief's "Keep existing studio content" rule: map where it's cheap and obvious, drop otherwise, and list every drop in the Summary as before.
- **Planner (2026-09-30): M14 is split in two, so there are four migrations, not three.** §10's M14 `portal_hub` becomes M14 `portal_theme` (the theme columns and the copy from the published flagship page, S9) and M15 `remove_landing_builder` (lock rows, preferences, the `game_pages*` tables and enums, and the dead project columns, S13). As one migration, it would force the theme move, the hub and the builder's removal into one session, with the app broken in between. The SQL, its order and the §10 Check are unchanged.
- **Planner: step order.** The data model and the admin's F17 fix come first. Then one URL module, the reserved slug (F3, which the rename would otherwise introduce) and the rename, so every later test is written against the final URLs. Public stages and the board come before the hub, so the hub is built once from its final components. The theme, the chrome, the hub and the builder's removal follow, in that order, since each needs the one before. The migration check (S15) runs as soon as all four migrations exist.
- **Planner: five of §12's new tests are split across steps**, each part landing with its behaviour: test 1 (the reserved slug in S5, the browser bug and idea in S18), test 2 (archived items in S7, the four stages in S8), test 3 (the endpoint in S17, the pages in S18), test 7 (the generator in S1, the builder in S13) and test 8 (the chrome in S11, the home page in S20).
- **Planner: specs keep their own literal paths** and don't import `paths.ts`, so a wrong URL in the module can't also make its test pass. Spec file names stay. Two new specs: `redirects.spec.ts` (S7.x) and `home.spec.ts` (S8.x).
- **Planner: the admin labels change in S3, with the kanban heading,** rather than with the data model, so the heading and its E2E selector change once.
- **Planner: board cards show the type tag.** §5 lists a list row's contents but not a card's; test 1 needs both to show the type.
- **Planner: the submit form's h1 follows the chosen type:** "Report a bug", "Suggest an idea", or "Send feedback" before a choice. §5 didn't name it.
- **Planner: the migration check's fixtures NULL seven colours explicitly** (the `site_theme_colors_*` columns have defaults, so an insert would otherwise set all ten), and add a `collection-game-pages` preference and a lock row, so the cleanup assertions test something.
- **Planner: screenshots are one "after" set** of §12's pages (hub, list, board, both forms, an update page) under Critter Connect and Riso, plus `/`. The `default` group, the first-run, legacy and focus shots go, and `index.html` shows only captured sets.
- **S2: M13 also clears `generate_slug` on each renamed `new` item**, so a later save can't regenerate `new` from the title "New" (S5's `issueSlugify` would then refuse the save). Its `down` maps ideas back to FEATURE_REQUEST (through text, since an `ADD VALUE` can't be used in the same transaction) and In Progress back to Planned; renamed slugs stay.
- **S2: Payload's generated create types require `type`**, so the native submit route sets `type: 'BUG'` explicitly until S18 adds the choice, and the seed's issue and report are BUG.
- **S3: the kanban heading resolves the collection labels with Payload's `getTranslation`**, so `@payloadcms/translations` becomes a direct dependency pinned to 3.85.2 (the version Payload resolves), like `qs-esm`. Labels can be functions or per-locale records, which can't cross into the client component, so `list.tsx` resolves them to strings. The F17 E2E step opens the admin nav first: at the test viewport it starts collapsed, hiding the tenant selector.
- **S6: `issues-voting`'s `listedTitles` selector excludes `/feedback/new…` links.** The form now lives under `/feedback/`, so the header's "Report a bug" and "Suggest an idea" (and the template nav's form link) matched the old `a[href^="…/feedback/"]` item selector. Selector only; the expected titles are unchanged.
- **S6: the screenshot catalog's paths move to the new URLs now** (they'd still work through the 301s); S14 rewrites the catalog itself.
- **S8: the parser map also builds the page's links.** `feedbackHref = createSerializer(feedbackSearchParams)` replaces the hand-written `listPageHref`, so pagination and the board's "See all N" carry the same state the loader reads (defaults left out). "See all" keeps the board's type filter, so the list shows the same N.
- **S8: `S4.1` selects its filters by accessible name** (`Category`, `Sort by`) instead of combobox index, since the bar gained Type and Stage. Selectors only.
- **S8: board columns share the width** (`minmax(16rem, 1fr)`): four stages fit at desktop widths, and phones still scroll sideways by column.
- **S9: the per-level merge is `mergeTheme` in `lib/game-portal/theme.ts`, and `''` counts as unset, like `null`.** S10's `resolveProjectTheme` parses the same merge over `project.theme`, so what's validated is exactly what renders, and a colour cleared in the admin falls back to its default instead of failing the whole theme.
- **S9: the theme's colour fields have no field-level validator.** `validateProjectTheme` (the Zod schema) is the only check, with errors on `theme.colors.<key>`. GamePages keeps its own theme group untouched until S13 deletes it, rather than sharing the new field.
- **S9: `admin-triage` S6.2's F17 step retries opening the tenant selector.** Payload's nav can collapse just after the first paint, so the one-shot `isVisible()` check passed and the click then waited on a hidden control (one timeout in the first S9 run). Flow only; the assertions are unchanged.
- **S10: `resolveProjectTheme` lives in `lib/game-portal/projectTheme.ts`, not `theme.ts`.** It imports `@sentry/nextjs`, and `theme.ts` is imported by the E2E specs, the screenshot harness and the Payload config, which shouldn't load Sentry. `SiteFrame` resolves the theme from its `project` itself (as S11's `PortalFrame` will), so no caller passes one.
- **S10: `accentColor` is hidden in the admin until M15 drops it,** since nothing reads it any more; `deriveAccentColors` and the now-unused `normalizeHexColor` are deleted.
- **S11: one label table, `PROJECT_LINK_LABELS`, is a `Record` over every outbound link field** (only `trailer`, a video embed, is excluded), so a new link field fails the typecheck until it's labelled (F11). `website` is labelled "Official site" in the nav and the footer alike. The footer always lists the legal links now that the switch is gone.
- **S11: the Official site link is a secondary button in the nav's `cta` grid area (`.fs-nav-site`),** which replaces `.fs-nav-cta` and its phone-hiding rule. The template's `nav` and `footer` config (schema, admin fields, seed, normalizer) is left in place, unread, until S13 deletes the template.
- **S12: `resolvePrimaryStoreUrl` falls back over every store link** (Steam, Epic, itch.io, GOG, PlayStation, Xbox, Nintendo, in `PROJECT_LINK_LABELS` order), not just the first three. One `STORE_LINK_KEYS` list now feeds both it and the hub header's secondary links (`resolveHubLinks`), so the two can't disagree about what a store is.
- **S12: shared pieces instead of copies.** "Report a bug" / "Suggest an idea" is one `FeedbackActions` component (the feedback page's header and the hub's Top feedback), and an update's entry is one `UpdateEntry` (the updates feed and the hub's Latest updates, `h2` or `h3` by context). A top-feedback row shows the title, then the type tag, the votes (only when there are any, as the known-issues rows did, which S4.4 reads) and `FeedbackStatus`; `portal.css`'s `.fs-issue-row` rules were rewritten for that layout.
- **S12: the dead landing path still compiles on the surviving queries.** `queryLandingIssues` (and its variants) and `getLatestPublishedPatchNote` are deleted; `FlagshipSite` calls `queryTopFeedback` and `queryPublishedPatchNotes({ limit: 1 })` until S13 deletes it. AGENTS.md's int-test entry follows the rename to `issue-revalidation` now, not in S21.
- **S13: M15's `up` leaves out the generated `DROP CONSTRAINT payload_locked_documents_rels_game_pages_fk`.** `DROP TABLE game_pages CASCADE` already drops that foreign key, so the generated statement failed. The lock-row and preference deletes run first, in their own statement, because the table drop removes the constraint, not the rows that used it (checked on scratch rows: only the game-page lock and the two `collection-game-pages*` preferences went).
- **S13: the screenshot world records `cc.projectID` instead of `landingID`,** and the legacy block-landing shot leaves the catalog now (its project and `legacy` are gone, so it can't compile); S14 rewrites the rest of the catalog. `links.ts`'s label table is over every link field now that `trailer` is gone.
- **S14: the pruning also took the hub header's unused variants and dead shared rules** (`.fs-hero-logo`, `.fs-hero-eyebrow`, the centred-plate rules and `HubHeader`'s `data-align`/`fs-hero-plated`, the split hero, `.fs-media-frame`, `.fs-entry-aside`), found by grepping `src` for every `.fs-*` class; `.fs-action-row` moved beside the hub links. The harness drops the bare project, the marketing CMS page and the issue-detail shots with their world fields; the world names the seed's `launchUpdate`. `links.website` is set once in setup and survives the Critter Connect group's re-seed (checked in the Look PNGs).
- **S15: the migration check's fixtures add controls beside what must go**: a lock on an issue and a `collection-issues` preference, which `assert.sql` requires to survive M15, so the cleanup can't pass by deleting too much. The partial-palette page also sets hero art on a project with no banner, so the key-art copy is checked too. `commands.sh` runs the check in named parts (`setup`, `premig`, `seed`, `fixtures`, `migrate`, `assert`, `cleanup`), and seeding creates the first user and the `demo-studio` tenant over REST, as the screenshot setup does. The two scratch databases and `/tmp/fp-premig` stay until S23, which may re-run the check.
- **S16: the bare `www.` and shortener alternatives use the lookbehind `(?<![\w.-])` instead of `\b`.** `\b` also matches after `-` and `.`, so `my-bit.ly/x` and `foo.bit.ly/x` would have matched at `bit.ly` and been reported as that shortener (new Failure mode 11). Scheme URLs are unchanged, and each match still consumes the whole URL, so nothing is counted twice. Offensive-word reasons are deduplicated case-insensitively (the first spelling is shown), since the matcher reports one word several times. S16's "3 files" is 2 now that S13 deleted `site-config-parity`.
- **S17: until S18 rewrites the form's notices, the page shows its existing "Report sent." notice for `submitted=published` too,** so a review-off studio's players get a confirmation in between. S5.9 submits an idea with a platform and version, so the same test checks that the route drops both.
- **S18: a submission the guard refuses (validation, Turnstile, rate limit) returns to the form without its type,** since the guard fails before the type is parsed. The error notice then shows above "Bug or idea?"; the typed fields are lost on any redirect anyway, so it costs one click. With `acceptIdeas` off the page ignores `?type=idea` and shows the bug form.
- **S19: a board card adds only "Shipped in {version}", and nothing when the update isn't published,** since its column already says Shipped; list rows and the item page's stage read "Shipped in {version}" or "Shipped". One `shippedUpdate` (FIXED, populated and `_status` published) feeds all three and the item page's note, now headed "Shipped". `queryShippedFeedback` takes the project as well as the update, so the list is scoped to the update's own game even if a link crossed games.
- **S19: the hub's feedback row is a shared `FeedbackRow`,** used by Top feedback and "From your feedback"; a row without a stage drops the empty third meta column (`:has`).
- **S20: `register()` stops the process on a bad `CRITWIRE_CONTACT_URL`.** The fail-loud check showed Next 16.2 only logs an error thrown from `register()` ("Failed to prepare server") and keeps the process up, answering 500 on every route. `checkEnvironment()` in the new `src/instrumentation-node.ts` (imported dynamically in the Node.js branch, so the Edge bundle never sees `process.exit`) logs the error and exits 1; checked with both `next start` and `node .next/standalone/server.js`.
- **S20: the header's GitHub link shows at every width** (beside Sign in; only Demo portal stays `wideOnly`), and the footer lists it too, since both read `MARKETING_NAV`. The home page's GitHub and Contact links are in the closing "Free to self-host" block; the hero keeps its one button, "See a live portal".
- **S20: "What players get" has a fourth entry, the game's hub** (key art, pitch, links back, in the studio's colours), beside updates, the board (linking to `?view=board` through `feedbackHref`) and the forms. `IssueLoop` builds its markers from `PUBLIC_STAGES`, so its shapes and order can't drift from the portal's; Planned's diamond got a filled loop style. The default Open Graph description (`mergeOpenGraph`) also still described the old product and was rewritten with the layouts'.
- **S19: `issue-revalidation` gains one case, written before the hook:** a shipped item's `_order`-only write doesn't revalidate its update page. E2E can't see a revalidation that didn't happen, the same reason the file exists.
- **S21: the phases are renumbered around the brief's next mission.** Phase 3 (landing page editor) became the portal hub and theme, 5 and 6 became the feedback board and submissions, 8 is open signup with the hosted early-access limits (the `open-signup` mission's scope), 9 is custom domains, and billing has no phase. Stripe leaves `docs/integrations.md` (its section, table row, env var and checklist line), `docs/patterns.md` and `docs/architecture.md`, since "no billing work now" left nothing for it to describe.
- **S21: claims the code doesn't back were corrected while rewriting those sections:** GitHub OAuth (Payload auth is email/password only), `/lib/rate-limit` and `/lib/domain-cache` (rate limiting lives in `/lib/upstash`; the domain cache is Phase 9 and unbuilt), and the architecture doc's project tree. `api/vote/route.ts`'s comment "unknown issues" became "missing issues", since the Verification's "known issues" audit matched it case-insensitively.

## Log

- 2026-09-30 04:58 UTC · Baseline: E2E db and env set up, migrations applied; tsc pass, lint 0 errors/20 warnings, int 9/9, E2E 73/73. Picked up H6 (contact address, data-preservation decision) and closed it.
- 2026-09-30 05:20 UTC · Architecture: `architect` wrote 12 findings and the target design. Collection slugs stay; reports and issues get a Bug/Idea `type`; the filter uses `obscenity` (MIT) plus a link rule; GamePages and the site templates go; there are three migrations. Filed H7 (LICENSE holder, not blocking). The repo is public, so no visibility item is needed. No code changed, so no checks ran.
- 2026-09-30 05:35 UTC · Fable review: APPROVE_WITH_CHANGES. One MUST-FIX (the §4 link rule double-counts `https://www.` URLs), three misses (`screenText` throw contract, votes on archived items, M14 list-preference key) and five should-considers, all for the Revision stage. No code changed, so no checks ran.
- 2026-09-30 05:29 UTC · Astra review: APPROVE_WITH_CHANGES. Two MUST-FIX (§8 kanban hand-rolls the tenant filter instead of the plugin's list filter; §10 reserved-slug rename can collide and old `/issues/new`-style links lose their item) and five should-considers, overlapping Fable on the link count, `screenText` contract, RSS GUIDs and archived votes. No code changed, so no checks ran.
- 2026-09-30 05:55 UTC · Revision: `architect` resolved all MUST-FIX items. Link rule counts URLs; kanban reuses the plugin-installed `admin.baseFilter` (verified at `@payloadcms/next/dist/views/List/index.js:114`) and is keyed on it; M13 allocates collision-safe `new-<n>` slugs plus a `slugify` guard; `/issues/new` item redirect rejected under the H6 data decision. Also settled the `screenText` contract, archived votes (409), stable RSS guids, boot-time contact URL check, per-level theme merge and migration fixtures; rejected the `game-pages-list` key (doesn't exist in Payload 3.85.2). No code changed, so no checks ran.
- 2026-09-30 06:06 UTC · Steps: `planner` wrote 23 steps (S1 generator removal … S23 full verification), Verification (DoD test → spec map, audits, migration check, artifacts) and Failure modes. Split §10 M14 into M14 `portal_theme` and M15 `remove_landing_builder` so the app stays working between steps (Decisions). No code changed, so no checks ran.
- 2026-09-30 06:16 UTC · S1: removed the site generator (`src/site-generator/`, `/next/generate-site`, the admin control, `generationField`, `openai`, its env, docs and int test); moved `collectSiteMediaRefs` into the template and `siteConfigToPayloadSite` into `src/seed/siteConfig.ts`; M12 `20260930_060748_remove_site_generator` drops exactly §10's columns and tables (migrated, status all run). Also dropped the generator paragraph in `docs/features.md` and two generator mentions in GameProjects admin copy, so the step's audit is empty. tsc pass; lint 0 errors/20 warnings (M12 destructures only `db`); int 2 files 4/4; E2E 71/71 (73 − 3 generator tests + new S1.10); audit grep empty.
- 2026-09-30 06:23 UTC · S2: `type` (Bug/Idea) on issues and reports, `IN_PROGRESS`, report `flagged`/`flagReasons`, `reportForm.acceptIdeas`/`reviewSubmissions` (both default on, native only), "Shipped in update" label; promotion copies `type`; kanban pill and status shape for In Progress. M13 `20260930_061601_feedback_model`: type columns and FEATURE_REQUEST → IDEA/OTHER before the category enums are recreated, IN_PROGRESS before FIXED, collision-safe `new` → `new-<n>` loop. Checked on scratch rows (new → new-3 beside new-2; new → new-2 in another game; FR → IDEA/OTHER), then down/up, then removed them; enum ranges as required; migrate:status all run. tsc pass; lint 0 errors/20 warnings; E2E 71/71.
- 2026-09-30 06:52 UTC · S3: admin labels Feedback / Submissions / Updates / Votes; the kanban heading and create button read the collection labels. F17: `list.tsx` applies the plugin's `admin.baseFilter` via `createLocalReq` + `combineWhereConstraints`, passes `tenantFilter` to the client; load-more serialises the same `where` with `qs-esm` (pinned 8.0.1); the board is keyed on the filter. `admin-triage` heading → "Feedback" and a new S6.2 F17 step (super admin: A selected hides B's issue; switching to B without a reload shows B's and hides A's). generate:types unchanged. tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 71/71.
- 2026-09-30 06:45 UTC · S4: new `src/lib/game-portal/paths.ts` (`portalPaths` with today's URLs, `updateGuid` frozen at `/patch-notes/`, `PORTAL_ROUTE`, `UPDATES_ROUTE`); `hooks/portalRoutes.ts` deleted and its comment moved; every hand-written portal URL in F2's list now comes from `portalPaths` (the RSS item's link and guid are built separately but still equal). The contact jobs' absolute URLs use `getServerSideURL()` instead of `NEXT_PUBLIC_SERVER_URL ?? ''` (same value wherever the variable is set). docs/patterns.md and architecture.md point at the new module. tsc pass; lint 0 errors/20 warnings (all in old migrations); int 2 files 4/4; both URL audit greps empty; E2E 71/71.
- 2026-09-30 06:50 UTC · S5: `RESERVED_FEEDBACK_SLUGS`/`isReservedFeedbackSlug` in `paths.ts`; new `Issues/reservedSlug.ts` (`issueSlugify` on the slug field, `rejectReservedSlug` before `validateUniqueSlugPerProject`, both a 400 on `slug`: "`new` is reserved; choose another slug"); `uniqueIssueSlug` counts reserved slugs as taken. New `reports-contact` S5.7 (report "New" → `new-2`, page 200; REST create titled "New" and PATCH slug `new` both 400 on `slug`). tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 72/72.
- 2026-09-30 07:01 UTC · S6: routes moved to `feedback/`, `feedback/new(/submit)` and `updates/`; `paths.ts` returns them (`updateGuid` stays `/patch-notes/`), `UPDATES_ROUTE` is `…/(ops)/updates`. `redirects.ts`: 301s for `issues/*`, `report`, `patch-notes/*` and a 308 for `report/submit`. Copy: Updates titles, metadata, empty state and "All updates"; RSS channel "{game} — Updates"; feedback header "Feedback" with "Report a bug" and (when `acceptIdeas`) "Suggest an idea"; "All feedback"; form and contact links say feedback. Specs' paths moved; `patch-notes` S3.4 expects "— Updates". New `redirects.spec.ts` S7.1 (every old GET 301 → 200, the old POST 308 stores the report, the feed links `/updates/` with `/patch-notes/` guids). tsc pass; lint 0 errors/20 warnings (none in touched files); `paths.ts` audit shows only `updateGuid`; E2E 73/73.
- 2026-09-30 07:11 UTC · S7: new `lib/game-portal/stages.ts` (§3's API; `STAGE_OF` is a `Record`, statuses and archived derived) and `components/game/FeedbackStatus.tsx` (`StatusMark`, `FeedbackStatus` with the stage's mark and label or "Archived", `FeedbackMeta` adding the type tag, category and pin); list rows, the item page and its notes' marks, and the landing's known-issues rows show stages; `IssueStatus.tsx` keeps only the board's per-status helpers until S8. List, board and landing queries exclude `ARCHIVED_STATUSES`; an archived item's page shows `VoteCount` and no button; `/api/vote` answers 409 for archived items before the toggle. Specs: S4.1 stage badges, S2.5 REPORTED → PLANNED ("Under review" → "Planned"), S6.3 drags to Planned at 2400 px; new `issues-voting` S4.7 (archived item off list, board and landing; page 200 with "Archived" and count 1, no button; vote 409, count stays 1). tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 74/74.
- 2026-09-30 07:31 UTC · S8: new `lib/game-portal/feedbackSearchParams.ts` (one nuqs parser map for `view`, `type`, `stage`, `category` (stale values parse as unset), `q`, `sort`, `page`, plus `feedbackHref`), used by the page's loader and the new `FeedbackFilters` (list: search, type, stage, category, sort; board: type only). `queryPublicIssues` filters by type and stage; new `queryBoardColumn` (25 per stage, pinned/votes/newest, card `select`, fix note populated through access) and `FeedbackBoard` (four stage regions in one `Promise.all`, counts from `totalDocs`, type tag on cards, "See all N" to `?stage=`). `BOARD_ISSUE_LIMIT`, `queryBoardIssues`, `IssueStatus.tsx` and `IssueFilters.tsx` deleted (F1, F9). Specs: S4.2 rewritten as its own describe "the four-stage board" (every status in its stage, CLOSED in none, type filter, Shipped at 26 → "See all 26" → list page 1 of 2, all Shipped; privacy and read-only steps kept); S4.1 selectors by name and "Search feedback…"; `admin-triage` `boardColumn` by `publicStage(status).label`. tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 74/74.
- 2026-09-30 07:38 UTC · S9: moved the theme schema and contrast math to `lib/game-portal/{theme,contrast}.ts` and `themeStyle`/`fonts` to `components/game/theme/` (imports updated in the template, GamePages, not-found, specs and the screenshot harness); added `DEFAULT_THEME` and `mergeTheme`. New `collections/GameProjects/theme.ts`: the `theme` group built from the schema, and `validateProjectTheme` (`beforeChange`, per-level merge, `ValidationError` on `theme.<path>`). The seed writes the Critter Connect palette to the project. M14 `20260930_072559_portal_theme`: generated `theme_*` columns and enums, then the copy from each published flagship page (all ten colours or none, the four tokens via `::text::`, banner and pitch only where missing). Checked on scratch rows (full palette copied; partial palette ignored but typography and tagline copied; draft-only page ignored; existing description kept), then down/up, then removed them; migrate:status all run. New `portal-landing` "S2.4 project theme" (three 400s with `theme.colors.<key>` and the stored palette unchanged; accent-only save 200 with the default palette plus the accent). tsc pass; lint 0 errors/20 warnings (none in touched files); int 2 files 4/4; E2E 75/75 (first run: 74/75, the S6.2 F17 race fixed above).
- 2026-09-30 07:46 UTC · S10: new `resolveProjectTheme` (`lib/game-portal/projectTheme.ts`: `safeParse(mergeTheme(project.theme))`, Sentry and the default theme on failure); `SiteFrame` renders it for the flagship, legacy and ops pages, so a page's `site.theme` is no longer read; the 404 uses `DEFAULT_THEME`. `deriveAccentColors` and `normalizeHexColor` deleted, `accentColor` hidden in the admin. `portal-landing`: S2.3 deleted; the old S2.4 lost its three theme cases and two theme steps; "S2.4 project theme" now checks each rejected save leaves the landing's `.fs-root` style unchanged, and the accent-only save re-themes the warmed updates page and the landing (`--fs-accent`) and the primary button. tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 73/73 (75 − 2 S2.3).
- 2026-09-30 07:55 UTC · S11: new `lib/game-portal/links.ts` (`PROJECT_LINK_LABELS` over every outbound link field incl. gog, playstation, xbox, nintendo, youtube; `resolveProjectLinks`; `resolvePrimaryStoreUrl` without the website fallback), `PORTAL_NAV` + `portalNavLinks` in `paths.ts`; new `PortalFrame`/`PortalRoot`, `PortalNav` (fixed Updates/Feedback/Contact, Official site at every width), `PortalNavLinks`, `PortalFooter`; `SiteFrame`, `SiteNav`, `SiteNavLinks`, `SiteFooter`, `PortalChrome` and `getPortalSiteConfig` deleted, so no ops page queries `game-pages`. `portal-landing` S2.2 nav expects Updates, Feedback, Contact; new S2.7 (Official site on the hub and the feedback page at 1440 and 390 px when `links.website` is set, none otherwise). tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 74/74.
- 2026-09-30 08:05 UTC · S12: `/g/<game>` is the hub (ISR: `revalidate` 3600, empty `generateStaticParams`, no Draft Mode; the build lists it as ●): `HubHeader` (title plate over the key art or bare, pitch, build line from `availabilityFacts`, "Get the game" then other stores, Discord, Official site, deduplicated by `resolveHubLinks`), `LatestUpdates` (3 newest, All updates, RSS) and `TopFeedback` (`queryTopFeedback`, 5 open items; Report a bug, Suggest an idea when `acceptIdeas`, See all feedback), each with an empty state. The `(ops)` group is gone: its pages moved up and `g/[gameSlug]/layout.tsx` renders `PortalFrame`; `UPDATES_ROUTE` is `…/updates`. `LANDING_FIELDS` gains `type`; GameProjects `description` → "Pitch" (max 240, help text), `banner` → "Key art" (types regenerated, no migration). Int: `template-revalidation` trimmed to the `_order` case and renamed `issue-revalidation`. Specs: `portal-landing` S2.2 is the hub (primary store in `.fs-hub-header`, order [latest updates, top feedback]; trailer test and `links.trailer` gone), the old S2.4 describe deleted, S2.5 lists v2 then v1 and reads `#fs-top-feedback-heading`; `issues-voting` S4.4/S4.7 and `admin-triage` S6.3 read the hub rows; `tenant-isolation` S1.9's studio Draft Mode test deleted. tsc pass; lint 0 errors/20 warnings (none in touched files); int 2 files 3/3; E2E 70/70 (74 − trailer − 2 old S2.4 − S1.9 Draft Mode).
- 2026-09-30 08:16 UTC · S13: deleted `collections/GamePages`, `site-templates/`, `blocks/game/`, `GameButtons`, `validation/video.ts`, `landingPage.ts`, `seed/siteConfig.ts`, `/next/site-preview` and `sitePreviewToken.ts`, and the `game-pages` config and plugin entries; GameProjects lost `accentColor`, `links.trailer`, `availability.demoUrl`, `meta` and the action-registry comment; the seed writes no landing page, accent or meta; `resolveProjectSlug` takes a `GameProject` or ID. Dashboard: Create the game portal, Theme and links, Review submissions (Submissions list). M15 `20260930_080647_remove_landing_builder`: deletes game-page lock rows and `collection-game-pages*` preferences, then drops every `game_pages*`/`_game_pages_v*` table, the 44 `enum_*game_pages*` types, `payload_locked_documents_rels.game_pages_id` and the seven project columns (migrate, down, up; status all run; none left). Int: `site-config-parity` deleted (AGENTS.md list updated). Harness compiles: setup reads the baseline style from the hub, `applyTheme` PATCHes `game-projects.theme`. Specs: `tenant-isolation` drops the game-page fixtures and the site-preview test; S1.10 adds site-preview, `/api/game-pages` and `/admin/collections/game-pages` 404s and no Game Pages in the admin nav. tsc pass; lint 0 errors/20 warnings (all in old migrations); int 1 file 1/1; audit grep empty; E2E 69/69 (70 − S1.9 site preview).
- 2026-09-30 08:27 UTC · S14: `portal.css` lost 354 lines of landing-only rules (features, gallery, adaptive, community band, final CTA, trailer, platform rows, the unused hero variants, `.fs-media-frame`, `.fs-entry-aside`); every remaining `.fs-*` class is used in `src`. Harness: groups critter-connect, riso, marketing; portal shots hub, feedback list, board, submit bug/idea, launch update; marketing `/`; default group, first-run, legacy and focus shots gone; setup sets `links.website`; the index shows only captured sets under a feedback-pivot title; probes name the hub and the update page. tsc pass; lint 0 errors/20 warnings (all in old migrations); Look run 13/13, hub, list, board and update PNGs checked in both themes, all probes pass; E2E 69/69.
- 2026-09-30 08:32 UTC · S15: new `tests/migrations/feedback-pivot/fixtures.sql` (at `683de8d`: `new`/`new-2`, a feature-request issue and report, a published 3-colour page with typography, tagline and hero art on a project with no description or banner, a draft-only full-palette page, game-page and issue locks, game-pages and issues preferences) and `assert.sql` (one `DO` block: M12–M15 recorded; Critter Connect's palette, tokens, banner and description; seeded issue and report BUG; ideas and review on; IN_PROGRESS; `new` → `new-3`, `generate_slug` off, `new-2` kept; FEATURE_REQUEST → IDEA/OTHER and gone from both enums; partial → default palette with editorial, tagline and key art; draft-only default theme; no `game_pages*` table or enum, dropped columns gone; only the game-page lock and preferences deleted). Ran it per Verification: baseline built and seeded on :3300, fixtures, dump, migrate (M12–M15 run), assert ALL ASSERTIONS PASSED; the same assert on the unmigrated database raises. Artifacts in `agent-state/missions/feedback-pivot/migration-check/`. No migration changed, so no E2E.
- 2026-09-30 08:31 UTC · S16: added Failure mode 11 (a prefixed bare look-alike such as `my-bit.ly/x`); `obscenity` pinned 0.4.6; `tests/int/content-screen.int.spec.ts` (one test per mode, 11) written against a stub and seen failing 11/11, then `src/lib/moderation/screenText.ts` (`RegExpMatcher` + `englishDataset` + recommended transformers + `cockpit` whitelist; one link regex from `SHORTENERS` with a lookbehind; exact-host shortener rule; 3+ links or any shortener; reasons deduplicated, at most 5 words; contract in the doc comment; exports only `screenText` and `ScreenResult`). AGENTS.md int-test list gains `content-screen`. Nothing calls it yet. tsc pass; lint 0 errors/20 warnings (none in touched files); int 2 files 12/12. No E2E: no behaviour changed.
- 2026-09-30 08:42 UTC · S17: new `IssueReports/hooks/screenReportText.ts` (on create, or an update that changes the title or description: `screenText` of the merged text sets `flagged`, and `flagReasons` one per line or null; no catch) and `autoPublishReport.ts` (create only, NEW and unflagged, one `findByID` of `reportForm` through `req`, PUBLISHED when `reviewSubmissions === false`); `beforeChange` is screen → auto-publish → promote. Submissions list columns title, type, gameProject, status, flagged, createdAt, and the status description. Submit route: `type` (default BUG), 400 for an idea when `acceptIdeas` is off, an idea's platform and version dropped, reply `{ id, ok, published }`, HTML 303 to `newFeedback(type)` with `submitted=published|1` via `formResponse`'s new `submitted`. New `reports-contact` S5.9–S5.11. No schema change. tsc pass; lint 0 errors/20 warnings (none in touched files); int 12/12; E2E 72/72.
- 2026-09-30 08:45 UTC · S18: `feedback/new/page.tsx` parses `type`/`submitted`/`error` with a nuqs loader (reusing `feedbackSearchParams.type`); new `FeedbackTypeChoice` ("Bug or idea?" radio-like links with `aria-current`, styled in fg since the accent is never on surface); no form until a type is chosen, and with `acceptIdeas` off it goes straight to the bug form; bug form keeps platform/version, idea form has "What’s your idea?" and "Send idea"; hidden `type` input; h1 and metadata follow the type ("Send feedback" before a choice); notices "Report sent."/"Idea sent." plus "It’s on the board now." or the review line. E2E: S5.1 picks Bug first; new S5.8; S5.10 checks the feedback page, the hub and the form. tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 73/73.
- 2026-09-30 08:55 UTC · S19: new `revalidateUpdatePage` (published update's page by URL), Issues `revalidateLinkedUpdates` (+ delete; link change, or title/slug/status/type/isPublic of a linked public item), and `adjustUpvoteCount` revalidating a shipped item's update; `queryShippedFeedback` + `FromYourFeedback` on the update page (shared `FeedbackRow` with the hub); shipped version on list rows, board cards and the item page via `shippedUpdate`/`updateName`; list and item queries populate the fix note's `_status`, slug, title, version. Seed: one `upsertIssue` helper, plus a PLANNED idea, an IN_PROGRESS bug and a FIXED bug linked to the launch update (types checked; S22's screenshot run exercises it). New `patch-notes` S3.6. int written first and seen failing, then 2 files 13/13; tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 74/74.
- 2026-09-30 09:10 UTC · S20: `links.ts` gains `GITHUB_REPO_URL` (header, footer, home) and `getContactHref()` (`CRITWIRE_CONTACT_URL`: unset/empty → null, anything but `mailto:`/`https:` throws); new `instrumentation-node.ts` `checkEnvironment()` runs it at boot and exits 1 on a bad value (Next alone kept serving 500s; Decisions). `/` awaits `connection()` (build lists it as ƒ) and renders the rewritten `MarketingHome`: new headline and lede, `IssueLoop` over the four stages, what players get (updates, board, forms, hub), "Nothing is public until you say so" (review and the filter), "Free to self-host (MIT). Free hosted early access." with GitHub and Contact. Copy: `/`'s metadata, both layout descriptions, `mergeOpenGraph`, `BeforeLogin`. `.env.example`, `environment.d.ts`; E2E env `CRITWIRE_CONTACT_URL=mailto:e2e@critwire.test`. New `home.spec.ts` S8.1. tsc pass; lint 0 errors/20 warnings (none in touched files); E2E 75/75; fail-loud check: `javascript:alert(1)` exits 1 under `next start` and the standalone server; empty hides the link, an `https:` value shows it.
- 2026-09-30 09:16 UTC · S21: AGENTS.md (title and thesis from the Product direction; docs map; scope guardrail with "website builder"; phases paragraph; int-test reasons; `pnpm screenshots` catalog), `docs/features.md` (thesis, collections with theme/pitch/key art/feedback settings, Issue and IssueReport type and flags, enums, the four stages, the portal, submit → filter → auto-publish → review, updates ↔ feedback, Hosting instead of pricing, phases rewritten), `docs/architecture.md` (URL table, rendering table with the ISR hub, project tree), `docs/patterns.md` (hooks: screen → auto-publish → promote, linked-update revalidation; landing-pages section gone), `docs/integrations.md` (content filter, `CRITWIRE_CONTACT_URL`, Upstash paths, Stripe gone), README summary, `.env.example` and `deploy.md` wording, the screenshot config comment; `LICENSE` MIT, "Critwire contributors" (H7 still waiting). tsc pass; lint 0 errors/20 warnings; int 2 files 13/13; all six Verification audits print nothing. No E2E: docs and one comment only.
- 2026-09-30 09:25 UTC · S22: `pnpm screenshots` (after set, commit `abadeb9`): 26 PNGs, `meta.json`, `checks.json` (88/88 probes pass), `index.html` linking all 26, in `/srv/critter-ai/agent-state/missions/feedback-pivot/screenshots/`. Read every page at both widths under both themes plus `/`: hub, list, board (mobile columns scroll sideways inside the board), both forms, the update's "From your feedback"; nothing reads wrong, so no code changed and no E2E rerun. tsc pass, lint 0 errors/20 warnings.

## Summary
