#!/bin/bash
# Publish the current main to the live site. Nothing else deploys.
#
#   ./publish.sh            publish main as it stands
#   ./publish.sh --dry-run  show what would be published, change nothing
#   ./publish.sh --verify   check what is live right now, publish nothing
#
# HOW PUBLISHING WORKS
#
# Cloudflare builds `main`, which is its production branch, and a build is
# triggered by a PUSH — not by a commit. So committing costs nothing and
# deploys nothing; this script is the only thing that pushes, which makes it
# the only thing that can publish. Commit as freely as you like.
#
# It used to push a `release` branch instead, inherited from Canasta's Netlify
# setup where every push to main rebuilt and the free tier was small enough to
# matter. Cloudflare is not that stingy, and the second branch was actively
# harmful: Cloudflare runs a DIFFERENT deploy command for any branch that is
# not the production one, and that command — `npx wrangler preview` — fails.
# The v1.6 build died there, after a log that said the build had succeeded.
# See PUBLISHING.md.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$HERE" || exit 1

LIVE="https://carioca-rummy.mmhabermann.workers.dev"

live_version() {
  curl -s --max-time 20 "$LIVE/?cachebust=$1" \
    | grep -m1 -o "APP_VERSION = '[^']*'" | cut -d"'" -f2
}

ver=$(grep -o "APP_VERSION = '[^']*'" carioca.html | head -1 | cut -d"'" -f2)

if [ "${1:-}" = "--verify" ]; then
  echo "Live now: v$(live_version check)   (this working copy is v$ver)"
  exit 0
fi

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

echo "About to publish v$ver"
echo
echo "Changes since the last publish:"
if git rev-parse --verify --quiet origin/main >/dev/null; then
  if [ -z "$(git log --oneline origin/main..main)" ]; then
    echo "  (none — the live site already has this commit)"
  else
    git --no-pager log --oneline origin/main..main | sed 's/^/  /'
  fi
else
  echo "  (no origin/main yet — this will be the first publish)"
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

git push origin main || exit 1
echo
echo "Pushed main → v$ver is building on Cloudflare. Waiting for it…"

for i in $(seq 1 40); do
  sleep 15
  got=$(live_version "$i")
  if [ "$got" = "$ver" ]; then
    echo "Live: v$ver is serving at $LIVE"
    exit 0
  fi
  printf '  still v%s …\n' "${got:-?}"
done

echo >&2
echo "publish.sh: v$ver has not appeared after 10 minutes. The push worked, so" >&2
echo "the build or deploy failed. Open the Cloudflare dashboard ▸ carioca-rummy" >&2
echo "▸ Deployments and read the build log — note whether it failed at the BUILD" >&2
echo "step or the DEPLOY step, they have very different causes." >&2
exit 1
