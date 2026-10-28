const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const S=require('../park-khutorok-lane'),N=require('../park-garden-junction'),G=require('../park-yesenin-garden'),K=require('../park-khutorok'),J=require('../park-avenue-junction'),L=require('../park-scanned-landmarks'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
let cachedBase;
function base(){if(cachedBase)return cachedBase.slice();const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 require('../park-central-alley').applyGround(c,park,M.entries(park));J.applyGround(c,park);require('../park-safari-avenue').applyGround(c,park);require('../park-avenue-picnic').applyGround(c,park);K.applyGround(c,park);G.applyGround(c,park);N.applyGround(c,park);L.applySiteGround(c,park);cachedBase=c;return c.slice();
}
function corrected(){const c=base();S.applyGround(c,park);K.applyObstacles(c,park);G.applyObstacles(c,park);N.applyObstacles(c,park);S.applyObstacles(c,park);L.applyGround(c,park);return c;}
function envelope(c,path){for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]),fx=(b[0]-a[0])/len,fz=(b[1]-a[1])/len,n=Math.ceil(len/.15);
 for(let k=0;k<=n;k++){const x=a[0]+(b[0]-a[0])*k/n,z=a[1]+(b[1]-a[1])*k/n;
  for(const f of [-.52,0,.52])for(const s of [-.30,0,.30]){const px=x+fx*f-fz*s,pz=z+fz*f+fx*s;assert(!blocked(c,px,pz),`stroller envelope clips at ${px},${pz}`);assert(M.centralClearsTree(px,pz),'the street and side path cannot retain generated trunks');}
 }
}}
test('the new camera pin follows the mapped cafe service road and the five panorama directions',()=>{
 assert.deepEqual(S.axis[0],K.cafeDrive.at(-1));assert.deepEqual(S.station,S.axis[1]);assert(S.station[0]>N.station[0]+28);assert(Math.abs(S.station[1]-N.station[1])<2.0);
 const roadX=131.63+(S.station[1]+238.3)*(142.68-131.63)/98.06;assert(Math.abs(roadX-S.station[0])<.2);
 assert(S.hut.at[0]>S.station[0]+12);assert(S.hut.at[1]>S.eastWalk.at(-1)[1],'the hut is right of the footpath when looking east');
 assert(S.bins.every(p=>p[0]>S.axis[2][0]&&p[1]>S.station[1]),'bins are left of the south-facing road');
 assert(S.shed.every(p=>p[0]<S.axis[2][0]&&p[1]>S.station[1]),'the vine-covered building is right of the south-facing road');
 assert(S.views.north<0&&S.views.northwest<S.views.north&&S.views.east>1&&S.views.east<Math.PI/2&&S.views.south>2.9);
});
test('the street, east footpath, porch gap and connection to the garden all fit the stroller',()=>{
 const c=corrected();for(const path of [S.axis,S.eastWalk,G.paths[3],S.porchApproach,S.yardApproach])envelope(c,path);
 for(const z of [-223,-218,-211,-202,-190]){const a=S.axis.findIndex((p,i)=>i>0&&S.axis[i-1][1]<=z&&p[1]>=z),p=S.axis[a-1],q=S.axis[a],x=p[0]+(q[0]-p[0])*(z-p[1])/(q[1]-p[1]);assert.equal(c[index(x,z)]&31,3);assert(J.distance(N.hedge.concat(S.southHedge.slice(1)),x,z)>S.halfRoad,'the hedge stays on the west verge');}
 assert.equal(c[index(126,-213)]&31,1,'the photographed west-side field is open lawn');
});
test('annexes, bins and roadside fixtures block while the nearby paths stay open',()=>{
 const c=corrected();for(const p of [S.hut.at,[146,-220],[126,-189],...S.bins,S.box,S.pole,...S.conifers,...S.cafeHedge,...S.southHedge])assert(blocked(c,p[0],p[1]),`missing physical fixture at ${p}`);
 assert(!blocked(c,...S.station));assert(!S.solid(...S.station));
 for(const t of K.trees.concat(S.trees)){assert(!J.inside(S.annex,t[0],t[1]),'no tree may pierce the new cafe windows');assert(!J.inside(S.shed,t[0],t[1]));assert(!require('../park-khutorok-toilet').inHut(t[0],t[1],.2));}
 const models=M.entries(park).filter(e=>['khutorokAnnex','khutorokTealHut','khutorokVineShed','khutorokServiceLane'].includes(e.kind));assert.equal(models.length,4);assert(models.reduce((n,e)=>n+M.build(e).data.byteLength,0)<.8*1024*1024,'the toilet and its rear-yard details stay in the local geometry budget');
});
test('the continuation preserves mapped water, cafe footprints, the memorial and earlier junctions',()=>{
 const before=base(),after=before.slice();S.applyGround(after,park);S.applyObstacles(after,park);
 for(const p of [[62,-242.45],L.yesenin.at,N.station,...K.bypass,...J.pavilionFront])assert.equal(after[index(...p)],before[index(...p)]);
 for(let i=0;i<after.length;i++)if([4,5].includes(before[i]&31))assert.equal(after[i],before[i]);
 const models=M.entries(park);for(const id of [94,125,126])assert.deepEqual(models.find(e=>e.id==='b'+id).pts,park.buildings[id].pts);
 assert.deepEqual(M.centralTrees.slice(-S.trees.length),S.trees,'new trees append without changing earlier random seeds');
});
