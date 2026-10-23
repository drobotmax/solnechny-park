const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../park-stroller'),G=require('../park-meshes').Geometry;
test('the solid pram fits the existing collision size with finite lit geometry',()=>{
 const parts=S.build(G);let bytes=0;
 assert.equal(S.spec.length,1.10);assert.equal(S.spec.width,.58);
 for(const [name,p] of Object.entries(parts)){assert(p.n>100&&p.n%3===0,name);bytes+=p.data.byteLength;
  for(let i=0;i<p.data.length;i+=10){const v=Array.from(p.data.slice(i,i+10));assert(v.every(Number.isFinite),name);assert(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5,name);}
 }
 const b=parts.body.data;for(let i=0;i<b.length;i+=10){assert(Math.abs(b[i])<S.spec.width/2);assert(b[i+1]>=0&&b[i+1]<1.20);assert(Math.abs(b[i+2])<S.spec.length/2);}
 assert(bytes<1024*1024,'the complete pram reuses its two wheel meshes within one MiB');
 assert.deepEqual(S.build(G).body.data,b,'the surface does not depend on a random point sample');
});
test('the canopy, carrycot and tyres have no unpaired boundary edges',()=>{
 for(const [name,p] of Object.entries(S.build(G))){const edges=new Map(),key=i=>Array.from(p.data.slice(i,i+3),v=>Math.round(v*1e5)).join(',');
  for(let i=0;i<p.data.length;i+=30){const points=[key(i),key(i+10),key(i+20)];for(let j=0;j<3;j++){const k=[points[j],points[(j+1)%3]].sort().join('|');edges.set(k,(edges.get(k)||0)+1);}}
  assert([...edges.values()].every(n=>n>=2&&n%2===0),name+' cannot leave an open scan-like gap');
 }
});
test('wheel transforms keep their axles fixed while rolling and steering independently',()=>{
 for(const wheel of S.spec.wheels)for(const side of [-1,1]){
  const a=S.wheelPose(wheel,side,.8,0),b=S.wheelPose(wheel,side,.8,.15),c=S.wheelPose(wheel,side,.8,-.15),fork=S.wheelPose(wheel,side,.8,.15,false);
  assert.deepEqual(a.slice(12),b.slice(12));assert.deepEqual(a.slice(12),[side*S.spec.axle,wheel.radius,wheel.z,1]);
  assert.notDeepEqual(a.slice(0,12),b.slice(0,12));assert(Math.abs(b[9]+c[9])<1e-9,'reverse travel reverses the roll');
  assert(fork.every((v,i)=>Math.abs(v-a[i])<1e-9),'the caster fork steers but must not spin with the tyre');
  assert.equal(a[2]!==0,wheel.front,'only the front axle changes its steering angle');
  for(const m of [a,b,c]){const cols=[[m[0],m[1],m[2]],[m[4],m[5],m[6]],[m[8],m[9],m[10]]];for(const v of cols)assert(Math.abs(Math.hypot(...v)-1)<1e-9);}
 }
});
