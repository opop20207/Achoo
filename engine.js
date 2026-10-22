'use strict';
// Achoo engine: input, audio, story, run structure, escalation. Rooms live in rooms.js.
const $=id=>document.getElementById(id);
const cv=$('c'),ctx=cv.getContext('2d'),cue=$('cue'),burst=$('burst'),fill=$('fill'),steps=$('steps'),
  lineEl=$('line'),whisperEl=$('whisper'),archEl=$('archive'),root=document.documentElement,themeMeta=document.querySelector('meta[name=theme-color]');
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
let W,H,DPR=Math.min(devicePixelRatio||1,2);
const M={x:-9999,y:-9999,vx:0,vy:0,sx:0,sy:0,down:false,active:false};
let DEPTH=0,DIFF=1;                       // 0..1 how far down we are; DIFF scales room difficulty

// ---- palettes per tier: [background, ink, accent, alt]. They sour as you go down. ----
const PAL={
  1:[['#2436ff','#ffffff','#ff3b1f','#0a0a0a'],['#ff3b1f','#0a0a0a','#ffffff','#2436ff'],['#0a0a0a','#ffffff','#2436ff','#ff3b1f'],['#ffd400','#0a0a0a','#ff3b1f','#2436ff']],
  2:[['#d7ff3a','#0a0a0a','#ff2fa0','#2436ff'],['#00a88f','#0a0a0a','#ffe14a','#ffffff'],['#7a3cff','#ffffff','#d7ff3a','#0a0a0a'],['#ff7ac8','#0a0a0a','#ffffff','#2436ff']],
  3:[['#f2a6a0','#3a0d12','#8f0a14','#ffffff'],['#3b1a5a','#f2a6a0','#d7ff3a','#ffffff'],['#1e2a1e','#c8f0b0','#ff3b1f','#f2a6a0'],['#e6dcc8','#2a1a10','#8f0a14','#3b1a5a']],
  4:[['#8f0a14','#ffd9d0','#0a0a0a','#f2a6a0'],['#b5b800','#1a0a00','#8f0a14','#ffffff'],['#050505','#ff2a2a','#ffffff','#8f0a14'],['#2a0a2a','#e8b0ff','#ff2a2a','#d7ff3a']],
  5:[['#ffffff','#0a0a0a','#ff3b1f','#2436ff']],
};
PAL[0]=[PAL[1][0]];PAL[6]=[PAL[4][2]];   // title, ending

// ---- audio: tiny blips, plus a drone that thickens with depth ----
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
setInterval(()=>{if(run&&DEPTH>.55&&!document.hidden&&!busy){blip(62,.16,'sine',.07+.05*DEPTH);setTimeout(()=>blip(58,.14,'sine',.04),170);buzz(12)}},900);

// ---- shared drawing helpers ----
function Parts(){return {a:[],burst(x,y,n,cols,s=5){for(let i=0;i<n;i++){const an=rnd(0,6.28),sp=rnd(1,s);this.a.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1,l:1,c:pick(cols),r:rnd(2,5)})}},
  draw(g=.1){for(let i=this.a.length-1;i>=0;i--){const p=this.a[i];p.x+=p.vx;p.y+=p.vy;p.vy+=g;p.l-=.02;if(p.l<=0){this.a.splice(i,1);continue}
    ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.l+1,0,6.28);ctx.fill()}}}}
// c = [sclera, iris, pupil]; open 0..1; (lx,ly) = where it looks
function eyeGlyph(x,y,r,open,lx,ly,c){
  const h=Math.max(.8,r*open);ctx.fillStyle=c[0];ctx.beginPath();ctx.ellipse(x,y,r*1.5,h,0,0,6.28);ctx.fill();
  if(open<.2)return;
  ctx.save();ctx.beginPath();ctx.ellipse(x,y,r*1.5,h,0,0,6.28);ctx.clip();
  const a=Math.atan2(ly-y,lx-x),d=Math.min(r*.5,Math.hypot(lx-x,ly-y)*.1),ix=x+Math.cos(a)*d,iy=y+Math.sin(a)*d;
  ctx.fillStyle=c[1];ctx.beginPath();ctx.arc(ix,iy,r*.62,0,6.28);ctx.fill();
  ctx.fillStyle=c[2];ctx.beginPath();ctx.arc(ix,iy,r*.3,0,6.28);ctx.fill();ctx.restore();
}
const rings=[];const ring=(x,y,r=46)=>{if(!reduce)rings.push({x,y,r,t:performance.now()})};

