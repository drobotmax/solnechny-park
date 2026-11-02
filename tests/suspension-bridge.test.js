const {test}=require('node:test'),assert=require('node:assert/strict');
const B=require('../park-suspension-bridge'),M=require('../park-meshes'),park=require('../park/park.json');
const cp=require('node:child_process');
test('the photographed bridge replaces its OSM way and leaves the entrance bridge alone',()=>{
 assert.deepEqual([B.a,B.b],park.bridges.find(b=>b.osm_id===46869602).pts);
 assert.equal(M.entries(park).filter(e=>e.kind==='suspensionBridge').length,1);
 assert.equal(M.bridgeEntries(park).length,2);
 const g=M.build(B.entries()[0]);assert(g.data.every(Number.isFinite));assert(g.n>1000);assert(g.data.byteLength<2*1024*1024);
});
test('both approaches and the complete deck support two wheel circles even above missing boards',()=>{
 for(let s=-7;s<B.length+5;s+=.1)for(const l of [-.65,0,.65]){
  for(const offset of [-.45,.45]){
   const p=B.at(s+offset,l,0);
   for(const [ox,oz] of [[0,0],[.3,0],[-.3,0],[0,.3],[0,-.3]])assert.equal(B.surface(p[0]+ox,p[2]+oz),2);
  }
  const p=B.at(s,l,0),q=B.at(s+.01,l,0);
  assert(Math.abs(M.terrainHeight(p[0],p[2])-M.terrainHeight(q[0],q[2]))<.015);
 }
 for(const i of B.missing){const p=B.at((i+.5)*B.pitch,0,0);assert.equal(B.surface(p[0],p[2]),2);assert(M.terrainHeight(p[0],p[2])>.5);}
 assert.equal(B.surface(...[500,500]),null);
 for(let l=1.7;l<5.2;l+=.05){const p=B.at(-.75,l,0);assert.equal(B.surface(p[0],p[2]),2);assert(Number.isFinite(B.height(p[0],p[2])));}
});
test('gaps reveal water, the approach stays connected and off-deck edges block rolling',()=>{
 const cats=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 B.applyGround(cats,park);
 for(const i of B.missing){const p=B.at((i+.5)*B.pitch,0,0),ix=Math.floor((p[0]-park.x0)/park.mpp),iz=Math.floor((p[2]-park.z0)/park.mpp);assert.equal(cats[iz*park.w+ix]&31,4);}
 for(const l of [-1.3,1.3]){const p=B.at(B.length/2,l,0);assert.equal(B.surface(p[0],p[2]),13);}
});
test('the two marked fence gaps clear collision cells without changing water or buildings',()=>{
 const cats=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 const before=Buffer.from(cats);B.applyGround(cats,park);
 for(const p of B.fenceGaps){let opened=0;for(let i=0;i<cats.length;i++){
  const x=park.x0+(i%park.w+.5)*park.mpp,z=park.z0+(Math.floor(i/park.w)+.5)*park.mpp;
  if(Math.hypot(x-p.x,z-p.z)>=p.r)continue;
  if((before[i]&31)===13){assert.equal(cats[i]&31,p.cat);opened++;}
  else assert.equal(cats[i],before[i]);
 }assert(opened>5);}
 assert(!B.fenceGap(21,420));
});
