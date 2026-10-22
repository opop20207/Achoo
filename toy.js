'use strict';
// Achoo, the toy box. Cute little toys, one finger, no words. A run is six random toys and a balloon;
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

// bright, soft palettes: [background, ink, accent, alt]
const PALS=[
  ['#ffd6e8','#4a2b5a','#ff6fa5','#7ad7f0'],
  ['#c9f0ff','#1f3a5f','#ffb347','#ff6fa5'],
  ['#fff3b0','#5a3a1a','#ff7a59','#59c3c3'],
  ['#d6f5d6','#1f4d3a','#ff8fab','#ffd166'],
  ['#e5d4ff','#3b2a6b','#ffb3c6','#8be0d0'],
  ['#ffe1c6','#5a2a2a','#ff5d73','#4aa8ff'],
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

// ---- drawing helpers ----
function Parts(){return {a:[],burst(x,y,n,cols,s=5){for(let i=0;i<n;i++){const an=rnd(0,6.28),sp=rnd(1,s);this.a.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1.5,l:1,c:pick(cols),r:rnd(3,6),k:Math.random()<.4?1:0})}},
  draw(g=.1){for(let i=this.a.length-1;i>=0;i--){const p=this.a[i];p.x+=p.vx;p.y+=p.vy;p.vy+=g;p.l-=.018;if(p.l<=0){this.a.splice(i,1);continue}
    ctx.globalAlpha=Math.min(1,p.l*2);if(p.k)heart(p.x,p.y,p.r*p.l+2,p.c);else{ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.l+1,0,6.28);ctx.fill()}ctx.globalAlpha=1}}}}
function heart(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y+s*.9);ctx.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.4);ctx.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);ctx.fill()}
function star(x,y,s,col,rot=0){ctx.fillStyle=col;ctx.beginPath();for(let i=0;i<10;i++){const a=rot+i*Math.PI/5-Math.PI/2,r=i%2?s*.48:s;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath();ctx.fill()}
function face(x,y,r,ink,mood='happy',lx=x,ly=y){   // two dots, two cheeks, a smile
  const e=r*.3,ey=y-r*.08,a=Math.atan2(ly-ey,lx-x),d=Math.min(r*.05,Math.hypot(lx-x,ly-ey)*.02),ox=Math.cos(a)*d,oy=Math.sin(a)*d;
  ctx.fillStyle=ink;ctx.strokeStyle=ink;ctx.lineWidth=Math.max(2,r*.07);ctx.lineCap='round';
  for(const s of[-1,1]){if(mood==='blink'){ctx.beginPath();ctx.arc(x+s*e,ey,r*.1,.15*Math.PI,.85*Math.PI);ctx.stroke()}else{ctx.beginPath();ctx.arc(x+s*e+ox,ey+oy,r*.09,0,6.28);ctx.fill()}}
  ctx.globalAlpha=.45;ctx.fillStyle='#ffffff';for(const s of[-1,1]){ctx.beginPath();ctx.arc(x+s*r*.52,y+r*.2,r*.12,0,6.28);ctx.fill()}ctx.globalAlpha=1;
  ctx.strokeStyle=ink;ctx.fillStyle=ink;
  if(mood==='open'){ctx.beginPath();ctx.ellipse(x,y+r*.28,r*.14,r*.17,0,0,6.28);ctx.fill()}
  else{ctx.beginPath();ctx.arc(x,y+r*.12,r*.2,.15*Math.PI,.85*Math.PI);ctx.stroke()}
}
// stickers: 8 shapes x 3 ear styles = 24 to collect
const SK_COL=['#ff6fa5','#7ad7f0','#ffb347','#8be0a0','#b79bff','#ffd166','#ff8a7a','#6fd1c4'],SK_N=24;
function sticker(i,x,y,s,locked){
  const b=i%8,ear=((i/8)|0)%3,col=locked?'rgba(0,0,0,.14)':SK_COL[(i*3)%8];ctx.fillStyle=col;
  if(ear===1){for(const k of[-1,1]){ctx.beginPath();ctx.moveTo(x+k*s*.2,y-s*.9);ctx.lineTo(x+k*s*.85,y-s*.55);ctx.lineTo(x+k*s*.75,y-s*1.25);ctx.closePath();ctx.fill()}}
  if(ear===2){for(const k of[-1,1]){ctx.beginPath();ctx.ellipse(x+k*s*.4,y-s*1.0,s*.17,s*.5,k*.15,0,6.28);ctx.fill()}}
  ctx.beginPath();
  if(b===0)ctx.arc(x,y,s,0,6.28);
  else if(b===1){heart(x,y,s*1.05,col);ctx.beginPath()}
  else if(b===2){star(x,y,s*1.15,col);ctx.beginPath()}
  else if(b===3){ctx.arc(x-s*.5,y+s*.1,s*.5,0,6.28);ctx.arc(x+s*.5,y+s*.1,s*.5,0,6.28);ctx.arc(x,y-s*.25,s*.65,0,6.28);ctx.rect(x-s*.5,y+s*.1,s,s*.5)}
  else if(b===4){ctx.arc(x,y+s*.2,s*.8,0,6.28);ctx.moveTo(x-s*.7,y);ctx.lineTo(x,y-s*1.2);ctx.lineTo(x+s*.7,y)}
  else if(b===5){for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.moveTo(x+Math.cos(a)*s*.7+s*.42,y+Math.sin(a)*s*.7);ctx.arc(x+Math.cos(a)*s*.7,y+Math.sin(a)*s*.7,s*.42,0,6.28)}ctx.moveTo(x+s*.6,y);ctx.arc(x,y,s*.6,0,6.28)}
  else if(b===6){const r=s*.28,l=x-s*.9,t=y-s*.9,w=s*1.8;ctx.moveTo(l+r,t);ctx.arcTo(l+w,t,l+w,t+w,r);ctx.arcTo(l+w,t+w,l,t+w,r);ctx.arcTo(l,t+w,l,t,r);ctx.arcTo(l,t,l+w,t,r)}
  else{for(let k=0;k<6;k++){const a=k*Math.PI/3-Math.PI/6;k?ctx.lineTo(x+Math.cos(a)*s,y+Math.sin(a)*s):ctx.moveTo(x+Math.cos(a)*s,y+Math.sin(a)*s)}ctx.closePath()}
  if(b!==1&&b!==2)ctx.fill();
  if(!locked)face(x,y+s*.08,s*.75,'#3b2a4a','happy');
}

