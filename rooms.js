'use strict';
// Four floors, eleven puzzles, each used exactly once. What links them:
//   floor 1 → 2  the photo shows the minute the clock stopped (3:12)      → clock
//   floor 2 → 3  the wire colours, top to bottom                            → simon (flashing is noise; the order is the answer)
//   floor 3      the mirror shows three dice                                → dial
//   floor 3 → 4  the key from the safe                                      → the roof door
// Nothing says any of this. this.field = [bg, ink, accent, alt]; `run` is the current game (engine.js).
const NEEDS=[{},{wires:['clock'],pulse:['wires']},{wipe:['simon'],dial:['wipe']},{sneeze:['align']}];
const inRect=(r,x,y)=>x>r.x&&x<r.x+r.w&&y>r.y&&y<r.y+r.h;

// ================= a floor: a door that is also an eye, and the things in the room =================
reg({id:'floor',tier:'floor',
  init(){
    const ids=FLOOR_PUZ[run.f],px=W*.07,gw=W*.86,gap=W*.04;this.ids=ids;this.done=false;this.nudge=0;this.shake={};this.t0=performance.now();
    this.p=ids.filter(i=>run.solved[i]).length/ids.length;
    if(run.f<3){const w=(gw-gap)/2,h=H*.2;
      this.spots=[{id:ids[0],x:px,y:H*.42,w,h},{id:ids[1],x:px+w+gap,y:H*.42,w,h},{id:ids[2],x:px,y:H*.66,w:gw,h:H*.17}];this.door={x:W*.3,y:H*.09,w:W*.4,h:H*.24}}
    else{this.spots=[{id:'align',x:px,y:H*.55,w:gw,h:H*.2}];this.door={x:W*.28,y:H*.09,w:W*.44,h:H*.36,final:true}}
    this.stampT=run.stamp?performance.now():0;this.stamp=run.stamp;run.stamp=null;
    this.stars=Array.from({length:40},()=>({x:rnd(0,W),y:rnd(0,H*.5),r:rnd(.8,2.2)}));
  },
  gated(id){const n=NEEDS[run.f][id];return !!n&&!n.every(k=>run.solved[k])},
  ready(){return this.ids.filter(i=>i!=='sneeze').every(i=>run.solved[i])},
  down(){
    const d=this.door;
    if(inRect(d,M.x,M.y)){
      if(d.final){if(this.ready()&&run.solved.dial)go(ROOMS.sneeze,M.x,M.y);else this.shake.door=performance.now();return}
      if(this.ready())advance(M.x,M.y);else{this.shake.door=performance.now();blip(90,.12,'sawtooth',.04)}return}
    for(const s of this.spots)if(inRect(s,M.x,M.y)){
      if(run.solved[s.id]){blip(420,.06,'sine',.05);return}
      if(this.gated(s.id)){this.shake[s.id]=performance.now();buzz(10);blip(90,.12,'sawtooth',.04);return}
      go(ROOMS[s.id],M.x,M.y);return}
  },
  hintNow(){this.nudge=performance.now()},
  draw(t){
    const f=this.field,now=performance.now();
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,0,W,H*.07);ctx.fillRect(0,H*.87,W,H*.13);ctx.fillStyle=f[1];ctx.globalAlpha=.12;ctx.fillRect(0,H*.87,W,5);ctx.globalAlpha=1;
    if(run.f===3){ctx.fillStyle=f[1];for(const s of this.stars){ctx.globalAlpha=.4+.4*Math.sin(t/700+s.x);ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.28);ctx.fill()}ctx.globalAlpha=1;ctx.beginPath();ctx.arc(W*.82,H*.14,W*.06,0,6.28);ctx.fill()}
    for(let i=0;i<=run.f;i++){ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(W-22-i*14,26,4,0,6.28);ctx.fill()}   // which floor
    // the door
    const d=this.door,ready=d.final?this.ready()&&!!run.solved.dial:this.ready();let ox=0;if(this.shake.door&&now-this.shake.door<300)ox=Math.sin(now/18)*6;
    ctx.save();ctx.translate(ox,0);
    ctx.fillStyle=f[3];ctx.globalAlpha=.55;ctx.fillRect(d.x,d.y,d.w,d.h);ctx.globalAlpha=1;
    ctx.strokeStyle=ready?f[2]:f[1];ctx.lineWidth=ready?7:3;ctx.strokeRect(d.x,d.y,d.w,d.h);
    const ek=ready?clamp01((now-this.t0)/900):0;eyeGlyph(d.x+d.w/2,d.y+d.h*.3,Math.min(d.w*.18,34),.07+.93*ek+.03*Math.sin(t/900),M.x,M.y,[f[1],f[2],f[0]]);
    if(d.final&&!ready){ctx.fillStyle=f[1];ctx.fillRect(d.x+d.w*.42,d.y+d.h*.62,d.w*.16,d.h*.16);ctx.beginPath();ctx.arc(d.x+d.w/2,d.y+d.h*.62,d.w*.1,Math.PI,0);ctx.lineWidth=5;ctx.stroke()}
    ctx.restore();
    // the things in the room. Solving one leaves a mark on its tile.
    for(const s of this.spots){const ok=run.solved[s.id],g=this.gated(s.id);let sx=0;if(this.shake[s.id]&&now-this.shake[s.id]<300)sx=Math.sin(now/18)*6;
      ctx.save();ctx.translate(sx,0);ctx.globalAlpha=g?.45:1;
      ctx.fillStyle=f[1];ctx.globalAlpha=(g?.45:1)*(ok?.24:.11);ctx.fillRect(s.x,s.y,s.w,s.h);ctx.globalAlpha=g?.4:1;
      drawIcon(s.id,s.x+s.w/2,s.y+s.h/2,Math.min(s.h*.34,40),f[1],f);
      if(ok){ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(s.x+s.w-16,s.y+16,7,0,6.28);ctx.fill()}
      if(g){ctx.fillStyle=f[1];ctx.fillRect(s.x+s.w-26,s.y+s.h-22,14,11);ctx.strokeStyle=f[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(s.x+s.w-19,s.y+s.h-22,5,Math.PI,0);ctx.stroke()}
      if(this.stamp===s.id&&now-this.stampT<900){const k=(now-this.stampT)/900;ctx.globalAlpha=1-k;ctx.strokeStyle=f[2];ctx.lineWidth=5;ctx.strokeRect(s.x-k*14,s.y-k*14,s.w+k*28,s.h+k*28)}
      ctx.restore()}
    // after a long silence: where to look next
    if(this.nudge&&now-this.nudge<6000){const s=this.spots.find(s=>!run.solved[s.id]&&!this.gated(s.id)),r=ready?d:s;
      if(r){ctx.globalAlpha=.5+.5*Math.sin(now/200);ctx.strokeStyle=f[2];ctx.lineWidth=4;ctx.strokeRect(r.x-4,r.y-4,r.w+8,r.h+8);ctx.globalAlpha=1}}
  }
});

