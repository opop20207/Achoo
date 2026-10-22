'use strict';
// Every room: a mindless little toy. `reveal` is what it secretly was, shown for a beat after you win.
// tier 1 cute / 2 odd / 3 uncanny / 4 grotesque / 5 finale. this.field = [bg, ink, accent, alt]
const eyesAt=(pts,t,k,r=14)=>{for(const e of pts)eyeGlyph(e.x,e.y,(e.r||r),Math.max(0,Math.min(1,k*3-(e.d||0))),M.x,M.y,eyeCols())};
const sharp=(x,y,w,h,up)=>{ctx.beginPath();ctx.moveTo(x-w/2,y);ctx.lineTo(x+w/2,y);ctx.lineTo(x,y+(up?-h:h));ctx.closePath();ctx.fill()};

// ================= TIER 1: cute =================
reg({id:'pop',tier:1,cue:'Pop',
  init(){this.list=[];this.n=0;this.need=Math.round(10*DIFF);this.done=false;this.p=0;this.fx=Parts();for(let i=0;i<20;i++)this.spawn()},
  spawn(x,y){const f=this.field;this.list.push({x:x??rnd(30,W-30),y:y??rnd(H*.3,H+60),r:rnd(24,58),vy:rnd(-.9,-.3),ph:rnd(0,6.28),c:pick([f[1],f[2],f[3]])})},
  down(){const hit=this.list.filter(b=>Math.hypot(b.x-M.x,b.y-M.y)<b.r+10).sort((a,b)=>a.r-b.r)[0];if(hit)this.pop(hit)},
  move(){this.down()},
  pop(b){this.list.splice(this.list.indexOf(b),1);blip(900-b.r*7,.15,'triangle');buzz(8);this.fx.burst(b.x,b.y,14,[b.c],5);
    this.n++;this.p=this.n/this.need;if(this.n>=this.need)this.done=true;setTimeout(()=>this.spawn(rnd(30,W-30),H+80),500)},
  draw(t){const f=this.field;
    for(const b of this.list){if(!reduce){b.y+=b.vy;b.x+=Math.sin(t/900+b.ph)*.4}if(b.y<-b.r*2)b.y=H+b.r*2;
      const w=reduce?1:1+Math.sin(t/300+b.ph)*.05;ctx.fillStyle=b.c;ctx.beginPath();ctx.ellipse(b.x,b.y,b.r*w,b.r/w,0,0,6.28);ctx.fill();
      ctx.fillStyle=f[0];ctx.beginPath();ctx.arc(b.x-b.r*.38,b.y-b.r*.4,b.r*.13,0,6.28);ctx.fill()}
    this.fx.draw()},
  reveal(t,k){eyesAt(this.list.map(b=>({x:b.x,y:b.y,r:b.r*.6})),t,k)}   // the bubbles were never bubbles
});

reg({id:'hold',tier:1,cue:'Hold',
  init(){this.list=[];this.done=false;this.p=0;this.t0=0;const g=26;for(let x=g/2;x<W;x+=g)for(let y=g/2;y<H;y+=g)this.list.push({hx:x,hy:y,x,y,vx:0,vy:0})},
  draw(){const f=this.field;let near=0;const R=100;
    for(const p of this.list){const dx=p.x-M.x,dy=p.y-M.y,d=Math.hypot(dx,dy)+.001;
      if(M.down){p.vx-=dx/d*Math.min(d,300)*.004;p.vy-=dy/d*Math.min(d,300)*.004;if(d<60){p.vx+=dx/d*.35;p.vy+=dy/d*.35}}
      else{if(M.active&&d<150){const k=(1-d/150)*1.6;p.vx+=dx/d*k;p.vy+=dy/d*k}p.vx+=(p.hx-p.x)*.05;p.vy+=(p.hy-p.y)*.05}
      p.vx*=M.down?.92:.86;p.vy*=M.down?.92:.86;p.x+=p.vx;p.y+=p.vy;if(M.down&&d<R)near++;
      const s=Math.hypot(p.vx,p.vy);ctx.fillStyle=s>1.2?f[2]:f[1];ctx.beginPath();ctx.arc(p.x,p.y,2+Math.min(s*.6,4),0,6.28);ctx.fill()}
    const q=M.down?near/(this.list.length*.9):0;this.p+=(q-this.p)*.15;
    if(q>=1&&!this.done){this.t0=this.t0||performance.now();if(performance.now()-this.t0>350)this.done=true}else if(q<1)this.t0=0},
  reveal(t,k){eyesAt(this.list.filter((_,i)=>i%7===0).map(p=>({x:p.x,y:p.y,r:7,d:(p.hx%9)/30})),t,k)}   // a crowd, all looking at one place
});