// ---- room registry (rooms.js fills it) ----
const ROOMS={};const reg=r=>(ROOMS[r.id]=r);

// ---- story + meta (persisted) ----
const DEFAULT={tiers:{1:['코가 간지럽다.'],2:['더 깊이 들어왔다.'],3:['벽에 눈이 열렸다.'],4:['여기부터는 살이다.'],5:['숨을 들이마신다.']},
  after:{1:['거품은 누군가의 숨이었다.'],2:['길이 나를 피한다.'],3:['움직이면 안 된다.'],4:['벽이 숨을 쉰다.']},
  lore:['여기는 코 속이다.'],endings:{plain:['에취.','…','먼지는 너였다.'],watched:['에취.','…','아직 모자란다.'],all:['에취.','…','그리고 그것도.'],loop:['…','더 큰 코가 간지럽다.','에취.']},endpoint:null};
let STORY=DEFAULT;
async function loadStory(){try{const r=await fetch('story.json',{cache:'no-cache'});if(r.ok)STORY=Object.assign({},DEFAULT,await r.json())}catch(e){}}
let meta={runs:0,full:0,eyes:0,seen:{},ends:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.meta')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.meta',JSON.stringify(meta))}catch(e){}};

// optional generated line (see worker/). Always raced against a timeout; story.json is the fallback.
function ai(kind,tier,id){
  if(!STORY.endpoint)return null;
  return fetch(STORY.endpoint,{method:'POST',headers:{'content-type':'application/json'},signal:AbortSignal.timeout(2500),
    body:JSON.stringify({kind,tier,room:id,depth:DEPTH,round:meta.runs,style:((STORY.retro||{})[id]||STORY.after[tier]||[]).slice(0,5)})}).then(r=>r.json()).then(j=>j.line?String(j.line).slice(0,40):null).catch(()=>null);
}

// ---- state ----
let room,run=null,busy=true,pending=null,devDepth=null;
const used=new Set();

// ---- HUD ----
function hud(){steps.innerHTML='';if(!run||run.list.length<2)return;
  run.list.forEach((r,i)=>{const e=document.createElement('i');if(i<run.i)e.className='done';if(i===run.i)e.className='now';if(run.found[i])e.classList.add('sec');steps.appendChild(e)})}
function paint(){root.style.setProperty('--field',room.field[0]);root.style.setProperty('--ink',room.field[1]);themeMeta.content=room.field[0]}
function showCue(){cue.textContent=room.cue||'';cue.classList.remove('show');void cue.offsetWidth;cue.classList.add('show')}

// ---- story lines: typed one character at a time, tap to skip the wait ----
async function typeLine(text,low){
  lineEl.className=low?'low':'';lineEl.textContent='';lineEl.classList.add('on');
  let skip=false;const sk=()=>{skip=true};lineEl.addEventListener('pointerdown',sk);
  if(reduce)lineEl.textContent=text;else for(const ch of text){lineEl.textContent+=ch;if(ch!==' ')blip(1200+Math.random()*200,.03,'square',.015);await wait(55)}
  for(let i=0;i<(reduce?30:22)&&!skip;i++)await wait(60);
  lineEl.removeEventListener('pointerdown',sk);lineEl.classList.remove('on');await wait(320);
}
let wt;function whisper(s){whisperEl.textContent=s;whisperEl.classList.add('on');clearTimeout(wt);wt=setTimeout(()=>whisperEl.classList.remove('on'),2600)}

