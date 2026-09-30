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
- **F10. The kanban ignores the tenant selector (F17).** `components/admin/issues/list.tsx:28-41` and `kanban.tsx#fetchMoreIssues` query without the plugin's list filter, so a super admin or a multi-studio user sees every studio's issues. Access still applies, so nothing leaks. We touch these files anyway: `PILL_STYLES` is a `Record<IssueStatus,…>`, so adding `IN_PROGRESS` forces an edit. Fix in §8.
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
- `lib/game-portal/paths.ts`. `portalPaths(slug)` returns `hub`, `feedback`, `feedbackItem(s)`, `newFeedback(type?)`, `feedbackSubmit`, `updates`, `updatesPage(n)`, `update(s)`, `rss`, `contact` and `contactSubmit`. The module also holds `RESERVED_FEEDBACK_SLUGS = ['new']`, `PORTAL_NAV` (Updates, Feedback, Contact) and the revalidation patterns now in `hooks/portalRoutes.ts` (`PORTAL_ROUTE`, and `UPDATES_ROUTE`, which replaces `PATCH_NOTES_ROUTE`).
- `lib/game-portal/stages.ts` (§3) and `lib/game-portal/feedbackSearchParams.ts` (§5).
- `lib/moderation/screenText.ts` (§4).
- Collection code: `collections/GameProjects/theme.ts` (the field and its validation hook), `IssueReports/hooks/{screenReportText,autoPublishReport}.ts`, `Issues/hooks/{rejectReservedSlug,revalidateLinkedUpdates}.ts`, and `src/hooks/revalidateUpdatePage.ts`.
- Components: `HubHeader`, `LatestUpdates`, `TopFeedback`, `FeedbackBoard` and `FromYourFeedback`. `IssueFilters` becomes `FeedbackFilters`, and `IssueStatus` becomes `FeedbackStatus` (stage mark, label and type tag).
- `LICENSE` and `tests/int/content-screen.int.spec.ts`.

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

**Theme validation.** `validateProjectTheme` (GameProjects `beforeChange`) merges the default theme, then `originalDoc.theme`, then `data.theme`, and runs the theme schema's `safeParse`. A failure throws a `ValidationError` with paths `theme.colors.<key>`; the hook only throws (CQS). Rendering reads `project.theme` through `safeParse`. If a stored theme ever fails (it shouldn't), we report it to Sentry and use the default theme, the same policy as `landingPage.ts:72-81` today.

**Reserved slugs.** `rejectReservedSlug` (Issues `beforeValidate`) rejects `new`, and `uniqueIssueSlug` treats reserved slugs as taken.

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
                                       → status = 'PUBLISHED'  (one findByID of the project, select reportForm)
    beforeChange[2] createIssueFromPublishedReport   the existing hook; now copies `type`
  → the new Issue's afterChange revalidates the hub
  reply: { id, ok, published }; an HTML post gets a 303 to …/feedback/new?type=…&submitted=published|1
```

- Screening runs in the collection hook, so every write path goes through it, not just today's route.
- A flag never blocks the studio: it can publish a flagged report by hand. The flag only stops auto-publish.
- Auto-publish reuses the existing promotion hook, so there's one path from report to issue.
- Auto-publish happens only when a report is created. Turning review off doesn't publish the backlog. Existing NEW reports keep `flagged: false`, because SQL can't screen them.
- `formResponse` takes an optional `submitted` value (default `'1'`), so the form can say either "It's on the board now" or "The team reviews submissions before they're public".

**The filter's interface**, `src/lib/moderation/screenText.ts`:

```ts
export type ScreenResult = { flagged: boolean; reasons: string[] } // reasons are shown to moderators as written
export const screenText = async (text: string): Promise<ScreenResult> => …
```

- This function is the whole interface. Callers import only it, and the implementation stays private to the module.
- The async signature means a hosted moderation provider can replace the body later without changing the hooks.
- The doc comment states the contract: if a provider fails, it returns `flagged: true` with the reason "Screening unavailable"; it never throws and never lets text through.
- The local implementation doesn't catch errors. A throw is a bug and fails the submission loudly (the route's catch sends it to Sentry, and nothing is stored).

**The local filter:**
- **Word list and matcher: `obscenity@0.4.6`.** MIT, no dependencies, about 150 kB unpacked, last updated 2026-01. I checked it in the npm registry and ran it locally.
  - It uses `RegExpMatcher` with `englishDataset` and `englishRecommendedTransformers`, which cover profanity, slurs and sexual terms and normalise leetspeak and look-alike characters (`sh1t`, `a$$`, `f*ck`).
  - Its built-in whitelists avoid false positives on words that merely contain a bad word. These came back clean: assassin, Scunthorpe, class, analysis, cocktail, Hancock, therapist, grape, Essex, arsenal, cockroach, Hitchcock.
  - The module adds one game-specific whitelist entry, `cockpit`, the only false positive the probe found that game text is likely to use.
  - Why not vendor a list: we would have to write our own normaliser and whitelist, which is the hard part.
- **Spam links:** counts `https?://` and `www.` occurrences. It flags 3 or more, or any link through a shortener (`bit.ly`, `tinyurl.com`, `t.co`, `goo.gl`, `is.gd`, `rb.gy`, `cutt.ly`). One or two links, such as a clip or a screenshot, pass.
- **Reasons:** `Offensive word: "<matched text>"` (deduplicated, at most 5), `3 links`, `Shortened link: bit.ly`.

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