reg({id:'eat',tier:1,cue:'Eat',
  init(){this.seg=Array.from({length:30},()=>({x:W/2,y:H*.6}));this.hx=W/2;this.hy=H*.6;this.n=0;this.need=Math.round(8*Math.min(1.2,DIFF));this.done=false;this.p=0;this.fx=Parts();
    this.food=Array.from({length:this.need},()=>({x:rnd(40,W-40),y:rnd(110,H-80),r:rnd(12,18),ph:rnd(0,6.28)}))},
  draw(t){const f=this.field,cols=[f[2],f[3],f[1]];
    if(M.active){this.hx=M.x;this.hy=M.y}
    let px=this.hx,py=this.hy;this.seg.forEach((s,i)=>{s.x+=(px-s.x)*(.34-i*.007);s.y+=(py-s.y)*(.34-i*.007);px=s.x;py=s.y});
    for(let i=this.food.length-1;i>=0;i--){const q=this.food[i],r=q.r+(reduce?0:Math.sin(t/250+q.ph)*2);
      ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(q.x,q.y,r,0,6.28);ctx.fill();
      if(Math.hypot(q.x-this.seg[0].x,q.y-this.seg[0].y)<r+22){this.food.splice(i,1);this.n++;this.p=this.n/this.need;blip(500+this.n*60,.12,'square',.07);buzz(10);this.fx.burst(q.x,q.y,10,cols,4);if(this.n>=this.need)this.done=true}}
    for(let i=this.seg.length-1;i>=0;i--){const s=this.seg[i],r=5+(this.seg.length-i)*1.1;ctx.fillStyle=cols[i%3];ctx.beginPath();ctx.arc(s.x,s.y,r,0,6.28);ctx.fill()}
    this.fx.draw(.05)},
  reveal(t,k){const s=this.seg[0];eyesAt(this.seg.filter((_,i)=>i%4===0).map(q=>({x:q.x,y:q.y,r:12})),t,k)}   // it ate eyes, and now it has them
});

reg({id:'fling',tier:1,cue:'Fling',words:'ACHOO아츄에취!?',
  init(){this.list=[];this.drag=null;this.n=0;this.need=5;this.done=false;this.p=0;this.fx=Parts();this.tr=Math.max(38,W*.1);this.tx=W/2;this.ty=H*.3},
  down(){const p=[...this.list].reverse().find(l=>Math.hypot(l.x-M.x,l.y-M.y)<l.s*.7),f=this.field;
    if(p)this.drag=p;else{this.drag={ch:pick([...this.words]),x:M.x,y:M.y,vx:0,vy:0,s:rnd(64,96),rot:rnd(-.5,.5),vr:rnd(-.08,.08),c:pick([f[1],f[2],f[3]])};this.list.push(this.drag)}blip(300,.08,'square',.06)},
  up(){if(this.drag){this.drag.vx=M.sx*1.3;this.drag.vy=M.sy*1.3;this.drag=null}},
  draw(t){const f=this.field;
    this.tx=W/2+Math.sin(t/(reduce?4000:850))*(W/2-this.tr-12);
    ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(this.tx,this.ty,this.tr,0,6.28);ctx.fill();
    ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(this.tx,this.ty,this.tr*.45,0,6.28);ctx.fill();
    ctx.textAlign='center';ctx.textBaseline='middle';
    for(let i=this.list.length-1;i>=0;i--){const l=this.list[i];
      if(l===this.drag){l.x+=(M.x-l.x)*.55;l.y+=(M.y-l.y)*.55;l.vx=l.vy=0;l.rot*=.9}
      else{l.vy+=.45;l.x+=l.vx;l.y+=l.vy;l.rot+=l.vr;const fl=H-l.s*.5-16;
        if(l.y>fl){l.y=fl;l.vy*=-.5;l.vx*=.9;l.vr*=.8}if(l.y<l.s/2){l.y=l.s/2;l.vy*=-.5}
        if(l.x<l.s/2||l.x>W-l.s/2){l.x=Math.max(l.s/2,Math.min(W-l.s/2,l.x));l.vx*=-.7}}
      if(Math.hypot(l.x-this.tx,l.y-this.ty)<this.tr+l.s*.3){this.list.splice(i,1);if(this.drag===l)this.drag=null;this.n++;this.p=this.n/this.need;blip(700+this.n*80,.14,'triangle',.1);buzz(15);this.fx.burst(l.x,l.y,18,[f[1],f[2],f[3]],6);if(this.n>=this.need)this.done=true;continue}
      ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.rot);ctx.font=`900 ${l.s}px Chivo,system-ui,sans-serif`;ctx.fillStyle=l.c;ctx.fillText(l.ch,0,0);ctx.restore()}
    if(this.list.length>30)this.list.shift();this.fx.draw()},
  reveal(t,k){const f=this.field,r=this.tr*(1+k*.5);eyeGlyph(this.tx,this.ty,r*.9,Math.min(1,k*3),M.x,M.y,[f[1],f[2],f[0]])}   // the target was an eye. you hit it five times.
});

