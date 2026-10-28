// The next panorama station: shuttered stalls, Picnic frontage and tennis access.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const S=typeof module!=='undefined'&&module.exports?require('./park-safari-avenue.js'):root.ParkSafariAvenue;
const C={white:[.87,.86,.79],dark:[.11,.14,.13],wood:[.45,.28,.17],steel:[.40,.44,.40],blue:[.14,.34,.48],green:[.24,.41,.31]};
const axis=[[63.15,-172],[64.5,-165],[67,-152],[72.3,-128],[77,-107]];
const access=[[59,-169.5],[52,-168.2],[47,-156.4],[41.46,-155.3],[38.7,-154.8]];
const croissant={x:76.5,z:-174.5,w:3.25,d:2.55},icecream={x:78.3,z:-162.7,w:3.55,d:2.75};
const iceCone=[icecream.x-icecream.d/2+.10,icecream.z-2.13];
const forecourt=[[66.8,-185.5],[81.8,-186],[84,-158],[70,-154.9],[66.8,-164.3]];
const benches=[[70,-177.7,-Math.PI/2],[71.2,-171.5,-Math.PI/2],[72.4,-157.8,-Math.PI/2],[57.4,-172.5,Math.PI/2],[65.5,-134.4,Math.PI/2]];
const bins=benches.map(([x,z])=>[x+.12,z+1.47]);
const islands=[[71.5,-177.2,1.02],[74.4,-158.5,1.12]];
const trees=[[55.1,-173.5,20,5.7],[56.8,-155.3,21,5.9],[71.5,-177.2,19,5.5],[74.4,-158.5,20,5.8],[81,-136,18,5.2],[62,-123,18,5.2]];
const sign=[56.3,-171],notice=[74.7,-152.3],lamps=[[55.7,-181,Math.PI/2],[77.5,-135,-Math.PI/2]];
const signYaw=2.35;
const court={origin:[-.72,-161.39],along:[.17927,.9838],across:[.9838,-.17927],centers:[10.1,30.0],net:18};
function courtWorld(u,v){return [court.origin[0]+court.across[0]*u+court.along[0]*v,court.origin[1]+court.across[1]*u+court.along[1]*v];}
function courtLocal(x,z){const dx=x-court.origin[0],dz=z-court.origin[1];return [dx*court.across[0]+dz*court.across[1],dx*court.along[0]+dz*court.along[1]];}
function entries(){return [{id:'picnic-kiosks',kind:'picnicKiosks',cx:77.4,cz:-169,pts:[[74,-179],[81,-179],[81,-159],[74,-159]]},
 {id:'picnic-avenue',kind:'picnicAvenue',cx:63,cz:-151,pts:[[1,-188],[87,-188],[87,-105],[1,-105]]}];}
