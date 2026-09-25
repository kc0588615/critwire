# Template-First, AI-Generated Critwire Sites

## Summary

Replace freeform `game-pages.content` composition with one code-owned `flagship-game-v1` template. Payload remains the authoring interface and source of truth, but studios edit typed section fields rather than arranging blocks.

```text
GameProject data + media + current draft + prompt
  -> OpenAI structured output
  -> Zod validation and policy checks
  -> Payload draft/version
  -> authenticated live preview
  -> manual publish
  -> fixed flagship renderer
```

The renderer owns section order, accessibility, responsive behavior, dynamic bindings, and performance. AI may change content, approved variants, media references, navigation choices, and semantic theme tokens. It may not emit JSX, JavaScript, CSS, Tailwind classes, unregistered URLs, or arbitrary component order.

Puck is not installed in v1. Keep stable registry IDs and adapter-friendly props so an advanced Puck editor can be added later; Critwire's schema remains canonical.

## Cross-plan contracts (binding, for Tally/kanban remediation compatibility)

The in-flight Tally + Issues kanban work is committed as-is in `d378dbd` and will be remediated after this plan ships (see `plans/2026-07-12-tally-and-issues-kanban-remediation.md`). This plan builds on that snapshot — including migration `20260712_065641_issues_orderable_and_tally_forms` — and must hold four contracts so the remediation stays independent:

1. **Action refs resolve to internal routes only.** `contact`, `report`, `issues`, and `updates` always resolve to `/g/[gameSlug]/…` routes in the action registry. The resolver never reads `contact.target` or `reportForm.provider`; provider semantics (native/Tally/external) live inside the route pages and belong to the remediation plan.
2. **Dynamic slots never depend on `issues._order`.** `knownIssues` and `latestUpdate` query live published data via the Local API with explicit sorts (pinned/status/`updatedAt`). The Issues revalidation hook must skip writes where only `_order` changed, so admin kanban drags do not churn ISR on published game pages.
3. **GameProject additions stay out of `contact` and `reportForm`.** New availability facts (`releaseState`, `platforms[]`, release/version/demo fields) get their own groups; new approved links extend the existing `links` group (which already has `steam`, `epic`, `itch`, `discord`) rather than creating a parallel structure.
4. **Generation context excludes routing/provider config.** Redact `contact.*` and `reportForm.*` wholesale — the AI selects action refs and never needs provider configuration or Tally URLs.

## Data Model and Public Interfaces

### GameProject availability data

Extend `game-projects` with reusable product facts:

- `releaseState`: `comingSoon | earlyAccess | released | freeToPlay`
- `releaseDate`, `currentVersion`, and `demoUrl`
- `platforms[]`: approved platform enum, optional store URL, and availability label
- Approved links for PlayStation, Xbox, Nintendo, GOG, YouTube, press kit, privacy, and terms
- Optional developer, publisher, engine, and rating labels

These fields are factual inputs. AI can select from them but cannot rewrite their URLs.

### Typed GamePage configuration

Keep the existing `game-pages` collection, drafts, versions, tenant access, one-page-per-project constraint, and database identity. Add:

```ts
type SiteTemplateId = 'flagship-game-v1'
type SiteSchemaVersion = 1

type SiteActionRef =
  | 'primary-store'
  | 'demo'
  | 'steam'
  | 'epic'
  | 'itch'
  | 'discord'
  | 'updates'
  | 'issues'
  | 'report'
  | 'contact'

type SiteSlotId =
  | 'hero'
  | 'availability'
  | 'features'
  | 'trailer'
  | 'gallery'
  | 'adaptive'
  | 'latestUpdate'
  | 'knownIssues'
  | 'community'
  | 'finalCTA'
```

The record exposes typed Payload groups for template/schema version, navigation, semantic theme, hero, availability, features, trailer, gallery, adaptive content, latest update, known issues, community, final CTA, footer, and generation metadata.

Retain the old `content` blocks temporarily as a hidden legacy field. Existing published block pages continue rendering until a flagship configuration is published. New pages and projects without legacy content render a safe project-derived flagship default. Remove legacy block tables only in a later cleanup migration.

### Canonical schemas and registry

Create one Zod schema for `SiteConfigV1` and smaller schemas for every slot. Payload validation and AI output both call these schemas. Add parity tests so Payload fields cannot silently diverge from Zod.

```ts
type SlotDefinition<K extends SiteSlotId, P> = {
  id: K
  version: number
  schema: z.ZodType<P>
  aiDescription: string
  render: React.ComponentType<P & SiteRenderContext>
}
```

The registry is canonical for validation and rendering. A future Puck integration must adapt between `SiteConfigV1` and Puck `Data`; Puck data must never become the database source of truth.

## Flagship Template and Design System

The template always renders in this code-owned order:

