// Photo-led footpath loop and shaded seating behind the Yesenin memorial.
(function(root){
'use strict';
const J=typeof module!=='undefined'&&module.exports?require('./park-avenue-junction.js'):root.ParkAvenueJunction;
const K=typeof module!=='undefined'&&module.exports?require('./park-khutorok.js'):root.ParkKhutorok;
const L=typeof module!=='undefined'&&module.exports?require('./park-scanned-landmarks.js'):root.ParkScannedLandmarks;
const C={edge:[.61,.62,.55],steel:[.16,.19,.17],wood:[.36,.27,.17],bark:[.30,.28,.20],leaf:[.22,.37,.17]};
const halfWidth=.88;
const eastNodes=[[118.1,-228],[116.8,-224.8],[115.7,-222.4],[116.8,-216.8],[118.4,-212.4],[115.7,-209.0],[111.3,-209.0]];
const rearNodes=[[100.05,-232.9],[100.9,-226.2],[107.3,-224.2],[115.7,-222.4]];
const westNodes=[[100.05,-232.9],[95.7,-229.1],[91.4,-224.9],[89.4,-219.7],[89.1,-213.7],[92.5,-209.9],[97.0,-209.5]];
const southNodes=[[97.0,-209.5],[100.5,-209.4],[104.4,-209.5],[111.3,-209.0],[123.2,-205.9],[135.9,-196.6]];
function curve(nodes){const out=[];
 for(let i=0;i<nodes.length-1;i++){const a=nodes[Math.max(0,i-1)],b=nodes[i],c=nodes[i+1],d=nodes[Math.min(nodes.length-1,i+2)],n=Math.max(4,Math.ceil(Math.hypot(c[0]-b[0],c[1]-b[1])*2));
  for(let j=0;j<n;j++){const t=j/n,t2=t*t,t3=t2*t;out.push([0,1].map(k=>.5*(2*b[k]+(-a[k]+c[k])*t+(2*a[k]-5*b[k]+4*c[k]-d[k])*t2+(-a[k]+3*b[k]-3*c[k]+d[k])*t3)));}
 }return out.concat([nodes.at(-1)]);
}
const paths=[eastNodes,rearNodes,westNodes,southNodes].map(curve);
const junctions=[eastNodes[0],rearNodes[0],eastNodes[2],southNodes[0],southNodes[2],eastNodes.at(-1),southNodes.at(-1)];
const lawn=[[97.7,-232.5],[112,-232.8],[118,-228.1],[115.7,-222.4],[118.4,-212.4],[112.8,-201.8],[95.2,-201.8],[89.1,-213.7],[89.4,-219.7],[95.7,-229.1]];
const pocket=[[103.0,-224.8],[110.2,-223.0],[109.5,-219.4],[102.2,-221.2]];
const westernSquare=[[88.7,-212.5],[97.8,-212.0],[98.0,-205.5],[89.6,-204.3]];
const benches=[[104.0,-222.0,.245],[107.5,-221.1,.245]],bin=[102.8,-223.2];
const bicycle={at:[110.3,-221.8],yaw:.30};
const thickets=[[121.0,-227.0,1.6,2.8,2.1],[120.2,-222.5,1.8,3.1,2.5],[122.5,-218.0,2.1,3.0,2.2],[123.7,-213.8,1.8,2.5,2.0],[104.2,-230.7,1.5,2.0,1.5]];
const groves=[[105.5,-219.0,1.0],[95.3,-222.3,.75]];
const trees=[[107.2,-230.2,16,5.6],[112.7,-215.3,14,5.0],[96.2,-215.3,16.5,5.4],[125.6,-216.2,18,5.3],[91.9,-230.4,17,5.1],[122.8,-212.4,15,4.7]];
const lamps=[[121.0,-230.5],[121.9,-219.4]];
function entries(){return [{id:'yesenin-garden',kind:'yeseninGarden',cx:112,cz:-218,pts:[[87,-235],[139,-235],[139,-195],[87,-195]]}];}
function curbs(g,path){
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(junctions.some(p=>Math.hypot(mid[0]-p[0],mid[1]-p[1])<1.3)||L.inSite(...mid)||J.inside(westernSquare,...mid))continue;
  const direction=j=>{const a=path[Math.max(0,j-1)],b=path[Math.min(path.length-1,j+1)],n=Math.hypot(b[0]-a[0],b[1]-a[1]);return [-(b[1]-a[1])/n,(b[0]-a[0])/n];},na=direction(i-1),nb=direction(i);
  for(const side of [-1,1]){const at=(p,n,d,y)=>[p[0]+n[0]*side*d,y,p[1]+n[1]*side*d];
   g.quad(at(a,na,halfWidth,.085),at(b,nb,halfWidth,.085),at(b,nb,halfWidth+.07,.085),at(a,na,halfWidth+.07,.085),C.edge,1);
   g.quad(at(a,na,halfWidth,.015),at(b,nb,halfWidth,.015),at(b,nb,halfWidth,.085),at(a,na,halfWidth,.085),C.edge,1);
  }
 }
}
function grove(g,x,z,scale){const t=K.frame(g,x,z),tips=[[-1.8,5.0,-.8],[1.6,5.4,.4],[-.6,6.2,1.8],[.5,6.4,-1.8]];
 for(let i=0;i<tips.length;i++){const p=tips[i].map(v=>v*scale),base=[(i-1.5)*.23,.08,(i%2-.5)*.25],fork=[p[0]*.46,p[1]*.44,p[2]*.46];
  t.beam(base,fork,.14*scale,C.bark,12,7);t.beam(fork,p,.075*scale,C.bark,12,6);
  t.oval(p[0],p[1],p[2],2.1*scale,1.6*scale,1.9*scale,i%2?C.leaf:[.25,.39,.18]);
  t.oval(p[0]*1.25,p[1]-.9*scale,p[2]*1.25,1.3*scale,1.5*scale,1.2*scale,[.20,.34,.16]);
 }
}
function bike(g){const t=K.frame(g,...bicycle.at,bicycle.yaw),dark=[.12,.15,.16],metal=[.57,.59,.52],r=.31;
 for(const u of [-.58,.58]){for(let i=0;i<16;i++){const a=i*Math.PI/8,b=(i+1)*Math.PI/8;t.beam([u+Math.cos(a)*r,.34+Math.sin(a)*r,0],[u+Math.cos(b)*r,.34+Math.sin(b)*r,0],.026,dark,2,5);if(i%2===0)t.beam([u,.34,0],[u+Math.cos(a)*r,.34+Math.sin(a)*r,0],.004,metal,2,4);}}
 const a=[-.58,.34,0],b=[-.19,.37,0],c=[-.27,.84,0],d=[.32,.85,0],e=[.58,.34,0];
 for(const [p,q] of [[a,b],[b,c],[c,a],[c,d],[d,b],[d,e]])t.beam(p,q,.018,[.33,.37,.36],2,5);
 t.box(-.26,.88,0,.27,.04,.12,dark,2);t.beam(d,[.30,1.02,.04],.017,metal,2,5);t.beam([.30,1.02,-.18],[.30,1.02,.18],.017,dark,2,5);
 t.beam(b,[-.13,.24,.13],.011,metal,2,4);t.beam([-.13,.24,.13],[-.03,.24,.13],.014,dark,2,4);t.beam([-.19,.37,-.02],[-.30,.02,-.20],.011,dark,2,4);
}
function build(g){const t=K.frame(g);
 for(const path of paths)curbs(g,path);for(const p of benches)K.bench(g,...p);
 for(const [x,z,rx,h,rz] of thickets){t.oval(x,h*.43,z,rx,h*.43,rz,C.leaf);t.oval(x+.35,h*.74,z-.25,rx*.76,h*.30,rz*.75,[.18,.32,.15]);}
 for(const p of groves)grove(g,...p);bike(g);
 t.box(bin[0],.04,bin[1],.31,.72,.31,[.22,.23,.18],2);
 for(const [x,z] of lamps){t.beam([x,.02,z],[x,5.9,z],.048,[.46,.49,.43],2,8);t.beam([x,5.82,z],[x-.38,6.06,z],.026,[.46,.49,.43],2,6);t.box(x-.40,6.01,z,.38,.08,.18,[.77,.78,.69],2);}
}
function solid(x,z){
 if(thickets.some(([px,pz,rx,h,rz])=>((x-px)/(rx*.65))**2+((z-pz)/(rz*.65))**2<1))return true;
 if(groves.some(([px,pz,s])=>Math.hypot(x-px,z-pz)<.60*s)||Math.hypot(x-bin[0],z-bin[1])<.25||lamps.some(p=>Math.hypot(x-p[0],z-p[1])<.14))return true;
 for(const [px,pz,a] of benches){const c=Math.cos(a),s=Math.sin(a),dx=x-px,dz=z-pz;if(Math.abs(c*dx+s*dz)<1.0&&Math.abs(-s*dx+c*dz)<.35)return true;}
 const c=Math.cos(bicycle.yaw),s=Math.sin(bicycle.yaw),dx=x-bicycle.at[0],dz=z-bicycle.at[1];return Math.abs(c*dx+s*dz)<.94&&Math.abs(-s*dx+c*dz)<.25;
}
function nearPath(x,z){return paths.some(p=>J.distance(p,x,z)<halfWidth);}
function clearsTree(x,z){return J.inside(lawn,x,z)||J.inside(pocket,x,z)||paths.some(p=>J.distance(p,x,z)<1.5)||thickets.some(([px,pz,rx,h,rz])=>Math.hypot(x-px,z-pz)<Math.max(rx,rz)+.5)||groves.some(p=>Math.hypot(x-p[0],z-p[1])<3.1);}
function cells(park,fn){for(let iz=Math.max(0,Math.floor((-235-park.z0)/park.mpp));iz<=Math.min(park.h-1,Math.ceil((-195-park.z0)/park.mpp));iz++)for(let ix=Math.max(0,Math.floor((87-park.x0)/park.mpp));ix<=Math.min(park.w-1,Math.ceil((139-park.x0)/park.mpp));ix++)fn(iz*park.w+ix,park.x0+(ix+.5)*park.mpp,park.z0+(iz+.5)*park.mpp);}
function applyGround(cats,park){cells(park,(i,x,z)=>{const old=cats[i]&31;if([4,5,12,13].includes(old)||L.inSite(x,z))return;
 if(J.inside(lawn,x,z))cats[i]=65;if(J.inside(pocket,x,z))cats[i]=66;if(nearPath(x,z))cats[i]=67;
});}
function applyObstacles(cats,park){cells(park,(i,x,z)=>{if(![4,5].includes(cats[i]&31)&&solid(x,z))cats[i]=77;});}
const api={halfWidth,eastNodes,rearNodes,westNodes,southNodes,curve,paths,junctions,lawn,pocket,westernSquare,benches,bin,bicycle,thickets,groves,trees,lamps,entries,build,solid,clearsTree,applyGround,applyObstacles};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ParkYeseninGarden=api;
})(typeof window!=='undefined'?window:globalThis);