// ---- persisted progress ----
const ROOMS={};const reg=r=>(ROOMS[r.id]=r);
let meta={runs:0,stickers:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.toy1')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.toy1',JSON.stringify(meta))}catch(e){}};

// ---- state ----
const POOL=['pop','hold','eat','fling','poke','paint','stack','pet','catch','grow'];
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
function startRun(){if(busy)return;run={list:[...shuffle(POOL).slice(0,6),'inflate'],i:0};go(ROOMS[run.list[0]],innerWidth/2,innerHeight/2)}
function next(){
  jingle();buzz([15,25,15]);const x=M.x>0?M.x:W/2,y=M.y>0?M.y:H/2;run.i++;
  if(run.i>=run.list.length){   // run over: a sticker, unseen ones first
    const unseen=[...Array(SK_N).keys()].filter(i=>!meta.stickers[i]),i=unseen.length?pick(unseen):(Math.random()*SK_N)|0;
    meta.stickers[i]=(meta.stickers[i]||0)+1;meta.runs++;saveMeta();ROOMS.reward.got=i;ROOMS.reward.fresh=meta.stickers[i]===1;run=null;go(ROOMS.reward,x,y)}
  else go(ROOMS[run.list[run.i]],x,y);
}

// ================= title · sticker book · reward =================
reg({id:'title',tier:'title',
  init(){this.done=false;this.p=0},
  down(){startRun()},
  draw(t){const f=this.field,R=Math.min(W,H)*.22*(1+.04*Math.sin(t/700)),cx=W/2,cy=H*.54;
    ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(cx,cy,R,0,6.28);ctx.fill();
    for(const k of[-1,1]){ctx.beginPath();ctx.arc(cx+k*R*.62,cy-R*.78,R*.28,0,6.28);ctx.fill()}
    face(cx,cy,R*1.25,f[1],Math.floor(t/2600)%2&&(t%2600)<160?'blink':'happy',M.x,M.y)}});
