const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const Z=require('../park-zoo'),M=require('../park-meshes'),S=require('../park-safari-avenue'),park=require('../park/park.json');
function raster(){const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});S.applyGround(c,park);Z.applyGround(c,park);return c;}
function raw(c,x,z){return c[Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp)];}
test('six different animal meshes, animated limbs and six legible enclosures stay bounded',()=>{
 let bytes=0;const bodies=[];
 for(const p of Z.pens){
  for(const part of ['body','leg']){
   const g=new M.Geometry();Z.animal(g,p.id,part);assert(g.data.length>0);assert(g.data.every(Number.isFinite));bytes+=g.data.length*4;
   if(part==='body')bodies.push(JSON.stringify(g.data));
  }
  const e=Z.entries().find(e=>e.pen===p),g=M.build(e);assert(g.data.every(Number.isFinite));assert(g.n>0);bytes+=g.data.byteLength;
 }
 assert.equal(new Set(bodies).size,6);assert(bytes<4*1024*1024);
});
test('zoo animals move, pause and stay in their own pen over ten minutes',()=>{
 const pop=Z.create(()=>4),initial=pop.animals.map(d=>[d.x,d.z]),moved=new Set(),paused=new Set();assert.equal(pop.animals.length,25);
 for(let i=0;i<6000;i++){
  Z.update(pop,.1);
  for(const d of pop.animals){assert([d.x,d.z,d.heading,d.phase,d.v].every(Number.isFinite));assert(Z.inPen(Z.pens[d.pen],d.x,d.z,0));if(Math.hypot(d.x-initial[d.serial][0],d.z-initial[d.serial][1])>1)moved.add(d.serial);if(d.wait>1)paused.add(d.serial);}
 }
 assert.equal(moved.size,25);assert.equal(paused.size,25);
});
test('all visitor routes fit the stroller, preserve water and cannot enter dry enclosures',()=>{
 const c=raster();let checked=0;
 for(let i=1;i<Z.walks.length;i++)assert(Z.walks.slice(0,i).some(p=>Z.distance(p,...Z.walks[i][0])<.01),'every spur joins the existing zoo walk network');
 for(const walk of Z.walks)for(let j=1;j<walk.length;j++){
  const a=walk[j-1],b=walk[j],len=Math.hypot(b[0]-a[0],b[1]-a[1]);
  for(let s=0;s<=len;s+=.2){const x=a[0]+(b[0]-a[0])*s/len,z=a[1]+(b[1]-a[1])*s/len;
   for(const [ox,oz] of [[0,0],[.65,0],[-.65,0],[0,.65],[0,-.65]]){
    const cat=raw(c,x+ox,z+oz)&31;assert(![4,5,12,13].includes(cat),JSON.stringify({x,z,ox,oz,cat}));assert(!Z.solid(x+ox,z+oz,.3),JSON.stringify({x,z,ox,oz,pen:Z.pens.find(p=>!p.water&&Z.inPen(p,x+ox,z+oz,.3))?.id}));
   }checked++;
  }
 }
 assert(checked>1000);
 for(const p of Z.pens.filter(p=>!p.water)){assert(Z.solid(p.x,p.z));assert(Z.solid(p.x+p.w/2-.1,p.z,.3));assert(!Z.solid(p.x+p.w/2+1,p.z,.3));}
 assert.equal(Z.create((x,z)=>raw(c,x,z)).animals.filter(d=>d.species==='flamingo').length,9);
});
test('zoo navigation leaves the existing water and building footprints intact',()=>{
 const c=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{maxBuffer:32*1024*1024});
 S.applyGround(c,park);const before=Buffer.from(c);Z.applyGround(c,park);
 for(let i=0;i<c.length;i++)if([4,5].includes(before[i]&31))assert.equal(c[i],before[i]);
});
test('viewing aprons have no trunks between each approach and the pen fence',()=>{
 const retained=park.trees.filter(t=>!M.centralClearsTree(t[0],t[1]));
 for(const p of Z.pens.filter(p=>!p.water))for(let z=p.z-p.d/2-8;z<p.z-p.d/2;z+=.15){
  const remaining=retained.filter(t=>Math.hypot(t[0]-p.x,t[1]-z)<.85);
  assert.equal(remaining.length,0,JSON.stringify({pen:p.id,z,remaining}));
 }
});
