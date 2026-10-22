'use strict';
// Achoo engine: one locked chamber per run. Four puzzles hide four glyphs; the door takes the glyphs in slot order.
// Rooms (hub + puzzles) live in rooms.js. Words live in story.json.
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d'),cue=$('cue'),burst=$('burst'),fill=$('fill'),steps=$('steps'),
  lineEl=$('line'),whisperEl=$('whisper'),archEl=$('archive'),backEl=$('back'),root=document.documentElement,themeMeta=document.querySelector('meta[name=theme-color]');
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
let W,H,DPR=Math.min(devicePixelRatio||1,2);
const M={x:-9999,y:-9999,vx:0,vy:0,sx:0,sy:0,down:false,active:false};

// ---- the four chambers, in the order you get out of them: nose, ear, mouth, eye. [bg, ink, accent, alt] ----
const CH=[
  {pal:['#0f1a3a','#f4eedd','#ffb347','#4aa8ff']},
  {pal:['#12261a','#e6f2d8','#d9ff66','#3aa86b']},
  {pal:['#3a0f16','#ffe6dc','#ff5d73','#c7344a']},
  {pal:['#1b1030','#efe6ff','#ff7ad9','#8a63ff']},
];
const PAL_TITLE=['#2436ff','#ffffff','#ff3b1f','#0a0a0a'],PAL_END=['#050505','#ff2a2a','#ffffff','#8f0a14'];

// ---- audio: small blips and a very quiet drone ----
let AC,drone;
function blip(f=400,d=.12,type='sine',v=.12,delay=0){
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  o.frequency.exponentialRampToValueAtTime(f*1.8,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}
}
const jingle=()=>[520,660,880].forEach((f,i)=>blip(f,.14,'triangle',.1,i*.09));
function startDrone(){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();if(drone)return;
  const g=AC.createGain();g.gain.value=0;[49,51.4].forEach(f=>{const o=AC.createOscillator();o.frequency.value=f;o.connect(g);o.start()});g.connect(AC.destination);drone=g}catch(e){}}
const droneLevel=v=>{try{drone&&drone.gain.setTargetAtTime(v,AC.currentTime,.6)}catch(e){}};

// ---- shared drawing ----
function Parts(){return {a:[],burst(x,y,n,cols,s=5){for(let i=0;i<n;i++){const an=rnd(0,6.28),sp=rnd(1,s);this.a.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1,l:1,c:pick(cols),r:rnd(2,5)})}},
  draw(g=.1){for(let i=this.a.length-1;i>=0;i--){const p=this.a[i];p.x+=p.vx;p.y+=p.vy;p.vy+=g;p.l-=.02;if(p.l<=0){this.a.splice(i,1);continue}
    ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.l+1,0,6.28);ctx.fill()}}}}
