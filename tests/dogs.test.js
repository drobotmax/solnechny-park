const { test } = require('node:test');
const assert = require('node:assert/strict');
const Dogs = require('../dogs.js');
const park = {start:[5,5]};
const flocks = Array.from({length:6},(_,i)=>({x:100+i*160,z:100,size:'large'}));
function random() {let seed=771;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
const canRun=(x,z)=>x>0&&x<1000&&z>0&&z<300&&!(x>=600&&x<650);

test('only four solitary dogs with different natural coats are created',()=>{
  const p=Dogs.create(park,flocks,canRun,random());
  assert.equal(p.dogs.length,4);
  assert.deepEqual(p.dogs.map(d=>d.coat),[0,1,2,3]);
  for(const d of p.dogs) for(const other of p.dogs) if(d!==other) {
    assert.ok(Math.hypot(d.anchorX-other.anchorX,d.anchorZ-other.anchorZ)>=120);
  }
  assert.equal(Dogs.create(park,flocks,()=>false,random()).dogs.length,0);
});

test('dogs actually run while avoiding water and the stroller',()=>{
  const p=Dogs.create(park,flocks,canRun,random()), car={x:-100,z:-100};
  const before=p.dogs.map(d=>[d.x,d.z]);
  for(let i=0;i<1200;i++) {
    Dogs.update(p,0.05,car);
    for(const d of p.dogs) assert.ok(canRun(d.x,d.z));
  }
  assert.ok(p.dogs.some((d,i)=>Math.hypot(d.x-before[i][0],d.z-before[i][1])>2));
  const d=p.dogs[0];d.pause=0;d.target={x:d.x+3,z:d.z};car.x=d.x+0.3;car.z=d.z;
  const x=d.x,z=d.z;
  Dogs.update(p,0.1,car);
  assert.equal(d.x,x);assert.equal(d.z,z);assert.equal(d.v,0);
});

test('all dog coats and separate animated legs have finite geometry',()=>{
  const colors=[];
  for(let coat=0;coat<4;coat++) {
    const set=new Set();
    for(const leg of [false,true]) Dogs.shape(coat,(x,y,z,c,size)=>{
      assert.ok([x,y,z,...c,size].every(Number.isFinite));set.add(c.join(','));
    },leg);
    colors.push(set);
  }
  for(const c of ['45,43,42','178,104,48','221,202,160','226,222,210']) assert.ok(colors.some(s=>s.has(c)));
  assert.ok(colors[3].has('56,49,42'));
});
