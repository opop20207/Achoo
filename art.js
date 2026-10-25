'use strict';
// Achoo · art and sound. 14 kinds of little friends x 3 colourways = 42 to collect. Drawn in code with soft shading.
const rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[(Math.random()*a.length)|0];
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);
const clamp01=v=>Math.max(0,Math.min(1,v));
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
const buzz=p=>{try{navigator.vibrate&&navigator.vibrate(p)}catch(e){}};
const hexv=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16));
const mix=(a,b,t)=>{const A=hexv(a),B=hexv(b);return '#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('')};
const INK='#5a3550';

// ---- sound ----
let AC;
function blip(f=500,d=.12,type='triangle',v=.1,delay=0,glide=1.6){
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();
  const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30,f*glide),t+d);g.gain.setValueAtTime(v,t);g.gain.exponentialRampToValueAtTime(.001,t+d);
  o.connect(g).connect(AC.destination);o.start(t);o.stop(t+d)}catch(e){}
}
function noise(d=.12,f=2000,v=.15,delay=0,q=.8){
  try{AC=AC||new (window.AudioContext||window.webkitAudioContext)();const t=AC.currentTime+delay,n=(AC.sampleRate*d)|0,b=AC.createBuffer(1,n,AC.sampleRate),a=b.getChannelData(0);
  for(let i=0;i<n;i++)a[i]=(Math.random()*2-1)*Math.pow(1-i/n,3);const o=AC.createBufferSource();o.buffer=b;const fl=AC.createBiquadFilter();fl.type='bandpass';fl.frequency.value=f;fl.Q.value=q;
  const g=AC.createGain();g.gain.value=v;o.connect(fl).connect(g).connect(AC.destination);o.start(t)}catch(e){}
}
// "pa-jak": a dull thump plus three quick crackles
const crunch=(k=0)=>{blip(150+k*8,.09,'sine',.22,0,.5);noise(.03,3600+rnd(0,1200),.3);noise(.04,5200+rnd(0,900),.22,.022);noise(.07,2400+rnd(0,600),.2,.05)};
const smash=()=>{blip(110,.18,'sine',.3,0,.4);for(let i=0;i<5;i++)noise(.05,2200+rnd(0,3500),.28,i*.028)};
const popS=()=>{blip(420+rnd(0,220),.07,'sine',.14);noise(.02,4200,.12)};
const click=()=>{noise(.02,5200,.22);blip(900,.03,'square',.03,0,.8)};
const jingle=()=>[523,659,784,1047].forEach((f,i)=>blip(f,.16,'triangle',.09,i*.09));
const squeak=k=>blip(520+(k%7)*70+rnd(0,60),.1,'sine',.08);
const PENT=[523,587,659,784,880,1047];

// ---- little shapes ----
function Parts(){return {a:[],burst(x,y,n,cols,s=5){for(let i=0;i<n;i++){const an=rnd(0,6.28),sp=rnd(1,s);this.a.push({x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1.5,l:1,c:pick(cols),r:rnd(3,6),k:Math.random()<.4?1:Math.random()<.3?2:0})}},
  draw(g=.1){for(let i=this.a.length-1;i>=0;i--){const p=this.a[i];p.x+=p.vx;p.y+=p.vy;p.vy+=g;p.l-=.018;if(p.l<=0){this.a.splice(i,1);continue}
    ctx.globalAlpha=Math.min(1,p.l*2);if(p.k===1)heart(p.x,p.y,p.r*p.l+2,p.c);else if(p.k===2)twinkle(p.x,p.y,p.r*p.l*1.6+2,p.c);else{ctx.fillStyle=p.c;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.l+1,0,6.28);ctx.fill()}ctx.globalAlpha=1}}}}
