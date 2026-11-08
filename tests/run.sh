#!/bin/bash
# Run every suite in suites/ against the current game.
#
#   ./run.sh                    every suite
#   ./run.sh fan basket         just those suites
#   ./run.sh --game path.html   against a different build
#
# The game used to be positional ("$1"), so `./run.sh fan` silently took "fan"
# as the path to the game: cat failed on every suite and all of them ran against
# an empty page. It is a named flag now, and the path is checked.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="$HERE/../carioca.html"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
only=()
while [ $# -gt 0 ]; do
  case "$1" in
    --game) GAME="${2:?--game needs a path}"; shift 2 ;;
    -h|--help) sed -n '2,10p' "$0"; exit 0 ;;
    -*) echo "run.sh: unknown option $1" >&2; exit 2 ;;
    *) only+=("$1"); shift ;;
  esac
done
[ -f "$GAME" ] || { echo "run.sh: game not found at $GAME" >&2; exit 2; }

TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
tot=0; bad=0; ran=0

for suite in "$HERE"/suites/*.js; do
  name="$(basename "$suite" .js)"
  if [ ${#only[@]} -gt 0 ]; then
    match=0
    for want in "${only[@]}"; do [ "$want" = "$name" ] && match=1; done
    [ $match -eq 1 ] || continue
  fi
  ran=$((ran+1))
  cat "$GAME" "$suite" > "$TMP/run.html"
  out=$("$CHROME" --headless=new --disable-gpu --force-device-scale-factor=1 \
        --virtual-time-budget=120000 --dump-dom "file://$TMP/run.html" 2>/dev/null \
        | sed -n '/<pre id="results">/,/<\/pre>/p' | sed 's/<[^>]*>//g' \
        | perl -pe 's/(PASS — |FAIL — )/\n$1/g')
  # That last step puts every result back on a line of its own before counting.
  # --dump-dom serialises the DOM with almost no line breaks, so whatever
  # element happens to precede #results lands on the same line as the first
  # result — meldtip.js leaves a rendered tooltip there, and its text swallowed
  # the "PASS" that followed it. The suite looked one assertion short and there
  # was nothing in its own output to show why.
  #
  # Anchored counting below: a FAIL line whose message happens to contain the
  # word PASS was being counted as both.
  p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
  # A suite that reports nothing is a BROKEN suite, not an empty one — and this
  # is not hypothetical: fan.js threw a SyntaxError on a redeclared const, so it
  # never appended its results element, printed "0 pass 0 fail", and seventeen
  # assertions sat dead for some time behind a green total.
  if [ "$p" -eq 0 ] && [ "$f" -eq 0 ]; then
    f=1
    out="FAIL — suite produced no results (parse error, hang, or no #results element)"
  fi
  tot=$((tot+p)); bad=$((bad+f))
  printf '%-12s %2d pass  %d fail\n' "$name" "$p" "$f"
  grep '^FAIL' <<<"$out" | sed 's/^/    /'
done

if [ ${#only[@]} -gt 0 ] && [ $ran -eq 0 ]; then
  echo "run.sh: no suite matched ${only[*]}" >&2
  echo "available: $(cd "$HERE/suites" && ls *.js | sed 's/\.js$//' | tr '\n' ' ')" >&2
  exit 2
fi

echo "── $tot passing, $bad failing ──"
exit $((bad > 0))
