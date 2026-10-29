# Recovery

How to rebuild critwire from Git and roll the live site back. L4 and L5 update this file if they add state.

## 1. What Git holds

- Code, `data/` (every snapshot the build reads), `contracts/`, plans.
- The GBIF deposit tags `gbif-dd-*` and `gbif-learn-*`: each is a DOI's `sourceUrl`. Never delete or move one.

A commit plus its `pnpm-lock.yaml` rebuilds `dist/` byte for byte, offline (rehearsal below).

## 2. What Git doesn't hold

- `~/.local/state/critwire/` (`$XDG_STATE_HOME/critwire/` if set): the GBIF lock and intent per run, `gbif-register{.lock,-intent.json}`, `gbif-register-learn-sample{.lock,-intent.json}`, `gbif-sample-download{.lock,-intent.json}`. Empty between runs; an intent left behind is how an interrupted run reconciles, so keep it.
- `.env` files: the agents' checkout (`/srv/critter-ai/critwire/.env`), each worktree's, and the live copy's (`/srv/apps/critwire/.env`). They hold `DATABASE_URL`, `CRITWIRE_DB_TARGET`, `LEARN_PG_URL` and the GBIF account.
- The database roles and their passwords: `critwire` (dev), `critwire_live` (live build), `critwire_lab` (Learn labs; `pnpm learn:check --setup` recreates it).
- The frozen design spike (`/srv/critter-ai/agent-state/missions/critwire-learn-curriculum/`): the evidence for 004's blocks not yet ported.
- The databases (`critwire`, `critwire_dev`): rebuilt by every `pnpm build`; no unique state.

The control room backs these up to the owner's PC.

## 3. Restore a commit

```sh
C=<commit>; W=<scratch dir>
git worktree add --detach "$W/wt" "$C"
cd "$W/wt" && pnpm install --frozen-lockfile
createdb -O critwire critwire_restore          # as the superuser: the dev role has no CREATEDB
# $W/wt/.env, mode 600: the dev role's DATABASE_URL with database critwire_restore, plus
# CRITWIRE_DB_TARGET=critwire_restore. Never critwire_live credentials.
pnpm build                                     # plain, not --draft
(cd dist && find . -type f -print0 | sort -z | xargs -0 sha256sum) > "$W/dist.sha"
# compare with the same list over the copy you expect, e.g. /srv/apps/critwire/.live/ (read only)
dropdb critwire_restore && git worktree remove --force "$W/wt"
```

## 4. Roll back the live site

- **Normal:** revert the change on `main` by PR, then `deploy critwire`.
- **Emergency (control room only):** in `/srv/apps/critwire`, deploy's own commands at the previous commit: `git reset --hard <prev>`, `pnpm install --frozen-lockfile`, `pnpm build`, `rsync -a --delete --chmod=D755,F644 dist/ .live/`. Then revert `main` too, or the next `deploy` puts the bad commit back.

## Rehearsal

| Date (UTC) | Commit | Files | Result |
|---|---|---|---|
| 2026-10-29 | `6093a23` (L2's release, live) | 224 | §3: `dist/` sha256 list equal to `.live/`'s; §4's rsync into a scratch copy (never `.live/`): equal too. Build 5.7 s. No differences. |
