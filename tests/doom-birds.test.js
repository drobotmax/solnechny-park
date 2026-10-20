const {test}=require('node:test');
const assert=require('node:assert/strict');
const Doom=require('../doom-birds.js');
const ground=(x,z)=>x>=0&&x<=100&&z>=0&&z<=100;
function sources(){return ['waterbird','pigeon','gull','forest'].map((kind,i)=>({kind,birds:[{x:20+i*10,z:30,heading:0}]}));}

test('DOOM brings every bird type onto dry ground and all living birds run toward the stroller',()=>{
 const src=sources();src[0].birds[0].x=-4;
 const p=Doom.create(src,ground,()=>.5),car={x:50,z:50,v:0};
 assert.equal(p.birds.length,4);assert.equal(new Set(p.birds.map(d=>d.kind)).size,4);
 const before=p.birds.map(d=>Math.hypot(d.x-car.x,d.z-car.z));
 for(let i=0;i<20;i++)Doom.update(p,.05,car);
 p.birds.forEach((d,i)=>{assert.ok(ground(d.x,d.z));assert.ok(Math.hypot(d.x-car.x,d.z-car.z)<before[i]);assert.equal(d.flight,undefined);});
});

test('a moving stroller crushes birds along its swept path once and leaves still bodies',()=>{
 const src=[{kind:'pigeon',birds:[{x:10,z:10,heading:0}]}];
 const p=Doom.create(src,ground,()=>.5),d=p.birds[0];
 let hits=0;Doom.update(p,0,{x:8,z:10,v:0},()=>hits++);
 Doom.update(p,1,{x:12,z:10,v:4},()=>hits++);
 assert.equal(hits,1);assert.ok(d.dead&&d.source.dead);
 const x=d.x,z=d.z;
 for(let i=0;i<100;i++)Doom.update(p,.05,{x:12,z:10,v:3},()=>hits++);
 assert.equal(hits,1);assert.equal(d.x,x);assert.equal(d.z,z);
 assert.equal(Doom.create(src,ground,()=>.5).birds.length,0);
});

test('a stationary stroller does not crush birds and birds cannot run into water',()=>{
 const p=Doom.create([{kind:'forest',birds:[{x:10,z:10,heading:0}]}],(x,z)=>ground(x,z)&&x<11,()=>.5);
 let hits=0;
 for(let i=0;i<50;i++)Doom.update(p,.05,{x:12,z:10,v:0},()=>hits++);
 assert.equal(hits,0);assert.ok(!p.birds[0].dead&&p.birds[0].x<11);
});
