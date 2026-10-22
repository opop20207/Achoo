'use strict';
// The chamber (hub) and the puzzles. Nothing here says what to do: the rules are meant to be found by touching things.
// this.field = [bg, ink, accent, alt]; `run` holds this run's randomised solution (see buildRun in engine.js).
const clamp01=v=>Math.max(0,Math.min(1,v));

// ================= the chamber: a sealed eyelid-door, a four-slot lock, four things to look at =================
reg({id:'hub',tier:'hub',cue:'',
  init(){
    this.done=false;this.escape=false;this.p=Object.keys(run.solved).length/4;this.shake=0;this.open=0;this.won=0;this.chk=0;this.nudge=0;this.fired=false;
    const pad=W*.06,s=Math.min(62,W*.16),gap=(W-pad*2-s*4)/3;
    this.sl=[0,1,2,3].map(j=>({x:pad+j*(s+gap),y:H*.45,s}));
    const tw=(W-pad*3)/2,th=Math.min(150,H*.15),y0=H*.58;
    this.tiles=[0,1,2,3].map(k=>({x:pad+(k%2)*(tw+pad),y:y0+((k/2)|0)*(th+pad),w:tw,h:th,pj:run.tileOrder[k]}));
    this.stamp=this.pendingStamp?{id:this.pendingStamp,t:performance.now()+500}:null;this.pendingStamp=null;
  },
  down(){
    if(this.won)return;const now=performance.now();
    for(let j=0;j<4;j++){const s=this.sl[j];
      if(M.x>s.x-6&&M.x<s.x+s.s+6&&M.y>s.y-6&&M.y<s.y+s.s+6){
        if(now<run.jam){this.shake=now;blip(90,.15,'sawtooth',.04);return}
        run.slots[j]=run.slots[j]>=3?-1:run.slots[j]+1;blip(300+run.slots[j]*80,.08,'triangle',.07);buzz(6);
        this.chk=run.slots.every(v=>v>=0)?now+700:0;return}}
    for(const t of this.tiles)if(M.x>t.x&&M.x<t.x+t.w&&M.y>t.y&&M.y<t.y+t.h){go(ROOMS[run.puz[t.pj]],M.x,M.y,[]);return}
  },
  hintNow(){this.nudge=performance.now()},
  draw(t){
    const f=this.field,now=performance.now();
    // lock check: right glyphs in the right slots opens the lid; wrong ones jam the lock for a while
    if(this.chk&&now>this.chk&&!this.won){this.chk=0;
      if(run.slots.every((v,j)=>v===run.code[j])){this.won=now;jingle();buzz([20,40,20])}
      else{this.shake=now;run.jam=now+6000;buzz([40,30,40]);blip(110,.3,'sawtooth',.07);setTimeout(()=>{run.slots=[-1,-1,-1,-1]},900)}}
    // the door is an eye, shut
    const R=Math.min(W*.2,H*.12),cx=W/2,cy=H*.24;
    const open=this.won?clamp01((now-this.won)/1500):.07+.03*Math.sin(t/900);
    ctx.strokeStyle=f[3];ctx.lineWidth=7;ctx.beginPath();ctx.ellipse(cx,cy,R*1.62,R*.95,0,0,6.28);ctx.stroke();
    eyeGlyph(cx,cy,R,open,M.x,M.y,[f[1],f[2],f[0]]);
    if(this.won&&open>=1&&!this.fired){this.fired=true;this.escape=true}
    // four slots, each marked with the picture of the thing it belongs to
    ctx.save();if(this.shake&&now-this.shake<350)ctx.translate(Math.sin(now/18)*6,0);
    const jam=now<run.jam;
    for(let j=0;j<4;j++){const s=this.sl[j];ctx.globalAlpha=jam?.35:1;
      drawIcon(run.puz[j],s.x+s.s/2,s.y-s.s*.5,s.s*.27,f[1]);
      ctx.strokeStyle=f[1];ctx.lineWidth=3;ctx.strokeRect(s.x,s.y,s.s,s.s);
      if(run.slots[j]>=0)drawGlyph(run.slots[j],s.x+s.s/2,s.y+s.s/2,s.s*.28,f[2]);ctx.globalAlpha=1}
    ctx.restore();
    // four things to look at. Solving one leaves its glyph on the tile.
    for(const t of this.tiles){const id=run.puz[t.pj],ok=run.solved[id];
      ctx.globalAlpha=ok?.2:.1;ctx.fillStyle=f[1];ctx.fillRect(t.x,t.y,t.w,t.h);ctx.globalAlpha=1;
      const ix=ok?t.x+t.w*.28:t.x+t.w/2,sz=Math.min(t.h*.32,34);drawIcon(id,ix,t.y+t.h/2,sz,f[1]);
      if(ok){let k=1;if(this.stamp&&this.stamp.id===id)k=clamp01((now-this.stamp.t)/450);
        ctx.globalAlpha=k;drawGlyph(run.glyph[id],t.x+t.w*.68,t.y+t.h/2,Math.min(t.h*.28,28)*(2-k),f[2]);ctx.globalAlpha=1}}
    // after a long silence: where to look
    if(this.nudge&&now-this.nudge<6000){const t=this.tiles.find(t=>!run.solved[run.puz[t.pj]]);
      if(t){ctx.globalAlpha=.5+.5*Math.sin(now/200);ctx.strokeStyle=f[2];ctx.lineWidth=4;ctx.strokeRect(t.x,t.y,t.w,t.h);ctx.globalAlpha=1}}
  }
});

