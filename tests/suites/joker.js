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
    //
    // THE CONTRACT COMES FIRST:
    //   "Players have to meld their contract before stealing a joker."
    const seven=C('7','♥');
    G.turn=2; G.phase='meld';
    G.players[2].hand=[seven, C('2','♣')];
    G.players[2].down=false;
    res=exchangeJoker(2, seven, 1, 0, jk);
    ok('NOT before my contract is down', res.ok===false, res.why);
    ok('...and it says why', /contract/.test(res.why||''), res.why);
    ok('...and the joker is still on the table', !G.players[2].hand.includes(jk));

    G.players[2].down=true;
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
    G.turn=2; G.phase='meld'; G.players[2].hand=[wrong]; G.players[2].down=true;
    res=exchangeJoker(2, wrong, 1, 0, jk);
    ok('the 7 of the WRONG SUIT does not buy it', res.ok===false, res.why);
    ok('...and the message names the card that would', /7♥/.test(res.why), res.why);

    // and not out of turn
    G.turn=3;
    res=exchangeJoker(2, C('7','♥'), 1, 0, jk);
    ok('you cannot exchange out of turn', res.ok===false, res.why);

    // ── A DECLARATION MAY BE WRITTEN EITHER WAY ─────────────────────────
    // resolveRun() hands back choices as "7♥" and every caller passed that
    // straight back in, where RANKS.indexOf("7♥") is -1. The declaration
    // matched no gap, the run asked to be declared again, and layContract()
    // refused — so NO run with a joker on its end could be laid by anybody.
    const endJ=J();
    const endCards=[C('4','♥'),C('5','♥'),C('6','♥'),endJ];
    const asked=resolveRun(endCards);
    ok('the choices are offered with their suit',
        /♥/.test(JSON.stringify(asked.choices)), JSON.stringify(asked.choices));
    ok('THE BUG: a declaration in that same form now resolves',
        !resolveRun(endCards, asked.choices[asked.choices.length-1]).need,
        JSON.stringify(asked.choices[asked.choices.length-1]));
    ok('...and the bare rank still does',
        !resolveRun(endCards, ['7']).need);
    ok('...and a 10 is not read as a 1',
        declaredRankIndex('10♦')===RANKS.indexOf('10'),
        String(declaredRankIndex('10♦')));
    ok('...while nonsense still asks again',
        !!resolveRun(endCards, ['Z']).need);

    // and the whole way through: the AI can lay such a run
    startRound(2, 0, 12345, 4);
    const aj=J();
    G.players[2].hand=[C('4','♥'),C('5','♥'),C('6','♥'),aj,
                       C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠'),C('3','♣')];
    G.turn=2; G.phase='meld';
    ok('THE EFFECT: the AI can lay a run capped by a joker',
        aiLayContract(2)===true && G.players[2].melds.length===2,
        G.players[2].melds.length+' melds');
    ok('...and the joker was named, so it can be bought back',
        !!aj.standsFor, JSON.stringify(aj.standsFor));

    // ── TWO JOKERS, ONE AFTER THE OTHER ─────────────────────────────────
    //   "i had 2 jokers which i had exchanged and i was going to place them
    //    one after the other but it didn't let me, i only placed one then it
    //    wouldn't let me place the next one behind it"
    function twoJokerBoard(){
      startRound(2, 0, 4242, 4);
      const a=J(), b=J();
      G.players[0].melds=[{type:'run',
        cards:[C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')]}];
      G.players[0].down=true;
      G.players[0].hand=[a, b, C('2','♦')];
      G.turn=0; G.phase='meld';
      return [a,b];
    }
    const [ja,jb]=twoJokerBoard();
    const seq=()=>G.players[0].melds[0].cards.map(c=>c.isJoker?'Jo':c.rank).join('-');
    res=layOff(0,[ja],0);
    ok('the first joker asks which end', res.need==='declare');
    res=layOff(0,[ja],0,res.choices.find(ch=>/3♥/.test(ch.join())));
    ok('...and goes on the front', res.ok && seq()==='Jo-4-5-6-7', seq());
    ok('...standing for the 3♥',
        ja.standsFor && ja.standsFor.rank==='3', JSON.stringify(ja.standsFor));

    // v1.9 REVERSES THE SECOND HALF OF THIS.
    //
    //   "Jokers cannot be next to each other."
    //
    // Jo-Jo-4-5-6-7 was the answer this suite used to pin, and it is now an
    // illegal run. Her original report stands as a report — the game DID refuse
    // the second joker — but it refused for the wrong reason, through a
    // declaration loop that could never be satisfied, and said nothing about
    // why. The refusal is now the rule, stated.
    // The second joker still goes down — just not beside the first. With
    // Jo-4-5-6-7 on the table the front is now closed to it, so the far end is
    // the ONLY arrangement left and it is placed there without being asked.
    // That is the right answer to her report: the card is playable, and the
    // game no longer poses a question with no good answer.
    res=layOff(0,[jb],0);
    ok('THE REPORTED CASE: the second joker is placed, not refused',
        res.ok===true, res.why||'ok');
    ok('...at the far end, with the run between them', seq()==='Jo-4-5-6-7-Jo', seq());
    ok('...and it was not asked, there being one legal spot',
        res.need!=='declare');
    ok('...and it is still a run', isRun(G.players[0].melds[0].cards));
    ok('...so a 3♥ can still buy one',
        G.players[0].melds[0].cards.some(c=>c.isJoker &&
          cardBuysJoker(C('3','♥'), jokerStandsFor(G.players[0].melds[0], c))));

    // ── AND WHEN NO ARRANGEMENT KEEPS THEM APART, IT SAYS SO ────────────
    // 4-5-6-7 plus the 10 leaves 8 and 9 to be filled, and they touch. There
    // is no other window: the naturals span 4 to 10 exactly.
    twoJokerBoard();
    const p1=J(), p2=J(), ten=C('10','♥');
    G.players[0].hand=[p1, p2, ten, C('2','♦')];
    res=layOff(0,[p1,p2,ten],0);
    ok('two jokers that could only land together are refused',
        res.ok===false, res.why);
    ok('...and the refusal names the rule', /next to each other/.test(res.why||''),
        res.why);
    ok('...rather than asking an impossible question', res.need!=='declare');

    // the rule, asked of isRun directly
    ok('isRun: a double gap is not a run',
        isRun([C('4','♥'),C('5','♥'),J(),J(),C('8','♥'),C('9','♥')])===false);
    ok('isRun: single gaps apart from each other are fine',
        isRun([C('4','♥'),J(),C('6','♥'),J(),C('8','♥')])===true);

    // and when only one arrangement survives, it is not asked at all
    twoJokerBoard();
    G.players[0].melds=[{type:'run',cards:[C('A','♥'),C('2','♥'),C('3','♥'),
                                           C('4','♥'),C('5','♥'),C('6','♥'),
                                           C('7','♥'),C('8','♥'),C('9','♥'),
                                           C('10','♥'),C('J','♥'),C('Q','♥')]}];
    G.players[0].down=true;
    const solo=J();
    G.players[0].hand=[solo, C('2','♦')];
    res=layOff(0,[solo],0);
    ok('a run with one slot left is not asked about', res.ok===true, res.why||'ok');

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
