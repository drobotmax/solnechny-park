// Veranda cafe reconstructed from the user's four October 2026 panoramas.
(function(root){
'use strict';
const C={white:[.88,.88,.81],wood:[.37,.25,.17],timber:[.47,.29,.16],dark:[.16,.14,.12],roof:[.34,.27,.23],glass:[.13,.19,.19],green:[.13,.34,.19],pink:[.87,.16,.44],stone:[.84,.83,.76]};
function frame(e){
 const p=e.pts,a=p[0],b=p[3],width=Math.hypot(b[0]-a[0],b[1]-a[1]),depth=Math.hypot(p[1][0]-a[0],p[1][1]-a[1]);
 const right=[(b[0]-a[0])/width,(b[1]-a[1])/width],front=[-right[1],right[0]];
 return {width,depth,right,front,at:(x,y,d)=>[a[0]+right[0]*x+front[0]*d,y,a[1]+right[1]*x+front[1]*d]};
}
function tools(g,e){
 const f=frame(e),at=f.at;
 const quad=(a,b,c,d,color,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),color,mat);
 const tri=(a,b,c,color,mat=7)=>g.tri(at(...a),at(...b),at(...c),color,mat);
 const beam=(a,b,r,color=C.wood,mat=7,sides=4)=>g.beam(at(...a),at(...b),r,color,mat,sides);
 function box(x,y,d,w,h,depth,color,mat=7){
  const p=[[x-w/2,y,d-depth/2],[x+w/2,y,d-depth/2],[x+w/2,y,d+depth/2],[x-w/2,y,d+depth/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],color,mat);}
  quad([x-w/2,y+h,d-depth/2],[x-w/2,y+h,d+depth/2],[x+w/2,y+h,d+depth/2],[x+w/2,y+h,d-depth/2],color,mat);
 }
 function window(x,y,d,w,h){
  quad([x-w/2,y,d],[x+w/2,y,d],[x+w/2,y+h,d],[x-w/2,y+h,d],C.glass,3);
  for(const u of [-w/2,0,w/2])beam([x+u,y,d+.015],[x+u,y+h,d+.015],.026,C.white);
  for(const v of [y,y+h])beam([x-w/2,v,d+.015],[x+w/2,v,d+.015],.033,C.white);
 }
 return {f,at,quad,tri,beam,box,window};
}
function random(seed){let n=seed;return ()=>{n=Math.imul(n,1664525)+1013904223|0;return (n>>>0)/4294967296;};}
function bloom(t,x,y,d,size,seed){
 const r=random(seed),colors=[[.90,.87,.81],[.87,.67,.72],[.64,.46,.68],[.89,.80,.72]];
 const col=colors[seed%colors.length];
 for(let i=0;i<5;i++){
  const a=i*Math.PI*.4,dx=Math.cos(a)*size,dy=Math.sin(a)*size;
  t.quad([x,y,d+.025],[x+dx*.60-dy*.40,y+dy*.60+dx*.40,d-.015],
   [x+dx,y+dy,d-.035-r()*.025],[x+dx*.60+dy*.40,y+dy*.60-dx*.40,d-.015],col);
 }
 t.tri([x-.025,y-.02,d+.03],[x+.025,y-.02,d+.03],[x,y+.03,d+.03],[.78,.65,.31]);
}
function garland(t,x0,x1,d,y,seed){
 const r=random(seed);
 for(let x=x0;x<x1;x+=.23){
  const py=y+(r()-.5)*.25,pd=d+(r()-.5)*.22;
  for(let j=0;j<5;j++){
   const a=r()*Math.PI*2,l=.20+r()*.29,dx=Math.cos(a)*l,dy=Math.sin(a)*l,side=.065+r()*.055;
   t.quad([x,py,pd],[x+dx*.45-dy/l*side,py+dy*.45+dx/l*side,pd+.055],[x+dx,py+dy,pd+.02],[x+dx*.45+dy/l*side,py+dy*.45-dx/l*side,pd-.035],[.11+r()*.10,.28+r()*.15,.14+r()*.10]);
  }
  if(r()>.60)for(let k=0;k<2;k++)bloom(t,x+(r()-.5)*.25,py+(r()-.5)*.24,pd+.16,.10+r()*.075,seed+Math.floor(x*13)+k+1000);
 }
 // Fern sprays and ivy trails hang below the roof, leaving the bays open.
 for(let x=x0+.3;x<x1;x+=1.1){
  const drop=.45+r()*.5;t.beam([x,y,d],[x+.10,y-drop,d+.12],.009,C.green,7,3);
  for(let j=0;j<6;j++)for(const s of [-1,1]){
   const yy=y-j*drop/6,l=.20*(1-j/8);
   t.tri([x,yy,d+.06],[x+s*l,yy-.16,d+.10],[x+s*l*.25,yy-.10,d+.13],[.13,.36,.20]);
  }
 }
}
function pickets(t,a,b){
 const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),n=Math.max(1,Math.round(len/.24));
 for(const y of [.31,.83])t.beam([a[0],y,a[1]],[b[0],y,b[1]],.035,C.white);
 for(let i=0;i<=n;i++){
  const x=a[0]+dx*i/n,d=a[1]+dz*i/n,w=.13,h=1.12+(i%2)*.015;
  // The rounded picket tops read clearly without expensive cylinders.
  if(Math.abs(dx)>Math.abs(dz)){
   t.box(x,.07,d,w,h-.055,.045,C.white);t.quad([x-w/2,h+.015,d+.024],[x+w/2,h+.015,d+.024],[x+w*.25,h+.065,d+.024],[x-w*.25,h+.065,d+.024],C.white);
  }else t.box(x,.07,d,.045,h,w,C.white);
 }
}
function windmill(t,x,d){
 const y=1.24;t.beam([x,y,d-.10],[x,y,d+.08],.075,[.62,.61,.53],7,8);
 for(let k=0;k<4;k++){
  const a=Math.PI/4+k*Math.PI/2,at=(r,w)=>[x+Math.cos(a)*r-Math.sin(a)*w,y+Math.sin(a)*r+Math.cos(a)*w,d];
  for(const s of [-1,1])t.beam(at(.18,s*.09),at(1.10,s*.32),.022,C.white);
  for(let j=0;j<5;j++){
   const r=.29+j*.18,w=.12+j*.045;
   t.quad(at(r,-w),at(r+.10,-w-.025),at(r+.10,w+.025),at(r,w),C.white);
  }
 }
}
function planter(t,x,d){
 for(let k=0;k<8;k++){
  const a=k*Math.PI/4,b=(k+1)*Math.PI/4,p=(a,y,r)=>[x+Math.cos(a)*r,y,d+Math.sin(a)*r];
  t.quad(p(a,.06,.20),p(b,.06,.20),p(b,.48,.28),p(a,.48,.28),C.white);
 }
 const r=random(Math.round(x*177)+1000);
 for(let i=0;i<12;i++){
  const dx=(r()-.5)*.5,dz=(r()-.5)*.3,y=.90+r()*.40;
  t.beam([x,.45,d],[x+dx,y,d+dz],.009,[.54,.49,.30],7,3);
  t.tri([x+dx-.025,y-.12,d+dz],[x+dx+.025,y-.12,d+dz],[x+dx,y+.06,d+dz],[.68,.62,.43]);
 }
}
function bicycle(t,x,d){
 const q=(u,y)=>[x+u,y,d];
 for(const s of [-1,1]){
  const cx=s*.56;
  for(let i=0;i<20;i++){
   const a=i*Math.PI/10,b=(i+1)*Math.PI/10;
   t.beam(q(cx+Math.cos(a)*.34,.39+Math.sin(a)*.34),q(cx+Math.cos(b)*.34,.39+Math.sin(b)*.34),.026,C.pink,10);
   if(i%2===0)t.beam(q(cx,.39),q(cx+Math.cos(a)*.32,.39+Math.sin(a)*.32),.005,C.white,7,3);
  }
 }
 for(const [a,b] of [[[-.56,.39],[-.18,.88]],[[-.18,.88],[.08,.39]],[[.08,.39],[-.56,.39]],[[-.18,.88],[.40,.88]],[[.40,.88],[.08,.39]],[[.40,.88],[.56,.39]]])t.beam(q(...a),q(...b),.025,C.pink,10);
 t.beam(q(-.23,.96),q(-.04,.96),.041,[.29,.20,.20]);
 t.beam(q(.40,.88),q(.39,1.14),.022,C.pink,10);t.beam(q(.29,1.14),q(.53,1.14),.020,C.pink,10);
 t.box(x+.63,.91,d,.35,.22,.29,[.70,.56,.49],1);
 for(let i=0;i<8;i++)bloom(t,x+.45+(i%3)*.11,1.15+Math.floor(i/3)*.06,d+.17,.07,2100+i);
}
function curtain(t,x,d,side){
 for(let i=0;i<6;i++){
  const a=i/6,b=(i+1)/6,p=(u,y)=>[x+side*(.07+u*(y<1.1?.13:.40)),y,d+Math.cos(u*Math.PI*5)*.055];
  t.quad(p(a,.24),p(b,.24),p(b,2.55),p(a,2.55),i%2?[.75,.75,.68]:[.87,.86,.78]);
 }
}
function table(t,x,d){
 t.box(x,.76,d,.83,.07,.72,C.wood,12);t.beam([x,.04,d],[x,.76,d],.048,C.dark);
 for(const side of [-1,1]){
  const xx=x+side*.72;t.box(xx,.40,d,.42,.045,.43,[.38,.32,.25]);
  t.box(xx,.44,d-.20,.42,.45,.04,[.38,.32,.25]);
  for(const dz of [-.17,.17])t.beam([xx,.03,d+dz],[xx,.40,d+dz],.025,C.dark);
 }
}
function main(g,e){
 const t=tools(g,e),{f,quad,tri,box,beam,window}=t,W=f.width,D=f.depth;
 // Low cafe body and a white pavilion replace the former tall colonnaded box.
 box(W/2,.04,-D/2,W,2.75,D,[.68,.65,.56],1);
 for(const x of [1.8,5.4,9.5])window(x,.65,.025,2.15,1.72);
 const tent=[[-.15,2.83,.12],[W*.61,2.83,.12],[W*.61,2.83,-D-.15],[-.15,2.83,-D-.15]],peak=[W*.30,5.15,-D*.52];
 for(let i=0;i<4;i++)tri(tent[i],tent[(i+1)%4],peak,i%2?[.88,.87,.81]:[.96,.95,.89]);
 // A raised timber room with a pitched roof shows above the right-hand terrace.
 const bx=W*.79,bw=W*.48,bd=D*.44,front=-D*.18,back=front-bd;
 box(bx,2.80,(front+back)/2,bw,3.46,bd,C.timber,12);
 for(let y=3.0;y<6.24;y+=.24){
  const ranges=y>=4.55&&y<=5.72?[[bx-bw/2,bx-.83],[bx+.83,bx+bw/2]]:[[bx-bw/2,bx+bw/2]];
  for(const [a,b] of ranges)beam([a,y,front+.012],[b,y,front+.012],.012,[.53,.35,.21],7,3);
  for(const x of [bx-bw/2-.012,bx+bw/2+.012])beam([x,y,front],[x,y,back],.012,[.53,.35,.21],7,3);
 }
 window(bx,4.55,front+.025,1.60,1.17);
 box(bx-1.55,3.15,front+.11,.60,.43,.27,[.68,.69,.63]);
 for(let i=0;i<4;i++)beam([bx-1.79,3.23+i*.065,front+.26],[bx-1.31,3.23+i*.065,front+.26],.008,[.32,.35,.34]);
 for(const d of [front+.25,back-.25])tri([bx-bw/2,6.24,d],[bx,7.40,d],[bx+bw/2,6.24,d],C.timber,12);
 quad([bx-bw/2-.24,6.20,front+.28],[bx,7.46,front+.28],[bx,7.46,back-.28],[bx-bw/2-.24,6.20,back-.28],C.roof,14);
 quad([bx,7.46,front+.28],[bx+bw/2+.24,6.20,front+.28],[bx+bw/2+.24,6.20,back-.28],[bx,7.46,back-.28],C.roof,14);
 // An open covered terrace projects toward the promenade.
 const left=-3.5,right=W+1.0,frontD=3.62;
 box((left+right)/2,.015,1.75,right-left,.035,3.7,[.51,.47,.39],1);
 quad([left-.15,2.48,frontD+.2],[right+.15,2.48,frontD+.2],[right+.15,3.48,-.8],[left-.15,3.48,-.8],C.roof,14);
 beam([left,2.46,frontD],[right,2.46,frontD],.065,C.wood);
 for(let x=left;x<=right+.1;x+=(right-left)/5){
  beam([x,.04,frontD-.1],[x,2.59,frontD-.1],.065,[.56,.53,.43]);
  beam([x,1.93,frontD-.12],[x+.38,2.47,frontD-.12],.042,[.56,.53,.43]);
  if(x>0){curtain(t,x,frontD-.20,-1);curtain(t,x,frontD-.20,1);}
 }
 // Dark trellis panels and small tables remain visible between the curtains.
 for(const x of [1.3,5.2,9.3]){
  quad([x-.55,.20,.22],[x+.55,.20,.22],[x+.55,2.51,.22],[x-.55,2.51,.22],C.dark);
  for(let y=.35;y<2.4;y+=.25)beam([x-.55,y,.25],[x+.55,y+.38,.25],.014,[.39,.34,.27]);
  table(t,x+1,1.5);
 }
 pickets(t,[left,frontD],[left+.6,frontD]);pickets(t,[-.45,frontD],[right,frontD]);
 pickets(t,[left,-.3],[left,frontD]);pickets(t,[right,-.3],[right,frontD]);
 // The gravel border and its curb follow the front fence, with a gap at the gate.
 for(const [a,b] of [[left-.9,left+.65],[-.45,right+.45]]){
  box((a+b)/2,.01,4.13,b-a,.045,.82,[.91,.91,.86],1);
  box((a+b)/2,.005,4.58,b-a,.11,.15,C.stone,1);
 }
 for(const x of [1.1,5.3,9.6,12.8]){windmill(t,x,frontD+.14);planter(t,x+.25,4.15);}
 // A separate floral entrance arch sits beside Tut Coffee, before the picket run.
 for(const x of [left+.5,-.45])beam([x,.025,frontD+.02],[x,3.0,frontD+.02],.075,[.72,.70,.61]);
 beam([left+.40,2.98,frontD+.02],[-.35,2.98,frontD+.02],.095,[.72,.70,.61]);
 const start=g.data.length;
 quad([left+.47,2.56,frontD+.48],[-.42,2.56,frontD+.48],[-.42,2.96,frontD+.48],[left+.47,2.96,frontD+.48],[0,0,0],15);
 const uv=[[.02,.95],[.98,.95],[.98,.05],[.02,.95],[.98,.05],[.02,.05]];
 for(let i=0;i<6;i++){g.data[start+i*10+6]=uv[i][0];g.data[start+i*10+7]=uv[i][1];}
 garland(t,left-.18,W*.48,frontD+.11,2.89,7541);
 garland(t,left+.1,-.15,frontD+.11,3.24,3382);
 bicycle(t,left-.45,4.15);
}
function gazebo(g,e){
 const t=tools(g,e),{f,quad,tri,beam,box}=t,x=f.width/2,d=-f.depth/2,R=Math.min(f.width,f.depth)*.445;
 const p=(i,y,r=R)=>[x+Math.cos(i*Math.PI/4+Math.PI/8)*r,y,d+Math.sin(i*Math.PI/4+Math.PI/8)*r];
 for(let i=0;i<8;i++){
  const a=p(i,.06),b=p(i+1,.06),au=p(i,2.72),bu=p(i+1,2.72);
  quad(a,b,[b[0],.91,b[2]],[a[0],.91,a[2]],C.wood,12);
  quad([a[0],.98,a[2]],[b[0],.98,b[2]],bu,au,C.glass,3);
  beam(a,au,.075,[.45,.36,.25]);beam(au,bu,.055,C.wood);
  quad(p(i,2.75,R+.4),p(i+1,2.75,R+.4),p(i+1,4.30,.78),p(i,4.30,.78),C.roof,14);
  const ca=p(i,4.25,.76),cb=p(i+1,4.25,.76);
  beam(ca,[ca[0],4.92,ca[2]],.037,C.wood);
  tri([ca[0],4.94,ca[2]],[cb[0],4.94,cb[2]],[x,5.38,d],C.roof,14);
 }
 // A low pale fence and planting continue the veranda frontage to the gazebo.
 pickets(t,[.6,.28],[f.width-.6,.28]);planter(t,1.1,.73);planter(t,f.width-1.1,.73);
 box(x,.015,.64,f.width+.3,.04,.92,[.91,.91,.86],1);box(x,.005,1.16,f.width+.35,.11,.15,C.stone,1);
}
function footprint(e){
 if(e.kind!=='verandaGazebo')return e.pts;
 const f=frame(e),R=Math.min(f.width,f.depth)*.445;
 return Array.from({length:8},(_,i)=>{const a=i*Math.PI/4+Math.PI/8,p=f.at(f.width/2+Math.cos(a)*R,0,-f.depth/2+Math.sin(a)*R);return [p[0],p[2]];});
}
function clearsTree(x,z){return Math.hypot(x-64.53,z+402.75)<.6;}
function applyGround(cats,park,entries){
 const e=entries.find(e=>e.kind==='veranda'),gazeboEntry=entries.find(e=>e.kind==='verandaGazebo'),f=frame(e),W=f.width;
 const at=(x,d)=>{const p=f.at(x,0,d);return [p[0],p[2]];};
 const strip=(a,b,r)=>{
  const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*r,nz=dx/len*r;
  return [[a[0]+nx,a[1]+nz],[b[0]+nx,b[1]+nz],[b[0]-nx,b[1]-nz],[a[0]-nx,a[1]-nz]];
 };
 const fences=[strip(at(-3.5,3.62),at(-2.9,3.62),.20),strip(at(-.45,3.62),at(W+1,3.62),.20),strip(at(-3.5,-.3),at(-3.5,3.62),.20),strip(at(W+1,-.3),at(W+1,3.62),.20)];
 const gf=frame(gazeboEntry),ga=gf.at(.6,0,.28),gb=gf.at(gf.width-.6,0,.28);fences.push(strip([ga[0],ga[2]],[gb[0],gb[2]],.20));
 const octagon=footprint(gazeboEntry),inside=(p,x,z)=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++)if((p[i][1]>z)!==(p[j][1]>z)&&x<(p[j][0]-p[i][0])*(z-p[i][1])/(p[j][1]-p[i][1])+p[i][0])hit=!hit;return hit;};
 const nearOldGazebo=(x,z)=>gazeboEntry.pts.some((a,i)=>{
  const b=gazeboEntry.pts[(i+1)%gazeboEntry.pts.length],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<=park.mpp*Math.SQRT2;
 });
 const all=e.pts.concat(gazeboEntry.pts,...fences),xs=all.map(p=>p[0]),zs=all.map(p=>p[1]);
 const x0=Math.max(0,Math.floor((Math.min(...xs)-1-park.x0)/park.mpp)),x1=Math.min(park.w-1,Math.ceil((Math.max(...xs)+1-park.x0)/park.mpp));
 const z0=Math.max(0,Math.floor((Math.min(...zs)-1-park.z0)/park.mpp)),z1=Math.min(park.h-1,Math.ceil((Math.max(...zs)+1-park.z0)/park.mpp));
 for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp;
  if((cats[index]&31)===5&&(inside(gazeboEntry.pts,x,z)||nearOldGazebo(x,z)))cats[index]=(cats[index]&64)|11;
  if(inside(octagon,x,z))cats[index]=(cats[index]&64)|5;
  if(fences.some(p=>inside(p,x,z)))cats[index]=(cats[index]&64)|13;
 }
}
function atlas(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=192;
 const c=canvas.getContext('2d');c.fillStyle='#1e201d';c.fillRect(0,0,1024,192);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f4f2e7';c.font='bold 148px Arial, sans-serif';
 c.save();c.translate(512,101);c.scale(.96,1);c.fillText('ВЕРАНДА',0,0);c.restore();return canvas;
}
const api={frame,main,gazebo,footprint,clearsTree,applyGround,atlas};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkVeranda=api;
})(typeof window!=='undefined'?window:globalThis);