function eyeGlyph(x,y,r,open,lx,ly,c){   // c = [sclera, iris, pupil]
  const h=Math.max(.8,r*open);ctx.fillStyle=c[0];ctx.beginPath();ctx.ellipse(x,y,r*1.5,h,0,0,6.28);ctx.fill();
  if(open<.2)return;
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,r*1.5,h,0,0,6.28);ctx.clip();
  const a=Math.atan2(ly-y,lx-x),d=Math.min(r*.5,Math.hypot(lx-x,ly-y)*.1),ix=x+Math.cos(a)*d,iy=y+Math.sin(a)*d;
  ctx.fillStyle=c[1];ctx.beginPath();ctx.arc(ix,iy,r*.62,0,6.28);ctx.fill();
  ctx.fillStyle=c[2];ctx.beginPath();ctx.arc(ix,iy,r*.3,0,6.28);ctx.fill();ctx.restore();
}
function drawGlyph(i,x,y,s,col){   // 0 circle · 1 triangle · 2 square · 3 diamond
  ctx.fillStyle=col;ctx.beginPath();
  if(i===0)ctx.arc(x,y,s,0,6.28);
  else if(i===1){ctx.moveTo(x,y-s);ctx.lineTo(x+s*.95,y+s*.8);ctx.lineTo(x-s*.95,y+s*.8);ctx.closePath()}
  else if(i===2)ctx.rect(x-s*.85,y-s*.85,s*1.7,s*1.7);
  else{ctx.moveTo(x,y-s*1.1);ctx.lineTo(x+s*.8,y);ctx.lineTo(x,y+s*1.1);ctx.lineTo(x-s*.8,y);ctx.closePath()}
  ctx.fill();
}
function drawArrow(d,x,y,s,col){   // d: 0 up · 1 right · 2 down · 3 left
  ctx.save();ctx.translate(x,y);ctx.rotate(d*Math.PI/2);ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(0,-s);ctx.lineTo(s*.75,0);ctx.lineTo(s*.28,0);ctx.lineTo(s*.28,s);ctx.lineTo(-s*.28,s);ctx.lineTo(-s*.28,0);ctx.lineTo(-s*.75,0);ctx.closePath();ctx.fill();ctx.restore();
}
function drawIcon(id,x,y,s,col){   // pictogram of each puzzle: the same one sits on its tile and above its lock slot
  ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineCap='round';
  if(id==='align'){for(let L=0;L<2;L++){ctx.globalAlpha=L?.5:1;for(let i=0;i<6;i++){const a=i*Math.PI/3+L*.35;ctx.beginPath();ctx.arc(x+Math.cos(a)*s*.75,y+Math.sin(a)*s*.75,s*.13,0,6.28);ctx.fill()}}ctx.globalAlpha=1}
  else if(id==='lantern'){ctx.beginPath();ctx.arc(x,y,s*.34,0,6.28);ctx.fill();ctx.lineWidth=s*.11;for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*s*.55,y+Math.sin(a)*s*.55);ctx.lineTo(x+Math.cos(a)*s*.9,y+Math.sin(a)*s*.9);ctx.stroke()}}
  else if(id==='gaze'){eyeGlyph(x,y,s*.5,1,x+s,y,[col,room.field[2],room.field[0]])}
  else if(id==='pulse'){ctx.lineWidth=s*.13;ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-s*.4,y);ctx.lineTo(x-s*.2,y-s*.7);ctx.lineTo(x+s*.15,y+s*.7);ctx.lineTo(x+s*.35,y);ctx.lineTo(x+s,y);ctx.stroke()}
  else if(id==='letters'){ctx.font=`900 ${s*1.3}px Chivo,system-ui,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('Ab',x,y+s*.05)}
}
const rings=[];const ring=(x,y,r=46)=>{if(!reduce)rings.push({x,y,r,t:performance.now()})};

// ---- registry ----
const ROOMS={};const reg=r=>(ROOMS[r.id]=r);

// ---- story + meta (persisted) ----
const DEFAULT={chambers:[{intro:['코가 간지럽다.','문이 눈꺼풀처럼 닫혀 있다.','아래 네 칸이 비어 있다.'],open:['막이 열렸다.']},{intro:['소리가 안으로만 들어온다.'],open:['속삭임이 멈췄다.']},{intro:['따뜻하다. 너무.'],open:['입이 다물렸다.']},{intro:['빛이 닿지 않는 곳이 없다.'],open:[]}],
  insight:{align:'흩어진 점들이 하나의 모양이었다.',lantern:'어둠이 가리고 있던 건 방향이었다.',gaze:'눈들이 한곳을 보기 시작했다.',pulse:'박동에는 끝이 있었다.',letters:'글자들은 원래 하나의 말이었다.'},
  hints:{align:'돌리면 소리가 변한다.',lantern:'빛이 닿은 곳만 말한다.',gaze:'답은 다른 방의 어둠에 있다.',pulse:'멈추는 곳까지 세어라.',letters:'흩어진 건 원래 하나였다.'},
  lore:['여기는 코 속이다.'],endings:{plain:['문이 열렸다.','…다시 간지럽다.'],watched:['문이 열렸다.','아직 모자란다.'],all:['문이 열렸다.','먼지는 너였다.'],loop:['…','더 큰 코가 간지럽다.','에취.']},endpoint:null};
let STORY=DEFAULT;
async function loadStory(){try{const r=await fetch('story.json',{cache:'no-cache'});if(r.ok)STORY=Object.assign({},DEFAULT,await r.json())}catch(e){}}
let meta={runs:0,eyes:0,seen:{},ends:{},chamber:0,escaped:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.meta2')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.meta2',JSON.stringify(meta))}catch(e){}};
// optional generated insight line (see worker/); always raced against a timeout, story.json is the fallback
function ai(id){
  if(!STORY.endpoint)return null;
  return fetch(STORY.endpoint,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(2500),
    body:JSON.stringify({kind:'insight',room:id,chamber:run?run.ci:0,round:meta.runs,style:Object.values(STORY.insight||{}).slice(0,5)})}).then(r=>r.json()).then(j=>j.line?String(j.line).slice(0,40):null).catch(()=>null);
}

// ---- state ----
let room,run=null,busy=true,pending=null,lastAct=0,sel=0;
const WORDS=['ITCH','HIDE','WATCH','BREATH','SILENT','SNEEZE'];

// ---- HUD ----
function hud(){steps.innerHTML='';if(!run||room.tier==='title'||room.tier==='end')return;
  run.puz.forEach(id=>{const e=document.createElement('i');if(run.solved[id])e.className='done';steps.appendChild(e)})}
function paint(){root.style.setProperty('--field',room.field[0]);root.style.setProperty('--ink',room.field[1]);themeMeta.content=room.field[0]}
function showCue(){cue.textContent=room.cue||'';cue.classList.remove('show');void cue.offsetWidth;cue.classList.add('show')}
function fieldFor(r){return r.id==='title'?PAL_TITLE:r.id==='ending'?PAL_END:run?run.pal:PAL_TITLE}

// ---- story lines, typed one character at a time; tap to skip the wait ----
async function typeLine(text,low){
  lineEl.className=low?'low':'';lineEl.textContent='';lineEl.classList.add('on');
  let skip=false;const sk=()=>{skip=true};lineEl.addEventListener('pointerdown',sk);
  if(reduce)lineEl.textContent=text;else for(const ch of text){lineEl.textContent+=ch;if(ch!==' ')blip(1200+Math.random()*200,.03,'square',.015);await wait(55)}
  for(let i=0;i<(reduce?30:22)&&!skip;i++)await wait(60);
  lineEl.removeEventListener('pointerdown',sk);lineEl.classList.remove('on');await wait(320);
}
let wt;function whisper(s){if(!s)return;whisperEl.textContent=s;whisperEl.classList.add('on');clearTimeout(wt);wt=setTimeout(()=>whisperEl.classList.remove('on'),3200)}

// ---- the watcher: a small eye hides in most rooms. Finding it gives you a line of the old story. ----
let eye=null,eyeAt=0,wat=[];
const eyeCols=()=>[room.field[1],room.field[2],room.field[0]];
function armEye(){eye=null;eyeAt=run&&room.id!=='title'&&room.id!=='ending'&&!meta.seen['_eye'+run.ci+room.id]?performance.now()+7000:0}
const eyeHit=()=>eye&&Math.hypot(eye.x-M.x,eye.y-M.y)<30;
function collectEye(){
  const at=eye;eye=null;run.eyes++;meta.seen['_eye'+run.ci+room.id]=1;whisper(STORY.lore[meta.eyes%STORY.lore.length]||'');meta.eyes++;saveMeta();
  blip(160,.4,'sine',.1);buzz([10,40,10]);ring(at.x,at.y,60);
}
function drawEye(t){
  if(!eye){if(eyeAt&&performance.now()>eyeAt&&!busy){eye={x:rnd(30,W-30),y:rnd(90,H-90),ph:rnd(0,6.28),born:performance.now()};eyeAt=0}return}
  const k=Math.min(1,(performance.now()-eye.born)/1200);eye.x+=Math.sin(t/1900+eye.ph)*.18;eye.y+=Math.cos(t/2300+eye.ph)*.14;
  eyeGlyph(eye.x,eye.y,9*k,(t%3200)<140?.15:1,M.x,M.y,eyeCols());
}
// peripheral eyes: only decoration. The more you solve, the more of them are watching.
function seedWatchers(){wat=[];const n=run&&room.tier!=='title'&&room.tier!=='end'?Math.min(7,Object.keys(run.solved).length*2+run.ci):0;
  for(let i=0;i<n;i++)wat.push({x:Math.random()<.5?rnd(10,26):W-rnd(10,26),y:rnd(80,H-60),r:rnd(6,11),ph:rnd(0,6.28)})}
function drawWatchers(t){for(const w of wat)eyeGlyph(w.x,w.y,w.r,(t/1000+w.ph)%5.2<.14?.1:1,M.x,M.y,eyeCols())}
// the notebook: clues you've picked up, shown small along the bottom of every puzzle
function drawNotes(){
  if(!run||room.tier!=='puz'||!run.notes.length)return;const f=room.field;let x=18;
  for(const n of run.notes){if(n.t==='arrows'){ctx.globalAlpha=.85;n.d.forEach((d,i)=>drawArrow(d,x+i*22+8,H-40,8,f[2]));ctx.globalAlpha=1;x+=n.d.length*22+14}}
}

// ---- run structure ----
function buildRun(ci){
  const rest=shuffle(['align','pulse','letters']).slice(0,2),puz=shuffle(['lantern','gaze',...rest]),gl=shuffle([0,1,2,3]),glyph={};
  puz.forEach((id,i)=>glyph[id]=gl[i]);
  return {ci,pal:CH[ci].pal,puz,glyph,code:puz.map(id=>glyph[id]),tileOrder:shuffle([0,1,2,3]),solved:{},notes:[],eyes:0,
    arrows:Array.from({length:4},()=>(Math.random()*4)|0),pulseK:3+((Math.random()*4)|0),word:pick(WORDS),slots:[-1,-1,-1,-1],jam:0};
}
function enterRoom(r,keep){
  room=r;if(!keep||!r.field)r.field=fieldFor(r);
  document.body.classList.toggle('title',r.id==='title');document.body.classList.toggle('puz',r.tier==='puz');
  paint();hud();seedWatchers();room.init();armEye();rings.length=0;lastAct=performance.now();
  pending=run&&r.tier==='puz'?ai(r.id):null;
  droneLevel(run&&r.tier!=='title'&&r.tier!=='end'?.02:0);
  cv.classList.toggle('hide',!r.keepCanvas);
}
async function reveal(lines){
  for(const s of lines)await typeLine(s,room.low);
  cv.classList.remove('hide');if(room.after)room.after();else showCue();
  if(eyeAt)eyeAt=performance.now()+7000;lastAct=performance.now();busy=false;
}
function go(next,x,y,lines=[]){
  if(busy)return;busy=true;
  next.field=fieldFor(next);
  if(reduce){enterRoom(next,true);reveal(lines);return}
  burst.style.setProperty('--next',next.field[0]);burst.style.setProperty('--bx',x+'px');burst.style.setProperty('--by',y+'px');
  burst.classList.add('go');setTimeout(()=>enterRoom(next,true),170);
  setTimeout(()=>{burst.classList.remove('go');reveal(lines)},480);
}
function startRun(){
  if(busy)return;startDrone();run=buildRun(sel);
  go(ROOMS.hub,innerWidth/2,innerHeight/2,STORY.chambers[sel].intro||[]);
}
async function solved(){
  busy=true;const r=room;run.solved[r.id]=1;meta.seen[r.id]=(meta.seen[r.id]||0)+1;saveMeta();
  if(r.note)run.notes.push(r.note());jingle();buzz([20,30,20]);
  const gen=await Promise.race([pending,wait(300)]);busy=false;
  ROOMS.hub.pendingStamp=r.id;go(ROOMS.hub,M.x>0?M.x:W/2,M.y>0?M.y:H/2,[gen||STORY.insight[r.id]||'…']);
}
async function finish(){   // the door opened
  busy=true;jingle();buzz([20,40,20]);meta.escaped[run.ci]=1;meta.runs++;if(run.ci>=meta.chamber&&run.ci<3)meta.chamber=run.ci+1;
  const last=run.ci===3;let lines;
  if(last){const v=meta.eyes>=16&&meta.ends.all?'loop':meta.eyes>=16?'all':meta.eyes>=8?'watched':'plain';meta.ends[v]=1;lines=STORY.endings[v]}
  else lines=STORY.chambers[run.ci].open||[];
  saveMeta();await wait(2000);                 // the eyelid opens first
  if(last){busy=false;return go(ROOMS.ending,M.x>0?M.x:W/2,M.y>0?M.y:H/2,lines)}
  for(const s of lines)await typeLine(s,true);
  sel=meta.chamber;busy=false;go(ROOMS.title,W/2,H/2,[]);
}

// ---- title + ending ----
reg({id:'title',tier:'title',cue:'',
  init(){this.done=false;this.p=0;sel=Math.min(sel,meta.chamber)},
  dots(){return [0,1,2,3].map(i=>({i,x:W/2+(i-1.5)*58,y:H*.8}))},
  down(){for(const d of this.dots())if(Math.hypot(M.x-d.x,M.y-d.y)<30){if(d.i<=meta.chamber){sel=d.i;blip(300+d.i*120,.1,'triangle',.08)}return}startRun()},
  draw(t){const f=this.field,R=Math.min(W,H)*.2*(1+.05*Math.sin(t/900));
    ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(W/2,H*.52,R,0,6.28);ctx.fill();ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(W/2,H*.52,R*.35,0,6.28);ctx.fill();
    for(const d of this.dots()){const ok=d.i<=meta.chamber;ctx.globalAlpha=ok?1:.35;ctx.strokeStyle=f[1];ctx.fillStyle=f[1];ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(d.x,d.y,d.i===sel?13:9,0,6.28);if(meta.escaped[d.i]||d.i===sel)ctx.fill();else ctx.stroke();ctx.globalAlpha=1}}});
reg({id:'ending',tier:'end',cue:'Again',keepCanvas:true,low:true,
  init(){this.t0=performance.now();this.closing=0;this.ready=false;this.done=false;this.p=0;this.px=0;this.py=0},
  after(){this.closing=performance.now();setTimeout(()=>{this.ready=true;showCue()},1100)},
  down(){if(this.ready){this.ready=false;sel=0;go(ROOMS.title,M.x,M.y,[])}},
  draw(t){
    const now=performance.now(),cx=W/2,cy=H*.4,rx=W*.42,full=W*.24;
    let open=Math.min(1,(now-this.t0)/1600);if(this.closing)open=Math.max(0,1-(now-this.closing)/900);
    const ry=Math.max(1,full*open*(reduce?1:1-.04*Math.sin(t/700)));
    ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.fill();
    const tx=M.active||M.down?M.x:cx,ty=M.active||M.down?M.y:cy;
    this.px+=((tx-cx)*.12-this.px)*.15;this.py+=((ty-cy)*.12-this.py)*.15;
    const lim=Math.min(rx*.35,Math.abs(this.px)),ix=cx+Math.sign(this.px)*lim,iy=cy+Math.max(-ry*.4,Math.min(ry*.4,this.py));
    ctx.save();ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.clip();
    ctx.fillStyle='#ff2a2a';ctx.beginPath();ctx.arc(ix,iy,full*.62,0,6.28);ctx.fill();
    ctx.fillStyle='#0a0a0a';ctx.beginPath();ctx.arc(ix,iy,full*.28,0,6.28);ctx.fill();ctx.restore()}});

// ---- archive: what you've found so far ----
function openArchive(){
  archEl.innerHTML='';const box=document.createElement('div');box.className='in';
  STORY.lore.forEach((s,i)=>{const p=document.createElement('p');p.textContent=i<meta.eyes?s:'…';if(i>=meta.eyes)p.className='dim';box.appendChild(p)});
  const n=document.createElement('p');n.className='nums';
  n.textContent=`방 ${Object.keys(meta.escaped).length}/4  끝 ${Object.keys(meta.ends).length}/4  회 ${meta.runs}`;
  box.appendChild(n);archEl.appendChild(box);archEl.classList.add('on');
}
$('arch').addEventListener('click',openArchive);
archEl.addEventListener('click',()=>archEl.classList.remove('on'));
backEl.addEventListener('click',()=>{if(!busy&&room.tier==='puz')go(ROOMS.hub,innerWidth/2,innerHeight/2,[])});

// ---- input ----
function pt(e){const nx=e.clientX,ny=e.clientY;M.vx=nx-M.x;M.vy=ny-M.y;M.sx=M.sx*.6+M.vx*.4;M.sy=M.sy*.6+M.vy*.4;M.x=nx;M.y=ny;lastAct=performance.now()}
cv.addEventListener('pointermove',e=>{if(busy)return;if(!M.active&&e.pointerType==='touch')return;pt(e);M.active=true;room.move&&room.move(e)});
cv.addEventListener('pointerdown',e=>{if(busy)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(AC&&AC.state==='suspended')AC.resume();pt(e);ring(M.x,M.y);if(eyeHit()){collectEye();return}
  M.sx=M.sy=0;M.down=true;M.active=true;room.down&&room.down(e)});
const release=e=>{if(!M.down)return;M.down=false;if(e.pointerType==='touch')M.active=false;room.up&&room.up(e)};
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',release);
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());

function resize(initial){
  const nw=innerWidth,nh=innerHeight,big=!W||Math.abs(nw-W)>40||Math.abs(nh-H)>150;   // a sliding mobile URL bar is not a resize
  W=nw;H=nh;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  if(big&&!initial&&room&&room.init)room.init();
}
addEventListener('resize',()=>resize());

// ---- loop ----
let shown=0;
function loop(t){
  ctx.clearRect(0,0,W,H);room.draw(t);drawWatchers(t);drawNotes();drawEye(t);
  for(let i=rings.length-1;i>=0;i--){const g=rings[i],k=(performance.now()-g.t)/380;if(k>=1){rings.splice(i,1);continue}
    ctx.globalAlpha=1-k;ctx.strokeStyle=room.field[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.x,g.y,g.r*(1-Math.pow(1-k,3)),0,6.28);ctx.stroke();ctx.globalAlpha=1}
  shown+=((room.p||0)-shown)*.2;fill.style.transform='scaleX('+Math.min(1,shown).toFixed(3)+')';
  if(!busy){
    if(room.done&&room.tier==='puz'){room.done=false;shown=0;solved()}
    else if(room.escape){room.escape=false;finish()}
    else if(run&&room.tier!=='title'&&performance.now()-lastAct>40000){lastAct=performance.now();room.hintNow?room.hintNow():whisper((STORY.hints||{})[room.id])}
  }
  requestAnimationFrame(loop);
}

// ---- boot. #room=align jumps into one puzzle with a fresh run (handy for testing). ----
async function boot(){
  resize(true);await loadStory();sel=meta.chamber;
  const q=new URLSearchParams(location.hash.slice(1)),id=q.get('room');
  if(id&&ROOMS[id]){run=buildRun(+q.get('c')||0);if(ROOMS[id].tier==='puz'&&!run.puz.includes(id))run.puz[3]=id;enterRoom(ROOMS[id])}
  else enterRoom(ROOMS.title);
  cv.classList.remove('hide');showCue();busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
