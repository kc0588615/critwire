# Critwire — player feedback and updates for indie games

A player feedback board and updates hub for each indie game, on a
minimal, themable portal that links back to the studio's own website.
Players report bugs, suggest ideas, vote, and follow each item through
four stages (Under review, Planned, In progress, Shipped); studios post
updates with RSS and review submissions before they go public. It
complements a studio's website rather than replacing it.

Open source under the MIT licence: self-hosting is free and always will
be. Built on Payload CMS inside Next.js; Payload is the app.

**critwire.com** is one game's site: Critter Connect's public feedback
and updates site, run by Haunted Pavement LLC, in the game's own cc
look, light and dark. `/` opens the game's hub. The multi-studio
machinery (signup, onboarding, the hosted limits, the share kit,
Discord) stays in the code, off there. A self-hosted instance replaces
the site's identity: `src/lib/site.ts` (the game, name and operator),
the brand files in `public/brand/`, and the documents in `legal/`
(`docs/self-hosting.md`).

## Read first

- `AGENTS.md` — stack, non-negotiable rules, commands and testing rules
- `docs/architecture.md` — deployment, rendering, data access, structure
- `docs/patterns.md` — how collections, hooks, access control and jobs
  are written
- `docs/features.md` — product scope, feedback and updates behaviour,
  hosting and build phases
- `docs/integrations.md` — R2, Upstash, Resend, Turnstile, Sentry, the
  content filter and env vars
- `docs/deploy.md` — production runbook
- `docs/self-hosting.md` — which services you need, the first super
  admin, open signup and the hosted limits (all off by default)
- `legal/` — critwire.com's Terms of Service, Privacy Policy and
  Copyright Policy, for Critter Connect's site; a self-hosted instance
  replaces them with its own
- `GUI.md` and `gui/` — the cc design language, for UI work

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
