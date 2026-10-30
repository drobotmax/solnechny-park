// Five turns at the side path to 2A/19A, east of the Yesenin garden.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const K=typeof module!=='undefined'&&module.exports?require('./park-khutorok.js'):root.ParkKhutorok;
const N=typeof module!=='undefined'&&module.exports?require('./park-garden-junction.js'):root.ParkGardenJunction;
const T=typeof module!=='undefined'&&module.exports?require('./park-khutorok-toilet.js'):root.ParkKhutorokToilet;
const C={wood:[.44,.28,.18],white:[.83,.84,.77],glass:[.21,.30,.29],roof:[.28,.29,.25],leaf:[.22,.37,.19],teal:[.28,.57,.53],dark:[.12,.16,.15],concrete:[.54,.57,.52]};
const station=[134.7,-211.0],views={north:.35,east:.85,south:3.02,west:-1.55,northwest:-.65};
const axis=[K.cafeDrive.at(-1),station,[136.25,-197.5],[137.7,-184.0]],halfRoad=1.75;
const eastWalk=[station,[135.95,-198.0],[145.5,-198.0],[148.2,-203.0],[147.4,-212.5],T.station];
const porchApproach=[[145.1,-212.2],[145.1,-218.4]],yardApproach=[[135.62,-203.0],[139.5,-203.0]];
const annex=[[140.9,-230.0],[142.3,-219.0],[152.8,-220.2],[151.3,-231.2]];
const porch=[[142.3,-218.9],[147.3,-219.4],[147.5,-218.1],[142.5,-217.6]];
const hut=T.hut;
const shed=[[122.2,-193.0],[129,-193.0],[129.6,-184.2],[122.9,-184.0]];
const yard=[[138.9,-218.9],[144.0,-218.9],[144.0,-201.3],[138.9,-201.3]];
const lawn=[[120,-226],[131.2,-226],[134.3,-191.5],[129,-191.5],[120,-202]];
const southHedgeRuns=[[N.hedge.at(-1),[133.4,-201.5]],[[134.1,-194.7],[134.5,-191.0]]],southHedge=southHedgeRuns.flat();
const cafeHedge=[[139.7,-227],[140.0,-222.5],[140.5,-218.0]];
const conifers=[[140.5,-223.9],[141.1,-219.6]];
const bins=Array.from({length:10},(_,i)=>[141.85,-218.2+i*1.65]);
const containerWall=[[143.0,-218.9],[143.0,-201.3],[138.9,-201.3]],box=[140.9,-219.7],pole=[139.23,-199.44];
const trees=[[126.1,-209.8,5.1,1.8],[121.0,-214.8,4.5,1.5],[128.0,-200.2,4.8,1.6],[130.2,-219.2,18,5.5],[157.8,-216.4,15,4.8]].concat(T.trees);
function entries(){return [{id:'khutorok-annex',kind:'khutorokAnnex',cx:146.8,cz:-222,pts:annex},
 {id:'khutorok-teal-hut',kind:'khutorokTealHut',cx:hut.at[0],cz:hut.at[1],pts:T.footprint},
 {id:'khutorok-vine-shed',kind:'khutorokVineShed',cx:125.9,cz:-188.6,pts:shed},
 {id:'khutorok-service-lane',kind:'khutorokServiceLane',cx:station[0],cz:station[1],pts:[[120,-231],[167,-231],[167,-182],[120,-182]]}];}
