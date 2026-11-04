#!/usr/bin/env bash
# SessionStart: says when this checkout is behind origin/main (the other machine merges too; AGENTS.md "Two machines").
if ! timeout 10 git fetch -q origin main 2>/dev/null; then
  echo "Could not fetch origin/main, so this checkout's freshness is unverified."
  exit 0
fi
behind=$(git rev-list --count HEAD..origin/main)
[ "$behind" -gt 0 ] && echo "This checkout is $behind commits behind origin/main, AGENTS.md included. Cut work from fresh origin/main."
exit 0
