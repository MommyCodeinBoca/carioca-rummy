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
    ok('...and the J trio leaves the J♦ for the run',
        read.groups.some(g=>g.kind==='trio' && g.cards[0].rank==='J' &&
                            g.cards.every(c=>c.suit!=='♦')),
        read.groups.map(g=>g.kind+':'+g.cards.map(c=>c.rank+c.suit).join('')).join('  '));

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

   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