reg({id:'book',tier:'book',
  init(){this.done=false;this.p=0},
  down(){go(ROOMS.title,M.x,M.y)},
  draw(t){const cols=4,rows=6,cw=W/cols,top=H*.1,ch=(H*.8)/rows,s=Math.min(cw,ch)*.34;
    for(let i=0;i<SK_N;i++){const x=cw*(i%cols+.5),y=top+ch*(((i/cols)|0)+.5),own=meta.stickers[i];
      sticker(i,x,y+(own?Math.sin(t/500+i)*2:0),s,!own);
      if(own>1){const n=Math.min(own-1,4);ctx.fillStyle=this.field[1];for(let k=0;k<n;k++){ctx.beginPath();ctx.arc(x-(n-1)*3+k*6,y+s*1.3,2.5,0,6.28);ctx.fill()}}}}});
reg({id:'reward',tier:'reward',
  init(){this.t0=performance.now();this.fx=Parts();this.fx.burst(W/2,H*.45,60,[...PALS[0].slice(2),'#ffd166','#fff'],8);jingle();this.done=false;this.p=0},
  down(){if(performance.now()-this.t0>700)go(ROOMS.title,M.x,M.y)},
  draw(t){const k=clamp01((performance.now()-this.t0)/500),s=Math.min(W,H)*.2*(.3+.7*(1-Math.pow(1-k,3)))*(1+.05*Math.sin(t/300));
    ctx.save();ctx.translate(W/2,H*.45);ctx.rotate(Math.sin(t/400)*.08);sticker(this.got,0,0,s,false);ctx.restore();
    if(this.fresh)for(let i=0;i<6;i++){const a=t/900+i*Math.PI/3;star(W/2+Math.cos(a)*s*1.7,H*.45+Math.sin(a)*s*1.5,10,'#ffd166',t/300)}
    this.fx.draw(.08)}});

// ================= the toys =================
reg({id:'pop',tier:'play',   // bubbles: tap or sweep through them
  init(){this.list=[];this.n=0;this.need=Math.round(10*DIFF);this.done=false;this.p=0;this.fx=Parts();for(let i=0;i<20;i++)this.spawn()},
  spawn(x,y){const f=this.field;this.list.push({x:x??rnd(30,W-30),y:y??rnd(H*.3,H+60),r:rnd(26,60),vy:rnd(-.9,-.3),ph:rnd(0,6.28),c:pick([f[2],f[3],'#ffffff'])})},
  down(){const h=this.list.filter(b=>Math.hypot(b.x-M.x,b.y-M.y)<b.r+10).sort((a,b)=>a.r-b.r)[0];if(h)this.pop(h)},
  move(){this.down()},
  pop(b){this.list.splice(this.list.indexOf(b),1);blip(900-b.r*7,.14);buzz(8);this.fx.burst(b.x,b.y,12,[b.c,'#fff'],5);this.n++;this.p=this.n/this.need;if(this.n>=this.need)this.done=true;setTimeout(()=>this.spawn(rnd(30,W-30),H+80),500)},
  draw(t){for(const b of this.list){if(!reduce){b.y+=b.vy;b.x+=Math.sin(t/900+b.ph)*.4}if(b.y<-b.r*2)b.y=H+b.r*2;
      const w=reduce?1:1+Math.sin(t/300+b.ph)*.05;ctx.fillStyle=b.c;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r*w,b.r/w,0,0,6.28);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.arc(b.x-b.r*.35,b.y-b.r*.38,b.r*.16,0,6.28);ctx.fill()}
    this.fx.draw()}});
