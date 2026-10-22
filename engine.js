'use strict';
// Achoo engine. One game = four floors of a closed hospital. No sentences anywhere: the story is four pictures,
// and the floors are chained by what you carry up the stairs (see the notes strip along the bottom).
const $=id=>document.getElementById(id);
let ctx;const cv=$('c'),burst=$('burst'),fill=$('fill'),steps=$('steps'),backEl=$('back'),
  root=document.documentElement,themeMeta=document.querySelector('meta[name=theme-color]');
ctx=cv.getContext('2d');   // let: drawPanel temporarily swaps it to draw into an offscreen canvas
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const clamp01=v=>Math.max(0,Math.min(1,v));
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
let W,H,DPR=Math.min(devicePixelRatio||1,2);
const M={x:-9999,y:-9999,vx:0,vy:0,sx:0,sy:0,down:false,active:false};

// floors: lobby, ward corridor, basement records, roof. [bg, ink, accent, alt]
const CH=[
  {pal:['#0f1a3a','#f4eedd','#ffb347','#4aa8ff']},
  {pal:['#12261a','#e6f2d8','#d9ff66','#3aa86b']},
  {pal:['#3a0f16','#ffe6dc','#ff5d73','#c7344a']},
  {pal:['#1b1030','#efe6ff','#ff7ad9','#8a63ff']},
];
const COLORS=['#ff4d4d','#4da6ff','#ffd24d','#5be37a'];   // wire / button colours: the one thing that crosses floors 2 → 3
const PAL_TITLE=['#2436ff','#ffffff','#ff3b1f','#0a0a0a'],PAL_END=['#0a0a0a','#f4eedd','#ffb347','#4aa8ff'];

// ---- audio ----
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

// ---- drawing helpers ----
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
function drawArrow(d,x,y,s,col){   // 0 up · 1 right · 2 down · 3 left
  ctx.save();ctx.translate(x,y);ctx.rotate(d*Math.PI/2);ctx.fillStyle=col;ctx.beginPath();
  ctx.moveTo(0,-s);ctx.lineTo(s*.75,0);ctx.lineTo(s*.28,0);ctx.lineTo(s*.28,s);ctx.lineTo(-s*.28,s);ctx.lineTo(-s*.28,0);ctx.lineTo(-s*.75,0);ctx.closePath();ctx.fill();ctx.restore();
}
const PIPS={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[1,-1],[-1,0],[1,0],[-1,1],[1,1]]};
function drawDice(n,x,y,s,col){ctx.fillStyle=col;for(const [a,b] of PIPS[n]){ctx.beginPath();ctx.arc(x+a*s*.5,y+b*s*.5,s*.15,0,6.28);ctx.fill()}}
function drawKey(x,y,s,col){ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=s*.22;ctx.beginPath();ctx.arc(x-s*.5,y,s*.38,0,6.28);ctx.stroke();
  ctx.fillRect(x-s*.12,y-s*.11,s*1.0,s*.22);ctx.fillRect(x+s*.5,y,s*.2,s*.4);ctx.fillRect(x+s*.2,y,s*.2,s*.3)}
