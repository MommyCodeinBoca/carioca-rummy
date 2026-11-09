<script>
// Taking the discard is a draw; buying jokers; not feeding the left.
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

    // ── TAKING THE FACE-UP CARD IS A DRAW ───────────────────────────────
    //   "when i discard and west takes my discard, it then proceeds to take
    //    another card"
    startRound(0,0,4242,4);
    G.players[1].hand=[C('7','♠'),C('7','♥'),C('9','♠'),C('9','♥'),
                       C('4','♣'),C('5','♦'),C('6','♣')];
    G.players[2].hand=Array.from({length:7},()=>C('K','♣'));
    G.players[3].hand=Array.from({length:7},()=>C('Q','♣'));
    G.players[0].hand=[C('7','♦'),C('2','♦')];
    G.turn=0; G.phase='meld';
    const n0=G.players[1].hand.length;
    discardCard(0, G.players[0].hand[0]);
    const claims=aiClaimants(0,0);
    ok('West, the next player, wants the 7♦', claims.includes(1), '['+claims.join(',')+']');
    const who=resolveClaim(0, claims, 4);
    ok('...and wins it with no penalty, being closest',
        who.seat===1 && who.penalty===false, JSON.stringify(who));
    applySteal(0, claims);
    ok('THE REPORTED CASE: taking it ENDS the draw',
        G.phase==='meld', 'phase '+G.phase);
    ok('...so the turn does not draw again', aiDrawPhase(1)===null);
    ok('...and West gained exactly one card',
        G.players[1].hand.length===n0+1, n0+' -> '+G.players[1].hand.length);

    // a real steal, out of turn, still costs a penalty and does not end a draw
    startRound(0,0,4242,4);
    G.players[2].hand=[C('7','♠'),C('7','♥'),C('9','♠'),C('9','♥'),
                       C('4','♣'),C('5','♦'),C('6','♣')];
    G.players[1].hand=Array.from({length:7},()=>C('K','♣'));
    G.players[3].hand=Array.from({length:7},()=>C('Q','♣'));
    G.players[0].hand=[C('7','♦'),C('2','♦')];
    G.turn=0; G.phase='meld';
    const n2=G.players[2].hand.length;
    discardCard(0, G.players[0].hand[0]);
    applySteal(0, aiClaimants(0,0).filter(x=>x===2));
    ok('a steal from further round still pays the penalty',
        G.players[2].hand.length===n2+2, n2+' -> '+G.players[2].hand.length);
    ok('...and West still has a draw to take', G.phase==='draw');
    ok('...off the stock, because the pile is dead', G.pileDead===true);

    // ── BUYING A JOKER ──────────────────────────────────────────────────
    //   "if there is a discard that players can take and exchange with a joker
    //    on the table, they should take it"
    function jokerBoard(level){
      startRound(0,0,4242,4);
      const jk=J();
      G.players[1].melds=[{type:'trio',cards:[C('9','♠'),C('9','♥'),jk]}];
      G.players[1].down=true;
      G.players[2].hand=[C('K','♣'),C('4','♦'),C('5','♦'),
                         C('6','♦'),C('7','♦'),C('8','♦'),C('J','♣')];
      G.discard=[C('9','♦')];                 // buys that joker, helps nothing else
      G.turn=2; G.phase='draw'; G.pileDead=false;
      AI_ARM = level || null;
      return jk;
    }
    let jk=jokerBoard();
    ok('the 9♦ buys the joker on the table', !!buysAJoker(topOfDiscard()));
    ok('...and the contract does not otherwise want it',
        cardHelps(G.players[2].hand, topOfDiscard(), contract())===0,
        String(cardHelps(G.players[2].hand, topOfDiscard(), contract())));
    ok('THE REQUEST: North takes it anyway', aiWantsDiscard(2)===true);
    aiTakeTurn(2);
    ok('...and the joker is in its hand',
        G.players[2].hand.includes(jk) ||
        G.players[1].melds[0].cards.every(c=>!c.isJoker),
        G.players[1].melds[0].cards.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));

    jk=jokerBoard('nojokerbuy');
    ok('the arm turns it off', aiWantsDiscard(2)===false);
    AI_ARM=null;

    // ── NOT FEEDING THE PLAYER ON YOUR LEFT ─────────────────────────────
    //   "ai's need to be careful ... not to discard a card that the next
    //    player can take and meld onto their hand"
    function feedBoard(level){
      startRound(0,0,4242,4);
      G.players[2].melds=[{type:'trio',cards:[C('K','♠'),C('K','♥'),C('K','♦')]}];
      G.players[2].down=true;                       // North is to West's left
      G.players[1].hand=[C('K','♣'), C('4','♦'), C('9','♥')];   // a K and two spare
      G.players[1].down=false;
      G.turn=1; G.phase='meld';
      AI_ARM = level || null;
    }
    feedBoard();
    ok('the King would go straight onto North\'s trio',
        feedsNextPlayer(1, G.players[1].hand[0])===true);
    ok('...and the 9 would not', feedsNextPlayer(1, G.players[1].hand[2])===false);
    const pick=aiDiscardChoice(1);
    ok('THE REQUEST: West throws something else',
        pick.rank!=='K', 'threw the '+pick.rank+pick.suit);

    feedBoard('nocare');
    const pick2=aiDiscardChoice(1);
    ok('the arm throws the King, as before', pick2.rank==='K',
        'threw the '+pick2.rank+pick2.suit);
    AI_ARM=null;

    // and it does not tie itself in knots: if everything feeds them, play on
    feedBoard();
    G.players[1].hand=[C('K','♣'), C('K','♦')];
    ok('when every card feeds them it still throws one',
        !!aiDiscardChoice(1), aiDiscardChoice(1) ? 'ok' : 'null');

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   AI_ARM=null;
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
