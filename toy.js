'use strict';
// Achoo, the toy box. Little round friends, one finger, no words. A run is five random toys and a sneeze;
// every finished run gives a sticker, so there is always one more to find. (The puzzle game lives in escape.html.)
const $=id=>document.getElementById(id);
let ctx;const cv=$('c'),burst=$('burst'),fill=$('fill'),steps=$('steps'),root=document.documentElement,themeMeta=document.querySelector('meta[name=theme-color]');
ctx=cv.getContext('2d');
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const clamp01=v=>Math.max(0,Math.min(1,v));
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
let W,H,DPR=Math.min(devicePixelRatio||1,2);
const M={x:-9999,y:-9999,vx:0,vy:0,sx:0,sy:0,down:false,active:false};

// soft pastel fields: [background, ink, accent, alt]
const PALS=[
  ['#fff0f3','#6a4a4a','#ffb3c7','#bfe3ff'],
  ['#e8f6ff','#4f5a6b','#ffd1dc','#fff2a8'],
  ['#fff8dc','#6b5a4a','#ffc6d9','#c8ecd0'],
  ['#f1ecff','#5a4f6b','#ffc9dd','#ffe9a6'],
  ['#e9f8ee','#4f6b5a','#ffd0d8','#cfe6ff'],
  ['#ffeede','#6b524a','#ffbcc8','#cde9ff'],
];

// ---- sound: soft little blips ----
let AC;
function blip(f=500,d=.12,type='triangle',v=.1,delay=0){
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  o.frequency.exponentialRampToValueAtTime(f*1.6,t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}
}
const jingle=()=>[523,659,784,1047].forEach((f,i)=>blip(f,.16,'triangle',.09,i*.09));
function noise(d=.12,f=2000,v=.15,delay=0){try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime+delay,n=(AC.sampleRate*d)|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);const o=AC.createBufferSource();o.buffer=b;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f;fl.Q.value=.8;const g=AC.createGain();g.gain.value=v;o.connect(fl).connect(g).connect(AC.destination);o.start(t)}catch(e){}}
const crunch=()=>{noise(.09,2600+rnd(0,1500),.22);noise(.05,900,.15,.02)},popS=()=>blip(380+rnd(0,160),.07,'sine',.14),click=()=>noise(.02,5000,.2);
const squeak=k=>blip(520+k*140+rnd(0,60),.1,'sine',.08);
const PENT=[523,587,659,784,880,1047];

// ---- drawing helpers ----
function Parts(){return {a:[],burst(x,y,n,cols,s=5){for(let i=0;i<n;i++){const an=rnd(0,6.28),sp=rnd(1,s);this.a.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1.5,l:1,c:pick(cols),r:rnd(3,6),k:Math.random()<.4?1:0})}},
  draw(g=.1){for(let i=this.a.length-1;i>=0;i--){const p=this.a[i];p.x+=p.vx;p.y+=p.vy;p.vy+=g;p.l-=.018;if(p.l<=0){this.a.splice(i,1);continue}
    ctx.globalAlpha=Math.min(1,p.l*2);if(p.k)heart(p.x,p.y,p.r*p.l+2,p.c);else{ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.l+1,0,6.28);ctx.fill()}ctx.globalAlpha=1}}}}
function heart(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y+s*.9);ctx.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.4);ctx.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);ctx.fill()}
function star(x,y,s,col,rot=0){ctx.fillStyle=col;ctx.beginPath();for(let i=0;i<10;i++){const a=rot+i*Math.PI/5-Math.PI/2,r=i%2?s*.48:s;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath();ctx.fill()}
const hint=(x,y,t,r=40)=>{if(reduce)return;const k=(t%1200)/1200;ctx.globalAlpha=.5*(1-k);ctx.strokeStyle=room.field[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,6+r*k,0,6.28);ctx.stroke();ctx.globalAlpha=1};

// ---- the little friends: small round bodies, outline, dot eyes, pink cheeks. three kinds, original designs ----
const OUT='#6a4a4a',KC=['#ffffff','#cfe8ff','#fff0a6'];
function smooth(p){const n=p.length;ctx.beginPath();ctx.moveTo((p[n-1][0]+p[0][0])/2,(p[n-1][1]+p[0][1])/2);
  for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}ctx.closePath()}
