<script>
// Dealing, drawing, laying the contract, laying off, and going out.
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

    // ── THE DEAL ────────────────────────────────────────────────────────
    startRound(0, 0, 12345, 4);
    ok('the first contract deals seven each',
        G.players.every(p=>p.hand.length===7),
        G.players.map(p=>p.hand.length).join(','));
    ok('one card is turned face up', G.discard.length===1);
    ok('the rest is the stock', G.stock.length===108-4*7-1,
        G.stock.length+' vs '+(108-28-1));
    ok('every card is accounted for',
        G.players.reduce((s,p)=>s+p.hand.length,0)+G.stock.length+G.discard.length===108);
    ok('THE DEALER DOES NOT START: the seat to their left does',
        G.turn===1, 'dealer 0, turn '+G.turn);
    ok('and the turn begins with a draw', G.phase==='draw');

    startRound(6, 2, 999, 4);
    ok('the last contract deals thirteen each',
        G.players.every(p=>p.hand.length===13));
    ok('...and the seat left of dealer 2 starts', G.turn===3, String(G.turn));

    // the deal is reproducible from its seed
    startRound(0, 0, 777, 4);
    const a=G.players[1].hand.map(c=>c.id).join(',');
    startRound(0, 0, 777, 4);
    ok('the same seed deals the same cards', G.players[1].hand.map(c=>c.id).join(',')===a);
    startRound(0, 0, 778, 4);
    ok('a different seed does not', G.players[1].hand.map(c=>c.id).join(',')!==a);

    // ── DRAWING ─────────────────────────────────────────────────────────
    startRound(0, 0, 12345, 4);
    const before=G.stock.length;
    ok('you cannot draw out of turn', drawFromStock(2)===null);
    drawFromStock(1);
    ok('drawing from stock takes one card',
        G.players[1].hand.length===8 && G.stock.length===before-1);
    ok('...and moves the turn to melding', G.phase==='meld');
    ok('you cannot draw twice', drawFromStock(1)===null);

    startRound(0, 0, 12345, 4);
    const face=topOfDiscard();
    takeDiscard(1);
    ok('taking the face-up card works the same way',
        G.players[1].hand.includes(face) && G.discard.length===0);

    // ── THE STEAL ───────────────────────────────────────────────────────
    startRound(0, 0, 12345, 4);
    const stolen=topOfDiscard();
    const claim=applySteal(0, [2]);
    ok('seat 2 steals the card', claim.seat===2 && claim.penalty===true);
    ok('...and takes it into hand', G.players[2].hand.includes(stolen));
    ok('...plus a penalty card, so two more in hand', G.players[2].hand.length===9,
        String(G.players[2].hand.length));
    ok('THE RULE: the turn is still seat 1', G.turn===1, String(G.turn));
    ok('...and the pile is dead for that turn', G.pileDead===true);
    ok('...so seat 1 must draw from the stock', takeDiscard(1)===null);
    ok('...which they can', !!drawFromStock(1));

    // a steal by the next player is no steal at all
    startRound(0, 0, 12345, 4);
    const c2=applySteal(0,[1]);
    ok('the next player taking it pays no penalty', c2.penalty===false);
    ok('...and takes only the one card', G.players[1].hand.length===8,
        String(G.players[1].hand.length));
    ok('...and the pile is not dead', G.pileDead===false);

    // ── LAYING THE CONTRACT ─────────────────────────────────────────────
    //   "Players can only complete the contract as defined."
    function seat1(cards){
      startRound(0, 0, 12345, 4);
      G.players[1].hand=cards; G.phase='meld'; G.drewThisTurn=true;
    }
    const twoTrios=[[C('7','♠'),C('7','♥'),C('7','♦')],
                    [C('9','♠'),C('9','♥'),J()]];
    seat1([...twoTrios[0],...twoTrios[1],C('3','♣')]);
    let res=layContract(1, twoTrios);
    ok('two trios complete the first contract', res.ok, res.why);
    ok('...they leave the hand', G.players[1].hand.length===1,
        G.players[1].hand.map(c=>c.rank).join(','));
    ok('...and the player is down', G.players[1].down===true);

    seat1([...twoTrios[0],...twoTrios[1],C('3','♣')]);
    res=layContract(1, [twoTrios[0]]);
    ok('ONE trio is not the contract', res.ok===false, res.why);

    seat1([C('7','♠'),C('7','♥'),C('7','♦'),C('9','♠'),C('9','♥'),C('9','♦'),
           C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')]);
    res=layContract(1, [[G.players[1].hand[0],G.players[1].hand[1],G.players[1].hand[2]],
                        [G.players[1].hand[3],G.players[1].hand[4],G.players[1].hand[5]],
                        [G.players[1].hand[6],G.players[1].hand[7],
                         G.players[1].hand[8],G.players[1].hand[9]]]);
    ok('a run as well is MORE than the contract, so refused', res.ok===false, res.why);

    // the third contract is two runs
    startRound(2, 0, 12345, 4);
    const run1=[C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')];
    const run2=[C('Q','♦'),C('K','♦'),C('A','♦'),C('2','♦')];   // across the seam
    G.players[1].hand=[...run1,...run2,C('8','♣')];
    G.phase='meld';
    res=layContract(1, [run1, run2]);
    ok('two runs complete the third contract, seam and all', res.ok, res.why);

    // ── LAYING OFF ──────────────────────────────────────────────────────
    seat1([...twoTrios[0],...twoTrios[1],C('7','♣')]);
    layContract(1, twoTrios);
    const spare=G.players[1].hand[0];
    res=layOff(1, [spare], 0);
    ok('a fourth 7 goes onto your own trio', res.ok, res.why);
    ok('...and the hand is empty', G.players[1].hand.length===0);

    seat1([...twoTrios[0],...twoTrios[1],C('3','♣')]);
    layContract(1, twoTrios);
    res=layOff(1, [G.players[1].hand[0]], 0);
    ok('a 3 does not go onto a trio of 7s', res.ok===false, res.why);

    // not onto anyone else's
    seat1([...twoTrios[0],...twoTrios[1],C('7','♣')]);
    layContract(1, twoTrios);
    G.players[2].melds=[{type:'trio',cards:[C('7','♠'),C('7','♥'),C('7','♦')]}];
    res=layOff(1, [G.players[1].hand[0]], 0);
    ok('you lay off only on your OWN melds — index is yours', res.ok===true, res.why);
    ok('...and the other player\'s meld is untouched',
        G.players[2].melds[0].cards.length===3);

    // ── GOING OUT ───────────────────────────────────────────────────────
    //   -20 for laying the contract and shedding everything in one turn
    seat1([...twoTrios[0],...twoTrios[1],C('7','♣')]);
    layContract(1, twoTrios);
    layOff(1, [G.players[1].hand[0]], 0);
    res=finishTurn(1);
    ok('emptying your hand ends the round', res.ok && res.wentOut===true, JSON.stringify(res));
    ok('...and that is worth -20', scoreRound()[1]===-20, String(scoreRound()[1]));
    ok('...while the others count their cards against them',
        scoreRound()[2]>0 && scoreRound()[3]>0, scoreRound().join(','));

    //   the last card thrown to the PILE is going out too, and still -20
    seat1([...twoTrios[0],...twoTrios[1],C('3','♣')]);
    layContract(1, twoTrios);
    res=discardCard(1, G.players[1].hand[0]);
    ok('throwing your last card to the pile also goes out',
        res.ok && res.wentOut===true, JSON.stringify(res));
    ok('...and on the same turn as the contract that is -20',
        scoreRound()[1]===-20, String(scoreRound()[1]));

    //   -10 for going out on a LATER turn
    seat1([...twoTrios[0],...twoTrios[1],C('3','♣'),C('8','♦')]);
    layContract(1, twoTrios);
    ok('two spares left, so the contract cannot go out this turn',
        G.players[1].hand.length===2, String(G.players[1].hand.length));
    discardCard(1, G.players[1].hand[0]);
    ok('discarding passes the turn on', G.turn===2 && !G.players[1].wentOut,
        'turn '+G.turn);
    ok('THE RESET: laying the contract is no longer "this turn"',
        G.players[1].meldedThisTurn===false);
    // back round to them
    G.turn=1; G.phase='meld';
    res=discardCard(1, G.players[1].hand[0]);
    ok('going out on a later turn still goes out', res.wentOut===true);
    ok('...but it is worth -10, not -20', scoreRound()[1]===-10,
        String(scoreRound()[1]));

    // a player who never went down scores their cards
    startRound(0, 0, 12345, 4);
    ok('a hand that never went down counts against its owner',
        roundScore(G.players[3])===handPoints(G.players[3].hand),
        String(roundScore(G.players[3])));

    // ── THE STOCK RUNNING OUT ───────────────────────────────────────────
    startRound(0, 0, 12345, 4);
    G.stock=[]; G.discard=[C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')];
    const top=topOfDiscard();
    ok('an empty stock is refilled from the discards', refillStockIfEmpty()===true);
    ok('...and the face-up card stays where it was',
        topOfDiscard()===top && G.discard.length===1, String(G.discard.length));
    ok('...with the rest shuffled back', G.stock.length===3, String(G.stock.length));

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
