const {test}=require('node:test'),assert=require('node:assert/strict');
const {entries,build,buildingIds,rideIds,landingZone,terrainHeight,terrainSpec}=require('../park-meshes.js');
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
 assert.equal(models.length,buildingIds.length+rideIds.length+2);
});
test('bike cafe entrance glazing faces the bridge landing and plaza',()=>{
 const cafe=entries(park).find(e=>e.kind==='bikeCafe'),mesh=build(cafe);
 const glassX=[];
 for(let i=0;i<mesh.data.length;i+=10){
  if(Math.abs(mesh.data[i+6]-.18)<1e-5&&Math.abs(mesh.data[i+7]-.30)<1e-5&&Math.abs(mesh.data[i+8]-.33)<1e-5)glassX.push(mesh.data[i]);
 }
 assert(glassX.length>0,'front glazing is visible');
 assert(Math.max(...glassX)<cafe.cx-10,'front glazing stays on the plaza-facing west edge');
});
test('bridge landing keeps the road clear between two striped walks and planted beds',()=>{
 const models=entries(park),coffee=models.find(e=>e.id==='b49'),landing=models.find(e=>e.kind==='bridgeLanding');
 assert.equal(coffee.kind,'tutCoffee');
 assert.deepEqual(landing.pts[0],park.bridges.find(b=>b.osm_id===27081408).pts[1]);
 const a=landing.pts[0],b=landing.pts[1],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
 const dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length;
 const point=l=>[a[0]+dx*12+dz*l,a[1]+dz*12-dx*l];
 assert.equal(landingZone(...point(0)),null);
 for(const side of [-1,1]){
  assert.equal(landingZone(...point(side*6.5)),'road');
  assert.equal(landingZone(...point(side*11)),'bed');
 }
 assert.equal(landingZone(coffee.cx,coffee.cz),null);
});
test('geometry is deterministic across eviction and regeneration',()=>{
 for(const e of entries(park))assert.deepEqual(build(e).data,build(e).data);
});
test('bridge height joins the level approaches and descends toward the square',()=>{
 const {anchor,direction,cityS,parkS,deckHeight}=terrainSpec;
 const at=(s,l=0)=>[anchor[0]+direction[0]*s+direction[1]*l,anchor[1]+direction[1]*s-direction[0]*l];
 assert.equal(terrainHeight(...at(cityS)),0);
 assert(Math.abs(terrainHeight(...at(-30))-deckHeight)<1e-6);
 assert.equal(terrainHeight(...at(parkS)),0);
 assert.equal(terrainHeight(...at(12,24)),0);
 let prev=deckHeight;
 for(let s=0;s<=parkS;s+=.25){const h=terrainHeight(...at(s));assert(h<=prev+1e-9);prev=h;}
 assert(terrainHeight(...at(0))>terrainHeight(...at(parkS/2)));
});