function egg(r){ctx.beginPath();ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.95,-r,r*1.08,r*.2,r*.9,r*.75);ctx.bezierCurveTo(r*.7,r*1.02,-r*.7,r*1.02,-r*.9,r*.75);ctx.bezierCurveTo(-r*1.08,r*.2,-r*.95,-r,0,-r);ctx.closePath()}
function acc(i,r){   // hats and bits, sitting on top of the head
  const s=r*.3,y=-r*.98;ctx.save();ctx.translate(0,y);
  if(i===1){ctx.fillStyle='#ff8fb3';for(const k of[-1,1]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(k*s*1.5,-s*.8);ctx.lineTo(k*s*1.5,s*.8);ctx.closePath();ctx.fill();ctx.stroke()}ctx.fillStyle='#ff6fa0';ctx.beginPath();ctx.arc(0,0,s*.4,0,6.28);ctx.fill();ctx.stroke()}
  else if(i===2){ctx.fillStyle='#ff9ec2';for(let k=0;k<5;k++){const a=k*1.2566;ctx.beginPath();ctx.arc(Math.cos(a)*s*.6,Math.sin(a)*s*.6-s*.2,s*.45,0,6.28);ctx.fill();ctx.stroke()}ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.arc(0,-s*.2,s*.4,0,6.28);ctx.fill();ctx.stroke()}
  else if(i===3){ctx.fillStyle='#ffd54f';ctx.beginPath();ctx.moveTo(-s*1.2,s*.4);ctx.lineTo(-s*1.2,-s*.8);ctx.lineTo(-s*.6,-s*.2);ctx.lineTo(0,-s*1.1);ctx.lineTo(s*.6,-s*.2);ctx.lineTo(s*1.2,-s*.8);ctx.lineTo(s*1.2,s*.4);ctx.closePath();ctx.fill();ctx.stroke()}
  else if(i===4){ctx.rotate(.18);ctx.fillStyle='#9ad7ff';ctx.beginPath();ctx.moveTo(-s*1.1,s*.3);ctx.lineTo(0,-s*2.4);ctx.lineTo(s*1.1,s*.3);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffe27a';ctx.beginPath();ctx.arc(0,-s*2.4,s*.36,0,6.28);ctx.fill();ctx.stroke()}
  else if(i===5){ctx.rotate(-.5);ctx.fillStyle='#7fd6a0';ctx.beginPath();ctx.ellipse(0,-s*.9,s*.55,s*1.1,0,0,6.28);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(0,s*.2);ctx.lineTo(0,-s*1.6);ctx.stroke()}
  else if(i===6){ctx.fillStyle='#ff6b7a';ctx.beginPath();ctx.arc(0,-s*.5,s*.95,0,6.28);ctx.fill();ctx.stroke();ctx.fillStyle='#7fd6a0';ctx.beginPath();ctx.moveTo(0,-s*1.2);ctx.lineTo(-s*.8,-s*1.7);ctx.lineTo(0,-s*1.5);ctx.lineTo(s*.8,-s*1.7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffe3e6';for(const q of[[-.4,-.6],[.4,-.6],[0,-.1]]){ctx.beginPath();ctx.arc(q[0]*s,q[1]*s,s*.1,0,6.28);ctx.fill()}}
  else if(i===7){star(0,-s*.9,s*1.1,'#ffd54f');ctx.beginPath();ctx.fillStyle='#ffd54f'}
  ctx.restore()}
// o: mood happy|open|cry|sleep|squint|blink, lx/ly look-at, sx/sy squash, rot, acc 1..7, arms 0|1, step walk phase, ghost, pts (soft body), fx/fy face shift, hop
function chara(k,x,y,r,o={}){
  const mood=o.mood||'happy',lx=o.lx??x,ly=o.ly??y,ghost=o.ghost;
  ctx.save();ctx.translate(x,y-(o.hop||0));if(o.rot)ctx.rotate(o.rot);ctx.scale(o.sx||1,o.sy||1);
  ctx.lineWidth=Math.max(1.6,r*.055);ctx.lineJoin=ctx.lineCap='round';
  ctx.fillStyle=ghost?'rgba(0,0,0,.12)':KC[k];ctx.strokeStyle=ghost?'rgba(0,0,0,0)':OUT;
  const part=(fn)=>{ctx.beginPath();fn();ctx.fill();ctx.stroke()};
  for(const s of[-1,1]){   // ears
    if(k===0)part(()=>ctx.arc(s*r*.58,-r*.78,r*.3,0,6.28));
    else if(k===1)part(()=>{ctx.moveTo(s*r*.25,-r*.9);ctx.lineTo(s*r*.8,-r*1.35);ctx.lineTo(s*r*.98,-r*.55);ctx.closePath()});
    else{part(()=>ctx.ellipse(s*r*.42,-r*1.35,r*.2,r*.55,s*.12,0,6.28));if(!ghost){ctx.fillStyle='#ffc4d4';ctx.beginPath();ctx.ellipse(s*r*.42,-r*1.3,r*.09,r*.32,s*.12,0,6.28);ctx.fill();ctx.fillStyle=KC[k]}}}
  const st=o.step||0;
  for(const s of[-1,1]){   // feet and arms
    part(()=>ctx.ellipse(s*r*.4,r*.98+Math.sin(st+(s>0?0:Math.PI))*r*.07,r*.24,r*.15,0,0,6.28));
    part(()=>o.arms?ctx.ellipse(s*r*1.0,-r*.02,r*.17,r*.12,s*.9,0,6.28):ctx.ellipse(s*r*1.0,r*.32,r*.15,r*.11,-s*.5,0,6.28))}
  if(o.pts){smooth(o.pts);ctx.fill();ctx.stroke()}else{egg(r);ctx.fill();ctx.stroke()}
  if(!ghost){
    if(o.fx||o.fy)ctx.translate(o.fx||0,o.fy||0);
    ctx.fillStyle='rgba(255,150,170,.7)';for(const s of[-1,1]){ctx.beginPath();ctx.ellipse(s*r*.56,r*.14,r*.14,r*.085,0,0,6.28);ctx.fill()}
    ctx.fillStyle=ctx.strokeStyle=OUT;
    const e=r*.34,ey=-r*.03,a=Math.atan2(ly-y,lx-x),d=Math.min(r*.05,Math.hypot(lx-x,ly-y)*.02),ox=Math.cos(a)*d,oy=Math.sin(a)*d;
    for(const s of[-1,1]){
      if(mood==='blink'||mood==='sleep'){ctx.beginPath();ctx.arc(s*e,ey,r*.1,.15*Math.PI,.85*Math.PI);ctx.stroke()}
      else if(mood==='squint'){ctx.beginPath();ctx.moveTo(s*e-s*r*.1,ey-r*.09);ctx.lineTo(s*e+s*r*.07,ey);ctx.lineTo(s*e-s*r*.1,ey+r*.09);ctx.stroke()}
      else{ctx.beginPath();ctx.arc(s*e+ox,ey+oy,r*.08,0,6.28);ctx.fill();
        if(mood==='cry'){ctx.fillStyle='#8fd0ff';ctx.beginPath();ctx.ellipse(s*e*1.05,ey+r*.3,r*.05,r*.12,0,0,6.28);ctx.fill();ctx.fillStyle=OUT}}}
    if(mood==='open'){ctx.beginPath();ctx.ellipse(0,r*.3,r*.15,r*.18,0,0,6.28);ctx.fill();ctx.fillStyle='#ff8fa8';ctx.beginPath();ctx.ellipse(0,r*.37,r*.09,r*.08,0,0,6.28);ctx.fill()}
    else if(mood==='cry'){ctx.beginPath();ctx.arc(0,r*.38,r*.11,1.15*Math.PI,1.85*Math.PI);ctx.stroke()}
    else{ctx.beginPath();ctx.arc(-r*.06,r*.14,r*.07,.1*Math.PI,.9*Math.PI);ctx.arc(r*.06,r*.14,r*.07,.1*Math.PI,.9*Math.PI);ctx.stroke()}
    if(o.acc>0)acc(o.acc,r)}
  ctx.restore();
}
function food(k,x,y,s){
  ctx.save();ctx.translate(x,y);ctx.lineWidth=Math.max(1.6,s*.07);ctx.lineJoin=ctx.lineCap='round';ctx.strokeStyle=OUT;
  if(k===0){ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(0,-s);ctx.lineTo(s,s*.7);ctx.quadraticCurveTo(0,s*1.05,-s,s*.7);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#4a3a3a';ctx.fillRect(-s*.32,s*.2,s*.64,s*.62)}
  else if(k===1){ctx.fillStyle='#ff6b7a';ctx.beginPath();ctx.moveTo(0,s);ctx.bezierCurveTo(-s*1.3,s*.1,-s*.8,-s*.8,0,-s*.55);ctx.bezierCurveTo(s*.8,-s*.8,s*1.3,s*.1,0,s);ctx.fill();ctx.stroke();
    ctx.fillStyle='#7fd6a0';ctx.beginPath();ctx.moveTo(0,-s*.5);ctx.lineTo(-s*.5,-s*.95);ctx.lineTo(0,-s*.8);ctx.lineTo(s*.5,-s*.95);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#ffe3e6';for(const q of[[-.35,-.1],[.35,-.1],[0,.25],[-.2,.55],[.2,.55]]){ctx.beginPath();ctx.arc(q[0]*s,q[1]*s,s*.07,0,6.28);ctx.fill()}}
  else if(k===2){ctx.beginPath();ctx.moveTo(0,-s*1.2);ctx.lineTo(0,s*1.2);ctx.stroke();['#ffb3c7','#ffffff','#b6e3a8'].forEach((c,i)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(0,(i-1)*s*.72,s*.4,0,6.28);ctx.fill();ctx.stroke()})}
  else{ctx.fillStyle='#ffe08a';ctx.beginPath();ctx.moveTo(-s*.75,-s*.1);ctx.lineTo(s*.75,-s*.1);ctx.lineTo(s*.6,s*.8);ctx.lineTo(-s*.6,s*.8);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#c9803a';ctx.beginPath();ctx.ellipse(0,-s*.1,s*.75,s*.25,0,0,6.28);ctx.fill();ctx.stroke();ctx.fillStyle='#ff4d6d';ctx.beginPath();ctx.arc(0,-s*.4,s*.18,0,6.28);ctx.fill();ctx.stroke()}
  ctx.restore();
}
// stickers: 3 friends x 8 outfits = 24 to collect
const SK_N=24;
const sticker=(i,x,y,s,locked)=>chara(i%3,x,y+s*.2,s*.7,{acc:(i/3)|0,ghost:locked});

// ---- persisted progress ----
const ROOMS={};const reg=r=>(ROOMS[r.id]=r);
let meta={runs:0,stickers:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.toy2')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.toy2',JSON.stringify(meta))}catch(e){}};

// ---- state ----
const POOL=['crack','wrap','stretch','scratch','wind','fit','feed'];
let room,run=null,busy=true,DIFF=1,lastPal=-1;
const rings=[];const ring=(x,y,r=46)=>{if(!reduce)rings.push({x,y,r,t:performance.now()})};
function hud(){steps.innerHTML='';if(!run||room.tier!=='play')return;run.list.forEach((id,i)=>{const e=document.createElement('i');e.className=i<run.i?'done':i===run.i?'now':'';steps.appendChild(e)})}
function paint(){root.style.setProperty('--field',room.field[0]);root.style.setProperty('--ink',room.field[1]);themeMeta.content=room.field[0]}
function fieldFor(r){
  if(r.id==='title')return PALS[0];if(r.id==='book')return PALS[1];if(r.id==='reward')return PALS[2];
  let k;do{k=(Math.random()*PALS.length)|0}while(k===lastPal);lastPal=k;return PALS[k];
}
function enterRoom(r,keep){
  room=r;if(!keep||!r.field)r.field=fieldFor(r);DIFF=run&&r.tier==='play'?1+run.i*.08:1;
  document.body.classList.toggle('title',r.id==='title');
  paint();hud();r.init();rings.length=0;
}
function go(next,x,y){
  if(busy)return;busy=true;next.field=fieldFor(next);
  if(reduce){enterRoom(next,true);busy=false;return}
  burst.style.setProperty('--next',next.field[0]);burst.style.setProperty('--bx',x+'px');burst.style.setProperty('--by',y+'px');
  burst.classList.add('go');setTimeout(()=>enterRoom(next,true),170);
  setTimeout(()=>{burst.classList.remove('go');busy=false},480);
}
function startRun(){if(busy)return;run={list:[...shuffle(POOL).slice(0,5),'inflate'],i:0};go(ROOMS[run.list[0]],innerWidth/2,innerHeight/2)}
function next(){
  jingle();buzz([15,25,15]);const x=M.x>0?M.x:W/2,y=M.y>0?M.y:H/2;run.i++;
  if(run.i>=run.list.length){   // run over: a sticker, unseen ones first
    const unseen=[...Array(SK_N).keys()].filter(i=>!meta.stickers[i]),i=unseen.length?pick(unseen):(Math.random()*SK_N)|0;
    meta.stickers[i]=(meta.stickers[i]||0)+1;meta.runs++;saveMeta();ROOMS.reward.got=i;ROOMS.reward.fresh=meta.stickers[i]===1;run=null;go(ROOMS.reward,x,y)}
  else go(ROOMS[run.list[run.i]],x,y);
}

// ================= title · sticker book · reward =================
reg({id:'title',tier:'title',
  init(){this.done=false;this.p=0;this.fx=Parts();this.c=[0,1,2].map(k=>({k,h:0,v:0,ph:k*1.3}))},
  pos(i){return[W*(.2+.3*i),H*.46+(i===1?-14:6),Math.min(W*.14,64)]},
  down(){let hit=false;this.c.forEach((c,i)=>{const[x,y,R]=this.pos(i);if(Math.hypot(M.x-x,M.y-(y-c.h))<R*1.3){hit=true;c.v=9;squeak(c.k);buzz(8);this.fx.burst(x,y-R,8,['#ff9ec2','#fff','#ffd54f'],3)}});if(!hit)startRun()},
  draw(t){const f=this.field;
    this.c.forEach((c,i)=>{const[x,y,R]=this.pos(i);c.h+=c.v;c.v-=.8;if(c.h<0){c.h=0;c.v=0}
      const bl=Math.floor((t+c.ph*900)/2600)%2&&((t+c.ph*900)%2600)<160;
      chara(c.k,x,y,R,{hop:c.h,mood:c.h>0?'open':bl?'blink':'happy',arms:c.h>0?1:0,lx:M.x,ly:M.y,sy:1+(reduce?0:Math.sin(t/600+c.ph)*.025),acc:[0,2,6][i]})});
    const s=1+(reduce?0:.06*Math.sin(t/400)),px=W/2,py=H*.72;ctx.save();ctx.translate(px,py);ctx.scale(s,s);
    ctx.fillStyle=f[2];ctx.strokeStyle=OUT;ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,38,0,6.28);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.moveTo(-11,-17);ctx.lineTo(19,0);ctx.lineTo(-11,17);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
    this.fx.draw(.1)}});
reg({id:'book',tier:'book',
  init(){this.done=false;this.p=0},
  down(){go(ROOMS.title,M.x,M.y)},
  draw(t){const cols=4,rows=6,cw=W/cols,top=H*.12,ch=(H*.78)/rows,s=Math.min(cw,ch)*.34;
    for(let i=0;i<SK_N;i++){const x=cw*(i%cols+.5),y=top+ch*(((i/cols)|0)+.5),own=meta.stickers[i];
      sticker(i,x,y+(own&&!reduce?Math.sin(t/500+i)*2:0),s,!own);
      if(own>1){const n=Math.min(own-1,4);ctx.fillStyle=this.field[1];for(let k=0;k<n;k++){ctx.beginPath();ctx.arc(x-(n-1)*3+k*6,y+s*1.35,2.5,0,6.28);ctx.fill()}}}}});
reg({id:'reward',tier:'reward',
  init(){this.t0=performance.now();this.fx=Parts();this.fx.burst(W/2,H*.45,60,[...PALS[0].slice(2),'#ffd166','#fff'],8);jingle();this.done=false;this.p=0},
  down(){if(performance.now()-this.t0>700)go(ROOMS.title,M.x,M.y)},
  draw(t){const k=clamp01((performance.now()-this.t0)/500),s=Math.min(W,H)*.2*(.3+.7*(1-Math.pow(1-k,3)))*(1+.04*Math.sin(t/300));
    ctx.save();ctx.translate(W/2,H*.45);ctx.rotate(Math.sin(t/400)*.06);sticker(this.got,0,0,s,false);ctx.restore();
    if(this.fresh)for(let i=0;i<6;i++){const a=t/900+i*Math.PI/3;star(W/2+Math.cos(a)*s*1.7,H*.45+Math.sin(a)*s*1.5,10,'#ffd166',t/300)}
    this.fx.draw(.08)}});

// ================= the toys =================
// 2. stretch: grab a cheek, pull it as far as it goes, let go. Boing.
reg({id:'stretch',tier:'play',
  init(){this.k=(Math.random()*3)|0;this.R=Math.min(W,H)*.24;this.N=16;this.q=Array.from({length:this.N},(_,i)=>({a:i/this.N*6.2832,ox:0,oy:0,vx:0,vy:0}));this.g=-1;this.gox=0;this.goy=0;this.mx=0;this.n=0;this.need=Math.round(3+DIFF);this.touched=false;this.t=0;this.done=false;this.p=0;this.fx=Parts()},
  cx:0,cy:0,
  down(){this.touched=true;const cx=W/2,cy=H*.5,d=Math.hypot(M.x-cx,M.y-cy);if(d<this.R*1.4){const a=Math.atan2(M.y-cy,M.x-cx);let bi=0,bd=9;this.q.forEach((q,i)=>{let da=Math.abs(((q.a-a+9.4248)%6.2832)-3.1416);da=3.1416-da;if(da<bd){bd=da;bi=i}});this.g=bi;this.mx=0;squeak(this.k)}},
  up(){if(this.g<0)return;this.g=-1;if(this.mx>.9){this.n++;this.p=this.n/this.need;this.t=performance.now();blip(240,.25,'sine',.1);buzz([10,30,20]);this.fx.burst(W/2,H*.5,14,['#ff9ec2','#fff','#ffd54f'],6);if(this.n>=this.need)setTimeout(()=>{this.done=true},700)}},
  draw(t){const cx=W/2,cy=H*.5,R=this.R,N=this.N;
    if(this.g>=0){this.gox=M.x-(cx+Math.cos(this.q[this.g].a)*R);this.goy=M.y-(cy+Math.sin(this.q[this.g].a)*R);this.mx=Math.max(this.mx,Math.hypot(this.gox,this.goy)/R)}
    this.q.forEach((q,i)=>{if(this.g>=0){let d=Math.abs(i-this.g);d=Math.min(d,N-d);const w=Math.exp(-d*d/5);q.ox+=(this.gox*w-q.ox)*.45;q.oy+=(this.goy*w-q.oy)*.45;q.vx=q.vy=0}
      else{q.vx+=-q.ox*.16;q.vy+=-q.oy*.16;const p=this.q[(i+N-1)%N],n=this.q[(i+1)%N];q.vx+=((p.ox+n.ox)/2-q.ox)*.1;q.vy+=((p.oy+n.oy)/2-q.oy)*.1;q.vx*=.84;q.vy*=.84;q.ox+=q.vx;q.oy+=q.vy}});
    const pts=this.q.map(q=>[Math.cos(q.a)*R*1.0+q.ox,Math.sin(q.a)*R*1.0+q.oy]);let ax=0,ay=0;this.q.forEach(q=>{ax+=q.ox;ay+=q.oy});ax/=N;ay/=N;
    const mood=this.g>=0?(this.mx>.5?'squint':'open'):performance.now()-this.t<500?'open':'happy';
    if(!this.touched)hint(cx+R,cy,t,60);
    chara(this.k,cx,cy,R,{pts,mood,fx:ax*.6,fy:ay*.6,lx:M.x,ly:M.y,acc:this.k===1?1:0,arms:this.g>=0?1:0});this.fx.draw(.1)}});

// 4. scratch: a blanket hides sleepy friends. Rub it away to find them all.
reg({id:'scratch',tier:'play',
  init(){this.bc=document.createElement('canvas');this.bc.width=W;this.bc.height=H;const g=this.bg=this.bc.getContext('2d'),f=this.field;
    g.fillStyle=f[2];g.fillRect(0,0,W,H);g.fillStyle='rgba(255,255,255,.55)';for(let y=20,r=0;y<H+40;y+=44,r++)for(let x=(r%2)*22;x<W+40;x+=44){g.beginPath();g.arc(x,y,7,0,6.28);g.fill()}
    g.strokeStyle='rgba(255,255,255,.9)';g.lineWidth=3;g.setLineDash([10,8]);g.strokeRect(10,10,W-20,H-20);
    this.c=[];const R=Math.min(W*.13,54);for(let i=0;i<3;i++){for(let a=0;a<40;a++){const x=rnd(R+14,W-R-14),y=rnd(H*.2,H-R-30);if(this.c.every(c=>Math.hypot(c.x-x,c.y-y)>R*2.6)){this.c.push({x,y,R,k:i,found:0});break}}}
    this.gc=18;this.gr=32;this.grid=new Uint8Array(this.gc*this.gr);this.lx=-1;this.ly=-1;this.n=0;this.fade=0;this.touched=false;this.done=false;this.p=0;this.fx=Parts()},
  down(){this.touched=true;this.lx=M.x;this.ly=M.y;this.dab()},
  move(){if(M.down)this.dab()},
  up(){this.lx=-1},
  dab(){const g=this.bg;if(Math.random()<.5)noise(.05,1800,.07);g.globalCompositeOperation='destination-out';g.lineCap='round';g.lineWidth=70;g.beginPath();g.moveTo(this.lx<0?M.x:this.lx,this.ly<0?M.y:this.ly);g.lineTo(M.x,M.y);g.stroke();g.globalCompositeOperation='source-over';this.lx=M.x;this.ly=M.y;
    const cw=W/this.gc,ch=H/this.gr;for(let a=0;a<this.gc;a++)for(let b=0;b<this.gr;b++){if(!this.grid[b*this.gc+a]&&Math.hypot((a+.5)*cw-M.x,(b+.5)*ch-M.y)<44)this.grid[b*this.gc+a]=1}
    for(const c of this.c){if(c.found)continue;let tot=0,on=0;for(let a=0;a<this.gc;a++)for(let b=0;b<this.gr;b++){if(Math.hypot((a+.5)*cw-c.x,(b+.5)*ch-c.y)<c.R){tot++;if(this.grid[b*this.gc+a])on++}}
      if(tot&&on/tot>.6){c.found=performance.now();this.n++;this.p=this.n/3;squeak(c.k);buzz(15);this.fx.burst(c.x,c.y,14,['#ff9ec2','#fff','#ffd54f'],5);if(this.n>=3)setTimeout(()=>{this.fade=performance.now();setTimeout(()=>{this.done=true},700)},500)}}},
  draw(t){const now=performance.now();
    for(const c of this.c){const j=c.found?Math.max(0,Math.sin((now-c.found)/120))*10*Math.max(0,1-(now-c.found)/900):0;chara(c.k,c.x,c.y,c.R,{mood:c.found?'open':'sleep',hop:j,arms:c.found?1:0,acc:c.k===0?2:0})}
    if(!this.touched)hint(W/2,H/2,t,90);
    ctx.globalAlpha=this.fade?Math.max(0,1-(now-this.fade)/600):1;ctx.drawImage(this.bc,0,0,W,H);ctx.globalAlpha=1;this.fx.draw(.1)}});

// 5. wind: turn the music box key by circling your finger around it. Round and round and they dance.
reg({id:'wind',tier:'play',
  init(){this.w=0;this.last=0;this.step=0;this.need=Math.PI*2*3;this.touched=false;this.fin=0;this.done=false;this.p=0;this.fx=Parts();this.cx=W/2;this.cy=H*.62;this.ks=[0,1,2].sort(()=>Math.random()-.5)},
  down(){this.touched=true;this.last=Math.atan2(M.y-this.cy,M.x-this.cx)},
  move(){if(!M.down||this.fin)return;if(Math.hypot(M.x-this.cx,M.y-this.cy)<30)return;const a=Math.atan2(M.y-this.cy,M.x-this.cx);let d=a-this.last;if(d>Math.PI)d-=6.2832;if(d<-Math.PI)d+=6.2832;this.last=a;
    this.w=Math.max(0,Math.min(this.need,this.w+d));this.p=this.w/this.need;const s=Math.floor(this.w/(Math.PI/6));if(s!==this.step){this.step=s;click();blip(PENT[s%PENT.length],.18,'triangle',.08);buzz(6)}
    if(this.w>=this.need&&!this.fin){this.fin=performance.now();jingle();this.fx.burst(W/2,H*.3,60,['#ff9ec2','#fff','#ffd54f','#bfe3ff'],8);setTimeout(()=>{this.done=true},1200)}},
  draw(t){const f=this.field,cx=this.cx,cy=this.cy,p=this.p,R=Math.min(W*.3,120);
    ctx.fillStyle=f[3];ctx.strokeStyle=OUT;ctx.lineWidth=4;ctx.beginPath();ctx.roundRect(W/2-Math.min(W*.4,170),cy-R*1.1,Math.min(W*.8,340),R*2.2,26);ctx.fill();ctx.stroke();
    if(!this.touched){ctx.strokeStyle=f[1];ctx.globalAlpha=.5;ctx.lineWidth=4;ctx.setLineDash([3,14]);ctx.lineCap='round';ctx.beginPath();ctx.arc(cx,cy,R*.95,t/500,t/500+4.7);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1}
    ctx.save();ctx.translate(cx,cy);ctx.rotate(this.w);ctx.fillStyle=f[2];ctx.lineWidth=4;ctx.strokeStyle=OUT;
    for(const s of[-1,1]){ctx.beginPath();ctx.ellipse(s*R*.38,0,R*.36,R*.22,0,0,6.28);ctx.fill();ctx.stroke()}ctx.fillStyle='#ffd54f';ctx.beginPath();ctx.arc(0,0,R*.16,0,6.28);ctx.fill();ctx.stroke();ctx.restore();
    const fr=this.fin?9:2+p*6,rr=Math.min(W*.13,54);
    this.ks.forEach((k,i)=>{const x=W*(.22+.28*i),y=H*.3,hop=Math.max(0,Math.sin(t/1000*fr+i*1.7))*(p*26+(this.fin?18:0));
      chara(k,x,y,rr,{hop,mood:p>.02?'open':'happy',arms:p>.5?1:0,rot:p>.3?Math.sin(t/(900/fr)+i)*.12*p:0,acc:i===1?7:0,lx:cx,ly:cy,step:t/120})});
    if(p>.05&&!reduce&&Math.random()<.08*p+.02){const x=W*rnd(.15,.85);this.fx.a.push({x,y:H*.2,vx:rnd(-.5,.5),vy:rnd(-1.8,-.8),l:1,c:pick(['#ff9ec2','#ffd54f','#9ad7ff']),r:rnd(4,7),k:1})}
    this.fx.draw(-.01)}});

// 1. crack: a wax-shelled ball with a friend inside. Tap, tap, tap... crunch, and out they pop.
const WAX=['#ffb3c7','#9ad7ff','#b6e3a8','#ffe08a','#c9b6ff','#ffc09a'];
reg({id:'crack',tier:'play',
  init(){this.n=0;this.need=3;this.touched=false;this.done=false;this.p=0;this.fx=Parts();this.sh=[];this.newBall()},
  newBall(){this.col=pick(WAX);this.k=(Math.random()*3)|0;this.hits=0;this.max=7+((Math.random()*3)|0);this.cr=[];this.sq=0;this.born=performance.now();this.state=0;this.t1=0;this.R=Math.min(W,H)*.25},
  down(){this.touched=true;if(this.state||performance.now()-this.born<250)return;const cx=W/2,cy=H*.48;if(Math.hypot(M.x-cx,M.y-cy)>this.R*1.25)return;
    this.hits++;this.sq=1;crunch();buzz(this.hits>=this.max?[30,20,40]:12);
    const a0=Math.atan2(M.y-cy,M.x-cx),px=Math.max(-this.R*.8,Math.min(this.R*.8,M.x-cx)),py=Math.max(-this.R*.8,Math.min(this.R*.8,M.y-cy));
    for(let b=0;b<3;b++){let x=px,y=py,a=a0+rnd(-1.6,1.6);const seg=[[x,y]];for(let s=0;s<4;s++){a+=rnd(-.6,.6);x+=Math.cos(a)*this.R*rnd(.1,.2);y+=Math.sin(a)*this.R*rnd(.1,.2);seg.push([x,y])}this.cr.push(seg)}
    for(let i=0;i<5;i++)this.fx.a.push({x:M.x,y:M.y,vx:rnd(-3,3),vy:rnd(-4,-1),l:.8,c:this.col,r:rnd(2,4),k:0});
    if(this.hits>=this.max)this.shatter()},
  shatter(){this.state=1;this.t1=performance.now();const cx=W/2,cy=H*.48;crunch();setTimeout(crunch,60);buzz([40,30,60]);
    for(let i=0;i<18;i++){const a=i/18*6.28+rnd(-.2,.2);this.sh.push({x:cx+Math.cos(a)*this.R*.5,y:cy+Math.sin(a)*this.R*.5,vx:Math.cos(a)*rnd(3,9),vy:Math.sin(a)*rnd(3,9)-3,r:rnd(8,20),rot:rnd(0,6),vr:rnd(-.3,.3),c:this.col})}
    this.fx.burst(cx,cy,24,['#fff',this.col,'#ffd54f'],7);
    this.n++;this.p=this.n/this.need;squeak(this.k);
    setTimeout(()=>{if(this.n>=this.need)this.done=true;else this.newBall()},1100)},
  draw(t){const cx=W/2,cy=H*.48,R=this.R,now=performance.now();this.sq*=.82;
    if(this.state){const k=clamp01((now-this.t1)/260),hop=Math.abs(Math.sin((now-this.t1)/160))*30*Math.max(0,1-(now-this.t1)/1000);
      chara(this.k,cx,cy,R*.75*(.4+.6*(1-Math.pow(1-k,3))),{mood:'open',arms:1,hop,acc:this.k===2?6:0})}
    else{const grow=clamp01((now-this.born)/300),s=(.5+.5*(1-Math.pow(1-grow,3)))*(1+this.sq*.1);
      ctx.save();ctx.translate(cx,cy);ctx.scale(s*(1+this.sq*.06),s*(1-this.sq*.06));
      if(this.hits>this.max*.5)chara(this.k,0,0,R*.6,{mood:'blink'});
      ctx.globalAlpha=this.hits>this.max*.5?.82:1;ctx.fillStyle=this.col;ctx.strokeStyle=OUT;ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,R,0,6.28);ctx.fill();ctx.stroke();ctx.globalAlpha=1;
      ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.ellipse(-R*.38,-R*.4,R*.2,R*.12,-.6,0,6.28);ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=3;ctx.lineCap='round';for(let i=0;i<14;i++){ctx.beginPath();const a=i*2.4,r=R*(.35+(i%5)*.12);ctx.arc(Math.cos(a)*r,Math.sin(a)*r+R*.1,1,0,6.28);ctx.stroke()}
      ctx.strokeStyle=OUT;ctx.lineWidth=2.5;for(const sg of this.cr){ctx.beginPath();sg.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.stroke()}
      ctx.restore()}
    if(!this.touched)hint(cx,cy,t,R*.7);
    for(let i=this.sh.length-1;i>=0;i--){const s=this.sh[i];s.x+=s.vx;s.y+=s.vy;s.vy+=.5;s.rot+=s.vr;if(s.y>H+40){this.sh.splice(i,1);continue}
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);ctx.fillStyle=s.c;ctx.strokeStyle=OUT;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-s.r,s.r*.6);ctx.lineTo(0,-s.r);ctx.lineTo(s.r,s.r*.5);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore()}
    this.fx.draw(.15)}});

