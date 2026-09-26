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
- Media folders (`payload-folders`) are tenant-scoped too: a studio
  only sees its own folders.
- Escape hatch: `payload.db.drizzle` for complex queries — must include
  explicit tenant scoping, since the plugin can't filter raw Drizzle.

## Hooks (replaces v6.1 service layer)

Business logic lives in collection lifecycle hooks, not standalone
services. The established hooks:

- **GameProject `afterChange` / `afterDelete`** — revalidate the
  portal for the current, previous and deleted slugs.
- **PatchNote `beforeChange`** — stamp `publishedAt` on first publish
  only; `afterChange` / `afterDelete` revalidate the patch-note pages.
- **Issue `afterChange` / `afterDelete`** — revalidate the public issue
  pages and the landing. **Issue `beforeDelete`** removes the issue's
  votes in the same transaction.
- **IssueReport `beforeChange`** — status → `PUBLISHED`: create the
  Issue with `req` (same transaction) and set the report's `issue` in
  the same write.
- **IssueVote `afterChange` / `beforeDelete`** — own `upvoteCount`
  through `$inc`: increment on create, decrement in `beforeDelete` (so
  a concurrent withdrawal of the same vote can't decrement twice).
  Nothing else writes the counter.

Rule: any hook that mutates published content calls `revalidatePath()`
or `revalidateTag()` **after** the DB write.

## Data access

- Server Components and Server Actions use the Local API:
  `payload.find`, `payload.create`, `payload.update`, `payload.delete`.
- React components never touch the database directly.
- Get the instance with `getPayload({ config })` (config imported from
  `@payload-config`).
- Public portal reads pass `overrideAccess: false`, so collection
  access decides what a player sees. Privileged reads live only in named
  helpers (`getContactRoute`, `getHasVoted`) that return only what the
  page needs, never secrets.
- Draft Mode reads authorize the preview user: drafts only for a super
  admin in Draft Mode, still with `overrideAccess: false`.

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

The app is a persistent server, so the built-in scheduler just works —
no cron workarounds. The submit route runs its own job (`jobs.runByID`);
the autorun cron retries failures.

- Jobs are super-admin only: the jobs collection and `jobs.access.run`
  (or the `CRON_SECRET` bearer). They hold every studio's messages.
- Contact tasks deliver or throw. A missing project, a changed routing
  target, an unset `RESEND_API_KEY` or a disallowed webhook URL throws,
  so the job keeps its input and error instead of disappearing.
- Recovering a failed job: fix the configuration, then as a super admin
  open the job in the admin and untick `hasError`; the autorun picks it
  up again.

## Public form endpoints

Every public form endpoint follows the same shape:

1. Zod-parse the body.
2. Verify Cloudflare Turnstile token (`/lib/turnstile`).
3. Rate-limit by IP via Upstash (`/lib/rate-limit`).
4. Do the work (Local API write, or enqueue a job).
5. Structured pino log + Sentry capture on failure.

Steps 1–3 are `guardPublicForm` (`/lib/public-forms/guard.ts`); use it
for any new form. In production, a form endpoint refuses to run without
Turnstile (`TURNSTILE_SECRET_KEY`) or Upstash. Only local development
skips them, plus Upstash in E2E builds (`RATE_LIMIT_OPTIONAL=1`).
Contact webhooks must be Discord's (`isAllowedDiscordWebhookUrl`,
checked on save and again before sending, which also refuses
redirects).

## Voting model

- Signed browser-token cookie; the token is **hashed** before storage
  (`/lib/security`).
- One vote per issue per token, enforced by a unique
  `[issue, browserTokenHash]` index. The route treats a duplicate or an
  already-withdrawn vote as done.
- `upvoteCount` is owned by the IssueVote hooks (see Hooks).
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
