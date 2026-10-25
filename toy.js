'use strict';
// Achoo. Crack wax balls, pop bubble wrap, squish a friend. Every ball hides someone to collect. (The puzzle game lives in escape.html.)
const $=id=>document.getElementById(id);
let ctx;const cv=$('c'),burst=$('burst'),root=document.documentElement,themeMeta=document.querySelector('meta[name=theme-color]');
ctx=cv.getContext('2d');
let W,H,DPR=Math.min(devicePixelRatio||1,2);
const M={x:-9999,y:-9999,vx:0,vy:0,down:false,active:false};
const FONT="'Fredoka',system-ui,sans-serif";

// ---- collection ----
let meta={runs:0,col:{}};
try{Object.assign(meta,JSON.parse(localStorage.getItem('achoo.toy3')||'{}'))}catch(e){}
const saveMeta=()=>{try{localStorage.setItem('achoo.toy3',JSON.stringify(meta))}catch(e){}};
const have=i=>meta.col[i]>0,owned=()=>[...Array(TOTAL).keys()].filter(have);
const ownedPick=()=>{const o=owned(),i=o.length?pick(o):((Math.random()*SPN)|0)*3;return[(i/3)|0,i%3]};
const rollOne=()=>{const q=Math.random();return[(Math.random()*SPN)|0,q<.12?2:q<.45?1:0]};
const refreshCount=()=>{$('cn').textContent=owned().length+'/'+TOTAL};

// ---- rooms and navigation ----
const ROOMS={},reg=r=>(ROOMS[r.id]=r);
let room,busy=true;
const BG={home:['#ffe3f0','#e6dcff'],wrap:['#dff6ee','#d6ecff'],squish:['#fff2cf','#ffdcdc'],book:['#fff7ec','#ffe9f2']};
function enterRoom(r){
  room=r;const b=BG[r.id];root.style.setProperty('--bg1',b[0]);root.style.setProperty('--bg2',b[1]);themeMeta.content=b[0];
  document.body.className='r-'+r.id;document.querySelectorAll('#nav button').forEach(x=>x.classList.toggle('on',x.dataset.room===r.id));
  refreshCount();r.init();
}
function go(id,x,y){
  const next=ROOMS[id];if(busy||next===room)return;busy=true;
  if(reduce){enterRoom(next);busy=false;return}
  burst.style.setProperty('--next','linear-gradient(180deg,'+BG[id][0]+','+BG[id][1]+')');burst.style.setProperty('--bx',x+'px');burst.style.setProperty('--by',y+'px');
  burst.classList.add('go');setTimeout(()=>enterRoom(next),170);setTimeout(()=>{burst.classList.remove('go');busy=false},480);
}
// soft floating dots behind everything
const dots=Array.from({length:16},()=>({x:Math.random(),y:Math.random(),r:rnd(8,34),v:rnd(.00004,.00012),ph:rnd(0,6)}));
function backdrop(t){for(const d of dots){d.y-=reduce?0:d.v*16;if(d.y<-.1)d.y=1.1;const x=d.x*W+Math.sin(t/2200+d.ph)*10,y=d.y*H;
  const g=ctx.createRadialGradient(x,y,0,x,y,d.r);g.addColorStop(0,'rgba(255,255,255,.45)');g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,d.r,0,6.28);ctx.fill()}}
function hint(x,y,t,r=40){if(reduce)return;const k=(t%1300)/1300;ctx.globalAlpha=.55*(1-k);ctx.strokeStyle='#ffffff';ctx.lineWidth=4;ctx.beginPath();ctx.arc(x,y,6+r*k,0,6.28);ctx.stroke();ctx.globalAlpha=1}