// 3. wrap: a sheet of bubbles. Tap or sweep; some hide a friend.
reg({id:'wrap',tier:'play',
  init(){const r=Math.min(W/10,34),dx=r*2.15,dy=r*1.9;this.r=r;this.b=[];let row=0;for(let y=70+r;y<H-r;y+=dy,row++)for(let x=(row%2?dx/2:0)+r+4;x<W-r+2;x+=dx)this.b.push({x,y,pop:0,k:Math.random()<.12?(Math.random()*3)|0:-1,c:Math.random()});
    this.need=Math.floor(this.b.length*.85);this.n=0;this.last=0;this.touched=false;this.done=false;this.p=0;this.fx=Parts()},
  down(){this.touched=true;this.hit()},move(){if(M.down)this.hit()},
  hit(){const now=performance.now();for(const b of this.b){if(!b.pop&&Math.hypot(b.x-M.x,b.y-M.y)<this.r*.95){b.pop=now;this.n++;this.p=this.n/this.need;if(now-this.last>35){popS();buzz(6);this.last=now}if(b.k>=0)squeak(b.k);this.fx.burst(b.x,b.y,5,['#fff',this.field[2],this.field[3]],3);if(this.n>=this.need)this.done=true}}},
  draw(t){const f=this.field,r=this.r,now=performance.now();
    for(const b of this.b){if(b.pop){const k=clamp01((now-b.pop)/220);
        ctx.fillStyle='rgba(255,255,255,.35)';ctx.beginPath();ctx.arc(b.x,b.y,r*(.55+.1*k),0,6.28);ctx.fill();
        if(b.k>=0)chara(b.k,b.x,b.y-Math.sin(k*3.14)*10,r*.85,{mood:'open'});
        ctx.strokeStyle=f[1];ctx.globalAlpha=.25;ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,r*.55,.2,2.6);ctx.stroke();ctx.globalAlpha=1}
      else{ctx.fillStyle=b.c<.5?f[3]:f[2];ctx.globalAlpha=.55;ctx.beginPath();ctx.arc(b.x,b.y,r,0,6.28);ctx.fill();ctx.globalAlpha=1;ctx.strokeStyle=f[1];ctx.lineWidth=2.5;ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.85)';ctx.beginPath();ctx.ellipse(b.x-r*.32,b.y-r*.34,r*.22,r*.13,-.7,0,6.28);ctx.fill();
        if(b.k>=0){ctx.globalAlpha=.55;chara(b.k,b.x,b.y+2,r*.6,{mood:'sleep'});ctx.globalAlpha=1}}}
    if(!this.touched)hint(W/2,H/2,t,70);this.fx.draw(.1)}});

