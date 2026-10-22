// Exterior reconstructed from the user's Tramvaynaya Street panoramas.
(function(root){
'use strict';
const C={wood:[.31,.23,.23],roof:[.76,.18,.075],edge:[.88,.25,.12],white:[.91,.92,.89],
 glass:[.20,.27,.28],dark:[.16,.17,.18],soil:[.17,.15,.12],pot:[.67,.69,.65],gold:[.85,.66,.14]};
function footprint(e){
 // Clockwise quarter-turn about the mapped centre, facing the adjacent path.
 return e.pts.map(([x,z])=>[e.cx-(z-e.cz),e.cz+(x-e.cx)]);
}
function inside(p,x,z){
 let hit=false;
 for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;
 return hit;
}
function nearBoundary(p,x,z,pad){
 return p.some((a,i)=>{
  const b=p[(i+1)%p.length],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<=pad;
 });
}
function applyGround(cats,park,e){
 const rotated=footprint(e),both=e.pts.concat(rotated),pad=park.mpp*Math.SQRT2;
 const xs=both.map(p=>p[0]),zs=both.map(p=>p[1]);
 const x0=Math.max(0,Math.floor((Math.min(...xs)-pad-park.x0)/park.mpp));
 const x1=Math.min(park.w-1,Math.ceil((Math.max(...xs)+pad-park.x0)/park.mpp));
 const z0=Math.max(0,Math.floor((Math.min(...zs)-pad-park.z0)/park.mpp));
 const z1=Math.min(park.h-1,Math.ceil((Math.max(...zs)+pad-park.z0)/park.mpp));
 for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,index=iz*park.w+ix;
  if((cats[index]&31)===5&&(inside(e.pts,x,z)||nearBoundary(e.pts,x,z,pad)))cats[index]=(cats[index]&64)|11;
  if(inside(rotated,x,z))cats[index]=(cats[index]&64)|5;
 }
}
function frame(e){
 const [backRight,backLeft,left,right]=footprint(e);
 const width=Math.hypot(right[0]-left[0],right[1]-left[1]);
 const mid=[(left[0]+right[0])/2,(left[1]+right[1])/2];
 const depth=Math.hypot((backLeft[0]+backRight[0])/2-mid[0],(backLeft[1]+backRight[1])/2-mid[1]);
 const across=[(right[0]-left[0])/width,(right[1]-left[1])/width],front=[-across[1],across[0]];
 return {width,depth,front,right:across,center:mid,height:6.8,at:(x,y,d)=>{
  const u=x/width+.5,t=-d/depth;
  const a=left.map((v,i)=>v+(right[i]-v)*u),b=backLeft.map((v,i)=>v+(backRight[i]-v)*u);
  return [a[0]+(b[0]-a[0])*t,y,a[1]+(b[1]-a[1])*t];
 }};
}
function build(g,e){
 const f=frame(e),at=f.at,W=f.width/2,D=f.depth;
 const quad=(a,b,c,d,col,mat=12)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 const tri=(a,b,c,col,mat=12)=>g.tri(at(...a),at(...b),at(...c),col,mat);
 const beam=(a,b,r,col,mat=7,sides=4)=>g.beam(at(...a),at(...b),r,col,mat,sides);
 function box(x,y,d,w,h,depth,col,mat=7){
  const p=[[x-w/2,y,d-depth/2],[x+w/2,y,d-depth/2],[x+w/2,y,d+depth/2],[x-w/2,y,d+depth/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}
  quad([p[0][0],y+h,p[0][2]],[p[3][0],y+h,p[3][2]],[p[2][0],y+h,p[2][2]],[p[1][0],y+h,p[1][2]],col,mat);
 }
 function window(x,y,d,w,h,side=0){
  const p=(u,v,out=0)=>side?[x+side*out,v,d+u]:[x+u,v,d+out];
  quad(p(-w/2,y),p(w/2,y),p(w/2,y+h),p(-w/2,y+h),C.glass,3);
  for(const u of [-w/2,0,w/2])beam(p(u,y,.025),p(u,y+h,.025),u===0?.023:.045,C.white);
  for(const v of [y,y+h])beam(p(-w/2,v,.025),p(w/2,v,.025),.045,C.white);
 }
 // The rotated footprint carries the upper walls; the roof is below them.
 box(0,2.28,-D/2,W*2,4.27,D,C.wood,12);
 box(0,2.35,.20,2.65,4.20,.62,C.wood,12);
 const roofD=y=>.22-(2.30-y)*.25;
 for(const s of [-1,1]){
  quad([s*1.35,2.30,.22],[s*(W+.20),2.30,.22],[s*(W-.55),.13,roofD(.13)],[s*.83,.13,roofD(.13)],C.roof,11);
  quad([s*(W+.20),2.30,.22],[s*(W+.20),2.30,-D-.20],[s*(W-.55),.13,-D+.48],[s*(W-.55),.13,roofD(.13)],C.roof,11);
  beam([s*1.35,2.30,.25],[s*(W+.20),2.30,.25],.065,C.edge,10);
  // Downward-pointing dormer windows sit on the low red slopes.
  const x=s*(W+1.35)/2,p=(u,y)=>[x+u,y,roofD(y)+.04];
  const polygon=[p(-.48,1.91),p(.48,1.91),p(.48,1.42),p(0,.89),p(-.48,1.42)];
  quad(polygon[4],polygon[3],polygon[2],polygon[0],C.glass,3);
  tri(polygon[0],polygon[2],polygon[1],C.glass,3);
  for(let i=0;i<5;i++)beam(polygon[i],polygon[(i+1)%5],.045,C.white);
  beam(p(-.46,1.43),p(.46,1.43),.026,C.white);
 }
 quad([-W-.20,2.30,-D-.20],[W+.20,2.30,-D-.20],[W-.55,.13,-D+.48],[-W+.55,.13,-D+.48],C.roof,11);
 // Broad foundation cap above the walls, with a stepped central projection.
 box(0,6.55,-D/2,W*2+.70,.25,D+.78,C.dark,2);
 box(0,6.55,.47,3.02,.25,.94,C.dark,2);
 for(const [a,b] of [[[-W-.35,6.54,.40],[W+.35,6.54,.40]],
  [[-W-.35,6.54,-D-.38],[-W-.35,6.54,.40]],[[W+.35,6.54,.40],[W+.35,6.54,-D-.38]]])beam(a,b,.036,C.white);
 beam([-1.51,6.54,.95],[1.51,6.54,.95],.036,C.white);
 // Two upper front windows and inverted flower boxes above them.
 for(const s of [-1,1]){
  const x=s*(W+1.35)/2;
  window(x,3.58,.025,.94,1.24);
  box(x,4.99,.10,.80,.18,.28,C.pot);
  for(let i=0;i<9;i++){
   const u=x-.34+i*.083,y=4.87+(i%3)*.025;
   beam([u,5.0,.18],[u,y,.20],.010,[.23,.35,.20],7,3);
   box(u,y,.205,.055,.045,.04,i%2?[.73,.44,.24]:[.65,.31,.41]);
  }
 }
 for(const s of [-1,1])window(s*(W+.015),3.48,-D*.50,1.02,1.23,s);
 for(const x of [-W*.52,W*.52])window(x,3.58,-D-.018,1.0,1.24);
 // An upright entrance is cut into the upside-down roof; no interior is modelled.
 window(0,.28,.54,1.03,2.05);
 beam([.28,.52,.59],[.28,.80,.59],.017,[.59,.62,.61],2,4);
 for(let i=0;i<3;i++)box(0,.035+i*.075,.97-i*.22,1.20,.075,.48,[.38,.36,.31],1);
 for(const s of [-1,1]){
  beam([s*1.34,2.40,.62],[s*.79,.08,.93],.065,C.white);
  beam([s*1.43,2.41,.59],[s*.89,.07,.91],.043,C.edge,10);
 }
 // Small inverted balcony: white balusters hang below the heavy upper rail.
 box(0,2.91,.66,2.95,.15,.86,C.white);
 box(0,2.20,.62,2.84,.07,.72,C.white);
 for(let i=0;i<8;i++){
  const x=-1.30+i*2.60/7;
  beam([x,2.26,.99],[x,2.91,.99],.020,C.white);
  for(const y of [2.36,2.71]){
   beam([x,y-.06,.99],[x,y,.99],.041,C.white,7,5);
   beam([x,y,.99],[x,y+.06,.99],.041,C.white,7,5);
  }
 }
 // Two inverted planters with bare trunks and fine dangling roots.
 for(const x of [-.93,.93]){
  for(let i=0;i<12;i++){
   const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
   const p=(t,y,r)=>[x+Math.cos(t)*r,y,.80+Math.sin(t)*r];
   quad(p(a,6.49,.15),p(b,6.49,.15),p(b,6.13,.24),p(a,6.13,.24),C.pot,7);
   tri([x,6.12,.80],p(a,6.12,.23),p(b,6.12,.23),C.soil,7);
   beam(p(a,6.46,.157),p(a,6.16,.236),.008,C.white,7,3);
  }
  beam([x,6.12,.80],[x-.05,5.57,.82],.048,[.50,.51,.47],7,5);
  beam([x-.05,5.57,.82],[x+.03,5.02,.86],.031,[.50,.51,.47],7,5);
  for(let i=0;i<7;i++){
   const a=i*2.4,dx=Math.cos(a)*(.15+i*.018),dz=Math.sin(a)*.11;
   const from=[x+.03,5.04,.86],mid=[x+dx,4.78-i*.025,.88+dz];
   beam(from,mid,.010,[.40,.39,.33],7,3);
   for(const s of [-1,1])beam(mid,[mid[0]+s*.11,mid[1]-.20-(i%2)*.05,mid[2]+s*.04],.005,[.43,.42,.34],7,3);
  }
 }
 // The photographed maroon boat and yellow watering can beneath the top slab.
 for(let i=0;i<8;i++){
  const a=i/8,b=(i+1)/8,p=(t,top,d=.73)=>[1.57+t*2.53,5.65+(top?.34:-.05)*Math.sin(t*Math.PI),d];
  quad(p(a,0),p(b,0),p(b,1),p(a,1),[.44,.23,.28],10);
  quad(p(a,1),p(b,1),p(b,1,.12),p(a,1,.12),[.36,.19,.23],10);
  beam(p(a,0),p(b,0),.026,[.12,.32,.56],10);
 }
 box(1.65,5.96,.24,.24,.30,.20,C.gold,10);
 beam([1.78,6.07,.26],[2.03,5.91,.27],.029,C.gold,10);
 for(let i=0;i<10;i++){
  const a=i*Math.PI/5,b=(i+1)*Math.PI/5;
  beam([1.65+Math.cos(a)*.22,6.40+Math.sin(a)*.08,.10],[1.65+Math.cos(b)*.22,6.40+Math.sin(b)*.08,.10],.009,C.gold,10,3);
 }
 // A short upside-down stair flight is visible at the upper right corner.
 for(let i=0;i<6;i++)box(W+.13,5.58+i*.15,-.08-i*.27,.36,.15,.28,C.white);
}
const api={frame,build,footprint,applyGround,inside,nearBoundary};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkUpsideDownHouse=api;
})(typeof window!=='undefined'?window:globalThis);