reg({id:'hold',tier:'play',   // hold a finger down: the sparkles come to you
  init(){this.list=[];this.done=false;this.p=0;this.t0=0;const g=26;for(let x=g/2;x<W;x+=g)for(let y=g/2;y<H;y+=g)this.list.push({hx:x,hy:y,x,y,vx:0,vy:0})},
  draw(){const f=this.field;let near=0;const R=100;
    for(const p of this.list){const dx=p.x-M.x,dy=p.y-M.y,d=Math.hypot(dx,dy)+.001;
      if(M.down){p.vx-=dx/d*Math.min(d,300)*.004;p.vy-=dy/d*Math.min(d,300)*.004;if(d<60){p.vx+=dx/d*.35;p.vy+=dy/d*.35}}
      else{if(M.active&&d<150){const k=(1-d/150)*1.6;p.vx+=dx/d*k;p.vy+=dy/d*k}p.vx+=(p.hx-p.x)*.05;p.vy+=(p.hy-p.y)*.05}
      p.vx*=M.down?.92:.86;p.vy*=M.down?.92:.86;p.x+=p.vx;p.y+=p.vy;if(M.down&&d<R)near++;
      const s=Math.hypot(p.vx,p.vy);ctx.fillStyle=s>1.2?f[2]:f[3];ctx.beginPath();ctx.arc(p.x,p.y,2+Math.min(s*.6,4),0,6.28);ctx.fill()}
    const q=M.down?near/(this.list.length*.9):0;this.p+=(q-this.p)*.15;
    if(q>=1&&!this.done){this.t0=this.t0||performance.now();if(performance.now()-this.t0>350)this.done=true}else if(q<1)this.t0=0}});
reg({id:'eat',tier:'play',   // a rainbow worm that eats stars
  init(){this.seg=Array.from({length:30},()=>({x:W/2,y:H*.6}));this.hx=W/2;this.hy=H*.6;this.n=0;this.need=Math.round(8*Math.min(1.2,DIFF));this.done=false;this.p=0;this.fx=Parts();
    this.food=Array.from({length:this.need},()=>({x:rnd(40,W-40),y:rnd(110,H-110),r:rnd(13,18),ph:rnd(0,6.28)}))},
  draw(t){const f=this.field,cols=[f[2],f[3],'#ffffff'];if(M.active){this.hx=M.x;this.hy=M.y}
    let px=this.hx,py=this.hy;this.seg.forEach((s,i)=>{s.x+=(px-s.x)*(.34-i*.007);s.y+=(py-s.y)*(.34-i*.007);px=s.x;py=s.y});
    for(let i=this.food.length-1;i>=0;i--){const q=this.food[i];star(q.x,q.y,q.r+(reduce?0:Math.sin(t/250+q.ph)*2),'#ffd166',t/900);
      if(Math.hypot(q.x-this.seg[0].x,q.y-this.seg[0].y)<q.r+22){this.food.splice(i,1);this.n++;this.p=this.n/this.need;blip(500+this.n*60,.12);buzz(10);this.fx.burst(q.x,q.y,10,cols,4);if(this.n>=this.need)this.done=true}}
    for(let i=this.seg.length-1;i>=0;i--){const s=this.seg[i],r=6+(this.seg.length-i)*1.1;ctx.fillStyle=cols[i%3];ctx.beginPath();ctx.arc(s.x,s.y,r,0,6.28);ctx.fill()}
    const h=this.seg[0];face(h.x,h.y,34,f[1],this.food.length?'happy':'open',M.x,M.y);this.fx.draw(.05)}});
