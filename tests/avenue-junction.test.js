const {test}=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
const J=require('../park-avenue-junction'),M=require('../park-meshes'),A=require('../park-central-alley'),T=require('../park-avenue-train'),park=require('../park/park.json');
const entries=M.entries(park),index=(x,z)=>Math.floor((z-park.z0)/park.mpp)*park.w+Math.floor((x-park.x0)/park.mpp);
function corrected(){const cats=cp.execFileSync('python3',['-c',"from PIL import Image;import sys;sys.stdout.buffer.write(Image.open('park/ground.png').convert('RGB').getchannel('R').tobytes())"],{cwd:require('node:path').resolve(__dirname,'..'),maxBuffer:32*1024*1024});A.applyGround(cats,park,entries);J.applyGround(cats,park);T.applyGround(cats,park);return cats;}
test('the reference crossroads has terrace and play area on the east and stone wall on the west',()=>{
 const right=[Math.cos(2.94),Math.sin(2.94)],side=p=>(p[0]-47.2)*right[0]+(p[1]+247.5)*right[1];
 assert(side([J.gallery.x,J.gallery.z])<0);assert(side([J.play.x,J.play.z])<0);assert(J.wall.every(p=>side(p)>0));
 const ids=['b68','r45','r46','avenue-junction'];let bytes=0;for(const id of ids){const m=M.build(entries.find(e=>e.id===id));assert(m.n>0);bytes+=m.data.byteLength;}
 assert(bytes<2*1024*1024,'the four new models stay below two MiB');
 assert.deepEqual(M.centralTrees.slice(11,14),J.trees);
});
test('both side walks and terrace gaps are open on the real raster while fixtures block',()=>{
 const cats=corrected(),blocked=(x,z)=>[4,5,12,13].includes(cats[index(x,z)]&31);
 for(const path of [J.westPath,J.eastPath])for(let i=1;i<path.length;i++)for(let k=0;k<=20;k++){const f=k/20,a=path[i-1],b=path[i],x=a[0]+(b[0]-a[0])*f,z=a[1]+(b[1]-a[1])*f;assert(!blocked(x,z),`side walk blocked at ${x},${z}`);}
 for(const p of [[56,-258],[57.5,-254.5],[62.6,-251],[47.2,-247.5],[53,-218]])assert(!blocked(...p),`entry blocked at ${p}`);
 for(const p of [[J.gallery.x,J.gallery.z],[26,-224],[84.7,-267.1],[32,-233.2],[40,-246.8],[53,-269],[56.6,-224.5],[58.6,-219.5]])assert(blocked(...p),`fixture missing at ${p}`);
 assert(!blocked(56.5,-231.5),'the blue play railing has an avenue-facing gate');
 const prior=require('../park-avenue-gardens');for(const v of [-1,0,3,7.7])assert(!blocked(...prior.world(-3,v)),'the accepted Tropikanka entrance stays open');
 for(const [u,v] of [[-13.8,8],[-13.8,10],[-10,10]])assert(blocked(...prior.world(u,v)),'the new paving cannot erase the accepted annex walls');
});
test('the full train including both turns clears new fixtures, ground masks and forced trees',()=>{
 const cats=corrected();for(let d=0;d<T.length;d+=.35)for(const p of T.poses(d))for(const u of [-.86,0,.86])for(const v of [-T.spec.lengths[p.index]/2,0,T.spec.lengths[p.index]/2]){
  const x=p.x+Math.cos(p.heading)*u+Math.sin(p.heading)*v,z=p.z+Math.sin(p.heading)*u-Math.cos(p.heading)*v;
  assert([2,3,6].includes(cats[index(x,z)]&31),`train blocked at ${x},${z}`);assert(!J.solid(x,z),'a new fixture intersects the train');
 }
 for(const t of J.trees){assert(J.distance(J.avenue,...t)>4.9);assert(J.distance(J.westPath,...t)>2.2);assert(J.distance(J.eastPath,...t)>2.2);for(let d=0;d<T.length;d+=1)assert(!T.blockedAt({units:T.poses(d)},t[0],t[1],.36));}
});
