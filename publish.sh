#!/bin/bash
# Publish the current main to the live site. Nothing else deploys.
#
#   ./publish.sh            publish main as it stands
#   ./publish.sh --dry-run  show what would be published, change nothing
#
# HOW PUBLISHING WORKS NOW
#
# Cloudflare Pages watches the `release` branch and nothing else. Day-to-day
# commits go to `main` and deploy nowhere, so pushing costs nothing and cannot
# be triggered by accident. Publishing is this one command: it fast-forwards
# `release` to `main` and pushes, and that push is the only thing that ever
# builds the site.
#
# That is the whole point. The Netlify setup rebuilt on EVERY push to main —
# documentation commits included — and that is what exhausted its free tier.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1
DRY=""
[ "${1:-}" = "--dry-run" ] && DRY=1

branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$branch" != "main" ]; then
  echo "publish.sh: you are on '$branch', not main. Switch to main first." >&2
  exit 2
fi
if [ -n "$(git status --porcelain)" ]; then
  echo "publish.sh: uncommitted changes. Commit them before publishing:" >&2
  git status --short >&2
  exit 2
fi

ver=$(grep -o "APP_VERSION = '[^']*'" carioca.html | head -1 | cut -d"'" -f2)

echo "About to publish v$ver"
echo

if git rev-parse --verify --quiet release >/dev/null; then
  echo "Changes since the last publish:"
  git --no-pager log --oneline release..main | sed 's/^/  /'
  [ -z "$(git log --oneline release..main)" ] && echo "  (none — release already matches main)"
else
  echo "No release branch yet — this will be the first publish."
fi
echo

if [ -n "$DRY" ]; then echo "--dry-run: nothing changed."; exit 0; fi

# Tests first. Publishing something that does not pass is never intended.
echo "Running the harness before publishing…"
if ! ./tests/run.sh || ! ./tests/phonelayout.sh; then
  echo >&2
  echo "publish.sh: tests failed — NOT publishing." >&2
  exit 1
fi
echo

git branch -f release main || exit 1
git push origin release || exit 1

echo
echo "Pushed release → v$ver is building on Cloudflare."
echo "It usually takes a minute. Check it with:"
echo "    curl -s https://carioca-rummy.<your-subdomain>.workers.dev/ | grep APP_VERSION"
