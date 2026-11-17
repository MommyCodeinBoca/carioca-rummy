<script>
// Laying onto ANYBODY's melds, not just your own.
//
//   "After a player melds his contract, if they have cards of the same value as
//    a trio or cards that fit into the sequence of a run on other player's
//    melded cards, they can place them there."
//
// The placement rules do not change — a trio takes its rank, a run takes what
// continues its sequence, and the run is re-read into order afterwards. What
// changes is whose melds are reachable.
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function flat(x){ return String(x).replace(/\s+/g,' ').trim(); }
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+flat(x)+']':''));}
const C=(r,s)=>({rank:r,suit:s||'♥',isJoker:false,id:r+(s||'')+Math.random()});
const J=()=>({rank:'Jo',suit:'★',isJoker:true,id:'j'+Math.random()});

window.addEventListener('load',()=>setTimeout(()=>{
  try{
    // West is down with a trio of 9s and a run 4♥-5♥-6♥-7♥.
    // I am seat 0 and down with a trio of Kings.
    function board(){
      startRound(0,0,4242,4);
      G.players[1].melds=[{type:'trio',cards:[C('9','♠'),C('9','♥'),C('9','♦')]},
                          {type:'run', cards:[C('4','♥'),C('5','♥'),C('6','♥'),C('7','♥')]}];
      G.players[1].down=true;
      G.players[0].melds=[{type:'trio',cards:[C('K','♠'),C('K','♥'),C('K','♦')]}];
      G.players[0].down=true;
      G.turn=0; G.phase='meld'; G.roundOver=false;
    }
    const westRun=()=>G.players[1].melds[1].cards
      .map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' ');
    const westTrio=()=>G.players[1].melds[0].cards.length;

    // ── A TRIO OF SOMEBODY ELSE'S ───────────────────────────────────────
    board();
    const nine=C('9','♣');
    G.players[0].hand=[nine, C('2','♦')];
    let res=layOff(0,[nine],0,undefined,1);
    ok('THE REQUEST: a 9 goes onto West\'s trio of 9s', res.ok===true, res.why||'ok');
    ok('...the trio has four cards now', westTrio()===4, String(westTrio()));
    ok('...and it left my hand', !G.players[0].hand.includes(nine));

    // ── A RUN OF SOMEBODY ELSE'S, AT EITHER END ─────────────────────────
    board();
    const three=C('3','♥');
    G.players[0].hand=[three, C('2','♦')];
    res=layOff(0,[three],1,undefined,1);
    ok('a 3♥ extends West\'s run at the bottom', res.ok===true, res.why||'ok');
    ok('...and the run is still in sequence', westRun()==='3♥ 4♥ 5♥ 6♥ 7♥', westRun());

    board();
    const eight=C('8','♥');
    G.players[0].hand=[eight, C('2','♦')];
    res=layOff(0,[eight],1,undefined,1);
    ok('an 8♥ extends it at the top', res.ok===true, res.why||'ok');
    ok('...still in sequence', westRun()==='4♥ 5♥ 6♥ 7♥ 8♥', westRun());

    // ── AND ONLY WHERE IT ACTUALLY FITS ─────────────────────────────────
    board();
    const wrong=C('8','♠');
    G.players[0].hand=[wrong, C('2','♦')];
    res=layOff(0,[wrong],1,undefined,1);
    ok('the 8 of the WRONG SUIT does not extend the run', res.ok===false, res.why);
    ok('...and the run is untouched', westRun()==='4♥ 5♥ 6♥ 7♥', westRun());

    board();
    const ten=C('10','♥');
    G.players[0].hand=[ten, C('2','♦')];
    res=layOff(0,[ten],1,undefined,1);
    ok('a card that does not touch the sequence is refused', res.ok===false, res.why);

    board();
    const king=C('K','♣');
    G.players[0].hand=[king, C('2','♦')];
    res=layOff(0,[king],0,undefined,1);
    ok('a King does not go on a trio of 9s', res.ok===false, res.why);

    // ── MY OWN CONTRACT COMES FIRST ─────────────────────────────────────
    board();
    G.players[0].down=false; G.players[0].melds=[];
    const n2=C('9','♣');
    G.players[0].hand=[n2, C('2','♦')];
    res=layOff(0,[n2],0,undefined,1);
    ok('I cannot lay on anybody until my own contract is down',
       res.ok===false, res.why);
    ok('...and it says so', /contract/.test(res.why||''), res.why);

    // ── NOR ONTO A PLAYER WHO IS NOT DOWN ───────────────────────────────
    board();
    G.players[2].melds=[{type:'trio',cards:[C('5','♠'),C('5','♥'),C('5','♦')]}];
    G.players[2].down=false;
    const five=C('5','♣');
    G.players[0].hand=[five, C('2','♦')];
    res=layOff(0,[five],0,undefined,2);
    ok('nothing can be laid on a player who has not laid their contract',
       res.ok===false, res.why);

    // ── THE TURN STILL HAS TO END WITH A DISCARD ────────────────────────
    board();
    const last=C('9','♣');
    G.players[0].hand=[last];
    res=layOff(0,[last],0,undefined,1);
    ok('the last card cannot be laid off — it is the discard',
       res.ok===false, res.why);

    // ── MY OWN MELDS STILL WORK, WITH AND WITHOUT THE OWNER ─────────────
    board();
    const myK=C('K','♣');
    G.players[0].hand=[myK, C('2','♦')];
    res=layOff(0,[myK],0);
    ok('my own melds still take a card with no owner given',
       res.ok===true, res.why||'ok');
    ok('...and my trio grew', G.players[0].melds[0].cards.length===4);

    board();
    const myK2=C('K','♣');
    G.players[0].hand=[myK2, C('2','♦')];
    res=layOff(0,[myK2],0,undefined,0);
    ok('...and the same naming myself as the owner', res.ok===true, res.why||'ok');

    // ── A JOKER ONTO SOMEBODY ELSE'S RUN, NAMED ─────────────────────────
    board();
    const jj=J();
    G.players[0].hand=[jj, C('2','♦')];
    res=layOff(0,[jj],1,undefined,1);
    ok('a joker on West\'s run asks which end', res.need==='declare',
       JSON.stringify(res.choices||null));
    res=layOff(0,[jj],1,res.choices.find(ch=>/8♥/.test(ch.join())),1);
    ok('...and takes the answer', res.ok===true, res.why||'ok');
    ok('...landing at the top', westRun()==='4♥ 5♥ 6♥ 7♥ Jo', westRun());
    ok('...standing for the 8♥',
       jj.standsFor && jj.standsFor.rank==='8' && jj.standsFor.suit==='♥',
       JSON.stringify(jj.standsFor));
    // ...and West can buy it straight back, which is the point of naming it
    G.turn=1; G.phase='meld';
    const buy=C('8','♥');
    G.players[1].hand=[buy, C('2','♣')];
    ok('...so its owner can buy it back', exchangeJoker(1, buy, 1, 1, jj).ok===true);

    // ── THE AI PLAYS THE WHOLE TABLE TOO ────────────────────────────────
    board();
    G.turn=2; G.phase='meld';
    G.players[2].melds=[{type:'trio',cards:[C('Q','♠'),C('Q','♥'),C('Q','♦')]}];
    G.players[2].down=true;
    const aiNine=C('9','♣');
    G.players[2].hand=[aiNine, C('2','♦'), C('7','♠')];
    const grew = aiLayOff(2);
    ok('the AI lays onto another seat\'s meld', grew===true);
    ok('...the 9♣ going onto West\'s trio',
       G.players[1].melds[0].cards.includes(aiNine), westTrio()+' cards');

    // and it prefers its OWN meld when a card fits both
    board();
    G.turn=2; G.phase='meld';
    G.players[2].melds=[{type:'trio',cards:[C('9','♣'),C('9','♠'),C('9','♥')]}];
    G.players[2].down=true;
    const bothNine=C('9','♦');
    G.players[2].hand=[bothNine, C('2','♦'), C('7','♠')];
    aiLayOff(2);
    ok('...but its own meld first when a card fits both',
       G.players[2].melds[0].cards.includes(bothNine),
       G.players[1].melds[0].cards.includes(bothNine) ? 'went to West' : 'kept');

  }catch(e){ R.push('FAIL — THREW: '+flat(e.message+' @ '+(e.stack||'').split('\n')[1])); }
  ok('no uncaught JS errors', errs.length===0, errs.slice(0,3).join(' | '));
  const pre=document.createElement('pre'); pre.id='results';
  pre.textContent=R.join('\n'); document.body.appendChild(pre);
},400));
</script>