function drawClockFace(x,y,r,hAng,mAng,col,bg){   // angles clockwise from 12
  ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineCap='round';ctx.lineWidth=Math.max(2,r*.07);ctx.beginPath();ctx.arc(x,y,r,0,6.28);ctx.stroke();
  for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(x+Math.sin(a)*r*.82,y-Math.cos(a)*r*.82);ctx.lineTo(x+Math.sin(a)*r*.94,y-Math.cos(a)*r*.94);ctx.stroke()}
  ctx.lineWidth=Math.max(2,r*.1);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(hAng)*r*.5,y-Math.cos(hAng)*r*.5);ctx.stroke();
  ctx.lineWidth=Math.max(1.5,r*.06);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+Math.sin(mAng)*r*.8,y-Math.cos(mAng)*r*.8);ctx.stroke();
}
const TIME_H=(3+12/60)*Math.PI/6,TIME_M=12*Math.PI/30;   // 3:12, the minute the clock stopped
function drawIcon(id,x,y,s,col,f){   // one pictogram per puzzle; f = [bg,ink,accent,alt]
  ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineCap='round';ctx.lineJoin='round';
  if(id==='align'){for(let L=0;L<2;L++){ctx.globalAlpha=L?.5:1;for(let i=0;i<6;i++){const a=i*Math.PI/3+L*.35;ctx.beginPath();ctx.arc(x+Math.cos(a)*s*.75,y+Math.sin(a)*s*.75,s*.13,0,6.28);ctx.fill()}}ctx.globalAlpha=1}
  else if(id==='lantern'){ctx.beginPath();ctx.moveTo(x-s*.9,y-s*.2);ctx.lineTo(x-s*.9,y+s*.2);ctx.lineTo(x-s*.35,y+s*.2);ctx.lineTo(x-s*.35,y-s*.2);ctx.fill();ctx.globalAlpha=.45;ctx.beginPath();ctx.moveTo(x-s*.35,y-s*.2);ctx.lineTo(x+s*.95,y-s*.75);ctx.lineTo(x+s*.95,y+s*.75);ctx.lineTo(x-s*.35,y+s*.2);ctx.fill();ctx.globalAlpha=1}
  else if(id==='gaze'){for(let i=0;i<4;i++)eyeGlyph(x+(i-1.5)*s*.5,y,s*.17,1,x+s,y,[col,f[2],f[0]])}
  else if(id==='pulse'){ctx.lineWidth=s*.13;ctx.beginPath();ctx.moveTo(x-s,y);ctx.lineTo(x-s*.4,y);ctx.lineTo(x-s*.2,y-s*.7);ctx.lineTo(x+s*.15,y+s*.7);ctx.lineTo(x+s*.35,y);ctx.lineTo(x+s,y);ctx.stroke()}
  else if(id==='tear'){ctx.beginPath();ctx.moveTo(x-s*.9,y-s*.6);ctx.lineTo(x-s*.05,y-s*.7);ctx.lineTo(x-s*.2,y+s*.1);ctx.lineTo(x-s*.85,y+s*.05);ctx.fill();
    ctx.beginPath();ctx.moveTo(x+s*.1,y-s*.62);ctx.lineTo(x+s*.9,y-s*.5);ctx.lineTo(x+s*.75,y+s*.2);ctx.lineTo(x+s*.02,y+s*.12);ctx.fill();
    ctx.beginPath();ctx.moveTo(x-s*.5,y+s*.25);ctx.lineTo(x+s*.4,y+s*.35);ctx.lineTo(x+s*.3,y+s*.8);ctx.lineTo(x-s*.55,y+s*.7);ctx.fill()}
  else if(id==='clock'){drawClockFace(x,y,s*.8,Math.PI*.2,Math.PI*1.1,col,f[0])}
  else if(id==='wires'){ctx.lineWidth=s*.12;for(let i=0;i<4;i++){ctx.strokeStyle=COLORS[i];ctx.beginPath();ctx.moveTo(x-s*.9,y+(i-1.5)*s*.4);ctx.bezierCurveTo(x-s*.1,y+(i-1.5)*s*.4,x+s*.1,y+(((i+1)%4)-1.5)*s*.4,x+s*.9,y+(((i+1)%4)-1.5)*s*.4);ctx.stroke()}}
  else if(id==='simon'){for(let i=0;i<4;i++){ctx.fillStyle=COLORS[i];ctx.beginPath();ctx.arc(x+(i%2?1:-1)*s*.42,y+(i<2?-1:1)*s*.42,s*.34,0,6.28);ctx.fill()}}
  else if(id==='wipe'){ctx.lineWidth=s*.14;ctx.beginPath();ctx.ellipse(x,y,s*.55,s*.85,0,0,6.28);ctx.stroke();ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(x-s*.2,y-s*.5);ctx.lineTo(x+s*.25,y-s*.1);ctx.stroke();ctx.globalAlpha=1}
  else if(id==='dial'){ctx.lineWidth=s*.12;ctx.strokeRect(x-s*.8,y-s*.8,s*1.6,s*1.6);ctx.beginPath();ctx.arc(x,y,s*.42,0,6.28);ctx.stroke();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+s*.3,y-s*.3);ctx.stroke()}
  else if(id==='sneeze'){ctx.lineWidth=s*.12;ctx.strokeRect(x-s*.55,y-s*.9,s*1.1,s*1.8);eyeGlyph(x,y-s*.3,s*.3,1,x,y+s,[col,f[2],f[0]])}
}
function miniItem(kind,x,y,s,f){
  if(kind==='arrows')run.arrows.forEach((d,i)=>drawArrow(d,x+i*s*1.1,y,s*.42,f[2]));
  else if(kind==='key')drawKey(x+s*.6,y,s*.55,f[2]);
  else if(kind==='photo'){ctx.fillStyle='#f4eedd';ctx.fillRect(x,y-s*.5,s,s);drawClockFace(x+s*.5,y,s*.36,TIME_H,TIME_M,'#222','#f4eedd')}
  else if(kind==='badge'){ctx.fillStyle=f[1];ctx.fillRect(x,y-s*.5,s*.8,s);ctx.fillStyle=f[0];ctx.beginPath();ctx.arc(x+s*.4,y-s*.1,s*.2,0,6.28);ctx.fill();ctx.fillRect(x+s*.15,y+s*.15,s*.5,s*.15)}
  else if(kind==='colors')run.colors.forEach((c,i)=>{ctx.fillStyle=COLORS[c];ctx.beginPath();ctx.arc(x+i*s*.8+s*.3,y,s*.3,0,6.28);ctx.fill()});
  else if(kind==='digits')run.digits.forEach((d,i)=>{ctx.fillStyle=f[1];ctx.globalAlpha=.9;ctx.fillRect(x+i*s*1.2,y-s*.5,s,s);ctx.globalAlpha=1;drawDice(d,x+i*s*1.2+s*.5,y,s*.9,f[0])});
}
const NOTE_W={arrows:86,key:34,photo:26,badge:24,colors:64,digits:70};
function noteList(){const S=run.solved,l=[];if(S.lantern)l.push('arrows');if(S.gaze)l.push('key');if(S.tear)l.push('photo');if(S.clock)l.push('badge');if(S.wires)l.push('colors');if(S.wipe)l.push('digits');if(S.dial)l.push('key');return l}
function drawNotes(){
  if(!run||room.tier==='title'||room.tier==='end'||room.tier==='archive')return;const f=room.field;let x=14;
  for(const k of noteList()){miniItem(k,x,H-34,18,f);x+=NOTE_W[k]}
}