**Item page:** shows the stage (or "Archived"), the type tag and the notes as today. The fix note reads "Shipped in {version — title}" and links to the update. The back link is "All feedback".

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

#### 8. Admin

- **Submissions list:** default columns title, type, gameProject, status, flagged, createdAt, and `flagged` is filterable. The status field's description says: "Flagged submissions wait here even when review is off."
- **Kanban:** gains an In Progress column (a `PILL_STYLES` entry).
- **F17 fix:**
  - `list.tsx` reads the selected studio with the plugin's own `getTenantFromCookie(await headers(), 'number')` (exported from `@payloadcms/plugin-multi-tenant/utilities`). When a studio is selected, it adds `{ tenant: { equals: selected } }` to each column's query.
  - It passes that `Where` to the client, and `fetchMoreIssues` adds it to its REST query.
  - This only narrows the result: access (`overrideAccess: false` plus the user) still decides what's allowed, so a forged cookie can't widen anything.
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
- Runs `UPDATE issues SET slug = 'new-' || id WHERE slug = 'new'`.

**M14 `portal_hub`**
- Adds the `game_projects.theme_*` columns and their enums, with the schema defaults.
- Copies from each project's **published** flagship page (`_status = 'published' AND template = 'flagship-game-v1'`; the main table holds the published version, and drafts live only in `_game_pages_v`):
  - the ten `site_theme_colors_*`, only when all ten are set (the old renderer treated a partial palette as unset);
  - `typography`, `shape`, `density` and `motion` when set, cast through `::text::` to the new enums;
  - `banner_id` from `site_hero_background_media_id`, where the project has no banner;
  - `description` from `site_hero_tagline`, where the project has none.
- Deletes the lock rows that point at game pages, drops `payload_locked_documents_rels.game_pages_id`, and deletes `payload_preferences` keyed `collection-game-pages%`.
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

**Check (for Verification).**
1. At `683de8d`, migrate a fresh database, run the Critter Connect seed route, and `pg_dump` the result into a copy.
2. On this branch, run `pnpm payload migrate` on the copy.
3. Expect Critter Connect to keep the seed's theme (`#0f1f26` background, technical typography), its banner and its description; its issue and report to be BUG; and no `game_pages` tables to remain.

**Seed** (`src/seed/critterConnect.ts`; the route stays, per H5).
- Writes the project with its `theme` (the current Critter Connect palette), and drops the landing page, `meta` and the `site-generator` import.
- Keeps the launch update, the sample bug and the NEW report.
- Adds an idea (PLANNED), an in-progress bug and a shipped bug linked to the launch update, so the demo shows every stage and "From your feedback".

#### 11. Security

- **Tenant isolation.** There are no new collections. The new fields sit on existing tenant-scoped collections under the plugin. The moderation hook reads only the report's own project, which is already validated. The kanban filter only narrows.
- **Vote integrity.** The vote route and counter hooks are unchanged. A submission isn't an issue until it's published, so it can't be voted on. Archived items keep their votes.
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
  - S6.2 gets the In Progress column (derived from the options) and an F17 step: a super admin with studio A selected sees none of B's items.
  - S6.3 drags an item from Reported to **Planned**, with a wider viewport so both columns are on screen, then checks the public "Planned" column and the hub. Reported → Investigating is now invisible to players, so "the public board follows" would prove nothing.
  - S6.7: new submit path, and the public column is "Under review".
