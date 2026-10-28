// One panorama station: north shortcut, east garden fork, south stairs, west kiosks.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const K=typeof module!=='undefined'&&module.exports?require('./park-khutorok.js'):root.ParkKhutorok;
const G=typeof module!=='undefined'&&module.exports?require('./park-yesenin-garden.js'):root.ParkYeseninGarden;
const P=typeof module!=='undefined'&&module.exports?require('./park-avenue-picnic.js'):root.ParkAvenuePicnic;
const C={concrete:[.53,.54,.49],cap:[.65,.65,.58],white:[.78,.78,.69],wood:[.28,.24,.18],leaf:[.20,.34,.19],dark:[.13,.16,.14]};
const station=G.southNodes[2];
const views={north:0,east:Math.PI/2,south:Math.PI,west:-Math.PI/2,northwest:-.22};
const shortcut=G.curve([station,[104.1,-214.2],[103.5,-217.8],[102.8,-221.0]]);
const square=G.westernSquare;
const westAccess=G.curve([[97,-209.5],[93.2,-211.0],[89.8,-215.0],[81,-217.8],[69,-218.0],[54,-214.5]]);
const stair={at:[104.8,-204.8],width:2.6,tread:.37,rise:.165,count:8};
stair.run=stair.tread*stair.count;stair.height=stair.rise*stair.count;
const stairApproach=[station,stair.at];
const platform=[[99.6,-201.9],[109.6,-201.9],[112.2,-198.4],[104.2,-196.3],[97.3,-198.7]];
const pavilion={at:[104.5,-199.7],width:7,depth:3.6,height:2.55};
const hedge=[[130.5,-227],[131.2,-221],[131.8,-216],[132.45,-210],[133.2,-203]];
// Looking south, the juniper bed is on the right (west) of the stair flight.
const bushes=[[100.2,-203.4,2.7,.9,2.2],[97.7,-204.8,2.2,1.0,2.3],[99.8,-201.2,2.5,.85,2.0],[106.8,-216.5,1.6,1.8,1.4],[107.7,-213.8,1.0,1.4,1.0]];
const pole=[109.6,-207.0],iris=[110.8,-204.9],trees=[[100.3,-201.4,19,5.6],[88.9,-202.0,17,5.3]];
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
 // The frontal blank panel and side windows are opaque, without invented signage.
 t.box(0,h+1.16,front-.05,3.2,1.18,.08,[.39,.40,.34],12);
 for(const u of [-2.55,2.55]){t.box(u,h+.68,front-.055,1.14,1.30,.09,[.28,.32,.28],3);for(const x of [u-.58,u,u+.58])t.box(x,h+.66,front-.11,.045,1.35,.045,[.83,.83,.75],1);for(const y of [h+.65,h+1.95])t.box(u,y,front-.11,1.20,.045,.045,[.83,.83,.75],1);}
 t.box(0,h+pavilion.height,0,w+.30,.14,d+.25,[.26,.29,.26],14);
 t.box(0,h+pavilion.height-.11,front-.09,w+.30,.13,.14,C.wood,12);
}
function kiosk(g,e){const p=e.pts,a=p[3],b=p[2],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));
 for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];g.quad([a[0],.05,a[1]],[b[0],.05,b[1]],[b[0],2.55,b[1]],[a[0],2.55,a[1]],C.wood,12);g.beam([a[0],2.62,a[1]],[b[0],2.62,b[1]],.075,[.21,.23,.19],14,4);}
 slab(g,p,2.63,[.19,.22,.19]);
 const face=.06;t.box(len*.52,.40,face,4.05,1.75,.06,[.20,.21,.18],12);t.box(len*.52,.40,face+.10,4.22,.10,.31,[.38,.34,.26],12);
 for(let i=0;i<12;i++)t.box(len*.52,.48+i*.13,face+.045,3.94,.014,.014,[.25,.25,.21],2);
 for(const u of [.36,len-.36])t.box(u,.05,face+.04,.16,2.47,.12,[.51,.45,.34],12);
 t.box(len*.52,2.18,face+.04,4.30,.23,.12,[.29,.27,.22],12);
}
function wornPaving(g){const length=[0];for(let i=1;i<shortcut.length;i++)length.push(length.at(-1)+Math.hypot(shortcut[i][0]-shortcut[i-1][0],shortcut[i][1]-shortcut[i-1][1]));let i=1;
 for(let d=.10,row=0;d<length.at(-1);d+=.34,row++){while(i<length.length-1&&length[i]<d)i++;const a=shortcut[i-1],b=shortcut[i],f=(d-length[i-1])/(length[i]-length[i-1]),t=K.frame(g,a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,Math.atan2(b[1]-a[1],b[0]-a[0]));
  for(let j=0;j<4;j++){if((row*7+j*11)%23===0)continue;const v=(j-1.5)*.285+(row%2?.035:-.035),shade=((row*13+j*7)%5)*.018,col=[.53-shade,.49-shade,.40-shade];t.quad([-.145,.028,v-.122],[-.145,.028,v+.122],[.145,.028,v+.122],[.145,.028,v-.122],col,1);}
 }
}
function clippedHedge(g){for(let i=1;i<hedge.length;i++){const a=hedge[i-1],b=hedge[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));t.box(len/2,.10,0,len,.66,.70,C.leaf,16);}}
function build(g){const t=K.frame(g);terrace(g);wornPaving(g);clippedHedge(g);
 slab(g,square,.018,[.54,.56,.53]);
 for(let z=-212;z<-204.5;z+=1.15)for(let x=89;x<98;x+=1.15)if(J.inside(square,x,z)){g.beam([x,.022,z],[Math.min(x+1.05,97.7),.022,z],.008,[.43,.45,.42],1,3);}
 for(const [x,z,rx,h,rz] of bushes){t.oval(x,h*.48,z,rx,h*.48,rz,C.leaf);t.oval(x+.23,h*.70,z-.18,rx*.66,h*.30,rz*.64,[.22,.37,.21]);}
 t.beam([pole[0],.05,pole[1]],[pole[0],7.2,pole[1]],.105,[.39,.35,.26],12,8);
 for(const end of [[93.8,6.4,-222],[135.5,6.0,-225.3]])for(let line=0;line<4;line++){let last;for(let i=0;i<=14;i++){const f=i/14,p=[pole[0]+(end[0]-pole[0])*f,6.90+(end[1]-6.90)*f-.32*Math.sin(Math.PI*f)-line*.16,pole[1]+(end[2]-pole[1])*f+line*.20];if(last)t.beam(last,p,.007,[.22,.25,.20],2,4);last=p;}}
 for(let i=0;i<18;i++){const a=i*2.4,x=iris[0]+Math.cos(a)*.38,z=iris[1]+Math.sin(a)*.38,h=.48+(i%4)*.09;t.tri([x,.02,z],[x+.05,h*.45,z],[x+Math.cos(a)*.24,h,z+Math.sin(a)*.24],[.27,.40,.19],16);}
}
function solid(x,z){
 if(J.inside(platform,x,z)||Math.abs(x-stair.at[0])<stair.width/2+.35&&z>stair.at[1]&&z<stair.at[1]+stair.run)return true;
 if(Math.abs(x-pavilion.at[0])<pavilion.width/2&&Math.abs(z-pavilion.at[1])<pavilion.depth/2)return true;
 return J.distance(hedge,x,z)<.37||Math.hypot(x-pole[0],z-pole[1])<.18||bushes.some(([px,pz,rx,h,rz])=>((x-px)/(rx*.65))**2+((z-pz)/(rz*.65))**2<1);
}
function clearsTree(x,z){return J.inside(square,x,z)||J.inside(platform,x,z)||J.distance(shortcut,x,z)<1.15||J.distance(westAccess,x,z)<1.65||J.distance(stairApproach,x,z)<2.0||solid(x,z);}
function cells(park,fn){for(let iz=Math.max(0,Math.floor((-228-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-193-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((52-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((140-park.x0)/park.mpp));ix++)fn(iz*park.w+ix,park.x0+(ix+.5)*park.mpp,park.z0+(iz+.5)*park.mpp);}
function applyGround(cats,park){const retired=park.rides[45].pts,edge=retired.concat([retired[0]]);cells(park,(i,x,z)=>{
 // The moved playground's raster extends beyond its old polygon by one cell.
 if((cats[i]&31)===12&&J.distance(edge,x,z)<park.mpp*1.5&&J.distance(westAccess,x,z)<1.5)cats[i]=65;
 if([4,5,12,13].includes(cats[i]&31))return;
 if(J.distance(westAccess,x,z)<1.05)cats[i]=67;
 if(J.inside(square,x,z)||J.distance(stairApproach,x,z)<.82)cats[i]=66;
 if(J.distance(shortcut,x,z)<.73&&!J.inside(G.pocket,x,z)&&Math.hypot(x-station[0],z-station[1])>1.0)cats[i]=65;
});}
function applyObstacles(cats,park){cells(park,(i,x,z)=>{if(![4,5].includes(cats[i]&31)&&(solid(x,z)||Math.hypot(x-pole[0],z-pole[1])<.18+park.mpp*.42))cats[i]=77;});}
const api={station,views,shortcut,square,westAccess,stair,stairApproach,platform,pavilion,hedge,bushes,pole,iris,trees,entries,pavilionMesh,kiosk,build,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkGardenJunction=api;
})(typeof window!=='undefined'?window:globalThis);