// the story, as four pictures. drawPanel(c,i,x,y,w,h): 0 holding hands · 1 the fire · 2 the lock · 3 morning
function person(c,x,y,s,col,nurse,alpha=1){c.globalAlpha=alpha;c.fillStyle=col;c.beginPath();c.arc(x,y-s*.75,s*.2,0,6.28);c.fill();
  c.beginPath();c.moveTo(x-s*.3,y+s*.5);c.lineTo(x-s*.16,y-s*.5);c.lineTo(x+s*.16,y-s*.5);c.lineTo(x+s*.3,y+s*.5);c.closePath();c.fill();
  if(nurse){c.fillRect(x-s*.22,y-s*1.02,s*.44,s*.1);c.fillStyle='#ff4d4d';c.fillRect(x-s*.04,y-s*.35,s*.08,s*.24);c.fillRect(x-s*.12,y-s*.27,s*.24,s*.08)}c.globalAlpha=1}
function drawPanel(c,i,x,y,w,h){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();const u=h/10;
  const bg=['#241c3f','#150a0a','#0c1c24','#ece6d2'][i];c.fillStyle=bg;c.fillRect(x,y,w,h);
  c.fillStyle='rgba(255,255,255,.07)';c.fillRect(x,y+h*.78,w,h*.22);
  if(i===0){c.fillStyle='#3a3366';c.fillRect(x+w*.1,y+h*.12,w*.26,h*.34);c.fillStyle='#f4eedd';c.beginPath();c.arc(x+w*.28,y+h*.24,u*.5,0,6.28);c.fill();   // window, moon
    const sv=ctx;ctx=c;drawClockFace(x+w*.78,y+h*.24,u*1.3,TIME_H,TIME_M,'#f4eedd','#241c3f');ctx=sv;
    person(c,x+w*.42,y+h*.62,u*3.2,'#f4eedd',true);person(c,x+w*.62,y+h*.7,u*2.2,'#ffb347',false);
    c.strokeStyle='#f4eedd';c.lineWidth=u*.18;c.beginPath();c.moveTo(x+w*.45,y+h*.66);c.lineTo(x+w*.59,y+h*.72);c.stroke()}
  else if(i===1){for(let k=0;k<5;k++){c.fillStyle=['#ff7a1a','#ffb347','#ffd88a'][k%3];c.beginPath();const fx=x+w*(.14+k*.05),fh=u*(3.2-k*.4);c.moveTo(fx-u*.7,y+h*.78);c.lineTo(fx,y+h*.78-fh);c.lineTo(fx+u*.7,y+h*.78);c.fill()}
    person(c,x+w*.3,y+h*.66,u*2,'#ffb347',false);person(c,x+w*.78,y+h*.58,u*3.2,'#f4eedd',true);
    c.strokeStyle='#f4eedd';c.lineWidth=u*.16;c.beginPath();c.moveTo(x+w*.72,y+h*.56);c.lineTo(x+w*.5,y+h*.52);c.stroke()}
  else if(i===2){c.fillStyle='#1d3a48';c.fillRect(x+w*.3,y+h*.1,w*.34,h*.68);c.fillStyle='#0c1c24';c.beginPath();c.arc(x+w*.47,y+h*.3,u*.7,0,6.28);c.fill();
    const sv=ctx;ctx=c;eyeGlyph(x+w*.47,y+h*.3,u*.5,1,x+w*.8,y+h*.5,['#f4eedd','#ffb347','#0c1c24']);ctx=sv;   // a child's eye at the peephole
    person(c,x+w*.8,y+h*.6,u*3.2,'#f4eedd',true);const sv2=ctx;ctx=c;drawKey(x+w*.62,y+h*.56,u*1,'#ffb347');ctx=sv2}
  else{c.fillStyle='#fffbe8';c.fillRect(x+w*.28,y+h*.06,w*.4,h*.72);for(let k=0;k<40;k++){c.fillStyle='rgba(200,170,90,.5)';c.beginPath();c.arc(x+w*(.3+((k*37)%40)/100),y+h*(.1+((k*53)%60)/100),u*.07,0,6.28);c.fill()}
    person(c,x+w*.18,y+h*.62,u*3.2,'#3b3550',true,.45)}
  c.restore();
  c.strokeStyle='#f4eedd';c.lineWidth=3;c.strokeRect(x,y,w,h);
}

