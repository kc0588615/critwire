# Tally Forms + Payload Issues Kanban

## Summary

Complete the existing Tally and admin-kanban implementation while fixing the review blockers.

- Tally remains a URL/embed integration only: no API keys, submission synchronization, polling, or webhooks.
- Native contact/report forms remain available only when explicitly selected.
- The admin board follows the Payload orderable + DnD-Kit gist at <https://gist.github.com/Dan6erbond/e0dd89744c21aaa8c25925717d589eeb>, adapted for Critwire's statuses, access controls, and tenants.
- Public issues remain a separate read-only player board.
- Preserve Payload's default Issues table as an alternate admin view.

## Tally Changes

### Configuration

```ts
type ContactTarget =
  | 'EMAIL'
  | 'DISCORD_WEBHOOK'
  | 'EXTERNAL_URL'
  | 'TALLY'

type ReportProvider = 'native' | 'tally' | 'external'
type TallyDisplay = 'embed' | 'button'
```

`GameProject.contact` receives `tallyUrl` and `tallyDisplay`; `reportForm` receives provider, Tally settings, and external URL.

Conditional validation requires the active Tally or external URL while leaving inactive provider fields optional.

### Parsing and rendering

Keep `parseTallyForm` as the allow-list boundary:

- Accept bare 4-32 character form IDs.
- Accept HTTPS `tally.so` and `www.tally.so` `/r/{id}` or `/embed/{id}` URLs.
- Normalize canonical share and embed URLs.
- Reject HTTP, foreign/custom hosts, missing IDs, extra paths, malformed values, and non-string input.
- Never render arbitrary stored URLs as iframe sources.

`TallyFormPanel` supports embed and button modes, accessible iframe titles, lazy loading, safe external links, visible configuration errors, one-time script loading, disclosure that Tally manages submissions, and CSP verification.

Contact and report pages fetch only required routing fields and never expose email or Discord webhook secrets to client components.

### Provider semantics

Only `reportForm.provider = native` may render or submit the Critwire form. Invalid or missing Tally/external configuration shows a not-configured state, never falls back to native storage, and logs a secret-free server error. Apply the same explicit behavior to contact routing.

## Admin Issues Kanban

### Server/client boundary and tenant scope

Refactor the server list view to pass only serializable `ListViewClientProps`. Never spread `ListViewServerProps`, `payload`, `i18n`, or other server values into the Client Component.

Initial column queries must:

- Use `overrideAccess: false` with the authenticated user.
- Read and explicitly filter by the selected `payload-tenant` cookie.
- Filter by status and sort by `_order`.
- Match subsequent REST request scoping.
- Render an actionable error rather than converting failures to empty columns.

The Table tab receives exactly the props required by `DefaultListView`.

### Ordering and migration

Keep `Issues.orderable = true`. Migration `20260712_065641_issues_orderable_and_tally_forms` is committed (`d378dbd`) and the template-first plan's migration builds on its snapshot — do **not** edit it retroactively. Audit what it already does and ship a **new corrective migration** for any gaps. The combined result must satisfy:

- Tally fields and enums present.
- Indexed `issues._order`.
- Existing Issues backfilled with distinct deterministic fractional keys in creation-time/ID order.
- Payload-managed ordering preserved for new Issues.
- `contact_target = TALLY` normalized before rollback recreates the old enum.
- Fields, indexes, and types removed in dependency-safe order on rollback.
- Works on empty and populated databases.

### Drag-and-drop behavior

Use Pointer and Keyboard sensors with `sortableKeyboardCoordinates` and accessible drag announcements. Support same-column reorder, cross-column moves, empty columns, drops before cards, overlays, cancellation, and paginated columns.

Persist status and `_order` in one access-controlled Payload update. While saving, prevent conflicting drags and show pending state. On failure, restore the snapshot or refetch affected columns and show a Payload error toast. “Load more” retains tenant, status, order, and deduplication.

Same-column reorders change only `_order`; per the template-first plan's cross-plan contracts, the Issues revalidation hook skips `_order`-only writes so board drags never trigger public-page ISR revalidation. Verify this holds after the template work lands (cross-column moves change status and revalidate normally).

## Tests and Verification

Automated coverage:

- Tally parser URL, host, scheme, path, ID, and whitespace cases
- Conditional validation for every contact/report provider
- Invalid Tally/external configurations never exposing native forms
- Embed/button rendering, disclosure, title, and one-time script loading
- Migration backfill and rollback with existing `TALLY` data
- Client-safe list-view props
- Selected-tenant isolation for multi-tenant users
- Pointer and keyboard reorder across populated and empty columns
- PATCH failure rollback and visible error
- Default Table mode and create permissions

Browser acceptance:

1. Verify contact Tally embed and button modes.
2. Verify report Tally and external modes.
3. Confirm native submission only with `provider = native`.
4. Confirm selected-tenant admin isolation.
5. Move cards, reload, and confirm persistence.
6. Exercise keyboard dragging.
7. Confirm Table mode works normally.
8. Confirm public `?view=board` remains read-only.

Run TypeScript, targeted ESLint, integration tests, production build, migration up/down, and browser smoke tests before completion.

## Assumptions

- This plan is separate from and queued after the template-first plan unless reprioritized. Its base includes the committed WIP (`d378dbd`) plus the template-first work; new migrations are numbered after the template plan's migrations.
- No marketplace kanban plugin is added.
- No Tally API, API key, webhook, or submission import is included.
- Unrelated portal, seed, Docker, and design-system work stays outside the feature commit.
- Regenerate Payload types/import map and update the migration snapshot, documentation, and verification instructions.