function frame(g,x=0,z=0,a=0){const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const q=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];
  for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];q(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}q([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function oval(u,y,v,rx,ry,rz,col,mat=7){const p=(i,j)=>{const a=i*Math.PI/5,b=-Math.PI/2+j*Math.PI/5;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<5;j++)for(let i=0;i<10;i++)q(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 function cone(u,y,v,r,h,top,col,mat=7,n=10){for(let i=0;i<n;i++){const a=i*Math.PI*2/n,b=(i+1)*Math.PI*2/n,p=(a,r,y)=>[u+Math.cos(a)*r,y,v+Math.sin(a)*r];q(p(a,r,y),p(b,r,y),p(b,top,y+h),p(a,top,y+h),col,mat);}}
 return {at,q,box,oval,cone,tri:(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat),beam:(a,b,r,col=C.steel,mat=2,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n)};
}
function shifted(t,u){return {beam:(a,b,...args)=>t.beam([a[0]+u,a[1],a[2]],[b[0]+u,b[1],b[2]],...args)};}
function kiosks(g){
 const c=frame(g,croissant.x,croissant.z,Math.PI/2),v=croissant.d/2;
 c.box(0,.03,0,croissant.w,2.55,croissant.d,[.43,.52,.49],12);
 c.box(0,2.58,0,3.50,.18,2.80,[.31,.39,.36],14);
 c.box(0,.22,v+.03,2.72,1.84,.055,[.32,.42,.39],14);
 for(const u of [-1.47,1.47]){c.box(u,.08,v+.08,.19,2.35,.13,[.52,.60,.56],12);c.box(u,.08,v+.15,.31,.10,.25,[.47,.52,.46],1);}
 c.box(0,2.11,v+.075,2.83,.29,.07,[.36,.18,.12]);S.label(c,'КРУАССАНЫ • ХОТ-ДОГ',2.18,v+.115,2.66,.14,[.86,.82,.67]);
 for(const y of [.35,.55,.75,.95,1.15,1.35,1.55,1.75,1.95])c.box(0,y,v+.07,2.64,.012,.013,[.28,.36,.34],2);
 const s=frame(g,icecream.x,icecream.z,Math.PI/2),face=icecream.d/2;
 s.box(0,.03,0,icecream.w,2.56,icecream.d,C.dark,12);s.box(0,2.60,0,3.85,.13,3.05,[.19,.19,.18],14);
 s.box(0,2.29,face+.09,3.76,.44,.10,[.18,.19,.18]);
 S.label(shifted(s,-1.19),'ART ICE',2.42,face+.15,1.17,.18,[.13,.31,.51]);S.label(shifted(s,.61),'МОРОЖЕНОЕ',2.42,face+.15,2.27,.19,C.white);
 s.box(0,.80,face+.03,3.20,1.36,.045,[.18,.26,.24],3);
 for(const u of [-1.55,-.52,.52,1.55])s.box(u,.78,face+.08,.065,1.40,.06,[.26,.29,.24],2);
 for(let i=0;i<3;i++){const u=-1.03+i*1.03;s.box(u,.98,face+.075,.89,1.07,.02,[.62,.69,.59]);
  s.box(u,1.94,face+.10,.89,.11,.015,[.38,.56,.63]);for(let j=0;j<5;j++)s.box(u,1.08+j*.16,face+.10,.64-(j%2)*.13,.025,.02,[.31,.43,.38]);}
 // Three coloured scoops on a cone are the visible freestanding ice-cream marker.
 s.cone(-2.13,.14,face-.10,.06,.77,.25,[.70,.44,.23],7,12);
 for(const [y,col] of [[.97,[.69,.30,.28]],[1.29,[.76,.66,.36]],[1.60,[.39,.61,.55]]])s.oval(-2.13,y,face-.10,.28,.24,.27,col,10);
}
function backdrop(g,e){const t=frame(g),p=e.pts;
 // The panorama exposes a low stone enclosure behind the stalls, under dense trees.
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],h=i>=5?1.32:1.95;t.q([a[0],.02,a[1]],[b[0],.02,b[1]],[b[0],h,b[1]],[a[0],h,a[1]],[.46,.45,.37],1);t.beam([a[0],h+.03,a[1]],[b[0],h+.03,b[1]],.055,[.57,.55,.46],1,4);}
 const a=p[0],b=p[1],f=frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));
 f.box(4.5,.03,.04,2.45,1.91,.07,[.20,.28,.21],12);
 for(const u of [3.28,4.50,5.72])f.box(u,.03,.085,.055,1.93,.045,[.34,.40,.31],2);
 f.box(7.2,.58,.04,1.45,1.20,.045,[.78,.76,.63]);f.box(7.2,1.59,.075,1.45,.16,.02,[.52,.27,.20]);
}
function bench(g,[x,z,a]){const b=frame(g,x,z,a);
 for(let i=0;i<5;i++)b.box(0,.43,-.24+i*.115,2.10,.065,.095,C.wood,12);
 for(let i=0;i<5;i++)b.box(0,.62+i*.105,.29+(i*.018),2.12,.079,.055,C.wood,12);
 for(const side of [-1,1]){const u=side*.80;b.beam([u,.045,-.22],[u,.45,-.17],.030,C.dark);b.beam([u,.045,.32],[u,1.07,.40],.030,C.dark);
  b.beam([u,.71,-.22],[u,.77,.20],.027,C.dark);b.beam([u,.045,-.22],[u,.045,-.32],.030,C.dark);b.beam([u,.045,.32],[u,.045,.42],.030,C.dark);}
}
function bin(g,[x,z]){const t=frame(g,x,z);t.cone(0,.04,0,.20,.71,.22,[.25,.23,.19],2,12);t.cone(0,.75,0,.235,.055,.235,C.dark,2,12);
 for(let i=0;i<12;i++){const a=i*Math.PI/6,b=(i+1)*Math.PI/6;t.tri([0,.757,0],[Math.cos(a)*.20,.757,Math.sin(a)*.20],[Math.cos(b)*.20,.757,Math.sin(b)*.20],[.06,.07,.06]);}
}
function paint(t,a,b,width,col=C.white){const dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),nx=-dz/len*width/2,nz=dx/len*width/2;
 t.q([a[0]+nx,.036,a[1]+nz],[a[0]-nx,.036,a[1]-nz],[b[0]-nx,.036,b[1]-nz],[b[0]+nx,.036,b[1]+nz],col,7);
}
function courts(g){const t=frame(g,...court.origin,Math.atan2(court.across[1],court.across[0]));
 // Only the near pair visible in the panorama is given lines and nets.
 for(const u of court.centers){
  t.q([u-9,.014,1],[u-9,.014,35],[u+9,.014,35],[u+9,.014,1],[.43,.28,.23]);
  t.q([u-5.485,.025,6.115],[u-5.485,.025,29.885],[u+5.485,.025,29.885],[u+5.485,.025,6.115],C.green);
  for(const v of [6.115,11.60,24.40,29.885])paint(t,[u-5.485,v],[u+5.485,v],.048);
  for(const x of [u-5.485,u-4.115,u+4.115,u+5.485])paint(t,[x,6.115],[x,29.885],.048);
  paint(t,[u,11.6],[u,24.4],.045);
  for(const x of [u-6.12,u+6.12])t.beam([x,.04,18],[x,1.05,18],.035,[.40,.45,.40],2,8);
  t.beam([u-6.12,.98,18],[u+6.12,.98,18],.023,C.white,17,6);
  for(let k=0;k<7;k++)t.beam([u-6,.10+k*.13,18],[u+6,.10+k*.13,18],.004,[.25,.30,.26],2,3);
  for(let k=0;k<=30;k++){const x=u-6+k*.4;t.beam([x,.10,18],[x,.96,18],.004,[.25,.30,.26],2,3);}
 }
 t.q([1,.28,.09],[39,.28,.09],[39,2.17,.09],[1,2.17,.09],[.24,.42,.51],17);
}
function avenue(g){const t=frame(g);
 for(const b of benches)bench(g,b);for(const p of bins)bin(g,p);
 for(const [x,z,r] of islands)for(let i=0;i<24;i++){const a=i*Math.PI/12,b=(i+1)*Math.PI/12;t.beam([x+Math.cos(a)*r,.055,z+Math.sin(a)*r],[x+Math.cos(b)*r,.055,z+Math.sin(b)*r],.055,[.59,.59,.51],1,4);}
 const p=frame(g,...sign,signYaw);p.beam([0,.03,0],[0,3.15,0],.052,[.57,.57,.46],1,8);
 const v=.075,arrow=[[-1.30,2.78],[-1.30,3.20],[.92,3.20],[1.30,2.99],[.92,2.78]];
 for(let i=1;i<arrow.length-1;i++)p.tri([arrow[0][0],arrow[0][1],v],[arrow[i][0],arrow[i][1],v],[arrow[i+1][0],arrow[i+1][1],v],[.70,.68,.52],12);
 const readable={beam:(a,b,...args)=>p.beam([-a[0],a[1],-a[2]],[-b[0],b[1],-b[2]],...args)};
 S.label(readable,'ТЕННИСНЫЕ КОРТЫ',2.88,v+.01,2.21,.15,[.35,.36,.27]);
 const n=frame(g,...notice,-Math.PI/2);for(const u of [-.58,.58])n.beam([u,.03,0],[u,1.70,0],.025,C.steel,2,5);
 n.box(0,1.03,0,1.43,.73,.065,[.63,.67,.57]);n.box(-.35,1.08,.04,.64,.58,.012,[.26,.48,.54]);n.box(.34,1.08,.04,.62,.58,.012,[.80,.80,.67]);
 for(const [x,z,a] of lamps){const f=frame(g,x,z,a);f.beam([0,.02,0],[0,6.65,0],.055,[.56,.59,.55],2,8);
  const arc=[[0,6.65,0],[.05,6.94,0],[.22,7.14,0],[.48,7.21,0],[.77,7.18,0]];for(let i=1;i<arc.length;i++)f.beam(arc[i-1],arc[i],.033,[.56,.59,.55],2,6);f.box(.82,7.10,0,.44,.11,.22,[.78,.78,.68],2);}
 api.courts(g);
}
function rect(x,z,p,w,d){return Math.abs(x-p[0])<w/2&&Math.abs(z-p[1])<d/2;}
function solid(x,z){
 if([croissant,icecream].some(s=>rect(x,z,[s.x,s.z],s.d+.14,s.w+.14)))return true;
 if(benches.some(p=>rect(x,z,p,.92,2.30))||bins.some(p=>Math.hypot(x-p[0],z-p[1])<.30))return true;
 if([sign,...lamps].some(p=>Math.hypot(x-p[0],z-p[1])<.30)||rect(x,z,notice,.30,1.5)||Math.hypot(x-iceCone[0],z-iceCone[1])<.34)return true;
 const [u,v]=courtLocal(x,z);return Math.abs(v-court.net)<.25&&court.centers.some(c=>Math.abs(u-c)<6.13);
}
function clearsTree(x,z){return x> -1&&x<90&&z> -188&&z< -104&&(J.distance(axis,x,z)<5.65||J.distance(access,x,z)<2.05||J.inside(forecourt,x,z)||J.inside(S.coveredArea,x,z)||benches.some(p=>Math.hypot(x-p[0],z-p[1])<1.5)||trees.some(p=>Math.hypot(x-p[0],z-p[1])<1.7));}
function applyGround(cats,park){
 for(let iz=Math.max(0,Math.floor((-188-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-104-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((37-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((88-park.x0)/park.mpp));ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,index=iz*park.w+ix,old=cats[index]&31;
  if(old===4||old===5)continue;
  const road=J.distance(axis,x,z),courtX=39.05+(z+168.54)*14.02/76.94;
  if(z>-172&&road<4.5&&!S.solid(x,z)&&old!==12)cats[index]=67;
  if(z>-174&&x>courtX+.6&&x<(64.5+(z+165)*.22)-4.6&&[1,2,8,11].includes(old)&&J.distance(access,x,z)>1.5)cats[index]=65;
  if(J.inside(forecourt,x,z)&&!S.solid(x,z))cats[index]=z>-181?67:66;
  if(benches.some(p=>rect(x,z,p,2.1,3.0))&&!S.solid(x,z))cats[index]=67;
  if(J.distance(access,x,z)<1.18&&!S.solid(x,z))cats[index]=66;
  if(islands.some(p=>Math.hypot(x-p[0],z-p[1])<p[2]-.10))cats[index]=65;
 }
}
function applyObstacles(cats,park){
 for(let iz=Math.max(0,Math.floor((-188-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-104-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((-2-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((88-park.x0)/park.mpp));ix++){
  const x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,index=iz*park.w+ix;
  if((solid(x,z)||S.solid(x,z))&&(cats[index]&31)!==4)cats[index]=77;
 }
}
const api={axis,access,croissant,icecream,iceCone,forecourt,benches,bins,islands,trees,sign,signYaw,notice,lamps,court,courtWorld,courtLocal,entries,kiosks,backdrop,avenue,courts,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkAvenuePicnic=api;
})(typeof window!=='undefined'?window:globalThis);