// ---- registry / persisted progress ----
const ROOMS={};const reg=r=>(ROOMS[r.id]=r);
let meta={runs:0,floor:0,escaped:{},frames:{},ends:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.meta3')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.meta3',JSON.stringify(meta))}catch(e){}};

// ---- state ----
let room,run=null,busy=true,lastAct=0,sel=0,card=null;
const FLOOR_PUZ=[['lantern','gaze','tear'],['clock','wires','pulse'],['simon','wipe','dial'],['align','sneeze']];

function buildRun(f){
  const r={f,pal:CH[f].pal,solved:{},arrows:Array.from({length:4},()=>(Math.random()*4)|0),pulseK:3+((Math.random()*4)|0),
    colors:shuffle([0,1,2,3]),digits:[0,0,0].map(()=>1+((Math.random()*6)|0)),stamp:null};
  for(let i=0;i<f;i++)FLOOR_PUZ[i].forEach(id=>r.solved[id]=1);   // starting higher up: you already carry what the lower floors gave
  return r;
}
function hud(){steps.innerHTML='';if(!run||room.tier==='title'||room.tier==='end'||room.tier==='archive')return;
  FLOOR_PUZ[run.f].forEach(id=>{const e=document.createElement('i');if(run.solved[id])e.className='done';steps.appendChild(e)})}