reg({id:'fling',tier:'play',   // throw hearts and stars at the happy sun
  init(){this.list=[];this.drag=null;this.n=0;this.need=5;this.done=false;this.p=0;this.fx=Parts();this.tr=Math.max(40,W*.1);this.tx=W/2;this.ty=H*.28;this.glad=0},
  down(){const p=[...this.list].reverse().find(l=>Math.hypot(l.x-M.x,l.y-M.y)<l.s*.9),f=this.field;
    if(p)this.drag=p;else{this.drag={x:M.x,y:M.y,vx:0,vy:0,s:rnd(26,36),rot:rnd(-.5,.5),vr:rnd(-.08,.08),c:pick([f[2],f[3],'#ff6fa5']),k:Math.random()<.5?0:1};this.list.push(this.drag)}blip(400,.07)},
  up(){if(this.drag){this.drag.vx=M.sx*1.3;this.drag.vy=M.sy*1.3;this.drag=null}},
  draw(t){const f=this.field;this.tx=W/2+Math.sin(t/(reduce?4000:850))*(W/2-this.tr-12);
    ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(this.tx,this.ty,this.tr,0,6.28);ctx.fill();
    for(let k=0;k<10;k++){const a=k*Math.PI/5+t/2000;ctx.fillRect(this.tx+Math.cos(a)*this.tr*1.15-3,this.ty+Math.sin(a)*this.tr*1.15-3,6,6)}
    face(this.tx,this.ty,this.tr*1.2,f[1],performance.now()-this.glad<500?'open':'happy',M.x,M.y);
    for(let i=this.list.length-1;i>=0;i--){const l=this.list[i];
      if(l===this.drag){l.x+=(M.x-l.x)*.55;l.y+=(M.y-l.y)*.55;l.vx=l.vy=0}
      else{l.vy+=.45;l.x+=l.vx;l.y+=l.vy;l.rot+=l.vr;const fl=H-l.s-16;
        if(l.y>fl){l.y=fl;l.vy*=-.5;l.vx*=.9;l.vr*=.8}if(l.y<l.s){l.y=l.s;l.vy*=-.5}
        if(l.x<l.s||l.x>W-l.s){l.x=Math.max(l.s,Math.min(W-l.s,l.x));l.vx*=-.7}}
      if(Math.hypot(l.x-this.tx,l.y-this.ty)<this.tr+l.s*.6){this.list.splice(i,1);if(this.drag===l)this.drag=null;this.n++;this.p=this.n/this.need;this.glad=performance.now();blip(700+this.n*80,.14);buzz(15);this.fx.burst(l.x,l.y,16,[f[2],f[3],'#ff6fa5'],6);if(this.n>=this.need)this.done=true;continue}
      if(l.k)heart(l.x,l.y,l.s*.9,l.c);else star(l.x,l.y,l.s,l.c,l.rot)}
    if(this.list.length>30)this.list.shift();this.fx.draw()}});
reg({id:'poke',tier:'play',   // a squishy friend
  init(){this.n=0;this.need=Math.round(12*Math.min(1.2,DIFF));this.done=false;this.p=0;this.sx=0;this.sy=0;this.vx=0;this.vy=0;this.fx=Parts();this.t=0},
  down(){const dx=M.x-W/2,dy=M.y-H/2,d=Math.hypot(dx,dy)||1;this.vx-=dx/d*14;this.vy-=dy/d*14;this.n++;this.p=this.n/this.need;this.t=performance.now();
    blip(300+this.n*45,.12,'sine');buzz(8);this.fx.burst(M.x,M.y,6,['#ff6fa5',this.field[2]],3);if(this.n>=this.need)this.done=true},
  draw(t){const f=this.field,R=Math.min(W,H)*.26;
    this.vx+=-this.sx*.12;this.vy+=-this.sy*.12;this.vx*=.88;this.vy*=.88;this.sx+=this.vx;this.sy+=this.vy;
    const rx=R*(1+Math.abs(this.sx)/R*.3-Math.abs(this.sy)/R*.15),ry=R*(1+Math.abs(this.sy)/R*.3-Math.abs(this.sx)/R*.15),cx=W/2+this.sx*.4,cy=H/2+this.sy*.4;
    ctx.fillStyle=f[2];ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.fill();
    face(cx,cy,R*1.2,f[1],performance.now()-this.t<300?'open':'happy',M.x,M.y);this.fx.draw(.05)}});
