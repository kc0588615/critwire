In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.

# AGENTS.md
Guidance for coding agents. Facts over prose. Plan: `plans/001-mvp.md`.

## What this is
Open curated species data at critwire.com, dogfooded by Critter Connect (repo `kc0588615/phaser-june`). Static files under `/v1/` (Parquet, CSV, JSON) plus a docs page; no server process.

## Stack
- pnpm, TypeScript (`tsx`), postgres.js + plain SQL. No web framework.
- Postgres 16 + PostGIS 3.4.2 on the Oracle VPS. No PostGIS 3.5-only functions.
- DuckDB `postgres` extension writes Parquet.

## Prefer simplicity
Simplest approach that works. Ask before adding complexity.

## Data rules (non-negotiable)
- Source of truth: snapshots committed in `data/`. Ingest scripts fetch and commit; `pnpm build` loads `data/` into Postgres (rebuilt each time) and writes `dist/`. Never hand-edit the db.
- IUCN: store only the SIS taxon id (`ids.iucn`). Never store, cache, proxy or serve IUCN data (categories, assessments, ranges).
- No Wikipedia prose (share-alike); write copy fresh for grades 6–12. Bare trait values may come from any cited source in our own words; bulk imports only from open datasets.
- Every third-party field and photo records its source and license.
- Our ids: integer, never reused, plus slug. Outside ids live in `ids`. Retired ids get `replacedBy`.

## Databases
- `critwire`: the live build. Agents never use it.
- `critwire_dev`: agents' scratch db.
- Always `DATABASE_URL` from env; never hardcode connection strings.

## Two machines (WSL + Oracle VPS)
GitHub `origin` is the hub; only pushed work exists on the other machine.
- Agent work: one issue per branch `agent/<slug>` from fresh `origin/main`; rebase before the PR; push and open a PR via `gh` (HTTPS); the owner merges. GO comes only from the owner.
- Push before you stop, WIP included.
- Paths on the VPS: agents' checkout `/srv/critter-ai/critwire`, live copy `/srv/apps/critwire`.
- Release: owner only, `deploy critwire` on the VPS (pull main into the live copy, `pnpm install --frozen-lockfile`, `pnpm build`, swap in `dist/` only if the build passed). The first deploy is the cutover from the old app: plan it with the owner, never as part of a task.
- VPS setup (Postgres, Caddy, CORS) is done from the Oracle control room, not from here.

## Commands
- `pnpm install`, `pnpm build` (writes `dist/`), `pnpm typecheck`.
