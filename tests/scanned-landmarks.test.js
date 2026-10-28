const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../park-scanned-landmarks'),M=require('../park-meshes'),Shape=require('../park-yesenin-shape');
const park=require('../park/park.json');
const index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
test('the corrected crossed barriers keep the previously marked plaza row',()=>{
 const sites=S.sites();assert.equal(sites.length,11);
 assert.deepEqual(sites[0],[43.6,-396.2]);assert(Math.hypot(sites.at(-1)[0]+7.4,sites.at(-1)[1]+385.7)<1e-8);
 const entry=S.entries().find(e=>e.kind==='plazaBarriers'),mesh=M.build(entry);
 assert(mesh.n/3<2600,'the entire row must remain cheaper than a scanned object');
 const feet=new Set();
 for(let i=0;i<mesh.data.length;i+=10){
  const x=mesh.data[i]-sites[0][0],y=mesh.data[i+1],z=mesh.data[i+2]-sites[0][1];
  if(y<.06&&Math.hypot(x,z)<.7)feet.add(Math.round(Math.atan2(z,x)/(Math.PI/2)));
 }
 assert(feet.size>=4,'both crossing hoops must reach four different ground directions');
});
test('solid barriers leave the spaces between adjacent objects open',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(67);S.applyGround(cats,park);
 const sites=S.sites();
 for(const p of sites)assert.equal(cats[index(...p)]&31,13,'every barrier has a collision');
 for(let i=1;i<sites.length;i++){
  const p=sites[i].map((v,k)=>(v+sites[i-1][k])/2);assert.equal(cats[index(...p)]&31,3,'each gap remains asphalt and walkable');
 }
 assert.equal(cats[index(15,-400)],67,'the open bridge-to-plaza approach is preserved');
});
test('the shipped sectors no longer contain the superseded point-cloud stands',()=>{
 const fs=require('node:fs'),zlib=require('node:zlib'),{decode}=require('../park-streaming');
 const manifest=require('../park/stream-manifest.json');let legacy=0;
 for(const entry of manifest.chunks.filter(e=>Math.abs(e.cx-15)<65&&Math.abs(e.cz+390)<65)){
  const c=decode(new Uint8Array(zlib.gunzipSync(fs.readFileSync(require.resolve('../'+entry.src)))));
  for(let i=0;i<c.size.length;i++)if(c.col[i*4]===116&&c.col[i*4+1]===43&&c.col[i*4+2]===51&&c.pos[i*3+1]<1.2&&S.sites().some(p=>Math.hypot(c.pos[i*3]-p[0],c.pos[i*3+2]-p[1])<1))legacy++;
 }
 assert.equal(legacy,0,'each location must display exactly one solid barrier');
});
test('the adapted relief has a compact source-independent shape and a complete pedestal',()=>{
 const mesh=M.build({id:'yesenin-study',kind:'yesenin',cx:0,cz:0,yaw:0});
 assert(mesh.n/3>3000&&mesh.n/3<10000);
 assert(JSON.stringify(Shape).length<40000,'only sampled geometry, no raw scan, is delivered');
 const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
 for(let i=0;i<mesh.data.length;i+=10){
  const v=Array.from(mesh.data.subarray(i,i+10));assert(v.every(Number.isFinite));
  assert(Math.abs(Math.hypot(...v.slice(3,6))-1)<1e-5);
  for(let k=0;k<3;k++){lo[k]=Math.min(lo[k],v[k]);hi[k]=Math.max(hi[k],v[k]);}
  assert.equal(v[9]===1||v[9]===7||v[9]===2,true,'the statue uses the park materials');
 }
 assert.equal(lo[1],0);assert(hi[1]>3.1&&hi[1]<3.3);
 assert(hi[0]-lo[0]<1.15&&hi[2]-lo[2]<.9,'the scan background is absent');
});
test('Yesenin occupies the confirmed east-side pocket and faces the cross-path approach',()=>{
 const entries=M.entries(park),bust=entries.filter(e=>e.kind==='yesenin'),site=entries.filter(e=>e.kind==='yeseninSite');
 assert.equal(bust.length,1);assert.equal(site.length,1);
 const e=bust[0];assert(e.cx>90&&e.cx<108&&e.cz> -241&&e.cz< -228,'the site lies south of the east cross path, west of Khutorok');
 const cafe=park.buildings[125].pts;assert(cafe.every(p=>p[0]>e.cx+35));
 const facing=[-Math.sin(e.yaw),Math.cos(e.yaw)],toward=[94-e.cx,-244-e.cz],length=Math.hypot(...toward);
 assert((facing[0]*toward[0]+facing[1]*toward[1])/length>.99);
 assert(S.inSite(e.cx,e.cz));
});
test('the tiled pocket joins the cross path while the pedestal and tablet remain solid',()=>{
 const cats=new Uint8Array(park.w*park.h).fill(72);S.applySiteGround(cats,park);
 for(const uv of [[0,0],[0,5],[0,10.5],[2.5,1]])assert.equal(cats[index(...S.world(...uv))],66,'the photographed paving and access remain walkable');
 S.applyGround(cats,park);
 assert.equal(cats[index(...S.yesenin.at)]&31,13);
 assert.equal(cats[index(...S.world(...S.yesenin.plaque))]&31,13);
 assert.equal(cats[index(...S.world(2.5,1))]&31,2,'there is room to pass beside the memorial');
 assert.equal(cats[index(110,-245)],72,'the neighbouring cross path is untouched');
 assert(S.clearsTree(93.88,-235.68),'the generated trunk inside the paving is removed');
 assert(!S.clearsTree(103.36,-236.3),'the neighbouring grove is retained');
});
