<script>
// Does it actually play? Every contract, many deals, four AI seats.
// A round that cannot finish itself has a bug in it that no unit test finds.
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x).slice(0,200)+']':''));}

window.addEventListener('load',()=>setTimeout(()=>{
  document.getElementById('start-btn').click();
  setTimeout(()=>{
   try{
    const N=40;
    let finished=0, stalled=0, totalTurns=0, wentOut=0, minus20=0, minus10=0;
    const perContract=[];
    for (let ci=0; ci<CONTRACTS.length; ci++){
      let fin=0, turns=0, m20=0, m10=0;
      for (let d=0; d<N; d++){
        const r=playRound(ci, d%4, 1000+d*7+ci*131, 4);
        totalTurns+=r.turns; turns+=r.turns;
        if (r.over){ finished++; fin++;
          const w=G.players.findIndex(p=>p.wentOut);
          if (w>=0){ wentOut++;
            if (r.scores[w]===-20) { minus20++; m20++; } else { minus10++; m10++; } }
        } else stalled++;
      }
      perContract.push(CONTRACTS[ci].name+': '+fin+'/'+N+
                       ' avg '+Math.round(turns/N)+' turns, '+m20+' at -20');
    }
    ok('EVERY round finishes', stalled===0, stalled+' stalled of '+(N*7));
    ok('...and somebody goes out in each', wentOut===finished,
        wentOut+' out of '+finished);
    ok('rounds are a sane length', totalTurns/(N*7) > 4 && totalTurns/(N*7) < 300,
        'avg '+Math.round(totalTurns/(N*7))+' turns');
    ok('the -20 is reachable but not routine', minus20>0 && minus20<finished,
        minus20+' at -20, '+minus10+' at -10');
    perContract.forEach(line=>ok('  '+line, true));

    // the cards never multiply or vanish
    playRound(3, 0, 4242, 4);
    const onTable=G.players.reduce((s,p)=>s+p.hand.length+
                   p.melds.reduce((t,m)=>t+m.cards.length,0),0);
    ok('no card is created or destroyed over a whole round',
        onTable+G.stock.length+G.discard.length===108,
        (onTable+G.stock.length+G.discard.length)+' of 108');
    const ids=[];
    G.players.forEach(p=>{ p.hand.forEach(c=>ids.push(c.id));
      p.melds.forEach(m=>m.cards.forEach(c=>ids.push(c.id))); });
    G.stock.forEach(c=>ids.push(c.id)); G.discard.forEach(c=>ids.push(c.id));
    ok('...and no card is in two places', new Set(ids).size===ids.length,
        ids.length+' cards, '+new Set(ids).size+' distinct');

    // every laid meld is legal, every round
    let bad=0;
    for (let d=0; d<20; d++){
      playRound(d%7, 0, 7000+d, 4);
      G.players.forEach(p=>p.melds.forEach(m=>{
        if (m.type==='trio' ? !isTrio(m.cards) : !isRun(m.cards)) bad++;
      }));
    }
    ok('every meld on the table is legal, across 20 rounds', bad===0, bad+' bad');

    // the contract laid is exactly the contract asked for
    let wrong=0;
    for (let d=0; d<20; d++){
      playRound(d%7, 0, 8000+d, 4);
      const con=CONTRACTS[d%7];
      G.players.filter(p=>p.down).forEach(p=>{
        const t=p.melds.filter(m=>m.type==='trio').length;
        const r=p.melds.filter(m=>m.type==='run').length;
        if (t!==con.trios || r!==con.runs) wrong++;
      });
    }
    ok('nobody lays more or fewer groups than the contract', wrong===0, wrong+' wrong');

    // and the arms change something, or they are not measuring anything
    AI_ARM=null;  const a=playRound(1, 0, 555, 4).scores.join(',');
    AI_ARM='nosteal'; const b=playRound(1, 0, 555, 4).scores.join(',');
    AI_ARM=null;
    ok('the nosteal arm changes the game', a!==b, a+'  vs  '+b);

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   AI_ARM=null;
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