// ---- the watcher: one small eye hides in most rooms. It's never explained. ----
let eye=null,eyeAt=0,wat=[];
const eyeCols=()=>[room.field[1],room.field[2],room.field[0]];
function armEye(){eye=null;eyeAt=run&&room.tier<5&&room.tier>0&&run.list.length>1?performance.now()+6500:0}
const eyeHit=()=>eye&&Math.hypot(eye.x-M.x,eye.y-M.y)<30;
function collectEye(){
  const at=eye;eye=null;run.found[run.i]=true;run.eyes++;whisper(STORY.lore[meta.eyes%STORY.lore.length]||'');meta.eyes++;saveMeta();
  hud();blip(160,.4,'sine',.1);buzz([10,40,10]);ring(at.x,at.y,60);
}
function drawEye(t){
  if(!eye){if(eyeAt&&performance.now()>eyeAt&&!busy){eye={x:rnd(30,W-30),y:rnd(90,H-70),ph:rnd(0,6.28),born:performance.now()};eyeAt=0}return}
  const k=Math.min(1,(performance.now()-eye.born)/1200);eye.x+=Math.sin(t/1900+eye.ph)*.18;eye.y+=Math.cos(t/2300+eye.ph)*.14;
  eyeGlyph(eye.x,eye.y,9*k,(t%3200)<140?.15:1,M.x,M.y,eyeCols());
}
// peripheral watchers: decoration only. More of them the deeper you are.
function seedWatchers(){wat=[];const n=Math.floor(DEPTH*8);for(let i=0;i<n;i++)wat.push({x:Math.random()<.5?rnd(10,26):W-rnd(10,26),y:rnd(80,H-50),r:rnd(6,11),ph:rnd(0,6.28)})}
function drawWatchers(t){for(const w of wat)eyeGlyph(w.x,w.y,w.r,(t/1000+w.ph)%5.2<.14?.1:1,M.x,M.y,eyeCols())}
// glitch: torn horizontal slices, rarer up top, constant at the bottom
let glitchAt=0,glitchUntil=0;
function glitch(){
  if(reduce||DEPTH<.4||!run)return;const now=performance.now();
  if(now>glitchAt){glitchUntil=now+rnd(90,170);glitchAt=now+rnd(1800,4200)*(1.2-DEPTH)}
  if(now>glitchUntil)return;
  for(let i=0;i<3+(DEPTH*4|0);i++){const sy=rnd(0,H-60),sh=rnd(8,50),dx=rnd(-30,30)*(.5+DEPTH);
    ctx.drawImage(cv,0,sy*DPR,cv.width,sh*DPR,dx,sy,W,sh)}
}