reg({id:'poke',tier:1,cue:'Poke',
  init(){this.n=0;this.need=Math.round(12*Math.min(1.2,DIFF));this.done=false;this.p=0;this.sx=0;this.sy=0;this.vx=0;this.vy=0;this.fx=Parts();this.hurt=0},
  down(){const dx=M.x-W/2,dy=M.y-H/2,d=Math.hypot(dx,dy)||1;this.vx-=dx/d*14;this.vy-=dy/d*14;this.n++;this.p=this.n/this.need;this.hurt=performance.now();
    blip(300+this.n*45,.12,'sine',.1);buzz(8);this.fx.burst(M.x,M.y,6,[this.field[2],this.field[1]],3);if(this.n>=this.need)this.done=true},
  draw(t,sad){const f=this.field,R=Math.min(W,H)*.26,k=this.n/this.need;
    this.vx+=-this.sx*.12;this.vy+=-this.sy*.12;this.vx*=.88;this.vy*=.88;this.sx+=this.vx;this.sy+=this.vy;
    const rx=R*(1+Math.abs(this.sx)/R*.3-Math.abs(this.sy)/R*.15),ry=R*(1+Math.abs(this.sy)/R*.3-Math.abs(this.sx)/R*.15),cx=W/2+this.sx*.4,cy=H/2+this.sy*.4;
    ctx.fillStyle=f[2];ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.fill();
    ctx.fillStyle=f[1];[-1,1].forEach(s=>{ctx.beginPath();ctx.arc(cx+s*R*.32+(M.x-cx)*.03,cy-R*.12+(M.y-cy)*.03,R*.07,0,6.28);ctx.fill()});
    ctx.strokeStyle=f[1];ctx.lineWidth=R*.05;ctx.lineCap='round';ctx.beginPath();
    const smile=sad?-1:(performance.now()-this.hurt<250?-.2:1-k*1.4);   // it smiles less and less
    ctx.arc(cx,cy+R*.2+(smile<0?R*.18:0),R*.22,smile<0?3.6:.2,smile<0?5.8:2.94);ctx.stroke();
    this.fx.draw()},
  reveal(t,k){this.draw(t,true);const R=Math.min(W,H)*.26;ctx.fillStyle=this.field[3];   // tears
    for(let i=0;i<8;i++){ctx.beginPath();ctx.arc(W/2+(i%2?1:-1)*R*.32,H/2-R*.05+((t/4+i*40)%(R*1.3)),5,0,6.28);ctx.fill()}}
});

// ================= TIER 2: odd =================
reg({id:'chase',tier:2,cue:'Catch',
  init(){this.n=0;this.need=3;this.done=false;this.p=0;this.fx=Parts();this.spawn()},
  spawn(){this.x=rnd(60,W-60);this.y=rnd(140,H-100);this.vx=this.vy=0;this.sp=2.2+this.n*.7},
  draw(t){const f=this.field;
    if(M.active){const dx=this.x-M.x,dy=this.y-M.y,d=Math.hypot(dx,dy)||1;
      if(d<190){const k=(1-d/190)*this.sp*(.6+.4*DIFF);this.vx+=dx/d*k;this.vy+=dy/d*k}
      if(d<30){this.n++;this.p=this.n/this.need;blip(500+this.n*150,.15,'square',.08);buzz(20);this.fx.burst(this.x,this.y,16,[f[2],f[1]],5);if(this.n>=this.need)this.done=true;else this.spawn()}}
    this.vx*=.9;this.vy*=.9;this.x+=this.vx;this.y+=this.vy;
    if(this.x<24||this.x>W-24){this.x=Math.max(24,Math.min(W-24,this.x));this.vx*=-.4}
    if(this.y<90||this.y>H-40){this.y=Math.max(90,Math.min(H-40,this.y));this.vy*=-.4}
    if(!this.done){ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(this.x,this.y,16,0,6.28);ctx.fill();ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(this.x,this.y,5,0,6.28);ctx.fill()}
    this.fx.draw(.05)},
  reveal(t,k){const f=this.field,r=16+k*Math.max(W,H)*.35;eyeGlyph(this.x+(W/2-this.x)*k,this.y+(H/2-this.y)*k,r,Math.min(1,k*3),M.x,M.y,[f[1],f[2],f[0]])}   // it wasn't running. it was leading you here.
});

