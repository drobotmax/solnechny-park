// Small, reference-led mesh set. All dimensions are approximate within OSM footprints.
(function(root){
'use strict';
const buildingIds=[3,5,6,7,49,50,81], rideIds=[0,1,2,36];
const C={cream:[.80,.75,.63],trim:[.92,.89,.80],roof:[.28,.20,.16],glass:[.18,.30,.33],red:[.68,.12,.10],steel:[.57,.60,.58],gold:[.73,.53,.20],dark:[.12,.15,.15]};
function center(p){return p.reduce((a,b)=>[a[0]+b[0]/p.length,a[1]+b[1]/p.length],[0,0]);}
function entries(park){
 return buildingIds.map(i=>{const b=park.buildings[i],c=center(b.pts);return {id:'b'+i,cx:c[0],cz:c[1],kind:'building',pts:b.pts,h:i===81?8:b.h,style:i===81?'colonnade':'cafe'};})
 .concat(rideIds.map(i=>{const r=park.rides[i],c=center(r.pts);return {id:'r'+i,cx:c[0],cz:c[1],kind:i===1?'coaster':i===36?'carousel':'bumper',pts:r.pts};}));
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
function build(e){
 const g=new Geometry();({building,bumper,carousel,coaster}[e.kind])(g,e);
 const data=new Float32Array(g.data);let radius=0;
 for(let i=0;i<data.length;i+=10)radius=Math.max(radius,Math.hypot(data[i]-e.cx,data[i+1]-5,data[i+2]-e.cz));
 return {data,n:data.length/10,center:[e.cx,5,e.cz],radius};
}
const api={entries,build,buildingIds,rideIds};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkMeshes=api;
})(typeof window!=='undefined'?window:globalThis);