// ================= FLOOR 1 · lobby =================
// lantern: a dark wall. Only what the light touches speaks. The four arrows it shows are the answer to gaze.
reg({id:'lantern',tier:'puz',
  init(){this.ar=run.arrows.map((d,i)=>({d,x:W*(.15+.233*i)+rnd(-6,6),y:rnd(H*.22,H*.72),lit:0}));
    this.dec=Array.from({length:8},()=>({x:rnd(30,W-30),y:rnd(110,H-110),k:(Math.random()*3)|0}));
    this.sx=W/2;this.sy=H/2;this.done=false;this.p=0;this.fin=0},
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
// gaze: four portraits. Tap one and it turns. What should they be looking at?
reg({id:'gaze',tier:'puz',pin:'arrows',
  init(){this.d=run.arrows.map(t=>(t+1+((Math.random()*3)|0))%4);this.cur=this.d.map(v=>v*Math.PI/2);this.done=false;this.p=0;this.fin=0;this.r=Math.min(W*.058,26);
    this.ex=[0,1,2,3].map(i=>({x:W*(.15+.233*i),y:H*.45}))},
  down(){let b=-1,bd=this.r*2.4;this.ex.forEach((e,i)=>{const d=Math.hypot(e.x-M.x,e.y-M.y);if(d<bd){bd=d;b=i}});
    if(b>=0&&!this.fin){this.d[b]=(this.d[b]+1)%4;blip(280+b*50,.07,'triangle',.06);buzz(6);
      if(this.d.every((v,i)=>v===run.arrows[i])){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1500)}}},
  draw(t){
    const f=this.field,open=this.fin?clamp01(1-(performance.now()-this.fin-500)/600):1;
    this.ex.forEach((e,i)=>{const tgt=this.d[i]*Math.PI/2,diff=((tgt-this.cur[i]+Math.PI*3)%(Math.PI*2))-Math.PI;this.cur[i]+=diff*.25;
      ctx.strokeStyle=f[1];ctx.globalAlpha=.4;ctx.lineWidth=3;ctx.strokeRect(e.x-this.r*1.9,e.y-this.r*1.6,this.r*3.8,this.r*3.2);ctx.globalAlpha=1;
      const a=this.cur[i];eyeGlyph(e.x,e.y,this.r,open,e.x+Math.sin(a)*400,e.y-Math.cos(a)*400,[f[1],f[2],f[0]])});
  }
});
// tear: a photograph in six pieces. It shows a clock.
reg({id:'tear',tier:'puz',
  init(){const pw=Math.min(W*.8,300),ph=pw*.72;this.pw=pw;this.ph=ph;this.fx=(W-pw)/2;this.fy=H*.16;
    this.oc=document.createElement('canvas');this.oc.width=Math.ceil(pw);this.oc.height=Math.ceil(ph);drawPanel(this.oc.getContext('2d'),0,0,0,pw,ph);
    const cw=pw/3,ch=ph/2;this.cw=cw;this.ch=ch;
    this.pc=shuffle([0,1,2,3,4,5]).map((i,k)=>({i,tx:this.fx+(i%3)*cw,ty:this.fy+((i/3)|0)*ch,x:W/6+(k%3)*(W/3)-cw/2+rnd(-8,8),y:H*.56+((k/3)|0)*(ch+14)+rnd(-6,6),placed:false,rot:rnd(-.2,.2)}));
    this.drag=null;this.done=false;this.p=0;this.fin=0},
  down(){const q=[...this.pc].reverse().find(q=>!q.placed&&M.x>q.x&&M.x<q.x+this.cw&&M.y>q.y&&M.y<q.y+this.ch);
    if(q){this.drag=q;this.ox=M.x-q.x;this.oy=M.y-q.y;this.pc.splice(this.pc.indexOf(q),1);this.pc.push(q);blip(260,.06,'square',.05)}},
  move(){if(this.drag){this.drag.x=M.x-this.ox;this.drag.y=M.y-this.oy}},
  up(){const q=this.drag;this.drag=null;if(!q)return;
    if(Math.hypot(q.x-q.tx,q.y-q.ty)<30){q.x=q.tx;q.y=q.ty;q.placed=true;q.rot=0;blip(520,.08,'triangle',.07);buzz(8);
      this.p=this.pc.filter(p=>p.placed).length/6;
      if(this.pc.every(p=>p.placed)&&!this.fin){this.fin=performance.now();jingle();setTimeout(()=>{this.done=true},1800)}}},
  draw(t){const f=this.field;
    ctx.strokeStyle=f[1];ctx.globalAlpha=.3;ctx.setLineDash([8,8]);ctx.lineWidth=2;ctx.strokeRect(this.fx,this.fy,this.pw,this.ph);ctx.setLineDash([]);ctx.globalAlpha=1;
    for(const q of this.pc){ctx.save();ctx.translate(q.x+this.cw/2,q.y+this.ch/2);ctx.rotate(q.rot);
      ctx.drawImage(this.oc,(q.i%3)*this.cw,((q.i/3)|0)*this.ch,this.cw,this.ch,-this.cw/2,-this.ch/2,this.cw,this.ch);
      ctx.strokeStyle=q.placed?'transparent':f[1];ctx.lineWidth=2;ctx.strokeRect(-this.cw/2,-this.ch/2,this.cw,this.ch);ctx.restore()}
  }
});

// ================= FLOOR 2 · ward corridor =================
// clock: the hands move. When did it stop? (the photograph from downstairs says)
reg({id:'clock',tier:'puz',pin:'photo',
  init(){this.cx=W/2;this.cy=H*.42;this.R=Math.min(W*.38,170);this.hh=rnd(0,6.28);this.mh=rnd(0,6.28);this.drag=null;this.hold=0;this.fin=0;this.done=false;this.p=0},
  ang(){return Math.atan2(M.x-this.cx,-(M.y-this.cy))},
  tip(a,k){return [this.cx+Math.sin(a)*this.R*k,this.cy-Math.cos(a)*this.R*k]},
  down(){const [hx,hy]=this.tip(this.hh,.55),[mx,my]=this.tip(this.mh,.8),dh=Math.hypot(hx-M.x,hy-M.y),dm=Math.hypot(mx-M.x,my-M.y);
    if(Math.min(dh,dm)<70){this.drag=dm<=dh?'mh':'hh';blip(240,.05,'square',.05)}},
  move(){if(this.drag&&!this.fin)this[this.drag]=this.ang()},
  up(){this.drag=null},
  dif(a,b){const d=Math.abs(((a-b)%(Math.PI*2)+Math.PI*2)%(Math.PI*2));return Math.min(d,Math.PI*2-d)},
  draw(t){
    const f=this.field;drawClockFace(this.cx,this.cy,this.R,this.hh,this.mh,f[1],f[0]);
    if(!this.fin){if(this.dif(this.mh,TIME_M)<.12&&this.dif(this.hh,TIME_H)<.2){if(++this.hold>25){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}else this.hold=0}
    else{ctx.fillStyle=f[2];ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(this.cx,this.cy,this.R*1.08,0,6.28);ctx.fill();ctx.globalAlpha=1}
  }
});
// wires: a fuse box. Join each end to its own colour. The order you find them in matters later.
reg({id:'wires',tier:'puz',
  init(){this.L=[0,1,2,3].map(i=>({x:W*.2,y:H*.3+i*H*.1,c:i,link:-1}));this.R=run.colors.map((c,i)=>({x:W*.8,y:H*.3+i*H*.1,c}));
    this.drag=null;this.done=false;this.fin=0;this.p=0;this.bad=0},
  down(){const i=this.L.findIndex(l=>l.link<0&&Math.hypot(l.x-M.x,l.y-M.y)<34);if(i>=0){this.drag={i,x:M.x,y:M.y};blip(300,.05,'square',.05)}},
  move(){if(this.drag){this.drag.x=M.x;this.drag.y=M.y}},
  up(){const d=this.drag;this.drag=null;if(!d)return;const l=this.L[d.i],j=this.R.findIndex(r=>Math.hypot(r.x-M.x,r.y-M.y)<38);
    if(j>=0&&this.R[j].c===l.c&&!this.R.some((r,k)=>k===j&&r.used)){l.link=j;this.R[j].used=true;blip(560,.08,'triangle',.07);buzz(8);this.p=this.L.filter(l=>l.link>=0).length/4;
      if(this.L.every(l=>l.link>=0)&&!this.fin){this.fin=performance.now();jingle();setTimeout(()=>{this.done=true},1300)}}
    else if(j>=0){this.bad=performance.now();buzz([20,20]);blip(110,.15,'sawtooth',.05)}},
  draw(t){const f=this.field;
    ctx.strokeStyle=f[1];ctx.globalAlpha=.35;ctx.lineWidth=3;ctx.strokeRect(W*.1,H*.24,W*.8,H*.46);ctx.globalAlpha=1;
    ctx.lineWidth=8;ctx.lineCap='round';
    for(const l of this.L){if(l.link>=0){const r=this.R[l.link];ctx.strokeStyle=COLORS[l.c];ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.bezierCurveTo(l.x+90,l.y,r.x-90,r.y,r.x,r.y);ctx.stroke()}}
    if(this.drag){const l=this.L[this.drag.i];ctx.strokeStyle=COLORS[l.c];ctx.beginPath();ctx.moveTo(l.x,l.y);ctx.lineTo(this.drag.x,this.drag.y);ctx.stroke()}
    for(const l of this.L){ctx.fillStyle=COLORS[l.c];ctx.beginPath();ctx.arc(l.x,l.y,16,0,6.28);ctx.fill()}
    for(const r of this.R){ctx.fillStyle=COLORS[r.c];ctx.beginPath();ctx.arc(r.x,r.y,16,0,6.28);ctx.fill();ctx.fillStyle=f[0];ctx.beginPath();ctx.arc(r.x,r.y,6,0,6.28);ctx.fill()}
  }
});
// pulse: a monitor beats in groups. Listen to where it stops. (The power is back on, so it has something to say.)
reg({id:'pulse',tier:'puz',
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

// ================= FLOOR 3 · basement records =================
// simon: four coloured buttons that flash at random. The order that matters is the one from the fuse box.
reg({id:'simon',tier:'puz',pin:'colors',
  init(){this.pads=[0,1,2,3].map(i=>({x:W*(.28+.44*(i%2)),y:H*(.34+.2*((i/2)|0)),c:i,lit:0}));this.seq=run.colors.slice();this.step=0;this.demoAt=performance.now()+1500;this.done=false;this.p=0;this.fin=0},
  flash(p){p.lit=1;blip(240+p.c*110,.18,'triangle',.1)},
  down(){const p=this.pads.find(p=>Math.hypot(p.x-M.x,p.y-M.y)<W*.17);if(!p||this.fin)return;this.flash(p);buzz(8);this.demoAt=performance.now()+4000;
    if(p.c===this.seq[this.step]){this.step++;this.p=this.step/4;if(this.step>=4){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}
    else{this.step=0;this.p=0;buzz([20,20]);blip(100,.2,'sawtooth',.05)}},
  draw(t){const now=performance.now();
    if(!this.fin&&now>this.demoAt){this.flash(pick(this.pads));this.demoAt=now+rnd(500,1100)}   // noise: it flashes, but not in the right order
    for(const p of this.pads){p.lit*=.92;ctx.fillStyle=COLORS[p.c];ctx.globalAlpha=.45+.55*p.lit;ctx.beginPath();ctx.arc(p.x,p.y,W*.15*(1+.08*p.lit),0,6.28);ctx.fill();ctx.globalAlpha=1}
    if(this.fin){ctx.fillStyle='#fffbe8';ctx.globalAlpha=clamp01((now-this.fin)/1000)*.25;ctx.fillRect(0,0,W,H);ctx.globalAlpha=1}
  }
});
// wipe: a mirror under years of dust. Rub it clean; it shows three dice.
reg({id:'wipe',tier:'puz',
  init(){this.mx=W*.12;this.my=H*.1;this.mw=W*.76;this.mh=H*.62;this.gc=16;this.gr=22;this.grid=new Uint8Array(this.gc*this.gr);this.cnt=0;
    this.dust=document.createElement('canvas');this.dust.width=Math.ceil(this.mw);this.dust.height=Math.ceil(this.mh);const c=this.dust.getContext('2d');
    c.fillStyle='#7a7366';c.fillRect(0,0,this.mw,this.mh);c.fillStyle='rgba(0,0,0,.12)';for(let i=0;i<260;i++)c.fillRect(rnd(0,this.mw),rnd(0,this.mh),rnd(2,22),rnd(1,3));
    this.lx=0;this.ly=0;this.done=false;this.p=0;this.fin=0},
  down(){this.lx=M.x;this.ly=M.y},
  move(){if(!M.down||this.fin)return;const c=this.dust.getContext('2d');c.globalCompositeOperation='destination-out';c.lineCap='round';c.lineWidth=44;c.beginPath();c.moveTo(this.lx-this.mx,this.ly-this.my);c.lineTo(M.x-this.mx,M.y-this.my);c.stroke();c.globalCompositeOperation='source-over';
    const cw=this.mw/this.gc,ch=this.mh/this.gr;for(let a=0;a<this.gc;a++)for(let b=0;b<this.gr;b++){const x=this.mx+(a+.5)*cw,y=this.my+(b+.5)*ch,i=b*this.gc+a;if(!this.grid[i]&&Math.hypot(x-M.x,y-M.y)<26){this.grid[i]=1;this.cnt++}}
    this.lx=M.x;this.ly=M.y;this.p=this.cnt/(this.gc*this.gr)/.62;
    if(this.cnt/(this.gc*this.gr)>.62&&!this.fin){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1500)}},
  draw(t){const f=this.field;
    ctx.fillStyle=f[3];ctx.globalAlpha=.55;ctx.fillRect(this.mx,this.my,this.mw,this.mh);ctx.globalAlpha=1;
    run.digits.forEach((d,i)=>{const cx=this.mx+this.mw*(.2+.3*i),cy=this.my+this.mh*.5,s=this.mw*.2;ctx.fillStyle=f[1];ctx.globalAlpha=.9;ctx.fillRect(cx-s*.5,cy-s*.5,s,s);ctx.globalAlpha=1;drawDice(d,cx,cy,s*.9,f[0])});
    ctx.globalAlpha=this.fin?clamp01(1-(performance.now()-this.fin)/700):1;ctx.drawImage(this.dust,this.mx,this.my);ctx.globalAlpha=1;
    ctx.strokeStyle=f[1];ctx.lineWidth=6;ctx.strokeRect(this.mx,this.my,this.mw,this.mh)}
});
// dial: a safe with three wheels. Swipe a wheel up or down.
reg({id:'dial',tier:'puz',pin:'digits',
  init(){do{this.v=[0,0,0].map(()=>1+((Math.random()*6)|0))}while(this.v.every((x,i)=>x===run.digits[i]));
    this.ws=[0,1,2].map(i=>({x:W*(.1+.29*i),y:H*.34,w:W*.26,h:H*.3}));this.drag=-1;this.ay=0;this.done=false;this.p=0;this.fin=0},
  down(){this.drag=this.ws.findIndex(w=>inRect(w,M.x,M.y));this.ay=M.y},
  move(){if(this.drag<0||this.fin)return;const dy=M.y-this.ay;
    if(Math.abs(dy)>36){const i=this.drag;this.v[i]=((this.v[i]-1+(dy<0?1:5))%6)+1;this.ay=M.y;blip(300+this.v[i]*40,.05,'square',.05);buzz(5);
      if(this.v.every((x,j)=>x===run.digits[j])){this.fin=performance.now();jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}},
  up(){this.drag=-1},
  draw(t){const f=this.field;ctx.strokeStyle=f[1];ctx.lineWidth=6;ctx.strokeRect(W*.05,H*.28,W*.9,H*.42);
    this.ws.forEach((w,i)=>{ctx.fillStyle=f[1];ctx.globalAlpha=.16;ctx.fillRect(w.x,w.y,w.w,w.h);ctx.globalAlpha=1;
      drawDice(this.v[i],w.x+w.w/2,w.y+w.h/2,w.w*.7,this.fin?f[2]:f[1]);
      ctx.fillStyle=f[1];ctx.globalAlpha=.5;ctx.beginPath();ctx.moveTo(w.x+w.w/2,w.y+8);ctx.lineTo(w.x+w.w/2+10,w.y+22);ctx.lineTo(w.x+w.w/2-10,w.y+22);ctx.fill();
      ctx.beginPath();ctx.moveTo(w.x+w.w/2,w.y+w.h-8);ctx.lineTo(w.x+w.w/2+10,w.y+w.h-22);ctx.lineTo(w.x+w.w/2-10,w.y+w.h-22);ctx.fill();ctx.globalAlpha=1})}
});

// ================= FLOOR 4 · roof =================
// align: two scattered layers; turn one until they become a single shape. The closer, the higher the tone.
reg({id:'align',tier:'puz',
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
    if(this.drag&&!this.locked&&now-this.last>130){this.last=now;blip(160+(1-d/(this.per/2))*600,.07,'sine',.05)}
    if(!this.locked){if(d<.05){if(++this.hold>20){this.locked=now;this.b=this.a;this.drag=false;jingle();buzz([15,30,15]);setTimeout(()=>{this.done=true},1300)}}else this.hold=0}
    if(this.locked){ctx.strokeStyle=f[1];ctx.lineWidth=4;ctx.beginPath();this.pts.forEach((q,i)=>{const [x,y]=P(this.a+q[0],q[1]);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.stroke();
      ctx.fillStyle=f[2];ctx.globalAlpha=.35;ctx.fill();ctx.globalAlpha=1}
  }
});
// sneeze: the last door. Hold to breathe in; let go inside the red band. Too long and it slips away.
reg({id:'sneeze',tier:'puz',lo:.78,hi:.92,over:.97,
  init(){this.m=0;this.t0=0;this.shake=0;this.done=false;this.p=0;this.won=false;this.fx=Parts()},
  down(){if(this.won)return;this.t0=performance.now();blip(180,.2,'sine',.05)},
  up(){if(this.won||!this.t0)return;const m=this.m;this.t0=0;if(m>=this.lo&&m<=this.hi)this.win();else if(m>.05)this.fail()},
  fail(){this.t0=0;this.m=0;this.shake=performance.now();buzz([30,40,30]);blip(120,.25,'sawtooth',.06)},
  win(){const f=this.field;this.won=true;this.fx.burst(W/2,H/2,160,[f[2],f[3],f[1],'#f4eedd'],11);jingle();buzz([20,40,20,40,60]);setTimeout(()=>{this.done=true},1300)},
  draw(t){const f=this.field,R=Math.min(W,H*.8)*.42,cx=W/2,cy=H/2;
    if(this.t0){this.m=Math.min(1,(performance.now()-this.t0)/1800);if(this.m>this.over)this.fail()}
    this.p=this.m*.9;let ox=0;if(this.shake&&performance.now()-this.shake<350)ox=Math.sin(t/20)*10;
    ctx.save();ctx.translate(ox,0);
    if(!this.won){ctx.strokeStyle=f[2];ctx.lineWidth=R*(this.hi-this.lo);ctx.beginPath();ctx.arc(cx,cy,R*(this.lo+this.hi)/2,0,6.28);ctx.stroke();
      const r=Math.max(6,R*this.m)+(this.t0&&!reduce?Math.sin(t/40)*this.m*4:0);ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(cx,cy,r,0,6.28);ctx.fill();
      if(this.m>=this.lo&&this.m<=this.hi){ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(cx,cy,R*.08,0,6.28);ctx.fill()}}
    ctx.restore();this.fx.draw(.18)}
});
