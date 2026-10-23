// Small, reference-led mesh set. All dimensions are approximate within OSM footprints.
(function(root){
'use strict';
const TicketOffice=typeof module!=='undefined'&&module.exports?require('./park-ticket-office.js'):root.ParkTicketOffice;
const Transylvania=typeof module!=='undefined'&&module.exports?require('./park-transylvania.js'):root.ParkTransylvania;
const UpsideDownHouse=typeof module!=='undefined'&&module.exports?require('./park-upside-down-house.js'):root.ParkUpsideDownHouse;
const HouseSurroundings=typeof module!=='undefined'&&module.exports?require('./park-house-surroundings.js'):root.ParkHouseSurroundings;
const Veranda=typeof module!=='undefined'&&module.exports?require('./park-veranda.js'):root.ParkVeranda;
const CentralAlley=typeof module!=='undefined'&&module.exports?require('./park-central-alley.js'):root.ParkCentralAlley;
const buildingIds=[3,4,5,6,7,47,48,49,50,67,77,81,113,122,123], rideIds=[0,1,2,3,6,8,9,17,23,25,26,27,28,29,36];
// Placed and scaled to the stage rectangle marked in the user's plaza screenshot.
const plazaStageFootprint=[[49.93,-379.74],[44.53,-369.06],[50.08,-366.26],[55.48,-376.94]];
const bridgeLandingAxis=[[7.87,-432.91],[13.3,-406.85]];
const bridgeCityEnd=[-11.88,-527.76];
// Photo-led estimates: one undivided carriageway, two narrow side walks.
const bridgeSpec={roadWidth:6,walkWidth:1.6,walkRise:.18,rampLength:2.8};
function bridgeFrame(){
 const a=bridgeCityEnd,b=bridgeLandingAxis[0],length=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
 return {a,b,length,dx,dz,at:(s,l,y=0)=>{const x=a[0]+dx*s+dz*l,z=a[1]+dz*s-dx*l;return [x,terrainHeightBase(x,z)+y,z];},
  local:(x,z)=>({s:(x-a[0])*dx+(z-a[1])*dz,l:(x-a[0])*dz-(z-a[1])*dx})};
}
const rampLength=Math.hypot(bridgeLandingAxis[1][0]-bridgeLandingAxis[0][0],bridgeLandingAxis[1][1]-bridgeLandingAxis[0][1]);
const rampDirection=[(bridgeLandingAxis[1][0]-bridgeLandingAxis[0][0])/rampLength,(bridgeLandingAxis[1][1]-bridgeLandingAxis[0][1])/rampLength];
const rampCityS=(bridgeCityEnd[0]-bridgeLandingAxis[0][0])*rampDirection[0]+(bridgeCityEnd[1]-bridgeLandingAxis[0][1])*rampDirection[1];
const terrainSpec={anchor:bridgeLandingAxis[0],direction:rampDirection,cityS:rampCityS,parkS:rampLength,deckHeight:2};
function smooth01(t){t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);}
function terrainHeightBase(x,z){
 const s=(x-terrainSpec.anchor[0])*rampDirection[0]+(z-terrainSpec.anchor[1])*rampDirection[1];
 if(s<=rampCityS||s>=rampLength)return 0;
 const l=Math.abs((x-terrainSpec.anchor[0])*rampDirection[1]-(z-terrainSpec.anchor[1])*rampDirection[0]);
 const widening=smooth01((s+8)/10),core=7.5+8.5*widening,outer=9.5+12.5*widening;
 const lateral=1-smooth01((l-core)/(outer-core));
 const city=smooth01((s-rampCityS)/14),park=1-smooth01(s/rampLength);
 return terrainSpec.deckHeight*Math.min(city,park)*lateral;
}
function bridgeWalkRise(x,z){
 if(z<bridgeCityEnd[1]-2||z>bridgeLandingAxis[0][1]+2||x<bridgeCityEnd[0]-6||x>bridgeLandingAxis[0][0]+6)return 0;
 const f=bridgeFrame(),{s,l}=f.local(x,z),d=Math.abs(l),half=bridgeSpec.roadWidth/2;
 if(s<0||s>f.length||d<half+.20||d>half+bridgeSpec.walkWidth-.16)return 0;
 return .025+bridgeSpec.walkRise*Math.min(1,s/bridgeSpec.rampLength,(f.length-s)/bridgeSpec.rampLength);
}
function terrainHeight(x,z){return terrainHeightBase(x,z)+bridgeWalkRise(x,z);}
function landingZone(x,z){
 const a=bridgeLandingAxis[0],b=bridgeLandingAxis[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
 const s=(x-a[0])*dx+(z-a[1])*dz,l=Math.abs((x-a[0])*dz-(z-a[1])*dx),half=3.2+.12*s;
 if(s>=0&&s<=25&&l<=half+4.05)return 'road';
 if(s>=1.5&&s<=23.5&&l>=half+4.45&&l<=half+((x-a[0])*dz-(z-a[1])*dx>0?13-.08*s:12-.05*s))return 'bed';
 return null;
}
const C={cream:[.80,.75,.63],trim:[.92,.89,.80],roof:[.28,.20,.16],glass:[.18,.30,.33],red:[.68,.12,.10],steel:[.57,.60,.58],gold:[.73,.53,.20],dark:[.12,.15,.15]};
function center(p){return p.reduce((a,b)=>[a[0]+b[0]/p.length,a[1]+b[1]/p.length],[0,0]);}
function entries(park){
 const stageCenter=center(plazaStageFootprint);
 const b=park.buildings[123],c=center(b.pts),house={id:'b123',cx:c[0],cz:c[1],pts:b.pts,kind:'upsideDownHouse'};
 return buildingIds.map(i=>{const b=park.buildings[i],c=center(b.pts),kind=i===123?'upsideDownHouse':i===5?'policePost':i===6?'shoreMooring':i===122?'shoreTicket':i===4?'ticketOffice':i===7?'bikeCafe':i===49?'tutCoffee':i===81?'veranda':i===50?'verandaGazebo':'building';
  const e={id:'b'+i,cx:c[0],cz:c[1],kind:i===67?'serviceKiosk':i===47?'alleyCafe':i===48?'arcade':i===77||i===113?'rideBooth':kind,pts:b.pts,h:i===123?6.8:i===81?7.46:i===3?7.2:b.h,style:i===3?'colonnade':'cafe'};
  if(kind==='policePost'||kind==='shoreTicket')Object.assign(e,HouseSurroundings.layout(house,kind));
  if(kind==='shoreMooring')e.house=house;
  return e;})
 .concat(rideIds.map(i=>{const r=park.rides[i],c=center(r.pts);
  const kind=i===3?'transylvania':i===1?'coaster':i===36?'carousel':i===0||i===2?'bumper':i===17?'train':i===26?'swingTower':i===27?'pendulum':'spinner';
  return {id:'r'+i,cx:i===8?CentralAlley.kiddie[0]:c[0],cz:i===8?CentralAlley.kiddie[1]:c[1],kind:i===8?'kiddieCarousel':i===23?'airTrack':i===28?'carCarousel':i===29?'toyCarousel':i===36?'weddingCarousel':kind,pts:r.pts};}))
 .concat([{id:'plaza-stage',cx:stageCenter[0],cz:stageCenter[1],kind:'plazaStage',pts:plazaStageFootprint},
  {id:'entrance-landing',cx:10.6,cz:-419.9,kind:'bridgeLanding',pts:bridgeLandingAxis},
  {id:'central-alley',cx:24,cz:-337,kind:'centralAlley',pts:CentralAlley.bed},
  {id:'central-west',cx:12,cz:-329,kind:'centralWest',pts:CentralAlley.westBed},
  {id:'main-avenue',cx:28,cz:-299,kind:'mainAvenue',pts:CentralAlley.continuationBed}]);
}
function forestEntries(trees){
 const sectors=new Map();
 for(const t of trees){
  const ix=Math.floor(t[0]/64),iz=Math.floor(t[1]/64),id='forest:'+ix+','+iz;
  if(!sectors.has(id))sectors.set(id,{id,cx:(ix+.5)*64,cz:(iz+.5)*64,kind:'forest',trees:[]});
  sectors.get(id).trees.push(t);
 }
 return [...sectors.values()];
}
function bridgeEntries(park){
 const road=park.bridges.find(b=>b.osm_id===27081408),f=bridgeFrame();
 return park.bridges.filter(b=>b.osm_id===176130545||b.osm_id===176130547).map(b=>{
  const side=Math.sign(f.local(...b.pts[0]).l),c=f.at(f.length/2,side*(bridgeSpec.roadWidth+bridgeSpec.walkWidth)/2);
  return {id:'bridge:'+b.osm_id,cx:c[0],cz:c[2],kind:'bridgeRails',pts:b.pts,width:bridgeSpec.walkWidth,side,road:road.pts[0]};
 });
}
function applyBridgeGround(cats,park){
 const f=bridgeFrame(),inner=bridgeSpec.roadWidth/2+.10,outer=bridgeSpec.roadWidth/2+bridgeSpec.walkWidth;
 const x0=Math.max(0,Math.floor((Math.min(f.a[0],f.b[0])-10-park.x0)/park.mpp)),x1=Math.min(park.w-1,Math.ceil((Math.max(f.a[0],f.b[0])+10-park.x0)/park.mpp));
 const z0=Math.max(0,Math.floor((f.a[1]-3-park.z0)/park.mpp)),z1=Math.min(park.h-1,Math.ceil((f.b[1]+3-park.z0)/park.mpp));
 for(let iz=z0;iz<=z1;iz++)for(let ix=x0;ix<=x1;ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,{s,l}=f.local(x,z),d=Math.abs(l),index=iz*park.w+ix;
  if(s<0||s>f.length||d>8.5)continue;
  const flags=cats[index]&64,cat=cats[index]&31;
  if(d<=outer+.20){
   const wall=Math.abs(d-outer)<.20||(s>1.8&&s<f.length-1.8&&Math.abs(d-inner)<.18);
   cats[index]=flags|(wall?13:d<inner?3:2);
  }else if(s>14&&s<f.length-5&&(cat===2||cat===3))cats[index]=flags|4;
 }
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
function forest(g,e){
 for(const [x,z,h,cr] of e.trees){
  const base=terrainHeight(x,z),height=h*.46,radius=.10+cr*.028;
  const seed=Math.sin(x*12.9898+z*78.233)*43758.5453,angle=(seed-Math.floor(seed))*Math.PI*2;
  const bark=Math.sin(x+z)>.72?[.54,.52,.46]:[.30,.25,.19];
  const lean=[Math.cos(angle)*.28,Math.sin(angle)*.28];
  const ring=(a,y,r)=>[x+Math.cos(a)*r+lean[0]*y/height,base+y,z+Math.sin(a)*r+lean[1]*y/height];
  for(let i=0;i<8;i++){
   const a=angle+i*Math.PI/4,b=angle+(i+1)*Math.PI/4;
   g.quad(ring(b,0,radius*1.25),ring(a,0,radius*1.25),ring(a,height,radius*.45),ring(b,height,radius*.45),bark,5);
  }
  for(let i=0;i<3;i++){
   const a=angle+i*Math.PI*2/3;
   g.beam([x+lean[0]*.75,base+height*.75,z+lean[1]*.75],
    [x+Math.cos(a)*cr*.55,base+h*(.58+i*.055),z+Math.sin(a)*cr*.55],radius*.43,bark,5,5);
  }
 }
}
function bridgeRails(g,e){
 const f=bridgeFrame(),len=f.length,stone=[.63,.62,.57],white=[.89,.91,.87],inner=bridgeSpec.roadWidth/2+.10,outer=bridgeSpec.roadWidth/2+bridgeSpec.walkWidth;
 const at=(s,l,y)=>f.at(s,e.side*l,y),rise=s=>.025+bridgeSpec.walkRise*Math.min(1,s/bridgeSpec.rampLength,(len-s)/bridgeSpec.rampLength);
 // Both walks stay parallel to the road, including at the ends of the bridge.
 for(let s=0;s<len;s+=1.5){
  const end=Math.min(len,s+1.5);
  g.quad(at(s,inner+.10,rise(s)),at(end,inner+.10,rise(end)),at(end,outer-.16,rise(end)),at(s,outer-.16,rise(s)),[.66,.65,.59],1);
 }
 for(const edge of [inner,outer]){
  const outside=edge===outer,start=outside?0:1.8,stop=outside?len:len-1.8,half=outside?.16:.10,top=outside?.34:.22;
  for(let s=start;s<stop;s+=1.5){
   const end=Math.min(stop,s+1.5);
   g.quad(at(s,edge-half,.02),at(end,edge-half,.02),at(end,edge-half,top),at(s,edge-half,top),stone,1);
   g.quad(at(end,edge+half,.02),at(s,edge+half,.02),at(s,edge+half,top),at(end,edge+half,top),stone,1);
   g.quad(at(s,edge-half,top),at(end,edge-half,top),at(end,edge+half,top),at(s,edge+half,top),white,1);
   g.beam(at(s,edge,1.03),at(end,edge,1.03),.035,white,2,6);
   if(!outside)g.beam(at(s,edge,.55),at(end,edge,.55),.022,white,2,5);
  }
  if(!outside){
   for(let s=start;s<=stop;s+=1.6)g.beam(at(s,edge,.22),at(s,edge,1.06),.032,white,2,5);
   continue;
  }
  for(let s=.1;s<len;s+=3.2)g.beam(at(s,edge,.33),at(s,edge,1.1),.16,stone,1,4);
  for(let s=.8;s<len-.7;s+=1.55)for(let k=0;k<16;k++){
   const t=k*Math.PI/8,t1=(k+1)*Math.PI/8;
   g.beam(at(s+Math.cos(t)*.63,edge,.66+Math.sin(t)*.32),
    at(s+Math.cos(t1)*.63,edge,.66+Math.sin(t1)*.32),.026,white,2,5);
  }
 }
}
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
 // The mapped west edge faces the bridge landing and the open plaza.
 const p=e.pts,at=(u,v,y)=>footprintPoint(p,u,v,y),wall=[.58,.38,.26],wood=[.19,.18,.18],roof=[.16,.17,.17],slate=[.22,.23,.23];
 for(const [u0,v0,u1,v1] of [[0,0,1,0],[1,0,1,1],[1,1,0,1],[0,1,0,0]])
  g.quad(at(u0,v0,0),at(u1,v1,0),at(u1,v1,3.35),at(u0,v0,3.35),wall,1);
 for(const v of [0,1])g.tri(at(0,v,3.35),at(.5,v,6.1),at(1,v,3.35),wood,1);
 g.quad(at(-.055,-.045,3.35),at(.5,-.045,6.35),at(.5,1.045,6.35),at(-.055,1.045,3.35),roof,4);
 g.quad(at(.5,-.045,6.35),at(1.055,-.045,3.35),at(1.055,1.045,3.35),at(.5,1.045,6.35),slate,4);
 for(const v of [-.045,1.045])for(const u of [-.055,.5,1.055]){
  const y=u===.5?6.35:3.35;
  g.beam(at(u,v,y),at(u,v===-.045?1.045:-.045,y),.07,C.dark,2,4);
 }
 const front=(u,y)=>at(u,-.012,y);
 // Horizontal timber courses and a dark sign fascia follow the supplied cafe photos.
 for(let y=.28;y<3.3;y+=.3)g.beam(front(0,y),front(1,y),.035,[.7,.48,.32],2,4);
 g.quad(front(.04,2.9),front(.95,2.9),front(.95,3.25),front(.04,3.25),C.dark,1);
 // Service windows, an open-looking doorway and a modest bicycle sign.
 for(const [u0,u1] of [[.08,.34],[.66,.94]]){
  g.quad(front(u0,1.05),front(u1,1.05),front(u1,2.72),front(u0,2.72),C.glass,3);
  for(const u of [u0,u1])g.beam(front(u,1.05),front(u,2.72),.055,C.trim,2,4);
  g.beam(front(u0,2.72),front(u1,2.72),.07,C.trim,2,4);
  g.beam(front((u0+u1)/2,1.05),front((u0+u1)/2,2.72),.035,C.trim,2,4);
 }
 g.quad(front(.405,.08),front(.595,.08),front(.595,2.95),front(.405,2.95),wood,1);
 const door=(u,y)=>at(u,-.02,y);
 for(const [u0,u1] of [[.425,.49],[.51,.575]]){
  g.quad(door(u0,.85),door(u1,.85),door(u1,2.62),door(u0,2.62),C.glass,3);
  for(const u of [u0,u1])g.beam(door(u,.12),door(u,2.85),.055,C.trim,2,4);
  g.beam(door(u0,.85),door(u1,.85),.05,C.trim,2,4);
  g.beam(door(u0,2.62),door(u1,2.62),.05,C.trim,2,4);
 }
 for(const u of [.405,.5,.595])g.beam(door(u,.08),door(u,2.95),.065,C.trim,2,4);
 g.beam(door(.405,2.95),door(.595,2.95),.09,C.trim,2,4);
 for(const u of [.485,.515])g.beam(door(u,1.1),door(u,1.45),.025,C.gold,2,4);
 g.beam(front(.09,3.05),front(.36,3.05),.12,C.dark,2,4);
 for(const u of [.15,.28])for(let i=0;i<12;i++){
  const a=i*Math.PI/6,b=(i+1)*Math.PI/6;
  g.beam(front(u+Math.cos(a)*.047,2.58+Math.sin(a)*.20),front(u+Math.cos(b)*.047,2.58+Math.sin(b)*.20),.018,C.trim,2,4);
 }
 g.beam(front(.15,2.58),front(.215,2.77),.018,C.trim,2,4);
 g.beam(front(.215,2.77),front(.28,2.58),.018,C.trim,2,4);
 // Two staggered rows fit ten parked bicycles on the shorter plaza frontage.
 const bikeSlots=[[.10,-.075],[.23,-.075],[.77,-.075],[.90,-.075],
  [.10,-.15],[.23,-.15],[.36,-.15],[.64,-.15],[.77,-.15],[.90,-.15]];
 bikeSlots.forEach(([u,v],i)=>{
  const q=(du,y)=>at(u+du,v,y),frame=i%3===0?[.56,.16,.20]:i%3===1?[.20,.35,.45]:[.25,.28,.22];
  for(const wheel of [-.055,.055])for(let k=0;k<12;k++){
   const a=k*Math.PI/6,b=(k+1)*Math.PI/6;
   g.beam(q(wheel+Math.cos(a)*.032,.42+Math.sin(a)*.34),q(wheel+Math.cos(b)*.032,.42+Math.sin(b)*.34),.018,C.dark,2,4);
  }
  g.beam(q(-.055,.42),q(-.018,.83),.026,frame,2,4);
  g.beam(q(-.018,.83),q(.012,.42),.026,frame,2,4);
  g.beam(q(.012,.42),q(-.055,.42),.026,frame,2,4);
  g.beam(q(-.018,.83),q(.055,.42),.025,frame,2,4);
  g.beam(q(.055,.42),q(.038,.87),.026,frame,2,4);
  g.beam(q(-.038,.87),q(.004,.87),.035,C.dark,2,4);
  g.beam(q(.025,.89),q(.065,.89),.033,C.dark,2,4);
 });
}
function tutCoffee(g,e){
 // The short west gable faces the bridge descent; the long timber wall faces the park.
 const at=(u,v,y)=>footprintPoint(e.pts,u,v,y);
 const cream=[.78,.78,.72],timber=[.23,.17,.14],roof=[.13,.14,.14],glass=[.11,.18,.20];
 const walls=[[0,0,1,0,cream],[1,0,1,1,timber],[1,1,0,1,timber],[0,1,0,0,timber]];
 for(const [u0,v0,u1,v1,color] of walls)
  g.quad(at(u0,v0,0),at(u1,v1,0),at(u1,v1,3.2),at(u0,v0,3.2),color,1);
 for(const v of [0,1])g.tri(at(0,v,3.2),at(.5,v,4.85),at(1,v,3.2),v===0?cream:timber,1);
 g.quad(at(-.07,-.035,3.18),at(.5,-.035,5),at(.5,1.035,5),at(-.07,1.035,3.18),roof,4);
 g.quad(at(.5,-.035,5),at(1.07,-.035,3.18),at(1.07,1.035,3.18),at(.5,1.035,5),[.18,.18,.17],4);
 for(let y=.3;y<3.2;y+=.32)
  for(const u of [-.012,1.012])g.beam(at(u,0,y),at(u,1,y),.025,[.34,.25,.20],2,4);
 const front=(u,y)=>at(u,-.022,y),pane=(u,y)=>at(u,-.03,y);
 g.quad(front(.29,.1),front(.71,.1),front(.71,2.72),front(.29,2.72),[.12,.12,.12],1);
 for(const [u0,u1] of [[.32,.49],[.51,.68]]){
  g.quad(pane(u0,.65),pane(u1,.65),pane(u1,2.55),pane(u0,2.55),glass,3);
  for(const u of [u0,u1])g.beam(pane(u,.12),pane(u,2.68),.045,[.55,.57,.55],2,4);
  g.beam(pane(u0,2.55),pane(u1,2.55),.05,[.55,.57,.55],2,4);
 }
 g.beam(pane(.29,2.72),pane(.71,2.72),.07,[.62,.63,.61],2,4);
 for(const u of [.485,.515])g.beam(pane(u,1.15),pane(u,1.45),.022,[.76,.72,.58],2,4);
 // Block lettering keeps the photographed "ТУТ" sign readable without a texture.
 const sign=(u,y)=>at(u,-.028,y),ink=[.08,.10,.10];
 for(const c of [.34,.66]){
  g.beam(sign(c-.075,4.03),sign(c+.075,4.03),.055,ink,2,4);
  g.beam(sign(c,4.03),sign(c,3.52),.055,ink,2,4);
 }
 g.beam(sign(.44,4.03),sign(.50,3.69),.052,ink,2,4);
 g.beam(sign(.56,4.03),sign(.50,3.69),.052,ink,2,4);
 g.beam(sign(.50,3.69),sign(.48,3.51),.052,ink,2,4);
 // A service window and horizontal boards distinguish the long park-side wall.
 const side=(v,y)=>at(1.018,v,y);
 g.quad(side(.47,1.03),side(.84,1.03),side(.84,2.57),side(.47,2.57),glass,3);
 for(const v of [.47,.84])g.beam(side(v,1.03),side(v,2.57),.065,[.52,.45,.37],2,4);
 g.beam(side(.47,2.57),side(.84,2.57),.07,[.52,.45,.37],2,4);
 g.box(...at(-.13,.14,.02),.62,2.25,.78,[.23,.38,.48],1);
}
function bridgeLanding(g){
 const a=bridgeLandingAxis[0],b=bridgeLandingAxis[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
 const at=(s,l,y)=>{const x=a[0]+dx*s+dz*l,z=a[1]+dz*s-dx*l;return [x,y+terrainHeight(x,z),z];};
 const half=s=>3.2+.12*s,hash=(s,t,side)=>{const n=Math.sin(s*78.233+t*19.19+side*31.71)*43758.5453;return n-Math.floor(n);};
 // The bars cross only the two pedestrian shoulders, leaving the centre lane open.
 for(const side of [-1,1])for(let s=0;s<25;s+=2){
  const e=Math.min(s+2,25);
  g.quad(at(s,side*half(s),.025),at(e,side*half(e),.025),
   at(e,side*(half(e)+4.05),.025),at(s,side*(half(s)+4.05),.025),[.34,.34,.33],1);
 }
 for(const side of [-1,1])for(let s=1.3;s<25;s+=1.65){
  const inner=side*(half(s)+.12),outer=side*(half(s)+4.05);
  g.quad(at(s,inner,.055),at(s+.68,inner,.055),at(s+.68,outer,.055),at(s,outer,.055),[.84,.84,.81],1);
 }
 for(const side of [-1,1]){
  const inner=s=>half(s)+4.45,outer=s=>half(s)+(side>0?13-.08*s:12-.05*s);
  const soil=side>0?[.35,.32,.27]:[.31,.31,.24];
  for(let s=1.5;s<23.5;s+=2){
   const e=Math.min(s+2,23.5);
   g.quad(at(s,side*inner(s),.22),at(e,side*inner(e),.22),
    at(e,side*outer(e),.7),at(s,side*outer(s),.7),soil,1);
   g.quad(at(s,side*inner(s),0),at(e,side*inner(e),0),
    at(e,side*inner(e),.22),at(s,side*inner(s),.22),[.48,.46,.40],1);
   g.quad(at(e,side*outer(e),0),at(s,side*outer(s),0),
    at(s,side*outer(s),.7),at(e,side*outer(e),.7),[.44,.43,.38],1);
  }
  for(let s=1.5;s<23.5;s+=.8){
   const e=Math.min(s+.8,23.5),in0=side*inner(s),in1=side*inner(e),out0=side*outer(s),out1=side*outer(e);
   g.beam(at(s,in0,.20),at(e,in1,.20),.16,[.51,.49,.43],2,5);
   g.beam(at(s,out0,.52),at(e,out1,.52),.17,[.48,.46,.40],2,5);
   g.beam(at(s,side*(inner(s)+.55),.42),at(e,side*(inner(e)+.55),.42),.19,[.16,.31,.13],2,5);
  }
  for(let s=3;s<22;s+=1.25)for(let t=.18;t<.95;t+=.19){
   const l=inner(s)+(outer(s)-inner(s))*t,q=at(s,side*l,.22+.48*t),h=hash(s,t,side);
   if(h<.38){
    const stone=side>0?[.52,.49,.45]:[.50,.48,.42];
    g.box(q[0],q[1],q[2],.35+h*.65,.14+h*.24,.38+h*.45,stone,1);
   }else if(h<.59){
    g.box(q[0],q[1],q[2],.48,.56,.52,side>0?[.38,.48,.35]:[.25,.42,.20],1);
   }else{
    g.beam(q,at(s,side*l,q[1]+.5),.025,[.22,.38,.17],2,4);
    g.box(q[0],q[1]+.42,q[2],.36,.20,.36,
     side>0?(h>.78?[.82,.81,.75]:[.67,.41,.47]):(h>.78?[.87,.58,.16]:[.76,.73,.20]),1);
   }
  }
  for(const s of [5,10,16,21]){
   const q=at(s,side*(outer(s)-1.7),.62),t=hash(s,1,side);
   g.box(q[0],q[1],q[2],1.4+t*.6,1.0+t*.7,1.4+t*.6,[.20+t*.08,.34+t*.10,.17],1);
  }
  if(side<0){
   for(let i=0;i<8;i++){
    const s=8+i*.65,q=at(s,side*(outer(s)-2.8+(i%3)*.42),.55);
    g.box(q[0],q[1],q[2],.65+(i%2)*.25,.42+(i%4)*.18,.6,[.55,.53,.48],1);
   }
  }else{
   const c=at(10,inner(10)+3.5,.48);
   for(let i=0;i<9;i++){
    const theta=i*2*Math.PI/9,tip=[c[0]+Math.cos(theta)*1.35,1.12,c[2]+Math.sin(theta)*1.35];
    g.beam(c,tip,.12,[.33,.47,.42],2,5);
   }
  }
 }
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
 const g=new Geometry();({building,bikeCafe,tutCoffee,bridgeLanding,plazaStage,bumper,carousel,coaster,spinner,train,swingTower,pendulum,forest,bridgeRails,ticketOffice:TicketOffice.build,transylvania:Transylvania.build,upsideDownHouse:UpsideDownHouse.build,policePost:HouseSurroundings.cabin,shoreTicket:HouseSurroundings.cabin,shoreMooring:HouseSurroundings.mooring,veranda:Veranda.main,verandaGazebo:Veranda.gazebo,carCarousel:CentralAlley.carCarousel,toyCarousel:CentralAlley.toyCarousel,weddingCarousel:CentralAlley.weddingCarousel,kiddieCarousel:CentralAlley.kiddieCarousel,airTrack:CentralAlley.airTrack,serviceKiosk:CentralAlley.serviceKiosk,centralWest:CentralAlley.westGarden,mainAvenue:CentralAlley.mainGarden,alleyCafe:CentralAlley.cafe,arcade:CentralAlley.arcade,rideBooth:CentralAlley.booth,centralAlley:CentralAlley.avenue}[e.kind])(g,e);
 if(e.kind==='upsideDownHouse')HouseSurroundings.stairs(g,e);
 const data=new Float32Array(g.data);let radius=0;
 for(let i=0;i<data.length;i+=10)radius=Math.max(radius,Math.hypot(data[i]-e.cx,data[i+1]-5,data[i+2]-e.cz));
 return {data,n:data.length/10,center:[e.cx,5,e.cz],radius};
}
const api={Geometry,entries,forestEntries,bridgeEntries,bridgeFrame,bridgeSpec,bridgeWalkRise,applyBridgeGround,build,buildingIds,rideIds,landingZone,terrainHeight,terrainSpec,verandaClearsTree:Veranda.clearsTree,centralClearsTree:CentralAlley.clearsTree,centralTrees:CentralAlley.trees};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkMeshes=api;
})(typeof window!=='undefined'?window:globalThis);
