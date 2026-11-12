<script>
// Reading a hand as the contract when a card is wanted in two places.
//
//   "i had a contract of 2 trios and 1 run, i had 10,J,Joker,King,A, then i had
//    2 trios one of J's and one of 2's. one of the 2's was the same suit as the
//    run, and it refused to let me play the contract down."
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x).slice(0,170)+']':''));}

window.addEventListener('load',()=>setTimeout(()=>{
  document.getElementById('start-btn').click();
  setTimeout(()=>{
   try{
    const C=(r,s)=>({rank:r,suit:s,isJoker:false,id:r+s+Math.random()});
    const J=()=>({rank:'JOKER',suit:'★',isJoker:true,id:'j'+Math.random()});

    // ── HER HAND ──────────────────────────────────────────────────────────
    // A diamond run 10-J-(Q)-K-A, a trio of Js, a trio of 2s. The FOURTH Jack
    // is the J♦ in the run, and one 2 is a diamond too.
    const herHand = () => [C('10','♦'),C('J','♦'),J(),C('K','♦'),C('A','♦'),
                           C('J','♠'),C('J','♥'),C('J','♣'),
                           C('2','♦'),C('2','♠'),C('2','♥')];
    startRound(4,0,4242,4);                     // 2 trios + 1 run
    const con=contract();
    ok('the contract is 2 trios + 1 run', con.name==='2 trios + 1 run');

    let h=herHand();
    const read=readHand(h, con);
    ok('THE REPORTED CASE: the hand reads as complete', read.deficit===0,
        'deficit '+read.deficit+', naturals '+read.naturalsUsed);
    // readHand() returns a PLAN now — which ranks the trios want and which
    // windows the runs want — because naming particular cards is what broke
    // on four Jacks and again on three identical 7♥. The cards are handed out
    // in buildContract(), which is where the assertion below looks.
    ok('...and the plan wants a J trio and a diamond run',
        read.plan.trios.includes('J') &&
        read.plan.runs.some(r=>r.suit==='♦'),
        'trios '+read.plan.trios.join(',')+'   runs '+
        read.plan.runs.map(r=>r.suit+r.ranks.join('')).join(' '));

    h=herHand();
    let built=buildContract(h, con);
    ok('...so the contract can be built', !!built,
        built ? built.map(g=>g.map(c=>c.isJoker?'Jo':c.rank+c.suit).join('')).join('  ')
              : 'refused');
    ok('...with the run holding the J♦ and the joker',
        built.some(g=>isRun(g) && g.some(c=>c.rank==='J'&&c.suit==='♦')
                               && g.some(c=>c.isJoker)),
        built.map(g=>g.map(c=>c.isJoker?'Jo':c.rank+c.suit).join('')).join('  '));
    ok('...and the 2s trio intact', built.some(g=>isTrio(g) && g[0].rank==='2'));

    // ── AND THE SPARE ACE RIDES ALONG ─────────────────────────────────────
    //   "Players are allowed to place more cards on their contract trios or
    //    runs ... while placing their contract down"
    h=herHand();
    built=buildContract(h, con, true);
    const run=built.find(g=>isRun(g));
    ok('THE A♦ goes on the run as the contract is laid',
        run.some(c=>c.rank==='A'&&c.suit==='♦'),
        run.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));
    ok('...and it is still a run', isRun(run));
    ok('...and all eleven she chose are down',
        built.flat().length === h.length,
        built.flat().length+' laid of '+h.length);

    // ── THROUGH THE TABLE ─────────────────────────────────────────────────
    startRound(4,0,4242,4);
    document.getElementById('overlay').style.display='none';
    G.players[0].hand=herHand().concat([C('5','♣')]);
    G.turn=0; G.phase='meld'; render();
    selected=G.players[0].hand.slice(0,11);
    humanLayContract();
    ok('THE FIX: the table lays it down',
        G.players[0].down===true && G.players[0].melds.length===3,
        G.players[0].melds.length+' melds');
    ok('...two trios and a run, as the contract says',
        G.players[0].melds.filter(m=>m.type==='trio').length===2 &&
        G.players[0].melds.filter(m=>m.type==='run').length===1,
        G.players[0].melds.map(m=>m.type).join(','));
    ok('...and the run is in order', (()=>{
        const r=G.players[0].melds.find(m=>m.type==='run');
        return r.cards.map(c=>c.isJoker?'Jo':c.rank).join('-')==='10-J-Jo-K-A';
      })(), G.players[0].melds.find(m=>m.type==='run').cards
              .map(c=>c.isJoker?'Jo':c.rank).join('-'));

    // ── WHAT MUST STILL BE REFUSED ────────────────────────────────────────
    startRound(4,0,4242,4);
    const short=[C('J','♠'),C('J','♥'),C('J','♣'),
                 C('2','♦'),C('2','♠'),C('2','♥'),
                 C('10','♦'),C('K','♦')];               // run two cards short
    ok('a hand that really is short is still refused',
        buildContract(short, con)===null,
        'deficit '+readHand(short, con).deficit);

    // three of a rank still works, unchanged
    const plain=[C('7','♠'),C('7','♥'),C('7','♦'),
                 C('9','♠'),C('9','♥'),C('9','♦'),
                 C('4','♣'),C('5','♣'),C('6','♣'),C('7','♣')];
    ok('a plain hand with exactly three of each still builds',
        !!buildContract(plain, con),
        buildContract(plain, con) ? 'ok' : 'refused');

    // ── TWO TRIOS OF THE SAME RANK ────────────────────────────────────────
    //   "i have six 6's and 5-5-Joker, this is 3 trios but it doesn't
    //    recognize it"
    // Six of a rank is two trios, and with two decks that is an ordinary hand.
    startRound(3,0,4242,4);                       // 3 trios
    const con3=contract();
    const sixes=()=>[C('6','♠'),C('6','♥'),C('6','♦'),C('6','♣'),C('6','♠'),C('6','♥'),
                     C('5','♠'),C('5','♥'),J()];
    let h3=sixes();
    ok('the contract is 3 trios', con3.name==='3 trios');
    const r3=readHand(h3, con3);
    ok('THE REPORTED CASE: the hand reads as complete', r3.deficit===0,
        'deficit '+r3.deficit+', naturals '+r3.naturalsUsed);
    ok('...as two trios of 6s and one of 5s',
        r3.plan.trios.filter(x=>x==='6').length===2 && r3.plan.trios.includes('5'),
        JSON.stringify(r3.plan.trios));
    const b3=buildContract(h3, con3);
    ok('...and it builds', !!b3,
        b3 ? b3.map(g=>g.map(c=>c.isJoker?'Jo':c.rank+c.suit).join('')).join('  ') : 'refused');
    ok('...three groups, every one a trio',
        b3.length===3 && b3.every(isTrio),
        b3.map(g=>g.length).join(','));
    ok('...two of them 6s and one 5s with the joker',
        b3.filter(g=>trioRank(g)==='6').length===2 &&
        b3.some(g=>trioRank(g)==='5' && g.some(c=>c.isJoker)),
        b3.map(g=>trioRank(g)).join(','));
    ok('...and no card is used twice',
        new Set(b3.flat().map(c=>c.id)).size===b3.flat().length);

    // through the table
    startRound(3,0,4242,4);
    document.getElementById('overlay').style.display='none';
    G.players[0].hand=sixes().concat([C('K','♦')]);
    G.turn=0; G.phase='meld'; render();
    selected=G.players[0].hand.slice(0,9);
    humanLayContract();
    ok('THE FIX: the table lays it down',
        G.players[0].down===true && G.players[0].melds.length===3,
        G.players[0].melds.length+' melds');
    ok('...and both 6s trios are on the table',
        G.players[0].melds.filter(m=>trioRank(m.cards)==='6').length===2,
        G.players[0].melds.map(m=>trioRank(m.cards)).join(','));

    // nine of a rank is three trios
    startRound(3,0,4242,4);
    const nine=Array.from({length:9},(_,i)=>C('6',['♠','♥','♦','♣'][i%4]));
    ok('nine of a rank is three trios', !!buildContract(nine, con3),
        JSON.stringify(readHand(nine, con3).plan.trios));

    // five of a rank is still only ONE trio plus a pair
    startRound(3,0,4242,4);
    const five=[C('6','♠'),C('6','♥'),C('6','♦'),C('6','♣'),C('6','♠'),
                C('9','♠'),C('9','♥'),C('9','♦')];
    const r5=readHand(five, con3);
    ok('five of a rank is one trio and a pair, not two trios',
        r5.deficit===1, 'deficit '+r5.deficit+'  '+JSON.stringify(r5.plan.trios));

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