// 6. fit: every friend has its own snug spot. Drag close and it clicks into place.
reg({id:'fit',tier:'play',
  init(){const r=Math.min(W*.1,42);this.r=r;const ks=shuffle([0,1,2,(Math.random()*3)|0]),xs=[.14,.38,.62,.86];this.sl=ks.map((k,i)=>({k,x:W*xs[i],y:H*.3,occ:false}));
    this.c=shuffle(ks.slice()).map((k,i)=>({k,x:W*xs[i],y:H*.7,hx:W*xs[i],hy:H*.7,placed:-1,sq:0}));this.d=null;this.n=0;this.touched=false;this.fin=0;this.done=false;this.p=0;this.fx=Parts()},
  down(){this.touched=true;const c=this.c.filter(c=>c.placed<0).find(c=>Math.hypot(M.x-c.x,M.y-c.y)<this.r*1.6);if(c){this.d=c;squeak(c.k);this.c.splice(this.c.indexOf(c),1);this.c.push(c)}},
  target(c){return this.sl.find(s=>!s.occ&&s.k===c.k&&Math.hypot(s.x-c.x,s.y-c.y)<this.r*3)},
  up(){const c=this.d;if(!c)return;this.d=null;const s=this.sl.find(s=>!s.occ&&s.k===c.k&&Math.hypot(s.x-c.x,s.y-c.y)<this.r*2.2);
    if(s){s.occ=true;c.placed=1;c.x=s.x;c.y=s.y;c.sq=1;this.n++;this.p=this.n/4;click();blip(700+this.n*80,.1);buzz([12,18,12]);this.fx.burst(s.x,s.y,12,['#ff9ec2','#fff','#ffd54f'],4);
      if(this.n>=4){this.fin=performance.now();setTimeout(jingle,200);setTimeout(()=>{this.done=true},1100)}}},
  draw(t){const f=this.field,r=this.r,now=performance.now();
    for(const s of this.sl){ctx.globalAlpha=s.occ?0:.3;chara(s.k,s.x,s.y,r,{ghost:true});ctx.globalAlpha=1}
    for(const c of this.c){c.sq*=.85;
      if(c===this.d){const s=this.target(c);let tx=M.x,ty=M.y;if(s){const k=1-Math.hypot(s.x-M.x,s.y-M.y)/(r*3);tx+=(s.x-M.x)*k*.85;ty+=(s.y-M.y)*k*.85}c.x+=(tx-c.x)*.5;c.y+=(ty-c.y)*.5}
      else if(c.placed<0){c.x+=(c.hx-c.x)*.3;c.y+=(c.hy-c.y)*.3}
      const j=this.fin?Math.max(0,Math.sin((now-this.fin)/120+c.x/90))*14:0;
      chara(c.k,c.x,c.y,r*(c===this.d?1.1:1),{sx:1+c.sq*.15,sy:1-c.sq*.15,mood:c===this.d||this.fin?'open':'happy',arms:c===this.d||this.fin?1:0,hop:j,lx:M.x,ly:M.y})}
    if(!this.touched){const c=this.c[0];if(c)hint(c.x,c.y,t,50)}
    this.fx.draw(.1)}});

