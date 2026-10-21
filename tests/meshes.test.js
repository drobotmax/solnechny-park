const {test}=require('node:test'),assert=require('node:assert/strict');
const {entries,build,buildingIds,rideIds}=require('../park-meshes.js');
const park=require('../park/park.json');
test('detailed landmarks contain finite nondegenerate triangles, unit normals and bounded geometry',()=>{
 let total=0;
 for(const e of entries(park)){
  const g=build(e);assert(g.n>0);assert.equal(g.n%3,0);total+=g.n;
  for(let i=0;i<g.data.length;i+=10){
   const v=Array.from(g.data.subarray(i,i+10));assert(v.every(Number.isFinite),e.id);
   assert(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5,e.id);
   assert(Math.hypot(v[0]-e.cx,v[1]-5,v[2]-e.cz)<=g.radius+.001);
   assert(v[1]>=-.001&&v[1]<20,e.id);
  }
 }
 assert(total*40<5*1024*1024,'mesh payload must stay below 5 MiB');
});
test('mapped models retain their footprints; plaza stage uses the corrected smaller placement',()=>{
 const models=entries(park);assert.equal(new Set(models.map(e=>e.id)).size,models.length);
 for(const e of models.filter(e=>e.id[0]==='b'||e.id[0]==='r')){
  const source=e.id[0]==='b'?park.buildings[+e.id.slice(1)]:park.rides[+e.id.slice(1)];
  assert.deepEqual(e.pts,source.pts);
 }
 const cafe=models.find(e=>e.kind==='bikeCafe'),stage=models.find(e=>e.kind==='plazaStage');
 assert.equal(cafe.id,'b7');
 assert.equal(stage.id,'plaza-stage');
 assert(stage.cx<cafe.cx);
 assert(Math.hypot(stage.cx-51,stage.cz+373.46)<2.5,'stage stays near the marked plaza edge');
 const depth=p=>Math.hypot(p[3][0]-p[0][0],p[3][1]-p[0][1]);
 assert(depth(stage.pts)<depth(cafe.pts)*.3);
 assert.equal(models.length,buildingIds.length+rideIds.length+1);
});
test('geometry is deterministic across eviction and regeneration',()=>{
 for(const e of entries(park))assert.deepEqual(build(e).data,build(e).data);
});
