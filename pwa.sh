#!/bin/bash
# Build the installable web app (PWA) from the current game HTML.
#
#   ./pwa.sh [path-to-game.html]
#
# Produces ~/CariocaApp/pwa/ — upload that whole folder to any static HTTPS
# host and the phone can "Add to Home Screen" it. Everything is path-relative,
# so it works at a domain root or in a subdirectory (GitHub Pages project
# sites live at /reponame/) with no edits.
#
# The game file stays the single source of truth. The PWA parts are injected at
# build time rather than written into the game, so the copy inside the Mac app
# stays exactly what the test suites run against — same reason build.sh copies
# rather than edits.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="${1:-$HERE/carioca.html}"
OUT="$HERE/pwa"
ICONSRC="$HERE/src/icon-1024.png"
PREBUILT="$HERE/src/pwa-icons"   # committed icons, for builders without sips

[ -f "$GAME" ]    || { echo "error: game HTML not found at $GAME" >&2; exit 1; }
[ -f "$ICONSRC" ] || { echo "error: icon not found at $ICONSRC" >&2; exit 1; }

FELT_DARK="0d6b14"

echo "==> Cleaning $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/icons"

echo "==> Icons"
# sips is macOS-only, and this script has to run on Netlify's Linux builder as
# well. On macOS the icons are generated from the 1024px artwork and the
# results are refreshed into src/pwa-icons/; everywhere else those committed
# PNGs are simply copied. Same five files either way.
# PWA_FORCE_PREBUILT=1 takes the Linux path on a Mac, so the branch Netlify
# actually runs can be tested here.
if [ -z "${PWA_FORCE_PREBUILT:-}" ] && command -v sips >/dev/null 2>&1; then
  # Plain icons: the artwork already fills its square, which is what iOS wants.
  for s in 192 512; do
    sips -s format png -z $s $s "$ICONSRC" --out "$OUT/icons/icon-$s.png" >/dev/null
  done
  # Apple touch icon. iOS ignores the manifest and reads this, at 180x180.
  sips -s format png -z 180 180 "$ICONSRC" --out "$OUT/icons/apple-touch-icon.png" >/dev/null
  # Maskable icons: Android crops to a circle or squircle, so the artwork has to
  # sit inside the middle ~80% or the edges get shaved off. Shrink, then pad back
  # out to full size on the felt colour.
  for s in 192 512; do
    inner=$(( s * 80 / 100 ))
    sips -s format png -z $inner $inner "$ICONSRC" --out "$OUT/icons/maskable-$s.png" >/dev/null
    sips --padToHeightWidth $s $s --padColor "$FELT_DARK" \
         "$OUT/icons/maskable-$s.png" --out "$OUT/icons/maskable-$s.png" >/dev/null 2>&1
  done
  # Keep the committed copies in step so the Linux path never goes stale — but
  # only when the ARTWORK is newer than they are, the way make would.
  #
  # sips is not byte-deterministic: re-encoding the same source shifts a byte or
  # two of PNG header, so copying unconditionally dirtied five ~400KB binaries
  # on every single build and swept them into commits that had nothing to do
  # with iconography. Nothing downstream can tell the two encodings apart.
  mkdir -p "$PREBUILT"
  for f in "$OUT"/icons/*.png; do
    name=$(basename "$f")
    if [ ! -f "$PREBUILT/$name" ] || [ "$ICONSRC" -nt "$PREBUILT/$name" ]; then
      cp "$f" "$PREBUILT/$name"
      echo "    refreshed $name"
    fi
  done
else
  echo "    sips unavailable — using committed icons from src/pwa-icons/"
  [ -d "$PREBUILT" ] || { echo "error: no sips and no $PREBUILT to fall back on" >&2; exit 1; }
  cp "$PREBUILT"/*.png "$OUT/icons/"
fi

for f in icon-192.png icon-512.png apple-touch-icon.png maskable-192.png maskable-512.png; do
  [ -s "$OUT/icons/$f" ] || { echo "error: icons/$f missing or empty" >&2; exit 1; }
done

echo "==> Manifest"
cat > "$OUT/manifest.webmanifest" <<'JSON'
{
  "name": "Carioca Rummy",
  "short_name": "Carioca",
  "description": "Seven contracts, two decks, four players. Fewest points wins.",
  "start_url": ".",
  "scope": ".",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#0d6b14",
  "theme_color": "#0d6b14",
  "categories": ["games"],
  "icons": [
    { "src": "icons/icon-192.png",     "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icons/icon-512.png",     "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icons/maskable-192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
JSON

echo "==> Host headers"
# Netlify (and most static hosts that read this file) guess .webmanifest wrong
# and serve it as application/octet-stream. Chrome tolerates that, Lighthouse
# complains about it, and the spec says otherwise — so say it explicitly rather
# than rely on a browser being lenient. Hosts that ignore _headers are no worse
# off than before.
cat > "$OUT/_headers" <<'HEADERS'
/manifest.webmanifest
  Content-Type: application/manifest+json
HEADERS

echo "==> Page"
# Inject the PWA head tags and the service-worker registration just before
# </head>. The game already carries the apple-mobile-web-app meta tags and a
# viewport-fit=cover viewport, so only the parts it cannot have as a lone file
# are added here.
# Written to a file rather than captured with $(cat <<'"'"'EOF'"'"'): an apostrophe
# inside a heredoc nested in command substitution trips the bash parser.
INJ="$OUT/.inject.html"
cat > "$INJ" <<'HTML'
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<meta name="theme-color" content="#0d6b14">
<script>
// Registered from a plain <script> rather than a module so it runs across the
// whole range the game is opened from. Service workers exist only on https and
// localhost; anywhere else this quietly does nothing and the game still runs,
// which is what happens inside the carioca:// shell of the Mac app.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
</script>
HTML

# awk rather than sed: the payload is full of slashes and ampersands that sed
# would treat as replacement syntax.
awk 'FNR == NR { inj = inj $0 ORS; next }
     !done && /<\/head>/ { printf "%s", inj; done = 1 }
     { print }' "$INJ" "$GAME" > "$OUT/index.html"
rm -f "$INJ"

grep -q 'manifest.webmanifest' "$OUT/index.html" || { echo "error: injection failed" >&2; exit 1; }

echo "==> Service worker"
# The cache name carries a hash of the built page, so publishing a new build
# invalidates the old cache automatically and a stale game cannot linger.
#
# `shasum` on macOS, `sha256sum` on most Linux images. Netlify's builder happened
# to have shasum, so this went unnoticed; a host whose image does not would fail
# here, and the whole build with it. Both produce the same digest, so a build
# made on either machine gives the same cache name.
if command -v shasum >/dev/null 2>&1; then
  VER="$(shasum -a 256 "$OUT/index.html" | cut -c1-12)"
elif command -v sha256sum >/dev/null 2>&1; then
  VER="$(sha256sum "$OUT/index.html" | cut -c1-12)"
else
  echo "error: neither shasum nor sha256sum is available — cannot version the cache" >&2
  exit 1
fi
# UNQUOTED heredoc — deliberately, so $VER lands in the cache name below. That
# means bash expands the whole body: a $name, a ${…} or a `backtick` pair added
# to this JS later would be silently replaced or executed. (That exact bug hit
# tests/phonelayout.sh — a backtick pair in a comment ran as a shell command.)
# Keep $VER the only expansion in here.
cat > "$OUT/sw.js" <<SW
// Offline cache for Carioca Rummy.
//
// The game is one self-contained file — no fonts, scripts or images are
// fetched at runtime — so precaching the page and its icons is genuinely all
// of it, and the app works with the phone in aeroplane mode.
//
// CACHE is rebuilt with a hash of index.html by pwa.sh, so a new build lands
// in a new cache and the old one is deleted on activate.
const CACHE = 'carioca-$VER';
const ASSETS = [
  '.', 'index.html', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'icons/maskable-192.png', 'icons/maskable-512.png',
  'icons/apple-touch-icon.png'
];

// skipWaiting, and it is not optional. Without it a new worker INSTALLS — it
// even downloads the new build into its cache — and then sits in "waiting"
// until every window of this scope is closed. activate never runs, the old
// worker keeps serving the old cache, and the update simply never lands.
//
// That is not theory. A player could not get v29.2 onto either her phone or her
// tablet while her husband, installing fresh with no prior worker to wait
// behind, got it immediately. On iOS, swiping a home-screen app away does not
// close it, so "next launch" never arrives unless you force-quit — and nobody
// force-quits a card game.
//
// The comment below used to call the delay deliberate: better one launch behind
// than swapped out mid-round. The intent was right and the mechanism did not
// deliver it — the real behaviour was "never", not "one launch". And the fear
// does not apply here anyway: the game is ONE self-contained file that is fully
// in memory once it has loaded, and it makes no runtime fetches at all, so a
// worker taking over serves the running page nothing. Updating the cache cannot
// disturb a round in progress; the new build appears on the next launch, which
// is what was wanted all along.
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first. The whole app is static and versioned by CACHE, so there is
// nothing to be gained by going to the network first — and going to the cache
// first is what makes it start instantly and work offline. A new build is
// picked up by the next launch, deliberately: swapping the page out from under
// a round in progress would be worse than being one launch behind.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() =>
        // Offline and not in cache: navigations still get the game.
        e.request.mode === 'navigate' ? caches.match('index.html') : undefined
      )
    )
  );
});
SW

# ── Cache headers, as a file in the output ──
# netlify.toml carries these too, but that file means nothing to any other host.
# Cloudflare Pages (and most static hosts) read a `_headers` file from the
# published directory, so the rules travel with the build instead of living in
# one provider's config.
#
# The service worker MUST NOT be cached. It versions everything else, so a
# stale copy of sw.js keeps serving an old game forever and no amount of
# redeploying reaches anyone who has already visited once.
echo "==> Cache headers"
cat > "$OUT/_headers" <<'HDR'
/sw.js
  Cache-Control: no-cache, no-store, must-revalidate

/index.html
  Cache-Control: no-cache

/manifest.webmanifest
  Content-Type: application/manifest+json
  Cache-Control: no-cache

/icons/*
  Cache-Control: public, max-age=31536000, immutable
HDR

SIZE=$(du -sh "$OUT" | cut -f1)
echo "==> Built $OUT ($SIZE, cache carioca-$VER)"
echo
echo "Test it locally (service workers are allowed on localhost):"
echo "    cd '$OUT' && python3 -m http.server 8000"
echo "    open http://localhost:8000"
echo
echo "To put it on a phone, the folder needs an HTTPS host — see PWA.md."