reg({id:'paint',tier:'play',   // finger paint the whole page
  init(){this.pc=document.createElement('canvas');this.pc.width=W;this.pc.height=H;this.g=this.pc.getContext('2d');this.gc=18;this.gr=32;this.grid=new Uint8Array(this.gc*this.gr);this.cnt=0;this.hue=rnd(0,360);this.lx=-1;this.ly=-1;this.done=false;this.p=0;this.fx=Parts();this.fin=0},
  down(){this.lx=M.x;this.ly=M.y;this.dab()},
  move(){if(!M.down||this.fin)return;this.dab()},
  up(){this.lx=-1},
  dab(){const g=this.g;this.hue=(this.hue+6)%360;g.strokeStyle=g.fillStyle=`hsl(${this.hue} 90% 62%)`;g.lineCap='round';g.lineWidth=60;g.beginPath();g.moveTo(this.lx<0?M.x:this.lx,this.ly<0?M.y:this.ly);g.lineTo(M.x,M.y);g.stroke();this.lx=M.x;this.ly=M.y;
    const cw=W/this.gc,ch=H/this.gr;for(let a=0;a<this.gc;a++)for(let b=0;b<this.gr;b++){const i=b*this.gc+a;if(!this.grid[i]&&Math.hypot((a+.5)*cw-M.x,(b+.5)*ch-M.y)<46){this.grid[i]=1;this.cnt++}}
    this.p=this.cnt/(this.gc*this.gr)/.7;blip(300+(this.cnt%12)*40,.05,'sine',.04);
    if(this.p>=1&&!this.fin){this.fin=performance.now();this.fx.burst(W/2,H/2,50,['#ffd166','#ff6fa5','#7ad7f0'],8);setTimeout(()=>{this.done=true},900)}},
  draw(t){ctx.drawImage(this.pc,0,0,W,H);this.fx.draw(.1)}});
reg({id:'stack',tier:'play',   // tap to drop the sliding block on the tower
  init(){this.bh=Math.min(40,H*.05);this.by=H-120;this.tower=[{x:W*.25,w:W*.5,c:0}];this.cur={x:10,w:W*.5,dir:1,sp:3.2};this.n=0;this.need=6;this.done=false;this.p=0;this.shake=0;this.fx=Parts()},
  down(){const top=this.tower[this.tower.length-1],c=this.cur,ov=Math.min(c.x+c.w,top.x+top.w)-Math.max(c.x,top.x);
    if(ov>=14){const nx=Math.abs(c.x-top.x)<7?top.x:Math.max(c.x,top.x),nw=Math.abs(c.x-top.x)<7?top.w:ov;
      this.tower.push({x:nx,w:nw,c:this.tower.length});this.n++;this.p=this.n/this.need;blip(500+this.n*70,.12);buzz(8);this.fx.burst(nx+nw/2,this.by-this.tower.length*this.bh,10,[this.field[2],this.field[3],'#fff'],4);
      this.cur={x:rnd(10,W-nw-10),w:nw,dir:Math.random()<.5?1:-1,sp:c.sp*1.07};if(this.n>=this.need)this.done=true}
    else{this.shake=performance.now();buzz([20,20]);blip(180,.15,'sine',.06);this.cur.x=10;this.cur.dir=1}},
  draw(t){const f=this.field,c=this.cur;c.x+=c.dir*c.sp;if(c.x<8){c.x=8;c.dir=1}if(c.x+c.w>W-8){c.x=W-8-c.w;c.dir=-1}
    ctx.save();if(performance.now()-this.shake<250)ctx.translate(rnd(-4,4),0);
    this.tower.forEach((b,i)=>{ctx.fillStyle=[f[2],f[3],'#ffffff'][b.c%3];ctx.beginPath();ctx.rect(b.x,this.by-i*this.bh,b.w,this.bh-3);ctx.fill();if(i===this.tower.length-1)face(b.x+b.w/2,this.by-i*this.bh+this.bh*.4,this.bh*.9,f[1],'happy')});
    ctx.fillStyle=[f[2],f[3],'#ffffff'][this.tower.length%3];ctx.fillRect(c.x,this.by-this.tower.length*this.bh,c.w,this.bh-3);ctx.restore();this.fx.draw(.1)}});