function heart(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y+s*.9);ctx.bezierCurveTo(x-s*1.4,y-s*.1,x-s*.7,y-s*1.1,x,y-s*.4);ctx.bezierCurveTo(x+s*.7,y-s*1.1,x+s*1.4,y-s*.1,x,y+s*.9);ctx.fill()}
function star(x,y,s,col,rot=0){ctx.fillStyle=col;ctx.beginPath();for(let i=0;i<10;i++){const a=rot+i*Math.PI/5-Math.PI/2,r=i%2?s*.5:s;i?ctx.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):ctx.moveTo(x+Math.cos(a)*r,y+Math.sin(a)*r)}ctx.closePath();ctx.fill()}
function twinkle(x,y,s,col){ctx.fillStyle=col;ctx.beginPath();ctx.moveTo(x,y-s);ctx.quadraticCurveTo(x,y,x+s,y);ctx.quadraticCurveTo(x,y,x,y+s);ctx.quadraticCurveTo(x,y,x-s,y);ctx.quadraticCurveTo(x,y,x,y-s);ctx.fill()}

// ---- the friends ----
const GH='rgba(110,80,140,.16)';let G={};
const el=(x,y,a,b,rot=0)=>ctx.ellipse(x,y,a,b,rot,0,6.2832);
function sh(fn,col,stroke=true){ctx.beginPath();fn();ctx.fillStyle=G.ghost?GH:col;ctx.fill();if(stroke&&!G.ghost)ctx.stroke()}
function thick(fn,col,w){ctx.lineCap='round';ctx.beginPath();fn();ctx.strokeStyle=G.ghost?GH:G.P.d;ctx.lineWidth=w+G.lw*2;ctx.stroke();ctx.strokeStyle=G.ghost?GH:col;ctx.lineWidth=w;ctx.stroke();ctx.strokeStyle=G.ghost?'rgba(0,0,0,0)':G.P.d;ctx.lineWidth=G.lw}
const tri=(a,b,c,d,e,f)=>()=>{ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.lineTo(e,f);ctx.closePath()};
const SP=[
 {n:'bear',c:['#d9a273','#fbf3ea','#ffc2d6'],
  back(r,P){for(const s of[-1,1]){sh(()=>el(s*r*.64,-r*.76,r*.3,r*.3),P.b);sh(()=>el(s*r*.64,-r*.76,r*.16,r*.16),P.s,0)}},
  front(r,P){sh(()=>el(0,r*.24,r*.3,r*.22),P.l,0);sh(()=>el(0,r*.13,r*.07,r*.05),INK,0)}},
 {n:'cat',c:['#ffbf7a','#b9c9e6','#a897e0'],
  back(r,P){thick(()=>{ctx.moveTo(r*.7,r*.72);ctx.quadraticCurveTo(r*1.55,r*.7,r*1.25,-r*.1)},P.b,r*.2);
    for(const s of[-1,1]){sh(tri(s*r*.2,-r*.9,s*r*.92,-r*.5,s*r*.8,-r*1.3),P.b);sh(tri(s*r*.38,-r*.88,s*r*.78,-r*.64,s*r*.72,-r*1.05),P.s,0)}},
  front(r,P){sh(tri(-r*.06,r*.1,r*.06,r*.1,0,r*.17),'#ff8fa8',0);ctx.save();ctx.globalAlpha=.55;ctx.lineWidth=G.lw*.7;for(const s of[-1,1])for(const y of[.16,.26]){ctx.beginPath();ctx.moveTo(s*r*.66,y*r+r*.02);ctx.lineTo(s*r*1.04,y*r-r*.04+(y-.2)*r*.4);ctx.stroke()}ctx.restore()}},
 {n:'bunny',c:['#fff1ee','#ffd1e0','#d6c4ff'],
  back(r,P){sh(()=>el(r*.9,r*.78,r*.24,r*.24),P.l);for(const s of[-1,1]){sh(()=>el(s*r*.36,-r*1.38,r*.2,r*.6,s*.1),P.b);sh(()=>el(s*r*.36,-r*1.33,r*.1,r*.4,s*.1),P.s,0)}},
  front(r,P){sh(()=>el(0,r*.13,r*.06,r*.045),'#ff8fa8',0)}},
 {n:'mouse',c:['#cfd3de','#ffd9b8','#bfe8f5'],
  back(r,P){thick(()=>{ctx.moveTo(r*.75,r*.8);ctx.bezierCurveTo(r*1.5,r*.9,r*1.4,r*.2,r*1.7,r*.3)},P.s,r*.09);for(const s of[-1,1]){sh(()=>el(s*r*.74,-r*.66,r*.4,r*.4),P.b);sh(()=>el(s*r*.74,-r*.66,r*.26,r*.26),P.s,0)}},
  front(r,P){sh(()=>el(0,r*.13,r*.08,r*.06),'#ff8fa8',0)}},
 {n:'dog',c:['#e8c39a','#fff1d6','#a6b8d9'],
  back(r,P){for(const s of[-1,1])sh(()=>el(s*r*.9,-r*.2,r*.25,r*.52,s*.28),mix(P.b,P.d,.45))},
  front(r,P){sh(()=>el(r*.4,r*.02,r*.2,r*.22),mix(P.b,P.d,.5),0);sh(()=>el(0,r*.24,r*.3,r*.2),P.l,0);sh(()=>el(0,r*.12,r*.08,r*.06),INK,0)}},
 {n:'frog',c:['#9ddc8f','#7fd6c8','#ffd36b'],
  back(r,P){for(const s of[-1,1])sh(()=>el(s*r*.5,-r*.86,r*.27,r*.27),P.b)},
  front(r,P){ctx.save();ctx.strokeStyle=INK;ctx.lineWidth=G.lw;ctx.lineCap='round';ctx.restore()},wide:true},
 {n:'chick',c:['#ffe27a','#ffc9a0','#fff3b8'],nomouth:true,
  back(r,P){for(const s of[-1,1])sh(()=>el(s*r*.98,r*.3,r*.2,r*.15,s*.6),P.b)},
  front(r,P){for(const a of[-.35,0,.35])sh(()=>el(a*r*.5,-r*1.0+Math.abs(a)*r*.25,r*.09,r*.2,a),P.b);sh(tri(-r*.1,r*.16,r*.1,r*.16,0,r*.3),'#ffa94d')}},
 {n:'penguin',c:['#5d6a8c','#7bb8e6','#b79bff'],l:'#ffffff',nomouth:true,
  back(r,P){},
  front(r,P){sh(()=>el(0,r*.62,r*.6,r*.4),'#fff',0);sh(()=>el(0,r*.05,r*.74,r*.56),'#fff',0);sh(tri(-r*.1,r*.15,r*.1,r*.15,0,r*.28),'#ffa94d')},feet:'#ffa94d',whiteEyes:false},
 {n:'sheep',c:['#ffffff','#ffe1ec','#dfe9ff'],
  back(r,P){for(const s of[-1,1])sh(()=>el(s*r*.8,-r*.1,r*.24,r*.14,s*.5),'#ffe6d6')},
  front(r,P){for(let i=0;i<5;i++){const a=-Math.PI*.95+i*Math.PI*.475;sh(()=>ctx.arc(Math.cos(a)*r*.7,Math.sin(a)*r*.62-r*.2,r*.28,0,6.2832),P.b)}
    sh(()=>el(0,r*.1,r*.6,r*.52),'#ffe6d6')}},
 {n:'fox',c:['#ff9d5c','#e4dcf5','#ffd36b'],
  back(r,P){sh(()=>el(r*1.08,r*.5,r*.5,r*.26,-.85),P.b);sh(()=>el(r*1.38,r*.12,r*.2,r*.16,-.85),'#fff');
    for(const s of[-1,1]){sh(tri(s*r*.2,-r*.9,s*r*.95,-r*.45,s*r*.75,-r*1.35),P.b);sh(tri(s*r*.5,-r*.86,s*r*.86,-r*.62,s*r*.78,-r*1.08),'#5a3550',0)}},
  front(r,P){for(const s of[-1,1])sh(tri(s*r*.98,r*.1,s*r*.4,r*.44,s*r*.55,r*.05),'#fff',0);sh(()=>el(0,r*.13,r*.06,r*.045),INK,0)}},
 {n:'hamster',c:['#ffd9a8','#f0c8a8','#ffc2d6'],ws:1.1,
  back(r,P){for(const s of[-1,1]){sh(()=>el(s*r*.7,-r*.78,r*.2,r*.2),P.b);sh(()=>el(s*r*.7,-r*.78,r*.1,r*.1),P.s,0)}},
  front(r,P){sh(()=>el(0,r*.12,r*.06,r*.045),'#ff8fa8',0)}},
 {n:'dino',c:['#8fd6a0','#9ad0ff','#ffb27a'],
  back(r,P){sh(()=>el(r*1.0,r*.78,r*.42,r*.2,.35),P.b);for(const x of[-.4,0,.4])sh(tri(x*r-r*.17,-r*.92+Math.abs(x)*r*.3,x*r,-r*1.25+Math.abs(x)*r*.3,x*r+r*.17,-r*.92+Math.abs(x)*r*.3),'#ffd36b')},
  front(r,P){for(const s of[-1,1])sh(()=>el(s*r*.05,r*.1,r*.02,r*.02),P.d,0)}},
 {n:'ghost',c:['#f0eaff','#cdeefa','#ffe0f0'],nofeet:true,
  back(r,P){for(const x of[-.55,0,.55])sh(()=>el(x*r,r*.9+Math.abs(x)*r*.04,r*.3,r*.26),P.b)},front(){}},
 {n:'panda',c:['#ffffff','#ffe9f1','#d9f3e6'],
  back(r,P){for(const s of[-1,1])sh(()=>el(s*r*.66,-r*.76,r*.28,r*.28),'#4a3f55')},
  front(r,P){for(const s of[-1,1])sh(()=>el(s*r*.35,r*.03,r*.17,r*.21,s*.5),'#4a3f55',0);sh(()=>el(0,r*.12,r*.07,r*.05),'#4a3f55',0)},arms:'#4a3f55',feet:'#4a3f55'},
];
const SPN=SP.length,TOTAL=SPN*3;
const _pc={};
function palOf(k,v){const key=k*3+v;if(_pc[key])return _pc[key];const b=SP[k].c[v],d=mix(b,'#4a2a48',.45);return _pc[key]={b,d,l:SP[k].l||mix(b,'#ffffff',.6),s:mix('#ff9fb8',b,.12),sp:v===2}}
function eggPath(r,ws=1){ctx.beginPath();ctx.moveTo(0,-r);ctx.bezierCurveTo(r*.95*ws,-r,r*1.08*ws,r*.2,r*.92*ws,r*.74);ctx.bezierCurveTo(r*.72*ws,r*1.03,-r*.72*ws,r*1.03,-r*.92*ws,r*.74);ctx.bezierCurveTo(-r*1.08*ws,r*.2,-r*.95*ws,-r,0,-r);ctx.closePath()}
function smooth(p){const n=p.length;ctx.beginPath();ctx.moveTo((p[n-1][0]+p[0][0])/2,(p[n-1][1]+p[0][1])/2);for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];ctx.quadraticCurveTo(a[0],a[1],(a[0]+b[0])/2,(a[1]+b[1])/2)}ctx.closePath()}
// o: mood happy|open|blink|sleep|squint, lx/ly look-at, sx/sy squash, rot, arms 0|1, step, ghost, pts (soft body), fx/fy face shift, hop, t (time, for sparkle)
function chara(k,v,x,y,r,o={}){
  const S=SP[k],P=palOf(k,v),mood=o.mood||'happy',ghost=!!o.ghost,lw=Math.max(1.4,r*.042);
  G={r,P,ghost,lw};
  if(!ghost&&!o.noShadow){const h=o.hop||0;ctx.save();ctx.translate(x,y+r*1.05);ctx.scale(1-Math.min(.3,h/r*.3),.2);const sg=ctx.createRadialGradient(0,0,0,0,0,r);sg.addColorStop(0,'rgba(90,60,110,.26)');sg.addColorStop(1,'rgba(90,60,110,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.restore()}
  ctx.save();ctx.translate(x,y-(o.hop||0));if(o.rot)ctx.rotate(o.rot);ctx.scale(o.sx||1,o.sy||1);
  ctx.lineWidth=lw;ctx.lineJoin=ctx.lineCap='round';ctx.strokeStyle=ghost?'rgba(0,0,0,0)':P.d;
  S.back(r,P);
  const st=o.step||0,ws=S.ws||1;
  if(!S.nofeet)for(const s of[-1,1])sh(()=>el(s*r*.4*ws,r*.98+Math.sin(st+(s>0?0:Math.PI))*r*.06,r*.24,r*.15),S.feet||mix(P.b,P.d,.15));
  for(const s of[-1,1])sh(()=>o.arms?el(s*r*.98*ws,-r*.02,r*.16,r*.12,s*.9):el(s*r*.98*ws,r*.36,r*.15,r*.11,-s*.45),S.arms||P.b);
  // body, shaded
  if(o.pts)smooth(o.pts);else eggPath(r,ws);
  if(ghost)ctx.fillStyle=GH;else{const g=ctx.createRadialGradient(-r*.34,-r*.46,r*.08,0,0,r*1.25);g.addColorStop(0,mix(P.b,'#ffffff',.5));g.addColorStop(.5,P.b);g.addColorStop(1,mix(P.b,P.d,.32));ctx.fillStyle=g}
  ctx.fill();if(!ghost)ctx.stroke();
  if(!ghost){
    if(S.l!==false&&!S.nobelly){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle=P.l;ctx.beginPath();ctx.ellipse(0,r*.58,r*.5*ws,r*.36,0,0,6.28);ctx.fill();ctx.restore()}
    if(o.fx||o.fy)ctx.translate(o.fx||0,o.fy||0);
    S.front(r,P);
    // face
    const ex=r*.36,ey=r*.04,a=Math.atan2((o.ly??y)-y,(o.lx??x)-x),d=Math.min(r*.04,Math.hypot((o.lx??x)-x,(o.ly??y)-y)*.02),ox=Math.cos(a)*d,oy=Math.sin(a)*d;
    for(const s of[-1,1]){const bg=ctx.createRadialGradient(s*r*.6,r*.22,0,s*r*.6,r*.22,r*.2);bg.addColorStop(0,'rgba(255,125,160,.7)');bg.addColorStop(1,'rgba(255,125,160,0)');ctx.fillStyle=bg;ctx.beginPath();ctx.arc(s*r*.6,r*.22,r*.2,0,6.28);ctx.fill()}
    ctx.fillStyle=ctx.strokeStyle=INK;ctx.lineWidth=Math.max(1.5,r*.05);
    for(const s of[-1,1]){
      if(mood==='blink'||mood==='sleep'){ctx.beginPath();ctx.arc(s*ex,ey,r*.1,.15*Math.PI,.85*Math.PI);ctx.stroke()}
      else if(mood==='squint'){ctx.beginPath();ctx.arc(s*ex,ey+r*.05,r*.1,1.15*Math.PI,1.85*Math.PI);ctx.stroke()}
      else{ctx.beginPath();ctx.ellipse(s*ex+ox,ey+oy,r*.085,r*.115,0,0,6.28);ctx.fill();ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*ex+ox-r*.025,ey+oy-r*.04,r*.03,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(s*ex+ox+r*.025,ey+oy+r*.04,r*.014,0,6.28);ctx.fill();ctx.fillStyle=INK}}
    if(S.wide&&mood!=='open'){ctx.beginPath();ctx.arc(0,r*.08,r*.34,.18*Math.PI,.82*Math.PI);ctx.stroke()}
    else if(mood==='open'){ctx.beginPath();ctx.ellipse(0,r*.3,r*.13,r*.15,0,0,6.28);ctx.fill();ctx.fillStyle='#ff8fa8';ctx.beginPath();ctx.ellipse(0,r*.36,r*.08,r*.06,0,0,6.28);ctx.fill()}
    else if(!S.nomouth){ctx.lineWidth=Math.max(1.3,r*.036);ctx.beginPath();ctx.arc(-r*.06,r*.2,r*.065,.1*Math.PI,.9*Math.PI);ctx.arc(r*.06,r*.2,r*.065,.1*Math.PI,.9*Math.PI);ctx.stroke()}
    // soft shine on the head
    ctx.fillStyle='rgba(255,255,255,.5)';ctx.beginPath();ctx.ellipse(-r*.42,-r*.62,r*.2,r*.1,-.6,0,6.28);ctx.fill();
    if(P.sp){const t=(o.t||0)/500;for(let i=0;i<4;i++){const an=t+i*1.57;twinkle(Math.cos(an)*r*1.15,Math.sin(an)*r*1.05-r*.1,r*(.1+.05*Math.sin(t*3+i)),'#ffe27a')}}
  }
  ctx.restore();
}