- **`patch-notes.spec.ts`:** `feedPath` becomes `/updates`, and the page and RSS channel titles say "Updates". S3.5 keeps its meaning (update pages stay ISR).
- **`tenant-isolation.spec.ts`:**
  - `game-pages` leaves S1.1 and the fixtures.
  - S1.9 keeps its two marketing tests. **Deleted:** "a studio user in Draft Mode…" and "studio B cannot preview…". Studio Draft Mode and its route are gone, and new test 7 below asserts their 404.
  - **S1.10 is deleted** with the generator.
- **Support files:** `support/env.ts` drops `OPENAI_API_KEY` and adds `CRITWIRE_CONTACT_URL`. The fixtures stay as they are, since `type` defaults to BUG.

**New E2E tests (Definition of done):**
1. **Bug and idea.** In the browser, submit a bug (with platform and version) and an idea (its form has no platform or version fields). After the studio publishes both, they're on the board and the list with their types. A report titled "New" publishes under a reachable slug.
2. **Four stages** (the S4.2 rewrite).
   - Each internal status sits in its stage column, including Planned and In progress.
   - A CLOSED item is absent from the board, the list and the hub, but its page is reachable and marked Archived.
   - The type filter narrows the board.
   - A column with more than 25 items shows its true count and a link to the filtered list.
3. **Settings.**
   - With `acceptIdeas` off: no "Suggest an idea", no idea choice on the form, and a POST with `type=IDEA` answers 400.
   - With review on (the default): a clean submission stays NEW and off the board.
4. **Review off.** Clean text is on the board immediately. Flagged text (one profanity, and a body with 3 links) stays NEW and off the board, with `flagged` and the reason visible in the admin.
5. **Redirects.** Each old URL answers 301 or 308 with the right `Location`, and following it lands on a 200. The URLs: the list with `?view=board`, an item, the form, a POST to `report/submit`, the updates feed, feed page 2, an update page, and `feed.xml`.
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
  - 1 or 2 links flagged;
  - 3 links, or a shortener, missed;
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

### Risks and resolved questions

- **RSS duplicates, once.** Item links and guids change with the path, so existing subscribers will see the last 20 updates again as new. Accepted: there are few subscribers today, and keeping the old guids forever isn't worth it.
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

## Steps

## Verification

## Decisions

- **H6 picked up (2026-09-30).** The home page's Contact link reads `CRITWIRE_CONTACT_URL` (a `mailto:` or `https:` value; hidden when unset). Owner's value: `mailto:admin@critwire.com`, in the worktree `.env` and `/srv/critter-ai/agent-state/secrets/critwire.production.env`. H6's other two questions are moot after the pivot and were closed with a note.
- **Owner (H6, 2026-09-30): existing production data need not be preserved.** Migrations may drop existing studio content instead of mapping it. This relaxes the brief's "Keep existing studio content" rule: map where it's cheap and obvious, drop otherwise, and list every drop in the Summary as before.

## Log

- 2026-09-30 04:58 UTC · Baseline: E2E db and env set up, migrations applied; tsc pass, lint 0 errors/20 warnings, int 9/9, E2E 73/73. Picked up H6 (contact address, data-preservation decision) and closed it.
- 2026-09-30 05:20 UTC · Architecture: `architect` wrote 12 findings and the target design. Collection slugs stay; reports and issues get a Bug/Idea `type`; the filter uses `obscenity` (MIT) plus a link rule; GamePages and the site templates go; there are three migrations. Filed H7 (LICENSE holder, not blocking). The repo is public, so no visibility item is needed. No code changed, so no checks ran.
- 2026-09-30 05:35 UTC · Fable review: APPROVE_WITH_CHANGES. One MUST-FIX (the §4 link rule double-counts `https://www.` URLs), three misses (`screenText` throw contract, votes on archived items, M14 list-preference key) and five should-considers, all for the Revision stage. No code changed, so no checks ran.
- 2026-09-30 05:29 UTC · Astra review: APPROVE_WITH_CHANGES. Two MUST-FIX (§8 kanban hand-rolls the tenant filter instead of the plugin's list filter; §10 reserved-slug rename can collide and old `/issues/new`-style links lose their item) and five should-considers, overlapping Fable on the link count, `screenText` contract, RSS GUIDs and archived votes. No code changed, so no checks ran.

## Summary