function polygon(g,p,y,col,mat=1){for(let i=1;i<p.length-1;i++)g.tri([p[0][0],y,p[0][1]],[p[i+1][0],y,p[i+1][1]],[p[i][0],y,p[i][1]],col,mat);}
function side(g,a,b,front=false){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));
 t.quad([0,.12,0],[len,.12,0],[len,2.85,0],[0,2.85,0],C.wood,12);
 if(front){const count=Math.max(2,Math.round(len/1.65));for(let i=0;i<count;i++){const lo=i*len/count+.09,hi=(i+1)*len/count-.09;t.quad([lo,.50,.025],[hi,.50,.025],[hi,2.54,.025],[lo,2.54,.025],C.glass,3);
  for(const u of [lo,hi])t.box(u,.37,.045,.055,2.36,.055,C.white,1);t.box((lo+hi)/2,1.43,.05,hi-lo,.04,.055,C.white,1);
 }for(const y of [.35,2.76])t.box(len/2,y,.05,len,.07,.075,C.white,1);}
 else{t.box(len/2,.48,.035,len-.25,1.95,.035,C.glass,3);for(const u of [.13,len/2,len-.13])t.box(u,.37,.06,.06,2.30,.065,C.white,1);}
}
function annexMesh(g){
 for(let i=0;i<annex.length;i++)side(g,annex[i],annex[(i+1)%annex.length],i===0);
 const p=annex.map(([x,z])=>[x,2.94,z]),mid=(a,b,y)=>[(a[0]+b[0])/2,y,(a[2]+b[2])/2],r0=mid(p[0],p[3],4.02),r1=mid(p[1],p[2],4.02);
 g.quad(p[0],p[1],r1,r0,C.roof,14);g.quad(p[2],p[3],r0,r1,[.25,.28,.24],14);g.tri(p[1],p[2],r1,C.roof,14);g.tri(p[3],p[0],r0,C.roof,14);
 // A low corner porch faces the narrow path, without extending across it.
 polygon(g,porch,.12,[.45,.40,.31],12);const t=K.frame(g),a=porch[3],b=porch[2],gateX=145.1;
 for(const [lo,hi] of [[a[0],gateX-.5],[gateX+.5,b[0]]]){const point=x=>[x,a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0])];
  for(const x of [lo,hi]){const p=point(x);t.box(p[0],.12,p[1],.07,.80,.07,C.wood,12);}
  for(const y of [.24,.78]){const p=point(lo),q=point(hi);t.beam([p[0],y,p[1]],[q[0],y,q[1]],.025,C.wood,12,4);}
  for(let x=lo+.18;x<hi;x+=.28){const p=point(x);t.box(p[0],.15,p[1],.045,.65,.045,C.wood,12);}
 }
}
const hutMesh=T.build;
function shedMesh(g){const t=K.frame(g);polygon(g,shed,2.87,[.29,.32,.25],14);
 for(let i=0;i<shed.length;i++){const a=shed[i],b=shed[(i+1)%shed.length];g.quad([a[0],.03,a[1]],[b[0],.03,b[1]],[b[0],2.78,b[1]],[a[0],2.78,a[1]],[.69,.72,.62],1);}
 for(const z of [-190.7,-186.6]){t.box(129.55,.32,z,.10,2.03,1.44,[.20,.27,.22],12);t.box(129.62,.32,z,.045,.06,1.52,C.white,1);}
 // The visible roof edge carries uneven leaves, with glimpses of plaster below.
 for(let i=0;i<21;i++){const z=-192.8+i*.42,x=129.1+.30*Math.sin(i*2.4),y=2.65+.20*Math.sin(i*3.2);t.oval(x,y,z,.53,.37,.42,i%2?C.leaf:[.27,.42,.21]);if(i%3===0)t.oval(x+.07,y-.47,z,.25,.55,.28,C.leaf);}
 for(let i=0;i<10;i++)t.oval(123.0+(i%4)*1.7,2.96,-191.7+Math.floor(i/4)*2.5,.92,.22,.86,C.leaf);
}
function hedgeMesh(g,path,w=.70,h=.76){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0]));t.box(len/2,.06,0,len,h,w,C.leaf,16);}}
function binMesh(g,x,z,i){const t=K.frame(g,x,z),col=i%2?[.35,.43,.40]:[.40,.46,.42],rust=[.43,.29,.18];
 for(const u of [-.46,.46])for(const v of [-.48,.48])t.beam([u-.05,.17,v],[u+.05,.17,v],.11,C.dark,2,6);
 if(i<6){
  t.box(0,.20,0,1.20,.94,1.38,col,2);t.quad([-.635,1.25,-.73],[.635,1.25,-.73],[.635,1.25,.73],[-.635,1.25,.73],[.15,.20,.18],2);
  t.box(-.615,.70,0,.035,.10,.72,[.22,.28,.24],2);
  if(i%2===0){t.quad([-.24,1.26,.17],[.40,1.26,.17],[.40,1.74,.17],[-.24,1.74,.17],[.57,.45,.29],7);t.quad([-.43,1.26,-.49],[-.04,1.26,-.49],[-.04,1.26,-.05],[-.43,1.26,-.05],[.63,.51,.34],7);}
 }else{
  const bottom=[[-.48,.20,-.55],[.48,.20,-.55],[.48,.20,.55],[-.48,.20,.55]],top=[[-.78,1.34,-.73],[.78,1.34,-.73],[.78,1.34,.73],[-.78,1.34,.73]];
  t.box(0,.18,0,.98,.08,1.12,[.20,.25,.22],2);
  for(let k=0;k<4;k++){const j=(k+1)%4;t.quad(bottom[k],bottom[j],top[j],top[k],k===0?rust:col,2);t.beam(top[k],top[j],.035,[.24,.29,.25],2,4);}
  t.box(-.705,.66,.16,.025,.29,.42,rust,2);t.box(-.716,.93,-.28,.018,.055,.38,[.65,.67,.54],7);
  if(i!==8){t.quad([-.29,1.04,.10],[.39,1.04,.10],[.39,1.61,.10],[-.29,1.61,.10],[.58,.44,.27],7);t.box(-.22,.94,-.25,.46,.38,.42,C.dark,2);}
 }
}
function containerWallMesh(g){for(let i=1;i<containerWall.length;i++){
 const a=containerWall[i-1],b=containerWall[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),t=K.frame(g,...a,Math.atan2(b[1]-a[1],b[0]-a[0])),face=i===1?.128:-.128;
 t.box(len/2,.02,0,len,1.48,.24,[.26,.48,.36],1);t.box(len/2,1.50,0,len+.04,.09,.31,[.34,.55,.41],1);
 for(let row=0;row<8;row++){const y=.12+row*.18;t.quad([0,y,face],[len,y,face],[len,y+.012,face],[0,y+.012,face],[.38,.55,.43],1);}
}}
function laneMesh(g){const t=K.frame(g);for(const run of southHedgeRuns)hedgeMesh(g,run);hedgeMesh(g,cafeHedge,.65,1.03);
 T.yardMesh(g);
 for(const [x,z] of conifers){t.oval(x,1.05,z,.56,1.01,.53,[.15,.28,.18]);t.oval(x,1.83,z,.35,.60,.36,[.17,.32,.19]);}
 polygon(g,yard,.018,C.concrete);containerWallMesh(g);bins.forEach(([x,z],i)=>binMesh(g,x,z,i));
 for(let i=0;i<3;i++)t.box(139.8+(i%2)*.43,.04,-218.8+i*1.04,.42,.38,.39,C.dark,2);
 t.box(box[0],.04,box[1],.96,.91,.64,[.25,.49,.38],2);for(const u of [-.34,.34])t.box(box[0]+u,.07,box[1]-.332,.025,.83,.025,[.37,.60,.47],2);
 for(const [x,z] of [pole])t.beam([x,.04,z],[x,6.40,z],.085,[.64,.65,.57],1,8);
 const wirePoints=[[135.5,5.95,-225.3],[pole[0],6.28,pole[1]],[142.36,6.25,-171.62]];
 for(let j=1;j<wirePoints.length;j++)for(let line=0;line<4;line++){const a=wirePoints[j-1],b=wirePoints[j];let last;for(let i=0;i<=18;i++){const f=i/18,p=[a[0]+(b[0]-a[0])*f+line*.16,a[1]+(b[1]-a[1])*f-.24*Math.sin(Math.PI*f)-line*.15,a[2]+(b[2]-a[2])*f];if(last)t.beam(last,p,.007,[.23,.25,.21],2,4);last=p;}}
}
const inHut=T.inHut;
function solid(x,z){if(J.inside(annex,x,z)||J.inside(shed,x,z)||inHut(x,z)||T.solid(x,z))return true;
 if(southHedgeRuns.some(run=>J.distance(run,x,z)<.37)||J.distance(cafeHedge,x,z)<.35||conifers.some(p=>Math.hypot(x-p[0],z-p[1])<.52))return true;
 if(bins.some((p,i)=>Math.abs(x-p[0])<(i<6?.63:.80)&&Math.abs(z-p[1])<(i<6?.72:.76))||J.distance(containerWall,x,z)<.15||Math.abs(x-box[0])<.51&&Math.abs(z-box[1])<.36||Math.hypot(x-pole[0],z-pole[1])<.20)return true;
 const a=porch[3],b=porch[2],lineZ=a[1]+(b[1]-a[1])*(x-a[0])/(b[0]-a[0]);return x>a[0]&&x<b[0]&&Math.abs(z-lineZ)<.10&&Math.abs(x-145.1)>.50;
}
function clearsTree(x,z){return T.clearsTree(x,z)||x>119&&x<158&&z>-232&&z<-180&&(J.inside(lawn,x,z)||J.inside(porch,x,z)||J.inside(yard,x,z)||J.distance(axis,x,z)<halfRoad+.65||J.distance(eastWalk,x,z)<1.22||J.distance(porchApproach,x,z)<1.05||J.distance(yardApproach,x,z)<1.05||J.inside(annex,x,z)||J.inside(shed,x,z)||inHut(x,z,1.0));}
function cells(park,fn){for(let iz=Math.max(0,Math.floor((-231-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-181-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((119-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((167-park.x0)/park.mpp));ix++)fn(iz*park.w+ix,park.x0+(ix+.5)*park.mpp,park.z0+(iz+.5)*park.mpp);}
function applyGround(cats,park){cells(park,(i,x,z)=>{const old=cats[i]&31;if([4,5,12,13].includes(old))return;
 if(J.inside(lawn,x,z)||J.distance(axis,x,z)<2.7&&[2,3].includes(old))cats[i]=65;
 const toiletGround=T.ground(x,z);if(toiletGround)cats[i]=toiletGround;
 if(J.distance(porchApproach,x,z)<.56||J.distance(yardApproach,x,z)<.62||J.inside(porch,x,z)||J.inside(yard,x,z))cats[i]=66;
 if(J.distance(eastWalk,x,z)<.68)cats[i]=67;
 if(J.distance(axis,x,z)<halfRoad)cats[i]=67;
});}
function applyObstacles(cats,park){cells(park,(i,x,z)=>{if(![4,5].includes(cats[i]&31)&&(solid(x,z)||T.solid(x,z,park.mpp*.42)||Math.hypot(x-pole[0],z-pole[1])<.20+park.mpp*.42))cats[i]=77;});}
const api={station,views,axis,halfRoad,eastWalk,porchApproach,yardApproach,annex,porch,hut,shed,yard,lawn,southHedge,southHedgeRuns,cafeHedge,conifers,bins,containerWall,box,pole,trees,entries,annexMesh,hutMesh,shedMesh,laneMesh,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkKhutorokLane=api;
})(typeof window!=='undefined'?window:globalThis);
