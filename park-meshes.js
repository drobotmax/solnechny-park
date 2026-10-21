// Small, reference-led mesh set. All dimensions are approximate within OSM footprints.
(function(root){
'use strict';
const buildingIds=[3,5,6,7,49,50,81], rideIds=[0,1,2,6,9,17,25,26,27,36];
// Placed and scaled to the stage rectangle marked in the user's plaza screenshot.
const plazaStageFootprint=[[41.93,-391.74],[36.53,-381.06],[42.08,-378.26],[47.48,-388.94]];
const C={cream:[.80,.75,.63],trim:[.92,.89,.80],roof:[.28,.20,.16],glass:[.18,.30,.33],red:[.68,.12,.10],steel:[.57,.60,.58],gold:[.73,.53,.20],dark:[.12,.15,.15]};
function center(p){return p.reduce((a,b)=>[a[0]+b[0]/p.length,a[1]+b[1]/p.length],[0,0]);}
function entries(park){
 const stageCenter=center(plazaStageFootprint);
 return buildingIds.map(i=>{const b=park.buildings[i],c=center(b.pts);return {id:'b'+i,cx:c[0],cz:c[1],kind:i===7?'bikeCafe':'building',pts:b.pts,h:i===81?8:b.h,style:i===81?'colonnade':'cafe'};})
 .concat(rideIds.map(i=>{const r=park.rides[i],c=center(r.pts);
  const kind=i===1?'coaster':i===36?'carousel':i===0||i===2?'bumper':i===17?'train':i===26?'swingTower':i===27?'pendulum':'spinner';
  return {id:'r'+i,cx:c[0],cz:c[1],kind,pts:r.pts};}))
 .concat([{id:'plaza-stage',cx:stageCenter[0],cz:stageCenter[1],kind:'plazaStage',pts:plazaStageFootprint}]);
}
function Geometry(){this.data=[];}
Geometry.prototype.tri=function(a,b,c,color,mat){
 const u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]);
 let n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],l=Math.hypot(...n);
 if(l<1e-8)return;n=n.map(x=>x/l);
 for(const p of [a,b,c])this.data.push(...p,...n,...color,mat||0);
};
Geometry.prototype.quad=function(a,b,c,d,col,mat){this.tri(a,b,c,col,mat);this.tri(a,c,d,col,mat);};
Geometry.prototype.box=function(x,y,z,w,h,d,col,mat){
 const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2];
 const up=p=>[p[0],p[1]+h,p[2]],p=[a,b,c,e];
 for(let i=0;i<4;i++)this.quad(p[(i+1)%4],p[i],up(p[i]),up(p[(i+1)%4]),col,mat);
 this.quad(up(a),up(e),up(c),up(b),col,mat);this.quad(a,b,c,e,col,mat);
};
Geometry.prototype.beam=function(a,b,r,col,mat,sides=6){
 const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d);if(len<1e-8)return;
 const t=d.map(v=>v/len),axis=Math.abs(t[1])<.9?[0,1,0]:[1,0,0];
 let u=[t[1]*axis[2]-t[2]*axis[1],t[2]*axis[0]-t[0]*axis[2],t[0]*axis[1]-t[1]*axis[0]],ul=Math.hypot(...u);u=u.map(v=>v/ul);
 const v=[t[1]*u[2]-t[2]*u[1],t[2]*u[0]-t[0]*u[2],t[0]*u[1]-t[1]*u[0]];
 const ring=(p,k)=>p.map((n,i)=>n+r*(u[i]*Math.cos(k*2*Math.PI/sides)+v[i]*Math.sin(k*2*Math.PI/sides)));
 for(let i=0;i<sides;i++)this.quad(ring(a,i),ring(a,i+1),ring(b,i+1),ring(b,i),col,mat);
};
function edgeFrame(p,i){const a=p[i],b=p[(i+1)%p.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);return {a,b,len,ux:(b[0]-a[0])/len,uz:(b[1]-a[1])/len};}
function building(g,e){
 const p=e.pts,h=e.h,c=[e.cx,e.cz];
 let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];
 const sign=area>0?1:-1;
 for(let i=0;i<p.length;i++){
  const f=edgeFrame(p,i),a=f.a,b=f.b;if(!f.len)continue;
  g.quad([a[0],0,a[1]],[b[0],0,b[1]],[b[0],h,b[1]],[a[0],h,a[1]],C.cream,1);
  const at=(s,y,out=.025)=>[a[0]+f.ux*s+f.uz*out*sign,y,a[1]+f.uz*s-f.ux*out*sign];
  g.beam(at(0,.32),at(f.len,.32),.20,C.dark,2,4);
  g.beam(at(0,h),at(f.len,h),.18,C.trim,0,4);
  const levels=e.style==='colonnade'?[1.3,5.0]:[1.1];
  for(const y of levels)for(let s=1.1;s<f.len-1;s+=2.6){
   const w=Math.min(1.5,f.len-s-.4),top=Math.min(y+1.9,h-.45);
   g.quad(at(s,y),at(s+w,y),at(s+w,top),at(s,top),C.glass,3);
   g.beam(at(s,y,.06),at(s,top,.06),.055,C.trim,0,4);g.beam(at(s+w,y,.06),at(s+w,top,.06),.055,C.trim,0,4);
   g.beam(at(s,y,.06),at(s+w,y,.06),.07,C.trim,0,4);g.beam(at(s,top,.06),at(s+w,top,.06),.07,C.trim,0,4);
   g.beam(at(s+w*.5,y,.07),at(s+w*.5,top,.07),.035,C.trim,0,4);
  }
  if(i===0 && f.len>3){
   const mid=f.len*.5,w=.85;
   g.quad(at(mid-w,.12,.09),at(mid+w,.12,.09),at(mid+w,2.6,.09),at(mid-w,2.6,.09),C.glass,3);
   for(const side of [-1,1])g.beam(at(mid+side*w,.1,.12),at(mid+side*w,2.6,.12),.08,C.trim,0,4);
   g.beam(at(mid-w,2.6,.12),at(mid+w,2.6,.12),.08,C.trim,0,4);
   g.beam(at(mid,.1,.12),at(mid,2.6,.12),.04,C.trim,0,4);
   g.beam(at(mid-.12,.9,.16),at(mid-.12,1.25,.16),.025,C.gold,2);
  }
  if(e.style==='colonnade'){
   for(let s=.5;s<f.len;s+=3)g.beam(at(s,0,.55),at(s,h,.55),.19,C.trim,0,8);
   g.beam(at(0,4.1,.22),at(f.len,4.1,.22),.25,C.trim,0,4);
   g.beam(at(0,h+.8),at(f.len,h+.8),.06,C.trim,0,4);
   for(let s=0;s<f.len;s+=.65)g.beam(at(s,h),at(s,h+.8),.045,C.trim,0,4);
  } else {
   // Deep fascia and a raised roof, rather than a flat point-cloud slab.
   g.tri([a[0],h,a[1]],[c[0],h+1.7,c[1]],[b[0],h,b[1]],C.roof,4);
  }
  if(e.style==='colonnade')g.tri([a[0],h,a[1]],[c[0],h,c[1]],[b[0],h,b[1]],C.roof,4);
 }
}
// Four mapped corners keep both structures aligned with their real footprints.
function footprintPoint(p,u,v,y){
 const front=[p[0][0]*(1-u)+p[1][0]*u,p[0][1]*(1-u)+p[1][1]*u];
 const back=[p[3][0]*(1-u)+p[2][0]*u,p[3][1]*(1-u)+p[2][1]*u];
 return [front[0]*(1-v)+back[0]*v,y,front[1]*(1-v)+back[1]*v];
}
function bikeCafe(g,e){
 const p=[e.pts[1],e.pts[2],e.pts[3],e.pts[0]],at=(u,v,y)=>footprintPoint(p,u,v,y),wall=[.42,.34,.26],wood=[.25,.20,.17],roof=[.16,.17,.17],slate=[.22,.23,.23];
 for(const [u0,v0,u1,v1] of [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]])
  g.quad(at(u0,v0,0),at(u1,v1,0),at(u1,v1,3.35),at(u0,v0,3.35),wall,1);
 // The long service frontage faces the bridge approach.
 for(const v of [0,1])g.tri(at(0,v,3.35),at(.5,v,6.1),at(1,v,3.35),wood,1);
 g.quad(at(-.055,-.045,3.35),at(.5,-.045,6.35),at(.5,1.045,6.35),at(-.055,1.045,3.35),roof,4);
 g.quad(at(.5,-.045,6.35),at(1.055,-.045,3.35),at(1.055,1.045,3.35),at(.5,1.045,6.35),slate,4);
 for(const v of [-.045,1.045])for(const u of [-.055,.5,1.055]){
  const y=u===.5?6.35:3.35;
  g.beam(at(u,v,y),at(u,v===-.045?1.045:-.045,y),.07,C.dark,2,4);
 }
 const front=(u,y)=>at(u,-.012,y);
 // Service windows, an open-looking doorway and a modest bicycle sign.
 for(const [u0,u1] of [[.08,.34],[.66,.94]]){
  g.quad(front(u0,1.05),front(u1,1.05),front(u1,2.72),front(u0,2.72),C.glass,3);
  for(const u of [u0,u1])g.beam(front(u,1.05),front(u,2.72),.055,C.trim,2,4);
  g.beam(front(u0,2.72),front(u1,2.72),.07,C.trim,2,4);
  g.beam(front((u0+u1)/2,1.05),front((u0+u1)/2,2.72),.035,C.trim,2,4);
 }
 g.quad(front(.405,.08),front(.595,.08),front(.595,2.95),front(.405,2.95),wood,1);
 g.beam(front(.405,2.95),front(.595,2.95),.09,C.trim,2,4);
 g.beam(front(.09,3.05),front(.36,3.05),.12,C.dark,2,4);
 for(const u of [.15,.28])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
  g.beam(front(u+Math.cos(a)*.047,2.58+Math.sin(a)*.20),front(u+Math.cos(b)*.047,2.58+Math.sin(b)*.20),.018,C.trim,2,4);
 }
 g.beam(front(.15,2.58),front(.215,2.77),.018,C.trim,2,4);
 g.beam(front(.215,2.77),front(.28,2.58),.018,C.trim,2,4);
}
function plazaStage(g,e){
 // The western edge turns slightly toward the bridge; the open arch faces it.
 const p=e.pts;
 const at=(u,v,y)=>footprintPoint(p,u,v,y),fascia=[.57,.60,.30],red=[.55,.12,.10];
 g.quad(at(0,0,1.05),at(1,0,1.05),at(1,1,1.05),at(0,1,1.05),C.dark,1);
 for(const [u0,v0,u1,v1] of [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]])
  g.quad(at(u0,v0,.08),at(u1,v1,.08),at(u1,v1,1.05),at(u0,v0,1.05),fascia,1);
 // Red backdrop and pale lower banner sit behind an open arched canopy.
 g.quad(at(.07,.85,1.08),at(.93,.85,1.08),at(.93,.85,5.25),at(.07,.85,5.25),red,1);
 g.quad(at(.07,.846,1.14),at(.93,.846,1.14),at(.93,.846,1.85),at(.07,.846,1.85),fascia,1);
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  g.beam(at(.28+Math.cos(a)*.07,.83,3.75+Math.sin(a)*.74),at(.28+Math.cos(a+.18)*.07,.83,3.75+Math.sin(a+.18)*.74),.035,C.gold,2,4);
 }
 for(const y of [4.15,3.72,3.28])g.beam(at(.43,.83,y),at(y===4.15?.79:.70,.83,y),.055,C.trim,2,4);
 const arch=(u,v)=>at(u,v,1.08+6.65*Math.pow(Math.max(0,Math.sin(Math.PI*u)),.78));
 for(const v of [-.06,.25,.55,.92]){
  for(let i=0;i<32;i++)g.beam(arch(i/32,v),arch((i+1)/32,v),.11,C.dark,2,6);
  for(const u of [0,1])g.beam(at(u,v,1.05),arch(u,v),.10,C.steel,2,6);
 }
 for(const u of [.08,.24,.5,.76,.92])g.beam(arch(u,-.06),arch(u,.92),.09,C.steel,2,6);
 for(const u of [.12,.88])for(let i=0;i<7;i++){
  const a=u+i*.018,b=a+.012;
  g.quad(arch(a,-.04),arch(b,-.04),arch(b,.91),arch(a,.91),i%2?C.steel:C.trim,4);
 }
 g.quad(at(.965,.32,1.05),at(.965,.91,1.05),at(.965,.91,4.7),at(.965,.32,4.7),C.steel,1);
}
function bumper(g,e){
 const p=e.pts,c=[e.cx,e.cz],h=4.2;
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length];
  g.tri([a[0],.16,a[1]],[b[0],.16,b[1]],[c[0],.16,c[1]],C.dark);
  g.beam([a[0],0,a[1]],[a[0],h,a[1]],.13,C.steel,2);
  g.beam([a[0],h,a[1]],[b[0],h,b[1]],.15,C.steel,2);
  g.tri([a[0],h,a[1]],[c[0],h+1.8,c[1]],[b[0],h,b[1]],i%2?C.red:C.trim,4);
  const f=edgeFrame(p,i);
  for(let s=0;s<f.len;s+=2.2){const x=a[0]+f.ux*s,z=a[1]+f.uz*s;g.beam([x,0,z],[x,1,z],.045,C.steel,2);}
  g.beam([a[0],1,a[1]],[b[0],1,b[1]],.05,C.steel,2);
 }
 // Cars are intentionally static, on the existing non-walkable ride footprint.
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=e.cx+Math.cos(a)*3,z=e.cz+Math.sin(a)*2;
  g.box(x,.25,z,1.4,.4,2.1,i%2?C.red:[.15,.37,.57],2);
  g.box(x,.66,z,.9,.35,1,C.dark,0);g.beam([x,.3,z],[x,3.9,z],.025,C.steel,2);
 }
}
function carousel(g,e){
 const r=Math.min(...e.pts.map(p=>Math.hypot(p[0]-e.cx,p[1]-e.cz)))*.9,x=e.cx,z=e.cz;
 g.beam([x,.1,z],[x,4.6,z],.25,C.gold,2,10);
 for(let i=0;i<32;i++){
  const a=i*Math.PI/16,b=(i+1)*Math.PI/16,at=(t,rr,y)=>[x+Math.cos(t)*rr,y,z+Math.sin(t)*rr];
  g.tri([x,.2,z],at(b,r,.2),at(a,r,.2),C.roof,4);
  g.quad(at(a,r,.1),at(b,r,.1),at(b,r,.35),at(a,r,.35),C.gold,2);
  g.tri(at(a,r,3.3),[x,4.6,z],at(b,r,3.3),i%4<2?C.trim:C.red,4);
  g.quad(at(a,r,3.05),at(b,r,3.05),at(b,r,3.3),at(a,r,3.3),C.gold,2);
  if(i%4===0){
   const q=at(a,r*.68,.4);g.beam(q,[q[0],3.3,q[2]],.045,C.gold,2);
   // Small stylized horses: body, neck, head and legs.
   g.box(q[0],1.0,q[2],.32,.35,.85,C.trim,0);
   g.beam([q[0],1.15,q[2]-.3],[q[0],1.65,q[2]-.42],.14,C.trim,0);
   g.box(q[0],1.5,q[2]-.55,.24,.2,.4,C.trim,0);
   for(const dx of [-.13,.13])for(const dz of [-.27,.27])g.beam([q[0]+dx,.58,q[2]+dz],[q[0]+dx,1.05,q[2]+dz],.055,C.trim,0);
  }
 }
}
function coaster(g,e){
 const xs=e.pts.map(p=>p[0]),zs=e.pts.map(p=>p[1]),rx=(Math.max(...xs)-Math.min(...xs))/2-2,rz=(Math.max(...zs)-Math.min(...zs))/2-2;
 const track=t=>{const a=t*Math.PI*2;return [e.cx+Math.cos(a)*rx,2.1+8*Math.pow((1+Math.sin(a))/2,2)+2*Math.sin(a*2)**2,e.cz+Math.sin(a)*rz];};
 const n=160;
 for(let i=0;i<n;i++){
  const a=track(i/n),b=track((i+1)/n),dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,nx=-dz/len,nz=dx/len;
  for(const side of [-1,1])g.beam([a[0]+nx*.45*side,a[1],a[2]+nz*.45*side],[b[0]+nx*.45*side,b[1],b[2]+nz*.45*side],.10,C.red,2);
  g.beam([a[0],a[1]-.35,a[2]],[b[0],b[1]-.35,b[2]],.13,C.red,2);
  if(i%2===0)g.beam([a[0]+nx*.5,a[1],a[2]+nz*.5],[a[0]-nx*.5,a[1],a[2]-nz*.5],.065,C.red,2,4);
  if(i%10===0){
   g.beam([a[0]+nx*1.5,.1,a[2]+nz*1.5],a,.11,C.steel,2);
   g.beam([a[0]-nx*1.5,.1,a[2]-nz*1.5],a,.11,C.steel,2);
   g.box(a[0],0,a[2],1,.25,1,C.cream,1);
  }
 }
 // Low station canopy; exact hidden track layout is not available in the reference.
 const q=track(.75);g.box(q[0],0,q[2],9,.35,4,C.cream,1);
 for(const dx of [-4,4])for(const dz of [-1.6,1.6])g.beam([q[0]+dx,.35,q[2]+dz],[q[0]+dx,3,q[2]+dz],.09,C.steel,2);
 g.box(q[0],3,q[2],9,.18,4,C.red,2);
}
function rideRadius(e){return Math.min(...e.pts.map(p=>Math.hypot(p[0]-e.cx,p[1]-e.cz)))*.67;}
function deckAndRail(g,e){
 const c=[e.cx,e.cz],p=e.pts;
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],f=edgeFrame(p,i);
  g.tri([a[0],.12,a[1]],[b[0],.12,b[1]],[c[0],.12,c[1]],C.dark,0);
  if(!f.len)continue;
  for(let s=0;s<=f.len;s+=2.5){const x=a[0]+f.ux*s,z=a[1]+f.uz*s;g.beam([x,.12,z],[x,1,z],.045,C.steel,2,4);}
  // Leave the middle of the first edge open for the entrance.
  if(i===0&&f.len>3){
   const m=f.len*.5,at=s=>[a[0]+f.ux*s,.93,a[1]+f.uz*s];
   g.beam(at(0),at(m-1.1),.045,C.steel,2,4);
   g.beam(at(m+1.1),at(f.len),.045,C.steel,2,4);
  }else g.beam([a[0],.93,a[1]],[b[0],.93,b[1]],.045,C.steel,2,4);
 }
}
function spinner(g,e){
 deckAndRail(g,e);
 const x=e.cx,z=e.cz,r=Math.max(2,rideRadius(e)*.72),arms=e.id==='r25'?6:8;
 g.box(x,.13,z,1.7,.35,1.7,C.cream,1);
 g.beam([x,.45,z],[x,1.3,z],.35,C.steel,2,10);
 for(let i=0;i<arms;i++){
  const a=i*Math.PI*2/arms,ux=Math.cos(a),uz=Math.sin(a),px=x+ux*r,pz=z+uz*r;
  g.beam([x,1.05,z],[px,.8,pz],.11,C.steel,2);
  g.box(px,.34,pz,1.2,.42,.86,i%2?C.cream:C.red,2);
  g.box(px,.77,pz,.85,.38,.16,C.dark,0);
  g.beam([px-uz*.35,.75,pz+ux*.35],[px+uz*.35,.75,pz-ux*.35],.04,C.trim,2,4);
 }
}
function train(g,e){
 const x=e.cx,z=e.cz,xs=e.pts.map(p=>p[0]),zs=e.pts.map(p=>p[1]);
 const rx=(Math.max(...xs)-Math.min(...xs))*.39,rz=(Math.max(...zs)-Math.min(...zs))*.39,n=64;
 const at=(t,side)=>{const a=t*Math.PI*2,r=side?1.06:.94;
  return [x+Math.cos(a)*rx*r,.55+.28*Math.sin(a*2),z+Math.sin(a)*rz*r];};
 for(let i=0;i<n;i++){
  for(const side of [0,1])g.beam(at(i/n,side),at((i+1)/n,side),.075,C.steel,2,4);
  if(i%2===0)g.beam(at(i/n,0),at(i/n,1),.055,C.cream,1,4);
  if(i%8===0){const q=at(i/n,0);g.beam([q[0],.1,q[2]],q,.065,C.steel,2,4);}
 }
 for(let i=0;i<4;i++){
  const q=at(.60+i*.028,0),a=(.60+i*.028)*Math.PI*2;
  g.box(q[0],.55,q[2],1.25,.54,.85,i%2?C.cream:C.red,2);
  g.beam([q[0],1.09,q[2]],[q[0],1.47,q[2]],.04,C.steel,2,4);
  g.box(q[0],1.47,q[2],1.35,.10,.93,C.roof,2);
 }
}
function swingTower(g,e){
 deckAndRail(g,e);
 const x=e.cx,z=e.cz,r=Math.max(2,rideRadius(e)*.78),h=10.5;
 g.beam([x,.12,z],[x,h,z],.27,C.steel,2,10);
 g.box(x,h-.4,z,1.5,.45,1.5,C.red,2);
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5,ux=Math.cos(a),uz=Math.sin(a),sx=x+ux*r,sz=z+uz*r;
  g.beam([x,h-.4,z],[sx,h-.8,sz],.075,C.trim,2);
  for(const offset of [-.18,.18])g.beam([sx-uz*offset,h-.8,sz+ux*offset],[sx-uz*offset*1.8,5.2,sz+ux*offset*1.8],.015,C.steel,2,4);
  g.box(sx,4.9,sz,.8,.32,.5,i%2?C.cream:C.red,2);
 }
}
function pendulum(g,e){
 deckAndRail(g,e);
 const x=e.cx,z=e.cz,r=Math.max(2,rideRadius(e)*.58),h=9.4;
 for(const side of [-1,1]){
  const px=x+side*r;
  g.beam([px,.12,z-r*.62],[px,h,z],.13,C.steel,2);
  g.beam([px,.12,z+r*.62],[px,h,z],.13,C.steel,2);
 }
 g.beam([x-r,h,z],[x+r,h,z],.19,C.red,2);
 g.beam([x,h,z],[x,3,z],.16,C.steel,2);
 g.box(x,2.7,z,r*1.25,.52,.9,C.red,2);
 for(let i=-2;i<=2;i++){
  const px=x+i*r*.22;
  g.box(px,3.18,z,.44,.32,.24,C.dark,0);
  g.beam([px,3.2,z-.4],[px,3.65,z-.4],.035,C.trim,2,4);
 }
}
function build(e){
 const g=new Geometry();({building,bikeCafe,plazaStage,bumper,carousel,coaster,spinner,train,swingTower,pendulum}[e.kind])(g,e);
 const data=new Float32Array(g.data);let radius=0;
 for(let i=0;i<data.length;i+=10)radius=Math.max(radius,Math.hypot(data[i]-e.cx,data[i+1]-5,data[i+2]-e.cz));
 return {data,n:data.length/10,center:[e.cx,5,e.cz],radius};
}
const api={entries,build,buildingIds,rideIds};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkMeshes=api;
})(typeof window!=='undefined'?window:globalThis);