1. Overlay-to-solid sticky navigation
2. Hero
3. Platform availability
4. Core features
5. Trailer
6. Gallery
7. Adaptive editorial section
8. Latest published patch note
9. Known-issues/status summary
10. Community/support CTA
11. Final conversion CTA
12. Compact footer

Sections with no meaningful source data may return `null`, but configuration cannot reorder them. Dynamic sections query current published PatchNote and Issue data rather than copying it into page configuration.

Approved variants:

- Hero: `centeredCinematic | leftEditorial | split | trailerBackground`
- Features: `editorialThree | cardGrid | alternating | featurePlusTwo`
- Gallery: `editorialMosaic | horizontalStrip | carousel | twoColumn`
- Adaptive kind: `story | world | characters | modes | roadmap | systems | philosophy`
- Known issues: `compact | pinned | recentlyFixed`
- Community: `artworkBanner | split`

Use a Tailwind v4 semantic-token layer:

- Colors: background, foreground, muted foreground, surface, accent, accent foreground, border, success, warning, and error
- Typography: `modern`, `editorial`, and `technical`
- Shape: `sharp | balanced | soft`
- Density: `compact | cinematic`
- Motion: `off | subtle`

Zod refinements enforce allowed formats and WCAG contrast. Renderer-owned components enforce heading hierarchy, focus visibility, keyboard operation, reduced motion, media dimensions, and responsive sources. Trailer blocks initially render a poster and load YouTube or Vimeo only after interaction. Only the true hero LCP image receives priority.

## AI Generation and Payload Authoring

Add the official OpenAI JavaScript SDK behind an internal `SiteGenerator` interface. Use the Responses API with `responses.parse`, `zodTextFormat(SiteConfigV1)`, and `store: false`. Default to `gpt-5.4-mini-2026-03-17` through `OPENAI_SITE_MODEL`, with an environment override.

```ts
type GenerateSiteRequest = {
  gamePageId: number
  prompt: string
  scope: 'full' | 'theme' | 'slot'
  slot?: SiteSlotId
}

type GenerateSiteResult = {
  config: SiteConfigV1
  changeSummary: string[]
  model: string
}
```

Generation context includes public GameProject facts, registered actions, the current saved draft, media metadata and selected images, published patch-note metadata, public issue aggregates, and the template schemas. Never send contact addresses, Discord webhooks, Tally URLs, or anything else under `contact.*` / `reportForm.*`, nor player reports, submitter details, tenant membership, secrets, or unpublished operational content.

Rate-limit the generation endpoint per tenant with Upstash. It is authenticated and admin-only, but it is a metered-cost endpoint and gets the same protection posture as public form endpoints.

Refusal, timeout, invalid structured output, unknown references, and contrast failures must not modify the draft. Successful output is validated again, saved with `draft: true`, and recorded as a Payload version. AI never publishes automatically.

Add a Payload `beforeDocumentControls` action that:

- Is disabled until the document is saved and unmodified
- Accepts a prompt, scope, and optional slot
- Calls the generation endpoint
- Reloads the resulting draft and shows its change summary
- Leaves typed Payload fields available for manual correction

Configure Payload live preview and a signed Next.js Draft Mode route. Validate the authenticated user, document, tenant, token expiry, and fixed destination before enabling preview. Published routes remain ISR-backed.

## Migration, Tests, and Rollout

1. Land the template, schema, and renderer while preserving legacy rendering and operational routes.
2. Add typed Payload groups, generated types, migration, preview configuration, and flagship default.
3. Add the OpenAI adapter and generation action.
4. Update the Critter Connect seed with a complete flagship example.
5. Keep Puck, additional recipes, arbitrary page creation, and image generation outside v1.

Verification includes:

- Zod tests for variants, limits, enums, action/media references, contrast, unknown keys, and rejection of raw CSS/classes
- Template-order invariant tests
- Flagship default rendering for a project with no legacy content and no saved configuration — this is the first-run path every new tenant hits before any AI generation, and it must be tested as a first-class path
- Renderer and dynamic-binding tests
- Trailer test proving no third-party iframe loads before interaction
- Tenant isolation, draft/version, refusal, and no-auto-publish integration tests
- Mock generator plus opt-in real OpenAI smoke test
- Authenticated preview, cross-tenant rejection, expiry, exit-preview, and open-redirect tests
- Migration up/down tests preserving legacy pages
- End-to-end generate, preview, adjust, publish, and revalidation flow
- TypeScript, ESLint, production build, and Core Web Vitals checks

## Assumptions

- Template work is prioritized before Tally/kanban remediation.
- Only `flagship-game-v1` ships now; the registry remains versioned for future recipes.
- Payload remains the primary authoring UI, but there is no block-ordering GUI.
- The previously uncommitted Tally/kanban and portal work is committed as `d378dbd`; this plan builds on that snapshot and its migration chain (`20260712_065641` and earlier). Migration `20260712_065641` is not edited by this plan.
