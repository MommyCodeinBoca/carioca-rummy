<script>
// The plan and the rules must agree about jokers.
//
// A contract the planner calls READY and the validator then refuses is the
// worst bug this game has had, twice:
//   "it refused to let me play the contract"
// v1.9 added two joker rules, and each of them can make a group the planner
// was happy to build illegal:
//   "a trio can only have one joker yes correct if only 3"
//   "Jokers cannot be next to each other."
// readable.js builds thousands of hands but never puts a joker in one.
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x)+']':''));}
const C=(r,s)=>({rank:r,suit:s||'♥',isJoker:false,id:r+(s||'')+Math.random()});
const J=()=>({rank:'Jo',suit:'★',isJoker:true,id:'j'+Math.random()});

window.addEventListener('load',()=>setTimeout(()=>{
  try{
    const twoTrios = CONTRACTS[0];                 // 2 trios
    const twoRuns  = CONTRACTS.find(c=>c.runs===2 && c.trios===0);
    ok('found the contracts to test with',
       twoTrios.trios===2 && !!twoRuns, twoTrios.name+' / '+(twoRuns||{}).name);

    // ── ONE JOKER IN A TRIO IS FINE, END TO END ────────────────────────
    let hand=[C('9','♠'),C('9','♥'),J(), C('K','♠'),C('K','♥'),C('K','♦'), C('2','♦')];
    let plan=readHand(hand, twoTrios);
    ok('a trio of two 9s and a joker is read as ready', plan.deficit===0,
       'deficit '+plan.deficit);
    let groups=buildContract(hand, twoTrios);
    ok('...and the cards are handed out', !!groups,
       groups ? groups.length+' groups' : 'null');
    if (!groups) throw new Error('buildContract returned null for a legal hand');
    startRound(0,0,4242,4);
    G.players[0].hand=hand; G.turn=0; G.phase='meld'; G.roundOver=false;
    let res=layContract(0, groups, groups.map(()=>null));
    ok('...AND IT LAYS — plan and rules agree', res.ok===true, res.why||'ok');

    // ── TWO JOKERS IN A TRIO OF THREE IS NOT ───────────────────────────
    ok('isTrio refuses one natural and two jokers',
       isTrio([C('9','♠'),J(),J()])===false);
    ok('...and still takes two naturals and a joker',
       isTrio([C('9','♠'),C('9','♥'),J()])===true);
    ok('...while a GROWN trio is not limited here',
       isTrio([C('9','♠'),C('9','♥'),J(),J()])===true);

    // the planner must not promise it
    hand=[C('9','♠'),J(),J(), C('K','♠'),C('K','♥'),C('K','♦'), C('2','♦')];
    plan=readHand(hand, twoTrios);
    ok('THE INVARIANT: a hand needing a two-joker trio is NOT called ready',
       plan.deficit>0, 'deficit '+plan.deficit);
    groups=buildContract(hand, twoTrios);
    ok('...and no cards are handed out for it', !groups,
       groups ? JSON.stringify(groups.map(g=>g.cards.length)) : 'null');

    // ── A JOKER IN A RUN IS FINE ───────────────────────────────────────
    hand=[C('4','♥'),C('5','♥'),C('6','♥'),J(),
          C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠'), C('2','♦')];
    plan=readHand(hand, twoRuns);
    ok('a run of three hearts and a joker is read as ready', plan.deficit===0,
       'deficit '+plan.deficit);
    groups=buildContract(hand, twoRuns);
    ok('...and the cards are handed out', !!groups);
    startRound(CONTRACTS.indexOf(twoRuns),0,4242,4);
    G.players[0].hand=hand; G.turn=0; G.phase='meld'; G.roundOver=false;
    res=layContract(0, groups, groups.map(g=>{
      if (isTrio(g)) return null;
      const r=resolveRun(g);
      return (r && r.need) ? r.choices[r.choices.length-1] : null;
    }));
    ok('...AND IT LAYS', res.ok===true, res.why||'ok');

    // ── TWO JOKERS SIDE BY SIDE IN A RUN IS NOT ────────────────────────
    ok('isRun refuses a double gap',
       isRun([C('4','♥'),C('7','♥'),J(),J()])===false);
    hand=[C('4','♥'),C('7','♥'),J(),J(),
          C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠'), C('2','♦')];
    plan=readHand(hand, twoRuns);
    ok('THE INVARIANT: a hand needing two touching jokers is NOT called ready',
       plan.deficit>0, 'deficit '+plan.deficit);
    groups=buildContract(hand, twoRuns);
    ok('...and no cards are handed out for it', !groups);

    // ── AND THE SAME HAND WITH THE GAPS APART IS FINE ──────────────────
    // two gaps, 5 and 7, with the 6 between them — two jokers that never touch
    hand=[C('4','♥'),C('6','♥'),C('8','♥'),J(),J(),
          C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠'), C('2','♦')];
    plan=readHand(hand, twoRuns);
    ok('gaps that do not touch are still a run', plan.deficit===0,
       'deficit '+plan.deficit);

    // ── THE GENERATOR, WITH JOKERS IN IT ───────────────────────────────
    // Every hand here contains a LEGAL contract by construction: one joker per
    // trio, and never two jokers in a row in a run.
    let rnd=(s=>()=>((s=(s*1103515245+12345)&0x7fffffff)/0x7fffffff))(99);
    const pack=()=>{ const d=[]; SUITS.forEach(s=>RANKS.forEach(r=>{d.push(C(r,s));d.push(C(r,s));})); return d; };
    let tried=0, refused=0, example='';
    for (let ci=0; ci<CONTRACTS.length; ci++){
      const con=CONTRACTS[ci];
      for (let n=0; n<120; n++){
        const deck=pack();
        const take=(f)=>{ const i=deck.findIndex(f); return i<0?null:deck.splice(i,1)[0]; };
        const gs=[]; let bad=false;
        for (let t=0;t<con.trios && !bad;t++){
          const r=RANKS[Math.floor(rnd()*RANKS.length)];
          const a=take(c=>c.rank===r), b=take(c=>c.rank===r);
          if(!a||!b){bad=true;break;}
          gs.push([a,b,J()]);                       // exactly one joker
        }
        for (let q=0;q<con.runs && !bad;q++){
          const suit=SUITS[Math.floor(rnd()*4)];
          const st=Math.floor(rnd()*RANKS.length);
          const want=[0,1,2,3].map(k=>RANKS[(st+k)%RANKS.length]);
          // one joker, never two, so it can never touch another
          const jat=Math.floor(rnd()*4);
          const cards=[];
          for (let k=0;k<4;k++){
            if (k===jat) { cards.push(J()); continue; }
            const c=take(x=>x.rank===want[k]&&x.suit===suit);
            if(!c){bad=true;break;}
            cards.push(c);
          }
          if(bad) break;
          gs.push(cards);
        }
        if (bad) continue;
        let h=gs.flat();
        for (let i=h.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1)); [h[i],h[j]]=[h[j],h[i]]; }
        tried++;
        if (!buildContract(h, con)) {
          refused++;
          if (!example) example=con.name+'  '+h.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' ');
        }
      }
    }
    ok('EVERY joker hand built to contain its contract is read as one',
       refused===0, 'refused '+refused+' of '+tried+(example?'  e.g. '+example:''));
    ok('...and enough were tried to mean something', tried>500, String(tried));

  }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
  ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
  const pre=document.createElement('pre'); pre.id='results';
  pre.textContent=R.join('\n'); document.body.appendChild(pre);
},400));
</script>
