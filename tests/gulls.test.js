const {test} = require('node:test');
const assert = require('node:assert/strict');
const Gulls = require('../gulls.js');
function random() {let seed=941;return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('gulls circle and alternate water dips with low passes, then climb back',()=>{
  const p=Gulls.create([{x:10,z:20}],random());
  assert.equal(p.birds.length,6);
  const d=p.birds[0];d.wait=0;
  let calls=0, dips=0, passes=0, climbed=false;
  for(let i=0;i<4000;i++) {
    Gulls.update(p,0.05,b=>{if(b===d)calls++;});
    for(const b of p.birds) {
      assert.ok(Math.hypot(b.x-b.cx,b.z-b.cz)<=5.001);
      assert.ok([b.x,b.y,b.z,b.pitch,b.heading].every(Number.isFinite));
      assert.ok(b.y>=-0.121 && b.y<=13.31);
    }
    if(d.dive!==null && d.dive>2 && d.dive<3) {
      if(d.y<0)dips++;else if(d.y===0.65)passes++;
    }
    if(d.dive===null && calls>0 && d.y>6)climbed=true;
  }
  assert.ok(dips>0 && passes>0 && climbed);
  assert.ok(calls>=3 && calls<=6,`Dive calls should be rare: ${calls}`);
});

test('winter gull geometry has pale plumage, dark wingtips and red bill',()=>{
  const colors=new Set();
  for(const wing of [false,true]) Gulls.shape((x,y,z,c,size)=>{
    assert.ok([x,y,z,...c,size].every(Number.isFinite));colors.add(c.join(','));
  },wing);
  for(const c of ['239,241,238','40,44,50','158,47,37','56,58,59'])assert.ok(colors.has(c));
  assert.equal(Gulls.create([],random()).birds.length,0);
});
