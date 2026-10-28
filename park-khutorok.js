// Photo-led junction beyond Yesenin: Khutorok terrace, gate and planted corner.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const C={white:[.88,.88,.81],wood:[.46,.28,.16],dark:[.12,.15,.14],glass:[.19,.29,.29],roof:[.29,.30,.27],red:[.64,.14,.12],leaf:[.20,.36,.18]};
const approach=[[110,-246.6],[116,-248.8],[120.79,-251.66],[126.29,-254.42]];
const northDrive=[[120.79,-251.66],[98.51,-279.88]];
const frontDrive=[[126.29,-254.42],[129.7,-244.1]];
const cafeDrive=[[126.29,-254.42],[129.7,-244.1],[131.63,-238.3],[133.1,-225.5]];
const gardenWalk=[[126.29,-254.42],[125.6,-249.4],[124.4,-242.4],[118.1,-228.0]];
const northWalk=[[126.29,-254.42],[124.13,-259.92],[118.4,-286.1]];
const hedgeIsland=[[126.5,-246.8],[128.6,-242.8],[130.4,-237.3],[131.0,-230.5],[120.0,-227.3],[124.0,-239.0]];
const island=[[119.8,-247.3],[125.7,-246.9],[129.9,-234.7],[116.8,-232.0],[109.2,-237.6],[110.3,-240.7]];
const courtyard=[[125,-254.8],[143.5,-254.8],[146,-230],[134.5,-225.8],[129.6,-241]];
const gate={center:[118.2,-250.11],forward:[.8586,-.5127],right:[.5127,.8586],width:4.8,halfRoad:3.2,hingeSide:3.0};
const gateWorld=(forward,side)=>[gate.center[0]+gate.forward[0]*forward+gate.right[0]*side,gate.center[1]+gate.forward[1]*forward+gate.right[1]*side];
const hinge=gateWorld(0,gate.hingeSide),tip=gateWorld(0,gate.hingeSide-gate.width);
const bypass=[gateWorld(-4,-2.5),gateWorld(4,-2.5),[126.29,-254.42],[129.7,-244.1]];
const umbrellas=[[135.5,-247.3,2.25],[137.4,-241.9,2.25],[136.8,-236.5,2.25],[141.2,-247.4,2],[142.4,-235.8,2]];
const tables=umbrellas.flatMap(([x,z],i)=>i<3?[[x,z-1.05],[x,z+1.05]]:[[x,z]]);
const hedge=[[129.1,-238.0],[128.1,-241.0],[127.2,-243.8],[126.5,-245.2],[125.9,-243.2],[125.3,-241.0],[124.2,-238.0],[123.0,-235.3]];
const benches=[[124.8,-267,-1.786],[121.6,-280,-1.786]];
const conifers=[[111.13,-253.17],[111.5,-256.7],[109.3,-259.5]];
const pots=[[131.2,-250.7],[131.9,-243.8],[134.3,-231.4]];
const trays=[[132.54,-247.0],[133.96,-234.5]];
const lamps=[[123.6,-246.4],[111.5,-258.3],[135.5,-225.3],[125.4,-260.6]],bin=[123.1,-246.0];
const rail=[[111.7,-254.3],[115.4,-256.0]];
const parking=[{at:gateWorld(-1.8,-4.8),heading:.90,length:4.1,height:1.43,color:[.50,.54,.55]},
 {at:[105.84,-275.59],heading:-.668,length:4.35,height:1.86,color:[.67,.12,.12]}];