reg({id:'dark',tier:2,cue:'Seek',
  init(){this.items=Array.from({length:6},()=>({x:rnd(40,W-40),y:rnd(110,H-80),got:0}));this.n=0;this.done=false;this.p=0;this.fx=Parts();this.sx=W/2;this.sy=H/2},
  draw(t,shrink=0){const f=this.field,R=Math.min(W,H)*.2*(1-shrink);
    if(M.active){this.sx+=(M.x-this.sx)*.35;this.sy+=(M.y-this.sy)*.35}
    for(const it of this.items){if(it.got&&!shrink)continue;ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(it.x,it.y,9+Math.sin(t/200+it.x)*2,0,6.28);ctx.fill();
      if(!it.got&&Math.hypot(it.x-this.sx,it.y-this.sy)<R*.35){it.got=1;this.n++;this.p=this.n/6;blip(400+this.n*90,.2,'sine',.1);buzz(15);this.fx.burst(it.x,it.y,12,[f[2],f[1]],4);if(this.n>=6)this.done=true}}
    this.fx.draw(.04);
    ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);ctx.arc(this.sx,this.sy,Math.max(0,R),0,6.28,true);ctx.clip('evenodd');ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.restore()},
  reveal(t,k){this.draw(t,k);   // the light goes out; the "stars" were eyes the whole time
    eyesAt(this.items.map(i=>({x:i.x,y:i.y,r:13})),t,k)}
});

reg({id:'echo',tier:2,cue:'Echo',
  init(){this.hist=[];this.total=8;this.items=Array.from({length:8},()=>({x:rnd(40,W-40),y:rnd(110,H-80)}));this.done=false;this.p=0;this.hit=0;this.fx=Parts()},
  draw(t){const f=this.field,now=performance.now();
    this.hist.push({x:M.x,y:M.y,a:M.active});if(this.hist.length>70)this.hist.shift();const gh=this.hist[0];
    for(let i=this.items.length-1;i>=0;i--){const it=this.items[i];ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(it.x,it.y,10,0,6.28);ctx.fill();
      if(M.active&&Math.hypot(it.x-M.x,it.y-M.y)<28){this.items.splice(i,1);blip(500+i*40,.1,'sine',.08);buzz(8);this.fx.burst(it.x,it.y,8,[f[1],f[2]],3)}}
    if(gh.a){ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(gh.x,gh.y,18,0,6.28);ctx.fill();ctx.fillStyle=f[0];ctx.beginPath();ctx.arc(gh.x,gh.y,6,0,6.28);ctx.fill();
      if(M.active&&now-this.hit>900&&Math.hypot(gh.x-M.x,gh.y-M.y)<30){this.hit=now;buzz([40,30,40]);blip(90,.3,'sawtooth',.09);
        for(let i=0;i<2;i++){this.items.push({x:rnd(40,W-40),y:rnd(110,H-80)});this.total++}}}
    this.p=1-this.items.length/this.total;if(!this.items.length)this.done=true;this.stat=this.total;this.fx.draw(.05)},
  reveal(t,k){const gh=this.hist[0],f=this.field;   // it steps out of the past and is ahead of you now
    const x=gh.x+(M.x-gh.x)*(1-k)+(W/2-M.x)*k*.4,y=gh.y+(M.y-gh.y)*(1-k)-k*50;
    eyeGlyph(x,y,26+k*30,Math.min(1,k*3),M.x,M.y,[f[1],f[2],f[0]])}
});