// ================= wax ball =================
const WAX=['#ffa6c4','#8fd0ff','#a6e3a0','#ffd96a','#c3a8ff','#ffb48a','#7fe0d0'];
function glossBall(cx,cy,R,col,v,t,seed){
  ctx.save();ctx.translate(cx,cy+R*1.07);ctx.scale(1,.2);const sg=ctx.createRadialGradient(0,0,0,0,0,R*1.1);sg.addColorStop(0,'rgba(90,60,110,.3)');sg.addColorStop(1,'rgba(90,60,110,0)');ctx.fillStyle=sg;ctx.beginPath();ctx.arc(0,0,R*1.1,0,6.28);ctx.fill();ctx.restore();
  let g;
  if(v===2){g=ctx.createLinearGradient(cx-R,cy-R,cx+R,cy+R);const h=(t/40)%360;g.addColorStop(0,`hsl(${h} 90% 82%)`);g.addColorStop(.5,`hsl(${(h+60)%360} 90% 78%)`);g.addColorStop(1,`hsl(${(h+130)%360} 90% 80%)`)}
  else{g=ctx.createRadialGradient(cx-R*.38,cy-R*.42,R*.05,cx,cy,R*1.05);g.addColorStop(0,mix(col,'#ffffff',.78));g.addColorStop(.38,mix(col,'#ffffff',.12));g.addColorStop(1,mix(col,'#8a6aa8',.18))}
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy,R,0,6.28);ctx.fill();
  ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,6.28);ctx.clip();
  const rim=ctx.createRadialGradient(cx+R*.5,cy+R*.55,R*.1,cx+R*.5,cy+R*.55,R*.9);rim.addColorStop(0,'rgba(255,255,255,.3)');rim.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rim;ctx.fillRect(cx-R,cy-R,R*2,R*2);
  if(v>=1){for(let i=0;i<(v===2?26:14);i++){const a=seed*7+i*2.39,rr=R*(.2+((i*37)%70)/100),x=cx+Math.cos(a)*rr,y=cy+Math.sin(a)*rr*.9,tw=.5+.5*Math.sin(t/260+i*1.7);ctx.globalAlpha=.35+tw*.65;twinkle(x,y,R*(.03+.035*tw),v===2?'#fff':'#fff7c8')}ctx.globalAlpha=1}
  ctx.restore();
  ctx.fillStyle='rgba(255,255,255,.8)';ctx.beginPath();ctx.ellipse(cx-R*.42,cy-R*.46,R*.2,R*.1,-.7,0,6.28);ctx.fill();ctx.beginPath();ctx.arc(cx-R*.18,cy-R*.66,R*.045,0,6.28);ctx.fill();
}
reg({id:'home',
  init(){this.fx=Parts();this.sh=[];this.touched=false;this.nb()},
  nb(){const[k,v]=rollOne();this.k=k;this.v=v;this.col=pick(WAX);this.seed=Math.random();this.hits=0;this.max=16+((Math.random()*9)|0)+v*5;this.cr=[];this.sq=0;this.born=performance.now();this.state=0;this.t1=0;this.fresh=false;this.R=Math.min(W*.36,H*.2)},
  cy(){return H*.45},
  down(){const now=performance.now();
    if(this.state===1){if(now-this.t1>550)this.nb();return}
    this.touched=true;if(now-this.born<250)return;const cx=W/2,cy=this.cy();if(Math.hypot(M.x-cx,M.y-cy)>this.R*1.3)return;
    this.hits++;this.sq=1;crunch(this.hits);buzz(this.hits>=this.max?[30,20,40]:[10]);
    const R=this.R,a0=Math.atan2(M.y-cy,M.x-cx),px=Math.max(-R*.78,Math.min(R*.78,M.x-cx)),py=Math.max(-R*.78,Math.min(R*.78,M.y-cy));
    for(let b=0;b<3;b++){let x=px,y=py,a=a0+rnd(-1.7,1.7);const seg=[[x,y]];for(let s=0;s<4;s++){a+=rnd(-.7,.7);x+=Math.cos(a)*R*rnd(.1,.22);y+=Math.sin(a)*R*rnd(.1,.22);seg.push([x,y])}this.cr.push(seg)}
    for(let i=0;i<7;i++)this.fx.a.push({x:M.x,y:M.y,vx:rnd(-3.5,3.5),vy:rnd(-4.5,-1),l:.8,c:mix(this.col,'#ffffff',rnd(0,.5)),r:rnd(2,4.5),k:0});
    if(this.hits>=this.max)this.shatter()},
  shatter(){this.state=1;this.t1=performance.now();const cx=W/2,cy=this.cy(),R=this.R;smash();buzz([40,30,70]);
    for(let i=0;i<22;i++){const a=i/22*6.28+rnd(-.2,.2),d=R*rnd(.3,.8);this.sh.push({x:cx+Math.cos(a)*d,y:cy+Math.sin(a)*d,vx:Math.cos(a)*rnd(3,10),vy:Math.sin(a)*rnd(3,10)-4,r:rnd(7,22),rot:rnd(0,6),vr:rnd(-.3,.3),c:this.col})}
    this.fx.burst(cx,cy,34,['#fff',this.col,'#ffe27a'],8);
    const i=this.k*3+this.v;this.fresh=!have(i);meta.col[i]=(meta.col[i]||0)+1;meta.runs++;saveMeta();refreshCount();
    setTimeout(()=>{jingle();squeak(this.k)},160)},
  draw(t){const cx=W/2,cy=this.cy(),R=this.R,now=performance.now();this.sq*=.8;
    if(this.state){const k=clamp01((now-this.t1)/300),e=1-Math.pow(1-k,3),rr=R*.78*(.3+.7*e);
      ctx.save();ctx.translate(cx,cy);ctx.rotate(now/2600);for(let i=0;i<12;i+=2){ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,Math.max(W,H),i*.5236,(i+1)*.5236);ctx.closePath();ctx.fill()}ctx.restore();
      const hop=Math.abs(Math.sin((now-this.t1)/180))*26*Math.max(0,1-(now-this.t1)/1200);
      chara(this.k,this.v,cx,cy,rr,{mood:'open',arms:1,hop,t:now,lx:M.x,ly:M.y});
      const sy=cy+R*1.45;for(let i=0;i<3;i++)star(cx+(i-1)*34,sy,13,i<=this.v?'#ffd54f':'rgba(120,90,140,.18)',0);
      ctx.font='700 20px '+FONT;ctx.textAlign='center';ctx.textBaseline='middle';
      if(this.fresh){const pw=84,ph=34,px=cx-pw/2,py=cy-R*1.5;ctx.fillStyle='#ff6f9c';ctx.beginPath();ctx.roundRect(px,py,pw,ph,17);ctx.fill();ctx.fillStyle='#fff';ctx.fillText('NEW!',cx,py+ph/2+1)}
      else{ctx.fillStyle='rgba(106,74,98,.7)';ctx.fillText('x'+meta.col[this.k*3+this.v],cx,cy-R*1.4)}
      if(now-this.t1>700)hint(cx,H*.8,t,28)}
    else{const grow=clamp01((now-this.born)/320),e=1-Math.pow(1-grow,3)+Math.sin(grow*9)*(1-grow)*.04,s=(.4+.6*e)*(1+this.sq*.09);
      ctx.save();ctx.translate(cx,cy);ctx.scale(s*(1+this.sq*.05),s*(1-this.sq*.05));ctx.translate(-cx,-cy);
      glossBall(cx,cy,R,this.col,this.v,t,this.seed);
      ctx.save();ctx.beginPath();ctx.arc(cx,cy,R,0,6.28);ctx.clip();ctx.translate(cx,cy);ctx.lineCap='round';ctx.lineJoin='round';
      for(const sg of this.cr){ctx.beginPath();sg.forEach((p,i)=>i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=5;ctx.stroke();ctx.strokeStyle='rgba(110,70,120,.75)';ctx.lineWidth=1.8;ctx.stroke()}
      ctx.restore();ctx.restore();
      if(!this.touched)hint(cx,cy,t,R*.6)}
    for(let i=this.sh.length-1;i>=0;i--){const s=this.sh[i];s.x+=s.vx;s.y+=s.vy;s.vy+=.55;s.rot+=s.vr;if(s.y>H+40){this.sh.splice(i,1);continue}
      ctx.save();ctx.translate(s.x,s.y);ctx.rotate(s.rot);const g=ctx.createLinearGradient(-s.r,-s.r,s.r,s.r);g.addColorStop(0,mix(s.c,'#ffffff',.6));g.addColorStop(1,mix(s.c,'#6a3a7a',.2));ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-s.r,s.r*.6);ctx.lineTo(-s.r*.1,-s.r);ctx.lineTo(s.r,s.r*.5);ctx.closePath();ctx.fill();ctx.restore()}
    this.fx.draw(.16)}});