// ---- run structure: 3+3+2+2 rooms from pools, then the sneeze ----
function buildRun(){
  const by=t=>shuffle(Object.values(ROOMS).filter(r=>r.tier===t));
  const list=[...by(1).slice(0,3),...by(2).slice(0,3),...by(3).slice(0,2),...by(4).slice(0,2),ROOMS.sneeze];
  return {list,i:0,eyes:0,found:[],stats:{}};
}
function enterRoom(r,keep){
  room=r;if(!keep||!r.field)r.field=pick(PAL[r.tier]);
  DEPTH=devDepth!=null?devDepth:run&&run.list.length>1?run.i/(run.list.length-1):0;DIFF=1+DEPTH*.4;
  document.body.classList.toggle('title',r.tier===0);
  paint();hud();seedWatchers();room.init();armEye();rings.length=0;
  pending=run&&r.tier>0&&r.tier<5?ai('after',r.tier,r.id):null;
  droneLevel(run&&r.tier>0&&r.tier<6?.012+.05*DEPTH:0);
  cv.classList.toggle('hide',!r.keepCanvas);
}
async function reveal(lines){
  for(const s of lines)await typeLine(s,room.low);
  cv.classList.remove('hide');if(room.after)room.after();else showCue();
  if(eyeAt)eyeAt=performance.now()+6500;busy=false;
}
function go(next,x,y,lines=[]){
  if(busy)return;busy=true;
  next.field=pick(PAL[next.tier]);
  if(reduce){enterRoom(next,true);reveal(lines);return}
  burst.style.setProperty('--next',next.field[0]);burst.style.setProperty('--bx',x+'px');burst.style.setProperty('--by',y+'px');
  burst.classList.add('go');setTimeout(()=>enterRoom(next,true),170);
  setTimeout(()=>{burst.classList.remove('go');reveal(lines)},480);
}
function afterLine(r,gen){
  const retro=(STORY.retro||{})[r.id];
  if(gen)return gen;
  if(retro&&retro.length)return pick(retro).replace('{n}',(run&&run.stats[r.id])||'')
  const pool=(STORY.after[r.tier]||[]).filter(s=>!used.has(s));
  const s=pool.length?pick(pool):pick(STORY.after[r.tier]||['…']);used.add(s);return s;
}
// the reveal: for a beat, what you were doing turns out to be something else
let revealAt=0;
function defaultReveal(t,k){
  if(!wat.length)seedWatchers();
  if(!defaultReveal.s||defaultReveal.w!==W){defaultReveal.w=W;defaultReveal.s=Array.from({length:26},()=>({x:rnd(20,W-20),y:rnd(70,H-40),r:rnd(9,22),d:rnd(0,.5)}))}
  for(const e of defaultReveal.s)eyeGlyph(e.x,e.y,e.r,Math.max(0,Math.min(1,(k-e.d)*3)),M.x,M.y,eyeCols());
}
function doReveal(){
  busy=true;revealAt=performance.now();blip(70,.5,'sawtooth',.12);buzz([40,60,80]);droneLevel(.09);
  if(!reduce){document.body.classList.add('inv');setTimeout(()=>document.body.classList.remove('inv'),110)}
  if(run)run.stats[room.id]=room.stat??room.n??0;
  setTimeout(()=>{revealAt=0;busy=false;win()},1400);
}
function startRun(){
  if(busy)return;startDrone();run=buildRun();used.clear();
  go(run.list[0],innerWidth/2,innerHeight/2,STORY.tiers[1]||[]);
}
async function win(){
  if(busy)return;busy=true;jingle();buzz([20,30,20]);
  const x=M.x>0?M.x:W/2,y=M.y>0?M.y:H/2,cleared=room;
  meta.seen[cleared.id]=(meta.seen[cleared.id]||0)+1;if(cleared.tier===5&&run)run.stats.sneeze=0;
  if(!run||run.list.length===1){busy=false;return go(room,x,y,[])}   // single-room preview
  if(cleared.tier===5){
    const all=run.eyes>=run.list.length-1;meta.runs++;if(all)meta.full++;
    const v=all&&meta.full>=3?'loop':all?'all':run.eyes>=4?'watched':'plain';meta.ends[v]=1;saveMeta();
    const rc=shuffle(Object.entries(run.stats).filter(([id,n])=>n>0&&(STORY.recount||{})[id])).slice(0,3).map(([id,n])=>STORY.recount[id].replace('{n}',n));
    busy=false;return go(ROOMS.ending,x,y,[...rc,...(rc.length?[STORY.recountEnd||'그건 전부 누군가였다.']:[]),...STORY.endings[v]]);
  }
  saveMeta();
  const gen=await Promise.race([pending,wait(400)]);
  const next=run.list[++run.i],lines=[afterLine(cleared,gen)];
  if(next.tier!==cleared.tier)lines.push(...(STORY.tiers[next.tier]||[]));
  busy=false;go(next,x,y,lines);
}

// ---- title + ending rooms ----
reg({id:'title',tier:0,cue:'',
  init(){this.done=false;this.p=0;this.t0=performance.now()},
  down(){startRun()},
  draw(t){const f=this.field,R=Math.min(W,H)*.22*(1+.05*Math.sin(t/900));
    ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(W/2,H*.55,R,0,6.28);ctx.fill();
    ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(W/2,H*.55,R*.35,0,6.28);ctx.fill()}});