reg({id:'swap',tier:2,cue:'Eat',
  init(){this.items=Array.from({length:8},()=>({x:rnd(40,W-40),y:rnd(110,H-80)}));this.total=8;this.done=false;this.p=0;this.fx=Parts();this.cx=W/2;this.cy=H/2},
  draw(t){const f=this.field;if(M.active){this.cx=W-M.x;this.cy=H-M.y}   // you are the reflection
    for(let i=this.items.length-1;i>=0;i--){const it=this.items[i];ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(it.x,it.y,10,0,6.28);ctx.fill();
      if(Math.hypot(it.x-this.cx,it.y-this.cy)<28){this.items.splice(i,1);blip(420+i*50,.1,'triangle',.08);buzz(8);this.fx.burst(it.x,it.y,8,[f[1],f[2]],3)}}
    ctx.strokeStyle=f[2];ctx.lineWidth=5;ctx.beginPath();ctx.arc(this.cx,this.cy,20,0,6.28);ctx.stroke();
    this.p=1-this.items.length/this.total;if(!this.items.length)this.done=true;this.fx.draw(.05)},
  reveal(t,k){const f=this.field;   // the real hand is where you aren't
    eyeGlyph(W-this.cx,H-this.cy,30+k*20,Math.min(1,k*3),W-this.cx,H-this.cy+40,[f[1],f[2],f[0]]);eyeGlyph(this.cx,this.cy,30+k*20,Math.min(1,k*3),M.x,M.y,[f[1],f[2],f[0]])}
});

// ================= TIER 3: uncanny =================
reg({id:'stare',tier:3,cue:'Still',
  init(){const n=7;this.eyes=Array.from({length:n},(_,i)=>({x:(i%2?W*.78:W*.22)+rnd(-20,20),y:H*(.16+.68*(i/(n-1)))+rnd(-10,10),r:Math.min(W*.09,30)+rnd(-3,3)}));
    this.t0=performance.now();this.p=0;this.done=false;this.lx=M.x;this.ly=M.y;this.shake=0},
  draw(t){const f=this.field,now=performance.now(),c=(now-this.t0)%4300,closed=c<2200,twitch=c>=2200&&c<2800,open=c>=2800;
    const lid=closed?0:twitch?.25+.25*Math.sin(t/40):1;
    const d=M.down?Math.hypot(M.x-this.lx,M.y-this.ly):0;this.lx=M.x;this.ly=M.y;
    if(closed)this.p=Math.min(1,this.p+d/(H*3.5/DIFF));
    else if(open&&d>2.2){this.p=Math.max(0,this.p-.015*d);if(now-this.shake>400){this.shake=now;buzz([30,30,30]);blip(100,.2,'sawtooth',.07)}}
    ctx.save();if(now-this.shake<220)ctx.translate(rnd(-5,5),rnd(-5,5));
    for(const e of this.eyes)eyeGlyph(e.x,e.y,e.r,lid,M.x,M.y,['#ffffff',f[2],'#000']);ctx.restore();
    ctx.strokeStyle=f[1];ctx.lineWidth=3;ctx.beginPath();ctx.arc(M.x,M.y,open?10:22,0,6.28);if(M.down)ctx.stroke();
    if(this.p>=1)this.done=true},
  reveal(t,k){const f=this.field;eyesAt(this.eyes.flatMap(e=>[{x:e.x,y:e.y,r:e.r*(1+k)},{x:e.x+(W/2-e.x)*.5,y:e.y+30,r:e.r*.6,d:.3}]),t,k)}
});

reg({id:'brush',tier:3,cue:'Brush',
  init(){const cols=6,rows=2,gap=10,pad=18,tw=(W-pad*2-gap*(cols-1))/cols,th=Math.min(110,H*.14),y0=H*.5-th-gap/2;
    this.teeth=[];for(let r=0;r<rows;r++)for(let c=0;c<cols;c++)this.teeth.push({x:pad+c*(tw+gap),y:y0+r*(th+gap),w:tw,h:th,s:.55+Math.random()*.45,tw:Math.random()});
    this.done=false;this.p=0;this.stat=cols*rows;this.fx=Parts()},
  move(){if(!M.down)return;for(const t of this.teeth)if(t.s>0&&M.x>t.x&&M.x<t.x+t.w&&M.y>t.y&&M.y<t.y+t.h){t.s=Math.max(0,t.s-.035);if(t.s===0){blip(900,.08,'triangle',.07);buzz(8);this.fx.burst(t.x+t.w/2,t.y+t.h/2,8,['#ffffff',this.field[2]],3)}}},
  down(){this.move()},
  draw(t){const f=this.field,tt=this.teeth[0],gy=tt.y-26,gh=this.teeth[this.teeth.length-1].y+tt.h+26-gy;
    ctx.fillStyle=f[2];ctx.fillRect(0,gy,W,gh);
    for(const q of this.teeth){const oy=reduce?0:Math.sin(t/300+q.tw*9)*2*DEPTH;
      ctx.fillStyle='#ffffff';ctx.beginPath();ctx.rect(q.x,q.y+oy,q.w,q.h);ctx.fill();
      ctx.globalAlpha=q.s;ctx.fillStyle='#7a5a10';ctx.beginPath();ctx.rect(q.x,q.y+oy,q.w,q.h);ctx.fill();ctx.globalAlpha=1}
    this.p=1-this.teeth.reduce((a,q)=>a+q.s,0)/this.teeth.length;if(this.teeth.every(q=>q.s<=0))this.done=true;this.fx.draw(.05)},
  reveal(t,k){const f=this.field;   // too many teeth; each one a different size; and the gums are smiling
    ctx.fillStyle=f[1];this.teeth.forEach((q,i)=>{const h=q.h*(.2+.6*((i*7)%5)/4)*k;sharp(q.x+q.w/2,q.y+q.h+(i<6?-q.h*2-8:0),q.w*.5,h,i>=6)});
    eyeGlyph(W/2,this.teeth[0].y-70,26,Math.min(1,k*3),M.x,M.y,['#ffffff',f[2],'#000'])}
});