// 7. feed: any snack, straight into the mouth. Munch.
reg({id:'feed',tier:'play',
  init(){this.k=(Math.random()*3)|0;this.R=Math.min(W*.2,92);this.n=0;this.need=5;this.eatT=0;this.d=null;this.touched=false;this.done=false;this.p=0;this.fx=Parts();this.round()},
  round(){this.fd=[0,1,2].map(i=>({k:(Math.random()*4)|0,hx:W*(.2+.3*i),hy:H*.8,x:W*(.2+.3*i),y:H*.8+60,s:0}))},
  mouth(){return[W/2,H*.34+this.R*.3]},
  down(){this.touched=true;if(performance.now()-this.eatT<350)return;const f=this.fd.find(f=>Math.hypot(M.x-f.x,M.y-f.y)<50);if(f){this.d=f;squeak(f.k)}},
  up(){const f=this.d;if(!f)return;this.d=null;const[mx,my]=this.mouth();
    if(Math.hypot(f.x-mx,f.y-my)<this.R*.8){this.fd.splice(this.fd.indexOf(f),1);this.n++;this.p=this.n/this.need;this.eatT=performance.now();crunch();blip(520,.1);buzz([10,20,10]);this.fx.burst(mx,my,12,['#ff9ec2','#fff','#ffd54f'],5);
      if(this.n>=this.need)setTimeout(()=>{this.done=true},700);else if(!this.fd.length)setTimeout(()=>this.round(),400)}},
  draw(t){const now=performance.now(),R=this.R,cx=W/2,cy=H*.34,[mx,my]=this.mouth();
    let near=0;if(this.d)near=clamp01(1-(Math.hypot(this.d.x-mx,this.d.y-my)-R*.8)/200);
    const eating=now-this.eatT<400;
    chara(this.k,cx,cy,R,{mood:eating?'squint':near>.3?'open':'happy',sx:eating?1+Math.sin(now/50)*.05:1+near*.04,sy:eating?1-Math.sin(now/50)*.05:1,lx:this.d?this.d.x:M.x,ly:this.d?this.d.y:M.y,acc:this.k===2?4:0,arms:near>.3?1:0});
    for(const q of this.fd){q.s+=(1-q.s)*.2;if(q===this.d){q.x+=(M.x-q.x)*.6;q.y+=(M.y-q.y)*.6}else{q.x+=(q.hx-q.x)*.25;q.y+=(q.hy-q.y)*.25}food(q.k,q.x,q.y-(q===this.d?10:0),Math.min(W*.07,30)*q.s)}
    if(!this.touched&&this.fd[0])hint(this.fd[0].hx,this.fd[0].hy,t,50);
    this.fx.draw(.1)}});