reg({id:'ending',tier:6,cue:'Again',keepCanvas:true,low:true,
  init(){this.t0=performance.now();this.closing=0;this.ready=false;this.done=false;this.p=0;this.px=0;this.py=0},
  after(){this.closing=performance.now();setTimeout(()=>{this.ready=true;showCue()},1100)},
  down(){if(this.ready){this.ready=false;run=null;go(ROOMS.title,M.x,M.y,[])}},
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
  const pool=Object.values(ROOMS).filter(r=>r.tier>0&&r.tier<6),n=document.createElement('p');n.className='nums';
  n.textContent=`방 ${pool.filter(r=>meta.seen[r.id]).length}/${pool.length}  끝 ${Object.keys(meta.ends).length}/4  회 ${meta.runs}`;
  box.appendChild(n);archEl.appendChild(box);archEl.classList.add('on');
}
$('arch').addEventListener('click',openArchive);
archEl.addEventListener('click',()=>archEl.classList.remove('on'));

// ---- input ----
function pt(e){const nx=e.clientX,ny=e.clientY;M.vx=nx-M.x;M.vy=ny-M.y;M.sx=M.sx*.6+M.vx*.4;M.sy=M.sy*.6+M.vy*.4;M.x=nx;M.y=ny}
cv.addEventListener('pointermove',e=>{if(busy)return;if(!M.active&&e.pointerType==='touch')return;pt(e);M.active=true;room.move&&room.move(e)});
cv.addEventListener('pointerdown',e=>{if(busy)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(AC&&AC.state==='suspended')AC.resume();M.x=e.clientX;M.y=e.clientY;
  ring(M.x,M.y);if(eyeHit()){collectEye();return}
  M.sx=M.sy=0;M.down=true;M.active=true;room.down&&room.down(e)});
const release=e=>{if(!M.down)return;M.down=false;if(e.pointerType==='touch')M.active=false;room.up&&room.up(e)};
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',release);
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());

function resize(initial){
  const nw=innerWidth,nh=innerHeight,big=!W||Math.abs(nw-W)>40||Math.abs(nh-H)>150;   // a mobile URL bar sliding is not a resize
  W=nw;H=nh;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  if(big&&!initial&&room&&room.init)room.init();
}
addEventListener('resize',()=>resize());

// ---- loop ----
let shown=0;
function loop(t){
  ctx.clearRect(0,0,W,H);room.draw(t);drawWatchers(t);drawEye(t);
  for(let i=rings.length-1;i>=0;i--){const g=rings[i],k=(performance.now()-g.t)/380;if(k>=1){rings.splice(i,1);continue}
    ctx.globalAlpha=1-k;ctx.strokeStyle=room.field[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.x,g.y,g.r*(1-Math.pow(1-k,3)),0,6.28);ctx.stroke();ctx.globalAlpha=1}
  glitch();
  shown+=((room.p||0)-shown)*.2;fill.style.transform='scaleX('+Math.min(1,shown).toFixed(3)+')';
  if(revealAt){const k=Math.min(1,(performance.now()-revealAt)/1100);room.reveal?room.reveal(t,k):defaultReveal(t,k)}
  if(room.done&&!busy){room.done=false;shown=0;room.tier>0&&room.tier<5?doReveal():win()}
  requestAnimationFrame(loop);
}

// ---- boot. #room=pluck&d=0.8 jumps straight into one room (handy for testing). ----
async function boot(){
  resize(true);await loadStory();
  const q=new URLSearchParams(location.hash.slice(1)),id=q.get('room');
  if(id&&ROOMS[id]){devDepth=+q.get('d')||0;run={list:[ROOMS[id]],i:0,eyes:0,found:[],stats:{}};enterRoom(ROOMS[id])}
  else enterRoom(ROOMS.title);
  cv.classList.remove('hide');showCue();busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