reg({id:'shush',tier:3,cue:'Shush',
  init(){this.eyes=[];const cw=W/3;for(let i=0;i<9;i++)this.eyes.push({x:cw*(i%3+.5),y:H*.22+((i/3)|0)*H*.2,r:Math.min(W*.085,30),open:1,target:1,t:0});this.since=0;this.p=0;this.n=0;this.done=false},
  down(){const e=this.eyes.filter(e=>e.target>.5&&Math.hypot(e.x-M.x,e.y-M.y)<e.r*2.6).sort((a,b)=>Math.hypot(a.x-M.x,a.y-M.y)-Math.hypot(b.x-M.x,b.y-M.y))[0];
    if(e){this.n++;e.target=0;e.t=performance.now()+(3800+rnd(0,1500))/DIFF;blip(220,.08,'square',.06);buzz(8)}},
  draw(t){const f=this.field,now=performance.now();let all=true;
    for(const e of this.eyes){e.open+=(e.target-e.open)*.25;if(e.target===0&&now>e.t)e.target=1;if(e.open>.12)all=false;
      eyeGlyph(e.x,e.y,e.r,e.open,M.x,M.y,['#ffffff',f[2],'#000'])}
    if(all){this.since=this.since||now;this.p=Math.min(1,(now-this.since)/1200);if(this.p>=1)this.done=true}else{this.since=0;this.p=this.eyes.filter(e=>e.open<.12).length/this.eyes.length*.6}},
  reveal(t,k){const f=this.field;   // every one opens at once, from underneath
    for(const e of this.eyes)eyeGlyph(e.x,e.y,e.r*(1+k*.8),Math.min(1,k*3),M.x,M.y,['#ffffff',f[2],'#000'])}
});

// ================= TIER 4: grotesque =================
reg({id:'vein',tier:4,cue:'Follow',
  init(){this.alive=false;this.my=0;this.p=0;this.done=false;this.shake=0},
  cx(y){return W/2+Math.sin(y/150)*W*.2+Math.sin(y/61+1)*W*.05},
  hw(t){return Math.max(34,W*.13*(1+.12*Math.sin(t/500))/Math.sqrt(DIFF))},
  down(){if(this.alive)return;const hw=this.hw(performance.now());if(M.y<170&&Math.abs(M.x-this.cx(M.y))<hw*1.8){this.alive=true;this.my=M.y}},
  move(t){if(!this.alive)return;const hw=this.hw(performance.now());
    if(Math.abs(M.x-this.cx(M.y))>hw){this.alive=false;this.my=0;this.p=0;this.shake=performance.now();buzz([40,30,60]);blip(100,.25,'sawtooth',.09);return}
    this.my=Math.max(this.my,M.y);this.p=this.my/(H-60);if(M.y>H-60)this.done=true},
  up(){this.alive=false;this.p=0},
  draw(t){const f=this.field,hw=this.hw(t);ctx.save();if(performance.now()-this.shake<260)ctx.translate(rnd(-6,6),0);
    ctx.fillStyle=f[2];for(let y=0;y<H;y+=4){const c=this.cx(y);ctx.fillRect(-20,y,c-hw+20,4.5);ctx.fillRect(c+hw,y,W-c-hw+20,4.5)}
    if(!this.alive){ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(this.cx(100),100,16+Math.sin(t/200)*3,0,6.28);ctx.fill()}ctx.restore()},
  reveal(t,k){const f=this.field;ctx.fillStyle=f[1];   // the walls pulse. it's a pulse.
    for(let i=0;i<6;i++){const y=((t/6+i*H/6)%H);ctx.beginPath();ctx.ellipse(this.cx(y),y,this.hw(t)*(1+k),12,0,0,6.28);ctx.fill()}}
});

