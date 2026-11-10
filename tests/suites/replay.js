<script>
// Playing the same hand again, and not losing it to a reload.
//
//   "do i reload and restart a new game or how do i retry on the same deal i
//    have?"
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x).slice(0,170)+']':''));}

window.addEventListener('load',()=>setTimeout(()=>{
  document.getElementById('start-btn').click();
  setTimeout(()=>{
   try{
    const hands=()=>G.players.map(p=>p.hand.map(c=>c.rank+c.suit).join('')).join('|');

    // ── THE DEAL HAS A NUMBER ─────────────────────────────────────────────
    startRound(3, 1, 54321, 4);
    ok('the deal carries its number', G.seed===54321, String(G.seed));
    const first=hands(), firstDiscard=topOfDiscard().rank+topOfDiscard().suit;

    // play some of it so the state is nothing like the deal
    for (let k=0;k<6 && !G.roundOver;k++) aiTakeTurn(G.turn);
    ok('and the round has moved on', hands()!==first);

    // ── REPLAY DEALS THE SAME CARDS ───────────────────────────────────────
    startRound(G.contractIdx, G.dealer, G.seed, 4);
    ok('THE REQUEST: replaying deals exactly the same hands',
        hands()===first, 'same='+(hands()===first));
    ok('...and the same card face up',
        topOfDiscard().rank+topOfDiscard().suit===firstDiscard, firstDiscard);
    ok('...and the same seat to play', G.turn===(1+1)%4, String(G.turn));

    // a different number deals differently
    startRound(3, 1, 54322, 4);
    ok('a different deal number is a different deal', hands()!==first);

    // ── A SAVE SURVIVES ───────────────────────────────────────────────────
    const store = (()=>{ try { localStorage.setItem('x','1');
                               localStorage.removeItem('x'); return true; }
                         catch(e){ return false; } })();
    if (!store) {
      ok('no storage here, so saving is skipped — the game still plays', true);
    } else {
      startRound(5, 2, 777, 4);
      for (let k=0;k<4 && !G.roundOver;k++) aiTakeTurn(G.turn);
      const before=hands(), seed=G.seed, con=G.contractIdx, turn=G.turn;
      const melds=G.players.map(p=>p.melds.length).join(',');
      saveGame();
      // wipe everything, as a reload would
      G.players=[]; G.stock=[]; G.discard=[]; G.seed=0; G.contractIdx=0;
      ok('the table is empty, as after a reload', G.players.length===0);
      ok('THE REQUEST: the save comes back', loadGame()===true);
      ok('...with the same hands', hands()===before, 'same='+(hands()===before));
      ok('...the same deal number', G.seed===seed, String(G.seed));
      ok('...the same contract and turn',
          G.contractIdx===con && G.turn===turn, G.contractIdx+'/'+G.turn);
      ok('...and the melds still on the table',
          G.players.map(p=>p.melds.length).join(',')===melds, melds);
      // a loaded meld is still a legal meld, not a bag of plain objects
      const anyMeld=G.players.flatMap(p=>p.melds)[0];
      if (anyMeld) ok('...and a loaded meld is still legal',
          anyMeld.type==='trio' ? isTrio(anyMeld.cards) : isRun(anyMeld.cards),
          anyMeld.type+' '+anyMeld.cards.map(c=>c.isJoker?'Jo':c.rank).join(''));
      clearSave();
      ok('clearing the save empties it', loadGame()===false);
    }

    // ── AND THE SCORES ARE NOT PAID TWICE ─────────────────────────────────
    startRound(0, 0, 999, 4);
    G.players.forEach((p,i)=>{ p.score = i*10; });
    const scoresBefore=G.players.map(p=>p.score).join(',');
    replayDeal();
    ok('replaying keeps the running scores as they were',
        G.players.map(p=>p.score).join(',')===scoresBefore,
        scoresBefore+'  ->  '+G.players.map(p=>p.score).join(','));

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },400);
},150));
</script>
