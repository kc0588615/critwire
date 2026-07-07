# Coding Patterns

How code is written in this repo. Prefer Payload conventions over custom
patterns in every case. Preserve existing Payload patterns unless there
is a clear defect.

## Collections

- One file per collection under `/collections`, registered in
  `payload.config.ts`.
- Collections define the schema (→ Drizzle tables), admin UI, and API
  endpoints in one place. There is no separate migrations/ORM config to
  maintain by hand.
- Enums are Payload `select` field options (see `docs/features.md` for
  the canonical enum values).
- After changing collections, regenerate types (`payload generate:types`)
  and rely on the generated types — don't hand-write duplicates.
- Slug fields: unique per project where specified; validate/normalize in
  `beforeChange` hooks.

## Access control (replaces v6.1 `ServiceContext`)

Every collection defines `access` functions for `create`, `read`,
`update`, `delete`. No collection ships without them.

```tsx
// Example: issues
access: {
  read: () => true,                          // public issues are world-readable
  create: ({ req }) => isTenantMember(req),
  update: ({ req }) => isTenantMember(req),
  delete: ({ req }) => isTenantOwner(req),
}
```

- Roles: `admin` (global), `owner`, `member`.
- Authorization lives in access control functions — never manual checks
  scattered through route handlers.
- Field-level access control where a field is more sensitive than its
  collection.
- Public (player-facing) reads go through Payload REST or Local API with
  read-only access; no authentication required.

## Tenant isolation

- `@payloadcms/plugin-multi-tenant` injects the tenant field and filters
  every tenant-scoped collection automatically. **Never** manually inject
  or filter by workspace/tenant ID in application code.
- The plugin owns the Tenants collection (a tenant = a Workspace/studio)
  and the admin tenant switcher.
- Escape hatch: `payload.db.drizzle` for complex queries — must include
  explicit tenant scoping, since the plugin can't filter raw Drizzle.

## Hooks (replaces v6.1 service layer)

Business logic lives in collection lifecycle hooks, not standalone
services. The established hooks:

- **GameProject `beforeChange`** — validate slug uniqueness, normalize
  custom domain input.
- **GameProject `afterChange`** — invalidate the Upstash domain cache
  when `customDomain` changes.
- **PatchNote `afterChange`** — revalidate ISR for public patch-note
  pages on publish/edit.
- **Issue `afterChange`** — revalidate ISR for public issue pages;
  recalculate `upvoteCount` if needed.
- **IssueReport `afterChange`** — status → `PUBLISHED`: create an Issue
  from the report. Status → `LINKED`: associate with an existing Issue.
- **IssueVote `beforeChange`** — validate the browser token hash;
  enforce one vote per token per issue.

Rule: any hook that mutates published content calls `revalidatePath()`
or `revalidateTag()` **after** the DB write.

## Data access

- Server Components and Server Actions use the Local API:
  `payload.find`, `payload.create`, `payload.update`, `payload.delete`.
- React components never touch the database directly.
- Get the instance with `getPayload({ config })` (config imported from
  `@payload-config`).

## Client-state rule

Default to Server Components, Server Actions, `router.refresh()`, and
nuqs for URL state (filters/sort/search on public pages). Add SWR or
TanStack Query only when a specific surface truly needs client-side
freshness or optimistic state — justify it in the PR/commit.

## Validation

- Zod at every public API boundary (`/api/contact`, `/api/vote`, issue
  report submission, Stripe webhooks). Shared schemas in
  `/lib/validation`.
- Inside Payload, prefer field-level validation on collections over
  duplicate Zod checks.

## Jobs (Payload Jobs Queue, replaces Trigger.dev)

Tasks are defined in `/jobs` and registered in `payload.config.ts`:

- `discord-webhook` — Discord embed for contact submissions targeting
  Discord.
- `email-contact-form` — contact submission via Resend to the studio's
  configured email.
- `email-confirmation` — optional confirmation copy to the player.
- `isr-revalidate` — revalidate after content changes (may be replaced
  by direct `revalidatePath()` where latency allows).

The app is a persistent server, so the built-in scheduler just works —
no cron workarounds.

## Public form endpoints

Every public form endpoint follows the same shape:

1. Zod-parse the body.
2. Verify Cloudflare Turnstile token (`/lib/turnstile`).
3. Rate-limit by IP via Upstash (`/lib/rate-limit`).
4. Do the work (Local API write, or enqueue a job).
5. Structured pino log + Sentry capture on failure.

## Voting model

- Signed browser-token cookie; the token is **hashed** before storage
  (`/lib/security`).
- One vote per issue per token, enforced by a unique
  `[issueId, browserTokenHash]` constraint plus the IssueVote
  `beforeChange` hook.
- IP rate limiting via Upstash on the `/api/vote` endpoint.

## Rich text / landing pages

- Lexical (via Payload) everywhere — no TipTap.
- Landing pages use block-based fields: custom blocks in `/blocks`
  (hero, features, media-gallery, cta, trailer). The public renderer
  maps block types to React components.

## Error handling & observability

- Sentry capture in hooks, jobs, and API routes where failures matter.
- Structured JSON logging with pino; log hooks/access-control events,
  webhook processing, email delivery, contact routing, domain
  resolution.
- Fail closed on security paths: unknown domains → generic 404, invalid
  Turnstile → reject, missing tenant context → deny.

## Anti-patterns (grounds for rejection)

- Manual tenant filtering outside the plugin.
- Standalone service classes / `ServiceContext`-style contexts.
- Direct DB access from components.
- New abstractions for a single call site.
- Reintroducing removed dependencies (Clerk, Prisma, TipTap,
  Trigger.dev).
- Client-side data fetching where a Server Component suffices.
- Building infrastructure a managed service or Payload already provides.
