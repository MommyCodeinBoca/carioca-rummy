<script>
// Jokers: what they stand for, who says so, and who can buy one back.
//
//   "jokers at the end, are meant for the end cap. in your example it would be
//    4-5-6-(7), they have to declare when they lay it down"
//
//   "if one of the other players has the card it was meant to replace, they
//    can, on their turn, exchange the joker for the card and use the joker to
//    complete their contract."
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x).slice(0,160)+']':''));}

window.addEventListener('load',()=>setTimeout(()=>{
  document.getElementById('start-btn').click();
  setTimeout(()=>{
   try{
    const C=(r,s)=>({rank:r,suit:s||'♠',isJoker:false,id:r+(s||'')+Math.random()});
    const J=()=>({rank:'JOKER',suit:'★',isJoker:true,id:'j'+Math.random()});

    // ── A JOKER IN A GAP NAMES ITSELF ───────────────────────────────────
    let r=resolveRun([C('4','♥'),C('5','♥'),J(),C('7','♥')]);
    ok('a gap joker needs no declaration',
        r && !r.need && r.jokers.length===1 && r.jokers[0].rank==='6',
        r && r.jokers ? r.jokers[0].rank+r.jokers[0].suit : JSON.stringify(r));
    ok('...and the run comes back in sequence',
        r.order.map(c=>c.isJoker?'J':c.rank).join('-')==='4-5-J-7',
        r.order.map(c=>c.isJoker?'J':c.rank).join('-'));

    r=resolveRun([C('Q','♦'),C('K','♦'),J(),C('2','♦')]);
    ok('...across the seam it is the Ace', r && r.jokers[0].rank==='A',
        r && r.jokers ? r.jokers[0].rank : JSON.stringify(r));

    // ── AN END JOKER MUST BE DECLARED ───────────────────────────────────
    r=resolveRun([C('4','♥'),C('5','♥'),C('6','♥'),J()]);
    ok('HER RULE: an end joker has to be declared', r && r.need==='declare',
        JSON.stringify(r && r.choices));
    ok('...and the game offers both caps',
        r.choices.length===2 && r.choices.flat().join(',').includes('7♥') &&
        r.choices.flat().join(',').includes('3♥'),
        JSON.stringify(r.choices));

    r=resolveRun([C('4','♥'),C('5','♥'),C('6','♥'),J()], ['7']);
    ok('declared as the 7, the run resolves',
        r && !r.need && r.jokers[0].rank==='7', JSON.stringify(r && r.jokers));
    ok('...and it sits at the top of the run',
        r.order.map(c=>c.isJoker?'J':c.rank).join('-')==='4-5-6-J',
        r.order.map(c=>c.isJoker?'J':c.rank).join('-'));

    r=resolveRun([C('4','♥'),C('5','♥'),C('6','♥'),J()], ['3']);
    ok('declared as the 3, it caps the other end',
        r && !r.need && r.jokers[0].rank==='3' &&
        r.order.map(c=>c.isJoker?'J':c.rank).join('-')==='J-4-5-6',
        r.order.map(c=>c.isJoker?'J':c.rank).join('-'));

    r=resolveRun([C('4','♥'),C('5','♥'),C('6','♥'),J()], ['9']);
    ok('a declaration that makes no run is refused', r && r.need==='declare',
        JSON.stringify(r));

    // ── LAYING IT DOWN WRITES THE NAME ON THE CARD ──────────────────────
    function seat1(cards){
      startRound(2, 0, 12345, 4);         // 2 runs
      G.players[1].hand=cards; G.phase='meld'; G.drewThisTurn=true;
    }
    const jk=J();
    const runA=[C('4','♥'),C('5','♥'),C('6','♥'),jk];
    const runB=[C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠')];
    seat1([...runA,...runB,C('3','♣')]);
    let res=layContract(1, [runA, runB]);
    ok('laying an undeclared end joker is refused, and says so',
        res.ok===false && res.need==='declare', res.why);
    ok('...and NOTHING went down — the contract is all or nothing',
        G.players[1].melds.length===0 && G.players[1].down===false,
        G.players[1].melds.length+' melds');

    seat1([...runA,...runB,C('3','♣')]);
    res=layContract(1, [runA, runB], [['7'], null]);
    ok('declared, it goes down', res.ok, res.why);
    ok('...and the joker now carries its name',
        jk.standsFor && jk.standsFor.rank==='7' && jk.standsFor.suit==='♥',
        JSON.stringify(jk.standsFor));
    const target=runJokerTargets(G.players[1].melds[0].cards);
    ok('...which is what the table reads back',
        target.length===1 && target[0].rank==='7' && target[0].suit==='♥',
        JSON.stringify(target.map(t=>t.rank+t.suit)));

    // ── BUYING THE JOKER BACK ───────────────────────────────────────────
    const seven=C('7','♥');
    G.turn=2; G.phase='meld';
    G.players[2].hand=[seven, C('2','♣')];
    res=exchangeJoker(2, seven, 1, 0, jk);
    ok('THE EXCHANGE: the 7♥ buys the joker that stood for it', res.ok, res.why);
    ok('...the joker is in the buyer\'s hand', G.players[2].hand.includes(jk));
    ok('...the 7♥ is in the run', G.players[1].melds[0].cards.includes(seven));
    ok('...the run is still a run', isRun(G.players[1].melds[0].cards));
    ok('...and the joker is nameless again, free to be anything',
        !jk.standsFor, JSON.stringify(jk.standsFor));

    // the wrong card does not buy it
    seat1([...runA,...runB,C('3','♣')]);
    layContract(1, [runA, runB], [['7'], null]);
    const wrong=C('7','♠');
    G.turn=2; G.phase='meld'; G.players[2].hand=[wrong];
    res=exchangeJoker(2, wrong, 1, 0, jk);
    ok('the 7 of the WRONG SUIT does not buy it', res.ok===false, res.why);
    ok('...and the message names the card that would', /7♥/.test(res.why), res.why);

    // and not out of turn
    G.turn=3;
    res=exchangeJoker(2, C('7','♥'), 1, 0, jk);
    ok('you cannot exchange out of turn', res.ok===false, res.why);

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
