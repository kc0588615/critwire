# Critwire — Indie Game Developer Portal

Multi-tenant white-label SaaS: the **public ops layer for an indie game**.
Each studio gets one hosted, branded portal: game website + patch notes +
public issue tracker with player voting + contact form. Built on Payload
CMS inside Next.js; Payload is the app.

## Read first

- `AGENTS.md` — stack, non-negotiable rules, commands and testing rules
- `docs/architecture.md` — deployment, rendering, data access, structure
- `docs/patterns.md` — how collections, hooks, access control and jobs
  are written
- `docs/features.md` — product scope and build phases
- `docs/integrations.md` — R2, Upstash, Resend, Turnstile, Sentry and
  env vars
- `docs/deploy.md` — production runbook

## Commands

```bash
cp .env.example .env        # then point DATABASE_URL at Postgres 16
pnpm install
pnpm dev                    # dev server on http://localhost:3000
pnpm exec tsc --noEmit      # typecheck
pnpm lint                   # eslint
pnpm test:e2e               # Playwright; needs E2E_DATABASE_URL (see AGENTS.md)
pnpm test:int               # vitest
pnpm build                  # production build
```