// ================= bubble wrap =================
reg({id:'wrap',
  init(){this.sheet();this.touched=false;this.last=0;this.fx=Parts()},
  sheet(){const r=Math.min(W/9,38),dx=r*2.12,dy=r*1.86;this.r=r;this.b=[];const top=84,bot=H-110,rows=Math.floor((bot-top)/dy),per=Math.floor((W-r)/dx),off=(W-per*dx)/2+r*.5;
    for(let j=0;j<rows;j++)for(let i=0;i<per-(j%2);i++){const[k,v]=Math.random()<.13?ownedPick():[-1,0];this.b.push({x:off+i*dx+(j%2?dx/2:0),y:top+r+j*dy,pop:0,k,v,c:Math.random()})}
    this.left=this.b.length;this.born=performance.now()},
  down(){this.touched=true;this.hit()},move(){if(M.down)this.hit()},
  hit(){const now=performance.now();for(const b of this.b){if(!b.pop&&Math.hypot(b.x-M.x,b.y-M.y)<this.r*.92){b.pop=now;this.left--;if(now-this.last>30){popS();buzz(5);this.last=now}if(b.k>=0)squeak(b.k);this.fx.burst(b.x,b.y,5,['#fff','#ffd6e6','#cfe9ff'],3);
      if(!this.left)setTimeout(()=>{jingle();this.sheet()},500)}}},
  draw(t){const r=this.r,now=performance.now();
    for(const b of this.b){const e=clamp01((now-this.born-b.y*.4)/260),sc=.4+.6*(1-Math.pow(1-e,3));
      if(b.pop){const k=clamp01((now-b.pop)/220);
        ctx.fillStyle='rgba(255,255,255,.4)';ctx.beginPath();ctx.arc(b.x,b.y,r*.62,0,6.28);ctx.fill();ctx.strokeStyle='rgba(120,90,150,.2)';ctx.lineWidth=2;ctx.beginPath();ctx.arc(b.x,b.y,r*.62,.3,2.8);ctx.stroke();
        if(b.k>=0)chara(b.k,b.v,b.x,b.y-Math.sin(k*3.14)*12,r*.85,{mood:'open',arms:1,t:now,noShadow:true})}
      else{ctx.save();ctx.translate(b.x,b.y);ctx.scale(sc,sc);
        if(b.k>=0){ctx.globalAlpha=.8;chara(b.k,b.v,0,2,r*.62,{mood:'sleep',noShadow:true,t:now});ctx.globalAlpha=1}
        const g=ctx.createRadialGradient(-r*.3,-r*.35,r*.05,0,0,r);g.addColorStop(0,'rgba(255,255,255,.85)');g.addColorStop(.45,b.c<.5?'rgba(190,225,255,.5)':'rgba(255,205,225,.5)');g.addColorStop(1,b.c<.5?'rgba(120,170,230,.55)':'rgba(240,140,175,.55)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,6.28);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='rgba(255,255,255,.9)';ctx.beginPath();ctx.ellipse(-r*.34,-r*.38,r*.22,r*.12,-.7,0,6.28);ctx.fill();ctx.restore()}}
    if(!this.touched)hint(W/2,H/2,t,70);this.fx.draw(.1)}});

// ================= squish =================
reg({id:'squish',
  init(){this.pick();this.R=Math.min(W,H)*.25;this.N=16;this.q=Array.from({length:this.N},(_,i)=>({a:i/this.N*6.2832,ox:0,oy:0,vx:0,vy:0}));this.g=-1;this.gox=0;this.goy=0;this.mx=0;this.n=0;this.touched=false;this.t=0;this.fx=Parts()},
  pick(){[this.k,this.v]=ownedPick()},
  down(){this.touched=true;const cx=W/2,cy=H*.46,d=Math.hypot(M.x-cx,M.y-cy);if(d<this.R*1.5){const a=Math.atan2(M.y-cy,M.x-cx);let bi=0,bd=9;this.q.forEach((q,i)=>{let da=Math.abs(((q.a-a+9.4248)%6.2832)-3.1416);da=3.1416-da;if(da<bd){bd=da;bi=i}});this.g=bi;this.mx=0;squeak(this.k)}},
  up(){if(this.g<0)return;this.g=-1;if(this.mx>.35){this.n++;this.t=performance.now();blip(200+this.mx*60,.28,'sine',.12,0,.55);buzz([8,26,16]);this.fx.burst(W/2,H*.46,10+Math.round(this.mx*10),['#ff9ec2','#fff','#ffd54f'],6);if(this.n%4===0)this.pick()}},
  draw(t){const cx=W/2,cy=H*.46,R=this.R,N=this.N;
    if(this.g>=0){this.gox=M.x-(cx+Math.cos(this.q[this.g].a)*R);this.goy=M.y-(cy+Math.sin(this.q[this.g].a)*R);this.mx=Math.max(this.mx,Math.hypot(this.gox,this.goy)/R)}
    this.q.forEach((q,i)=>{if(this.g>=0){let d=Math.abs(i-this.g);d=Math.min(d,N-d);const w=Math.exp(-d*d/5);q.ox+=(this.gox*w-q.ox)*.45;q.oy+=(this.goy*w-q.oy)*.45;q.vx=q.vy=0}
      else{q.vx+=-q.ox*.16;q.vy+=-q.oy*.16;const p=this.q[(i+N-1)%N],n=this.q[(i+1)%N];q.vx+=((p.ox+n.ox)/2-q.ox)*.1;q.vy+=((p.oy+n.oy)/2-q.oy)*.1;q.vx*=.84;q.vy*=.84;q.ox+=q.vx;q.oy+=q.vy}});
    const pts=this.q.map(q=>[Math.cos(q.a)*R+q.ox,Math.sin(q.a)*R+q.oy]);let ax=0,ay=0;this.q.forEach(q=>{ax+=q.ox;ay+=q.oy});ax/=N;ay/=N;
    const mood=this.g>=0?(this.mx>.5?'squint':'open'):performance.now()-this.t<500?'open':'happy';
    if(!this.touched)hint(cx+R*.9,cy,t,60);
    chara(this.k,this.v,cx,cy,R,{pts,mood,fx:ax*.6,fy:ay*.6,lx:M.x,ly:M.y,arms:this.g>=0?1:0,t});this.fx.draw(.1)}});

// ================= collection book =================
reg({id:'book',
  init(){this.sel=-1;this.t0=performance.now()},
  grid(){const cols=6,rows=7,top=84,bot=H-110,cw=(W-24)/cols,ch=(bot-top)/rows;return{cols,cw,ch,top,x0:12,r:Math.min(cw*.34,ch*.3)}},
  down(){if(this.sel>=0){this.sel=-1;return}const g=this.grid(),c=Math.floor((M.x-g.x0)/g.cw),r=Math.floor((M.y-g.top)/g.ch);if(c<0||c>=g.cols||r<0||r>=7)return;const i=r*g.cols+c;if(have(i)){this.sel=i;this.t0=performance.now();squeak(i);buzz(8)}},
  draw(t){const g=this.grid(),now=performance.now();
    for(let i=0;i<TOTAL;i++){const c=i%g.cols,r=(i/g.cols)|0,x=g.x0+g.cw*(c+.5),y=g.top+g.ch*(r+.5),own=have(i),k=(i/3)|0,v=i%3;
      ctx.fillStyle=own?'rgba(255,255,255,.62)':'rgba(255,255,255,.3)';ctx.beginPath();ctx.roundRect(x-g.cw*.46,y-g.ch*.46,g.cw*.92,g.ch*.92,14);ctx.fill();
      chara(k,v,x,y-g.ch*.04,g.r,{ghost:!own,mood:'happy',noShadow:true,t:now});
      if(own){for(let s=0;s<=v;s++)star(x+(s-v/2)*9,y+g.ch*.37,3.8,'#ffc83d');if(meta.col[i]>1){ctx.font='700 11px '+FONT;ctx.fillStyle='rgba(106,74,98,.7)';ctx.textAlign='right';ctx.fillText('x'+meta.col[i],x+g.cw*.42,y-g.ch*.32)}}
      else{ctx.font='700 15px '+FONT;ctx.fillStyle='rgba(106,74,98,.35)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('?',x,y+g.ch*.03)}}
    if(this.sel>=0){const i=this.sel,k=(i/3)|0,v=i%3,e=clamp01((now-this.t0)/260),s=.5+.5*(1-Math.pow(1-e,3)),R=Math.min(W,H)*.2*s;
      ctx.fillStyle='rgba(106,74,98,'+(.35*e)+')';ctx.fillRect(0,0,W,H);
      ctx.fillStyle='rgba(255,255,255,.92)';ctx.beginPath();ctx.roundRect(W/2-R*1.5,H*.42-R*1.7,R*3,R*3.7,28);ctx.fill();
      chara(k,v,W/2,H*.42,R,{mood:'open',arms:1,hop:Math.abs(Math.sin((now-this.t0)/220))*14*Math.max(0,1-(now-this.t0)/1400),t:now,lx:M.x,ly:M.y});
      for(let s=0;s<3;s++)star(W/2+(s-1)*32,H*.42+R*1.45,12,s<=v?'#ffc83d':'rgba(120,90,140,.2)');
      ctx.font='700 18px '+FONT;ctx.fillStyle='rgba(106,74,98,.75)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('x'+meta.col[i],W/2,H*.42-R*1.4)}}});

// ================= input / loop =================
function pt(e){M.vx=e.clientX-M.x;M.vy=e.clientY-M.y;M.x=e.clientX;M.y=e.clientY}
cv.addEventListener('pointermove',e=>{if(busy)return;if(!M.active&&e.pointerType==='touch')return;pt(e);M.active=true;room.move&&room.move(e)});
cv.addEventListener('pointerdown',e=>{if(busy)return;try{cv.setPointerCapture(e.pointerId)}catch(_){}
  if(AC&&AC.state==='suspended')AC.resume();pt(e);M.down=true;M.active=true;room.down&&room.down(e)});
const release=e=>{if(!M.down)return;M.down=false;if(e.pointerType==='touch')M.active=false;room.up&&room.up(e)};
cv.addEventListener('pointerup',release);cv.addEventListener('pointercancel',release);
document.addEventListener('gesturestart',e=>e.preventDefault());
document.addEventListener('contextmenu',e=>e.preventDefault());
document.querySelectorAll('#nav button').forEach(b=>b.addEventListener('click',()=>{const r=b.getBoundingClientRect();go(b.dataset.room,r.left+r.width/2,r.top+r.height/2)}));
function resize(initial){
  const nw=innerWidth,nh=innerHeight,big=!W||Math.abs(nw-W)>40||Math.abs(nh-H)>150;
  W=nw;H=nh;cv.width=W*DPR;cv.height=H*DPR;ctx.setTransform(DPR,0,0,DPR,0,0);
  if(big&&!initial&&room&&room.init)room.init();
}
addEventListener('resize',()=>resize());
function loop(t){ctx.clearRect(0,0,W,H);backdrop(t);room.draw(t);requestAnimationFrame(loop)}
// #room=squish jumps straight into one screen (handy for testing)
function boot(){
  resize(true);const id=new URLSearchParams(location.hash.slice(1)).get('room');
  enterRoom(id&&ROOMS[id]?ROOMS[id]:ROOMS.home);busy=false;requestAnimationFrame(loop);
  if('serviceWorker' in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('sw.js').catch(()=>{});
}
