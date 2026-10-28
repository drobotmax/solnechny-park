const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const G=require('../park-yesenin-garden'),K=require('../park-khutorok'),J=require('../park-avenue-junction'),L=require('../park-scanned-landmarks'),M=require('../park-meshes'),park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
const blocked=(c,x,z)=>[4,5,12,13].includes(c[index(x,z)]&31);
function base(){const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 require('../park-central-alley').applyGround(c,park,M.entries(park));J.applyGround(c,park);require('../park-safari-avenue').applyGround(c,park);require('../park-avenue-picnic').applyGround(c,park);K.applyGround(c,park);L.applySiteGround(c,park);K.applyObstacles(c,park);L.applyGround(c,park);return c;
}
function corrected(){const c=base();G.applyGround(c,park);G.applyObstacles(c,park);return c;}
test('the rear loop joins the memorial, Khutorok walk and existing service road',()=>{
 const c=corrected();assert.deepEqual(G.eastNodes[0],K.gardenWalk.at(-1));assert.deepEqual(G.westNodes[0],G.rearNodes[0]);assert.deepEqual(G.rearNodes.at(-1),G.eastNodes[2]);assert.deepEqual(G.westNodes.at(-1),G.southNodes[0]);assert.deepEqual(G.eastNodes.at(-1),G.southNodes[3]);
 for(const path of G.paths)for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.hypot(b[0]-a[0],b[1]-a[1]),fx=(b[0]-a[0])/n,fz=(b[1]-a[1])/n;
  for(const forward of [-.52,0,.52])for(const side of [-.30,0,.30]){const x=b[0]+fx*forward-fz*side,z=b[1]+fz*forward+fx*side;assert(!blocked(c,x,z),`stroller envelope blocked at ${x},${z}`);assert(M.centralClearsTree(x,z),'no generated trunk may remain in the loop');}
 }
 assert(L.inSite(...G.rearNodes[0]),'the rear branch meets the existing memorial paving');
 const p=G.southNodes.at(-1);assert.equal(c[index(p[0]+.8,p[1])]&31,3,'the southern connection meets the existing cafe service road');
});
test('the lawn stays open while seats, bicycle and thickets block their actual footprints',()=>{
 const c=corrected();for(const p of [[106,-227],[110,-228],[105,-207],[98,-216]])assert.equal(c[index(...p)]&31,1,'the space between the paths is grass');
 assert.equal(c[index(106.0,-222.5)]&31,2,'the seating pocket has paving');
 for(const p of [...G.benches,G.bin,G.bicycle.at,...G.thickets,...G.groves,...G.lamps])assert(blocked(c,p[0],p[1]),`fixture lacks collision at ${p}`);
 for(const t of G.trees){assert(G.paths.every(p=>J.distance(p,t[0],t[1])>1.45));assert(!L.inSite(t[0],t[1]));assert(!G.solid(t[0],t[1]));}
});
test('the garden preserves the accepted alley, memorial and Khutorok gate',()=>{
 const before=base(),after=before.slice();G.applyGround(after,park);G.applyObstacles(after,park);
 for(const p of [[62,-242.45],[94,-244.4],L.yesenin.at,L.world(...L.yesenin.plaque),K.gate.center,...K.bypass,...J.pavilionFront])assert.equal(after[index(...p)],before[index(...p)],`accepted layout changed at ${p}`);
 for(let i=0;i<after.length;i++)if((before[i]&31)===4||(before[i]&31)===5)assert.equal(after[i],before[i],'mapped water and buildings stay intact');
});
test('the garden is one bounded deterministic solid mesh and keeps earlier tree seeds stable',()=>{
 const e=M.entries(park).find(e=>e.kind==='yeseninGarden');assert(e);const mesh=M.build(e);assert(mesh.data.byteLength<.55*1024*1024);assert.deepEqual(mesh.data,M.build(e).data);
 const start=M.centralTrees.length-require('../park-khutorok-lane').trees.length-require('../park-garden-junction').trees.length-G.trees.length;
 assert.deepEqual(M.centralTrees.slice(start,start+G.trees.length),G.trees);assert.deepEqual(M.centralTrees.slice(start-K.trees.length,start),K.trees);
});