function paint(){root.style.setProperty('--field',room.field[0]);root.style.setProperty('--ink',room.field[1]);themeMeta.content=room.field[0]}
function fieldFor(r){return r.id==='title'||r.id==='archive'?PAL_TITLE:r.id==='ending'?PAL_END:run?run.pal:PAL_TITLE}

// the hidden frame: floors 2-4 each hide a photograph. It looks like a small white square with a dark window.
let frame=null,frameAt=0;
function armFrame(){frame=null;frameAt=run&&room.id==='floor'&&run.f>=1&&!meta.frames[run.f]?performance.now()+8000:0}
const frameHit=()=>frame&&Math.hypot(frame.x-M.x,frame.y-M.y)<32;
function drawFrame(t){
  if(!frame){if(frameAt&&performance.now()>frameAt&&!busy){frame={x:rnd(40,W-40),y:rnd(120,H*.4),ph:rnd(0,6.28),born:performance.now()};frameAt=0}return}
  const k=clamp01((performance.now()-frame.born)/1200);frame.x+=Math.sin(t/1900+frame.ph)*.2;frame.y+=Math.cos(t/2300+frame.ph)*.15;
  ctx.globalAlpha=k;ctx.fillStyle='#f4eedd';ctx.fillRect(frame.x-9,frame.y-9,18,18);ctx.fillStyle=room.field[0];ctx.fillRect(frame.x-6,frame.y-6,12,9);ctx.globalAlpha=1;
}
function showCard(i){card={i,t0:performance.now()};busy=true;blip(300,.3,'triangle',.1);blip(450,.4,'triangle',.1,.12)}

function enterRoom(r,keep){
  room=r;if(!keep||!r.field)r.field=fieldFor(r);
  document.body.classList.toggle('title',r.id==='title');document.body.classList.toggle('puz',r.tier==='puz');
  paint();hud();r.init();armFrame();rings.length=0;lastAct=performance.now();
  droneLevel(run&&r.tier!=='title'&&r.tier!=='end'&&r.tier!=='archive'?.02:0);
}
function go(next,x,y){
  if(busy)return;busy=true;next.field=fieldFor(next);
  if(reduce){enterRoom(next,true);busy=false;return}
  burst.style.setProperty('--next',next.field[0]);burst.style.setProperty('--bx',x+'px');burst.style.setProperty('--by',y+'px');
  burst.classList.add('go');setTimeout(()=>enterRoom(next,true),170);
  setTimeout(()=>{burst.classList.remove('go');busy=false},480);
}
function startRun(){if(busy)return;startDrone();run=buildRun(sel);go(ROOMS.floor,innerWidth/2,innerHeight/2)}
function solved(){
  const r=room;run.solved[r.id]=1;run.stamp=r.id;if(r.id==='tear')meta.frames[0]=1;saveMeta();jingle();buzz([20,30,20]);
  if(r.id==='sneeze')return finishGame();
  go(ROOMS.floor,M.x>0?M.x:W/2,M.y>0?M.y:H/2);
}
function advance(x,y){   // up the stairs
  meta.escaped[run.f]=1;meta.floor=Math.max(meta.floor,Math.min(3,run.f+1));saveMeta();jingle();buzz([20,40,20]);
  run.f++;run.pal=CH[run.f].pal;go(ROOMS.floor,x,y);
}
function finishGame(){
  meta.escaped[3]=1;meta.runs++;meta.ends[[0,1,2,3].every(i=>meta.frames[i])?'full':'plain']=1;saveMeta();
  ROOMS.ending.variant=[0,1,2,3].every(i=>meta.frames[i])?'full':'plain';busy=false;go(ROOMS.ending,W/2,H/2);
}

