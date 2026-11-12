#!/bin/bash
# Carioca at a real phone size.
#
#   ./tests/phonelayout.sh [game] [W] [H]
#
# A file:// iframe is cross-origin and contentDocument comes back null, which
# reads like the game failed to load. --allow-file-access-from-files settles it
# in one flag; the Canasta harness runs a web server for the same reason, which
# works and is three times the moving parts.
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
GAME="${1:-$HERE/../carioca.html}"
W="${2:-393}"; H="${3:-852}"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
[ -f "$GAME" ] || { echo "error: game not found at $GAME" >&2; exit 1; }
cp "$GAME" "$TMP/index.html"

cat > "$TMP/probe.html" <<'HTML'
<!doctype html><meta charset="utf-8"><body style="margin:0">
<iframe id="f" src="index.html" style="width:__W__px;height:__H__px;border:0"></iframe>
<pre id="results">no result</pre>
<script>
var W = __W__, H = __H__;
document.getElementById('f').addEventListener('load', function(){
  var w = f.contentWindow, d = f.contentDocument;
  var out = [], ok = function(n,c,x){ out.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+x+']':'')); };
  function finish(){ document.getElementById('results').textContent = out.join('\n'); }
  try {
    d.getElementById('start-btn').click();
  } catch (e) { ok('the game deals', false, e.message); finish(); return; }
  setTimeout(function(){
    try {
      // Pin a human turn: mid-AI-turn the action bar is empty, which is not a
      // fact about the layout. Through eval, since top-level let is not on window.
      var staged = w.eval('try { G.turn = 0; G.phase = "meld"; render(); "ok" }'
                        + ' catch (e) { "ERR " + e.message }');
      ok('a human turn can be pinned', staged === 'ok', staged);
      ok('the iframe really is ' + W + 'px wide', w.innerWidth === W, 'innerWidth ' + w.innerWidth);
      ok('cards were dealt',
         w.eval('G.players[0].hand.length') > 0, w.eval('G.players[0].hand.length') + ' in hand');

      ok('the page does not scroll sideways',
         d.documentElement.scrollWidth <= w.innerWidth,
         d.documentElement.scrollWidth + ' vs ' + w.innerWidth);
      ok('nor up and down',
         d.documentElement.scrollHeight <= w.innerHeight + 1,
         d.documentElement.scrollHeight + ' vs ' + w.innerHeight);

      // The hand must be whole and on the screen.
      var lo = 0, rt = 0, lf = 1e9;
      Array.prototype.forEach.call(d.getElementById('my-hand').children, function(c){
        var r = c.getBoundingClientRect();
        lo = Math.max(lo, r.bottom); rt = Math.max(rt, r.right); lf = Math.min(lf, r.left);
      });
      ok('no card hangs off the bottom', lo <= w.innerHeight + 1, Math.round(lo)+' of '+w.innerHeight);
      ok('nor off either side', rt <= W + 1 && lf >= -1,
         'left '+Math.round(lf)+'  right '+Math.round(rt));

      // A DEALT HAND IS NOT THE BIGGEST HAND. The opening contract deals
      // seven, the last deals thirteen, and stealing grows it further. This
      // only ever looked at whatever happened to be on the table, so it passed
      // for weeks while thirteen cards ran off both edges of the phone — and a
      // card off the edge is a card you cannot see you have selected.
      var sizes = [7, 11, 13, 18, 24], bad = [];
      sizes.forEach(function(n){
        w.eval('G.turn=0; G.phase="meld";'
             + 'G.players[0].hand=Array.from({length:'+n+'},function(_,i){'
             + ' return {rank:RANKS[i%13],suit:SUITS[i%4],isJoker:false,id:"z"+i}; });'
             + 'render();');
        var l2=1e9, r2=-1e9, b2=0;
        Array.prototype.forEach.call(d.getElementById('my-hand').children, function(c){
          var r=c.getBoundingClientRect();
          l2=Math.min(l2,r.left); r2=Math.max(r2,r.right); b2=Math.max(b2,r.bottom);
        });
        if (l2 < -1 || r2 > W + 1 || b2 > w.innerHeight + 1)
          bad.push(n+' cards: left '+Math.round(l2)+' right '+Math.round(r2));
      });
      ok('every hand size fits, not just the one dealt', bad.length === 0,
         bad.length ? bad.join('; ') : sizes.join(', ')+' cards checked');

      // Every control reachable.
      var btns = [].slice.call(d.querySelectorAll('#actions .action-btn, .round-btn'));
      var off = btns.filter(function(b){
        var r = b.getBoundingClientRect();
        return r.right > W + 1 || r.left < -1 || r.bottom > w.innerHeight + 1;
      });
      ok('every button is on the screen', off.length === 0,
         off.length ? off.length+' of '+btns.length+' off: "'+off[0].textContent.trim()+'"'
                    : btns.length + ' checked');

      // Text in the top strip must not pile up on itself.
      var boxes = [];
      Array.prototype.forEach.call(d.querySelectorAll('*'), function(e){
        if (e.children.length) return;
        if (e.closest('#overlay, #banner, #hold-wrap')) return;
        var t = e.textContent.trim(); if (!t) return;
        var r = e.getBoundingClientRect();
        if (r.width > 0 && r.top < 120) boxes.push({ t: t.slice(0,16), r: r });
      });
      var hits = [];
      for (var i=0;i<boxes.length;i++) for (var j=i+1;j<boxes.length;j++){
        var a=boxes[i].r, b=boxes[j].r;
        if (Math.min(a.right,b.right)-Math.max(a.left,b.left) > 2 &&
            Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top) > 2)
          hits.push('"'+boxes[i].t+'" x "'+boxes[j].t+'"');
      }
      ok('no text in the top strip overlaps', hits.length === 0,
         hits.length ? hits.slice(0,3).join('; ') : boxes.length+' runs checked');

      // Cards big enough to read.
      var cw = parseFloat(getComputedStyle(d.documentElement).getPropertyValue('--card-w'));
      ok('cards are big enough to read', cw >= 34, cw + 'px wide');
    } catch (e) { ok('the probe ran', false, e.message); }
    finish();
  }, 700);
});
</script></body>
HTML
sed -i '' "s/__W__/$W/g; s/__H__/$H/g" "$TMP/probe.html"

out=$("$CHROME" --headless=new --disable-gpu --force-device-scale-factor=1 \
      --allow-file-access-from-files \
      --window-size=$((W+40)),$((H+260)) --virtual-time-budget=20000 \
      --dump-dom "file://$TMP/probe.html" 2>/dev/null \
      | sed -n '/<pre id="results">/,/<\/pre>/p' | sed 's/<[^>]*>//g' \
      | perl -pe 's/(PASS — |FAIL — )/\n$1/g')

echo "Phone layout: ${W}x${H}"
if [ -z "$out" ] || ! grep -q 'PASS\|FAIL' <<<"$out"; then
  echo "FAIL — probe produced no output"; exit 1
fi
echo "$out" | grep -E '^(PASS|FAIL)'
p=$(grep -c '^PASS' <<<"$out"); f=$(grep -c '^FAIL' <<<"$out")
echo "── $p passing, $f failing ──"
exit $((f > 0))