const trees=[[111,-239.5,19,5.3],[123.4,-232.4,18,5.4],[139.9,-224.2,18,5.2],[131.8,-251.8,20,5.5]];
function frame(g,x=0,z=0,a=0){const c=Math.cos(a),s=Math.sin(a),at=(u,y,v)=>[x+c*u-s*v,y,z+s*u+c*v];
 const quad=(a,b,c,d,col,mat=7)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat);
 function box(u,y,v,w,h,d,col,mat=7){const p=[[u-w/2,y,v-d/2],[u+w/2,y,v-d/2],[u+w/2,y,v+d/2],[u-w/2,y,v+d/2]];for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];quad(a,b,[b[0],y+h,b[2]],[a[0],y+h,a[2]],col,mat);}quad([u-w/2,y+h,v-d/2],[u-w/2,y+h,v+d/2],[u+w/2,y+h,v+d/2],[u+w/2,y+h,v-d/2],col,mat);}
 function oval(u,y,v,rx,ry,rz,col,mat=16){const p=(i,j)=>{const a=i*Math.PI/4,b=-Math.PI/2+j*Math.PI/4;return [u+Math.cos(a)*Math.cos(b)*rx,y+Math.sin(b)*ry,v+Math.sin(a)*Math.cos(b)*rz];};for(let j=0;j<4;j++)for(let i=0;i<8;i++)quad(p(i,j),p(i+1,j),p(i+1,j+1),p(i,j+1),col,mat);}
 return {at,quad,box,oval,tri:(a,b,c,col,mat=7)=>g.tri(at(...a),at(...b),at(...c),col,mat),beam:(a,b,r,col,mat=2,n=6)=>g.beam(at(...a),at(...b),r,col,mat,n)};
}
function entries(){return [{id:'khutorok-junction',kind:'khutorokJunction',cx:122,cz:-250,pts:[[99,-289],[159,-289],[159,-223],[99,-223]]}];}
function building(g,e){const p=e.pts,at=(u,y,v)=>[(1-u)*(1-v)*p[0][0]+u*(1-v)*p[1][0]+u*v*p[2][0]+(1-u)*v*p[3][0],y,(1-u)*(1-v)*p[0][1]+u*(1-v)*p[1][1]+u*v*p[2][1]+(1-u)*v*p[3][1]];
 const q=(a,b,c,d,col,mat=1)=>g.quad(at(...a),at(...b),at(...c),at(...d),col,mat),beam=(a,b,r,col,mat=12)=>g.beam(at(...a),at(...b),r,col,mat,4);
 for(const [a,b] of [[[0,0,0],[1,0,0]],[[1,0,0],[1,0,1]],[[1,0,1],[0,0,1]],[[0,0,1],[0,0,0]]])q(a,b,[b[0],2.92,b[2]],[a[0],2.92,a[2]],C.wood,12);
 q([0,.04,0],[1,.04,0],[1,.27,0],[0,.27,0],[.68,.66,.55]);
 // The west-facing conservatory has repeated white frames and a recessed entrance.
 for(let i=0;i<9;i++){const a=.035+i*.105,b=a+.088;q([a,.40,-.006],[b,.40,-.006],[b,2.65,-.006],[a,2.65,-.006],C.glass,3);
  for(const u of [a,b])beam([u,.28,-.012],[u,2.80,-.012],.035,C.white);beam([a,1.35,-.014],[b,1.35,-.014],.022,C.white);
 }
 for(const y of [.28,2.79])beam([0,y,-.012],[1,y,-.012],.06,C.white);
 for(const u of [0,1]){q([u,.50,.08],[u,.50,.88],[u,2.55,.88],[u,2.55,.08],C.glass,3);for(const v of [.08,.35,.61,.88])beam([u,.40,v],[u,2.70,v],.04,C.white);}
 const a=[-.02,3.00,-.035],b=[1.02,3.00,-.035],c=[1.02,3.00,1.035],d=[-.02,3.00,1.035],r0=[.16,4.55,.5],r1=[.84,4.55,.5];
 q(a,b,r1,r0,C.roof,14);q(c,d,r0,r1,[.25,.28,.25],14);g.tri(at(...b),at(...c),at(...r1),C.roof,14);g.tri(at(...d),at(...a),at(...r0),C.roof,14);
 for(const [start,end] of [[a,b],[b,c],[c,d],[d,a],[r0,r1]])beam(start,end,.065,[.42,.40,.32]);
}
function umbrella(g,x,z,r){const t=frame(g,x,z),top=3.18,edge=2.42,p=[[-r,edge,-r],[r,edge,-r],[r,edge,r],[-r,edge,r]];
 t.beam([0,.07,0],[0,top,0],.036,[.68,.68,.59],2,6);
 for(let i=0;i<4;i++){const a=p[i],b=p[(i+1)%4];t.tri([0,top,0],a,b,i%2?C.white:[.81,.82,.75],17);t.quad(a,b,[b[0],edge-.14,b[2]],[a[0],edge-.14,a[2]],C.white,17);t.beam([0,top-.04,0],[a[0],edge-.04,a[2]],.012,[.55,.55,.47],2,4);}
}
function chair(g,x,z,a,red){const t=frame(g,x,z,a),steel=red?[.46,.17,.13]:C.dark,wood=[.31,.25,.18];
 for(const u of [-.17,.17])for(const v of [-.17,.17])t.box(u,.025,v,.027,v>0?.88:.43,.027,steel,2);
 for(let i=0;i<3;i++){t.box(0,.44,(i-1)*.125,.44,.038,.108,wood,12);t.box(0,.62+i*.105,.20,.44,.075,.027,wood,12);}
}
function table(g,x,z,i){const t=frame(g,x,z);t.box(0,.75,0,.98,.065,.66,C.wood,12);
 for(const u of [-.36,.36])for(const v of [-.23,.23])t.box(u,.04,v,.033,.71,.033,i%2?C.red:C.dark,2);
 chair(g,x-.84,z,Math.PI/2,i%2);chair(g,x+.84,z,-Math.PI/2,!(i%2));chair(g,x,z-.73,Math.PI,i%2);chair(g,x,z+.73,0,!(i%2));
}
function bulb(t,x,y,z){const r=.035,top=[x,y+r,z],bottom=[x,y-r,z],ring=[[x-r,y,z],[x,y,z+r],[x+r,y,z],[x,y,z-r]];
 for(let i=0;i<4;i++){t.tri(top,ring[i],ring[(i+1)%4],[.92,.86,.65]);t.tri(bottom,ring[(i+1)%4],ring[i],[.92,.86,.65]);}
}
function fence(g,a,b,gateGap=false,planted=false){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]));
 for(const [start,end] of gateGap?[[0,6.7],[9.1,len]]:[[0,len]]){const parts=Math.ceil((end-start)/1.8);
  for(let i=0;i<=parts;i++){const u=start+i*(end-start)/parts;t.box(u,.04,0,.12,.96,.14,C.white,1);t.box(u,1.0,0,.18,.055,.20,C.white,1);}
  for(let i=0;i<parts;i++){const a=start+i*(end-start)/parts,b=start+(i+1)*(end-start)/parts,mid=(a+b)/2;
   t.box(mid,.03,0,b-a-.03,planted?.41:.25,planted?.43:.18,C.white,1);
   for(const y of [.58,.90])t.box(mid,y,0,b-a,.06,.05,C.wood,12);
   if(planted){t.box(mid,.44,0,b-a-.08,.035,.47,C.white,1);t.box(mid,.477,0,b-a-.19,.008,.32,[.20,.23,.12]);
    for(let k=0;k<5;k++)for(let j=-1;j<=1;j++){const u=a+.15+(b-a-.30)*k/4,h=.16+.10*(.5+.5*Math.sin(k*7+i*3+j));t.tri([u,.49,0],[u+.018,.56,.04*j],[u+.10*j,.49+h,.19*j],[.30,.43,.18],16);t.tri([u,.49,0],[u+.10*j,.49+h,.19*j],[u-.018,.56,.04*j],[.39,.48,.22],16);}
   }else for(const f of [.30,.70])t.box(a+(b-a)*f,.32,0,.035,.55,.035,C.dark,2);
  }
 }
}
function terrace(g,e){
 for(const p of umbrellas)umbrella(g,...p);tables.forEach(([x,z],i)=>table(g,x,z,i));
 fence(g,[132.2,-250],[134.2,-232.4],true,true);fence(g,[132.2,-250],[143.5,-251.2]);fence(g,[134.2,-232.4],[144.5,-233.4]);
 for(const [x,z] of pots){const t=frame(g,x,z);t.box(0,.04,0,.45,.48,.45,[.56,.29,.17],12);t.oval(0,.83,0,.40,.35,.40,C.leaf);t.oval(.08,1.03,.08,.12,.08,.12,[.80,.67,.35],7);}
 // Festoon bulbs belong over the terrace; the higher road cables are bare.
 const t=frame(g),a=[132.2,3.50,-250],b=[144.5,3.50,-233.4];let last;
 for(const p of [a,b])t.beam([p[0],1.03,p[2]],p,.018,C.dark,2,4);
 for(let i=0;i<=20;i++){const f=i/20,p=[a[0]+(b[0]-a[0])*f,3.50-.25*Math.sin(Math.PI*f),a[2]+(b[2]-a[2])*f];if(last)t.beam(last,p,.008,C.dark,2,4);if(i>0&&i<20)bulb(t,p[0],p[1]-.045,p[2]);last=p;}
}
function clippedHedge(g){const profile=[[-.55,.03],[.55,.03],[.55,.78],[.40,1.04],[-.40,1.04],[-.55,.78]];
 for(let i=1;i<hedge.length;i++){const a=hedge[i-1],b=hedge[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=frame(g,a[0],a[1],Math.atan2(b[1]-a[1],b[0]-a[0]));
  for(let j=0;j<profile.length;j++){const a=profile[j],b=profile[(j+1)%profile.length];t.quad([0,a[1],a[0]],[len,a[1],a[0]],[len,b[1],b[0]],[0,b[1],b[0]],C.leaf,16);}
  for(const u of [0,len])for(let j=1;j<profile.length-1;j++)t.tri([u,profile[0][1],profile[0][0]],[u,profile[j][1],profile[j][0]],[u,profile[j+1][1],profile[j+1][0]],C.leaf,16);
 }
}
function bench(g,x,z,a){const t=frame(g,x,z,a);for(const u of [-.73,.73])for(const v of [-.16,.16])t.box(u,.035,v,.05,.40,.05,C.dark,2);
 for(let i=0;i<4;i++)t.box(0,.44,(i-1.5)*.105,1.90,.055,.085,C.wood,12);
 for(const u of [-.73,.73])t.box(u,.47,.235,.045,.46,.045,C.dark,2);for(let i=0;i<3;i++)t.box(0,.64+i*.11,.235,1.90,.075,.045,C.wood,12);
}
function car(g,p){const t=frame(g,...p.at,p.heading),h=p.height,l=p.length,col=p.color;
 t.box(0,.28,0,1.80,.50,l,col,2);t.box(0,.78,.18,1.56,h-.78,l*.53,col,2);
 t.box(0,h-.09,.18,1.64,.10,l*.57,col,2);
 t.box(0,.89,-l*.267,1.37,h-.97,.025,C.glass,3);t.box(0,.89,l*.302,1.37,h-1.0,.025,C.glass,3);
 for(const side of [-1,1])for(let i=0;i<2;i++)t.box(side*.792,.89,-l*.14+i*l*.24,.025,h-1.0,l*.205,C.glass,3);
 for(const side of [-1,1])for(const v of [-l*.30,l*.30]){t.oval(side*.85,.29,v,.14,.28,.28,C.dark,2);t.oval(side*.995,.29,v,.018,.14,.14,[.55,.56,.51],2);}
 for(const u of [-.60,.60]){t.box(u,.51,-l/2-.012,.29,.16,.035,[.79,.81,.69],7);t.box(u,.51,l/2+.012,.26,.13,.035,C.red,7);}
 t.box(0,.30,-l/2-.03,1.60,.10,.07,[.23,.27,.25],2);
}
function junction(g){const t=frame(g),a=Math.atan2(tip[1]-hinge[1],tip[0]-hinge[0]),door=frame(g,...hinge,a),w=gate.width;
 door.box(0,.02,0,.15,1.23,.15,C.red,2);for(const y of [.22,1.08])door.beam([0,y,0],[w,y,0],.025,C.red,2,4);
 for(let i=0;i<=7;i++){const u=i*w/7;door.beam([u,.22,0],[u,1.08,0],.023,C.red,2,4);if(i>0&&i<5){const left=(i-1)*w/7,right=i*w/7;door.beam([left,i%2?.22:1.08,0],[right,i%2?1.08:.22,0],.020,C.red,2,4);}}
 for(const v of [-.10,.10]){door.oval(w-.18,.105,v,.075,.105,.035,C.dark,2);door.beam([w-.18,.20,v],[w-.18,.22,0],.017,C.dark,2,4);}
 clippedHedge(g);for(const p of benches)bench(g,...p);
 for(const [x,z] of conifers){t.oval(x,1.02,z,.57,1.02,.57,[.12,.25,.15]);t.oval(x,1.76,z,.40,.48,.40,[.15,.28,.16]);}
 for(const [x,z] of lamps){t.beam([x,.03,z],[x,6.15,z],.052,[.39,.42,.36],2,8);t.beam([x,6.08,z],[x+.48,6.32,z],.030,[.39,.42,.36],2,6);t.box(x+.48,6.27,z,.48,.10,.20,[.78,.79,.69],2);}
 t.box(bin[0],.04,bin[1],.33,.81,.33,[.20,.22,.18],2);
 t.beam([rail[0][0],.40,rail[0][1]],[rail[1][0],.40,rail[1][1]],.055,C.red,2,4);for(const [x,z] of rail)t.beam([x,.04,z],[x,.40,z],.045,C.red,2,4);
 for(const p of parking)car(g,p);
 // Existing service road forks are retained; this is only the short parking bay edge.
 for(const v of [-1,1]){const q=frame(g,...parking[0].at,parking[0].heading);q.quad([v*1.10,.018,-2.45],[v*1.10+.055,.018,-2.45],[v*1.10+.055,.018,2.45],[v*1.10,.018,2.45],[.77,.78,.70]);}
 const cables=[[[111.5,5.85,-258.3],[123.6,6.05,-246.4]],[[123.6,6.05,-246.4],[135.5,5.95,-225.3]]];
 for(const [a,b] of cables)for(let line=0;line<4;line++){let last;for(let i=0;i<=12;i++){const f=i/12,p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f-.34*Math.sin(Math.PI*f)-line*.18,a[2]+(b[2]-a[2])*f+line*.25];if(last)t.beam(last,p,.007,[.22,.25,.21],2,4);last=p;}}
}
function rect(x,z,cx,cz,w,d){return Math.abs(x-cx)<w/2&&Math.abs(z-cz)<d/2;}
function solid(x,z){
 if(J.distance([hinge,tip],x,z)<.23||Math.hypot(x-hinge[0],z-hinge[1])<.19||J.distance(rail,x,z)<.13)return true;
 if(tables.some(p=>rect(x,z,p[0],p[1],2.20,2.0))||umbrellas.some(p=>Math.hypot(x-p[0],z-p[1])<.16)||pots.some(p=>Math.hypot(x-p[0],z-p[1])<.44))return true;
 if(J.distance(hedge,x,z)<.55||conifers.some(p=>Math.hypot(x-p[0],z-p[1])<.58))return true;
 if(lamps.some(p=>Math.hypot(x-p[0],z-p[1])<.14)||rect(x,z,bin[0],bin[1],.38,.38))return true;
 for(const p of benches){const c=Math.cos(p[2]),s=Math.sin(p[2]),dx=x-p[0],dz=z-p[1];if(Math.abs(c*dx+s*dz)<1.0&&Math.abs(-s*dx+c*dz)<.35)return true;}
 for(const p of parking){const c=Math.cos(p.heading),s=Math.sin(p.heading),dx=x-p.at[0],dz=z-p.at[1];if(Math.abs(c*dx+s*dz)<.96&&Math.abs(-s*dx+c*dz)<p.length/2+.04)return true;}
 // The photographed front fence has a gap at the cafe entrance.
 if(z>-250.0&&z<-232.4){const xEdge=132.2+(z+250)*2/17.6;if(Math.abs(x-xEdge)<.23&&(z< -243.3||z> -240.9))return true;}
 if(J.distance([[132.2,-250],[143.5,-251.2]],x,z)<.15||J.distance([[134.2,-232.4],[144.5,-233.4]],x,z)<.15)return true;
 return false;
}
function clearsTree(x,z){return x>95&&x<160&&z>-290&&z<-222&&(J.distance(approach,x,z)<3.8||J.distance(northDrive,x,z)<2.6||J.distance(cafeDrive,x,z)<2.8||J.distance(gardenWalk,x,z)<1.50||J.distance(northWalk,x,z)<1.50||J.inside(courtyard,x,z)||J.inside(island,x,z)&&x<126&&z<-236||J.inside(hedgeIsland,x,z)&&z<-236||parking.some(p=>Math.hypot(x-p.at[0],z-p.at[1])<3)||benches.some(p=>Math.hypot(x-p[0],z-p[1])<1.6));}
function applyGround(cats,park){const patio=park.buildings[94].pts,body=park.buildings[125].pts;
 for(let iz=Math.max(0,Math.floor((-290-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-222-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((98-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((160-park.x0)/park.mpp));ix++){
  const i=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp,old=cats[i]&31;if(old===4)continue;
  const nearWalk=J.distance(gardenWalk,x,z),nearNorth=J.distance(northWalk,x,z);
  if(nearNorth<2.2&&z>northWalk.at(-1)[1]&&old===2)cats[i]=65;
  if(J.inside(courtyard,x,z)&&old!==5)cats[i]=67;
  if((J.inside(island,x,z)||J.inside(hedgeIsland,x,z))&&old!==5)cats[i]=65;
  if(J.inside(patio,x,z)||old===5&&J.distance(patio.concat([patio[0]]),x,z)<park.mpp*1.5)cats[i]=66;
  if(J.inside(body,x,z))cats[i]=69;
  if((J.distance(approach,x,z)<3.2||J.distance(northDrive,x,z)<2.0||J.distance(cafeDrive,x,z)<2.0)&&!J.inside(body,x,z)&&!J.inside(patio,x,z))cats[i]=67;
  if((nearWalk<.85||nearNorth<.85&&z>northWalk.at(-1)[1])&&old!==5)cats[i]=67;
  for(const p of parking){const c=Math.cos(p.heading),s=Math.sin(p.heading),dx=x-p.at[0],dz=z-p.at[1];if(Math.abs(c*dx+s*dz)<1.55&&Math.abs(-s*dx+c*dz)<p.length/2+.60&&old!==5)cats[i]=67;}
 }
}
function applyObstacles(cats,park){for(let iz=Math.max(0,Math.floor((-289-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-223-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((99-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((151-park.x0)/park.mpp));ix++){const i=iz*park.w+ix,x=park.x0+(ix+.5)*park.mpp,z=park.z0+(iz+.5)*park.mpp;if((cats[i]&31)!==4&&solid(x,z))cats[i]=77;}}
const api={approach,northDrive,frontDrive,cafeDrive,gardenWalk,northWalk,island,hedgeIsland,courtyard,gate,gateWorld,hinge,tip,bypass,umbrellas,tables,hedge,benches,conifers,pots,trays,lamps,bin,rail,parking,trees,entries,building,terrace,junction,frame,bench,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkKhutorok=api;
})(typeof window!=='undefined'?window:globalThis);
