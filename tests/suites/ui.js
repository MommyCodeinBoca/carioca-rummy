<script>
// Does the drag reorder the hand, do the markers appear, do the sorts sort?
const R=[]; const errs=[];
window.addEventListener('error',e=>errs.push(e.message+' @'+e.lineno));
function ok(n,c,x){R.push((c?'PASS':'FAIL')+' — '+n+(x?'  ['+String(x).slice(0,140)+']':''));}
window.addEventListener('load',()=>setTimeout(()=>{
 try{
  fitCards(); startRound(0,0,4242,4); G.turn=0; G.phase='meld';
  document.getElementById('overlay').style.display='none';
  const C=(r,s)=>({rank:r,suit:s,isJoker:false,id:r+s+Math.random()});
  G.players[0].hand=[C('K','♠'),C('3','♥'),C('9','♦'),C('A','♣'),C('5','♠'),C('7','♥'),C('2','♦')];
  render();

  const fan=document.getElementById('my-hand');
  ok('the fan drew every card', fan.children.length===7, fan.children.length);
  ok('the stock has an id to fly from', !!document.getElementById('src-stock'));
  ok('the discard has one too', !!document.getElementById('src-discard'));

  // sorting
  sortHand('rank');
  ok('sort by rank puts the Ace first and the King last',
     G.players[0].hand[0].rank==='A' && G.players[0].hand[6].rank==='K',
     G.players[0].hand.map(c=>c.rank).join(','));
  sortHand('suit');
  ok('sort by suit groups the suits',
     G.players[0].hand.map(c=>c.suit).join('')===
     [...G.players[0].hand].sort((a,b)=>SUITS.indexOf(a.suit)-SUITS.indexOf(b.suit))
       .map(c=>c.suit).join(''),
     G.players[0].hand.map(c=>c.rank+c.suit).join(' '));

  // dragging: pick the first card up and drop it on the far right
  sortHand('rank');
  const before=G.players[0].hand.map(c=>c.rank+c.suit);
  const first=document.getElementById('my-hand').children[0];
  const r0=first.getBoundingClientRect();
  const last=document.getElementById('my-hand').children[6].getBoundingClientRect();
  const pd=new PointerEvent('pointerdown',{clientX:r0.left+20,clientY:r0.top+40,
            pointerId:1,bubbles:true});
  first.dispatchEvent(pd);
  first.dispatchEvent(new PointerEvent('pointermove',
    {clientX:last.left+20,clientY:r0.top+40,pointerId:1,bubbles:true}));
  first.dispatchEvent(new PointerEvent('pointerup',
    {clientX:last.left+20,clientY:r0.top+40,pointerId:1,bubbles:true}));
  const after=G.players[0].hand.map(c=>c.rank+c.suit);
  ok('THE REQUEST: dragging a card moves it in the hand',
     after.join()!==before.join() && after[after.length-1]===before[0],
     before.join(' ')+'   ->   '+after.join(' '));

  // a tap that does not move still selects
  selected=[];
  const c2=document.getElementById('my-hand').children[2];
  const r2=c2.getBoundingClientRect();
  c2.dispatchEvent(new PointerEvent('pointerdown',
    {clientX:r2.left+20,clientY:r2.top+40,pointerId:2,bubbles:true}));
  c2.dispatchEvent(new PointerEvent('pointerup',
    {clientX:r2.left+20,clientY:r2.top+40,pointerId:2,bubbles:true}));
  ok('a tap still picks a card up', selected.length===1, selected.length);

  // the seat markers
  lastAction[2]={text:'✋ held the 7♦',held:true};
  G.turn=2; render();
  const north=document.getElementById('seat-2');
  ok('THE REQUEST: the seat shows who held it',
     /held the 7/.test(north.textContent), north.textContent.slice(0,60));
  ok('...marked, not just written', !!north.querySelector('.took.held'));
  ok('...and the seat whose turn it is is ringed',
     north.classList.contains('seat-active'));

  lastAction[1]={text:'drew'};
  G.turn=1; render();
  ok('a draw from the stock says so',
     /drew/.test(document.getElementById('seat-1').textContent));
  ok('...and the ring moved with the turn',
     !document.getElementById('seat-2').classList.contains('seat-active'));
  // ── THE HOLD PROMPT ──────────────────────────────────────────────────
  //   "it doesn't let me call for a card"
  // It was a small button shown for 3,500ms and then taken away. Her own rule
  // gives the caller time to think, so it waits.
  startRound(0,0,4242,4);
  const wrap=document.getElementById('hold-wrap');
  G.turn=2; G.phase='draw'; render();
  const beforeTurn=G.turn, beforeHand=G.players[0].hand.length;
  afterDiscard(1);
  ok('THE REPORTED CASE: the prompt is up', getComputedStyle(wrap).display!=='none');
  ok('...and names the card and who threw it',
     /West threw the/.test(document.getElementById('hold-say').textContent),
     document.getElementById('hold-say').textContent);
  ok('...with no countdown by default — it waits',
     getComputedStyle(document.getElementById('hold-bar')).display==='none' || HOLD_MS===0,
     'HOLD_MS='+HOLD_MS);
  ok('...and the game does NOT move on behind it',
     G.turn===beforeTurn && G.players[0].hand.length===beforeHand);
  ok('...the discard pile is clickable too',
     document.getElementById('src-discard').classList.contains('holdable'));

  // passing lets play continue
  document.getElementById('pass-btn').click();
  ok('passing closes the prompt', getComputedStyle(wrap).display==='none');

  // holding takes the card
  startRound(0,0,4242,4); G.turn=2; G.phase='draw'; render();
  const want=topOfDiscard(), had=G.players[0].hand.length;
  afterDiscard(1);
  document.getElementById('hold-btn').click();
  ok('THE FIX: holding puts the card in my hand',
     G.players[0].hand.includes(want), 'hand '+had+' -> '+G.players[0].hand.length);
  ok('...and the penalty card with it',
     G.players[0].hand.length===had+2, String(G.players[0].hand.length-had)+' cards');
  ok('...and the turn is untouched', G.turn===2, String(G.turn));

  // ── ADDING TO YOUR OWN MELD ──────────────────────────────────────────
  //   "i just placed my contract and i had another card of the same value that
  //    i wanted to meld on it and it won't let do that"
  //
  // Drag became "rearrange my hand" and quietly took the older, more obvious
  // gesture with it. Both work now.
  function downWithSpare(){
    startRound(0,0,4242,4);
    document.getElementById('overlay').style.display='none';
    G.players[0].hand=[C('7','♠'),C('7','♥'),C('7','♦'),
                       C('9','♠'),C('9','♥'),C('9','♦'),
                       C('7','♣'), C('2','♦')];
    G.turn=0; G.phase='meld'; render();
    selected=G.players[0].hand.slice(0,6); humanLayContract();
  }

  downWithSpare();
  ok('the contract goes down and leaves two cards',
     G.players[0].melds.length===2 && G.players[0].hand.length===2,
     G.players[0].hand.map(c=>c.rank+c.suit).join(' '));

  selected=[];
  humanLayOff(0);
  ok('clicking a meld with nothing picked up now SAYS so',
     /Pick a card out of your hand/.test(document.getElementById('banner').textContent),
     document.getElementById('banner').textContent.slice(0,50));

  selected=[G.players[0].hand.find(c=>c.rank==='7')];
  humanLayOff(0);
  ok('pick the card, tap the meld — it goes on',
     G.players[0].melds[0].cards.length===4, G.players[0].melds[0].cards.length+' cards');

  // and the gesture she actually used
  downWithSpare();
  const meldBox=document.getElementById('my-melds').children[0].getBoundingClientRect();
  const fan2=document.getElementById('my-hand');
  const si=G.players[0].hand.findIndex(c=>c.rank==='7');
  const sc=fan2.children[si], sr=sc.getBoundingClientRect();
  sc.dispatchEvent(new PointerEvent('pointerdown',
    {clientX:sr.left+20,clientY:sr.top+40,pointerId:31,bubbles:true}));
  sc.dispatchEvent(new PointerEvent('pointermove',
    {clientX:meldBox.left+meldBox.width/2,clientY:meldBox.top+meldBox.height/2,
     pointerId:31,bubbles:true}));
  sc.dispatchEvent(new PointerEvent('pointerup',
    {clientX:meldBox.left+meldBox.width/2,clientY:meldBox.top+meldBox.height/2,
     pointerId:31,bubbles:true}));
  ok('THE REPORTED CASE: dragging the card onto the meld lays it off',
     G.players[0].melds[0].cards.length===4,
     G.players[0].melds[0].cards.length+' cards, hand '+
     G.players[0].hand.map(c=>c.rank+c.suit).join(' '));

  // a card that does not belong is refused, out loud
  downWithSpare();
  selected=[G.players[0].hand.find(c=>c.rank==='2')];
  humanLayOff(0);
  ok('a card that does not fit is refused with a reason',
     G.players[0].melds[0].cards.length===3 &&
     /does not fit/.test(document.getElementById('banner').textContent),
     document.getElementById('banner').textContent.slice(0,50));

  // dragging within the hand still rearranges
  downWithSpare();
  const h0=G.players[0].hand.map(c=>c.rank+c.suit).join(' ');
  const f3=document.getElementById('my-hand');
  const a0=f3.children[0].getBoundingClientRect(), a1=f3.children[1].getBoundingClientRect();
  f3.children[0].dispatchEvent(new PointerEvent('pointerdown',
    {clientX:a0.left+20,clientY:a0.top+40,pointerId:32,bubbles:true}));
  f3.children[0].dispatchEvent(new PointerEvent('pointermove',
    {clientX:a1.left+20,clientY:a1.top+40,pointerId:32,bubbles:true}));
  f3.children[0].dispatchEvent(new PointerEvent('pointerup',
    {clientX:a1.left+20,clientY:a1.top+40,pointerId:32,bubbles:true}));
  ok('...while a drag that lands nowhere still rearranges the hand',
     G.players[0].hand.map(c=>c.rank+c.suit).join(' ')!==h0 ||
     G.players[0].hand.length===2,
     h0+'  ->  '+G.players[0].hand.map(c=>c.rank+c.suit).join(' '));

  // ── THE DEAD PILE LOOKS DEAD ─────────────────────────────────────────
  //   "if the discard pile is dead for me because somebody stole the discard
  //    then it should be grayed out or something"
  startRound(0,0,4242,4); G.turn=0; G.phase='draw';
  G.pileDead=false; render();
  const liveDisc=document.getElementById('drop-discard');
  ok('a live pile is not greyed', !liveDisc.classList.contains('dead-pile'));
  G.pileDead=true; render();
  const deadDisc=document.getElementById('drop-discard');
  ok('THE REQUEST: a dead pile is greyed out',
     deadDisc.classList.contains('dead-pile'));
  ok('...and says why', /dead/.test(deadDisc.textContent), deadDisc.textContent.trim());
  ok('...and there is no Take button offered',
     ![...document.querySelectorAll('#actions .action-btn')]
        .some(b=>/Take the face-up/.test(b.textContent)),
     [...document.querySelectorAll('#actions .action-btn')].map(b=>b.textContent).join(' | '));

  // ── THE CHIP IS THE SCORE, NOT THE HAND ──────────────────────────────
  //   "remove the count for the cards the player have in their hand ...
  //    Leave the running score."
  startRound(0,0,4242,4); G.players[2].score=-30; render();
  const chip=document.querySelector('#seat-2 .chip');
  ok('the chip shows the running score', chip.textContent.trim()==='-30',
     chip.textContent.trim());
  ok('...and no longer leaks what their hand is worth',
     !chip.querySelector('.b'));

  // ── THE JOKER EXCHANGE ───────────────────────────────────────────────
  //   "i just hit the joker situation. i can exchange to go out, but i
  //    couldn't do the exchange"
  startRound(2,0,4242,4);               // 2 runs
  document.getElementById('overlay').style.display='none';
  const jk={rank:'JOKER',suit:'★',isJoker:true,id:'jx'+Math.random()};
  const run=[C('4','♥'),C('5','♥'),C('6','♥'),jk];
  G.players[1].hand=[...run, C('9','♠'),C('10','♠'),C('J','♠'),C('Q','♠'),C('3','♣')];
  G.turn=1; G.phase='meld';
  layContract(1, [run, G.players[1].hand.filter(c=>c.suit==='♠')], [['7'], null]);
  ok('West is down with a joker standing for the 7♥',
     jk.standsFor && jk.standsFor.rank==='7' && jk.standsFor.suit==='♥',
     JSON.stringify(jk.standsFor));

  G.turn=0; G.phase='meld';
  const seven7=C('7','♥');
  G.players[0].hand=[seven7, C('2','♦'), C('8','♣')];
  render();
  const jkEl=document.querySelector('#seat-1 .card.jk');
  ok('THE REPORTED CASE: the joker on the table is marked', !!jkEl);
  ok('...and glows, because I hold the 7♥',
     jkEl.classList.contains('swappable'), jkEl.className);
  ok('...and the table says so, naming the card that buys it',
     /7♥ buys the Joker/.test(document.getElementById('banner').textContent),
     document.getElementById('banner').textContent.slice(0,70));

  jkEl.click();
  ok('THE FIX: tapping it makes the swap',
     G.players[0].hand.includes(jk), 'hand='+
     G.players[0].hand.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));
  ok('...the 7♥ went into West\'s run',
     G.players[1].melds[0].cards.includes(seven7));
  ok('...the run is still a run', isRun(G.players[1].melds[0].cards));
  ok('...and the joker is nameless again', !jk.standsFor);

  // not offered when I do not hold the card
  startRound(2,0,4242,4);
  const jk2={rank:'JOKER',suit:'★',isJoker:true,id:'jy'};
  jk2.standsFor={rank:'7',suit:'♥'};
  G.players[1].melds=[{type:'run',cards:[C('4','♥'),C('5','♥'),C('6','♥'),jk2]}];
  G.players[1].down=true;
  G.turn=0; G.phase='meld'; G.players[0].hand=[C('7','♠'),C('2','♦')];
  render();
  const jk2El=document.querySelector('#seat-1 .card.jk');
  ok('holding the wrong suit, the joker does not glow',
     jk2El && !jk2El.classList.contains('swappable'));

  // ── A JOKER IN A TRIO ────────────────────────────────────────────────
  //   "how do i take the joker from someone elses hand, i have a replacement
  //    but it wont let me"
  //
  // Only runs were resolved, so a joker in a TRIO carried no identity and
  // could never be bought. The first and fourth contracts are nothing but
  // trios, so this was unreachable from the moment the exchange shipped.
  function trioBoard(myCards){
    startRound(0,0,4242,4);                 // 2 trios
    document.getElementById('overlay').style.display='none';
    const jk3={rank:'JOKER',suit:'★',isJoker:true,id:'jt'+Math.random()};
    const a=[C('9','♠'),C('9','♥'),jk3], b=[C('K','♠'),C('K','♥'),C('K','♦')];
    G.players[1].hand=[...a,...b,C('3','♣')];
    G.turn=1; G.phase='meld';
    layContract(1,[a,b]);
    G.turn=0; G.phase='meld';
    G.players[0].hand=myCards;
    render();
    return jk3;
  }

  let tj=trioBoard([C('9','♦'), C('2','♦')]);
  ok('a joker in a trio stands for the rank',
     JSON.stringify(jokerStandsFor(G.players[1].melds[0], tj))==='{"rank":"9","suit":null}',
     JSON.stringify(jokerStandsFor(G.players[1].melds[0], tj)));
  const tjEl=document.querySelector('#seat-1 .card.jk');
  ok('THE REPORTED CASE: it is marked on the table', !!tjEl);
  ok('...and glows, because I hold a nine', tjEl.classList.contains('swappable'));
  ok('...and says what it is',
     /standing in for a 9/.test(tjEl.title), tjEl.title);
  tjEl.click();
  ok('THE FIX: tapping it takes the joker',
     G.players[0].hand.includes(tj),
     G.players[0].hand.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));
  ok('...and the trio is still a trio of nines',
     isTrio(G.players[1].melds[0].cards) &&
     trioRank(G.players[1].melds[0].cards)==='9',
     G.players[1].melds[0].cards.map(c=>c.isJoker?'Jo':c.rank+c.suit).join(' '));

  // a trio does not care about suits
  tj=trioBoard([C('9','♣'), C('2','♦')]);
  ok('ANY nine buys it — a trio has no suit',
     document.querySelector('#seat-1 .card.jk').classList.contains('swappable'));

  // but the rank must be right
  tj=trioBoard([C('8','♦'), C('2','♦')]);
  ok('an eight does not', !document.querySelector('#seat-1 .card.jk')
                              .classList.contains('swappable'));

  // a run still wants the exact card
  startRound(2,0,4242,4);
  const rj={rank:'JOKER',suit:'★',isJoker:true,id:'jr'+Math.random()};
  const rr=[C('4','♥'),C('5','♥'),rj,C('7','♥')];
  G.players[1].melds=[{type:'run',cards:rr}]; G.players[1].down=true;
  rj.standsFor={rank:'6',suit:'♥'};
  G.turn=0; G.phase='meld';
  G.players[0].hand=[C('6','♠')]; render();
  ok('in a RUN the suit still matters — the 6♠ does not buy the 6♥',
     !document.querySelector('#seat-1 .card.jk').classList.contains('swappable'));
  G.players[0].hand=[C('6','♥'), C('2','♦')]; render();
  ok('...and the 6♥ does',
     document.querySelector('#seat-1 .card.jk').classList.contains('swappable'));

 }catch(e){ R.push('FAIL — THREW: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }
 ok('no uncaught JS errors', errs.length===0, errs.slice(0,2).join(' | '));
 const pre=document.createElement('pre'); pre.id='results';
 pre.textContent=R.join('\n'); document.body.appendChild(pre);
},500));
</script>
