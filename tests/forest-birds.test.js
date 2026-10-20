const {test} = require('node:test');
const assert = require('node:assert/strict');
const Forest = require('../forest-birds.js');
function random() {let seed=1201;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const trees=Array.from({length:60},(_,i)=>[30+(Math.floor(i/3)%10)*100,30+Math.floor(i/30)*200]);
const ground=(x,z)=>x>0&&x<1100&&z>0&&z<400&&!(x>450&&x<460);

test('rooks form separate flocks and green woodpeckers start alone in woodland',()=>{
 const p=Forest.create(trees,ground,random());
 assert.equal(p.groups.length,10);assert.equal(p.woodpeckers.length,8);
 for(const g of p.groups) {assert.equal(g.birds.length,9);assert.ok(g.birds.every(b=>b.species==='rook'&&ground(b.x,b.z)));}
 for(const d of p.woodpeckers)for(const other of p.woodpeckers)if(d!==other)assert.ok(Math.hypot(d.x-other.x,d.z-other.z)>=80);
 assert.equal(Forest.create(trees,()=>false,random()).birds.length,0);
});

test('woodpeckers forage, fly low undulating routes and call repeatedly only in flight',()=>{
 const p=Forest.create(trees,ground,random());
 const flown=new Set(),grounded=new Set();let calls=0,hasDip=false,previous=new Map();
 for(let i=0;i<5000;i++) {
  Forest.update(p,.05,d=>{assert.ok(d.flight);assert.equal(d.species,'woodpecker');calls++;});
  for(const d of p.birds) {
   assert.ok(ground(d.x,d.z));assert.ok([d.x,d.y,d.z,d.pitch].every(Number.isFinite));
   assert.ok(d.y>=0&&d.y<1.8);
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