reg({id:'feed',tier:4,cue:'Feed',
  init(){this.n=0;this.need=6;this.p=0;this.done=false;this.drag=null;this.fx=Parts();this.shake=0;this.mo=Array.from({length:8},()=>this.morsel())},
  morsel(){return {x:rnd(40,W-40),y:rnd(110,H*.3),r:18}},
  openAt(t){return .12+.88*(.5+.5*Math.sin(t/450))},
  down(){let b=null,bd=48;for(const m of this.mo){const d=Math.hypot(m.x-M.x,m.y-M.y);if(d<bd){bd=d;b=m}}this.drag=b},
  move(){if(this.drag){this.drag.x=M.x;this.drag.y=M.y}},
  up(){const m=this.drag;this.drag=null;if(!m)return;const t=performance.now(),cx=W/2,cy=H*.68,rx=W*.36,ry=H*.14*this.openAt(t);
    const inside=((m.x-cx)/rx)**2+((m.y-cy)/Math.max(ry,1))**2<1;
    if(inside&&this.openAt(t)>.45){this.mo.splice(this.mo.indexOf(m),1);this.mo.push(this.morsel());this.n++;this.p=this.n/this.need;blip(90,.25,'sawtooth',.1);buzz([20,20,40]);this.fx.burst(m.x,m.y,14,[this.field[2],this.field[3]],5);if(this.n>=this.need)this.done=true}
    else if(inside){this.shake=t;buzz([60,20,60]);blip(70,.2,'square',.1);Object.assign(m,this.morsel())}},
  mouth(t,open,scale=1,tongue=true){const f=this.field,cx=W/2,cy=H*.68,rx=W*.36*scale,ry=H*.14*open*scale;if(ry<2)return;
    ctx.fillStyle='#120000';ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.fill();
    if(tongue){ctx.fillStyle=f[3];ctx.beginPath();ctx.ellipse(cx,cy+ry*.45,rx*.5,ry*.38,0,0,6.28);ctx.fill()}
    ctx.fillStyle=f[1];for(let k=0;k<9;k++){const x=cx-rx*.82+k*(rx*1.64/8),e=Math.sqrt(Math.max(0,1-((x-cx)/rx)**2))*ry;sharp(x,cy-e,rx*.12,Math.min(ry*.6,26),false);sharp(x,cy+e,rx*.12,Math.min(ry*.6,26),true)}
    ctx.strokeStyle=f[2];ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,0,6.28);ctx.stroke()},
  draw(t){const f=this.field;ctx.save();if(performance.now()-this.shake<250)ctx.translate(rnd(-6,6),rnd(-4,4));
    this.mouth(t,this.openAt(t));ctx.restore();
    for(const m of this.mo){ctx.fillStyle=f[3];ctx.beginPath();ctx.arc(m.x,m.y,m.r,0,6.28);ctx.fill();ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(m.x,m.y,5,0,6.28);ctx.fill()}
    this.fx.draw()},
  reveal(t,k){this.mouth(t,.5+k*2.2,1+k*2.4)}   // it grows until you are inside it
});

