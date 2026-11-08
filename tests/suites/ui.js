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
 }catch(e){ R.push('FAIL — THREW: '+e.message+' @ '+(e.stack||'').split('\n')[1]); }
 ok('no uncaught JS errors', errs.length===0, errs.slice(0,2).join(' | '));
 const pre=document.createElement('pre'); pre.id='results';
 pre.textContent=R.join('\n'); document.body.appendChild(pre);
},500));
</script>
