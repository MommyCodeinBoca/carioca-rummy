<script>
// A hand that CONTAINS its contract must be readable as that contract.
//
// Fixtures test the hands somebody thought of. This builds thousands nobody
// thought of — two trios and a run dealt out of a real two-deck pack, plus
// noise of the same ranks, shuffled — and asks the game to find what is
// provably in there.
//
// It is how the second half of her bug was found. After the four-Jacks fix
// this still refused 262 hands of 2,800, all of them the same shape: two
// identical cards, one named by a run candidate and one by a trio candidate,
// with no way to swap the twin in.
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x).slice(0,200)+']':''));}

window.addEventListener('load',()=>setTimeout(()=>{
  document.getElementById('start-btn').click();
  setTimeout(()=>{
   try{
  // Build hands that CONTAIN a valid contract by construction, then ask the
  // game to find it. Anything it cannot find is a hole.
  let x=12345; const rnd=()=>{x^=x<<13;x>>>=0;x^=x>>17;x^=x<<5;x>>>=0;return x/4294967296;};
  const pick=a=>a[Math.floor(rnd()*a.length)];
  const deck=buildDeck(2);
  const nat=deck.filter(c=>!c.isJoker), joks=deck.filter(c=>c.isJoker);
  const mkTrio=()=>{ const r=pick(RANKS);
    const pool=nat.filter(c=>c.rank===r); return [pool[0],pool[1],pool[2]]
      .map(c=>({...c,id:'t'+rnd()})); };
  const mkRun=(len)=>{ const s=pick(SUITS); const st=Math.floor(rnd()*13);
    return Array.from({length:len},(_,k)=>({rank:RANKS[(st+k)%13],suit:s,
      isJoker:false,id:'r'+rnd()})); };

  let fails=0, tried=0; const examples=[];
  for (let ci=0; ci<CONTRACTS.length; ci++){
    const con=CONTRACTS[ci];
    for (let n=0; n<400; n++){
      tried++;
      const groups=[];
      for (let t=0;t<con.trios;t++) groups.push(mkTrio());
      for (let r=0;r<con.runs;r++) groups.push(mkRun(4));
      let hand=groups.flat();
      // ids are unique but two cards can be the same rank+suit, which is legal
      if (new Set(hand.map(c=>c.rank+c.suit)).size < hand.length - 2) continue;
      // noise: a few spare cards, often the SAME ranks, which is the shape
      // that broke her hand
      const noise=[];
      for (let k=0;k<3;k++){
        const g=pick(groups);
        const src=pick(g);
        noise.push({rank:src.rank, suit:pick(SUITS), isJoker:false, id:'n'+rnd()});
      }
      hand=hand.concat(noise);
      // shuffle the hand, since order is what broke it
      for (let i=hand.length-1;i>0;i--){ const j=Math.floor(rnd()*(i+1));
        [hand[i],hand[j]]=[hand[j],hand[i]]; }
      if (!buildContract(hand, con)){
        fails++;
        if (examples.length<4) examples.push(con.name+'   '+
          hand.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));
      }
    }
  }

    ok('EVERY hand built to contain its contract can be read as one',
        fails===0, 'refused '+fails+' of '+tried +
        (examples.length ? '  e.g. '+examples[0] : ''));
    ok('...and enough hands were tried to mean something', tried > 2000,
        String(tried));
   }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
   ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
   const pre=document.createElement('pre'); pre.id='results';
   pre.textContent=R.join('\n'); document.body.appendChild(pre);
  },300);
},100));
</script>
