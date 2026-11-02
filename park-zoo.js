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
const legSpec={giraffe:{x:.40,z:.85,y:1.7,r:.11},zebra:{x:.30,z:.63,y:.9,r:.10},lion:{x:.33,z:.67,y:.65,r:.12},elephant:{x:.62,z:1.0,y:1.15,r:.23},monkey:{x:.19,z:.28,y:.52,r:.07},flamingo:{x:.12,z:0,y:.90,r:.028}};
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
function animal(g,kind,part){
 const p=pens.find(p=>p.id===kind),c=p.color,legs=legSpec[kind],dark=[.12,.12,.11],ivory=[.87,.86,.73];
 if(part==='leg'){g.box(0,-legs.y,0,legs.r*2,legs.y,legs.r*2,c,7);if(kind!=='flamingo')g.box(0,-legs.y,-legs.r*.4,legs.r*2.3,.12,legs.r*3,dark,7);return;}
 const body=kind==='elephant'?[.86,1.0,1.6]:kind==='giraffe'?[.56,.66,1.3]:kind==='flamingo'?[.30,.30,.58]:kind==='monkey'?[.31,.40,.46]:[.48,.49,1.05];
 const y=legs.y+body[1]*.65;
 const coat=(i,j)=>kind==='zebra'?(Math.floor((Math.sin((i+.5)*Math.PI/5)*Math.cos(-Math.PI/2+(j+.5)*Math.PI/5)+1)*8)%2?dark:ivory):kind==='giraffe'?((i*3+j)%4===0?[.39,.25,.12]:c):c;
 oval(g,0,y,0,...body,coat);
 let headY=y+.45,headZ=-body[2];
 if(kind==='giraffe'){
  g.beam([0,y,-.7],[0,4.15,-1.1],.23,c,7,8);headY=4.25;headZ=-1.25;
  oval(g,0,headY,headZ,.27,.29,.55,c);
  for(const x of [-.15,.15]){g.beam([x,4.42,-1.10],[x,4.77,-1.1],.045,c,7,5);oval(g,x,4.78,-1.1,.075,.07,.07,dark);oval(g,x*2,4.45,-1.04,.19,.08,.12,c);}
  for(let i=0;i<6;i++)oval(g,.20,y+.4+i*.22,-.78-i*.045,.045,.07,.10,[.41,.26,.12]);
 }else if(kind==='flamingo'){
  const neck=[[0,y,-.4],[0,1.65,-.64],[0,2.0,-.49],[0,2.15,-.77]];
  for(let i=1;i<neck.length;i++)g.beam(neck[i-1],neck[i],.065,c,7,6);
  headY=2.15;headZ=-.82;oval(g,0,headY,headZ,.13,.13,.22,c);g.beam([0,2.12,-.95],[0,2.02,-1.14],.065,ivory,7,5);g.beam([0,2.02,-1.14],[0,1.96,-1.17],.06,dark,7,5);
 }else{
  if(kind==='lion')oval(g,0,headY-.04,headZ+.10,.63,.66,.44,[.37,.22,.11]);
  oval(g,0,headY,headZ,kind==='elephant'?.55:.34,kind==='elephant'?.6:.35,.48,c);
  if(kind==='zebra')g.box(0,y+.4,-.38,.10,.24,1.3,dark,7);
  for(const side of [-1,1])oval(g,side*(kind==='elephant'?.61:.27),headY+.16,headZ+.10,kind==='elephant'?.40:.14,kind==='elephant'?.67:.18,.10,c);
  if(kind==='elephant'){
   for(let i=0;i<5;i++)g.beam([0,headY-i*.32,headZ-.38-i*.10],[0,headY-(i+1)*.32,headZ-.48-i*.10],.16-i*.017,c,7,7);
   for(const side of [-1,1])g.beam([side*.29,headY-.24,headZ-.30],[side*.37,headY-.54,headZ-.95],.055,ivory,7,5);
  }else oval(g,0,headY-.10,headZ-.37,.23,.15,.26,kind==='monkey'?[.70,.52,.35]:c);
 }
 const eyeX=kind==='giraffe'?.24:kind==='elephant'?.42:kind==='flamingo'?.115:.28;
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
 });return {animals,time:0};
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
const api={pens,walks,start,legSpec,distance,inPen,solid,clearsTree,replacesFence,applyGround,entries,enclosure,animal,create,update};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkZoo=api;
})(typeof window!=='undefined'?window:globalThis);
