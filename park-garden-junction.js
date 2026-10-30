// One mapped station: north shortcut, southeast sports courts, west 2A/17k1.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const K=typeof module!=='undefined'&&module.exports?require('./park-khutorok.js'):root.ParkKhutorok;
const G=typeof module!=='undefined'&&module.exports?require('./park-yesenin-garden.js'):root.ParkYeseninGarden;
const P=typeof module!=='undefined'&&module.exports?require('./park-avenue-picnic.js'):root.ParkAvenuePicnic;
const C={concrete:[.53,.54,.49],cap:[.65,.65,.58],white:[.78,.78,.69],wood:[.28,.24,.18],leaf:[.20,.34,.19],dark:[.13,.16,.14]};
const station=G.southNodes[2];
const views={north:0,east:2.0,south:2.20,west:-1.67,northwest:-.22};
const shortcut=G.curve([station,[104.1,-214.2],[103.5,-217.8],[102.8,-221.0]]);
const square=G.westernSquare;
const westAccess=G.curve([[97,-209.5],[93.2,-211.0],[89.8,-215.0],[81,-217.8],[69,-218.0],[54,-214.5]]);
const stair={at:[104.8,-204.8],width:2.6,tread:.37,rise:.165,count:8};
stair.run=stair.tread*stair.count;stair.height=stair.rise*stair.count;
const stairApproach=[station,stair.at];
const courtLane=G.curve([station,[113.8,-203.0],[115.8,-200.5],[130.0,-194.0],[134.0,-188.0]]);
const platform=[[99.6,-201.9],[109.6,-201.9],[112.2,-198.4],[104.2,-196.3],[97.3,-198.7]];
const pavilion={at:[104.5,-199.7],width:7,depth:3.6,height:2.55};
const sportsFence=[[116,-203.8],[127.5,-203.8]],volleyballFence=[[120,-203.5],[120,-199.5]];
const sportsGround=[[118,-203.8],[145,-203.8],[145,-183],[138,-183],[138,-199],[118,-199]];
const sportsGate={at:[116.5,-203.8],width:3.5,height:3.4};
const hedge=[[130.5,-227],[131.2,-221],[131.8,-216]];
// Looking south, the juniper bed is on the right (west) of the stair flight.
const bushes=[[100.2,-203.4,2.7,.9,2.2],[97.7,-204.8,2.2,1.0,2.3],[99.8,-201.2,2.5,.85,2.0],[106.8,-216.5,1.6,1.8,1.4],[107.7,-213.8,1.0,1.4,1.0]];
const treeRope=[[98.0,-207.0],[96.1,-205.9],[93.7,-206.4],[92.5,-208.0]];
const pole=[109.6,-207.0],iris=[110.8,-204.9],trees=[[100.3,-201.4,19,5.6],[88.9,-202.0,17,5.3],[95.5,-206.8,22,6.5]];
function entries(){return [{id:'garden-stair-junction',kind:'gardenStairJunction',cx:station[0],cz:station[1],pts:[[53,-225],[140,-225],[140,-193],[53,-193]]}];}
function slab(g,pts,y,col){for(let i=1;i<pts.length-1;i++)g.tri([pts[0][0],y,pts[0][1]],[pts[i+1][0],y,pts[i+1][1]],[pts[i][0],y,pts[i][1]],col,1);}
function terrace(g){const h=stair.height;
 slab(g,platform,h,C.concrete);
 for(let i=0;i<platform.length;i++){const a=platform[i],b=platform[(i+1)%platform.length];if(i===0){for(const [lo,hi] of [[a[0],stair.at[0]-stair.width/2-.32],[stair.at[0]+stair.width/2+.32,b[0]]])g.quad([lo,0,a[1]],[hi,0,a[1]],[hi,h,a[1]],[lo,h,a[1]],C.concrete,1);}else g.quad([a[0],0,a[1]],[b[0],0,b[1]],[b[0],h,b[1]],[a[0],h,a[1]],C.concrete,1);}
 const t=K.frame(g,...stair.at);
 for(let i=0;i<stair.count;i++){t.box(0,0,(i+.5)*stair.tread,stair.width,(i+1)*stair.rise,stair.tread,C.concrete,1);t.box(0,(i+1)*stair.rise-.027,i*stair.tread+.025,stair.width,.027,.05,C.cap,1);}
 for(const side of [-1,1]){const a=side*(stair.width/2+.02),b=side*(stair.width/2+.34),z=stair.run,front=.40,back=h+.32;
  t.quad([a,0,0],[a,0,z],[a,back,z],[a,front,0],C.concrete,1);t.quad([b,0,z],[b,0,0],[b,front,0],[b,back,z],C.concrete,1);
  t.quad([a,front,0],[a,back,z],[b,back,z],[b,front,0],C.cap,1);t.quad([a,0,0],[a,front,0],[b,front,0],[b,0,0],C.concrete,1);
 }
}
function pavilionMesh(g,e){P.backdrop(g,e);const t=K.frame(g,...pavilion.at),h=stair.height,w=pavilion.width,d=pavilion.depth,front=-d/2-.02;
 t.box(0,h,0,w,pavilion.height,d,C.white,1);t.box(0,h,front,w,.22,.12,[.43,.44,.38],1);
 for(const u of [-w/2+.06,-1.75,1.75,w/2-.06])t.box(u,h,front-.045,.12,pavilion.height+.02,.12,C.wood,12);
 for(const u of [-1.05,0,1.05]){t.quad([u-.43,h+.28,front-.06],[u+.43,h+.28,front-.06],[u+.43,h+2.28,front-.06],[u-.43,h+2.28,front-.06],[.25,.32,.29],3);for(const x of [u-.45,u+.45])t.beam([x,h+.24,front-.09],[x,h+2.32,front-.09],.035,C.wood,12,4);}
 for(const u of [-2.55,2.55]){t.box(u,h+.68,front-.055,1.14,1.30,.09,[.28,.32,.28],3);for(const x of [u-.58,u,u+.58])t.box(x,h+.66,front-.11,.045,1.35,.045,[.83,.83,.75],1);for(const y of [h+.65,h+1.95])t.box(u,y,front-.11,1.20,.045,.045,[.83,.83,.75],1);}
 const y=h+pavilion.height,ridge=y+1.22,tile=[.55,.30,.17];
 t.quad([-w/2-.24,y,-d/2-.24],[w/2+.24,y,-d/2-.24],[w/2+.24,ridge,0],[-w/2-.24,ridge,0],tile,14);
 t.quad([w/2+.24,y,d/2+.24],[-w/2-.24,y,d/2+.24],[-w/2-.24,ridge,0],[w/2+.24,ridge,0],[.48,.26,.15],14);
 for(const u of [-w/2,w/2]){t.tri([u,y,-d/2],[u,y,d/2],[u,ridge,0],C.white,1);t.beam([u,y,-d/2-.24],[u,ridge,0],.045,C.wood,12,4);t.beam([u,ridge,0],[u,y,d/2+.24],.045,C.wood,12,4);}
 t.beam([-w/2-.24,ridge,0],[w/2+.24,ridge,0],.055,[.42,.23,.14],14,4);
}
function kiosk(g,e){const p=e.pts,h=6.8;
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];g.quad([a[0],.05,a[1]],[b[0],.05,b[1]],[b[0],h,b[1]],[a[0],h,a[1]],C.white,1);g.beam([a[0],h+.06,a[1]],[b[0],h+.06,b[1]],.065,[.57,.58,.53],14,4);
  for(let j=1;j<4;j++){const f=j/4,x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;g.beam([x,.15,z],[x,h-.12,z],.012,[.67,.68,.61],1,3);}
 }
 slab(g,p,h+.08,[.56,.57,.52]);
}
function wornPaving(g){const length=[0];for(let i=1;i<shortcut.length;i++)length.push(length.at(-1)+Math.hypot(shortcut[i][0]-shortcut[i-1][0],shortcut[i][1]-shortcut[i-1][1]));let i=1;
 for(let d=.10,row=0;d<length.at(-1);d+=.34,row++){while(i<length.length-1&&length[i]<d)i++;const a=shortcut[i-1],b=shortcut[i],f=(d-length[i-1])/(length[i]-length[i-1]),t=K.frame(g,a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0]));
  for(let j=0;j<3;j++){if((row*7+j*11)%23===0)continue;const v=(j-1)*.38+(row%2?.035:-.035),shade=((row*13+j*7)%5)*.018,col=[.53-shade,.49-shade,.40-shade];t.quad([-.145,.028,v-.17],[-.145,.028,v+.17],[.145,.028,v+.17],[.145,.028,v-.17],col,1);}
 }
}
function clippedHedge(g){for(let i=1;i<hedge.length;i++){const a=hedge[i-1],b=hedge[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));t.box(len/2,.10,0,len,.66,.70,C.leaf,16);}}
function fenceRun(g,path){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));
 t.quad([0,.02,.08],[len,.02,.08],[len,.54,.08],[0,.54,.08],[.16,.28,.23],1);
 for(let u=0;u<=len+.01;u+=2.4){const v=Math.min(u,len);t.quad([v-.035,.48,0],[v+.035,.48,0],[v+.035,4.4,0],[v-.035,4.4,0],[.12,.20,.18],2);}
 for(let u=.6;u<len;u+=1.2)t.quad([u-.012,.55,0],[u+.012,.55,0],[u+.012,4.3,0],[u-.012,4.3,0],[.16,.25,.22],2);
 for(const y of [1.15,2.65,4.35])t.quad([0,y-.018,0],[len,y-.018,0],[len,y+.018,0],[0,y+.018,0],[.14,.23,.20],2);
}}
function sportsMesh(g){const t=K.frame(g);fenceRun(g,[sportsFence[0],[122.5,-203.8]]);fenceRun(g,volleyballFence);
 const gate=K.frame(g,...sportsGate.at),w=sportsGate.width,h=sportsGate.height,red=[.46,.19,.14];gate.quad([-w/2,.06,0],[w/2,.06,0],[w/2,.88,0],[-w/2,.88,0],red,2);
 for(const u of [-w/2,0,w/2])gate.quad([u-.05,.04,0],[u+.05,.04,0],[u+.05,h,0],[u-.05,h,0],red,2);for(const y of [.92,h-.10])gate.quad([-w/2,y-.045,0],[w/2,y-.045,0],[w/2,y+.045,0],[-w/2,y+.045,0],red,2);
 for(let u=-w/2+.25;u<w/2;u+=.30)gate.quad([u-.018,.93,0],[u+.018,.93,0],[u+.018,h-.12,0],[u-.018,h-.12,0],red,2);
 g.quad([117.9,2.3,-197.8],[117.9,2.3,-196.2],[117.9,3.2,-196.2],[117.9,3.2,-197.8],C.white,7);g.beam([118,.02,-197],[118,3.25,-197],.045,C.dark,2,6);
 for(const [a,b] of [[[117.85,-197.35],[117.85,-196.65]],[[117.85,-196.65],[117.35,-196.65]],[[117.35,-196.65],[117.35,-197.35]],[[117.35,-197.35],[117.85,-197.35]]]){const dx=b[0]-a[0],dz=b[1]-a[1],l=Math.hypot(dx,dz),u=-dz/l*.018,v=dx/l*.018;g.quad([a[0]+u,2.15,a[1]+v],[b[0]+u,2.15,b[1]+v],[b[0]-u,2.15,b[1]-v],[a[0]-u,2.15,a[1]-v],red,2);}
 for(let i=0;i<treeRope.length;i++){const p=treeRope[i],q=treeRope[(i+1)%treeRope.length];t.beam([p[0],.03,p[1]],[p[0],.67,p[1]],.035,C.wood,12,5);if(i<treeRope.length-1)t.beam([p[0],.58,p[1]],[q[0],.58,q[1]],.018,[.55,.16,.11],2,4);}
}
function build(g){const t=K.frame(g);terrace(g);wornPaving(g);clippedHedge(g);sportsMesh(g);
 slab(g,square,.018,[.54,.56,.53]);
 for(let z=-212;z<-204.5;z+=1.15)for(let x=89;x<98;x+=1.15)if(J.inside(square,x,z)){g.beam([x,.022,z],[Math.min(x+1.05,97.7),.022,z],.008,[.43,.45,.42],1,3);}
 for(const [x,z,rx,h,rz] of bushes)t.oval(x,h*.48,z,rx,h*.48,rz,C.leaf);
 t.beam([pole[0],.05,pole[1]],[pole[0],7.2,pole[1]],.105,[.39,.35,.26],12,8);
 for(const end of [[93.8,6.4,-222],[135.5,6.0,-225.3]])for(let line=0;line<4;line++){let last;for(let i=0;i<=14;i++){const f=i/14,p=[pole[0]+(end[0]-pole[0])*f,6.90+(end[1]-6.90)*f-.32*Math.sin(Math.PI*f)-line*.16,pole[1]+(end[2]-pole[1])*f+line*.20];if(last)t.beam(last,p,.007,[.22,.25,.20],2,4);last=p;}}
 for(let i=0;i<18;i++){const a=i*2.4,x=iris[0]+Math.cos(a)*.38,z=iris[1]+Math.sin(a)*.38,h=.48+(i%4)*.09;t.tri([x,.02,z],[x+.05,h*.45,z],[x+Math.cos(a)*.24,h,z+Math.sin(a)*.24],[.27,.40,.19],16);}
}
function solid(x,z){
 if(J.inside(platform,x,z)||Math.abs(x-stair.at[0])<stair.width/2+.35&&z>stair.at[1]&&z<stair.at[1]+stair.run)return true;
 if(Math.abs(x-pavilion.at[0])<pavilion.width/2&&Math.abs(z-pavilion.at[1])<pavilion.depth/2)return true;
 if(J.distance(sportsFence,x,z)<.22&&(x<122.5||x>127.5)||J.distance(volleyballFence,x,z)<.22||J.distance(treeRope,x,z)<.055)return true;
 return J.distance(hedge,x,z)<.37||Math.hypot(x-pole[0],z-pole[1])<.18||bushes.some(([px,pz,rx,h,rz])=>((x-px)/(rx*.65))**2+((z-pz)/(rz*.65))**2<1);
}
function clearsTree(x,z){return J.inside(square,x,z)||J.inside(platform,x,z)||J.inside(sportsGround,x,z)||J.distance(shortcut,x,z)<1.15||J.distance(westAccess,x,z)<1.65||J.distance(stairApproach,x,z)<2.0||J.distance(courtLane,x,z)<1.3||solid(x,z);}
function cells(park,fn){for(let iz=Math.max(0,Math.floor((-228-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-178-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((52-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((146-park.x0)/park.mpp));ix++)fn(iz*park.w+ix,park.x0+(ix+.5)*park.mpp,park.z0+(iz+.5)*park.mpp);}
function applyGround(cats,park){const retired=park.rides[45].pts,edge=retired.concat([retired[0]]);cells(park,(i,x,z)=>{
 // The moved playground's raster extends beyond its old polygon by one cell.
 if((cats[i]&31)===12&&J.distance(edge,x,z)<park.mpp*1.5&&J.distance(westAccess,x,z)<1.5)cats[i]=65;
 if([4,5,12,13].includes(cats[i]&31))return;
 if(J.inside(sportsGround,x,z))cats[i]=66;
 if(J.distance(courtLane,x,z)<.88)cats[i]=67;
 if(J.distance(westAccess,x,z)<1.05)cats[i]=67;
 if(J.inside(square,x,z)||J.distance(stairApproach,x,z)<.82)cats[i]=66;
 if(J.distance(shortcut,x,z)<.73&&!J.inside(G.pocket,x,z)&&Math.hypot(x-station[0],z-station[1])>1.0)cats[i]=65;
});}
function applyObstacles(cats,park){cells(park,(i,x,z)=>{if(![4,5].includes(cats[i]&31)&&(solid(x,z)||Math.hypot(x-pole[0],z-pole[1])<.18+park.mpp*.42))cats[i]=77;});}
const api={station,views,shortcut,square,westAccess,stair,stairApproach,courtLane,platform,pavilion,sportsFence,volleyballFence,sportsGround,sportsGate,treeRope,hedge,bushes,pole,iris,trees,entries,pavilionMesh,kiosk,build,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkGardenJunction=api;
})(typeof window!=='undefined'?window:globalThis);