reg({id:'pet',tier:'play',   // stroke the fluffy friend
  init(){this.rub=0;this.need=2400*(1+DIFF*.1);this.done=false;this.p=0;this.fx=Parts();this.last=0;this.R=Math.min(W,H)*.24},
  move(){if(!M.down)return;if(Math.hypot(M.x-W/2,M.y-H/2)<this.R*1.1){this.rub+=Math.hypot(M.vx,M.vy);this.p=this.rub/this.need;this.last=performance.now();
      if(Math.random()<.12){this.fx.burst(M.x,M.y,1,['#ff6fa5'],1.5);blip(500+Math.random()*300,.08,'sine',.04)}if(this.rub>=this.need&&!this.done){this.done=true}}},
  draw(t){const f=this.field,R=this.R,cx=W/2,cy=H/2,wob=Math.sin(t/200)*(performance.now()-this.last<200?5:0);
    ctx.fillStyle=f[3];for(const k of[-1,1]){ctx.beginPath();ctx.moveTo(cx+k*R*.35,cy-R*.8);ctx.lineTo(cx+k*R*.95,cy-R*.55);ctx.lineTo(cx+k*R*.85,cy-R*1.3);ctx.closePath();ctx.fill()}
    ctx.fillStyle=f[2];ctx.beginPath();ctx.ellipse(cx+wob,cy,R,R*.92,0,0,6.28);ctx.fill();
    for(let i=0;i<14;i++){const a=i*.45;ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(cx+Math.cos(a)*R*.95+wob,cy+Math.sin(a)*R*.88,R*.12,0,6.28);ctx.fill()}
    face(cx+wob,cy,R*1.2,f[1],performance.now()-this.last<300?'blink':'happy',M.x,M.y);
    for(const p of this.fx.a){p.vy-=.02}this.fx.draw(0)}});
reg({id:'catch',tier:'play',   // slide a basket under the falling stars
  init(){this.bx=W/2;this.n=0;this.need=10;this.done=false;this.p=0;this.fx=Parts();this.st=[];this.nextAt=0},
  draw(t){const f=this.field,now=performance.now(),by=H-90,bw=Math.min(110,W*.28);
    if(M.active)this.bx+=(M.x-this.bx)*.35;if(now>this.nextAt&&this.st.length<4){this.st.push({x:rnd(30,W-30),y:-30,v:2.6+DIFF*.5+rnd(0,1),r:20,ph:rnd(0,6)});this.nextAt=now+rnd(500,900)}
    for(let i=this.st.length-1;i>=0;i--){const s=this.st[i];s.y+=s.v;star(s.x,s.y,s.r,'#ffd166',t/400+s.ph);face(s.x,s.y+2,s.r*.9,f[1],'happy');
      if(s.y>by-12&&s.y<by+20&&Math.abs(s.x-this.bx)<bw/2+8){this.st.splice(i,1);this.n++;this.p=this.n/this.need;blip(600+this.n*60,.1);buzz(8);this.fx.burst(s.x,by,10,['#ffd166',f[2],'#fff'],4);if(this.n>=this.need)this.done=true}
      else if(s.y>H+30)this.st.splice(i,1)}
    ctx.fillStyle=f[2];ctx.beginPath();ctx.moveTo(this.bx-bw/2,by);ctx.lineTo(this.bx+bw/2,by);ctx.lineTo(this.bx+bw*.38,by+38);ctx.lineTo(this.bx-bw*.38,by+38);ctx.closePath();ctx.fill();
    face(this.bx,by+14,36,f[1],'happy',M.x,M.y);this.fx.draw(.1)}});
reg({id:'grow',tier:'play',   // tap the soil: flowers
  init(){this.m=Array.from({length:8},(_,i)=>({x:W*(.15+.233*(i%4)),y:H*(.62+.14*((i/4)|0)),t:0,c:pick(['#ff6fa5','#ffb347','#b79bff','#7ad7f0','#ff8a7a'])}));this.n=0;this.done=false;this.p=0;this.fx=Parts()},
  down(){const m=this.m.find(m=>!m.t&&Math.hypot(m.x-M.x,m.y-M.y)<W*.12);if(m){m.t=performance.now();this.n++;this.p=this.n/8;blip(400+this.n*60,.14);buzz(8);this.fx.burst(m.x,m.y,8,[m.c,'#8be0a0'],3);if(this.n>=8)setTimeout(()=>{this.done=true},800)}},
  draw(t){const f=this.field,now=performance.now();
    for(const m of this.m){ctx.fillStyle='#b98a5a';ctx.beginPath();ctx.ellipse(m.x,m.y+8,W*.1,W*.045,0,0,6.28);ctx.fill();
      if(m.t){const k=clamp01((now-m.t)/700),e=1-Math.pow(1-k,3),h=H*.12*e;ctx.strokeStyle='#5cc28a';ctx.lineWidth=6;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(m.x,m.y);ctx.lineTo(m.x,m.y-h);ctx.stroke();
        ctx.fillStyle=m.c;for(let p=0;p<6;p++){const a=p*Math.PI/3+t/3000;ctx.beginPath();ctx.arc(m.x+Math.cos(a)*22*e,m.y-h+Math.sin(a)*22*e,14*e,0,6.28);ctx.fill()}
        ctx.fillStyle='#ffd166';ctx.beginPath();ctx.arc(m.x,m.y-h,16*e,0,6.28);ctx.fill();if(k>.6)face(m.x,m.y-h,22,f[1],'happy')}}
    this.fx.draw(.05)}});