// finale: hold to puff the cheeks. Let go inside the ring and it goes "achoo!" (the sneeze, made friendly)
reg({id:'inflate',tier:'play',lo:.78,hi:.92,over:.97,
  init(){this.m=0;this.t0=0;this.shake=0;this.done=false;this.p=0;this.won=false;this.fx=Parts();this.k=(Math.random()*3)|0;this.winT=0},
  down(){if(this.won)return;this.t0=performance.now();blip(220,.2,'sine',.05)},
  up(){if(this.won||!this.t0)return;const m=this.m;this.t0=0;if(m>=this.lo&&m<=this.hi)this.win();else if(m>.05)this.fail()},
  fail(){this.t0=0;this.m=0;this.shake=performance.now();buzz([20,30,20]);blip(260,.2,'sine',.06)},
  win(){const f=this.field,R=Math.min(W,H*.8)*.4;this.won=true;this.winT=performance.now();this.fx.burst(W/2,H*.46,60,[f[2],f[3],'#ffd166','#ffffff','#ff9ec2'],11);
    for(let i=0;i<40;i++)this.fx.a.push({x:W/2,y:H*.46,vx:rnd(-9,9),vy:rnd(-4,3),l:1.4,c:'#fff',r:rnd(4,8),k:0});jingle();buzz([20,40,20,40,60]);setTimeout(()=>{this.done=true},1300)},
  draw(t){const f=this.field,R=Math.min(W,H*.8)*.4,cx=W/2,cy=H*.46;
    if(this.t0){this.m=Math.min(1,(performance.now()-this.t0)/1800);if(this.m>this.over)this.fail()}
    this.p=this.m*.9;let ox=0;if(this.shake&&performance.now()-this.shake<350)ox=Math.sin(t/20)*10;
    ctx.save();ctx.translate(ox,0);
    if(!this.won){ctx.strokeStyle=f[1];ctx.globalAlpha=.4;ctx.lineWidth=R*(this.hi-this.lo)*.6;ctx.setLineDash([14,12]);ctx.beginPath();ctx.arc(cx,cy,R*(this.lo+this.hi)/2*.62,0,6.28);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      const near=this.m>=this.lo&&this.m<=this.hi,r=R*.4*(1+this.m*.62)+(this.t0&&!reduce?Math.sin(t/40)*this.m*3:0);
      chara(this.k,cx,cy,r,{mood:near?'squint':this.t0?'open':'happy',sx:1+this.m*.12,sy:1-this.m*.04,acc:this.k===0?3:0,lx:M.x,ly:M.y,arms:this.t0?1:0})}
    else{const k=clamp01((performance.now()-this.winT)/400);chara(this.k,cx,cy-Math.sin(k*3.14)*40,R*.4*1.5,{mood:'squint',sx:1+(1-k)*.25,sy:1-(1-k)*.2,arms:1})}
    ctx.restore();this.fx.draw(.16)}});

