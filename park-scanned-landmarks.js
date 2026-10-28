// Lightweight solid landmarks adapted from the user's October 27 scans.
(function(root){
'use strict';
const Shape=typeof module!=='undefined'&&module.exports?require('./park-yesenin-shape.js'):root.ParkYeseninShape;
const barriers={start:[43.6,-396.2],step:[-5.1,1.05],count:11,height:1.06,radius:.022,footRadius:.44};
// The user's panorama/map places the relief south of the east cross path, facing NNW.
const yesenin={at:[98,-234],yaw:2.75,height:3.2,pedestal:[.67,1.94,.52],plaque:[1.5,-.05],
 site:[[-3.2,-1.8],[3.2,-1.8],[3.2,5.2],[1.6,7.8],[-2.1,8.7],[-3.6,5.6]],
 approach:[[-1.7,7.2],[1.8,7.2],[1.2,11.7],[-1.7,11.7]]};
function world(u,v){const c=Math.cos(yesenin.yaw),s=Math.sin(yesenin.yaw);return [yesenin.at[0]+c*u-s*v,yesenin.at[1]+s*u+c*v];}
function local(x,z){const c=Math.cos(yesenin.yaw),s=Math.sin(yesenin.yaw),dx=x-yesenin.at[0],dz=z-yesenin.at[1];return [c*dx+s*dz,-s*dx+c*dz];}
function inside(p,x,z){let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;}
function inSite(x,z){const p=local(x,z);return inside(yesenin.site,...p)||inside(yesenin.approach,...p);}
function sites(){return Array.from({length:barriers.count},(_,i)=>barriers.start.map((v,k)=>v+barriers.step[k]*i));}
function entries(){
 const row=sites(),c=row[Math.floor(row.length/2)],out=[{id:'plaza-barriers',kind:'plazaBarriers',cx:c[0],cz:c[1],pts:row}];
 out.push({id:'yesenin',kind:'yesenin',cx:yesenin.at[0],cz:yesenin.at[1],yaw:yesenin.yaw},
  {id:'yesenin-site',kind:'yeseninSite',cx:yesenin.at[0],cz:yesenin.at[1],yaw:yesenin.yaw,pts:yesenin.site.map(p=>world(...p))});
 return out;
}
function frame(g,e){
 const c=Math.cos(e.yaw||0),s=Math.sin(e.yaw||0),at=(x,y,z)=>[e.cx+c*x-s*z,y,e.cz+s*x+c*z];
 return {at,beam:(a,b,r,col,mat=2,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n),
  tri:(a,b,c,col,mat=1)=>g.tri(at(...a),at(...b),at(...c),col,mat),
  box:(x,y,z,w,h,d,col,mat=1)=>{
   const p=[[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]],up=p=>[p[0],p[1]+h,p[2]];
   for(let i=0;i<4;i++)g.quad(at(...p[(i+1)%4]),at(...p[i]),at(...up(p[i])),at(...up(p[(i+1)%4])),col,mat);
   g.quad(at(...up(p[0])),at(...up(p[3])),at(...up(p[2])),at(...up(p[1])),col,mat);
  }};
}
function plazaBarriers(g){
 const yaw=Math.atan2(barriers.step[1],barriers.step[0]),red=[.66,.09,.11];
 for(const [cx,cz] of sites())for(const angle of [yaw,yaw+Math.PI/2]){
  const t=frame(g,{cx,cz,yaw:angle}),path=[[-.43,.018,0],[-.18,.96,0]];
  for(let k=1;k<=3;k++){const a=Math.PI-(Math.PI/2)*k/3;path.push([-.10+.08*Math.cos(a),.96+.08*Math.sin(a),0]);}
  path.push([.10,1.04,0]);
  for(let k=1;k<=3;k++){const a=Math.PI/2-(Math.PI/2)*k/3;path.push([.10+.08*Math.cos(a),.96+.08*Math.sin(a),0]);}
  path.push([.43,.018,0]);
  for(let i=1;i<path.length;i++)t.beam(path[i-1],path[i],barriers.radius,red);
 }
}
const glyphs={
 'Е':[[1,1,0,1],[0,1,0,0],[0,0,1,0],[0,.5,.8,.5]],
 'С':[[1,1,0,1],[0,1,0,0],[0,0,1,0]],
 'Н':[[0,0,0,1],[1,0,1,1],[0,.5,1,.5]],
 'И':[[0,0,0,1],[0,0,1,1],[1,1,1,0]]
};
function inscription(t){
 const word='ЕСЕНИН',h=.065,w=.036,gap=.011,start=-(word.length*(w+gap)-gap)/2;
 for(let i=0;i<word.length;i++)for(const [a,b,c,d] of glyphs[word[i]])t.beam([start+i*(w+gap)+a*w,1.59+b*h,.283],[start+i*(w+gap)+c*w,1.59+d*h,.283],.0022,[.40,.40,.36],7,4);
}
function sculpture(g,e){
 const t=frame(g,e),stone=[.83,.82,.76],ivory=[.85,.85,.80];
 t.box(0,0,0,.85,.10,.72,[.63,.63,.57]);
 t.box(0,.10,0,...[yesenin.pedestal[0],yesenin.pedestal[1]-.10,yesenin.pedestal[2]],stone);
 t.box(0,1.92,0,.73,.055,.58,stone);
 t.box(0,1.52,.269,.43,.22,.018,[.77,.77,.70]);
 inscription(t);
 const {width:w,height:h,step,x0,y0,front,back}=Shape;
 const point=(i,surface)=>[x0+(i%w)*step+.02,y0+Math.floor(i/w)*step+1.68,surface[i]+.245];
 function face(indices,surface,reverse){
  if(indices.some(i=>surface[i]===null))return;
  const p=indices.map(i=>point(i,surface));if(reverse)p.reverse();
  t.tri(...p,ivory);
 }
 for(let j=0;j<h-1;j++)for(let i=0;i<w-1;i++){
  const a=j*w+i,b=a+1,c=a+w,d=c+1;
  // Alternate diagonals avoid a repeated vertical staircase across the face.
  const triangles=(i+j)%2?[[a,b,c],[b,d,c]]:[[a,b,d],[a,d,c]];
  for(const triangle of triangles){face(triangle,front,false);face(triangle,back,true);}
 }
}
function site(g,e){
 const t=frame(g,e),stone=[.79,.79,.73],edge=[.60,.60,.54];
 // The low perimeter stops at the open approach to the cross path.
 for(let i=0;i<yesenin.site.length;i++){
  if(i===3)continue;
  const a=yesenin.site[i],b=yesenin.site[(i+1)%yesenin.site.length];
  t.beam([a[0],.055,a[1]],[b[0],.055,b[1]],.055,edge,1,4);
 }
 const [x,z]=yesenin.plaque,p=[[-.31,.13],[.31,.13],[.31,.54],[.19,.64],[-.15,.69],[-.31,.57]];
 t.box(x,0,z,.71,.10,.43,[.59,.59,.53]);
 for(let i=1;i<p.length-1;i++){
  t.tri([x+p[0][0],p[0][1],z+.10],[x+p[i][0],p[i][1],z+.10],[x+p[i+1][0],p[i+1][1],z+.10],stone);
  t.tri([x+p[0][0],p[0][1],z-.10],[x+p[i+1][0],p[i+1][1],z-.10],[x+p[i][0],p[i][1],z-.10],stone);
 }
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],A=[x+a[0],a[1],z-.10],B=[x+b[0],b[1],z-.10],C=[x+b[0],b[1],z+.10],D=[x+a[0],a[1],z+.10];
  t.tri(A,B,C,stone);t.tri(A,C,D,stone);
 }
 // Shallow inscription strokes preserve the tablet without inventing unreadable text.
 for(let i=0;i<6;i++){const y=.48-i*.046,w=i===5?.20:.43-(i%3)*.035;t.beam([x-w/2,y,z+.104],[x+w/2,y,z+.104],.003,[.44,.44,.39],7,4);}
}
function applySiteGround(cats,park){
 const all=yesenin.site.concat(yesenin.approach).map(p=>world(...p));
 const x0=Math.max(0,Math.floor((Math.min(...all.map(p=>p[0]))-park.x0)/park.mpp)),x1=Math.min(park.w-1,Math.ceil((Math.max(...all.map(p=>p[0]))-park.x0)/park.mpp));
 const z0=Math.max(0,Math.floor((Math.min(...all.map(p=>p[1]))-park.z0)/park.mpp)),z1=Math.min(park.h-1,Math.ceil((Math.max(...all.map(p=>p[1]))-park.z0)/park.mpp));
 for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp;
  if(inSite(x,z)&&![4,5].includes(cats[iz*park.w+ix]&31))cats[iz*park.w+ix]=2|64;
 }
}
function applyGround(cats,park){
 const objects=sites().map(p=>({at:p,r:.48}));
 objects.push({at:yesenin.at,r:.51},{at:world(...yesenin.plaque),r:.40});
 for(const {at:[x,z],r} of objects){
  const x0=Math.max(0,Math.floor((x-r-park.x0)/park.mpp)),x1=Math.min(park.w-1,Math.floor((x+r-park.x0)/park.mpp));
  const z0=Math.max(0,Math.floor((z-r-park.z0)/park.mpp)),z1=Math.min(park.h-1,Math.floor((z+r-park.z0)/park.mpp));
  for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
   const px=park.x0+(ix+.5)*park.mpp,pz=park.z0+(iz+.5)*park.mpp;
   if(Math.hypot(px-x,pz-z)<=r+park.mpp*.42)cats[iz*park.w+ix]=13|64;
  }
 }
}
function clearsTree(x,z){return inSite(x,z)||Math.hypot(x-yesenin.at[0],z-yesenin.at[1])<1.5;}
const api={barriers,yesenin,sites,entries,plazaBarriers,sculpture,site,world,local,inSite,applySiteGround,applyGround,clearsTree};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkScannedLandmarks=api;
})(typeof window!=='undefined'?window:globalThis);