reg({id:'pluck',tier:4,cue:'Pluck',
  init(){const n=Math.round(10*Math.min(1.3,DIFF));this.hs=[];for(let i=0;i<n;i++)this.hs.push({rx:(i+.5)*W/n,ry:70,L:H*rnd(.16,.26),out:0,ph:rnd(0,6.28)});
    this.hs.forEach(h=>{h.tx=h.rx;h.ty=h.ry+h.L});this.n=0;this.need=n;this.drag=null;this.done=false;this.p=0;this.fx=Parts();this.drops=[]},
  down(){let best=null,bd=48;for(const h of this.hs){if(h.out)continue;const d=Math.hypot(h.tx-M.x,h.ty-M.y);if(d<bd){bd=d;best=h}}this.drag=best;if(best)blip(200,.06,'square',.05)},
  up(){this.drag=null},
  draw(t){const f=this.field;
    for(const h of this.hs){
      if(h.out){if(this.drops.length<40&&Math.random()<.04)this.drops.push({x:h.rx,y:h.ry,v:0});ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(h.rx,h.ry,9,0,6.28);ctx.fill();continue}
      if(h===this.drag){h.tx+=(M.x-h.tx)*.6;h.ty+=(M.y-h.ty)*.6;
        if(Math.hypot(h.tx-h.rx,h.ty-h.ry)>h.L*1.7){h.out=1;this.n++;this.p=this.n/this.need;this.drag=null;blip(120,.2,'sawtooth',.1);buzz([30,20,50]);this.fx.burst(h.rx,h.ry,12,[f[2]],5);if(this.n>=this.need)this.done=true;continue}}
      else{h.tx+=(h.rx+Math.sin(t/600+h.ph)*8-h.tx)*.1;h.ty+=(h.ry+h.L-h.ty)*.12}
      const st=Math.hypot(h.tx-h.rx,h.ty-h.ry)/h.L;ctx.strokeStyle=f[1];ctx.lineCap='round';ctx.lineWidth=Math.max(2,7-st*3);
      ctx.beginPath();ctx.moveTo(h.rx,h.ry);ctx.quadraticCurveTo((h.rx+h.tx)/2+Math.sin(t/700+h.ph)*10*(2-Math.min(st,2)),(h.ry+h.ty)/2,h.tx,h.ty);ctx.stroke();
      ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(h.rx,h.ry,7,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(h.tx,h.ty,6,0,6.28);ctx.fill()}
    for(let i=this.drops.length-1;i>=0;i--){const d=this.drops[i];d.v+=.25;d.y+=d.v;if(d.y>H){this.drops.splice(i,1);continue}ctx.fillStyle=f[2];ctx.beginPath();ctx.ellipse(d.x,d.y,3,6,0,0,6.28);ctx.fill()}
    this.fx.draw(.12)},
  reveal(t,k){const f=this.field;ctx.fillStyle=f[2];for(const h of this.hs){const L=H*k*.9;ctx.fillRect(h.rx-3,h.ry,6,L);ctx.beginPath();ctx.arc(h.rx,h.ry+L,8,0,6.28);ctx.fill()}}   // the roots were bleeding all along
});

// ================= TIER 5: the sneeze =================
reg({id:'sneeze',tier:5,cue:'Sneeze',lo:.78,hi:.92,over:.97,
  init(){this.m=0;this.t0=0;this.shake=0;this.done=false;this.p=0;this.won=false;this.fx=Parts()},
  down(){if(this.won)return;this.t0=performance.now();blip(180,.2,'sine',.05)},
  up(){if(this.won||!this.t0)return;const m=this.m;this.t0=0;if(m>=this.lo&&m<=this.hi)this.win();else if(m>.05)this.fail()},
  fail(){this.t0=0;this.m=0;this.shake=performance.now();buzz([30,40,30]);blip(120,.25,'sawtooth',.06)},
  win(){const f=this.field;this.won=true;this.fx.burst(W/2,H/2,140,[f[2],f[3],f[1]],11);jingle();buzz([20,40,20,40,60]);
    cue.textContent='Achoo!';cue.classList.remove('show');void cue.offsetWidth;cue.classList.add('show');setTimeout(()=>{this.done=true},1100)},
  draw(t){const f=this.field,R=Math.min(W,H*.8)*.42,cx=W/2,cy=H/2;
    if(this.t0){this.m=Math.min(1,(performance.now()-this.t0)/1800);if(this.m>this.over)this.fail()}
    this.p=this.m*.9;let ox=0;if(this.shake&&performance.now()-this.shake<350)ox=Math.sin(t/20)*10;
    ctx.save();ctx.translate(ox,0);
    if(!this.won){ctx.strokeStyle=f[2];ctx.lineWidth=R*(this.hi-this.lo);ctx.beginPath();ctx.arc(cx,cy,R*(this.lo+this.hi)/2,0,6.28);ctx.stroke();
      const r=Math.max(6,R*this.m)+(this.t0&&!reduce?Math.sin(t/40)*this.m*4:0);ctx.fillStyle=f[1];ctx.beginPath();ctx.arc(cx,cy,r,0,6.28);ctx.fill();
      if(this.m>=this.lo&&this.m<=this.hi){ctx.fillStyle=f[2];ctx.beginPath();ctx.arc(cx,cy,R*.08,0,6.28);ctx.fill()}}
    ctx.restore();this.fx.draw(.18)}
});