// ================= input / loop =================
function pt(e){const nx=e.clientX,ny=e.clientY;M.vx=nx-M.x;M.vy=ny-M.y;M.sx=M.sx*.6+M.vx*.4;M.sy=M.sy*.6+M.vy*.4;M.x=nx;M.y=ny}
cv.addEventListener('pointermove',e=>{if(busy)return;if(!M.active&&e.pointerType==='touch')return;pt(e);M.active=true;room.move&&room.move(e)});
cv.addEventListener('pointerdown',e=>{if(busy)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(AC&&AC.state==='suspended')AC.resume();pt(e);ring(M.x,M.y);M.sx=M.sy=0;M.down=true;M.active=true;room.down&&room.down(e)});
const release=e=>{if(!M.down)return;M.down=false;if(e.pointerType==='touch')M.active=false;room.up&&room.up(e)};
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',release);
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
$('book').addEventListener('click',()=>{if(!busy&&room.tier==='title')go(ROOMS.book,innerWidth/2,innerHeight/2)});
function resize(initial){
  const nw=innerWidth,nh=innerHeight,big=!W||Math.abs(nw-W)>40||Math.abs(nh-H)>150;   // a sliding mobile URL bar is not a resize
  W=nw;H=nh;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  if(big&&!initial&&room&&room.init)room.init();
}
addEventListener('resize',()=>resize());
let shown=0;
function loop(t){
  ctx.clearRect(0,0,W,H);room.draw(t);
  for(let i=rings.length-1;i>=0;i--){const g=rings[i],k=(performance.now()-g.t)/380;if(k>=1){rings.splice(i,1);continue}
    ctx.globalAlpha=1-k;ctx.strokeStyle=room.field[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(g.x,g.y,g.r*(1-Math.pow(1-k,3)),0,6.28);ctx.stroke();ctx.globalAlpha=1}
  shown+=((room.p||0)-shown)*.2;fill.style.transform='scaleX('+Math.min(1,shown).toFixed(3)+')';
  if(!busy&&room.done&&room.tier==='play'){room.done=false;shown=0;next()}
  requestAnimationFrame(loop);
}
// #room=feed jumps straight into one toy (handy for testing)
function boot(){
  resize(true);const id=new URLSearchParams(location.hash.slice(1)).get('room');
  if(id&&ROOMS[id]){run={list:[id],i:0};enterRoom(ROOMS[id])}else enterRoom(ROOMS.title);
  busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