// finale: breathe a balloon up. Let go inside the ring and it goes "achoo!" in confetti. (the sneeze, made friendly)
reg({id:'inflate',tier:'play',lo:.78,hi:.92,over:.97,
  init(){this.m=0;this.t0=0;this.shake=0;this.done=false;this.p=0;this.won=false;this.fx=Parts()},
  down(){if(this.won)return;this.t0=performance.now();blip(220,.2,'sine',.05)},
  up(){if(this.won||!this.t0)return;const m=this.m;this.t0=0;if(m>=this.lo&&m<=this.hi)this.win();else if(m>.05)this.fail()},
  fail(){this.t0=0;this.m=0;this.shake=performance.now();buzz([20,30,20]);blip(260,.2,'sine',.06)},
  win(){const f=this.field;this.won=true;this.fx.burst(W/2,H*.45,150,[f[2],f[3],'#ffd166','#ffffff','#ff6fa5'],11);jingle();buzz([20,40,20,40,60]);setTimeout(()=>{this.done=true},1300)},
  draw(t){const f=this.field,R=Math.min(W,H*.8)*.4,cx=W/2,cy=H*.46;
    if(this.t0){this.m=Math.min(1,(performance.now()-this.t0)/1800);if(this.m>this.over)this.fail()}
    this.p=this.m*.9;let ox=0;if(this.shake&&performance.now()-this.shake<350)ox=Math.sin(t/20)*10;
    ctx.save();ctx.translate(ox,0);
    if(!this.won){ctx.strokeStyle=f[1];ctx.globalAlpha=.55;ctx.lineWidth=R*(this.hi-this.lo);ctx.setLineDash([14,12]);ctx.beginPath();ctx.arc(cx,cy,R*(this.lo+this.hi)/2,0,6.28);ctx.stroke();ctx.setLineDash([]);ctx.globalAlpha=1;
      const r=Math.max(10,R*this.m)+(this.t0&&!reduce?Math.sin(t/40)*this.m*4:0),near=this.m>=this.lo&&this.m<=this.hi;
      ctx.strokeStyle=f[1];ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy+r);ctx.quadraticCurveTo(cx+14*Math.sin(t/500),cy+r+60,cx,cy+r+120);ctx.stroke();
      ctx.fillStyle=f[2];ctx.beginPath();ctx.ellipse(cx,cy,r*.95,r,0,0,6.28);ctx.fill();ctx.beginPath();ctx.moveTo(cx,cy+r);ctx.lineTo(cx-10,cy+r+14);ctx.lineTo(cx+10,cy+r+14);ctx.fill();
      ctx.fillStyle='rgba(255,255,255,.55)';ctx.beginPath();ctx.arc(cx-r*.4,cy-r*.4,r*.14,0,6.28);ctx.fill();
      if(r>30)face(cx,cy,r*1.1,f[1],near?'open':'happy',M.x,M.y)}
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
// #room=pet jumps straight into one toy (handy for testing)
function boot(){
  resize(true);const id=new URLSearchParams(location.hash.slice(1)).get('room');
  if(id&&ROOMS[id]){run={list:[id],i:0};enterRoom(ROOMS[id])}else enterRoom(ROOMS.title);
  busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