// ---- title, archive, ending: all pictures ----
const floorDots=()=>[0,1,2,3].map(i=>({i,x:W/2+(i-1.5)*58,y:H*.8}));
reg({id:'title',tier:'title',
  init(){this.done=false;this.p=0;sel=Math.min(sel,meta.floor)},
  down(){for(const d of floorDots())if(Math.hypot(M.x-d.x,M.y-d.y)<30){if(d.i<=meta.floor){sel=d.i;blip(300+d.i*120,.1,'triangle',.08)}return}startRun()},
  draw(t){const f=this.field,R=Math.min(W,H)*.2*(1+.05*Math.sin(t/900));
    ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(W/2,H*.52,R,0,6.28);ctx.fill();ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(W/2,H*.52,R*.35,0,6.28);ctx.fill();
    for(const d of floorDots()){const ok=d.i<=meta.floor;ctx.globalAlpha=ok?1:.35;ctx.strokeStyle=f[1];ctx.fillStyle=f[1];ctx.lineWidth=3;
      ctx.beginPath();ctx.arc(d.x,d.y,d.i===sel?13:9,0,6.28);if(meta.escaped[d.i]||d.i===sel)ctx.fill();else ctx.stroke();ctx.globalAlpha=1}}});
reg({id:'archive',tier:'archive',
  init(){this.done=false;this.p=0},
  down(){go(ROOMS.title,M.x,M.y)},
  draw(){const pw=Math.min(W*.42,190),ph=pw*.72,gx=(W-pw*2)/3;
    for(let i=0;i<4;i++){const x=gx+(i%2)*(pw+gx),y=H*.2+((i/2)|0)*(ph+gx);
      if(meta.frames[i])drawPanel(ctx,i,x,y,pw,ph);else{ctx.fillStyle='rgba(255,255,255,.08)';ctx.fillRect(x,y,pw,ph)}}
    for(let i=0;i<4;i++){ctx.fillStyle='#fff';ctx.globalAlpha=meta.escaped[i]?1:.25;ctx.beginPath();ctx.arc(W/2+(i-1.5)*40,H*.8,9,0,6.28);ctx.fill();ctx.globalAlpha=1}}});
// the ending, wordless. full: the four photographs in order, then the figure turns to dust. plain: the light, then the dust.
reg({id:'ending',tier:'end',
  init(){this.t0=performance.now();this.done=false;this.p=0;this.dust=null;this.ready=false},
  down(){if(this.ready)go(ROOMS.title,M.x,M.y)},
  draw(t){
    const now=performance.now()-this.t0,full=this.variant==='full',pw=Math.min(W*.86,360),ph=pw*.72,px=(W-pw)/2,py=H*.28;
    let phase=now;const T=2400;
    if(full&&phase<T*4){const i=Math.floor(phase/T),k=(phase%T)/T,a=Math.min(1,k*4)*Math.min(1,(1-k)*4+.0);ctx.globalAlpha=Math.min(1,k*5)*(k>.9?(1-k)*10:1);drawPanel(ctx,i,px,py,pw,ph);ctx.globalAlpha=1;return}
    if(full)phase-=T*4;
    // light through the door
    const lk=clamp01(phase/1800);ctx.fillStyle='#fffbe8';ctx.globalAlpha=lk;ctx.fillRect(W/2-W*.2*lk,H*.18,W*.4*lk,H*.5);ctx.globalAlpha=1;
    const fx=W/2,fy=H*.52,s=Math.min(W,H)*.2;
    if(!this.dust){this.dust=Array.from({length:260},()=>({x:fx+rnd(-s*.3,s*.3),y:fy+rnd(-s*.9,s*.6),vx:rnd(-.2,.5),vy:rnd(-.5,-.05),l:rnd(.5,1)}))}
    const dk=clamp01((phase-1800)/3200);
    person(ctx,fx,fy,s,'#3b3550',true,1-dk);
    ctx.fillStyle='#3b3550';for(const d of this.dust){const k=dk;ctx.globalAlpha=Math.max(0,d.l*(1-k*.6))*Math.min(1,k*3);ctx.beginPath();ctx.arc(d.x+d.vx*k*160+Math.sin(t/700+d.y)*k*6,d.y+d.vy*k*220,2,0,6.28);ctx.fill()}ctx.globalAlpha=1;
    if(dk>=1&&!this.ready){this.ready=true}
    if(this.ready){ctx.strokeStyle='#f4eedd';ctx.lineWidth=4;ctx.beginPath();ctx.arc(W/2,H*.86,16,.5,5.6);ctx.stroke();ctx.fillStyle='#f4eedd';ctx.beginPath();ctx.moveTo(W/2+10,H*.86-22);ctx.lineTo(W/2+22,H*.86-8);ctx.lineTo(W/2+4,H*.86-6);ctx.fill()}
  }});

