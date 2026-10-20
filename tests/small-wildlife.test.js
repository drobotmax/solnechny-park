const {test}=require('node:test');
const assert=require('node:assert/strict');
const Small=require('../small-wildlife.js');
function random(){let s=2017;return()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
function population(){
 const trees=Array.from({length:2500},(_,i)=>[20+i%50*12,20+Math.floor(i/50)*12]);
 const groups=Array.from({length:100},(_,i)=>({x:30+i%10*60,z:30+Math.floor(i/10)*60,birds:Array(10).fill({}),size:'medium'}));
 const allowed=(x,z)=>x>0&&z>0&&x<650&&z<650;
 return Small.create({trees,start:[10,10]}, {groups,canLand:allowed}, {canForage:allowed,canFly:allowed},random());
}
test('small flocks and rare solitary animals cover distant habitat areas',()=>{
 const p=population();assert.equal(p.wagtails.length,5);assert.equal(p.squirrels.length,40);
 assert.ok(p.sparrows.groups.length<100&&p.sparrows.groups.length>10);
 assert.ok(p.sparrows.groups.every(g=>g.birds.length>=2&&g.birds.length<=5&&g.birds.every(d=>Math.hypot(d.x-g.x,d.z-g.z)<=1.11)));
 assert.ok(p.titGroups.length>=60&&p.titGroups.every(g=>g.birds.length>=2&&g.birds.length<=5));
 for(const list of [p.sparrows.birds,p.tits,p.wagtails,p.squirrels]){
  assert.ok(list.some(d=>d.x>450)&&list.some(d=>d.z>450));
 }
});
test('wagtails flee on paving without flight; sparrows circle faster than pigeons',()=>{
 const p=population(),d=p.wagtails[0],car={x:d.x-2,z:d.z,v:0},start=d.x;
 for(let i=0;i<10;i++)Small.update(p,.05,car,[],()=>{});
 assert.ok(d.x>start+.5);assert.equal(d.y,0);assert.equal(d.flight,null);
 const g=p.sparrows.groups[0];car.x=g.birds[0].x;car.z=g.birds[0].z;
 Small.update(p,.01,car,[],()=>{});assert.ok(g.birds.every(d=>d.flight));
 const bird=g.birds[0];bird.flight.mode='circle';bird.flight.angle=0;
 Small.update(p,1,car,[],()=>{});assert.ok(bird.flight.angle>1.5);
});
test('tits fly between real tree perches; squirrels hop, carry and bury nuts',()=>{
 const p=population(),car={x:-100,z:-100,v:0};let flying=0,hopping=0,carrying=0,digging=0,calls=new Set();
 for(let i=0;i<1800;i++){
  car.x=p.tits[0].x+10;car.z=p.tits[0].z;
  Small.update(p,.1,car,[],d=>calls.add(d.species));
  for(const d of p.tits){assert.ok(d.y>=2);if(d.flight)flying++;else assert.ok(p.forestTrees.some(t=>Math.hypot(t.x-d.x,t.z-d.z)<.01));}
  for(const d of p.squirrels){if(d.y>0)hopping++;if(d.carrying)carrying++;if(d.action==='dig')digging++;assert.ok(p.forest.canForage(d.x,d.z));}
 }
 assert.ok(flying>100&&hopping>100&&carrying>100&&digging>100);
 assert.ok(calls.has('tit'));
});
test('all models are finite and new birds pause during DOOM while squirrels remain active',()=>{
 for(const kind of ['sparrow','tit','wagtail','squirrel'])for(const part of ['body','wing','tail','nut']){
  let points=0;Small.shape(kind,part,(x,y,z,color,size)=>{points++;assert.ok([x,y,z,...color,size].every(Number.isFinite));});assert.ok(points>0);
 }
 const p=population(),snapshot=JSON.stringify(p.birds);p.squirrels.forEach(d=>d.pause=0);
 for(let i=0;i<100;i++)Small.update(p,.1,{x:0,z:0,v:0},[],()=>{throw Error('DOOM bird call');},false);
 assert.equal(JSON.stringify(p.birds),snapshot);assert.ok(p.squirrels.some(d=>d.x!==d.homeX||d.z!==d.homeZ));
});
