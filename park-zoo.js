// A fictional walkable zoo inside the mapped Safari Park, not a surveyed layout.
(function(root){
'use strict';
const pens=[
 {id:'giraffe',name:'ЖИРАФЫ',x:-120,z:-160,w:38,d:28,count:3,color:[.77,.58,.27]},
 {id:'zebra',name:'ЗЕБРЫ',x:-145,z:-110,w:34,d:30,count:4,color:[.82,.82,.73]},
 {id:'lion',name:'ЛЬВЫ',x:-48,z:-112,w:28,d:34,count:2,color:[.66,.44,.20]},
 {id:'elephant',name:'СЛОНЫ',x:-125,z:-35,w:38,d:34,count:2,color:[.47,.49,.47]},
 {id:'monkey',name:'ОБЕЗЬЯНЫ',x:-48,z:-30,w:26,d:30,count:5,color:[.36,.23,.13]},
 {id:'flamingo',name:'ФЛАМИНГО',x:-1,z:-181,w:28,d:18,count:9,color:[.92,.49,.53],water:true}
];
const walks=[[[32,-193],[28,-199],[23,-210],[-24,-210],[-33,-186],[-30,-161],[-64,-136],[-88,-111],[-95,-75],[-95,-10]],
 [[-30,-161],[-53,-179],[-96,-181],[-146,-181]],
 [[-96,-181],[-98,-152],[-98,-142],[-113,-133],[-115,-110],[-95,-75]],
 [[-88,-111],[-69,-111]], [[-95,-35],[-69,-35]], [[-95,-60],[-70,-60],[-25,-65]],
 [[-113,-133],[-145,-133]], [[-95,-60],[-125,-60]],
 [[-69,-111],[-69,-136],[-48,-136]], [[-69,-35],[-69,-53],[-48,-53]]];
const start={x:-96,z:-181,heading:-2.2};
const legSpec={giraffe:{x:.30,z:.70,y:2.1,r:.11},zebra:{x:.30,z:.63,y:1.2,r:.10},lion:{x:.33,z:.67,y:.65,r:.12},elephant:{x:.62,z:1.0,y:1.7,r:.23},monkey:{x:.19,z:.28,y:.52,r:.07},flamingo:{x:.12,z:0,y:.90,r:.028}};
function distance(path,x,z){let best=Infinity;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b[0]-a[0],dz=b[1]-a[1],u=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));best=Math.min(best,Math.hypot(x-a[0]-u*dx,z-a[1]-u*dz));}return best;}
function inPen(p,x,z,margin=0){return Math.abs(x-p.x)<p.w/2+margin&&Math.abs(z-p.z)<p.d/2+margin;}
function solid(x,z,r=0){return pens.some(p=>!p.water&&inPen(p,x,z,r));}
function clearsTree(x,z){return pens.some(p=>!p.water&&inPen(p,x,z,4.5))||walks.some(p=>distance(p,x,z)<3.6);}
function replacesFence(x,z){return walks.some(p=>distance(p,x,z)<2.6)&&x<34&&z> -216&&z< -8;}
function applyGround(cats,park){
 for(let iz=Math.max(0,Math.floor((-214-park.z0)/park.mpp));iz<Math.min(park.h,Math.ceil((-7-park.z0)/park.mpp));iz++)
 for(let ix=Math.max(0,Math.floor((-167-park.x0)/park.mpp));ix<Math.min(park.w,Math.ceil((37-park.x0)/park.mpp));ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,i=iz*park.w+ix,c=cats[i]&31;
  if(c===4||c===5)continue;
  const pen=pens.find(p=>!p.water&&inPen(p,x,z));
  if(pen)cats[i]=64|32|6;
  else if(walks.some(p=>distance(p,x,z)<2.2))cats[i]=64|2;
 }
}
function entries(){return pens.map(p=>({id:'zoo:'+p.id,kind:'zooEnclosure',cx:p.x,cz:p.z,pen:p}));}
function oval(g,x,y,z,rx,ry,rz,col,material=7){
 const at=(i,j)=>{const a=i*Math.PI/5,b=-Math.PI/2+j*Math.PI/5;return [x+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,z+Math.sin(a)*Math.cos(b)*rz];};
 for(let j=0;j<5;j++)for(let i=0;i<10;i++)g.quad(at(i,j),at(i+1,j),at(i+1,j+1),at(i,j+1),typeof col==='function'?col(i,j):col,material);
}
function enclosure(g,e,label){const p=e.pen,wood=[.37,.27,.17],steel=[.26,.31,.25],rock=[.53,.51,.43];
 const xmin=p.x-p.w/2,xmax=p.x+p.w/2,zmin=p.z-p.d/2,zmax=p.z+p.d/2;
 // The waterbird pond keeps its existing bank and surface.
 if(!p.water){
  for(const [a,b] of [[[xmin,zmin],[xmax,zmin]],[[xmax,zmin],[xmax,zmax]],[[xmax,zmax],[xmin,zmax]],[[xmin,zmax],[xmin,zmin]]]){
   const len=Math.hypot(b[0]-a[0],b[1]-a[1]);
   for(let s=0;s<=len;s+=2.5){const u=s/len,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;g.box(x,0,z,.14,1.5,.14,wood,4);}
   for(const y of [.45,1.05,1.45])g.beam([a[0],y,a[1]],[b[0],y,b[1]],.035,steel,2,5);
   // Thin upright bars make an actual enclosure while leaving animals visible.
   for(let s=.4;s<len;s+=.65){const u=s/len,x=a[0]+(b[0]-a[0])*u,z=a[1]+(b[1]-a[1])*u;g.beam([x,.08,z],[x,1.45,z],.012,steel,2,4);}
  }
  const roof=p.id==='giraffe'?4.8:3.1,at=[p.x- p.w*.25,p.z+p.d*.27];
  for(const dx of [-2.5,2.5])for(const dz of [-2,2])g.box(at[0]+dx,.01,at[1]+dz,.20,roof,.20,wood,4);
  g.box(at[0],roof,at[1],6,.18,5,[.33,.27,.19],4);
  for(let i=0;i<4;i++)oval(g,p.x+Math.cos(i*2)*p.w*.25,.3,p.z+Math.sin(i*2)*p.d*.23,1.1,.6,.8,rock,1);
  if(p.id==='monkey')for(let i=0;i<3;i++){
   const x=p.x-5+i*5;g.beam([x,.1,p.z],[x,3.5,p.z],.18,wood,4,6);if(i)g.beam([x-5,3,p.z],[x,2.5,p.z],.045,wood,4,5);
  }
 }
 const sx=p.x,sz=p.water?-211.5:p.z-p.d/2-1.2;
 for(const x of [sx-1.6,sx+1.6])g.box(x,.02,sz,.10,1.85,.10,wood,4);
 g.box(sx,1.3,sz,3.7,.72,.14,[.18,.32,.23],4);
 if(label){const t={beam:(a,b,r,c,m,n)=>g.beam([sx-a[0],a[1],sz-.085-a[2]],[sx-b[0],b[1],sz-.085-b[2]],r,c,m,n)};label(t,p.name,1.53,0,3.2,.31,[.95,.89,.70]);}
}
// Rings follow the long axis: stripes wrap the whole animal instead of
// alternating unrelated faces on a coarse sphere.
function coatVolume(g,kind,a,b,rx,ry,seed=0){
 const dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dy,dz),ivory=[.87,.86,.78],ink=[.10,.105,.10],rings=36,sides=16;
 function point(i,j){const t=i/rings,q=j/sides*Math.PI*2,r=Math.sqrt(Math.max(0,1-Math.pow(2*t-1,2))),v=Math.sin(q)*ry*r;
  return [a[0]+Math.cos(q)*rx*r,a[1]+dy*t+v*dz/len,a[2]+dz*t-v*dy/len];}
 for(let i=0;i<rings;i++)for(let j=0;j<sides;j++){
  const bend=Math.sin(j/sides*Math.PI*4+seed)*.6;
  const patch=(i+Math.floor(Math.sin(j*.9+seed)*1.2)+rings)%5>0&&j%4!==0;
  const col=kind==='giraffe'?(patch?[.40,.25,.105]:[.80,.64,.34]):Math.floor((i+bend)/1.7)%2?ink:ivory;
  g.quad(point(i,j),point(i,j+1),point(i+1,j+1),point(i+1,j),col,7);
 }
}
function zebra(g){
 const ivory=[.87,.86,.78],ink=[.10,.105,.10];
 coatVolume(g,'zebra',[0,1.25,-1.0],[0,1.25,1.03],.43,.49);
 coatVolume(g,'zebra',[0,1.28,-.64],[0,2.19,-1.12],.23,.31,1);
 coatVolume(g,'zebra',[0,2.10,-1.05],[0,1.86,-1.78],.22,.24,2);
 oval(g,0,1.88,-1.70,.205,.16,.24,[.25,.26,.24]);
 // Tall ears, dark tips and a short upright mane along the back of the neck.
 for(const side of [-1,1]){
  oval(g,side*.16,2.31,-1.10,.085,.20,.095,ivory);
  oval(g,side*.16,2.36,-1.17,.045,.11,.025,ink);
  oval(g,side*.205,2.12,-1.28,.042,.044,.045,ink);
  oval(g,side*.13,1.96,-1.87,.032,.025,.018,ink);
 }
 for(let i=0;i<9;i++){const t=i/8;g.box(0,1.49+t*.65,-.38-t*.55,.10,.20,.11,ink,7);}
 g.beam([0,1.40,.94],[.08,.76,1.35],.035,ivory,7,6);
 oval(g,.08,.68,1.36,.085,.22,.085,ink);
}
function giraffe(g){
 const tan=[.80,.64,.34],brown=[.40,.25,.105],dark=[.14,.12,.09];
 // The shoulders stand higher than the rump; the long neck leans forward.
 coatVolume(g,'giraffe',[0,2.35,-1.09],[0,2.08,1.12],.48,.62);
 coatVolume(g,'giraffe',[0,2.27,-.73],[0,4.52,-1.58],.24,.28,1);
 coatVolume(g,'giraffe',[0,4.48,-1.37],[0,4.35,-2.03],.20,.23,2);
 oval(g,0,4.31,-1.99,.19,.16,.24,tan);
 for(const side of [-1,1]){
  g.beam([side*.12,4.57,-1.49],[side*.14,4.91,-1.47],.048,tan,7,7);
  oval(g,side*.14,4.91,-1.47,.068,.073,.068,brown);
  oval(g,side*.32,4.58,-1.40,.24,.085,.13,tan);
  oval(g,side*.34,4.60,-1.46,.14,.032,.06,brown);
  oval(g,side*.19,4.51,-1.66,.045,.048,.045,dark);
  oval(g,side*.12,4.37,-2.17,.024,.027,.024,dark);
 }
 for(let i=0;i<15;i++){const t=i/14;g.beam([0,2.55+t*1.95,-.45-t*.87],[0,2.56+t*1.95,-.34-t*.87],.055,brown,7,5);}
 g.beam([0,2.25,1.05],[.10,1.35,1.35],.035,tan,7,6);
 oval(g,.10,1.18,1.35,.085,.25,.09,dark);
}
function elephant(g){
 const skin=[.47,.49,.47],shade=[.40,.42,.40],light=[.53,.54,.51],ivory=[.87,.86,.73];
 oval(g,0,1.95,.10,1.0,1.12,1.67,skin);
 oval(g,0,2.50,-1.26,.66,.79,.66,skin);
 // Broad, asymmetric ear fans sit behind the head.
 for(const side of [-1,1]){
  const rim=[[.42,2.94,-1.40],[.84,3.24,-1.16],[1.34,2.95,-1.03],[1.40,2.31,-1.04],[1.04,1.65,-1.27],[.50,1.94,-1.49]];
  const center=[side*.84,2.47,-1.55];
  for(let i=0;i<rim.length;i++){const a=rim[i],b=rim[(i+1)%rim.length];
   g.quad(center,[side*a[0],a[1],a[2]],[side*b[0],b[1],b[2]],center,i%2?skin:shade,7);}
  oval(g,side*.40,2.68,-1.79,.045,.043,.035,[.10,.11,.10]);
  const tusk=[[side*.37,2.13,-1.72],[side*.44,1.94,-2.03],[side*.46,1.92,-2.30],[side*.43,2.01,-2.46]];
  for(let i=1;i<tusk.length;i++)g.beam(tusk[i-1],tusk[i],.09*(1-(i-1)/3),ivory,7,8);
 }
 // A tapered curved trunk; short overlapping sections hide hard joints.
 const trunk=[[0,2.50,-1.79],[0,2.19,-1.96],[0,1.84,-2.04],[0,1.48,-2.10],[0,1.12,-2.18],[0,.82,-2.34],[0,.74,-2.58],[0,.88,-2.72]];
 for(let i=1;i<trunk.length;i++){
  const r=.24-(i-1)*.025;g.beam(trunk[i-1],trunk[i],r,skin,7,10);
  oval(g,...trunk[i],r,r,r,i%2?skin:light);
 }
 g.beam([0,2.11,1.64],[.11,1.14,1.94],.045,skin,7,6);
 oval(g,.11,1.04,1.94,.08,.17,.07,shade);
}
function animal(g,kind,part){
 const p=pens.find(p=>p.id===kind),c=p.color,legs=legSpec[kind],dark=[.12,.12,.11],ivory=[.87,.86,.73];
 if(part==='leg'){
  if(kind==='giraffe'){
   g.beam([0,-.05,0],[0,-legs.y+.10,0],.095,c,7,8);
   oval(g,0,-legs.y*.48,0,.115,.13,.115,c);
   for(let i=1;i<6;i++)g.box((i%2?1:-1)*.085,-i*legs.y/7,0,.025,.12,.10,[.40,.25,.105],7);
   g.box(0,-legs.y,-.035,.19,.13,.25,dark,7);
  }else if(kind==='zebra'){
   for(let i=0;i<9;i++)g.box(0,-legs.y+i*legs.y/9,0,.15,legs.y/9,.17,i%2?dark:ivory,7);
   g.box(0,-legs.y,-.03,.19,.13,.26,dark,7);
  }else if(kind==='elephant'){
   g.beam([0,-.12,0],[0,-legs.y+.17,0],.27,c,7,10);
   oval(g,0,-legs.y+.16,-.04,.30,.20,.36,c);
   for(const x of [-.17,0,.17])oval(g,x,-legs.y+.10,-.33,.065,.07,.045,ivory);
  }else{g.box(0,-legs.y,0,legs.r*2,legs.y,legs.r*2,c,7);if(kind!=='flamingo')g.box(0,-legs.y,-legs.r*.4,legs.r*2.3,.12,legs.r*3,dark,7);}
  return;
 }
 if(kind==='zebra'){zebra(g);return;}
 if(kind==='elephant'){elephant(g);return;}
 if(kind==='giraffe'){giraffe(g);return;}
 const body=kind==='flamingo'?[.30,.30,.58]:kind==='monkey'?[.31,.40,.46]:[.48,.49,1.05];
 const y=legs.y+body[1]*.65;
 oval(g,0,y,0,...body,c);
 let headY=y+.45,headZ=-body[2];
 if(kind==='flamingo'){
  const neck=[[0,y,-.4],[0,1.65,-.64],[0,2.0,-.49],[0,2.15,-.77]];
  for(let i=1;i<neck.length;i++)g.beam(neck[i-1],neck[i],.065,c,7,6);
  headY=2.15;headZ=-.82;oval(g,0,headY,headZ,.13,.13,.22,c);g.beam([0,2.12,-.95],[0,2.02,-1.14],.065,ivory,7,5);g.beam([0,2.02,-1.14],[0,1.96,-1.17],.06,dark,7,5);
 }else{
  if(kind==='lion')oval(g,0,headY-.04,headZ+.10,.63,.66,.44,[.37,.22,.11]);
  oval(g,0,headY,headZ,.34,.35,.48,c);
  for(const side of [-1,1])oval(g,side*.27,headY+.16,headZ+.10,.14,.18,.10,c);
  oval(g,0,headY-.10,headZ-.37,.23,.15,.26,kind==='monkey'?[.70,.52,.35]:c);
 }
 const eyeX=kind==='flamingo'?.115:.28;
 for(const side of [-1,1])oval(g,side*eyeX,headY+.08,headZ-.24,.045,.05,.04,dark);
 if(kind!=='flamingo'){
  const tailLength=kind==='monkey'?1.4:.7;
  g.beam([0,y,body[2]*.85],[.18,y+.25,body[2]+tailLength],.045,c,7,5);
  oval(g,.18,y+.25,body[2]+tailLength,.09,.10,.10,dark);
 }
}
function create(sample){
 const animals=[];
 pens.forEach((p,index)=>{
  for(let i=0;i<p.count;i++){
   const x=p.x+((i%3)-1)*p.w*.18,z=p.z+(Math.floor(i/3)-.5)*p.d*.18;
   if(p.water&&sample&&(sample(x,z)&31)!==4)continue;
   animals.push({species:p.id,pen:index,x,z,heading:i*1.8,phase:i,wait:i*.4,target:null,v:0,serial:animals.length});
  }
 });return {animals,time:0,voiceWait:pens.map((p,i)=>1+i*.4)};
}
// Stylized, synthesized voices, matching the rest of the park's audio.
const voices={
 giraffe:{duration:1.8,hz:72,end:62,rough:.08,rate:3,range:34,volume:.14,gap:24},
 zebra:{duration:1.5,hz:320,end:130,rough:.20,rate:5,range:42,volume:.16,gap:13},
 lion:{duration:2.4,hz:95,end:48,rough:.48,rate:7,range:60,volume:.22,gap:19},
 elephant:{duration:1.7,hz:440,end:270,rough:.22,rate:18,range:60,volume:.18,gap:18},
 monkey:{duration:1.1,hz:630,end:410,rough:.08,rate:4,range:42,volume:.13,gap:9},
 flamingo:{duration:.9,hz:210,end:170,rough:.18,rate:3,range:36,volume:.13,gap:12}
};
function voice(kind,sampleRate=24000){
 const p=voices[kind],samples=new Float32Array(Math.ceil(p.duration*sampleRate));let phase=0,noise=0,seed=271,peak=0;
 for(let i=0;i<samples.length;i++){
  const t=i/sampleRate,u=t/p.duration;
  let hz=p.hz+(p.end-p.hz)*u,pulse=1;
  if(kind==='zebra'){hz=u<.45?320+240*Math.sin(u/.45*Math.PI):140+55*Math.sin(t*28);pulse=.45+.55*Math.pow(Math.sin(t*16),2);}
  if(kind==='elephant')hz+=170*Math.sin(Math.PI*u)+18*Math.sin(t*70);
  if(kind==='monkey'){const beat=t*p.rate%1;pulse=Math.pow(Math.sin(Math.PI*beat),2);hz+=280*Math.sin(Math.PI*beat);}
  if(kind==='flamingo')pulse=.2+.8*Math.pow(Math.max(0,Math.sin(t*p.rate*Math.PI*2)),.6);
  phase+=Math.PI*2*hz/sampleRate;
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  noise=noise*.78+(seed/4294967296*2-1)*.22;
  const harmonic=Math.sin(phase)+.45*Math.sin(phase*2)+.22*Math.sin(phase*3)+(kind==='elephant'?.20*Math.sin(phase*5):0);
  const envelope=Math.min(1,t/.09)*Math.min(1,(p.duration-t)/.22)*Math.pow(Math.sin(Math.PI*u),.35)*pulse;
  const value=(harmonic*(1-p.rough)+noise*p.rough*3)*(1-.15*Math.sin(t*p.rate*Math.PI*2))*envelope;
  samples[i]=value;peak=Math.max(peak,Math.abs(value));
 }
 for(let i=0;i<samples.length;i++)samples[i]=Math.round(samples[i]/peak*.85*127)/127;
 return samples;
}
function soundTick(pop,dt,listener,call,random=Math.random){
 pens.forEach((p,i)=>{
  const candidates=pop.animals.filter(d=>d.pen===i&&Math.hypot(d.x-listener.x,d.z-listener.z)<voices[p.id].range);
  if(!candidates.length){pop.voiceWait[i]=Math.min(pop.voiceWait[i],1+i*.4);return;}
  pop.voiceWait[i]-=dt;
  if(pop.voiceWait[i]>0)return;
  call(candidates[Math.floor(random()*candidates.length)]);
  pop.voiceWait[i]=voices[p.id].gap*(.8+random()*.4);
 });
}
function update(pop,dt){
 pop.time+=dt;
 pop.animals.forEach(d=>{
  const p=pens[d.pen];d.phase+=dt*(d.v?5:1);d.wait-=dt;d.v=0;
  if(d.wait>0)return;
  if(!d.target){const a=d.serial*2.4+pop.time*.23;d.target={x:p.x+Math.cos(a)*(p.w/2-4),z:p.z+Math.sin(a)*(p.d/2-4)};}
  const dx=d.target.x-d.x,dz=d.target.z-d.z,dist=Math.hypot(dx,dz),speed=d.species==='elephant'?.5:d.species==='flamingo'?.25:.75;
  if(dist<.15){d.target=null;d.wait=2+(d.serial%4);return;}
  const step=Math.min(dist,speed*dt);d.x+=dx/dist*step;d.z+=dz/dist*step;d.heading=Math.atan2(dx,-dz);d.v=speed;
 });
}
const api={pens,walks,start,legSpec,distance,inPen,solid,clearsTree,replacesFence,applyGround,entries,enclosure,animal,create,update,voices,voice,soundTick};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkZoo=api;
})(typeof window!=='undefined'?window:globalThis);