// ================= align: two scattered layers; turn one until they become a single shape =================
reg({id:'align',tier:'puz',cue:'',
  init(){const k=pick([3,4,5,6]);this.k=k;this.per=Math.PI*2/k;this.R=Math.min(W*.4,H*.26);this.cx=W/2;this.cy=H*.46;
    this.a=rnd(0,6.28);this.b=this.a+this.per*rnd(.25,.75);
    this.pts=[];for(let i=0;i<k;i++){this.pts.push([this.per*i,1]);this.pts.push([this.per*(i+.5),.46])}
    const dec=()=>Array.from({length:9},()=>({a:rnd(0,6.28),r:rnd(.25,1.05)}));this.dA=dec();this.dB=dec();
    this.drag=false;this.ref=0;this.hold=0;this.last=0;this.locked=0;this.done=false;this.p=0},
  ang(){return Math.atan2(M.y-this.cy,M.x-this.cx)},
  down(){if(this.locked)return;this.drag=true;this.ref=this.ang()-this.b},
  move(){if(this.drag&&!this.locked)this.b=this.ang()-this.ref},
  up(){this.drag=false},
  diff(){const d=((this.b-this.a)%this.per+this.per)%this.per;return Math.min(d,this.per-d)},
  draw(t){
    const f=this.field,now=performance.now(),d=this.diff(),R=this.R,cx=this.cx,cy=this.cy;
    const P=(a,r)=>[cx+Math.cos(a)*R*r,cy+Math.sin(a)*R*r],dot=(x,y,c,r)=>{ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,6.28);ctx.fill()};
    ctx.strokeStyle=f[1];ctx.globalAlpha=.18;ctx.lineWidth=2;ctx.beginPath();ctx.arc(cx,cy,R*1.1,0,6.28);ctx.stroke();ctx.globalAlpha=1;
    for(const q of this.dA){const [x,y]=P(this.a+q.a,q.r);dot(x,y,f[1],4)}
    for(const q of this.dB){const [x,y]=P(this.b+q.a,q.r);dot(x,y,f[2],4)}
    for(const q of this.pts){let [x,y]=P(this.a+q[0],q[1]);dot(x,y,f[1],6);[x,y]=P(this.b+q[0],q[1]);dot(x,y,f[2],6)}
    // the only hint: the closer the two layers are, the higher the tone
    if(this.drag&&!this.locked&&now-this.last>130){this.last=now;blip(160+(1-d/(this.per/2))*600,.07,'sine',.05)}
    if(!this.locked){if(d<.05){if(++this.hold>20){this.locked=now;this.b=this.a;this.drag=false;jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}else this.hold=0}
    if(this.locked){ctx.strokeStyle=f[1];ctx.lineWidth=4;ctx.beginPath();this.pts.forEach((q,i)=>{const [x,y]=P(this.a+q[0],q[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke();
      ctx.fillStyle=f[2];ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1}
  }
});

// ================= lantern: a dark wall. Only what the light touches speaks. =================
reg({id:'lantern',tier:'puz',cue:'',
  init(){this.ar=run.arrows.map((d,i)=>({d,x:W*(.15+.233*i)+rnd(-6,6),y:rnd(H*.22,H*.72),lit:0}));
    this.dec=Array.from({length:8},()=>({x:rnd(30,W-30),y:rnd(110,H-110),k:(Math.random()*3)|0}));
    this.sx=W/2;this.sy=H/2;this.done=false;this.p=0;this.fin=0},
  note(){return {t:'arrows',d:run.arrows.slice()}},
  draw(t){
    const f=this.field,R=Math.min(W,H)*.16;let sum=0;
    if(M.active){this.sx+=(M.x-this.sx)*.3;this.sy+=(M.y-this.sy)*.3}
    for(const a of this.ar){drawArrow(a.d,a.x,a.y,26,f[2]);if(Math.hypot(a.x-this.sx,a.y-this.sy)<R*.9)a.lit=Math.min(1,a.lit+.016);sum+=a.lit}
    for(const q of this.dec){ctx.fillStyle=f[3];ctx.beginPath();
      if(q.k===0)ctx.arc(q.x,q.y,10,0,6.28);else if(q.k===1)ctx.rect(q.x-9,q.y-9,18,18);else{ctx.moveTo(q.x,q.y-11);ctx.lineTo(q.x+10,q.y+8);ctx.lineTo(q.x-10,q.y+8);ctx.closePath()}ctx.fill()}
    const lr=this.fin?R*4:R;ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.moveTo(this.sx+lr,this.sy);ctx.arc(this.sx,this.sy,lr,0,6.28);ctx.clip('evenodd');
    ctx.fillStyle='#000';ctx.globalAlpha=this.fin?0:1;ctx.fillRect(0,0,W,H);ctx.restore();
    this.p=sum/4;
    if(!this.fin&&sum>=3.99){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1500)}
  }
});

// ================= gaze: four eyes. Tap one and it turns. What should they be looking at? =================
reg({id:'gaze',tier:'puz',cue:'',
  init(){this.d=run.arrows.map(t=>(t+1+((Math.random()*3)|0))%4);this.cur=this.d.map(v=>v*Math.PI/2);this.done=false;this.p=0;this.fin=0;this.r=Math.min(W*.058,26);
    this.ex=[0,1,2,3].map(i=>({x:W*(.15+.233*i),y:H*.45}))},
  down(){let b=-1,bd=this.r*2.4;this.ex.forEach((e,i)=>{const d=Math.hypot(e.x-M.x,e.y-M.y);if(d<bd){bd=d;b=i}});
    if(b>=0&&!this.fin){this.d[b]=(this.d[b]+1)%4;blip(280+b*50,.07,'triangle',.06);buzz(6);
      if(this.d.every((v,i)=>v===run.arrows[i])){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1500)}}},
  draw(t){
    const f=this.field,open=this.fin?clamp01(1-(performance.now()-this.fin-500)/600):1;
    this.ex.forEach((e,i)=>{let tgt=this.d[i]*Math.PI/2,diff=((tgt-this.cur[i]+Math.PI*3)%(Math.PI*2))-Math.PI;this.cur[i]+=diff*.25;
      const a=this.cur[i];eyeGlyph(e.x,e.y,this.r,open,e.x+Math.sin(a)*400,e.y-Math.cos(a)*400,[f[1],f[2],f[0]])});
  }
});

// ================= pulse: something beats in groups. Listen to where it stops. =================
reg({id:'pulse',tier:'puz',cue:'',
  init(){this.k=run.pulseK;this.t0=performance.now();this.beat=-1;this.pulse=0;this.taps=[];this.evalAt=0;this.shake=0;this.done=false;this.p=0;this.fin=0},
  down(){if(this.fin)return;const now=performance.now();this.taps.push(now);this.evalAt=now+1500;blip(130,.1,'sine',.12);buzz(10)},
  draw(t){
    const f=this.field,now=performance.now(),gap=520,period=this.k*gap+2200,ph=(now-this.t0)%period,b=ph<this.k*gap?Math.floor(ph/gap):-1;
    if(b!==this.beat){this.beat=b;if(b>=0){this.pulse=1;blip(70,.16,'sine',.14);buzz(14)}}this.pulse*=.9;
    ctx.save();if(this.shake&&now-this.shake<300)ctx.translate(Math.sin(now/18)*7,0);
    const R=Math.min(W,H)*.16*(1+.22*this.pulse);ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(W/2,H*.46,R,0,6.28);ctx.fill();
    ctx.fillStyle=f[0];ctx.beginPath();ctx.arc(W/2,H*.46,R*.55,0,6.28);ctx.fill();
    ctx.fillStyle=f[1];this.taps.forEach((_,i)=>{ctx.beginPath();ctx.arc(W/2+(i-(this.taps.length-1)/2)*20,H*.46+R+36,6,0,6.28);ctx.fill()});ctx.restore();
    if(this.taps.length&&now>this.evalAt){const n=this.taps.length;this.taps=[];
      if(n===this.k&&!this.fin){this.fin=now;jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1100)}
      else if(!this.fin){this.shake=now;blip(100,.25,'sawtooth',.06);buzz([30,30])}}
  }
});

// ================= letters: scattered pieces that were once one word =================
reg({id:'letters',tier:'puz',cue:'',
  init(){const w=run.word,n=w.length,sw=Math.min(54,(W-40)/n-8);this.w=w;this.sw=sw;
    this.slots=[...w].map((_,i)=>({x:W/2+(i-(n-1)/2)*(sw+8),y:H*.34,t:null}));
    let ch=shuffle([...w]);if(ch.join('')===w)ch.reverse();
    this.tiles=ch.map((c,i)=>({c,x:W/2+(i-(n-1)/2)*(sw+8)+rnd(-8,8),y:H*(.58+.14*(i%2))+rnd(-14,14),slot:-1}));
    this.drag=null;this.done=false;this.p=0;this.fin=0},
  down(){const t=[...this.tiles].reverse().find(t=>Math.hypot(t.x-M.x,t.y-M.y)<this.sw*.8);
    if(t&&!this.fin){this.drag=t;if(t.slot>=0){this.slots[t.slot].t=null;t.slot=-1}blip(260,.06,'square',.05)}},
  move(){if(this.drag){this.drag.x=M.x;this.drag.y=M.y}},
  up(){const t=this.drag;this.drag=null;if(!t)return;let best=-1,bd=this.sw*.8;
    this.slots.forEach((s,j)=>{const d=Math.hypot(s.x-t.x,s.y-t.y);if(!s.t&&d<bd){bd=d;best=j}});
    if(best>=0){this.slots[best].t=t;t.slot=best;t.x=this.slots[best].x;t.y=this.slots[best].y;blip(420,.08,'triangle',.07);buzz(8);
      if(this.slots.every(s=>s.t)&&this.slots.map(s=>s.t.c).join('')===this.w&&!this.fin){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}},
  draw(t){
    const f=this.field,sw=this.sw;
    ctx.strokeStyle=f[1];ctx.lineWidth=3;ctx.globalAlpha=.5;for(const s of this.slots)ctx.strokeRect(s.x-sw/2,s.y-sw/2,sw,sw);ctx.globalAlpha=1;
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${sw*.62}px Chivo,system-ui,sans-serif`;
    for(const q of this.tiles){ctx.fillStyle=this.fin?f[2]:f[1];ctx.fillRect(q.x-sw/2,q.y-sw/2,sw,sw);ctx.fillStyle=f[0];ctx.fillText(q.c,q.x,q.y+2)}
  }
});
