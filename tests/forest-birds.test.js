const {test} = require('node:test');
const assert = require('node:assert/strict');
const Forest = require('../forest-birds.js');
function random() {let seed=1201;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const trees=Array.from({length:180},(_,i)=>[30+(Math.floor(i/3)%10)*100,30+Math.floor(i/30)*200]);
const ground=(x,z)=>x>0&&x<1100&&z>0&&z<1400&&!(x>450&&x<460);

test('rooks form separate flocks and green woodpeckers start alone in woodland',()=>{
 const p=Forest.create(trees,ground,random());
 assert.equal(p.groups.length,36);assert.equal(p.woodpeckers.length,12);
 for(const g of p.groups) {assert.equal(g.birds.length,9);assert.ok(g.birds.every(b=>b.species==='rook'&&ground(b.x,b.z)));}
 for(const d of p.woodpeckers)for(const other of p.woodpeckers)if(d!==other)assert.ok(Math.hypot(d.x-other.x,d.z-other.z)>=80);
 assert.equal(Forest.create(trees,()=>false,random()).birds.length,0);
});

test('woodpeckers forage, fly low undulating routes and call repeatedly only in flight',()=>{
 const p=Forest.create(trees,ground,random());
 const flown=new Set(),grounded=new Set();let calls=0,hasDip=false,previous=new Map();
 for(let i=0;i<5000;i++) {
  Forest.update(p,.05,d=>{assert.ok(d.flight);assert.ok(d.species==='woodpecker'||d.species==='crow');calls++;});
  for(const d of p.birds) {
   assert.ok(ground(d.x,d.z));assert.ok([d.x,d.y,d.z,d.pitch].every(Number.isFinite));
   assert.ok(d.y>=0&&d.y<(d.species==='woodpecker'?1.8:2.5));
   if(d.flight) {flown.add(d);if(d.flight.t>.2&&d.flight.t<.8&&d.y<(previous.get(d)||0))hasDip=true;}
   else if(flown.has(d))grounded.add(d);
   previous.set(d,d.y);
  }
 }
 assert.ok(flown.size>=4&&grounded.size>=4&&hasDip&&calls>20);
});

test('forest plumage and wing clouds contain species markings and finite geometry',()=>{
 for(const kind of ['rook','woodpecker']) {
  const colors=new Set();
  for(const wing of [false,true])Forest.shape(kind,(x,y,z,c,size)=>{assert.ok([x,y,z,...c,size].every(Number.isFinite));colors.add(c.join(','));},wing);
  for(const color of kind==='rook'?['29,29,38','180,177,163']:['104,133,49','182,43,35','200,190,52','34,39,32'])assert.ok(colors.has(color));
 }
});


test('rooks flee as a flock and solitary woodpeckers flee with calls when approached',()=>{
 const p=Forest.create(trees,ground,random());p.birds.forEach(d=>d.wait=1000);
 const g=p.groups[0],car={x:g.x,z:g.z,v:0};let calls=0;
 Forest.update(p,.05,()=>calls++,car);
 assert.ok(g.birds.every(d=>d.flight));
 const wood=p.woodpeckers.find(d=>Math.hypot(d.x-g.x,d.z-g.z)>80);
 car.x=wood.x+2;car.z=wood.z;
 for(let i=0;i<5;i++)Forest.update(p,.05,()=>calls++,car);
 assert.ok(wood.flight && wood.y>0);assert.ok(calls>0);
});

test('small isolated green patches are excluded from forest bird placement',()=>{
 assert.equal(Forest.create(trees,ground,random(),[5,5],()=>false).birds.length,0);
 const p=Forest.create(trees,ground,random(),[5,5],(x,z)=>z>200);
 assert.ok(p.birds.length>0&&p.birds.every(d=>d.z>190));
});


test('solitary hooded crows stay near rook flocks and use their steady curved flight',()=>{
 const p=Forest.create(trees,ground,random());
 assert.equal(p.crows.length,p.groups.length);
 for(const d of p.crows)assert.ok(Math.hypot(d.x-p.groups[d.group].x,d.z-p.groups[d.group].z)>=4);
 const rook=p.groups[0].birds[0],crow=p.crows[0],wood=p.woodpeckers[0];
 p.birds.forEach(d=>d.wait=1000);
 for(const d of [rook,crow,wood]){d.x=100;d.z=100;d.y=0;d.flight={x:100,z:100,tx:115,tz:100,t:0,duration:3,curve:d===wood?0:1.5};}
 for(let i=0;i<25;i++)Forest.update(p,.05,()=>{});
 const y=rook.y,wy=wood.y;
 assert.ok(rook.z>101&&wood.z===100);
 assert.ok(Math.abs(rook.y-crow.y)<.001&&rook.y>2);
 for(let i=0;i<7;i++)Forest.update(p,.05,()=>{});
 assert.ok(Math.abs(rook.y-y)<.001&&Math.abs(wood.y-wy)>.1);
 const colors=new Set();Forest.shape('crow',(x,y,z,c)=>colors.add(c.join(',')),false);
 assert.ok(colors.has('128,132,134')&&!colors.has('180,177,163'));
});

test('rook, crow and woodpecker quotas cover the full forest extent',()=>{
 for(const start of [[30,30],[930,1030]]) {
  const p=Forest.create(trees,ground,random(),start);
  for(const birds of [p.groups,p.crows,p.woodpeckers]) {
   for(const x of [0,1])for(const z of [0,1])assert.ok(birds.some(b=>Math.floor(b.x/550)===x&&Math.floor(b.z/700)===z));
  }
 }
});
