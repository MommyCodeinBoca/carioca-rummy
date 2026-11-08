<script>
// The Carioca rules engine: deck, contracts, trios, runs, scoring, steals.
// Every assertion traces to a line of 'Carioca Rummy Game.docx' or to one of
// her corrections to it.
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

    // ── THE DECK ────────────────────────────────────────────────────────
    const deck=buildDeck(2);
    ok('two decks and four jokers is 108 cards', deck.length===108, String(deck.length));
    ok('four of them are jokers', deck.filter(c=>c.isJoker).length===4,
        String(deck.filter(c=>c.isJoker).length));
    ok('eight of every natural rank', deck.filter(c=>c.rank==='7').length===8,
        String(deck.filter(c=>c.rank==='7').length));
    ok('every card has its own id', new Set(deck.map(c=>c.id)).size===108);
    ok('five players at the longest contract still leave a stock',
        108 - 5*13 > 0, String(108-5*13)+' left');

    // ── CARD VALUES ─────────────────────────────────────────────────────
    ok('2 to 10 are worth their face', cardPoints(C('2'))===2 && cardPoints(C('10'))===10);
    ok('J, Q and K are 10', [ 'J','Q','K' ].every(r=>cardPoints(C(r))===10));
    ok('an Ace is 15', cardPoints(C('A'))===15);
    ok('a joker is 25', cardPoints(J())===25);
    ok('a hand adds up', handPoints([C('A'),J(),C('5')])===45,
        String(handPoints([C('A'),J(),C('5')])));

    // ── THE CONTRACTS ───────────────────────────────────────────────────
    ok('there are seven contracts', CONTRACTS.length===7);
    ok('they are dealt 7 through 13',
        CONTRACTS.map(c=>c.deal).join(',')==='7,8,9,10,11,12,13',
        CONTRACTS.map(c=>c.deal).join(','));
    ok('EVERY contract deals its cards plus one to discard',
        CONTRACTS.every(contractDealCheck),
        CONTRACTS.filter(c=>!contractDealCheck(c)).map(c=>c.deal+':'+c.name).join(' '));
    // THE CORRECTION. The document said "7 cards: 3 trios", which is nine cards
    // and would need ten dealt.
    ok('THE CORRECTION: the first contract is 2 trios, not 3',
        CONTRACTS[0].trios===2 && CONTRACTS[0].runs===0, CONTRACTS[0].name);
    ok('...so it is not a duplicate of the fourth',
        CONTRACTS[0].name!==CONTRACTS[3].name,
        CONTRACTS[0].name+' vs '+CONTRACTS[3].name);
    ok('the fourth is still 3 trios', CONTRACTS[3].trios===3 && CONTRACTS[3].deal===10);
    ok('the last is 3 runs of four', CONTRACTS[6].runs===3 && CONTRACTS[6].deal===13);

    // ── TRIOS ───────────────────────────────────────────────────────────
    ok('three of a rank is a trio', isTrio([C('7','♠'),C('7','♥'),C('7','♦')]));
    ok('suits do not matter', isTrio([C('7','♠'),C('7','♠'),C('7','♠')]));
    ok('two is not enough', isTrio([C('7','♠'),C('7','♥')])===false);
    ok('a joker can complete one', isTrio([C('7','♠'),C('7','♥'),J()]));
    ok('mixed ranks are not a trio', isTrio([C('7','♠'),C('8','♥'),C('7','♦')])===false);
    ok('a trio may be extended past three',
        isTrio([C('7','♠'),C('7','♥'),C('7','♦'),C('7','♣'),J()]));
    ok('jokers alone are a trio of nothing', isTrio([J(),J(),J()])===false);
    ok('and the rank is read off the naturals',
        trioRank([J(),C('9','♥'),C('9','♦')])==='9');

    // ── RUNS ────────────────────────────────────────────────────────────
    ok('four in suit is a run', isRun([C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')]));
    ok('three is not enough', isRun([C('4','♥'),C('5','♥'),C('6','♥')])===false);
    ok('mixed suits are not a run',
        isRun([C('4','♥'),C('5','♠'),C('6','♥'),C('7','♥')])===false);
    ok('a gap is not a run',
        isRun([C('4','♥'),C('5','♥'),C('7','♥'),C('8','♥')])===false);
    ok('the order held does not matter',
        isRun([C('7','♥'),C('4','♥'),C('6','♥'),C('5','♥')]));
    ok('a joker fills a gap', isRun([C('4','♥'),C('5','♥'),J(),C('7','♥')]));
    ok('a joker extends the end', isRun([C('4','♥'),C('5','♥'),C('6','♥'),J()]));
    ok('two jokers in one run are fine',
        isRun([C('4','♥'),J(),C('6','♥'),J(),C('8','♥')]));
    ok('a repeated rank is not consecutive',
        isRun([C('4','♥'),C('5','♥'),C('5','♥'),C('6','♥')])===false);
    ok('a run may be longer than four',
        isRun([C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥'),C('8','♥')]));

    // HER RULE: the ranks are a circle.
    //   "a run can start with any card, e.g. Q-K-A-2 is a run"
    ok('HER RULE: Q-K-A-2 is a run',
        isRun([C('Q','♦'),C('K','♦'),C('A','♦'),C('2','♦')]));
    ok('...and so is K-A-2-3', isRun([C('K','♦'),C('A','♦'),C('2','♦'),C('3','♦')]));
    ok('...and A-2-3-4 still is', isRun([C('A','♦'),C('2','♦'),C('3','♦'),C('4','♦')]));
    ok('...and J-Q-K-A still is', isRun([C('J','♦'),C('Q','♦'),C('K','♦'),C('A','♦')]));
    ok('...with a joker across the seam',
        isRun([C('Q','♦'),C('K','♦'),J(),C('2','♦')]));
    ok('but it cannot lap the circle',
        isRun(RANKS.map(r=>C(r,'♥')).concat([C('A','♥')]))===false,
        '14 cards');
    ok('a full thirteen is still a run', isRun(RANKS.map(r=>C(r,'♥'))));

    // ── THE JOKER EXCHANGE ──────────────────────────────────────────────
    //   "if one of the other players has the card it was meant to replace,
    //    they can, on their turn, exchange the joker for the card"
    const gapRun=[C('4','♥'),C('5','♥'),J(),C('7','♥')];
    const t=runJokerTargets(gapRun);
    ok('a joker in a GAP names the card it stands for',
        t && t.length===1 && t[0].rank==='6' && t[0].suit==='♥',
        t ? t[0].rank+t[0].suit : String(t));
    const seam=runJokerTargets([C('Q','♦'),C('K','♦'),J(),C('2','♦')]);
    ok('...across the seam too', seam && seam[0].rank==='A' && seam[0].suit==='♦',
        seam ? seam[0].rank+seam[0].suit : String(seam));
    const endRun=runJokerTargets([C('4','♥'),C('5','♥'),C('6','♥'),J()]);
    ok('a joker on the END is ambiguous, so not exchangeable', endRun===null,
        JSON.stringify(endRun));
    ok('a run with no joker has nothing to exchange',
        runJokerTargets([C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')]).length===0);
    ok('and something that is not a run names nothing',
        runJokerTargets([C('4','♥'),C('9','♠'),J()])===null);

    // ── SCORING ─────────────────────────────────────────────────────────
    //   "the player with the least number of points wins"
    ok('melding and going out in ONE turn is -20',
        roundScore({wentOut:true, meldedThisTurn:true, hand:[]})===-20);
    ok('going out on a later turn is -10',
        roundScore({wentOut:true, meldedThisTurn:false, hand:[]})===-10);
    ok('everyone else counts their cards, against them',
        roundScore({wentOut:false, hand:[C('A'),J()]})===40,
        String(roundScore({wentOut:false, hand:[C('A'),J()]})));
    ok('an empty hand that did not go out is zero',
        roundScore({wentOut:false, hand:[]})===0);

    // ── THE STEAL ───────────────────────────────────────────────────────
    // Four seats, 0 discards. Distances: 1→1, 2→2, 3→3.
    ok('the seat to the left of the discarder is distance 1',
        seatDistance(0,1,4)===1 && seatDistance(0,3,4)===3);
    ok('...and it wraps the table', seatDistance(3,0,4)===1, String(seatDistance(3,0,4)));

    ok('the next player takes it with NO penalty',
        JSON.stringify(resolveClaim(0,[1],4))==='{"seat":1,"penalty":false}',
        JSON.stringify(resolveClaim(0,[1],4)));
    ok('a further seat takes it WITH a penalty',
        JSON.stringify(resolveClaim(0,[2],4))==='{"seat":2,"penalty":true}',
        JSON.stringify(resolveClaim(0,[2],4)));
    ok('THE CONTEST: the closest to the discarder wins',
        resolveClaim(0,[3,2],4).seat===2, JSON.stringify(resolveClaim(0,[3,2],4)));
    ok('...and the order the claims arrive in does not matter',
        resolveClaim(0,[2,3],4).seat===resolveClaim(0,[3,2],4).seat);
    ok('...so the next player always beats a steal',
        resolveClaim(0,[1,2,3],4).seat===1 &&
        resolveClaim(0,[1,2,3],4).penalty===false,
        JSON.stringify(resolveClaim(0,[1,2,3],4)));
    ok('nobody wants it, nobody gets it', resolveClaim(0,[],4)===null);
    ok('the discarder cannot claim their own card', resolveClaim(0,[0],4)===null,
        JSON.stringify(resolveClaim(0,[0],4)));

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
