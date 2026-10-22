// The small waterfront structures beside the upside-down house.
(function(root){
'use strict';
const House=typeof module!=='undefined'&&module.exports?require('./park-upside-down-house.js'):root.ParkUpsideDownHouse;
const C={wood:[.28,.23,.22],dark:[.12,.14,.17],white:[.89,.91,.88],glass:[.17,.23,.25],steel:[.48,.54,.56],red:[.75,.17,.07],concrete:[.57,.56,.51],blue:[.12,.47,.70]};
const sites={policePost:{x:-10,d:-1.2,w:3.5,depth:2.25,h:2.65},shoreTicket:{x:7.8,d:-.65,w:2.2,depth:1.85,h:2.75}};
const boats=[{x:8.5,d:-16.2},{x:12.6,d:-16.8},{x:16.7,d:-17.4},{x:20.8,d:-18}];
function rect(f,x,d,w,depth){return [[x-w/2,d-depth/2],[x+w/2,d-depth/2],[x+w/2,d+depth/2],[x-w/2,d+depth/2]].map(p=>{const q=f.at(p[0],0,p[1]);return [q[0],q[2]];});}
function footprint(e){const s=sites[e.kind];return rect(House.frame(e.house),s.x,s.d,s.w,s.depth);}
function layout(house,kind){const s=sites[kind],p=House.frame(house).at(s.x,0,s.d);return {cx:p[0],cz:p[2],house};}
function tools(g,house){
 const at=House.frame(house).at;
 const quad=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 const beam=(a,b,r,col=C.steel,mat=2,sides=4)=>g.beam(at(...a),at(...b),r,col,mat,sides);
 function box(x,y,d,w,h,depth,col,mat=7){
  const p=[[x-w/2,y,d-depth/2],[x+w/2,y,d-depth/2],[x+w/2,y,d+depth/2],[x-w/2,y,d+depth/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}
  quad([x-w/2,y+h,d-depth/2],[x-w/2,y+h,d+depth/2],[x+w/2,y+h,d+depth/2],[x+w/2,y+h,d-depth/2],col,mat);
 }
 function window(x,d,y,w,h,door=false){
  quad([x-w/2,y,d],[x+w/2,y,d],[x+w/2,y+h,d],[x-w/2,y+h,d],C.glass,3);
  for(const u of [-w/2,w/2])beam([x+u,y,d+.025],[x+u,y+h,d+.025],.035,C.white,7);
  for(const v of [y,y+h])beam([x-w/2,v,d+.025],[x+w/2,v,d+.025],.04,C.white,7);
  if(!door)beam([x,y,d+.03],[x,y+h,d+.03],.025,C.white,7);
  beam([x-w/2,y+h*.38,d+.03],[x+w/2,y+h*.38,d+.03],.022,C.white,7);
  if(door)beam([x+w*.30,y+.85,d+.06],[x+w*.30,y+1.08,d+.06],.018,C.steel);
 }
 function sign(x,d,y,w,h,row){
  const start=g.data.length;quad([x-w/2,y,d],[x+w/2,y,d],[x+w/2,y+h,d],[x-w/2,y+h,d],[0,0,0],13);
  const top=row*.5+.015,bottom=(row+1)*.5-.015,uv=[[.02,bottom],[.98,bottom],[.98,top],[.02,bottom],[.98,top],[.02,top]];
  for(let i=0;i<6;i++){g.data[start+i*10+6]=uv[i][0];g.data[start+i*10+7]=uv[i][1];}
 }
 return {at,quad,beam,box,window,sign};
}
function cabin(g,e){
 const s=sites[e.kind],{box,quad,beam,window,sign}=tools(g,e.house),x=s.x,d=s.d,front=d+s.depth/2,police=e.kind==='policePost';
 box(x,.015,d,s.w+.6,.12,s.depth+.7,C.concrete,1);
 box(x,.15,d,s.w,2.23,s.depth,C.wood,police?1:12);
 box(x,.13,d,s.w+.04,.12,s.depth+.04,C.dark,2);
 box(x,2.38,d,s.w+.4,s.h-2.38,s.depth+.35,C.dark,2);
 beam([x-s.w/2-.2,2.39,front+.18],[x+s.w/2+.2,2.39,front+.18],.025,C.white,7);
 sign(x,front+.19,2.40,s.w+.28,s.h-2.43,police?0:1);
 if(police){
  // Slim door on the left, broad divided window on the right.
  for(let i=0;i<23;i++){const u=x-s.w/2+.05+i*.15;beam([u,.26,front+.01],[u,2.36,front+.01],.008,[.38,.34,.32],7,3);}
  window(x-1.12,front+.025,.22,.65,2.02,true);
  window(x+.53,front+.035,.42,1.92,1.8);
  box(x-.62,1.10,front+.045,.19,.13,.02,[.57,.20,.14]);
 }else{
  window(x-.53,front+.035,.98,.72,1.15);window(x+.48,front+.035,.98,.72,1.15);
  box(x,.92,front+.13,2.03,.07,.30,C.white);
  // A matching inverted red roof skirt wraps the little ticket booth.
  for(const side of [-1,1]){
   quad([x+side*(s.w/2+.14),.98,front+.14],[x+side*(s.w/2+.14),.98,d-s.depth/2],[x+side*(s.w/2-.16),.15,d-s.depth/2+.12],[x+side*(s.w/2-.16),.15,front-.12],C.red,11);
  }
  quad([x-s.w/2-.14,.98,front+.14],[x+s.w/2+.14,.98,front+.14],[x+s.w/2-.16,.15,front-.12],[x-s.w/2+.16,.15,front-.12],C.red,11);
  for(const side of [-1,1])beam([x+side*(s.w/2+.14),.98,front+.16],[x+side*(s.w/2-.16),.15,front-.10],.034,C.white,7);
  for(const u of [-.7,.7])box(x+u,2.22,front+.10,.12,.12,.12,C.white);
 }
}
function stairs(g,e){
 const {box,beam}=tools(g,e),x=5.15,top=3.35,run=4.7,end=-4.5,steel=C.steel;
 // An exterior steel flight, with an unobstructed entrance below the house.
 for(const u of [x-.64,x+.64]){
  beam([u,.12,.20],[u,top,end],.065,steel,2);
  beam([u,1.04,.20],[u,top+.98,end],.035,steel,2);
  for(let i=0;i<=4;i++){const t=i/4,d=.20-run*t,y=.12+(top-.12)*t;beam([u,y,d],[u,y+.98,d],.027,steel);}
 }
 for(let i=0;i<17;i++){
  const d=.20-(i+.5)*run/17,y=.12+(i+1)*(top-.12)/17;
  box(x,y-.045,d,1.28,.045,.27,[.39,.43,.43],2);
 }
 box(x,top-.10,end-.70,1.42,.10,1.43,steel,2);
 for(const u of [x-.70,x+.70]){
  for(const d of [end,end-1.4])beam([u,.05,d],[u,top+1,d],.045,steel);
  for(const y of [top+.5,top+1])beam([u,y,end],[u,y,end-1.4],.03,steel);
 }
 for(const y of [top+.5,top+1])beam([x-.7,y,end-1.4],[x+.7,y,end-1.4],.03,steel);
 // Horizontal frame cross braces stay outside the walking treads.
 for(const u of [x-.7,x+.7])beam([u,.25,end],[u,top-.1,end-1.4],.027,steel);
}
function mooring(g,e){
 const {box,beam,quad,at}=tools(g,e.house);
 // Low pontoon along the shoreline, reached from the open rental forecourt.
 box(14.5,.035,-13.0,19,.17,1.4,[.45,.43,.37],1);
 for(let x=5.2;x<24;x+=.48)beam([x,.215,-12.3],[x,.215,-13.7],.012,[.29,.30,.28],7,3);
 for(let x=5.4;x<=23.8;x+=3.1){
  beam([x,.20,-12.20],[x,1.12,-12.20],.025,C.blue);
  if(x<22)beam([x,1.12,-12.20],[x+3.1,1.12,-12.20],.021,[.79,.64,.19]);
 }
 for(let n=0;n<boats.length;n++){
  const b=boats[n],color=n%2?C.white:C.blue;
  // Two slender floats with pointed bows and a raised passenger deck.
  for(const side of [-1,1]){
   const x=b.x+side*.76;
   const p=[[-.25,-1.4],[.25,-1.4],[.34,.95],[0,1.55],[-.34,.95]];
   for(let i=0;i<p.length;i++){
    const a=p[i],c=p[(i+1)%p.length];
    quad([x+a[0],.035,b.d+a[1]],[x+c[0],.035,b.d+c[1]],[x+c[0],.38,b.d+c[1]],[x+a[0],.38,b.d+a[1]],color,10);
    g.tri(at(x,.38,b.d),at(x+a[0],.38,b.d+a[1]),at(x+c[0],.38,b.d+c[1]),C.white,10);
   }
  }
  box(b.x,.34,b.d-.05,1.53,.14,1.90,C.white,10);
  box(b.x,.47,b.d-.72,1.40,.18,.46,C.blue,10);
  box(b.x,.65,b.d-.90,1.40,.49,.13,C.blue,10);
  for(const side of [-1,1]){
   box(b.x+side*.71,.49,b.d-.42,.08,.32,1.03,color,10);
   beam([b.x+side*.64,.48,b.d-1.05],[b.x+side*.64,1.63,b.d-.85],.023,C.steel);
   beam([b.x+side*.64,1.63,b.d-.85],[b.x+side*.64,1.63,b.d+.65],.023,C.steel);
  }
  box(b.x,1.63,b.d-.08,1.60,.045,1.66,n%2?C.blue:[.69,.82,.86],10);
  beam([b.x,.50,b.d+.33],[b.x,.84,b.d+.08],.021,C.dark);
  for(let k=0;k<10;k++){
   const a=k*Math.PI/5,c=(k+1)*Math.PI/5;
   beam([b.x+Math.cos(a)*.17,.84+Math.sin(a)*.17,b.d+.08],[b.x+Math.cos(c)*.17,.84+Math.sin(c)*.17,b.d+.08],.014,C.dark);
  }
  // Mooring line between each bow and the pontoon.
  beam([b.x,.28,b.d+1.50],[b.x,.26,-13.63],.010,[.58,.55,.41],7,3);
 }
}
function applyGround(cats,park,entries){
 const house=entries.find(e=>e.kind==='upsideDownHouse'),f=House.frame(house);
 const old=[5,6,122].map(i=>park.buildings[i].pts),pad=park.mpp*Math.SQRT2;
 const polygons=entries.filter(e=>sites[e.kind]).map(footprint).concat([rect(f,5.15,-2.8,1.48,6.8)]);
 const points=old.concat(polygons).flat(),xs=points.map(p=>p[0]),zs=points.map(p=>p[1]);
 const x0=Math.max(0,Math.floor((Math.min(...xs)-pad-park.x0)/park.mpp)),x1=Math.min(park.w-1,Math.ceil((Math.max(...xs)+pad-park.x0)/park.mpp));
 const z0=Math.max(0,Math.floor((Math.min(...zs)-pad-park.z0)/park.mpp)),z1=Math.min(park.h-1,Math.ceil((Math.max(...zs)+pad-park.z0)/park.mpp));
 // Retire only the old building categories; the lake and other structures survive.
 for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
  const index=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp;
  if((cats[index]&31)===5&&old.some(p=>House.inside(p,x,z)||House.nearBoundary(p,x,z,pad)))cats[index]=(cats[index]&64)|11;
  if(polygons.some(p=>House.inside(p,x,z)))cats[index]=(cats[index]&64)|5;
 }
}
function atlas(){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const c=canvas.getContext('2d');c.fillStyle='#20252d';c.fillRect(0,0,1024,256);
 c.textAlign='center';c.textBaseline='middle';c.font='bold 100px Arial, sans-serif';c.fillStyle='#eeeeeb';c.fillText('ПОЛИЦИЯ',512,67);
 c.save();c.translate(512,192);c.rotate(Math.PI);c.fillStyle='#edcf6f';c.font='bold 112px Arial, sans-serif';c.fillText('КАССА',0,0);c.restore();
 return canvas;
}
const api={sites,boats,layout,footprint,cabin,stairs,mooring,applyGround,atlas};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkHouseSurroundings=api;
})(typeof window!=='undefined'?window:globalThis);