// ---- buttons ----
$('arch').addEventListener('click',()=>{if(!busy&&room.tier==='title')go(ROOMS.archive,innerWidth/2,innerHeight/2)});
backEl.addEventListener('click',()=>{if(!busy&&room.tier==='puz')go(ROOMS.floor,innerWidth/2,innerHeight/2)});

// ---- input ----
const rings=[];const ring=(x,y,r=46)=>{if(!reduce)rings.push({x,y,r,t:performance.now()})};
function pt(e){const nx=e.clientX,ny=e.clientY;M.vx=nx-M.x;M.vy=ny-M.y;M.sx=M.sx*.6+M.vx*.4;M.sy=M.sy*.6+M.vy*.4;M.x=nx;M.y=ny;lastAct=performance.now()}
cv.addEventListener('pointermove',e=>{if(busy)return;if(!M.active&&e.pointerType==='touch')return;pt(e);M.active=true;room.move&&room.move(e)});
cv.addEventListener('pointerdown',e=>{
  if(card){if(performance.now()-card.t0>800){card=null;busy=false}return}
  if(busy)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(AC&&AC.state==='suspended')AC.resume();pt(e);ring(M.x,M.y);
  if(frameHit()){const i=run.f;frame=null;meta.frames[i]=1;saveMeta();showCard(i);return}
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
  ctx.clearRect(0,0,W,H);room.draw(t);drawNotes();drawFrame(t);
  for(let i=rings.length-1;i>=0;i--){const g=rings[i],k=(performance.now()-g.t)/380;if(k>=1){rings.splice(i,1);continue}
    ctx.globalAlpha=1-k;ctx.strokeStyle=room.field[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.x,g.y,g.r*(1-Math.pow(1-k,3)),0,6.28);ctx.stroke();ctx.globalAlpha=1}
  if(card){const k=clamp01((performance.now()-card.t0)/500),pw=Math.min(W*.86,360),ph=pw*.72;ctx.fillStyle='rgba(0,0,0,'+.8*k+')';ctx.fillRect(0,0,W,H);
    ctx.globalAlpha=k;drawPanel(ctx,card.i,(W-pw)/2,H*.3,pw,ph);ctx.globalAlpha=1}
  shown+=((room.p||0)-shown)*.2;fill.style.transform='scaleX('+Math.min(1,shown).toFixed(3)+')';
  if(!busy){
    if(room.done&&room.tier==='puz'){room.done=false;shown=0;solved()}
    else if(run&&room.tier!=='title'&&room.tier!=='end'&&room.tier!=='archive'&&performance.now()-lastAct>40000){   // after a long silence, a nudge: no words
      lastAct=performance.now();room.hintNow?room.hintNow():room.tier==='puz'&&(backEl.classList.add('nudge'),setTimeout(()=>backEl.classList.remove('nudge'),4000))}
  }
  requestAnimationFrame(loop);
}

// ---- boot. #room=clock jumps into one puzzle (handy for testing). ----
async function boot(){
  resize(true);sel=meta.floor;
  const q=new URLSearchParams(location.hash.slice(1)),id=q.get('room');
  if(id&&ROOMS[id]){const f=q.get('f')!=null?+q.get('f'):Math.max(0,FLOOR_PUZ.findIndex(l=>l.includes(id)));run=buildRun(f);enterRoom(ROOMS[id])}
  else enterRoom(ROOMS.title);
  busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
